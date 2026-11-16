/* SpriteForge RU V17: no model downloads. Remote image generation with
 * OVHcloud SDXL, automatic HF cloud fallback on direct-browser access error.
 * All animation/export is local 2D cutout using the SAME source image.
 * This DOES NOT provide quota-free hosted GPU service or AI painted keyframes.
 */
import * as ovh from "./ovh-engine-v17.js";
import * as hf from "./hf-engine-v15.js";
import {composeSprites} from "./neural-rig-v11.js";

let providerLocked=null,pending=null,source=null;
export async function generate(params,onProgress){
 const action=!!params?.animateOnly;
 if(pending)throw Error("Предыдущая генерация ещё не завершена.");
 if(action){
  if(!providerLocked||!source)throw Error("Сначала создай персонажа.");
  onProgress?.({message:"Рисуем кадры из созданного персонажа. Облачную квоту анимация не расходует."});
  // OVH's animation renderer uses the same local 2D rig as this path.
  const data=await composeSprites(source,{...params,characterOnly:false},onProgress);
  data.provider=providerLocked;data.engine=providerLocked;
  data.animationMethod="2D cutout rig (not AI-generated individual frames)";
  return data;
 }
 pending="ovh";
 try{
  try{
   const res=await ovh.generate(params,onProgress);
   providerLocked="ovh";
   source=ovh.getCurrentCharacter?.()||null;
   if(!source)throw Error("OVH generated image but local character buffer is missing.");
   res.provider="ovh";
   return res;
  }catch(error){
   if(String(error?.message||error).includes("отменён"))throw error;
   onProgress?.({message:"OVHcloud недоступен: "+String(error?.message||error).slice(0,150)+". Пробуем резервный Hugging Face без загрузки модели на телефон (имеет дневную квоту)…"});
   pending="hf";
   try{
    const res=await hf.generate(params,onProgress);
    source=hf.getCurrentCharacter();
    if(!source?.canvas)throw Error("Hugging Face не сохранил исходный рисунок для анимации.");
    providerLocked="hf";res.provider="hf";
    res.fallbackUsed=true;
    return res;
   }catch(second){
    throw Error("Оба облачных сервиса не смогли нарисовать героя. OVHcloud: "+String(error?.message||error).slice(0,160)+"; Hugging Face: "+String(second?.message||second).slice(0,220));
   }
  }
 }finally{pending=null}
}
export async function cancelCurrent(){
 if(pending==="ovh")return await ovh.cancelCurrent();
 if(pending==="hf")return await hf.cancelCurrent();
 return false;
}
export function getStatus(){return{selected:"cloud-no-download",locked:providerLocked,pending,sourceAvailable:!!source}}
