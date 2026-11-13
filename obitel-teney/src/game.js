
(()=>{'use strict';
const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d',{alpha:false}),radar=$('#radar'),rctx=radar.getContext('2d'),bigmap=$('#bigmap'),bctx=bigmap.getContext('2d');
const TAU=Math.PI*2,FOV=Math.PI/2.65,TAN=Math.tan(FOV/2),MAXRAY=28,MAPSIZE=31,IS_TOUCH=matchMedia('(pointer:coarse)').matches;
let W=0,H=0,proj=0,texWall=[],floorTex,ceilTex,art={},last=0,t=0,lookPitch=0,noiseSeed=1919;
let scene='menu',world=null,player=null,enemies=[],objects=[],particles=[],visited=null,exitObject=null,objectives=[],stars=[],toastUntil=0,hitUntil=0,pauseFromMap=false,groanTick=0;
let battle=false,battleSide='exorcist',battleCreature='ghost',battleHuman='priest',battleRoster=[],battleExCount=4,battleSpCount=4,exorcistBots=[],spiritAllyBots=[];
let humanClass='priest';
const HUMAN_ABILITY={priest:{name:'КРУГ ОЧИЩЕНИЯ',cd:12},hunter:{name:'СВЕТОВАЯ ВСПЫШКА',cd:10},medic:{name:'ИСЦЕЛЕНИЕ',cd:16},guardian:{name:'ЗАЩИТНЫЙ КУПОЛ',cd:18}},SPIRIT_ABILITY={ghost:{name:'НЕВИДИМОСТЬ',cd:13},wraith:{name:'ТЕНЕВОЙ РЫВОК',cd:9},cultist:{name:'ПОГЛОЩЕНИЕ ЖИЗНИ',cd:14},demon:{name:'ПОЛТЕРГЕЙСТ',cd:15}};
let mouseFire=false;
const key={},touch={fire:false,sprint:false,forward:0,strafe:0,forwardTarget:0,strafeTarget:0};
const settings={muted:false,lookSensitivity:1,stickSensitivity:1,invertView:false,leftHanded:false,deadZone:.09,floatingStick:true,vibration:true};
const SAVE_KEY='obitel-teney-v06-save',OPTIONS_KEY='obitel-teney-v06-options';
let floorNo=1,runSeed=53021,difficulty='normal',vaultDoor=null,firstRun=true,foundLore=[],floorFlavor='';
const floorNames=['Кельи тишины','Склеп семи свечей','Забытый архив','Зал исповедей','Коридоры безмолвия','Погребальная часовня'];
function safeStore(key, data){try{localStorage.setItem(key,JSON.stringify(data))}catch(err){}}
function safeRead(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch(err){return null}}
function persistOptions(){safeStore(OPTIONS_KEY,{...settings,difficulty})}
function setContinueButton(){let btn=$('#continueBtn');if(btn){let saved=safeRead(SAVE_KEY);btn.disabled=!saved;$('#continueDetail').textContent=saved?'Сохранение · этаж '+saved.floorNo:'Нет сохранения'}}
let mobile;
function resetInputs(){mouseFire=false;nextHud=nextPowerUI=0;for(const code in key)key[code]=false;mobile?.reset();}
function playerRole(){return match?.me.character||(battle?battleRoster[0].character:'priest');}
function saveCheckpoint(){if(!player||battle||match)return;safeStore(SAVE_KEY,{runSeed,floorNo,health:Math.round(player.health),grenades:player.grenades,kills:player.kills,shots:player.shots,difficulty,foundLore});setContinueButton()}

const spiritAnimations={};let spiritEmitTime=0;
function rng(){noiseSeed=(Math.imul(noiseSeed,1664525)+1013904223)>>>0;return noiseSeed/4294967296}function rand(a,b){return a+rng()*(b-a)}function clamp(n,a,b){return Math.max(a,Math.min(b,n))}function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}function normAng(a){return Math.atan2(Math.sin(a),Math.cos(a))}
function makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}function pixelTexture(w,h,draw){let c=makeCanvas(w,h),g=c.getContext('2d');draw(g,w,h);return c}function buildTextures(){noiseSeed=2026;
 floorTex=pixelTexture(64,64,(g,w,h)=>{g.fillStyle='#313537';g.fillRect(0,0,w,h);for(let i=0;i<1500;i++){let v=Math.floor(rand(36,83));g.fillStyle=`rgb(${v},${v+1},${v})`;g.fillRect(rand(0,w)|0,rand(0,h)|0,rand(1,3)|0,rand(1,3)|0)}g.strokeStyle='#15191b';g.lineWidth=2;g.strokeRect(1,1,62,62);g.strokeRect(2,2,60,60);for(let i=0;i<8;i++){g.fillStyle='#17191a';g.fillRect(rand(0,64)|0,rand(0,64)|0,rand(2,15)|0,1)}});
 ceilTex=pixelTexture(64,64,(g)=>{g.fillStyle='#20292b';g.fillRect(0,0,64,64);for(let i=0;i<530;i++){let v=Math.floor(rand(25,65));g.fillStyle=`rgb(${v},${v+3},${v+2})`;g.fillRect(rand(0,64)|0,rand(0,64)|0,2,2)}g.strokeStyle='#101b1d';g.lineWidth=3;g.strokeRect(1,1,62,62);g.fillStyle='#3a4846';g.fillRect(5,8,54,5);g.fillRect(5,50,54,5);g.fillStyle='#0e181b';g.fillRect(24,0,5,64)});
 for(let kind=0;kind<4;kind++)texWall.push(pixelTexture(64,64,(g)=>{const colors=['#505b5b','#485254','#4c4c4a','#4e4c4b'];g.fillStyle=colors[kind];g.fillRect(0,0,64,64);for(let i=0;i<1700;i++){let v=Math.floor(rand(-22,24)),base=kind===3?73:80;g.fillStyle=`rgba(${clamp(base+v,0,255)},${clamp(base+v+7,0,255)},${clamp(base+v+5,0,255)},.23)`;g.fillRect(rand(0,64)|0,rand(0,64)|0,rand(1,4)|0,rand(1,4)|0)}g.fillStyle='#1e272a';g.fillRect(0,0,64,5);g.fillRect(0,58,64,6);g.fillRect(0,0,4,64);g.fillRect(60,0,4,64);g.fillStyle='#78837f';g.fillRect(5,5,2,53);g.fillRect(57,5,2,53);g.fillStyle='#252c2c';g.fillRect(7,24,50,2);g.fillRect(7,46,50,2);for(let y of [9,54])for(let x of [9,52]){g.fillStyle='#161a1c';g.fillRect(x,y,5,5);g.fillStyle='#a4a19a';g.fillRect(x+1,y+1,2,2)}if(kind===1){g.fillStyle='#873d37';g.fillRect(13,13,38,6);g.fillStyle='#b2614d';g.fillRect(13,14,38,2);g.fillStyle='#353b3b';g.fillRect(10,28,44,15);g.fillStyle='#7e9a86';g.font='bold 11px monospace';g.fillText('13',23,40)}if(kind===2){g.fillStyle='#171d1e';g.fillRect(10,8,8,49);g.fillStyle='#8e5049';g.fillRect(12,8,3,48);g.fillStyle='#172022';g.fillRect(46,8,8,49);g.fillStyle='#859c94';g.fillRect(48,8,3,48)}if(kind===3){for(let i=0;i<6;i++){g.fillStyle=i%2?'#302b26':'#9a7345';g.fillRect(7+i*9,30,9,6)}g.fillStyle='#121a1a';g.fillRect(17,7,30,14);g.fillStyle='#db7d65';g.font='bold 8px monospace';g.fillText('DANGER',19,16)}}));
 const p=(name,w,h,draw)=>art[name]=pixelTexture(w,h,draw);
 function paintBody(g,fast,frame){let shadow='#080d10',body=fast?'#283536':'#374240',edge=fast?'#648478':'#819388';g.imageSmoothingEnabled=false;const box=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};const poly=(pts,col)=>{g.fillStyle=col;g.beginPath();g.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)g.lineTo(...pts[i]);g.closePath();g.fill()};let sway=frame?3:-2;
 if(fast){poly([[22,77],[45,66],[70,75],[77,93],[65,104],[20,98]],shadow);poly([[12,99],[36,87],[59,95],[80,109],[75,119],[56,105],[30,112]],shadow);poly([[18,86],[37,75],[60,79],[79,91],[73,104],[16,100]],body);poly([[5,112],[27,94],[34,99],[18,123],[3,126]],edge);poly([[53,93],[77,108],[85,119],[75,125],[44,105]],edge);box(35,55,30,30,shadow);box(39,54,22,26,'#747c6e');box(43,67,14,7,'#1e2222');box(42,59,6,4,'#f2715e');box(54,59,6,4,'#f2715e');box(37,80,3,14,'#7c3530');return}
 poly([[28,67],[19+sway,111],[13+sway,123],[36,123],[47,80]],shadow);poly([[49,74],[53+sway,116],[76+sway,124],[82,120],[64,68]],shadow);poly([[27,78],[22+sway,117],[38+sway,120],[48,82]],'#455450');poly([[49,77],[53-sway,117],[69-sway,121],[61,77]],'#46534d');box(14+sway,118,27,7,shadow);box(53-sway,118,29,7,shadow);
 poly([[21,46],[36,36],[64,36],[79,51],[70,87],[26,87]],shadow);poly([[26,45],[37,39],[62,39],[72,51],[66,86],[29,82]],body);poly([[32,48],[37,42],[62,42],[66,52],[60,78],[34,77]],'#4b5e57');poly([[24,49],[12,55],[10+sway,91],[16+sway,103],[28,95],[25,62]],shadow);poly([[73,48],[86,55],[91-sway,98],[82-sway,107],[72,94],[68,64]],shadow);poly([[15,60],[23,60],[21+sway,89],[15+sway,96]],edge);poly([[76,59],[82,60],[88-sway,94],[81-sway,100]],'#738479');box(14+sway,96,10,14,'#6b7566');box(78-sway,98,9,14,'#626e62');box(41,76,12,5,'#773a34');box(49,63,11,12,'#7d3c32');box(36,43,24,5,'#a8a198');
 box(33,16,32,30,shadow);box(37,13,25,30,'#778279');box(39,11,22,7,'#55645b');box(38,20,25,11,'#929c8b');box(38,31,25,12,'#4f5c54');box(40,25,7,5,'#f8bbae');box(54,25,7,5,'#ffafa1');box(42,26,4,2,'#fff3da');box(55,26,4,2,'#fff3da');box(46,35,11,5,'#170f11');box(45,37,3,4,'#c94b40');box(57,38,3,3,'#a73e37');for(let i=0;i<6;i++)box(rand(28,70)|0,rand(48,104)|0,rand(2,6)|0,rand(1,5)|0,Math.random()<.5?'#2a3535':'#7c4940');}
 for(let f=0;f<2;f++){p('husk'+f,96,128,(g)=>paintBody(g,false,f));p('crawler'+f,96,128,(g)=>paintBody(g,true,f));}
 p('corpse',96,128,(g)=>{g.fillStyle='#111a19';g.fillRect(19,109,62,10);g.fillStyle='#4a5450';g.fillRect(27,103,46,12);g.fillStyle='#7d8677';g.fillRect(56,100,15,9);g.fillStyle='#7d3c34';g.fillRect(39,115,30,4)});
 p('core',80,96,(g)=>{g.fillStyle='#162527';g.fillRect(21,68,41,14);g.fillStyle='#647c75';g.fillRect(27,62,28,9);g.fillStyle='#243638';g.fillRect(27,27,28,41);g.fillStyle='#718e85';g.fillRect(31,22,20,47);g.fillStyle='#acd6bd';g.fillRect(35,29,13,35);g.fillStyle='#e4f8d4';g.fillRect(38,34,6,26);g.fillStyle='#243c43';g.fillRect(24,41,32,7);g.fillStyle='#d85848';g.fillRect(25,13,30,7);g.fillStyle='#a9a99a';g.fillRect(19,70,44,7);for(let i=0;i<3;i++){g.fillStyle='#e9f6cc';g.fillRect(16+i*24,50,3,11)}});
 p('ammoItem',64,64,(g)=>{g.fillStyle='#131b1c';g.fillRect(10,36,46,19);g.fillStyle='#5e6a58';g.fillRect(12,32,41,19);g.fillStyle='#c1aa7c';g.fillRect(15,28,9,20);g.fillRect(28,28,9,20);g.fillRect(41,28,9,20);g.fillStyle='#e9c990';for(let x of [15,28,41])g.fillRect(x+1,24,7,7);g.fillStyle='#242d2e';g.fillRect(10,45,46,7)});
 p('medItem',64,64,(g)=>{g.fillStyle='#151e1e';g.fillRect(8,20,49,38);g.fillStyle='#b8b8a7';g.fillRect(10,16,44,36);g.fillStyle='#5f746a';g.fillRect(25,12,14,7);g.fillStyle='#ae4944';g.fillRect(26,24,12,25);g.fillRect(19,30,26,12);g.fillStyle='#ded7c1';g.fillRect(12,20,5,27)});
 p('batteryItem',64,64,(g)=>{g.fillStyle='#1d2b2b';g.fillRect(19,18,28,39);g.fillStyle='#6c9b8f';g.fillRect(22,15,23,40);g.fillStyle='#a4dfc1';g.fillRect(28,22,13,22);g.fillStyle='#193b36';g.fillRect(31,18,5,30);g.fillStyle='#e5e9c9';g.fillRect(28,8,11,9)});
 p('exit',128,160,(g)=>{g.fillStyle='#111b1c';g.fillRect(7,16,114,143);g.fillStyle='#505e5b';g.fillRect(13,15,103,140);g.fillStyle='#121c1d';g.fillRect(21,21,87,131);g.fillStyle='#324341';g.fillRect(27,29,74,112);g.fillStyle='#141d20';g.fillRect(60,28,7,117);g.fillStyle='#88948a';g.fillRect(24,30,4,106);g.fillRect(98,30,4,106);g.fillStyle='#873d33';g.fillRect(30,53,68,13);g.fillStyle='#1c2526';g.font='bold 14px monospace';g.fillText('EXIT',46,63);g.fillStyle='#d77a52';g.fillRect(40,111,46,8);g.fillStyle='#192221';g.fillRect(46,112,34,6);g.fillStyle='#6e7d77';g.fillRect(13,16,102,6);for(let x of [17,103])for(let y of [28,123]){g.fillStyle='#b4ae92';g.fillRect(x,y,5,5)}});
 p('lamp',72,48,(g)=>{g.fillStyle='#152021';g.fillRect(8,8,56,21);g.fillStyle='#566764';g.fillRect(11,10,50,16);g.fillStyle='#d8ecbd';g.fillRect(16,13,40,8);g.fillStyle='#ffffe4';g.fillRect(20,14,31,5);g.fillStyle='#263b3c';g.fillRect(12,30,48,3)});
 p('barrel',72,94,(g)=>{g.fillStyle='#0c1516';g.fillRect(14,18,45,68);g.fillStyle='#414a43';g.fillRect(18,16,38,67);g.fillStyle='#746d57';g.fillRect(19,29,35,9);g.fillRect(19,66,35,8);g.fillStyle='#934a39';g.fillRect(22,41,29,21);g.fillStyle='#251e1c';g.font='bold 11px monospace';g.fillText('X',33,56);g.fillStyle='#7c8175';g.fillRect(21,14,32,6)});
 p('gun',290,240,(g)=>{g.fillStyle='#161d20';g.beginPath();g.moveTo(106,240);g.lineTo(142,165);g.lineTo(203,160);g.lineTo(266,236);g.closePath();g.fill();g.fillStyle='#343c3d';g.fillRect(112,153,82,42);g.fillStyle='#101417';g.fillRect(123,92,53,95);g.fillStyle='#5a6462';g.fillRect(129,87,43,93);g.fillStyle='#293335';g.fillRect(137,47,26,92);g.fillStyle='#777c76';g.fillRect(142,44,17,18);g.fillStyle='#0a1113';g.fillRect(146,37,10,20);g.fillStyle='#b6ab94';g.fillRect(144,59,4,28);g.fillStyle='#12191b';g.fillRect(127,120,50,7);g.fillStyle='#82918b';g.fillRect(135,101,6,30);g.fillStyle='#20292c';g.fillRect(119,172,66,11);g.fillStyle='#7e403a';g.fillRect(114,188,41,52);g.fillStyle='#a15f4e';g.fillRect(119,188,11,52);g.fillStyle='#694335';g.fillRect(185,190,41,50);g.fillStyle='#ab6f52';g.fillRect(187,189,12,51);g.fillStyle='#101719';g.fillRect(107,228,48,12);g.fillRect(184,228,47,12);g.fillStyle='#727b78';g.fillRect(115,160,83,4);g.fillStyle='#252b2b';g.fillRect(133,72,41,13);g.fillStyle='#858b7d';g.fillRect(141,67,24,3)});
}
function buildGothicTextures(){
 noiseSeed=19710;
 floorTex=pixelTexture(64,64,(g)=>{g.fillStyle='#333031';g.fillRect(0,0,64,64);
 for(let y=0;y<64;y+=16)for(let x=0;x<64;x+=16){let n=rand(-13,12)|0,v=55+n;g.fillStyle=`rgb(${v},${v-2},${v-4})`;g.fillRect(x+1,y+1,15,15);g.fillStyle='rgba(202,179,145,.10)';g.fillRect(x+2,y+2,12,1);g.fillStyle='#18181b';g.fillRect(x,y,16,1);g.fillRect(x,y,1,16)}
 for(let i=0;i<1100;i++){g.fillStyle=rng()<.55?'#161c1e':'#7d7369';g.globalAlpha=rand(.12,.36);g.fillRect(rand(0,64)|0,rand(0,64)|0,rand(.7,2.5),rand(.7,2.5))}g.globalAlpha=1;g.strokeStyle='#100d10';for(let i=0;i<12;i++){let x=rand(0,64),y=rand(0,64);g.beginPath();g.moveTo(x,y);g.lineTo(x+rand(-8,9),y+rand(3,11));g.stroke()}});
 ceilTex=pixelTexture(64,64,(g)=>{g.fillStyle='#302b2e';g.fillRect(0,0,64,64);for(let y=0;y<64;y+=16)for(let x=0;x<64;x+=16){g.fillStyle='#181519';g.fillRect(x,y,64,2);g.fillRect(x,y,2,16);g.fillStyle='rgba(142,118,101,.28)';g.fillRect(x+2,y+3,11,1)}for(let i=0;i<450;i++){let v=rand(20,95)|0;g.fillStyle=`rgba(${v},${v-6},${v-7},.22)`;g.fillRect(rand(0,64),rand(0,64),2,2)}});
 texWall=[];for(let k=0;k<5;k++)texWall.push(pixelTexture(64,64,(g)=>{
 g.fillStyle=['#68605c','#56545a','#565350','#62554d','#4d565a'][k];g.fillRect(0,0,64,64);
 for(let y=0;y<64;y+=16){let off=(Math.floor(y/16)%2)*16;g.fillStyle='#211b1d';g.fillRect(0,y,64,2);for(let x=-32+off;x<68;x+=32){let shade=rand(-12,13)|0;g.fillStyle=`rgba(${shade>0?210:10},${shade>0?198:7},${shade>0?169:10},${Math.abs(shade)/90})`;g.fillRect(x+2,y+2,28,12);g.fillStyle='#241e20';g.fillRect(x,y,2,16);g.fillStyle='rgba(233,216,193,.17)';g.fillRect(x+3,y+3,24,1);g.fillStyle='rgba(0,0,0,.19)';g.fillRect(x+3,y+13,24,1)}}
 for(let i=0;i<900;i++){let x=rand(0,64)|0,y=rand(0,64)|0;g.fillStyle=rng()<.52?'#0d1917':'#d9c6a2';g.globalAlpha=rand(.06,.23);g.fillRect(x,y,rand(1,3)|0,1)}g.globalAlpha=1;
 for(let i=0;i<12;i++){let x=rand(0,64),y=rand(0,64);g.strokeStyle='rgba(10,11,13,.40)';g.lineWidth=rand(.4,1.3);g.beginPath();g.moveTo(x,y);g.lineTo(x+rand(-10,10),y+rand(5,17));g.stroke()}
 if(k===3){g.fillStyle='#21191b';g.fillRect(25,4,14,54);g.fillStyle='#a57c52';g.fillRect(30,8,4,42);g.fillRect(18,19,29,4);g.fillStyle='#efd4a2';g.fillRect(31,9,1,40)}
 if(k===4){g.fillStyle='#292d33';g.fillRect(5,5,54,54);g.strokeStyle='#70675b';g.strokeRect(6,5,52,53);g.fillStyle='#273c3c';g.fillRect(15,12,34,40);g.strokeStyle='#8d8776';g.beginPath();g.moveTo(32,11);g.lineTo(32,52);g.moveTo(17,29);g.lineTo(47,29);g.stroke();g.fillStyle='#bd6a4e';g.fillRect(30,15,4,31);g.fillRect(22,23,21,4)}
 }));
 const p=(n,w,h,fn)=>art[n]=pixelTexture(w,h,fn);
 p('core',112,132,(g)=>{g.shadowColor='#b36f45';g.shadowBlur=12;g.fillStyle='#141015';g.beginPath();g.moveTo(15,124);g.lineTo(23,42);g.lineTo(36,16);g.lineTo(76,16);g.lineTo(89,42);g.lineTo(98,124);g.closePath();g.fill();g.shadowBlur=0;g.strokeStyle='#8d765a';g.lineWidth=5;g.stroke();g.fillStyle='#49413b';g.fillRect(21,106,72,19);g.fillStyle='#806952';g.fillRect(25,100,64,9);g.fillStyle='#191317';g.beginPath();g.arc(56,66,25,0,Math.PI*2);g.fill();g.strokeStyle='#d09b64';g.lineWidth=5;g.beginPath();g.arc(56,66,25,0,Math.PI*2);g.stroke();g.strokeStyle='#f0c184';g.lineWidth=3;g.beginPath();g.moveTo(56,39);g.lineTo(56,94);g.moveTo(29,66);g.lineTo(83,66);g.stroke();g.fillStyle='#e9e0ca';g.fillRect(54,48,4,38);g.fillRect(43,61,26,4);g.fillStyle='#b74436';g.fillRect(53,55,6,18)});
 p('ammoItem',70,70,(g)=>{g.fillStyle='#0f1c23';g.fillRect(18,20,34,47);g.fillStyle='#4e6b72';g.fillRect(20,15,31,45);g.fillStyle='#8cd7e5';g.globalAlpha=.45;g.fillRect(23,26,25,31);g.globalAlpha=1;g.fillStyle='#e7e1b8';g.fillRect(26,36,19,17);g.fillStyle='#a85145';g.fillRect(33,38,5,12);g.fillRect(29,41,13,4);g.fillStyle='#b9a788';g.fillRect(26,6,19,10);g.fillStyle='#e9d5ac';g.fillRect(29,11,13,3)});
 p('medItem',70,70,(g)=>{g.fillStyle='#241918';g.fillRect(12,28,46,36);g.fillStyle='#9d7e5b';g.fillRect(15,23,40,37);g.fillStyle='#352c26';g.fillRect(20,28,30,27);g.fillStyle='#f1dfaa';g.fillRect(32,29,6,22);g.fillRect(25,36,20,6);g.fillStyle='#c5a673';g.fillRect(17,21,36,6)});
 p('batteryItem',64,72,(g)=>{g.fillStyle='#3a2f29';g.fillRect(22,25,22,42);g.fillStyle='#c5ac79';g.fillRect(25,22,16,30);g.fillStyle='#edb86f';g.fillRect(28,6,9,28);g.fillStyle='#fff2a9';g.fillRect(31,1,4,12);g.fillStyle='#e6ddd0';g.fillRect(26,43,14,7)});
 p('exit',140,176,(g)=>{g.fillStyle='#19131b';g.beginPath();g.moveTo(10,174);g.lineTo(10,55);g.quadraticCurveTo(12,7,70,5);g.quadraticCurveTo(128,7,130,55);g.lineTo(130,174);g.fill();g.strokeStyle='#8b7163';g.lineWidth=9;g.stroke();g.fillStyle='#251b22';g.beginPath();g.moveTo(28,173);g.lineTo(28,59);g.quadraticCurveTo(31,26,70,26);g.quadraticCurveTo(109,26,112,59);g.lineTo(112,173);g.fill();g.strokeStyle='#a58761';g.lineWidth=2;g.stroke();g.fillStyle='#65463c';g.fillRect(35,70,70,100);g.strokeStyle='#1b171b';g.lineWidth=5;for(let x=42;x<100;x+=17){g.beginPath();g.moveTo(x,76);g.lineTo(x,165);g.stroke()}g.fillStyle='#dcc397';g.fillRect(65,46,9,36);g.fillRect(53,57,33,8);g.fillStyle='#d6ad73';g.fillRect(86,114,7,7)});
 p('lamp',72,74,(g)=>{g.fillStyle='#21171b';g.fillRect(28,40,15,29);g.fillStyle='#695046';g.fillRect(29,36,13,23);g.fillStyle='#a47b4e';g.fillRect(19,33,33,7);g.fillStyle='#e4cf8f';g.fillRect(30,16,11,22);g.fillStyle='#fff2ae';g.fillRect(33,5,5,19);g.fillStyle='#d4a665';g.fillRect(22,39,27,4)});
 p('barrel',76,94,(g)=>{g.fillStyle='#140f14';g.fillRect(15,15,48,74);g.fillStyle='#6b5351';g.fillRect(20,15,37,69);g.fillStyle='#3d2830';g.fillRect(23,24,31,48);g.fillStyle='#b48b60';g.fillRect(17,32,44,6);g.fillRect(17,64,44,6);g.fillStyle='#aa5849';g.fillRect(33,29,9,33);g.fillRect(28,45,19,6);g.fillStyle='#e0bf7f';g.fillRect(23,17,30,3)});
 p('bottle',72,88,(g)=>{g.fillStyle='#131b20';g.fillRect(19,27,38,56);g.fillStyle='#5ea9b7';g.fillRect(22,24,32,55);g.fillStyle='#a7faff';g.globalAlpha=.7;g.fillRect(27,34,23,40);g.globalAlpha=1;g.fillStyle='#6b777d';g.fillRect(28,9,20,16);g.fillStyle='#cad4cf';g.fillRect(28,6,20,7);g.fillStyle='#c4a780';g.fillRect(25,41,28,24);g.fillStyle='#922e32';g.fillRect(37,44,5,17);g.fillRect(31,49,16,5)});
 p('ashes',96,50,(g)=>{for(let i=0;i<120;i++){g.fillStyle=rng()<.5?'#87979e':'#bd946b';g.globalAlpha=rand(.17,.6);let x=rand(0,96),y=rand(0,48);g.fillRect(x,y,rand(1,4),rand(1,4))}g.globalAlpha=1});
}
function createDecorArt(){
 const item=(name,w,h,cb)=>art[name]=pixelTexture(w,h,cb);
 const box=(g,c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
 item('wardrobe',112,150,(g)=>{
  box(g,'#050709',11,10,90,138);box(g,'#31251e',17,12,78,132);box(g,'#906c45',23,17,66,9);box(g,'#161213',26,28,60,104);
  for(let x of [28,57]){box(g,'#5b3c2b',x,29,28,105);box(g,'#a07648',x+3,35,22,4);box(g,'#231817',x+4,43,20,75);box(g,'#583a2b',x+7,47,15,66);box(g,'#86603e',x+8,49,2,62);}
  box(g,'#c4a36a',50,79,4,14);box(g,'#c4a36a',58,79,4,14);box(g,'#0a0a0c',16,133,79,10);box(g,'#a1845f',14,13,4,130);box(g,'#ad8856',93,14,4,130);
  for(let x=28;x<88;x+=12)box(g,'#b3915f',x,21,3,3);
 });
 item('confessional',120,165,(g)=>{
  box(g,'#080709',9,16,101,144);box(g,'#37291e',15,21,91,132);
  for(let x of [18,96])box(g,'#ac8654',x,17,7,137);
  for(let i=0;i<5;i++){box(g,'#8b6748',28+i*14,19,5,10);box(g,'#694733',28+i*14,151,5,5)}
  box(g,'#151416',28,34,64,115);box(g,'#634731',34,43,51,92);box(g,'#161012',42,53,37,49);
  for(let y=58;y<99;y+=8)for(let x=46;x<78;x+=8)box(g,'#7d6042',x,y,3,3);
  box(g,'#c6a26c',55,51,6,51);box(g,'#c6a26c',46,72,27,6);box(g,'#e7d5a9',57,63,2,21);
  box(g,'#271914',35,110,52,27);box(g,'#b08b5b',17,29,87,5);box(g,'#0d0b0c',10,155,103,7);
 });
 item('altar',112,98,(g)=>{
  box(g,'#101416',9,48,95,42);box(g,'#5f6060',13,43,87,44);box(g,'#bcb3a1',10,32,91,15);box(g,'#55473a',17,26,77,9);box(g,'#7d322e',29,47,52,28);box(g,'#dbc092',51,48,8,28);box(g,'#dbc092',40,59,29,7);box(g,'#141415',17,87,81,7);
  box(g,'#8f7351',23,18,6,13);box(g,'#e5af61',23,12,6,8);box(g,'#f9dc8e',25,10,2,10);box(g,'#8f7351',83,18,6,13);box(g,'#e5af61',83,12,6,8);box(g,'#fff4b6',85,10,2,10);
 });
 item('candles',73,82,(g)=>{
  box(g,'#332c2a',8,65,59,10);box(g,'#b08c5c',12,62,50,6);
  for(let i=0;i<4;i++){const x=12+i*14,y=21+(i%2)*10;box(g,'#e6d8b8',x,y,9,45-(i%2)*10);box(g,'#a08c68',x+2,y+1,2,35);box(g,'#ecc16a',x+3,y-8,4,7);box(g,'#fff4ba',x+4,y-12,2,7)}
 });
 item('keyItem',77,83,(g)=>{
  g.save();g.translate(39,41);g.rotate(.72);g.shadowColor='#e5bd69';g.shadowBlur=12;
  g.strokeStyle='#daba79';g.lineWidth=7;g.beginPath();g.arc(-9,-21,13,0,Math.PI*2);g.stroke();g.fillStyle='#daba79';g.fillRect(-14,-9,10,46);g.fillRect(-5,27,20,7);g.fillRect(-5,18,13,6);g.fillStyle='#fff1b2';g.fillRect(-12,-4,3,33);g.restore()
 });
 item('note',80,86,(g)=>{
  box(g,'#33281f',19,17,47,55);box(g,'#c9b191',16,11,48,54);box(g,'#f0d9a3',19,14,41,48);for(let i=0;i<5;i++)box(g,'#735847',23,24+i*7,30-i%3*5,2);box(g,'#992f36',41,49,10,10);
 });
 texWall[4]=pixelTexture(64,64,(g)=>{
  box(g,'#171516',0,0,64,64);box(g,'#5a4c43',3,2,58,60);box(g,'#251b1a',9,5,46,54);box(g,'#6f5140',13,7,38,50);
  for(let x of [17,37]){box(g,'#a57950',x,9,4,46);box(g,'#2c211d',x+5,11,11,42)}
  box(g,'#16100e',29,5,4,52);box(g,'#e0ae68',7,14,50,4);box(g,'#e0ae68',7,42,50,4);
  for(let x of [12,45])for(let y of [10,50])box(g,'#f7e2a0',x,y,3,3);
  box(g,'#d6a66d',28,25,7,17);box(g,'#141313',30,28,3,7);box(g,'#d5b48c',27,27,9,3);
 });
 // Four distinctive structural walls. Their distribution changes with each generated floor.
 texWall[5]=pixelTexture(64,64,(g)=>{ // stained-glass lancet window
  box(g,'#48433f',0,0,64,64);box(g,'#b19c7a',4,4,56,3);box(g,'#16171e',13,7,38,48);
  box(g,'#c29c6b',9,4,5,54);box(g,'#c29c6b',51,4,5,54);
  for(let y=13;y<53;y+=8)for(let x=17;x<49;x+=8){const v=(x+y)%5,colors=['#304f65','#793a55','#a27c45','#395d61','#654466'];box(g,colors[v],x,y,7,7);box(g,'#121c24',x+7,y,1,8)}
  box(g,'#bca37b',29,11,6,39);box(g,'#d4b786',23,23,18,5);box(g,'#312d30',11,53,42,6);
 });
 texWall[6]=pixelTexture(64,64,(g)=>{ // haunted library shelf
  box(g,'#302724',0,0,64,64);box(g,'#9b7855',3,3,58,5);
  for(let y of [11,33,55]){box(g,'#150f12',4,y,57,17);for(let i=0;i<12;i++){
   const x=7+i*4,ht=12+(i*3)%5;box(g,['#4e454b','#745447','#414e4b','#846640'][i%4],x,y+17-ht,3,ht);
   if(i%3===1)box(g,'#ad916e',x,y+4,3,1)
  }box(g,'#956e43',2,y+18,60,4)}
 });
 texWall[7]=pixelTexture(64,64,(g)=>{ // funeral relief and cracked masonry
  box(g,'#45413c',0,0,64,64);
  for(let y=0;y<64;y+=16){box(g,'#888079',0,y,64,2);for(let x=(y%32?0:8);x<64;x+=20)box(g,'#272623',x,y,2,16)}
  box(g,'#8b806d',17,7,32,49);box(g,'#333037',20,10,26,42);box(g,'#988b77',29,15,6,34);box(g,'#c1ac87',23,27,18,5);
  box(g,'#151719',32,17,2,10);box(g,'#967e65',17,55,32,3);
 });
 texWall[8]=pixelTexture(64,64,(g)=>{ // crimson monastery banner
  box(g,'#494340',0,0,64,64);for(let y=8;y<64;y+=16){box(g,'#716b60',0,y,64,3);box(g,'#2b2927',(y*3)%55,y-7,2,15)}
  box(g,'#31211f',13,5,38,55);box(g,'#883c3c',16,7,32,46);box(g,'#b37753',18,8,2,40);box(g,'#b37753',44,8,2,40);
  box(g,'#cba879',29,17,6,31);box(g,'#d6b98c',22,27,20,5);box(g,'#673532',16,55,32,4)
 });
} 

const renderSizes=IS_TOUCH?[350,430,520,640,760]:[420,520,640,760,900];
let renderLevel=IS_TOUCH?2:3, renderCost=0, renderCadence=0, renderSamples=0, qualityCheck=0;
let lastRadar=-Infinity,nextHud=0,nextPowerUI=0;
function adjustQuality(now,elapsed,cadence){
 if(cadence>100||cadence<=0)return;
 renderCost+=(elapsed-renderCost)*.06;
 renderCadence+=(cadence-renderCadence)*.06;
 if(++renderSamples<30||now<qualityCheck)return;
 let level=renderLevel;
 if(renderCost>17||(renderCadence>22&&renderCost>10))level--;
 else if(renderCost<8&&renderCadence<19)level++;
 level=clamp(level,0,renderSizes.length-1);
 qualityCheck=now+(level>renderLevel?4200:1400);
 if(level!==renderLevel){renderLevel=level;resize(false)}
}
function resize(reset=true){
 const {width,height}=canvas.getBoundingClientRect();
 if(!width||!height)return;
 const scale=Math.min(1,renderSizes[renderLevel]/Math.max(width,height),Math.sqrt(520000/(width*height)));
 const w=Math.max(2,Math.round(width*scale/2)*2),h=Math.max(2,Math.round(height*scale/2)*2);
 if(w===W&&h===H)return;
 if(reset!==false)mobile?.reset();
 const pitch=H?lookPitch/H:0,bob=H&&player?player.bob/H:0;
 W=w;H=h;lookPitch=pitch*H;
 if(player)player.bob=bob*H;
 canvas.width=W;canvas.height=H;
 proj=clamp(W,H*.76,H*2.16)/(2*TAN);
 ctx.imageSmoothingEnabled=true;
 resizeLighting();
}
window.addEventListener('resize',resize);
function generateWorld(){
 noiseSeed=(Math.imul(runSeed ^ (floorNo*179),2654435761)>>>0);
 return window.ObitelLayout.generate(MAPSIZE,floorNo,rng);
}
function gridDist(sx,sy,m){const d=Array.from({length:MAPSIZE},()=>Array(MAPSIZE).fill(-1)),q=[[sx,sy]];d[sy][sx]=0;for(let i=0;i<q.length;i++){let [x,y]=q[i];for(let [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){let nx=x+dx,ny=y+dy;if(ny<0||nx<0||ny>=MAPSIZE||nx>=MAPSIZE||m[ny][nx]||d[ny][nx]>=0)continue;d[ny][nx]=d[y][x]+1;q.push([nx,ny])}}return d}
function isWall(x,y){let xx=Math.floor(x),yy=Math.floor(y);return yy<0||xx<0||yy>=MAPSIZE||xx>=MAPSIZE||!!world[yy][xx]}
function canStand(x,y,r=.20){if(isWall(x-r,y-r)||isWall(x+r,y-r)||isWall(x-r,y+r)||isWall(x+r,y+r))return false;for(let o of objects)if(['barrel','wardrobe','confessional','altar'].includes(o.type)&&!o.used&&Math.hypot(o.x-x,o.y-y)<r+(o.type==='altar'?.32:.24))return false;return true}
function moveEntity(entity,dx,dy,r){if(canStand(entity.x+dx,entity.y,r))entity.x+=dx;if(canStand(entity.x,entity.y+dy,r))entity.y+=dy}
function makeBot(x,y,type,team,role='priest'){return {x,y,type,team,role,hp:type==='exorcist'?100:({ghost:68,wraith:100,cultist:93,demon:175}[type]||80),alive:true,a:0,speed:type==='wraith'?2.3:type==='demon'?1.6:1.9,walk:0,attack:1.0,attackAnim:0,flash:0,stun:0,path:[],pathTimer:0,deathAnim:0,alert:true,spawnGrace:0,abilityCd:2+Math.random()*5,abilityShield:0,abilityPhase:0}}
function botLive(b){return !!b&&b.alive!==false&&(b===player?b.health>0:b.hp>0)}
function botNearest(x,y,targets){let nearest=null,md=1e20;for(const o of targets){if(!botLive(o)||(o.abilityPhase||0)>0)continue;let d=Math.hypot(x-o.x,y-o.y);if(d<md){nearest=o;md=d}}return nearest}
function botHurt(e,damage){if(!botLive(e))return;if((e.abilityPhase||0)>0)damage*=.25;if((e.abilityShield||0)>0)damage*=.35;if(e===player){player.health=Math.max(0,player.health-damage);player.hurt=.45;if(player.health<=0)endGame(false);return}e.hp=Math.max(0,e.hp-damage);e.flash=.3;e.stun=.18;if(e.hp<=0){if(e===player){endGame(false);return}e.alive=false;e.deathAnim=.94;spawnHoly(e.x,e.y,22,e.type==='exorcist'?'gold':'blue')}}
let botPicker;
function botRoom() {
 const character = botPicker.character;
 battleSide = botPicker.side === 'hunt' ? 'exorcist' : 'spirit';
 if (battleSide === 'exorcist') battleHuman = character;
 else battleCreature = character;
 battleExCount = Number($('#skirmishExorcists').value);
 battleSpCount = Number($('#skirmishSpiritsCount').value);
 battleRoster = [{ character, label:'Вы' }];
 for (const [side, size] of [['hunt',battleExCount],['spirit',battleSpCount]]) {
  const roles = Object.keys(onlineClasses).filter(id => onlineClasses[id].side === side && id !== character);
  for (const id of roles.slice(0, size - Number(botPicker.side === side))) battleRoster.push({ character:id, label:'Бот' });
 }
 window.ObitelCharacters.renderRoster($('#skirmishRoster'),battleRoster);
 $('#skirmishSetup').hidden = true;
 $('#skirmishRoom').hidden = false;
}
function editBotRoom() {
 $('#skirmishSetup').hidden = false;
 $('#skirmishRoom').hidden = true;
 botPicker.render();
}
function battleStart() {
 if (!battleRoster.length) return;
 humanClass=battleHuman;
 battle=true;
 $('#skirmishScreen').classList.add('hidden');
 audioInit();createGame();
 if(IS_TOUCH&&innerWidth>innerHeight&&!document.fullscreenElement)immersiveFullscreen();
}

function powerConfig(){if(match)return onlinePower(match.me);if(battle&&battleSide==='spirit')return SPIRIT_ABILITY[battleCreature]||SPIRIT_ABILITY.ghost;return HUMAN_ABILITY[humanClass]||HUMAN_ABILITY.priest}
function powerUI(){
 if(!player)return;
 const now=performance.now();
 if(now<nextPowerUI)return;
 nextPowerUI=now+65;
 const b=$('#ability'),hud=$('#abilityInfo'), status=b.querySelector('.controlLabel');
 if(scene!=='play'){hud.style.display='none';return}
 const config=powerConfig(),cd=Math.max(0,player.abilityCd||0),ready=cd<.05&&player.health>0;
 const role=playerRole(), remaining=Math.ceil(cd);
 hud.style.display='block';
 const text=(onlineClasses[role].side==='spirit'?'ДУХ':'ЧЕЛОВЕК')+' · '+config.name+(ready?' · ГОТОВО':' · '+remaining+' С');
 if(hud.textContent!==text)hud.textContent=text;
 hud.classList.toggle('ready',ready);
 b.classList.toggle('cooling',!ready);
 b.disabled=!ready;
 const label=ready?status.dataset.readyLabel:player.health<=0?'Выбыли':remaining+' с';
 if(label&&status.textContent!==label)status.textContent=label;
 if(!ready){const charge=Math.round(100*(1-cd/config.cd))+'%';if(b.style.getPropertyValue('--charge')!==charge)b.style.setProperty('--charge',charge)}
}
function powerTick(dt){if(!player)return;player.abilityCd=Math.max(0,(player.abilityCd||0)-dt);player.abilityPhase=Math.max(0,(player.abilityPhase||0)-dt);player.abilityShield=Math.max(0,(player.abilityShield||0)-dt);powerUI()}
function dashPower(e,a,len=3.15){for(let i=0;i<22;i++){const x=e.x+Math.cos(a)*len/22,y=e.y+Math.sin(a)*len/22;if(!canStand(x,y,.2))break;e.x=x;e.y=y}}
function spiritPower(type,caster,targets,hurt){let x=caster.x,y=caster.y;
 if(type==='ghost'){caster.abilityPhase=3.4;spawnHoly(x,y,22,'blue')}
 else if(type==='wraith'){dashPower(caster,caster.a||0);spawnHoly(caster.x,caster.y,28,'violet')}
 else if(type==='cultist'){let n=0;for(const e of targets)if(e.hp>0&&Math.hypot(e.x-x,e.y-y)<2.8&&lineClear(x,y,e.x,e.y)){hurt(e,32);n++}caster.hp=Math.min(100,(caster.hp||100)+n*18);spawnHoly(x,y,28,'violet')}
 else if(type==='demon'){for(const e of targets)if(e.hp>0){const d=Math.hypot(e.x-x,e.y-y);if(d<3.1&&lineClear(x,y,e.x,e.y)){hurt(e,30);const dx=(e.x-x)/(d||1),dy=(e.y-y)/(d||1);moveEntity(e,dx*.45,dy*.45,.19)}}spawnHoly(x,y,44,'ember')}
}
function humanPower(type,caster,spirits,hurt,allies){let x=caster.x,y=caster.y;
 if(type==='medic'){caster.hp=Math.min(100,(caster.hp||100)+44);for(const a of allies)if(a!==caster&&a.hp>0&&Math.hypot(a.x-x,a.y-y)<4.2)a.hp=Math.min(100,a.hp+35);spawnHoly(x,y,32,'gold');return}
 if(type==='guardian'){caster.abilityShield=5.5;for(const a of allies)if(a!==caster&&a.hp>0&&Math.hypot(a.x-x,a.y-y)<3.6)a.abilityShield=4.5;spawnHoly(x,y,34,'gold');return}
 const radius=type==='hunter'?6:3.2;
 for(const e of spirits){if(e.hp<=0||e.alive===false)continue;const d=Math.hypot(e.x-x,e.y-y);if(d>radius||!lineClear(x,y,e.x,e.y))continue;if(type==='hunter'&&Math.abs(normAng(Math.atan2(e.y-y,e.x-x)-(caster.a||0)))>.55)continue;hurt(e,Math.round((type==='hunter'?83:42)*(1-d/(radius*2.6))));e.stun=Math.max(e.stun||0,type==='hunter'?1.35:1.1)}spawnHoly(x,y,40,'gold')
}
function useAbility(){if(!player||scene!=='play'||player.abilityCd>.03||player.health<=0||player.hidden)return;
 if(match){if(player.abilityCd<=.03&&match.me.stun===0)match.action++;return}
 player.powerAnim=.62;
 if(battle&&battleSide==='spirit'){const t=SPIRIT_ABILITY[battleCreature];player.abilityCd=t.cd;const sp={get x(){return player.x},set x(v){player.x=v},get y(){return player.y},set y(v){player.y=v},a:player.a,hp:player.health,abilityPhase:0};spiritPower(battleCreature,sp,exorcistBots.filter(e=>e.team==='enemy'),(e,d)=>botHurt(e,d));player.health=sp.hp;player.abilityPhase=sp.abilityPhase||0;sfx('growl');showToast(t.name,1.2);powerUI();return}
 const t=HUMAN_ABILITY[humanClass]||HUMAN_ABILITY.priest;player.abilityCd=t.cd;
 const caster={x:player.x,y:player.y,a:player.a,hp:player.health,abilityShield:0};
 if(battle)humanPower(humanClass,caster,enemies,(e,d)=>botHurt(e,d),[caster,...exorcistBots]);
 else{humanPower(humanClass,caster,enemies,(e,d)=>{e.hp-=d;e.flash=.45;e.stun=Math.max(e.stun||0,1);if(e.hp<=0)banish(e)},[caster])}
 player.health=caster.hp;player.abilityShield=caster.abilityShield;player.holyGlow=Math.max(.34,player.holyGlow||0);sfx('holy');showToast(t.name,1.3);powerUI()
}
function botPowers(dt){if(!battle)return;const ghosts=battleSide==='spirit'?spiritAllyBots:enemies,human=exorcistBots;
 for(const b of [...human,...ghosts]){if(!botLive(b))continue;b.abilityCd=Math.max(0,(b.abilityCd||0)-dt);b.abilityShield=Math.max(0,(b.abilityShield||0)-dt);b.abilityPhase=Math.max(0,(b.abilityPhase||0)-dt);if(b.abilityCd>0)continue;
 let enemies=b.type==='exorcist'?ghosts:human,target=botNearest(b.x,b.y,enemies);if(!target||Math.hypot(target.x-b.x,target.y-b.y)>4.4)continue;
 b.powerAnim=.62;
 b.abilityCd=(b.type==='exorcist'?HUMAN_ABILITY[b.role||'priest']:SPIRIT_ABILITY[b.type]).cd;
 if(b.type==='exorcist')humanPower(b.role||'priest',b,enemies,(e,d)=>botHurt(e,d),human.filter(e=>e.team===b.team));
 else spiritPower(b.type,b,human.filter(e=>e.team!==b.team),(e,d)=>botHurt(e,d));
 }}

function battleAttack(){
 if(scene!=='play'||player.fireCd>0||player.health<=0)return;
 const role=playerRole(),config=onlineClasses[role];
 const opponents=(battleSide==='spirit'?exorcistBots:enemies).filter(botLive);
 player.fireCd=config.interval;player.crossEffect=window.ObitelAnimation.attackTime(role);player.shots++;player.abilityPhase=0;
 attackSound(role);
 const {targets,tx,ty,tz,wall}=resolveAttack(player,role,opponents,aimingSlope());
 addCombatFX(role,player.x,player.y,tx,ty,tz,targets.length>0,wall);
 for(const target of targets){
  botHurt(target,config.damage);
  if(!botLive(target))player.kills++;
 }
 if(targets.length)hitFeedback();
}
function advanceBot(b,target,dt,range){b.moving=0;let d=Math.hypot(target.x-b.x,target.y-b.y);b.a=Math.atan2(target.y-b.y,target.x-b.x);b.pathTimer-=dt;if(b.pathTimer<=0){b.pathTimer=rand(.52,.83);b.path=bPath(b.x,b.y,target.x,target.y)}let goal=b.path[0]||target;if(b.path.length&&Math.hypot(b.x-goal.x,b.y-goal.y)<.22){b.path.shift();goal=b.path[0]||target}if(d>range||!lineClear(b.x,b.y,target.x,target.y)){let dx=goal.x-b.x,dy=goal.y-b.y,len=Math.hypot(dx,dy)||1;const x=b.x,y=b.y;moveEntity(b,dx/len*b.speed*dt,dy/len*b.speed*dt,.18);const moved=Math.hypot(b.x-x,b.y-y);b.moving=moved>.001?1:0;b.walk+=moved*4}return d}
function battleBotsUpdate(dt){botPowers(dt);
 const spirits=battleSide==='spirit'?spiritAllyBots:enemies;
 const exorcists=battleSide==='spirit'?exorcistBots:[player,...exorcistBots];
 const spiritTargets=battleSide==='spirit'?spirits.concat([player]):spirits;
 const exTargets=exorcists;
 for(const b of exorcistBots){if(!botLive(b))continue;b.flash=Math.max(0,b.flash-dt);b.attackAnim=Math.max(0,b.attackAnim-dt);b.attack-=dt;
  let target=botNearest(b.x,b.y,spiritTargets);if(!target)continue;let d=advanceBot(b,target,dt,2.3);
  if(d<4.6&&lineClear(b.x,b.y,target.x,target.y)&&b.attack<=0){b.attack=1.0;b.attackAnim=.34;addCombatFX(b.role||'priest',b.x,b.y,target.x,target.y,.48,true,false);botHurt(target,d<2?26:17)}
 }
 for(const b of spirits){if(!botLive(b))continue;b.flash=Math.max(0,(b.flash||0)-dt);b.stun=Math.max(0,(b.stun||0)-dt);b.attackAnim=Math.max(0,(b.attackAnim||0)-dt);b.attack-=dt;
  let target=botNearest(b.x,b.y,exTargets);if(!target)continue;let d=advanceBot(b,target,dt,.75);
  if(d<.99&&b.attack<=0&&lineClear(b.x,b.y,target.x,target.y)){b.attack=1.1;b.attackAnim=.45;addCombatFX(b.type,b.x,b.y,target.x,target.y,.49,true,false);botHurt(target,({ghost:11,wraith:17,cultist:14,demon:22})[b.type]||12)}
 }
 for(const b of [...spirits,...exorcistBots]){
  b.powerAnim=Math.max(0,(b.powerAnim||0)-dt);
  if(!botLive(b)&&b.deathAnim>0)b.deathAnim=Math.max(0,b.deathAnim-dt);
 }
 const liveEx=exorcists.filter(botLive).length,liveSp=spiritTargets.filter(botLive).length;
 if(player.health<=0){endGame(false);return}if((battleSide==='spirit'?liveEx:liveSp)===0){endGame(true);return}
 hudText('signal','ЭКЗОРЦИСТЫ '+liveEx+' · ДУХИ '+liveSp);hudText('missionSmall','СХВАТКА · '+onlineClasses[battleRoster[0].character].name.toUpperCase());
}
function createGame(loadCheckpoint=false){
 const saved=loadCheckpoint===true?safeRead(SAVE_KEY):null;
 if(saved){floorNo=Math.max(1,saved.floorNo|0);runSeed=saved.runSeed>>>0;difficulty=saved.difficulty||'normal';foundLore=Array.isArray(saved.foundLore)?saved.foundLore:[]}
 else{floorNo=1;runSeed=(Math.random()*0xffffffff)>>>0;difficulty=$('#difficultySelect')?.value||'normal';foundLore=[]}
 const health=saved?clamp(saved.health,15,100):100,grenades=saved?clamp(saved.grenades,1,16):7;if(!battle)humanClass='priest';
 player={x:2.45,y:2.4,a:.1,health,stamina:100,battery:100,flash:true,grenades,keys:0,weapon:'cross',waterCd:0,crossEffect:0,throwAnim:0,holyGlow:0,cores:0,kills:saved?.kills||0,shots:saved?.shots||0,reload:0,fireCd:0,flashShot:0,hurt:0,bob:0,steps:0,moveSpeed:0,walkTime:0,started:performance.now(),hidden:false,hideSpot:null,hideFrom:null,abilityCd:0,abilityPhase:0,abilityShield:0};
 scene='play';$('#menu').classList.add('hidden');$('#resultScreen').classList.add('hidden');$('#pauseScreen').classList.add('hidden');$('#mapScreen').classList.add('hidden');$('#hud').style.display='block';$('#touchControls').classList.add('gameOn');
 mobile.theme(playerRole(),onlineClasses[playerRole()],!battle);makeFloor(true);last=performance.now();startAmbient();saveCheckpoint();powerUI();
}
function makeFloor(initial=false){
 nextHud=nextPowerUI=0;lastRadar=-Infinity;
 world=generateWorld();visited=Array.from({length:MAPSIZE},()=>Array(MAPSIZE).fill(false));enemies=[];objects=[];particles=[];projectiles=[];combatEffects=[];vaultDoor=null;exorcistBots=[];spiritAllyBots=[];player.abilityCd=0;player.abilityPhase=0;player.abilityShield=0;
 player.x=2.45;player.y=2.4;player.a=.1;player.keys=0;player.cores=0;player.hidden=false;player.hideSpot=null;player.hideFrom=null;player.stamina=100;player.battery=Math.max(45,player.battery);player.flash=true;player.fireCd=0;player.hurt=0;player.moveSpeed=0;player.weaponMotion=0;player.walkTime=0;player.bob=0;lookPitch=0;spiritEmitTime=0;t=0;groanTick=0;resetInputs();
 floorFlavor=floorNames[(floorNo-1)%floorNames.length];
 // Build a sealed side chamber. A key outside opens it; another key inside opens the descent.
 const centers=[];const initialD=gridDist(2,2,world);
 for(let y=5;y<MAPSIZE-4;y++)for(let x=5;x<MAPSIZE-4;x++)if(initialD[y][x]>17)centers.push({x,y,d:initialD[y][x],rnd:rng()});
 centers.sort((a,b)=>b.d-a.d+b.rnd-a.rnd);
 for(const c of centers){
  let picked=null;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const ox=c.x+dx*3,oy=c.y+dy*3; if(world[oy]?.[ox]!==0)continue;
   let trial=world.map(row=>row.slice());
   for(let yy=c.y-2;yy<=c.y+2;yy++)for(let xx=c.x-2;xx<=c.x+2;xx++)trial[yy][xx]=xx===c.x-2||xx===c.x+2||yy===c.y-2||yy===c.y+2?1:0;
   const gx=c.x+dx*2,gy=c.y+dy*2;trial[gy][gx]=2;
   const reachable=gridDist(2,2,trial);
   let outside=0,connected=0;
   for(let y=1;y<MAPSIZE-1;y++)for(let x=1;x<MAPSIZE-1;x++){
    if(trial[y][x]!==0||(Math.abs(x-c.x)<2&&Math.abs(y-c.y)<2))continue;
    outside++;
    if(reachable[y][x]>=0)connected++;
   }
   if(reachable[oy][ox]>=0&&connected===outside){picked={trial,x:gx,y:gy,cx:c.x,cy:c.y};break}
  }
  if(picked){world=picked.trial;vaultDoor={type:'lockedDoor',x:picked.x+.5,y:picked.y+.5,gx:picked.x,gy:picked.y,roomX:picked.cx,roomY:picked.cy,used:false};break}
 }
 // The emergency fallback still gives a locked chamber: never make a floor unwinnable.
 if(!vaultDoor){
  const cx=19,cy=19;for(let yy=cy-2;yy<=cy+2;yy++)for(let xx=cx-2;xx<=cx+2;xx++)world[yy][xx]=xx===cx-2||xx===cx+2||yy===cy-2||yy===cy+2?1:0;
  const sideX=cx-2;world[cy][sideX]=2;for(let xx=3;xx<sideX;xx++)world[cy][xx]=0;for(let yy=2;yy<=cy;yy++)world[yy][3]=0;
  vaultDoor={type:'lockedDoor',x:sideX+.5,y:cy+.5,gx:sideX,gy:cy,roomX:cx,roomY:cy,used:false};
 }
 const vcx=vaultDoor.roomX,vcy=vaultDoor.roomY;
 const dmap=gridDist(2,2,world);
 const cells=[];for(let y=1;y<MAPSIZE-1;y++)for(let x=1;x<MAPSIZE-1;x++)if(world[y][x]===0&&dmap[y][x]>3)cells.push({x,y,d:dmap[y][x]});
 cells.sort((a,b)=>b.d-a.d);
 const reserved=[{x:vcx,y:vcy}];
 function pick(minD=10,sep=4){let best=null,bestScore=-1e9;for(const c of cells){if(c.d<minD||reserved.some(o=>Math.hypot(c.x-o.x,c.y-o.y)<sep))continue;const spread=reserved.length?Math.min(...reserved.map(o=>Math.hypot(c.x-o.x,c.y-o.y))):10,score=c.d*.5+spread*1.4+rng()*6;if(score>bestScore){best=c;bestScore=score}}if(!best)best=cells.find(c=>!reserved.some(o=>o.x===c.x&&o.y===c.y))||{x:6,y:6,d:4};reserved.push(best);return best}
 let out=pick(18,8);exitObject={type:'exit',x:out.x+.5,y:out.y+.5,used:false};objects.push(exitObject);
 objectives=[{type:'core',x:vcx+.5,y:vcy+.5,used:false,id:1}];objects.push(objectives[0]);
 for(let i=2;i<=3;i++){const c=pick(11,7);const core={type:'core',x:c.x+.5,y:c.y+.5,used:false,id:i};objectives.push(core);objects.push(core)}
 // Two physical brass keys: one in the public passages, one sealed in the vault.
 const key=pick(7,5);objects.push({type:'keyItem',x:key.x+.5,y:key.y+.5,used:false,id:1});
 objects.push({type:'keyItem',x:vcx+1.5,y:vcy+.5,used:false,id:2});
 const candidates=cells.filter(c=>c.d>5&&!reserved.some(o=>Math.hypot(o.x-c.x,o.y-c.y)<2));
 // Place props only on reachable floor cells; furniture must never break the key/exit route.
 const blockingFurniture=new Set(['barrel','wardrobe','confessional','altar']);
 const goalTiles=[{x:out.x,y:out.y},{x:key.x,y:key.y},...objectives.slice(1).map(o=>({x:Math.floor(o.x),y:Math.floor(o.y)}))];
 const centerTiles=Array.from({length:MAPSIZE},(_,y)=>Array.from({length:MAPSIZE},(_,x)=>world[y][x]===0));
 const doorOutside=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:vaultDoor.gx+dx,y:vaultDoor.gy+dy})).find(c=>centerTiles[c.y]?.[c.x]&&Math.hypot(c.x-vcx,c.y-vcy)>2.2);
 if(doorOutside)goalTiles.push(doorOutside);
 function passableWithFurniture(candidate){
  const blocked=new Set(objects.filter(o=>blockingFurniture.has(o.type)&&!o.used).map(o=>`${Math.floor(o.x)},${Math.floor(o.y)}`));
  if(candidate)blocked.add(`${candidate.x},${candidate.y}`);
  const queue=[[2,2]],seen=new Set(['2,2']);
  for(let k=0;k<queue.length;k++){
   const [x,y]=queue[k];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx,ny=y+dy,id=`${nx},${ny}`;
    if(!centerTiles[ny]?.[nx]||seen.has(id)||blocked.has(id))continue;
    seen.add(id);queue.push([nx,ny]);
   }
  }
  return goalTiles.every(c=>seen.has(`${c.x},${c.y}`));
 }
 function goodPropTile(c,type){
  if(!c||c.d<5||Math.hypot(c.x-2,c.y-2)<5)return false;
  if(reserved.some(o=>Math.hypot(o.x-c.x,o.y-c.y)<(type==='candles'?2.2:3.0)))return false;
  if(objects.some(o=>Math.hypot(o.x-c.x-.5,o.y-c.y-.5)<(blockingFurniture.has(type)?1.75:1.1)))return false;
  if(enemies.some(e=>Math.hypot(e.x-c.x-.5,e.y-c.y-.5)<1.05))return false;
  const side=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({dx,dy,empty:centerTiles[c.y+dy]?.[c.x+dx]}));
  const exits=side.filter(v=>v.empty).length;
  if(blockingFurniture.has(type)){
   if(exits!==3)return false; // An alcove with one wall side, not a narrow corridor.
   // Don't block one-cell gateways and never interrupt the route to important objects.
   if(!passableWithFurniture(c))return false;
  }else if(type==='candles'||type==='lamp'||type==='note'){
   if(exits<2||exits===4)return false; // Small decor sits along walls rather than in the middle of a room.
  }
  return true;
 }
 function place(type,n,sep=3){
  const available=[...candidates],used=[];
  for(let i=available.length-1;i>0;i--){
   const j=Math.floor(rng()*(i+1));
   [available[i],available[j]]=[available[j],available[i]];
  }
  for(const c of available){
   if(used.length>=n)break;
   if(used.some(o=>Math.hypot(o.x-c.x,o.y-c.y)<sep)||!goodPropTile(c,type))continue;
   const side=[[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dy])=>!centerTiles[c.y+dy]?.[c.x+dx]);
   // Back furniture gently toward an adjacent wall, keeping its collision inside the tile.
   const off=blockingFurniture.has(type)?.11:(['candles','lamp','note'].includes(type)?.22:0);
   const x=c.x+.5+(side?.[0]||0)*off,y=c.y+.5+(side?.[1]||0)*off;
   objects.push({type,x,y,used:false,hp:type==='barrel'?65:0});used.push(c);
  }
 }
 place('ammoItem',9+Math.min(5,floorNo),3);place('medItem',5,4);place('batteryItem',7,3);place('barrel',8,4);place('lamp',15,2);place('wardrobe',5,5);place('confessional',3,6);place('altar',4,5);place('candles',13,2);place('note',2,8);
 function placeEnemy(type,x,y,grace=0){if(isWall(x,y))return;enemies.push({x,y,type,hp:({ghost:68,cultist:93,wraith:100,demon:175})[type]*(difficulty==='hard'?1.25:difficulty==='easy'?.78:1),alive:true,speed:({ghost:1.03,cultist:.78,wraith:1.1,demon:.68})[type],alert:false,lastSeen:0,attack:rand(.7,1.7),path:[],pathTimer:0,stun:0,walk:rand(0,10),flash:0,attackAnim:0,deathAnim:0,spawnGrace:grace})}
 if(battle){
  player.health=100;player.stamina=100;player.flash=battleSide==='exorcist';player.grenades=battleSide==='exorcist'?8:0;player.weapon='cross';
  const team=[{x:2.45,y:2.4},{x:3.55,y:2.65},{x:2.55,y:3.55},{x:3.50,y:3.55}];
  const far=candidates.filter(c=>c.d>9&&canStand(c.x+.5,c.y+.5));
  function distant(i){const c=far[(Math.floor(i*Math.max(1,far.length-1)/Math.max(1,4)))|0]||cells[(i*18)%cells.length]||{x:8,y:8};return {x:c.x+.5,y:c.y+.5}}
  let ally=1, opponent=0;
  const playerTeam=battleSide==='spirit'?'spirit':'hunt';
  for(const {character} of battleRoster.slice(1)){
   const role=onlineClasses[character], friendly=role.side===playerTeam;
   const p=friendly?team[ally++]:distant(opponent++);
   if(role.side==='hunt')exorcistBots.push(makeBot(p.x,p.y,'exorcist',friendly?'ally':'enemy',character));
   else (friendly?spiritAllyBots:enemies).push(makeBot(p.x,p.y,character,friendly?'ally':'enemy'));
  }

  markVisit();$('#coreCount').textContent=battleExCount+' × '+battleSpCount;$('#missionSmall').textContent='КОМАНДНАЯ СХВАТКА · '+(battleSide==='spirit'?'ДУХИ':'ЭКЗОРЦИСТЫ');$('#floorStat').textContent='АРЕНА · '+floorFlavor;$('#signal').textContent='ПОБЕДИТЕ ВРАЖЕСКУЮ КОМАНДУ';updateHud();showToast('СХВАТКА: '+(battleSide==='spirit'?'ВЫ ЗА ДУХОВ':'ВЫ ЗА ЭКЗОРЦИСТОВ'),3);return;
 }
 if(floorNo===1){placeEnemy('ghost',4.78,2.4,10);placeEnemy('cultist',4.35,3.18,13);placeEnemy('wraith',1.55,4.15,15)}
 const count=Math.min(29,9+floorNo*2)*(difficulty==='easy'?.75:difficulty==='hard'?1.35:1);
 let used=[];for(let i=0,tries=0;i<count&&tries<1400;tries++){
  const c=candidates[(rng()*candidates.length)|0];if(!c||c.d<7||used.some(o=>Math.hypot(c.x-o.x,c.y-o.y)<3)||objects.some(o=>['core','keyItem','wardrobe','confessional'].includes(o.type)&&Math.hypot(o.x-c.x-.5,o.y-c.y-.5)<2))continue;
  placeEnemy(['ghost','wraith','cultist','demon'][i%4],c.x+.5,c.y+.5,rand(3,11));used.push(c);i++
 }
 markVisit();$('#coreCount').textContent='0 / 3';$('#missionSmall').textContent=`ЭТАЖ ${floorNo} · ${floorFlavor.toUpperCase()}`;$('#floorStat').textContent='ЭТАЖ '+floorNo+' · '+floorFlavor;$('#signal').textContent='ИЩИТЕ КЛЮЧИ, УКРЫТИЯ И ПЕЧАТИ';updateHud();saveCheckpoint();showToast(initial?'ПЕРВЫЙ ЭТАЖ. ПЕРВАЯ ДВЕРЬ ЗАПЕРТА':'СПУСК: ЭТАЖ '+floorNo+' · '+floorFlavor,3.2);
}

function markVisit(){let x=Math.floor(player.x),y=Math.floor(player.y);if(player.visitGrid===visited&&player.visitX===x&&player.visitY===y)return;player.visitGrid=visited;player.visitX=x;player.visitY=y;for(let j=-4;j<=4;j++)for(let i=-4;i<=4;i++)if(x+i>=0&&y+j>=0&&x+i<MAPSIZE&&y+j<MAPSIZE&&Math.hypot(i,j)<4.5)visited[y+j][x+i]=true}
function castRay(rayX,rayY,origin=player){let mapX=Math.floor(origin.x),mapY=Math.floor(origin.y),deltaX=Math.abs(1/rayX),deltaY=Math.abs(1/rayY),stepX,stepY,sideX,sideY,side=0; if(rayX<0){stepX=-1;sideX=(origin.x-mapX)*deltaX}else{stepX=1;sideX=(mapX+1-origin.x)*deltaX}if(rayY<0){stepY=-1;sideY=(origin.y-mapY)*deltaY}else{stepY=1;sideY=(mapY+1-origin.y)*deltaY}
 for(let n=0;n<62;n++){if(sideX<sideY){sideX+=deltaX;mapX+=stepX;side=0}else{sideY+=deltaY;mapY+=stepY;side=1}if(mapY<0||mapX<0||mapX>=MAPSIZE||mapY>=MAPSIZE||world[mapY][mapX])break}
 let d=Math.max(.01,side===0?(mapX-origin.x+(1-stepX)/2)/rayX:(mapY-origin.y+(1-stepY)/2)/rayY),wallX=side===0?origin.y+d*rayY:origin.x+d*rayX;wallX-=Math.floor(wallX);if(side===0&&rayX>0||side===1&&rayY<0)wallX=1-wallX;return {d,wallX,side,mx:mapX,my:mapY}}
function lineClear(x1,y1,x2,y2){let d=Math.hypot(x2-x1,y2-y1),steps=Math.ceil(d*9);for(let i=1;i<steps;i++){let f=i/steps;if(isWall(x1+(x2-x1)*f,y1+(y2-y1)*f))return false}return true}
const pathQueue=new Int16Array(MAPSIZE*MAPSIZE),pathParents=new Int16Array(MAPSIZE*MAPSIZE);
function bPath(ex,ey,tx,ty){
 const start=Math.floor(ey)*MAPSIZE+Math.floor(ex),goal=Math.floor(ty)*MAPSIZE+Math.floor(tx);
 if(start===goal)return [];
 pathParents.fill(-1);pathParents[start]=start;pathQueue[0]=start;
 let tail=1;
 for(let i=0;i<tail;i++){
  const id=pathQueue[i],x=id%MAPSIZE,y=(id-x)/MAPSIZE;
  for(let d=0;d<4;d++){
   const nx=x+(d===0?1:d===1?-1:0),ny=y+(d===2?1:d===3?-1:0);
   if(nx<0||nx>=MAPSIZE||ny<0||ny>=MAPSIZE||world[ny][nx])continue;
   const next=ny*MAPSIZE+nx;
   if(pathParents[next]>=0)continue;
   pathParents[next]=id;
   if(next===goal){
    const nodes=[];
    for(let cell=goal;cell!==start;cell=pathParents[cell]){
     const col=cell%MAPSIZE;
     nodes.push({x:col+.5,y:(cell-col)/MAPSIZE+.5});
    }
    return nodes.reverse();
   }
   pathQueue[tail++]=next;
  }
 }
 return [];
}
let projectiles=[],combatEffects=[];
const MAX_PARTICLES=180;
const effectColors={gold:'#ffdb92',ember:'#ffac62',blue:'#86e9ff',violet:'#d2a1ff'};
function aimingSlope(){return (viewHorizon()-H*.5)/proj}
function hitFeedback(){
 $('#hitMark').style.opacity='1';hitUntil=t+.18;sfx('impact');
}
function usesRay(character){return character==='hunter'||character==='priest'||character==='medic'||character==='cultist'}
function attackSound(character){
 sfx(character==='hunter'?'shot':onlineClasses[character].side==='hunt'?'holy':'growl');
}
function traceAttack(actor,range,opponents,slope,assist=0){
 const dx=Math.cos(actor.a),dy=Math.sin(actor.a);
 const wall=Math.min(range,castRay(dx,dy,actor).d);
 const ground=slope<0?-.5/slope:Infinity,ceiling=slope>0?.5/slope:Infinity;
 let distance=Math.min(wall,ground,ceiling),target=null;
 for(const other of opponents){
  const ox=other.x-actor.x,oy=other.y-actor.y;
  const forward=ox*dx+oy*dy,side=Math.abs(oy*dx-ox*dy);
  const barrel=other.type==='barrel';
  const radius=(barrel?.24:other.type==='demon'||other.character==='demon'?.36:.29)+assist;
  if(forward<=0||forward>range+.15||side>=radius||barrel&&forward>3.1)continue;
  const depth=Math.max(.05,forward-Math.sqrt(radius*radius-side*side));
  const z=.5+slope*depth;
  if(depth>=distance||z<(barrel?0:.06)||z>(barrel?.64:1.16)||!lineClear(actor.x,actor.y,other.x,other.y))continue;
  distance=depth;target=other;
 }
 const end=Math.max(.04,distance-(target?0:.024));
 return {target,tx:actor.x+dx*end,ty:actor.y+dy*end,tz:clamp(.5+slope*end,.01,1.16),wall:distance<range&&!target};
}
function addCombatFX(character,x,y,tx,ty,tz,hit,wall){
 const [color,kind]=character==='water'?['blue','burst']:[
  onlineClasses[character].color,usesRay(character)?'beam':'slash'
 ];
 const life=kind==='beam'?(character==='hunter'?.12:.23):kind==='slash'?.24:.40;
 if(combatEffects.length>=32)combatEffects.shift();
 combatEffects.push({kind,character,color,x,y,z:.5,tx,ty,tz,hit,wall,start:t,life});
 if(hit||wall||kind==='burst')spawnHoly(tx,ty,kind==='burst'?31:hit?12:6,color,tz);
}
function primaryAttack(){
 if(!player||scene!=='play'||player.health<=0||player.hidden)return;
 if(!match&&!battle&&player.weapon==='water'){if(player.waterCd<=0)throwWater();return}
 useCross();
}
function spawnHoly(x,y,n=24,hue='blue',height){
 n=Math.min(n,Math.max(0,MAX_PARTICLES-particles.length));
 for(let i=0;i<n;i++){const a=rand(0,TAU),v=rand(.45,3.8);particles.push({x,y,z:height??rand(.05,.75),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rand(.05,2.6),life:rand(.35,.85),max:.85,size:rand(1.5,5),hue})}}
function banish(e){if(!e.alive)return;e.alive=false;e.deathAnim=.94;e.attackAnim=0;player.kills++;sfx('banish');spawnHoly(e.x,e.y,35,e.type==='wraith'?'violet':'blue');objects.push({type:'ashes',x:e.x,y:e.y,born:t,used:false})}
function useCross(){
 if(match){match.pulseUntil=performance.now()+125;return}
 if(battle){battleAttack();return}
 if(scene!=='play'||player.hidden||player.fireCd>0||player.health<=0)return;
 player.weapon='cross';player.fireCd=.42;player.crossEffect=window.ObitelAnimation.attackTime('priest');player.shots++;
 attackSound('priest');
 const candidates=enemies.filter(e=>e.alive);
 for(const o of objects)if(o.type==='barrel'&&!o.used)candidates.push(o);
 const shot=traceAttack(player,5.2,candidates,aimingSlope(),.20);
 const {target,tx,ty,tz,wall}=shot;
 addCombatFX('priest',player.x,player.y,tx,ty,tz,!!target,wall);
 if(!target)return;
 hitFeedback();
 if(target.type==='barrel'){target.hp-=18;if(target.hp<=0)explodeBarrel(target);return}
 const d=dist(player,target),power=({ghost:51,wraith:43,cultist:36,demon:26})[target.type];
 target.hp-=power*(1-d/13);target.flash=.27;target.stun=.42;target.alert=true;target.lastSeen=t;target.attackAnim=0;
 const away=clamp((5-d)*.08,.1,.32);
 moveEntity(target,(target.x-player.x)/(d||1)*away,(target.y-player.y)/(d||1)*away,.2);
 if(target.hp<=0)banish(target);
}
function throwWater(){if(match||battle)return;if(scene!=='play'||player.hidden||player.health<=0||player.waterCd>0)return;player.weapon='water';if(player.grenades<=0){showToast('СВЯТАЯ ВОДА ЗАКОНЧИЛАСЬ — ИЩИТЕ ФЛАКОНЫ',1.8);player.waterCd=.35;sfx('empty');return}
 player.grenades--;player.waterCd=.85;player.throwAnim=.65;player.shots++;sfx('waterThrow');const a=player.a;
 projectiles.push({x:player.x+Math.cos(a)*.08,y:player.y+Math.sin(a)*.08,z:.42,vx:Math.cos(a)*5.8,vy:Math.sin(a)*5.8,vz:1.2+aimingSlope()*4.2,age:0,spin:0,trail:0});
 for(const e of enemies)if(e.alive&&dist(e,player)<9){e.alert=true;e.lastSeen=t}
 updateHud()}
function waterBurst(p){sfx('waterBlast');addCombatFX('water',p.x,p.y,p.x,p.y,clamp(p.z,.08,.93),false,false);const radius=3.15;
 for(let e of enemies)if(e.alive){let d=Math.hypot(e.x-p.x,e.y-p.y);if(d<radius&&lineClear(p.x,p.y,e.x,e.y)){e.hp-=Math.round(175*(1-d/(radius+1.1)));e.flash=.5;e.stun=1.5;e.alert=true;e.lastSeen=t;const nx=(e.x-p.x)/(d||1),ny=(e.y-p.y)/(d||1);moveEntity(e,nx*.30,ny*.30,.2);if(e.hp<=0)banish(e)}}
 if(dist(player,p)<1.25){player.hurt=Math.max(player.hurt,.08)}
 for(let o of objects)if(o.type==='barrel'&&!o.used&&Math.hypot(o.x-p.x,o.y-p.y)<2&&lineClear(p.x,p.y,o.x,o.y)){o.hp-=85;if(o.hp<=0)explodeBarrel(o)}
}
function updateHoly(dt){player.powerAnim=Math.max(0,(player.powerAnim||0)-dt);player.crossEffect=Math.max(0,player.crossEffect-dt);player.throwAnim=Math.max(0,player.throwAnim-dt);player.waterCd=Math.max(0,player.waterCd-dt);player.holyGlow=Math.max(0,player.holyGlow-dt);
 for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.age+=dt;p.spin+=dt*13;p.trail=(p.trail||0)+dt;if(p.trail>.045&&particles.length<MAX_PARTICLES){p.trail=0;particles.push({x:p.x,y:p.y,z:p.z,vx:rand(-.12,.12),vy:rand(-.12,.12),vz:.12,life:.35,max:.35,size:2,hue:'blue'})}let nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;p.vz-=4.4*dt;p.z+=p.vz*dt;let impact=isWall(nx,ny)||p.z<.03||p.z>.99||p.age>.90||enemies.some(e=>e.alive&&Math.hypot(e.x-nx,e.y-ny)<.40&&p.age>.10);if(!impact){p.x=nx;p.y=ny}else{waterBurst(p);projectiles.splice(i,1)}}
 for(let i=combatEffects.length-1;i>=0;i--)if(t-combatEffects[i].start>=combatEffects[i].life)combatEffects.splice(i,1);
 for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=4*dt;p.vx*=.96;p.vy*=.96;if(p.life<=0)particles.splice(i,1)}
 for(let i=objects.length-1;i>=0;i--){let o=objects[i];if(o.type==='ashes'&&t-o.born>2.2)objects.splice(i,1)}
}

function smoothMove(dt){
 const blend=1-Math.exp(-dt*32);
 touch.forward+=(touch.forwardTarget-touch.forward)*blend;
 touch.strafe+=(touch.strafeTarget-touch.strafe)*blend;
}
function battleSpiritUpdate(dt){powerTick(dt);t+=dt;player.fireCd=Math.max(0,player.fireCd-dt);player.hurt=Math.max(0,player.hurt-dt);smoothMove(dt);
 let f=(key.KeyW||key.ArrowUp?1:0)-(key.KeyS||key.ArrowDown?1:0)+touch.forward,side=(key.KeyD?1:0)-(key.KeyA?1:0)+touch.strafe;
 if(key.ArrowLeft)player.a-=dt*1.8;if(key.ArrowRight)player.a+=dt*1.8;let len=Math.hypot(f,side);if(len>1){f/=len;side/=len}
 player.stamina=clamp(player.stamina+19*dt,0,100);let speed=onlineClasses[battleCreature].speed;player.moveSpeed=len>.13?speed:0;
 if(len>.1){moveEntity(player,(Math.cos(player.a)*f-Math.sin(player.a)*side)*speed*dt,(Math.sin(player.a)*f+Math.cos(player.a)*side)*speed*dt,.19);player.walkTime+=dt*7}player.bob=len>.1?Math.sin(player.walkTime*2)*H*.0031:player.bob*.85;markVisit();
 if(mouseFire||touch.fire||key.Space||key.ControlLeft)primaryAttack();battleBotsUpdate(dt);updateHoly(dt);updateHud();
}
function update(dt){if(scene!=='play')return;if(battle&&battleSide==='spirit'){battleSpiritUpdate(dt);return}powerTick(dt);t+=dt;player.fireCd=Math.max(0,player.fireCd-dt);player.reload=Math.max(0,player.reload-dt);player.flashShot=Math.max(0,player.flashShot-dt);player.hurt=Math.max(0,player.hurt-dt);updateHoly(dt);
 if(mouseFire||touch.fire||key.Space||key.ControlLeft)primaryAttack();
 smoothMove(dt);
 for(const e of enemies)if(!e.alive&&e.deathAnim>0)e.deathAnim=Math.max(0,e.deathAnim-dt);
 if(t>=spiritEmitTime&&particles.length<180){spiritEmitTime=t+.11;const nearby=enemies.filter(e=>(e.alive||e.deathAnim>0)&&dist(e,player)<8);if(nearby.length){const e=nearby[Math.floor(t*11)%nearby.length],a=rand(0,TAU);particles.push({x:e.x+Math.cos(a)*rand(.1,.28),y:e.y+Math.sin(a)*rand(.1,.28),z:rand(.13,.94),vx:rand(-.18,.18),vy:rand(-.18,.18),vz:rand(.07,.27),life:rand(.45,.9),max:.9,size:rand(.7,1.7),hue:e.type==='wraith'?'violet':'blue'})}}
 let f=player.hidden?0:(key.KeyW||key.ArrowUp?1:0)-(key.KeyS||key.ArrowDown?1:0)+touch.forward,side=player.hidden?0:(key.KeyD?1:0)-(key.KeyA?1:0)+touch.strafe;
 if(key.ArrowLeft)player.a-=dt*1.8;if(key.ArrowRight)player.a+=dt*1.8;
 let len=Math.hypot(f,side);if(len>1){f/=len;side/=len}let sprint=(key.ShiftLeft||key.ShiftRight||touch.sprint)&&player.stamina>0&&f>0&&len>.15;
 let lookStep=(key.KeyI||key.PageUp?1:0)-(key.KeyK||key.PageDown?1:0);if(lookStep!==0)lookPitch=clamp(lookPitch-lookStep*dt*H*.43*(settings.invertView?-1:1),-H*.32,H*.32);
 player.stamina=clamp(player.stamina+(sprint?-27:19)*dt,0,100);let speed=sprint?3.5:battle?onlineClasses[battleHuman].speed:2.25;player.moveSpeed=len>.13?speed:0;
 if(len>.1){let dx=(Math.cos(player.a)*f-Math.sin(player.a)*side)*speed*dt,dy=(Math.sin(player.a)*f+Math.cos(player.a)*side)*speed*dt;moveEntity(player,dx,dy,.19);player.walkTime+=dt*(sprint?10:7);if(player.walkTime-player.steps>=1){player.steps++;sfx('step')}}
 player.bob=len>.1?Math.sin(player.walkTime*2)*H*.0031:player.bob*.85;
 if(player.flash){player.battery=Math.max(0,player.battery-dt*.57);if(player.battery<=0){player.flash=false;showToast('БАТАРЕЯ ФОНАРЯ РАЗРЯЖЕНА',2.3)}}else{player.battery=Math.min(100,player.battery+dt*.15)}
 markVisit();if(battle){battleBotsUpdate(dt);updateHud();return}const ne=nearestInteract(),prompt=player.hidden?'ВЫ В УКРЫТИИ · E / ДЕЙСТВ. — ВЫЙТИ':
  ne?({exit:'[ E ] СПУСК: 3 ПЕЧАТИ + 1 КЛЮЧ',lockedDoor:'[ E ] ОТКРЫТЬ ДВЕРЬ · НУЖЕН КЛЮЧ',core:'[ E ] ОЧИСТИТЬ ПЕЧАТЬ'})[ne.type]||'[ E ] СПРЯТАТЬСЯ':
  player.cores<3?'✠ ПЕЧАТИ '+player.cores+'/3 · КЛЮЧИ '+player.keys:'✠ КЛЮЧИ '+player.keys+' · ИЩИТЕ ВЫХОД';
 hudText('signal',prompt);
 for(let o of objects){if(o.used||!['ammoItem','medItem','batteryItem','keyItem','note'].includes(o.type))continue;if(!player.hidden&&dist(player,o)<.64){o.used=true;if(o.type==='keyItem'){player.keys++;showToast('ПОЛУЧЕН ЛАТУННЫЙ КЛЮЧ — '+player.keys,2.3);sfx('pickup')}if(o.type==='note'){const text=`Этаж ${floorNo} — ${floorFlavor}: стены шепчут, даже когда здесь никого нет.`;foundLore.push(text);showToast('НАЙДЕНА СТРАНИЦА ДНЕВНИКА',2);sfx('pickup')}if(o.type==='ammoItem'){player.grenades=Math.min(14,player.grenades+2);showToast('+2 ФЛАКОНА СВЯТОЙ ВОДЫ',1.5);sfx('pickup')}if(o.type==='medItem'){player.health=Math.min(100,player.health+34);showToast('ОСВЯЩЁННАЯ РЕЛИКВИЯ +34',1.5);sfx('pickup')}if(o.type==='batteryItem'){player.battery=Math.min(100,player.battery+40);showToast('СВЕЧА: ФОНАРЬ +40%',1.5);sfx('pickup')}}}
 if(t-groanTick>3.2&&enemies.some(e=>e.alive&&dist(e,player)<7)){groanTick=t+rand(-.6,2.5);sfx('growl')}
 for(let e of enemies)if(e.alive){e.spawnGrace=Math.max(0,(e.spawnGrace||0)-dt);e.moving=0;e.flash=Math.max(0,e.flash-dt);e.attackAnim=Math.max(0,e.attackAnim-dt);e.stun=Math.max(0,e.stun-dt);e.attack-=dt;let d=dist(player,e),visible=!player.hidden&&d<8&&lineClear(e.x,e.y,player.x,player.y);if(player.hidden){e.alert=false;e.path=[]}
 if(visible&&d<6.5||d<2.2){e.alert=true;e.lastSeen=t}if(e.alert&&d>17&&t-e.lastSeen>12)e.alert=false;
 if(e.alert&&e.stun<=0&&e.spawnGrace<=0){e.pathTimer-=dt;if(e.pathTimer<=0){e.pathTimer=rand(.7,1.2);e.path=bPath(e.x,e.y,player.x,player.y)}let target=e.path.length?e.path[0]:{x:player.x,y:player.y};if(e.path.length&&dist(e,target)<.19){e.path.shift();target=e.path[0]||player}if(d>.65){let dx=target.x-e.x,dy=target.y-e.y,dl=Math.hypot(dx,dy);if(dl>.01){let speed=e.speed*(d<2?1.22:1)*dt;const x=e.x,y=e.y;moveEntity(e,dx/dl*speed,dy/dl*speed,.2);e.moving=Math.hypot(e.x-x,e.y-y)>.001?1:0;e.walk+=Math.hypot(e.x-x,e.y-y)*6}}}
 if(!player.hidden&&d<.86&&e.attack<=0&&e.spawnGrace<=0&&lineClear(e.x,e.y,player.x,player.y)){e.attack=rand(1.05,1.6);e.attackAnim=.45;addCombatFX(e.type,e.x,e.y,player.x,player.y,.49,false,false);player.health=Math.max(0,player.health-({ghost:11,cultist:14,wraith:17,demon:22})[e.type]*((player.abilityShield||0)>0?.35:1));player.hurt=.55;sfx('hurt');showToast('КОНТАКТ! ОТСТУПАЙТЕ!',.75);if(player.health<=0){endGame(false);return}}
 }
 
 updateHud()}
function nearestInteract(){
 if(player?.hidden)return player.hideSpot;
 let near=null,score=1.52;
 if(vaultDoor&&!vaultDoor.used){const d=dist(player,vaultDoor);if(d<score){score=d;near=vaultDoor}}
 for(const o of objects){if(o.used||!['core','exit','wardrobe','confessional'].includes(o.type))continue;const d=dist(player,o);if(d<score){score=d;near=o}}
 return near;
}
function interact(){
 if(match||battle)return;
 if(scene!=='play')return;
 if(player.hidden){player.x=player.hideFrom.x;player.y=player.hideFrom.y;player.hidden=false;player.hideSpot=null;player.hideFrom=null;sfx('switch');showToast('ВЫ ПОКИНУЛИ УКРЫТИЕ',1.2);return}
 const o=nearestInteract();if(!o){showToast('ПОДОЙДИТЕ БЛИЖЕ К ОБЪЕКТУ',1.4);return}
 if(o.type==='wardrobe'||o.type==='confessional'){
  player.hideFrom={x:player.x,y:player.y};player.hideSpot=o;player.hidden=true;player.x=o.x;player.y=o.y;
  for(const e of enemies){e.alert=false;e.path=[]}touch.forward=0;touch.strafe=0;touch.forwardTarget=0;touch.strafeTarget=0;
  sfx('switch');showToast('ВЫ СПРЯТАЛИСЬ. ДУХИ ПОТЕРЯЛИ СЛЕД',2.2);return
 }
 if(o.type==='lockedDoor'){
  if(player.keys<=0){showToast('ЗАПЕРТО. НАЙДИТЕ ЛАТУННЫЙ КЛЮЧ',2);sfx('deny');return}
  player.keys--;world[o.gy][o.gx]=0;o.used=true;sfx('core');spawnHoly(o.x,o.y,27,'gold');showToast('ДВЕРЬ ОТКРЫТА. ВПЕРЕДИ ТАЙНА',2.6);updateHud();return
 }
 if(o.type==='core'){
  o.used=true;player.cores++;sfx('core');spawnHoly(o.x,o.y,55,'gold');$('#coreCount').textContent=player.cores+' / 3';showToast('ПЕЧАТЬ '+o.id+' ОЧИЩЕНА — '+player.cores+'/3',2.8);
  for(const e of enemies)if(e.alive&&dist(e,player)<9){e.alert=true;e.lastSeen=t};return
 }
 if(o.type==='exit'){
  if(player.cores<3){showToast('СНАЧАЛА ОЧИСТИТЕ ТРИ ПЕЧАТИ',2);sfx('deny');return}
  if(player.keys<=0){showToast('ДЛЯ СПУСКА НУЖЕН ЕЩЁ ОДИН КЛЮЧ',2);sfx('deny');return}
  player.keys--;floorNo++;player.health=Math.min(100,player.health+12);player.grenades=Math.min(15,player.grenades+2);
  sfx('core');makeFloor();return
 }
}

function toggleFlash(){if(scene!=='play'||(match&&netSide(match.me)==='spirit')||(battle&&battleSide==='spirit'))return;if(!player.flash&&player.battery<1){showToast('НЕТ ЗАРЯДА',1);return}player.flash=!player.flash;sfx('switch')}
function explodeBarrel(barrel){barrel.used=true;sfx('explosion');player.flashShot=.2;for(let e of enemies)if(e.alive&&dist(e,barrel)<2.9&&lineClear(barrel.x,barrel.y,e.x,e.y)){e.hp-=120;e.alert=true;e.lastSeen=t;e.flash=.6;if(e.hp<=0)banish(e)}if(dist(player,barrel)<2.2&&lineClear(barrel.x,barrel.y,player.x,player.y)){player.health=Math.max(0,player.health-28);player.hurt=.65;if(player.health<=0)endGame(false)}showToast('ПРОКЛЯТЫЙ СОСУД РАЗРУШЕН!',1.8);spawnHoly(barrel.x,barrel.y,40,'ember')}
function showToast(message,seconds=2){$('#toast').textContent=message;$('#toast').classList.add('show');toastUntil=t+seconds}
const hudNodes={};
function hudText(id,value){
 const node=hudNodes[id]??(hudNodes[id]=$('#'+id));
 const text=String(value);
 if(node.textContent!==text)node.textContent=text;
}
function hudWidth(id,value){
 const node=hudNodes[id]??(hudNodes[id]=$('#'+id));
 if(node.style.width!==value)node.style.width=value;
}
function updateHud(){
 if(!player)return;
 if(t>toastUntil&&$('#toast').classList.contains('show'))$('#toast').classList.remove('show');
 if(t>hitUntil&&$('#hitMark').style.opacity==='1')$('#hitMark').style.opacity='0';
 const now=performance.now();
 if(now<nextHud)return;
 nextHud=now+65;
 const arena=Boolean(match||battle),role=playerRole();
 hudText('healthNum',Math.ceil(player.health));hudWidth('healthBar',Math.ceil(player.health)+'%');
 hudText('staminaNum',Math.ceil(player.stamina));hudWidth('staminaBar',Math.ceil(player.stamina)+'%');
 const ammo=$('#ammo'),ammoText=arena?'':'× '+player.grenades+' 💧';
 if(ammo.dataset.count!==ammoText){
  ammo.dataset.count=ammoText;
  ammo.innerHTML=arena?'':'✠ <small>'+ammoText+'</small>';
 }
 hudText('ammoName',arena?onlineClasses[role].attack.toUpperCase():(player.hidden?'В УКРЫТИИ · ':'')+(player.weapon==='water'?'СВЯТАЯ ВОДА · ГРАНАТА':'КРЕСТ · ИЗГНАНИЕ'));
 hudText('keyStat',match?'ОНЛАЙН 4 × 4':battle?'СХВАТКА':'⚿ КЛЮЧИ: '+player.keys);
 hudText('floorStat',arena?'АРЕНА · '+floorFlavor:'ЭТАЖ '+floorNo+' · '+floorFlavor);
 hudText('flashHint','СВЕТ '+(player.flash?'◉':'○')+' '+Math.floor(player.battery)+'%');
 const color=player.battery<20?'rgb(209, 120, 105)':'rgb(209, 186, 161)';
 if($('#flashHint').style.color!==color)$('#flashHint').style.color=color;
}
function endGame(win){resetInputs();scene=win?'won':'dead';$('#abilityInfo').style.display='none';stopAmbient();$('#resultEyebrow').textContent=win?'✠ ТЬМА ОТСТУПИЛА':'✠ СВЕТ ПОГАС';$('#resultTitle').innerHTML=win?'ВЫ <span>ВЫЖИЛИ</span>':'СИГНАЛ <span>ПОТЕРЯН</span>';$('#resultText').textContent=battle?(win?'Ваша команда выиграла схватку!':'Ваша команда проиграла схватку. Попробуйте ещё раз.'):(win?'Вы очистили три печати и закрыли разлом. Но во мраке кто-то всё ещё шепчет ваше имя.':'Экзорцист погиб. Духи остаются в обители, а древний разлом ещё открыт.');let seconds=Math.floor((performance.now()-player.started)/1000),mm=Math.floor(seconds/60),ss=('0'+seconds%60).slice(-2);$('#resultStats').innerHTML=`Печати: <b>${player.cores} / 3</b>　|　Устранено: <b>${player.kills}</b><br>Время: <b>${mm}:${ss}</b>　|　Применений: <b>${player.shots}</b>`;$('#resultScreen').classList.remove('hidden');$('#hud').style.display='none';$('#touchControls').classList.remove('gameOn');if(document.pointerLockElement)document.exitPointerLock();sfx(win?'win':'death')}
function togglePause(force){if(scene==='play'){resetInputs();scene='paused';$('#pauseScreen').classList.remove('hidden');if(document.pointerLockElement)document.exitPointerLock();stopAmbient()}else if(scene==='paused'&&!force){scene='play';last=performance.now();$('#pauseScreen').classList.add('hidden');startAmbient()}}
const wallShade=makeCanvas(1,1),shadeCtx=wallShade.getContext('2d');
const beamMask=makeCanvas(1,1);
let beamX=[],beamY=[],surfaceTextures,surfaceBuffer,surfacePixels;
const surfaceCanvas=makeCanvas(1,1),surfaceCtx=surfaceCanvas.getContext('2d',{alpha:false});
const vignetteCanvas=makeCanvas(1,1),damageCanvas=makeCanvas(1,1);
function cacheVignettes(){
 for(const [tile,color] of [[vignetteCanvas,'rgba(0,0,0,.57)'],[damageCanvas,'rgb(126,17,24)']]){
  tile.width=Math.ceil(W/4);tile.height=Math.ceil(H/4);
  const brush=tile.getContext('2d'),w=tile.width,h=tile.height;
  const edge=brush.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.22,w*.5,h*.5,Math.hypot(w,h)*.53);
  edge.addColorStop(0,'transparent');edge.addColorStop(1,color);
  brush.fillStyle=edge;brush.fillRect(0,0,w,h);
 }
}

function beamFalloff(radiusSquared){
 const soft=Math.max(0,1-radiusSquared);
 return soft*soft;
}

function resizeLighting(){
 wallShade.width=beamMask.width=W;
 wallShade.height=beamMask.height=H;
 const light=beamMask.getContext('2d'),pixels=light.createImageData(W,H);
 surfaceCanvas.width=W/2;surfaceCanvas.height=H/2;
 surfaceBuffer=surfaceCtx.createImageData(W/2,H/2);
 const littleEndian=new Uint8Array(new Uint32Array([1]).buffer)[0]===1;
 surfacePixels=littleEndian?new Uint32Array(surfaceBuffer.data.buffer):null;
 cacheVignettes();
 const radiusX=Math.min(W*.48,H*.79),radiusY=H*.54;
 beamX=Float32Array.from({length:W},(_,x)=>((x+.5-W*.5)/radiusX)**2);
 beamY=Float32Array.from({length:H},(_,y)=>((y+.5-H*.5)/radiusY)**2);
 for(let y=0;y<H;y++){
  for(let x=0;x<W;x++)pixels.data[(y*W+x)*4+3]=Math.round(255*beamFalloff(beamX[x]+beamY[y]));
 }
 light.putImageData(pixels,0,0);
}

function artReady(image){return image?.complete&&image.naturalWidth>0}
function loadDetailArt(){
 const surfaces=['floor','ceiling'];
 function load(name,apply){
  const img=new Image();
  img.onload=()=>apply(img);
  img.src='assets/'+name+'.webp';
 }
 for(const [index,name] of surfaces.entries())load('material_'+name,img=>{
  const material=makeCanvas(128,128);
  material.getContext('2d').drawImage(img,0,0,128,128);
  if(!surfaceTextures)surfaceTextures=[readSurface(ceilTex),readSurface(floorTex)];
  surfaceTextures[1-index]=readSurface(material);
 });
 for(const [index,name] of [[0,'ashlar'],[5,'carved']])load('material_'+name,img=>{
  const start=index===0?0:5,end=index===0?4:9;
  for(let i=start;i<end;i++){
   const original=texWall[i],tile=makeCanvas(192,192),brush=tile.getContext('2d');
   brush.drawImage(img,0,0,192,192);
   brush.globalAlpha=i===0||i===5?.10:.29;
   brush.drawImage(original,0,0,192,192);
   texWall[i]=tile;
  }
 });
 for(const name of ['exit','core','confessional','altar'])load('prop_'+name,img=>{art[name]=img});
 for(const role of ['priest','hunter','medic','guardian'])load('back_'+role,img=>{art[role+'Back']=img});
}
function readSurface(texture){
 const size=texture.width,data=texture.getContext('2d').getImageData(0,0,size,size).data;
 const average=[0,0,0];
 for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++)average[c]+=data[i+c]/(size*size);
 return {data,average,size,mask:size-1};
}

function viewHorizon(){return H*.5+lookPitch+player.bob}
function drawBase(dirX,dirY,horizon){
 if(!surfaceTextures)surfaceTextures=[readSurface(ceilTex),readSurface(floorTex)];
 const pixels=surfaceBuffer.data,w=W/2,h=H/2;
 const plane=W/(2*proj),planeX=-dirY*plane,planeY=dirX*plane;
 for(let row=0;row<h;row++){
  const y=row*2+1,isFloor=y>horizon;
  const depth=Math.min(80,.5*proj/Math.max(1,Math.abs(y-horizon)));
  const fog=clamp(1-depth/27,.12,1);
  const detail=clamp((15-depth)/9,0,1);
  const {data,average,size,mask}=surfaceTextures[Number(isFloor)];
  const beamRow=beamY[y],base=(isFloor?.32:.25)*fog,lamp=(player.flash?.77*clamp(1-depth/19,0,1):0)*fog;
  const dx=depth*planeX*size*2/w,dy=depth*planeY*size*2/w;
  let fx=(player.x+depth*(dirX-planeX))*size+dx*.5;
  let fy=(player.y+depth*(dirY-planeY))*size+dy*.5;
  let index=row*w;
  const farR=average[0]*(1-detail),farG=average[1]*(1-detail),farB=average[2]*(1-detail);
  for(let col=0;col<w;col++,index++){
   const light=base+(lamp?lamp*beamFalloff(beamX[col*2+1]+beamRow):0);
   let r=farR,g=farG,b=farB;
   if(detail){
    const sx=Math.floor(fx),sy=Math.floor(fy),u=fx-sx,v=fy-sy;
    const a=((sy&mask)*size+(sx&mask))*4,bx=((sy&mask)*size+((sx+1)&mask))*4;
    const c=((((sy+1)&mask)*size)+(sx&mask))*4,d=((((sy+1)&mask)*size)+((sx+1)&mask))*4;
    const wa=(1-u)*(1-v)*detail,wb=u*(1-v)*detail,wc=(1-u)*v*detail,wd=u*v*detail;
    r+=data[a]*wa+data[bx]*wb+data[c]*wc+data[d]*wd;
    g+=data[a+1]*wa+data[bx+1]*wb+data[c+1]*wc+data[d+1]*wd;
    b+=data[a+2]*wa+data[bx+2]*wb+data[c+2]*wc+data[d+2]*wd;
   }
   if(surfacePixels)surfacePixels[index]=0xff000000|((b*light)<<16)|((g*light)<<8)|(r*light);
   else{
    const k=index*4;
    pixels[k]=r*light;pixels[k+1]=g*light;pixels[k+2]=b*light;pixels[k+3]=255;
   }
   fx+=dx;fy+=dy;
  }
 }
 surfaceCtx.putImageData(surfaceBuffer,0,0);
 ctx.drawImage(surfaceCanvas,0,0,W,H);
}

const zBuffer=[];
const wallColumns=new WeakMap();
function wallStrip(wall){
 let strip=wallColumns.get(wall);
 if(!strip){
  strip=makeCanvas(wall.width*4,wall.height);
  strip.getContext('2d').drawImage(wall,0,0,strip.width,strip.height);
  wallColumns.set(wall,strip);
 }
 return strip;
}
function drawWalls(dirX,dirY,horizon){
 const step=W>=540?2:1;
 shadeCtx.clearRect(0,0,W,H);
 shadeCtx.fillStyle='#020709';
 shadeCtx.imageSmoothingEnabled=false;
 for(let x=0;x<W;x+=step){
  const width=Math.min(step,W-x),cameraX=(x+width*.5-W*.5)/proj;
  const hit=castRay(dirX-dirY*cameraX,dirY+dirX*cameraX),depth=hit.d;
  for(let i=0;i<width;i++)zBuffer[x+i]=depth;
  if(depth>MAXRAY)continue;
  const height=proj/depth,top=Math.round(horizon-height*.5);
  const hash=Math.abs(hit.mx*13+hit.my*7+Math.floor(hit.mx/2)+floorNo*3);
  const wall=texWall[world[hit.my]?.[hit.mx]===2?4:hash%7<4?hash%4:5+(hash+floorNo)%4];
  const strip=wallStrip(wall),column=Math.min(strip.width-1,Math.floor(hit.wallX*strip.width));
  ctx.drawImage(strip,column,0,1,strip.height,x,top,width,height);
  shadeCtx.globalCompositeOperation='source-over';
  shadeCtx.globalAlpha=clamp((hit.side?.59:.69)+depth*.017,0,.9);
  shadeCtx.fillRect(x,top,width,height);
  if(player.flash&&depth<19){
   shadeCtx.globalCompositeOperation='destination-out';
   shadeCtx.globalAlpha=.88*(1-depth/19);
   shadeCtx.drawImage(beamMask,x,0,width,H,x,0,width,H);
  }
 }
 shadeCtx.globalCompositeOperation='source-over';
 shadeCtx.globalAlpha=1;
 ctx.drawImage(wallShade,0,0);
}
const frameBlend=makeCanvas(1,1),frameBrush=frameBlend.getContext('2d');
const shadedArt=new WeakMap();
function darkenSprite(brush,width,height,brightness){
 if(brightness>=1)return;
 brush.globalCompositeOperation='source-atop';
 brush.fillStyle=`rgba(0,0,0,${1-brightness})`;
 brush.fillRect(0,0,width,height);
 brush.globalCompositeOperation='source-over';
}
function shadedSprite(sprite,brightness){
 const level=Math.round(brightness*10)/10;
 if(level>=1)return sprite;
 let variants=shadedArt.get(sprite);
 if(!variants){variants=new Map();shadedArt.set(sprite,variants)}
 if(!variants.has(level)){
  const ratio=Math.min(1,440/Math.max(sprite.width,sprite.height));
  const tile=makeCanvas(Math.ceil(sprite.width*ratio),Math.ceil(sprite.height*ratio)),brush=tile.getContext('2d');
  brush.drawImage(sprite,0,0,tile.width,tile.height);
  darkenSprite(brush,tile.width,tile.height,level);
  variants.set(level,tile);
 }
 return variants.get(level);
}
function blendSpirit(sprite,frame,next,amount,brightness){
 const width=sprite.naturalWidth/4,height=sprite.naturalHeight/4;
 if(frameBlend.width!==width||frameBlend.height!==height){frameBlend.width=width;frameBlend.height=height}
 frameBrush.clearRect(0,0,width,height);
 frameBrush.globalCompositeOperation='source-over';
 frameBrush.globalAlpha=1-amount;
 frameBrush.drawImage(sprite,(frame%4)*width,Math.floor(frame/4)*height,width,height,0,0,width,height);
 if(amount>0){
  frameBrush.globalCompositeOperation='lighter';
  frameBrush.globalAlpha=amount;
  frameBrush.drawImage(sprite,(next%4)*width,Math.floor(next/4)*height,width,height,0,0,width,height);
 }
 frameBrush.globalAlpha=1;
 frameBrush.globalCompositeOperation='source-over';
 darkenSprite(frameBrush,width,height,brightness);
 return frameBlend;
}
function clipAtWalls(x,y,radiusY,radiusX,depth){
 ctx.beginPath();
 const left=Math.max(0,Math.floor(x-radiusX)),right=Math.min(W,Math.ceil(x+radiusX));
 for(let col=left;col<right;){
  const begin=col;
  while(col<right&&(zBuffer[col]??MAXRAY)+.12>=depth)col++;
  if(col>begin)ctx.rect(begin,y-radiusY,col-begin,radiusY*2);
  else col++;
 }
 ctx.clip();
}

function drawSprites(cs,sn,horizon){
 let list=[];onlineSprites(list);for(const e of exorcistBots)if(botLive(e)||e.deathAnim>0)list.push({x:e.x,y:e.y,type:'exorcist',enemy:e});for(const e of spiritAllyBots)if(botLive(e)||e.deathAnim>0)list.push({x:e.x,y:e.y,type:e.type,enemy:e});for(const e of enemies)if((e.alive||e.deathAnim>0)&&!(battle&&battleSide==='exorcist'&&e.abilityPhase>0))list.push({x:e.x,y:e.y,type:e.type,enemy:e});
 for(const o of objects)if(!o.used)list.push(o);for(const p of projectiles)list.push({x:p.x,y:p.y,z:p.z,type:'waterOrb',age:p.age});
 const visible=[];
 for(const item of list){
  const dx=item.x-player.x,dy=item.y-player.y,depth=dx*cs+dy*sn,lateral=-dx*sn+dy*cs;
  if(depth>.12&&depth<=MAXRAY&&Math.abs(lateral)<depth*W/(2*proj)+1.45)visible.push({item,dx,dy,depth,lateral});
 }
 visible.sort((a,b)=>b.depth-a.depth);
 for(const {item:o,dx,dy,depth,lateral} of visible){
  let sprite,xScale=1,yScale=1,z=0,ghost=false;switch(o.type){
   case'exorcist':{
    const role=o.enemy?.role||'priest',back=art[role+'Back'];
    sprite=art[role];
    if(artReady(back)&&Number.isFinite(o.enemy?.a)){
     const facing=Math.cos(o.enemy.a-Math.atan2(-dy,-dx));
     if(facing<0)sprite=back;
     xScale=.73*(.71+.29*Math.abs(facing));
    }else xScale=.73;
    yScale=1.02;
    break;
   }
   case'ghost':sprite=art.ghost;yScale=.83;xScale=.63;ghost=true;z=.16+Math.sin(t*2.3+o.x)*.115;break;
   case'wraith':sprite=art.wraith;yScale=.89;xScale=.65;ghost=true;z=.17+Math.sin(t*2.8+o.y)*.10;break;
   case'demon':sprite=art.demon;yScale=.91;xScale=.73;ghost=true;z=.18+Math.sin(t*2.1+o.x)*.105;break;
   case'cultist':sprite=art.cultist;yScale=.82;xScale=.61;ghost=true;z=.14+Math.sin(t*1.9+o.y)*.075;break;
   case'core':sprite=art.core;yScale=.95;xScale=.81;break;
   case'exit':sprite=art.exit;yScale=1.67;xScale=1.3;break;
   case'barrel':sprite=art.barrel;yScale=.70;xScale=.57;break;
   case'lamp':sprite=art.lamp;yScale=.29;xScale=.24;z=.76;break;
   case'ammoItem':sprite=art.ammoItem;yScale=.45;xScale=.47;break;
   case'medItem':sprite=art.medItem;yScale=.45;xScale=.49;break;
   case'batteryItem':sprite=art.batteryItem;yScale=.45;xScale=.40;break;
   case'waterOrb':sprite=art.flightWater;yScale=.46;xScale=.34;z=o.z;break;
   case'keyItem':sprite=art.keyItem;yScale=.43;xScale=.42;z=.17+Math.sin(t*2+o.x)*.08;break;
   case'wardrobe':sprite=art.wardrobe;yScale=1.14;xScale=.69;break;
   case'confessional':sprite=art.confessional;yScale=1.25;xScale=.73;break;
   case'altar':sprite=art.altar;yScale=.76;xScale=.82;break;
   case'candles':sprite=art.candles;yScale=.34;xScale=.3;break;
   case'note':sprite=art.note;yScale=.28;xScale=.31;z=.13;break;
   case'ashes':sprite=art.ashes;yScale=.27;xScale=.82;z=.04;break;
   default:continue
  }
  const anim=!!o.enemy&&artReady(spiritAnimations[o.type]);
  if(anim)sprite=spiritAnimations[o.type];
  if(!sprite||!sprite.width||!sprite.height||sprite.complete===false)continue;
  let sx=W/2+(lateral/depth)*proj,bottom=horizon+((.5-z)/depth)*proj,sh=proj/depth*yScale,sw=proj/depth*xScale;
  const leftEdge=Math.max(0,Math.floor(sx-sw)),rightEdge=Math.min(W,Math.ceil(sx+sw));
  let visibleBehindWalls=false;
  for(let col=leftEdge;col<rightEdge;col+=1)if(zBuffer[col]+.15>=depth){visibleBehindWalls=true;break}
  if(!visibleBehindWalls)continue;
  const e=o.enemy;
  const pose=e?window.ObitelAnimation.body(o.type==='exorcist'?(e.role||'priest'):o.type,e,t):null;
  const dying=e&&!e.alive?clamp(1-e.deathAnim/.94,0,1):0;
  if(pose){
   sx+=sw*pose.x;
   sh*=Math.max(.15,1+pose.crouch);
   sw*=pose.width;
   bottom+=ghost?-dying*sh*.8:0;
  }
  let top=bottom-sh;
  if(o.type==='core'){top+=Math.sin(t*2.5+o.id)*5;sw*=1+Math.sin(t*3.5+o.id)*.032}
  if(o.type==='exit'){sw*=1+Math.sin(t*1.2)*.006}
  if(o.type==='lamp'){sw*=1+Math.sin(t*13+o.x)*.08}
  if(['ammoItem','medItem','batteryItem'].includes(o.type)){top+=Math.sin(t*2+o.x)*3;sw*=1+Math.sin(t*2+o.y)*.04}
  if(o.type==='waterOrb'){sw*=1+Math.sin(t*18+o.age*17)*.08;sh*=1+Math.sin(t*15+o.age*16)*.05}
  if(sx+sw/2<0||sx-sw/2>W||sh<.6)continue;
  const vertical=clamp(Math.round(top+sh*.5),0,H-1),horizontal=clamp(Math.round(sx),0,W-1);
  const lamp=player.flash?beamFalloff(beamX[horizontal]+beamY[vertical])*clamp(1-depth/20,0,1):0;
  let brightness=clamp(.57+Math.max(0,1-depth/18)*.31+lamp*.25,.53,1);
  if(e)brightness=Math.max(.69,brightness);
  if(o.type==='core'||o.type==='exit')brightness=Math.max(.7,brightness);
  if(o.type==='lamp'||o.type==='waterOrb'||o.type==='candles'||o.type==='keyItem')brightness=.95;
  if(o.type==='ashes')brightness=Math.max(0,1-(t-o.born)/2.2)*.58;
  if(['wardrobe','confessional','altar'].includes(o.type))brightness=Math.max(brightness,.48);
  if(ghost||o.type==='core'||o.type==='waterOrb'||o.type==='lamp'||o.type==='exit'){
   let color=o.type==='wraith'?'173,99,228':o.type==='core'||o.type==='lamp'||o.type==='exit'?'243,187,112':'112,203,255';
   if(o.type==='demon')color='154,224,248';
   let strength=(.18+Math.sin(t*2.6+o.x)*.025)*brightness;
   ctx.save();ctx.globalAlpha=strength;let radius=sw*(o.type==='exit'?.88:1.35);
   clipAtWalls(sx,top+sh*.40,radius,radius,depth);
   let g=ctx.createRadialGradient(sx,top+sh*.40,0,sx,top+sh*.40,radius);g.addColorStop(0,`rgba(${color},.80)`);g.addColorStop(.55,`rgba(${color},.13)`);g.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=g;ctx.fillRect(sx-radius,top-sh*.2,radius*2,sh*1.45);ctx.restore()
  }
  if(anim){
   const movement=e.motion??e.moving??0;
   const start=e.attackAnim>0?12:movement>.12?8:0;
   const count=start===0?8:4;
   const phase=start===12?clamp(1-e.attackAnim/.45,0,1)*3:(t*(start===8?8:6)+e.walk*.23)%count;
   const frame=Math.floor(phase),next=start===12?Math.min(3,frame+1):(frame+1)%count;
   sprite=blendSpirit(sprite,start+frame,start+next,phase-frame,Math.max(.45,brightness-.08));
  }else if(o.type!=='waterOrb'&&o.type!=='ashes')sprite=shadedSprite(sprite,brightness);
  const frameW=sprite.width,frameH=sprite.height;
  const opacity=(ghost?.87:o.type==='ashes'?brightness:1)*Math.pow(1-dying,1.12);
  ctx.globalAlpha=opacity;
  if(o.type==='waterOrb'){
   const centerCol=Math.max(0,Math.min(W-1,Math.floor(sx)));
   if(zBuffer[centerCol]===undefined||depth<=zBuffer[centerCol]+.08){
    ctx.save();clipAtWalls(sx,top+sh*.5,sh,sw,depth);ctx.translate(sx,top+sh*.5);ctx.rotate((o.age||0)*11);
    ctx.shadowBlur=Math.min(20,sw*.28);ctx.shadowColor='#67e4ff';
    ctx.drawImage(sprite,-sw*.5,-sh*.5,sw,sh);ctx.restore();
    ctx.save();clipAtWalls(sx,top+sh*.5,sh,sw,depth);ctx.globalAlpha=.23;let ring=ctx.createRadialGradient(sx,top+sh*.5,0,sx,top+sh*.5,sw*.85);
    ring.addColorStop(0,'rgba(74,226,255,.42)');ring.addColorStop(1,'rgba(74,226,255,0)');ctx.fillStyle=ring;ctx.fillRect(sx-sw,top-sh*.35,sw*2,sh*1.7);ctx.restore();
   }
   ctx.globalAlpha=1;continue;
  }
  const left=sx-sw*.5,right=left+sw;
  const bending=pose&&Math.abs(pose.lean*sh)+Math.abs(pose.lower*sh)>1.2;
  for(let x=Math.max(0,Math.floor(left));x<Math.min(W,Math.ceil(right));){
   if(depth>zBuffer[x]+.12){x++;continue}
   let end=x+1;
   const limit=Math.min(W,Math.ceil(right),bending?x+Math.max(2,Math.ceil(sw/24)):Infinity);
   while(end<limit&&depth<=zBuffer[end]+.12)end++;
   const from=Math.max(x,left),to=Math.min(end,right);
   const fraction=(from-left)/sw,srcWidth=(to-from)*frameW/sw;
   const mid=(from+to-2*left)/(2*sw)-.5;
   const bend=bending?(pose.lean*mid+pose.lower*Math.abs(mid))*sh:0;
   if(to>from)ctx.drawImage(sprite,fraction*frameW,0,srcWidth,frameH,from,top+bend,to-from,sh);
   x=end;
  }
  ctx.globalAlpha=1;
  if(e&&e.flash>0){
   let flare=clamp(e.flash*.9,0,.22);ctx.save();ctx.globalAlpha=flare;clipAtWalls(sx,top+sh*.53,sh*.65,sw*.63,depth);
   let g=ctx.createRadialGradient(sx,top+sh*.53,2,sx,top+sh*.53,sw*.60);g.addColorStop(0,'#f7f2db');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(sx-sw*.64,top,sw*1.28,sh);ctx.restore()
  }
 }
}

function drawParticles(cs,sn,horizon){ctx.save();for(const p of particles){let dx=p.x-player.x,dy=p.y-player.y,d=dx*cs+dy*sn,l=-dx*sn+dy*cs;if(d<=.15||d>13)continue;let sx=W*.5+l/d*proj,sy=horizon+(.5-p.z)/d*proj;let z=proj/d*p.size*.017;if(zBuffer[Math.floor(sx)]<d-.14)continue;ctx.globalAlpha=clamp(p.life/(p.max||.85),0,1)*.8;ctx.fillStyle=p.hue==='ember'?'#ff944d':p.hue==='gold'?'#ffe2a1':p.hue==='violet'?'#c890ff':'#8aebff';ctx.beginPath();ctx.arc(sx,sy,Math.min(12,Math.max(1,z)),0,TAU);ctx.fill()}ctx.restore()}

function drawCombatFX(cs,sn,horizon){
 const center=W*.5;
 function projected(x,y,z){
  const dx=x-player.x,dy=y-player.y,depth=dx*cs+dy*sn;
  if(depth<.10)return null;
  return {x:center+(-dx*sn+dy*cs)*proj/depth,y:horizon+(.5-z)*proj/depth,depth};
 }
 function open(point){
  return point&&point.x>-8&&point.x<W+8&&point.y>-45&&point.y<H+45&&
   (zBuffer[clamp(Math.floor(point.x),0,W-1)]+.08>=point.depth);
 }
 for(const fx of combatEffects){
  const age=clamp((t-fx.start)/fx.life,0,1),fade=(1-age)**1.55;
  const end=projected(fx.tx,fx.ty,fx.tz);
  ctx.save();
  ctx.lineCap='round';ctx.lineJoin='round';
  const color=effectColors[fx.color];
  if(fx.kind==='beam'){
   // Screen-space segments keep the visible part of a shot behind real wall depth.
   ctx.beginPath();
   let previous=null;
   const steps=Math.min(52,Math.max(12,Math.ceil(Math.hypot(fx.tx-fx.x,fx.ty-fx.y)*14)));
   const local=Math.hypot(player.x-fx.x,player.y-fx.y)<.30;
   for(let i=0;i<=steps;i++){
    const u=i/steps;
    const point=local&&i===0?{x:center+W*.105,y:H*.70,depth:.10}:
     projected(fx.x+(fx.tx-fx.x)*u,fx.y+(fx.ty-fx.y)*u,.5+(fx.tz-.5)*u);
    if(open(point)){
     if(previous)ctx.lineTo(point.x,point.y);
     else ctx.moveTo(point.x,point.y);
     previous=point;
    }else previous=null;
   }
   ctx.strokeStyle=color;ctx.globalAlpha=fade*.36;ctx.lineWidth=Math.max(2,H*.017);ctx.stroke();
   ctx.strokeStyle='#fff8e5';ctx.globalAlpha=fade*.86;ctx.lineWidth=Math.max(1,H*(fx.character==='hunter'?.0028:.005));ctx.stroke();
  }else if(open(end)){
   const scale=Math.min(H*.24,proj/end.depth*.48),radius=scale*(.30+age*1.1);
   clipAtWalls(end.x,end.y,radius+5,radius+5,end.depth);
   ctx.strokeStyle=color;ctx.globalAlpha=fade*.79;ctx.lineWidth=Math.max(1.2,H*.006);
   ctx.beginPath();
   if(fx.kind==='burst'||fx.character==='demon')ctx.ellipse(end.x,end.y,radius,radius*.67,0,0,TAU);
   else ctx.ellipse(end.x,end.y,radius,radius*.57,fx.character==='guardian'?-.4:.57,.3,3.15);
   ctx.stroke();
  }
  if(fx.kind==='beam'&&(fx.hit||fx.wall)&&open(end)){
   const radius=Math.min(H*.105,Math.max(3,proj/end.depth*.09))*(.9+age);
   clipAtWalls(end.x,end.y,radius+2,radius+2,end.depth);
   ctx.globalAlpha=fade*.85;ctx.strokeStyle=color;ctx.lineWidth=1.5;
   ctx.beginPath();ctx.moveTo(end.x-radius,end.y);ctx.lineTo(end.x+radius,end.y);
   ctx.moveTo(end.x,end.y-radius);ctx.lineTo(end.x,end.y+radius);ctx.stroke();
  }
  ctx.restore();
 }
}
function drawGun(){
 if(player.health<=0)return;
 const role=playerRole(), water=!match&&!battle&&(player.weapon==='water'||player.throwAnim>0)&&player.crossEffect<=0;
 const sprite=water?art.holyWater:$('#fps_'+role);
 if(!artReady(sprite))return;
 const frame=shadedSprite(sprite,player.flash?.99:.84);
 window.ObitelAnimation.firstPerson(ctx,role,frame,player,t,W,H,water);
}

function drawPostFX(){
 if(player.abilityShield>0){
  ctx.save();ctx.strokeStyle='rgba(251,214,137,.35)';ctx.lineWidth=Math.max(3,W*.01);ctx.strokeRect(0,0,W,H);ctx.restore();
 }
 ctx.globalAlpha=player.flash?.68:1;
 ctx.drawImage(vignetteCanvas,0,0,W,H);
 const damage=Math.min(.26,Math.max(0,.35-player.health/100)*.25+player.hurt*.2);
 if(damage>0){ctx.globalAlpha=damage;ctx.drawImage(damageCanvas,0,0,W,H)}
 ctx.globalAlpha=1;
 if(player.abilityPhase>0){
  ctx.fillStyle=`rgba(116,166,207,${Math.min(.055,player.abilityPhase*.036)})`;
  ctx.fillRect(0,0,W,H);
 }
}
function render(now){if(!player)return;
 const cs=Math.cos(player.a),sn=Math.sin(player.a),horizon=viewHorizon();
 drawBase(cs,sn,horizon);drawWalls(cs,sn,horizon);drawSprites(cs,sn,horizon);drawParticles(cs,sn,horizon);drawCombatFX(cs,sn,horizon);if(!player.hidden)drawGun();drawPostFX();if(player.hidden){ctx.fillStyle='rgba(4,5,8,.78)';ctx.fillRect(0,0,W*.28,H);ctx.fillRect(W*.72,0,W*.28,H);ctx.fillStyle='rgba(20,11,9,.42)';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#866342';ctx.lineWidth=7;ctx.strokeRect(W*.26,0,W*.48,H);}if(now-lastRadar>=85){lastRadar=now;drawRadar()}}
function drawRadar(){const w=110,h=110;rctx.fillStyle='#061012';rctx.fillRect(0,0,w,h);let scale=12,r=4.5,cx=w/2,cy=h/2,px=Math.floor(player.x),py=Math.floor(player.y);for(let yy=-5;yy<=5;yy++)for(let xx=-5;xx<=5;xx++){let gx=px+xx,gy=py+yy;if(gx<0||gy<0||gx>=MAPSIZE||gy>=MAPSIZE||!visited[gy][gx])continue;rctx.fillStyle=world[gy][gx]?'#1c3334':'#445653';rctx.fillRect(cx+xx*scale-scale/2,cy+yy*scale-scale/2,scale-1,scale-1)}for(let o of objects)if(!o.used&&['core','exit','keyItem','wardrobe','confessional'].includes(o.type)){let dx=(o.x-player.x),dy=(o.y-player.y);if(Math.abs(dx)>5||Math.abs(dy)>5)continue;rctx.fillStyle=o.type==='core'?'#a8eebd':o.type==='keyItem'?'#f1c16b':o.type==='wardrobe'||o.type==='confessional'?'#72929e':'#f16b5b';rctx.fillRect(cx+dx*scale-3,cy+dy*scale-3,6,6)}rctx.save();rctx.translate(cx,cy);rctx.rotate(player.a+Math.PI/2);rctx.fillStyle='#edf4d7';rctx.beginPath();rctx.moveTo(0,-8);rctx.lineTo(6,6);rctx.lineTo(0,3);rctx.lineTo(-6,6);rctx.fill();rctx.restore();rctx.strokeStyle='#52756a';rctx.strokeRect(.5,.5,w-1,h-1);rctx.fillStyle='#86aea3';rctx.font='8px monospace';rctx.fillText('RDR //13',5,10)}
function drawBigmap(){const s=bigmap.width/MAPSIZE;bctx.fillStyle='#061012';bctx.fillRect(0,0,400,400);for(let y=0;y<MAPSIZE;y++)for(let x=0;x<MAPSIZE;x++){bctx.fillStyle=visited[y][x]?(world[y][x]?'#0b1719':'#465850'):(world[y][x]?'#03090a':'#142223');bctx.fillRect(x*s,y*s,s-.7,s-.7)}for(let o of objects)if(!o.used&&['core','exit','keyItem','wardrobe','confessional'].includes(o.type)){let x=o.x*s,y=o.y*s;bctx.fillStyle=o.type==='core'?'#a8edbb':o.type==='keyItem'?'#edca7e':o.type==='wardrobe'||o.type==='confessional'?'#7e9fae':'#fc6b59';bctx.fillRect(x-4,y-4,8,8)}if(vaultDoor&&!vaultDoor.used){bctx.fillStyle='#d98564';bctx.fillRect(vaultDoor.x*s-4,vaultDoor.y*s-4,8,8)}bctx.save();bctx.translate(player.x*s,player.y*s);bctx.rotate(player.a+Math.PI/2);bctx.fillStyle='white';bctx.beginPath();bctx.moveTo(0,-8);bctx.lineTo(6,6);bctx.lineTo(-6,6);bctx.fill();bctx.restore()}
function openMap(){if(scene!=='play')return;resetInputs();pauseFromMap=true;scene='map';drawBigmap();$('#mapScreen').classList.remove('hidden');if(document.pointerLockElement)document.exitPointerLock();stopAmbient()}function closeMap(){if(scene!=='map')return;scene='play';pauseFromMap=false;last=performance.now();$('#mapScreen').classList.add('hidden');startAmbient()}
function frame(now){
 const elapsed=now-last,dt=clamp(elapsed/1000,0,.05);
 last=now;
 const costStart=performance.now();
 if(match&&!match.result)onlineFrame(dt);
 else if(scene==='play')update(dt);
 if(scene==='play'){
  const motion=player.weaponMotion||0;
  player.weaponMotion=motion+(player.moveSpeed-motion)*(1-Math.exp(-dt*11));
  render(now);
  adjustQuality(now,performance.now()-costStart,elapsed);
 }
 requestAnimationFrame(frame);
}
// Procedural sound: no external assets or libraries.
let audio=null,master=null,drone=[],ambNoise=null,ambFilter=null,ambientOn=false;function audioInit(){if(audio)return;try{audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=settings.muted?0:.35;master.connect(audio.destination)}catch(e){audio=null}}
function sndTone(freq,kind='sine',dur=.1,vol=.1,slide=0){if(!audio||settings.muted)return;const now=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type=kind;o.frequency.setValueAtTime(freq,now);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(18,freq+slide),now+dur);g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(.0001,now+dur);o.connect(g);g.connect(master);o.start(now);o.stop(now+dur+.01)}
const noiseBuffers=new Map();
function noise(dur,vol,lp=1000){if(!audio||settings.muted)return;let buf=noiseBuffers.get(dur);
 if(!buf){const sz=Math.floor(audio.sampleRate*dur);buf=audio.createBuffer(1,sz,audio.sampleRate);
 const data=buf.getChannelData(0);for(let i=0;i<sz;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/sz*2);noiseBuffers.set(dur,buf)}
 let src=audio.createBufferSource(),f=audio.createBiquadFilter(),gain=audio.createGain();f.type='lowpass';f.frequency.value=lp;gain.gain.value=vol;src.buffer=buf;src.connect(f);f.connect(gain);gain.connect(master);src.start()}
function sfx(type){if(settings.muted)return;audioInit();if(!audio)return;switch(type){case'holy':sndTone(583,'sine',.23,.17,190);sndTone(907,'sine',.35,.09,-230);break;case'waterThrow':noise(.13,.13,950);sndTone(290,'sine',.19,.08,110);break;case'waterBlast':noise(.35,.24,2000);sndTone(250,'triangle',.63,.27,-165);sndTone(940,'sine',.55,.11,-400);break;case'banish':noise(.21,.12,450);sndTone(340,'sine',.48,.13,320);break;case'shot':noise(.18,.38,3000);sndTone(95,'sawtooth',.20,.31,-65);break;case'impact':sndTone(74,'triangle',.12,.2,-34);break;case'hurt':noise(.21,.29,450);sndTone(105,'sawtooth',.32,.2,-60);break;case'step':noise(.045,.022,100);break;case'pickup':sndTone(490,'sine',.1,.13,240);break;case'core':sndTone(220,'triangle',.5,.19,450);sndTone(440,'sine',.6,.11,460);break;case'switch':sndTone(730,'square',.045,.06,-450);break;case'reload':noise(.08,.065,900);sndTone(350,'triangle',.08,.07,-200);break;case'reloadEnd':sndTone(490,'triangle',.09,.1,-175);break;case'empty':sndTone(120,'square',.05,.08,-50);break;case'deny':sndTone(110,'square',.2,.08,-25);break;case'growl':sndTone(176,'sine',1.2,.045,-85);sndTone(340,'triangle',.9,.027,-180);noise(.28,.028,570);break;case'explosion':noise(.55,.55,500);sndTone(65,'sawtooth',.64,.4,-38);break;case'win':sndTone(220,'sine',.7,.18,540);break;case'death':sndTone(105,'sawtooth',1,.18,-78);break}}
function startAmbient(){if(ambientOn||settings.muted)return;audioInit();if(!audio)return;audio.resume().catch(()=>{});ambientOn=true;for(let f of [43.65,55.1,58.3]){let o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=f;g.gain.value=.034;o.connect(g);g.connect(master);o.start();drone.push(o)}}function stopAmbient(){if(!ambientOn)return;ambientOn=false;for(let o of drone){try{o.stop()}catch(e){}}drone=[]}
let fullscreenHintUntil=0;
async function immersiveFullscreen(){
 try{
  if(!document.fullscreenElement){
   let el=document.documentElement;
   if(el.requestFullscreen)await el.requestFullscreen({navigationUI:'hide'});
   else if(el.webkitRequestFullscreen)el.webkitRequestFullscreen();
  }
 }catch(err){console.warn('Fullscreen unavailable:',err.message)}
 try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape')}catch(err){/* browser may require manual rotation */}
 resize();syncFullscreenUI();
}
function syncFullscreenUI(){
 const active=!!document.fullscreenElement;
 for(let sel of ['#fullscreenBtn','#menuFullscreen','#pauseFullscreen']){
  let b=$(sel);if(!b)continue;
  b.title=active?'Выйти из полноэкранного режима':'Открыть на весь экран';
  if(sel==='#menuFullscreen'){b.textContent=active?'Выйти из полного экрана':'На весь экран';continue}
  if(sel!=='#fullscreenBtn')b.textContent=active?'⊟ ВЫЙТИ ИЗ ПОЛНОГО ЭКРАНА':'⛶ ПОЛНЫЙ ЭКРАН / АЛЬБОМНЫЙ РЕЖИМ';
 }
}
function toggleFullscreen(){if(document.fullscreenElement){document.exitFullscreen().catch(()=>{});}else immersiveFullscreen()}
function updateInputSettings(){
 settings.lookSensitivity=Number($('#lookSensitivity').value)/100;
 settings.stickSensitivity=Number($('#stickSensitivity').value)/100;
 settings.invertView=$('#invertView').checked;
 settings.leftHanded=$('#leftHanded').checked;
 settings.deadZone=clamp(Number($('#deadZone').value)/100,.04,.24);
 settings.floatingStick=$('#floatingStick').checked;
 settings.vibration=$('#vibration').checked;
 $('#lookValue').textContent=Math.round(settings.lookSensitivity*100)+'%';
 $('#stickValue').textContent=Math.round(settings.stickSensitivity*100)+'%';
 document.body.classList.toggle('leftHanded',settings.leftHanded);persistOptions();
}

let overlayFrom='menu';
function openOverlay(selector){
 overlayFrom=scene==='paused'?'pause':'menu';
 for(const id of ['#menu','#pauseScreen','#helpScreen','#settingsScreen','#journalScreen','#skirmishScreen'])$(id).classList.add('hidden');
 $(selector).classList.remove('hidden');
 if(selector==='#journalScreen'){
  $('#journalContent').textContent=`Этаж ${floorNo}. ${floorFlavor||'Начало пути'}\n\nНайденные записи:\n${foundLore.length?foundLore.join('\n\n'):'Здесь пока нет записей.'}\n\nКрест бесконечен. Святая вода ограничена. Шкафы и исповедальни скрывают вас от духов. Два ключа: один откроет склеп, другой — спуск.`;
 }
 if(selector==='#settingsScreen'){
  $('#menuLook').value=$('#lookSensitivity').value;$('#menuStick').value=$('#stickSensitivity').value;$('#menuInvert').checked=$('#invertView').checked;$('#menuLeft').checked=$('#leftHanded').checked;
  $('#menuDeadZone').value=$('#deadZone').value;$('#menuFloatingStick').checked=settings.floatingStick;$('#menuVibration').checked=settings.vibration;$('#difficultySelect').value=difficulty
 }
}
function closeOverlay(){
 for(const id of ['#helpScreen','#settingsScreen','#journalScreen','#skirmishScreen'])$(id).classList.add('hidden');
 $(overlayFrom==='pause'?'#pauseScreen':'#menu').classList.remove('hidden');
}
function returnToMenu(){
 resetInputs();
 if(match){online.reset();showOnlineLobby();$('#onlineScreen').classList.add('hidden');}
 else if(scene==='play')saveCheckpoint();if(document.pointerLockElement)document.exitPointerLock();
 scene='menu';battle=false;humanClass='priest';$('#abilityInfo').style.display='none';stopAmbient();$('#hud').style.display='none';$('#touchControls').classList.remove('gameOn');
 for(const id of ['#pauseScreen','#mapScreen','#resultScreen','#settingsScreen','#helpScreen','#journalScreen','#skirmishScreen'])$(id).classList.add('hidden');
 $('#menu').classList.remove('hidden');$('#restartBtn').hidden=false;
 $('#netInviteInMatch').hidden=true;
 for(const id of ['reload','use','flash'])$('#'+id).style.display='';$('#hudCenter').style.display='';setContinueButton();
}

// Online skirmishes use the same renderer and powers as the local game.
// The room owner advances the simulation independently of the pause and map screens.
const onlineClasses = window.ObitelCharacters.classes;
let match = null, online;
const netSide = actor => onlineClasses[actor.character].side;
const onlinePower = actor => (netSide(actor) === 'hunt' ? HUMAN_ABILITY : SPIRIT_ABILITY)[actor.character];
const emptyInput = () => ({ f:0, s:0, a:0, attack:false, action:0 });

function onlineArena() {
 const map = Array.from({length:MAPSIZE}, () => Array(MAPSIZE).fill(1));
 for (let y=1; y<=15; y++) for (let x=1; x<=19; x++) map[y][x] = 0;
 for (const x of [5,9,11,15]) {
  for (const [top,bottom] of [[1,3],[6,7],[9,10],[13,15]]) {
   for (let y=top; y<=bottom; y++) map[y][x] = 1;
  }
 }
 for (const y of [5,11]) {
  for (const x of [3,7,13,17]) map[y][x] = map[y][x+1] = 1;
 }
 return map;
}
function onlineActor(member, slot) {
 const hunter = onlineClasses[member.character].side === 'hunt';
 const x = hunter ? 2.5 : 17.5, y = [4.5,6.7,8.9,12.5][slot], a = hunter ? 0 : Math.PI;
 return { ...member, slot, x, y, a, hp:100, kills:0, shots:0, walk:0, motion:0, fireCd:0, abilityCd:0, abilityPhase:0,
  abilityShield:0, stun:0, flash:0, input:{ ...emptyInput(), a }, usedAction:0, lastInput:0 };
}
function showOnlineLobby() {
 resetInputs();
 if (document.pointerLockElement) document.exitPointerLock();
 match = null;
 scene = 'menu'; battle = false; stopAmbient();
 for (const id of ['menu','pauseScreen','mapScreen','resultScreen','journalScreen']) $('#'+id).classList.add('hidden');
 $('#onlineScreen').classList.remove('hidden');
 $('#hud').style.display = 'none';
 $('#touchControls').classList.remove('gameOn');
 $('#abilityInfo').style.display = 'none';
 $('#netBanner').style.display = 'none';
 $('#restartPauseBtn').hidden = false;
 $('#netInviteInMatch').hidden = true;
 $('#pauseJournalBtn').hidden = false;
 $('#restartBtn').textContent = 'ПОВТОРИТЬ';
 $('#restartBtn').hidden = false;
 $('#netResultLeave').hidden = true;
 $('#sprint').style.display = '';
 $('#reload').style.display = '';
 $('#use').style.display = '';
 $('#flash').style.display = '';
}
function startOnline(message, id, host) {
 const slots = { hunt:0, spirit:0 };
 const actors = new Map(message.players.map(member => {
  const spawned=onlineActor(member, slots[netSide(member)]++);
  return [member.id, { ...spawned, ...member }];
 }));
 const me = actors.get(id);
 if (!me) return;
 match = { host, id, me, actors, remaining:240, action:0, lastSend:0, latest:null, result:null, tick:performance.now(), deadline:null, sequence:0, lastSequence:-1, waiting:true };
 world = onlineArena();
 objects = [];
 for (const x of [2.5,8.5,11.5,17.5]) for (const y of [2.1,13.9]) objects.push({type:'lamp',x,y});
 for (const x of [7.5,12.5]) for (const y of [3.5,12.5]) objects.push({type:'candles',x,y});
 enemies=[]; projectiles=[]; particles=[]; combatEffects=[]; exorcistBots=[]; spiritAllyBots=[]; vaultDoor=null;
 visited = world.map(row => row.map(() => true));
 floorNo=1; floorFlavor='Зал исповедей'; t=0; lookPitch=0;
 player = { ...me, health:me.hp, stamina:100, battery:100, flash:netSide(me)==='hunt', grenades:0, keys:0, hidden:false,
  weapon:'cross', waterCd:0, crossEffect:0, throwAnim:0, holyGlow:0, cores:0, reload:0, flashShot:0,
  hurt:0, bob:0, steps:0, moveSpeed:0, walkTime:0, started:performance.now() };
 resetInputs();
 scene='play'; last=performance.now();
 for (const id of ['onlineScreen','menu','pauseScreen','mapScreen','resultScreen']) $('#'+id).classList.add('hidden');
 $('#hud').style.display='block'; $('#touchControls').classList.add('gameOn');
 mobile.theme(me.character,onlineClasses[me.character],false);
 $('#restartPauseBtn').hidden=true;
 $('#netInviteInMatch').hidden=false;
 $('#netInviteInMatch').textContent='КОПИРОВАТЬ ПРИГЛАШЕНИЕ'; $('#pauseJournalBtn').hidden=true;
 $('#missionSmall').textContent='ОНЛАЙН · ВЫ '+(netSide(me)==='hunt'?'ЗА ОХОТНИКОВ':'ЗА ДУХОВ');
 $('#netBanner').classList.add('netMatchBanner');
 audioInit(); startAmbient(); onlineHud();
}
function onlineAdd(member) {
 if (!match?.host || match.result) return;
 const side=netSide(member);
 const used=new Set([...match.actors.values()].filter(actor=>netSide(actor)===side).map(actor=>actor.slot));
 const slot=[0,1,2,3].find(i=>!used.has(i));
 if (slot===undefined) return;
 const actor=onlineActor(member,slot);
 actor.spawnGrace=1.8;
 match.actors.set(actor.id,actor);
 showToast(onlineClasses[actor.character].name.toUpperCase()+' ВОШЁЛ НА АРЕНУ',2);
}

function onlineHud() {
 const state = match;
 const alive = side => [...state.actors.values()].filter(actor => netSide(actor) === side && actor.hp > 0).length;
 const seconds = Math.max(0, Math.ceil(state.remaining));
 hudText('coreCount',state.waiting?'–:––':Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'));
 hudText('signal',state.waiting?'РАЗМИНКА · ЖДЁМ СОПЕРНИКА':state.me.hp>0?'ОХОТНИКИ '+alive('hunt')+' · ДУХИ '+alive('spirit'):'ВЫ ВЫБЫЛИ · МОЖНО ОСМАТРИВАТЬСЯ ДО КОНЦА МАТЧА');
 const banner=$('#netBanner');
 const label = onlineClasses[state.me.character].name+' · '+onlineClasses[state.me.character].attack;
 if (banner.textContent !== label) banner.textContent=label;
 banner.style.display='block';
 updateHud();
 powerUI();
}
function onlineApplyInput(id, message) {
 const actor = match?.actors.get(id);
 if (!match?.host || match.result || !actor || actor.hp <= 0) return;
 const now = performance.now();
 if (now - actor.lastInput < 18 || ![message.f,message.s,message.a].every(Number.isFinite)) return;
 const validAction = Number.isSafeInteger(message.action) && message.action >= actor.usedAction && message.action < 1000000;
 actor.input = { f:clamp(message.f,-1,1), s:clamp(message.s,-1,1), a:normAng(message.a),
  pitch:Number.isFinite(message.pitch)?clamp(message.pitch,-.7,.7):0,
  attack:message.attack === true, action:validAction ? message.action : actor.usedAction };
 actor.lastInput = now;
}
function onlineMove(actor, input, dt, character) {
 const f = input.f, s = input.s, scale = onlineClasses[character].speed * dt / Math.max(1,Math.hypot(f,s));
 moveEntity(actor,(Math.cos(input.a)*f-Math.sin(input.a)*s)*scale,(Math.sin(input.a)*f+Math.cos(input.a)*s)*scale,.19);
}
function onlineHurt(actor, amount, attacker) {
 if (actor.hp <= 0 || actor.spawnGrace>0) return;
 actor.hp = Math.max(0,actor.hp-amount*(actor.abilityShield>0?.35:1)*(actor.abilityPhase>0?.3:1));
 actor.flash = .28;
 if (actor.hp <= 0) {
  actor.deathAnim=.94;
  attacker.kills++;
  onlineEmit({ type:'effect', kind:'death', id:actor.id, x:actor.x, y:actor.y, color:onlineClasses[actor.character].color });
 }
}
function onlineEmit(message) {
 onlineEffect(message);
 online.broadcast(message);
}
function onlineEffect(message) {
 if (!match || match.result) return;
 const actor=match.actors.get(message.id);
 if (message.kind === 'attack') {
  if (!actor||![message.x,message.y,message.tx,message.ty].every(Number.isFinite)) return;
  actor.attackAnim=.45;
  addCombatFX(actor.character,message.x,message.y,message.tx,message.ty,Number.isFinite(message.tz)?clamp(message.tz,0,1.16):.5,message.hit,message.wall);
  if (message.id === match.id) {
   player.crossEffect=window.ObitelAnimation.attackTime(playerRole());
   attackSound(actor.character);
   if(message.hit)hitFeedback();
  }
  return;
 } else if (message.kind === 'power') {
  if (actor) actor.powerAnim=.62;
  if (message.id === match.id) {
   player.holyGlow=.4;
   player.powerAnim=.62;
   showToast(onlinePower(match.me).name,1.3);
   sfx(netSide(match.me)==='hunt'?'holy':'growl');
  }
 } else if (message.kind === 'death') {
  if (actor) actor.deathAnim=.94;
  if (message.id === match.id) sfx('death');
 }
 spawnHoly(message.tx ?? message.x, message.ty ?? message.y, message.kind==='attack'?10:30, message.color);
}
function attackTargets(actor,config,opponents) {
 const hits=opponents.filter(other => {
  const d=dist(actor,other);
  return d<=config.range && Math.abs(normAng(Math.atan2(other.y-actor.y,other.x-actor.x)-actor.a))<=config.arc+Math.atan2(.23,d)
   && lineClear(actor.x,actor.y,other.x,other.y);
 }).sort((a,b)=>dist(actor,a)-dist(actor,b));
 return config.sweep?hits:hits.slice(0,1);
}
function resolveAttack(actor,role,opponents,slope){
 const config=onlineClasses[role];
 if(usesRay(role)){
  const assist={hunter:.035,priest:.15,medic:.23,cultist:.25}[role];
  const shot=traceAttack(actor,config.range,opponents,slope,assist);
  return {...shot,targets:shot.target?[shot.target]:[]};
 }
 const targets=attackTargets(actor,config,opponents);
 const distance=Math.min(config.range,Math.max(.04,castRay(Math.cos(actor.a),Math.sin(actor.a),actor).d-.025));
 return {targets,tx:targets[0]?.x??actor.x+Math.cos(actor.a)*distance,ty:targets[0]?.y??actor.y+Math.sin(actor.a)*distance,tz:.51,wall:false};
}
function onlineAttack(actor, opponents) {
 const config=onlineClasses[actor.character];
 actor.fireCd=config.interval; actor.shots++; actor.abilityPhase=0;
 const {targets,tx,ty,tz,wall}=resolveAttack(actor,actor.character,opponents,actor.pitch||0);
 for (const other of targets) onlineHurt(other,config.damage,actor);
 onlineEmit({type:'effect',kind:'attack',id:actor.id,x:actor.x,y:actor.y,tx,ty,tz,wall,
  beam:usesRay(actor.character),hit:targets.length>0,color:config.color});
}
function onlineSnapshot() {
 const { actors, remaining } = match;
 return { type:'state', remaining, waiting:match.waiting, sequence:++match.sequence, players:[...actors.values()].map(actor => ({
  id:actor.id, character:actor.character, slot:actor.slot, x:actor.x, y:actor.y, a:actor.a, hp:actor.hp, kills:actor.kills,
  shots:actor.shots, walk:actor.walk, stun:actor.stun, abilityCd:actor.abilityCd, abilityPhase:actor.abilityPhase,
  abilityShield:actor.abilityShield, flash:actor.flash
 })) };
}
function onlineState(message) {
 if (!match || match.result || message.sequence<=match.lastSequence) return;
 match.lastSequence=message.sequence;
 match.remaining=message.remaining;
 match.waiting=message.waiting;
 for (const [id] of match.actors) if (!message.players.some(actor=>actor.id===id)) match.actors.delete(id);
 for (const fresh of message.players) {
  let actor=match.actors.get(fresh.id);
  if (!actor) {
   actor={ ...onlineActor(fresh,fresh.slot), ...fresh };
   match.actors.set(actor.id,actor);
  } else if (fresh.hp<=0 && actor.hp>0) {
   actor.deathAnim=.94;
  }
  if (fresh.id===match.id) {
   if (fresh.hp<actor.hp) { player.hurt=.45; if (fresh.hp>0) sfx('hurt'); }
   match.latest=fresh;
  }
  Object.assign(actor,fresh);
 }
}
function onlineFinish(message) {
 if (!match || match.result) return;
 resetInputs();
 match.result=message;
 const won=message.winner===netSide(match.me);
 scene=won?'won':'dead';
 stopAmbient();
 $('#netBanner').style.display='none'; $('#hud').style.display='none';
 $('#abilityInfo').style.display='none'; $('#touchControls').classList.remove('gameOn');
 for (const id of ['mapScreen','pauseScreen','journalScreen']) $('#'+id).classList.add('hidden');
 $('#resultEyebrow').textContent='✠ ОНЛАЙН 4 × 4';
 $('#resultTitle').textContent=message.winner==='draw'?'НИЧЬЯ':message.winner==='hunt'?'ОХОТНИКИ ПОБЕДИЛИ':'ДУХИ ПОБЕДИЛИ';
 $('#resultText').textContent=message.winner==='draw'?'Время вышло. Силы команд равны.':won?'Ваша команда победила.':'Ваша команда проиграла.';
 $('#resultStats').textContent='Устранено: '+match.me.kills+' · Атак: '+match.me.shots;
 $('#restartBtn').textContent='В ЛОББИ'; $('#restartBtn').hidden=!match.host;
 $('#netResultLeave').hidden=false;
 $('#resultScreen').classList.remove('hidden');
 if(document.pointerLockElement) document.exitPointerLock();
 if(message.winner!=='draw')sfx(won?'win':'death');
}
function onlineTick() {
 if (!match?.host || match.result) return;
 const now=performance.now(), dt=clamp((now-match.tick)/1000,0,.12);
 match.tick=now;
 const actors=[...match.actors.values()];
 if (match.deadline===null && ['hunt','spirit'].every(side=>actors.some(actor=>netSide(actor)===side))) {
  match.deadline=now+240000;
  match.waiting=false;
  showToast('СОПЕРНИК НА АРЕНЕ · БОЙ НАЧАЛСЯ',2.4);
 }
 if (match.deadline!==null) match.remaining=(match.deadline-now)/1000;
 for (const actor of actors) {
  for (const timer of ['fireCd','abilityCd','abilityPhase','abilityShield','flash','stun','spawnGrace']) actor[timer]=Math.max(0,(actor[timer]||0)-dt);
  if (match.finishAt || actor.hp<=0 || now-actor.lastInput>350) continue;
  const input=actor.input;
  actor.a=input.a;actor.pitch=input.pitch||0;
  if (actor.stun<=0) {
   const x=actor.x,y=actor.y;
   onlineMove(actor,input,dt,actor.character);
   actor.walk+=Math.hypot(actor.x-x,actor.y-y)*4;
  }
  const opponents=actors.filter(other=>other.hp>0 && !other.spawnGrace && netSide(other)!==netSide(actor));
  if (actor.stun<=0 && input.attack && actor.fireCd===0) { actor.spawnGrace=0; onlineAttack(actor,opponents); }
  if (input.action!==actor.usedAction) {
   actor.usedAction=input.action;
   if (actor.stun>0 || actor.abilityCd>0) continue;
   actor.spawnGrace=0;
   actor.abilityCd=onlinePower(actor).cd;
   const hurt=(other,amount)=>onlineHurt(other,amount,actor);
   if (netSide(actor)==='hunt') humanPower(actor.character,actor,opponents,hurt,actors.filter(other=>netSide(other)==='hunt'));
   else spiritPower(actor.character,actor,opponents,hurt);
   onlineEmit({ type:'effect',kind:'power',id:actor.id,x:actor.x,y:actor.y,color:onlineClasses[actor.character].color });
  }
 }
 const survivors=side=>actors.filter(actor=>netSide(actor)===side && actor.hp>0);
 const hunters=survivors('hunt'), spirits=survivors('spirit');
 const score=team=>team.reduce((sum,actor)=>sum+actor.hp,0);
 if (!match.waiting && (match.remaining<=0 || !hunters.length || !spirits.length)) {
  const winner=hunters.length!==spirits.length?(hunters.length>spirits.length?'hunt':'spirit'):
   score(hunters)===score(spirits)?'draw':score(hunters)>score(spirits)?'hunt':'spirit';
  const result={ type:'finish', winner };
  if (!match.finishAt) {
   match.finishAt=now+950;
   match.decided=result;
   online.roundFinished();
  }
 }
 if (match.finishAt && now>=match.finishAt) {
  online.broadcast(onlineSnapshot()); online.broadcast(match.decided); onlineFinish(match.decided);
  return;
 }
 if (now-match.lastSend>=75) { match.lastSend=now; online.broadcast(onlineSnapshot()); }
}
function onlineFrame(dt) {
 const active=scene==='play' && !document.hidden && match.me.hp>0;
 const me=match.me;
 if (scene==='play') {
  if (key.ArrowLeft) player.a-=dt*1.8;
  if (key.ArrowRight) player.a+=dt*1.8;
  const vertical=Number(Boolean(key.KeyK||key.PageDown))-Number(Boolean(key.KeyI||key.PageUp));
  lookPitch=clamp(lookPitch+vertical*dt*H*.43*(settings.invertView?-1:1),-H*.32,H*.32);
 }
 if (active) {
  smoothMove(dt);
 }
 const input={ f:active?(key.KeyW||key.ArrowUp?1:0)-(key.KeyS||key.ArrowDown?1:0)+touch.forward:0,
  s:active?(key.KeyD?1:0)-(key.KeyA?1:0)+touch.strafe:0, a:player.a,
  pitch:aimingSlope(),
  attack:Boolean(active&&(mouseFire||touch.fire||key.Space||key.ControlLeft||performance.now()<match.pulseUntil)),
  action:match.action };
 const now=performance.now();
 if (match.host) onlineApplyInput(match.id,input);
 else if (now-match.lastInput>=45 || !match.lastInput) {
  match.lastInput=now;
  online.sendInput(input);
 }
 if (active && me.stun<=0 && !match.host) onlineMove(player,input,dt,me.character);
 if (match.host) {
  if (player.health>me.hp) { player.hurt=.45; if (me.hp>0) sfx('hurt'); }
  player.x=me.x; player.y=me.y;
 } else if (match.latest) {
  const error=dist(player,me);
  if (error>.36) {
   const blend=error>1.4?1:Math.min(1,dt*9);
   player.x+=(me.x-player.x)*blend; player.y+=(me.y-player.y)*blend;
  }
 }
 player.health=me.hp;
 player.abilityCd=me.abilityCd; player.abilityShield=me.abilityShield; player.abilityPhase=me.abilityPhase;
 player.moveSpeed=Math.abs(input.f)+Math.abs(input.s)>.1?onlineClasses[me.character].speed:0;
 if (player.moveSpeed) player.walkTime+=dt*7;
 player.bob=player.moveSpeed?Math.sin(player.walkTime*2)*H*.0031:player.bob*.85;
 player.hurt=Math.max(0,player.hurt-dt);
 t+=dt;
 updateHoly(dt);
 for (const actor of match.actors.values()) {
  for (const timer of ['attackAnim','powerAnim','deathAnim']) actor[timer]=Math.max(0,(actor[timer]||0)-dt);
  actor.motion+=(Math.min(1,Math.abs(actor.walk-(actor.lastWalk??actor.walk))*7)-actor.motion)*Math.min(1,dt*10);
  actor.lastWalk=actor.walk;
  if (actor.id===match.id) continue;
  actor.drawX=actor.drawX===undefined?actor.x:actor.drawX+(actor.x-actor.drawX)*Math.min(1,dt*14);
  actor.drawY=actor.drawY===undefined?actor.y:actor.drawY+(actor.y-actor.drawY)*Math.min(1,dt*14);
 }
 if (scene==='play') onlineHud();
}
function onlineSprites(list) {
 if (!match) return;
 for (const actor of match.actors.values()) {
  if (actor.id===match.id || (actor.hp<=0 && !actor.deathAnim) || (actor.abilityPhase>0 && netSide(actor)!==netSide(match.me))) continue;
  const type=netSide(actor)==='hunt'?'exorcist':actor.character;
  list.push({ x:actor.drawX??actor.x,y:actor.drawY??actor.y,type,
   enemy:{ ...actor,type,role:actor.character,alive:actor.hp>0 } });
 }
}
const characterPortrait = id => art[id].src;
function netWireUI() {
 online=window.ObitelOnline.create({
  portrait:characterPortrait,
  showLobby:showOnlineLobby, closeLobby:()=>{ $('#onlineScreen').classList.add('hidden'); $('#menu').classList.remove('hidden'); },
  start:startOnline, add:onlineAdd, input:onlineApplyInput, state:onlineState, effect:onlineEffect, finish:onlineFinish,
  drop:id=>match?.actors.delete(id)
 });
 $('#onlineBtn').onclick=online.open;
 if (new URLSearchParams(location.search).has('room')) online.open();
 setInterval(onlineTick,33);
}

function initInputs(){
 mobile=window.ObitelControls.bind({
  root:$('#touchControls'),state:touch,settings,active:()=>scene==='play'&&player.health>0,
  look:(dx,dy)=>{
   const scale=440/Math.max(280,Math.min(innerWidth,innerHeight));
   player.a+=dx*.0044*scale*settings.lookSensitivity;
   lookPitch=clamp(lookPitch+dy*H*.0013*scale*settings.lookSensitivity*(settings.invertView?-1:1),-H*.32,H*.32);
  },
  actions:{
   fire:[single=>{if(!single)touch.fire=true;primaryAttack()},()=>touch.fire=false],
   sprint:[single=>{if(!single)touch.sprint=true},()=>touch.sprint=false],
   ability:[useAbility],reload:[throwWater],use:[interact],flash:[toggleFlash],mapBtn:[openMap]
  }
 });
 netWireUI();
 const start=()=>{
  battle=false;audioInit();createGame();
  if(IS_TOUCH&&innerWidth>innerHeight&&!document.fullscreenElement)immersiveFullscreen();
 };
 $('#startBtn').onclick=start;$('#restartBtn').onclick=()=>match?online.backToLobby():battle?battleStart():start();$('#restartPauseBtn').onclick=()=>battle?battleStart():start();
 $('#continueBtn').onclick=()=>{if(safeRead(SAVE_KEY)){audioInit();createGame(true);if(IS_TOUCH&&innerWidth>innerHeight&&!document.fullscreenElement)immersiveFullscreen()}};
 botPicker=window.ObitelCharacters.picker($('#skirmishHunt'),$('#skirmishSpirits'),$('#skirmishClasses'),characterPortrait);
 $('#skirmishBtn').onclick=()=>{editBotRoom();openOverlay('#skirmishScreen')};
 $('#skirmishBack').onclick=closeOverlay;$('#skirmishCreate').onclick=botRoom;
 $('#skirmishStart').onclick=battleStart;$('#skirmishEdit').onclick=editBotRoom;
 $('#menuSettingsBtn').onclick=()=>openOverlay('#settingsScreen');
 $('#menuHelpBtn').onclick=()=>openOverlay('#helpScreen');
 $('#menuJournalBtn').onclick=()=>openOverlay('#journalScreen');
 $('#pauseJournalBtn').onclick=()=>openOverlay('#journalScreen');
 $('#returnMenuBtn').onclick=returnToMenu;$('#netResultLeave').onclick=returnToMenu;
 for(const id of ['#settingsBack','#helpBack','#journalBack'])$(id).onclick=closeOverlay;
 for(const id of ['#menuLook','#menuStick','#menuInvert','#menuLeft','#menuDeadZone','#menuFloatingStick','#menuVibration'])$(id).addEventListener('input',()=>{
  $('#lookSensitivity').value=$('#menuLook').value;$('#stickSensitivity').value=$('#menuStick').value;
  $('#invertView').checked=$('#menuInvert').checked;$('#leftHanded').checked=$('#menuLeft').checked;
  $('#deadZone').value=$('#menuDeadZone').value;$('#floatingStick').checked=$('#menuFloatingStick').checked;$('#vibration').checked=$('#menuVibration').checked;
  updateInputSettings()
 });
 $('#difficultySelect').addEventListener('input',()=>{difficulty=$('#difficultySelect').value;persistOptions()});
 const savedOptions=safeRead(OPTIONS_KEY);if(savedOptions){
  for(const k of Object.keys(settings))if(savedOptions[k]!==undefined)settings[k]=savedOptions[k];
  difficulty=savedOptions.difficulty||'normal';
  $('#lookSensitivity').value=Math.round(settings.lookSensitivity*100);$('#stickSensitivity').value=Math.round(settings.stickSensitivity*100);
  $('#invertView').checked=!!settings.invertView;$('#leftHanded').checked=!!settings.leftHanded;
  $('#deadZone').value=Math.round(settings.deadZone*100);$('#floatingStick').checked=settings.floatingStick;$('#vibration').checked=settings.vibration;
 }
 $('#difficultySelect').value=difficulty;setContinueButton();
 $('#resumeBtn').onclick=()=>togglePause();$('#pauseBtn').onclick=()=>togglePause();
 $('#muteBtn').onclick=()=>{settings.muted=!settings.muted;$('#muteBtn').textContent=settings.muted?'×':'♫';if(master)master.gain.value=settings.muted?0:.35;if(settings.muted)stopAmbient();else if(scene==='play')startAmbient()};
 $('#closeMapBtn').onclick=closeMap;
 for(const el of ['#fullscreenBtn','#menuFullscreen','#pauseFullscreen','#rotateFullscreen'])$(el).addEventListener('click',toggleFullscreen);
 document.addEventListener('fullscreenchange',()=>{syncFullscreenUI();resize()});
 if(screen.orientation&&screen.orientation.addEventListener)screen.orientation.addEventListener('change',resize);
 for(const el of ['#lookSensitivity','#stickSensitivity','#invertView','#leftHanded','#deadZone','#floatingStick','#vibration'])$(el).addEventListener('input',updateInputSettings);
 updateInputSettings();
 window.addEventListener('keydown',e=>{
  let k=e.code;
  if(!$('#onlineScreen').classList.contains('hidden'))return;
  if(k!=='Escape'&&!$('#skirmishScreen').classList.contains('hidden'))return;
  if(['INPUT','SELECT','BUTTON'].includes(e.target?.tagName)&&k!=='Escape'&&scene!=='play')return;
  if((scene==='play'&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Tab'].includes(k))||(scene==='map'&&k==='Tab'))e.preventDefault();
  if(!key[k]){
   if(k==='Space'||k==='ControlLeft')primaryAttack();
   if(k==='Digit1'&&player&&!match&&!battle)player.weapon='cross';if(k==='Digit2'&&player&&!match&&!battle)player.weapon='water';
   if(k==='KeyQ')useAbility();if(k==='KeyE')interact();if(k==='KeyG'||k==='KeyR')throwWater();if(k==='KeyF')toggleFlash();
   if(k==='Tab'){if(scene==='play')openMap();else if(scene==='map')closeMap()}
   if(k==='Escape'){if(!$('#settingsScreen').classList.contains('hidden')||!$('#helpScreen').classList.contains('hidden')||!$('#journalScreen').classList.contains('hidden')||!$('#skirmishScreen').classList.contains('hidden'))closeOverlay();else if(scene==='map')closeMap();else if(scene==='play'||scene==='paused')togglePause()}
   if(k==='KeyM'&&scene==='play')openMap();if(k==='KeyJ'&&!match&&(scene==='play'||scene==='paused')){if(scene==='play')togglePause();openOverlay('#journalScreen')}
   if(k==='Enter'&&e.altKey)toggleFullscreen();
  }
  key[k]=true;
 });
 window.addEventListener('keyup',e=>key[e.code]=false);
 window.addEventListener('blur',()=>{resetInputs();if(scene==='play'&&!match)togglePause(true)});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInputs();if(scene==='play'&&!match)togglePause(true)}});
 canvas.addEventListener('click',()=>{if(IS_TOUCH||scene!=='play')return;if(document.pointerLockElement!==canvas)canvas.requestPointerLock?.()});
 canvas.addEventListener('mousedown',e=>{
  if(IS_TOUCH||scene!=='play'||document.pointerLockElement!==canvas)return;
  if(e.button===0){mouseFire=true;primaryAttack()}
  else if(e.button===2)throwWater();
 });
 window.addEventListener('mouseup',e=>{if(e.button===0)mouseFire=false});
 document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas)mouseFire=false});
 window.addEventListener('mousemove',e=>{
  if(scene==='play'&&document.pointerLockElement===canvas){
   player.a+=e.movementX*.0028*settings.lookSensitivity;
   lookPitch=clamp(lookPitch+e.movementY*H/2600*settings.lookSensitivity*(settings.invertView?-1:1),-H*.32,H*.32)
  }
 });
 document.addEventListener('contextmenu',e=>e.preventDefault());
 syncFullscreenUI();
}

buildTextures();buildGothicTextures();createDecorArt();loadDetailArt();for(const name of Object.keys({cross:1,holyWater:1,flightWater:1,ghost:1,wraith:1,cultist:1,demon:1,priest:1,hunter:1,medic:1,guardian:1})){art[name]=$('#asset_'+name)}for(const name of ['ghost','cultist','wraith','demon'])spiritAnimations[name]=$('#anim_'+name);for(const kind of ['ghost','cultist','wraith','demon'])$('#beast_'+kind).src=$('#asset_'+kind).src;$('#bestiaryBtn').onclick=()=>{$('#menu').classList.add('hidden');$('#bestiaryScreen').classList.remove('hidden')};$('#bestiaryBack').onclick=()=>{$('#bestiaryScreen').classList.add('hidden');$('#menu').classList.remove('hidden')};resize();initInputs();requestAnimationFrame(frame);
})();