(() => {
'use strict';

const directions=[[1,0],[0,1],[-1,0],[0,-1]];
const plans=[
 {sizes:[[5,5],[5,7],[7,5],[5,5],[7,5],[5,7],[5,5],[5,5],[5,5]],loops:2},
 {sizes:[[5,5],[7,7],[7,5],[5,7],[7,7],[7,5],[7,5],[5,7],[5,5]],loops:1},
 {sizes:[[5,5],[7,3],[7,5],[3,7],[7,5],[5,7],[7,3],[7,5],[5,5]],loops:3},
 {sizes:[[5,5],[5,7],[5,7],[7,5],[9,7],[7,5],[5,5],[7,7],[5,5]],loops:2},
 {sizes:[[5,5],[3,7],[7,5],[7,5],[5,7],[5,5],[7,5],[5,7],[5,5]],loops:2},
 {sizes:[[5,5],[5,7],[7,5],[7,7],[7,5],[7,7],[7,5],[5,7],[5,5]],loops:3}
];

function shuffled(list,random){
 const result=[...list];
 for(let i=result.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1));
  [result[i],result[j]]=[result[j],result[i]];
 }
 return result;
}

function generate(size,floor,random) {
 const tiles=Array.from({length:size},()=>Array(size).fill(1));
 const theme=(floor-1)%plans.length,plan=plans[theme];
 const axis=[4,Math.floor(size/2),size-6];
 const rooms=plan.sizes.map(([w,h],id)=>{
  const col=id%3,row=Math.floor(id/3);
  const x=axis[col],y=axis[row];
  const [width,height]=id===0||id===8?[5,5]:random()<.5?[h,w]:[w,h];
  return {id,x,y,left:x-(width>>1),right:x+(width>>1),top:y-(height>>1),bottom:y+(height>>1)};
 });
 const vault=rooms[8], start=rooms[0];
 for(const room of rooms){
  for(let y=room.top;y<=room.bottom;y++)for(let x=room.left;x<=room.right;x++)tiles[y][x]=0;
 }

 function corridor(a,b,wide){
  const dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);
  for(let x=a.x,y=a.y;x!==b.x||y!==b.y;x+=dx,y+=dy){
   tiles[y][x]=0;
   if(wide)tiles[y+Math.abs(dx)][x+Math.abs(dy)]=0;
  }
 }

 const links=[];
 for(const a of rooms){
  if(a.id===vault.id)continue;
  for(const b of rooms){
   if(b.id<=a.id||b.id===vault.id)continue;
   if(a.x===b.x||a.y===b.y){
    if(Math.abs(a.id-b.id)===1||Math.abs(a.id-b.id)===3)links.push([a,b]);
   }
  }
 }
 const groups=rooms.map(room=>room.id),unused=[];
 for(const [a,b] of shuffled(links,random)){
  if(groups[a.id]===groups[b.id]){unused.push([a,b]);continue}
  const group=groups[b.id],target=groups[a.id];
  for(let i=0;i<groups.length;i++)if(groups[i]===group)groups[i]=target;
  corridor(a,b,random()<.78||a===start);
 }
 for(const [a,b] of unused.slice(0,plan.loops))corridor(a,b,true);

 const entrance=random()<.5?rooms[5]:rooms[7];
 corridor(entrance,vault,false);
 const door={x:entrance.y===vault.y?vault.left-1:vault.x,y:entrance.x===vault.x?vault.top-1:vault.y};
 tiles[door.y][door.x]=2;
 const paths=distanceFrom(tiles,2,2);
 const publicRooms=shuffled(rooms.slice(1,-1),random);
 const exit=publicRooms.reduce((best,room)=>paths[room.y][room.x]>paths[best.y][best.x]?room:best);
 const others=publicRooms.filter(room=>room!==exit);
 const key=others.reduce((best,room)=>paths[room.y][room.x]<paths[best.y][best.x]?room:best);
 const sealRooms=others.filter(room=>room!==key);
 const nearSeal=sealRooms.reduce((best,room)=>paths[room.y][room.x]<paths[best.y][best.x]?room:best);
 const seals=[nearSeal,sealRooms.find(room=>room!==nearSeal)];
 // Give wide halls fixed landmarks for navigation, with space around every route.
 const landmarks=others.filter(room=>!seals.includes(room)&&room!==key).map((room,i)=>({
  type:['altar','confessional','wardrobe'][i%3],
  x:room.left+1,y:room.top,room:room.id
 }));
 const accents=tiles.map(row=>row.map(()=>-1));
 const styles=[0,7,2,8,5,6,1,3,7];
 for(const room of rooms){
  const material=styles[(theme+room.id)%styles.length];
  for(let y=room.top-1;y<=room.bottom+1;y++)for(let x=room.left-1;x<=room.right+1;x++){
   if(tiles[y]?.[x]===1)accents[y][x]=material;
  }
 }
 const east=tiles[start.y][start.right+1]===0;
 return {tiles,vault,door,exit,key,seals,landmarks,accents,
  spawn:{x:east?2.65:start.x+.5,y:east?start.y+.5:2.65,a:east?0:Math.PI/2}};
}

function distanceFrom(tiles,x,y){
 const dist=tiles.map(row=>row.map(()=>-1)), queue=[[x,y]];
 dist[y][x]=0;
 for(let i=0;i<queue.length;i++){
  const [cx,cy]=queue[i];
  for(const [dx,dy] of directions){
   const nx=cx+dx,ny=cy+dy;
   if(tiles[ny]?.[nx]!==0||dist[ny][nx]>=0)continue;
   dist[ny][nx]=dist[cy][cx]+1;
   queue.push([nx,ny]);
  }
 }
 return dist;
}

window.ObitelLayout={generate,distanceFrom};
})();
