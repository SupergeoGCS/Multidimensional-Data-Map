export function bindCardMapFocus(card,focus){
  card.tabIndex=0;card.classList.add('map-focus-card');card.title='點選卡片定位至地圖上的模型';
  card.addEventListener('click',event=>{
    if(event.target.closest('button,input,label,a,select,textarea'))return;
    focus();
  });
  card.addEventListener('keydown',event=>{
    if(event.target!==card||!['Enter',' '].includes(event.key))return;
    event.preventDefault();focus();
  });
}
