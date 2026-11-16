/* SpriteForge V9 — genuine SD-Turbo text-to-image in the browser, no server or API key.
 * First generation downloads public model weights; WebGPU + free storage required.
 * Animation derives motion from one AI-generated image using a local 2D deformation rig.
 */
import {createClient} from "./webgpu/bundle.js";
import {translatePrompt} from "./prompt-translator-v9.js";
import {prepareCharacter,composeSprites} from "./neural-rig-v9.js";

let client=null,loadPromise=null,locked=null,lockedKey="";
const desc={
 realistic:"photorealistic game character render, realistic adult human proportions, realistic skin texture and fabric, soft studio lighting",
 semi:"semi-realistic detailed 3D video game character design, PBR-inspired materials, clean studio light",
 cartoon:"high quality stylized cartoon illustration, clean expressive shapes, professional game character concept art",
 anime:"detailed anime character art, coherent anatomy, elegant clean line art, high quality cel shading",
 chibi:"chibi game character, short proportions, polished anime illustration, full-body",
 toon3d:"high quality 3D stylized game character render, smooth materials, ambient occlusion, studio lighting",
 painted:"hand painted character concept, layered painterly brush strokes and carefully designed costume",
 storybook:"premium storybook animated film character design, expressive features, polished clean illustration",
 comic:"detailed comic book illustration, bold contours, rich accurate anatomy",
 vector:"professional flat vector game character, clear silhouette, clean edges",
 "16bit":"high quality pixel art sprite character, retro 16-bit",
 retro:"classic pixel art video game character",
 cozy:"cozy colorful high quality pixel art character",
 dark:"dark fantasy game character concept, intricate clothing details",
 cute:"cute playful game character illustration"
};
const angles={side:"profile facing right",front:"front view facing the camera",back:"rear view facing away",iso:"three-quarter view",top:"top-down view"};
const staticMessage="Создайте персонажа нейросетью, затем выберите действие и нажмите «Анимировать»";
const seedFrom=x=>{let h=2166136261;for(const ch of String(x||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const key=p=>[p.prompt,p.style,p.view,Number.isFinite(Number(p.seed))?p.seed:seedFrom(p.prompt)].join("|");
function progress(cb,message,p){if(cb)cb({message:message+(p?.pct!=null?" ("+Math.round(p.pct)+"%)":"")})}
async function load(cb){
 if(!navigator.gpu)throw Error("WebGPU недоступен. Для полностью бесплатной нейрогенерации нужен современный Chrome/Edge с WebGPU и мощным GPU. Этот сайт не подменяет ИИ шаблонным рисунком.");
 if(!loadPromise){
  loadPromise=(async()=>{
   progress(cb,"Проверяем графический ускоритель браузера");
   const c=createClient(),caps=await c.detect();
   if(!caps.webgpu)throw Error("Ваш браузер сообщает, что WebGPU недоступен. Попробуйте обновить Chrome и включить аппаратное ускорение.");
   progress(cb,"Загружаем настоящую модель SD-Turbo; при первом запуске это несколько гигабайт");
   const response=await c.load("sd-turbo",{backendPreference:["webgpu"]},p=>progress(cb,p?.message||"Скачивание весов модели",p));
   if(!response?.ok)throw Error(response?.message||"Загрузка модели SD-Turbo не удалась. На устройстве может не хватать оперативной или видеопамяти.");
   client=c;
   return c;
  })().catch(err=>{loadPromise=null;throw err});
 }
 return loadPromise;
}
function buildPrompt(translated,p){
 const style=desc[p.style]||desc.realistic;
 // Keep the actual user description before other terms: CLIP has a limited context.
 const subject=translated.text.trim();
 const view=angles[p.view]||angles.front;
 return [subject,"single full body character, "+view,"standing upright in a relaxed A-pose, arms separated from the torso, both legs and shoes fully visible, centered","white seamless studio background, no props, no text, no watermark, no cropped hands or feet",style].join(", ");
}
export async function generate(p,cb){
 if(!p||!String(p.prompt||"").trim())throw Error("Введите описание персонажа.");
 const generatedSeed=Number.isFinite(p.seed)?(p.seed>>>0):seedFrom(p.prompt);
 const fixed={...p,seed:generatedSeed};
 const k=key(fixed);
 if(p.animateOnly){
  if(!locked||lockedKey!==k)throw Error("Герой ещё не закреплён в текущей вкладке. Сначала создайте персонажа.");
  progress(cb,"Сохраняем лицо и одежду исходного изображения. Создаём кадры движения");
  return await composeSprites(locked,{...fixed,characterOnly:false},cb);
 }
 // Translate arbitrary Russian into full English prompt using free local weights.
 const translated=await translatePrompt(p.prompt,msg=>progress(cb,msg));
 if(translated.warning)progress(cb,translated.warning);
 progress(cb,"Собираем описание: "+translated.text.slice(0,170));
 const c=await load(cb);
 const query=buildPrompt(translated,p);
 progress(cb,"Нейросеть генерирует нового персонажа по вашему описанию");
 const request=c.generate({prompt:query,seed:generatedSeed},e=>progress(cb,e?.message||"Нейросеть создаёт изображение",e),{busyPolicy:"queue"});
 const result=await request.promise;
 if(!result?.ok||!result.blob)throw Error(result?.message||result?.reason||"Нейросеть не смогла создать изображение. Проверьте свободную память.");
 const ready=await prepareCharacter(result.blob);
 if(!ready.hasSubject)progress(cb,"Персонаж слился с фоном; попробуйте другой вариант внешности.");
 locked=ready;lockedKey=k;
 const data=await composeSprites(ready,{...fixed,characterOnly:true},cb);
 data.description=p.prompt;
 data.translation=translated.text;
 data.translationMethod=translated.method;
 return data;
}
export function getStatus(){return {loaded:!!client,locked:!!locked,engine:"sd-turbo-webgpu",type:"local-neural"}}
