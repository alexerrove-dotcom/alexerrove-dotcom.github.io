(() => {
'use strict';

const $ = id => document.getElementById(id);
const version = 13;
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const validCode = value => typeof value === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(value);
const { classes, picker, renderRoster } = window.ObitelCharacters;
const cleanName = value => String(value || '').trim().slice(0, 28) || 'Заброшенное аббатство';
const roomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), n => alphabet[n % alphabet.length]).join('');
const count = (players, side) => players.filter(p => classes[p.character]?.side === side).length;

window.ObitelOnline = { create };

function create(game) {
 let mode = 'idle', peer, connection, timeout, helloTimer, room, roster = [], entries = [], self, started = false, round = 0, finished = false;
 let directoryReady = false, publicView = '';
 const guests = new Map();
 const directory = window.ObitelDirectory({
  onRooms: rooms => { entries = rooms; renderDirectory(); },
  onWire: body => peer?.receive(body),
  onWireReady: () => {
   peer?.ready();
   if (mode === 'host' && room) syncRoster();
  },
  onStatus: ready => {
   directoryReady = ready;
   if (mode === 'host' && room) {
    if (!ready) directory.advertise(null);
    if (!started) showWaiting();
   }
   $('lobbyConnection').textContent = ready ? 'Публичные комнаты обновляются автоматически.' : 'Служба комнат недоступна. Переподключаемся…';
  }
 });
 const status = text => { $('netStatus').textContent = text; };
 const send = (link, data) => { if (link?.open) { try { link.send(data); } catch {} } };
 const broadcast = data => peer?.broadcast(data);
 function reset() {
  const oldPeer = peer;
  mode = 'idle'; peer = null; connection = null; room = null; self = null; roster = []; started = false; round = 0; finished = false;
  clearTimeout(timeout);
  timeout = null;
  clearInterval(helloTimer);
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
  selection.render();
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
 function renderDirectory() {
  const side = selection.side, box = $('lobbyList');
  const fingerprint = JSON.stringify([side, mode, entries]);
  if (publicView === fingerprint) return;
  publicView = fingerprint;
  box.replaceChildren();
  for (const entry of entries) {
   const row = document.createElement('div'), info = document.createElement('div');
   const name = document.createElement('b'), details = document.createElement('small'), join = document.createElement('button');
   row.className = 'lobbyRoom'; info.className = 'lobbyRoomInfo'; join.className = 'lobbyJoin';
   name.textContent = entry.name;
   details.textContent = 'Охотники ' + entry.hunt + '/4 · Духи ' + entry.spirit + '/4' + (entry.running ? ' · На арене' : '');
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
  $('netStart').hidden = mode !== 'host';
  $('netStart').disabled = false;
  renderRoster($('netRoster'), roster.map(member => ({
   character:member.character,
   label:member.id === self ? 'Вы' : member.host ? 'Хозяин' : ''
  })));
  status(mode === 'host' && !directory.wireReady() ? 'Подключаем сервер для приглашений. На арену уже можно выйти.' :
   mode === 'guest' ? 'Ждём начала матча.' : 'Можно выйти на арену в одиночку.');
 }
 function advertiseRoom() {
  directory.advertise(room.public && !finished && directory.wireReady() ? {
   code:room.code, name:room.name, hunt:count(roster, 'hunt'), spirit:count(roster, 'spirit'), running:started
  } : null);
 }
 function welcome(link) {
  send(link, { type:'welcome', room, self:link.peer, roster, round, running:started });
 }
 function syncRoster(newGuest) {
  roster = [roster[0], ...[...guests.values()].filter(g => g.player).map(g => g.player)];
  if (newGuest) welcome(newGuest);
  broadcast({ type:'roster', roster });
  advertiseRoom();
  if (!started) showWaiting();
 }
 function waitForPeer(text, onTimeout) {
  $('netHost').disabled = true;
  $('netJoin').disabled = true;
  renderDirectory();
  status(text);
  timeout = setTimeout(onTimeout, 26000);
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
    if (started && message.type === 'input' && message.round === round) game.input(link.peer, message);
    if (message.type === 'hello') welcome(link);
    return;
   }
   if (message.type !== 'hello') return;
   const character = Object.hasOwn(classes, message.character) && classes[message.character];
   const denial = message.version !== version || !character ? 'Обновите страницу: версии игры несовместимы.' :
    finished || (started && !room.public) ? 'Комната закрыта для входа. Попробуйте в следующем раунде.' :
    count(roster, character.side) >= 4 ? 'Команда заполнена. Выберите другую сторону.' : '';
   if (denial) {
    send(link, { type:'deny', message:denial });
    setTimeout(() => { removeGuest(link.peer); link.close(); }, 350);
    return;
   }
   clearTimeout(guest.timeout);
   guest.player = { id:link.peer, character:message.character, host:false };
   if (started) game.add(guest.player);
   syncRoster(link);
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
  if (!window.crypto?.subtle) { fail('Откройте игру по HTTPS для сетевого режима.'); return; }
  const code = roomCode(), character = selection.character, isPublic = $('lobbyPublic').checked;
  const name = cleanName($('lobbyName').value);
  self = 'host';
  room = { code, name, public:isPublic };
  roster = [{ id:self, character, host:true }];
  showWaiting();
  waitForPeer('Комната создана. Подключаем сервер для приглашений…', () => {
   if (!started) status('Сервер пока недоступен. Комната подключится автоматически, когда восстановится связь.');
  });
  const instance = makePeer(code);
  if (!instance) return;
  instance.on('connection', acceptGuest);
  instance.on('open', () => {
   if (peer !== instance) return;
   clearTimeout(timeout);
   timeout = null;
   syncRoster();
  });
 }
 function joinRoom() {
  if (mode !== 'idle') return;
  const code = $('netCode').value.trim().toUpperCase(), character = selection.character;
  if (!validCode(code)) { status('Введите шестизначный код комнаты.'); return; }
  mode = 'guest';
  waitForPeer('Ищем комнату ' + code + '…', () => fail(directory.wireReady() ?
   'Комната не отвечает. Проверьте код и открыт ли браузер хозяина.' :
   'Сервер комнат пока недоступен. Повторите попытку после подключения.'));
  const instance = makePeer(code);
  if (!instance) return;
  instance.on('open', () => {
   if (peer !== instance) return;
   const link = instance.connect();
   connection = link;
   link.on('open', () => {
    const hello = () => send(link, { type:'hello', character, version });
    hello();
    helloTimer = setInterval(hello, 1200);
   });
   link.on('data', message => {
    if (connection !== link || !message) return;
    if (message.type === 'deny') { fail(message.message); return; }
    if (message.type === 'welcome') {
     room = message.room;
     self = message.self;
     roster = message.roster;
     if (!message.running && !started && message.round>=round) { round=message.round; finished=round>0; }
     if (!message.running && !started) {
      clearTimeout(timeout);
      timeout = null;
      clearInterval(helloTimer);
      showWaiting();
     }
    }
    if (message.type === 'roster' && room) {
     roster = message.roster;
     if (!started && timeout === null) showWaiting();
    }
    if ((message.type === 'start' || message.type === 'state') && room && message.round >= round) {
     if (!started || message.round > round) {
      if (!message.players.some(actor => actor.id === self) || message.round === round && finished) return;
      clearTimeout(timeout);
      timeout = null;
      clearInterval(helloTimer);
      round = message.round;
      started = true;
      finished = false;
      game.start(message, self, false);
     }
     if (message.type === 'state') game.state(message);
    }
    if (message.round !== round) return;
    if (started && message.type === 'effect') game.effect(message);
    if (started && message.type === 'finish') game.finish(message);
    if (message.type === 'lobby') {
     started = false;
     finished = true;
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
 function sendMatch(data) { broadcast({ ...data, round }); }
 function startMatch() {
  if (mode !== 'host' || started) return;
  started = true;
  finished = false;
  round++;
  advertiseRoom();
  const message = { type:'start', players:roster };
  game.start(message, self, true);
  sendMatch(message);
 }
 function backToLobby() {
  if (mode !== 'host') return;
  sendMatch({ type:'lobby' });
  started = false;
  finished = false;
  syncRoster();
 }
 function roundFinished() {
  if (mode !== 'host') return;
  finished = true;
  advertiseRoom();
 }
 const selection = picker($('netHunt'), $('netSpirits'), $('netClasses'), game.portrait, renderDirectory);
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
 async function copyInvite() {
  if (!room) return;
  const url = new URL(location.href);
  url.searchParams.set('room', room.code);
  url.hash = '';
  const notice = text => {
   if (started) $('netInviteInMatch').textContent=text;
   else status(text);
  };
  try { await navigator.clipboard.writeText(url.href); notice('Ссылка скопирована'); }
  catch { notice('Код комнаты: ' + room.code); }
 }
 $('netCopy').onclick = copyInvite;
 $('netInviteInMatch').onclick = copyInvite;
 window.addEventListener('pagehide', reset);
 return { open, reset, backToLobby, roundFinished, broadcast:sendMatch, sendInput: input => send(connection, { type:'input', ...input, round }) };
}
})();
