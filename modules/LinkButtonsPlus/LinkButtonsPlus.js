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
    `;
    const tag = document.createElement('style');
    tag.id = 'ops-panel-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  // ---------- storage helpers ----------
  const LS_KEY = 'module_data_v1';
  function loadDoc(){ try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } }
  function getGeneral(name){
    const d = loadDoc();
    const v = d && d.general ? d.general[name] : '';
    return (typeof v === 'string') ? v : '';
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
          <div class="ops-card leftTop">${leftTop}</div>
          <div class="ops-card leftBot">${leftBottom}</div>
          <div class="ops-card r0">${r[0] || ''}</div>
          <div class="ops-card r1">${r[1] || ''}</div>
          <div class="ops-card r2">${r[2] || ''}</div>
          <div class="ops-card r3">${r[3] || ''}</div>
          <div class="ops-card r4">${r[4] || ''}</div>
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

    // ---- Click behavior ----
    root.querySelectorAll('.ops-card').forEach(el => {
      el.addEventListener('click', () => {
        const label = (el.textContent || '').trim().toUpperCase();

        // EVENT (leftTop): Base64 deeplink with AUN as JobOrderNo
        if (label === 'EVENT') {
          const aun = (getGeneral('AUN') || '').trim();
          if (!aun) return alert('AUN is not set in module_data_v1.general.AUN');
          const raw = `func=deeplinksearch&searchTab=event&OPRange=&JobOrderNo=${aun}`;
          const b64 = b64encode(raw);
          openNew(URLS.EDOC_BASE + encodeURIComponent(b64) + '&b64=t');
          return;
        }

        // CMDS (leftBot): Base64 deeplink with PartNo as Component
        if (label === 'CMDS') {
          const partNo = (getGeneral('PartNo') || '').trim();
          if (!partNo) return alert('PartNo is not set in module_data_v1.general.PartNo');
          const raw = `func=deeplinksearch&searchTab=maint&DocumentType=CMDS&Status=eRL&Component=${partNo}`;
          const b64 = b64encode(raw);
          openNew(URLS.EDOC_BASE + encodeURIComponent(b64) + '&b64=t');
          return;
        }

        // ZIAUF3 → AUN
        if (label === 'ZIAUF3') {
          const aun = (getGeneral('AUN') || '').trim();
          if (!aun) return alert('AUN is not set in module_data_v1.general.AUN');
          openNew(URLS.ZIAUF3_BASE + encodeURIComponent(aun));
          return;
        }

        // ZILLK → Meldung (+ tail)
        if (label === 'ZILLK') {
          const meldung = (getGeneral('Meldung') || '').trim();
          if (!meldung) return alert('Meldung is not set in module_data_v1.general.Meldung');
          openNew(URLS.ZILLK_BASE + encodeURIComponent(meldung) + URLS.ZILLK_TAIL);
          return;
        }

        // ZIKV → AUN
        if (label === 'ZIKV') {
          const aun = (getGeneral('AUN') || '').trim();
          if (!aun) return alert('AUN is not set in module_data_v1.general.AUN');
          openNew(URLS.ZIKV_BASE + encodeURIComponent(aun));
          return;
        }

        // ZIQA → AUN
        if (label === 'ZIQA') {
          const aun = (getGeneral('AUN') || '').trim();
          if (!aun) return alert('AUN is not set in module_data_v1.general.AUN');
          openNew(URLS.ZIQA_BASE + encodeURIComponent(aun));
          return;
        }

        // REPORT → Testreport Viewer with PartNo + SerialNo
        if (label === 'REPORT') {
          const pn = (getGeneral('PartNo') || '').trim();
          const sn = (getGeneral('SerialNo') || '').trim();
          if (!pn || !sn) return alert('PartNo or SerialNo missing in module_data_v1.general');
          openNew(URLS.TRV_BASE + encodeURIComponent(pn) + '&sn=' + encodeURIComponent(sn));
          return;
        }

        // default: click-to-copy the tile label
        if (navigator.clipboard) navigator.clipboard.writeText(label).catch(()=>{});
        el.classList.add('ops-bounce');
        setTimeout(()=>el.classList.remove('ops-bounce'), 260);
      });
    });

    // ---- Context menu to enable/disable buttons ----
    const DIS_KEY = 'linkbuttonsplus-disabled';
    function loadDisabled(){ try { return JSON.parse(localStorage.getItem(DIS_KEY)) || {}; } catch { return {}; } }
    function saveDisabled(d){ localStorage.setItem(DIS_KEY, JSON.stringify(d)); }
    const disabled = loadDisabled();

    function applyDisabled(){
      root.querySelectorAll('.ops-card').forEach(el => {
        const lbl = (el.textContent || '').trim();
        el.style.display = disabled[lbl] ? 'none' : '';
      });
    }
    applyDisabled();

    const menu = document.createElement('div');
    menu.className = 'ops-menu';
    const allLabels = [leftTop, leftBottom, ...r].filter(Boolean);
    menu.innerHTML = allLabels.map(l => `<label><input type="checkbox" data-label="${l}"> ${l}</label>`).join('');
    document.body.appendChild(menu);

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
