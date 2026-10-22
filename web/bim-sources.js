export const BIM_SOURCES = {
  open: {url:'./assets/str.glb', label:'開源方案 · STR', badge:'開源概略模型 · 尚未地理定位'},
  native: {url:'./assets/native-str.glb', attributesUrl:'./assets/native-str.attributes.json', label:'Revit IFC 方案 · STR', badge:'原生 IFC 候選 · 尚未地理定位'},
};

export async function verifyAttributePackage(data, glbBuffer) {
  if(data?.schema_version!==1||!data.elements||typeof data.elements!=='object'||Array.isArray(data.elements))throw new Error('屬性檔格式不符');
  const digest=await crypto.subtle.digest('SHA-256',glbBuffer);
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(hash!==data.glb_sha256)throw new Error('屬性與模型版本不符');
  return data.elements;
}

export async function loadBimSource(sources, key, loader) {
  const source=sources[key];
  if(!source) throw new Error('未知模型來源');
  if(!source.promise) source.promise=loader(source.url).then(root=>source.root=root).catch(error=>{
    source.promise=null;
    throw error;
  });
  return source.promise;
}

export function applyBimSourceVisibility(root, sources, enabled) {
  for(const group of root.children) {
    const source=sources[group.userData.bimSource];
    if(source) group.visible=enabled&&source.visible;
  }
}
