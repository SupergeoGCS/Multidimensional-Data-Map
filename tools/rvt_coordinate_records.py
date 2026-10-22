"""RVT schema/stream primitives for independent coordinate extraction.

Format grammar follows rvt-rs v0.6.0 src/formats.rs and compression.rs
(DrunkOnJava/rvt-rs, Apache-2.0). No IFC information is used here.
"""
import struct
import math

PAGE_BYTES = 65249
PAYLOAD_BYTES = 64896


def strip_page_checksums(data):
    full = len(data)//PAGE_BYTES
    return b''.join(data[i*PAGE_BYTES:i*PAGE_BYTES+PAYLOAD_BYTES]
                    for i in range(full))+data[full*PAGE_BYTES:]


def validate_profile(schema, version):
    expected = {'Element':21,'ElementHeader':24,'GeoLocation':3,'GeoSite':11,
                'Instance':2,'InstanceInfo':2,'InstInfoBase':1,
                'ActiveGeoLocationTrackingElement':1}
    if version != 2021 or any(schema.get(name,{}).get('version') != value
                              for name,value in expected.items()):
        raise ValueError('Unsupported coordinate schema profile')


class SchemaGrammar:
    def __init__(self, data):
        self.data = data
        self.next_tag = 12
        self.classes = {}

    def integer(self, at, size):
        if at < 0 or at+size > len(self.data):
            raise ValueError(f'Schema truncated at {at}')
        return int.from_bytes(self.data[at:at+size], 'little')

    def name(self, at, width):
        size = self.integer(at, width)
        end = at+width+size
        raw = self.data[at+width:end]
        if not 1 <= size <= 250 or len(raw) != size or not all(32 <= b < 127 for b in raw):
            raise ValueError(f'Invalid schema name at {at}')
        return raw.decode('ascii'), end

    def inline(self, at, reference, depth):
        if self.integer(at, 2) != 0:
            raise ValueError(f'Invalid inline separator at {at}')
        tag, end = self.definition(at+2, depth+1)
        if tag != reference & 0x7fff:
            raise ValueError(f'Inline reference mismatch at {at}')
        return tag, end

    def reference(self, at, depth):
        reference = self.integer(at, 2)
        if reference & 0x8000:
            return self.inline(at+2, reference, depth)
        return reference, at+2

    def field_type(self, at, depth):
        if depth > 64:
            raise ValueError('Schema nesting limit')
        word = self.integer(at, 4)
        kind, modifier = word & 255, (word >> 8) & 255
        at += 4
        if modifier & 0xf0 not in (0, 0x10, 0x50, 0x60):
            raise ValueError('Unknown schema modifier')
        if modifier & 0xf0 == 0x10:
            if self.integer(at, 4) > 65536:
                raise ValueError('Schema array limit')
            at += 4
        if kind == 13:
            if self.data[at:at+5] != b'\x01\0\0\0\x20':
                raise ValueError('Invalid schema array filler')
            inner, end = self.field_type(at+5, depth+1)
            if inner:
                _, end = self.reference(end, depth)
            return inner, end
        if kind == 14 and modifier & 15 == 0:
            _, end = self.reference(at, depth)
            return True, end
        return False, at

    def definition(self, at, depth):
        if depth > 64 or self.next_tag >= 0x8000:
            raise ValueError('Schema nesting/tag limit')
        name, pos = self.name(at, 2)
        tag = self.next_tag
        self.next_tag += 1
        reference = self.integer(pos, 2)
        pos += 2
        base = reference or None
        if reference & 0x8000:
            base, pos = self.inline(pos, reference, depth)
        version, count = self.integer(pos, 4), self.integer(pos+4, 4)
        pos += 8
        if count > 2000:
            raise ValueError('Schema field limit')
        fields = []
        for _ in range(count):
            field, pos = self.name(pos, 4)
            start = pos
            _, pos = self.field_type(pos, depth)
            fields.append({'name':field, 'type_bytes':self.data[start:pos].hex()})
        guids = self.integer(pos, 4)
        pos += 4+16*guids
        if guids > 60000 or pos > len(self.data):
            raise ValueError('Invalid schema GUID count')
        self.classes[name] = {'tag':tag, 'base':base, 'version':version, 'fields':fields}
        return tag, pos

    def parse(self):
        at = 0
        while at < len(self.data):
            if not any(self.data[at:]):
                break
            if self.integer(at, 2) != 0:
                raise ValueError(f'Invalid schema record separator at {at}')
            _, at = self.definition(at+2, 0)
        return self.classes


def text16(data, at):
    if at+4 > len(data):
        raise ValueError('Missing UTF16 length')
    count = struct.unpack_from('<I', data, at)[0]
    end = at+4+count*2
    if count > 1024 or end > len(data):
        raise ValueError('UTF16 length limit')
    return data[at+4:end].decode('utf-16le'), end


def invert_transform(values):
    if len(values) != 12 or not all(math.isfinite(v) for v in values):
        raise ValueError('Invalid transform')
    r = [values[i:i+3] for i in (0,3,6)]
    for a in range(3):
        for b in range(3):
            if abs(sum(r[a][k]*r[b][k] for k in range(3))-(a == b)) > 1e-8:
                raise ValueError('Non-rigid transform')
    determinant = (r[0][0]*(r[1][1]*r[2][2]-r[1][2]*r[2][1])-
                   r[0][1]*(r[1][0]*r[2][2]-r[1][2]*r[2][0])+
                   r[0][2]*(r[1][0]*r[2][1]-r[1][1]*r[2][0]))
    if abs(determinant-1) > 1e-8:
        raise ValueError('Reflected transform')
    t = values[9:12]
    return [[r[j][i] for j in range(3)]+[-sum(r[j][i]*t[j] for j in range(3))*.3048]
            for i in range(3)]+[[0,0,0,1]]


def coordinate_headers(data, schema, declared):
    wanted = {'GeoLocation','GeoSite','BasePoint','ActiveGeoLocationTrackingElement'}
    names = {v['tag']:k for k,v in schema.items() if k in wanted}
    marker = struct.pack('<H', schema['ElementHeader']['tag'])+b'\0'*4
    at = 0
    result = []
    while True:
        found = data.find(marker, at)
        if found < 0:
            return result
        at = found+2
        if found < 8 or found+40 > len(data):
            continue
        eid, size = struct.unpack_from('<II', data, found-8)
        tag = struct.unpack_from('<H', data, found+38)[0]
        if eid in declared and tag in names and 50 <= size <= 4096:
            item = {'id':eid,'class':names[tag],'header_offset':found-8}
            if names[tag] == 'GeoLocation':
                start = found-8
                count = struct.unpack_from('<I',data,start+58)[0]
                if count > 64 or start+62+count*4 > start+size+12:
                    raise ValueError('GeoLocation header reference list invalid')
                item['references'] = list(struct.unpack_from(f'<{count}I',data,start+62))
            result.append(item)


def unique_body(data, eid, declared, expected=None):
    # Revit 2021 Element body: doc access + ID, seven ElementId references,
    # three boolean flags. Only this measured profile is accepted.
    prefix = struct.pack('<II',1,eid)
    at, matches = 0, []
    while True:
        pos = data.find(prefix, at)
        if pos < 0:
            break
        at = pos+len(prefix)
        if pos+47 > len(data) or any(v not in (0,1) for v in data[pos+36:pos+39]):
            continue
        references = struct.unpack_from('<7I',data,pos+8)
        if any(v not in (0,0xffffffff) and v not in declared for v in references):
            continue
        if expected and not data.startswith(expected,pos+39):
            continue
        matches.append(pos)
    if len(matches) != 1:
        raise ValueError(f'Missing/ambiguous Element body {eid}')
    return matches[0]


def parse_coordinate_partition(data, schema, declared):
    headers = coordinate_headers(data, schema, declared)
    locations, sites, tracking = {}, {}, []
    tracking_headers = [h for h in headers if h['class']=='ActiveGeoLocationTrackingElement']
    if not tracking_headers:
        return None
    if len(tracking_headers) != 1:
        raise ValueError('Active location tracking is ambiguous')
    tracker = tracking_headers[0]
    at = unique_body(data,tracker['id'],declared)
    active_id, project_id = struct.unpack_from('<II',data,at+39)
    roots = [h for h in headers if h['id'] in (active_id,project_id) and h['class']=='GeoLocation']
    if len(roots) != 2 or any(not h.get('references') for h in roots):
        raise ValueError('Active/project location headers unresolved')
    site_ids = {h['references'][0] for h in roots}
    relevant = [h for h in headers if h['class']=='ActiveGeoLocationTrackingElement' or
                (h['class']=='GeoLocation' and h['references'] and h['references'][0] in site_ids) or
                (h['class']=='GeoSite' and h['id'] in site_ids)]
    for header in relevant:
        kind, eid = header['class'], header['id']
        if kind == 'BasePoint':
            continue
        expected = None
        if kind in ('GeoSite','GeoLocation'):
            expected = b'\xff'*4+struct.pack('<H',schema['SymbolInfo' if kind=='GeoSite' else 'InstanceInfo']['tag'])
        pos = unique_body(data, eid, declared, expected)
        evidence = {**header,'body_offset':pos}
        if kind == 'ActiveGeoLocationTrackingElement':
            active, project = struct.unpack_from('<II', data, pos+39)
            tracking.append({**evidence,'active_location_id':active,'project_location_id':project})
        elif kind == 'GeoLocation':
            tag = schema['InstanceInfo']['tag']
            if data[pos+39:pos+49] != b'\xff'*4+struct.pack('<H',tag)+b'\0'*4:
                raise ValueError(f'Unsupported InstanceInfo frame {eid}')
            name, end = text16(data, pos+49)
            frame = b'\xff'*8+b'\0\x01\0\0\0'+b'\xff'*4+b'\0'*12
            flag = data[end:end+4]
            if flag not in (b'\0'*4,b'\xff'*4) or data[end+4:end+29] != frame[4:]:
                raise ValueError(f'Unsupported transform frame {eid}')
            values = list(struct.unpack_from('<12d', data, end+29))
            site_id = struct.unpack_from('<I', data, end+125)[0]
            locations[eid] = {**evidence,'name':name,'site_id':site_id,
                              'transform_frame_flag_raw':flag.hex(),
                              'transform_offset':end+29,'serialized_transform':values,
                              'local_to_shared_m_row_major':invert_transform(values)}
        else:
            tag = schema['SymbolInfo']['tag']
            if data[pos+39:pos+45] != b'\xff'*4+struct.pack('<H',tag):
                raise ValueError(f'Unsupported SymbolInfo frame {eid}')
            latitude, longitude, timezone, elevation, _, _ = struct.unpack_from('<6d',data,pos+53)
            if not all(math.isfinite(v) for v in [latitude,longitude,timezone,elevation]) or abs(latitude)>math.pi/2 or abs(longitude)>math.pi:
                raise ValueError(f'Invalid SiteLocation {eid}')
            coordinate_system, end = text16(data,pos+129)
            place, _ = text16(data,end)
            sites[eid] = {**evidence,'latitude':math.degrees(latitude),'longitude':math.degrees(longitude),
                          'timezone':timezone,'elevation_source_units':elevation,
                          'coordinate_system_raw':coordinate_system,'place_name':place}
    if not locations and not tracking:
        return None
    if len(tracking) != 1:
        raise ValueError('Active location is missing or ambiguous')
    for key in ['active_location_id','project_location_id']:
        if tracking[0][key] not in locations:
            raise ValueError('Active/project location reference is unresolved')
    if any(loc['site_id'] not in sites for loc in locations.values()):
        raise ValueError('Location references an unresolved GeoSite')
    return {'tracking':tracking[0],'locations':list(locations.values()),'sites':list(sites.values()),
            'other_site_headers_not_selected':[h for h in headers if h not in relevant]}
