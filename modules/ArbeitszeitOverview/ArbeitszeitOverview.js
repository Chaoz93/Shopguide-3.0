window.renderArbeitszeitOverview = async function (targetDiv, ctx = {}) {
  const settings = ctx.moduleJson?.settings || {};
  const DEFAULT_REGULAR = Number(settings.regularHours ?? 7.5);
  const DEFAULT_DRESS = Number(settings.dressTime ?? 2);
  const SHARED_STATE_KEY = 'arbeitszeit-shared-state';
  const SHARED_HANDLE_KEY = 'arbeitszeit-shared-handle';
  const SHARED_SIGNAL_ID = 'az-shared-signal';
  const SHARED_SIGNAL_ATTR = 'data-az-ts';
  const CACHE_KEY = 'az-overview-cache';

  ensureStyles();
  const signalEl = ensureSharedSignal();

  targetDiv.classList.add('az-overview');
  targetDiv.innerHTML = `
    <div class="p-2 text-white text-sm space-y-3">
      <div class="flex gap-2 flex-wrap">
        <button class="btn-week bg-gray-600 px-2 py-1 rounded">Aktuelle Woche</button>
        <button class="btn-prev bg-gray-600 px-2 py-1 rounded">Vorwoche</button>
        <button class="btn-next bg-gray-600 px-2 py-1 rounded">Nächste Woche</button>
        <button class="btn-month bg-gray-600 px-2 py-1 rounded">Gesamter Monat</button>
        <button class="btn-pause bg-gray-600 px-2 py-1 rounded">Pause +5</button>
        <button class="btn-end bg-gray-600 px-2 py-1 rounded">Feierabend jetzt setzen</button>
      </div>
      <div class="az-table"></div>
      <div class="text-xs opacity-75 storage-status pt-2 border-t border-gray-700"></div>
    </div>
  `;

  const tableDiv = targetDiv.querySelector('.az-table');
  const btnWeek = targetDiv.querySelector('.btn-week');
  const btnPrev = targetDiv.querySelector('.btn-prev');
  const btnNext = targetDiv.querySelector('.btn-next');
  const btnMonth = targetDiv.querySelector('.btn-month');
  const btnPause = targetDiv.querySelector('.btn-pause');
  const btnEnd = targetDiv.querySelector('.btn-end');
  const storageStatusEl = targetDiv.querySelector('.storage-status');

  const menu = document.createElement('div');
  menu.className = 'az-overview-menu';
  menu.innerHTML = `
    <div class="space-y-2">
      <div class="storage-status text-xs opacity-75"></div>
      <div><button class="pick w-full text-left px-2 py-1">Datei wählen…</button></div>
      <div><button class="use-local w-full text-left px-2 py-1">Nur Browser</button></div>
    </div>
  `;
  document.body.appendChild(menu);
  const pickBtn = menu.querySelector('.pick');
  const useLocalBtn = menu.querySelector('.use-local');
  const menuStatusEl = menu.querySelector('.storage-status');

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function openMenu(e) {
    e.preventDefault(); e.stopPropagation();
    const pad = 8; const vw = window.innerWidth, vh = window.innerHeight;
    const rect = menu.getBoundingClientRect();
    const w = rect.width || 150, h = rect.height || 24;
    menu.style.left = clamp(e.clientX, pad, vw - w - pad) + 'px';
    menu.style.top = clamp(e.clientY, pad, vh - h - pad) + 'px';
    updateStorageStatus();
    menu.classList.add('open');
  }
  targetDiv.addEventListener('contextmenu', openMenu);
  pickBtn.addEventListener('click', async () => { menu.classList.remove('open'); await chooseFileStorage(); });
  useLocalBtn.addEventListener('click', async () => { menu.classList.remove('open'); await switchToLocal(); });
  window.addEventListener('click', e => { if (!menu.contains(e.target)) menu.classList.remove('open'); });
  window.addEventListener('contextmenu', e => { if (!menu.contains(e.target)) menu.classList.remove('open'); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') menu.classList.remove('open'); });

  let data = {};
  let storageMode = 'local';
  let storageFileName = 'arbeitszeit.json';
  let fileHandle = null;
  let regularHours = DEFAULT_REGULAR;
  let dressTime = DEFAULT_DRESS;
  let viewMode = 'week';
  let weekOffset = 0;
  let monthOffset = 0;
  let activeDate = null;
  let sharedStamp = 0;
  let fileWatcherAttached = false;

  await syncWithSharedState(true);
  render();
  updateStorageStatus();

  btnWeek.addEventListener('click', () => { viewMode = 'week'; weekOffset = 0; render(); });
  btnPrev.addEventListener('click', () => { if (viewMode === 'week') { weekOffset--; render(); } });
  btnNext.addEventListener('click', () => { if (viewMode === 'week') { weekOffset++; render(); } });
  btnMonth.addEventListener('click', () => { viewMode = 'month'; monthOffset = 0; render(); });

  btnPause.addEventListener('click', async () => {
    if (!activeDate) return;
    const entry = ensureEntry(activeDate);
    const current = parsePause(entry.pause);
    const next = (Number.isNaN(current) ? 0 : current) + 5;
    entry.pause = String(next);
    entry.pauseSource = 'manual';
    const evaluation = evaluateEntry(activeDate, entry, { forceManual: true });
    applyEvaluation(activeDate, entry, evaluation);
    await saveData();
    render();
  });

  btnEnd.addEventListener('click', async () => {
    if (!activeDate) return;
    const entry = ensureEntry(activeDate);
    entry.ende = currentTimeString();
    const evaluation = evaluateEntry(activeDate, entry);
    applyEvaluation(activeDate, entry, evaluation);
    await saveData();
    render();
  });

  const signalObserver = new MutationObserver(async () => {
    await syncWithSharedState();
    render();
    updateStorageStatus();
  });
  signalObserver.observe(signalEl, { attributes: true, attributeFilter: [SHARED_SIGNAL_ATTR] });

  function handleStorageEvent(e) {
    if (e.key === SHARED_STATE_KEY) {
      syncWithSharedState().then(() => {
        render();
        updateStorageStatus();
      });
    }
  }
  window.addEventListener('storage', handleStorageEvent);

  tableDiv.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-date]');
    if (tr) setActiveDate(tr.dataset.date);
  });
  tableDiv.addEventListener('focusin', e => {
    const tr = e.target.closest('tr[data-date]');
    if (tr) setActiveDate(tr.dataset.date);
  });

  function setActiveDate(date) {
    activeDate = date;
    tableDiv.querySelectorAll('tr[data-date]').forEach(tr => {
      tr.classList.toggle('active', tr.dataset.date === activeDate);
    });
  }

  function ensureEntry(date) {
    if (!data || typeof data !== 'object') data = {};
    if (!data[date]) data[date] = {};
    return data[date];
  }
  function ensureStyles() {
    if (document.getElementById('az-overview-styles')) return;
    const style = document.createElement('style');
    style.id = 'az-overview-styles';
    style.textContent = `
      .az-overview-menu{position:fixed;z-index:1000;display:none;min-width:180px;padding:.5rem;
        background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);
        border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);}
      .az-overview-menu.open{display:block;}
      .az-overview-menu button{display:block;width:100%;padding:.25rem .5rem;text-align:left;}
      .az-overview .pause-warn{background:rgba(250,204,21,.18);color:#facc15;}
      .az-overview .pause-ok{background:rgba(34,197,94,.18);color:#4ade80;}
      .az-overview tr.active{background:rgba(59,130,246,.18);}
      .az-overview .diff-positive{color:#4ade80;}
      .az-overview .diff-negative{color:#f87171;}
    `;
    document.head.appendChild(style);
  }

  function ensureSharedSignal() {
    let el = document.getElementById(SHARED_SIGNAL_ID);
    if (!el) {
      el = document.createElement('meta');
      el.id = SHARED_SIGNAL_ID;
      el.setAttribute(SHARED_SIGNAL_ATTR, '0');
      document.head.appendChild(el);
    }
    return el;
  }

  function currentTimeString() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function parsePause(val) {
    if (val === null || val === undefined) return NaN;
    if (typeof val === 'number') return val;
    const str = String(val).trim();
    if (!str) return NaN;
    if (str.includes(':')) {
      const [h, m] = str.split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
      return h * 60 + m;
    }
    const num = parseInt(str, 10);
    return Number.isNaN(num) ? NaN : num;
  }

  function toMinutes(time) {
    if (!time) return NaN;
    const [h, m] = time.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
    return h * 60 + m;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatDiff(mins) {
    const sign = mins >= 0 ? '+' : '-';
    const abs = Math.abs(mins);
    const hours = Math.floor(abs / 60);
    const minutes = Math.abs(abs % 60);
    return `${sign}${pad(hours)}:${pad(minutes)}`;
  }

  function formatDiffDecimal(mins) {
    const sign = mins >= 0 ? '+' : '-';
    const abs = Math.abs(mins);
    return `${sign}${(abs / 60).toFixed(2)} h`;
  }

  function legalPause(workMins) {
    if (workMins < 5 * 60) return 0;
    if (workMins < 6 * 60 + 15) return 30;
    return 45;
  }

  function previousDateKey(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    if ([y, m, d].some(n => Number.isNaN(n))) return null;
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    if ([y, m, d, hh, mm].some(n => Number.isNaN(n))) return null;
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }

  function buildWarnings(date, startStr, endStr, actualWork) {
    const warns = [];
    if (actualWork > 10 * 60) warns.push('⛔ >10h Arbeitszeit');
    const endDate = parseDateTime(date, endStr);
    if (endDate && (endDate.getHours() > 20 || (endDate.getHours() === 20 && endDate.getMinutes() > 0))) {
      warns.push('🌙 Gehzeit nach 20:00');
    }
    const startDate = parseDateTime(date, startStr);
    if (startDate) {
      const prevKey = previousDateKey(date);
      const prevEntry = prevKey ? data?.[prevKey] : null;
      if (prevEntry?.ende) {
        const prevEnd = parseDateTime(prevKey, prevEntry.ende);
        if (prevEnd) {
          const restMinutes = (startDate - prevEnd) / 60000;
          if (restMinutes < 11 * 60) warns.push('⚠️ Ruhezeit <11h zum Vortag');
        }
      }
    }
    return warns.join(' · ');
  }

  function evaluateEntry(date, entry, opts = {}) {
    const start = entry.start;
    const end = entry.ende;
    if (!start || !end) {
      const pauseMinutes = parsePause(entry.pause);
      return {
        diffText: '',
        diffMinutes: 0,
        pauseMinutes: Number.isNaN(pauseMinutes) ? 0 : pauseMinutes,
        pauseSource: entry.pauseSource || '',
        warnings: entry.hinweis || ''
      };
    }
    const startMin = toMinutes(start);
    const endMin = toMinutes(end);
    if (Number.isNaN(startMin) || Number.isNaN(endMin)) {
      return { diffText: '', diffMinutes: 0, pauseMinutes: 0, pauseSource: entry.pauseSource || '', warnings: entry.hinweis || '' };
    }
    const total = Math.max(0, endMin - startMin);
    const hasManual = opts.forceManual
      || entry.pauseSource === 'manual'
      || (entry.pauseSource !== 'auto' && entry.pause && entry.pause.toString().trim() !== '');
    let pauseMinutes;
    let pauseSource;
    if (hasManual) {
      pauseMinutes = parsePause(entry.pause);
      if (Number.isNaN(pauseMinutes)) pauseMinutes = 0;
      pauseSource = 'manual';
    } else {
      pauseMinutes = legalPause(total);
      pauseSource = 'auto';
    }
    const actualWork = Math.max(0, total - pauseMinutes);
    const diffMinutes = Math.round(actualWork - regularHours * 60 + dressTime);
    const diffText = `${formatDiff(diffMinutes)} (${formatDiffDecimal(diffMinutes)})`;
    const warnings = buildWarnings(date, start, end, actualWork);
    return { diffText, diffMinutes, pauseMinutes, pauseSource, warnings };
  }

  function applyEvaluation(date, entry, evaluation) {
    if (!evaluation) return;
    entry.pause = String(evaluation.pauseMinutes ?? 0);
    entry.pauseSource = evaluation.pauseSource;
    entry.diff = evaluation.diffText;
    entry.hinweis = evaluation.warnings;
  }

  function calcTotals(entries) {
    let saldoMinutes = 0;
    let pauseTotal = 0;
    entries.forEach(item => {
      const entry = ensureEntry(item.date);
      const evaluation = evaluateEntry(item.date, entry);
      applyEvaluation(item.date, entry, evaluation);
      saldoMinutes += evaluation.diffMinutes;
      pauseTotal += evaluation.pauseMinutes ?? 0;
    });
    return {
      saldoMinutes,
      saldoText: `${formatDiff(saldoMinutes)} (${formatDiffDecimal(saldoMinutes)})`,
      pauseTotal
    };
  }

  function formatPauseTotal(mins) {
    return `${mins} min (${(mins / 60).toFixed(2)} h)`;
  }

  function render() {
    const entries = viewMode === 'week'
      ? filterByWeek(weekOffset)
      : filterByMonth(monthOffset);
    renderTable(entries);
  }

  function renderTable(list) {
    const totals = calcTotals(list);
    const rows = list.map(item => {
      const entry = ensureEntry(item.date);
      const pauseMinutes = parsePause(entry.pause);
      const pauseClass = Number.isNaN(pauseMinutes)
        ? ''
        : pauseMinutes < 30 ? 'pause-warn' : pauseMinutes >= 45 ? 'pause-ok' : '';
      const pauseTitle = entry.pauseSource === 'manual' ? 'Manuell gesetzt' : 'Automatisch berechnet';
      const diffClass = entry.diff?.startsWith('-') ? 'diff-negative' : entry.diff?.startsWith('+') ? 'diff-positive' : '';
      return `
        <tr class="border-b border-gray-700 ${item.date === activeDate ? 'active' : ''}" data-date="${item.date}">
          <td class="p-1 whitespace-nowrap" contenteditable data-field="date">${item.date}</td>
          <td class="p-1" contenteditable data-field="start">${entry.start || ''}</td>
          <td class="p-1" contenteditable data-field="ende">${entry.ende || ''}</td>
          <td class="p-1 ${pauseClass}" title="${pauseTitle}" contenteditable data-field="pause">${entry.pause || ''}</td>
          <td class="p-1 font-semibold ${diffClass}" contenteditable data-field="diff">${entry.diff || ''}</td>
          <td class="p-1" contenteditable data-field="hinweis">${entry.hinweis || ''}</td>
        </tr>
      `;
    }).join('');
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
              <td class="p-2 ${totals.saldoMinutes < 0 ? 'diff-negative' : totals.saldoMinutes > 0 ? 'diff-positive' : ''}">${totals.saldoText}</td>
              <td></td>
            </tr>
            <tr>
              <td class="p-2" colspan="4">Summe Pausen</td>
              <td class="p-2">${formatPauseTotal(totals.pauseTotal)}</td>
              <td></td>
            </tr>
            <tr>
              <td class="p-2" colspan="4">Saldo (Dezimal)</td>
              <td class="p-2">${formatDiffDecimal(totals.saldoMinutes)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
    tableDiv.querySelectorAll('td[contenteditable]').forEach(td => {
      td.addEventListener('blur', onEdit);
    });
    setActiveDate(activeDate);
  }

  async function onEdit(e) {
    const td = e.target;
    const field = td.dataset.field;
    const tr = td.closest('tr');
    if (!tr) return;
    const oldDate = tr.dataset.date;
    const value = td.textContent.trim();
    if (field === 'date') {
      if (!value) return;
      if (value !== oldDate) {
        const entry = ensureEntry(oldDate);
        data[value] = entry;
        delete data[oldDate];
        tr.dataset.date = value;
        activeDate = value;
      }
    } else {
      const entry = ensureEntry(oldDate);
      if (field === 'pause') {
        if (value === '') {
          entry.pause = '';
          entry.pauseSource = 'auto';
        } else {
          entry.pause = value;
          entry.pauseSource = 'manual';
        }
      } else {
        entry[field] = value;
      }
      if (['start', 'ende', 'pause'].includes(field)) {
        const evaluation = evaluateEntry(tr.dataset.date, entry, { forceManual: entry.pauseSource === 'manual' });
        applyEvaluation(tr.dataset.date, entry, evaluation);
      }
    }
    await saveData();
    render();
  }

  function filterByWeek(offset) {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return Object.keys(data || {})
      .filter(d => {
        const dt = new Date(d);
        return dt >= start && dt <= end;
      })
      .sort()
      .map(d => ({ date: d }));
  }

  function filterByMonth(offset) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    return Object.keys(data || {})
      .filter(d => {
        const dt = new Date(d);
        return dt >= start && dt <= end;
      })
      .sort()
      .map(d => ({ date: d }));
  }

  async function syncWithSharedState(initial = false) {
    let shared;
    try {
      const raw = localStorage.getItem(SHARED_STATE_KEY);
      shared = raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('ArbeitszeitOverview: shared state invalid', err);
      shared = null;
    }
    if (shared) {
      if (shared.updatedAt && shared.updatedAt === sharedStamp && !initial) return;
      sharedStamp = shared.updatedAt || Date.now();
      storageMode = shared.mode || storageMode;
      storageFileName = shared.fileName || storageFileName;
      if (shared.regularHours !== undefined) regularHours = Number(shared.regularHours) || DEFAULT_REGULAR;
      if (shared.dressTime !== undefined) dressTime = Number(shared.dressTime) || 0;
      if (shared.data && typeof shared.data === 'object') data = shared.data;
      if (storageMode === 'file' && window.deserializeHandle) {
        try {
          const handleRaw = localStorage.getItem(SHARED_HANDLE_KEY);
          if (handleRaw) {
            fileHandle = await window.deserializeHandle(handleRaw);
            attachFileWatcher();
          }
        } catch (err) {
          console.warn('ArbeitszeitOverview: deserialize handle failed', err);
          fileHandle = null;
          fileWatcherAttached = false;
        }
      }
    } else if (initial) {
      data = loadCache();
    }
    if (!data || typeof data !== 'object') data = {};
  }

  function attachFileWatcher() {
    if (!fileHandle || typeof fileHandle.addEventListener !== 'function' || fileWatcherAttached) return;
    fileHandle.addEventListener('change', onFileChange);
    fileWatcherAttached = true;
  }

  async function onFileChange() {
    if (!fileHandle) return;
    try {
      const fresh = await readFromHandle(fileHandle);
      data = fresh;
      persistSharedState();
      render();
    } catch (err) {
      console.warn('ArbeitszeitOverview: file change read failed', err);
    }
  }

  async function chooseFileStorage() {
    const handle = await requestFileHandle();
    if (!handle) return;
    storageMode = 'file';
    fileHandle = handle;
    storageFileName = handle.name || 'arbeitszeit.json';
    storeSharedHandle(handle);
    attachFileWatcher();
    try {
      data = await readFromHandle(handle);
    } catch (err) {
      console.warn('ArbeitszeitOverview: file read failed', err);
      data = {};
    }
    persistSharedState();
    await saveData();
    updateStorageStatus();
    render();
  }

  async function switchToLocal() {
    storageMode = 'local';
    fileHandle = null;
    fileWatcherAttached = false;
    storeSharedHandle(null);
    persistSharedState();
    await saveData();
    updateStorageStatus();
    render();
  }

  function loadCache() {
    try {
      const cacheRaw = localStorage.getItem(CACHE_KEY);
      if (!cacheRaw) return {};
      const parsed = JSON.parse(cacheRaw);
      return parsed?.data && typeof parsed.data === 'object' ? parsed.data : {};
    } catch (err) {
      console.warn('ArbeitszeitOverview: load cache failed', err);
      return {};
    }
  }

  async function readFromHandle(handle) {
    const file = await handle.getFile();
    const text = await file.text();
    if (!text) return {};
    const parsed = JSON.parse(text);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ path: handle.name, data: parsed }));
    return parsed;
  }

  async function requestFileHandle() {
    if (!window.showOpenFilePicker && !window.showSaveFilePicker) {
      console.warn('ArbeitszeitOverview: File System Access API unavailable');
      return null;
    }
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        mode: 'readwrite',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
        suggestedName: storageFileName || 'arbeitszeit.json'
      });
      return handle || null;
    } catch (err) {
      if (err?.name === 'AbortError') return null;
      console.warn('ArbeitszeitOverview: open file failed', err);
      return null;
    }
  }

  function storeSharedHandle(handle) {
    if (handle && window.serializeHandle) {
      try {
        localStorage.setItem(SHARED_HANDLE_KEY, window.serializeHandle(handle));
      } catch (err) {
        console.warn('ArbeitszeitOverview: serialize handle failed', err);
      }
    } else {
      localStorage.removeItem(SHARED_HANDLE_KEY);
    }
  }

  function persistSharedState() {
    const payload = {
      mode: storageMode,
      fileName: storageFileName,
      data,
      regularHours,
      dressTime,
      updatedAt: Date.now()
    };
    try {
      localStorage.setItem(SHARED_STATE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('ArbeitszeitOverview: persist shared failed', err);
    }
    sharedStamp = payload.updatedAt;
    signalEl.setAttribute(SHARED_SIGNAL_ATTR, String(payload.updatedAt));
  }

  async function saveData() {
    try {
      if (storageMode === 'file' && fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify({ path: storageFileName, data }));
    } catch (err) {
      console.warn('ArbeitszeitOverview: save failed', err);
    }
    persistSharedState();
  }

  function updateStorageStatus() {
    const text = storageMode === 'file'
      ? `Speicherung: Datei „${storageFileName || 'arbeitszeit.json'}“`
      : 'Speicherung: Browser';
    if (storageStatusEl) storageStatusEl.textContent = text;
    if (menuStatusEl) menuStatusEl.textContent = text;
  }

  const cleanupObserver = new MutationObserver(() => {
    if (!document.body.contains(targetDiv)) {
      signalObserver.disconnect();
      cleanupObserver.disconnect();
      window.removeEventListener('storage', handleStorageEvent);
      menu.remove();
      if (fileHandle && typeof fileHandle.removeEventListener === 'function') {
        fileHandle.removeEventListener('change', onFileChange);
      }
    }
  });
  cleanupObserver.observe(document.body, { childList: true, subtree: true });
};
