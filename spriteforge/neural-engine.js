/* SpriteForge RU V14 — reference-guided studio with consistent artistic models, anonymous and free.
 * API: AI Horde (https://aihorde.net), publicly documented anonymous API key.
 * This file contains no private user credentials. User prompt goes to AI Horde.
 * Movement is made from the same AI-generated character image, via neural-rig-v9.
 */
import {translatePrompt} from "./prompt-translator-v9.js";
import {prepareCharacter,composeSprites} from "./neural-rig-v11.js";
import {buildGuide,sheetPrompt,packAIFrames} from "./neural-sheet-v12.js";
import {validateCharacterBlob,validateAnimationBlob} from "./quality-v13.js";
import {characterPrompt} from "./art-direction-v14.js";
import {chooseModel,recordQuality} from "./model-picker-v14.js";

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
let locked=null,lockedKey=null,active=null,animationRevision=0;
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
function promptFor(text,p){return characterPrompt(text,p.style,p.view)}

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
function isClearlyOrdinaryCharacterPrompt(description){
 const s=String(description||"").toLowerCase();
 // Retry only everyday dressed character descriptions. Never try to get
 // around a deliberate safety decision about a sexual or explicit request.
 if(/(?:nude|naked|porn|erotic|explicit|sexual|sex scene|topless|bottomless|fetish|lingerie|underwear|обнаж[её]н|эротич|голый|голая|порн)/i.test(s))return false;
 return /(?:jacket|jeans|sneakers|shirt|t-shirt|trousers|pants|boots|coat|dress|armor|uniform|hoodie|suit|sweater|fully clothed|wearing|куртк|джинс|кроссов|рубашк|футболк|брюк|костюм|ботинк|шорт|одежд)/i.test(s);
}
function isBlockedGeneration(gen){
 const meta=Array.isArray(gen?.gen_metadata)?gen.gen_metadata:[];
 return gen?.censored===true||gen?.state==="censored"||gen?.state==="csam"||
   meta.some(item=>item.type==="censorship");
}
async function startHorde(text,p,cb,opts={}){
 const ctl=new AbortController();
 const job={id:null,ctl,completed:false};
 active=job;
 const requestedSeed=seedOf(p);
 const retryAllowed=isClearlyOrdinaryCharacterPrompt(p.prompt+" "+text);
 const attempts=retryAllowed?2:1;
 const model=opts.model||await chooseModel(p.style,p.model||null);
 const deadline=Date.now()+12*60*1000;
 let blocked=0;
 try{
  for(let attempt=0;attempt<attempts;attempt++){
   if(ctl.signal.aborted)throw abortError();
   if(Date.now()>=deadline)throw Error("Бесплатные видеокарты слишком долго заняты. Очередь завершена без результата.");
   job.id=null;job.completed=false;
   const candidateSeed=(requestedSeed+Math.imul(attempt,0x9e3779b1))>>>0;
   const extra=attempt===0?"":", fully clothed in the complete requested outfit, everyday fashion, family friendly game character concept art";
   const isXL=/\bxl\b|sdxl|juggernaut xl|nova flat/i.test(model||"");
   const width=opts.source_image?(isXL?1024:768):(isXL?768:512);
   const height=opts.source_image?(isXL?1024:768):(isXL?1024:768);
   const payload={
    ...(model?{models:[model]}:{}),
    prompt:opts.spritePrompt?(attempt?opts.spritePrompt.replace(" ### ",extra+" ### "):opts.spritePrompt):promptFor(text+extra,p),
    params:{n:1,seed:String(candidateSeed),width,height,steps:opts.source_image?26:24,cfg_scale:7,sampler_name:"k_euler_a",karras:true,...(opts.source_image?{denoising_strength:opts.denoising??.44}:{})},
    ...(opts.source_image?{source_image:opts.source_image,source_processing:"img2img"}:{}),
    nsfw:false,censor_nsfw:true,
    r2:false,shared:false,slow_workers:true,allow_downgrade:true
   };
   progress(cb,attempt===0
    ?"Отправляем персонажа на бесплатные видеокарты AI Horde…"
    :"Фильтр ошибочно мог пометить обычного одетого героя. Пробуем второй безопасный вариант (2/2)…");
   const response=await fetchJSON(BASE+"/generate/async",{
    method:"POST",signal:ctl.signal,headers:{...headers,"Content-Type":"application/json"},
    body:JSON.stringify(payload)
   });
   if(!response?.id)throw Error("AI Horde не выдал номер задания. "+String(response?.message||""));
   job.id=response.id;
   progress(cb,"Запрос "+(attempt+1)+"/"+attempts+" принят. Ожидаем свободную видеокарту сообщества…");
   let done=false;
   while(Date.now()<deadline){
    await delay(6500,ctl.signal);
    const check=await fetchJSON(BASE+"/generate/check/"+encodeURIComponent(job.id),
      {signal:ctl.signal,headers});
    if(check.faulted)throw Error("Видеокарта сообщества сообщила об ошибке. Повторите генерацию позднее.");
    if(check.is_possible===false&&Number(check.eligible_workers)===0){
     throw Error("Сейчас нет бесплатных видеокарт для выбранных параметров. Попробуйте позже.");
    }
    done=Boolean(check.done)||Number(check.finished)>=1;
    if(done)break;
    const q=Number(check.queue_position);
    const queue=Number.isFinite(q)?("место в очереди "+Math.max(0,q)):"ищем свободный GPU";
    const elapsed=Math.round((Date.now()-(deadline-12*60*1000))/1000);
    progress(cb,"Генерация "+(attempt+1)+"/"+attempts+": "+queue+
      ". Ожидание "+Math.floor(elapsed/60)+" мин "+elapsed%60+" сек. Запрос можно отменить.");
   }
   if(!done)throw Error("Очередь не обработала запрос за отведённое время. Попробуйте позже.");
   progress(cb,"Нейросеть завершила рисование. Проверяем изображение…");
   const status=await fetchJSON(BASE+"/generate/status/"+encodeURIComponent(job.id),
      {signal:ctl.signal,headers});
   job.completed=true;
   const generations=Array.isArray(status.generations)?status.generations:[];
   const clean=generations.find(g=>g.img&&!isBlockedGeneration(g));
   const blockedResults=generations.filter(isBlockedGeneration);
   if(!clean&&blockedResults.length){
    blocked++;
    if(blockedResults.some(g=>g.state==="csam"||(g.gen_metadata||[]).some(m=>m.value==="csam"))){
     throw Error("Сервис заблокировал генерацию по правилам безопасности. Повторной попытки не будет.");
    }
    if(attempt+1<attempts){
     progress(cb,"Первое изображение ошибочно могло попасть под фильтр AI Horde. Повторяем запрос в безопасной формулировке…");
     continue;
    }
    throw Error("AI Horde заблокировал "+blocked+" результат(а) своими фильтрами. Фильтры могут ошибаться даже на обычных персонажах. Попробуйте другое описание или стиль.");
   }
   if(!clean)throw Error("Видеокарта отметила задачу как завершённую, но изображение отсутствует.");
   const blob=await generationBlob(clean,ctl.signal);
   if(!blob||!blob.size)throw Error("ИИ вернул пустое изображение.");
   return {blob,seed:requestedSeed,imageSeed:candidateSeed,
     model:clean.model||model||"AI Horde worker",attempt:attempt+1};
  }
  throw Error("Не получено изображение от AI Horde.");
 }catch(e){
  if(ctl.signal.aborted)throw Error("Генерация отменена пользователем.");
  if(e instanceof TypeError&&/fetch|network|load|failed/i.test(String(e)))
   throw Error("Не удалось связаться с AI Horde (интернет или CORS). Проверьте сеть и повторите.");
  throw e;
 }finally{
  if(active===job)active=null;
  if(job.id&&!job.completed)
   fetch(BASE+"/generate/status/"+encodeURIComponent(job.id),
     {method:"DELETE",headers}).catch(()=>{});
 }
}
export async function generate(p,cb){
 if(!p||!String(p.prompt||"").trim())throw Error("Введите текстовое описание персонажа.");
 const seed=seedOf(p),id=identity(p,seed),fixed={...p,seed};
 if(p.animateOnly){
  if(!locked||lockedKey!==id)throw Error("Персонаж не закреплён. Сначала нажмите «Создать персонажа».");
  if(active)throw Error("Сначала дождитесь завершения предыдущей генерации.");
  const actions=p.pack?["idle","walk","run","jump","attack","death"]:[p.action||"walk"];
  const images={};
  const revision=++animationRevision;
  const english=locked._english||p.prompt;
  const preservedModel=locked._model||null;
  if(preservedModel)progress(cb,"Рисуем кадры той же художественной моделью: "+preservedModel);
  for(let i=0;i<actions.length;i++){
   const action=actions[i];
   progress(cb,"ИИ рисует кадры "+(i+1)+"/"+actions.length+": "+action+". Проверяем согласованность героя.");
   const guide=buildGuide(locked,action);
   const source_image=guide.toDataURL("image/webp",.86).split(",")[1];
   if(!source_image)throw Error("Не удалось подготовить образец поз для нейросети.");
   const prompt=sheetPrompt(english,p.style,action);
   let accepted=null,reason="";
   const limit=p.pack?1:2;
   for(let attempt=0;attempt<limit;attempt++){
    const result=await startHorde(english,
      {...fixed,action,seed:(seed+17*(i+1)+revision*977+attempt*1073)>>>0},cb,
      {source_image,spritePrompt:prompt,denoising:attempt===0?.37:.32,model:preservedModel});
    const quality=await validateAnimationBlob(result.blob);
    recordQuality(p.style,result.model,quality.ok);
    if(quality.ok){accepted=result.blob;break;}
    reason=quality.reasons.join("; ");
    if(attempt+1<limit)progress(cb,"Лист не прошёл проверку ("+reason+"). Генерируем повторно с меньшим изменением исходного героя…");
   }
   if(!accepted)throw Error("ИИ прислал некачественный спрайт-лист «"+action+"»: "+reason+". Он не будет ошибочно показан как готовая анимация. Попробуй повторить запрос или выбрать более простой стиль.");
   images[action]=accepted;
  }
  const out=await packAIFrames(locked,images,fixed,cb);
  out.seed=seed;
  return out;
 }
 if(active)throw Error("Уже выполняется генерация. Отмените прежнюю, прежде чем запускать новую.");
 const translated=await translatePrompt(p.prompt,msg=>progress(cb,msg));
 if(translated.warning)progress(cb,translated.warning);
 let data=null,characterIssue="",failedModel=null;
 for(let attempt=0;attempt<2;attempt++){
  const chosen=await chooseModel(p.style,null,failedModel?[failedModel]:[]);
  if(chosen)progress(cb,"Художественная модель: "+chosen+(attempt?" (другая после ошибки)":""));
  data=await startHorde(translated.text,{...fixed,seed:(seed+attempt*1399)>>>0},cb,{model:chosen});
  const verdict=await validateCharacterBlob(data.blob);
  recordQuality(p.style,data.model,verdict.ok);
  if(verdict.ok)break;
  failedModel=data.model;
  characterIssue=verdict.reasons.join("; ");
  data=null;
  if(attempt===0)progress(cb,"Изображение не прошло проверку: "+characterIssue+". Пробуем другую модель.");
 }
 if(!data)throw Error("Сервис дважды нарисовал неподходящего героя: "+characterIssue+". Результат не принят. Измени описание и попробуй снова.");
 progress(cb,"Проверка одного персонажа пройдена. Убираем фон и готовим экспорт…");
 const ready=await prepareCharacter(data.blob);
 locked=ready;
 locked._english=translated.text;
 locked._model=data.model;
 lockedKey=id;
 const out=await composeSprites(ready,{...fixed,characterOnly:true},cb);
 out.engine="horde";
 out.model=data.model;
 out.qualityProfile="Reference-guided V14: clean silhouettes, color and outfit consistency";
 out.imageSeed=data.imageSeed;
 out.generationAttempt=data.attempt;
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
