(function(){
  'use strict';

  const LS_DOC_KEY = 'module_data_v1';
  const WATCH_INTERVAL = 350;
  const SETTINGS_KEY = 'checklist:settings:v1';
  const IDB_NAME = 'checklistFS';
  const IDB_STORE = 'handles';
  const FILE_HANDLE_KEY = 'checklist:fileHandle';

  const DEFAULT_DATA = {
    version: 1,
    defaults: [
      { id: 'base:nameplates', text: 'Nameplates überprüfen', kind: 'default' },
      { id: 'base:sichtpruefung', text: 'Sichtprüfung', kind: 'default' },
      { id: 'base:eingangstest', text: 'Eingangstest', kind: 'default' },
      {
        id: 'base:zertifizieren',
        text: 'Zertifizieren lassen',
        kind: 'default',
        meta: { requireAll: true, hideRequirements: true }
      }
    ],
    partSpecific: [],
    meldungen: {}
  };

  function parse(value, fallback){
    try{
      return JSON.parse(value);
    }catch(_err){
      return fallback;
    }
  }

  function cloneDefaults(){
    return DEFAULT_DATA.defaults.map(def => normalizeTask(Object.assign({ checked: false }, def)));
  }

  function clonePartSpecific(){
    return DEFAULT_DATA.partSpecific.slice();
  }

  function normalizeTask(task){
    const requires = Array.isArray(task?.requires) ? task.requires.filter(Boolean) : [];
    const meta = task?.meta && typeof task.meta === 'object' ? Object.assign({}, task.meta) : {};
    const id = typeof task?.id === 'string' && task.id.trim() ? task.id.trim() : `task:${Math.random().toString(36).slice(2)}`;
    const kind = typeof task?.kind === 'string' && task.kind.trim() ? task.kind.trim() : 'custom';
    const text = typeof task?.text === 'string' && task.text.trim() ? task.text.trim() : 'Unbenannte Aufgabe';
    return {
      id,
      text,
      checked: Boolean(task?.checked),
      requires,
      kind,
      meta
    };
  }

  function normalizeDefinition(def, index){
    const normalized = normalizeTask(Object.assign({}, def, { checked: false }));
    if(!normalized.id){
      normalized.id = `default:${index}`;
    }
    if(normalized.id === 'base:zertifizieren'){
      normalized.meta.requireAll = true;
      normalized.meta.hideRequirements = true;
    }
    normalized.kind = def?.kind === 'part' ? 'part' : 'default';
    normalized.checked = false;
    return normalized;
  }

  function normalizePartEntry(entry, index){
    const prefix = typeof entry?.prefix === 'string' ? entry.prefix.trim() : '';
    const text = typeof entry?.text === 'string' ? entry.text.trim() : '';
    if(!prefix || !text) return null;
    const id = typeof entry?.id === 'string' && entry.id.trim() ? entry.id.trim() : `part:${prefix}:${index}`;
    return {
      id,
      prefix,
      text,
      meta: entry?.meta && typeof entry.meta === 'object' ? Object.assign({}, entry.meta) : {}
    };
  }

  function ensureDataShape(data){
    const result = { version: 1, defaults: [], partSpecific: [], meldungen: {} };
    if(data && typeof data === 'object'){
      if(Array.isArray(data.defaults) && data.defaults.length){
        result.defaults = data.defaults.map((def, idx) => normalizeDefinition(def, idx));
      }
      if(Array.isArray(data.partSpecific)){
        result.partSpecific = data.partSpecific.map((entry, idx) => normalizePartEntry(entry, idx)).filter(Boolean);
      }
      if(data.meldungen && typeof data.meldungen === 'object'){
        result.meldungen = {};
        Object.keys(data.meldungen).forEach(key => {
          const entry = data.meldungen[key];
          if(entry && typeof entry === 'object' && Array.isArray(entry.tasks)){
            result.meldungen[key] = {
              part: typeof entry.part === 'string' ? entry.part : '',
              tasks: entry.tasks.map(task => normalizeTask(task))
            };
          }
        });
      }
    }
    if(!result.defaults.length){
      result.defaults = cloneDefaults();
    }
    if(!result.partSpecific.length){
      result.partSpecific = clonePartSpecific();
    }
    if(!result.meldungen){
      result.meldungen = {};
    }
    result.version = 1;
    return result;
  }

  async function idbOpen(){
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if(!db.objectStoreNames.contains(IDB_STORE)){
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function idbSet(key, value){
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGet(key){
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbDel(key){
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function ensurePermission(handle, mode){
    if(!handle?.queryPermission) return true;
    const descriptor = { mode: mode || 'readwrite' };
    let status = await handle.queryPermission(descriptor);
    if(status === 'granted') return true;
    if(status === 'prompt'){
      status = await handle.requestPermission(descriptor);
      return status === 'granted';
    }
    return false;
  }

  function loadSettings(){
    const parsed = parse(localStorage.getItem(SETTINGS_KEY), {});
    if(!parsed || typeof parsed !== 'object') return {};
    return parsed;
  }

  function saveSettings(settings){
    try{
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings || {}));
    }catch(err){
      console.warn('Checklist: unable to persist settings', err);
    }
  }

  function partTasks(config, part){
    if(!Array.isArray(config?.partSpecific) || !part) return [];
    const upper = part.toUpperCase();
    return config.partSpecific
      .filter(entry => typeof entry?.prefix === 'string' && upper.startsWith(entry.prefix.toUpperCase()))
      .map((entry, index) => normalizeTask({
        id: entry.id || `part:${entry.prefix}:${index}`,
        text: entry.text || 'Zusatzschritt',
        checked: false,
        requires: [],
        kind: 'part',
        meta: Object.assign({ prefix: entry.prefix }, entry.meta || {})
      }));
  }

  function ensurePartTasks(tasks, config, part){
    if(!Array.isArray(tasks)) return [];
    const additions = partTasks(config, part);
    if(!additions.length) return tasks;
    const ids = new Set(tasks.map(t => t.id));
    const finalIndex = tasks.findIndex(t => t.id === 'base:zertifizieren' || t.meta?.requireAll || (t.kind === 'default' && /zertifiz/i.test(t.text)));
    const insertAt = finalIndex >= 0 ? finalIndex : tasks.length;
    const clones = tasks.slice();
    let offset = 0;
    additions.forEach(add => {
      if(ids.has(add.id)) return;
      clones.splice(insertAt + offset, 0, add);
      offset += 1;
      ids.add(add.id);
    });
    return clones;
  }

  function cleanRequirements(tasks){
    const ids = new Set(tasks.map(t => t.id));
    tasks.forEach(task => {
      if(Array.isArray(task.requires)){
        task.requires = task.requires.filter(req => ids.has(req));
      }else{
        task.requires = [];
      }
    });
  }

  function updateCertificationRequirements(tasks){
    if(!Array.isArray(tasks)) return;
    const cert = tasks.find(task => task.id === 'base:zertifizieren' || task.meta?.requireAll || (task.kind === 'default' && /zertifiz/i.test(task.text)));
    if(!cert) return;
    cert.meta = cert.meta && typeof cert.meta === 'object' ? cert.meta : {};
    cert.meta.requireAll = true;
    cert.meta.hideRequirements = true;
    cert.requires = tasks.filter(task => task.id !== cert.id).map(task => task.id);
  }

  function tasksDiffer(saved, current){
    if(!Array.isArray(saved) || !Array.isArray(current)) return true;
    if(saved.length !== current.length) return true;
    for(let i = 0; i < saved.length; i += 1){
      const a = saved[i];
      const b = current[i];
      if((a.id || '') !== (b.id || '')) return true;
      if((a.text || '') !== (b.text || '')) return true;
      if(Boolean(a.checked) !== Boolean(b.checked)) return true;
      const reqA = Array.isArray(a.requires) ? a.requires.slice().join('|') : '';
      const reqB = Array.isArray(b.requires) ? b.requires.slice().join('|') : '';
      if(reqA !== reqB) return true;
    }
    return false;
  }

  function computeBlocked(task, map, tasks){
    if(task?.meta?.requireAll){
      return tasks.some(other => other.id !== task.id && !map.get(other.id));
    }
    if(!Array.isArray(task?.requires) || !task.requires.length) return false;
    return task.requires.some(id => !map.get(id));
  }

  async function writeFile(handle, data){
    if(!handle || !data) return;
    const ok = await ensurePermission(handle, 'readwrite');
    if(!ok) throw new Error('Keine Berechtigung zum Schreiben.');
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  }

  function injectStyles(){
    if(document.getElementById('checklist-styles')) return;
    const css = `
    .cl-root{height:100%;display:flex;flex-direction:column;position:relative;background:rgba(255,255,255,.12);border-radius:.9rem;padding:.6rem;backdrop-filter:blur(6px);} 
    .cl-list{flex:1;overflow:auto;display:flex;flex-direction:column;gap:.25rem;padding:.15rem .05rem .45rem;}
    .cl-row{display:flex;align-items:center;flex-wrap:wrap;gap:.55rem;background:rgba(255,255,255,.92);color:#0f172a;border-radius:.7rem;padding:.45rem .55rem;box-shadow:0 6px 18px rgba(15,23,42,.12);transition:transform .15s ease, box-shadow .15s ease, opacity .15s ease;}
    .cl-row[data-checked="true"]{opacity:.86;box-shadow:0 3px 12px rgba(15,23,42,.12);} 
    .cl-row:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(15,23,42,.18);} 
    .cl-grip{background:rgba(15,23,42,.08);border:none;border-radius:.55rem;width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:inherit;font-size:1rem;cursor:grab;flex-shrink:0;} 
    .cl-grip:active{cursor:grabbing;} 
    .cl-check{display:flex;align-items:center;gap:.6rem;flex:1;cursor:pointer;} 
    .cl-check input{width:20px;height:20px;border-radius:.4rem;border:1px solid rgba(15,23,42,.2);} 
    .cl-task-text{flex:1;font-weight:500;} 
    .cl-remove{background:rgba(239,68,68,.12);color:#b91c1c;border:none;border-radius:.55rem;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:1rem;cursor:pointer;transition:background .15s ease,color .15s ease;} 
    .cl-remove:hover{background:rgba(239,68,68,.18);color:#7f1d1d;} 
    .cl-info{font-size:.75rem;color:#6b7280;margin-left:3.4rem;padding-right:.75rem;flex-basis:100%;} 
    .cl-row.blocked{outline:2px solid rgba(59,130,246,.35);} 
    .cl-row.blocked .cl-task-text{color:#1d4ed8;} 
    .cl-row.blocked .cl-check input{border-color:rgba(59,130,246,.55);} 
    .cl-row.blocked[data-checked="false"] .cl-check input{background:rgba(59,130,246,.12);} 
    .cl-insert{position:relative;width:100%;border:none;background:transparent;height:18px;cursor:pointer;opacity:0;transition:opacity .15s ease;}
    .cl-insert::before{content:'';position:absolute;left:16px;right:16px;top:50%;height:1px;background:rgba(15,23,42,.2);transform:translateY(-50%);border-radius:9999px;opacity:0;transition:opacity .15s ease;}
    .cl-insert span{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.85);background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border-radius:9999px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:.95rem;box-shadow:0 6px 14px rgba(79,70,229,.32);opacity:0;transition:opacity .15s ease,transform .15s ease;}
    .cl-insert:hover,.cl-insert:focus-visible{opacity:1;outline:none;}
    .cl-insert:hover::before,.cl-insert:focus-visible::before{opacity:.6;}
    .cl-insert:hover span,.cl-insert:focus-visible span{opacity:1;transform:translate(-50%,-50%) scale(1);}
    .cl-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:1rem;text-align:center;color:rgba(255,255,255,.78);font-size:.9rem;backdrop-filter:blur(3px);} 
    .cl-empty[hidden]{display:none;} 
    .cl-toast{position:absolute;top:.75rem;right:.75rem;background:rgba(15,23,42,.9);color:#f8fafc;padding:.5rem .75rem;border-radius:.65rem;font-size:.8rem;box-shadow:0 12px 30px rgba(15,23,42,.35);opacity:0;transform:translateY(-6px);transition:opacity .2s ease,transform .2s ease;pointer-events:none;z-index:10;} 
    .cl-toast.show{opacity:1;transform:translateY(0);} 
    .cl-menu{position:fixed;z-index:1000;display:none;min-width:220px;padding:.3rem;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border:1px solid var(--border-color,#e5e7eb);border-radius:.6rem;box-shadow:0 14px 34px rgba(15,23,42,.22);} 
    .cl-menu.open{display:block;} 
    .cl-menu .mi{display:block;width:100%;padding:.55rem .75rem;text-align:left;border-radius:.5rem;font-size:.9rem;cursor:pointer;background:none;border:none;color:inherit;} 
    .cl-menu .mi:hover{background:rgba(37,99,235,.12);} 
    .cl-menu .mi.noclick{cursor:default;opacity:.75;} 
    .cl-menu .mi.noclick:hover{background:none;} 
    .cl-ghost{opacity:.45;} 
    .cl-chosen{transform:scale(1.01);} 
    .cl-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(5px);display:none;align-items:center;justify-content:center;z-index:1200;padding:1rem;} 
    .cl-modal-overlay.open{display:flex;} 
    .cl-modal{background:#fff;color:#0f172a;border-radius:.9rem;box-shadow:0 20px 40px rgba(15,23,42,.25);width:min(420px,90vw);display:flex;flex-direction:column;gap:1rem;padding:1.4rem;} 
    .cl-modal-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;} 
    .cl-modal-title{font-size:1.1rem;font-weight:600;} 
    .cl-modal-close{background:none;border:none;font-size:1.3rem;line-height:1;color:#4b5563;cursor:pointer;} 
    .cl-modal-body{display:flex;flex-direction:column;gap:1rem;font-size:.95rem;color:#334155;} 
    .cl-modal-actions{display:flex;flex-direction:column;gap:.6rem;} 
    .cl-modal-actions button{border:none;border-radius:.65rem;padding:.65rem 1rem;font-size:.95rem;cursor:pointer;display:flex;align-items:center;gap:.5rem;justify-content:center;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;box-shadow:0 10px 22px rgba(79,70,229,.25);} 
    .cl-modal-actions button.secondary{background:rgba(37,99,235,.12);color:#1d4ed8;box-shadow:none;} 
    .cl-modal-actions button.danger{background:rgba(239,68,68,.14);color:#b91c1c;box-shadow:none;} 
    .cl-modal-actions button:hover{filter:brightness(1.05);} 
    .cl-modal-footer{display:flex;justify-content:flex-end;} 
    `;
    const tag = document.createElement('style');
    tag.id = 'checklist-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  function clamp(n, min, max){
    return Math.max(min, Math.min(max, n));
  }

  const getGeneral = () => {
    const doc = parse(localStorage.getItem(LS_DOC_KEY), { general: {} }) || { general: {} };
    return doc.general || {};
  };

  function activeMeldung(){
    const general = getGeneral();
    return (general.Meldung || '').trim();
  }

  function activePart(){
    const general = getGeneral();
    return (general.PartNo || general.Part || general.PN || '').trim();
  }

  window.renderChecklist = function(root){
    injectStyles();

      const state = {
        meldung: '',
        part: '',
        tasks: [],
        fileHandle: null,
        fileData: null,
        fileName: '',
        settings: loadSettings(),
        toastTimer: null,
        saveTimer: null,
        writeTimer: null,
        writing: false,
        pendingWrite: false,
        optionsModal: null,
        sortable: null,
        sortableCleanupAdded: false,
        lastDoc: localStorage.getItem(LS_DOC_KEY) || '',
        cleanupFns: []
      };

    root.innerHTML = `
      <div class="cl-root">
        <div class="cl-list"></div>
        <div class="cl-empty" hidden>Keine Aufgaben verfügbar.</div>
        <div class="cl-toast"></div>
      </div>
    `;

    const elements = {
      list: root.querySelector('.cl-list'),
      empty: root.querySelector('.cl-empty'),
      toast: root.querySelector('.cl-toast')
    };

    const menu = document.createElement('div');
    menu.className = 'cl-menu';
    menu.innerHTML = `
      <button class="mi mi-options">⚙️ Optionen…</button>
      <div class="mi mi-name noclick"></div>
      <hr style="border:none;border-top:1px solid rgba(0,0,0,.08);margin:.35rem .4rem;" />
      <button class="mi mi-reset">🔄 Aufgaben neu generieren</button>
    `;
    document.body.appendChild(menu);

    function updateMenuLabels(){
      const nameEl = menu.querySelector('.mi-name');
      const label = state.fileName || state.settings?.fileName || '';
      nameEl.textContent = label ? `• ${label}` : 'Keine Datei gewählt';
    }

    function showToast(message){
      if(!elements.toast) return;
      elements.toast.textContent = message;
      elements.toast.classList.add('show');
      if(state.toastTimer) clearTimeout(state.toastTimer);
      state.toastTimer = setTimeout(() => {
        elements.toast.classList.remove('show');
      }, 2600);
    }

    function updateEmptyState(reason){
      if(!elements.empty) return;
      if(reason){
        elements.empty.hidden = false;
        elements.empty.textContent = reason;
        return true;
      }
      if(!state.fileHandle){
        elements.empty.hidden = false;
        elements.empty.textContent = 'Bitte in den Optionen eine JSON-Datei auswählen oder erstellen.';
        return true;
      }
      if(!state.meldung){
        elements.empty.hidden = false;
        elements.empty.textContent = 'Keine Meldung ausgewählt.';
        return true;
      }
      if(!state.tasks.length){
        elements.empty.hidden = false;
        elements.empty.textContent = 'Keine Aufgaben verfügbar.';
        return true;
      }
      elements.empty.hidden = true;
      return false;
    }

    function openMenu(event){
      if(!root.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      const pad = 8;
      const rect = menu.getBoundingClientRect();
      const w = rect.width || 220;
      const h = rect.height || 160;
      menu.style.left = clamp(event.clientX, pad, window.innerWidth - w - pad) + 'px';
      menu.style.top = clamp(event.clientY, pad, window.innerHeight - h - pad) + 'px';
      menu.classList.add('open');
    }

    function closeMenu(){
      menu.classList.remove('open');
    }

    const contextHandler = e => openMenu(e);
    document.addEventListener('contextmenu', contextHandler);
    const clickHandler = e => { if(!menu.contains(e.target)) closeMenu(); };
    const keyHandler = e => { if(e.key === 'Escape') closeMenu(); };
    window.addEventListener('click', clickHandler);
    window.addEventListener('keydown', keyHandler);

    state.cleanupFns.push(() => {
      document.removeEventListener('contextmenu', contextHandler);
      window.removeEventListener('click', clickHandler);
      window.removeEventListener('keydown', keyHandler);
      menu.remove();
    });

    function copyForStorage(task){
      return {
        id: task.id,
        text: task.text,
        checked: task.checked,
        requires: Array.isArray(task.requires) ? task.requires.slice() : [],
        kind: task.kind,
        meta: task.meta ? Object.assign({}, task.meta) : {}
      };
    }

    function scheduleFileWrite(){
      if(!state.fileHandle || !state.fileData) return;
      if(state.writeTimer) clearTimeout(state.writeTimer);
      state.writeTimer = setTimeout(saveFileData, 160);
    }

    async function saveFileData(){
      if(!state.fileHandle || !state.fileData) return;
      if(state.writing){
        state.pendingWrite = true;
        return;
      }
      state.writing = true;
      state.pendingWrite = false;
      try{
        await writeFile(state.fileHandle, state.fileData);
      }catch(err){
        console.error('Checklist: save failed', err);
        showToast('Speichern fehlgeschlagen.');
      }finally{
        state.writing = false;
        if(state.pendingWrite){
          state.pendingWrite = false;
          saveFileData();
        }
      }
    }

    function persistMeldState(){
      if(!state.fileHandle || !state.fileData || !state.meldung) return;
      updateCertificationRequirements(state.tasks);
      const payload = {
        part: state.part,
        tasks: state.tasks.map(copyForStorage),
        updatedAt: new Date().toISOString()
      };
      state.fileData.meldungen[state.meldung] = payload;
      scheduleFileWrite();
    }

    function scheduleSave(){
      if(state.saveTimer) clearTimeout(state.saveTimer);
      state.saveTimer = setTimeout(() => {
        persistMeldState();
      }, 180);
    }

    function ensureSortable(){
      if(!window.Sortable) return;
      if(state.sortable){
        state.sortable.destroy();
        state.sortable = null;
      }
      state.sortable = new Sortable(elements.list, {
        animation: 150,
        handle: '.cl-grip',
        draggable: '.cl-row',
        ghostClass: 'cl-ghost',
        chosenClass: 'cl-chosen',
        onEnd(evt){
          if(evt.oldIndex == null || evt.newIndex == null) return;
          syncOrderWithDom();
        }
      });
      if(!state.sortableCleanupAdded){
        state.sortableCleanupAdded = true;
        state.cleanupFns.push(() => {
          if(state.sortable){
            state.sortable.destroy();
            state.sortable = null;
          }
        });
      }
    }

    function syncOrderWithDom(){
      const rows = Array.from(elements.list.querySelectorAll('.cl-row'));
      if(rows.length !== state.tasks.length) return;
      const lookup = new Map(state.tasks.map(task => [task.id, task]));
      const next = [];
      for(const row of rows){
        if(!lookup.has(row.dataset.id)) return;
        next.push(lookup.get(row.dataset.id));
      }
      if(next.length !== state.tasks.length) return;
      const changed = next.some((task, idx) => task !== state.tasks[idx]);
      if(!changed) return;
      state.tasks = next.slice();
      updateCertificationRequirements(state.tasks);
      scheduleSave();
      renderTasks();
    }

    function addTaskAt(index){
      const text = (prompt('Text für den neuen Schritt:') || '').trim();
      if(!text) return;
      const task = normalizeTask({
        id: `custom:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 6)}`,
        text,
        checked: false,
        requires: [],
        kind: 'custom'
      });
      if(index < 0 || index > state.tasks.length) index = state.tasks.length;
      state.tasks.splice(index, 0, task);
      updateCertificationRequirements(state.tasks);
      scheduleSave();
      renderTasks();
    }

    function removeTask(id){
      const index = state.tasks.findIndex(task => task.id === id);
      if(index < 0) return;
      state.tasks.splice(index, 1);
      state.tasks.forEach(task => {
        if(Array.isArray(task.requires)){
          task.requires = task.requires.filter(req => req !== id);
        }
      });
      updateCertificationRequirements(state.tasks);
      scheduleSave();
      renderTasks();
    }

    function toggleTask(id, checked){
      const task = state.tasks.find(t => t.id === id);
      if(!task) return;
      updateCertificationRequirements(state.tasks);
      const checkedMap = new Map(state.tasks.map(t => [t.id, t.checked]));
      const blocked = computeBlocked(task, checkedMap, state.tasks);
      if(checked && blocked){
        showToast('Bitte zuerst alle Voraussetzungen abhaken.');
        renderTasks();
        return;
      }
      task.checked = checked;
      applyRequirementRules();
      scheduleSave();
      renderTasks();
    }

    function applyRequirementRules(){
      updateCertificationRequirements(state.tasks);
      const checkedMap = new Map(state.tasks.map(task => [task.id, task.checked]));
      let changed = false;
      state.tasks.forEach(task => {
        const blocked = computeBlocked(task, checkedMap, state.tasks);
        if(blocked && task.checked){
          task.checked = false;
          checkedMap.set(task.id, false);
          changed = true;
        }
      });
      if(changed) scheduleSave();
    }

    function renderTasks(){
      elements.list.innerHTML = '';
      if(updateEmptyState()){
        ensureSortable();
        return;
      }
      const frag = document.createDocumentFragment();
      const map = new Map(state.tasks.map(t => [t.id, t.checked]));
      state.tasks.forEach((task, index) => {
        const insert = document.createElement('button');
        insert.type = 'button';
        insert.className = 'cl-insert';
        insert.dataset.index = String(index);
        insert.innerHTML = '<span>+</span>';
        frag.appendChild(insert);

        const row = document.createElement('div');
        row.className = 'cl-row';
        row.dataset.id = task.id;
        row.dataset.checked = task.checked ? 'true' : 'false';

        const grip = document.createElement('button');
        grip.type = 'button';
        grip.className = 'cl-grip';
        grip.innerHTML = '<span style="font-size:1.1rem">⋮⋮</span>';
        row.appendChild(grip);

        const label = document.createElement('label');
        label.className = 'cl-check';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'cl-checkbox';
        checkbox.checked = !!task.checked;
        checkbox.dataset.id = task.id;

        const requiresMet = !computeBlocked(task, map, state.tasks);
        checkbox.disabled = !requiresMet && !task.checked;

        const text = document.createElement('span');
        text.className = 'cl-task-text';
        text.textContent = task.text;

        label.appendChild(checkbox);
        label.appendChild(text);
        row.appendChild(label);

        if(Array.isArray(task.requires) && task.requires.length && !task.meta?.hideRequirements){
          const info = document.createElement('div');
          info.className = 'cl-info';
          const names = task.requires
            .map(req => state.tasks.find(t => t.id === req)?.text)
            .filter(Boolean);
          info.textContent = names.length ? `Voraussetzungen: ${names.join(', ')}` : '';
          row.appendChild(info);
        }

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'cl-remove';
        remove.dataset.id = task.id;
        remove.innerHTML = '×';
        row.appendChild(remove);

        if(!requiresMet && !task.checked){
          row.classList.add('blocked');
        }

        frag.appendChild(row);
      });

      const lastInsert = document.createElement('button');
      lastInsert.type = 'button';
      lastInsert.className = 'cl-insert';
      lastInsert.dataset.index = String(state.tasks.length);
      lastInsert.innerHTML = '<span>+</span>';
      frag.appendChild(lastInsert);

      elements.list.appendChild(frag);
      updateEmptyState();
      ensureSortable();
    }

    elements.list.addEventListener('click', event => {
      const insert = event.target.closest('.cl-insert');
      if(insert){
        const idx = Number(insert.dataset.index || state.tasks.length);
        addTaskAt(Number.isFinite(idx) ? idx : state.tasks.length);
        return;
      }
      const remove = event.target.closest('.cl-remove');
      if(remove){
        removeTask(remove.dataset.id);
      }
    });

    elements.list.addEventListener('change', event => {
      const checkbox = event.target.closest('.cl-checkbox');
      if(!checkbox) return;
      const id = checkbox.dataset.id;
      toggleTask(id, checkbox.checked);
    });

    function tasksFromDefaults(){
      if(!state.fileData) return [];
      return Array.isArray(state.fileData.defaults)
        ? state.fileData.defaults.map(def => normalizeTask(Object.assign({}, def, { checked: false })))
        : cloneDefaults();
    }

    function buildInitialTasks(){
      if(!state.fileData) return [];
      let tasks = tasksFromDefaults();
      tasks = ensurePartTasks(tasks, state.fileData, state.part);
      cleanRequirements(tasks);
      updateCertificationRequirements(tasks);
      return tasks;
    }

    function hydrateTasks(raw){
      let normalized = Array.isArray(raw) ? raw.map(normalizeTask) : [];
      normalized = normalized.filter(task => {
        if(task.kind === 'part' && task.meta && task.meta.prefix){
          if(!state.part) return false;
          return state.part.toUpperCase().startsWith(String(task.meta.prefix || '').toUpperCase());
        }
        return true;
      });
      const ensured = ensurePartTasks(normalized, state.fileData, state.part);
      cleanRequirements(ensured);
      updateCertificationRequirements(ensured);
      return ensured;
    }

    function loadTasks(){
      if(!state.fileHandle || !state.fileData){
        state.tasks = [];
        renderTasks();
        return;
      }
      if(!state.meldung){
        state.tasks = [];
        renderTasks();
        return;
      }
      const entry = state.fileData.meldungen[state.meldung];
      if(entry && Array.isArray(entry.tasks)){
        state.tasks = hydrateTasks(entry.tasks);
        const partChanged = (entry.part || '') !== state.part;
        if(partChanged || tasksDiffer(entry.tasks, state.tasks)){
          persistMeldState();
        }
      }else{
        state.tasks = buildInitialTasks();
        persistMeldState();
      }
      applyRequirementRules();
      renderTasks();
    }

    async function handleFile(handle){
      if(!handle) return;
      const ok = await ensurePermission(handle, 'readwrite');
      if(!ok){
        showToast('Keine Berechtigung für die gewählte Datei.');
        return;
      }
      try{
        const file = await handle.getFile();
        const text = await file.text();
        const parsed = parse(text, null);
        state.fileData = ensureDataShape(parsed || DEFAULT_DATA);
      }catch(err){
        console.warn('Checklist: Datei konnte nicht gelesen werden, verwende Standarddaten.', err);
        state.fileData = ensureDataShape(DEFAULT_DATA);
      }
      state.fileHandle = handle;
      state.fileName = handle.name || '';
      state.settings.fileName = state.fileName;
      saveSettings(state.settings);
      try{
        await idbSet(FILE_HANDLE_KEY, handle);
      }catch(err){
        console.warn('Checklist: Handle konnte nicht gespeichert werden', err);
      }
      updateMenuLabels();
      showToast('Checklist-Datei geladen.');
      loadTasks();
    }

    async function pickExistingFile(){
      if(!('showOpenFilePicker' in window)){
        showToast('Dateiauswahl wird nicht unterstützt.');
        return;
      }
      closeMenu();
      try{
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
          multiple: false
        });
        await handleFile(handle);
      }catch(err){
        if(err?.name !== 'AbortError') console.warn('Checklist: Dateiauswahl abgebrochen', err);
      }
    }

    async function createNewFile(){
      if(!('showSaveFilePicker' in window)){
        showToast('Speicherdialog wird nicht unterstützt.');
        return;
      }
      closeMenu();
      try{
        const handle = await window.showSaveFilePicker({
          suggestedName: 'ChecklistData.json',
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
        });
        const data = ensureDataShape(DEFAULT_DATA);
        await writeFile(handle, data);
        state.fileData = data;
        await handleFile(handle);
      }catch(err){
        if(err?.name !== 'AbortError') console.warn('Checklist: Erstellen der Datei abgebrochen', err);
      }
    }

    async function forgetFile(){
      closeMenu();
      state.fileHandle = null;
      state.fileData = null;
      state.fileName = '';
      state.settings.fileName = '';
      saveSettings(state.settings);
      try{ await idbDel(FILE_HANDLE_KEY); }catch(_err){}
      state.tasks = [];
      renderTasks();
      showToast('Datei entfernt.');
      updateMenuLabels();
    }

    function regenerate(){
      closeMenu();
      if(!state.meldung){
        showToast('Keine Meldung aktiv.');
        return;
      }
      if(!state.fileHandle || !state.fileData){
        showToast('Keine Datei gewählt.');
        return;
      }
      state.tasks = buildInitialTasks();
      persistMeldState();
      renderTasks();
      showToast('Aufgaben neu generiert.');
    }

    function ensureOptionsModal(){
      if(state.optionsModal) return state.optionsModal;
      const overlay = document.createElement('div');
      overlay.className = 'cl-modal-overlay';
      overlay.innerHTML = `
        <div class="cl-modal" role="dialog" aria-modal="true">
          <div class="cl-modal-header">
            <div class="cl-modal-title">Checklist Optionen</div>
            <button type="button" class="cl-modal-close" aria-label="Schließen">×</button>
          </div>
          <div class="cl-modal-body">
            <div class="cl-modal-current">Aktuelle Datei: <span class="cl-modal-file">Keine Datei gewählt</span></div>
            <div class="cl-modal-actions">
              <button type="button" class="cl-modal-pick">📂 Vorhandene JSON auswählen</button>
              <button type="button" class="cl-modal-create secondary">🆕 Neue JSON erstellen</button>
              <button type="button" class="cl-modal-forget danger">🗑️ Auswahl entfernen</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const fileLabel = overlay.querySelector('.cl-modal-file');
      const closeBtn = overlay.querySelector('.cl-modal-close');
      const pickBtn = overlay.querySelector('.cl-modal-pick');
      const createBtn = overlay.querySelector('.cl-modal-create');
      const forgetBtn = overlay.querySelector('.cl-modal-forget');

      function update(){
        const name = state.fileName || state.settings?.fileName || '';
        fileLabel.textContent = name || 'Keine Datei gewählt';
      }

      function close(){
        overlay.classList.remove('open');
        window.removeEventListener('keydown', escHandler);
      }

      function open(){
        update();
        overlay.classList.add('open');
        window.addEventListener('keydown', escHandler);
      }

      function escHandler(event){
        if(event.key === 'Escape'){
          event.preventDefault();
          close();
        }
      }

      overlay.addEventListener('click', event => {
        if(event.target === overlay){
          close();
        }
      });
      closeBtn.addEventListener('click', close);
      pickBtn.addEventListener('click', () => { close(); pickExistingFile(); });
      createBtn.addEventListener('click', () => { close(); createNewFile(); });
      forgetBtn.addEventListener('click', () => { close(); forgetFile(); });

      state.cleanupFns.push(() => overlay.remove());

      state.optionsModal = { open, close, update };
      return state.optionsModal;
    }

    function openOptions(){
      closeMenu();
      const modal = ensureOptionsModal();
      modal.open();
    }

    menu.querySelector('.mi-options').addEventListener('click', openOptions);
    menu.querySelector('.mi-reset').addEventListener('click', regenerate);
    updateMenuLabels();

    async function restoreHandle(){
      try{
        const handle = await idbGet(FILE_HANDLE_KEY);
        if(handle){
          const ok = await ensurePermission(handle, 'readwrite');
          if(ok){
            await handleFile(handle);
            return;
          }
        }
      }catch(err){
        console.warn('Checklist: Handle konnte nicht geladen werden', err);
      }
      updateMenuLabels();
      if(state.settings?.fileName){
        state.fileName = state.settings.fileName;
      }
    }

    function refreshFromDoc(){
      state.meldung = activeMeldung();
      state.part = activePart();
      loadTasks();
    }

    const storageHandler = event => {
      if(event.key === LS_DOC_KEY){
        refreshFromDoc();
      }
    };
    window.addEventListener('storage', storageHandler);
    state.cleanupFns.push(() => window.removeEventListener('storage', storageHandler));

    const boardHandler = () => refreshFromDoc();
    window.addEventListener('unitBoard:update', boardHandler);
    state.cleanupFns.push(() => window.removeEventListener('unitBoard:update', boardHandler));

    const poller = setInterval(() => {
      const now = localStorage.getItem(LS_DOC_KEY) || '';
      if(now !== state.lastDoc){
        state.lastDoc = now;
        refreshFromDoc();
      }
    }, WATCH_INTERVAL);
    state.cleanupFns.push(() => clearInterval(poller));

    const observer = new MutationObserver(() => {
      if(!document.body.contains(root)){
        cleanup();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    state.cleanupFns.push(() => observer.disconnect());

    function cleanup(){
      state.cleanupFns.forEach(fn => { try{ fn(); }catch(_err){} });
      state.cleanupFns.length = 0;
    }

    restoreHandle().then(() => {
      if(!state.fileHandle){
        renderTasks();
      }
      refreshFromDoc();
    });
  };
})();
