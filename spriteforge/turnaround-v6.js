/* SpriteForge V6 · anatomical turnaround for game-ready humanoid characters.
 * Original procedural Canvas geometry: distinct true front, profile and rear views.
 * One persistent skeleton/wardrobe across viewpoints and animation frames.
 * Offline and deterministic. Not photorealistic neural inference.
 */
(function(root){"use strict";
const TAU=2*Math.PI,humans=new Set(["human","knight","wizard","pirate","ninja","elf"]);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const col=(hex,t)=>{if(!/^#[0-9a-f]{6}$/i.test(hex||""))hex="#9b785c";const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return "#"+v.map(n=>Math.round(clamp(n+(t>=0?(255-n)*t:n*t),0,255)).toString(16).padStart(2,"0")).join("")};
function grad(g,x,y,X,Y,a,b){const q=g.createLinearGradient(x,y,X,Y);q.addColorStop(0,a);q.addColorStop(1,b);return q}
function form(g,fn,fill,edge="#363743",width=2){g.beginPath();fn(g);g.closePath();g.fillStyle=fill;g.fill();if(edge){g.strokeStyle=edge;g.lineWidth=width;g.lineJoin="round";g.lineCap="round";g.stroke()}}
function stroke(g,arr,color,width=2){g.beginPath();g.moveTo(arr[0][0],arr[0][1]);for(let i=1;i<arr.length;i++)g.lineTo(arr[i][0],arr[i][1]);g.strokeStyle=color;g.lineWidth=width;g.lineCap="round";g.lineJoin="round";g.stroke()}
function oval(g,x,y,rx,ry,color,edge=null,w=1.5){g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fillStyle=color;g.fill();if(edge){g.strokeStyle=edge;g.lineWidth=w;g.stroke()}}
function rect(g,x,y,w,h,r,color,edge=null,lineWidth=1){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=color;g.fill();if(edge){g.strokeStyle=edge;g.lineWidth=lineWidth;g.stroke()}}
function poly(g,pts,c,e,w=1.7){form(g,p=>{p.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)p.lineTo(...pts[i])},c,e,w)}
function drawHead(g,p,view,w,pose,ink){
 const back=view==="back",side=view==="profile",quarter=view==="quarter";
 const skin=p.main||"#d1a58a",hair=w.hair||"#49362a";
 const face=col(skin,-.10),hairHi=col(hair,.20),hairDark=col(hair,-.20);
 const hx=side?14:quarter?18:20,top=-116,chin=-79;
 // Neck is physically connected to the upper garment.
 form(g,q=>{q.moveTo(-8,-88);q.lineTo(-10,-62);q.quadraticCurveTo(0,-55,11,-63);q.lineTo(8,-89)},grad(g,-8,-87,13,-63,col(skin,.10),col(skin,-.22)),ink,1.2);
 if(side){
  // Full anatomical outline facing RIGHT: forehead -> nose bridge -> tip -> lips -> chin.
  form(g,q=>{q.moveTo(-17,-105);q.bezierCurveTo(-16,-124,9,-126,17,-110);
    q.lineTo(18,-102);q.quadraticCurveTo(20,-98,25,-94);q.quadraticCurveTo(28,-91,21,-90);
    q.quadraticCurveTo(23,-86,19,-84);q.quadraticCurveTo(19,-78,11,-76);
    q.quadraticCurveTo(-12,-76,-18,-94);q.closePath()},
    grad(g,-18,-113,27,-82,col(skin,.15),col(skin,-.16)),ink,1.4);
  oval(g,-15,-96,4,7,col(skin,-.02),ink,1);
  oval(g,-14,-97,1.7,3,col(skin,-.20));
  stroke(g,[[9,-102],[16,-102]],hairDark,1.4);
  oval(g,16,-99,1.9,1.8,"#34313a");
  stroke(g,[[18,-88],[22,-87]],col(skin,-.33),1.1);
  if(p.beard)stroke(g,[[21,-87],[16,-79],[7,-78]],hairDark,2.2);
 }else{
  form(g,q=>{q.moveTo(-hx,-107);q.quadraticCurveTo(-hx-2,-120,-6,-120);
    q.quadraticCurveTo(hx+5,-124,hx+2,-105);q.lineTo(hx-1,-91);
    q.quadraticCurveTo(15,-76,0,-77);q.quadraticCurveTo(-17,-78,-hx+1,-93);q.closePath()},
    grad(g,-hx,-112,hx,-85,col(skin,.15),col(skin,-.13)),ink,1.4);
  if(!back){
    // Small, natural human facial landmarks, not two large toy-like round eyes.
    for(const sign of [-1,1]){
      const x=sign*(quarter?7:9)+(quarter?4:0);
      stroke(g,[[x-3,-102],[x+3,-102]],hairDark,1.4);
      oval(g,x,-99,2.05,1.35,"#37313a");
      oval(g,x-.5,-99.5,.65,.55,"#ece8e2");
    }
    stroke(g,[[quarter?5:0,-98],[quarter?7:2,-92],[quarter?9:4,-91]],col(skin,-.29),1.15);
    stroke(g,[[quarter?-1:-4,-85],[quarter?8:5,-85]],col(skin,-.33),1.2);
    if(p.beard){stroke(g,[[-13,-86],[-9,-81],[0,-78],[10,-81],[14,-86]],col(hair,-.10),2.2)}
    if(p.design?.expression==="smile")stroke(g,[[-3,-86],[2,-83],[7,-86]],col(skin,-.32),1.15);
  }
 }
 // Hair contours must follow the selected viewpoint. Rear view has no eyes/eyebrows/nose.
 if(back){
  form(g,q=>{q.moveTo(-hx-2,-98);q.quadraticCurveTo(-hx-4,-120,-11,-121);
    q.bezierCurveTo(-5,-130,18,-125,hx+3,-107);q.lineTo(hx+1,-89);
    q.quadraticCurveTo(9,-82,0,-82);q.quadraticCurveTo(-11,-86,-hx-1,-89);q.closePath()},
    grad(g,-20,-125,20,-85,hairHi,hairDark),ink,1.5);
  for(const d of [-12,-6,2,10])stroke(g,[[d,-118],[d+4,-105],[d+1,-91]],col(hair,.11),.9);
 }else if(side){
  form(g,q=>{q.moveTo(-19,-100);q.quadraticCurveTo(-24,-124,-5,-124);
    q.quadraticCurveTo(18,-131,19,-109);q.lineTo(17,-105);
    q.quadraticCurveTo(3,-115,-2,-111);q.lineTo(-12,-106);q.lineTo(-17,-89);q.closePath()},
    grad(g,-17,-125,17,-100,hairHi,hairDark),ink,1.35);
  stroke(g,[[-11,-118],[1,-121],[11,-117]],col(hair,.26),.85);
 }else{
  form(g,q=>{q.moveTo(-hx-1,-101);q.quadraticCurveTo(-hx-5,-122,-8,-122);
    q.quadraticCurveTo(1,-131,16,-121);q.quadraticCurveTo(hx+5,-117,hx+3,-105);
    q.lineTo(hx-2,-102);q.quadraticCurveTo(3,-115,-7,-108);q.lineTo(-hx+3,-101);q.closePath()},
    grad(g,-21,-122,23,-100,hairHi,hairDark),ink,1.35);
  stroke(g,[[-11,-119],[-3,-117],[9,-120],[15,-115]],col(hair,.27),1);
 }
}
function jeanLeg(g,p,v,pose,sg,w,ink){
 const profile=v==="profile",back=v==="back",quarter=v==="quarter",mat=w.pants||"#617b90";
 const hipX=profile?sg*4:sg*(quarter?12:15);
 const ft=pose.feet?.[sg<0?"left":"right"]||{x:sg*13,y:88,contact:true};
 // Each toe/ankle is connected to a fixed pelvis; knee bends smoothly as foot moves.
 const toeX=profile?ft.x*.67:ft.x*.86,ankleX=toeX+(profile?sg*1:0),ay=ft.y+6;
 const kneeX=hipX+(ankleX-hipX)*.46+sg*(profile?1.5:3),ky=54-(ft.lift||0)*.2;
 const thick=profile?7.5:9.8;
 form(g,q=>{q.moveTo(hipX-thick,15);q.quadraticCurveTo(kneeX-thick-2,38,kneeX-thick,ky);
    q.quadraticCurveTo(ankleX-thick,ay-24,ankleX-thick*.94,ay-7);
    q.lineTo(ankleX+thick*.87,ay-7);
    q.quadraticCurveTo(kneeX+thick+1,ky+7,kneeX+thick,ky-4);
    q.quadraticCurveTo(hipX+thick,29,hipX+thick,15);q.closePath()},
    grad(g,hipX-thick,23,hipX+thick,ay,col(mat,.17),col(mat,-.24)),ink,1.9);
 stroke(g,[[hipX+3,22],[kneeX+4,ky],[ankleX+3,ay-9]],col(mat,-.19),1.25);
 stroke(g,[[kneeX-3,ky+12],[kneeX+5,ky+10]],col(mat,.16),1.1);
 if(back){stroke(g,[[hipX-4,25],[kneeX-5,ky-7]],col(mat,.11),.85)}
 // Foot profile: forward-pointing shoe, visible sole, heel and toe cap.
 const sole=w.shoes||"#eae6da";
 const toew=(profile?16:11)*(w.morph?.shoes||1);
 form(g,q=>{q.moveTo(ankleX-9,ay-9);q.lineTo(ankleX+7,ay-9);
   q.quadraticCurveTo(ankleX+toew+4,ay-7,ankleX+toew+3,ay+2);
   q.lineTo(ankleX-10,ay+3);q.closePath()},
   grad(g,ankleX-11,ay-10,ankleX+toew,ay+4,col(sole,.14),col(sole,-.25)),ink,1.6);
 stroke(g,[[ankleX-9,ay+2],[ankleX+toew+3,ay+2]],"#6f6d6b",2.1);
 stroke(g,[[ankleX,ay-5],[ankleX+7,ay-4]],col(sole,-.35),1.1);
}
function cuffsAndHands(g,skin,sx,sy,ex,ey,coat,ink,profile){
 const elbowX=sx+(ex-sx)*.42+(sx<0?-2:2),elbowY=sy+(ey-sy)*.42;
 stroke(g,[[sx,sy],[elbowX,elbowY],[ex,ey]],ink,profile?17:18);
 stroke(g,[[sx,sy],[elbowX,elbowY],[ex,ey]],grad(g,sx-5,sy-8,ex+6,ey+9,col(coat,.20),col(coat,-.23)),profile?14:15);
 // Cloth folds and sleeve cuff; both follow the same wrist on every frame.
 oval(g,ex,ey-5,8,5,col(coat,-.22),ink,1);
 oval(g,ex,ey+5,6.2,9,grad(g,ex-7,ey,ex+7,ey+15,col(skin,.17),col(skin,-.12)),ink,1);
 for(let d=-3;d<=3;d+=3)stroke(g,[[ex+d,ey+5],[ex+d+1,ey+11]],col(skin,-.16),.6);
 stroke(g,[[sx-3,sy+13],[sx+3,sy+9]],col(coat,.23),1.3);
}
function garment(g,p,v,w,ink){
 const back=v==="back",profile=v==="profile",quarter=v==="quarter";
 const coat=w.jacket||"#a66a47",shirt=w.shirt||"#ede9e1",hw=profile?17:quarter?27:33;
 const upper=-61,lower=19;
 const shapeFn=q=>{q.moveTo(-hw,upper+5);q.quadraticCurveTo(-hw-5,-45,-hw+2,-6);
    q.lineTo(-hw+3,lower);q.quadraticCurveTo(0,lower+4,hw-3,lower);
    q.lineTo(hw-1,-5);q.quadraticCurveTo(hw+4,-46,hw,upper+5);
    q.quadraticCurveTo(1,-73,-hw,upper+5)};
 form(g,shapeFn,grad(g,-hw,-62,hw,23,col(coat,.22),col(coat,-.24)),ink,2.5);
 if(profile){
  // Side jacket: slim silhouette, one pocket, one central seam along visible chest.
  stroke(g,[[hw-5,-48],[hw-3,12]],col(coat,-.35),2.5);
  stroke(g,[[-5,-9],[7,-7],[8,0]],col(coat,-.30),1.5);
  stroke(g,[[-8,-51],[7,-55],[hw-1,-51]],col(coat,.24),2);
  stroke(g,[[-hw+4,11],[hw-2,11]],col(coat,-.26),3.4);
  stroke(g,[[hw-9,-13],[hw-5,-2]],col(coat,.3),1.3);
 }else if(back){
  // True reverse: shoulder yoke, center back seam and back-side cloth folds.
  stroke(g,[[-hw+3,-48],[0,-54],[hw-3,-48]],col(coat,-.25),1.9);
  stroke(g,[[0,-52],[0,6]],col(coat,-.10),1.0);
  stroke(g,[[-hw+9,-32],[-hw+13,-11]],col(coat,.2),1.2);
  stroke(g,[[hw-9,-32],[hw-13,-12]],col(coat,-.27),1.2);
  stroke(g,[[-hw+3,11],[hw-3,12]],col(coat,-.30),3.4);
 }else{
  // Front jacket: inner shirt, two different lapels, zip and pocket seams.
  const gap=quarter?6:9;
  form(g,q=>{q.moveTo(-gap,-58);q.lineTo(-gap+1,14);q.lineTo(gap-1,14);q.lineTo(gap,-58)},
    grad(g,-gap,-60,gap,20,col(shirt,.12),col(shirt,-.11)),null);
  stroke(g,[[-gap,-57],[-gap+1,14]],col(coat,-.31),2.3);
  stroke(g,[[gap,-57],[gap-1,14]],col(coat,-.31),2.3);
  poly(g,[[-hw+4,-56],[-gap,-55],[-gap-1,-32],[-hw+10,-41]],col(coat,.29),col(coat,-.19),1);
  poly(g,[[hw-4,-56],[gap,-55],[gap+1,-32],[hw-10,-42]],col(coat,.15),col(coat,-.19),1);
  for(const side of [-1,1]){
    stroke(g,[[side*(hw-8),-2],[side*(gap+6),0]],col(coat,-.31),1.35);
    stroke(g,[[side*(hw-8),-4],[side*(gap+6),-5]],col(coat,.25),.9);
  }
  oval(g,0,8,1.3,1.3,"#ded5c2");
 }
 // Bottom ribbing and physically connected collar.
 stroke(g,[[-hw+3,lower-3],[hw-3,lower-2]],col(coat,-.37),4.1);
 if(profile)poly(g,[[-13,-56],[2,-65],[hw,-56],[7,-50]],col(coat,-.29),ink,1.2);
 else poly(g,[[-19,-58],[-10,-69],[0,-62],[10,-69],[20,-58],[0,-53]],col(coat,-.26),ink,1.2);
}
function jeanBackDetails(g,v,w,ink){
 if(v!=="back")return;
 const j=w.pants||"#617b90";
 for(const s of [-1,1]){
  form(g,q=>{q.moveTo(s*4,21);q.lineTo(s*24,21);q.lineTo(s*23,38);q.quadraticCurveTo(s*16,42,s*7,36);q.closePath()},
    col(j,.06),col(j,-.20),1.1);
  stroke(g,[[s*6,25],[s*15,29],[s*22,25]],col(j,.25),.9);
 }
 stroke(g,[[0,20],[0,32]],col(j,-.21),1);
}
function drawWeapon(g,p,x,y,pose,ink){
 if(!p.weapon)return;
 g.save();g.translate(x,y);g.rotate(pose.type==="attack"?pose.attackAngle*.52:0);
 const wood="#806344",metal="#dde4e6";
 switch(p.weapon){
 case "sword":case "axe":
  stroke(g,[[0,9],[1,-40]],wood,5);
  if(p.weapon==="sword"){poly(g,[[-4,-40],[1,-72],[8,-40]],metal,ink,1.4);stroke(g,[[-8,-36],[10,-36]],"#e3bb72",3)}
  else poly(g,[[0,-47],[18,-54],[17,-29],[0,-31]],metal,ink,1.4);
  break;
 case "slingshot":stroke(g,[[0,10],[2,-29]],wood,5);stroke(g,[[2,-29],[-8,-43]],wood,3.7);stroke(g,[[2,-29],[15,-43]],wood,3.7);stroke(g,[[-8,-43],[15,-43]],"#e8d3b0",1.4);break;
 case "staff":stroke(g,[[0,8],[4,-58]],wood,4);oval(g,4,-61,6,8,p.accent,ink,1);break;
 case "gun":rect(g,-1,-23,27,11,2,"#627587",ink,1);rect(g,3,-14,7,12,2,wood,ink,1);break;
 case "shield":oval(g,4,-22,19,26,col(p.coat,.17),ink,2.2);stroke(g,[[3,-34],[3,-10]],"#e7c886",2);break;
 case "bow":case "crossbow":stroke(g,[[0,10],[3,-45]],wood,4);stroke(g,[[3,-45],[23,-20],[3,3]],wood,2);stroke(g,[[3,-45],[3,3]],"#e8d8ae",1);break;
 default:stroke(g,[[0,8],[6,-41]],wood,4);
 }
 g.restore();
}
function render(p,action,index,total,d,style,size,view="side",mode="right"){
 if(!humans.has(p.kind)||view==="top")return previous.render(p,action,index,total,d,style,size,view,mode);
 const v=root.SpriteForgeTurnaroundV5.direction(view,d,mode),faceLeft=["left","nw","sw"].includes(d);
 const features=root.SpriteForgeLearning?.vector(p.seed)||Array(8).fill(0);
 const morph={head:1+features[0]*.08,shoulders:1+features[1]*.065,legs:1+features[2]*.055,shoes:1+features[7]*.10};
 const pose=root.SpriteForgePoseV4.sample(action,index,total),w={...root.SpriteForgeWardrobeV6?.(p)};
 if(!w.jacket)w.jacket=p.design?.wardrobe?.clothing||p.coat;
 if(!w.pants)w.pants=p.design?.wardrobe?.pants||"#617b90";
 if(!w.shoes)w.shoes=p.design?.wardrobe?.shoes||"#eae6d8";
 if(!w.shirt)w.shirt=p.design?.wardrobe?.shirt||"#efece7";
 if(!w.hair)w.hair=p.design?.wardrobe?.hair||"#483529";
 w.morph=morph;
 const ink=col(p.ink,-.25),skin=p.main;
 const art=document.createElement("canvas");art.width=300;art.height=300;
 const g=art.getContext("2d");g.imageSmoothingEnabled=true;g.imageSmoothingQuality="high";
 g.translate(150,147);
 const scale=p.giant?1.07:p.small?.93:1;
 g.scale(scale,scale);if(faceLeft&&v!=="back"&&v!=="front")g.scale(-1,1);
 g.translate(0,pose.bob||0);
 if(pose.type==="death"){g.translate(0,(pose.crouch||0));g.rotate((pose.lean||0)*.72)}
 // Layered legs: rear leg behind near leg, with one contact baseline per frame.
 g.save();g.scale(morph.legs,1);
 jeanLeg(g,p,v,pose,-1,w,ink);
 jeanLeg(g,p,v,pose,1,w,ink);
 g.restore();
 if(v==="back"&&p.cape){
  form(g,q=>{q.moveTo(-30,-54);q.lineTo(-40,15);q.quadraticCurveTo(0,24,40,15);q.lineTo(30,-54)},col(w.jacket,-.26),ink,2);
 }
 // Far sleeve is obscured behind chest in profile.
 const profile=v==="profile",quarter=v==="quarter",back=v==="back";
 let armSwing=(pose.arm||0)*.31;
 let frontWrist,backWrist;
 if(profile){
  backWrist={x:-8-armSwing*.38,y:7};
  frontWrist={x:15-armSwing,y:6};
 }else{
  const shoulder=quarter?23:30;
  backWrist={x:-shoulder-10-armSwing,y:5+Math.sin(pose.phase)*3};
  frontWrist={x:shoulder+10-armSwing,y:5-Math.sin(pose.phase)*3};
 }
 if(pose.type==="attack"){
  frontWrist.x+=(pose.attackReach||0)*.34;
  frontWrist.y-=15+Math.sin(pose.t*Math.PI)*15;
 }
 const shoulderX=(profile?10:quarter?23:30)*morph.shoulders;
 cuffsAndHands(g,skin,-shoulderX,-47,backWrist.x,backWrist.y,col(w.jacket,-.04),ink,profile);
 g.save();g.scale(morph.shoulders,1);garment(g,p,v,w,ink);g.restore();
 jeanBackDetails(g,v,w,ink);
 // Foreground head contains the true front, profile or rear face.
 g.save();g.translate(0,-94);g.scale(morph.head,morph.head);g.translate(0,94);drawHead(g,p,v,w,pose,ink);g.restore();
 cuffsAndHands(g,skin,shoulderX,-47,frontWrist.x,frontWrist.y,w.jacket,ink,profile);
 if(p.scarf){
  stroke(g,[[profile?-12:-22,-65],[profile?12:22,-65]],col(p.scarf,-.1),4.7);
  if(!back)poly(g,[[6,-63],[17,-58],[18,-38],[11,-43]],p.scarf,ink,1.1);
 }
 // Equipment follows the same wrist as the arm, not a fixed screen coordinate.
 drawWeapon(g,p,frontWrist.x+7,frontWrist.y,pose,ink);
 const out=document.createElement("canvas");out.width=size;out.height=size;
 const fc=out.getContext("2d"),pixel=["16bit","retro","cozy","dark","cute"].includes(style);
 if(pixel){
  const n=Math.min(size,style==="retro"?44:style==="16bit"?72:92),small=document.createElement("canvas");small.width=n;small.height=n;
  const sc=small.getContext("2d");sc.imageSmoothingEnabled=true;sc.drawImage(art,0,0,n,n);
  fc.imageSmoothingEnabled=false;fc.drawImage(small,0,0,size,size);
 }else{fc.imageSmoothingEnabled=true;fc.imageSmoothingQuality="high";fc.drawImage(art,0,0,size,size)}
 return out;
}
const previous=root.SpriteForgeIllustrator;
root.SpriteForgeIllustrator={render,version:"6.0.0"};
root.SpriteForgeTurnaroundV6={render,version:"6.0.0"};
})(window);
