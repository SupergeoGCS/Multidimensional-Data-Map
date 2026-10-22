import {convertCoordinate} from './parcel-import.js';
import * as THREE from './vendor/three.module.js';
import {RVT_STR_PLACEMENT} from './rvt-str-placement.js';

// Coordinates originate in the RVT record; IFC is only the validation reference.
const rvtMatrix=RVT_STR_PLACEMENT.local_to_shared_m_row_major;
export const NATIVE_CANDIDATE={
  crs:RVT_STR_PLACEMENT.crs_assumption,easting:rvtMatrix[0][3],northing:rvtMatrix[1][3],height:rvtMatrix[2][3],
  cos:rvtMatrix[0][0],sin:rvtMatrix[1][0],
  glbSha256:'e16b819e6cd63d11faf72d77981d9c6696253994434fe5cae0d7d39c04c39b00',
};
export const OPEN_CANDIDATE_GLB_SHA256='b9f5bbbed105d38d942bc96d0c37bced406e2c2381c4733395242ef30e5ce98f';
export function strCandidatePlacement(sourceKey,hash){
  const expected=sourceKey==='native'?NATIVE_CANDIDATE.glbSha256:sourceKey==='open'?OPEN_CANDIDATE_GLB_SHA256:null;
  if(!expected||hash!==expected)throw new Error('STR 模型版本不符，無法套用候選定位。');
  const p=NATIVE_CANDIDATE,[lon,lat]=convertCoordinate([p.easting,p.northing],p.crs);
  return {kind:'native-candidate',lon,lat,height:p.height,rotation:Math.atan2(p.sin,p.cos)*180/Math.PI};
}
export function nativeCandidatePlacement(hash){
  return strCandidatePlacement('native',hash);
}
export function nativeCandidateMatrix(MercatorCoordinate){
  const p=NATIVE_CANDIDATE;
  const project=(east,north)=>MercatorCoordinate.fromLngLat(convertCoordinate([east,north],p.crs),p.height);
  const origin=project(p.easting,p.northing);
  const x=project(p.easting+p.cos,p.northing+p.sin),y=project(p.easting-p.sin,p.northing+p.cos);
  const scale=origin.meterInMercatorCoordinateUnits();
  // GLB Y-up: (x,y,z) corresponds to IFC (x,-z,y). Keep its original origin.
  return new THREE.Matrix4().set(
    x.x-origin.x,0,origin.x-y.x,origin.x,
    x.y-origin.y,0,origin.y-y.y,origin.y,
    0,scale,0,origin.z,
    0,0,0,1,
  );
}
export function cloneNativeCandidate(source){return source.clone(true);}
