// Issues short-lived presigned S3 PUT URLs for question-image uploads.
// The browser uploads the file directly to S3 with the returned URL —
// AWS credentials never leave this function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const AWS_REGION = Deno.env.get("AWS_REGION")!;
const S3_BUCKET_NAME = Deno.env.get("S3_BUCKET_NAME")!;
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID")!;
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;
// Optional override (e.g. a CloudFront domain). Falls back to the bucket's
// virtual-hosted-style S3 URL if unset.
const S3_PUBLIC_BASE_URL = Deno.env.get("S3_PUBLIC_BASE_URL");

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
});

const PRESIGN_TTL_SECONDS = 5 * 60;
// Object keys must live under one of these prefixes — keeps this function
// scoped to what it's actually meant to serve.
const ALLOWED_PREFIXES = ["question-images/"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
    const token = authHeader.replace("Bearer ", "");
    const admin = createClient(supabaseUrl, serviceKey);

    // Decode JWT payload (gateway already verified the signature when verify_jwt=true,
    // and we re-check authorization via role RPCs below using service role).
    let userId: string | null = null;
    try {
      const payloadB64 = token.split(".")[1];
      const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = atob(padded + "===".slice((padded.length + 3) % 4));
      userId = JSON.parse(decoded)?.sub ?? null;
    } catch (_) { /* fall through */ }

    if (!userId) {
      try {
        const { data: u } = await admin.auth.getUser(token);
        userId = u?.user?.id ?? null;
      } catch (_) { /* ignore */ }
    }
    if (!userId) return json(401, { error: "Unauthorized" });

    const [{ data: isAdminOrSuper }, { data: isTeacher }, { data: staffRows }] = await Promise.all([
      admin.rpc("is_admin_or_super", { _user_id: userId }),
      admin.rpc("has_role", { _user_id: userId, _role: "teacher" }),
      admin.from("centre_staff").select("centre_id").eq("user_id", userId).limit(1),
    ]);
    const isCentreStaff = !!staffRows && staffRows.length > 0;
    if (!isAdminOrSuper && !isTeacher && !isCentreStaff) {
      return json(403, { error: "Only admins, super admins, teachers, or centre staff can upload question images" });
    }

    const body = await req.json().catch(() => null);
    const key = typeof body?.key === "string" ? body.key : null;
    const contentType = typeof body?.contentType === "string" ? body.contentType : "application/octet-stream";
    if (!key) return json(400, { error: "key is required" });
    if (key.includes("..")) return json(400, { error: "invalid key" });
    if (!ALLOWED_PREFIXES.some((p) => key.startsWith(p))) {
      return json(400, { error: `key must start with one of: ${ALLOWED_PREFIXES.join(", ")}` });
    }

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key, ContentType: contentType }),
      { expiresIn: PRESIGN_TTL_SECONDS },
    );

    const publicUrl = S3_PUBLIC_BASE_URL
      ? `${S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`
      : `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;

    return json(200, { uploadUrl, publicUrl });
  } catch (e) {
    console.error("s3-presign-upload error:", e);
    return json(500, { error: (e as Error).message || "Failed to presign upload" });
  }
});
