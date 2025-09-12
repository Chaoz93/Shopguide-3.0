window.renderArbeitszeitOverview = async function (targetDiv, ctx = {}) {
  // UI skeleton
  targetDiv.innerHTML = `
    <div class="p-2 text-white text-sm space-y-2">
      <div class="flex gap-2 flex-wrap">
        <button class="btn-week bg-gray-600 px-2 py-1 rounded">Aktuelle Woche</button>
        <button class="btn-prev bg-gray-600 px-2 py-1 rounded">Vorwoche</button>
        <button class="btn-next bg-gray-600 px-2 py-1 rounded">Nächste Woche</button>
        <button class="btn-month bg-gray-600 px-2 py-1 rounded">Gesamter Monat</button>
      </div>
      <div class="az-table"></div>
    </div>
  `;

  const tableDiv = targetDiv.querySelector('.az-table');
  const btnWeek = targetDiv.querySelector('.btn-week');
  const btnPrev = targetDiv.querySelector('.btn-prev');
  const btnNext = targetDiv.querySelector('.btn-next');
  const btnMonth = targetDiv.querySelector('.btn-month');

  const FILE_KEY = 'az-overview-file';
  const CACHE_KEY = 'az-overview-cache';
  let fileHandle;
  let data;

  const onFileChange = async () => {
    if (!fileHandle) return;
    try {
      data = await readHandle(fileHandle);
      render();
    } catch (e) {
      console.warn('Konnte geänderte Datei nicht lesen', e);
    }
  };

  // context menu for reloading/choosing file
  const menu = document.createElement('div');
  menu.className = 'az-overview-menu';
  menu.innerHTML = `<div><button class="pick w-full text-left px-2 py-1">Datei wählen…</button></div>`;
  document.body.appendChild(menu);
  const pickBtn = menu.querySelector('.pick');

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function openMenu(e) {
    e.preventDefault(); e.stopPropagation();
    const pad = 8; const vw = window.innerWidth, vh = window.innerHeight;
    const rect = menu.getBoundingClientRect();
    const w = rect.width || 150, h = rect.height || 24;
    menu.style.left = clamp(e.clientX, pad, vw - w - pad) + 'px';
    menu.style.top = clamp(e.clientY, pad, vh - h - pad) + 'px';
    menu.classList.add('open');
  }
  targetDiv.addEventListener('contextmenu', openMenu);
  pickBtn.addEventListener('click', async () => { menu.classList.remove('open'); await chooseFile(); });
  window.addEventListener('click', e => { if (!menu.contains(e.target)) menu.classList.remove('open'); });
  window.addEventListener('contextmenu', e => { if (!menu.contains(e.target)) menu.classList.remove('open'); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') menu.classList.remove('open'); });

  if (!document.getElementById('az-overview-styles')) {
    const style = document.createElement('style');
    style.id = 'az-overview-styles';
    style.textContent = `
      .az-overview-menu{position:fixed;z-index:1000;display:none;min-width:150px;padding:.25rem;
        background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);
        border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);}
      .az-overview-menu.open{display:block;}
      .az-overview-menu button{display:block;width:100%;padding:.25rem .5rem;text-align:left;}
    `;
    document.head.appendChild(style);
  }

  data = await loadFile();
  let viewMode = 'week';
  let weekOffset = 0;
  let monthOffset = 0;

  function render() {
    const entries = viewMode === 'week'
      ? filterByWeek(data, weekOffset)
      : filterByMonth(data, monthOffset);
    renderTable(entries);
  }

  btnWeek.addEventListener('click', () => { viewMode = 'week'; weekOffset = 0; render(); });
  btnPrev.addEventListener('click', () => { if (viewMode === 'week') { weekOffset--; render(); } });
  btnNext.addEventListener('click', () => { if (viewMode === 'week') { weekOffset++; render(); } });
  btnMonth.addEventListener('click', () => { viewMode = 'month'; monthOffset = 0; render(); });

  render();

  async function loadFile() {
    let handle;
    const stored = localStorage.getItem(FILE_KEY);
    if (stored) {
      try {
        handle = await (typeof stored === 'string' ? window.deserializeHandle?.(stored) : stored);
      } catch (e) {
        console.warn('Gespeicherter Handle ungültig', e);
      }
    }
    if (!handle) {
      try {
        [handle] = await window.showOpenFilePicker({ types: [{ description: 'Arbeitszeit JSON', accept: { 'application/json': ['.json'] } }] });
        localStorage.setItem(FILE_KEY, window.serializeHandle?.(handle) || handle);
      } catch (e) {
        console.warn('Datei nicht gewählt', e);
      }
    }
    if (!handle) {
      try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY));
        return cache?.data || {};
      } catch (_) {
        return {};
      }
    }
    attachWatcher(handle);
    try {
      const parsed = await readHandle(handle);
      return parsed;
    } catch (e) {
      console.warn('Datei nicht lesbar', e);
      try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY));
        return cache?.data || {};
      } catch (_) {
        return {};
      }
    }
  }

  async function readHandle(handle) {
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ path: handle.name, data: parsed }));
    return parsed;
  }

  function attachWatcher(handle) {
    if (fileHandle && fileHandle.removeEventListener) {
      fileHandle.removeEventListener('change', onFileChange);
    }
    fileHandle = handle;
    if (fileHandle && fileHandle.addEventListener) {
      fileHandle.addEventListener('change', onFileChange);
    }
  }

  async function chooseFile() {
    try {
      const [handle] = await window.showOpenFilePicker({ types: [{ description: 'Arbeitszeit JSON', accept: { 'application/json': ['.json'] } }] });
      if (handle) {
        attachWatcher(handle);
        localStorage.setItem(FILE_KEY, window.serializeHandle?.(handle) || handle);
        data = await readHandle(handle);
        render();
      }
    } catch (e) {
      console.warn('Datei nicht neu geladen', e);
    }
  }

  function renderTable(list) {
    const saldo = calcSaldo(list);
    const rows = list.map(e => `
      <tr class="border-b border-gray-700" data-date="${e.date}">
        <td class="p-1 whitespace-nowrap" contenteditable data-field="date">${e.date}</td>
        <td class="p-1" contenteditable data-field="start">${e.start || ''}</td>
        <td class="p-1" contenteditable data-field="ende">${e.ende || ''}</td>
        <td class="p-1" contenteditable data-field="pause">${e.pause || ''}</td>
        <td class="p-1 ${e.diff?.startsWith('-') ? 'text-red-500' : e.diff?.startsWith('+') ? 'text-green-500' : ''}" contenteditable data-field="diff">${e.diff || ''}</td>
        <td class="p-1 ${e.hinweis && e.hinweis.includes('⚠️') ? 'text-yellow-400' : ''}" contenteditable data-field="hinweis">${e.hinweis || ''}</td>
      </tr>
    `).join('');
    tableDiv.innerHTML = `
      <div class="overflow-x-auto">
        <table class="table-auto w-full border-collapse text-left">
          <thead class="bg-gray-700">
            <tr>
              <th class="p-2">Datum</th>
              <th class="p-2">Start</th>
              <th class="p-2">Ende</th>
              <th class="p-2">Pause</th>
              <th class="p-2">Differenz</th>
              <th class="p-2">Hinweis</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="font-semibold">
              <td class="p-2" colspan="4">Saldo</td>
              <td class="p-2 ${saldo.startsWith('-') ? 'text-red-500' : 'text-green-500'}">${saldo}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
    tableDiv.querySelectorAll('td[contenteditable]').forEach(td => {
      td.addEventListener('blur', onEdit);
    });
  }

  async function onEdit(e) {
    const td = e.target;
    const field = td.dataset.field;
    const tr = td.closest('tr');
    const oldDate = tr.dataset.date;
    const value = td.textContent.trim();
    if (field === 'date') {
      if (!value) return;
      const entry = data[oldDate] || {};
      if (value !== oldDate) {
        data[value] = entry;
        delete data[oldDate];
        tr.dataset.date = value;
      }
    } else {
      if (!data[oldDate]) data[oldDate] = {};
      data[oldDate][field] = value;
      if (['start', 'ende', 'pause'].includes(field)) {
        recalcDiff(data[oldDate]);
      }
    }
    await saveData();
    render();
  }

  async function saveData() {
    try {
      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify({ path: fileHandle?.name, data }));
    } catch (e) {
      console.warn('Konnte Daten nicht speichern', e);
    }
  }

  function filterByWeek(data, offset) {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // Monday=0
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return Object.keys(data)
      .filter(d => {
        const dt = new Date(d);
        return dt >= start && dt <= end;
      })
      .sort()
      .map(d => ({ date: d, ...data[d] }));
  }

  function filterByMonth(data, offset) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    return Object.keys(data)
      .filter(d => {
        const dt = new Date(d);
        return dt >= start && dt <= end;
      })
      .sort()
      .map(d => ({ date: d, ...data[d] }));
  }

  function recalcDiff(entry) {
    const start = entry.start;
    const end = entry.ende;
    const pause = entry.pause;
    if (!start || !end || pause == null) {
      entry.diff = '';
      return;
    }
    const toMinutes = t => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const startMin = toMinutes(start);
    const endMin = toMinutes(end);
    const pauseMin = pause.toString().includes(':')
      ? toMinutes(pause)
      : parseInt(pause, 10) || 0;
    const work = endMin - startMin - pauseMin;
    const diff = work - 8 * 60;
    const sign = diff >= 0 ? '+' : '-';
    const abs = Math.abs(diff);
    const h = Math.floor(abs / 60);
    const m = String(abs % 60).padStart(2, '0');
    entry.diff = `${sign}${h}:${m}`;
  }

  function calcSaldo(entries) {
    let total = 0;
    entries.forEach(e => {
      if (!e.diff) return;
      const sign = e.diff.startsWith('-') ? -1 : 1;
      const [h, m] = e.diff.replace(/[+-]/, '').split(':').map(Number);
      total += sign * (h * 60 + m);
    });
    const sign = total >= 0 ? '+' : '-';
    const abs = Math.abs(total);
    const h = Math.floor(abs / 60);
    const m = String(abs % 60).padStart(2, '0');
    return `${sign}${h}:${m}`;
  }

  const mo = new MutationObserver(() => {
    if (!document.body.contains(targetDiv)) {
      if (fileHandle && fileHandle.removeEventListener) fileHandle.removeEventListener('change', onFileChange);
      menu.remove();
      mo.disconnect();
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
};
