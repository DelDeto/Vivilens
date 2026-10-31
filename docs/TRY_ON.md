# VIVILENS Lens Try-On · V1.7.0

Public route: https://vivilens.pages.dev/try-on. Supported products also link directly to `/try-on?lens=<slug>` from detail and quick view. The homepage and desktop/mobile navigation expose the feature. Query selections share a clean `/try-on` canonical; the page is included in initial HTML and sitemap.

## Customer experience

Customers can try a public sample immediately. Their own camera/photo requires an explicit consent checkbox; camera permission is requested only after pressing its button, with audio disabled. JPG, PNG, WebP and AVIF up to 12 MB are accepted and resized to a maximum 1,600-pixel edge. Very large decoded images are rejected. HEIC must first be converted to JPG.

Automatic face/iris placement supports one visible person, with eyelid clipping, open-eye checks and conservative tracking. A second detected face suppresses the overlay. Customers can freeze a camera frame, compare original/split view, change strength, adjust eye placement/size on photos and save a branded JPEG. Save always exports the simulated view without editing guides. Buying continues on the real product page, retaining required left/right powers and existing pricing/stock checks.

## Color accuracy

Six references: Milk Tea Brown, Fairy Gray, Fairy Pink, Mist Blue, Olive Brown and Bubble Brown. Palettes are reproducible annular averages from the original product illustrations, with image SHA-256 and sampling details in `catalog/tryon_profiles.json`. `npm run tryon:profiles` regenerates them. Authentic product/model photos remain unchanged.

This is an explicitly labeled **color-only approximation**, not a calibrated rendering of a product's printed pattern, physical diameter or final appearance on an individual eye. Transparent pupil/soft annulus and generic radial variation are rendering aids, not product texture claims. Accurate pattern try-on requires suitable manufacturer texture/calibration assets and photographed validation before expanding coverage. Do not silently assign one simulation to other catalog products.

## Processing and performance

TensorFlow.js 4.22.0 WASM CPU inference runs in a dedicated Worker and does not require WebGL. The Attention Mesh model supplies 478 landmarks including irises; short-range face detection is capped at two faces to identify multi-person frames. A narrowly bounded integer-grid MatMul adapter handles Attention Mesh operations unsupported by TFJS WASM, casting exactly representable small grids through the existing float kernel and back to integer output; integer-range, broadcast, transpose and tensor cleanup have regression coverage. Analysis uses a maximum 768-pixel edge; rendering retains photo resolution. Only one frame is processed at once; preview and detection have separate rates. Older browsers without Worker/OffscreenCanvas use a slower main-thread fallback. Actual frame rate depends on the device, lighting and pose; photo/manual mode remains available on unsupported devices.

The engine, WASM and both model bundles are served from the site's own origin. Dependencies are pinned in the lockfile; model archives and extracted files are SHA-256 pinned in `catalog/tryon_runtime_assets.json`. `npm run tryon:assets` prepares local development assets; `npm run build:pages` prepares the same production files. Build caches and generated runtime binaries are ignored by Git. Apache 2.0 notices/license ship under `/tryon/`.

The page and ML code load only when requested. Models initialize only after selecting an image or opening the camera. Large lazy ML bundles do not add inference downloads to ordinary shopping pages. First use must download the model/runtime; subsequent immutable model/WASM assets can use the browser cache.

## Privacy and lifecycle

Photos, camera frames and eye positions stay in tab memory; there is no upload, face recognition, database write, localStorage/IndexedDB save or analytics event containing these values. Public model files are downloaded, not customer data uploaded. The clear control releases the source; leaving the page terminates inference and stops camera tracks. Hiding the tab automatically stops an active camera. Clearing does not remove files the customer deliberately downloaded. The source image is excluded from URLs and social metadata.

## Verification

Run `npm test`, `npm run build:pages` and `npm run check:seo`. Tests cover rotated/closed-eye geometry, malformed input, image letterboxing/mirror coordinates, lost-eye tracking, explicit supported profiles, file validation, route/canonical and initial HTML, alongside existing commerce/privacy/SEO tests.

Browser acceptance verified in Chrome without WebGL: sample auto-detection of both irises, tone switching, original/split view, photo eye-size editing, 185 KB JPEG save and product return preserving required powers. Mobile layout is checked at a 390-pixel viewport. Physical camera quality, iOS/Android permissions and varied real users still require device testing; no synthetic claim of universal tracking accuracy.
