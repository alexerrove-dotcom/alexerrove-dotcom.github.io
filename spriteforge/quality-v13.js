/* SpriteForge V13. Conservative client-side quality gate.
 * Detects empty images, strong picture borders, multiple obvious full-size
 * subjects, and severe appearance drift between animation cells.
 * These are heuristics, not human/AI visual recognition. An accepted result is
 * NOT a guarantee of correct anatomy or character identity.
 */
const mk=(w,h)=>{const x=document.createElement("canvas");x.width=w;x.height=h;return x};
function sample(canvas,w=192,h=192){
 const cv=mk(w,h),ctx=cv.getContext("2d",{willReadFrequently:true});
 ctx.imageSmoothingEnabled=true;
 ctx.drawImage(canvas,0,0,w,h);
 return {w,h,data:ctx.getImageData(0,0,w,h).data};
}
function features({w,h,data}){
 const p=data,edgeColors=[];
 for(let y=0;y<h;y+=6)for(const x of [2,Math.max(2,w-3)]){
  const j=(y*w+x)*4; if(p[j+3]>80&&p[j]>160&&p[j+1]>150&&p[j+2]>140)edgeColors.push([p[j],p[j+1],p[j+2]]);
 }
 for(let x=0;x<w;x+=6)for(const y of [2,Math.max(2,h-3)]){
  const j=(y*w+x)*4;if(p[j+3]>80&&p[j]>160&&p[j+1]>150&&p[j+2]>140)edgeColors.push([p[j],p[j+1],p[j+2]]);
 }
 const avg=[248,248,245];
 if(edgeColors.length>8){
  for(let k=0;k<3;k++)avg[k]=edgeColors.map(a=>a[k]).sort((a,b)=>a-b)[Math.floor(edgeColors.length/2)];
 }
 const active=new Uint8Array(w*h),hist=new Float32Array(16);
 let mass=0,darkBorderRows=0,detected=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,j=i*4,alpha=p[j+3];
  if(alpha<90)continue;
  const r=p[j],g=p[j+1],b=p[j+2],l=.299*r+.587*g+.114*b;
  const dist=Math.sqrt((r-avg[0])**2+(g-avg[1])**2+(b-avg[2])**2);
  // A weak chroma-aware foreground mask. Light backgrounds and very small
  // shadows are ignored while clothing/face/hair remain.
  const fg=dist>66&&(l<225||Math.max(r,g,b)-Math.min(r,g,b)>38);
  if(fg&&x>=3&&y>=3&&x<w-3&&y<h-3){
   active[i]=1;mass++;
   hist[Math.min(15,Math.floor(l/16))]++;
  }
 }
 const borderY=[Math.max(1,Math.round(h*.055)),Math.min(h-2,Math.round(h*.94))];
 for(const y of borderY){
  let dark=0;
  for(let x=Math.round(w*.05);x<Math.round(w*.95);x++){
   const j=(y*w+x)*4,l=.299*p[j]+.587*p[j+1]+.114*p[j+2];
   if(p[j+3]>100&&l<80)dark++;
  }
  if(dark> w*.73)darkBorderRows++;
 }
 const visited=new Uint8Array(w*h),stack=new Int32Array(w*h);
 let components=[];
 for(let y=3;y<h-3;y++)for(let x=3;x<w-3;x++){
  const idx=y*w+x;if(!active[idx]||visited[idx])continue;
  let size=0,minX=w,minY=h,maxX=0,maxY=0,top=0,end=1;
  stack[0]=idx;visited[idx]=1;
  while(top<end){
   const at=stack[top++],xx=at%w,yy=(at/w)|0;
   size++;minX=Math.min(minX,xx);maxX=Math.max(maxX,xx);
   minY=Math.min(minY,yy);maxY=Math.max(maxY,yy);
   const offsets=[at-1,at+1,at-w,at+w,at-w-1,at-w+1,at+w-1,at+w+1];
   for(const next of offsets){
    if(next<0||next>=w*h||!active[next]||visited[next])continue;
    const nx=next%w;
    if(Math.abs(nx-xx)>1)continue;
    visited[next]=1;stack[end++]=next;
   }
  }
  if(size>Math.max(50,w*h*.0025))components.push({size,x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1});
 }
 components.sort((a,b)=>b.size-a.size);
 const figures=components.filter(c=>c.h>h*.31&&c.w>w*.055&&c.size>w*h*.006);
 const largest=figures[0];
 const substantial=largest?figures.filter(c=>c.size>largest.size*.25):[];
 for(let i=0;i<hist.length;i++)hist[i]=mass?hist[i]/mass:0;
 return {w,h,mass,massFraction:mass/(w*h),bg:avg,figures:substantial,components:components.slice(0,6),darkBorderRows,hist};
}
function inspectCanvas(cv){
 const v=features(sample(cv));
 const reasons=[];
 if(v.massFraction<.023)reasons.push("Рисунок почти пустой или персонаж не виден");
 if(v.darkBorderRows===2)reasons.push("Нейросеть нарисовала картинку в рамке вместо отдельного персонажа");
 if(v.figures.length>=2)reasons.push("На изображении обнаружены несколько крупных фигур вместо одного героя");
 return {ok:reasons.length===0,reasons,features:v};
}
export async function validateCharacterBlob(blob){
 const b=await createImageBitmap(blob);
 const cv=mk(b.width,b.height);cv.getContext("2d").drawImage(b,0,0);b.close?.();
 return inspectCanvas(cv);
}
function hueHistogram(canvas){
 const {w,h,data}=sample(canvas,96,96);
 const bins=new Float32Array(18),step=1/Math.max(1,w*h);
 for(let y=5;y<h-5;y+=2)for(let x=4;x<w-4;x+=2){
  const i=(y*w+x)*4,r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255;
  if(data[i+3]<90)continue;
  const hi=Math.max(r,g,b),lo=Math.min(r,g,b),delta=hi-lo;
  if(hi>.91&&delta<.11)continue;
  const s=hi===0?0:delta/hi;
  if(s<.12){bins[16]+=step;continue}
  let hue=0;
  if(hi===r)hue=((g-b)/delta+6)%6;
  else if(hi===g)hue=(b-r)/delta+2;
  else hue=(r-g)/delta+4;
  bins[Math.min(15,Math.floor(hue/6*16))]+=step;
 }
 const sum=bins.reduce((a,b)=>a+b,0);
 if(sum)for(let i=0;i<bins.length;i++)bins[i]/=sum;
 return bins;
}
function similarity(a,b){let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}return dot/Math.sqrt(Math.max(1e-8,aa*bb))}
export async function validateAnimationBlob(blob){
 const bitmap=await createImageBitmap(blob),width=bitmap.width,height=bitmap.height;
 const reasons=[],profiles=[],issues=[];
 if(width/height<.72||width/height>1.32)reasons.push("Нейросеть вернула неверные пропорции спрайт-листа");
 const square=mk(768,768),ctx=square.getContext("2d");
 ctx.drawImage(bitmap,0,0,768,768);bitmap.close?.();
 for(let i=0;i<8;i++){
  const tile=mk(192,384);
  tile.getContext("2d").drawImage(square,(i%4)*192,Math.floor(i/4)*384,192,384,0,0,192,384);
  const inspected=inspectCanvas(tile);
  if(inspected.features.figures.length>=2)issues.push(i+1);
  if(inspected.features.massFraction<.015)issues.push(i+1);
  profiles.push(hueHistogram(tile));
 }
 if(issues.length>=2)reasons.push("В нескольких кадрах по два человека или отсутствует персонаж");
 const scores=[];
 for(let i=1;i<profiles.length;i++)scores.push(similarity(profiles[0],profiles[i]));
 const different=scores.filter(v=>v<.50).length;
 if(different>=3)reasons.push("Между кадрами сильно меняются цвета персонажа — возможно нарисованы разные люди");
 return {ok:reasons.length===0,reasons,issues,similarities:scores.map(x=>+x.toFixed(2))};
}
