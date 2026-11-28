"""The local server (python -m pipeline serve) must make browsers revalidate, so an edited script shows on reload."""

import functools
import http.server
import tempfile
import threading
import unittest
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
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

    def test_a_burst_of_connections_is_served(self):
        # A page load revalidates about 80 files at once, each over its own connection. With Python's default listen
        # backlog of 5, macOS resets the overflow (net::ERR_CONNECTION_RESET in the browser): a module import fails
        # and the page never starts.
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "a.js").write_text("export const x = 1;\n")
            with cli.make_server(0, tmp) as srv:
                threading.Thread(target=srv.serve_forever, daemon=True).start()
                url = f"http://127.0.0.1:{srv.server_address[1]}/a.js"

                def get(_):
                    try:
                        with urllib.request.urlopen(url, timeout=10) as r:
                            return r.status
                    except OSError as e:
                        return type(e).__name__

                try:
                    with ThreadPoolExecutor(64) as pool:
                        results = Counter(pool.map(get, range(300)))
                finally:
                    srv.shutdown()
        self.assertEqual(results, Counter({200: 300}))
        self.assertGreaterEqual(srv.request_queue_size, 128, "room to queue a page load's connections")


if __name__ == "__main__":
    unittest.main()
