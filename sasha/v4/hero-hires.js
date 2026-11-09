(()=>{'use strict';
fetch('./v4/hero-hires.webp.b64',{cache:'force-cache'})
.then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.text()})
.then(t=>{
const b64=t.trim();
if(!b64.startsWith('UklGR')||b64.length<4000)throw Error('invalid original hero artwork');
const src='data:image/webp;base64,'+b64;
return new Promise((resolve,reject)=>{
 const i=new Image();
 i.onload=()=>i.naturalWidth===340&&i.naturalHeight===466?resolve(src):reject(Error('wrong dimensions'));
 i.onerror=()=>reject(Error('invalid source image'));
 i.src=src;
});
}).then(src=>{
document.documentElement.style.setProperty('--original-hero-hires','url("'+src+'")');
document.documentElement.classList.add('original-hirez-loaded');
}).catch(e=>console.warn('Hi-res hero fallback:',e.message));
})();