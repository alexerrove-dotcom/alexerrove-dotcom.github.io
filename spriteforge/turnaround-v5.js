/* SpriteForge V5 — real turnaround silhouette geometry, entirely local.
 * Front / profile / back / three-quarter bodies have different geometry.
 * No photorealistic-image synthesis is claimed or performed.
 */
(function(root){"use strict";
const TAU=Math.PI*2;
function shade(hex,v){if(!/^#[0-9a-f]{6}$/i.test(hex||""))hex="#997454";return "#"+[1,3,5].map(i=>{const a=parseInt(hex.slice(i,i+2),16);return Math.round(Math.min(255,Math.max(0,a+(v>0?(255-a)*v:a*v)))).toString(16).padStart(2,"0")}).join("")}
function mix(a,b,t){if(!/^#[0-9a-f]{6}$/i.test(a))a="#997454";if(!/^#[0-9a-f]{6}$/i.test(b))b="#e6decf";return "#"+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,"0")).join("")}
function gradient(g,x,y,X,Y,a,b){const p=g.createLinearGradient(x,y,X,Y);p.addColorStop(0,a);p.addColorStop(1,b);return p}
function poly(g,points,fill,stroke,w=2){g.beginPath();g.moveTo(...points[0]);for(let i=1;i<points.length;i++)g.lineTo(...points[i]);g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.lineWidth=w;g.lineJoin="round";g.lineCap="round";g.strokeStyle=stroke;g.stroke()}}
function curve(g,cb,fill,stroke,w=2){g.beginPath();cb(g);g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=w;g.lineJoin="round";g.stroke()}}
function oval(g,x,y,rx,ry,fill,stroke,w=2){g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fillStyle=fill;g.fill();if(stroke){g.lineWidth=w;g.strokeStyle=stroke;g.stroke()}}
function stroke(g,points,color,w=2){g.beginPath();g.moveTo(...points[0]);for(let i=1;i<points.length;i++)g.lineTo(...points[i]);g.strokeStyle=color;g.lineWidth=w;g.lineCap="round";g.lineJoin="round";g.stroke()}
function rounded(g,x,y,w,h,r,fill,outline,sw=2){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();if(outline){g.lineWidth=sw;g.strokeStyle=outline;g.stroke()}}
function limb(g,sx,sy,ex,ey,thick,base,ink){
 const elbowX=sx+(ex-sx)*.42+(sx<0?-2:2),elbowY=sy+(ey-sy)*.46;
 const linepts=[[sx,sy],[elbowX,elbowY],[ex,ey]];
 stroke(g,linepts,ink,thick+3.7);stroke(g,linepts,base,thick);
 if(typeof base==="string")stroke(g,[[sx+2,sy+4],[elbowX+1,elbowY]],shade(base,.15),1.9);
}
function pose(action,index,total){
 const p=root.SpriteForgePoseV4?.sample(action,index,total);
 if(p)return p;
 const phase=TAU*index/total;return {phase,t:index/Math.max(1,total-1),type:"idle",bob:0,lean:0,arm:0,feet:{left:{x:-15,y:88,contact:true},right:{x:15,y:88,contact:true}},attackAngle:0,attackReach:0};
}
function direction(view,d,mode){
 if(view==="top")return "top";
 const grouped=mode==="all4"||mode==="all8";
 if(grouped||d==="up"||d==="down"||(view!=="front"&&view!=="back"&&view!=="iso")){
  if(d==="up")return "back";
  if(d==="down")return "front";
  if(["ne","nw","se","sw"].includes(d))return "quarter";
  if(d==="left"||d==="right")return "profile";
 }
 if(view==="front")return "front";
 if(view==="back")return "back";
 if(view==="iso")return "quarter";
 return "profile";
}
const animalKinds=new Set(["fox","wolf","cat","dog","rabbit","bear","squirrel","mouse","frog","bird","dragon"]);
function wardrobe(p){
 const w=p.design?.wardrobe||{};
 const human=!animalKinds.has(p.kind)&&!["robot","skeleton","slime"].includes(p.kind);
 const jeansColor= w.pants|| (human?"#59758b":shade(p.coat,-.21));
 return {pants:jeansColor,shoes:w.shoes|| (human?"#e8e2d8":shade(p.main,-.20)),
 hair:w.hair || "#46392f",jacket:w.clothing||p.coat, shirt:w.shirt||"#ebe7df",human};
}
function drawTail(g,p,side){
 if(!animalKinds.has(p.kind)||["frog","bird"].includes(p.kind))return;
 const col=p.main,ink=shade(p.ink,-.18);
 if(side==="back"){
  curve(g,c=>{c.moveTo(2,13);c.quadraticCurveTo(17,37,5,64);c.quadraticCurveTo(29,58,29,36);c.quadraticCurveTo(28,9,6,10)},gradient(g,8,8,25,63,shade(col,.18),shade(col,-.23)),ink,2.3);return;
 }
 if(side==="profile"||side==="quarter"){
  curve(g,c=>{c.moveTo(-10,11);c.bezierCurveTo(-43,6,-53,-19,-66,-3);c.bezierCurveTo(-79,19,-52,43,-22,27);c.lineTo(-5,17)},gradient(g,-68,0,-12,36,shade(col,.25),shade(col,-.20)),ink,2.6);
  if(p.kind==="fox"||p.kind==="wolf"||p.kind==="squirrel")poly(g,[[-66,-2],[-75,14],[-64,26],[-49,21]],p.light);
 }else if(p.kind==="rabbit")oval(g,5,25,11,11,p.light,ink,1.5);
}
function leg(g,p,side,poseData,part,coatInfo){
 const ink=shade(p.ink,-.28);
 const idx=part==="left"?-1:1;
 const ft=poseData.feet?.[part]||{x:idx*13,y:88,contact:true};
 let hipX=side==="profile"?idx*4:idx*14;
 let ankleX=side==="profile"?ft.x*.70:(side==="quarter"?ft.x*.85:ft.x);
 let ankleY=ft.y;
 const hipY=11;
 const kneex=hipX+(ankleX-hipX)*.4+(side==="profile"?5*idx:2*idx);
 const kneeY=51+(ft.contact?2:-3);
 const pants=coatInfo.pants;
 // Independent thigh and calf silhouettes: back seam only from rear.
 curve(g,c=>{c.moveTo(hipX-9,hipY);c.quadraticCurveTo(kneex-10,kneeY-13,kneex-9,kneeY+2);
   c.lineTo(ankleX-8,ankleY-10);c.lineTo(ankleX+8,ankleY-10);
   c.quadraticCurveTo(kneex+12,kneeY+3,kneex+10,kneeY-8);c.lineTo(hipX+9,hipY)},
   gradient(g,hipX-10,18,hipX+12,85,shade(pants,.19),shade(pants,-.19)),ink,2.3);
 stroke(g,[[hipX+4,17],[kneex+5,kneeY],[ankleX+3,ankleY-12]],shade(pants,-.23),1.5);
 if(side!=="profile"){stroke(g,[[hipX-5,25],[kneex-2,kneeY-3]],shade(pants,.20),1.3)}
 const toe=side==="profile"?14:10;
 curve(g,c=>{c.moveTo(ankleX-8,ankleY-10);c.lineTo(ankleX+7,ankleY-10);
   c.quadraticCurveTo(ankleX+toe+4,ankleY-7,ankleX+toe,ankleY+4);
   c.lineTo(ankleX-8,ankleY+4);c.closePath()},
   gradient(g,ankleX-10,ankleY-9,ankleX+toe,ankleY+6,shade(coatInfo.shoes,.2),shade(coatInfo.shoes,-.24)),ink,1.8);
 stroke(g,[[ankleX-7,ankleY+2],[ankleX+toe,ankleY+2]],"#514e4d",2.3);
}
function jacket(g,p,side,w){
 const coat=w.jacket,ink=shade(p.ink,-.3),sideProfile=side==="profile",back=side==="back",quarter=side==="quarter";
 const width=sideProfile?16:quarter?25:34;
 const left=-width,right=width;
 const top=-57,bottom=17;
 const outer=gradient(g,left,-62,right,27,shade(coat,.23),shade(coat,-.23));
 curve(g,c=>{c.moveTo(left,-55);c.quadraticCurveTo(-width-3,-44,left-2,-12);
   c.lineTo(left+3,bottom);c.quadraticCurveTo(0,bottom+4,right-3,bottom);
   c.lineTo(right+2,-17);c.lineTo(right,-53);c.quadraticCurveTo(0,-68,left,-55)},outer,ink,2.9);
 if(back){
  // Rear jacket, no frontal opening or zipper.
  stroke(g,[[-width+4,-51],[0,-58],[width-4,-52]],shade(coat,-.22),1.5);
  stroke(g,[[0,-52],[0,6]],shade(coat,-.17),1.3);
  curve(g,c=>{c.moveTo(-width+4,-18);c.quadraticCurveTo(0,-10,width-4,-18)},null,shade(coat,-.15),1.3);
  stroke(g,[[-width+6,9],[width-6,10]],shade(coat,-.29),3.5);
 }else if(sideProfile){
  // One visible jacket panel, one pocket, a thin zipper at front profile edge.
  stroke(g,[[width-4,-48],[width-2,14]],shade(coat,-.39),2.8);
  stroke(g,[[width-8,-49],[width-1,-31]],shade(coat,.30),2.6);
  stroke(g,[[-8,-18],[3,-16],[5,3]],shade(coat,-.21),1.6);
  stroke(g,[[-width+3,10],[width-2,10]],shade(coat,-.34),3);
  stroke(g,[[-3,-8],[10,-11]],shade(coat,.2),1.1);
 }else{
  // True front jacket opening: shirt center, opposite lapels and two pockets.
  const gap=quarter?6:8;
  curve(g,c=>{c.moveTo(-gap,-53);c.lineTo(-gap+2,10);c.lineTo(gap-2,10);c.lineTo(gap,-53)},w.shirt,shade(coat,-.39),1.5);
  stroke(g,[[-gap,-52],[-gap+2,13]],shade(coat,-.34),2.6);
  stroke(g,[[gap,-52],[gap-2,13]],shade(coat,-.34),2.6);
  poly(g,[[-width+5,-53],[-gap,-50],[-gap-1,-29],[-width+10,-40]],shade(coat,.25),shade(coat,-.2),1.2);
  poly(g,[[width-4,-52],[gap,-50],[gap+1,-29],[width-9,-41]],shade(coat,.14),shade(coat,-.2),1.2);
  for(const s of [-1,1]){
    stroke(g,[[s*(width-8),-6],[s*(gap+5),-4]],shade(coat,-.34),1.5);
    stroke(g,[[s*(width-7),-8],[s*(gap+5),-9]],shade(coat,.29),1.2);
  }
  oval(g,0,4,2,2,"#d1c7af");
 }
 // Hem and collar retain their silhouettes from all camera angles.
 stroke(g,[[left+2,bottom-2],[right-2,bottom-1]],shade(coat,-.36),3.9);
 if(sideProfile){
  poly(g,[[-14,-53],[8,-63],[width,-53],[6,-48]],shade(coat,-.22),ink,1.7)
 }else{
  poly(g,[[-20,-54],[-12,-65],[0,-60],[12,-65],[21,-53],[0,-48]],shade(coat,-.25),ink,1.6)
 }
}
function headHuman(g,p,side,w){
 const back=side==="back",profile=side==="profile",quarter=side==="quarter",ink=shade(p.ink,-.23),skin=p.main||"#d0ad88",hair=w.hair;
 // Neck behind jaw.
 rounded(g,-9,-83,18,20,5,shade(skin,-.13),ink,1.6);
 const hw=profile?16:quarter?18:20;
 curve(g,c=>{c.moveTo(-hw,-106);c.quadraticCurveTo(-hw-4,-122,1,-123);
   c.quadraticCurveTo(hw+6,-121,hw+1,-103);c.lineTo(hw-3,-83);
   c.quadraticCurveTo(8,-70,-4,-75);c.quadraticCurveTo(-hw-4,-83,-hw,-106)},
   gradient(g,-hw,-117,hw,-81,shade(skin,.18),shade(skin,-.17)),ink,1.8);
 if(back){
  curve(g,c=>{c.moveTo(-hw-2,-104);c.quadraticCurveTo(-hw-5,-125,0,-127);
    c.quadraticCurveTo(hw+7,-128,hw+3,-103);c.lineTo(hw,-89);
    c.quadraticCurveTo(8,-83,2,-79);c.quadraticCurveTo(-7,-87,-hw,-80);c.closePath()},
    gradient(g,-hw,-122,hw,-90,shade(hair,.22),shade(hair,-.27)),ink,1.5);
  stroke(g,[[-11,-105],[1,-103],[14,-105]],shade(hair,.27),1.2);
  return;
 }
 if(profile){
  // Genuine nose, forehead, lips and chin silhouette from the side.
  curve(g,c=>{c.moveTo(14,-111);c.lineTo(19,-101);c.lineTo(24,-96);
    c.quadraticCurveTo(26,-92,19,-91);c.quadraticCurveTo(23,-88,18,-86);
    c.quadraticCurveTo(19,-79,9,-76);c.lineTo(3,-80)},
    shade(skin,.04),ink,1.8);
  oval(g,-15,-98,5,8,shade(skin,-.05),ink,1.3);
  oval(g,-13,-98,2,3,shade(skin,-.2));
  stroke(g,[[10,-105],[16,-106]],shade(hair,-.16),1.6);
  oval(g,14,-102,2.2,1.8,shade(p.ink,-.4));
  stroke(g,[[14,-88],[19,-87]],shade(skin,-.39),1.2);
 }else{
  // Symmetric front landmarks, subtle perspective on a quarter turn.
  const offset=quarter?2:0;
  for(const sign of [-1,1]){
    const x=sign*(quarter?7:9)+offset;
    stroke(g,[[x-3,-106],[x+3,-106]],shade(hair,-.14),1.5);
    oval(g,x,-103,2.1,1.7,shade(p.ink,-.4));
  }
  stroke(g,[[1+offset,-100],[2+offset,-94],[5+offset,-92]],shade(skin,-.23),1.2);
  stroke(g,[[-3+offset,-84],[4+offset,-84]],shade(skin,-.36),1.3);
  if(p.beard){stroke(g,[[-10,-83],[0,-78],[10,-83]],shade(hair,-.12),3.3);}
 }
 // Hair framing, with different front and profile hair masses.
 curve(g,c=>{c.moveTo(-hw-2,-102);c.quadraticCurveTo(-hw-3,-126,1,-128);
   c.quadraticCurveTo(hw+5,-125,hw+2,-109);c.lineTo(hw-1,-107);
   c.quadraticCurveTo(hw-9,-115,5,-115);c.lineTo(-8,-110);c.lineTo(-hw+3,-101)},
   gradient(g,-20,-126,22,-103,shade(hair,.24),shade(hair,-.20)),ink,1.7);
 stroke(g,[[-8,-122],[3,-121],[12,-118]],shade(hair,.26),1.1);
}
function headAnimal(g,p,side){
 // Reuse species-specific facial landmarks, but only after choosing true camera
 // orientation. The body geometry is independently drawn above.
 g.save();g.translate(0,-93);g.scale(.58,.58);
 root.SpriteForgeFaceV4.draw(g,p,side==="profile"||side==="quarter",side==="back",{action:"idle",index:0,total:8});
 g.restore();
}
function accessory(g,p,side,poseData){
 const ink=shade(p.ink,-.25),f=poseData.feet?.right||{x:20,y:88};
 if(!p.weapon)return;
 // Character holds a stylized weapon near the near hand. The hand and blade
 // rotate as one group during attack so the prop never floats separately.
 const attack=poseData.type==="attack";
 const x=side==="profile"?24:side==="quarter"?38:48;
 const y=-1+(attack?-14:0);
 g.save();g.translate(x,y);g.rotate(attack?(poseData.attackAngle||0)*.52:0);
 const wood="#785c41",metal="#d9e3e6";
 if(p.weapon==="sword"||p.weapon==="axe"){
   stroke(g,[[0,12],[3,-44]],wood,5);
   if(p.weapon==="sword")poly(g,[[-3,-43],[4,-77],[10,-43]],metal,ink,1.8);
   else poly(g,[[2,-48],[21,-55],[21,-30],[3,-32]],metal,ink,1.8);
   stroke(g,[[-7,-42],[13,-42]],"#caa970",4);
 }else if(p.weapon==="slingshot"){
   stroke(g,[[0,13],[3,-26]],wood,6);stroke(g,[[3,-26],[-7,-43]],wood,5);
   stroke(g,[[3,-26],[16,-42]],wood,5);stroke(g,[[-7,-43],[16,-42]],"#e1c7a4",1.6);
 }else if(p.weapon==="staff"){
   stroke(g,[[0,11],[5,-62]],wood,5);oval(g,5,-66,6,8,p.accent,ink,1.5);
 }else if(p.weapon==="gun"){
   rounded(g,-1,-24,30,11,2,"#667380",ink,1.8);rounded(g,4,-14,7,13,2,wood,ink,1.2);
 }else if(p.weapon==="bow"||p.weapon==="crossbow"){
   stroke(g,[[3,14],[5,-45]],wood,4);curve(g,c=>{c.moveTo(1,-49);c.quadraticCurveTo(35,-21,4,4)},null,wood,3);
   stroke(g,[[1,-49],[4,4]],"#eadbba",1.3);
 }else if(p.weapon==="shield"){oval(g,6,-22,19,24,shade(p.coat,.26),ink,3)}
 g.restore();
}
function render(p,action,index,total,d,style,size,view="side",mode="right"){
 if(view==="top"){
  // True bird's-eye renderer from V3 already has a separate silhouette.
  return previous.render(p,action,index,total,d,style,size,view);
 }
 const cam=direction(view,d,mode),poseData=pose(action,index,total),
 mirror=d==="left"||d==="nw"||d==="sw";
 const animal=animalKinds.has(p.kind),w=wardrobe(p),ink=shade(p.ink,-.28);
 const out=document.createElement("canvas");out.width=260;out.height=260;
 const g=out.getContext("2d");g.imageSmoothingEnabled=true;g.imageSmoothingQuality="high";
 g.translate(130,135);
 const sz=p.giant?1.09:p.small?.91:1;g.scale(sz,sz);
 if(mirror&&cam!=="back"&&cam!=="front")g.scale(-1,1);
 // Sprite baseline remains fixed; grounded feet use the same y=88 in all views.
 g.translate(0,poseData.bob||0);
 if(poseData.type==="death"){g.translate(0,(poseData.crouch||0));g.rotate((poseData.lean||0)*.7)}
 const front=cam==="front",back=cam==="back",profile=cam==="profile",quarter=cam==="quarter";
 drawTail(g,p,cam);
 // Farthest leg first, nearest leg second, opposite hips for profile.
 leg(g,p,cam,poseData,"left",w);
 leg(g,p,cam,poseData,"right",w);
 if(animal&&p.wings){
  poly(g,[[-23,-41],[-74,-85],[-49,-14]],shade(p.coat,.17),ink,2.3);
  poly(g,[[23,-41],[74,-82],[49,-14]],shade(p.coat,.10),ink,2.3);
 }
 // Far arm, then jacket, head and near arm: correct occlusion by camera.
 if(profile){
  limb(g,-9,-50,2+poseData.arm*.32,4,13,shade(w.jacket,-.19),ink);
  oval(g,2+poseData.arm*.32,5,6,10,p.main,ink,1.5);
 }else{
  const x=quarter?-25:-31;
  limb(g,x,-49,x-9+poseData.arm*.3,4,16,shade(w.jacket,-.07),ink);
  oval(g,x-9+poseData.arm*.3,7,6.5,11,p.main,ink,1.4);
 }
 jacket(g,p,cam,w);
 // Profile hair and nose must occlude the neck but cannot cover the torso.
 if(animal)headAnimal(g,p,cam);
 else headHuman(g,p,cam,w);
 if(profile){
  // Only ONE near sleeve and near hand clearly visible in profile.
  const wrist=14+(poseData.type==="run"?-(poseData.arm||0)*.35:0)+(poseData.type==="attack"?poseData.attackReach*.30:0);
  limb(g,10,-54,wrist+1,2,15,gradient(g,5,-58,25,17,shade(w.jacket,.18),shade(w.jacket,-.18)),ink);
  oval(g,wrist+2,8,7,10,shade(p.main,.04),ink,1.4);
 }else{
  const x=quarter?25:31,shift=(poseData.arm||0)*.4;
  limb(g,x,-51,x+10-shift,4,16,gradient(g,x-9,-50,x+16,16,shade(w.jacket,.20),shade(w.jacket,-.20)),ink);
  oval(g,x+10-shift,8,7,11,shade(p.main,.05),ink,1.4);
 }
 if(p.scarf){
  const width=profile?12:31;
  stroke(g,[[-width,-64],[width,-64]],shade(p.scarf,-.16),5);
  if(!back)poly(g,[[8,-61],[17,-57],[22,-37],[15,-40]],p.scarf,ink,1.5);
 }
 if(p.cape){
  if(back)stroke(g,[[-34,-57],[-43,12],[43,13],[33,-56]],shade(p.coat,-.22),4);
  else stroke(g,[[-23,-49],[-37,11]],shade(p.coat,-.22),4);
 }
 accessory(g,p,cam,poseData);
 const final=document.createElement("canvas");final.width=size;final.height=size;
 const fc=final.getContext("2d");
 const pix=["16bit","retro","cozy","dark","cute"].includes(style);
 if(pix){
  const n=Math.min(size,style==="retro"?44:style==="16bit"?72:90),small=document.createElement("canvas");small.width=n;small.height=n;
  const sc=small.getContext("2d");sc.imageSmoothingEnabled=true;sc.drawImage(out,0,0,n,n);
  fc.imageSmoothingEnabled=false;fc.drawImage(small,0,0,size,size);
 }else{fc.imageSmoothingEnabled=true;fc.imageSmoothingQuality="high";fc.drawImage(out,0,0,size,size)}
 return final;
}
const previous=root.SpriteForgeIllustrator;
root.SpriteForgeTurnaroundV5={render,direction,version:"5.0.0"};
root.SpriteForgeIllustrator={render,version:"5.0.0"};
})(window);
