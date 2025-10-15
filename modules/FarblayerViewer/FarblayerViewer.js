(function(){
  const STYLE_ID = 'farblayer-viewer-styles';
  const CONFIG_PATH = 'configs/FarblayerConfig.json';
  const CONFIG_FILENAME = CONFIG_PATH.split('/').pop() || 'FarblayerConfig.json';
  const STORAGE_KEY = CONFIG_PATH;
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
    .flv-surface{height:100%;display:flex;flex-direction:column;gap:.75rem;padding:.85rem;box-sizing:border-box;color:var(--text-color,#f8fafc);background:var(--module-bg,rgba(15,23,42,.6));border-radius:1.1rem;border:1px solid rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.04);}
    .flv-header{display:flex;justify-content:space-between;align-items:flex-start;gap:.75rem;flex-wrap:wrap;}
    .flv-title{font-size:1.1rem;font-weight:700;letter-spacing:.015em;}
    .flv-meta{font-size:.82rem;opacity:.8;}
    .flv-status{min-height:1.1rem;font-size:.85rem;opacity:.9;}
    .flv-refresh{border:none;border-radius:.65rem;padding:.45rem .95rem;background:rgba(255,255,255,.14);color:inherit;font-weight:600;cursor:pointer;box-shadow:0 10px 24px rgba(15,23,42,.25);transition:transform .12s ease,box-shadow .12s ease,background-color .12s ease;}
    .flv-refresh:hover{background:rgba(255,255,255,.2);}
    .flv-refresh:active{transform:scale(.97);box-shadow:0 6px 18px rgba(15,23,42,.3);}
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

    if(preferredPath) add(preferredPath);

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

  async function fetchPalette(signal){
    if(typeof fetch !== 'function'){
      throw new Error('Fetch API nicht verfügbar.');
    }

    const cached = readCachedPalette();
    const searchPaths = buildSearchPaths(cached && cached.path ? cached.path : null);
    const errors = [];

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
          return { data, source: 'Dateisystem', path };
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
      return { data: cached.data, source: 'Lokaler Speicher', path: cached.path || null };
    }

    if(errors.length) reportSearchErrors(errors);
    console.warn(`[FarblayerViewer] Keine Farblayer-Konfiguration gefunden. Es werden Debug-Standardwerte angezeigt (${CONFIG_FILENAME}).`);
    return { data: DEFAULT_DEBUG_DATA, source: 'Standardwerte (Fallback)', path: null };
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
          <button class="flv-refresh" type="button" data-flv-refresh>Aktualisieren</button>
        </div>
        <div class="flv-status" data-flv-status>Farblayer werden geladen…</div>
        <div class="flv-list" data-flv-list></div>
      </div>
    `;

    const listEl = root.querySelector('[data-flv-list]');
    const statusEl = root.querySelector('[data-flv-status]');
    const refreshBtn = root.querySelector('[data-flv-refresh]');
    const metaEl = root.querySelector('[data-flv-meta]');

    if(typeof root.__flvCleanup === 'function'){
      root.__flvCleanup();
    }

    const state = { controller: null, disposed: false };
    root.__flvCleanup = () => {
      state.disposed = true;
      if(state.controller){
        try{ state.controller.abort(); } catch{}
        state.controller = null;
      }
    };

    async function loadPalette(reason){
      if(state.disposed) return;
      if(state.controller){
        try{ state.controller.abort(); } catch{}
      }
      const controller = new AbortController();
      state.controller = controller;
      if(statusEl){
        statusEl.textContent = reason === 'manual' ? 'Aktualisiere Farblayer…' : 'Farblayer werden geladen…';
        statusEl.classList.remove('flv-error');
      }
      if(listEl){
        listEl.innerHTML = '';
      }
      try{
        const result = await fetchPalette(controller.signal);
        if(state.disposed || controller.signal.aborted) return;
        const items = flattenPalette(result.data);
        renderItems(listEl, items);
        if(statusEl){
          let message = `${items.length} Layer geladen (${result.source}).`;
          if(result.source === 'Standardwerte (Fallback)'){
            message += ' Bitte prüfen Sie den Pfad zur FarblayerConfig.json.';
          }
          statusEl.textContent = message;
        }
        if(metaEl){
          const labelPath = result.path || CONFIG_PATH;
          metaEl.textContent = `${labelPath} • ${result.source}`;
          if(result.source === 'Standardwerte (Fallback)'){
            metaEl.title = 'Debug-Fallback aktiv: Die Konfigurationsdatei konnte nicht gefunden werden.';
          }else if(result.path){
            metaEl.title = `Gefundener Pfad: ${result.path}`;
          }else{
            metaEl.removeAttribute('title');
          }
        }
      }catch(err){
        if(state.disposed || controller.signal.aborted) return;
        console.error('[FarblayerViewer] Konnte Farblayer nicht laden:', err);
        if(statusEl){
          statusEl.textContent = 'Fehler beim Laden der Farblayer.';
          statusEl.classList.add('flv-error');
        }
        renderItems(listEl, []);
      }
    }

    if(refreshBtn){
      refreshBtn.addEventListener('click', () => loadPalette('manual'));
    }

    loadPalette();
  };
})();
