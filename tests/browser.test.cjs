'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const base=process.env.PASSETS_URL||'http://127.0.0.1:4173';
const report=[];
async function check(name,fn){await fn();report.push(name);console.log(`PASS ${name}`);}
(async()=>{
  await fs.mkdir('.local',{recursive:true});
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1040}}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base);await page.waitForSelector('#answer-input');
    await check('initial queue silently preloads without replacing the current exercise',async()=>{
      await page.waitForFunction(()=>window.PassetsApp.getState().activeQueue.length===2);
      assert.ok((await page.locator('.question-text').textContent()).includes('科技不应取代教师'));
    });
    await page.screenshot({path:'.local/desktop.png',fullPage:true});
    await check('draft and wall-clock timer survive a page reload',async()=>{
      await page.locator('#answer-input').fill('Technology should help teachers cater to different students.');
      const before=await page.evaluate(()=>window.PassetsApp.getState());await page.reload();await page.waitForSelector('#answer-input');
      assert.equal(await page.locator('#answer-input').inputValue(),before.activeQueue[0].answer);
      assert.equal((await page.evaluate(()=>window.PassetsApp.getState())).activeQueue[0].timer.deadline,before.activeQueue[0].timer.deadline);
    });
    await check('self-review persists, archives exactly once and selects the next question',async()=>{
      await page.locator('[data-action="self-review"]').click();await page.locator('[data-action="rate"][data-value="good"]').click();
      await page.reload();await page.waitForSelector('[data-action="finish"]');
      assert.equal(await page.locator('[data-action="rate"].active').textContent(),'基本掌握');
      await page.locator('[data-action="finish"]').click();
      const s=await page.evaluate(()=>window.PassetsApp.getState());assert.equal(s.historyQueue.length,1);assert.ok(s.historyQueue[0].completedAt);assert.ok(!s.activeQueue.some(q=>q.id===s.historyQueue[0].id));
    });
    await check('history repractice preserves the original record and the other draft',async()=>{
      await page.locator('#answer-input').fill('Another unfinished answer.');
      await page.locator('.history-top').click();await page.locator('[data-action="restore"]').click();
      await page.waitForFunction(()=>!document.querySelector('#history-dialog').open);
      const s=await page.evaluate(()=>window.PassetsApp.getState());assert.equal(s.historyQueue.length,1);assert.equal(s.activeQueue[0].answer,'');assert.ok(s.activeQueue.some(q=>q.answer==='Another unfinished answer.'));
    });
    await check('vocabulary saving deduplicates and supports search plus sort',async()=>{
      await page.locator('.target-section summary').click();await page.locator('.target-section .chip').first().click();await page.locator('.target-section .chip').first().click();
      assert.equal((await page.evaluate(()=>window.PassetsApp.getState())).vocabBank.length,1);
      await page.locator('.main-nav [data-action="vocab"]').click();await page.locator('#vocab-search').fill('not-an-existing-term');assert.equal(await page.locator('.word-card').count(),0);
      await page.locator('#vocab-search').fill('cater');assert.equal(await page.locator('.word-card').count(),1);await page.locator('#vocab-sort').selectOption('az');
      await page.locator('#vocab-dialog [data-action="close"]').click();await page.waitForFunction(()=>!document.querySelector('#vocab-dialog').open);
    });
    await check('writing and speaking drafts are independent with 90/20 second timers',async()=>{
      await page.locator('#speaking-tab').click();await page.waitForSelector('#answer-input');await page.waitForFunction(()=>window.PassetsApp.getState().mode==='speaking'&&window.PassetsApp.getState().activeQueue[window.PassetsApp.getState().currentIndex]?.mode==='speaking');
      assert.equal(await page.locator('#timer-label').textContent(),'00:20');await page.locator('#answer-input').fill('Speaking draft.');
      await page.locator('#writing-tab').click();assert.equal(await page.locator('#answer-input').inputValue(),'');
      await page.locator('#speaking-tab').click();assert.equal(await page.locator('#answer-input').inputValue(),'Speaking draft.');
    });
    await check('mobile layout, drawers and long content stay within the viewport',async()=>{
      await page.setViewportSize({width:390,height:844});await page.reload();await page.waitForSelector('#answer-input');
      assert.equal(await page.locator('#practice-controls').getAttribute('open'),null);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:'.local/mobile.png',fullPage:true});
      await page.locator('.mobile-nav [data-action="vocab"]').click();assert.ok(await page.locator('#vocab-dialog').isVisible());
      assert.ok(await page.evaluate(()=>document.querySelector('#vocab-dialog').getBoundingClientRect().width<=innerWidth+1));
      await page.locator('#vocab-dialog [data-action="close"]').click();await page.waitForFunction(()=>!document.querySelector('#vocab-dialog').open);
      await page.setViewportSize({width:320,height:700});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    });
    await check('dark theme persists and reduced motion removes positional drawer transitions',async()=>{
      await page.locator('[data-action="theme"]').click();await page.reload();await page.waitForSelector('#answer-input');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
      await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#vocab-dialog')).transform),'none');
      await page.screenshot({path:'.local/mobile-dark.png',fullPage:true});
    });
    await check('real UI uses an explicit error instead of a fabricated AI score when disconnected',async()=>{
      await page.locator('#submit-answer').click();assert.ok(await page.locator('#settings-dialog').isVisible());assert.equal(await page.locator('.band-score').count(),0);
      assert.ok(await page.locator('input[name="sound"]').evaluate(input=>input.getBoundingClientRect().width<=20));
      await page.locator('#settings-dialog [data-action="close"]').click();await page.waitForFunction(()=>!document.querySelector('#settings-dialog').open);
    });
    assert.deepEqual(errors,[]);
    await context.close();
    const apiContext=await browser.newContext({viewport:{width:1440,height:1000}}),apiPage=await apiContext.newPage();
    const apiErrors=[];apiPage.on('pageerror',error=>apiErrors.push(error.message));
    let calls=0,failReview=false;
    await apiPage.addInitScript(()=>localStorage.setItem('passets.settings.v1',JSON.stringify({baseUrl:'https://test.invalid/v1',model:'test-model',apiKey:'test-only-not-a-real-key',sound:false})));
    await apiPage.route('https://test.invalid/v1/chat/completions',async route=>{
      const body=route.request().postDataJSON(),system=body.messages[0].content,payload=JSON.parse(body.messages[1].content);let value;
      if(system.includes('exercise author')){
        calls++;const required=payload.requiredTerms||[],words=required.length?required:['broaden our horizons'];const target=words[0];
        const reference=`Communities ${calls} can ${target} and foster meaningful international cooperation.`;
        value={chinese:`社区练习${calls}可以促进国际交流，并让人们拓宽视野。`,reference,collocations:[{word:target,pos:'phrase',def:'测试词汇',example:reference},{word:'meaningful international cooperation',pos:'noun phrase',def:'有意义的国际合作',example:reference}],targets:[{word:target,pos:'phrase',def:'测试靶向词',example:reference}]};
      }else if(system.includes('language coach')){
        if(failReview){await route.fulfill({status:401,contentType:'application/json',body:'{}'});return;}
        value={overallBand:7,lrScore:7.5,graScore:6.5,targetHit:{hit:false,comment:'搭配还可以更准确。'},upgradedSentence:'Technology should help teachers cater to diverse learning needs.',corrections:[{original:'different students',corrected:'diverse learning needs',explanation:'精确表达学习需求。'}],vocabulary:[{word:'diverse learning needs',pos:'noun phrase',def:'多样化学习需求',example:'Schools should cater to diverse learning needs.'}]};
      }else if(system.includes('vocabulary editor'))value={pos:'verb',def:'满足特定需求',example:'Schools should cater to every learner.'};else value={connected:true};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]})});
    });
    await apiPage.goto(base);await apiPage.waitForSelector('#answer-input');
    await check('mocked API flow grades, persists JSON, renders diff and archives AI scores',async()=>{
      await apiPage.locator('#answer-input').fill('Technology should help teachers and different students.');await apiPage.locator('#answer-input').press('Control+Enter');
      await apiPage.waitForSelector('.band-score');assert.ok((await apiPage.locator('.band-score').textContent()).includes('7.0'));assert.ok(await apiPage.locator('.diff-word').count()>0);
      await apiPage.reload();await apiPage.waitForSelector('.band-score');await apiPage.screenshot({path:'.local/ai-review.png',fullPage:true});
      await apiPage.locator('[data-action="finish"]').click();assert.equal((await apiPage.evaluate(()=>window.PassetsApp.getState())).historyQueue[0].review.overallBand,7);
    });
    await check('mocked API failure retains draft, shows the error and permits a retry',async()=>{
      failReview=true;await apiPage.locator('#answer-input').fill('My answer is kept after an API error.');await apiPage.locator('#submit-answer').click();await apiPage.waitForSelector('.error-panel');
      assert.ok((await apiPage.locator('.error-panel').textContent()).includes('401'));assert.equal(await apiPage.locator('#answer-input').inputValue(),'My answer is kept after an API error.');failReview=false;
    });
    await check('custom topics generate immediately while retaining the previous draft',async()=>{
      await apiPage.locator('#topic-select').selectOption('custom');await apiPage.locator('#custom-topic-input').fill('城市规划');await apiPage.locator('#custom-topic-form button').click();
      await apiPage.waitForFunction(()=>window.PassetsApp.getState().activeQueue[window.PassetsApp.getState().currentIndex]?.topic==='城市规划');assert.equal(await apiPage.locator('#answer-input').inputValue(),'');assert.ok((await apiPage.evaluate(()=>window.PassetsApp.getState())).activeQueue.some(q=>q.answer==='My answer is kept after an API error.'));
      await apiPage.waitForFunction(()=>window.PassetsApp.getState().activeQueue.filter(q=>q.topic==='城市规划').length===2);
    });
    await check('targeted vocabulary generation focuses a new A-mode question at the queue head',async()=>{
      await apiPage.locator('.target-section summary').click();await apiPage.locator('.target-section .chip').first().click();await apiPage.locator('.main-nav [data-action="vocab"]').click();
      await apiPage.locator('.word-card [data-action="target-word"]').first().click();
      await apiPage.waitForFunction(()=>window.PassetsApp.getState().strategy==='A');const s=await apiPage.evaluate(()=>window.PassetsApp.getState());assert.equal(s.currentIndex,0);assert.ok(s.activeQueue[0].reference.toLowerCase().includes(s.vocabBank[0].word.toLowerCase()));
    });
    assert.deepEqual(apiErrors,[]);await apiContext.close();
    await fs.writeFile('.local/browser-results.json',JSON.stringify({passed:report.length,checks:report},null,2));console.log(`All ${report.length} browser checks passed.`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
