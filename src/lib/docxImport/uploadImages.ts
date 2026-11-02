import { supabase } from "@/integrations/supabase/client";
import type { ParsedDocxQuestion, DocxImage } from "./parseDocx";

const extFromType = (ct: string) => {
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("svg")) return "svg";
  return "bin";
};

export type UploadProgress = (done: number, total: number) => void;

/**
 * Upload all images attached to parsed questions to S3, populating
 * `image.publicUrl` in-place.
 */
export const uploadParsedImages = async (
  batchId: string,
  questions: ParsedDocxQuestion[],
  onProgress?: UploadProgress,
): Promise<{ uploaded: number; failed: number }> => {
  const flat: { q: ParsedDocxQuestion; img: DocxImage }[] = [];
  for (const q of questions) for (const img of q.images) flat.push({ q, img });

  let done = 0;
  let failed = 0;

  for (const { q, img } of flat) {
    const ext = extFromType(img.contentType);
    const path = `${batchId}/q${q.number}_${img.slot}_${img.id}.${ext}`;
    try {
      const ab = img.bytes.buffer.slice(img.bytes.byteOffset, img.bytes.byteOffset + img.bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: img.contentType });
      const { error: upErr } = await supabase.storage
        .from("question-images")
        .upload(path, blob, { contentType: img.contentType, upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("question-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 100);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Sign URL failed");
      img.publicUrl = signed.signedUrl;
    } catch {
      failed += 1;
    }
    done += 1;
    onProgress?.(done, flat.length);
  }
  return { uploaded: done - failed, failed };
};

/**
 * Best-effort cleanup after a FAILED import: delete the files this batch just
 * uploaded, but only when no question row (test or bank) was saved with this
 * batch id. Never touches files from any other batch, so it cannot break a
 * test that shares images. Errors are swallowed — leaking files is harmless.
 */
export const removeOrphanedBatchImages = async (batchId: string): Promise<void> => {
  try {
    const [{ count: testRows }, { count: bankRows }] = await Promise.all([
      supabase.from("test_questions").select("id", { count: "exact", head: true }).eq("import_batch_id", batchId),
      supabase.from("question_bank").select("id", { count: "exact", head: true }).eq("import_batch_id", batchId),
    ]);
    // If we could not confirm "zero rows", keep the files.
    if (testRows !== 0 || bankRows !== 0) return;
    const { data: files } = await supabase.storage.from("question-images").list(batchId, { limit: 1000 });
    const paths = (files ?? []).map((f) => `${batchId}/${f.name}`);
    if (paths.length > 0) await supabase.storage.from("question-images").remove(paths);
  } catch {
    /* non-fatal */
  }
};

/**
 * Replace `<span data-img="id">` markers in HTML with `<img>` tags whose
 * `src` points at the uploaded public URL.
 */
export const replaceMarkersWithUrls = (html: string, images: DocxImage[]): string => {
  if (!html) return html;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  for (const marker of Array.from(tmp.querySelectorAll("[data-img]"))) {
    const id = marker.getAttribute("data-img");
    const img = images.find((i) => i.id === id);
    if (img?.publicUrl) {
      const node = document.createElement("img");
      node.src = img.publicUrl;
      node.alt = "";
      node.loading = "lazy";
      node.className = "inline-block max-h-48 rounded-md my-1";
      marker.replaceWith(node);
    } else {
      marker.remove();
    }
  }
  return tmp.innerHTML;
};

/** Return the first image url for a slot (used for legacy single-image columns). */
export const firstImageForSlot = (
  images: DocxImage[],
  slot: DocxImage["slot"],
): string | null => {
  const found = images.find((i) => i.slot === slot && i.publicUrl);
  return found?.publicUrl ?? null;
};
