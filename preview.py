#!/usr/bin/env python3
"""Tiny preview server: serves ead-portal.html at / so the live preview opens straight into the portal."""
import http.server, socketserver, os

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "8080"))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_GET(self):
        if self.path in ("/", "", "/index.html"):
            self.path = "/ead-portal.html"
        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"EAD e-Portal preview on http://0.0.0.0:{PORT}", flush=True)
    httpd.serve_forever()
