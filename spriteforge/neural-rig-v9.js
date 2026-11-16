/* SpriteForge V9 — photograph-derived local motion mesh.
   A single diffusion-generated, transparent image is the source of every frame.
   This is 2D image warping, not multi-frame diffusion and not bone-perfect rigging.
*/
const TAU=Math.PI*2;
const smooth=(a,b,v)=>{const x=Math.max(0,Math.min(1,(v-a)/(b-a)));return x*x*(3-2*x)};
function makeCanvas(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;return c}
function whitenToAlpha(bitmap){
 const w=bitmap.width,h=bitmap.height;
 const cv=makeCanvas(w,h),c=cv.getContext("2d",{willReadFrequently:true});c.drawImage(bitmap,0,0);
 const id=c.getImageData(0,0,w,h),a=id.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
 let head=0,tail=0;
 function nearWhite(i){const j=i*4;return a[j]>=216&&a[j+1]>=216&&a[j+2]>=216&&Math.max(a[j],a[j+1],a[j+2])-Math.min(a[j],a[j+1],a[j+2])<43}
 function add(i){if(i>=0&&i<seen.length&&!seen[i]&&nearWhite(i)){seen[i]=1;queue[tail++]=i}}
 for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}
 for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
 while(head<tail){let i=queue[head++],x=i%w,y=(i/w)|0;
  if(x>0)add(i-1);if(x<w-1)add(i+1);if(y>0)add(i-w);if(y<h-1)add(i+w);
 }
 let minX=w,minY=h,maxX=0,maxY=0,count=0;
 for(let i=0;i<seen.length;i++){
  const j=i*4;
  if(seen[i]){a[j+3]=0;continue}
  // only soften near-white areas that were connected to the outside
  if(a[j+3]>30&&nearWhite(i))a[j+3]=Math.min(a[j+3],190);
  if(a[j+3]>30){const x=i%w,y=(i/w)|0;count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
 }
 c.putImageData(id,0,0);
 return {canvas:cv,bbox:count?{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}:{x:0,y:0,w,h},hasSubject:count>=w*h*.015};
}
export async function prepareCharacter(blob){
 const bitmap=await createImageBitmap(blob),cut=whitenToAlpha(bitmap);bitmap.close?.();
 const target=makeCanvas(512,512),g=target.getContext("2d");
 const b=cut.bbox,pad=.09,scale=Math.min(512*(1-2*pad)/b.w,512*(1-2*pad)/b.h,3);
 const dw=b.w*scale,dh=b.h*scale;
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality="high";
 g.drawImage(cut.canvas,b.x,b.y,b.w,b.h,(512-dw)/2,(512-dh)/2,dw,dh);
 return {canvas:target,hasSubject:cut.hasSubject};
}
function poseKind(a){
 a=String(a||"idle").toLowerCase();
 if(/run|бег/.test(a))return"run";
 if(/walk|ходьб|ид[её]т|шаг/.test(a))return"walk";
 if(/jump|прыж/.test(a))return"jump";
 if(/attack|удар|атак|стрел/.test(a))return"attack";
 if(/death|смерт|умира/.test(a))return"death";
 if(/hurt|урон|попад/.test(a))return"hurt";
 if(/cast|маг|заклин/.test(a))return"cast";
 if(/fly|пол[её]т|лет/.test(a))return"fly";
 return"idle";
}
function warp(source,action,index,total,sz,flip){
 const k=poseKind(action),phase=index*TAU/Math.max(1,total),osc=Math.sin(phase),co=Math.cos(phase),t=index/Math.max(1,total-1);
 const still=makeCanvas(sz,sz),g=still.getContext("2d",{willReadFrequently:true});
 g.imageSmoothingEnabled=true;g.drawImage(source,0,0,sz,sz);
 const original=g.getImageData(0,0,sz,sz),src=original.data,output=g.createImageData(sz,sz),dst=output.data;
 const strength=k==="run"?1.45:k==="walk"?1:0;
 const amp=sz*.062*strength;
 let vertical=0;
 if(k==="idle")vertical=sz*.004*Math.sin(phase);
 if(strength)vertical=-sz*.009*Math.abs(osc);
 if(k==="jump"||k==="fly")vertical=-sz*(k==="fly"?.055:.14)*Math.sin(Math.PI*t);
 if(k==="hurt")vertical=-sz*.017*Math.sin(Math.PI*t);
 const sample=(x,y,j)=>{
  if(x<0||y<0||x>sz-1||y>sz-1)return 0;
  const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(sz-1,x0+1),y1=Math.min(sz-1,y0+1),dx=x-x0,dy=y-y0;
  const i00=(y0*sz+x0)*4+j,i10=(y0*sz+x1)*4+j,i01=(y1*sz+x0)*4+j,i11=(y1*sz+x1)*4+j;
  return Math.round((1-dy)*((1-dx)*src[i00]+dx*src[i10])+dy*((1-dx)*src[i01]+dx*src[i11]));
 };
 for(let y=0;y<sz;y++){
  const ny=y/sz;
  for(let x=0;x<sz;x++){
   const nx=x/sz,side=nx<.5?-1:1,abs=Math.abs(nx-.5),d=(y*sz+x)*4;
   let offX=0,offY=vertical;
   if(strength){
    // An anchored non-rigid transform: torso stays fixed and alternating
    // strides stretch knees/feet; opposite arms swing from shoulders.
    const leg=smooth(.57,.97,ny);
    const lane=1-smooth(.29,.53,Math.abs(nx-.5));
    offX+=side*(side===-1?1:-1)*osc*amp*leg*lane;
    offY+=-(side===-1?1:-1)*Math.max(0,osc*side)*sz*.032*strength*leg*lane;
    const arm=smooth(.25,.43,ny)*(1-smooth(.59,.76,ny))*smooth(.16,.32,abs);
    offX+=(side===-1?1:-1)*osc*amp*.48*arm;
    offY+=(side===-1?-1:1)*osc*sz*.018*strength*arm;
   }
   if(k==="jump"){
    const tuck=Math.sin(Math.PI*t);
    const leg=smooth(.62,.95,ny);
    offY-=sz*.039*tuck*leg;
    offX+=side*sz*.018*tuck*leg;
   }
   if(k==="attack"){const hand=smooth(.20,.35,ny)*(1-smooth(.53,.7,ny))*smooth(.1,.32,abs)*(side>0?1:0);
    offX+=sz*.12*Math.sin(Math.PI*t)*hand;
    offY-=sz*.07*Math.sin(Math.PI*t)*hand;
   }
   if(k==="cast"){const hand=smooth(.22,.39,ny)*(1-smooth(.57,.73,ny))*smooth(.13,.32,abs);
    offY-=sz*.09*Math.sin(Math.PI*t)*hand;
   }
   const ox=x-offX,oy=y-offY;
   for(let j=0;j<4;j++)dst[d+j]=sample(ox,oy,j);
  }
 }
 g.putImageData(output,0,0);
 if(k==="death"){
  const rot=Math.PI*.40*smooth(.08,.95,t);
  const rotated=makeCanvas(sz,sz),c=rotated.getContext("2d");
  c.translate(sz*.5,sz*.73);c.rotate(rot);c.drawImage(still,-sz*.5,-sz*.73);return rotated;
 }
 if(flip){const flipped=makeCanvas(sz,sz),c=flipped.getContext("2d");c.translate(sz,0);c.scale(-1,1);c.drawImage(still,0,0);return flipped;}
 return still;
}
const dataUri=cv=>cv.toDataURL("image/png");
async function pngBytes(canvas){const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("PNG encoding failed")),"image/png"));return new Uint8Array(await blob.arrayBuffer());}
export async function composeSprites(character,params,progress){
 const sz=Math.max(64,Math.min(256,Number(params.size)||256));
 const n=params.characterOnly?1:([6,8,12].includes(Number(params.frames))?Number(params.frames):8);
 const actions=params.characterOnly?["idle"]:params.pack?["idle","walk","run","jump","attack","death"]:[poseKind(params.action)];
 const original=character.canvas,rows=actions.length,atlas={meta:{image:"sprite_sheet.png",size:{w:sz*n,h:sz*rows},frameSize:sz,source:"SD-Turbo generated image",animation:"2D non-rigid character image deformation; not diffusion-per-frame",license:"Stability AI Community License"},frames:{},animations:{}};
 const sheet=makeCanvas(sz*n,sz*rows),g=sheet.getContext("2d");let items=[];
 for(let row=0;row<rows;row++){
  const act=actions[row];atlas.animations[act]=[];
  for(let i=0;i<n;i++){
   const canvas=params.characterOnly?makeCanvas(sz,sz):warp(original,act,i,n,sz,false);
   if(params.characterOnly){const c=canvas.getContext("2d");c.imageSmoothingEnabled=true;c.drawImage(original,0,0,sz,sz)}
   g.drawImage(canvas,i*sz,row*sz);
   const name=act+"_"+String(i).padStart(2,"0")+".png";
   atlas.frames[name]={frame:{x:i*sz,y:row*sz,w:sz,h:sz},duration:125};
   atlas.animations[act].push(name);
   items.push({name,canvas});
  }
  progress?.({message:"Собраны кадры: "+(row+1)+"/"+rows});
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 const atlasText=JSON.stringify(atlas,null,2);
 const files=[["sprite_sheet.png",await pngBytes(sheet)],["atlas.json",atlasText],["source_character.png",await pngBytes(original)]];
 for(const x of items)files.push(["frames/"+x.name,await pngBytes(x.canvas)]);
 const zip=URL.createObjectURL(window.SpriteForgeLocal.makeZip(files));
 return {sheet:dataUri(sheet),atlas:"data:application/json;charset=utf-8,"+encodeURIComponent(atlasText),zip,gif:null,frames:n,columns:n,cell_size:sz,directions:1,directionNames:["right"],actions,totalFrames:actions.length*n,actionCount:actions.length,seed:params.seed,engine:"webgpu",offline:true,source:dataUri(original)};
}
