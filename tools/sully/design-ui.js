'use strict';
// Keep the preview label on development hosts only.
const previewBadge=document.querySelector('.previewBadge');
if(previewBadge)previewBadge.hidden=!(/\.pages\.dev$/.test(location.hostname)&&location.hostname!=='akindoflikeness-site.pages.dev'||['localhost','127.0.0.1'].includes(location.hostname));
// Figma's shared search and view geometry, with real data and native controls.
function localSearch(root,id,label,hint,filter){
 const form=document.createElement('form');form.className='search contextualSearch';
 form.innerHTML=`<img src="assets/search.svg" alt=""><span class="localScope">${esc(label)}</span><input id="${id}" aria-label="${esc(hint)}" placeholder="${esc(hint)}" type="search"><button aria-label="${esc(hint)}"><img src="assets/submit.svg" alt=""></button>`;
 root.prepend(form);form.onsubmit=e=>{e.preventDefault();filter()};form.querySelector('input').oninput=filter;
}
function selectNavigation(button){document.querySelectorAll('#slopNavigation button').forEach(b=>{b.classList.toggle('active',b===button);if(b===button)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')})}
window.slopDiscoverMode=mode=>selectNavigation(mode==='home'?$('nav [data-view="discover"]'):$('#navSearch'));
window.slopViewChanged=name=>{selectNavigation(name==='genres'?$('#navGenres'):name==='discover'&&!$('#searchResults').hidden?$('#navSearch'):$(`nav [data-view="${name}"]`))};
localSearch($('#saved'),'savedQuery','Liked','Search liked artists, releases or tracks…',renderSaved);
const libraryOrder=document.createElement('div');libraryOrder.className='libraryOrder';
libraryOrder.innerHTML='<label for="savedSort">Order releases</label><select id="savedSort"><option value="recent">Recently liked</option><option value="artist">Artist A–Z</option><option value="release">Release A–Z</option></select>';
$('#savedList').before(libraryOrder);$('#savedSort').onchange=renderSaved;
function filterQueue(){$('#queueQuery').closest('form').hidden=!$('#queueList .track');const term=$('#queueQuery').value.toLocaleLowerCase().trim();$('#queueList').querySelectorAll('.track').forEach(row=>row.hidden=!!term&&!row.textContent.toLocaleLowerCase().includes(term));const count=[...$('#queueList').querySelectorAll('.track')].filter(r=>!r.hidden).length;$('#queueFilterStatus').hidden=!term;$('#queueFilterStatus').textContent=term?count+' matching tracks':'';}
localSearch($('#queue'),'queueQuery','Queue','Search this queue…',filterQueue);
const queueStatus=document.createElement('p');queueStatus.id='queueFilterStatus';queueStatus.className='dim';queueStatus.setAttribute('role','status');$('#queueList').before(queueStatus);
document.addEventListener('slop:queuechange',filterQueue);filterQueue();
for(const [name,selector,label] of [['docs','.docsSection','Docs'],['log','.logEntry','Log'],['about','section','About']]){
 if(name==='about')continue;
 const root=$('#'+name);localSearch(root,name+'Query',label,'Search '+label.toLowerCase()+'…',()=>{const term=$('#'+name+'Query').value.trim().toLocaleLowerCase();root.querySelectorAll(selector).forEach(row=>row.hidden=!!term&&!row.textContent.toLocaleLowerCase().includes(term))});
}
localSearch($('#about'),'aboutQuery','Archive','Artist or release name…',()=>{});
$('#about .search').onsubmit=e=>{e.preventDefault();$('#query').value=$('#aboutQuery').value;view('discover');$('#search').requestSubmit()};

// Show actual personal playlists in the same listening-path card pattern.
function renderListeningPaths(){
 const root=$('.pathGrid');const playlists=(window.slopPersonalState?.playlists||[]).filter(p=>p.tracks.length).slice(0,2);
 if(!playlists.length)return;
 root.innerHTML=playlists.map(p=>`<article class="pathCard"><div class="pathIdentity"><img loading="lazy" data-path-art="${esc(p.tracks[0].id)}" src="https://archive.org/services/img/${encodeURIComponent(p.tracks[0].id)}" alt="Artwork from ${esc(p.tracks[0].release)}"><div><p class="pathMeta">Your playlist · ${p.tracks.length} tracks</p><h3>${esc(p.title)}</h3><button data-path-queue="${esc(p.id)}">Queue path</button></div></div><div class="pathTracks">${p.tracks.slice(0,3).map(t=>`<p>${esc(t.title)}<small>${esc(t.artist)}</small></p>`).join('')}</div></article>`).join('');
 root.querySelectorAll('[data-path-queue]').forEach(b=>b.onclick=()=>{const p=window.slopPersonalState.playlists.find(x=>x.id===b.dataset.pathQueue);if(p){queue.push(...p.tracks);renderQueue();toast('Playlist added to the queue.')}});root.querySelectorAll('[data-path-art]').forEach(im=>SlopArtwork.attach(im,im.dataset.pathArt,undefined,true));
}
const defaultPaths=$('.pathGrid').innerHTML;
function refreshPaths(){if(!(window.slopPersonalState?.playlists||[]).some(p=>p.tracks.length)){$('.pathGrid').innerHTML=defaultPaths;$('.pathGrid').querySelectorAll('[data-collection]').forEach(b=>b.onclick=()=>{relatedSeed=null;collection=b.dataset.collection;genre='';$('#query').value='';view('discover');showSearchResults();search()})}else renderListeningPaths();}
window.slopPersonalReady.then(refreshPaths);
window.addEventListener('slop:personalchange',refreshPaths);

const activeFilters=document.createElement('div');activeFilters.className='activeFilters';$('#status').after(activeFilters);
window.slopRenderFilters=()=>{
 const terms=genre?(Array.isArray(genre)?genre:[genre]):[];activeFilters.hidden=!terms.length;
 activeFilters.innerHTML='<h3>Active filters</h3>'+terms.map((g,i)=>`<button data-filter-index="${i}" aria-label="Remove genre ${esc(g)}">${esc(g)} <img src="assets/remove.svg" alt=""></button>`).join('')+'<button data-clear-filters>Clear all</button>';
 activeFilters.querySelectorAll('[data-filter-index]').forEach(b=>b.onclick=()=>{const next=terms.filter((_,i)=>i!==Number(b.dataset.filterIndex));genre=next.length?next:'';search()});
 activeFilters.querySelector('[data-clear-filters]').onclick=()=>{genre='';search()};
};window.slopRenderFilters();
