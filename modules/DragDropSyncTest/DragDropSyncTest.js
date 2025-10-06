(function(){
  'use strict';

  const MODULE_KEY = 'DragDropSyncTest';
  const LOG_PREFIX = `[${MODULE_KEY}]`;
  const POLL_INTERVAL = 5000;
  const SYNC_DIR_NAME = 'SharedData';
  const SYNC_FILE_NAME = 'SyncModul.json';
  const CHIP_COLUMNS = 4;

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

  const DEFAULT_SYNC_DATA = {
    lastUpdate: new Date().toISOString(),
    modules: {
      WorkorderEditable: {
        layout: {x: 0, y: 0, w: 4, h: 3},
        chips: [
          {id: 'chip-1', label: 'Task A', x: 0, y: 0},
          {id: 'chip-2', label: 'Task B', x: 1, y: 0}
        ]
      },
      NewStandardFindings: {
        layout: {x: 5, y: 0, w: 4, h: 3},
        chips: [
          {id: 'chip-10', label: 'APE5100', x: 0, y: 0}
        ]
      }
    }
  };

  function log(action, ...details){
    console.log(`${LOG_PREFIX} ${action}`, ...details);
  }

  function createState(root){
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
      syncData: clone(DEFAULT_SYNC_DATA),
      changeHandler: null
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
      .sync-test-chip-area{display:grid;grid-template-columns:repeat(${CHIP_COLUMNS},minmax(0,1fr));gap:0.5rem;}
      .sync-test-chip{background:rgba(148,163,184,0.32);border-radius:9999px;color:#e2e8f0;padding:0.35rem 0.75rem;font-size:0.85rem;font-weight:600;text-align:center;cursor:grab;user-select:none;transition:transform 0.12s ease,box-shadow 0.12s ease;}
      .sync-test-chip:active{cursor:grabbing;}
      .sync-test-chip.dragging{opacity:0.65;transform:scale(1.05);box-shadow:0 12px 20px rgba(15,23,42,0.35);}
      .sync-test-chip-target{border:2px dashed rgba(148,163,184,0.5);border-radius:0.75rem;min-height:3.5rem;display:flex;align-items:center;justify-content:center;color:#cbd5f5;font-size:0.8rem;}
      .sync-test-json{background:rgba(15,23,42,0.85);border-radius:1rem;padding:1rem;height:100%;overflow:auto;}
      .sync-test-btn{border-radius:9999px;padding:0.5rem 1.25rem;font-weight:600;transition:transform 0.12s ease,box-shadow 0.12s ease;}
      .sync-test-btn:hover{transform:translateY(-1px);box-shadow:0 10px 26px rgba(15,23,42,0.2);}
      .sync-test-status{font-size:0.75rem;color:#94a3b8;}
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
    title.textContent = moduleKey;
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
    state.moduleItems.set(moduleKey, {item, chipArea, chipCounter});

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

    moduleEntry.chipArea.appendChild(chipEl);
    updateChipCounter(moduleEntry);
  }

  function updateChipCounter(moduleEntry){
    if(!moduleEntry) return;
    const count = moduleEntry.chipArea.querySelectorAll('[data-chip-id]').length;
    moduleEntry.chipCounter.textContent = `${count} Chips`;
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
  }

  function captureLayout(state){
    const modules = {};
    for(const [moduleKey, moduleEntry] of state.moduleItems.entries()){
      const node = moduleEntry.item.gridstackNode || {};
      const chips = Array.from(moduleEntry.chipArea.querySelectorAll('[data-chip-id]')).map((chipEl, index)=>{
        const id = chipEl.dataset.chipId || `chip-${index}`;
        const label = chipEl.dataset.chipLabel || chipEl.textContent?.trim() || id;
        const x = index % CHIP_COLUMNS;
        const y = Math.floor(index / CHIP_COLUMNS);
        return {id, label, x, y};
      });
      modules[moduleKey] = {
        layout: {
          x: node.x ?? Number(moduleEntry.item.dataset.gsX) || 0,
          y: node.y ?? Number(moduleEntry.item.dataset.gsY) || 0,
          w: node.w ?? Number(moduleEntry.item.dataset.gsW) || 4,
          h: node.h ?? Number(moduleEntry.item.dataset.gsH) || 3
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
      state.statusEl.textContent = `Root: ${handle.name}`;
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
      state.statusEl.textContent = `SharedData: ${handle.name}`;
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
      return clone(DEFAULT_SYNC_DATA);
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

  async function saveSyncFile(state, data){
    const sharedHandle = await resolveSharedHandle(state, {create:true});
    if(!sharedHandle){
      alert('Kein SharedData-Ordner gewählt.');
      return null;
    }
    const payload = data || captureLayout(state);
    payload.lastUpdate = new Date().toISOString();
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
      alert('Speichern fehlgeschlagen. Details in der Konsole.');
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
