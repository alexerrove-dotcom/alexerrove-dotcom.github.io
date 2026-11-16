/* SpriteForge V4: temporal motion curves and grounded 2-bone IK.
 * Not derived from any third-party sprites. All calculations local/deterministic.
 */
(function(root){"use strict";
const TAU=2*Math.PI;
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const fract=t=>t-Math.floor(t);
function key(t,keys){if(t<=keys[0][0])return keys[0][1];for(let n=1;n<keys.length;n++){const [x,v]=keys[n],prev=keys[n-1];if(t<=x){const f=ease((t-prev[0])/(x-prev[0]));return prev[1]*(1-f)+v*f}}return keys[keys.length-1][1]}
function actionType(a){a=(a||"idle").toLowerCase();if(/run|бег/i.test(a))return"run";if(/walk|ходьб/i.test(a))return"walk";if(/jump|прыж/i.test(a))return"jump";if(/attack|атак|shoot|стрел|удар/i.test(a))return"attack";if(/cast|маг|заклин/i.test(a))return"cast";if(/hurt|урон|ранен/i.test(a))return"hurt";if(/death|смерт|погиб/i.test(a))return"death";if(/fly|полет|полёт|лети/i.test(a))return"fly";return"idle"}
function foot(phase,sign,mode,bob){
 const amp=mode==="run"?28:mode==="walk"?20:0;
 const liftMax=mode==="run"?25:mode==="walk"?15:0;
 const cycle=fract(phase/TAU+(sign===1?.5:0));
 const stance=mode==="run"?.55:.62;
 if(mode!=="run"&&mode!=="walk")return {x:sign*14,y:88-bob,lift:0,contact:true,cycle};
 if(cycle<stance){
  let u=cycle/stance;return {x:sign*11+amp*(1-2*u),y:88-bob,lift:0,contact:true,cycle};
 }
 let u=ease((cycle-stance)/(1-stance));
 return {x:sign*11+amp*(-1+2*u),y:88-bob-liftMax*Math.sin(Math.PI*u),lift:liftMax*Math.sin(Math.PI*u),contact:false,cycle};
}
function sample(action,index,total){
 const type=actionType(action),t=index/Math.max(1,total-1),phase=index*TAU/total;
 const sine=Math.sin(phase),bounce=Math.abs(sine);
 let bob=0,lean=0,torso=1,arm=0,crouch=0,squash=0,attackAngle=0,attackReach=0,hitbox=false;
 if(type==="walk"){bob=-2.6*bounce;lean=-.018;arm=12*sine}
 else if(type==="run"){bob=-4.7*bounce;lean=-.085;arm=23*sine}
 else if(type==="idle"){bob=-1.3*Math.cos(phase);torso=1+.018*Math.cos(phase);arm=1.5*Math.sin(phase)}
 else if(type==="jump"){
  crouch=key(t,[[0,14],[.16,18],[.31,-8],[.44,-17],[.62,-12],[.78,2],[.9,13],[1,0]]);
  squash=key(t,[[0,-.045],[.19,-.11],[.34,.075],[.6,.035],[.81,-.03],[.92,-.1],[1,0]]);
  lean=key(t,[[0,.03],[.25,-.06],[.65,.045],[1,0]]);
 }
 else if(type==="attack"){
  lean=key(t,[[0,0],[.22,.085],[.4,-.13],[.65,-.16],[.88,.02],[1,0]]);
  attackAngle=key(t,[[0,.1],[.25,-1.12],[.45,-1.52],[.59,.88],[.7,1.24],[.9,.12],[1,.1]]);
  attackReach=key(t,[[0,0],[.27,-8],[.5,27],[.69,31],[.9,3],[1,0]]);
  crouch=key(t,[[0,0],[.24,8],[.56,-2],[.75,5],[1,0]]);
  hitbox=t>=.46&&t<=.7;
 }
 else if(type==="cast"){
  lean=-.035;attackReach=key(t,[[0,0],[.3,9],[.6,12],[.77,20],[.9,4],[1,0]]);arm=key(t,[[0,0],[.35,-3],[.72,9],[1,0]]);
 }
 else if(type==="hurt"){lean=.12*Math.sin(t*2.4*Math.PI);bob=-3*Math.sin(t*Math.PI)}
 else if(type==="death"){lean=1.12*ease(t);bob=7*ease(t);crouch=18*ease(t)}
 else if(type==="fly"){bob=-5*Math.sin(phase);arm=7*Math.sin(phase)}
 const steps=type==="walk"||type==="run";
 const feet={
  left:foot(phase,-1,type,bob),
  right:foot(phase,1,type,bob)
 };
 if(type==="jump"){
  const tuck=key(t,[[0,0],[.2,6],[.4,28],[.59,26],[.8,9],[.93,0],[1,0]]);
  feet.left={x:-16-tuck*.17,y:88+crouch-tuck*.55,lift:tuck,contact:false};
  feet.right={x:16+tuck*.12,y:88+crouch-tuck*.55,lift:tuck,contact:false};
 }
 if(type==="attack"){
  const step=key(t,[[0,0],[.25,-7],[.6,15],[.83,5],[1,0]]);
  feet.left={x:-19-step*.28,y:88-crouch,lift:0,contact:true};
  feet.right={x:19+step,y:88-crouch,lift:0,contact:true};
 }
 if(type==="death"){
  for(const sg of [-1,1])feet[sg<0?"left":"right"]={x:sg*27,y:88,lift:0,contact:true};
 }
 return {type,t,phase,steps,bob,lean,arm,torso,crouch,squash,attackAngle,attackReach,hitbox,feet};
}
function solveKnee(hx,hy,fx,fy,upper,lower,preferredSign=1){
 const vx=fx-hx,vy=fy-hy;
 let dist=Math.hypot(vx,vy);dist=Math.max(.01,Math.min(upper+lower-.2,dist));
 const along=(upper*upper-lower*lower+dist*dist)/(2*dist);
 const height=Math.sqrt(Math.max(0,upper*upper-along*along));
 const ux=vx/Math.hypot(vx,vy),uy=vy/Math.hypot(vx,vy);
 return{x:hx+ux*along+(-uy)*height*preferredSign,y:hy+uy*along+ux*height*preferredSign};
}
root.SpriteForgePoseV4={sample,foot,solveKnee,key,actionType,version:"4.0.0"};
})(window);
