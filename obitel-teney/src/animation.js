(() => {
'use strict';

const poses = {
 priest:   { cloth:'#3a2229', edge:'#b58a5e', skin:'#b29b87', reach:22, spread:6, tilt:.13, pace:1 },
 hunter:   { cloth:'#30362e', edge:'#8c8062', skin:'#a99078', reach:-17, spread:8, tilt:-.10, pace:1.14 },
 medic:    { cloth:'#66564b', edge:'#b99f82', skin:'#c7aa94', reach:13, spread:16, tilt:.09, pace:1.08 },
 guardian: { cloth:'#333c43', edge:'#a8b3b6', skin:'#8b999d', reach:32, spread:4, tilt:.22, pace:.8 },
 ghost:    { cloth:'#344b5b', edge:'#9fcbe0', skin:'#b8d9e4', reach:32, spread:12, tilt:.13, pace:.86, fingers:1 },
 wraith:   { cloth:'#302745', edge:'#a886d5', skin:'#b49ccc', reach:53, spread:20, tilt:.24, pace:1.3, fingers:1.2 },
 cultist:  { cloth:'#494452', edge:'#c1acd4', skin:'#cac5cf', reach:23, spread:38, tilt:-.2, pace:.92, fingers:.97 },
 demon:    { cloth:'#48323b', edge:'#e09675', skin:'#aa737a', reach:44, spread:27, tilt:.29, pace:.72, fingers:1.14 }
};

function pulse(timer, length, peak=.32) {
 if (!(timer>0)) return 0;
 const progress=Math.max(0,1-timer/length);
 return progress<peak ? Math.sin(progress/peak*Math.PI/2) : Math.pow(Math.max(0,1-(progress-peak)/(1-peak)),1.6);
}

function firstPerson(ctx, role, player, t, width, height) {
 const style=poses[role];
 const stride=Math.min(1,(player.moveSpeed||0)/2.7);
 const step=player.walkTime*2;
 const attack=pulse(player.crossEffect,.34,.24);
 const power=pulse(player.powerAnim,.62,.4);
 const hit=pulse(player.hurt,.55);
 const scale=Math.min(height/255,width/510);
 const unit=Math.max(.4,scale);
 for (const side of [-1,1]) {
  const spectral=Boolean(style.fingers);
  const lead=role==='wraith'||role==='hunter' ? (side===1?1:.35) : 1;
  const swing=Math.sin(step+side*Math.PI*.5)*stride;
  const lift=style.reach*attack*lead+power*(role==='guardian'?63:role==='wraith'?25:47);
  const center=width*.5+side*(width*(spectral?.27:.255)-(style.spread*attack+power*26)*unit);
  const baseline=height+(13+Math.sin(t*2.15+side)*2.4+swing*5-lift+hit*18)*unit;
  ctx.save();
  ctx.translate(center,baseline);
  ctx.scale(-side*unit,unit);
  ctx.rotate(.32+style.tilt*attack+power*.19+swing*.045);
  if(spectral) {
   ctx.globalAlpha=.68+Math.sin(t*2.8+side)*.09;
   ctx.shadowColor=style.edge;
   ctx.shadowBlur=10+(attack+power)*12;
  }
  const shade=ctx.createLinearGradient(-24,-90,23,20);
  shade.addColorStop(0,style.skin);
  shade.addColorStop(.43,style.edge);
  shade.addColorStop(1,style.cloth);
  ctx.fillStyle=shade;
  ctx.beginPath();
  ctx.moveTo(-27,21);ctx.bezierCurveTo(-25,-7,-21,-31,-15,-47);
  ctx.quadraticCurveTo(-18,-67,0,-71);ctx.quadraticCurveTo(17,-70,19,-50);
  ctx.bezierCurveTo(20,-24,15,4,26,21);ctx.closePath();ctx.fill();
  if(spectral) {
   ctx.lineCap='round';
   for(let finger=0;finger<4;finger++){
    const x=-12+finger*8;
    const length=(19+Math.sin((finger+1)*.73)*16)*style.fingers;
    const curl=(1-attack)*8+power*7;
    ctx.beginPath();ctx.moveTo(x,-58);
    ctx.quadraticCurveTo(x-4+finger*2,-69-length*.65,x+finger*3+curl-7,-63-length);
    ctx.strokeStyle=style.cloth;ctx.lineWidth=7.5;ctx.stroke();
    ctx.strokeStyle=shade;ctx.lineWidth=5.4;ctx.stroke();
   }
   ctx.beginPath();ctx.moveTo(13,-61);ctx.quadraticCurveTo(25,-58,26+power*5,-73);
   ctx.strokeStyle=shade;ctx.lineWidth=6;ctx.stroke();
  } else {
   ctx.fillStyle=style.cloth;
   ctx.beginPath();ctx.moveTo(-24,18);ctx.lineTo(-18,-46);ctx.quadraticCurveTo(0,-37,20,-46);ctx.lineTo(25,18);ctx.fill();
   ctx.strokeStyle=style.edge;ctx.lineWidth=3;
   ctx.beginPath();ctx.moveTo(-18,-45);ctx.quadraticCurveTo(1,-37,20,-45);ctx.stroke();
   ctx.strokeStyle='#262023';ctx.lineWidth=1.3;
   for(let i=0;i<3;i++){
    ctx.beginPath();ctx.moveTo(-8+i*7,-66);ctx.quadraticCurveTo(-10+i*7,-57,-6+i*7,-51);ctx.stroke();
   }
  }
  ctx.restore();
 }
 return { attack, power, stride, step };
}

function body(role, actor, t) {
 const style=poses[role];
 const moving=actor.motion??actor.moving??(actor.alert&&actor.spawnGrace<=0 ? .6 : 0);
 const idle=Math.sin(t*2.4*style.pace);
 const step=actor.walk*1.6*style.pace;
 const attack=pulse(actor.attackAnim,.45);
 const power=pulse(actor.powerAnim,.62);
 const falling=actor.alive?0:Math.max(0,1-actor.deathAnim/.94);
 return {
  x:Math.sin(step)*moving*.047+attack*style.tilt*.32+falling*.2,
  crouch:idle*.016+Math.abs(Math.sin(step))*moving*.075+power*.09-falling*.65,
  width:1+attack*.18+power*.12+falling*.16,
  lower:Math.sin(step)*moving*.10,
  lean:(power-attack)*style.tilt+falling*.39
 };
}

window.ObitelAnimation={ firstPerson, body };
})();
