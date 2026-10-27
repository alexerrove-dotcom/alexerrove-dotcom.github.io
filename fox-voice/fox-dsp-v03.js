/* Fox Voice Studio v0.3 — independent pitch/tempo, mobile-friendly DSP.
 * Uses band-limited Lanczos interpolation and WSOLA for duration restoration.
 * No API keys, no audio uploads. */
(function(){
"use strict";
const TAU=Math.PI*2;
function sinc(x){if(Math.abs(x)<1e-6)return 1;const a=Math.PI*x;return Math.sin(a)/a;}
function resample(input,ratio){
 if(Math.abs(ratio-1)<0.001)return input.slice();
 const n=Math.max(1,Math.round(input.length/ratio));
 const out=new Float32Array(n),radius=8,cutoff=Math.min(1,1/ratio);
 for(let i=0;i<n;i++){
  const at=i*ratio,from=Math.floor(at)-radius+1,to=Math.floor(at)+radius;
  let sum=0,wsum=0;
  for(let j=from;j<=to;j++){
   const d=at-j;if(Math.abs(d)>=radius)continue;
   const w=cutoff*sinc(d*cutoff)*sinc(d/radius);
   const index=Math.max(0,Math.min(input.length-1,j));
   sum+=input[index]*w;wsum+=w;
  }
  out[i]=wsum?sum/wsum:0;
 }
 return out;
}
function stretch(src,desired){
 desired=Math.round(desired);
 if(src.length<1536||desired<1024)return resample(src,src.length/desired);
 const frame=1024,hop=256,search=72,reference=192;
 const out=new Float32Array(desired+frame),weights=new Float32Array(desired+frame);
 const win=new Float32Array(frame);
 for(let i=0;i<frame;i++)win[i]=.5-.5*Math.cos(TAU*(i+.5)/frame);
 const scale=src.length/desired;
 let last=0;
 for(let start=0;start<desired;start+=hop){
  const projected=Math.round(start*scale);
  let best=Math.max(0,Math.min(src.length-frame,projected));
  if(start>0){
   let score=-Infinity;
   let low=Math.max(0,projected-search),high=Math.min(src.length-frame,projected+search);
   for(let pos=low;pos<=high;pos+=2){
    let cross=0,en1=0,en2=0;
    for(let j=0;j<reference;j+=2){
     const p=start+j;
     if(weights[p]<.01)continue;
     const a=out[p]/weights[p],b=src[pos+j];
     cross+=a*b;en1+=a*a;en2+=b*b;
    }
    const sim=(en1>1e-8&&en2>1e-8)?cross/Math.sqrt(en1*en2):0;
    const nearby=0.01*Math.abs(pos-projected)/search;
    if(sim-nearby>score){score=sim-nearby;best=pos;}
   }
  }
  last=best;
  for(let j=0;j<frame&&start+j<out.length;j++){
   const w=win[j],at=start+j;
   out[at]+=src[best+j]*w;weights[at]+=w;
  }
 }
 const finished=new Float32Array(desired);
 for(let i=0;i<desired;i++)finished[i]=weights[i]>.00001?out[i]/weights[i]:0;
 return finished;
}
function polish(src,sampleRate,brightness){
 const n=src.length,out=new Float32Array(n);
 const a1=1-Math.exp(-TAU*750/sampleRate),a2=1-Math.exp(-TAU*7000/sampleRate);
 let low=0,high=0;
 let peak=0;
 for(let i=0;i<n;i++){
  const x=src[i];low+=a1*(x-low);high+=a2*(x-high);
  // Gentle presence, tame sharp top-end after pitch shifting.
  const y=x+brightness*.32*(x-low)-.045*(x-high);
  out[i]=y;peak=Math.max(peak,Math.abs(y));
 }
 const gain=peak>.9?.9/peak:1;
 const fade=Math.max(1,Math.floor(sampleRate*.012));
 for(let i=0;i<n;i++){
  const edge=Math.min(1,i/fade,(n-1-i)/fade);
  out[i]=Math.max(-1,Math.min(1,out[i]*gain*edge));
 }
 return out;
}
function render(input,sampleRate,style){
 const ratio=Math.pow(2,Math.max(-2,Math.min(4,style.pitch||0))/12);
 const shifted=resample(input,ratio);
 const tempo=Math.max(.85,Math.min(1.15,style.tempo||1));
 const desired=Math.max(1,Math.round(input.length/tempo));
 const retimed=stretch(shifted,desired);
 return polish(retimed,sampleRate,style.brightness||0);
}
const variants=[
 {id:"soft",title:"Нежный лисёнок",desc:"Тёплый, мягкий, разборчивый голос",pitch:.4,tempo:.96,brightness:-.18},
 {id:"playful",title:"Озорной лисёнок",desc:"Чуть выше, энергичнее, любопытнее",pitch:1.45,tempo:1.055,brightness:.42},
 {id:"cartoon",title:"Сказочный лисёнок",desc:"Звонкий мультяшный оттенок, без сильного писка",pitch:2.05,tempo:.99,brightness:.32}
];
window.FoxDSP={render,variants};
})();
