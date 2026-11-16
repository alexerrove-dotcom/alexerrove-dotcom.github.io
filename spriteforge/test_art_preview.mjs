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
const animImage=await page.evaluate(()=>{
  const prompt="Рыжий лис с зелёным шарфом и рогаткой",p=window.SpriteForgeDesigner.parse(prompt,1224);
  const actions=["walk","run","jump","attack"];
  const size=160,cv=document.createElement("canvas");
  cv.width=8*size;cv.height=4*size;
  const ctx=cv.getContext("2d");ctx.fillStyle="#f0f3f7";ctx.fillRect(0,0,cv.width,cv.height);
  for(let row=0;row<actions.length;row++)for(let i=0;i<8;i++){
    const sprite=window.SpriteForgeIllustrator.render(p,actions[row],i,8,"right","painted",size,"side");
    ctx.drawImage(sprite,i*size,row*size);
  }
  return cv.toDataURL("image/png").slice("data:image/png;base64,".length);
});
console.log("SPRITE_MOTION_PREVIEW_BASE64="+animImage);
}finally{await browser.close()}
