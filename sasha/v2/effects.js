/* Sasha Landing v2 — lightweight progressive enhancements */
(()=>{'use strict';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sprite=(id,cls)=>'<svg class="'+cls+'" aria-hidden="true" focusable="false"><use href="./v2/sprites.svg#'+id+'"></use></svg>';
  const world=document.querySelector('.forest-particles');
  if(world&&!reduced){
    const fireflyLocations=[[9,20,5,7,-2],[17,65,3,9,-4],[25,42,4,6,1],[37,26,3,7,-3],[44,77,4,8,-5],[51,34,5,6,2],[61,74,4,10,-3],[72,48,4,7,-6],[80,26,3,8,-2],[90,58,5,9,0],[13,85,4,8,-1],[66,19,3,11,-4],[93,11,2,8,0],[30,89,3,10,-6],[78,83,3,9,-3]];
    fireflyLocations.forEach(([x,y,size,dur,delay])=>{
      const e=document.createElement('span');e.className='firefly';
      e.style.cssText='--x:'+x+'%;--y:'+y+'%;--sz:'+size+'px;--dur:'+dur+'s;--del:'+delay+'s';
      world.appendChild(e)
    });
    const leaves=[[8,19,-2,21,-5],[22,17,-14,15,13],[37,24,-9,19,-29],[54,19,-6,18,65],[69,22,-4,20,-10],[81,16,-12,16,35],[93,27,-17,24,-24]];
    leaves.forEach(([x,size,delay,time,rotation])=>{
      const e=document.createElement('span');e.className='falling-leaf';
      e.style.cssText='--x:'+x+'%;--size:'+size+'px;--delay:'+delay+'s;--time:'+time+'s;--rotation:'+rotation+'deg';
      e.innerHTML=sprite('leaf','leaf-sprite');world.appendChild(e)
    });
  }
  if(!reduced&&'IntersectionObserver' in window){
    const els=document.querySelectorAll('.reveal');
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}});
    },{threshold:.10,rootMargin:'0px 0px -25px 0px'});
    document.body.classList.add('motion-ready');
    els.forEach(e=>observer.observe(e));
  }
  const hero=document.querySelector('.hero');
  if(hero&&!reduced){
    let queued=false;
    const update=()=>{queued=false;if(window.scrollY<innerHeight*1.6){hero.style.setProperty('--scroll',Math.min(window.scrollY,720)+'px')}};
    window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update)}},{passive:true});
    update();
  }
  // Check whether original RuStore image host loaded successfully. Leave link accessible if blocked.
  const scans=document.querySelectorAll('.shot img');
  scans.forEach(img=>{if(img.complete&&!img.naturalWidth)img.dispatchEvent(new Event('error'))});
})();
