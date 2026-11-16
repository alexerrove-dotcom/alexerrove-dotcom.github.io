/* SpriteForge Design Parser v3 — deterministic, local, rule-based prompt extraction.
   Understands basic Russian/English descriptions; never claims LLM comprehension.
*/
(function(root){"use strict";
const SPECIES={
fox:/лис|лисиц|fox/i,wolf:/волк|волч|wolf/i,cat:/кошк|кот(?:ик|а)?\b|cat\b/i,dog:/собак|щен|пёс|пес\b|dog/i,
rabbit:/крол|зайц|зайк|rabbit|bunny/i,bear:/медвед|мишк|bear\b/i,squirrel:/белк|squirrel/i,mouse:/мыш|мышон|mouse\b/i,
frog:/лягуш|жаб|frog/i,bird:/птиц|ворон|орёл|орел|сова|попуга|bird|owl|raven/i,
dragon:/дракон|dragon/i,robot:/робот|андроид|robot/i,zombie:/зомб|zombie/i,skeleton:/скелет|skeleton/i,
slime:/слизень|слизь|slime/i,knight:/рыцар|рыцарь|knight/i,wizard:/волшеб|маг\b|колдун|wizard|mage/i,
pirate:/пират|pirate/i,ninja:/ниндзя|ninja/i,astronaut:/космонавт|astronaut/i,elf:/эльф|elf\b/i,
human:/человек|девуш|парен|мальчик|девочка|человеч|воин|солдат|human|warrior|boy|girl/i
};
const COLORS=[
["#e75b54",/красн|алый|багров|red|crimson|scarlet/i],
["#e18a43",/рыж|оранж|orange|ginger/i],
["#e7c35f",/желт|жёлт|золот|yellow|gold/i],
["#55a67f",/зел|изумруд|green|emerald/i],
["#5faad5",/голуб|небесн|лазур|cyan|azure|sky blue/i],
["#5275ba",/син|blue|navy/i],
["#9775c3",/фиолет|сирен|лилов|purple|violet/i],
["#e6a6b7",/розов|pink/i],
["#e9e7df",/бел|снежн|white|ivory/i],
["#343d4d",/чёрн|черн|black|charcoal/i],
["#a47a56",/корич|бур|brown/i],
["#9baab5",/серебр|серый|серебрист|silver|grey|gray/i],
["#c89b77",/беж|песоч|tan|beige/i]
];
const PARTS={
fur:/лис|лисиц|волк|волч|кот|кошк|собак|пёс|пес|зай|крол|медвед|белк|мыш|дракон|птиц|животн|шерст|мех|fur|fox|wolf|cat|dog|rabbit|bear|dragon|bird/i,
scarf:/шарф|платок|scarf|bandana/i,
clothing:/плащ|рубаш|куртк|кофт|свитер|жилет|костюм|плать|мант|туник|одежд|robe|jacket|shirt|dress|vest|coat|cloak|cape/i,
armor:/брон|доспех|латы|armou?r|plate/i,
hat:/шляп|шапк|капюшон|шлем|корон|hat|hood|helmet|crown/i,
boots:/ботин|сапог|обувь|boots|shoes/i,
eyes:/глаз|глаза|eyes?/i,
hair:/волос|причёск|прическ|hair/i,
wings:/крыл|wings?/i,
tail:/хвост|tail/i
};
const MOD={
striped:/полосат|полоск|stripe|striped/i,spotted:/пятнис|пятн|spot|freckle/i,
scar:/шрам|scar|battle-worn/i,patch:/заплат|patched|patchwork/i,
cape:/плащ|мант|cape|cloak/i,hood:/капюшон|hood/i,
crown:/корон|crown/i,armor:/брон|доспех|латы|armor/i,
goggles:/очки|очк|goggles|glasses/i,mask:/маск|mask/i,
horns:/рог|horn/i,bracers:/наруч|bracers|gauntlet/i,
boots:/сапог|ботин|boots/i,beard:/бород|beard/i,
fluffy:/пушист|fluffy|furry/i,rugged:/потреп|рван|worn|torn|ragged/i,
hair:/причёск|прическ|волос|hair/i,glowing:/светящ|светит|glow|luminous|neon/i,
badge:/эмблем|герб|значок|badge|emblem|crest/i,
smile:/улыб|весел|добрый|smile|happy/i,angry:/зло|сердит|ярост|angry|fierce/i,
sleepy:/сонн|устал|sleepy|tired/i,small:/малень|малыш|tiny|small|chibi/i,
giant:/огром|гигант|huge|giant/i,hero:/герой|героин|hero|adventurer|путешест/i
};
function hash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function findTerms(s,rx){return [...s.matchAll(new RegExp(rx.source,rx.flags.includes("g")?rx.flags:"g"+rx.flags))].map(m=>({index:m.index,text:m[0]}))}
function colorMentions(s){let c=[];COLORS.forEach(([color,rx],rank)=>{for(const m of findTerms(s,rx))c.push({color,index:m.index,rank,length:m.text.length})});return c}
function nearestColor(s,reference,used){
const terms=colorMentions(s);if(!terms.length)return null;
const targets=findTerms(s,reference);if(!targets.length)return null;
let best=null;
for(const target of targets)for(const term of terms){
 const delta=target.index-term.index,dist=Math.abs(delta);
 if(dist>35)continue;
 const mid=s.slice(Math.min(target.index,term.index),Math.max(target.index+target.text.length,term.index+term.length));
 const penalty=/[,.;]/.test(mid)?25:0;
 const score=dist+penalty+(delta<0?6:0)+(used.has(term.index)?1000:0);
 if(!best||score<best.score)best={term,score};
}
if(!best||best.score>47)return null;
used.add(best.term.index);return best.term.color;
}
function parse(text,seedOverride){
const s=String(text||"").trim().toLowerCase(),seed=Number.isFinite(+seedOverride)?((+seedOverride)>>>0):hash(s);
const base=root.SpriteForgeLocal.parse(text);
const f=Object.keys(SPECIES).find(k=>SPECIES[k].test(s));if(f)base.kind=f;
const used=new Set();
const wardrobe={};
for(const [name,re] of Object.entries(PARTS)){
 const color=nearestColor(s,re,used);if(color)wardrobe[name]=color;
}
const bodyColor=wardrobe.fur;
if(bodyColor)base.main=bodyColor;
if(wardrobe.scarf)base.scarf=wardrobe.scarf;
if(wardrobe.clothing)base.coat=wardrobe.clothing;
if(wardrobe.armor && !wardrobe.clothing)base.coat=wardrobe.armor;
if(!base.scarf&&PARTS.scarf.test(s))base.scarf="#d85b4b";
const flags=Object.fromEntries(Object.entries(MOD).map(([k,re])=>[k,re.test(s)]));
base.cape=base.cape||flags.cape;base.armor=base.armor||flags.armor;
base.hat=base.hat||flags.hood||flags.crown;
base.glasses=base.glasses||flags.goggles;
base.beard=base.beard||flags.beard;
base.horns=base.horns||flags.horns;
base.giant=base.giant||flags.giant;
base.small=base.small||flags.small;
base.seed=seed;
const t=seed%9,eyeType=["oval","almond","wide","confident","oval","happy","sharp","wide","oval"][t];
base.design={seed,flags,wardrobe,eyeType,bodyShape:(seed>>>5)%5,markings:flags.striped?"stripe":flags.spotted?"spots":["none","cheek","fur","none","fur","spots"][seed%6],
layer:(seed>>>8)%5,theme:(seed>>>11)%7,faceDetail:(seed>>>14)%6,boots:!!flags.boots,hood:!!flags.hood,
crown:!!flags.crown,mask:!!flags.mask,glow:!!flags.glowing,badge:!!flags.badge,
expression:flags.angry?"angry":flags.smile?"smile":flags.sleepy?"sleepy":"neutral",
coatTrim:wardrobe.clothing||wardrobe.armor?wardrobe.clothing||wardrobe.armor:base.coat,
accent:base.accent,secondary:(seed%2?"#f5cf7d":"#dcebe2")};
return base;
}
root.SpriteForgeDesigner={parse,hash,version:"3.0.0",colors:COLORS.map(([color])=>color)};
})(window);
