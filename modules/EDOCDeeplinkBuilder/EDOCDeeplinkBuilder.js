(function(){
  const STYLE_ID = 'dlb-styles';
  const BASE_URL = 'https://lww.edoc-read.lht.ham.dlh.de/edoc/app/login.html?nextURL=';

  const allowed = {
    manualinit: {
      tabs: [],
      fieldsByTab: { _: ['manualVersionId', 'nodeId', 'documentNumber', 'time', 'task'] }
    },
    deeplinksearch: {
      tabs: ['all', 'maint', 'jc', 'td', 'cras', 'event'],
      fieldsByTab: {
        all: [],
        maint: ['DocumentType', 'AtaFrom', 'AtaTo', 'Status', 'Aircraft', 'EngineAPU', 'Component', 'Customer', 'DocumentNo', 'DocumentRevision'],
        jc: ['OPRange', 'JobcardType', 'Status', 'CardNo', 'PartNo', 'Series', 'PlannerGroup', 'ActEdit', 'Engineer', 'WorkCell', 'Department'],
        td: ['DocType', 'Status', 'Material', 'EngineAPU', 'ManufacturerDocNo', 'PublishedBy', 'RevDateFromInput', 'RevDateToInput'],
        cras: ['ProjectType', 'Status', 'AtaFrom', 'AtaTo', 'ProjectCRASSupNO', 'TypeOfRepair', 'ACEngType', 'Taoösogm', 'MsnESN', '…'],
        event: ['OPRange', 'JobOrderNo', 'Status', 'PartNo', 'SerialNo', 'JobcardNo', 'JobcardType', 'Department', 'PublicationDateFrom', 'PublicationDateTo', 'EquipmentNo', 'CCI', 'WorkCell']
      }
    }
  };

  const PRESET_NAMES = ['Main', 'Alternative', 'Accent'];

  function ensureStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
    .dlb-root{height:100%;width:100%;padding:.65rem;box-sizing:border-box;display:flex;flex-direction:column;gap:.55rem;
      background:var(--dlb-surface-bg,#0f172a);color:var(--dlb-surface-text,#e5e7eb);}
    .dlb-root[data-mode="compact"]{gap:.45rem;padding:.55rem;}
    .dlb-root[data-mode="minimal"]{gap:.35rem;padding:.5rem;}
    .dlb-card{background:var(--dlb-card-bg,rgba(15,23,42,.72));border:1px solid var(--dlb-border,rgba(148,163,184,.28));
      border-radius:var(--module-border-radius,1rem);padding:.75rem;box-sizing:border-box;box-shadow:var(--dlb-shadow,0 14px 30px rgba(0,0,0,.25));}
    .dlb-root[data-mode="compact"] .dlb-card{padding:.65rem;}
    .dlb-root[data-mode="minimal"] .dlb-card{padding:.55rem;}
    .dlb-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.25rem;flex-wrap:wrap;}
    .dlb-title{margin:0;font-size:clamp(.95rem,1vw + .3vh,1.15rem);font-weight:700;letter-spacing:.2px;}
    .dlb-pill{padding:.25rem .55rem;border-radius:999px;border:1px solid var(--dlb-border,rgba(148,163,184,.32));font-size:.78rem;
      background:var(--dlb-alt-bg,rgba(15,32,56,.65));color:inherit;display:inline-flex;align-items:center;gap:.35rem;}
    .dlb-status{min-height:1.2rem;font-size:.82rem;opacity:.78;}
    .dlb-row{display:flex;align-items:flex-end;gap:.8rem;flex-wrap:wrap;}
    .dlb-row > *{flex:1 1 160px;min-width:0;}
    .dlb-field{display:flex;flex-direction:column;gap:.35rem;}
    .dlb-root[data-mode="compact"] .dlb-row{gap:.6rem;}
    .dlb-label{display:flex;align-items:center;gap:.35rem;margin-bottom:.25rem;font-size:.82rem;opacity:.82;}
    .dlb-label small{opacity:.7;}
    .dlb-input,.dlb-select,.dlb-textarea{width:100%;padding:.6rem .65rem;border-radius:.75rem;border:1px solid var(--dlb-border,rgba(148,163,184,.3));
      background:var(--dlb-input-bg,rgba(15,23,42,.6));color:inherit;font:inherit;box-sizing:border-box;}
    .dlb-select{appearance:none;}
    .dlb-textarea{min-height:78px;resize:vertical;}
    .dlb-buttons{display:flex;gap:.65rem;flex-wrap:wrap;}
    .dlb-btn{appearance:none;border:1px solid var(--dlb-border,rgba(148,163,184,.32));padding:.55rem .85rem;border-radius:.75rem;
      background:var(--dlb-btn-bg,rgba(15,32,56,.65));color:inherit;font-weight:600;cursor:pointer;transition:transform .12s ease,background .12s ease,border-color .12s ease;}
    .dlb-btn:hover{transform:translateY(-1px);border-color:var(--dlb-accent-border,rgba(59,130,246,.55));background:var(--dlb-btn-hover-bg,rgba(37,99,235,.12));}
    .dlb-btn:active{transform:none;}
    .dlb-btn-accent{background:var(--dlb-accent-bg,rgba(59,130,246,.22));border-color:var(--dlb-accent-border,rgba(59,130,246,.55));color:var(--dlb-accent-text,inherit);}
    .dlb-btn-ghost{background:transparent;}
    .dlb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.6rem;align-items:start;}
    .dlb-root[data-mode="minimal"] .dlb-grid{grid-template-columns:1fr;}
    .dlb-kv-list{display:flex;flex-direction:column;gap:.85rem;margin-top:.35rem;}
    .dlb-root[data-mode="compact"] .dlb-kv-list{gap:.75rem;}
    .dlb-root[data-mode="minimal"] .dlb-kv-list{gap:.65rem;}
    .dlb-row.kv-row{display:grid;grid-template-columns:1fr 1.2fr auto;align-items:center;gap:.65rem;}
    .dlb-root[data-mode="compact"] .dlb-row.kv-row{grid-template-columns:1fr 1fr auto;}
    .dlb-root[data-mode="minimal"] .dlb-row.kv-row{grid-template-columns:1fr 1fr;}
    .dlb-row.kv-row .dlb-delete{justify-self:end;}
    .dlb-helper{font-size:.78rem;opacity:.75;margin-top:.25rem;}
    .dlb-url{word-break:break-all;padding:.5rem .55rem;border-radius:.75rem;border:1px dashed var(--dlb-border,rgba(148,163,184,.32));
      background:var(--dlb-input-bg,rgba(15,23,42,.55));}
    .dlb-inline-info{display:none;font-size:.82rem;opacity:.85;margin:.3rem 0;padding:.55rem .6rem;border-radius:.7rem;
      background:var(--dlb-input-bg,rgba(15,23,42,.55));border:1px solid var(--dlb-border,rgba(148,163,184,.3));white-space:pre-wrap;}
    .dlb-root[data-mode="minimal"] .dlb-inline-info{display:block;}
    .dlb-root[data-mode="minimal"] .dlb-info-card{display:none;}
    .dlb-empty{padding:.5rem 0;font-size:.82rem;opacity:.78;}
    .dlb-divider{border:none;border-top:1px solid var(--dlb-border,rgba(148,163,184,.22));margin:.55rem 0;}
    @media(max-width:640px){
      .dlb-root{padding:.55rem;}
      .dlb-row.kv-row{grid-template-columns:1fr 1fr;}
    }
    `;
    document.head.appendChild(style);
  }

  function readValue(styles, prop){
    return (styles?.getPropertyValue(prop) || '').trim();
  }

  function loadColorLayers(){
    const root = document.documentElement;
    const styles = root ? getComputedStyle(root) : null;
    const baseModuleBg = readValue(styles, '--module-layer-module-bg') || readValue(styles, '--module-bg');
    const baseModuleText = readValue(styles, '--module-layer-module-text') || readValue(styles, '--text-color');
    const baseModuleBorder = readValue(styles, '--module-layer-module-border') || readValue(styles, '--module-border-color');

    const layers = [];
    const appLayers = Array.isArray(window?.appSettings?.moduleColorLayers) ? window.appSettings.moduleColorLayers : [];
    if(appLayers.length){
      appLayers.slice(0, PRESET_NAMES.length).forEach((layer, index) => {
        const name = (layer?.name || '').trim() || PRESET_NAMES[index];
        layers.push({
          name,
          module: {
            bg: (layer?.moduleBg || '').trim() || baseModuleBg,
            text: (layer?.moduleText || '').trim() || baseModuleText,
            border: (layer?.moduleBorder || '').trim() || baseModuleBorder
          }
        });
      });
    }

    if(!layers.length && styles){
      for(let i=1;i<=PRESET_NAMES.length;i+=1){
        const name = readValue(styles, `--module-layer-${i}-name`) || PRESET_NAMES[i-1];
        const bg = readValue(styles, `--module-layer-${i}-module-bg`);
        const text = readValue(styles, `--module-layer-${i}-module-text`);
        const border = readValue(styles, `--module-layer-${i}-module-border`);
        if(name || bg || text || border){
          layers.push({
            name,
            module: { bg: bg || baseModuleBg, text: text || baseModuleText, border: border || baseModuleBorder }
          });
        }
      }
    }

    if(!layers.length){
      layers.push({ name: PRESET_NAMES[0], module: { bg: baseModuleBg, text: baseModuleText, border: baseModuleBorder } });
    }

    return layers;
  }

  function applyPalette(container){
    const layers = loadColorLayers();
    const main = layers[0]?.module || {};
    const alt = layers[1]?.module || main;
    const accent = layers[2]?.module || alt;

    const toValue = (v, fallback) => (v && v.trim()) || fallback;
    const fallbackBg = toValue(main.bg, '#0f172a');
    const fallbackText = toValue(main.text, '#e5e7eb');
    const fallbackBorder = toValue(main.border, 'rgba(148,163,184,.32)');

    container.style.setProperty('--dlb-surface-bg', toValue(main.bg, fallbackBg));
    container.style.setProperty('--dlb-surface-text', toValue(main.text, fallbackText));
    container.style.setProperty('--dlb-border', toValue(main.border, fallbackBorder));

    container.style.setProperty('--dlb-card-bg', toValue(alt.bg, fallbackBg));
    container.style.setProperty('--dlb-alt-bg', toValue(alt.bg, fallbackBg));
    container.style.setProperty('--dlb-input-bg', toValue(alt.bg, 'rgba(15,23,42,.6)'));
    container.style.setProperty('--dlb-btn-bg', toValue(alt.bg, fallbackBg));
    container.style.setProperty('--dlb-btn-hover-bg', toValue(alt.bg, 'rgba(37,99,235,.12)'));

    container.style.setProperty('--dlb-accent-bg', toValue(accent.bg, 'rgba(59,130,246,.22)'));
    container.style.setProperty('--dlb-accent-border', toValue(accent.border, 'rgba(59,130,246,.55)'));
    container.style.setProperty('--dlb-accent-text', toValue(accent.text, fallbackText));

    container.style.setProperty('--dlb-shadow', '0 16px 34px rgba(0,0,0,.25)');
  }

  function b64encodeUtf8(str){
    try{ return btoa(unescape(encodeURIComponent(str))); }
    catch{ return btoa(str); }
  }

  function safeAtob(s){
    let t = (s || '').replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
    while(t.length % 4) t += '=';
    return atob(t);
  }

  function tryBase64Decode(text){
    try{
      const raw = safeAtob(text);
      const pct = Array.prototype.map.call(raw, c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('');
      return decodeURIComponent(pct);
    }catch(_){ return null; }
  }

  function looksLikeBase64(s){
    return /^[A-Za-z0-9+/_=-]+$/.test(s) && s.replace(/=/g, '').length >= 8;
  }

  function normalizeInfoPart(raw){
    let s = (raw || '').replace(/\+/g, ' ');
    for(let i=0;i<3;i+=1){
      if(!/%[0-9A-Fa-f]{2}/.test(s)) break;
      try {
        const dec = decodeURIComponent(s);
        if(dec === s) break;
        s = dec;
      } catch { break; }
    }
    return s;
  }

  function escapeHtml(text){
    return (text || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c] || c));
  }

  function parseInfoPart(str){
    const out = [];
    if(!str) return out;
    for(const seg0 of str.split('&')){
      if(seg0 === '') continue;
      const seg = seg0.replace(/\+/g, ' ');
      const eq = seg.indexOf('=');
      if(eq < 0){ out.push({ k: null, v: decodeURIComponent(seg) }); continue; }
      const k = decodeURIComponent(seg.slice(0, eq));
      const v = decodeURIComponent(seg.slice(eq + 1));
      out.push({ k, v });
    }
    return out;
  }

  function extractNextURLPayload(input){
    let s = (input || '').trim();
    if(!s) return null;
    try{
      const u = new URL(s);
      const fromQuery = u.searchParams.get('nextURL') || u.searchParams.get('nextUrl') || u.searchParams.get('nexturl');
      if(fromQuery) return fromQuery;
      if(u.hash && u.hash.includes('nextURL=')){
        const h = new URLSearchParams(u.hash.replace(/^#\??/, ''));
        const fromHash = h.get('nextURL') || h.get('nextUrl') || h.get('nexturl');
        if(fromHash) return fromHash;
      }
    }catch(_){/* fall back */}
    const m = s.match(/nexturl=([^&#]+)/i);
    if(m) return m[1];
    return s;
  }

  window.renderEDOCDeeplinkBuilder = function renderEDOCDeeplinkBuilder(root){
    ensureStyles();
    if(!root) return;

    const container = document.createElement('div');
    container.className = 'dlb-root';
    root.innerHTML = '';
    root.appendChild(container);
    applyPalette(container);

    const header = document.createElement('div');
    header.className = 'dlb-header';
    const title = document.createElement('h3');
    title.className = 'dlb-title';
    title.textContent = 'eDoc Deeplink Builder';
    const modePill = document.createElement('div');
    modePill.className = 'dlb-pill';
    modePill.textContent = 'Layout: auto';
    header.append(title, modePill);

    const status = document.createElement('div');
    status.className = 'dlb-status';

    /* Import */
    const importCard = document.createElement('div');
    importCard.className = 'dlb-card';
    const importRow = document.createElement('div');
    importRow.className = 'dlb-row';
    const importInput = document.createElement('input');
    importInput.type = 'text';
    importInput.className = 'dlb-input';
    importInput.title = 'Link oder nextURL-Payload eingeben';
    importInput.setAttribute('aria-label', 'Import-Link oder nextURL Payload');
    importInput.placeholder = 'https://...login.html?nextURL=...&b64=t  oder  eyJhPSIuLi4iIH0=';
    const importButtons = document.createElement('div');
    importButtons.className = 'dlb-buttons';
    importButtons.style.flex = '0 0 auto';
    const decodeBtn = document.createElement('button');
    decodeBtn.className = 'dlb-btn dlb-btn-accent';
    decodeBtn.textContent = 'Dekodieren & Laden';
    importButtons.append(decodeBtn);
    importRow.append(importInput, importButtons);
    importCard.append(importRow);

    /* Builder */
    const builderCard = document.createElement('div');
    builderCard.className = 'dlb-card';
    const builderHeader = document.createElement('div');
    builderHeader.className = 'dlb-row';

    const funcWrap = document.createElement('div');
    const funcLabel = document.createElement('label'); funcLabel.className = 'dlb-label'; funcLabel.textContent = 'func';
    const funcSel = document.createElement('select'); funcSel.className = 'dlb-select';
    ['manualinit','deeplinksearch'].forEach(val => {
      const o = document.createElement('option'); o.value = val; o.textContent = val; funcSel.appendChild(o);
    });
    funcWrap.append(funcLabel, funcSel);

    const tabWrap = document.createElement('div');
    const tabLabel = document.createElement('label'); tabLabel.className = 'dlb-label'; tabLabel.textContent = 'searchTab';
    const tabSel = document.createElement('select'); tabSel.className = 'dlb-select';
    tabWrap.append(tabLabel, tabSel);

    const actionWrap = document.createElement('div');
    actionWrap.style.flex = '0 0 auto';
    const actionLabel = document.createElement('label'); actionLabel.className = 'dlb-label'; actionLabel.innerHTML = '&nbsp;';
    const actionButtons = document.createElement('div'); actionButtons.className = 'dlb-buttons';
    const addRowBtn = document.createElement('button'); addRowBtn.className = 'dlb-btn'; addRowBtn.textContent = '＋ Feld hinzufügen';
    const resetBtn = document.createElement('button'); resetBtn.className = 'dlb-btn dlb-btn-ghost'; resetBtn.textContent = 'Reset';
    actionButtons.append(addRowBtn, resetBtn);
    actionWrap.append(actionLabel, actionButtons);

    builderHeader.append(funcWrap, tabWrap, actionWrap);

    const kvList = document.createElement('div');
    kvList.className = 'dlb-kv-list';

    builderCard.append(builderHeader, kvList);

    /* Preview */
    const previewGrid = document.createElement('div');
    previewGrid.className = 'dlb-grid';

    const infoCard = document.createElement('div');
    infoCard.className = 'dlb-card dlb-info-card';
    const infoLabel = document.createElement('label'); infoLabel.className = 'dlb-label'; infoLabel.textContent = 'Information (pre-Base64)';
    const infoPreview = document.createElement('textarea'); infoPreview.className = 'dlb-textarea'; infoPreview.readOnly = true;
    infoCard.append(infoLabel, infoPreview);

    const urlCard = document.createElement('div');
    urlCard.className = 'dlb-card';
    const urlHeader = document.createElement('div'); urlHeader.className = 'dlb-row';
    const urlLabelWrap = document.createElement('div'); urlLabelWrap.className = 'dlb-field';
    const urlLabel = document.createElement('label'); urlLabel.className = 'dlb-label'; urlLabel.textContent = 'Finale URL';
    urlLabelWrap.append(urlLabel);

    const linkTextWrap = document.createElement('div'); linkTextWrap.className = 'dlb-field';
    const linkTextInput = document.createElement('input'); linkTextInput.className = 'dlb-input'; linkTextInput.type = 'text';
    linkTextInput.title = 'Optionaler Anzeigename beim Kopieren als Rich-Link';
    linkTextInput.setAttribute('aria-label', 'Link-Text (optional)');
    linkTextInput.placeholder = 'Angezeigter Text beim Kopieren';
    linkTextWrap.append(linkTextInput);

    urlHeader.append(urlLabelWrap, linkTextWrap);
    const urlDisplay = document.createElement('div'); urlDisplay.className = 'dlb-url';

    const inlineInfo = document.createElement('div'); inlineInfo.className = 'dlb-inline-info';

    const urlActions = document.createElement('div'); urlActions.className = 'dlb-buttons';
    const copyBtn = document.createElement('button'); copyBtn.className = 'dlb-btn dlb-btn-accent'; copyBtn.textContent = 'URL kopieren';
    const openBtn = document.createElement('a'); openBtn.className = 'dlb-btn'; openBtn.textContent = 'Öffnen'; openBtn.target = '_blank'; openBtn.rel = 'noopener';
    urlActions.append(copyBtn, openBtn);

    urlCard.append(urlHeader, urlDisplay, inlineInfo, urlActions);

    previewGrid.append(infoCard, urlCard);

    container.append(header, importCard, builderCard, previewGrid, status);

    const rows = [];

    function setStatus(msg, tone){
      status.textContent = msg || '';
      status.style.opacity = msg ? 0.92 : 0.7;
      status.style.color = tone === 'error' ? '#fca5a5' : tone === 'success' ? '#bef264' : '';
      status.style.display = msg ? '' : 'none';
    }

    function allowedKeysForCurrent(){
      if(funcSel.value === 'manualinit') return allowed.manualinit.fieldsByTab._;
      return allowed.deeplinksearch.fieldsByTab[tabSel.value] || [];
    }

    function renderTabOptions(){
      tabSel.innerHTML = '';
      if(funcSel.value === 'deeplinksearch'){
        allowed.deeplinksearch.tabs.forEach(t => {
          const o = document.createElement('option'); o.value = t; o.textContent = t; tabSel.appendChild(o);
        });
        tabSel.disabled = false;
      } else {
        const o = document.createElement('option'); o.value = ''; o.textContent = '(none)'; tabSel.appendChild(o);
        tabSel.disabled = true;
      }
      if(tabSel.options.length && !tabSel.value){
        tabSel.value = tabSel.options[0].value;
      }
    }

    function rebuildKeyOptions(){
      const allowedKeys = allowedKeysForCurrent();
      rows.forEach(r => {
        const current = r.keySel.value || '';
        const used = new Set(rows.filter(x => x !== r).map(x => x.keySel.value).filter(v => v && v !== '__CUSTOM__'));
        const available = ['__CUSTOM__', ...allowedKeys.filter(k => !used.has(k) || k === current)];
        r.keySel.innerHTML = '';
        available.forEach(k => {
          const o = document.createElement('option');
          o.value = k; o.textContent = k === '__CUSTOM__' ? 'Custom (frei)' : k;
          r.keySel.appendChild(o);
        });
        if(available.includes(current)) r.keySel.value = current; else r.keySel.value = available[0] || '__CUSTOM__';
        if(r.keySel.value === '__CUSTOM__') r.input.placeholder = 'key=value oder Freitext';
        else r.input.placeholder = 'value';
      });
    }

    function addRow(defaultKey, defaultVal){
      const row = document.createElement('div'); row.className = 'dlb-row kv-row';
      const keySel = document.createElement('select'); keySel.className = 'dlb-select';
      const input = document.createElement('input'); input.type = 'text'; input.className = 'dlb-input'; input.placeholder = 'value';
      const del = document.createElement('button'); del.type = 'button'; del.className = 'dlb-btn dlb-btn-ghost dlb-delete'; del.textContent = '–';
      row.append(keySel, input, del);
      kvList.appendChild(row);
      const obj = { el: row, keySel, input };
      rows.push(obj);

      keySel.addEventListener('change', () => { rebuildKeyOptions(); updateOutputs(); });
      input.addEventListener('input', updateOutputs);
      del.addEventListener('click', () => {
        const idx = rows.indexOf(obj);
        if(idx >= 0) rows.splice(idx, 1);
        row.remove();
        rebuildKeyOptions();
        updateOutputs();
      });

      rebuildKeyOptions();
      if(defaultKey){
        if(defaultKey === '__CUSTOM__') keySel.value = '__CUSTOM__';
        else keySel.value = allowedKeysForCurrent().includes(defaultKey) ? defaultKey : '__CUSTOM__';
      }
      input.value = defaultVal || '';
      updateOutputs();
    }

    function clearRows(){ rows.splice(0).forEach(r => r.el.remove()); }

    function buildInfoPart(){
      const parts = [];
      parts.push(`func=${funcSel.value}`);
      if(funcSel.value === 'deeplinksearch'){ parts.push(`searchTab=${tabSel.value}`); }
      rows.forEach(r => {
        const k = r.keySel.value; const v = r.input.value || '';
        if(!v) return;
        if(k === '__CUSTOM__') parts.push(v.trim());
        else parts.push(`${k}=${encodeURIComponent(v).replace(/%20/g,'+')}`);
      });
      return parts.join('&');
    }

    function updateOutputs(){
      const info = buildInfoPart();
      infoPreview.value = info;
      inlineInfo.textContent = info || '—';
      const encoded = b64encodeUtf8(info);
      const url = `${BASE_URL}${encoded}&b64=t`;
      urlDisplay.textContent = url;
      openBtn.href = url;
    }

    function decodeAndLoad(){
      const input = (importInput.value || '').trim();
      if(!input){ setStatus('Kein Eingabewert zum Dekodieren.', 'error'); return; }

      let payload = extractNextURLPayload(input);
      if(!payload){ setStatus('Konnte keine nextURL-Payload erkennen.', 'error'); return; }

      try{ if(/%[0-9A-Fa-f]{2}/.test(payload)) payload = decodeURIComponent(payload); }catch(_){ /* ignore */ }

      const hintedB64 = /(?:^|[?&#])b64=1|(?:^|[?&#])b64=t/i.test(input);
      let infoPart = null;
      if(hintedB64 || looksLikeBase64(payload)){
        const maybe = tryBase64Decode(payload);
        if(maybe !== null) infoPart = maybe;
      }
      if(infoPart === null) infoPart = payload;
      infoPart = normalizeInfoPart(infoPart);

      const pairs = parseInfoPart(infoPart);
      const funcPair = pairs.find(p => p.k === 'func');
      const tabPair = pairs.find(p => p.k === 'searchTab');

      funcSel.value = funcPair ? funcPair.v : 'deeplinksearch';
      renderTabOptions();
      if(funcSel.value === 'deeplinksearch' && tabPair){ tabSel.value = tabPair.v; }
      clearRows();

      pairs.forEach(({k, v}) => {
        if(k === 'func' || k === 'searchTab') return;
        const allowedNow = allowedKeysForCurrent();
        if(k && allowedNow.includes(k)) addRow(k, v);
        else if(k) addRow('__CUSTOM__', `${k}=${v}`);
        else addRow('__CUSTOM__', v);
      });
      updateOutputs();
      setStatus('Payload geladen.', 'success');
    }

    function reset(){
      funcSel.value = 'deeplinksearch';
      renderTabOptions();
      tabSel.value = 'maint';
      clearRows();
      addRow('DocumentType', '');
      addRow('Status', '');
      updateOutputs();
      linkTextInput.value = '';
      setStatus('Zurückgesetzt.');
    }

    decodeBtn.addEventListener('click', decodeAndLoad);
    funcSel.addEventListener('change', () => { renderTabOptions(); clearRows(); addRow(); rebuildKeyOptions(); updateOutputs(); });
    tabSel.addEventListener('change', () => { rebuildKeyOptions(); updateOutputs(); });
    addRowBtn.addEventListener('click', () => addRow());
    resetBtn.addEventListener('click', reset);

    copyBtn.addEventListener('click', async () => {
      const url = urlDisplay.textContent || '';
      const linkText = (linkTextInput.value || '').trim();
      if(!url){ setStatus('Keine URL zum Kopieren.', 'error'); return; }

      const fallbackCopyText = async (text) => {
        if(navigator?.clipboard?.writeText){
          await navigator.clipboard.writeText(text);
        }else{
          const temp = document.createElement('textarea');
          temp.value = text; temp.style.position = 'fixed'; temp.style.opacity = '0';
          document.body.appendChild(temp); temp.select(); document.execCommand('copy'); temp.remove();
        }
      };

      try{
        if(linkText){
          const safeUrl = escapeHtml(url);
          const safeText = escapeHtml(linkText);
          const html = `<a href="${safeUrl}">${safeText}</a>`;
          const plain = `${linkText} (${url})`;

          if(navigator?.clipboard?.write && window.ClipboardItem){
            const item = new ClipboardItem({
              'text/html': new Blob([html], { type: 'text/html' }),
              'text/plain': new Blob([plain], { type: 'text/plain' })
            });
            await navigator.clipboard.write([item]);
          } else {
            await fallbackCopyText(html);
          }
          setStatus('Rich Link kopiert.', 'success');
        } else {
          await fallbackCopyText(url);
          setStatus('URL kopiert.', 'success');
        }
        copyBtn.textContent = 'Kopiert';
        setTimeout(() => { copyBtn.textContent = 'URL kopieren'; }, 900);
      }catch(_){
        setStatus('Konnte URL nicht kopieren.', 'error');
      }
    });

    function updateLayout(){
      const rect = container.getBoundingClientRect();
      const mode = rect.width < 440 || rect.height < 360 ? 'minimal' : (rect.width < 720 || rect.height < 520 ? 'compact' : 'full');
      container.dataset.mode = mode;
      modePill.textContent = `Layout: ${mode}`;
    }

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);

    renderTabOptions();
    tabSel.value = 'maint';
    addRow('DocumentType', '');
    addRow('Status', '');
    updateOutputs();
    setStatus('');
    updateLayout();
  };
})();
