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
   if(!window.SpriteForgeIllustrator?.version?.startsWith("3."))throw Error("V3 renderer missing");
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
 await page.click('[data-tab=pixel]');
 if(!(await page.locator('#pixelCanvas').isVisible()))throw Error('Pixel editor not visible');
 if(errs.length)throw Error('JS errors: '+errs.join('; '));
 console.log('PASS V3: offline reload, semantic colors, seeded variants, real top-down, 4 distinct species, ZIP, 36-frame 6-action animation bundle and editor');
}finally{await browser.close()}
