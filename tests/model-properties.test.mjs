import test from 'node:test';
import assert from 'node:assert/strict';
import {modelPropertyRows} from '../web/model-properties.js';

test('native GUID and available parent metadata survive a nameless mesh',()=>{
  const parent={name:'1wj3$2YBX81ubIDkAMUb1T',userData:{ifcType:'IfcBeam',floor:'B2F'},parent:null};
  const rows=new Map(modelPropertyRows({name:'',userData:{},parent},'native'));
  assert.equal(rows.get('IFC GUID'),parent.name);
  assert.equal(rows.get('IFC 類型'),'IfcBeam');
  assert.equal(rows.get('樓層／容器'),'B2F');
});

test('missing semantic properties stay unknown and raw extras stay hidden',()=>{
  const rows=new Map(modelPropertyRows({name:'mesh',userData:{description:'x'.repeat(2000)},parent:null},'open'));
  assert.equal(rows.get('IFC 類型'),'GLB 未提供');
  assert.equal(rows.has('IFC GUID'),false);
  assert.equal(rows.has('description'),false);
});

test('verified IFC sidecar replaces GUID-only labels with actual semantic fields',()=>{
  const guid='1wj3$2YBX81ubIDkAMUb1T';
  const data={[guid]:{name:'混凝土-結構柱:90X50cm:123',ifc_type:'IfcColumn',revit_element_id:'123',
    storey:{name:'2FL'},materials:['混凝土'],property_sets:{Pset_ColumnCommon:{id:2,LoadBearing:true}}}};
  const rows=new Map(modelPropertyRows({name:guid,userData:{},parent:null},'native',data));
  assert.equal(rows.get('構件名稱'),data[guid].name);
  assert.equal(rows.get('Revit 元素 ID'),'123');
  assert.equal(rows.get('樓層／容器'),'2FL');
  assert.equal(rows.get('材料'),'混凝土');
  assert.equal(rows.has('Pset_ColumnCommon · LoadBearing'),false);
  assert.equal(rows.has('Pset_ColumnCommon · id'),false);
  assert.equal(rows.has('數值單位'),false);
});
