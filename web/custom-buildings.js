import {normalizeParcels,generateBuilding,parcelArea,rectangleAt,polygonLabelAnchor} from './custom-building-geometry.js';
import {readParcelFile} from './parcel-import.js';
import {createBuildingFloorLabels} from './building-floor-labels.js';
import {createBuildingSelectionOverlay} from './building-selection-overlay.js';
import {createBuildingFloorSwitcher} from './building-floor-switcher.js';

const empty=()=>({type:'FeatureCollection',features:[]});
const KEY='spatial-workspace-custom-buildings-v1';
export function mountCustomBuildings({map,setMode,getMode,showProperties,toast,cancelBimPicking,onCatalogChange=()=>{}}) {
  const $=id=>document.getElementById(id);
  let parcels=[],sourceName='',sourceCrs='',selected=-1,drawPoints=null,buildings=[],activeId=null,drawingAnchor=null;
  let draggedVertex=null,restoreDragPan=false,suppressClickUntil=0;
  let hoveredHousing=null,selectedHousing=null,renderedHousing=[];
  let panelActive=false;
  let floorLabels=null;
  let selectionOverlay=null;
  let floorSwitcherBuildingId=null;
  const buildingFloorFilters=new Map();
  const highlightStates=new Map();
  const housingColor=['case',['boolean',['feature-state','selected'],false],'#ffb52e',['boolean',['feature-state','hovered'],false],'#16d9bd',['boolean',['feature-state','hoveredFloor'],false],'#9fe4d5',['boolean',['feature-state','selectedFloor'],false],'#f4d99a',['get','color']];
  const ids=['studio-parcels-fill','studio-parcels-line','studio-housing-2d','studio-housing-3d','studio-housing-points'];
  const source=(id,data)=>map.getSource(id)?.setData(data);
  const selectedParcel=()=>parcels[selected];
  const floorFilterFor=id=>buildingFloorFilters.get(id)??$('building-floor-filter').value;
  const floorSwitcher=createBuildingFloorSwitcher($('building-floor-switcher'),value=>{if(!floorSwitcherBuildingId)return;buildingFloorFilters.set(floorSwitcherBuildingId,value);render();});
  function syncFloorSwitcher(){
    const building=buildings.find(b=>b.config.id===floorSwitcherBuildingId&&b.visible!==false);
    const visible=Boolean(building&&$('custom-building-visible').checked);
    if(!visible)floorSwitcherBuildingId=null;
    const options=[{value:'above',label:'全部',title:'顯示全部地上樓層'}];
    for(let floor=building?.config.floors||0;floor>=1;floor--)options.push({value:String(floor),label:`${floor}`,title:`顯示 ${floor} 樓`});
    for(let floor=1;floor<=(building?.config.basementFloors||0);floor++)options.push({value:String(-floor),label:`B${floor}`,title:`顯示地下 ${floor} 樓（抬升示意）`});
    floorSwitcher.update(options,floorFilterFor(floorSwitcherBuildingId),visible);
  }
  function syncParcelVisibility(){for(const id of ids.slice(0,2))if(map.getLayer(id))map.setLayoutProperty(id,'visibility',panelActive?'visible':'none');}
  function ready(){
    if(map.getSource('studio-parcels'))return;
    map.addSource('studio-parcels',{type:'geojson',data:empty()});
    map.addSource('studio-housing',{type:'geojson',promoteId:'unitId',data:empty()});
    map.addSource('studio-points',{type:'geojson',data:empty()});
    map.addLayer({id:ids[0],type:'fill',source:'studio-parcels',paint:{'fill-color':['case',['get','selected'],'#1c9d8d','#a7b8c2'],'fill-opacity':.14}});
    map.addLayer({id:ids[1],type:'line',source:'studio-parcels',paint:{'line-color':['case',['get','selected'],'#078f84','#81959d'],'line-width':['case',['get','selected'],3,1.5]}});
    map.addLayer({id:ids[2],type:'fill',source:'studio-housing',paint:{'fill-color':[...housingColor.slice(0,-1),['case',['==',['get','usage'],'common'],'#d9dfe5','#cde4e8']],'fill-opacity':.9}});
    map.addLayer({id:'studio-unit-boundaries',type:'line',source:'studio-housing',paint:{'line-color':'#688c96','line-width':1}});
    map.addSource('studio-footprints',{type:'geojson',data:empty()});
    map.addLayer({id:'studio-footprint-halo',type:'line',source:'studio-footprints',paint:{'line-color':'#fff','line-width':6,'line-opacity':.95}});
    map.addLayer({id:'studio-footprint-outline',type:'line',source:'studio-footprints',paint:{'line-color':'#246371','line-width':2.5}});
    map.addLayer({id:ids[3],type:'fill-extrusion',source:'studio-housing',paint:{'fill-extrusion-color':housingColor,'fill-extrusion-base':['get','displayBase'],'fill-extrusion-height':['get','wallHeight'],'fill-extrusion-opacity':0.65,'fill-extrusion-vertical-gradient':false}});
    map.addSource('studio-floor-bands',{type:'geojson',data:empty()});
    map.addLayer({id:'studio-floor-bands',type:'fill-extrusion',source:'studio-floor-bands',paint:{'fill-extrusion-color':'#8f969c','fill-extrusion-vertical-gradient':false,'fill-extrusion-base':['get','base'],'fill-extrusion-height':['get','height'],'fill-extrusion-opacity':0.75}});
    map.addLayer({id:ids[4],type:'circle',source:'studio-points',paint:{'circle-radius':4,'circle-color':'#143e52','circle-stroke-color':'white','circle-stroke-width':1},minzoom:17});
    map.addSource('studio-drawing',{type:'geojson',data:empty()});
    map.addLayer({id:'studio-drawing-fill',type:'fill',source:'studio-drawing',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':'#159d8e','fill-opacity':.16}});
    map.addLayer({id:'studio-drawing-line',type:'line',source:'studio-drawing',filter:['!=',['geometry-type'],'Point'],paint:{'line-color':'#078f84','line-width':2.5}});
    map.addLayer({id:'studio-drawing-vertices',type:'circle',source:'studio-drawing',filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':['case',['==',['get','index'],1],7,5.5],'circle-color':['case',['==',['get','index'],1],'#087c79','#fff'],'circle-stroke-color':'#087c79','circle-stroke-width':2}});
    floorLabels=createBuildingFloorLabels(map,$('building-floor-labels'));
    selectionOverlay=createBuildingSelectionOverlay(map);
    render();
    syncParcelVisibility();
    try{const saved=localStorage.getItem(KEY);if(saved)unpack(JSON.parse(saved));}catch{toast('自訂建築存檔無法自動載入，請檢查或重新匯入 JSON。');}
  }
  if(map.isStyleLoaded())ready();else map.once('load',ready);
  function requireMap(){if(!map.getSource('studio-parcels'))throw new Error('地圖仍在準備，請稍後再試。');}
  function boundsOf(features){const b=new maplibregl.LngLatBounds();const walk=x=>{if(typeof x[0]==='number')b.extend(x.slice(0,2));else x.forEach(walk);};features.forEach(f=>walk(f.geometry.coordinates));return b;}
  function fit(features){if(features.length)map.fitBounds(boundsOf(features),{padding:{top:95,bottom:100,left:45,right:45},pitch:getMode()==='3d'?60:0,bearing:getMode()==='3d'?-20:0,maxZoom:19,duration:700});}
  function displayParcels(){source('studio-parcels',{type:'FeatureCollection',features:parcels.map((f,i)=>({...f,properties:{...f.properties,studioIndex:i,selected:i===selected}}))});}
  function refreshParcelOptions(){
    const select=$('parcel-select');select.replaceChildren();
    parcels.forEach((f,i)=>{const p=f.properties||{};const label=p['地號']||p['地段地號']||p.parcel_no||p.name||Object.values(p).find(v=>typeof v==='string')||`宗地 ${i+1}`;select.add(new Option(`${i+1} · ${String(label).slice(0,50)}`,String(i)));});
    if(!parcels.length)select.add(new Option('尚未加入基地',''));
    select.value=selected<0?'':String(selected);selectParcel(false);
  }
  function selectParcel(move=true){
    selected=Number($('parcel-select').value);if(!parcels.length)selected=-1;
    displayParcels();
    if(selectedParcel()){
      const area=parcelArea(selectedParcel());
      $('parcel-info').textContent=sourceName==='地圖手繪'?`手繪區域面積：${area.toFixed(1)} m²`:`${sourceName} · ${sourceCrs} · 基地估算面積 ${area.toFixed(1)} m²。保留宗地邊界，建築輪廓另行配置。`;
      $('building-area').value=area.toFixed(1);
      if(move)fit([selectedParcel()]);
    }
  }
  function setParcels(data,name,crs){requireMap();const next=normalizeParcels(data);parcels=next.features||next;selected=0;sourceName=name;sourceCrs=crs;refreshParcelOptions();fit(parcels);}
  function formConfig(){
    if(!activeId&&buildings.length>=50)throw new Error('第一版最多建立 50 棟建築，請先移除或另存既有資料。');
    const siteArea=selectedParcel()?parcelArea(selectedParcel()):0,area=siteArea;
    if(!Number.isFinite(area)||area<10||area>siteArea)throw new Error('目標占地須介於 10 m² 與基地面積之間。');
    return {id:activeId||crypto.randomUUID(),name:$('building-name').value.trim()||'自訂住宅',floors:Number($('building-floors').value),floorHeight:Number($('building-floor-height').value),unitsPerFloor:Number($('building-units').value),basementFloors:Number($('building-basements').value),basementHeight:Number($('building-basement-height').value),rotation:Number($('building-rotation').value),layout:$('building-layout').value,commonAreaRatio:Number($('building-common-ratio').value)/100,coverage:1,targetArea:area,footprintMode:'parcel'};
  }
  function refreshBuildings(){const select=$('saved-building-select');select.replaceChildren();buildings.forEach(b=>select.add(new Option(b.config.name,b.config.id)));if(!buildings.length)select.add(new Option('尚無建築',''));select.value=activeId||'';onCatalogChange(buildings.map(b=>({id:b.config.id,name:b.config.name,type:'自訂建築',floors:b.config.floors,units:b.config.floors*b.config.unitsPerFloor,visible:b.visible!==false})));}
  function floorOptions(){const filter=$('building-floor-filter'),old=filter.value;filter.replaceChildren(new Option('全部地上樓層','above'));const floors=Math.max(0,...buildings.map(b=>b.config.floors)),basements=Math.max(0,...buildings.map(b=>b.config.basementFloors));for(let f=floors;f>=1;f--)filter.add(new Option(`${f}樓`,String(f)));for(let f=1;f<=basements;f++)filter.add(new Option(`地下${f}樓 · 抬升示意`,String(-f)));filter.value=[...filter.options].some(o=>o.value===old)?old:'above';}
  function syncHighlights(){
    const available=new Set(renderedHousing.map(f=>f.properties.unitId));
    if(hoveredHousing&&!available.has(hoveredHousing.unitId))hoveredHousing=null;
    if(selectedHousing&&!available.has(selectedHousing.unitId)){selectedHousing=null;$('feature-panel').hidden=true;}
    for(const id of highlightStates.keys())if(!available.has(id)){map.removeFeatureState?.({source:'studio-housing',id});highlightStates.delete(id);}
    for(const {properties:p}of renderedHousing){
      const sameFloor=other=>Boolean(other&&p.buildingId===other.buildingId&&Number(p.floor)===Number(other.floor));
      const state={selected:p.unitId===selectedHousing?.unitId,hovered:p.unitId===hoveredHousing?.unitId,hoveredFloor:sameFloor(hoveredHousing),selectedFloor:sameFloor(selectedHousing)};
      const key=JSON.stringify(state);if(highlightStates.get(p.unitId)===key)continue;
      map.setFeatureState?.({source:'studio-housing',id:p.unitId},state);highlightStates.set(p.unitId,key);
    }
    const overlay=[];
    if(getMode()==='3d'&&$('custom-building-visible').checked){
      for(const target of [selectedHousing,hoveredHousing]){
        if(!target)continue;
        for(const feature of renderedHousing){
          const p=feature.properties;if(p.buildingId!==target.buildingId||Number(p.floor)!==Number(target.floor))continue;
          overlay.push({feature,color:target===hoveredHousing?'#008f80':'#e49a00',strong:p.unitId===target.unitId});
        }
      }
    }
    const envelopes=getMode()==='3d'&&$('custom-building-visible').checked
      ?buildings.filter(b=>b.visible!==false&&floorFilterFor(b.config.id)!=='above').map(b=>({geometry:b.generated.metadata.footprint,height:b.config.floors*b.config.floorHeight})):[];
    selectionOverlay?.update(overlay,envelopes);
    syncFloorSwitcher();
  }
  function hoverHousing(e){
    if(drawPoints||!map.getSource('studio-housing'))return;
    const layers=ids.slice(2).filter(id=>map.getLayer(id));
    const hit=layers.length?map.queryRenderedFeatures(e.point,{layers}).find(f=>f.properties.unitId):null;
    const next=hit?.properties||null;if(next?.unitId===hoveredHousing?.unitId)return;
    hoveredHousing=next;syncHighlights();map.getCanvas().style.cursor=next?'pointer':'';
  }
  function clearHousingSelection(){
    const buildingId=floorSwitcherBuildingId||selectedHousing?.buildingId;
    if(buildingId)buildingFloorFilters.set(buildingId,'above');
    selectedHousing=null;hoveredHousing=null;floorSwitcherBuildingId=null;
    if(buildingId)render();else syncHighlights();
  }
  $('close-feature').addEventListener?.('click',clearHousingSelection);
  map.on?.('mouseout',()=>{hoveredHousing=null;syncHighlights();if(!drawPoints)map.getCanvas().style.cursor='';});
  map.on?.('moveend',()=>{
    if(!floorSwitcherBuildingId||drawPoints)return;
    const {clientWidth:w,clientHeight:h}=map.getContainer();
    const layers=ids.slice(2).filter(id=>map.getLayer(id));
    const hits=map.queryRenderedFeatures([[w*.1,h*.1],[w*.9,h*.9]],{layers});
    if(!hits.some(f=>f.properties.buildingId===floorSwitcherBuildingId)){
      hoveredHousing=null;clearHousingSelection();$('feature-panel').hidden=true;
    }
  });
  function render(){
    if(!map.getSource('studio-housing'))return;
    const filter=$('building-floor-filter').value,features=[],points=[],bands=[],labels=new Map();
    for(const b of buildings.filter(b=>b.visible!==false))for(const f of b.generated.features){
      const filter=floorFilterFor(b.config.id);
      const p=f.properties;if(!['Polygon','MultiPolygon'].includes(f.geometry.type))continue;
      if(filter==='above'?p.underground:Number(filter)!==p.floor)continue;
      const base=p.underground?0:p.base,height=p.underground?b.config.basementHeight:p.base+p.height;
      const separated=!p.underground&&p.floor<b.config.floors;
      features.push({...f,id:p.unitId,properties:{...p,buildingName:b.config.name,color:p.usage==='common'?'#d6dce1':'#f5f5f3',displayBase:base,displayHeight:height,wallHeight:separated?height-.05:height}});
      const floorId=`${b.config.id}:${p.floor}`;
      if(!labels.has(floorId)){
        const footprint=b.generated.metadata.footprint;
        const polygons=footprint.type==='MultiPolygon'?footprint.coordinates:[footprint.coordinates];
        labels.set(floorId,{id:floorId,buildingId:b.config.id,buildingName:b.config.name,text:p.floor<0?`地下${-p.floor}樓`:`${p.floor}樓`,altitude:base+p.height/2,coordinates:polygons.flatMap(polygon=>polygon[0])});
        if(separated)bands.push({type:'Feature',properties:{base:height-.05,height},geometry:footprint});
      }
      // Representative point is a location within the generated rectangular unit, not an entrance.
      const outer=f.geometry.type==='MultiPolygon'?f.geometry.coordinates[0][0]:f.geometry.coordinates[0],ring=outer.slice(0,-1),center=p.representative_point||[0,1].map(axis=>ring.reduce((sum,c)=>sum+c[axis],0)/ring.length);
      if(filter!=='above'||getMode()==='2d')points.push({type:'Feature',geometry:{type:'Point',coordinates:center},properties:{...p,buildingName:b.config.name}});
    }
    source('studio-housing',{type:'FeatureCollection',features});source('studio-points',{type:'FeatureCollection',features:points});
    renderedHousing=features;highlightStates.clear();syncHighlights();
    const visible=$('custom-building-visible').checked;
    const displayedBuildings=new Set(features.map(f=>f.properties.buildingId));
    source('studio-footprints',{type:'FeatureCollection',features:buildings.filter(b=>displayedBuildings.has(b.config.id)).map(b=>({type:'Feature',properties:{buildingId:b.config.id},geometry:b.generated.metadata.footprint}))});
    for(const id of ['studio-unit-boundaries','studio-footprint-halo','studio-footprint-outline'])map.setLayoutProperty(id,'visibility',visible&&getMode()==='2d'?'visible':'none');
    source('studio-floor-bands',{type:'FeatureCollection',features:bands});
    map.setLayoutProperty('studio-floor-bands','visibility',visible&&getMode()==='3d'?'visible':'none');
    floorLabels?.update([...labels.values()],visible&&getMode()==='3d');
    map.setLayoutProperty(ids[2],'visibility',visible&&getMode()==='2d'?'visible':'none');
    map.setLayoutProperty(ids[3],'visibility',visible&&getMode()==='3d'?'visible':'none');
    map.setLayoutProperty(ids[4],'visibility',visible?'visible':'none');
    if(filter!=='above'&&Number(filter)<0)$('building-result').textContent=`目前為 B${Math.abs(Number(filter))} 抬升示意檢視，非真實地表高程。`;
    else {const active=buildings.find(b=>b.config.id===activeId);if(active)$('building-result').textContent=resultText(active);}
  }
  function resultText(b){const m=b.generated.metadata||{};const polygon=b.generated.features.find(f=>!f.properties.underground);const area=m.footprintArea??(polygon?parcelArea(polygon)*b.config.unitsPerFloor:0);const summary=`${b.config.name} · ${b.config.floors} 層／${b.config.floors*b.config.unitsPerFloor} 戶 · 地下 ${b.config.basementFloors} 層。`;return m.footprintMode==='parcel'?`${summary} 單層樓板約 ${area.toFixed(1)} m²；地上合計 ${m.aboveGroundFloorArea.toFixed(1)} m²；地下合計 ${m.basementFloorArea.toFixed(1)} m²。每層中央公設 ${(m.commonAreaPerFloor||0).toFixed(1)} m²（${((m.commonAreaRatio||0)*100).toFixed(1)}%）；扣除後每戶約 ${((m.residentialAreaPerFloor??area)/b.config.unitsPerFloor).toFixed(1)} m²。未扣牆體，分戶為示意。`:`${summary} 原矩形模型占地約 ${Number(area).toFixed(1)} m²；重新產生後改依占地輪廓。`;}
  function open(){ $('building-editor').hidden=false;if($('model-dialog').open)$('model-dialog').close();cancelBimPicking(); }
  function positionDrawingLabel(){
    const label=$('drawing-measurement');
    if(drawingAnchor){const point=map.project(drawingAnchor);label.style.left=`${point.x}px`;label.style.top=`${point.y}px`;label.style.transform='translate(-50%,-50%)';}
    else{label.style.left='50%';label.style.top='94px';label.style.transform='translateX(-50%)';}
  }
  map.on?.('move',()=>{if(drawPoints)positionDrawingLabel();});
  map.on?.('resize',()=>{if(drawPoints)positionDrawingLabel();});
  function endVertexDrag(){
    if(draggedVertex===null)return;
    draggedVertex=null;suppressClickUntil=Date.now()+250;
    if(restoreDragPan)map.dragPan.enable();restoreDragPan=false;
    map.getCanvas().style.cursor=drawPoints?'crosshair':'';
  }
  function beginVertexDrag(e){
    if(!drawPoints||draggedVertex!==null)return;
    if(e.originalEvent?.button!=null&&e.originalEvent.button!==0)return;
    const index=Number(e.features?.[0]?.properties.index)-1;
    if(!Number.isInteger(index)||index<0||index>=drawPoints.length)return;
    e.preventDefault();draggedVertex=index;restoreDragPan=map.dragPan?.isEnabled()||false;
    map.dragPan?.disable();map.getCanvas().style.cursor='grabbing';
  }
  function moveVertex(e){
    if(draggedVertex===null||!drawPoints){hoverHousing(e);return;}
    const position=e.lngLat||e.lngLats?.[0];if(!position)return;
    e.preventDefault();drawPoints[draggedVertex]=[position.lng,position.lat];updateDrawing();
  }
  map.on?.('mousedown','studio-drawing-vertices',beginVertexDrag);
  map.on?.('touchstart','studio-drawing-vertices',beginVertexDrag);
  map.on?.('mousemove',moveVertex);map.on?.('touchmove',moveVertex);
  map.on?.('mouseup',endVertexDrag);map.on?.('touchend',endVertexDrag);map.on?.('touchcancel',endVertexDrag);
  map.on?.('mouseenter','studio-drawing-vertices',()=>{if(drawPoints&&draggedVertex===null)map.getCanvas().style.cursor='grab';});
  map.on?.('mouseleave','studio-drawing-vertices',()=>{if(drawPoints&&draggedVertex===null)map.getCanvas().style.cursor='crosshair';});
  window.addEventListener('mouseup',endVertexDrag);window.addEventListener('blur',endVertexDrag);
  function updateDrawing(){
    drawingAnchor=null;let areaText='';
    const points=drawPoints||[],features=points.map((coordinates,index)=>({type:'Feature',properties:{index:index+1},geometry:{type:'Point',coordinates}}));
    let message=`${points.length} 個轉折點 · 至少三點才能計算面積`;
    if(points.length>=3){
      const polygon={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[...points,points[0]]]}};
      try{const area=parcelArea(polygon);features.unshift(polygon);areaText=`估算面積 ${area.toLocaleString('zh-TW',{maximumFractionDigits:1})} m²`;message=`${points.length} 個轉折點 · ${areaText}`;drawingAnchor=polygonLabelAnchor(points);}
      catch{message=`${points.length} 個轉折點 · 範圍無效，請避免交叉或重複頂點`;}
    }
    if(points.length>=2&&!features.some(f=>f.geometry.type==='Polygon'))features.unshift({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:points}});
    source('studio-drawing',{type:'FeatureCollection',features});
    $('drawing-measurement').textContent=drawingAnchor?areaText:message;$('drawing-measurement').hidden=!drawPoints;positionDrawingLabel();
    if(drawPoints)$('parcel-info').textContent=message+'。可拖曳圓點調整；實心圓為起點。';
  }
  function cancelDraw(){endVertexDrag();drawPoints=null;updateDrawing();$('finish-parcel').hidden=true;$('draw-parcel').textContent='地圖繪製基地';map.getCanvas().style.cursor='';displayParcels();}
  if($('open-building-editor')) $('open-building-editor').onclick=open;
  $('close-building-editor').onclick=()=>{$('building-editor').hidden=true;cancelDraw();};
  $('parcel-select').onchange=()=>selectParcel();
  $('parcel-input').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{const result=await readParcelFile(file,$('parcel-crs').value);setParcels(result.data,file.name,result.crsLabel);toast('已匯入地籍範圍，請選取宗地。');}catch(error){toast(error.message);}};
  $('demo-parcel').onclick=()=>{try{setParcels({type:'Feature',properties:{name:'示意宗地（非真實地籍）'},geometry:rectangleAt([121.535,25.045],900,1.5,0)},'示意基地','WGS84 · 非真實地籍');}catch(e){toast(e.message);}};
  $('draw-parcel').onclick=()=>{if(drawPoints){cancelDraw();return;}try{requireMap();}catch(e){toast(e.message);return;}cancelBimPicking();drawPoints=[];updateDrawing();$('draw-parcel').textContent='取消繪製';$('finish-parcel').hidden=false;map.getCanvas().style.cursor='crosshair';setMode('2d');toast('在地圖依序點選基地頂點，完成後按「完成繪製」。');};
  $('finish-parcel').onclick=()=>{try{if(!drawPoints||drawPoints.length<3)throw new Error('至少需要三個頂點。');const coordinates=[...drawPoints,drawPoints[0]];setParcels({type:'Feature',properties:{name:'手繪基地'},geometry:{type:'Polygon',coordinates:[coordinates]}},'地圖手繪','WGS84 · 人工定義');cancelDraw();}catch(e){toast(e.message);}};
  $('custom-building-form').onsubmit=e=>{e.preventDefault();try{requireMap();if(!selectedParcel())throw new Error('請先匯入、繪製或載入示意基地。');const config=formConfig(),parcel=structuredClone(selectedParcel()),generated=generateBuilding(config,parcel);const b={config,parcel,sourceName,sourceCrs,generated},index=buildings.findIndex(x=>x.config.id===config.id);if(index<0)buildings.push(b);else buildings[index]=b;activeId=config.id;refreshBuildings();floorOptions();$('building-floor-filter').value='above';$('building-result').textContent=resultText(b);render();setMode('3d');fit([parcel]);toast('已建立自訂建築，點選住宅可查看樓層與戶號。');}catch(error){toast(error.message);}};
  function loadActive(){const b=buildings.find(b=>b.config.id===$('saved-building-select').value);if(!b)return;activeId=b.config.id;parcels=[structuredClone(b.parcel)];selected=0;sourceName=b.sourceName;sourceCrs=b.sourceCrs;refreshParcelOptions();const c=b.config;for(const [id,key] of [['building-name','name'],['building-floors','floors'],['building-floor-height','floorHeight'],['building-units','unitsPerFloor'],['building-basements','basementFloors'],['building-basement-height','basementHeight'],['building-rotation','rotation'],['building-layout','layout']])$(id).value=c[key];$('building-area').value=parcelArea(b.parcel).toFixed(1);$('building-common-ratio').value=(c.commonAreaRatio??0)*100;floorOptions();render();$('building-result').textContent=resultText(b);fit([b.parcel]);}
  $('saved-building-select').onchange=loadActive;
  $('building-floor-filter').onchange=()=>{buildingFloorFilters.clear();render();};$('custom-building-visible').onchange=render;
  function startNew(){
    cancelDraw();activeId=null;parcels=[];selected=-1;sourceName='';sourceCrs='';refreshParcelOptions();
    const defaults={'building-name':'自訂住宅','building-area':'300','building-rotation':'0','building-floors':'8','building-floor-height':'3.2','building-basements':'0','building-basement-height':'3.5','building-units':'4','building-layout':'double','building-common-ratio':'0','parcel-crs':'auto'};
    for(const [id,value]of Object.entries(defaults))$(id).value=value;
    $('parcel-info').textContent='新增建築：請匯入地籍、繪製基地或載入示意基地。';
    $('building-result').textContent='新增模式：選定基地後產生新建築，不會覆寫既有建築。';
    $('saved-building-select').value='';floorOptions();$('building-floor-filter').value='above';render();
  }
  $('new-custom-building').onclick=startNew;
  $('delete-custom-building').onclick=()=>{
    if(!activeId){toast('請先選取要刪除的建築。');return;}
    try{
      const raw=localStorage.getItem(KEY);
      if(raw){
        const saved=JSON.parse(raw);
        if(saved?.schemaVersion!==1||saved.type!=='custom-buildings'||!Array.isArray(saved.buildings))throw new Error('存檔格式無效');
        saved.buildings=saved.buildings.filter(b=>b.config?.id!==activeId);
        localStorage.setItem(KEY,JSON.stringify(saved));
      }
    }catch{toast('本機存檔更新失敗，尚未刪除建築。請檢查瀏覽器儲存空間。');return;}
    buildings=buildings.filter(b=>b.config.id!==activeId);activeId=buildings[0]?.config.id||null;
    refreshBuildings();floorOptions();render();$('feature-panel').hidden=true;
    if(activeId)loadActive();
    $('building-result').textContent='已刪除此棟，並同步更新本機存檔。';toast('已刪除建築，重新整理後不會還原。');
  };
  function pack(){return {schemaVersion:1,type:'custom-buildings',buildings:buildings.map(({config,parcel,sourceName,sourceCrs,visible})=>({config,parcel,sourceName,sourceCrs,visible:visible!==false}))};}
  function unpack(data){if(data?.schemaVersion!==1||data.type!=='custom-buildings'||!Array.isArray(data.buildings)||data.buildings.length>50)throw new Error('不是支援的自訂建築設定檔（最多 50 棟）。');const seen=new Set();const next=data.buildings.map(b=>{if(typeof b.config?.id!=='string'||!b.config.id||seen.has(b.config.id))throw new Error('建築 ID 無效或重複。');seen.add(b.config.id);const normalized=normalizeParcels(b.parcel),parcel=(normalized.features||normalized)[0];return {...b,parcel,generated:generateBuilding(b.config,parcel)};});buildings=next;activeId=buildings[0]?.config.id||null;refreshBuildings();floorOptions();render();if(activeId)loadActive();toast('已載入自訂建築設定。');}
  $('save-custom-buildings').onclick=()=>{try{localStorage.setItem(KEY,JSON.stringify(pack()));refreshBuildings();$('tab-data')?.click?.();toast('已儲存，自訂建築可在「資料」中檢視。');}catch{toast('本機儲存失敗，請改用匯出 JSON。');}};
  $('restore-custom-buildings').onclick=()=>{try{const data=localStorage.getItem(KEY);if(!data)throw new Error('尚無本機存檔。');unpack(JSON.parse(data));}catch(e){toast(e.message);}};
  $('export-custom-buildings').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(pack(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='custom-buildings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('import-custom-buildings').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>20*1024*1024)throw new Error('設定檔上限 20 MB。');unpack(JSON.parse(await file.text()));}catch(error){toast(error.message);}};
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){cancelDraw();hoveredHousing=null;clearHousingSelection();}});
  return {startNew,setPanelActive(active){panelActive=active;syncParcelVisibility();},setMode:render,focusOnMap(id){const b=buildings.find(b=>b.config.id===id);if(!b)return false;if(b.visible===false||!$('custom-building-visible').checked){toast('此模型目前未顯示於地圖。');return false;}fit([b.parcel]);return true;},setBuildingVisible(id,visible){const b=buildings.find(b=>b.config.id===id);if(b){b.visible=visible;render();}},focusBuilding(id){const b=buildings.find(b=>b.config.id===id);if(!b)return;$('saved-building-select').value=id;loadActive();$('building-floor-filter').value='above';b.visible=true;refreshBuildings();setMode('3d');render();fit([b.parcel]);},onMapClick(e){
    if(draggedVertex!==null)return true;
    if(Date.now()<suppressClickUntil){suppressClickUntil=0;return true;}
    if(drawPoints){if(drawPoints.length>=500){toast('繪製上限 500 個轉折點，請完成或重新繪製。');return true;}drawPoints.push([e.lngLat.lng,e.lngLat.lat]);updateDrawing();return true;}
    if(!map.getSource('studio-parcels'))return false;
    const hit=map.queryRenderedFeatures(e.point,{layers:ids.filter(id=>map.getLayer(id))})[0];if(!hit){clearHousingSelection();return false;}
    if(hit.properties.unitId){selectedHousing=hit.properties;floorSwitcherBuildingId=hit.properties.buildingId;syncHighlights();}else clearHousingSelection();
    if(hit.properties.unitId){const p=hit.properties;showProperties(`${p.buildingName} · ${p.label||p.unitId}`,{'類型':'自訂建築','區域用途':p.usage==='common'?'中央公共設施':p.underground?'地下室':'住宅','樓層':p.floor<0?`B${-p.floor}`:`${p.floor}F`,[p.usage==='common'?'區域名稱':'戶號']:p.label||p.unitId,[p.usage==='common'?'區域 ID':'住宅 ID']:p.unitId,'配置狀態':'自動配置示意','樓板分區面積（m²）':Number(p.area_m2).toFixed(1),'該層樓板面積（m²）':p.floor_area_m2?Number(p.floor_area_m2).toFixed(1):'未提供','地下室':p.underground?'是（抬升示意檢視）':'否'});return true;}
    if(!$('building-editor').hidden&&hit.properties.studioIndex!==undefined){$('parcel-select').value=String(hit.properties.studioIndex);selectParcel(false);return true;}return false;
  }};
}
