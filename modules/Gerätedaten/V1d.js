/* Gerätedaten
 * - Excel pick/create with configurable fields
 * - Fields can be reordered and toggled via Sortable list in options
 * - Manual column count option replaces previous automatic layout
 * - Requires FS Access API (Chromium); auto-loads xlsx from CDN.
 */
(function(){
  // ----- styles -----
  const CSS = `
  .rs-root{height:100%;display:flex;flex-direction:column;gap:.6rem}
  .rs-head{font-weight:700;font-size:1.35rem;text-align:center;margin:.2rem 0 .2rem;user-select:none;color:var(--text-color)}
  .rs-form{flex:1;overflow:auto;padding:.25rem .1rem .1rem .1rem;scrollbar-width:none;-ms-overflow-style:none}
  .rs-form::-webkit-scrollbar{width:0;height:0;display:none}
  .rs-grid{display:grid;gap:.9rem}
  .rs-field{display:flex;flex-direction:column;gap:.35rem}
  .rs-labelwrap{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;color:var(--text-color)}
  .rs-label{font-weight:600;opacity:.95;color:inherit;cursor:default}
  .rs-label-info{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:.68rem;font-weight:600;background:rgba(255,255,255,.18);color:inherit;opacity:.85;cursor:help}
  .rs-inline-input{min-width:140px;padding:.25rem .45rem;border-radius:.35rem;border:1px solid var(--module-border-color);background:rgba(255,255,255,.08);color:var(--text-color)}
  .rs-inline-input.invalid,.rs-item-label.invalid{border-color:#dc2626;box-shadow:0 0 0 2px rgba(220,38,38,.35)}
  .rs-inputwrap{display:grid;grid-template-columns:auto 38px;align-items:center}
  .rs-input{width:100%;background:rgba(255,255,255,.08);border:1px solid var(--module-border-color);color:var(--text-color);padding:.45rem .55rem;border-radius:.4rem}
  .rs-copy{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid var(--module-border-color);border-radius:.35rem;background:rgba(255,255,255,.08);cursor:pointer;color:var(--text-color)}
  .rs-copy:active{transform:scale(.98)}
  .rs-note{font-size:.85rem;opacity:.75;margin-top:.15rem;color:var(--text-color)}
  .rs-item{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:.45rem;padding:.35rem .5rem;margin-bottom:.3rem;border:1px solid #d1d5db;border-radius:.4rem;cursor:grab;background:#f9fafb;color:#111827}
  .rs-item.off{opacity:.55;background:#f3f4f6}
  .rs-item-handle{font-size:1.05rem;cursor:grab;user-select:none}
  .rs-item-info{display:flex;flex-direction:column;gap:.15rem;min-width:120px}
  .rs-item-info span{line-height:1}
  .rs-item-original{font-size:.72rem;opacity:.65}
  .rs-item-label{width:100%;padding:.25rem .4rem;border-radius:.35rem;border:1px solid #d1d5db;background:#fff;color:#111827}
  .rs-item-actions{display:flex;align-items:center;gap:.45rem;font-size:.8rem}
  .rs-item-actions label{display:flex;align-items:center;gap:.2rem;cursor:pointer}
  .rs-item-remove{border:none;background:transparent;color:#dc2626;font-weight:600;cursor:pointer}
  .rs-new-section{margin-top:1rem;padding:.65rem .6rem;border:1px solid #e5e7eb;border-radius:.6rem;background:#f9fafb;color:#111827}
  .rs-new-title{font-size:.85rem;font-weight:600;margin-bottom:.35rem}
  .rs-new-search{width:100%;padding:.3rem .4rem;border-radius:.35rem;border:1px solid #d1d5db;margin-bottom:.45rem}
  .rs-new-list{list-style:none;margin:0;padding:0;max-height:220px;overflow:auto;display:flex;flex-direction:column;gap:.35rem}
  .rs-new-item{display:flex;align-items:center;justify-content:space-between;gap:.45rem;padding:.35rem .45rem;border:1px solid #d1d5db;border-radius:.4rem;background:#fff;color:#111827}
  .rs-new-info{display:flex;flex-direction:column;gap:.15rem}
  .rs-new-key{font-weight:600}
  .rs-new-original{font-size:.72rem;opacity:.65}
  .rs-new-add{border:none;border-radius:.35rem;padding:.3rem .55rem;background:#2563eb;color:#fff;cursor:pointer}
  .rs-new-add.secondary{background:#6b7280}
  .rs-new-inline{display:flex;align-items:center;gap:.35rem;margin-top:.35rem}
  .rs-new-inline input{flex:1;padding:.25rem .4rem;border-radius:.35rem;border:1px solid #d1d5db}
  .rs-new-inline button{border:none;border-radius:.35rem;padding:.25rem .55rem;cursor:pointer}
  .rs-new-empty{font-size:.8rem;opacity:.65}
  .rs-history-actions .db-btn{font-size:.8rem}
  `;
  (function inject(){
    let tag=document.getElementById('record-sheet-styles');
    if(!tag){tag=document.createElement('style');tag.id='record-sheet-styles';document.head.appendChild(tag);} 
    tag.textContent=CSS;
  })();

  // ----- utilities -----
  const LS_DOC='module_data_v1';
  const IDB_NAME='modulesApp';
  const IDB_STORE='fs-handles';
  const SHEET_NAME='records';
  const WATCH_INTERVAL=300;
  const GLOBAL_DICT_KEY='globalDict';
  const GLOBAL_NAME_KEY='globalNameRules';
  const BASE_FIELD_KEYS=['meldung','auftrag','part','serial'];
  const GROUP_LABELS={base:'Basisfeld',extra:'Zusatzfeld',aspen:'Aspen-Feld'};
  const MAX_HISTORY=50;
  const LABEL_BLOCKLIST=/[<>#]/;

  const parse=(s,fb)=>{try{return JSON.parse(s)||fb;}catch{return fb;}};
  const loadDoc=()=>parse(localStorage.getItem(LS_DOC),{__meta:{v:1},general:{},instances:{}});
  const saveDoc=(doc)=>{doc.__meta={v:1,updatedAt:new Date().toISOString()};localStorage.setItem(LS_DOC,JSON.stringify(doc));};
  const getDocString=()=>localStorage.getItem(LS_DOC)||'';
  const instanceIdOf=root=>root.closest('.grid-stack-item')?.dataset?.instanceId||('inst-'+Math.random().toString(36).slice(2));
  const debounce=(ms,fn)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};

  const slugify=str=>String(str||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'feld';
  function labelHash(str){let h=0;const s=String(str||'').trim().toLowerCase();for(let i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i);h|=0;}return Math.abs(h).toString(36);}
  function defaultLabelForKey(key){const base=String(key||'').trim();if(!base)return'Feld';return base.replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
  function generateFieldId(key,label,used){const slug=slugify(key||label||'feld');const hash=labelHash(label||slug);let candidate=`${slug}#${hash}`;let i=1;while(used&&used.has(candidate)){candidate=`${slug}#${hash}-${i++}`;}return candidate;}
  function inferGroup(key,raw){if(raw?.group==='aspen'||raw?.source==='aspen'||raw?.aspen)return'aspen';const base=String(key||'').trim().toLowerCase();if(BASE_FIELD_KEYS.includes(base))return'base';return raw?.group||'extra';}
  function normalizeFieldEntry(raw,used){if(!raw||typeof raw!=='object')return null;const original=String(raw.originalKey??raw.sourceKey??raw.key??'').trim();const key=String(raw.key??original).trim().toLowerCase();const label=String(raw.label??'').trim()||defaultLabelForKey(original||key||'Feld');let id=String(raw.id??'').trim().toLowerCase();if(!id){id=key||generateFieldId(original||key||label,label,used);}if(!id){id=generateFieldId('feld',label,used);}if(used.has(id)){id=generateFieldId(key||original||id||label,label,used);}const group=inferGroup(key||original,raw);const enabled=raw.enabled!==false;const originalKey=original||key||id;return{id,key:key||id,label,enabled,group,originalKey};}
  function normalizeFields(list){const used=new Set();const out=[];(Array.isArray(list)?list:[]).forEach(raw=>{const field=normalizeFieldEntry(raw,used);if(field){used.add(field.id);out.push(field);}});return out;}
  function fieldsEqual(a,b){if(a.length!==b.length)return false;for(let i=0;i<a.length;i++){const x=a[i],y=b[i];if(!x||!y)return false;if(x.id!==y.id||x.key!==y.key||x.label!==y.label||x.enabled!==y.enabled||(x.group||'')!==(y.group||'')||(x.originalKey||'')!==(y.originalKey||''))return false;}return true;}
  function validateLabel(label){const trimmed=String(label||'').trim();if(!trimmed)return'Label darf nicht leer sein.';if(trimmed.length>80)return'Label ist zu lang.';if(LABEL_BLOCKLIST.test(trimmed))return'Unerlaubte Zeichen im Label (#, <, >).';if(/[\x00-\x1F]/.test(trimmed))return'Unerlaubte Steuerzeichen im Label.';return'';}
  function tooltipForField(field){const lbl=field?.label||defaultLabelForKey(field?.originalKey||field?.key||'');const orig=field?.originalKey||field?.key||field?.id||'';const group=GROUP_LABELS[field?.group]||'Feld';return`${lbl} – ${orig} – (${group})`;}

  function ensureBaseFields(list){const seen=new Set(list.map(f=>f.key));BASE_FIELD_KEYS.forEach(key=>{if(!seen.has(key)){list.push({id:key,key,label:defaultLabelForKey(key),enabled:true,group:'base',originalKey:key});}});return list;}

  function idbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open(IDB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(IDB_STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
  async function idbSet(k,v){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function idbGet(k){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readonly');const rq=tx.objectStore(IDB_STORE).get(k);rq.onsuccess=()=>res(rq.result||null);rq.onerror=()=>rej(rq.error);});}
  async function idbDel(k){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).delete(k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function ensureRWPermission(handle){if(!handle?.queryPermission)return true;const q=await handle.queryPermission({mode:'readwrite'});if(q==='granted')return true;const r=await handle.requestPermission({mode:'readwrite'});return r==='granted';}
  async function ensureRPermission(handle){if(!handle?.queryPermission)return true;const q=await handle.queryPermission({mode:'read'});if(q==='granted')return true;const r=await handle.requestPermission({mode:'read'});return r==='granted';}

  async function saveGlobalDict(h,name){try{await idbSet(GLOBAL_DICT_KEY,h);}catch{}const doc=loadDoc();doc.general ||= {};doc.general.dictFileName=name;saveDoc(doc);}
  async function saveGlobalRules(h,name){try{await idbSet(GLOBAL_NAME_KEY,h);}catch{}const doc=loadDoc();doc.general ||= {};doc.general.nameFileName=name;saveDoc(doc);}

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

  async function readAspenHeaders(handle){
    await ensureXLSX();
    const f=await handle.getFile();
    if(f.size===0)return[];
    const buf=await f.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    if(!ws)return[];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    const header=Array.isArray(rows[0])?rows[0]:[];
    return header.map((cell,idx)=>{const original=String(cell||'').trim();const key=original.toLowerCase();return{original,key,index:idx};}).filter(h=>h.key);
  }

  function buildUI(root){
    root.innerHTML=`
      <div class="rs-root">
        <div class="rs-head" style="display:none"></div>
        <div class="rs-form">
          <div class="rs-grid"></div>
          <div class="rs-note"></div>
        </div>
      </div>
      <div class="db-modal rs-modal" style="position:fixed;inset:0;display:none;place-items:center;background:rgba(0,0,0,.35);z-index:50;">
        <div class="db-panel" style="background:#fff;color:#111827;width:min(92vw,720px);border-radius:.9rem;padding:1rem;">
          <div class="db-row" style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.5rem">
            <div class="font-semibold">Gerätedaten – Optionen</div>
            <button class="db-btn secondary rs-close" style="background:#eee;border-radius:.5rem;padding:.35rem .6rem">Schließen</button>
          </div>
          <div class="db-field">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Dictionary</label>
            <div class="db-row" style="display:flex;gap:.5rem;align-items:center">
              <button class="db-btn rs-pick" style="background:var(--button-bg);color:var(--button-text);border-radius:.5rem;padding:.35rem .6rem">Dictionary wählen</button>
              <button class="db-btn rs-create" style="background:rgba(0,0,0,.08);border-radius:.5rem;padding:.35rem .6rem">Dictionary erstellen</button>
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
              <button class="db-btn rs-aspen-pick" style="background:rgba(0,0,0,.08);border-radius:.5rem;padding:.35rem .6rem">Aspen wählen</button>
              <span class="rs-aspen-file db-file"></span>
            </div>
          </div>
          <div class="db-field" style="margin-top:1rem;">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Felder</label>
            <div class="rs-history-actions" style="display:flex;gap:.4rem;margin-bottom:.4rem;">
              <button class="db-btn rs-undo" style="background:rgba(0,0,0,.08);border-radius:.5rem;padding:.32rem .55rem">↺ Rückgängig</button>
              <button class="db-btn rs-redo" style="background:rgba(0,0,0,.08);border-radius:.5rem;padding:.32rem .55rem">↻ Wiederholen</button>
            </div>
            <ul class="rs-list" style="list-style:none;margin:0;padding:0;"></ul>
            <div style="font-size:.8rem;opacity:.7;margin-top:.25rem;">Aktivieren/Deaktivieren per Checkbox, ziehen am Griff zum Sortieren.</div>
            <div class="rs-new-section">
              <div class="rs-new-title">Neue Felder hinzufügen</div>
              <input class="rs-new-search" type="search" placeholder="Aspen-Felder suchen..." />
              <ul class="rs-new-list"></ul>
              <div class="rs-new-empty">Aspen-Datei wählen, um verfügbare Felder zu laden.</div>
            </div>
          </div>
          <div class="db-field" style="margin-top:1rem;">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Spalten</label>
            <input type="number" min="1" max="6" class="rs-cols" style="width:4rem;padding:.25rem .4rem;border:1px solid #ccc;border-radius:.25rem;" />
          </div>
        </div>
      </div>
    `;
    const menu=document.createElement('div');
    menu.className='db-menu';
    menu.innerHTML=`<button class="mi mi-opt">⚙️ Optionen</button>`;
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
      mUndo:root.querySelector('.rs-undo'),
      mRedo:root.querySelector('.rs-redo'),
      mNewSearch:root.querySelector('.rs-new-search'),
      mNewList:root.querySelector('.rs-new-list'),
      mNewEmpty:root.querySelector('.rs-new-empty'),
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
    const fallbackFields=[
      {id:'meldung',key:'meldung',label:'Meldung',enabled:true,group:'base',originalKey:'meldung'},
      {id:'auftrag',key:'auftrag',label:'Auftrag',enabled:true,group:'base',originalKey:'auftrag'},
      {id:'part',key:'part',label:'P/N',enabled:true,group:'base',originalKey:'part'},
      {id:'serial',key:'serial',label:'S/N',enabled:true,group:'base',originalKey:'serial'}
    ];
    const defaultsRaw=Array.isArray(defaults.fields)&&defaults.fields.length?defaults.fields.map(f=>({...f})):fallbackFields.map(f=>({...f}));
    const defaultFields=normalizeFields(ensureBaseFields(defaultsRaw));
    const defaultColumns=defaults.columns||2;

    const els=buildUI(root);
    const instanceId=instanceIdOf(root);
    const idbKey=`recordSheet:${instanceId}`;
    const ruleIdbKey=`recordSheetRules:${instanceId}`;
    const aspenIdbKey=`recordSheetAspen:${instanceId}`;

    function cloneFields(list){const normalized=normalizeFields(Array.isArray(list)?list.map(f=>({...f})) : []);return normalized.length?normalized:defaultFields.map(f=>({...f}));}
    function loadCfg(){
      const doc=loadDoc();
      const raw=doc?.instances?.[instanceId]?.recordSheet||{};
      const g=doc.general||{};
      const fields=cloneFields(Array.isArray(raw.fields)?raw.fields:defaultFields);
      return{
        idbKey:raw.idbKey||idbKey,
        fileName:raw.fileName||g.dictFileName||'',
        ruleIdbKey:raw.ruleIdbKey||ruleIdbKey,
        ruleFileName:raw.ruleFileName||g.nameFileName||'',
        aspenIdbKey:raw.aspenIdbKey||aspenIdbKey,
        aspenFileName:raw.aspenFileName||'',
        fields,
        columns:raw.columns||defaultColumns
      };
    }
    function serializeFields(fields){return fields.map(f=>({id:f.id,key:f.key,label:f.label,enabled:!!f.enabled,group:f.group||'extra',originalKey:f.originalKey||f.key||f.id}));}
    function saveCfg(current){const doc=loadDoc();doc.instances||={};doc.instances[instanceId]||={};doc.instances[instanceId].recordSheet={idbKey:current.idbKey,fileName:current.fileName,ruleIdbKey:current.ruleIdbKey,ruleFileName:current.ruleFileName,aspenIdbKey:current.aspenIdbKey,aspenFileName:current.aspenFileName,fields:serializeFields(current.fields),columns:current.columns};saveDoc(doc);}
    function removeCfg(){const doc=loadDoc();if(doc?.instances?.[instanceId]){delete doc.instances[instanceId].recordSheet;if(!Object.keys(doc.instances[instanceId]).length)delete doc.instances[instanceId];saveDoc(doc);}}

    let cfg=loadCfg();
    els.mFile.textContent=cfg.fileName?`• ${cfg.fileName}`:'Keine Datei gewählt';
    els.mRuleFile.textContent=cfg.ruleFileName?`• ${cfg.ruleFileName}`:'Keine Namensregeln';
    els.mAspenFile.textContent=cfg.aspenFileName?`• ${cfg.aspenFileName}`:'Keine Aspen-Datei';
    els.head.style.display='none';
    HEAD=cfg.fields.map(f=>f.id);
    let handle=null;
    let ruleHandle=null;
    let aspenHandle=null;
    let aspenHeaders=[];
    let history=[];
    let future=[];
    let rules=[];
    let cache=[];
    let activeNewFieldEditor=null;
    let listSortable=null;

    const isModalOpen=()=>els.modal.style.display==='grid';
    function snapshotFields(){return cfg.fields.map(f=>({...f}));}
    function syncAfterFieldChange(){HEAD=cfg.fields.map(f=>f.id);saveCfg(cfg);renderFields();if(isModalOpen())renderFieldList();updateAspenFieldList();updateUndoRedoButtons();}
    function setFields(newFields,{recordHistory=true}={}){const normalized=normalizeFields(Array.isArray(newFields)?newFields:[]);if(fieldsEqual(normalized,cfg.fields)){updateUndoRedoButtons();return false;}if(recordHistory){history.push(snapshotFields());if(history.length>MAX_HISTORY)history.shift();future=[];}cfg.fields=normalized;syncAfterFieldChange();return true;}
    function mutateFields(mutator,{recordHistory=true}={}){const draft=snapshotFields();const result=mutator(draft);const next=Array.isArray(result)?result:draft;return setFields(next,{recordHistory});}
    function undo(){if(!history.length)return;const prev=history.pop();future.push(snapshotFields());cfg.fields=normalizeFields(prev);syncAfterFieldChange();}
    function redo(){if(!future.length)return;history.push(snapshotFields());const next=future.pop();cfg.fields=normalizeFields(next);syncAfterFieldChange();}
    function updateUndoRedoButtons(){if(els.mUndo)els.mUndo.disabled=!history.length;if(els.mRedo)els.mRedo.disabled=!future.length;}

    const setNote=s=>els.note.textContent=s||'';
    const copy=async val=>{try{await navigator.clipboard.writeText(val||'');setNote('Kopiert.');setTimeout(()=>setNote(''),800);}catch{setNote('Kopieren fehlgeschlagen');}};
    if(els.mUndo)els.mUndo.addEventListener('click',undo);
    if(els.mRedo)els.mRedo.addEventListener('click',redo);
    if(els.mNewSearch)els.mNewSearch.addEventListener('input',()=>updateAspenFieldList());

    async function bindAspenHandle(handle){try{const ok=await ensureRPermission(handle);if(!ok){setNote('Berechtigung verweigert.');return false;}aspenHandle=handle;await idbSet(cfg.aspenIdbKey,handle);cfg.aspenFileName=handle.name||'Aspen.xlsx';els.mAspenFile.textContent=`• ${cfg.aspenFileName}`;saveCfg(cfg);try{aspenHeaders=await readAspenHeaders(handle);}catch(err){console.warn('Aspen-Felder konnten nicht gelesen werden:',err);aspenHeaders=[];setNote('Aspen-Felder konnten nicht gelesen werden.');}updateAspenFieldList();return true;}catch(err){console.warn('Aspen-Datei konnte nicht gebunden werden:',err);setNote('Aspen-Datei konnte nicht geladen werden.');return false;}}

    let fieldEls={};
    const lookupName=pn=>{for(const r of rules){if(pn.startsWith(r.prefix))return r.name;}return'';};
    function updateName(){if(!rules.length){els.head.style.display='none';return;}const partField=cfg.fields.find(f=>f.key==='part'&&f.enabled);const pn=partField?(fieldEls[partField.id]?.input?.value||'').trim():'';const name=lookupName(pn);els.head.style.display='block';els.head.textContent=name||'Unbekanntes Gerät';}

    function applyColumns(){const cols=Math.max(1,parseInt(cfg.columns)||1);els.grid.style.gridTemplateColumns=`repeat(${cols},1fr)`;}
    function renderFields(){
      HEAD=cfg.fields.map(f=>f.id);
      els.grid.innerHTML='';fieldEls={};
      cfg.fields.filter(f=>f.enabled).forEach(f=>{
        const wrap=document.createElement('div');
        wrap.className='rs-field';
        wrap.dataset.fieldId=f.id;
        const tooltip=tooltipForField(f);
        const labelWrap=document.createElement('div');
        labelWrap.className='rs-labelwrap';
        const labelSpan=document.createElement('span');
        labelSpan.className='rs-label';
        labelSpan.textContent=f.label;
        labelSpan.title=tooltip;
        const info=document.createElement('span');
        info.className='rs-label-info';
        info.textContent='i';
        info.title=tooltip;
        labelWrap.appendChild(labelSpan);
        labelWrap.appendChild(info);
        const inputWrap=document.createElement('div');
        inputWrap.className='rs-inputwrap';
        const input=document.createElement('input');
        input.className='rs-input';
        input.type='text';
        if(f.key==='meldung')input.setAttribute('readonly','');
        const copyBtn=document.createElement('button');
        copyBtn.className='rs-copy';
        copyBtn.title='Kopieren';
        copyBtn.textContent='⧉';
        inputWrap.appendChild(input);
        inputWrap.appendChild(copyBtn);
        wrap.appendChild(labelWrap);
        wrap.appendChild(inputWrap);
        els.grid.appendChild(wrap);
        copyBtn.addEventListener('click',()=>copy(input.value));
        if(f.key!=='meldung'){input.addEventListener('input',()=>{putField(f.id,input.value);if(f.key==='part')updateName();});}
        labelWrap.addEventListener('dblclick',e=>{if(e.target===info)return;startInlineLabelEdit(f.id,labelWrap,labelSpan,info);});
        fieldEls[f.id]={input,labelEl:labelSpan,infoEl:info,wrap,labelWrap};
      });
      applyColumns();
      refreshFromCache();
    }

    function renderFieldList(){
      const list=els.mList;
      if(!list) return;
      list.innerHTML='';
      if(listSortable){try{listSortable.destroy();}catch{}listSortable=null;}
      activeNewFieldEditor=null;
      cfg.fields.forEach(f=>{
        const li=document.createElement('li');
        li.className='rs-item'+(f.enabled?'':' off');
        li.dataset.id=f.id;
        li.title=tooltipForField(f);
        const handle=document.createElement('span');
        handle.className='rs-item-handle';
        handle.textContent='☰';
        handle.title='Ziehen zum Sortieren';
        const info=document.createElement('div');
        info.className='rs-item-info';
        const nameSpan=document.createElement('span');
        nameSpan.textContent=f.label;
        const original=document.createElement('span');
        original.className='rs-item-original';
        original.textContent=f.originalKey||f.key||f.id;
        info.appendChild(nameSpan);
        info.appendChild(original);
        const input=document.createElement('input');
        input.type='text';
        input.className='rs-item-label';
        input.value=f.label;
        const actions=document.createElement('div');
        actions.className='rs-item-actions';
        const toggleLabel=document.createElement('label');
        const toggle=document.createElement('input');
        toggle.type='checkbox';
        toggle.className='rs-item-enabled';
        toggle.checked=!!f.enabled;
        toggleLabel.appendChild(toggle);
        toggleLabel.appendChild(document.createTextNode('Aktiv'));
        const removeBtn=document.createElement('button');
        removeBtn.type='button';
        removeBtn.className='rs-item-remove';
        removeBtn.textContent='✕';
        if(f.key==='meldung'){
          removeBtn.disabled=true;
          removeBtn.style.opacity='0.4';
          removeBtn.title='Dieses Feld kann nicht entfernt werden.';
        }else{
          removeBtn.title='Feld entfernen';
        }
        actions.appendChild(toggleLabel);
        actions.appendChild(removeBtn);
        li.append(handle,info,input,actions);
        list.appendChild(li);
        input.addEventListener('input',()=>{input.classList.remove('invalid');});
        const commit=()=>{const result=applyLabelChange(f.id,input.value);if(result.error){input.classList.add('invalid');setNote(result.error);input.focus();input.select();return;}input.classList.remove('invalid');if(!result.changed){input.value=f.label;}};
        input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit();}else if(e.key==='Escape'){e.preventDefault();input.value=f.label;input.classList.remove('invalid');setNote('');}});
        input.addEventListener('blur',commit);
        toggle.addEventListener('change',()=>{const desired=toggle.checked;mutateFields(fields=>{const target=fields.find(x=>x.id===f.id);if(target)target.enabled=desired;return fields;});});
        removeBtn.addEventListener('click',()=>{if(removeBtn.disabled)return;mutateFields(fields=>fields.filter(x=>x.id!==f.id));});
      });
      listSortable=new Sortable(list,{animation:150,handle:'.rs-item-handle',onEnd:()=>{const order=Array.from(list.children).map(li=>li.dataset.id);mutateFields(fields=>{const map=new Map(fields.map(f=>[f.id,f]));const next=[];order.forEach(id=>{const item=map.get(id);if(item)next.push(item);});fields.forEach(field=>{if(!order.includes(field.id))next.push(field);});return next;});}});
      updateUndoRedoButtons();
    }

    function applyLabelChange(fieldId,value,options){
      const trimmed=String(value||'').trim();
      const error=validateLabel(trimmed);
      if(error){return{changed:false,error};}
      const current=cfg.fields.find(f=>f.id===fieldId);
      if(!current){return{changed:false};}
      if(current.label===trimmed){setNote('');return{changed:false};}
      const changed=mutateFields(fields=>{const target=fields.find(x=>x.id===fieldId);if(target)target.label=trimmed;return fields;},options);
      if(changed){setNote('Label aktualisiert.');return{changed:true};}
      return{changed:false};
    }
    function startInlineLabelEdit(fieldId,labelWrap,labelSpan,infoEl){
      const field=cfg.fields.find(f=>f.id===fieldId);
      if(!field||!labelWrap||labelWrap.querySelector('input'))return;
      const input=document.createElement('input');
      input.type='text';
      input.className='rs-inline-input';
      input.value=field.label;
      labelWrap.replaceChild(input,labelSpan);
      input.focus();input.select();
      input.addEventListener('input',()=>input.classList.remove('invalid'));
      const commit=()=>{const result=applyLabelChange(fieldId,input.value);if(result.error){input.classList.add('invalid');setNote(result.error);input.focus();input.select();return;}input.classList.remove('invalid');if(result.changed){return;}if(!labelWrap.isConnected)return;labelWrap.replaceChild(labelSpan,input);labelSpan.textContent=field.label;const tip=tooltipForField(field);labelSpan.title=tip;if(infoEl)infoEl.title=tip;};
      const cancel=()=>{setNote('');if(!labelWrap.isConnected)return;labelWrap.replaceChild(labelSpan,input);labelSpan.textContent=field.label;const tip=tooltipForField(field);labelSpan.title=tip;if(infoEl)infoEl.title=tip;};
      input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit();}else if(e.key==='Escape'){e.preventDefault();cancel();}});
      input.addEventListener('blur',commit);
    }

    function updateAspenFieldList(){const list=els.mNewList;if(!list)return;list.innerHTML='';activeNewFieldEditor=null;const empty=els.mNewEmpty;if(!aspenHeaders.length){if(empty){empty.textContent=aspenHandle?'Keine zusätzlichen Felder verfügbar.':'Aspen-Datei wählen, um verfügbare Felder zu laden.';empty.style.display='block';}return;}const term=(els.mNewSearch?.value||'').trim().toLowerCase();const matches=aspenHeaders.filter(h=>!term||h.original.toLowerCase().includes(term)||h.key.includes(term));if(!matches.length){if(empty){empty.textContent='Keine Treffer.';empty.style.display='block';}return;}if(empty)empty.style.display='none';matches.forEach(info=>{const li=document.createElement('li');li.className='rs-new-item';li.dataset.key=info.key;const infoWrap=document.createElement('div');infoWrap.className='rs-new-info';const keyLabel=document.createElement('div');keyLabel.className='rs-new-key';keyLabel.textContent=info.original||info.key;const original=document.createElement('div');original.className='rs-new-original';original.textContent=info.key;infoWrap.appendChild(keyLabel);infoWrap.appendChild(original);const addBtn=document.createElement('button');addBtn.type='button';addBtn.className='rs-new-add';const count=cfg.fields.filter(f=>f.key===info.key).length;if(count){addBtn.classList.add('secondary');addBtn.textContent='Nochmal hinzufügen';}else{addBtn.textContent='Hinzufügen';}addBtn.addEventListener('click',()=>startAspenFieldEditor(info,li));li.append(infoWrap,addBtn);list.appendChild(li);});}
    function startAspenFieldEditor(info,li){if(activeNewFieldEditor&&activeNewFieldEditor!==li){activeNewFieldEditor.querySelector('.rs-new-inline')?.remove();}if(li.querySelector('.rs-new-inline'))return;activeNewFieldEditor=li;const inline=document.createElement('div');inline.className='rs-new-inline';const input=document.createElement('input');input.type='text';input.value=defaultLabelForKey(info.original||info.key);const confirm=document.createElement('button');confirm.type='button';confirm.textContent='Hinzufügen';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Abbrechen';inline.append(input,confirm,cancel);li.appendChild(inline);input.focus();input.select();input.addEventListener('input',()=>input.classList.remove('invalid'));const close=()=>{inline.remove();if(activeNewFieldEditor===li)activeNewFieldEditor=null;};const submit=()=>{const ok=addAspenField(info,input.value);if(ok)close();else input.classList.add('invalid');};confirm.addEventListener('click',submit);cancel.addEventListener('click',()=>{close();setNote('');});input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit();}else if(e.key==='Escape'){e.preventDefault();close();setNote('');}});}
    function addAspenField(info,label){const trimmed=String(label||'').trim();const error=validateLabel(trimmed);if(error){setNote(error);return false;}const used=new Set(cfg.fields.map(f=>f.id));const id=generateFieldId(info.key,trimmed,used);const changed=mutateFields(fields=>{fields.push({id,key:info.key,label:trimmed,enabled:true,group:'aspen',originalKey:info.original||info.key});return fields;});if(changed){setNote('Feld hinzugefügt.');return true;}setNote('');return false;}

    function openModal(){renderFieldList();els.mCols.value=cfg.columns;updateAspenFieldList();updateUndoRedoButtons();els.modal.style.display='grid';}
    function closeModal(){els.modal.style.display='none';saveCfg(cfg);renderFields();}
    els.mClose.onclick=closeModal;
    els.mCols.addEventListener('change',()=>{cfg.columns=Math.max(1,parseInt(els.mCols.value)||1);applyColumns();saveCfg(cfg);});

    function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
    root.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();const m=els.menu,pad=8,vw=innerWidth,vh=innerHeight;const rect=m.getBoundingClientRect();const w=rect.width||200,h=rect.height||44;m.style.left=clamp(e.clientX,pad,vw-w-pad)+'px';m.style.top=clamp(e.clientY,pad,vh-h-pad)+'px';m.classList.add('open');});
    addEventListener('click',()=>els.menu.classList.remove('open'));
    addEventListener('keydown',e=>{if(e.key==='Escape')els.menu.classList.remove('open');});
    els.menu.querySelector('.mi-opt').addEventListener('click',()=>{els.menu.classList.remove('open');openModal();});

    async function bindHandle(h){const ok=await ensureRWPermission(h);if(!ok){setNote('Berechtigung verweigert.');return false;}handle=h;await idbSet(cfg.idbKey,h);cfg.fileName=h.name||'Dictionary.xlsx';saveCfg(cfg);els.mFile.textContent=`• ${cfg.fileName}`;saveGlobalDict(h,cfg.fileName);return true;}
    async function bindRuleHandle(h){const ok=await ensureRPermission(h);if(!ok){setNote('Berechtigung verweigert.');return false;}ruleHandle=h;await idbSet(cfg.ruleIdbKey,h);cfg.ruleFileName=h.name||'Rules.xlsx';saveCfg(cfg);els.mRuleFile.textContent=`• ${cfg.ruleFileName}`;saveGlobalRules(h,cfg.ruleFileName);try{rules=await readRulesFromHandle(h);}catch{rules=[];}updateName();return true;}
    els.mPick.onclick=async()=>{try{const [h]=await showOpenFilePicker({types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],excludeAcceptAllOption:false,multiple:false});if(h&&await bindHandle(h)){cache=await readAll(h);setNote('Dictionary geladen.');refreshFromCache();}}catch(e){if(e?.name!=='AbortError')setNote('Auswahl fehlgeschlagen.');}};
    els.mCreate.onclick=async()=>{try{const h=await showSaveFilePicker({suggestedName:'Dictionary.xlsx',types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}]});if(h&&await bindHandle(h)){cache=[];await writeAll(h,cache);setNote('Dictionary erstellt.');refreshFromCache();}}catch(e){if(e?.name!=='AbortError')setNote('Erstellen fehlgeschlagen.');}};
    els.mRulePick.onclick=async()=>{try{const [h]=await showOpenFilePicker({types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],excludeAcceptAllOption:false,multiple:false});if(h)await bindRuleHandle(h);}catch(e){if(e?.name!=='AbortError')setNote('Auswahl fehlgeschlagen.');}};

    (async()=>{try{let h=await idbGet(cfg.idbKey);if(!h){h=await idbGet(GLOBAL_DICT_KEY);if(h){await idbSet(cfg.idbKey,h);if(!cfg.fileName){const g=loadDoc().general||{};cfg.fileName=g.dictFileName||h.name||'Dictionary.xlsx';saveCfg(cfg);els.mFile.textContent=`• ${cfg.fileName}`;}}}if(h&&await ensureRWPermission(h)){handle=h;cache=await readAll(h);refreshFromCache();}}catch(e){}})();
    (async()=>{try{let h=await idbGet(cfg.ruleIdbKey);if(!h){h=await idbGet(GLOBAL_NAME_KEY);if(h){await idbSet(cfg.ruleIdbKey,h);if(!cfg.ruleFileName){const g=loadDoc().general||{};cfg.ruleFileName=g.nameFileName||h.name||'Rules.xlsx';saveCfg(cfg);els.mRuleFile.textContent=`• ${cfg.ruleFileName}`;}}}if(h&&await ensureRPermission(h)){ruleHandle=h;rules=await readRulesFromHandle(h);els.mRuleFile.textContent=`• ${cfg.ruleFileName||h.name||'Rules.xlsx'}`;updateName();}}catch(e){}})();

    function activeMeldung(){return(loadDoc()?.general?.Meldung||'').trim();}
    function refreshFromCache(){const m=activeMeldung();const meldField=cfg.fields.find(f=>f.key==='meldung');const meldId=meldField?meldField.id:'meldung';const row=cache.find(r=>String(r[meldId]||'').trim()===m);cfg.fields.forEach(f=>{const el=fieldEls[f.id];if(!el)return;if(f.key==='meldung'){el.input.value=m;}else{el.input.value=row?.[f.id]||'';}const tip=tooltipForField(f);if(el.labelEl){el.labelEl.textContent=f.label;el.labelEl.title=tip;}if(el.infoEl)el.infoEl.title=tip;});updateName();}

    addEventListener('storage',e=>{if(e.key===LS_DOC)refreshFromCache();});
    addEventListener('visibilitychange',()=>{if(!document.hidden)refreshFromCache();});
    let lastDocString=getDocString();
    const watcher=setInterval(()=>{const now=getDocString();if(now!==lastDocString){lastDocString=now;refreshFromCache();}},WATCH_INTERVAL);

    const scheduleSave=debounce(350,async()=>{if(!handle){setNote('Kein Dictionary gewählt.');return;}try{await writeAll(handle,cache);setNote('Gespeichert.');setTimeout(()=>setNote(''),700);}catch{setNote('Speichern fehlgeschlagen.');}});
    function putField(fieldId,value){const m=activeMeldung();if(!m)return;const meldField=cfg.fields.find(f=>f.key==='meldung');const meldId=meldField?meldField.id:'meldung';let row=cache.find(r=>String(r[meldId]||'').trim()===m);if(!row){row=HEAD.reduce((o,k)=>(o[k]='',o),{});row[meldId]=m;cache.push(row);}row[fieldId]=value;scheduleSave();}

    if(els.mAspenPick){els.mAspenPick.addEventListener('click',async()=>{try{const [handle]=await showOpenFilePicker({types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],excludeAcceptAllOption:false,multiple:false});if(handle)await bindAspenHandle(handle);}catch(e){if(e?.name!=='AbortError')setNote('Auswahl fehlgeschlagen.');}});}
    updateAspenFieldList();
    (async()=>{try{const stored=await idbGet(cfg.aspenIdbKey);if(stored&&await ensureRPermission(stored)){aspenHandle=stored;if(!cfg.aspenFileName){cfg.aspenFileName=stored.name||'Aspen.xlsx';els.mAspenFile.textContent=`• ${cfg.aspenFileName}`;saveCfg(cfg);}else{els.mAspenFile.textContent=`• ${cfg.aspenFileName||stored.name||'Aspen.xlsx'}`;}try{aspenHeaders=await readAspenHeaders(stored);}catch(err){console.warn('Aspen-Felder konnten nicht gelesen werden:',err);aspenHeaders=[];}}}catch(err){console.warn('Lesen der Aspen-Datei fehlgeschlagen:',err);}finally{updateAspenFieldList();}})();


    renderFields();
    updateUndoRedoButtons();

    const mo=new MutationObserver(()=>{if(!document.body.contains(root)){clearInterval(watcher);els.menu?.remove();(async()=>{try{await idbDel(cfg.idbKey);}catch{}try{await idbDel(cfg.ruleIdbKey);}catch{}try{await idbDel(cfg.aspenIdbKey);}catch{}try{removeCfg();}catch{}})();mo.disconnect();}});
    mo.observe(document.body,{childList:true,subtree:true});
  };
})();
