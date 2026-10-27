import {validateBearing} from './building-facing.js';
const EARTH_RADIUS = 6371008.8;
const EPS = 1e-12;

function fail(message) { throw new TypeError(message); }
function finite(value, name) {
  if (!Number.isFinite(value)) fail(`${name} 必須是有限數字`);
  return value;
}
function integer(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) fail(`${name} 必須是 ${min}..${max} 的整數`);
  return value;
}
function samePoint(a, b) { return Math.abs(a[0] - b[0]) <= EPS && Math.abs(a[1] - b[1]) <= EPS; }
function cross(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function onSegment(p, a, b) {
  return Math.abs(cross(a, b, p)) <= EPS && p[0] >= Math.min(a[0], b[0]) - EPS &&
    p[0] <= Math.max(a[0], b[0]) + EPS && p[1] >= Math.min(a[1], b[1]) - EPS && p[1] <= Math.max(a[1], b[1]) + EPS;
}
function segmentsIntersect(a, b, c, d) {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  if (((abC > EPS && abD < -EPS) || (abC < -EPS && abD > EPS)) &&
      ((cdA > EPS && cdB < -EPS) || (cdA < -EPS && cdB > EPS))) return true;
  return onSegment(c, a, b) || onSegment(d, a, b) || onSegment(a, c, d) || onSegment(b, c, d);
}
function ringArea(ring) {
  let value = 0;
  const origin = ring[0];
  for (let i = 0; i < ring.length - 1; i++) {
    const ax = ring[i][0] - origin[0], ay = ring[i][1] - origin[1];
    const bx = ring[i + 1][0] - origin[0], by = ring[i + 1][1] - origin[1];
    value += ax * by - bx * ay;
  }
  return value / 2;
}
function pointInRing(point, ring, boundary = true) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length - 1; j = i++) {
    const a = ring[j], b = ring[i];
    if (onSegment(point, a, b)) return boundary;
    if ((a[1] > point[1]) !== (b[1] > point[1]) &&
        point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function validateRing(ring, label) {
  if (!Array.isArray(ring) || ring.length < 4) fail(`${label} 至少需要三個頂點並閉合`);
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    if (!Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) fail(`${label} 座標必須是有限數字`);
    if (p[0] < -180 || p[0] > 180 || p[1] < -90 || p[1] > 90) fail(`${label} 必須使用 WGS84 經緯度範圍`);
    if (i && samePoint(p, ring[i - 1])) fail(`${label} 不可有連續重複頂點`);
  }
  if (!samePoint(ring[0], ring.at(-1))) fail(`${label} 必須閉合`);
  if (Math.abs(ringArea(ring)) <= 1e-18) fail(`${label} 面積不可為零`);
  const segmentCount = ring.length - 1;
  for (let i = 0; i < segmentCount; i++) for (let j = i + 1; j < segmentCount; j++) {
    if (j === i + 1 || (i === 0 && j === segmentCount - 1)) continue;
    if (segmentsIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) fail(`${label} 不可自相交`);
  }
}
function validatePolygon(coordinates, label) {
  if (!Array.isArray(coordinates) || !coordinates.length) fail(`${label} 缺少外環`);
  const vertexCount = coordinates.reduce((sum, ring) => sum + (Array.isArray(ring) ? ring.length - 1 : 0), 0);
  if (vertexCount > 2000) fail(`${label} 有 ${vertexCount} 個頂點；請先將單筆地籍簡化至 2000 點以下`);
  coordinates.forEach((ring, index) => validateRing(ring, `${label} ring ${index}`));
  const outer = coordinates[0];
  for (let h = 1; h < coordinates.length; h++) {
    const hole = coordinates[h];
    if (!pointInRing(hole[0], outer, false)) fail(`${label} 的洞必須位於外環內`);
    for (let i = 0; i < hole.length - 1; i++) for (let j = 0; j < outer.length - 1; j++)
      if (segmentsIntersect(hole[i], hole[i + 1], outer[j], outer[j + 1])) fail(`${label} 的洞不可接觸或穿越外環`);
    for (let prior = 1; prior < h; prior++) {
      const other = coordinates[prior];
      if (pointInRing(hole[0], other, true) || pointInRing(other[0], hole, true)) fail(`${label} 的洞不可重疊`);
      for (let i = 0; i < hole.length - 1; i++) for (let j = 0; j < other.length - 1; j++)
        if (segmentsIntersect(hole[i], hole[i + 1], other[j], other[j + 1])) fail(`${label} 的洞不可相交`);
    }
  }
}

function asFeatures(data) {
  if (!data || typeof data !== 'object') fail('地籍資料必須是 GeoJSON');
  if (data.type === 'FeatureCollection') return data.features;
  if (data.type === 'Feature') return [data];
  if (data.type === 'Polygon' || data.type === 'MultiPolygon') return [{type: 'Feature', properties: {}, geometry: data}];
  fail('僅支援 Polygon、MultiPolygon、Feature 或 FeatureCollection');
}

export function normalizeParcels(data) {
  const source = asFeatures(data);
  if (!Array.isArray(source) || !source.length) fail('地籍資料不得為空');
  const features = source.map((feature, featureIndex) => {
    if (!feature || feature.type !== 'Feature' || !feature.geometry) fail(`feature ${featureIndex} 格式錯誤`);
    const {type, coordinates} = feature.geometry;
    if (type === 'Polygon') validatePolygon(coordinates, `feature ${featureIndex}`);
    else if (type === 'MultiPolygon') {
      if (!Array.isArray(coordinates) || !coordinates.length) fail(`feature ${featureIndex} 缺少 polygon`);
      coordinates.forEach((polygon, index) => validatePolygon(polygon, `feature ${featureIndex} polygon ${index}`));
    } else fail(`feature ${featureIndex} 僅支援 Polygon 或 MultiPolygon`);
    return {type: 'Feature', properties: {...(feature.properties || {})}, geometry: {type, coordinates: structuredClone(coordinates)}};
  });
  return {type: 'FeatureCollection', features};
}

function projection(origin) {
  const cos = Math.cos(origin[1] * Math.PI / 180);
  return {
    toXY: ([lon, lat]) => [(lon - origin[0]) * Math.PI / 180 * EARTH_RADIUS * cos, (lat - origin[1]) * Math.PI / 180 * EARTH_RADIUS],
    toLonLat: ([x, y]) => [origin[0] + x / (EARTH_RADIUS * cos) * 180 / Math.PI, origin[1] + y / EARTH_RADIUS * 180 / Math.PI]
  };
}
function geometryCoordinates(feature) {
  return feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
}
function referencePoint(feature) {
  const points = geometryCoordinates(feature).flatMap(polygon => polygon[0].slice(0, -1));
  return [points.reduce((sum, p) => sum + p[0], 0) / points.length, points.reduce((sum, p) => sum + p[1], 0) / points.length];
}
function projectedPolygons(feature, project) {
  return geometryCoordinates(feature).map(polygon => polygon.map(ring => ring.map(project.toXY)));
}
function polygonAreaXY(polygon) {
  return Math.abs(ringArea(polygon[0])) - polygon.slice(1).reduce((sum, hole) => sum + Math.abs(ringArea(hole)), 0);
}
export function parcelArea(feature) {
  const normalized = normalizeParcels(feature);
  return normalized.features.reduce((total, item) => {
    const project = projection(referencePoint(item));
    return total + projectedPolygons(item, project).reduce((sum, polygon) => sum + polygonAreaXY(polygon), 0);
  }, 0);
}

function rectangleXY(center, area, ratio, rotation) {
  const width = Math.sqrt(area * ratio), depth = area / width, angle = rotation * Math.PI / 180;
  const ux = [Math.cos(angle), Math.sin(angle)], uy = [-Math.sin(angle), Math.cos(angle)];
  const point = (x, y) => [center[0] + ux[0] * x + uy[0] * y, center[1] + ux[1] * x + uy[1] * y];
  return [point(-width / 2, -depth / 2), point(width / 2, -depth / 2), point(width / 2, depth / 2), point(-width / 2, depth / 2), point(-width / 2, -depth / 2)];
}
export function rectangleAt(center, area, ratio = 1.5, rotation = 0) {
  if (!Array.isArray(center) || center.length < 2) fail('center 必須是 [lon, lat]');
  finite(center[0], 'center longitude'); finite(center[1], 'center latitude');
  if (center[0] < -180 || center[0] > 180 || center[1] < -90 || center[1] > 90) fail('center 必須位於 WGS84 範圍');
  if (!(finite(area, 'area') > 0) || !(finite(ratio, 'ratio') > 0)) fail('area 與 ratio 必須大於零');
  finite(rotation, 'rotation');
  const project = projection(center);
  return {type: 'Polygon', coordinates: [rectangleXY([0, 0], area, ratio, rotation).map(project.toLonLat)]};
}

function pointInPolygon(point, polygon) {
  return pointInRing(point, polygon[0], true) && !polygon.slice(1).some(hole => pointInRing(point, hole, true));
}
function rectangleInside(rect, polygon) {
  for (let i = 0; i < 4; i++) {
    if (!pointInPolygon(rect[i], polygon)) return false;
    for (let sample = 1; sample < 10; sample++) {
      const t = sample / 10, p = [rect[i][0] * (1 - t) + rect[i + 1][0] * t, rect[i][1] * (1 - t) + rect[i + 1][1] * t];
      if (!pointInPolygon(p, polygon)) return false;
    }
    for (const ring of polygon) for (let j = 0; j < ring.length - 1; j++)
      if (segmentsIntersect(rect[i], rect[i + 1], ring[j], ring[j + 1])) return false;
  }
  for (const hole of polygon.slice(1)) for (const p of hole.slice(0, -1)) if (pointInRing(p, rect, false)) return false;
  return true;
}
function candidateCenters(polygon) {
  const outer = polygon[0].slice(0, -1), xs = outer.map(p => p[0]), ys = outer.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const candidates = [];
  for (let yi = 0; yi <= 24; yi++) for (let xi = 0; xi <= 24; xi++) {
    const point = [minX + (maxX - minX) * (xi + 0.5) / 25, minY + (maxY - minY) * (yi + 0.5) / 25];
    if (pointInPolygon(point, polygon)) candidates.push(point);
  }
  candidates.push([outer.reduce((s, p) => s + p[0], 0) / outer.length, outer.reduce((s, p) => s + p[1], 0) / outer.length]);
  return candidates;
}
function fitRectangle(polygons, targetArea, ratio, rotation) {
  let best = null;
  for (const polygon of polygons) {
    const centers = candidateCenters(polygon);
    for (const center of centers) {
      let low = 0, high = targetArea;
      for (let iteration = 0; iteration < 32; iteration++) {
        const area = (low + high) / 2, rect = rectangleXY(center, area, ratio, rotation);
        if (rectangleInside(rect, polygon)) low = area; else high = area;
      }
      if (!best || low > best.area) best = {area: low, center, rect: rectangleXY(center, low, ratio, rotation)};
    }
  }
  if (!best || best.area < 0.01) throw new RangeError('地籍內無法容納有效的矩形建築 footprint');
  return best;
}
function splitRectangle(rect, count, layout, gap = 0.15) {
  const rows = layout === 'double' && count > 1 ? 2 : 1;
  const perRow = Array.from({length: rows}, (_, row) => Math.ceil((count - row) / rows));
  const origin = rect[0], xVector = [rect[1][0] - origin[0], rect[1][1] - origin[1]], yVector = [rect[3][0] - origin[0], rect[3][1] - origin[1]];
  const at = (x, y) => [origin[0] + xVector[0] * x + yVector[0] * y, origin[1] + xVector[1] * x + yVector[1] * y];
  const width = Math.hypot(...xVector), depth = Math.hypot(...yVector);
  const result = [];
  for (let row = 0; row < rows; row++) for (let column = 0; column < perRow[row]; column++) {
    const insetX = gap / (2 * width), insetY = gap / (2 * depth);
    const x0 = column / perRow[row] + insetX, x1 = (column + 1) / perRow[row] - insetX;
    const y0 = row / rows + insetY, y1 = (row + 1) / rows - insetY;
    if (x1 <= x0 || y1 <= y0) throw new RangeError('footprint 太小，無法保留 0.15 公尺戶間距');
    result.push([at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1), at(x0, y0)]);
  }
  return result;
}

export function generateBuilding(config, parcelFeature) {
  if (!config || typeof config !== 'object') fail('config 必須是物件');
  if (typeof config.id !== 'string' || !config.id.trim()) fail('id 必須是非空字串');
  const floors = integer(config.floors, 'floors', 1, 100);
  const units = integer(config.unitsPerFloor, 'unitsPerFloor', 1, 20);
  const basements = integer(config.basementFloors ?? 0, 'basementFloors', 0, 10);
  const floorHeight = finite(config.floorHeight, 'floorHeight');
  const basementHeight = finite(config.basementHeight ?? floorHeight, 'basementHeight');
  if (floorHeight < 2 || floorHeight > 10 || basementHeight < 2 || basementHeight > 10) fail('樓高必須介於 2..10 公尺');
  const coverage = finite(config.coverage, 'coverage');
  if (!(coverage > 0 && coverage <= 1)) fail('coverage 必須大於 0 且不超過 1');
  const ratio = config.ratio === undefined ? 1.5 : finite(config.ratio, 'ratio');
  if (!(ratio > 0)) fail('ratio 必須大於零');
  const rotation = config.entranceBearing===undefined?(config.rotation === undefined ? 0 : finite(config.rotation, 'rotation')):-validateBearing(config.entranceBearing);
  const layout = config.layout ?? (units >= 4 ? 'double' : 'single');
  if (!['single','double','ring'].includes(layout)) fail("layout 必須是 'single'、'double' 或 'ring'");
  const commonRatio=finite(config.commonAreaRatio??0,'commonAreaRatio');
  if(commonRatio<0||commonRatio>=1)fail('中央公共設施比例必須介於 0 與 100% 之間（不含100%）');
  const totalUnits = floors * units;
  if (totalUnits + basements+(commonRatio>0?floors:0) > 2000) fail('建物 feature 總數不得超過 2000');

  const normalized = normalizeParcels(parcelFeature);
  if (normalized.features.length !== 1) fail('generateBuilding 每次只接受一個 parcel feature');
  const parcel = normalized.features[0], origin = referencePoint(parcel), project = projection(origin);
  const vertexCount = geometryCoordinates(parcel).reduce((sum, polygon) =>
    sum + polygon.reduce((ringSum, ring) => ringSum + ring.length - 1, 0), 0);
  if (vertexCount > 500) fail(`目前建物配置最多處理 500 個地籍頂點（收到 ${vertexCount}）；請先簡化選取的地籍`);
  const polygons = projectedPolygons(parcel, project), parcelAreaM2 = polygons.reduce((sum, polygon) => sum + polygonAreaXY(polygon), 0);
  if(config.footprintMode==='parcel'||layout==='ring'||commonRatio>0){
    const {cells,common}=partitionParcel(polygons,units,layout,rotation,commonRatio),features=[];
    const footprint=structuredClone(parcel.geometry),name=config.name||config.id;
    const cellGeometry=cell=>{const coordinates=cell.polygons.map(p=>p.map(r=>r.map(project.toLonLat)));return coordinates.length===1?{type:'Polygon',coordinates:coordinates[0]}:{type:'MultiPolygon',coordinates};};
    for(let basement=basements;basement>=1;basement--)features.push({type:'Feature',properties:{buildingId:config.id,floor:-basement,unitId:`${config.id}-B${basement}`,base:-basement*basementHeight,height:basementHeight,underground:true,usage:'basement',label:`${name} B${basement} 地下室`,area_m2:parcelAreaM2,floor_area_m2:parcelAreaM2,representative_point:project.toLonLat(cells[0].point)},geometry:structuredClone(footprint)});
    for(let floor=1;floor<=floors;floor++)cells.forEach((cell,index)=>{
      const coordinates=cell.polygons.map(p=>p.map(r=>r.map(project.toLonLat)));
      features.push({type:'Feature',properties:{buildingId:config.id,floor,unitId:`${config.id}-F${floor}-U${index+1}`,base:(floor-1)*floorHeight,height:floorHeight,underground:false,usage:'residential',label:`${name} F${floor} 戶 ${index+1}`,area_m2:cell.area,floor_area_m2:parcelAreaM2,representative_point:project.toLonLat(cell.point)},geometry:coordinates.length===1?{type:'Polygon',coordinates:coordinates[0]}:{type:'MultiPolygon',coordinates}});
    });
    if(common)for(let floor=1;floor<=floors;floor++)features.push({type:'Feature',properties:{buildingId:config.id,floor,unitId:`${config.id}-F${floor}-COMMON`,base:(floor-1)*floorHeight,height:floorHeight,underground:false,usage:'common',label:`${name} F${floor} 中央公共設施`,area_m2:common.area,floor_area_m2:parcelAreaM2,representative_point:project.toLonLat(common.point)},geometry:cellGeometry(common)});
    return {type:'FeatureCollection',features,metadata:{buildingId:config.id,footprint,centroid:project.toLonLat(cells[0].point),footprintArea:parcelAreaM2,parcelArea:parcelAreaM2,floorArea:parcelAreaM2,commonAreaRatio:commonRatio,commonAreaPerFloor:common?.area||0,residentialAreaPerFloor:cells.reduce((s,cell)=>s+cell.area,0),aboveGroundFloorArea:parcelAreaM2*floors,basementFloorArea:parcelAreaM2*basements,totalFloorArea:parcelAreaM2*(floors+basements),totalUnits,floors,basementFloors:basements,layout,footprintMode:'parcel',estimated:true}};
  }
  const fitted = fitRectangle(polygons, parcelAreaM2 * coverage, ratio, rotation);
  const unitsXY = splitRectangle(fitted.rect, units, layout), features = [];
  const buildingName = config.name || config.id;
  for (let basement = basements; basement >= 1; basement--) {
    const floorCode = `B${basement}`;
    features.push({
      type: 'Feature',
      properties: {buildingId: config.id, floor: -basement, unitId: `${config.id}-${floorCode}`,
        base: -basement * basementHeight, height: basementHeight, underground: true,
        usage: 'basement', label: `${buildingName} ${floorCode} 地下室`, area_m2: fitted.area},
      geometry: {type: 'Polygon', coordinates: [fitted.rect.map(project.toLonLat)]}
    });
  }
  for (let floor = 1; floor <= floors; floor++) unitsXY.forEach((ring, index) => {
    const floorCode = `F${floor}`;
    const unitId = `${config.id}-${floorCode}-U${index + 1}`;
    features.push({
      type: 'Feature',
      properties: {buildingId: config.id, floor, unitId, base: (floor - 1) * floorHeight, height: floorHeight,
        underground: false, usage: 'residential', label: `${buildingName} ${floorCode} 戶 ${index + 1}`,
        area_m2: Math.abs(ringArea(ring))},
      geometry: {type: 'Polygon', coordinates: [ring.map(project.toLonLat)]}
    });
  });
  const footprint = {type: 'Polygon', coordinates: [fitted.rect.map(project.toLonLat)]};
  return {type: 'FeatureCollection', features, metadata: {
    buildingId: config.id, footprint, centroid: project.toLonLat(fitted.center), footprintArea: fitted.area,
    parcelArea: parcelAreaM2, totalUnits, floors, basementFloors: basements, layout, estimated: true
  }};
}
// Area centroid with an interior fallback for concave drawing outlines.
export function polygonLabelAnchor(points) {
  if(points.length<3)return null;
  const origin=points[0],ring=points.map(p=>[p[0]-origin[0],p[1]-origin[1]]);
  let area=0,x=0,y=0;
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],cross=a[0]*b[1]-b[0]*a[1];
    area+=cross;x+=(a[0]+b[0])*cross;y+=(a[1]+b[1])*cross;
  }
  if(Math.abs(area)<1e-20)return null;
  const centroid=[x/(3*area),y/(3*area)];
  const inside=p=>{let result=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;
  }return result;};
  if(inside(centroid))return [centroid[0]+origin[0],centroid[1]+origin[1]];
  const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]),minX=Math.min(...xs),minY=Math.min(...ys),width=Math.max(...xs)-minX,height=Math.max(...ys)-minY;
  let best=null,distance=Infinity;
  const consider=p=>{if(!inside(p))return;const d=(p[0]-centroid[0])**2+(p[1]-centroid[1])**2;if(d<distance){best=p;distance=d;}};
  for(let iy=0;iy<31;iy++)for(let ix=0;ix<31;ix++)consider([minX+width*(ix+.5)/31,minY+height*(iy+.5)/31]);
  // Interior triangle centroids also cover shapes too thin for the grid.
  for(let i=0;i<ring.length;i++){const a=ring[(i+ring.length-1)%ring.length],b=ring[i],c=ring[(i+1)%ring.length];consider([(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3]);}
  return best?[best[0]+origin[0],best[1]+origin[1]]:null;
}
import {partitionParcel} from './parcel-footprint.js';
