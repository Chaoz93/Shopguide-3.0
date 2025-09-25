/* Excel-basierte Geräteliste, dedupliziert nach Meldung */
(function(){
  'use strict';

  if(!document.getElementById('unit-board-styles')){
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
    .db-card.ctx-target{outline:2px solid var(--dl-active); outline-offset:2px;}
    .db-btn{background:var(--button-bg); color:var(--button-text); padding:.35rem .6rem; border-radius:.5rem; font-size:.875rem}
    .db-btn.secondary{background: rgba(255,255,255,.14); color: var(--text-color);}
    .db-add{align-self:center; border-radius:9999px; width:2.2rem; height:2.2rem; display:flex; align-items:center; justify-content:center;
            background:linear-gradient(135deg,#2563eb,#7c3aed); color:#fff; box-shadow:0 10px 22px rgba(79,70,229,.28);
            border:2px solid rgba(255,255,255,.7); transition:transform .15s ease, box-shadow .15s ease;}
    .db-add:hover{transform:translateY(-1px); box-shadow:0 14px 30px rgba(79,70,229,.36);}
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
    .db-sub-list{display:flex; flex-direction:column; gap:.4rem;}
    .db-sub-row{display:flex; gap:.5rem; align-items:center;}
    .db-sub-row select{flex:1;}
    .db-sub-remove{padding:.35rem .6rem;}
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
    .db-part-list{max-height:240px; overflow:auto; padding:.25rem .5rem; display:flex; flex-direction:column; gap:.25rem;}
    .db-check{display:flex; align-items:center; gap:.45rem; font-size:.85rem;}
    `;
    const tag=document.createElement('style');
    tag.id='unit-board-styles';
    tag.textContent=css;
    document.head.appendChild(tag);
  }

  const LS_DOC='module_data_v1';
  const IDB_NAME='modulesApp';
  const IDB_STORE='fs-handles';
  const GROUP_NAME='unitBoardGroup';
  const CUSTOM_BROADCAST='unitBoard:update';
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

  function setupUnitBoardShared(shared){
    shared=shared||{};
    shared.aspenRecords=shared.aspenRecords instanceof Map?shared.aspenRecords:new Map();

    if(!shared.ensureXlsxLoader){
      shared.ensureXlsxLoader=async function(loader){
        const ensure=loader||shared.ensureXLSX;
        if(typeof ensure==='function'){
          await ensure();
          return;
        }
        if(!window.XLSX) throw new Error('XLSX nicht verfügbar');
      };
    }

    if(!shared.requestRW){
      shared.requestRW=async function(handle){
        if(!handle?.queryPermission) return true;
        try{
          const state=await handle.queryPermission({mode:'readwrite'});
          if(state==='granted') return true;
          const next=await handle.requestPermission({mode:'readwrite'});
          return next==='granted';
        }catch(err){
          console.warn('[UnitBoard] Dateizugriff fehlgeschlagen',err);
          return false;
        }
      };
    }

    if(!shared.appendToDictionary){
      shared.appendToDictionary=async function(handle,dataRow,loader){
        if(!handle){
          console.warn('[UnitBoard] Kein Dictionary-Handle gewählt – Eintrag übersprungen');
          return false;
        }
        const granted=await shared.requestRW(handle);
        if(!granted){
          console.warn('[UnitBoard] Schreibrechte für Dictionary.xlsx nicht erteilt');
          return false;
        }
        const safeRow=dataRow&&typeof dataRow==='object'?dataRow:{};
        if(!Object.keys(safeRow).length){
          console.warn('[UnitBoard] Dictionary: Datensatz leer, nichts zu schreiben');
          return false;
        }
        try{await shared.ensureXlsxLoader(loader);}catch(err){
          console.warn('[UnitBoard] XLSX konnte nicht geladen werden',err);
          return false;
        }
        try{
          const file=await handle.getFile();
          let workbook;
          if(file.size>0){
            const buffer=await file.arrayBuffer();
            workbook=XLSX.read(buffer,{type:'array'});
          }else{
            workbook=XLSX.utils.book_new();
          }
          const sheetName='records';
          const sheet=workbook.Sheets[sheetName];
          const rows=sheet?XLSX.utils.sheet_to_json(sheet,{header:1,defval:''}):[];
          const headerRaw=Array.isArray(rows[0])?rows[0].map(cell=>String(cell??'')):
            [];
          const columns=headerRaw.map((label,idx)=>{
            const raw=String(label||'');
            const trimmed=raw.trim();
            return {
              key:trimmed||`Column${idx+1}`,
              lower:(trimmed||`Column${idx+1}`).toLowerCase(),
              label:raw.length?raw:(trimmed||`Column${idx+1}`)
            };
          });
          const usedLower=new Set(columns.map(col=>col.lower));
          const dataKeys=Object.keys(safeRow).filter(Boolean);
          dataKeys.forEach(key=>{
            const lower=key.toLowerCase();
            if(usedLower.has(lower)) return;
            usedLower.add(lower);
            columns.push({key,lower,label:key});
          });
          if(!columns.length){
            dataKeys.forEach((key,idx)=>{
              const fallback=key||`Column${idx+1}`;
              const lower=fallback.toLowerCase();
              if(usedLower.has(lower)) return;
              usedLower.add(lower);
              columns.push({key:fallback,lower,label:fallback});
            });
          }
          const existingRows=rows.slice(1).map(row=>{
            const arr=new Array(columns.length).fill('');
            row.forEach((value,idx)=>{if(idx<columns.length) arr[idx]=String(value??'');});
            return arr;
          });
          const keyLookup=new Map();
          dataKeys.forEach(key=>keyLookup.set(key.toLowerCase(),key));
          const newRow=columns.map(col=>{
            const match=keyLookup.get(col.lower);
            const key=match||col.key;
            return String(safeRow[key]??safeRow[col.key]??'');
          });
          existingRows.push(newRow);
          const headerOut=columns.map(col=>col.label);
          const aoa=[headerOut,...existingRows];
          const sheetOut=XLSX.utils.aoa_to_sheet(aoa);
          workbook.Sheets[sheetName]=sheetOut;
          if(!workbook.SheetNames.includes(sheetName)) workbook.SheetNames.push(sheetName);
          const output=XLSX.write(workbook,{bookType:'xlsx',type:'array'});
          const writable=await handle.createWritable();
          await writable.write(new Blob([output],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
          await writable.close();
          return true;
        }catch(err){
          console.warn('[UnitBoard] Dictionary.xlsx konnte nicht aktualisiert werden',err);
          return false;
        }
      };
    }

    if(!shared.addToDevices){
      shared.addToDevices=async function(handle,meldung,loader){
        const id=String(meldung||'').trim();
        if(!id){
          console.warn('[UnitBoard] Meldung leer – kein Eintrag in Devices.xlsx');
          return false;
        }
        if(!handle){
          console.warn('[UnitBoard] Keine Geräte-Datei gewählt – Eintrag übersprungen');
          return false;
        }
        const granted=await shared.requestRW(handle);
        if(!granted){
          console.warn('[UnitBoard] Schreibrechte für Devices.xlsx nicht erteilt');
          return false;
        }
        try{await shared.ensureXlsxLoader(loader);}catch(err){
          console.warn('[UnitBoard] XLSX konnte nicht geladen werden',err);
          return false;
        }
        try{
          const file=await handle.getFile();
          let workbook;
          if(file.size>0){
            const buffer=await file.arrayBuffer();
            workbook=XLSX.read(buffer,{type:'array'});
          }else{
            workbook=XLSX.utils.book_new();
          }
          const sheetName='Units';
          const sheet=workbook.Sheets[sheetName]||workbook.Sheets[workbook.SheetNames[0]];
          const rows=sheet?XLSX.utils.sheet_to_json(sheet,{header:1,defval:''}):[];
          let header=rows[0]&&rows[0].length?rows[0].map(cell=>String(cell??'')):[];
          if(!header.length) header=['Meldung'];
          const seen=new Set();
          const body=[];
          rows.slice(1).forEach(row=>{
            const value=String(row[0]??'').trim();
            if(!value) return;
            if(seen.has(value)) return;
            seen.add(value);
            body.push([value]);
          });
          if(!seen.has(id)) body.push([id]);
          if(!body.length) body.push([id]);
          const aoa=[header,...body];
          const sheetOut=XLSX.utils.aoa_to_sheet(aoa);
          workbook.Sheets[sheetName]=sheetOut;
          if(!workbook.SheetNames.includes(sheetName)) workbook.SheetNames.push(sheetName);
          const output=XLSX.write(workbook,{bookType:'xlsx',type:'array'});
          const writable=await handle.createWritable();
          await writable.write(new Blob([output],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
          await writable.close();
          return true;
        }catch(err){
          console.warn('[UnitBoard] Devices.xlsx konnte nicht aktualisiert werden',err);
          return false;
        }
      };
    }

    if(!shared.publishAspenItems){
      shared.publishAspenItems=function(instanceId,items){
        if(!instanceId) return;
        const map=new Map();
        (Array.isArray(items)?items:[]).forEach(item=>{
          if(!item) return;
          const meldung=String(item.meldung||'').trim();
          if(!meldung) return;
          map.set(meldung,item);
        });
        shared.aspenRecords.set(instanceId,map);
      };
    }

    if(!shared.clearAspenItems){
      shared.clearAspenItems=function(instanceId){
        if(!instanceId) return;
        shared.aspenRecords.delete(instanceId);
      };
    }

    if(!shared.findAspenItem){
      shared.findAspenItem=function(meldung){
        const key=String(meldung||'').trim();
        if(!key) return null;
        for(const map of shared.aspenRecords.values()){
          const entry=map.get(key);
          if(entry) return entry;
        }
        return null;
      };
    }

    if(!shared.handleAspenToDeviceDrop){
      shared.handleAspenToDeviceDrop=async function(evt,context){
        if(!evt) return {dict:false,devices:false,meldung:''};
        const toType=(evt.to?.dataset?.boardType||'').toLowerCase();
        const fromType=(evt.from?.dataset?.boardType||'').toLowerCase();
        if(toType!=='excel-unit' || fromType!=='aspen-unit'){
          return {dict:false,devices:false,meldung:''};
        }
        const meldung=(evt.item?.dataset?.meldung||'').trim();
        if(!meldung){
          console.warn('[UnitBoard] Meldung beim Drag&Drop nicht gefunden');
          return {dict:false,devices:false,meldung:''};
        }
        const ensure=context?.ensureXLSX||shared.ensureXLSX;
        let sourceItem=null;
        try{sourceItem=shared.findAspenItem(meldung);}catch(err){console.warn('[UnitBoard] Aspen-Lookup fehlgeschlagen',err);}
        if(!sourceItem && evt.item && evt.item.__aspenItem) sourceItem=evt.item.__aspenItem;
        const dataRow=sourceItem&&typeof sourceItem==='object'
          ? (sourceItem.data&&typeof sourceItem.data==='object'?sourceItem.data:sourceItem)
          : null;
        if(!dataRow){
          console.warn('[UnitBoard] Kein Aspen-Datensatz für Meldung',meldung,'gefunden');
        }
        const dictHandle=typeof context?.getDictHandle==='function'?context.getDictHandle():context?.dictHandle;
        const deviceHandle=typeof context?.getDeviceHandle==='function'?context.getDeviceHandle():context?.deviceHandle;
        let dictResult=false;
        if(dataRow){
          if(dictHandle){
            try{dictResult=await shared.appendToDictionary(dictHandle,dataRow,ensure);}catch(err){console.warn('[UnitBoard] Dictionary-Sync fehlgeschlagen',err);}
          }else{
            console.warn('[UnitBoard] Kein Dictionary-Handle verfügbar – Meldung',meldung,'wird nicht übernommen');
          }
        }
        let devicesResult=false;
        if(deviceHandle){
          try{devicesResult=await shared.addToDevices(deviceHandle,meldung,ensure);}catch(err){console.warn('[UnitBoard] Geräte-Liste konnte nicht aktualisiert werden',err);}
        }else{
          console.warn('[UnitBoard] Keine Geräte-Datei verbunden – Meldung',meldung,'konnte nicht gesichert werden');
        }
        if(dictResult||devicesResult){
          try{console.info('[SYNC]','Meldung',meldung,'von Aspen -> Geräteliste, Dictionary+Devices aktualisiert');}catch{}
        }
        return {dict:dictResult,devices:devicesResult,meldung};
      };
    }

    return shared;
  }

  const SHARED=setupUnitBoardShared(window.__UNIT_BOARD_SHARED__||{});
  window.__UNIT_BOARD_SHARED__=SHARED;
  if(typeof ensureXLSX==='function' && !SHARED.ensureXLSX){
    SHARED.ensureXLSX=ensureXLSX;
  }

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
    const sheet=workbook.Sheets['Units']||workbook.Sheets[workbook.SheetNames[0]];
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
    XLSX.utils.book_append_sheet(workbook,sheet,'Units');
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

  async function readAspenFromHandle(handle){
    await ensureXLSX();
    const file=await handle.getFile();
    if(file.size===0) return {map:{}};
    const buffer=await file.arrayBuffer();
    const workbook=XLSX.read(buffer,{type:'array'});
    const sheet=workbook.Sheets[workbook.SheetNames[0]];
    if(!sheet) return {map:{}};
    const rows=XLSX.utils.sheet_to_json(sheet,{defval:''});
    const map={};
    rows.forEach(row=>{
      const meld=String(row['MELDUNGS_NO']||row['meldung']||'').trim();
      if(!meld) return;
      map[meld]=row;
    });
    return {map};
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
            <div class="font-semibold">UnitList – Optionen</div>
            <button class="db-btn secondary db-close">Schließen</button>
          </div>
          <div class="db-grid">
            <div class="db-field" style="grid-column: span 3;">
              <label>Devices.xlsx</label>
              <div class="db-row">
                <button class="db-btn db-pick">Devices.xlsx wählen</button>
                <button class="db-btn secondary db-create">Devices.xlsx erstellen</button>
                <span class="db-file"></span>
              </div>
            </div>
            <div class="db-field" style="grid-column: span 3;">
              <label>Dictionary</label>
              <div class="db-row">
                <button class="db-btn db-dict-pick">Dictionary.xlsx wählen</button>
                <span class="db-dict-file db-file"></span>
              </div>
            </div>
            <div class="db-field" style="grid-column: span 3;">
              <label>Aspen</label>
              <div class="db-row">
                <button class="db-btn db-aspen-pick">Aspen wählen</button>
                <span class="db-aspen-file db-file"></span>
              </div>
            </div>
            <div class="db-field" style="grid-column: span 3;">
              <label>Namensregeln</label>
              <div class="db-row">
                <button class="db-btn db-name-pick">Namensregeln.xlsx wählen</button>
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
              <label>Part-Feld</label>
              <select class="db-input db-sel-part"></select>
            </div>
            <div class="db-field" style="grid-column: span 3;">
              <label>Untertitel-Felder</label>
              <div class="db-sub-list"></div>
              <button type="button" class="db-btn secondary db-sub-add">Feld hinzufügen</button>
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
    menu.innerHTML='<div class="mi mi-opt">⚙️ Optionen</div><div class="mi mi-pick">Devices.xlsx wählen</div><div class="mi mi-disable">Alle deaktivieren</div><div class="mi mi-delete">🗑️ Gerät löschen</div><div class="db-part-list"></div>';
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
      aspenPick:root.querySelector('.db-aspen-pick'),
      aspenLabel:root.querySelector('.db-aspen-file'),
      namePick:root.querySelector('.db-name-pick'),
      nameLabel:root.querySelector('.db-name-file'),
      titleInput:root.querySelector('.db-title-input'),
      selTitle:root.querySelector('.db-sel-title'),
      selPart:root.querySelector('.db-sel-part'),
      subList:root.querySelector('.db-sub-list'),
      subAdd:root.querySelector('.db-sub-add'),
      cBg:root.querySelector('.db-c-bg'),
      cItem:root.querySelector('.db-c-item'),
      cTitle:root.querySelector('.db-c-title'),
      cSub:root.querySelector('.db-c-sub'),
      cActive:root.querySelector('.db-c-active'),
      addModal:root.querySelector('.db-add-modal'),
      addClose:root.querySelector('.db-add-close'),
      addSave:root.querySelector('.db-add-save'),
      addInput:root.querySelector('.db-add-input'),
      menu,
      menuOpt:menu.querySelector('.mi-opt'),
      menuPick:menu.querySelector('.mi-pick'),
      menuDisable:menu.querySelector('.mi-disable'),
      partList:menu.querySelector('.db-part-list'),
      menuDelete:menu.querySelector('.mi-delete')
    };
  }

  function cardEl(item,cfg,state,partValue){
    const el=document.createElement('div');
    el.className='db-card';
    el.dataset.id=item.id;
    el.dataset.meldung=item.meldung||'';
    const data=(state.aspen.data[item.meldung]||state.dict.data[item.meldung]||{});
    const part=(partValue||'').trim();
    const valueFor=field=>{
      if(field==='meldung') return (item.meldung||'').trim();
      if(field==='name') return lookupName(part,state.names.rules);
      return String(data[field]??'').trim();
    };
    const subs=Array.isArray(cfg.subFields)&&cfg.subFields.length?cfg.subFields:[cfg.titleField||'meldung'];
    const subHtml=subs
      .map(field=>valueFor(field))
      .filter(text=>String(text||'').trim()!=='')
      .map(text=>`<div class="db-sub-line">${text}</div>`)
      .join('');
    el.innerHTML=`
      <div class="db-flex">
        <div class="db-title">${valueFor(cfg.titleField)}</div>
        <div class="db-sub">${subHtml}</div>
      </div>
      <div class="db-handle" title="Ziehen">⋮⋮</div>
    `;
    el.dataset.part=part;
    return el;
  }

  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function getActiveMeldung(){return (loadDoc()?.general?.Meldung||'').trim();}

  function loadCfg(instanceId){
    const doc=loadDoc();
    const cfg=doc?.instances?.[instanceId]?.unitBoard||{};
    const general=doc.general||{};
    const subFields=Array.isArray(cfg.subFields)&&cfg.subFields.length
      ? cfg.subFields.slice()
      : [cfg.subField||'auftrag'];
    return {
      idbKey:cfg.idbKey||`unitBoard:${instanceId}`,
      dictIdbKey:cfg.dictIdbKey||`unitBoardDict:${instanceId}`,
      nameIdbKey:cfg.nameIdbKey||`unitBoardNames:${instanceId}`,
      aspenIdbKey:cfg.aspenIdbKey||`unitBoardAspen:${instanceId}`,
      fileName:cfg.fileName||'',
      dictFileName:cfg.dictFileName||general.dictFileName||'',
      nameFileName:cfg.nameFileName||general.nameFileName||'',
      aspenFileName:cfg.aspenFileName||'',
      titleField:cfg.titleField||'meldung',
      partField:cfg.partField||'part',
      subFields:subFields,
      excludedParts:Array.isArray(cfg.excludedParts)?cfg.excludedParts.slice():[],
      title:cfg.title||'',
      colors:cfg.colors||{bg:'#f5f7fb',item:'#ffffff',title:'#2563eb',sub:'#4b5563',active:'#10b981'}
    };
  }

  function saveCfg(instanceId,cfg){
    const doc=loadDoc();
    doc.instances ||= {};
    doc.instances[instanceId] ||= {};
    const payload={
      ...cfg,
      subFields:Array.isArray(cfg.subFields)?cfg.subFields.slice():[],
      subField:Array.isArray(cfg.subFields)&&cfg.subFields.length?cfg.subFields[0]:'auftrag',
      excludedParts:Array.isArray(cfg.excludedParts)?cfg.excludedParts.slice():[],
    };
    doc.instances[instanceId].unitBoard=payload;
    saveDoc(doc);
  }

  function removeCfg(instanceId){
    const doc=loadDoc();
    if(doc?.instances && doc.instances[instanceId]){
      delete doc.instances[instanceId].unitBoard;
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

  window.renderExcelUnitBoard=async function(root){
    if(!('showOpenFilePicker' in window) || !('showSaveFilePicker' in window)){
      root.innerHTML='<div class="p-2 text-sm">Dieses Modul benötigt die File System Access API (Chromium).</div>';
      return;
    }

    const els=buildUI(root);
    els.list.dataset.boardType='excel-unit';
    const instanceId=instanceIdOf(root);
    const cfg=loadCfg(instanceId);
    const state={
      instanceId,
      items:[],
      handles:{file:null,dict:null,name:null,aspen:null},
      dict:{data:{},fields:DEFAULT_DICT_FIELDS.slice(),loaded:false},
      aspen:{data:{},loaded:false},
      names:{rules:[],loaded:false},
      excluded:new Set((cfg.excludedParts||[]).map(part=>String(part??'').trim()))
    };

    let tempSubFields=[];

    applyColors(els,cfg);
    applyTitle(els,cfg.title);
    els.cBg.value=cfg.colors.bg;
    els.cItem.value=cfg.colors.item;
    els.cTitle.value=cfg.colors.title;
    els.cSub.value=cfg.colors.sub;
    els.cActive.value=cfg.colors.active;
    els.titleInput.value=cfg.title;
    els.fLabel.textContent=cfg.fileName?`• ${cfg.fileName}`:'Keine Datei gewählt';
    els.dictLabel.textContent=cfg.dictFileName?`• ${cfg.dictFileName}`:'Kein Dictionary';
    els.aspenLabel.textContent=cfg.aspenFileName?`• ${cfg.aspenFileName}`:'Keine Aspen-Datei';
    els.nameLabel.textContent=cfg.nameFileName?`• ${cfg.nameFileName}`:'Keine Namensregeln';

    const arraysEqual=(a,b)=>{
      if(!Array.isArray(a) || !Array.isArray(b)) return false;
      if(a.length!==b.length) return false;
      for(let i=0;i<a.length;i++){if(a[i]!==b[i]) return false;}
      return true;
    };

    function uniqueFields(list){
      const seen=new Set();
      const out=[];
      (Array.isArray(list)?list:[]).forEach(field=>{
        if(!field) return;
        const key=String(field.key||'').trim();
        if(!key || seen.has(key)) return;
        seen.add(key);
        out.push({key,label:field.label||key});
      });
      return out;
    }

    function baseFieldOptions(){
      const src=state.dict.fields&&state.dict.fields.length?state.dict.fields:DEFAULT_DICT_FIELDS;
      const list=uniqueFields(src);
      if(!list.some(f=>f.key==='meldung')) list.unshift({key:'meldung',label:'Meldung'});
      return list;
    }

    function titleFieldOptions(){
      const base=baseFieldOptions();
      if(state.names.rules.length && !base.some(f=>f.key==='name')) base.push({key:'name',label:'Name'});
      return base;
    }

    function partFieldOptions(){
      return baseFieldOptions();
    }

    function fillSelect(select,options,value){
      if(!select) return;
      select.innerHTML='';
      options.forEach(opt=>{
        const option=document.createElement('option');
        option.value=opt.key;
        option.textContent=opt.label||opt.key;
        select.appendChild(option);
      });
      if(!options.length){
        select.value='';
        return;
      }
      const fallback=options[0].key;
      const target=options.some(opt=>opt.key===value)?value:fallback;
      select.value=target;
    }

    function updateFieldOptions(){
      const titleOpts=titleFieldOptions();
      const partOpts=partFieldOptions();
      const titleKeys=new Set(titleOpts.map(opt=>opt.key));
      const partKeys=new Set(partOpts.map(opt=>opt.key));
      let changed=false;

      if(!titleKeys.has(cfg.titleField)){
        cfg.titleField=titleOpts[0]?.key||'meldung';
        changed=true;
      }

      let sanitizedSubs=(Array.isArray(cfg.subFields)?cfg.subFields:[])
        .filter(field=>titleKeys.has(field));
      const seenSubs=new Set();
      sanitizedSubs=sanitizedSubs.filter(field=>{
        if(seenSubs.has(field)) return false;
        seenSubs.add(field);
        return true;
      });
      if(!sanitizedSubs.length){
        const fallback=titleKeys.has('auftrag')?'auftrag':cfg.titleField||titleOpts[0]?.key||'meldung';
        sanitizedSubs.push(fallback);
      }
      if(!arraysEqual(sanitizedSubs,cfg.subFields||[])){
        cfg.subFields=sanitizedSubs.slice();
        changed=true;
      }

      if(!partKeys.has(cfg.partField)){
        const fallback=partOpts.find(opt=>/part/.test(opt.key))||partOpts[0]||{key:'meldung'};
        cfg.partField=fallback.key;
        changed=true;
      }

      fillSelect(els.selTitle,titleOpts,cfg.titleField);
      fillSelect(els.selPart,partOpts,cfg.partField);

      if(changed){
        cfg.excludedParts=Array.from(state.excluded);
        saveCfg(instanceId,cfg);
      }
    }

    function renderSubFieldControls(){
      if(!els.subList) return;
      const titleOpts=titleFieldOptions();
      const validKeys=new Set(titleOpts.map(opt=>opt.key));
      if(!Array.isArray(tempSubFields) || !tempSubFields.length){
        tempSubFields=Array.isArray(cfg.subFields)&&cfg.subFields.length?cfg.subFields.slice():[cfg.titleField];
      }
      tempSubFields=tempSubFields.filter(field=>validKeys.has(field));
      if(!tempSubFields.length){
        const fallback=cfg.titleField||titleOpts[0]?.key||'meldung';
        tempSubFields=[fallback];
      }
      els.subList.innerHTML='';
      tempSubFields.forEach((field,index)=>{
        const row=document.createElement('div');
        row.className='db-sub-row';
        const select=document.createElement('select');
        select.className='db-input';
        titleOpts.forEach(opt=>{
          const option=document.createElement('option');
          option.value=opt.key;
          option.textContent=opt.label||opt.key;
          select.appendChild(option);
        });
        const current=validKeys.has(field)?field:titleOpts[0]?.key||'';
        select.value=current;
        tempSubFields[index]=current;
        select.addEventListener('change',()=>{
          tempSubFields[index]=select.value;
        });
        row.appendChild(select);
        if(tempSubFields.length>1){
          const remove=document.createElement('button');
          remove.type='button';
          remove.className='db-btn secondary db-sub-remove';
          remove.textContent='✕';
          remove.addEventListener('click',()=>{
            tempSubFields.splice(index,1);
            renderSubFieldControls();
          });
          row.appendChild(remove);
        }
        els.subList.appendChild(row);
      });
    }

    function updateHighlights(){
      const active=getActiveMeldung();
      Array.from(els.list.children).forEach(node=>{
        const m=(node.dataset.meldung||'').trim();
        node.classList.toggle('active',active && m===active);
      });
    }

    function cleanText(value){
      return String(value??'').trim();
    }

    function cleanPart(value){
      const text=cleanText(value);
      if(!text) return '';
      const idx=text.indexOf(':');
      return idx>=0?text.slice(0,idx).trim():text;
    }

    function recordDataFor(item){
      const meld=(item?.meldung||'').trim();
      if(!meld) return {};
      return state.aspen.data[meld]||state.dict.data[meld]||{};
    }

    function computePart(item){
      const field=cleanText(cfg.partField||'');
      if(!field) return '';
      if(field==='meldung') return cleanPart(item.meldung);
      const data=recordDataFor(item);
      return cleanPart(data[field]);
    }

    function partLabel(part){
      return part?part:'Ohne Part';
    }

    function renderList(){
      state.items=dedupeByMeldung(state.items);
      els.list.innerHTML='';
      let visibleCount=0;
      state.items.forEach(item=>{
        const part=computePart(item);
        if(state.excluded.has(part)) return;
        const card=cardEl(item,cfg,state,part);
        els.list.appendChild(card);
        visibleCount++;
      });
      if(!visibleCount){
        els.list.innerHTML='<div style="opacity:.6;">Keine Geräte</div>';
      }
      updateHighlights();
      refreshPartMenu();
    }

    function syncFromDOM(){
      state.items=Array.from(els.list.children).map(node=>(
        {id:node.dataset.id,meldung:(node.dataset.meldung||'').trim()}
      ));
      state.items=dedupeByMeldung(state.items);
    }

    function refreshPartMenu(){
      if(!els.partList) return;
      const parts=new Map();
      state.items.forEach(item=>{
        const part=computePart(item);
        if(!parts.has(part)) parts.set(part,partLabel(part));
      });
      const entries=Array.from(parts.entries()).sort((a,b)=>{
        return a[1].localeCompare(b[1],'de',{sensitivity:'base'});
      });
      els.partList.innerHTML='';
      if(!entries.length){
        const info=document.createElement('div');
        info.className='db-check';
        info.style.opacity='0.6';
        info.textContent='Keine Daten';
        els.partList.appendChild(info);
        return;
      }
      entries.forEach(([part,label])=>{
        const row=document.createElement('label');
        row.className='db-check';
        const input=document.createElement('input');
        input.type='checkbox';
        input.dataset.part=part;
        input.checked=!state.excluded.has(part);
        input.addEventListener('click',event=>event.stopPropagation());
        input.addEventListener('change',event=>{
          event.stopPropagation();
          if(input.checked){
            state.excluded.delete(part);
          }else{
            state.excluded.add(part);
          }
          cfg.excludedParts=Array.from(state.excluded);
          saveCfg(instanceId,cfg);
          renderList();
        });
        const span=document.createElement('span');
        span.textContent=label;
        row.appendChild(input);
        row.appendChild(span);
        els.partList.appendChild(row);
      });
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
      cfg.fileName=handle?.name||cfg.fileName||'units.xlsx';
      els.fLabel.textContent=`• ${cfg.fileName}`;
      saveCfg(instanceId,cfg);
    }

    function setDictHandle(handle){
      state.handles.dict=handle;
      cfg.dictFileName=handle?.name||cfg.dictFileName||'dictionary.xlsx';
      els.dictLabel.textContent=`• ${cfg.dictFileName}`;
      saveCfg(instanceId,cfg);
    }

    function setAspenHandle(handle){
      state.handles.aspen=handle;
      if(handle){
        cfg.aspenFileName=handle.name||cfg.aspenFileName||'aspen.xlsx';
      }
      els.aspenLabel.textContent=cfg.aspenFileName?`• ${cfg.aspenFileName}`:'Keine Aspen-Datei';
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
          suggestedName:'units.xlsx',
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
      const ok=await ensureRWPermission(handle);
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

    async function bindAspenHandle(handle){
      const ok=await ensureRPermission(handle);
      if(!ok) return false;
      await idbSet(cfg.aspenIdbKey,handle);
      setAspenHandle(handle);
      try{
        const res=await readAspenFromHandle(handle);
        state.aspen.data=res.map||{};
        state.aspen.loaded=true;
      }catch(err){
        console.warn('Aspen read failed',err);
        state.aspen.data={};
        state.aspen.loaded=false;
      }
      renderList();
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

    async function pickAspen(){
      try{
        const [handle]=await window.showOpenFilePicker({
          types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],
          multiple:false
        });
        if(!handle) return;
        await bindAspenHandle(handle);
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
    els.aspenPick.addEventListener('click',pickAspen);
    els.namePick.addEventListener('click',pickName);

    els.selTitle.addEventListener('change',()=>{
      cfg.titleField=els.selTitle.value;
      saveCfg(instanceId,cfg);
      renderList();
    });
    if(els.selPart){
      els.selPart.addEventListener('change',()=>{
        const next=els.selPart.value;
        if(cfg.partField===next) return;
        cfg.partField=next;
        state.excluded.clear();
        cfg.excludedParts=Array.from(state.excluded);
        saveCfg(instanceId,cfg);
        renderList();
      });
    }

    els.save.addEventListener('click',()=>{
      const prevPart=cfg.partField;
      cfg.titleField=els.selTitle.value||cfg.titleField;
      if(els.selPart) cfg.partField=els.selPart.value||cfg.partField;
      const validKeys=new Set(titleFieldOptions().map(opt=>opt.key));
      let nextSubs=Array.isArray(tempSubFields)?tempSubFields.map(field=>cleanText(field)).filter(Boolean):[];
      nextSubs=nextSubs.filter(field=>validKeys.has(field));
      const seenSubs=new Set();
      nextSubs=nextSubs.filter(field=>{
        if(seenSubs.has(field)) return false;
        seenSubs.add(field);
        return true;
      });
      if(!nextSubs.length){
        if(validKeys.has(cfg.titleField)) nextSubs=[cfg.titleField];
        else if(validKeys.size){nextSubs=[validKeys.values().next().value];}
      }
      cfg.subFields=nextSubs;
      if(prevPart!==cfg.partField){
        state.excluded.clear();
      }
      cfg.excludedParts=Array.from(state.excluded);
      cfg.colors={bg:els.cBg.value,item:els.cItem.value,title:els.cTitle.value,sub:els.cSub.value,active:els.cActive.value};
      cfg.title=els.titleInput.value||'';
      applyColors(els,cfg);
      applyTitle(els,cfg.title);
      saveCfg(instanceId,cfg);
      updateFieldOptions();
      renderList();
      closeModal();
    });

    els.close.addEventListener('click',closeModal);

    function openModal(){
      updateFieldOptions();
      tempSubFields=Array.isArray(cfg.subFields)&&cfg.subFields.length?cfg.subFields.slice():[cfg.titleField];
      renderSubFieldControls();
      els.titleInput.value=cfg.title||'';
      els.cBg.value=cfg.colors.bg;
      els.cItem.value=cfg.colors.item;
      els.cTitle.value=cfg.colors.title;
      els.cSub.value=cfg.colors.sub;
      els.cActive.value=cfg.colors.active;
      if(els.selTitle) els.selTitle.value=cfg.titleField;
      if(els.selPart) els.selPart.value=cfg.partField;
      els.modal.classList.add('open');
    }
    function closeModal(){
      els.modal.classList.remove('open');
      tempSubFields=[];
    }

    if(els.subAdd){
      els.subAdd.addEventListener('click',()=>{
        const options=titleFieldOptions();
        if(!options.length) return;
        if(!Array.isArray(tempSubFields)) tempSubFields=[];
        const used=new Set(tempSubFields);
        const next=options.find(opt=>!used.has(opt.key))||options[0];
        if(next){
          tempSubFields.push(next.key);
          renderSubFieldControls();
        }
      });
    }

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

    if(els.menuOpt){
      els.menuOpt.addEventListener('click',event=>{event.stopPropagation();closeMenu();openModal();});
    }
    if(els.menuPick){
      els.menuPick.addEventListener('click',async event=>{
        event.stopPropagation();
        closeMenu();
        await pickExcel();
      });
    }
    if(els.menuDisable){
      els.menuDisable.addEventListener('click',event=>{
        event.stopPropagation();
        state.items=dedupeByMeldung(state.items);
        state.excluded=new Set(state.items.map(item=>computePart(item)));
        cfg.excludedParts=Array.from(state.excluded);
        saveCfg(instanceId,cfg);
        closeMenu();
        renderList();
      });
    }
    let ctxTarget=null;
    function setCtxTarget(card){
      if(ctxTarget&&ctxTarget.isConnected){ctxTarget.classList.remove('ctx-target');}
      ctxTarget=card||null;
      if(ctxTarget&&ctxTarget.isConnected){ctxTarget.classList.add('ctx-target');}
      if(els.menuDelete){
        els.menuDelete.style.display=ctxTarget?'block':'none';
      }
    }
    if(els.menuDelete){
      els.menuDelete.style.display='none';
      els.menuDelete.addEventListener('click',event=>{
        event.stopPropagation();
        const target=ctxTarget;
        const meld=(target?.dataset?.meldung||'').trim();
        closeMenu();
        if(!meld) return;
        const before=state.items.length;
        state.items=state.items.filter(item=>(item.meldung||'').trim()!==meld);
        if(state.items.length===before) return;
        renderList();
        scheduleSave();
        updateHighlights();
      });
    }
    if(els.menu){
      els.menu.addEventListener('click',event=>event.stopPropagation());
    }

    function openMenuAt(x,y,card){
      setCtxTarget(card);
      refreshPartMenu();
      const pad=8;const vw=window.innerWidth;const vh=window.innerHeight;
      const rect=els.menu.getBoundingClientRect();
      const w=rect.width||220;
      const h=rect.height||160;
      els.menu.style.left=clamp(x,pad,vw-w-pad)+'px';
      els.menu.style.top=clamp(y,pad,vh-h-pad)+'px';
      els.menu.classList.add('open');
    }
    function closeMenu(){
      els.menu.classList.remove('open');
      setCtxTarget(null);
    }

    root.addEventListener('contextmenu',event=>{
      event.preventDefault();event.stopPropagation();
      const card=event.target.closest('.db-card');
      openMenuAt(event.clientX,event.clientY,card);
    });
    window.addEventListener('click',event=>{if(!els.menu.contains(event.target)) closeMenu();});
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
      onAdd:async evt=>{
        syncFromDOM();
        if(SHARED?.handleAspenToDeviceDrop){
          try{
            await SHARED.handleAspenToDeviceDrop(evt,{
              dictHandle:state.handles.dict,
              deviceHandle:state.handles.file,
              ensureXLSX
            });
          }catch(err){
            console.warn('[UnitBoard] Sync beim Drag&Drop fehlgeschlagen',err);
          }
        }
        renderList();
        scheduleSave();
        updateHighlights();
      },
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
        const handle=await idbGet(cfg.aspenIdbKey);
        if(handle && await ensureRPermission(handle)){
          await bindAspenHandle(handle);
        }
      }catch(err){console.warn('Aspen restore failed',err);}
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
          try{await idbDel(cfg.aspenIdbKey);}catch{}
          try{await idbDel(cfg.nameIdbKey);}catch{}
          try{removeCfg(instanceId);}catch{}
        })();
        observer.disconnect();
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
  };

})();
