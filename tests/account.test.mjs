import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {encryptRecord,decryptRecord} from '../server/security.mjs';
const C=createRequire(import.meta.url)('../core.js');
const secret='fixture-secret-for-account-encryption-0123456789';

import {fixture} from './fixtures/account-service.mjs';

test('repository records encrypt usernames, password hashes and learning data with authenticated encryption',()=>{
  const record={username:'learner',password:{hash:'private-hash'},workspace:{answer:'A private answer.'}},encrypted=encryptRecord(record,secret);
  assert.ok(!JSON.stringify(encrypted).includes('learner'));assert.ok(!JSON.stringify(encrypted).includes('private-hash'));
  assert.deepEqual(decryptRecord(encrypted,secret),record);
  assert.throws(()=>decryptRecord({...encrypted,tag:Buffer.alloc(16).toString('base64')},secret));
  assert.throws(()=>decryptRecord(encrypted,'another-secret'));
});
test('two accounts have isolated state and duplicate usernames are rejected',async()=>{
  const f=fixture(),a=await f.call('register',{username:'learner_a',password:'a-long-password-a'}),b=await f.call('register',{username:'learner_b',password:'a-long-password-b'});
  assert.equal(a.status,201);assert.equal(b.status,201);assert.notEqual(a.body.account.id,b.body.account.id);
  const state=a.body.state;state.activeQueue[0].answer='Only account A can see this.';
  assert.equal((await f.call('save',{state,revision:0},a.body.token)).status,200);
  const other=await f.call('read',{},b.body.token);assert.equal(other.body.state.activeQueue[0].answer,'');
  assert.equal((await f.call('register',{username:'LEARNER_A',password:'a-long-password-a'})).status,409);
  for(const file of f.files.values()){const envelope=Buffer.from(file.content,'base64').toString();assert.ok(!envelope.includes('Only account A'));assert.ok(!envelope.includes('learner_a'));}
});
test('concurrent device writes return the latest state instead of overwriting it',async()=>{
  const f=fixture(),registered=await f.call('register',{username:'devices',password:'a-long-password'}),token=registered.body.token;
  const first=structuredClone(registered.body.state),second=structuredClone(first);first.activeQueue[0].answer='First device draft.';first.activeQueue[0].updatedAt=Date.now()+10;
  second.vocabBank.push({id:'saved-word',word:'digital literacy',def:'数字素养',example:'Digital literacy matters.',createdAt:new Date().toISOString()});
  assert.equal((await f.call('save',{state:first,revision:0},token)).status,200);
  const conflict=await f.call('save',{state:second,revision:0},token);assert.equal(conflict.status,409);assert.equal(conflict.body.code,'STATE_CONFLICT');
  const merged=C.mergeStates(second,conflict.body.state);assert.equal(merged.activeQueue[0].answer,'First device draft.');assert.equal(merged.vocabBank.length,1);
  assert.equal((await f.call('save',{state:merged,revision:conflict.body.revision},token)).status,200);
});
test('completed question claims are rejected across sessions and completion keys cannot be removed',async()=>{
  const f=fixture(),a=await f.call('register',{username:'completion',password:'a-long-password'}),b=await f.call('login',{username:'completion',password:'a-long-password'});
  const state=a.body.state,key=C.questionKey(state.activeQueue[0]);state.completedQuestions=[key];
  await f.call('save',{state,revision:0},a.body.token);
  const claim=await f.call('claim',{questionKey:key},b.body.token);assert.equal(claim.status,409);assert.equal(claim.body.code,'QUESTION_COMPLETED');
  state.completedQuestions=[];await f.call('save',{state,revision:1},a.body.token);
  assert.ok((await f.call('read',{},b.body.token)).body.state.completedQuestions.includes(key));
});
test('logout revokes one device session while retaining another and expired sessions fail',async()=>{
  const f=fixture(),a=await f.call('register',{username:'sessions',password:'a-long-password'}),b=await f.call('login',{username:'sessions',password:'a-long-password'});
  assert.equal((await f.call('logout',{},a.body.token)).status,200);
  assert.equal((await f.call('read',{},a.body.token)).status,401);assert.equal((await f.call('read',{},b.body.token)).status,200);
  f.advance(31*86400000);assert.equal((await f.call('read',{},b.body.token)).status,401);
});
test('unknown origins, malformed state and unauthenticated state writes are rejected',async()=>{
  const f=fixture();assert.equal((await f.call('register',{username:'blocked',password:'a-long-password'},'','https://attacker.invalid')).status,403);
  assert.equal((await f.call('save',{state:{},revision:0})).status,401);
  const account=await f.call('register',{username:'validation',password:'a-long-password'});
  assert.equal((await f.call('save',{state:{version:1},revision:0},account.body.token)).status,400);
});
test('repeated wrong passwords lock an account and successful login normalises account names',async()=>{
  const f=fixture();await f.call('register',{username:'Learner',password:'a-long-password'});
  assert.equal((await f.call('login',{username:'LEARNER',password:'a-long-password'})).status,200);
  for(let i=0;i<5;i++)assert.equal((await f.call('login',{username:'learner',password:'wrong-password'})).status,401);
  assert.equal((await f.call('login',{username:'learner',password:'a-long-password'})).status,429);
  f.advance(16*60000);assert.equal((await f.call('login',{username:'learner',password:'a-long-password'})).status,200);
});
