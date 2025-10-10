/* Ops Panel — extended with toggleable links and Testreport deeplink */
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

    .ops-menu{position:fixed; z-index:1000; display:none; min-width:160px; padding:.25rem;
      background:var(--sidebar-module-card-bg,#fff); color:var(--sidebar-module-card-text,#111);
      border:1px solid var(--border-color,#e5e7eb); border-radius:.5rem; box-shadow:0 10px 24px rgba(0,0,0,.18);}
    .ops-menu.open{display:block;}
    .ops-menu label{display:flex; align-items:center; gap:.4rem; padding:.35rem .6rem; cursor:pointer;}
    .ops-menu label:hover{background:rgba(0,0,0,.06);}
    .ops-menu hr{border:none; border-top:1px solid var(--border-color,#e5e7eb); margin:.25rem;}
    .ops-tabs{display:flex; gap:.25rem; padding:.25rem .35rem .1rem;}
    .ops-menu .ops-tab-btn{display:inline-flex; align-items:center; justify-content:center; width:auto; margin:0; padding:.35rem .75rem;
      background:transparent; color:inherit; border:none; border-bottom:2px solid transparent; border-radius:.35rem .35rem 0 0;
      cursor:pointer; font-weight:600; box-shadow:none;}
    .ops-menu .ops-tab-btn.active{border-bottom-color:var(--button-bg,#2563eb); color:var(--button-bg,#2563eb);}
    .ops-tab{display:none; max-height:260px; overflow:auto;}
    .ops-tab.active{display:block;}
    .ops-tab-buttons{padding:.35rem .35rem .25rem;}
    .ops-tab-filters{padding:.35rem .35rem .45rem;}
    .ops-menu .ops-action-button{display:block; width:100%; margin:.25rem 0 0; padding:.35rem .6rem; border:none;
      border-radius:.4rem; background:var(--button-bg); color:var(--button-text); cursor:pointer;}
    .ops-menu .ops-action-button:disabled{opacity:.55; cursor:not-allowed;}
    .ops-filter-hint{padding:.2rem .35rem; font-size:.78rem; opacity:.7;}
    .ops-filter-list{padding:.1rem 0;}
    .ops-filter-row{padding:.2rem .35rem;}
    .ops-filter-row input{width:100%; padding:.35rem .45rem; border:1px solid var(--border-color,#d1d5db); border-radius:.35rem;
      background:var(--sidebar-module-card-bg,#fff); color:inherit; font-size:.85rem; box-sizing:border-box;}
    .ops-filter-actions{padding:.3rem .35rem 0;}
    .ops-filter-actions .ops-action-button{margin:0;}
    .ops-menu .ops-file{display:block; font-size:.75rem; opacity:.8; padding:.2rem .6rem 0;}
    .ops-menu .ops-file-hint{display:block; font-size:.72rem; opacity:.65; padding:.15rem .6rem .2rem; min-height:1em;}
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

  function sanitizeId(value){
    return (typeof value === 'string' && value.trim()) || '';
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

  function getColorLayers(){
    const source = (() => {
      if (Array.isArray(window?.appSettings?.moduleColorLayers)) {
        return window.appSettings.moduleColorLayers;
      }
      if (typeof window?.getDefaultModuleColorLayers === 'function') {
        try { return window.getDefaultModuleColorLayers(); } catch { return []; }
      }
      return [];
    })();
    if (!Array.isArray(source)) return [];
    return source.map((layer, index) => ({
      ...layer,
      id: sanitizeId(layer?.id) || `layer-${index}`,
      subLayers: Array.isArray(layer?.subLayers)
        ? layer.subLayers.map(sub => ({ ...sub }))
        : []
    }));
  }

  function findLayerById(layers, id){
    const wanted = sanitizeId(id);
    if(!wanted) return null;
    return layers.find(layer => sanitizeId(layer?.id) === wanted) || null;
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
          <div class="ops-title">LinkButtons Plus</div>
          <div class="ops-autorefresh" data-state="idle" hidden role="status" aria-live="polite">
            <span class="ops-autorefresh-icon" aria-hidden="true">🔄</span>
            <span class="ops-autorefresh-label">Auto-Update</span>
            <span class="ops-autorefresh-time">Bereit</span>
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

    const gridItem = root.closest('.grid-stack-item');
    const hostEl = root.closest('.grid-stack-item-content');
    const instanceId = gridItem?.dataset.instanceId || 'default';
    let colorConfigStore = loadColorConfig();
    const storedSelection = (colorConfigStore && typeof colorConfigStore === 'object') ? colorConfigStore[instanceId] : null;
    const selectedColors = {
      main: sanitizeId(storedSelection?.main),
      header: sanitizeId(storedSelection?.header),
      buttons: sanitizeId(storedSelection?.buttons)
    };
    let colorModal = null;

    function getSelectionSnapshot(){
      const snapshot = {};
      let hasValues = false;
      for(const area of COLOR_AREAS){
        const id = sanitizeId(selectedColors[area]);
        snapshot[area] = id;
        if(id) hasValues = true;
      }
      return { snapshot, hasValues };
    }

    function persistColorSelection(){
      const { snapshot, hasValues } = getSelectionSnapshot();
      const nextStore = { ...colorConfigStore };
      if(hasValues){
        nextStore[instanceId] = snapshot;
      } else {
        delete nextStore[instanceId];
      }
      colorConfigStore = nextStore;
      saveColorConfig(colorConfigStore);
    }

    function applySelectedColors(){
      const layers = getColorLayers();
      let removed = false;
      for(const area of COLOR_AREAS){
        const id = sanitizeId(selectedColors[area]);
        if(id && !findLayerById(layers, id)){
          selectedColors[area] = '';
          removed = true;
        }
      }
      if(removed) persistColorSelection();

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

      if(colorModal && colorModal.isOpen()) colorModal.updatePreviews();
    }

    function syncSelectionFromStorage(){
      const fresh = loadColorConfig();
      colorConfigStore = fresh;
      const entry = (fresh && typeof fresh === 'object') ? fresh[instanceId] : null;
      for (const area of COLOR_AREAS) {
        selectedColors[area] = sanitizeId(entry?.[area]);
      }
      applySelectedColors();
      if(colorModal) {
        colorModal.setSelection(selectedColors);
      }
    }

    const storageHandler = (event) => {
      if(event && event.key && event.key !== COLOR_CONFIG_KEY) return;
      syncSelectionFromStorage();
    };
    window.addEventListener('storage', storageHandler);

    function createColorModal(rootEl, hostContent){
      const titleId = 'ops-color-title-' + Math.random().toString(36).slice(2,9);
      const sectionMarkup = COLOR_AREAS.map(area => {
        const label = area === 'header' ? 'Header' : (area === 'main' ? 'Hauptmodul' : 'Buttons');
        const hint = area === 'header' ? 'Titelzeile & Status' : (area === 'main' ? 'Rahmen & Hintergrund' : 'Karten & Aktionen');
        const selectId = `ops-color-select-${area}-${Math.random().toString(36).slice(2,8)}`;
        return `
          <section class="ops-color-section">
            <label class="ops-color-label" for="${selectId}">${label}</label>
            <div class="ops-color-hint">${hint}</div>
            <select id="${selectId}" data-area="${area}" class="ops-color-select"></select>
            <div class="ops-color-preview" data-preview="${area}">
              <span class="ops-color-chip" data-chip="bg" aria-hidden="true"></span>
              <span class="ops-color-chip" data-chip="text" aria-hidden="true"></span>
              <span class="ops-color-chip" data-chip="border" aria-hidden="true"></span>
              <span class="ops-color-preview-label">Standard (App)</span>
            </div>
          </section>`;
      }).join('');

      const overlay = document.createElement('div');
      overlay.className = 'ops-color-overlay';
      overlay.setAttribute('aria-hidden','true');
      overlay.innerHTML = `
        <div class="ops-color-dialog" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
          <div class="ops-color-header">
            <h2 class="ops-color-title" id="${titleId}">Farben für LinkButtons Plus</h2>
            <button type="button" class="ops-color-dismiss" aria-label="Farbauswahl schließen">×</button>
          </div>
          <div class="ops-color-body">${sectionMarkup}</div>
          <div class="ops-color-footer">
            <button type="button" class="ops-color-reset">Zurücksetzen</button>
            <button type="button" class="ops-color-done">Schließen</button>
          </div>
        </div>`;
      (document.body || document.documentElement).appendChild(overlay);

      const dialog = overlay.querySelector('.ops-color-dialog');
      const selects = {};
      const previews = {};
      COLOR_AREAS.forEach(area => {
        selects[area] = overlay.querySelector(`select[data-area="${area}"]`);
        previews[area] = overlay.querySelector(`[data-preview="${area}"]`);
      });

      let openState = false;
      let callbacks = { onChange:null, onReset:null, getSelection:null };
      let currentLayers = [];
      let lastFocus = null;

      function formatLabel(layer, area){
        const name = typeof layer?.name === 'string' && layer.name ? layer.name : 'Layer';
        let colors;
        if(area === 'header') colors = deriveHeaderColors(layer);
        else if(area === 'buttons') colors = deriveButtonColors(layer);
        else colors = deriveMainColors(layer);
        if(colors?.bg && colors?.text){
          return `${name} (${colors.bg} · ${colors.text})`;
        }
        if(colors?.bg) return `${name} (${colors.bg})`;
        return name;
      }

      function populateOptions(layers){
        COLOR_AREAS.forEach(area => {
          const select = selects[area];
          if(!select) return;
          const previous = select.value;
          select.innerHTML = '';
          const def = document.createElement('option');
          def.value = '';
          def.textContent = 'Standard (App)';
          select.appendChild(def);
          layers.forEach(layer => {
            const option = document.createElement('option');
            option.value = sanitizeId(layer?.id) || '';
            option.textContent = formatLabel(layer, area);
            select.appendChild(option);
          });
          if(previous){
            select.value = previous;
            if(select.value !== previous) select.value = '';
          }
        });
      }

      function setSelection(selection){
        COLOR_AREAS.forEach(area => {
          const select = selects[area];
          if(!select) return;
          const wanted = sanitizeId(selection?.[area]);
          if(wanted){
            select.value = wanted;
            if(select.value !== wanted) select.value = '';
          } else {
            select.value = '';
          }
        });
      }

      function updatePreviews(){
        const mainStyle = hostContent ? getComputedStyle(hostContent) : null;
        const headerEl = rootEl.querySelector('.ops-header');
        const headerStyle = headerEl ? getComputedStyle(headerEl) : null;
        const cardEl = rootEl.querySelector('.ops-card');
        const cardStyle = cardEl ? getComputedStyle(cardEl) : null;
        const styleMap = { main: mainStyle, header: headerStyle, buttons: cardStyle };
        COLOR_AREAS.forEach(area => {
          const preview = previews[area];
          const style = styleMap[area];
          if(!preview || !style) return;
          let bg = '', text = '', border = '';
          if(area === 'main'){
            bg = style.getPropertyValue('--module-bg') || style.backgroundColor || '';
            text = style.getPropertyValue('--text-color') || style.color || '';
            border = style.getPropertyValue('--module-border-color') || style.borderTopColor || '';
          } else {
            bg = style.backgroundColor || '';
            text = style.color || '';
            border = style.borderTopColor || style.borderColor || '';
          }
          const chips = {
            bg: preview.querySelector('[data-chip="bg"]'),
            text: preview.querySelector('[data-chip="text"]'),
            border: preview.querySelector('[data-chip="border"]')
          };
          const label = preview.querySelector('.ops-color-preview-label');
          const clean = str => (typeof str === 'string' ? str.trim() : '');
          const values = { bg: clean(bg), text: clean(text), border: clean(border) };
          if(chips.bg) chips.bg.style.background = values.bg || 'transparent';
          if(chips.text) chips.text.style.background = values.text || 'transparent';
          if(chips.border) chips.border.style.background = values.border || 'transparent';
          if(label){
            const parts = [values.bg, values.text, values.border].filter(Boolean);
            label.textContent = parts.length ? parts.join(' · ') : 'Standard (App)';
            label.title = label.textContent;
          }
        });
      }

      function close(){
        if(!openState) return;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden','true');
        document.removeEventListener('keydown', handleKeydown, true);
        openState = false;
        if(lastFocus && typeof lastFocus.focus === 'function'){
          try { lastFocus.focus(); } catch {}
        }
      }

      function handleKeydown(event){
        if(event.key === 'Escape'){
          event.preventDefault();
          close();
        }
      }

      overlay.addEventListener('click', event => {
        if(event.target === overlay) close();
      });
      overlay.querySelector('.ops-color-dismiss')?.addEventListener('click', close);
      overlay.querySelector('.ops-color-done')?.addEventListener('click', close);
      const resetBtn = overlay.querySelector('.ops-color-reset');
      if(resetBtn){
        resetBtn.addEventListener('click', () => {
          let nextSelection = null;
          if(typeof callbacks.onReset === 'function'){
            nextSelection = callbacks.onReset();
          }
          if(nextSelection && typeof nextSelection === 'object'){
            setSelection(nextSelection);
          } else if (callbacks.getSelection) {
            const latest = callbacks.getSelection();
            if(latest && typeof latest === 'object') setSelection(latest);
          }
          updatePreviews();
        });
      }

      COLOR_AREAS.forEach(area => {
        const select = selects[area];
        if(!select) return;
        select.addEventListener('change', () => {
          const value = sanitizeId(select.value);
          let nextSelection = null;
          if(typeof callbacks.onChange === 'function'){
            nextSelection = callbacks.onChange(area, value);
          }
          if(nextSelection && typeof nextSelection === 'object'){
            setSelection(nextSelection);
          }
          updatePreviews();
        });
      });

      function open(options = {}){
        currentLayers = Array.isArray(options.layers) ? options.layers : [];
        callbacks = {
          onChange: typeof options.onChange === 'function' ? options.onChange : null,
          onReset: typeof options.onReset === 'function' ? options.onReset : null,
          getSelection: typeof options.getSelection === 'function' ? options.getSelection : null
        };
        populateOptions(currentLayers);
        if(options.selection) setSelection(options.selection);
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden','false');
        openState = true;
        lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if(dialog){
          dialog.setAttribute('tabindex','-1');
          try { dialog.focus({ preventScroll:true }); } catch {}
        }
        document.addEventListener('keydown', handleKeydown, true);
        updatePreviews();
      }

      function destroy(){
        close();
        overlay.remove();
      }

      return {
        open,
        close,
        destroy,
        setSelection,
        updatePreviews,
        isOpen: () => openState
      };
    }

    colorModal = createColorModal(root, hostEl);
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
    menu.className = 'ops-menu';
    const allLabels = [leftTop, leftBottom, ...r].filter(Boolean);
    menu.innerHTML = `
      <div class="ops-tabs">
        <button type="button" class="ops-tab-btn active" data-tab="buttons">Buttons</button>
        <button type="button" class="ops-tab-btn" data-tab="filters">Filter</button>
      </div>
      <div class="ops-tab ops-tab-buttons active" data-tab="buttons">
        ${allLabels.map(l => `<label><input type="checkbox" data-label="${l}"> ${l}</label>`).join('')}
        <hr>
        <button type="button" class="ops-color-settings ops-action-button">Farben anpassen</button>
        <hr>
        <button type="button" class="ops-pick ops-action-button">Aspen-Datei wählen</button>
        <div class="ops-file"></div>
        <div class="ops-file-hint"></div>
      </div>
      <div class="ops-tab ops-tab-filters" data-tab="filters">
        <div class="ops-filter-hint">Namen für Workforce-Filter (ein Name pro Zeile)</div>
        <div class="ops-filter-list"></div>
        <div class="ops-filter-actions">
          <button type="button" class="ops-filter-clear ops-action-button">Alle Filter löschen</button>
        </div>
      </div>
    `;
    document.body.appendChild(menu);
    const tabs = menu.querySelectorAll('.ops-tab');
    const tabButtons = menu.querySelectorAll('.ops-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        tabButtons.forEach(b => b.classList.toggle('active', b === btn));
        tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === target));
      });
    });
    const fileLbl = menu.querySelector('.ops-file');
    const fileHint = menu.querySelector('.ops-file-hint');
    const autoBadge = root.querySelector('.ops-autorefresh');
    const autoBadgeTime = autoBadge?.querySelector('.ops-autorefresh-time');
    const colorButton = menu.querySelector('.ops-color-settings');

    function openColorSettings(){
      const layers = getColorLayers();
      const snapshot = {};
      COLOR_AREAS.forEach(area => { snapshot[area] = sanitizeId(selectedColors[area]); });
      colorModal.open({
        layers,
        selection: snapshot,
        onChange(area, value){
          selectedColors[area] = sanitizeId(value);
          persistColorSelection();
          applySelectedColors();
          return { ...selectedColors };
        },
        onReset(){
          COLOR_AREAS.forEach(area => { selectedColors[area] = ''; });
          persistColorSelection();
          applySelectedColors();
          return { ...selectedColors };
        },
        getSelection(){
          return { ...selectedColors };
        }
      });
    }

    if(colorButton){
      colorButton.addEventListener('click', () => {
        persistFilters();
        menu.classList.remove('open');
        openColorSettings();
      });
    }

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

    menu.querySelector('.ops-pick').addEventListener('click', ()=>{
      persistFilters();
      menu.classList.remove('open');
      pickAspen();
    });

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

    root.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      workforceFilters = loadWorkforceFilters();
      renderFilters();
      tabButtons.forEach(btn => {
        const isButtons = btn.dataset.tab === 'buttons';
        btn.classList.toggle('active', isButtons);
      });
      tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === 'buttons'));
      menu.style.left = e.pageX + 'px';
      menu.style.top = e.pageY + 'px';
      menu.classList.add('open');
    });

    document.addEventListener('click', e => {
      if (!menu.contains(e.target)) {
        if (menu.classList.contains('open')) {
          persistFilters();
          renderFilters();
        }
        menu.classList.remove('open');
      }
    });

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
        if (colorModal) {
          colorModal.destroy();
          colorModal = null;
        }
        menu.remove();
        mo.disconnect();
      }
    });
    mo.observe(document.body, { childList:true, subtree:true });
  };
})();
