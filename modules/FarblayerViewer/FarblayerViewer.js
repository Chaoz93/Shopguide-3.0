(function(){
  const STYLE_ID = 'farblayer-viewer-styles';
  const CONFIG_PATH = 'configs/FarblayerConfig.json';
  const STORAGE_KEY = CONFIG_PATH;

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

  function pickColorValue(entry){
    if(!entry || typeof entry !== 'object') return '';
    const candidates = [entry.background, entry.color, entry.hsla, entry.moduleBg, entry.bg];
    for(const value of candidates){
      if(typeof value === 'string' && value.trim()){
        return value.trim();
      }
    }
    return '';
  }

  function pickTextValue(entry){
    if(!entry || typeof entry !== 'object') return '';
    const candidates = [entry.text, entry.textColor, entry.moduleText];
    for(const value of candidates){
      if(typeof value === 'string' && value.trim()){
        return value.trim();
      }
    }
    return '';
  }

  function pickBorderValue(entry){
    if(!entry || typeof entry !== 'object') return '';
    const candidates = [entry.border, entry.borderColor, entry.moduleBorder];
    for(const value of candidates){
      if(typeof value === 'string' && value.trim()){
        return value.trim();
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

  function isColorDescriptor(value){
    if(!value || typeof value !== 'object') return false;
    return ['background','color','hsla','moduleBg','bg'].some(key => typeof value[key] === 'string');
  }

  function normalizeEntry(groupName, entryName, entry){
    const background = pickColorValue(entry);
    if(!background) return null;
    const text = getReadableTextColor(background, pickTextValue(entry));
    const border = pickBorderValue(entry);
    const displayName = typeof entry?.title === 'string' && entry.title.trim()
      ? entry.title.trim()
      : (typeof entry?.displayName === 'string' && entry.displayName.trim()
        ? entry.displayName.trim()
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
      if(!value || typeof value !== 'object') return;
      if(isColorDescriptor(value)){
        const groupLabel = path.length ? path.map(part => (typeof part === 'string' ? part.trim() : '')).filter(Boolean).join(' › ') : '';
        const normalized = normalizeEntry(groupLabel, entryName, value);
        if(normalized) items.push(normalized);
        return;
      }
      const trimmedName = typeof entryName === 'string' ? entryName.trim() : '';
      const nextPath = trimmedName ? [...path, trimmedName] : path.slice();
      Object.entries(value).forEach(([childName, childValue]) => {
        walk(nextPath, childName, childValue);
      });
    }

    Object.entries(data).forEach(([groupName, value]) => {
      walk([], groupName, value);
    });

    return items;
  }

  async function fetchPalette(signal){
    if(typeof fetch !== 'function'){
      throw new Error('Fetch API nicht verfügbar.');
    }
    let lastError = null;
    try{
      const response = await fetch(CONFIG_PATH, { cache: 'no-store', signal });
      if(!response.ok){
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if(data && typeof data === 'object'){
        try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch{}
        return { data, source: 'Dateisystem' };
      }
    }catch(err){
      lastError = err;
    }

    try{
      const stored = localStorage.getItem(STORAGE_KEY);
      if(stored){
        const parsed = JSON.parse(stored);
        if(parsed && typeof parsed === 'object'){
          if(lastError){
            console.warn('[FarblayerViewer] Verwende zwischengespeicherte Farblayer:', lastError);
          }
          return { data: parsed, source: 'Lokaler Speicher' };
        }
      }
    }catch(storageErr){
      if(!lastError) lastError = storageErr;
    }

    if(lastError){
      throw lastError;
    }
    return { data: {}, source: 'Unbekannt' };
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
          statusEl.textContent = `${items.length} Layer geladen (${result.source}).`;
        }
        if(metaEl){
          metaEl.textContent = `${CONFIG_PATH} • ${result.source}`;
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
