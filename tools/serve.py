"""Servidor local sin caché (para ver los cambios al recargar). Uso: python tools/serve.py [puerto]
Accesible desde el móvil en la misma wifi: http://<IP-del-PC>:8000
"""
import http.server
import os
import sys
from pathlib import Path


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


os.chdir(Path(__file__).resolve().parent.parent)
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f"Sirviendo en http://localhost:{port}  (Ctrl+C para parar)")
http.server.ThreadingHTTPServer(("0.0.0.0", port), NoCache).serve_forever()
