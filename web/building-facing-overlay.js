import {projectFloorPoint} from './building-floor-labels.js';

// Keep the geographic arrow on the site boundary, visible above the depth buffer.
export function createBuildingFacingOverlay(map){
  let features=[],host;
  const ns='http://www.w3.org/2000/svg';
  map.addLayer({id:'studio-facing-overlay',type:'custom',renderingMode:'3d',onAdd(){},render(gl,args){
    if(!features.length){if(host)host.style.display='none';return;}
    const matrix=args.defaultProjectionData?.mainMatrix;if(!matrix)return;
    if(!host){host=document.createElementNS(ns,'svg');host.setAttribute('class','building-facing-overlay');host.setAttribute('aria-hidden','true');map.getContainer().append(host);}
    host.style.display='';host.replaceChildren();
    const {clientWidth:width,clientHeight:height}=map.getContainer();host.setAttribute('viewBox',`0 0 ${width} ${height}`);
    for(const feature of features){
      const p=feature.properties;
      const project=c=>projectFloorPoint(matrix,maplibregl.MercatorCoordinate.fromLngLat(c,p.altitude),width,height);
      if(p.kind==='label'){
        const point=project(feature.geometry.coordinates);if(!point)continue;
        const text=document.createElementNS(ns,'text');text.setAttribute('x',point.x);text.setAttribute('y',point.y-8);text.setAttribute('text-anchor','middle');
        text.textContent=`大門朝向 ${p.bearing}°`;host.append(text);
      }else{
        const points=feature.geometry.coordinates.map(project);if(points.some(p=>!p))continue;
        const d=points.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ');
        for(const halo of [true,false]){
          const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('fill','none');
          path.setAttribute('stroke',halo?'#fff':'#087c79');path.setAttribute('stroke-width',halo?'6':'3');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');
          if(p.kind==='shaft')path.setAttribute('stroke-dasharray','7 5');host.append(path);
        }
      }
    }
  }});
  return {update(next){features=next;if(host&&!features.length)host.style.display='none';map.triggerRepaint?.();}};
}
