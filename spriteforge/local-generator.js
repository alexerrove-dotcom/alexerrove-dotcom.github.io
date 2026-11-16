/* SpriteForge Local — independent, fully offline prompt-directed sprite synthesis.
 * All art is drawn on-device using Canvas 2D. No remote calls and no AI model downloads.
 * This is a compositional generative graphics engine, not a pretrained diffusion neural net.
 */
(function(global){
"use strict";
const animalWords=[
 ["fox",/лис|лиса|лисиц|fox|vulpine/i],
 ["wolf",/волк|волчи|wolf/i],
 ["cat",/кот|кошк|кошка|cat|feline/i],
 ["dog",/собак|пёс|пес|щен|dog|puppy/i],
 ["rabbit",/крол|зай|rabbit|bunny|hare/i],
 ["bear",/медвед|мишк|bear/i],
 ["squirrel",/белк|squirrel/i],
 ["mouse",/мыш|mouse|rat/i],
 ["frog",/лягуш|жаб|frog|toad/i],
 ["bird",/птиц|птица|bird|owl|сов/i],
 ["dragon",/дракон|dragon/i],
 ["robot",/робот|робо|robot|андроид/i],
 ["zombie",/зомб|zombie/i],
 ["skeleton",/скелет|skeleton/i],
 ["slime",/слизь|слизн|slime/i],
 ["knight",/рыцар|knight|паладин/i],
 ["wizard",/маг|волшеб|wizard|mage|sorcerer|колдун/i],
 ["pirate",/пират|pirate/i],
 ["ninja",/ниндзя|ninja/i],
 ["astronaut",/космонавт|astronaut|spaceman/i],
 ["elf",/эльф|elf/i],
 ["human",/человек|девушк|парен|мужчин|женщин|воин|солдат|human|warrior|girl|boy|hero/i]
];
const colors=[
 ["red",/красн|алый|red|crimson|scarlet/i,"#de5a53"],
 ["orange",/оранж|рыж|orange|ginger/i,"#e68c42"],
 ["yellow",/жёлт|желт|золот|yellow|gold/i,"#f3c95d"],
 ["green",/зелён|зелен|green|emerald/i,"#57a981"],
 ["blue",/голуб|син|blue|azure|cyan/i,"#5ba9d6"],
 ["purple",/фиолет|сирен|purple|violet/i,"#a27ac8"],
 ["pink",/розов|pink/i,"#e9a3c4"],
 ["white",/бел|white/i,"#f0e7db"],
 ["black",/чёрн|черн|black/i,"#3f4656"],
 ["brown",/коричн|бур|brown/i,"#a97a55"]
];
const palettes={
 fox:["#e58c44","#fff0cf","#4a936a","#473c47"],
 wolf:["#919ca6","#e2ded5","#607d8e","#344b5b"],
 cat:["#be9b70","#f6ead9","#7779a4","#473f56"],
 dog:["#b78c63","#f1ddbd","#608e81","#4c4650"],
 rabbit:["#e1c3b8","#fff1e7","#83a58a","#655268"],
 bear:["#8d6655","#d8b998","#688482","#463d46"],
 squirrel:["#b96a45","#f7d6ac","#768e54","#594247"],
 mouse:["#a9a1a6","#f2e1d6","#8478a7","#554d61"],
 frog:["#80b45e","#b8df83","#698e9d","#38544e"],
 bird:["#b58e58","#f8d5a0","#5e90b9","#3b5367"],
 dragon:["#70a681","#a9ce92","#8062a9","#384b55"],
 robot:["#94b2ce","#c9e5e9","#6c7d9d","#2e5265"],
 zombie:["#91ae7f","#c7d8a3","#77627a","#465a4a"],
 skeleton:["#e3d7ba","#faf2e4","#678690","#46515b"],
 slime:["#71d4b8","#d1fff0","#579eb2","#286759"],
 knight:["#a4b9c9","#dcebf5","#60859b","#34485b"],
 wizard:["#d2ac95","#e8d7c6","#785baf","#4b396f"],
 pirate:["#cc9b78","#f0d6b7","#5c667f","#353b4f"],
 ninja:["#b7a195","#e7cfbe","#505570","#303445"],
 astronaut:["#c9d6df","#edf7fa","#e79a5b","#475a79"],
 elf:["#cda98a","#efd5ba","#5c9a7c","#4b6554"],
 human:["#cca283","#edcbb0","#728cb3","#3e485a"]
};
const itemTests=[
 ["slingshot",/рогатк|slingshot/i],
 ["crossbow",/арбалет|crossbow/i],
 ["bow",/лук\b|стрел|bow|archer/i],
 ["sword",/меч|клинок|sword|blade|katana/i],
 ["axe",/топор|axe/i],
 ["gun",/пистолет|автомат|ружь|бластер|gun|pistol|blaster/i],
 ["staff",/посох|жезл|staff|wand/i],
 ["shield",/щит|shield/i],
 ["lantern",/фонарь|lamp|lantern/i],
 ["pickaxe",/кирка|pickaxe/i]
];
function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let state=seed>>>0;return ()=>{state+=0x6D2B79F5;let v=state;v=Math.imul(v^(v>>>15),v|1);v^=v+Math.imul(v^(v>>>7),v|61);return ((v^(v>>>14))>>>0)/4294967296}}
function firstMatch(str,words,otherwise){for(const [name,re] of words){if(re.test(str))return name}return otherwise}
function chooseColor(str,seed,defaultColor){for(const [,re,value] of colors)if(re.test(str))return value;return defaultColor}
function hexRgb(value){let v=value.replace("#","");if(v.length===3)v=[...v].map(x=>x+x).join("");return [parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16)]}
function colorShade(v,m){const a=hexRgb(v);return "#"+a.map(n=>Math.min(255,Math.max(0,Math.round(n*m))).toString(16).padStart(2,"0")).join("")}
function pickField(str,re,def){const m=str.match(re);return m?m[1]:def}
function parse(prompt){
const str=String(prompt||"").toLowerCase().slice(0,900);
let kind=firstMatch(str,animalWords,"human"),p=palettes[kind],seed=hash(str);
const main=chooseColor(str,seed,p[0]);
let coat=p[2],scarf=null,hat=false,cape=false,bag=false,armor=false,skirt=false,glasses=false;
const scarfMention=str.match(/(?:шарф|scarf)[^.!,;]{0,25}|(?:красный|зелёный|синий|жёлтый|фиолетовый|оранжевый|red|green|blue|yellow|purple)[\s-]+(?:шарф|scarf)/i);
if(/шарф|scarf/i.test(str))scarf=chooseColor(scarfMention?.[0]||str,seed,"#cf5249");
const clothMention=str.match(/(?:плащ|куртк|броня|одежд|shirt|dress|robe)[^.!,;]{0,25}/i);
if(clothMention)coat=chooseColor(clothMention[0],seed,coat);
hat=/шляп|шапк|hat|cap\b/i.test(str);
cape=/плащ|мантия|cape|cloak|mantle/i.test(str);
bag=/рюкзак|сумк|backpack|bag/i.test(str);
armor=/брон|доспех|armor|armour|plate/i.test(str)||kind==="knight"||kind==="astronaut";
skirt=/плать|юбк|dress|skirt/i.test(str);
glasses=/очк|glasses|goggles/i.test(str);
const weapon=firstMatch(str,itemTests,kind==="knight"?"sword":kind==="wizard"?"staff":kind==="pirate"?"sword":null);
const horns=/рог|horn/i.test(str)||kind==="dragon";
const wings=/крыл|wing/i.test(str)||kind==="dragon"||kind==="bird";
const beard=/бород|beard/i.test(str);
const spiky=/колюч|шип|spiky/i.test(str);
const giant=/гигант|огром|giant|huge/i.test(str);
const small=/малень|малыш|mini|tiny|baby|милый|cute/i.test(str);
return {str,kind,main,light:p[1],coat,ink:p[3],scarf,hat,cape,bag,armor,skirt,glasses,weapon,horns,wings,beard,spiky,giant,small,seed,accent:["#f7c46c","#edb2a8","#9bd2c7","#b6a8e8"][seed%4],eye:seed%5===0?"#3b816b":"#2d3343",spot:seed%3===0,freckles:seed%2===0,texture:seed%4};
}
function createCanvas(w,h){const cv=document.createElement("canvas");cv.width=w;cv.height=h;return cv}
function poly(ctx,pts,col,stroke){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.fillStyle=col;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2.5;ctx.lineJoin="round";ctx.stroke()}}
function ellipse(ctx,x,y,rx,ry,fill,stroke,sw=2){ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke()}}
function limb(ctx,a,b,thick,col,outline){ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.strokeStyle=outline;ctx.lineWidth=thick+4;ctx.stroke();ctx.strokeStyle=col;ctx.lineWidth=thick;ctx.stroke()}
function rect(ctx,x,y,w,h,fill,outline,r=0){ctx.beginPath();if(r&&ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fillStyle=fill;ctx.fill();if(outline){ctx.strokeStyle=outline;ctx.lineWidth=2.5;ctx.stroke()}}
function shapeFace(ctx,p,back){
const k=p.kind,fur=p.main,light=p.light,ink=p.ink;
if(k==="slime"){ellipse(ctx,0,-8,27,27,fur,ink);ellipse(ctx,-8,-16,8,8,light);ellipse(ctx,10,-5,8,8,light);if(!back){ellipse(ctx,-9,-10,3,5,ink);ellipse(ctx,11,-10,3,5,ink)}return}
if(["fox","wolf","cat","dog","bear","rabbit","squirrel","mouse","dragon"].includes(k)){
const ear=(x,y,sz,l)=>poly(ctx,[[x-sz,y+18],[x-sz*.75,y-sz*l],[x+sz,y+12]],fur,ink);
if(k==="rabbit"){ear(-15,-29,11,2.6);ear(16,-27,10,2.65);rect(ctx,-18,-60,8,27,p.light,ink,4);rect(ctx,10,-57,8,24,p.light,ink,4)}
else if(k!=="bear"&&k!=="mouse"){ear(-21,-24,15,k==="dragon"?1.1:1.35);ear(21,-23,14,k==="dragon"?1.1:1.4)}
else{ellipse(ctx,-23,-28,11,12,fur,ink);ellipse(ctx,23,-28,11,12,fur,ink)}
ellipse(ctx,0,-9,k==="bear"?31:29,28,fur,ink);
if(p.spot){ellipse(ctx,-22,0,7,11,colorShade(fur,.88));ellipse(ctx,23,4,6,8,colorShade(fur,.86))}
if(!back){
ellipse(ctx,3,6,22,12,light);
if(["fox","wolf","dog","squirrel","dragon"].includes(k)){
poly(ctx,[[10,0],[34,8],[24,17],[4,17]],light);ellipse(ctx,30,7,4,4,ink)}
else{ellipse(ctx,3,14,4,3,ink)}
ellipse(ctx,-13,-9,4.5,6,p.eye);ellipse(ctx,11,-9,4.5,6,p.eye);ellipse(ctx,-14,-11,1.5,2.5,"#fff");ellipse(ctx,10,-11,1.5,2.5,"#fff");
if(p.freckles){for(const x of [-17,-11,13,18])ellipse(ctx,x,9,1.4,1.2,colorShade(fur,.74))}
}else{for(let i=0;i<4;i++)limb(ctx,[-19+i*10,-21],[-18+i*10,14],1,colorShade(fur,.85))}
if(k==="cat")for(const n of [-1,1]){limb(ctx,[n*12,10],[n*37,7],1,ink);limb(ctx,[n*12,15],[n*36,17],1,ink)}
if(k==="dragon"){poly(ctx,[[-6,-34],[0,-47],[8,-33]],light,ink);poly(ctx,[[18,-34],[23,-46],[29,-30]],light,ink)}
}else if(k==="robot"){
rect(ctx,-27,-37,54,54,fur,ink,10);rect(ctx,-22,-30,44,28,ink,null,5);
if(!back){for(const x of [-12,12]){rect(ctx,x-7,-24,14,10,"#85f0f8",null,2);rect(ctx,x-5,-23,4,4,"#f2ffff")};rect(ctx,-10,8,20,5,light,null,2)}
limb(ctx,[0,-38],[0,-50],4,ink);ellipse(ctx,0,-51,4,4,p.accent,ink);
}else if(k==="skeleton"){
ellipse(ctx,0,-12,27,30,fur,ink);if(!back){ellipse(ctx,-11,-15,7,10,ink);ellipse(ctx,11,-15,7,10,ink);poly(ctx,[[-4,0],[4,0],[0,7]],ink);for(let i=-2;i<=2;i++)rect(ctx,i*6-2,12,3,8,ink)}
}else if(k==="frog"){
ellipse(ctx,-18,-29,13,13,fur,ink);ellipse(ctx,19,-29,13,13,fur,ink);ellipse(ctx,0,-5,33,26,fur,ink);
if(!back){ellipse(ctx,-19,-30,5,5,p.eye);ellipse(ctx,19,-30,5,5,p.eye);limb(ctx,[-14,9],[14,9],2,ink)}
}else if(k==="bird"){
ellipse(ctx,0,-6,27,31,fur,ink);
if(!back){ellipse(ctx,-11,-12,5,6,p.eye);ellipse(ctx,11,-12,5,6,p.eye);poly(ctx,[[0,-4],[24,1],[0,8]],p.accent,ink)}
poly(ctx,[[-2,-35],[0,-46],[8,-34]],p.accent);
}else{
if(k==="elf"){poly(ctx,[[-22,-3],[-39,-12],[-20,-18]],fur,ink);poly(ctx,[[22,-3],[39,-12],[20,-18]],fur,ink)}
ellipse(ctx,0,-9,25,30,fur,ink);
if(!back){
ellipse(ctx,-10,-8,3.5,5,p.eye);ellipse(ctx,11,-8,3.5,5,p.eye);ellipse(ctx,-11,-10,1,1.5,"#fff");ellipse(ctx,10,-10,1,1.5,"#fff");
limb(ctx,[-4,3],[4,3],1.4,ink);limb(ctx,[-5,13],[7,13],1.3,colorShade(fur,.65));
if(p.beard){poly(ctx,[[-17,8],[0,30],[18,8],[9,23],[-10,22]],p.ink)}
}
if(k==="pirate"||k==="ninja"||k==="wizard"){poly(ctx,[[-26,-27],[-15,-36],[19,-36],[27,-27],[0,-19]],p.coat,ink);if(k==="pirate")rect(ctx,-26,-26,53,6,p.accent,ink,2)}
if(k==="astronaut"){ellipse(ctx,0,-9,30,36,"#dfebf6",ink);if(!back)rect(ctx,-24,-24,48,29,"#5499b1",ink,9)}
}
if(p.glasses&&!back){for(const x of [-10,12]){ellipse(ctx,x,-12,10,10,"#aad1db95",ink,2)}limb(ctx,[0,-12],[4,-12],2,ink)}
if(p.horns&&!["dragon"].includes(k)){poly(ctx,[[-17,-31],[-18,-53],[-7,-31]],p.light,ink);poly(ctx,[[12,-31],[21,-52],[22,-28]],p.light,ink)}
}
function weapon(ctx,p,t,phase){
let type=p.weapon;
if(!type)return;
ctx.save();ctx.translate(34,t);ctx.rotate((Math.sin(phase)*.08)+(type==="sword"?.12:0));
const dark=p.ink,metal="#e5e8ec",wood="#976d48";
switch(type){
case "sword":
case "axe":{
limb(ctx,[0,3],[6,-25],5,wood,dark);
if(type==="sword"){poly(ctx,[[-1,-25],[7,-49],[12,-25],[6,-21]],metal,dark);limb(ctx,[-7,-20],[14,-20],4,p.accent,dark)}
else{poly(ctx,[[0,-22],[11,-29],[22,-21],[17,-9],[6,-12]],metal,dark)}
break}
case "crossbow":case "bow":case "slingshot":
limb(ctx,[1,-4],[8,-31],5,wood,dark);
if(type==="slingshot"){limb(ctx,[8,-28],[-2,-42],3,wood,dark);limb(ctx,[8,-28],[19,-43],3,wood,dark);limb(ctx,[-2,-42],[19,-43],1.5,"#e4c99a")}
else if(type==="bow"){ctx.beginPath();ctx.ellipse(9,-20,16,27,-.3,-Math.PI/2,Math.PI/2);ctx.strokeStyle=wood;ctx.lineWidth=4;ctx.stroke();limb(ctx,[12,-46],[10,7],1,metal)}
else{limb(ctx,[-11,-34],[27,-34],5,wood,dark);limb(ctx,[-11,-34],[27,-34],1,metal)}
break;
case "gun":rect(ctx,-4,-27,31,12,"#67717d",dark,3);rect(ctx,1,-16,7,15,wood,dark,1);rect(ctx,24,-25,12,6,metal,dark,1);break;
case "staff":limb(ctx,[1,9],[9,-48],5,wood,dark);ellipse(ctx,9,-51,8,8,p.accent,dark);ellipse(ctx,7,-54,2,2,"#fff");break;
case "shield":poly(ctx,[[-2,-28],[24,-24],[22,1],[10,15],[-4,3]],p.coat,dark);poly(ctx,[[2,-23],[20,-20],[17,0],[10,10],[2,0]],p.accent);break;
case "lantern":limb(ctx,[6,-12],[8,-26],2,wood,dark);rect(ctx,-1,-25,18,21,p.accent,dark,3);rect(ctx,3,-21,10,12,"#fff1a8",dark,1);break;
case "pickaxe":limb(ctx,[1,10],[7,-32],5,wood,dark);poly(ctx,[[-20,-34],[31,-34],[17,-26],[-13,-26]],metal,dark);break;
}
ctx.restore();
}
function frameArt(p,action,index,count,dir,style){
const t=index/Math.max(1,count),a=t*Math.PI*2,sw=Math.sin(a),cos=Math.cos(a),
move=/walk|run|бег|ходьб/i.test(action),
attack=/attack|атак|удар|стрел|shoot/i.test(action),
fly=/fly|полёт|полет|лети/i.test(action),
jump=/jump|прыж/i.test(action),
hurt=/hurt|урон|ранен/i.test(action),
death=/death|смерт|погиб/i.test(action),
magic=/cast|маг|заклин/i.test(action),
dig=/dig|копа/i.test(action),
fast=/run|бег/i.test(action);
const bob=jump?-24*Math.sin(t*Math.PI):fly?-12*Math.sin(a):move?-4*Math.abs(sw):2*Math.sin(a);
const stride=move?sw*(fast?17:11):dig?sw*7:0;
const arm=attack?Math.sin(Math.min(1,t*2)*Math.PI)*21:move?sw*10:magic?9*Math.sin(a):dig?sw*12:2*Math.sin(a*.7);
const back=["up","nw","ne"].includes(dir),left=["left","nw","sw"].includes(dir),top=dir==="top";
const cv=createCanvas(144,144),c=cv.getContext("2d"),scale=p.giant?1.09:p.small?.86:1;
c.translate(72,73+(jump?0:1));c.scale(scale,scale);if(left)c.scale(-1,1);
if(death){c.translate(0,25*t);c.rotate(t*1.15)}
if(hurt){c.translate(-7*Math.sin(t*9*Math.PI),0);c.rotate(.12*Math.sin(t*12*Math.PI))}
c.translate(0,bob);const ink=p.ink,fur=p.main,coat=p.coat,light=p.light;
if(p.cape)poly(c,[[-19,0],[-38,50],[-12,57],[32,46],[18,0]],colorShade(coat,.75),ink);
if(p.wings){
c.save();c.translate(-20,-5);c.rotate(Math.sin(a)*.27);poly(c,[[-4,0],[-48,-36],[-37,17],[-29,30],[-16,8]],colorShade(coat,1.25),ink);c.restore();
c.save();c.translate(22,-5);c.rotate(-Math.sin(a)*.26);poly(c,[[4,0],[48,-36],[37,17],[29,30],[16,8]],colorShade(coat,1.12),ink);c.restore();
}
if(["fox","wolf","cat","dog","squirrel","dragon","bear","rabbit"].includes(p.kind)){
c.save();c.translate(19,18);c.rotate(.25*Math.sin(a)+.3);if(p.kind==="squirrel")ellipse(c,30,-1,21,32,fur,ink);else if(p.kind==="rabbit")ellipse(c,29,12,11,11,light,ink);else if(p.kind==="dragon")poly(c,[[0,0],[19,18],[50,11],[34,-2],[10,-7]],fur,ink);else if(p.kind==="cat")limb(c,[0,1],[33,-14],10,fur,ink);else poly(c,[[0,1],[28,-11],[51,1],[28,16]],fur,ink);
if(["fox","wolf","squirrel"].includes(p.kind))poly(c,[[40,-2],[52,1],[32,11]],light);
c.restore()}
const legColor=["robot","knight","astronaut"].includes(p.kind)?p.main:colorShade(coat,.76);
limb(c,[-13,31],[-15-stride,60],13,legColor,ink);
limb(c,[11,31],[12+stride,60],13,legColor,ink);
ellipse(c,-16-stride,61,13,6,ink);ellipse(c,14+stride,61,13,6,ink);
if(p.skirt)poly(c,[[-21,1],[23,1],[33,37],[-32,37]],coat,ink);
else rect(c,-23,-5,46,43,coat,ink,14);
if(p.armor){rect(c,-19,-3,38,32,colorShade(p.main,1.06),ink,6);poly(c,[[-10,3],[11,3],[9,23],[-10,23]],colorShade(p.main,1.2),ink)}
if(p.bag){rect(c,-36,3,19,29,"#987449",ink,5);limb(c,[-20,-8],[-20,26],4,"#c4a672",ink)}
if(p.kind==="robot"){rect(c,-17,5,34,18,"#536276",ink,3);ellipse(c,0,12,5,5,"#85f0f8")}
else if(p.kind==="skeleton"){for(let i=0;i<3;i++)limb(c,[-14,4+i*7],[14,4+i*7],2,light,ink)}
else if(p.spot){rect(c,-12,9,7,7,colorShade(coat,.86),null,2);rect(c,7,19,6,6,colorShade(coat,1.16))}
const handColor=p.kind==="knight"||p.kind==="robot"||p.kind==="astronaut"?p.main:fur;
limb(c,[-19,0],[-32-arm,22+(attack?8:0)],11,handColor,ink);
limb(c,[19,0],[30+arm,18-(attack?20*Math.sin(t*Math.PI):0)],11,handColor,ink);
if(p.scarf){poly(c,[[-23,-16],[24,-16],[20,-4],[-23,-4]],p.scarf,ink);c.save();c.translate(14,-8);c.rotate(sw*.17);poly(c,[[0,0],[13,2],[30+sw*4,25],[12,19]],p.scarf,ink);c.restore()}
if(magic){for(let j=0;j<5;j++){const ang=a+j*1.2;ellipse(c,40+18*Math.sin(ang),-17+17*Math.cos(ang),2.5,2.5,p.accent)}}
c.save();c.translate(0,-20);c.rotate(.05*Math.sin(a)+ (attack?.06*Math.sin(a):0));
shapeFace(c,p,back);
if(p.hat||p.kind==="wizard"){poly(c,[[-28,-34],[-7,-67],[22,-36],[30,-29],[-31,-29]],p.kind==="wizard"?"#654c8f":coat,ink);rect(c,-30,-32,59,7,p.accent,ink,2)}
if(p.kind==="knight"){poly(c,[[-26,-30],[-23,-48],[22,-47],[28,-30]],"#bacdd8",ink);rect(c,-24,-28,49,8,ink)}
c.restore();
weapon(c,p,-2+(attack?-22*Math.sin(t*Math.PI):arm*.35),a);
const out=createCanvas(144,144);const cc=out.getContext("2d");cc.drawImage(cv,0,0);
if(top){/* Portrait-like angle in this renderer; no fake full top-down orientation. */ }
return out;
}
function renderCell(art,sz,style){
const cv=createCanvas(sz,sz),c=cv.getContext("2d");c.imageSmoothingEnabled= !["16bit","retro","cozy","dark","cute"].includes(style);
if(!c.imageSmoothingEnabled){const low=createCanvas(Math.max(16,Math.min(48,Math.round(sz/3))),Math.max(16,Math.min(48,Math.round(sz/3))));const l=low.getContext("2d");l.drawImage(art,0,0,low.width,low.height);c.drawImage(low,0,0,sz,sz)}
else c.drawImage(art,0,0,sz,sz);
return cv;
}
function dirsFor(facing){return facing==="all4"?["down","left","right","up"]:facing==="all8"?["down","sw","left","nw","up","ne","right","se"]:[facing||"right"]}
function u32(a,p,val){a[p]=val&255;a[p+1]=(val>>>8)&255;a[p+2]=(val>>>16)&255;a[p+3]=(val>>>24)&255}
function u16(a,p,val){a[p]=val&255;a[p+1]=(val>>>8)&255}
const crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0}
function crc32(b){let n=0xffffffff;for(let i=0;i<b.length;i++)n=crcTable[(n^b[i])&255]^(n>>>8);return (n^0xffffffff)>>>0}
function makeZip(entries){
const encoder=new TextEncoder(),parts=[],central=[];let pos=0;
for(const [name,contents] of entries){
const fn=encoder.encode(name),data=contents instanceof Uint8Array?contents:encoder.encode(contents);
const local=new Uint8Array(30+fn.length),dv=new DataView(local.buffer);
dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0x0800,true);
dv.setUint32(14,crc32(data),true);dv.setUint32(18,data.length,true);dv.setUint32(22,data.length,true);dv.setUint16(26,fn.length,true);local.set(fn,30);
parts.push(local,data);
const cent=new Uint8Array(46+fn.length),d=new DataView(cent.buffer);
d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x0800,true);d.setUint32(16,crc32(data),true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,fn.length,true);d.setUint32(42,pos,true);cent.set(fn,46);central.push(cent);
pos+=local.length+data.length;
}
const centralLength=central.reduce((a,b)=>a+b.length,0);const end=new Uint8Array(22),dv=new DataView(end.buffer);dv.setUint32(0,0x06054b50,true);dv.setUint16(8,entries.length,true);dv.setUint16(10,entries.length,true);dv.setUint32(12,centralLength,true);dv.setUint32(16,pos,true);
return new Blob([...parts,...central,end],{type:"application/zip"});
}
async function generate(config,onProgress){
const prompt=String(config.prompt||"").trim();
if(prompt.length<2)throw Error("Опиши персонажа хотя бы двумя буквами.");
const sz=Number(config.size)||64,frames=Number(config.frames)||8,dirs=dirsFor(config.facing);
if(![16,32,64,96,128,256].includes(sz))throw Error("Недопустимый размер кадра");
if(![6,8,12].includes(frames))throw Error("Поддерживается 6, 8 или 12 кадров");
if(dirs.length*frames>96)throw Error("Слишком много кадров");
const p=parse(prompt),sheet=createCanvas(sz*frames,sz*dirs.length),ctx=sheet.getContext("2d");ctx.imageSmoothingEnabled=false,files=[],atlas={meta:{image:"sprite_sheet.png",size:{w:sheet.width,h:sheet.height},frameSize:sz,engine:"local-procedural",transparent:true},frames:{},animations:{}};
const allFrames=[];
for(let di=0;di<dirs.length;di++){
const key=dirs[di]+"_"+(config.action||"idle");atlas.animations[key]=[];
for(let i=0;i<frames;i++){
const cell=renderCell(frameArt(p,config.action||"idle",i,frames,dirs[di],config.style),sz,config.style);
ctx.drawImage(cell,i*sz,di*sz);allFrames.push([dirs[di],i,cell]);
const name=key+"_"+String(i).padStart(2,"0")+".png";atlas.frames[name]={frame:{x:i*sz,y:di*sz,w:sz,h:sz},duration:Math.round(1000/8)};
atlas.animations[key].push(name);
}
if(onProgress){onProgress({pct:Math.round(100*(di+1)/dirs.length)});await new Promise(r=>setTimeout(r,0))}
}
const data=sheet.toDataURL("image/png"),atlasText=JSON.stringify(atlas,null,2),atlasUrl="data:application/json;charset=utf-8,"+encodeURIComponent(atlasText);
let zip=null;
const names=[["sprite_sheet.png",await (await fetch(data)).arrayBuffer().then(x=>new Uint8Array(x))],["atlas.json",atlasText]];
for(const [dir,i,cell] of allFrames){const bytes=new Uint8Array(await (await fetch(cell.toDataURL("image/png"))).arrayBuffer());names.push(["frames/"+dir+"_"+String(i).padStart(2,"0")+".png",bytes])}
zip=URL.createObjectURL(makeZip(names));
return {sheet:data,atlas:atlasUrl,zip,gif:null,frames,columns:frames,cell_size:sz,directions:dirs.length,engine:"local-procedural",description:p.kind,offline:true};
}
global.SpriteForgeLocal={generate,parse,makeZip,version:"1.0.0"};
})(window);
