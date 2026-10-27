// Bearings use north=0, east=90; partition rotation uses counterclockwise from east.
export function validateBearing(value){
  if(!Number.isFinite(value)||value<0||value>360)throw new TypeError('大門方向角度必須介於 0 與 360 度');
  return value%360;
}
export function entranceBearingFor(config){
  return config.entranceBearing===undefined?((-(config.rotation||0)%360)+360)%360:validateBearing(config.entranceBearing);
}
export function facingPreset(bearing){return [0,90,180,270].includes(bearing)?String(bearing):'custom';}

export function facingArrow(footprint,bearing,buildingId){
  const polygons=footprint.type==='MultiPolygon'?footprint.coordinates:[footprint.coordinates];
  const vertices=polygons.flatMap(p=>p[0]);
  const xs=vertices.map(p=>p[0]),ys=vertices.map(p=>p[1]);
  const origin=[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2];
  const scaleX=111195.08*Math.cos(origin[1]*Math.PI/180),scaleY=111195.08;
  const angle=validateBearing(bearing)*Math.PI/180,forward=[Math.sin(angle),Math.cos(angle)],right=[forward[1],-forward[0]];
  const xy=p=>[(p[0]-origin[0])*scaleX,(p[1]-origin[1])*scaleY];
  const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
  let furthest=-Infinity,anchor=null;
  for(const polygon of polygons){
    const ring=polygon[0].map(xy);
    for(let i=0;i<ring.length-1;i++){
      const a=ring[i],edge=[ring[i+1][0]-a[0],ring[i+1][1]-a[1]],denominator=cross(forward,edge);
      if(Math.abs(denominator)<1e-10)continue;
      const distance=cross(a,edge)/denominator,along=cross(a,forward)/denominator;
      if(along>=-1e-9&&along<=1+1e-9&&distance>furthest){furthest=distance;anchor=[forward[0]*distance,forward[1]*distance];}
    }
  }
  // Disconnected polygons can leave the centre ray in a gap; use a boundary vertex.
  if(!anchor)anchor=vertices.map(xy).reduce((best,p)=>p[0]*forward[0]+p[1]*forward[1]>best[0]*forward[0]+best[1]*forward[1]?p:best);
  const position=(distance,side=0)=>[origin[0]+(anchor[0]+forward[0]*distance+right[0]*side)/scaleX,origin[1]+(anchor[1]+forward[1]*distance+right[1]*side)/scaleY];
  const start=0,end=12;
  const feature=(kind,geometry)=>({type:'Feature',properties:{buildingId,kind,bearing},geometry});
  return [
    feature('shaft',{type:'LineString',coordinates:[position(start),position(end)]}),
    feature('head',{type:'LineString',coordinates:[position(end-4,-3),position(end),position(end-4,3)]}),
    feature('label',{type:'Point',coordinates:position(end+5)})
  ];
}
