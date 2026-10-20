"""Read-only CFB metadata inventory. Standard library only; no RVT geometry decoding."""
import argparse
import hashlib
import json
import re
import struct
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(4 * 1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


class CFB:
    def __init__(self, path):
        self.f = path.open('rb')
        try:
            self.length = path.stat().st_size
            h = self.f.read(512)
            if h[:8] != bytes.fromhex('d0cf11e0a1b11ae1'):
                raise ValueError('Not a CFB container')
            self.u = lambda b, o: struct.unpack_from('<I', b, o)[0]
            self.ss = 1 << struct.unpack_from('<H', h, 30)[0]
            self.ms = 1 << struct.unpack_from('<H', h, 32)[0]
            if self.ss not in (512, 4096) or self.ms != 64:
                raise ValueError('Unsupported CFB sector size')
            dif = list(struct.unpack_from('<109I', h, 76))
            di = self.u(h, 68)
            seen = set()
            for _ in range(self.u(h, 72)):
                if di in seen:
                    raise ValueError('Cyclic DIFAT')
                seen.add(di)
                block = self.sector(di)
                dif.extend(struct.unpack('<' + 'I' * (self.ss // 4 - 1), block[:-4]))
                di = self.u(block, self.ss - 4)
            self.fat = []
            fat_sectors = [i for i in dif if i < 0xfffffffa][:self.u(h, 44)]
            if len(fat_sectors) != self.u(h, 44):
                raise ValueError('Incomplete FAT')
            for i in fat_sectors:
                self.fat.extend(struct.unpack('<' + 'I' * (self.ss // 4), self.sector(i)))
            directory = b''.join(self.sector(i) for i in self.chain(self.u(h, 48), self.fat))
            self.entries = {}
            for offset in range(0, len(directory), 128):
                e = directory[offset:offset + 128]
                n = struct.unpack_from('<H', e, 64)[0]
                if e[66] in (2, 5) and 2 <= n <= 64:
                    name = e[:n - 2].decode('utf-16-le')
                    self.entries.setdefault(name, (e[66], self.u(e, 116), struct.unpack_from('<Q', e, 120)[0]))
            root = next(v for v in self.entries.values() if v[0] == 5)
            self.mini = b''.join(self.sector(i) for i in self.chain(root[1], self.fat))[:root[2]]
            mf = b''.join(self.sector(i) for i in self.chain(self.u(h, 60), self.fat))
            self.mft = list(struct.unpack('<' + 'I' * (len(mf) // 4), mf))
            self.cutoff = self.u(h, 56)
        except Exception:
            self.f.close()
            raise

    def sector(self, index):
        offset = (index + 1) * self.ss
        if index >= 0xfffffffa or offset + self.ss > self.length:
            raise ValueError('Sector outside file')
        self.f.seek(offset)
        return self.f.read(self.ss)

    @staticmethod
    def chain(index, table):
        seen = set()
        while index < 0xfffffffa:
            if index in seen or index >= len(table):
                raise ValueError('Invalid or cyclic sector chain')
            seen.add(index)
            yield index
            index = table[index]
        if index != 0xfffffffe:
            raise ValueError('Invalid chain terminator')

    def stream(self, name):
        _, start, size = self.entries[name]
        if size > 32 * 1024 * 1024:
            raise ValueError('Metadata stream exceeds 32 MiB inspection limit')
        if not size:
            return b''
        if size < self.cutoff:
            data = b''.join(self.mini[i * self.ms:(i + 1) * self.ms] for i in self.chain(start, self.mft))
        else:
            data = b''.join(self.sector(i) for i in self.chain(start, self.fat))
        if len(data) < size:
            raise ValueError('Truncated stream')
        return data[:size]


def inspect(path):
    before = path.stat()
    result = {'path': str(path.resolve()), 'name': path.name, 'bytes': before.st_size,
              'sha256': sha256(path), 'geometry_verified': False}
    cfb = None
    try:
        cfb = CFB(path)
        basic = cfb.stream('BasicFileInfo')
        # Binary length prefixes can change byte parity. Search UTF-16 bytes,
        # rather than decoding the whole mixed binary/text stream at one offset.
        year = re.search(rb'\x04\x00\x00\x002\x000\x00[0-9]\x00[0-9]\x00', basic)
        result['revit_format'] = year.group()[-8:].decode('utf-16-le') if year else None
        build = re.search(rb'(?:[0-9]\x00){8}_\x00(?:[0-9]\x00){4}\(\x00x\x006\x004\x00\)\x00', basic)
        result['build'] = build.group().decode('utf-16-le') if build else None
        result['external_references'] = []
        if 'TransmissionData' in cfb.entries:
            raw = cfb.stream('TransmissionData')
            marker = '<?xml'.encode('utf-16-le')
            closing = '</TransmissionData>'.encode('utf-16-le')
            start, end = raw.find(marker), raw.find(closing)
            if start < 0 or end < start:
                raise ValueError('TransmissionData XML not found')
            xml = raw[start:end + len(closing)].decode('utf-16-le')
            if '<!DOCTYPE' in xml.upper() or '<!ENTITY' in xml.upper():
                raise ValueError('Unexpected XML declaration')
            root = ET.fromstring(xml)
            for item in root.findall('ExternalFileReference'):
                result['external_references'].append({
                    'element_id': item.findtext('ElementId'),
                    'type': item.findtext('ExternalFileReferenceType'),
                    'last_saved_path': item.findtext('LastSavedPath'),
                    'last_saved_absolute_path': item.findtext('LastSavedAbsolutePath'),
                    'last_saved_load_state': item.findtext('LastSavedLoadState'),
                    'current_availability': 'not_verified',
                })
        result['container_metadata_status'] = 'readable'
    except Exception as error:
        result['container_metadata_status'] = 'inspection_failed'
        result['error'] = str(error)
    finally:
        if cfb:
            cfb.f.close()
    after = path.stat()
    result['source_stable_during_audit'] = (before.st_size, before.st_mtime_ns) == (after.st_size, after.st_mtime_ns)
    if not result['source_stable_during_audit']:
        result['container_metadata_status'] = 'inspection_failed'
        result['error'] = 'Source changed during audit; hash and metadata may not match'
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if not args.source.is_dir():
        parser.error('source must be a directory')
    paths = sorted(p for p in args.source.rglob('*') if p.is_file() and p.suffix.lower() == '.rvt')
    if not paths:
        parser.error('no RVT files found')
    if args.output.exists():
        parser.error('output exists; use a new report path')
    files = [inspect(p) for p in paths]
    report = {'schema_version': 1, 'audited_at_utc': datetime.now(timezone.utc).isoformat(),
              'source_root': str(args.source.resolve()), 'total_bytes': sum(f['bytes'] for f in files),
              'limitations': 'CFB metadata only; not a Revit open, geometry, placement or performance test.', 'files': files}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x', encoding='utf-8') as target:
        json.dump(report, target, ensure_ascii=False, indent=2)
        target.write('\n')
    for f in files:
        counts = Counter(x['last_saved_load_state'] for x in f.get('external_references', []))
        print(f"{f['name']}: {f.get('revit_format')} / {f.get('build')}; {f['container_metadata_status']}; links={dict(counts)}")
    return 0 if all(f['container_metadata_status'] == 'readable' for f in files) else 1


if __name__ == '__main__':
    raise SystemExit(main())
