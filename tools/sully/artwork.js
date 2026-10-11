'use strict';
window.SlopArtwork = (() => {
  function candidates(files) {
    return files.filter(f => !f.private && /\.(jpe?g|png|webp)$/i.test(f.name) && !/thumb|__ia_|back|booklet|insert|disc|tray|logo/i.test(f.name) && f.format !== 'Item Tile' && Number(f.size || 0) < 8000000)
      .map((f, order) => ({name:f.name, score:(/front/i.test(f.name)?100:0)+(/cover|folder|artwork/i.test(f.name)?60:0)+(f.source==='original'?10:0)+(/\.jpe?g$/i.test(f.name)?5:0), size:Number(f.size||0), order}))
      .sort((a,b)=>b.score-a.score||b.size-a.size||a.order-b.order).slice(0,4).map(f=>f.name);
  }
  const cache=new Map(), jobs=[]; let active=0;
  function pump(){while(active<4&&jobs.length){active++;const job=jobs.shift();job().finally(()=>{active--;pump()})}}
  function metadata(id){if(!cache.has(id))cache.set(id,new Promise(resolve=>{jobs.push(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const r=await fetch('https://archive.org/metadata/'+encodeURIComponent(id),{signal:controller.signal});if(!r.ok)throw Error();resolve(await r.json())}catch{resolve({files:[]})}finally{clearTimeout(timer)}});pump()}));return cache.get(id)}
  const bindings=new WeakMap();
  async function upgrade(img){const binding=bindings.get(img);if(!binding)return;const {id,files}=binding;const names=files??candidates((await metadata(id)).files||[]);for(const name of names){if(bindings.get(img)!==binding||!img.isConnected)return;const url='https://archive.org/download/'+encodeURIComponent(id)+'/'+name.split('/').map(encodeURIComponent).join('/');const probe=new Image();const good=await new Promise(resolve=>{const timer=setTimeout(()=>resolve(false),10000);probe.onload=()=>{clearTimeout(timer);resolve(Math.min(probe.naturalWidth,probe.naturalHeight)>180&&probe.naturalWidth/probe.naturalHeight>0.65&&probe.naturalWidth/probe.naturalHeight<1.55)};probe.onerror=()=>{clearTimeout(timer);resolve(false)};probe.src=url});if(good&&bindings.get(img)===binding&&img.isConnected){img.hidden=false;img.onerror=()=>{img.onerror=()=>{img.hidden=true};img.src=binding.fallback};img.src=url;return}}}
  let observer;
  function attach(img,id,files,lazy=false){const fallback='https://archive.org/services/img/'+encodeURIComponent(id);bindings.set(img,{id,files,fallback});img.hidden=false;img.onerror=()=>{img.hidden=true};img.src=fallback;if(lazy&&'IntersectionObserver' in window){observer??=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);upgrade(e.target)}},{rootMargin:'250px'});observer.observe(img)}else upgrade(img)}
  return {candidates,metadata,attach,resetLazy:()=>observer?.disconnect()};
})();
