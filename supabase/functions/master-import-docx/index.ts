// Master DOCX Import — server-side parser.
// Receives a .docx via multipart upload, runs:
//   1. JSZip unzip
//   2. OMML → LaTeX rewrite of word/document.xml (in-place)
//   3. mammoth.convertToHtml with a convertImage hook that uploads each
//      embedded image to the `question-images` Supabase Storage bucket and
//      returns a 100-year signed URL inlined as the <img src="..."> attribute.
// Returns: { html, warnings }
//
// The client takes this HTML and runs the existing state-machine parser
// (parseDocxQuestionsFromHtml) — no heavy work on the main thread.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import JSZip from "npm:jszip@3.10.1";
// mammoth is a CommonJS module; npm: specifier handles interop.
import mammoth from "npm:mammoth@1.8.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "question-images";
// 100 years in seconds — effectively permanent for our use.
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 100;

// ---------------------------------------------------------------------------
// OMML → LaTeX (port of the existing client preprocessor)
// ---------------------------------------------------------------------------
const decodeXmlEntities = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, "&");

const escapeXmlText = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ommlInnerToLatex = (innerXml: string): string => {
  const parts: string[] = [];
  const re = /<m:t\b[^>]*>([\s\S]*?)<\/m:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(innerXml)) !== null) {
    parts.push(decodeXmlEntities(m[1]));
  }
  return parts.join("").trim();
};

const rewriteOmmlInXml = (xml: string, warnings: string[]): string => {
  let displayCount = 0;
  let inlineCount = 0;
  let failed = 0;
  xml = xml.replace(
    /<m:oMathPara\b[^>]*>([\s\S]*?)<\/m:oMathPara>/g,
    (_full, inner) => {
      const latex = ommlInnerToLatex(inner);
      if (!latex) {
        failed += 1;
        return "";
      }
      displayCount += 1;
      return `<w:r><w:t xml:space="preserve"> $$${escapeXmlText(latex)}$$ </w:t></w:r>`;
    },
  );
  xml = xml.replace(
    /<m:oMath\b[^>]*>([\s\S]*?)<\/m:oMath>/g,
    (_full, inner) => {
      const latex = ommlInnerToLatex(inner);
      if (!latex) {
        failed += 1;
        return "";
      }
      inlineCount += 1;
      return `<w:r><w:t xml:space="preserve"> $${escapeXmlText(latex)}$ </w:t></w:r>`;
    },
  );
  if (failed > 0) {
    warnings.push(`equation_parse_warning: ${failed} OMML block(s) could not be converted to LaTeX.`);
  }
  if (displayCount + inlineCount > 0) {
    warnings.push(`OMML→LaTeX: converted ${inlineCount} inline + ${displayCount} display equation(s).`);
  }
  return xml;
};

const preprocessDocxBuffer = async (buffer: ArrayBuffer, warnings: string[]): Promise<ArrayBuffer> => {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docFile = zip.file("word/document.xml");
    if (!docFile) return buffer;
    const xml = await docFile.async("string");
    if (!/<m:oMath\b/.test(xml)) return buffer;
    const rewritten = rewriteOmmlInXml(xml, warnings);
    zip.file("word/document.xml", rewritten);
    return await zip.generateAsync({ type: "arraybuffer", compression: "STORE" });
  } catch (e) {
    warnings.push(`OMML preprocessor skipped: ${(e as Error).message}`);
    return buffer;
  }
};

// ---------------------------------------------------------------------------
// Image upload helper
// ---------------------------------------------------------------------------
const extFromContentType = (ct: string): string => {
  const c = (ct || "").toLowerCase();
  if (c.includes("png")) return "png";
  if (c.includes("jpeg") || c.includes("jpg")) return "jpg";
  if (c.includes("gif")) return "gif";
  if (c.includes("webp")) return "webp";
  if (c.includes("svg")) return "svg";
  if (c.includes("bmp")) return "bmp";
  return "bin";
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const warnings: string[] = [];

    // 1. Parse multipart upload
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file uploaded under field 'file'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/\.docx$/i.test(file.name)) {
      return new Response(JSON.stringify({ error: "Only .docx is supported." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > 25 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 25 MB)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. OMML preprocess
    const rawBuffer = await file.arrayBuffer();
    const buffer = await preprocessDocxBuffer(rawBuffer, warnings);

    // 3. mammoth → HTML with image upload hook
    const importId = crypto.randomUUID();
    let imageSeq = 0;
    let uploadedCount = 0;
    let imageFailures = 0;

    const result = await mammoth.convertToHtml(
      { buffer: new Uint8Array(buffer) as unknown as Buffer },
      {
        styleMap: [
          "p[style-name='Q-Number'] => p.q-number",
          "p[style-name='Q-Stem']   => p.q-stem",
          "p[style-name='Q-Option'] => p.q-option",
          "p[style-name='Q-Answer'] => p.q-answer",
          "p[style-name='Q-Solution'] => p.q-solution",
          "p[style-name='Q-Topic']  => p.q-topic",
        ],
        convertImage: mammoth.images.imgElement(async (image: any) => {
          try {
            const buf = await image.read();
            const bytes =
              buf instanceof Uint8Array
                ? buf
                : new Uint8Array(buf?.buffer ?? buf);
            const ext = extFromContentType(image.contentType);
            const idx = imageSeq++;
            const path = `master-import/${importId}/img_${String(idx).padStart(4, "0")}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from(BUCKET)
              .upload(path, bytes, {
                contentType: image.contentType || "application/octet-stream",
                upsert: false,
              });
            if (upErr) throw upErr;
            const { data: signed, error: signErr } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(path, SIGNED_URL_TTL);
            if (signErr || !signed?.signedUrl) throw signErr ?? new Error("signed url failed");
            uploadedCount += 1;
            return { src: signed.signedUrl };
          } catch (e) {
            imageFailures += 1;
            // Fall back to inline data-URL so the client can still upload it later.
            try {
              const data = await image.read("base64");
              return { src: `data:${image.contentType};base64,${data}` };
            } catch {
              return { src: "" };
            }
          }
        }),
      },
    );

    if (result.messages?.length) {
      for (const msg of result.messages.slice(0, 10)) {
        if (msg.type === "error") warnings.push(`Mammoth: ${msg.message}`);
      }
    }
    if (uploadedCount > 0) warnings.push(`Uploaded ${uploadedCount} image(s) to storage.`);
    if (imageFailures > 0) warnings.push(`image_position_warning: ${imageFailures} image(s) failed to upload — kept inline as data URLs.`);

    return new Response(
      JSON.stringify({
        html: result.value,
        warnings,
        importId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("master-import-docx error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Parsing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
