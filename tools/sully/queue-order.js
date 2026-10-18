(() => {
 const root=document.querySelector('#queueList'),query=document.querySelector('#queueQuery');
 const status=document.createElement('p');status.className='srOnly';status.setAttribute('role','status');root.after(status);
 function controls(){
  root.querySelectorAll('[data-qplay]').forEach(playButton=>{
   const i=Number(playButton.dataset.qplay),row=playButton.closest('.track');
   row.classList.add('orderableTrack');
   let group=row.querySelector('.queueOrder');
   if(!group){group=document.createElement('div');group.className='queueOrder';row.append(group);
    for(const [direction,label] of [[-1,'Move up'],[1,'Move down']]){
     const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.queueMove=direction;b.dataset.queueIndex=i;
     b.setAttribute('aria-label',label+': '+queue[i].title+', position '+(i+1));
     b.onclick=()=>{
      const target=i+direction;
      if(query.value.trim()||target<0||target>=queue.length)return;
      const [track]=queue.splice(i,1);queue.splice(target,0,track);renderQueue();
      root.querySelector(`[data-queue-index="${target}"][data-queue-move="${direction}"]`)?.focus();
      status.textContent=track.title+' moved to position '+(target+1)+' of '+queue.length+'.';
     };group.append(b);
    }
   }
   for(const b of group.children){const target=i+Number(b.dataset.queueMove);const filtered=!!query.value.trim();b.setAttribute('aria-disabled',String(filtered||target<0||target>=queue.length));b.title=filtered?'Clear queue search to change the order.':'';}
  });
 }
 document.addEventListener('slop:queuechange',controls);query.addEventListener('input',controls);controls();
})();
