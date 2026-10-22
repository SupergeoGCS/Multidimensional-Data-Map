import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoBuildings,relocateLegacyDemoBuildings} from '../web/demo-buildings.js';
import {rectangleAt} from '../web/custom-building-geometry.js';
import {convertCoordinate} from '../web/parcel-import.js';
import {RVT_STR_PLACEMENT} from '../web/rvt-str-placement.js';

const bounds=building=>{
  const ring=building.parcel.geometry.coordinates[0];
  return [Math.min(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),Math.max(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[1]))];
};

test('demo parcels occupy the indicated open area south of STR and follow the 1097 lane',()=>{
  // Full native scene/accessor bounds transformed into EPSG:3826, not its origin alone.
  const strSouth=convertCoordinate([270968.9704076421,2768153.9947312297],'EPSG:3826')[1];
  const center=convertCoordinate([271031.0516397431,2768214.477057328],'EPSG:3826');
  const [a,b]=createDemoBuildings().buildings.map(bounds);
  for(const box of [a,b]){
    assert.ok(box[3]<strSouth,'demo buildings must not overlap the STR footprint');
    const dx=((box[0]+box[2])/2-center[0])*111320*Math.cos(center[1]*Math.PI/180);
    const dy=((box[1]+box[3])/2-center[1])*111320;
    assert.ok(Math.hypot(dx,dy)<250,'demo and STR must fit in one local neighbourhood');
  }
  const angle=41.67*Math.PI/180,origin=[121.2098,25.0207];
  const xy=p=>[(p[0]-origin[0])*111320*Math.cos(origin[1]*Math.PI/180),(p[1]-origin[1])*111320];
  const intervals=createDemoBuildings().buildings.map(building=>{
    const ring=building.parcel.geometry.coordinates[0].map(xy),edge=[ring[1][0]-ring[0][0],ring[1][1]-ring[0][1]];
    assert.ok(Math.abs(Math.atan2(edge[1],edge[0])*180/Math.PI-41.67)<.1,'long side must follow the mapped lane');
    const roadStart=xy([121.2086857,25.0206801]);
    assert.ok(ring.every(p=>Math.cos(angle)*(p[1]-roadStart[1])-Math.sin(angle)*(p[0]-roadStart[0]) < -40),'both footprints stay clear of the south side of the mapped road');
    const along=ring.map(p=>p[0]*Math.cos(angle)+p[1]*Math.sin(angle));
    return [Math.min(...along),Math.max(...along)];
  });
  assert.ok(intervals[0][1]+10<intervals[1][0],'A and B must have a clear gap');
});

test('only untouched legacy demo parcels relocate; saved visibility and edited/user buildings survive',()=>{
  const fresh=createDemoBuildings();
  const old=structuredClone(fresh);
  old.buildings.forEach((b,i)=>{b.config.rotation=0;b.parcel.geometry=rectangleAt([[121.535,25.045],[121.5357,25.045]][i],i?1200:900,1.5,0);});
  old.buildings[0].visible=false;
  const before=JSON.stringify(old),moved=relocateLegacyDemoBuildings(old);
  assert.equal(JSON.stringify(old),before,'never mutate a stored object');
  assert.deepEqual(moved.buildings.map(b=>b.parcel),fresh.buildings.map(b=>b.parcel));
  assert.equal(moved.buildings[0].visible,false);
  assert.deepEqual(moved.buildings.map(b=>b.config),fresh.buildings.map(b=>b.config));
  assert.deepEqual(relocateLegacyDemoBuildings(moved),moved,'migration must be idempotent');
  const edited=structuredClone(old);edited.buildings[0].config.floors=10;edited.buildings[1].parcel.properties.name='我的基地';
  assert.deepEqual(relocateLegacyDemoBuildings(edited),edited);
  const personal=structuredClone(old);personal.buildings[0].config.id='personal-building';
  assert.deepEqual(relocateLegacyDemoBuildings(personal).buildings[0],personal.buildings[0]);
  const west=structuredClone(old),matrix=RVT_STR_PLACEMENT.local_to_shared_m_row_major;
  west.buildings.forEach((b,i)=>{b.parcel.geometry=rectangleAt(convertCoordinate([matrix[0][3]-82,matrix[1][3]+(i?91:31)],'EPSG:3826'),i?1200:900,1.5,0);});
  assert.deepEqual(relocateLegacyDemoBuildings(west).buildings.map(b=>b.parcel),fresh.buildings.map(b=>b.parcel),'previous western demo layout also upgrades');
});
