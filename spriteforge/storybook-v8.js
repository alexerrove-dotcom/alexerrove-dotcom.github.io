/* SpriteForge Storybook v8: original reference-informed character renderer.
 * The uploaded reference influenced quality criteria (volume, outlines, staging),
 * not copied pixels. All artwork is deterministic Canvas 2D, fully offline.
 */
(function(root){"use strict";
const prev=root.SpriteForgeIllustrator, TAU=2*Math.PI;
const HUMAN=new Set(["human","elf","wizard","pirate","ninja","knight"]);
const E=["smile","laugh","surprise","neutral","sad","angry","blink","thinking"];
const childRE=/мальчик|девочка|реб[её]н|ребен|малыш|юный|школьник|boy|girl|kid|child|young/i;
function clamp(x,a=0,b=255){return Math.max(a,Math.min(b,x))}
function hex(c){let s=/^#[0-9a-f]{6}$/i.test(c||"")?c:"#a78c71";return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16))}
function shade(c,v){return "#"+hex(c).map(x=>Math.round(clamp(v>=0?x+(255-x)*v:x*(1+v))).toString(16).padStart(2,"0")).join("")}
function grad(g,x,y,xx,yy,c1,c2){const q=g.createLinearGradient(x,y,xx,yy);q.addColorStop(0,c1);q.addColorStop(1,c2);return q}
function fill(g,draw,paint,ink,w=1.6){g.beginPath();draw(g);g.closePath();g.fillStyle=paint;g.fill();if(ink){g.strokeStyle=ink;g.lineWidth=w;g.lineJoin="round";g.lineCap="round";g.stroke()}}
function ell(g,x,y,rx,ry,color,ink=null,sw=1){g.beginPath();g.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);g.fillStyle=color;g.fill();if(ink){g.strokeStyle=ink;g.lineWidth=sw;g.stroke()}}
function path(g,points,color,width=1){g.beginPath();g.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);g.strokeStyle=color;g.lineWidth=width;g.lineJoin="round";g.lineCap="round";g.stroke()}
function strokeBone(g,p1,p2,col,ink,size){path(g,[[p1.x,p1.y],[p2.x,p2.y]],ink,size+2.7);path(g,[[p1.x,p1.y],[p2.x,p2.y]],grad(g,p1.x-6,p1.y,p2.x+5,p2.y,shade(col,.16),shade(col,-.13)),size)}
function styleConfig(p){
 const str=p.str||"",w=p.design?.wardrobe||{},seed=p.seed>>>0;
 const explorer=/исслед|путеш|сафар|скаут|турист|экспеди|explorer|safari|scout|adventurer/i.test(str);
 const kid=childRE.test(str);
 const hat=/шляп|панам|кепк|шапк|hat|cap|helmet|панама/i.test(str)||explorer;
 const shorts=/шорт|shorts|короткие штаны|ромпер|комбинезон/i.test(str)||explorer;
 const red=/рыж|красн.{0,13}волос|red hair|ginger/i.test(str);
 const hair=w.hair||(red?"#cf5739":["#583e34","#8d6343","#3d3338","#c19b60"][seed%4]);
 const skin=w.skin||p.main||"#e6b999";
 const coat=w.clothing||w.shirt||(explorer?"#a38c76":p.coat||"#648ba2");
 const shoe= /красн.{0,15}(?:кед|кроссов|обув)|red sneakers|red shoes/i.test(str)?"#d54340":w.shoes||(explorer?"#d9473d":"#db6854");
 return {kid,explorer,hat,shorts,hair,skin,coat,pants:w.pants||(explorer?"#917e6e":"#626e8a"),shirt:w.shirt||"#f6e6cf",shoe,
  ink:"#65524c",eye:p.eye||"#3e3b3b",hatColor:w.hat||shade(coat,explorer?.14:-.09),pack:/рюкзак|сумк|backpack/i.test(str),
  freckles:/веснуш|freckle/i.test(str)||(seed%5===0),female:p.design?.gender==="female",
  longHair:/длинн|кос|хвостик|long hair|ponytail/i.test(str),glasses:/очки|glasses/i.test(str),seed};
}
function viewFor(view,dir,mode){
 if(view==="top")return"top";
 if(mode==="all4"||mode==="all8")return({up:"back",down:"front",left:"profile",right:"profile",nw:"quarter-back",ne:"quarter-back",sw:"quarter",se:"quarter"}[dir]||"front");
 if(view==="side")return"profile";if(view==="iso")return"quarter";
 return view==="back"?"back":"front";
}
function face(g,c,view,expression,blink){
 const profile=view==="profile",back=view==="back"||view==="quarter-back",q=view==="quarter"||view==="quarter-back";
 const x=profile?5:q?4:0,skin=c.skin,ink=shade(c.skin,-.32);
 // Hair behind the head in every pose, including the rear and 3/4 views.
 if(c.longHair){
  fill(g,z=>{z.moveTo(x-28,-111);z.bezierCurveTo(x-30,-151,x+32,-152,x+29,-113);z.lineTo(x+26,-53);z.quadraticCurveTo(x,-41,x-29,-55)},grad(g,-25,-137,27,-51,shade(c.hair,.2),shade(c.hair,-.27)),c.ink,1.4);
 }
 if(profile){
  fill(g,z=>{z.moveTo(-22,-121);z.bezierCurveTo(-20,-143,18,-145,27,-122);z.lineTo(30,-108);z.quadraticCurveTo(40,-102,33,-97);z.quadraticCurveTo(40,-87,29,-83);z.quadraticCurveTo(23,-68,4,-67);z.bezierCurveTo(-21,-67,-31,-92,-22,-121)},
   grad(g,-24,-125,32,-79,shade(skin,.20),shade(skin,-.13)),ink,1.4);
  ell(g,-18,-97,5,8,shade(skin,-.03),ink,1);
  ell(g,-17,-96,2.15,4,shade(skin,-.16));
 }else{
  fill(g,z=>{z.moveTo(x-29,-119);z.bezierCurveTo(x-28,-145,x+28,-143,x+29,-112);z.bezierCurveTo(x+30,-85,x+14,-72,x+2,-70);z.bezierCurveTo(x-12,-71,x-30,-91,x-29,-119)},
   grad(g,x-27,-130,x+28,-80,shade(skin,.20),shade(skin,-.13)),ink,1.45);
  ell(g,x-29,-101,4.5,7.4,skin,ink,1);
  if(!back)ell(g,x+28,-101,4.3,7.2,skin,ink,1);
 }
 // Volume, bangs and hair are not animated separately from the face.
 if(back){
  fill(g,z=>{z.moveTo(x-28,-117);z.bezierCurveTo(x-28,-148,x+30,-146,x+29,-117);z.quadraticCurveTo(x+28,-89,x+16,-82);z.lineTo(x-17,-82);z.quadraticCurveTo(x-30,-92,x-28,-117)},
    grad(g,-28,-143,27,-83,shade(c.hair,.15),shade(c.hair,-.28)),c.ink,1.5);
  for(let i=-1;i<=1;i++)path(g,[[x+i*10,-113],[x+i*10-3,-92]],shade(c.hair,.27),1);
 }else{
  fill(g,z=>{z.moveTo(x-27,-123);z.bezierCurveTo(x-31,-150,x+25,-150,x+32,-121);z.lineTo(x+23,-116);z.lineTo(x+17,-120);z.lineTo(x+8,-112);z.lineTo(x-2,-119);z.lineTo(x-11,-112);z.lineTo(x-20,-120);z.lineTo(x-28,-115)},
   grad(g,-26,-141,33,-112,shade(c.hair,.23),shade(c.hair,-.23)),c.ink,1.4);
  for(let n=0;n<3;n++)path(g,[[x-18+n*12,-119],[x-13+n*11,-112]],shade(c.hair,.28),.85);
  // White eye, iris, specular glint, eyebrow and cheeks in the same head coordinates.
  const eyes=profile?[[19,-105,1]]:q?[[-5,-106,.64],[18,-105,1]]:[[-12,-106,1],[13,-106,1]];
  const closed=blink||expression==="blink";
  for(const [ex,ey,s] of eyes){
   if(closed||expression==="laugh")path(g,[[ex-5*s,ey],[ex,ey+2*s],[ex+5*s,ey]],shade(c.skin,-.42),1.5);
   else{
    ell(g,ex,ey,5*s,7*s,"#fffdf8",shade(c.skin,-.24),.95);
    ell(g,ex+1*s,ey+.9*s,2.4*s,4.0*s,c.eye);
    ell(g,ex+.3*s,ey-1.0*s,1.2*s,1.6*s,"#ffffff");
   }
   const angry=expression==="angry",sad=expression==="sad";
   path(g,[[ex-5*s,ey-10+(angry?2:sad?-1:0)],[ex+5*s,ey-10+(angry?-2:sad?2:0)]],shade(c.hair,-.18),angry?2:1.2);
  }
  if(profile){path(g,[[30,-100],[35,-98],[31,-95]],ink,1);ell(g,17,-91,6,2.7,"#e79d9366");}
  else{
   path(g,[[q?8:1,-102],[q?10:2,-97],[q?7:0,-96]],shade(c.skin,-.30),.9);
   for(const cx of q?[-12,22]:[-18,18])ell(g,cx,-92,5,2.3,"#e9958a55");
  }
  const mouthX=profile?23:q?8:0,mouthY=-83;
  if(expression==="surprise")ell(g,mouthX,mouthY,3.1,4.6,"#9a4f4b",shade(skin,-.33),1);
  else if(expression==="laugh"){ell(g,mouthX,mouthY,5.5,3.6,"#94514d");path(g,[[mouthX-4,mouthY-.8],[mouthX+3,mouthY-.8]],"#fff8e9",1)}
  else if(expression==="sad")path(g,[[mouthX-4,-81],[mouthX,-84],[mouthX+4,-81]],shade(skin,-.39),1.3);
  else if(expression==="smile")path(g,[[mouthX-5,-85],[mouthX,-82],[mouthX+5,-85]],shade(skin,-.4),1.5);
  else path(g,[[mouthX-3,mouthY],[mouthX+4,mouthY]],shade(skin,-.36),1);
  if(c.freckles)for(const dx of profile?[0,4,8]:[-19,-16,-13,15,18,21])ell(g,dx,-91,1,0.9,shade(skin,-.2));
 }
 if(c.glasses&&!back)for(const ex of profile?[19]:[-12,13])ell(g,ex,-105,7,7,"#ffffff20",c.ink,1.2);
 // Three-part hat: broad shade, sculpted crown, clear contrasting band and brim.
 if(c.hat){
  const hc=c.hatColor;
  fill(g,z=>{z.moveTo(x-29,-128);z.bezierCurveTo(x-28,-151,x-15,-162,x+4,-162);z.bezierCurveTo(x+24,-162,x+33,-148,x+31,-125);z.lineTo(x+25,-118);z.lineTo(x-25,-119)},
   grad(g,x-30,-151,x+32,-120,shade(hc,.30),shade(hc,-.18)),shade(hc,-.35),1.8);
  fill(g,z=>{z.moveTo(x-28,-136);z.quadraticCurveTo(x+3,-133,x+30,-137);z.lineTo(x+30,-126);z.quadraticCurveTo(x,-122,x-29,-127)},
   shade(hc,-.40),null);
  path(g,[[x-27,-126],[x+26,-127]],shade(hc,.42),.95);
  fill(g,z=>{z.moveTo(x-32,-126);z.quadraticCurveTo(x+7,-118,x+38,-127);z.quadraticCurveTo(x+46,-123,x+43,-118);z.quadraticCurveTo(x+4,-105,x-36,-119)},
   grad(g,x-30,-127,x+42,-112,shade(hc,.2),shade(hc,-.24)),shade(hc,-.40),1.8);
  path(g,[[x-27,-120],[x+33,-116]],shade(hc,.35),1);
 }
}
function hand(g,pt,c){ell(g,pt.x,pt.y,7.2,8.4,grad(g,pt.x-5,pt.y-6,pt.x+7,pt.y+7,shade(c.skin,.23),shade(c.skin,-.12)),shade(c.skin,-.3),1.3);
 ell(g,pt.x+4,pt.y-2,3.2,4.2,shade(c.skin,.12),shade(c.skin,-.27),.75);
 path(g,[[pt.x-3,pt.y+3],[pt.x+1,pt.y+3]],shade(c.skin,-.17),.7);}
function arm(g,c,pose,near,profile,quarter){
 const sg=near?1:-1,shoulder={x:profile?(near?10:-8):quarter?(near?22:-18):sg*26,y:-51};
 const step=Math.sin(pose.phase),run=pose.type==="run",walk=pose.type==="walk";
 let tip={x:shoulder.x+sg*(run?11:3)+(run?-step*28:walk?-step*17:sg*1),y:run?-17+Math.cos(pose.phase)*14:walk?4+step*4:12};
 if(run){tip.y=-10+Math.cos(pose.phase)*14}
 if(pose.type==="jump"){tip={x:shoulder.x+sg*14,y:-34}}
 if(pose.type==="attack"){tip={x:shoulder.x+26*pose.attackReach/30+8,y:-28}}
 if(pose.type==="cast"){tip={x:shoulder.x+sg*17,y:-31}}
 if(pose.type==="hurt"){tip={x:shoulder.x+sg*3,y:-18}}
 const elbow={x:shoulder.x+(tip.x-shoulder.x)*.57+sg*(run?8:4),y:shoulder.y+(tip.y-shoulder.y)*.53-(run?3:0)};
 strokeBone(g,shoulder,elbow,c.coat,c.ink,13);
 ell(g,elbow.x,elbow.y,7.7,6.5,shade(c.coat,-.08),c.ink,.8);
 path(g,[[elbow.x-4,elbow.y+2],[elbow.x+4,elbow.y+2]],shade(c.coat,-.28),2);
 strokeBone(g,elbow,tip,c.skin,shade(c.skin,-.30),9.8);
 hand(g,tip,c);
 return tip;
}
function leg(g,c,hip,foot,sg,profile){
 const toe={x:foot.x,y:foot.y-7};
 let knee=root.SpriteForgePoseV4.solveKnee(hip.x,hip.y,toe.x,toe.y,47,45,profile?-1:sg===1?-1:1);
 knee.x=clamp(knee.x,-69,69);knee.y=clamp(knee.y,38,83);
 const ink=shade(c.skin,-.34);
 if(c.shorts){
  strokeBone(g,hip,knee,c.skin,ink,12);
  ell(g,knee.x,knee.y,6.5,6.9,shade(c.skin,.09),ink,.7);
  strokeBone(g,knee,toe,c.skin,ink,10.7);
  const sock={x:toe.x+(knee.x-toe.x)*.13,y:toe.y+(knee.y-toe.y)*.13};
  strokeBone(g,sock,toe,"#f9f7ef","#cac7bb",11);
  path(g,[[sock.x-5,sock.y],[sock.x+5,sock.y]],"#bdc2bd",1.5);
 }else{
  strokeBone(g,hip,knee,c.pants,shade(c.pants,-.35),14);
  strokeBone(g,knee,toe,c.pants,shade(c.pants,-.35),12);
  path(g,[[knee.x-4,knee.y],[knee.x+4,knee.y+1]],shade(c.pants,.22),.9);
 }
 // Shoes follow the planted foot; white outsole and toe cap remain grounded.
 const sx=foot.x,fy=foot.y-3,front=profile?15:11;
 fill(g,z=>{z.moveTo(sx-9,fy-4);z.quadraticCurveTo(sx-5,fy-12,sx+6,fy-10);z.quadraticCurveTo(sx+front+7,fy-7,sx+front+7,fy+2);z.lineTo(sx+front+4,fy+7);z.quadraticCurveTo(sx-7,fy+8,sx-10,fy+4)},
  grad(g,sx-10,fy-10,sx+front+7,fy+7,shade(c.shoe,.2),shade(c.shoe,-.25)),shade(c.shoe,-.40),1.5);
 fill(g,z=>{z.moveTo(sx-10,fy+3);z.quadraticCurveTo(sx+6,fy+5,sx+front+7,fy+1);z.lineTo(sx+front+5,fy+8);z.lineTo(sx-10,fy+8)},
  "#fffefa","#969fa8",.8);
 fill(g,z=>{z.moveTo(sx+front-1,fy-5);z.quadraticCurveTo(sx+front+7,fy-2,sx+front+6,fy+3);z.lineTo(sx+front-1,fy+3)},
  "#fffdf6",null);
 path(g,[[sx-3,fy-5],[sx+4,fy-4]],"#f5e9db",1.5);
}
function neck(g,c){
 fill(g,z=>{z.moveTo(-9,-79);z.lineTo(9,-79);z.lineTo(9,-50);z.quadraticCurveTo(0,-44,-9,-51)},
  grad(g,-8,-79,10,-48,shade(c.skin,.16),shade(c.skin,-.14)),shade(c.skin,-.32),.9);
}
function body(g,c,profile,quarter,back){
 const half=profile?17:quarter?25:30,hem=18;
 if(c.pack)fill(g,z=>{z.moveTo(-half-7,-46);z.lineTo(-half-12,7);z.quadraticCurveTo(-half-2,23,-half+9,10);z.lineTo(-half+9,-37)},
  grad(g,-50,-47,-9,18,"#b78f5f","#7c5c49"),c.ink,1.6);
 // Shorts and shirt are overlapping parts, no exposed joint or detached limbs.
 fill(g,z=>{z.moveTo(-half+6,8);z.lineTo(half-5,8);z.lineTo(half-7,44);z.quadraticCurveTo(half/2,46,0,37);z.quadraticCurveTo(-half/2,47,-half+6,43)},
  grad(g,-half,6,half,47,shade(c.pants,.15),shade(c.pants,-.20)),c.ink,1.4);
 if(!profile){path(g,[[0,25],[0,36]],shade(c.pants,-.30),1.1)}
 fill(g,z=>{z.moveTo(-half+2,-54);z.quadraticCurveTo(-half-10,-34,-half,16);z.quadraticCurveTo(0,22,half,16);z.quadraticCurveTo(half+8,-31,half-2,-54);z.quadraticCurveTo(0,-65,-half+2,-54)},
  grad(g,-half-5,-55,half+5,27,shade(c.coat,.22),shade(c.coat,-.24)),c.ink,1.9);
 // Sleeve seams, collar, placket, two pockets, tiny buttons.
 path(g,[[-half+6,-47],[-half+13,-38]],shade(c.coat,-.27),1);
 path(g,[[half-12,-47],[half-6,-35]],shade(c.coat,-.25),1);
 path(g,[[-12,-55],[0,-60],[12,-54]],shade(c.coat,-.38),2);
 if(!back){
  if(profile)path(g,[[8,-44],[11,11]],shade(c.coat,-.33),1.6);
  else{
   path(g,[[0,-51],[0,15]],shade(c.coat,-.34),1.55);
   for(let yy=-37;yy<=6;yy+=13)ell(g,0,yy,1.2,1.2,"#d4bda6");
  }
  const pockets=profile?[[11,-23]]:quarter?[[13,-22]]:[[-16,-22],[16,-22]];
  for(const [px,py] of pockets){
   fill(g,z=>{z.moveTo(px-6,py-5);z.lineTo(px+6,py-5);z.lineTo(px+6,py+8);z.quadraticCurveTo(px,py+11,px-6,py+8)},
    shade(c.coat,-.07),shade(c.coat,-.29),1);
   path(g,[[px-6,py-4],[px,py-1],[px+6,py-4]],shade(c.coat,-.30),.9);
  }
 }else{
  path(g,[[-half+8,-40],[0,-44],[half-8,-40]],shade(c.coat,-.20),1.2);
  if(c.pack){path(g,[[-half+2,-35],[half-1,-33]],shade(c.coat,-.4),3)}
 }
 path(g,[[-half+4,15],[half-4,15]],shade(c.coat,-.28),2);
 // Cloth creases are attached to folds, not random scribbles.
 path(g,[[half-9,-5],[half-13,1],[half-10,6]],shade(c.coat,.15),1.1);
}
function render(p,action,index,total,direction,style,size,view,mode){
 const isKid=childRE.test(p.str||"");
 if(!HUMAN.has(p.kind)||view==="top"||!(style==="storybook"||(isKid&&["painted","cartoon","comic","chibi","toon3d","vector"].includes(style))))
  return prev.render(p,action,index,total,direction,style,size,view,mode);
 const c=styleConfig(p),v=viewFor(view,direction,mode);
 const profile=v==="profile",quarter=v==="quarter"||v==="quarter-back",back=v==="back"||v==="quarter-back";
 const pose=root.SpriteForgePoseV4.sample(action,index,total);
 const cv=document.createElement("canvas");cv.width=320;cv.height=320;
 const g=cv.getContext("2d",{alpha:true});g.imageSmoothingEnabled=true;
 g.translate(160,184);if(["left","nw","sw"].includes(direction)&&(profile||quarter))g.scale(-1,1);
 const expressions=action==="expressions";
 if(expressions){
  g.save();g.translate(0,75);g.scale(1.65,1.65);
  body(g,c,profile,quarter,back);neck(g,c);face(g,c,v,E[index%E.length],false);g.restore();
 }else{
  g.translate(0,pose.bob);
  // Stable contact plane: foot positions explicitly cancel vertical torso bob.
  const f1={x:pose.feet.left.x*(profile?.94:.85),y:pose.feet.left.y+9};
  const f2={x:pose.feet.right.x*(profile?.94:.85),y:pose.feet.right.y+9};
  if(pose.type==="jump"){f1.y-=Math.max(0,-pose.crouch*.30);f2.y-=Math.max(0,-pose.crouch*.30)}
  if(pose.type==="death"){g.translate(0,Math.min(20,pose.crouch));g.rotate(pose.lean*.70)}
  const hip1={x:profile?-4:quarter?-8:-15,y:25},hip2={x:profile?4:quarter?8:15,y:25};
  leg(g,c,hip1,f1,-1,profile);
  leg(g,c,hip2,f2,1,profile);
  g.save();g.rotate(pose.type==="run"?-.09:pose.lean*.18);
  arm(g,c,pose,false,profile,quarter);
  body(g,c,profile,quarter,back);
  neck(g,c);
  face(g,c,v,(p.design?.expression||"neutral"),pose.type==="idle"&&Math.sin(pose.phase)>0.96);
  arm(g,c,pose,true,profile,quarter);
  g.restore();
 }
 const out=document.createElement("canvas");out.width=size;out.height=size;
 const a=out.getContext("2d",{alpha:true});a.imageSmoothingEnabled=true;a.imageSmoothingQuality="high";
 a.drawImage(cv,0,0,320,320,0,0,size,size);
 return out;
}
root.SpriteForgeIllustrator={render,version:"8.0.0"};
root.SpriteForgeStorybookV8={render,version:"8.0.0",emotions:E};
})(window);
