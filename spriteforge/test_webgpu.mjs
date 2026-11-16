import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1000,height:700}});
const errors=[];page.on("pageerror",error=>errors.push(error.message));
try{
await page.goto("http://127.0.0.1:8765/spriteforge/",{waitUntil:"domcontentloaded",timeout:15000});
const capabilities=await page.evaluate(async()=>{
  const module=await import("./webgpu/bundle.js");
  if(typeof module.createClient!=="function")throw Error("Bundled WebGPU interface unavailable");
  const client=module.createClient();
  try{
    return await Promise.race([client.detect(),new Promise((_,reject)=>setTimeout(()=>reject(Error("WebGPU worker did not answer")),25000))]);
  }finally{client.terminate()}
});
if(!capabilities||typeof capabilities.webgpu!=="boolean")throw Error("Invalid browser capabilities: "+JSON.stringify(capabilities));
if(errors.length)throw Error("Browser JS errors: "+errors.join("; "));
console.log("PASS: browser-only neural worker started, capabilities:",capabilities);
}finally{await browser.close()}
