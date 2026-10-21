"""Local-only map server. Exposes web assets and explicitly allowed model packages."""
import argparse
import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
ASSETS = {'/assets/str.glb': ROOT / 'artifacts/rvt-rs-str-0.6.0/str-preview-only.glb',
          '/assets/native-str.glb': ROOT / 'artifacts/revit-str-2026-10-21/native-internal.glb',
          '/assets/native-str.attributes.json': ROOT / 'artifacts/revit-str-2026-10-21/native-internal.attributes.json',
          '/assets/preview.png': ROOT / 'reports/rvt-rs-str-0.6.0/preview.png'}


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean = unquote(urlsplit(path).path)
        if clean in ASSETS:
            return str(ASSETS[clean])
        target = (ROOT / 'web' / clean.lstrip('/')).resolve()
        if not target.is_relative_to((ROOT / 'web').resolve()):
            return str(ROOT / 'web' / '__not_found__')
        return str(target)

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--data-root', type=Path, default=ROOT,
                        help='Main workspace containing the ignored artifacts/ assets')
    parser.add_argument('--open-browser', action='store_true')
    args = parser.parse_args()
    data_root = args.data_root.resolve()
    ASSETS.update({'/assets/str.glb': data_root / 'artifacts/rvt-rs-str-0.6.0/str-preview-only.glb',
                   '/assets/native-str.glb': data_root / 'artifacts/revit-str-2026-10-21/native-internal.glb',
                   '/assets/native-str.attributes.json': data_root / 'artifacts/revit-str-2026-10-21/native-internal.attributes.json',
                   '/assets/preview.png': data_root / 'reports/rvt-rs-str-0.6.0/preview.png'})
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(ROOT / 'web')))
    print(f'Local map: http://127.0.0.1:{args.port}', flush=True)
    if args.open_browser:
        timer = threading.Timer(.7, lambda: webbrowser.open(f'http://127.0.0.1:{args.port}'))
        timer.daemon = True
        timer.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
