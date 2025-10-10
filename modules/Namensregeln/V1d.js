/* Namensregeln Module
   - Sortable list of prefix+name pairs
   - Add items via modal
   - Options modal to pick/create XLSX and set colors
   - Stores config per instance in localStorage; file handle in IndexedDB
   - Requires: File System Access API + Sortable.js + SheetJS (XLSX)
*/
(function(){
  // ---------- styles ----------
  if(!document.getElementById('naming-rules-styles')){
    const css = `
    .nr-root{height:100%;display:flex;flex-direction:column;gap:.6rem;
      --nr-bg:#f5f7fb; --nr-item-bg:#ffffff; --nr-title:#2563eb; --nr-sub:#4b5563;}
    .nr-titlebar{font-weight:600;color:var(--text-color);padding:0 .15rem;user-select:none}
    .nr-surface{flex:1;background:var(--nr-bg);border-radius:1rem;padding:.75rem;overflow:auto;}
    .nr-list{display:flex;flex-direction:column;gap:.65rem;min-height:1.5rem;}
    .nr-card{background:var(--nr-item-bg);color:var(--nr-sub);border-radius:.8rem;padding:.65rem .75rem;
      box-shadow:0 2px 6px rgba(0,0,0,.06);display:flex;align-items:center;gap:.75rem;user-select:none;}
    .nr-card .nr-title{color:var(--nr-title);font-weight:600;line-height:1.1;}
    .nr-card .nr-sub{color:var(--nr-sub);font-size:.85rem;margin-top:.15rem;}
    .nr-card .nr-flex{flex:1;display:flex;flex-direction:column;}
    .nr-handle{margin-left:.5rem;flex:0 0 auto;width:28px;height:28px;display:flex;align-items:center;justify-content:center;
      border-radius:.45rem;background:rgba(0,0,0,.06);cursor:grab;color:inherit;}
    .nr-handle:active{cursor:grabbing}
    .nr-del{margin-left:.25rem;flex:0 0 auto;width:28px;height:28px;display:flex;align-items:center;justify-content:center;
      border-radius:.45rem;background:rgba(0,0,0,.06);cursor:pointer;color:inherit;}
    .nr-btn{background:var(--button-bg);color:var(--button-text);padding:.35rem .6rem;border-radius:.5rem;font-size:.875rem}
    .nr-btn.secondary{background:rgba(255,255,255,.14);color:var(--text-color);}
    .nr-add{align-self:center;border-radius:9999px;width:2.2rem;height:2.2rem;display:flex;align-items:center;justify-content:center;
      background:var(--button-bg);color:var(--button-text);box-shadow:0 8px 18px rgba(0,0,0,.16);}
    .nr-footer{display:flex;justify-content:center;padding:.25rem 0 .5rem;}
    .nr-modal{position:fixed;inset:0;display:none;place-items:center;background:rgba(0,0,0,.35);z-index:50;}
    .nr-modal.open{display:grid;}
    .nr-panel{background:#fff;color:#111827;width:min(92vw,760px);border-radius:.9rem;padding:1rem;box-shadow:0 10px 30px rgba(0,0,0,.25);}
    .nr-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem;}
    .nr-field label{font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem;}
    .nr-input{width:100%;height:2.25rem;border:1px solid #e5e7eb;border-radius:.5rem;padding:.4rem .55rem;}
    .nr-layer{width:100%;min-height:2.25rem;border:1px solid #e5e7eb;border-radius:.5rem;padding:.4rem .55rem;font-weight:600;
      background:var(--module-bg,#ffffff);color:var(--text-color,#111827);appearance:none;cursor:pointer;
      box-shadow:0 4px 12px rgba(15,23,42,.08);transition:box-shadow .15s ease,transform .12s ease;}
    .nr-layer:focus{outline:2px solid var(--module-border-color,#2563eb);outline-offset:2px;box-shadow:0 0 0 3px rgba(37,99,235,.2);
      transform:translateY(-1px);}
    .nr-row{display:flex;gap:.5rem;align-items:center;}
    .nr-file{font-size:.85rem;opacity:.85;}
    @media(max-width:840px){.nr-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
    @media(max-width:520px){.nr-grid{grid-template-columns:1fr;}}
    .nr-ghost{opacity:.4}
    .nr-chosen{transform:scale(1.01)}
    .nr-menu{position:fixed;z-index:1000;display:none;min-width:180px;padding:.25rem;
      background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);
      border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);}
    .nr-menu.open{display:block}
    .nr-menu .mi{display:block;width:100%;padding:.5rem .75rem;text-align:left;border-radius:.4rem;}
    .nr-menu .mi:hover{background:rgba(0,0,0,.06)}
    `;
    const tag=document.createElement('style');tag.id='naming-rules-styles';tag.textContent=css;document.head.appendChild(tag);
  }

  // ---------- utils ----------
  const LS_DOC='namingRulesDoc';
  const IDB_NAME='modulesApp';
  const IDB_STORE='fs-handles';
  const GLOBAL_NAME_KEY='globalNameRules';
  const GLOBAL_DOC='module_data_v1';
  const parse=(s,fb)=>{try{return JSON.parse(s)??fb;}catch{return fb;}};
  const loadDoc=()=>parse(localStorage.getItem(LS_DOC),{__meta:{v:1},instances:{}});
  const saveDoc=(doc)=>{doc.__meta={v:1,updatedAt:new Date().toISOString()};localStorage.setItem(LS_DOC,JSON.stringify(doc));};
  const loadGlobal=()=>parse(localStorage.getItem(GLOBAL_DOC),{__meta:{v:1},general:{},instances:{}});
  const saveGlobal=(doc)=>{doc.__meta={v:1,updatedAt:new Date().toISOString()};localStorage.setItem(GLOBAL_DOC,JSON.stringify(doc));};
  const instanceIdOf=root=>root.closest('.grid-stack-item')?.dataset?.instanceId||('inst-'+Math.random().toString(36).slice(2));
  const debounce=(ms,fn)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};

  function getCfg(id){const doc=loadDoc();return doc.instances[id]||null;}
  function saveCfg(id,cfg){const doc=loadDoc();doc.instances[id]=cfg;saveDoc(doc);} 
  function removeCfg(id){const doc=loadDoc();delete doc.instances[id];saveDoc(doc);} 

  function idbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open(IDB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(IDB_STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
  async function idbSet(k,v){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function idbGet(k){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readonly');const rq=tx.objectStore(IDB_STORE).get(k);rq.onsuccess=()=>res(rq.result||null);rq.onerror=()=>rej(rq.error);});}
  async function idbDel(k){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).delete(k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function ensureRWPermission(handle){if(!handle?.queryPermission)return true;const q=await handle.queryPermission({mode:'readwrite'});if(q==='granted')return true;const r=await handle.requestPermission({mode:'readwrite'});return r==='granted';}

  async function saveGlobalName(h,name){try{await idbSet(GLOBAL_NAME_KEY,h);}catch{}const g=loadGlobal();g.general ||= {};g.general.nameFileName=name;saveGlobal(g);}

  // SheetJS loader
  async function ensureXLSX(){
    if(window.XLSX)return;
    if(window.__XLSX_LOAD_PROMISE__)return window.__XLSX_LOAD_PROMISE__;
    const urls=[
      'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
      'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js',
      'https://unpkg.com/xlsx@0.20.2/dist/xlsx.full.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.2/xlsx.full.min.js'
    ];
    window.__XLSX_LOAD_PROMISE__=(async()=>{
      let lastErr;for(const url of urls){try{await new Promise((res,rej)=>{const s=document.createElement('script');s.src=url;s.async=true;s.onload=res;s.onerror=rej;document.head.appendChild(s);});return;}catch(e){lastErr=e;}}throw lastErr;})();
    return window.__XLSX_LOAD_PROMISE__;
  }

  // read/write
  async function readItemsFromHandle(handle){
    await ensureXLSX();
    const f=await handle.getFile();
    if(f.size===0)return [];
    const buf=await f.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const ws=wb.Sheets['Rules']||wb.Sheets[wb.SheetNames[0]];
    if(!ws)return [];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:''});
    const data=rows.slice(1).filter(r=>r.length&& (r[0]!==''||r[1]!==''));
    return data.map((r,i)=>({id:'it-'+i+'-'+Date.now().toString(36),prefix:String(r[0]||''),name:String(r[1]||'')}));
  }
  async function writeItemsToHandle(handle,items){
    await ensureXLSX();
    const wb=XLSX.utils.book_new();
    const aoa=[['Prefix','Name'],...items.map(it=>[it.prefix,it.name])];
    const ws=XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb,ws,'Rules');
    const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    const w=await handle.createWritable();
    await w.write(new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    await w.close();
  }

  const MAX_COLOR_LAYERS=15;
  const CONTRAST_LIGHT_TEXT='#ffffff';
  const CONTRAST_DARK_TEXT='#111827';
  const FALLBACK_MODULE_BG='#f5f7fb';
  const FALLBACK_ITEM_BG='#ffffff';
  const FALLBACK_TITLE='#2563eb';
  const FALLBACK_SUB='#4b5563';

  const clampNumber=(value,min,max)=>Math.min(Math.max(value,min),max);
  const parseNumberFromString=value=>{if(typeof value!=='string')return null;const match=value.trim().match(/-?\d+(?:\.\d+)?/);return match?parseFloat(match[0]):null;};
  const parseHue=value=>{const num=parseNumberFromString(value);return Number.isFinite(num)?num:null;};
  const parsePercent=value=>{const num=parseNumberFromString(value);return Number.isFinite(num)?clampNumber(num,0,100):null;};
  const parseAlpha=value=>{const num=parseNumberFromString(value);return Number.isFinite(num)?clampNumber(num,0,1):null;};

  function formatHsla(h,s,l,a){
    const hue=Number.isFinite(h)?h:0;
    const sat=Number.isFinite(s)?s:0;
    const lig=Number.isFinite(l)?l:0;
    const alp=Number.isFinite(a)?a:1;
    return `hsla(${hue}, ${sat}%, ${lig}%, ${alp})`;
  }

  function loadGlobalColorLayers(){
    const layers=[];
    try{
      const root=document.documentElement;
      if(!root)return layers;
      const styles=getComputedStyle(root);
      for(let i=1;i<=MAX_COLOR_LAYERS;i+=1){
        const h=styles.getPropertyValue(`--layer${i}-h`).trim();
        const s=styles.getPropertyValue(`--layer${i}-s`).trim();
        const l=styles.getPropertyValue(`--layer${i}-l`).trim();
        const a=styles.getPropertyValue(`--layer${i}-a`).trim();
        const hue=parseHue(h);
        const sat=parsePercent(s);
        const lig=parsePercent(l);
        const alp=parseAlpha(a);
        if(Number.isFinite(hue)||Number.isFinite(sat)||Number.isFinite(lig)||Number.isFinite(alp)){
          layers.push({
            id:`layer${i}`,
            label:`Unter-Layer ${i}`,
            h:Number.isFinite(hue)?hue:null,
            s:Number.isFinite(sat)?sat:null,
            l:Number.isFinite(lig)?lig:null,
            a:Number.isFinite(alp)?alp:1,
            hsla:formatHsla(hue??0,sat??0,lig??0,alp??1)
          });
        }
      }
    }catch(err){console.warn('Unter-Layer konnten nicht geladen werden',err);}
    if(!layers.length){
      layers.push({id:'layer1',label:'Unter-Layer 1',h:null,s:null,l:null,a:1,hsla:formatHsla(210,65,46,1)});
    }
    return layers;
  }

  function computeLayerTextColor(layer,fallback=CONTRAST_LIGHT_TEXT){
    if(!layer)return fallback;
    if(Number.isFinite(layer.l))return layer.l>=58?CONTRAST_DARK_TEXT:CONTRAST_LIGHT_TEXT;
    return fallback;
  }

  function populateLayerDropdown(selectEl,layers=loadGlobalColorLayers()){
    if(!selectEl)return;
    selectEl.innerHTML='';
    layers.forEach(layer=>{
      const opt=document.createElement('option');
      opt.value=layer.id;
      opt.textContent=layer.label||layer.id;
      if(layer.hsla){
        opt.style.backgroundColor=layer.hsla;
        opt.style.color=computeLayerTextColor(layer,CONTRAST_LIGHT_TEXT);
      }
      selectEl.appendChild(opt);
    });
  }

  function getLayerData(layers,id){if(!Array.isArray(layers))return null;return layers.find(layer=>layer&&layer.id===id)||null;}
  function getLayerColor(layers,id){const layer=getLayerData(layers,id);return layer?.hsla||null;}

  function adjustLayerLightness(layer,delta){
    if(!layer||!Number.isFinite(layer.l))return null;
    const next=clampNumber(layer.l+delta,0,100);
    return formatHsla(Number.isFinite(layer.h)?layer.h:0,Number.isFinite(layer.s)?layer.s:0,next,Number.isFinite(layer.a)?layer.a:1);
  }

  function readAppSettings(){
    try{const raw=localStorage.getItem('appSettings');if(!raw)return{};const parsed=JSON.parse(raw);return parsed&&typeof parsed==='object'?parsed:{};}catch{return{};}}

  function mutateAppSettings(mutator){
    if(typeof mutator!=='function')return;
    const stored=readAppSettings();
    const target={...stored};
    mutator(target);
    try{localStorage.setItem('appSettings',JSON.stringify(target));}catch{}
    if(typeof window==='object'&&window&&typeof window.appSettings==='object'){
      mutator(window.appSettings);
    }else if(typeof window==='object'){
      window.appSettings={...target};
    }
    return target;
  }

  function readModuleColorSettings(instanceId){
    const settings=readAppSettings();
    if(!settings||typeof settings!=='object')return null;
    const modules=settings.modules;
    if(!modules||typeof modules!=='object')return null;
    const entry=modules[instanceId];
    if(!entry||typeof entry!=='object')return null;
    const colors=entry.colors;
    if(!colors||typeof colors!=='object')return null;
    return {...colors};
  }

  // ---------- UI ----------
  function buildUI(root){
    root.innerHTML=`
      <div class="nr-root">
        <div class="nr-titlebar" style="display:none"></div>
        <div class="nr-surface"><div class="nr-list"></div></div>
        <div class="nr-footer"><button class="nr-add" title="Neues Item">＋</button></div>
      </div>
      <div class="nr-modal nr-options">
        <div class="nr-panel">
          <div class="nr-row" style="justify-content:space-between;margin-bottom:.5rem">
            <div class="font-semibold">Namensregeln – Optionen</div>
            <button class="nr-btn secondary nr-close">Schließen</button>
          </div>
          <div class="nr-grid">
            <div class="nr-field" style="grid-column:span 3;">
              <label>Datei</label>
              <div class="nr-row">
                <button class="nr-btn nr-pick">Excel wählen</button>
                <button class="nr-btn secondary nr-create">Excel erstellen</button>
                <span class="nr-file"></span>
              </div>
            </div>
            <div class="nr-field" style="grid-column:span 3;">
              <label>Titel (optional)</label>
              <input type="text" class="nr-input nr-title-input" placeholder="Kein Titel">
            </div>
            <div class="nr-field">
              <label>Hauptmodul</label>
              <select class="nr-layer nr-layer-module" data-target="module"></select>
            </div>
            <div class="nr-field">
              <label>Header</label>
              <select class="nr-layer nr-layer-header" data-target="header"></select>
            </div>
            <div class="nr-field">
              <label>Buttons</label>
              <select class="nr-layer nr-layer-buttons" data-target="buttons"></select>
            </div>
          </div>
          <div class="nr-row" style="justify-content:flex-end;margin-top:.75rem">
            <button class="nr-btn nr-save">Speichern</button>
          </div>
        </div>
      </div>
      <div class="nr-modal nr-add-modal">
        <div class="nr-panel">
          <div class="nr-row" style="justify-content:space-between;margin-bottom:.5rem">
            <div class="font-semibold">Neues Item</div>
            <button class="nr-btn secondary nr-add-close">Schließen</button>
          </div>
          <div class="nr-grid" style="grid-template-columns:1fr;">
            <div class="nr-field">
              <label>Prefix</label>
              <input type="text" class="nr-input nr-add-prefix" />
            </div>
            <div class="nr-field">
              <label>Name</label>
              <input type="text" class="nr-input nr-add-name" />
            </div>
          </div>
          <div class="nr-row" style="justify-content:flex-end;margin-top:.75rem">
            <button class="nr-btn nr-add-save">Speichern</button>
          </div>
        </div>
      </div>
    `;
    const menu=document.createElement('div');
    menu.className='nr-menu';
    menu.innerHTML=`<button class="mi mi-opt">⚙️ Optionen</button>`;
    document.body.appendChild(menu);
    return {
      rootVars:root.querySelector('.nr-root'),
      titlebar:root.querySelector('.nr-titlebar'),
      list:root.querySelector('.nr-list'),
      add:root.querySelector('.nr-add'),
      modal:root.querySelector('.nr-options'),
      close:root.querySelector('.nr-close'),
      pick:root.querySelector('.nr-pick'),
      create:root.querySelector('.nr-create'),
      save:root.querySelector('.nr-save'),
      fLabel:root.querySelector('.nr-file'),
      cModule:root.querySelector('.nr-layer-module'),
      cHeader:root.querySelector('.nr-layer-header'),
      cButtons:root.querySelector('.nr-layer-buttons'),
      titleInput:root.querySelector('.nr-title-input'),
      addModal:root.querySelector('.nr-add-modal'),
      addClose:root.querySelector('.nr-add-close'),
      addSave:root.querySelector('.nr-add-save'),
      addPrefix:root.querySelector('.nr-add-prefix'),
      addName:root.querySelector('.nr-add-name'),
      menu
    };
  }

  function cardEl(item){
    const el=document.createElement('div');
    el.className='nr-card';
    el.dataset.id=item.id;
    el.innerHTML=`<div class="nr-flex"><div class="nr-title">${escapeHtml(item.prefix)}</div><div class="nr-sub">${escapeHtml(item.name)}</div></div><div class="nr-handle" title="Ziehen">⋮⋮</div><button class="nr-del" title="Löschen">✕</button>`;
    return el;
  }
  const escapeHtml=s=>s.replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));

  // ---------- main render ----------
  window.renderNamingRules=function(root,ctx){
    if(!('showOpenFilePicker' in window)||!('showSaveFilePicker' in window)){
      root.innerHTML='<div class="p-2 text-sm">Dieses Modul benötigt die File System Access API (Chromium).</div>';
      return;
    }
    const els=buildUI(root);
    const instanceId=instanceIdOf(root);
    const colorSelects=[els.cModule,els.cHeader,els.cButtons].filter(Boolean);
    let colorLayers=loadGlobalColorLayers();
    const isColorSelection=value=>value&&typeof value==='object'&&!Array.isArray(value)&&('module' in value||'header' in value||'buttons' in value);

    let cfg=getCfg(instanceId)||{};
    if(!cfg||typeof cfg!=='object')cfg={};
    const storedColorSelection=readModuleColorSettings(instanceId);
    const initialColorSource=isColorSelection(storedColorSelection)?storedColorSelection:(isColorSelection(cfg.colors)?cfg.colors:{});
    cfg.colors={...initialColorSource};
    cfg.title=typeof cfg.title==='string'?cfg.title:'';

    function sanitizeColorSelection(raw){
      const fallback=colorLayers[0]?.id||'layer1';
      const ensureId=(value,fb)=>{if(typeof value==='string'&&colorLayers.some(layer=>layer.id===value))return value;return fb;};
      const moduleId=ensureId(raw?.module,fallback);
      const headerId=ensureId(raw?.header,moduleId);
      const buttonsId=ensureId(raw?.buttons,headerId);
      return{module:moduleId,header:headerId,buttons:buttonsId};
    }

    const sanitizedInitialColors=sanitizeColorSelection(cfg.colors);
    const initialColorsChanged=JSON.stringify(cfg.colors)!==JSON.stringify(sanitizedInitialColors);
    cfg.colors=sanitizedInitialColors;

    function styleLayerSelect(select){
      if(!select)return;
      const layer=getLayerData(colorLayers,select.value);
      if(layer){
        select.style.backgroundColor=layer.hsla;
        select.style.color=computeLayerTextColor(layer,CONTRAST_LIGHT_TEXT);
      }else{
        select.style.backgroundColor='';
        select.style.color='';
      }
    }

    function syncLayerSelectOptions(){
      colorSelects.forEach(select=>{
        populateLayerDropdown(select,colorLayers);
        const target=select?.dataset?.target;
        if(target&&cfg.colors[target])select.value=cfg.colors[target];
        styleLayerSelect(select);
      });
    }

    function persistModuleColorSelection(selection=cfg.colors){
      const sanitized=sanitizeColorSelection(selection);
      mutateAppSettings(settings=>{
        if(!settings.modules||typeof settings.modules!=='object')settings.modules={};
        const entry=(settings.modules[instanceId]&&typeof settings.modules[instanceId]==='object')?settings.modules[instanceId]:{};
        entry.colors={...sanitized};
        settings.modules[instanceId]=entry;
      });
    }

    function applyColorsFromSelection(){
      cfg.colors=sanitizeColorSelection(cfg.colors);
      const moduleLayer=getLayerData(colorLayers,cfg.colors.module);
      const headerLayer=getLayerData(colorLayers,cfg.colors.header)||moduleLayer;
      const buttonLayer=getLayerData(colorLayers,cfg.colors.buttons)||headerLayer||moduleLayer;
      const moduleBg=getLayerColor(colorLayers,cfg.colors.module)||FALLBACK_MODULE_BG;
      const headerBg=getLayerColor(colorLayers,cfg.colors.header)||moduleBg||FALLBACK_ITEM_BG;
      const buttonColor=getLayerColor(colorLayers,cfg.colors.buttons)||FALLBACK_TITLE;
      const subColor=adjustLayerLightness(buttonLayer,buttonLayer? (buttonLayer.l>=58?-20:22):0)||FALLBACK_SUB;
      const moduleText=computeLayerTextColor(moduleLayer,CONTRAST_DARK_TEXT);
      if(els.rootVars){
        const style=els.rootVars.style;
        style.setProperty('--nr-bg',moduleBg||FALLBACK_MODULE_BG);
        style.setProperty('--nr-item-bg',headerBg||FALLBACK_ITEM_BG);
        style.setProperty('--nr-title',buttonColor||FALLBACK_TITLE);
        style.setProperty('--nr-sub',subColor||FALLBACK_SUB);
        style.setProperty('--text-color',moduleText);
      }
      colorSelects.forEach(styleLayerSelect);
    }

    function refreshModuleColors({persist=true,repopulate=true}={}){
      const before=JSON.stringify(cfg.colors);
      colorLayers=loadGlobalColorLayers();
      cfg.colors=sanitizeColorSelection(cfg.colors);
      if(repopulate)syncLayerSelectOptions();
      applyColorsFromSelection();
      if(persist&&JSON.stringify(cfg.colors)!==before){
        persistModuleColorSelection();
        saveCfg(instanceId,cfg);
      }
    }

    persistModuleColorSelection();
    const g=loadGlobal().general||{};
    cfg.idbKey=cfg.idbKey||('nr-'+instanceId);
    cfg.fileName=cfg.fileName||g.nameFileName||'';
    if(initialColorsChanged)saveCfg(instanceId,cfg);
    let fileHandle=null;
    let items=[];

    function applyTitle(t){els.titlebar.textContent=t;els.titlebar.style.display=t?'':'none';}
    applyColorsFromSelection();
    syncLayerSelectOptions();
    applyTitle(cfg.title);

    function renderList(){els.list.innerHTML='';items.forEach(it=>els.list.appendChild(cardEl(it)));}
    function reorderFromDOM(){const order=Array.from(els.list.children).map(el=>el.dataset.id);items.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));}
    const scheduleSave=debounce(500,()=>{if(fileHandle)writeItemsToHandle(fileHandle,items);});

    const sortable=Sortable.create(els.list,{handle:'.nr-handle',animation:150,ghostClass:'nr-ghost',chosenClass:'nr-chosen',group:{name:'nr-'+instanceId,pull:false,put:false},onSort:()=>{reorderFromDOM();scheduleSave();}});
    els.list.addEventListener('click',e=>{const btn=e.target.closest('.nr-del');if(!btn)return;const card=btn.closest('.nr-card');const id=card.dataset.id;items=items.filter(it=>it.id!==id);card.remove();scheduleSave();});

    // add modal
    function openAdd(){els.addModal.classList.add('open');els.addPrefix.value='';els.addName.value='';}
    function closeAdd(){els.addModal.classList.remove('open');}
    els.add.addEventListener('click',openAdd);
    els.addClose.addEventListener('click',closeAdd);
    els.addSave.addEventListener('click',()=>{
      const prefix=(els.addPrefix.value||'').trim();
      const name=(els.addName.value||'').trim();
      if(!prefix&&!name){closeAdd();return;}
      const it={id:'it-'+Math.random().toString(36).slice(2),prefix,name};
      items.push(it);els.list.appendChild(cardEl(it));scheduleSave();closeAdd();
    });
    [els.addPrefix,els.addName].forEach(inp=>inp.addEventListener('keydown',e=>{if(e.key==='Enter')els.addSave.click();}));

    // options modal
    function openModal(){
      els.modal.classList.add('open');
      els.titleInput.value=cfg.title;
      colorSelects.forEach(select=>{
        const target=select?.dataset?.target;
        if(target&&cfg.colors[target])select.value=cfg.colors[target];
        styleLayerSelect(select);
      });
    }
    function closeModal(){els.modal.classList.remove('open');}
    els.save.addEventListener('click',()=>{
      cfg.title=els.titleInput.value||'';
      applyTitle(cfg.title);
      saveCfg(instanceId,cfg);
      closeModal();
    });
    colorSelects.forEach(select=>{
      select?.addEventListener('change',()=>{
        const target=select?.dataset?.target;
        if(!target)return;
        cfg.colors={...cfg.colors,[target]:select.value};
        cfg.colors=sanitizeColorSelection(cfg.colors);
        styleLayerSelect(select);
        applyColorsFromSelection();
        persistModuleColorSelection();
        saveCfg(instanceId,cfg);
      });
    });
    els.close.addEventListener('click',closeModal);

    // file pick/create
    els.pick.addEventListener('click',pickExcel);
    els.create.addEventListener('click',createExcel);
    async function pickExcel(){try{const [h]=await window.showOpenFilePicker({types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}]});if(!h)return;if(await ensureRWPermission(h)){fileHandle=h;cfg.fileName=h.name;saveCfg(instanceId,cfg);await idbSet(cfg.idbKey,h);await saveGlobalName(h,cfg.fileName);items=await readItemsFromHandle(h);renderList();els.fLabel.textContent='• '+(cfg.fileName||h.name);}}catch(e){console.warn('pickExcel',e);}}
    async function createExcel(){try{const h=await window.showSaveFilePicker({suggestedName:'naming-rules.xlsx',types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}]});if(await ensureRWPermission(h)){fileHandle=h;cfg.fileName=h.name;saveCfg(instanceId,cfg);await idbSet(cfg.idbKey,h);await saveGlobalName(h,cfg.fileName);items=[];await writeItemsToHandle(h,items);renderList();els.fLabel.textContent='• '+(cfg.fileName||h.name);}}catch(e){console.warn('createExcel',e);}}

    // context menu
    function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
    root.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();const m=els.menu;const pad=8;const vw=window.innerWidth,vh=window.innerHeight;const w=200,h=44;m.style.left=clamp(e.clientX,pad,vw-w-pad)+'px';m.style.top=clamp(e.clientY,pad,vh-h-pad)+'px';m.classList.add('open');});
    els.menu.querySelector('.mi-opt').addEventListener('click',()=>{els.menu.classList.remove('open');openModal();});
    window.addEventListener('click',()=>els.menu.classList.remove('open'));
    window.addEventListener('keydown',e=>{if(e.key==='Escape')els.menu.classList.remove('open');});

    const handleSubLayerUpdate=()=>refreshModuleColors({persist:true,repopulate:true});
    const handleAppSettingsStorage=e=>{
      if(e.key==='appSettings'){
        const stored=readModuleColorSettings(instanceId);
        if(stored)cfg.colors=sanitizeColorSelection(stored);
        refreshModuleColors({persist:false,repopulate:true});
      }
    };
    window.addEventListener('shopguide:sub-layers-updated',handleSubLayerUpdate);
    window.addEventListener('storage',handleAppSettingsStorage);

    // restore previous handle + items
    (async()=>{try{let h=await idbGet(cfg.idbKey);if(!h){h=await idbGet(GLOBAL_NAME_KEY);if(h){await idbSet(cfg.idbKey,h);if(!cfg.fileName){const gg=loadGlobal().general||{};cfg.fileName=gg.nameFileName||h.name||'';saveCfg(instanceId,cfg);} }}if(h&&await ensureRWPermission(h)){fileHandle=h;items=await readItemsFromHandle(h);renderList();els.fLabel.textContent='• '+(cfg.fileName||h.name);}}catch(e){console.warn('Restore failed',e);}})();

    // cleanup when removed
    const mo=new MutationObserver(()=>{if(!document.body.contains(root)){try{sortable.destroy();}catch{};els.menu?.remove();window.removeEventListener('shopguide:sub-layers-updated',handleSubLayerUpdate);window.removeEventListener('storage',handleAppSettingsStorage);(async()=>{try{await idbDel(cfg.idbKey);}catch{};try{removeCfg(instanceId);}catch{};})();mo.disconnect();}});
    mo.observe(document.body,{childList:true,subtree:true});
  };
})();
