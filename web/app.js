import {modelPropertyRows, renderModelProperties} from './model-properties.js';
import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {BIM_SOURCES, loadBimSource, applyBimSourceVisibility, verifyAttributePackage} from './bim-sources.js';
import {createBasemapStyle, applyBasemapVisibility, BUILDING_LAYER_ID} from './map-basemaps.js';
import {mountCustomBuildings} from './custom-buildings.js';
import {mountSidebarTabs} from './sidebar-tabs.js';
import {mountSidebarCollapse} from './sidebar-collapse.js';
import {bindCardMapFocus} from './card-map-focus.js';
import {applyCameraMode} from './map-camera-mode.js';
import {PUBLIC_DEMO} from './site-config.js';
import {createDemoBuildings} from './demo-buildings.js';
import {strCandidatePlacement,nativeCandidateMatrix,cloneNativeCandidate} from './native-candidate-placement.js';
import {requireAcceptedStrPlacement} from './str-placement-acceptance.js';

const $ = id => document.getElementById(id);
const nativeModel = new URLSearchParams(location.search).get('model') === 'native';
if(PUBLIC_DEMO){
  document.title='多維度空間資料檢視圖台 · 成果展示';
  document.querySelector('.header-meta').textContent='成果展示 · STR 與示意資料';
  $('map-notice').textContent='正在載入 STR 與專案確認定位；自訂建築與基地為示意資料。';
}
const thumbnail=document.querySelector('[data-local-src]');thumbnail.src=thumbnail.dataset.localSrc;
let activeBimSource=nativeModel?'native':'open';
const bimSources=Object.fromEntries(Object.entries(BIM_SOURCES).map(([key,value])=>[key,{...value,visible:true,root:null,promise:null}]));
let mapBimRoot=null,customEditor=null;
const home = {center:[121.0,23.8],zoom:6.8,pitch:0,bearing:0};
let mode='2d', picking=false, placement=null, modelPromise, sourceModel, customLayer, preview, selectedMesh, selectedMaterials;
let toastTimer, importedSequence=0, selectedHighlight;
const imported=new Map();
let customCatalog=[];
function updateLayerCount(){$('layer-count').textContent=`${2+customCatalog.length}項`;}
function renderCustomCatalog(items){
  customCatalog=items;const host=$('custom-building-layers');host.replaceChildren();
  for(const item of items){
    const card=document.createElement('section');card.className='model-card custom-building-card';
    bindCardMapFocus(card,()=>customEditor?.focusOnMap(item.id));
    const top=document.createElement('div');top.className='card-top';
    const icon=document.createElement('span');icon.className='cube-icon';icon.textContent='⌂';
    const heading=document.createElement('div'),name=document.createElement('h3'),type=document.createElement('p');
    name.textContent=item.name;type.textContent='自訂建築';heading.append(name,type);
    const toggle=document.createElement('button');toggle.type='button';toggle.className='card-collapse';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label',`展開${item.name}資料卡`);
    top.append(icon,heading,toggle);
    const label=document.createElement('label');label.className='check-label';const check=document.createElement('input');check.type='checkbox';check.checked=item.visible;label.append(check,document.createTextNode('顯示於地圖'));
    check.onchange=()=>customEditor?.setBuildingVisible(item.id,check.checked);
    const body=document.createElement('div');body.className='card-body';body.hidden=true;const summary=document.createElement('p');summary.className='custom-building-summary';summary.textContent=`${item.floors} 層 · ${item.units} 戶 · 示意配置`;
    const actions=document.createElement('div');actions.className='custom-building-actions';
    const edit=document.createElement('button');edit.className='button secondary';edit.textContent='編輯';edit.onclick=()=>{$('tab-custom-building').click();customEditor?.focusBuilding(item.id);};
    actions.append(edit);body.append(summary,actions);card.append(top,label,body);host.append(card);
    toggle.onclick=()=>{body.hidden=!body.hidden;toggle.setAttribute('aria-expanded',String(!body.hidden));toggle.setAttribute('aria-label',`${body.hidden?'展開':'收折'}${item.name}資料卡`);};
  }
  updateLayerCount();
}
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',5000);}
function showProperties(title,properties){$('feature-title').textContent=title;const dl=$('feature-properties');dl.replaceChildren();for(const [key,value] of Object.entries(properties).slice(0,40)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=typeof value==='object'?JSON.stringify(value):String(value??'—');dl.append(dt,dd);}$('feature-panel').hidden=false;}
$('close-feature').onclick=()=>$('feature-panel').hidden=true;
let vectorStyle=null, basemapFailure=false;
try {const response=await fetch('./map-styles/openfreemap-liberty.json');if(!response.ok)throw new Error('style unavailable');vectorStyle=await response.json();}catch{toast('向量樣式無法載入，先使用街道圖。');$('basemap').value='street';$('basemap').querySelector('[value="vector"]').disabled=true;}
const basemapConfig=createBasemapStyle(vectorStyle);
const map=new maplibregl.Map({container:'map',style:basemapConfig.style,...home,maxPitch:80,canvasContextAttributes:{antialias:true},attributionControl:{compact:true}});
applyCameraMode(map,mode);
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');map.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-left');
map.on('style.load',()=>{$('basemap').disabled=false;syncBasemap();});
map.on('load',()=>map.resize());
map.on('error',e=>{const message=e.error?.message||'';if(e.sourceId==='street'||basemapConfig.vectorSourceIds.includes(e.sourceId)||message.includes('tiles.openfreemap.org')){basemapFailure=true;$('network-status').textContent='底圖連線異常，可切換其他底圖';}else{console.error(e.error);toast('圖層載入遇到問題，請檢查資料與瀏覽器 WebGL 支援。');}});
map.on('mousemove',e=>{$('cursor-coordinate').textContent=`${e.lngLat.lng.toFixed(5)}° E / ${e.lngLat.lat.toFixed(5)}° N`;});
map.on('move',()=>{$('camera-state').textContent=`縮放 ${map.getZoom().toFixed(1)} · 傾角 ${map.getPitch().toFixed(0)}°`;});
function setMode(next){mode=next;applyCameraMode(map,mode);for(const m of ['2d','3d']){$(`mode-${m}`).classList.toggle('active',m===mode);$(`mode-${m}`).setAttribute('aria-pressed',String(m===mode));}map.easeTo({pitch:mode==='3d'?60:0,bearing:mode==='3d'?map.getBearing():0,duration:650});$('view-subtitle').textContent=mode==='3d'?'立體視角 · 拖曳旋轉檢視':'平面視角';if(customLayer)map.setLayoutProperty('bim-preview','visibility',mode==='3d'&&$('show-model').checked?'visible':'none');updateGeojsonMode();syncBasemap();customEditor?.setMode(mode);}
$('mode-2d').onclick=()=>setMode('2d');$('mode-3d').onclick=()=>setMode('3d');
$('home').onclick=()=>{map.flyTo({...home,pitch:mode==='3d'?60:0});};
function updateBuildingHint(){
  const available=$('basemap').value==='vector'&&mode==='3d'&&basemapConfig.available;
  $('show-buildings').disabled=!available;
  $('buildings-hint').textContent=!basemapConfig.available?'向量樣式無法使用':$('basemap').value!=='vector'?'周邊建物需使用 OpenFreeMap 向量底圖':mode!=='3d'?'切換至 3D 模式以顯示周邊建物':!$('show-buildings').checked?'已關閉周邊立體建物':map.getZoom()<14?'放大至街區尺度（縮放 14 以上）即可查看':'已開啟；依目前範圍的 OSM 建物資料顯示';
}
function syncBasemap(){
  applyBasemapVisibility(map,basemapConfig,$('basemap').value,mode,$('show-buildings').checked);
  if(!basemapFailure)$('network-status').textContent={vector:'OpenFreeMap 向量底圖',street:'OpenStreetMap 街道圖',none:'無底圖 · 不新增圖磚請求'}[$('basemap').value];
  updateBuildingHint();
}
$('basemap').onchange=()=>{basemapFailure=false;syncBasemap();};
$('show-buildings').onchange=syncBasemap;
map.on('zoomend',updateBuildingHint);
map.on('idle',updateBuildingHint);
function clearSelection(){if(selectedMesh&&selectedMaterials){selectedMesh.material=selectedMaterials;selectedMesh=null;selectedMaterials=null;selectedHighlight?.dispose();selectedHighlight=null;}$('model-property-rows').replaceChildren();$('model-property-empty').hidden=false;$('model-property-table-wrap').hidden=true;$('clear-model-selection').hidden=true;}
function disposeRoot(root){const geometries=new Set(),materials=new Set(),textures=new Set();root?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});for(const x of [...geometries,...textures,...materials])x.dispose();}
async function ensureSource(key){return loadBimSource(bimSources,key,async url=>{const source=bimSources[key];let gltf;if(source.attributesUrl){const response=await fetch(url);if(!response.ok)throw new Error('模型無法載入');const buffer=await response.arrayBuffer();try{const attributesResponse=await fetch(source.attributesUrl);if(!attributesResponse.ok)throw new Error('屬性檔無法載入');const data=await attributesResponse.json();source.attributes=await verifyAttributePackage(data,buffer);source.glbSha256=data.glb_sha256;}catch(error){source.attributes=null;source.glbSha256=null;toast(error.message+'；僅顯示 GLB 既有資訊。');}gltf=await new GLTFLoader().parseAsync(buffer,'');}else{const response=await fetch(url);if(!response.ok)throw new Error('模型無法載入');const buffer=await response.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',buffer);source.glbSha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');gltf=await new GLTFLoader().parseAsync(buffer,'');}const root=gltf.scene;root.updateMatrixWorld(true);root.traverse(o=>{if(o.isMesh){o.frustumCulled=false;if(!o.geometry.attributes.normal)o.geometry.computeVertexNormals();}});return root;});}
async function ensureModel(){const key=activeBimSource;if(key==='custom')return modelPromise;const root=await ensureSource(key);if(key!==activeBimSource)throw new Error('已切換模型來源');sourceModel=root;return root;}
function disposePreview(){clearSelection();if(!preview)return;preview.observer.disconnect();preview.controls.dispose();preview.renderer.dispose();preview.renderer.domElement.remove();for(const material of preview.materialCopies.values())material.dispose();preview.grid.geometry.dispose();preview.grid.material.dispose();preview=null;}
async function selectBimSource(key){if(activeBimSource==='custom'&&sourceModel)disposeRoot(sourceModel);disposePreview();activeBimSource=key;sourceModel=null;modelPromise=null;document.querySelector('.viewer-header h2').textContent=BIM_SOURCES[key].label;document.querySelector('.viewer-badge').textContent=BIM_SOURCES[key].badge;$('wireframe').checked=false;$('viewer-loading').textContent='正在載入模型…';await openPreview();}
function makeModel(source=sourceModel){const root=source.clone(true),box=new THREE.Box3().setFromObject(root),center=box.getCenter(new THREE.Vector3());const group=new THREE.Group();group.add(root);root.position.sub(new THREE.Vector3(center.x,box.min.y,center.z));return group;}
function lights(scene){scene.add(new THREE.HemisphereLight(0xe1f2ff,0x78816e,2.4));const sun=new THREE.DirectionalLight(0xffffff,2.7);sun.position.set(70,100,50);scene.add(sun);}
async function openPreview(){const dialog=$('model-dialog');if(!dialog.open)dialog.showModal();$('viewer-loading').hidden=false;try{await ensureModel();if(!preview){const host=$('model-viewer'),renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xedf1f4,1);host.append(renderer.domElement);const scene=new THREE.Scene();lights(scene);const root=makeModel();const materialCopies=new Map();root.traverse(o=>{if(o.isMesh){const originals=Array.isArray(o.material)?o.material:[o.material];const copies=originals.map(m=>{if(!materialCopies.has(m))materialCopies.set(m,m.clone());return materialCopies.get(m);});o.material=Array.isArray(o.material)?copies:copies[0];}});scene.add(root);const camera=new THREE.PerspectiveCamera(40,1,.1,3000),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const grid=new THREE.GridHelper(Math.max(size.x,size.z)*1.7,20,0xc6d4da,0xdce4e8);grid.position.y=-.05;scene.add(grid);const draw=()=>renderer.render(scene,camera);const reset=()=>{const radius=size.length()/2;const halfFov=THREE.MathUtils.degToRad(camera.fov/2);const distance=radius/Math.sin(Math.min(halfFov,Math.atan(Math.tan(halfFov)*camera.aspect)))*1.1;camera.position.copy(center).add(new THREE.Vector3(1.25,.85,1.4).normalize().multiplyScalar(distance));camera.near=Math.max(.01,distance/1000);camera.far=Math.max(3000,distance+radius*20);camera.updateProjectionMatrix();controls.target.copy(center);camera.lookAt(center);controls.update();draw();};const resize=()=>{const rect=host.getBoundingClientRect();if(rect.width&&rect.height){renderer.setSize(rect.width,rect.height);const nextAspect=rect.width/rect.height;const changed=Math.abs(camera.aspect-nextAspect)>.01;camera.aspect=nextAspect;camera.updateProjectionMatrix();if(changed)reset();else draw();}};const observer=new ResizeObserver(resize);observer.observe(host);controls.addEventListener('change',draw);let pointerStart;renderer.domElement.addEventListener('pointerdown',e=>{pointerStart=[e.clientX,e.clientY];});renderer.domElement.addEventListener('click',e=>{if(!pointerStart||Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])>5)return;const rect=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);clearSelection();const hit=ray.intersectObject(root,true)[0];if(hit){selectedMesh=hit.object;selectedMaterials=selectedMesh.material;const m=new THREE.MeshStandardMaterial({color:0x2cae9f,side:THREE.DoubleSide});selectedMesh.material=m;selectedHighlight=m;renderModelProperties($('model-property-rows'),modelPropertyRows(hit.object,activeBimSource,bimSources[activeBimSource]?.attributes));$('model-property-empty').hidden=true;$('model-property-table-wrap').hidden=false;$('clear-model-selection').hidden=false;}draw();});preview={renderer,scene,camera,controls,root,draw,reset,resize,observer,materialCopies,grid};reset();}preview.resize();$('viewer-loading').hidden=true;}catch(e){$('viewer-loading').textContent=e.message;toast(e.message);}}
$('preview-model').onclick=()=>selectBimSource('open');$('preview-native').onclick=()=>selectBimSource('native');$('close-viewer').onclick=()=>$('model-dialog').close();$('reset-model-view').onclick=()=>preview?.reset();
$('wireframe').onchange=()=>{clearSelection();preview?.root.traverse(o=>{if(o.isMesh){const original=Array.isArray(o.material)?o.material:[o.material];for(const m of original)m.wireframe=$('wireframe').checked;}});preview?.draw();};
function cancelPicking(){picking=false;$('pick-location').classList.remove('picking');$('pick-location').textContent='⌖ 在地圖上指定位置';map.getCanvas().style.cursor='';}
$('pick-location').onclick=()=>{if(picking){cancelPicking();return;}picking=true;$('pick-location').classList.add('picking');$('pick-location').textContent='點選地圖位置 · 再按取消';map.getCanvas().style.cursor='crosshair';toast('點選地圖指定模型暫放位置；此操作不代表測量定位。');};
map.on('click',e=>{if(customEditor?.onMapClick(e))return;if(picking){$('longitude').value=e.lngLat.lng.toFixed(7);$('latitude').value=e.lngLat.lat.toFixed(7);cancelPicking();$('placement-form').requestSubmit();return;}const ids=[...imported.values()].filter(x=>x.visible).flatMap(x=>x.ids);if(ids.length){const hit=map.queryRenderedFeatures(e.point,{layers:ids.filter(id=>map.getLayer(id))})[0];if(hit)showProperties('GeoJSON 圖徵',hit.properties);}});
$('placement-form').onsubmit=async e=>{e.preventDefault();const lon=Number($('longitude').value),lat=Number($('latitude').value),height=Number($('altitude').value),rotation=Number($('rotation').value);if(![lon,lat,height,rotation].every(Number.isFinite)||lon< -180||lon>180||lat< -85||lat>85){toast('請輸入有效經緯度、高度與旋轉。');return;}try{await Promise.all(Object.keys(bimSources).filter(key=>bimSources[key].visible).map(ensureSource));placement={lon,lat,height,rotation};$('open-placement-note').hidden=true;addMapModel();$('placement-badge').textContent='手動暫放 · 未驗證';$('placement-description').textContent='模型包圍盒底部對齊指定高度。此位置由使用者暫放，不是已驗證的真實位置。';$('clear-placement').disabled=false;$('map-notice').textContent='雙圖層視覺對照 · 各自置中與底部對齊，非共同座標套合驗證';setMode('3d');map.flyTo({center:[lon,lat],zoom:18,pitch:60,bearing:-25});}catch(error){toast(error.message);}};
function addMapModel(){if(map.getLayer('bim-preview'))map.removeLayer('bim-preview');const root=new THREE.Group();for(const [key,source] of Object.entries(bimSources)){if(!source.root)continue;if(placement.kind==='native-candidate')strCandidatePlacement(key,source.glbSha256);const group=placement.kind==='native-candidate'?cloneNativeCandidate(source.root):makeModel(source.root);group.userData.bimSource=key;root.add(group);}mapBimRoot=root;applyBimSourceVisibility(root,bimSources,$('show-model').checked);customLayer={id:'bim-preview',type:'custom',renderingMode:'3d',onAdd(map,gl){this.camera=new THREE.Camera();this.scene=new THREE.Scene();this.scene.add(root);this.candidateMatrix=placement.kind==='native-candidate'?nativeCandidateMatrix(maplibregl.MercatorCoordinate):null;lights(this.scene);this.renderer=new THREE.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:true});this.renderer.autoClear=false;},render(gl,args){const coord=maplibregl.MercatorCoordinate.fromLngLat([placement.lon,placement.lat],placement.height),s=coord.meterInMercatorCoordinateUnits();const matrix=new THREE.Matrix4().makeTranslation(coord.x,coord.y,coord.z).scale(new THREE.Vector3(s,-s,s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI/2)).multiply(new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(placement.rotation)));this.camera.projectionMatrix=new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix).multiply(this.candidateMatrix||matrix);this.renderer.resetState();this.renderer.render(this.scene,this.camera);},onRemove(){this.renderer?.dispose();}};map.addLayer(customLayer);map.setLayoutProperty('bim-preview','visibility',mode==='3d'&&$('show-model').checked?'visible':'none');map.triggerRepaint();}
$('show-model').onchange=()=>{if(customLayer&&map.getLayer('bim-preview'))map.setLayoutProperty('bim-preview','visibility',mode==='3d'&&$('show-model').checked?'visible':'none');};
$('clear-placement').onclick=()=>{if(map.getLayer('bim-preview'))map.removeLayer('bim-preview');customLayer=null;mapBimRoot=null;placement=null;$('open-placement-note').hidden=true;$('longitude').value='';$('latitude').value='';$('placement-badge').textContent='尚未指定';$('placement-description').textContent='模型尚無已驗證座標。可在地圖上指定暫放位置，查看三維整合效果。';$('clear-placement').disabled=true;$('map-notice').textContent='暫放位置已清除；模型仍可在獨立三維視窗檢視。';};
async function applyNativeCandidate(){
  const button=$('apply-native-candidate');button.disabled=true;
  try{
    requireAcceptedStrPlacement();
    await Promise.all(['native','open'].map(ensureSource));
    for(const key of ['native','open'])strCandidatePlacement(key,bimSources[key].glbSha256);
    placement=strCandidatePlacement('native',bimSources.native.glbSha256);
    const visibleKey=activeBimSource==='open'?'open':'native';
    for(const key of ['open','native'])bimSources[key].visible=key===visibleKey;
    $('show-native-bim').checked=bimSources.native.visible;$('show-open-bim').checked=bimSources.open.visible;$('show-model').checked=true;
    addMapModel();
    $('placement-badge').textContent='TWD97 定位已確認';
    $('placement-description').textContent='本專案依使用者裁定採用 RVT「原始位置」（233312），座標系統 TWD97 / TM2 121（EPSG:3826）、來源高程 −0.85 m；開源與原生 STR 共用此定位。確認方式：使用者裁定；RVT 獨立萃取結果已與 IFC 比對相符。下方欄位供手動暫放。';
    $('clear-placement').disabled=false;
    $('map-notice').textContent='STR 專案採用定位 · TWD97 / EPSG:3826 · 使用者確認';
    setMode('3d');map.flyTo({center:[placement.lon,placement.lat],zoom:18,pitch:60,bearing:-25});
    $('open-placement-note').hidden=false;
    toast('兩種 STR 已套用專案確認定位；可切換資料卡的顯示開關比較。');
  }catch(error){toast(error.message);}finally{button.disabled=false;}
}
$('apply-native-candidate').onclick=applyNativeCandidate;
function updateGeojsonMode(){for(const layer of imported.values())for(const id of layer.ids){const isExtrude=id.endsWith('-3d'),isFill=id.endsWith('-fill');map.setLayoutProperty(id,'visibility',layer.visible&&(!isExtrude||mode==='3d')&&(!isFill||mode==='2d')?'visible':'none');}}
function collectCoordinates(value,out=[]){if(Array.isArray(value)){if(value.length>=2&&typeof value[0]==='number'&&typeof value[1]==='number'){if(!Number.isFinite(value[0])||!Number.isFinite(value[1])||Math.abs(value[0])>180||Math.abs(value[1])>90)throw new Error('GeoJSON 請使用 WGS84 經緯度座標，不能直接使用 TWD97 平面座標。');out.push(value);}else for(const item of value)collectCoordinates(item,out);}return out;}
function addGeojson(data,name){if(data.type==='Feature')data={type:'FeatureCollection',features:[data]};else if(data.type!=='FeatureCollection')data={type:'FeatureCollection',features:[{type:'Feature',geometry:data,properties:{}}]};if(!Array.isArray(data.features)||!data.features.length)throw new Error('GeoJSON 沒有可顯示的圖徵。');let bounds=new maplibregl.LngLatBounds(),count=0;for(const f of data.features){const geometries=f.geometry?.type==='GeometryCollection'?f.geometry.geometries:[f.geometry];for(const g of geometries||[])for(const c of collectCoordinates(g?.coordinates)){bounds.extend(c.slice(0,2));count++;}}if(!count)throw new Error('GeoJSON 沒有可顯示的有效座標。');const id=`local-${++importedSequence}`;map.addSource(id,{type:'geojson',data});const polygon=['==',['geometry-type'],'Polygon'];const height=['max',0,['to-number',['get','height'],0]];const layers=[{id:id+'-fill',type:'fill',filter:polygon,paint:{'fill-color':'#168e84','fill-opacity':.32}},{id:id+'-3d',type:'fill-extrusion',filter:polygon,paint:{'fill-extrusion-color':'#52a49b','fill-extrusion-height':height,'fill-extrusion-opacity':.78}},{id:id+'-line',type:'line',paint:{'line-color':'#126f70','line-width':2}},{id:id+'-point',type:'circle',filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':6,'circle-color':'#158b82','circle-stroke-color':'white','circle-stroke-width':2}}];for(const layer of layers)map.addLayer({...layer,source:id});const row=document.createElement('div');row.className='imported-row';const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=true;label.append(check,document.createTextNode(name));const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label','移除 '+name);row.append(label,remove);$('imported-layers').append(row);imported.set(id,{ids:layers.map(l=>l.id),visible:true});check.onchange=()=>{imported.get(id).visible=check.checked;updateGeojsonMode();};remove.onclick=()=>{for(const l of layers)if(map.getLayer(l.id))map.removeLayer(l.id);map.removeSource(id);imported.delete(id);row.remove();$('layer-count').textContent=`${2+customCatalog.length}項`;};$('layer-count').textContent=`${2+customCatalog.length}項`;updateGeojsonMode();map.fitBounds(bounds,{padding:65,maxZoom:18});toast(`已載入 ${data.features.length} 筆圖徵。多邊形 height 屬性以公尺顯示三維高度。`);}
$('file-input').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(!map.isStyleLoaded())throw new Error('地圖仍在準備，請稍後再開啟檔案。');if(file.name.toLowerCase().endsWith('.glb')){if(file.size>150*1024*1024)throw new Error('此預覽站台 GLB 上限為 150 MB，請先拆分模型。');const buffer=await file.arrayBuffer(),view=new DataView(buffer);if(buffer.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength||view.getUint32(16,true)!==0x4e4f534a)throw new Error('不是有效的 GLB 2.0 檔。');const length=view.getUint32(12,true);if(length>buffer.byteLength-20)throw new Error('GLB JSON 區塊長度錯誤。');const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)));for(const x of [...(json.buffers||[]),...(json.images||[])])if(x.uri&&!x.uri.startsWith('data:'))throw new Error('請使用內嵌材質／buffer 的 GLB；不載入外部資源連結。');const gltf=await new GLTFLoader().parseAsync(buffer,'');if($('model-dialog').open)$('model-dialog').close();clearSelection();if(map.getLayer('bim-preview'))$('clear-placement').click();if(preview){preview.observer.disconnect();preview.controls.dispose();preview.renderer.dispose();preview.renderer.domElement.remove();for(const m of preview.materialCopies.values())m.dispose();preview.grid.geometry.dispose();preview.grid.material.dispose();preview=null;}if(activeBimSource==='custom'&&sourceModel)disposeRoot(sourceModel);activeBimSource='custom';sourceModel=gltf.scene;sourceModel.updateMatrixWorld(true);sourceModel.traverse(o=>{if(o.isMesh){o.frustumCulled=false;if(!o.geometry.attributes.normal)o.geometry.computeVertexNormals();}});modelPromise=Promise.resolve(sourceModel);document.querySelector('.viewer-header h2').textContent=file.name;document.querySelector('.viewer-badge').textContent='本機 GLB · 來源與定位未驗證';$('wireframe').checked=false;toast('已在獨立視窗開啟本機 GLB；兩個內建資料圖層仍保留。');await openPreview();}else{if(file.size>25*1024*1024)throw new Error('GeoJSON 上限為 25 MB，請先簡化或分批。');addGeojson(JSON.parse(await file.text()),file.name);}}catch(error){toast(error.message);} };
window.addEventListener('keydown',e=>{if(e.key==='Escape')cancelPicking();});
window.addEventListener('beforeunload',()=>{preview?.observer.disconnect();preview?.controls.dispose();preview?.renderer.dispose();map.remove();});

const sidebarControls=mountSidebarCollapse({body:document.body,button:$('collapse-sidebar'),mobileButton:$('toggle-sidebar'),isMobile:()=>matchMedia('(max-width:650px)').matches,onChange:()=>requestAnimationFrame(()=>map.resize())});
const mapLayoutObserver=new ResizeObserver(()=>map.resize());
mapLayoutObserver.observe(map.getContainer());
async function setBimVisible(key, visible){const source=bimSources[key];source.visible=visible;try{if(placement&&visible){await ensureSource(key);if(!placement)return;addMapModel();}if(mapBimRoot)applyBimSourceVisibility(mapBimRoot,bimSources,$('show-model').checked);map.triggerRepaint();}catch(error){source.visible=false;$(key==='open'?'show-open-bim':'show-native-bim').checked=false;toast(error.message);}}
$('show-open-bim').onchange=e=>setBimVisible('open',e.target.checked);
$('show-native-bim').onchange=e=>setBimVisible('native',e.target.checked);
$('show-model').onchange=()=>{if(mapBimRoot)applyBimSourceVisibility(mapBimRoot,bimSources,$('show-model').checked);if(customLayer&&map.getLayer('bim-preview'))map.setLayoutProperty('bim-preview','visibility',mode==='3d'&&$('show-model').checked?'visible':'none');map.triggerRepaint();};
$('collapse-all-cards').onclick=()=>{
  for(const button of $('panel-data').querySelectorAll('.card-collapse[aria-expanded="true"]'))button.click();
};
for(const button of document.querySelectorAll('.card-collapse'))button.onclick=()=>{
  const expanded=button.getAttribute('aria-expanded')!=='true';
  $(button.getAttribute('aria-controls')).hidden=!expanded;
  button.setAttribute('aria-expanded',String(expanded));
  button.setAttribute('aria-label',button.getAttribute('aria-label').replace(expanded?'展開':'收折',expanded?'收折':'展開'));

};
for(const [selector,key]of [['#panel-data>.model-card:not(.native-card)','open'],['#panel-data>.native-card','native']]){
  bindCardMapFocus(document.querySelector(selector),()=>{
    if(!placement||!map.getLayer('bim-preview')){toast('此模型尚未在地圖上指定位置。');return;}
    if(!bimSources[key].visible||!$('show-model').checked){toast('此模型目前未顯示於地圖。');return;}
    setMode('3d');map.flyTo({center:[placement.lon,placement.lat],zoom:18,pitch:60,bearing:map.getBearing(),duration:800});
  });
}
customEditor=mountCustomBuildings({map,setMode,getMode:()=>mode,showProperties,toast,cancelBimPicking:cancelPicking,onCatalogChange:renderCustomCatalog,initialData:PUBLIC_DEMO?createDemoBuildings():null});
mountSidebarTabs({buttons:[...document.querySelectorAll('.function-tab')],getPanel:$,sidebar:document.querySelector('.sidebar'),title:$('sidebar-title'),onSelect:button=>{sidebarControls.open();customEditor?.setPanelActive(button.id==='tab-custom-building');cancelPicking();if(button.id==='tab-custom-building')customEditor?.startNew();if(button.id!=='tab-custom-building')$('close-building-editor').click();if(matchMedia('(max-width:650px)').matches){document.body.classList.add('sidebar-open');$('toggle-sidebar').setAttribute('aria-expanded','true');}}});
if(nativeModel) await selectBimSource('native');

$('clear-model-selection').onclick=()=>{clearSelection();preview?.draw();};
if(map.isStyleLoaded())void applyNativeCandidate();else map.once('load',applyNativeCandidate);
