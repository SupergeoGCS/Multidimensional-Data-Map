"""Validate the exact user-authorized STR web delivery package."""
import hashlib
import json
from pathlib import Path
import struct

ASSET_NAMES = {'str.glb', 'native-str.glb', 'native-str.attributes.json', 'preview.png'}


def glb_document(path):
    with Path(path).open('rb') as stream:
        magic, version, length = struct.unpack('<4sII', stream.read(12))
        if magic != b'glTF' or version != 2 or length != Path(path).stat().st_size:
            raise ValueError('Invalid GLB header: ' + path.name)
        size, kind = struct.unpack('<II', stream.read(8))
        if kind != 0x4E4F534A or size > length - 20:
            raise ValueError('Invalid GLB JSON chunk: ' + path.name)
        return json.loads(stream.read(size))


def verify_assets(directory):
    directory = Path(directory)
    manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
    if manifest.get('schema_version') != 1 or set(manifest.get('files', {})) != ASSET_NAMES:
        raise ValueError('Publication manifest must contain exactly the approved STR files')
    for name, record in manifest['files'].items():
        path = directory / name
        if path.is_symlink() or not path.is_file() or path.stat().st_size != record['bytes']:
            raise ValueError('Missing or changed publication asset: ' + name)
        with path.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        if digest != record['sha256']:
            raise ValueError('Publication asset SHA-256 mismatch: ' + name)
    attributes = json.loads((directory / 'native-str.attributes.json').read_text(encoding='utf-8'))
    if attributes.get('schema_version') != 1 or attributes.get('glb_sha256') != manifest['files']['native-str.glb']['sha256']:
        raise ValueError('Native STR attributes do not match the published GLB')
    elements = attributes.get('elements')
    if not isinstance(elements, dict) or not elements:
        raise ValueError('Native STR element properties are missing')
    native = glb_document(directory / 'native-str.glb')
    mesh_nodes = [node for node in native.get('nodes', []) if 'mesh' in node]
    if not mesh_nodes or any(node.get('name') not in elements for node in mesh_nodes):
        raise ValueError('Native STR geometry GUIDs do not match the attributes')
    glb_document(directory / 'str.glb')
    return {'asset_bytes': sum(record['bytes'] for record in manifest['files'].values()),
            'native_mesh_nodes': len(mesh_nodes), 'elements': len(elements)}
