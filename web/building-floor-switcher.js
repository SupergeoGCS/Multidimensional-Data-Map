export function createBuildingFloorSwitcher(host,onSelect){
  let signature='',buttons=[];
  return {update(options,value,visible){
    host.hidden=!visible;
    const next=JSON.stringify(options);
    if(next!==signature){
      signature=next;
      buttons=options.map(({value,label,title})=>{
        const button=document.createElement('button');button.type='button';button.className='floor-switch-button';
        button.textContent=label;button.title=title;button.setAttribute('aria-label',title);
        button.onclick=()=>onSelect(value);
        return {value,button};
      });
      host.replaceChildren(...buttons.map(item=>item.button));
    }
    for(const item of buttons)item.button.setAttribute('aria-pressed',String(item.value===value));
  }};
}
