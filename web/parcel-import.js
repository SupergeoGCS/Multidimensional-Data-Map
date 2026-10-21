const FILE_LIMIT = 20 * 1024 * 1024;
const ZIP_TOTAL_LIMIT = 25 * 1024 * 1024;
const ZIP_ENTRY_LIMIT = 100;
const FEATURE_LIMIT = 1000;
const COORDINATE_LIMIT = 100000;

function fail(message) { throw new Error(message); }
function extension(name) { return name.toLowerCase().split('.').pop(); }
function basename(name) { return name.replace(/\\/g, '/').split('/').pop(); }
function stem(name) { const value = basename(name); return value.includes('.') ? value.slice(0, value.lastIndexOf('.')) : value; }

function normalizeCrs(value) {
  const text = String(value ?? 'auto').trim().toUpperCase().replace(/\s+/g, '');
  if (text === 'AUTO') return 'auto';
  if (/^(EPSG:?)?4326$/.test(text) || text === 'WGS84' || text === 'CRS84') return 'EPSG:4326';
  if (/^(EPSG:?)?3826$/.test(text)) return 'EPSG:3826';
  if (/^(EPSG:?)?3825$/.test(text)) return 'EPSG:3825';
  fail(`不支援的座標系統「${value}」。請選擇 EPSG:4326、EPSG:3826 或 EPSG:3825。`);
}

export function convertCoordinate(coordinate, crs) {
  const code = normalizeCrs(crs);
  if (code === 'EPSG:4326') {
    const lon = Number(coordinate[0]), lat = Number(coordinate[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) fail('WGS84 座標超出經緯度範圍；系統不會依數值猜測平面座標系統。');
    return [lon, lat, ...coordinate.slice(2)];
  }
  if (code !== 'EPSG:3826' && code !== 'EPSG:3825') fail('轉換座標時必須明確指定 EPSG。');
  const x = Number(coordinate[0]), y = Number(coordinate[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) fail('資料包含非數值座標。');
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9999;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2), e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const m = y / k0, mu = m / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256));
  const j1 = 3 * e1 / 2 - 27 * e1 ** 3 / 32;
  const j2 = 21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32;
  const j3 = 151 * e1 ** 3 / 96;
  const j4 = 1097 * e1 ** 4 / 512;
  const fp = mu + j1 * Math.sin(2 * mu) + j2 * Math.sin(4 * mu) + j3 * Math.sin(6 * mu) + j4 * Math.sin(8 * mu);
  const sin = Math.sin(fp), cos = Math.cos(fp), tan = Math.tan(fp);
  const c1 = ep2 * cos ** 2, t1 = tan ** 2;
  const n1 = a / Math.sqrt(1 - e2 * sin ** 2);
  const r1 = a * (1 - e2) / (1 - e2 * sin ** 2) ** 1.5;
  const d = (x - 250000) / (n1 * k0);
  const lat = fp - (n1 * tan / r1) * (d ** 2 / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4 / 24 + (61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * ep2 - 3 * c1 ** 2) * d ** 6 / 720);
  const lon0 = (code === 'EPSG:3826' ? 121 : 119) * Math.PI / 180;
  const lon = lon0 + (d - (1 + 2 * t1 + c1) * d ** 3 / 6 + (5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ep2 + 24 * t1 ** 2) * d ** 5 / 120) / cos;
  return [lon * 180 / Math.PI, lat * 180 / Math.PI, ...coordinate.slice(2)];
}

function signedArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return sum / 2;
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function orient(ring, counterClockwise) {
  return (signedArea(ring) > 0) === counterClockwise ? ring : [...ring].reverse();
}

function ringsToGeometry(rings) {
  const nodes = rings.filter(r => r.length >= 4).map((ring, index) => ({ring, index, area: Math.abs(signedArea(ring)), parent: null, depth: 0}));
  for (const node of nodes) {
    const containers = nodes.filter(other => other !== node && other.area > node.area && pointInRing(node.ring[0], other.ring)).sort((a, b) => a.area - b.area);
    node.parent = containers[0] || null;
  }
  for (const node of nodes) { let p = node.parent; while (p) { node.depth++; p = p.parent; } }
  const polygons = nodes.filter(n => n.depth % 2 === 0).map(shell => [orient(shell.ring, true), ...nodes.filter(n => n.parent === shell && n.depth % 2 === 1).map(n => orient(n.ring, false))]);
  if (!polygons.length) fail('SHP 多邊形沒有有效的環。');
  return polygons.length === 1 ? {type: 'Polygon', coordinates: polygons[0]} : {type: 'MultiPolygon', coordinates: polygons};
}

export function parseShape(buffer, crs, attributes = []) {
  if (!(buffer instanceof ArrayBuffer)) fail('SHP 內容格式錯誤。');
  const view = new DataView(buffer);
  if (view.byteLength < 100 || view.getInt32(0, false) !== 9994) fail('不是有效的 ESRI Shapefile。');
  const declared = view.getInt32(24, false) * 2;
  if (declared < 100 || declared > view.byteLength) fail('SHP 檔案長度欄位錯誤。');
  const features = [];
  let offset = 100, recordIndex = 0, coordinates = 0;
  while (offset < declared) {
    if (offset + 8 > declared) fail('SHP 記錄標頭不完整。');
    const bytes = view.getInt32(offset + 4, false) * 2, start = offset + 8, end = start + bytes;
    if (bytes < 4 || end > declared) fail('SHP 記錄長度錯誤。');
    const type = view.getInt32(start, true);
    if (type !== 0) {
      if (![5, 15, 25].includes(type)) fail(`僅支援 Polygon、PolygonZ、PolygonM；遇到 shape type ${type}。`);
      if (bytes < 44) fail('SHP Polygon 記錄不完整。');
      const partCount = view.getInt32(start + 36, true), pointCount = view.getInt32(start + 40, true);
      if (partCount < 1 || pointCount < 4 || coordinates + pointCount > COORDINATE_LIMIT) fail(`座標數不得超過 ${COORDINATE_LIMIT.toLocaleString()}。`);
      const partsOffset = start + 44, pointsOffset = partsOffset + partCount * 4;
      if (pointsOffset + pointCount * 16 > end) fail('SHP Polygon 點位超出記錄範圍。');
      const starts = [];
      for (let i = 0; i < partCount; i++) starts.push(view.getInt32(partsOffset + i * 4, true));
      if (starts[0] !== 0 || starts.some((value, i) => value < 0 || value >= pointCount || (i && value <= starts[i - 1]))) fail('SHP Polygon parts 索引錯誤。');
      const rings = starts.map((first, i) => {
        const last = i + 1 < starts.length ? starts[i + 1] : pointCount, ring = [];
        for (let p = first; p < last; p++) ring.push(convertCoordinate([view.getFloat64(pointsOffset + p * 16, true), view.getFloat64(pointsOffset + p * 16 + 8, true)], crs));
        if (ring.length && (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1])) ring.push([...ring[0]]);
        return ring;
      });
      coordinates += pointCount;
      features.push({type: 'Feature', properties: {...(attributes[recordIndex] || {}), sourceIndex: recordIndex + 1}, geometry: ringsToGeometry(rings)});
      if (features.length > FEATURE_LIMIT) fail(`圖徵數不得超過 ${FEATURE_LIMIT.toLocaleString()}。`);
    }
    recordIndex++;
    offset = end;
  }
  return {type: 'FeatureCollection', features};
}

function parseDbf(buffer, encoding) {
  const view = new DataView(buffer);
  if (view.byteLength < 33) fail('DBF 檔案不完整。');
  const count = view.getUint32(4, true), headerLength = view.getUint16(8, true), recordLength = view.getUint16(10, true);
  if (headerLength < 33 || recordLength < 1 || headerLength > view.byteLength || headerLength + count * recordLength > view.byteLength + 1) fail('DBF 長度欄位錯誤。');
  let decoder;
  try { decoder = new TextDecoder(encoding, {fatal: false}); } catch { fail(`瀏覽器不支援 DBF 編碼「${encoding}」。`); }
  const fields = [];
  for (let offset = 32; offset + 32 <= headerLength && view.getUint8(offset) !== 0x0d; offset += 32) {
    const rawName = new Uint8Array(buffer, offset, 11), zero = rawName.indexOf(0);
    fields.push({name: decoder.decode(rawName.subarray(0, zero < 0 ? 11 : zero)).trim(), type: String.fromCharCode(view.getUint8(offset + 11)), length: view.getUint8(offset + 16)});
  }
  if (fields.reduce((sum, f) => sum + f.length, 1) > recordLength) fail('DBF 欄位長度超過記錄長度。');
  const rows = [];
  for (let row = 0; row < count; row++) {
    let offset = headerLength + row * recordLength + 1;
    if (view.getUint8(headerLength + row * recordLength) === 0x2a) { rows.push({}); continue; }
    const properties = {};
    for (const field of fields) {
      const text = decoder.decode(new Uint8Array(buffer, offset, field.length)).trim(); offset += field.length;
      if (!text) properties[field.name] = null;
      else if (['N', 'F'].includes(field.type)) properties[field.name] = Number.isFinite(Number(text)) ? Number(text) : text;
      else if (field.type === 'L') properties[field.name] = /^[YT]$/i.test(text) ? true : /^[NF]$/i.test(text) ? false : null;
      else properties[field.name] = text;
    }
    rows.push(properties);
  }
  return rows;
}

function crsFromGeoJson(data) {
  if (!data.crs) return 'EPSG:4326';
  const value = data.crs?.properties?.name ?? data.crs?.properties?.code ?? data.crs?.name;
  if (value == null) fail('GeoJSON crs metadata 無法辨識；請明確選擇座標系統。');
  const match = String(value).match(/(?:EPSG(?::|::|\/0\/)?)(4326|3826|3825)\b/i);
  if (!match) fail(`GeoJSON crs「${value}」不受支援；請明確選擇 EPSG:4326、3826 或 3825。`);
  return `EPSG:${match[1]}`;
}

function mapCoordinates(value, convert, counter) {
  if (!Array.isArray(value)) fail('GeoJSON coordinates 格式錯誤。');
  if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    if (++counter.count > COORDINATE_LIMIT) fail(`座標數不得超過 ${COORDINATE_LIMIT.toLocaleString()}。`);
    return convert(value);
  }
  return value.map(item => mapCoordinates(item, convert, counter));
}

function normalizeGeoJson(input, crs) {
  let data = input;
  if (data?.type === 'Feature') data = {type: 'FeatureCollection', features: [data]};
  else if (data?.type && data.type !== 'FeatureCollection') data = {type: 'FeatureCollection', features: [{type: 'Feature', properties: {}, geometry: data}]};
  if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) fail('檔案不是有效的 GeoJSON。');
  if (data.features.length > FEATURE_LIMIT) fail(`圖徵數不得超過 ${FEATURE_LIMIT.toLocaleString()}。`);
  const sourceCrs = crs === 'auto' ? crsFromGeoJson(data) : crs;
  const counter = {count: 0};
  const geometry = geom => {
    if (geom == null) return null;
    if (geom.type === 'GeometryCollection') return {...geom, geometries: (geom.geometries || []).map(geometry)};
    return {...geom, coordinates: mapCoordinates(geom.coordinates, point => convertCoordinate(point, sourceCrs), counter)};
  };
  return {data: {type: 'FeatureCollection', features: data.features.map((f, i) => ({type: 'Feature', id: f.id, properties: {...(f.properties || {}), sourceIndex: i + 1}, geometry: geometry(f.geometry)}))}, sourceCrs};
}

function readZipDirectory(buffer) {
  const view = new DataView(buffer), min = Math.max(0, view.byteLength - 65557);
  let eocd = -1;
  for (let i = view.byteLength - 22; i >= min; i--) if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) fail('ZIP 缺少中央目錄。');
  const count = view.getUint16(eocd + 10, true), size = view.getUint32(eocd + 12, true), start = view.getUint32(eocd + 16, true);
  if (count > ZIP_ENTRY_LIMIT) fail(`ZIP 項目不得超過 ${ZIP_ENTRY_LIMIT} 個。`);
  if (start + size > eocd) fail('ZIP 中央目錄範圍錯誤。');
  const entries = []; let offset = start, total = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > eocd || view.getUint32(offset, true) !== 0x02014b50) fail('ZIP 中央目錄項目錯誤。');
    const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true), compressedSize = view.getUint32(offset + 20, true), sizeOut = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true), extraLength = view.getUint16(offset + 30, true), commentLength = view.getUint16(offset + 32, true), localOffset = view.getUint32(offset + 42, true);
    if (flags & 1) fail('不支援加密 ZIP。');
    if (![0, 8].includes(method)) fail(`ZIP 壓縮方法 ${method} 不受支援。`);
    if (sizeOut > FILE_LIMIT) fail(`ZIP 單一檔案不得超過 20 MB。`);
    total += sizeOut; if (total > ZIP_TOTAL_LIMIT) fail('ZIP 解壓後總大小不得超過 25 MB。');
    const nameBytes = new Uint8Array(buffer, offset + 46, nameLength), name = new TextDecoder(flags & 0x800 ? 'utf-8' : 'windows-1252').decode(nameBytes);
    entries.push({name, method, compressedSize, size: sizeOut, localOffset});
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(bytes, expectedSize) {
  if (typeof DecompressionStream !== 'function') fail('此瀏覽器不支援 ZIP deflate 解壓縮。');
  let reader;
  try {
    reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks = []; let total = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > expectedSize || total > FILE_LIMIT) {
        await reader.cancel('解壓大小超過限制');
        fail('ZIP 項目實際解壓大小超過宣告值或 20 MB 上限。');
      }
      chunks.push(value);
    }
    const output = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
    return output.buffer;
  } catch (error) {
    if (error instanceof Error && error.message.includes('實際解壓大小')) throw error;
    fail('ZIP deflate 資料解壓失敗。');
  }
}

async function zipEntryBytes(buffer, entry) {
  const view = new DataView(buffer), offset = entry.localOffset;
  if (offset + 30 > view.byteLength || view.getUint32(offset, true) !== 0x04034b50) fail('ZIP 本機檔案標頭錯誤。');
  const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
  if (start + entry.compressedSize > view.byteLength) fail('ZIP 項目資料超出檔案範圍。');
  const compressed = new Uint8Array(buffer, start, entry.compressedSize);
  const output = entry.method === 0 ? compressed.slice().buffer : await inflateRaw(compressed, entry.size);
  if (output.byteLength !== entry.size) fail(`ZIP 項目「${entry.name}」解壓大小不符。`);
  return output;
}

function crsFromPrj(text) {
  const normalized = text.toUpperCase();
  if (/GEOGCS\s*\[\s*["']WGS[_ ]?(?:19)?84/.test(normalized) && !/PROJCS\s*\[/.test(normalized)) return 'EPSG:4326';
  if (/PROJCS\s*\[/.test(normalized) && /(TWD[_ ]?(?:19)?97|TAIWAN_DATUM_1997)/.test(normalized)) {
    if (!/PROJECTION\s*\[\s*["']TRANSVERSE_MERCATOR["']\s*\]/.test(normalized)) fail('PRJ 必須使用 Transverse_Mercator 投影；請明確選擇 EPSG。');
    if (!/(?:LINEARUNIT|UNIT)\s*\[\s*["'](?:MET(?:ER|RE)|METER|METRE)["']\s*,\s*1(?:\.0+)?(?:\s*,|\s*\])/.test(normalized)) fail('PRJ 平面座標單位必須為公尺；請明確選擇 EPSG。');
    const parameter = name => {
      const match = normalized.match(new RegExp(`PARAMETER\\s*\\[\\s*["']${name}["']\\s*,\\s*(-?\\d+(?:\\.\\d+)?)`));
      return match ? Number(match[1]) : null;
    };
    const central = parameter('CENTRAL_MERIDIAN') ?? parameter('LONGITUDE_OF_CENTER');
    const latitude = parameter('LATITUDE_OF_ORIGIN') ?? parameter('LATITUDE_OF_CENTER');
    const scale = parameter('SCALE_FACTOR');
    const falseEasting = parameter('FALSE_EASTING'), falseNorthing = parameter('FALSE_NORTHING');
    if ([central, latitude, scale, falseEasting, falseNorthing].some(value => value == null) || Math.abs(latitude) > 1e-10 || Math.abs(scale - 0.9999) > 1e-10 || Math.abs(falseEasting - 250000) > 1e-6 || Math.abs(falseNorthing) > 1e-6) fail('PRJ 的 TWD97 TM2 投影參數不完整或不符合 EPSG:3825/3826；請明確選擇 EPSG。');
    if (Math.abs(central - 121) < 1e-8) return 'EPSG:3826';
    if (Math.abs(central - 119) < 1e-8) return 'EPSG:3825';
  }
  fail('PRJ 座標系統不受支援；請明確選擇 EPSG:4326、3826 或 3825。');
}

export async function readParcelFile(file, crs = 'auto') {
  const chosen = normalizeCrs(crs), name = file?.name || '未命名檔案';
  if (!file || typeof file.arrayBuffer !== 'function') fail('請提供可讀取的本機檔案。');
  if (file.size > FILE_LIMIT) fail('輸入檔案不得超過 20 MB。');
  const ext = extension(name), buffer = await file.arrayBuffer();
  let data, sourceCrs;
  if (ext === 'json' || ext === 'geojson') {
    let json; try { json = JSON.parse(new TextDecoder().decode(buffer)); } catch { fail('GeoJSON JSON 語法錯誤。'); }
    ({data, sourceCrs} = normalizeGeoJson(json, chosen));
  } else if (ext === 'zip') {
    const entries = readZipDirectory(buffer).filter(e => !e.name.endsWith('/'));
    const shapes = entries.filter(e => extension(e.name) === 'shp');
    if (shapes.length !== 1) fail(shapes.length ? 'ZIP 內有多個 SHP；請每次只匯入一個圖層。' : 'ZIP 內找不到 SHP。');
    const targetStem = stem(shapes[0].name).toLowerCase();
    const related = suffix => entries.find(e => stem(e.name).toLowerCase() === targetStem && extension(e.name) === suffix);
    const dbf = related('dbf'), prj = related('prj'), cpg = related('cpg');
    sourceCrs = chosen;
    if (sourceCrs === 'auto') {
      if (!prj) fail('自動判讀 SHP 需要同名 PRJ；或請明確選擇座標系統。');
      sourceCrs = crsFromPrj(new TextDecoder().decode(await zipEntryBytes(buffer, prj)));
    }
    let attributes = [];
    if (dbf) {
      let encoding = 'utf-8';
      if (cpg) {
        const label = new TextDecoder().decode(await zipEntryBytes(buffer, cpg)).trim().toLowerCase();
        encoding = /^(950|big5|big-?5|cp950)$/.test(label) ? 'big5' : /^(65001|utf-?8)$/.test(label) ? 'utf-8' : label;
      }
      attributes = parseDbf(await zipEntryBytes(buffer, dbf), encoding);
    }
    data = parseShape(await zipEntryBytes(buffer, shapes[0]), sourceCrs, attributes);
  } else fail('僅支援 GeoJSON（.geojson/.json）或含 SHP 的 .zip。');
  data.sourceName = name;
  data.crsLabel = `${sourceCrs} → WGS84`;
  return {data, crsLabel: data.crsLabel};
}
