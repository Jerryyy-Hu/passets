'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const base=process.env.PASSETS_URL||'http://127.0.0.1:4174';
const results=[];
async function check(name,run){await run();results.push(name);console.log('PASS '+name);}
async function close(page,id){await page.locator('#'+id+' .dialog-header [data-action="close"]').click();await page.waitForFunction(id=>!document.getElementById(id).open,id);}
async function choose(page,id,value){const label=await page.locator('#'+id+' option').evaluateAll((items,target)=>items.find(item=>item.value===target).textContent,value);await page.locator('#'+id+'-trigger').click();await page.locator('#'+id+'-options').getByRole('option',{name:label,exact:true}).click();}
async function openAccount(page){await page.locator('[data-action="account"]').click();}
async function login(page,username,{register=false,importGuest=false}={}){
  await openAccount(page);if(register)await page.locator('[data-action="auth-mode"][data-value="register"]').click();
  await page.locator('#account-form input[name="username"]').fill(username);await page.locator('#account-form input[name="password"]').fill('test-password-long-enough');
  await page.locator('#account-form input[name="importGuest"]').setChecked(importGuest);await page.locator('#account-submit').click();
  await page.waitForFunction(()=>!document.querySelector('#account-session').hidden);await close(page,'account-dialog');
}
(async()=>{
  await fs.mkdir('.local',{recursive:true});
  const {fixture}=await import(pathToFileURL(path.resolve('tests/fixtures/account-service.mjs')).href),backend=fixture({allowedOrigins:[new URL(base).origin]});
  const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];
  const contexts=[];
  try{
    async function context({cloud=false,api=false}={}){
      const ctx=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(ctx);
      if(cloud){
        await ctx.route('**/cloud-config.js',route=>route.fulfill({contentType:'application/javascript',body:"window.PassetsCloudConfig={apiBase:'https://account.passets.test'};"}));
        await ctx.route('https://account.passets.test/api/account',async route=>{
          if(route.request().method()==='OPTIONS'){await route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':new URL(base).origin,'Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'}});return;}
          const req=route.request(),response=await backend.handle(new Request(req.url(),{method:'POST',headers:{...req.headers(),origin:new URL(base).origin,'x-forwarded-for':'browser-test'},body:req.postData()}));
          await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
        });
      }
      if(api){
        await ctx.addInitScript(()=>localStorage.setItem('passets.settings.v1',JSON.stringify({baseUrl:'https://coach.passets.test/v1',model:'test',apiKey:'test-only-placeholder',sound:false})));
        await ctx.route('https://coach.passets.test/v1/chat/completions',async route=>{const value={overallBand:7,lrScore:7.5,graScore:6.5,targetHit:{hit:true,comment:'表达清晰。'},upgradedSentence:'Technology should help teachers cater to diverse learning needs.',corrections:[{original:'help students',corrected:'cater to diverse learning needs',explanation:'让搭配更准确。'}],vocabulary:[{word:'diverse learning needs',pos:'phrase',def:'多样化的学习需求',example:'Schools cater to diverse learning needs.'}]};await route.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]})});});
      }
      const page=await ctx.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(base);await page.waitForSelector('#home-title');return page;
    }
    const page=await context({api:true});
    await check('the custom select supports pointer choice, arrow navigation, Escape and distinct entry/exit easing',async()=>{
      await page.locator('.entry-preferences').click();await page.locator('#topic-select-trigger').click();
      assert.equal(await page.locator('#topic-select').isVisible(),false);assert.ok(await page.locator('#topic-select-options').isVisible());
      await page.screenshot({path:'.local/custom-select.png',fullPage:true});
      await page.locator('#topic-select-trigger').press('End');await page.locator('#topic-select-trigger').press('Home');await page.locator('#topic-select-trigger').press('ArrowDown');await page.locator('#topic-select-trigger').press('Enter');
      assert.equal(await page.locator('#topic-select').inputValue(),'全球化');
      await page.locator('#topic-select-trigger').click();await page.locator('#topic-select-trigger').press('Escape');assert.equal(await page.locator('#topic-select-trigger').getAttribute('aria-expanded'),'false');
      await page.locator('#preferences-title').click();
      const timings=await page.locator('#practice-controls').evaluate(node=>{const open=getComputedStyle(node).transitionTimingFunction;node.classList.add('leaving');const exit=getComputedStyle(node).transitionTimingFunction;node.classList.remove('leaving');return {open,exit};});assert.notEqual(timings.open,timings.exit);
      await close(page,'practice-controls');
    });
    await check('each of the five themes has separately persistent day and night palettes',async()=>{
      for(const theme of ['light','sage','mist','dusk','dark']){
        await page.locator('#theme-trigger').click();await page.locator(`[data-action="set-theme"][data-value="${theme}"]`).click();await page.keyboard.press('Escape');
        for(const appearance of ['day','night']){
          if(await page.locator('html').getAttribute('data-appearance')!==appearance)await page.locator('#appearance-toggle').click();
          const colors=await page.evaluate(()=>{const style=getComputedStyle(document.documentElement);return ['--accent','--selected-bg','--saved-bg','--selected-text','--saved-text'].map(key=>style.getPropertyValue(key).trim());});
          assert.notEqual(colors[0],colors[1]);assert.notEqual(colors[1],colors[2]);assert.notEqual(colors[3],colors[4]);
          await page.reload();await page.waitForSelector('#home-title');assert.equal(await page.locator('html').getAttribute('data-theme'),theme);assert.equal(await page.locator('html').getAttribute('data-appearance'),appearance);
        }
      }
      assert.ok(await page.locator('.home-ambient svg').isVisible());await page.screenshot({path:'.local/refinements-home.png',fullPage:true});
    });
    await page.locator('#start-practice').click();await page.waitForSelector('#answer-input');
    await check('a short phone viewport keeps both the question and editable answer visible above the keyboard',async()=>{
      await page.setViewportSize({width:390,height:844});await page.locator('#answer-input').fill('A draft while the keyboard is open.');
      await page.waitForFunction(()=>document.body.classList.contains('editing-answer'));
      await page.setViewportSize({width:390,height:420});
      await page.waitForFunction(()=>Math.abs(document.querySelector('#practice-view').getBoundingClientRect().height-420)<2);
      const boxes=await page.evaluate(()=>{const question=document.querySelector('.question-text').getBoundingClientRect(),answer=document.querySelector('#answer-input').getBoundingClientRect();return {top:question.top,bottom:question.bottom,answerTop:answer.top,answerBottom:answer.bottom,height:innerHeight};});
      assert.ok(boxes.top>=0&&boxes.bottom<boxes.answerTop);assert.ok(boxes.answerBottom<=boxes.height);assert.ok(boxes.answerBottom-boxes.answerTop>=46);
      await page.screenshot({path:'.local/mobile-editing.png',fullPage:true});
      await page.locator('[data-action="self-review"]').click();assert.ok(await page.locator('#result-section').isVisible());assert.ok(!(await page.locator('body').getAttribute('class')||'').includes('editing-answer'));await page.locator('[data-action="edit-answer"]').click();
      await page.locator('[data-action="finish-typing"]').click();await page.setViewportSize({width:1440,height:1000});assert.ok(!(await page.locator('body').getAttribute('class')||'').includes('editing-answer'));
    });
    let originalId,originalAnswer;
    await check('self assessment can be upgraded to AI grading without losing the answer or rating',async()=>{
      originalAnswer=await page.locator('#answer-input').inputValue();originalId=await page.evaluate(()=>window.PassetsApp.getState().activeQueue[window.PassetsApp.getState().currentIndex].id);
      await page.locator('[data-action="self-review"]').click();await page.locator('[data-action="rate"][data-value="good"]').click();await page.locator('#result-section [data-action="submit"]').click();await page.waitForSelector('.band-score');
      const state=await page.evaluate(()=>window.PassetsApp.getState()),q=state.activeQueue[state.currentIndex];assert.equal(q.id,originalId);assert.equal(q.answer,originalAnswer);assert.equal(q.selfAssessment.rating,'good');assert.equal(q.review.kind,'ai');
      await page.locator('[data-action="finish"]').click();await page.waitForFunction(()=>window.PassetsApp.getState().historyQueue.length===1);
    });
    await check('the homepage journal opens the original answer, self rating and full AI corrections',async()=>{
      await page.locator('.back-home').click();await page.locator('.recent-attempt').click();await page.waitForSelector('.history-card details[open]');
      assert.ok((await page.locator('.history-answer').textContent()).includes(originalAnswer));assert.ok((await page.locator('.history-rating').textContent()).includes('基本掌握'));assert.ok(await page.locator('.history-card .correction').count()>0);
      await page.screenshot({path:'.local/history-detail.png',fullPage:true});await close(page,'history-dialog');
      await page.locator('[data-action="question-bank"]').click();await page.locator('[data-action="bank-filter"][data-value="done"]').click();assert.equal(await page.locator('.bank-item').count(),1);await close(page,'bank-dialog');
    });
    await check('archived self reviews can receive AI feedback without changing attempt identity or completion time',async()=>{
      await page.locator('#start-practice').click();await page.locator('#answer-input').fill('An archived self-assessed answer.');await page.locator('[data-action="self-review"]').click();await page.locator('[data-action="rate"][data-value="again"]').click();await page.locator('[data-action="finish"]').click();
      await page.waitForFunction(()=>window.PassetsApp.getState().historyQueue.length===2);const before=await page.evaluate(()=>window.PassetsApp.getState().historyQueue[0]);
      await page.locator('.back-home').click();await page.locator('.recent-attempt').first().click();await page.locator('[data-action="grade-history"]').click();await page.waitForFunction(()=>window.PassetsApp.getState().historyQueue[0].review.kind==='ai');
      const after=await page.evaluate(()=>window.PassetsApp.getState().historyQueue[0]);assert.equal(after.id,before.id);assert.equal(after.answer,before.answer);assert.equal(after.completedAt,before.completedAt);assert.equal(after.selfAssessment.rating,'again');assert.ok(await page.locator('#history-'+before.id+' details[open] .score-breakdown').isVisible());await close(page,'history-dialog');
    });
    await check('review mode deliberately reuses completed material and retains the original history',async()=>{
      await page.locator('[data-action="review-practice"]').click();await page.waitForSelector('#answer-input');
      const state=await page.evaluate(()=>window.PassetsApp.getState()),q=state.activeQueue[state.currentIndex];assert.equal(state.practiceMode,'review');assert.ok(q.isReview);assert.ok(state.historyQueue.some(record=>record.id===q.previousAttemptId));assert.equal(state.historyQueue.length,2);
    });
    await check('backup import retains completion marks and added bank material without overwriting the current draft',async()=>{
      await page.locator('#answer-input').fill('Keep the current draft.');const incoming=await page.evaluate(()=>window.PassetsApp.getState());incoming.activeQueue[incoming.currentIndex].answer='An older backup draft.';
      const added={topic:'科技与教育',chinese:'持续练习能帮助我们逐步积累更自然的表达。',reference:'Regular practice helps us gradually build more natural expressions.',collocations:[{word:'regular practice',def:'持续练习',example:'Regular practice helps.'}]};incoming.customQuestions.push(added);incoming.completedQuestions.push(added.chinese.replace(/[^\p{L}\p{N}']+/gu,' ').trim());
      await page.locator('.back-home').click();await page.locator('.main-nav [data-action="vocab"]').click();
      await page.locator('#import-file').setInputFiles({name:'practice-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'passets-backup',state:incoming}))});
      await page.waitForFunction(()=>window.PassetsApp.getState().customQuestions.length===1);await close(page,'vocab-dialog');await page.locator('#start-practice').click();
      const state=await page.evaluate(()=>window.PassetsApp.getState());assert.ok(state.completedQuestions.includes(incoming.completedQuestions.at(-1)));assert.equal(await page.locator('#answer-input').inputValue(),'Keep the current draft.');
    });
    if(process.env.PASSETS_TEST_ACCOUNTS!=='1'){
      assert.deepEqual(errors,[]);await fs.writeFile('.local/refinements-results.json',JSON.stringify({passed:results.length,checks:results,accounts:'Deferred; optional work-in-progress checks require PASSETS_TEST_ACCOUNTS=1'},null,2));console.log('All '+results.length+' frontend refinement checks passed. Account integration remains deferred.');return;
    }
    const a=await context({cloud:true}),b=await context({cloud:true});
    await check('account registration and a second device login sync one profile without importing guest data',async()=>{
      await b.locator('#start-practice').click();await b.locator('#answer-input').fill('Device B guest draft.');await b.locator('.back-home').click();
      await login(a,'browser_learner',{register:true});await a.locator('#start-practice').click();await a.locator('#answer-input').fill('The same account can continue this draft.');
      await a.evaluate(()=>window.PassetsCloud.flush(true));
      await login(b,'browser_learner');await b.locator('#start-practice').click();
      assert.equal(await b.locator('#answer-input').inputValue(),'The same account can continue this draft.');
      assert.ok(!(await b.evaluate(()=>window.PassetsApp.getState())).activeQueue.some(q=>q.answer==='Device B guest draft.'));
    });
    await check('vocabulary toggles propagate both additions and cancellations across devices',async()=>{
      await a.locator('.target-section summary').click();await a.locator('.target-section .chip').first().click();await a.evaluate(()=>window.PassetsCloud.flush(true));await b.evaluate(()=>window.PassetsCloud.refreshBeforePractice());
      assert.equal((await b.evaluate(()=>window.PassetsApp.getState())).vocabBank.length,1);
      await a.locator('.target-section .chip').first().click();await a.evaluate(()=>window.PassetsCloud.flush(true));await b.evaluate(()=>window.PassetsCloud.refreshBeforePractice());
      assert.equal((await b.evaluate(()=>window.PassetsApp.getState())).vocabBank.length,0);assert.equal(await b.locator('#answer-input').inputValue(),'The same account can continue this draft.');
    });
    let completed;
    await check('a question completed on one device is excluded from new draws on another',async()=>{
      completed=await a.evaluate(()=>{const state=window.PassetsApp.getState();return window.Passets.questionKey(state.activeQueue[state.currentIndex]);});
      await a.locator('[data-action="self-review"]').click();await a.locator('[data-action="rate"][data-value="good"]').click();await a.locator('[data-action="finish"]').click();
      await a.waitForFunction(()=>window.PassetsApp.getState().historyQueue.length===1);
      await a.evaluate(()=>window.PassetsCloud.flush(true));
      await b.locator('.back-home').click();await b.locator('#start-practice').click();
      const state=await b.evaluate(()=>window.PassetsApp.getState()),q=state.activeQueue[state.currentIndex];assert.ok(state.completedQuestions.includes(completed));assert.notEqual(await b.evaluate(()=>{const s=window.PassetsApp.getState();return window.Passets.questionKey(s.activeQueue[s.currentIndex]);}),completed);assert.equal(state.practiceMode,'new');assert.ok(!q.isReview);
    });
    await check('logout restores a separate guest workspace and another account starts isolated',async()=>{
      await openAccount(b);await b.locator('[data-action="sign-out"]').click();await b.waitForFunction(()=>document.querySelector('#account-session').hidden);await close(b,'account-dialog');
      await b.locator('.back-home').click();await b.locator('#start-practice').click();assert.equal(await b.locator('#answer-input').inputValue(),'Device B guest draft.');
      await b.locator('.back-home').click();await login(b,'another_learner',{register:true});assert.equal((await b.evaluate(()=>window.PassetsApp.getState())).historyQueue.length,0);assert.equal((await b.evaluate(()=>window.PassetsApp.getState())).vocabBank.length,0);
    });
    await check('expired sessions preserve cached work and expose a usable sign-in form',async()=>{
      await b.locator('#start-practice').click();await b.locator('#answer-input').fill('Keep this draft after expiration.');backend.advance(31*86400000);
      await b.evaluate(()=>window.PassetsCloud.refreshBeforePractice().catch(()=>{}));await openAccount(b);
      assert.ok(await b.locator('#account-form').isVisible());assert.ok((await b.evaluate(()=>window.PassetsApp.getState())).activeQueue.some(q=>q.answer==='Keep this draft after expiration.'));
    });
    assert.deepEqual(errors,[]);await fs.writeFile('.local/refinements-results.json',JSON.stringify({passed:results.length,checks:results},null,2));console.log('All '+results.length+' refinement checks passed.');
  }finally{for(const ctx of contexts)await ctx.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
