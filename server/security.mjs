import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';

const derive=promisify(scrypt);
export function accountId(username,secret){return createHmac('sha256',secret).update(username.toLowerCase()).digest('hex');}
export function tokenHash(token){return createHash('sha256').update(token).digest('hex');}
export function equalHash(first,second){const a=Buffer.from(first,'hex'),b=Buffer.from(second,'hex');return a.length===b.length&&timingSafeEqual(a,b);}
export async function hashPassword(password,salt=randomBytes(24).toString('hex')){
  const hash=await derive(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024});
  return {algorithm:'scrypt-v1',salt,hash:hash.toString('hex')};
}
export async function checkPassword(password,stored){const candidate=await hashPassword(password,stored.salt);return equalHash(candidate.hash,stored.hash);}
export function newSession(id,now=Date.now()){
  const secret=randomBytes(32).toString('base64url');return {token:id+'.'+secret,record:{hash:tokenHash(secret),expiresAt:now+30*86400000}};
}
export function encryptRecord(record,secret){
  const key=createHash('sha256').update(secret).digest(),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from('passets-account-v1'));
  const data=Buffer.concat([cipher.update(JSON.stringify(record),'utf8'),cipher.final()]);
  return {version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};
}
export function decryptRecord(envelope,secret){
  if(envelope.version!==1)throw new Error('Unsupported account record version');
  const key=createHash('sha256').update(secret).digest(),decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));
  decipher.setAAD(Buffer.from('passets-account-v1'));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data,'base64')),decipher.final()]).toString('utf8'));
}
