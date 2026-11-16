/* SpriteForge V14 - art direction distilled from the two user-supplied
   hand-drawn side-view sprite sheet examples.
   This is an explicit rendering specification, NOT neural fine-tuning.
   Example qualities: crisp connected contours, readable limbs, consistent
   faces/clothes, soft painterly detail, fixed side view and feet alignment.
*/
const CHILD=/child|kid|boy|girl|schoolboy|schoolgirl|young boy|young girl|мальчик|девочка|реб[её]нок|ребенок|юный|школьник/i;
const HUMAN=/man|woman|male|female|person|boy|girl|child|human|мужчин|женщин|парень|девушк|мальчик|девочка/i;
const REFERENCE_STYLE="high-end hand-drawn 2D animated game character art, warm painterly cartoon finish, beautiful face with expressive eyes, cohesive elegant anatomy, smooth rounded silhouettes, natural fabric folds, precise ink-and-paint outlines, subtle soft shadows";
const PALETTE="harmonious natural colors, professional game art illustration, detailed yet clean";
const STYLES={
 cartoon:REFERENCE_STYLE,
 storybook:REFERENCE_STYLE+", whimsical storybook aesthetics",
 painted:"polished hand-painted 2D illustration, painterly highlights and rich but cohesive color, "+REFERENCE_STYLE,
 realistic:"photorealistic 3D-quality character concept render, believable adult proportions, lifelike skin and cloth materials, convincing facial features",
 semi:"professionally illustrated semi-realistic game character, believable anatomy, refined cloth shading, clean design",
 anime:"high-quality hand-drawn anime character art, expressive eyes, excellent cel shading, clean readable silhouette",
 chibi:"professional chibi animation character, oversized expressive head, compact lively body, polished soft outlines",
 toon3d:"high-quality stylized 3D character render, smooth studio light, detailed coherent materials, polished animated movie aesthetic",
 comic:"professional comics-style character art, controlled line weight, crisp cel shadows and expressive motion",
 vector:"premium vector-style character illustration, attractive clean contours, accurate anatomy, soft dimensional fills",
 "16bit":"coherent hand-pixeled game sprite, deliberate shapes and readable outline, limited beautiful palette",
 retro:"high-quality classic pixel game art, appealing silhouettes and intentional pixel clusters",
 cozy:"colorful painterly cozy game character with crisp silhouette",
 cute:REFERENCE_STYLE,
 dark:"high-quality dark fantasy game character art, coherent detailed costume and handsome silhouette"
};
function trimText(str,max=230){const text=String(str||"").replace(/\s+/g," ").trim();return text.length<=max?text:text.slice(0,max).replace(/\s+\S*$/,"")}
export function artDirection(description,style){
 const subject=trimText(description),isChild=CHILD.test(description),person=HUMAN.test(description);
 const proportions=isChild?"child proportions, slightly oversized appealing head, short convincing limbs":
  person?"realistic adult or young adult body proportions, natural hands and feet":
  "species-correct limbs and proportions, detailed facial features";
 return {subject,isChild,person,proportions,styleText:STYLES[style]||REFERENCE_STYLE};
}
export function characterPrompt(description,style,view="side"){
 const a=artDirection(description,style);
 const facing={side:"strictly side profile facing right",front:"full front view, facing viewer",back:"full rear view, facing away",iso:"three-quarter view",top:"seen from above"}[view]||"strictly side profile facing right";
 const positive=[
   "ONE CHARACTER ONLY, solo full-body artwork",
   a.subject,
   facing,
   a.styleText,
   a.proportions,
   PALETTE,
   "one coherent human or creature, one head, two arms and two legs if human",
   "standing upright in a neutral animation-ready pose, arms visibly separate from torso",
   "complete shoes and hands visible, comfortably centered, no cropping",
   "plain solid warm white background with no scenery"
 ].join(", ");
 const negative=[
   "two persons, pair, group, other character, duplicate, crowd, design comparison",
   "two heads, duplicate limbs, amputated or floating body parts, anatomy errors",
   "model sheet, animation sheet, character lineup, multiple angles, multiple panels",
   "framed photo, photo border, paper border, tiled picture, pasted collage, shadow rectangle",
   "text, letters, watermark, UI, props blocking feet, bad hands, low quality"
 ].join(", ");
 return positive+" ### "+negative;
}
export function animationPrompt(description,style,action){
 const a=artDirection(description,style);
 const movement={
 idle:"calm breathing, gentle secondary motion, feet planted",
 walk:"fluid walk cycle, alternating foot contacts, planted supporting foot and swinging opposite arm",
 run:"dynamic run cycle, forward lean, long alternating strides, energetic arms",
 jump:"anticipation crouch, take-off, airborne tuck, extension, landing",
 attack:"wind-up, striking action, follow-through, recovery",
 death:"stagger, collapse, fall and settle on floor"
 }[action]||"natural readable motion";
 const positive=[
  "eight sequential hand-drawn animation frames",
  a.subject, a.styleText,
  "the identical ONE hero in every frame, identical hair face outfit footwear",
  "EIGHT CELLS in FOUR COLUMNS by TWO ROWS, exactly one character inside each cell",
  "strict right-facing side profile, identical scale and ground line",
  movement,
  "clean and coherent redraw of the eight distinct guided poses",
  "plain white background throughout, clear cell separation, no overlaps"
 ].join(", ");
 const negative=[
  "different people, duplicate characters in one cell, changed clothes or haircut",
  "multiple faces, overlapping figures, fused people, character clones, collage",
  "crops, broken joints, missing feet, extra limbs, wrong view, text, watermark"
 ].join(", ");
 return positive+" ### "+negative;
}
