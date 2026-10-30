# VIVILENS — Drive image optimization and Storage sync

## Source and media
- 122 candidate models and up to five source images per model are indexed in catalog/drive_products_2026-10-29.json (564 total source references).
- Originals remain untouched in Google Drive. GitHub Actions pulls individual image IDs directly from their shared source links.
- Pillow transposes EXIF orientation, attempts embedded ICC-to-sRGB conversion, resizes long edge to maximum 1600 px using Lanczos, and saves as high-quality WebP at quality 86 / method 6. No generative edits, face modification or lens recoloring.
- VIVILENS keeps an overall per-run 250 MiB upload budget and a per-image 1 MiB bound. The photos sample was visually inspected before the launch.

## Credential-free secure upload
- Github Actions uses a **short-lived GitHub OIDC JWT** with audience "vivilens-media-sync".
- Supabase Edge Function vivilens-drive-import verifies the issuer's JWKS signature and exact repository id (1436795943), repository name, workflow path, event type and main branch before accepting any upload.
- The Supabase service key stays inside the managed Supabase Edge environment; it is not copied into GitHub secrets, scripts, logs or client code.
- The upload path is a stable per-product/per-Drive-image filename so reruns skip images already imported.
- Public downloads try verified original-image bytes from Drive's download endpoints and its full-resolution image CDN before falling back to gdown. Login, quota and error HTML is rejected.
- Four independent product folders can be processed concurrently. A product's gallery always has one serial writer; the cover pass finishes before the gallery pass starts.
- Main-branch catch-up now processes all remaining source references (instead of stopping at 50), within the existing 250 MiB budget, 1,200-attempt limit and 55-minute job timeout.
- A store owner's existing gallery is never erased and never exceeds five photos. Only an empty or Unsplash placeholder product cover may be replaced.
- Products remain in their existing active/draft status; prices, stock, packaging and SKU prescriptions are never modified.

## Initial rollout and verification
- First main-branch push imports the five photo references of the existing **Siren Gray** draft only, preserving all currently visible storefront products.
- Confirm this model has five rows in public.product_images, five WebP files in storage.objects, and real cover in products.image_url before starting the full run.
- The dry-run tests image download and conversion without any write.
- A manual "workflow_dispatch" is available from GitHub Actions for targeted retries or all 564 source images. The remote worker requires an approved GitHub-signed main-branch workflow for any upload.

## Quotas and media safety
- Supabase Free storage is shared at organization scope. Track storage.objects sizes after each batch and stop any run that unexpectedly exceeds the 250 MiB planned WebP upload budget.
- Google Drive access is only through specifically listed original file IDs; do not expose Google account access tokens or upload raw originals unnecessarily.
- Actual images may include text overlays; validate photo clarity, iris color and any printed specifications manually before publishing a model.
- New product drafts remain private to Admin until verified price, stock, technical specifications and photos are approved.
