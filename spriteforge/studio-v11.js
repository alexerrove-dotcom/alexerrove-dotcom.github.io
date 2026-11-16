/* SpriteForge V11 — one prompt, one Generate button, optional animation below.
 * All image generation goes through the existing anonymous AI Horde adapter.
 * Sprite sheets use the same locked input image and are generated locally.
 */
import {generate,cancelCurrent} from "./neural-engine.js?v=11";
const $=id=>document.getElementById(id);
const form=$("characterForm"),input=$("description"),
  create=$("createButton"),createStatus=$("createStatus"),
  createProgress=$("createProgress"),cancel=$("cancelButton"),
  charResult=$("characterResult"),charImg=$("characterImage"),
  downloadCharacter=$("downloadCharacter"),motionButtons=[...document.querySelectorAll(".motion")],
  animate=$("animateButton"),animStatus=$("animationStatus"),animProgress=$("animationProgress"),
  animResult=$("animationResult"),sheetImg=$("sheetImage"),sheetDetails=$("sheetDetails"),
  animCanvas=$("animationCanvas");
let blueprint=null,character=null,animation=null,busy=false,selected="walk",image=null,loopId=0;
const status=(el,message,kind="info")=>{el.dataset.kind=kind;el.textContent=message};
function inferStyle(t){
 if(/фотореал|реалистич|photoreal|realistic|фото\s*стил/i.test(t))return"realistic";
 if(/3d|3д|трехмер|трёхмер/i.test(t))return"toon3d";
 if(/аниме|anime|манга/i.test(t))return"anime";
 if(/пиксел|pixel|16.?бит/i.test(t))return"16bit";
 if(/комикс|comic/i.test(t))return"comic";
 if(/вектор|vector/i.test(t))return"vector";
 if(/фэнтези|dark fantasy/i.test(t))return"dark";
 if(/сказочн|книжн.*иллюстр|storybook/i.test(t))return"storybook";
 if(/мульт|cartoon|рисован|illustrat/i.test(t))return"cartoon";
 return"cartoon";
}
function inferView(t){
 if(/спереди|анфас|front view|facing camera/i.test(t))return"front";
 if(/сзади|со спины|back view|rear view/i.test(t))return"back";
 if(/сверху|top.down/i.test(t))return"top";
 if(/3\/4|три четверти|three.quarter/i.test(t))return"iso";
 return"side"; // platformer-ready profile by default, matching reference sheet
}
function setBusy(value,kind="generate"){
 busy=value;
 create.disabled=value;input.disabled=value;
 cancel.hidden=!(value&&kind==="generate");cancel.disabled=!value;
 const canAnimate=!value&&!!blueprint;
 animate.disabled=!canAnimate;
 for(const b of motionButtons)b.disabled=!canAnimate;
 if(kind==="generate")createProgress.hidden=!value;
 if(kind==="animate")animProgress.hidden=!value;
}
function saveHref(href,filename){
 if(!href)return;
 const a=document.createElement("a");a.href=href;a.download=filename;a.rel="noopener";
 document.body.appendChild(a);a.click();a.remove();
}
function stopPreview(){
 if(loopId)cancelAnimationFrame(loopId);
 loopId=0;image=null;
}
function playAnimation(data){
 stopPreview();
 image=new Image();
 image.onload=()=>{
  const c=animCanvas.getContext("2d"),size=data.cell_size;
  animCanvas.width=size;animCanvas.height=size;
  const row=data.actions.indexOf("walk")>=0?data.actions.indexOf("walk"):0;
  const start=performance.now();
  const tick=now=>{
   if(image===null)return;
   const col=Math.floor((now-start)/125)%data.frames;
   c.clearRect(0,0,size,size);
   c.imageSmoothingEnabled=true;
   c.drawImage(image,col*size,row*size,size,size,0,0,size,size);
   loopId=requestAnimationFrame(tick);
  };
  loopId=requestAnimationFrame(tick);
 };
 image.onerror=()=>status(animStatus,"Спрайт-лист создан, но предпросмотр не загрузился. PNG и ZIP доступны для скачивания.","error");
 image.src=data.sheet;
}
form.addEventListener("submit",async e=>{
 e.preventDefault();if(busy)return;
 const prompt=input.value.trim();
 if(prompt.length<4){status(createStatus,"Опиши персонажа хотя бы несколькими словами.","error");input.focus();return}
 const request={prompt,style:inferStyle(prompt),view:inferView(prompt),
  facing:"right",size:256,frames:8,action:"idle",characterOnly:true,pack:false,engine:"horde"};
 setBusy(true,"generate");
 status(createStatus,"Создаём героя по описанию. Ищем свободную видеокарту…","progress");
 create.textContent="ИИ рисует персонажа…";
 try{
  const out=await generate(request,p=>status(createStatus,p.message||"Идёт генерация…","progress"));
  character=out;blueprint=request;
  charImg.src=out.source||out.sheet;
  charResult.hidden=false;
  animResult.hidden=true;animation=null;stopPreview();
  status(createStatus,"Персонаж готов. Теперь выбери движение в блоке ниже.","success");
  status(animStatus,"Персонаж закреплён. Выбери действие и нажми «Создать анимацию».","success");
  charResult.scrollIntoView({behavior:"smooth",block:"start"});
 }catch(err){
  const message=err?.message||String(err);
  status(createStatus,"Не удалось создать: "+message,"error");
 }finally{
  create.textContent="Создать персонажа";
  setBusy(false,"generate");
 }
});
for(const button of motionButtons)button.addEventListener("click",()=>{
 if(busy||!blueprint)return;
 selected=button.dataset.action;
 for(const b of motionButtons){
  b.classList.toggle("selected",b===button);
  b.setAttribute("aria-pressed",String(b===button));
 }
});
animate.addEventListener("click",async()=>{
 if(busy||!blueprint||!character){
  status(animStatus,"Сначала создай персонажа.","error");return
 }
 setBusy(true,"animate");
 animResult.hidden=true;
 status(animStatus,selected==="pack"?"Собираем полный набор движений…":"Создаём кадры выбранного движения…","progress");
 animate.textContent="Создаём спрайт-лист…";
 try{
  // Original prompt/style/view/seed match the initial generation, so the
  // neural adapter reuses the same locked image instead of creating a new one.
  const result=await generate({...blueprint,action:selected==="pack"?"walk":selected,
   pack:selected==="pack",animateOnly:true,characterOnly:false},progress=>{
    status(animStatus,progress.message||"Готовим кадры…","progress");
  });
  animation=result;
  sheetImg.src=result.sheet;
  sheetDetails.textContent=selected==="pack"
   ?result.actions.length+" действий × "+result.frames+" кадров = "+result.totalFrames+" кадров на одном листе."
   :result.frames+" последовательных кадров одного персонажа на одном листе.";
  animResult.hidden=false;
  playAnimation(result);
  status(animStatus,"Готово. Анимация воспроизводится выше; ниже можно скачать PNG, ZIP или JSON.","success");
  animResult.scrollIntoView({behavior:"smooth",block:"start"});
 }catch(err){status(animStatus,"Не удалось создать анимацию: "+(err?.message||String(err)),"error")}
 finally{
  animate.textContent="Создать анимацию";
  setBusy(false,"animate");
 }
});
cancel.addEventListener("click",async()=>{
 cancel.disabled=true;
 status(createStatus,"Отменяем запрос…","progress");
 try{const result=await cancelCurrent();
  if(!result)status(createStatus,"Генерация ещё не была поставлена в очередь или уже завершилась.","info");
 }catch(e){status(createStatus,"Не удалось отменить: "+(e?.message||e),"error")}
});
downloadCharacter.addEventListener("click",()=>{
 if(character)saveHref(character.source||character.sheet,"SpriteForge_character.png");
});
$("downloadSheet").addEventListener("click",()=>{
 if(animation)saveHref(animation.sheet,selected==="pack"?"SpriteForge_all_animations.png":"SpriteForge_"+selected+"_sheet.png");
});
$("downloadZip").addEventListener("click",()=>{if(animation)saveHref(animation.zip,"SpriteForge_animation_frames.zip")});
$("downloadJson").addEventListener("click",()=>{if(animation)saveHref(animation.atlas,"SpriteForge_atlas.json")});
window.addEventListener("pagehide",stopPreview);
