(function(){
  const STYLE_ID = 'testings-module-styles';
  const DOC_KEY = 'testings_module_v1';
  const IDB_NAME = 'modulesApp';
  const IDB_STORE = 'fs-handles';
  const DEFAULT_SHEET = 'Tabelle1';

  if(!document.getElementById(STYLE_ID)){
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .ts-root{height:100%;display:flex;flex-direction:column;gap:.75rem;padding:.75rem;box-sizing:border-box;color:var(--testing-main-text,var(--text-color,#fff));}
      .ts-panel{flex:1;display:flex;flex-direction:column;gap:.65rem;min-height:0;padding:.75rem;border-radius:1rem;background:var(--testing-main-bg,var(--module-bg,rgba(17,24,39,.3)));border:1px solid var(--testing-main-border,var(--module-border-color,rgba(148,163,184,.4)));box-shadow:inset 0 1px 0 rgba(255,255,255,.05);}
      .ts-header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem;}
      .ts-title{font-weight:700;font-size:1rem;}
      .ts-status{font-size:.85rem;opacity:.85;min-height:1.2rem;}
      .ts-controls{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;padding:.55rem;border-radius:.75rem;background:var(--testing-alt-bg,var(--module-bg,rgba(15,23,42,.25)));border:1px solid var(--testing-alt-border,var(--module-border-color,rgba(148,163,184,.2)));}
      .ts-controls label{display:flex;align-items:center;gap:.4rem;font-size:.85rem;}
      .ts-controls input{width:88px;padding:.25rem .4rem;border-radius:.4rem;border:1px solid var(--testing-alt-border,var(--module-border-color,rgba(148,163,184,.2)));background:rgba(255,255,255,.08);color:inherit;}
      .ts-btn{border:none;border-radius:.6rem;padding:.35rem .75rem;font-weight:600;cursor:pointer;background:var(--testing-accent-bg,var(--module-bg,rgba(59,130,246,.45)));color:var(--testing-accent-text,var(--text-color,#fff));border:1px solid var(--testing-accent-border,transparent);}
      .ts-btn.secondary{background:transparent;color:inherit;border:1px solid var(--testing-main-border,var(--module-border-color,rgba(148,163,184,.4)));}
      .ts-btn:disabled{opacity:.6;cursor:not-allowed;}
      .ts-file{font-size:.85rem;opacity:.85;}
      .ts-table-wrap{flex:1;overflow:auto;border-radius:.75rem;border:1px solid var(--testing-main-border,var(--module-border-color,rgba(148,163,184,.3)));}
      .ts-table{width:100%;border-collapse:collapse;font-size:.82rem;}
      .ts-table th,.ts-table td{padding:.35rem .5rem;border-right:1px solid var(--testing-main-border,var(--module-border-color,rgba(148,163,184,.2)));vertical-align:top;}
      .ts-table th:last-child,.ts-table td:last-child{border-right:none;}
      .ts-table thead th{position:sticky;top:0;background:var(--testing-main-bg,var(--module-bg,rgba(15,23,42,.85)));z-index:1;text-align:left;font-weight:600;}
      .ts-table tbody tr:not(.ts-block-row) td{border-bottom:none;}
      .ts-data-row{background:linear-gradient(90deg,var(--testing-alt-bg,var(--module-bg,rgba(15,23,42,.25))) 0 6px,transparent 6px);}
      .ts-row--block-start td{border-top:1px solid var(--testing-alt-border,var(--module-border-color,rgba(148,163,184,.2)));}
      .ts-block-row td{padding:.45rem .6rem;font-weight:700;font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;background:var(--testing-alt-bg,var(--module-bg,rgba(15,23,42,.25)));color:var(--testing-alt-text,var(--text-color,#fff));border-top:1px solid var(--testing-alt-border,var(--module-border-color,rgba(148,163,184,.2)));border-bottom:1px solid var(--testing-alt-border,var(--module-border-color,rgba(148,163,184,.2)));}
      .ts-block-label{display:inline-flex;align-items:center;gap:.35rem;}
      .ts-block-label::before{content:'';width:.6rem;height:.6rem;border-radius:.2rem;background:var(--testing-accent-bg,var(--module-bg,rgba(59,130,246,.45)));border:1px solid var(--testing-accent-border,transparent);}
      .ts-block-title{font-weight:500;text-transform:none;letter-spacing:normal;opacity:.85;margin-left:.35rem;}
      .ts-row--go{background:color-mix(in srgb,var(--testing-accent-bg,var(--module-bg,#1e293b)) 18%, transparent);}
      .ts-row--nogo{background:color-mix(in srgb,var(--testing-alt-bg,var(--module-bg,#0f172a)) 28%, transparent);}
      .ts-row--warn{background:color-mix(in srgb,var(--testing-main-bg,var(--module-bg,#0f172a)) 40%, transparent);}
      .ts-badge{display:inline-flex;align-items:center;gap:.25rem;padding:.1rem .45rem;border-radius:.45rem;font-size:.72rem;font-weight:600;border:1px solid transparent;}
      .ts-badge.go{background:var(--testing-accent-bg,var(--module-bg,#1e40af));color:var(--testing-accent-text,#fff);border-color:var(--testing-accent-border,transparent);}
      .ts-badge.nogo{background:var(--testing-alt-bg,var(--module-bg,#1f2937));color:var(--testing-alt-text,#fff);border-color:var(--testing-alt-border,transparent);}
      .ts-badge.warn{background:transparent;color:inherit;border-color:var(--testing-main-border,var(--module-border-color,rgba(148,163,184,.4)));}
      .ts-footer{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;font-size:.75rem;opacity:.85;}
      .ts-palettes{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;}
      .ts-palette{display:inline-flex;align-items:center;gap:.35rem;padding:.15rem .45rem;border-radius:.5rem;border:1px solid var(--ts-palette-border,transparent);background:var(--ts-palette-bg,transparent);color:var(--ts-palette-text,inherit);font-weight:600;}
      .ts-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.45);z-index:2000;}
      .ts-modal.open{display:flex;}
      .ts-dialog{width:min(92vw,520px);background:#fff;color:#0f172a;border-radius:.9rem;padding:1rem;box-shadow:0 16px 40px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:.75rem;}
      .ts-dialog h3{margin:0;font-size:1rem;}
      .ts-dialog-message{font-size:.9rem;line-height:1.35;white-space:pre-wrap;max-height:220px;overflow:auto;}
      .ts-dialog-input{padding:.45rem .55rem;border-radius:.5rem;border:1px solid #cbd5f5;font-size:.95rem;}
      .ts-dialog-actions{display:flex;gap:.5rem;flex-wrap:wrap;justify-content:flex-end;}
      .ts-dialog-actions .ts-btn{font-size:.85rem;}
    `;
    document.head.appendChild(style);
  }

  function readValue(styles, prop){
    return (styles?.getPropertyValue(prop) || '').trim();
  }

  function readAppLayers(){
    const layers = Array.isArray(window?.appSettings?.moduleColorLayers)
      ? window.appSettings.moduleColorLayers
      : [];
    return layers.map(layer => layer || {});
  }

  function loadLayers(){
    const root = document.documentElement;
    if(!root) return [];
    const styles = getComputedStyle(root);
    const layers = [];

    const baseModuleBg = readValue(styles, '--module-layer-module-bg') || readValue(styles, '--module-bg');
    const baseModuleText = readValue(styles, '--module-layer-module-text') || readValue(styles, '--text-color');
    const baseModuleBorder = readValue(styles, '--module-layer-module-border') || readValue(styles, '--module-border-color');

    const presets = ['Main', 'Alternative', 'Accent'];
    const appLayers = readAppLayers();

    if(appLayers.length){
      appLayers.slice(0, presets.length).forEach((layer, index) => {
        const defaultName = presets[index] || `Layer ${index + 1}`;
        const name = (layer.name || '').trim() || defaultName;
        layers.push({
          id: layer.id || (index === 0 ? 'primary' : String(index)),
          name,
          module: {
            bg: (layer.moduleBg || '').trim() || baseModuleBg,
            text: (layer.moduleText || '').trim() || baseModuleText,
            border: (layer.moduleBorder || '').trim() || baseModuleBorder
          }
        });
      });
    }

    if(!layers.length){
      const cssLayers = [];
      for(let i=1;i<=presets.length;i+=1){
        const name = readValue(styles, `--module-layer-${i}-name`) || presets[i-1];
        const bg = readValue(styles, `--module-layer-${i}-module-bg`);
        const text = readValue(styles, `--module-layer-${i}-module-text`);
        const border = readValue(styles, `--module-layer-${i}-module-border`);
        if(name || bg || text || border){
          cssLayers.push({
            id: i === 1 ? 'primary' : String(i),
            name,
            module: {
              bg: bg || baseModuleBg,
              text: text || baseModuleText,
              border: border || baseModuleBorder
            }
          });
        }
      }
      if(cssLayers.length){
        layers.push(...cssLayers);
      }
    }

    if(!layers.length){
      layers.push({
        id: 'primary',
        name: readValue(styles, '--module-layer-name') || presets[0],
        module: { bg: baseModuleBg, text: baseModuleText, border: baseModuleBorder }
      });
    }

    return layers;
  }

  function applyLayerVars(root, paletteEl){
    const layers = loadLayers();
    const main = layers[0] || {};
    const alt = layers[1] || main;
    const accent = layers[2] || alt;

    root.style.setProperty('--testing-main-bg', main.module?.bg || '');
    root.style.setProperty('--testing-main-text', main.module?.text || '');
    root.style.setProperty('--testing-main-border', main.module?.border || '');
    root.style.setProperty('--testing-alt-bg', alt.module?.bg || main.module?.bg || '');
    root.style.setProperty('--testing-alt-text', alt.module?.text || main.module?.text || '');
    root.style.setProperty('--testing-alt-border', alt.module?.border || main.module?.border || '');
    root.style.setProperty('--testing-accent-bg', accent.module?.bg || alt.module?.bg || '');
    root.style.setProperty('--testing-accent-text', accent.module?.text || alt.module?.text || '');
    root.style.setProperty('--testing-accent-border', accent.module?.border || alt.module?.border || '');

    if(paletteEl){
      paletteEl.innerHTML = '';
      if(layers.length){
        const label = document.createElement('span');
        label.textContent = 'Modul-Farbgruppen (Main, Alternative, Accent):';
        paletteEl.appendChild(label);
        layers.slice(0,3).forEach(layer => {
          const badge = document.createElement('span');
          badge.className = 'ts-palette';
          badge.style.setProperty('--ts-palette-bg', layer.module?.bg || 'transparent');
          badge.style.setProperty('--ts-palette-text', layer.module?.text || 'inherit');
          badge.style.setProperty('--ts-palette-border', layer.module?.border || 'transparent');
          badge.textContent = layer.name || '';
          paletteEl.appendChild(badge);
        });
      }
    }
  }

  function parseJson(str, fb){
    try{ return JSON.parse(str); }catch{ return fb; }
  }

  function loadDoc(){
    const stored = localStorage.getItem(DOC_KEY);
    if(!stored) return { __meta:{ v:1 }, instances:{} };
    const parsed = parseJson(stored, null);
    if(!parsed || typeof parsed !== 'object') return { __meta:{ v:1 }, instances:{} };
    if(!parsed.instances || typeof parsed.instances !== 'object') parsed.instances = {};
    return parsed;
  }

  function saveDoc(doc){
    const safe = doc && typeof doc === 'object' ? doc : { __meta:{ v:1 }, instances:{} };
    safe.__meta = { v:1, updatedAt: new Date().toISOString() };
    if(!safe.instances || typeof safe.instances !== 'object') safe.instances = {};
    localStorage.setItem(DOC_KEY, JSON.stringify(safe));
  }

  function instanceIdOf(root){
    return root.closest('.grid-stack-item')?.dataset?.instanceId || ('inst-' + Math.random().toString(36).slice(2));
  }

  function idbOpen(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGet(key){
    const db = await idbOpen();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(IDB_STORE, 'readonly');
      const rq = tx.objectStore(IDB_STORE).get(key);
      rq.onsuccess = () => resolve(rq.result || null);
      rq.onerror = () => reject(rq.error);
    });
  }

  async function idbSet(key, value){
    const db = await idbOpen();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function ensureRWPermission(handle){
    if(!handle?.queryPermission) return true;
    const q = await handle.queryPermission({ mode:'readwrite' });
    if(q === 'granted') return true;
    const r = await handle.requestPermission({ mode:'readwrite' });
    return r === 'granted';
  }

  const XLSX_URLS = [
    'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.2/xlsx.full.min.js'
  ];

  async function ensureXLSX(){
    if(window.XLSX) return;
    if(window.__TESTINGS_XLSX_PROMISE__) return window.__TESTINGS_XLSX_PROMISE__;
    window.__TESTINGS_XLSX_PROMISE__ = (async()=>{
      let lastErr;
      for(const url of XLSX_URLS){
        try{
          await new Promise((resolve, reject)=>{
            const s = document.createElement('script');
            s.src = url;
            s.async = true;
            s.onload = resolve;
            s.onerror = () => reject(new Error('load ' + url));
            document.head.appendChild(s);
          });
          if(window.XLSX) return;
        }catch(e){
          lastErr = e;
        }
      }
      throw lastErr || new Error('XLSX load failed');
    })();
    return window.__TESTINGS_XLSX_PROMISE__;
  }

  function parseTimeToSeconds(timeValue){
    if(typeof timeValue === 'number' && timeValue > 0 && timeValue < 1){
      return Math.round(timeValue * 86400);
    }
    const txt = String(timeValue ?? '').trim();
    if(!txt) return 0;
    const cleaned = txt.replace(/\u00a0/g, '').replace(/\t/g, '');
    const parts = cleaned.split(':').map(part => part.trim()).filter(Boolean);
    if(!parts.length || parts.some(part => Number.isNaN(Number(part)))) return 0;
    if(parts.length === 3){
      return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
    }
    if(parts.length === 2){
      return Number(parts[0]) * 60 + Number(parts[1]);
    }
    if(parts.length === 1){
      return Number(parts[0]);
    }
    return 0;
  }

  function secondsToHHMMSS(seconds){
    const safe = Math.max(Number(seconds) || 0, 0);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = Math.floor(safe % 60);
    const pad = value => String(value).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function buildRow(raw, index){
    const cols = Array.from({ length: 10 }, (_, i) => raw?.[i] ?? '');
    const blockValue = Number(cols[0]);
    const block = Number.isFinite(blockValue) ? blockValue : null;
    return {
      index,
      raw: cols,
      block,
      title: cols[1],
      action: cols[2],
      directive: cols[3],
      mode: cols[4],
      resText: cols[5],
      compText: cols[6],
      lowerText: cols[6],
      upperText: cols[8],
      unit: cols[9],
      measured: '',
      result: ''
    };
  }

  function rowHasData(row){
    return [row.raw[1], row.raw[2], row.raw[3], row.raw[4]].some(value => String(value ?? '').trim() !== '');
  }

  window.renderTestings = function renderTestings(root){
    if(!root) return;
    const instanceId = instanceIdOf(root);
    const idbKey = `testings_handle_${instanceId}`;
    const doc = loadDoc();

    root.innerHTML = `
      <div class="ts-root">
        <div class="ts-panel">
          <div class="ts-header">
            <div class="ts-title">Testings</div>
            <div class="ts-status">Bereit.</div>
          </div>
          <div class="ts-controls">
            <button class="ts-btn ts-pick" type="button">Datei auswählen</button>
            <span class="ts-file">Keine Datei gewählt</span>
            <label>Startblock
              <input class="ts-start" type="number" min="0" step="1" value="1" />
            </label>
            <button class="ts-btn ts-run" type="button">Test starten</button>
            <button class="ts-btn secondary ts-clear" type="button">Ergebnisse löschen</button>
          </div>
          <div class="ts-table-wrap">
            <table class="ts-table">
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Titel</th>
                  <th>Aktion</th>
                  <th>Direktive</th>
                  <th>Modus</th>
                  <th>Resultat</th>
                  <th>Compare/Lower</th>
                  <th>H</th>
                  <th>Upper</th>
                  <th>Einheit</th>
                  <th>Messung</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
          <div class="ts-footer">
            <div class="ts-palettes"></div>
          </div>
        </div>
      </div>
    `;

    const statusEl = root.querySelector('.ts-status');
    const pickBtn = root.querySelector('.ts-pick');
    const runBtn = root.querySelector('.ts-run');
    const clearBtn = root.querySelector('.ts-clear');
    const fileLabel = root.querySelector('.ts-file');
    const startInput = root.querySelector('.ts-start');
    const tableBody = root.querySelector('tbody');
    const palettesEl = root.querySelector('.ts-palettes');

    applyLayerVars(root, palettesEl);

    let rows = [];
    let rowEls = [];
    let fileHandle = null;
    let running = false;

    const modal = document.createElement('div');
    modal.className = 'ts-modal';
    modal.innerHTML = `
      <div class="ts-dialog">
        <h3></h3>
        <div class="ts-dialog-message"></div>
        <input class="ts-dialog-input" />
        <div class="ts-dialog-actions"></div>
      </div>
    `;
    root.appendChild(modal);

    const modalTitle = modal.querySelector('h3');
    const modalMessage = modal.querySelector('.ts-dialog-message');
    const modalInput = modal.querySelector('.ts-dialog-input');
    const modalActions = modal.querySelector('.ts-dialog-actions');

    function setStatus(message){
      if(statusEl) statusEl.textContent = message || '';
    }

    function updateDoc(){
      doc.instances ||= {};
      doc.instances[instanceId] ||= {};
      doc.instances[instanceId].fileName = fileHandle?.name || '';
      saveDoc(doc);
    }

    function updateFileLabel(){
      if(fileLabel){
        fileLabel.textContent = fileHandle?.name ? `• ${fileHandle.name}` : 'Keine Datei gewählt';
      }
    }

    function formatCell(value){
      if(value === null || typeof value === 'undefined') return '';
      return String(value);
    }

    function updateRowVisual(row, tr){
      tr.classList.remove('ts-row--go', 'ts-row--nogo', 'ts-row--warn');
      const result = String(row.result || '').toUpperCase();
      if(result === 'GO'){
        tr.classList.add('ts-row--go');
      }else if(result === 'NOGO'){
        tr.classList.add('ts-row--nogo');
      }else if(result){
        tr.classList.add('ts-row--warn');
      }
    }

    function updateResultBadge(row){
      if(!row._resultEl) return;
      row._resultEl.textContent = '';
      if(!row.result){
        return;
      }
      const badge = document.createElement('span');
      badge.className = 'ts-badge';
      const result = String(row.result || '').toUpperCase();
      if(result === 'GO'){
        badge.classList.add('go');
      }else if(result === 'NOGO'){
        badge.classList.add('nogo');
      }else{
        badge.classList.add('warn');
      }
      badge.textContent = row.result;
      row._resultEl.appendChild(badge);
    }

    function renderTable(){
      tableBody.innerHTML = '';
      rowEls = [];
      let currentBlock = null;
      rows.forEach((row, idx) => {
        const blockChanged = row.block !== null && row.block !== currentBlock;
        if(blockChanged){
          const blockRow = document.createElement('tr');
          blockRow.className = 'ts-block-row';
          const blockCell = document.createElement('td');
          blockCell.colSpan = 12;
          blockCell.innerHTML = `<span class="ts-block-label">Block ${row.block}</span>${row.title ? `<span class="ts-block-title">– ${row.title}</span>` : ''}`;
          blockRow.appendChild(blockCell);
          tableBody.appendChild(blockRow);
          currentBlock = row.block;
        }
        const tr = document.createElement('tr');
        tr.classList.add('ts-data-row');
        if(blockChanged) tr.classList.add('ts-row--block-start');
        rowEls[idx] = tr;
        const baseCells = row.raw.map(value => {
          const td = document.createElement('td');
          td.textContent = formatCell(value);
          return td;
        });
        baseCells.forEach(td => tr.appendChild(td));

        const measuredTd = document.createElement('td');
        measuredTd.textContent = row.measured || '';
        row._measuredEl = measuredTd;
        tr.appendChild(measuredTd);

        const resultTd = document.createElement('td');
        row._resultEl = resultTd;
        tr.appendChild(resultTd);
        updateResultBadge(row);
        updateRowVisual(row, tr);

        tableBody.appendChild(tr);
      });
    }

    async function readSheet(handle, sheetName){
      if(!handle || !(await ensureRWPermission(handle))) return [];
      await ensureXLSX();
      const file = await handle.getFile();
      if(!file || file.size === 0) return [];
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type:'array' });
      const ws = wb.Sheets[sheetName];
      if(!ws) return [];
      const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
      return data.slice(1, 1000);
    }

    async function loadFromHandle(handle){
      setStatus('Importiere Daten…');
      const sheetRows = await readSheet(handle, DEFAULT_SHEET);
      rows = sheetRows.map((row, idx) => buildRow(row, idx));
      renderTable();
      setStatus(rows.length ? 'Daten geladen.' : 'Keine Daten gefunden.');
    }

    async function pickFile(){
      if(!window.showOpenFilePicker){
        setStatus('Dateiauswahl nicht unterstützt.');
        return;
      }
      try{
        const [handle] = await window.showOpenFilePicker({
          types: [{
            description: 'Excel',
            accept: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
            }
          }],
          multiple: false
        });
        if(!handle) return;
        fileHandle = handle;
        await idbSet(idbKey, handle);
        updateDoc();
        updateFileLabel();
        await loadFromHandle(handle);
      }catch(e){
        if(e?.name !== 'AbortError'){
          console.warn('pickFile failed', e);
          setStatus('Dateiauswahl fehlgeschlagen.');
        }
      }
    }

    function clearResults(){
      rows.forEach(row => {
        row.measured = '';
        row.result = '';
        if(row._measuredEl) row._measuredEl.textContent = '';
        updateResultBadge(row);
      });
      rowEls.forEach((tr, idx) => updateRowVisual(rows[idx], tr));
      setStatus('Ergebnisse zurückgesetzt.');
    }

    function showModal({ title, message, input, buttons }){
      return new Promise(resolve => {
        modalTitle.textContent = title || '';
        modalMessage.textContent = message || '';
        if(input){
          modalInput.style.display = 'block';
          modalInput.type = input.type || 'text';
          modalInput.value = input.value || '';
          modalInput.placeholder = input.placeholder || '';
        }else{
          modalInput.style.display = 'none';
          modalInput.value = '';
        }
        modalActions.innerHTML = '';
        (buttons || []).forEach(btn => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `ts-btn ${btn.variant || 'secondary'}`;
          button.textContent = btn.label;
          button.addEventListener('click', () => {
            modal.classList.remove('open');
            resolve({ id: btn.id, value: modalInput.value });
          });
          modalActions.appendChild(button);
        });
        modal.classList.add('open');
        if(input){
          modalInput.focus();
          modalInput.select();
        }
      });
    }

    function setRowResult(row, result){
      row.result = result || '';
      if(row._resultEl) updateResultBadge(row);
      const idx = rows.indexOf(row);
      const tr = rowEls[idx];
      if(tr) updateRowVisual(row, tr);
    }

    function setRowMeasured(row, value){
      row.measured = value || '';
      if(row._measuredEl) row._measuredEl.textContent = row.measured;
    }

    async function runCountdown(seconds){
      return new Promise(resolve => {
        const start = Date.now();
        const tick = () => {
          const elapsed = Math.floor((Date.now() - start) / 1000);
          const remaining = Math.max(seconds - elapsed, 0);
          setStatus(`Timer: ${secondsToHHMMSS(remaining)}`);
          if(remaining <= 0){
            clearInterval(timer);
            resolve();
          }
        };
        tick();
        const timer = setInterval(tick, 250);
      });
    }

    function buildVisualSummary(steps, grouped, results){
      const lines = [];
      if(steps.length || grouped.size){
        lines.push('Bitte folgende Schritte durchführen:');
        steps.forEach(step => lines.push(`. ${step}`));
        grouped.forEach((directives, action) => {
          lines.push(`. ${action}`);
          directives.forEach(dir => lines.push(`  -> ${dir}`));
        });
      }
      if(results.length){
        if(lines.length) lines.push('');
        lines.push('Results:');
        results.forEach(res => lines.push(`- ${res}`));
      }
      return lines.join('\n');
    }

    async function handleVisualResult(rowsList, steps, grouped, results){
      const message = buildVisualSummary(steps, grouped, results);
      if(!message) return true;
      const res = await showModal({
        title: 'Visual Test',
        message,
        buttons: [
          { id:'yes', label:'GO', variant:'primary' },
          { id:'no', label:'NOGO', variant:'secondary' },
          { id:'cancel', label:'Cancel', variant:'secondary' }
        ]
      });
      if(res.id === 'cancel'){
        setStatus('Test abgebrochen.');
        return false;
      }
      const answer = res.id === 'yes' ? 'GO' : 'NOGO';
      rowsList.forEach(row => setRowResult(row, answer));
      return true;
    }

    async function runBlock(blockNr, startIndex){
      let blockTitle = '';
      const visualSteps = [];
      const visualRows = [];
      const visualResults = [];
      const grouped = new Map();

      for(let i = startIndex; i < rows.length; i += 1){
        const row = rows[i];
        const marker = String(row.raw[0] ?? '').trim();
        if(marker.toUpperCase() === 'END OF TEST'){
          break;
        }
        if(!rowHasData(row)) continue;
        if(row.block !== null && row.block !== blockNr) continue;

        if(row.title) blockTitle = String(row.title);
        const mode = String(row.mode || '').trim().toUpperCase();

        if(mode === 'VISUAL'){
          const action = String(row.action || '').trim();
          const directive = String(row.directive || '').trim();
          visualRows.push(row);
          if(action){
            if(directive){
              if(!grouped.has(action)) grouped.set(action, []);
              grouped.get(action).push(directive);
            }else{
              visualSteps.push(action);
            }
          }
          const resText = String(row.resText || '').trim();
          const compText = String(row.compText || '').trim();
          if(resText){
            visualResults.push(compText ? `${resText} (${compText})` : resText);
          }
          continue;
        }

        if(mode === 'COMP'){
          const action = String(row.action || '').trim();
          const directive = String(row.directive || '').trim();
          let message = action && directive ? `Set ${action} to: ${directive}` : action || directive;
          const resLabel = String(row.resText || '').trim();
          const lowerText = String(row.lowerText || '').trim();
          const upperText = String(row.upperText || '').trim();
          const unit = String(row.unit || '').trim();
          if(resLabel){
            message = `Measurements of: ${resLabel}`;
          }
          const lowerNum = Number(lowerText);
          const upperNum = Number(upperText);
          if(Number.isFinite(lowerNum) && Number.isFinite(upperNum)){
            message += `\nLimits: ${lowerNum} ${unit} < value < ${upperNum} ${unit}`;
          }else if(Number.isFinite(lowerNum)){
            message += `\nLower limit: ${lowerNum} ${unit}`;
          }else if(Number.isFinite(upperNum)){
            message += `\nUpper limit: ${upperNum} ${unit}`;
          }

          const response = await showModal({
            title: blockTitle || 'Messung',
            message,
            input: { type:'text', placeholder:'Wert eingeben' },
            buttons: [
              { id:'ok', label:'Speichern', variant:'primary' },
              { id:'cancel', label:'Abbrechen', variant:'secondary' }
            ]
          });

          if(response.id === 'cancel'){
            setRowMeasured(row, '');
            setRowResult(row, 'INVALID VALUE');
            continue;
          }

          const inputValue = response.value;
          if(Number.isFinite(Number(inputValue))){
            const numericValue = Number(inputValue);
            setRowMeasured(row, `${numericValue}${unit ? ` ${unit}` : ''}`);
            let isOk = true;
            if(Number.isFinite(lowerNum) && numericValue < lowerNum) isOk = false;
            if(Number.isFinite(upperNum) && numericValue > upperNum) isOk = false;
            setRowResult(row, isOk ? 'GO' : 'NOGO');
          }else{
            setRowMeasured(row, '');
            setRowResult(row, 'INVALID VALUE');
          }
          continue;
        }

        if(mode === 'TIME'){
          const targetSeconds = parseTimeToSeconds(row.compText || row.lowerText);
          if(targetSeconds <= 0){
            setRowResult(row, 'NO VALID TIMEDATA');
            continue;
          }
          setStatus(`Timer: ${secondsToHHMMSS(targetSeconds)}`);
          await runCountdown(targetSeconds);
          setRowMeasured(row, secondsToHHMMSS(0));
          const resText = String(row.resText || '').trim();
          const message = resText ? `${resText}\n\nCorrect result?` : 'Zeit abgelaufen.\n\nCorrect result?';
          const response = await showModal({
            title: blockTitle || 'Timer',
            message,
            buttons: [
              { id:'yes', label:'GO', variant:'primary' },
              { id:'no', label:'NOGO', variant:'secondary' },
              { id:'cancel', label:'Cancel', variant:'secondary' }
            ]
          });
          if(response.id === 'cancel'){
            setRowResult(row, 'CANCEL');
            setStatus('Test abgebrochen.');
            return false;
          }
          setRowResult(row, response.id === 'yes' ? 'GO' : 'NOGO');
          continue;
        }

        if(mode === 'BALANCE'){
          const response = await showModal({
            title: blockTitle || 'Balance',
            message: 'Balance-Test durchführen und bestätigen.',
            buttons: [
              { id:'yes', label:'GO', variant:'primary' },
              { id:'no', label:'NOGO', variant:'secondary' },
              { id:'cancel', label:'Cancel', variant:'secondary' }
            ]
          });
          if(response.id === 'cancel'){
            setRowResult(row, 'CANCEL');
            setStatus('Test abgebrochen.');
            return false;
          }
          setRowResult(row, response.id === 'yes' ? 'GO' : 'NOGO');
          continue;
        }

        if(mode){
          setRowResult(row, 'MODE UNKNOWN');
        }
      }

      const ok = await handleVisualResult(visualRows, visualSteps, grouped, visualResults);
      if(!ok) return false;
      return true;
    }

    async function runTests(){
      if(running) return;
      if(!rows.length){
        setStatus('Keine Daten geladen.');
        return;
      }
      running = true;
      runBtn.disabled = true;
      setStatus('Test läuft…');

      const startBlock = Number(startInput?.value || 1);
      const blocks = new Map();
      rows.forEach((row, idx) => {
        if(row.block !== null && !blocks.has(row.block)){
          blocks.set(row.block, idx);
        }
      });

      let aborted = false;
      for(const [blockNr, startIndex] of blocks){
        if(Number.isFinite(startBlock) && blockNr < startBlock) continue;
        const ok = await runBlock(blockNr, startIndex);
        if(!ok){
          aborted = true;
          break;
        }
      }

      running = false;
      runBtn.disabled = false;
      setStatus(aborted ? 'Test abgebrochen.' : 'Test abgeschlossen.');
    }

    pickBtn.addEventListener('click', pickFile);
    clearBtn.addEventListener('click', clearResults);
    runBtn.addEventListener('click', runTests);

    (async()=>{
      const storedHandle = await idbGet(idbKey);
      if(storedHandle){
        fileHandle = storedHandle;
        updateFileLabel();
        await loadFromHandle(storedHandle);
      }
    })();

    updateFileLabel();
  };
})();
