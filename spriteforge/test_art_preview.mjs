import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1100,height:780}});
const errs=[];page.on("pageerror",e=>errs.push(e.message));
try{
await page.goto("http://127.0.0.1:8765/spriteforge/",{waitUntil:"domcontentloaded",timeout:15000});
const image=await page.evaluate(()=>{
  const tests=[
  ["Рыжий лис с зелёным шарфом и рогаткой","right","side"],
  ["Серебряный робот с мечом","right","side"],
  ["Волк-пират с повязкой и шрамом","right","side"],
  ["Белый кролик в красном плаще","down","side"],
  ["Рыцарь в сияющих доспехах с мечом","right","side"],
  ["Большой зелёный дракон с крыльями","right","side"],
  ["Оранжевая лиса с луком","right","top"],
  ["Чёрный кот с золотым плащом","right","side"],
  ["Маленький красный волшебник в шляпе","down","side"]
  ];
  const size=256,canvas=document.createElement("canvas");canvas.width=3*size;canvas.height=3*size;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#eef0f4";ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let n=0;n<tests.length;n++){
    const [prompt,direction,view]=tests[n],p=window.SpriteForgeDesigner.parse(prompt);
    const art=window.SpriteForgeIllustrator.render(p,"run",2,8,direction,"painted",size,view);
    ctx.drawImage(art,(n%3)*size,Math.floor(n/3)*size);
  }
  return canvas.toDataURL("image/png").slice("data:image/png;base64,".length);
});
if(errs.length)throw Error("Page JS errors: "+errs.join(";"));
console.log("SPRITE_ART_PREVIEW_BASE64="+image);
}finally{await browser.close()}
