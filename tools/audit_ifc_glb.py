"""Local IFC/GLB identity and bounds audit; detailed identities stay in a sidecar."""
import argparse
from collections import Counter, defaultdict
import hashlib
import itertools
import json
from pathlib import Path
import struct
import sys


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--ifc', type=Path, required=True)
    p.add_argument('--glb', type=Path, required=True)
    p.add_argument('--module-dir', type=Path, required=True)
    p.add_argument('--report', type=Path, required=True)
    p.add_argument('--sidecar', type=Path, required=True)
    args = p.parse_args()
    if args.report.exists() or args.sidecar.exists():
        p.error('Use new report and sidecar paths')
    sys.path.insert(0, str(args.module_dir.resolve()))
    import numpy as np
    import ifcopenshell
    import ifcopenshell.geom
    import ifcopenshell.util.placement as placement
    import ifcopenshell.util.unit as unit
    f = ifcopenshell.open(str(args.ifc))
    with args.glb.open('rb') as stream:
        magic, version, total = struct.unpack('<4sII', stream.read(12))
        if (magic, version, total) != (b'glTF', 2, args.glb.stat().st_size):
            raise ValueError('Invalid GLB container')
        length, kind = struct.unpack('<II', stream.read(8))
        if kind != 0x4e4f534a or length > 64 * 1024 * 1024:
            raise ValueError('Invalid or oversized GLB JSON')
        g = json.loads(stream.read(length))
    nodes = defaultdict(list)
    bounds = defaultdict(list)
    triangles = 0
    # This conversion used IfcConvert GLB Y-up; express audit bounds as site-local Z-up.
    yup_to_zup = np.array([[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0], [0, 0, 0, 1]])

    def walk(index, parent):
        nonlocal triangles
        node = g['nodes'][index]
        if any(key in node for key in ('translation', 'rotation', 'scale')):
            raise ValueError('TRS nodes require an explicit implementation; do not assume identity')
        local = np.array(node.get('matrix', np.eye(4).flatten(order='F')), dtype=float).reshape(4, 4, order='F')
        world = parent @ local
        if 'mesh' in node:
            name = node.get('name', '')
            nodes[name].append(index)
            for primitive in g['meshes'][node['mesh']]['primitives']:
                accessor = g['accessors'][primitive['attributes']['POSITION']]
                if 'min' not in accessor or 'max' not in accessor:
                    raise ValueError('POSITION bounds missing')
                corners = np.array([(*v, 1) for v in itertools.product(*zip(accessor['min'], accessor['max']))])
                points = (yup_to_zup @ world @ corners.T).T[:, :3]
                bounds[name].append([points.min(axis=0), points.max(axis=0)])
                if primitive.get('mode', 4) == 4:
                    count = g['accessors'][primitive['indices']]['count'] if 'indices' in primitive else accessor['count']
                    triangles += count // 3
        for child in node.get('children', []):
            walk(child, world)

    for index in g['scenes'][g.get('scene', 0)]['nodes']:
        walk(index, np.eye(4))
    merged = {guid: np.array([np.min(np.array(parts)[:, 0], axis=0), np.max(np.array(parts)[:, 1], axis=0)])
              for guid, parts in bounds.items()}
    elements = f.by_type('IfcElement')
    element_map = {e.GlobalId: e for e in elements}
    represented = [e for e in elements if e.Representation and not e.is_a('IfcOpeningElement')]
    missing = [e for e in represented if e.GlobalId not in nodes]
    body_elements = [e for e in represented if any(r.RepresentationIdentifier == 'Body'
                     for r in e.Representation.Representations)]
    scale = unit.calculate_unit_scale(f)
    sites = f.by_type('IfcSite')
    if len(sites) != 1:
        raise ValueError('Site-local audit currently requires exactly one site')
    site_matrix = placement.get_local_placement(sites[0].ObjectPlacement)
    site_matrix[:3, 3] *= scale
    inverse_site = np.linalg.inv(site_matrix)
    sample_results = []
    settings = ifcopenshell.geom.settings()
    for category in ('IfcBeam', 'IfcColumn', 'IfcSlab', 'IfcWall', 'IfcOpeningElement', 'IfcStair'):
        candidates = f.by_type(category)
        if not candidates:
            sample_results.append({'category': category, 'status': 'not_present_in_ifc'})
            continue
        element = next((e for e in candidates if e.GlobalId in merged), candidates[0])
        result = {'category': category, 'guid': element.GlobalId, 'step_id': element.id(), 'tag': element.Tag,
                  'glb_nodes': nodes.get(element.GlobalId, [])}
        try:
            shape = ifcopenshell.geom.create_shape(settings, element)
            vertices = np.array(shape.geometry.verts).reshape(-1, 3)
            matrix = np.array(shape.transformation.matrix).reshape(4, 4, order='F')
            points = (inverse_site @ matrix @ np.c_[vertices, np.ones(len(vertices))].T).T[:, :3]
            box = np.array([points.min(axis=0), points.max(axis=0)])
            result.update(ifc_site_local_bounds_m=box.tolist(), ifc_triangles=len(shape.geometry.faces) // 3)
            if element.GlobalId in merged:
                result.update(glb_site_local_bounds_m=merged[element.GlobalId].tolist(),
                              max_bounds_delta_m=float(np.max(np.abs(box - merged[element.GlobalId]))))
            else:
                result['note'] = 'Openings are subtraction operands and normally have no rendered GLB node'
        except Exception as error:
            result['geometry_error'] = str(error)
        sample_results.append(result)
    all_boxes = np.array(list(merged.values()))
    reps = Counter(r.RepresentationType for e in represented for r in e.Representation.Representations
                   if r.RepresentationIdentifier == 'Body')
    report = {'ifc_sha256': digest(args.ifc), 'glb_sha256': digest(args.glb), 'ifcopenshell_version': ifcopenshell.version,
              'schema': f.schema, 'source_units_to_m': scale, 'element_counts': dict(Counter(e.is_a() for e in elements)),
              'storeys': [{'name': e.Name, 'elevation_m': e.Elevation * scale if e.Elevation is not None else None}
                          for e in f.by_type('IfcBuildingStorey')],
              'body_representation_types': dict(reps), 'represented_nonopening_elements': len(represented),
              'glb_nodes': len(g['nodes']), 'glb_meshes': len(g['meshes']), 'glb_triangles_instanced': triangles,
              'glb_guid_names_matched': len(set(nodes) & set(element_map)),
              'glb_unmatched_names': sorted(set(nodes) - set(element_map))[:10],
              'missing_represented_counts': dict(Counter(e.is_a() for e in missing)),
              'body_element_count': len(body_elements),
              'missing_body_counts': dict(Counter(e.is_a() for e in body_elements if e.GlobalId not in nodes)),
              'missing_represented_samples': [{'guid': e.GlobalId, 'step_id': e.id(), 'tag': e.Tag, 'type': e.is_a()}
                                               for e in missing[:10]],
              'site_local_bounds_zup_m': [all_boxes[:, 0].min(axis=0).tolist(), all_boxes[:, 1].max(axis=0).tolist()],
              'site_local_to_ifc_world_m_row_major': site_matrix.tolist(), 'samples': sample_results,
              'visual_acceptance': 'not_run', 'geographic_acceptance': 'pending',
              'bounds_note': 'Accessor AABBs transformed to site-local Z-up; sample IFC geometry uses 0.8.5, converter 0.9.0post1'}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.sidecar.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    with args.sidecar.open('x', encoding='utf-8') as target:
        for e in elements:
            target.write(json.dumps({'guid': e.GlobalId, 'step_id': e.id(), 'type': e.is_a(), 'name': e.Name,
                                     'revit_tag': e.Tag, 'glb_nodes': nodes.get(e.GlobalId, [])}, ensure_ascii=False) + '\n')
    print(json.dumps({k: report[k] for k in ('glb_guid_names_matched', 'missing_represented_counts',
                                            'glb_triangles_instanced', 'site_local_bounds_zup_m')}, ensure_ascii=True))


if __name__ == '__main__':
    main()
