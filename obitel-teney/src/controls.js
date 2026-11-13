(() => {
'use strict';
const styles = {
 priest:   ['✠','✧','Луч','Очищение'],
 hunter:   ['⌖','✴','Выстрел','Вспышка'],
 medic:    ['✚','❖','Импульс','Лечение'],
 guardian: ['⬟','⬢','Щит','Купол'],
 ghost:    ['◉','◌','Захват','Исчезнуть'],
 wraith:   ['◈','➤','Выпад','Рывок'],
 cultist:  ['☽','✦','Проклятие','Кража жизни'],
 demon:    ['✷','◉','Волна','Отбросить']
};

function bind({root, state, settings, active, look, actions}) {
 const find=id=>root.querySelector('#'+id);
 const base=find('stick'), zone=find('moveZone'), knob=find('knob'), camera=find('lookZone');
 const pointers=new Map();
 let stick=null, view=null;
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));

 function capture(element,event) {
  event.preventDefault();
  try { element.setPointerCapture(event.pointerId); } catch {}
 }
 function updateStick(e) {
  const dx=e.clientX-stick.x, dy=e.clientY-stick.y;
  const distance=Math.hypot(dx,dy);
  const raw=Math.min(1,distance/stick.radius);
  const dead=settings.deadZone;
  const force=Math.pow(clamp((raw-dead)/(1-dead),0,1),1.18)*settings.stickSensitivity;
  const x=distance?dx/distance:0, y=distance?dy/distance:0;
  state.strafeTarget=x*force;
  state.forwardTarget=-y*force;
  knob.style.transform=`translate(${x*raw*stick.radius}px,${y*raw*stick.radius}px)`;
 }
 function stopStick() {
  stick=null;
  state.forward=state.strafe=state.forwardTarget=state.strafeTarget=0;
  knob.style.transform='';
  base.style.removeProperty('--stick-x');
  base.style.removeProperty('--stick-y');
  base.classList.remove('held');
 }
 function stopButton(id) {
  const entry=pointers.get(id);
  if(!entry)return;
  pointers.delete(id);
  entry.button.classList.remove('pressed');
  entry.release?.();
 }
 function hold(element, start, move, end) {
  element.addEventListener('pointerdown',start);
  if(move)element.addEventListener('pointermove',move);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,end);
 }
 zone.addEventListener('pointerdown',e=>{
  if(!active()||stick||e.button!==0)return;
  const bounds=base.getBoundingClientRect(), area=zone.getBoundingClientRect();
  if(!bounds.width)return;
  if(!settings.floatingStick&&(e.clientX<bounds.left||e.clientX>bounds.right||e.clientY<bounds.top||e.clientY>bounds.bottom))return;
  const x=settings.floatingStick?clamp(e.clientX,area.left+bounds.width/2,area.right-bounds.width/2):bounds.left+bounds.width/2;
  const y=settings.floatingStick?clamp(e.clientY,area.top+bounds.height/2,area.bottom-bounds.height/2):bounds.top+bounds.height/2;
  const origin=settings.floatingStick?{x:e.clientX,y:e.clientY}:{x,y};
  stick={id:e.pointerId,...origin,radius:bounds.width*.34};
  if(settings.floatingStick){
   base.style.setProperty('--stick-x',`${x-area.left}px`);
   base.style.setProperty('--stick-y',`${y-area.top}px`);
  }
  base.classList.add('held');
  capture(zone,e);
  if(!settings.floatingStick)updateStick(e);
 });
 zone.addEventListener('pointermove',e=>{if(e.pointerId===stick?.id&&active())updateStick(e)});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])zone.addEventListener(event,e=>{if(e.pointerId===stick?.id)stopStick()});

 hold(camera,e=>{
  if(!active()||view||e.button!==0)return;
  view={id:e.pointerId,x:e.clientX,y:e.clientY};
  capture(camera,e);
 },e=>{
  if(e.pointerId!==view?.id||!active())return;
  const samples=e.getCoalescedEvents?.()||[];
  for(const sample of samples.length?samples:[e]){
   look(clamp(sample.clientX-view.x,-150,150),clamp(sample.clientY-view.y,-150,150));
   view.x=sample.clientX;view.y=sample.clientY;
  }
 },e=>{if(e.pointerId===view?.id)view=null});

 for(const [id,[begin,release]] of Object.entries(actions)){
  const button=find(id);
  hold(button,e=>{
   if(!active()||button.disabled||e.button!==0||pointers.has(e.pointerId)||[...pointers.values()].some(item=>item.button===button))return;
   capture(button,e);
   pointers.set(e.pointerId,{button,release});
   button.classList.add('pressed');
   begin();
   if(settings.vibration)navigator.vibrate?.(id==='ability'?12:5);
  },null,e=>stopButton(e.pointerId));
  button.addEventListener('click',e=>{if(e.detail===0&&active()&&!button.disabled)begin(true)});
 }

 function decorate(id, icon, label, title=label) {
  const el=find(id);
  el.querySelector('.controlIcon').textContent=icon;
  el.querySelector('.controlLabel').textContent=label;
  el.title=title;
  el.setAttribute('aria-label',title);
 }
 return {
  reset(){
   for(const id of pointers.keys())stopButton(id);
   stopStick();
   view=null;
   state.fire=state.sprint=false;
  },
  theme(role, abilities, expedition) {
   const [attackIcon,powerIcon,attack,power]=styles[role];
   root.dataset.role=role;
   root.dataset.mode=expedition?'expedition':'arena';
   root.dataset.side=abilities.side;
   root.querySelector('#knob span').textContent=attackIcon;
   decorate('fire',attackIcon,expedition?'Крест':attack,expedition?'Атака крестом':abilities.attack);
   decorate('ability',powerIcon,power,abilities.power);
   find('ability').querySelector('.controlLabel').dataset.readyLabel=power;
  }
 };
}

window.ObitelControls={bind};
})();
