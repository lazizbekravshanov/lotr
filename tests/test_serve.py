"""The local server (python -m pipeline serve) must make browsers revalidate, so an edited script shows on reload."""

import functools
import http.server
import tempfile
import threading
import unittest
import urllib.request
from pathlib import Path

import pipeline.__main__ as cli


class ServeTest(unittest.TestCase):
    def test_responses_ask_the_browser_to_revalidate(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "a.js").write_text("export const x = 1;\n")
            handler = functools.partial(cli.RevalidatingHandler, directory=tmp)
            with http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler) as srv:
                threading.Thread(target=srv.serve_forever, daemon=True).start()
                try:
                    with urllib.request.urlopen(f"http://127.0.0.1:{srv.server_address[1]}/a.js") as r:
                        self.assertEqual(r.status, 200)
                        self.assertEqual(r.headers.get("Cache-Control"), "no-cache")
                        self.assertTrue(r.headers.get("Last-Modified"))
                finally:
                    srv.shutdown()


if __name__ == "__main__":
    unittest.main()
