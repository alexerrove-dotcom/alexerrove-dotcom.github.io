import { chromium } from 'playwright';

const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const page = await browser.newPage({viewport:{width:1280,height:950}});
const failures=[];
page.on('pageerror',error=>failures.push(error.message));
try {
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:15000});
  if(!await page.title() || !(await page.title()).includes('SpriteForge'))throw Error('Site title missing');
  await page.selectOption('#engine','demo');
  await page.fill('#prompt','Рыжий лис в зелёном шарфе с рогаткой');
  await page.click('#generate');
  await page.waitForFunction(()=>document.getElementById('status').classList.contains('success'),null,{timeout:12000});
  if(!(await page.locator('#dlSheet').isEnabled()))throw Error('Sprite PNG export disabled');
  if(!(await page.locator('#dlAtlas').isEnabled()))throw Error('JSON atlas export disabled');
  if(!(await page.locator('#previewCanvas').isVisible()))throw Error('Canvas preview not visible');
  const visible=await page.evaluate(()=>{
    const c=document.querySelector('#previewCanvas');
    const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let count=0;
    for(let i=3;i<a.length;i+=4)if(a[i]>0)count++;
    return count;
  });
  if(visible<30)throw Error('Preview rendered empty: '+visible);
  await page.click('[data-tab=pixel]');
  if(!(await page.locator('#pixelCanvas').isVisible()))throw Error('Pixel editor failed to open');
  await page.locator('#pixelCanvas').click({position:{x:100,y:100}});
  if(!(await page.locator('#pixelSave').isEnabled()))throw Error('Pixel editor export disabled');
  if(failures.length)throw Error('Browser runtime error: '+failures.join('; '));
  console.log('PASS: browser demo sprite, atlas export, preview pixels, editor, no JS exceptions');
} finally {
  await browser.close();
}
