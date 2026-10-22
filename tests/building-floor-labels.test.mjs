import test from 'node:test';
import assert from 'node:assert/strict';
import {projectFloorPoint,createBuildingFloorLabels} from '../web/building-floor-labels.js';
test('floor label projects altitude and follows visibility and floor list',()=>{
  const oldDocument=globalThis.document,oldMaplibre=globalThis.maplibregl;
  class Node{style={};children=[];attributes={};classList={add(){}};append(...nodes){this.children.push(...nodes);}setAttribute(k,v){this.attributes[k]=v;}remove(){this.removed=true;}}
  const host=new Node();let layer;
  const matrix=[1,0,0,0,0,1,0,0,0,1,1,0,0,0,0,1];
  try{
    globalThis.document={createElement:()=>new Node(),createElementNS:()=>new Node()};
    globalThis.maplibregl={MercatorCoordinate:{fromLngLat:(point,altitude)=>({x:point[0],y:point[1],z:altitude})}};
    let zoom=18,zoomHandler;
    const map={getZoom:()=>zoom,on(event,handler){assert.equal(event,'zoom');zoomHandler=handler;},addLayer(value){layer=value;},getContainer:()=>({clientWidth:400,clientHeight:400})};
    const labels=createBuildingFloorLabels(map,host);
    const items=[{id:'a:1',buildingId:'a',buildingName:'甲棟',text:'1樓',altitude:0,coordinates:[[0,0]]},{id:'a:2',buildingId:'a',buildingName:'甲棟',text:'2樓',altitude:.3,coordinates:[[0,0]]}];
    labels.update(items,true);layer.render(null,{defaultProjectionData:{mainMatrix:matrix}});
    const texts=host.children.filter(node=>node.className==='building-floor-label');
    assert.deepEqual(texts.map(node=>node.textContent),['1樓','2樓']);
    assert.ok(parseFloat(texts[1].style.top)<parseFloat(texts[0].style.top));
    assert.equal(texts[0].style.left,'216px');assert.equal(host.hidden,false);
    zoom=17.9;zoomHandler();assert.equal(host.hidden,true);
    zoom=18;zoomHandler();assert.equal(host.hidden,false);
    labels.update([items[0]],false);assert.equal(host.hidden,true);assert.equal(texts[1].removed,true);
    assert.equal(projectFloorPoint(matrix,{x:0,y:0,z:2},400,400),null);
  }finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;if(oldMaplibre===undefined)delete globalThis.maplibregl;else globalThis.maplibregl=oldMaplibre;}
});
