/* Mount shared controls before the player binds to their persistent DOM. */
(async()=>{
  try {
    if (!window.sullyUIReady) throw new Error('Shared UI did not load');
    await window.sullyUIReady;
    for(const src of [
  "artwork.js?v=archive-load-1",
  "slop-slip.js?v=sully-20261011",
  "slop-slip-ui.js?v=base-ui-1",
  "slop-archive.js?v=music-filter-1",
  "slop-personal.js?v=recovery-validation-1",
  "app.js?v=music-filter-1",
  "personal-ui.js?v=recovery-consent-1",
  "design-ui.js?v=base-ui-1",
  "queue-order.js?v=ordering-1",
  "genre-directory.js?v=sully-20261011",
  "genre-ui.js?v=base-ui-1"
]){
      await new Promise((resolve,reject)=>{
        const script=document.createElement("script");
        script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error("Could not load "+src));
        document.body.append(script);
      });
    }
    document.querySelector('.shell').inert=false;
    document.querySelector('.shell').removeAttribute('aria-busy');
    document.querySelector('.player').inert=false;
    document.documentElement.dataset.ready="true";
  } catch(error){
    console.error(error);
    document.querySelector("#message").textContent="Sully could not start. Please reload the page.";
  }
})();
