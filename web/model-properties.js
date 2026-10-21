// IFC attributes are used only after the source package matches the loaded GLB hash.
export function modelPropertyRows(object, source, attributes=null) {
  const chain=[];
  for(let current=object;current;current=current.parent) chain.push(current);
  const named=chain.find(node=>node.name);
  const ifcTyped=chain.find(node=>node.userData?.ifcType);
  const guid=source==='native'?chain.find(node=>/^[0-9A-Za-z_$]{22}$/.test(node.name||''))?.name:null;
  const record=guid?attributes?.[guid]:null;
  const displayName=record?.name||chain.find(node=>node.userData?.name)?.userData.name||named?.name||'未提供';
  const rows=[['資料圖層',source==='native'?'Revit IFC 方案':source==='open'?'開源方案':'本機 GLB'],
    ['構件名稱',displayName],['IFC 類型',record?.ifc_type||ifcTyped?.userData.ifcType||'GLB 未提供']];
  if(guid) rows.push(['IFC GUID',guid]);
  if(record){
    rows.push(['Revit 元素 ID',record.revit_element_id||'IFC 未提供'],
      ['樓層／容器',record.storey?.name||'IFC 未提供'],['材料',record.materials?.join('、')||'IFC 未提供']);
  }else if(source==='native'&&guid) rows.push(['IFC 屬性','未載入相符的屬性檔']);
  // Keep complete IFC data in the package; the viewer shows curated building information only.
  const floor=chain.find(node=>node.userData?.floor)?.userData.floor;
  if(!record&&floor) rows.push(['樓層／容器',String(floor)]);
  return rows;
}

export function renderModelProperties(body, rows) {
  body.replaceChildren();
  for(const [name,value] of rows){
    const row=document.createElement('tr'),key=document.createElement('th'),cell=document.createElement('td');
    key.scope='row';key.textContent=name;cell.textContent=value;row.append(key,cell);body.append(row);
  }
}
