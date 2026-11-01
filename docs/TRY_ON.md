# VIVILENS Lens Try-On · V1.8.0

Public route: https://vivilens.pages.dev/try-on. All 122 public catalog models link directly to `/try-on?lens=<slug>` from detail and quick view, including photo-only models that are not currently orderable. The homepage and desktop/mobile navigation expose the feature. Query selections share a clean `/try-on` canonical; the page is included in initial HTML and sitemap.

## Customer experience

Customers can try a public sample immediately. Search accepts model-name prefixes, case-insensitive words and Vietnamese color names with or without accents. Eight color groups have counts; six choices per page keep the picker compact. Deep links reveal the page containing the selected model. Filtering and pagination retain the selected tone and photo/camera session, and an explicit control returns to the current selection. Empty results offer a filter reset.

Customers' own camera/photo requires an explicit consent checkbox; camera permission is requested only after pressing its button, with audio disabled. JPG, PNG, WebP and AVIF up to 12 MB are accepted and resized to a maximum 1,600-pixel edge. Very large decoded images are rejected. HEIC must first be converted to JPG.

Automatic face/iris placement supports one visible person, with eyelid clipping, open-eye checks and conservative tracking. A second detected face suppresses the overlay. Customers can freeze a camera frame, compare original/split view, change strength, adjust eye placement/size on photos and save a branded JPEG. Save always exports the simulated view without editing guides. Buying continues on the real product page, retaining required left/right powers and existing pricing/stock checks.

## Color accuracy

Each of the 122 catalog models has its own three-band palette, sampled from the worn iris in its authentic product photograph. No hue is inferred from a model name and no model borrows another model's palette. The generator detects eye regions with the pinned local Attention Mesh model, then samples clipped iris annuli, excludes extreme glare/shadows and trims each channel's outer 10%. All automatic sample placements were visually reviewed. Eight sources use explicit photo, crop or iris-region overrides in `catalog/tryon_sample_overrides.json`, covering eye-only closeups and collage ambiguities. Ocean Blue uses its fifth gallery photo because its lead image shows lenses on a hand.

Image SHA-256, exact sampled eye positions/contours and per-band pixel counts are in `catalog/tryon_profiles.json`. Run `npm run tryon:assets` then `npm run tryon:profiles` to regenerate. Source photo/detection caches are ignored by Git; absent or insufficient eye samples stop generation for review rather than silently assigning a generic tone. `catalog/tryon_index.json` is the small generated list used for product buttons and routes; full palettes/provenance load only with the Try-On page. Authentic product/model photos remain unchanged.

This is an explicitly labeled **color-only approximation**, not a calibrated rendering of a product's printed pattern, physical diameter or final appearance on an individual eye. Transparent pupil/soft annulus and generic radial variation are rendering aids, not product texture claims. Accurate pattern try-on requires suitable manufacturer texture/calibration assets and photographed validation before expanding coverage. Do not silently assign one simulation to other catalog products.

## Processing and performance

TensorFlow.js 4.22.0 WASM CPU inference runs in a dedicated Worker and does not require WebGL. The Attention Mesh model supplies 478 landmarks including irises; short-range face detection is capped at two faces to identify multi-person frames. A narrowly bounded integer-grid MatMul adapter handles Attention Mesh operations unsupported by TFJS WASM, casting exactly representable small grids through the existing float kernel and back to integer output; integer-range, broadcast, transpose and tensor cleanup have regression coverage. Analysis uses a maximum 768-pixel edge; rendering retains photo resolution. Only one frame is processed at once; preview and detection have separate rates. Older browsers without Worker/OffscreenCanvas use a slower main-thread fallback. Actual frame rate depends on the device, lighting and pose; photo/manual mode remains available on unsupported devices.

The engine, WASM and both model bundles are served from the site's own origin. Dependencies are pinned in the lockfile; model archives and extracted files are SHA-256 pinned in `catalog/tryon_runtime_assets.json`. `npm run tryon:assets` prepares local development assets; `npm run build:pages` prepares the same production files. Build caches and generated runtime binaries are ignored by Git. Apache 2.0 notices/license ship under `/tryon/`.

The page, full palette data and ML code load only when requested. Models initialize only after selecting an image or opening the camera. Large lazy ML bundles do not add inference downloads to ordinary shopping pages. Only the visible six picker thumbnails are mounted. First use must download the model/runtime; subsequent immutable model/WASM assets can use the browser cache.

## Privacy and lifecycle

Photos, camera frames and eye positions stay in tab memory; there is no upload, face recognition, database write, localStorage/IndexedDB save or analytics event containing these values. Public model files are downloaded, not customer data uploaded. The clear control releases the source; leaving the page terminates inference and stops camera tracks. Hiding the tab automatically stops an active camera. Clearing does not remove files the customer deliberately downloaded. The source image is excluded from URLs and social metadata.

## Verification

Run `npm test`, `npm run build:pages` and `npm run check:seo`. Tests cover full catalog/profile/index coverage, per-product source provenance and links, accent/case/color search, full pagination and boundaries, photo sampling with skin/glare exclusion, rotated/closed-eye geometry, malformed input, image letterboxing/mirror coordinates, lost-eye tracking, file validation, route/canonical and complete initial HTML, alongside existing commerce/privacy/SEO tests.

Browser acceptance verified in Chrome without WebGL: sample auto-detection of both irises, model-name/color search, pagination, selected-model deep links, empty-result recovery, tone switching while retaining the photo, original/split view, photo eye-size editing, JPEG save and product return preserving required powers. Mobile layout is checked at a 390-pixel viewport. Physical camera quality, iOS/Android permissions and varied real users still require device testing; no synthetic claim of universal tracking accuracy.
