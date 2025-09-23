(function(){
  const STYLE_ID = 'checklist-styles';
  const LS_KEY = 'module_data_v1';
  const WATCH_INTERVAL = 300;
  const FILE_NAME = 'ChecklistData.json';
  const IDB_NAME = 'modulesApp';
  const IDB_STORE = 'fs-handles';
  const FOLDER_KEY = 'checklist:template-folder';
  const DEFAULT_DATA = {
    __meta: { version: 1, updatedAt: null },
    templates: {
      baseSteps: [
        { id: 'base-nameplates', text: 'Nameplates überprüfen', requires: [], lockToEnd: false },
        { id: 'base-sichtpruefung', text: 'Sichtprüfung', requires: [], lockToEnd: false },
        { id: 'base-eingangstest', text: 'Eingangstest', requires: [], lockToEnd: false },
        { id: 'base-zertifizieren', text: 'Zertifizieren lassen', requires: ['base-nameplates','base-sichtpruefung','base-eingangstest'], lockToEnd: true }
      ],
      partSpecific: []
    },
    meldungen: {}
  };

  function ensureStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const css = `
      .cl-root{height:100%;display:flex;flex-direction:column;gap:.75rem;font-size:.95rem;color:var(--sidebar-module-card-text,#0f172a);}
      .cl-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.25rem .1rem;}
      .cl-title{font-weight:600;font-size:1.05rem;}
      .cl-meta{font-size:.82rem;opacity:.7;display:flex;align-items:center;gap:.5rem;}
      .cl-surface{flex:1;background:linear-gradient(180deg,rgba(248,250,252,.85),rgba(241,245,249,.95));border-radius:1rem;padding:1rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.6);display:flex;flex-direction:column;gap:.75rem;overflow:hidden;}
      .cl-status{font-size:.78rem;opacity:.7;min-height:1.1rem;transition:color .12s ease;}
      .cl-status.text-warn{color:#dc2626;}
      .cl-list{flex:1;overflow:auto;padding:.25rem .1rem .75rem;display:flex;flex-direction:column;gap:.45rem;position:relative;}
      .cl-empty{flex:1;display:flex;align-items:center;justify-content:center;font-size:.9rem;color:rgba(15,23,42,.6);text-align:center;padding:1.2rem;border:1px dashed rgba(148,163,184,.4);border-radius:.9rem;background:rgba(255,255,255,.65);}
      .cl-gap{border:1px dashed transparent;border-radius:.7rem;height:1.3rem;display:flex;align-items:center;justify-content:center;color:rgba(37,99,235,.25);font-size:.8rem;background:transparent;cursor:pointer;transition:all .12s ease;padding:0 .5rem;}
      .cl-gap:before{content:'+';margin-right:.35rem;font-size:1rem;}
      .cl-gap:hover{border-color:rgba(37,99,235,.35);color:rgba(37,99,235,.9);background:rgba(59,130,246,.08);box-shadow:inset 0 0 0 1px rgba(37,99,235,.08);}
      .cl-item{display:flex;align-items:center;gap:.7rem;padding:.65rem .75rem;border-radius:.85rem;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#0f172a);box-shadow:0 12px 24px rgba(15,23,42,.08);border:1px solid rgba(148,163,184,.18);position:relative;transition:transform .12s ease, box-shadow .12s ease;}
      .cl-item:hover{box-shadow:0 16px 32px rgba(15,23,42,.12);transform:translateY(-1px);}
      .cl-item.done{opacity:.68;}
      .cl-item.locked .cl-delete{display:none;}
      .cl-check{position:relative;display:inline-flex;align-items:center;justify-content:center;width:1.45rem;height:1.45rem;border-radius:.45rem;border:2px solid rgba(148,163,184,.6);background:rgba(255,255,255,.96);flex:0 0 auto;}
      .cl-check input{opacity:0;position:absolute;inset:0;margin:0;width:100%;height:100%;cursor:pointer;}
      .cl-check svg{width:1.1rem;height:1.1rem;stroke:#2563eb;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none;opacity:0;transition:opacity .12s ease;}
      .cl-item.done .cl-check svg{opacity:1;}
      .cl-item.disabled .cl-check{border-color:rgba(148,163,184,.4);background:rgba(226,232,240,.6);}
      .cl-item.disabled .cl-check input{cursor:not-allowed;}
      .cl-body{flex:1;display:flex;flex-direction:column;gap:.35rem;min-width:0;}
      .cl-text{font-weight:500;word-break:break-word;}
      .cl-req{font-size:.75rem;opacity:.7;display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;}
      .cl-req span{padding:.15rem .4rem;border-radius:9999px;background:rgba(37,99,235,.12);color:#1d4ed8;font-weight:500;}
      .cl-actions{display:flex;align-items:center;gap:.35rem;}
      .cl-delete{border:none;background:rgba(248,113,113,.1);color:#dc2626;width:1.75rem;height:1.75rem;border-radius:.55rem;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .12s ease, transform .12s ease;}
      .cl-delete:hover{background:rgba(248,113,113,.2);transform:translateY(-1px);}
      .cl-grip{width:1.45rem;height:1.45rem;border-radius:.45rem;background:rgba(148,163,184,.16);display:flex;align-items:center;justify-content:center;cursor:grab;color:rgba(30,64,175,.6);}
      .cl-grip:active{cursor:grabbing;}
      .cl-item.disabled .cl-delete{opacity:.4;cursor:not-allowed;}
      .cl-hint{font-size:.82rem;color:rgba(15,23,42,.55);padding:.4rem .75rem;border-radius:.75rem;background:rgba(255,255,255,.7);border:1px dashed rgba(148,163,184,.35);}
      .cl-ghost{opacity:.4;}
      .cl-chosen{transform:scale(.99);}
      .cl-menu{position:fixed;z-index:1000;display:none;min-width:220px;padding:.35rem;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border:1px solid var(--border-color,#e5e7eb);border-radius:.6rem;box-shadow:0 16px 32px rgba(15,23,42,.18);}
      .cl-menu.open{display:block;}
      .cl-menu .mi{display:block;width:100%;padding:.5rem .75rem;text-align:left;border-radius:.45rem;background:transparent;border:none;color:inherit;font-size:.9rem;cursor:pointer;}
      .cl-menu .mi:hover{background:rgba(59,130,246,.12);}
      .cl-menu .mi.noclick{cursor:default;opacity:.72;}
      .cl-menu .mi.noclick:hover{background:transparent;}
      .cl-warning{font-size:.82rem;color:#dc2626;background:rgba(248,113,113,.15);border-radius:.65rem;padding:.5rem .75rem;}
    `;
    const tag = document.createElement('style');
    tag.id = STYLE_ID;
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  function parseJSON(text, fallback){
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (err) {
      console.warn('Checklist: JSON parse failed', err);
      return fallback;
    }
  }

  function randomId(){
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'cl-' + Math.random().toString(36).slice(2,10);
  }

  function loadDoc(){
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || { general:{} }; }
    catch { return { general:{} }; }
  }

  function getActiveContext(){
    const general = loadDoc().general || {};
    const meldung = String(general.Meldung || '').trim();
    const part = String(general.PartNo || general.Part || '').trim();
    return { meldung, part };
  }

  function debounce(fn, ms){
    let t;
    return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
  }

  function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

  function ensureTemplates(data){
    const result = data && typeof data === 'object' ? data : {};
    result.__meta = result.__meta && typeof result.__meta === 'object' ? result.__meta : { version:1, updatedAt:null };
    result.templates = result.templates && typeof result.templates === 'object' ? result.templates : {};
    if (!Array.isArray(result.templates.baseSteps) || !result.templates.baseSteps.length) {
      result.templates.baseSteps = DEFAULT_DATA.templates.baseSteps.map(step=>({...step}));
    } else {
      result.templates.baseSteps = result.templates.baseSteps.map(step=>({
        id: step.id || randomId(),
        text: String(step.text || '').trim() || 'Unbenannter Schritt',
        requires: Array.isArray(step.requires) ? step.requires.slice() : [],
        lockToEnd: Boolean(step.lockToEnd)
      }));
      if (!result.templates.baseSteps.some(step=>step.lockToEnd)) {
        const fallback = DEFAULT_DATA.templates.baseSteps[DEFAULT_DATA.templates.baseSteps.length-1];
        result.templates.baseSteps.push({...fallback, id: randomId()});
      }
    }
    if (!Array.isArray(result.templates.partSpecific)) {
      if (Array.isArray(result.templates.partPrefixes)) {
        result.templates.partSpecific = result.templates.partPrefixes.map(entry=>({
          prefix: String(entry.prefix || entry[0] || '').trim(),
          text: String(entry.text || entry[1] || '').trim()
        })).filter(entry=>entry.prefix && entry.text);
      } else {
        result.templates.partSpecific = [];
      }
    } else {
      result.templates.partSpecific = result.templates.partSpecific.map(entry=>({
        prefix: String(entry.prefix || '').trim(),
        text: String(entry.text || '').trim()
      })).filter(entry=>entry.prefix && entry.text);
    }
    result.meldungen = result.meldungen && typeof result.meldungen === 'object' ? result.meldungen : {};
    return result;
  }

  function cloneSteps(steps){
    return (Array.isArray(steps) ? steps : []).map(step => ({
      id: step.id || randomId(),
      text: String(step.text || '').trim() || 'Schritt',
      done: Boolean(step.done),
      requires: Array.isArray(step.requires) ? step.requires.slice() : [],
      lockToEnd: Boolean(step.lockToEnd),
      createdAt: step.createdAt || null
    }));
  }

  function buildStepsFromTemplates(data, partNumber){
    const templates = ensureTemplates(data).templates;
    const base = cloneSteps(templates.baseSteps);
    const extras = [];
    const part = String(partNumber || '').toUpperCase();
    if (part && Array.isArray(templates.partSpecific)) {
      for (const entry of templates.partSpecific) {
        const prefix = String(entry.prefix || '').toUpperCase();
        const text = String(entry.text || '').trim();
        if (!prefix || !text) continue;
        if (part.startsWith(prefix)) {
          extras.push({ id: randomId(), text, done:false, requires:[], lockToEnd:false, createdAt:new Date().toISOString() });
        }
      }
    }
    const finalIndex = base.findIndex(step=>step.lockToEnd);
    const finalStep = finalIndex >=0 ? base.splice(finalIndex,1)[0] : {
      id: randomId(),
      text: 'Zertifizieren lassen',
      done:false,
      requires:[],
      lockToEnd:true,
      createdAt:new Date().toISOString()
    };
    const list = [...base, ...extras, finalStep];
    syncFinalRequirement(list);
    return list;
  }

  function syncFinalRequirement(list){
    if (!Array.isArray(list)) return;
    const final = list.find(step=>step.lockToEnd);
    if (!final) return;
    const others = list.filter(step=>step!==final);
    final.requires = others.map(step=>step.id);
  }

  function ensureFinalAtEnd(list){
    if (!Array.isArray(list)) return;
    const idx = list.findIndex(step=>step.lockToEnd);
    if (idx >=0 && idx !== list.length-1) {
      const [step] = list.splice(idx,1);
      list.push(step);
    }
  }

  function queryStepById(list,id){
    return Array.isArray(list) ? list.find(step=>step.id===id) : null;
  }

  function formatDate(date){
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }

  function idbOpen(){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(IDB_NAME,1);
      req.onupgradeneeded = ()=>{ try{ req.result.createObjectStore(IDB_STORE); }catch(e){ console.warn('Checklist: upgrade',e);} };
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error);
    });
  }

  async function idbGet(key){
    try {
      const db = await idbOpen();
      return await new Promise((resolve,reject)=>{
        const tx = db.transaction(IDB_STORE,'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(key);
        req.onsuccess = ()=>resolve(req.result || null);
        req.onerror = ()=>reject(req.error);
      });
    } catch (err){
      console.warn('Checklist: idbGet failed', err);
      return null;
    }
  }

  async function idbSet(key,value){
    try {
      const db = await idbOpen();
      return await new Promise((resolve,reject)=>{
        const tx = db.transaction(IDB_STORE,'readwrite');
        tx.objectStore(IDB_STORE).put(value,key);
        tx.oncomplete = ()=>resolve();
        tx.onerror = ()=>reject(tx.error);
      });
    } catch (err){
      console.warn('Checklist: idbSet failed', err);
    }
  }

  async function idbDel(key){
    try {
      const db = await idbOpen();
      return await new Promise((resolve,reject)=>{
        const tx = db.transaction(IDB_STORE,'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = ()=>resolve();
        tx.onerror = ()=>reject(tx.error);
      });
    } catch (err){
      console.warn('Checklist: idbDel failed', err);
    }
  }

  async function ensurePermission(handle){
    if (!handle) return false;
    if (!handle.queryPermission) return true;
    const query = await handle.queryPermission({ mode: 'readwrite' });
    if (query === 'granted') return true;
    if (query === 'denied') return false;
    if (!handle.requestPermission) return query === 'granted';
    const request = await handle.requestPermission({ mode: 'readwrite' });
    return request === 'granted';
  }

  async function verifyDirectoryHandle(handle){
    if (!handle) return false;
    try {
      const ok = await ensurePermission(handle);
      if (!ok) return false;
      if (!handle.values) return true;
      // try to iterate once to ensure it is accessible
      const it = handle.values();
      if (it && typeof it.next === 'function') {
        await it.next();
      }
      return true;
    } catch (err){
      console.warn('Checklist: verifyDirectoryHandle failed', err);
      return false;
    }
  }

  async function ensureSortable(){
    if (window.Sortable) return;
    if (window.__CHECKLIST_SORTABLE_PROMISE__) return window.__CHECKLIST_SORTABLE_PROMISE__;
    const urls = [
      'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js'
    ];
    window.__CHECKLIST_SORTABLE_PROMISE__ = (async()=>{
      let last;
      for (const url of urls){
        try {
          await new Promise((resolve,reject)=>{
            const script=document.createElement('script');
            script.src=url;
            script.async=true;
            script.onload=resolve;
            script.onerror=()=>reject(new Error('Checklist: failed to load '+url));
            document.head.appendChild(script);
          });
          if (window.Sortable) return;
        } catch (err){ last = err; }
      }
      throw last || new Error('Checklist: Sortable konnte nicht geladen werden');
    })();
    return window.__CHECKLIST_SORTABLE_PROMISE__;
  }

  window.renderChecklist = function(root, ctx={}){
    ensureStyles();
    root.classList.add('cl-root');

    const header = document.createElement('div');
    header.className = 'cl-header';
    header.innerHTML = `
      <div class="cl-title">Checklist</div>
      <div class="cl-meta">
        <span class="cl-current"></span>
        <span class="cl-folder"></span>
      </div>
    `;

    const surface = document.createElement('div');
    surface.className = 'cl-surface';

    const status = document.createElement('div');
    status.className = 'cl-status';

    const hint = document.createElement('div');
    hint.className = 'cl-hint';
    hint.textContent = 'Wähle eine Meldung in der Geräteliste aus, um die Aufgaben zu sehen.';

    const list = document.createElement('div');
    list.className = 'cl-list';

    const empty = document.createElement('div');
    empty.className = 'cl-empty';
    empty.innerHTML = 'Keine Meldung ausgewählt oder keine Daten verfügbar.';

    surface.appendChild(status);
    surface.appendChild(hint);
    surface.appendChild(list);
    surface.appendChild(empty);

    root.innerHTML = '';
    root.appendChild(header);
    root.appendChild(surface);

    const state = {
      folderHandle: null,
      folderLabel: '',
      data: ensureTemplates(DEFAULT_DATA),
      dataHandle: null,
      currentMeldung: '',
      currentPart: '',
      currentEntry: null,
      sortable: null,
      destroyed: false,
      saving: false,
      lastDoc: localStorage.getItem(LS_KEY) || '',
      saveDebounced: null,
      folderLabelUpdater: null
    };

    state.saveDebounced = debounce(async()=>{
      await saveData();
    }, 400);

    function updateStatus(text, type){
      status.textContent = text || '';
      status.classList.toggle('text-warn', type === 'error');
    }

    function setFolderLabel(label){
      state.folderLabel = label || '';
      const folderEl = header.querySelector('.cl-folder');
      folderEl.textContent = label ? `📁 ${label}` : '';
      if (state.folderLabelUpdater) state.folderLabelUpdater();
    }

    function setCurrentLabel(){
      const currentEl = header.querySelector('.cl-current');
      if (!state.currentMeldung) {
        currentEl.textContent = '';
      } else {
        const part = state.currentPart ? ` · P/N ${state.currentPart}` : '';
        currentEl.textContent = `Meldung ${state.currentMeldung}${part}`;
      }
    }

    function showEmpty(message, hintMessage){
      empty.style.display = '';
      empty.innerHTML = message || 'Keine Meldung ausgewählt oder keine Daten verfügbar.';
      list.style.display = 'none';
      hint.style.display = '';
      hint.textContent = hintMessage || 'Wähle eine Meldung in der Geräteliste aus, um die Aufgaben zu sehen.';
    }

    function showList(){
      empty.style.display = 'none';
      list.style.display = 'flex';
      hint.style.display = 'none';
    }

    function markSaving(){
      updateStatus('Speichern ...');
    }

    function markSaved(){
      const ts = new Date().toLocaleTimeString();
      updateStatus(`Zuletzt gespeichert: ${ts}`);
    }

    function markError(err){
      updateStatus(err || 'Fehler beim Speichern', 'error');
    }

    function ensureDropzones(){
      const steps = state.currentEntry?.steps || [];
      list.innerHTML = '';
      if (!steps.length){
        const gap = createGapButton(0);
        list.appendChild(gap);
        showList();
        return;
      }
      for (let i = 0; i < steps.length; i++){
        const gap = createGapButton(i);
        list.appendChild(gap);
        const item = createItem(steps[i]);
        list.appendChild(item);
      }
      list.appendChild(createGapButton(steps.length));
      showList();
      initSortable();
      updateDependencies();
    }

    function createGapButton(index){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cl-gap';
      btn.dataset.index = String(index);
      btn.textContent = 'Schritt hinzufügen';
      btn.addEventListener('click', ()=>addStepAt(index));
      return btn;
    }

    function requirementsMet(step){
      if (!step.requires?.length) return true;
      const steps = state.currentEntry?.steps || [];
      return step.requires.every(req => {
        const other = queryStepById(steps, req);
        return other ? Boolean(other.done) : true;
      });
    }

    function createItem(step){
      const item = document.createElement('div');
      item.className = 'cl-item';
      item.dataset.id = step.id;
      if (step.done) item.classList.add('done');
      const ready = requirementsMet(step);
      if (!ready && !step.done) item.classList.add('disabled');
      if (step.lockToEnd) item.classList.add('locked');

      const grip = document.createElement('div');
      grip.className = 'cl-grip';
      grip.innerHTML = '&#8942;';

      const check = document.createElement('label');
      check.className = 'cl-check';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(step.done);
      input.disabled = !ready && !step.done;
      input.addEventListener('change', ()=>{
        step.done = input.checked;
        if (step.done) {
          item.classList.add('done');
        } else {
          item.classList.remove('done');
        }
        updateDependencies();
        persistEntry();
      });
      check.appendChild(input);
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24');
      const path = document.createElementNS('http://www.w3.org/2000/svg','polyline');
      path.setAttribute('points','5 13 9 17 19 7');
      svg.appendChild(path);
      check.appendChild(svg);

      const body = document.createElement('div');
      body.className = 'cl-body';
      const text = document.createElement('div');
      text.className = 'cl-text';
      text.textContent = step.text;
      body.appendChild(text);

      if (step.requires?.length){
        const reqWrap = document.createElement('div');
        reqWrap.className = 'cl-req';
        reqWrap.innerHTML = '<span>Voraussetzungen</span>';
        for (const req of step.requires){
          const other = queryStepById(state.currentEntry?.steps || [], req);
          const chip = document.createElement('span');
          chip.textContent = other ? other.text : 'Schritt';
          reqWrap.appendChild(chip);
        }
        body.appendChild(reqWrap);
      }

      const actions = document.createElement('div');
      actions.className = 'cl-actions';

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'cl-delete';
      del.textContent = '×';
      del.title = 'Schritt löschen';
      del.disabled = Boolean(step.lockToEnd);
      del.addEventListener('click', ()=>removeStep(step.id));
      actions.appendChild(del);
      actions.appendChild(grip);

      item.appendChild(check);
      item.appendChild(body);
      item.appendChild(actions);
      return item;
    }

    function addStepAt(index){
      const label = prompt('Neuer Schritt:');
      if (!label) return;
      const steps = state.currentEntry?.steps;
      if (!Array.isArray(steps)) return;
      const step = {
        id: randomId(),
        text: label.trim(),
        done: false,
        requires: [],
        lockToEnd: false,
        createdAt: new Date().toISOString()
      };
      steps.splice(index, 0, step);
      ensureFinalAtEnd(steps);
      syncFinalRequirement(steps);
      ensureDropzones();
      persistEntry();
    }

    function removeStep(id){
      const steps = state.currentEntry?.steps;
      if (!Array.isArray(steps)) return;
      const idx = steps.findIndex(step=>step.id === id);
      if (idx < 0) return;
      if (steps[idx].lockToEnd) return;
      steps.splice(idx, 1);
      for (const step of steps){
        if (Array.isArray(step.requires)) {
          step.requires = step.requires.filter(req => req !== id);
        }
      }
      syncFinalRequirement(steps);
      ensureDropzones();
      persistEntry();
    }

    function updateDependencies(){
      const steps = state.currentEntry?.steps || [];
      ensureFinalAtEnd(steps);
      syncFinalRequirement(steps);
      const items = list.querySelectorAll('.cl-item');
      items.forEach(item=>{
        const id = item.dataset.id;
        const step = queryStepById(steps, id);
        if (!step) return;
        const ready = requirementsMet(step);
        if (!ready && !step.done){
          item.classList.add('disabled');
        } else {
          item.classList.remove('disabled');
        }
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.disabled = !ready && !step.done;
      });
    }

    async function initSortable(){
      try {
        await ensureSortable();
      } catch (err){
        console.warn('Checklist: Sortable nicht verfügbar', err);
        return;
      }
      if (state.sortable){
        try { state.sortable.destroy(); } catch {}
        state.sortable = null;
      }
      state.sortable = Sortable.create(list, {
        animation: 150,
        handle: '.cl-grip',
        draggable: '.cl-item',
        filter: '.cl-gap',
        ghostClass: 'cl-ghost',
        chosenClass: 'cl-chosen',
        onMove: evt => {
          if (evt.related && evt.related.classList.contains('cl-gap')) return false;
          return true;
        },
        onEnd: evt => {
          if (evt.oldIndex === evt.newIndex) return;
          applyReorder();
        }
      });
    }

    function applyReorder(){
      const steps = state.currentEntry?.steps;
      if (!Array.isArray(steps)) return;
      const ids = Array.from(list.querySelectorAll('.cl-item')).map(item=>item.dataset.id);
      const newOrder = ids.map(id=>queryStepById(steps, id)).filter(Boolean);
      if (newOrder.length !== steps.length) return;
      steps.splice(0, steps.length, ...newOrder);
      ensureFinalAtEnd(steps);
      syncFinalRequirement(steps);
      ensureDropzones();
      persistEntry();
    }

    function persistEntry(){
      if (!state.currentEntry || !state.folderHandle) return;
      state.currentEntry.updatedAt = new Date().toISOString();
      state.currentEntry.partNumber = state.currentPart;
      markSaving();
      state.saveDebounced();
    }

    async function saveData(){
      if (!state.folderHandle) return;
      if (!state.data) return;
      try {
        const ok = await ensurePermission(state.folderHandle);
        if (!ok) throw new Error('Zugriff verweigert');
        const fileHandle = await state.folderHandle.getFileHandle(FILE_NAME, { create: true });
        const writable = await fileHandle.createWritable();
        state.data.__meta.updatedAt = new Date().toISOString();
        await writable.write(new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' }));
        await writable.close();
        markSaved();
      } catch (err){
        console.warn('Checklist: save failed', err);
        markError('Speichern fehlgeschlagen');
      }
    }

    async function loadData(){
      if (!state.folderHandle) return;
      try {
        const ok = await ensurePermission(state.folderHandle);
        if (!ok) throw new Error('Berechtigung für Ordner abgelehnt');
        const fileHandle = await state.folderHandle.getFileHandle(FILE_NAME, { create: true });
        state.dataHandle = fileHandle;
        const file = await fileHandle.getFile();
        let text = await file.text();
        if (!text.trim()){
          state.data = ensureTemplates(DEFAULT_DATA);
          await saveData();
        } else {
          state.data = ensureTemplates(parseJSON(text, DEFAULT_DATA));
        }
        updateStatus('Vorlagen geladen');
      } catch (err){
        console.warn('Checklist: loadData failed', err);
        state.data = ensureTemplates(DEFAULT_DATA);
        markError('Daten konnten nicht geladen werden');
      }
    }

    function ensureEntry(){
      if (!state.currentMeldung) {
        state.currentEntry = null;
        showEmpty('Keine Meldung ausgewählt. Wähle einen Eintrag in der Geräteliste.', 'Wähle in der Geräteliste eine Meldung aus, um die zugehörigen Aufgaben zu öffnen.');
        return;
      }
      if (!state.data || !state.folderHandle){
        state.currentEntry = null;
        showEmpty('Kein Datenordner gewählt. Rechtsklick → Vorlagen-Ordner wählen.', 'Rechtsklick in das Modul und wähle „Vorlagen-Ordner“, um die Checklisten-Daten zu laden.');
        return;
      }
      const store = state.data.meldungen;
      if (!store[state.currentMeldung]){
        store[state.currentMeldung] = {
          partNumber: state.currentPart,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          steps: buildStepsFromTemplates(state.data, state.currentPart)
        };
        markSaving();
        state.saveDebounced();
      }
      const entry = store[state.currentMeldung];
      entry.steps = Array.isArray(entry.steps) ? entry.steps : [];
      if (entry.steps.length && !entry.steps.some(step=>step.lockToEnd)){
        entry.steps[entry.steps.length-1].lockToEnd = true;
      }
      ensureFinalAtEnd(entry.steps);
      syncFinalRequirement(entry.steps);
      state.currentEntry = entry;
      ensureDropzones();
      markSaved();
    }

    function refreshFromDoc(){
      const doc = localStorage.getItem(LS_KEY) || '';
      if (doc === state.lastDoc) return;
      state.lastDoc = doc;
      applyGeneral();
    }

    function applyGeneral(){
      const { meldung, part } = getActiveContext();
      const changed = meldung !== state.currentMeldung || part !== state.currentPart;
      state.currentMeldung = meldung;
      state.currentPart = part;
      setCurrentLabel();
      if (changed) {
        ensureEntry();
      }
    }

    async function init(){
      applyGeneral();
      const storedHandle = await idbGet(FOLDER_KEY);
      if (storedHandle && await verifyDirectoryHandle(storedHandle)){
        state.folderHandle = storedHandle;
        setFolderLabel(storedHandle.name || 'Ordner');
        await loadData();
        ensureEntry();
      } else if (storedHandle){
        await idbDel(FOLDER_KEY);
        state.folderHandle = null;
        setFolderLabel('');
      }
      setupWatchers();
      setupContextMenu();
    }

    function setupWatchers(){
      const storageHandler = (e)=>{
        if (e.key === LS_KEY) {
          applyGeneral();
        }
      };
      window.addEventListener('storage', storageHandler);
      const timer = setInterval(refreshFromDoc, WATCH_INTERVAL);
      const observer = new MutationObserver(()=>{
        if (!document.body.contains(root)){
          cleanup();
        }
      });
      observer.observe(document.body, { childList:true, subtree:true });

      function cleanup(){
        if (state.destroyed) return;
        state.destroyed = true;
        clearInterval(timer);
        window.removeEventListener('storage', storageHandler);
        observer.disconnect();
        if (state.sortable){
          try { state.sortable.destroy(); } catch {}
          state.sortable = null;
        }
      }
    }

    function setupContextMenu(){
      const menu = document.createElement('div');
      menu.className = 'cl-menu';
      menu.innerHTML = `
        <button class="mi mi-folder">📂 Vorlagen-Ordner wählen</button>
        <div class="mi mi-folder-label noclick"></div>
        <button class="mi mi-reload">🔄 Daten neu laden</button>
      `;
      document.body.appendChild(menu);

      const updateMenuLabel = ()=>{
        const labelEl = menu.querySelector('.mi-folder-label');
        labelEl.textContent = state.folderLabel ? `• ${state.folderLabel}` : '• Kein Ordner gewählt';
      };
      state.folderLabelUpdater = updateMenuLabel;
      updateMenuLabel();

      const openMenu = (ev)=>{
        if (!root.contains(ev.target)) return;
        ev.preventDefault();
        ev.stopPropagation();
        const rect = menu.getBoundingClientRect();
        const w = rect.width || 220;
        const h = rect.height || 120;
        menu.style.left = clamp(ev.clientX, 8, innerWidth - w - 8) + 'px';
        menu.style.top = clamp(ev.clientY, 8, innerHeight - h - 8) + 'px';
        menu.classList.add('open');
      };
      const closeMenu = ()=>menu.classList.remove('open');

      const keyHandler = (e)=>{ if (e.key === 'Escape') closeMenu(); };
      document.addEventListener('contextmenu', openMenu);
      window.addEventListener('click', closeMenu);
      window.addEventListener('keydown', keyHandler);

      menu.querySelector('.mi-folder').addEventListener('click', async()=>{
        closeMenu();
        if (!('showDirectoryPicker' in window)){
          alert('Dein Browser unterstützt keinen Ordnerdialog.');
          return;
        }
        try {
          const handle = await window.showDirectoryPicker();
          if (!handle) return;
          const ok = await ensurePermission(handle);
          if (!ok) return;
          state.folderHandle = handle;
          setFolderLabel(handle.name || 'Ordner');
          await idbSet(FOLDER_KEY, handle);
          await loadData();
          ensureEntry();
          updateMenuLabel();
        } catch (err){
          console.warn('Checklist: Ordner nicht gewählt', err);
        }
      });

      menu.querySelector('.mi-reload').addEventListener('click', async()=>{
        closeMenu();
        if (!state.folderHandle) {
          alert('Kein Ordner gewählt.');
          return;
        }
        await loadData();
        ensureEntry();
        updateMenuLabel();
      });

      const observer = new MutationObserver(()=>{
        if (!document.body.contains(root)){
          menu.remove();
          document.removeEventListener('contextmenu', openMenu);
          window.removeEventListener('click', closeMenu);
          window.removeEventListener('keydown', keyHandler);
          state.folderLabelUpdater = null;
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList:true, subtree:true });
    }

    init();
  };
})();
