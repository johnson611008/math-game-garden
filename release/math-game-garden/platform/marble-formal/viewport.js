// Responsive presentation only. Canvas world coordinates and saved data stay intact.
export function mountViewport({canvas, resize, beforeOpen=async()=>{}}) {
  const body=document.body,main=document.querySelector('main'),toolbar=document.querySelector('.toolbar');
  const button=document.createElement('button');button.type='button';button.id='help-toggle';button.textContent='說明與紀錄';button.hidden=true;
  const dialog=document.createElement('dialog');dialog.id='game-help';dialog.setAttribute('aria-labelledby','game-help-title');
  dialog.innerHTML='<h2 id="game-help-title">工坊說明與紀錄</h2><button type="button" id="help-close">返回遊戲</button><div id="help-content"></div>';
  toolbar.append(button);body.append(dialog);
  const content=dialog.querySelector('#help-content'),moved=[];
  // Mount once, after remediation links exist. Move the original nodes, not copies.
  const secondary=[document.querySelector('.guide'),document.querySelector('.legend'),document.querySelector('.save-note'),document.querySelector('#charge-summary'),document.querySelector('#remediation-note'),document.querySelector('[aria-label="第二單元補強"]'),document.querySelector('#results'),document.querySelector('#reload'),document.querySelector('#export'),document.querySelector('.publish-storage-note')].filter(Boolean);
  for(const node of secondary){const marker=document.createComment('responsive-return');node.before(marker);moved.push({node,marker});}
  button.onclick=async()=>{await beforeOpen();if(!dialog.open)dialog.showModal();};dialog.querySelector('#help-close').onclick=()=>dialog.close();
  let queued=false;
  function update(){queued=false;const v=window.visualViewport,h=Math.floor(v?.height||innerHeight),w=Math.floor(v?.width||innerWidth);
    // Do not rearrange a zoomed accessibility viewport.
    const compact=w>=740&&w>h&&h<=1000&&w<=1600&&(!v||v.scale===1);
    const wasCompact=body.classList.contains('compact-game');
    body.classList.toggle('compact-game',compact);button.hidden=!compact;
    if(compact&&!wasCompact)scrollTo(0,0);
    for(const {node,marker}of moved)if(compact){if(node.parentNode!==content)content.append(node);}else if(node.previousSibling!==marker)marker.after(node);
    if(!compact&&dialog.open)dialog.close();
    body.style.setProperty('--visual-height',h+'px');
    const top=main.getBoundingClientRect().top+scrollY;
    body.style.setProperty('--main-top',top+'px');body.style.setProperty('--court-height',Math.max(180,h-top-28)+'px');
    resize();
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(update);}}
  window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);window.visualViewport?.addEventListener('resize',schedule);
  new ResizeObserver(schedule).observe(document.querySelector('header'));
  update();
}
