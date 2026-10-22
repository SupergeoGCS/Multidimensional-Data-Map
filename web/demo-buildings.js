import {rectangleAt} from './custom-building-geometry.js';

export function createDemoBuildings() {
  return {schemaVersion:1,type:'custom-buildings',buildings:[
    {id:'demo-a',name:'示意住宅 A · 單排配置',center:[121.535,25.045],area:900,floors:8,layout:'single'},
    {id:'demo-b',name:'示意住宅 B · 環形配置',center:[121.5357,25.045],area:1200,floors:12,layout:'ring'},
  ].map(({id,name,center,area,floors,layout})=>({
    config:{id,name,floors,floorHeight:3.2,unitsPerFloor:4,basementFloors:0,basementHeight:3.5,rotation:0,layout,commonAreaRatio:0.2,coverage:1,targetArea:area,footprintMode:'parcel'},
    parcel:{type:'Feature',properties:{name:'展示示意基地（非真實地籍）'},geometry:rectangleAt(center,area,1.5,0)},
    sourceName:'公開展示示意資料（非真實基地或建物）',sourceCrs:'WGS84',visible:true,
  }))};
}
