(() => {
'use strict';

const directions=[[1,0],[0,1],[-1,0],[0,-1]];
const plans=[
 {rooms:[[5,5],[5,3],[3,5],[5,5],[5,3]],loops:8},
 {rooms:[[7,5],[5,7],[7,5],[3,5]],loops:13},
 {rooms:[[7,3],[7,3],[3,7],[5,5],[3,7]],loops:11},
 {rooms:[[9,5],[5,5],[5,5]],loops:17},
 {rooms:[[5,7],[7,5],[5,3],[3,5],[5,5]],loops:9},
 {rooms:[[7,7],[5,5],[3,5],[5,3]],loops:14}
];

function generate(size, floor, random){
 const maze=Array.from({length:size},()=>Array(size).fill(1));
 const plan=plans[(floor-1)%plans.length];
 const choose=list=>list[Math.floor(random()*list.length)];
 const stack=[[1,1]];
 maze[1][1]=0;
 while(stack.length){
  const [x,y]=stack[stack.length-1];
  const options=directions.filter(([dx,dy])=>{
   const nx=x+dx*2,ny=y+dy*2;
   return nx>0&&ny>0&&nx<size-1&&ny<size-1&&maze[ny][nx]===1;
  });
  if(!options.length){stack.pop();continue}
  const [dx,dy]=choose(options),nx=x+dx*2,ny=y+dy*2;
  maze[y+dy][x+dx]=maze[ny][nx]=0;
  stack.push([nx,ny]);
 }
 for(let y=1;y<=4;y++)for(let x=1;x<=4;x++)maze[y][x]=0;

 // Evenly spaced rooms keep traversal varied without replacing the connecting maze.
 const anchors=[[8,8],[15,7],[23,8],[8,16],[16,16],[23,16],[8,23],[16,23],[23,23]];
 const placed=[];
 for(const [width,height] of plan.rooms){
  const options=anchors.filter(([x,y])=>placed.every(room=>Math.abs(room.x-x)>(room.width+width)/2+1||Math.abs(room.y-y)>(room.height+height)/2+1));
  if(!options.length)break;
  const [ax,ay]=choose(options);
  const x=ax+Math.floor(random()*3)-1,y=ay+Math.floor(random()*3)-1;
  placed.push({x,y,width,height});
  for(let py=y-(height>>1);py<=y+(height>>1);py++){
   for(let px=x-(width>>1);px<=x+(width>>1);px++)maze[py][px]=0;
  }
 }
 const links=[];
 for(let y=2;y<size-2;y++)for(let x=2;x<size-2;x++){
  if(maze[y][x]!==1)continue;
  const horizontal=!maze[y][x-1]&&!maze[y][x+1],vertical=!maze[y-1][x]&&!maze[y+1][x];
  if(horizontal!==vertical)links.push([x,y]);
 }
 for(let i=0;i<plan.loops&&links.length;i++){
  const [x,y]=links.splice(Math.floor(random()*links.length),1)[0];
  maze[y][x]=0;
 }
 return maze;
}

window.ObitelLayout={generate};
})();
