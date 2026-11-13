(() => {
'use strict';

const pace={priest:1,hunter:1.14,medic:1.08,guardian:.8,ghost:.86,wraith:1.3,cultist:.92,demon:.72};

function pulse(timer, length, peak=.32) {
 if (!(timer>0)) return 0;
 const progress=Math.max(0,1-timer/length);
 return progress<peak ? Math.sin(progress/peak*Math.PI/2) : Math.pow(Math.max(0,1-(progress-peak)/(1-peak)),1.6);
}

const attacks={
 priest:   {duration:.34, keys:[[0,0,0,0,1],[.24,-.08,.07,-.12,.96],[.48,.20,.30,.15,1.16],[1,0,0,0,1]], light:[255,220,150]},
 hunter:   {duration:.33, keys:[[0,0,0,0,1],[.12,.16,.23,-.23,1.16],[.37,.09,.13,-.11,1.07],[.67,-.09,-.09,.10,.95],[1,0,0,0,1]], light:[255,175,95]},
 medic:    {duration:.29, keys:[[0,0,0,0,1],[.23,.17,.25,.05,1.13],[.52,.25,.30,-.16,1.04],[.8,-.04,.09,.1,1],[1,0,0,0,1]], light:[131,241,211]},
 guardian: {duration:.42, keys:[[0,0,0,0,1],[.26,-.11,.09,-.21,1],[.52,.33,.23,.31,1.32],[.74,.18,.13,.2,1.17],[1,0,0,0,1]], light:[241,221,175]},
 ghost:    {duration:.37, keys:[[0,0,0,0,1],[.23,-.05,-.03,-.12,.9],[.55,.33,.26,.12,1.28],[.72,.22,.20,.08,1.22],[1,0,0,0,1]], light:[144,224,249]},
 wraith:   {duration:.32, keys:[[0,0,0,0,1],[.20,-.16,.18,-.25,1.04],[.47,.58,.20,.37,1.17],[.70,.28,-.08,.49,1.02],[1,0,0,0,1]], light:[201,155,251]},
 cultist:  {duration:.43, keys:[[0,0,0,0,1],[.26,.08,.28,-.13,1.04],[.53,.17,.36,-.19,1.09],[.74,.30,.24,.11,1.18],[1,0,0,0,1]], light:[224,168,232]},
 demon:    {duration:.46, keys:[[0,0,0,0,1],[.27,-.12,.18,-.22,.92],[.50,.35,.28,.06,1.43],[.73,.23,.14,.13,1.22],[1,0,0,0,1]], light:[255,123,93]}
};
const abilityPose={
 priest:[.14,.28,-.16,1.15],hunter:[.19,.18,-.16,1.09],medic:[.20,.32,.25,1.12],guardian:[.09,.64,-.09,1.03],
 ghost:[.16,.32,-.24,1.09],wraith:[.39,.24,.28,1.18],cultist:[.02,.42,-.31,1.1],demon:[.26,.37,-.12,1.27]
};
// Monotone cubic interpolation keeps velocity continuous through intermediate poses.
function tangent(track,index,channel){
 if(index===0||index===track.length-1)return 0;
 const previous=track[index-1],point=track[index],next=track[index+1];
 const left=(point[channel]-previous[channel])/(point[0]-previous[0]);
 const right=(next[channel]-point[channel])/(next[0]-point[0]);
 return left*right>0?2*left*right/(left+right):0;
}
function sample(track, phase) {
 const end=track.findIndex(point=>point[0]>=phase);
 if(end<1)return track[0].slice(1);
 const from=track[end-1],to=track[end],duration=to[0]-from[0];
 const u=(phase-from[0])/duration, u2=u*u, u3=u2*u;
 return from.slice(1).map((value,i)=>{
  const channel=i+1,m0=tangent(track,end-1,channel)*duration,m1=tangent(track,end,channel)*duration;
  return (2*u3-3*u2+1)*value+(u3-2*u2+u)*m0+(-2*u3+3*u2)*to[channel]+(u3-u2)*m1;
 });
}

function firstPerson(ctx, role, sprite, player, time, width, height, alternate) {
 const sourceWidth=sprite?.naturalWidth||sprite?.width,sourceHeight=sprite?.naturalHeight||sprite?.height;
 if(!sourceWidth||!sourceHeight)return;
 const move=Math.min(1,(player.weaponMotion||0)/2.7);
 const step=player.walkTime*2, spec=attacks[role];
 const phase=player.crossEffect>0?Math.min(1,1-player.crossEffect/spec.duration):0;
 const [reach,lift,roll,zoom]=sample(spec.keys,Math.max(0,phase));
 const power=pulse(player.powerAnim,.62,.4);
 const [powerReach,powerLift,powerRoll,powerZoom]=abilityPose[role];
 const throwPose=pulse(player.throwAnim,.65,.42);
 const spectral=['ghost','wraith','cultist','demon'].includes(role);
 const size=Math.min(width*.57,height*(spectral ? .78 : .82));
 const spriteHeight=size*sourceHeight/sourceWidth;
 const advance=reach+power*powerReach;
 const rise=lift+power*powerLift;
 const swing=Math.sin(step)*move;
 const idle=Math.sin(time*2.25)*height*.004;
 const scale=zoom+(powerZoom-1)*power+throwPose*.06;
 const baseline=height+spriteHeight*(spectral?.25:.26);
 const draw=(side, amount)=>{
  const x=width*.5+side*(width*.34-(advance*amount+throwPose*.16)*size)+swing*size*.026;
  const y=baseline-(rise*amount+throwPose*.48)*spriteHeight+idle+Math.sin(step+side*.6)*move*height*.019;
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(side*scale,scale);
  ctx.rotate(roll*amount+power*powerRoll+throwPose*.38+swing*.025);
  if(spectral)ctx.globalAlpha=player.abilityPhase>0?.46:.94;
  ctx.drawImage(sprite,-size*.73,-spriteHeight*.87,size,spriteHeight);
  ctx.restore();
 };
 if(spectral&&(role==='ghost'||role==='demon'))draw(-1,role==='demon'?.91:.68);
 draw(1,1);
 if(role==='hunter'&&phase>0&&phase<.32){
  const intensity=(1-phase/.32)**1.4,x=width*.605,y=height*.70,r=Math.min(width,height)*.13;
  ctx.save();ctx.globalAlpha=intensity*.81;ctx.fillStyle='#f5ab64';
  ctx.beginPath();
  for(let i=0;i<12;i++){
   const angle=i*Math.PI/6,reach=i%2?r*.31:r*(i%3===0?1:.64);
   const px=x+Math.cos(angle)*reach,py=y+Math.sin(angle)*reach;
   if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.closePath();ctx.fill();ctx.globalAlpha=intensity;ctx.fillStyle='#fff2d6';
  ctx.beginPath();ctx.ellipse(x,y,r*.24,r*.13,-.4,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 const energy=phase>0?Math.max(0,1-Math.abs(phase-(role==='hunter'?.17:.5))*3):0;
 if(energy||power||alternate&&throwPose){
  const [r,g,b]=spec.light;
  const glow=ctx.createRadialGradient(width*.52,height*.65,0,width*.52,height*.65,height*.29);
  glow.addColorStop(0,`rgba(${r},${g},${b},${energy*.14+power*.13+throwPose*.09})`);
  glow.addColorStop(1,`rgba(${r},${g},${b},0)`);
  ctx.fillStyle=glow;
  ctx.fillRect(width*.52-height*.29,height*.65-height*.29,height*.58,height*.58);
 }
}

function body(role, actor, t) {
 const cadence=pace[role];
 const moving=actor.motion??actor.moving??(actor.alert&&actor.spawnGrace<=0 ? .6 : 0);
 const idle=Math.sin(t*2.4*cadence);
 const step=actor.walk*1.6*cadence;
 const attack=actor.attackAnim>0?sample(attacks[role].keys,Math.min(1,Math.max(0,1-actor.attackAnim/.45))):[0,0,0,1];
 const [reach,lift,roll,zoom]=attack;
 const power=pulse(actor.powerAnim,.62);
 const falling=actor.alive?0:Math.max(0,1-actor.deathAnim/.94);
 return {
  x:Math.sin(step)*moving*.047+reach*.24+falling*.2,
  crouch:idle*.016+Math.abs(Math.sin(step))*moving*.075+lift*.27+power*.09-falling*.65,
  width:1+(zoom-1)*.62+power*.12+falling*.16,
  lower:Math.sin(step)*moving*.10,
  lean:roll*.64+power*abilityPose[role][2]+falling*.39
 };
}

window.ObitelAnimation={ firstPerson, body, attackTime:role=>attacks[role].duration };
})();
