"""Run an installed IfcConvert; retain provenance and validate basic GLB structure."""
import argparse
import json
import struct
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from audit_rvt import sha256


def validate_glb(path):
    size = path.stat().st_size
    with path.open('rb') as source:
        header = source.read(12)
        if len(header) != 12:
            raise ValueError('Truncated GLB header')
        magic, version, length = struct.unpack('<4sII', header)
        if magic != b'glTF' or version != 2 or length != size:
            raise ValueError('Invalid GLB v2 header or length')
        document = None
        chunks = 0
        bin_seen = False
        while source.tell() < size:
            chunk = source.read(8)
            if len(chunk) != 8:
                raise ValueError('Truncated chunk header')
            n, kind = struct.unpack('<II', chunk)
            if n % 4 or source.tell() + n > size:
                raise ValueError('Invalid GLB chunk bounds')
            if chunks == 0:
                if kind != 0x4e4f534a or n > 64 * 1024 * 1024:
                    raise ValueError('Missing or oversized first JSON chunk')
                document = json.loads(source.read(n).decode('utf-8'))
            else:
                if kind == 0x4e4f534a:
                    raise ValueError('Duplicate JSON chunk')
                if kind == 0x004e4942:
                    if bin_seen or chunks != 1:
                        raise ValueError('BIN chunk must occur once, immediately after JSON')
                    bin_seen = True
                source.seek(n, 1)
            chunks += 1
        if not document or document.get('asset', {}).get('version') != '2.0':
            raise ValueError('Missing glTF 2.0 asset')
        if not document.get('meshes') or not document.get('scenes'):
            raise ValueError('GLB has no meshes or scenes')
        return {'check': 'container_and_json_only', 'nodes': len(document.get('nodes', [])),
                'meshes': len(document['meshes']), 'full_gltf_validation': 'not_run',
                'visual_acceptance': 'not_run', 'placement_acceptance': 'not_run'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--ifcconvert', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    src, out, exe, report = [p.resolve() for p in (args.input, args.output, args.ifcconvert, args.report)]
    log = report.with_suffix('.log')
    if not src.is_file() or src.suffix.lower() != '.ifc' or not exe.is_file():
        parser.error('Requires an existing IFC file and an installed IfcConvert executable')
    if out.suffix.lower() != '.glb' or report.suffix.lower() != '.json':
        parser.error('output must be .glb; report must be .json')
    if any(p.exists() for p in (out, report, log)) or len({src, out, exe, report, log}) != 5:
        parser.error('Use distinct new output/report/log paths; overwriting is refused')
    out.parent.mkdir(parents=True, exist_ok=True)
    report.parent.mkdir(parents=True, exist_ok=True)
    command = [str(exe), str(src), str(out)]
    result = {'schema_version': 1, 'started_at_utc': datetime.now(timezone.utc).isoformat(),
              'command': command, 'input_sha256': sha256(src), 'tool_sha256': sha256(exe),
              'status': 'failed', 'log': str(log), 'output': str(out),
              'rvt_export_provenance': 'must_be_supplied_separately'}
    try:
        with log.open('xb') as target:
            help_run = subprocess.run([str(exe), '--help'], stdout=target, stderr=subprocess.STDOUT, timeout=30)
            result['help_exit_code'] = help_run.returncode
            target.write(b'\n--- CONVERSION ---\n')
            target.flush()
            completed = subprocess.run(command, stdout=target, stderr=subprocess.STDOUT, timeout=3600)
        result['exit_code'] = completed.returncode
        if completed.returncode != 0:
            raise RuntimeError(f'IfcConvert exited with {completed.returncode}')
        result['validation'] = validate_glb(out)
        result['output_sha256'] = sha256(out)
        if sha256(src) != result['input_sha256']:
            raise RuntimeError('Input changed during conversion')
        result['status'] = 'converted_container_checked'
    except Exception as error:
        result['error'] = str(error)
    result['finished_at_utc'] = datetime.now(timezone.utc).isoformat()
    with report.open('x', encoding='utf-8') as target:
        json.dump(result, target, ensure_ascii=False, indent=2)
        target.write('\n')
    print(json.dumps({'status': result['status'], 'report': str(report)}, ensure_ascii=True))
    return 0 if result['status'] == 'converted_container_checked' else 1


if __name__ == '__main__':
    raise SystemExit(main())
