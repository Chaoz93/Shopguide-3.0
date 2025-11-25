(function(){
  const STYLE_ID = 'color-example-styles';
  const STORAGE_KEY = 'colorExample:selection';
  const MAX_LAYERS = 12;

  if(!document.getElementById(STYLE_ID)){
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .ce-root{height:100%;width:100%;padding:.6rem;box-sizing:border-box;display:flex;flex-direction:column;gap:.65rem;}
      .ce-panel{background:var(--ce-module-bg,#0f172a);color:var(--ce-module-text,#e2e8f0);border-radius:1rem;box-shadow:0 14px 26px rgba(8,15,35,.35);border:1px solid var(--ce-module-border,rgba(148,163,184,.32));padding:.9rem 1rem;display:flex;flex-direction:column;gap:.8rem;transition:background .2s ease,color .2s ease,border-color .2s ease;}
      .ce-header{display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap;}
      .ce-title{margin:0;font-size:1.1rem;font-weight:700;letter-spacing:.2px;display:flex;align-items:center;gap:.45rem;}
      .ce-title span{font-size:1.2rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3));}
      .ce-legend{font-size:.86rem;opacity:.85;}
      .ce-controls{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;}
      .ce-field{display:flex;flex-direction:column;gap:.25rem;min-width:180px;}
      .ce-field label{font-weight:600;font-size:.85rem;}
      .ce-select{appearance:none;padding:.5rem .75rem;border-radius:.65rem;border:1px solid var(--ce-module-border,rgba(148,163,184,.35));background:rgba(15,23,42,.7);color:var(--ce-module-text,#e2e8f0);font-weight:600;box-shadow:0 6px 16px rgba(8,15,35,.28);}
      .ce-preview{border-radius:.9rem;border:1px solid var(--ce-module-border,rgba(148,163,184,.32));overflow:hidden;background:var(--ce-module-bg,#0f172a);color:var(--ce-module-text,#e2e8f0);}
      .ce-preview-header{padding:.65rem .8rem;background:var(--ce-header-bg,#1f2937);color:var(--ce-header-text,#f8fafc);border-bottom:1px solid var(--ce-header-border,rgba(148,163,184,.45));font-weight:700;letter-spacing:.2px;display:flex;align-items:center;gap:.4rem;}
      .ce-preview-body{padding:.85rem .95rem;display:flex;flex-direction:column;gap:.65rem;}
      .ce-chip{display:inline-flex;align-items:center;gap:.35rem;border-radius:999px;padding:.35rem .7rem;font-weight:600;border:1px solid var(--ce-header-border,rgba(148,163,184,.45));background:rgba(255,255,255,.08);}
      .ce-body-card{border-radius:.75rem;padding:.7rem .8rem;background:rgba(15,23,42,.5);border:1px solid var(--ce-module-border,rgba(148,163,184,.32));}
      .ce-layer-grid{display:grid;gap:.6rem;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));}
      .ce-layer-card{background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.25);border-radius:.85rem;padding:.7rem .8rem;box-shadow:0 10px 22px rgba(8,15,35,.28);display:flex;flex-direction:column;gap:.55rem;}
      .ce-layer-name{display:flex;align-items:center;justify-content:space-between;gap:.4rem;font-weight:700;font-size:.95rem;}
      .ce-swatches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem;}
      .ce-swatch{border-radius:.65rem;padding:.55rem;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);display:flex;flex-direction:column;gap:.35rem;min-height:96px;}
      .ce-swatch-title{font-weight:700;font-size:.85rem;display:flex;align-items:center;gap:.35rem;}
      .ce-swatch-box{border-radius:.55rem;border:1px solid rgba(0,0,0,.18);padding:.5rem .55rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);}
      .ce-swatch-box .ce-swatch-line{display:flex;justify-content:space-between;font-size:.82rem;line-height:1.4;font-weight:600;}
      .ce-swatch-box .ce-swatch-line span:last-child{font-family:monospace;font-size:.78rem;}
      .ce-empty{opacity:.8;font-size:.9rem;}
      @media(max-width:640px){.ce-swatches{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(style);
  }

  function readValue(styles, prop){
    return (styles.getPropertyValue(prop) || '').trim();
  }

  function readTriplet(styles, prefix, fallback){
    const fb = fallback || {};
    return {
      bg: readValue(styles, `${prefix}-bg`) || fb.bg || '',
      text: readValue(styles, `${prefix}-text`) || fb.text || '',
      border: readValue(styles, `${prefix}-border`) || fb.border || ''
    };
  }

  function hasAnyColor(triplet){
    if(!triplet) return false;
    return Boolean(triplet.bg || triplet.text || triplet.border);
  }

  function loadGlobalColorLayers(maxLayers = MAX_LAYERS){
    const layers = [];
    const root = document.documentElement;
    if(!root) return layers;
    const styles = getComputedStyle(root);

    const moduleFallback = readTriplet(styles, '--module-layer-module', {
      bg: readValue(styles, '--module-bg'),
      text: readValue(styles, '--text-color'),
      border: readValue(styles, '--module-border-color')
    });
    const headerFallback = readTriplet(styles, '--module-layer-header', {
      bg: readValue(styles, '--module-header-bg'),
      text: readValue(styles, '--module-header-text'),
      border: readValue(styles, '--module-header-border')
    });

    const baseName = readValue(styles, '--module-layer-name') || 'Standard';
    layers.push({
      id: 'primary',
      name: baseName,
      module: moduleFallback,
      header: headerFallback
    });

    for(let i = 1; i <= maxLayers; i += 1){
      const moduleTriplet = readTriplet(styles, `--module-layer-${i}-module`, moduleFallback);
      const headerTriplet = readTriplet(styles, `--module-layer-${i}-header`, headerFallback);
      if(!hasAnyColor(moduleTriplet) && !hasAnyColor(headerTriplet)) continue;
      const name = readValue(styles, `--module-layer-${i}-name`) || `Unter-Layer ${i}`;
      layers.push({
        id: String(i),
        name,
        module: moduleTriplet,
        header: headerTriplet
      });
    }

    return layers;
  }

  function buildOption(layer){
    const opt = document.createElement('option');
    opt.value = layer.id;
    opt.textContent = layer.name;
    opt.style.backgroundColor = layer.module?.bg || layer.header?.bg || '#0f172a';
    opt.style.color = layer.module?.text || layer.header?.text || '#f8fafc';
    return opt;
  }

  function createLayerCard(layer){
    const card = document.createElement('div');
    card.className = 'ce-layer-card';

    const nameRow = document.createElement('div');
    nameRow.className = 'ce-layer-name';
    const title = document.createElement('div');
    title.textContent = layer.name;
    const badge = document.createElement('span');
    badge.textContent = `#${layer.id}`;
    badge.className = 'ce-chip';
    nameRow.append(title, badge);

    const swatches = document.createElement('div');
    swatches.className = 'ce-swatches';
    swatches.append(
      createSwatch('Modulfläche', layer.module),
      createSwatch('Überschrift', layer.header)
    );

    card.append(nameRow, swatches);
    return card;
  }

  function createSwatch(title, triplet){
    const box = document.createElement('div');
    box.className = 'ce-swatch';

    const heading = document.createElement('div');
    heading.className = 'ce-swatch-title';
    heading.textContent = title;

    const preview = document.createElement('div');
    preview.className = 'ce-swatch-box';
    preview.style.background = triplet?.bg || '#0f172a';
    preview.style.color = triplet?.text || '#e2e8f0';
    preview.style.borderColor = triplet?.border || 'rgba(255,255,255,.14)';

    const bgLine = document.createElement('div');
    bgLine.className = 'ce-swatch-line';
    bgLine.innerHTML = `<span>Hintergrund</span><span>${triplet?.bg || 'n/a'}</span>`;

    const textLine = document.createElement('div');
    textLine.className = 'ce-swatch-line';
    textLine.innerHTML = `<span>Text</span><span>${triplet?.text || 'n/a'}</span>`;

    const borderLine = document.createElement('div');
    borderLine.className = 'ce-swatch-line';
    borderLine.innerHTML = `<span>Rahmen</span><span>${triplet?.border || 'n/a'}</span>`;

    preview.append(bgLine, textLine, borderLine);
    box.append(heading, preview);
    return box;
  }

  function applyLayerToModule(layer, panel){
    if(!layer || !panel) return;
    const module = layer.module || {};
    const header = layer.header || {};
    panel.style.setProperty('--ce-module-bg', module.bg || '#0f172a');
    panel.style.setProperty('--ce-module-text', module.text || '#e2e8f0');
    panel.style.setProperty('--ce-module-border', module.border || 'rgba(148,163,184,.32)');
    panel.style.setProperty('--ce-header-bg', header.bg || module.bg || '#1f2937');
    panel.style.setProperty('--ce-header-text', header.text || module.text || '#f8fafc');
    panel.style.setProperty('--ce-header-border', header.border || header.bg || 'rgba(148,163,184,.45)');
  }

  function loadStoredSelection(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed === 'object') return parsed;
    }catch{}
    return null;
  }

  function persistSelection(selection){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(selection || {})); }catch{}
  }

  function render(root){
    if(!root) return;
    root.innerHTML = '';
    const layers = loadGlobalColorLayers();

    const container = document.createElement('div');
    container.className = 'ce-root';

    const panel = document.createElement('div');
    panel.className = 'ce-panel';

    const header = document.createElement('div');
    header.className = 'ce-header';

    const title = document.createElement('h2');
    title.className = 'ce-title';
    title.innerHTML = '<span>🎨</span><span>ColorExample</span>';

    const legend = document.createElement('div');
    legend.className = 'ce-legend';
    legend.textContent = 'Zeigt die globalen Modul-Layer und wendet eine Auswahl live auf die Vorschau an.';

    header.append(title, legend);

    const controls = document.createElement('div');
    controls.className = 'ce-controls';

    const moduleField = document.createElement('div');
    moduleField.className = 'ce-field';
    const moduleLabel = document.createElement('label');
    moduleLabel.textContent = 'Modul-Layer';
    const moduleSelect = document.createElement('select');
    moduleSelect.className = 'ce-select';
    layers.forEach(layer => moduleSelect.appendChild(buildOption(layer)));
    moduleField.append(moduleLabel, moduleSelect);

    const headerField = document.createElement('div');
    headerField.className = 'ce-field';
    const headerLabel = document.createElement('label');
    headerLabel.textContent = 'Header-Layer';
    const headerSelect = document.createElement('select');
    headerSelect.className = 'ce-select';
    layers.forEach(layer => headerSelect.appendChild(buildOption(layer)));
    headerField.append(headerLabel, headerSelect);

    controls.append(moduleField, headerField);

    const preview = document.createElement('div');
    preview.className = 'ce-preview';
    const previewHeader = document.createElement('div');
    previewHeader.className = 'ce-preview-header';
    previewHeader.innerHTML = '<span>Überschrift</span><span class="ce-chip">Live</span>';
    const previewBody = document.createElement('div');
    previewBody.className = 'ce-preview-body';
    const bodyCard = document.createElement('div');
    bodyCard.className = 'ce-body-card';
    bodyCard.textContent = 'Diese Fläche nutzt die ausgewählten Layer-Farben für Hintergrund, Text und Rahmen.';
    previewBody.append(bodyCard);
    preview.append(previewHeader, previewBody);

    const grid = document.createElement('div');
    grid.className = 'ce-layer-grid';
    if(layers.length){
      layers.forEach(layer => grid.appendChild(createLayerCard(layer)));
    }else{
      const empty = document.createElement('p');
      empty.className = 'ce-empty';
      empty.textContent = 'Keine Layer gefunden. Bitte definiere Farb-Layer in den globalen Einstellungen.';
      grid.appendChild(empty);
    }

    panel.append(header, controls, preview, grid);
    container.appendChild(panel);
    root.appendChild(container);

    const stored = loadStoredSelection();
    if(stored){
      if(stored.module) moduleSelect.value = stored.module;
      if(stored.header) headerSelect.value = stored.header;
    }

    function sync(){
      const moduleLayer = layers.find(l => l.id === moduleSelect.value) || layers[0];
      const headerLayer = layers.find(l => l.id === headerSelect.value) || moduleLayer;
      applyLayerToModule({
        module: moduleLayer?.module,
        header: headerLayer?.header
      }, panel);
      persistSelection({ module: moduleLayer?.id, header: headerLayer?.id });
    }

    moduleSelect.addEventListener('change', sync);
    headerSelect.addEventListener('change', sync);
    sync();
  }

  window.renderColorExample = function renderColorExample(root){
    render(root);
  };
})();
