(function(){
  const STYLE_ID = 'color-example-styles';
  const MAX_LAYERS = 8;

  if(!document.getElementById(STYLE_ID)){
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .cex-root{height:100%;width:100%;padding:.75rem;box-sizing:border-box;display:flex;flex-direction:column;gap:.6rem;}
      .cex-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.5rem;align-items:stretch;}
      .cex-item{padding:.85rem;border-radius:.75rem;border:2px solid var(--cex-border,#e5e7eb);background:var(--cex-bg,#0f172a);color:var(--cex-text,#f8fafc);font-weight:700;text-align:center;box-shadow:0 6px 14px rgba(0,0,0,.12);letter-spacing:.15px;}
      .cex-empty{opacity:.75;font-size:.9rem;}
    `;
    document.head.appendChild(style);
  }

  function readValue(styles, prop){
    return (styles?.getPropertyValue(prop) || '').trim();
  }

  function loadLayers(){
    const root = document.documentElement;
    if(!root) return [];
    const styles = getComputedStyle(root);
    const layers = [];

    const baseModuleBg = readValue(styles, '--module-layer-module-bg') || readValue(styles, '--module-bg');
    const baseModuleText = readValue(styles, '--module-layer-module-text') || readValue(styles, '--text-color');
    const baseModuleBorder = readValue(styles, '--module-layer-module-border') || readValue(styles, '--module-border-color');

    layers.push({
      id: 'primary',
      name: readValue(styles, '--module-layer-name') || 'Standard',
      module: { bg: baseModuleBg, text: baseModuleText, border: baseModuleBorder }
    });

    for(let i = 1; i <= MAX_LAYERS; i += 1){
      const prefix = `--module-layer-${i}`;
      const name = readValue(styles, `${prefix}-name`) || readValue(styles, `${prefix}-name-quoted`);
      const moduleBg = readValue(styles, `${prefix}-module-bg`);
      const moduleText = readValue(styles, `${prefix}-module-text`);
      const moduleBorder = readValue(styles, `${prefix}-module-border`);
      const hasValues = name || moduleBg || moduleText || moduleBorder;
      if(!hasValues) continue;

      layers.push({
        id: String(i),
        name: name || `Unter-Layer ${i}`,
        module: {
          bg: moduleBg || baseModuleBg,
          text: moduleText || baseModuleText,
          border: moduleBorder || baseModuleBorder
        }
      });
    }

    return layers;
  }

  function render(root){
    if(!root) return;
    const layers = loadLayers();
    const container = document.createElement('div');
    container.className = 'cex-root';

    const list = document.createElement('div');
    list.className = 'cex-list';

    if(layers.length){
      layers.forEach(layer => {
        const item = document.createElement('div');
        item.className = 'cex-item';
        item.style.setProperty('--cex-bg', layer.module?.bg || '#0f172a');
        item.style.setProperty('--cex-text', layer.module?.text || '#f8fafc');
        item.style.setProperty('--cex-border', layer.module?.border || 'currentColor');
        item.textContent = layer.name;
        list.appendChild(item);
      });
    }else{
      const empty = document.createElement('div');
      empty.className = 'cex-empty';
      empty.textContent = 'Keine definierten Unter-Layer gefunden.';
      list.appendChild(empty);
    }

    root.innerHTML = '';
    container.appendChild(list);
    root.appendChild(container);
  }

  window.renderColorExample = render;
})();
