/* SpriteForge V14 - free active Horde model selection and lightweight
   quality history (not training or changing neural weights). It picks
   stylistically suitable, currently available public worker models.
*/
const ENDPOINT="https://aihorde.net/api/v2/status/models?type=image";
const CACHE_MS=90000;
const STORE_KEY="spriteforge-v14-quality-scores";
let cache=null,stamp=0,loading=null;
const PRIORITIES={
 cartoon:["ToonYou","Western Animation Diffusion","Nova Flat XL","Rev Animated","DreamLikeSamKuvshinov","iCoMix","Comic-Diffusion","Counterfeit","stable_diffusion"],
 storybook:["DreamLikeSamKuvshinov","Western Animation Diffusion","ToonYou","Nova Flat XL","Rev Animated","Midjourney PaintArt","iCoMix","stable_diffusion"],
 painted:["Nova Flat XL","Midjourney PaintArt","Rev Animated","DreamLikeSamKuvshinov","ToonYou","Comic-Diffusion","stable_diffusion"],
 cute:["ToonYou","Western Animation Diffusion","Nova Flat XL","Rev Animated","stable_diffusion"],
 chibi:["ToonYou","Counterfeit","Nova Anime XL","Anything v3","stable_diffusion"],
 anime:["Counterfeit","Nova Anime XL","Animagine XL","Anything v3","ToonYou","stable_diffusion"],
 realistic:["Juggernaut XL","ICBINP - I Can't Believe It's Not Photography","Deliberate","Realistic Vision","Deliberate 3.0","stable_diffusion"],
 semi:["Juggernaut XL","Nova Flat XL","Rev Animated","Deliberate","stable_diffusion"],
 toon3d:["Juggernaut XL","Rev Animated","Nova Flat XL","ToonYou","stable_diffusion"],
 comic:["Comic-Diffusion","iCoMix","Western Animation Diffusion","Rev Animated","stable_diffusion"],
 vector:["Vector Art","Nova Flat XL","ToonYou","stable_diffusion"],
 "16bit":["AIO Pixel Art","Pixel Art Diffusion","stable_diffusion"],
 retro:["AIO Pixel Art","Pixel Art Diffusion","stable_diffusion"],
 cozy:["AIO Pixel Art","ToonYou","Western Animation Diffusion","stable_diffusion"],
 dark:["Art Of Mtg","Rev Animated","Deliberate","stable_diffusion"]
};
function readScores(){
 try{const v=JSON.parse(localStorage.getItem(STORE_KEY)||"{}");return v&&typeof v==="object"?v:{}}catch{return{}}
}
function setScores(scores){
 try{localStorage.setItem(STORE_KEY,JSON.stringify(scores))}catch(e){}
}
export function recordQuality(style,model,passed){
 if(!model||typeof model!=="string")return;
 const key=String(style)+"::"+String(model),scores=readScores();
 const prior=Number(scores[key]||0),adjust=passed?1:-1;
 scores[key]=Math.max(-5,Math.min(5,prior+adjust));
 // Bound stored data to keep tiny local memory.
 const entries=Object.entries(scores);
 if(entries.length>150)for(const k of entries.slice(0,entries.length-150).map(v=>v[0]))delete scores[k];
 setScores(scores);
}
async function available(){
 if(cache&&Date.now()-stamp<CACHE_MS)return cache;
 if(loading)return loading;
 loading=(async()=>{
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),5800);
  try{
   const r=await fetch(ENDPOINT,{signal:ctl.signal,cache:"no-store",headers:{"Accept":"application/json"}});
   if(!r.ok)throw Error("Model list HTTP "+r.status);
   const data=await r.json();
   if(!Array.isArray(data))throw Error("Invalid image model listing");
   cache=data.filter(x=>x&&x.type==="image"&&typeof x.name==="string"&&Number(x.count)>0);
   stamp=Date.now();
   return cache;
  }catch(e){
   console.warn("AI Horde active models unavailable",e);
   return cache||[];
  }finally{clearTimeout(t);loading=null}
 })();
 return loading;
}
const normalized=x=>String(x).toLowerCase().replace(/\s+/g," ").trim();
export async function chooseModel(style,lockedName,avoid=[]){
 if(lockedName&&typeof lockedName==="string")return lockedName;
 const active=await available();
 if(!active.length)return null;
 const scores=readScores(),prefer=PRIORITIES[style]||PRIORITIES.cartoon;
 const ranked=[];
 for(const m of active){
  const idx=prefer.findIndex(s=>normalized(m.name)===normalized(s));
  if(idx<0||avoid.includes(m.name))continue;
  // User wants quality, not a random fast model. Prefer target artistic
  // models while allowing availability and observed QA success to rank ties.
  const n=Number(m.count)||1;
  const preference=(prefer.length-idx)*4;
  const learned=Number(scores[style+"::"+m.name]||0)*1.2;
  const workerBonus=Math.min(3,Math.log2(n+1));
  const queued=Number(m.jobs)||0,queuePenalty=Math.min(2,queued/Math.max(1,n)*.25);
  ranked.push({name:m.name,score:preference+learned+workerBonus-queuePenalty});
 }
 ranked.sort((a,b)=>b.score-a.score);
 return ranked[0]?.name||null;
}
export function getQualityStats(){
 return {...readScores()};
}
