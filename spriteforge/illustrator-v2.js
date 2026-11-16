/* SpriteForge Illustration Engine v2
 * Original canvas vector character renderer; works fully offline without GPU.
 * Stylized game character art: individually redrawn parts, light/shadow,
 * expressive species-specific heads, layered costume, and attached equipment.
 */
(function(root) {
"use strict";
const PI=Math.PI, TAU=2*PI;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const E=(t)=>t*t*(3-2*t);
function tint(hex,amt){const h=hex.replace("#","");const a=[0,2,4].map(n=>parseInt(h.slice(n,n+2),16));return "#"+a.map(n=>Math.round(clamp(n/255+(amt>0?(1-n/255)*amt:(n/255)*amt))*255).toString(16).padStart(2,"0")).join("")}
function mix(a,b,t){const x=[0,2,4].map(i=>Math.round(parseInt(a.slice(i+1,i+3),16)*(1-t)+parseInt(b.slice(i+1,i+3),16)*t));return "#"+x.map(i=>i.toString(16).padStart(2,"0")).join("")}
function grad(g,x1,y1,x2,y2,a,b){const v=g.createLinearGradient(x1,y1,x2,y2);v.addColorStop(0,a);v.addColorStop(1,b);return v}
function fill(g,draw,paint,outline="#343244",sw=2.7){g.beginPath();draw(g);g.closePath();g.fillStyle=paint;g.fill();if(outline){g.strokeStyle=outline;g.lineWidth=sw;g.lineJoin="round";g.lineCap="round";g.stroke()}}
function path(g,paint,stroke,fn,sw=2.7){fill(g,fn,paint,stroke,sw)}
function oval(g,x,y,rx,ry,paint,stroke,sw=2.5,rot=0){g.beginPath();g.ellipse(x,y,rx,ry,rot,0,TAU);g.fillStyle=paint;g.fill();if(stroke){g.lineWidth=sw;g.strokeStyle=stroke;g.stroke()}}
function line(g,coords,color,w=2){g.beginPath();g.moveTo(coords[0][0],coords[0][1]);for(let i=1;i<coords.length;i++)g.lineTo(coords[i][0],coords[i][1]);g.strokeStyle=color;g.lineWidth=w;g.lineCap="round";g.lineJoin="round";g.stroke()}
function rounded(g,x,y,w,h,r,paint,stroke,sw=2){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=paint;g.fill();if(stroke){g.lineWidth=sw;g.strokeStyle=stroke;g.stroke()}}
function joint(g,sx,sy,kx,ky,fx,fy,w,material,outline){g.beginPath();g.moveTo(sx,sy);g.quadraticCurveTo(kx,ky,fx,fy);g.strokeStyle=outline;g.lineWidth=w+5;g.lineCap="round";g.stroke();g.strokeStyle=material;g.lineWidth=w;g.stroke()}
function sparkle(g,x,y,r,col){oval(g,x,y,r,r,col);oval(g,x-r/3,y-r/3,r*.35,r*.35,"#ffffff");line(g,[[x-r*1.35,y],[x+r*1.35,y]],col,1);line(g,[[x,y-r*1.35],[x,y+r*1.35]],col,1)}
function bodyStyle(p){const k=p.kind;return ["fox","wolf","cat","dog","rabbit","bear","squirrel","mouse","frog","bird","dragon"].includes(k)?"beast":k}
function has(p,name){return !!p[name]}
function head(g,p,side,back){
const k=p.kind,ink=tint(p.ink,-.2),F=p.main,L=p.light,shadow=tint(F,-.2),bright=tint(F,.25), accent=p.accent;
const beast=["fox","wolf","cat","dog","rabbit","bear","squirrel","mouse","dragon"].includes(k);
if(k==="slime"){
path(g,grad(g,-28,-32,28,20,bright,shadow),ink,c=>{c.moveTo(-40,11);c.bezierCurveTo(-46,-30,-27,-49,1,-44);c.bezierCurveTo(32,-44,45,-18,40,17);c.bezierCurveTo(36,29,-32,32,-40,11)});
oval(g,-15,-24,11,5,"#ffffff55");if(!back){oval(g,-15,-8,5,8,ink);oval(g,14,-8,5,8,ink);oval(g,-17,-11,2,3,"#fff");oval(g,12,-11,2,3,"#fff");line(g,[[-8,12],[-1,15],[10,11]],ink,2.2)}return
}
if(k==="robot"){
path(g,grad(g,-30,-46,30,25,tint(F,.23),shadow),ink,c=>{c.moveTo(-32,-26);c.quadraticCurveTo(-33,-40,-15,-41);c.lineTo(22,-41);c.quadraticCurveTo(36,-41,35,-28);c.lineTo(33,14);c.quadraticCurveTo(30,28,14,30);c.lineTo(-16,30);c.quadraticCurveTo(-33,28,-34,13);c.closePath()},3.2);
rounded(g,-28,-28,56,30,9,"#2b4557",ink,2.4);
if(!back){oval(g,-13,-12,8,5,"#67fff4");oval(g,14,-12,8,5,"#67fff4");rounded(g,-16,13,32,6,3,"#e0f1f5",ink,1.5)}
line(g,[[0,-42],[0,-54]],ink,4);sparkle(g,0,-57,4,p.accent);
rounded(g,-29,1,7,18,4,tint(F,.4));return
}
if(k==="skeleton"){
path(g,grad(g,-25,-40,25,24,tint(F,.18),tint(F,-.1)),ink,c=>{c.moveTo(0,-42);c.bezierCurveTo(32,-45,37,-25,33,-2);c.quadraticCurveTo(35,20,18,24);c.lineTo(15,32);c.lineTo(-14,32);c.lineTo(-17,23);c.quadraticCurveTo(-38,20,-34,-6);c.quadraticCurveTo(-36,-42,0,-42)});
if(!back){oval(g,-15,-10,10,13,"#35313b");oval(g,13,-10,10,13,"#35313b");path(g,"#35313b",null,c=>{c.moveTo(-5,10);c.lineTo(5,10);c.lineTo(1,17)});for(let i=-2;i<=2;i++)rounded(g,i*6-2,21,3,9,1,ink)}
return
}
if(k==="frog"){
oval(g,-27,-28,14,13,grad(g,-38,-42,-18,-15,bright,shadow),ink);
oval(g,27,-28,14,13,grad(g,15,-42,38,-12,bright,shadow),ink);
oval(g,0,-4,42,32,grad(g,-28,-32,22,30,bright,F),ink,3.1);
if(!back){oval(g,-26,-31,6,8,"#f9f3d1",ink);oval(g,25,-31,6,8,"#f9f3d1",ink);oval(g,-25,-32,3,5,ink);oval(g,25,-32,3,5,ink);line(g,[[-17,15],[-7,19],[14,17],[21,12]],ink,2.4)}
return
}
if(k==="bird"){
path(g,grad(g,-35,-35,24,27,bright,shadow),ink,c=>{c.moveTo(-25,-33);c.bezierCurveTo(-40,-5,-39,19,-13,29);c.bezierCurveTo(16,35,36,9,33,-10);c.bezierCurveTo(30,-35,5,-44,-25,-33)},3);
path(g,accent,ink,c=>{c.moveTo(-11,-38);c.quadraticCurveTo(-10,-55,0,-56);c.quadraticCurveTo(10,-50,8,-38)},2.2);
if(!back){oval(g,12,-10,7,10,"#fff8e9");oval(g,14,-9,4,7,ink);oval(g,12,-12,2,2,"white");
path(g,grad(g,7,-3,37,12,tint(accent,.3),tint(accent,-.2)),ink,c=>{c.moveTo(8,-4);c.lineTo(39,3);c.lineTo(12,14);c.closePath()})}
return
}
if(beast){
const foxlike=["fox","wolf","squirrel"].includes(k);
const longEar=["fox","wolf","cat","rabbit","squirrel","dragon"].includes(k);
const smallRound=["bear","mouse"].includes(k);
if(k==="rabbit"){
g.save();g.rotate(-.12);path(g,grad(g,-27,-99,-14,-25,bright,F),ink,c=>{c.moveTo(-29,-28);c.bezierCurveTo(-40,-76,-35,-103,-19,-104);c.bezierCurveTo(-6,-98,-16,-52,-12,-29)},3.3);
path(g,mix(L,"#e7a5a1",.4),null,c=>{c.moveTo(-25,-39);c.bezierCurveTo(-28,-69,-27,-88,-20,-92);c.bezierCurveTo(-13,-78,-21,-54,-17,-38)});
g.restore();path(g,grad(g,14,-100,28,-28,bright,F),ink,c=>{c.moveTo(9,-29);c.bezierCurveTo(9,-63,15,-102,27,-100);c.bezierCurveTo(43,-96,25,-53,30,-27)},3.3);
path(g,mix(L,"#e7a5a1",.4),null,c=>{c.moveTo(17,-41);c.bezierCurveTo(17,-65,22,-86,26,-86);c.lineTo(22,-39)});
}else if(smallRound){
oval(g,-29,-29,k==="mouse"?18:17,k==="mouse"?20:17,F,ink,3);oval(g,27,-29,k==="mouse"?18:17,k==="mouse"?20:17,F,ink,3);
oval(g,-29,-29,10,11,mix(L,"#ef9b9d",.3));oval(g,27,-29,10,11,mix(L,"#ef9b9d",.3));
}else if(longEar){
if(k==="dragon"){
path(g,grad(g,-37,-79,-15,-28,tint(L,.12),tint(F,-.08)),ink,c=>{c.moveTo(-30,-20);c.quadraticCurveTo(-38,-39,-37,-54);c.lineTo(-45,-68);c.quadraticCurveTo(-23,-66,-12,-28)},3.1);
path(g,grad(g,14,-88,41,-20,tint(L,.25),tint(F,-.18)),ink,c=>{c.moveTo(11,-25);c.quadraticCurveTo(12,-54,29,-83);c.quadraticCurveTo(36,-54,37,-21)},3);
for(const x of [-19,1,19]){path(g,tint(L,.16),ink,c=>{c.moveTo(x-7,-35);c.lineTo(x,-47);c.lineTo(x+7,-33)},1.7)}
}else if(k==="cat"){
path(g,grad(g,-38,-72,-12,-27,bright,shadow),ink,c=>{c.moveTo(-31,-17);c.lineTo(-40,-66);c.quadraticCurveTo(-23,-67,-10,-32);c.closePath()},3.2);
path(g,mix(L,"#ec9f9f",.45),null,c=>{c.moveTo(-32,-35);c.lineTo(-35,-57);c.lineTo(-20,-36)});
path(g,grad(g,14,-68,38,-22,bright,shadow),ink,c=>{c.moveTo(10,-24);c.lineTo(28,-66);c.quadraticCurveTo(42,-61,38,-20);c.closePath()},3.1);
path(g,mix(L,"#ec9f9f",.45),null,c=>{c.moveTo(20,-36);c.lineTo(29,-57);c.lineTo(33,-36)});
}else{
const high=k==="wolf"?-78:-73;
path(g,grad(g,-41,high,-8,-22,bright,shadow),ink,c=>{c.moveTo(-31,-22);c.lineTo(-42,-49);c.lineTo(-36,high);c.quadraticCurveTo(-22,high+2,-9,-30);c.closePath()},3.2);
path(g,mix(L,"#dc8984",.42),null,c=>{c.moveTo(-32,-37);c.lineTo(-35,high+13);c.quadraticCurveTo(-26,high+18,-20,-34)});
path(g,grad(g,10,high,40,-21,bright,shadow),ink,c=>{c.moveTo(8,-24);c.lineTo(23,high);c.quadraticCurveTo(38,high+2,39,-22);c.closePath()},3.1);
path(g,mix(L,"#dc8984",.42),null,c=>{c.moveTo(21,-36);c.lineTo(25,high+14);c.quadraticCurveTo(32,high+13,33,-34)});
}
}
if(k==="dog"){path(g,grad(g,-41,-42,-18,5,shadow,F),ink,c=>{c.moveTo(-25,-36);c.bezierCurveTo(-56,-42,-59,-5,-44,8);c.quadraticCurveTo(-30,6,-24,-14)},2.7)}
path(g,grad(g,-36,-35,36,28,bright,shadow),ink,c=>{
c.moveTo(-28,-28);c.bezierCurveTo(-12,-47,15,-43,29,-22);
c.bezierCurveTo(40,-6,38,14,21,25);c.quadraticCurveTo(9,33,-11,25);
c.bezierCurveTo(-26,21,-41,5,-35,-15);c.quadraticCurveTo(-34,-24,-28,-28)
},3.5);
if(k==="dragon"){for(const [x,y] of [[-10,-45],[3,-49],[16,-47]])path(g,L,ink,c=>{c.moveTo(x-6,y+9);c.lineTo(x,y-14);c.lineTo(x+10,y+11)},2)}
const cheek=p.kind==="fox"?[[2,8],[23,15],[12,23],[-5,18]]:null;
if(!back){
if(foxlike){
path(g,L,null,c=>{c.moveTo(-17,5);c.bezierCurveTo(-8,21,0,28,17,23);c.quadraticCurveTo(29,19,24,10);c.quadraticCurveTo(4,3,-17,5)});
}else{oval(g,4,15,23,11,L)}
if(side){
const beak=foxlike||k==="dog"||k==="dragon";
if(beak){
path(g,grad(g,10,-1,56,24,tint(L,.05),tint(L,-.13)),ink,c=>{
c.moveTo(5,-1);c.bezierCurveTo(25,1,32,0,50,13);c.quadraticCurveTo(57,17,47,22);c.bezierCurveTo(22,27,10,22,2,17);c.closePath()},2.6);
oval(g,47,15,6,4,ink);oval(g,46,13,2,1,"#fff");
}else{
oval(g,24,14,13,10,L,ink,1.9);oval(g,33,11,4,3,ink)
}
oval(g,14,-13,10,13,"#fff8e9",ink,2.4);oval(g,18,-13,5.3,9,p.eye);
oval(g,19,-18,2.6,4,"white");line(g,[[5,-29],[17,-30],[23,-27]],tint(F,-.35),2.8);
if(p.freckles){for(const n of [0,1,2])oval(g,5+n*5,8+n%2,1.5,1.3,tint(F,-.35))}
}else{
oval(g,-13,-11,9,12,"#fff8e9",ink,2.3);oval(g,14,-11,9,12,"#fff8e9",ink,2.3);
oval(g,-10,-11,4.5,7,p.eye);oval(g,16,-11,4.5,7,p.eye);
oval(g,-11,-15,2,3,"white");oval(g,15,-15,2,3,"white");
path(g,L,ink,c=>{c.moveTo(-15,6);c.quadraticCurveTo(0,1,19,6);c.quadraticCurveTo(25,19,4,24);c.quadraticCurveTo(-12,22,-15,6)},1.9);
oval(g,4,10,5,4,ink);
if(k==="cat")for(const sg of [-1,1]){line(g,[[4+sg*5,14],[sg*38,9]],ink,1.9);line(g,[[4+sg*5,19],[sg*36,21]],ink,1.8)}
}
}else{
path(g,tint(F,-.10),null,c=>{c.moveTo(-23,-15);c.quadraticCurveTo(0,-32,21,-17);c.quadraticCurveTo(0,9,-23,-15)});
for(const x of [-16,-6,6,16])line(g,[[x,-20],[x+3,-6]],tint(F,-.24),2)
}
return
}
const humanoid=["wizard","human","elf","pirate","ninja","knight","astronaut","zombie"].includes(k),helmet=["knight","astronaut"].includes(k);
const skin=F;
if(k==="elf"){path(g,skin,ink,c=>{c.moveTo(-23,-6);c.lineTo(-50,-22);c.lineTo(-22,-26)});path(g,skin,ink,c=>{c.moveTo(22,-6);c.lineTo(49,-22);c.lineTo(23,-26)})}
path(g,grad(g,-24,-34,25,24,tint(skin,.16),tint(skin,-.14)),ink,c=>{c.moveTo(-25,-26);c.bezierCurveTo(-24,-43,21,-46,30,-23);c.quadraticCurveTo(34,-4,24,19);c.quadraticCurveTo(7,37,-15,22);c.quadraticCurveTo(-31,6,-25,-26)},3);
if(k==="zombie"){for(const [x,y] of [[-21,-3],[14,15]])oval(g,x,y,5,3,"#7c886d");line(g,[[-23,11],[-12,14]],"#7e554c",2)}
if(!back){
if(side){oval(g,18,-10,8,11,"#f9f6ed",ink,2);oval(g,21,-8,4,7,ink);oval(g,22,-12,1.8,2,"white")}
else{for(const x of [-12,12]){oval(g,x,-10,7,10,"#f9f6ed",ink,2);oval(g,x+1,-10,3.5,6,p.eye);oval(g,x,-13,1.5,2,"white")}}
line(g,[[1,3],[7,4],[9,7]],tint(F,-.25),2);
line(g,[[-6,14],[0,17],[8,14]],tint(F,-.32),2);
if(p.beard)path(g,tint(F,-.35),ink,c=>{c.moveTo(-22,6);c.quadraticCurveTo(-4,48,13,31);c.quadraticCurveTo(28,9,23,7);c.lineTo(13,22);c.lineTo(-9,20)},2);
}else{path(g,tint(F,-.22),null,c=>{c.moveTo(-23,-19);c.quadraticCurveTo(0,-35,22,-19);c.lineTo(19,3);c.quadraticCurveTo(0,-3,-20,4)})}
if(k==="pirate"){path(g,grad(g,-32,-62,32,-24,"#3b3f56","#252938"),ink,c=>{c.moveTo(-40,-23);c.quadraticCurveTo(-26,-59,-12,-54);c.quadraticCurveTo(3,-70,22,-51);c.quadraticCurveTo(38,-45,42,-25);c.quadraticCurveTo(6,-36,-40,-23)},3);line(g,[[-32,-26],[30,-27]],"#dfb666",5)}
if(k==="ninja"){path(g,"#343646",ink,c=>{c.moveTo(-26,-10);c.quadraticCurveTo(0,-23,30,-10);c.lineTo(21,22);c.quadraticCurveTo(0,31,-19,22)},2);if(!back){for(const x of [-12,14]){oval(g,x,-10,3,5,"#f3f2e5")}}}
if(helmet){
path(g,grad(g,-39,-51,32,18,tint(p.light,.1),tint(p.coat,-.15)),ink,c=>{c.moveTo(-33,-23);c.quadraticCurveTo(-37,-59,0,-63);c.quadraticCurveTo(40,-60,38,-19);c.lineTo(35,19);c.quadraticCurveTo(0,39,-32,20)},3);
if(k==="astronaut"){rounded(g,-28,-32,56,40,16,grad(g,-25,-30,23,25,"#5aa8c9","#285573"),ink,2);oval(g,-13,-22,10,6,"#ffffff44");line(g,[[-8,23],[18,23]],"#6d93a8",3)}
else{rounded(g,-25,-25,50,17,4,"#283745",ink,1.7);line(g,[[0,-24],[0,-8]],"#d7e6e8",4);path(g,"#e7c67b",null,c=>{c.moveTo(-10,-56);c.lineTo(2,-76);c.lineTo(12,-56)})}
}
if(k==="wizard"||p.hat){path(g,grad(g,-29,-91,34,-25,tint(p.coat,.25),tint(p.coat,-.18)),ink,c=>{c.moveTo(-35,-34);c.quadraticCurveTo(-20,-75,-2,-96);c.quadraticCurveTo(4,-99,27,-34);c.quadraticCurveTo(0,-23,-35,-34)},3);line(g,[[-36,-31],[32,-31]],p.accent,5);sparkle(g,3,-62,3,"#f8e6a2")}
if(p.glasses&&!helmet){for(const x of [-12,13])oval(g,x,-11,12,10,"#8dd6ec22",ink,3);line(g,[[-1,-11],[2,-11]],ink,3)}
}
function tail(g,p,phase){
const K=p.kind,ink=tint(p.ink,-.2),base=p.main,hi=p.light,t=phase;
if(["fox","wolf","squirrel","cat","dog","dragon","mouse","rabbit","bear"].includes(K)){
g.save();g.translate(18,7);g.rotate(.15+Math.sin(t-.6)*.18);
// Keep large fluffy tails subordinate to the silhouette instead of dwarfing the body.
if(K==="fox"||K==="wolf")g.scale(.78,.84);
else if(K==="squirrel")g.scale(.84,.94);
if(["fox","wolf","squirrel"].includes(K)){
path(g,grad(g,24,-24,91,39,tint(base,.32),tint(base,-.18)),ink,c=>{c.moveTo(0,0);c.bezierCurveTo(30,-11,49,-49,71,-34);c.quadraticCurveTo(86,-31,95,-12);c.quadraticCurveTo(83,5,60,20);c.quadraticCurveTo(29,38,0,13)},3.7);
path(g,hi,null,c=>{c.moveTo(76,-30);c.quadraticCurveTo(92,-23,95,-12);c.quadraticCurveTo(83,5,60,20);c.quadraticCurveTo(66,2,76,-30)});
path(g,tint(base,-.17),null,c=>{c.moveTo(8,8);c.quadraticCurveTo(42,5,58,-17);c.quadraticCurveTo(39,18,7,15)});
line(g,[[54,-17],[68,-21]],tint(base,.44),3);
}else if(K==="dragon"){
path(g,grad(g,5,-14,95,30,tint(base,.12),tint(base,-.22)),ink,c=>{c.moveTo(0,0);c.quadraticCurveTo(46,38,99,3);c.quadraticCurveTo(74,44,35,31);c.lineTo(0,15)},3);
for(const [x,y] of [[40,26],[62,27],[79,20]])path(g,hi,ink,c=>{c.moveTo(x-5,y);c.lineTo(x+1,y-14);c.lineTo(x+9,y-3)},2);
}else if(K==="cat"||K==="mouse"){
g.beginPath();g.moveTo(4,9);g.bezierCurveTo(40,17,60,9,64,-17);g.quadraticCurveTo(67,-39,45,-37);g.strokeStyle=ink;g.lineWidth=16;g.lineCap="round";g.stroke();g.strokeStyle=base;g.lineWidth=11;g.stroke();
}else if(K==="rabbit"){oval(g,26,22,16,16,hi,ink,3)}
else if(K==="dog"){path(g,base,ink,c=>{c.moveTo(0,6);c.bezierCurveTo(29,18,54,10,42,-21);c.bezierCurveTo(62,-17,64,13,34,29);c.lineTo(0,15)},3)}
else{oval(g,28,16,15,12,base,ink)}
g.restore();
}
}
function wing(g,p,phase){
const ink=tint(p.ink,-.22),b=p.coat;
for(const side of [-1,1]){
g.save();g.scale(side,1);g.translate(18,-9);g.rotate(.12+Math.sin(phase)*.24);
path(g,grad(g,7,-72,71,25,tint(b,.3),tint(b,-.14)),ink,c=>{c.moveTo(-8,18);c.bezierCurveTo(12,-39,46,-65,80,-62);c.quadraticCurveTo(72,-35,60,-23);c.quadraticCurveTo(76,-12,65,1);c.quadraticCurveTo(51,14,31,25);c.closePath()},3.2);
for(let i=0;i<3;i++)line(g,[[0,12],[20+i*18,-31+i*7]],tint(b,-.2),2);
g.restore();
}
}
function scarf(g,p,phase){
const ink=tint(p.ink,-.25),base=p.scarf||p.accent;
path(g,grad(g,-29,-31,36,-7,tint(base,.17),tint(base,-.15)),ink,c=>{c.moveTo(-27,-24);c.quadraticCurveTo(0,-35,30,-21);c.lineTo(23,-7);c.quadraticCurveTo(-4,-16,-24,-7);c.closePath()},3.1);
g.save();g.translate(20,-18);g.rotate(.2*Math.sin(phase)-.12);
path(g,grad(g,0,0,51,44,tint(base,.05),tint(base,-.27)),ink,c=>{c.moveTo(0,-1);c.quadraticCurveTo(25,-2,43,18+Math.sin(phase)*3);c.lineTo(48,37+Math.sin(phase)*6);c.quadraticCurveTo(24,32,5,9);c.closePath()},2.8);
for(let i=0;i<3;i++)line(g,[[36+i*4,33],[38+i*4,39]],tint(base,-.3),1.3);
g.restore();
}
function torso(g,p){
const coat=p.coat,ink=tint(p.ink,-.25);
if(p.cape)path(g,grad(g,-35,-24,35,62,tint(coat,.10),tint(coat,-.42)),ink,c=>{c.moveTo(-27,-25);c.quadraticCurveTo(-42,10,-44,57);c.lineTo(-21,65);c.lineTo(15,61);c.lineTo(37,66);c.quadraticCurveTo(31,4,27,-23)},3.4);
path(g,grad(g,-27,-30,31,61,tint(coat,.23),tint(coat,-.21)),ink,c=>{
c.moveTo(-28,-27);c.quadraticCurveTo(-34,-4,-24,16);c.quadraticCurveTo(-25,41,-31,53);
c.quadraticCurveTo(0,64,31,52);c.quadraticCurveTo(23,26,28,10);c.quadraticCurveTo(35,-8,25,-27);
c.quadraticCurveTo(0,-38,-28,-27)
},3.6);
path(g,tint(coat,.25),null,c=>{c.moveTo(-22,-22);c.quadraticCurveTo(-25,7,-18,23);c.quadraticCurveTo(-18,10,-9,-17)});
path(g,tint(coat,-.33),null,c=>{c.moveTo(20,-20);c.quadraticCurveTo(27,6,14,50);c.lineTo(25,49);c.quadraticCurveTo(22,7,25,-20)});
if(p.skirt){path(g,grad(g,-35,20,36,67,tint(coat,.14),tint(coat,-.29)),ink,c=>{c.moveTo(-24,25);c.lineTo(-36,61);c.quadraticCurveTo(0,75,36,61);c.lineTo(25,25)},3)}
if(p.armor||["knight","robot","astronaut"].includes(p.kind)){
path(g,grad(g,-25,-20,26,39,tint(p.main,.45),tint(p.main,-.23)),ink,c=>{c.moveTo(-27,-19);c.quadraticCurveTo(0,-26,27,-19);c.lineTo(21,26);c.quadraticCurveTo(0,39,-21,26)},3);
path(g,tint(p.main,.60),null,c=>{c.moveTo(-22,-15);c.quadraticCurveTo(0,-20,21,-14);c.lineTo(12,0);c.quadraticCurveTo(0,5,-15,0)});
rounded(g,-15,8,30,6,2,tint(p.main,-.36));
if(["robot","astronaut"].includes(p.kind))sparkle(g,0,16,4,"#80ebff");
}else{
line(g,[[-24,23],[22,25]],"#4e3b36",7);
line(g,[[-24,23],[22,25]],"#997450",3.5);
rounded(g,7,18,10,12,2,"#f4c267",ink,1.9);
path(g,grad(g,-7,-14,7,15,"#eee3c8","#b7aa92"),null,c=>{c.moveTo(-8,-16);c.lineTo(0,5);c.lineTo(8,-16)});
if(p.kind==="wizard"){line(g,[[0,-22],[0,18]],tint(coat,-.28),2);for(const y of [2,14])oval(g,5,y,2.5,2.5,p.accent)}
}
if(p.bag){rounded(g,-38,8,19,30,5,grad(g,-34,8,-22,40,"#b89161","#6b493b"),ink,3);rounded(g,-34,17,11,10,2,"#e1c496",ink,1.6);line(g,[[-25,-20],[-28,17]],"#c19f77",3)}
if(p.armor){for(const x of [-28,27])oval(g,x,-18,8,11,tint(p.main,.28),ink,2)}
if(p.kind==="skeleton"){for(const y of [-6,4,14])line(g,[[-18,y],[16,y]],"#d9ceb2",4)}
}
function feet(g,p,stride,bob,dir,run){
const ink=tint(p.ink,-.22),pants=p.armor?tint(p.main,-.16):tint(p.coat,-.15),foot=p.kind==="robot"||p.armor?mix(p.coat,p.main,.4):p.main;
const liftL=run?Math.max(0,stride/16)*13:Math.max(0,stride)*.32;
const liftR=run?Math.max(0,-stride/16)*13:Math.max(0,-stride)*.32;
for(const [sg,lift] of [[-1,liftL],[1,liftR]]){
const start=sg*14,step=sg*stride,dx=start+step,fy=88-lift;
joint(g,start,42,start+step*.30,66,dx,fy,15,pants,ink);
oval(g,dx+5,fy+4,16,8,grad(g,dx-8,fy,dx+17,fy+8,tint(foot,.21),tint(foot,-.26)),ink,3);
if(!p.armor)line(g,[[dx-7,fy],[dx+9,fy]],tint(foot,-.32),2);
if(p.kind==="fox"||p.kind==="cat"||p.kind==="wolf"){for(let i=0;i<2;i++)line(g,[[dx+6+i*4,fy+5],[dx+7+i*4,fy+9]],tint(foot,-.48),1.3)}
}
}
function weapon(g,p,x,y,angle,phase){
let kind=p.weapon;if(!kind)return;
const ink=tint(p.ink,-.3);
g.save();g.translate(x,y);g.rotate(angle);
if(kind==="sword"||kind==="axe"){
path(g,grad(g,0,-64,17,-13,"#fffaf0","#8ba4b5"),ink,c=>{c.moveTo(0,-17);c.lineTo(4,-68);c.lineTo(13,-79);c.lineTo(17,-60);c.lineTo(10,-17)},3);
if(kind==="axe"){path(g,"#d6e4e9",ink,c=>{c.moveTo(-4,-49);c.quadraticCurveTo(25,-63,28,-48);c.lineTo(21,-22);c.lineTo(-4,-29)},3)}
line(g,[[8,-19],[4,23]],"#5a3d32",7);line(g,[[-9,-18],[20,-18]],"#d8ad66",7);oval(g,4,23,5,5,"#f4c17c",ink,1.6);line(g,[[7,-53],[7,-30]],"#ffffff",2);
}else if(kind==="staff"){
line(g,[[0,23],[8,-75]],ink,9);line(g,[[0,23],[8,-75]],"#96744e",5);sparkle(g,9,-82,12,p.accent);
}else if(kind==="slingshot"){
line(g,[[1,18],[5,-29]],ink,9);line(g,[[1,18],[5,-29]],"#8b5c3d",6);
line(g,[[5,-29],[-8,-45]],ink,7);line(g,[[5,-29],[22,-47]],ink,7);
line(g,[[-8,-45],[5,-36],[22,-47]],"#dcb789",2.3);oval(g,5,-36,4,3,"#533c3a");
}else if(kind==="bow"||kind==="crossbow"){
line(g,[[0,19],[7,-41]],"#785838",8);
path(g,null,"#785838",c=>{c.moveTo(8,-60);c.quadraticCurveTo(40,-35,8,-10)},6);
line(g,[[8,-60],[8,-10]],"#f3dfb2",1.6);
if(kind==="crossbow")line(g,[[-10,-36],[33,-36]],"#7c5640",6);
}else if(kind==="gun"){
rounded(g,2,-30,42,17,5,"#5d7083",ink,3);rounded(g,12,-12,10,19,2,"#956648",ink,2);rounded(g,35,-27,13,7,2,"#a9c9d2",ink,2);
}else if(kind==="shield"){
path(g,grad(g,-22,-41,23,30,tint(p.coat,.34),tint(p.coat,-.35)),ink,c=>{c.moveTo(-20,-34);c.quadraticCurveTo(5,-46,28,-32);c.lineTo(22,22);c.lineTo(0,43);c.lineTo(-23,22)},4);
path(g,"#d4b873",null,c=>{c.moveTo(2,-28);c.lineTo(7,-5);c.lineTo(22,-2);c.lineTo(8,6);c.lineTo(4,27);c.lineTo(-4,6);c.lineTo(-17,-1);c.lineTo(-3,-5)});
}else if(kind==="lantern"){
line(g,[[0,10],[4,-24]],"#99764e",4);rounded(g,-9,-25,25,26,6,"#e8bd63",ink,3);rounded(g,-4,-21,15,16,2,"#fff7b5",ink,1.5);oval(g,3,-12,3,5,"#ffd26e");
}else if(kind==="pickaxe"){
line(g,[[2,22],[9,-57]],"#8e6745",8);path(g,"#aeb9c7",ink,c=>{c.moveTo(-37,-57);c.quadraticCurveTo(9,-83,38,-52);c.quadraticCurveTo(16,-58,-4,-52)},3);
}
g.restore()
}
function makeFrame(p,action,i,total,direction,style){
 const pose=root.SpriteForgePoseV4?.sample(action,i,total);
 if(!pose)throw Error("SpriteForge pose rig v4 is missing");
 const a=pose.phase,t=pose.t;
 const isSide=["right","left","se","sw","ne","nw"].includes(direction),back=["up","nw","ne"].includes(direction),isLeft=["left","nw","sw"].includes(direction);
 const canvas=document.createElement("canvas");canvas.width=320;canvas.height=320;
 const g=canvas.getContext("2d");g.imageSmoothingEnabled=true;
 g.translate(144,159);const scale=p.giant?1.05:p.small?.9:1;g.scale(scale,scale);
 if(isLeft)g.scale(-1,1);
 if(pose.type==="death"){g.translate(0,t*17);g.rotate(t*1.05)}
 if(pose.type==="hurt"){g.translate(Math.sin(a*2.5)*4,0);g.rotate(.065*Math.sin(a*2.5))}
 g.translate(0,pose.bob);
 const ink=tint(p.ink,-.17), arms=p.main,pants=p.armor?tint(p.main,-.15):tint(p.coat,-.12);
 if(p.wings)wing(g,p,a);
 tail(g,p,a);
 // Two-bone legs, each ankle solved from a hip and a planted/swing foot.
 const left=pose.feet.left,right=pose.feet.right;
 function leg(hip,ankle,sg,far){
  const knee=root.SpriteForgePoseV4.solveKnee(hip,42,ankle.x,ankle.y-5,32,36,sg===-1?-.75:.85);
  const col=far?tint(pants,-.14):pants;
  // Explicit two-bone segments meet exactly at the knee joint (no detached kneecap).
  for(const [[ax,ay],[bx,by]] of [[[hip,42],[knee.x,knee.y]],[[knee.x,knee.y],[ankle.x,ankle.y-5]]]){
    line(g,[[ax,ay],[bx,by]],ink,16.5);
    line(g,[[ax,ay],[bx,by]],col,12);
  }
  oval(g,knee.x,knee.y,6.7,6.4,col,ink,1.7);
  const foot=p.kind==="robot"||p.armor?mix(p.coat,p.main,.4):p.main;
  const paint=grad(g,ankle.x-13,ankle.y-6,ankle.x+17,ankle.y+6,tint(foot,.26),tint(foot,-.23));
  oval(g,ankle.x+4,ankle.y+2,14,7,paint,ink,2.4);
  line(g,[[ankle.x-9,ankle.y+5],[ankle.x+14,ankle.y+5]],tint(foot,-.37),1.5);
  if(["fox","cat","wolf","rabbit"].includes(p.kind))
   for(let n=0;n<2;n++)line(g,[[ankle.x+5+n*4,ankle.y+4],[ankle.x+5+n*4,ankle.y+7]],tint(foot,-.4),1.1);
 }
 leg(-12,left,-1,true);leg(12,right,1,false);
 // The pelvis keeps its identity. Only the upper body leans in a sprint.
 g.save();
 g.translate(0,pose.crouch*.45);
 g.rotate(pose.lean);
 g.scale(1,pose.torso*(1+pose.squash));
 torso(g,p);
 const backSwing=pose.arm;
 const grip=(()=>{
  if(pose.type==="attack")return {x:35+pose.attackReach,y:17+Math.sin(pose.attackAngle)*11,angle:pose.attackAngle};
  if(pose.type==="jump")return {x:39,y:-8+pose.crouch*.28,angle:-.2};
  if(pose.type==="cast")return {x:36+pose.attackReach,y:-24,angle:-.12};
  if(pose.type==="run")return {x:29+backSwing*.45,y:13+Math.sin(a)*6,angle:.18};
  if(pose.type==="walk")return {x:34+backSwing*.45,y:23,angle:-.07};
  if(pose.type==="death")return {x:35,y:28+21*t,angle:1.25*t};
  return {x:36,y:23+1.5*Math.sin(a),angle:-.07};
 })();
 const leftWrist={x:-35-backSwing*.66,y:27+backSwing*.28};
 const leftElbow={x:-31-backSwing*.27,y:6+backSwing*.22};
 joint(g,-22,-12,leftElbow.x,leftElbow.y,leftWrist.x,leftWrist.y,11,arms,ink);
 oval(g,leftWrist.x,leftWrist.y,8.5,8.5,grad(g,leftWrist.x-8,leftWrist.y-7,leftWrist.x+7,leftWrist.y+6,tint(arms,.25),tint(arms,-.18)),ink,2);
 if(p.scarf)scarf(g,p,a);
 // The same face is redrawn at the same coordinates: no frame-to-frame face warp.
 g.save();
 g.translate(0,-51+(pose.type==="idle"?.8*Math.sin(a):.15*Math.sin(a)));
 g.rotate(pose.type==="run"?.015*Math.sin(a):.012*Math.sin(a));
 if(root.SpriteForgeFaceV4){
  root.SpriteForgeFaceV4.draw(g,p,isSide,back,{action,index:i,total,phase:a});
 }else head(g,p,isSide,back);
 g.restore();
 const elbow={x:28+backSwing*.22,y:4+(pose.type==="attack"?-9:0)};
 joint(g,23,-12,elbow.x,elbow.y,grip.x,grip.y,11,arms,ink);
 // Equipment is parented to the wrist, never independently animated.
 if(p.weapon)weapon(g,p,grip.x+4,grip.y-2,grip.angle,a);
 oval(g,grip.x,grip.y,8,9,grad(g,grip.x-7,grip.y-8,grip.x+6,grip.y+7,tint(arms,.24),tint(arms,-.20)),ink,2.1);
 if(pose.type==="cast"&&pose.t>.2&&pose.t<.9){
  const charge=Math.sin(Math.PI*pose.t);
  for(let j=0;j<6;j++){const angle=a+j*TAU/6;sparkle(g,grip.x+20*Math.cos(angle),grip.y-31+20*Math.sin(angle),2+charge*2,p.accent)}
 }
 g.restore();
 return canvas;
}
function toCell(full,size,style){
const canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;
const g=canvas.getContext("2d");
const pixel=["retro","16bit","cozy","dark","cute"].includes(style),base=style==="retro"?44:style==="16bit"?Math.max(32,Math.min(size,80)):Math.max(32,Math.min(size,96));
if(pixel){
const src=document.createElement("canvas");src.width=Math.min(size,base);src.height=Math.min(size,base);
const ctx=src.getContext("2d");ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
ctx.drawImage(full,0,0,src.width,src.height);
g.imageSmoothingEnabled=false;g.drawImage(src,0,0,size,size);
}else{g.imageSmoothingEnabled=true;g.imageSmoothingQuality="high";g.drawImage(full,0,0,size,size)}
return canvas;
}
function render(parsed,action,frame,total,direction,style,size){
return toCell(makeFrame(parsed,action,frame,total,direction,style),size,style);
}
root.SpriteForgeIllustrator={render,version:"2.0.0"};
})(window);
