/* SpriteForge RU V17 — no 2.6 GB downloads to phone.
 * OVHcloud public Stable Diffusion XL endpoint (anonymous: 2 req/min/IP)
 * No account, no user-provided keys, no model files on device.
 * Animation uses the SAME image via a local lightweight 2D cutout rig;
 * neural image-to-image keyframes are NOT provided by this text2image API.
 */
import {translatePrompt} from "./prompt-translator-v9.js";
import {prepareCharacter,composeSprites} from "./neural-rig-v11.js";
import {characterPrompt} from "./art-direction-v14.js";
import {validateCharacterBlob} from "./quality-v13.js";

const API="https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/images/generations";
const MODEL="stable-diffusion-xl-base-v10";
let locked=null,lockedKey="",pending=null;
const message=(fn,txt)=>fn?.({message:txt});
const codeOf=s=>{let n=2166136261;for(const ch of String(s||"")){n^=ch.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
const seedOf=p=>Number.isFinite(Number(p.seed))&&p.seed!==undefined&&p.seed!==null?Number(p.seed)>>>0:codeOf(p.prompt);
const identity=(p,seed)=>[p.prompt,p.style,p.view,seed].join("|");
function explainError(err){
 const val=String(err?.message||err||"Ошибка соединения");
 if(/NetworkError|Failed to fetch|Load failed|CORS|TypeError/i.test(val))return "Браузер не смог подключиться напрямую к OVHcloud. Возможно, сервис не разрешает запросы с GitHub Pages (CORS), или есть проблема с интернетом.";
 return val;
}
async function decodeImage(data){
 const item=data?.data?.[0]||data?.images?.[0]||data;
 const b64=item?.b64_json||item?.image_base64;
 if(b64){
  const bytes=Uint8Array.from(atob(b64),ch=>ch.charCodeAt(0));
  if(!bytes.length)throw Error("OVHcloud вернул пустое изображение.");
  return new Blob([bytes],{type:bytes[0]===0x89&&bytes[1]===0x50?"image/png":bytes[0]===0xff?"image/jpeg":"image/webp"});
 }
 if(item?.url){
  const url=new URL(item.url);
  if(url.protocol!=="https:")throw Error("Небезопасная ссылка на изображение.");
  const response=await fetch(url.href,{cache:"no-store"});
  if(!response.ok)throw Error("Ошибка загрузки результата: "+response.status);
  return await response.blob();
 }
 throw Error("OVHcloud не прислал изображение в поддерживаемом формате.");
}
async function requestImage(prompt,fn){
 const ctl=new AbortController(),job={ctl};
 pending=job;
 let timer;
 try{
  timer=setTimeout(()=>ctl.abort(),120000);
  message(fn,"SDXL рисует персонажа на удалённом сервере OVHcloud. Телефон не загружает нейросеть.");
  const payload={model:MODEL,prompt:prompt.split(" ### ")[0].slice(0,1400),size:"1024x1024",n:1};
  const resp=await fetch(API,{method:"POST",mode:"cors",signal:ctl.signal,
   headers:{"Content-Type":"application/json","Accept":"application/json"},
   body:JSON.stringify(payload),cache:"no-store"});
  if(!resp.ok){
   const body=await resp.text().catch(()=>"");
   if(resp.status===429)throw Error("Достигнут анонимный лимит OVHcloud: 2 запроса в минуту на IP. Повтори позже.");
   if(resp.status===401||resp.status===403)throw Error("OVHcloud больше не разрешает анонимную генерацию (HTTP "+resp.status+").");
   throw Error("OVHcloud HTTP "+resp.status+": "+body.slice(0,180));
  }
  const contentType=resp.headers.get("content-type")||"";
  if(contentType.startsWith("image/")){
   const blob=await resp.blob();if(!blob.size)throw Error("Получен пустой рисунок.");
   return blob;
  }
  const data=await resp.json();
  return await decodeImage(data);
 }catch(err){
  if(ctl.signal.aborted)throw Error("Запрос отменён или превысил время ожидания.");
  throw Error(explainError(err));
 }finally{
  if(timer)clearTimeout(timer);
  if(pending===job)pending=null;
 }
}
export async function generate(p,progress){
 if(!String(p?.prompt||"").trim())throw Error("Напиши описание персонажа.");
 const seed=seedOf(p),id=identity(p,seed);
 if(p.animateOnly){
  if(!locked||lockedKey!==id)throw Error("Сначала создай персонажа.");
  message(progress,"Создаём кадры без обращений к серверу: 2D-риг исходного изображения.");
  const out=await composeSprites(locked,{...p,seed,characterOnly:false},progress);
  out.engine="ovh";
  out.animationMethod="2D cutout; not independently generated AI poses";
  return out;
 }
 if(pending)throw Error("Предыдущая генерация ещё выполняется.");
 const translated=await translatePrompt(p.prompt,x=>message(progress,x));
 if(translated.warning)message(progress,translated.warning);
 const fullPrompt=characterPrompt(translated.text,p.style,p.view);
 const image=await requestImage(fullPrompt,progress);
 let qualityNote="";
 try{
  const check=await validateCharacterBlob(image);
  if(!check.ok)qualityNote=check.reasons.join("; ");
 }catch(e){qualityNote="Автоматическая проверка не запустилась."}
 const character=await prepareCharacter(image);
 if(!character?.canvas)throw Error("Не удалось подготовить изображение.");
 locked=character;lockedKey=id;
 const result=await composeSprites(character,{...p,seed,characterOnly:true},progress);
 result.engine="ovh";result.model=MODEL;result.seed=seed;result.description=p.prompt;
 result.qualityWarning=qualityNote;
 if(qualityNote)message(progress,"Возможная проблема рисунка: "+qualityNote+". Проверь изображение.");
 return result;
}
export async function cancelCurrent(){
 if(!pending)return false;
 pending.ctl.abort();return true;
}
export function getStatus(){return{engine:"ovh",busy:!!pending,locked:!!locked,modelDownload:false,anonymousRpm:2}}
