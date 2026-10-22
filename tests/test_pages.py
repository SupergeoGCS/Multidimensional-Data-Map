import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from build_pages import build

TEST_ROOT = ROOT / 'artifacts/test-tmp'
TEST_ROOT.mkdir(parents=True, exist_ok=True)


class PagesTests(unittest.TestCase):
    def test_public_package_loads_from_project_subpath_without_local_assets(self):
        with tempfile.TemporaryDirectory(dir=TEST_ROOT) as directory:
            destination = Path(directory) / 'Multidimensional-Data-Map'
            build(destination)
            self.assertEqual((ROOT / 'web/site-config.js').read_text(encoding='utf-8').splitlines()[-1],
                             'export const PUBLIC_DEMO = false;')
            self.assertIn('PUBLIC_DEMO = true', (destination / 'site-config.js').read_text())
            self.assertTrue((destination / '.nojekyll').exists())
            self.assertFalse((destination / 'package.json').exists())
            self.assertFalse((destination / 'assets').exists())
            self.assertFalse(any(p.suffix in {'.glb', '.ifc', '.rvt', '.bin'} for p in destination.rglob('*')))
            handler = functools.partial(SimpleHTTPRequestHandler, directory=directory)
            server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                base = f'http://127.0.0.1:{server.server_port}/Multidimensional-Data-Map/'
                for name in ('', 'app.js', 'site-config.js', 'demo-buildings.js', 'styles.css',
                             'vendor/three.module.js', 'vendor/maplibre-gl.js',
                             'map-styles/openfreemap-liberty.json'):
                    with urlopen(base + name) as response:
                        self.assertEqual(response.status, 200)
                        self.assertTrue(response.read())
                html = (destination / 'index.html').read_text(encoding='utf-8')
                self.assertNotIn('src="/assets/', html)
            finally:
                server.shutdown()
                thread.join()
                server.server_close()
            with self.assertRaises(ValueError):
                build(destination)

    def test_packager_refuses_output_inside_source(self):
        with self.assertRaises(ValueError):
            build(ROOT / 'web/invalid-public-output')
