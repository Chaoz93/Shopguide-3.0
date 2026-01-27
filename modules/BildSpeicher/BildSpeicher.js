(function(){
  const STYLE_ID = 'bildspeicher-styles';
  const STORAGE_KEY = 'bildspeicher-data-v1';

  if(!document.getElementById(STYLE_ID)){
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .bs-root{height:100%;width:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:.75rem;padding:.85rem;border-radius:.85rem;border:1px solid var(--bs-main-border,rgba(148,163,184,.5));background:var(--bs-main-bg,rgba(15,23,42,.7));color:var(--bs-main-text,#f8fafc);font-family:inherit;}
      .bs-header{display:flex;justify-content:space-between;gap:.75rem;align-items:flex-start;}
      .bs-title{font-weight:700;font-size:1rem;}
      .bs-sub{font-size:.85rem;opacity:.78;}
      .bs-palettes{display:flex;flex-wrap:wrap;gap:.35rem;justify-content:flex-end;}
      .bs-palette{padding:.2rem .55rem;border-radius:999px;font-size:.7rem;font-weight:600;border:1px solid var(--bs-chip-border,currentColor);background:var(--bs-chip-bg,transparent);color:var(--bs-chip-text,currentColor);}
      .bs-upload{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;padding:.65rem;border-radius:.6rem;border:1px dashed var(--bs-alt-border,rgba(148,163,184,.6));background:var(--bs-alt-bg,rgba(30,41,59,.6));}
      .bs-upload-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.45rem .8rem;border-radius:.55rem;border:1px solid var(--bs-accent-border,rgba(251,191,36,.6));background:var(--bs-accent-bg,rgba(251,191,36,.2));color:var(--bs-accent-text,#fbbf24);font-weight:600;cursor:pointer;}
      .bs-upload-btn input{display:none;}
      .bs-clear-btn{display:inline-flex;align-items:center;gap:.35rem;padding:.45rem .75rem;border-radius:.55rem;border:1px solid var(--bs-main-border,rgba(148,163,184,.6));background:transparent;color:var(--bs-main-text,#f8fafc);font-weight:600;cursor:pointer;}
      .bs-status{min-height:1.1rem;font-size:.78rem;opacity:.8;}
      .bs-preview{flex:1;display:flex;align-items:center;justify-content:center;border-radius:.6rem;border:1px solid var(--bs-alt-border,rgba(148,163,184,.35));background:var(--bs-alt-bg,rgba(30,41,59,.4));padding:.35rem;overflow:hidden;}
      .bs-preview img{max-width:100%;max-height:100%;object-fit:contain;border-radius:.45rem;}
      .bs-placeholder{text-align:center;font-size:.85rem;opacity:.7;}
      .bs-meta{font-size:.72rem;opacity:.75;}
    `;
    document.head.appendChild(style);
  }

  function readValue(styles, prop){
    return (styles?.getPropertyValue(prop) || '').trim();
  }

  function readAppLayers(){
    const layers = Array.isArray(window?.appSettings?.moduleColorLayers)
      ? window.appSettings.moduleColorLayers
      : [];
    return layers.map(layer => layer || {});
  }

  function loadLayers(){
    const root = document.documentElement;
    if(!root) return [];
    const styles = getComputedStyle(root);
    const layers = [];

    const baseModuleBg = readValue(styles, '--module-layer-module-bg') || readValue(styles, '--module-bg');
    const baseModuleText = readValue(styles, '--module-layer-module-text') || readValue(styles, '--text-color');
    const baseModuleBorder = readValue(styles, '--module-layer-module-border') || readValue(styles, '--module-border-color');

    const presets = ['Main', 'Alternative', 'Accent'];
    const appLayers = readAppLayers();

    if(appLayers.length){
      appLayers.slice(0, presets.length).forEach((layer, index) => {
        const defaultName = presets[index] || `Layer ${index + 1}`;
        const name = (layer.name || '').trim() || defaultName;
        layers.push({
          id: layer.id || (index === 0 ? 'primary' : String(index)),
          name,
          module: {
            bg: (layer.moduleBg || '').trim() || baseModuleBg,
            text: (layer.moduleText || '').trim() || baseModuleText,
            border: (layer.moduleBorder || '').trim() || baseModuleBorder
          }
        });
      });
    }

    if(!layers.length){
      const cssLayers = [];
      for(let i=1;i<=presets.length;i+=1){
        const name = readValue(styles, `--module-layer-${i}-name`) || presets[i-1];
        const bg = readValue(styles, `--module-layer-${i}-module-bg`);
        const text = readValue(styles, `--module-layer-${i}-module-text`);
        const border = readValue(styles, `--module-layer-${i}-module-border`);
        if(name || bg || text || border){
          cssLayers.push({
            id: i === 1 ? 'primary' : String(i),
            name,
            module: {
              bg: bg || baseModuleBg,
              text: text || baseModuleText,
              border: border || baseModuleBorder
            }
          });
        }
      }
      if(cssLayers.length){
        layers.push(...cssLayers);
      }
    }

    if(!layers.length){
      layers.push({
        id: 'primary',
        name: readValue(styles, '--module-layer-name') || presets[0],
        module: { bg: baseModuleBg, text: baseModuleText, border: baseModuleBorder }
      });
    }

    return layers;
  }

  function getInstanceIdFrom(root){
    return root.closest('.grid-stack-item')?.dataset?.instanceId || ('inst-' + Math.random().toString(36).slice(2));
  }

  function safeParse(raw){
    try { return JSON.parse(raw); } catch { return null; }
  }

  function nowIso(){
    return new Date().toISOString();
  }

  function baseDoc(){
    return { __meta: { version: 1, updatedAt: nowIso() }, instances: {} };
  }

  function readDoc(){
    if(typeof localStorage === 'undefined') return baseDoc();
    return safeParse(localStorage.getItem(STORAGE_KEY)) || baseDoc();
  }

  function writeDoc(doc){
    if(typeof localStorage === 'undefined') return false;
    doc.__meta = { version: 1, updatedAt: nowIso() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
      return true;
    } catch(err){
      console.warn('BildSpeicher: Speichern fehlgeschlagen', err);
      return false;
    }
  }

  function formatBytes(bytes){
    if(!Number.isFinite(bytes)) return '';
    if(bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if(kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  function renderPaletteChips(container, layers){
    container.innerHTML = '';
    if(!layers.length) return;
    layers.forEach(layer => {
      const chip = document.createElement('span');
      chip.className = 'bs-palette';
      chip.textContent = layer.name;
      chip.style.setProperty('--bs-chip-bg', layer.module?.bg || 'transparent');
      chip.style.setProperty('--bs-chip-text', layer.module?.text || 'currentColor');
      chip.style.setProperty('--bs-chip-border', layer.module?.border || 'currentColor');
      container.appendChild(chip);
    });
  }

  function applyPaletteVars(root, layers){
    const main = layers[0] || layers[1] || layers[2] || {};
    const alt = layers[1] || main;
    const accent = layers[2] || main;

    root.style.setProperty('--bs-main-bg', main?.module?.bg || '');
    root.style.setProperty('--bs-main-text', main?.module?.text || '');
    root.style.setProperty('--bs-main-border', main?.module?.border || '');

    root.style.setProperty('--bs-alt-bg', alt?.module?.bg || '');
    root.style.setProperty('--bs-alt-text', alt?.module?.text || '');
    root.style.setProperty('--bs-alt-border', alt?.module?.border || '');

    root.style.setProperty('--bs-accent-bg', accent?.module?.bg || '');
    root.style.setProperty('--bs-accent-text', accent?.module?.text || '');
    root.style.setProperty('--bs-accent-border', accent?.module?.border || '');
  }

  function render(root, ctx){
    const layers = loadLayers();
    const instanceId = getInstanceIdFrom(root);
    const title = ctx?.moduleJson?.name || 'Bildspeicher';

    root.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'bs-root';

    container.innerHTML = `
      <div class="bs-header">
        <div>
          <div class="bs-title"></div>
          <div class="bs-sub">Bild auswählen, lokal speichern und wieder anzeigen.</div>
        </div>
        <div class="bs-palettes"></div>
      </div>
      <div class="bs-upload">
        <label class="bs-upload-btn">
          Bild wählen
          <input class="bs-file" type="file" accept="image/*" />
        </label>
        <button class="bs-clear-btn" type="button">Entfernen</button>
        <div class="bs-meta"></div>
      </div>
      <div class="bs-status"></div>
      <div class="bs-preview">
        <div class="bs-placeholder">Noch kein Bild gespeichert.</div>
        <img class="bs-image" alt="" />
      </div>
    `;

    root.appendChild(container);

    const titleEl = container.querySelector('.bs-title');
    const paletteEl = container.querySelector('.bs-palettes');
    const fileInput = container.querySelector('.bs-file');
    const clearBtn = container.querySelector('.bs-clear-btn');
    const statusEl = container.querySelector('.bs-status');
    const metaEl = container.querySelector('.bs-meta');
    const imgEl = container.querySelector('.bs-image');
    const placeholderEl = container.querySelector('.bs-placeholder');

    if(titleEl) titleEl.textContent = title;
    applyPaletteVars(container, layers);
    renderPaletteChips(paletteEl, layers);

    let doc = readDoc();
    doc.instances ||= {};

    function setStatus(text){
      if(statusEl) statusEl.textContent = text || '';
    }

    function setMeta(entry){
      if(!metaEl) return;
      if(!entry){
        metaEl.textContent = '';
        return;
      }
      const pieces = [];
      if(entry.name) pieces.push(entry.name);
      if(entry.size) pieces.push(formatBytes(entry.size));
      if(entry.updatedAt) pieces.push(new Date(entry.updatedAt).toLocaleString('de-DE'));
      metaEl.textContent = pieces.join(' · ');
    }

    function updatePreview(entry){
      if(!entry?.dataUrl){
        if(imgEl) imgEl.removeAttribute('src');
        if(placeholderEl) placeholderEl.style.display = 'block';
        setMeta(null);
        return;
      }
      if(imgEl){
        imgEl.src = entry.dataUrl;
      }
      if(placeholderEl) placeholderEl.style.display = 'none';
      setMeta(entry);
    }

    function loadInitial(){
      const entry = doc.instances[instanceId] || null;
      updatePreview(entry);
    }

    function persist(entry){
      doc.instances[instanceId] = entry;
      const ok = writeDoc(doc);
      if(!ok){
        setStatus('Speichern fehlgeschlagen (lokaler Speicher).');
      }else{
        setStatus('Bild gespeichert.');
      }
    }

    function handleFile(file){
      if(!file) return;
      setStatus('Lade Bild…');
      const reader = new FileReader();
      reader.onload = () => {
        const entry = {
          dataUrl: reader.result,
          name: file.name,
          type: file.type,
          size: file.size,
          updatedAt: nowIso()
        };
        updatePreview(entry);
        persist(entry);
      };
      reader.onerror = () => {
        console.warn('BildSpeicher: FileReader Fehler', reader.error);
        setStatus('Bild konnte nicht gelesen werden.');
      };
      reader.readAsDataURL(file);
    }

    function clearImage(){
      if(doc.instances[instanceId]){
        delete doc.instances[instanceId];
        writeDoc(doc);
      }
      updatePreview(null);
      setStatus('Bild entfernt.');
    }

    if(fileInput){
      fileInput.addEventListener('change', (event) => {
        const file = event.target?.files?.[0];
        handleFile(file);
        if(event.target) event.target.value = '';
      });
    }

    if(clearBtn){
      clearBtn.addEventListener('click', () => clearImage());
    }

    loadInitial();
  }

  window.renderBildSpeicher = render;
})();
