import {chromium} from "playwright";
const b=await chromium.launch({headless:true,args:["--no-sandbox"]});
const p=await b.newPage({viewport:{width:1000,height:700}});
try{
 await p.goto("http://127.0.0.1:8765/spriteforge/",{waitUntil:"domcontentloaded",timeout:15000});
 const data=await p.evaluate(async()=>{
  const prompts=["Рыжий лис с зелёным шарфом и рогаткой","Серебристый робот с мечом","Зелёный дракон","Розовый кролик в плаще"];
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=512;
  const c=canvas.getContext("2d");
  c.fillStyle="#ecf0f5";c.fillRect(0,0,512,512);
  for(let n=0;n<prompts.length;n++){
    const parsed=window.SpriteForgeLocal.parse(prompts[n]);
    const cell=window.SpriteForgeIllustrator.render(parsed,"idle",0,8,"right","painted",256);
    c.drawImage(cell,(n%2)*256,Math.floor(n/2)*256);
  }
  return canvas.toDataURL("image/png").slice("data:image/png;base64,".length);
 });
 console.log("SPRITE_ART_PREVIEW_BASE64="+data);
}finally{await b.close()}
