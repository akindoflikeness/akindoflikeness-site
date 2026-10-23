import React, {useCallback, useLayoutEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Dialog} from '@base-ui/react/dialog';
import {Drawer} from '@base-ui/react/drawer';
import {Popover} from '@base-ui/react/popover';

const pending=new Set(['release','exportDialog','importDialog','playlistImportDialog','shareDialog','sidebarNowCover','recoverQueue']);
let resolveReady;
window.sullyUIReady=new Promise(resolve=>{resolveReady=resolve;});
function ready(element){if(element){pending.delete(element.id);if(!pending.size)queueMicrotask(resolveReady);}}

function mount(Component, props, before) {
  const host=document.createElement('div');
  host.dataset.sullyUi='';
  before ? before.replaceWith(host) : document.body.append(host);
  flushSync(()=>createRoot(host).render(<Component {...props}/>));
}

// The playback/library modules retain their DOM API. Base UI owns modal
// behaviour; the content subtree stays mounted so forms and listeners survive.
function AppDialog({id, html, title}) {
  const [open,setOpen]=useState(false), returnTo=useRef(null);
  const popup=useCallback(element=>{
    if(!element)return;
    Object.defineProperty(element,'open',{configurable:true,get:()=>element.hasAttribute('open')});
    element.showModal=()=>{returnTo.current=document.activeElement;flushSync(()=>setOpen(true));};
    element.close=()=>{flushSync(()=>setOpen(false));element.dispatchEvent(new Event('close'));};
    ready(element);
  },[]);
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Portal keepMounted>
      <Dialog.Backdrop className="uiBackdrop" hidden={!open}/>
      <Dialog.Popup ref={popup} id={id} className="sullyDialog" hidden={!open} open={open}
        finalFocus={()=>returnTo.current} aria-label={title}>
        <div dangerouslySetInnerHTML={{__html:html}}/>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}

function ArtworkDrawer() {
  const [open,setOpen]=useState(false),close=useRef(null);
  const trigger=document.querySelector('#artworkToggle');
  useLayoutEffect(()=>{
    const click=()=>setOpen(v=>!v);trigger.addEventListener('click',click);
    const player=document.querySelector('.player');
    const size=()=>document.documentElement.style.setProperty('--artwork-player-height',player.getBoundingClientRect().height+'px');
    const observer=new ResizeObserver(size);observer.observe(player);size();
    return ()=>{trigger.removeEventListener('click',click);observer.disconnect();};
  },[]);
  useLayoutEffect(()=>{
    trigger.setAttribute('aria-expanded',String(open));
    trigger.setAttribute('aria-label',open?'Close Artwork':'Open Artwork');
    trigger.title=open?'Close Artwork':'Open Artwork';
    const rail=document.querySelector('.shell > aside'), main=document.querySelector('main');
    const mobile=matchMedia('(max-width:720px)');
    const sync=()=>{rail.inert=open;main.inert=open&&mobile.matches;};
    sync();mobile.addEventListener('change',sync);
    return ()=>{mobile.removeEventListener('change',sync);rail.inert=false;main.inert=false;};
  },[open]);
  return <Drawer.Root open={open} onOpenChange={setOpen} modal={false} swipeDirection="left">
    <Drawer.Portal keepMounted>
      <Drawer.Popup id="sidebarNow" className="artworkDrawer" hidden={!open}
        initialFocus={close} finalFocus={()=>trigger}>
        <Drawer.Content className="artworkContent">
          <div className="artworkDrawerHeader"><Drawer.Title>Artwork</Drawer.Title><Drawer.Close id="closeArtwork" ref={close}>Close</Drawer.Close></div>
          <div className="artworkDrawerImage"><img ref={ready} id="sidebarNowCover" alt=""/></div>
        </Drawer.Content>
      </Drawer.Popup>
    </Drawer.Portal>
  </Drawer.Root>;
}

function QueueOptions() {
  return <Popover.Root>
    <Popover.Trigger className="queueOptionsTrigger">Options</Popover.Trigger>
    <Popover.Portal keepMounted>
      <Popover.Positioner side="bottom" align="end" sideOffset={8} className="uiPositioner">
        <Popover.Popup className="uiPopover">
          <Popover.Title className="srOnly">Queue Options</Popover.Title>
          <label className="uiCheck"><input ref={ready} id="recoverQueue" type="checkbox"/>Remember Queue</label>
          <Popover.Description>Saved here. Restores paused.</Popover.Description>
          <Popover.Close className="srOnly">Close Options</Popover.Close>
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>;
}

for(const element of [...document.querySelectorAll('dialog')]){
  const titles={release:'Release',exportDialog:'Back Up Library',importDialog:'Import Library',playlistImportDialog:'Import Playlist',shareDialog:'Share Track'};
  mount(AppDialog,{id:element.id,html:element.innerHTML,title:titles[element.id]},element);
}
document.querySelector('#sidebarNow').remove();
mount(ArtworkDrawer,{});
mount(QueueOptions,{},document.querySelector('.queueOptions'));
document.documentElement.dataset.ui='base-ui';
