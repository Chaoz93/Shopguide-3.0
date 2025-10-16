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
    .flv-surface{height:100%;display:flex;flex-direction:column;gap:.75rem;padding:.85rem;box-sizing:border-box;color:var(--text-color,#f8fafc);background:var(--module-bg,rgba(15,23,42,.6));border-radius:1.1rem;border:1px solid var(--module-border,rgba(255,255,255,.08));box-shadow:inset 0 1px 0 rgba(255,255,255,.04);}
    .flv-header{display:flex;justify-content:space-between;align-items:flex-start;gap:.75rem;flex-wrap:wrap;padding:.85rem;border-radius:.9rem;background:var(--module-header-bg,transparent);border:1px solid var(--module-header-border,rgba(255,255,255,.08));color:var(--module-header-text,inherit);backdrop-filter:blur(2px);}
    .flv-actions{display:flex;align-items:flex-start;gap:1rem;flex-wrap:wrap;justify-content:flex-end;width:100%;}
    .flv-color-picker{display:flex;flex-direction:column;gap:.6rem;min-width:260px;}
    .flv-color-title{font-size:.78rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;opacity:.85;}
    .flv-scheme-group{display:flex;flex-direction:column;gap:.75rem;}
    .flv-scheme-field{position:relative;padding:.85rem .85rem 1rem;border-radius:.9rem;border:1px solid rgba(255,255,255,.16);background:rgba(15,23,42,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.08);display:flex;flex-direction:column;gap:.6rem;}
    .flv-scheme-heading{font-size:.82rem;font-weight:600;letter-spacing:.02em;opacity:.88;text-transform:uppercase;}
    .flv-scheme-sample{display:flex;justify-content:center;}
    .flv-sample-button{min-height:40px;min-width:180px;max-width:100%;padding:.45rem 1rem;border-radius:.7rem;border:2px solid rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;font-weight:600;letter-spacing:.01em;box-shadow:0 6px 18px rgba(15,23,42,.35);transition:transform .12s ease,box-shadow .12s ease;background:rgba(15,23,42,.55);color:inherit;text-align:center;cursor:pointer;user-select:none;}
    .flv-sample-button:hover{transform:translateY(-1px);}
    .flv-sample-button[data-empty="true"]{border-style:dashed;border-color:rgba(148,163,184,.45);background:rgba(148,163,184,.12);box-shadow:none;color:rgba(248,250,252,.8);}
    .flv-sample-button-text{pointer-events:none;}
    .flv-sample-values{display:flex;flex-direction:column;gap:.3rem;font-family:var(--mono-font,"JetBrains Mono",Menlo,Consolas,monospace);font-size:.72rem;line-height:1.3;word-break:break-all;}
    .flv-sample-values div{display:flex;justify-content:space-between;gap:.5rem;}
    .flv-sample-values span:first-child{opacity:.72;text-transform:uppercase;letter-spacing:.08em;font-size:.66rem;}
    .flv-scheme-field[data-empty="true"] .flv-sample-values{opacity:.65;}
    .flv-scheme-field[data-disabled="true"]{opacity:.6;cursor:not-allowed;}
    .flv-dropdown{position:relative;display:flex;flex-direction:column;gap:.4rem;}
    .flv-dropdown-toggle{display:flex;justify-content:space-between;align-items:center;gap:.75rem;padding:.45rem .75rem;border-radius:.65rem;border:1px solid rgba(255,255,255,.16);background:rgba(15,23,42,.65);color:inherit;font-weight:600;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);transition:border-color .12s ease,box-shadow .12s ease,background .12s ease;}
    .flv-dropdown-toggle::after{content:'';flex:0 0 auto;width:.65rem;height:.65rem;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);opacity:.75;transition:transform .12s ease;}
    .flv-dropdown[data-open="true"] .flv-dropdown-toggle::after{transform:rotate(-135deg);}
    .flv-dropdown-toggle:focus-visible{outline:2px solid rgba(148,163,184,.55);outline-offset:2px;}
    .flv-dropdown-toggle[disabled]{opacity:.5;cursor:not-allowed;}
    .flv-dropdown-toggle[data-empty="true"]{color:rgba(226,232,240,.85);}
    .flv-dropdown-menu{position:absolute;top:calc(100% + .4rem);left:0;right:0;display:none;flex-direction:column;gap:.35rem;padding:.6rem;border-radius:.8rem;background:rgba(15,23,42,.92);border:1px solid rgba(255,255,255,.12);box-shadow:0 16px 32px rgba(15,23,42,.45);max-height:280px;overflow:auto;z-index:5;backdrop-filter:blur(12px);}
    .flv-dropdown[data-open="true"] .flv-dropdown-menu{display:flex;}
    .flv-dropdown-option{display:flex;flex-direction:column;gap:.45rem;padding:.6rem;border-radius:.65rem;border:1px solid rgba(255,255,255,.08);background:rgba(15,23,42,.68);color:inherit;font-weight:500;text-align:left;cursor:pointer;transition:border-color .12s ease,background .12s ease,transform .12s ease;}
    .flv-dropdown-option:hover{border-color:rgba(148,163,184,.45);background:rgba(30,41,59,.88);transform:translateY(-1px);}
    .flv-dropdown-option[data-selected="true"]{border-color:rgba(94,234,212,.55);box-shadow:0 0 0 1px rgba(94,234,212,.4);}
    .flv-dropdown-option:focus-visible{outline:2px solid rgba(148,163,184,.55);outline-offset:2px;}
    .flv-dropdown-option-preview{display:flex;justify-content:center;}
    .flv-dropdown-option-button{min-width:160px;padding:.4rem .9rem;border-radius:.6rem;border:2px solid rgba(255,255,255,.16);box-shadow:0 6px 16px rgba(15,23,42,.35);display:flex;justify-content:center;align-items:center;font-weight:600;}
    .flv-dropdown-option-button[data-empty="true"]{border-style:dashed;border-color:rgba(148,163,184,.45);background:rgba(148,163,184,.12);box-shadow:none;color:rgba(248,250,252,.8);}
    .flv-dropdown-option-button-text{pointer-events:none;}
    .flv-dropdown-option-details{display:flex;flex-direction:column;gap:.25rem;font-size:.76rem;line-height:1.35;}
    .flv-dropdown-option-name{font-weight:600;font-size:.82rem;letter-spacing:.01em;}
    .flv-dropdown-option-values{display:flex;flex-wrap:wrap;gap:.35rem;opacity:.82;font-family:var(--mono-font,"JetBrains Mono",Menlo,Consolas,monospace);font-size:.7rem;}
    .flv-title{font-size:1.1rem;font-weight:700;letter-spacing:.015em;}
    .flv-meta{font-size:.82rem;opacity:.8;}
    .flv-status{min-height:1.1rem;font-size:.85rem;opacity:.9;}
    .flv-refresh{border:1px solid var(--module-button-border,rgba(255,255,255,.16));border-radius:.65rem;padding:.45rem .95rem;background:var(--module-button-bg,rgba(255,255,255,.14));color:var(--module-button-text,inherit);font-weight:600;cursor:pointer;box-shadow:0 10px 24px rgba(15,23,42,.25);transition:transform .12s ease,box-shadow .12s ease,background-color .12s ease,border-color .12s ease;}
    .flv-refresh:hover{background:var(--module-button-bg-hover,rgba(255,255,255,.2));}
    .flv-refresh:active{transform:scale(.97);box-shadow:0 6px 18px rgba(15,23,42,.3);}
    .flv-file{display:flex;flex-direction:column;gap:.35rem;min-width:220px;}
    .flv-file-label{font-size:.9rem;font-weight:600;}
    .flv-file-note{font-size:.78rem;opacity:.8;min-height:1rem;}
    .flv-file-controls{display:flex;gap:.5rem;flex-wrap:wrap;}
    .flv-file-btn{border:1px solid var(--module-button-border,rgba(255,255,255,.16));border-radius:.6rem;padding:.45rem .85rem;font-weight:600;cursor:pointer;background:var(--module-button-bg,rgba(255,255,255,.14));color:var(--module-button-text,inherit);box-shadow:0 6px 16px rgba(15,23,42,.18);transition:transform .12s ease,box-shadow .12s ease,background-color .12s ease,border-color .12s ease;}
    .flv-file-btn:hover{background:var(--module-button-bg-hover,rgba(255,255,255,.22));}
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
    const colorPickerMarkup = COLOR_CATEGORIES.map(category => `
              <div class="flv-scheme-field" data-flv-schema-field="${category.key}" data-empty="true">
                <div class="flv-scheme-heading">${category.label}</div>
                <div class="flv-dropdown" data-flv-dropdown="${category.key}">
                  <button type="button" class="flv-dropdown-toggle" data-flv-dropdown-toggle="${category.key}" aria-haspopup="listbox" aria-expanded="false" aria-controls="flv-dropdown-menu-${category.key}" data-empty="true">
                    <span data-flv-dropdown-label="${category.key}">Standard</span>
                  </button>
                  <div class="flv-dropdown-menu" role="listbox" id="flv-dropdown-menu-${category.key}" data-flv-dropdown-menu="${category.key}" aria-hidden="true"></div>
                </div>
                <div class="flv-scheme-sample">
                  <div class="flv-sample-button" data-flv-preview="${category.key}" data-empty="true">
                    <span class="flv-sample-button-text" data-flv-preview-text="${category.key}">${category.label}</span>
                  </div>
                </div>
                <div class="flv-sample-values">
                  <div><span>Hauptfarbe</span><span data-flv-value-background="${category.key}">—</span></div>
                  <div><span>Textfarbe</span><span data-flv-value-text="${category.key}">—</span></div>
                  <div><span>Rahmenfarbe</span><span data-flv-value-border="${category.key}">—</span></div>
                </div>
              </div>
    `).join('');
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
              <div class="flv-scheme-group">
                ${colorPickerMarkup}
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
    const categoryRefs = COLOR_CATEGORIES.map(category => ({
      key: category.key,
      label: category.label,
      field: root.querySelector(`[data-flv-schema-field="${category.key}"]`),
      dropdown: {
        container: root.querySelector(`[data-flv-dropdown="${category.key}"]`),
        toggle: root.querySelector(`[data-flv-dropdown-toggle="${category.key}"]`),
        menu: root.querySelector(`[data-flv-dropdown-menu="${category.key}"]`),
        labelEl: root.querySelector(`[data-flv-dropdown-label="${category.key}"]`),
        options: [],
        selectedOption: null
      },
      preview: root.querySelector(`[data-flv-preview="${category.key}"]`),
      previewText: root.querySelector(`[data-flv-preview-text="${category.key}"]`),
      values: {
        background: root.querySelector(`[data-flv-value-background="${category.key}"]`),
        text: root.querySelector(`[data-flv-value-text="${category.key}"]`),
        border: root.querySelector(`[data-flv-value-border="${category.key}"]`)
      }
    }));
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
      selectedColors: storedSelection || createEmptySelection(),
      colorOptions: [],
      fileHandle: null,
      pollInterval: null,
      pollInProgress: false,
      lastModified: null,
      autoState: 'idle',
      autoMessage: '',
      openDropdownKey: null,
      documentClickHandler: null,
      documentKeyHandler: null
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
      if(typeof document !== 'undefined'){
        if(state.documentClickHandler){
          document.removeEventListener('click', state.documentClickHandler);
          state.documentClickHandler = null;
        }
        if(state.documentKeyHandler){
          document.removeEventListener('keydown', state.documentKeyHandler);
          state.documentKeyHandler = null;
        }
      }
      state.openDropdownKey = null;
    };

    applySelectedColors();

    function createEmptySelection(){
      const base = {};
      COLOR_CATEGORIES.forEach(category => {
        base[category.key] = { background: '', text: '', border: '', name: '' };
      });
      return base;
    }

    function normalizeSelectionValue(value){
      if(!value || typeof value !== 'object'){
        return { background: '', text: '', border: '', name: '' };
      }
      const background = typeof value.background === 'string' && value.background.trim() ? value.background.trim() : '';
      const rawText = typeof value.text === 'string' && value.text.trim()
        ? value.text.trim()
        : (typeof value.button === 'string' && value.button.trim() ? value.button.trim() : '');
      const text = rawText;
      const border = typeof value.border === 'string' && value.border.trim() ? value.border.trim() : '';
      const name = typeof value.name === 'string' && value.name.trim() ? value.name.trim() : '';
      return { background, text, border, name };
    }

    function normalizeSelections(input){
      const normalized = createEmptySelection();
      if(!input || typeof input !== 'object'){
        return normalized;
      }
      COLOR_CATEGORIES.forEach(category => {
        normalized[category.key] = normalizeSelectionValue(input[category.key]);
      });
      return normalized;
    }

    function readStoredSelection(){
      try{
        const raw = localStorage.getItem(COLOR_SELECTION_KEY);
        if(!raw) return null;
        const parsed = JSON.parse(raw);
        if(!parsed || typeof parsed !== 'object'){
          return null;
        }
        const hasCategoryEntries = COLOR_CATEGORIES.some(category => parsed && typeof parsed[category.key] === 'object');
        if(hasCategoryEntries){
          return normalizeSelections(parsed);
        }
        const fallback = normalizeSelectionValue(parsed);
        if(fallback.background || fallback.text || fallback.border){
          const next = createEmptySelection();
          next.background = fallback;
          return next;
        }
      }catch{}
      return null;
    }

    function persistSelectedColors(){
      try{
        localStorage.setItem(COLOR_SELECTION_KEY, JSON.stringify(normalizeSelections(state.selectedColors)));
      }catch{}
    }

    function createSchemeKey(colors){
      const normalized = normalizeSelectionValue(colors);
      if(!normalized.background && !normalized.text && !normalized.border){
        return '';
      }
      return `${normalized.background}|${normalized.text}|${normalized.border}`;
    }

    function getOptionColors(option){
      if(!option){
        return normalizeSelectionValue(null);
      }
      const dataset = option.dataset || {};
      return normalizeSelectionValue({
        background: dataset.background,
        text: dataset.text,
        border: dataset.border,
        name: dataset.name || option.textContent || ''
      });
    }

    function ensureDropdownEventBindings(){
      if(typeof document === 'undefined'){ return; }
      if(state.documentClickHandler){
        return;
      }
      const handleDocumentClick = event => {
        const target = event.target;
        const inside = categoryRefs.some(ref => {
          const dropdown = ref?.dropdown;
          return dropdown?.container ? dropdown.container.contains(target) : false;
        });
        if(!inside){
          closeAllDropdowns();
        }
      };
      const handleDocumentKeydown = event => {
        if(event.key === 'Escape'){
          closeAllDropdowns();
        }
      };
      state.documentClickHandler = handleDocumentClick;
      state.documentKeyHandler = handleDocumentKeydown;
      document.addEventListener('click', handleDocumentClick);
      document.addEventListener('keydown', handleDocumentKeydown);
    }

    function closeDropdown(ref){
      const dropdown = ref?.dropdown;
      if(!dropdown || !dropdown.container){
        return;
      }
      dropdown.container.dataset.open = 'false';
      if(dropdown.toggle){
        dropdown.toggle.setAttribute('aria-expanded', 'false');
      }
      if(dropdown.menu){
        dropdown.menu.setAttribute('aria-hidden', 'true');
      }
      if(state.openDropdownKey === ref.key){
        state.openDropdownKey = null;
      }
    }

    function closeAllDropdowns(exceptRef){
      categoryRefs.forEach(ref => {
        if(exceptRef && ref === exceptRef){
          return;
        }
        closeDropdown(ref);
      });
    }

    function openDropdown(ref){
      const dropdown = ref?.dropdown;
      if(!dropdown || !dropdown.container || (dropdown.toggle && dropdown.toggle.disabled)){
        return;
      }
      ensureDropdownEventBindings();
      closeAllDropdowns(ref);
      dropdown.container.dataset.open = 'true';
      if(dropdown.toggle){
        dropdown.toggle.setAttribute('aria-expanded', 'true');
      }
      if(dropdown.menu){
        dropdown.menu.setAttribute('aria-hidden', 'false');
      }
      state.openDropdownKey = ref.key;
    }

    function toggleDropdown(ref){
      const dropdown = ref?.dropdown;
      if(!dropdown || !dropdown.container || (dropdown.toggle && dropdown.toggle.disabled)){
        return;
      }
      const isOpen = dropdown.container.dataset.open === 'true';
      if(isOpen){
        closeDropdown(ref);
      }else{
        openDropdown(ref);
      }
    }

    function isDropdownOpen(ref){
      const dropdown = ref?.dropdown;
      return !!(dropdown?.container && dropdown.container.dataset.open === 'true');
    }

    function focusDropdownSelection(ref){
      const dropdown = ref?.dropdown;
      if(!dropdown){
        return;
      }
      const target = dropdown.selectedOption || (dropdown.options && dropdown.options[0]) || null;
      if(target){
        target.focus();
      }
    }

    function updateDropdownSelectionState(ref){
      const dropdown = ref?.dropdown;
      if(!dropdown){
        return;
      }
      const options = dropdown.options || [];
      const selected = dropdown.selectedOption || null;
      options.forEach(option => {
        const isSelected = option === selected;
        option.dataset.selected = isSelected ? 'true' : 'false';
        option.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
    }

    function createDropdownOptionElement(ref, optionData, { isDefault = false } = {}){
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'flv-dropdown-option';
      option.setAttribute('role', 'option');
      option.tabIndex = -1;
      option.dataset.value = optionData.value || '';
      option.dataset.background = optionData.background || '';
      option.dataset.text = optionData.text || '';
      option.dataset.border = optionData.border || '';
      option.dataset.name = optionData.name || optionData.label || '';
      option.dataset.label = optionData.label || optionData.name || '';
      if(isDefault){
        option.dataset.default = 'true';
      }

      const previewWrapper = document.createElement('div');
      previewWrapper.className = 'flv-dropdown-option-preview';
      const previewButton = document.createElement('div');
      previewButton.className = 'flv-dropdown-option-button';
      if(optionData.background){
        previewButton.style.background = optionData.background;
      }
      if(optionData.border){
        previewButton.style.borderColor = optionData.border;
      }
      if(optionData.text){
        previewButton.style.color = optionData.text;
      }
      if(!optionData.background && !optionData.text && !optionData.border){
        previewButton.dataset.empty = 'true';
      }
      const previewText = document.createElement('span');
      previewText.className = 'flv-dropdown-option-button-text';
      previewText.textContent = optionData.name || optionData.label || ref.label;
      previewButton.appendChild(previewText);
      previewWrapper.appendChild(previewButton);
      option.appendChild(previewWrapper);

      const details = document.createElement('div');
      details.className = 'flv-dropdown-option-details';
      const nameRow = document.createElement('div');
      nameRow.className = 'flv-dropdown-option-name';
      nameRow.textContent = optionData.label || optionData.name || ref.label;
      details.appendChild(nameRow);
      const valuesRow = document.createElement('div');
      valuesRow.className = 'flv-dropdown-option-values';
      const valueEntries = [];
      if(optionData.background){
        valueEntries.push(`Hauptfarbe: ${optionData.background}`);
      }
      if(optionData.text){
        valueEntries.push(`Textfarbe: ${optionData.text}`);
      }
      if(optionData.border){
        valueEntries.push(`Rahmenfarbe: ${optionData.border}`);
      }
      if(valueEntries.length === 0){
        const span = document.createElement('span');
        span.textContent = 'Standardfarben verwenden';
        valuesRow.appendChild(span);
      }else{
        valueEntries.forEach(entry => {
          const span = document.createElement('span');
          span.textContent = entry;
          valuesRow.appendChild(span);
        });
      }
      details.appendChild(valuesRow);
      option.appendChild(details);

      option.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        handleDropdownSelection(ref, option);
      });

      option.addEventListener('keydown', event => {
        const dropdown = ref.dropdown;
        if(!dropdown){
          return;
        }
        if(event.key === 'ArrowDown' || event.key === 'ArrowUp'){
          event.preventDefault();
          const options = dropdown.options || [];
          const currentIndex = options.indexOf(option);
          if(currentIndex >= 0){
            const delta = event.key === 'ArrowDown' ? 1 : -1;
            let nextIndex = currentIndex + delta;
            if(nextIndex < 0){
              nextIndex = options.length - 1;
            }else if(nextIndex >= options.length){
              nextIndex = 0;
            }
            const nextOption = options[nextIndex];
            if(nextOption){
              nextOption.focus();
            }
          }
        }else if(event.key === 'Home'){
          event.preventDefault();
          const first = (dropdown.options && dropdown.options[0]) || null;
          if(first){
            first.focus();
          }
        }else if(event.key === 'End'){
          event.preventDefault();
          const options = dropdown.options || [];
          const last = options[options.length - 1];
          if(last){
            last.focus();
          }
        }else if(event.key === 'Escape'){
          event.preventDefault();
          closeDropdown(ref);
          if(dropdown.toggle){
            dropdown.toggle.focus();
          }
        }else if(event.key === 'Tab'){
          closeDropdown(ref);
        }
      });

      return option;
    }

    function handleDropdownSelection(ref, option){
      if(!ref || !option){
        return;
      }
      const dropdown = ref.dropdown;
      if(!dropdown){
        return;
      }
      dropdown.selectedOption = option;
      updateDropdownSelectionState(ref);
      const colors = getOptionColors(option);
      const updated = updateCategoryField(ref, colors);
      state.selectedColors[ref.key] = updated;
      persistSelectedColors();
      applySelectedColors();
      closeDropdown(ref);
      if(dropdown.toggle){
        dropdown.toggle.focus();
      }
    }

    function setCategoryDisabled(ref, disabled){
      if(ref && ref.field){
        ref.field.dataset.disabled = disabled ? 'true' : 'false';
      }
      const dropdown = ref?.dropdown;
      if(dropdown){
        if(dropdown.toggle){
          dropdown.toggle.disabled = !!disabled;
          dropdown.toggle.setAttribute('aria-expanded', 'false');
        }
        if(dropdown.container){
          dropdown.container.dataset.open = 'false';
        }
        if(dropdown.menu){
          dropdown.menu.setAttribute('aria-hidden', 'true');
        }
      }
      if(disabled){
        closeDropdown(ref);
      }
    }

    function collectColorOptions(items){
      const entries = [];
      const seen = new Set();
      items.forEach(item => {
        const baseLabel = typeof item?.name === 'string' && item.name.trim()
          ? item.name.trim()
          : (typeof item?.rawName === 'string' && item.rawName.trim() ? item.rawName.trim() : 'Layer');
        const background = typeof item?.background === 'string' ? item.background.trim() : '';
        const text = typeof item?.text === 'string' ? item.text.trim() : '';
        const border = typeof item?.border === 'string' ? item.border.trim() : '';
        if(!background && !text && !border){
          return;
        }
        const key = `${background}|${text}|${border}|${baseLabel}`;
        if(seen.has(key)){
          return;
        }
        seen.add(key);
        entries.push({
          item,
          label: baseLabel,
          background,
          text,
          border
        });
      });

      const labelCounts = entries.reduce((acc, entry) => {
        const key = entry.label;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, Object.create(null));

      return entries.map(entry => {
        const normalized = normalizeSelectionValue({
          background: entry.background,
          text: entry.text,
          border: entry.border,
          name: entry.item && typeof entry.item.name === 'string' && entry.item.name.trim()
            ? entry.item.name.trim()
            : entry.label
        });
        const duplicate = labelCounts[entry.label] > 1;
        const detail = [normalized.background, normalized.text, normalized.border].filter(Boolean).join(' • ');
        const displayLabel = duplicate && detail ? `${entry.label} – ${detail}` : entry.label;
        return {
          value: createSchemeKey(normalized),
          label: displayLabel,
          background: normalized.background,
          text: normalized.text,
          border: normalized.border,
          name: normalized.name || entry.label
        };
      });
    }

    function updateCategoryField(ref, overrideColors){
      if(!ref){
        return normalizeSelectionValue(null);
      }
      const dropdown = ref.dropdown;
      const option = dropdown ? dropdown.selectedOption : null;
      const normalizedOverride = normalizeSelectionValue(overrideColors);
      const hasOverride = !!createSchemeKey(normalizedOverride);
      const optionValue = option && option.dataset ? option.dataset.value || '' : '';
      const colors = hasOverride
        ? normalizedOverride
        : (optionValue ? getOptionColors(option) : normalizeSelectionValue(null));
      const hasValue = hasOverride || !!optionValue;
      if(ref.field){
        ref.field.dataset.empty = hasValue ? 'false' : 'true';
      }
      if(ref.preview){
        ref.preview.dataset.empty = hasValue ? 'false' : 'true';
        if(colors.background){
          ref.preview.style.background = colors.background;
        }else{
          ref.preview.style.removeProperty('background');
        }
        if(colors.border){
          ref.preview.style.borderColor = colors.border;
        }else{
          ref.preview.style.removeProperty('border-color');
        }
        if(colors.text){
          ref.preview.style.color = colors.text;
        }else{
          ref.preview.style.removeProperty('color');
        }
      }
      const optionName = option ? (option.dataset?.name || option.textContent || '') : '';
      const displayName = hasValue
        ? (normalizedOverride.name || optionName || ref.label)
        : '';
      if(ref.previewText){
        ref.previewText.textContent = displayName || `Standard ${ref.label}`;
      }
      if(dropdown){
        if(dropdown.labelEl){
          dropdown.labelEl.textContent = displayName || 'Standard';
        }
        if(dropdown.toggle){
          dropdown.toggle.dataset.empty = hasValue ? 'false' : 'true';
        }
      }
      if(ref.values){
        if(ref.values.background){
          ref.values.background.textContent = colors.background || '—';
        }
        if(ref.values.text){
          ref.values.text.textContent = colors.text || '—';
        }
        if(ref.values.border){
          ref.values.border.textContent = colors.border || '—';
        }
      }
      return normalizeSelectionValue({
        ...colors,
        name: hasValue ? (displayName || ref.label) : ''
      });
    }

    function populateColorSelectors(items, allowOptions){
      const options = allowOptions ? collectColorOptions(items) : [];
      state.colorOptions = options;
      const storedSelection = allowOptions ? readStoredSelection() : null;
      if(storedSelection){
        state.selectedColors = storedSelection;
      }else{
        state.selectedColors = normalizeSelections(state.selectedColors);
      }
      categoryRefs.forEach(ref => {
        const dropdown = ref.dropdown;
        if(!dropdown || !dropdown.menu || !dropdown.toggle){
          return;
        }
        dropdown.menu.innerHTML = '';
        dropdown.options = [];
        dropdown.selectedOption = null;
        const previousKey = createSchemeKey(state.selectedColors[ref.key]);
        const defaultOption = createDropdownOptionElement(ref, {
          value: '',
          label: 'Standard',
          name: `Standard ${ref.label}`,
          background: '',
          text: '',
          border: ''
        }, { isDefault: true });
        dropdown.menu.appendChild(defaultOption);
        dropdown.options.push(defaultOption);
        let matchedOption = null;
        options.forEach(optionData => {
          const option = createDropdownOptionElement(ref, optionData);
          dropdown.menu.appendChild(option);
          dropdown.options.push(option);
          if(!matchedOption && optionData.value === previousKey){
            matchedOption = option;
          }
        });
        const hasOptions = allowOptions && options.length > 0;
        setCategoryDisabled(ref, !hasOptions);
        let override = normalizeSelectionValue(state.selectedColors[ref.key]);
        if(hasOptions && matchedOption){
          dropdown.selectedOption = matchedOption;
        }else{
          dropdown.selectedOption = defaultOption;
          if(hasOptions){
            override = normalizeSelectionValue(null);
          }
        }
        const updated = updateCategoryField(ref, override);
        state.selectedColors[ref.key] = updated;
        updateDropdownSelectionState(ref);
      });
      persistSelectedColors();
    }

    function applySelectedColors(){
      const surface = root.querySelector('.flv-surface');
      if(!surface) return;
      const selections = normalizeSelections(state.selectedColors);
      const backgroundSelection = normalizeSelectionValue(selections.background);
      const headerSelection = normalizeSelectionValue(selections.header);
      const buttonSelection = normalizeSelectionValue(selections.buttons);

      const bg = backgroundSelection.background;
      const text = backgroundSelection.text;
      const border = backgroundSelection.border;

      if(bg){
        surface.style.setProperty('--module-bg', bg);
      }else{
        surface.style.removeProperty('--module-bg');
      }
      if(text){
        surface.style.setProperty('--text-color', text);
      }else{
        surface.style.removeProperty('--text-color');
      }
      if(border){
        surface.style.setProperty('--module-border', border);
      }else{
        surface.style.removeProperty('--module-border');
      }

      if(headerSelection.background){
        surface.style.setProperty('--module-header-bg', headerSelection.background);
      }else{
        surface.style.removeProperty('--module-header-bg');
      }
      const headerText = headerSelection.text || text;
      if(headerText){
        surface.style.setProperty('--module-header-text', headerText);
      }else{
        surface.style.removeProperty('--module-header-text');
      }
      if(headerSelection.border){
        surface.style.setProperty('--module-header-border', headerSelection.border);
      }else{
        surface.style.removeProperty('--module-header-border');
      }

      const buttonBg = buttonSelection.background || bg;
      if(buttonBg){
        surface.style.setProperty('--module-button-bg', buttonBg);
        surface.style.setProperty('--module-button-bg-hover', buttonBg);
      }else{
        surface.style.removeProperty('--module-button-bg');
        surface.style.removeProperty('--module-button-bg-hover');
      }
      const buttonText = buttonSelection.text || text;
      if(buttonText){
        surface.style.setProperty('--module-button-text', buttonText);
      }else{
        surface.style.removeProperty('--module-button-text');
      }
      if(buttonSelection.border){
        surface.style.setProperty('--module-button-border', buttonSelection.border);
      }else{
        surface.style.removeProperty('--module-button-border');
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
      categoryRefs.forEach(ref => {
        setCategoryDisabled(ref, true);
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
        categoryRefs.forEach(ref => {
          setCategoryDisabled(ref, state.colorOptions.length === 0);
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
        categoryRefs.forEach(ref => {
          setCategoryDisabled(ref, true);
        });
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

    categoryRefs.forEach(ref => {
      const dropdown = ref.dropdown;
      if(!dropdown){
        return;
      }
      if(dropdown.toggle){
        dropdown.toggle.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          const wasOpen = isDropdownOpen(ref);
          toggleDropdown(ref);
          if(!wasOpen && isDropdownOpen(ref)){
            focusDropdownSelection(ref);
          }
        });
        dropdown.toggle.addEventListener('keydown', event => {
          if(event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' '){
            event.preventDefault();
            openDropdown(ref);
            focusDropdownSelection(ref);
          }else if(event.key === 'Escape'){
            event.preventDefault();
            closeDropdown(ref);
          }
        });
      }
      if(ref.preview){
        ref.preview.addEventListener('click', event => {
          if(dropdown.toggle && dropdown.toggle.disabled){
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          const wasOpen = isDropdownOpen(ref);
          toggleDropdown(ref);
          if(!wasOpen && isDropdownOpen(ref)){
            focusDropdownSelection(ref);
          }
        });
      }
      const current = normalizeSelectionValue(state.selectedColors[ref.key]);
      const updated = updateCategoryField(ref, current);
      state.selectedColors[ref.key] = updated;
      setCategoryDisabled(ref, true);
      updateDropdownSelectionState(ref);
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
