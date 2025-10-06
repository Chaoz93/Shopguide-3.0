(function(){
  'use strict';

  const MODULE_KEY = 'DragDropSyncTest';
  const LOG_PREFIX = `[${MODULE_KEY}]`;
  const POLL_INTERVAL = 5000;
  const SYNC_DIR_NAME = 'SharedData';
  const SYNC_FILE_NAME = 'SyncModul.json';
  const STORAGE_PREFIX = `${MODULE_KEY}.`;
  const LS_LAYOUT_KEY = `${STORAGE_PREFIX}layout`;
  const LS_ROOT_HANDLE_KEY = `${STORAGE_PREFIX}rootHandle`;
  const LS_ROOT_HANDLE_NAME_KEY = `${STORAGE_PREFIX}rootHandleName`;
  const LS_UPDATE_HANDLE_KEY = `${STORAGE_PREFIX}updateHandle`;
  const LS_UPDATE_HANDLE_NAME_KEY = `${STORAGE_PREFIX}updateHandleName`;
  const clone = (value)=>{
    if(typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  const cssEscape = (value)=>{
    if(typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
    const str = String(value);
    const length = str.length;
    let result = '';
    for(let i=0;i<length;i+=1){
      const char = str.charAt(i);
      const code = str.charCodeAt(i);
      if(code === 0x0000){
        result += '\uFFFD';
        continue;
      }
      if(
        (code >= 0x0001 && code <= 0x001F) ||
        code === 0x007F ||
        (i === 0 && code >= 0x0030 && code <= 0x0039) ||
        (i === 1 && code >= 0x0030 && code <= 0x0039 && str.charCodeAt(0) === 0x002D)
      ){
        result += `\\${code.toString(16)} `;
        continue;
      }
      if(i === 0 && char === '-' && length === 1){
        result += '\\-';
        continue;
      }
      if(
        char === '-' ||
        char === '_' ||
        (code >= 0x0030 && code <= 0x0039) ||
        (code >= 0x0041 && code <= 0x005A) ||
        (code >= 0x0061 && code <= 0x007A)
      ){
        result += char;
        continue;
      }
      if(code >= 0x00A0){
        result += char;
        continue;
      }
      result += `\\${char}`;
    }
    return result;
  };

  function safeGetLocal(key){
    if(typeof localStorage === 'undefined') return null;
    try{
      return localStorage.getItem(key);
    }catch(err){
      console.warn(`${LOG_PREFIX} localStorage.getItem fehlgeschlagen`, err);
      return null;
    }
  }

  function safeSetLocal(key, value){
    if(typeof localStorage === 'undefined') return;
    try{
      localStorage.setItem(key, value);
    }catch(err){
      console.warn(`${LOG_PREFIX} localStorage.setItem fehlgeschlagen`, err);
    }
  }

  function safeRemoveLocal(key){
    if(typeof localStorage === 'undefined') return;
    try{
      localStorage.removeItem(key);
    }catch(err){
      console.warn(`${LOG_PREFIX} localStorage.removeItem fehlgeschlagen`, err);
    }
  }

  function parseLocalJson(raw){
    if(!raw) return null;
    try{
      return JSON.parse(raw);
    }catch(err){
      console.warn(`${LOG_PREFIX} Konnte localStorage JSON nicht parsen`, err);
      return null;
    }
  }

  function loadStoredLayout(){
    const parsed = parseLocalJson(safeGetLocal(LS_LAYOUT_KEY));
    if(parsed && typeof parsed === 'object' && parsed.modules){
      return parsed;
    }
    return null;
  }

  function saveLocalLayout(data){
    if(!data) return;
    try{
      safeSetLocal(LS_LAYOUT_KEY, JSON.stringify(data));
    }catch(err){
      console.warn(`${LOG_PREFIX} Layout konnte nicht im localStorage gespeichert werden`, err);
    }
  }

  function loadStoredHandleName(type){
    const key = type === 'root' ? LS_ROOT_HANDLE_NAME_KEY : LS_UPDATE_HANDLE_NAME_KEY;
    return safeGetLocal(key) || '';
  }

  function rememberHandle(type, handle){
    const key = type === 'root' ? LS_ROOT_HANDLE_KEY : LS_UPDATE_HANDLE_KEY;
    const nameKey = type === 'root' ? LS_ROOT_HANDLE_NAME_KEY : LS_UPDATE_HANDLE_NAME_KEY;
    if(handle){
      if(handle.name) safeSetLocal(nameKey, handle.name);
      if(typeof window !== 'undefined' && typeof window.serializeHandle === 'function'){
        try{
          safeSetLocal(key, window.serializeHandle(handle));
        }catch(err){
          console.warn(`${LOG_PREFIX} Handle konnte nicht serialisiert werden`, err);
          safeRemoveLocal(key);
        }
      }else{
        safeRemoveLocal(key);
      }
    }else{
      safeRemoveLocal(key);
      safeRemoveLocal(nameKey);
    }
  }

  function updateStatusText(state){
    if(!state?.statusEl) return;
    const rootName = state.rootHandle?.name || state.rootHandleName || '';
    const updateName = state.updateHandle?.name || state.updateHandleName || '';
    if(rootName && updateName){
      state.statusEl.textContent = `Root: ${rootName} · SharedData: ${updateName}`;
    }else if(updateName){
      state.statusEl.textContent = `SharedData: ${updateName}`;
    }else if(rootName){
      state.statusEl.textContent = `Root: ${rootName}`;
    }else{
      state.statusEl.textContent = 'Keine Ordner gewählt';
    }
  }

  const DEFAULT_SYNC_DATA = {
    lastUpdate: new Date().toISOString(),
    modules: {
      AspenColumnTodo: {
        title: 'Backlog',
        layout: {x: 0, y: 0, w: 4, h: 8},
        chips: [
          {id: 'chip-1', label: 'Offene Aufgabe', x: 0, y: 0},
          {id: 'chip-2', label: 'Anfrage prüfen', x: 0, y: 1}
        ]
      },
      AspenColumnProgress: {
        title: 'In Arbeit',
        layout: {x: 4, y: 0, w: 4, h: 8},
        chips: [
          {id: 'chip-3', label: 'Ticket 42', x: 0, y: 0}
        ]
      },
      AspenColumnDone: {
        title: 'Erledigt',
        layout: {x: 8, y: 0, w: 4, h: 8},
        chips: [
          {id: 'chip-4', label: 'Review abgeschlossen', x: 0, y: 0}
        ]
      }
    }
  };

  function log(action, ...details){
    console.log(`${LOG_PREFIX} ${action}`, ...details);
  }

  function toNumberOr(value, fallback){
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function createState(root){
    const storedLayout = loadStoredLayout();
    return {
      root,
      grid: null,
      rootHandle: null,
      updateHandle: null,
      sharedHandle: null,
      pollTimer: null,
      jsonPreviewEl: null,
      lastUpdateEl: null,
      statusEl: null,
      buttons: {},
      moduleItems: new Map(),
      syncData: storedLayout ? storedLayout : clone(DEFAULT_SYNC_DATA),
      changeHandler: null,
      contextMenu: null,
      contextMenuContext: null,
      contextMenuOutsideHandler: null,
      rootHandleName: loadStoredHandleName('root'),
      updateHandleName: loadStoredHandleName('update')
    };
  }

  function ensureStyles(){
    if(document.getElementById('drag-drop-sync-test-styles')) return;
    const style = document.createElement('style');
    style.id = 'drag-drop-sync-test-styles';
    style.textContent = `
      .sync-test-root{height:100%;}
      .sync-test-grid .grid-stack-item{min-height:10rem;}
      .sync-test-card{background:rgba(15,23,42,0.72);border-radius:1rem;color:#f8fafc;display:flex;flex-direction:column;gap:1rem;padding:1rem;box-shadow:0 12px 30px rgba(15,23,42,0.24);height:100%;}
      .sync-test-chip-area{display:flex;flex-direction:column;gap:0.5rem;align-items:stretch;}
      .sync-test-chip{background:rgba(148,163,184,0.32);border-radius:9999px;color:#e2e8f0;padding:0.35rem 0.75rem;font-size:0.85rem;font-weight:600;text-align:center;cursor:grab;user-select:none;transition:transform 0.12s ease,box-shadow 0.12s ease;}
      .sync-test-chip:active{cursor:grabbing;}
      .sync-test-chip.dragging{opacity:0.65;transform:scale(1.05);box-shadow:0 12px 20px rgba(15,23,42,0.35);}
      .sync-test-chip-target{border:2px dashed rgba(148,163,184,0.5);border-radius:0.75rem;min-height:3.5rem;display:flex;align-items:center;justify-content:center;color:#cbd5f5;font-size:0.8rem;}
      .sync-test-json{background:rgba(15,23,42,0.85);border-radius:1rem;padding:1rem;height:100%;overflow:auto;}
      .sync-test-btn{border-radius:9999px;padding:0.5rem 1.25rem;font-weight:600;transition:transform 0.12s ease,box-shadow 0.12s ease;}
      .sync-test-btn:hover{transform:translateY(-1px);box-shadow:0 10px 26px rgba(15,23,42,0.2);}
      .sync-test-status{font-size:0.75rem;color:#94a3b8;}
      .sync-test-context-menu{position:fixed;z-index:1000;min-width:180px;background:rgba(15,23,42,0.95);color:#e2e8f0;border:1px solid rgba(148,163,184,0.4);border-radius:0.75rem;padding:0.4rem;display:none;flex-direction:column;box-shadow:0 18px 40px rgba(15,23,42,0.45);backdrop-filter:blur(12px);}
      .sync-test-context-menu.open{display:flex;}
      .sync-test-context-btn{background:none;border:none;color:inherit;text-align:left;padding:0.5rem 0.65rem;border-radius:0.6rem;font:inherit;cursor:pointer;display:flex;align-items:center;gap:0.5rem;transition:background 0.12s ease;}
      .sync-test-context-btn:hover{background:rgba(59,130,246,0.25);}
    `;
    document.head.appendChild(style);
  }

  function cleanupState(state){
    if(!state) return;
    if(state.pollTimer){
      clearInterval(state.pollTimer);
      state.pollTimer = null;
      log('Polling gestoppt');
    }
    if(state.grid && state.changeHandler){
      state.grid.off('change', state.changeHandler);
      state.grid.off('dragstop', state.changeHandler);
      state.grid.off('resizestop', state.changeHandler);
    }
    if(state.grid){
      try{ state.grid.destroy(false); }
      catch(err){ log('Grid konnte nicht zerstört werden', err); }
      state.grid = null;
    }
    if(state.contextMenuOutsideHandler){
      window.removeEventListener('click', state.contextMenuOutsideHandler);
      window.removeEventListener('contextmenu', state.contextMenuOutsideHandler);
      state.contextMenuOutsideHandler = null;
    }
    if(state.contextMenu?.menu && state.contextMenu.menu.parentNode){
      state.contextMenu.menu.parentNode.removeChild(state.contextMenu.menu);
    }
    state.contextMenu = null;
    state.contextMenuContext = null;
    state.moduleItems.clear();
    state.root.innerHTML = '';
    if(window.DragDropSyncTestState === state){
      window.DragDropSyncTestState = null;
    }
  }

  function createLayout(state){
    ensureStyles();

    const container = document.createElement('div');
    container.className = 'sync-test-root flex flex-col h-full';

    const header = document.createElement('div');
    header.className = 'flex flex-wrap gap-3 items-center mb-4';

    const rootBtn = document.createElement('button');
    rootBtn.type = 'button';
    rootBtn.className = 'sync-test-btn bg-slate-800 text-slate-100';
    rootBtn.textContent = 'Root-Ordner wählen';
    header.appendChild(rootBtn);

    const sharedBtn = document.createElement('button');
    sharedBtn.type = 'button';
    sharedBtn.className = 'sync-test-btn bg-slate-800 text-slate-100';
    sharedBtn.textContent = 'SharedData-Ordner wählen';
    header.appendChild(sharedBtn);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'sync-test-btn bg-sky-600 text-white';
    saveBtn.textContent = 'Sync speichern';
    header.appendChild(saveBtn);

    const status = document.createElement('div');
    status.className = 'sync-test-status';
    status.textContent = 'Keine Ordner gewählt';
    header.appendChild(status);

    container.appendChild(header);

    const content = document.createElement('div');
    content.className = 'flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-4 min-h-0';

    const boardWrapper = document.createElement('div');
    boardWrapper.className = 'sync-test-grid bg-slate-900/60 rounded-2xl p-4 flex flex-col min-h-0';

    const gridEl = document.createElement('div');
    gridEl.className = 'grid-stack flex-1 min-h-[24rem]';
    boardWrapper.appendChild(gridEl);

    content.appendChild(boardWrapper);

    const jsonWrapper = document.createElement('div');
    jsonWrapper.className = 'flex flex-col gap-2';

    const jsonHeader = document.createElement('div');
    jsonHeader.className = 'text-slate-200 font-semibold text-sm uppercase tracking-wide';
    jsonHeader.textContent = 'SyncModul.json Vorschau';

    const lastUpdate = document.createElement('div');
    lastUpdate.className = 'sync-test-status';
    lastUpdate.textContent = 'Letztes Update: –';

    const jsonPre = document.createElement('pre');
    jsonPre.className = 'sync-test-json text-xs text-slate-200';

    jsonWrapper.appendChild(jsonHeader);
    jsonWrapper.appendChild(lastUpdate);
    jsonWrapper.appendChild(jsonPre);

    content.appendChild(jsonWrapper);

    container.appendChild(content);

    state.root.appendChild(container);

    state.buttons = {rootBtn, sharedBtn, saveBtn};
    state.jsonPreviewEl = jsonPre;
    state.lastUpdateEl = lastUpdate;
    state.statusEl = status;
    updateStatusText(state);

    return gridEl;
  }

  function initGrid(state, gridEl){
    if(typeof window.GridStack === 'undefined'){
      throw new Error('GridStack.js ist nicht geladen');
    }
    const grid = GridStack.init({
      float: true,
      animate: true,
      disableOneColumnMode: true,
      margin: 8,
      cellHeight: 90
    }, gridEl);
    state.grid = grid;
    return grid;
  }

  function ensureModule(state, moduleKey, moduleData){
    const item = document.createElement('div');
    item.className = 'grid-stack-item';
    item.dataset.gsX = moduleData.layout?.x ?? 0;
    item.dataset.gsY = moduleData.layout?.y ?? 0;
    item.dataset.gsW = moduleData.layout?.w ?? 4;
    item.dataset.gsH = moduleData.layout?.h ?? 3;

    const content = document.createElement('div');
    content.className = 'grid-stack-item-content sync-test-card';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between gap-3';

    const title = document.createElement('h3');
    title.className = 'text-lg font-semibold tracking-wide';
    title.textContent = moduleData.title || moduleKey;
    header.appendChild(title);

    const chipCounter = document.createElement('span');
    chipCounter.className = 'text-xs text-slate-300 uppercase tracking-[0.2em]';
    chipCounter.textContent = `${moduleData.chips?.length ?? 0} Chips`;
    header.appendChild(chipCounter);

    content.appendChild(header);

    const chipArea = document.createElement('div');
    chipArea.className = 'sync-test-chip-area';
    chipArea.dataset.module = moduleKey;
    chipArea.dataset.dropzone = 'true';

    content.appendChild(chipArea);
    item.appendChild(content);

    state.grid?.addWidget(item);
    content.addEventListener('contextmenu', event=>{
      const chipTarget = event.target.closest('.sync-test-chip');
      if(chipTarget) return;
      openContextMenu(state, event, {type: 'module', moduleKey});
    });

    state.moduleItems.set(moduleKey, {item, chipArea, chipCounter, titleEl: title, title: moduleData.title || moduleKey});

    (moduleData.chips || []).forEach(chip=>addChip(state, moduleKey, chip));
  }

  function addChip(state, moduleKey, chip){
    const moduleEntry = state.moduleItems.get(moduleKey);
    if(!moduleEntry) return;
    const chipEl = document.createElement('div');
    chipEl.className = 'sync-test-chip';
    chipEl.textContent = chip.label || chip.id;
    chipEl.draggable = true;
    chipEl.dataset.chipId = chip.id;
    chipEl.dataset.chipLabel = chip.label || '';

    attachChipDragHandlers(state, chipEl, moduleEntry.chipArea);
    chipEl.addEventListener('contextmenu', event=>{
      openContextMenu(state, event, {type: 'chip', moduleKey, chipEl});
    });

    moduleEntry.chipArea.appendChild(chipEl);
    updateChipCounter(moduleEntry);
  }

  function updateChipCounter(moduleEntry){
    if(!moduleEntry) return;
    const count = moduleEntry.chipArea.querySelectorAll('[data-chip-id]').length;
    moduleEntry.chipCounter.textContent = `${count} Chips`;
  }

  function hideContextMenu(state){
    const menuData = state.contextMenu;
    if(!menuData) return;
    menuData.menu.classList.remove('open');
    state.contextMenuContext = null;
  }

  function ensureContextMenu(state){
    if(state.contextMenu) return state.contextMenu;
    const menu = document.createElement('div');
    menu.className = 'sync-test-context-menu';

    const renameModuleBtn = document.createElement('button');
    renameModuleBtn.type = 'button';
    renameModuleBtn.className = 'sync-test-context-btn';
    renameModuleBtn.textContent = 'Spalte umbenennen';

    const renameChipBtn = document.createElement('button');
    renameChipBtn.type = 'button';
    renameChipBtn.className = 'sync-test-context-btn';
    renameChipBtn.textContent = 'Kachel umbenennen';

    menu.appendChild(renameModuleBtn);
    menu.appendChild(renameChipBtn);
    state.root.appendChild(menu);

    renameModuleBtn.addEventListener('click', ()=>{
      const context = state.contextMenuContext;
      hideContextMenu(state);
      if(context?.type === 'module'){
        renameModule(state, context.moduleKey);
      }
    });

    renameChipBtn.addEventListener('click', ()=>{
      const context = state.contextMenuContext;
      hideContextMenu(state);
      if(context?.type === 'chip'){
        renameChip(state, context.chipEl, context.moduleKey);
      }
    });

    const outsideHandler = event=>{
      if(!menu.contains(event.target)) hideContextMenu(state);
    };
    window.addEventListener('click', outsideHandler);
    window.addEventListener('contextmenu', outsideHandler);
    state.contextMenuOutsideHandler = outsideHandler;

    state.contextMenu = {menu, renameModuleBtn, renameChipBtn};
    return state.contextMenu;
  }

  function openContextMenu(state, event, context){
    event.preventDefault();
    event.stopPropagation();
    const menuData = ensureContextMenu(state);
    state.contextMenuContext = context;
    menuData.renameModuleBtn.style.display = context.type === 'module' ? 'flex' : 'none';
    menuData.renameChipBtn.style.display = context.type === 'chip' ? 'flex' : 'none';
    const pad = 8;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const rect = menuData.menu.getBoundingClientRect();
    const w = rect.width || 200;
    const h = rect.height || 100;
    const x = Math.min(Math.max(event.clientX, pad), vw - w - pad);
    const y = Math.min(Math.max(event.clientY, pad), vh - h - pad);
    menuData.menu.style.left = `${x}px`;
    menuData.menu.style.top = `${y}px`;
    menuData.menu.classList.add('open');
  }

  function renameModule(state, moduleKey){
    const moduleEntry = state.moduleItems.get(moduleKey);
    if(!moduleEntry) return;
    const current = moduleEntry.titleEl?.textContent?.trim() || moduleKey;
    const next = prompt('Neuer Spaltenname', current);
    if(next === null) return;
    const trimmed = next.trim();
    if(!trimmed) return;
    moduleEntry.title = trimmed;
    if(moduleEntry.titleEl) moduleEntry.titleEl.textContent = trimmed;
    refreshFromUi(state);
  }

  function renameChip(state, chipEl, moduleKey){
    if(!chipEl) return;
    const current = chipEl.dataset.chipLabel || chipEl.textContent?.trim() || chipEl.dataset.chipId || '';
    const next = prompt('Neuer Kacheltitel', current);
    if(next === null) return;
    const trimmed = next.trim();
    chipEl.dataset.chipLabel = trimmed;
    chipEl.textContent = trimmed || chipEl.dataset.chipId || 'Chip';
    refreshFromUi(state);
    updateChipCounter(state.moduleItems.get(moduleKey));
  }

  function attachChipDragHandlers(state, chipEl, container){
    chipEl.addEventListener('dragstart', event=>{
      chipEl.classList.add('dragging');
      if(event.dataTransfer){
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', chipEl.dataset.chipId || '');
      }
      container.dataset.draggingFrom = container.dataset.module;
      chipEl.dataset.dragOrigin = container.dataset.module || '';
    });

    chipEl.addEventListener('dragend', ()=>{
      chipEl.classList.remove('dragging');
      delete container.dataset.draggingFrom;
      delete chipEl.dataset.dragOrigin;
    });
  }

  function attachDropZoneHandlers(state, zone){
    if(zone.dataset.dropBound === 'true') return;
    zone.dataset.dropBound = 'true';
    zone.addEventListener('dragover', event=>{
      event.preventDefault();
      event.dataTransfer && (event.dataTransfer.dropEffect = 'move');
    });

    zone.addEventListener('drop', event=>{
      event.preventDefault();
      const chipId = event.dataTransfer?.getData('text/plain');
      if(!chipId) return;
      const chipEl = state.root.querySelector(`[data-chip-id="${cssEscape(chipId)}"]`);
      if(!chipEl) return;
      const target = event.target.closest('[data-chip-id]');
      if(target && target !== chipEl){
        target.parentElement?.insertBefore(chipEl, target);
      }else{
        zone.appendChild(chipEl);
      }
      const originKey = chipEl.dataset.dragOrigin;
      if(originKey && originKey !== zone.dataset.module){
        updateChipCounter(state.moduleItems.get(originKey));
      }
      delete chipEl.dataset.dragOrigin;
      updateChipCounter(state.moduleItems.get(zone.dataset.module));
      refreshFromUi(state);
    });
  }

  function refreshFromUi(state){
    const layout = captureLayout(state);
    applyLayout(state, layout, {skipGridUpdate:true});
    updatePreview(state);
    syncLayoutWithSharedData(state, layout);
  }

  function syncLayoutWithSharedData(state, layout){
    if(!layout) return;
    saveSyncFile(state, layout, {silent:true}).catch(err=>console.error(LOG_PREFIX, 'Automatisches Sync fehlgeschlagen', err));
  }

  function captureLayout(state){
    const modules = {};
    for(const [moduleKey, moduleEntry] of state.moduleItems.entries()){
      const node = moduleEntry.item.gridstackNode || {};
      const chips = Array.from(moduleEntry.chipArea.querySelectorAll('[data-chip-id]')).map((chipEl, index)=>{
        const id = chipEl.dataset.chipId || `chip-${index}`;
        const label = chipEl.dataset.chipLabel || chipEl.textContent?.trim() || id;
        const x = 0;
        const y = index;
        return {id, label, x, y};
      });
      const title = moduleEntry.titleEl?.textContent?.trim() || moduleEntry.title || moduleKey;
      moduleEntry.title = title;
      modules[moduleKey] = {
        title,
        layout: {
          x: node.x ?? toNumberOr(moduleEntry.item.dataset.gsX, 0),
          y: node.y ?? toNumberOr(moduleEntry.item.dataset.gsY, 0),
          w: node.w ?? toNumberOr(moduleEntry.item.dataset.gsW, 4),
          h: node.h ?? toNumberOr(moduleEntry.item.dataset.gsH, 3)
        },
        chips
      };
    }
    const payload = {
      lastUpdate: new Date().toISOString(),
      modules
    };
    log('Layout aufgenommen', payload);
    state.syncData = payload;
    saveLocalLayout(payload);
    return payload;
  }

  async function selectRootFolder(state){
    if(typeof window.showDirectoryPicker !== 'function'){
      log('File System Access API nicht verfügbar (Root)');
      alert('File System Access API wird nicht unterstützt.');
      return null;
    }
    try{
      const handle = await window.showDirectoryPicker({mode: 'readwrite'});
      state.rootHandle = handle;
      state.updateHandle = null;
      state.sharedHandle = null;
      state.rootHandleName = handle.name || '';
      state.updateHandleName = '';
      rememberHandle('root', handle);
      rememberHandle('update', null);
      updateStatusText(state);
      log('Root-Ordner gewählt', handle.name);
      return handle;
    }catch(err){
      if(err?.name !== 'AbortError') console.error(LOG_PREFIX, 'Root-Ordner konnte nicht gewählt werden', err);
      return null;
    }
  }

  async function selectUpdateFolder(state){
    if(typeof window.showDirectoryPicker !== 'function'){
      log('File System Access API nicht verfügbar (SharedData)');
      alert('File System Access API wird nicht unterstützt.');
      return null;
    }
    try{
      const handle = await window.showDirectoryPicker({mode: 'readwrite'});
      state.updateHandle = handle;
      state.sharedHandle = null;
      state.updateHandleName = handle.name || '';
      rememberHandle('update', handle);
      updateStatusText(state);
      log('SharedData-Ordner gewählt', handle.name);
      return handle;
    }catch(err){
      if(err?.name !== 'AbortError') console.error(LOG_PREFIX, 'SharedData-Ordner konnte nicht gewählt werden', err);
      return null;
    }
  }

  async function resolveSharedHandle(state, {create} = {create:false}){
    if(state.sharedHandle) return state.sharedHandle;
    const base = state.updateHandle || state.rootHandle;
    if(!base){
      log('Kein Basis-Ordner vorhanden');
      return null;
    }
    try{
      if(base.name === SYNC_DIR_NAME){
        state.sharedHandle = base;
        return base;
      }
      if(typeof base.getDirectoryHandle !== 'function'){
        log('DirectoryHandle unterstützt getDirectoryHandle nicht');
        return null;
      }
      const handle = await base.getDirectoryHandle(SYNC_DIR_NAME, {create});
      state.sharedHandle = handle;
      log('SharedData-Handle geladen', handle.name);
      return handle;
    }catch(err){
      console.error(LOG_PREFIX, 'SharedData-Handle fehlgeschlagen', err);
      return null;
    }
  }

  async function loadSyncFile(state){
    const sharedHandle = await resolveSharedHandle(state, {create:false});
    if(!sharedHandle){
      log('SharedData-Ordner nicht verfügbar');
      const fallback = loadStoredLayout() || state.syncData || clone(DEFAULT_SYNC_DATA);
      if(fallback){
        state.syncData = fallback;
        applyLayout(state, fallback);
        updatePreview(state);
      }
      return fallback;
    }
    try{
      const fileHandle = await sharedHandle.getFileHandle(SYNC_FILE_NAME, {create:false});
      const file = await fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      log('SyncModul.json geladen');
      state.syncData = data;
      applyLayout(state, data);
      updatePreview(state);
      return data;
    }catch(err){
      if(err?.name === 'NotFoundError'){
        log('SyncModul.json nicht gefunden, Standard wird erstellt');
        const defaults = clone(DEFAULT_SYNC_DATA);
        await saveSyncFile(state, defaults);
        applyLayout(state, defaults);
        return defaults;
      }
      console.error(LOG_PREFIX, 'SyncModul.json konnte nicht geladen werden', err);
      return clone(DEFAULT_SYNC_DATA);
    }
  }

  async function saveSyncFile(state, data, options = {}){
    const {silent = false} = options;
    const sharedHandle = await resolveSharedHandle(state, {create:true});
    if(!sharedHandle){
      if(!silent) alert('Kein SharedData-Ordner gewählt.');
      else log('Automatisches Sync übersprungen (kein SharedData-Ordner).');
      return null;
    }
    const payload = data || captureLayout(state);
    payload.lastUpdate = new Date().toISOString();
    saveLocalLayout(payload);
    try{
      const fileHandle = await sharedHandle.getFileHandle(SYNC_FILE_NAME, {create:true});
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();
      state.syncData = payload;
      updatePreview(state);
      log('SyncModul.json gespeichert');
      return payload;
    }catch(err){
      console.error(LOG_PREFIX, 'SyncModul.json konnte nicht gespeichert werden', err);
      if(!silent) alert('Speichern fehlgeschlagen. Details in der Konsole.');
      return null;
    }
  }

  function applyLayout(state, data, {skipGridUpdate} = {skipGridUpdate:false}){
    if(!data) return;
    state.syncData = data;
    const modules = data.modules || {};
    for(const [moduleKey, moduleEntry] of state.moduleItems.entries()){
      const target = modules[moduleKey] || DEFAULT_SYNC_DATA.modules[moduleKey];
      if(!target) continue;
      const title = target.title || moduleEntry.title || moduleKey;
      moduleEntry.title = title;
      if(moduleEntry.titleEl) moduleEntry.titleEl.textContent = title;
      if(!skipGridUpdate){
        state.grid?.update(moduleEntry.item, target.layout?.x ?? 0, target.layout?.y ?? 0, target.layout?.w ?? 4, target.layout?.h ?? 3);
      }
      moduleEntry.chipArea.innerHTML = '';
      (target.chips || []).sort((a,b)=>{
        const ay = a.y ?? 0; const by = b.y ?? 0;
        if(ay === by) return (a.x ?? 0) - (b.x ?? 0);
        return ay - by;
      }).forEach(chip=>{
        addChip(state, moduleKey, chip);
      });
      attachDropZoneHandlers(state, moduleEntry.chipArea);
      updateChipCounter(moduleEntry);
    }
    saveLocalLayout(state.syncData);
    updatePreview(state);
    log('Layout angewendet');
  }

  function updatePreview(state){
    if(!state.jsonPreviewEl) return;
    const payload = state.syncData || DEFAULT_SYNC_DATA;
    state.jsonPreviewEl.textContent = JSON.stringify(payload, null, 2);
    state.lastUpdateEl.textContent = `Letztes Update: ${payload.lastUpdate || '–'}`;
  }

  function startPolling(state){
    if(state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(()=>{
      loadSyncFile(state).catch(err=>console.error(LOG_PREFIX, 'Polling Fehler', err));
    }, POLL_INTERVAL);
    log('Polling gestartet');
  }

  function wireEvents(state){
    state.buttons.rootBtn.addEventListener('click', ()=>selectRootFolder(state));
    state.buttons.sharedBtn.addEventListener('click', async()=>{
      await selectUpdateFolder(state);
      await loadSyncFile(state);
      startPolling(state);
    });
    state.buttons.saveBtn.addEventListener('click', ()=>saveSyncFile(state));

    state.changeHandler = ()=>refreshFromUi(state);
    state.grid?.on('change', state.changeHandler);
    state.grid?.on('dragstop', state.changeHandler);
    state.grid?.on('resizestop', state.changeHandler);
  }

  async function restoreHandles(state){
    updateStatusText(state);
    const canDeserialize = typeof window !== 'undefined' && typeof window.deserializeHandle === 'function';
    if(canDeserialize){
      const rootRaw = safeGetLocal(LS_ROOT_HANDLE_KEY);
      if(rootRaw){
        try{
          state.rootHandle = await window.deserializeHandle(rootRaw);
          state.rootHandleName = state.rootHandle?.name || state.rootHandleName;
        }catch(err){
          console.warn(`${LOG_PREFIX} Root-Handle konnte nicht wiederhergestellt werden`, err);
          safeRemoveLocal(LS_ROOT_HANDLE_KEY);
        }
      }
      const updateRaw = safeGetLocal(LS_UPDATE_HANDLE_KEY);
      if(updateRaw){
        try{
          state.updateHandle = await window.deserializeHandle(updateRaw);
          state.updateHandleName = state.updateHandle?.name || state.updateHandleName;
        }catch(err){
          console.warn(`${LOG_PREFIX} SharedData-Handle konnte nicht wiederhergestellt werden`, err);
          safeRemoveLocal(LS_UPDATE_HANDLE_KEY);
        }
      }
    }
    updateStatusText(state);
    if(state.updateHandle || state.rootHandle){
      try{
        await loadSyncFile(state);
        startPolling(state);
      }catch(err){
        console.error(LOG_PREFIX, 'Automatisches Laden der Sync-Daten fehlgeschlagen', err);
      }
    }
  }

  window.renderDragDropSyncTest = function renderDragDropSyncTest(root){
    if(!root) throw new Error('Root-Element fehlt');
    cleanupState(root.__dragDropSyncState);
    const state = createState(root);
    root.__dragDropSyncState = state;
    window.DragDropSyncTestState = state;
    try{ root.dataset.module = MODULE_KEY; }catch{/* ignore */}

    const gridEl = createLayout(state);
    initGrid(state, gridEl);

    const modules = state.syncData.modules || DEFAULT_SYNC_DATA.modules;
    for(const moduleKey of Object.keys(modules)){
      ensureModule(state, moduleKey, modules[moduleKey]);
    }
    for(const moduleEntry of state.moduleItems.values()){
      attachDropZoneHandlers(state, moduleEntry.chipArea);
    }
    applyLayout(state, state.syncData);
    wireEvents(state);
    restoreHandles(state).catch(err=>console.error(LOG_PREFIX, 'Persistierte Handles konnten nicht geladen werden', err));
  };

  window.DragDropSyncTest = {
    selectRootFolder: ()=>window.DragDropSyncTestState ? selectRootFolder(window.DragDropSyncTestState) : null,
    selectUpdateFolder: ()=>window.DragDropSyncTestState ? selectUpdateFolder(window.DragDropSyncTestState) : null,
    loadSyncFile: ()=>window.DragDropSyncTestState ? loadSyncFile(window.DragDropSyncTestState) : null,
    saveSyncFile: ()=>window.DragDropSyncTestState ? saveSyncFile(window.DragDropSyncTestState) : null,
    captureLayout: ()=>window.DragDropSyncTestState ? captureLayout(window.DragDropSyncTestState) : null,
    applyLayout: data=>window.DragDropSyncTestState ? applyLayout(window.DragDropSyncTestState, data) : null,
    startPolling: ()=>window.DragDropSyncTestState ? startPolling(window.DragDropSyncTestState) : null
  };
})();
