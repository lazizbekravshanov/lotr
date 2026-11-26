"""Write tests/fixtures/upstream_data.json: the sha256 of every upstream data file in web/data.

Run it only after a real pipeline rebuild (uv run python -m pipeline all), never to paper over a hand edit.
"""

import hashlib
import json
from pathlib import Path

from test_upstream_data import FIXTURES, UPSTREAM, WEB_DATA


def main() -> None:
    files = {f"{n}.json": hashlib.sha256((WEB_DATA / f"{n}.json").read_bytes()).hexdigest() for n in UPSTREAM}
    doc = {"note": "sha256 of the upstream usaciv data files; see tests/test_upstream_data.py", "files": files}
    (FIXTURES / "upstream_data.json").write_text(json.dumps(doc, indent=1) + "\n")
    print(f"wrote {len(files)} hashes")


if __name__ == "__main__":
    main()
