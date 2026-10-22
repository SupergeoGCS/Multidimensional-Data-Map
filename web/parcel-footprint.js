import {ShapeUtils,Vector2} from './vendor/three.module.js';

const area=ring=>Math.abs(ring.reduce((s,a,i)=>{const b=ring[(i+1)%ring.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2);
function clip(ring,axis,limit,less){
  const output=[];
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],inA=less?a[axis]<=limit:a[axis]>=limit,inB=less?b[axis]<=limit:b[axis]>=limit;
    if(inA)output.push(a);
    if(inA!==inB){const t=(limit-a[axis])/(b[axis]-a[axis]);output.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
  }
  return output;
}
const cut=(pieces,axis,value,less)=>pieces.map(r=>clip(r,axis,value,less)).filter(r=>r.length>=3&&area(r)>1e-9);
const sumArea=pieces=>pieces.reduce((sum,r)=>sum+area(r),0);
function splitEqual(pieces,axis,counts){
  let remaining=pieces;const result=[];
  for(let i=0;i<counts.length-1;i++){
    const target=sumArea(remaining)*counts[i]/counts.slice(i).reduce((s,n)=>s+n,0);
    const values=remaining.flat().map(p=>p[axis]);let low=Math.min(...values),high=Math.max(...values);
    for(let step=0;step<45;step++){const mid=(low+high)/2;if(sumArea(cut(remaining,axis,mid,true))<target)low=mid;else high=mid;}
    const at=(low+high)/2;result.push(cut(remaining,axis,at,true));remaining=cut(remaining,axis,at,false);
  }
  result.push(remaining);return result;
}
const signedArea=ring=>ring.reduce((s,a,i)=>{const b=ring[(i+1)%ring.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
function contains(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
}return inside;}
// Cancel shared triangulation edges, retaining only the clipped cell boundaries.
function dissolve(pieces){
  const edges=new Map(),key=p=>p.map(v=>Math.round(v*1e6)).join(',');
  for(const piece of pieces){const ring=signedArea(piece)>0?piece:[...piece].reverse();
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length],start=key(a),end=key(b);if(start===end)continue;
      const reverse=`${end}|${start}`;if(edges.has(reverse))edges.delete(reverse);else edges.set(`${start}|${end}`,{a,b,start,end});
    }
  }
  const adjacency=new Map();for(const edge of edges.values()){if(!adjacency.has(edge.start))adjacency.set(edge.start,[]);adjacency.get(edge.start).push(edge);}
  const loops=[];
  while(edges.size){const first=edges.values().next().value,ring=[first.a];let edge=first;
    for(let step=0;step<=pieces.length*8+10;step++){
      edges.delete(`${edge.start}|${edge.end}`);ring.push(edge.b);if(edge.end===first.start)break;
      const next=(adjacency.get(edge.end)||[]).filter(e=>edges.has(`${e.start}|${e.end}`));
      if(!next.length)throw new Error('分戶輪廓未能閉合，請調整方向或簡化基地。');
      if(next.length===1)edge=next[0];else{
        const angle=Math.atan2(edge.b[1]-edge.a[1],edge.b[0]-edge.a[0]);
        const turn=e=>(Math.atan2(e.b[1]-e.a[1],e.b[0]-e.a[0])-angle+Math.PI*2)%(Math.PI*2);
        edge=next.sort((a,b)=>turn(b)-turn(a))[0];
      }
    }
    if(key(ring[0])!==key(ring.at(-1)))throw new Error('分戶輪廓閉合失敗。');
    ring[ring.length-1]=ring[0];if(area(ring)>1e-7)loops.push(ring);
  }
  const outers=loops.filter(r=>signedArea(r)>0).map(r=>[r]);
  for(const hole of loops.filter(r=>signedArea(r)<0)){
    const outer=outers.filter(p=>contains(hole[0],p[0])).sort((a,b)=>area(a[0])-area(b[0]))[0];
    if(!outer)throw new Error('分戶孔洞對應失敗。');outer.push(hole);
  }
  return outers;
}

export function partitionParcel(polygons,count,layout,rotation=0){
  const angle=rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const rotate=p=>[p[0]*c+p[1]*s,-p[0]*s+p[1]*c];
  const unrotate=p=>[p[0]*c-p[1]*s,p[0]*s+p[1]*c];
  const triangles=[];
  for(const polygon of polygons){
    const rings=polygon.map(r=>r.slice(0,-1).map(p=>new Vector2(...rotate(p))));
    const vertices=rings.flat();
    for(const face of ShapeUtils.triangulateShape(rings[0],rings.slice(1)))triangles.push(face.map(i=>[vertices[i].x,vertices[i].y]));
  }
  if(!triangles.length||sumArea(triangles)<.01)throw new Error('占地面積過小，無法產生樓板。');
  const rowCounts=layout==='double'&&count>1?[Math.ceil(count/2),Math.floor(count/2)]:[count];
  const rows=splitEqual(triangles,1,rowCounts),cells=[];
  for(let row=0;row<rows.length;row++)for(const pieces of splitEqual(rows[row],0,Array(rowCounts[row]).fill(1))){
    const merged=dissolve(pieces);if(!merged.length)throw new Error('無法產生有效住宅輪廓。');
    const first=pieces[0];cells.push({polygons:merged.map(p=>p.map(r=>r.map(unrotate))),area:sumArea(pieces),point:unrotate([first.reduce((n,p)=>n+p[0],0)/first.length,first.reduce((n,p)=>n+p[1],0)/first.length])});
  }
  return cells;
}
