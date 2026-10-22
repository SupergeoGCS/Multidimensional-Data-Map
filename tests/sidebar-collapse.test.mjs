import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSidebarCollapse} from '../web/sidebar-collapse.js';

for(const mobile of [false,true])test(`sidebar collapse retains rail and synchronizes controls (${mobile?'mobile':'desktop'})`,()=>{
  const classes=new Set(),body={classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);}}};
  const makeButton=()=>({attributes:{},setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];}});
  const button=makeButton(),mobileButton=makeButton();let changes=0;
  const control=mountSidebarCollapse({body,button,mobileButton,isMobile:()=>mobile,onChange:()=>changes++});
  assert.equal(button.attributes['aria-expanded'],String(!mobile));
  control.close();assert.ok(classes.has('sidebar-collapsed'));assert.ok(!classes.has('sidebar-open'));
  assert.equal(button.attributes['aria-label'],'展開功能內容');
  button.onclick();assert.ok(!classes.has('sidebar-collapsed'));assert.ok(classes.has('sidebar-open'));
  assert.equal(mobileButton.attributes['aria-expanded'],'true');
  mobileButton.onclick();assert.equal(button.attributes['aria-expanded'],'false');
  control.open();assert.equal(button.attributes['aria-expanded'],'true');
  assert.equal(changes,5);
});
