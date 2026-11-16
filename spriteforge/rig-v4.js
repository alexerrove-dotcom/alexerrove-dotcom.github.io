/* SpriteForge Pose Rig v4 — deterministic shared skeletal animation curves.
 * Side-view character geometry is based on fixed pelvis, shoulder and hand joints.
 * Loop actions have continuous poses across their frame boundaries. One-shots use
 * eased timelines with a held end pose.
 */
(function(root){"use strict";
const PI=Math.PI,TAU=2*PI;
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=t=>Math.min(1,Math.max(0,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
function pose(action,i,n){
 const str=String(action||"idle").toLowerCase(),phase=TAU*i/n,t=n===1?0:i/(n-1);
 const run=/run|бег/i.test(str),walk=/walk|ходьб/i.test(str),motion=run||walk;
 const attack=/attack|атак|shoot|стрел|удар/i.test(str);
 const jump=/jump|прыж/i.test(str),death=/death|смерт|погиб/i.test(str);
 const fly=/fly|лет|полет|полёт/i.test(str);
 const hurt=/hurt|урон|ранен/i.test(str),cast=/cast|маг|заклин/i.test(str);
 const dig=/dig|копа/i.test(str);
 const stride=motion?Math.sin(phase)*(run?20:13):0;
 const swing=Math.sin(phase);
 const leftLift=motion?(run?13:7)*Math.max(0,-Math.cos(phase)):0;
 const rightLift=motion?(run?13:7)*Math.max(0, Math.cos(phase)):0;
 const movementBounce=motion?-(run?4.5:2.2)*Math.abs(Math.cos(phase)):0;
 const bounce=jump?-32*Math.sin(Math.PI*t):fly?-9*Math.sin(phase):
   movementBounce+(motion?0:1.2*Math.sin(phase));
 const torsoLean=run?-.035:walk?.008:attack?-.07:0;
 // Where the hand actually is. Both shoulder -> elbow -> wrist and the weapon
 // use these same coordinates. This avoids weapon separation during the strike.
 let frontHand={x:37+(motion?-swing*11:0),y:26+(motion?-Math.cos(phase)*5:0)};
 let backHand={x:-38+(motion?swing*10:0),y:28+(motion? Math.cos(phase)*5:0)};
 if(jump){frontHand={x:35,y:0};backHand={x:-37,y:-2}}
 if(fly){frontHand={x:42+Math.sin(phase)*5,y:-4};backHand={x:-43-Math.sin(phase)*5,y:-6}}
 if(cast){frontHand={x:50,y:-23+Math.sin(phase)*3};backHand={x:-40,y:-4}}
 if(dig){frontHand={x:35+Math.sin(phase)*9,y:6+Math.cos(phase)*13}}
 if(attack){
  const prep=smooth(t/.25);
  const strike=smooth((t-.25)/.38);
  const recover=smooth((t-.63)/.37);
  const x=mix(37,50,prep)-29*strike+16*recover;
  const y=mix(26,-46,prep)+58*strike-38*recover;
  frontHand={x,y};backHand={x:-36,y:24};
 }
 const bodyTilt=death?1.22*smooth(t):hurt?.14*Math.sin(t*PI*5):0;
 const deathDrop=death?29*smooth(t):0;
 const blink=(!motion&&!attack&&!jump&&Math.sin(phase)>0.92)?1:0;
 return {action:str,phase,t,run,walk,motion,attack,jump,death,fly,hurt,cast,dig,
   stride,bounce,torsoLean,bodyTilt,deathDrop,leftLift,rightLift,
   frontHand,backHand,blink,headNod:motion?Math.cos(phase)*.02:Math.sin(phase)*.02,
   scarfMotion:Math.sin(phase-.6)*.2,tailMotion:Math.sin(phase-.7)*.16};
}
root.SpriteForgeMotion={pose,version:"4.0.0"};
})(window);