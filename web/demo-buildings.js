import {rectangleAt} from './custom-building-geometry.js';
import {convertCoordinate} from './parcel-import.js';
import {RVT_STR_PLACEMENT} from './rvt-str-placement.js';

function demoBuildings(legacy=false) {
  const origin=RVT_STR_PLACEMENT.local_to_shared_m_row_major;
  // West of the audited STR footprint, with clear space between A and B.
  const nearby=north=>convertCoordinate([origin[0][3]-82,origin[1][3]+north],RVT_STR_PLACEMENT.crs_assumption);
  return {schemaVersion:1,type:'custom-buildings',buildings:[
    {id:'demo-a',name:'示意住宅 A · 單排配置',center:legacy?[121.535,25.045]:nearby(31),area:900,floors:8,layout:'single'},
    {id:'demo-b',name:'示意住宅 B · 環形配置',center:legacy?[121.5357,25.045]:nearby(91),area:1200,floors:12,layout:'ring'},
  ].map(({id,name,center,area,floors,layout})=>({
    config:{id,name,floors,floorHeight:3.2,unitsPerFloor:4,basementFloors:0,basementHeight:3.5,rotation:0,layout,commonAreaRatio:0.2,coverage:1,targetArea:area,footprintMode:'parcel'},
    parcel:{type:'Feature',properties:{name:'展示示意基地（非真實地籍）'},geometry:rectangleAt(center,area,1.5,0)},
    sourceName:'公開展示示意資料（非真實基地或建物）',sourceCrs:'WGS84',visible:true,
  }))};
}

export function createDemoBuildings(){return demoBuildings();}

export function relocateLegacyDemoBuildings(data){
  if(data?.schemaVersion!==1||data.type!=='custom-buildings'||!Array.isArray(data.buildings))return data;
  const legacy=demoBuildings(true).buildings,current=createDemoBuildings().buildings;
  return {...data,buildings:data.buildings.map(building=>{
    const index=legacy.findIndex(old=>old.config.id===building.config?.id);
    if(index<0)return building;
    const old=legacy[index],config=building.config;
    const unchanged=Object.keys(config).length===Object.keys(old.config).length
      &&Object.entries(old.config).every(([key,value])=>config[key]===value)
      &&JSON.stringify(building.parcel)===JSON.stringify(old.parcel)
      &&building.sourceName===old.sourceName&&building.sourceCrs===old.sourceCrs;
    return unchanged?{...building,parcel:current[index].parcel}:building;
  })};
}
