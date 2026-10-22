import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoBuildings,relocateLegacyDemoBuildings} from '../web/demo-buildings.js';
import {rectangleAt} from '../web/custom-building-geometry.js';
import {convertCoordinate} from '../web/parcel-import.js';

const bounds=building=>{
  const ring=building.parcel.geometry.coordinates[0];
  return [Math.min(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),Math.max(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[1]))];
};

test('demo parcels are near the audited STR footprint, west of it and separate from each other',()=>{
  // Full native scene/accessor bounds transformed into EPSG:3826, not its origin alone.
  const strWest=convertCoordinate([270968.9704076421,2768153.9947312297],'EPSG:3826')[0];
  const center=convertCoordinate([271031.0516397431,2768214.477057328],'EPSG:3826');
  const [a,b]=createDemoBuildings().buildings.map(bounds);
  for(const box of [a,b]){
    assert.ok(box[2]<strWest,'demo buildings must not overlap the STR footprint');
    const dx=((box[0]+box[2])/2-center[0])*111320*Math.cos(center[1]*Math.PI/180);
    const dy=((box[1]+box[3])/2-center[1])*111320;
    assert.ok(Math.hypot(dx,dy)<200,'demo and STR must fit in one local neighbourhood');
  }
  assert.ok(a[3]<b[1],'A and B must not overlap');
});

test('only untouched legacy demo parcels relocate; saved visibility and edited/user buildings survive',()=>{
  const fresh=createDemoBuildings();
  const old=structuredClone(fresh);
  old.buildings.forEach((b,i)=>{b.parcel.geometry=rectangleAt([[121.535,25.045],[121.5357,25.045]][i],i?1200:900,1.5,0);});
  old.buildings[0].visible=false;
  const before=JSON.stringify(old),moved=relocateLegacyDemoBuildings(old);
  assert.equal(JSON.stringify(old),before,'never mutate a stored object');
  assert.deepEqual(moved.buildings.map(b=>b.parcel),fresh.buildings.map(b=>b.parcel));
  assert.equal(moved.buildings[0].visible,false);
  assert.deepEqual(relocateLegacyDemoBuildings(moved),moved,'migration must be idempotent');
  const edited=structuredClone(old);edited.buildings[0].config.floors=10;edited.buildings[1].parcel.properties.name='我的基地';
  assert.deepEqual(relocateLegacyDemoBuildings(edited),edited);
  const personal=structuredClone(old);personal.buildings[0].config.id='personal-building';
  assert.deepEqual(relocateLegacyDemoBuildings(personal).buildings[0],personal.buildings[0]);
});
