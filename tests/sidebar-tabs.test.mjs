import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSidebarTabs} from '../web/sidebar-tabs.js';

test('function tabs show one panel, preserve controls and restore per-panel scroll',()=>{
  const panels=Object.fromEntries(['data','placement','environment','external'].map(id=>[id,{hidden:false,input:{value:id}}]));
  const buttons=Object.keys(panels).map((id,i)=>({id,title:id,attributes:{'aria-controls':id,'aria-selected':String(i===0)},getAttribute(key){return this.attributes[key];},setAttribute(key,value){this.attributes[key]=value;},focus(){this.focused=true;}}));
  const sidebar={scrollTop:0},title={textContent:''};let selections=0;
  mountSidebarTabs({buttons,getPanel:id=>panels[id],sidebar,title,onSelect:()=>selections++});
  assert.equal(selections,0);assert.equal(Object.values(panels).filter(p=>!p.hidden).length,1);
  panels.data.input.value='preserved';sidebar.scrollTop=165;buttons[1].onclick();
  assert.equal(panels.data.hidden,true);assert.equal(panels.placement.hidden,false);assert.equal(sidebar.scrollTop,0);
  buttons[0].onclick();assert.equal(sidebar.scrollTop,165);assert.equal(panels.data.input.value,'preserved');
  buttons[0].onkeydown({key:'End',preventDefault(){}});assert.equal(buttons[3].focused,true);assert.equal(panels.external.hidden,false);assert.equal(buttons[3].tabIndex,0);
});

test('custom building tab always opens at the top',()=>{
  const panel={},button={id:'tab-custom-building',title:'自訂建築',getAttribute:()=>'',setAttribute(){}};
  const sidebar={scrollTop:0};
  mountSidebarTabs({buttons:[button],getPanel:()=>panel,sidebar,title:{}});
  sidebar.scrollTop=600;button.onclick();assert.equal(sidebar.scrollTop,0);
});
