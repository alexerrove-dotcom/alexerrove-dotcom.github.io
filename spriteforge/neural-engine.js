/* SpriteForge RU V10 — real community GPU image generation, anonymous and free.
 * API: AI Horde (https://aihorde.net), publicly documented anonymous API key.
 * This file contains no private user credentials. User prompt goes to AI Horde.
 * Movement is made from the same AI-generated character image, via neural-rig-v9.
 */
import {translatePrompt} from "./prompt-translator-v9.js";
import {prepareCharacter,composeSprites} from "./neural-rig-v9.js";

const BASE="https://aihorde.net/api/v2";
const AGENT="SpriteForgeRU:10.0:https://alexerrove-dotcom.github.io/spriteforge/";
const KEY="0000000000"; // AI Horde's official shared, anonymous access key
const STYLE={
 realistic:"photorealistic full body game character, lifelike human anatomy, realistic skin, detailed fabric, studio character photography",
 semi:"high-end semi-realistic video game hero, believable human anatomy, premium 3D game character render",
 cartoon:"premium cartoon character design, professional game illustration, consistent clean forms",
 anime:"polished anime character design, elegant detailed cel-shading, coherent face and anatomy",
 chibi:"cute polished chibi game character with expressive eyes, refined stylization",
 toon3d:"high quality stylized 3D game character render, smooth physical materials, studio lighting",
 painted:"beautiful hand painted character concept art, detailed fabric and face, painterly brushwork",
 storybook:"premium illustrated animated film character, detailed playful shapes, clean outlines",
 comic:"professional comic book game character, bold lines, dramatic detailed shading",
 vector:"professional vector game character, refined forms and silhouettes",
 "16bit":"16 bit pixel art full body character sprite",
 retro:"retro game pixel art full body character sprite",
 cozy:"cozy colorful indie game pixel art character",
 dark:"dark fantasy character concept, rich detailed costume",
 cute:"cute cartoon game character, colorful clean illustration"
};
const ANGLE={front:"front view",side:"side view, facing right",back:"rear view",iso:"three quarter view",top:"top-down view"};
let locked=null,lockedKey=null,active=null;
function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function seedOf(p){return Number.isFinite(Number(p.seed))&&p.seed!==undefined&&p.seed!==null?(Number(p.seed)>>>0):hash(p.prompt)}
function identity(p,seed){return [p.prompt,p.style,p.view,seed].join("\u001f")}
function progress(cb,message){if(cb)cb({message})}
const headers={"apikey":KEY,"Client-Agent":AGENT,"Accept":"application/json"};
function abortError(){return new DOMException("Генерация отменена","AbortError")}
async function fetchJSON(url,opts={}){
 const response=await fetch(url,{...opts,cache:"no-store"});
 const type=response.headers.get("content-type")||"";
 const body=type.includes("json")?await response.json().catch(()=>null):null;
 if(!response.ok){
  const msg=body?.message||body?.error||body?.errors?.[0]?.message||"";
  const explanation=response.status===429?"Слишком много запросов: попробуйте позднее.":response.status===503?"У волонтёрских GPU сейчас перегрузка.":response.status===403?"Публичный сервер отказал в анонимном запросе.":"";
  throw Error("AI Horde HTTP "+response.status+". "+(explanation||String(msg).slice(0,250)||"Повторите запрос позднее."));
 }
 if(!body)throw Error("AI Horde вернул неверный ответ вместо JSON.");
 return body;
}
function promptFor(text,p){
 const style=STYLE[p.style]||STYLE.realistic;
 const angle=ANGLE[p.view]||ANGLE.front;
 const head="single full body "+text;
 const positive=[head,angle,"neutral standing A-pose","both feet and both hands fully visible","centered character on clean uniform white studio background",style,"high detail, one person, full length character art"].join(", ");
 const negative="cropped feet, cropped head, cut off, multiple people, extra arms, extra legs, fused hands, distorted anatomy, text, watermark, blurry, low resolution, busy background";
 return positive+" ### "+negative;
}
function delay(ms,signal){return new Promise((resolve,reject)=>{if(signal?.aborted)return reject(abortError());const t=setTimeout(done,ms);function done(){signal?.removeEventListener("abort",cancel);resolve()}function cancel(){clearTimeout(t);signal?.removeEventListener("abort",cancel);reject(abortError())}signal?.addEventListener("abort",cancel,{once:true})})}
function isImageURL(s){return /^https:\/\//i.test(s)}
async function generationBlob(gen,signal){
 let s=gen?.img;
 if(typeof s!=="string"||!s.length)throw Error("Сообщество не вернуло файл изображения.");
 if(isImageURL(s)){
  const r=await fetch(s,{signal,mode:"cors"});
  if(!r.ok)throw Error("Не удалось скачать готовое изображение: HTTP "+r.status);
  const blob=await r.blob();
  if(!blob.type.startsWith("image/"))throw Error("Сервер вернул не изображение.");
  return blob;
 }
 if(s.startsWith("data:image/")){
  const r=await fetch(s,{signal});return await r.blob();
 }
 // Some Horde workers return base64 WebP; other workers use PNG/JPEG.
 const normalized=s.replace(/^data:[^,]+,/,"").replace(/\s/g,"");
 let binary;
 try{binary=atob(normalized)}catch(e){throw Error("Сервер прислал повреждённый файл изображения.")}
 const bytes=new Uint8Array(binary.length);
 for(let i=0;i<bytes.length;i++)bytes[i]=binary.charCodeAt(i);
 const mime=bytes[0]===0x89&&bytes[1]===0x50?"image/png":
  bytes[0]===0xff&&bytes[1]===0xd8?"image/jpeg":
  bytes[0]===0x52&&bytes[1]===0x49?"image/webp":"application/octet-stream";
 if(mime==="application/octet-stream")throw Error("Неподдерживаемый формат изображения от AI Horde.");
 return new Blob([bytes],{type:mime});
}
async function startHorde(text,p,cb){
 const ctl=new AbortController();
 const job={id:null,ctl};
 active=job;
 try{
  const seed=seedOf(p),payload={
   prompt:promptFor(text,p),
   params:{n:1,seed:String(seed),width:512,height:512,steps:18,cfg_scale:7,sampler_name:"k_euler_a",karras:true},
   nsfw:false,censor_nsfw:true,
   r2:false, // return base64 so the browser can export/animate without image-CDN CORS failures
   shared:false,slow_workers:true,allow_downgrade:true
  };
  progress(cb,"Отправляем запрос на бесплатные видеокарты AI Horde…");
  const response=await fetchJSON(BASE+"/generate/async",{method:"POST",signal:ctl.signal,headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify(payload)});
  if(!response?.id)throw Error("AI Horde не выдал номер задания. "+String(response?.message||""));
  job.id=response.id;
  progress(cb,"Заявка принята. Ожидаем очередь добровольных GPU. Это может занять несколько минут.");
  const begin=Date.now(),limit=9*60*1000;
  let done=false,tries=0;
  while(Date.now()-begin<limit){
   await delay(7000,ctl.signal);
   const snap=await fetchJSON(BASE+"/generate/check/"+encodeURIComponent(job.id),{signal:ctl.signal,headers});
   tries++;
   done=Boolean(snap.done)||Number(snap.finished)>=1;
   if(snap.faulted)throw Error("Запрос отклонён или выполнен с ошибкой на сервере. Попробуйте изменить стиль/описание.");
   if(done)break;
   const queued=Number.isFinite(Number(snap.queue_position))?Math.max(0,Number(snap.queue_position)):null;
   const elapsed=Math.round((Date.now()-begin)/1000);
   progress(cb,"Идёт генерация: "+(queued===null?"ожидаем видеокарту":"место в очереди "+queued)+
    ". Прошло "+Math.floor(elapsed/60)+" мин "+(elapsed%60)+" сек. Можно отменить.");
  }
  if(!done)throw Error("Очередь не обработала запрос за 9 минут. GPU волонтёров перегружены — попробуйте позднее.");
  progress(cb,"ИИ закончил рисовать. Получаем готового персонажа…");
  const status=await fetchJSON(BASE+"/generate/status/"+encodeURIComponent(job.id),{signal:ctl.signal,headers});
  const gen=(status.generations||[]).find(g=>g.img)||status.generations?.[0];
  if(!gen)throw Error("Сервер сообщил о завершении, но не вернул изображение.");
  if(gen.censored)throw Error("Полученное изображение было заблокировано фильтрами сервиса.");
  const blob=await generationBlob(gen,ctl.signal);
  if(!blob||!blob.size)throw Error("Файл нейросети оказался пустым.");
  return {blob,seed,model:gen.model||"AI Horde worker"};
 }catch(e){
  if(ctl.signal.aborted)throw Error("Генерация отменена.");
  if(e instanceof TypeError&&/fetch|network|load|failed/i.test(String(e)))
   throw Error("Не удалось связаться с AI Horde (сеть или ограничения браузера CORS). Проверьте интернет и попробуйте снова.");
  throw e;
 }finally{
  if(active===job)active=null;
  // Never leave a hung generation in the volunteer queue after cancellation or expiry.
  if(job.id&&ctl.signal.aborted)fetch(BASE+"/generate/status/"+encodeURIComponent(job.id),{method:"DELETE",headers}).catch(()=>{});
 }
}
export async function generate(p,cb){
 if(!p||!String(p.prompt||"").trim())throw Error("Введите текстовое описание персонажа.");
 const seed=seedOf(p),id=identity(p,seed),fixed={...p,seed};
 if(p.animateOnly){
  if(!locked||lockedKey!==id)throw Error("Персонаж не закреплён. Сначала нажмите «Создать персонажа».");
  progress(cb,"Анимируем исходное изображение, сохраняя лицо и одежду.");
  return await composeSprites(locked,{...fixed,characterOnly:false},cb);
 }
 if(active)throw Error("Уже выполняется генерация. Отмените прежнюю, прежде чем запускать новую.");
 const translated=await translatePrompt(p.prompt,msg=>progress(cb,msg));
 if(translated.warning)progress(cb,translated.warning);
 const data=await startHorde(translated.text,fixed,cb);
 progress(cb,"Убираем однотонный фон и готовим экспорт…");
 const ready=await prepareCharacter(data.blob);
 locked=ready;
 lockedKey=id;
 const out=await composeSprites(ready,{...fixed,characterOnly:true},cb);
 out.engine="horde";
 out.model=data.model;
 out.description=p.prompt;
 out.translation=translated.text;
 out.seed=seed;
 return out;
}
export function isRunning(){return Boolean(active)}
export async function cancelCurrent(){
 const job=active;
 if(!job)return false;
 job.ctl.abort();
 if(job.id)try{await fetch(BASE+"/generate/status/"+encodeURIComponent(job.id),{method:"DELETE",headers});}catch(e){}
 return true;
}
