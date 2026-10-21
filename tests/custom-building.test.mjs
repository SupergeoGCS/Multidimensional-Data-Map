import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBuilding, normalizeParcels, parcelArea, rectangleAt,polygonLabelAnchor} from '../web/custom-building-geometry.js';

test('drawing label uses centroid and stays inside a concave outline',()=>{
  const center=polygonLabelAnchor([[121,25],[121.001,25],[121.001,25.001],[121,25.001]]);
  assert.ok(Math.abs(center[0]-121.0005)<1e-10);assert.ok(Math.abs(center[1]-25.0005)<1e-10);
  const concave=[[0,0],[4,0],[4,1],[1,1],[1,4],[0,4]];
  assert.ok(pointInRing(polygonLabelAnchor(concave),[...concave,concave[0]]));
  assert.equal(polygonLabelAnchor([[0,0],[1,0]]),null);
});

const feature = coordinates => ({type: 'Feature', properties: {段: '測試'}, geometry: {type: 'Polygon', coordinates}});
const square = feature([[[121, 25], [121.001, 25], [121.001, 25.001], [121, 25.001], [121, 25]]]);

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length - 1; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

test('normalizes Polygon and MultiPolygon without mutating input', () => {
  const input = {type: 'MultiPolygon', coordinates: [square.geometry.coordinates, [[[121.002,25],[121.003,25],[121.003,25.001],[121.002,25.001],[121.002,25]]]]};
  const before = JSON.stringify(input), result = normalizeParcels(input);
  assert.equal(result.type, 'FeatureCollection');
  assert.equal(result.features[0].geometry.type, 'MultiPolygon');
  assert.equal(JSON.stringify(input), before);
  assert.ok(parcelArea(result.features[0]) > parcelArea(square) * 1.9);
});

test('rejects unclosed, non-finite, out-of-range, and self-intersecting rings', () => {
  assert.throws(() => normalizeParcels(feature([[[121,25],[121.1,25],[121,25.1]]])), /閉合/);
  assert.throws(() => normalizeParcels(feature([[[121,25],[Infinity,25],[121,25.1],[121,25]]])), /有限/);
  assert.throws(() => normalizeParcels(feature([[[181,25],[181,26],[180,26],[181,25]]])), /WGS84/);
  assert.throws(() => normalizeParcels(feature([[[121,25],[121.1,25.1],[121,25.1],[121.1,25],[121,25]]])), /自相交|面積/);
});

test('fits a deterministic rectangle inside concave parcel and avoids its hole', () => {
  const parcel = feature([
    [[121,25],[121.003,25],[121.003,25.001],[121.001,25.001],[121.001,25.003],[121,25.003],[121,25]],
    [[121.0002,25.0002],[121.0007,25.0002],[121.0007,25.0007],[121.0002,25.0007],[121.0002,25.0002]]
  ]);
  const config = {id:'BLDG-A', name:'甲棟', floors:3, floorHeight:3.2, unitsPerFloor:4, basementFloors:2, basementHeight:3, coverage:0.65, rotation:12, layout:'double'};
  const first = generateBuilding(config, parcel), second = generateBuilding(config, parcel);
  assert.deepEqual(first, second);
  assert.equal(first.features.length, 14);
  assert.equal(first.metadata.totalUnits, 12);
  assert.ok(first.metadata.footprintArea <= first.metadata.parcelArea * config.coverage + 0.01);
  assert.equal(first.metadata.layout, 'double');
  assert.ok(first.features[2].properties.area_m2 < first.metadata.footprintArea / 4);
  const [outer, hole] = parcel.geometry.coordinates;
  for (const item of first.features) for (const point of item.geometry.coordinates[0].slice(0, -1)) {
    assert.equal(pointInRing(point, outer), true);
    assert.equal(pointInRing(point, hole), false);
  }
  assert.deepEqual(first.features.slice(0, 2).map(item => item.properties.floor), [-2,-1]);
  assert.equal(first.features[0].properties.base, -6);
  assert.equal(first.features[0].properties.unitId, 'BLDG-A-B2');
  assert.equal(first.features[0].properties.usage, 'basement');
  assert.equal(first.features[0].properties.area_m2, first.metadata.footprintArea);
  assert.equal(first.features[2].properties.usage, 'residential');
  assert.equal(first.features.at(-1).properties.unitId, 'BLDG-A-F3-U4');
  assert.match(first.features.at(-1).properties.label, /^甲棟 /);
  assert.equal(first.features.at(-1).properties.underground, false);
});

test('rectangleAt returns a closed approximate-area WGS84 Polygon', () => {
  const rectangle = rectangleAt([121,25], 150, 1.5, 30);
  assert.equal(rectangle.type, 'Polygon');
  assert.deepEqual(rectangle.coordinates[0][0], rectangle.coordinates[0].at(-1));
  assert.ok(Math.abs(parcelArea({type:'Feature',properties:{},geometry:rectangle}) - 150) < 0.1);
});

test('validates config ranges and hard unit cap', () => {
  const valid = {id:'x', floors:1, floorHeight:3, unitsPerFloor:1, coverage:0.5};
  for (const [change, pattern] of [
    [{floors:0}, /floors/], [{floorHeight:1.9}, /樓高/], [{unitsPerFloor:21}, /unitsPerFloor/],
    [{basementFloors:11}, /basementFloors/], [{coverage:0}, /coverage/], [{rotation:NaN}, /rotation/], [{layout:'triple'}, /layout/]
  ]) assert.throws(() => generateBuilding({...valid, ...change}, square), pattern);
  assert.throws(() => generateBuilding({...valid, floors:100, unitsPerFloor:20, basementFloors:1}, square), /2000/);
});

test('refuses unsimplified parcels before expensive fitting', () => {
  const ring = [];
  for (let i = 0; i < 600; i++) {
    const angle = i / 600 * Math.PI * 2;
    ring.push([121 + Math.cos(angle) * 0.001, 25 + Math.sin(angle) * 0.001]);
  }
  ring.push(ring[0]);
  assert.throws(() => generateBuilding({id:'dense',floors:1,floorHeight:3,unitsPerFloor:1,coverage:0.5}, feature([ring])), /500.*簡化/);
});

test('rejects holes outside the outer ring and impossible narrow parcels', () => {
  assert.throws(() => normalizeParcels(feature([
    [[121,25],[121.001,25],[121.001,25.001],[121,25.001],[121,25]],
    [[122,26],[122.001,26],[122.001,26.001],[122,26.001],[122,26]]
  ])), /洞/);
  const microscopic = feature([[[121,25],[121.000000001,25],[121.000000001,25.000000001],[121,25.000000001],[121,25]]]);
  assert.throws(() => generateBuilding({id:'tiny',floors:1,floorHeight:3,unitsPerFloor:1,coverage:1}, microscopic), /無法容納/);
});
