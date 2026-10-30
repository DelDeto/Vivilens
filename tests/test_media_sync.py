"""Check download validation and safe resume with concurrent product folders."""
from contextlib import redirect_stdout
from io import BytesIO, StringIO
import json
from pathlib import Path
import sys
import tempfile
from threading import Lock
import time
import unittest
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts import sync_drive_images as sync


def photo():
    output = BytesIO()
    Image.new("RGB", (48, 32), "pink").save(output, "PNG")
    return output.getvalue()


class MediaSyncTest(unittest.TestCase):
    def test_html_response_falls_back_to_verified_image_bytes(self):
        class Reply:
            def __init__(self, content):
                self.content = content
            def raise_for_status(self):
                pass

        original = photo()
        with tempfile.TemporaryDirectory() as directory, patch.object(
            sync.requests, "get", side_effect=[Reply(b"<html>Download quota</html>"), Reply(original)]
        ) as download:
            self.assertEqual(sync.fetch_drive_image("drive-test-id", directory), original)
            self.assertEqual(download.call_count, 2)

    def run_import(self, limit=0, budget=250):
        products = [{"slug": slug, "images": [{"id": slug + str(i)} for i in range(3)]}
                    for slug in ("one", "two", "three", "four")]
        existing = {"one": ["one0"], "two": [], "three": [], "four": []}
        uploads = []
        active = set()
        guard = Lock()

        def preflight(slug):
            return {"existing_drive_ids": list(existing[slug]), "gallery_count": len(existing[slug])}

        def upload(slug, file_id, image):
            with guard:
                self.assertNotIn(slug, active, "concurrent writers for the same product")
                active.add(slug)
            time.sleep(0.005)
            with guard:
                self.assertNotIn(file_id, existing[slug], "existing photo uploaded again")
                self.assertLess(len(existing[slug]), 5)
                existing[slug].append(file_id)
                uploads.append((slug, file_id))
                active.remove(slug)
            return {"ok": True}

        with tempfile.TemporaryDirectory() as directory:
            manifest = Path(directory) / "manifest.json"
            manifest.write_text(json.dumps({"products": products}))
            report = Path(directory) / "report.json"
            real_write = Path.write_text

            def write_report(path, *args, **kwargs):
                return real_write(report if path.name == "media-sync-report.json" else path, *args, **kwargs)

            with patch.object(sync, "MANIFEST", manifest), \
                 patch.object(sync, "github_oidc_token", return_value="fake-oidc"), \
                 patch.object(sync, "list_imported_ids", side_effect=preflight), \
                 patch.object(sync, "fetch_drive_image", return_value=photo()), \
                 patch.object(sync, "upload_via_edge", side_effect=upload), \
                 patch.object(sync.time, "sleep", return_value=None), \
                 patch.object(Path, "write_text", write_report), \
                 patch.object(sys, "argv", ["sync", "--mode", "upload", "--limit", str(limit),
                                             "--workers", "4", "--max-mb", str(budget)]), \
                 redirect_stdout(StringIO()):
                sync.main()
            return existing, uploads, json.loads(report.read_text())

    def test_resume_fills_galleries_without_reuploading_existing_photos(self):
        existing, uploads, report = self.run_import()
        self.assertEqual(len(uploads), 11)
        self.assertTrue(all(len(rows) == 3 for rows in existing.values()))
        self.assertEqual(report["processed_new"], 11)
        # All missing covers are uploaded before the first gallery refill.
        self.assertEqual({slug for slug, _ in uploads[:3]}, {"two", "three", "four"})

    def test_concurrent_workers_respect_success_limit(self):
        _, uploads, report = self.run_import(limit=2)
        self.assertEqual(len(uploads), 2)
        self.assertEqual(report["processed_new"], 2)

    def test_zero_storage_budget_blocks_all_uploads(self):
        with self.assertRaises(SystemExit):
            self.run_import(budget=0)


if __name__ == "__main__":
    unittest.main()
