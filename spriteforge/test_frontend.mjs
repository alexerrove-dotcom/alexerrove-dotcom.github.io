import {chromium} from 'playwright';
import fs from 'node:fs/promises';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1200,height:920},acceptDownloads:true});
const errs=[];
page.on('pageerror',e=>errs.push(e.message));
try{
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:15000});
 if(!(await page.title()).includes('SpriteForge'))throw Error('Site title missing');
 if((await page.inputValue('#engine'))!=='local')throw Error('The offline engine is not the default');
 if(!await page.evaluate(()=>!!window.SpriteForgeLocal))throw Error('Local generator module not loaded');
 await page.selectOption('#facing','all4');
 await page.selectOption('#engine','local');
 await page.fill('#prompt','Рыжий лис в зелёном шарфе с рогаткой');
 await page.context().setOffline(true);
 await page.click('#generate');
 await page.waitForFunction(()=>document.querySelector('#status').classList.contains('success'),null,{timeout:22000});
 if(!(await page.locator('#dlSheet').isEnabled()))throw Error('PNG export disabled');
 if(!(await page.locator('#dlZip').isEnabled()))throw Error('ZIP export disabled');
 if(!(await page.locator('#dlAtlas').isEnabled()))throw Error('JSON export disabled');
 await page.waitForFunction(()=>{
   const c=document.querySelector('#previewCanvas'),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let n=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)n++;return n>30;
 },null,{timeout:7000});
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
 await page.click('[data-tab=pixel]');
 if(!(await page.locator('#pixelCanvas').isVisible()))throw Error('Pixel editor not visible');
 if(errs.length)throw Error('JS errors: '+errs.join('; '));
 console.log('PASS: OFFLINE local generation, Russian parsing, distinct character sprites, ZIP export and editor');
}finally{await browser.close()}
