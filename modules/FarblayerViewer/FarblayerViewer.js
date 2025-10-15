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
    .flv-surface{height:100%;display:flex;flex-direction:column;gap:.75rem;padding:.85rem;box-sizing:border-box;color:var(--text-color,#f8fafc);background:var(--module-bg,rgba(15,23,42,.6));border-radius:1.1rem;border:1px solid var(--module-border,rgba(255,255,255,.08));box-shadow:inset 0 1px 0 rgba(255,255,255,.04);}
    .flv-header{display:flex;justify-content:space-between;align-items:flex-start;gap:.75rem;flex-wrap:wrap;}
    .flv-actions{display:flex;align-items:flex-start;gap:1rem;flex-wrap:wrap;justify-content:flex-end;width:100%;}
    .flv-color-picker{display:flex;flex-direction:column;gap:.45rem;min-width:220px;}
    .flv-color-title{font-size:.78rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;opacity:.85;}
    .flv-color-grid{display:grid;gap:.45rem;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));}
    .flv-color-group{display:flex;flex-direction:column;gap:.35rem;font-size:.8rem;}
    .flv-color-group span{letter-spacing:.04em;text-transform:uppercase;opacity:.8;}
    .flv-select{min-width:0;width:100%;padding:.45rem .65rem;border-radius:.55rem;border:1px solid rgba(255,255,255,.16);background:rgba(15,23,42,.65);color:inherit;font-weight:600;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);transition:border-color .12s ease,box-shadow .12s ease;}
    .flv-select:focus{outline:none;border-color:rgba(255,255,255,.35);box-shadow:0 0 0 2px rgba(148,163,184,.25);}
    .flv-select:disabled{opacity:.5;cursor:not-allowed;}
    .flv-select option{color:#0f172a;}
    .flv-title{font-size:1.1rem;font-weight:700;letter-spacing:.015em;}
    .flv-meta{font-size:.82rem;opacity:.8;}
    .flv-status{min-height:1.1rem;font-size:.85rem;opacity:.9;}
    .flv-refresh{border:none;border-radius:.65rem;padding:.45rem .95rem;background:var(--module-button-bg,rgba(255,255,255,.14));color:inherit;font-weight:600;cursor:pointer;box-shadow:0 10px 24px rgba(15,23,42,.25);transition:transform .12s ease,box-shadow .12s ease,background-color .12s ease;}
    .flv-refresh:hover{background:var(--module-button-bg-hover,rgba(255,255,255,.2));}
    .flv-refresh:active{transform:scale(.97);box-shadow:0 6px 18px rgba(15,23,42,.3);}
    .flv-file{display:flex;flex-direction:column;gap:.35rem;min-width:220px;}
    .flv-file-label{font-size:.9rem;font-weight:600;}
    .flv-file-note{font-size:.78rem;opacity:.8;min-height:1rem;}
    .flv-file-controls{display:flex;gap:.5rem;flex-wrap:wrap;}
    .flv-file-btn{border:none;border-radius:.6rem;padding:.45rem .85rem;font-weight:600;cursor:pointer;background:rgba(255,255,255,.14);color:inherit;box-shadow:0 6px 16px rgba(15,23,42,.18);transition:transform .12s ease,box-shadow .12s ease,background-color .12s ease;}
    .flv-file-btn:hover{background:rgba(255,255,255,.22);}
    .flv-file-btn:active{transform:scale(.97);box-shadow:0 6px 16px rgba(15,23,42,.25);}
    .flv-list{flex:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.75rem;overflow:auto;padding:.15rem;}
    .flv-item{background:rgba(15,23,42,.45);border-radius:.95rem;padding:.75rem;display:flex;flex-direction:column;gap:.65rem;border:1px solid rgba(255,255,255,.06);box-shadow:0 12px 28px rgba(15,23,42,.35);}
    .flv-item-header{display:flex;flex-direction:column;gap:.25rem;}
    .flv-item-name{font-weight:700;font-size:1rem;letter-spacing:.01em;}
    .flv-item-group{font-size:.75rem;opacity:.75;text-transform:uppercase;letter-spacing:.08em;}
    .flv-preview{border-radius:.75rem;padding:.55rem .65rem;min-height:48px;display:flex;align-items:center;justify-content:center;font-weight:600;box-shadow:inset 0 1px 0 rgba(255,255,255,.16);border:2px solid transparent;text-align:center;transition:transform .12s ease;}
    .flv-preview:hover{transform:translateY(-1px);}
    .flv-values{display:flex;flex-direction:column;gap:.3rem;font-family:var(--mono-font,"JetBrains Mono",Menlo,Consolas,monospace);font-size:.78rem;line-height:1.3;word-break:break-all;}
    .flv-values div{display:flex;justify-content:space-between;gap:.5rem;}
    .flv-values span:first-child{opacity:.75;text-transform:uppercase;letter-spacing:.08em;}
    .flv-empty{margin-top:1.5rem;text-align:center;opacity:.75;font-size:.9rem;}
    .flv-error{color:#fecaca;}
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

  function renderItems(container, items){
    if(!container) return;
    container.innerHTML = '';
    if(!items.length){
      const empty = document.createElement('div');
      empty.className = 'flv-empty';
      empty.textContent = 'Keine Farblayer gefunden.';
      container.appendChild(empty);
      return;
    }
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'flv-item';

      const header = document.createElement('div');
      header.className = 'flv-item-header';
      const name = document.createElement('span');
      name.className = 'flv-item-name';
      name.textContent = item.name;
      header.appendChild(name);
      if(item.group){
        const group = document.createElement('span');
        group.className = 'flv-item-group';
        group.textContent = item.group;
        header.appendChild(group);
      }
      card.appendChild(header);

      const preview = document.createElement('div');
      preview.className = 'flv-preview';
      preview.style.background = item.background;
      preview.style.color = item.text;
      if(item.border){
        preview.style.borderColor = item.border;
      }
      preview.textContent = 'Beispieltext';
      card.appendChild(preview);

      const values = document.createElement('div');
      values.className = 'flv-values';

      const backgroundRow = document.createElement('div');
      const bgLabel = document.createElement('span');
      bgLabel.textContent = 'Hintergrund';
      const bgValue = document.createElement('span');
      bgValue.textContent = item.background;
      backgroundRow.appendChild(bgLabel);
      backgroundRow.appendChild(bgValue);
      values.appendChild(backgroundRow);

      if(item.text){
        const textRow = document.createElement('div');
        const textLabel = document.createElement('span');
        textLabel.textContent = 'Text';
        const textValue = document.createElement('span');
        textValue.textContent = item.text;
        textRow.appendChild(textLabel);
        textRow.appendChild(textValue);
        values.appendChild(textRow);
      }

      if(item.border){
        const borderRow = document.createElement('div');
        const borderLabel = document.createElement('span');
        borderLabel.textContent = 'Rahmen';
        const borderValue = document.createElement('span');
        borderValue.textContent = item.border;
        borderRow.appendChild(borderLabel);
        borderRow.appendChild(borderValue);
        values.appendChild(borderRow);
      }

      card.appendChild(values);
      container.appendChild(card);
    });
  }

  window.renderFarblayerViewer = function renderFarblayerViewer(root){
    if(!root) return;
    ensureStyles();
    root.classList.add('flv-root');
    root.innerHTML = `
      <div class="flv-surface">
        <div class="flv-header">
          <div>
            <div class="flv-title">Farblayer-Konfiguration</div>
            <div class="flv-meta" data-flv-meta>${CONFIG_PATH}</div>
          </div>
          <div class="flv-actions">
            <div class="flv-file">
              <div class="flv-file-label" data-flv-file-label>Keine Datei verbunden</div>
              <div class="flv-file-note" data-flv-file-note>Bitte Farblayer-Datei wählen.</div>
              <div class="flv-file-controls">
                <button class="flv-file-btn" type="button" data-flv-file-pick>Datei wählen</button>
                <button class="flv-refresh" type="button" data-flv-refresh>Aktualisieren</button>
              </div>
            </div>
            <div class="flv-color-picker">
              <div class="flv-color-title">Modulfarben</div>
              <div class="flv-color-grid">
                <label class="flv-color-group">
                  <span>Hintergrund</span>
                  <select class="flv-select" data-flv-color="background">
                    <option value="">Standard</option>
                  </select>
                </label>
                <label class="flv-color-group">
                  <span>Button</span>
                  <select class="flv-select" data-flv-color="button">
                    <option value="">Standard</option>
                  </select>
                </label>
                <label class="flv-color-group">
                  <span>Rahmen</span>
                  <select class="flv-select" data-flv-color="border">
                    <option value="">Standard</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="flv-status" data-flv-status>Farblayer werden geladen…</div>
        <div class="flv-list" data-flv-list></div>
      </div>
    `;

    const listEl = root.querySelector('[data-flv-list]');
    const statusEl = root.querySelector('[data-flv-status]');
    const refreshBtn = root.querySelector('[data-flv-refresh]');
    const metaEl = root.querySelector('[data-flv-meta]');
    const colorSelects = Array.from(root.querySelectorAll('[data-flv-color]'));
    const fileLabelEl = root.querySelector('[data-flv-file-label]');
    const fileNoteEl = root.querySelector('[data-flv-file-note]');
    const filePickBtn = root.querySelector('[data-flv-file-pick]');

    if(typeof root.__flvCleanup === 'function'){
      root.__flvCleanup();
    }

    const storedSelection = readStoredSelection();

    const state = {
      controller: null,
      disposed: false,
      items: [],
      lastSource: null,
      selectedColors: storedSelection || { background: '', button: '', border: '' },
      colorOptions: [],
      fileHandle: null,
      pollInterval: null,
      pollInProgress: false,
      lastModified: null,
      autoState: 'idle',
      autoMessage: ''
    };
    root.__flvCleanup = () => {
      state.disposed = true;
      if(state.controller){
        try{ state.controller.abort(); } catch{}
        state.controller = null;
      }
      if(state.pollInterval){
        clearInterval(state.pollInterval);
        state.pollInterval = null;
      }
    };

    applySelectedColors();

    function readStoredSelection(){
      try{
        const raw = localStorage.getItem(COLOR_SELECTION_KEY);
        if(!raw) return null;
        const parsed = JSON.parse(raw);
        if(parsed && typeof parsed === 'object'){
          const next = { background: '', button: '', border: '' };
          ['background','button','border'].forEach(area => {
            if(typeof parsed[area] === 'string' && parsed[area].trim()){
              next[area] = parsed[area].trim();
            }
          });
          return next;
        }
      }catch{}
      return null;
    }

    function persistSelectedColors(){
      try{
        localStorage.setItem(COLOR_SELECTION_KEY, JSON.stringify(state.selectedColors));
      }catch{}
    }

    function collectColorOptions(items){
      const entries = [];
      const seen = new Set();
      const propLabel = {
        background: 'Hintergrund',
        text: 'Text',
        border: 'Rahmen'
      };
      items.forEach(item => {
        const baseLabel = typeof item?.name === 'string' && item.name.trim()
          ? item.name.trim()
          : (typeof item?.rawName === 'string' && item.rawName.trim() ? item.rawName.trim() : 'Layer');
        ['background','text','border'].forEach(key => {
          const value = typeof item[key] === 'string' ? item[key].trim() : '';
          if(!value) return;
          const signature = `${key}|${value}|${baseLabel}`;
          if(seen.has(signature)) return;
          seen.add(signature);
          entries.push({
            value,
            label: baseLabel,
            property: key,
            propertyLabel: propLabel[key] || key
          });
        });
      });

      const labelCounts = entries.reduce((acc, entry) => {
        const key = entry.label;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, Object.create(null));

      return entries.map(entry => {
        const duplicate = labelCounts[entry.label] > 1;
        const text = duplicate ? `${entry.label} – ${entry.propertyLabel}` : entry.label;
        return {
          value: entry.value,
          label: text,
          property: entry.property
        };
      });
    }

    function updateSelectVisual(select, value){
      if(!select) return;
      if(value){
        select.style.background = value;
        const lightness = parseLightness(value);
        select.style.color = lightness != null && lightness < 55 ? '#f8fafc' : '#0f172a';
      }else{
        select.style.background = '';
        select.style.color = '';
      }
    }

    function populateColorSelectors(items, allowOptions){
      const options = allowOptions ? collectColorOptions(items) : [];
      const shouldClearSelection = !allowOptions;
      const storedSelection = allowOptions ? readStoredSelection() : null;
      state.colorOptions = options;
      const hasOptions = options.length > 0;
      colorSelects.forEach(select => {
        const area = select?.dataset?.flvColor;
        const current = typeof state.selectedColors[area] === 'string' ? state.selectedColors[area] : '';
        const stored = storedSelection && typeof storedSelection[area] === 'string'
          ? storedSelection[area]
          : '';
        const fragment = document.createDocumentFragment();
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Standard';
        fragment.appendChild(defaultOption);
        options.forEach(optionData => {
          const color = optionData.value;
          const text = optionData.label;
          const option = document.createElement('option');
          option.value = color;
          option.textContent = text;
          option.style.backgroundColor = color;
          option.style.color = '#0f172a';
          fragment.appendChild(option);
        });
        select.innerHTML = '';
        select.appendChild(fragment);
        const hasCurrent = hasOptions && state.colorOptions.some(entry => entry.value === current);
        const hasStored = hasOptions && state.colorOptions.some(entry => entry.value === stored);
        if(hasCurrent){
          select.value = current;
        }else if(hasStored){
          select.value = stored;
          state.selectedColors[area] = stored;
        }else if(hasOptions){
          select.value = '';
          state.selectedColors[area] = '';
        }else{
          select.value = '';
          if(shouldClearSelection){
            state.selectedColors[area] = '';
          }
        }
        updateSelectVisual(select, hasOptions ? select.value : '');
        select.disabled = !hasOptions;
      });
      if(hasOptions){
        persistSelectedColors();
      }
    }

    function applySelectedColors(){
      const surface = root.querySelector('.flv-surface');
      if(!surface) return;
      const bg = state.selectedColors.background;
      const button = state.selectedColors.button;
      const border = state.selectedColors.border;
      if(bg){
        surface.style.setProperty('--module-bg', bg);
      }else{
        surface.style.removeProperty('--module-bg');
      }
      if(button){
        surface.style.setProperty('--module-button-bg', button);
        surface.style.setProperty('--module-button-bg-hover', button);
      }else{
        surface.style.removeProperty('--module-button-bg');
        surface.style.removeProperty('--module-button-bg-hover');
      }
      if(border){
        surface.style.setProperty('--module-border', border);
      }else{
        surface.style.removeProperty('--module-border');
      }
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

    function applyPaletteResult(result){
      if(!result) return;
      const flattened = flattenPalette(result.data);
      const allowColorOptions = result.source !== 'Standardwerte (Fallback)';
      state.items = allowColorOptions ? flattened : [];
      state.lastSource = result.source;
      state.lastModified = result.lastModified != null ? result.lastModified : state.lastModified;
      populateColorSelectors(state.items, allowColorOptions && state.items.length > 0);
      applySelectedColors();
      renderItems(listEl, state.items);
      updateStatusMessage(result.source, state.items.length);
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
        try{ state.controller.abort(); } catch{}
      }
      const controller = new AbortController();
      state.controller = controller;
      if(statusEl){
        statusEl.textContent = reason === 'manual' ? 'Aktualisiere Farblayer…' : 'Farblayer werden geladen…';
      }
      if(listEl){
        listEl.innerHTML = '';
      }
      colorSelects.forEach(select => {
        select.disabled = true;
      });
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
        colorSelects.forEach(select => {
          select.disabled = state.colorOptions.length === 0;
        });
        if(state.fileHandle){
          state.autoState = 'active';
          state.autoMessage = '';
        }
        updateFileDisplay();
      }catch(err){
        if(state.disposed || controller.signal.aborted) return;
        console.warn('[FarblayerViewer] Konnte Farblayer nicht laden:', err);
        state.items = [];
        renderItems(listEl, []);
        populateColorSelectors([], false);
        if(statusEl){
          statusEl.textContent = 'Farblayer konnten nicht geladen werden.';
        }
        if(metaEl){
          metaEl.textContent = `${CONFIG_PATH} • Keine Daten`;
          metaEl.removeAttribute('title');
        }
        colorSelects.forEach(select => {
          select.disabled = true;
        });
      }
    }

    function handleColorChange(event){
      const select = event?.currentTarget || event?.target;
      if(!select) return;
      const area = select.dataset ? select.dataset.flvColor : null;
      if(!area) return;
      const value = typeof select.value === 'string' ? select.value : '';
      state.selectedColors[area] = value;
      persistSelectedColors();
      updateSelectVisual(select, value);
      applySelectedColors();
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
      if(typeof window === 'undefined'){ return; }
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

    if(refreshBtn){
      refreshBtn.addEventListener('click', () => loadPalette('manual'));
    }

    colorSelects.forEach(select => {
      select.addEventListener('change', handleColorChange);
      updateSelectVisual(select, select.value || state.selectedColors[select.dataset?.flvColor] || '');
    });

    if(filePickBtn){
      filePickBtn.addEventListener('click', pickConfigFile);
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
