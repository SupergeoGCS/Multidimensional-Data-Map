"""Export a validated RVT record as an explicitly assumed-CRS map candidate."""
import argparse
import copy
import hashlib
import json
from pathlib import Path


def build_candidate(extracted,validation,report_hash,location_id,assume_crs,allow_non_active=False):
    if extracted.get('input_kind') != 'RVT' or extracted.get('ifc_input') is not False:
        raise ValueError('Candidate must originate from independent RVT extraction')
    if validation.get('extracted_report_sha256') != report_hash:
        raise ValueError('Validation does not match this extracted report')
    if location_id not in validation.get('matched_location_ids',[]):
        raise ValueError('Selected RVT location did not match the IFC reference')
    if location_id != extracted['tracking']['active_location_id'] and not allow_non_active:
        raise ValueError('Non-active location requires explicit selection acknowledgement')
    if assume_crs not in ('EPSG:3826','EPSG:3825'):
        raise ValueError('Unsupported CRS assumption')
    selected = next(p for p in extracted['locations'] if p['id']==location_id)
    return {'source_kind':'RVT','reader':extracted['reader'],'reader_version':extracted['reader_version'],
            'source_rvt_sha256':extracted['source_sha256'],'extracted_report_sha256':report_hash,
            'validation_ifc_sha256':validation['reference_ifc_sha256'],
            'selected_location_id':location_id,'selected_location_name':selected['name'],
            'active_location_id':extracted['tracking']['active_location_id'],
            'active_location_matches_selected':location_id==extracted['tracking']['active_location_id'],
            'source_crs':extracted['crs'],'crs_assumption':assume_crs,'vertical_datum':None,
            'geographic_acceptance':False,
            'local_to_shared_m_row_major':copy.deepcopy(selected['local_to_shared_m_row_major'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--extracted',type=Path,required=True)
    parser.add_argument('--validation',type=Path,required=True)
    parser.add_argument('--location-id',type=int,required=True)
    parser.add_argument('--assume-crs',required=True)
    parser.add_argument('--allow-non-active',action='store_true')
    parser.add_argument('--output',type=Path,required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Use a new output path')
    content = args.extracted.read_bytes()
    result = build_candidate(json.loads(content),json.loads(args.validation.read_text(encoding='utf-8')),
                             hashlib.sha256(content).hexdigest(),args.location_id,args.assume_crs,args.allow_non_active)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text('export const RVT_STR_PLACEMENT = '+json.dumps(result,ensure_ascii=False,indent=2,allow_nan=False)+';\n',encoding='utf-8')
    print(json.dumps({'source':'RVT','location_id':args.location_id,'crs_assumption':args.assume_crs,
                      'active_location_matches_selected':result['active_location_matches_selected']},ensure_ascii=False))


if __name__=='__main__':
    main()
