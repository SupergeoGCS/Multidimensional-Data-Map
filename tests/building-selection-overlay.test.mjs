import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuildingSelectionOverlay} from '../web/building-selection-overlay.js';

test('selection overlay projects the selected floor with holes and clears immediately',()=>{
  const oldDocument=globalThis.document,oldMaplibre=globalThis.maplibregl;
  class Node{style={};children=[];attributes={};append(node){this.children.push(node);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attributes[k]=v;}}
  try{
    globalThis.document={createElementNS:()=>new Node()};
    globalThis.maplibregl={MercatorCoordinate:{fromLngLat:(c,z)=>({x:c[0],y:c[1],z})}};
    const container=new Node();container.clientWidth=400;container.clientHeight=400;
    let layer;
    const overlay=createBuildingSelectionOverlay({addLayer(v){layer=v;},getContainer:()=>container});
    const ring=[[0,0],[.5,0],[.5,.5],[0,0]];
    overlay.update([{feature:{geometry:{type:'Polygon',coordinates:[ring,ring]},properties:{wallHeight:.3}},color:'#e49a00',strong:true}]);
    layer.render(null,{defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,1,1,0,0,0,0,1]}});
    const host=container.children[0],path=host.children[0];
    assert.equal(host.style.display,'');
    assert.equal(path.attributes['fill-rule'],'evenodd');
    assert.equal(path.attributes['stroke-width'],'1');
    assert.equal(path.attributes['stroke-opacity'],'.65');
    assert.ok(path.attributes.d.startsWith('M200,140'));
    assert.equal((path.attributes.d.match(/ Z/g)||[]).length,2);
    overlay.update([],[{geometry:{type:'Polygon',coordinates:[ring]},height:.6}]);
    layer.render(null,{defaultProjectionData:{mainMatrix:[1,0,0,0,0,1,0,0,0,1,1,0,0,0,0,1]}});
    assert.equal(host.style.display,'');
    assert.equal(host.children.length,1);
    assert.equal(host.children[0].attributes.fill,'none');
    assert.equal(host.children[0].attributes['stroke-opacity'],'.35');
    assert.ok(host.children[0].attributes.d.includes('L200,80'));
    overlay.update([]);assert.equal(host.style.display,'none');
  }finally{globalThis.document=oldDocument;globalThis.maplibregl=oldMaplibre;}
});
