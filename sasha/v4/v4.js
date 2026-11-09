/* progressively load exact originals, while leaving existing artwork as a fallback */
(()=>{'use strict';
const chars=[
 ['.hero-art','hero'],
 ['.camp-character:nth-child(1) .camp-art','ryzhka'],
 ['.camp-character:nth-child(2) .camp-art','tikhon'],
 ['.camp-character:nth-child(3) .camp-art','lada']
];
for(const [selector,name] of chars){
 const parent=document.querySelector(selector);if(!parent)continue;
 const el=document.createElement('div');
 el.className='actual-character actual-'+name;
 el.setAttribute('aria-hidden','true');
 parent.appendChild(el);
}
fetch('./v4/characters.webp.b64',{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('sprite not found');return r.text()}).then(raw=>{
 const b64=raw.trim();
 if(!b64.startsWith('UklGR')||b64.length<3000)throw new Error('invalid sprite');
 return new Promise((resolve,reject)=>{
   const probe=new Image();
   probe.onload=()=>{if(probe.naturalWidth===330&&probe.naturalHeight===454)resolve('url("'+probe.src+'")');else reject(new Error('invalid sprite dimensions'))};
   probe.onerror=reject;
   probe.src='data:image/webp;base64,'+b64;
 })
}).then(url=>{
 document.documentElement.style.setProperty('--original-character-sheet',url);
 document.documentElement.classList.add('originals-loaded');
}).catch(err=>{console.warn('Original illustration fallback active',err.message)});
})();