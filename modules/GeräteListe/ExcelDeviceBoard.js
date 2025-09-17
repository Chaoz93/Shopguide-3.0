/* Excel-basierte Geräteliste, dedupliziert nach Meldung */
(function(){
  'use strict';

  if(!document.getElementById('device-board-styles')){
    const css=`
    .db-root{height:100%;display:flex;flex-direction:column;gap:.6rem;
      --dl-bg:#f5f7fb; --dl-item-bg:#ffffff; --dl-title:#2563eb; --dl-sub:#4b5563; --dl-active:#10b981;}
    .db-titlebar{font-weight:600; color:var(--text-color); padding:0 .15rem; user-select:none}
    .db-surface{flex:1; background:var(--dl-bg); border-radius:1rem; padding:.75rem; overflow:auto;}
    .db-list{display:flex; flex-direction:column; gap:.65rem; min-height:1.5rem;}
    .db-card{
      background:var(--dl-item-bg); color:var(--dl-sub);
      border-radius:.8rem; padding:.65rem .75rem; box-shadow:0 2px 6px rgba(0,0,0,.06);
      display:flex; align-items:center; gap:.75rem; user-select:none;
      transition: box-shadow .12s ease, outline-color .12s ease, transform .12s ease;
    }
    .db-card .db-title{ color:var(--dl-title); font-weight:600; line-height:1.1; }
    .db-card .db-sub{ color:var(--dl-sub); font-size:.85rem; margin-top:.15rem; }
    .db-card .db-flex{flex:1; display:flex; flex-direction:column;}
    .db-handle{
      margin-left:.5rem; flex:0 0 auto; width:28px; height:28px; display:flex; align-items:center; justify-content:center;
      border-radius:.45rem; background:rgba(0,0,0,.06); cursor:grab; color:inherit;
    }
    .db-handle:active{cursor:grabbing}
    .db-card.active{ box-shadow:0 0 0 2px var(--dl-active) inset, 0 8px 20px rgba(0,0,0,.12); transform:translateY(-1px); }
    .db-btn{background:var(--button-bg); color:var(--button-text); padding:.35rem .6rem; border-radius:.5rem; font-size:.875rem}
    .db-btn.secondary{background: rgba(255,255,255,.14); color: var(--text-color);}
    .db-add{align-self:center; border-radius:9999px; width:2.2rem; height:2.2rem; display:flex; align-items:center; justify-content:center;
            background:var(--button-bg); color:var(--button-text); box-shadow:0 8px 18px rgba(0,0,0,.16);}
    .db-footer{display:flex; justify-content:center; padding:.25rem 0 .5rem;}
    .db-modal{position:fixed; inset:0; display:none; place-items:center; background:rgba(0,0,0,.35); z-index:50;}
    .db-modal.open{display:grid;}
    .db-panel{background:#fff; color:#111827; width:min(92vw,760px); border-radius:.9rem; padding:1rem; box-shadow:0 10px 30px rgba(0,0,0,.25);}
    .db-grid{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.75rem;}
    .db-field label{font-size:.85rem; font-weight:600; display:block; margin-bottom:.25rem;}
    .db-color{width:100%; height:2.25rem; border:1px solid #e5e7eb; border-radius:.5rem;}
    .db-input{width:100%; height:2.25rem; border:1px solid #e5e7eb; border-radius:.5rem; padding:.4rem .55rem;}
    .db-row{display:flex; gap:.5rem; align-items:center;}
    .db-file{font-size:.85rem; opacity:.85;}
    @media (max-width:840px){ .db-grid{grid-template-columns:repeat(2,minmax(0,1fr));} }
    @media (max-width:520px){ .db-grid{grid-template-columns:1fr;} }
    .db-ghost{opacity:.4}
    .db-chosen{transform:scale(1.01)}
    .db-menu{position:fixed; z-index:1000; display:none; min-width:180px; padding:.25rem;
      background:var(--sidebar-module-card-bg,#fff); color:var(--sidebar-module-card-text,#111);
      border:1px solid var(--border-color,#e5e7eb); border-radius:.5rem; box-shadow:0 10px 24px rgba(0,0,0,.18);}
    .db-menu.open{display:block}
    .db-menu .mi{display:block; width:100%; padding:.5rem .75rem; text-align:left; border-radius:.4rem;}
    .db-menu .mi:hover{background:rgba(0,0,0,.06)}
    `;
    const tag=document.createElement('style');
    tag.id='device-board-styles';
    tag.textContent=css;
    document.head.appendChild(tag);
  }

  const LS_DOC='module_data_v1';
  const IDB_NAME='modulesApp';
  const IDB_STORE='fs-handles';
  const GROUP_NAME='deviceBoardGroup';
  const CUSTOM_BROADCAST='deviceBoard:update';
  const GLOBAL_DICT_KEY='globalDict';
  const GLOBAL_NAME_KEY='globalNameRules';

  const DEFAULT_DICT_FIELDS=[
    {key:'meldung',label:'Meldung'},
    {key:'auftrag',label:'Auftrag'},
    {key:'part',label:'PartNo'},
    {key:'serial',label:'SerialNo'}
  ];

  const XLSX_URLS=[
    'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.2/xlsx.full.min.js'
  ];
  const SORTABLE_URLS=[
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js'
  ];

  const parse=(s,fb)=>{try{return JSON.parse(s)??fb;}catch{return fb;}};
  const loadDoc=()=>parse(localStorage.getItem(LS_DOC),{__meta:{v:1},general:{},instances:{}});
  const saveDoc=doc=>{doc.__meta={v:1,updatedAt:new Date().toISOString()};localStorage.setItem(LS_DOC,JSON.stringify(doc));};
  const debounce=(ms,fn)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};
  const instanceIdOf=root=>root.closest('.grid-stack-item')?.dataset?.instanceId||('inst-'+Math.random().toString(36).slice(2));

  function dedupeByMeldung(list){
    const seen=new Set();
    return (Array.isArray(list)?list:[]).filter(item=>{
      const meldung=(item?.meldung||'').trim();
      if(!meldung) return false;
      if(seen.has(meldung)) return false;
      seen.add(meldung);
      return true;
    });
  }

  async function ensureLibrary(globalKey,promiseKey,urls){
    if(window[globalKey]) return;
    if(window[promiseKey]) return window[promiseKey];
    window[promiseKey]=(async()=>{
      let last;
      for(const url of urls){
        try{
          await new Promise((resolve,reject)=>{
            const script=document.createElement('script');
            script.src=url;
            script.async=true;
            script.onload=resolve;
            script.onerror=()=>reject(new Error('Failed to load '+url));
            document.head.appendChild(script);
          });
          if(window[globalKey]) return;
        }catch(err){last=err;}
      }
      throw last||new Error('Failed to load '+globalKey);
    })();
    return window[promiseKey];
  }

  const ensureXLSX=()=>ensureLibrary('XLSX','__XLSX_LOAD_PROMISE__',XLSX_URLS);
  const ensureSortable=()=>ensureLibrary('Sortable','__SORTABLE_LOAD_PROMISE__',SORTABLE_URLS);

  function idbOpen(){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(IDB_NAME,1);
      request.onupgradeneeded=()=>request.result.createObjectStore(IDB_STORE);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  async function idbSet(key,value){
    const db=await idbOpen();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(IDB_STORE,'readwrite');
      tx.objectStore(IDB_STORE).put(value,key);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  }
  async function idbGet(key){
    const db=await idbOpen();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(IDB_STORE,'readonly');
      const req=tx.objectStore(IDB_STORE).get(key);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
    });
  }
  async function idbDel(key){
    const db=await idbOpen();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(IDB_STORE,'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  }

  async function ensureRWPermission(handle){
    if(!handle?.queryPermission) return true;
    const q=await handle.queryPermission({mode:'readwrite'});
    if(q==='granted') return true;
    const r=await handle.requestPermission({mode:'readwrite'});
    return r==='granted';
  }

  async function ensureRPermission(handle){
    if(!handle?.queryPermission) return true;
    const q=await handle.queryPermission({mode:'read'});
    if(q==='granted') return true;
    const r=await handle.requestPermission({mode:'read'});
    return r==='granted';
  }

  async function saveGlobalDict(handle,name){
    try{await idbSet(GLOBAL_DICT_KEY,handle);}catch{}
    const doc=loadDoc();
    doc.general ||= {};
    doc.general.dictFileName=name;
    saveDoc(doc);
  }

  async function saveGlobalName(handle,name){
    try{await idbSet(GLOBAL_NAME_KEY,handle);}catch{}
    const doc=loadDoc();
    doc.general ||= {};
    doc.general.nameFileName=name;
    saveDoc(doc);
  }

  async function readItemsFromHandle(handle){
    await ensureXLSX();
    const file=await handle.getFile();
    if(file.size===0) return [];
    const buffer=await file.arrayBuffer();
    const workbook=XLSX.read(buffer,{type:'array'});
    const sheet=workbook.Sheets['Devices']||workbook.Sheets[workbook.SheetNames[0]];
    if(!sheet) return [];
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:''});
    const data=rows.slice(1).filter(row=>row.length && row[0] !== '');
    const items=data.map((row,index)=>({id:'it-'+index+'-'+Date.now().toString(36),meldung:String(row[0]||'')}));
    return dedupeByMeldung(items);
  }

  async function writeItemsToHandle(handle,items){
    await ensureXLSX();
    const unique=dedupeByMeldung(items);
    const workbook=XLSX.utils.book_new();
    const aoa=[['Meldung'],...unique.map(it=>[it.meldung])];
    const sheet=XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(workbook,sheet,'Devices');
    const output=XLSX.write(workbook,{bookType:'xlsx',type:'array'});
    const writable=await handle.createWritable();
    await writable.write(new Blob([output],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    await writable.close();
  }

  async function readDictFromHandle(handle){
    await ensureXLSX();
    const file=await handle.getFile();
    if(file.size===0) return {map:{},fields:DEFAULT_DICT_FIELDS};
    const buffer=await file.arrayBuffer();
    const workbook=XLSX.read(buffer,{type:'array'});
    const sheet=workbook.Sheets['records']||workbook.Sheets[workbook.SheetNames[0]];
    if(!sheet) return {map:{},fields:DEFAULT_DICT_FIELDS};
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
    const hdrRaw=rows[0]?.map(h=>String(h||'').trim())||[];
    const hdr=hdrRaw.map(h=>h.toLowerCase());
    const idxM=hdr.indexOf('meldung');
    const map={};
    rows.slice(1).forEach(row=>{
      const m=String(row[idxM]||'').trim();
      if(!m) return;
      const obj={};
      hdr.forEach((key,i)=>{obj[key]=String(row[i]||'');});
      map[m]=obj;
    });
    const fields=hdrRaw.map((label,i)=>({key:hdr[i],label:label||hdr[i]}));
    return {map,fields};
  }

  async function readNameRulesFromHandle(handle){
    await ensureXLSX();
    const file=await handle.getFile();
    if(file.size===0) return [];
    const buffer=await file.arrayBuffer();
    const workbook=XLSX.read(buffer,{type:'array'});
    const sheet=workbook.Sheets['Rules']||workbook.Sheets[workbook.SheetNames[0]];
    if(!sheet) return [];
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
    return rows.slice(1)
      .filter(row=>row.length && (row[0]!==''||row[1]!==''))
      .map(row=>({prefix:String(row[0]||''),name:String(row[1]||'')}))
      .sort((a,b)=>b.prefix.length-a.prefix.length);
  }

  const lookupName=(part,rules)=>{
    for(const rule of rules){
      if(part.startsWith(rule.prefix)) return rule.name;
    }
    return '';
  };

  function buildUI(root){
    root.innerHTML=`
      <div class="db-root">
        <div class="db-titlebar" style="display:none"></div>
        <div class="db-surface">
          <div class="db-list"></div>
        </div>
        <div class="db-footer">
          <button class="db-add" title="Neues Item">＋</button>
        </div>
      </div>

      <div class="db-modal">
        <div class="db-panel">
          <div class="db-row" style="justify-content:space-between; margin-bottom:.5rem">
            <div class="font-semibold">DeviceList – Optionen</div>
            <button class="db-btn secondary db-close">Schließen</button>
          </div>
          <div class="db-grid">
            <div class="db-field" style="grid-column: span 3;">
              <label>Datei</label>
              <div class="db-row">
                <button class="db-btn db-pick">Excel wählen</button>
                <button class="db-btn secondary db-create">Excel erstellen</button>
                <span class="db-file"></span>
              </div>
            </div>
            <div class="db-field" style="grid-column: span 3;">
              <label>Wörterbuch</label>
              <div class="db-row">
                <button class="db-btn db-dict-pick">Excel wählen</button>
                <span class="db-dict-file db-file"></span>
              </div>
            </div>
            <div class="db-field" style="grid-column: span 3;">
              <label>Namensregeln</label>
              <div class="db-row">
                <button class="db-btn db-name-pick">Excel wählen</button>
                <span class="db-name-file db-file"></span>
              </div>
            </div>
            <div class="db-field" style="grid-column: span 3;">
              <label>Titel (optional)</label>
              <input type="text" class="db-input db-title-input" placeholder="Kein Titel">
            </div>
            <div class="db-field">
              <label>Titel-Feld</label>
              <select class="db-input db-sel-title"></select>
            </div>
            <div class="db-field">
              <label>Untertitel-Feld</label>
              <select class="db-input db-sel-sub"></select>
            </div>
            <div class="db-field">
              <label>Hintergrund</label>
              <input type="color" class="db-color db-c-bg" value="#f5f7fb">
            </div>
            <div class="db-field">
              <label>Item Hintergrund</label>
              <input type="color" class="db-color db-c-item" value="#ffffff">
            </div>
            <div class="db-field">
              <label>Titelfarbe</label>
              <input type="color" class="db-color db-c-title" value="#2563eb">
            </div>
            <div class="db-field">
              <label>Untertitel-Farbe</label>
              <input type="color" class="db-color db-c-sub" value="#4b5563">
            </div>
            <div class="db-field">
              <label>Aktiv-Highlight</label>
              <input type="color" class="db-color db-c-active" value="#10b981">
            </div>
          </div>
          <div class="db-row" style="justify-content:flex-end; margin-top:.75rem">
            <button class="db-btn db-save">Speichern</button>
          </div>
        </div>
      </div>

      <div class="db-modal db-add-modal">
        <div class="db-panel">
          <div class="db-row" style="justify-content:space-between; margin-bottom:.5rem">
            <div class="font-semibold">Neues Item</div>
            <button class="db-btn secondary db-add-close">Schließen</button>
          </div>
          <div class="db-field" style="grid-column: span 3;">
            <label>Meldung</label>
            <input type="text" class="db-input db-add-input" />
          </div>
          <div class="db-row" style="justify-content:flex-end; margin-top:.75rem">
            <button class="db-btn db-add-save">Speichern</button>
          </div>
        </div>
      </div>
    `;

    const menu=document.createElement('div');
    menu.className='db-menu';
    menu.innerHTML=`<button class="mi mi-opt">⚙️ Optionen</button>`;
    document.body.appendChild(menu);

    return {
      rootVars:root.querySelector('.db-root'),
      titlebar:root.querySelector('.db-titlebar'),
      list:root.querySelector('.db-list'),
      add:root.querySelector('.db-add'),
      modal:root.querySelector('.db-modal'),
      close:root.querySelector('.db-close'),
      pick:root.querySelector('.db-pick'),
      create:root.querySelector('.db-create'),
      save:root.querySelector('.db-save'),
      fLabel:root.querySelector('.db-file'),
      dictPick:root.querySelector('.db-dict-pick'),
      dictLabel:root.querySelector('.db-dict-file'),
      namePick:root.querySelector('.db-name-pick'),
      nameLabel:root.querySelector('.db-name-file'),
      selTitle:root.querySelector('.db-sel-title'),
      selSub:root.querySelector('.db-sel-sub'),
      cBg:root.querySelector('.db-c-bg'),
      cItem:root.querySelector('.db-c-item'),
      cTitle:root.querySelector('.db-c-title'),
      cSub:root.querySelector('.db-c-sub'),
      cActive:root.querySelector('.db-c-active'),
      titleInput:root.querySelector('.db-title-input'),
      addModal:root.querySelector('.db-add-modal'),
      addClose:root.querySelector('.db-add-close'),
      addSave:root.querySelector('.db-add-save'),
      addInput:root.querySelector('.db-add-input'),
      menu
    };
  }

  function cardEl(item,cfg,dict,rules){
    const el=document.createElement('div');
    el.className='db-card';
    el.dataset.id=item.id;
    el.dataset.meldung=item.meldung||'';
    const data=dict[item.meldung]||{};
    const valueFor=field=>{
      if(field==='meldung') return item.meldung||'';
      if(field==='name') return lookupName(data.part||'',rules);
      return data[field]||'';
    };
    el.innerHTML=`
      <div class="db-flex">
        <div class="db-title">${valueFor(cfg.titleField)}</div>
        <div class="db-sub">${valueFor(cfg.subField)}</div>
      </div>
      <div class="db-handle" title="Ziehen">⋮⋮</div>
    `;
    return el;
  }

  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function getActiveMeldung(){return (loadDoc()?.general?.Meldung||'').trim();}

  function loadCfg(instanceId){
    const doc=loadDoc();
    const cfg=doc?.instances?.[instanceId]?.deviceBoard||{};
    const general=doc.general||{};
    return {
      idbKey:cfg.idbKey||`deviceBoard:${instanceId}`,
      dictIdbKey:cfg.dictIdbKey||`deviceBoardDict:${instanceId}`,
      nameIdbKey:cfg.nameIdbKey||`deviceBoardNames:${instanceId}`,
      fileName:cfg.fileName||'',
      dictFileName:cfg.dictFileName||general.dictFileName||'',
      nameFileName:cfg.nameFileName||general.nameFileName||'',
      titleField:cfg.titleField||'meldung',
      subField:cfg.subField||'auftrag',
      title:cfg.title||'',
      colors:cfg.colors||{bg:'#f5f7fb',item:'#ffffff',title:'#2563eb',sub:'#4b5563',active:'#10b981'}
    };
  }

  function saveCfg(instanceId,cfg){
    const doc=loadDoc();
    doc.instances ||= {};
    doc.instances[instanceId] ||= {};
    doc.instances[instanceId].deviceBoard={...cfg};
    saveDoc(doc);
  }

  function removeCfg(instanceId){
    const doc=loadDoc();
    if(doc?.instances && doc.instances[instanceId]){
      delete doc.instances[instanceId].deviceBoard;
      if(Object.keys(doc.instances[instanceId]).length===0) delete doc.instances[instanceId];
      saveDoc(doc);
    }
  }

  function applyColors(els,cfg){
    els.rootVars.style.setProperty('--dl-bg',cfg.colors.bg||'#f5f7fb');
    els.rootVars.style.setProperty('--dl-item-bg',cfg.colors.item||'#ffffff');
    els.rootVars.style.setProperty('--dl-title',cfg.colors.title||'#2563eb');
    els.rootVars.style.setProperty('--dl-sub',cfg.colors.sub||'#4b5563');
    els.rootVars.style.setProperty('--dl-active',cfg.colors.active||'#10b981');
  }

  function applyTitle(els,title){
    const text=(title||'').trim();
    if(!text){
      els.titlebar.style.display='none';
      els.titlebar.textContent='';
      return;
    }
    els.titlebar.textContent=text;
    els.titlebar.style.display='block';
  }

  window.renderExcelDeviceBoard=async function(root){
    if(!('showOpenFilePicker' in window) || !('showSaveFilePicker' in window)){
      root.innerHTML='<div class="p-2 text-sm">Dieses Modul benötigt die File System Access API (Chromium).</div>';
      return;
    }

    const els=buildUI(root);
    const instanceId=instanceIdOf(root);
    const cfg=loadCfg(instanceId);
    const state={
      instanceId,
      items:[],
      handles:{file:null,dict:null,name:null},
      dict:{data:{},fields:DEFAULT_DICT_FIELDS.slice(),loaded:false},
      names:{rules:[],loaded:false}
    };

    applyColors(els,cfg);
    applyTitle(els,cfg.title);
    els.cBg.value=cfg.colors.bg;
    els.cItem.value=cfg.colors.item;
    els.cTitle.value=cfg.colors.title;
    els.cSub.value=cfg.colors.sub;
    els.cActive.value=cfg.colors.active;
    els.titleInput.value=cfg.title;
    els.fLabel.textContent=cfg.fileName?`• ${cfg.fileName}`:'Keine Datei gewählt';
    els.dictLabel.textContent=cfg.dictFileName?`• ${cfg.dictFileName}`:'Kein Wörterbuch';
    els.nameLabel.textContent=cfg.nameFileName?`• ${cfg.nameFileName}`:'Keine Namensregeln';

    function updateFieldOptions(){
      const targets=[els.selTitle,els.selSub];
      targets.forEach(sel=>{sel.innerHTML='';});
      state.dict.fields.forEach(field=>{
        targets.forEach(sel=>{
          const opt=document.createElement('option');
          opt.value=field.key;
          opt.textContent=field.label;
          sel.appendChild(opt);
        });
      });
      if(state.names.rules.length){
        targets.forEach(sel=>{
          const opt=document.createElement('option');
          opt.value='name';
          opt.textContent='Name';
          sel.appendChild(opt);
        });
      }
      const valid=new Set(state.dict.fields.map(f=>f.key));
      if(state.names.rules.length) valid.add('name');
      let changed=false;
      if(!valid.has(cfg.titleField)){
        cfg.titleField=valid.values().next().value||'meldung';
        changed=true;
      }
      if(!valid.has(cfg.subField)){
        cfg.subField=valid.has(cfg.titleField)?cfg.titleField:(valid.values().next().value||'meldung');
        changed=true;
      }
      els.selTitle.value=cfg.titleField;
      els.selSub.value=cfg.subField;
      if(changed) saveCfg(instanceId,cfg);
    }

    function updateHighlights(){
      const active=getActiveMeldung();
      Array.from(els.list.children).forEach(node=>{
        const m=(node.dataset.meldung||'').trim();
        node.classList.toggle('active',active && m===active);
      });
    }

    function renderList(){
      state.items=dedupeByMeldung(state.items);
      els.list.innerHTML='';
      state.items.forEach(item=>{
        const card=cardEl(item,cfg,state.dict.data,state.names.rules);
        els.list.appendChild(card);
      });
      updateHighlights();
    }

    function syncFromDOM(){
      state.items=Array.from(els.list.children).map(node=>(
        {id:node.dataset.id,meldung:(node.dataset.meldung||'').trim()}
      ));
      state.items=dedupeByMeldung(state.items);
    }

    const scheduleSave=debounce(250,async()=>{
      if(!state.handles.file) return;
      state.items=dedupeByMeldung(state.items);
      try{await writeItemsToHandle(state.handles.file,state.items);}catch(err){console.warn('Save failed',err);}
    });

    function setItems(items){
      state.items=dedupeByMeldung(items);
      renderList();
      scheduleSave();
    }

    function setFileHandle(handle){
      state.handles.file=handle;
      cfg.fileName=handle?.name||cfg.fileName||'devices.xlsx';
      els.fLabel.textContent=`• ${cfg.fileName}`;
      saveCfg(instanceId,cfg);
    }

    function setDictHandle(handle){
      state.handles.dict=handle;
      cfg.dictFileName=handle?.name||cfg.dictFileName||'dictionary.xlsx';
      els.dictLabel.textContent=`• ${cfg.dictFileName}`;
      saveCfg(instanceId,cfg);
    }

    function setNameHandle(handle){
      state.handles.name=handle;
      cfg.nameFileName=handle?.name||cfg.nameFileName||'namerules.xlsx';
      els.nameLabel.textContent=`• ${cfg.nameFileName}`;
      saveCfg(instanceId,cfg);
    }

    async function bindHandle(handle){
      const ok=await ensureRWPermission(handle);
      if(!ok) return false;
      await idbSet(cfg.idbKey,handle);
      setFileHandle(handle);
      return true;
    }

    async function pickExcel(){
      try{
        const [handle]=await window.showOpenFilePicker({
          types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],
          multiple:false
        });
        if(!handle) return;
        if(!(await bindHandle(handle))) return;
        const items=await readItemsFromHandle(handle);
        setItems(items);
      }catch(err){if(err?.name!=='AbortError') console.warn(err);}
    }

    async function createExcel(){
      try{
        const handle=await window.showSaveFilePicker({
          suggestedName:'devices.xlsx',
          types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}]
        });
        if(!handle) return;
        if(!(await bindHandle(handle))) return;
        state.items=[];
        await writeItemsToHandle(handle,state.items);
        renderList();
      }catch(err){if(err?.name!=='AbortError') console.warn(err);}
    }

    async function bindDictHandle(handle){
      const ok=await ensureRPermission(handle);
      if(!ok) return false;
      await idbSet(cfg.dictIdbKey,handle);
      setDictHandle(handle);
      try{
        const res=await readDictFromHandle(handle);
        state.dict.data=res.map;
        state.dict.fields=res.fields;
        state.dict.loaded=true;
      }catch(err){console.warn('Dict read failed',err);state.dict={data:{},fields:DEFAULT_DICT_FIELDS.slice(),loaded:false};}
      updateFieldOptions();
      renderList();
      saveGlobalDict(handle,cfg.dictFileName);
      return true;
    }

    async function pickDict(){
      try{
        const [handle]=await window.showOpenFilePicker({
          types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],
          multiple:false
        });
        if(!handle) return;
        await bindDictHandle(handle);
      }catch(err){if(err?.name!=='AbortError') console.warn(err);}
    }

    async function bindNameHandle(handle){
      const ok=await ensureRPermission(handle);
      if(!ok) return false;
      await idbSet(cfg.nameIdbKey,handle);
      setNameHandle(handle);
      try{state.names.rules=await readNameRulesFromHandle(handle);state.names.loaded=true;}
      catch(err){console.warn('Name rules read failed',err);state.names={rules:[],loaded:false};}
      updateFieldOptions();
      renderList();
      saveGlobalName(handle,cfg.nameFileName);
      return true;
    }

    async function pickName(){
      try{
        const [handle]=await window.showOpenFilePicker({
          types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],
          multiple:false
        });
        if(!handle) return;
        await bindNameHandle(handle);
      }catch(err){if(err?.name!=='AbortError') console.warn(err);}
    }

    els.pick.addEventListener('click',pickExcel);
    els.create.addEventListener('click',createExcel);
    els.dictPick.addEventListener('click',pickDict);
    els.namePick.addEventListener('click',pickName);

    els.selTitle.addEventListener('change',()=>{
      cfg.titleField=els.selTitle.value;
      saveCfg(instanceId,cfg);
      renderList();
    });
    els.selSub.addEventListener('change',()=>{
      cfg.subField=els.selSub.value;
      saveCfg(instanceId,cfg);
      renderList();
    });

    els.save.addEventListener('click',()=>{
      cfg.colors={bg:els.cBg.value,item:els.cItem.value,title:els.cTitle.value,sub:els.cSub.value,active:els.cActive.value};
      cfg.title=els.titleInput.value||'';
      applyColors(els,cfg);
      applyTitle(els,cfg.title);
      saveCfg(instanceId,cfg);
      renderList();
      closeModal();
    });

    els.close.addEventListener('click',closeModal);

    function openModal(){
      els.titleInput.value=cfg.title||'';
      els.cBg.value=cfg.colors.bg;
      els.cItem.value=cfg.colors.item;
      els.cTitle.value=cfg.colors.title;
      els.cSub.value=cfg.colors.sub;
      els.cActive.value=cfg.colors.active;
      els.selTitle.value=cfg.titleField;
      els.selSub.value=cfg.subField;
      els.modal.classList.add('open');
    }
    function closeModal(){els.modal.classList.remove('open');}

    function openAdd(){els.addModal.classList.add('open');els.addInput.value='';}
    function closeAdd(){els.addModal.classList.remove('open');}

    els.add.addEventListener('click',openAdd);
    els.addClose.addEventListener('click',closeAdd);
    els.addSave.addEventListener('click',()=>{
      const meldung=(els.addInput.value||'').trim();
      if(!meldung){closeAdd();return;}
      const item={id:'it-'+Math.random().toString(36).slice(2),meldung};
      state.items.push(item);
      state.items=dedupeByMeldung(state.items);
      renderList();
      scheduleSave();
      closeAdd();
    });
    els.addInput.addEventListener('keydown',e=>{if(e.key==='Enter') els.addSave.click();});

    els.list.addEventListener('click',event=>{
      if(event.target.closest('.db-handle')) return;
      const card=event.target.closest('.db-card');
      if(!card) return;
      const meld=(card.dataset.meldung||'').trim();
      const doc=loadDoc();
      doc.general ||= {};
      if(doc.general.Meldung!==meld){
        doc.general.Meldung=meld;
        saveDoc(doc);
        updateHighlights();
        window.dispatchEvent(new Event(CUSTOM_BROADCAST));
      }
    });

    els.menu.addEventListener('click',()=>{closeMenu();openModal();});
    function openMenuAt(x,y){
      const pad=8;const vw=window.innerWidth;const vh=window.innerHeight;
      const w=200;const h=44;
      els.menu.style.left=clamp(x,pad,vw-w-pad)+'px';
      els.menu.style.top=clamp(y,pad,vh-h-pad)+'px';
      els.menu.classList.add('open');
    }
    function closeMenu(){els.menu.classList.remove('open');}

    root.addEventListener('contextmenu',event=>{
      event.preventDefault();event.stopPropagation();
      openMenuAt(event.clientX,event.clientY);
    });
    window.addEventListener('click',()=>closeMenu());
    window.addEventListener('keydown',event=>{if(event.key==='Escape') closeMenu();});

    updateFieldOptions();
    renderList();

    try{
      await ensureSortable();
    }catch(err){
      console.error('Sortable load failed',err);
      return;
    }

    const sortable=new Sortable(els.list,{
      group:{name:GROUP_NAME,pull:true,put:true},
      animation:150,
      handle:'.db-handle',
      draggable:'.db-card',
      ghostClass:'db-ghost',
      chosenClass:'db-chosen',
      onSort:()=>{syncFromDOM();renderList();scheduleSave();},
      onAdd:()=>{syncFromDOM();renderList();scheduleSave();updateHighlights();},
      onRemove:()=>{syncFromDOM();renderList();scheduleSave();}
    });

    window.addEventListener('storage',event=>{if(event.key===LS_DOC) updateHighlights();});
    window.addEventListener(CUSTOM_BROADCAST,updateHighlights);

    (async()=>{
      try{
        const handle=await idbGet(cfg.idbKey);
        if(handle && await ensureRWPermission(handle)){
          setFileHandle(handle);
          state.items=await readItemsFromHandle(handle);
          renderList();
        }
      }catch(err){console.warn('Restore failed',err);}
    })();

    (async()=>{
      try{
        let handle=await idbGet(cfg.dictIdbKey);
        if(!handle){
          handle=await idbGet(GLOBAL_DICT_KEY);
          if(handle){
            await idbSet(cfg.dictIdbKey,handle);
            if(!cfg.dictFileName){
              const general=loadDoc().general||{};
              cfg.dictFileName=general.dictFileName||handle.name||'dictionary.xlsx';
              saveCfg(instanceId,cfg);
              els.dictLabel.textContent=`• ${cfg.dictFileName}`;
            }
          }
        }
        if(handle && await ensureRPermission(handle)){
          await bindDictHandle(handle);
        }
      }catch(err){console.warn('Dict restore failed',err);}
    })();

    (async()=>{
      try{
        let handle=await idbGet(cfg.nameIdbKey);
        if(!handle){
          handle=await idbGet(GLOBAL_NAME_KEY);
          if(handle){
            await idbSet(cfg.nameIdbKey,handle);
            if(!cfg.nameFileName){
              const general=loadDoc().general||{};
              cfg.nameFileName=general.nameFileName||handle.name||'namerules.xlsx';
              saveCfg(instanceId,cfg);
              els.nameLabel.textContent=`• ${cfg.nameFileName}`;
            }
          }
        }
        if(handle && await ensureRPermission(handle)){
          await bindNameHandle(handle);
        }
      }catch(err){console.warn('Name rules restore failed',err);}
    })();

    const observer=new MutationObserver(()=>{
      if(!document.body.contains(root)){
        try{sortable.destroy();}catch{}
        els.menu?.remove();
        (async()=>{
          try{await idbDel(cfg.idbKey);}catch{}
          try{await idbDel(cfg.dictIdbKey);}catch{}
          try{await idbDel(cfg.nameIdbKey);}catch{}
          try{removeCfg(instanceId);}catch{}
        })();
        observer.disconnect();
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
  };

})();
