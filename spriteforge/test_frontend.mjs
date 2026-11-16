import {chromium} from 'playwright';
import fs from 'node:fs/promises';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1200,height:920},acceptDownloads:true});
const errs=[];
page.on('pageerror',e=>errs.push(e.message));
try{
 await page.goto('http://127.0.0.1:8765/spriteforge/',{waitUntil:'domcontentloaded',timeout:15000});
 if(!(await page.title()).includes('SpriteForge'))throw Error('Site title missing');
 if((await page.inputValue('#engine'))!=='local')throw Error('The offline engine is not the default');
 if(!await page.evaluate(()=>!!window.SpriteForgeLocal))throw Error('Local generator module not loaded');
 await page.selectOption('#facing','all4');
 await page.selectOption('#engine','local');
 await page.fill('#prompt','Рыжий лис в зелёном шарфе с рогаткой');
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:15000});
 await page.context().setOffline(true);
 await page.reload({waitUntil:"domcontentloaded",timeout:15000});
 if((await page.inputValue("#engine"))!=="local")throw Error("Offline page reload failed");
 await page.click('#generate');
 try{await page.waitForFunction(()=>document.querySelector('#status').classList.contains('success'),null,{timeout:15000})}catch(e){throw Error('Generator failed: '+(await page.locator('#status').innerText())+' JS errors: '+errs.join('; '))}
 if(!(await page.locator('#dlSheet').isEnabled()))throw Error('PNG export disabled');
 if(!(await page.locator('#dlZip').isEnabled()))throw Error('ZIP export disabled');
 if(!(await page.locator('#dlAtlas').isEnabled()))throw Error('JSON export disabled');
 await page.waitForFunction(()=>{
   const c=document.querySelector('#previewCanvas'),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let n=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)n++;return n>30;
 },null,{timeout:7000});
 const qa=await page.evaluate(()=>{
   const d=window.SpriteForgeDesigner;
   if(!d)throw Error("V3 semantic designer not loaded");
   const fox=d.parse("Рыжий лис в зелёном шарфе с рогаткой",123);
   if(fox.kind!=="fox"||!fox.scarf||fox.scarf===fox.main)throw Error("Material colors leaked: "+JSON.stringify(fox));
   if(!window.SpriteForgeIllustrator?.version?.startsWith("6."))throw Error("Turnaround V6 renderer missing");
   if(!window.SpriteForgeFaceV4||!window.SpriteForgePoseV4)throw Error("Missing V4 anatomy rig");
   const pose=window.SpriteForgePoseV4;
   for(const name of ["walk","run"]){
     let steps=0;
     for(let i=0;i<12;i++){
       const p=pose.sample(name,i,12);
       for(const foot of [p.feet.left,p.feet.right]){
         if(foot.contact){
           steps++;
           const footHeight=p.bob+foot.y;
           if(Math.abs(footHeight-88)>.001)throw Error("Planted foot drifts vertically: "+footHeight);
         }
       }
     }
     if(steps<6)throw Error(name+" has too few stance frames");
   }
   if(pose.sample("jump",4,8).bob!==0)throw Error("Jump animation must leave vertical movement to platformer physics");
   if(Math.abs(pose.sample("attack",2,8).attackAngle-pose.sample("attack",5,8).attackAngle)<.1)throw Error("Attack has no windup or release");
   const knee=pose.solveKnee(-12,42,20,88,32,36,.8);
   if(!Number.isFinite(knee.x)||!Number.isFinite(knee.y))throw Error("IK solver returned an invalid knee");
   const human=d.parse("Мужчина в коричневой куртке-бомбере, белой футболке, синих джинсах, белых кроссовках, темные волосы",73821);
   if(human.kind!=="human")throw Error("Human reference prompt not parsed");
   if(!human.design.wardrobe.pants||!human.design.wardrobe.shoes||!human.design.wardrobe.clothing)throw Error("Human outfit colors missing: "+JSON.stringify(human.design.wardrobe));
   const humanViews=["front","profile","back"].map((v,i)=>window.SpriteForgeIllustrator.render(human,"idle",0,8,["down","right","up"][i],"painted",256,["front","side","back"][i]));
   if(new Set(humanViews.map(c=>c.toDataURL())).size!==3)throw Error("Front, profile and back are not unique geometries");
   const widths=humanViews.map(cv=>{
     const g=cv.getContext("2d"),d=g.getImageData(0,0,cv.width,cv.height).data;let lo=cv.width,hi=-1;
     for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){
       if(d[(y*cv.width+x)*4+3]>90){lo=Math.min(lo,x);hi=Math.max(hi,x)}
     }return hi-lo+1;
   });
   if(!(widths[1]<widths[0]*.94))throw Error("Human profile shoulders not narrower: "+widths.join(","));
   const ratings=window.SpriteForgeLearning;
   if(!ratings||!Array.isArray(ratings.vector(123)))throw Error("Local preference learner unavailable");
   const st=ratings.rate({kind:"human",style:"painted",seed:73821},1);
   if(st.samples<1||ratings.stats("human","painted").likes<1)throw Error("Offline learning did not save feedback");
   const seed=ratings.choose("Мужчина в коричневой куртке","painted","side");
   if(!Number.isInteger(seed))throw Error("Learner failed to choose next variant");
   const foxTop=window.SpriteForgeIllustrator.render(fox,"run",3,8,"down","painted",128,"top");
   const foxSide=window.SpriteForgeIllustrator.render(fox,"run",3,8,"right","painted",128,"side");
   if(foxTop.toDataURL()===foxSide.toDataURL())throw Error("Top-down view duplicates side view");
   const first=d.parse("Рыжий лис с шарфом",123),second=d.parse("Рыжий лис с шарфом",124);
   if(first.seed===second.seed)throw Error("Variations ignored");
   const unique=new Set();
   for(const item of ["Зелёный дракон с крыльями","Рыцарь с мечом","Белый кролик","Зомби с арбалетом"]){
     const p=d.parse(item),img=window.SpriteForgeIllustrator.render(p,"idle",0,8,"right","painted",128,"side");
     unique.add(img.toDataURL());
   }
   if(unique.size!==4)throw Error("Different species produced identical sprites");
   return {fox:fox.kind,seed:first.seed,views:"distinct",distinctSpecies:unique.size};
 });
 if(qa.distinctSpecies!==4)throw Error("V3 visual variety test failed");
 let first=await page.evaluate(()=>window.SpriteForgeLocal.parse(document.querySelector('#prompt').value).kind);
 if(first!=='fox')throw Error('Russian species parser failed: '+first);
 const z=await page.evaluate(()=>window.SpriteForgeLocal.parse('Зелёный зомби с арбалетом'));
 if(z.kind!=='zombie'||z.weapon!=='crossbow')throw Error('Other character kind or weapon parse failed: '+JSON.stringify(z));
 const downloadPromise=page.waitForEvent('download',{timeout:8000});await page.click('#dlZip');const dl=await downloadPromise;
 const bytes=await fs.readFile(await dl.path());
 if(bytes[0]!==80||bytes[1]!==75)throw Error('Export is not a ZIP archive');
 const image1=await page.evaluate(()=>document.querySelector('#previewCanvas').toDataURL('image/png'));
 await page.fill('#prompt','Серебристый робот с мечом');
 await page.click('#generate');
 await page.waitForFunction(()=>document.querySelector('#status').classList.contains('success')&&!document.querySelector('#generate').disabled,null,{timeout:20000});
 const image2=await page.evaluate(()=>document.querySelector('#previewCanvas').toDataURL('image/png'));
 if(image1===image2)throw Error('Prompts do not change character pixels');
 const packQa=await page.evaluate(async()=>{
  const data=await window.SpriteForgeLocal.generate({
    prompt:"Рыжий лис в зелёном шарфе с рогаткой",seed:1234,
    frames:6,size:64,style:"painted",view:"side",facing:"right",pack:true,action:"idle"
  });
  const json=JSON.parse(decodeURIComponent(data.atlas.split(",")[1]));
  if(data.actionCount!==6||data.totalFrames!==36)throw Error("Animation bundle size wrong");
  if(Object.keys(json.animations).length!==6||Object.keys(json.frames).length!==36)throw Error("Atlas has missing actions");
  if(json.animations.right_attack.length!==6||json.animations.right_run.length!==6)throw Error("Required sequences missing");
  const img=new Image();img.src=data.sheet;await img.decode();
  if(img.naturalWidth!==384||img.naturalHeight!==384)throw Error("Atlas grid dimensions wrong");
  if(!data.zip.startsWith("blob:"))throw Error("No standalone ZIP archive");
  URL.revokeObjectURL(data.zip);
  return {animations:Object.keys(json.animations),frames:data.totalFrames,width:img.naturalWidth,height:img.naturalHeight};
 });
 if(packQa.animations.length!==6)throw Error("Full animation pack failed");
 await page.selectOption('#facing','right');
 await page.selectOption('#size','64');
 await page.locator('#frameButtons [data-frames="6"]').click();
 await page.locator('#pack').check();
 await page.fill('#prompt','Рыжий лис с зелёным шарфом и рогаткой');
 await page.click('#generate');
 await page.waitForFunction(()=>document.querySelector('#status').classList.contains('success')&&!document.querySelector('#generate').disabled,null,{timeout:45000});
 if(!(await page.locator('#previewControls').isVisible()))throw Error("Full pack preview picker is not visible");
 const options=await page.locator('#previewAction option').count();
 if(options!==6)throw Error("Expected six action preview options, got "+options);
 await page.locator('#previewAction').selectOption('2');
 if((await page.locator('#previewAction').inputValue())!=='2')throw Error("Cannot select run animation");
 if(!(await page.locator('#feedbackPanel').isVisible()))throw Error("Local feedback buttons missing");
 await page.click('#feedbackGood');
 if(!(await page.locator('#learningStatus').innerText()).includes("оценок"))throw Error("Feedback not acknowledged");
 await page.click('[data-tab=pixel]');
 if(!(await page.locator('#pixelCanvas').isVisible()))throw Error('Pixel editor not visible');
 await page.setViewportSize({width:393,height:852});
 await page.click('[data-tab=ai]');
 await page.locator('#pack').uncheck();
 await page.fill('#prompt','Белый кролик в красном шарфе');
 await page.click('#generate');
 await page.waitForFunction(()=>document.querySelector('#status').classList.contains('success')&&!document.querySelector('#generate').disabled,null,{timeout:25000});
 if(!(await page.locator('#previewCanvas').isVisible()))throw Error('Mobile preview invisible');
 const mobileMetrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
 if(mobileMetrics.scrollWidth>mobileMetrics.width+8)throw Error('Mobile horizontal overflow: '+JSON.stringify(mobileMetrics));
 if(errs.length)throw Error('JS errors: '+errs.join('; '));
 console.log('PASS V6: offline reload, semantic colors, seeded variants, real top-down, 4 distinct species, ZIP, 36-frame 6-action pack, action selector, mobile layout and editor');
}finally{await browser.close()}
