/* Ops Panel — extended with toggleable links and Testreport deeplink */
// v5.0 – Config-Palette-Sync über JSON
(function () {
  // ---------- styles ----------
  if (!document.getElementById('ops-panel-styles')) {
    const css = `
    .ops-root{ height:100%; }
    .ops-outer{ height:100%; width:100%; padding:.6rem; box-sizing:border-box; overflow:hidden; position:relative; display:flex; flex-direction:column; gap:.6rem; color:var(--lbp-main-text, var(--module-header-text,#fff)); }
    .ops-header{
      display:flex; align-items:center; justify-content:space-between; gap:.75rem;
      padding:.55rem .95rem; border-radius:calc(var(--module-border-radius, 1.25rem) - .25rem);
      background:var(--lbp-header-bg, rgba(21,45,76,.86));
      color:var(--lbp-header-text, #f8fafc); font-size:clamp(1rem, 1.1vw + .4vh, 1.25rem); font-weight:700;
      letter-spacing:.4px; text-transform:uppercase; box-shadow:0 12px 28px rgba(12,24,41,.45);
      border:1px solid var(--lbp-header-border, rgba(76,114,163,.32));
    }
    .ops-title{ display:flex; align-items:center; gap:.45rem; }
    .ops-title::before{
      content:'🔗'; font-size:1.05em; filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));
    }
    .ops-actions{ display:flex; align-items:center; gap:.45rem; }
    .ops-autorefresh{
      display:inline-flex; align-items:center; gap:.4rem;
      padding:.35rem .9rem; border-radius:999px;
      color:var(--lbp-accent-text,#fff);
      background:var(--lbp-accent-bg, rgba(37,99,235,.92)); box-shadow:0 8px 18px rgba(15,23,42,.28);
      font-size:.78rem; font-weight:600; letter-spacing:.25px;
      cursor:default; transition:opacity .15s ease, box-shadow .15s ease;
    }
    .ops-autorefresh[data-state="active"]{ opacity:1; }
    .ops-autorefresh[data-state="idle"],
    .ops-autorefresh[data-state="paused"]{ opacity:.7; }
    .ops-autorefresh[data-state="error"]{ background:rgba(185,28,28,.94); }
    .ops-autorefresh .ops-autorefresh-icon{ font-size:1rem; line-height:1; }
    .ops-autorefresh .ops-autorefresh-label{ font-weight:700; }
    .ops-autorefresh .ops-autorefresh-time{ font-size:.72rem; font-weight:500; opacity:.85; }
    .ops-grid{
      flex:1; min-height:0; box-sizing:border-box; display:grid;
      grid-template-columns: 1fr 1fr; grid-template-rows: repeat(6, 1fr);
      gap:.6rem;
      grid-template-areas:
        "leftTop r0"
        "leftTop r1"
        "leftBot r2"
        "leftBot r3"
        "leftBot r4"
        "leftBot r5";
    }
    .ops-compact .ops-grid{
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(2, 1fr);
      grid-template-areas:
        "leftTop r0 r2 r4"
        "leftBot r1 r3 r5";
    }
    .ops-card{
      width:100%; height:100%; box-sizing:border-box;
      background:var(--lbp-card-bg, rgba(21,45,76,.82));
      border: 1px solid var(--lbp-card-border, rgba(76,114,163,.34));
      border-radius: var(--module-border-radius, 1.25rem);
      color: var(--lbp-card-text, var(--module-header-text,#fff));
      display:flex; align-items:center; justify-content:center;
      padding:.5rem 1rem; font-weight:600; letter-spacing:.2px;
      font-size: clamp(.9rem, 1.1vw + .4vh, 1.25rem);
      user-select:none; text-align:center;
      transition: transform .12s ease, box-shadow .12s ease, background-color .12s ease, border-color .12s ease;
      box-shadow: var(--lbp-card-shadow, 0 16px 34px rgba(12,24,41,.45));
    }
    .ops-card:hover{
      transform: translateY(-1px);
      box-shadow: var(--lbp-card-shadow-hover, 0 20px 40px rgba(15,23,42,.45));
      border-color: var(--lbp-card-hover-border, rgba(37,99,235,.45));
    }
    .ops-card:active{
      transform: translateY(0);
      filter:none;
      background: var(--lbp-card-active-bg, rgba(37,99,235,.32));
    }
    .leftTop{ grid-area:leftTop; } .leftBot{ grid-area:leftBot; }
    .r0{ grid-area:r0; } .r1{ grid-area:r1; } .r2{ grid-area:r2; } .r3{ grid-area:r3; } .r4{ grid-area:r4; } .r5{ grid-area:r5; }
    .ops-bounce{ animation: ops-bounce .25s ease; }
    @keyframes ops-bounce { 0%{transform:scale(1)} 50%{transform:scale(1.02)} 100%{transform:scale(1)} }

    .ops-settings-overlay{position:fixed; inset:0; display:none; align-items:center; justify-content:center; z-index:3200; padding:2rem;
      background:rgba(15,23,42,.55); backdrop-filter:blur(18px);}
    .ops-settings-overlay.open{display:flex;}
    .ops-settings-dialog{width:min(780px, 96vw); max-height:92vh; display:flex; flex-direction:column;
      background:rgba(15,23,42,.92); color:var(--lbp-header-text,#f8fafc);
      border-radius:1.35rem; border:1px solid rgba(148,163,184,.25); box-shadow:0 30px 60px rgba(8,15,35,.46);}
    .ops-settings-header{display:flex; align-items:center; justify-content:space-between; gap:.75rem;
      padding:1.2rem 1.6rem 1rem; border-bottom:1px solid rgba(148,163,184,.24);}
    .ops-settings-title{margin:0; font-size:1.28rem; font-weight:700; letter-spacing:.35px;}
    .ops-settings-subtitle{margin:.15rem 0 0; font-size:.86rem; opacity:.75;}
    .ops-settings-close{border:none; background:rgba(15,23,42,.65); color:inherit; font-size:1.45rem; line-height:1;
      border-radius:.75rem; width:2.4rem; height:2.4rem; display:inline-flex; align-items:center; justify-content:center;
      cursor:pointer; transition:background .15s ease, transform .15s ease;}
    .ops-settings-close:hover{background:rgba(37,99,235,.35); transform:translateY(-1px);}
    .ops-settings-close:active{transform:none;}
    .ops-settings-body{flex:1; min-height:0; overflow:auto; padding:1.3rem 1.6rem 1.4rem; display:flex; flex-direction:column; gap:1.2rem;}
    .ops-settings-body hr{border:none; border-top:1px solid rgba(148,163,184,.2); margin:.6rem 0;}
    .ops-tabs{display:flex; gap:.45rem; padding:0 0 .35rem; border-bottom:1px solid rgba(148,163,184,.18);}
    .ops-tab-btn{display:inline-flex; align-items:center; justify-content:center; padding:.45rem .85rem; background:transparent;
      color:inherit; border:none; border-bottom:2px solid transparent; border-radius:.55rem .55rem 0 0; font-weight:600;
      font-size:.92rem; cursor:pointer; transition:color .15s ease, border-color .15s ease, background .15s ease;}
    .ops-tab-btn:hover{background:rgba(148,163,184,.14);}
    .ops-tab-btn.active{border-bottom-color:var(--lbp-accent-bg, rgba(59,130,246,.95));
      color:var(--lbp-accent-bg, rgba(59,130,246,.95));}
    .ops-tab{display:none;}
    .ops-tab.active{display:block;}
    .ops-tab-buttons{display:none; gap:.35rem; padding-top:.35rem;}
    .ops-tab-buttons.active{display:grid;}
    .ops-tab-buttons label{display:flex; align-items:center; gap:.5rem; padding:.45rem .65rem; border-radius:.65rem;
      background:rgba(15,23,42,.55); border:1px solid rgba(148,163,184,.22); font-size:.95rem; cursor:pointer;
      transition:border-color .15s ease, background .15s ease;}
    .ops-tab-buttons label:hover{border-color:var(--lbp-accent-bg, rgba(59,130,246,.65)); background:rgba(37,99,235,.22);}
    .ops-tab-buttons input{width:1.1rem; height:1.1rem;}
    .ops-tab-buttons .ops-action-button{margin-top:.45rem;}
    .ops-tab-filters{display:none; flex-direction:column; gap:.65rem; padding-top:.45rem;}
    .ops-tab-filters.active{display:flex;}
    .ops-filter-hint{font-size:.82rem; opacity:.75;}
    .ops-filter-list{display:flex; flex-direction:column; gap:.45rem; max-height:280px; overflow:auto;}
    .ops-filter-row{padding:0;}
    .ops-filter-row input{width:100%; padding:.55rem .75rem; border-radius:.65rem; border:1px solid rgba(148,163,184,.35);
      background:rgba(15,23,42,.58); color:inherit; font-size:.9rem; box-sizing:border-box;}
    .ops-filter-row input:focus{outline:2px solid rgba(59,130,246,.55); outline-offset:2px;}
    .ops-filter-actions{display:flex; justify-content:flex-end;}
    .ops-title-section{display:flex; flex-direction:column; gap:.55rem; padding:.85rem .95rem; border-radius:.95rem;
      border:1px solid rgba(148,163,184,.22); background:rgba(15,23,42,.52);}
    .ops-title-section label{font-weight:600; font-size:.92rem;}
    .ops-input-row{display:flex; align-items:center; gap:.55rem; flex-wrap:wrap;}
    .ops-title-input{flex:1 1 220px; min-width:0; padding:.55rem .75rem; border-radius:.65rem; border:1px solid rgba(148,163,184,.35);
      background:rgba(15,23,42,.58); color:inherit; font-size:.95rem;}
    .ops-input-row .ops-action-button{flex:0 0 auto; width:auto; white-space:nowrap; padding:.55rem 1.1rem;}
    .ops-title-input:focus{outline:2px solid rgba(59,130,246,.55); outline-offset:2px;}
    .ops-input-hint{margin:0; font-size:.78rem; opacity:.72;}
    .ops-tab-colors{display:none; flex-direction:column; gap:1rem; padding-top:.45rem;}
    .ops-tab-colors.active{display:flex;}
    .ops-color-delegate{display:flex; flex-direction:column; gap:.75rem; padding:1rem 1.1rem; border-radius:.95rem; border:1px solid rgba(148,163,184,.22); background:rgba(15,23,42,.55); color:inherit;}
    .ops-color-delegate p{margin:0; font-size:.9rem; line-height:1.5; color:rgba(226,232,240,.88);}
    .ops-color-summary{display:flex; flex-direction:column; gap:.6rem;}
    .ops-color-summary-row{display:flex; align-items:center; gap:.6rem; padding:.55rem .7rem; border-radius:.75rem; border:1px solid rgba(148,163,184,.22); background:rgba(15,23,42,.48); box-shadow:inset 0 1px 0 rgba(255,255,255,.04);}
    .ops-color-summary-row .ops-color-chip{width:1.1rem; height:1.1rem; border-radius:50%; border:2px solid rgba(255,255,255,.68); box-shadow:0 0 0 1px rgba(15,23,42,.35); background:transparent;}
    .ops-color-summary-text{display:flex; flex-direction:column; gap:.15rem; min-width:0;}
    .ops-color-summary-label{font-size:.78rem; opacity:.72;}
    .ops-color-summary-value{font-weight:600; font-size:.95rem; color:rgba(226,232,240,.92);}
    .ops-color-actions{display:flex; gap:.65rem; flex-wrap:wrap;}
    .ops-color-actions .ops-action-button{width:auto;}
    .ops-aspen-section{margin-top:1.2rem; padding:1rem 1.1rem; border-radius:.95rem; border:1px solid rgba(148,163,184,.22);
      background:rgba(15,23,42,.55); display:flex; flex-direction:column; gap:.55rem;}
    .ops-aspen-section .ops-action-button{width:auto; align-self:flex-start;}
    .ops-color-empty{font-size:.85rem; opacity:.75; padding:.15rem .15rem 0;}
    .ops-file{padding:.35rem .65rem 0; font-size:.85rem; opacity:.82;}
    .ops-file-hint{padding:.15rem .65rem .1rem; font-size:.78rem; opacity:.72;}
    .ops-action-button{display:inline-flex; align-items:center; justify-content:center; gap:.35rem; padding:.55rem .9rem;
      border-radius:.75rem; border:none; font-weight:600; cursor:pointer;
      background:var(--lbp-accent-bg, rgba(59,130,246,.92)); color:var(--lbp-accent-text,#fff);
      box-shadow:0 14px 28px rgba(8,15,35,.32); transition:filter .15s ease, transform .15s ease, box-shadow .15s ease;}
    .ops-action-button:hover{filter:brightness(1.05); transform:translateY(-1px);}
    .ops-action-button:active{transform:none; box-shadow:none;}
    .ops-action-button:disabled{opacity:.55; cursor:not-allowed;}
    .ops-action-button.ops-secondary{background:rgba(148,163,184,.2); color:inherit; box-shadow:none;}
    .ops-action-button.ops-secondary:hover{filter:brightness(1.05); transform:translateY(-1px);}
    .ops-action-button.ops-secondary:active{transform:none; box-shadow:none;}
    .ops-settings-body .ops-action-button{width:100%;}
    .ops-settings-footer{display:flex; justify-content:flex-end; gap:.75rem; padding:0 1.6rem 1.4rem;
      border-top:1px solid rgba(148,163,184,.18);}
    .ops-settings-footer .ops-action-button{width:auto; box-shadow:none;}
    body.ops-settings-open{overflow:hidden;}
    .ops-color-overlay{position:fixed; inset:0; padding:1.5rem; box-sizing:border-box; display:none; align-items:center; justify-content:center; background:rgba(15,23,42,.55); z-index:2500;}
    .ops-color-overlay.open{display:flex;}
    .ops-color-dialog{width:min(520px, 92vw); max-height:92vh; overflow:auto; background:var(--sidebar-module-card-bg,#fff); color:var(--sidebar-module-card-text,#111); border-radius:.95rem; box-shadow:0 24px 52px rgba(15,23,42,.32); display:flex; flex-direction:column;}
    .ops-color-header{display:flex; align-items:center; justify-content:space-between; gap:.75rem; padding:1rem 1.25rem .75rem; border-bottom:1px solid var(--border-color,#e5e7eb);}
    .ops-color-title{margin:0; font-size:1.12rem; font-weight:700;}
    .ops-color-dismiss{border:none; background:transparent; font-size:1.45rem; line-height:1; color:inherit; padding:.15rem .4rem; border-radius:.55rem; cursor:pointer;}
    .ops-color-dismiss:hover{background:rgba(148,163,184,.18);}
    .ops-color-body{padding:1rem 1.25rem; display:flex; flex-direction:column; gap:1rem;}
    .ops-color-section{display:flex; flex-direction:column; gap:.35rem;}
    .ops-color-label{font-weight:600; font-size:.95rem;}
    .ops-color-hint{font-size:.78rem; color:rgba(15,23,42,.62);}
    .ops-color-select{width:100%; padding:.55rem .7rem; border-radius:.6rem; border:1px solid var(--border-color,#d1d5db); background:var(--sidebar-module-card-bg,#fff); color:inherit; font:inherit;}
    .ops-color-preview{display:flex; align-items:center; gap:.45rem; padding:.4rem .5rem; border-radius:.65rem; background:rgba(148,163,184,.12); border:1px solid rgba(148,163,184,.28); font-size:.78rem; color:rgba(15,23,42,.75);}
    .ops-color-chip{width:1.1rem; height:1.1rem; border-radius:50%; border:2px solid rgba(255,255,255,.7); box-shadow:0 0 0 1px rgba(15,23,42,.18); background:transparent;}
    .ops-color-preview-label{flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
    .ops-color-footer{display:flex; align-items:center; justify-content:flex-end; gap:.65rem; padding:.75rem 1.25rem 1.1rem; border-top:1px solid var(--border-color,#e5e7eb);}
    .ops-color-reset{border:none; border-radius:.65rem; padding:.55rem .95rem; font-weight:600; background:rgba(148,163,184,.18); color:rgba(15,23,42,.85); cursor:pointer;}
    .ops-color-reset:hover{background:rgba(148,163,184,.28);}
    .ops-color-done{border:none; border-radius:.65rem; padding:.55rem 1rem; font-weight:600; background:var(--button-bg,#2563eb); color:var(--button-text,#fff); cursor:pointer;}
    .ops-color-done:hover{filter:brightness(.95);}
    `;
    const tag = document.createElement('style');
    tag.id = 'ops-panel-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  (function preInitLayerColorSync() {
    try {
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      const storedColors = JSON.parse(localStorage.getItem('linkbuttonsplus-colors-v1') || '{}');
      const layers = storedColors?.layers || storedColors;

      if (!layers || typeof layers !== 'object') {
        console.log('[LayerSync] No stored named layers to apply (safe mode)');
        return;
      }

      const idxFromName = (name) => {
        const match = String(name).match(/(\d+)\s*$/);
        if (!match) return null;
        return Math.max(1, Math.min(15, parseInt(match[1], 10)));
      };

      Object.entries(layers).forEach(([name, hsla]) => {
        if (typeof hsla !== 'string' || !hsla.includes('hsl')) return;
        const idx = idxFromName(name);
        if (!idx) {
          console.log('[LayerSync] Skip non-indexed layer name:', name);
          return;
        }

        const bgKey = `--module-layer-${idx}-module-bg`;
        const current = cs.getPropertyValue(bgKey).trim();
        const isDefault = !current || /^hsla?\(\s*0\s*,\s*0%?\s*,\s*100%/i.test(current);

        if (!isDefault) {
          console.log(`[LayerSync] Kept existing index ${idx} (already set): ${current}`);
          return;
        }

        root.style.setProperty(bgKey, hsla);
        root.style.setProperty(`--module-layer-${idx}-header-bg`, hsla);

        const lightnessMatch = hsla.match(/\(\s*\d+\s*,\s*\d+%?\s*,\s*(\d+)%/);
        const lightness = lightnessMatch ? parseFloat(lightnessMatch[1]) : 50;
        const textColor = lightness > 55 ? '#0f172a' : '#f8fafc';
        root.style.setProperty(`--module-layer-${idx}-module-text`, textColor);
        root.style.setProperty(`--module-layer-${idx}-header-text`, textColor);

        console.log(`[LayerSync] Applied layer ${name} -> index ${idx}: ${hsla}`);
      });

      console.log('[LayerSync] Safe layer apply completed (no blanket overrides).');
    } catch (err) {
      console.error('[LayerSync] Safe layer apply failed:', err);
    }
  })();

  // ---------- storage helpers ----------
  const LS_KEY = 'module_data_v1';
  const IDB_NAME = 'modulesApp';
  const IDB_STORE = 'fs-handles';
  const GLOBAL_ASPEN_KEY = 'linkbuttonsplus-aspen';
  const SHEET_NAME = 'records';
  const HEAD_OPTIONS = {
    meldung: ['meldung','meldungsno','meldungno','meldungsnummer','meldungnr'],
    auftrag: ['auftrag','auftragsno','auftragno','auftragsnummer','auftragsnr','auftragnummer'],
    part: ['part','partno','material','materialno','materialnr','materialnummer','matnr','pn'],
    serial: ['serial','serialno','serialnumber','serialnr','serialnummer','sn','snr']
  };
  const WORKFORCE_FILTER_KEY = 'linkbuttonsplus-filters';
  const COLOR_CONFIG_KEY = 'linkbuttonsplus-colors-v1';
  const COLOR_AREAS = ['main','header','buttons'];
  const FARBLAYER_MODULE_NAME = 'LinkButtonsPlus';
  const FARBLAYER_GROUPS = {
    main: 'Hauptoberfläche',
    header: 'Header',
    buttons: 'Aktionselemente'
  };
  const FARBLAYER_STORAGE_KEY = `flvGroups:${FARBLAYER_MODULE_NAME}`;
  const FARBLAYER_VIEWER_SCRIPT_URL = 'modules/FarblayerViewer/FarblayerViewer.js';
  const FARBLAYER_VIEWER_HOST_ID = 'farblayer-viewer-host';

  function clampNumber(value, min, max){
    if (typeof value !== 'number' || Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
  }

  function loadColorConfig(){
    try{
      const raw = localStorage.getItem(COLOR_CONFIG_KEY);
      if(!raw) return {};
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : {};
    }catch{}
    return {};
  }

  function saveColorConfig(value){
    try{
      localStorage.setItem(COLOR_CONFIG_KEY, JSON.stringify(value));
    }catch{}
  }

  function getDefaultFarblayerState(){
    return {
      groups: Object.values(FARBLAYER_GROUPS),
      assignments: {}
    };
  }

  function ensureFarblayerViewerReady(){
    if(typeof window === 'undefined' || typeof document === 'undefined'){
      return Promise.resolve(false);
    }

    const initializeInstance = () => {
      try{
        if(typeof window.renderFarblayerViewer === 'function'){
          let host = document.getElementById(FARBLAYER_VIEWER_HOST_ID);
          if(!host){
            host = document.createElement('div');
            host.id = FARBLAYER_VIEWER_HOST_ID;
            host.style.display = 'none';
            document.body.appendChild(host);
          }
          if(!host.dataset.initialized){
            window.renderFarblayerViewer(host);
            host.dataset.initialized = 'true';
          }
        }
      }catch(err){
        console.warn('[LinkButtonsPlus] Farblayer-Viewer konnte nicht initialisiert werden:', err);
        return false;
      }
      return typeof window.openFarblayerViewer === 'function';
    };

    if(typeof window.openFarblayerViewer === 'function'){
      return Promise.resolve(initializeInstance());
    }

    if(typeof window.renderFarblayerViewer === 'function'){
      return Promise.resolve(initializeInstance());
    }

    return new Promise(resolve => {
      const finalize = () => resolve(initializeInstance());
      const fail = () => resolve(false);
      let script = document.querySelector('script[data-farblayer-viewer]');
      if(script){
        script.addEventListener('load', finalize, { once:true });
        script.addEventListener('error', fail, { once:true });
        return;
      }
      script = document.createElement('script');
      script.src = FARBLAYER_VIEWER_SCRIPT_URL;
      script.async = false;
      script.dataset.farblayerViewer = 'true';
      script.addEventListener('load', finalize, { once:true });
      script.addEventListener('error', () => {
        console.warn('[LinkButtonsPlus] Farblayer-Viewer-Skript konnte nicht geladen werden.');
        fail();
      }, { once:true });
      document.head.appendChild(script);
    });
  }

  function loadFarblayerState(){
    const fallback = getDefaultFarblayerState();
    try{
      const raw = localStorage.getItem(FARBLAYER_STORAGE_KEY);
      if(!raw) return fallback;
      const parsed = JSON.parse(raw);
      if(!parsed || typeof parsed !== 'object') return fallback;
      const groups = Array.isArray(parsed.groups)
        ? parsed.groups.map(value => typeof value === 'string' ? value.trim() : '').filter(Boolean)
        : [];
      const assignmentsRaw = parsed.assignments && typeof parsed.assignments === 'object'
        ? parsed.assignments
        : {};
      const assignments = {};
      Object.entries(assignmentsRaw).forEach(([groupName, layerName]) => {
        if(typeof groupName === 'string' && groupName.trim() && typeof layerName === 'string' && layerName.trim()){
          assignments[groupName.trim()] = layerName.trim();
        }
      });
      return {
        groups: groups.length ? groups : fallback.groups,
        assignments
      };
    }catch{}
    return fallback;
  }

  function saveFarblayerState(state){
    const base = getDefaultFarblayerState();
    const groups = Array.isArray(state?.groups) && state.groups.length ? state.groups : base.groups;
    const assignments = state && typeof state.assignments === 'object' ? state.assignments : {};
    const payload = {
      groups: groups.map(value => typeof value === 'string' ? value : '').filter(Boolean),
      assignments: {}
    };
    Object.entries(assignments).forEach(([groupName, layerName]) => {
      if(typeof groupName === 'string' && groupName.trim() && typeof layerName === 'string' && layerName.trim()){
        payload.assignments[groupName.trim()] = layerName.trim();
      }
    });
    try{
      localStorage.setItem(FARBLAYER_STORAGE_KEY, JSON.stringify(payload));
    }catch{}
    return {
      groups: payload.groups.length ? payload.groups : base.groups,
      assignments: { ...payload.assignments }
    };
  }

  function broadcastFarblayerStateChange(state){
    if(typeof window === 'undefined') return;
    const detail = {
      module: FARBLAYER_MODULE_NAME,
      groups: Array.isArray(state?.groups) ? state.groups.slice() : [],
      assignments: state?.assignments && typeof state.assignments === 'object'
        ? { ...state.assignments }
        : {}
    };
    try{
      window.dispatchEvent(new CustomEvent('farblayer-groups-changed', { detail }));
    }catch{}
  }

  function migrateLegacyColorSelection(instanceId){
    const legacyStore = loadColorConfig();
    const entry = legacyStore?.[instanceId];
    if(!entry || typeof entry !== 'object') return;
    const nextAssignments = {};
    COLOR_AREAS.forEach(area => {
      const legacyValue = normalizeDropdownValue(entry[area]);
      const groupName = FARBLAYER_GROUPS[area];
      if(groupName && legacyValue){
        nextAssignments[groupName] = legacyValue;
      }
    });
    if(Object.keys(nextAssignments).length){
      const current = loadFarblayerState();
      const merged = {
        groups: current.groups,
        assignments: { ...current.assignments, ...nextAssignments }
      };
      const persisted = saveFarblayerState(merged);
      broadcastFarblayerStateChange(persisted);
    }
    try{
      delete legacyStore[instanceId];
      saveColorConfig(legacyStore);
    }catch{}
  }

  const DROPDOWN_DEFAULT_VALUE = 'standard';
  const PALETTE_URL = 'configs/FarblayerConfig.json';
  const LBP_MAP_KEY = 'linkbuttonsplus-layer-map-v1';
  let cachedPaletteSignature = '';
  const paletteUpdateListeners = new Set();

  const DEFAULT_LAYER_TITLES = {
    1: 'Hauptmodul (Rahmen & Hintergrund)',
    2: 'Header (Titelzeile & Status)',
    3: 'Buttons (Karten & Aktionen)',
    4: 'Sekundäre Infoflächen',
    5: 'Hervorhebungen',
    6: 'Navigationsleisten',
    7: 'Modale Hintergründe',
    8: 'Listen & Tabellen',
    9: 'Inputs & Felder',
    10: 'Tooltips & Hinweise'
  };

  function inferLayerIndexFromName(name){
    if(typeof name !== 'string') return null;
    const trimmed = name.trim();
    if(!trimmed) return null;
    let match = trimmed.match(/unter-layer-(\d+)/i);
    if(match){
      const parsed = parseInt(match[1], 10);
      if(Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    match = trimmed.match(/layer-?(\d+)/i);
    if(match){
      const parsed = parseInt(match[1], 10);
      if(Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    match = trimmed.match(/(\d+)/);
    if(match){
      const parsed = parseInt(match[1], 10);
      if(Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return null;
  }

  function isValidHsla(value){
    return typeof value === 'string' && /^hsla?\(/i.test(value.trim());
  }

  function pickHsla(...values){
    for(const value of values){
      if(isValidHsla(value)){
        return value.trim();
      }
    }
    return '';
  }

  function isColorDescriptor(value){
    if(!value || typeof value !== 'object') return false;
    const colorKeys = ['background','text','border','color','hsla','moduleBg','moduleText','moduleBorder','bg'];
    return colorKeys.some(key => typeof value[key] === 'string');
  }

  function normalizeColorEntry(sourceName, rawValue, group, order, existing){
    if(!rawValue || typeof rawValue !== 'object') return null;
    const candidates = [rawValue.id, rawValue.name, sourceName];
    let identifier = '';
    for(const candidate of candidates){
      const sanitized = sanitizeId(typeof candidate === 'string' ? candidate : '');
      if(sanitized){
        identifier = sanitized;
        break;
      }
    }
    if(!identifier) return null;
    if(existing && existing[identifier]){
      let suffix = 2;
      let next = `${identifier}-${suffix}`;
      while(existing[next]){
        suffix += 1;
        next = `${identifier}-${suffix}`;
      }
      identifier = next;
    }

    const background = pickHsla(rawValue.background, rawValue.color, rawValue.hsla, rawValue.moduleBg, rawValue.bg);
    if(!background) return null;
    const textColor = pickHsla(rawValue.text, rawValue.textColor, rawValue.moduleText);
    const borderColor = pickHsla(rawValue.border, rawValue.borderColor, rawValue.moduleBorder);

    const explicitTitle = typeof rawValue.title === 'string' ? rawValue.title.trim() : '';
    const displayName = typeof rawValue.displayName === 'string' ? rawValue.displayName.trim() : '';
    const fallbackName = typeof sourceName === 'string' ? sourceName.trim() : '';
    const title = explicitTitle || displayName || fallbackName || identifier;
    const groupName = typeof rawValue.group === 'string' && rawValue.group.trim()
      ? rawValue.group.trim()
      : (typeof group === 'string' && group.trim() ? group.trim() : '');

    const explicitIndex = Number.isFinite(rawValue.index) && rawValue.index > 0 ? Math.floor(rawValue.index) : null;
    const inferredIndex = explicitIndex || inferLayerIndexFromName(identifier);

    const meta = rawValue.__meta && typeof rawValue.__meta === 'object'
      ? { ...rawValue.__meta }
      : null;

    const entry = {
      name: identifier,
      title,
      displayName: displayName || fallbackName || title,
      color: background,
      textColor,
      borderColor,
      group: groupName,
      order,
      index: Number.isFinite(inferredIndex) && inferredIndex > 0 ? inferredIndex : null
    };

    if(meta){
      entry.meta = {
        ...meta,
        layerId: meta.layerId || identifier,
        layerName: meta.layerName || entry.displayName
      };
    }

    return entry;
  }

  function flattenPaletteSource(source){
    const flat = {};
    if(!source || typeof source !== 'object') return flat;
    let order = 0;
    const queue = [{ group: '', entries: Object.entries(source) }];

    while(queue.length){
      const { group, entries } = queue.shift();
      entries.forEach(([key, value]) => {
        if(!value || typeof value !== 'object') return;
        if(isColorDescriptor(value)){
          const entry = normalizeColorEntry(key, value, group || key, order, flat);
          order += 1;
          if(entry){
            flat[entry.name] = entry;
          }
          return;
        }
        const nextEntries = Object.entries(value);
        if(nextEntries.length){
          queue.push({ group: group || key, entries: nextEntries });
        }
      });
    }

    return flat;
  }

  function toTitleCase(value){
    return value.replace(/\b\w/g, char => char.toUpperCase());
  }

  function buildReadableTitle(name, index){
    const inferredIndex = Number.isFinite(index) && index > 0 ? Math.floor(index) : inferLayerIndexFromName(name);
    if(Number.isFinite(inferredIndex) && DEFAULT_LAYER_TITLES[inferredIndex]){
      return DEFAULT_LAYER_TITLES[inferredIndex];
    }
    const cleaned = typeof name === 'string' ? name.replace(/[-_]+/g, ' ').trim() : '';
    if(cleaned){
      return toTitleCase(cleaned);
    }
    if(Number.isFinite(inferredIndex)){
      return `Unter-Layer ${inferredIndex}`;
    }
    return 'Unter-Layer';
  }

  function countPaletteItems(layers){
    if(Array.isArray(layers)){
      return layers.length;
    }
    if(layers && typeof layers === 'object'){
      try {
        return Object.keys(layers).length;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  function applyPaletteMetadata(context = {}, entryCount = 0){
    if(typeof window === 'undefined') return;
    const ctx = (context && typeof context === 'object') ? context : {};
    const now = new Date();
    const loadedAt = ctx.loadedAt || now.toISOString();
    const basePath = typeof ctx.path === 'string' && ctx.path.trim()
      ? ctx.path.trim()
      : PALETTE_URL;
    const source = typeof ctx.source === 'string' && ctx.source.trim()
      ? ctx.source.trim()
      : 'unbekannt';
    const layerCount = Number.isFinite(ctx.layerCount) ? ctx.layerCount : entryCount;
    const meta = {
      path: basePath,
      source,
      loadedAt,
      layerCount,
      entryCount
    };
    try {
      window.__lbpPaletteMeta = meta;
    } catch {}
  }

  function getPaletteMetadata(){
    if(typeof window === 'undefined') return null;
    const meta = window.__lbpPaletteMeta;
    return (meta && typeof meta === 'object') ? meta : null;
  }

  function updateCachedPalette(layers, context){
    if(typeof window === 'undefined') return false;
    if(!window.__lbpPalette || typeof window.__lbpPalette !== 'object'){
      window.__lbpPalette = {};
    }

    const palette = flattenPaletteSource(layers);
    const serialized = JSON.stringify(palette);
    if(serialized === cachedPaletteSignature){
      return false;
    }
    cachedPaletteSignature = serialized;
    window.__lbpPalette = palette;
    try {
      window.__lbpPaletteSource = layers;
    } catch {}
    const entryCount = (() => {
      try {
        return Object.keys(palette).length;
      } catch {
        return 0;
      }
    })();
    const contextObject = (context && typeof context === 'object') ? context : {};
    applyPaletteMetadata({
      ...contextObject,
      layerCount: Number.isFinite(contextObject.layerCount) ? contextObject.layerCount : countPaletteItems(layers)
    }, entryCount);
    return true;
  }

  function notifyPaletteListeners(){
    if(!paletteUpdateListeners.size) return;
    const palette = (typeof window !== 'undefined' && window.__lbpPalette && typeof window.__lbpPalette === 'object')
      ? window.__lbpPalette
      : {};
    paletteUpdateListeners.forEach(listener => {
      try {
        listener(palette);
      } catch (err) {
        console.error('[LinkButtonsPlus] Palette listener failed:', err);
      }
    });
  }

  function onPaletteUpdated(listener){
    if(typeof listener !== 'function') return () => {};
    paletteUpdateListeners.add(listener);
    return () => {
      paletteUpdateListeners.delete(listener);
    };
  }

  function getLayerMap(){
    if(typeof window === 'undefined' || !window.localStorage) return {};
    try {
      const raw = window.localStorage.getItem(LBP_MAP_KEY);
      const parsed = raw ? JSON.parse(raw) || {} : {};
      if(parsed && typeof parsed === 'object'){
        Object.keys(parsed).forEach(key => {
          const value = sanitizeId(parsed[key]);
          if(!value){
            delete parsed[key];
            return;
          }
          const legacyMatch = value.match(/^layer-?(\d+)$/i);
          if(legacyMatch){
            const parsedIndex = parseInt(legacyMatch[1], 10);
            if(Number.isFinite(parsedIndex) && parsedIndex > 0){
              parsed[key] = `unter-layer-${parsedIndex}`;
            } else {
              parsed[key] = value;
            }
          } else {
            parsed[key] = value;
          }
        });
      }
      return parsed;
    } catch {
      return {};
    }
  }

  function setLayerMap(map){
    if(typeof window === 'undefined' || !window.localStorage) return;
    try {
      const normalized = {};
      if(map && typeof map === 'object'){
        Object.entries(map).forEach(([key, value]) => {
          if(!key) return;
          const sanitizedValue = sanitizeId(value);
          if(!sanitizedValue) return;
          const legacyMatch = sanitizedValue.match(/^layer-?(\d+)$/i);
          if(legacyMatch){
            const parsedIndex = parseInt(legacyMatch[1], 10);
            if(Number.isFinite(parsedIndex) && parsedIndex > 0){
              normalized[key] = `unter-layer-${parsedIndex}`;
              return;
            }
          }
          normalized[key] = sanitizedValue;
        });
      }
      window.localStorage.setItem(LBP_MAP_KEY, JSON.stringify(normalized));
    } catch {}
  }

  function bootstrapLayerMapIfEmpty(){
    if(typeof window === 'undefined') return;
    const existing = getLayerMap();
    if(existing && Object.keys(existing).length) return;
    const palette = window.__lbpPalette && typeof window.__lbpPalette === 'object' ? window.__lbpPalette : null;
    if(!palette) return;
    const names = Object.values(palette)
      .sort((a, b) => {
        const orderA = Number.isFinite(a?.order) ? a.order : 0;
        const orderB = Number.isFinite(b?.order) ? b.order : 0;
        if(orderA !== orderB) return orderA - orderB;
        const indexA = Number.isFinite(a?.index) ? a.index : 0;
        const indexB = Number.isFinite(b?.index) ? b.index : 0;
        return indexA - indexB;
      })
      .map(entry => entry?.name)
      .filter(Boolean);
    if(!names.length) return;
    const auto = {};
    for(let i = 1; i <= 15; i += 1){
      if(names[i - 1]) auto[i] = names[i - 1];
    }
    setLayerMap(auto);
    try {
      console.log('[LinkButtonsPlus] Auto-mapped layer indices to palette order:', auto);
    } catch {}
  }

  function resolveLayerColor(idx){
    const map = getLayerMap();
    const palette = (typeof window !== 'undefined' && window.__lbpPalette && typeof window.__lbpPalette === 'object') ? window.__lbpPalette : {};

    const orderedEntries = Object.values(palette).sort((a, b) => {
      const orderA = Number.isFinite(a?.order) ? a.order : 0;
      const orderB = Number.isFinite(b?.order) ? b.order : 0;
      if(orderA !== orderB) return orderA - orderB;
      const indexA = Number.isFinite(a?.index) ? a.index : 0;
      const indexB = Number.isFinite(b?.index) ? b.index : 0;
      return indexA - indexB;
    });

    const pickEntry = (entry, fallbackIndex) => {
      if(!entry || typeof entry !== 'object') return null;
      const safeName = sanitizeId(entry.name);
      const color = typeof entry.color === 'string' ? entry.color.trim() : '';
      if(!safeName || !color) return null;
      const explicitIndex = Number.isFinite(entry.index) && entry.index > 0 ? Math.floor(entry.index) : null;
      const normalizedIndex = explicitIndex || fallbackIndex || inferLayerIndexFromName(safeName);
      const title = typeof entry.title === 'string' && entry.title.trim()
        ? entry.title.trim()
        : buildReadableTitle(safeName, normalizedIndex);
      const displayName = typeof entry.displayName === 'string' && entry.displayName.trim()
        ? entry.displayName.trim()
        : title;
      const textColor = typeof entry.textColor === 'string' && entry.textColor.trim() ? entry.textColor.trim() : '';
      const borderColor = typeof entry.borderColor === 'string' && entry.borderColor.trim() ? entry.borderColor.trim() : '';
      const group = typeof entry.group === 'string' && entry.group.trim() ? entry.group.trim() : '';
      return {
        name: safeName,
        title,
        displayName,
        color,
        textColor,
        borderColor,
        group,
        index: Number.isFinite(normalizedIndex) && normalizedIndex > 0 ? normalizedIndex : null
      };
    };

    const mappedName = map && typeof map === 'object' ? map[idx] : null;
    const mappedEntry = mappedName ? pickEntry(palette[sanitizeId(mappedName)], idx) : null;
    if(mappedEntry) return mappedEntry;

    const orderEntry = orderedEntries[idx - 1] || null;
    const resolvedFromOrder = orderEntry ? pickEntry(orderEntry, idx) : null;
    if(resolvedFromOrder) return resolvedFromOrder;

    for(const entry of orderedEntries){
      const resolved = pickEntry(entry, idx);
      if(resolved && Number.isFinite(resolved.index) && resolved.index === idx){
        return resolved;
      }
    }

    const rootStyle = getRootComputedStyle();
    const cssValue = rootStyle ? rootStyle.getPropertyValue(`--module-layer-${idx}-module-bg`) : '';
    const trimmed = typeof cssValue === 'string' ? cssValue.trim() : '';
    const fallbackName = `unter-layer-${idx}`;
    const color = trimmed || 'hsla(0, 0%, 100%, 1)';
    return {
      name: fallbackName,
      title: buildReadableTitle(fallbackName, idx),
      color,
      index: idx
    };
  }

  function ensureCssVarForIndex(idx, hsla, preferredText){
    if(typeof window === 'undefined' || !window.document || !window.document.documentElement) return '#0f172a';
    const color = typeof hsla === 'string' && hsla.trim() ? hsla.trim() : 'hsla(0, 0%, 100%, 1)';
    const root = window.document.documentElement;
    let rootStyle;
    try {
      rootStyle = getComputedStyle(root);
    } catch {
      rootStyle = null;
    }
    const key = `--module-layer-${idx}-module-bg`;
    const current = rootStyle ? rootStyle.getPropertyValue(key).trim() : '';
    const needsUpdate = !current || current !== color;
    const match = color.match(/hsla?\(\s*\d+\s*,\s*\d+%?\s*,\s*(\d+)%/i);
    const lightness = match ? parseFloat(match[1]) : 50;
    const derivedText = Number.isFinite(lightness) && lightness > 55 ? '#0f172a' : '#f8fafc';
    const preferred = isValidHsla(preferredText) ? preferredText.trim() : '';
    const existingText = rootStyle ? rootStyle.getPropertyValue(`--module-layer-${idx}-module-text`).trim() : '';
    const finalText = preferred || existingText || derivedText;

    if(needsUpdate){
      root.style.setProperty(key, color);
      root.style.setProperty(`--module-layer-${idx}-header-bg`, color);
    }

    if(preferred && preferred !== existingText){
      root.style.setProperty(`--module-layer-${idx}-module-text`, preferred);
      root.style.setProperty(`--module-layer-${idx}-header-text`, preferred);
    } else if(needsUpdate){
      root.style.setProperty(`--module-layer-${idx}-module-text`, finalText);
      root.style.setProperty(`--module-layer-${idx}-header-text`, finalText);
    }
    return finalText;
  }

  bootstrapLayerMapIfEmpty();

  function syncDropdownsFromCachedPalette(){
    return syncDropdownsFromResolvedLayers();
  }

  async function fetchPaletteFromConfig(){
    if(typeof window === 'undefined') return null;
    let fetchError = null;
    const nowIso = () => new Date().toISOString();
    try {
      const response = await fetch(PALETTE_URL, { cache: 'no-store' });
      if(!response.ok){
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if(data && typeof data === 'object'){
        try {
          localStorage.setItem(PALETTE_URL, JSON.stringify(data));
        } catch {}
        return {
          data,
          source: 'Dateisystem',
          path: PALETTE_URL,
          loadedAt: nowIso(),
          layerCount: countPaletteItems(data)
        };
      }
    } catch (err) {
      fetchError = err;
    }

    try {
      const stored = localStorage.getItem(PALETTE_URL);
      if(stored){
        const parsed = JSON.parse(stored);
        if(parsed && typeof parsed === 'object'){
          if(fetchError){
            console.warn('[LinkButtonsPlus] Nutze FarblayerConfig.json aus lokalem Speicher:', fetchError);
          }
          return {
            data: parsed,
            source: 'Lokaler Speicher',
            path: PALETTE_URL,
            loadedAt: nowIso(),
            layerCount: countPaletteItems(parsed)
          };
        }
      }
    } catch (storageErr) {
      if(!fetchError){
        fetchError = storageErr;
      }
    }

    if(fetchError){
      throw fetchError;
    }
    return null;
  }

  let lastPaletteFetchFailed = false;

  async function refreshPaletteFromConfig(reason){
    if(typeof window === 'undefined') return;
    try {
      const result = await fetchPaletteFromConfig();
      const layers = result?.data || result;
      lastPaletteFetchFailed = false;
      if(!layers) return;
      const context = {
        path: result?.path || PALETTE_URL,
        source: result?.source || 'Dateisystem',
        loadedAt: result?.loadedAt,
        layerCount: Number.isFinite(result?.layerCount) ? result.layerCount : countPaletteItems(layers)
      };
      const updated = updateCachedPalette(layers, context);
      if(!updated) return;
      try {
        console.log(`[LinkButtonsPlus] Palette ${reason || 'updated'} from config`, {
          source: context.source,
          path: context.path,
          layerCount: context.layerCount
        });
      } catch {}
      bootstrapLayerMapIfEmpty();
      if(!syncDropdownsFromCachedPalette()){
        try {
          console.log('[LinkButtonsPlus] Palette loaded – waiting for dropdowns to mount');
        } catch {}
      }
      notifyPaletteListeners();
    } catch (err) {
      if(!lastPaletteFetchFailed){
        console.error('[LinkButtonsPlus] Failed to load palette:', err);
      }
      lastPaletteFetchFailed = true;
    }
  }

  (function initPaletteConfigSync(){
    if(typeof window === 'undefined') return;
    if(!window.__lbpPalette || typeof window.__lbpPalette !== 'object'){
      window.__lbpPalette = {};
    }

    const onDomReady = () => {
      if(Object.keys(window.__lbpPalette).length){
        if(!syncDropdownsFromCachedPalette()){
          try {
            console.log('[LinkButtonsPlus] DOM ready – cached palette available but dropdowns not rendered yet');
          } catch {}
        }
      }
    };

    refreshPaletteFromConfig('loaded');

    if(window.document?.readyState === 'loading'){
      window.document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
    } else {
      onDomReady();
    }

    if(!window.__lbpPalettePoller){
      window.__lbpPalettePoller = window.setInterval(() => {
        refreshPaletteFromConfig('refreshed');
      }, 10000);
    }
  })();

  function buildDropdownFromResolvedLayers(select){
    if(!select || typeof window === 'undefined' || !window.document) return false;
    const previousValue = select.value;
    select.innerHTML = '';
    const def = window.document.createElement('option');
    def.value = DROPDOWN_DEFAULT_VALUE;
    def.textContent = 'Standard (App)';
    select.appendChild(def);

    const palette = (typeof window !== 'undefined' && window.__lbpPalette && typeof window.__lbpPalette === 'object')
      ? window.__lbpPalette
      : null;

    const normalizeColorString = (...candidates) => {
      for(const candidate of candidates){
        if(typeof candidate === 'string'){
          const trimmed = candidate.trim();
          if(trimmed) return trimmed;
        }
      }
      return '';
    };

    let builtCount = 0;
    const seen = new Set();
    if(palette){
      const entries = Object.values(palette)
        .filter(entry => entry && typeof entry === 'object')
        .sort((a, b) => {
          const orderA = Number.isFinite(a?.order) ? a.order : 0;
          const orderB = Number.isFinite(b?.order) ? b.order : 0;
          if(orderA !== orderB) return orderA - orderB;
          const indexA = Number.isFinite(a?.index) ? a.index : 0;
          const indexB = Number.isFinite(b?.index) ? b.index : 0;
          if(indexA !== indexB) return indexA - indexB;
          const nameA = (a?.displayName || a?.title || a?.name || '').toString().toLowerCase();
          const nameB = (b?.displayName || b?.title || b?.name || '').toString().toLowerCase();
          if(nameA && nameB){
            return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
          }
          if(nameA) return -1;
          if(nameB) return 1;
          return 0;
        });

      const primaryEntries = entries.filter(entry => entry?.meta?.type === 'module-main');
      const usableEntries = primaryEntries.length ? primaryEntries : entries;

      usableEntries.forEach((entry, idx) => {
        const id = sanitizeId(entry?.name) || sanitizeId(entry?.id) || '';
        if(!id || seen.has(id)) return;
        seen.add(id);
        const option = window.document.createElement('option');
        const labelSource = entry?.displayName || entry?.title || entry?.name || `Layer ${idx + 1}`;
        const label = typeof labelSource === 'string' && labelSource.trim()
          ? labelSource.trim()
          : `Layer ${idx + 1}`;
        const swatch = normalizeColorString(entry?.swatch, entry?.color, entry?.moduleBg, entry?.background, entry?.bg, entry?.hsla);
        const preferredText = normalizeColorString(entry?.textColor, entry?.moduleText, entry?.text, entry?.headerText);
        const explicitIndex = Number.isFinite(entry?.index) && entry.index > 0 ? Math.floor(entry.index) : null;
        option.value = id;
        option.textContent = swatch ? `${label} (${swatch})` : label;
        if(explicitIndex){
          option.dataset.layerIndex = String(explicitIndex);
        }
        if(typeof entry?.group === 'string' && entry.group.trim()){
          option.dataset.layerGroup = entry.group.trim();
        }
        if(typeof entry?.borderColor === 'string' && entry.borderColor.trim()){
          option.dataset.layerBorder = entry.borderColor.trim();
        }
        if(swatch){
          option.style.background = swatch;
        }
        let textColor = preferredText;
        if(explicitIndex && swatch){
          textColor = ensureCssVarForIndex(explicitIndex, swatch, preferredText);
        }
        if(textColor){
          option.style.color = textColor;
        }
        const borderColor = normalizeColorString(entry?.borderColor, entry?.meta?.borderColor);
        option.style.border = borderColor ? `2px solid ${borderColor}` : '1px solid rgba(148,163,184,.35)';
        option.style.padding = '4px 8px';
        option.style.borderRadius = '4px';
        select.appendChild(option);
        builtCount += 1;
      });
    }

    if(!builtCount){
      for(let i = 1; i <= 15; i += 1){
        const resolved = resolveLayerColor(i);
        if(!resolved || !resolved.color) continue;
        const option = window.document.createElement('option');
        const value = sanitizeId(resolved.name) || `unter-layer-${i}`;
        const label = resolved.displayName && resolved.displayName.trim()
          ? resolved.displayName.trim()
          : (resolved.title && resolved.title.trim()
            ? resolved.title.trim()
            : buildReadableTitle(value, resolved.index || i));
        const color = normalizeColorString(resolved.color);
        const targetIndex = Number.isFinite(resolved.index) && resolved.index > 0 ? resolved.index : i;
        const textColor = ensureCssVarForIndex(targetIndex, color, resolved.textColor);
        option.value = value;
        option.textContent = color ? `${label} (${color})` : label;
        if(color){
          option.style.background = color;
        }
        if(textColor){
          option.style.color = textColor;
        }
        option.style.padding = '4px 8px';
        option.style.borderRadius = '4px';
        if(Number.isFinite(resolved.index)){
          option.dataset.layerIndex = String(resolved.index);
        } else {
          option.dataset.layerIndex = String(i);
        }
        if(resolved.group){
          option.dataset.layerGroup = resolved.group;
        }
        if(resolved.borderColor){
          option.dataset.layerBorder = resolved.borderColor;
        }
        if(resolved.color){
          option.style.background = resolved.color;
        }
        if(resolved.textColor){
          option.style.color = resolved.textColor;
        }
        option.style.border = resolved.borderColor
          ? `2px solid ${resolved.borderColor}`
          : '1px solid rgba(148,163,184,.35)';
        select.appendChild(option);
        builtCount += 1;
      }
    }

    const desired = dropdownValueForSelection(previousValue);
    select.value = desired;
    if(select.value !== desired){
      select.value = DROPDOWN_DEFAULT_VALUE;
    }
    if(builtCount){
      console.log(`[LinkButtonsPlus] Dropdown rebuilt with ${builtCount} palette option${builtCount === 1 ? '' : 's'}`);
    } else {
      console.log('[LinkButtonsPlus] Dropdown rebuilt without palette entries');
    }
    return builtCount > 0;
  }

  function syncDropdownsFromResolvedLayers(){
    const selects = window?.document?.querySelectorAll?.('.ops-color-select') || [];
    if(selects.length){
      selects.forEach(sel => buildDropdownFromResolvedLayers(sel));
      return true;
    }
    console.log('[LinkButtonsPlus] No dropdowns present for readable palette build');
    return false;
  }

  function sanitizeId(value){
    return (typeof value === 'string' && value.trim()) || '';
  }

  function normalizeDropdownValue(value){
    if(typeof value !== 'string') return '';
    const trimmed = value.trim();
    if(!trimmed) return '';
    if(trimmed.toLowerCase() === DROPDOWN_DEFAULT_VALUE) return '';
    const sanitized = sanitizeId(trimmed);
    const legacyMatch = sanitized.match(/^layer-?(\d+)$/i);
    if(legacyMatch){
      const parsed = parseInt(legacyMatch[1], 10);
      if(Number.isFinite(parsed) && parsed > 0){
        return `unter-layer-${parsed}`;
      }
    }
    return sanitized;
  }

  function dropdownValueForSelection(value){
    const normalized = normalizeDropdownValue(value);
    return normalized || DROPDOWN_DEFAULT_VALUE;
  }

  function layerIndexFromValue(value){
    const normalized = normalizeDropdownValue(value);
    if(!normalized) return null;

    const map = getLayerMap();
    if(map && typeof map === 'object'){
      for(const [idx, name] of Object.entries(map)){
        if(sanitizeId(name) === normalized){
          const parsedIndex = parseInt(idx, 10);
          if(Number.isFinite(parsedIndex) && parsedIndex > 0){
            return parsedIndex;
          }
        }
      }
    }

    const palette = (typeof window !== 'undefined' && window.__lbpPalette && typeof window.__lbpPalette === 'object') ? window.__lbpPalette : null;
    if(palette && palette[normalized]){
      const entry = palette[normalized];
      const entryIndex = Number.isFinite(entry.index) && entry.index > 0
        ? Math.floor(entry.index)
        : inferLayerIndexFromName(normalized);
      if(Number.isFinite(entryIndex) && entryIndex > 0){
        return entryIndex;
      }
    }

    const aliasMatch = normalized.match(/^unter-layer-(\d+)$/i);
    if(aliasMatch){
      const parsedAlias = parseInt(aliasMatch[1], 10);
      if(Number.isFinite(parsedAlias) && parsedAlias > 0){
        return parsedAlias;
      }
    }

    const parsed = parseLayerNumber(normalized);
    if(!Number.isFinite(parsed)) return null;
    const index = Math.abs(Math.floor(parsed));
    return index > 0 ? index : null;
  }

  if(typeof window !== 'undefined' && typeof window.MutationObserver === 'function' && window.document?.body){
    const resolvedDropdownObserver = new window.MutationObserver(() => {
      if(syncDropdownsFromResolvedLayers()){
        console.log('[LinkButtonsPlus] Dropdown auto-synced via MutationObserver');
        resolvedDropdownObserver.disconnect();
      }
    });
    try {
      resolvedDropdownObserver.observe(window.document.body, { childList: true, subtree: true });
    } catch {}
  }

  if(typeof window !== 'undefined' && window.document){
    const attemptInitialDropdownSync = () => {
      if(syncDropdownsFromResolvedLayers()){
        return;
      }
      let tries = 0;
      const timer = window.setInterval(() => {
        tries += 1;
        if(syncDropdownsFromResolvedLayers() || tries >= 15){
          window.clearInterval(timer);
        }
      }, 100);
    };
    if(window.document.readyState === 'loading'){
      window.document.addEventListener('DOMContentLoaded', attemptInitialDropdownSync, { once: true });
    } else {
      attemptInitialDropdownSync();
    }
    window.document.addEventListener('shopguide:modal-opened', () => {
      if(syncDropdownsFromResolvedLayers()){
        console.log('[LinkButtonsPlus] Dropdown re-synced after modal opened');
      }
    });
  }

  function getRootComputedStyle(){
    if(typeof window === 'undefined' || !window.document || !window.document.documentElement){
      return null;
    }
    try {
      return getComputedStyle(window.document.documentElement);
    } catch {
      return null;
    }
  }

  function resolveCssVariableValue(style, value, seen = new Set()){
    if(!style || typeof value !== 'string') return '';
    const trimmed = value.trim();
    if(!trimmed) return '';
    const match = trimmed.match(/^var\((--[^,\s)]+)(?:,([^)]*))?\)$/);
    if(!match) return trimmed;
    const name = match[1];
    if(seen.has(name)) return '';
    seen.add(name);
    const replacement = style.getPropertyValue(name);
    if(typeof replacement === 'string' && replacement.trim()){
      return resolveCssVariableValue(style, replacement, seen);
    }
    const fallback = typeof match[2] === 'string' ? match[2].trim() : '';
    if(fallback){
      return resolveCssVariableValue(style, fallback, seen);
    }
    return '';
  }

  function readCssCustomProperty(style, property){
    if(!style || typeof property !== 'string' || !property) return '';
    let value = '';
    try {
      value = style.getPropertyValue(property);
    } catch {
      value = '';
    }
    if(typeof value !== 'string' || !value.trim()) return '';
    return resolveCssVariableValue(style, value);
  }

  function resolveLayerIndex(layer){
    if(!layer || typeof layer !== 'object') return null;
    if(Number.isFinite(layer.index) && layer.index > 0){
      return Math.floor(layer.index);
    }
    const candidates = [layer.variableId, layer.id];
    for(const candidate of candidates){
      const normalized = sanitizeId(candidate);
      if(!normalized) continue;
      const match = normalized.match(/layer-?(\d+)/i);
      if(match){
        const parsed = parseInt(match[1], 10);
        if(Number.isFinite(parsed) && parsed > 0){
          return parsed;
        }
      }
    }
    return null;
  }

  function getCssColorsForLayer(index, area = 'main'){
    if(!Number.isFinite(index) || index <= 0) return { bg:'', text:'', border:'' };
    const style = getRootComputedStyle();
    if(!style) return { bg:'', text:'', border:'' };
    const safeIndex = Math.floor(index);
    const basePrefix = `--module-layer-${safeIndex}`;
    const areaPrefixes = [];
    if(area === 'header'){
      areaPrefixes.push(`${basePrefix}-header`);
    } else if(area === 'buttons'){
      areaPrefixes.push(`${basePrefix}-sub-1`);
      areaPrefixes.push(`${basePrefix}-buttons`);
    } else {
      areaPrefixes.push(`${basePrefix}-module`);
    }
    areaPrefixes.push(basePrefix);

    const readFromPrefixes = (suffix) => {
      for(const prefix of areaPrefixes){
        if(!prefix) continue;
        const value = readCssCustomProperty(style, `${prefix}-${suffix}`);
        if(value) return value.trim();
      }
      return '';
    };

    return {
      bg: readFromPrefixes('bg'),
      text: readFromPrefixes('text'),
      border: readFromPrefixes('border')
    };
  }

  function mergeLiveCssColors(layer, colors, area = 'main'){
    const base = (colors && typeof colors === 'object')
      ? { bg: colors.bg || '', text: colors.text || '', border: colors.border || '' }
      : { bg:'', text:'', border:'' };
    const index = resolveLayerIndex(layer);
    if(!index) return base;
    const live = getCssColorsForLayer(index, area);
    if(!live) return base;
    const shouldReplace = (value) => {
      if(!value) return true;
      const trimmed = value.trim();
      if(!trimmed) return true;
      return trimmed.startsWith('var(');
    };
    if(live.bg && shouldReplace(base.bg)) base.bg = live.bg;
    if(live.text && shouldReplace(base.text)) base.text = live.text;
    if(live.border && shouldReplace(base.border)) base.border = live.border;
    return base;
  }

  function setCssVar(el, name, value){
    if(!el || !name) return;
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if(trimmed){
      el.style.setProperty(name, trimmed);
    }else{
      el.style.removeProperty(name);
    }
  }

  function parseLayerNumber(value){
    if(typeof value !== 'string') return null;
    const normalized = value.trim().replace(',', '.');
    if(!normalized) return null;
    const match = normalized.match(/-?\d+(?:\.\d+)?/);
    if(!match) return null;
    const parsed = parseFloat(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeAlpha(value){
    if(!Number.isFinite(value)) return 1;
    const alpha = value > 1 ? value / 100 : value;
    return clampNumber(alpha, 0, 1);
  }

  function buildHslaColor(h, s, l, a){
    const hue = Number.isFinite(h) ? clampNumber(h, 0, 360) : 0;
    const sat = Number.isFinite(s) ? clampNumber(s, 0, 100) : 0;
    const light = Number.isFinite(l) ? clampNumber(l, 0, 100) : 0;
    const alpha = Number.isFinite(a) ? clampNumber(a, 0, 1) : 1;
    const format = (value, digits) => {
      if(!Number.isFinite(value)) return '0';
      const rounded = Number(value.toFixed(digits));
      return Number.isInteger(rounded) ? String(rounded) : String(rounded);
    };
    return `hsla(${format(hue, 1)}, ${format(sat, 1)}%, ${format(light, 1)}%, ${format(alpha, 3)})`;
  }

  function shiftLightness(value, delta){
    if(!Number.isFinite(value)) return value;
    return clampNumber(value + delta, 0, 100);
  }

  function shiftAlpha(value, delta){
    if(!Number.isFinite(value)) return value;
    return clampNumber(value + delta, 0, 1);
  }

  function pickTextColor(lightness){
    if(!Number.isFinite(lightness)) return '#0f172a';
    return lightness >= 55 ? '#0f172a' : '#f8fafc';
  }

  function buildPreviewFromLayer(layer){
    const map = {};
    COLOR_AREAS.forEach(area => {
      let colors = null;
      if(area === 'header') colors = deriveHeaderColors(layer);
      else if(area === 'buttons') colors = deriveButtonColors(layer);
      else colors = deriveMainColors(layer);
      map[area] = {
        bg: colors?.bg || '',
        text: colors?.text || ''
      };
    });
    return map;
  }

  function buildRawHslaString(hRaw, sRaw, lRaw, aRaw){
    const clean = (value) => (typeof value === 'string' ? value.trim() : '');
    const format = (value, suffix) => {
      const trimmed = clean(value);
      if(!trimmed) return suffix ? `0${suffix}` : '0';
      if(suffix && trimmed.endsWith(suffix)) return trimmed;
      return `${trimmed}${suffix}`;
    };
    const normalizeAlphaValue = (value) => {
      const trimmed = clean(value);
      if(!trimmed) return '1';
      const parsed = parseLayerNumber(trimmed);
      if(Number.isFinite(parsed)){
        const alpha = normalizeAlpha(parsed);
        return String(alpha);
      }
      if(trimmed.endsWith('%')){
        const pct = parseLayerNumber(trimmed);
        if(Number.isFinite(pct)){
          return String(clampNumber(pct / 100, 0, 1));
        }
      }
      return trimmed;
    };
    const hue = format(hRaw, '');
    const sat = format(sRaw, '%');
    const light = format(lRaw, '%');
    const alpha = normalizeAlphaValue(aRaw);
    return `hsla(${hue}, ${sat}, ${light}, ${alpha})`;
  }

  const DISPLAY_NAME_PRIMARY_KEYS = new Set([
    'displayname',
    'anzeigename',
    'anzeigenamen',
    'anzeigebezeichnung',
    'anzeigenbezeichnung',
    'anzeigetext',
    'anzeigenbeschreibung',
    'anzeigebeschreibung',
    'anzeigelabel',
    'anzeigenlabel',
    'anzeigetitel',
    'anzeigenamenkurz',
    'anzeigebezeichnungkurz'
  ]);
  const DISPLAY_NAME_SECONDARY_KEYS = new Set([
    'label',
    'title',
    'subtitle',
    'subtitel',
    'beschreibung',
    'beschreibungstext',
    'bezeichnung',
    'kurzbezeichnung',
    'kurzbeschreibung',
    'kurzname',
    'alias'
  ]);
  const DISPLAY_NAME_FALLBACK_KEYS = new Set([
    'name',
    'layername',
    'layerlabel',
    'layeranzeige',
    'modulename',
    'modulelayername'
  ]);

  function normalizeNameKey(key){
    if (typeof key !== 'string') return '';
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function isInspectableObject(value){
    if(!value || typeof value !== 'object') return false;
    if (typeof Node !== 'undefined' && value instanceof Node) return false;
    if (typeof Element !== 'undefined' && value instanceof Element) return false;
    if (typeof window !== 'undefined' && value === window) return false;
    if (typeof document !== 'undefined' && value === document) return false;
    if (typeof value.nodeType === 'number') return false;
    return true;
  }

  function extractLayerDisplayName(...sources){
    const stringCandidates = [];
    const objectSources = [];
    sources.forEach(source => {
      if (typeof source === 'string') {
        const trimmed = source.trim();
        if (trimmed) stringCandidates.push(trimmed);
      } else if (isInspectableObject(source)) {
        objectSources.push(source);
      }
    });

    const traverse = (keySet) => {
      const queue = objectSources.slice();
      const seen = new Set();
      let processed = 0;
      const LIMIT = 80;
      while(queue.length && processed < LIMIT){
        const current = queue.shift();
        if(!current || seen.has(current)) continue;
        seen.add(current);
        processed += 1;
        for (const [rawKey, rawValue] of Object.entries(current)) {
          if (typeof rawValue === 'string') {
            const normalizedKey = normalizeNameKey(rawKey);
            if (keySet.has(normalizedKey)) {
              const trimmed = rawValue.trim();
              if (trimmed) return trimmed;
            }
          }
        }
        for (const value of Object.values(current)) {
          if (isInspectableObject(value) && !seen.has(value)) queue.push(value);
        }
      }
      return '';
    };

    const primary = traverse(DISPLAY_NAME_PRIMARY_KEYS);
    if (primary) return primary;
    const secondary = traverse(DISPLAY_NAME_SECONDARY_KEYS);
    if (secondary) return secondary;
    const fallback = traverse(DISPLAY_NAME_FALLBACK_KEYS);
    if (fallback) return fallback;
    return stringCandidates.length ? stringCandidates[0] : '';
  }

  function toCssIdentifier(value){
    if (typeof value !== 'string') return '';
    let normalized = value.trim();
    if (!normalized) return '';
    if (typeof normalized.normalize === 'function') {
      normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    normalized = normalized.toLowerCase();
    normalized = normalized.replace(/[^a-z0-9]+/g, '-');
    normalized = normalized.replace(/-{2,}/g, '-');
    normalized = normalized.replace(/^-+|-+$/g, '');
    if (!normalized) return '';
    if (!/^[a-z]/.test(normalized)) normalized = `layer-${normalized}`;
    return normalized;
  }

  function toDatasetToken(value){
    if (typeof value !== 'string') return '';
    let normalized = value.trim();
    if (!normalized) return '';
    normalized = normalized.replace(/[^A-Za-z0-9]+/g, ' ');
    normalized = normalized.trim();
    if (!normalized) return '';
    return normalized
      .split(/\s+/)
      .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '')
      .join('');
  }

  function readDomModuleLayers(){
    if (typeof document === 'undefined') {
      return { layers: [], datasetSources: [] };
    }

    const container = document.getElementById('module-color-layers')
      || document.querySelector('.module-color-layers');
    if (!container) {
      return { layers: [], datasetSources: [] };
    }

    const datasetSources = [];
    const layers = [];
    const layerNodes = container.querySelectorAll('.module-color-layer');

    layerNodes.forEach((layerEl, index) => {
      if (!layerEl) return;
      if (layerEl.dataset) datasetSources.push(layerEl.dataset);

      const idx = index + 1;
      const defaultName = `Unter-Layer ${idx}`;
      const rawName = typeof layerEl.dataset.layerName === 'string'
        ? layerEl.dataset.layerName.trim()
        : '';
      const name = rawName || defaultName;
      const rawVar = typeof layerEl.dataset.layerVar === 'string'
        ? layerEl.dataset.layerVar.trim()
        : '';
      const rawId = typeof layerEl.dataset.id === 'string'
        ? layerEl.dataset.id.trim()
        : '';
      const variableId = sanitizeId(rawVar) || sanitizeId(rawId);
      const id = sanitizeId(rawId) || variableId || `layer-${idx}`;

      const subLayers = [];
      const subNodes = layerEl.querySelectorAll('.module-layer-subgroup');
      subNodes.forEach((subEl, subIndex) => {
        if (!subEl) return;
        if (subEl.dataset) datasetSources.push(subEl.dataset);
        const defaultSub = subIndex === 0 ? 'Unter-Layer' : `Unter-Layer ${subIndex + 1}`;
        const rawSubName = typeof subEl.dataset.subLayerName === 'string'
          ? subEl.dataset.subLayerName.trim()
          : '';
        const subName = rawSubName || defaultSub;
        const subVar = typeof subEl.dataset.subLayerVar === 'string'
          ? subEl.dataset.subLayerVar.trim()
          : '';
        subLayers.push({
          index: subIndex + 1,
          name: subName,
          displayName: subName,
          label: subName,
          variableId: sanitizeId(subVar) || ''
        });
      });

      layers.push({
        index: idx,
        id,
        variableId: variableId || '',
        name,
        displayName: name,
        label: name,
        subLayers
      });
    });

    return { layers, datasetSources };
  }

  function loadGlobalColorLayers(maxLayers = 15, configLayers = [], domData = null){
    const layers = [];
    const sources = [];
    const docEl = document.documentElement;
    if(docEl){
      try { sources.push(getComputedStyle(docEl)); } catch {}
    }
    const body = document.body;
    if(body && body !== docEl){
      try { sources.push(getComputedStyle(body)); } catch {}
    }
    if(!sources.length) return layers;

    const readVar = (name) => {
      for(const style of sources){
        if(!style) continue;
        const raw = style.getPropertyValue(name);
        if(typeof raw === 'string' && raw.trim()) return raw.trim();
      }
      return '';
    };

    const datasetSources = [];
    if (docEl && docEl.dataset) datasetSources.push(docEl.dataset);
    if (body && body !== docEl && body.dataset) datasetSources.push(body.dataset);
    if (domData && Array.isArray(domData.datasetSources)) {
      domData.datasetSources.forEach(source => {
        if (source) datasetSources.push(source);
      });
    }

    const readDatasetValue = (key) => {
      if(!key) return '';
      for (const source of datasetSources) {
        if (!source) continue;
        const value = source[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
      return '';
    };

    const stripQuotes = (value) => {
      if (typeof value !== 'string') return '';
      const trimmed = value.trim();
      if (!trimmed) return '';
      const first = trimmed.charAt(0);
      const last = trimmed.charAt(trimmed.length - 1);
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        return trimmed.slice(1, -1).trim();
      }
      return trimmed;
    };

    const resolveCustomProperty = (rawValue, seen = new Set()) => {
      if (typeof rawValue !== 'string') return '';
      const trimmed = rawValue.trim();
      if (!trimmed) return '';
      const match = trimmed.match(/^var\((--[A-Za-z0-9\-]+)(?:,([^\)]*))?\)$/);
      if (!match) return trimmed;
      const varName = match[1];
      if (seen.has(varName)) return '';
      seen.add(varName);
      const replacement = readVar(varName);
      if (replacement) {
        return resolveCustomProperty(replacement, seen);
      }
      const fallback = typeof match[2] === 'string' ? match[2].trim() : '';
      if (!fallback) return '';
      return resolveCustomProperty(fallback, seen);
    };

    const readResolvedVar = (name) => {
      if (!name) return '';
      const raw = readVar(name);
      if (!raw) return '';
      const resolved = resolveCustomProperty(raw);
      return typeof resolved === 'string' ? resolved.trim() : '';
    };

    const readTripletForPrefix = (prefix) => {
      if (!prefix) return null;
      const bg = readResolvedVar(`${prefix}-bg`);
      const text = readResolvedVar(`${prefix}-text`);
      const border = readResolvedVar(`${prefix}-border`);
      if (!bg && !text && !border) return null;
      return { bg, text, border };
    };

    const readTripletFromCandidates = (candidates) => {
      if (!Array.isArray(candidates)) return null;
      for (const candidate of candidates) {
        const triplet = readTripletForPrefix(candidate);
        if (triplet) return triplet;
      }
      return null;
    };

    const readNameFromCandidates = (candidates) => {
      if (!Array.isArray(candidates)) return '';
      for (const candidate of candidates) {
        const raw = readResolvedVar(`${candidate}-name`);
        const value = stripQuotes(raw);
        if (value) return value;
      }
      return '';
    };

    const normalizeTriplet = (value) => ({
      bg: typeof value?.bg === 'string' ? value.bg : '',
      text: typeof value?.text === 'string' ? value.text : '',
      border: typeof value?.border === 'string' ? value.border : ''
    });

    const hasTripletValues = (value) => {
      if (!value) return false;
      return Boolean(value.bg || value.text || value.border);
    };

    const SUB_LAYER_LIMIT = 8;

    const limit = Math.max(maxLayers, Array.isArray(configLayers) ? configLayers.length : 0);

    const indexCandidates = new Map();
    const ensureEntry = (index) => {
      if (!indexCandidates.has(index)) {
        indexCandidates.set(index, {
          index,
          variableIds: new Set(),
          datasetTokens: new Set(),
          configLayer: null
        });
      }
      return indexCandidates.get(index);
    };

    const addDatasetToken = (entry, value) => {
      if (!entry || typeof value !== 'string') return;
      const trimmed = value.trim();
      if (!trimmed || /^layer-?\d+$/i.test(trimmed) || /^\d+$/.test(trimmed)) return;
      const token = toDatasetToken(trimmed);
      if (token) entry.datasetTokens.add(token);
    };

    const addVariableCandidate = (entry, value) => {
      if (!entry || typeof value !== 'string') return;
      const trimmed = value.trim();
      if (!trimmed) return;
      entry.variableIds.add(trimmed);
      const slug = toCssIdentifier(trimmed);
      if (slug) entry.variableIds.add(slug);
      addDatasetToken(entry, trimmed);
    };

    const addNameCandidate = (entry, value) => {
      if (!entry || typeof value !== 'string') return;
      const trimmed = value.trim();
      if (!trimmed) return;
      addDatasetToken(entry, trimmed);
      const slug = toCssIdentifier(trimmed);
      if (slug) entry.variableIds.add(slug);
    };

    for (let i = 1; i <= limit; i += 1) {
      ensureEntry(i);
    }

    if (Array.isArray(configLayers)) {
      configLayers.forEach((layer, idx) => {
        const entry = ensureEntry(idx + 1);
        if (layer && !entry.configLayer) entry.configLayer = layer;
        addVariableCandidate(entry, sanitizeId(layer?.variableId));
        addVariableCandidate(entry, sanitizeId(layer?.id));
        if (typeof layer?.displayName === 'string') addNameCandidate(entry, layer.displayName);
        if (typeof layer?.name === 'string') addNameCandidate(entry, layer.name);
      });
    }

    for (let i = 1; i <= limit; i += 1) {
      const entry = ensureEntry(i);
      addVariableCandidate(entry, `layer-${i}`);
      addVariableCandidate(entry, `layer${i}`);
    }

    const datasetSuffixes = [
      '',
      'Name',
      'Label',
      'Title',
      'Display',
      'DisplayName',
      'Displayname',
      'Anzeige',
      'Anzeigename',
      'AnzeigeName',
      'Anzeigenamen',
      'Bezeichnung',
      'Beschreibung'
    ];
    const cssSuffixes = [
      '-name',
      '-name-quoted',
      '-label',
      '-label-quoted',
      '-title',
      '-title-quoted',
      '-display',
      '-display-quoted',
      '-display-name',
      '-display-name-quoted',
      '-anzeige',
      '-anzeige-quoted',
      '-anzeige-name',
      '-anzeige-name-quoted',
      '-anzeigename',
      '-anzeigename-quoted',
      '-anzeigenamen',
      '-anzeigenamen-quoted',
      '-bezeichnung',
      '-bezeichnung-quoted',
      '-beschreibung',
      '-beschreibung-quoted'
    ];

    const readDisplayNameForEntry = (index, entry) => {
      const configLayer = entry?.configLayer;
      const configDisplay = extractLayerDisplayName(configLayer);
      if (configDisplay) return configDisplay;

      const baseDatasetKeys = new Set([`moduleLayer${index}`, `layer${index}`]);
      if (entry) {
        entry.datasetTokens.forEach(token => {
          if (!token) return;
          baseDatasetKeys.add(`moduleLayer${token}`);
          baseDatasetKeys.add(`layer${token}`);
        });
      }

      for (const base of baseDatasetKeys) {
        for (const suffix of datasetSuffixes) {
          const candidates = new Set();
          candidates.add(`${base}${suffix}`);
          if (suffix) {
            candidates.add(`${base}${suffix.charAt(0).toLowerCase()}${suffix.slice(1)}`);
            candidates.add(`${base}${suffix.toLowerCase()}`);
          }
          for (const key of candidates) {
            const value = readDatasetValue(key);
            if (value) return value;
          }
        }
      }

      const cssBases = new Set([`--module-layer-${index}`, '--module-layer']);
      if (entry) {
        entry.variableIds.forEach(varId => {
          if (!varId) return;
          cssBases.add(`--${varId}`);
          cssBases.add(`--module-layer-${varId}`);
        });
      }

      const cssCandidates = [];
      cssBases.forEach(base => {
        cssSuffixes.forEach(suffix => {
          cssCandidates.push(`${base}${suffix}`);
        });
      });
      cssCandidates.push(
        '--module-layer-primary-name',
        '--module-layer-primary-name-quoted',
        '--module-layer-primary-display-name',
        '--module-layer-primary-display-name-quoted'
      );

      for (const candidate of cssCandidates) {
        const raw = readVar(candidate);
        if (!raw) continue;
        const resolved = resolveCustomProperty(raw);
        const normalized = stripQuotes(resolved);
        if (normalized) return normalized;
      }

      if (configLayer && typeof configLayer.name === 'string' && configLayer.name.trim()) {
        return configLayer.name.trim();
      }
      return '';
    };

    const readLayerColors = (entry) => {
      if (!entry) return null;
      const index = Number.isFinite(entry.index) ? entry.index : null;
      const rawVarIds = Array.from(entry.variableIds || []);
      const sanitizedVarIds = rawVarIds
        .map(id => sanitizeId(id))
        .filter(Boolean);
      const preferredFromConfig = sanitizeId(entry?.configLayer?.variableId);
      const baseNamePrefixes = [];
      if (index) baseNamePrefixes.push(`--module-layer-${index}`);
      sanitizedVarIds.forEach(id => baseNamePrefixes.push(`--${id}`));
      const fallbackName = readNameFromCandidates(baseNamePrefixes);
      const fallbackId = fallbackName ? toCssIdentifier(fallbackName) : '';
      const preferredId = preferredFromConfig || sanitizedVarIds[0] || fallbackId || (index ? `layer${index}` : '');

      const tryReadHsla = (varId) => {
        if (!varId) return null;
        const hRaw = readVar(`--${varId}-h`);
        const sRaw = readVar(`--${varId}-s`);
        const lRaw = readVar(`--${varId}-l`);
        const aRaw = readVar(`--${varId}-a`);
        if (hRaw && sRaw && lRaw) {
          return { mode: 'hsla', variableId: varId, hRaw, sRaw, lRaw, aRaw };
        }
        return null;
      };

      for (const varId of sanitizedVarIds) {
        const hsla = tryReadHsla(varId);
        if (hsla) return hsla;
      }
      if (index) {
        const hsla = tryReadHsla(`module-layer-${index}`);
        if (hsla) return hsla;
      }

      const modulePrefixes = [];
      const headerPrefixes = [];
      const namePrefixes = baseNamePrefixes.slice();
      if (index) {
        modulePrefixes.push(`--module-layer-${index}-module`);
        modulePrefixes.push(`--module-layer-${index}`);
        headerPrefixes.push(`--module-layer-${index}-header`);
      }
      sanitizedVarIds.forEach(id => {
        modulePrefixes.push(`--${id}-module`);
        modulePrefixes.push(`--${id}`);
        headerPrefixes.push(`--${id}-header`);
      });

      const moduleTriplet = readTripletFromCandidates(modulePrefixes);
      const headerTriplet = readTripletFromCandidates(headerPrefixes);
      const resolvedName = fallbackName || readNameFromCandidates(namePrefixes);

      const subLayers = [];
      for (let subIndex = 1; subIndex <= SUB_LAYER_LIMIT; subIndex += 1) {
        const subPrefixes = [];
        if (index) {
          subPrefixes.push(`--module-layer-${index}-sub-${subIndex}`);
          if (index === 1) subPrefixes.push(`--module-sub-layer-${subIndex}`);
        }
        sanitizedVarIds.forEach(id => {
          subPrefixes.push(`--${id}-sub-${subIndex}`);
        });
        const subTriplet = readTripletFromCandidates(subPrefixes);
        const subName = readNameFromCandidates(subPrefixes);
        if (!hasTripletValues(subTriplet) && !subName) continue;
        const normalizedSub = normalizeTriplet(subTriplet);
        if (subName) normalizedSub.name = subName;
        subLayers.push(normalizedSub);
      }

      if (!hasTripletValues(moduleTriplet) && !hasTripletValues(headerTriplet) && !subLayers.length) {
        return null;
      }

      const resolvedVariableId = sanitizeId(preferredId) || fallbackId || (index ? `layer${index}` : '');

      return {
        mode: 'triplet',
        variableId: resolvedVariableId,
        module: normalizeTriplet(moduleTriplet),
        header: normalizeTriplet(headerTriplet),
        subLayers,
        name: resolvedName
      };
    };

    const sortedEntries = Array.from(indexCandidates.entries()).sort((a, b) => a[0] - b[0]);

    sortedEntries.forEach(([index, entry]) => {
      const colors = readLayerColors(entry);
      if (!colors) return;

      const displayName = readDisplayNameForEntry(index, entry) || `Layer ${index}`;
      const resolvedId = sanitizeId(colors.variableId) || `layer${index}`;

      if (colors.mode === 'triplet') {
        const moduleColors = hasTripletValues(colors.module) ? normalizeTriplet(colors.module) : { bg:'', text:'', border:'' };
        const headerColors = hasTripletValues(colors.header) ? normalizeTriplet(colors.header) : { bg:'', text:'', border:'' };
        const firstSub = Array.isArray(colors.subLayers) && colors.subLayers.length
          ? (() => {
              const sub = colors.subLayers[0];
              const normalized = normalizeTriplet(sub);
              if (sub && typeof sub.name === 'string' && sub.name) {
                normalized.name = sub.name;
              }
              return normalized;
            })()
          : { bg:'', text:'', border:'' };
        const effectiveModule = hasTripletValues(moduleColors)
          ? moduleColors
          : (hasTripletValues(headerColors) ? headerColors : firstSub);
        const effectiveHeader = hasTripletValues(headerColors) ? headerColors : effectiveModule;
        const buttonSource = hasTripletValues(firstSub) ? firstSub : effectiveModule;
        const normalizedSubs = Array.isArray(colors.subLayers) && colors.subLayers.length
          ? colors.subLayers.map(sub => {
              const normalized = normalizeTriplet(sub);
              if (sub && typeof sub.name === 'string' && sub.name) {
                normalized.name = sub.name;
              }
              return normalized;
            })
          : [buttonSource];
        layers.push({
          id: resolvedId,
          variableId: resolvedId,
          index,
          label: displayName,
          name: displayName,
          displayName,
          color: effectiveModule.bg || effectiveHeader.bg || '',
          swatch: effectiveModule.bg || effectiveHeader.bg || '',
          moduleBg: effectiveModule.bg || '',
          moduleText: effectiveModule.text || '',
          moduleBorder: effectiveModule.border || effectiveModule.text || effectiveModule.bg || '',
          headerBg: effectiveHeader.bg || '',
          headerText: effectiveHeader.text || '',
          headerBorder: effectiveHeader.border || effectiveHeader.bg || effectiveModule.border || '',
          subLayers: normalizedSubs,
          subBg: buttonSource.bg || '',
          subText: buttonSource.text || '',
          subBorder: buttonSource.border || '',
          preview: {
            main: { bg: effectiveModule.bg || '', text: effectiveModule.text || '' },
            header: { bg: effectiveHeader.bg || '', text: effectiveHeader.text || '' },
            buttons: { bg: buttonSource.bg || '', text: buttonSource.text || '' }
          }
        });
        return;
      }

      const { hRaw, sRaw, lRaw, aRaw, variableId } = colors;
      const hVal = parseLayerNumber(hRaw);
      const sVal = parseLayerNumber(sRaw);
      const lVal = parseLayerNumber(lRaw);
      const aValRaw = parseLayerNumber(aRaw);
      const hasNumeric = Number.isFinite(hVal) && Number.isFinite(sVal) && Number.isFinite(lVal);
      const resolvedVariableId = sanitizeId(variableId) || resolvedId;

      if(!hasNumeric) {
        const colorOnly = buildRawHslaString(hRaw, sRaw, lRaw, aRaw);
        const fallbackText = Number.isFinite(lVal) ? pickTextColor(lVal) : '#ffffff';
        layers.push({
          id: resolvedVariableId,
          variableId: resolvedVariableId,
          index,
          label: displayName,
          name: displayName,
          displayName,
          color: colorOnly,
          swatch: colorOnly,
          moduleBg: colorOnly,
          moduleText: fallbackText,
          moduleBorder: colorOnly,
          headerBg: colorOnly,
          headerText: fallbackText,
          headerBorder: colorOnly,
          subLayers: [{ bg: colorOnly, text: fallbackText, border: colorOnly }],
          subBg: colorOnly,
          subText: fallbackText,
          subBorder: colorOnly,
          preview: {
            main: { bg: colorOnly, text: fallbackText },
            header: { bg: colorOnly, text: fallbackText },
            buttons: { bg: colorOnly, text: fallbackText }
          }
        });
        return;
      }

      const alpha = Number.isFinite(aValRaw) ? normalizeAlpha(aValRaw) : 1;
      const baseColor = buildHslaColor(hVal, sVal, lVal, alpha);
      const moduleText = pickTextColor(lVal);
      const moduleBorder = buildHslaColor(hVal, sVal, shiftLightness(lVal, -14), shiftAlpha(alpha, 0));

      const headerLight = shiftLightness(lVal, -6);
      const headerBg = buildHslaColor(hVal, sVal, headerLight, alpha);
      const headerText = pickTextColor(headerLight);
      const headerBorder = buildHslaColor(hVal, sVal, shiftLightness(headerLight, -8), shiftAlpha(alpha, 0.05));

      const buttonLight = shiftLightness(lVal, -12);
      const buttonBg = buildHslaColor(hVal, sVal, buttonLight, shiftAlpha(alpha, 0.05));
      const buttonText = pickTextColor(buttonLight);
      const buttonBorder = buildHslaColor(hVal, sVal, shiftLightness(buttonLight, -6), shiftAlpha(alpha, 0.08));

      layers.push({
        id: resolvedVariableId,
        variableId: resolvedVariableId,
        index,
        label: displayName,
        name: displayName,
        displayName,
        color: baseColor,
        swatch: baseColor,
        moduleBg: baseColor,
        moduleText,
        moduleBorder,
        headerBg,
        headerText,
        headerBorder,
        subLayers: [{ bg: buttonBg, text: buttonText, border: buttonBorder }],
        subBg: buttonBg,
        subText: buttonText,
        subBorder: buttonBorder,
        preview: {
          main: { bg: baseColor, text: moduleText },
          header: { bg: headerBg, text: headerText },
          buttons: { bg: buttonBg, text: buttonText }
        }
      });
    });

    return layers;
  }

  function ensureLayerSwatch(layer){
    if(!layer || typeof layer !== 'object') return layer;
    if(typeof layer.swatch === 'string' && layer.swatch) return layer;
    const previewMain = layer.preview && layer.preview.main ? layer.preview.main.bg : '';
    const swatch = (typeof previewMain === 'string' && previewMain)
      || (typeof layer.moduleBg === 'string' && layer.moduleBg)
      || (typeof layer.color === 'string' && layer.color)
      || '';
    if(!swatch) return layer;
    return { ...layer, swatch };
  }

  function getColorLayers(){
    const configLayersFromSettings = (() => {
      if (Array.isArray(window?.appSettings?.moduleColorLayers)) {
        return window.appSettings.moduleColorLayers;
      }
      if (typeof window?.getDefaultModuleColorLayers === 'function') {
        try { return window.getDefaultModuleColorLayers(); } catch { return []; }
      }
      return [];
    })();

    const domLayerData = readDomModuleLayers();
    const configSourceLayers = Array.isArray(configLayersFromSettings) && configLayersFromSettings.length
      ? configLayersFromSettings
      : (Array.isArray(domLayerData.layers) && domLayerData.layers.length ? domLayerData.layers : []);

    const normalizedConfig = Array.isArray(configSourceLayers)
      ? configSourceLayers.map((layer, index) => {
          const id = sanitizeId(layer?.id) || `layer-${index}`;
          const variableId = sanitizeId(layer?.variableId) || '';
          const name = typeof layer?.name === 'string' && layer.name.trim() ? layer.name.trim() : '';
          const displayName = extractLayerDisplayName(layer, layer?.displayName, name);
          return {
            ...layer,
            id,
            variableId,
            name,
            displayName: displayName || name,
            subLayers: Array.isArray(layer?.subLayers)
              ? layer.subLayers.map(sub => ({ ...sub }))
              : []
          };
        })
      : [];

    const cssLayers = loadGlobalColorLayers(15, normalizedConfig, domLayerData);

    if(!cssLayers.length && !normalizedConfig.length) return [];

    if(!cssLayers.length) {
      return normalizedConfig.map(layer => ensureLayerSwatch({
        ...layer,
        label: typeof layer.displayName === 'string' && layer.displayName ? layer.displayName : (layer.name || layer.label),
        preview: buildPreviewFromLayer(layer)
      }));
    }

    const merged = cssLayers.map(layer => {
      const existing = findLayerById(normalizedConfig, layer.id)
        || findLayerById(normalizedConfig, layer.variableId)
        || null;
      const mergedLayer = { ...layer };
      const variableId = sanitizeId(existing?.variableId) || sanitizeId(layer?.variableId) || sanitizeId(layer?.id) || '';
      const rawName = typeof existing?.name === 'string' && existing.name.trim()
        ? existing.name.trim()
        : (typeof layer?.name === 'string' && layer.name.trim() ? layer.name.trim() : '');
      const friendlyName = extractLayerDisplayName(
        existing,
        layer.displayName,
        layer.label,
        rawName
      ) || rawName || layer.displayName || layer.label || layer.name;

      if(existing){
        Object.keys(existing).forEach(key => {
          const value = existing[key];
          if (value !== undefined) mergedLayer[key] = value;
        });
      }

      const fallbackId = friendlyName ? toCssIdentifier(friendlyName) : '';
      mergedLayer.id = sanitizeId(mergedLayer.id)
        || sanitizeId(existing?.id)
        || variableId
        || fallbackId
        || mergedLayer.id
        || `layer-${merged.length + 1}`;
      mergedLayer.variableId = variableId || sanitizeId(mergedLayer.variableId) || '';
      mergedLayer.name = rawName || mergedLayer.name || friendlyName || mergedLayer.label || mergedLayer.id;
      mergedLayer.displayName = friendlyName || mergedLayer.displayName || mergedLayer.name;
      mergedLayer.label = mergedLayer.displayName || mergedLayer.label || mergedLayer.name;
      mergedLayer.preview = existing?.preview || layer.preview || buildPreviewFromLayer({ ...layer, ...existing, id: mergedLayer.id });
      return mergedLayer;
    });

    normalizedConfig.forEach(layer => {
      const id = sanitizeId(layer?.id);
      const variableId = sanitizeId(layer?.variableId);
      const name = typeof layer?.name === 'string' && layer.name.trim() ? layer.name.trim() : '';
      const displayName = typeof layer?.displayName === 'string' && layer.displayName.trim() ? layer.displayName.trim() : '';
      const exists = merged.some(item => {
        const itemId = sanitizeId(item?.id);
        const itemVar = sanitizeId(item?.variableId);
        const itemName = typeof item?.name === 'string' && item.name.trim() ? item.name.trim() : '';
        const itemDisplay = typeof item?.displayName === 'string' && item.displayName.trim() ? item.displayName.trim() : '';
        if (id && itemId && id === itemId) return true;
        if (variableId && itemVar && variableId === itemVar) return true;
        if (displayName && itemDisplay && displayName === itemDisplay) return true;
        if (name && itemName && name === itemName) return true;
        return false;
      });
      if(exists) return;
      const friendly = displayName || extractLayerDisplayName(layer, name) || name || `Layer ${merged.length + 1}`;
      const fallbackId = friendly ? toCssIdentifier(friendly) : '';
      merged.push({
        ...layer,
        id: id || variableId || fallbackId || `layer-${merged.length + 1}`,
        variableId: variableId || id || fallbackId || '',
        name: name || friendly,
        displayName: friendly,
        label: friendly,
        preview: layer.preview ? layer.preview : buildPreviewFromLayer(layer)
      });
    });

    const domLayers = Array.isArray(domLayerData?.layers) ? domLayerData.layers : [];
    const mergedWithDom = applyDomLayerMetadata(merged, domLayers);

    return mergedWithDom.map(layer => ensureLayerSwatch(layer));
  }

  function applyDomLayerMetadata(layers, domLayers){
    if(!Array.isArray(layers) || !layers.length) return layers;
    if(!Array.isArray(domLayers) || !domLayers.length) return layers;

    const lookupById = new Map();
    const lookupByIndex = new Map();

    domLayers.forEach((domLayer, idx) => {
      if(!domLayer || typeof domLayer !== 'object') return;
      const domIndexRaw = Number.isFinite(domLayer.index) ? domLayer.index : Number(domLayer.index);
      const domIndex = Number.isFinite(domIndexRaw) ? domIndexRaw : idx + 1;
      if(Number.isFinite(domIndex)) lookupByIndex.set(domIndex, domLayer);
      const domId = sanitizeId(domLayer.id) || sanitizeId(domLayer.variableId);
      if(domId) lookupById.set(domId, domLayer);
    });

    if(!lookupById.size && !lookupByIndex.size) return layers;

    const resolveDomName = (input) => {
      if(!input || typeof input !== 'object') return '';
      const candidates = [input.displayName, input.label, input.name];
      for(const candidate of candidates){
        if(typeof candidate === 'string'){
          const trimmed = candidate.trim();
          if(trimmed) return trimmed;
        }
      }
      return '';
    };

    const resolveDomSubLayer = (layer, index) => {
      if(!layer || typeof layer !== 'object') return null;
      const subs = Array.isArray(layer.subLayers) ? layer.subLayers : [];
      if(!subs.length) return null;
      if(Number.isFinite(index) && index > 0){
        const found = subs.find(sub => {
          const subIndexRaw = Number.isFinite(sub.index) ? sub.index : Number(sub.index);
          return Number.isFinite(subIndexRaw) && subIndexRaw === index;
        });
        if(found) return found;
      }
      return subs[index - 1] || null;
    };

    return layers.map(layer => {
      if(!layer || typeof layer !== 'object') return layer;

      const idCandidates = [sanitizeId(layer.id), sanitizeId(layer.variableId)]
        .filter(candidate => typeof candidate === 'string' && candidate);
      let domLayer = null;
      for(const candidate of idCandidates){
        domLayer = lookupById.get(candidate);
        if(domLayer) break;
      }

      if(!domLayer){
        const numericIndex = Number.isFinite(layer.index)
          ? layer.index
          : (() => {
              const parsed = Number(layer.index);
              return Number.isFinite(parsed) ? parsed : null;
            })();
        if(Number.isFinite(numericIndex)){
          domLayer = lookupByIndex.get(numericIndex) || null;
        }
      }

      if(!domLayer) return layer;

      let updated = layer;
      const domName = resolveDomName(domLayer);
      if(domName && domName !== layer.displayName){
        updated = {
          ...updated,
          name: domName,
          displayName: domName,
          label: domName
        };
      }

      const existingSubs = Array.isArray(updated.subLayers) ? updated.subLayers : [];
      if(existingSubs.length){
        const nextSubs = existingSubs.map((subLayer, subIdx) => {
          if(!subLayer || typeof subLayer !== 'object') return subLayer;
          const domSub = resolveDomSubLayer(domLayer, subIdx + 1);
          if(!domSub) return subLayer;
          const domSubName = resolveDomName(domSub);
          if(!domSubName || domSubName === subLayer.name) return subLayer;
          return { ...subLayer, name: domSubName };
        });
        let changed = false;
        for(let i = 0; i < existingSubs.length; i += 1){
          if(existingSubs[i] !== nextSubs[i]){
            changed = true;
            break;
          }
        }
        if(changed){
          updated = {
            ...updated,
            subLayers: nextSubs
          };
        }
      }

      return updated;
    });
  }

  function findLayerById(layers, id){
    if(!Array.isArray(layers) || !layers.length) return null;
    const rawInput = typeof id === 'string' ? id.trim() : '';
    const normalized = sanitizeId(rawInput);
    for (const layer of layers) {
      if(!layer || typeof layer !== 'object') continue;
      const layerId = sanitizeId(layer?.id);
      if (normalized && layerId && layerId === normalized) return layer;
    }
    for (const layer of layers) {
      if(!layer || typeof layer !== 'object') continue;
      const variableId = sanitizeId(layer?.variableId);
      if (normalized && variableId && variableId === normalized) return layer;
    }
    if (rawInput) {
      for (const layer of layers) {
        if(!layer || typeof layer !== 'object') continue;
        const name = typeof layer?.name === 'string' ? layer.name.trim() : '';
        if (name && name === rawInput) return layer;
        const display = typeof layer?.displayName === 'string' ? layer.displayName.trim() : '';
        if (display && display === rawInput) return layer;
      }
    }
    return null;
  }

  function adjustColorLightness(color, delta){
    if (typeof window?.parseColor !== 'function' || typeof window?.hslaToString !== 'function') return '';
    try{
      const parsed = window.parseColor(color);
      if(!parsed) return '';
      const next = { ...parsed, l: clampNumber(parsed.l + delta, 0, 100) };
      return window.hslaToString(next);
    }catch{}
    return '';
  }

  function adjustColorAlpha(color, alpha){
    if (typeof window?.parseColor !== 'function' || typeof window?.hslaToString !== 'function') return '';
    try{
      const parsed = window.parseColor(color);
      if(!parsed) return '';
      const next = { ...parsed, a: clampNumber(alpha, 0, 1) };
      return window.hslaToString(next);
    }catch{}
    return '';
  }

  function deriveMainColors(layer){
    if(!layer) return null;
    const bg = typeof layer.moduleBg === 'string' && layer.moduleBg ? layer.moduleBg : '';
    const text = typeof layer.moduleText === 'string' && layer.moduleText ? layer.moduleText : '';
    const border = typeof layer.moduleBorder === 'string' && layer.moduleBorder ? layer.moduleBorder : (text || bg);
    return { bg, text, border };
  }

  function deriveHeaderColors(layer){
    if(!layer) return null;
    const main = deriveMainColors(layer) || { bg:'', text:'', border:'' };
    const bg = typeof layer.headerBg === 'string' && layer.headerBg ? layer.headerBg : main.bg;
    const text = typeof layer.headerText === 'string' && layer.headerText ? layer.headerText : main.text;
    const border = typeof layer.headerBorder === 'string' && layer.headerBorder ? layer.headerBorder : (bg || main.border);
    return { bg, text, border };
  }

  function deriveButtonColors(layer){
    if(!layer) return null;
    const main = deriveMainColors(layer) || { bg:'', text:'', border:'' };
    let sub = null;
    if(Array.isArray(layer.subLayers) && layer.subLayers.length){
      sub = layer.subLayers[0];
    } else {
      sub = { bg: layer.subBg, text: layer.subText, border: layer.subBorder };
    }
    const bg = typeof sub?.bg === 'string' && sub.bg ? sub.bg : main.bg;
    const text = typeof sub?.text === 'string' && sub.text ? sub.text : main.text;
    const border = typeof sub?.border === 'string' && sub.border ? sub.border : (bg || main.border);
    return { bg, text, border };
  }

  function normalizeLookupKey(value){
    return String(value ?? '')
      .trim()
      .replace(/\s+/g, '')
      .toUpperCase();
  }

  function buildLookupMap(rows){
    const map = new Map();
    if(!Array.isArray(rows)) return map;
    for(const row of rows){
      const key = normalizeLookupKey(row?.meldung);
      if(key && !map.has(key)){
        map.set(key, row);
      }
    }
    return map;
  }

  function formatTimestampShort(value){
    if(typeof value !== 'number') return '';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return '';
    const pad = (num)=>String(num).padStart(2,'0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function formatTimestampLong(value){
    if(typeof value !== 'number') return '';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return '';
    const pad = (num)=>String(num).padStart(2,'0');
    const day = pad(date.getDate());
    const month = pad(date.getMonth()+1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${day}.${month}.${year} · ${hours}:${minutes}`;
  }

  function loadDoc(){ try { return JSON.parse(localStorage.getItem(LS_KEY)) || {general:{}}; } catch { return {general:{}}; } }
  function saveDoc(doc){ try{ localStorage.setItem(LS_KEY, JSON.stringify(doc)); }catch{} }
  function activeMeldung(){ return (loadDoc().general.Meldung || '').trim(); }
  function saveAspenFileName(name){ const d=loadDoc(); d.general ||= {}; d.general.aspenFileName=name; saveDoc(d); }
  function loadAspenFileName(){ return loadDoc().general.aspenFileName || ''; }

  function loadWorkforceFilters(){
    try{
      const raw = JSON.parse(localStorage.getItem(WORKFORCE_FILTER_KEY));
      if(Array.isArray(raw)){
        return raw.map(v => typeof v === 'string' ? v.trim() : '').filter(Boolean);
      }
    }catch{}
    return [];
  }
  function saveWorkforceFilters(list){
    try{
      localStorage.setItem(WORKFORCE_FILTER_KEY, JSON.stringify(list));
    }catch{}
  }

  const HEADER_KEY = 'linkbuttonsplus-headers';
  const HEADER_MAX_LENGTH = 60;
  function loadHeaderOverrides(){
    try{
      const raw = JSON.parse(localStorage.getItem(HEADER_KEY));
      if(raw && typeof raw === 'object'){
        return raw;
      }
    }catch{}
    return {};
  }
  function saveHeaderOverrides(map){
    try{
      localStorage.setItem(HEADER_KEY, JSON.stringify(map));
    }catch{}
  }
  function sanitizeHeaderTitle(value){
    if(typeof value !== 'string') return '';
    return value.replace(/\s+/g,' ').trim().slice(0, HEADER_MAX_LENGTH);
  }

  function idbOpen(){ return new Promise((res,rej)=>{ const r=indexedDB.open(IDB_NAME,1); r.onupgradeneeded=()=>r.result.createObjectStore(IDB_STORE); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
  async function idbSet(k,v){ const db=await idbOpen(); return new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,'readwrite'); tx.objectStore(IDB_STORE).put(v,k); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }
  async function idbGet(k){ const db=await idbOpen(); return new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,'readonly'); const rq=tx.objectStore(IDB_STORE).get(k); rq.onsuccess=()=>res(rq.result||null); rq.onerror=()=>rej(rq.error); }); }
  async function ensureRWPermission(handle){ if(!handle?.queryPermission) return true; const q=await handle.queryPermission({mode:'readwrite'}); if(q==='granted') return true; const r=await handle.requestPermission({mode:'readwrite'}); return r==='granted'; }

  async function ensureXLSX(){
    if (window.XLSX) return;
    if (window.__XLSX_LOAD_PROMISE__) return window.__XLSX_LOAD_PROMISE__;
    const urls = [
      'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
      'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js',
      'https://unpkg.com/xlsx@0.20.2/dist/xlsx.full.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.2/xlsx.full.min.js'
    ];
    window.__XLSX_LOAD_PROMISE__ = (async()=>{
      let last;
      for(const url of urls){
        try{
          await new Promise((ok,err)=>{ const s=document.createElement('script'); s.src=url; s.async=true; s.onload=ok; s.onerror=()=>err(new Error('load '+url)); document.head.appendChild(s); });
          if(window.XLSX) return;
        }catch(e){ last=e; }
      }
      throw last || new Error('XLSX load failed');
    })();
    return window.__XLSX_LOAD_PROMISE__;
  }

  function normalizeHeader(value){
    let str = String(value || '').toLowerCase();
    try{
      if(typeof str.normalize === 'function'){
        str = str.normalize('NFD');
      }
    }catch{}
    return str
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]/g,'');
  }

  function findIndex(headerInfo, key){
    const wanted = HEAD_OPTIONS[key];
    if(!wanted || !wanted.length) return -1;
    for(const info of headerInfo){
      if(wanted.includes(info.norm)) return info.idx;
    }
    return -1;
  }

  async function readAll(source){
    if(!source) return [];
    await ensureXLSX();
    const f = (typeof source?.arrayBuffer === 'function') ? source : await source.getFile();
    if(!f) return [];
    if(f.size===0) return [];
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf,{type:'array'});
    const ws = wb.Sheets[SHEET_NAME] || wb.Sheets[wb.SheetNames[0]];
    if(!ws) return [];
    const rows = XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
    const hdrRaw = rows[0] || [];
    const headerInfo = hdrRaw.map((raw, idx)=>({ raw, idx, norm: normalizeHeader(raw) }));
    const idx = {
      meldung: findIndex(headerInfo,'meldung'),
      auftrag: findIndex(headerInfo,'auftrag'),
      part: findIndex(headerInfo,'part'),
      serial: findIndex(headerInfo,'serial')
    };
    return rows.slice(1).map(r=>({
      meldung: idx.meldung>=0 ? String(r[idx.meldung]??'').trim() : '',
      auftrag: idx.auftrag>=0 ? String(r[idx.auftrag]??'').trim() : '',
      part: idx.part>=0 ? String(r[idx.part]??'').trim() : '',
      serial: idx.serial>=0 ? String(r[idx.serial]??'').trim() : ''
    })).filter(r=>r.meldung||r.auftrag||r.part||r.serial);
  }

  // UTF-8 safe Base64
  function b64encode(str){
    try { return btoa(str); }
    catch { return btoa(unescape(encodeURIComponent(str))); }
  }

  function getISOWeekInfo(date){
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week };
  }

  // ---------- render ----------
  window.renderLinkButtonsPlus = function renderLinkButtonsPlus(root, ctx){
    const s = (ctx && ctx.moduleJson && ctx.moduleJson.settings) || {};
    const gridItem = root.closest('.grid-stack-item');
    const hostEl = root.closest('.grid-stack-item-content');
    const instanceId = gridItem?.dataset.instanceId || 'default';
    const defaultHeaderTitle = sanitizeHeaderTitle(s.headerTitle) || 'LinkButtons Plus';
    let headerOverrides = loadHeaderOverrides();
    if(!headerOverrides || typeof headerOverrides !== 'object') headerOverrides = {};
    let headerOverride = sanitizeHeaderTitle(headerOverrides[instanceId] || '');
    if(headerOverride){
      if(headerOverrides[instanceId] !== headerOverride){
        headerOverrides = { ...headerOverrides, [instanceId]: headerOverride };
        saveHeaderOverrides(headerOverrides);
      }
    } else if(headerOverrides[instanceId]){
      const next = { ...headerOverrides };
      delete next[instanceId];
      headerOverrides = next;
      saveHeaderOverrides(headerOverrides);
    }
    let titleEl = null;
    let settingsTitleEl = null;
    let headerInput = null;
    let headerResetBtn = null;

    function getEffectiveHeaderTitle(){
      return headerOverride || defaultHeaderTitle;
    }
    function syncHeaderUI({ skipInput = false } = {}){
      const effective = getEffectiveHeaderTitle();
      if(titleEl) titleEl.textContent = effective;
      if(settingsTitleEl) settingsTitleEl.textContent = effective;
      if(headerInput){
        if(!skipInput && document.activeElement !== headerInput){
          headerInput.value = headerOverride;
        }
        headerInput.placeholder = defaultHeaderTitle;
      }
      if(headerResetBtn){
        headerResetBtn.disabled = !headerOverride;
      }
    }
    function setHeaderOverride(raw, { persist = true, syncInput = true } = {}){
      const sanitized = sanitizeHeaderTitle(raw);
      const hasStored = Object.prototype.hasOwnProperty.call(headerOverrides, instanceId);
      const previous = sanitizeHeaderTitle(headerOverrides[instanceId] || '');
      headerOverride = sanitized;
      let changed = false;
      if(sanitized){
        if(previous !== sanitized){
          headerOverrides = { ...headerOverrides, [instanceId]: sanitized };
          changed = true;
        }
      }else if(previous){
        const next = { ...headerOverrides };
        delete next[instanceId];
        headerOverrides = next;
        changed = true;
      }else if(hasStored){
        const next = { ...headerOverrides };
        delete next[instanceId];
        headerOverrides = next;
        changed = true;
      }
      if(persist && changed){
        saveHeaderOverrides(headerOverrides);
      }
      syncHeaderUI({ skipInput: !syncInput });
    }

    const leftTop = s.leftTop || 'Event';
    const leftBottom = s.leftBottom || 'CMDS';
    let r = Array.isArray(s.rightLabels) && s.rightLabels.length
      ? s.rightLabels.slice(0,6)
      : ['ZIAUF3','ZILLK','ZIKV','ZIQA','REPORT','Workforce'];
    const hasWorkforce = r.some(lbl => typeof lbl === 'string' && lbl.trim().toUpperCase() === 'WORKFORCE');
    if (!hasWorkforce) {
      if (r.length >= 6) r = r.slice(0,5);
      r.push('Workforce');
    }
    while (r.length < 6) r.push('');

    root.classList.add('ops-root');

    root.innerHTML = `
      <div class="ops-outer">
        <div class="ops-header">
          <div class="ops-title"></div>
          <div class="ops-actions">
            <div class="ops-autorefresh" data-state="idle" hidden role="status" aria-live="polite">
              <span class="ops-autorefresh-icon" aria-hidden="true">🔄</span>
              <span class="ops-autorefresh-label">Auto-Update</span>
              <span class="ops-autorefresh-time">Bereit</span>
            </div>
          </div>
        </div>
        <div class="ops-grid">
          <div class="ops-card leftTop" data-slot="left0">${leftTop}</div>
          <div class="ops-card leftBot" data-slot="left1">${leftBottom}</div>
          <div class="ops-card r0" data-slot="r0">${r[0] || ''}</div>
          <div class="ops-card r1" data-slot="r1">${r[1] || ''}</div>
          <div class="ops-card r2" data-slot="r2">${r[2] || ''}</div>
          <div class="ops-card r3" data-slot="r3">${r[3] || ''}</div>
          <div class="ops-card r4" data-slot="r4">${r[4] || ''}</div>
          <div class="ops-card r5" data-slot="r5">${r[5] || ''}</div>
        </div>
      </div>
    `;
    titleEl = root.querySelector('.ops-title');
    syncHeaderUI();
    migrateLegacyColorSelection(instanceId);
    let farblayerState = loadFarblayerState();
    const selectedColors = { main:'', header:'', buttons:'' };
    let pendingLayerRefresh = null;
    let pendingLayerRefreshIsTimeout = false;
    let unsubscribePalette = null;
    let colorSummaryEl = null;

    function updateSelectedColorsFromFarblayer(){
      const assignments = farblayerState?.assignments && typeof farblayerState.assignments === 'object'
        ? farblayerState.assignments
        : {};
      COLOR_AREAS.forEach(area => {
        const groupName = FARBLAYER_GROUPS[area];
        selectedColors[area] = normalizeDropdownValue(assignments[groupName]);
      });
    }

    updateSelectedColorsFromFarblayer();

    function applySelectedColors(){
      const layers = getColorLayers();
      let removed = false;
      for(const area of COLOR_AREAS){
        const id = normalizeDropdownValue(selectedColors[area]);
        if(id && !findLayerById(layers, id)){
          selectedColors[area] = '';
          removed = true;
        }
      }
      if(removed){
        const current = loadFarblayerState();
        const nextAssignments = { ...current.assignments };
        COLOR_AREAS.forEach(area => {
          const groupName = FARBLAYER_GROUPS[area];
          const value = normalizeDropdownValue(selectedColors[area]);
          if(!groupName) return;
          if(value){
            nextAssignments[groupName] = value;
          }else{
            delete nextAssignments[groupName];
          }
        });
        farblayerState = saveFarblayerState({ groups: current.groups, assignments: nextAssignments });
        broadcastFarblayerStateChange(farblayerState);
      }

      const mainLayer = findLayerById(layers, selectedColors.main);
      const headerLayer = selectedColors.header ? findLayerById(layers, selectedColors.header) : mainLayer;
      const buttonLayer = selectedColors.buttons ? findLayerById(layers, selectedColors.buttons) : mainLayer;

      const mainColors = mainLayer ? deriveMainColors(mainLayer) : null;
      const headerColors = headerLayer ? deriveHeaderColors(headerLayer) : null;
      const buttonColors = buttonLayer ? deriveButtonColors(buttonLayer) : null;

      if(hostEl){
        if(mainColors){
          setCssVar(hostEl, '--module-bg', mainColors.bg);
          setCssVar(hostEl, '--text-color', mainColors.text);
          setCssVar(hostEl, '--module-border-color', mainColors.border);
          const baseHeader = deriveHeaderColors(mainLayer);
          setCssVar(hostEl, '--module-header-bg', baseHeader?.bg || '');
          setCssVar(hostEl, '--module-header-text', baseHeader?.text || '');
          hostEl.style.background = mainColors.bg || '';
          hostEl.style.color = mainColors.text || '';
          hostEl.style.borderColor = mainColors.border || '';
        } else {
          setCssVar(hostEl, '--module-bg', '');
          setCssVar(hostEl, '--text-color', '');
          setCssVar(hostEl, '--module-border-color', '');
          setCssVar(hostEl, '--module-header-bg', '');
          setCssVar(hostEl, '--module-header-text', '');
          hostEl.style.background = '';
          hostEl.style.color = '';
          hostEl.style.borderColor = '';
        }
      }

      setCssVar(root, '--lbp-main-text', mainColors?.text || '');
      setCssVar(root, '--lbp-main-border', mainColors?.border || '');
      root.style.color = mainColors?.text || '';

      setCssVar(root, '--lbp-header-bg', headerColors?.bg || '');
      setCssVar(root, '--lbp-header-text', headerColors?.text || '');
      setCssVar(root, '--lbp-header-border', headerColors?.border || '');
      const headerEl = root.querySelector('.ops-header');
      if(headerEl){
        headerEl.style.background = headerColors?.bg || '';
        headerEl.style.color = headerColors?.text || '';
        headerEl.style.borderColor = headerColors?.border || '';
      }

      const cards = Array.from(root.querySelectorAll('.ops-card'));
      if(buttonColors){
        setCssVar(root, '--lbp-card-bg', buttonColors.bg || '');
        setCssVar(root, '--lbp-card-text', buttonColors.text || '');
        setCssVar(root, '--lbp-card-border', buttonColors.border || '');
        const hoverBorder = adjustColorLightness(buttonColors.border, 10) || buttonColors.border;
        setCssVar(root, '--lbp-card-hover-border', hoverBorder || '');
        const activeBg = adjustColorLightness(buttonColors.bg, 6) || adjustColorAlpha(buttonColors.bg, 0.78) || '';
        setCssVar(root, '--lbp-card-active-bg', activeBg);
        const shadow = buttonColors.border ? adjustColorAlpha(buttonColors.border, 0.26) : '';
        const hoverShadow = buttonColors.border ? adjustColorAlpha(buttonColors.border, 0.32) : '';
        const shadowValue = shadow ? `0 16px 34px ${shadow}` : '';
        const hoverShadowValue = hoverShadow ? `0 20px 40px ${hoverShadow}` : '';
        setCssVar(root, '--lbp-card-shadow', shadowValue);
        setCssVar(root, '--lbp-card-shadow-hover', hoverShadowValue);
        cards.forEach(card => {
          card.style.background = buttonColors.bg || '';
          card.style.color = buttonColors.text || '';
          card.style.borderColor = buttonColors.border || '';
        });
      } else {
        setCssVar(root, '--lbp-card-bg','');
        setCssVar(root, '--lbp-card-text','');
        setCssVar(root, '--lbp-card-border','');
        setCssVar(root, '--lbp-card-hover-border','');
        setCssVar(root, '--lbp-card-active-bg','');
        setCssVar(root, '--lbp-card-shadow','');
        setCssVar(root, '--lbp-card-shadow-hover','');
        cards.forEach(card => {
          card.style.background = '';
          card.style.color = '';
          card.style.borderColor = '';
        });
      }

      const accentSource = headerColors || mainColors || buttonColors || null;
      const accentEl = root.querySelector('.ops-autorefresh');
      if(accentSource){
        const accentBg = adjustColorLightness(accentSource.border || accentSource.bg, 8)
          || adjustColorAlpha(accentSource.bg, 0.82)
          || accentSource.bg;
        setCssVar(root, '--lbp-accent-bg', accentBg || '');
        setCssVar(root, '--lbp-accent-text', accentSource.text || '');
        if(accentEl){
          accentEl.style.background = accentBg || '';
          accentEl.style.color = accentSource.text || '';
        }
      } else {
        setCssVar(root, '--lbp-accent-bg','');
        setCssVar(root, '--lbp-accent-text','');
        if(accentEl){
          accentEl.style.background = '';
          accentEl.style.color = '';
        }
      }

      updateColorSummary();
    }

    function updateColorSummary(){
      if(!colorSummaryEl) return;
      const layers = getColorLayers();
      const rows = COLOR_AREAS.map(area => {
        const label = area === 'header' ? 'Header' : (area === 'main' ? 'Hauptmodul' : 'Buttons');
        const id = normalizeDropdownValue(selectedColors[area]);
        const layer = id ? findLayerById(layers, id) : null;
        const display = layer?.displayName || layer?.title || layer?.name || (id ? id : 'Standard');
        const swatch = layer?.swatch || layer?.moduleBg || layer?.color || '';
        return { label, display, swatch };
      });
      colorSummaryEl.innerHTML = rows.map(row => {
        const swatchStyle = row.swatch ? `background:${row.swatch};` : '';
        return `
          <div class="ops-color-summary-row">
            <span class="ops-color-chip" style="${swatchStyle}"></span>
            <div class="ops-color-summary-text">
              <span class="ops-color-summary-label">${row.label}</span>
              <span class="ops-color-summary-value">${row.display}</span>
            </div>
          </div>`;
      }).join('');
    }
    if(typeof window !== 'undefined'){
      if(!window.FarblayerBase || typeof window.FarblayerBase !== 'object'){
        window.FarblayerBase = {};
      }
      window.FarblayerBase.getLayerColor = function(layerName){
        const id = normalizeDropdownValue(layerName);
        if(!id) return null;
        const layer = findLayerById(getColorLayers(), id);
        if(!layer) return null;
        const main = deriveMainColors(layer) || {};
        return {
          background: main.bg || '',
          text: main.text || '',
          border: main.border || ''
        };
      };
      window.FarblayerBase.applyColors = function(targets, layer){
        if(!Array.isArray(targets)) return;
        targets.forEach(target => {
          if(!target || !target.style) return;
          const bg = layer?.background || layer?.bg || '';
          const text = layer?.text || layer?.color || '';
          const border = layer?.border || '';
          target.style.background = bg || '';
          target.style.color = text || '';
          target.style.borderColor = border || '';
        });
      };
    }


    const cancelPendingLayerRefresh = () => {
      if(pendingLayerRefresh === null) return;
      if(pendingLayerRefreshIsTimeout){
        clearTimeout(pendingLayerRefresh);
      }else if(typeof cancelAnimationFrame === 'function'){
        cancelAnimationFrame(pendingLayerRefresh);
      }
      pendingLayerRefresh = null;
      pendingLayerRefreshIsTimeout = false;
    };

    const flushLayerRefresh = () => {
      pendingLayerRefresh = null;
      pendingLayerRefreshIsTimeout = false;
      applySelectedColors();
    };

    const scheduleLayerRefresh = () => {
      cancelPendingLayerRefresh();
      if(typeof requestAnimationFrame === 'function'){
        pendingLayerRefreshIsTimeout = false;
        pendingLayerRefresh = requestAnimationFrame(() => {
          if(typeof requestAnimationFrame === 'function'){
            pendingLayerRefresh = requestAnimationFrame(() => {
              flushLayerRefresh();
            });
          }else{
            pendingLayerRefreshIsTimeout = true;
            pendingLayerRefresh = setTimeout(() => flushLayerRefresh(), 24);
          }
        });
      }else{
        pendingLayerRefreshIsTimeout = true;
        pendingLayerRefresh = setTimeout(() => flushLayerRefresh(), 24);
      }
    };

    const layerBroadcastHandler = () => {
      scheduleLayerRefresh();
    };
    unsubscribePalette = onPaletteUpdated(layerBroadcastHandler);

    applySelectedColors();
    setTimeout(() => applySelectedColors(), 0);

    // ---- URLs ----
    const URLS = {
      ZIAUF3_BASE: 'https://sap-p04.lht.ham.dlh.de/sap/bc/gui/sap/its/webgui?sap-client=002&~transaction=*ziauf3+CAUFVD-AUFNR%3D',
      ZILLK_BASE:  'https://sap-p04.lht.ham.dlh.de/sap/bc/gui/sap/its/webgui?sap-client=002&~transaction=*zillk+ZILLK_IE_EINSTIEG-QMNUM%3D',
      ZILLK_TAIL:  '%3BDYNP_OKCODE%3DAENDERN',
      ZIKV_BASE:   'https://sap-p04.lht.ham.dlh.de/sap/bc/gui/sap/its/webgui?sap-client=002&~transaction=*zikv+AUFK-AUFNR%3D',
      ZIQA_BASE:   'https://sap-p04.lht.ham.dlh.de/sap/bc/gui/sap/its/webgui?sap-client=002&~transaction=*ziqa+AUFK-AUFNR%3D',
      EDOC_BASE:   'https://lww.edoc-read.lht.ham.dlh.de/edoc/app/login.html?nextURL=',
      TRV_BASE:    'https://testreportviewer.apps.az.lhtcloud.com/?pn=',
      WORKFORCE_BASE: 'https://workforceplus-lht.lht.app.lufthansa.com/page/teamViewPage?scheduleGrid_expanded=true'
    };
    const openNew = (url) => window.open(url, '_blank', 'noopener,noreferrer');

    // ---- Aspen state ----
    let fileHandle = null;
    let cache = [];
    let cacheMap = new Map();
    const POLL_INTERVAL_MS = 60000;
    let pollInterval = null;
    let pollInProgress = false;
    let lastModifiedTimestamp = null;
    let autoUpdateState = 'idle';
    let autoUpdateMessage = '';

    function updateCache(rows){
      cache = Array.isArray(rows) ? rows : [];
      cacheMap = buildLookupMap(cache);
    }

    function lookup(){
      const m = activeMeldung();
      if(!m) return {m:'',aun:'',part:'',serial:''};
      const row = cacheMap.get(normalizeLookupKey(m))
        || cache.find(r => normalizeLookupKey(r.meldung) === normalizeLookupKey(m));
      return { m, aun:(row?.auftrag||'').trim(), part:(row?.part||'').trim(), serial:(row?.serial||'').trim() };
    }

    // ---- Click behavior ----
    root.querySelectorAll('.ops-card').forEach(el => {
      el.addEventListener('click', () => {
        const label = (el.textContent || '').trim().toUpperCase();
        const { m, aun, part, serial } = lookup();

        if (label === 'EVENT') {
          if (!aun) return;
          const raw = `func=deeplinksearch&searchTab=event&OPRange=&JobOrderNo=${aun}`;
          const b64 = b64encode(raw);
          openNew(URLS.EDOC_BASE + encodeURIComponent(b64) + '&b64=t');
          return;
        }
        if (label === 'CMDS') {
          if (!part) return;
          const raw = `func=deeplinksearch&searchTab=maint&DocumentType=CMDS&Status=eRL&Component=${part}`;
          const b64 = b64encode(raw);
          openNew(URLS.EDOC_BASE + encodeURIComponent(b64) + '&b64=t');
          return;
        }
        if (label === 'ZIAUF3') { if (!aun) return; openNew(URLS.ZIAUF3_BASE + encodeURIComponent(aun)); return; }
        if (label === 'ZILLK')  { if (!m)   return; openNew(URLS.ZILLK_BASE  + encodeURIComponent(m) + URLS.ZILLK_TAIL); return; }
        if (label === 'ZIKV')   { if (!aun) return; openNew(URLS.ZIKV_BASE   + encodeURIComponent(aun)); return; }
        if (label === 'ZIQA')   { if (!aun) return; openNew(URLS.ZIQA_BASE   + encodeURIComponent(aun)); return; }
        if (label === 'REPORT') { if (!part || !serial) return; openNew(URLS.TRV_BASE + encodeURIComponent(part) + '&sn=' + encodeURIComponent(serial)); return; }
        if (label === 'WORKFORCE') {
          const { year, week } = getISOWeekInfo(new Date());
          const weekStr = `${year}-W${String(week).padStart(2,'0')}`;
          let url = `${URLS.WORKFORCE_BASE}&week=${weekStr}`;
          const filters = loadWorkforceFilters();
          if (filters.length) {
            url += '&scheduleGrid_filters=' + encodeURIComponent(filters.join(';'));
          }
          openNew(url);
          return;
        }

        if (navigator.clipboard) navigator.clipboard.writeText(label).catch(()=>{});
        el.classList.add('ops-bounce');
        setTimeout(()=>el.classList.remove('ops-bounce'), 260);
      });
    });

    // ---- Context menu ----
    const DIS_KEY = 'linkbuttonsplus-disabled';
    function loadDisabled(){ try { return JSON.parse(localStorage.getItem(DIS_KEY)) || {}; } catch { return {}; } }
    function saveDisabled(d){ localStorage.setItem(DIS_KEY, JSON.stringify(d)); }
    const disabled = loadDisabled();
    let workforceFilters = loadWorkforceFilters();

    function reposition(){
      const right = Array.from(root.querySelectorAll('[data-slot^="r"]'))
        .filter(el => el.style.display !== 'none');
      right.forEach((el, idx) => {
        el.classList.remove('r0','r1','r2','r3','r4','r5');
        el.classList.add('r'+idx);
      });
      const left = Array.from(root.querySelectorAll('[data-slot^="left"]'))
        .filter(el => el.style.display !== 'none');
      left.forEach((el, idx) => {
        el.classList.remove('leftTop','leftBot');
        el.classList.add(idx === 0 ? 'leftTop' : 'leftBot');
      });
    }

    function applyDisabled(){
      root.querySelectorAll('.ops-card').forEach(el => {
        const lbl = (el.textContent || '').trim();
        el.style.display = disabled[lbl] ? 'none' : '';
      });
      reposition();
    }
    applyDisabled();

    const menu = document.createElement('div');
    menu.className = 'ops-settings-overlay';
    menu.id = 'module-settings-modal';
    const allLabels = [leftTop, leftBottom, ...r].filter(Boolean);
    menu.innerHTML = `
      <div class="ops-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="ops-settings-title">
        <div class="ops-settings-header">
          <div>
            <h2 class="ops-settings-title" id="ops-settings-title">LinkButtons Plus</h2>
            <p class="ops-settings-subtitle"></p>
          </div>
          <button type="button" class="ops-settings-close" aria-label="Einstellungen schließen">×</button>
        </div>
        <div class="ops-settings-body">
          <div class="ops-tabs">
            <button type="button" class="ops-tab-btn active" data-tab="buttons">Buttons</button>
            <button type="button" class="ops-tab-btn" data-tab="filters">Filter</button>
            <button type="button" class="ops-tab-btn" data-tab="colors">Farben anpassen</button>
          </div>
          <div class="ops-tab ops-tab-buttons active" data-tab="buttons">
            <div class="ops-title-section" data-tab-owner="buttons">
              <label for="ops-title-input">Überschrift</label>
              <div class="ops-input-row">
                <input type="text" id="ops-title-input" class="ops-title-input" maxlength="60" autocomplete="off">
                <button type="button" class="ops-action-button ops-secondary ops-title-reset">Standardtitel</button>
              </div>
              <p class="ops-input-hint">Leer lassen, um den Standardtitel zu verwenden.</p>
            </div>
            ${allLabels.map(l => `<label><input type="checkbox" data-label="${l}"> ${l}</label>`).join('')}
            <div class="ops-aspen-section">
              <button type="button" class="ops-pick ops-action-button">Aspen-Datei wählen</button>
              <div class="ops-file"></div>
              <div class="ops-file-hint"></div>
            </div>
          </div>
          <div class="ops-tab ops-tab-filters" data-tab="filters">
            <div class="ops-filter-hint">Namen für Workforce-Filter (ein Name pro Zeile)</div>
            <div class="ops-filter-list"></div>
            <div class="ops-filter-actions">
              <button type="button" class="ops-filter-clear ops-action-button">Alle Filter löschen</button>
            </div>
          </div>
          <div class="ops-tab ops-tab-colors" data-tab="colors">
            <div class="ops-color-delegate">
              <p>Die Farbkonfiguration wird zentral im Farblayer-Viewer gepflegt. Öffnen Sie den Viewer, um Gruppen zuzuweisen oder Farben anzupassen.</p>
              <div class="ops-color-summary" data-color-summary></div>
              <div class="ops-color-actions">
                <button type="button" class="ops-action-button ops-open-farblayer">Farblayer-Viewer öffnen</button>
                <button type="button" class="ops-secondary ops-action-button ops-sync-farblayer">Farben aktualisieren</button>
              </div>
            </div>
          </div>
        </div>
        <div class="ops-settings-footer">
          <button type="button" class="ops-secondary ops-action-button ops-settings-dismiss">Schließen</button>
        </div>
      </div>
    `;
    document.body.appendChild(menu);
    const dialogEl = menu.querySelector('.ops-settings-dialog');
    const bodyEl = menu.querySelector('.ops-settings-body');
    settingsTitleEl = menu.querySelector('.ops-settings-title');
    const subtitleEl = menu.querySelector('.ops-settings-subtitle');
    const closeButton = menu.querySelector('.ops-settings-close');
    const dismissButton = menu.querySelector('.ops-settings-dismiss');
    const tabs = menu.querySelectorAll('.ops-tab');
    const tabButtons = menu.querySelectorAll('.ops-tab-btn');
    const ownedSections = menu.querySelectorAll('[data-tab-owner]');
    headerInput = menu.querySelector('.ops-title-input');
    headerResetBtn = menu.querySelector('.ops-title-reset');

    if(headerInput){
      headerInput.value = headerOverride;
      headerInput.placeholder = defaultHeaderTitle;
      headerInput.addEventListener('input', () => {
        if(headerInput.value.length > HEADER_MAX_LENGTH){
          headerInput.value = headerInput.value.slice(0, HEADER_MAX_LENGTH);
        }
        const preview = sanitizeHeaderTitle(headerInput.value);
        const effective = preview || defaultHeaderTitle;
        if(titleEl) titleEl.textContent = effective;
        if(settingsTitleEl) settingsTitleEl.textContent = effective;
        if(headerResetBtn){
          headerResetBtn.disabled = !preview && !headerOverride;
        }
      });
      headerInput.addEventListener('blur', () => {
        setHeaderOverride(headerInput.value, { persist:true });
      });
      headerInput.addEventListener('keydown', event => {
        if(event.key === 'Enter'){
          event.preventDefault();
          headerInput.blur();
        }
      });
    }
    if(headerResetBtn){
      headerResetBtn.addEventListener('click', () => {
        setHeaderOverride('', { persist:true });
        if(headerInput){
          headerInput.value = '';
          headerInput.focus();
        }
      });
    }

    syncHeaderUI();

    function syncOwnedSections(activeTab){
      ownedSections.forEach(section => {
        section.hidden = section.dataset.tabOwner !== activeTab;
      });
    }

    syncOwnedSections('buttons');

    colorSummaryEl = menu.querySelector('[data-color-summary]');
    updateColorSummary();

    const openFarblayerBtn = menu.querySelector('.ops-open-farblayer');
    if(openFarblayerBtn){
      openFarblayerBtn.addEventListener('click', async () => {
        const ready = await ensureFarblayerViewerReady();
        if(!ready){
          alert('Farblayer-Viewer ist nicht verfügbar.');
          return;
        }
        closeModuleSettingsModal({ persist:true, restoreFocus:false });
        const openViewer = () => {
          try{
            window.openFarblayerViewer(FARBLAYER_MODULE_NAME);
          }catch(err){
            console.warn('[LinkButtonsPlus] Farblayer-Viewer konnte nicht geöffnet werden:', err);
            alert('Farblayer-Viewer ist nicht verfügbar.');
          }
        };
        if(typeof requestAnimationFrame === 'function'){
          requestAnimationFrame(() => requestAnimationFrame(openViewer));
        }else{
          setTimeout(openViewer, 0);
        }
      });
    }

    const syncFarblayerBtn = menu.querySelector('.ops-sync-farblayer');
    if(syncFarblayerBtn){
      syncFarblayerBtn.addEventListener('click', () => {
        farblayerState = loadFarblayerState();
        updateSelectedColorsFromFarblayer();
        scheduleLayerRefresh();
      });
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        tabButtons.forEach(b => b.classList.toggle('active', b === btn));
        tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === target));
        syncOwnedSections(target);
        if(target === 'colors'){
          updateColorSummary();
        }
      });
    });
    const farblayerListener = event => {
      if(!event || !event.detail) return;
      const detail = event.detail;
      const moduleName = typeof detail.module === 'string' ? detail.module.trim() : '';
      if(moduleName && moduleName !== FARBLAYER_MODULE_NAME) return;
      const assignments = detail.assignments && typeof detail.assignments === 'object' ? detail.assignments : {};
      const groups = Array.isArray(detail.groups) && detail.groups.length ? detail.groups : farblayerState.groups;
      farblayerState = { groups, assignments: { ...assignments } };
      updateSelectedColorsFromFarblayer();
      scheduleLayerRefresh();
    };
    window.addEventListener('farblayer-groups-changed', farblayerListener);

    window.addEventListener('visibilitychange', () => {
      if(document.hidden) return;
      const fresh = loadFarblayerState();
      const currentSerialized = JSON.stringify(farblayerState.assignments || {});
      const nextSerialized = JSON.stringify(fresh.assignments || {});
      if(currentSerialized !== nextSerialized){
        farblayerState = fresh;
        updateSelectedColorsFromFarblayer();
        scheduleLayerRefresh();
      }
    });
    if(closeButton){
      closeButton.addEventListener('click', () => closeModuleSettingsModal());
    }
    if(dismissButton){
      dismissButton.addEventListener('click', () => closeModuleSettingsModal());
    }
    menu.addEventListener('click', event => {
      if(event.target === menu){
        closeModuleSettingsModal();
      }
    });
    menu.addEventListener('contextmenu', event => {
      if(event.target === menu){
        event.preventDefault();
        closeModuleSettingsModal();
      }
    });
    const fileLbl = menu.querySelector('.ops-file');
    const fileHint = menu.querySelector('.ops-file-hint');
    const autoBadge = root.querySelector('.ops-autorefresh');
    const autoBadgeTime = autoBadge?.querySelector('.ops-autorefresh-time');

    function updateAutoRefreshUI(){
      if(!autoBadge) return;
      const hasFile = !!fileHandle;
      if(!hasFile){
        autoBadge.hidden = true;
        autoBadge.setAttribute('aria-hidden','true');
        autoBadge.dataset.state = 'idle';
        return;
      }
      autoBadge.hidden = false;
      autoBadge.removeAttribute('aria-hidden');
      autoBadge.dataset.state = autoUpdateState;
      const longTime = formatTimestampLong(lastModifiedTimestamp);
      const shortTime = formatTimestampShort(lastModifiedTimestamp);
      let baseLabel = 'Automatisches Update';
      if(autoUpdateState === 'active') baseLabel += ' aktiv';
      else if(autoUpdateState === 'paused') baseLabel += ' pausiert';
      else if(autoUpdateState === 'error') baseLabel += ' gestoppt';
      else baseLabel += ' bereit';
      const detail = longTime ? ` – Stand ${longTime}` : '';
      const message = autoUpdateMessage ? ` (${autoUpdateMessage})` : '';
      const title = baseLabel + detail + message;
      autoBadge.title = title;
      autoBadge.setAttribute('aria-label', title);
      if(autoBadgeTime){
        let display = 'Bereit';
        if(autoUpdateState === 'active') display = shortTime ? `Stand ${shortTime}` : 'Aktiv';
        else if(autoUpdateState === 'paused') display = 'Pausiert';
        else if(autoUpdateState === 'error') display = 'Fehler';
        autoBadgeTime.textContent = display;
      }
    }

    function updateFileState(){
      const storedName = loadAspenFileName();
      const resolvedName = fileHandle?.name || storedName || '';
      if(fileLbl){
        if(fileHandle){
          fileLbl.textContent = resolvedName ? `• ${resolvedName}` : 'Aspen-Datei geladen';
        } else {
          fileLbl.textContent = storedName ? `• ${storedName}` : 'Keine Aspen-Datei';
        }
      }
      if(fileHint){
        if(!fileHandle){
          fileHint.textContent = 'Hinweis: Bisher keine Aspen-Datei gewählt.';
        } else if(autoUpdateState === 'error'){
          const suffix = autoUpdateMessage ? ` – ${autoUpdateMessage}` : '';
          fileHint.textContent = `Automatisches Update gestoppt${suffix}`;
        } else if(autoUpdateState === 'paused'){
          fileHint.textContent = 'Automatisches Update pausiert.';
        } else {
          const longTime = formatTimestampLong(lastModifiedTimestamp);
          fileHint.textContent = longTime
            ? `Automatisches Update aktiv – Stand ${longTime}`
            : 'Automatisches Update aktiv.';
        }
      }
      updateAutoRefreshUI();
    }

    function clearAutoUpdateTimer(){
      if(pollInterval){
        clearInterval(pollInterval);
        pollInterval = null;
      }
      pollInProgress = false;
    }

    function stopAutoUpdatePolling(state = 'paused', message = ''){
      clearAutoUpdateTimer();
      autoUpdateState = state;
      autoUpdateMessage = message;
      updateFileState();
    }

    async function pollFileChangesOnce(){
      if(pollInProgress) return;
      if(!fileHandle){
        stopAutoUpdatePolling('idle');
        return;
      }
      pollInProgress = true;
      try{
        const file = await fileHandle.getFile();
        const modified = typeof file?.lastModified === 'number' ? file.lastModified : null;
        if(modified != null){
          if(lastModifiedTimestamp == null){
            lastModifiedTimestamp = modified;
            updateFileState();
          } else if(modified > lastModifiedTimestamp){
            const rows = await readAll(file);
            updateCache(rows);
            lastModifiedTimestamp = modified;
            autoUpdateState = 'active';
            autoUpdateMessage = '';
            updateFileState();
          }
        }
      }catch(err){
        console.warn('[LinkButtonsPlus] Auto-Update fehlgeschlagen', err);
        stopAutoUpdatePolling('error', 'Kein Zugriff auf Aspen-Datei.');
      }finally{
        pollInProgress = false;
      }
    }

    function startAutoUpdatePolling(){
      clearAutoUpdateTimer();
      if(!fileHandle){
        stopAutoUpdatePolling('idle');
        return;
      }
      autoUpdateState = 'active';
      autoUpdateMessage = '';
      pollInterval = setInterval(()=>{ void pollFileChangesOnce(); }, POLL_INTERVAL_MS);
      void pollFileChangesOnce();
      updateFileState();
    }

    async function loadAspenFromHandle(handle, { silent = false } = {}){
      if(!handle) return false;
      try{
        const file = await handle.getFile();
        const rows = await readAll(file);
        updateCache(rows);
        lastModifiedTimestamp = typeof file?.lastModified === 'number' ? file.lastModified : null;
        startAutoUpdatePolling();
        return true;
      }catch(err){
        console.error('[LinkButtonsPlus] Aspen-Datei konnte nicht gelesen werden', err);
        if(!silent){
          alert('Aspen-Daten konnten nicht geladen werden.');
        }
        stopAutoUpdatePolling('error', 'Aspen-Daten konnten nicht geladen werden.');
        return false;
      }
    }

    updateFileState();

    const filterList = menu.querySelector('.ops-filter-list');
    const clearFiltersBtn = menu.querySelector('.ops-filter-clear');

    function persistFilters(){
      workforceFilters = workforceFilters.map(v => (v || '').trim()).filter(Boolean);
      saveWorkforceFilters(workforceFilters);
    }

    function renderFilters(focusIndex){
      if (!filterList) return;
      filterList.innerHTML = '';
      const values = [...workforceFilters];
      values.push('');
      values.forEach((val, idx) => {
        const row = document.createElement('div');
        row.className = 'ops-filter-row';
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'ops-filter-input';
        input.placeholder = 'Name';
        input.autocomplete = 'off';
        input.dataset.index = String(idx);
        input.value = val;
        row.appendChild(input);
        filterList.appendChild(row);
      });
      if (typeof focusIndex === 'number') {
        const target = filterList.querySelector(`input[data-index="${focusIndex}"]`);
        if (target) {
          target.focus();
          const len = target.value.length;
          try { target.setSelectionRange(len, len); } catch {}
        }
      }
    }

    renderFilters();

    if (filterList) {
      filterList.addEventListener('input', e => {
        const input = e.target;
        if (!input || input.tagName !== 'INPUT' || !input.classList.contains('ops-filter-input')) return;
        const idx = Number(input.dataset.index);
        if (Number.isNaN(idx)) return;
        if (idx < workforceFilters.length) {
          workforceFilters[idx] = input.value;
        } else if (input.value.trim()) {
          workforceFilters.push(input.value);
          renderFilters(idx);
        }
      });

      filterList.addEventListener('blur', e => {
        const input = e.target;
        if (!input || input.tagName !== 'INPUT' || !input.classList.contains('ops-filter-input')) return;
        const idx = Number(input.dataset.index);
        if (Number.isNaN(idx)) return;
        if (idx < workforceFilters.length) {
          workforceFilters[idx] = input.value;
        } else if (input.value.trim()) {
          workforceFilters.push(input.value);
        }
        persistFilters();
        renderFilters(idx < workforceFilters.length ? idx : undefined);
      }, true);

      filterList.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const input = e.target;
        if (!input || input.tagName !== 'INPUT' || !input.classList.contains('ops-filter-input')) return;
        const idx = Number(input.dataset.index);
        if (Number.isNaN(idx)) return;
        e.preventDefault();
        if (idx < workforceFilters.length) {
          workforceFilters[idx] = input.value;
        } else if (input.value.trim()) {
          workforceFilters.push(input.value);
        }
        persistFilters();
        const nextIndex = Math.min(idx + 1, workforceFilters.length);
        renderFilters(nextIndex);
      });
    }

    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        workforceFilters = [];
        persistFilters();
        renderFilters();
      });
    }

    async function pickAspen(){
      try{
        alert('Bitte wählen Sie die Aspen-Datei aus');
        const [h] = await showOpenFilePicker({
          types:[{description:'Aspen (Excel)', accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],
          excludeAcceptAllOption:false, multiple:false
        });
        if(h && await ensureRWPermission(h)){
          fileHandle = h;
          await idbSet(GLOBAL_ASPEN_KEY,h);
          saveAspenFileName(h.name || 'Aspen.xlsx');
          await loadAspenFromHandle(fileHandle);
        }
      }catch(e){/* ignore */}
      updateFileState();
    }

    const pickButton = menu.querySelector('.ops-pick');
    if(pickButton){
      pickButton.addEventListener('click', () => {
        closeModuleSettingsModal({ restoreFocus:false });
        pickAspen();
      });
    }

    (async()=>{
      try{
        const h = await idbGet(GLOBAL_ASPEN_KEY);
        if(h && await ensureRWPermission(h)){
          fileHandle = h;
          await loadAspenFromHandle(fileHandle, { silent:true });
        } else {
          fileHandle = null;
          stopAutoUpdatePolling('idle');
        }
      }catch{
        fileHandle = null;
        stopAutoUpdatePolling('idle');
      }
      updateFileState();
    })();

    menu.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      const lbl = chk.dataset.label;
      chk.checked = !disabled[lbl];
      chk.addEventListener('change', () => {
        disabled[lbl] = !chk.checked;
        saveDisabled(disabled);
        applyDisabled();
      });
    });

    let lastFocusedElement = null;
    function openModuleSettingsModal(moduleId){
      const resolvedId = typeof moduleId === 'string' ? moduleId.trim() : '';
      menu.dataset.moduleId = resolvedId;
      if(dialogEl){
        dialogEl.dataset.moduleId = resolvedId;
      }
      if(subtitleEl){
        subtitleEl.textContent = resolvedId ? `Modul-ID: ${resolvedId}` : 'Modul-Einstellungen';
      }
      workforceFilters = loadWorkforceFilters();
      renderFilters();
      syncHeaderUI({ skipInput:false });
      updateColorSummary();
      tabButtons.forEach(btn => {
        const isButtons = btn.dataset.tab === 'buttons';
        btn.classList.toggle('active', isButtons);
      });
      tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === 'buttons'));
      syncOwnedSections('buttons');
      if(bodyEl){
        bodyEl.scrollTop = 0;
      }
      lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      menu.classList.add('open', 'visible');
      document.body.classList.add('ops-settings-open');
      requestAnimationFrame(() => {
        if(closeButton){
          closeButton.focus();
        }
      });
    }

    function closeModuleSettingsModal(options = {}){
      const { restoreFocus = true, persist = true } = options;
      if(!menu.classList.contains('open')) return;
      if(persist){
        if(headerInput){
          setHeaderOverride(headerInput.value, { persist:true, syncInput:false });
        }
        persistFilters();
        renderFilters();
      }else{
        syncHeaderUI({ skipInput:true });
      }
      menu.classList.remove('open', 'visible');
      document.body.classList.remove('ops-settings-open');
      if(restoreFocus && lastFocusedElement && typeof lastFocusedElement.focus === 'function'){
        try{ lastFocusedElement.focus(); }catch{}
      }
      lastFocusedElement = null;
    }

    const handleKeydown = event => {
      if(event.key === 'Escape' && menu.classList.contains('open')){
        event.preventDefault();
        closeModuleSettingsModal();
      }
    };
    document.addEventListener('keydown', handleKeydown, true);

    // === Rechtsklick-Modal (Right-Click Handler) ===
    const moduleContainer = root.closest('.module');
    const contextTargets = [];
    const registerContextTarget = el => {
      if(!el || contextTargets.includes(el)) return;
      contextTargets.push(el);
      el.addEventListener('contextmenu', moduleContextHandler, true);
    };
    // Ermittelt den richtigen Modulkontext für Rechtsklicks und globale Aufrufe.
    function resolveModuleId(){
      const idCandidates = [
        moduleContainer?.dataset.moduleId,
        moduleContainer?.dataset.module,
        moduleContainer?.dataset.id,
        ctx?.moduleId,
        ctx?.moduleJson?.moduleId,
        instanceId
      ];
      return idCandidates.find(val => typeof val === 'string' && val.trim())?.trim() || '';
    }
    const moduleContextHandler = event => {
      if(menu.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      openModuleSettingsModal(resolveModuleId());
    };
    registerContextTarget(moduleContainer);
    registerContextTarget(root.querySelector('.ops-header'));
    root.querySelectorAll('.ops-card').forEach(registerContextTarget);
    if(!moduleContainer){
      registerContextTarget(root);
    }

    // Bindet sich in einen evtl. vorhandenen globalen Helper ein und respektiert andere Module.
    const previousOpenModuleModal = typeof window.openModuleSettingsModal === 'function'
      ? window.openModuleSettingsModal
      : null;
    const bridgeOpenModuleSettingsModal = moduleId => {
      const requestedId = typeof moduleId === 'string' ? moduleId.trim() : '';
      const currentId = resolveModuleId();
      if(previousOpenModuleModal && requestedId && currentId && requestedId !== currentId){
        previousOpenModuleModal(moduleId);
        return;
      }
      if(previousOpenModuleModal && requestedId && !currentId){
        previousOpenModuleModal(moduleId);
        return;
      }
      openModuleSettingsModal(requestedId || currentId);
    };
    bridgeOpenModuleSettingsModal.__lbpBridge = true;
    window.openModuleSettingsModal = bridgeOpenModuleSettingsModal;

    // --- Layout switch based on GridStack cell height (stable, no flicker) ---
    const itemEl = root.closest('.grid-stack-item');
    function getCellHeight(){
      const h = itemEl?.gridstackNode?.h || parseInt(itemEl?.getAttribute('gs-h') || '0', 10);
      return isNaN(h) ? 0 : h;
    }
    function applyMode(){
      const isCompact = getCellHeight() <= 2;   // 2 cells high => compact layout
      root.classList.toggle('ops-compact', isCompact);
    }
    applyMode();
    const attrObserver = new MutationObserver(applyMode);
    if (itemEl) attrObserver.observe(itemEl, { attributes: true, attributeFilter: ['gs-h','style','class'] });

    // Cleanup when removed
    const mo = new MutationObserver(() => {
      if (!document.body.contains(root)) {
        attrObserver.disconnect();
        clearAutoUpdateTimer();
        window.removeEventListener('storage', storageHandler);
        cancelPendingLayerRefresh();
        if(unsubscribePalette){
          try {
            unsubscribePalette();
          } catch (err) {
            console.error('[LinkButtonsPlus] Failed to unsubscribe palette listener:', err);
          }
          unsubscribePalette = null;
        }
        closeModuleSettingsModal({ restoreFocus:false, persist:false });
        document.removeEventListener('keydown', handleKeydown, true);
        if(window.openModuleSettingsModal === bridgeOpenModuleSettingsModal){
          if(previousOpenModuleModal){
            window.openModuleSettingsModal = previousOpenModuleModal;
          }else{
            delete window.openModuleSettingsModal;
          }
        }
        menu.remove();
        contextTargets.forEach(el => el.removeEventListener('contextmenu', moduleContextHandler, true));
        mo.disconnect();
      }
    });
    mo.observe(document.body, { childList:true, subtree:true });

  };
})();
