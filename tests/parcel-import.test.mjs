import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {convertCoordinate, parseShape, readParcelFile} from '../web/parcel-import.js';

const file = (name, bytes) => ({name, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)});

function polygonShp(rings, type = 5) {
  const points = rings.flat(), contentBytes = 44 + rings.length * 4 + points.length * 16 + (type === 15 ? 16 + points.length * 8 + 16 + points.length * 8 : type === 25 ? 16 + points.length * 8 : 0);
  const bytes = new Uint8Array(100 + 8 + contentBytes), v = new DataView(bytes.buffer);
  v.setInt32(0, 9994, false); v.setInt32(24, bytes.length / 2, false); v.setInt32(28, 1000, true); v.setInt32(32, type, true);
  v.setInt32(100, 1, false); v.setInt32(104, contentBytes / 2, false); v.setInt32(108, type, true);
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  v.setFloat64(112, Math.min(...xs), true); v.setFloat64(120, Math.min(...ys), true); v.setFloat64(128, Math.max(...xs), true); v.setFloat64(136, Math.max(...ys), true);
  v.setInt32(144, rings.length, true); v.setInt32(148, points.length, true);
  let cursor = 152, start = 0;
  for (const ring of rings) { v.setInt32(cursor, start, true); cursor += 4; start += ring.length; }
  for (const point of points) { v.setFloat64(cursor, point[0], true); v.setFloat64(cursor + 8, point[1], true); cursor += 16; }
  return bytes;
}

function storedZip(entries) {
  const encoder = new TextEncoder(), locals = [], centrals = []; let offset = 0;
  for (const [name, data] of entries) {
    const nameBytes = encoder.encode(name), bytes = data instanceof Uint8Array ? data : encoder.encode(data);
    const local = new Uint8Array(30 + nameBytes.length + bytes.length), lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x800, true); lv.setUint32(18, bytes.length, true); lv.setUint32(22, bytes.length, true); lv.setUint16(26, nameBytes.length, true); local.set(nameBytes, 30); local.set(bytes, 30 + nameBytes.length);
    const central = new Uint8Array(46 + nameBytes.length), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint32(20, bytes.length, true); cv.setUint32(24, bytes.length, true); cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true); central.set(nameBytes, 46);
    locals.push(local); centrals.push(central); offset += local.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0), out = new Uint8Array(offset + centralSize + 22), ov = new DataView(out.buffer);
  let cursor = 0; for (const b of [...locals, ...centrals]) { out.set(b, cursor); cursor += b.length; }
  ov.setUint32(cursor, 0x06054b50, true); ov.setUint16(cursor + 8, entries.length, true); ov.setUint16(cursor + 10, entries.length, true); ov.setUint32(cursor + 12, centralSize, true); ov.setUint32(cursor + 16, offset, true);
  return out;
}

function deflatedZip(name, plain, declaredSize = plain.length) {
  const encoder = new TextEncoder(), nameBytes = encoder.encode(name), compressed = deflateRawSync(plain);
  const local = new Uint8Array(30 + nameBytes.length + compressed.length), lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x800, true); lv.setUint16(8, 8, true); lv.setUint32(18, compressed.length, true); lv.setUint32(22, declaredSize, true); lv.setUint16(26, nameBytes.length, true); local.set(nameBytes, 30); local.set(compressed, 30 + nameBytes.length);
  const central = new Uint8Array(46 + nameBytes.length), cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint16(10, 8, true); cv.setUint32(20, compressed.length, true); cv.setUint32(24, declaredSize, true); cv.setUint16(28, nameBytes.length, true); central.set(nameBytes, 46);
  const out = new Uint8Array(local.length + central.length + 22), ov = new DataView(out.buffer); out.set(local); out.set(central, local.length);
  const end = local.length + central.length; ov.setUint32(end, 0x06054b50, true); ov.setUint16(end + 8, 1, true); ov.setUint16(end + 10, 1, true); ov.setUint32(end + 12, central.length, true); ov.setUint32(end + 16, local.length, true);
  return out;
}

test('TWD97 TM2 inverse projection maps false easting and Taipei northing', () => {
  assert.deepEqual(convertCoordinate([250000, 0], 'EPSG:3826').map(n => +n.toFixed(8)), [121, 0]);
  const taipei = convertCoordinate([250000, 2766054], '3826');
  assert.ok(Math.abs(taipei[0] - 121) < 1e-8);
  assert.ok(Math.abs(taipei[1] - 25) < 0.003);
  assert.equal(convertCoordinate([250000, 0], '3825')[0], 119);
});

test('SHP rings become polygon with a hole independent of winding order', () => {
  const outer = [[0,0],[10,0],[10,10],[0,10],[0,0]], hole = [[2,2],[2,8],[8,8],[8,2],[2,2]];
  const data = parseShape(polygonShp([hole, outer]).buffer, 'EPSG:4326', [{段號:'001'}]);
  assert.equal(data.features[0].geometry.type, 'Polygon');
  assert.equal(data.features[0].geometry.coordinates.length, 2);
  assert.equal(data.features[0].properties['段號'], '001');
});

test('stored ZIP imports one PolygonZ SHP and uses PRJ in auto mode', async () => {
  const ring = [[250000,0],[250010,0],[250010,10],[250000,10],[250000,0]];
  const prj = 'PROJCS["TWD97 / TM2 zone 121",GEOGCS["TWD97",DATUM["Taiwan_Datum_1997"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",121],PARAMETER["scale_factor",0.9999],PARAMETER["false_easting",250000],PARAMETER["false_northing",0],UNIT["metre",1]]';
  const result = await readParcelFile(file('parcel.zip', storedZip([['cadastre.shp', polygonShp([ring], 15)], ['cadastre.prj', prj]])));
  assert.equal(result.crsLabel, 'EPSG:3826 → WGS84');
  assert.equal(result.data.features.length, 1);
  assert.equal(result.data.sourceName, 'parcel.zip');
  assert.ok(Math.abs(result.data.features[0].geometry.coordinates[0][0][0] - 121) < 1e-8);
});

test('deflated ZIP imports successfully and aborts dishonest expanded size', async () => {
  const shp = polygonShp([[[0,0],[1,0],[1,1],[0,0]]]);
  const good = await readParcelFile(file('good.zip', deflatedZip('a.shp', shp)), '4326');
  assert.equal(good.data.features.length, 1);
  const large = new Uint8Array(1024 * 1024);
  await assert.rejects(readParcelFile(file('bomb.zip', deflatedZip('a.shp', large, 4)), '4326'), /實際解壓大小/);
});

test('automatic PRJ rejects wrong projection, units, or TM2 parameters', async () => {
  const shp = polygonShp([[[250000,0],[250001,0],[250001,1],[250000,0]]]);
  const base = 'PROJCS["TWD97",GEOGCS["TWD97",DATUM["Taiwan_Datum_1997"]],PROJECTION["{projection}"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",121],PARAMETER["scale_factor",0.9999],PARAMETER["false_easting",250000],PARAMETER["false_northing",0],UNIT["{unit}",{factor}]]';
  const read = prj => readParcelFile(file('bad.zip', storedZip([['a.shp', shp], ['a.prj', prj]])));
  await assert.rejects(read(base.replace('{projection}', 'Mercator').replace('{unit}', 'metre').replace('{factor}', '1')), /Transverse_Mercator/);
  await assert.rejects(read(base.replace('{projection}', 'Transverse_Mercator').replace('{unit}', 'foot').replace('{factor}', '0.3048')), /單位必須為公尺/);
  await assert.rejects(read(base.replace('{projection}', 'Transverse_Mercator').replace('{unit}', 'metre').replace('{factor}', '1').replace('0.9999', '1')), /投影參數/);
});

test('GeoJSON does not guess unknown CRS metadata and explicit CRS overrides it', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({type:'FeatureCollection', crs:{type:'name',properties:{name:'EPSG:9999'}}, features:[]}));
  await assert.rejects(readParcelFile(file('x.geojson', bytes)), /不受支援/);
  assert.equal((await readParcelFile(file('x.geojson', bytes), 'EPSG:4326')).crsLabel, 'EPSG:4326 → WGS84');
  const projected = new TextEncoder().encode(JSON.stringify({type:'Point',coordinates:[250000,2766054]}));
  await assert.rejects(readParcelFile(file('projected.geojson', projected)), /不會依數值猜測/);
});

test('ZIP rejects multiple SHP and declared oversized expansion', async () => {
  const shp = polygonShp([[[0,0],[1,0],[1,1],[0,0]]]);
  await assert.rejects(readParcelFile(file('many.zip', storedZip([['a.shp', shp], ['b.shp', shp]])), '4326'), /多個 SHP/);
  const zip = storedZip([['a.shp', shp]]), view = new DataView(zip.buffer), central = zip.length - 22 - (46 + 'a.shp'.length);
  view.setUint32(central + 24, 20 * 1024 * 1024 + 1, true);
  await assert.rejects(readParcelFile(file('bomb.zip', zip), '4326'), /20 MB/);
});
