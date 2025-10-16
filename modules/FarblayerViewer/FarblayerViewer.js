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

  const instanceRegistry = new Map();

  function registerFarblayerInstance(moduleName, api){
    if(!moduleName || !api) return;
    instanceRegistry.set(moduleName, api);
  }

  function unregisterFarblayerInstance(moduleName, api){
    if(!moduleName) return;
    const current = instanceRegistry.get(moduleName);
    if(current && (!api || api === current)){
      instanceRegistry.delete(moduleName);
    }
  }

  function getFarblayerInstance(moduleName){
    if(moduleName && instanceRegistry.has(moduleName)){
      return instanceRegistry.get(moduleName);
    }
    if(instanceRegistry.size === 1){
      return Array.from(instanceRegistry.values())[0];
    }
    return null;
  }

  function normalizeGroupPayload(groups, instance){
    const payload = {};
    const sourceAssignments = instance && typeof instance.getGroupAssignments === 'function'
      ? instance.getGroupAssignments()
      : {};
    if(groups && typeof groups === 'object' && !Array.isArray(groups)){
      Object.keys(groups).forEach(groupName => {
        const entry = groups[groupName] || {};
        const layer = typeof entry === 'string' ? entry : entry.layer;
        payload[groupName] = { layer: layer || sourceAssignments[groupName] || null };
      });
      return payload;
    }
    const names = Array.isArray(groups)
      ? groups.slice()
      : instance && typeof instance.getGroups === 'function'
        ? instance.getGroups()
        : [];
    names.forEach(groupName => {
      payload[groupName] = { layer: sourceAssignments[groupName] || null };
    });
    return payload;
  }

  function loadStoredAssignments(moduleName){
    if(!moduleName || typeof localStorage === 'undefined') return {};
    try{
      const stored = localStorage.getItem(`flvElements:${moduleName}`);
      if(!stored) return {};
      const parsed = JSON.parse(stored);
      if(parsed && typeof parsed === 'object'){
        return parsed;
      }
    }catch(err){
      console.warn('[FarblayerViewer] Konnte gespeicherte Zuweisungen nicht laden:', err);
    }
    return {};
  }

  function assignElementToGroup(moduleName, elementId, groupName){
    if(!moduleName || !elementId || typeof localStorage === 'undefined') return;
    let map = {};
    try{
      const stored = localStorage.getItem(`flvElements:${moduleName}`);
      if(stored){
        const parsed = JSON.parse(stored);
        if(parsed && typeof parsed === 'object'){
          map = parsed;
        }
      }
    }catch(err){
      console.warn('[FarblayerViewer] Konnte Farblayer-Zuordnung nicht lesen:', err);
    }
    if(groupName){
      map[elementId] = groupName;
    }else{
      delete map[elementId];
    }
    try{
      localStorage.setItem(`flvElements:${moduleName}`, JSON.stringify(map));
    }catch(err){
      console.warn('[FarblayerViewer] Konnte Farblayer-Zuordnung nicht speichern:', err);
    }
    return map;
  }

  function startAssignMode(moduleName, groups){
    if(typeof document === 'undefined') return;
    const existingOverlay = document.getElementById('assign-ui-overlay');
    if(existingOverlay){
      if(typeof existingOverlay.__cleanupAssignTargets === 'function'){
        try{ existingOverlay.__cleanupAssignTargets(); }catch{}
      }
      existingOverlay.remove();
    }

    const instance = getFarblayerInstance(moduleName);
    if(instance && typeof instance.closeModal === 'function'){
      try{ instance.closeModal({ persist: true }); }catch{}
    }else{
      const openModal = document.querySelector('[data-flv-modal].is-open');
      if(openModal){
        openModal.classList.remove('is-open');
      }
      document.body.classList.remove('flv-modal-open');
    }

    const overlay = document.createElement('div');
    overlay.id = 'assign-ui-overlay';

    document.body.classList.add('flv-assign-mode-active');

    const sidebar = document.createElement('div');
    sidebar.className = 'assign-sidebar';

    const title = document.createElement('h3');
    title.textContent = 'Gruppen';
    sidebar.appendChild(title);

    const sidebarList = document.createElement('div');
    sidebarList.className = 'assign-group-list';
    sidebar.appendChild(sidebarList);

    const exitBtn = document.createElement('button');
    exitBtn.id = 'exit-assign';
    exitBtn.textContent = 'Zurück';
    sidebar.appendChild(exitBtn);

    overlay.appendChild(sidebar);
    document.body.appendChild(overlay);

    const normalizedGroups = normalizeGroupPayload(groups, instance);
    const base = typeof window !== 'undefined' ? window.FarblayerBase : null;
    const getColorForGroup = groupName => {
      const info = normalizedGroups[groupName];
      if(!info || !info.layer || !base || typeof base.getLayerColor !== 'function') return null;
      try{
        return base.getLayerColor(info.layer);
      }catch(err){
        console.warn('[FarblayerViewer] getLayerColor fehlgeschlagen:', err);
        return null;
      }
    };

    Object.keys(normalizedGroups).forEach(groupName => {
      const card = document.createElement('div');
      card.className = 'assign-group';
      card.draggable = true;
      card.dataset.group = groupName;

      const swatch = document.createElement('span');
      swatch.className = 'assign-group-swatch';

      const label = document.createElement('span');
      label.className = 'assign-group-label';
      label.textContent = groupName;

      const color = getColorForGroup(groupName);
      if(color && typeof color === 'object'){
        if(color.background){
          card.style.setProperty('--assign-chip-bg', color.background);
          swatch.style.background = color.background;
        }
        if(color.text){
          card.style.setProperty('--assign-chip-text', color.text);
        }
        if(color.border){
          card.style.setProperty('--assign-chip-border', color.border);
          swatch.style.borderColor = color.border;
        }else if(color.background){
          card.style.setProperty('--assign-chip-border', color.background);
          swatch.style.borderColor = color.background;
        }
        card.dataset.hasColor = 'true';
      }
      if(normalizedGroups[groupName] && normalizedGroups[groupName].layer){
        card.title = `Layer: ${normalizedGroups[groupName].layer}`;
      }

      card.appendChild(swatch);
      card.appendChild(label);

      sidebarList.appendChild(card);
      card.ondragstart = event => {
        if(!event.dataTransfer) return;
        event.dataTransfer.setData('text/plain', groupName);
        event.dataTransfer.effectAllowed = 'copyMove';
        overlay.classList.add('assign-dragging');
      };
      card.ondragend = () => {
        overlay.classList.remove('assign-dragging');
      };
    });

    const assignables = Array.from(document.querySelectorAll('[data-assignable]'));
    const indicatorMap = new Map();

    const applyColorToElement = (element, groupName) => {
      const color = getColorForGroup(groupName);
      if(!element) return null;
      if(groupName){
        element.dataset.assignedGroup = groupName;
      }else{
        delete element.dataset.assignedGroup;
      }
      const indicator = indicatorMap.get(element);
      if(indicator){
        indicator.textContent = groupName ? groupName : 'Keine Zuweisung';
        indicator.dataset.active = groupName ? 'true' : 'false';
      }
      if(color && typeof color === 'object'){
        if(color.background){
          element.style.background = color.background;
          element.style.setProperty('--assign-target-glow', color.background);
        }
        if(color.text){
          element.style.color = color.text;
        }
        if(color.border){
          element.style.borderColor = color.border;
        }
        if(indicator){
          if(color.background){
            indicator.style.background = color.background;
          }
          if(color.text){
            indicator.style.color = color.text;
          }
          if(color.border){
            indicator.style.borderColor = color.border;
          }else if(color.background){
            indicator.style.borderColor = color.background;
          }
        }
      }else{
        element.style.background = '';
        element.style.color = '';
        element.style.borderColor = '';
        element.style.removeProperty('--assign-target-glow');
        if(indicator){
          indicator.style.background = '';
          indicator.style.color = '';
          indicator.style.borderColor = '';
        }
      }
      return color;
    };

    const cleanupAssignTargets = () => {
      assignables.forEach(el => {
        el.classList.remove('assign-target');
        el.ondragover = null;
        el.ondrop = null;
        const indicator = indicatorMap.get(el);
        if(indicator){
          indicator.remove();
          indicatorMap.delete(el);
        }
      });
    };

    const finalizeAssignMode = () => {
      cleanupAssignTargets();
      document.body.classList.remove('flv-assign-mode-active');
    };

    assignables.forEach(el => {
      el.classList.add('assign-target');
      let indicator = el.querySelector(':scope > .assign-target-indicator');
      if(!indicator){
        indicator = document.createElement('span');
        indicator.className = 'assign-target-indicator';
        indicator.textContent = 'Keine Zuweisung';
        indicator.dataset.active = 'false';
        el.appendChild(indicator);
      }
      indicatorMap.set(el, indicator);
      el.ondragover = event => {
        event.preventDefault();
      };
      el.ondrop = event => {
        event.preventDefault();
        const groupName = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
        if(!groupName) return;
        if(!el.id){
          el.id = `flv-el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        }
        assignElementToGroup(moduleName, el.id, groupName);
        if(instance && typeof instance.applyExternalElementAssignment === 'function'){
          instance.applyExternalElementAssignment(el.id, groupName);
        }
        applyColorToElement(el, groupName);
        overlay.classList.remove('assign-dragging');
      };
    });

    const savedAssignments = loadStoredAssignments(moduleName);
    Object.entries(savedAssignments).forEach(([elementId, groupName]) => {
      const element = document.getElementById(elementId);
      if(element){
        applyColorToElement(element, groupName);
      }
    });

    const handleExit = () => {
      finalizeAssignMode();
      overlay.classList.remove('assign-dragging');
      overlay.remove();
      if(instance && typeof instance.reloadAssignments === 'function'){
        instance.reloadAssignments();
      }
      if(typeof window !== 'undefined' && typeof window.openFarblayerViewer === 'function'){
        window.openFarblayerViewer(moduleName);
      }
    };

    exitBtn.onclick = handleExit;
    overlay.__cleanupAssignTargets = finalizeAssignMode;
  }

  if(typeof window !== 'undefined'){
    window.startAssignMode = startAssignMode;
    window.assignElementToGroup = assignElementToGroup;
    window.openFarblayerViewer = function(moduleName){
      const existingOverlay = document.getElementById('assign-ui-overlay');
      if(existingOverlay){
        if(typeof existingOverlay.__cleanupAssignTargets === 'function'){
          try{ existingOverlay.__cleanupAssignTargets(); }catch{}
        }
        existingOverlay.remove();
      }
      const instance = getFarblayerInstance(moduleName);
      if(!instance) return;
      if(typeof instance.reloadAssignments === 'function'){
        instance.reloadAssignments();
      }
      if(typeof instance.openModal === 'function'){
        instance.openModal();
      }
    };
  }

  function ensureStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const css = `
    .flv-root{height:100%;width:100%;box-sizing:border-box;position:relative;}
    .flv-launch{display:flex;align-items:center;justify-content:center;height:100%;}
    .flv-launch-btn{border:1px solid rgba(255,255,255,.18);border-radius:.85rem;padding:.85rem 1.4rem;font-weight:600;letter-spacing:.02em;background:rgba(15,23,42,.65);color:var(--module-button-text,inherit);box-shadow:0 12px 24px rgba(15,23,42,.45);cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,background .12s ease;}
    .flv-launch-btn:hover{transform:translateY(-1px);box-shadow:0 18px 32px rgba(15,23,42,.55);background:rgba(15,23,42,.72);}
    .flv-launch-btn:active{transform:scale(.98);}
    .flv-modal{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:2rem;opacity:0;pointer-events:none;transition:opacity .18s ease;}
    .flv-modal.is-open{opacity:1;pointer-events:auto;}
    .flv-modal-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.72);backdrop-filter:blur(8px);}
    .flv-modal-dialog{position:relative;z-index:1;width:min(1100px,calc(100vw - 3rem));height:min(90vh,880px);display:flex;flex-direction:column;animation:flv-fade-in .2s ease;}
    .flv-modal-close{position:absolute;top:.85rem;right:.85rem;border:none;background:rgba(15,23,42,.55);color:#f8fafc;width:2.2rem;height:2.2rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:600;cursor:pointer;box-shadow:0 10px 20px rgba(15,23,42,.45);transition:transform .12s ease,background .12s ease;}
    .flv-modal-close:hover{transform:scale(1.05);background:rgba(15,23,42,.7);}
    .flv-modal-close:active{transform:scale(.95);}
    body.flv-modal-open{overflow:hidden;}
    .flv-surface{height:100%;display:flex;flex-direction:column;gap:1rem;padding:1.25rem;box-sizing:border-box;color:var(--text-color,#f8fafc);background:var(--module-bg,rgba(15,23,42,.6));border-radius:1.1rem;border:1px solid var(--module-border,rgba(255,255,255,.08));box-shadow:inset 0 1px 0 rgba(255,255,255,.04);overflow:hidden;}
    .flv-header{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:1rem;padding:.85rem;border-radius:.9rem;background:var(--module-header-bg,rgba(15,23,42,.35));border:1px solid var(--module-header-border,rgba(255,255,255,.08));color:var(--module-header-text,inherit);backdrop-filter:blur(6px);}
    .flv-header-info{display:flex;flex-direction:column;gap:.35rem;min-width:200px;}
    .flv-title{font-size:1.2rem;font-weight:700;letter-spacing:.015em;}
    .flv-meta{font-size:.85rem;opacity:.85;}
    .flv-file{display:flex;flex-direction:column;gap:.35rem;min-width:240px;}
    .flv-file-label{font-size:.95rem;font-weight:600;}
    .flv-file-note{font-size:.8rem;opacity:.8;min-height:1rem;}
    .flv-file-controls{display:flex;gap:.5rem;flex-wrap:wrap;}
    .flv-file-btn,.flv-refresh,.flv-group-btn{border:1px solid var(--module-button-border,rgba(255,255,255,.16));border-radius:.65rem;padding:.45rem .95rem;font-weight:600;cursor:pointer;background:var(--module-button-bg,rgba(255,255,255,.12));color:var(--module-button-text,inherit);box-shadow:0 8px 18px rgba(15,23,42,.25);transition:transform .12s ease,box-shadow .12s ease,background .12s ease,border-color .12s ease;}
    .flv-file-btn:hover,.flv-refresh:hover,.flv-group-btn:hover{background:var(--module-button-bg-hover,rgba(255,255,255,.18));}
    .flv-file-btn:active,.flv-refresh:active,.flv-group-btn:active{transform:scale(.97);box-shadow:0 6px 16px rgba(15,23,42,.28);}
    .flv-body{flex:1;display:flex;gap:1rem;min-height:0;}
    .flv-left,.flv-right{flex:1;display:flex;flex-direction:column;gap:.75rem;min-height:0;}
    .flv-left{flex:0 0 320px;max-width:360px;}
    .flv-left-title,.flv-right-title{font-size:.9rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.82;}
    .flv-layer-list{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.65rem;padding:.25rem;}
    .flv-layer-card{position:relative;display:flex;flex-direction:column;gap:.45rem;padding:.85rem;border-radius:1rem;border:2px solid rgba(148,163,184,.35);box-shadow:0 10px 22px rgba(15,23,42,.35);cursor:grab;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease;}
    .flv-layer-card:hover{transform:translateY(-2px);box-shadow:0 16px 28px rgba(15,23,42,.45);}
    .flv-layer-card:active{cursor:grabbing;}
    .flv-layer-card[data-dragging="true"]{opacity:.75;transform:scale(.98);}
    .flv-layer-title{font-size:1rem;font-weight:700;letter-spacing:.02em;}
    .flv-layer-group{font-size:.78rem;opacity:.75;}
    .flv-layer-empty{margin-top:1rem;text-align:center;opacity:.75;}
    .flv-right{flex:1;min-width:0;}
    .flv-dropzone-list{flex:1;display:flex;flex-direction:column;gap:.75rem;overflow:auto;padding:.25rem;}
    .flv-dropzone{position:relative;border:2px dashed rgba(148,163,184,.45);border-radius:1rem;padding:1rem;display:flex;flex-direction:column;gap:.65rem;min-height:110px;transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease;}
    .flv-dropzone[data-has-layer="true"]{border-style:solid;box-shadow:0 14px 28px rgba(15,23,42,.35);}
    .flv-dropzone.is-dragover{border-color:rgba(94,234,212,.65);background:rgba(94,234,212,.08);}
    .flv-dropzone-header{display:flex;justify-content:space-between;align-items:center;gap:.5rem;font-weight:600;}
    .flv-dropzone-layer{font-size:.82rem;opacity:.75;}
    .flv-dropzone-preview{flex:1;display:flex;align-items:center;justify-content:center;padding:.85rem;border-radius:.9rem;border:2px solid rgba(255,255,255,.16);background:rgba(15,23,42,.45);color:inherit;font-weight:600;transition:transform .12s ease;}
    .flv-dropzone-preview[data-empty="true"]{border-style:dashed;opacity:.7;background:transparent;font-style:italic;}
    .flv-dropzone-preview:hover{transform:translateY(-1px);}
    .flv-group-actions{display:flex;gap:.5rem;flex-wrap:wrap;}
    .flv-footer{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.85rem;border-radius:.9rem;background:rgba(15,23,42,.35);border:1px solid rgba(255,255,255,.08);font-size:.85rem;flex-wrap:wrap;}
    .flv-footer-left{display:flex;flex-direction:column;gap:.35rem;min-width:240px;}
    .flv-footer-actions{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;}
    .flv-footer-hint{opacity:.75;font-size:.8rem;display:none;}
    .flv-footer-hint[data-active="true"]{display:block;}
    .flv-status{min-height:1.1rem;}
    .flv-action-btn{border:1px solid var(--module-button-border,rgba(255,255,255,.16));border-radius:.65rem;padding:.45rem .95rem;font-weight:600;cursor:pointer;background:var(--module-button-bg,rgba(255,255,255,.12));color:var(--module-button-text,inherit);box-shadow:0 8px 18px rgba(15,23,42,.25);transition:transform .12s ease,box-shadow .12s ease,background .12s ease,border-color .12s ease;}
    .flv-action-btn:hover{background:var(--module-button-bg-hover,rgba(255,255,255,.18));}
    .flv-action-btn:active{transform:scale(.97);box-shadow:0 6px 16px rgba(15,23,42,.28);}
    .flv-action-btn[data-active="true"]{border-color:rgba(94,234,212,.65);background:rgba(94,234,212,.12);}
    .flv-test-ui{padding:1rem;border-radius:.9rem;border:1px solid rgba(255,255,255,.1);background:rgba(15,23,42,.45);box-shadow:0 10px 24px rgba(15,23,42,.32);display:flex;flex-direction:column;gap:.75rem;min-height:0;}
    .flv-test-ui h2,.flv-test-ui h3{margin:0;}
    .flv-test-ui-buttons,.flv-test-ui-subbuttons{display:flex;gap:.5rem;flex-wrap:wrap;}
    .flv-test-ui-surface{display:flex;flex-direction:column;gap:.75rem;}
    .flv-dropzone.flash{animation:flash 1s ease;}
    @keyframes flash{0%{box-shadow:0 0 0 3px rgba(255,255,255,.5);}100%{box-shadow:none;}}
    @keyframes flv-fade-in{from{transform:translateY(10px);opacity:0;}to{transform:translateY(0);opacity:1;}}
    .flv-assign-highlight{outline:2px dashed rgba(94,234,212,.8);cursor:crosshair;position:relative;}
    .flv-assign-highlight::after{content:'🧩';position:absolute;top:-8px;right:-8px;background:rgba(15,23,42,.7);color:#fff;border-radius:50%;width:18px;height:18px;text-align:center;font-size:12px;line-height:18px;}
    .flv-pop{position:absolute;background:rgba(15,23,42,.95);border:1px solid rgba(255,255,255,.15);border-radius:.65rem;padding:.75rem;z-index:9999;color:#fff;display:flex;flex-direction:column;gap:.5rem;box-shadow:0 10px 20px rgba(0,0,0,.4);min-width:220px;}
    .flv-pop label{display:flex;flex-direction:column;gap:.35rem;font-size:.85rem;}
    .flv-pop select{padding:.35rem .5rem;border-radius:.45rem;border:1px solid rgba(255,255,255,.15);background:rgba(15,23,42,.8);color:#f8fafc;}
    .flv-pop button{align-self:flex-end;}
    .flv-test-ui-surface button{background:#1e293b;border:1px solid rgba(255,255,255,.1);color:#f8fafc;padding:.4rem .8rem;border-radius:.4rem;font-size:.9rem;cursor:pointer;transition:background .2s;}
    .flv-test-ui-surface button:hover{background:#334155;}
    .flv-test-ui-surface h2,.flv-test-ui-surface h3{margin:0;color:#e2e8f0;}
    .flv-main-preview{margin-bottom:1.5rem;padding:1.25rem;border-radius:1.1rem;border:1px solid rgba(255,255,255,.08);background:rgba(15,23,42,.5);box-shadow:0 14px 30px rgba(15,23,42,.35);display:flex;flex-direction:column;gap:1rem;color:#f8fafc;}
    .flv-main-preview-note{margin:0;font-size:.85rem;opacity:.8;}
    #assign-ui-overlay{position:fixed;inset:0;display:flex;align-items:stretch;z-index:9999;background:linear-gradient(135deg,rgba(15,23,42,.12),rgba(14,116,144,.04));color:#0f172a;pointer-events:none;transition:background .2s ease;}
    #assign-ui-overlay.assign-dragging{background:linear-gradient(135deg,rgba(15,23,42,.04),rgba(14,116,144,.02));}
    #assign-ui-overlay.assign-dragging .assign-sidebar{transform:translateX(-110%);opacity:0;pointer-events:none;}
    .assign-sidebar{width:260px;background:rgba(15,23,42,.88);padding:1.1rem 1rem;border-right:1px solid rgba(148,163,184,.35);display:flex;flex-direction:column;gap:.6rem;pointer-events:auto;color:#e2e8f0;box-shadow:0 16px 40px rgba(15,23,42,.45);transition:transform .18s ease,opacity .18s ease;}
    .assign-sidebar h3{margin:0;font-size:1rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.9;}
    .assign-group-list{flex:1;overflow:auto;display:flex;flex-direction:column;gap:.45rem;padding-right:.15rem;}
    .assign-group{--assign-chip-bg:#1e293b;--assign-chip-text:#f8fafc;--assign-chip-border:rgba(148,163,184,.45);display:flex;align-items:center;gap:.55rem;padding:.55rem .7rem;border:1px solid var(--assign-chip-border);border-radius:.65rem;background:var(--assign-chip-bg);color:var(--assign-chip-text);cursor:grab;box-shadow:0 12px 24px rgba(15,23,42,.35);transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease,background .15s ease;}
    .assign-group[data-has-color="true"]{border-color:var(--assign-chip-border);}
    .assign-group:hover{transform:translateY(-1px);box-shadow:0 16px 32px rgba(15,23,42,.45);}
    .assign-group:active{cursor:grabbing;transform:scale(.98);}
    .assign-group-swatch{width:1.4rem;height:1.4rem;border-radius:.45rem;border:2px solid rgba(255,255,255,.2);box-shadow:0 0 0 1px rgba(15,23,42,.4);flex-shrink:0;background:rgba(148,163,184,.35);}
    .assign-group-label{flex:1;font-weight:600;letter-spacing:.015em;}
    #exit-assign{margin-top:auto;border-radius:.65rem;border:1px solid rgba(94,234,212,.55);background:rgba(45,212,191,.18);color:#ecfeff;padding:.55rem .75rem;font-weight:600;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,background .15s ease;box-shadow:0 12px 28px rgba(13,148,136,.25);}
    #exit-assign:hover{background:rgba(94,234,212,.25);transform:translateY(-1px);}
    #exit-assign:active{transform:scale(.98);}
    .assign-target{outline:2px dashed rgba(56,189,248,.85);outline-offset:2px;border-radius:.75rem;transition:background .2s,box-shadow .2s,transform .2s;box-shadow:0 0 0 4px rgba(56,189,248,.08);}
    .assign-target{box-shadow:0 0 0 4px color-mix(in srgb,var(--assign-target-glow,rgba(56,189,248,.6)) 32%,transparent);}
    .assign-target:hover{background:rgba(56,189,248,.12);transform:translateY(-1px);}
    .assign-target-indicator{position:absolute;top:0;left:12px;transform:translateY(-60%);padding:.35rem .65rem;border-radius:.65rem;border:1px solid rgba(148,163,184,.55);background:rgba(15,23,42,.82);color:#e2e8f0;font-size:.75rem;font-weight:600;letter-spacing:.02em;box-shadow:0 10px 20px rgba(15,23,42,.35);pointer-events:none;opacity:.45;transition:opacity .18s ease,transform .18s ease,background .18s ease,color .18s ease,border-color .18s ease;text-transform:none;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;}
    .assign-target-indicator[data-active="true"]{opacity:1;transform:translateY(-90%);}
    .assign-target-indicator[data-active="false"]{opacity:.4;}
    body.flv-assign-mode-active [data-assignable]{position:relative;}
    body.flv-assign-mode-active [data-assignable]::after{content:'';position:absolute;inset:-6px;border-radius:inherit;border:1px solid rgba(148,163,184,.35);box-shadow:0 10px 24px rgba(15,23,42,.3);pointer-events:none;opacity:.4;transition:opacity .2s;}
    body.flv-assign-mode-active [data-assignable]:hover::after{opacity:.8;}
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

  function renderItems(container, items, options = {}){
    if(!container) return;
    const onCard = typeof options.onCard === 'function' ? options.onCard : null;
    container.innerHTML = '';
    if(!Array.isArray(items) || !items.length){
      const empty = document.createElement('div');
      empty.className = 'flv-layer-empty';
      empty.textContent = 'Keine Farblayer gefunden.';
      container.appendChild(empty);
      return;
    }
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'flv-layer-card';
      card.draggable = true;
      card.dataset.layer = item.name || '';
      if(item.background){
        card.style.background = item.background;
      }
      if(item.text){
        card.style.color = item.text;
      }
      if(item.border){
        card.style.borderColor = item.border;
      }
      const title = document.createElement('div');
      title.className = 'flv-layer-title';
      title.textContent = item.name;
      card.appendChild(title);
      if(item.group){
        const group = document.createElement('div');
        group.className = 'flv-layer-group';
        group.textContent = item.group;
        card.appendChild(group);
      }
      const tooltipParts = [
        `Hintergrund: ${item.background || '—'}`,
        `Text: ${item.text || '—'}`,
        `Rahmen: ${item.border || '—'}`
      ];
      card.title = tooltipParts.join('\n');
      if(onCard){
        onCard(card, item);
      }
      container.appendChild(card);
    });
  }

  function renderTestUI(container, options = {}){
    if(!container) return;

    const defaultMainButtons = [
      { id: 'btn-save', label: 'Speichern' },
      { id: 'btn-load', label: 'Laden' },
      { id: 'btn-reset', label: 'Zurücksetzen' }
    ];
    const defaultSubButtons = [
      { id: 'btn-option-a', label: 'Option A' },
      { id: 'btn-option-b', label: 'Option B' },
      { id: 'btn-option-c', label: 'Option C' }
    ];

    const {
      wrapperId = 'test-module-ui',
      idPrefix = '',
      titleText = '⚙️ Modul-Hauptoberfläche',
      subtitleText = 'Unterbereich – Optionen',
      statusText = 'Status: bereit',
      mainButtons = defaultMainButtons,
      subButtons = defaultSubButtons
    } = options;

    const resolvedMainButtons = Array.isArray(mainButtons) && mainButtons.length ? mainButtons : defaultMainButtons;
    const resolvedSubButtons = Array.isArray(subButtons) && subButtons.length ? subButtons : defaultSubButtons;
    const makeId = base => {
      if(!base) return '';
      return idPrefix ? `${idPrefix}-${base}` : base;
    };

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    if(wrapperId){
      wrapper.id = wrapperId;
    }
    wrapper.className = 'flv-test-ui-surface';

    const title = document.createElement('h2');
    const titleId = makeId('module-title');
    if(titleId){
      title.id = titleId;
    }
    title.dataset.assignable = 'true';
    title.textContent = titleText;
    wrapper.appendChild(title);

    const mainButtonsEl = document.createElement('div');
    mainButtonsEl.className = 'flv-test-ui-buttons';
    resolvedMainButtons.forEach(entry => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const btnId = makeId(entry && entry.id ? entry.id : '');
      if(btnId){
        btn.id = btnId;
      }
      btn.dataset.assignable = 'true';
      btn.textContent = entry && entry.label ? entry.label : (entry && entry.id ? entry.id : 'Aktion');
      mainButtonsEl.appendChild(btn);
    });
    wrapper.appendChild(mainButtonsEl);

    const subtitle = document.createElement('h3');
    const subtitleId = makeId('module-subsection');
    if(subtitleId){
      subtitle.id = subtitleId;
    }
    subtitle.dataset.assignable = 'true';
    subtitle.textContent = subtitleText;
    wrapper.appendChild(subtitle);

    const subButtonsEl = document.createElement('div');
    subButtonsEl.className = 'flv-test-ui-subbuttons';
    resolvedSubButtons.forEach(entry => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const btnId = makeId(entry && entry.id ? entry.id : '');
      if(btnId){
        btn.id = btnId;
      }
      btn.dataset.assignable = 'true';
      btn.textContent = entry && entry.label ? entry.label : (entry && entry.id ? entry.id : 'Aktion');
      subButtonsEl.appendChild(btn);
    });
    wrapper.appendChild(subButtonsEl);

    const status = document.createElement('p');
    const statusId = makeId('status-label');
    if(statusId){
      status.id = statusId;
    }
    status.dataset.assignable = 'true';
    status.textContent = statusText;
    wrapper.appendChild(status);

    container.appendChild(wrapper);
  }

  window.renderFarblayerViewer = function renderFarblayerViewer(root){
  if(!root) return;
  ensureStyles();
  root.classList.add('flv-root');
  const BASE_GROUPS = ['Hauptoberfläche', 'Header', 'Aktionselemente', 'Unterbereich'];
  const GROUP_STORAGE_PREFIX = 'flvGroups:';
  const ELEMENT_STORAGE_PREFIX = 'flvElements:';

  root.innerHTML = `
    <section class="flv-main-preview">
      <p class="flv-main-preview-note">Nutzen Sie die Testoberfläche, um Farblayer-Gruppen auf reale UI-Elemente zu ziehen und live zu erleben.</p>
      <div class="flv-test-ui" data-flv-main-ui></div>
    </section>
    <div class="flv-launch">
      <button class="flv-launch-btn" type="button" data-flv-open-modal>Farblayer-Konfigurator öffnen</button>
    </div>
    <div class="flv-modal" data-flv-modal>
      <div class="flv-modal-backdrop" data-flv-close-modal></div>
      <div class="flv-modal-dialog" role="dialog" aria-modal="true" aria-label="Farblayer-Konfigurator" data-flv-dialog tabindex="-1">
        <button class="flv-modal-close" type="button" aria-label="Konfigurator schließen" data-flv-close-modal>&times;</button>
        <div class="flv-surface">
          <div class="flv-header">
            <div class="flv-header-info">
              <div class="flv-title">Farblayer-Konfiguration</div>
              <div class="flv-meta" data-flv-meta>${CONFIG_PATH}</div>
            </div>
            <div class="flv-file">
              <div class="flv-file-label" data-flv-file-label>Keine Datei verbunden</div>
              <div class="flv-file-note" data-flv-file-note>Bitte Farblayer-Datei wählen.</div>
              <div class="flv-file-controls">
                <button class="flv-file-btn" type="button" data-flv-file-pick>Datei wählen</button>
                <button class="flv-refresh" type="button" data-flv-refresh>Aktualisieren</button>
              </div>
            </div>
          </div>
          <div class="flv-body">
            <div class="flv-left">
              <div class="flv-left-title">Layer-Bibliothek</div>
              <div class="flv-layer-list" data-flv-list></div>
            </div>
            <div class="flv-right">
              <div class="flv-right-title">Gruppen-Dropzonen</div>
              <div class="flv-dropzone-list" data-flv-dropzones></div>
              <div class="flv-group-actions">
                <button class="flv-group-btn" type="button" data-flv-add-group>+ Gruppe hinzufügen</button>
                <button class="flv-group-btn" type="button" data-flv-remove-group>– Gruppe entfernen</button>
              </div>
              <div class="flv-test-ui" data-flv-test-ui></div>
            </div>
          </div>
          <div class="flv-footer">
            <div class="flv-footer-left">
              <div class="flv-status" data-flv-status>Farblayer werden geladen…</div>
              <div class="flv-footer-hint" data-flv-assign-hint>🧩 Zuweisungsmodus aktiv – klicken Sie auf ein UI-Element, um es einer Gruppe zuzuweisen.</div>
            </div>
            <div class="flv-footer-actions">
              <button class="flv-action-btn" type="button" data-flv-save>Speichern</button>
              <button class="flv-action-btn" type="button" data-flv-cancel>Abbrechen</button>
              <button class="flv-action-btn" type="button" data-flv-assign-toggle>🧩 Zuweisungsmodus</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const cleanupCallbacks = [];
  const modalEl = root.querySelector('[data-flv-modal]');
  const modalDialogEl = root.querySelector('[data-flv-dialog]');
  const openModalBtn = root.querySelector('[data-flv-open-modal]');
  const closeModalTargets = Array.from(root.querySelectorAll('[data-flv-close-modal]'));
  const listEl = root.querySelector('[data-flv-list]');
  const dropzoneContainer = root.querySelector('[data-flv-dropzones]');
  const statusEl = root.querySelector('[data-flv-status]');
  const refreshBtn = root.querySelector('[data-flv-refresh]');
  const metaEl = root.querySelector('[data-flv-meta]');
  const fileLabelEl = root.querySelector('[data-flv-file-label]');
  const fileNoteEl = root.querySelector('[data-flv-file-note]');
  const filePickBtn = root.querySelector('[data-flv-file-pick]');
  const addGroupBtn = root.querySelector('[data-flv-add-group]');
  const removeGroupBtn = root.querySelector('[data-flv-remove-group]');
  const mainTestUIContainer = root.querySelector('[data-flv-main-ui]');
  const testUIContainer = root.querySelector('[data-flv-test-ui]');
  const saveBtn = root.querySelector('[data-flv-save]');
  const cancelBtn = root.querySelector('[data-flv-cancel]');
  const assignModeBtn = root.querySelector('[data-flv-assign-toggle]');
  const assignHintEl = root.querySelector('[data-flv-assign-hint]');
  const footerActions = root.querySelector('.flv-footer-actions');

  if(mainTestUIContainer){
    renderTestUI(mainTestUIContainer, {
      wrapperId: 'test-module-ui-main',
      idPrefix: 'main',
      titleText: '🧪 Test-Hauptoberfläche',
      subtitleText: 'Aktionen & Schnellzugriffe',
      statusText: 'Status: bereit für Live-Zuweisungen',
      mainButtons: [
        { id: 'btn-primary', label: 'Primäraktion' },
        { id: 'btn-secondary', label: 'Sekundäraktion' },
        { id: 'btn-ghost', label: 'Geistermodus' },
        { id: 'btn-danger', label: 'Warnung' }
      ],
      subButtons: [
        { id: 'btn-filter', label: 'Filter anwenden' },
        { id: 'btn-export', label: 'Exportieren' },
        { id: 'btn-help', label: 'Hilfe öffnen' }
      ]
    });
  }

  if(testUIContainer){
    renderTestUI(testUIContainer);
  }

  if(assignModeBtn){
    assignModeBtn.setAttribute('aria-pressed', 'false');
  }

  if(typeof root.__flvCleanup === 'function'){
    root.__flvCleanup();
  }

  const state = {
    controller: null,
    disposed: false,
    items: [],
    lastSource: null,
    fileHandle: null,
    pollInterval: null,
    pollInProgress: false,
    lastModified: null,
    autoState: 'idle',
    autoMessage: '',
    dropzones: new Map(),
    groups: BASE_GROUPS.slice(),
    groupAssignments: {},
    layerLookup: new Map(),
    moduleName: 'Farblayer',
    statusResetTimeout: null,
    modalOpen: false,
    lastFocus: null,
    assignMode: false,
    assignPopoverEl: null,
    assignPopoverTarget: null,
    elementAssignments: {},
    assignableClickHandler: null
  };

  const instanceApi = {
    openModal: () => openModal(),
    closeModal: options => closeModal(options || {}),
    reloadAssignments: () => {
      state.elementAssignments = loadElementAssignments();
      pruneElementAssignments({ persist: false });
      applyAllElementAssignments();
    },
    getGroups: () => state.groups.slice(),
    getGroupAssignments: () => ({ ...state.groupAssignments }),
    applyExternalElementAssignment: (elementId, groupName) => {
      assignElementToGroupInternal(elementId, groupName);
    }
  };

  let registeredModuleName = null;
  function refreshInstanceRegistration(){
    const key = state.moduleName || 'Farblayer';
    if(registeredModuleName && registeredModuleName !== key){
      unregisterFarblayerInstance(registeredModuleName, instanceApi);
    }
    registerFarblayerInstance(key, instanceApi);
    registeredModuleName = key;
  }

  refreshInstanceRegistration();

  if(footerActions){
    const assignBtn = document.createElement('button');
    assignBtn.type = 'button';
    assignBtn.className = 'flv-action-btn';
    assignBtn.textContent = '🧩 Zuweisungen bearbeiten';
    const handleAssign = () => {
      refreshInstanceRegistration();
      startAssignMode(state.moduleName, instanceApi.getGroups());
    };
    assignBtn.addEventListener('click', handleAssign);
    footerActions.appendChild(assignBtn);
    registerCleanup(() => assignBtn.removeEventListener('click', handleAssign));
  }

  function registerCleanup(fn){
    if(typeof fn === 'function'){
      cleanupCallbacks.push(fn);
    }
  }

  function getGroupStorageKey(){
    return `${GROUP_STORAGE_PREFIX}${state.moduleName}`;
  }

  function getElementStorageKey(){
    return `${ELEMENT_STORAGE_PREFIX}${state.moduleName}`;
  }

  function persistGroupState(){
    const payload = {
      groups: state.groups.slice(),
      assignments: {}
    };
    state.groups.forEach(groupName => {
      const layerName = state.groupAssignments[groupName];
      if(typeof groupName === 'string' && typeof layerName === 'string'){
        const trimmed = layerName.trim();
        if(trimmed && state.layerLookup.has(trimmed)){
          payload.assignments[groupName] = trimmed;
        }
      }
    });
    try{
      localStorage.setItem(getGroupStorageKey(), JSON.stringify(payload));
    }catch{}
  }

  function loadStoredGroupState(){
    try{
      const stored = localStorage.getItem(getGroupStorageKey());
      if(!stored) return { groups: BASE_GROUPS.slice(), assignments: {} };
      const parsed = JSON.parse(stored);
      if(parsed && typeof parsed === 'object'){
        const groupsRaw = Array.isArray(parsed.groups) ? parsed.groups : [];
        const groupsClean = groupsRaw
          .map(value => typeof value === 'string' ? value.trim() : '')
          .filter(Boolean);
        const uniqueGroups = Array.from(new Set(groupsClean));
        const assignmentsRaw = parsed.assignments && typeof parsed.assignments === 'object' ? parsed.assignments : {};
        const assignments = {};
        uniqueGroups.forEach(groupName => {
          const layerName = assignmentsRaw[groupName];
          if(typeof layerName === 'string' && layerName.trim()){
            assignments[groupName] = layerName.trim();
          }
        });
        return {
          groups: uniqueGroups.length ? uniqueGroups : BASE_GROUPS.slice(),
          assignments
        };
      }
    }catch{}
    return { groups: BASE_GROUPS.slice(), assignments: {} };
  }

  function persistElementAssignments(){
    try{
      localStorage.setItem(getElementStorageKey(), JSON.stringify(state.elementAssignments));
    }catch{}
  }

  function loadElementAssignments(){
    try{
      const stored = localStorage.getItem(getElementStorageKey());
      if(!stored) return {};
      const parsed = JSON.parse(stored);
      if(parsed && typeof parsed === 'object'){
        const mapping = {};
        Object.entries(parsed).forEach(([elementId, groupName]) => {
          if(typeof elementId === 'string' && elementId.trim() && typeof groupName === 'string' && groupName.trim()){
            mapping[elementId.trim()] = groupName.trim();
          }
        });
        return mapping;
      }
    }catch{}
    return {};
  }

  function pruneElementAssignments({ persist = true } = {}){
    const validGroups = new Set(state.groups);
    let changed = false;
    Object.entries(state.elementAssignments).forEach(([elementId, groupName]) => {
      if(!validGroups.has(groupName)){
        if(typeof document !== 'undefined'){
          const element = document.getElementById(elementId);
          if(element){
            element.style.background = '';
            element.style.color = '';
            element.style.borderColor = '';
          }
        }
        delete state.elementAssignments[elementId];
        changed = true;
      }
    });
    if(changed && persist){
      persistElementAssignments();
    }
  }

  function ensureElementId(element){
    if(!element) return '';
    if(element.id) return element.id;
    const generated = `flv-el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    element.id = generated;
    return generated;
  }

  function applyElementColors(element, groupName){
    if(!element) return;
    const layerName = state.groupAssignments[groupName];
    const layer = layerName ? getLayerByName(layerName) : null;
    const base = typeof window !== 'undefined' ? window.FarblayerBase : null;
    let applied = false;
    if(layer){
      element.style.background = layer.background || '';
      element.style.color = layer.text || '';
      element.style.borderColor = layer.border || '';
      applied = true;
    }else if(layerName && base && typeof base.getLayerColor === 'function'){
      try{
        const color = base.getLayerColor(layerName);
        if(color && typeof color === 'object'){
          element.style.background = color.background || '';
          element.style.color = color.text || '';
          element.style.borderColor = color.border || '';
          applied = true;
        }
      }catch(err){
        console.warn('[FarblayerViewer] Konnte Layerfarbe nicht abrufen:', err);
      }
    }
    if(!applied){
      element.style.background = '';
      element.style.color = '';
      element.style.borderColor = '';
    }
  }

  function applyElementAssignmentsForGroup(groupName){
    Object.entries(state.elementAssignments).forEach(([elementId, assignedGroup]) => {
      if(assignedGroup !== groupName) return;
      const element = typeof document !== 'undefined' ? document.getElementById(elementId) : null;
      if(element){
        applyElementColors(element, groupName);
      }
    });
  }

  function applyAllElementAssignments(){
    Object.entries(state.elementAssignments).forEach(([elementId, groupName]) => {
      const element = typeof document !== 'undefined' ? document.getElementById(elementId) : null;
      if(element){
        applyElementColors(element, groupName);
      }
    });
  }

  function closeAssignPopover(){
    if(state.assignPopoverEl && state.assignPopoverEl.parentNode){
      state.assignPopoverEl.parentNode.removeChild(state.assignPopoverEl);
    }
    state.assignPopoverEl = null;
    state.assignPopoverTarget = null;
  }

  function highlightAssignableElements(active){
    if(typeof document === 'undefined') return;
    const elements = document.querySelectorAll('[data-assignable="true"]');
    elements.forEach(el => {
      if(active){
        el.classList.add('flv-assign-highlight');
      }else{
        el.classList.remove('flv-assign-highlight');
      }
    });
  }

  function openAssignPopover(target, x, y){
    if(!target || typeof document === 'undefined') return;
    closeAssignPopover();
    const pop = document.createElement('div');
    pop.className = 'flv-pop';

    const label = document.createElement('label');
    label.textContent = 'Gruppe auswählen';
    const select = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Keine Zuweisung';
    select.appendChild(placeholder);
    state.groups.forEach(groupName => {
      const option = document.createElement('option');
      option.value = groupName;
      option.textContent = groupName;
      select.appendChild(option);
    });
    const currentId = target.id;
    if(currentId && state.elementAssignments[currentId]){
      select.value = state.elementAssignments[currentId];
    }
    label.appendChild(select);
    pop.appendChild(label);

    const assignBtn = document.createElement('button');
    assignBtn.type = 'button';
    assignBtn.className = 'flv-action-btn';
    assignBtn.textContent = 'Zuweisen';
    assignBtn.addEventListener('click', () => {
      const selectedGroup = select.value || '';
      const elementId = ensureElementId(target);
      assignElementToGroupInternal(elementId, selectedGroup);
      closeAssignPopover();
    });
    pop.appendChild(assignBtn);

    document.body.appendChild(pop);
    const offsetX = 12;
    const offsetY = 12;
    pop.style.left = `${x + offsetX}px`;
    pop.style.top = `${y + offsetY}px`;

    state.assignPopoverEl = pop;
    state.assignPopoverTarget = target;
  }

  function assignElementToGroupInternal(elementId, groupName){
    if(!elementId) return;
    if(!groupName){
      if(state.elementAssignments[elementId]){
        delete state.elementAssignments[elementId];
        persistElementAssignments();
      }
      const element = typeof document !== 'undefined' ? document.getElementById(elementId) : null;
      if(element){
        element.style.background = '';
        element.style.color = '';
        element.style.borderColor = '';
      }
      return;
    }
    if(!state.groups.includes(groupName)){
      flashStatus(`Gruppe "${groupName}" nicht vorhanden.`, { temporary: true });
      return;
    }
    state.elementAssignments[elementId] = groupName;
    persistElementAssignments();
    const element = typeof document !== 'undefined' ? document.getElementById(elementId) : null;
    if(element){
      applyElementColors(element, groupName);
    }
  }

  function toggleAssignMode(active){
    const next = Boolean(active);
    if(state.assignMode === next) return;
    state.assignMode = next;
    if(assignModeBtn){
      assignModeBtn.dataset.active = next ? 'true' : 'false';
      assignModeBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
    }
    if(assignHintEl){
      if(next){
        assignHintEl.dataset.active = 'true';
      }else{
        delete assignHintEl.dataset.active;
      }
    }
    highlightAssignableElements(next);
    if(!next){
      closeAssignPopover();
      if(state.assignableClickHandler){
        document.removeEventListener('click', state.assignableClickHandler, true);
        state.assignableClickHandler = null;
      }
      return;
    }

    state.assignableClickHandler = event => {
      if(!state.assignMode) return;
      const target = event.target instanceof Element ? event.target.closest('[data-assignable="true"]') : null;
      if(target){
        event.preventDefault();
        event.stopPropagation();
        const rect = target.getBoundingClientRect();
        const x = rect.right;
        const y = rect.top;
        openAssignPopover(target, x, y);
      }else if(state.assignPopoverEl && !state.assignPopoverEl.contains(event.target)){ 
        closeAssignPopover();
      }
    };
    document.addEventListener('click', state.assignableClickHandler, true);
  }

  function openModal(){
    if(!modalEl || state.modalOpen) return;
    state.lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalEl.classList.add('is-open');
    document.body.classList.add('flv-modal-open');
    state.modalOpen = true;
    if(modalDialogEl && typeof modalDialogEl.focus === 'function'){
      setTimeout(() => {
        try{ modalDialogEl.focus({ preventScroll: true }); }catch{}
      }, 0);
    }
  }

  function closeModal({ persist = true } = {}){
    if(!modalEl || !state.modalOpen) return;
    modalEl.classList.remove('is-open');
    document.body.classList.remove('flv-modal-open');
    state.modalOpen = false;
    toggleAssignMode(false);
    if(persist){
      persistGroupState();
      persistElementAssignments();
    }
    if(state.lastFocus && typeof state.lastFocus.focus === 'function'){
      try{ state.lastFocus.focus(); }catch{}
    }
    state.lastFocus = null;
  }

  root.__flvCleanup = () => {
    state.disposed = true;
    if(state.controller){
      try{ state.controller.abort(); }catch{}
      state.controller = null;
    }
    if(state.pollInterval){
      clearInterval(state.pollInterval);
      state.pollInterval = null;
    }
    if(state.statusResetTimeout){
      clearTimeout(state.statusResetTimeout);
      state.statusResetTimeout = null;
    }
    closeModal({ persist: false });
    while(cleanupCallbacks.length){
      const cb = cleanupCallbacks.pop();
      try{ cb(); }catch{}
    }
    if(registeredModuleName){
      unregisterFarblayerInstance(registeredModuleName, instanceApi);
      registeredModuleName = null;
    }
    document.body.classList.remove('flv-modal-open');
  };

  function getLayerByName(layerName){
    if(!layerName) return null;
    return state.layerLookup.get(layerName) || null;
  }

  function triggerDropzoneFlash(groupName){
    const ref = state.dropzones.get(groupName);
    if(!ref) return;
    ref.zone.classList.remove('flash');
    void ref.zone.offsetWidth;
    ref.zone.classList.add('flash');
    setTimeout(() => {
      if(ref.zone){
        ref.zone.classList.remove('flash');
      }
    }, 1000);
  }

  function applyLayerColors(groupName, layer){
    if(typeof window !== 'undefined'){
      const base = window.FarblayerBase;
      const applyColors = base && typeof base.applyColors === 'function' ? base.applyColors : null;
      if(applyColors && layer){
        const ref = state.dropzones.get(groupName);
        const targets = ref ? [ref.preview] : [];
        try{
          applyColors(targets, layer);
        }catch(err){
          console.warn('[FarblayerViewer] applyColors fehlgeschlagen:', err);
        }
      }
    }
    applyElementAssignmentsForGroup(groupName);
  }

  function updateDropzone(groupName, layer){
    const ref = state.dropzones.get(groupName);
    if(!ref) return;
    if(layer){
      ref.zone.dataset.hasLayer = 'true';
      ref.layerLabel.textContent = layer.name;
      ref.preview.dataset.empty = 'false';
      ref.preview.textContent = layer.name;
      ref.preview.style.background = layer.background || '';
      ref.preview.style.color = layer.text || '';
      ref.preview.style.borderColor = layer.border || 'rgba(255,255,255,.16)';
    }else{
      delete ref.zone.dataset.hasLayer;
      ref.layerLabel.textContent = 'Kein Layer';
      ref.preview.dataset.empty = 'true';
      ref.preview.textContent = 'Layer hierhin ziehen';
      ref.preview.style.background = '';
      ref.preview.style.color = '';
      ref.preview.style.borderColor = '';
    }
  }

  function createDropzone(groupName){
    if(!dropzoneContainer) return null;
    const zone = document.createElement('div');
    zone.className = 'flv-dropzone';
    zone.dataset.group = groupName;

    const header = document.createElement('div');
    header.className = 'flv-dropzone-header';
    const title = document.createElement('span');
    title.textContent = groupName;
    header.appendChild(title);
    const layerLabel = document.createElement('span');
    layerLabel.className = 'flv-dropzone-layer';
    layerLabel.textContent = 'Kein Layer';
    header.appendChild(layerLabel);
    zone.appendChild(header);

    const preview = document.createElement('div');
    preview.className = 'flv-dropzone-preview';
    preview.dataset.empty = 'true';
    preview.textContent = 'Layer hierhin ziehen';
    zone.appendChild(preview);

    const removeDragClass = () => zone.classList.remove('is-dragover');

    zone.ondragover = event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    };
    zone.addEventListener('dragenter', event => {
      event.preventDefault();
      zone.classList.add('is-dragover');
    });
    zone.addEventListener('dragleave', event => {
      if(!zone.contains(event.relatedTarget)){
        removeDragClass();
      }
    });
    zone.ondrop = event => {
      event.preventDefault();
      removeDragClass();
      const layerName = event.dataTransfer.getData('text/plain');
      if(!layerName) return;
      if(event.altKey){
        assignLayerToAll(layerName, { flashGroup: groupName });
      }else{
        assignLayerToGroup(groupName, layerName);
      }
    };

    preview.addEventListener('dblclick', () => {
      delete state.groupAssignments[groupName];
      updateDropzone(groupName, null);
      applyLayerColors(groupName, null);
      persistGroupState();
    });

    return { zone, layerLabel, preview };
  }

  function renderGroupZones(){
    if(!dropzoneContainer) return;
    dropzoneContainer.innerHTML = '';
    state.dropzones.clear();
    state.groups.forEach(groupName => {
      const ref = createDropzone(groupName);
      if(!ref) return;
      dropzoneContainer.appendChild(ref.zone);
      state.dropzones.set(groupName, ref);
      const layerName = state.groupAssignments[groupName];
      const layer = layerName ? getLayerByName(layerName) : null;
      updateDropzone(groupName, layer);
      applyLayerColors(groupName, layer);
    });
  }

  function flashStatus(message, { temporary = false } = {}){
    if(!statusEl) return;
    statusEl.textContent = message || '';
    if(state.statusResetTimeout){
      clearTimeout(state.statusResetTimeout);
      state.statusResetTimeout = null;
    }
    if(temporary){
      state.statusResetTimeout = setTimeout(() => {
        state.statusResetTimeout = null;
        updateStatusMessage(state.lastSource, state.items.length);
      }, 2500);
    }
  }

  function assignLayerToGroup(groupName, layerName, options = {}){
    const layer = getLayerByName(layerName);
    if(!layer){
      flashStatus(`Layer "${layerName}" nicht gefunden.`, { temporary: true });
      return;
    }
    if(!state.groups.includes(groupName)){
      flashStatus(`Gruppe "${groupName}" nicht vorhanden.`, { temporary: true });
      return;
    }
    state.groupAssignments[groupName] = layer.name;
    updateDropzone(groupName, layer);
    applyLayerColors(groupName, layer);
    if(options.flashZone !== false){
      triggerDropzoneFlash(groupName);
    }
    if(options.persist !== false){
      persistGroupState();
    }
    if(options.announce !== false){
      flashStatus(`"${layer.name}" → ${groupName}`, { temporary: true });
    }
  }

  function assignLayerToAll(layerName, { flashGroup = null } = {}){
    const layer = getLayerByName(layerName);
    if(!layer){
      flashStatus(`Layer "${layerName}" nicht gefunden.`, { temporary: true });
      return;
    }
    state.groups.forEach(groupName => {
      assignLayerToGroup(groupName, layer.name, {
        persist: false,
        flashZone: flashGroup ? groupName === flashGroup : true,
        announce: false
      });
    });
    persistGroupState();
    flashStatus(`"${layer.name}" auf alle Gruppen angewendet.`, { temporary: true });
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

  function deriveModuleName(result, flattened){
    if(result && typeof result.moduleName === 'string' && result.moduleName.trim()){
      return result.moduleName.trim();
    }
    if(result && typeof result.path === 'string' && result.path.trim()){
      const base = result.path.trim().split(/[\\/]/).pop() || '';
      if(base){
        return base.replace(/\.json$/i, '');
      }
    }
    const firstGroup = flattened.find(entry => entry && typeof entry.group === 'string' && entry.group.trim());
    if(firstGroup){
      const parts = firstGroup.group.split('›').map(part => part.trim()).filter(Boolean);
      if(parts.length){
        return parts[0];
      }
    }
    return 'Farblayer';
  }

  function applyPaletteResult(result){
    if(!result) return;
    const flattened = flattenPalette(result.data);
    state.items = flattened;
    state.layerLookup = new Map(flattened.map(item => [item.name, item]));
    state.lastSource = result.source;
    state.lastModified = result.lastModified != null ? result.lastModified : state.lastModified;
    state.moduleName = deriveModuleName(result, flattened);
    refreshInstanceRegistration();
    const storedGroupState = loadStoredGroupState();
    state.groups = storedGroupState.groups;
    state.groupAssignments = storedGroupState.assignments;
    state.elementAssignments = loadElementAssignments();
    pruneElementAssignments({ persist: false });
    renderGroupZones();
    if(listEl){
      renderItems(listEl, flattened, {
        onCard(card, item){
          card.addEventListener('dragstart', event => {
            event.dataTransfer.setData('text/plain', item.name);
            event.dataTransfer.effectAllowed = 'copy';
            card.dataset.dragging = 'true';
          });
          card.addEventListener('dragend', () => {
            delete card.dataset.dragging;
          });
        }
      });
    }
    state.groups.forEach(groupName => {
      const layerName = state.groupAssignments[groupName];
      const layer = layerName ? getLayerByName(layerName) : null;
      updateDropzone(groupName, layer);
      applyLayerColors(groupName, layer);
    });
    applyAllElementAssignments();
    persistGroupState();
    persistElementAssignments();
    updateStatusMessage(result.source, flattened.length);
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
      try{ state.controller.abort(); }catch{}
    }
    const controller = new AbortController();
    state.controller = controller;
    if(statusEl){
      statusEl.textContent = reason === 'manual' ? 'Aktualisiere Farblayer…' : 'Farblayer werden geladen…';
    }
    if(listEl){
      listEl.innerHTML = '';
    }
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
      if(state.fileHandle){
        state.autoState = 'active';
        state.autoMessage = '';
      }
      updateFileDisplay();
    }catch(err){
      if(state.disposed || controller.signal.aborted) return;
      console.warn('[FarblayerViewer] Konnte Farblayer nicht laden:', err);
      state.items = [];
      state.layerLookup = new Map();
      state.groups = BASE_GROUPS.slice();
      state.groupAssignments = {};
      pruneElementAssignments({ persist: false });
      renderGroupZones();
      applyAllElementAssignments();
      persistGroupState();
      persistElementAssignments();
      if(listEl){
        renderItems(listEl, []);
      }
      if(statusEl){
        statusEl.textContent = 'Farblayer konnten nicht geladen werden.';
      }
      if(metaEl){
        metaEl.textContent = `${CONFIG_PATH} • Keine Daten`;
        metaEl.removeAttribute('title');
      }
    }finally{
      state.controller = null;
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
    if(!handle) return;
    const hasPermission = await ensureReadPermission(handle);
    if(!hasPermission){
      flashStatus('Kein Zugriff auf ausgewählte Datei.', { temporary: true });
      return;
    }
    state.fileHandle = handle;
    state.autoState = 'active';
    state.autoMessage = '';
    try{
      await idbSet(HANDLE_STORAGE_KEY, handle);
    }catch{}
    updateFileDisplay();
    await loadPalette('manual');
    startAutoUpdatePolling();
  }

  async function pickConfigFile(){
    if(typeof window === 'undefined'){
      flashStatus('Dateiauswahl nicht verfügbar.', { temporary: true });
      return;
    }
    if(window.showOpenFilePicker){
      try{
        const handles = await window.showOpenFilePicker({
          multiple: false,
          excludeAcceptAllOption: true,
          types: [{ description: 'Farblayer-Konfiguration', accept: { 'application/json': ['.json'] } }]
        });
        const handle = Array.isArray(handles) && handles.length ? handles[0] : null;
        if(handle){
          await bindFileHandle(handle);
        }
      }catch(err){
        if(err && err.name === 'AbortError') return;
        console.warn('[FarblayerViewer] Dateiauswahl fehlgeschlagen:', err);
        stopAutoUpdatePolling('error', 'Datei konnte nicht ausgewählt werden.');
      }
    }else{
      flashStatus('Dateiauswahl wird nicht unterstützt. Bitte Datei über Arbeitsordner bereitstellen.', { temporary: true });
    }
  }

  function handleAddGroup(){
    if(typeof window === 'undefined') return;
    const name = window.prompt('Name der neuen Gruppe:', '');
    if(typeof name !== 'string') return;
    const trimmed = name.trim();
    if(!trimmed) return;
    if(state.groups.includes(trimmed)){
      flashStatus(`Gruppe "${trimmed}" existiert bereits.`, { temporary: true });
      return;
    }
    state.groups.push(trimmed);
    renderGroupZones();
    persistGroupState();
    flashStatus(`Gruppe "${trimmed}" hinzugefügt.`, { temporary: true });
  }

  function handleRemoveGroup(){
    if(!state.groups.length){
      flashStatus('Keine Gruppen zum Entfernen vorhanden.', { temporary: true });
      return;
    }
    if(typeof window === 'undefined') return;
    const suggestion = state.groups[state.groups.length - 1];
    const input = window.prompt('Welche Gruppe soll entfernt werden?', suggestion || '');
    if(typeof input !== 'string') return;
    const name = input.trim();
    if(!name) return;
    if(!state.groups.includes(name)){
      flashStatus(`Gruppe "${name}" nicht gefunden.`, { temporary: true });
      return;
    }
    state.groups = state.groups.filter(group => group !== name);
    delete state.groupAssignments[name];
    pruneElementAssignments({ persist: false });
    renderGroupZones();
    persistGroupState();
    persistElementAssignments();
    flashStatus(`Gruppe "${name}" entfernt.`, { temporary: true });
  }

  renderGroupZones();
  updateFileDisplay();

  if(openModalBtn){
    const handleOpen = () => openModal();
    openModalBtn.addEventListener('click', handleOpen);
    registerCleanup(() => openModalBtn.removeEventListener('click', handleOpen));
  }

  if(closeModalTargets.length){
    closeModalTargets.forEach(target => {
      const handleClose = event => {
        event.preventDefault();
        closeModal();
      };
      target.addEventListener('click', handleClose);
      registerCleanup(() => target.removeEventListener('click', handleClose));
    });
  }

  if(modalEl){
    const escapeHandler = event => {
      if(event.key === 'Escape'){
        if(state.assignMode){
          event.preventDefault();
          toggleAssignMode(false);
          return;
        }
        if(state.modalOpen){
          event.preventDefault();
          closeModal();
        }
      }
    };
    window.addEventListener('keydown', escapeHandler);
    registerCleanup(() => window.removeEventListener('keydown', escapeHandler));
  }

  if(refreshBtn){
    const handleRefresh = () => { void loadPalette('manual'); };
    refreshBtn.addEventListener('click', handleRefresh);
    registerCleanup(() => refreshBtn.removeEventListener('click', handleRefresh));
  }

  if(filePickBtn){
    const handlePick = () => { void pickConfigFile(); };
    filePickBtn.addEventListener('click', handlePick);
    registerCleanup(() => filePickBtn.removeEventListener('click', handlePick));
  }

  if(addGroupBtn){
    const handleAdd = () => handleAddGroup();
    addGroupBtn.addEventListener('click', handleAdd);
    registerCleanup(() => addGroupBtn.removeEventListener('click', handleAdd));
  }

  if(removeGroupBtn){
    const handleRemove = () => handleRemoveGroup();
    removeGroupBtn.addEventListener('click', handleRemove);
    registerCleanup(() => removeGroupBtn.removeEventListener('click', handleRemove));
  }

  if(saveBtn){
    const handleSave = () => {
      persistGroupState();
      persistElementAssignments();
      flashStatus('Konfiguration gespeichert.', { temporary: true });
    };
    saveBtn.addEventListener('click', handleSave);
    registerCleanup(() => saveBtn.removeEventListener('click', handleSave));
  }

  if(cancelBtn){
    const handleCancel = () => {
      const stored = loadStoredGroupState();
      state.groups = stored.groups;
      state.groupAssignments = stored.assignments;
      state.elementAssignments = loadElementAssignments();
      pruneElementAssignments({ persist: false });
      renderGroupZones();
      applyAllElementAssignments();
      closeModal({ persist: false });
    };
    cancelBtn.addEventListener('click', handleCancel);
    registerCleanup(() => cancelBtn.removeEventListener('click', handleCancel));
  }

  if(assignModeBtn){
    const handleToggleAssign = () => {
      toggleAssignMode(!state.assignMode);
    };
    assignModeBtn.addEventListener('click', handleToggleAssign);
    registerCleanup(() => assignModeBtn.removeEventListener('click', handleToggleAssign));
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
