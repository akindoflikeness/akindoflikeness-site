/* Bounded numerical demonstration. No perceptual or universal guarantees. */
(function(root){
'use strict';
class Filter {
 constructor(f,q,fs){const w=2*Math.PI*f/fs,a=Math.sin(w)/(2*q),c=Math.cos(w);this.b=[(1-c)/2/(1+a),(1-c)/(1+a),(1-c)/2/(1+a)];this.a=[-2*c/(1+a),(1-a)/(1+a)];this.x1=this.x2=this.y1=this.y2=0;}
 step(x){const y=this.b[0]*x+this.b[1]*this.x1+this.b[2]*this.x2-this.a[0]*this.y1-this.a[1]*this.y2;this.x2=this.x1;this.x1=x;this.y2=this.y1;this.y1=y;return y;}
}
const smooth=x=>x*x*x*(10+x*(-15+6*x));
function project(v,active){const a=active.map(i=>v[i]).sort((a,b)=>b-a);let sum=0,theta=0;for(let j=0;j<a.length;j++){sum+=a[j];const t=(sum-1)/(j+1);if(a[j]>t)theta=t;}return v.map((x,i)=>active.includes(i)?Math.max(0,x-theta):0);}
function prepare(H=15,Q=12){
 const fs=16000,pre=fs,sw=pre+24000,N=1280,total=sw+N+28800,old=new Filter(150,4,fs),copy=new Filter(350,Q,fs),ideal=new Filter(350,Q,fs),cold=new Filter(350,Q,fs);
 const s=new Float64Array(total),c=new Float64Array(total),a=new Float64Array(total),oracle=new Float64Array(total),raw=new Float64Array(total);
 const start=sw-Math.round(H*fs/1000);
 function input(k){return .15*Math.sin(2*Math.PI*50*k/fs)+.12*Math.sin(2*Math.PI*150*k/fs)+.08*Math.sin(2*Math.PI*350*k/fs);}
 for(let k=0;k<total;k++){const x=input(k);s[k]=old.step(x);oracle[k]=ideal.step(x);if(k>=start)c[k]=copy.step(x);if(k>=sw)raw[k]=cold.step(x);}
 const loop=Math.round(.02*fs);for(let k=sw;k<total;k++)a[k]=s[sw-loop+(k-sw)%loop];
 const paths=Array.from({length:N+1},(_,j)=>[s[sw+j],c[sw+j],a[sw+j]]);
 const ref=paths.map((p,j)=>{const z=smooth(j/N);return (1-z)*p[0]+z*p[1];});
 const scale=Math.max(1e-6,ref.reduce((z,x)=>z+x*x,0)/ref.length);
 return {fs,sw,N,total,s,c,a,oracle,raw,paths,ref,scale,H,Q};
}
function evaluate(m,w,lambda,gradient=false){
 const n=m.N,y=w.map((v,j)=>v.reduce((z,x,i)=>z+x*m.paths[j][i],0)),g=gradient?w.map(()=>[0,0,0]):null;let cost=0;
 // Fixed unit conventions: mean squared amplitude and sample-difference errors,
 // normalized by reference power. lambda penalizes sample-to-sample weights.
 const beta=8,den=m.scale*(n+1);
 for(let j=0;j<=n;j++){const e=y[j]-m.ref[j];cost+=e*e/den;if(g)for(let i=0;i<3;i++)g[j][i]+=2*e*m.paths[j][i]/den;}
 for(let j=1;j<=n;j++){const e=(y[j]-y[j-1])-(m.ref[j]-m.ref[j-1]);cost+=beta*e*e/den;for(let i=0;i<3;i++){const d=w[j][i]-w[j-1][i];cost+=lambda*d*d;if(g){g[j][i]+=2*beta*e*m.paths[j][i]/den+2*lambda*d;g[j-1][i]-=2*beta*e*m.paths[j-1][i]/den+2*lambda*d;}}}
 return {cost,g,y};
}
function solve(m,lambda=1,active=[0,1,2],maxIter=1200,seed=null){
 const n=m.N;let w=seed?seed.map(v=>v.slice()):Array.from({length:n+1},(_,j)=>[1-j/n,j/n,0]),cur=evaluate(m,w,lambda,true),step=1,iterations=0,residual=Infinity;
 for(;iterations<maxIter;iterations++){
  let candidate,next;for(let bt=0;bt<30;bt++){candidate=w.map((v,j)=>j===0?[1,0,0]:j===n?[0,1,0]:project(v.map((x,i)=>x-step*cur.g[j][i]),active));next=evaluate(m,candidate,lambda,false);if(next.cost<=cur.cost+1e-14)break;step*=.5;}
  residual=0;for(let j=1;j<n;j++)for(let i=0;i<3;i++)residual=Math.max(residual,Math.abs(candidate[j][i]-w[j][i])/step);
  w=candidate;cur=evaluate(m,w,lambda,true);if(residual<1e-6){iterations++;break;}step=Math.min(step*1.1,10);
 }
 return {w,y:cur.y,cost:cur.cost,iterations,residual,converged:residual<1e-6};
}
function run(H=15,Q=12,lambda=1){const m=prepare(H,Q),linear=Array.from({length:m.N+1},(_,j)=>[1-j/m.N,j/m.N,0]);const t=Date.now(),two=solve(m,lambda,[0,1]),three=solve(m,lambda,[0,1,2],1200,two.w);return {m,two,three,linear:{w:linear,...evaluate(m,linear,lambda)},milliseconds:Date.now()-t,historyRms:Math.sqrt(m.c.slice(m.sw,m.sw+m.N+1).reduce((z,x,j)=>z+(x-m.oracle[m.sw+j])**2,0)/(m.N+1))};}
function audio(r,mode){const m=r.m,start=m.sw-Math.round(1.5*m.fs),out=new Float32Array(m.total-start);for(let k=start;k<m.total;k++){let y;if(k<m.sw)y=m.s[k];else if(mode==='cold')y=m.raw[k];else if(k<=m.sw+m.N)y=r[mode].y[k-m.sw];else y=m.c[k];const j=k-start,fade=Math.round(.03*m.fs),envelope=Math.min(1,j/fade,(out.length-1-j)/fade);out[j]=y*Math.max(0,envelope);}return out;}
const api={prepare,evaluate,solve,run,audio,project};if(typeof module!=='undefined')module.exports=api;root.NZBT=api;
})(typeof globalThis!=='undefined'?globalThis:this);

(()=>{let cleanup;function init(){if(cleanup){cleanup();cleanup=null;}const root=document.getElementById('nzbt-tool');if(!root)return;let result,context,source,frame;const $=id=>root.querySelector('#'+id);
function plot(id,lines){const c=$(id),x=c.getContext('2d'),W=c.width,H=c.height;x.clearRect(0,0,W,H);x.setLineDash([]);const peak=id==='weights'?1:Math.max(.1,...lines.flatMap(l=>Array.from(l[0],Math.abs)));for(let j=0;j<5;j++){x.strokeStyle='#303030';x.beginPath();x.moveTo(0,j*H/4);x.lineTo(W,j*H/4);x.stroke();}for(const [index,[data,color]]of lines.entries()){x.setLineDash(id==='weights'?[[],[9,5],[2,4]][index]:[[2,4],[9,5],[]][index]);x.strokeStyle=color;x.lineWidth=2;x.beginPath();data.forEach((v,j)=>{const px=j/(data.length-1)*W,py=id==='weights'?H-12-v*(H-24):H/2-v/peak*(H/2-14);j?x.lineTo(px,py):x.moveTo(px,py);});x.stroke();}}
function calculate(){ $('status').textContent=' Calculating…';$('run').disabled=true;setTimeout(()=>{if(!root.isConnected)return;try{result=NZBT.run(+$('h').value,+$('q').value,+$('l').value);plot('wave',[[result.linear.y,'#777'],[result.two.y,'#bbb'],[result.three.y,'#fff']]);plot('weights',[0,1,2].map((i)=>[result.three.w.map(v=>v[i]),['#fff','#bbb','#999'][i]]));$('metrics').innerHTML='<table><tr><th>Method</th><th>Objective J</th><th>Iterations</th><th>Projected residual</th></tr>'+['linear','two','three'].map(k=>'<tr><td>'+k+'</td><td>'+result[k].cost.toFixed(6)+'</td><td>'+(result[k].iterations??'—')+'</td><td>'+(result[k].residual?.toExponential(2)??'—')+'</td></tr>').join('')+'</table><p>Copy vs longer-history output RMS: '+result.historyRms.toExponential(3)+'. Calculation time: '+result.milliseconds+' ms. Three-path solver: '+(result.three.converged?'converged to stated tolerance':'iteration cap reached; approximate result')+'.</p>';let peak=0;for(const mode of ['three','two','linear','cold'])for(const sample of NZBT.audio(result,mode))peak=Math.max(peak,Math.abs(sample));result.gain=Math.min(.35,.65/Math.max(peak,1e-6));$('status').textContent=' Updated.';root.querySelectorAll('.play').forEach(b=>b.disabled=false);}catch(e){$('status').textContent=e.message;}finally{$('run').disabled=false;}},30);}
for(const [id,out]of [['h','hv'],['q','qv'],['l','lv']])$(id).oninput=()=>{$(out).value=$(id).value;$('status').textContent=' Settings changed; calculate to apply.';root.querySelectorAll('.play').forEach(b=>b.disabled=true);};
function stop(){cancelAnimationFrame(frame);if(source){source.onended=null;source.stop();source=null;}$('listen-status').textContent='Stopped.';root.querySelectorAll('.play').forEach(b=>b.setAttribute('aria-pressed','false'));}
$('run').onclick=()=>{stop();calculate();};$('stop').onclick=stop;
root.querySelectorAll('.play').forEach(b=>b.onclick=async()=>{stop();document.getElementById('audio')?.pause();context??=new AudioContext();await context.resume();if(!root.isConnected)return;const clip=NZBT.audio(result,b.dataset.mode),buf=context.createBuffer(1,clip.length,result.m.fs),data=buf.getChannelData(0);for(let j=0;j<clip.length;j++)data[j]=clip[j]*result.gain;source=context.createBufferSource();source.buffer=buf;source.connect(context.destination);const began=context.currentTime,duration=clip.length/result.m.fs;source.start();b.setAttribute('aria-pressed','true');const name=b.textContent.replace('Hear ','');function tick(){const time=Math.min(duration,context.currentTime-began);$('listen-progress').value=time;$('listen-status').textContent=name+' · '+time.toFixed(2)+' s · '+(time<1.5?'Before change':time<1.58?'Transition':'After change');if(time<duration)frame=requestAnimationFrame(tick);}source.onended=()=>{cancelAnimationFrame(frame);source=null;$('listen-status').textContent=name+' · Finished.';b.setAttribute('aria-pressed','false');};tick();});cleanup=()=>{stop();if(context)context.close();};calculate();

}document.addEventListener('akol:page',init);init();})();
