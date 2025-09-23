(function(){
  'use strict';

  const DATA_URL = 'modules/Checklist/ChecklistData.json';
  const STORAGE_KEY = 'checklist:data:v1';
  const LS_DOC_KEY = 'module_data_v1';
  const IDB_NAME = 'checklistFS';
  const IDB_STORE = 'handles';
  const TEMPLATE_HANDLE_KEY = 'checklist:templateFolder';
  const WATCH_INTERVAL = 350;

  const parse = (value, fallback) => {
    try{ return JSON.parse(value); }catch(e){ return fallback; }
  };
  const loadDoc = () => parse(localStorage.getItem(LS_DOC_KEY), {general:{}}) || {general:{}};
  const getGeneral = () => loadDoc().general || {};

  function activeMeldung(){
    const general = getGeneral();
    return (general.Meldung || '').trim();
  }
  function activePart(){
    const general = getGeneral();
    return (general.PartNo || general.Part || general.PN || '').trim();
  }

  let configPromise = null;
  function loadConfig(){
    if(configPromise) return configPromise;
    configPromise = fetch(DATA_URL, {cache:'no-store'})
      .then(resp => {
        if(!resp.ok) throw new Error('Checklist data not available');
        return resp.json();
      })
      .catch(err => {
        console.warn('Checklist: using fallback config', err);
        return {
          version: 1,
          defaults: [
            {id:'base:nameplates', text:'Nameplates überprüfen'},
            {id:'base:sichtpruefung', text:'Sichtprüfung'},
            {id:'base:eingangstest', text:'Eingangstest'},
            {id:'base:zertifizieren', text:'Zertifizieren lassen', requires:['base:nameplates','base:sichtpruefung','base:eingangstest']}
          ],
          partSpecific: []
        };
      });
    return configPromise;
  }

  function loadStore(){
    const fallback = {version:1, meldungen:{}, meta:{}};
    const value = localStorage.getItem(STORAGE_KEY);
    if(!value) return fallback;
    const parsed = parse(value, fallback);
    if(!parsed || typeof parsed !== 'object') return fallback;
    parsed.version = 1;
    parsed.meldungen = parsed.meldungen && typeof parsed.meldungen === 'object' ? parsed.meldungen : {};
    parsed.meta = parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {};
    return parsed;
  }

  function saveStore(store){
    const payload = Object.assign({}, store, {version:1, updatedAt:new Date().toISOString()});
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }catch(err){
      console.warn('Checklist: unable to persist store', err);
    }
  }

  function normalizeTask(task){
    const requires = Array.isArray(task?.requires) ? task.requires.filter(Boolean) : [];
    return {
      id: String(task?.id || `task:${Math.random().toString(36).slice(2)}`),
      text: String(task?.text || '').trim() || 'Unbenannte Aufgabe',
      checked: Boolean(task?.checked),
      requires,
      kind: task?.kind || 'custom',
      meta: task?.meta && typeof task.meta === 'object' ? task.meta : {},
    };
  }

  function createTaskFromDef(def){
    const task = normalizeTask(def);
    task.checked = false;
    return task;
  }

  function tasksFromConfig(config){
    return Array.isArray(config?.defaults) ? config.defaults.map(def => {
      const task = createTaskFromDef({
        id: def.id,
        text: def.text,
        requires: Array.isArray(def.requires) ? def.requires.slice() : [],
        kind: 'default',
      });
      return task;
    }) : [];
  }

  function partTasks(config, part){
    if(!Array.isArray(config?.partSpecific) || !part) return [];
    const upper = part.toUpperCase();
    return config.partSpecific
      .filter(entry => typeof entry?.prefix === 'string' && upper.startsWith(entry.prefix.toUpperCase()))
      .map((entry, index) => createTaskFromDef({
        id: entry.id || `part:${entry.prefix}:${index}`,
        text: entry.text || 'Zusatzschritt',
        kind: 'part',
        meta: { prefix: entry.prefix }
      }));
  }

  function ensurePartTasks(tasks, config, part){
    if(!Array.isArray(tasks)) return [];
    const additions = partTasks(config, part);
    if(!additions.length) return tasks;
    const ids = new Set(tasks.map(t => t.id));
    const finalIndex = tasks.findIndex(t => t.id === 'base:zertifizieren' || t.kind === 'default' && /zertifiz/i.test(t.text));
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
      task.requires = (task.requires || []).filter(req => ids.has(req));
      if(!Array.isArray(task.requires)) task.requires = [];
    });
  }

  function tasksDiffer(saved, current){
    if(!Array.isArray(saved) || !Array.isArray(current)) return true;
    if(saved.length !== current.length) return true;
    for(let i=0;i<saved.length;i+=1){
      const a = saved[i];
      const b = current[i];
      if((a.id||'') !== (b.id||'')) return true;
      if((a.text||'') !== (b.text||'')) return true;
      if(Boolean(a.checked) !== Boolean(b.checked)) return true;
      const reqA = Array.isArray(a.requires) ? a.requires.slice().join('|') : '';
      const reqB = Array.isArray(b.requires) ? b.requires.slice().join('|') : '';
      if(reqA !== reqB) return true;
    }
    return false;
  }

  function computeBlocked(task, map){
    if(!task.requires || !task.requires.length) return false;
    return task.requires.some(id => !map.get(id));
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

  async function ensureRPermission(handle){
    if(!handle?.queryPermission) return true;
    const q = await handle.queryPermission({mode:'read'});
    if(q === 'granted') return true;
    if(q === 'prompt'){
      const p = await handle.requestPermission({mode:'read'});
      return p === 'granted';
    }
    return false;
  }

  function injectStyles(){
    if(document.getElementById('checklist-styles')) return;
    const css = `
    .cl-root{height:100%;display:flex;flex-direction:column;gap:.8rem;color:var(--text-color,#111827);}
    .cl-head{display:flex;flex-direction:column;gap:.15rem;user-select:none;}
    .cl-title{font-weight:600;font-size:1.05rem;color:inherit;display:flex;align-items:center;gap:.5rem;}
    .cl-sub{display:flex;flex-wrap:wrap;gap:.5rem;font-size:.85rem;opacity:.85;}
    .cl-surface{flex:1;display:flex;flex-direction:column;background:rgba(255,255,255,.12);border-radius:.9rem;padding:.75rem;overflow:hidden;backdrop-filter:blur(6px);min-height:4rem;}
    .cl-list{flex:1;overflow:auto;display:flex;flex-direction:column;gap:.5rem;position:relative;padding:.25rem 0;}
    .cl-row{display:flex;align-items:center;flex-wrap:wrap;gap:.75rem;background:rgba(255,255,255,.92);color:#0f172a;border-radius:.75rem;padding:.55rem .65rem;box-shadow:0 6px 18px rgba(15,23,42,.12);transition:transform .15s ease, box-shadow .15s ease, opacity .15s ease;}
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
    .cl-insert{position:relative;width:100%;border:none;background:transparent;height:22px;cursor:pointer;opacity:0;transition:opacity .15s ease;}
    .cl-insert::before{content:'';position:absolute;left:16px;right:16px;top:50%;height:2px;background:rgba(255,255,255,.35);transform:translateY(-50%);border-radius:9999px;}
    .cl-insert span{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border-radius:9999px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:1rem;box-shadow:0 6px 14px rgba(79,70,229,.32);}
    .cl-list:hover .cl-insert{opacity:.45;}
    .cl-insert:hover{opacity:.95;}
    .cl-insert:focus-visible{opacity:1;outline:none;}
    .cl-empty{flex:1;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.75);font-size:.9rem;padding:1rem;text-align:center;}
    .cl-toast{position:absolute;top:1rem;right:1rem;background:rgba(15,23,42,.9);color:#f8fafc;padding:.5rem .75rem;border-radius:.65rem;font-size:.8rem;box-shadow:0 12px 30px rgba(15,23,42,.35);opacity:0;transform:translateY(-6px);transition:opacity .2s ease,transform .2s ease;pointer-events:none;z-index:2;}
    .cl-toast.show{opacity:1;transform:translateY(0);}
    .cl-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem;font-size:.8rem;opacity:.85;}
    .cl-meta span{display:flex;align-items:center;gap:.35rem;}
    .cl-menu{position:fixed;z-index:1000;display:none;min-width:220px;padding:.3rem;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border:1px solid var(--border-color,#e5e7eb);border-radius:.6rem;box-shadow:0 14px 34px rgba(15,23,42,.22);}
    .cl-menu.open{display:block;}
    .cl-menu .mi{display:block;width:100%;padding:.55rem .75rem;text-align:left;border-radius:.5rem;font-size:.9rem;cursor:pointer;background:none;border:none;color:inherit;}
    .cl-menu .mi:hover{background:rgba(37,99,235,.12);}
    .cl-menu .mi.noclick{cursor:default;opacity:.75;}
    .cl-menu .mi.noclick:hover{background:none;}
    .cl-ghost{opacity:.45;}
    .cl-chosen{transform:scale(1.01);}
    `;
    const tag = document.createElement('style');
    tag.id = 'checklist-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

  window.renderChecklist = function(root){
    injectStyles();

    const state = {
      meldung: '',
      part: '',
      tasks: [],
      config: null,
      store: loadStore(),
      folderHandle: null,
      folderName: '',
      toastTimer: null,
      sortable: null,
      sortableCleanupAdded: false,
      lastDoc: localStorage.getItem(LS_DOC_KEY) || '',
      cleanupFns: [],
      saving: false,
    };

    const elements = {};
    root.innerHTML = `
      <div class="cl-root">
        <div class="cl-head">
          <div class="cl-title">Checklist</div>
          <div class="cl-sub">
            <span class="cl-meld"></span>
            <span class="cl-part"></span>
          </div>
        </div>
        <div class="cl-surface">
          <div class="cl-meta">
            <span class="cl-folder"></span>
            <span class="cl-status"></span>
          </div>
          <div class="cl-list"></div>
          <div class="cl-empty" hidden>Keine Meldung ausgewählt.</div>
          <div class="cl-toast"></div>
        </div>
      </div>
    `;
    elements.list = root.querySelector('.cl-list');
    elements.empty = root.querySelector('.cl-empty');
    elements.toast = root.querySelector('.cl-toast');
    elements.meld = root.querySelector('.cl-meld');
    elements.part = root.querySelector('.cl-part');
    elements.folder = root.querySelector('.cl-folder');
    elements.status = root.querySelector('.cl-status');

    const menu = document.createElement('div');
    menu.className = 'cl-menu';
    menu.innerHTML = `
      <button class="mi mi-pick">📂 Vorlagenordner wählen</button>
      <button class="mi mi-clear">🧹 Ordner entfernen</button>
      <div class="mi mi-name noclick"></div>
      <hr style="border:none;border-top:1px solid rgba(0,0,0,.08);margin:.35rem .4rem;" />
      <button class="mi mi-reset">🔄 Aufgaben neu generieren</button>
    `;
    document.body.appendChild(menu);

    function updateMenuLabels(){
      const nameEl = menu.querySelector('.mi-name');
      nameEl.textContent = state.folderName ? `• ${state.folderName}` : 'Kein Ordner gespeichert';
    }

    function updateMeta(){
      elements.folder.textContent = state.folderName ? `📁 ${state.folderName}` : '📁 Keine Vorlagen';
      elements.status.textContent = state.tasks.length ? `${state.tasks.filter(t=>t.checked).length}/${state.tasks.length} erledigt` : '';
      elements.meld.textContent = state.meldung ? `Meldung: ${state.meldung}` : '';
      elements.part.textContent = state.part ? `Part: ${state.part}` : '';
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

    function closeMenu(){ menu.classList.remove('open'); }

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

    async function pickFolder(){
      closeMenu();
      if(!('showDirectoryPicker' in window)){
        showToast('Directory Picker wird nicht unterstützt.');
        return;
      }
      try{
        const handle = await window.showDirectoryPicker();
        if(handle){
          const ok = await ensureRPermission(handle);
          if(!ok){
            showToast('Keine Berechtigung für den Ordner.');
            return;
          }
          state.folderHandle = handle;
          state.folderName = handle.name || '';
          state.store.meta.templateFolderName = state.folderName;
          saveStore(state.store);
          try{ await idbSet(TEMPLATE_HANDLE_KEY, handle); }catch(err){ console.warn('Checklist: unable to persist handle', err); }
          updateMenuLabels();
          updateMeta();
          showToast('Vorlagenordner gespeichert.');
        }
      }catch(err){
        if(err?.name !== 'AbortError') console.warn('Checklist: Ordnerauswahl abgebrochen', err);
      }
    }

    async function clearFolder(){
      closeMenu();
      state.folderHandle = null;
      state.folderName = '';
      state.store.meta.templateFolderName = '';
      saveStore(state.store);
      try{ await idbDel(TEMPLATE_HANDLE_KEY); }catch{}
      updateMenuLabels();
      updateMeta();
      showToast('Vorlagenordner entfernt.');
    }

    function regenerate(){
      closeMenu();
      if(!state.meldung){
        showToast('Keine Meldung aktiv.');
        return;
      }
      state.tasks = buildInitialTasks();
      persistMeldState();
      renderTasks();
      showToast('Aufgaben neu generiert.');
    }

    menu.querySelector('.mi-pick').addEventListener('click', pickFolder);
    menu.querySelector('.mi-clear').addEventListener('click', clearFolder);
    menu.querySelector('.mi-reset').addEventListener('click', regenerate);
    updateMenuLabels();

    function showToast(message){
      if(!elements.toast) return;
      elements.toast.textContent = message;
      elements.toast.classList.add('show');
      if(state.toastTimer) clearTimeout(state.toastTimer);
      state.toastTimer = setTimeout(() => {
        elements.toast.classList.remove('show');
      }, 2600);
    }

    function buildInitialTasks(){
      if(!state.config) return [];
      let tasks = tasksFromConfig(state.config);
      tasks = ensurePartTasks(tasks, state.config, state.part);
      cleanRequirements(tasks);
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
      const ensured = ensurePartTasks(normalized, state.config, state.part);
      cleanRequirements(ensured);
      return ensured;
    }

    function loadTasks(){
      if(!state.meldung){
        state.tasks = [];
        renderTasks();
        return;
      }
      const entry = state.store.meldungen[state.meldung];
      if(entry && Array.isArray(entry.tasks)){
        state.tasks = hydrateTasks(entry.tasks);
        const partChanged = (entry.part || '') !== state.part;
        if(partChanged || tasksDiffer(entry.tasks, state.tasks)){
          persistMeldState();
        }
      }else{
        state.tasks = buildInitialTasks();
      }
      applyRequirementRules();
      renderTasks();
    }

    function persistMeldState(){
      if(!state.meldung) return;
      const payload = {
        meldung: state.meldung,
        part: state.part,
        tasks: state.tasks.map(task => ({
          id: task.id,
          text: task.text,
          checked: task.checked,
          requires: Array.isArray(task.requires) ? task.requires.slice() : [],
          kind: task.kind,
          meta: task.meta || {}
        })),
        updatedAt: new Date().toISOString()
      };
      state.store.meldungen[state.meldung] = payload;
      saveStore(state.store);
      updateMeta();
    }

    let saveTimer = null;
    function scheduleSave(){
      if(saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        persistMeldState();
      }, 200);
    }

    function applyRequirementRules(){
      const checkedMap = new Map(state.tasks.map(task => [task.id, task.checked]));
      let changed = false;
      state.tasks.forEach(task => {
        const blocked = computeBlocked(task, checkedMap);
        if(blocked && task.checked){
          task.checked = false;
          checkedMap.set(task.id, false);
          changed = true;
        }
      });
      if(changed) scheduleSave();
    }

    function addTaskAt(index){
      const text = (prompt('Text für den neuen Schritt:') || '').trim();
      if(!text) return;
      const task = normalizeTask({
        id: `custom:${Date.now().toString(36)}:${Math.random().toString(36).slice(2,6)}`,
        text,
        checked: false,
        requires: [],
        kind: 'custom'
      });
      if(index < 0 || index > state.tasks.length) index = state.tasks.length;
      state.tasks.splice(index, 0, task);
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
      scheduleSave();
      renderTasks();
    }

    function toggleTask(id, checked){
      const task = state.tasks.find(t => t.id === id);
      if(!task) return;
      const checkedMap = new Map(state.tasks.map(t => [t.id, t.checked]));
      const blocked = computeBlocked(task, checkedMap);
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

    function renderTasks(){
      elements.list.innerHTML = '';
      if(!state.meldung){
        elements.empty.hidden = false;
        updateMeta();
        return;
      }
      elements.empty.hidden = state.tasks.length > 0;
      const frag = document.createDocumentFragment();
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

        const requiresMet = !computeBlocked(task, new Map(state.tasks.map(t => [t.id, t.checked])));
        checkbox.disabled = !requiresMet && !task.checked;

        const text = document.createElement('span');
        text.className = 'cl-task-text';
        text.textContent = task.text;

        label.appendChild(checkbox);
        label.appendChild(text);
        row.appendChild(label);

        if(Array.isArray(task.requires) && task.requires.length){
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
      updateMeta();
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

    function ensureSortable(){
      if(!window.Sortable){
        return;
      }
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
      const order = Array.from(elements.list.querySelectorAll('.cl-row')).map(el => el.dataset.id);
      if(order.length !== state.tasks.length) return;
      const lookup = new Map(state.tasks.map(task => [task.id, task]));
      const next = [];
      for(const id of order){
        if(!lookup.has(id)) return;
        next.push(lookup.get(id));
      }
      if(next.length !== state.tasks.length) return;
      const changed = next.some((task, idx) => task !== state.tasks[idx]);
      if(!changed) return;
      state.tasks = next.slice();
      scheduleSave();
      renderTasks();
    }

    function refreshFromDoc(){
      state.meldung = activeMeldung();
      state.part = activePart();
      loadTasks();
    }

    async function init(){
      try{
        state.folderHandle = await idbGet(TEMPLATE_HANDLE_KEY);
        if(state.folderHandle){
          const ok = await ensureRPermission(state.folderHandle);
          if(!ok){
            state.folderHandle = null;
          }else{
            state.folderName = state.folderHandle.name || '';
          }
        }
      }catch(err){
        console.warn('Checklist: handle restore failed', err);
      }
      if(!state.folderName){
        state.folderName = state.store.meta.templateFolderName || '';
      }
      updateMenuLabels();
      updateMeta();

      state.config = await loadConfig();
      refreshFromDoc();
    }

    const storageHandler = event => {
      if(event.key === LS_DOC_KEY){
        refreshFromDoc();
      }
      if(event.key === STORAGE_KEY){
        state.store = loadStore();
        if(Object.prototype.hasOwnProperty.call(state.store.meta, 'templateFolderName')){
          state.folderName = state.store.meta.templateFolderName || '';
        }
        updateMenuLabels();
        updateMeta();
        loadTasks();
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
    observer.observe(document.body, {childList:true, subtree:true});
    state.cleanupFns.push(() => observer.disconnect());

    function cleanup(){
      state.cleanupFns.forEach(fn => { try{ fn(); }catch{} });
      state.cleanupFns.length = 0;
    }

    init().catch(err => console.error('Checklist init failed', err));
  };
})();
