/* Stable gallery portraits from the originally painted character sheet.
   Decode once, crop into independent <img> elements, preserve SVG fallback on errors. */
(()=>{'use strict';
const root=document.documentElement;
const portraits=[
 ['.camp-character:nth-child(1) .camp-art > img',165,0],
 ['.camp-character:nth-child(2) .camp-art > img',0,227],
 ['.camp-character:nth-child(3) .camp-art > img',165,227]
];
function decodeBase64(path,width,height,complete){
  fetch(path,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.text()})
  .then(s=>new Promise((resolve,reject)=>{
    const i=new Image();i.onload=()=>i.naturalWidth===width&&i.naturalHeight===height?resolve(i):reject(Error('dimensions'));i.onerror=reject;i.src='data:image/webp;base64,'+s.trim()
  })).then(complete).catch(err=>console.warn('Fallback painting:',path,err.message))
}
decodeBase64('./v4/characters.webp.b64',330,454,im=>{
  const changes=[];
  for(const [selector,x,y] of portraits){
    const target=document.querySelector(selector);if(!target)continue;
    const canvas=document.createElement('canvas');canvas.width=165;canvas.height=227;
    const ctx=canvas.getContext('2d');if(!ctx)continue;
    ctx.clearRect(0,0,165,227);ctx.drawImage(im,x,y,165,227,0,0,165,227);
    changes.push([target,canvas.toDataURL('image/png')]);
  }
  if(changes.length!==3)return;
  changes.forEach(([target,url])=>{target.src=url;target.width=165;target.height=227;target.style.objectFit='contain';target.style.opacity='1'});
  root.classList.add('v5-portraits-loaded');
});
decodeBase64('./v4/hero-hires.webp.b64',340,466,im=>{
  const target=document.querySelector('.hero-art > img');if(!target)return;
  target.src=im.src;target.width=340;target.height=466;
  target.alt='Лисёнок Саша — оригинальная художественная модель из набора персонажей';
  root.classList.add('v5-hero-loaded')
});
})();