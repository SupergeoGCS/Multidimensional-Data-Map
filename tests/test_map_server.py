import sys
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from serve_map import ASSETS, Handler, ROOT


class MapServerTests(unittest.TestCase):
    def setUp(self):
        self.handler = Handler.__new__(Handler)

    def test_only_explicit_asset_routes_leave_web_root(self):
        for route, local in ASSETS.items():
            expected = local if local.is_file() else ROOT / 'web' / route.lstrip('/')
            self.assertEqual(Path(self.handler.translate_path(route)), expected)
        for route in ('/../references/model.rvt', '/%2e%2e/.git/config', '/vendor/../../docs/STATE.md', '/assets/../../references/model.rvt'):
            result = Path(self.handler.translate_path(route))
            self.assertTrue(result.is_relative_to(ROOT / 'web'))
            self.assertFalse(result.exists())

    def test_frontend_paths_stay_inside_web(self):
        for route in ('/', '/index.html?test=1', '/app.js', '/vendor/three.module.js'):
            self.assertTrue(Path(self.handler.translate_path(route)).is_relative_to(ROOT / 'web'))

    def test_fresh_clone_uses_published_assets_without_local_artifacts(self):
        with patch.dict(ASSETS, {'/assets/str.glb': ROOT / 'missing-artifacts/str.glb'}):
            result = Path(self.handler.translate_path('/assets/str.glb'))
            self.assertEqual(result, ROOT / 'web/assets/str.glb')
            self.assertTrue(result.is_file())

    def test_directory_listing_is_disabled(self):
        errors = []
        self.handler.send_error = errors.append
        self.assertIsNone(self.handler.list_directory(str(ROOT / 'web/vendor')))
        self.assertEqual(errors, [404])


if __name__ == '__main__':
    unittest.main()
