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
  const bindings=new WeakMap(), covers=new Map();
  function cover(id,files){
    const key=JSON.stringify([id,files??null]);
    if(!covers.has(key))covers.set(key,(async()=>{
      const names=(files??candidates((await metadata(id)).files||[])).slice(0,4);
      for(const name of names){
        const url='https://archive.org/download/'+encodeURIComponent(id)+'/'+name.split('/').map(encodeURIComponent).join('/');
        const good=await new Promise(resolve=>{
          const probe=new Image();
          const finish=ok=>{clearTimeout(timer);probe.onload=probe.onerror=null;if(!ok)probe.src='';resolve(ok)};
          const timer=setTimeout(()=>finish(false),10000);
          probe.onload=()=>finish(Math.min(probe.naturalWidth,probe.naturalHeight)>180&&probe.naturalWidth/probe.naturalHeight>0.65&&probe.naturalWidth/probe.naturalHeight<1.55);
          probe.onerror=()=>finish(false);
          probe.src=url;
        });
        if(good)return url;
      }
      return null;
    })());
    return covers.get(key);
  }
  async function upgrade(img){
    const binding=bindings.get(img);
    if(!binding)return;
    const url=await cover(binding.id,binding.files);
    if(url&&bindings.get(img)===binding&&img.isConnected){
      img.hidden=false;
      img.onerror=()=>{img.onerror=()=>{img.hidden=true};img.src=binding.fallback};
      img.src=url;
    }
  }
  function attach(img,id,files,thumbnail=false){
    const fallback='https://archive.org/services/img/'+encodeURIComponent(id);
    bindings.set(img,{id,files,fallback});
    img.hidden=false;
    img.onerror=()=>{img.hidden=true};
    if(thumbnail)img.loading='lazy';
    img.src=fallback;
    // Lists use Archive's thumbnail service. Only opened releases and the
    // player resolve larger artwork, shared across duplicate cover elements.
    if(!thumbnail)upgrade(img);
  }
  return {candidates,metadata,attach,resetLazy:()=>{}};
})();
