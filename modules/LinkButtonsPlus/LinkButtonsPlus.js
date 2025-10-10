/* Ops Panel — extended with toggleable links and Testreport deeplink */
(function () {
  // ---------- styles ----------
  if (!document.getElementById('ops-panel-styles')) {
    const css = `
    .ops-root{ height:100%; }
    .ops-outer{ height:100%; width:100%; padding:.6rem; box-sizing:border-box; overflow:hidden; position:relative; display:flex; flex-direction:column; gap:.6rem; color:var(--ops-module-text, inherit); }
    .ops-header{
      display:flex; align-items:center; justify-content:space-between; gap:.75rem;
      padding:.55rem .95rem; border-radius:calc(var(--module-border-radius, 1.25rem) - .25rem);
      background:var(--ops-header-bg, rgba(21,45,76,.86));
      color:var(--ops-header-text,#f8fafc); font-size:clamp(1rem, 1.1vw + .4vh, 1.25rem); font-weight:700;
      letter-spacing:.4px; text-transform:uppercase; box-shadow:var(--ops-header-shadow, 0 12px 28px rgba(12,24,41,.45));
      border:1px solid var(--ops-header-border, rgba(76,114,163,.32));
    }
    .ops-title{ display:flex; align-items:center; gap:.45rem; }
    .ops-title::before{
      content:'🔗'; font-size:1.05em; filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));
    }
    .ops-autorefresh{
      display:inline-flex; align-items:center; gap:.4rem;
      padding:.35rem .9rem; border-radius:999px;
      background:var(--ops-pill-bg, rgba(37,99,235,.92)); box-shadow:var(--ops-pill-shadow, 0 8px 18px rgba(15,23,42,.28));
      color:var(--ops-pill-text,#fff); font-size:.78rem; font-weight:600; letter-spacing:.25px;
      cursor:default; transition:opacity .15s ease, box-shadow .15s ease;
      border:1px solid var(--ops-pill-border, transparent);
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
      background:var(--ops-card-bg, rgba(21,45,76,.82));
      border: 1px solid var(--ops-card-border, rgba(76,114,163,.34));
      border-radius: var(--module-border-radius, 1.25rem);
      color: var(--ops-card-text, var(--module-header-text,#fff));
      display:flex; align-items:center; justify-content:center;
      padding:.5rem 1rem; font-weight:600; letter-spacing:.2px;
      font-size: clamp(.9rem, 1.1vw + .4vh, 1.25rem);
      user-select:none; text-align:center;
      transition: transform .12s ease, box-shadow .12s ease, background-color .12s ease, border-color .12s ease;
      box-shadow: var(--ops-card-shadow, 0 16px 34px rgba(12,24,41,.45));
    }
    .ops-card:hover{
      transform: translateY(-1px);
      box-shadow: var(--ops-card-shadow-hover, 0 20px 40px rgba(15,23,42,.45));
      border-color:var(--ops-card-border-hover, rgba(37,99,235,.45));
      background:var(--ops-card-hover-bg, var(--ops-card-bg, rgba(21,45,76,.82)));
    }
    .ops-card:active{ transform: translateY(0); filter:none; background:var(--ops-card-active-bg, rgba(37,99,235,.32)); }
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
    .ops-layer-summary{padding:.4rem .5rem; margin:.35rem .35rem 0; border-radius:.5rem; background:rgba(37,99,235,.08); font-size:.76rem; line-height:1.45;}
    .ops-layer-summary strong{display:block; font-size:.82rem; margin-bottom:.2rem;}
    .ops-layer-summary-line{display:flex; justify-content:space-between; gap:.5rem; align-items:center;}
    .ops-layer-summary-value{display:inline-flex; align-items:center; gap:.35rem; font-weight:600; flex-wrap:wrap; justify-content:flex-end;}
    .ops-layer-summary-label{display:inline-flex; align-items:center; gap:.35rem;}
    .ops-layer-summary-detail{font-size:.72rem; font-weight:500; opacity:.7;}
    .ops-layer-swatch{width:.85rem; height:.85rem; border-radius:999px; border:1px solid rgba(15,23,42,.18); background:var(--ops-layer-swatch-bg,#2563eb); box-shadow:0 0 0 1px rgba(255,255,255,.35) inset;}
    .ops-menu .ops-layer-config-button{margin:.35rem .35rem 0;}
    .ops-layer-select{width:100%; padding:.45rem .6rem; border:1px solid var(--border-color,#d1d5db); border-radius:.5rem; background:var(--sidebar-module-card-bg,#fff); color:inherit; font-size:.9rem; box-sizing:border-box;}
    .ops-layer-select:disabled{opacity:.55; cursor:not-allowed;}
    .ops-layer-toggle-list{padding:.1rem .2rem .35rem; display:flex; flex-direction:column; gap:.1rem;}
    .ops-layer-toggle-list label{border-radius:.35rem;}
    .ops-layer-modal-backdrop{position:fixed; inset:0; display:none; align-items:center; justify-content:center; padding:1.5rem; background:rgba(15,23,42,.55); z-index:1100;}
    .ops-layer-modal-backdrop.open{display:flex;}
    .ops-layer-modal{width:min(640px, 100%); max-height:calc(100vh - 3rem); background:var(--sidebar-module-card-bg,#fff); color:var(--sidebar-module-card-text,#0f172a); border-radius:1rem; box-shadow:0 24px 60px rgba(15,23,42,.45); display:flex; flex-direction:column; overflow:hidden;}
    .ops-layer-modal-header{display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-bottom:1px solid var(--border-color,#e2e8f0);}
    .ops-layer-modal-title{margin:0; font-size:1.1rem; font-weight:700;}
    .ops-layer-modal-close{border:none; background:transparent; font-size:1.4rem; line-height:1; cursor:pointer; color:inherit; padding:.25rem; border-radius:.4rem;}
    .ops-layer-modal-close:focus-visible{outline:2px solid rgba(37,99,235,.35); outline-offset:2px;}
    .ops-layer-modal-body{padding:1rem 1.25rem; overflow:auto; display:flex; flex-direction:column; gap:1.1rem;}
    .ops-layer-modal-hint{margin:0; font-size:.85rem; opacity:.8;}
    .ops-layer-mapping-grid{display:flex; flex-direction:column; gap:.8rem;}
    .ops-layer-form-row{display:flex; flex-direction:column; gap:.35rem;}
    .ops-layer-form-label{display:flex; flex-direction:column; gap:.2rem; font-size:.85rem; font-weight:600;}
    .ops-layer-form-label small{font-size:.75rem; font-weight:500; opacity:.75;}
    .ops-layer-preview{display:flex; flex-direction:column; gap:.75rem;}
    .ops-layer-preview-card{display:flex; flex-direction:column; gap:.4rem; border-radius:.85rem; border:1px solid rgba(15,23,42,.12); padding:.85rem 1rem; background:#fff; box-shadow:0 10px 24px rgba(15,23,42,.12);}
    .ops-layer-preview-header{padding:.4rem .65rem; border-radius:.65rem; font-weight:700; border:1px solid transparent;}
    .ops-layer-preview-main{padding:.4rem .65rem; border-radius:.65rem;}
    .ops-layer-preview-button{align-self:flex-start; padding:.35rem .85rem; border-radius:999px; border:1px solid currentColor; font-weight:600; font-size:.85rem;}
    .ops-layer-preview-meta{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.2rem; font-size:.8rem;}
    .ops-layer-preview-meta li{display:flex; justify-content:space-between; gap:.5rem; align-items:flex-start;}
    .ops-layer-meta-value{display:flex; flex-direction:column; align-items:flex-end; text-align:right; gap:.1rem;}
    .ops-layer-meta-value span{font-weight:600;}
    .ops-layer-preview-meta em{font-style:normal; opacity:.75;}
    .ops-layer-preview-meta-detail{font-size:.72rem; font-weight:500; opacity:.7;}
    .ops-layer-preview-empty{padding:.6rem; border-radius:.65rem; background:rgba(15,23,42,.05); font-size:.8rem; text-align:center; opacity:.8;}
    .ops-layer-modal-footer{padding:.85rem 1.25rem; border-top:1px solid var(--border-color,#e2e8f0); display:flex; justify-content:flex-end;}
    .ops-layer-modal-footer button{border:none; border-radius:.65rem; padding:.45rem 1.1rem; font-weight:600; cursor:pointer; background:var(--button-bg,#2563eb); color:var(--button-text,#fff); box-shadow:0 8px 18px rgba(37,99,235,.35);}
    .ops-layer-modal-footer button:focus-visible{outline:2px solid rgba(37,99,235,.35); outline-offset:2px;}
    `;
    const tag = document.createElement('style');
    tag.id = 'ops-panel-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  const LAYER_STATE_KEY = 'linkbuttonsplus-layer-selection';
  const FALLBACK_LAYER = Object.freeze({
    id: 'fallback-layer',
    name: 'Standard',
    moduleBg: '#152d4c',
    moduleText: '#f8fafc',
    moduleBorder: '#4c72a3',
    headerBg: '#152d4c',
    headerText: '#f8fafc',
    headerBorder: '#4c72a3',
    subBg: '#2563eb',
    subText: '#ffffff',
    subBorder: '#1d4ed8',
    subLayers: Object.freeze([
      Object.freeze({ bg: '#2563eb', text: '#ffffff', border: '#1d4ed8' })
    ])
  });

  const LAYER_PARTS = Object.freeze([
    { key: 'module', label: 'Hauptmodul', description: 'Rahmen & Hintergrund' },
    { key: 'header', label: 'Header', description: 'Titelzeile & Status' },
    { key: 'buttons', label: 'Buttons', description: 'Karten & Aktionen' }
  ]);

  function ensureColor(value, fallback) {
    return (typeof value === 'string' && value.trim()) ? value.trim() : fallback;
  }

  function parseColorChannels(color) {
    if (!color || typeof color !== 'string') return null;
    const input = color.trim();
    if (!input) return null;
    if (input.startsWith('#')) {
      let hex = input.slice(1);
      if (hex.length === 3) {
        hex = hex.split('').map(ch => ch + ch).join('');
      }
      if (hex.length !== 6) return null;
      const intVal = Number.parseInt(hex, 16);
      if (Number.isNaN(intVal)) return null;
      return {
        r: (intVal >> 16) & 255,
        g: (intVal >> 8) & 255,
        b: intVal & 255
      };
    }
    const match = input.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (match) {
      const r = Number.parseFloat(match[1]);
      const g = Number.parseFloat(match[2]);
      const b = Number.parseFloat(match[3]);
      if ([r, g, b].some(v => Number.isNaN(v))) return null;
      return {
        r: Math.max(0, Math.min(255, Math.round(r))),
        g: Math.max(0, Math.min(255, Math.round(g))),
        b: Math.max(0, Math.min(255, Math.round(b)))
      };
    }
    return null;
  }

  function mixColor(base, mixWith, weight = 0.5) {
    const source = parseColorChannels(base);
    if (!source) return base;
    const target = parseColorChannels(mixWith) || (weight >= 0.5
      ? { r: 255, g: 255, b: 255 }
      : { r: 0, g: 0, b: 0 });
    const w = Math.max(0, Math.min(1, Number(weight) || 0));
    const r = Math.round(source.r + (target.r - source.r) * w);
    const g = Math.round(source.g + (target.g - source.g) * w);
    const b = Math.round(source.b + (target.b - source.b) * w);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function withAlpha(color, alpha, fallbackOpacity = 0.35) {
    const channels = parseColorChannels(color);
    if (!channels) return `rgba(0,0,0,${fallbackOpacity})`;
    const a = Math.max(0, Math.min(1, Number(alpha) || 0));
    return `rgba(${channels.r}, ${channels.g}, ${channels.b}, ${a})`;
  }

  function buildShadow(color, alpha, template, fallbackOpacity = 0.35) {
    return `${template} ${withAlpha(color, alpha, fallbackOpacity)}`;
  }

  function loadLayerSelections() {
    try {
      const raw = JSON.parse(localStorage.getItem(LAYER_STATE_KEY));
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  }

  function saveLayerSelections(state) {
    try {
      localStorage.setItem(LAYER_STATE_KEY, JSON.stringify(state));
    } catch {}
  }

  function getLayerDefinitions() {
    const appLayers = window?.appSettings?.moduleColorLayers;
    if (Array.isArray(appLayers) && appLayers.length) {
      return appLayers.map(layer => ({ ...layer }));
    }
    const collectFromDom = typeof window?.collectModuleColorLayersFromDom === 'function'
      ? window.collectModuleColorLayersFromDom
      : null;
    if (collectFromDom) {
      const domLayers = collectFromDom();
      if (Array.isArray(domLayers) && domLayers.length) {
        return domLayers.map(layer => ({ ...layer }));
      }
    }
    const container = document.getElementById('module-color-layers');
    if (container) {
      const domLayers = [];
      container.querySelectorAll('.module-color-layer').forEach((layerEl, index) => {
        const getColor = selector => {
          const input = layerEl.querySelector(selector);
          return input ? input.value : '';
        };
        const id = layerEl.dataset.id || `layer-${index + 1}`;
        const nameInput = layerEl.querySelector('.module-layer-name');
        const subLayers = [];
        layerEl.querySelectorAll('.module-layer-subgroup').forEach(subEl => {
          const getSubColor = key => {
            const input = subEl.querySelector(`input[data-sub-field="${key}"]`);
            return input ? input.value : '';
          };
          subLayers.push({
            bg: getSubColor('bg'),
            text: getSubColor('text'),
            border: getSubColor('border')
          });
        });
        const moduleBg = getColor('input[data-field="moduleBg"]');
        const moduleText = getColor('input[data-field="moduleText"]');
        const moduleBorder = getColor('input[data-field="moduleBorder"]') || moduleBg;
        const headerBg = getColor('input[data-field="headerBg"]') || moduleBg;
        const headerText = getColor('input[data-field="headerText"]') || moduleText;
        const headerBorder = getColor('input[data-field="headerBorder"]') || headerBg;
        const firstSub = subLayers[0] || { bg: moduleBg, text: moduleText, border: moduleBg };
        domLayers.push({
          id,
          name: nameInput && typeof nameInput.value === 'string' && nameInput.value.trim() ? nameInput.value : `Layer ${index + 1}`,
          moduleBg,
          moduleText,
          moduleBorder,
          headerBg,
          headerText,
          headerBorder,
          subLayers,
          subBg: firstSub.bg || moduleBg,
          subText: firstSub.text || moduleText,
          subBorder: firstSub.border || moduleBorder
        });
      });
      if (domLayers.length) return domLayers;
    }
    return [{ ...FALLBACK_LAYER }];
  }

  function getLayerLabel(layer) {
    return layer?.name || layer?.id || 'Layer';
  }

  function getLayerSwatchColor(layer) {
    return layer?.moduleBg || layer?.headerBg || layer?.subBg || FALLBACK_LAYER.moduleBg;
  }

  function getLayerColorSummary(layer) {
    if (!layer || typeof layer !== 'object') return '';
    const tokens = [layer.moduleBg, layer.headerBg, layer.subBg]
      .filter(color => typeof color === 'string' && color.trim())
      .map(color => color.trim());
    const unique = [];
    tokens.forEach(color => {
      if (!unique.includes(color)) unique.push(color);
    });
    return unique.join(' · ');
  }

  function normalizeLayerMapping(mapping, layers = getLayerDefinitions()) {
    const fallbackLayer = layers.length ? (layers[0] || FALLBACK_LAYER) : FALLBACK_LAYER;
    const fallbackId = typeof fallbackLayer?.id === 'string' ? fallbackLayer.id : 'fallback-layer';
    if (typeof mapping === 'string' && mapping.trim()) {
      const id = layers.some(layer => layer?.id === mapping) ? mapping : fallbackId;
      return { module: id, header: id, buttons: id };
    }
    const isObject = mapping && typeof mapping === 'object' && !Array.isArray(mapping);
    const normalized = {};
    LAYER_PARTS.forEach(({ key }) => {
      const requested = isObject ? mapping[key] : undefined;
      const candidate = (typeof requested === 'string' && layers.some(layer => layer?.id === requested))
        ? requested
        : fallbackId;
      normalized[key] = candidate;
    });
    return normalized;
  }

  function layerMappingsEqual(a, b) {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return false;
    if (!b || typeof b !== 'object' || Array.isArray(b)) return false;
    return LAYER_PARTS.every(({ key }) => a[key] === b[key]);
  }

  function resolveLayerColors(layer) {
    const base = layer || FALLBACK_LAYER;
    const moduleBg = ensureColor(base.moduleBg, FALLBACK_LAYER.moduleBg);
    const moduleText = ensureColor(base.moduleText, FALLBACK_LAYER.moduleText);
    const moduleBorder = ensureColor(base.moduleBorder, moduleText);
    const headerBg = ensureColor(base.headerBg, moduleBg);
    const headerText = ensureColor(base.headerText, moduleText);
    const headerBorder = ensureColor(base.headerBorder, headerBg);
    const subLayers = Array.isArray(base.subLayers) && base.subLayers.length
      ? base.subLayers
      : [{
          bg: ensureColor(base.subBg, moduleBg),
          text: ensureColor(base.subText, moduleText),
          border: ensureColor(base.subBorder, moduleBorder)
        }];
    const firstSub = subLayers[0] || {};
    const subBg = ensureColor(firstSub.bg, moduleBg);
    const subText = ensureColor(firstSub.text, moduleText);
    const subBorder = ensureColor(firstSub.border, subBg);
    return { moduleBg, moduleText, moduleBorder, headerBg, headerText, headerBorder, subBg, subText, subBorder };
  }

  function applyColorLayer(layer, targetEl) {
    if (!targetEl) return resolveLayerColors(layer);
    const colors = resolveLayerColors(layer);
    const { moduleBg, moduleText, moduleBorder, headerBg, headerText, headerBorder, subBg, subText, subBorder } = colors;
    targetEl.style.setProperty('--ops-module-bg', moduleBg);
    targetEl.style.setProperty('--ops-module-text', moduleText);
    targetEl.style.setProperty('--ops-module-border', moduleBorder);
    targetEl.style.setProperty('--ops-header-bg', headerBg);
    targetEl.style.setProperty('--ops-header-text', headerText);
    targetEl.style.setProperty('--ops-header-border', headerBorder);
    targetEl.style.setProperty('--ops-header-shadow', buildShadow(headerBg, 0.45, '0 12px 28px'));
    targetEl.style.setProperty('--ops-card-bg', subBg);
    targetEl.style.setProperty('--ops-card-text', subText);
    targetEl.style.setProperty('--ops-card-border', subBorder);
    targetEl.style.setProperty('--ops-card-border-hover', mixColor(subBorder, '#ffffff', 0.25));
    targetEl.style.setProperty('--ops-card-hover-bg', mixColor(subBg, '#ffffff', 0.1));
    targetEl.style.setProperty('--ops-card-active-bg', withAlpha(subBg, 0.35));
    targetEl.style.setProperty('--ops-card-shadow', buildShadow(subBg, 0.38, '0 16px 34px'));
    targetEl.style.setProperty('--ops-card-shadow-hover', buildShadow(subBg, 0.45, '0 20px 40px'));
    targetEl.style.setProperty('--ops-pill-bg', mixColor(subBg, '#ffffff', 0.12));
    targetEl.style.setProperty('--ops-pill-text', subText);
    targetEl.style.setProperty('--ops-pill-border', mixColor(subBg, '#000000', 0.2));
    targetEl.style.setProperty('--ops-pill-shadow', buildShadow(subBg, 0.28, '0 8px 18px'));
    targetEl.style.backgroundColor = moduleBg;
    targetEl.style.color = moduleText;
    targetEl.style.borderColor = moduleBorder;
    if (targetEl.dataset) targetEl.dataset.colorLayer = layer?.id || 'fallback-layer';
    return colors;
  }

  function applyLayerMapping(mapping, targetEl, layers = getLayerDefinitions()) {
    const normalized = normalizeLayerMapping(mapping, layers);
    const resolveLayer = (id) => {
      if (typeof id === 'string') {
        const found = layers.find(layer => layer?.id === id);
        if (found) return found;
      }
      return layers[0] || FALLBACK_LAYER;
    };
    const moduleLayer = resolveLayer(normalized.module);
    const headerLayer = resolveLayer(normalized.header);
    const buttonLayer = resolveLayer(normalized.buttons);
    const moduleColors = resolveLayerColors(moduleLayer);
    const headerColors = resolveLayerColors(headerLayer);
    const buttonColors = resolveLayerColors(buttonLayer);
    if (targetEl) {
      targetEl.style.setProperty('--ops-module-bg', moduleColors.moduleBg);
      targetEl.style.setProperty('--ops-module-text', moduleColors.moduleText);
      targetEl.style.setProperty('--ops-module-border', moduleColors.moduleBorder);
      targetEl.style.setProperty('--ops-header-bg', headerColors.headerBg);
      targetEl.style.setProperty('--ops-header-text', headerColors.headerText);
      targetEl.style.setProperty('--ops-header-border', headerColors.headerBorder);
      targetEl.style.setProperty('--ops-header-shadow', buildShadow(headerColors.headerBg, 0.45, '0 12px 28px'));
      targetEl.style.setProperty('--ops-card-bg', buttonColors.subBg);
      targetEl.style.setProperty('--ops-card-text', buttonColors.subText);
      targetEl.style.setProperty('--ops-card-border', buttonColors.subBorder);
      targetEl.style.setProperty('--ops-card-border-hover', mixColor(buttonColors.subBorder, '#ffffff', 0.25));
      targetEl.style.setProperty('--ops-card-hover-bg', mixColor(buttonColors.subBg, '#ffffff', 0.1));
      targetEl.style.setProperty('--ops-card-active-bg', withAlpha(buttonColors.subBg, 0.35));
      targetEl.style.setProperty('--ops-card-shadow', buildShadow(buttonColors.subBg, 0.38, '0 16px 34px'));
      targetEl.style.setProperty('--ops-card-shadow-hover', buildShadow(buttonColors.subBg, 0.45, '0 20px 40px'));
      targetEl.style.setProperty('--ops-pill-bg', mixColor(buttonColors.subBg, '#ffffff', 0.12));
      targetEl.style.setProperty('--ops-pill-text', buttonColors.subText);
      targetEl.style.setProperty('--ops-pill-border', mixColor(buttonColors.subBg, '#000000', 0.2));
      targetEl.style.setProperty('--ops-pill-shadow', buildShadow(buttonColors.subBg, 0.28, '0 8px 18px'));
      targetEl.style.backgroundColor = moduleColors.moduleBg;
      targetEl.style.color = moduleColors.moduleText;
      targetEl.style.borderColor = moduleColors.moduleBorder;
      if (targetEl.dataset) {
        targetEl.dataset.moduleLayer = moduleLayer?.id || 'fallback-layer';
        targetEl.dataset.headerLayer = headerLayer?.id || 'fallback-layer';
        targetEl.dataset.buttonsLayer = buttonLayer?.id || 'fallback-layer';
      }
    }
    return { mapping: normalized, moduleLayer, headerLayer, buttonLayer, moduleColors, headerColors, buttonColors };
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

    const itemEl = root.closest('.grid-stack-item');
    const contentEl = root.closest('.grid-stack-item-content');

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
        <div class="ops-layer-summary"></div>
        <button type="button" class="ops-layer-config-button ops-action-button">Farben anpassen …</button>
        <hr>
        <div class="ops-layer-toggle-list">
          ${allLabels.map(l => `<label><input type="checkbox" data-label="${l}"> ${l}</label>`).join('')}
        </div>
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
    const layerSummary = menu.querySelector('.ops-layer-summary');
    const openLayerModalBtn = menu.querySelector('.ops-layer-config-button');
    const layerSelections = loadLayerSelections();
    const layerStateKey = itemEl?.dataset.instanceId || '__default__';
    let selectedLayerMapping = normalizeLayerMapping(layerSelections[layerStateKey]);

    function persistSelectedMapping() {
      const previous = layerSelections[layerStateKey];
      const next = { ...selectedLayerMapping };
      const changed = !layerMappingsEqual(previous, next);
      layerSelections[layerStateKey] = next;
      if (changed) {
        saveLayerSelections(layerSelections);
      }
    }

    selectedLayerMapping = applyLayerMapping(selectedLayerMapping, contentEl).mapping;
    persistSelectedMapping();

    const modalSuffix = Math.random().toString(36).slice(2);
    const layerModalBackdrop = document.createElement('div');
    layerModalBackdrop.className = 'ops-layer-modal-backdrop';
    layerModalBackdrop.innerHTML = `
      <div class="ops-layer-modal" role="dialog" aria-modal="true" aria-labelledby="ops-layer-modal-title-${modalSuffix}">
        <div class="ops-layer-modal-header">
          <h2 class="ops-layer-modal-title" id="ops-layer-modal-title-${modalSuffix}">Farben für LinkButtons Plus</h2>
          <button type="button" class="ops-layer-modal-close" aria-label="Schließen">×</button>
        </div>
        <div class="ops-layer-modal-body">
          <p class="ops-layer-modal-hint">Wählen Sie für jeden Bereich einen Layer aus dem Hauptmenü.</p>
          <div class="ops-layer-mapping-grid">
            ${LAYER_PARTS.map(part => `
              <label class="ops-layer-form-row" data-part="${part.key}">
                <span class="ops-layer-form-label">
                  ${part.label}
                  <small>${part.description}</small>
                </span>
                <select class="ops-layer-select" data-part="${part.key}"></select>
              </label>
            `).join('')}
          </div>
          <div class="ops-layer-preview"></div>
        </div>
        <div class="ops-layer-modal-footer">
          <button type="button" class="ops-layer-modal-close-btn">Schließen</button>
        </div>
      </div>
    `;
    document.body.appendChild(layerModalBackdrop);
    const layerModalPreview = layerModalBackdrop.querySelector('.ops-layer-preview');
    const layerModalSelects = {};
    layerModalBackdrop.querySelectorAll('.ops-layer-select').forEach(select => {
      const part = select.dataset.part;
      if (part) layerModalSelects[part] = select;
    });
    const layerModalCloseButtons = layerModalBackdrop.querySelectorAll('.ops-layer-modal-close, .ops-layer-modal-close-btn');

    function renderLayerPreview(details) {
      if (!layerModalPreview) return;
      if (!details) {
        layerModalPreview.innerHTML = '<div class="ops-layer-preview-empty">Keine Layer verfügbar</div>';
        return;
      }
      const { moduleColors, headerColors, buttonColors, moduleLayer, headerLayer, buttonLayer } = details;
      const parts = [
        { label: 'Hauptmodul', layer: moduleLayer },
        { label: 'Header', layer: headerLayer },
        { label: 'Buttons', layer: buttonLayer }
      ];
      const surface = mixColor(moduleColors.moduleBg, '#ffffff', 0.85);
      layerModalPreview.innerHTML = `
        <div class="ops-layer-preview-card" style="background:${moduleColors.moduleBg}; color:${moduleColors.moduleText}; border-color:${moduleColors.moduleBorder};">
          <div class="ops-layer-preview-header" style="background:${headerColors.headerBg}; color:${headerColors.headerText}; border-color:${headerColors.headerBorder}; box-shadow:${buildShadow(headerColors.headerBg, 0.25, '0 6px 16px')};">Header</div>
          <div class="ops-layer-preview-main" style="background:${surface}; color:${moduleColors.moduleText};">Modulfläche</div>
          <div class="ops-layer-preview-button" style="background:${buttonColors.subBg}; color:${buttonColors.subText}; border-color:${buttonColors.subBorder}; box-shadow:${buildShadow(buttonColors.subBg, 0.18, '0 4px 12px')};">Button</div>
        </div>
        <ul class="ops-layer-preview-meta">
          ${parts.map(({ label, layer }) => {
            const name = getLayerLabel(layer);
            const colors = getLayerColorSummary(layer);
            const swatch = getLayerSwatchColor(layer);
            const detail = colors ? `<span class=\"ops-layer-preview-meta-detail\">${colors}</span>` : '';
            return `<li><em>${label}</em><span class=\"ops-layer-meta-value\"><span class=\"ops-layer-summary-label\"><span class=\"ops-layer-swatch\" style=\"--ops-layer-swatch-bg:${swatch}\"></span>${name}</span>${detail}</span></li>`;
          }).join('')}
        </ul>
      `;
    }

    function updateLayerSummary() {
      if (!layerSummary) return;
      const layers = getLayerDefinitions();
      const fallback = layers[0] || FALLBACK_LAYER;
      const summary = LAYER_PARTS.map(part => {
        const id = selectedLayerMapping?.[part.key];
        let layer = layers.find(l => l?.id === id);
        if (!layer && id === FALLBACK_LAYER.id) {
          layer = FALLBACK_LAYER;
        }
        if (!layer) layer = fallback || FALLBACK_LAYER;
        const name = getLayerLabel(layer);
        const swatchColor = getLayerSwatchColor(layer);
        const colors = getLayerColorSummary(layer);
        const detail = colors ? `<span class="ops-layer-summary-detail">${colors}</span>` : '';
        return `<div class="ops-layer-summary-line"><span>${part.label}</span><span class="ops-layer-summary-value"><span class="ops-layer-summary-label"><span class="ops-layer-swatch" style="--ops-layer-swatch-bg:${swatchColor}"></span>${name}</span>${detail}</span></div>`;
      }).join('');
      layerSummary.innerHTML = `<strong>Farbschema</strong>${summary}`;
    }

    function populateLayerSelects() {
      const layers = getLayerDefinitions();
      Object.entries(layerModalSelects).forEach(([part, select]) => {
        if (!select) return;
        select.innerHTML = '';
        layers.forEach(layer => {
          const option = document.createElement('option');
          const id = layer?.id || '';
          const label = getLayerLabel(layer);
          const colors = getLayerColorSummary(layer);
          option.value = id;
          option.textContent = colors ? `${label} (${colors})` : label;
          option.dataset.layerId = id;
          option.dataset.layerBg = layer?.moduleBg || '';
          option.dataset.layerText = layer?.moduleText || '';
          option.dataset.layerHeaderBg = layer?.headerBg || '';
          option.dataset.layerButtonBg = layer?.subBg || '';
          select.appendChild(option);
        });
        select.disabled = !layers.length;
        if (!layers.length) {
          select.title = 'Keine Layer definiert';
        } else {
          select.removeAttribute('title');
        }
      });
      selectedLayerMapping = normalizeLayerMapping(selectedLayerMapping, layers);
      const details = applyLayerMapping(selectedLayerMapping);
      selectedLayerMapping = details.mapping;
      Object.entries(layerModalSelects).forEach(([part, select]) => {
        if (!select || !layers.length) return;
        const desired = selectedLayerMapping[part];
        if (Array.from(select.options).some(opt => opt.value === desired)) {
          select.value = desired;
        }
      });
      persistSelectedMapping();
      renderLayerPreview(details);
      updateLayerSummary();
    }

    function closeLayerModal() {
      layerModalBackdrop.classList.remove('open');
    }

    function openLayerModal() {
      menu.classList.remove('open');
      populateLayerSelects();
      layerModalBackdrop.classList.add('open');
      const focusTarget = layerModalBackdrop.querySelector('.ops-layer-select:not(:disabled)');
      if (focusTarget) focusTarget.focus();
    }

    layerModalBackdrop.addEventListener('click', e => {
      if (e.target === layerModalBackdrop) {
        closeLayerModal();
      }
    });
    layerModalCloseButtons.forEach(btn => {
      btn.addEventListener('click', () => closeLayerModal());
    });

    const handleKeydown = (e) => {
      if (e.key === 'Escape' && layerModalBackdrop.classList.contains('open')) {
        e.preventDefault();
        closeLayerModal();
      }
    };
    document.addEventListener('keydown', handleKeydown);

    if (openLayerModalBtn) {
      openLayerModalBtn.addEventListener('click', () => {
        openLayerModal();
      });
    }

    Object.entries(layerModalSelects).forEach(([part, select]) => {
      if (!select) return;
      select.addEventListener('change', () => {
        selectedLayerMapping = normalizeLayerMapping({ ...selectedLayerMapping, [part]: select.value });
        const details = applyLayerMapping(selectedLayerMapping, contentEl);
        selectedLayerMapping = details.mapping;
        persistSelectedMapping();
        renderLayerPreview(details);
        Object.entries(layerModalSelects).forEach(([otherPart, otherSelect]) => {
          if (!otherSelect) return;
          const desired = selectedLayerMapping[otherPart];
          if (Array.from(otherSelect.options).some(opt => opt.value === desired) && otherSelect.value !== desired) {
            otherSelect.value = desired;
          }
        });
        updateLayerSummary();
      });
    });

    updateLayerSummary();

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
      Object.assign(layerSelections, loadLayerSelections());
      selectedLayerMapping = normalizeLayerMapping(layerSelections[layerStateKey]);
      const details = applyLayerMapping(selectedLayerMapping, contentEl);
      selectedLayerMapping = details.mapping;
      persistSelectedMapping();
      updateLayerSummary();
      tabButtons.forEach(btn => {
        const isButtons = btn.dataset.tab === 'buttons';
        btn.classList.toggle('active', isButtons);
      });
      tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === 'buttons'));
      menu.style.left = e.pageX + 'px';
      menu.style.top = e.pageY + 'px';
      menu.classList.add('open');
    });

    const handleDocumentClick = e => {
      if (!menu.contains(e.target)) {
        if (menu.classList.contains('open')) {
          persistFilters();
          renderFilters();
        }
        menu.classList.remove('open');
      }
    };
    document.addEventListener('click', handleDocumentClick);

    // --- Layout switch based on GridStack cell height (stable, no flicker) ---
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
        document.removeEventListener('keydown', handleKeydown);
        document.removeEventListener('click', handleDocumentClick);
        layerModalBackdrop.remove();
        menu.remove();
        mo.disconnect();
      }
    });
    mo.observe(document.body, { childList:true, subtree:true });
  };
})();
