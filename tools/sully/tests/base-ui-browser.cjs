const {chromium}=require(process.env.SLOP_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
const base=process.env.SLOP_TEST_URL||'http://127.0.0.1:8766/tools/sully/';
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.SLOP_BROWSER_CHANNEL?{channel:process.env.SLOP_BROWSER_CHANNEL}:{})});
  try {
    const page=await browser.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://archive.org/**',route=>{
      const url=route.request().url();
      if(url.includes('/metadata/'))return route.fulfill({json:{metadata:{title:'A quiet release',creator:'Test artist'},files:[{name:'track.mp3',title:'Test track',format:'VBR MP3'}]}});
      if(url.includes('advancedsearch.php'))return route.fulfill({json:{response:{numFound:1,docs:[{identifier:'ui-test',title:'A quiet release',creator:'Test artist'}]}}});
      return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#e4d6ba"/></svg>'});
    });
    await page.goto(base+'#v=1&r=ui-test&f=track.mp3');
    await page.waitForFunction(()=>document.documentElement.dataset.ready==='true'&&!document.querySelector('#shareCurrent').disabled);
    for(const viewport of [{width:1440,height:900},{width:390,height:640}]){
      await page.setViewportSize(viewport);
      const before=await page.locator('#audio').evaluate(a=>({src:a.src,paused:a.paused,time:a.currentTime}));
      await page.locator('#shareCurrent').click();
      await page.locator('#shareDialog').waitFor({state:'visible'});
      assert.equal(await page.locator('#shareDialog').getAttribute('role'),'dialog');
      await page.waitForFunction(()=>document.querySelector('#shareDialog').contains(document.activeElement));
      for(let i=0;i<10;i++){
        await page.keyboard.press('Tab');
        await page.waitForFunction(()=>document.querySelector('#shareDialog').contains(document.activeElement),{},{timeout:2000});
      }
      const box=await page.locator('#shareDialog').boundingBox();
      assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,JSON.stringify(box));
      if(process.env.SLOP_SCREENSHOTS)await page.screenshot({path:process.env.SLOP_SCREENSHOTS+`/sully-share-${viewport.width}.png`});
      await page.keyboard.press('Escape');
      await page.locator('#shareDialog').waitFor({state:'hidden'});
      await page.waitForFunction(()=>document.activeElement===document.querySelector('#shareCurrent'));
      await page.locator('#shareCurrent').click();
      await page.locator('#closeShare').click();
      await page.locator('#shareDialog').waitFor({state:'hidden'});
      assert.deepEqual(await page.locator('#audio').evaluate(a=>({src:a.src,paused:a.paused,time:a.currentTime})),before);
    }
    await page.setViewportSize({width:1440,height:900});
    await page.locator('nav [data-view="saved"]').click();
    await page.locator('#exportLibrary').click();
    await page.locator('#exportDialog').waitFor({state:'visible'});
    // Pointer dismissal and repeated opening retain the original form/listener nodes.
    await page.mouse.click(5,5);
    await page.locator('#exportDialog').waitFor({state:'hidden'});
    await page.locator('#exportLibrary').click();
    assert.equal(JSON.parse(await page.locator('#backupText').inputValue()).format,'slop-library');
    await page.locator('#closeExport').click();
    await page.locator('nav [data-view="queue"]').click();
    await page.locator('.queueOptionsTrigger').click();
    await page.locator('#recoverQueue').check();
    await page.keyboard.press('Escape');
    await page.locator('#recoverQueue').waitFor({state:'hidden'});
    await page.waitForFunction(()=>document.activeElement===document.querySelector('.queueOptionsTrigger'));
    await page.locator('.queueOptionsTrigger').click();
    assert.equal(await page.locator('#recoverQueue').isChecked(),true);
    await page.locator('#queue h1').click();
    await page.locator('#recoverQueue').waitFor({state:'hidden'});
    await page.reload();
    await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
    assert.equal(await page.locator('#recoverQueue').isChecked(),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: Base UI startup, modal focus and dismissal, responsive geometry, retained forms, popover persistence and unchanged audio');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
