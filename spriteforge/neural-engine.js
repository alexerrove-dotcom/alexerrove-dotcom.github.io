/* Optional local WebGPU neural renderer. Inference takes place on the user's GPU.
 * Initial model download is required once. Generated sprite frames are synthesized
 * from one neural image by local transforms; this is NOT model-generated animation.
 */
import {createClient} from './webgpu/bundle.js';
let engine,loadPromise;
function status(cb,message,p){if(cb)cb({message:message+(p?.pct!=null?" "+Math.round(p.pct)+"%":"")})}
function toEnglish(p){
const base=window.SpriteForgeLocal.parse(p.prompt);
const species={fox:"orange fox",wolf:"grey wolf",cat:"cat",dog:"dog",rabbit:"rabbit",bear:"bear",squirrel:"squirrel",mouse:"mouse",frog:"frog",bird:"bird",dragon:"dragon",robot:"robot",zombie:"zombie",skeleton:"skeleton",slime:"slime",knight:"armored knight",wizard:"wizard",pirate:"pirate",ninja:"ninja",astronaut:"astronaut",elf:"forest elf",human:"human game hero"};
const weapon={sword:"holding a sword",crossbow:"holding a crossbow",bow:"holding a bow",slingshot:"holding a slingshot",axe:"holding an axe",staff:"holding a staff",gun:"holding a blaster",shield:"carrying a shield",lantern:"holding a lantern"};
const style={retro:"retro pixel art", "16bit":"16 bit pixel art",cozy:"cozy pixel art",dark:"dark fantasy pixel art",cute:"cute pixel art",anime:"anime game art",cartoon:"colorful cartoon game art",chibi:"chibi game sprite",vector:"clean flat vector game art",toon3d:"stylized 3d cartoon",painted:"hand painted game concept art",comic:"comic book style"};
const russian=/[а-яА-ЯёЁ]/.test(p.prompt);
let text=(russian?[species[base.kind]||"game character",base.scarf?"wearing a scarf":"",base.cape?"wearing a cape":"",base.armor?"wearing armor":"",base.bag?"wearing a backpack":"",weapon[base.weapon]||""]: [p.prompt]).filter(Boolean).join(", ");
return "full body single "+text+", character sprite facing right, centered, standing, "+(style[p.style]||"game art")+", white blank background, clear clean silhouette, no text, no scenery, complete hands and feet";
}
async function model(cb){
if(!navigator.gpu)throw Error("Для нейросети нужен WebGPU. Используй автономный генератор.");
if(!loadPromise){
loadPromise=(async()=>{
status(cb,"Инициализируем нейросеть WebGPU...");
const c=createClient(),caps=await c.detect();
if(!caps.webgpu)throw Error("WebGPU недоступен. Попробуй свежий Chrome с включённым ускорением GPU.");
status(cb,"Скачиваем веса нейросети на устройство (один раз; может потребоваться несколько ГБ)...");
const response=await c.load("sd-turbo",{backendPreference:["webgpu"]},(p)=>status(cb,p?.message||"Загрузка модели",p));
if(!response?.ok)throw Error(response?.message||"Не удалось загрузить SD-Turbo");
engine=c;return c;
})().catch(e=>{loadPromise=null;throw e});
}
return loadPromise;
}
function whiteToAlpha(image){
const c=document.createElement("canvas"),w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;c.width=w;c.height=h;
const ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(image,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h),data=pixels.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let front=0,back=0;
const isWhite=i=>{const j=i*4;const r=data[j],g=data[j+1],b=data[j+2];return (r>215&&g>215&&b>215&&Math.max(r,g,b)-Math.min(r,g,b)<55)};
const add=i=>{if(i>=0&&i<seen.length&&!seen[i]&&isWhite(i)){seen[i]=1;queue[back++]=i}};
for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
while(front<back){const i=queue[front++],x=i%w,y=(i/w)|0;if(x>0)add(i-1);if(x+1<w)add(i+1);if(y>0)add(i-w);if(y+1<h)add(i+w)}
for(let i=0;i<seen.length;i++){if(seen[i])data[i*4+3]=0;else if(isWhite(i))data[i*4+3]=180}
ctx.putImageData(pixels,0,0);return c;
}
async function imageFromBlob(blob){return await createImageBitmap(blob)}
function dirsFor(d){return d==="all4"?["down","left","right","up"]:d==="all8"?["down","sw","left","nw","up","ne","right","se"]:[d]}
async function pngBytes(canvas){const blob=await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new Error("Не удалось экспортировать PNG")),"image/png"));return new Uint8Array(await blob.arrayBuffer())}
export async function generate(p,cb){
const c=await model(cb);
status(cb,"Нейросеть рисует изображение прямо на устройстве...");
const result=await c.generate({prompt:toEnglish(p),seed:window.SpriteForgeLocal.parse(p.prompt).seed},(pr)=>status(cb,pr?.message||"WebGPU",pr)).promise;
if(!result?.ok||!result.blob)throw Error(result?.message||"Нейросеть не вернула изображение");
const bitmap=await imageFromBlob(result.blob),cut=whiteToAlpha(bitmap);bitmap.close();
const frameSize=Number(p.size)||64,count=Number(p.frames)||8,dirs=dirsFor(p.facing),sheet=document.createElement("canvas");
sheet.width=frameSize*count;sheet.height=frameSize*dirs.length;
const ctx=sheet.getContext("2d");ctx.imageSmoothingEnabled=frameSize>=128;
const atlas={meta:{image:"sprite_sheet.png",size:{w:sheet.width,h:sheet.height},engine:"local-webgpu-sd-turbo",note:"Animation frames are local transforms of one model-generated image"},frames:{},animations:{}};
const named=[];
for(let d=0;d<dirs.length;d++){
const key=dirs[d]+"_"+p.action;atlas.animations[key]=[];
for(let i=0;i<count;i++){
const frame=document.createElement("canvas");frame.width=frameSize;frame.height=frameSize;const f=frame.getContext("2d");
f.imageSmoothingEnabled=frameSize>=128;
const phase=i*2*Math.PI/count,move=/(run|walk|бег|ходьба)/i.test(p.action),jump=/(jump|прыж)/i.test(p.action),attack=/(attack|атак)/i.test(p.action);
const dx=move?Math.sin(phase)*2:0,dy=jump?-Math.abs(Math.sin(phase/2))*frameSize*.15:move?-Math.abs(Math.sin(phase))*2:0;
f.save();f.translate(frameSize/2+dx,frameSize/2+dy);if(["left","sw","nw"].includes(dirs[d]))f.scale(-1,1);
if(attack)f.rotate(Math.sin(phase)*.06);
const tall=frameSize*.88,w=frameSize*.88;f.drawImage(cut,-w/2,-tall/2,w,tall);f.restore();
ctx.drawImage(frame,i*frameSize,d*frameSize);
const name=key+"_"+String(i).padStart(2,"0")+".png";
named.push([name,frame]);atlas.frames[name]={frame:{x:i*frameSize,y:d*frameSize,w:frameSize,h:frameSize},duration:125};atlas.animations[key].push(name);
}
status(cb,"Собираем кадры и атлас", {pct:Math.round((d+1)/dirs.length*100)});
}
const atlasText=JSON.stringify(atlas,null,2),bytes=await pngBytes(sheet),files=[["sprite_sheet.png",bytes],["atlas.json",atlasText]];
for(const [name,frame] of named)files.push(["frames/"+name,await pngBytes(frame)]);
const zip=URL.createObjectURL(window.SpriteForgeLocal.makeZip(files));
return {engine:"webgpu",sheet:sheet.toDataURL("image/png"),zip,gif:null,atlas:"data:application/json;charset=utf-8,"+encodeURIComponent(atlasText),frames:count,cell_size:frameSize,columns:count,directions:dirs.length,offline:true};
}
