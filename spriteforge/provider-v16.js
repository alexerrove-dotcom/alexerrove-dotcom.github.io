/* SpriteForge V16 engine routing: local GPU without account/quota by default.
 * Cloud fallback is opt-in only and has Hugging Face usage limits.
 * The provider is pinned when the character is generated, so subsequent
 * animations use the same locked character and renderer.
 */
import * as local from "./local-engine-v16.js";
import * as cloud from "./hf-engine-v15.js";

let pending=null,locked=null;
function preferred(){
 return document.getElementById("useCloud")?.checked?"cloud":"local";
}
function api(which){return which==="cloud"?cloud:local}
export async function generate(params,onProgress){
 const engine=params?.animateOnly?locked:preferred();
 if(!engine)throw Error("Сначала создай персонажа.");
 if(pending)throw Error("Предыдущий запрос ещё обрабатывается.");
 pending=engine;
 try{
  const result=await api(engine).generate(params,onProgress);
  if(!params?.animateOnly)locked=engine;
  result.provider=engine;
  return result;
 }finally{pending=null}
}
export async function cancelCurrent(){
 if(!pending)return false;
 return api(pending).cancelCurrent();
}
export function getStatus(){return{selected:preferred(),locked,pending}}
