import {encryptRecord,decryptRecord} from './security.mjs';

export class RepositoryConflict extends Error {}
export class GitHubRepositoryStore {
  constructor({token,secret,repository='Jerryyy-Hu/passets',branch='passets-data',request=fetch}){
    this.token=token;this.secret=secret;this.repository=repository;this.branch=branch;this.request=request;
  }
  async call(path,options={}){
    const response=await this.request('https://api.github.com/repos/'+this.repository+path,{...options,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+this.token,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'PASSETS-Account-Service','Cache-Control':'no-cache',...options.headers},signal:AbortSignal.timeout(20000)});
    if(response.status===409||response.status===422)throw new RepositoryConflict('The account changed; retry with the latest record');
    if(response.status===404)return null;
    if(!response.ok){const error=new Error(response.status===403||response.status===429?'账号存储暂时达到 GitHub 请求限制，请稍后重试。':'账号存储暂时不可用，请稍后重试。');error.status=503;throw error;}
    return response.json();
  }
  async read(id){
    if(!/^[a-f0-9]{64}$/.test(id))throw new Error('Invalid account id');
    const file=await this.call('/contents/profiles/'+id+'.json?ref='+encodeURIComponent(this.branch));
    if(!file)return null;
    const envelope=JSON.parse(Buffer.from(file.content,'base64').toString('utf8'));
    return {record:decryptRecord(envelope,this.secret),version:file.sha};
  }
  async write(id,record,version){
    if(!/^[a-f0-9]{64}$/.test(id))throw new Error('Invalid account id');
    const content=Buffer.from(JSON.stringify(encryptRecord(record,this.secret))).toString('base64');
    const file=await this.call('/contents/profiles/'+id+'.json',{method:'PUT',body:JSON.stringify({message:'Update encrypted PASSETS learning profile',branch:this.branch,content,...(version?{sha:version}:{})}),headers:{'Content-Type':'application/json'}});
    if(!file)throw new Error('Account data branch is not configured');
    return file.content.sha;
  }
}
