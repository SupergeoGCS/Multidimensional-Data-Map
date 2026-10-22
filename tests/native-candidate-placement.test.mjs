import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../web/vendor/three.module.js';
import {convertCoordinate} from '../web/parcel-import.js';
import {NATIVE_CANDIDATE as p,OPEN_CANDIDATE_GLB_SHA256,strCandidatePlacement,nativeCandidatePlacement,nativeCandidateMatrix,cloneNativeCandidate} from '../web/native-candidate-placement.js';

const Mercator={fromLngLat([lon,lat],alt){
  const circumference=2*Math.PI*6378137,scale=1/(circumference*Math.cos(lat*Math.PI/180));
  return {x:(lon+180)/360,y:(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2,z:alt*scale,meterInMercatorCoordinateUnits:()=>scale};
}};
test('native candidate is bound to the published native model and uses the audited origin',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../web/assets/manifest.json',import.meta.url),'utf8'));
  assert.equal(p.glbSha256,manifest.files['native-str.glb'].sha256);
  assert.throws(()=>nativeCandidatePlacement('wrong-version'),/版本不符/);
  const location=nativeCandidatePlacement(p.glbSha256);
  assert.ok(Math.abs(location.lon-121.2082316867)<1e-9);
  assert.ok(Math.abs(location.lat-25.0213486824)<1e-9);
  assert.ok(Math.abs(location.height+.85)<1e-10);
  assert.ok(Math.abs(location.rotation-41.33)<.02);
});
test('open STR inherits the same candidate only for the audited open model and keeps its feet-to-metres transform',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../web/assets/manifest.json',import.meta.url),'utf8'));
  assert.equal(OPEN_CANDIDATE_GLB_SHA256,manifest.files['str.glb'].sha256);
  assert.deepEqual(strCandidatePlacement('open',OPEN_CANDIDATE_GLB_SHA256),nativeCandidatePlacement(p.glbSha256));
  assert.throws(()=>strCandidatePlacement('open',p.glbSha256),/版本不符/);
  assert.throws(()=>strCandidatePlacement('unknown',p.glbSha256),/版本不符/);
  const source=new THREE.Group(),root=new THREE.Group();source.add(root);
  root.scale.setScalar(.3048);root.rotation.x=-Math.PI/2;source.updateMatrixWorld(true);
  const copy=cloneNativeCandidate(source);copy.updateMatrixWorld(true);
  const original=new THREE.Vector3(10,20,30).applyMatrix4(root.matrixWorld);
  const cloned=new THREE.Vector3(10,20,30).applyMatrix4(copy.children[0].matrixWorld);
  assert.deepEqual(cloned.toArray(),original.toArray());
  assert.ok(Math.abs(cloned.x-3.048)<1e-9);
  assert.ok(Math.abs(cloned.y-9.144)<1e-9);
  assert.ok(Math.abs(cloned.z+6.096)<1e-9);
});
test('candidate matrix preserves source origin, IFC rotation, Y-up axes and source elevation',()=>{
  const matrix=nativeCandidateMatrix(Mercator);
  for(const [x,y,z]of [[0,0,0],[100,50,12],[20,30,-8]]){
    const expected=Mercator.fromLngLat(convertCoordinate([p.easting+p.cos*x-p.sin*y,p.northing+p.sin*x+p.cos*y],p.crs),p.height+z);
    const actual=new THREE.Vector3(x,z,-y).applyMatrix4(matrix);
    const metres=expected.meterInMercatorCoordinateUnits();
    assert.ok(Math.abs(actual.x-expected.x)/metres<.02);
    assert.ok(Math.abs(actual.y-expected.y)/metres<.02);
    assert.ok(Math.abs(actual.z-expected.z)/metres<.001);
  }
  const original=new THREE.Group();original.position.set(10,-12,20);
  const copy=cloneNativeCandidate(original);
  assert.notEqual(copy,original);assert.deepEqual(copy.position.toArray(),[10,-12,20]);
  assert.deepEqual(original.position.toArray(),[10,-12,20]);
});
