/* Decorative art from exact painter reference sheets; fail safely when blocked */
(()=>{'use strict';
const items=[
 {path:'./v4/buttons.webp.b64',width:330,height:360,key:'--original-buttons-sheet',cls:'original-buttons-loaded',apply:paintButtons},
 {path:'./v4/props.webp.b64',width:392,height:270,key:'--original-props-sheet',cls:'original-props-loaded',apply:paintProps}
];
function load(item){
 fetch(item.path,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.text()}).then(txt=>{
 const b64=txt.trim();if(!b64.startsWith('UklGR')||b64.length<4000)throw Error('incomplete image');
 const src='data:image/webp;base64,'+b64;
 return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>i.naturalWidth===item.width&&i.naturalHeight===item.height?resolve(src):reject(Error('wrong dimensions'));i.onerror=()=>reject(Error('invalid WebP'));i.src=src});
 }).then(src=>{document.documentElement.style.setProperty(item.key,'url("'+src+'")');item.apply();document.documentElement.classList.add(item.cls)})
 .catch(err=>console.warn('Illustrated art fallback',item.path,err.message));
}
function paintButtons(){
 const buttons=[
  ['.hero-cta .button.primary','painted-gold','Скачать бесплатно в RuStore'],
  ['.hero-cta .button.outline','painted-cream','Посмотреть скриншоты игры'],
  ['#share-main','painted-share','Поделиться игрой с другом']
 ];
 for(const [selector,cls,label] of buttons){const b=document.querySelector(selector);if(!b)continue;b.classList.add('painted-button',cls);b.setAttribute('aria-label',label)}
}
function paintProps(){
 const sprite=(parent,name,classes)=>{if(!parent)return;const d=document.createElement('span');d.className='actual-prop prop-'+name+' '+classes;d.setAttribute('aria-hidden','true');parent.appendChild(d)};
 const hero=document.querySelector('.hero');
 for(const [name,className] of [['lantern','lantern'],['mushroom','mushroom'],['butterfly','butterfly']])sprite(hero,name,'hero-corner '+className);
 sprite(document.querySelector('.story-scene'),'lantern','story-ornament');
 const feature=['map','burrow','slingshot','campfire','flower','crystal'];
 document.querySelectorAll('.feature-icon').forEach((el,i)=>sprite(el,feature[i]||'flower','feature-prop'));
 const trail=['paw','slingshot','lantern'];
 document.querySelectorAll('.trail-icon').forEach((el,i)=>sprite(el,trail[i]||'paw','trail-prop'));
}
items.forEach(load);
})();