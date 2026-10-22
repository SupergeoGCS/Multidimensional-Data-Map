import gzip
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import sys

path = Path(__file__).resolve().parents[1] / 'tools' / 'probe_rvt_coordinates.py'
sys.path.insert(0, str(path.parent))
spec = importlib.util.spec_from_file_location('coordinate_probe', path)
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class CoordinateProbeTests(unittest.TestCase):
    def test_member_offsets_and_concatenated_streams(self):
        first = gzip.compress(b'first', mtime=0)
        second = gzip.compress(b'second', mtime=0)
        members = list(probe.inflate_members(b'header'+first+second))
        self.assertEqual([(at, data) for at, data, error in members],
                         [(6, b'first'), (6+len(first), b'second')])
        self.assertTrue(all(error is None for _, _, error in members))

    def test_inflate_limit_and_truncation_are_explicit_errors(self):
        member = gzip.compress(b'0'*1000, mtime=0)
        with patch.object(probe, 'LIMIT', 100):
            self.assertEqual(list(probe.inflate_members(member))[0][2],
                             'inflate_limit_or_truncated')
        self.assertEqual(list(probe.inflate_members(member[:12]))[0][2],
                         'inflate_limit_or_truncated')


if __name__ == '__main__':
    unittest.main()
