import {createAccountService} from '../../server/account-service.mjs';
import {GitHubRepositoryStore} from '../../server/repository-store.mjs';
const secret='fixture-secret-for-account-encryption-0123456789';
export function fixture({allowedOrigins=['https://passets.test']}={}){
  const files=new Map();let sequence=0,now=Date.now();
  const request=async(url,options={})=>{
    const id=new URL(url).pathname.split('/').pop(),existing=files.get(id);
    if(options.method==='PUT'){
      const body=JSON.parse(options.body);
      if(existing?body.sha!==existing.sha:!!body.sha)return Response.json({error:'conflict'},{status:409});
      const file={content:body.content,sha:'version-'+(++sequence)};files.set(id,file);return Response.json({content:{sha:file.sha}},{status:201});
    }
    return existing?Response.json(existing):Response.json({error:'not found'},{status:404});
  };
  const store=new GitHubRepositoryStore({token:'fixture-token',secret,request}),handle=createAccountService({store,secret,clock:()=>now,allowedOrigins});
  async function call(action,data={},token='',origin='https://passets.test'){
    const response=await handle(new Request('https://api.passets.test/api/account',{method:'POST',headers:{origin,'Content-Type':'application/json','x-forwarded-for':'test-client',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({action,...data})}));
    return {status:response.status,body:await response.json()};
  }
  return {call,files,store,handle,advance:milliseconds=>{now+=milliseconds;}};
}

