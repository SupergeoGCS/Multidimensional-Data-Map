"""Validate an independently extracted RVT report against a native IFC export.

This is a separate process: IFC data is never fed back into the RVT extractor.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys


def compare(extracted, expected, tolerance=.001):
    rows = []
    active = extracted['tracking']['active_location_id']
    for location in extracted['locations']:
        actual = location['local_to_shared_m_row_major']
        delta = [actual[i][3]-expected[i][3] for i in range(3)]
        translation = math.sqrt(sum(v*v for v in delta))
        rotation = max(abs(actual[i][j]-expected[i][j]) for i in range(3) for j in range(3))
        rows.append({'id':location['id'],'name':location['name'],'active':location['id']==active,
                     'translation_delta_m':delta,'translation_error_m':translation,
                     'rotation_matrix_max_error':rotation,'matches':translation<=tolerance and rotation<=1e-8})
    matched = [r['id'] for r in rows if r['matches']]
    status = ('matched_active_location' if active in matched else
              'matched_named_location_active_differs' if matched else 'no_matching_location')
    return {'status':status,'tolerance_m':tolerance,'matched_location_ids':matched,
            'active_location_matches':active in matched,'locations':rows,
            'crs_validated':False,'geographic_acceptance':False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--extracted',type=Path,required=True)
    parser.add_argument('--ifc',type=Path,required=True)
    parser.add_argument('--module-dir',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Use a new output path')
    sys.path.insert(0,str(args.module_dir.resolve()))
    import ifcopenshell
    from ifcopenshell.util.placement import get_local_placement
    from ifcopenshell.util.unit import calculate_unit_scale
    model = ifcopenshell.open(str(args.ifc.resolve()))
    sites = model.by_type('IfcSite')
    if len(sites) != 1:
        raise ValueError('IFC validation requires exactly one reference site')
    expected = get_local_placement(sites[0].ObjectPlacement).tolist()
    scale = calculate_unit_scale(model)
    for i in range(3):
        expected[i][3] *= scale
    result = compare(json.loads(args.extracted.read_text(encoding='utf-8')),expected)
    with args.ifc.open('rb') as stream:
        result['reference_ifc_sha256'] = hashlib.file_digest(stream,'sha256').hexdigest()
    with args.extracted.open('rb') as stream:
        result['extracted_report_sha256'] = hashlib.file_digest(stream,'sha256').hexdigest()
    result['reference_matrix_m_row_major'] = expected
    result['ifcopenshell_version'] = ifcopenshell.version
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:result[k] for k in ['status','matched_location_ids','active_location_matches']},ensure_ascii=False))
    if not result['matched_location_ids']:
        raise SystemExit(2)


if __name__=='__main__':
    main()
