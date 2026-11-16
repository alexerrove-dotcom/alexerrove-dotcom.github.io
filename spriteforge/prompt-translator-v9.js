/* SpriteForge V9: on-device Russian -> English prompt translation.
   No API keys, accounts or paid services. Browser downloads public model weights.
*/
let mtPipePromise=null;
const memo=new Map();
const CYR=/[А-Яа-яЁё]/;
function fallbackGlossary(input){
  const phrases=[
   [/мужчин[а-яё]*|пар[её]н[а-яё]*|мужик[а-яё]*|man\b/gi,"man"],
   [/женщин[а-яё]*|девушк[а-яё]*|женск[а-яё]*/gi,"woman"],
   [/мальчик[а-яё]*|реб[её]нок|ребёнк[а-яё]*|ребенк[а-яё]*/gi,"boy"],
   [/девочк[а-яё]*/gi,"girl"],
   [/лет\s*(\d{1,3})/gi,"$1 years old"],
   [/(\d{1,3})\s*(?:лет|года?|years?)/gi,"$1 years old"],
   [/куртк[а-яё]*|бомбер[а-яё]*|ветровк[а-яё]*/gi,"bomber jacket"],
   [/джинс[а-яё]*/gi,"denim jeans"],
   [/кроссовк[а-яё]*|кед[а-яё]*/gi,"sneakers"],
   [/футболк[а-яё]*|майк[а-яё]*/gi,"t-shirt"],
   [/рубашк[а-яё]*/gi,"shirt"],
   [/шорт[а-яё]*/gi,"shorts"],
   [/плать[а-яё]*|сарафан[а-яё]*/gi,"dress"],
   [/юбк[а-яё]*/gi,"skirt"],
   [/брюк[а-яё]*|штан[а-яё]*/gi,"trousers"],
   [/сапог[а-яё]*|ботинк[а-яё]*/gi,"boots"],
   [/шляп[а-яё]*|панам[а-яё]*|кепк[а-яё]*/gi,"hat"],
   [/пальто|плащ[а-яё]*/gi,"coat"],
   [/рыж[а-яё]*/gi,"ginger red-haired"],[/коричнев[а-яё]*/gi,"brown"],[/син[а-яё]*/gi,"blue"],
   [/голуб[а-яё]*/gi,"light blue"],[/зелен[а-яё]*|зелён[а-яё]*/gi,"green"],
   [/красн[а-яё]*/gi,"red"],[/черн[а-яё]*|чёрн[а-яё]*/gi,"black"],[/бел[а-яё]*/gi,"white"],
   [/сер[а-яё]*/gi,"gray"],[/бежев[а-яё]*/gi,"beige"],[/желт[а-яё]*|жёлт[а-яё]*/gi,"yellow"],
   [/волос[а-яё]*|прическ[а-яё]*|причёск[а-яё]*/gi,"hair"],
   [/коротк[а-яё]*/gi,"short"],[/длинн[а-яё]*/gi,"long"],[/т[её]мн[а-яё]*/gi,"dark"],
   [/глаз[а-яё]*/gi,"eyes"],[/улыба[а-яё]*|улыбк[а-яё]*/gi,"smiling"],
   [/бород[а-яё]*|щетин[а-яё]*/gi,"beard stubble"],
   [/рыцар[а-яё]*/gi,"knight"],[/лись?[а-яё]*|лис[а-яё]*/gi,"fox"],
   [/кот[а-яё]*|кошк[а-яё]*/gi,"cat"],[/собак[а-яё]*|пес|пёс/gi,"dog"],
   [/робот[а-яё]*/gi,"robot"],[/зомб[а-яё]*/gi,"zombie"],
   [/реалистичн[а-яё]*/gi,"photorealistic"],[/аниме/gi,"anime"],[/мультяшн[а-яё]*/gi,"cartoon"],
   [/в[ \t]+/gi," "]
  ];
  let out=input;
  for(const [re,to] of phrases)out=out.replace(re,to);
  return out.replace(/\s{2,}/g," ").trim();
}
export async function translatePrompt(raw,progress){
 const input=String(raw||"").trim();
 if(!CYR.test(input))return {text:input,method:"original"};
 if(memo.has(input))return memo.get(input);
 // Chrome built-in Translator currently targets desktop; use if it exists.
 try{
  if(typeof Translator!=="undefined"){
   const availability=await Translator.availability({sourceLanguage:"ru",targetLanguage:"en"});
   if(availability!=="unavailable"){
    progress?.("Переводим описание встроенной моделью браузера…");
    const tr=await Translator.create({sourceLanguage:"ru",targetLanguage:"en"});
    const text=await tr.translate(input);tr.destroy?.();
    if(text&&!CYR.test(text)){const result={text,method:"local-chrome"};memo.set(input,result);return result}
   }
  }
 }catch(e){console.info("Chrome Translator unavailable",e)}
 // Public open-weights model, running locally via WASM. No credentials or API usage.
 try{
  progress?.("Загружаем бесплатный переводчик русского текста (один раз)…");
  if(!mtPipePromise)mtPipePromise=(async()=>{
   const t=await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/+esm");
   const pipe=await t.pipeline("translation","Xenova/opus-mt-ru-en",{device:"wasm",dtype:"q8"});
   return pipe;
  })().catch(e=>{mtPipePromise=null;throw e});
  const pipe=await mtPipePromise;
  progress?.("Переводим все детали запроса без передачи на сервер…");
  const out=await pipe(input,{max_new_tokens:128});
  const text=out?.[0]?.translation_text||out?.[0]?.generated_text||"";
  if(text.trim()&&!CYR.test(text)){
   const result={text:text.trim(),method:"local-transformer"};
   memo.set(input,result);return result;
  }
 }catch(e){console.warn("Local Russian translation model failed",e)}
 const gloss=fallbackGlossary(input);
 const result={text:gloss,method:"glossary",warning:"Полный офлайн-перевод недоступен. Часть нестандартных русских слов модель может понять неправильно; для точного результата можно написать описание по-английски."};
 memo.set(input,result);return result;
}
