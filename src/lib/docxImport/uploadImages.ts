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
 * Upload all images attached to parsed questions to the `question-images`
 * bucket, populating `image.publicUrl` in-place.
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
      // Convert Uint8Array to Blob explicitly
      const blob = new Blob([img.bytes], { type: img.contentType });
      const { error } = await supabase.storage
        .from("question-images")
        .upload(path, blob, { contentType: img.contentType, upsert: true });
      if (error) {
        failed += 1;
      } else {
        const { data } = supabase.storage.from("question-images").getPublicUrl(path);
        img.publicUrl = data.publicUrl;
      }
    } catch {
      failed += 1;
    }
    done += 1;
    onProgress?.(done, flat.length);
  }
  return { uploaded: done - failed, failed };
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
