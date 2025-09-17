/* Gerätedaten
 * - Excel pick/create with configurable fields
 * - Fields can be reordered and toggled via Sortable list in options
 * - Manual column count option replaces previous automatic layout
 * - Requires FS Access API (Chromium); auto-loads xlsx from CDN.
 */
(function(){
  // ----- styles -----
  const CSS = `
  .rs-root{height:100%;display:flex;flex-direction:column;gap:.6rem;position:relative}
  .rs-head{font-weight:700;font-size:1.35rem;text-align:center;margin:.2rem 0 .2rem;user-select:none;color:var(--text-color)}
  .rs-form{flex:1;overflow:auto;padding:.25rem .1rem .1rem .1rem;scrollbar-width:none;-ms-overflow-style:none;display:flex;flex-direction:column;gap:.6rem}
  .rs-form::-webkit-scrollbar{width:0;height:0;display:none}
  .rs-searchwrap{padding:0 .25rem}
  .rs-search{width:100%;padding:.35rem .55rem;border-radius:.45rem;border:1px solid var(--module-border-color);background:rgba(255,255,255,.08);color:var(--text-color);font-size:.9rem}
  .rs-grid{display:grid;gap:.9rem}
  .rs-field{display:flex;flex-direction:column;gap:.35rem;padding:.65rem .6rem;border-radius:.75rem;border:1px solid transparent;background:rgba(255,255,255,.04);transition:border-color .2s ease,background .2s ease}
  .rs-field.rs-group-base{border-color:#3b82f6}
  .rs-field.rs-group-extra{border-color:#9ca3af}
  .rs-field.rs-group-aspen{border-color:#10b981}
  .rs-label{font-weight:600;opacity:.95;color:var(--text-color)}
  .rs-inputwrap{display:grid;grid-template-columns:auto 38px;align-items:center}
  .rs-input{width:100%;background:rgba(255,255,255,.08);border:1px solid var(--module-border-color);color:var(--text-color);padding:.45rem .55rem;border-radius:.4rem}
  .rs-copy{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid var(--module-border-color);border-radius:.35rem;background:rgba(255,255,255,.08);cursor:pointer;color:var(--text-color)}
  .rs-copy:active{transform:scale(.98)}
  .rs-note{font-size:.85rem;opacity:.75;margin-top:.15rem;color:var(--text-color)}
  .rs-footer{display:flex;justify-content:space-between;align-items:center;padding:0 .25rem .4rem;color:var(--text-color);font-size:.8rem;gap:.5rem}
  .rs-aspen-status{opacity:.7}
  .rs-autosave{position:absolute;bottom:.45rem;right:.55rem;width:14px;height:14px;border-radius:50%;border:2px solid rgba(0,0,0,.35);box-shadow:0 0 6px rgba(0,0,0,.25)}
  .rs-autosave.clean{background:#16a34a}
  .rs-autosave.dirty{background:#dc2626}
  .rs-input.rs-delta{background:rgba(250,204,21,.18);border-color:#facc15}
  .rs-field.hidden-by-search{display:none}
  .rs-item{display:flex;align-items:center;justify-content:space-between;padding:.35rem .55rem;margin-bottom:.3rem;border:1px solid #d1d5db;border-radius:.4rem;background:#f9fafb;color:#111827;gap:.5rem;cursor:grab}
  .rs-item.off{opacity:.55;background:#f3f4f6}
  .rs-item .rs-item-info{display:flex;align-items:center;gap:.45rem}
  .rs-item .rs-item-actions{display:flex;align-items:center;gap:.6rem;font-size:.8rem}
  .rs-item .rs-item-actions label{display:flex;align-items:center;gap:.25rem;cursor:pointer}
  .rs-item .rs-fav-indicator{color:#facc15;font-size:1rem}
  .db-menu{position:absolute;z-index:60;min-width:220px;background:#fff;color:#111827;border-radius:.6rem;box-shadow:0 14px 30px rgba(15,23,42,.2);padding:.35rem .4rem;display:none;flex-direction:column;gap:.35rem}
  .db-menu.open{display:flex}
  .rs-menu-section{border-top:1px solid #e5e7eb;padding-top:.35rem;margin-top:.35rem}
  .rs-menu-section:first-child{border-top:none;padding-top:0;margin-top:0}
  .rs-menu-title{font-weight:600;font-size:.85rem;margin-bottom:.2rem}
  .rs-menu-actions button{width:100%;text-align:left;padding:.32rem .45rem;border:none;background:transparent;border-radius:.35rem;cursor:pointer;font-size:.85rem}
  .rs-menu-actions button:hover{background:#e5e7eb}
  .rs-menu-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.2rem}
  .rs-menu-item{display:flex;align-items:center;justify-content:space-between;gap:.4rem;padding:.3rem .35rem;border:1px solid #e5e7eb;border-radius:.35rem;background:#f9fafb;cursor:grab}
  .rs-menu-item.off{opacity:.55;background:#f3f4f6}
  .rs-menu-item .rs-menu-label{display:flex;align-items:center;gap:.35rem;font-size:.85rem}
  .rs-menu-item input[type="checkbox"]{cursor:pointer}
  .rs-menu-item .rs-menu-actions{display:flex;align-items:center;gap:.4rem;font-size:.75rem}
  .rs-menu-item .rs-fav-toggle{display:flex;align-items:center;gap:.25rem}
  .rs-menu-item .rs-fav-indicator{color:#facc15;font-size:.95rem}
  `;
  (function inject(){
    let tag=document.getElementById('record-sheet-styles');
    if(!tag){tag=document.createElement('style');tag.id='record-sheet-styles';document.head.appendChild(tag);} 
    tag.textContent=CSS;
  })();

  // ----- utilities -----
  const BASE_FIELD_KEYS=['meldung','auftrag','part','serial'];
  const EXTRA_FIELD_KEYS=['repairorder','comments','status'];
  const FIELD_INFO={
    meldung:{label:'Meldung'},
    auftrag:{label:'Auftrag'},
    part:{label:'P/N'},
    serial:{label:'S/N'},
    repairorder:{label:'Repair Order'},
    comments:{label:'Kommentare'},
    status:{label:'Status'}
  };
  const GROUP_LABEL={base:'Basisfeld',extra:'Zusatzfeld',aspen:'Aspen-Importfeld'};
  const ASPEN_GROUP_MATCH=/aspen/i;

  function fieldGroup(key){
    if(BASE_FIELD_KEYS.includes(key)) return 'base';
    if(EXTRA_FIELD_KEYS.includes(key)) return 'extra';
    if(ASPEN_GROUP_MATCH.test(key)) return 'aspen';
    return 'extra';
  }
  function labelFromKey(key){
    if(FIELD_INFO[key]?.label) return FIELD_INFO[key].label;
    return key.replace(/_/g,' ').replace(/\b\w/g,s=>s.toUpperCase());
  }
  function tooltipForField(field){
    const group=fieldGroup(field.key);
    const base=`${field.label||labelFromKey(field.key)}`;
    const suffix=GROUP_LABEL[group]||'Feld';
    return `${base} – ${suffix}`+(field.favorite?' (Favorit)':'');
  }
  const LS_DOC='module_data_v1';
  const IDB_NAME='modulesApp';
  const IDB_STORE='fs-handles';
  const SHEET_NAME='records';
  const WATCH_INTERVAL=300;
  const ASPEN_POLL=300000; // 5 Minuten

  const parse=(s,fb)=>{try{return JSON.parse(s)||fb;}catch{return fb;}};
  const loadDoc=()=>parse(localStorage.getItem(LS_DOC),{__meta:{v:1},general:{},instances:{}});
  const saveDoc=(doc)=>{doc.__meta={v:1,updatedAt:new Date().toISOString()};localStorage.setItem(LS_DOC,JSON.stringify(doc));};
  const getDocString=()=>localStorage.getItem(LS_DOC)||'';
  const instanceIdOf=root=>root.closest('.grid-stack-item')?.dataset?.instanceId||('inst-'+Math.random().toString(36).slice(2));
  const debounce=(ms,fn)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};

  function idbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open(IDB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(IDB_STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
  async function idbSet(k,v){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function idbGet(k){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readonly');const rq=tx.objectStore(IDB_STORE).get(k);rq.onsuccess=()=>res(rq.result||null);rq.onerror=()=>rej(rq.error);});}
  async function idbDel(k){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).delete(k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function ensureRWPermission(handle){if(!handle?.queryPermission)return true;const q=await handle.queryPermission({mode:'readwrite'});if(q==='granted')return true;const r=await handle.requestPermission({mode:'readwrite'});return r==='granted';}
  async function ensureRPermission(handle){if(!handle?.queryPermission)return true;const q=await handle.queryPermission({mode:'read'});if(q==='granted')return true;const r=await handle.requestPermission({mode:'read'});return r==='granted';}

  async function ensureXLSX(){
    if(window.XLSX) return;
    if(window.__XLSX_LOAD_PROMISE__) return window.__XLSX_LOAD_PROMISE__;
    const urls=[
      'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
      'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js',
      'https://unpkg.com/xlsx@0.20.2/dist/xlsx.full.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.2/xlsx.full.min.js'
    ];
    window.__XLSX_LOAD_PROMISE__=(async()=>{
      let last;for(const url of urls){try{await new Promise((ok,err)=>{const s=document.createElement('script');s.src=url;s.async=true;s.onload=ok;s.onerror=()=>err(new Error('load '+url));document.head.appendChild(s);});if(window.XLSX) return;}catch(e){last=e;}}
      throw last||new Error('XLSX load failed');
    })();
    return window.__XLSX_LOAD_PROMISE__;
  }

  let HEAD=[];
  async function readAll(handle){
    await ensureXLSX();
    const f=await handle.getFile();
    if(f.size===0) return [];
    const buf=await f.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const ws=wb.Sheets[SHEET_NAME]||wb.Sheets[wb.SheetNames[0]];
    if(!ws) return [];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    const hdr=rows[0]?.map(h=>String(h||'').toLowerCase().trim())||[];
    const idx=Object.fromEntries(HEAD.map(h=>[h,hdr.indexOf(h)]));
    return rows.slice(1).map(r=>{const o={};HEAD.forEach(k=>o[k]=String(r[idx[k]]??''));return o;}).filter(row=>HEAD.some(k=>row[k]!==''));
  }
  async function writeAll(handle,rows){
    await ensureXLSX();
    const wb=XLSX.utils.book_new();
    const aoa=[HEAD,...rows.map(r=>HEAD.map(k=>r[k]||''))];
    const ws=XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb,ws,SHEET_NAME);
    const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    const w=await handle.createWritable();
    await w.write(new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    await w.close();
  }

  async function readRulesFromHandle(handle){
    await ensureXLSX();
    const f=await handle.getFile();
    if(f.size===0)return[];
    const buf=await f.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const ws=wb.Sheets['Rules']||wb.Sheets[wb.SheetNames[0]];
    if(!ws)return[];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    return rows.slice(1).filter(r=>r.length&&(r[0]!==''||r[1]!==''))
      .map(r=>({prefix:String(r[0]||''),name:String(r[1]||'')}))
      .sort((a,b)=>b.prefix.length-a.prefix.length);
  }

  function buildUI(root){
    root.innerHTML=`
      <div class="rs-root">
        <div class="rs-head" style="display:none"></div>
        <div class="rs-form">
          <div class="rs-searchwrap"><input class="rs-search" type="search" placeholder="Felder durchsuchen..." /></div>
          <div class="rs-grid"></div>
          <div class="rs-note"></div>
        </div>
        <div class="rs-footer">
          <div class="rs-aspen-status">Zuletzt aktualisiert: –</div>
        </div>
        <div class="rs-autosave clean" title="Auto-Save Status"></div>
      </div>
      <div class="db-modal rs-modal" style="position:fixed;inset:0;display:none;place-items:center;background:rgba(0,0,0,.35);z-index:50;">
        <div class="db-panel" style="background:#fff;color:#111827;width:min(92vw,720px);border-radius:.9rem;padding:1rem;">
          <div class="db-row" style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.5rem">
            <div class="font-semibold">Gerätedaten – Optionen</div>
            <button class="db-btn secondary rs-close" style="background:#eee;border-radius:.5rem;padding:.35rem .6rem">Schließen</button>
          </div>
          <div class="db-field">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Excel-Datei</label>
            <div class="db-row" style="display:flex;gap:.5rem;align-items:center">
              <button class="db-btn rs-pick" style="background:var(--button-bg);color:var(--button-text);border-radius:.5rem;padding:.35rem .6rem">Excel wählen</button>
              <button class="db-btn rs-create" style="background:rgba(0,0,0,.08);border-radius:.5rem;padding:.35rem .6rem">Excel erstellen</button>
              <span class="rs-file db-file"></span>
            </div>
          </div>
          <div class="db-field" style="margin-top:1rem;">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Namensregeln</label>
            <div class="db-row" style="display:flex;gap:.5rem;align-items:center">
              <button class="db-btn rs-rule-pick" style="background:var(--button-bg);color:var(--button-text);border-radius:.5rem;padding:.35rem .6rem">Excel wählen</button>
              <span class="rs-rule-file db-file"></span>
            </div>
          </div>
          <div class="db-field" style="margin-top:1rem;">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Aspen-Datei</label>
            <div class="db-row" style="display:flex;gap:.5rem;align-items:center">
              <button class="db-btn rs-aspen-pick" style="background:var(--button-bg);color:var(--button-text);border-radius:.5rem;padding:.35rem .6rem">Excel wählen</button>
              <span class="rs-aspen-file db-file"></span>
            </div>
          </div>
          <div class="db-field" style="margin-top:1rem;">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Felder</label>
            <ul class="rs-list" style="list-style:none;margin:0;padding:0;"></ul>
            <div style="font-size:.8rem;opacity:.7;margin-top:.25rem;">Klicken zum Aktivieren/Deaktivieren, ziehen zum Sortieren.</div>
          </div>
          <div class="db-field" style="margin-top:1rem;">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Spalten</label>
            <input type="number" min="1" max="6" class="rs-cols" style="width:4rem;padding:.25rem .4rem;border:1px solid #ccc;border-radius:.25rem;" />
          </div>
          <div class="db-field" style="margin-top:1rem;">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Presets</label>
            <div style="display:flex;flex-direction:column;gap:.45rem;">
              <select class="rs-preset-select" style="padding:.35rem .5rem;border-radius:.45rem;border:1px solid #d1d5db;font-size:.9rem;"></select>
              <div style="display:flex;gap:.45rem;align-items:center;flex-wrap:wrap;">
                <input type="text" class="rs-preset-name" placeholder="Neuer Preset-Name" style="flex:1 1 160px;padding:.35rem .5rem;border-radius:.45rem;border:1px solid #d1d5db;font-size:.9rem;" />
                <button class="db-btn rs-preset-save" style="background:rgba(59,130,246,.12);color:#1d4ed8;border-radius:.5rem;padding:.35rem .6rem;">Speichern</button>
                <button class="db-btn secondary rs-preset-delete" style="background:#f3f4f6;border-radius:.5rem;padding:.35rem .6rem;">Löschen</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    const menu=document.createElement('div');
    menu.className='db-menu';
    menu.innerHTML=`
      <div class="rs-menu-actions">
        <button class="mi mi-opt">⚙️ Optionen</button>
        <button class="mi mi-base">Alle Basisfelder aktivieren</button>
        <button class="mi mi-ps">Nur Part &amp; Serial</button>
        <button class="mi mi-min">Minimalansicht</button>
      </div>
      <div class="rs-menu-section" data-section="base">
        <div class="rs-menu-title">Basisfelder</div>
        <ul class="rs-menu-list" data-group="base"></ul>
      </div>
      <div class="rs-menu-section" data-section="extra">
        <div class="rs-menu-title">Zusatzfelder</div>
        <ul class="rs-menu-list" data-group="extra"></ul>
      </div>
      <div class="rs-menu-section" data-section="aspen">
        <div class="rs-menu-title">Aspen</div>
        <ul class="rs-menu-list" data-group="aspen"></ul>
      </div>
    `;
    document.body.appendChild(menu);
    return {
      grid:root.querySelector('.rs-grid'),
      note:root.querySelector('.rs-note'),
      modal:root.querySelector('.rs-modal'),
      mClose:root.querySelector('.rs-close'),
      mPick:root.querySelector('.rs-pick'),
      mCreate:root.querySelector('.rs-create'),
      head:root.querySelector('.rs-head'),
      mFile:root.querySelector('.rs-file'),
      mRulePick:root.querySelector('.rs-rule-pick'),
      mRuleFile:root.querySelector('.rs-rule-file'),
      mAspenPick:root.querySelector('.rs-aspen-pick'),
      mAspenFile:root.querySelector('.rs-aspen-file'),
      mList:root.querySelector('.rs-list'),
      mCols:root.querySelector('.rs-cols'),
      mPresetSelect:root.querySelector('.rs-preset-select'),
      mPresetName:root.querySelector('.rs-preset-name'),
      mPresetSave:root.querySelector('.rs-preset-save'),
      mPresetDelete:root.querySelector('.rs-preset-delete'),
      search:root.querySelector('.rs-search'),
      aspenStatus:root.querySelector('.rs-aspen-status'),
      autoSave:root.querySelector('.rs-autosave'),
      menu
    };
  }

  // ----- main -----
  window.renderRecordSheet=function(root,ctx){
    if(!('showOpenFilePicker' in window)||!('showSaveFilePicker' in window)){
      root.innerHTML=`<div class="p-2 text-sm">Dieses Modul benötigt die File System Access API (Chromium).</div>`;
      return;
    }

    const defaults=ctx?.moduleJson?.settings||{};
    const defaultFieldDefs=Array.isArray(defaults.fields)&&defaults.fields.length?defaults.fields:[
      {key:'meldung',label:'Meldung',enabled:true},
      {key:'auftrag',label:'Auftrag',enabled:true},
      {key:'part',label:'P/N',enabled:true},
      {key:'serial',label:'S/N',enabled:true}
    ];
    const defaultFields=defaultFieldDefs
      .filter(f=>f&&f.key)
      .map(f=>({key:f.key,label:f.label||labelFromKey(f.key),enabled:f.enabled!==false,favorite:!!f.favorite}));
    const defaultColumns=defaults.columns||2;
    const builtinPresetTemplates={
      Standard:{fields:defaultFields.filter(f=>f.enabled).map(f=>f.key),columns:defaultColumns},
      Reparaturansicht:{fields:['meldung','auftrag','part','serial','repairorder','status','comments'],columns:2},
      Minimal:{fields:['meldung','auftrag'],columns:1}
    };

    const els=buildUI(root);
    const instanceId=instanceIdOf(root);
    const idbKey=`recordSheet:${instanceId}`;
    const ruleIdbKey=`recordSheetRules:${instanceId}`;
    const aspenIdbKey=`recordSheetAspen:${instanceId}`;
    if(els.search)els.search.addEventListener('input',applyFieldFilter);

    function normalizeFieldEntry(field){
      if(!field||!field.key) return null;
      const label=field.label||labelFromKey(field.key);
      const favorite=!!field.favorite;
      const enabled=favorite?true:field.enabled!==false;
      return {key:field.key,label,favorite,enabled};
    }
    function cloneFields(list){
      const seen=new Set();
      const result=[];
      (Array.isArray(list)?list:[]).forEach(f=>{
        const nf=normalizeFieldEntry(f);
        if(!nf||seen.has(nf.key)) return;
        seen.add(nf.key);
        result.push(nf);
      });
      defaultFields.forEach(f=>{
        if(seen.has(f.key)) return;
        const nf=normalizeFieldEntry(f);
        if(nf){seen.add(nf.key);result.push(nf);}
      });
      BASE_FIELD_KEYS.forEach(key=>{
        if(seen.has(key)) return;
        const nf=normalizeFieldEntry({key,label:labelFromKey(key),enabled:key==='meldung'||key==='auftrag'});
        if(nf){seen.add(key);result.push(nf);} 
      });
      return result;
    }
    function clonePresets(presets){
      const out={};
      if(presets&&typeof presets==='object'){
        for(const [name,val] of Object.entries(presets)){
          if(!name) continue;
          if(!val||typeof val!=='object') continue;
          const fields=Array.isArray(val.fields)?val.fields.filter(Boolean):[];
          const columns=Math.max(1,parseInt(val.columns)||1);
          out[name]={fields,columns};
        }
      }
      return out;
    }
    function ensureFavoritePlacement(list){
      list.forEach(f=>{if(f.favorite)f.enabled=true;});
      const favs=list.filter(f=>f.favorite);
      const rest=list.filter(f=>!f.favorite);
      return [...favs,...rest];
    }
    function loadCfg(){
      const doc=loadDoc();
      const raw=doc?.instances?.[instanceId]?.recordSheet||{};
      const fields=ensureFavoritePlacement(cloneFields(Array.isArray(raw.fields)?raw.fields:defaultFields));
      return{
        idbKey:raw.idbKey||idbKey,
        fileName:raw.fileName||'',
        ruleIdbKey:raw.ruleIdbKey||ruleIdbKey,
        ruleFileName:raw.ruleFileName||'',
        aspenIdbKey:raw.aspenIdbKey||aspenIdbKey,
        aspenFileName:raw.aspenFileName||'',
        fields,
        columns:raw.columns||defaultColumns,
        presets:clonePresets(raw.presets),
        activePreset:raw.activePreset||''
      };
    }
    function serializeFields(fields){return fields.map(f=>({key:f.key,label:f.label,favorite:!!f.favorite,enabled:!!f.enabled}));}
    function saveCfg(current){
      const doc=loadDoc();
      doc.instances||={};
      doc.instances[instanceId]||={};
      doc.instances[instanceId].recordSheet={
        idbKey:current.idbKey,
        fileName:current.fileName,
        ruleIdbKey:current.ruleIdbKey,
        ruleFileName:current.ruleFileName,
        aspenIdbKey:current.aspenIdbKey,
        aspenFileName:current.aspenFileName,
        fields:serializeFields(current.fields),
        columns:current.columns,
        presets:clonePresets(current.presets),
        activePreset:current.activePreset||''
      };
      saveDoc(doc);
      cfgSignature=snapshotConfig(current);
    }
    const snapshotConfig=data=>{
      const presetsObj=clonePresets(data.presets);
      const presetEntries=Object.entries(presetsObj).sort((a,b)=>a[0].localeCompare(b[0],'de'));
      return JSON.stringify({
        fields:serializeFields(data.fields||[]),
        columns:data.columns,
        presets:presetEntries,
        activePreset:data.activePreset||'',
        fileName:data.fileName||'',
        ruleFileName:data.ruleFileName||'',
        aspenFileName:data.aspenFileName||''
      });
    };
    function removeCfg(){const doc=loadDoc();if(doc?.instances?.[instanceId]){delete doc.instances[instanceId].recordSheet;if(!Object.keys(doc.instances[instanceId]).length)delete doc.instances[instanceId];saveDoc(doc);}}

    let cfg=loadCfg();
    let cfgSignature=snapshotConfig(cfg);
    els.mFile.textContent=cfg.fileName?`• ${cfg.fileName}`:'Keine Datei gewählt';
    els.mRuleFile.textContent=cfg.ruleFileName?`• ${cfg.ruleFileName}`:'Keine Namensregeln';
    els.mAspenFile.textContent=cfg.aspenFileName?`• ${cfg.aspenFileName}`:'Keine Aspen-Datei';
    els.head.style.display='none';
    HEAD=cfg.fields.map(f=>f.key);
    let handle=null;
    let ruleHandle=null;
    let aspenHandle=null;
    let aspenRows=[];
    let aspenTimer=null;
    let aspenLast=0;
    let aspenUpdatedAt=0;
    let rules=[];
    let cache=[];
    let currentAspenRow=null;
    let autoSaveDirty=false;
    let saveToken=0;
    let modalSortable=null;
    let menuSortables=[];
    updateAutoSaveIndicator();
    updateAspenStatus();

    const setNote=s=>els.note.textContent=s||'';
    const copy=async val=>{try{await navigator.clipboard.writeText(val||'');setNote('Kopiert.');setTimeout(()=>setNote(''),800);}catch{setNote('Kopieren fehlgeschlagen');}};

    let fieldEls={};
    const lookupName=pn=>{for(const r of rules){if(pn.startsWith(r.prefix))return r.name;}return'';};
    function updateName(){if(!rules.length){els.head.style.display='none';return;}const pn=fieldEls['part']?.input?.value?.trim()||'';const name=lookupName(pn);els.head.style.display='block';els.head.textContent=name||'Unbekanntes Gerät';}
    function applyColumns(){const cols=Math.max(1,parseInt(cfg.columns)||1);els.grid.style.gridTemplateColumns=`repeat(${cols},1fr)`;}
    function renderFields(){
      HEAD=cfg.fields.map(f=>f.key);
      els.grid.innerHTML='';fieldEls={};
      cfg.fields.filter(f=>f.enabled).forEach(f=>{
        const group=fieldGroup(f.key);
        const wrap=document.createElement('div');
        const tooltip=tooltipForField(f);
        wrap.className=`rs-field rs-group-${group}`;
        wrap.dataset.key=f.key;
        wrap.dataset.label=(f.label||'').toLowerCase();
        wrap.title=tooltip;
        wrap.innerHTML=`<label class="rs-label" title="${tooltip}">${f.label}</label><div class="rs-inputwrap"><input class="rs-input" type="text" ${f.key==='meldung'?'readonly':''}/><button class="rs-copy" title="Kopieren">⧉</button></div>`;
        const input=wrap.querySelector('input');
        const btn=wrap.querySelector('.rs-copy');
        btn.addEventListener('click',()=>copy(input.value));
        input.addEventListener('input',()=>{
          if(f.key!=='meldung'){putField(f.key,input.value);if(f.key==='part')updateName();}
          updateAspenDeltas();
        });
        els.grid.appendChild(wrap);
        fieldEls[f.key]={input,wrap,label:f.label||labelFromKey(f.key),group};
      });
      applyColumns();
      refreshFromCache();
      applyFieldFilter();
      updateAspenDeltas();
    }

    function renderFieldList(){
      const list=els.mList;list.innerHTML='';
      if(modalSortable){modalSortable.destroy();modalSortable=null;}
      cfg.fields.forEach(f=>{
        const li=document.createElement('li');
        li.className='rs-item'+(f.enabled?'':' off');
        li.dataset.key=f.key;
        li.innerHTML=`<div class="rs-item-info"><span class="rs-fav-indicator" style="${f.favorite?'':'visibility:hidden'}">★</span><span>${f.label}</span></div><div class="rs-item-actions"><label><input type="checkbox" class="rs-item-fav" ${f.favorite?'checked':''}/> Favorit</label><label><input type="checkbox" class="rs-item-toggle" ${f.enabled?'checked':''} ${f.favorite?'disabled':''}/> Sichtbar</label></div>`;
        const favToggle=li.querySelector('.rs-item-fav');
        const visToggle=li.querySelector('.rs-item-toggle');
        favToggle.addEventListener('change',()=>{
          f.favorite=favToggle.checked;
          if(f.favorite) f.enabled=true;
          cfg.fields=ensureFavoritePlacement(cfg.fields);
          cfg.activePreset='';
          saveCfg(cfg);
          renderFields();
          renderMenuFields();
          renderFieldList();
          if(els.modal.style.display==='grid')populatePresetSelect();
        });
        visToggle.addEventListener('change',()=>{
          if(f.favorite){visToggle.checked=true;return;}
          f.enabled=visToggle.checked;
          li.classList.toggle('off',!f.enabled);
          cfg.activePreset='';
          saveCfg(cfg);
          renderFields();
          renderMenuFields();
          if(els.modal.style.display==='grid')populatePresetSelect();
        });
        list.appendChild(li);
      });
      modalSortable=new Sortable(list,{animation:150,handle:'.rs-item-info',onEnd:()=>{const order=Array.from(list.children).map(li=>li.dataset.key);reorderFields(order);cfg.activePreset='';saveCfg(cfg);renderFields();renderMenuFields();renderFieldList();if(els.modal.style.display==='grid')populatePresetSelect();}});
    }

    function reorderFields(orderKeys){
      const keys=Array.isArray(orderKeys)?orderKeys:[];
      const map=new Map(cfg.fields.map(f=>[f.key,f]));
      const ordered=[];
      keys.forEach(key=>{const entry=map.get(key);if(entry&&!ordered.includes(entry))ordered.push(entry);});
      cfg.fields.forEach(f=>{if(!keys.includes(f.key))ordered.push(f);});
      cfg.fields=ensureFavoritePlacement(ordered);
    }

    function renderMenuFields(){
      const lists={
        base:els.menu.querySelector('[data-group="base"]'),
        extra:els.menu.querySelector('[data-group="extra"]'),
        aspen:els.menu.querySelector('[data-group="aspen"]')
      };
      const sections={
        base:els.menu.querySelector('[data-section="base"]'),
        extra:els.menu.querySelector('[data-section="extra"]'),
        aspen:els.menu.querySelector('[data-section="aspen"]')
      };
      menuSortables.forEach(s=>s.destroy());
      menuSortables=[];
      Object.values(lists).forEach(list=>{if(list)list.innerHTML='';});
      const groupOrder=['base','extra','aspen'];
      cfg.fields.forEach(f=>{
        const group=fieldGroup(f.key);
        const target=lists[group]||lists.extra;
        if(!target) return;
        const li=document.createElement('li');
        li.className='rs-menu-item'+(f.enabled?'':' off');
        li.dataset.key=f.key;
        li.innerHTML=`<div class="rs-menu-label"><span class="rs-fav-indicator" style="${f.favorite?'':'visibility:hidden'}">★</span><span>${f.label}</span></div><div class="rs-menu-actions"><label class="rs-fav-toggle"><input type="checkbox" ${f.favorite?'checked':''}/> Favorit</label><label><input type="checkbox" class="rs-menu-toggle" ${f.enabled?'checked':''} ${f.favorite?'disabled':''}/> Aktiv</label></div>`;
        const fav=li.querySelector('.rs-fav-toggle input');
        const toggle=li.querySelector('.rs-menu-toggle');
        fav.addEventListener('change',()=>{
          f.favorite=fav.checked;
          if(f.favorite)f.enabled=true;
          cfg.fields=ensureFavoritePlacement(cfg.fields);
          cfg.activePreset='';
          saveCfg(cfg);
          renderFields();
          renderFieldList();
          renderMenuFields();
          if(els.modal.style.display==='grid')populatePresetSelect();
        });
        toggle.addEventListener('change',()=>{
          if(f.favorite){toggle.checked=true;return;}
          f.enabled=toggle.checked;
          li.classList.toggle('off',!f.enabled);
          cfg.activePreset='';
          saveCfg(cfg);
          renderFields();
          renderFieldList();
          if(els.modal.style.display==='grid')populatePresetSelect();
        });
        target.appendChild(li);
      });
      groupOrder.forEach(group=>{
        const section=sections[group];
        const list=lists[group];
        if(!section||!list) return;
        section.style.display=list.children.length?'block':'none';
      });
      const orderedLists=groupOrder.map(g=>lists[g]).filter(Boolean);
      orderedLists.forEach(list=>{
        const sortable=new Sortable(list,{animation:120,handle:'.rs-menu-label',onEnd:()=>{
          const order=[];
          orderedLists.forEach(l=>{order.push(...Array.from(l.children).map(li=>li.dataset.key));});
          reorderFields(order);
          cfg.activePreset='';
          saveCfg(cfg);
          renderFields();
          renderFieldList();
          renderMenuFields();
          if(els.modal.style.display==='grid')populatePresetSelect();
        }});
        menuSortables.push(sortable);
      });
    }

    function applyFieldFilter(){
      if(!els.search)return;
      const term=(els.search.value||'').trim().toLowerCase();
      Object.values(fieldEls).forEach(info=>{
        if(!info?.wrap)return;
        const label=(info.label||'').toLowerCase();
        const match=!term||label.includes(term);
        info.wrap.classList.toggle('hidden-by-search',!match);
      });
    }

    function updateAutoSaveIndicator(){
      if(!els.autoSave)return;
      els.autoSave.classList.toggle('dirty',autoSaveDirty);
      els.autoSave.classList.toggle('clean',!autoSaveDirty);
      els.autoSave.title=autoSaveDirty?'Änderungen nicht gespeichert':'Alle Änderungen gespeichert';
    }

    function setDirty(state){
      autoSaveDirty=!!state;
      updateAutoSaveIndicator();
    }

    function updateAspenDeltas(){
      Object.entries(fieldEls).forEach(([key,info])=>{
        const input=info?.input; if(!input) return;
        const aspenVal=currentAspenRow?String(currentAspenRow[key]??'').trim():'';
        const current=(input.value||'').trim();
        if(currentAspenRow && aspenVal && current!==aspenVal){
          input.classList.add('rs-delta');
        }else{
          input.classList.remove('rs-delta');
        }
      });
    }

    function updateAspenStatus(){
      if(!els.aspenStatus)return;
      if(aspenUpdatedAt){
        const dt=new Date(aspenUpdatedAt);
        els.aspenStatus.textContent=`Zuletzt aktualisiert: ${dt.toLocaleString()}`;
      }else{
        els.aspenStatus.textContent='Zuletzt aktualisiert: –';
      }
    }

    function getPresetByName(name){
      if(!name) return null;
      if(cfg.presets?.[name]) return cfg.presets[name];
      if(builtinPresetTemplates[name]) return builtinPresetTemplates[name];
      return null;
    }

    function safePresetName(name){
      let trimmed=(name||'').trim();
      if(!trimmed) return '';
      if(builtinPresetTemplates[trimmed]) trimmed+=' (Benutzer)';
      return trimmed;
    }

    function populatePresetSelect(){
      if(!els.mPresetSelect)return;
      const select=els.mPresetSelect;
      select.innerHTML='';
      const placeholder=document.createElement('option');
      placeholder.value='';
      placeholder.textContent='Preset wählen...';
      select.appendChild(placeholder);
      const builtinGroup=document.createElement('optgroup');
      builtinGroup.label='Standard';
      Object.keys(builtinPresetTemplates).forEach(name=>{
        const opt=document.createElement('option');
        opt.value=name;
        opt.textContent=name;
        builtinGroup.appendChild(opt);
      });
      select.appendChild(builtinGroup);
      const customNames=Object.keys(cfg.presets||{}).sort((a,b)=>a.localeCompare(b,'de'));
      if(customNames.length){
        const customGroup=document.createElement('optgroup');
        customGroup.label='Benutzerdefiniert';
        customNames.forEach(name=>{
          const opt=document.createElement('option');
          opt.value=name;
          opt.textContent=name;
          customGroup.appendChild(opt);
        });
        select.appendChild(customGroup);
      }
      if(cfg.activePreset&&getPresetByName(cfg.activePreset)){
        select.value=cfg.activePreset;
      }else{
        select.value='';
      }
      if(els.mPresetDelete){
        const isCustom=!!cfg.presets?.[select.value];
        els.mPresetDelete.disabled=!isCustom;
      }
    }

    function applyPresetDefinition(def,{name,remember}={}){
      if(!def) return;
      const keys=Array.from(new Set(Array.isArray(def.fields)?def.fields.filter(Boolean):[]));
      const map=new Map(cfg.fields.map(f=>[f.key,f]));
      keys.forEach(key=>{
        if(!map.has(key)){
          const created=normalizeFieldEntry({key,label:labelFromKey(key),enabled:true});
          if(created){cfg.fields.push(created);map.set(key,created);}
        }
      });
      cfg.fields.forEach(f=>{
        if(f.favorite){f.enabled=true;return;}
        f.enabled=keys.includes(f.key);
      });
      reorderFields(keys);
      if(def.columns){const cols=Math.max(1,parseInt(def.columns)||1);cfg.columns=cols;}
      if(remember&&name){cfg.activePreset=name;}
      saveCfg(cfg);
      els.mCols.value=cfg.columns;
      renderFields();
      renderFieldList();
      renderMenuFields();
      applyColumns();
      if(remember)populatePresetSelect();
    }

    function applyPreset(name){
      const def=getPresetByName(name);
      if(!def)return;
      applyPresetDefinition(def,{name,remember:true});
    }

    function activateBaseFields(){
      cfg.fields.forEach(f=>{if(fieldGroup(f.key)==='base')f.enabled=true;});
      cfg.fields=ensureFavoritePlacement(cfg.fields);
      cfg.activePreset='';
      saveCfg(cfg);
      renderFields();
      renderFieldList();
      renderMenuFields();
      if(els.modal.style.display==='grid')populatePresetSelect();
    }

    function showOnlyFields(keys,columns){
      applyPresetDefinition({fields:keys,columns},{});
      cfg.activePreset='';
      saveCfg(cfg);
      if(els.modal.style.display==='grid')populatePresetSelect();
    }

    function refreshConfigFromStorage(){
      const latest=loadCfg();
      const sig=snapshotConfig(latest);
      if(sig===cfgSignature) return;
      cfg=latest;
      cfgSignature=sig;
      els.mFile.textContent=cfg.fileName?`• ${cfg.fileName}`:'Keine Datei gewählt';
      els.mRuleFile.textContent=cfg.ruleFileName?`• ${cfg.ruleFileName}`:'Keine Namensregeln';
      els.mAspenFile.textContent=cfg.aspenFileName?`• ${cfg.aspenFileName}`:'Keine Aspen-Datei';
      els.mCols.value=cfg.columns;
      renderFields();
      renderMenuFields();
      if(els.modal.style.display==='grid'){renderFieldList();populatePresetSelect();}
    }



    function openModal(){renderFieldList();populatePresetSelect();if(els.mPresetName)els.mPresetName.value='';els.mCols.value=cfg.columns;els.modal.style.display='grid';}
    function closeModal(){els.modal.style.display='none';saveCfg(cfg);renderFields();renderMenuFields();}
    els.mClose.onclick=closeModal;
    els.mCols.addEventListener('change',()=>{cfg.columns=Math.max(1,parseInt(els.mCols.value)||1);applyColumns();saveCfg(cfg);});
    if(els.mPresetSelect){
      els.mPresetSelect.addEventListener('change',()=>{
        const val=els.mPresetSelect.value||'';
        if(els.mPresetDelete)els.mPresetDelete.disabled=!cfg.presets?.[val];
        if(val)applyPreset(val);
      });
    }
    if(els.mPresetSave){
      els.mPresetSave.addEventListener('click',()=>{
        const name=safePresetName(els.mPresetName?.value||'');
        if(!name){setNote('Bitte Preset-Namen eingeben.');return;}
        const fields=cfg.fields.filter(f=>f.enabled).map(f=>f.key);
        cfg.presets[name]={fields,columns:cfg.columns};
        cfg.activePreset=name;
        saveCfg(cfg);
        populatePresetSelect();
        if(els.mPresetName)els.mPresetName.value='';
        setNote('Preset gespeichert.');
      });
    }
    if(els.mPresetDelete){
      els.mPresetDelete.addEventListener('click',()=>{
        const name=els.mPresetSelect?.value||'';
        if(!name||!cfg.presets?.[name]){setNote('Kein benutzerdefiniertes Preset ausgewählt.');return;}
        delete cfg.presets[name];
        if(cfg.activePreset===name)cfg.activePreset='';
        saveCfg(cfg);
        populatePresetSelect();
        setNote('Preset gelöscht.');
      });
    }

    function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
    root.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();const m=els.menu,pad=8,vw=innerWidth,vh=innerHeight;const rect=m.getBoundingClientRect();const w=rect.width||200,h=rect.height||44;m.style.left=clamp(e.clientX,pad,vw-w-pad)+'px';m.style.top=clamp(e.clientY,pad,vh-h-pad)+'px';m.classList.add('open');});
    els.menu.addEventListener('click',e=>e.stopPropagation());
    addEventListener('click',()=>els.menu.classList.remove('open'));
    addEventListener('keydown',e=>{if(e.key==='Escape')els.menu.classList.remove('open');});
    els.menu.querySelector('.mi-opt').addEventListener('click',()=>{els.menu.classList.remove('open');openModal();});
    const baseBtn=els.menu.querySelector('.mi-base');
    if(baseBtn)baseBtn.addEventListener('click',()=>{els.menu.classList.remove('open');activateBaseFields();setNote('Basisfelder aktiviert.');});
    const partSerialBtn=els.menu.querySelector('.mi-ps');
    if(partSerialBtn)partSerialBtn.addEventListener('click',()=>{els.menu.classList.remove('open');showOnlyFields(['part','serial'],cfg.columns);setNote('Nur Part & Serial aktiv.');});
    const minimalBtn=els.menu.querySelector('.mi-min');
    if(minimalBtn)minimalBtn.addEventListener('click',()=>{els.menu.classList.remove('open');applyPreset('Minimal');setNote('Minimalansicht aktiviert.');});

    async function bindHandle(h){const ok=await ensureRWPermission(h);if(!ok){setNote('Berechtigung verweigert.');return false;}handle=h;await idbSet(cfg.idbKey,h);cfg.fileName=h.name||'Dictionary.xlsx';saveCfg(cfg);els.mFile.textContent=`• ${cfg.fileName}`;return true;}
    async function bindRuleHandle(h){const ok=await ensureRPermission(h);if(!ok){setNote('Berechtigung verweigert.');return false;}ruleHandle=h;await idbSet(cfg.ruleIdbKey,h);cfg.ruleFileName=h.name||'Rules.xlsx';saveCfg(cfg);els.mRuleFile.textContent=`• ${cfg.ruleFileName}`;try{rules=await readRulesFromHandle(h);}catch{rules=[];}updateName();return true;}

    async function readAspenFromHandle(h){
      await ensureXLSX();
      const f=await h.getFile();
      if(f.size===0){aspenRows=[];return;}
      const buf=await f.arrayBuffer();
      const wb=XLSX.read(buf,{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      if(!ws){aspenRows=[];return;}
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
      const hdr=rows[0]?.map(h=>String(h||'').toLowerCase().trim())||[];
      const idx={
        meldung:hdr.indexOf('meldungs_no'),
        auftrag:hdr.indexOf('auftrags_no'),
        part:hdr.indexOf('part_no'),
        serial:hdr.indexOf('serial_no'),
        repairorder:hdr.indexOf('repair_order')
      };
      aspenRows=rows.slice(1).map(r=>({
        meldung:idx.meldung>=0?String(r[idx.meldung]||'').trim():'',
        auftrag:idx.auftrag>=0?String(r[idx.auftrag]||'').trim():'',
        part:idx.part>=0?String(r[idx.part]||'').split(':')[0].trim():'',
        serial:idx.serial>=0?String(r[idx.serial]||'').trim():'',
        repairorder:idx.repairorder>=0?String(r[idx.repairorder]||'').trim():''
      }));
    }

    async function readAspen(){
      if(!aspenHandle)return;
      try{
        const f=await aspenHandle.getFile();
        if(f.lastModified===aspenLast && aspenRows.length) return;
        aspenLast=f.lastModified;
        await readAspenFromHandle(aspenHandle);
        aspenUpdatedAt=Date.now();
        updateAspenStatus();
        fillFromAspen();
      }catch(e){console.warn('Lesen der Aspen-Datei fehlgeschlagen:',e);}
    }

    function scheduleAspenPoll(){
      if(aspenTimer)clearInterval(aspenTimer);
      aspenTimer=setInterval(readAspen,ASPEN_POLL);
    }

    function fillFromAspen(){
      const m=activeMeldung();
      if(!aspenRows.length||!m){currentAspenRow=null;updateAspenDeltas();return;}
      const row=aspenRows.find(r=>r.meldung===m || r.auftrag===m) || null;
      currentAspenRow=row;
      if(row){
        ['auftrag','part','serial','repairorder'].forEach(k=>{
          const el=fieldEls[k]?.input;
          if(!el) return;
          if(!el.value){
            const val=row[k];
            if(val){el.value=val;putField(k,val);}
          }
        });
      }
      updateAspenDeltas();
    }

    async function bindAspenHandle(h){
      const ok=await ensureRPermission(h);
      if(!ok){setNote('Berechtigung verweigert.');return false;}
      aspenHandle=h;
      await idbSet(cfg.aspenIdbKey,h);
      cfg.aspenFileName=h.name||'Aspen.xlsx';
      saveCfg(cfg);
      els.mAspenFile.textContent=`• ${cfg.aspenFileName}`;
      aspenUpdatedAt=0;
      updateAspenStatus();
      await readAspen();
      scheduleAspenPoll();
      return true;
    }
    els.mPick.onclick=async()=>{try{const [h]=await showOpenFilePicker({types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],excludeAcceptAllOption:false,multiple:false});if(h&&await bindHandle(h)){cache=await readAll(h);setNote('Datei geladen.');refreshFromCache();}}catch(e){if(e?.name!=='AbortError')setNote('Auswahl fehlgeschlagen.');}};
    els.mCreate.onclick=async()=>{try{const h=await showSaveFilePicker({suggestedName:'Dictionary.xlsx',types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}]});if(h&&await bindHandle(h)){cache=[];await writeAll(h,cache);setNote('Datei erstellt.');refreshFromCache();}}catch(e){if(e?.name!=='AbortError')setNote('Erstellen fehlgeschlagen.');}};
    els.mRulePick.onclick=async()=>{try{const [h]=await showOpenFilePicker({types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],excludeAcceptAllOption:false,multiple:false});if(h)await bindRuleHandle(h);}catch(e){if(e?.name!=='AbortError')setNote('Auswahl fehlgeschlagen.');}};
    els.mAspenPick.onclick=async()=>{try{const [h]=await showOpenFilePicker({types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],excludeAcceptAllOption:false,multiple:false});if(h)await bindAspenHandle(h);}catch(e){if(e?.name!=='AbortError')setNote('Auswahl fehlgeschlagen.');}};

    (async()=>{try{const h=await idbGet(cfg.idbKey);if(h&&await ensureRWPermission(h)){handle=h;cache=await readAll(h);refreshFromCache();}}catch(e){}})();
    (async()=>{try{const h=await idbGet(cfg.ruleIdbKey);if(h&&await ensureRPermission(h)){ruleHandle=h;rules=await readRulesFromHandle(h);els.mRuleFile.textContent=`• ${cfg.ruleFileName||h.name||'Rules.xlsx'}`;updateName();}}catch(e){}})();
    (async()=>{try{const h=await idbGet(cfg.aspenIdbKey);if(h&&await ensureRPermission(h)){aspenHandle=h;els.mAspenFile.textContent=`• ${cfg.aspenFileName||h.name||'Aspen.xlsx'}`;await readAspen();scheduleAspenPoll();}}catch(e){}})();

    function activeMeldung(){return(loadDoc()?.general?.Meldung||'').trim();}
    function refreshFromCache(){const m=activeMeldung();const row=cache.find(r=>(r.meldung||'').trim()===m);cfg.fields.forEach(f=>{const el=fieldEls[f.key];if(!el)return;if(f.key==='meldung')el.input.value=m;else el.input.value=row?.[f.key]||'';});updateName();fillFromAspen();}

    addEventListener('storage',e=>{if(e.key===LS_DOC){refreshConfigFromStorage();refreshFromCache();}});
    addEventListener('visibilitychange',()=>{if(!document.hidden){refreshConfigFromStorage();refreshFromCache();}});
    let lastDocString=getDocString();
    const watcher=setInterval(()=>{const now=getDocString();if(now!==lastDocString){lastDocString=now;refreshConfigFromStorage();refreshFromCache();}},WATCH_INTERVAL);

    const scheduleSave=debounce(350,async()=>{
      if(!handle){setNote('Keine Excel-Datei gewählt.');return;}
      const token=++saveToken;
      try{
        await writeAll(handle,cache);
        if(token===saveToken){setDirty(false);setNote('Gespeichert.');setTimeout(()=>setNote(''),700);}
      }catch{
        if(token===saveToken)setDirty(true);
        setNote('Speichern fehlgeschlagen.');
      }
    });
    function putField(field,value){const m=activeMeldung();if(!m)return;let row=cache.find(r=>(r.meldung||'').trim()===m);if(!row){row=HEAD.reduce((o,k)=>(o[k]='',o),{});row.meldung=m;cache.push(row);}row[field]=value;setDirty(true);scheduleSave();}

    renderFields();
    renderMenuFields();

    const mo=new MutationObserver(()=>{if(!document.body.contains(root)){clearInterval(watcher);clearInterval(aspenTimer);menuSortables.forEach(s=>s.destroy());menuSortables=[];if(modalSortable){modalSortable.destroy();modalSortable=null;}els.menu?.remove();(async()=>{try{await idbDel(cfg.idbKey);}catch{}try{await idbDel(cfg.ruleIdbKey);}catch{}try{await idbDel(cfg.aspenIdbKey);}catch{}try{removeCfg();}catch{}})();mo.disconnect();}});
    mo.observe(document.body,{childList:true,subtree:true});
  };
})();
