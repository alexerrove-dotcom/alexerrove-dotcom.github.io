import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1200,height:850}});
const errors=[];page.on("pageerror",error=>errors.push(error.message));
try{
 await page.goto("http://127.0.0.1:8765/spriteforge/",{waitUntil:"domcontentloaded",timeout:16000});
 const image=await page.evaluate(()=>{
   const prompt="Мужчина в коричневой куртке-бомбере, белой футболке, синих джинсах, белых кроссовках, темные короткие волосы";
   const p=window.SpriteForgeDesigner.parse(prompt,53841);
   const views=[["up","back"],["left","side"],["right","side"],["down","front"]];
   const c=document.createElement("canvas");c.width=1024;c.height=1024;
   const g=c.getContext("2d");g.fillStyle="#f0f2f6";g.fillRect(0,0,1024,1024);
   for(let i=0;i<views.length;i++){
     const [dir,view]=views[i],sprite=window.SpriteForgeIllustrator.render(p,"idle",0,8,dir,"painted",512,view);
     g.drawImage(sprite,(i%2)*512,Math.floor(i/2)*512);
   }
   return c.toDataURL("image/png").split(",")[1];
 });
 if(errors.length)throw Error(errors.join("; "));
 console.log("SPRITE_HUMAN_TURNAROUND_BASE64="+image);
}finally{await browser.close()}
