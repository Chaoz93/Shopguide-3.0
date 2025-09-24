(function(){
  const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const DATA_KEY = 'fs-data';
  const FILE_KEY = 'fs-filepath';
  const MODULE_DOC_KEY = 'module_data_v1';
  const DICT_DATA_KEY = 'fs-dict-data';
  const DICT_NAME_KEY = 'fs-dict-name';
  const DEFAULT_FILE = 'Findings_Shopguide.xlsx';
  const SAVE_DEBOUNCE_MS = 400;
  const WATCH_INTERVAL = 400;
  const RERENDER_DEBOUNCE_MS = 600;

  let sharedXlsxPromise = null;

  function ensureXLSX(){
    if (window.__fsXLSX) return Promise.resolve(window.__fsXLSX);
    if (sharedXlsxPromise) return sharedXlsxPromise;
    sharedXlsxPromise = new Promise((resolve, reject) => {
      const previous = window.XLSX;
      const script = document.createElement('script');
      script.src = XLSX_URL;
      script.async = true;
      script.onload = () => {
        const loaded = window.XLSX;
        if (previous && previous !== loaded) {
          window.__fsOriginalXLSX = previous;
          window.XLSX = previous;
        }
        window.__fsXLSX = loaded;
        resolve(window.__fsXLSX);
      };
      script.onerror = (e) => {
        if (previous) window.XLSX = previous;
        reject(new Error('XLSX konnte nicht geladen werden'));
      };
      document.head.appendChild(script);
    });
    return sharedXlsxPromise;
  }

  function loadStoredData(){
    try {
      const raw = localStorage.getItem(DATA_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.sheets)) return null;
      const sheets = parsed.sheets.map(sheet => ({
        name: typeof sheet.name === 'string' ? sheet.name : '',
        rows: normalizeRows(sheet.rows)
      }));
      return { sheets, meta: parsed.meta || {} };
    } catch (e) {
      console.warn('fs: localStorage lesen fehlgeschlagen', e);
      return null;
    }
  }

  function loadStoredFilePath(){
    try {
      return localStorage.getItem(FILE_KEY) || '';
    } catch (e) {
      console.warn('fs: Dateiname aus localStorage nicht lesbar', e);
      return '';
    }
  }

  function normalizeRows(rows){
    if (!Array.isArray(rows)) return [[]];
    const cleaned = rows.map(row => {
      if (!Array.isArray(row)) return [];
      const copy = row.map(cell => (cell == null ? '' : String(cell)));
      trimRow(copy);
      return copy;
    });
    trimTrailingRows(cleaned);
    if (!cleaned.length) cleaned.push([]);
    return cleaned;
  }

  function trimRow(row){
    for (let i = row.length - 1; i >= 0; i -= 1) {
      if (row[i] === '') row.pop();
      else break;
    }
  }

  function trimTrailingRows(rows){
    for (let i = rows.length - 1; i > 0; i -= 1) {
      const row = rows[i];
      if (!row || !row.length || row.every(cell => cell === '')) rows.pop();
      else break;
    }
  }

  function normalizeKey(value){
    if (value == null) return '';
    return String(value).trim().toLowerCase();
  }

  function normalizeDisplay(value){
    if (value == null) return '';
    return String(value).trim();
  }

  function makeDictEntry(meldung, part){
    const meld = normalizeDisplay(meldung);
    const pn = normalizeDisplay(part);
    if (!meld) return null;
    return {
      meldung: meld,
      part: pn,
      meldungKey: normalizeKey(meld),
      partKey: normalizeKey(pn)
    };
  }

  function loadStoredDict(){
    let entries = [];
    let name = '';
    try {
      const raw = localStorage.getItem(DICT_DATA_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) entries = parsed;
      }
    } catch (e) {
      console.warn('fs: Dictionary aus localStorage nicht lesbar', e);
    }
    try {
      name = localStorage.getItem(DICT_NAME_KEY) || '';
    } catch (e) {
      console.warn('fs: Dictionary-Name aus localStorage nicht lesbar', e);
    }
    const normalized = entries.map(item => makeDictEntry(item?.meldung, item?.part)).filter(Boolean);
    return { entries: normalized, name };
  }

  function saveDictionary(entries, name){
    try {
      const payload = Array.isArray(entries)
        ? entries.map(item => ({ meldung: item.meldung, part: item.part }))
        : [];
      localStorage.setItem(DICT_DATA_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('fs: Dictionary konnte nicht gespeichert werden', e);
    }
    try {
      if (name) localStorage.setItem(DICT_NAME_KEY, name);
      else localStorage.removeItem(DICT_NAME_KEY);
    } catch (e) {
      console.warn('fs: Dictionary-Name konnte nicht gespeichert werden', e);
    }
  }

  function readActiveMeldung(){
    try {
      const raw = localStorage.getItem(MODULE_DOC_KEY);
      if (!raw) return '';
      const doc = JSON.parse(raw);
      const meld = doc?.general?.Meldung;
      return typeof meld === 'string' ? meld.trim() : '';
    } catch (e) {
      console.warn('fs: Meldung aus module_data_v1 nicht lesbar', e);
      return '';
    }
  }

  function lookupPartNumber(meldung, dict){
    const key = normalizeKey(meldung);
    if (!key || !Array.isArray(dict) || !dict.length) return '';
    const entry = dict.find(item => item?.meldungKey === key);
    return entry?.part ? entry.part : '';
  }

  function parseEnsureBase(value){
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object') return null;
      const part = typeof parsed.part === 'string' ? parsed.part : '';
      const label = typeof parsed.label === 'string' ? parsed.label : '';
      if (!part && !label) return null;
      return { part, label };
    } catch {
      return null;
    }
  }

  function findHeaderIndex(headerRow, names){
    if (!Array.isArray(headerRow)) return -1;
    const normalized = headerRow.map(value => normalizeKey(value));
    for (let i = 0; i < normalized.length; i += 1) {
      if (names.includes(normalized[i])) return i;
    }
    return -1;
  }

  async function ensureRWPermission(handle){
    if (!handle || !handle.queryPermission) return true;
    const query = await handle.queryPermission({ mode: 'readwrite' });
    if (query === 'granted') return true;
    const request = await handle.requestPermission({ mode: 'readwrite' });
    return request === 'granted';
  }

  function clamp(n, min, max){
    return Math.max(min, Math.min(max, n));
  }

  function createMenuElement(){
    const menu = document.createElement('div');
    menu.className = 'fixed z-[1000] hidden min-w-[200px] rounded-lg border border-slate-600 bg-slate-900/95 text-slate-100 shadow-xl backdrop-blur';
    menu.innerHTML = `
      <button class="fs-menu-item w-full px-4 py-2 text-left text-sm hover:bg-slate-700/80 flex items-center gap-2" data-action="choose">
        <span class="text-lg">📂</span><span>Excel wählen</span>
      </button>
      <button class="fs-menu-item w-full px-4 py-2 text-left text-sm hover:bg-slate-700/80 flex items-center gap-2" data-action="reload">
        <span class="text-lg">🔄</span><span>Neu laden</span>
      </button>
      <div class="my-1 border-t border-slate-700/70"></div>
      <button class="fs-menu-item w-full px-4 py-2 text-left text-sm hover:bg-slate-700/80 flex items-center gap-2" data-action="dict">
        <span class="text-lg">📘</span><span>Dictionary wählen</span>
      </button>
    `;
    return menu;
  }

  function getCellText(el){
    if (!el) return '';
    const text = el.textContent || '';
    return text.replace(/\r/g, '').replace(/\u00a0/g, ' ');
  }

  function sanitizeSheetName(name, index){
    const value = String(name || '').trim();
    const fallback = `Sheet${index + 1}`;
    const cleaned = value || fallback;
    return cleaned.slice(0, 31);
  }

  function formatTime(date){
    try {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  function formatDateTime(date){
    try {
      return date.toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return '';
    }
  }

  function isRowEmpty(row){
    return !row || !row.length || row.every(cell => cell === '');
  }

  window.renderFindingsSpreadsheet = function(targetDiv){
    let workbookData = { sheets: [] };
    let currentFileName = '';
    let currentSource = null; // { type: 'handle'|'file'|'url', handle?, file?, url?, name? }
    let lastSavedAt = null;
    let statusNote = '';
    let statusNoteTimer = null;
    let feedbackTimer = null;
    let writeTimer = null;
    let writePromise = Promise.resolve();
    let dictionary = [];
    let dictionaryName = '';
    let activeMeldung = '';
    let activePartNumber = '';
    let renderTimer = null;
    let lastModuleDoc = null;
    let meldungInterval = null;
    let storageListener = null;
    let pendingFocus = null;
    let pendingSearchFocus = null;
    const tableStates = new Map();
    let dashboardInfoEl = null;
    let lastDashboardSummary = null;
    let globalSort = { sheetIndex: null, column: null, direction: 1 };

    const stored = loadStoredData();
    if (stored) {
      workbookData.sheets = stored.sheets || [];
      if (stored.meta?.updatedAt) {
        const dt = new Date(stored.meta.updatedAt);
        if (!Number.isNaN(dt.getTime())) lastSavedAt = dt;
      }
      if (stored.meta?.sourceType === 'url' && stored.meta?.sourceUrl) {
        currentSource = {
          type: 'url',
          url: stored.meta.sourceUrl,
          name: stored.meta.sourceName || stored.meta.fileName || DEFAULT_FILE
        };
      }
    }
    const storedPath = loadStoredFilePath();
    if (storedPath) currentFileName = storedPath;
    else if (stored?.meta?.fileName) currentFileName = stored.meta.fileName;

    const storedDict = loadStoredDict();
    if (storedDict.entries.length) dictionary = storedDict.entries;
    dictionaryName = storedDict.name || '';
    activeMeldung = readActiveMeldung();

    targetDiv.innerHTML = `
      <div class="h-full flex flex-col text-slate-100">
        <div class="flex items-center justify-between gap-3 pb-2">
          <div data-status class="text-xs text-slate-300 truncate"></div>
          <div data-feedback class="text-xs text-emerald-400 opacity-0 transition-opacity duration-300">✅ gespeichert</div>
        </div>
        <div data-hint class="text-sm text-slate-400 italic pb-2"></div>
        <div data-table class="flex-1 overflow-hidden">
          <div class="flex h-full flex-col gap-3">
            <div data-dashboard class="hidden rounded-md border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs text-slate-200"></div>
            <div class="flex flex-wrap items-center justify-end gap-2" data-global-actions>
              <button data-add-all class="rounded-md bg-slate-800/70 px-3 py-1 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-700/80">➕ Neues Finding (Alle Tabellen)</button>
            </div>
            <div data-table-scroll class="flex-1 overflow-auto">
              <div data-table-inner class="flex h-full w-max items-start gap-4 pr-1"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const statusEl = targetDiv.querySelector('[data-status]');
    const hintEl = targetDiv.querySelector('[data-hint]');
    const tableContainer = targetDiv.querySelector('[data-table]');
    const tableInner = targetDiv.querySelector('[data-table-inner]');
    const feedbackEl = targetDiv.querySelector('[data-feedback]');
    dashboardInfoEl = targetDiv.querySelector('[data-dashboard]');

    const menu = createMenuElement();
    document.body.appendChild(menu);

    const addAllButton = targetDiv.querySelector('[data-add-all]');
    if (addAllButton) {
      addAllButton.addEventListener('click', () => addNewFindingAll());
    }

    function updateStatus(){
      const parts = [];
      parts.push(currentFileName ? `Excel: ${currentFileName}` : 'Keine Excel-Datei');
      parts.push(dictionaryName ? `Dictionary: ${dictionaryName}` : 'Dictionary fehlt');
      if (activeMeldung) parts.push(`Meldung: ${activeMeldung}`);
      if (activePartNumber) parts.push(`P/N: ${activePartNumber}`);
      if (lastSavedAt) parts.push(`Stand ${formatTime(lastSavedAt)}`);
      if (statusNote) parts.push(statusNote);
      statusEl.textContent = parts.join(' · ');
    }

    function setStatusNote(note, timeout = 4000){
      statusNote = note || '';
      updateStatus();
      if (statusNoteTimer) clearTimeout(statusNoteTimer);
      if (note) {
        statusNoteTimer = setTimeout(() => {
          statusNote = '';
          updateStatus();
        }, timeout);
      }
    }

    function showHint(message){
      hintEl.textContent = message;
      hintEl.classList.remove('hidden');
    }

    function hideHint(){
      hintEl.classList.add('hidden');
      hintEl.textContent = '';
    }

    function showFeedback(message){
      if (!feedbackEl) return;
      feedbackEl.textContent = message;
      feedbackEl.classList.remove('opacity-0');
      if (feedbackTimer) clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => {
        feedbackEl.classList.add('opacity-0');
      }, 1600);
    }

    function getTableState(sheetIndex){
      let state = tableStates.get(sheetIndex);
      if (!state) {
        state = { filter: '' };
        tableStates.set(sheetIndex, state);
      }
      return state;
    }

    function updateDashboardInfo(summary){
      if (!dashboardInfoEl) return;
      const info = summary || lastDashboardSummary;
      if (!info) {
        dashboardInfoEl.classList.add('hidden');
        dashboardInfoEl.innerHTML = '';
        return;
      }
      lastDashboardSummary = info;
      dashboardInfoEl.innerHTML = '';
      const row = document.createElement('div');
      row.className = 'flex flex-wrap items-center gap-x-4 gap-y-1';
      const items = [
        { label: 'Meldung', value: info.meldung || '–' },
        { label: 'P/N', value: info.partNumber || '–' },
        { label: 'Treffer', value: String(info.matches ?? 0) },
        { label: 'Letztes Speichern', value: info.lastSaved || '–' }
      ];
      items.forEach(item => {
        const span = document.createElement('span');
        span.className = 'text-[11px] text-slate-200';
        const strong = document.createElement('span');
        strong.className = 'font-semibold text-slate-100';
        strong.textContent = `${item.label}: `;
        const value = document.createElement('span');
        value.textContent = item.value;
        span.appendChild(strong);
        span.appendChild(value);
        row.appendChild(span);
      });
      dashboardInfoEl.appendChild(row);
      dashboardInfoEl.classList.remove('hidden');
    }

    function renderTables(){
      if (!tableInner) return;
      tableInner.innerHTML = '';
      let summary = null;
      if (addAllButton) {
        addAllButton.classList.add('hidden');
        addAllButton.disabled = true;
      }
      if (!workbookData.sheets.length) {
        showHint('Rechtsklick → Excel wählen');
        updateDashboardInfo(null);
        return;
      }
      if (!dictionary.length) {
        showHint('Rechtsklick → Dictionary wählen');
        updateDashboardInfo(null);
        return;
      }

      const meldDisplay = normalizeDisplay(activeMeldung);
      const partDisplay = normalizeDisplay(activePartNumber);
      const partKey = normalizeKey(partDisplay);

      if (!meldDisplay) {
        showHint('Keine Meldung im module_data_v1 gefunden');
        updateDashboardInfo(null);
        return;
      }
      if (!partKey) {
        showHint('Keine Partnummer zur aktuellen Meldung gefunden');
        updateDashboardInfo(null);
        return;
      }

      hideHint();
      if (addAllButton) {
        addAllButton.classList.remove('hidden');
        addAllButton.disabled = false;
      }

      const matchesBySheet = workbookData.sheets.map(sheet => {
        const rows = Array.isArray(sheet?.rows) ? sheet.rows : [];
        const matches = [];
        for (let r = 1; r < rows.length; r += 1) {
          if (normalizeKey(rows[r]?.[0]) === partKey) matches.push(r);
        }
        return matches;
      });

      const anyMatches = matchesBySheet.some(list => list.length > 0);

      let baseSheetIndex = matchesBySheet.findIndex(list => list.length > 0);
      if (baseSheetIndex < 0) baseSheetIndex = 0;

      const sheetOrder = workbookData.sheets.map((_, idx) => idx);
      if (sheetOrder[0] !== baseSheetIndex) {
        const pos = sheetOrder.indexOf(baseSheetIndex);
        if (pos >= 0) {
          sheetOrder.splice(pos, 1);
          sheetOrder.unshift(baseSheetIndex);
        }
      }

      const colCounts = workbookData.sheets.map(sheet => {
        const rows = Array.isArray(sheet?.rows) ? sheet.rows : [];
        let count = 0;
        rows.forEach(row => {
          if (Array.isArray(row)) count = Math.max(count, row.length);
        });
        if (count < 2) count = 2;
        return count;
      });

      let sortedPositions = null;
      if (Number.isInteger(globalSort.sheetIndex) && globalSort.sheetIndex >= 0) {
        const sortMatches = matchesBySheet[globalSort.sheetIndex] || [];
        const sortColCount = colCounts[globalSort.sheetIndex] || 0;
        if (sortMatches.length && Number.isInteger(globalSort.column) && globalSort.column < sortColCount) {
          const sortRows = Array.isArray(workbookData.sheets[globalSort.sheetIndex]?.rows)
            ? workbookData.sheets[globalSort.sheetIndex].rows
            : [];
          const decorated = sortMatches.map((rowIndex, position) => {
            const row = sortRows[rowIndex] || [];
            return { position, value: row[globalSort.column] };
          });
          const direction = globalSort.direction === -1 ? -1 : 1;
          decorated.sort((a, b) => {
            const cmp = compareCellValues(a.value, b.value);
            if (cmp !== 0) return cmp * direction;
            return a.position - b.position;
          });
          sortedPositions = decorated.map(item => item.position);
        }
      }

      const newRowTargets = workbookData.sheets.map(sheet => {
        const rows = Array.isArray(sheet?.rows) ? sheet.rows : [];
        return rows.length;
      });

      const matchPositionMaps = matchesBySheet.map(matches => {
        const map = new Map();
        matches.forEach((rowIndex, position) => map.set(rowIndex, position));
        return map;
      });

      const diffHighlights = new Map();
      const maxPositions = matchesBySheet.reduce((max, list) => Math.max(max, list.length), 0);
      for (let position = 0; position < maxPositions; position += 1) {
        const columnEntries = new Map();
        workbookData.sheets.forEach((sheet, idx) => {
          const rows = Array.isArray(sheet?.rows) ? sheet.rows : [];
          const rowIndex = matchesBySheet[idx]?.[position];
          if (!Number.isInteger(rowIndex)) return;
          const row = rows[rowIndex] || [];
          const limit = colCounts[idx] || 0;
          for (let c = 0; c < limit; c += 1) {
            const value = normalizeDisplay(row[c] ?? '');
            const list = columnEntries.get(c) || [];
            list.push({ sheetIndex: idx, rowIndex, value, column: c });
            columnEntries.set(c, list);
          }
        });
        columnEntries.forEach(list => {
          const nonEmpty = list.filter(item => item.value !== '');
          if (nonEmpty.length && nonEmpty.length < list.length) {
            list.forEach(item => {
              if (item.value === '') {
                const key = `${item.sheetIndex}:${item.rowIndex}:${item.column}`;
                diffHighlights.set(key, 'bg-red-900/40');
              }
            });
          }
          const unique = new Set(nonEmpty.map(item => item.value));
          if (unique.size > 1) {
            nonEmpty.forEach(item => {
              const key = `${item.sheetIndex}:${item.rowIndex}:${item.column}`;
              if (!diffHighlights.has(key)) diffHighlights.set(key, 'bg-yellow-900/40');
            });
          }
        });
      }

      const baseSheet = workbookData.sheets[baseSheetIndex] || {};
      const baseRows = Array.isArray(baseSheet.rows) ? baseSheet.rows : [];
      const baseMatches = matchesBySheet[baseSheetIndex];
      const baseInfo = baseMatches.map(rowIndex => {
        const row = baseRows[rowIndex] || [];
        return {
          part: normalizeDisplay(row[0]) || partDisplay,
          label: normalizeDisplay(row[1])
        };
      });

      const hiddenCols = new Set([0, 1]);

      const totalMatches = matchesBySheet.reduce((sum, list) => sum + list.length, 0);
      summary = {
        meldung: meldDisplay,
        partNumber: partDisplay,
        matches: totalMatches,
        lastSaved: lastSavedAt ? formatDateTime(lastSavedAt) : '–'
      };

      sheetOrder.forEach(sheetIndex => {
        const sheet = workbookData.sheets[sheetIndex] || {};
        const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
        const colCount = colCounts[sheetIndex] || 2;
        const isBaseSheet = sheetIndex === baseSheetIndex;
        const matches = matchesBySheet[sheetIndex];
        const state = getTableState(sheetIndex);
        const filterValue = (state.filter || '').trim().toLowerCase();

        const wrapper = document.createElement('div');
        wrapper.className = 'flex min-h-0 min-w-[320px] max-w-full flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900/50 shadow-lg backdrop-blur';

        const headerBar = document.createElement('div');
        headerBar.className = 'flex items-center justify-between gap-2 border-b border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-100';
        const title = document.createElement('span');
        title.className = 'truncate';
        title.textContent = sheet.name || `Tabelle ${sheetIndex + 1}`;
        headerBar.appendChild(title);
        const addBtn = document.createElement('button');
        addBtn.className = 'rounded-md bg-slate-800/70 px-2 py-1 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-700/80';
        addBtn.textContent = '➕ Neues Finding';
        addBtn.addEventListener('click', () => addNewFinding(sheetIndex));
        headerBar.appendChild(addBtn);
        wrapper.appendChild(headerBar);

        const controls = document.createElement('div');
        controls.className = 'border-b border-slate-800 bg-slate-900/60 px-3 py-2';
        const search = document.createElement('input');
        search.type = 'search';
        search.placeholder = 'Suche…';
        search.value = state.filter || '';
        search.className = 'w-full rounded-md border border-slate-700 bg-slate-900/40 px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500';
        search.addEventListener('input', event => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement)) return;
          const rawValue = target.value || '';
          const selectionStart = typeof target.selectionStart === 'number'
            ? target.selectionStart
            : rawValue.length;
          const selectionEnd = typeof target.selectionEnd === 'number'
            ? target.selectionEnd
            : selectionStart;
          pendingSearchFocus = {
            sheetIndex,
            selectionStart,
            selectionEnd
          };
          filterTable(sheetIndex, rawValue);
        });
        controls.appendChild(search);
        if (pendingSearchFocus && pendingSearchFocus.sheetIndex === sheetIndex) {
          const focusData = pendingSearchFocus;
          pendingSearchFocus = null;
          const applyFocus = () => {
            if (typeof search.focus === 'function') {
              try {
                search.focus({ preventScroll: true });
              } catch (err) {
                search.focus();
              }
            }
            if (typeof search.setSelectionRange === 'function') {
              const length = search.value.length;
              let start = Number.isInteger(focusData.selectionStart)
                ? focusData.selectionStart
                : length;
              let end = Number.isInteger(focusData.selectionEnd)
                ? focusData.selectionEnd
                : start;
              start = Math.max(0, Math.min(start, length));
              end = Math.max(start, Math.min(end, length));
              try {
                search.setSelectionRange(start, end);
              } catch (e) {
                /* ignore selection errors */
              }
            }
          };
          if (typeof requestAnimationFrame === 'function') requestAnimationFrame(applyFocus);
          else setTimeout(applyFocus, 0);
        }
        wrapper.appendChild(controls);

        const scroller = document.createElement('div');
        scroller.className = 'relative flex-1 overflow-auto';
        const table = document.createElement('table');
        table.className = 'min-w-full text-left text-xs text-slate-100';

        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        headRow.className = 'bg-slate-900/80';
        for (let c = 0; c < colCount; c += 1) {
          const th = document.createElement('th');
          th.className = 'sticky top-0 z-20 border border-slate-700 bg-slate-900/90 px-2 py-1 text-left font-semibold text-slate-100 backdrop-blur-sm cursor-pointer select-none whitespace-pre-wrap';
          th.dataset.sheetIndex = String(sheetIndex);
          th.dataset.rowIndex = '0';
          th.dataset.colIndex = String(c);
          th.spellcheck = false;
          const headerText = rows[0]?.[c] ?? '';
          const isSortedColumn = globalSort.sheetIndex === sheetIndex && globalSort.column === c;
          th.textContent = isSortedColumn ? `${headerText} ${globalSort.direction === -1 ? '↓' : '↑'}` : headerText;
          if (!isBaseSheet && hiddenCols.has(c)) {
            th.classList.add('hidden');
          } else {
            th.addEventListener('click', event => {
              event.preventDefault();
              event.stopPropagation();
              sortTable(sheetIndex, c);
            });
          }
          headRow.appendChild(th);
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        const orderPositions = Array.isArray(sortedPositions) && sortedPositions.length
          ? sortedPositions
          : matches.map((_, idx) => idx);
        const orderedRowIndexes = orderPositions
          .map(position => matches[position])
          .filter(rowIndex => Number.isInteger(rowIndex));

        const rowsForRender = orderedRowIndexes.filter(rowIndex => {
          if (!filterValue) return true;
          const row = rows[rowIndex] || [];
          return row.some(cell => normalizeDisplay(cell).toLowerCase().includes(filterValue));
        });

        rowsForRender.forEach(rowIndex => {
          const rowValues = rows[rowIndex] || [];
          const position = matchPositionMaps[sheetIndex]?.get(rowIndex) ?? 0;
          const info = baseInfo[position] || {
            part: normalizeDisplay(rowValues[0]) || partDisplay,
            label: normalizeDisplay(rowValues[1])
          };
          const tr = createBodyRow(sheetIndex, rowIndex, colCount, rowValues, false, {
            hiddenCols: !isBaseSheet ? hiddenCols : null,
            ensureBase: !isBaseSheet ? JSON.stringify({ part: info.part, label: info.label }) : null,
            diffMap: diffHighlights
          });
          if (isBaseSheet && tr) {
            const cells = tr.querySelectorAll('td');
            if (cells[0]) {
              const targets = [];
              sheetOrder.forEach(otherIndex => {
                if (otherIndex === sheetIndex) return;
                const otherRowIndex = matchesBySheet[otherIndex]?.[position];
                if (Number.isInteger(otherRowIndex)) targets.push(`${otherIndex}:${otherRowIndex}:0`);
              });
              if (targets.length) cells[0].dataset.mirror = targets.join(';');
            }
            if (cells[1]) {
              const targets = [];
              sheetOrder.forEach(otherIndex => {
                if (otherIndex === sheetIndex) return;
                const otherRowIndex = matchesBySheet[otherIndex]?.[position];
                if (Number.isInteger(otherRowIndex)) targets.push(`${otherIndex}:${otherRowIndex}:1`);
              });
              if (targets.length) cells[1].dataset.mirror = targets.join(';');
            }
          }
          tbody.appendChild(tr);
        });

        const placeholderDefaults = new Array(colCount).fill('');
        placeholderDefaults[0] = partDisplay;
        placeholderDefaults[1] = normalizeDisplay(activeMeldung);
        const placeholderRowIndex = newRowTargets[sheetIndex];
        const placeholderEnsure = JSON.stringify({ part: partDisplay, label: normalizeDisplay(activeMeldung) });
        const placeholder = createBodyRow(sheetIndex, placeholderRowIndex, colCount, null, true, {
          hiddenCols: !isBaseSheet ? hiddenCols : null,
          ensureBase: placeholderEnsure,
          defaultValues: placeholderDefaults,
          lockCols: new Set([0, 1]),
          diffMap: diffHighlights
        });
        if (placeholder) {
          if (isBaseSheet) {
            const cells = placeholder.querySelectorAll('td');
            if (cells[0]) {
              cells[0].textContent = partDisplay;
              cells[0].contentEditable = 'false';
              const targets = [];
              sheetOrder.forEach(otherIndex => {
                if (otherIndex === sheetIndex) return;
                const rowIndexTarget = newRowTargets[otherIndex];
                if (Number.isInteger(rowIndexTarget)) targets.push(`${otherIndex}:${rowIndexTarget}:0`);
              });
              if (targets.length) cells[0].dataset.mirror = targets.join(';');
            }
            if (cells[1]) {
              const targets = [];
              sheetOrder.forEach(otherIndex => {
                if (otherIndex === sheetIndex) return;
                const rowIndexTarget = newRowTargets[otherIndex];
                if (Number.isInteger(rowIndexTarget)) targets.push(`${otherIndex}:${rowIndexTarget}:1`);
              });
              if (targets.length) cells[1].dataset.mirror = targets.join(';');
            }
          } else {
            placeholder.querySelectorAll('td').forEach(td => {
              if (!td.dataset.ensureBase) td.dataset.ensureBase = placeholderEnsure;
            });
          }
          tbody.appendChild(placeholder);
        }

        table.appendChild(tbody);
        scroller.appendChild(table);
        wrapper.appendChild(scroller);
        tableInner.appendChild(wrapper);
      });

      if (!anyMatches) {
        showHint(`Keine Einträge für P/N ${partDisplay || '–'} gefunden – neue Zeile hinzufügen.`);
      } else {
        hideHint();
      }

      updateDashboardInfo(summary);

      if (pendingFocus) {
        const { sheetIndex, rowIndex } = pendingFocus;
        const focusCell = tableInner.querySelector(`[data-sheet-index="${sheetIndex}"][data-row-index="${rowIndex}"][contenteditable="true"]`);
        if (focusCell) {
          focusCell.focus({ preventScroll: false });
          const selection = window.getSelection();
          if (selection && focusCell.firstChild) {
            const range = document.createRange();
            range.selectNodeContents(focusCell);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        pendingFocus = null;
      }
    }

    function compareCellValues(a, b){
      const valueA = normalizeDisplay(a);
      const valueB = normalizeDisplay(b);
      const numA = Number(valueA.replace?.(',', '.') ?? valueA);
      const numB = Number(valueB.replace?.(',', '.') ?? valueB);
      const isNumeric = !Number.isNaN(numA) && !Number.isNaN(numB) && valueA !== '' && valueB !== '';
      if (isNumeric) return numA - numB;
      return valueA.localeCompare(valueB, undefined, { sensitivity: 'base' });
    }

    function sortTable(sheetIndex, columnIndex){
      if (!Number.isInteger(sheetIndex) || sheetIndex < 0) return;
      if (!Number.isInteger(columnIndex) || columnIndex < 0) return;
      if (!workbookData.sheets[sheetIndex]) return;
      let direction = 1;
      if (globalSort.sheetIndex === sheetIndex && globalSort.column === columnIndex) {
        direction = globalSort.direction === 1 ? -1 : 1;
      }
      globalSort = { sheetIndex, column: columnIndex, direction };
      renderTables();
    }

    function filterTable(sheetIndex, value){
      if (!Number.isInteger(sheetIndex) || sheetIndex < 0) return;
      const state = getTableState(sheetIndex);
      state.filter = value || '';
      renderTables();
    }

    function ensureHeaderRow(sheet){
      if (!Array.isArray(sheet.rows)) sheet.rows = [[]];
      if (!sheet.rows.length) sheet.rows.push([]);
      if (!Array.isArray(sheet.rows[0])) sheet.rows[0] = [];
    }

    function insertNewFindingRow(sheetIndex){
      const sheet = workbookData.sheets[sheetIndex];
      if (!sheet) return null;
      ensureHeaderRow(sheet);
      const labelValue = normalizeDisplay(activeMeldung);
      const newRow = [];
      newRow[0] = normalizeDisplay(activePartNumber);
      newRow[1] = labelValue || '';
      sheet.rows.push(newRow);
      return sheet.rows.length - 1;
    }

    function addNewFinding(sheetIndex){
      if (!Number.isInteger(sheetIndex) || sheetIndex < 0) return;
      const part = normalizeDisplay(activePartNumber);
      if (!part) {
        setStatusNote('Keine Partnummer zur aktuellen Meldung');
        return;
      }
      const rowIndex = insertNewFindingRow(sheetIndex);
      if (rowIndex == null) return;
      pendingFocus = { sheetIndex, rowIndex };
      renderTables();
      saveToLocalStorage();
      scheduleWorkbookWrite();
    }

    function addNewFindingAll(){
      const part = normalizeDisplay(activePartNumber);
      if (!part) {
        setStatusNote('Keine Partnummer zur aktuellen Meldung');
        return;
      }
      const inserted = [];
      workbookData.sheets.forEach((sheet, idx) => {
        const rowIndex = insertNewFindingRow(idx);
        if (rowIndex != null) inserted.push({ sheetIndex: idx, rowIndex });
      });
      if (!inserted.length) return;
      pendingFocus = inserted[0];
      renderTables();
      saveToLocalStorage();
      scheduleWorkbookWrite();
    }

    function createBodyRow(sheetIndex, rowIndex, colCount, values, isPlaceholder, options = {}){
      const tr = document.createElement('tr');
      const rowClass = options.rowClass || (rowIndex % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/20');
      tr.className = rowClass;
      if (isPlaceholder) tr.dataset.placeholder = 'true';

      const hiddenCols = options.hiddenCols instanceof Set ? options.hiddenCols : null;
      const lockCols = options.lockCols instanceof Set ? options.lockCols : null;
      const defaultValues = Array.isArray(options.defaultValues) ? options.defaultValues : null;
      const ensureBase = options.ensureBase || null;
      const diffMap = options.diffMap instanceof Map ? options.diffMap : null;

      for (let c = 0; c < colCount; c += 1) {
        const cell = document.createElement('td');
        cell.className = 'border border-slate-800 px-2 py-1 whitespace-pre-wrap align-top';
        cell.spellcheck = false;
        cell.dataset.sheetIndex = String(sheetIndex);
        cell.dataset.rowIndex = String(rowIndex);
        cell.dataset.colIndex = String(c);
        if (isPlaceholder) cell.dataset.placeholder = 'true';
        if (ensureBase) cell.dataset.ensureBase = ensureBase;

        const value = values ? (values[c] ?? '') : (defaultValues ? defaultValues[c] ?? '' : '');
        cell.textContent = value;
        if (value) cell.title = value;

        let editable = true;
        if (hiddenCols && hiddenCols.has(c)) {
          cell.classList.add('hidden');
          editable = false;
        }
        if (lockCols && lockCols.has(c)) editable = false;
        if (c === 0 || c === 1) {
          editable = false;
          cell.classList.add('bg-slate-800/60');
        }

        if (diffMap) {
          const diffClass = diffMap.get(`${sheetIndex}:${rowIndex}:${c}`);
          if (diffClass) cell.classList.add(diffClass);
        }

        cell.contentEditable = editable ? 'true' : 'false';

        tr.appendChild(cell);
      }
      return tr;
    }

    function scheduleRender(){
      if (renderTimer) clearTimeout(renderTimer);
      renderTimer = setTimeout(() => {
        renderTimer = null;
        renderTables();
      }, RERENDER_DEBOUNCE_MS);
    }

    function updatePartNumber(options = {}){
      const desired = lookupPartNumber(activeMeldung, dictionary);
      const trimmed = normalizeDisplay(desired);
      const changed = trimmed !== activePartNumber;
      activePartNumber = trimmed;
      if (changed || options.force) renderTables();
      updateStatus();
    }

    function refreshMeldung(options = {}){
      const current = readActiveMeldung();
      if (current !== activeMeldung) {
        activeMeldung = current;
        updatePartNumber({ force: true });
      } else if (options.force) {
        updatePartNumber({ force: true });
      } else {
        updateStatus();
      }
    }

    function refreshDictionaryFromStorage(){
      const stored = loadStoredDict();
      dictionary = stored.entries;
      dictionaryName = stored.name || '';
      updatePartNumber({ force: true });
    }

    function startMeldungWatcher(){
      try {
        lastModuleDoc = localStorage.getItem(MODULE_DOC_KEY);
      } catch {
        lastModuleDoc = null;
      }
      storageListener = (event) => {
        if (event.key === MODULE_DOC_KEY) {
          lastModuleDoc = event.newValue;
          refreshMeldung({ force: true });
        }
        if (event.key === DICT_DATA_KEY || event.key === DICT_NAME_KEY) {
          refreshDictionaryFromStorage();
        }
      };
      window.addEventListener('storage', storageListener);
      meldungInterval = setInterval(() => {
        try {
          const current = localStorage.getItem(MODULE_DOC_KEY);
          if (current !== lastModuleDoc) {
            lastModuleDoc = current;
            refreshMeldung({ force: true });
          }
        } catch (e) {
          console.warn('fs: Meldung-Watcher Fehler', e);
        }
      }, WATCH_INTERVAL);
    }

    function saveToLocalStorage(){
      try {
        const meta = {
          updatedAt: new Date().toISOString(),
          sourceType: currentSource?.type || null,
          sourceUrl: currentSource?.type === 'url' ? currentSource.url : null,
          sourceName: currentSource?.name || '',
          fileName: currentFileName || ''
        };
        const payload = {
          sheets: workbookData.sheets.map(sheet => ({
            name: sheet.name,
            rows: sheet.rows
          })),
          meta
        };
        localStorage.setItem(DATA_KEY, JSON.stringify(payload));
        if (currentFileName) localStorage.setItem(FILE_KEY, currentFileName);
        lastSavedAt = new Date(meta.updatedAt);
        if (lastDashboardSummary) {
          const summary = {
            ...lastDashboardSummary,
            lastSaved: lastSavedAt ? formatDateTime(lastSavedAt) : '–'
          };
          updateDashboardInfo(summary);
        }
      } catch (e) {
        console.warn('fs: localStorage speichern fehlgeschlagen', e);
      }
      updateStatus();
    }

    function scheduleWorkbookWrite(){
      if (writeTimer) clearTimeout(writeTimer);
      writeTimer = setTimeout(() => {
        writeTimer = null;
        queueWorkbookWrite();
      }, SAVE_DEBOUNCE_MS);
    }

    function queueWorkbookWrite(){
      writePromise = writePromise.then(() => writeWorkbook()).catch(err => {
        console.warn('fs: Schreiben fehlgeschlagen', err);
        setStatusNote('Speichern fehlgeschlagen');
      });
    }

    async function writeWorkbook(){
      if (!workbookData.sheets.length) return;
      const xlsx = await ensureXLSX();
      const wb = xlsx.utils.book_new();
      workbookData.sheets.forEach((sheet, index) => {
        const rows = Array.isArray(sheet.rows) ? sheet.rows.map(row => {
          if (!Array.isArray(row)) return [];
          return row.map(cell => (cell == null ? '' : String(cell)));
        }) : [[]];
        if (!rows.length) rows.push([]);
        const ws = xlsx.utils.aoa_to_sheet(rows);
        xlsx.utils.book_append_sheet(wb, ws, sanitizeSheetName(sheet.name, index));
      });
      const targetName = currentFileName || DEFAULT_FILE;
      try {
        if (currentSource?.type === 'handle' && currentSource.handle) {
          const ok = await ensureRWPermission(currentSource.handle);
          if (!ok) throw new Error('Keine Berechtigung zum Schreiben');
          await Promise.resolve(xlsx.writeFile(wb, currentSource.handle, { bookType: 'xlsx' }));
        } else {
          await Promise.resolve(xlsx.writeFile(wb, targetName, { bookType: 'xlsx' }));
        }
        showFeedback('✅ gespeichert');
        setStatusNote('Gespeichert');
      } catch (e) {
        console.error('fs: Schreiben fehlgeschlagen', e);
        setStatusNote('Speichern fehlgeschlagen');
      }
    }

    async function loadFromBuffer(buffer, fileName, sourceInfo){
      const xlsx = await ensureXLSX();
      let wb;
      try {
        wb = xlsx.read(buffer, { type: 'array' });
      } catch (e) {
        console.error('fs: Excel konnte nicht gelesen werden', e);
        setStatusNote('Excel-Datei ungültig');
        return;
      }
      const sheetNames = wb.SheetNames && wb.SheetNames.length ? wb.SheetNames : ['Sheet1'];
      const sheets = sheetNames.map(name => {
        const ws = wb.Sheets[name];
        const rows = ws ? xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' }) : [[]];
        return {
          name,
          rows: normalizeRows(rows)
        };
      });
      workbookData.sheets = sheets;
      currentFileName = fileName || currentFileName || '';
      tableStates.clear();
      globalSort = { sheetIndex: null, column: null, direction: 1 };
      if (sourceInfo) {
        currentSource = { ...sourceInfo, name: fileName || sourceInfo.name || currentFileName };
      } else {
        currentSource = null;
      }
      renderTables();
      saveToLocalStorage();
      setStatusNote('Datei geladen');
    }

    async function tryLoadDefaultFile(){
      try {
        const res = await fetch(DEFAULT_FILE, { cache: 'no-store' });
        if (!res.ok) return false;
        const buffer = await res.arrayBuffer();
        await loadFromBuffer(buffer, DEFAULT_FILE, { type: 'url', url: DEFAULT_FILE, name: DEFAULT_FILE });
        return true;
      } catch (e) {
        console.warn('fs: Standarddatei nicht gefunden', e);
        return false;
      }
    }

    async function chooseExcel(){
      if (!workbookData.sheets.length && !currentFileName) {
        const loaded = await tryLoadDefaultFile();
        if (loaded) {
          setStatusNote('Standarddatei geladen');
          return;
        }
      }
      if ('showOpenFilePicker' in window) {
        try {
          const [handle] = await window.showOpenFilePicker({
            multiple: false,
            types: [{ description: 'Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }]
          });
          if (!handle) return;
          const ok = await ensureRWPermission(handle);
          if (!ok) {
            setStatusNote('Zugriff verweigert');
            return;
          }
          const file = await handle.getFile();
          await loadFromBuffer(await file.arrayBuffer(), handle.name, { type: 'handle', handle, name: handle.name });
        } catch (e) {
          if (e && e.name === 'AbortError') return;
          console.warn('fs: Auswahl fehlgeschlagen', e);
          setStatusNote('Auswahl fehlgeschlagen');
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx';
        input.onchange = async () => {
          const file = input.files && input.files[0];
          if (!file) return;
          await loadFromBuffer(await file.arrayBuffer(), file.name, { type: 'file', file, name: file.name });
        };
        input.click();
      }
    }

    async function chooseDictionary(){
      try {
        if ('showOpenFilePicker' in window) {
          const [handle] = await window.showOpenFilePicker({
            multiple: false,
            types: [{
              description: 'Dictionary',
              accept: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xlsm'],
                'application/vnd.ms-excel': ['.xls'],
                'text/csv': ['.csv']
              }
            }]
          });
          if (!handle) return;
          const file = await handle.getFile();
          await loadDictionaryFile(file);
        } else {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.xlsx,.xls,.xlsm,.csv';
          input.onchange = async () => {
            const file = input.files && input.files[0];
            if (!file) return;
            await loadDictionaryFile(file);
          };
          input.click();
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return;
        console.warn('fs: Dictionary Auswahl fehlgeschlagen', e);
        setStatusNote('Dictionary konnte nicht geladen werden');
      }
    }

    async function loadDictionaryFile(file){
      if (!file) return;
      const name = file.name || '';
      try {
        const xlsx = await ensureXLSX();
        const lower = name.toLowerCase();
        let wb;
        if (lower.endsWith('.csv')) {
          const text = await file.text();
          wb = xlsx.read(text, { type: 'string' });
        } else {
          const buffer = await file.arrayBuffer();
          wb = xlsx.read(buffer, { type: 'array' });
        }
        const sheetName = wb.SheetNames && wb.SheetNames.length ? wb.SheetNames[0] : null;
        if (!sheetName) {
          setStatusNote('Dictionary ohne Tabellenblatt');
          return;
        }
        const ws = wb.Sheets[sheetName];
        const rows = ws ? xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' }) : [];
        const entries = parseDictionaryRows(rows);
        if (!entries.length) {
          setStatusNote('Dictionary ohne gültige Einträge');
          return;
        }
        dictionary = entries;
        dictionaryName = name;
        saveDictionary(entries, name);
        setStatusNote('Dictionary geladen');
        updatePartNumber({ force: true });
      } catch (e) {
        console.warn('fs: Dictionary konnte nicht gelesen werden', e);
        setStatusNote('Dictionary ungültig');
      }
    }

    function parseDictionaryRows(rows){
      if (!Array.isArray(rows) || !rows.length) return [];
      const header = Array.isArray(rows[0]) ? rows[0] : [];
      const meldIdxCandidates = ['meldung', 'meldungnr', 'meldungnummer', 'meldung no', 'meldung_nr'];
      const partIdxCandidates = ['part', 'partnummer', 'part number', 'p/n', 'pn', 'partno', 'teil'];
      let meldIdx = findHeaderIndex(header, meldIdxCandidates);
      let partIdx = findHeaderIndex(header, partIdxCandidates);
      if (meldIdx < 0 && partIdx < 0) {
        meldIdx = 0;
        partIdx = header.length > 1 ? 1 : 0;
      } else {
        if (meldIdx < 0) meldIdx = partIdx === 0 ? 1 : 0;
        if (partIdx < 0) partIdx = meldIdx === 0 ? 1 : 0;
        if (meldIdx === partIdx) partIdx = partIdx === 0 ? 1 : 0;
      }
      const getCell = (row, index) => (Array.isArray(row) && index < row.length ? row[index] : '');
      const entries = [];
      for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i];
        const entry = makeDictEntry(getCell(row, meldIdx), getCell(row, partIdx));
        if (entry && entry.part) entries.push(entry);
      }
      return entries;
    }

    async function reloadLast(){
      if (!currentSource) {
        const loaded = await tryLoadDefaultFile();
        if (loaded) {
          setStatusNote('Standarddatei geladen');
        } else {
          setStatusNote('Keine Datei zum Neu laden');
        }
        return;
      }
      try {
        if (currentSource.type === 'handle' && currentSource.handle) {
          const ok = await ensureRWPermission(currentSource.handle);
          if (!ok) {
            setStatusNote('Zugriff verweigert');
            return;
          }
          const file = await currentSource.handle.getFile();
          await loadFromBuffer(await file.arrayBuffer(), currentSource.name || currentFileName, currentSource);
        } else if (currentSource.type === 'url' && currentSource.url) {
          const res = await fetch(currentSource.url, { cache: 'no-store' });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const buffer = await res.arrayBuffer();
          await loadFromBuffer(buffer, currentSource.name || currentFileName, currentSource);
        } else if (currentSource.type === 'file' && currentSource.file) {
          await loadFromBuffer(await currentSource.file.arrayBuffer(), currentSource.name || currentFileName, currentSource);
        } else {
          setStatusNote('Quelle unbekannt');
        }
      } catch (e) {
        console.warn('fs: Neu laden fehlgeschlagen', e);
        setStatusNote('Neu laden fehlgeschlagen');
      }
    }

    function handleCellInput(event){
      const cell = event.target.closest('[data-sheet-index]');
      if (!cell) return;
      const sheetIndex = Number(cell.dataset.sheetIndex);
      const rowIndex = Number(cell.dataset.rowIndex);
      const colIndex = Number(cell.dataset.colIndex);
      if (!Number.isFinite(sheetIndex) || !Number.isFinite(rowIndex) || !Number.isFinite(colIndex)) return;
      const sheet = workbookData.sheets[sheetIndex];
      if (!sheet) return;
      if (!Array.isArray(sheet.rows)) sheet.rows = [[]];
      const beforeLength = sheet.rows.length;
      const value = getCellText(cell).replace(/\n+$/, '');

      while (sheet.rows.length <= rowIndex) sheet.rows.push([]);
      const row = Array.isArray(sheet.rows[rowIndex]) ? sheet.rows[rowIndex] : [];
      const rowWasEmpty = !row.length || row.every(entry => entry === '');

      const ensureBaseData = parseEnsureBase(cell.dataset.ensureBase);
      if (ensureBaseData) {
        if (ensureBaseData.part && (rowWasEmpty || !row[0])) row[0] = ensureBaseData.part;
        if (ensureBaseData.label && (rowWasEmpty || row[1] == null || row[1] === '')) row[1] = ensureBaseData.label;
      } else if (rowWasEmpty && activePartNumber) {
        row[0] = row[0] || activePartNumber;
      }

      while (row.length <= colIndex) row.push('');
      row[colIndex] = value;
      trimRow(row);
      sheet.rows[rowIndex] = row;
      if (rowIndex > 0) trimTrailingRows(sheet.rows);
      if (rowIndex === 0 && isRowEmpty(row)) sheet.rows[rowIndex] = [];

      const mirrorTargets = (cell.dataset.mirror || '').split(';').filter(Boolean);
      mirrorTargets.forEach(target => {
        const [s, r, c] = target.split(':').map(n => Number(n));
        if (!Number.isFinite(s) || !Number.isFinite(r) || !Number.isFinite(c)) return;
        const targetSheet = workbookData.sheets[s];
        if (!targetSheet) return;
        if (!Array.isArray(targetSheet.rows)) targetSheet.rows = [[]];
        while (targetSheet.rows.length <= r) targetSheet.rows.push([]);
        const targetRow = Array.isArray(targetSheet.rows[r]) ? targetSheet.rows[r] : [];
        const targetRowWasEmpty = !targetRow.length || targetRow.every(entry => entry === '');
        const ensure = ensureBaseData || (colIndex !== 0 && colIndex !== 1 && activePartNumber ? { part: activePartNumber, label: '' } : null);
        if (ensure) {
          if (ensure.part && (targetRowWasEmpty || !targetRow[0])) targetRow[0] = ensure.part;
          if (ensure.label && (targetRowWasEmpty || targetRow[1] == null || targetRow[1] === '')) targetRow[1] = ensure.label;
        }
        while (targetRow.length <= c) targetRow.push('');
        targetRow[c] = value;
        trimRow(targetRow);
        targetSheet.rows[r] = targetRow;
        if (r > 0) trimTrailingRows(targetSheet.rows);
        if (r === 0 && isRowEmpty(targetRow)) targetSheet.rows[r] = [];
      });

      const tbody = cell.closest('tbody');
      const isPlaceholder = cell.dataset.placeholder === 'true' || cell.parentElement?.dataset.placeholder === 'true';
      if (isPlaceholder && tbody) {
        const rowEl = cell.parentElement;
        if (rowEl) {
          delete rowEl.dataset.placeholder;
          rowEl.querySelectorAll('[data-placeholder="true"]').forEach(el => delete el.dataset.placeholder);
        }
        delete cell.dataset.placeholder;
        scheduleRender();
      } else if (colIndex === 0) {
        scheduleRender();
      }
      const afterLength = sheet.rows.length;
      if (afterLength < beforeLength) {
        renderTables();
      }
      saveToLocalStorage();
      scheduleWorkbookWrite();
    }

    function openMenu(e){
      if (!targetDiv.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      menu.classList.remove('hidden');
      const rect = menu.getBoundingClientRect();
      const width = rect.width || 200;
      const height = rect.height || 96;
      const pad = 8;
      menu.style.left = `${clamp(e.clientX, pad, window.innerWidth - width - pad)}px`;
      menu.style.top = `${clamp(e.clientY, pad, window.innerHeight - height - pad)}px`;
    }

    function hideMenu(){
      menu.classList.add('hidden');
    }

    function handleKeydown(e){
      if (e.key === 'Escape') hideMenu();
    }

    targetDiv.addEventListener('contextmenu', openMenu);
    window.addEventListener('click', hideMenu);
    window.addEventListener('keydown', handleKeydown);
    tableContainer.addEventListener('input', handleCellInput);

    menu.querySelector('[data-action="choose"]').addEventListener('click', () => {
      hideMenu();
      chooseExcel();
    });
    menu.querySelector('[data-action="reload"]').addEventListener('click', () => {
      hideMenu();
      reloadLast();
    });
    menu.querySelector('[data-action="dict"]').addEventListener('click', () => {
      hideMenu();
      chooseDictionary();
    });

    const cleanupObserver = new MutationObserver(() => {
      if (!document.body.contains(targetDiv)) cleanup();
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });

    function cleanup(){
      cleanupObserver.disconnect();
      targetDiv.removeEventListener('contextmenu', openMenu);
      window.removeEventListener('click', hideMenu);
      window.removeEventListener('keydown', handleKeydown);
      tableContainer.removeEventListener('input', handleCellInput);
      menu.remove();
      if (statusNoteTimer) clearTimeout(statusNoteTimer);
      if (feedbackTimer) clearTimeout(feedbackTimer);
      if (writeTimer) clearTimeout(writeTimer);
      if (renderTimer) {
        clearTimeout(renderTimer);
        renderTimer = null;
      }
      if (meldungInterval) {
        clearInterval(meldungInterval);
        meldungInterval = null;
      }
      if (storageListener) {
        window.removeEventListener('storage', storageListener);
        storageListener = null;
      }
    }

    startMeldungWatcher();
    refreshMeldung({ force: true });
    updateStatus();
    if (workbookData.sheets.length) {
      setStatusNote('Aus localStorage geladen', 2500);
    }
  };
})();
