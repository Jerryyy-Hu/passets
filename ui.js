/* Native popovers, custom select controls and the mobile editing viewport. */
(function(){
  'use strict';
  const controls=new Map();
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function enhance(select){
    if(controls.has(select.id))return;
    const wrapper=document.createElement('div');wrapper.className='web-select';
    const button=document.createElement('button');button.type='button';button.className='select-trigger';button.id=select.id+'-trigger';
    button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-controls',select.id+'-options');
    button.setAttribute('aria-label',select.getAttribute('aria-label')||select.closest('label')?.querySelector('span')?.textContent||select.labels?.[0]?.textContent||'选择选项');
    const list=document.createElement('div');list.id=select.id+'-options';list.className='select-options';list.setAttribute('role','listbox');list.setAttribute('popover','auto');list.setAttribute('aria-label',button.getAttribute('aria-label'));
    select.hidden=true;select.setAttribute('aria-hidden','true');select.tabIndex=-1;select.after(wrapper);wrapper.append(button,list);
    let active=0,typeBuffer='',typeTimer;
    const options=()=>[...select.options].filter(option=>!option.disabled);
    function refresh(){
      const items=options();button.innerHTML='<span>'+escape(select.selectedOptions[0]?.textContent||'请选择')+'</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
      list.innerHTML=items.map((option,index)=>'<div class="web-option" role="option" id="'+select.id+'-option-'+index+'" data-index="'+index+'" aria-selected="'+(option.value===select.value)+'"><span>'+escape(option.textContent)+'</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg></div>').join('');
      if(!list.matches(':popover-open'))active=Math.max(0,items.findIndex(option=>option.value===select.value));
    }
    function position(){const rect=button.getBoundingClientRect(),viewport=window.visualViewport,bottom=(viewport?.height||innerHeight)+(viewport?.offsetTop||0);list.style.left=rect.left+'px';list.style.top=(rect.bottom+8)+'px';list.style.width=rect.width+'px';list.style.maxHeight=Math.max(80,Math.min(300,bottom-rect.bottom-24))+'px';}
    function highlight(){list.querySelectorAll('[role="option"]').forEach((node,index)=>node.classList.toggle('focused',index===active));button.setAttribute('aria-activedescendant',select.id+'-option-'+active);list.children[active]?.scrollIntoView({block:'nearest',behavior:'instant'});}
    function open(){refresh();position();if(!list.matches(':popover-open'))list.showPopover();button.setAttribute('aria-expanded','true');highlight();}
    function close(){if(list.matches(':popover-open'))list.hidePopover();button.setAttribute('aria-expanded','false');button.removeAttribute('aria-activedescendant');}
    function choose(index){const option=options()[index];if(!option)return;select.value=option.value;close();refresh();button.focus({preventScroll:true});select.dispatchEvent(new Event('change',{bubbles:true}));}
    button.addEventListener('click',event=>{event.preventDefault();list.matches(':popover-open')?close():open();});
    list.addEventListener('click',event=>{const option=event.target.closest('[data-index]');if(option)choose(Number(option.dataset.index));});
    list.addEventListener('toggle',()=>{button.setAttribute('aria-expanded',String(list.matches(':popover-open')));if(!list.matches(':popover-open'))button.removeAttribute('aria-activedescendant');});
    button.addEventListener('keydown',event=>{
      const isOpen=list.matches(':popover-open'),items=options();
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();if(!isOpen)open();else active=event.key==='Home'?0:event.key==='End'?items.length-1:(active+(event.key==='ArrowUp'?-1:1)+items.length)%items.length;highlight();}
      else if(event.key==='Enter'||event.key===' '){event.preventDefault();isOpen?choose(active):open();}
      else if(event.key==='Escape'){event.preventDefault();close();}
      else if(event.key==='Tab')close();
      else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey){clearTimeout(typeTimer);typeBuffer+=event.key.toLowerCase();const index=items.findIndex(option=>option.textContent.toLowerCase().startsWith(typeBuffer));if(index>=0){if(!isOpen)open();active=index;highlight();}typeTimer=setTimeout(()=>{typeBuffer='';},700);}
    });
    select.addEventListener('change',refresh);new MutationObserver(refresh).observe(select,{childList:true,subtree:true});
    controls.set(select.id,{refresh,close,position,list});refresh();
  }
  function refreshSelects(){document.querySelectorAll('select').forEach(enhance);for(const control of controls.values())control.refresh();}
  function closeSelects(){for(const control of controls.values())control.close();}
  let editing=false,savedScroll=0,frame,blurTimer;
  function updateViewport(){
    cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const viewport=window.visualViewport;
      document.documentElement.style.setProperty('--visual-height',(viewport?.height||innerHeight)+'px');
      document.documentElement.style.setProperty('--visual-top',(viewport?.offsetTop||0)+'px');
      for(const control of controls.values())if(control.list.matches(':popover-open'))control.position();
    });
  }
  function leaveEditor(){if(!editing)return;editing=false;document.body.classList.remove('editing-answer');window.scrollTo({top:savedScroll,behavior:'instant'});}
  function enterEditor(input){if(innerWidth>700||input.readOnly||document.documentElement.dataset.view!=='practice')return;if(!editing)savedScroll=window.scrollY;editing=true;document.body.classList.add('editing-answer');updateViewport();}
  document.addEventListener('focusin',event=>{clearTimeout(blurTimer);if(event.target.id==='answer-input')enterEditor(event.target);else if(editing)blurTimer=setTimeout(leaveEditor,160);});
  document.addEventListener('focusout',event=>{if(event.target.id==='answer-input')blurTimer=setTimeout(()=>{if(document.activeElement?.id!=='answer-input')leaveEditor();},160);});
  document.addEventListener('click',event=>{if(event.target.closest('[data-action="finish-typing"]')){document.getElementById('answer-input')?.blur();leaveEditor();}});
  window.addEventListener('resize',()=>{updateViewport();if(innerWidth>700)leaveEditor();});
  window.visualViewport?.addEventListener('resize',updateViewport);window.visualViewport?.addEventListener('scroll',updateViewport);
  window.addEventListener('pagehide',leaveEditor);
  window.PassetsUI={refreshSelects,closeSelects,leaveEditor,updateViewport};updateViewport();
})();
