#!/usr/bin/env python3
from __future__ import annotations

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent


class EarthHandler(SimpleHTTPRequestHandler):
    """Serve the GitHub Pages payload locally without production-only APIs."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def end_headers(self) -> None:
        if self.path.startswith("/data/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        print(f"[server] {self.address_string()} - {fmt % args}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve Earth locally.")
    parser.add_argument("--port", type=int, default=8000, help="Local HTTP port")
    parser.add_argument("--bind", default="127.0.0.1", help="Address to bind")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.bind, args.port), EarthHandler)
    print(f"Earth running on http://{args.bind}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
