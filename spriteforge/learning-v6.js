/* SpriteForge Local Preference Learning V6
 * This is transparent, on-device preference optimization, not neural-network training.
 * User "like / dislike" feedback updates a contextual linear ranking model
 * across procedural geometry variants. Data never leaves this browser.
 */
(function(root){"use strict";
const KEY="spriteforge-learning-v6",SIZE=8;
const clean=n=>Number.isFinite(n)?Math.max(-10,Math.min(10,n)):0;
function vector(seed){
 let state=(Number(seed)>>>0)^0xa6933d1b;
 const out=[];
 for(let i=0;i<SIZE;i++){
   state+=0x6d2b79f5;
   let v=state;
   v=Math.imul(v^(v>>>15),v|1);v^=v+Math.imul(v^(v>>>7),v|61);
   out.push((((v^(v>>>14))>>>0)%65536)/65535*2-1);
 }
 return out;
}
function load(){
 try{const x=JSON.parse(localStorage.getItem(KEY)||"{}");return x&&typeof x==="object"?x:{}}catch{return {}}
}
function save(data){try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch{return false}}
function name(kind,style){return String(kind||"human").slice(0,32)+"|"+String(style||"painted").slice(0,32)}
function parseKind(text){
 try{return root.SpriteForgeDesigner?.parse(text)?.kind||"human"}catch{return "human"}
}
function choose(prompt,style,view,manual){
 if(manual!==undefined&&manual!==null&&manual!=="")return Number(manual)>>>0;
 const data=load(),key=name(parseKind(prompt),style),entry=data[key];
 if(!entry||!entry.samples)return undefined;
 const weights=Array.isArray(entry.weights)?entry.weights:Array(SIZE).fill(0);
 const candidates=[];
 for(const sample of entry.favorites||[])candidates.push(sample>>>0);
 for(let i=0;i<32;i++)candidates.push(Math.floor(Math.random()*4294967296)>>>0);
 let champion=null,best=-Infinity;
 for(const seed of candidates){
   const features=vector(seed);
   let score=features.reduce((a,v,i)=>a+v*clean(weights[i]),0);
   // Disfavor exact rejected seeds and avoid repeating identical consecutive sprites.
   if((entry.rejected||[]).includes(seed))score-=40;
   if(seed===entry.lastSeed)score-=.16;
   // Positive examples retain a modest advantage, supporting predictable tastes.
   if((entry.favorites||[]).includes(seed))score+=.25;
   score+=Math.random()*.15;
   if(score>best){best=score;champion=seed}
 }
 return champion;
}
function rate({kind,style,seed},vote){
 if(!Number.isFinite(Number(seed))||![-1,1].includes(Number(vote)))return null;
 const key=name(kind,style),all=load();
 const state=all[key]&&typeof all[key]==="object"?all[key]:{samples:0,likes:0,dislikes:0,weights:Array(SIZE).fill(0),favorites:[],rejected:[]};
 const v=vector(seed),weights=state.weights;
 // Online preference update with gradual weight decay and bounded weights.
 for(let i=0;i<SIZE;i++)weights[i]=clean((Number(weights[i])||0)*.997+.34*Number(vote)*v[i]);
 state.samples=Math.min(100000,(state.samples||0)+1);
 if(vote>0){
   state.likes=(state.likes||0)+1;
   state.favorites=[Number(seed)>>>0,...(state.favorites||[]).filter(n=>n!==(Number(seed)>>>0))].slice(0,24);
   state.rejected=(state.rejected||[]).filter(n=>n!==(Number(seed)>>>0));
 }else{
   state.dislikes=(state.dislikes||0)+1;
   state.rejected=[Number(seed)>>>0,...(state.rejected||[]).filter(n=>n!==(Number(seed)>>>0))].slice(0,24);
   state.favorites=(state.favorites||[]).filter(n=>n!==(Number(seed)>>>0));
 }
 state.lastSeed=Number(seed)>>>0;
 all[key]=state;
 save(all);
 return {samples:state.samples,likes:state.likes,dislikes:state.dislikes};
}
function stats(kind,style){const x=load()[name(kind,style)];return x?{samples:x.samples||0,likes:x.likes||0,dislikes:x.dislikes||0}:{samples:0,likes:0,dislikes:0}}
function clear(){try{localStorage.removeItem(KEY)}catch{}}
root.SpriteForgeLearning={choose,rate,vector,stats,clear,version:"6.0.0",description:"Local linear ranking from explicit likes/dislikes; not a trained neural image generator"};
})(window);
