const modes=new WeakMap();
export function applyCameraMode(map,mode){
  if(!modes.has(map))map.on('rotate',()=>{
    if(modes.get(map)==='2d'&&Math.abs(map.getBearing())>1e-7)map.jumpTo({bearing:0,pitch:0});
  });
  modes.set(map,mode);
  const threeD=mode==='3d';
  if(threeD){
    map.setMaxPitch(80);map.dragRotate.enable();map.touchZoomRotate.enableRotation();map.touchPitch.enable();map.keyboard.enableRotation();
  }else{
    map.dragRotate.disable();map.touchZoomRotate.disableRotation();map.touchPitch.disable();map.keyboard.disableRotation();
    map.setMaxPitch(0);map.jumpTo({pitch:0,bearing:0});
  }
}
