/* SpriteForge Face Studio V4 — deliberate landmark-based facial construction.
 * Geometry is procedural and original, not copied from SpriteGen.
 * Eye, nose, mouth and ear landmarks use one consistent head pose per frame.
 */
(function(root){"use strict";
const TWO=Math.PI*2;
function color(c,n){const s=c.replace("#","");const x=[0,2,4].map(j=>parseInt(s.slice(j,j+2),16));return "#"+x.map(v=>Math.round(Math.max(0,Math.min(255,v+(n>=0?(255-v)*n:v*n)))).toString(16).padStart(2,"0")).join("")}
function mix(a,b,t){const x=[0,2,4].map(i=>Math.round(parseInt(a.slice(1+i,3+i),16)*(1-t)+parseInt(b.slice(1+i,3+i),16)*t));return "#"+x.map(v=>v.toString(16).padStart(2,"0")).join("")}
function grad(g,x,y,X,Y,a,b){const p=g.createLinearGradient(x,y,X,Y);p.addColorStop(0,a);p.addColorStop(1,b);return p}
function shape(g,cb,fill,stroke=null,width=2.5){g.beginPath();cb(g);g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.lineJoin="round";g.lineCap="round";g.stroke()}}
function curve(g,coords,col,width=2){g.beginPath();g.moveTo(coords[0][0],coords[0][1]);for(let i=1;i<coords.length;i++)g.lineTo(coords[i][0],coords[i][1]);g.lineJoin="round";g.lineCap="round";g.lineWidth=width;g.strokeStyle=col;g.stroke()}
function oval(g,x,y,rx,ry,c,outline=null,w=2,rot=0){g.beginPath();g.ellipse(x,y,rx,ry,rot,0,TWO);g.fillStyle=c;g.fill();if(outline){g.strokeStyle=outline;g.lineWidth=w;g.stroke()}}
function round(g,x,y,w,h,r,fill,stroke){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();if(stroke){g.lineWidth=2;g.strokeStyle=stroke;g.stroke()}}
function eye(g,x,y,size,look,expression,blink,ink,iris){
if(blink){curve(g,[[x-size*.8,y],[x,y+1],[x+size*.8,y]],ink,2.4);return}
const ry=size*.93*(expression==="angry"?.75:1);
oval(g,x,y,size*.72,ry,"#fff9ed",ink,2.2);
oval(g,x+look*size*.23,y+.3,size*.37,ry*.68,iris);
oval(g,x+look*size*.23-1.3,y-ry*.34,1.7,2.2,"white");
oval(g,x+look*size*.23+1,y+ry*.36,1,1,"#edf1ed");
}
function ear(g,p,x,y,w,h,lean=0,inside="#efb6ad"){
const main=p.main,ink=color(p.ink,-.12);
shape(g,c=>{c.moveTo(x-w*.6,y+3);c.quadraticCurveTo(x-w*1.1+lean,y-h*.55,x+lean,y-h);c.quadraticCurveTo(x+w*.4+lean,y-h*.86,x+w*.8,y+5);c.closePath()},grad(g,x-w,y-h,x+w,y+6,color(main,.2),color(main,-.18)),ink,2.9);
shape(g,c=>{c.moveTo(x-w*.3,y-5);c.quadraticCurveTo(x-w*.32+lean,y-h*.63,x+lean,y-h*.73);c.lineTo(x+w*.26,y-9);c.closePath()},mix(inside,p.light,.33),null);
}
function facialMood(p,meta){
const expr=p.design?.expression||"neutral";
const type=root.SpriteForgePoseV4?.actionType(meta?.action||"idle")||"idle";
const phase=meta?.phase||0;
return {expr:type==="hurt"?"hurt":type==="death"?"hurt":expr,blink:type==="idle"&&Math.floor((meta?.index||0)*8/Math.max(meta?.total||8,1))===5,
 open:type==="attack"||type==="cast",side:meta?.side,phase}
}
function animal(g,p,side,back,meta){
const k=p.kind,ink=color(p.ink,-.18),fur=p.main,light=p.light,mood=facialMood(p,meta),pix=p.seed%3;
const pointy=["fox","wolf","cat","squirrel","dragon"].includes(k);
const roundish=["bear","mouse"].includes(k);
const earSmall=["fox","wolf","cat","dragon","squirrel"].includes(k);
if(k==="rabbit"){
 ear(g,p,-19,-29,9,67,-8,"#e9a5a6");ear(g,p,17,-31,9,65,5,"#e9a5a6");
}else if(roundish){
 oval(g,-25,-30,k==="mouse"?16:13,k==="mouse"?18:14,fur,ink,2.8);
 oval(g,23,-30,k==="mouse"?16:13,k==="mouse"?18:14,fur,ink,2.8);
 oval(g,-25,-30,7,8,mix(light,"#eeb3b0",.45));oval(g,23,-30,7,8,mix(light,"#eeb3b0",.45));
}else if(k==="dog"){
 ear(g,p,-26,-25,15,29,-12,"#bd8c7a");
 ear(g,p,26,-27,14,28,6,"#bd8c7a");
}else if(pointy){
 const h=k==="wolf"?45:k==="dragon"?43:k==="cat"?39:38;
 ear(g,p,-23,-30,k==="dragon"?11:15,h,-4);
 ear(g,p,24,-29,13,h,k==="dragon"?8:4);
}else if(k==="frog"){
 oval(g,-27,-26,13,14,grad(g,-35,-40,-18,-11,color(fur,.3),fur),ink,2.6);
 oval(g,25,-26,13,14,grad(g,15,-40,35,-11,color(fur,.3),fur),ink,2.6);
}
if(k==="dragon"){
 for(let i=-1;i<=1;i++)shape(g,c=>{const x=i*15;c.moveTo(x-7,-34);c.lineTo(x-2,-46);c.lineTo(x+8,-34)},color(light,-.12),ink,1.6);
}
if(k==="bird"){
 shape(g,c=>{c.moveTo(-16,-37);c.lineTo(-12,-51);c.lineTo(1,-39)},p.accent,ink,2);
}
const w=k==="frog"?38:k==="bird"?29:k==="bear"?34:k==="rabbit"?31:k==="mouse"?29:k==="wolf"?32:30;
const h=k==="frog"?25:k==="bird"?32:k==="fox"?27:k==="wolf"?28:30;
shape(g,c=>{
 c.moveTo(-w*.84,-h*.75-7);
 c.bezierCurveTo(-w*.39,-h-16,w*.37,-h-17,w*.79,-h*.68-7);
 c.bezierCurveTo(w+8,-h*.08,w+5,h*.68,w*.4,h*.88);
 c.quadraticCurveTo(0,h+8,-w*.55,h*.78);
 c.bezierCurveTo(-w-9,h*.43,-w-5,-h*.32,-w*.84,-h*.75-7)
},grad(g,-w,-h-16,w,h,color(fur,.32),color(fur,-.19)),ink,3.2);
if(back){shape(g,c=>{c.moveTo(-17,-24);c.quadraticCurveTo(0,-36,19,-24);c.lineTo(14,-2);c.quadraticCurveTo(0,-9,-14,-3)},color(fur,-.13));return}
if(k==="bird"){
 shape(g,c=>{c.moveTo(4,1);c.lineTo(42,9);c.quadraticCurveTo(16,19,6,15)},grad(g,7,3,40,15,color(p.accent,.25),color(p.accent,-.22)),ink,2.7);
 eye(g,side?16:12,-13,7,.3,mood.expr,mood.blink,ink,p.eye);
 if(!side)eye(g,-13,-13,7,0,mood.expr,mood.blink,ink,p.eye);
 return
}
if(k==="frog"){
 if(!side){eye(g,-24,-27,7,0,mood.expr,mood.blink,ink,p.eye);eye(g,24,-27,7,0,mood.expr,mood.blink,ink,p.eye)}
 else eye(g,22,-24,7,.2,mood.expr,mood.blink,ink,p.eye);
 curve(g,[[-18,11],[-4,14],[14,11]],ink,2.5);return
}
if(side){
 // Natural short side-facing eye and a cheek/muzzle that belongs to the head.
 const eyeX=13, eyeY=-13;
 if(["fox","wolf","dog","squirrel","dragon"].includes(k)){
  shape(g,c=>{c.moveTo(5,1);c.quadraticCurveTo(25,-3,44,6);
    c.quadraticCurveTo(53,10,48,15);c.quadraticCurveTo(29,25,10,19);c.lineTo(1,10);c.closePath()},
    grad(g,6,1,46,19,color(light,.07),color(light,-.12)),ink,2.5);
  oval(g,46,9,4.3,3.2,ink);oval(g,44,7.5,1.5,1.1,"white");
  curve(g,[[21,18],[30,20],[36,18]],color(ink,.15),1.5);
 }else{
  oval(g,17,12,15,10,light,ink,1.8);
  oval(g,29,10,4,2.8,ink);
  curve(g,[[22,16],[26,19],[31,17]],ink,1.6);
 }
 eye(g,eyeX,eyeY,k==="rabbit"?7.1:k==="fox"?7.5:7,.55,mood.expr,mood.blink,ink,p.eye);
 // Eyelid and eyebrow expression stay attached to one stable facial landmark.
 if(mood.expr==="angry")curve(g,[[4,-26],[20,-23]],ink,2.8);
 else if(mood.expr==="sleepy")curve(g,[[6,-21],[18,-19]],color(ink,.2),1.9);
 else curve(g,[[6,-24],[16,-25],[21,-22]],color(fur,-.34),1.6);
 if(mood.open){oval(g,30,20,4,4.2,color(ink,.05),ink,1.2);oval(g,29,22,2,1.2,"#d66f79")}
 else if(mood.expr==="smile")curve(g,[[21,17],[29,22],[37,18]],ink,2.2);
 // Nose bridge tint and cheek volume avoid a flat sticker-like mask.
 oval(g,-12,5,7,4.1,color(fur,.12));
 if(p.freckles)for(const dx of [0,5,10])oval(g,-7+dx,9+dx%3,1.2,1.3,color(fur,-.34));
 if(k==="cat"||k==="mouse"){
 for(const o of [-4,1,6]){curve(g,[[25,13+o],[47,8+o*2]],ink,1.1)}
 }
}else{
 // Front-facing skull: use symmetric eyes and low cheek patches, not googly eyes.
 shape(g,c=>{c.moveTo(-22,4);c.quadraticCurveTo(-29,17,-12,24);c.quadraticCurveTo(0,30,13,24);c.quadraticCurveTo(27,19,22,4);c.closePath()},light);
 eye(g,-13,-13,6.7,.12,mood.expr,mood.blink,ink,p.eye);
 eye(g,13,-13,6.7,-.12,mood.expr,mood.blink,ink,p.eye);
 shape(g,c=>{c.moveTo(-4,7);c.quadraticCurveTo(0,3,5,7);c.lineTo(1,12);c.closePath()},ink);
 if(mood.open)oval(g,1,17,5,4.5,color(ink,.05));
 else curve(g,[[-5,17],[1,20],[7,17]],ink,1.6);
 if(mood.expr==="angry"){
  curve(g,[[-20,-25],[-5,-22]],ink,2.8);curve(g,[[5,-22],[20,-25]],ink,2.8);
 }
 if(k==="cat"||k==="mouse")for(const sg of [-1,1])for(const j of [-1,1]){
  curve(g,[[sg*12,12+j*4],[sg*32,11+j*7]],ink,1.3)
 }
}
}
function humanoid(g,p,side,back,meta){
 const k=p.kind,ink=color(p.ink,-.19),mood=facialMood(p,meta),F=p.main,L=p.light;
 const skin=F;const metallic=["knight","robot","astronaut"].includes(k);
 if(k==="elf"){
  shape(g,c=>{c.moveTo(-23,-11);c.lineTo(-49,-22);c.lineTo(-21,-27)},F,ink,2.5);
  shape(g,c=>{c.moveTo(23,-11);c.lineTo(49,-22);c.lineTo(21,-27)},F,ink,2.5);
 }
 shape(g,c=>{c.moveTo(-21,-29);c.bezierCurveTo(-7,-43,18,-41,26,-24);
  c.quadraticCurveTo(34,-5,22,18);c.quadraticCurveTo(6,32,-16,22);
  c.quadraticCurveTo(-32,8,-28,-12);c.closePath()},
  grad(g,-20,-37,27,25,color(skin,.17),color(skin,-.17)),ink,3.2);
 if(!back){
  if(side){eye(g,13,-12,6,.35,mood.expr,mood.blink,ink,p.eye);curve(g,[[20,2],[26,5],[24,8]],color(ink,.23),1.5)}
  else{eye(g,-12,-12,6,.12,mood.expr,mood.blink,ink,p.eye);eye(g,12,-12,6,-.12,mood.expr,mood.blink,ink,p.eye)}
  if(mood.open)oval(g,3,15,4,5,"#763e4b",ink,1.4);
  else curve(g,[[-5,14],[2,17],[9,14]],ink,1.6);
  if(mood.expr==="angry")curve(g,[[6,-22],[19,-26]],ink,2.2);
  if(p.beard)shape(g,c=>{c.moveTo(-18,9);c.quadraticCurveTo(0,46,19,9);c.quadraticCurveTo(7,30,-17,13)},color(p.ink,.1));
 }else{
  shape(g,c=>{c.moveTo(-24,-25);c.quadraticCurveTo(0,-34,23,-24);c.lineTo(20,4);c.quadraticCurveTo(0,-2,-20,4)},color(skin,-.24));
 }
 if(k==="ninja"){
  shape(g,c=>{c.moveTo(-28,-6);c.quadraticCurveTo(0,-16,30,-6);c.lineTo(20,22);c.quadraticCurveTo(0,28,-19,22)},color(p.coat,-.25),ink,2.3);
 }
 if(k==="pirate"){
  shape(g,c=>{c.moveTo(-37,-22);c.quadraticCurveTo(-28,-54,-8,-52);c.quadraticCurveTo(5,-65,23,-49);c.quadraticCurveTo(37,-42,41,-23);c.quadraticCurveTo(0,-33,-37,-22)},
   grad(g,-30,-55,30,-21,color(p.coat,.09),color(p.coat,-.38)),ink,3);
  curve(g,[[-31,-26],[32,-26]],p.accent,4);
 }
 if(k==="wizard"||p.hat){
  shape(g,c=>{c.moveTo(-37,-31);c.quadraticCurveTo(-12,-70,0,-93);c.quadraticCurveTo(12,-78,27,-31);c.quadraticCurveTo(2,-24,-37,-31)},
    grad(g,-35,-87,30,-28,color(p.coat,.24),color(p.coat,-.22)),ink,3);
  curve(g,[[-33,-31],[31,-31]],p.accent,5);
 }
 if(k==="knight"){
  shape(g,c=>{c.moveTo(-30,-22);c.quadraticCurveTo(-32,-54,0,-61);c.quadraticCurveTo(36,-54,34,-21);c.lineTo(30,20);c.quadraticCurveTo(0,30,-29,17)},
    grad(g,-27,-55,30,25,color(L,.25),color(p.coat,-.19)),ink,3);
  round(g,-25,-26,50,15,4,"#283a47",ink);
  curve(g,[[0,-25],[0,-12]],"#bdd4d9",3);
 }
 if(k==="astronaut"){
  oval(g,0,-8,34,38,"#dce9f1",ink,3.2);
  round(g,-28,-26,56,33,15,grad(g,-25,-23,24,7,"#8ecadd","#325b7e"),ink);
  oval(g,-10,-17,8,4,"#e5faff88");
 }
 if(p.glasses&&!metallic){for(const x of [-12,12]){oval(g,x,-11,10,9,"#c0e2e777",ink,2)}curve(g,[[-2,-12],[3,-12]],ink,2)}
}
function draw(g,p,side,back,meta={}){
 g.save();
 const kind=p.kind;
 if(["fox","wolf","cat","dog","rabbit","bear","squirrel","mouse","dragon","frog","bird"].includes(kind))animal(g,p,side,back,meta);
 else if(kind==="robot"){
  const ink=color(p.ink,-.2),F=p.main;
  shape(g,c=>{c.moveTo(-31,-34);c.quadraticCurveTo(-30,-43,-19,-44);c.lineTo(23,-44);c.quadraticCurveTo(34,-42,35,-32);c.lineTo(35,18);c.quadraticCurveTo(28,31,13,31);c.lineTo(-19,31);c.quadraticCurveTo(-34,27,-34,14)},
   grad(g,-32,-44,37,30,color(F,.25),color(F,-.22)),ink,3);
  round(g,-28,-24,56,30,9,"#314c61",ink);
  if(!back){for(const x of [-13,13]){oval(g,x,-10,7,4,"#79f9ef");oval(g,x-2,-12,1.4,1.3,"white")}
   round(g,-13,14,26,6,3,"#e8e9df",ink)}
  curve(g,[[0,-45],[0,-55]],ink,3);oval(g,0,-57,4,4,p.accent,ink,1);
 }else if(kind==="skeleton"){
   const ink=color(p.ink,-.2),F=p.main;
   oval(g,0,-9,29,35,grad(g,-29,-41,24,27,color(F,.25),color(F,-.1)),ink,3.1);
   if(!back){oval(g,-12,-12,7,10,ink);oval(g,12,-12,7,10,ink);shape(g,c=>{c.moveTo(-4,8);c.lineTo(4,8);c.lineTo(0,15)},ink);for(let i=-2;i<=2;i++)round(g,i*6-1,20,3,9,1,ink)}
 }else if(kind==="slime"){
   const ink=color(p.ink,-.2),F=p.main;
   shape(g,c=>{c.moveTo(-32,14);c.bezierCurveTo(-43,-13,-23,-43,4,-41);c.bezierCurveTo(35,-42,43,-15,33,18);c.quadraticCurveTo(0,36,-32,14)},grad(g,-30,-40,37,24,color(F,.4),color(F,-.2)),ink,3);
   if(!back){eye(g,-13,-7,6,0,"smile",false,ink,p.eye);eye(g,13,-7,6,0,"smile",false,ink,p.eye);curve(g,[[-8,13],[0,16],[8,13]],ink,2)}
 }else humanoid(g,p,side,back,meta);
 g.restore();
}
root.SpriteForgeFaceV4={draw,version:"4.0.0"};
})(window);
