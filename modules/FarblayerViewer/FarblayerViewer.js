(function(){
  const STYLE_ID = 'farblayer-viewer-styles';
  const CONFIG_PATH = 'configs/FarblayerConfig.json';
  const CONFIG_FILENAME = CONFIG_PATH.split('/').pop() || 'FarblayerConfig.json';
  const STORAGE_KEY = CONFIG_PATH;
  const ROOT_SEARCH_MAX_DEPTH = 8;
  const IDB_NAME = 'modulesApp';
  const IDB_STORE = 'fs-handles';
  const HANDLE_STORAGE_KEY = 'farblayerViewer:configHandle';
  const POLL_INTERVAL_MS = 60000;
  const COLOR_SELECTION_KEY = 'farblayerViewer:colorSelection';
  const COLOR_CATEGORIES = [
    { key: 'background', label: 'Hintergrund' },
    { key: 'header', label: 'Header' },
    { key: 'buttons', label: 'Buttons' }
  ];
  const DEFAULT_DEBUG_DATA = {
    'Debug-Standardwerte': {
      'Hauptmodul (Debug)': {
        background: 'hsla(165, 86%, 57%, 1)',
        text: 'hsla(0, 0%, 100%, 1)',
        border: 'hsla(206, 86%, 19%, 1)'
      },
      'Überschrift Unter-Layer (Debug)': {
        background: 'hsla(0, 31%, 74%, 1)',
        text: 'hsla(0, 100%, 99%, 1)',
        border: 'hsla(207, 85%, 100%, 1)'
      },
      'Unter-Layer 3 (Debug)': {
        background: 'hsla(196, 82%, 48%, 1)',
        text: 'hsla(0, 0%, 100%, 1)',
        border: 'hsla(216, 57%, 24%, 1)'
      },
      'Hinweis-Layer (Debug)': {
        background: 'hsla(24, 95%, 58%, 1)',
        text: 'hsla(214, 84%, 15%, 1)',
        border: 'hsla(24, 95%, 38%, 1)'
      }
    }
  };

  function ensureStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const css = `
    .flv-root{height:100%;width:100%;box-sizing:border-box;}
    .flv-surface{height:100%;display:flex;flex-direction:column;gap:1rem;padding:1rem;box-sizing:border-box;color:var(--text-color,#f8fafc);background:var(--module-bg,rgba(15,23,42,.6));border-radius:1.1rem;border:1px solid var(--module-border,rgba(255,255,255,.08));box-shadow:inset 0 1px 0 rgba(255,255,255,.04);}
    .flv-header{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:1rem;padding:.85rem;border-radius:.9rem;background:var(--module-header-bg,rgba(15,23,42,.35));border:1px solid var(--module-header-border,rgba(255,255,255,.08));color:var(--module-header-text,inherit);backdrop-filter:blur(6px);}
    .flv-header-info{display:flex;flex-direction:column;gap:.35rem;min-width:200px;}
    .flv-title{font-size:1.2rem;font-weight:700;letter-spacing:.015em;}
    .flv-meta{font-size:.85rem;opacity:.85;}
    .flv-file{display:flex;flex-direction:column;gap:.35rem;min-width:240px;}
    .flv-file-label{font-size:.95rem;font-weight:600;}
    .flv-file-note{font-size:.8rem;opacity:.8;min-height:1rem;}
    .flv-file-controls{display:flex;gap:.5rem;flex-wrap:wrap;}
    .flv-file-btn,.flv-refresh,.flv-group-btn{border:1px solid var(--module-button-border,rgba(255,255,255,.16));border-radius:.65rem;padding:.45rem .95rem;font-weight:600;cursor:pointer;background:var(--module-button-bg,rgba(255,255,255,.12));color:var(--module-button-text,inherit);box-shadow:0 8px 18px rgba(15,23,42,.25);transition:transform .12s ease,box-shadow .12s ease,background .12s ease,border-color .12s ease;}
    .flv-file-btn:hover,.flv-refresh:hover,.flv-group-btn:hover{background:var(--module-button-bg-hover,rgba(255,255,255,.18));}
    .flv-file-btn:active,.flv-refresh:active,.flv-group-btn:active{transform:scale(.97);box-shadow:0 6px 16px rgba(15,23,42,.28);}
    .flv-body{flex:1;display:flex;gap:1rem;min-height:0;}
    .flv-left,.flv-right{flex:1;display:flex;flex-direction:column;gap:.75rem;min-height:0;}
    .flv-left{flex:0 0 320px;max-width:360px;}
    .flv-left-title,.flv-right-title{font-size:.9rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.82;}
    .flv-layer-list{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.65rem;padding:.25rem;}
    .flv-layer-card{position:relative;display:flex;flex-direction:column;gap:.45rem;padding:.85rem;border-radius:1rem;border:2px solid rgba(148,163,184,.35);box-shadow:0 10px 22px rgba(15,23,42,.35);cursor:grab;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease;}
    .flv-layer-card:hover{transform:translateY(-2px);box-shadow:0 16px 28px rgba(15,23,42,.45);}
    .flv-layer-card:active{cursor:grabbing;}
    .flv-layer-card[data-dragging="true"]{opacity:.75;transform:scale(.98);}
    .flv-layer-title{font-size:1rem;font-weight:700;letter-spacing:.02em;}
    .flv-layer-group{font-size:.78rem;opacity:.75;}
    .flv-layer-empty{margin-top:1rem;text-align:center;opacity:.75;}
    .flv-right{flex:1;min-width:0;}
    .flv-dropzone-list{flex:1;display:flex;flex-direction:column;gap:.75rem;overflow:auto;padding:.25rem;}
    .flv-dropzone{position:relative;border:2px dashed rgba(148,163,184,.45);border-radius:1rem;padding:1rem;display:flex;flex-direction:column;gap:.65rem;min-height:110px;transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease;}
    .flv-dropzone[data-has-layer="true"]{border-style:solid;box-shadow:0 14px 28px rgba(15,23,42,.35);}
    .flv-dropzone.is-dragover{border-color:rgba(94,234,212,.65);background:rgba(94,234,212,.08);}
    .flv-dropzone-header{display:flex;justify-content:space-between;align-items:center;gap:.5rem;font-weight:600;}
    .flv-dropzone-layer{font-size:.82rem;opacity:.75;}
    .flv-dropzone-preview{flex:1;display:flex;align-items:center;justify-content:center;padding:.85rem;border-radius:.9rem;border:2px solid rgba(255,255,255,.16);background:rgba(15,23,42,.45);color:inherit;font-weight:600;transition:transform .12s ease;}
    .flv-dropzone-preview[data-empty="true"]{border-style:dashed;opacity:.7;background:transparent;font-style:italic;}
    .flv-dropzone-preview:hover{transform:translateY(-1px);}
    .flv-group-actions{display:flex;gap:.5rem;flex-wrap:wrap;}
    .flv-footer{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.85rem;border-radius:.9rem;background:rgba(15,23,42,.35);border:1px solid rgba(255,255,255,.08);font-size:.85rem;}
    .flv-footer-hint{opacity:.75;font-size:.8rem;}
    .flv-status{min-height:1.1rem;}
    .flv-dropzone.flash{animation:flash 1s ease;}
    @keyframes flash{0%{box-shadow:0 0 0 3px rgba(255,255,255,.5);}100%{box-shadow:none;}}
    `;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function idbOpen(){
    if(typeof indexedDB === 'undefined'){
      return Promise.reject(new Error('IndexedDB nicht verfügbar'));
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        try{
          request.result.createObjectStore(IDB_STORE);
        }catch{}
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function idbGet(key){
    try{
      const db = await idbOpen();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    }catch(err){
      console.warn('[FarblayerViewer] IndexedDB get fehlgeschlagen:', err);
      return null;
    }
  }

  async function idbSet(key, value){
    try{
      const db = await idbOpen();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(value, key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }catch(err){
      console.warn('[FarblayerViewer] IndexedDB set fehlgeschlagen:', err);
    }
  }

  async function idbDel(key){
    try{
      const db = await idbOpen();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.delete(key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }catch(err){
      console.warn('[FarblayerViewer] IndexedDB delete fehlgeschlagen:', err);
    }
  }

  async function ensureReadPermission(handle){
    if(!handle || typeof handle.queryPermission !== 'function') return true;
    try{
      const status = await handle.queryPermission({ mode: 'read' });
      if(status === 'granted') return true;
      if(typeof handle.requestPermission === 'function'){
        const next = await handle.requestPermission({ mode: 'read' });
        return next === 'granted';
      }
    }catch(err){
      console.warn('[FarblayerViewer] Berechtigungsabfrage fehlgeschlagen:', err);
    }
    return false;
  }

  function throwIfAborted(signal){
    if(signal && signal.aborted){
      const reason = signal.reason instanceof Error ? signal.reason : undefined;
      throw reason && reason.name === 'AbortError'
        ? reason
        : new DOMException('Aborted', 'AbortError');
    }
  }

  function getRootDirectoryHandle(){
    if(typeof window === 'undefined') return null;
    const handle = window.rootDirHandle || null;
    if(!handle) return null;
    if(typeof handle.getDirectoryHandle !== 'function' || typeof handle.getFileHandle !== 'function'){
      return null;
    }
    return handle;
  }

  function getRootDisplayBase(){
    const handle = getRootDirectoryHandle();
    if(handle && typeof handle.name === 'string' && handle.name){
      return `Arbeitsordner „${handle.name}“`;
    }
    return 'Arbeitsordner';
  }

  function formatRootPath(subPath){
    const base = getRootDisplayBase();
    if(!subPath) return base;
    const normalized = String(subPath)
      .replace(/^[\\/]+/, '')
      .replace(/\\+/g, '/');
    const cleaned = normalized
      .split('/')
      .filter(Boolean)
      .join('/');
    if(!cleaned) return base;
    return `${base}: ${cleaned}`;
  }

  async function readFileFromRootHandle(path, signal){
    const root = getRootDirectoryHandle();
    if(!root || typeof path !== 'string') return null;
    const trimmed = path.trim().replace(/^[\\/]+/, '');
    if(!trimmed) return null;
    const segments = trimmed.split(/[\\/]+/).filter(Boolean);
    if(!segments.length) return null;
    let current = root;
    for(let index = 0; index < segments.length; index += 1){
      throwIfAborted(signal);
      const segment = segments[index];
      try{
        if(index === segments.length - 1){
          const fileHandle = await current.getFileHandle(segment, { create: false });
          const file = await fileHandle.getFile();
          throwIfAborted(signal);
          const text = await file.text();
          return { text, path: segments.join('/') };
        }
        current = await current.getDirectoryHandle(segment, { create: false });
      }catch(err){
        if(err && err.name === 'AbortError') throw err;
        return null;
      }
    }
    return null;
  }

  async function searchFileInRootHandle(names, signal){
    const root = getRootDirectoryHandle();
    if(!root || !names || !names.size) return null;
    const queue = [{ handle: root, path: '', depth: 0 }];
    const visited = new Set();
    while(queue.length){
      const { handle, path, depth } = queue.shift();
      if(!handle || visited.has(handle)) continue;
      visited.add(handle);
      throwIfAborted(signal);
      try{
        for await (const [entryName, entryHandle] of handle.entries()){
          throwIfAborted(signal);
          if(!entryHandle || typeof entryHandle.kind !== 'string') continue;
          if(entryHandle.kind === 'file'){
            if(names.has(entryName.toLowerCase())){
              try{
                const file = await entryHandle.getFile();
                throwIfAborted(signal);
                const text = await file.text();
                const relative = path ? `${path}${entryName}` : entryName;
                return { text, path: relative };
              }catch(err){
                if(err && err.name === 'AbortError') throw err;
              }
            }
          }else if(entryHandle.kind === 'directory' && depth < ROOT_SEARCH_MAX_DEPTH){
            queue.push({
              handle: entryHandle,
              path: path ? `${path}${entryName}/` : `${entryName}/`,
              depth: depth + 1
            });
          }
        }
      }catch(err){
        if(err && err.name === 'AbortError') throw err;
      }
    }
    return null;
  }

  async function loadPaletteFromFileHandle(handle, signal, errorLog){
    if(!handle) return null;
    const errors = Array.isArray(errorLog) ? errorLog : null;
    const logError = message => {
      if(errors){
        errors.push({ path: handle?.name || 'Datei-Handle', message });
      }
    };
    const hasPermission = await ensureReadPermission(handle);
    if(!hasPermission){
      logError('Kein Zugriff auf Datei.');
      return { denied: true };
    }
    try{
      const file = await handle.getFile();
      throwIfAborted(signal);
      const text = await file.text();
      const data = JSON.parse(text);
      return {
        data,
        path: handle?.name || 'FarblayerConfig.json',
        source: 'OneDrive-Datei',
        lastModified: typeof file?.lastModified === 'number' ? file.lastModified : null
      };
    }catch(err){
      if(err && err.name === 'AbortError') throw err;
      logError(err && err.message ? err.message : 'Datei konnte nicht gelesen werden.');
    }
    return null;
  }

  async function loadPaletteFromRootHandle(signal, errorLog){
    const root = getRootDirectoryHandle();
    if(!root) return null;
    const errors = Array.isArray(errorLog) ? errorLog : null;
    const logError = (path, message) => {
      if(errors){
        errors.push({ path, message });
      }
    };
    if(typeof root.queryPermission === 'function'){
      try{
        const status = await root.queryPermission({ mode: 'read' });
        if(status === 'denied'){
          logError(getRootDisplayBase(), 'Kein Zugriff auf Arbeitsordner (Berechtigung verweigert).');
          return null;
        }
      }catch(err){
        if(err && err.name === 'AbortError') throw err;
      }
    }
    const candidatePaths = [];
    const seen = new Set();
    const addCandidate = value => {
      if(typeof value !== 'string') return;
      const trimmed = value.trim();
      if(!trimmed) return;
      let normalized = trimmed.replace(/\\+/g, '/');
      normalized = normalized.replace(/^(?:\.\.\/|\.\/)+/, '');
      if(!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      candidatePaths.push(normalized);
    };
    addCandidate(CONFIG_PATH);
    addCandidate(CONFIG_FILENAME);
    const lowerFilename = CONFIG_FILENAME.toLowerCase();
    if(lowerFilename !== CONFIG_FILENAME){
      addCandidate(lowerFilename);
      addCandidate(`configs/${lowerFilename}`);
    }

    for(const path of candidatePaths){
      const result = await readFileFromRootHandle(path, signal);
      if(!result) continue;
      try{
        const data = JSON.parse(result.text);
        return {
          data,
          path: formatRootPath(result.path),
          source: `${getRootDisplayBase()}`
        };
      }catch(err){
        logError(formatRootPath(result.path), err && err.message
          ? `Ungültige JSON-Datei: ${err.message}`
          : 'Ungültige JSON-Datei.');
      }
    }

    const nameSet = new Set([CONFIG_FILENAME.toLowerCase()]);
    const searchResult = await searchFileInRootHandle(nameSet, signal);
    if(searchResult){
      try{
        const data = JSON.parse(searchResult.text);
        return {
          data,
          path: formatRootPath(searchResult.path),
          source: `${getRootDisplayBase()}`
        };
      }catch(err){
        logError(formatRootPath(searchResult.path), err && err.message
          ? `Ungültige JSON-Datei: ${err.message}`
          : 'Ungültige JSON-Datei.');
      }
    }else{
      logError(formatRootPath(CONFIG_FILENAME), 'Datei im Arbeitsordner nicht gefunden.');
    }

    return null;
  }

  function sanitizeColorValue(value){
    if(typeof value !== 'string') return '';
    const trimmed = value.trim();
    if(!trimmed) return '';
    const normalized = trimmed.toLowerCase();
    const invalidTokens = ['n/a','n.a.','na','n.v.','n.v','nv','k.a.','k.a','ka','keine angabe','keine-angabe','keineangabe','null','undefined'];
    if(invalidTokens.includes(normalized)) return '';
    return trimmed;
  }

  function markCoerced(descriptor){
    if(descriptor && typeof descriptor === 'object' && descriptor.__flvCoerced !== true){
      Object.defineProperty(descriptor, '__flvCoerced', {
        value: true,
        enumerable: false,
        configurable: false
      });
    }
    return descriptor;
  }

  function pickColorValue(entry){
    if(!entry || typeof entry !== 'object') return '';
    const candidates = [entry.background, entry.color, entry.hsla, entry.moduleBg, entry.bg];
    for(const value of candidates){
      const sanitized = sanitizeColorValue(value);
      if(sanitized){
        return sanitized;
      }
    }
    return '';
  }

  function pickTextValue(entry){
    if(!entry || typeof entry !== 'object') return '';
    const candidates = [entry.text, entry.textColor, entry.moduleText];
    for(const value of candidates){
      const sanitized = sanitizeColorValue(value);
      if(sanitized){
        return sanitized;
      }
    }
    return '';
  }

  function pickBorderValue(entry){
    if(!entry || typeof entry !== 'object') return '';
    const candidates = [entry.border, entry.borderColor, entry.moduleBorder];
    for(const value of candidates){
      const sanitized = sanitizeColorValue(value);
      if(sanitized){
        return sanitized;
      }
    }
    return '';
  }

  function parseLightness(color){
    if(typeof color !== 'string') return null;
    const open = color.indexOf('(');
    const close = color.indexOf(')', open + 1);
    if(open === -1 || close === -1) return null;
    const parts = color.slice(open + 1, close).split(',');
    if(parts.length < 3) return null;
    const raw = parts[2].trim().replace(/%/g,'');
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : null;
  }

  function getReadableTextColor(background, preferred){
    if(typeof preferred === 'string' && preferred.trim()){
      return preferred.trim();
    }
    const lightness = parseLightness(background);
    if(lightness === null) return '#0f172a';
    return lightness >= 55 ? '#0f172a' : '#f8fafc';
  }

  function coerceColorDescriptor(entry){
    if(entry == null) return null;

    if(typeof entry === 'string'){
      const background = sanitizeColorValue(entry);
      return background ? markCoerced({ background }) : null;
    }

    if(Array.isArray(entry)){
      if(!entry.length) return null;
      const containsOnlyStrings = entry.every(item => typeof item === 'string');
      if(!containsOnlyStrings || entry.length > 3) return null;
      const [backgroundRaw, textRaw, borderRaw] = entry;
      const background = sanitizeColorValue(backgroundRaw);
      const text = sanitizeColorValue(textRaw);
      const border = sanitizeColorValue(borderRaw);
      if(!background && !text && !border) return null;
      return markCoerced({ background, text, border });
    }

    if(typeof entry === 'object'){
      const descriptor = { ...entry };
      const colorKeys = ['background','color','hsla','moduleBg','bg','text','textColor','moduleText','border','borderColor','moduleBorder'];
      colorKeys.forEach(key => {
        if(typeof descriptor[key] === 'string'){
          const sanitized = sanitizeColorValue(descriptor[key]);
          if(sanitized){
            descriptor[key] = sanitized;
          }else{
            delete descriptor[key];
          }
        }
      });
      const hasColors = pickColorValue(descriptor) || pickTextValue(descriptor) || pickBorderValue(descriptor);
      return hasColors ? markCoerced(descriptor) : null;
    }

    return null;
  }

  function normalizeEntry(groupName, entryName, entry){
    const descriptor = entry && entry.__flvCoerced ? entry : coerceColorDescriptor(entry);
    if(!descriptor) return null;
    const background = pickColorValue(descriptor);
    if(!background) return null;
    const text = getReadableTextColor(background, pickTextValue(descriptor));
    const border = pickBorderValue(descriptor);
    const displayName = typeof descriptor?.title === 'string' && descriptor.title.trim()
      ? descriptor.title.trim()
      : (typeof descriptor?.displayName === 'string' && descriptor.displayName.trim()
        ? descriptor.displayName.trim()
        : (typeof entryName === 'string' && entryName.trim() ? entryName.trim() : 'Layer'));
    return {
      group: typeof groupName === 'string' && groupName.trim() ? groupName.trim() : '',
      name: displayName,
      rawName: entryName,
      background,
      text,
      border: border && border.trim() ? border.trim() : ''
    };
  }

  function flattenPalette(data){
    const items = [];
    if(!data || typeof data !== 'object') return items;

    function walk(path, entryName, value){
      const descriptor = coerceColorDescriptor(value);
      if(descriptor){
        const groupLabel = path.length ? path.map(part => (typeof part === 'string' ? part.trim() : '')).filter(Boolean).join(' › ') : '';
        const normalized = normalizeEntry(groupLabel, entryName, descriptor);
        if(normalized) items.push(normalized);
        return;
      }

      const trimmedName = typeof entryName === 'string' ? entryName.trim() : '';
      const nextPath = trimmedName ? [...path, trimmedName] : path.slice();

      if(Array.isArray(value)){
        value.forEach((childValue, index) => {
          const fallbackName = typeof childValue?.name === 'string' && childValue.name.trim()
            ? childValue.name.trim()
            : `${trimmedName || 'Layer'} ${index + 1}`;
          walk(nextPath, fallbackName, childValue);
        });
        return;
      }

      if(!value || typeof value !== 'object') return;

      Object.entries(value).forEach(([childName, childValue]) => {
        walk(nextPath, childName, childValue);
      });
    }

    Object.entries(data).forEach(([groupName, value]) => {
      walk([], groupName, value);
    });

    return items;
  }

  function readCachedPalette(){
    try{
      const stored = localStorage.getItem(STORAGE_KEY);
      if(!stored) return null;
      const parsed = JSON.parse(stored);
      if(parsed && typeof parsed === 'object'){
        if(parsed.data && typeof parsed.data === 'object'){
          return {
            data: parsed.data,
            path: typeof parsed.path === 'string' && parsed.path.trim() ? parsed.path.trim() : null
          };
        }
        return { data: parsed, path: null };
      }
    }catch{}
    return null;
  }

  function writeCachedPalette(data, path){
    try{
      const payload = {
        data,
        path: typeof path === 'string' && path.trim() ? path.trim() : null,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }catch{}
  }

  function reportSearchErrors(errors){
    if(!Array.isArray(errors) || !errors.length) return;
    const header = `[FarblayerViewer] Fehlgeschlagene Pfadversuche (${errors.length})`;
    if(typeof console !== 'undefined'){
      if(typeof console.groupCollapsed === 'function'){
        console.groupCollapsed(header);
        errors.forEach(entry => {
          const path = entry && typeof entry.path === 'string' ? entry.path : 'Unbekannter Pfad';
          const message = entry && entry.message ? entry.message : 'Unbekannter Fehler';
          console.info(`- ${path}: ${message}`);
        });
        console.groupEnd();
      }else{
        console.warn(header, errors);
      }
    }
  }

  function isFetchablePath(value){
    if(typeof value !== 'string') return false;
    const trimmed = value.trim();
    if(!trimmed) return false;
    if(/^https?:\/\//i.test(trimmed)) return true;
    if(/^file:\/\//i.test(trimmed)) return true;
    if(trimmed.startsWith('//')) return true;
    if(trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) return true;
    if(trimmed.startsWith('configs/') || trimmed.startsWith('modules/')) return true;
    if(!trimmed.includes(':')) return true;
    return false;
  }

  function buildSearchPaths(preferredPath){
    const candidates = [];
    const seen = new Set();
    const add = value => {
      if(typeof value !== 'string') return;
      const trimmed = value.trim();
      if(!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      candidates.push(trimmed);
    };

    if(preferredPath && isFetchablePath(preferredPath)) add(preferredPath);

    const lowerFilename = CONFIG_FILENAME.toLowerCase();
    const relativePrefixes = ['', './', '../', '../../', '../../../', '../../../../', '../../../../../'];
    relativePrefixes.forEach(prefix => {
      add(`${prefix}${CONFIG_PATH}`);
      add(`${prefix}${CONFIG_FILENAME}`);
      add(`${prefix}configs/${CONFIG_FILENAME}`);
      if(lowerFilename !== CONFIG_FILENAME){
        add(`${prefix}${lowerFilename}`);
        add(`${prefix}configs/${lowerFilename}`);
      }
    });

    add(`/${CONFIG_FILENAME}`);
    add(`/configs/${CONFIG_FILENAME}`);
    if(lowerFilename !== CONFIG_FILENAME){
      add(`/${lowerFilename}`);
      add(`/configs/${lowerFilename}`);
    }

    if(typeof window !== 'undefined' && window && window.location && typeof window.location.pathname === 'string'){
      const segments = window.location.pathname.split('/').filter(Boolean);
      for(let depth = segments.length; depth >= 0; depth--){
        const slice = segments.slice(0, depth).join('/');
        const absolutePrefix = slice ? `/${slice}/` : '/';
        add(`${absolutePrefix}${CONFIG_PATH}`);
        add(`${absolutePrefix}${CONFIG_FILENAME}`);
        add(`${absolutePrefix}configs/${CONFIG_FILENAME}`);
        if(lowerFilename !== CONFIG_FILENAME){
          add(`${absolutePrefix}${lowerFilename}`);
          add(`${absolutePrefix}configs/${lowerFilename}`);
        }
      }
    }

    if(typeof document !== 'undefined' && document){
      const scripts = document.querySelectorAll('script[src]');
      scripts.forEach(script => {
        const src = script.getAttribute('src');
        if(!src) return;
        try{
          const url = new URL(src, typeof window !== 'undefined' ? window.location.href : undefined);
          const basePath = url.pathname.replace(/[^/]*$/, '');
          const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
          add(`${normalizedBase}${CONFIG_PATH}`);
          add(`${normalizedBase}${CONFIG_FILENAME}`);
          add(`${normalizedBase}configs/${CONFIG_FILENAME}`);
          if(lowerFilename !== CONFIG_FILENAME){
            add(`${normalizedBase}${lowerFilename}`);
            add(`${normalizedBase}configs/${lowerFilename}`);
          }

          const parts = normalizedBase.split('/').filter(Boolean);
          let relative = '';
          for(let depth = parts.length; depth > 0; depth--){
            relative += '../';
            add(`${relative}${CONFIG_PATH}`);
            add(`${relative}${CONFIG_FILENAME}`);
            add(`${relative}configs/${CONFIG_FILENAME}`);
            if(lowerFilename !== CONFIG_FILENAME){
              add(`${relative}${lowerFilename}`);
              add(`${relative}configs/${lowerFilename}`);
            }
          }
        }catch{}
      });
    }

    return candidates;
  }

  async function fetchPalette(signal, options = {}){
    const errors = [];
    const cached = readCachedPalette();
    const handle = options && typeof options === 'object' ? options.fileHandle || null : null;
    const onHandleDenied = typeof options.onFileHandleDenied === 'function' ? options.onFileHandleDenied : null;
    const onHandleError = typeof options.onFileHandleError === 'function' ? options.onFileHandleError : null;
    const onHandleSuccess = typeof options.onFileHandleSuccess === 'function' ? options.onFileHandleSuccess : null;

    if(handle){
      const handleResult = await loadPaletteFromFileHandle(handle, signal, errors);
      if(handleResult && handleResult.denied){
        if(onHandleDenied) onHandleDenied();
      }else if(handleResult && handleResult.data){
        writeCachedPalette(handleResult.data, handleResult.path);
        if(onHandleSuccess) onHandleSuccess(handleResult);
        if(errors.length) reportSearchErrors(errors);
        return {
          data: handleResult.data,
          source: handleResult.source,
          path: handleResult.path,
          lastModified: handleResult.lastModified || null
        };
      }else if(handleResult === null && onHandleError){
        onHandleError();
      }
    }

    const rootResult = await loadPaletteFromRootHandle(signal, errors);
    if(rootResult){
      writeCachedPalette(rootResult.data, rootResult.path);
      if(errors.length) reportSearchErrors(errors);
      return {
        data: rootResult.data,
        source: rootResult.source,
        path: rootResult.path,
        lastModified: null
      };
    }

    if(typeof fetch !== 'function'){
      if(cached){
        if(errors.length) reportSearchErrors(errors);
        console.warn('[FarblayerViewer] Verwende zwischengespeicherte Farblayer – Fetch API nicht verfügbar.');
        return { data: cached.data, source: 'Lokaler Speicher', path: cached.path || null, lastModified: null };
      }
      if(errors.length) reportSearchErrors(errors);
      throw new Error('Fetch API nicht verfügbar.');
    }

    const searchPaths = buildSearchPaths(cached && cached.path ? cached.path : null);

    for(const path of searchPaths){
      try{
        const response = await fetch(path, { cache: 'no-store', signal });
        if(!response.ok){
          errors.push({ path, message: `${response.status} ${response.statusText}` });
          continue;
        }
        const data = await response.json();
        if(data && typeof data === 'object'){
          writeCachedPalette(data, path);
          if(errors.length) reportSearchErrors(errors);
          return { data, source: 'Dateisystem', path, lastModified: null };
        }
        errors.push({ path, message: 'Datei enthält keine gültige JSON-Struktur.' });
      }catch(err){
        if((signal && signal.aborted) || (err && err.name === 'AbortError')){
          throw err;
        }
        const message = err && err.message ? err.message : 'Unbekannter Fehler';
        errors.push({ path, message });
      }
    }

    if(cached){
      if(errors.length) reportSearchErrors(errors);
      console.warn('[FarblayerViewer] Verwende zwischengespeicherte Farblayer – aktuelle Datei konnte nicht gefunden werden.');
      return { data: cached.data, source: 'Lokaler Speicher', path: cached.path || null, lastModified: null };
    }

    if(errors.length) reportSearchErrors(errors);
    console.warn(`[FarblayerViewer] Keine Farblayer-Konfiguration gefunden. Es werden Debug-Standardwerte angezeigt (${CONFIG_FILENAME}).`);
    return { data: DEFAULT_DEBUG_DATA, source: 'Standardwerte (Fallback)', path: null, lastModified: null };
  }

  function renderItems(container, items, options = {}){
    if(!container) return;
    const onCard = typeof options.onCard === 'function' ? options.onCard : null;
    container.innerHTML = '';
    if(!Array.isArray(items) || !items.length){
      const empty = document.createElement('div');
      empty.className = 'flv-layer-empty';
      empty.textContent = 'Keine Farblayer gefunden.';
      container.appendChild(empty);
      return;
    }
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'flv-layer-card';
      card.draggable = true;
      card.dataset.layer = item.name || '';
      if(item.background){
        card.style.background = item.background;
      }
      if(item.text){
        card.style.color = item.text;
      }
      if(item.border){
        card.style.borderColor = item.border;
      }
      const title = document.createElement('div');
      title.className = 'flv-layer-title';
      title.textContent = item.name;
      card.appendChild(title);
      if(item.group){
        const group = document.createElement('div');
        group.className = 'flv-layer-group';
        group.textContent = item.group;
        card.appendChild(group);
      }
      const tooltipParts = [
        `Hintergrund: ${item.background || '—'}`,
        `Text: ${item.text || '—'}`,
        `Rahmen: ${item.border || '—'}`
      ];
      card.title = tooltipParts.join('\n');
      if(onCard){
        onCard(card, item);
      }
      container.appendChild(card);
    });
  }

  window.renderFarblayerViewer = function renderFarblayerViewer(root){
    if(!root) return;
    ensureStyles();
    root.classList.add('flv-root');
    const BASE_GROUPS = ['Hauptoberfläche','Header','Aktionselemente','Textanzeigen'];
    const GROUP_STORAGE_PREFIX = 'farblayerGroups:';
    const MAPPING_STORAGE_PREFIX = 'farblayerMapping:';
    root.innerHTML = `
      <div class="flv-surface">
        <div class="flv-header">
          <div class="flv-header-info">
            <div class="flv-title">Farblayer-Konfiguration</div>
            <div class="flv-meta" data-flv-meta>${CONFIG_PATH}</div>
          </div>
          <div class="flv-file">
            <div class="flv-file-label" data-flv-file-label>Keine Datei verbunden</div>
            <div class="flv-file-note" data-flv-file-note>Bitte Farblayer-Datei wählen.</div>
            <div class="flv-file-controls">
              <button class="flv-file-btn" type="button" data-flv-file-pick>Datei wählen</button>
              <button class="flv-refresh" type="button" data-flv-refresh>Aktualisieren</button>
            </div>
          </div>
        </div>
        <div class="flv-body">
          <div class="flv-left">
            <div class="flv-left-title">Layer-Bibliothek</div>
            <div class="flv-layer-list" data-flv-list></div>
          </div>
          <div class="flv-right">
            <div class="flv-right-title">Gruppen-Dropzonen</div>
            <div class="flv-dropzone-list" data-flv-dropzones></div>
            <div class="flv-group-actions">
              <button class="flv-group-btn" type="button" data-flv-add-group>+ Gruppe hinzufügen</button>
              <button class="flv-group-btn" type="button" data-flv-remove-group>– Gruppe entfernen</button>
            </div>
          </div>
        </div>
        <div class="flv-footer">
          <div class="flv-status" data-flv-status>Farblayer werden geladen…</div>
          <div class="flv-footer-hint">Tipp: Alt halten, um Layer auf alle Gruppen anzuwenden.</div>
        </div>
      </div>
    `;
    const listEl = root.querySelector('[data-flv-list]');
    const dropzoneContainer = root.querySelector('[data-flv-dropzones]');
    const statusEl = root.querySelector('[data-flv-status]');
    const refreshBtn = root.querySelector('[data-flv-refresh]');
    const metaEl = root.querySelector('[data-flv-meta]');
    const fileLabelEl = root.querySelector('[data-flv-file-label]');
    const fileNoteEl = root.querySelector('[data-flv-file-note]');
    const filePickBtn = root.querySelector('[data-flv-file-pick]');
    const addGroupBtn = root.querySelector('[data-flv-add-group]');
    const removeGroupBtn = root.querySelector('[data-flv-remove-group]');

    if(typeof root.__flvCleanup === 'function'){
      root.__flvCleanup();
    }

    const state = {
      controller: null,
      disposed: false,
      items: [],
      lastSource: null,
      fileHandle: null,
      pollInterval: null,
      pollInProgress: false,
      lastModified: null,
      autoState: 'idle',
      autoMessage: '',
      dropzones: new Map(),
      groups: BASE_GROUPS.slice(),
      groupAssignments: {},
      layerLookup: new Map(),
      moduleName: 'Farblayer',
      statusResetTimeout: null
    };

    root.__flvCleanup = () => {
      state.disposed = true;
      if(state.controller){
        try{ state.controller.abort(); }catch{}
        state.controller = null;
      }
      if(state.pollInterval){
        clearInterval(state.pollInterval);
        state.pollInterval = null;
      }
      if(state.statusResetTimeout){
        clearTimeout(state.statusResetTimeout);
        state.statusResetTimeout = null;
      }
      persistMapping();
    };

    function getModuleKey(){
      const name = typeof state.moduleName === 'string' && state.moduleName.trim() ? state.moduleName.trim() : 'Farblayer';
      return name;
    }

    function getGroupsStorageKey(){
      return `${GROUP_STORAGE_PREFIX}${getModuleKey()}`;
    }

    function getMappingStorageKey(){
      return `${MAPPING_STORAGE_PREFIX}${getModuleKey()}`;
    }

    function persistGroups(){
      try{
        localStorage.setItem(getGroupsStorageKey(), JSON.stringify(state.groups));
      }catch{}
    }

    function loadStoredGroups(){
      try{
        const stored = localStorage.getItem(getGroupsStorageKey());
        if(!stored) return BASE_GROUPS.slice();
        const parsed = JSON.parse(stored);
        if(Array.isArray(parsed)){
          const unique = Array.from(new Set(parsed.map(value => typeof value === 'string' ? value.trim() : '').filter(Boolean)));
          return unique.length ? unique : BASE_GROUPS.slice();
        }
      }catch{}
      return BASE_GROUPS.slice();
    }

    function persistMapping(){
      const payload = {};
      state.groups.forEach(groupName => {
        const layerName = state.groupAssignments[groupName];
        if(layerName && state.layerLookup.has(layerName)){
          payload[groupName] = layerName;
        }
      });
      try{
        localStorage.setItem(getMappingStorageKey(), JSON.stringify(payload));
      }catch{}
    }

    function loadStoredMapping(){
      try{
        const stored = localStorage.getItem(getMappingStorageKey());
        if(!stored) return {};
        const parsed = JSON.parse(stored);
        if(parsed && typeof parsed === 'object'){
          const mapping = {};
          Object.entries(parsed).forEach(([groupName, layerName]) => {
            if(state.groups.includes(groupName) && typeof layerName === 'string' && state.layerLookup.has(layerName)){
              mapping[groupName] = layerName;
            }
          });
          return mapping;
        }
      }catch{}
      return {};
    }

    function getLayerByName(layerName){
      if(!layerName) return null;
      return state.layerLookup.get(layerName) || null;
    }

    function triggerDropzoneFlash(groupName){
      const ref = state.dropzones.get(groupName);
      if(!ref) return;
      ref.zone.classList.remove('flash');
      void ref.zone.offsetWidth;
      ref.zone.classList.add('flash');
      setTimeout(() => {
        if(ref.zone){
          ref.zone.classList.remove('flash');
        }
      }, 1000);
    }

    function applyLayerColors(groupName, layer){
      if(!layer) return;
      if(typeof window === 'undefined') return;
      const base = window.FarblayerBase;
      const applyColors = base && typeof base.applyColors === 'function' ? base.applyColors : null;
      if(!applyColors) return;
      const ref = state.dropzones.get(groupName);
      const targets = ref ? [ref.preview] : [];
      try{
        applyColors(targets, layer);
      }catch(err){
        console.warn('[FarblayerViewer] applyColors fehlgeschlagen:', err);
      }
    }

    function updateDropzone(groupName, layer){
      const ref = state.dropzones.get(groupName);
      if(!ref) return;
      if(layer){
        ref.zone.dataset.hasLayer = 'true';
        ref.layerLabel.textContent = layer.name;
        ref.preview.dataset.empty = 'false';
        ref.preview.textContent = layer.name;
        ref.preview.style.background = layer.background || '';
        ref.preview.style.color = layer.text || '';
        ref.preview.style.borderColor = layer.border || 'rgba(255,255,255,.16)';
      }else{
        delete ref.zone.dataset.hasLayer;
        ref.layerLabel.textContent = 'Kein Layer';
        ref.preview.dataset.empty = 'true';
        ref.preview.textContent = 'Layer hierhin ziehen';
        ref.preview.style.background = '';
        ref.preview.style.color = '';
        ref.preview.style.borderColor = '';
      }
    }

    function createDropzone(groupName){
      if(!dropzoneContainer) return null;
      const zone = document.createElement('div');
      zone.className = 'flv-dropzone';
      zone.dataset.group = groupName;

      const header = document.createElement('div');
      header.className = 'flv-dropzone-header';
      const title = document.createElement('span');
      title.textContent = groupName;
      header.appendChild(title);
      const layerLabel = document.createElement('span');
      layerLabel.className = 'flv-dropzone-layer';
      layerLabel.textContent = 'Kein Layer';
      header.appendChild(layerLabel);
      zone.appendChild(header);

      const preview = document.createElement('div');
      preview.className = 'flv-dropzone-preview';
      preview.dataset.empty = 'true';
      preview.textContent = 'Layer hierhin ziehen';
      zone.appendChild(preview);

      const removeDragClass = () => zone.classList.remove('is-dragover');

      zone.addEventListener('dragover', event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      });
      zone.addEventListener('dragenter', event => {
        event.preventDefault();
        zone.classList.add('is-dragover');
      });
      zone.addEventListener('dragleave', event => {
        if(!zone.contains(event.relatedTarget)){
          removeDragClass();
        }
      });
      zone.addEventListener('drop', event => {
        event.preventDefault();
        removeDragClass();
        const layerName = event.dataTransfer.getData('text/plain');
        if(!layerName) return;
        if(event.altKey){
          assignLayerToAll(layerName, { flashGroup: groupName });
        }else{
          assignLayerToGroup(groupName, layerName);
        }
      });

      return { zone, layerLabel, preview };
    }

    function renderGroupZones(){
      if(!dropzoneContainer) return;
      dropzoneContainer.innerHTML = '';
      state.dropzones.clear();
      state.groups.forEach(groupName => {
        const ref = createDropzone(groupName);
        if(!ref) return;
        dropzoneContainer.appendChild(ref.zone);
        state.dropzones.set(groupName, ref);
        const layerName = state.groupAssignments[groupName];
        const layer = layerName ? getLayerByName(layerName) : null;
        updateDropzone(groupName, layer);
        if(layer){
          applyLayerColors(groupName, layer);
        }
      });
    }

    function flashStatus(message, { temporary = false } = {}){
      if(!statusEl) return;
      statusEl.textContent = message || '';
      if(state.statusResetTimeout){
        clearTimeout(state.statusResetTimeout);
        state.statusResetTimeout = null;
      }
      if(temporary){
        state.statusResetTimeout = setTimeout(() => {
          state.statusResetTimeout = null;
          updateStatusMessage(state.lastSource, state.items.length);
        }, 2500);
      }
    }

    function assignLayerToGroup(groupName, layerName, options = {}){
      const layer = getLayerByName(layerName);
      if(!layer){
        flashStatus(`Layer "${layerName}" nicht gefunden.`, { temporary: true });
        return;
      }
      if(!state.groups.includes(groupName)){
        flashStatus(`Gruppe "${groupName}" nicht vorhanden.`, { temporary: true });
        return;
      }
      state.groupAssignments[groupName] = layer.name;
      updateDropzone(groupName, layer);
      applyLayerColors(groupName, layer);
      if(options.flashZone !== false){
        triggerDropzoneFlash(groupName);
      }
      if(options.persist !== false){
        persistMapping();
      }
      if(options.announce !== false){
        flashStatus(`"${layer.name}" → ${groupName}`, { temporary: true });
      }
    }

    function assignLayerToAll(layerName, { flashGroup = null } = {}){
      const layer = getLayerByName(layerName);
      if(!layer){
        flashStatus(`Layer "${layerName}" nicht gefunden.`, { temporary: true });
        return;
      }
      state.groups.forEach(groupName => {
        assignLayerToGroup(groupName, layer.name, {
          persist: false,
          flashZone: flashGroup ? groupName === flashGroup : true,
          announce: false
        });
      });
      persistMapping();
      flashStatus(`"${layer.name}" auf alle Gruppen angewendet.`, { temporary: true });
    }

    function updateStatusMessage(source, totalCount){
      if(!statusEl) return;
      if(!source){
        statusEl.textContent = '';
        return;
      }
      let message = `${totalCount} Layer geladen (${source}).`;
      if(source === 'Standardwerte (Fallback)'){
        message += ' Bitte prüfen Sie den Zugriff auf die Farblayer-Datei.';
      }
      statusEl.textContent = message;
    }

    function deriveModuleName(result, flattened){
      if(result && typeof result.moduleName === 'string' && result.moduleName.trim()){
        return result.moduleName.trim();
      }
      if(result && typeof result.path === 'string' && result.path.trim()){
        const base = result.path.trim().split(/[\\/]/).pop() || '';
        if(base){
          return base.replace(/\.json$/i, '');
        }
      }
      const firstGroup = flattened.find(entry => entry && typeof entry.group === 'string' && entry.group.trim());
      if(firstGroup){
        const parts = firstGroup.group.split('›').map(part => part.trim()).filter(Boolean);
        if(parts.length){
          return parts[0];
        }
      }
      return 'Farblayer';
    }

    function applyPaletteResult(result){
      if(!result) return;
      const flattened = flattenPalette(result.data);
      state.items = flattened;
      state.layerLookup = new Map(flattened.map(item => [item.name, item]));
      state.lastSource = result.source;
      state.lastModified = result.lastModified != null ? result.lastModified : state.lastModified;
      state.moduleName = deriveModuleName(result, flattened);
      state.groups = loadStoredGroups();
      state.groupAssignments = loadStoredMapping();
      renderGroupZones();
      if(listEl){
        renderItems(listEl, flattened, {
          onCard(card, item){
            card.addEventListener('dragstart', event => {
              event.dataTransfer.setData('text/plain', item.name);
              event.dataTransfer.effectAllowed = 'copy';
              card.dataset.dragging = 'true';
            });
            card.addEventListener('dragend', () => {
              delete card.dataset.dragging;
            });
          }
        });
      }
      state.groups.forEach(groupName => {
        const layerName = state.groupAssignments[groupName];
        const layer = layerName ? getLayerByName(layerName) : null;
        updateDropzone(groupName, layer);
        if(layer){
          applyLayerColors(groupName, layer);
        }
      });
      persistGroups();
      persistMapping();
      updateStatusMessage(result.source, flattened.length);
      if(metaEl){
        const labelPath = result.path || CONFIG_PATH;
        metaEl.textContent = `${labelPath} • ${result.source}`;
        if(result.source === 'Standardwerte (Fallback)'){
          metaEl.title = 'Debug-Fallback aktiv: Die Konfigurationsdatei konnte nicht gefunden werden.';
        }else if(result.path){
          metaEl.title = `Quelle: ${result.path}`;
        }else{
          metaEl.removeAttribute('title');
        }
      }
    }

    async function loadPalette(reason){
      if(state.disposed) return;
      if(state.controller){
        try{ state.controller.abort(); }catch{}
      }
      const controller = new AbortController();
      state.controller = controller;
      if(statusEl){
        statusEl.textContent = reason === 'manual' ? 'Aktualisiere Farblayer…' : 'Farblayer werden geladen…';
      }
      if(listEl){
        listEl.innerHTML = '';
      }
      try{
        const result = await fetchPalette(controller.signal, {
          fileHandle: state.fileHandle,
          onFileHandleDenied: async () => {
            state.fileHandle = null;
            await idbDel(HANDLE_STORAGE_KEY);
            stopAutoUpdatePolling('error', 'Berechtigung erforderlich.');
          },
          onFileHandleError: () => {
            stopAutoUpdatePolling('error', 'Datei konnte nicht gelesen werden.');
          },
          onFileHandleSuccess: handleResult => {
            state.lastModified = handleResult.lastModified || null;
            startAutoUpdatePolling();
          }
        });
        if(state.disposed || controller.signal.aborted) return;
        applyPaletteResult(result);
        if(state.fileHandle){
          state.autoState = 'active';
          state.autoMessage = '';
        }
        updateFileDisplay();
      }catch(err){
        if(state.disposed || controller.signal.aborted) return;
        console.warn('[FarblayerViewer] Konnte Farblayer nicht laden:', err);
        state.items = [];
        state.layerLookup = new Map();
        state.groups = BASE_GROUPS.slice();
        state.groupAssignments = {};
        renderGroupZones();
        if(listEl){
          renderItems(listEl, []);
        }
        if(statusEl){
          statusEl.textContent = 'Farblayer konnten nicht geladen werden.';
        }
        if(metaEl){
          metaEl.textContent = `${CONFIG_PATH} • Keine Daten`;
          metaEl.removeAttribute('title');
        }
      }finally{
        state.controller = null;
      }
    }

    function formatTimestamp(timestamp){
      if(typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return '';
      const date = new Date(timestamp);
      if(Number.isNaN(date.getTime())) return '';
      return date.toLocaleString('de-DE', { hour12: false });
    }

    function updateFileDisplay(){
      if(fileLabelEl){
        if(state.fileHandle){
          const name = state.fileHandle.name || 'FarblayerConfig.json';
          fileLabelEl.textContent = `• ${name}`;
        }else{
          fileLabelEl.textContent = 'Keine Datei verbunden';
        }
      }
      if(fileNoteEl){
        let note = '';
        if(state.fileHandle){
          if(state.autoState === 'error'){
            note = state.autoMessage ? `Automatisches Update gestoppt – ${state.autoMessage}` : 'Automatisches Update gestoppt.';
          }else if(state.autoState === 'paused'){
            note = 'Automatisches Update pausiert.';
          }else{
            const ts = formatTimestamp(state.lastModified);
            note = ts ? `Automatisches Update aktiv – Stand ${ts}` : 'Automatisches Update aktiv.';
          }
        }else if(state.autoState === 'manual'){
          const ts = formatTimestamp(state.lastModified);
          note = ts ? `Manuell geladen – Stand ${ts}` : 'Manuell geladene Farblayer.';
        }else if(state.autoState === 'error'){
          note = state.autoMessage || 'Datei konnte nicht geladen werden.';
        }else{
          note = 'Bitte Farblayer-Datei wählen.';
        }
        fileNoteEl.textContent = note;
      }
    }

    function clearPolling(){
      if(state.pollInterval){
        clearInterval(state.pollInterval);
        state.pollInterval = null;
      }
      state.pollInProgress = false;
    }

    function stopAutoUpdatePolling(nextState = 'idle', message = ''){
      clearPolling();
      state.autoState = nextState;
      state.autoMessage = message || '';
      updateFileDisplay();
    }

    async function pollFileChangesOnce(){
      if(state.pollInProgress || !state.fileHandle) return;
      state.pollInProgress = true;
      try{
        const file = await state.fileHandle.getFile();
        const modified = typeof file?.lastModified === 'number' ? file.lastModified : null;
        if(modified != null){
          if(state.lastModified == null){
            state.lastModified = modified;
            updateFileDisplay();
          }else if(modified > state.lastModified){
            state.lastModified = modified;
            await loadPalette('auto');
          }
        }
      }catch(err){
        console.warn('[FarblayerViewer] Auto-Update fehlgeschlagen:', err);
        stopAutoUpdatePolling('error', 'Kein Zugriff auf Farblayer-Datei.');
      }finally{
        state.pollInProgress = false;
      }
    }

    function startAutoUpdatePolling(){
      clearPolling();
      if(!state.fileHandle){
        stopAutoUpdatePolling('idle');
        return;
      }
      state.autoState = 'active';
      state.autoMessage = '';
      state.pollInterval = setInterval(() => { void pollFileChangesOnce(); }, POLL_INTERVAL_MS);
      void pollFileChangesOnce();
      updateFileDisplay();
    }

    async function restoreStoredHandle(){
      const storedHandle = await idbGet(HANDLE_STORAGE_KEY);
      if(state.disposed) return;
      if(!storedHandle){
        updateFileDisplay();
        return;
      }
      const hasPermission = await ensureReadPermission(storedHandle);
      if(!hasPermission){
        await idbDel(HANDLE_STORAGE_KEY);
        state.fileHandle = null;
        stopAutoUpdatePolling('idle');
        return;
      }
      state.fileHandle = storedHandle;
      state.autoState = 'active';
      state.autoMessage = '';
      updateFileDisplay();
    }

    async function bindFileHandle(handle){
      if(!handle) return false;
      const hasPermission = await ensureReadPermission(handle);
      if(!hasPermission){
        stopAutoUpdatePolling('error', 'Berechtigung erforderlich.');
        return false;
      }
      state.fileHandle = handle;
      await idbSet(HANDLE_STORAGE_KEY, handle);
      state.autoState = 'active';
      state.autoMessage = '';
      state.lastModified = null;
      updateFileDisplay();
      await loadPalette('manual');
      return true;
    }

    function pickConfigFileFallback(){
      if(typeof document === 'undefined') return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.style.display = 'none';
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0] ? input.files[0] : null;
        if(file){
          await handleManualFile(file);
        }
        input.remove();
      });
      document.body.appendChild(input);
      input.click();
    }

    async function handleManualFile(file){
      if(!file) return;
      try{
        const text = await file.text();
        const data = JSON.parse(text);
        state.fileHandle = null;
        await idbDel(HANDLE_STORAGE_KEY);
        state.lastModified = typeof file.lastModified === 'number' ? file.lastModified : null;
        stopAutoUpdatePolling('manual');
        writeCachedPalette(data, file.name || 'Manuell geladen');
        const result = {
          data,
          source: 'Manuell geladen',
          path: file.name || 'Datei',
          lastModified: state.lastModified
        };
        applyPaletteResult(result);
        state.autoState = 'manual';
        state.autoMessage = '';
        updateFileDisplay();
      }catch(err){
        console.warn('[FarblayerViewer] Manuelle Datei konnte nicht gelesen werden:', err);
        stopAutoUpdatePolling('error', 'Datei konnte nicht gelesen werden.');
      }
    }

    async function pickConfigFile(){
      if(typeof window === 'undefined') return;
      if(typeof window.showOpenFilePicker === 'function'){
        try{
          const [handle] = await window.showOpenFilePicker({
            types: [{
              description: 'Farblayer-Konfiguration',
              accept: { 'application/json': ['.json'] }
            }],
            excludeAcceptAllOption: false,
            multiple: false
          });
          if(handle){
            await bindFileHandle(handle);
          }
        }catch(err){
          if(err && err.name === 'AbortError') return;
          console.warn('[FarblayerViewer] Dateiauswahl fehlgeschlagen:', err);
          stopAutoUpdatePolling('error', 'Datei konnte nicht ausgewählt werden.');
        }
      }else{
        pickConfigFileFallback();
      }
    }

    function handleAddGroup(){
      if(typeof window === 'undefined') return;
      const name = window.prompt('Name der neuen Gruppe:','');
      if(typeof name !== 'string') return;
      const trimmed = name.trim();
      if(!trimmed) return;
      if(state.groups.includes(trimmed)){
        flashStatus(`Gruppe "${trimmed}" existiert bereits.`, { temporary: true });
        return;
      }
      state.groups.push(trimmed);
      persistGroups();
      renderGroupZones();
      persistMapping();
      flashStatus(`Gruppe "${trimmed}" hinzugefügt.`, { temporary: true });
    }

    function handleRemoveGroup(){
      if(!state.groups.length){
        flashStatus('Keine Gruppen zum Entfernen vorhanden.', { temporary: true });
        return;
      }
      if(typeof window === 'undefined') return;
      const suggestion = state.groups[state.groups.length - 1];
      const input = window.prompt('Welche Gruppe soll entfernt werden?', suggestion || '');
      if(typeof input !== 'string') return;
      const name = input.trim();
      if(!name) return;
      if(!state.groups.includes(name)){
        flashStatus(`Gruppe "${name}" nicht gefunden.`, { temporary: true });
        return;
      }
      state.groups = state.groups.filter(group => group !== name);
      delete state.groupAssignments[name];
      renderGroupZones();
      persistGroups();
      persistMapping();
      flashStatus(`Gruppe "${name}" entfernt.`, { temporary: true });
    }

    renderGroupZones();

    if(refreshBtn){
      refreshBtn.addEventListener('click', () => { void loadPalette('manual'); });
    }
    if(filePickBtn){
      filePickBtn.addEventListener('click', pickConfigFile);
    }
    if(addGroupBtn){
      addGroupBtn.addEventListener('click', handleAddGroup);
    }
    if(removeGroupBtn){
      removeGroupBtn.addEventListener('click', handleRemoveGroup);
    }

    void (async () => {
      await restoreStoredHandle();
      await loadPalette();
      if(state.fileHandle){
        startAutoUpdatePolling();
      }else{
        updateFileDisplay();
      }
    })();
  };

})();
