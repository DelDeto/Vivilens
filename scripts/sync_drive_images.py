#!/usr/bin/env python3
"""VIVILENS original Drive photos -> high-quality WebP -> Supabase Storage.
This script does NOT modify prices, stock, activity, or prescriptions.
Uses signed GitHub Actions OIDC for upload, with no long-lived credentials.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import json
import os
from pathlib import Path
import tempfile
import time
from threading import Lock
from urllib.parse import quote

import gdown
import requests
from PIL import Image, ImageOps, ImageCms, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "catalog" / "drive_products_2026-10-29.json"
PROJECT = "qovmjpafxlabeamvblkc"
BUCKET = "vivilens-products"
MAX_LONG_EDGE = 1600
# Do not force lower-quality output just to hit a byte target: preserve fine print and iris detail.
WEBP_QUALITY = 86
LIMIT_MB = 250
TIMEOUT = 60


def convert_photo(raw: bytes) -> bytes:
    with Image.open(BytesIO(raw)) as image:
        image = ImageOps.exif_transpose(image)
        try:
            icc = image.info.get("icc_profile")
            if icc:
                import io
                image = ImageCms.profileToProfile(image, ImageCms.ImageCmsProfile(io.BytesIO(icc)), ImageCms.createProfile("sRGB"))
        except (ValueError, OSError, TypeError):
            # An invalid ICC profile must not cause a change in pixel geometry.
            pass
        if max(image.size) > MAX_LONG_EDGE:
            image.thumbnail((MAX_LONG_EDGE, MAX_LONG_EDGE), Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        output = BytesIO()
        image.save(output, format="WEBP", quality=WEBP_QUALITY, method=6)
        return output.getvalue()


def fetch_drive_image(file_id: str, tempdir: str) -> bytes:
    path = os.path.join(tempdir, file_id)
    # Public originals sometimes fail via gdown's confirmation-page parser even
    # though Drive can serve the same original directly. Validate image bytes,
    # never accept a login/quota HTML page as a successful download.
    urls = [
        f"https://drive.google.com/uc?export=download&id={quote(file_id)}",
        f"https://drive.usercontent.google.com/download?id={quote(file_id)}&export=download&confirm=t",
        f"https://lh3.googleusercontent.com/d/{quote(file_id)}=s0",
    ]
    for url in urls:
        try:
            response = requests.get(url, timeout=(10, 30))
            response.raise_for_status()
            data = response.content
            with Image.open(BytesIO(data)) as img:
                img.verify()
            return data
        except (requests.RequestException, OSError, ValueError):
            continue
    for attempt in range(2):
        try:
            result = gdown.download(id=file_id, output=path, quiet=True, fuzzy=True)
            if not result:
                raise RuntimeError("Google Drive denied download, rate limited, or file is not shared publicly.")
            data = Path(result).read_bytes()
            with Image.open(BytesIO(data)) as img:
                img.verify()
            return data
        except Exception as error:
            # gdown raises FileURLRetrievalError on a private, over-quota or rate-limited file.
            if attempt == 1:
                raise RuntimeError(f"Cannot download Drive image {file_id}: public link unavailable, inaccessible or rate limited.") from error
            time.sleep(3 * (2 ** attempt))
    raise RuntimeError(f"Download failed: {file_id}")


EDGE_URL = f"https://{PROJECT}.supabase.co/functions/v1/vivilens-drive-import"
_cached_token = ""
_cached_at = 0.0
_token_lock = Lock()


def github_oidc_token() -> str:
    """Fetch a fresh, short-lived signed GitHub OIDC token, no persistent secrets."""
    with _token_lock:
        return _refresh_github_oidc_token()


def _refresh_github_oidc_token() -> str:
    global _cached_token, _cached_at
    if _cached_token and time.monotonic() - _cached_at < 100:
        return _cached_token
    request_url = os.getenv("ACTIONS_ID_TOKEN_REQUEST_URL", "")
    request_secret = os.getenv("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "")
    if not request_url or not request_secret:
        raise RuntimeError("Requires GitHub Actions id-token: write. Cannot upload outside the trusted workflow.")
    url = request_url + ("&" if "?" in request_url else "?") + "audience=vivilens-media-sync"
    response = requests.get(url, headers={"Authorization": "bearer " + request_secret}, timeout=TIMEOUT)
    response.raise_for_status()
    _cached_token = response.json()["value"]
    _cached_at = time.monotonic()
    return _cached_token


def list_imported_ids(slug: str) -> dict:
    """OIDC-authorized preflight: avoid downloading already imported images."""
    for attempt in range(4):
        response = requests.get(EDGE_URL, headers={
            "Authorization": "Bearer " + github_oidc_token()
        }, params={"slug": slug}, timeout=TIMEOUT)
        if response.status_code in (429, 500, 502, 503, 504) and attempt < 3:
            time.sleep(2 ** attempt)
            continue
        if not response.ok:
            raise RuntimeError(f"Cannot list already uploaded files for {slug}: HTTP {response.status_code}: {response.text[:250]}")
        data = response.json()
        if not isinstance(data.get("existing_drive_ids"), list):
            raise RuntimeError("Invalid preflight response: missing existing_drive_ids")
        return data
    raise RuntimeError("Image status preflight retries exhausted.")


def upload_via_edge(slug: str, file_id: str, webp: bytes) -> dict:
    for attempt in range(4):
        response = requests.post(EDGE_URL, headers={
            "Authorization": "Bearer " + github_oidc_token()
        }, files={"image": (file_id + ".webp", webp, "image/webp")},
           data={"slug": slug, "drive_id": file_id}, timeout=TIMEOUT)
        if response.status_code in (429, 500, 502, 503, 504) and attempt < 3:
            time.sleep(2 ** attempt)
            continue
        if not response.ok:
            raise RuntimeError(f"Edge import rejected HTTP {response.status_code}: {response.text[:350]}")
        return response.json()
    raise RuntimeError("Upload retries exceeded.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("dry-run", "upload"), default="dry-run")
    parser.add_argument("--limit", type=int, default=4, help="Max number of images to process; 0 means all")
    parser.add_argument("--slug", default="", help="One model only, e.g. siren-gray")
    parser.add_argument("--priority-slugs", default="ai-blue,milky-blue", help="Comma-separated image-less lens models to attempt first when uploading")
    parser.add_argument("--max-mb", type=int, default=LIMIT_MB, help="Stop upload if compressed bytes exceed this budget")
    parser.add_argument("--max-attempts", type=int, default=60, help="Maximum new Drive downloads to attempt per run; prevents timeout when Google rate limits")
    parser.add_argument("--max-failures", type=int, default=10, help="Stop a batch after this many inaccessible photos; next scheduled run rotates to a different section")
    parser.add_argument("--workers", type=int, default=4, choices=range(1, 5), help="Independent product folders to sync concurrently; writes within each product remain serial")
    args = parser.parse_args()
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    products = [x for x in data["products"] if not args.slug or x["slug"] == args.slug]
    if args.slug and not products:
        raise SystemExit("Unknown slug: " + args.slug)
    # GitHub scheduled runs rotate across product folders instead of repeatedly
    # retrying the same inaccessible Drive file at the front of the catalog.
    rotation = 0
    run_number = os.getenv("GITHUB_RUN_NUMBER", "")
    if args.mode == "upload" and not args.slug and run_number.isdigit() and products:
        rotation = (int(run_number) * 13) % len(products)
        products = products[rotation:] + products[:rotation]
        print(f"RESUME rotation={rotation}/{len(products)} run={run_number}", flush=True)
    if args.mode == "upload":
        priority = [slug.strip() for slug in args.priority_slugs.split(",") if slug.strip()]
        if priority and not args.slug:
            order = {slug: i for i, slug in enumerate(priority)}
            products.sort(key=lambda p: (0, order[p["slug"]]) if p["slug"] in order else (1, 0))
            print(f"PRIORITY photos: {', '.join(priority)}", flush=True)
        github_oidc_token()  # fail safely before downloading any files

    lock = Lock()
    state = dict(size=0, raw_total=0, completed=0, skipped=0, attempted=0,
                 inflight=0, stopped_early=False, failures=[])

    def failure(slug, file_id, error):
        with lock:
            state["failures"].append({"slug": slug, "file_id": file_id, "error": str(error)})
        print(f"ERROR {slug} {file_id or 'preflight'}: {error}", flush=True)

    with tempfile.TemporaryDirectory(prefix="vivilens-images-") as tempdir:
        def process_product(item, cover_phase=False):
            sources = item.get("images", [])
            if args.mode == "upload":
                try:
                    preflight = list_imported_ids(item["slug"])
                except Exception as error:
                    failure(item["slug"], None, error)
                    return
                existing = set(preflight["existing_drive_ids"])
                available_slots = max(0, 5 - int(preflight["gallery_count"]))
                if cover_phase and int(preflight["gallery_count"]) > 0:
                    return
                if available_slots == 0:
                    with lock:
                        state["skipped"] += len(sources)
                    print(f"SKIP {item['slug']}: gallery already has 5 images", flush=True)
                    return
            else:
                existing, available_slots = set(), 5
            product_temp = os.path.join(tempdir, item["slug"])
            os.makedirs(product_temp, exist_ok=True)
            for source in sources:
                file_id = source["id"]
                if file_id in existing:
                    with lock:
                        state["skipped"] += 1
                    continue
                if available_slots <= 0:
                    break
                with lock:
                    if args.limit and state["completed"] + state["inflight"] >= args.limit:
                        return
                    if state["attempted"] >= args.max_attempts or len(state["failures"]) >= args.max_failures or state["stopped_early"]:
                        state["stopped_early"] = True
                        return
                    state["attempted"] += 1
                    state["inflight"] += 1
                reserved = 0
                try:
                    original = fetch_drive_image(file_id, product_temp)
                    optimized = convert_photo(original)
                    with lock:
                        if state["size"] + len(optimized) > args.max_mb * 1048576:
                            state["stopped_early"] = True
                            raise RuntimeError(f"Compressed batch exceeded {args.max_mb} MiB budget.")
                        reserved = len(optimized)
                        state["size"] += reserved
                    if args.mode == "upload":
                        result = upload_via_edge(item["slug"], file_id, optimized)
                        if result.get("skipped"):
                            with lock:
                                state["skipped"] += 1
                                state["size"] -= reserved
                            reserved = 0
                            if result.get("reason") == "gallery is full":
                                available_slots = 0
                            continue
                        existing.add(file_id)
                        available_slots -= 1
                    with lock:
                        state["completed"] += 1
                        state["raw_total"] += len(original)
                    reserved = 0
                    if cover_phase:
                        print(f"COVER_READY {item['slug']}", flush=True)
                        break
                    print(f"{args.mode.upper()} {item['slug']} {file_id}: {len(original)//1024} KB -> {len(optimized)//1024} KB", flush=True)
                    if args.mode == "upload":
                        time.sleep(0.8)
                except Exception as error:
                    with lock:
                        state["size"] -= reserved
                    failure(item["slug"], file_id, error)
                finally:
                    with lock:
                        state["inflight"] -= 1

        # Each product has only one writer. The barrier between these two passes
        # gets every model a cover before spending time on the rest of its gallery.
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            if args.mode == "upload" and not args.slug:
                list(pool.map(lambda item: process_product(item, True), products))
            list(pool.map(process_product, products))

    size, raw_total = state["size"], state["raw_total"]
    completed, skipped = state["completed"], state["skipped"]
    attempted, stopped_early, failures = state["attempted"], state["stopped_early"], state["failures"]
    report = {"processed_new": completed, "already_present_or_full": skipped,
              "attempted_new_downloads": attempted, "batch_stopped_early": stopped_early,
              "catalog_rotation_index": rotation, "failures": failures,
              "original_mib": round(raw_total / 1048576, 2), "webp_mib": round(size / 1048576, 2)}
    Path("media-sync-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"FINISHED new={completed} skipped={skipped} attempts={attempted} stopped_early={stopped_early} errors={len(failures)} "
          f"original={raw_total/1048576:.2f}MiB webp={size/1048576:.2f}MiB", flush=True)
    if failures:
        raise SystemExit(f"Partial import: {len(failures)} images/products require retry; see media-sync-report.json.")
    if stopped_early:
        raise SystemExit("Import stopped at the configured safety budget; see media-sync-report.json.")


if __name__ == "__main__":
    main()
