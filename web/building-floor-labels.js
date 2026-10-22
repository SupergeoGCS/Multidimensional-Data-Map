export function projectFloorPoint(matrix,point,width,height){
  const {x,y,z}=point;
  const w=matrix[3]*x+matrix[7]*y+matrix[11]*z+matrix[15];if(w<=0)return null;
  const px=(matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12])/w;
  const py=(matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13])/w;
  const depth=(matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14])/w;
  return depth< -1||depth>1?null:{x:(px+1)*width/2,y:(1-py)*height/2};
}

export const FLOOR_LABEL_MIN_ZOOM=18;
export function createBuildingFloorLabels(map,host){
  let items=[],visible=false;const nodes=new Map();
  function syncVisibility(){host.hidden=!visible||map.getZoom()<FLOOR_LABEL_MIN_ZOOM;}
  map.on('zoom',syncVisibility);
  map.addLayer({id:'studio-floor-labels',type:'custom',renderingMode:'3d',onAdd(){},render(gl,args){
    syncVisibility();if(host.hidden||!items.length)return;
    const matrix=args.defaultProjectionData?.mainMatrix;if(!matrix)return;
    const {clientWidth:width,clientHeight:height}=map.getContainer(),groups=new Map();
    for(const item of items){
      if(!nodes.has(item.id)){
        const label=document.createElement('div');label.className='building-floor-label';label.textContent=item.text;label.title=item.buildingName;
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),line=document.createElementNS('http://www.w3.org/2000/svg','line');svg.classList.add('building-floor-leader');svg.append(line);host.append(svg,label);nodes.set(item.id,{label,svg,line});
      }
      let anchor=null;
      for(const coordinates of item.coordinates){
        const point=projectFloorPoint(matrix,maplibregl.MercatorCoordinate.fromLngLat(coordinates,item.altitude),width,height);
        if(point&&(!anchor||point.x>anchor.x))anchor=point;
      }
      const node=nodes.get(item.id);if(!node)continue;
      if(!anchor||anchor.x<0||anchor.x>width-55||anchor.y<0||anchor.y>height){node.label.hidden=true;node.line.style.display='none';continue;}
      if(!groups.has(item.buildingId))groups.set(item.buildingId,[]);groups.get(item.buildingId).push({anchor,node});
    }
    for(const group of groups.values()){
      group.sort((a,b)=>a.anchor.y-b.anchor.y);
      const center=group.reduce((s,p)=>s+p.anchor.y,0)/group.length;
      let previous=-Infinity;
      const ys=group.map(p=>{const next=Math.max(p.anchor.y,previous+18);previous=next;return next;});
      const shift=center-ys.reduce((s,y)=>s+y,0)/ys.length;
      group.forEach(({anchor,node},index)=>{
        const y=ys[index]+shift,x=anchor.x+16;
        node.label.hidden=false;node.label.style.left=`${x}px`;node.label.style.top=`${y}px`;
        node.line.style.display='';node.line.setAttribute('x1',anchor.x+2);node.line.setAttribute('y1',anchor.y);node.line.setAttribute('x2',x-2);node.line.setAttribute('y2',y);
      });
    }
  }});
  return {update(next,show){
    items=next;visible=show;syncVisibility();
    const keep=new Set(items.map(item=>item.id));for(const [id,node]of nodes)if(!keep.has(id)){node.label.remove();node.svg.remove();nodes.delete(id);}
  }};
}
