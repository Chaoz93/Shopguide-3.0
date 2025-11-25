(function(){
  const STYLE_ID = 'color-example-styles';

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

  function readAppLayers(){
    const layers = Array.isArray(window?.appSettings?.moduleColorLayers)
      ? window.appSettings.moduleColorLayers
      : [];
    return layers.map(layer => layer || {});
  }

  function hasCustomColors(layer){
    if(!layer) return false;
    const colorKeys = ['moduleBg','moduleText','moduleBorder','headerBg','headerText','headerBorder','subBg','subText','subBorder'];
    if(colorKeys.some(key => (layer[key] || '').trim())) return true;
    if(Array.isArray(layer.subLayers)){
      return layer.subLayers.some(sub => ['bg','text','border'].some(k => (sub?.[k] || '').trim()));
    }
    return false;
  }

  function loadLayers(){
    const root = document.documentElement;
    if(!root) return [];
    const styles = getComputedStyle(root);
    const layers = [];

    const baseModuleBg = readValue(styles, '--module-layer-module-bg') || readValue(styles, '--module-bg');
    const baseModuleText = readValue(styles, '--module-layer-module-text') || readValue(styles, '--text-color');
    const baseModuleBorder = readValue(styles, '--module-layer-module-border') || readValue(styles, '--module-border-color');

    const appLayers = readAppLayers();

    if(appLayers.length){
      appLayers.forEach((layer, index) => {
        const defaultName = index === 0 ? 'Standard' : `Unter-Layer ${index + 1}`;
        const name = (layer.name || '').trim() || defaultName;
        const include = index === 0 || name !== defaultName || hasCustomColors(layer);
        if(!include) return;
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
    } else {
      layers.push({
        id: 'primary',
        name: readValue(styles, '--module-layer-name') || 'Standard',
        module: { bg: baseModuleBg, text: baseModuleText, border: baseModuleBorder }
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
