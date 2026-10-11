const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require.resolve('./artwork.js'),'utf8');
function harness(fetchImpl,good=true){
 const requests=[],probes=[];
 class Image {set src(url){if(!url)return;probes.push(url);this.naturalWidth=this.naturalHeight=600;queueMicrotask(()=>good?this.onload?.():this.onerror?.())}}
 const context={window:{},AbortController,setTimeout,clearTimeout,Image,fetch:async url=>{requests.push(url);return fetchImpl?fetchImpl(url):{ok:true,json:async()=>({files:[{name:'cover.jpg',size:'1000',source:'original'}]})}}};
 vm.runInNewContext(source,context);
 return {art:context.window.SlopArtwork,requests,probes};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const img=()=>({isConnected:true});
test('30 browsing thumbnails cause no metadata requests or original-image probes',async()=>{
 const h=harness();
 for(let i=0;i<30;i++){const el=img();h.art.attach(el,'album-'+i,undefined,true);assert.equal(el.loading,'lazy');assert.match(el.src,/services\/img/)}
 await tick();assert.equal(h.requests.length,0);assert.equal(h.probes.length,0);
});
test('player and drawer share metadata and a single cover probe, including later tracks',async()=>{
 const h=harness(),a=img(),b=img();h.art.attach(a,'album');h.art.attach(b,'album');await tick();
 assert.equal(h.requests.length,1);assert.equal(h.probes.length,1);assert.equal(a.src,b.src);assert.match(a.src,/download/);
 h.art.attach(img(),'album');await tick();assert.equal(h.probes.length,1);
});
test('server errors do not retry and failed cover probes are bounded and cached',async()=>{
 const failed=harness(async()=>({ok:false,status:503}));failed.art.attach(img(),'album');await tick();failed.art.attach(img(),'album');await tick();assert.equal(failed.requests.length,1);assert.equal(failed.probes.length,0);
 const missing=harness(undefined,false);missing.art.attach(img(),'album',['a.jpg','b.jpg','c.jpg','d.jpg','e.jpg']);await tick();assert.equal(missing.probes.length,4);missing.art.attach(img(),'album',['a.jpg','b.jpg','c.jpg','d.jpg','e.jpg']);await tick();assert.equal(missing.probes.length,4);
});
test('late artwork cannot overwrite a newly selected release',async()=>{
 const pending={};const h=harness(url=>new Promise(resolve=>pending[url.split('/').pop()]=resolve));const el=img();h.art.attach(el,'old');h.art.attach(el,'new');
 pending.new({ok:true,json:async()=>({files:[{name:'cover.jpg'}]})});await tick();
 pending.old({ok:true,json:async()=>({files:[{name:'cover.jpg'}]})});await tick();assert.match(el.src,/download\/new\//);
});
