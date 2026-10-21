import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBimSource, applyBimSourceVisibility, verifyAttributePackage} from '../web/bim-sources.js';

test('attribute sidecar must match exact loaded GLB bytes',async()=>{
  const bytes=new TextEncoder().encode('model');
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const hash=Buffer.from(digest).toString('hex');
  const data={schema_version:1,glb_sha256:hash,elements:{guid:{name:'柱'}}};
  assert.equal((await verifyAttributePackage(data,bytes)).guid.name,'柱');
  await assert.rejects(verifyAttributePackage(data,new TextEncoder().encode('other')),/版本不符/);
});

test('source caches are independent and a failed source can retry',async()=>{
  const sources={open:{url:'open'},native:{url:'native'}};
  let openCalls=0,nativeCalls=0;
  const loader=async url=>{if(url==='open'){openCalls++;return {name:'open'};}if(++nativeCalls===1)throw Error('native unavailable');return {name:'native'};};
  const first=await loadBimSource(sources,'open',loader);
  await assert.rejects(loadBimSource(sources,'native',loader));
  assert.equal(await loadBimSource(sources,'open',loader),first);
  assert.equal((await loadBimSource(sources,'native',loader)).name,'native');
  assert.equal(openCalls,1);assert.equal(nativeCalls,2);
});

test('each source visibility survives master hide and restore',()=>{
  const sources={open:{visible:false},native:{visible:true}};
  const root={children:[{userData:{bimSource:'open'}},{userData:{bimSource:'native'}}]};
  applyBimSourceVisibility(root,sources,true);
  assert.deepEqual(root.children.map(g=>g.visible),[false,true]);
  applyBimSourceVisibility(root,sources,false);
  assert.deepEqual(root.children.map(g=>g.visible),[false,false]);
  applyBimSourceVisibility(root,sources,true);
  assert.deepEqual(root.children.map(g=>g.visible),[false,true]);
});
