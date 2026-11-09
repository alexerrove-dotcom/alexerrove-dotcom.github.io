(()=>{'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const toast=$('#toast');let timer;
function notice(message){toast.textContent=message;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),3500)}

// Menu remains keyboard accessible and closes on navigation, Escape, or outside click.
const nav=$('#site-nav'),menu=$('.menu-toggle');
function setMenu(open){nav.toggleAttribute('data-open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню')}
menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
nav.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false)});
document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))setMenu(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus()}});

const motion=$('#motion-toggle'),root=document.documentElement;
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const saved=localStorage.getItem('sasha-motion');if(saved!==null)paused=saved==='paused'}catch{}
function updateMotion(){root.classList.toggle('motion-paused',paused);motion.setAttribute('aria-pressed',String(paused));motion.textContent='Анимация: '+(paused?'выключена':'включена')}
updateMotion();motion.addEventListener('click',()=>{paused=!paused;updateMotion();try{localStorage.setItem('sasha-motion',paused?'paused':'playing')}catch{}});
if(!paused){
 const world=$('.forest-particles');
 [[9,20],[18,65],[25,42],[40,28],[53,72],[67,38],[80,26],[90,58]].forEach(([x,y],i)=>{const dot=document.createElement('span');dot.className='firefly';dot.style.cssText=`--x:${x}%;--y:${y}%;--sz:3px;--dur:${6+i%4}s;--del:-${i}s`;world.append(dot)})
}

// Always share the clean permanent URL, independent of hashes or campaign parameters.
async function share(){const url='https://alexerrove-dotcom.github.io/sasha/';const data={title:'Mr. Fox: Sasha’s Adventures',text:'Помоги лисёнку Саше найти сестру! Приключение на Android.',url};
 if(navigator.share){try{await navigator.share(data);return}catch(e){if(e.name==='AbortError')return}}
 try{await navigator.clipboard.writeText(url);notice('Ссылка скопирована — отправь её другу!')}catch{window.prompt('Скопируй ссылку на игру:',url)}
}
['#share-main','#share-footer'].forEach(s=>$(s).addEventListener('click',share));

const strip=$('#shots'),cards=$$('.shot'),previous=$('#prev-shot'),next=$('#next-shot');
function updateArrows(){previous.disabled=strip.scrollLeft<=2;next.disabled=strip.scrollLeft+strip.clientWidth>=strip.scrollWidth-2}
function scrollGallery(direction){strip.scrollBy({left:direction*(cards[0].getBoundingClientRect().width+20),behavior:paused?'instant':'smooth'})}
previous.addEventListener('click',()=>scrollGallery(-1));next.addEventListener('click',()=>scrollGallery(1));
strip.addEventListener('scroll',updateArrows,{passive:true});window.addEventListener('resize',updateArrows);updateArrows();

const dialog=$('#lightbox'),picture=$('#lightbox-image'),caption=$('#lightbox-caption');let current=0,opener=null,touchStart=null;
function show(index){current=(index+cards.length)%cards.length;const card=cards[current],img=card.querySelector('img');picture.dataset.fallback=img.src;picture.src=img.dataset.full||img.src;picture.alt=img.alt;caption.textContent=`${current+1} / ${cards.length} · ${card.dataset.name}`}
picture.addEventListener('error',()=>{if(picture.dataset.fallback&&picture.src!==picture.dataset.fallback)picture.src=picture.dataset.fallback});
function open(index){opener=document.activeElement;show(index);dialog.showModal();document.body.style.overflow='hidden';dialog.querySelector('.close').focus()}
cards.forEach((card,i)=>{card.addEventListener('click',()=>open(i));card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(i)}})});
dialog.querySelector('.close').addEventListener('click',()=>dialog.close());
dialog.querySelector('.viewer-prev').addEventListener('click',()=>show(current-1));dialog.querySelector('.viewer-next').addEventListener('click',()=>show(current+1));
dialog.addEventListener('close',()=>{document.body.style.overflow='';picture.removeAttribute('src');if(opener)opener.focus()});
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();show(current-1)}if(e.key==='ArrowRight'){e.preventDefault();show(current+1)}});
dialog.addEventListener('touchstart',e=>{touchStart=e.changedTouches[0].clientX},{passive:true});
dialog.addEventListener('touchend',e=>{if(touchStart===null)return;const delta=e.changedTouches[0].clientX-touchStart;if(Math.abs(delta)>55)show(current+(delta<0?1:-1));touchStart=null},{passive:true});
})();
