#!/usr/bin/env python3
"""VIVILENS original Drive photos -> high-quality WebP -> Supabase Storage.
This script does NOT modify prices, stock, activity, or prescriptions.
Requires SUPABASE_SERVICE_ROLE_KEY only for --mode upload.
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
        except (RuntimeError, OSError, UnidentifiedImageError) as error:
            if attempt == 2:
                raise RuntimeError(f"Cannot download Drive file {file_id}. If Drive is private, configure service-account access instead.") from error
            time.sleep(2 + attempt * 3)
    raise RuntimeError(f"Download failed: {file_id}")


def api(method: str, endpoint: str, key: str, *, json_data=None, content=None, extra_headers=None, params=None):
    url = f"https://{PROJECT}.supabase.co/{endpoint}"
    headers = {"apikey": key, "Authorization": "Bearer " + key}
    if extra_headers:
        headers.update(extra_headers)
    for attempt in range(4):
        response = requests.request(method, url, headers=headers, json=json_data, data=content, params=params, timeout=TIMEOUT)
        if response.status_code in (429, 500, 502, 503, 504) and attempt < 3:
            time.sleep(2 ** attempt)
            continue
        if not response.ok:
            raise RuntimeError(f"Supabase {method} {endpoint.split('?')[0]}: HTTP {response.status_code}: {response.text[:350]}")
        try:
            return response.json()
        except ValueError:
            return {}
    raise RuntimeError("Too many Supabase retries.")


def all_products(key: str):
    rows = api("GET", "rest/v1/products", key, params={"select": "id,slug,name,active,image_url", "limit": "1000"})
    return {x["slug"]: x for x in rows}


def image_rows(key: str):
    rows = api("GET", "rest/v1/product_images", key, params={"select": "product_id,position,storage_path,image_url", "limit": "1000"})
    result = {}
    for row in rows:
        result.setdefault(row["product_id"], []).append(row)
    return result


def public_url(path: str):
    return f"https://{PROJECT}.supabase.co/storage/v1/object/public/{BUCKET}/" + quote(path, safe="/")


def upload(product, file_id, webp, key):
    path = f"{product['id']}/drive-{file_id}.webp"
    endpoint = f"storage/v1/object/{BUCKET}/{quote(path, safe='/')}"
    api("POST", endpoint, key, content=webp, extra_headers={
        "Content-Type": "image/webp", "cache-control": "public, max-age=31536000, immutable",
        "x-upsert": "false"
    })
    return path


def register_image(product, path, image_position, key):
    url = public_url(path)
    row = {
        "product_id": product["id"],
        "position": image_position,
        "image_url": url,
        "storage_path": path,
        "alt_text": f"{product['name']} – ảnh sản phẩm {image_position}"
    }
    api("POST", "rest/v1/product_images", key, json_data=row, extra_headers={"Prefer": "return=minimal"})
    # Preserve images already curated by the store owner; replace only missing/placeholder cover on FIRST IMAGE.
    if image_position == 1 and (not product.get("image_url") or "images.unsplash.com" in product.get("image_url", "")):
        api("PATCH", "rest/v1/products", key, json_data={"image_url": url},
            params={"id": "eq." + product["id"]}, extra_headers={"Prefer": "return=minimal"})


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
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if args.mode == "upload" and not key:
        raise SystemExit("Missing repository secret SUPABASE_SERVICE_ROLE_KEY. No uploads performed.")
    known, existing = (all_products(key), image_rows(key)) if args.mode == "upload" else ({}, {})
    size, raw_total, completed, skipped = 0, 0, 0, 0
    with tempfile.TemporaryDirectory(prefix="vivilens-images-") as tempdir:
        for item in products:
            dbproduct = known.get(item["slug"]) if args.mode == "upload" else None
            if args.mode == "upload" and not dbproduct:
                print("SKIP: product missing from Supabase:", item["slug"])
                continue
            attached = existing.get(dbproduct["id"], []) if dbproduct else []
            occupied = {row.get("storage_path") for row in attached}
            if len(attached) >= 5:
                skipped += len(item.get("images", []))
                continue
            for source in item.get("images", []):
                if args.limit and completed >= args.limit:
                    print(f"FINISHED {completed} new files; {raw_total/1048576:.1f} MiB originals -> {size/1048576:.1f} MiB WebP; skipped {skipped}")
                    return
                file_id = source["id"]
                path = f"{dbproduct['id']}/drive-{file_id}.webp" if dbproduct else ""
                if path in occupied:
                    skipped += 1
                    continue
                if len(attached) >= 5:
                    break
                original = fetch_drive_image(file_id, tempdir)
                optimized = convert_photo(original)
                raw_total += len(original)
                size += len(optimized)
                if size > args.max_mb * 1048576:
                    raise RuntimeError(f"Compressed batch exceeded {args.max_mb} MiB. Stop before upload; review limits.")
                if args.mode == "upload":
                    try:
                        uploaded = upload(dbproduct, file_id, optimized, key)
                    except RuntimeError as error:
                        if "HTTP 409" in str(error):
                            uploaded = path  # Idempotent recovery from an earlier partially uploaded run.
                        else:
                            raise
                    register_image(dbproduct, uploaded, len(attached) + 1, key)
                    attached.append({"storage_path": uploaded})
                    occupied.add(uploaded)
                completed += 1
                print(f"{args.mode.upper()} {item['slug']} {file_id}: {len(original)//1024} KB -> {len(optimized)//1024} KB")
    print(f"FINISHED {completed} new images; {raw_total/1048576:.1f} MiB originals -> {size/1048576:.1f} MiB WebP; skipped {skipped}")


if __name__ == "__main__":
    main()
