/* SpriteForge Art Studio v3
   Offline Canvas 2D post-illustrator: material texture, shape accents,
   garment seams, species markings, secondary motion, parallax effects,
   top-down 8-way view and fixed-crop high-resolution sprite export.
   No API, image download, model weights or remote inference required.
*/
(function(root){"use strict";
const TWO=2*Math.PI;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const dSin=Math.sin,dCos=Math.cos;
const rgb=h=>[0,2,4].map(i=>parseInt(h.slice(1+i,3+i),16));
function mix(a,b,t){const aa=rgb(a),bb=rgb(b);return "#"+aa.map((v,i)=>Math.round(v*(1-t)+bb[i]*t).toString(16).padStart(2,"0")).join("")}
function shade(a,t){return mix(a,t>0?"#ffffff":"#060c1c",Math.abs(t))}
function random(seed){let n=seed|0;return()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
function canvas(w,h){const v=document.createElement("canvas");v.width=w;v.height=h;return v}
function bez(g,fn,fill,stroke,w=2){g.beginPath();fn(g);g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=w;g.lineJoin="round";g.lineCap="round";g.stroke()}}
function stroke(g,coords,color,w=2){g.beginPath();g.moveTo(coords[0][0],coords[0][1]);for(let i=1;i<coords.length;i++)g.lineTo(coords[i][0],coords[i][1]);g.strokeStyle=color;g.lineWidth=w;g.lineCap="round";g.lineJoin="round";g.stroke()}
function circle(g,x,y,r,fill,outline,w=2){g.beginPath();g.arc(x,y,r,0,TWO);if(fill){g.fillStyle=fill;g.fill()}if(outline){g.strokeStyle=outline;g.lineWidth=w;g.stroke()}}
function ellipse(g,x,y,rx,ry,fill,outline,w=2,rot=0){g.beginPath();g.ellipse(x,y,rx,ry,rot,0,TWO);if(fill){g.fillStyle=fill;g.fill()}if(outline){g.strokeStyle=outline;g.lineWidth=w;g.stroke()}}
function rounded(g,x,y,w,h,r,fill,outline,sw=2){g.beginPath();g.roundRect(x,y,w,h,r);if(fill){g.fillStyle=fill;g.fill()}if(outline){g.strokeStyle=outline;g.lineWidth=sw;g.stroke()}}
function grad(g,x,y,X,Y,a,b){const d=g.createLinearGradient(x,y,X,Y);d.addColorStop(0,a);d.addColorStop(1,b);return d}
function sparkle(g,x,y,r,c){stroke(g,[[x-r*1.4,y],[x+r*1.4,y]],c,1.4);stroke(g,[[x,y-r*1.5],[x,y+r*1.5]],c,1.4);circle(g,x,y,r*.55,"#ffffff")}
function dot(g,x,y,color,r=1.4){circle(g,x,y,r,color)}
function shape(g,points,fill,strokeColor,width=2){bez(g,c=>{c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);},fill,strokeColor,width)}
function ornament(g,p,cycle,side,back){
 const seed=p.seed>>>0,rnd=random(seed^0x5a37c6fe),design=p.design||{},flags=design.flags||{},outline=shade(p.ink,-.28),coat=p.coat,fur=p.main,light=p.light,accent=p.accent;
 // All coordinates are in the original illustrator's body-aligned coordinates.
 // Regimental/woven edge highlights add structure rather than random strokes on the face.
 stroke(g,[[-20,-18],[-18,7],[-15,22]],shade(coat,.38),2.7);
 stroke(g,[[23,-18],[19,6],[16,24]],shade(coat,-.24),2.4);
 for(const sg of [-1,1]){
   stroke(g,[[sg*15,31],[sg*13,41]],shade(coat,-.34),1.7);
   circle(g,sg*21,-19,2.4,flags.armor||p.armor?"#f7e2b0":shade(coat,.55),outline,1.2);
 }
 if(p.bag){rounded(g,-32,12,12,8,2,"#e8ba74",outline,1);stroke(g,[[-28,15],[-26,19]],outline,1.7)}
 // Chest ornaments: choose one based on the character class and seed.
 const cls=p.kind;
 if(cls==="robot"||cls==="astronaut"){
  rounded(g,-12,1,25,20,5,"#263e54",outline,1.8);
  rounded(g,-8,6,16,5,2,"#71e8ff");
  circle(g,12,18,2.7,"#ffbf7a");
  for(const [x,y] of [[-17,-10],[16,-11],[-19,28],[20,26]])circle(g,x,y,1.9,"#d9e6eb",outline,1);
 } else if(p.armor||cls==="knight"){
  bez(g,c=>{c.moveTo(-13,-8);c.quadraticCurveTo(1,-14,14,-9);c.lineTo(10,19);c.lineTo(0,27);c.lineTo(-10,18)},null,"#ebddb8",2);
  shape(g,[[-2,7],[0,-1],[4,7],[11,7],[5,13],[3,21],[0,15],[-5,20],[-4,12],[-11,7]],"#eac978",outline,1.2);
  for(const x of [-21,21])for(const y of [-3,25])circle(g,x,y,1.8,"#f1e1b5");
 } else if(cls==="wizard"||cls==="elf"){
  for(const [x,y,r] of [[0,3,4],[11,15,2],[-9,17,2]])sparkle(g,x,y,r,"#f3cd7b");
  stroke(g,[[-5,2],[0,12],[7,18]],shade(coat,.5),1.8);
  if(cls==="wizard")circle(g,15,37,5,"#7ad6ca",outline,1.8);
 } else if(cls==="pirate"){
  stroke(g,[[-20,4],[18,27]],"#ead4a2",4);
  for(const [x,y] of [[-10,12],[0,17],[10,23]])circle(g,x,y,2.6,"#deb875",outline,.9);
  shape(g,[[-18,29],[-12,31],[-15,40],[-25,38]],"#7e4b3b",outline,1.2);
 } else if(cls==="ninja"){stroke(g,[[-17,-10],[15,17]],shade(coat,.5),4);stroke(g,[[-10,9],[12,31]],shade(coat,-.34),2);}
 else if(flags.badge||flags.hero){circle(g,0,9,8,shade(coat,.45),outline,2);sparkle(g,0,8,5,"#ffdf93");}
 else if(design.theme%3===0){stroke(g,[[-9,-6],[0,1],[8,-7]],shade(coat,.4),2);circle(g,0,12,3,"#f4c56d");}
 // The scarf is an actual distinct material. Its knot and folds move subtly.
 if(p.scarf){
  circle(g,16,-16,5.5,grad(g,12,-22,21,-9,shade(p.scarf,.27),shade(p.scarf,-.15)),outline,1.5);
  stroke(g,[[20,-14],[27,1+Math.sin(cycle)*3]],shade(p.scarf,.38),1.8);
 }
 // Fabric seams, stitch marks and individual ornamenting.
 if(flags.patch||flags.rugged){rounded(g,-11,24,11,10,2,shade(coat,-.22),outline,1.1);for(let i=0;i<3;i++)stroke(g,[[-9+i*3,24],[-9+i*3,27]],"#d4bf99",1.1)}
 if(flags.glowing){for(let n=0;n<5;n++){let x=-21+rnd()*42,y=-18+rnd()*64;sparkle(g,x,y,1.8,p.accent)}}
 if(flags.striped||design.markings==="stripe"){
   for(let i=0;i<4;i++) {
     let y=-4+i*11;
     stroke(g,[[-16,y],[-8,y+4],[5,y+2]],shade(coat,-.18),2.3);
   }
 } else if(flags.spotted||design.markings==="spots"){
   for(let i=0;i<6;i++){let x=-17+rnd()*33,y=-1+rnd()*41;ellipse(g,x,y,2.5+rnd()*2.5,2+rnd()*2,shade(coat,-.22))}
 }
 // Feet accent / boots pattern
 const motion=/run|walk|бег|ходьба/i.test(cycle.action||"")?Math.sin(cycle.phase)*13:0;
 if(flags.boots||design.boots){
 for(const sg of [-1,1]){const x=sg*14+motion*sg;
 stroke(g,[[x-9,86],[x+11,86]],"#c39b65",2.5);
 stroke(g,[[x-6,80],[x+7,80]],outline,1.7);
 }}
}
function fur(g,p,side,back,phase){
 const k=p.kind,outline=shade(p.ink,-.22),fur=p.main,light=p.light,rnd=random(p.seed^0x1fa79cbd),flags=p.design?.flags||{},design=p.design||{};
 const animal=["fox","wolf","cat","dog","bear","rabbit","squirrel","mouse","dragon","frog","bird"].includes(k);
 if(!animal)return;
 // Highlights on character's muzzle and forehead, moved with head.
 g.save();g.translate(0,-51+1.5*Math.sin(phase));g.rotate(.035*Math.sin(phase));
 if(k==="fox"||k==="wolf"||k==="squirrel"){
  bez(g,c=>{c.moveTo(-26,2);c.quadraticCurveTo(-31,10,-22,19);c.lineTo(-15,25);c.lineTo(-17,12)},light,null);
  bez(g,c=>{c.moveTo(-5,-35);c.lineTo(4,-43);c.lineTo(12,-34);c.quadraticCurveTo(0,-24,-5,-35)},shade(fur,.21),null);
  if(side){
   stroke(g,[[7,2],[17,-1],[22,0]],shade(fur,-.22),1.8);
   ellipse(g,13,-14,2.1,3.5,"#ffffff");
   stroke(g,[[25,21],[36,23]],shade(light,-.28),1.4);
  } else if(!back){
   for(const x of [-26,25])shape(g,[[x-4,7],[x+2,10],[x,18]],light);
  }
 }
 if(k==="cat"&&!back) {
  for(const s of [-1,1]){
   stroke(g,[[s*14,8],[s*40,3]],outline,1.5);
   stroke(g,[[s*13,13],[s*40,15]],outline,1.5);
  }
 }
 if(k==="bear"){for(const s of [-1,1])dot(g,s*15,15,shade(fur,-.21),2.2)}
 if(k==="rabbit"){ellipse(g,0,16,9,4,shade(light,-.12));for(const x of [-14,14])dot(g,x,13,shade(fur,.35),1.4)}
 if(k==="frog"){for(let i=0;i<9;i++){const x=-28+rnd()*56,y=-27+rnd()*30;dot(g,x,y,shade(fur,.24),1.2+rnd()*1.4)}}
 if(k==="dragon"){
  for(let i=0;i<8;i++){const x=-29+(i%4)*16, y=-29+Math.floor(i/4)*12;shape(g,[[x-5,y],[x,y-5],[x+5,y]],shade(fur,.2),null)}
  ellipse(g,20,-3,3.5,2,shade(fur,-.3));
 }
 if(k==="bird"){stroke(g,[[-18,-20],[-10,-31],[-2,-23]],shade(fur,.29),3)}
 if(flags.scar){stroke(g,[[12,-24],[18,-13],[11,-4]],shade(fur,-.45),2);for(let i=0;i<3;i++)stroke(g,[[11+i*2,-21+i*6],[16+i*2,-23+i*6]],light,1)}
 if(flags.angry&&!back){stroke(g,[[-19,-30],[-7,-25]],outline,3);stroke(g,[[8,-25],[23,-29]],outline,3)}
 if(flags.sleepy&&!back) {stroke(g,[[-19,-11],[-8,-9]],outline,2);stroke(g,[[7,-9],[17,-11]],outline,2)}
 if(flags.smile&&!back){stroke(g,[[-5,17],[0,21],[8,17]],shade(fur,-.35),2)}
 if(flags.glowing&&!back){circle(g,14,-13,5,p.accent);circle(g,14,-13,2,"#ffffff")}
 g.restore();
 // Chest fur: some clothing should not obscure all natural markings.
 if(["fox","wolf","cat","dog","bear","rabbit"].includes(k)&&!p.armor&&!p.skirt){
  bez(g,c=>{c.moveTo(-10,-14);c.quadraticCurveTo(1,-8,14,-14);c.lineTo(7,1);c.lineTo(2,-4);c.lineTo(-1,5);c.lineTo(-6,-5);c.lineTo(-9,0)},shade(p.coat,.34),null);
 }
}
function equipment(g,p,phase,action){
 const outline=shade(p.ink,-.35),f=p.main,rnd=random(p.seed+0x1929ab);
 if(p.kind==="robot"){
   for(let j=0;j<4;j++){const yy=13+j*8;stroke(g,[[25,yy],[31,yy]],"#b9e3ef",1.4)}
   circle(g,28,-8,5,"#a2dff3",outline,1);
 }
 if(p.kind==="pirate"){
   ellipse(g,-22,-68,7,8,"#ded9bf",outline,1.5);
   rounded(g,-28,-73,13,3,1,outline);
 }
 if(p.kind==="wizard"){circle(g,24,-9,3.5,"#e9c774",outline,1);sparkle(g,25,-9,2.5,"#fce8ab")}
 if(p.design?.crown){
  shape(g,[[-27,-87],[-23,-107],[-13,-94],[0,-116],[12,-94],[23,-108],[27,-87]],"#f1cc64",outline,2.7);
  for(const x of [-23,0,23])circle(g,x,-88,3.3,"#ee7f70",outline,1);
 }
 if(p.design?.hood){
   bez(g,c=>{c.moveTo(-33,-82);c.bezierCurveTo(-40,-117,29,-120,35,-81);c.quadraticCurveTo(38,-63,25,-51);c.lineTo(23,-73);c.quadraticCurveTo(0,-97,-27,-72);c.lineTo(-27,-53)},grad(g,-30,-102,28,-53,shade(p.coat,.28),shade(p.coat,-.28)),outline,3);
 }
 if(p.design?.mask&&!p.armor){
   bez(g,c=>{c.moveTo(-26,-54);c.quadraticCurveTo(0,-46,24,-54);c.lineTo(19,-38);c.quadraticCurveTo(0,-28,-21,-38)},shade(p.coat,-.25),outline,1.7);
 }
 if(p.design?.flags?.glowing){for(let n=0;n<3;n++){const x=-39+rnd()*72,y=-85+rnd()*122;sparkle(g,x,y,2,p.accent)}}
 // Attach thumb around the existing tool handle, never a detached floating hand.
 if(p.weapon){
 const move=/run|walk|бег|ходьб/i.test(action),attack=/attack|атак|shoot|стрел|удар/i.test(action),swing=move?Math.sin(phase)*13:attack?Math.sin(Math.PI*(phase/TWO))*23:0;
 const hy=attack?-29+23*Math.sin(phase):28,hx=35+swing;
 ellipse(g,hx+3,hy-1,5.1,6.9,grad(g,hx,hy-9,hx+7,hy+8,shade(f,.22),shade(f,-.12)),outline,1.3,.13);
 }
}
// Deterministic canvas surface treatment. Material is confined to opaque pixels;
// no random noise in the transparent game sprite background.
function materialPass(raw,p,style){
 const ctx=raw.getContext("2d",{willReadFrequently:true}),w=raw.width,h=raw.height;
 const im=ctx.getImageData(0,0,w,h),a=im.data;
 const seed=p.seed>>>0,grain=style==="comic"?0.045:style==="vector"?0.006:style==="anime"?0.019:0.038;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const i=(y*w+x)*4;if(a[i+3]<200)continue;
  // Cheap hash noise: fixed material variation, not animated textures downloaded externally.
  let hash=(Math.imul(x+seed,73856093)^Math.imul(y+seed*3,19349663))>>>0;
  let noise=((hash&255)/255-.5)*255*grain;
  const adjacent=(((y-1)*w+x)*4+3),adjL=(y*w+x-1)*4+3;
  const edge=a[adjacent]<100||a[adjL]<100;
  let light=edge?8:0,shadeEdge=a[((y+1)*w+x)*4+3]<100?-14:0;
  for(let t=0;t<3;t++){a[i+t]=Math.max(0,Math.min(255,a[i+t]+noise+light+shadeEdge))}
 }
 ctx.putImageData(im,0,0);
}
// True orbital top-down sprite: not just a vertically squashed side-view sprite.
function topView(p,action,index,count,direction,style){
 const out=canvas(260,260),g=out.getContext("2d");const a=TWO*index/count,walk=/run|walk|бег|ходьб/i.test(action);
 const dig=/dig|коп/i.test(action),attack=/attack|атак/i.test(action);
 const colors=[p.main,p.light,p.coat,p.ink],ink=shade(p.ink,-.2),rnd=random(p.seed);
 const rot={down:0,sw:Math.PI/4,left:Math.PI/2,nw:Math.PI*3/4,up:Math.PI,se:-Math.PI/4,right:-Math.PI/2,ne:-Math.PI*3/4}[direction]||0;
 g.translate(130,130);g.rotate(rot);let legA=Math.sin(a)*(walk?12:2);
 // Tail at the rear, partially hidden by shoulders.
 if(["fox","wolf","cat","dog","squirrel","dragon"].includes(p.kind)){
 g.save();g.rotate(Math.sin(a)*.1);
 bez(g,c=>{c.moveTo(-10,45);c.bezierCurveTo(6,75,24,67,16,96);c.bezierCurveTo(31,108,45,85,29,61);c.lineTo(14,27)},grad(g,0,40,34,95,shade(p.main,.25),shade(p.main,-.12)),ink,3.5);
 if(["fox","wolf","squirrel"].includes(p.kind))shape(g,[[17,81],[27,99],[37,89],[30,73]],p.light);
 g.restore();
 }
 // Leg posture from above and actual opposite foot stepping.
 for(const sign of [-1,1]){
 const shift=legA*sign;ellipse(g,sign*22+shift,53,11,19,grad(g,0,40,20,69,shade(p.coat,.14),shade(p.coat,-.24)),ink,3);
 ellipse(g,sign*25+shift,67,10,11,shade(p.main,-.06),ink,2);
 }
 if(p.wings){for(const s of [-1,1]){g.save();g.scale(s,1);g.rotate(.08*Math.sin(a));shape(g,[[29,12],[74,-28],[65,21],[44,38]],shade(p.coat,.2),ink,2.7);g.restore()}}
 // Rounded shoulders, layered jacket, shoulder blades and belt.
 ellipse(g,0,10,40,49,grad(g,-33,-25,40,59,shade(p.coat,.22),shade(p.coat,-.27)),ink,3.5);
 for(const sign of [-1,1]){
  const swing=sign*Math.sin(a)*8;
  ellipse(g,sign*38+swing,-7,12,25,grad(g,-15,-30,40,34,shade(p.main,.1),shade(p.main,-.18)),ink,2.6,sign*.22);
  ellipse(g,sign*44+swing,-20,11,11,p.main,ink,2.3);
 }
 stroke(g,[[-22,29],[23,29]],"#9d825e",5);
 if(p.armor){ellipse(g,0,8,28,40,grad(g,-30,-25,30,31,shade(p.main,.44),shade(p.main,-.25)),ink,3);stroke(g,[[-24,16],[23,17]],"#d7e5e9",2)}
 if(p.scarf){ellipse(g,0,-22,30,11,p.scarf,ink,2.3);stroke(g,[[20,-20],[37,-7]],shade(p.scarf,-.2),5)}
 // Neck / top of hair / furry head from above: unmistakable top view.
 ellipse(g,0,-46,36,35,grad(g,-35,-83,35,-13,shade(p.main,.23),shade(p.main,-.12)),ink,3.6);
 if(["fox","wolf","cat","rabbit","squirrel","dragon"].includes(p.kind)){
 for(const s of [-1,1]){shape(g,[[s*19,-59],[s*30,-105],[s*42,-59]],shade(p.main,.06),ink,3);shape(g,[[s*24,-66],[s*30,-91],[s*34,-65]],shade(p.light,-.06));}
 }
 if(p.kind==="robot"){rounded(g,-27,-67,54,43,10,shade(p.main,.24),ink,3);for(const x of [-15,15])circle(g,x,-39,6,"#73f3ff")}
 else if(p.kind==="knight"||p.kind==="astronaut"){ellipse(g,0,-47,32,31,shade(p.light,.1),ink,3);rounded(g,-22,-53,44,24,8,"#5a9bb4",ink,2)}
 else if(p.kind==="dragon"){for(const x of [-16,0,16])shape(g,[[x-6,-67],[x,-90],[x+7,-66]],p.light,ink,1.6)}
 else if(p.kind==="skeleton"){for(const x of [-12,12])ellipse(g,x,-40,7,8,ink)}
 else if(p.kind==="slime"){ellipse(g,0,-39,33,30,grad(g,-28,-61,26,-15,shade(p.main,.35),shade(p.main,-.15)),ink,3);}
 else if(p.kind==="frog"){for(const x of [-21,21])circle(g,x,-52,9,shade(p.main,.25),ink,2)}
 if(p.design?.flags?.striped){for(let j=0;j<3;j++)stroke(g,[[-17,-55+j*9],[17,-53+j*9]],shade(p.main,-.18),2.5)}
 // Light up eyes for a down-facing character. Looking 'up' has only hair/ears.
 if(["down","se","sw"].includes(direction)){for(const x of [-15,15]){ellipse(g,x,-16,5,6,"#fdf4e4",ink,1.5);circle(g,x+1,-16,2.5,p.eye)}}
 if(p.weapon){
 g.save();g.translate(48,-17);g.rotate(attack?Math.sin(a)*.5:0);
 stroke(g,[[0,18],[6,-46]],"#775538",7);
 if(p.weapon==="sword")shape(g,[[1,-46],[4,-93],[12,-46]],"#dbe6ea",ink,2);
 else if(p.weapon==="staff")circle(g,6,-51,10,p.accent,ink,2);
 else if(p.weapon==="slingshot"){stroke(g,[[6,-43],[-4,-65]],"#7e4a32",4);stroke(g,[[6,-43],[21,-66]],"#7e4a32",4);stroke(g,[[-4,-65],[21,-66]],"#e9d4b3",2)}
 else if(p.weapon==="gun")rounded(g,1,-58,12,38,4,"#667990",ink,2);
 else if(p.weapon==="shield")ellipse(g,5,-32,18,23,shade(p.coat,.2),ink,3);
 else shape(g,[[0,-48],[10,-69],[16,-45]],"#c7d7dd",ink,2);
 g.restore();
 }
 return out;
}
function character(p,action,index,total,direction,style,size,view){
 if(view==="top"){return finish(topView(p,action,index,total,direction,style),size,style)}
 const src=root.SpriteForgeIllustratorV2.render(p,action,index,total,direction,"painted",320);
 const raw=canvas(320,320);const g=raw.getContext("2d");g.drawImage(src,0,0);
 const phase=index*TWO/total,t=index/Math.max(1,total-1);
 const movement=/run|walk|бег|ходьб/i.test(action),fast=/run|бег/i.test(action),attack=/attack|атак|стрел|shoot/i.test(action),jump=/jump|прыж/i.test(action),fly=/fly|лет|полёт|полет/i.test(action),death=/death|смерт|погиб/i.test(action),hurt=/hurt|урон/i.test(action);
 const bob=fast?-5*Math.abs(Math.sin(phase)):movement?-3*Math.abs(Math.sin(phase)):jump?-33*Math.sin(Math.PI*t):fly?-11*Math.sin(phase):1.3*Math.sin(phase);
 g.save();g.translate(144,159);g.scale(p.giant?1.05:p.small?.9:1,p.giant?1.05:p.small?.9:1);
 if(["left","nw","sw"].includes(direction))g.scale(-1,1);
 if(death){g.translate(0,t*33);g.rotate(t*1.25)}
 if(hurt){g.translate(Math.sin(phase*3)*5,0);g.rotate(Math.sin(phase*3)*.09)}
 g.translate(0,bob);
 // Procedural costume and secondary-character detailing, anchored to local rig.
 ornament(g,p,{phase,action},direction,["up","nw","ne"].includes(direction));
 fur(g,p,["right","left","se","sw","ne","nw"].includes(direction),["up","nw","ne"].includes(direction),phase);
 equipment(g,p,phase,action);
 g.restore();
 materialPass(raw,p,style);
 // Fixed capture across all animation frames: no re-centering jitter.
 const cropped=canvas(260,260),c=cropped.getContext("2d");
 c.drawImage(raw,22,0,260,260,0,0,260,260);
 if(view==="iso"){
  // A subtle projection of the same pose; not a true volume rendering.
  const iso=canvas(260,260),h=iso.getContext("2d");h.translate(130,130);h.transform(1,.06,-.13,.88,0,0);h.drawImage(cropped,-130,-125);return finish(iso,size,style);
 }
 return finish(cropped,size,style);
}
function finish(src,size,style){
 const out=canvas(size,size),g=out.getContext("2d"),pixel=["16bit","retro","cozy","dark","cute"].includes(style);
 if(pixel){
  const n=style==="retro"?Math.min(size,48):style==="16bit"?Math.min(size,72):Math.min(size,90),low=canvas(n,n),c=low.getContext("2d");
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality="high";c.drawImage(src,0,0,n,n);
  // A low-frequency pixel lattice avoids harsh jagged edges while maintaining pixel identity.
  g.imageSmoothingEnabled=false;g.drawImage(low,0,0,size,size);
 }else{g.imageSmoothingEnabled=true;g.imageSmoothingQuality="high";g.drawImage(src,0,0,size,size)}
 return out;
}
const prev=root.SpriteForgeIllustrator;
root.SpriteForgeIllustratorV2=prev;
root.SpriteForgeIllustrator={render:character,version:"3.0.0"};
})(window);
