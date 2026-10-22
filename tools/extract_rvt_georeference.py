"""Extract coordinate records from RVT using rvt-rs, without IFC inputs.

Measured profile: Revit 2021 Element/GeoLocation/GeoSite serialization.
Missing or unsupported records fail closed. CRS/elevation datum are never guessed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
from probe_rvt_coordinates import inflate_members
from rvt_coordinate_records import SchemaGrammar,strip_page_checksums,parse_coordinate_partition,validate_profile


def inflate(raw):
    members = list(inflate_members(strip_page_checksums(raw)))
    if not members or any(error for _,_,error in members):
        raise ValueError('Incomplete compressed stream; coordinates not accepted')
    return b''.join(data for _,data,_ in members)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--module-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Use a new output path')
    sys.path.insert(0,str(args.module_dir.resolve()))
    import rvt
    if rvt.__version__ != '0.6.0':
        raise ValueError('Unverified reader version; requires rvt-rs 0.6.0')
    f = rvt.RevitFile(str(args.source.resolve()))
    if f.version != 2021:
        raise ValueError('Unsupported RVT coordinate profile; requires Revit 2021')
    schema = SchemaGrammar(inflate(f.read_stream('Formats/Latest'))).parse()
    validate_profile(schema,f.version)
    declared = set(f.declared_element_ids())
    partitions = []
    for name in f.stream_names():
        if not name.startswith('Partitions/'):
            continue
        result = parse_coordinate_partition(inflate(f.read_stream(name)),schema,declared)
        if result:
            partitions.append({'stream':name,**result})
    if len(partitions) != 1:
        raise ValueError('Coordinate partition missing or ambiguous')
    with args.source.open('rb') as stream:
        digest = hashlib.file_digest(stream,'sha256').hexdigest()
    result = partitions[0]
    result.update({'schema_version':1,'status':'extracted_crs_not_confirmed',
                   'reader':'rvt-rs','reader_version':rvt.__version__,'revit_version':f.version,
                   'source_sha256':digest,'input_kind':'RVT','ifc_input':False,
                   'source_units':'feet','output_units':'metres','vertical_datum':None,
                   'profile':'revit2021-geolocation-v1','transform_direction':'local_to_shared',
                   'crs':None,'acceptance':'record_extraction_only_not_geographic_acceptance'})
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'status':result['status'],'locations':len(result['locations']),
                      'active_location_id':result['tracking']['active_location_id'],
                      'report':str(args.output)},ensure_ascii=False))


if __name__=='__main__':
    main()
