/* SpriteForge Cartoon Studio v7
 * Original procedural character animation engine. No downloaded assets,
 * trained model, background inference, or external server.
 * Maintains a consistent character design for turnarounds, walk/run
 * cycles, jumps and expression sheets.
 */
(function(root){"use strict";
const TAU=Math.PI*2;
const HUMANS=new Set(["human","elf","wizard","pirate","ninja","knight"]);
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
function hex(s){const c=/^#[0-9a-f]{6}$/i.test(s||"")?s:"#8d7793";return [1,3,5].map(i=>parseInt(c.slice(i,i+2),16))}
function tint(s,k){const v=hex(s);return "#"+v.map(n=>Math.round(clamp(n+(k>0?(255-n)*k:n*k),0,255)).toString(16).padStart(2,"0")).join("")}
function blend(a,b,v){const A=hex(a),B=hex(b);return "#"+A.map((n,i)=>Math.round(n*(1-v)+B[i]*v).toString(16).padStart(2,"0")).join("")}
function gradient(g,x,y,xx,yy,a,b){const l=g.createLinearGradient(x,y,xx,yy);l.addColorStop(0,a);l.addColorStop(1,b);return l}
function shape(g,cb,fill,stroke=null,w=1.8){g.beginPath();cb(g);g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=w;g.lineCap="round";g.lineJoin="round";g.stroke()}}
function ellipse(g,x,y,rx,ry,paint,outline=null,sw=1){g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fillStyle=paint;g.fill();if(outline){g.lineWidth=sw;g.strokeStyle=outline;g.stroke()}}
function roundRect(g,x,y,w,h,r,paint,stroke=null,sw=1){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=paint;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=sw;g.stroke()}}
function line(g,points,col,width=1){g.beginPath();g.moveTo(...points[0]);for(let i=1;i<points.length;i++)g.lineTo(...points[i]);g.lineCap="round";g.lineJoin="round";g.lineWidth=width;g.strokeStyle=col;g.stroke()}
function palette(p){
 const d=p.design||{},w=d.wardrobe||{};
 const female=d.gender==="female";
 return {
 skin:w.skin||p.main||"#d5a182",hair:w.hair||["#45322a","#6f4935","#3c302b","#966448","#583c35"][p.seed%5],
 jacket:w.clothing||w.shirt||p.coat||"#5685a7",
 pants:w.pants||"#536f8b",shirt:w.shirt||"#f0eee5",shoes:w.shoes||"#eeeae2",
 eye:p.eye||"#493c34",ink:tint(p.ink||"#423b41",-.08),acc:p.accent||"#d8af77",
 female,child:/мальчик|девочка|ребён|ребен|boy|girl|kid|child/i.test(p.str||""),
 longHair:female&&/длинн|long hair|косы|плетён|ponytail/i.test(p.str||""),
 curly:/кудр|curly|волнист|wavy/i.test(p.str||""),
 hat:/шляп|панам|кепк|шапк|hat|cap|bucket/i.test(p.str||""),
 shorts:/шорт|shorts/i.test(p.str||""),
 glasses:/очки|glasses|goggles/i.test(p.str||""),
 pack:/рюкзак|backpack/i.test(p.str||""),
 openJacket:/куртк|рубашк|jack|shirt|ветровк|бомбер|bomber|denim/i.test(p.str||""),
 pattern:(p.seed>>>5)%4,faceType:(p.seed>>>11)%4,hairType:(p.seed>>>13)%5
 };
}
function viewOf(view,direction){
 const directions={up:"back",down:"front",left:"profile",right:"profile",nw:"quarter-back",ne:"quarter-back",sw:"quarter",se:"quarter"};
 if(view==="back"||view==="front")return view;
 if(view==="top")return "top";
 if(view==="side")return directions[direction]||"profile";
 if(view==="iso")return directions[direction]||"quarter";
 return directions[direction]||"front";
}
function drawNeck(g,colors,headX=0){
 const skin=colors.skin;
 shape(g,c=>{c.moveTo(headX-8,-73);c.lineTo(headX-9,-52);c.quadraticCurveTo(headX,-46,headX+9,-52);c.lineTo(headX+8,-73)},
   gradient(g,headX-9,-72,headX+8,-48,tint(skin,.14),tint(skin,-.18)),colors.ink,.95);
}
function hair(g,p,c,view){
 const dark=tint(c.hair,-.26),hi=tint(c.hair,.17);
 const back=view==="back",profile=view==="profile",quarter=view==="quarter"||view==="quarter-back";
 const h=back?17:profile?17:quarter?19:21;
 if(c.longHair){shape(g,z=>{z.moveTo(-h-6,-101);z.quadraticCurveTo(-h-11,-117,0,-125);z.quadraticCurveTo(h+9,-119,h+7,-99);z.lineTo(h+12,-52);z.quadraticCurveTo(7,-45,-3,-58);z.quadraticCurveTo(-10,-43,-h-12,-56);z.closePath()},
 gradient(g,-25,-120,29,-53,hi,dark),c.ink,1.5)}
 if(back){
 shape(g,z=>{z.moveTo(-h-5,-93);z.quadraticCurveTo(-h-9,-113,-5,-121);z.quadraticCurveTo(6,-133,h+6,-113);z.lineTo(h+4,-85);z.quadraticCurveTo(3,-77,-h-4,-85)},
 gradient(g,-h,-122,h,-81,hi,dark),c.ink,1.4);
 for(let j=0;j<4;j++)line(g,[[-13+j*8,-113],[-11+j*8,-97],[-15+j*8,-88]],tint(c.hair,.16),.85);
 return;
 }
 // Hand-drawn asymmetric clumps rather than a perfect elliptical wig.
 shape(g,z=>{
 z.moveTo(-h-5,-103);
 z.quadraticCurveTo(-h-8,-115,-h+3,-117);
 z.quadraticCurveTo(-9,-130,1,-122);
 z.quadraticCurveTo(14,-130,h+7,-113);
 z.quadraticCurveTo(h+13,-104,h+3,-96);
 z.lineTo(h-2,-103);
 z.quadraticCurveTo(12,-100,8,-108);
 z.quadraticCurveTo(-1,-101,-7,-108);
 z.quadraticCurveTo(-15,-101,-h+3,-102);
 z.closePath();
 },gradient(g,-22,-125,23,-96,hi,dark),c.ink,1.6);
 // Hair tufts face towards moving direction and retain identity.
 for(let j=0;j<3;j++){const x=-17+j*11;
 line(g,[[x,-116],[x+6,-121+(j%2)*3],[x+11,-113]],tint(c.hair,.20),1.05)}
 if(profile){
 shape(g,z=>{z.moveTo(-19,-106);z.quadraticCurveTo(-26,-116,-20,-96);z.lineTo(-16,-83);z.quadraticCurveTo(-17,-100,-8,-106)},dark,null);
 }
}
function face(g,p,c,view,expression="neutral",blink=false){
 const profile=view==="profile",back=view==="back",quarter=view==="quarter"||view==="quarter-back";
 const skin=c.skin,ink=tint(c.ink,-.12);
 const h=c.child?22:21,top=-112,bottom=-70,shift=profile?2:0;
 // Ears are tucked into the shape, not detached disks.
 if(c.longHair)hair(g,p,c,view);
 if(profile){
  shape(g,z=>{z.moveTo(-20,-104);z.bezierCurveTo(-21,-119,8,-122,17,-106);z.lineTo(19,-96);z.quadraticCurveTo(24,-91,25,-89);z.quadraticCurveTo(27,-86,20,-84);z.quadraticCurveTo(21,-78,14,-72);z.quadraticCurveTo(-8,-68,-19,-90);z.closePath()},
  gradient(g,-22,-112,25,-76,tint(skin,.17),tint(skin,-.13)),tint(skin,-.34),1.45);
  ellipse(g,-17,-92,4.5,7,tint(skin,-.05),tint(skin,-.26),1);
  ellipse(g,-16,-91,1.5,3,tint(skin,-.24));
 }else{
  shape(g,z=>{z.moveTo(-h,-103);z.quadraticCurveTo(-h-2,-119,0,-119);z.quadraticCurveTo(h+4,-119,h,-98);
   z.quadraticCurveTo(h-1,-76,0,-70);z.quadraticCurveTo(-h+2,-74,-h,-103)},
  gradient(g,-h,-108,h,-76,tint(skin,.16),tint(skin,-.13)),tint(skin,-.34),1.4);
  ellipse(g,-h+2,-94,3.5,5,skin,tint(skin,-.24),.8);
  if(!back)ellipse(g,h-1,-94,3.5,5,skin,tint(skin,-.22),.8);
 }
 if(!back){
  const angry=expression==="angry",sad=expression==="sad",surprise=expression==="surprise";
  const laugh=expression==="laugh",smile=expression==="smile"||laugh;
  const thought=expression==="thinking";
  const eyes=profile?[[10,-96,1]]:quarter?[[-6,-95,.56],[9,-96,1]]:[[-9,-95,1],[9,-95,1]];
  for(const [x,y,sc] of eyes){
   const eyeW=4.2*sc,eyeH=(surprise?5.4:4.6)*sc;
   if(blink||expression==="blink"||laugh){
     line(g,[[x-eyeW,y+.5],[x,y+1.5],[x+eyeW,y+.4]],tint(skin,-.44),1.4);
   }else{
     ellipse(g,x,y,eyeW,eyeH,"#fffcf6",tint(skin,-.35),.85);
     ellipse(g,x+(profile?1.35:thought?1.2:0),y+.65,1.9*sc,2.7*sc,c.eye);
     ellipse(g,x-.4,y-1.3,0.85*sc,1*sc,"#ffffff");
   }
   const browY=y-8.5;
   line(g,[[x-eyeW,browY+(angry?2:sad?-2:0)],[x+eyeW,browY+(angry?-2:sad?2:0)]],tint(c.hair,-.3),angry?2.15:1.45);
  }
  if(profile){line(g,[[19,-89],[23,-88],[19,-86]],tint(skin,-.34),.85)}
  else line(g,[[quarter?5:0,-92],[quarter?7:1,-88],[quarter?5:0,-87]],tint(skin,-.29),.9);
  if(surprise){ellipse(g,profile?16:0,-79,3.8,5.0,"#754844",tint(skin,-.25),.8)}
  else if(laugh){ellipse(g,profile?15:0,-80,7,4.2,"#8c4747",tint(skin,-.25),.8);line(g,[[profile?10:-5,-81],[profile?19:5,-81]],"#fff8e6",1.1)}
  else if(smile){line(g,[[profile?12:-6,-81],[profile?16:0,-79],[profile?19:6,-81]],tint(skin,-.43),1.4)}
  else if(sad){line(g,[[-5,-78],[0,-81],[5,-78]],tint(skin,-.46),1.25)}
  else{line(g,[[profile?12:-3,-80],[profile?18:4,-80]],tint(skin,-.38),1)}
  if(smile||surprise){for(const x of profile?[4]:[-15,15])ellipse(g,x,-82,3,1.6,"#e6978f66")}
 }
 hair(g,p,c,view);
 if(c.glasses&&!back){for(const x of profile?[9]:[-9,9])ellipse(g,x,-96,6,5.1,"#a5d8ee33",tint(c.ink,-.18),1.7)}
 if(c.hat){
  shape(g,z=>{z.moveTo(-26,-112);z.quadraticCurveTo(-25,-133,0,-134);z.quadraticCurveTo(22,-133,25,-112);z.lineTo(33,-109);z.lineTo(-30,-109)},
  gradient(g,-25,-133,27,-109,tint(c.jacket,.35),tint(c.jacket,-.12)),c.ink,1.2);
  line(g,[[-24,-115],[26,-115]],tint(c.jacket,-.34),3.2);
 }
}
function limb(g,a,b,knee,col,ink,width=11){
 const a1=[a.x,a.y],k1=[knee.x,knee.y],b1=[b.x,b.y];
 line(g,[a1,k1,b1],ink,width+3.2);
 line(g,[a1,k1,b1],gradient(g,a.x-6,a.y,knee.x+6,b.y,tint(col,.22),tint(col,-.18)),width);
}
function sleeve(g,shoulder,hand,col,ink,near=false){
 const elbow={x:shoulder.x+(hand.x-shoulder.x)*.56 + (near?4:-3),y:shoulder.y+(hand.y-shoulder.y)*.48};
 limb(g,shoulder,hand,elbow,col,ink,11);
 ellipse(g,hand.x,hand.y-2,7.8,4.3,tint(col,-.28),ink,.7);
 ellipse(g,hand.x,hand.y+7.5,6.5,9,gradient(g,hand.x-5,hand.y,hand.x+6,hand.y+12,tint(near?"#e0bb9f":"#cfa07f",.06),tint(near?"#e0bb9f":"#cfa07f",-.14)),tint("#9a705c",-.05),.75);
 for(const dx of [-3,0,3])line(g,[[hand.x+dx,hand.y+10],[hand.x+dx+.4,hand.y+15]],tint("#b58c75",-.06),.55);
}
function jacket(g,c,profile,quarter,back){
 const hw=profile?14:quarter?25:30,ink=c.ink;
 const top=-52,hem=17;
 shape(g,z=>{z.moveTo(-hw,-52);z.quadraticCurveTo(-hw-4,-32,-hw+2,hem);
 z.quadraticCurveTo(0,hem+4,hw-2,hem);z.quadraticCurveTo(hw+4,-30,hw,-52);z.quadraticCurveTo(0,-65,-hw,-52)},
 gradient(g,-hw,-55,hw,25,tint(c.jacket,.22),tint(c.jacket,-.23)),ink,2);
 // Natural cloth folds make the garment readable without artificial surface noise.
 for(const sg of [-1,1]){
 const ex=sg*(hw-9);
 line(g,[[sg*(hw-6),-30],[ex,-23],[sg*(hw-6),-8]],tint(c.jacket,-.19),1.2);
 line(g,[[sg*(hw-9),-18],[ex+sg*2,-4]],tint(c.jacket,.29),.8);
 }
 if(!back){
 const opening=profile?3:quarter?6:10;
 if(c.openJacket){
 shape(g,z=>{z.moveTo(-opening,-53);z.lineTo(-opening+2,16);z.lineTo(opening-2,16);z.lineTo(opening,-53)},
 gradient(g,-opening,-55,opening,17,tint(c.shirt,.13),tint(c.shirt,-.09)),null);
 line(g,[[-opening,-54],[-opening+1,16]],tint(c.jacket,-.26),1.65);
 if(!profile)line(g,[[opening,-54],[opening-1,16]],tint(c.jacket,-.28),1.65);
 }
 if(profile){line(g,[[7,-40],[12,-3]],tint(c.jacket,-.24),1.3);line(g,[[6,-15],[11,-13]],tint(c.jacket,.4),.7)}
 else{
 for(const sg of [-1,1])line(g,[[sg*(hw-9),-8],[sg*(opening+5),-6]],tint(c.jacket,-.27),1.2);
 }
 }else{
 line(g,[[-hw+2,-41],[0,-46],[hw-2,-41]],tint(c.jacket,-.21),1.2);
 line(g,[[0,-44],[0,12]],tint(c.jacket,-.14),.75);
 }
 line(g,[[-hw+3,hem-3],[hw-3,hem-3]],tint(c.jacket,-.36),2.7);
 line(g,[[-hw*.45,-53],[0,-59],[hw*.45,-53]],tint(c.jacket,-.32),2.9);
}
function leg(g,hip,foot,p,c,profile,back,sg){
 const ink=c.ink,bend=sg*(profile?3:5);
 const knee={x:hip.x+(foot.x-hip.x)*.49+bend,y:hip.y+(foot.y-hip.y)*.5 - (foot.lift||0)*.09};
 limb(g,hip,foot,knee,c.pants,ink,profile?12.5:13.6);
 if(!c.shorts){line(g,[[hip.x+sg*3,hip.y+11],[knee.x+sg*3,knee.y]],tint(c.pants,-.25),1);line(g,[[knee.x-4,knee.y+3],[knee.x+3,knee.y+3]],tint(c.pants,.28),.7)}
 else{
 line(g,[[hip.x,hip.y+7],[knee.x,knee.y-7]],tint(c.skin,-.12),8);
 line(g,[[hip.x-6,hip.y+11],[hip.x+6,hip.y+11]],tint(c.pants,-.20),2);
 }
 const shoeX=foot.x,shoeY=foot.y,forward=profile?16:10;
 shape(g,z=>{z.moveTo(shoeX-8,shoeY-6);z.lineTo(shoeX+7,shoeY-6);
 z.quadraticCurveTo(shoeX+forward+6,shoeY-2,shoeX+forward+3,shoeY+5);
 z.lineTo(shoeX-10,shoeY+5);z.quadraticCurveTo(shoeX-13,shoeY-1,shoeX-8,shoeY-6)},
 gradient(g,shoeX-10,shoeY-8,shoeX+forward+6,shoeY+8,tint(c.shoes,.15),tint(c.shoes,-.22)),ink,1.25);
 line(g,[[shoeX-9,shoeY+4.7],[shoeX+forward+3,shoeY+4.7]],"#85848c",1.7);
 line(g,[[shoeX-1,shoeY-3],[shoeX+7,shoeY-3]],tint(c.shoes,-.35),.9);
}
function weapon(g,p,c,x,y,theta){
 if(!p.weapon)return;
 const ink=c.ink;g.save();g.translate(x,y);g.rotate(theta);
 const wood="#956f4c",metal="#d3dce7";
 if(["sword","axe"].includes(p.weapon)){
 line(g,[[0,5],[3,-31]],wood,4.8);
 if(p.weapon==="sword"){
 shape(g,z=>{z.moveTo(-3,-30);z.lineTo(3,-62);z.lineTo(9,-30)},metal,ink,1.15);
 line(g,[[-8,-28],[15,-28]],"#ecbd6b",3);
 }else shape(g,z=>{z.moveTo(3,-49);z.lineTo(21,-52);z.lineTo(20,-33);z.lineTo(3,-31)},metal,ink,1);
 } else if(p.weapon==="slingshot"){
 line(g,[[0,7],[3,-28]],wood,5);line(g,[[3,-28],[-8,-41]],wood,3);line(g,[[3,-28],[14,-42]],wood,3);line(g,[[-8,-41],[14,-42]],"#edd5a9",1.5);
 } else if(p.weapon==="staff"){
 line(g,[[0,5],[4,-62]],wood,4);ellipse(g,4,-65,6,7,c.acc,ink,1);
 }else if(p.weapon==="gun"){roundRect(g,0,-26,29,11,2,"#62798b",ink,1.1);roundRect(g,6,-17,8,13,2,wood,ink,.8)}
 else if(p.weapon==="shield"){ellipse(g,5,-17,17,23,tint(c.jacket,.15),ink,1.8);line(g,[[5,-35],[5,-4]],"#e6c67d",2)}
 else{line(g,[[0,5],[4,-43]],wood,4);line(g,[[4,-43],[16,-17],[4,7]],wood,2)}
 g.restore()
}
function portrait(g,p,c,dir,index){
 const expr=["smile","laugh","surprise","neutral","sad","angry","blink","thinking"][index%8];
 g.save();g.translate(0,36);g.scale(2.0,2.0);
 jacket(g,c,false,false,false);drawNeck(g,c);face(g,p,c,dir==="back"?"back":dir==="profile"?"profile":"front",expr,expr==="blink");
 g.restore();
}
function render(p,action,index,total,direction,style,size,view){
 if(!HUMANS.has(p.kind)||view==="top")return previous.render(p,action,index,total,direction,style,size,view);
 const config=palette(p);
 const v=viewOf(view,direction);
 const profile=v==="profile",quarter=v==="quarter"||v==="quarter-back",back=v==="back";
 const isLeft=["left","nw","sw"].includes(direction);
 const expr=action==="expressions";
 const pose=root.SpriteForgePoseV4.sample(action,index,total);
 const cv=document.createElement("canvas");cv.width=320;cv.height=320;
 const g=cv.getContext("2d");g.imageSmoothingEnabled=true;
 g.translate(156,178);
 if(isLeft&&profile)g.scale(-1,1);
 // In expressions mode the eight frames represent genuinely different mouth/eye poses.
 if(expr){
  portrait(g,p,config,v,index);
 }else{
  g.translate(0,pose.bob);
  const arm=pose.arm||0, moving=pose.type==="walk"||pose.type==="run";
  const hipY=20,front=profile?4:quarter?11:14;
  const leftFoot=pose.feet.left,rightFoot=pose.feet.right;
  // Signed foot positions account for stance and swing phase. Hand and shoulder
  // use the same action curve, rather than independent sine motions.
  let fl={x:profile?leftFoot.x*.69:leftFoot.x*.84,y:leftFoot.y+6,lift:leftFoot.lift||0};
  let fr={x:profile?rightFoot.x*.69:rightFoot.x*.84,y:rightFoot.y+6,lift:rightFoot.lift||0};
  if(pose.type==="idle"){fl.x=profile?-6:-15;fr.x=profile?6:15;}
  if(pose.type==="jump"){fl.y-=pose.crouch*.48;fr.y-=pose.crouch*.48;}
  if(pose.type==="death"){g.translate(0,Math.min(25,pose.crouch));g.rotate(pose.lean*.8)}
  const lean=pose.type==="run"?-.085:pose.lean*.20;
  // Neck and head lean with torso, never float above it.
  g.save();g.rotate(lean);
  const nearX=profile?12:quarter?22:29;
  const nearHand={x:profile?18+arm*.28:nearX+7+arm*.25,y:2+(moving?-Math.cos(pose.phase)*5:0)};
  const farHand={x:profile?-6:-(nearX+8)+arm*.2,y:4+(moving?Math.cos(pose.phase)*5:0)};
  if(pose.type==="attack"){nearHand.x+=pose.attackReach*.38;nearHand.y-=8+Math.sin(pose.t*Math.PI)*15}
  if(pose.type==="jump"){nearHand.y=-26;farHand.y=-21}
  if(pose.type==="cast"){nearHand.y=-22;farHand.y=-17}
  const shoulder=profile?11:nearX;
  if(config.pack){roundRect(g,profile?-15:-29,-40,16,31,4,"#a68463",config.ink,1.4)}
  sleeve(g,{x:-shoulder,y:-43},farHand,config.jacket,config.ink,false);
  jacket(g,config,profile,quarter,back);
  drawNeck(g,config);
  face(g,p,config,v,(p.design?.expression||"neutral"),pose.type==="idle"&&Math.sin(pose.phase)>0.95);
  if(p.scarf){line(g,[[-18,-63],[18,-63]],tint(p.scarf,-.12),5);line(g,[[16,-61],[23,-43]],p.scarf,6)}
  sleeve(g,{x:shoulder,y:-43},nearHand,config.jacket,config.ink,true);
  weapon(g,p,config,nearHand.x+6,nearHand.y,pose.type==="attack"?pose.attackAngle*.55:0);
  g.restore();
  // Legs use actual foot targets from the action's motion curve.
  const hipLeft={x:profile?-5:-front,y:hipY},hipRight={x:profile?5:front,y:hipY};
  leg(g,hipLeft,fl,p,config,profile,back,-1);
  leg(g,hipRight,fr,p,config,profile,back,1);
  if(!profile){
    line(g,[[-front+1,23],[front-1,23]],tint(config.pants,-.2),2);
    if(back)for(const s of [-1,1]){
      roundRect(g,s*13-8,28,14,9,2,tint(config.pants,.08),tint(config.pants,-.23),.75)
    }
  }
 }
 const out=document.createElement("canvas");out.width=size;out.height=size;
 const a=out.getContext("2d"),pixel=["16bit","retro","cozy","dark","cute"].includes(style);
 if(pixel){
  const n=Math.max(16,Math.min(size,style==="retro"?44:style==="16bit"?72:86));
  const temp=document.createElement("canvas");temp.width=n;temp.height=n;
  temp.getContext("2d").drawImage(cv,0,0,n,n);
  a.imageSmoothingEnabled=false;a.drawImage(temp,0,0,size,size);
 }else{a.imageSmoothingEnabled=true;a.imageSmoothingQuality="high";a.drawImage(cv,0,0,size,size)}
 return out;
}
const previous=root.SpriteForgeIllustrator;
root.SpriteForgeIllustrator={render,version:"7.0.0"};
root.SpriteForgeCartoonV7={render,version:"7.0.0",emotions:["smile","laugh","surprise","neutral","sad","angry","blink","thinking"]};
})(window);
