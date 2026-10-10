'use strict';
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
function filterQueue(){const term=$('#queueQuery').value.toLocaleLowerCase().trim();$('#queueList').querySelectorAll('.track').forEach(row=>row.hidden=!!term&&!row.textContent.toLocaleLowerCase().includes(term));const count=[...$('#queueList').querySelectorAll('.track')].filter(r=>!r.hidden).length;$('#queueFilterStatus').textContent=term?count+' matching tracks':'';}
localSearch($('#queue'),'queueQuery','Queue','Search this queue…',filterQueue);
const queueStatus=document.createElement('p');queueStatus.id='queueFilterStatus';queueStatus.className='dim';queueStatus.setAttribute('role','status');$('#queueList').before(queueStatus);
document.addEventListener('slop:queuechange',filterQueue);
for(const [name,selector,label] of [['docs','.docsSection','Docs'],['log','.logEntry','Log'],['about','section','About']]){
 if(name==='about')continue;
 const root=$('#'+name);localSearch(root,name+'Query',label,'Search '+label.toLowerCase()+'…',()=>{const term=$('#'+name+'Query').value.trim().toLocaleLowerCase();root.querySelectorAll(selector).forEach(row=>row.hidden=!!term&&!row.textContent.toLocaleLowerCase().includes(term))});
}
localSearch($('#about'),'aboutQuery','Archive','Artist or release name…',()=>{});
$('#about .search').onsubmit=e=>{e.preventDefault();$('#query').value=$('#aboutQuery').value;view('discover');$('#search').requestSubmit()};

const genreView=document.createElement('section');genreView.id='genres';genreView.hidden=true;
genreView.innerHTML=`<h1>Genres</h1><p class="viewDescription">Browse by ear. Choose several genres, then carry them into Search.</p><div class="genreGuidance"><p>Use the search above to find a genre. Checkboxes keep your choices together.</p><output id="genreCount" aria-live="polite">0 genres selected</output></div><div class="genreWorkspace"><section class="genreVocabulary"><h2>Explore the vocabulary</h2><p class="dim">Examples from visible tags and suggestions. These groups are browsing aids, not an official hierarchy.</p><div id="genreOptions"></div><p id="noGenres" hidden>No genres match that name.</p></section><section class="genreSelection"><h2>Your selection</h2><div id="selectedGenres"></div><button id="searchGenres" class="primary" disabled>Search selected genres</button><button id="clearGenres">Clear selection</button><p class="dim">Find releases tagged with any selected genre. Archive tags can be incomplete.</p></section></div>`;
$('#discover').after(genreView);
const genreChoices=[['Ambient','Texture and atmosphere'],['Experimental','Less familiar forms'],['Electronic','Synthesized and electronic sounds'],['Jazz','Improvisation and conversation'],['Noise','Friction and intensity'],['Field recordings','Places, environments and everyday sound'],['Drone','Sustained tones'],['Electroacoustic','Acoustic and electronic worlds'],['Free improvisation','Unscripted performance'],['Sound art','Sound as a material'],['Minimal','Small changes and repetition'],['Musique concrète','Recorded sound transformed']];
const selectedGenres=new Set();
function renderGenres(){const term=($('#genreQuery')?.value||'').toLocaleLowerCase().trim();const choices=genreChoices.filter(([name])=>name.toLocaleLowerCase().includes(term));$('#genreOptions').innerHTML=choices.map(([name,note])=>`<label class="genreOption"><input type="checkbox" value="${esc(name.toLowerCase())}" ${selectedGenres.has(name.toLowerCase())?'checked':''}><span>${esc(name)}<small>${esc(note)}</small></span></label>`).join('');$('#noGenres').hidden=choices.length>0;$('#genreOptions').querySelectorAll('input').forEach(c=>c.onchange=()=>{c.checked?selectedGenres.add(c.value):selectedGenres.delete(c.value);renderGenres()});$('#genreCount').textContent=selectedGenres.size+' genres selected';$('#selectedGenres').innerHTML=selectedGenres.size?[...selectedGenres].map(g=>`<button data-remove-genre="${esc(g)}" aria-label="Remove ${esc(g)}">${esc(g)} ×</button>`).join(''):'<p class="dim">Choose a starting point.</p>';$('#selectedGenres').querySelectorAll('button').forEach(b=>b.onclick=()=>{selectedGenres.delete(b.dataset.removeGenre);renderGenres()});$('#searchGenres').disabled=!selectedGenres.size;}
localSearch(genreView,'genreQuery','Genres','Find a genre…',renderGenres);renderGenres();
$('#navGenres').onclick=$('#browseGenres').onclick=()=>{view('genres');window.scrollTo({top:0,behavior:'smooth'})};
$('#clearGenres').onclick=()=>{selectedGenres.clear();renderGenres()};
$('#searchGenres').onclick=()=>{relatedSeed=null;collection='';genre=[...selectedGenres];$('#query').value='';view('discover');showSearchResults();search();window.scrollTo({top:0,behavior:'smooth'})};

// Show actual personal playlists in the same listening-path card pattern.
function renderListeningPaths(){
 const root=$('.pathGrid');const playlists=(window.slopPersonalState?.playlists||[]).filter(p=>p.tracks.length).slice(0,2);
 if(!playlists.length)return;
 root.innerHTML=playlists.map(p=>`<article class="pathCard"><div class="pathIdentity"><img data-path-art="${esc(p.tracks[0].id)}" src="https://archive.org/services/img/${encodeURIComponent(p.tracks[0].id)}" alt="Artwork from ${esc(p.tracks[0].release)}"><div><p class="pathMeta">Your playlist · ${p.tracks.length} tracks</p><h3>${esc(p.title)}</h3><p>A sequence you kept.</p><button data-path-queue="${esc(p.id)}">Queue path</button></div></div><div class="pathTracks">${p.tracks.slice(0,3).map(t=>`<p>${esc(t.title)}<small>${esc(t.artist)}</small></p>`).join('')}</div></article>`).join('');
 root.querySelectorAll('[data-path-queue]').forEach(b=>b.onclick=()=>{const p=window.slopPersonalState.playlists.find(x=>x.id===b.dataset.pathQueue);if(p){queue.push(...p.tracks);renderQueue();toast('Playlist added to the queue.')}});root.querySelectorAll('[data-path-art]').forEach(im=>SlopArtwork.attach(im,im.dataset.pathArt));
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
