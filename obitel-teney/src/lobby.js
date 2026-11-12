/* Obitel Teney: ephemeral public matchmaking via Yjs-compatible pub/sub relays, v0.8 */
(()=>{'use strict';
const $=id=>document.getElementById(id), TOPIC='obitel-teney-public-rooms-v08', TTL=22000;
const RELAYS=['wss://signaling.yjs.dev','wss://y-webrtc-eu.fly.dev'];
let sockets=[],rooms=new Map(),lastSent=0,lastCode='',started=false;
const code=v=>/^[A-HJ-NP-Z2-9]{6}$/.test(String(v||'').toUpperCase())?String(v).toUpperCase():'';
const clean=v=>String(v||'').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,28);
const status=v=>{if($('lobbyConnection'))$('lobbyConnection').textContent=v};
const send=data=>{for(const ws of sockets){if(ws.readyState!==WebSocket.OPEN)continue;try{ws.send(JSON.stringify({type:'publish',topic:TOPIC,data}))}catch(e){}}};
const refresh=()=>send({v:8,kind:'request'});
function host(){const b=$('netBanner');return b&&b.style.display!=='none'&&/ВЫ ЭКЗОРЦИСТ/.test(b.textContent||'')&&code($('netCode')?.value)}
function sync(){
 const live=host(),current=live?code($('netCode').value):'',pub=!!$('lobbyPublic')?.checked;
 if(lastCode&&(!current||!pub||current!==lastCode))send({v:8,kind:'closed',code:lastCode});
 lastCode=live&&pub?current:'';
 if(lastCode&&Date.now()-lastSent>3800){lastSent=Date.now();const m=($('netBanner')?.textContent||'').match(/ДУХОВ:\s*(\d)\/3/);
 send({v:8,kind:'room',code:lastCode,name:clean($('lobbyName')?.value)||'Заброшенное аббатство',players:Math.min(4,1+Number(m?.[1]||0)),max:4,floor:Math.max(1,Math.min(9999,Number(($('floorStat')?.textContent||'').match(/\d+/)?.[0]||1))),ts:Date.now()});}
}
function render(){
 const box=$('lobbyList');if(!box)return;
 for(const [id,r] of rooms)if(Date.now()-r.seen>TTL)rooms.delete(id);
 box.replaceChildren();
 const active=[...rooms.values()].sort((a,b)=>(a.players>=4)-(b.players>=4)||b.seen-a.seen).slice(0,25);
 if(!active.length){const p=document.createElement('p');p.className='lobbyEmpty';p.textContent='Пока нет открытых комнат. Создайте свою или обновите список.';box.append(p)}
 for(const r of active){
  const row=document.createElement('div'),info=document.createElement('div'),name=document.createElement('b'),details=document.createElement('small'),join=document.createElement('button');
  row.className='lobbyRoom';info.className='lobbyRoomInfo';join.className='lobbyJoin';
  name.textContent=r.name;details.textContent=r.code+' · '+r.players+'/4 игроков · этаж '+r.floor;
  info.append(name,details);join.disabled=r.players>=4||lastCode===r.code;join.textContent=lastCode===r.code?'ВАША':r.players>=4?'ЗАНЯТО':'ВОЙТИ';
  join.addEventListener('click',()=>{if(!code(r.code))return;$('netCode').value=r.code;$('netJoin').click()});row.append(info,join);box.append(row);
 }
}
function receive(e){
 let packet;try{packet=JSON.parse(e.data)}catch{return}
 if(packet.type==='ping'){try{e.target.send(JSON.stringify({type:'pong'}))}catch{}return}
 if(packet.type!=='publish'||packet.topic!==TOPIC||!packet.data||packet.data.v!==8)return;
 const d=packet.data;
 if(d.kind==='request'){if(lastCode){lastSent=0;sync()}return}
 const id=code(d.code);if(!id)return;
 if(d.kind==='closed'){rooms.delete(id);render();return}
 if(d.kind!=='room'||typeof d.name!=='string'||d.max!==4||!Number.isFinite(d.players)||d.players<1||d.players>4||!Number.isFinite(d.floor)||d.floor<1||d.floor>9999)return;
 rooms.set(id,{code:id,name:clean(d.name)||'Безымянная комната',players:d.players,floor:Math.floor(d.floor),seen:Date.now()});render();
}
function socket(url){
 let ws;try{ws=new WebSocket(url)}catch{return}
 sockets.push(ws);
 ws.addEventListener('open',()=>{ws.send(JSON.stringify({type:'subscribe',topics:[TOPIC]}));status('Каталог подключён');refresh();lastSent=0;sync()});
 ws.addEventListener('message',receive);
 ws.addEventListener('error',()=>status('Каталог временно недоступен. Вход по коду остаётся доступным.'));
 ws.addEventListener('close',()=>{sockets=sockets.filter(x=>x!==ws);status(sockets.some(x=>x.readyState===1)?'Каталог подключён':'Каталог временно недоступен');if(!document.hidden)setTimeout(()=>socket(url),8500)});
}
function start(){
 if(started)return;started=true;
 for(const url of RELAYS)socket(url);
 setInterval(()=>{sync();render()},2300);
 $('lobbyRefresh')?.addEventListener('click',()=>{refresh();render();status('Обновляем публичные комнаты…')});
 for(const id of ['lobbyPublic','lobbyName'])$(id)?.addEventListener('input',()=>{lastSent=0;sync()});
 $('onlineBtn')?.addEventListener('click',()=>{render();refresh()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastSent=0;sync();refresh()}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();