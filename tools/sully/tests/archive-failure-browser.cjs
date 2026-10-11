const {chromium}=require(process.env.SLOP_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.SLOP_BROWSER_CHANNEL?{channel:process.env.SLOP_BROWSER_CHANNEL}:{})});
 try{
  const page=await browser.newPage();let searches=0,metadata=0;
  await page.route('https://archive.org/**',route=>{
   const url=route.request().url();
   if(url.includes('advancedsearch.php')){searches++;return route.fulfill({status:503,body:'Temporarily unavailable'})}
   if(url.includes('/metadata/'))metadata++;
   return route.fulfill({status:503,body:'Temporarily unavailable'});
  });
  await page.goto(process.env.SLOP_TEST_URL||'http://127.0.0.1:8767/tools/sully/');
  const retry=page.locator('#retryRecommendations');await retry.waitFor({state:'visible'});
  assert.match(await page.locator('#clapResults').innerText(),/Archive returned a server error/);
  await page.waitForTimeout(1200);assert.equal(searches,1);assert.equal(metadata,0);
  await retry.click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('server error'));
  assert.equal(searches,2);assert.equal(metadata,0);
  console.log('PASS: Discover exposes the real failure; one request per manual attempt, no metadata fan-out');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
