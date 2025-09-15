/* Ops Panel — extended with toggleable links and Testreport deeplink */
(function () {
  // ---------- styles ----------
  if (!document.getElementById('ops-panel-styles')) {
    const css = `
    .ops-root{ height:100%; }
    .ops-outer{ height:100%; width:100%; padding:.6rem; box-sizing:border-box; overflow:hidden; }
    .ops-grid{
      height:100%; box-sizing:border-box; display:grid;
      grid-template-columns: 1fr 1fr; grid-template-rows: repeat(5, 1fr);
      gap:.6rem;
      grid-template-areas:
        "leftTop r0"
        "leftTop r1"
        "leftBot r2"
        "leftBot r3"
        "leftBot r4";
    }
    .ops-compact .ops-grid{
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(2, 1fr);
      grid-template-areas:
        "leftTop r0 r2 r4"
        "leftBot r1 r3 r4";
    }
    .ops-card{
      width:100%; height:100%; box-sizing:border-box;
      background: linear-gradient(to bottom, rgba(255,255,255,.08), rgba(255,255,255,.06)), var(--module-bg);
      border: 1px solid var(--module-border-color, #e5e7eb);
      border-radius: var(--module-border-radius, 1.25rem);
      color: var(--text-color);
      display:flex; align-items:center; justify-content:center;
      padding:.5rem 1rem; font-weight:600; letter-spacing:.2px;
      font-size: clamp(.9rem, 1.1vw + .4vh, 1.25rem);
      user-select:none; text-align:center;
      transition: transform .12s ease, box-shadow .12s ease, background-color .12s ease;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 6px 20px rgba(0,0,0,.12);
    }
    .ops-card:hover{ transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 10px 26px rgba(0,0,0,.18); }
    .ops-card:active{ transform: translateY(0); filter:saturate(1.05); }
    .leftTop{ grid-area:leftTop; } .leftBot{ grid-area:leftBot; }
    .r0{ grid-area:r0; } .r1{ grid-area:r1; } .r2{ grid-area:r2; } .r3{ grid-area:r3; } .r4{ grid-area:r4; }
    .ops-bounce{ animation: ops-bounce .25s ease; }
    @keyframes ops-bounce { 0%{transform:scale(1)} 50%{transform:scale(1.02)} 100%{transform:scale(1)} }

    .ops-menu{position:fixed; z-index:1000; display:none; min-width:160px; padding:.25rem;
      background:var(--sidebar-module-card-bg,#fff); color:var(--sidebar-module-card-text,#111);
      border:1px solid var(--border-color,#e5e7eb); border-radius:.5rem; box-shadow:0 10px 24px rgba(0,0,0,.18);}
    .ops-menu.open{display:block;}
    .ops-menu label{display:flex; align-items:center; gap:.4rem; padding:.35rem .6rem; cursor:pointer;}
    .ops-menu label:hover{background:rgba(0,0,0,.06);}
    .ops-menu hr{border:none; border-top:1px solid var(--border-color,#e5e7eb); margin:.25rem;}
    .ops-menu button{display:block; width:100%; margin:.25rem 0 0; padding:.35rem .6rem; border:none; border-radius:.4rem;
      background:var(--button-bg); color:var(--button-text); cursor:pointer;}
    .ops-menu .ops-file{display:block; font-size:.75rem; opacity:.8; padding:.2rem .6rem 0;}
    `;
    const tag = document.createElement('style');
    tag.id = 'ops-panel-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  // ---------- storage & dictionary helpers ----------
  const LS_KEY = 'module_data_v1';
  const IDB_NAME = 'modulesApp';
  const IDB_STORE = 'fs-handles';
  const GLOBAL_DICT_KEY = 'globalDict';
  const SHEET_NAME = 'records';
  const HEAD = ['meldung','auftrag','part','serial'];

  function loadDoc(){ try { return JSON.parse(localStorage.getItem(LS_KEY)) || {general:{}}; } catch { return {general:{}}; } }
  function saveDoc(doc){ try{ localStorage.setItem(LS_KEY, JSON.stringify(doc)); }catch{} }
  function activeMeldung(){ return (loadDoc().general.Meldung || '').trim(); }
  function saveDictFileName(name){ const d=loadDoc(); d.general ||= {}; d.general.dictFileName=name; saveDoc(d); }
  function loadDictFileName(){ return loadDoc().general.dictFileName || ''; }

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

  async function readAll(handle){
    await ensureXLSX();
    const f = await handle.getFile();
    if(f.size===0) return [];
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf,{type:'array'});
    const ws = wb.Sheets[SHEET_NAME] || wb.Sheets[wb.SheetNames[0]];
    if(!ws) return [];
    const rows = XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    const hdr = rows[0]?.map(h=>String(h||'').toLowerCase().trim()) || [];
    const idx = Object.fromEntries(HEAD.map(h=>[h, hdr.indexOf(h)]));
    return rows.slice(1).map(r=>({
      meldung:String(r[idx.meldung]??''),
      auftrag:String(r[idx.auftrag]??''),
      part:String(r[idx.part]??''),
      serial:String(r[idx.serial]??'')
    })).filter(r=>r.meldung||r.auftrag||r.part||r.serial);
  }

  // UTF-8 safe Base64
  function b64encode(str){
    try { return btoa(str); }
    catch { return btoa(unescape(encodeURIComponent(str))); }
  }

  // ---------- render ----------
  window.renderLinkButtonsPlus = function renderLinkButtonsPlus(root, ctx){
    const s = (ctx && ctx.moduleJson && ctx.moduleJson.settings) || {};
    const leftTop = s.leftTop || 'Event';
    const leftBottom = s.leftBottom || 'CMDS';
    const r = Array.isArray(s.rightLabels) && s.rightLabels.length
      ? s.rightLabels.slice(0,5)
      : ['ZIAUF3','ZILLK','ZIKV','ZIQA','REPORT'];

    root.classList.add('ops-root');

    root.innerHTML = `
      <div class="ops-outer">
        <div class="ops-grid">
          <div class="ops-card leftTop" data-slot="left0">${leftTop}</div>
          <div class="ops-card leftBot" data-slot="left1">${leftBottom}</div>
          <div class="ops-card r0" data-slot="r0">${r[0] || ''}</div>
          <div class="ops-card r1" data-slot="r1">${r[1] || ''}</div>
          <div class="ops-card r2" data-slot="r2">${r[2] || ''}</div>
          <div class="ops-card r3" data-slot="r3">${r[3] || ''}</div>
          <div class="ops-card r4" data-slot="r4">${r[4] || ''}</div>
        </div>
      </div>
    `;

    // ---- URLs ----
    const URLS = {
      ZIAUF3_BASE: 'https://sap-p04.lht.ham.dlh.de/sap/bc/gui/sap/its/webgui?sap-client=002&~transaction=*ziauf3+CAUFVD-AUFNR%3D',
      ZILLK_BASE:  'https://sap-p04.lht.ham.dlh.de/sap/bc/gui/sap/its/webgui?sap-client=002&~transaction=*zillk+ZILLK_IE_EINSTIEG-QMNUM%3D',
      ZILLK_TAIL:  '%3BDYNP_OKCODE%3DAENDERN',
      ZIKV_BASE:   'https://sap-p04.lht.ham.dlh.de/sap/bc/gui/sap/its/webgui?sap-client=002&~transaction=*zikv+AUFK-AUFNR%3D',
      ZIQA_BASE:   'https://sap-p04.lht.ham.dlh.de/sap/bc/gui/sap/its/webgui?sap-client=002&~transaction=*ziqa+AUFK-AUFNR%3D',
      EDOC_BASE:   'https://lww.edoc-read.lht.ham.dlh.de/edoc/app/login.html?nextURL=',
      TRV_BASE:    'https://testreportviewer.apps.az.lhtcloud.com/?pn='
    };
    const openNew = (url) => window.open(url, '_blank', 'noopener,noreferrer');

    // ---- Dictionary state ----
    let fileHandle = null;
    let cache = [];

    function lookup(){
      const m = activeMeldung();
      if(!m) return {m:'',aun:'',part:'',serial:''};
      const row = cache.find(r => (r.meldung||'').trim() === m);
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

    function reposition(){
      const right = Array.from(root.querySelectorAll('[data-slot^="r"]'))
        .filter(el => el.style.display !== 'none');
      right.forEach((el, idx) => {
        el.classList.remove('r0','r1','r2','r3','r4');
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
    menu.innerHTML = allLabels.map(l => `<label><input type="checkbox" data-label="${l}"> ${l}</label>`).join('') +
      '<hr><button class="ops-pick">Dictionary wählen</button><div class="ops-file"></div>';
    document.body.appendChild(menu);
    const fileLbl = menu.querySelector('.ops-file');
    fileLbl.textContent = loadDictFileName() ? `• ${loadDictFileName()}` : 'Kein Dictionary';

    async function pickDict(){
      try{
        alert('Bitte wählen Sie die Dictionary-Datei aus');
        const [h] = await showOpenFilePicker({
          types:[{description:'Dictionary (Excel)', accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],
          excludeAcceptAllOption:false, multiple:false
        });
        if(h && await ensureRWPermission(h)){
          fileHandle = h;
          await idbSet(GLOBAL_DICT_KEY,h);
          saveDictFileName(h.name || 'Dictionary.xlsx');
          fileLbl.textContent = `• ${h.name || 'Dictionary.xlsx'}`;
          cache = await readAll(h);
        }
      }catch(e){/* ignore */}
    }

    menu.querySelector('.ops-pick').addEventListener('click', ()=>{ menu.classList.remove('open'); pickDict(); });

    (async()=>{
      try{
        const h = await idbGet(GLOBAL_DICT_KEY);
        if(h && await ensureRWPermission(h)){
          fileHandle = h;
          cache = await readAll(h);
          fileLbl.textContent = `• ${loadDictFileName() || h.name || 'Dictionary.xlsx'}`;
        }
      }catch{}
    })();

    menu.querySelectorAll('input').forEach(chk => {
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
      menu.style.left = e.pageX + 'px';
      menu.style.top = e.pageY + 'px';
      menu.classList.add('open');
    });

    document.addEventListener('click', e => {
      if (!menu.contains(e.target)) menu.classList.remove('open');
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
        mo.disconnect();
      }
    });
    mo.observe(document.body, { childList:true, subtree:true });
  };
})();
