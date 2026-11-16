/* SpriteForge v11 — lightweight, transparent character cutout animation.
   Body regions are automatically estimated from the AI image silhouette.
   Unlike the v9 per-pixel warp, animation runs on Canvas transforms and yields
   between frames. No extra tokens, login, or GPU. It is an approximate 2D rig:
   it cannot invent previously hidden anatomy like a trained motion model.
*/
export {prepareCharacter} from "./neural-rig-v9.js";
const TWO_PI=Math.PI*2;
const cnv=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c};
function findBounds(cv){
 const {width:w,height:h}=cv,g=cv.getContext("2d",{willReadFrequently:true});
 const rgba=g.getImageData(0,0,w,h).data;
 let x0=w,y0=h,x1=0,y1=0,seen=0;
 // Ignore nearly transparent antialiased background.
 for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){
  if(rgba[(y*w+x)*4+3]>70){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);seen++}
 }
 if(seen<100)return {x:w*.18,y:h*.09,w:w*.64,h:h*.82};
 return {x:x0,y:y0,w:Math.max(12,x1-x0),h:Math.max(12,y1-y0)};
}
function partPolygons(bounds){
 const {x,y,w,h}=bounds,cx=x+w/2;
 const at=(ux,uy)=>[cx+ux*w,y+uy*h];
 const leftArm=[
  at(-.12,.28),at(-.20,.27),at(-.31,.40),at(-.45,.58),
  at(-.40,.72),at(-.29,.67),at(-.24,.55),at(-.13,.38)
 ];
 const rightArm=leftArm.map(([px,py])=>[2*cx-px,py]).reverse();
 const leftLeg=[
  at(-.185,.58),at(-.015,.58),at(-.025,.77),at(-.06,.99),
  at(-.29,1),at(-.25,.91),at(-.24,.78)
 ];
 const rightLeg=leftLeg.map(([px,py])=>[2*cx-px,py]).reverse();
 return [
  {id:"armL",poly:leftArm,pivot:at(-.16,.30)},
  {id:"armR",poly:rightArm,pivot:at(.16,.30)},
  {id:"legL",poly:leftLeg,pivot:at(-.11,.60)},
  {id:"legR",poly:rightLeg,pivot:at(.11,.60)}
 ];
}
function polyPath(ctx,points){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.closePath()}
function cutOut(src,parts){
 const w=src.width,h=src.height;
 const layers={base:cnv(w,h)};
 const base=layers.base.getContext("2d",{alpha:true});
 base.drawImage(src,0,0);
 for(const p of parts){
  const canvas=cnv(w,h),g=canvas.getContext("2d",{alpha:true});
  g.save();polyPath(g,p.poly);g.clip();g.drawImage(src,0,0);g.restore();
  layers[p.id]=canvas;
  base.save();base.globalCompositeOperation="destination-out";polyPath(base,p.poly);base.fillStyle="#000";base.fill();base.restore();
 }
 return layers;
}
function buildRig(character){
 const source=character.canvas;
 const bounds=findBounds(source),parts=partPolygons(bounds),layers=cutOut(source,parts);
 return {source,bounds,layers,pivots:Object.fromEntries(parts.map(x=>[x.id,x.pivot]))};
}
function angles(action,i,n,bounds){
 const t=i/Math.max(1,n-1),phase=i*TWO_PI/n,s=Math.sin(phase),bounce=Math.abs(Math.sin(phase));
 let aL=0,aR=0,lL=0,lR=0,y=0,tilt=0,dx=0;
 if(action==="idle"){
  y=-bounds.h*.007*Math.cos(phase);
  aL=.025*s;aR=-.025*s;
 }else if(action==="walk"||action==="run"){
  const speed=action==="run"?1.55:1;
  lL=.35*s*speed;lR=-.35*s*speed;
  aL=-.35*s*speed;aR=.35*s*speed;
  y=-bounds.h*(action==="run"?.024:.012)*bounce;
  tilt=action==="run"?-.055:-.019;
  dx=bounds.w*.014*s;
 }else if(action==="jump"){
  const lift=Math.sin(Math.PI*t);
  y=-bounds.h*.18*lift;
  lL=-.38*lift;lR=.38*lift;
  aL=-.78*lift;aR=.78*lift;
  tilt=-.06*lift;
 }else if(action==="attack"){
  const swing=Math.sin(Math.PI*Math.min(1,t*1.12));
  aR=-1.07*swing;aL=.24*swing;
  lL=.18*swing;lR=-.23*swing;
  tilt=-.18*swing;dx=bounds.w*.04*swing;
 }else if(action==="death"){
  const k=t*t*(3-2*t);
  tilt=Math.min(1.13,k*1.45);y=bounds.h*.09*k;
  aR=.5*k;aL=-.4*k;lL=.35*k;lR=-.5*k;
 }else if(action==="hurt"){
  dx=bounds.w*.025*Math.sin(t*7*Math.PI);
  tilt=.1*Math.sin(t*3*Math.PI);
 }else if(action==="cast"){
  const k=Math.sin(t*Math.PI);aL=-.65*k;aR=.65*k;y=-bounds.h*.03*k;
 }else if(action==="fly"){
  y=-bounds.h*.09-.025*bounds.h*Math.sin(phase);
  aL=-.5*s;aR=.5*s;
 }
 return {aL,aR,lL,lR,dx,y,tilt};
}
function paintFrame(rig,action,i,n,size){
 const frame=cnv(size,size),ctx=frame.getContext("2d");
 const scale=size/rig.source.width,parts=rig.layers,b=rig.bounds,
  angle=angles(action,i,n,b),cx=b.x+b.w/2,cy=b.y+b.h*.59;
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
 ctx.save();ctx.scale(scale,scale);
 ctx.translate(angle.dx,angle.y);
 // A single shared body transform keeps arms/legs attached during attacks/falls.
 ctx.translate(cx,cy);ctx.rotate(angle.tilt);ctx.translate(-cx,-cy);
 function renderPart(name,rotation){
  const p=rig.pivots[name];ctx.save();ctx.translate(p[0],p[1]);ctx.rotate(rotation);ctx.translate(-p[0],-p[1]);ctx.drawImage(parts[name],0,0);ctx.restore();
 }
 // Far limbs behind torso, near limbs above torso; same original pixels throughout.
 renderPart("legL",angle.lL);renderPart("armL",angle.aL);
 renderPart("legR",angle.lR);
 ctx.drawImage(parts.base,0,0);
 renderPart("armR",angle.aR);
 ctx.restore();
 return frame;
}
const pngData=cv=>cv.toDataURL("image/png");
async function bytes(cv){
 const blob=await new Promise((resolve,reject)=>cv.toBlob(b=>b?resolve(b):reject(Error("Не удалось сохранить PNG")),"image/png"));
 return new Uint8Array(await blob.arrayBuffer());
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function isCompatible(character){return !!character?.canvas&&typeof character.canvas.getContext==="function"}
export async function composeSprites(character,options,progress){
 if(!isCompatible(character))throw Error("Не удалось прочитать изображение героя.");
 const frameSize=Math.max(96,Math.min(256,Number(options.size)||256));
 const count=options.characterOnly?1:8; // 8 synchronized frames per action
 const actions=options.characterOnly?["idle"]:options.pack?
  ["idle","walk","run","jump","attack","death"]:[String(options.action||"walk")];
 const allowed=new Set(["idle","walk","run","jump","attack","death","hurt","cast","fly"]);
 for(let i=0;i<actions.length;i++)if(!allowed.has(actions[i]))actions[i]="idle";
 const width=frameSize*count,height=frameSize*actions.length;
 const sheet=cnv(width,height),g=sheet.getContext("2d"),frames=[];
 const rig=options.characterOnly?null:buildRig(character);
 const atlas={meta:{app:"SpriteForge RU",version:"11",image:"sprite_sheet.png",
  size:{w:width,h:height},frameSize:frameSize,framesPerAction:count,
  animationMethod:"Cutout 2D rig animated from the AI-generated original character, not per-frame AI"},
  frames:{},animations:{}};
 for(let row=0;row<actions.length;row++){
  const action=actions[row];atlas.animations[action]=[];
  for(let f=0;f<count;f++){
   const cv=options.characterOnly?cnv(frameSize,frameSize):paintFrame(rig,action,f,count,frameSize);
   if(options.characterOnly)cv.getContext("2d").drawImage(character.canvas,0,0,frameSize,frameSize);
   g.drawImage(cv,f*frameSize,row*frameSize);
   const name=action+"_"+String(f).padStart(2,"0")+".png";
   frames.push({name,cv});
   atlas.frames[name]={frame:{x:f*frameSize,y:row*frameSize,w:frameSize,h:frameSize},duration:125};
   atlas.animations[action].push(name);
   if(f%2===1)await tick();
  }
  progress?.({message:"Создаём анимацию: "+(row+1)+"/"+actions.length+" действий"});
 }
 const json=JSON.stringify(atlas,null,2);
 const archiveFiles=[["sprite_sheet.png",await bytes(sheet)],["atlas.json",json],
  ["original_character.png",await bytes(character.canvas)]];
 for(let i=0;i<frames.length;i++){
  archiveFiles.push(["frames/"+frames[i].name,await bytes(frames[i].cv)]);
  if(i%6===5)await tick();
 }
 const zip=URL.createObjectURL(window.SpriteForgeLocal.makeZip(archiveFiles));
 return {sheet:pngData(sheet),source:pngData(character.canvas),zip,atlas:"data:application/json;charset=utf-8,"+encodeURIComponent(json),
  frames:count,columns:count,cell_size:frameSize,directions:1,directionNames:["right"],
  actionCount:actions.length,totalFrames:frames.length,actions,engine:"horde",seed:options.seed,offline:false,
  exportMethod:"rig",animationMethod:"cutout"};
}
