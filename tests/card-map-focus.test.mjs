import test from 'node:test';
import assert from 'node:assert/strict';
import {bindCardMapFocus} from '../web/card-map-focus.js';
test('card focuses the map without hijacking nested controls',()=>{
  const handlers={},card={classList:{add(){}},addEventListener:(name,fn)=>handlers[name]=fn};let focused=0;
  bindCardMapFocus(card,()=>focused++);
  handlers.click({target:{closest:()=>null}});assert.equal(focused,1);
  handlers.click({target:{closest:()=>({})}});assert.equal(focused,1);
  handlers.keydown({target:card,key:'Enter',preventDefault(){}});assert.equal(focused,2);
  handlers.keydown({target:{},key:' ',preventDefault(){throw new Error('nested control hijacked');}});assert.equal(focused,2);
});
