(() => {
'use strict';

const $ = id => document.getElementById(id);
const version = 11;
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const validCode = value => typeof value === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(value);
const classes = {
 priest:   { side:'hunt', name:'Священник', attack:'Освящённый луч', power:'Круг очищения', speed:2.65, range:5.8, arc:.27, damage:27, interval:.52, color:'gold' },
 hunter:   { side:'hunt', name:'Охотник', attack:'Дальний выстрел', power:'Световая вспышка', speed:2.95, range:8.5, arc:.15, damage:38, interval:.92, color:'ember' },
 medic:    { side:'hunt', name:'Лекарь', attack:'Быстрые импульсы', power:'Исцеление команды', speed:2.85, range:4.4, arc:.36, damage:16, interval:.33, color:'blue' },
 guardian: { side:'hunt', name:'Страж', attack:'Взмах щитом', power:'Защитный купол', speed:2.35, range:2.5, arc:1.05, damage:36, interval:.67, sweep:true, color:'gold' },
 ghost:    { side:'spirit', name:'Монастырский дух', attack:'Холодный захват', power:'Невидимость', speed:2.85, range:2.25, arc:.64, damage:24, interval:.54, color:'blue' },
 wraith:   { side:'spirit', name:'Теневой призрак', attack:'Быстрый выпад', power:'Теневой рывок', speed:3.30, range:1.65, arc:.48, damage:21, interval:.36, color:'violet' },
 cultist:  { side:'spirit', name:'Призрачная монахиня', attack:'Проклятие на расстоянии', power:'Кража жизни', speed:2.65, range:5.5, arc:.27, damage:26, interval:.75, color:'violet' },
 demon:    { side:'spirit', name:'Полтергейст', attack:'Широкая волна', power:'Удар с отбрасыванием', speed:2.35, range:3.4, arc:.78, damage:31, interval:1, sweep:true, color:'ember' }
};
const sides = { hunt:'Охотники', spirit:'Духи' };
const cleanName = value => String(value || '').trim().slice(0, 28) || 'Заброшенное аббатство';
const roomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), n => alphabet[n % alphabet.length]).join('');
const count = (players, side) => players.filter(p => classes[p.character]?.side === side).length;

window.ObitelOnline = { classes, count, create };

function create(game) {
 let side = 'hunt', selected = { hunt:'priest', spirit:'ghost' };
 let mode = 'idle', peer, connection, timeout, room, roster = [], entries = [], self, started = false;
 let directoryReady = false, publicView = '';
 const guests = new Map();
 const directory = window.ObitelDirectory({
  onRooms: rooms => { entries = rooms; renderDirectory(); },
  onWire: body => peer?.receive(body),
  onWireReady: () => peer?.ready(),
  onStatus: ready => {
   directoryReady = ready;
   $('lobbyConnection').textContent = ready ? 'Публичные комнаты обновляются автоматически.' : 'Служба комнат недоступна. Переподключаемся…';
  }
 });
 const status = text => { $('netStatus').textContent = text; };
 const send = (link, data) => { if (link?.open) { try { link.send(data); } catch {} } };
 const broadcast = data => peer?.broadcast(data);
 function reset() {
  const oldPeer = peer;
  mode = 'idle'; peer = null; connection = null; room = null; self = null; roster = []; started = false;
  clearTimeout(timeout);
  directory.advertise(null);
  for (const guest of guests.values()) clearTimeout(guest.timeout);
  guests.clear();
  if (oldPeer) oldPeer.destroy().finally(() => { if (!peer) directory.wire(''); });
 }
 function showSetup(message = '') {
  $('netSetup').hidden = false;
  $('netWaiting').hidden = true;
  $('netClose').hidden = false;
  $('netHost').disabled = false;
  $('netJoin').disabled = false;
  renderClasses();
  renderDirectory();
  status(message);
 }
 function leave(message = '', show = true) {
  reset();
  if (show) {
   game.showLobby();
   showSetup(message);
  }
 }
 function fail(message) {
  leave(message);
 }
 function renderClasses() {
  $('netHunt').setAttribute('aria-pressed', String(side === 'hunt'));
  $('netSpirits').setAttribute('aria-pressed', String(side === 'spirit'));
  const box = $('netClasses');
  if (box.dataset.side !== side) {
   box.dataset.side = side;
   box.replaceChildren();
   for (const [id, config] of Object.entries(classes)) {
    if (config.side !== side) continue;
    const card = document.createElement('button'), image = document.createElement('img');
    const title = document.createElement('b'), attack = document.createElement('small'), power = document.createElement('span');
    card.type = 'button';
    card.className = 'netClass';
    card.dataset.character = id;
    image.src = game.portrait(id);
    image.alt = '';
    title.textContent = config.name; attack.textContent = config.attack; power.textContent = config.power;
    card.append(image, title, attack, power);
    card.onclick = () => { selected[side] = id; renderClasses(); };
    box.append(card);
   }
  }
  for (const card of box.children) card.setAttribute('aria-pressed', String(card.dataset.character === selected[side]));
 }
 function renderDirectory() {
  const box = $('lobbyList');
  const fingerprint = JSON.stringify([side, mode, entries]);
  if (publicView === fingerprint) return;
  publicView = fingerprint;
  box.replaceChildren();
  for (const entry of entries) {
   const row = document.createElement('div'), info = document.createElement('div');
   const name = document.createElement('b'), details = document.createElement('small'), join = document.createElement('button');
   row.className = 'lobbyRoom'; info.className = 'lobbyRoomInfo'; join.className = 'lobbyJoin';
   name.textContent = entry.name;
   details.textContent = 'Охотники ' + entry.hunt + '/4 · Духи ' + entry.spirit + '/4';
   join.type = 'button';
   join.disabled = mode !== 'idle' || entry[side] === 4;
   join.textContent = entry[side] === 4 ? 'Команда полна' : 'Войти';
   join.onclick = () => { $('netCode').value = entry.code; joinRoom(); };
   info.append(name, details);
   row.append(info, join);
   box.append(row);
  }
  if (!entries.length) {
   const empty = document.createElement('p');
   empty.className = 'lobbyEmpty'; empty.textContent = 'Нет открытых комнат.';
   box.append(empty);
  }
 }
 function showWaiting() {
  game.showLobby();
  $('netSetup').hidden = true;
  $('netWaiting').hidden = false;
  $('netClose').hidden = true;
  $('netRoomName').textContent = room.name;
  $('netRoomInfo').textContent = (room.public ? 'Публичная' : 'Закрытая') + ' · Код ' + room.code + ' · ' + roster.length + '/8 игроков';
  const canStart = count(roster, 'hunt') > 0 && count(roster, 'spirit') > 0;
  $('netStart').hidden = mode !== 'host';
  $('netStart').disabled = !canStart;
  for (const [key, prefix] of [['hunt', 'netHunt'], ['spirit', 'netSpirit']]) {
   const list = $(prefix + 'Roster');
   list.replaceChildren();
   const team = roster.filter(p => classes[p.character]?.side === key);
   $(prefix + 'Count').textContent = team.length + '/4';
   for (const member of team) {
    const item = document.createElement('li');
    item.textContent = classes[member.character].name + (member.id === self ? ' · Вы' : member.host ? ' · Хозяин' : '');
    list.append(item);
   }
  }
  status(mode === 'host' && !canStart ? 'Для старта нужен хотя бы один игрок в каждой команде.' :
   mode === 'guest' ? 'Ждём начала матча.' : '');
 }
 function syncRoster() {
  roster = [roster[0], ...[...guests.values()].filter(g => g.player).map(g => g.player)];
  broadcast({ type:'roster', roster });
  if (!started) {
   if (room.public) directory.advertise({ code:room.code, name:room.name, hunt:count(roster, 'hunt'), spirit:count(roster, 'spirit') });
   showWaiting();
  }
 }
 function waitForPeer(text) {
  $('netHost').disabled = true;
  $('netJoin').disabled = true;
  renderDirectory();
  status(text);
  timeout = setTimeout(() => fail('Сеть не ответила. Проверьте подключение и повторите попытку.'), 18000);
 }
 function removeGuest(id) {
  const guest = guests.get(id);
  if (!guest) return;
  clearTimeout(guest.timeout);
  guests.delete(id);
  if (guest.player) {
   if (started) game.drop(id);
   if (mode === 'host') syncRoster();
  }
 }
 function acceptGuest(link) {
  if (!room || guests.size >= 16 || guests.has(link.peer)) { link.close(); return; }
  const guest = { link, player:null, timeout:setTimeout(() => { removeGuest(link.peer); link.close(); }, 9000) };
  guests.set(link.peer, guest);
  link.on('close', () => removeGuest(link.peer));
  link.on('error', () => { removeGuest(link.peer); link.close(); });
  link.on('data', message => {
   if (!message || typeof message !== 'object' || mode !== 'host') return;
   if (guest.player) {
    if (started && message.type === 'input') game.input(link.peer, message);
    return;
   }
   if (message.type !== 'hello') return;
   const character = Object.hasOwn(classes, message.character) && classes[message.character];
   const denial = started ? 'Матч уже начался.' : message.version !== version || !character ? 'Версии игры несовместимы.' :
    count(roster, character.side) >= 4 ? 'Команда заполнена. Выберите другую сторону.' : '';
   if (denial) {
    send(link, { type:'deny', message:denial });
    setTimeout(() => { removeGuest(link.peer); link.close(); }, 350);
    return;
   }
   clearTimeout(guest.timeout);
   guest.player = { id:link.peer, character:message.character, host:false };
   send(link, { type:'welcome', room, self:link.peer });
   syncRoster();
  });
 }
 function makePeer(code) {
  if (!window.crypto?.subtle) { fail('Откройте игру по HTTPS для сетевого режима.'); return null; }
  const instance = window.ObitelRelay(mode === 'host', code, directory);
  peer = instance;
  instance.on('error', () => { if (peer === instance) fail('Не удалось открыть сетевое соединение.'); });
  return instance;
 }
 function hostRoom() {
  if (mode !== 'idle') return;
  mode = 'host';
  const code = roomCode(), character = selected[side], isPublic = $('lobbyPublic').checked;
  const name = cleanName($('lobbyName').value);
  waitForPeer('Открываем комнату…');
  const instance = makePeer(code);
  if (!instance) return;
  instance.on('connection', acceptGuest);
  instance.on('open', id => {
   if (peer !== instance) return;
   clearTimeout(timeout);
   if (!room) {
    self = id;
    room = { code, name, public:isPublic };
    roster = [{ id, character, host:true }];
   }
   if (!started) syncRoster();
  });
 }
 function joinRoom() {
  if (mode !== 'idle') return;
  const code = $('netCode').value.trim().toUpperCase(), character = selected[side];
  if (!validCode(code)) { status('Введите шестизначный код комнаты.'); return; }
  mode = 'guest';
  waitForPeer('Ищем комнату ' + code + '…');
  const instance = makePeer(code);
  if (!instance) return;
  instance.on('open', () => {
   if (peer !== instance) return;
   const link = instance.connect();
   connection = link;
   link.on('open', () => send(link, { type:'hello', character, version }));
   link.on('data', message => {
    if (connection !== link || !message) return;
    if (message.type === 'deny') { fail(message.message); return; }
    if (message.type === 'welcome') {
     room = message.room;
     self = message.self;
    }
    if (message.type === 'roster' && room) {
     clearTimeout(timeout);
     roster = message.roster;
     if (!started) showWaiting();
    }
    if (message.type === 'start' && room) {
     started = true;
     game.start(message, self, false);
    }
    if (message.type === 'state' && started) game.state(message);
    if (message.type === 'effect' && started) game.effect(message);
    if (message.type === 'finish' && started) game.finish(message);
    if (message.type === 'lobby' && room) {
     started = false;
     showWaiting();
    }
   });
   link.on('close', () => { if (connection === link) fail('Хозяин комнаты вышел или соединение потеряно.'); });
   link.on('error', () => { if (connection === link) fail('Соединение с комнатой потеряно.'); });
  });
 }
 function open() {
  const invite = new URLSearchParams(location.search).get('room')?.toUpperCase();
  if (validCode(invite) && !$('netCode').value) $('netCode').value = invite;
  game.showLobby();
  directory.start();
  showSetup();
 }
 function startMatch() {
  if (mode !== 'host' || started || !count(roster, 'hunt') || !count(roster, 'spirit')) return;
  started = true;
  directory.advertise(null);
  const message = { type:'start', players:roster };
  broadcast(message);
  game.start(message, self, true);
 }
 function backToLobby() {
  if (mode === 'host') {
   started = false;
   broadcast({ type:'lobby' });
   syncRoster();
  } else if (mode === 'guest') {
   game.showLobby();
   status('Ждём возвращения хозяина в лобби.');
  }
 }
 $('netHunt').onclick = () => { side = 'hunt'; renderClasses(); renderDirectory(); };
 $('netSpirits').onclick = () => { side = 'spirit'; renderClasses(); renderDirectory(); };
 $('netHost').onclick = hostRoom;
 $('netJoin').onclick = joinRoom;
 $('netCode').addEventListener('keydown', event => { if (event.key === 'Enter') joinRoom(); });
 $('lobbyRefresh').onclick = () => {
  directory.refresh();
  if (!directoryReady) $('lobbyConnection').textContent = 'Ждём подключения к каталогу…';
 };
 $('netStart').onclick = startMatch;
 $('netClose').onclick = () => { reset(); game.closeLobby(); };
 $('netLeave').onclick = () => leave('Вы покинули комнату.');
 $('netCopy').onclick = async () => {
  if (!room) return;
  const url = new URL(location.href);
  url.searchParams.set('room', room.code);
  url.hash = '';
  try { await navigator.clipboard.writeText(url.href); status('Ссылка скопирована.'); }
  catch { status('Код для приглашения: ' + room.code); }
 };
 window.addEventListener('pagehide', reset);
 return { open, reset, backToLobby, broadcast, sendInput: input => send(connection, { type:'input', ...input }) };
}
})();
