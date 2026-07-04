import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a file directly to S3 via a presigned URL minted by the
 * `s3-presign-upload` edge function, and returns the object's public URL.
 * `key` must start with `question-images/`.
 */
export async function uploadImageToS3(file: Blob, key: string, contentType: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("s3-presign-upload", {
    body: { key, contentType },
  });
  if (error) throw error;

  const { uploadUrl, publicUrl } = (data ?? {}) as { uploadUrl?: string; publicUrl?: string };
  if (!uploadUrl || !publicUrl) throw new Error("Failed to get S3 upload URL");

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!putRes.ok) throw new Error(`S3 upload failed (${putRes.status})`);

  return publicUrl;
}
