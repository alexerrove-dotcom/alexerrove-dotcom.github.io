/* SpriteForge RU V15 — public Hugging Face ZeroGPU inference.
   Uses the official public black-forest-labs/FLUX.2-klein-4B Gradio Space.
   No token or account is collected by SpriteForge. Anonymous HF quotas apply.
   Works for text-to-image and a guided image-edit sprite-sheet request.
*/
import {translatePrompt} from "./prompt-translator-v9.js";
import {prepareCharacter,composeSprites} from "./neural-rig-v11.js";
import {buildGuide,sheetPrompt,packAIFrames} from "./neural-sheet-v12.js";
import {validateCharacterBlob,validateAnimationBlob} from "./quality-v13.js";
import {characterPrompt} from "./art-direction-v14.js";

const SPACE="black-forest-labs/FLUX.2-klein-4B";
const CDN="https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";
let gradioLib=null,connecting=null,locked=null,lockedKey=null,activeJob=null,activeOperation=null,revision=0;
let animationImages=new Map();

function progress(cb,message){cb?.({message})}
function hash(s){let h=2166136261;for(const ch of String(s||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function seedFor(p){return Number.isFinite(Number(p.seed))&&p.seed!==undefined&&p.seed!==null?(Number(p.seed)>>>0)&2147483647:hash(p.prompt)&2147483647}
function identity(p,seed){return [p.prompt,p.style,p.view,seed].join("|")}
function messageForError(error){
 const original=String(error?.message||error||"Unknown error");
 if(/gpu.*quota|quota.*gpu|quota.*exceed|limit.*reached|signin|sign in|login|authenticate|authorization|401|429/i.test(original))
  return "Hugging Face исчерпал анонимный лимит GPU либо запросил вход. Бесплатный доступ ограничен. Повтори после сброса квоты. Детали: "+original.slice(0,230);
 if(/space.*sleep|503|502|504|unavailable|not reachable|overloaded|startup/i.test(original))
  return "Публичная видеокарта Hugging Face временно недоступна. Попробуй позднее. "+original.slice(0,170);
 if(/Failed to fetch|NetworkError|CORS|TypeError: fetch/i.test(original))
  return "Не удалось подключиться к Hugging Face или скачать изображение. Проверь интернет и доступность hf.space в браузере. "+original.slice(0,170);
 return original;
}
async function connect(cb){
 if(!connecting){
  connecting=(async()=>{
   progress(cb,"Подключаемся к бесплатной видеокарте Hugging Face · FLUX.2 Klein 4B…");
   if(!gradioLib)gradioLib=await import(CDN);
   const Client=gradioLib.Client;
   if(!Client?.connect||!gradioLib.handle_file)throw Error("Библиотека Gradio загрузилась некорректно.");
   return await Client.connect(SPACE);
  })().catch(err=>{connecting=null;throw err});
 }
 return connecting;
}
async function canvasBlob(canvas){
 return new Promise((resolve,reject)=>{
  canvas.toBlob(blob=>blob?resolve(blob):reject(Error("Не удалось подготовить изображение для нейросети.")),"image/png");
 });
}
function unwrapImage(result){
 const raw=result?.[0]?.image||result?.[0]||result?.output||result?.data?.[0]||result;
 if(typeof raw==="string")return raw;
 if(raw?.url)return raw.url;
 if(raw?.image?.url)return raw.image.url;
 if(raw?.path){
  const name=raw.path;
  if(/^https:\/\//.test(name))return name;
  return "https://black-forest-labs-flux-2-klein-4b.hf.space/gradio_api/file="+encodeURIComponent(name);
 }
 throw Error("Hugging Face не вернул адрес готового изображения.");
}
async function imageBlob(raw){
 const link=unwrapImage(raw);
 if(link.startsWith("data:image/")){
  const response=await fetch(link);return await response.blob();
 }
 const url=new URL(link);
 if(url.protocol!=="https:"||!(url.hostname.endsWith(".hf.space")||url.hostname.endsWith(".huggingface.co")||url.hostname==="huggingface.co"))
  throw Error("Получен неожиданный адрес изображения: "+url.hostname);
 const response=await fetch(link,{cache:"no-store"});
 if(!response.ok)throw Error("Готовое изображение недоступно (HTTP "+response.status+").");
 const blob=await response.blob();
 if(!blob.size||!blob.type.startsWith("image/"))throw Error("Hugging Face вернул пустой или неверный графический файл.");
 return blob;
}
async function infer(opts,cb){
 if(activeJob)throw Error("Предыдущий запрос ещё выполняется.");
 const client=await connect(cb);
 const jobId=Symbol("hf-job");
 const operation={id:jobId,cancelled:false,job:null};
 activeOperation=operation;
 try{
  let imageList=[];
  if(opts.guide){
   const blob=await canvasBlob(opts.guide);
   imageList=[[gradioLib.handle_file(blob),null]];
  }
  const payload={
   prompt:opts.prompt,
   input_images:imageList,
   mode_choice:"Distilled (4 steps)",
   seed:(opts.seed>>>0)&2147483647,
   randomize_seed:false,
   width:opts.guide?1024:768,
   height:1024,
   num_inference_steps:4,
   guidance_scale:1,
   prompt_upsampling:false
  };
  progress(cb,opts.guide?"Hugging Face перерисовывает восемь поз героя…":"FLUX.2 Klein 4B рисует нового героя…");
  const job=client.submit("/infer",payload);
  operation.job=job;activeJob=job;
  let images=null;
  for await (const event of job){
   if(operation.cancelled)throw Error("Генерация отменена.");
   if(event.type==="status"){
    if(event.status==="pending")progress(cb,"Ожидаем свободный Hugging Face GPU. "+(event.position!=null?"Очередь: "+event.position:""));
    if(event.status==="generating")progress(cb,"FLUX.2 Klein рисует изображение на публичном GPU…");
    if(event.status==="error")throw Error(event.message||"Gradio сообщил об ошибке генерации.");
   }
   if(event.type==="data")images=event.data;
  }
  if(operation.cancelled)throw Error("Генерация отменена.");
  if(!images)throw Error("Hugging Face не отправил результат генерации. Возможно, лимит GPU исчерпан.");
  progress(cb,"Загружаем готовое изображение с Hugging Face…");
  return await imageBlob(images);
 }catch(err){throw Error(messageForError(err))}
 finally{if(activeOperation===operation){activeJob=null;activeOperation=null}}
}
export async function generate(params,cb){
 const p=params||{};
 if(!String(p.prompt||"").trim())throw Error("Введите описание персонажа.");
 const seed=seedFor(p),key=identity(p,seed);
 if(p.animateOnly){
  if(!locked||lockedKey!==key)throw Error("Сначала создай персонажа: его изображение должно быть закреплено.");
  if(activeOperation)throw Error("Предыдущая генерация ещё выполняется.");
  const acts=p.pack?["idle","walk","run","jump","attack","death"]:[p.action||"walk"];
  const images={};
  for(const action of acts){
   const cacheKey=key+"|"+action;
   if(animationImages.has(cacheKey)){
    images[action]=animationImages.get(cacheKey);
    progress(cb,"Используем ранее нарисованные кадры «"+action+"».");
    continue;
   }
   const guide=buildGuide(locked,action);
   const prompt=sheetPrompt(locked.english||p.prompt,p.style,action)+
    ", Reference image depicts the exact same character in eight pose positions; maintain that person's identity and attire.";
   const blob=await infer({prompt,guide,seed:(seed+17+revision*1019)&2147483647},cb);
   const verdict=await validateAnimationBlob(blob);
   if(!verdict.ok)throw Error("Нейросеть нарисовала неподходящие кадры («"+action+"»): "+verdict.reasons.join("; ")+". Попробуй снова. Не выдаём брак за готовую анимацию.");
   animationImages.set(cacheKey,blob);images[action]=blob;
   progress(cb,"Проверка кадров «"+action+"» пройдена.");
  }
  revision++;
  return await packAIFrames(locked,images,{...p,seed},cb);
 }
 if(activeOperation)throw Error("Генерация ещё выполняется.");
 const translated=await translatePrompt(p.prompt,msg=>progress(cb,msg));
 if(translated.warning)progress(cb,translated.warning);
 const prompt=characterPrompt(translated.text,p.style,p.view);
 const blob=await infer({prompt,seed},cb);
 const qa=await validateCharacterBlob(blob);
 if(!qa.ok)throw Error("Нейросеть нарисовала неподходящего персонажа: "+qa.reasons.join("; ")+". Измени описание или нажми «Создать» ещё раз.");
 const character=await prepareCharacter(blob);
 character.english=translated.text;
 locked=character;lockedKey=key;animationImages.clear();
 const out=await composeSprites(character,{...p,seed,characterOnly:true},cb);
 out.engine="huggingface";
 out.model="FLUX.2 Klein 4B";
 out.description=p.prompt;
 out.translation=translated.text;
 out.seed=seed;
 return out;
}
export async function cancelCurrent(){
 const current=activeOperation;
 if(!current)return false;
 current.cancelled=true;
 try{current.job?.cancel?.()}catch(e){}
 return true;
}
export function getStatus(){return {engine:"huggingface",space:SPACE,active:!!activeJob,locked:!!locked}};
