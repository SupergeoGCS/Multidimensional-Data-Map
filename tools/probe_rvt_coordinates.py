"""Bounded, read-only RVT coordinate research. Never accepts a location automatically.

This scans serialized upright transforms without using IFC values as search keys.
Candidates lack active-site/record identity, so they must not be used as accepted
georeferencing. The raw source RVT is never changed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import zlib
from rvt_coordinate_records import strip_page_checksums

LIMIT = 64 * 1024 * 1024


def upright_transforms(data, np):
    """Find row-major rigid Z rotations with adjacent large survey origins."""
    results = []
    with np.errstate(all='ignore'):
        for alignment in range(8):
            count = (len(data) - alignment) // 8
            if count < 12:
                continue
            values = np.frombuffer(data, dtype='<f8', count=count, offset=alignment)
            n = len(values) - 11
            v = lambda i: values[i:i+n]
            near = lambda a, b: np.abs(a - b) < 1e-9
            mask = (near(v(0), v(4)) & near(v(1), -v(3)) &
                    near(v(0)**2 + v(1)**2, 1) &
                    near(v(2), 0) & near(v(5), 0) &
                    near(v(6), 0) & near(v(7), 0) & near(v(8), 1))
            # Reject ordinary instance transforms before entering Python loops.
            # Most model transforms have small origins or zero translations.
            large = lambda a: np.isfinite(a) & (np.abs(a) > 10000) & (np.abs(a) < 1e9)
            after = mask & large(v(9)) & large(v(10)) & np.isfinite(v(11)) & (np.abs(v(11)) < 100000)
            before = mask.copy()
            before[:3] = False
            if n > 3:
                before[3:] &= (large(values[:n-3]) & large(values[1:n-2]) &
                               np.isfinite(values[2:n-1]) & (np.abs(values[2:n-1]) < 100000))
            for index in np.flatnonzero(after | before):
                layouts = []
                if after[index]:
                    layouts.append((index+9, 'rotation_then_origin'))
                if before[index]:
                    layouts.append((index-3, 'origin_then_rotation'))
                for origin_at, layout in layouts:
                    if origin_at < 0 or origin_at+3 > len(values):
                        continue
                    origin = values[origin_at:origin_at+3]
                    if not (np.isfinite(origin).all() and
                            10000 < abs(origin[0]) < 1e9 and
                            10000 < abs(origin[1]) < 1e9 and abs(origin[2]) < 100000):
                        continue
                    results.append({'rotation_offset':alignment+int(index)*8,
                                    'origin_offset':alignment+int(origin_at)*8,
                                    'layout':layout,
                                    'rotation_rows':values[index:index+9].reshape(3,3).tolist(),
                                    'origin_source_units':origin.tolist(),
                                    'origin_if_feet_m':(origin*.3048).tolist()})
                    if len(results) > 1000:
                        raise ValueError('Too many candidates; refusing unbounded output')
    return results


def inflate_members(raw):
    """Recover bounded raw-DEFLATE gzip members; report failures explicitly."""
    at = 0
    while True:
        start = raw.find(b'\x1f\x8b\x08', at)
        if start < 0:
            break
        at = start + 3
        if start+10 > len(raw) or raw[start+3] != 0:
            continue
        decoder = zlib.decompressobj(-15)
        try:
            output = bytearray()
            pos = start+10
            while pos < len(raw) and not decoder.eof and len(output) <= LIMIT:
                end = min(pos+65536, len(raw))
                output.extend(decoder.decompress(memoryview(raw)[pos:end], LIMIT+1-len(output)))
                pos = end-len(decoder.unused_data)
                if decoder.unconsumed_tail:
                    break
            if len(output) > LIMIT or not decoder.eof:
                yield start, None, 'inflate_limit_or_truncated'
            else:
                yield start, bytes(output), None
                at = pos
        except zlib.error as error:
            yield start, None, str(error)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--rvt-module-dir', type=Path, required=True)
    parser.add_argument('--numpy-module-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--stream', action='append', help='Limit to named streams')
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Use a new output path')
    sys.path[:0] = [str(args.rvt_module_dir.resolve()), str(args.numpy_module_dir.resolve())]
    import numpy as np
    import rvt
    model = rvt.RevitFile(str(args.source.resolve()))
    with args.source.open('rb') as stream:
        source_hash = hashlib.file_digest(stream, 'sha256').hexdigest()
    report = {'status':'research_only_not_accepted', 'reader_version':rvt.__version__,
              'source_sha256':source_hash,
              'ifc_input':False, 'crs':None, 'active_site':None,
              'streams':[], 'candidates':[], 'errors':[]}
    for name in model.stream_names():
        if not (name.startswith('Partitions/') or name == 'Global/Latest'):
            continue
        if args.stream and name not in args.stream:
            continue
        stored = model.read_stream(name)
        raw = strip_page_checksums(stored)
        summary = {'name':name, 'stored_bytes':len(stored), 'inflated_bytes':0, 'page_checksums_removed':True}
        for offset, data, error in inflate_members(raw):
            if error:
                report['errors'].append({'stream':name, 'gzip_offset':offset, 'error':error})
                continue
            summary['inflated_bytes'] += len(data)
            for candidate in upright_transforms(data, np):
                report['candidates'].append({'stream':name, 'gzip_offset':offset, **candidate})
        report['streams'].append(summary)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'status':report['status'], 'streams':len(report['streams']),
                      'candidates':len(report['candidates']), 'inflate_errors':len(report['errors']),
                      'report':str(args.output)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
