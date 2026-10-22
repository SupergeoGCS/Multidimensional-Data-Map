import functools
import hashlib
import json
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
from public_assets import ASSET_NAMES, verify_assets

TEST_ROOT = ROOT / 'artifacts/test-tmp'
TEST_ROOT.mkdir(parents=True, exist_ok=True)


class PagesTests(unittest.TestCase):
    def test_public_package_loads_from_project_subpath_with_approved_str_assets(self):
        with tempfile.TemporaryDirectory(dir=TEST_ROOT) as directory:
            destination = Path(directory) / 'Multidimensional-Data-Map'
            build(destination)
            self.assertEqual((ROOT / 'web/site-config.js').read_text(encoding='utf-8').splitlines()[-1],
                             'export const PUBLIC_DEMO = false;')
            self.assertIn('PUBLIC_DEMO = true', (destination / 'site-config.js').read_text())
            self.assertTrue((destination / '.nojekyll').exists())
            self.assertFalse((destination / 'package.json').exists())
            self.assertEqual({p.name for p in (destination / 'assets').iterdir()}, ASSET_NAMES | {'manifest.json'})
            summary = verify_assets(destination / 'assets')
            self.assertEqual(summary['native_mesh_nodes'], 8243)
            self.assertEqual(summary['elements'], 8536)
            self.assertFalse(any(p.suffix in {'.ifc', '.rvt', '.bin'} for p in destination.rglob('*')))
            handler = functools.partial(SimpleHTTPRequestHandler, directory=directory)
            server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                base = f'http://127.0.0.1:{server.server_port}/Multidimensional-Data-Map/'
                for name in ('', 'app.js', 'site-config.js', 'demo-buildings.js', 'styles.css',
                             'vendor/three.module.js', 'vendor/maplibre-gl.js',
                             'map-styles/openfreemap-liberty.json',
                             'assets/str.glb', 'assets/native-str.glb', 'assets/native-str.attributes.json'):
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
            # Updating a manifest alone must not permit mismatched model properties.
            attribute_path = destination / 'assets/native-str.attributes.json'
            attributes = json.loads(attribute_path.read_text(encoding='utf-8'))
            attributes['glb_sha256'] = '0' * 64
            attribute_path.write_text(json.dumps(attributes), encoding='utf-8')
            manifest_path = destination / 'assets/manifest.json'
            manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
            manifest['files'][attribute_path.name] = {'bytes': attribute_path.stat().st_size,
                'sha256': hashlib.sha256(attribute_path.read_bytes()).hexdigest()}
            manifest_path.write_text(json.dumps(manifest), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'attributes do not match'):
                verify_assets(destination / 'assets')

    def test_packager_refuses_output_inside_source(self):
        with self.assertRaises(ValueError):
            build(ROOT / 'web/invalid-public-output')
