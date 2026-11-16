/* SpriteForge V10 — anonymous no-account Russian-to-English prompt translation.
 * Fast server translation is optional and public (MyMemory fair use).
 * Offline glossary fallback never downloads model weights.
 */
const memo=new Map();
const CYR=/[а-яё]/i;
const RULES=[
[/\b(?:создай|сгенерируй|нарисуй|сделай|создайте|изобрази|покажи|хочу)\b/giu,""],
[/персонаж[а-яё]*|геро[яйюеем]|модел[ьа-яё]*|character/giu,"character"],
[/мужчин[а-яё]*|парн[яеью]|парень|мужик[а-яё]*|человек/giu,"man"],
[/женщин[а-яё]*|девушк[а-яё]*|девк[а-яё]*/giu,"woman"],
[/мальчик[а-яё]*|мальчишк[а-яё]*|подросток/giu,"boy"],
[/девочк[а-яё]*|девушк[а-яё]*/giu,"girl"],
[/(\d{1,3})\s*(?:лет|года?|год)\b/giu,"$1 years old"],
[/лет\s*(\d{1,3})/giu,"$1 years old"],
[/возраст[а-яё]*/giu,"age"],
[/коричнев[а-яё]*/giu,"brown"],[/бежев[а-яё]*/giu,"beige"],[/рыж[а-яё]*/giu,"ginger"],
[/т[её]мн[а-яё]*/giu,"dark"],[/светл[а-яё]*/giu,"light"],[/син[а-яё]*/giu,"blue"],
[/голуб[а-яё]*/giu,"light blue"],[/сер[а-яё]*/giu,"gray"],[/бел[а-яё]*/giu,"white"],
[/ч[её]рн[а-яё]*/giu,"black"],[/красн[а-яё]*/giu,"red"],[/зел[её]н[а-яё]*/giu,"green"],
[/желт[а-яё]*|жёлт[а-яё]*/giu,"yellow"],[/розов[а-яё]*/giu,"pink"],
[/фиолетов[а-яё]*/giu,"purple"],[/оранжев[а-яё]*/giu,"orange"],
[/куртк[а-яё]*|бомбер[а-яё]*|ветровк[а-яё]*/giu,"jacket"],
[/джинс[а-яё]*/giu,"denim jeans"],[/брюк[а-яё]*|штан[а-яё]*/giu,"pants"],
[/кроссовк[а-яё]*|кросовк[а-яё]*|кед[а-яё]*/giu,"sneakers"],
[/футболк[а-яё]*|майк[а-яё]*/giu,"t-shirt"],[/рубашк[а-яё]*/giu,"shirt"],
[/шорт[а-яё]*/giu,"shorts"],[/плать[а-яё]*/giu,"dress"],
[/юбк[а-яё]*/giu,"skirt"],[/пальто|плащ[а-яё]*/giu,"coat"],
[/свитер[а-яё]*|толстовк[а-яё]*|кофт[а-яё]*/giu,"sweater"],
[/ботинк[а-яё]*|сапог[а-яё]*/giu,"boots"],
[/шляп[а-яё]*|кепк[а-яё]*|панам[а-яё]*|шапк[а-яё]*/giu,"hat"],
[/волос[а-яё]*|прическ[а-яё]*|причёск[а-яё]*/giu,"hair"],
[/коротк[а-яё]*/giu,"short"],[/длинн[а-яё]*/giu,"long"],
[/щетин[а-яё]*/giu,"stubble"],[/бород[а-яё]*/giu,"beard"],[/ус[а-яё]*/giu,"mustache"],
[/глаз[а-яё]*/giu,"eyes"],[/улыб[а-яё]*/giu,"smiling"],
[/реалистичн[а-яё]*/giu,"realistic"],[/аниме/giu,"anime"],
[/мультяшн[а-яё]*/giu,"cartoon"],[/рыцар[а-яё]*/giu,"knight"],
[/робот[а-яё]*/giu,"robot"],[/лисиц[а-яё]*|лис[а-яё]*/giu,"fox"],
[/кошк[а-яё]*|кот[а-яё]*/giu,"cat"],[/собак[а-яё]*|п[её]с/giu,"dog"],
[/зомб[а-яё]*/giu,"zombie"],[/дракон[а-яё]*/giu,"dragon"],
[/скелет[а-яё]*/giu,"skeleton"],[/маг[а-яё]*|волшебник[а-яё]*/giu,"wizard"],
[/воин[а-яё]*|солдат[а-яё]*/giu,"warrior"],
[/кожан[а-яё]*/giu,"leather"],[/тканев[а-яё]*/giu,"fabric"],
[/одет[а-яё]*|надет[а-яё]*|носит|одежд[а-яё]*/giu,"wearing"],
[/стоящ[а-яё]*|стоит/giu,"standing"],
[/в\s+полный\s+рост|во\s+весь\s+рост/giu,"full body"],
[/вид\s+спереди/giu,"front view"],
[/вид\s+сзади/giu,"rear view"],
[/вид\s+сбоку/giu,"side view"]
];
const FILL=/^(?:в|во|на|с|со|из|и|или|по|для|до|а|это|его|её|ее|он|она|примерно|около|под|над|без|не|очень|как|будто|при|которые|который|такой|такая|такое|чтобы|что|у|лет|пару)$/i;
function glossary(input){
 let text=String(input||"").trim();
 for(const [r,v] of RULES)text=text.replace(r,v);
 text=text.split(/(\s+|[,.;:!])/u).filter(x=>!FILL.test(x.trim())).join(" ");
 return text.replace(/\s{2,}/g," ").replace(/^[,;\s]+|[,;\s]+$/g,"").trim();
}
async function fetchTranslation(input){
 if(!CYR.test(input))return null;
 if(input.length>450)return null;  // provider's 500-byte request limit
 const url="https://api.mymemory.translated.net/get?q="+encodeURIComponent(input)+"&langpair=ru%7Cen";
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7500);
 try{
  const r=await fetch(url,{signal:ctl.signal,cache:"no-store"});
  if(!r.ok)throw Error("Translation HTTP "+r.status);
  const data=await r.json();
  const text=String(data?.responseData?.translatedText||"").trim();
  if((data.responseStatus&&Number(data.responseStatus)!==200)||!text||/MYMEMORY WARNING/i.test(text)||CYR.test(text))throw Error("No valid English translation");
  return text;
 }finally{clearTimeout(timer)}
}
export async function translatePrompt(raw,progress){
 const input=String(raw||"").trim();
 if(!input)throw Error("Пустое описание.");
 if(!CYR.test(input))return{text:input,method:"original"};
 if(memo.has(input))return memo.get(input);
 progress?.("Переводим русское описание (без регистрации)");
 try{
  const english=await fetchTranslation(input);
  if(english){
   const result={text:english,method:"public-translator"};
   memo.set(input,result);
   return result;
  }
 }catch(e){console.info("Free translation unavailable; using offline rules",e)}
 const text=glossary(input);
 const result={text:text||input,method:"fast-local-glossary",warning:"Переводчик временно недоступен: применён быстрый словарь. Для сложных запросов точнее писать по-английски."};
 memo.set(input,result);
 return result;
}
export const _test={glossary};
