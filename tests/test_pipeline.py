import contextlib
import io
import json
import struct
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'skills/bim-maplibre-preprocess/scripts'))
from audit_rvt import CFB, inspect
from convert_ifc import main, validate_glb

TEST_ROOT = Path(__file__).resolve().parents[1] / 'artifacts/test-tmp'
TEST_ROOT.mkdir(parents=True, exist_ok=True)

def glb_bytes():
    # Minimal scene fixture for structural validation, not a rendering fixture.
    document = json.dumps({'asset': {'version': '2.0'}, 'scenes': [{'nodes': [0]}],
                           'nodes': [{'mesh': 0}], 'meshes': [{'primitives': []}]}).encode()
    document += b' ' * (-len(document) % 4)
    return struct.pack('<4sII', b'glTF', 2, 20 + len(document)) + struct.pack('<II', len(document), 0x4e4f534a) + document


class PipelineTests(unittest.TestCase):
    def test_invalid_rvt_report_does_not_claim_geometry(self):
        with tempfile.TemporaryDirectory(dir=TEST_ROOT) as directory:
            source = Path(directory) / 'bad.rvt'
            source.write_bytes(b'not a revit file')
            report = inspect(source)
            self.assertEqual(report['container_metadata_status'], 'inspection_failed')
            self.assertFalse(report['geometry_verified'])
            self.assertEqual(source.read_bytes(), b'not a revit file')

    def test_cyclic_chain_is_rejected(self):
        with self.assertRaises(ValueError):
            list(CFB.chain(0, [1, 0]))

    def test_glb_length_and_chunk_corruption(self):
        with tempfile.TemporaryDirectory(dir=TEST_ROOT) as directory:
            target = Path(directory) / 'model.glb'
            data = glb_bytes()
            target.write_bytes(data)
            self.assertEqual(validate_glb(target)['visual_acceptance'], 'not_run')
            target.write_bytes(data[:-1])
            with self.assertRaises(ValueError):
                validate_glb(target)

    def test_duplicate_glb_json_is_rejected(self):
        with tempfile.TemporaryDirectory(dir=TEST_ROOT) as directory:
            target = Path(directory) / 'duplicate.glb'
            data = bytearray(glb_bytes())
            data.extend(data[12:])
            struct.pack_into('<I', data, 8, len(data))
            target.write_bytes(data)
            with self.assertRaisesRegex(ValueError, 'Duplicate JSON'):
                validate_glb(target)
            damaged = bytearray(data)
            struct.pack_into('<I', damaged, 12, len(data) * 2)
            target.write_bytes(damaged)
            with self.assertRaises(ValueError):
                validate_glb(target)

    def test_conversion_provenance_failure_and_overwrite(self):
        with tempfile.TemporaryDirectory(dir=TEST_ROOT) as directory:
            root = Path(directory)
            source, exe = root / 'model.ifc', root / 'IfcConvert.exe'
            source.write_bytes(b'IFC fixture')
            exe.write_bytes(b'tool identity fixture')
            out, report = root / 'out.glb', root / 'report.json'
            argv = ['convert_ifc.py', '--input', str(source), '--output', str(out),
                    '--report', str(report), '--ifcconvert', str(exe)]
            def fake_run(command, **kwargs):
                if '--help' not in command:
                    out.write_bytes(glb_bytes())
                return type('Completed', (), {'returncode': 0})()
            with patch.object(sys, 'argv', argv), patch('convert_ifc.subprocess.run', side_effect=fake_run), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(main(), 0)
            record = json.loads(report.read_text(encoding='utf-8'))
            self.assertEqual(record['status'], 'converted_container_checked')
            self.assertEqual(record['validation']['placement_acceptance'], 'not_run')
            original = out.read_bytes()
            with patch.object(sys, 'argv', argv), contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                main()
            self.assertEqual(out.read_bytes(), original)
            failure_args = argv.copy()
            failure_args[failure_args.index('--output') + 1] = str(root / 'failed.glb')
            failure_args[failure_args.index('--report') + 1] = str(root / 'failed.json')
            with patch.object(sys, 'argv', failure_args), patch('convert_ifc.subprocess.run', side_effect=OSError('missing runtime DLL')), contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(main(), 1)
            failure = json.loads((root / 'failed.json').read_text(encoding='utf-8'))
            self.assertEqual(failure['status'], 'failed')
            self.assertIn('missing runtime DLL', failure['error'])


if __name__ == '__main__':
    unittest.main()
