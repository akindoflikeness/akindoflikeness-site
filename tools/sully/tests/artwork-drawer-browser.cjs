const {chromium}=require(process.env.SLOP_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
const base=process.env.SLOP_TEST_URL||'http://127.0.0.1:8767/tools/sully/';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.SLOP_BROWSER_CHANNEL?{channel:process.env.SLOP_BROWSER_CHANNEL}:{})});
 try {
  const page=await browser.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://archive.org/**',route=>{
   const url=route.request().url();
   if(url.includes('/metadata/'))return route.fulfill({json:{metadata:{title:'Drawer test release',creator:'Test artist'},files:[{name:'track.mp3',title:'Test track',format:'VBR MP3'}]}});
   if(url.includes('advancedsearch.php'))return route.fulfill({json:{response:{numFound:0,docs:[]}}});
   return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#e4d6ba"/><circle cx="300" cy="300" r="180" fill="#333"/></svg>'});
  });
  await page.goto(base+'#v=1&r=drawer-test&f=track.mp3');
  await page.waitForFunction(()=>!document.querySelector('#artworkToggle').disabled);
  for(const viewport of [{width:1440,height:900},{width:1024,height:500},{width:390,height:844},{width:667,height:375}]){
   await page.setViewportSize(viewport);
   assert.equal(await page.locator('#sidebarNow').isVisible(),false);
   const before=await page.locator('main').boundingBox();
   const audioBefore=await page.locator('#audio').evaluate(a=>({src:a.src,paused:a.paused,time:a.currentTime}));
   await page.locator('#artworkToggle').click();
   const panel=await page.locator('#sidebarNow').boundingBox(), cover=await page.locator('#sidebarNowCover').boundingBox(), player=await page.locator('.player').boundingBox();
   assert.ok(panel.x===0&&panel.y===0&&panel.y+panel.height<=player.y+1);
   assert.ok(cover.width>=175&&cover.height>=Math.min(175,viewport.height-210),JSON.stringify({viewport,cover}));
   assert.deepEqual(await page.locator('main').boundingBox(),before,'drawer must not move the page');
   assert.equal(await page.locator('aside').evaluate(e=>e.inert),true);
   assert.equal(await page.locator('#artworkToggle').getAttribute('aria-expanded'),'true');
   assert.equal(await page.locator('#sidebarNowCover').evaluate(e=>getComputedStyle(e).objectFit),'contain');
   assert.deepEqual(await page.locator('#audio').evaluate(a=>({src:a.src,paused:a.paused,time:a.currentTime})),audioBefore);
   if(viewport.width===1024&&process.env.SLOP_SCREENSHOTS)await page.screenshot({path:process.env.SLOP_SCREENSHOTS+'/sully-artwork-drawer.png'});
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#sidebarNow').isVisible(),false);
   assert.equal(await page.locator('aside').evaluate(e=>e.inert),false);
   assert.equal(await page.locator('#artworkToggle').evaluate(e=>e===document.activeElement),true);
   await page.locator('#artworkToggle').click();
   await page.locator('#closeArtwork').click();
   assert.equal(await page.locator('#sidebarNow').isVisible(),false);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: independent overlay, useful cover size, unchanged page/audio, mobile geometry, close and Escape focus recovery');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
