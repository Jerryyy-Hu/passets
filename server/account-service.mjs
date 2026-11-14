import {createRequire} from 'node:module';
import {accountId,checkPassword,equalHash,hashPassword,newSession,tokenHash} from './security.mjs';
import {RepositoryConflict} from './repository-store.mjs';
const require=createRequire(import.meta.url),C=require('../core.js');
const STATE_FIELDS=['version','revision','activeQueue','historyQueue','currentIndex','vocabBank','mode','topic','strategy','practiceMode','theme','appearance','vocabSort','completedQuestions','customQuestions','vocabRemovals'];
export function cleanState(value){let state;try{state=C.validateState(structuredClone(value));}catch{const error=new Error('学习记录格式无效，原数据未被替换。');error.status=400;throw error;}return Object.fromEntries(STATE_FIELDS.map(key=>[key,state[key]]));}

export function createAccountService({store,secret,allowedOrigins=['https://jerryyy-hu.github.io'],clock=Date.now}){
  const attempts=new Map();
  function reply(data,status=200,origin=''){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'}});}
  function rateLimit(ip){
    const now=clock(),entry=attempts.get(ip)||{count:0,until:now+60000};if(now>entry.until){entry.count=0;entry.until=now+60000;}entry.count++;attempts.set(ip,entry);
    if(attempts.size>2000)for(const [key,item] of attempts)if(item.until<now)attempts.delete(key);
    return entry.count<=10;
  }
  async function authenticate(request){
    const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');const [id,opaque]=token.split('.');
    if(!/^[a-f0-9]{64}$/.test(id||'')||!/^[A-Za-z0-9_-]{43}$/.test(opaque||''))return null;
    const loaded=await store.read(id);if(!loaded)return null;
    const hash=tokenHash(opaque),session=loaded.record.sessions.find(item=>item.expiresAt>clock()&&equalHash(item.hash,hash));
    return session?{...loaded,id,hash}:null;
  }
  return async function handle(request){
    const origin=request.headers.get('origin')||'',sameOrigin=new URL(request.url).origin;
    if(origin&&!allowedOrigins.includes(origin)&&origin!==sameOrigin)return reply({error:'此来源不允许访问账号服务。'},403);
    if(request.method==='OPTIONS')return reply({},200,origin);
    if(request.method==='GET')return reply({ready:!!store,storage:'encrypted-github-branch'},200,origin);
    if(request.method!=='POST')return reply({error:'Method not allowed'},405,origin);
    if(!store||!secret||secret.length<32)return reply({error:'账号同步尚未启用，可先使用访客练习。',code:'SETUP_REQUIRED'},503,origin);
    try{
      if(Number(request.headers.get('content-length')||0)>2000000)return reply({error:'同步数据超过 2 MB，请先导出历史备份。'},413,origin);
      const raw=await request.text();if(raw.length>2000000)return reply({error:'同步数据超过 2 MB。'},413,origin);
      let body;try{body=JSON.parse(raw);}catch{return reply({error:'请求格式不正确。'},400,origin);}
      if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'请求格式不正确。'},400,origin);
      const action=body.action;
      if(action==='register'||action==='login'){
        const ip=request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
        if(!rateLimit(ip))return reply({error:'尝试次数过多，请稍后再试。'},429,origin);
        const username=String(body.username||'').trim().toLowerCase(),password=String(body.password||'');
        if(!/^[a-z0-9_\-]{3,32}$/.test(username)||password.length<10||password.length>128)return reply({error:'账号名需为 3–32 位字母、数字、下划线或连字符；密码需为 10–128 位。'},400,origin);
        const id=accountId(username,secret),loaded=await store.read(id);
        if(action==='register'){
          if(loaded)return reply({error:'该账号名已被使用。'},409,origin);
          const session=newSession(id,clock()),record={username,password:await hashPassword(password),sessions:[session.record],workspace:cleanState(C.initialState()),revision:0,failedLogins:0,lockedUntil:0,createdAt:clock()};
          await store.write(id,record,null);return reply({account:{id,username},token:session.token,state:record.workspace,revision:0},201,origin);
        }
        if(loaded?.record.lockedUntil>clock())return reply({error:'该账号暂时锁定，请 15 分钟后重试。'},429,origin);
        const correct=await checkPassword(password,loaded?.record.password||{salt:'passets-invalid-account-salt',hash:'00'.repeat(64)});
        if(!loaded||!correct){
          if(loaded){loaded.record.failedLogins=(loaded.record.failedLogins||0)+1;if(loaded.record.failedLogins>=5)loaded.record.lockedUntil=clock()+900000;await store.write(id,loaded.record,loaded.version);}
          return reply({error:'账号名或密码不正确。'},401,origin);
        }
        const session=newSession(id,clock());loaded.record.sessions=loaded.record.sessions.filter(item=>item.expiresAt>clock()).slice(-19);loaded.record.sessions.push(session.record);loaded.record.failedLogins=0;loaded.record.lockedUntil=0;
        await store.write(id,loaded.record,loaded.version);return reply({account:{id,username},token:session.token,state:loaded.record.workspace,revision:loaded.record.revision},200,origin);
      }
      const auth=await authenticate(request);if(!auth)return reply({error:'登录已过期，请重新登录。',code:'SESSION_EXPIRED'},401,origin);
      const {record,id,version}=auth;
      if(action==='read')return reply({account:{id,username:record.username},state:record.workspace,revision:record.revision},200,origin);
      if(action==='logout'){record.sessions=record.sessions.filter(item=>item.hash!==auth.hash);await store.write(id,record,version);return reply({ok:true},200,origin);}
      if(action==='claim'){
        if(typeof body.questionKey!=='string'||body.questionKey.length>1000)return reply({error:'题目无效。'},400,origin);
        if(record.workspace.completedQuestions.includes(body.questionKey))return reply({error:'这道题已在其他设备完成，已刷新题目进度。',code:'QUESTION_COMPLETED',state:record.workspace,revision:record.revision},409,origin);
        return reply({ok:true},200,origin);
      }
      if(action==='save'){
        if(body.revision!==record.revision)return reply({code:'STATE_CONFLICT',state:record.workspace,revision:record.revision},409,origin);
        const incoming=cleanState(body.state);
        incoming.completedQuestions=[...new Set([...record.workspace.completedQuestions,...incoming.completedQuestions])];
        record.workspace=incoming;record.revision++;await store.write(id,record,version);
        return reply({ok:true,revision:record.revision},200,origin);
      }
      return reply({error:'未知操作。'},400,origin);
    }catch(error){
      if(error instanceof RepositoryConflict)return reply({error:'另一台设备刚更新了数据，请重试。',code:'RETRY_SYNC'},409,origin);
      if(error.status===400)return reply({error:error.message},400,origin);
      console.error('PASSETS account request failed:',error.name);
      return reply({error:error.status===503?error.message:'账号服务暂时不可用，本地草稿仍然保留。'},503,origin);
    }
  };
}
