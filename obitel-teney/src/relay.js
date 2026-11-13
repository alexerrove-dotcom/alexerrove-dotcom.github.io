/* Application messages are encrypted before they reach the shared WebSocket relays. */
window.ObitelRelay = function (isHost, code, directory) {
 const encoder = new TextEncoder(), decoder = new TextDecoder();
 const hex = bytes => [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
 const id = isHost ? 'host' : hex(crypto.getRandomValues(new Uint8Array(18)));
 const links = new Map(), listeners = new Map();
 const duplicates = new Set(), pending = [];
 let key, dead = false, ticker, incoming = Promise.resolve(), outgoing = Promise.resolve(), opened = false;
 function events(target) {
  return {
   on(name, callback) {
    const handlers = target.get(name) || [];
    handlers.push(callback);
    target.set(name, handlers);
   }
  };
 }
 function emit(target, name, data) {
  for (const callback of target.get(name) || []) callback(data);
 }
 function wire(to, payload) {
  if (!key || !directory.wireReady()) return;
  const secret = key;
  const message = encoder.encode(JSON.stringify({ from:id, to, ...payload }));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = crypto.subtle.encrypt({ name:'AES-GCM', iv:nonce }, secret, message);
  outgoing = outgoing.then(async () => {
   if (key !== secret) return;
   const body = new Uint8Array(12 + message.length + 16);
   body.set(nonce);
   body.set(new Uint8Array(await encrypted), 12);
   directory.wireSend(body);
  }).catch(() => {});
 }
 function connection(other, isOpen) {
  const callbacks = new Map();
  const link = {
   ...events(callbacks), peer:other, open:isOpen, bufferSize:0, lastSeen:Date.now(),
   emit:(name,data)=>emit(callbacks,name,data),
   send:data=>wire(other,{ op:'data', data }),
   close() { wire(other,{ op:'leave' }); remove(other); }
  };
  links.set(other,link);
  return link;
 }
 function remove(other) {
  const link = links.get(other);
  if (!link) return;
  links.delete(other);
  link.open = false;
  link.emit('close');
 }
 function receive(message) {
  if (!message || (message.to !== id && message.to !== '*') || message.from === id) return;
  const other = message.from;
  if (isHost ? typeof other !== 'string' || !/^[a-f0-9-]{36}$/.test(other) : other !== 'host') return;
  let link = links.get(other);
  if (isHost && message.op === 'join') {
   if (!link) {
    if (links.size >= 16) return;
    link = connection(other,true);
    emit(listeners,'connection',link);
   }
   if (link.open) wire(other,{ op:'accepted' });
   return;
  }
  if (message.op === 'close' && !isHost) { remove(other); return; }
  if (!link) return;
  link.lastSeen = Date.now();
  if (message.op === 'accepted' && !isHost && !link.open) {
   link.open = true;
   link.emit('open');
  } else if (message.op === 'leave') remove(other);
  else if (message.op === 'data' && link.open && message.to === id) link.emit('data',message.data);
  else if (message.op === 'data' && link.open && !isHost && message.to === '*') link.emit('data',message.data);
 }
 function ready() {
  if (!key || opened || dead || !directory.wireReady()) return;
  opened = true;
  emit(listeners,'open',id);
 }
 function tick() {
  ready();
  if (!opened) return;
  const now = Date.now();
  for (const [other,link] of links) {
   if (now-link.lastSeen > 23000) remove(other);
   else if (!isHost && !link.open) wire(other,{ op:'join' });
  }
  if (isHost) wire('*',{ op:'keep' });
  else if (links.get('host')?.open) wire('host',{ op:'keep' });
 }
 async function initialize() {
  const hash = await crypto.subtle.digest('SHA-256',encoder.encode('obitel-1.1-relay/' + code));
  const secret = await crypto.subtle.digest('SHA-256',encoder.encode('obitel-1.1-key/' + code));
  const imported = await crypto.subtle.importKey('raw',secret,'AES-GCM',false,['encrypt','decrypt']);
  if (dead) return;
  key = imported;
  const channel = hex(hash);
  directory.wire('obitel-teney/1-1/play/' + channel);
  ticker = setInterval(tick,1500);
 }
 initialize().catch(error=>{ if(!dead)emit(listeners,'error',error); });
 return {
  ...events(listeners),
  ready,
  connect() {
   const link = connection('host',false);
   wire('host',{ op:'join' });
   return link;
  },
  broadcast(data) { wire('*',{ op:'data', data }); },
  receive(body) {
   if (!key || body.length < 31 || dead) return;
   const nonce = body.slice(0,12);
   const fingerprint = Array.from(nonce).join(',');
   if (duplicates.has(fingerprint)) return;
   duplicates.add(fingerprint);
   pending.push(fingerprint);
   if (pending.length > 512) duplicates.delete(pending.shift());
   const plain = crypto.subtle.decrypt({ name:'AES-GCM',iv:nonce },key,body.slice(12)).catch(()=>null);
   incoming = incoming.then(async () => {
    const decoded = await plain;
    if (decoded && !dead) receive(JSON.parse(decoder.decode(decoded)));
   }).catch(() => {});
  },
  destroy() {
   if (dead) return;
   if (isHost) wire('*',{ op:'close' });
   else wire('host',{ op:'leave' });
   dead = true;
   clearInterval(ticker);
   outgoing.finally(() => { key = null; });
   return outgoing;
  }
 };
};
