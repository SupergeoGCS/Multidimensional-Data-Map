import {rectangleAt} from './custom-building-geometry.js';
import {convertCoordinate} from './parcel-import.js';
import {RVT_STR_PLACEMENT} from './rvt-str-placement.js';

function demoBuildings(profile='road') {
  const origin=RVT_STR_PLACEMENT.local_to_shared_m_row_major;
  const nearby=north=>convertCoordinate([origin[0][3]-82,origin[1][3]+north],RVT_STR_PLACEMENT.crs_assumption);
  // Long edges follow OSM way 1310859889 (水源南路1097巷).
  const angle=41.67,rotation=profile==='road'?angle:0;
  const roadCenter=along=>{
    const radians=angle*Math.PI/180,lat=25.0207,metresPerDegree=6371008.8*Math.PI/180;
    return [121.2098+along*Math.cos(radians)/(metresPerDegree*Math.cos(lat*Math.PI/180)),lat+along*Math.sin(radians)/metresPerDegree];
  };
  return {schemaVersion:1,type:'custom-buildings',buildings:[
    {id:'demo-a',name:'示意住宅 A · 單排配置',center:profile==='taipei'?[121.535,25.045]:profile==='west'?nearby(31):roadCenter(-30),area:900,floors:8,layout:'single'},
    {id:'demo-b',name:'示意住宅 B · 環形配置',center:profile==='taipei'?[121.5357,25.045]:profile==='west'?nearby(91):roadCenter(30),area:1200,floors:12,layout:'ring'},
  ].map(({id,name,center,area,floors,layout})=>({
    config:{id,name,floors,floorHeight:3.2,unitsPerFloor:4,basementFloors:0,basementHeight:3.5,rotation,layout,commonAreaRatio:0.2,coverage:1,targetArea:area,footprintMode:'parcel'},
    parcel:{type:'Feature',properties:{name:'展示示意基地（非真實地籍）'},geometry:rectangleAt(center,area,1.5,rotation)},
    sourceName:'公開展示示意資料（非真實基地或建物）',sourceCrs:'WGS84',visible:true,
  }))};
}

export function createDemoBuildings(){return demoBuildings();}

export function relocateLegacyDemoBuildings(data){
  if(data?.schemaVersion!==1||data.type!=='custom-buildings'||!Array.isArray(data.buildings))return data;
  const legacy=[...demoBuildings('taipei').buildings,...demoBuildings('west').buildings],current=createDemoBuildings().buildings;
  return {...data,buildings:data.buildings.map(building=>{
    const old=legacy.find(old=>{
      const config=building.config;
      return config?.id===old.config.id&&Object.keys(config).length===Object.keys(old.config).length
      &&Object.entries(old.config).every(([key,value])=>config[key]===value)
      &&JSON.stringify(building.parcel)===JSON.stringify(old.parcel)
      &&building.sourceName===old.sourceName&&building.sourceCrs===old.sourceCrs;
    });
    const next=old&&current.find(b=>b.config.id===old.config.id);
    return next?{...building,config:{...building.config,rotation:next.config.rotation},parcel:next.parcel}:building;
  })};
}
