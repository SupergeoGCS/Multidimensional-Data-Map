import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuildingFacingOverlay} from '../web/building-facing-overlay.js';

test('facing overlay projects at supplied altitude and clears when buildings are hidden',()=>{
  const previousDocument=globalThis.document,previousMaplibre=globalThis.maplibregl;
  class Node{style={};children=[];attributes={};append(node){this.children.push(node);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attributes[k]=v;}}
  try{
    globalThis.document={createElementNS:()=>new Node()};
    const altitudes=[];
    globalThis.maplibregl={MercatorCoordinate:{fromLngLat(c,z){altitudes.push(z);return {x:c[0],y:c[1],z};}}};
    const container=new Node();container.clientWidth=400;container.clientHeight=400;let layer;
    const overlay=createBuildingFacingOverlay({addLayer(v){layer=v;},getContainer:()=>container});
    overlay.update([
      {properties:{kind:'shaft',altitude:.3},geometry:{coordinates:[[0,0],[.5,0]]}},
      {properties:{kind:'label',altitude:.3,bearing:105},geometry:{coordinates:[.5,0]}}
    ]);
    layer.render(null,{defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,1,1,0,0,0,0,1]}});
    const host=container.children[0];
    assert.ok(altitudes.every(z=>z===.3));assert.equal(host.children.length,3);
    assert.equal(host.children[1].attributes.d,'M200,140 L300,140');
    assert.equal(host.children[1].attributes['stroke-dasharray'],'7 5');
    assert.equal(host.children[2].textContent,'大門朝向 105°');
    overlay.update([]);assert.equal(host.style.display,'none');
  }finally{globalThis.document=previousDocument;globalThis.maplibregl=previousMaplibre;}
});
