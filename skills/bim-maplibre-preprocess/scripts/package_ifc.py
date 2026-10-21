"""Convert or reuse a verified GLB, extract IFC attributes, and verify GUID mapping locally."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import struct
import subprocess
import sys

from audit_rvt import sha256


def read_glb_document(path):
    with path.open('rb') as source:
        magic, version, size = struct.unpack('<4sII', source.read(12))
        if (magic, version, size) != (b'glTF', 2, path.stat().st_size):
            raise ValueError('Invalid GLB v2 container')
        length, kind = struct.unpack('<II', source.read(8))
        if kind != 0x4e4f534a or length > min(size - 20, 64 * 1024 * 1024):
            raise ValueError('Invalid or oversized GLB JSON')
        return json.loads(source.read(length))


def build_attributes(model, document, source_hash, glb_hash, element_util, unit_util):
    mapping = {}
    for index, node in enumerate(document.get('nodes', [])):
        if 'mesh' in node:
            mapping.setdefault(node.get('name', ''), []).append(index)
    elements = {}
    for element in model.by_type('IfcElement'):
        guid = element.GlobalId
        if not guid or guid in elements:
            raise ValueError('Missing or duplicate IFC GlobalId')
        container = element_util.get_container(element)
        elements[guid] = {
            'name': element.Name, 'ifc_type': element.is_a(), 'revit_element_id': element.Tag,
            'step_id': element.id(), 'glb_nodes': mapping.get(guid, []),
            'storey': {'guid': container.GlobalId, 'name': container.Name,
                       'ifc_type': container.is_a()} if container else None,
            'materials': sorted({m.Name for m in element_util.get_materials(element) if m.Name}),
            'property_sets': element_util.get_psets(element),
        }
    unknown = sorted(set(mapping) - set(elements))
    matched = sum(len(nodes) for guid, nodes in mapping.items() if guid in elements)
    if unknown or not matched:
        raise ValueError(f'GLB mesh nodes cannot all map to IFC GUIDs: {len(unknown)} unknown names')
    return {'schema_version': 1,
            'source_ifc_sha256': source_hash, 'glb_sha256': glb_hash,
            'ifc_schema': model.schema,
            'source_length_to_m': unit_util.calculate_unit_scale(model),
            'value_units_note': 'Property and quantity values retain IFC source units; not normalized.',
            'elements': elements}, matched


def verify_conversion(record, source_hash, glb_hash):
    if (record.get('status') != 'converted_container_checked'
            or record.get('input_sha256') != source_hash or record.get('output_sha256') != glb_hash):
        raise ValueError('Conversion provenance does not match IFC and GLB; reuse refused')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ifc', type=Path, required=True)
    parser.add_argument('--glb', type=Path, required=True)
    parser.add_argument('--attributes', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--module-dir', type=Path, help='Isolated directory containing ifcopenshell')
    parser.add_argument('--ifcconvert', type=Path, help='Required when generating a new GLB')
    parser.add_argument('--conversion-report', type=Path, required=True,
                        help='Existing matching conversion report for reuse, or new report for conversion')
    parser.add_argument('--tool-arg', action='append', default=[])
    args = parser.parse_args()
    paths = [p.resolve() for p in (args.ifc, args.glb, args.attributes, args.report, args.conversion_report)]
    src, glb, attrs, report, conversion_report = paths
    if len(set(paths)) != len(paths) or attrs.exists() or report.exists():
        parser.error('Use distinct paths and new attribute/report outputs; overwrite refused')
    if not src.is_file() or src.suffix.lower() != '.ifc':
        parser.error('Requires an existing IFC')
    if args.module_dir:
        sys.path.insert(0, str(args.module_dir.resolve()))
    report.parent.mkdir(parents=True, exist_ok=True)
    result = {'schema_version': 1, 'status': 'failed', 'created_at_utc': datetime.now(timezone.utc).isoformat(),
              'ifc': str(src), 'glb': str(glb), 'attributes': str(attrs),
              'geometry_acceptance': 'not_implied_by_attribute_packaging', 'conversion_report': str(conversion_report)}
    try:
        import ifcopenshell
        import ifcopenshell.util.element as element_util
        import ifcopenshell.util.unit as unit_util
        if not glb.exists():
            if not args.ifcconvert or conversion_report.exists():
                raise ValueError('New GLB requires --ifcconvert and a new conversion report')
            command = [sys.executable, str(Path(__file__).with_name('convert_ifc.py')),
                       '--input', str(src), '--output', str(glb), '--ifcconvert', str(args.ifcconvert.resolve()),
                       '--report', str(conversion_report), '--tool-arg=--use-element-guids']
            command += ['--tool-arg=' + arg for arg in args.tool_arg]
            subprocess.run(command, check=True, timeout=3700)
        source_hash, glb_hash = sha256(src), sha256(glb)
        conversion = json.loads(conversion_report.read_text(encoding='utf-8'))
        verify_conversion(conversion, source_hash, glb_hash)
        model = ifcopenshell.open(str(src))
        data, matched = build_attributes(model, read_glb_document(glb), source_hash, glb_hash, element_util, unit_util)
        if sha256(src) != source_hash or sha256(glb) != glb_hash:
            raise ValueError('Input changed during packaging')
        attrs.parent.mkdir(parents=True, exist_ok=True)
        # Serialize before creating the final file; do not leave a success-looking partial JSON.
        encoded = (json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
        temporary = attrs.with_name(attrs.name + '.part')
        with temporary.open('xb') as target:
            target.write(encoded)
        temporary.rename(attrs)
        result.update(status='attributes_packaged_guid_verified', source_ifc_sha256=source_hash,
                      glb_sha256=glb_hash, attributes_sha256=sha256(attrs),
                      ifcopenshell_version=ifcopenshell.version, element_count=len(data['elements']),
                      matched_mesh_nodes=matched, attributes_bytes=len(encoded),
                      element_types=dict(Counter(e['ifc_type'] for e in data['elements'].values())))
    except Exception as error:
        result['error'] = str(error)
    report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: result[key] for key in ('status', 'element_count', 'matched_mesh_nodes', 'error') if key in result}))
    return 0 if result['status'] == 'attributes_packaged_guid_verified' else 1


if __name__ == '__main__':
    raise SystemExit(main())
