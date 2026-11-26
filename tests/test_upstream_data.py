"""The upstream usaciv data files must stay exactly as the pipeline built them.

This edition adds one file (legendarium.json) and edits none. If a real pipeline rebuild changes the data,
regenerate the manifest with:  python3 tests/make_data_manifest.py
"""

import hashlib
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB_DATA = ROOT / "web" / "data"
FIXTURES = Path(__file__).resolve().parent / "fixtures"

UPSTREAM = ["world", "cities", "states", "nation", "counties", "lenses", "resources", "infrastructure",
            "military", "wonders", "trade", "districts", "citizens", "disasters", "sources"]


class UpstreamDataTest(unittest.TestCase):
    def test_upstream_files_match_the_manifest(self):
        manifest = json.loads((FIXTURES / "upstream_data.json").read_text())["files"]
        self.assertEqual(sorted(manifest), sorted(f"{n}.json" for n in UPSTREAM))
        for name, want in manifest.items():
            got = hashlib.sha256((WEB_DATA / name).read_bytes()).hexdigest()
            self.assertEqual(got, want, f"{name} changed; rerun tests/make_data_manifest.py only after a real pipeline rebuild")

    def test_all_31_public_sources_are_listed(self):
        self.assertEqual(len(json.loads((WEB_DATA / "sources.json").read_text())), 31)


if __name__ == "__main__":
    unittest.main()
