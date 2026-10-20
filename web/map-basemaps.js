// All basemaps share one style; local overlays are never reset with setStyle().
export const BUILDING_LAYER_ID = 'ofm-building-3d';
const OSM = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
const ATTRIBUTION = '<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> · © <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · ' + OSM;

export function createBasemapStyle(input) {
  const original = input ? structuredClone(input) : null;
  const sources = {street: {type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: OSM}};
  const layers = [];
  if (original) {
    for (const [id, source] of Object.entries(original.sources)) {
      // Omit Liberty's optional low-zoom Natural Earth raster.
      if (source.type === 'vector') sources['ofm-' + id] = {...source, attribution: ATTRIBUTION};
    }
    for (const layer of original.layers) {
      if (layer.source && !sources['ofm-' + layer.source]) continue;
      layer.id = 'ofm-' + layer.id;
      if (layer.source) layer.source = 'ofm-' + layer.source;
      layer.layout = {...layer.layout, visibility: layer.type === 'fill-extrusion' ? 'none' : (layer.layout?.visibility || 'visible')};
      if (layer.id === 'ofm-building') delete layer.maxzoom;
      if (layer.id === BUILDING_LAYER_ID) layer.paint = {
        'fill-extrusion-color': '#b6c4ce',
        'fill-extrusion-height': ['max', 0, ['to-number', ['get', 'render_height'], 0]],
        'fill-extrusion-base': ['max', 0, ['to-number', ['get', 'render_min_height'], 0]],
        'fill-extrusion-opacity': .72
      };
      layers.push(layer);
    }
  }
  const style = {version: 8, sources, layers: [
    {id: 'background', type: 'background', paint: {'background-color': '#dfe9ed'}}, ...layers,
    {id: 'street', type: 'raster', source: 'street', layout: {visibility: original ? 'none' : 'visible'}, paint: {'raster-saturation': -.65, 'raster-contrast': -.12, 'raster-opacity': .82}}
  ]};
  if (original?.glyphs) style.glyphs = original.glyphs;
  if (original?.sprite) style.sprite = original.sprite;
  return {style, vectorIds: layers.map(l => l.id), vectorDefaults: Object.fromEntries(layers.map(l => [l.id, l.layout.visibility])), vectorSourceIds: Object.keys(sources).filter(id => id.startsWith('ofm-')), available: !!original};
}

export function applyBasemapVisibility(map, config, basemap, mode, buildings) {
  for (const id of config.vectorIds) {
    const visible = id === BUILDING_LAYER_ID
      ? basemap === 'vector' && mode === '3d' && buildings
      : basemap === 'vector' && config.vectorDefaults[id] !== 'none';
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  }
  if (map.getLayer('street')) map.setLayoutProperty('street', 'visibility', basemap === 'street' ? 'visible' : 'none');
}
