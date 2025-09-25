/* ExcelDataTest Module
 * - Displays a sortable list backed by a worksheet in an Excel workbook.
 * - Each instance stores configuration (file + sheet name) locally and keeps
 *   its data isolated in its own worksheet.
 * - Requires: File System Access API (Chromium), SheetJS (XLSX) & Sortable.js
 */
(function(){
  // ---------- styles ----------
  (function ensureStyles(){
    if(document.getElementById('edt-styles')) return;
    const css = `
    .edt-root{height:100%;display:flex;flex-direction:column;gap:.75rem;padding:.75rem;box-sizing:border-box;color:var(--text-color,#fff);} 
    .edt-surface{flex:1;background:var(--module-bg,rgba(17,24,39,.32));border-radius:1rem;padding:.75rem;display:flex;flex-direction:column;gap:.65rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.06);} 
    .edt-header{display:flex;justify-content:space-between;align-items:center;font-weight:600;} 
    .edt-status{font-size:.8rem;opacity:.8;min-height:1.2rem;} 
    .edt-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.5rem;flex:1;overflow:auto;} 
    .edt-item{display:flex;align-items:center;gap:.6rem;padding:.55rem .65rem;background:rgba(0,0,0,.15);border-radius:.65rem;color:inherit;} 
    .edt-item-text{flex:1;word-break:break-word;} 
    .edt-handle{width:28px;height:28px;border-radius:.45rem;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;cursor:grab;} 
    .edt-del{width:28px;height:28px;border-radius:.45rem;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;cursor:pointer;} 
    .edt-del:hover{background:rgba(239,68,68,.35);} 
    .edt-footer{display:flex;justify-content:center;} 
    .edt-add{border:none;border-radius:9999px;padding:.5rem 1.25rem;background:var(--button-bg,#2563eb);color:var(--button-text,#fff);font-weight:600;cursor:pointer;box-shadow:0 10px 18px rgba(37,99,235,.25);} 
    .edt-add:active{transform:scale(.98);} 
    .edt-empty{opacity:.75;font-size:.9rem;text-align:center;margin-top:1rem;} 
    .edt-menu{position:fixed;z-index:1000;display:none;min-width:180px;padding:.25rem;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);} 
    .edt-menu.open{display:block;} 
    .edt-menu .mi{display:block;width:100%;padding:.5rem .75rem;text-align:left;border-radius:.4rem;background:transparent;} 
    .edt-menu .mi:hover{background:rgba(0,0,0,.06);} 
    .edt-modal{position:fixed;inset:0;display:none;place-items:center;background:rgba(0,0,0,.35);z-index:1050;} 
    .edt-modal.open{display:grid;} 
    .edt-dialog{background:#fff;color:#111827;width:min(92vw,560px);border-radius:.9rem;padding:1rem;box-shadow:0 10px 30px rgba(0,0,0,.25);} 
    .edt-row{display:flex;gap:.5rem;align-items:center;margin-bottom:.75rem;flex-wrap:wrap;} 
    .edt-row:last-child{margin-bottom:0;} 
    .edt-btn{border:none;border-radius:.5rem;padding:.45rem .85rem;font-weight:600;cursor:pointer;} 
    .edt-btn.primary{background:#2563eb;color:#fff;} 
    .edt-btn.secondary{background:#e5e7eb;color:#111827;} 
    .edt-file{font-size:.9rem;opacity:.85;} 
    .edt-input{flex:1;min-width:180px;padding:.45rem .6rem;border-radius:.5rem;border:1px solid #d1d5db;font-size:.95rem;} 
    .edt-ghost{opacity:.5;} 
    .edt-chosen{transform:scale(1.01);} 
    `;
    const tag = document.createElement('style');
    tag.id = 'edt-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  })();

  // ---------- constants & storage helpers ----------
  const DOC_KEY = 'excelDataTest_v1';
  const IDB_NAME = 'modulesApp';
  const IDB_STORE = 'fs-handles';

  function parse(str, fb){ try { return JSON.parse(str); } catch { return fb; } }
  function blankDoc(){
    return { __meta:{v:1}, instances:{} };
  }
  function nowIso(){ return new Date().toISOString(); }
  function loadDoc(){
    const stored = localStorage.getItem(DOC_KEY);
    if(!stored) return blankDoc();
    const parsed = parse(stored, null);
    if(!parsed || typeof parsed !== 'object') return blankDoc();
    if(!parsed.instances || typeof parsed.instances !== 'object') parsed.instances = {};
    return parsed;
  }
  function saveDoc(doc){
    const safe = doc && typeof doc === 'object' ? doc : blankDoc();
    safe.__meta = { v:1, updatedAt: nowIso() };
    if(!safe.instances || typeof safe.instances !== 'object') safe.instances = {};
    localStorage.setItem(DOC_KEY, JSON.stringify(safe));
  }
  function instanceIdOf(root){
    return root.closest('.grid-stack-item')?.dataset?.instanceId || ('inst-' + Math.random().toString(36).slice(2));
  }
  function defaultSheetName(doc, selfId){
    const used = new Set();
    Object.entries(doc.instances || {}).forEach(([id,cfg])=>{
      if(id!==selfId && cfg && typeof cfg.sheetName==='string'){ used.add(cfg.sheetName); }
    });
    const base = 'ExcelDataTest';
    let n = 1;
    while(used.has(base + n)){ n += 1; }
    return base + n;
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
  async function idbDel(key){
    const db = await idbOpen();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
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

  // ---------- external libs ----------
  const XLSX_URLS = [
    'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.2/xlsx.full.min.js'
  ];
  async function ensureXLSX(){
    if(window.XLSX) return;
    if(window.__XLSX_LOAD_PROMISE__) return window.__XLSX_LOAD_PROMISE__;
    window.__XLSX_LOAD_PROMISE__ = (async()=>{
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
        }catch(e){ lastErr = e; }
      }
      throw lastErr || new Error('XLSX load failed');
    })();
    return window.__XLSX_LOAD_PROMISE__;
  }

  const SORTABLE_URLS = [
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js'
  ];
  async function ensureSortable(){
    if(window.Sortable) return;
    if(window.__SORTABLE_LOAD_PROMISE__) return window.__SORTABLE_LOAD_PROMISE__;
    window.__SORTABLE_LOAD_PROMISE__ = (async()=>{
      let lastErr;
      for(const url of SORTABLE_URLS){
        try{
          await new Promise((resolve, reject)=>{
            const s = document.createElement('script');
            s.src = url;
            s.async = true;
            s.onload = resolve;
            s.onerror = () => reject(new Error('load '+url));
            document.head.appendChild(s);
          });
          if(window.Sortable) return;
        }catch(e){ lastErr = e; }
      }
      throw lastErr || new Error('Sortable load failed');
    })();
    return window.__SORTABLE_LOAD_PROMISE__;
  }

  // ---------- Excel helpers ----------
  async function readItems(handle, sheetName){
    if(!handle || !sheetName) return [];
    if(!(await ensureRWPermission(handle))) return [];
    await ensureXLSX();
    const file = await handle.getFile();
    if(file.size === 0) return [];
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type:'array' });
    const ws = wb.Sheets[sheetName];
    if(!ws) return [];
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
    return rows.slice(1)
      .map(r => String(r[0] ?? '').trim())
      .filter(v => v !== '');
  }

  async function writeItems(handle, sheetName, values){
    if(!handle || !sheetName) return;
    if(!(await ensureRWPermission(handle))) return;
    await ensureXLSX();
    let wb;
    try{
      const file = await handle.getFile();
      if(file.size > 0){
        const buf = await file.arrayBuffer();
        wb = XLSX.read(buf, { type:'array' });
      }
    }catch(e){
      console.warn('read workbook failed', e);
    }
    if(!wb){
      wb = XLSX.utils.book_new();
    }
    const aoa = [['Item'], ...values.map(v => [v])];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    wb.Sheets[sheetName] = ws;
    if(!Array.isArray(wb.SheetNames)) wb.SheetNames = [];
    if(!wb.SheetNames.includes(sheetName)) wb.SheetNames.push(sheetName);
    const out = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    const writable = await handle.createWritable();
    await writable.write(new Blob([out], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    await writable.close();
  }

  // ---------- UI helpers ----------
  function buildUI(root, title){
    root.innerHTML = `
      <div class="edt-root">
        <div class="edt-surface">
          <div class="edt-header">
            <div class="edt-title">${title || 'Excel Data Test'}</div>
            <div class="edt-file-label"></div>
          </div>
          <ul class="edt-list"></ul>
          <div class="edt-empty" style="display:none;">Keine Einträge</div>
        </div>
        <div class="edt-footer"><button class="edt-add">＋ Eintrag</button></div>
        <div class="edt-status"></div>
      </div>
      <div class="edt-modal">
        <div class="edt-dialog">
          <div class="edt-row" style="justify-content:space-between;">
            <div class="font-semibold">ExcelDataTest – Optionen</div>
            <button class="edt-btn secondary edt-opt-close">Schließen</button>
          </div>
          <div class="edt-row">
            <button class="edt-btn primary edt-opt-pick">Excel wählen</button>
            <button class="edt-btn secondary edt-opt-create">Excel erstellen</button>
            <span class="edt-file"></span>
          </div>
          <div class="edt-row">
            <label style="font-weight:600;font-size:.9rem;">Worksheet</label>
            <input class="edt-input edt-sheet" placeholder="Worksheet" />
          </div>
          <div class="edt-row" style="justify-content:flex-end;">
            <button class="edt-btn primary edt-opt-save">Speichern</button>
          </div>
        </div>
      </div>
    `;
    const menu = document.createElement('div');
    menu.className = 'edt-menu';
    menu.innerHTML = `<button class="mi mi-opt">⚙️ Optionen</button>`;
    document.body.appendChild(menu);
    return {
      list: root.querySelector('.edt-list'),
      empty: root.querySelector('.edt-empty'),
      add: root.querySelector('.edt-add'),
      status: root.querySelector('.edt-status'),
      fileLabel: root.querySelector('.edt-file-label'),
      modal: root.querySelector('.edt-modal'),
      modalFile: root.querySelector('.edt-file'),
      modalSheet: root.querySelector('.edt-sheet'),
      modalClose: root.querySelector('.edt-opt-close'),
      modalSave: root.querySelector('.edt-opt-save'),
      modalPick: root.querySelector('.edt-opt-pick'),
      modalCreate: root.querySelector('.edt-opt-create'),
      menu
    };
  }

  function closeMenu(menu){ menu.classList.remove('open'); }
  function openMenu(menu, x, y){
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.add('open');
  }

  function setStatus(els, msg){ if(els.status) els.status.textContent = msg || ''; }

  // ---------- main render ----------
  window.renderExcelDataTest = async function(root, ctx){
    const instanceId = instanceIdOf(root);
    let doc = loadDoc();
    doc.instances ||= {};
    if(!doc.instances[instanceId]){
      doc.instances[instanceId] = {
        sheetName: defaultSheetName(doc, instanceId),
        fileName: '',
        idbKey: 'excelDataTest:' + instanceId
      };
      saveDoc(doc);
    }
    let cfg = doc.instances[instanceId];
    if(!cfg.idbKey){
      cfg.idbKey = 'excelDataTest:' + instanceId;
      saveDoc(doc);
    }

    const title = (ctx?.moduleJson?.name) || 'Excel Data Test';
    const els = buildUI(root, title);
    const state = {
      items: [],
      sortable: null,
      fileHandle: null
    };

    function refreshFileLabel(){
      const sheetInfo = cfg.sheetName ? ` (${cfg.sheetName})` : '';
      els.fileLabel.textContent = cfg.fileName ? `• ${cfg.fileName}${sheetInfo}` : `Kein Excel gewählt${sheetInfo}`;
      els.modalFile.textContent = cfg.fileName ? `Aktuell: ${cfg.fileName}` : 'Keine Datei';
      if(els.modalSheet && cfg.sheetName) els.modalSheet.value = cfg.sheetName;
    }

    function renderItems(){
      if(!els.list) return;
      els.list.innerHTML = '';
      if(!state.items.length){
        els.empty.style.display = 'block';
      } else {
        els.empty.style.display = 'none';
      }
      state.items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'edt-item';
        li.dataset.id = item.id;
        li.innerHTML = `
          <div class="edt-handle" title="Verschieben">☰</div>
          <div class="edt-item-text"></div>
          <div class="edt-del" title="Entfernen">✕</div>
        `;
        li.querySelector('.edt-item-text').textContent = item.text;
        li.querySelector('.edt-del').addEventListener('click', ()=>{
          state.items = state.items.filter(it => it.id !== item.id);
          renderItems();
          scheduleSave();
        });
        els.list.appendChild(li);
      });
      ensureSortable().then(()=>{
        if(state.sortable){ try{ state.sortable.destroy(); } catch{} }
        state.sortable = new Sortable(els.list, {
          animation: 150,
          handle: '.edt-handle',
          ghostClass: 'edt-ghost',
          chosenClass: 'edt-chosen',
          onEnd: () => {
            const order = Array.from(els.list.children).map(li => li.dataset.id);
            const map = new Map(state.items.map(it => [it.id, it]));
            state.items = order.map(id => map.get(id)).filter(Boolean);
            scheduleSave();
          }
        });
      }).catch(err => {
        console.warn('Sortable load failed', err);
      });
    }

    const saveDebounced = debounce(async () => {
      if(!state.fileHandle || !cfg.sheetName){
        setStatus(els, 'Kein Excel verknüpft.');
        return;
      }
      setStatus(els, 'Speichern…');
      try{
        await writeItems(state.fileHandle, cfg.sheetName, state.items.map(it => it.text));
        setStatus(els, 'Gespeichert.');
      }catch(e){
        console.warn('write failed', e);
        setStatus(els, 'Speichern fehlgeschlagen.');
      }
    }, 250);

    function scheduleSave(){ saveDebounced(); }

    function debounce(fn, delay){
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(()=>fn(...args), delay);
      };
    }

    async function loadHandle(){
      if(!cfg.idbKey) return null;
      try{
        const h = await idbGet(cfg.idbKey);
        if(h && await ensureRWPermission(h)) return h;
      }catch(e){ console.warn('idb get failed', e); }
      return null;
    }

    async function loadItems(){
      if(!state.fileHandle || !cfg.sheetName){
        state.items = [];
        renderItems();
        return;
      }
      setStatus(els, 'Laden…');
      try{
        const values = await readItems(state.fileHandle, cfg.sheetName);
        const stamp = Date.now().toString(36);
        state.items = values.map((text, idx) => ({ id: 'it-' + idx + '-' + stamp, text }));
        renderItems();
        setStatus(els, values.length ? '' : '');
      }catch(e){
        console.warn('read failed', e);
        setStatus(els, 'Konnte Worksheet nicht lesen.');
        state.items = [];
        renderItems();
      }
    }

    function openOptions(){
      refreshFileLabel();
      els.modal.classList.add('open');
    }
    function closeOptions(){ els.modal.classList.remove('open'); }

    async function pickExcel(){
      if(!window.showOpenFilePicker){
        alert('Diese Funktion benötigt einen Chromium Browser.');
        return;
      }
      try{
        const [handle] = await window.showOpenFilePicker({
          types: [{ description:'Excel', accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']} }],
          excludeAcceptAllOption: false
        });
        if(handle && await ensureRWPermission(handle)){
          state.fileHandle = handle;
          cfg.fileName = handle.name || '';
          saveConfig();
          await idbSet(cfg.idbKey, handle);
          refreshFileLabel();
          await loadItems();
        }
      }catch(e){ if(e?.name !== 'AbortError') console.warn('pick excel', e); }
    }

    async function createExcel(){
      if(!window.showSaveFilePicker){
        alert('Diese Funktion benötigt einen Chromium Browser.');
        return;
      }
      try{
        const handle = await window.showSaveFilePicker({
          suggestedName: cfg.fileName || 'ModuleData.xlsx',
          types: [{ description:'Excel', accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']} }]
        });
        if(handle && await ensureRWPermission(handle)){
          state.fileHandle = handle;
          cfg.fileName = handle.name || '';
          saveConfig();
          await idbSet(cfg.idbKey, handle);
          await writeItems(handle, cfg.sheetName, []);
          refreshFileLabel();
          await loadItems();
        }
      }catch(e){ if(e?.name !== 'AbortError') console.warn('create excel', e); }
    }

    function saveConfig(){
      const doc = loadDoc();
      doc.instances ||= {};
      doc.instances[instanceId] = cfg;
      saveDoc(doc);
    }

    async function applySheetFromInput(){
      const val = (els.modalSheet?.value || '').trim();
      if(val){
        cfg.sheetName = val;
      }
      saveConfig();
      refreshFileLabel();
      await loadItems();
    }

    // wire events
    els.add.addEventListener('click', ()=>{
      const text = prompt('Neuer Eintrag');
      if(typeof text === 'string'){
        const value = text.trim();
        if(value){
          state.items.push({ id: 'it-' + Math.random().toString(36).slice(2), text: value });
          renderItems();
          scheduleSave();
        }
      }
    });

    els.modalClose.addEventListener('click', closeOptions);
    els.modalSave.addEventListener('click', ()=>{ applySheetFromInput().finally(closeOptions); });
    els.modalPick.addEventListener('click', pickExcel);
    els.modalCreate.addEventListener('click', createExcel);

    root.addEventListener('contextmenu', (ev)=>{
      ev.preventDefault();
      openMenu(els.menu, ev.clientX, ev.clientY);
    });
    els.menu.querySelector('.mi-opt').addEventListener('click', ()=>{ closeMenu(els.menu); openOptions(); });
    document.addEventListener('click', (ev)=>{
      if(!els.menu.contains(ev.target)) closeMenu(els.menu);
    });
    window.addEventListener('scroll', ()=>closeMenu(els.menu), true);

    els.modal.addEventListener('click', (ev)=>{
      if(ev.target === els.modal) closeOptions();
    });

    refreshFileLabel();

    state.fileHandle = await loadHandle();
    if(state.fileHandle && !cfg.fileName && state.fileHandle.name){
      cfg.fileName = state.fileHandle.name;
      saveConfig();
      refreshFileLabel();
    }
    if(!state.fileHandle){
      setStatus(els, 'Kein Excel verbunden. Bitte über Optionen auswählen.');
      try{ await idbDel(cfg.idbKey); }catch{}
    } else {
      await loadItems();
    }
  };
})();
