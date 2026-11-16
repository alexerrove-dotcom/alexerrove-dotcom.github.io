import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1100,height:800}});
const errors=[];page.on("pageerror",e=>errors.push(e.message));
try{
 await page.goto("http://127.0.0.1:8765/spriteforge/",{waitUntil:"domcontentloaded",timeout:20000});
 const result=await page.evaluate(()=>{
   if(!window.SpriteForgeTurnaroundV5)throw Error("Turnaround V5 was not loaded");
   const descriptor="Мужчина в коричневой куртке, синих джинсах и белых кроссовках";
   const p=window.SpriteForgeDesigner.parse(descriptor,1234);
   if(p.kind!=="human")throw Error("Human prompt was not parsed: "+p.kind);
   const colors=p.design?.wardrobe||{};
   for(const key of ["clothing","pants","shoes"]){if(!colors[key])throw Error("Missing prompt attribute: "+key)}
   const sides=["front","side","back","iso"],outs={};
   for(const view of sides){
     const c=window.SpriteForgeIllustrator.render(p,"idle",0,8,"right","painted",260,view,"right");
     const data=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
     let minX=999,maxX=-1,midMin=999,midMax=-1;
     for(let y=0;y<260;y++)for(let x=0;x<260;x++){
       const alpha=data[(y*260+x)*4+3];
       if(alpha>90){minX=Math.min(minX,x);maxX=Math.max(maxX,x);
         if(y>=85&&y<=140){midMin=Math.min(midMin,x);midMax=Math.max(midMax,x)}}}
     outs[view]={png:c.toDataURL("image/png"),width:maxX-minX,upperWidth:midMax-midMin};
   }
   if(new Set(sides.map(s=>outs[s].png)).size!==4)throw Error("Four viewpoints are identical");
   if(outs.side.upperWidth>=outs.front.upperWidth*.93)throw Error("Side body is not visibly narrower than front: "+JSON.stringify(sides.map(s=>[s,outs[s].upperWidth])));
   if(window.SpriteForgeTurnaroundV5.direction("front","right","right")!=="front")throw Error("Single front view not honored");
   if(window.SpriteForgeTurnaroundV5.direction("side","right","right")!=="profile")throw Error("Single profile view not honored");
   if(window.SpriteForgeTurnaroundV5.direction("front","up","all4")!=="back")throw Error("Back direction not honored in four-way sprite sheet");
   const four=["down","left","right","up"].map(d=>window.SpriteForgeIllustrator.render(p,"idle",0,8,d,"painted",128,"side","all4").toDataURL());
   if(new Set(four).size!==4)throw Error("all4 directions did not render distinct views");
   const contact=window.SpriteForgePoseV4.sample("walk",0,8);
   if(!contact.feet.left||!contact.feet.right)throw Error("Missing planted feet");
   const sheet=document.createElement("canvas");sheet.width=1040;sheet.height=260;const g=sheet.getContext("2d");g.fillStyle="#f2f4f7";g.fillRect(0,0,1040,260);
   for(let i=0;i<4;i++){const img=window.SpriteForgeIllustrator.render(p,"idle",0,8,"right","painted",260,sides[i],"right");g.drawImage(img,i*260,0)}
   return {widths:Object.fromEntries(sides.map(s=>[s,outs[s].upperWidth])),wardrobe:colors,
          sheet:sheet.toDataURL("image/png").split(",")[1]};
 });
 console.log("TURNAROUND_INFO="+JSON.stringify({upperWidths:result.widths,clothing:result.wardrobe}));
 console.log("TURNAROUND_PREVIEW_BASE64="+result.sheet);
 if(errors.length)throw Error("Browser exceptions: "+errors.join("; "));
}finally{await browser.close()}
