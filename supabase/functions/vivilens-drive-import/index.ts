import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

/**
 * GitHub Actions OIDC => signed and strictly scoped ingestion into Supabase Storage.
 * No long-lived credentials are exported to GitHub or client-side code.
 * Reject any uploads not originating from the exact repository's main branch workflow.
 */
const jwks = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const EXPECTED_REPO = "DelDeto/Vivilens";
const EXPECTED_REPO_ID = "1436795943";
const WORKFLOW = ".github/workflows/drive-media-sync.yml";
const MAIN = "refs/heads/main";
const TEST_BRANCH = "refs/heads/feature/drive-webp-sync";
const BUCKET = "vivilens-products";
const maxBytes = 1024 * 1024;

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

Deno.serve(async (req) => {
  if (!["GET", "POST"].includes(req.method)) return json({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Missing GitHub OIDC token" }, 401);

  let claims: Record<string, unknown>;
  try {
    const result = await jwtVerify(auth.slice(7), jwks, {
      issuer: "https://token.actions.githubusercontent.com", audience: "vivilens-media-sync"
    });
    claims = result.payload as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid signed GitHub OIDC token" }, 401);
  }

  const ref = String(claims.ref || "");
  const workflow = String(claims.workflow_ref || "");
  if (claims.repository !== EXPECTED_REPO || claims.repository_id !== EXPECTED_REPO_ID ||
      workflow !== EXPECTED_REPO + "/" + WORKFLOW + "@" + ref) {
    return json({ error: "Workflow identity not authorized" }, 403);
  }

  // Dry-run from the feature branch verifies signature handling without any database changes.
  if (req.method === "GET") {
    if (ref !== MAIN && ref !== TEST_BRANCH) return json({ error: "Branch not allowed" }, 403);
    return json({ ok: true, repository: EXPECTED_REPO, ref, authenticated: "GitHub OIDC" });
  }

  if (ref !== MAIN || !["push", "workflow_dispatch"].includes(String(claims.event_name))) {
    return json({ error: "Only approved main-branch sync can upload" }, 403);
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > maxBytes + 16000) return json({ error: "Payload too large" }, 413);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceRole) return json({ error: "Storage credentials not provisioned" }, 503);

  let form: FormData;
  try { form = await req.formData(); } catch { return json({ error: "Invalid multipart form" }, 400); }

  const slug = String(form.get("slug") || "");
  const driveId = String(form.get("drive_id") || "");
  const image = form.get("image");
  if (!/^[a-z0-9-]{1,128}$/.test(slug) || !/^[A-Za-z0-9_-]{10,100}$/.test(driveId)) return json({ error: "Invalid product or Drive ID" }, 400);
  if (!(image instanceof File) || image.size < 100 || image.size > maxBytes || image.type !== "image/webp") {
    return json({ error: "Expected WebP image under 1 MB" }, 400);
  }
  const bytes = new Uint8Array(await image.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 4)) !== "RIFF" ||
      new TextDecoder().decode(bytes.slice(8, 12)) !== "WEBP") {
    return json({ error: "Invalid WebP format" }, 400);
  }

  const db = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: product, error: productError } = await db.from("products")
    .select("id,slug,name,active,image_url").eq("slug", slug).maybeSingle();
  if (productError) return json({ error: "Unable to check product" }, 500);
  if (!product) return json({ error: "Product slug not found" }, 404);

  const storagePath = product.id + "/drive-" + driveId + ".webp";
  const { data: rows, error: rowsError } = await db.from("product_images")
    .select("id,position,storage_path").eq("product_id", product.id).order("position");
  if (rowsError) return json({ error: "Unable to check gallery" }, 500);
  if ((rows || []).some((row) => row.storage_path === storagePath)) {
    return json({ ok: true, skipped: true, slug, storage_path: storagePath });
  }
  if ((rows || []).length >= 5) return json({ ok: true, skipped: true, reason: "gallery is full", slug });

  const nextPosition = Math.max(0, ...(rows || []).map(row => Number(row.position) || 0)) + 1;
  const { error: uploadError } = await db.storage.from(BUCKET).upload(storagePath, image, {
    contentType: "image/webp", upsert: false, cacheControl: "31536000"
  });
  const alreadyExists = !!uploadError && (/already.exists|duplicate|409/i.test(uploadError.message));
  if (uploadError && !alreadyExists) return json({ error: "Storage upload failed", detail: uploadError.message }, 502);

  const publicUrl = db.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const { error: insertError } = await db.from("product_images").insert({
    product_id: product.id,
    position: nextPosition,
    image_url: publicUrl,
    storage_path: storagePath,
    alt_text: product.name + " – ảnh sản phẩm " + nextPosition
  });
  if (insertError) {
    if (!alreadyExists) await db.storage.from(BUCKET).remove([storagePath]);
    return json({ error: "Gallery update failed", detail: insertError.message }, 502);
  }

  // Never overwrite an owner-selected cover. Replace only placeholders or missing covers.
  const previousCover = String(product.image_url || "");
  if (!previousCover || previousCover.includes("images.unsplash.com")) {
    await db.from("products").update({ image_url: publicUrl }).eq("id", product.id);
  }

  return json({ ok: true, uploaded: !alreadyExists, slug, position: nextPosition, bytes: image.size, url: publicUrl });
});
