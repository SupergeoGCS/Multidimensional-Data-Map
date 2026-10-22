import importlib.util
from pathlib import Path
import struct
import unittest
import math
import json

path = Path(__file__).resolve().parents[1] / 'tools' / 'rvt_coordinate_records.py'
spec = importlib.util.spec_from_file_location('coordinate_records', path)
records = importlib.util.module_from_spec(spec)
spec.loader.exec_module(records)


def definition(name, base=0, fields=b'', count=0):
    encoded = name.encode('ascii')
    return (struct.pack('<H', len(encoded))+encoded+struct.pack('<HII',base,1,count)+
            fields+struct.pack('<I',0))


class CoordinateRecordTests(unittest.TestCase):
    def test_page_boundaries_do_not_enter_the_compressed_payload(self):
        data = b'a'*records.PAYLOAD_BYTES+b'x'*(records.PAGE_BYTES-records.PAYLOAD_BYTES)+b'tail'
        self.assertEqual(records.strip_page_checksums(data), b'a'*records.PAYLOAD_BYTES+b'tail')
        self.assertEqual(records.strip_page_checksums(b'tiny'), b'tiny')

    def test_schema_tags_count_inline_base_definitions(self):
        base = b'\0\0'+definition('Base')
        child = struct.pack('<H',5)+b'Child'+struct.pack('<H',0x800d)+base+struct.pack('<III',1,0,0)
        data = b'\0\0'+child+b'\0\0'+definition('Next',12)
        parsed = records.SchemaGrammar(data).parse()
        self.assertEqual(parsed['Child']['tag'],12)
        self.assertEqual(parsed['Base']['tag'],13)
        self.assertEqual(parsed['Child']['base'],13)
        self.assertEqual(parsed['Next']['tag'],14)

    def test_corrupt_schema_fails_closed(self):
        with self.assertRaises(ValueError):
            records.SchemaGrammar(b'\x01\0'+definition('Base')).parse()
        with self.assertRaises(ValueError):
            records.SchemaGrammar(b'\0\0'+definition('Base')[:-2]).parse()

    def test_unknown_schema_profile_is_rejected(self):
        with self.assertRaises(ValueError):
            records.validate_profile({},2021)

    def test_rigid_inverse_and_invalid_transforms(self):
        c,s = math.cos(.4),math.sin(.4)
        source = [c,s,0,-s,c,0,0,0,1,-100000,-200000,5]
        matrix = records.invert_transform(source)
        self.assertAlmostEqual(matrix[0][3],(c*100000-s*200000)*.3048)
        self.assertAlmostEqual(matrix[1][3],(s*100000+c*200000)*.3048)
        self.assertAlmostEqual(matrix[2][3],-1.524)
        for bad in [[0]*12,[float('nan')]*12,[-1,0,0,0,1,0,0,0,1,0,0,0]]:
            with self.assertRaises(ValueError):
                records.invert_transform(bad)

    def test_record_graph_reads_raw_locations_and_resolves_active_site(self):
        schema,data,ids = coordinate_fixture()
        result = records.parse_coordinate_partition(data,schema,ids)
        self.assertEqual(result['tracking']['active_location_id'],10)
        self.assertEqual(result['tracking']['project_location_id'],11)
        self.assertEqual([p['id'] for p in result['locations']],[10,11])
        self.assertEqual(result['locations'][0]['name'],'外部位置')
        self.assertEqual(result['locations'][0]['site_id'],20)
        self.assertAlmostEqual(result['locations'][0]['local_to_shared_m_row_major'][2][3],-1.524)
        self.assertEqual(result['sites'][0]['coordinate_system_raw'],'')
        self.assertAlmostEqual(result['sites'][0]['latitude'],math.degrees(.5))

    def test_missing_body_and_ambiguous_active_tracking_fail_closed(self):
        schema,data,ids = coordinate_fixture()
        with self.assertRaises(ValueError):
            records.parse_coordinate_partition(data.replace(struct.pack('<II',1,10),b'BROKEN!!'),schema,ids)
        tracker = make_header(31,'ActiveGeoLocationTrackingElement',schema,[])
        with self.assertRaises(ValueError):
            records.parse_coordinate_partition(data+tracker,schema,ids|{31})


def string16(value):
    return struct.pack('<I',len(value))+value.encode('utf-16le')


def make_header(eid,kind,schema,refs):
    value = bytearray(120)
    struct.pack_into('<IIH',value,0,eid,108,schema['ElementHeader']['tag'])
    struct.pack_into('<H',value,46,schema[kind]['tag'])
    struct.pack_into('<I',value,58,len(refs))
    for i,ref in enumerate(refs):
        struct.pack_into('<I',value,62+i*4,ref)
    return bytes(value)


def coordinate_fixture():
    schema = {name:{'tag':i+100} for i,name in enumerate([
        'ElementHeader','GeoLocation','GeoSite','ActiveGeoLocationTrackingElement','InstanceInfo','SymbolInfo'])}
    ids = {10,11,20,30}
    base = lambda eid:struct.pack('<II',1,eid)+b'\xff'*28+b'\0'*3
    frame = b'\0'*4+b'\xff'*4+b'\0\x01\0\0\0'+b'\xff'*4+b'\0'*12
    location = lambda eid,name: (base(eid)+b'\xff'*4+struct.pack('<H',schema['InstanceInfo']['tag'])+b'\0'*4+
                 string16(name)+frame+struct.pack('<12d',1,0,0,0,1,0,0,0,1,-100000,-200000,5)+struct.pack('<I',20))
    site = (base(20)+b'\xff'*4+struct.pack('<H',schema['SymbolInfo']['tag'])+b'\xff'*8+
            struct.pack('<6d',.5,1,8,0,10,1)+b'\0'*28+string16('')+string16('測試'))
    headers = b''.join([make_header(10,'GeoLocation',schema,[20,10]),
                        make_header(11,'GeoLocation',schema,[20,11]),
                        make_header(20,'GeoSite',schema,[]),
                        make_header(30,'ActiveGeoLocationTrackingElement',schema,[])])
    return schema,headers+location(10,'外部位置')+location(11,'專案')+site+base(30)+struct.pack('<II',10,11),ids


if __name__ == '__main__':
    unittest.main()
