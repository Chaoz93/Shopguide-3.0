(function(){
  const STYLE_ID = 'obl-styles';
  if (!document.getElementById(STYLE_ID)) {
    const css = `
    .obl-root{height:100%;width:100%;display:flex;align-items:center;justify-content:center;padding:1rem;box-sizing:border-box;}
    .obl-trigger{appearance:none;border:none;outline:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;
      gap:.5rem;padding:1rem 1.6rem;border-radius:var(--module-border-radius,1.25rem);
      background:linear-gradient(135deg,rgba(37,99,235,.9),rgba(14,116,144,.92));
      color:var(--text-color,#fff);font-weight:700;font-size:clamp(1rem,1.2vw + .3vh,1.35rem);
      letter-spacing:.3px;box-shadow:0 20px 45px rgba(15,23,42,.35),inset 0 1px 0 rgba(255,255,255,.15);
      transition:transform .15s ease,box-shadow .15s ease,filter .15s ease;}
    .obl-trigger:hover{transform:translateY(-2px);box-shadow:0 26px 55px rgba(15,23,42,.42);filter:brightness(1.02);}
    .obl-trigger:active{transform:none;filter:brightness(.98);}
    .obl-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:2rem;
      background:rgba(15,23,42,.55);backdrop-filter:blur(18px);z-index:2800;}
    .obl-overlay.open{display:flex;}
    .obl-modal{width:min(720px,96vw);max-height:92vh;display:flex;flex-direction:column;gap:1.4rem;padding:1.6rem 1.8rem 1.8rem;
      border-radius:1.35rem;background:rgba(15,23,42,.92);color:var(--module-header-text,#f8fafc);
      border:1px solid rgba(148,163,184,.32);box-shadow:0 32px 68px rgba(8,15,35,.58);}
    .obl-modal-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;}
    .obl-modal-title{margin:0;font-size:1.4rem;font-weight:700;letter-spacing:.4px;}
    .obl-modal-sub{margin:0;font-size:.9rem;opacity:.78;}
    .obl-close{appearance:none;border:none;background:rgba(15,23,42,.6);color:inherit;font-size:1.7rem;line-height:1;
      width:2.6rem;height:2.6rem;border-radius:.9rem;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;
      transition:transform .15s ease,background .15s ease;}
    .obl-close:hover{transform:translateY(-2px);background:rgba(37,99,235,.45);}
    .obl-close:active{transform:none;}
    .obl-link-grid{display:grid;gap:.9rem;margin:0;padding:0;list-style:none;
      grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}
    .obl-link{display:flex;flex-direction:column;gap:.45rem;padding:1rem 1.1rem;border-radius:1rem;
      background:rgba(21,45,76,.72);border:1px solid rgba(76,114,163,.32);
      color:inherit;cursor:pointer;text-align:left;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease;
      box-shadow:0 18px 42px rgba(8,15,35,.45);}
    .obl-link:hover{transform:translateY(-2px);box-shadow:0 24px 52px rgba(8,15,35,.52);border-color:rgba(59,130,246,.55);}
    .obl-link:active{transform:none;}
    .obl-link-title{font-size:1.05rem;font-weight:700;letter-spacing:.25px;}
    .obl-link-desc{font-size:.82rem;opacity:.8;line-height:1.4;}
    @media (max-width:640px){
      .obl-root{padding:.6rem;}
      .obl-trigger{width:100%;padding:.9rem 1.2rem;}
      .obl-modal{padding:1.4rem 1.2rem;gap:1.1rem;}
    }
    `;
    const styleTag = document.createElement('style');
    styleTag.id = STYLE_ID;
    styleTag.textContent = css;
    document.head.appendChild(styleTag);
  }

  const LS_KEY = 'module_data_v1';
  function loadDoc(){
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch (err) { return {}; }
  }
  function getGeneral(name){
    const data = loadDoc();
    const val = data && data.general ? data.general[name] : '';
    return typeof val === 'string' ? val : '';
  }
  function b64encode(str){
    try { return btoa(str); }
    catch { return btoa(unescape(encodeURIComponent(str))); }
  }

  const URLS = {
    ZIAUF3_BASE: 'https://sap-p04.lht.ham.dlh.de/sap/bc/gui/sap/its/webgui?sap-client=002&~transaction=*ziauf3+CAUFVD-AUFNR%3D',
    ZIKV_BASE: 'https://sap-p04.lht.ham.dlh.de/sap/bc/gui/sap/its/webgui?sap-client=002&~transaction=*zikv+AUFK-AUFNR%3D',
    ZIQA_BASE: 'https://sap-p04.lht.ham.dlh.de/sap/bc/gui/sap/its/webgui?sap-client=002&~transaction=*ziqa+AUFK-AUFNR%3D',
    EDOC_BASE: 'https://lww.edoc-read.lht.ham.dlh.de/edoc/app/login.html?nextURL='
  };

  const LINK_DEFINITIONS = [
    {
      key: 'ZIAUF3',
      title: 'ZIAUF3',
      description: 'Öffnet den SAP-Auftrag für die aktuelle AUN (module_data_v1.general.AUN).'
    },
    {
      key: 'ZIKV',
      title: 'ZIKV',
      description: 'Zeigt den Kapazitätsstatus für die AUN (module_data_v1.general.AUN).'
    },
    {
      key: 'ZIQA',
      title: 'ZIQA',
      description: 'Öffnet die Qualitätsübersicht zu der AUN (module_data_v1.general.AUN).'
    },
    {
      key: 'CMDS',
      title: 'CMDS',
      description: 'Startet die CMDS-Suche im eDoc (module_data_v1.general.PartNo).'
    }
  ];

  function openWindow(url){
    try { window.open(url, '_blank', 'noopener,noreferrer'); }
    catch (err) { console.warn('Konnte Fenster nicht öffnen', err); }
  }

  function handleLink(key){
    const upper = String(key || '').toUpperCase();
    if (!upper) return false;
    if (upper === 'ZIAUF3' || upper === 'ZIKV' || upper === 'ZIQA') {
      const aun = (getGeneral('AUN') || '').trim();
      if (!aun) {
        alert('AUN is not set in module_data_v1.general.AUN');
        return false;
      }
      if (upper === 'ZIAUF3') {
        openWindow(URLS.ZIAUF3_BASE + encodeURIComponent(aun));
        return true;
      }
      if (upper === 'ZIKV') {
        openWindow(URLS.ZIKV_BASE + encodeURIComponent(aun));
        return true;
      }
      if (upper === 'ZIQA') {
        openWindow(URLS.ZIQA_BASE + encodeURIComponent(aun));
        return true;
      }
    }
    if (upper === 'CMDS') {
      const partNo = (getGeneral('PartNo') || '').trim();
      if (!partNo) {
        alert('PartNo is not set in module_data_v1.general.PartNo');
        return false;
      }
      const raw = `func=deeplinksearch&searchTab=maint&DocumentType=CMDS&Status=eRL&Component=${partNo}`;
      const encoded = b64encode(raw);
      openWindow(URLS.EDOC_BASE + encodeURIComponent(encoded) + '&b64=t');
      return true;
    }
    return false;
  }

  window.renderOneButtonLinks = function renderOneButtonLinks(root, ctx){
    if (!root) return;
    const settings = ctx?.moduleJson?.settings || {};
    const buttonLabel = settings.buttonLabel || 'OneButton';
    const modalTitle = settings.modalTitle || 'Schnellzugriff';
    const modalSubtitle = settings.modalSubtitle || 'Wähle einen Eintrag, um die Seite zu öffnen.';

    root.classList.add('obl-root');
    const links = (Array.isArray(settings.links) && settings.links.length)
      ? settings.links.map((item)=>{
          if (!item || typeof item !== 'object') return null;
          const def = LINK_DEFINITIONS.find((d)=>d.key === item.key) || LINK_DEFINITIONS.find((d)=>d.key === String(item.key || '').toUpperCase());
          if (!def) return null;
          return {
            key: def.key,
            title: item.title || def.title,
            description: item.description || def.description
          };
        }).filter(Boolean)
      : LINK_DEFINITIONS.slice();

    const listHtml = links.map((link)=>{
      const desc = link.description ? `<span class="obl-link-desc">${link.description}</span>` : '';
      return `<li><button type="button" class="obl-link" data-obl-link="${link.key}"><span class="obl-link-title">${link.title}</span>${desc}</button></li>`;
    }).join('');

    root.innerHTML = `
      <button type="button" class="obl-trigger" data-obl-open>${buttonLabel}</button>
      <div class="obl-overlay" data-obl-overlay hidden>
        <div class="obl-modal" role="dialog" aria-modal="true" aria-labelledby="obl-modal-title">
          <div class="obl-modal-header">
            <div>
              <h2 class="obl-modal-title" id="obl-modal-title">${modalTitle}</h2>
              <p class="obl-modal-sub">${modalSubtitle}</p>
            </div>
            <button type="button" class="obl-close" data-obl-close aria-label="Schließen">×</button>
          </div>
          <ul class="obl-link-grid">${listHtml}</ul>
        </div>
      </div>
    `;

    const openBtn = root.querySelector('[data-obl-open]');
    const overlay = root.querySelector('[data-obl-overlay]');
    const closeBtn = root.querySelector('[data-obl-close]');
    const linkButtons = Array.from(root.querySelectorAll('[data-obl-link]'));

    function close(){
      if (!overlay) return;
      overlay.classList.remove('open');
      overlay.setAttribute('hidden','');
      document.removeEventListener('keydown', onKeydown, true);
      if (openBtn) openBtn.focus({ preventScroll: true });
    }

    function open(){
      if (!overlay) return;
      overlay.classList.add('open');
      overlay.removeAttribute('hidden');
      document.addEventListener('keydown', onKeydown, true);
      const first = linkButtons[0];
      if (first) {
        try { first.focus({ preventScroll: true }); }
        catch { first.focus(); }
      }
    }

    function onKeydown(event){
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        close();
      }
    }

    openBtn?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', (event)=>{
      if (event.target === overlay) close();
    });

    linkButtons.forEach((btn)=>{
      btn.addEventListener('click', ()=>{
        const key = btn.getAttribute('data-obl-link');
        if (!key) return;
        const opened = handleLink(key);
        if (opened) close();
      });
    });
  };
})();
