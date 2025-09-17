(function(){
  const XLSX_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const DATA_KEY = 'fs-data';
  const FILE_KEY = 'fs-filepath';
  const DEFAULT_FILE = 'Findings_Shopguide.xlsx';
  const SAVE_DEBOUNCE_MS = 400;

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

    targetDiv.innerHTML = `
      <div class="h-full flex flex-col text-slate-100">
        <div class="flex items-center justify-between gap-3 pb-2">
          <div data-status class="text-xs text-slate-300 truncate"></div>
          <div data-feedback class="text-xs text-emerald-400 opacity-0 transition-opacity duration-300">✅ gespeichert</div>
        </div>
        <div data-hint class="text-sm text-slate-400 italic pb-2"></div>
        <div data-table class="flex-1 overflow-auto space-y-6 pr-1"></div>
      </div>
    `;

    const statusEl = targetDiv.querySelector('[data-status]');
    const hintEl = targetDiv.querySelector('[data-hint]');
    const tableContainer = targetDiv.querySelector('[data-table]');
    const feedbackEl = targetDiv.querySelector('[data-feedback]');

    const menu = createMenuElement();
    document.body.appendChild(menu);

    function updateStatus(){
      const parts = [];
      parts.push(currentFileName ? `Datei: ${currentFileName}` : 'Keine Datei geladen');
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

    function renderTables(){
      tableContainer.innerHTML = '';
      if (!workbookData.sheets.length) {
        showHint('Rechtsklick → Excel wählen');
        return;
      }
      hideHint();
      workbookData.sheets.forEach((sheet, sheetIndex) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'rounded-lg border border-slate-700 bg-slate-900/50 shadow-lg overflow-hidden';

        const header = document.createElement('div');
        header.className = 'px-3 py-2 text-sm font-semibold text-slate-100 bg-slate-800/70 border-b border-slate-700';
        header.textContent = sheet.name || `Tabelle ${sheetIndex + 1}`;
        wrapper.appendChild(header);

        const scroller = document.createElement('div');
        scroller.className = 'overflow-x-auto';
        const table = document.createElement('table');
        table.className = 'min-w-full text-left text-xs text-slate-100';

        const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
        let colCount = 0;
        rows.forEach(row => {
          if (Array.isArray(row)) colCount = Math.max(colCount, row.length);
        });
        if (colCount === 0) colCount = 1;

        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        headRow.className = 'bg-slate-800/60';
        for (let c = 0; c < colCount; c += 1) {
          const th = document.createElement('th');
          th.className = 'border border-slate-700 px-2 py-1 font-semibold text-slate-100 whitespace-pre-wrap align-top';
          th.contentEditable = 'true';
          th.spellcheck = false;
          th.dataset.sheetIndex = String(sheetIndex);
          th.dataset.rowIndex = '0';
          th.dataset.colIndex = String(c);
          th.textContent = rows[0]?.[c] ?? '';
          headRow.appendChild(th);
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (let r = 1; r < rows.length; r += 1) {
          const tr = createBodyRow(sheetIndex, r, colCount, rows[r], false);
          tbody.appendChild(tr);
        }
        // Placeholder row for new entries
        const placeholderRow = createBodyRow(sheetIndex, rows.length, colCount, null, true);
        tbody.appendChild(placeholderRow);

        table.appendChild(tbody);
        scroller.appendChild(table);
        wrapper.appendChild(scroller);
        tableContainer.appendChild(wrapper);
      });
    }

    function createBodyRow(sheetIndex, rowIndex, colCount, values, isPlaceholder){
      const tr = document.createElement('tr');
      tr.className = rowIndex % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/20';
      if (isPlaceholder) tr.dataset.placeholder = 'true';
      for (let c = 0; c < colCount; c += 1) {
        const cell = document.createElement('td');
        cell.className = 'border border-slate-800 px-2 py-1 whitespace-pre-wrap align-top';
        cell.contentEditable = 'true';
        cell.spellcheck = false;
        cell.dataset.sheetIndex = String(sheetIndex);
        cell.dataset.rowIndex = String(rowIndex);
        cell.dataset.colIndex = String(c);
        if (isPlaceholder) cell.dataset.placeholder = 'true';
        const value = values ? (values[c] ?? '') : '';
        cell.textContent = value;
        tr.appendChild(cell);
      }
      return tr;
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
      const row = sheet.rows[rowIndex] || [];
      while (row.length <= colIndex) row.push('');
      row[colIndex] = value;
      trimRow(row);
      sheet.rows[rowIndex] = row;
      if (rowIndex > 0) trimTrailingRows(sheet.rows);
      if (rowIndex === 0 && isRowEmpty(row)) sheet.rows[rowIndex] = [];

      const tbody = cell.closest('tbody');
      if (tbody && cell.dataset.placeholder === 'true') {
        const rowEl = cell.parentElement;
        if (rowEl) {
          delete rowEl.dataset.placeholder;
          rowEl.querySelectorAll('[data-placeholder="true"]').forEach(el => delete el.dataset.placeholder);
        }
        delete cell.dataset.placeholder;
        const table = cell.closest('table');
        const headerCols = table ? table.querySelectorAll('thead th').length : 1;
        const newRowIndex = sheet.rows.length;
        const newRow = createBodyRow(sheetIndex, newRowIndex, headerCols || 1, null, true);
        tbody.appendChild(newRow);
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
    }

    if (workbookData.sheets.length) {
      renderTables();
      updateStatus();
      setStatusNote('Aus localStorage geladen', 2500);
    } else {
      renderTables();
      updateStatus();
    }
  };
})();
