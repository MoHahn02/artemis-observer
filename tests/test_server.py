from __future__ import annotations

import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer

from server import EarthHandler


class StaticServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), EarthHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def test_index_and_javascript_are_served(self) -> None:
        with urllib.request.urlopen(f"{self.base_url}/", timeout=5) as response:
            body = response.read().decode("utf-8")
            self.assertEqual(response.status, 200)
            self.assertIn('<script type="module" src="app.js', body)

        with urllib.request.urlopen(f"{self.base_url}/app.js", timeout=5) as response:
            self.assertEqual(response.status, 200)
            self.assertGreater(int(response.headers["Content-Length"]), 100_000)

    def test_generated_data_disables_stale_browser_caching(self) -> None:
        with urllib.request.urlopen(f"{self.base_url}/data/launch-feed.json", timeout=5) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.headers.get("Cache-Control"), "no-cache")


if __name__ == "__main__":
    unittest.main()
