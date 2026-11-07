/* Shared domain logic. Runs in a browser and in Node without dependencies. */
(function (root) {
  'use strict';
  const STORAGE_KEY = 'passets.workspace.v1';
  const SETTINGS_KEY = 'passets.settings.v1';
  const STOP_WORDS = new Set('the a an is are am was were be been being of to in that it its this these those and or but for on at by as with from into than then there their they them he she we you i my our your his her has have had do does did not no can could may might will would should must very so if when while which who whom what how up out'.split(' '));
  const uid = () => globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const normalize = value => String(value).toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}']+/gu, ' ').trim();
  const containsPhrase = (text, phrase) => (` ${normalize(text)} `).includes(` ${normalize(phrase)} `);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const wordCount = value => (String(value).match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;
  const phrase = (word, def, example, pos = 'phrase') => ({word, def, example, pos});
  const TOPICS = {
    '科技与教育': [
      ['科技不应取代教师，而应帮助他们满足不同学生的学习需求。', 'Technology should not replace teachers but help them cater to the diverse learning needs of their students.', phrase('cater to', '满足；迎合', 'Schools should cater to students with different learning needs.', 'phrasal verb'), phrase('diverse learning needs', '多样化的学习需求', 'Digital tools can help teachers address diverse learning needs.')],
      ['虽然在线学习让教育更容易获得，但它也可能加剧数字鸿沟。', 'Although online learning makes education more accessible, it may also widen the digital divide.', phrase('the digital divide', '数字鸿沟', 'Affordable internet access can help bridge the digital divide.'), phrase('accessible', '容易获得的；可及的', 'Public libraries make reliable information accessible to everyone.', 'adjective')],
      ['学校应该培养学生的批判性思维，而不是让他们死记硬背。', 'Schools should cultivate critical thinking rather than encourage students to learn by rote.', phrase('cultivate critical thinking', '培养批判性思维', 'Open-ended discussions help cultivate critical thinking.'), phrase('learn by rote', '死记硬背', 'Students who learn by rote may struggle to apply their knowledge.')],
      ['过度依赖人工智能可能削弱年轻人独立解决问题的能力。', 'An overreliance on artificial intelligence may undermine young people’s ability to solve problems independently.', phrase('an overreliance on', '对某事物的过度依赖', 'An overreliance on technology can reduce face-to-face interaction.'), phrase('undermine', '逐渐削弱', 'A lack of sleep can undermine academic performance.', 'verb')]
    ],
    '全球化': [
      ['国际贸易创造了就业机会，但也让本地企业面临激烈竞争。', 'International trade creates employment opportunities while exposing local businesses to fierce competition.', phrase('employment opportunities', '就业机会', 'Tourism generates employment opportunities for local residents.'), phrase('fierce competition', '激烈竞争', 'Small retailers face fierce competition from online platforms.')],
      ['接触不同文化可以开阔我们的眼界，并培养对他人的理解。', 'Exposure to different cultures can broaden our horizons and foster mutual understanding.', phrase('broaden our horizons', '开阔我们的眼界', 'Travelling abroad can broaden our horizons.'), phrase('foster mutual understanding', '促进相互理解', 'Cultural exchanges foster mutual understanding.')],
      ['政府需要在吸引外资和保护当地产业之间取得平衡。', 'Governments need to strike a balance between attracting foreign investment and protecting local industries.', phrase('strike a balance', '取得平衡', 'We should strike a balance between economic growth and environmental protection.'), phrase('foreign investment', '外国投资', 'Stable policies can attract foreign investment.')]
    ],
    '环境保护': [
      ['为了减少碳排放，政府应该鼓励人们使用公共交通工具。', 'To curb carbon emissions, governments should encourage people to use public transport.', phrase('curb carbon emissions', '遏制碳排放', 'Investing in clean energy can curb carbon emissions.'), phrase('public transport', '公共交通', 'Reliable public transport reduces our dependence on cars.')],
      ['只有改变消费习惯，我们才能从根本上解决塑料污染问题。', 'Only by changing our consumption habits can we tackle plastic pollution at its source.', phrase('consumption habits', '消费习惯', 'Sustainable consumption habits can reduce household waste.'), phrase('tackle plastic pollution', '应对塑料污染', 'Businesses and consumers must work together to tackle plastic pollution.')],
      ['保护生物多样性对维持生态平衡至关重要。', 'Safeguarding biodiversity is essential to maintaining the ecological balance.', phrase('safeguarding biodiversity', '保护生物多样性', 'Safeguarding biodiversity requires coordinated international action.'), phrase('ecological balance', '生态平衡', 'Deforestation can disrupt the ecological balance.')]
    ],
    '健康与体育': [
      ['规律运动不仅有益于身体健康，还能有效缓解工作压力。', 'Regular exercise not only benefits physical health but also provides an effective outlet for work-related stress.', phrase('an effective outlet for', '一种有效的释放途径', 'Creative hobbies provide an effective outlet for stress.'), phrase('work-related stress', '工作相关的压力', 'Flexible schedules can help reduce work-related stress.')],
      ['比起治疗疾病，政府更应该重视预防性医疗。', 'Governments should place greater emphasis on preventive healthcare rather than merely treating diseases.', phrase('place greater emphasis on', '更加重视', 'Schools should place greater emphasis on mental well-being.'), phrase('preventive healthcare', '预防性医疗', 'Investment in preventive healthcare can reduce long-term medical costs.')],
      ['久坐的生活方式会增加患慢性疾病的风险。', 'A sedentary lifestyle can increase the risk of developing chronic diseases.', phrase('a sedentary lifestyle', '久坐的生活方式', 'A sedentary lifestyle can have serious health consequences.'), phrase('chronic diseases', '慢性疾病', 'Regular physical activity can help prevent chronic diseases.')]
    ],
    '工作与生活': [
      ['灵活的工作安排可以帮助员工在事业与个人生活之间取得平衡。', 'Flexible working arrangements can help employees achieve a healthier work-life balance.', phrase('flexible working arrangements', '灵活的工作安排', 'Flexible working arrangements can improve employee satisfaction.'), phrase('work-life balance', '工作与生活的平衡', 'A healthy work-life balance is essential for long-term well-being.')],
      ['虽然远程工作节省了通勤时间，但它也可能让员工感到孤立。', 'While remote working saves commuting time, it can also leave employees feeling socially isolated.', phrase('commuting time', '通勤时间', 'Living close to the office can reduce commuting time.'), phrase('socially isolated', '在社交上感到孤立的', 'People who live alone may feel socially isolated.')],
      ['持续学习可以帮助员工适应快速变化的就业市场。', 'Lifelong learning enables employees to adapt to a rapidly evolving job market.', phrase('lifelong learning', '终身学习', 'Lifelong learning helps people remain professionally relevant.'), phrase('a rapidly evolving job market', '快速变化的就业市场', 'Transferable skills are valuable in a rapidly evolving job market.')]
    ],
    '文化与社会': [
      ['保护传统建筑有助于维系社区的文化认同感。', 'Preserving historic buildings helps maintain a community’s sense of cultural identity.', phrase('cultural identity', '文化认同', 'Traditional festivals help preserve cultural identity.'), phrase('preserving historic buildings', '保护历史建筑', 'Preserving historic buildings can revitalise local communities.')],
      ['公共图书馆不仅提供知识，也为居民创造了交流的空间。', 'Public libraries not only provide access to knowledge but also create spaces for meaningful social interaction.', phrase('access to knowledge', '获取知识的途径', 'The internet has expanded access to knowledge.'), phrase('meaningful social interaction', '有意义的社交互动', 'Community events encourage meaningful social interaction.')],
      ['志愿服务让年轻人有机会回馈社会，并培养责任感。', 'Volunteering gives young people the opportunity to give back to society and develop a sense of responsibility.', phrase('give back to society', '回馈社会', 'Many graduates choose to give back to society through volunteering.'), phrase('a sense of responsibility', '责任感', 'Caring for a pet can develop a sense of responsibility.')]
    ]
  };
  function makeQuestion(data, context = {}) {
    return {id: uid(), chinese: data.chinese, reference: data.reference, collocations: data.collocations || [], targets: data.targets || [], topic: context.topic || data.topic || '科技与教育', mode: context.mode || data.mode || 'writing', strategy: context.strategy || data.strategy || 'C', source: context.source || 'ai', createdAt: new Date().toISOString(), answer: '', review: null, selfRating: null, error: '', timer: {remaining: (context.mode || data.mode) === 'speaking' ? 20 : 90, deadline: null, warned: false}};
  }
  function localQuestion(context, used = []) {
    const records = TOPICS[context.topic];
    if (!records) throw new Error('自定义话题需要连接 AI；请先在设置中配置接口。');
    if (context.strategy === 'A') throw new Error('词库定向巩固需要连接 AI；请先配置接口。');
    const seen = new Set(used.map(q => normalize(q.chinese)));
    const choices = records.filter(row => !seen.has(normalize(row[0])) && (context.strategy !== 'B' || !(context.words || []).some(word => containsPhrase(row[1], word))));
    if (!choices.length) throw new Error('该话题的本地练习已完成。连接 AI 可继续生成全新题目，或切换其他话题。');
    const row = choices[Math.floor(Math.random() * choices.length)];
    return makeQuestion({chinese: row[0], reference: row[1], collocations: row.slice(2), targets: row.slice(2, 3)}, {...context, source: 'local'});
  }
  function initialState() {
    const q = makeQuestion({chinese: TOPICS['科技与教育'][0][0], reference: TOPICS['科技与教育'][0][1], collocations: TOPICS['科技与教育'][0].slice(2), targets: TOPICS['科技与教育'][0].slice(2,3)}, {topic:'科技与教育', mode:'writing', strategy:'C', source:'local'});
    return {version:1, revision:0, activeQueue:[q], historyQueue:[], currentIndex:0, vocabBank:[], mode:'writing', topic:'科技与教育', strategy:'C', theme:'light', vocabSort:'newest'};
  }
  function validPhrase(p) { return p && typeof p.word === 'string' && p.word.trim() && p.word.length <= 150; }
  function validQuestion(q) { return q && typeof q.id === 'string' && typeof q.chinese === 'string' && typeof q.reference === 'string' && typeof q.answer === 'string' && ['writing','speaking'].includes(q.mode) && typeof q.topic === 'string' && Array.isArray(q.collocations) && q.collocations.every(validPhrase) && Array.isArray(q.targets) && q.targets.every(validPhrase) && q.timer && Number.isFinite(q.timer.remaining) && (q.timer.deadline === null || Number.isFinite(q.timer.deadline)); }
  function validateState(s) {
    if (!s || s.version !== 1 || !Array.isArray(s.activeQueue) || !Array.isArray(s.historyQueue) || !Array.isArray(s.vocabBank) || !s.activeQueue.every(validQuestion) || !s.historyQueue.every(q=>validQuestion(q) && typeof q.completedAt === 'string') || !s.vocabBank.every(v=>validPhrase(v) && typeof v.id==='string' && typeof v.createdAt==='string') || !['writing','speaking'].includes(s.mode) || !['A','B','C'].includes(s.strategy) || typeof s.topic !== 'string') throw new Error('备份格式不正确，原有数据未被替换。');
    const ids = [...s.activeQueue,...s.historyQueue].map(q=>q.id);
    if (new Set(ids).size !== ids.length || new Set(s.vocabBank.map(v=>normalize(v.word))).size !== s.vocabBank.length) throw new Error('数据包含重复记录。');
    for(const q of [...s.activeQueue,...s.historyQueue]){
      if(q.review){
        if(q.review.kind==='ai')q.review=validateReview(q.review);
        else if(q.review.kind!=='self'||typeof q.review.upgradedSentence!=='string')throw new Error('自评数据无效。');
      }
      if(!['A','B','C'].includes(q.strategy))throw new Error('题目策略无效。');
    }
    s.currentIndex = Math.max(0, Math.min(Number.isInteger(s.currentIndex) ? s.currentIndex : 0, Math.max(0,s.activeQueue.length-1)));
    s.revision = Number.isFinite(s.revision) ? s.revision : 0;
    return s;
  }
  function archiveQuestion(state, id) {
    const index = state.activeQueue.findIndex(q=>q.id===id);
    if(index<0) throw new Error('该题已归档。');
    const q = state.activeQueue[index];
    if (!q.review || (q.review.kind==='self' && !q.selfRating)) throw new Error('请先完成批改或选择自评结果。');
    q.timer.deadline=null;
    state.activeQueue.splice(index,1);
    state.historyQueue.unshift({...q, completedAt: new Date().toISOString()});
    state.currentIndex = Math.min(index, Math.max(0,state.activeQueue.length-1));
    return q;
  }
  function restoreQuestion(state,id) {
    const index = state.historyQueue.findIndex(q=>q.id===id);
    if(index<0) throw new Error('历史记录不存在。');
    const old = state.historyQueue[index];
    // Keep previous attempts as immutable history; the new queue item has its own identity.
    const q = makeQuestion(old, {...old, source:old.source});
    q.previousAttemptId=old.id;
    state.activeQueue.unshift(q);state.currentIndex=0;state.mode=q.mode;state.topic=q.topic;state.strategy=q.strategy;
    return q;
  }
  function parseJSON(content) {
    if (typeof content !== 'string' || !content.trim()) throw new Error('AI 返回了空内容。');
    const clean = content.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
    try { return JSON.parse(clean); } catch { const start=clean.indexOf('{'),end=clean.lastIndexOf('}'); if(start>=0&&end>start){try{return JSON.parse(clean.slice(start,end+1));}catch{}} throw new Error('AI 未返回有效 JSON，请重试。'); }
  }
  function normalizePhrases(items) {
    if(!Array.isArray(items)) throw new Error('AI 返回的词伙列表无效。');
    return items.filter(validPhrase).slice(0,12).map(p=>({word:p.word.trim(),pos:typeof p.pos==='string'?p.pos:'phrase',def:typeof p.def==='string'?p.def:'',example:typeof p.example==='string'?p.example:''}));
  }
  function validateGenerated(data,context,used=[]) {
    if (!data || typeof data.chinese!=='string' || !data.chinese.trim() || !/[\u3400-\u9fff]/.test(data.chinese) || typeof data.reference!=='string' || wordCount(data.reference)<5 || wordCount(data.reference)>100) throw new Error('AI 题目格式不完整，请重试。');
    if (used.some(q=>normalize(q.chinese)===normalize(data.chinese)||normalize(q.reference)===normalize(data.reference))) throw new Error('AI 生成了已练题目，已拦截重复入队。');
    const collocations=normalizePhrases(data.collocations);
    const targets=normalizePhrases(data.targets);
    if (!collocations.length || !targets.length || collocations.some(p=>!containsPhrase(data.reference,p.word)) || targets.some(p=>!containsPhrase(data.reference,p.word))) throw new Error('AI 靶向词与范文不匹配，已拒绝入队。');
    if (context.required?.some(word=>!containsPhrase(data.reference,word))) throw new Error('AI 未包含指定词汇，已拒绝入队。');
    if (context.strategy==='B' && (context.words||[]).some(word=>[data.reference,...collocations.map(p=>p.word),...targets.map(p=>p.word)].some(text=>containsPhrase(text,word)))) throw new Error('AI 使用了应排除的词汇，已拒绝入队。');
    if (context.strategy==='C' && context.required?.length && !collocations.some(p=>!(context.words||[]).some(w=>normalize(w)===normalize(p.word)))) throw new Error('混合题缺少全新高分词伙，已拒绝入队。');
    return makeQuestion({...data,collocations,targets},context);
  }
  function validateReview(data) {
    if (!data || !['overallBand','lrScore','graScore'].every(key=>typeof data[key]==='number' && Number.isFinite(data[key]) && data[key]>=0 && data[key]<=9 && Number.isInteger(data[key]*2)) || typeof data.upgradedSentence!=='string' || !data.upgradedSentence.trim() || wordCount(data.upgradedSentence)>150 || !data.targetHit || typeof data.targetHit.hit!=='boolean' || typeof data.targetHit.comment!=='string' || !Array.isArray(data.corrections) || !data.corrections.every(c=>c && ['original','corrected','explanation'].every(key=>typeof c[key]==='string'))) throw new Error('AI 批改结构不完整或分数无效，请重试。');
    return {kind:'ai',overallBand:data.overallBand,lrScore:data.lrScore,graScore:data.graScore,targetHit:data.targetHit,upgradedSentence:data.upgradedSentence,corrections:data.corrections, vocabulary:normalizePhrases(data.vocabulary||[]), reviewedAt:new Date().toISOString()};
  }
  function tokenize(text,collocations=[]) {
    const raw = String(text).match(/\s+|[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu)||[];
    const phrases=collocations.filter(validPhrase).map(p=>({...p,parts:(p.word.match(/[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu)||[]).map(normalize)})).sort((a,b)=>b.parts.length-a.parts.length||b.word.length-a.word.length);
    const tokens=[];
    for(let i=0;i<raw.length;){
      if(/^\s+$/.test(raw[i])){tokens.push({text:raw[i],key:raw[i],type:'space'});i++;continue;}
      let found=null;
      for(const p of phrases){let j=i,k=0;while(j<raw.length&&k<p.parts.length){if(/^\s+$/.test(raw[j])){j++;continue;}if(normalize(raw[j])!==p.parts[k])break;j++;k++;}if(k===p.parts.length){found={text:raw.slice(i,j).join(''),key:p.parts.join(' '),type:'phrase',phrase:p,end:j};break;}}
      if(found){const {end,...t}=found;tokens.push(t);i=end;}else{const key=normalize(raw[i]);tokens.push({text:raw[i],key,type:!key?'punct':STOP_WORDS.has(key)?'functional':'word'});i++;}
    }
    return tokens;
  }
  function diffWords(original,reference,collocations=[]) {
    const a=tokenize(original,collocations).filter(t=>t.type!=='space');
    const b=tokenize(reference,collocations).filter(t=>t.type!=='space');
    // A question is capped at 600 words in the UI; reject oversized external inputs.
    if(a.length>1500||b.length>1500) throw new Error('文本过长，无法执行逐词比对。');
    const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
    for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i].key===b[j].key?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
    let i=0,j=0;const operations=[];
    while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i].key===b[j].key){operations.push({...b[j],op:'same'});i++;j++;}else if(i<a.length&&(j===b.length||dp[i+1][j]>=dp[i][j+1])){operations.push({...a[i++],op:'remove'});}else{operations.push({...b[j++],op:'add'});}}
    const core=[];const seen=new Set();for(const t of operations){if(t.op==='add'&&['word','phrase'].includes(t.type)&&!seen.has(t.key)){seen.add(t.key);core.push(t.phrase||{word:t.text,pos:'',def:'',example:''});}}
    return {operations,core};
  }
  const api={STORAGE_KEY,SETTINGS_KEY,TOPICS,STOP_WORDS,uid,normalize,containsPhrase,escapeHTML,wordCount,phrase,makeQuestion,localQuestion,initialState,validateState,archiveQuestion,restoreQuestion,parseJSON,normalizePhrases,validateGenerated,validateReview,tokenize,diffWords};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Passets=api;
})(typeof window!=='undefined'?window:globalThis);
