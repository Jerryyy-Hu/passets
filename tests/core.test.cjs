'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');

test('archive captures an immutable attempt and removes it from the active queue',()=>{
  const state=C.initialState(),q=state.activeQueue[0];
  q.answer='Technology can help teachers.';
  q.review={kind:'self',upgradedSentence:q.reference};q.selfRating='good';
  C.archiveQuestion(state,q.id);
  assert.equal(state.activeQueue.length,0);assert.equal(state.historyQueue[0].answer,q.answer);assert.ok(state.historyQueue[0].completedAt);
  assert.throws(()=>C.archiveQuestion(state,q.id));
});
test('repractice keeps the original attempt and creates a clean question at the front',()=>{
  const state=C.initialState(),q=state.activeQueue[0];q.answer='First attempt';q.review={kind:'self',upgradedSentence:q.reference};q.selfRating='again';C.archiveQuestion(state,q.id);
  const next=C.restoreQuestion(state,q.id);assert.notEqual(next.id,q.id);assert.equal(next.answer,'');assert.equal(next.review,null);assert.equal(state.historyQueue.length,1);assert.equal(next.previousAttemptId,q.id);
});
test('self assessment must be completed before archiving',()=>{
  const state=C.initialState(),q=state.activeQueue[0];assert.throws(()=>C.archiveQuestion(state,q.id));q.review={kind:'self'};assert.throws(()=>C.archiveQuestion(state,q.id));
});
test('LCS keeps collocations atomic and emits individual content-word differences',()=>{
  const p=[{word:'cater to',def:'满足'},{word:'diverse learning needs',def:'多样化学习需求'}];
  const diff=C.diffWords('Teachers should help the different students.','Teachers should cater to diverse learning needs.',p);
  assert.ok(diff.operations.some(t=>t.op==='same'&&t.text==='Teachers'));
  assert.ok(diff.operations.some(t=>t.op==='remove'&&t.text==='help'));
  assert.deepEqual(diff.core.map(t=>t.word),['cater to','diverse learning needs']);
  assert.ok(!diff.core.some(t=>C.STOP_WORDS.has(t.word)));
});
test('LCS does not combine unrelated nouns, verbs or adjectives into one block',()=>{
  const diff=C.diffWords('Cars cause bad air.','Vehicles generate harmful emissions.');
  assert.deepEqual(diff.core.map(t=>t.word),['Vehicles','generate','harmful','emissions']);
});
test('phrase matching respects word boundaries and punctuation',()=>{
  assert.equal(C.containsPhrase('Cater to different needs.','cater to'),true);assert.equal(C.containsPhrase('Internet access','net'),false);
  assert.equal(C.diffWords('A healthy lifestyle.','A healthy lifestyle.').core.length,0);
});
test('hyphenated collocations remain whole clickable phrases',()=>{const d=C.diffWords('Workers need balance.','Workers need work-life balance.',[{word:'work-life balance'}]);assert.equal(d.core[0].word,'work-life balance');});
test('possessive apostrophes never become vocabulary capsules',()=>{const d=C.diffWords('Help students.','Help students’ diverse needs.');assert.ok(d.core.every(p=>/[A-Za-z]/.test(p.word)));assert.ok(d.operations.some(t=>t.text==='’'&&t.type==='punct'));});
test('safe JSON parser accepts fences and prose but never evaluates JavaScript',()=>{
  assert.deepEqual(C.parseJSON('```json\n{"ok":true}\n```'),{ok:true});assert.deepEqual(C.parseJSON('Result: {"ok":true}'),{ok:true});assert.throws(()=>C.parseJSON('{ok:globalThis.hacked=true}'));
});
const generated={chinese:'学校应该满足多样化的学习需求。',reference:'Schools should cater to diverse learning needs.',collocations:[{word:'cater to'},{word:'diverse learning needs'}],targets:[{word:'cater to'}]};
test('generation rejects duplicates, excluded bank terms and missed targets',()=>{
  assert.throws(()=>C.validateGenerated(generated,{strategy:'B',words:['cater to']}));assert.throws(()=>C.validateGenerated(generated,{strategy:'A',required:['foster understanding']}));assert.throws(()=>C.validateGenerated(generated,{strategy:'C'},[{chinese:generated.chinese,reference:'another'}]));assert.throws(()=>C.validateGenerated({...generated,targets:[{word:'missing target'}]},{strategy:'C'}));
});
test('mixed generation requires a bank term and at least one new collocation',()=>{
  assert.ok(C.validateGenerated(generated,{mode:'writing',strategy:'C',words:['cater to'],required:['cater to']}));assert.throws(()=>C.validateGenerated(generated,{strategy:'C',words:['cater to','diverse learning needs'],required:['cater to']}));
});
test('review validates finite half-band scores and correction structure',()=>{
  const data={overallBand:7,lrScore:7.5,graScore:6.5,targetHit:{hit:true,comment:'准确'},upgradedSentence:'Schools should cater to diverse learning needs.',corrections:[],vocabulary:[]};
  assert.equal(C.validateReview(data).kind,'ai');assert.throws(()=>C.validateReview({...data,overallBand:10}));assert.throws(()=>C.validateReview({...data,lrScore:6.2}));assert.throws(()=>C.validateReview({...data,targetHit:'yes'}));
});
test('local generation does not reissue completed questions and honestly reports exhaustion',()=>{
  const used=[],ctx={mode:'writing',topic:'全球化',strategy:'B',words:[]};for(let i=0;i<C.TOPICS['全球化'].length;i++)used.push(C.localQuestion(ctx,used));assert.equal(new Set(used.map(q=>q.chinese)).size,used.length);assert.throws(()=>C.localQuestion(ctx,used));assert.throws(()=>C.localQuestion({...ctx,topic:'Unknown custom topic'},[]));
});
test('persistent state survives a JSON round trip including drafts and timers',()=>{
  const state=C.initialState();state.activeQueue[0].answer='My saved draft';state.activeQueue[0].timer.deadline=Date.now()+20000;const copy=C.validateState(JSON.parse(JSON.stringify(state)));assert.equal(copy.activeQueue[0].answer,'My saved draft');assert.equal(copy.activeQueue[0].timer.deadline,state.activeQueue[0].timer.deadline);
});
test('import validation rejects duplicate IDs and malformed reviews',()=>{
  const s=C.initialState();s.activeQueue.push({...s.activeQueue[0]});assert.throws(()=>C.validateState(s));const r=C.initialState();r.activeQueue[0].review={kind:'ai'};assert.throws(()=>C.validateState(r));
});
test('dynamic markup escapes HTML including injected event handlers',()=>{assert.equal(C.escapeHTML('<img src=x onerror="alert(1)">'),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');});
