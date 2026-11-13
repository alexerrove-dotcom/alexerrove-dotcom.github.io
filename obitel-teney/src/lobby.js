/* Public directory and a separate encrypted topic for the active match. */
window.ObitelDirectory = function ({ onRooms, onStatus, onWire, onWireReady }) {
 const topic = 'obitel-teney/1-1/rooms';
 const urls = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
  'wss://broker.connectmq.com:8084/mqtt'
 ];
 const encoder = new TextEncoder(), decoder = new TextDecoder();
 const entries = new Map(), links = new Map();
 let room = null, started = false, sequence = 0, wireTopic = '', wireSubId = 1;
 const empty = new Uint8Array(0);
 const encode = value => Array.from(encoder.encode(value));
 const string = value => {
  const bytes = encode(value);
  return [bytes.length >> 8, bytes.length & 255, ...bytes];
 };
 function packet(header, body = []) {
  const length = [];
  let n = body.length;
  do {
   const next = n % 128;
   n = Math.floor(n / 128);
   length.push(next | (n ? 128 : 0));
  } while (n);
  return Uint8Array.from([header, ...length, ...body]);
 }
 function send(link, bytes) {
  if (link.ws.readyState === WebSocket.OPEN) link.ws.send(bytes);
 }
 function publish(value, link) {
  const bytes = packet(0x30, [...string(topic), ...encode(JSON.stringify(value))]);
  for (const current of link ? [link] : links.values()) {
   if (current.ready) send(current, bytes);
  }
 }
 function subscribe(link, channel, id) {
  send(link, packet(0x82, [id >> 8, id & 255, ...string(channel), 0]));
 }
 function unsubscribe(link, channel) {
  send(link, packet(0xa2, [0, 2, ...string(channel)]));
 }
 function status() {
  onStatus([...links.values()].some(link => link.ready));
 }
 function draw() {
  const now = Date.now();
  for (const [code, entry] of entries) if (entry.expires <= now) entries.delete(code);
  onRooms([...entries.values()].map(entry => entry.room).filter(Boolean)
   .sort((a, b) => a.name.localeCompare(b.name)).slice(0, 50));
 }
 function receive(link, value) {
  if (!value || typeof value !== 'object') return;
  if (value.type === 'list') {
   if (room && Date.now() - link.lastReply > 900) {
    link.lastReply = Date.now();
    publish({ type: 'room', ...room }, link);
   }
   return;
  }
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(value.code) || !Number.isSafeInteger(value.seq)) return;
  const previous = entries.get(value.code);
  if (previous && (previous.seq > value.seq || previous.seq === value.seq && !previous.room)) return;
  if (value.type === 'close') {
   if (entries.size >= 300 && !previous) return;
   entries.set(value.code, { seq: value.seq, expires: Date.now() + 26000 });
  } else if (value.type === 'room' && typeof value.name === 'string'
   && ['hunt', 'spirit'].every(side => Number.isInteger(value[side]) && value[side] >= 0 && value[side] <= 4)
   && value.hunt + value.spirit > 0) {
   if (entries.size >= 300 && !previous) return;
   const listed = { code: value.code, name: value.name.trim().slice(0, 28) || 'Аббатство', hunt: value.hunt, spirit: value.spirit };
   entries.set(value.code, { seq: value.seq, room: listed, expires: Date.now() + 20000 });
  } else return;
  draw();
 }
 function parse(link, chunk) {
  const bytes = new Uint8Array(link.pending.length + chunk.byteLength);
  bytes.set(link.pending);
  bytes.set(new Uint8Array(chunk), link.pending.length);
  let offset = 0;
  while (offset < bytes.length) {
   let end = offset + 1, length = 0, multiplier = 1, next;
   do {
    if (end === bytes.length) { link.pending = bytes.slice(offset); return; }
    next = bytes[end++];
    length += (next & 127) * multiplier;
    multiplier *= 128;
    if (length > 65536 || multiplier > 268435456) { link.ws.close(); return; }
   } while (next & 128);
   if (bytes.length < end + length) { link.pending = bytes.slice(offset); return; }
   const type = bytes[offset] >> 4;
   if (type === 2 && length === 2 && bytes[end + 1] === 0) {
    subscribe(link, topic, 1);
   } else if (type === 9 && length === 3 && bytes[end + 2] === 0) {
    const id = bytes[end] * 256 + bytes[end + 1];
    if (id === 1) {
     link.ready = true;
     status();
     publish({ type: 'list' }, link);
     if (room) publish({ type: 'room', ...room }, link);
     if (wireTopic) subscribe(link, wireTopic, wireSubId);
    } else if (id === wireSubId && wireTopic) {
     link.wireReady = true;
     onWireReady?.();
    }
   } else if (type === 3 && length >= 2 && length < 16000) {
    const topicLength = bytes[end] * 256 + bytes[end + 1];
    if (topicLength + 2 < length) {
     const channel = decoder.decode(bytes.subarray(end + 2, end + 2 + topicLength));
     const body = bytes.subarray(end + 2 + topicLength, end + length);
     if (channel === topic && body.length < 900) {
      try { receive(link, JSON.parse(decoder.decode(body))); } catch {}
     } else if (channel === wireTopic && link.wireReady) onWire?.(body);
    }
   }
   offset = end + length;
  }
  link.pending = empty;
 }
 function retry(url) { setTimeout(() => connect(url), 2000 + Math.random() * 2500); }
 function connect(url) {
  if (links.has(url)) return;
  let ws;
  try { ws = new WebSocket(url, 'mqtt'); }
  catch { status(); retry(url); return; }
  const link = { ws, ready: false, wireReady:false, pending:empty, lastReply: 0 };
  links.set(url, link);
  ws.binaryType = 'arraybuffer';
  const deadline = setTimeout(() => { if (!link.ready) ws.close(); }, 7000);
  ws.addEventListener('open', () => {
   const id = 'obitel-' + crypto.getRandomValues(new Uint32Array(2)).join('-');
   send(link, packet(0x10, [...string('MQTT'), 4, 2, 0, 30, ...string(id)]));
  });
  ws.addEventListener('message', event => parse(link, event.data));
  ws.addEventListener('close', () => {
   clearTimeout(deadline);
   links.delete(url);
   status();
   retry(url);
  });
 }
 function refresh() {
  for (const url of urls) if (!links.has(url)) connect(url);
  publish({ type: 'list' });
  draw();
 }
 return {
  start() {
   if (started) { refresh(); return; }
   started = true;
   urls.forEach(connect);
   setInterval(() => {
    for (const link of links.values()) if (link.ready) send(link, packet(0xc0));
    if (room) publish({ type: 'room', ...room });
    draw();
   }, 5500);
  },
  refresh,
  wire(channel) {
   if (channel === wireTopic) return;
   for (const link of links.values()) {
    link.wireReady = false;
    if (link.ready && wireTopic) unsubscribe(link, wireTopic);
   }
   wireTopic = channel;
   wireSubId = 3 + ((wireSubId + 1) % 65532);
   for (const link of links.values()) if (link.ready && channel) subscribe(link, channel, wireSubId);
  },
  wireReady: () => [...links.values()].some(link => link.wireReady),
  wireSend(body) {
   if (!wireTopic) return;
   const bytes = packet(0x30, [...string(wireTopic), ...body]);
   for (const link of links.values()) if (link.wireReady && link.ws.bufferedAmount < 65536) send(link, bytes);
  },
  advertise(next) {
   sequence = Math.max(Date.now(), sequence + 1);
   if (room && (!next || next.code !== room.code)) publish({ type: 'close', code: room.code, seq: sequence });
   room = next ? { ...next, seq: sequence } : null;
   if (room) publish({ type: 'room', ...room });
  }
 };
};
