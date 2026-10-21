import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from serve_map import ASSETS, Handler, ROOT


class MapServerTests(unittest.TestCase):
    def setUp(self):
        self.handler = Handler.__new__(Handler)

    def test_only_explicit_asset_routes_leave_web_root(self):
        self.assertEqual(Path(self.handler.translate_path('/assets/str.glb')), ASSETS['/assets/str.glb'])
        self.assertEqual(Path(self.handler.translate_path('/assets/native-str.glb')), ASSETS['/assets/native-str.glb'])
        self.assertEqual(Path(self.handler.translate_path('/assets/native-str.attributes.json')), ASSETS['/assets/native-str.attributes.json'])
        for route in ('/../references/model.rvt', '/%2e%2e/.git/config', '/vendor/../../docs/STATE.md', '/assets/../../references/model.rvt'):
            result = Path(self.handler.translate_path(route))
            self.assertTrue(result.is_relative_to(ROOT / 'web'))
            self.assertFalse(result.exists())

    def test_frontend_paths_stay_inside_web(self):
        for route in ('/', '/index.html?test=1', '/app.js', '/vendor/three.module.js'):
            self.assertTrue(Path(self.handler.translate_path(route)).is_relative_to(ROOT / 'web'))

    def test_directory_listing_is_disabled(self):
        errors = []
        self.handler.send_error = errors.append
        self.assertIsNone(self.handler.list_directory(str(ROOT / 'web/vendor')))
        self.assertEqual(errors, [404])


if __name__ == '__main__':
    unittest.main()
