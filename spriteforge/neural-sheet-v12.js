/* SpriteForge V12: AI-painted sprite sheets, 4x2 frames for each action.
 * Guide poses come from the fixed character; the output image is newly
 * synthesized by community GPU via img2img. Frame quality/identity are NOT guaranteed.
 */
import {createPoseGuide} from "./neural-rig-v11.js";
const canvas=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c};
function alphaBounds(cv){
 const w=cv.width,h=cv.height,d=cv.getContext("2d",{willReadFrequently:true}).getImageData(0,0,w,h).data;
 let l=w,t=h,r=0,b=0,count=0;
 for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){
  if(d[(y*w+x)*4+3]>60){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);count++}
 }
 return count?{x:l,y:t,w:Math.max(1,r-l+1),h:Math.max(1,b-t+1)}:{x:0,y:0,w,h};
}
export function buildGuide(character,action){
 const W=512,COL=4,ROW=2,cw=W/COL,ch=W/ROW;
 const guide=canvas(W,W),g=guide.getContext("2d");
 g.fillStyle="#ffffff";g.fillRect(0,0,W,W);
 const frames=createPoseGuide(character,action,8,256);
 frames.forEach((frame,i)=>{
  const x=(i%4)*cw,y=Math.floor(i/4)*ch,b=alphaBounds(frame);
  const scale=Math.min((cw-12)/b.w,(ch-18)/b.h);
  const dw=b.w*scale,dh=b.h*scale;
  g.drawImage(frame,b.x,b.y,b.w,b.h,x+(cw-dw)/2,y+ch-dh-9,dw,dh);
 });
 return guide;
}
function actionVerb(action){
 const a=String(action);
 const descriptions={
  idle:"standing breathing gently, slight hair and clothing movement, small posture changes",
  walk:"walking in a smooth right-facing step cycle, left and right feet alternate, heel lift, distinct leg positions, arms swing opposite legs",
  run:"running right with dynamic long strides, alternating extended legs and arm pumping, body leaning slightly forward",
  jump:"preparing to jump, pushing off the ground, ascending, floating with tucked legs, descending, landing with bent knees",
  attack:"preparing attack, winding up, striking forward, recoil and returning to neutral stance",
  death:"stumbling, losing balance, falling forward to the ground, lying motionless in the last frame"
 };
 return descriptions[a]||descriptions.walk;
}
export function sheetPrompt(description,style,action){
 const art={realistic:"detailed realistic 2D game character illustration",
  cartoon:"beautiful hand drawn 2D animated film character design with crisp outlines, soft highlights",
  anime:"polished anime character animation, clean cel-shaded outlines",
  chibi:"chibi 2D animation character, lively expression",
  storybook:"premium painterly storybook cartoon character",
  painted:"hand-painted 2D video game sprite art",
  semi:"polished semi-realistic illustrated game character",
  toon3d:"stylized three-dimensional animation frame render",
  "16bit":"polished 16-bit pixel character art",
  retro:"retro pixel animation",
  cozy:"cozy 2D game character painting",
  dark:"high-quality dark fantasy 2D character art",
  vector:"clean vector-style 2D game sprite art",
  comic:"colored comic character art"};
 const look=art[style]||art.cartoon;
 const positive=[
 "A professional 2D game animation spritesheet, exactly EIGHT sequential animation frames arranged in FOUR COLUMNS and TWO ROWS",
 "eight separate full body drawings of precisely the SAME CHARACTER",
 description,
 "each of the eight tiles contains ONE character, clean separation, equal cell proportions, characters do not overlap across tiles",
 "strict right facing side view, identical costume colors, face, hairstyle and body proportions in all frames",
 "the eight sequential phases depict "+actionVerb(action),
 "every pose hand-drawn anew with believable anatomy, connected joints, good readable silhouette",
 "clean plain white backdrop in every cell, consistent lighting, large clear silhouettes",
 look
 ].join(", ");
 const negative="single large person, one figure, giant head, overlapping figures, clone artifacts, multiple characters per frame, different people, changing clothes, floating limbs, cut off feet, detached arms, duplicate heads, text, words, watermark, panel captions, speech bubbles";
 return positive+" ### "+negative;
}
function imageToCanvas(img){
 const cv=canvas(512,512),g=cv.getContext("2d");
 g.imageSmoothingEnabled=true;g.drawImage(img,0,0,512,512);
 return cv;
}
function removeEdgeBackground(cv){
 // Only edge-connected near-white pixels are made transparent.
 const w=cv.width,h=cv.height,g=cv.getContext("2d",{willReadFrequently:true});
 const im=g.getImageData(0,0,w,h),pix=im.data;
 const n=w*h,seen=new Uint8Array(n),queue=new Int32Array(n);
 let front=0,end=0;
 const isWhite=i=>{const j=4*i;return pix[j]>231&&pix[j+1]>231&&pix[j+2]>231};
 function add(i){if(!seen[i]&&isWhite(i)){seen[i]=1;queue[end++]=i}}
 for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}
 for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
 while(front<end){
  const i=queue[front++],x=i%w,y=(i/w)|0;
  if(x>0)add(i-1);if(x<w-1)add(i+1);
  if(y>0)add(i-w);if(y<h-1)add(i+w);
 }
 for(let i=0;i<n;i++)if(seen[i])pix[i*4+3]=0;
 g.putImageData(im,0,0);
 return cv;
}
async function imageFrames(blob,size=256){
 const bitmap=await createImageBitmap(blob);
 const normalized=canvas(512,512);
 normalized.getContext("2d").drawImage(bitmap,0,0,512,512);
 bitmap.close?.();
 const cropped=[];
 for(let i=0;i<8;i++){
  const cut=canvas(128,256),g=cut.getContext("2d");
  g.drawImage(normalized,(i%4)*128,Math.floor(i/4)*256,128,256,0,0,128,256);
  removeEdgeBackground(cut);
  cropped.push(cut);
 }
 const bounds=cropped.map(alphaBounds);
 const widest=Math.max(...bounds.map(b=>b.w));
 const tallest=Math.max(...bounds.map(b=>b.h));
 const ratio=Math.min((size-22)/Math.max(1,widest),(size-18)/Math.max(1,tallest));
 return cropped.map((cut,i)=>{
  const b=bounds[i],frame=canvas(size,size),g=frame.getContext("2d");
  const w=b.w*ratio,h=b.h*ratio;
  g.imageSmoothingEnabled=true;
  g.drawImage(cut,b.x,b.y,b.w,b.h,(size-w)/2,size-h-7,w,h);
  return frame;
 });
}
function occupancy(frames){
 let occupied=0;
 for(const f of frames){
  const {width:w,height:h}=f,d=f.getContext("2d",{willReadFrequently:true}).getImageData(0,0,w,h).data;
  let samples=0;
  for(let y=12;y<h-12;y+=7)for(let x=12;x<w-12;x+=7)if(d[(y*w+x)*4+3]>90)samples++;
  if(samples>=24)occupied++;
 }
 return occupied;
}
async function pngBytes(cv){
 const blob=await new Promise((resolve,reject)=>cv.toBlob(x=>x?resolve(x):reject(Error("Ошибка сохранения PNG")),"image/png"));
 return new Uint8Array(await blob.arrayBuffer());
}
const tick=()=>new Promise(ok=>setTimeout(ok,0));
export async function packAIFrames(character,images,options,onProgress){
 const actions=Object.keys(images);
 if(!actions.length)throw Error("Не получены кадры анимации");
 const size=256,count=8;
 const sheet=canvas(size*count,size*actions.length),g=sheet.getContext("2d");
 const atlas={meta:{app:"SpriteForge RU",version:"12",frameSize:size,
  image:"sprite_sheet.png",size:{w:sheet.width,h:sheet.height},
  method:"AI Horde img2img sprite-sheet redraw; frame consistency is approximate"},
  frames:{},animations:{}};
 const saved=[];
 let warnings=[];
 for(let row=0;row<actions.length;row++){
  const action=actions[row];
  const frames=await imageFrames(images[action],size);
  const countPresent=occupancy(frames);
  if(countPresent<7)warnings.push(action+": только "+countPresent+" из 8 ячеек содержат рисунок");
  atlas.animations[action]=[];
  for(let i=0;i<frames.length;i++){
   const x=i*size,y=row*size;
   g.drawImage(frames[i],x,y);
   const name=action+"_"+String(i).padStart(2,"0")+".png";
   atlas.frames[name]={frame:{x,y,w:size,h:size},duration:125};
   atlas.animations[action].push(name);
   saved.push({name,canvas:frames[i]});
  }
  onProgress?.({message:"Обрабатываем нейросетевые кадры: "+(row+1)+"/"+actions.length});
  await tick();
 }
 const json=JSON.stringify(atlas,null,2);
 const files=[["sprite_sheet.png",await pngBytes(sheet)],["atlas.json",json],
 ["original_character.png",await pngBytes(character.canvas)]];
 for(let i=0;i<saved.length;i++){
  files.push(["frames/"+saved[i].name,await pngBytes(saved[i].canvas)]);
  if(i%8===7)await tick();
 }
 const zip=URL.createObjectURL(window.SpriteForgeLocal.makeZip(files));
 return {sheet:sheet.toDataURL("image/png"),source:character.canvas.toDataURL("image/png"),
  zip,atlas:"data:application/json;charset=utf-8,"+encodeURIComponent(json),
  frames:8,columns:8,cell_size:size,actions,actionCount:actions.length,totalFrames:8*actions.length,
  engine:"horde",animationMethod:"ai-frames",warnings,seed:options.seed};
}
