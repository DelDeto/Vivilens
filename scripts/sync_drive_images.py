#!/usr/bin/env python3
"""VIVILENS original Drive photos -> high-quality WebP -> Supabase Storage.
This script does NOT modify prices, stock, activity, or prescriptions.
Uses signed GitHub Actions OIDC for upload, with no long-lived credentials.
"""
from __future__ import annotations
import argparse
from io import BytesIO
import json
import os
from pathlib import Path
import tempfile
import time
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
    for attempt in range(3):
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
            if attempt == 2:
                raise RuntimeError(f"Cannot download Drive image {file_id}: public link unavailable, inaccessible or rate limited.") from error
            time.sleep(3 * (2 ** attempt))
    raise RuntimeError(f"Download failed: {file_id}")


EDGE_URL = f"https://{PROJECT}.supabase.co/functions/v1/vivilens-drive-import"
_cached_token = ""
_cached_at = 0.0


def github_oidc_token() -> str:
    """Fetch a fresh, short-lived signed GitHub OIDC token, no persistent secrets."""
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
    parser.add_argument("--max-mb", type=int, default=LIMIT_MB, help="Stop upload if compressed bytes exceed this budget")
    args = parser.parse_args()
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    products = [x for x in data["products"] if not args.slug or x["slug"] == args.slug]
    if args.slug and not products:
        raise SystemExit("Unknown slug: " + args.slug)
    if args.mode == "upload":
        github_oidc_token()  # fail safely before downloading any files
    size, raw_total, completed, skipped = 0, 0, 0, 0
    failures = []
    with tempfile.TemporaryDirectory(prefix="vivilens-images-") as tempdir:
        for item in products:
            sources = item.get("images", [])
            if args.mode == "upload":
                try:
                    preflight = list_imported_ids(item["slug"])
                except Exception as error:
                    failures.append({"slug": item["slug"], "file_id": None, "error": str(error)})
                    print(f"ERROR preflight {item['slug']}: {error}", flush=True)
                    continue
                existing = set(preflight["existing_drive_ids"])
                available_slots = max(0, 5 - int(preflight["gallery_count"]))
                if available_slots == 0:
                    skipped += len(sources)
                    print(f"SKIP {item['slug']}: gallery already has 5 images", flush=True)
                    continue
            else:
                existing, available_slots = set(), 5
            for source in sources:
                if args.limit and completed >= args.limit:
                    break
                file_id = source["id"]
                if file_id in existing:
                    skipped += 1
                    continue
                if available_slots <= 0:
                    skipped += 1
                    continue
                try:
                    original = fetch_drive_image(file_id, tempdir)
                    optimized = convert_photo(original)
                    raw_total += len(original)
                    if size + len(optimized) > args.max_mb * 1048576:
                        raise RuntimeError(f"Compressed batch exceeded {args.max_mb} MiB budget.")
                    if args.mode == "upload":
                        result = upload_via_edge(item["slug"], file_id, optimized)
                        if result.get("skipped"):
                            skipped += 1
                            if result.get("reason") == "gallery is full":
                                available_slots = 0
                            continue
                        existing.add(file_id)
                        available_slots -= 1
                    size += len(optimized)
                    completed += 1
                    print(f"{args.mode.upper()} {item['slug']} {file_id}: {len(original)//1024} KB -> {len(optimized)//1024} KB", flush=True)
                    if args.mode == "upload":
                        time.sleep(0.7)  # Respect Google Drive public download rate limits.
                except Exception as error:
                    failures.append({"slug": item["slug"], "file_id": file_id, "error": str(error)})
                    print(f"ERROR {item['slug']} {file_id}: {error}", flush=True)
                    if "budget" in str(error):
                        raise
                    continue
            if args.limit and completed >= args.limit:
                break

    report = {"processed_new": completed, "already_present_or_full": skipped, "failures": failures,
              "original_mib": round(raw_total / 1048576, 2), "webp_mib": round(size / 1048576, 2)}
    Path("media-sync-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"FINISHED new={completed} skipped={skipped} errors={len(failures)} "
          f"original={raw_total/1048576:.2f}MiB webp={size/1048576:.2f}MiB", flush=True)
    if failures:
        raise SystemExit(f"Partial import: {len(failures)} images/products require retry; see media-sync-report.json.")


if __name__ == "__main__":
    main()
