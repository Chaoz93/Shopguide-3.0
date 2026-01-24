(function(){
  const STYLE_ID = 'tabnav-module-styles';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
    .tabnav-root{height:100%;width:100%;box-sizing:border-box;padding:.55rem;display:flex;flex-direction:column;gap:.5rem;}
    .tabnav-surface{flex:1;display:flex;flex-direction:column;gap:.6rem;padding:0;border-radius:var(--module-border-radius,.9rem);
      color:var(--module-header-text,#e2e8f0);
    }
    .tabnav-surface.tabnav-surface-compact{gap:.5rem;}
    .tabnav-surface:focus{outline:2px solid rgba(59,130,246,.45);outline-offset:3px;}
    .tabnav-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;}
    .tabnav-title-wrap{display:flex;flex-direction:column;gap:.25rem;min-width:0;}
    .tabnav-title{margin:0;font-size:clamp(.95rem,1vw + .3vh,1.15rem);font-weight:600;letter-spacing:.2px;}
    .tabnav-pattern-label{font-size:.78rem;opacity:.75;line-height:1.35;}
    .tabnav-toggle-group{display:flex;flex-direction:column;gap:.45rem;margin-top:.6rem;}
    .tabnav-toggle{display:flex;align-items:center;gap:.55rem;padding:.55rem .7rem;border-radius:.7rem;
      background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.22);cursor:pointer;font-size:.85rem;font-weight:600;
      transition:border-color .15s ease,background .15s ease,transform .12s ease;}
    .tabnav-toggle:focus-within{border-color:rgba(59,130,246,.55);background:rgba(37,99,235,.18);}
    .tabnav-toggle.active{border-color:rgba(59,130,246,.55);background:rgba(37,99,235,.18);}
    .tabnav-toggle input{width:1.05rem;height:1.05rem;}
    .tabnav-toggle span{flex:1;}
    .tabnav-buttons{flex:1;min-height:0;display:grid;gap:.5rem;align-content:flex-start;}
    .tabnav-buttons[data-pattern="grid"]{grid-template-columns:repeat(auto-fit,minmax(120px,1fr));}
    .tabnav-buttons[data-pattern="columns"]{grid-template-columns:repeat(2,minmax(0,1fr));}
    .tabnav-buttons[data-pattern="list"]{display:flex;flex-direction:column;}
    .tabnav-button{appearance:none;border:none;border-radius:.75rem;padding:.7rem .9rem;text-align:center;cursor:pointer;position:relative;
      background:rgba(15,23,42,.78);
      color:inherit;font-size:clamp(.9rem,.9vw + .2vh,1.05rem);font-weight:600;letter-spacing:.2px;
      box-shadow:0 6px 16px rgba(8,15,35,.25);transition:transform .12s ease,box-shadow .12s ease,background .12s ease;
    }
    .tabnav-button-label{display:block;min-width:0;padding-right:1.2rem;}
    .tabnav-button-handle{position:absolute;right:.6rem;top:50%;transform:translateY(-50%);cursor:grab;color:inherit;font-size:1em;
      line-height:1;transition:transform .12s ease;
    }
    .tabnav-button-handle:active{cursor:grabbing;transform:translateY(-50%) scale(.95);}
    .tabnav-button[data-draggable="false"] .tabnav-button-handle{opacity:.35;cursor:not-allowed;}
    .tabnav-button:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(8,15,35,.32);background:rgba(37,99,235,.18);}
    .tabnav-button.tabnav-button-active,
    .tabnav-button.tabnav-button-active:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(8,15,35,.32);background:rgba(37,99,235,.18);}
    .tabnav-button:active{transform:none;box-shadow:0 4px 12px rgba(8,15,35,.2);}
    .tabnav-button-ghost{opacity:.6;}
    .tabnav-empty{margin:0;font-size:.88rem;opacity:.75;text-align:center;padding:1.4rem 1rem;border-radius:.75rem;
      background:rgba(15,23,42,.55);border:1px dashed rgba(148,163,184,.24);
    }
    .tabnav-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:1.5rem;
      background:rgba(15,23,42,.45);backdrop-filter:blur(14px);z-index:3600;
    }
    .tabnav-overlay.open{display:flex;}
    .tabnav-dialog{width:min(640px,96vw);max-height:90vh;overflow:auto;border-radius:1rem;
      background:rgba(15,23,42,.9);color:#f8fafc;border:1px solid rgba(148,163,184,.25);
      box-shadow:0 18px 36px rgba(8,15,35,.45);display:flex;flex-direction:column;outline:none;
    }
    .tabnav-dialog-header{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;padding:1.1rem 1.25rem 1rem;}
    .tabnav-dialog-title{margin:0;font-size:1.12rem;font-weight:600;letter-spacing:.25px;}
    .tabnav-dialog-subtitle{margin:.15rem 0 0;font-size:.82rem;opacity:.78;line-height:1.45;}
    .tabnav-dialog-close{appearance:none;border:none;background:rgba(148,163,184,.18);color:inherit;font-size:1.4rem;line-height:1;
      border-radius:.75rem;width:2.3rem;height:2.3rem;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;
      transition:transform .15s ease,background .15s ease;
    }
    .tabnav-dialog-close:hover{transform:translateY(-1px);background:rgba(59,130,246,.35);}
    .tabnav-dialog-close:active{transform:none;}
    .tabnav-dialog-body{flex:1;min-height:0;padding:1.1rem 1.25rem 1.25rem;display:flex;flex-direction:column;gap:1.1rem;}
    .tabnav-section{display:flex;flex-direction:column;gap:.75rem;background:rgba(15,32,56,.55);border-radius:.9rem;
      border:1px solid rgba(148,163,184,.22);padding:.9rem 1rem;
    }
    .tabnav-section-title{margin:0;font-size:.95rem;font-weight:600;letter-spacing:.2px;}
    .tabnav-patterns{display:grid;gap:.55rem;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));}
    .tabnav-choice{display:flex;flex-direction:column;gap:.3rem;padding:.7rem .8rem;border-radius:.8rem;
      background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.22);cursor:pointer;transition:border-color .15s ease,background .15s ease;
    }
    .tabnav-choice input{width:1rem;height:1rem;}
    .tabnav-choice-header{display:flex;align-items:center;gap:.55rem;}
    .tabnav-choice-title{font-weight:600;font-size:.9rem;}
    .tabnav-choice-desc{font-size:.8rem;opacity:.75;line-height:1.4;}
    .tabnav-choice.active{border-color:rgba(59,130,246,.55);background:rgba(37,99,235,.22);}
    .tabnav-choice input{flex:0 0 auto;}
    .tabnav-mode-group{display:flex;flex-wrap:wrap;gap:.5rem;}
    .tabnav-mode-option{display:inline-flex;align-items:center;gap:.45rem;padding:.5rem .7rem;border-radius:.75rem;
      background:rgba(15,23,42,.5);border:1px solid rgba(148,163,184,.22);cursor:pointer;font-weight:600;font-size:.86rem;
      transition:border-color .15s ease,background .15s ease;
    }
    .tabnav-mode-option input{width:1rem;height:1rem;}
    .tabnav-mode-option.active{border-color:rgba(59,130,246,.5);background:rgba(37,99,235,.2);}
    .tabnav-hint{margin:0;font-size:.8rem;opacity:.78;line-height:1.4;}
    .tabnav-actions{display:flex;flex-wrap:wrap;gap:.5rem;}
    .tabnav-action{appearance:none;border:none;border-radius:.75rem;padding:.5rem .85rem;font-weight:600;font-size:.85rem;
      cursor:pointer;background:rgba(37,99,235,.82);color:#fff;box-shadow:0 10px 22px rgba(8,15,35,.3);
      transition:transform .15s ease,filter .15s ease;
    }
    .tabnav-action:hover{transform:translateY(-1px);filter:brightness(1.04);}
    .tabnav-action:active{transform:none;}
    .tabnav-action:disabled{opacity:.55;cursor:not-allowed;}
    .tabnav-action-secondary{background:rgba(148,163,184,.18);color:inherit;box-shadow:none;}
    .tabnav-tab-list{display:flex;flex-direction:column;gap:.5rem;max-height:240px;overflow:auto;padding-right:.2rem;}
    .tabnav-option{display:flex;align-items:center;gap:.6rem;padding:.5rem .6rem;border-radius:.7rem;
      background:rgba(15,23,42,.5);border:1px solid rgba(148,163,184,.2);font-size:.88rem;transition:box-shadow .12s ease,background .12s ease,opacity .12s ease;
    }
    .tabnav-option.dragging{opacity:.85;box-shadow:0 14px 28px rgba(8,15,35,.45);}
    .tabnav-option.drop-target-before{box-shadow:0 -2px 0 rgba(59,130,246,.65) inset;}
    .tabnav-option.drop-target-after{box-shadow:0 2px 0 rgba(59,130,246,.65) inset;}
    .tabnav-option[data-draggable="false"] .tabnav-option-handle{opacity:.35;cursor:not-allowed;}
    .tabnav-option-label{display:flex;align-items:center;gap:.55rem;flex:1;min-width:0;}
    .tabnav-option-label input{width:1rem;height:1rem;}
    .tabnav-option-label span{flex:1;min-width:0;}
    .tabnav-option-handle{width:1.8rem;height:1.8rem;display:inline-flex;align-items:center;justify-content:center;border-radius:.6rem;
      background:rgba(148,163,184,.14);border:1px solid rgba(148,163,184,.22);cursor:grab;color:inherit;font-size:1.05rem;flex:0 0 auto;
      transition:transform .12s ease,background .12s ease,border-color .12s ease;
    }
    .tabnav-option-handle:focus{outline:2px solid rgba(59,130,246,.55);outline-offset:3px;}
    .tabnav-option-handle:active{cursor:grabbing;transform:scale(.95);}
    .tabnav-option-handle:hover{background:rgba(37,99,235,.22);border-color:rgba(59,130,246,.45);}
    .tabnav-tab-list-empty{font-size:.82rem;opacity:.72;padding:.3rem 0;}
    .tabnav-dialog-footer{display:flex;justify-content:flex-end;padding:.9rem 1.25rem 1.15rem;border-top:1px solid rgba(148,163,184,.2);}
    .tabnav-footer-btn{appearance:none;border:none;border-radius:.75rem;padding:.55rem 1rem;font-weight:600;font-size:.9rem;
      background:rgba(37,99,235,.85);color:#fff;cursor:pointer;box-shadow:0 10px 22px rgba(8,15,35,.28);
      transition:transform .15s ease,filter .15s ease;
    }
    .tabnav-footer-btn:hover{transform:translateY(-1px);filter:brightness(1.04);}
    .tabnav-footer-btn:active{transform:none;}
    body.tabnav-modal-open{overflow:hidden;}
    @media(max-width:640px){
      .tabnav-root{padding:.45rem;}
      .tabnav-surface{padding:.65rem;}
      .tabnav-buttons[data-pattern="columns"]{grid-template-columns:repeat(1,minmax(0,1fr));}
    }
    `;
    document.head.appendChild(style);
  }

  const STORAGE_PREFIX = 'tabNavigatorState:';
  const PATTERN_OPTIONS = [
    { value: 'grid', label: 'Kacheln (Auto-Grid)', description: 'Flexible Kachelansicht mit automatischer Spaltenanzahl.' },
    { value: 'columns', label: 'Zweispaltig', description: 'Fixe Zwei-Spalten-Ansicht mit gleichmäßig verteilten Buttons.' },
    { value: 'list', label: 'Liste', description: 'Vertikale Liste über die gesamte Breite.' }
  ];

  function getStorage(){
    try { return (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : null; }
    catch (err) { return null; }
  }

  function loadState(id){
    if (!id) return null;
    const store = getStorage();
    if (!store) return null;
    try {
      const raw = store.getItem(STORAGE_PREFIX + id);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        pattern: typeof parsed.pattern === 'string' ? parsed.pattern : undefined,
        mode: parsed.mode === 'custom' ? 'custom' : 'all',
        selectedTabs: Array.isArray(parsed.selectedTabs) ? parsed.selectedTabs : [],
        showTitle: typeof parsed.showTitle === 'boolean' ? parsed.showTitle : undefined,
        showSubtitle: typeof parsed.showSubtitle === 'boolean' ? parsed.showSubtitle : undefined,
        customOrder: Array.isArray(parsed.customOrder) ? parsed.customOrder : [],
        allowDrag: typeof parsed.allowDrag === 'boolean' ? parsed.allowDrag : undefined
      };
    } catch (err) {
      console.warn('TabNavigator: Konnte Zustand nicht laden', err);
      return null;
    }
  }

  function saveState(id, state){
    if (!id) return;
    const store = getStorage();
    if (!store) return;
    try {
      store.setItem(STORAGE_PREFIX + id, JSON.stringify({
        pattern: state.pattern,
        mode: state.mode,
        selectedTabs: state.selectedTabs,
        showTitle: state.showTitle,
        showSubtitle: state.showSubtitle,
        customOrder: state.customOrder,
        allowDrag: state.allowDrag
      }));
    } catch (err) {
      console.warn('TabNavigator: Konnte Zustand nicht speichern', err);
    }
  }

  function normalizeSelection(value){
    if (!Array.isArray(value)) return [];
    return value.map(entry => {
      if (!entry) return null;
      if (typeof entry === 'number') return { index: Number.isFinite(entry) ? entry : null, name: '' };
      if (typeof entry === 'string') return { index: null, name: entry };
      const idx = Number.parseInt(entry.index, 10);
      const name = typeof entry.name === 'string' ? entry.name : (typeof entry.label === 'string' ? entry.label : '');
      return { index: Number.isNaN(idx) ? null : idx, name };
    }).filter(Boolean);
  }

  function uniqueSelection(selection){
    const seen = new Set();
    return selection.filter(sel => {
      const key = `${Number.isInteger(sel.index) ? sel.index : 'x'}::${sel.name || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function toSelectionFromTab(tab){
    return {
      index: Number.isInteger(tab?.index) ? tab.index : null,
      name: typeof tab?.name === 'string' ? tab.name : ''
    };
  }

  function makeSelectionKey(entry){
    const idx = Number.isInteger(entry?.index) ? entry.index : 'x';
    const name = entry?.name ? String(entry.name) : '';
    return `${idx}:::${name}`;
  }

  function decodeSelectionKey(key){
    if (typeof key !== 'string') return { index: null, name: '' };
    const [idxPart, ...nameParts] = key.split(':::');
    const parsed = Number.parseInt(idxPart, 10);
    return {
      index: Number.isNaN(parsed) ? null : parsed,
      name: nameParts.join(':::')
    };
  }

  function selectionsEqual(a, b){
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!a[i] || !b[i]) return false;
      if (a[i].index !== b[i].index || a[i].name !== b[i].name) return false;
    }
    return true;
  }

  function buildDefaultOrderMap(tabs){
    const map = new Map();
    tabs.forEach((tab, idx) => {
      const key = makeSelectionKey(toSelectionFromTab(tab));
      if (!map.has(key)) map.set(key, idx);
    });
    return map;
  }

  function applyOrdering(tabs, customOrder, defaultOrderMap){
    if (!Array.isArray(tabs) || !tabs.length) return [];
    const orderMap = new Map();
    if (Array.isArray(customOrder)) {
      customOrder.forEach((entry, idx) => {
        const key = makeSelectionKey(entry);
        if (!orderMap.has(key)) orderMap.set(key, idx);
      });
    }
    const fallbackMap = defaultOrderMap instanceof Map ? defaultOrderMap : new Map();
    return tabs
      .map(tab => ({ tab, key: makeSelectionKey(toSelectionFromTab(tab)) }))
      .sort((a, b) => {
        const rankA = orderMap.has(a.key) ? orderMap.get(a.key) : Number.POSITIVE_INFINITY;
        const rankB = orderMap.has(b.key) ? orderMap.get(b.key) : Number.POSITIVE_INFINITY;
        if (rankA !== rankB) return rankA - rankB;
        const fallbackA = fallbackMap.has(a.key) ? fallbackMap.get(a.key) : Number.POSITIVE_INFINITY;
        const fallbackB = fallbackMap.has(b.key) ? fallbackMap.get(b.key) : Number.POSITIVE_INFINITY;
        if (fallbackA !== fallbackB) return fallbackA - fallbackB;
        return a.tab.name.localeCompare(b.tab.name, 'de', { sensitivity: 'base' });
      })
      .map(entry => entry.tab);
  }

  function syncCustomOrderWithDisplayedTabs(stateObj, displayedTabs){
    if (!stateObj || typeof stateObj !== 'object') return false;
    if (!Array.isArray(displayedTabs)) return false;
    if (!Array.isArray(stateObj.customOrder)) {
      stateObj.customOrder = [];
      return true;
    }
    if (!stateObj.customOrder.length) return false;
    const availableMap = new Map();
    displayedTabs.forEach(tab => {
      const selection = toSelectionFromTab(tab);
      const key = makeSelectionKey(selection);
      if (!availableMap.has(key)) {
        availableMap.set(key, selection);
      }
    });
    if (!availableMap.size) {
      if (stateObj.customOrder.length) {
        stateObj.customOrder = [];
        return true;
      }
      return false;
    }
    const filtered = [];
    const seen = new Set();
    stateObj.customOrder.forEach(entry => {
      const key = makeSelectionKey(entry);
      if (availableMap.has(key) && !seen.has(key)) {
        filtered.push(availableMap.get(key));
        seen.add(key);
      }
    });
    availableMap.forEach((selection, key) => {
      if (!seen.has(key)) {
        filtered.push(selection);
        seen.add(key);
      }
    });
    if (!filtered.length) {
      if (stateObj.customOrder.length) {
        stateObj.customOrder = [];
        return true;
      }
      return false;
    }
    if (!selectionsEqual(filtered, stateObj.customOrder)) {
      stateObj.customOrder = filtered;
      return true;
    }
    return false;
  }

  function readTabs(){
    const container = document.getElementById('tabs-container');
    if (!container) return [];
    const items = Array.from(container.querySelectorAll('.tab-item'));
    return items.map((item, fallbackIndex) => {
      const span = item.querySelector('span');
      const label = (span ? span.textContent : item.textContent || '').trim() || `Tab ${fallbackIndex + 1}`;
      const rawIdx = item.dataset.tabIndex;
      const parsed = rawIdx === undefined ? NaN : Number.parseInt(rawIdx, 10);
      const index = Number.isNaN(parsed) ? fallbackIndex : parsed;
      const isActive = item.classList.contains('tab-active');
      return { index, name: label, isActive };
    }).sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index;
      return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
    });
  }

  function matchesSelection(sel, tab){
    if (!sel || !tab) return false;
    if (Number.isInteger(sel.index) && sel.index === tab.index) return true;
    return !!sel.name && sel.name === tab.name;
  }

  function resolveSelection(selection, available){
    if (!selection.length) return { resolved: [], normalized: [] };
    const normalized = [];
    const resolved = [];
    const used = new Set();
    selection.forEach(sel => {
      if (!sel) return;
      let match = null;
      if (Number.isInteger(sel.index)) {
        match = available.find(tab => tab.index === sel.index);
      }
      if (!match && sel.name) {
        match = available.find(tab => tab.name === sel.name && !used.has(tab.index));
      }
      if (match && !used.has(match.index)) {
        resolved.push(match);
        normalized.push({ index: match.index, name: match.name });
        used.add(match.index);
      }
    });
    return { resolved, normalized };
  }

  window.renderTabNavigator = function renderTabNavigator(root, ctx){
    if (!root) return;

    if (typeof root.__tabNavCleanup === 'function') {
      root.__tabNavCleanup();
      root.__tabNavCleanup = null;
    }

    root.innerHTML = '';

    const moduleInstanceId = root.closest('.grid-stack-item')?.dataset.instanceId || null;
    const defaults = ctx?.moduleJson?.settings || {};
    const stored = loadState(moduleInstanceId);
    const state = {
      pattern: stored?.pattern || defaults.pattern || 'grid',
      mode: stored?.mode || defaults.mode || 'all',
      selectedTabs: uniqueSelection(normalizeSelection(stored?.selectedTabs || defaults.selectedTabs || [])),
      showTitle: typeof stored?.showTitle === 'boolean'
        ? stored.showTitle
        : (typeof defaults.showTitle === 'boolean' ? defaults.showTitle : true),
      showSubtitle: typeof stored?.showSubtitle === 'boolean'
        ? stored.showSubtitle
        : (typeof defaults.showSubtitle === 'boolean' ? defaults.showSubtitle : true),
      customOrder: uniqueSelection(normalizeSelection(stored?.customOrder || defaults.customOrder || [])),
      allowDrag: typeof stored?.allowDrag === 'boolean'
        ? stored.allowDrag
        : (typeof defaults.allowDrag === 'boolean' ? defaults.allowDrag : false)
    };

    let currentTabs = readTabs();
    let observer = null;
    let sidebarObserver = null;
    let containerCheckTimer = null;
    let lastFocusedBeforeModal = null;
    let buttonsSortable = null;
    let buttonDragInProgress = false;

    const container = document.createElement('div');
    container.className = 'tabnav-root';
    root.appendChild(container);

    const surface = document.createElement('div');
    surface.className = 'tabnav-surface';
    surface.setAttribute('tabindex', '0');
    surface.setAttribute('role', 'group');
    container.appendChild(surface);

    const header = document.createElement('div');
    header.className = 'tabnav-header';
    surface.appendChild(header);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'tabnav-title-wrap';
    header.appendChild(titleWrap);

    const title = document.createElement('h2');
    title.className = 'tabnav-title';
    title.textContent = defaults.title || ctx?.moduleJson?.name || 'Tab Navigator';
    titleWrap.appendChild(title);
    surface.setAttribute('aria-label', `${title.textContent} – Rechtsklick für Einstellungen`);

    const patternLabel = document.createElement('div');
    patternLabel.className = 'tabnav-pattern-label';
    titleWrap.appendChild(patternLabel);

    applyPatternLabel();
    applyHeaderVisibility();

    const buttonsWrap = document.createElement('div');
    buttonsWrap.className = 'tabnav-buttons';
    buttonsWrap.dataset.pattern = state.pattern;
    surface.appendChild(buttonsWrap);

    const emptyState = document.createElement('div');
    emptyState.className = 'tabnav-empty';
    emptyState.textContent = 'Keine Tabs verfügbar.';
    surface.appendChild(emptyState);

    const patternRadioName = `tabnav-pattern-${moduleInstanceId || Math.random().toString(36).slice(2, 8)}`;
    const modeRadioName = `tabnav-mode-${moduleInstanceId || Math.random().toString(36).slice(2, 8)}`;

    const overlay = buildOverlay();
    const dialog = overlay.querySelector('.tabnav-dialog');
    const closeBtn = overlay.querySelector('[data-action="close"]');
    const doneBtn = overlay.querySelector('[data-action="done"]');
    const selectAllBtn = overlay.querySelector('[data-action="select-all"]');
    const showAllBtn = overlay.querySelector('[data-action="show-all"]');
    const clearBtn = overlay.querySelector('[data-action="clear-selection"]');
    const overlayHint = overlay.querySelector('[data-role="tab-hint"]');
    let overlayTabList = overlay.querySelector('[data-role="tab-list"]');
    let patternRadios = Array.from(overlay.querySelectorAll(`input[name="${patternRadioName}"]`));
    let modeRadios = Array.from(overlay.querySelectorAll(`input[name="${modeRadioName}"]`));
    const displayToggleInputs = {
      showTitle: overlay.querySelector('input[data-setting="showTitle"]'),
      showSubtitle: overlay.querySelector('input[data-setting="showSubtitle"]'),
      allowDrag: overlay.querySelector('input[data-setting="allowDrag"]')
    };
    let dragHandlersBound = false;
    let draggingKey = null;
    let currentDropTarget = null;

    setupDragAndDrop();

    function buildOverlay(){
      const overlayEl = document.createElement('div');
      overlayEl.className = 'tabnav-overlay';
      overlayEl.dataset.instanceId = moduleInstanceId || '';
      const patternChoices = PATTERN_OPTIONS.map(opt => {
        const escapedLabel = opt.label;
        const escapedDesc = opt.description;
        return `<label class="tabnav-choice"><div class="tabnav-choice-header"><input type="radio" name="${patternRadioName}" value="${opt.value}" /><span class="tabnav-choice-title">${escapedLabel}</span></div><span class="tabnav-choice-desc">${escapedDesc}</span></label>`;
      }).join('');
      overlayEl.innerHTML = `
        <div class="tabnav-dialog" role="dialog" aria-modal="true" aria-label="Tab Navigator konfigurieren" tabindex="-1">
          <div class="tabnav-dialog-header">
            <div>
              <h2 class="tabnav-dialog-title">Tab-Navigation konfigurieren</h2>
              <p class="tabnav-dialog-subtitle">Lege fest, welche Tabs angezeigt werden und wie die Buttons angeordnet sind. Dieses Menü erreichst du per Rechtsklick im Modul.</p>
            </div>
            <button type="button" class="tabnav-dialog-close" data-action="close" aria-label="Schließen">×</button>
          </div>
          <div class="tabnav-dialog-body">
            <section class="tabnav-section">
              <h3 class="tabnav-section-title">Darstellung</h3>
              <div class="tabnav-patterns" data-role="pattern-group">${patternChoices}</div>
              <div class="tabnav-toggle-group" data-role="display-toggles">
                <label class="tabnav-toggle"><input type="checkbox" data-setting="showTitle" /> <span>Modulname anzeigen</span></label>
                <label class="tabnav-toggle"><input type="checkbox" data-setting="showSubtitle" /> <span>Hinweistext anzeigen</span></label>
                <label class="tabnav-toggle"><input type="checkbox" data-setting="allowDrag" /> <span>Draggen der Tabs aktivieren</span></label>
              </div>
            </section>
            <section class="tabnav-section">
              <h3 class="tabnav-section-title">Angezeigte Tabs</h3>
              <div class="tabnav-mode-group">
                <label class="tabnav-mode-option"><input type="radio" name="${modeRadioName}" value="all" /> <span>Alle Tabs</span></label>
                <label class="tabnav-mode-option"><input type="radio" name="${modeRadioName}" value="custom" /> <span>Ausgewählte Tabs</span></label>
              </div>
              <p class="tabnav-hint" data-role="tab-hint"></p>
              <div class="tabnav-actions">
                <button type="button" class="tabnav-action" data-action="show-all">Alle Tabs anzeigen</button>
                <button type="button" class="tabnav-action" data-action="select-all">Alle auswählen</button>
                <button type="button" class="tabnav-action tabnav-action-secondary" data-action="clear-selection">Auswahl leeren</button>
              </div>
              <div class="tabnav-tab-list" data-role="tab-list"></div>
            </section>
          </div>
          <div class="tabnav-dialog-footer">
            <button type="button" class="tabnav-footer-btn" data-action="done">Fertig</button>
          </div>
        </div>`;
      document.body.appendChild(overlayEl);
      return overlayEl;
    }

    function openOverlay(triggerEl){
      if (triggerEl instanceof HTMLElement) {
        lastFocusedBeforeModal = triggerEl;
      } else {
        lastFocusedBeforeModal = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      overlay.classList.add('open');
      document.body.classList.add('tabnav-modal-open');
      updatePatternRadios();
      updateModeRadios();
      syncDisplayToggles();
      updateOverlayTabs();
      setTimeout(() => dialog.focus(), 0);
    }

    function closeOverlay(){
      overlay.classList.remove('open');
      if (!document.querySelector('.tabnav-overlay.open')) {
        document.body.classList.remove('tabnav-modal-open');
      }
      if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
        if (document.contains(lastFocusedBeforeModal)) {
          lastFocusedBeforeModal.focus();
          return;
        }
      }
      if (typeof surface.focus === 'function') {
        surface.focus();
      }
    }

    function persist(){
      if (!moduleInstanceId) return;
      saveState(moduleInstanceId, state);
    }

    function applyPatternLabel(){
      const opt = PATTERN_OPTIONS.find(o => o.value === state.pattern);
      const pieces = [];
      if (opt) pieces.push(`Darstellung: ${opt.label}`);
      pieces.push('Rechtsklick für Einstellungen');
      patternLabel.textContent = state.showSubtitle ? pieces.join(' • ') : '';
    }

    function applyHeaderVisibility(){
      const showTitle = !!state.showTitle;
      const showSubtitle = !!state.showSubtitle;
      if (title) title.style.display = showTitle ? '' : 'none';
      if (patternLabel) patternLabel.style.display = showSubtitle ? '' : 'none';
      const headerVisible = showTitle || showSubtitle;
      if (header) header.style.display = headerVisible ? '' : 'none';
      if (titleWrap) titleWrap.style.display = headerVisible ? '' : 'none';
      surface.classList.toggle('tabnav-surface-compact', !headerVisible);
    }

    function updatePatternRadios(){
      patternRadios.forEach(radio => {
        const isChecked = radio.value === state.pattern;
        radio.checked = isChecked;
        const label = radio.closest('.tabnav-choice');
        if (label) label.classList.toggle('active', isChecked);
      });
    }

    function updateModeRadios(){
      modeRadios.forEach(radio => {
        const isChecked = radio.value === state.mode;
        radio.checked = isChecked;
        const label = radio.closest('.tabnav-mode-option');
        if (label) label.classList.toggle('active', isChecked);
      });
    }

    function syncDisplayToggles(){
      Object.entries(displayToggleInputs).forEach(([key, input]) => {
        if (!input) return;
        const isChecked = !!state[key];
        input.checked = isChecked;
        const label = input.closest('.tabnav-toggle');
        if (label) label.classList.toggle('active', isChecked);
      });
    }

    syncDisplayToggles();

    function updateOverlayTabs(){
      if (!overlayTabList) return;
      overlayTabList.innerHTML = '';
      const tabs = currentTabs.slice();
      if (!tabs.length) {
        const info = document.createElement('div');
        info.className = 'tabnav-tab-list-empty';
        info.textContent = 'Es sind noch keine Tabs vorhanden.';
        overlayTabList.appendChild(info);
        if (overlayHint) {
          overlayHint.textContent = 'Sobald Tabs erstellt wurden, können sie hier ausgewählt werden.';
        }
        if (selectAllBtn) selectAllBtn.disabled = true;
        if (showAllBtn) showAllBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true;
        return;
      }
      if (selectAllBtn) selectAllBtn.disabled = false;
      if (showAllBtn) showAllBtn.disabled = false;
      if (clearBtn) clearBtn.disabled = false;
      const isAllMode = state.mode !== 'custom';
      const tabByKey = new Map();
      tabs.forEach(tab => {
        const key = makeSelectionKey(toSelectionFromTab(tab));
        if (!tabByKey.has(key)) {
          tabByKey.set(key, tab);
        }
      });
      const orderedKeys = [];
      const usedKeys = new Set();
      if (Array.isArray(state.customOrder) && state.customOrder.length) {
        state.customOrder.forEach(entry => {
          const key = makeSelectionKey(entry);
          if (usedKeys.has(key)) return;
          if (tabByKey.has(key)) {
            orderedKeys.push(key);
            usedKeys.add(key);
          }
        });
      }
      tabs.forEach(tab => {
        const key = makeSelectionKey(toSelectionFromTab(tab));
        if (!usedKeys.has(key)) {
          orderedKeys.push(key);
          usedKeys.add(key);
        }
      });
      const createdItems = [];
      let selectedCount = 0;
      orderedKeys.forEach(key => {
        const tab = tabByKey.get(key);
        if (!tab) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'tabnav-option';
        wrapper.dataset.tabKey = key;
        const isSelected = isAllMode || state.selectedTabs.some(sel => matchesSelection(sel, tab));
        wrapper.dataset.selected = isSelected ? 'true' : 'false';
        if (isSelected) selectedCount += 1;

        const handle = document.createElement('span');
        handle.className = 'tabnav-option-handle';
        handle.title = 'Ziehen, um die Reihenfolge zu ändern';
        handle.setAttribute('aria-hidden', 'true');
        handle.textContent = '☰';
        wrapper.appendChild(handle);

        const label = document.createElement('label');
        label.className = 'tabnav-option-label';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = String(tab.index);
        input.checked = isSelected;
        label.appendChild(input);
        const span = document.createElement('span');
        span.textContent = tab.name;
        label.appendChild(span);
        wrapper.appendChild(label);

        input.addEventListener('change', () => {
          if (state.mode !== 'custom') {
            state.mode = 'custom';
            updateModeRadios();
          }
          if (input.checked) {
            if (!state.selectedTabs.some(sel => matchesSelection(sel, tab))) {
              state.selectedTabs.push({ index: tab.index, name: tab.name });
              state.selectedTabs = uniqueSelection(state.selectedTabs);
            }
          } else {
            state.selectedTabs = state.selectedTabs.filter(sel => !matchesSelection(sel, tab));
          }
          if (state.selectedTabs.length === currentTabs.length) {
            state.mode = 'all';
            state.selectedTabs = [];
            updateModeRadios();
          }
          persist();
          renderButtons();
        });

        overlayTabList.appendChild(wrapper);
        createdItems.push({ wrapper, handle, input, isSelected });
      });

      const dragEnabled = selectedCount >= 2;
      createdItems.forEach(item => {
        const enabled = dragEnabled && item.isSelected;
        item.handle.draggable = enabled;
        item.wrapper.dataset.draggable = enabled ? 'true' : 'false';
      });

      if (overlayHint) {
        const baseText = isAllMode
          ? 'Alle Tabs werden angezeigt. Wähle „Ausgewählte Tabs“, um eine individuelle Auswahl festzulegen.'
          : (state.selectedTabs.length
              ? 'Aktiviere oder deaktiviere Tabs, um die Navigation anzupassen.'
              : 'Es sind keine Tabs ausgewählt. Das Modul bleibt leer, bis du mindestens einen Tab aktivierst.');
        const dragText = selectedCount >= 2
          ? 'Tipp: Ziehe die markierten Einträge am Griff, um die Button-Reihenfolge anzupassen.'
          : '';
        overlayHint.textContent = [baseText, dragText].filter(Boolean).join(' ');
      }
      setupDragAndDrop();
    }

    function setupDragAndDrop(){
      if (!overlayTabList || dragHandlersBound) return;
      overlayTabList.addEventListener('dragstart', handleDragStart);
      overlayTabList.addEventListener('dragover', handleDragOver);
      overlayTabList.addEventListener('drop', handleDrop);
      overlayTabList.addEventListener('dragend', handleDragEnd);
      overlayTabList.addEventListener('dragleave', handleDragLeave);
      dragHandlersBound = true;
    }

    function handleDragStart(event){
      const handle = event.target.closest('.tabnav-option-handle');
      if (!handle || !overlayTabList) return;
      const item = handle.closest('.tabnav-option');
      if (!item || item.dataset.draggable !== 'true') {
        event.preventDefault();
        return;
      }
      const checkbox = item.querySelector('input[type="checkbox"]');
      if (!checkbox || !checkbox.checked) {
        event.preventDefault();
        return;
      }
      const selectedCount = overlayTabList.querySelectorAll('.tabnav-option input[type="checkbox"]:checked').length;
      if (selectedCount < 2) {
        event.preventDefault();
        return;
      }
      draggingKey = item.dataset.tabKey || null;
      if (!draggingKey) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = 'move';
      try { event.dataTransfer.setData('text/plain', draggingKey); }
      catch (err) { /* ignore */ }
      item.classList.add('dragging');
    }

    function handleDragOver(event){
      if (!overlayTabList || !draggingKey) return;
      const draggingItem = overlayTabList.querySelector('.tabnav-option.dragging');
      if (!draggingItem) return;
      const target = event.target.closest('.tabnav-option');
      if (!target || target === draggingItem) return;
      event.preventDefault();
      const rect = target.getBoundingClientRect();
      const before = event.clientY - rect.top < rect.height / 2;
      if (before) {
        overlayTabList.insertBefore(draggingItem, target);
        target.classList.add('drop-target-before');
        target.classList.remove('drop-target-after');
      } else {
        overlayTabList.insertBefore(draggingItem, target.nextSibling);
        target.classList.add('drop-target-after');
        target.classList.remove('drop-target-before');
      }
      if (currentDropTarget && currentDropTarget !== target) {
        currentDropTarget.classList.remove('drop-target-before', 'drop-target-after');
      }
      currentDropTarget = target;
    }

    function handleDrop(event){
      if (!draggingKey) return;
      event.preventDefault();
    }

    function handleDragLeave(event){
      const target = event.target.closest('.tabnav-option');
      if (!target || target !== currentDropTarget) return;
      target.classList.remove('drop-target-before', 'drop-target-after');
      currentDropTarget = null;
    }

    function handleDragEnd(){
      if (!overlayTabList) return;
      const draggingItem = overlayTabList.querySelector('.tabnav-option.dragging');
      if (draggingItem) draggingItem.classList.remove('dragging');
      clearDropIndicator();
      if (!draggingKey) return;
      draggingKey = null;
      commitCustomOrderFromDom();
    }

    function clearDropIndicator(){
      if (currentDropTarget) {
        currentDropTarget.classList.remove('drop-target-before', 'drop-target-after');
        currentDropTarget = null;
      }
    }

    function commitCustomOrderFromDom(){
      if (!overlayTabList) return;
      const items = Array.from(overlayTabList.querySelectorAll('.tabnav-option'));
      if (!items.length) return;
      const order = items.reduce((acc, item) => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
          acc.push(decodeSelectionKey(item.dataset.tabKey || ''));
        }
        return acc;
      }, []);
      const normalizedOrder = uniqueSelection(normalizeSelection(order));
      const isAllMode = state.mode !== 'custom';
      const defaultOrder = uniqueSelection(currentTabs
        .slice()
        .filter(tab => isAllMode || state.selectedTabs.some(sel => matchesSelection(sel, tab)))
        .map(toSelectionFromTab));
      if (!normalizedOrder.length && defaultOrder.length) {
        if (state.customOrder.length) {
          state.customOrder = [];
          persist();
        }
        renderButtons();
        return;
      }
      if (selectionsEqual(normalizedOrder, defaultOrder)) {
        if (state.customOrder.length) {
          state.customOrder = [];
          persist();
        }
        renderButtons();
        return;
      }
      if (!selectionsEqual(normalizedOrder, state.customOrder)) {
        state.customOrder = normalizedOrder;
        persist();
      }
      renderButtons();
    }

    function setButtonDraggingState(isDragging){
      buttonDragInProgress = isDragging;
      buttonsWrap.classList.toggle('tabnav-buttons-dragging', isDragging);
    }

    function destroyButtonsSortable(){
      if (buttonsSortable) {
        buttonsSortable.destroy();
        buttonsSortable = null;
      }
    }

    function canReorderTabs(tabList){
      return state.mode === 'all'
        && state.allowDrag
        && !isLayoutLocked()
        && (!Array.isArray(state.customOrder) || !state.customOrder.length)
        && Array.isArray(tabList)
        && tabList.length > 1
        && typeof Sortable !== 'undefined';
    }

    function setupButtonsSortable(tabList){
      const draggable = canReorderTabs(tabList);
      destroyButtonsSortable();
      if (!draggable) return;
      buttonsSortable = Sortable.create(buttonsWrap, {
        animation: 150,
        ghostClass: 'tabnav-button-ghost',
        handle: '.tabnav-button-handle',
        onStart: () => setButtonDraggingState(true),
        onEnd: (evt) => {
          setButtonDraggingState(false);
          handleButtonReorder(evt);
        }
      });
    }

    function handleButtonReorder(evt){
      if (!evt || evt.oldIndex === undefined || evt.newIndex === undefined) return;
      if (evt.oldIndex === evt.newIndex) return;
      if (typeof window.handleTabReorder === 'function') {
        window.handleTabReorder({ oldIndex: evt.oldIndex, newIndex: evt.newIndex });
      }
    }

    function isLayoutLocked(){
      const sidebarEl = document.getElementById('sidebar');
      if (sidebarEl && sidebarEl.classList) {
        return sidebarEl.classList.contains('collapsed');
      }
      if (typeof window !== 'undefined' && typeof window.isSidebarOpen === 'boolean') {
        return !window.isSidebarOpen;
      }
      return false;
    }

    function renderButtons(){
      currentTabs = readTabs();
      const defaultOrderMap = buildDefaultOrderMap(currentTabs);
      const { resolved, normalized } = resolveSelection(state.selectedTabs, currentTabs);
      let stateChanged = false;
      if (!Array.isArray(state.customOrder)) {
        state.customOrder = [];
        stateChanged = true;
      } else if (state.customOrder.length) {
        const normalizedOrder = uniqueSelection(normalizeSelection(state.customOrder));
        if (!selectionsEqual(normalizedOrder, state.customOrder)) {
          state.customOrder = normalizedOrder;
          stateChanged = true;
        }
      }
      if (state.mode === 'custom' && !selectionsEqual(normalized, state.selectedTabs)) {
        state.selectedTabs = uniqueSelection(normalized);
        stateChanged = true;
      }
      let tabsToDisplay = state.mode === 'custom' ? resolved.slice() : currentTabs.slice();
      if (syncCustomOrderWithDisplayedTabs(state, tabsToDisplay)) {
        stateChanged = true;
      }
      const orderedTabs = applyOrdering(tabsToDisplay, state.customOrder, defaultOrderMap);

      buttonsWrap.innerHTML = '';
      buttonsWrap.dataset.pattern = state.pattern;
      const isLocked = isLayoutLocked();
      const dragEnabled = canReorderTabs(orderedTabs);
      const showHandle = state.allowDrag && !isLocked;
      if (orderedTabs.length) {
        buttonsWrap.style.display = '';
        emptyState.style.display = 'none';
        orderedTabs.forEach(tab => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tabnav-button';
          btn.dataset.tabIndex = String(tab.index);
          btn.dataset.draggable = dragEnabled ? 'true' : 'false';
          const label = document.createElement('span');
          label.className = 'tabnav-button-label';
          label.textContent = tab.name;
          btn.appendChild(label);
          if (showHandle) {
            const handle = document.createElement('span');
            handle.className = 'tabnav-button-handle';
            handle.textContent = '⋮⋮';
            handle.setAttribute('aria-hidden', 'true');
            handle.title = dragEnabled ? 'Ziehen, um Tabs zu verschieben' : 'Drag nur in „Alle Tabs“ ohne eigene Sortierung';
            btn.appendChild(handle);
          }
          if (tab.isActive) {
            btn.classList.add('tabnav-button-active');
            btn.setAttribute('aria-current', 'page');
          }
          btn.addEventListener('click', () => {
            if (buttonDragInProgress) return;
            try {
              if (typeof window.activateTab === 'function') {
                window.activateTab(tab.index);
              } else {
                const tabsContainer = document.getElementById('tabs-container');
                const target = tabsContainer?.querySelector(`.tab-item[data-tab-index="${tab.index}"]`);
                if (target) target.dispatchEvent(new Event('click', { bubbles: true }));
              }
            } catch (err) {
              console.warn('TabNavigator: Konnte Tab nicht aktivieren', err);
            }
          });
          btn.addEventListener('dblclick', () => {
            if (buttonDragInProgress) return;
            try {
              if (typeof window.renameTab === 'function') {
                window.renameTab(tab.index);
              }
            } catch (err) {
              console.warn('TabNavigator: Konnte Tab nicht umbenennen', err);
            }
          });
          buttonsWrap.appendChild(btn);
        });
      } else {
        buttonsWrap.style.display = 'none';
        emptyState.style.display = '';
        emptyState.textContent = currentTabs.length
          ? 'Keine Tabs ausgewählt.'
          : 'Keine Tabs verfügbar.';
      }
      applyPatternLabel();
      applyHeaderVisibility();
      syncDisplayToggles();
      updateOverlayTabs();
      updatePatternRadios();
      updateModeRadios();
      setupButtonsSortable(orderedTabs);
      if (stateChanged) persist();
    }

    function handlePatternChange(event){
      if (!event.target.checked) return;
      state.pattern = event.target.value;
      persist();
      renderButtons();
    }

    function handleModeChange(event){
      if (!event.target.checked) return;
      state.mode = event.target.value === 'custom' ? 'custom' : 'all';
      if (state.mode === 'all') {
        state.selectedTabs = [];
      }
      persist();
      renderButtons();
    }

    patternRadios.forEach(radio => radio.addEventListener('change', handlePatternChange));
    modeRadios.forEach(radio => radio.addEventListener('change', handleModeChange));
    Object.entries(displayToggleInputs).forEach(([key, input]) => {
      if (!input) return;
      input.addEventListener('change', () => {
        state[key] = !!input.checked;
        persist();
        applyPatternLabel();
        applyHeaderVisibility();
        syncDisplayToggles();
        if (key === 'allowDrag') {
          renderButtons();
        }
      });
    });

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        currentTabs = readTabs();
        if (!currentTabs.length) return;
        state.mode = 'custom';
        state.selectedTabs = currentTabs.map(tab => ({ index: tab.index, name: tab.name }));
        persist();
        renderButtons();
      });
    }

    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        state.mode = 'all';
        state.selectedTabs = [];
        persist();
        renderButtons();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.mode = 'custom';
        state.selectedTabs = [];
        persist();
        renderButtons();
      });
    }

    function handleSurfaceContextMenu(event){
      event.preventDefault();
      const trigger = event.target instanceof HTMLElement ? event.target : surface;
      openOverlay(trigger);
    }

    function handleSurfaceKey(event){
      if (event.key === 'ContextMenu' || event.key === 'Apps' || (event.key === 'F10' && event.shiftKey)) {
        event.preventDefault();
        const trigger = event.target instanceof HTMLElement ? event.target : surface;
        openOverlay(trigger);
      }
    }

    surface.title = 'Rechtsklick für Einstellungen';
    surface.addEventListener('contextmenu', handleSurfaceContextMenu);
    surface.addEventListener('keydown', handleSurfaceKey);

    if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
    if (doneBtn) doneBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeOverlay();
    });
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
      }
    });

    function attachObserver(){
      const containerEl = document.getElementById('tabs-container');
      if (!containerEl || typeof MutationObserver === 'undefined') return;
      observer = new MutationObserver(() => {
        renderButtons();
      });
      observer.observe(containerEl, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    }

    function attachSidebarObserver(){
      const sidebarEl = document.getElementById('sidebar');
      if (!sidebarEl || typeof MutationObserver === 'undefined') return;
      sidebarObserver = new MutationObserver(() => {
        renderButtons();
      });
      sidebarObserver.observe(sidebarEl, { attributes: true, attributeFilter: ['class'] });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        renderButtons();
        attachObserver();
        attachSidebarObserver();
      }, { once: true });
    } else {
      renderButtons();
      attachObserver();
      attachSidebarObserver();
    }

    if (!observer && typeof window !== 'undefined') {
      containerCheckTimer = window.setInterval(() => {
        const el = document.getElementById('tabs-container');
        if (el) {
          renderButtons();
          attachObserver();
          if (containerCheckTimer) {
            clearInterval(containerCheckTimer);
            containerCheckTimer = null;
          }
        }
      }, 800);
    }

    root.__tabNavCleanup = () => {
      if (observer) observer.disconnect();
      if (sidebarObserver) sidebarObserver.disconnect();
      if (containerCheckTimer) clearInterval(containerCheckTimer);
      destroyButtonsSortable();
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (!document.querySelector('.tabnav-overlay.open')) {
        document.body.classList.remove('tabnav-modal-open');
      }
    };
  };
})();
