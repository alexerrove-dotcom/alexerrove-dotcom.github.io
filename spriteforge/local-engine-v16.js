/* SpriteForge RU V16: unlimited-in-count on-device neural image generation.
 * True SD-Turbo WebGPU model inference; NO external image generation API and
 * NO account or server quota. First use downloads ~2.6 GB model weights.
 * Device hardware, storage, memory, WebGPU and model license still limit it.
 * Animation = 2D cutout transform of the original picture; not frame-by-frame AI.
 */
import {createClient} from "./webgpu/bundle.js";
import {translatePrompt} from "./prompt-translator-v9.js";
import {prepareCharacter,composeSprites} from "./neural-rig-v11.js";


let client=null,loadPromise=null,locked=null,lockedKey=null,current=null;
function shortPrompt(text,style,view){
 const render={
  realistic:"photorealistic character concept",
  semi:"semi-realistic game character",
  cartoon:"professional hand-drawn 2D cartoon game character",
  anime:"detailed anime game character",
  storybook:"beautiful illustrated animation character",
  painted:"hand-painted character illustration",
  toon3d:"polished stylized 3D game character",
  "16bit":"retro pixel game sprite",
  retro:"pixel art game character"
 }[style]||"beautiful illustrated game character";
 const angle={front:"front view",back:"back view",side:"right-facing side view",iso:"three-quarter view"}[view]||"side view";
 // SD-Turbo's CLIP truncates at ~77 tokens. Prioritize the requested
 // character description and keep the art instructions concise.
 const subject=String(text).replace(/ ### [^]*$/,"").replace(/\s+/g," ").trim().split(" ").slice(0,37).join(" ");
 return [subject,render,"one full body character only",angle,"standing pose, clean white backdrop, complete shoes and hands"].join(", ");
}
const msg=(cb,text)=>cb?.({message:text});
function hash(text){let n=2166136261;for(const c of String(text||"")){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
function seedFor(p){return p.seed!==undefined&&p.seed!==null&&Number.isFinite(Number(p.seed))?(Number(p.seed)>>>0):hash(p.prompt)}
function keyFor(p,seed){return [p.prompt,p.style,p.view,seed].join("|")}
function explanation(err,phase){
 const error=String(err?.message||err||"неизвестная ошибка");
 if(/webgpu|adapter|requestadapter|gpu.*unavailable/i.test(error))
  return "На этом устройстве WebGPU недоступен. Проверь поддержку Chrome/WebGPU и аппаратное ускорение. "+error.slice(0,220);
 if(/memory|allocation|allocate|out.of.memory|buffer|device.lost|device lost/i.test(error))
  return "Видеопамяти недостаточно либо графический драйвер сбросил устройство. Закрой другие вкладки и повтори. "+error.slice(0,230);
 if(/storage|quota|cache|download|network|fetch|http/i.test(error))
  return "Не удалось загрузить или сохранить веса модели (~2,6 ГБ). Проверь свободное место и интернет. "+error.slice(0,230);
 return phase+": "+error.slice(0,360);
}
async function init(cb){
 if(client)return client;
 if(!navigator.gpu)throw Error("В браузере нет WebGPU. Бесплатная безлимитная генерация на устройстве здесь недоступна.");
 if(!loadPromise){
  loadPromise=(async()=>{
   msg(cb,"Проверяем видеокарту для локального запуска нейросети…");
   const adapter=await navigator.gpu.requestAdapter({powerPreference:"high-performance"});
   if(!adapter)throw Error("Браузер не смог предоставить WebGPU-адаптер. На этом устройстве локальная генерация может не поддерживаться.");
   let c=createClient();
   let cap=await c.detect();
   if(!cap?.webgpu){c.terminate();throw Error("Видеокарта не поддерживает необходимый режим WebGPU.");}
   msg(cb,"Первый запуск: скачиваем SD-Turbo (~2,6 ГБ) и загружаем модель в видеопамять. Это может занять время. Последующие генерации не расходуют серверную квоту.");
   const res=await c.load("sd-turbo",{backendPreference:["webgpu"]},p=>{
    const phase=p?.phase||"loading",pct=Number.isFinite(p?.pct)?Math.round(p.pct)+"%":"";
    msg(cb,["Загрузка модели",phase,pct,p?.message||""].filter(Boolean).join(" · "));
   });
   if(res?.ok===false)throw Error(res.message||res.reason||"Модель не загрузилась.");
   client=c;return c;
  })().catch(e=>{loadPromise=null;throw Error(explanation(e,"Загрузка нейросети"))});
 }
 return loadPromise;
}
export async function generate(p,cb){
 if(!String(p?.prompt||"").trim())throw Error("Введи описание персонажа.");
 const seed=seedFor(p),id=keyFor(p,seed),fixed={...p,seed};
 if(p.animateOnly){
  if(!locked||lockedKey!==id)throw Error("Сначала создай персонажа в локальном режиме.");
  msg(cb,"Собираем кадры из исходного персонажа — без сервера и квот. Это 2D-риг, не отдельная нейросетевая прорисовка.");
  const data=await composeSprites(locked,{...fixed,characterOnly:false},cb);
  data.engine="local";
  data.animationMethod="2D cutout, not AI-painted frames";
  return data;
 }
 if(current)throw Error("Нейросеть уже создаёт персонажа. Дождись результата или отмени запрос.");
 const translated=await translatePrompt(p.prompt,t=>msg(cb,t));
 if(translated.warning)msg(cb,translated.warning);
 const c=await init(cb);
 msg(cb,"Нейросеть SD-Turbo рисует нового героя на твоём устройстве. Запрос не отправляется на GPU-сервер.");
 const prompt=shortPrompt(translated.text,p.style,p.view);
 const operation=c.generate({prompt,seed,width:512,height:512},r=>{
  msg(cb,"Генерация · "+[r?.phase,r?.pct!=null?Math.round(r.pct)+"%":null,r?.message].filter(Boolean).join(" · "));
 },{busyPolicy:"reject"});
 current=operation;
 try{
  const result=await operation.promise;
  if(!result?.ok||!result?.blob)throw Error(result?.message||result?.reason||"Модель не вернула изображение.");
  const character=await prepareCharacter(result.blob);
  if(!character?.hasSubject)msg(cb,"ИИ не смог чётко отделить героя от фона. Попробуй подробнее описать персонажа.");
  locked=character;lockedKey=id;
  const data=await composeSprites(character,{...fixed,characterOnly:true},cb);
  data.engine="local";
  data.model="SD-Turbo WebGPU";
  data.seed=seed;
  data.description=p.prompt;
  return data;
 }catch(e){throw Error(explanation(e,"Создание персонажа"))}
 finally{if(current===operation)current=null}
}
export async function cancelCurrent(){
 if(!current)return false;
 await current.abort();return true;
}
export function getStatus(){return {engine:"local",loaded:!!client,busy:!!current,locked:!!locked,unlimitedRequests:true}}
