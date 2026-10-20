import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBasemapStyle, applyBasemapVisibility, BUILDING_LAYER_ID} from '../web/map-basemaps.js';
const original = JSON.parse(readFileSync(new URL('../web/map-styles/openfreemap-liberty.json', import.meta.url)));

test('Vector style namespaces sources and keeps flat buildings at high zoom', () => {
  const before = JSON.stringify(original), config = createBasemapStyle(original);
  assert.equal(JSON.stringify(original), before);
  assert.equal(new Set(config.style.layers.map(l => l.id)).size, config.style.layers.length);
  for (const layer of config.style.layers) if (layer.source) assert.ok(config.style.sources[layer.source]);
  assert.equal(config.style.sources['ofm-ne2_shaded'], undefined);
  assert.match(config.style.sources['ofm-openmaptiles'].attribution, /OpenFreeMap/);
  assert.equal(config.style.layers.find(l => l.id === 'ofm-building').maxzoom, undefined);
  assert.ok(config.style.layers.find(l => l.id === BUILDING_LAYER_ID));
});

test('Switching basemap and buildings never resets BIM or imported overlays', () => {
  const config = createBasemapStyle(original), visible = new Map([['bim-preview','visible'],['local-1-fill','visible']]);
  const map = {getLayer: () => true, setLayoutProperty: (id, key, value) => visible.set(id, value)};
  for (const [base, mode, buildings, expected3D, expectedStreet] of [
    ['vector','2d',true,'none','none'], ['vector','3d',true,'visible','none'],
    ['vector','3d',false,'none','none'], ['street','3d',true,'none','visible'],
    ['none','3d',true,'none','none'], ['vector','3d',true,'visible','none']
  ]) {
    applyBasemapVisibility(map, config, base, mode, buildings);
    assert.equal(visible.get(BUILDING_LAYER_ID), expected3D);
    assert.equal(visible.get('street'), expectedStreet);
    assert.equal(visible.get('bim-preview'), 'visible');
    assert.equal(visible.get('local-1-fill'), 'visible');
    if (base !== 'vector') for (const id of config.vectorIds) assert.equal(visible.get(id), 'none');
  }
});

test('Unavailable vector style still supports raster and blank basemaps', () => {
  const config = createBasemapStyle(null), visible = new Map();
  const map = {getLayer: () => true, setLayoutProperty: (id, key, value) => visible.set(id, value)};
  assert.equal(config.available, false);
  applyBasemapVisibility(map, config, 'street', '2d', true);
  assert.equal(visible.get('street'), 'visible');
  applyBasemapVisibility(map, config, 'none', '3d', true);
  assert.equal(visible.get('street'), 'none');
});
