import {projectFloorPoint} from './building-floor-labels.js';

// Screen overlay intentionally bypasses the extrusion depth buffer.
export function createBuildingSelectionOverlay(map){
  let items=[],envelopes=[],host;
  const ns='http://www.w3.org/2000/svg';
  map.addLayer({id:'studio-selection-overlay',type:'custom',renderingMode:'3d',onAdd(){},render(gl,args){
    if(!items.length&&!envelopes.length){if(host)host.style.display='none';return;}
    const matrix=args.defaultProjectionData?.mainMatrix;if(!matrix)return;
    if(!host){host=document.createElementNS(ns,'svg');host.setAttribute('class','building-selection-overlay');host.setAttribute('aria-hidden','true');map.getContainer().append(host);}
    host.style.display='';host.replaceChildren();
    const {clientWidth:width,clientHeight:height}=map.getContainer();
    host.setAttribute('viewBox',`0 0 ${width} ${height}`);
    for(const {geometry,height:topHeight} of envelopes){
      const polygons=geometry.type==='MultiPolygon'?geometry.coordinates:[geometry.coordinates];
      const segments=[];
      const project=(c,z)=>projectFloorPoint(matrix,maplibregl.MercatorCoordinate.fromLngLat(c,z),width,height);
      const edge=(a,b)=>{if(a&&b)segments.push(`M${a.x},${a.y} L${b.x},${b.y}`);};
      for(const polygon of polygons)for(const ring of polygon){
        const bottom=ring.map(c=>project(c,0)),top=ring.map(c=>project(c,topHeight));
        for(let i=0;i<ring.length-1;i++){edge(bottom[i],bottom[i+1]);edge(top[i],top[i+1]);edge(bottom[i],top[i]);}
      }
      const path=document.createElementNS(ns,'path');path.setAttribute('d',segments.join(' '));path.setAttribute('fill','none');
      path.setAttribute('stroke','#71818b');path.setAttribute('stroke-width','.8');path.setAttribute('stroke-opacity','.35');host.append(path);
    }
    for(const {feature,color,strong} of items){
      const polygons=feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[feature.geometry.coordinates];
      for(const polygon of polygons){
        const rings=polygon.map(ring=>ring.map(coordinates=>projectFloorPoint(matrix,maplibregl.MercatorCoordinate.fromLngLat(coordinates,feature.properties.wallHeight),width,height)));
        if(rings.some(ring=>ring.some(point=>!point)))continue;
        const path=document.createElementNS(ns,'path');
        path.setAttribute('d',rings.map(ring=>ring.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ')+' Z').join(' '));
        path.setAttribute('fill-rule','evenodd');path.setAttribute('fill',color);path.setAttribute('fill-opacity',strong?'.4':'.08');
        path.setAttribute('stroke',strong?color:'none');path.setAttribute('stroke-width',strong?'1':'0');path.setAttribute('stroke-opacity','.65');host.append(path);
      }
    }
  }});
  return {update(next,outlines=[]){items=next;envelopes=outlines;if(host&&!items.length&&!envelopes.length)host.style.display='none';map.triggerRepaint?.();}};
}
