export function mountSidebarTabs({buttons,getPanel,sidebar,title,onSelect=()=>{}}){
  const scrollPositions=new Map();let active=null;
  function select(button,notify=true){
    if(active)scrollPositions.set(active.id,sidebar.scrollTop);
    for(const item of buttons){
      const selected=item===button;
      item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;
      getPanel(item.getAttribute('aria-controls')).hidden=!selected;
    }
    active=button;title.textContent=button.title;sidebar.scrollTop=button.id==='tab-custom-building'?0:scrollPositions.get(button.id)||0;if(notify)onSelect(button);
  }
  for(const [index,button]of buttons.entries()){
    button.onclick=()=>select(button);
    button.onkeydown=e=>{
      let next;
      if(e.key==='ArrowDown')next=(index+1)%buttons.length;
      if(e.key==='ArrowUp')next=(index+buttons.length-1)%buttons.length;
      if(e.key==='Home')next=0;if(e.key==='End')next=buttons.length-1;
      if(next!==undefined){e.preventDefault();select(buttons[next]);buttons[next].focus();}
    };
  }
  select(buttons.find(button=>button.getAttribute('aria-selected')==='true')||buttons[0],false);
}
