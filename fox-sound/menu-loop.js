/* Fox Sound Studio — original menu loop synthesis, 16 bars / 48 seconds at 80 BPM.
   No external samples, no vocals or third-party music. */
(function(){
"use strict";
const SR=32000, BPM=80, BEAT=60/BPM, N=16*4*BEAT*SR;
const chords=[[48,52,55,59],[45,48,52,55],[41,45,48,52],[43,48,50,55],[40,43,47,50],[45,48,52,55],[50,53,57,60],[43,47,50,53],[48,52,55,59],[40,43,47,50],[41,45,48,52],[43,47,50,55],[45,48,52,55],[41,45,48,52],[43,47,50,53],[43,47,50,53]];
const melody=[
[[0,76,1.15],[1.5,79,.75],[2.5,76,1.2]],
[[0,76,.75],[1,72,.85],[2.25,74,.66],[3.1,72,.62]],
[[0,72,.86],[1,76,1.25],[2.75,79,.72]],
[[0,74,.9],[1.25,72,.75],[2.25,74,.68],[3.1,79,.68]],
[[0,79,1.15],[1.5,76,.76],[2.5,74,1.2]],
[[0,76,.75],[1,72,.9],[2.25,76,.65],[3.1,79,.65]],
[[0,77,.9],[1.25,74,.75],[2.25,72,1.45]],
[[0,71,.9],[1.25,74,.84],[2.5,79,1.2]],
[[0,76,.94],[1.13,79,.8],[2.3,83,1.5]],
[[0,81,.86],[1,79,.8],[2.15,76,.78],[3,74,.68]],
[[0,76,1.1],[1.45,72,.75],[2.55,77,1.1]],
[[0,79,.8],[1.12,74,.9],[2.4,71,1.3]],
[[0,72,.75],[1.1,76,1.1],[2.6,79,.88]],
[[0,77,.85],[1,76,.88],[2.12,72,.9],[3.12,69,.67]],
[[0,71,1.1],[1.4,74,.85],[2.6,79,1.1]],
[[0,79,.8],[1.1,74,.8],[2.2,71,.86],[3.2,74,.68]]
];
function rand(seed){let v=(seed|0)||0x9a9472;return()=>{v^=v<<13;v^=v>>>17;v^=v<<5;return(v>>>0)/4294967296}}
const hz=n=>440*Math.pow(2,(n-69)/12);
function run(seed=20261028){
 const L=new Float32Array(N),R=new Float32Array(N);
 function note(t0,midi,dur,gain,kind="flute",pan=0,velocity=1){
  const start=((Math.round(t0*SR)%N)+N)%N, count=Math.round(dur*SR),f=hz(midi);
  const l=Math.cos(Math.PI/4*(1+pan))*gain*velocity,r=Math.sin(Math.PI/4*(1+pan))*gain*velocity;
  let phase=0;
  for(let i=0;i<count;i++){
   const t=i/SR,u=Math.max(0,1-t/dur);
   let w,e;
   const p=2*Math.PI*f*t;
   switch(kind){
   case "flute":{
    const vibrato=.0022*Math.sin(2*Math.PI*5.15*t)*(1-Math.exp(-t*4));
    const ph=2*Math.PI*f*(t+(-.0022/(2*Math.PI*5.15))*Math.cos(2*Math.PI*5.15*t)*(1-Math.exp(-t*4)));
    w=Math.sin(ph)+.11*Math.sin(2*ph+.3)+.034*Math.sin(3*ph+.6);
    e=Math.min(1,t/.1)*Math.min(1,(dur-t)/.24)*(.93+.07*Math.sin(2*Math.PI*.82*t));break;}
   case "strings":{
    const ph=2*Math.PI*f*(t+.001*Math.sin(2*Math.PI*4.1*t));
    w=.73*Math.sin(ph)+.19*Math.sin(2*ph+.22)+.08*Math.sin(3*ph);
    e=Math.min(1,t/.65)*Math.min(1,(dur-t)/.6)*(.94+.06*Math.sin(2*Math.PI*.3*t));break;}
   case "harp":w=Math.sin(p)+.23*Math.sin(2*p+.4)*Math.exp(-t*2)+.1*Math.sin(3*p)*Math.exp(-t*4);e=(1-Math.exp(-t*65))*Math.exp(-t/(Math.max(.12,dur)*.57))*Math.min(1,(dur-t)/.12);break;
   case "kalimba":w=Math.sin(p)+.25*Math.sin(2.02*p)*Math.exp(-t*3.8)+.04*Math.sin(4.9*p)*Math.exp(-t*11);e=(1-Math.exp(-t*135))*Math.exp(-t/(Math.max(.1,dur)*.38))*Math.min(1,(dur-t)/.08);break;
   case "bell":w=.88*Math.sin(p)+.21*Math.sin(2.39*p)*Math.exp(-t*2.1)+.04*Math.sin(4.18*p)*Math.exp(-t*4.1);e=(1-Math.exp(-t*100))*Math.exp(-t/(Math.max(.1,dur)*.35))*Math.min(1,(dur-t)/.08);break;
   default:w=Math.sin(p)+.12*Math.sin(2.003*p);e=(1-Math.exp(-t*38))*Math.exp(-t/(Math.max(.13,dur)*.33))*Math.min(1,(dur-t)/.1);
   }
   const sample=w*Math.max(0,e),at=(start+i)%N;L[at]+=sample*l;R[at]+=sample*r;
  }
 }
 for(let bar=0;bar<16;bar++){
  const c=chords[bar],t=bar*4*BEAT;
  for(let j=0;j<4;j++)note(t+.02*j,c[j]+12,4.75*BEAT,.028*(1-.09*j),"strings",[-.62,-.23,.28,.58][j]);
  note(t+.1*BEAT,c[0],2.48*BEAT,.085,"wood",-.11);note(t+2.2*BEAT,c[0]+12,1.25*BEAT,.033,"wood",.12);
  const pattern=[0,2,1,3,2,1,0,2];
  for(let step=0;step<8;step++){
   if(bar%4===2&&(step===2||step===6))continue;
   note(t+step*.5*BEAT,c[pattern[step]]+24,1.02*BEAT,.052*(.88+.10*(step%2)),"harp",step%2?-.45:.45);
  }
  for(const [on,midi,d] of melody[bar])note(t+on*BEAT,midi,BEAT*d+.15,.095,"flute",-.15,.94+.09*Math.sin((bar+on)*.8));
  if(bar%2===1)note(t+3.30*BEAT,c[2]+36,1.7*BEAT,.017,"bell",.67);
  if(bar%4===0){note(t+1.55*BEAT,c[0]+24,1.3*BEAT,.039,"kalimba",.54);note(t+2.75*BEAT,c[0]+31,1.3*BEAT,.039,"kalimba",.54);}
 }
 for(const [bar,offset] of [[2,1.58],[6,2.82],[10,1.62],[14,2.73]]){const t=(bar*4+offset)*BEAT;note(t,95,.27,.011,"flute",.72);note(t+.23,98,.18,.010,"flute",.72);}
 const dryL=L.slice(),dryR=R.slice();
 for(const [ms,g,sp] of [[139,.115,-1],[291,.072,1],[441,.055,-1],[729,.038,1]]){
   const shift=Math.round(SR*ms/1000);
   for(let i=0;i<N;i++){
    const j=(i-shift+N)%N;
    L[i]+=.60*g*dryL[j]+sp*.18*g*dryR[j];
    R[i]+=.60*g*dryR[j]-sp*.18*g*dryL[j];
   }
 }
 // Soft synthesized woodland air, periodic correction for musical loop.
 const rr=rand(seed),air=new Float32Array(N);
 let low=0,prev=0;
 for(let i=0;i<N;i++){const noise=rr()*2-1;low+=.12*(noise-low);prev+=.86*(low-prev);air[i]=low-prev;}
 const f=Math.round(SR*1.4);
 for(let i=0;i<f;i++){let w=i/(f-1);air[N-f+i]=air[N-f+i]*(1-w)+air[i]*w;}
 for(let i=0;i<N;i++){L[i]+=air[i]*.004;R[i]+=air[(i+1312)%N]*.0036;}
 let peak=1e-8;
 for(let i=0;i<N;i++){L[i]=Math.tanh(L[i]*1.38);R[i]=Math.tanh(R[i]*1.38);peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));}
 const gain=.90/peak;
 for(let i=0;i<N;i++){L[i]*=gain;R[i]*=gain;}
 const seam=Math.round(SR*.08),jumpL=L[0]-L[N-1],jumpR=R[0]-R[N-1];
 for(let i=0;i<seam;i++){let w=i/(seam-1);w=w*w*(3-2*w);L[N-seam+i]+=jumpL*w;R[N-seam+i]+=jumpR*w;}
 const audio=new AudioBuffer({length:N,numberOfChannels:2,sampleRate:SR});
 audio.copyToChannel(L,0);audio.copyToChannel(R,1);return audio;
}
window.FoxMenuLoop={run,seconds:48,bpm:80,seed:20261028};
})();