(() => {
  'use strict';

  const tools = [
    ['foxfx', 'FoxFX Studio', '/foxfx/'],
    ['jiggle', 'Jiggle Effect', '/photo-effect/'],
    ['crop', 'Обрезка', '/photo-effect/crop/'],
    ['resize', 'Размер', '/photo-effect/resize/'],
    ['rotate', 'Поворот', '/photo-effect/rotate/'],
    ['background', 'Удалить фон', '/photo-effect/remove-background/']
  ];
  const storageName = 'fox-photo-studio';
  const ttl = 10 * 60 * 1000;
  const params = new URLSearchParams(location.hash.slice(1));
  const incoming = params.get('photo');
  if (incoming) {
    params.delete('photo');
    history.replaceState(history.state, '', location.pathname + location.search + (params.size ? '#' + params : ''));
  }
  const canvasFile = (canvas, name) => new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob?.size) resolve(new File([blob], name, {type: 'image/png'}));
      else reject(new Error('Не удалось подготовить изображение.'));
    }, 'image/png');
  });

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(storageName, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('transfers');
        store.createIndex('expires', 'expires');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Хранилище браузера занято.'));
    });
  }

  async function transfer(record, id, destination) {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction('transfers', 'readwrite');
        const store = transaction.objectStore('transfers');
        let result;
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(transaction.error || new Error('Передача прервана.'));
        if (record) {
          const expired = store.index('expires').openKeyCursor(IDBKeyRange.upperBound(Date.now()));
          expired.onsuccess = () => {
            const cursor = expired.result;
            if (!cursor) return;
            store.delete(cursor.primaryKey);
            cursor.continue();
          };
          store.put(record, id);
        } else {
          const read = store.get(id);
          read.onsuccess = () => {
            const saved = read.result;
            if (saved?.destination !== destination) return;
            store.delete(id);
            if (saved.expires >= Date.now()) result = saved;
          };
        }
      });
    } finally {
      database.close();
    }
  }

  function mount(current) {
    const container = document.querySelector('[data-studio-nav]');
    const nav = document.createElement('nav');
    nav.className = 'studio-nav';
    nav.setAttribute('aria-label', 'Инструменты фотостудии');
    const home = document.createElement('a');
    home.className = 'studio-brand';
    home.textContent = 'FoxFX';
    home.setAttribute('aria-label', 'FoxFX Фотостудия, главная');
    home.href = '/';
    nav.append(home);
    const links = document.createElement('div');
    links.className = 'studio-links';
    for (const [id, label, url] of tools) {
      const link = document.createElement('a');
      link.textContent = label;
      link.href = url;
      if (id === current) link.setAttribute('aria-current', 'page');
      links.append(link);
    }
    nav.append(links);
    container.append(nav);
    return container;
  }

  function connect({current, fileInput, result, ready, watch = [], events = []}) {
    const container = mount(current);
    if (!fileInput) return;
    const form = document.createElement('form');
    form.className = 'studio-transfer';
    form.hidden = true;
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Следующий инструмент');
    select.add(new Option('Следующий инструмент', '', true, true));
    select.options[0].disabled = true;
    for (const [id, label] of tools) {
      if (id !== current) select.add(new Option(label, id));
    }
    const send = document.createElement('button');
    send.type = 'submit';
    send.textContent = 'Продолжить в';
    const status = document.createElement('span');
    status.className = 'studio-status';
    status.setAttribute('role', 'status');
    form.append(select, send);
    container.append(form, status);
    let busy = false;
    const update = () => {
      form.hidden = !ready();
      send.disabled = busy || !select.value;
      select.disabled = busy;
    };
    select.addEventListener('change', update);
    const observer = new MutationObserver(update);
    for (const node of watch) observer.observe(node, {attributes: true, childList: true});
    for (const event of events) window.addEventListener(event, update);
    window.addEventListener('pageshow', event => {
      if (event.persisted) { busy = false; status.textContent = ''; }
      update();
    });
    update();

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const next = tools.find(([id]) => id === select.value);
      if (!next || busy || !ready()) return;
      busy = true;
      status.textContent = 'Подготавливаем фото…';
      update();
      try {
        const file = await result();
        if (!file?.size) throw new Error('Нет изображения для передачи.');
        const id = crypto.randomUUID();
        await transfer({file, name: file.name, destination: next[0], expires: Date.now() + ttl}, id);
        location.assign(next[2] + '#photo=' + id);
      } catch {
        status.textContent = 'Не удалось передать фото. Можно скачать PNG и открыть его в нужном инструменте.';
        busy = false;
        update();
      }
    });

    if (!incoming || !/^[a-f0-9-]{36}$/i.test(incoming)) return;
    transfer(null, incoming, current).then(saved => {
      if (!saved?.file?.size) throw new Error('Фото недоступно.');
      const files = new DataTransfer();
      files.items.add(new File([saved.file], saved.name || 'foxfx-photo.png', {type: saved.file.type || 'image/png'}));
      fileInput.files = files.files;
      fileInput.dispatchEvent(new Event('change', {bubbles: true}));
      requestAnimationFrame(() => document.querySelector('#tool')?.scrollIntoView({block: 'start'}));
    }).catch(() => {
      status.textContent = 'Переданное фото недоступно. Выберите файл, чтобы продолжить.';
    });
  }

  window.FoxStudio = {mount, connect, canvasFile};
})();
