export function mountSidebarCollapse({body,button,mobileButton,isMobile,onChange=()=>{}}){
  function setOpen(open){
    body.classList.toggle('sidebar-collapsed',!open);
    body.classList.toggle('sidebar-open',open);
    button.setAttribute('aria-expanded',String(open));
    button.setAttribute('aria-label',open?'收折功能內容':'展開功能內容');
    button.title=open?'收折功能內容':'展開功能內容';
    mobileButton?.setAttribute('aria-expanded',String(open));
    onChange();
  }
  function toggle(){setOpen(button.getAttribute('aria-expanded')!=='true');}
  button.onclick=toggle;if(mobileButton)mobileButton.onclick=toggle;
  setOpen(!isMobile());
  return {open(){setOpen(true);},close(){setOpen(false);}};
}
