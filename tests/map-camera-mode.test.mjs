import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCameraMode} from '../web/map-camera-mode.js';
test('2D locks all rotation and pitch inputs; 3D restores them without disabling pan or zoom',()=>{
  const handler=()=>({enabled:true,enable(){this.enabled=true;},disable(){this.enabled=false;}});
  const rotation=()=>({rotation:true,enableRotation(){this.rotation=true;},disableRotation(){this.rotation=false;}});
  const map={dragRotate:handler(),touchPitch:handler(),keyboard:rotation(),touchZoomRotate:rotation(),dragPan:handler(),scrollZoom:handler(),setMaxPitch(value){this.maxPitch=value;},jumpTo(options){this.camera=options;}};
  let rotateGuard;map.on=(type,fn)=>{assert.equal(type,'rotate');rotateGuard=fn;};map.getBearing=()=>map.camera.bearing;
  applyCameraMode(map,'2d');
  assert.equal(map.maxPitch,0);assert.deepEqual(map.camera,{pitch:0,bearing:0});
  assert.equal(map.dragRotate.enabled,false);assert.equal(map.touchPitch.enabled,false);
  assert.equal(map.keyboard.rotation,false);assert.equal(map.touchZoomRotate.rotation,false);
  assert.equal(map.dragPan.enabled,true);assert.equal(map.scrollZoom.enabled,true);
  map.camera.bearing=30;rotateGuard();assert.equal(map.camera.bearing,0);
  applyCameraMode(map,'3d');
  assert.equal(map.maxPitch,80);assert.equal(map.dragRotate.enabled,true);assert.equal(map.touchPitch.enabled,true);
  assert.equal(map.keyboard.rotation,true);assert.equal(map.touchZoomRotate.rotation,true);
  map.camera.bearing=45;rotateGuard();assert.equal(map.camera.bearing,45);
});
