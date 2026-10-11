const {chromium}=require(process.env.SLOP_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
const base=process.env.SLOP_TEST_URL||'http://127.0.0.1:8766/tools/sully/';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.SLOP_BROWSER_CHANNEL?{channel:process.env.SLOP_BROWSER_CHANNEL}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://archive.org/**',r=>r.request().url().includes('advancedsearch.php')?r.fulfill({json:{response:{numFound:12,docs:Array.from({length:12},(_,i)=>({identifier:'density-'+i,title:'An experimental recording '+(i+1),creator:'Independent artist',subject:['experimental'],date:'2026-01-01'}))}}}):r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#e4d6ba"/><circle cx="200" cy="200" r="100" fill="#333"/></svg>'}));
  await page.goto(base);
  await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('[data-genre="experimental"]').click();
  await page.locator('#results .card').first().waitFor();
  for(const [width,height] of [[1440,900],[1024,768],[390,844],[320,640]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>scrollTo(0,0));
   const geometry=await page.evaluate(()=>{
    const cover=document.querySelector('#results .cover').getBoundingClientRect();
    return {coverTop:cover.top,coverBottom:cover.bottom,playerTop:document.querySelector('.player').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.equal(geometry.overflow,false,`horizontal overflow at ${width}`);
   assert.ok(geometry.coverTop<height*.4,`search controls dominate the viewport at ${width}: ${JSON.stringify(geometry)}`);
   if(width>720)assert.ok(geometry.coverBottom<geometry.playerTop,`first cover obscured by player at ${width}`);
   console.log(`${width}px: results start at ${Math.round(geometry.coverTop)}px`);
   if(process.env.SLOP_SCREENSHOTS)await page.screenshot({path:process.env.SLOP_SCREENSHOTS+`/sully-compact-search-${width}.png`});
  }
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});
   for(const view of ['discover','genres','saved','queue','log','docs','about']){
    if(width<=720)await page.locator('#navigationToggle').click();
    await page.locator(view==='genres'?'#navGenres':`nav [data-view="${view}"]`).click();
    await page.evaluate(()=>scrollTo(0,0));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${view} overflow at ${width}`);
    if(process.env.SLOP_SCREENSHOTS)await page.screenshot({path:process.env.SLOP_SCREENSHOTS+`/sully-compact-${view}-${width}.png`});
   }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: search leaves room for recordings and every view fits desktop and mobile');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
