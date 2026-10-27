import test from 'node:test';
import assert from 'node:assert/strict';
import {entranceBearingFor,facingPreset,facingArrow,validateBearing} from '../web/building-facing.js';
import {generateBuilding,rectangleAt} from '../web/custom-building-geometry.js';

test('entrance bearing preserves legacy rotation and validates custom angles',()=>{
  assert.equal(entranceBearingFor({rotation:41.67}),318.33);
  for(const angle of [0,90,180,270])assert.equal(facingPreset(angle),String(angle));
  assert.equal(facingPreset(37),'custom');assert.equal(validateBearing(360),0);
  for(const value of [-1,361,NaN,Infinity,'90'])assert.throws(()=>validateBearing(value));
});

test('entrance bearing drives partition orientation for every layout',()=>{
  const parcel={type:'Feature',properties:{},geometry:rectangleAt([121,25],1200,1.5)};
  for(const layout of ['single','double','ring'])for(const bearing of [0,90,180,270,37]){
    const config={id:'facing',floors:1,floorHeight:3,unitsPerFloor:4,coverage:1,footprintMode:'parcel',layout};
    const actual=generateBuilding({...config,rotation:12,entranceBearing:bearing},parcel);
    const expected=generateBuilding({...config,rotation:-bearing},parcel);
    assert.deepEqual(actual.features,expected.features);
  }
  const config={id:'two',floors:1,floorHeight:3,unitsPerFloor:2,coverage:1,footprintMode:'parcel',layout:'single'};
  const north=generateBuilding({...config,entranceBearing:0},parcel),east=generateBuilding({...config,entranceBearing:90},parcel);
  assert.notDeepEqual(north.features[0].geometry,east.features[0].geometry,'changing the facade changes the actual partition');
});

test('arrow starts on the footprint boundary and points outward in cardinal and custom directions',()=>{
  const footprint=rectangleAt([121,25],1200,1.5);
  for(const bearing of [0,90,180,270,37]){
    const [shaft,head,label]=facingArrow(footprint,bearing,'b');
    const [start,end]=shaft.geometry.coordinates;
    const dx=(end[0]-start[0])*Math.cos(25*Math.PI/180),dy=end[1]-start[1];
    const measured=(Math.atan2(dx,dy)*180/Math.PI+360)%360;
    assert.ok(Math.abs(measured-bearing)<1e-6);
    assert.deepEqual(head.geometry.coordinates[1],end);
    assert.equal(label.properties.buildingId,'b');
    const angle=bearing*Math.PI/180;
    const projection=p=>(p[0]-121)*Math.cos(25*Math.PI/180)*Math.sin(angle)+(p[1]-25)*Math.cos(angle);
    assert.ok(projection(end)>projection(start));
    const ring=footprint.coordinates[0];
    const distanceToSegment=(a,b)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1];
      const t=Math.max(0,Math.min(1,((start[0]-a[0])*dx+(start[1]-a[1])*dy)/(dx*dx+dy*dy)));
      return Math.hypot(start[0]-a[0]-t*dx,start[1]-a[1]-t*dy);
    };
    assert.ok(ring.slice(0,-1).some((a,i)=>distanceToSegment(a,ring[i+1])<1e-10),'arrow must touch a boundary edge');
  }
});
