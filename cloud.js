/* Account isolation and optimistic synchronization through the project's API. */
(function(){
  'use strict';
  const AUTH_KEY='passets.session.v1',C=window.Passets;
  let session=null,hooks=null,revision=0,dirty=false,applying=false,timer=null,pending=null,lastWrite=0,needsLogin=false,authMode='login',status='未登录 · 当前浏览器保存';
  try{session=JSON.parse(localStorage.getItem(AUTH_KEY)||'null');if(!session?.token||!session.account?.id)session=null;}catch{}
  const base=()=>String(window.PassetsCloudConfig?.apiBase||'').replace(/\/$/,'');
  const storageKey=()=>session?'passets.account.'+session.account.id+'.v1':C.STORAGE_KEY;
  const node=id=>document.getElementById(id);
  function setStatus(message,error=false){status=message;const target=node('sync-status');if(target){target.textContent=message;target.classList.toggle('error',error);}const trigger=document.querySelector('.account-trigger');trigger?.classList.toggle('signed-in',!!session);if(trigger)trigger.title=session?session.account.username+' · '+message:'登录与账号同步';}
  function message(text,error=false){node('account-message').textContent=text;node('account-message').classList.toggle('error',error);}
  function renderAccount(){
    document.querySelector('.account-trigger').hidden=!base();
    node('account-session').hidden=!session;node('account-form').hidden=!!session&&!needsLogin;
    if(needsLogin&&session)node('account-form').elements.username.value=session.account.username;
    node('account-name').textContent=session?.account.username||'';setStatus(status);message(base()?'':'账号同步尚未启用，可先使用访客练习。',!base());
    document.querySelectorAll('[data-action="auth-mode"]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.value===authMode)));
    node('account-submit').textContent=authMode==='register'?'创建账号并同步':'登录并同步';
    node('account-form').elements.password.autocomplete=authMode==='register'?'new-password':'current-password';
  }
  async function request(action,data={},options={}){
    if(!base())throw new Error('账号服务尚未配置，现有进度仍保存在本地。');
    const response=await fetch(base()+'/api/account',{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify({action,...data}),signal:AbortSignal.timeout(25000),...(options.keepalive?{keepalive:true}:{})});
    let body;try{body=await response.json();}catch{throw new Error('账号服务返回异常，本地数据未受影响。');}
    if(!response.ok){const error=new Error(body.error||'同步暂时失败。');error.code=body.code;error.body=body;if(body.code==='SESSION_EXPIRED'){needsLogin=true;renderAccount();}throw error;}
    return body;
  }
  function apply(state){applying=true;try{hooks.applyState(state,session?.account.id||null);}finally{applying=false;}}
  async function read(){
    if(!session)return null;
    const result=await request('read');revision=result.revision;return result;
  }
  function isLocalDirty(){return dirty;}
  async function flush(force=false){
    if(!session||!hooks||applying)return;
    if(needsLogin)throw new Error('请重新登录后同步，本地草稿仍然保留。');
    if(pending){await pending;if(dirty&&force)return flush(true);return;}
    if(!dirty&&!force)return;
    clearTimeout(timer);timer=null;
    pending=(async()=>{
      for(let attempt=0;attempt<4;attempt++){
        const snapshot=hooks.getState(),sentRevision=snapshot.revision;setStatus('正在同步…');
        try{
          const result=await request('save',{state:snapshot,revision});revision=result.revision;lastWrite=Date.now();
          dirty=hooks.getState().revision!==sentRevision;setStatus(dirty?'本地已保存 · 等待同步':'已同步到账号');return;
        }catch(error){
          if(error.code==='STATE_CONFLICT'){revision=error.body.revision;apply(hooks.mergeStates(hooks.getState(),error.body.state));continue;}
          if(error.code==='RETRY_SYNC'){const remote=await read();apply(hooks.mergeStates(hooks.getState(),remote.state));continue;}
          dirty=true;setStatus(error.code==='SESSION_EXPIRED'?'登录已过期 · 本地草稿保留':'暂未同步 · 本地已保存',true);throw error;
        }
      }
      dirty=true;setStatus('同步有冲突 · 本地草稿保留',true);throw new Error('多台设备正在同时更新，请稍后重试。');
    })();
    try{await pending;}finally{pending=null;if(dirty)scheduleSave();}
  }
  function scheduleSave(){
    if(!session||!hooks||applying)return;dirty=true;if(needsLogin)return;setStatus('本地已保存 · 等待同步');clearTimeout(timer);
    timer=setTimeout(()=>flush().catch(()=>{}),Math.max(4000,lastWrite+10000-Date.now()));
  }
  async function refreshBeforePractice(){
    if(!session)return;
    if(dirty)await flush(true);
    const result=await read();apply(hooks.mergeStates(hooks.getState(),result.state));setStatus('已同步到账号');
  }
  async function claimQuestion(questionKey){
    if(!session)return;
    try{await request('claim',{questionKey});}
    catch(error){if(error.code==='QUESTION_COMPLETED'){revision=error.body.revision;apply(hooks.mergeStates(hooks.getState(),error.body.state));}throw error;}
  }
  async function signIn(event){
    event.preventDefault();const form=node('account-form'),button=node('account-submit');button.disabled=true;message('正在连接账号…');
    try{
      const guest=hooks.getState(),importGuest=form.elements.importGuest.checked;
      const result=await request(authMode,{username:form.elements.username.value.trim(),password:form.elements.password.value});
      session={token:result.token,account:result.account};localStorage.setItem(AUTH_KEY,JSON.stringify(session));revision=result.revision;
      let target=result.state;const cached=localStorage.getItem(storageKey());if(cached){try{target=hooks.mergeStates(C.validateState(JSON.parse(cached)),target);}catch{}}
      if(importGuest)target=hooks.mergeStates(target,guest);needsLogin=false;apply(target);dirty=importGuest||!!cached;
      if(dirty)await flush(true);else setStatus('已同步到账号');
      form.elements.password.value='';renderAccount();message('登录成功。不同设备使用同一账号即可继续练习。');
    }catch(error){message(error.message,true);}finally{button.disabled=false;}
  }
  async function signOut(){
    if(!session)return;
    try{const expired=needsLogin;if(!expired){if(dirty)await flush(true);await request('logout');}const oldKey=storageKey();session=null;needsLogin=false;dirty=false;revision=0;clearTimeout(timer);localStorage.removeItem(AUTH_KEY);if(!expired)localStorage.removeItem(oldKey);
      let guest;try{guest=C.validateState(JSON.parse(localStorage.getItem(C.STORAGE_KEY)));}catch{guest=hooks.initialState();}apply(guest);status='未登录 · 当前浏览器保存';renderAccount();message('已退出账号。访客数据已恢复，账号记录仍保留在云端。');
    }catch(error){message('退出前同步未完成：'+error.message,true);}
  }
  function connect(callbacks){
    hooks=callbacks;node('account-form').addEventListener('submit',signIn);
    document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button)return;if(button.dataset.action==='auth-mode'){authMode=button.dataset.value;renderAccount();}else if(button.dataset.action==='sign-out')signOut();else if(button.dataset.action==='sync-now')refreshBeforePractice().then(()=>message('同步完成。')).catch(error=>message(error.message,true));});
    if(session)read().then(result=>{apply(hooks.mergeStates(hooks.getState(),result.state));setStatus('已同步到账号');}).catch(error=>setStatus(error.code==='SESSION_EXPIRED'?'登录已过期 · 本地草稿保留':'暂未连接 · 本地已保存',true));
    renderAccount();
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&session)refreshBeforePractice().catch(()=>{});else if(dirty)flush(true).catch(()=>{});});
    window.addEventListener('pagehide',()=>{if(session&&dirty&&base()){const data=JSON.stringify({action:'save',state:hooks.getState(),revision});if(data.length<60000)fetch(base()+'/api/account',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.token},body:data,keepalive:true}).catch(()=>{});}});
  }
  window.PassetsCloud={storageKey,connect,renderAccount,scheduleSave,flush,refreshBeforePractice,claimQuestion,isLocalDirty};
})();
