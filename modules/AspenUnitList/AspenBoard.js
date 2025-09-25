/* Aspen-gebundene Geräteliste, dedupliziert nach Meldung */
(function(){
  'use strict';

  const STYLE_ID = 'db-styles';

  const CSS = `
    .db-root{height:100%;display:flex;flex-direction:column;}
    .db-titlebar{font-weight:600;color:var(--text-color);padding:0 .15rem;user-select:none;display:flex;align-items:center;gap:.5rem;}
    .db-title-text{flex:1;min-width:0;}
    .db-title-text.is-empty{display:none;}
    .db-toggle-active{flex:0 0 auto;padding:.35rem .75rem;border-radius:.5rem;border:1px solid var(--border-color,#e5e7eb);background:rgba(255,255,255,.8);color:inherit;font-weight:500;cursor:pointer;transition:background .2s ease,box-shadow .2s ease,transform .2s ease;}
    .db-toggle-active:hover{background:rgba(255,255,255,.95);box-shadow:0 4px 12px rgba(0,0,0,.08);transform:translateY(-1px);}
    .db-toggle-active.is-active{background:var(--db-right-accent,#2563eb);color:#fff;box-shadow:0 4px 12px rgba(37,99,235,.35);}
    .db-surface{flex:1;background:var(--db-shell-bg,#f5f7fb);border-radius:1rem;padding:.75rem;display:flex;flex-direction:column;gap:.75rem;overflow:hidden;}
    .db-columns{flex:1;display:flex;gap:.75rem;min-height:0;}
    .db-column{flex:1;display:flex;flex-direction:column;min-width:0;background:var(--db-left-bg,#fff);padding:.65rem;border-radius:.9rem;box-shadow:0 8px 24px rgba(15,23,42,.06);gap:.65rem;transition:box-shadow .2s ease,transform .2s ease;}
    .db-column:hover{box-shadow:0 16px 30px rgba(15,23,42,.08);}
    .db-column-right{display:none;background:var(--db-right-bg,#eef2ff);}
    .db-column-right.is-visible{display:flex;}
    .db-column-header{display:flex;flex-direction:column;gap:.45rem;}
    .db-column-headline{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;}
    .db-column-title{font-weight:600;color:var(--db-left-title,#2563eb);display:flex;align-items:center;gap:.35rem;}
    .db-column-right .db-column-title{color:var(--db-right-title,#1f2937);}
    .db-column-count{font-size:.8rem;font-weight:600;color:#fff;background:var(--db-highlight,#10b981);padding:.1rem .55rem;border-radius:999px;}
    .db-column-right .db-column-count{background:var(--db-right-accent,#2563eb);}
    .db-toolbar{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;}
    .db-search{flex:1;padding:.45rem .65rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.6rem;background:rgba(255,255,255,.85);color:#000;font-size:.9rem;transition:border-color .2s ease,box-shadow .2s ease;}
    .db-search:focus{outline:none;border-color:var(--db-right-accent,#2563eb);box-shadow:0 0 0 3px rgba(37,99,235,.12);}
    .db-search::placeholder{color:#000;opacity:.65;}
    .db-list{flex:1;display:flex;flex-direction:column;gap:.65rem;min-height:1.5rem;overflow:auto;padding-right:.25rem;}
    .db-empty{opacity:.6;padding:.35rem .1rem;}
    .db-card{position:relative;background:var(--db-left-item,#fff);color:var(--db-left-sub,#4b5563);border-radius:.8rem;padding:.75rem .85rem;box-shadow:0 4px 12px rgba(15,23,42,.08);display:flex;align-items:flex-start;gap:.75rem;user-select:none;cursor:grab;transition:transform .2s ease,box-shadow .2s ease;}
    .db-column-right .db-card{background:var(--db-right-item,#fff);color:var(--db-right-sub,#4b5563);}
    .db-card:hover{transform:translateY(-2px) scale(1.01);box-shadow:0 18px 35px rgba(15,23,42,.12);}
    .db-card:active{cursor:grabbing;}
    .db-flex{flex:1;display:flex;flex-direction:column;gap:.15rem;}
    .db-title{color:var(--db-left-title,#2563eb);font-weight:600;line-height:1.2;}
    .db-column-right .db-title{color:var(--db-right-title,#1f2937);}
    .db-sub{color:var(--db-left-sub,#4b5563);font-size:.85rem;display:flex;flex-direction:column;gap:.15rem;}
    .db-column-right .db-sub{color:var(--db-right-sub,#4b5563);}
    .db-card.active{box-shadow:0 0 0 2px var(--db-highlight,#10b981) inset,0 12px 30px rgba(15,23,42,.14);transform:translateY(-1px);}
    .db-card.is-selected{box-shadow:0 0 0 2px var(--db-select,#2563eb) inset,0 14px 34px rgba(37,99,235,.18);}
    .db-ghost{opacity:.4;}
    .db-chosen{transform:scale(1.01);}
    .db-badges{position:absolute;top:.4rem;right:.45rem;display:flex;gap:.3rem;}
    .db-badge{font-size:.65rem;font-weight:600;color:#fff;padding:.1rem .35rem;border-radius:.35rem;background:var(--db-highlight,#10b981);box-shadow:0 3px 8px rgba(0,0,0,.18);}
    .db-badge-active{background:var(--db-right-accent,#10b981);}
    .db-badge-new{background:var(--db-badge-new,#2563eb);}
    .db-btn{padding:.35rem .75rem;border-radius:.55rem;border:1px solid transparent;background:var(--db-right-accent,#2563eb);color:#fff;font-size:.85rem;font-weight:500;cursor:pointer;transition:transform .15s ease,box-shadow .2s ease,background .2s ease;}
    .db-btn:hover{transform:translateY(-1px);box-shadow:0 10px 20px rgba(37,99,235,.25);}
    .db-btn:focus{outline:none;box-shadow:0 0 0 3px rgba(37,99,235,.25);}
    .db-btn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none;transform:none;}
    .db-menu{position:fixed;z-index:1000;display:none;min-width:200px;padding:.25rem;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);}
    .db-menu.open{display:block;}
    .db-menu .mi{display:block;width:100%;padding:.5rem .75rem;text-align:left;border-radius:.4rem;cursor:pointer;}
    .db-menu .mi:hover{background:rgba(0,0,0,.06);}
    .db-part-list{max-height:240px;overflow:auto;padding:.25rem .5rem;display:flex;flex-direction:column;gap:.25rem;}
    .db-check{display:flex;align-items:center;gap:.4rem;font-size:.85rem;}
    .db-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:1000;}
    .db-modal.open{display:flex;}
    .db-panel{background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);padding:1rem;border-radius:.75rem;min-width:260px;box-shadow:0 10px 24px rgba(0,0,0,.18);}
    .db-panel .row{margin-bottom:.75rem;}
    .db-panel label{display:block;font-size:.85rem;margin-bottom:.25rem;}
    .db-panel input[type=text],.db-panel select{width:100%;padding:.35rem .5rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.4rem;background:transparent;color:inherit;}
    .db-color{width:100%;height:2.25rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.4rem;background:transparent;}
    .db-panel .row.subs{display:flex;flex-direction:column;gap:.4rem;}
    .db-sub-list{display:flex;flex-direction:column;gap:.35rem;}
    .db-sub-row{display:flex;gap:.5rem;align-items:center;}
    .db-sub-row select{flex:1;}
    .db-sub-row button{padding:.35rem .6rem;}
    .db-add-sub{align-self:flex-start;padding:.35rem .6rem;}
    .db-sub-line+.db-sub-line{margin-top:.15rem;}
    .db-panel .actions{display:flex;gap:.5rem;justify-content:flex-end;}
  `;


  const XLSX_URLS = [
    'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.2/xlsx.full.min.js'
  ];
  const SORTABLE_URLS = [
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js'
  ];

  const GROUP_NAME = 'unitBoardGroup';
  const TITLE_FIELD = 'MELDUNGS_NO';
  const MELDUNG_FIELD = 'MELDUNGS_NO';
  const DEFAULT_SUB_FIELD = 'AUFTRAGS_NO';
  const LS_DOC = 'module_data_v1';
  const LS_STATE = 'aspenUnitListState';
  const LS_ACTIVE_DEVICES_PREFIX = 'aspenActiveDevices';
  const CUSTOM_BROADCAST = 'unitBoard:update';

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const tag=document.createElement('style');
    tag.id=STYLE_ID;
    tag.textContent=CSS;
    document.head.appendChild(tag);
  }

  async function ensureLibrary(globalKey,promiseKey,urls){
    if(window[globalKey]) return;
    if(window[promiseKey]) return window[promiseKey];
    window[promiseKey]=(async()=>{
      let lastError;
      for(const url of urls){
        try{
          await new Promise((resolve,reject)=>{
            const script=document.createElement('script');
            script.src=url;
            script.async=true;
            script.onload=resolve;
            script.onerror=()=>reject(new Error('load '+url));
            document.head.appendChild(script);
          });
          if(window[globalKey]) return;
        }catch(err){lastError=err;}
      }
      throw lastError||new Error('Failed to load '+globalKey);
    })();
    return window[promiseKey];
  }

  function ensureXLSX(){
    return ensureLibrary('XLSX','__XLSX_LOAD_PROMISE__',XLSX_URLS);
  }

  function ensureSortable(){
    return ensureLibrary('Sortable','__SORTABLE_LOAD_PROMISE__',SORTABLE_URLS);
  }

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

  function activeDevicesKey(instanceId){
    const safeId=typeof instanceId==='string'?instanceId.trim():'';
    const key=safeId||'default';
    return `${LS_ACTIVE_DEVICES_PREFIX}:${key}`;
  }

  function normalizeActiveDevice(raw,partField){
    if(!raw) return null;
    const meldungSource=raw.meldung??raw.data?.[MELDUNG_FIELD];
    const meldung=String(meldungSource||'').trim();
    if(!meldung) return null;
    const id=typeof raw.id==='string'?raw.id:`act-${Math.random().toString(36).slice(2)}`;
    const partSource=raw.part??raw.data?.[partField]??raw.data?.[DEFAULT_SUB_FIELD];
    const part=String(partSource||'').trim();
    const data={};
    if(raw.data && typeof raw.data==='object'){
      Object.keys(raw.data).forEach(key=>{data[key]=raw.data[key];});
    }
    if(partField && part && !data[partField]){
      data[partField]=part;
    }
    if(!data[MELDUNG_FIELD]) data[MELDUNG_FIELD]=meldung;
    if(raw.title && !data[TITLE_FIELD]) data[TITLE_FIELD]=raw.title;
    return {id,part,meldung,data};
  }

  function loadActiveDevicesFromStorage(instanceId,partField){
    try{
      const raw=localStorage.getItem(activeDevicesKey(instanceId));
      if(!raw) return [];
      const parsed=JSON.parse(raw);
      if(!Array.isArray(parsed)) return [];
      return dedupeByMeldung(parsed.map(item=>normalizeActiveDevice(item,partField)).filter(Boolean));
    }catch(err){
      return [];
    }
  }

  function saveActiveDevicesToStorage(instanceId,list,partField){
    const payload=(Array.isArray(list)?list:[])
      .map(item=>normalizeActiveDevice(item,partField))
      .filter(Boolean);
    try{localStorage.setItem(activeDevicesKey(instanceId),JSON.stringify(payload));}catch(err){/* ignore */}
  }

  const parseJson=s=>{try{return JSON.parse(s)||{};}catch{return{};}};
  const loadDoc=()=>parseJson(localStorage.getItem(LS_DOC));
  const saveDoc=doc=>localStorage.setItem(LS_DOC,JSON.stringify(doc));
  const getActiveMeldung=()=> (loadDoc().general?.Meldung||'').trim();

  function instanceIdOf(root){
    if(!root) return 'asp-'+Math.random().toString(36).slice(2);
    const host=root.closest?.('.grid-stack-item');
    if(host?.dataset?.instanceId) return host.dataset.instanceId;
    if(!root.dataset.aspenInstanceId){
      root.dataset.aspenInstanceId='asp-'+Math.random().toString(36).slice(2);
    }
    return root.dataset.aspenInstanceId;
  }

  function createElements(initialTitle){
    const root=document.createElement('div');
    root.className='db-root';
    const safeTitle=escapeHtml(initialTitle||'');
    const titleClass=safeTitle?'db-title-text':'db-title-text is-empty';
    root.innerHTML=`
      <div class="db-titlebar">
        <span class="${titleClass}">${safeTitle}</span>
        <button type="button" class="db-toggle-active" aria-pressed="false">Active Devices</button>
      </div>
      <div class="db-surface">
        <div class="db-columns">
          <div class="db-column db-column-left">
            <div class="db-column-header">
              <div class="db-column-headline">
                <span class="db-column-title">Aspen Device List</span>
              </div>
              <div class="db-toolbar">
                <input type="search" class="db-search db-search-left" placeholder="Geräte suchen..." autocomplete="off">
              </div>
            </div>
            <div class="db-list"></div>
          </div>
          <div class="db-column db-column-right">
            <div class="db-column-header">
              <div class="db-column-headline">
                <span class="db-column-title">Active Device List</span>
                <span class="db-column-count">(0)</span>
              </div>
              <div class="db-toolbar">
                <input type="search" class="db-search db-search-right" placeholder="Geräte suchen..." autocomplete="off">
                <button type="button" class="db-btn db-btn-clear">Alle deaktivieren</button>
              </div>
            </div>
            <div class="db-list db-active-list"></div>
          </div>
        </div>
      </div>
      <div class="db-modal">
        <div class="db-panel">
          <div class="row"><label>Titel (optional)<input type="text" class="db-title-input"></label></div>
          <div class="row subs"><label>Untertitel-Felder</label><div class="db-sub-list"></div><button type="button" class="db-add-sub">+</button></div>
          <div class="row"><label>Dropdownkriterium<select class="db-sel-part"></select></label></div>
          <div class="row"><label>Hintergrund<input type="color" class="db-color db-c-bg" value="#f5f7fb"></label></div>
          <div class="row"><label>Item Hintergrund<input type="color" class="db-color db-c-item" value="#ffffff"></label></div>
          <div class="row"><label>Titelfarbe<input type="color" class="db-color db-c-title" value="#2563eb"></label></div>
          <div class="row"><label>Untertitel-Farbe<input type="color" class="db-color db-c-sub" value="#4b5563"></label></div>
          <div class="row"><label>Highlight<input type="color" class="db-color db-c-highlight" value="#10b981"></label></div>
          <div class="row"><label>Active Hintergrund<input type="color" class="db-color db-c-active-bg" value="#eef2ff"></label></div>
          <div class="row"><label>Active Karte<input type="color" class="db-color db-c-active-item" value="#ffffff"></label></div>
          <div class="row"><label>Active Titel<input type="color" class="db-color db-c-active-title" value="#1f2937"></label></div>
          <div class="row"><label>Active Untertitel<input type="color" class="db-color db-c-active-sub" value="#374151"></label></div>
          <div class="row"><label>Active Akzent<input type="color" class="db-color db-c-active-accent" value="#2563eb"></label></div>
          <div class="actions"><button type="button" class="db-save">Speichern</button><button type="button" class="db-close">Schließen</button></div>
        </div>
      </div>
    `;

    const menu=document.createElement('div');
    menu.className='db-menu';
    menu.innerHTML=`
      <div class="mi mi-opt">⚙️ Optionen</div>
      <div class="mi mi-pick">Aspen.xlsx wählen</div>
      <input type="file" accept=".xlsx" class="db-file-input" style="display:none">
      <div class="mi mi-disable">Alle deaktivieren</div>
      <div class="db-part-list"></div>
    `;
    document.body.appendChild(menu);

    const activeMenu=document.createElement('div');
    activeMenu.className='db-menu db-menu-active';
    activeMenu.innerHTML=`
      <div class="mi mi-keep">Nur diese Partnummer behalten</div>
      <div class="mi mi-remove">Gerät deaktivieren</div>
    `;
    document.body.appendChild(activeMenu);

    return {
      root,
      list:root.querySelector('.db-column-left .db-list'),
      activeList:root.querySelector('.db-active-list'),
      activeColumn:root.querySelector('.db-column-right'),
      activeCount:root.querySelector('.db-column-count'),
      toggleBtn:root.querySelector('.db-toggle-active'),
      titleText:root.querySelector('.db-title-text'),
      leftSearch:root.querySelector('.db-search-left'),
      rightSearch:root.querySelector('.db-search-right'),
      modal:root.querySelector('.db-modal'),
      titleInput:root.querySelector('.db-title-input'),
      subList:root.querySelector('.db-sub-list'),
      addSubBtn:root.querySelector('.db-add-sub'),
      selPart:root.querySelector('.db-sel-part'),
      saveBtn:root.querySelector('.db-save'),
      closeBtn:root.querySelector('.db-close'),
      cBg:root.querySelector('.db-c-bg'),
      cItem:root.querySelector('.db-c-item'),
      cTitle:root.querySelector('.db-c-title'),
      cSub:root.querySelector('.db-c-sub'),
      cHighlight:root.querySelector('.db-c-highlight'),
      cActiveBg:root.querySelector('.db-c-active-bg'),
      cActiveItem:root.querySelector('.db-c-active-item'),
      cActiveTitle:root.querySelector('.db-c-active-title'),
      cActiveSub:root.querySelector('.db-c-active-sub'),
      cActiveAccent:root.querySelector('.db-c-active-accent'),
      btnClear:root.querySelector('.db-btn-clear'),
      menu,
      activeMenu,
      partList:menu.querySelector('.db-part-list'),
      fileInput:menu.querySelector('.db-file-input')
    };
  }

  function createInitialState(initialTitle){
    return {
      fields:[],
      config:{
        subFields:[DEFAULT_SUB_FIELD],
        partField:TITLE_FIELD,
        title:initialTitle,
        colors:{bg:'#f5f7fb',item:'#ffffff',title:'#2563eb',sub:'#4b5563'},
        activeColors:{bg:'#eef2ff',item:'#ffffff',title:'#1f2937',sub:'#374151',accent:'#2563eb'},
        highlight:'#10b981'
      },
      items:[],
      excluded:new Set(),
      filePath:'',
      search:{left:'',right:''},
      activeListVisible:false,
      activeDevices:[]
    };
  }

  function ensureSubFields(config){
    if(!Array.isArray(config.subFields) || !config.subFields.length){
      const fallback=config.subField||DEFAULT_SUB_FIELD;
      config.subFields=[fallback];
      if('subField' in config) delete config.subField;
    }
  }

  function primarySubField(config){
    ensureSubFields(config);
    return config.subFields[0]||DEFAULT_SUB_FIELD;
  }

  function restoreState(state){
    const raw=localStorage.getItem(LS_STATE);
    if(!raw) return;
    try{
      const saved=JSON.parse(raw);
      if(Array.isArray(saved.fields)) state.fields=saved.fields;
      if(saved.config){
        const colors={...state.config.colors,...(saved.config.colors||{})};
        const activeColors={...state.config.activeColors,...(saved.config.activeColors||{})};
        const highlight=typeof saved.config.highlight==='string'?saved.config.highlight:(saved.config.colors&&saved.config.colors.active)||state.config.highlight;
        state.config={
          subFields:Array.isArray(saved.config.subFields)&&saved.config.subFields.length?saved.config.subFields.slice():state.config.subFields.slice(),
          partField:saved.config.partField||state.config.partField,
          title:typeof saved.config.title==='string'?saved.config.title:state.config.title,
          colors,
          activeColors,
          highlight:highlight||state.config.highlight
        };
      }
      ensureSubFields(state.config);
      // Aspen-Daten werden ausschließlich aus der ausgewählten Datei geladen.
      // Persistierte Einträge werden bewusst ignoriert, damit keine veralteten Daten erscheinen.
      if(Array.isArray(saved.excluded)) state.excluded=new Set(saved.excluded);
      state.filePath=typeof saved.filePath==='string'?saved.filePath:state.filePath;
      if(typeof saved.activeListVisible==='boolean') state.activeListVisible=saved.activeListVisible;
      const sortField=primarySubField(state.config);
      state.items.sort((a,b)=>String(a?.data?.[sortField]||'').localeCompare(String(b?.data?.[sortField]||'')));
    }catch(e){/* ignore */}
  }

  function persistState(state){
    state.items=dedupeByMeldung(state.items);
    const payload={
      fields:state.fields,
      config:{
        subFields:state.config.subFields.slice(),
        partField:state.config.partField,
        title:state.config.title,
        colors:{...state.config.colors},
        activeColors:{...state.config.activeColors},
        highlight:state.config.highlight
      },
      // Karten stammen ausschließlich aus der ausgewählten Aspen-Datei
      excluded:Array.from(state.excluded),
      filePath:state.filePath,
      activeListVisible:!!state.activeListVisible
    };
    try{localStorage.setItem(LS_STATE,JSON.stringify(payload));}catch(e){/* ignore */}
  }

  function getAvailableFieldList(state,extra){
    const base=Array.isArray(state.fields)&&state.fields.length?state.fields.slice():[];
    const extras=Array.isArray(extra)?extra.filter(Boolean):[extra].filter(Boolean);
    extras.forEach(field=>{if(!base.includes(field)) base.push(field);});
    if(!base.length) base.push(DEFAULT_SUB_FIELD);
    return base;
  }

  function applyColors(root,config){
    const colors=config?.colors||{};
    const activeColors=config?.activeColors||{};
    const highlight=config?.highlight||'#10b981';
    root.style.setProperty('--db-shell-bg',colors.bg||'#f5f7fb');
    root.style.setProperty('--db-left-bg',colors.bg||'#f5f7fb');
    root.style.setProperty('--db-left-item',colors.item||'#ffffff');
    root.style.setProperty('--db-left-title',colors.title||'#2563eb');
    root.style.setProperty('--db-left-sub',colors.sub||'#4b5563');
    root.style.setProperty('--db-highlight',highlight);
    root.style.setProperty('--db-select',highlight);
    root.style.setProperty('--db-right-bg',activeColors.bg||'#eef2ff');
    root.style.setProperty('--db-right-item',activeColors.item||'#ffffff');
    root.style.setProperty('--db-right-title',activeColors.title||'#1f2937');
    root.style.setProperty('--db-right-sub',activeColors.sub||'#374151');
    root.style.setProperty('--db-right-accent',activeColors.accent||highlight);
  }

  function updateTitleBar(root,title){
    const text=(title||'').trim();
    const bar=root.querySelector('.db-titlebar');
    if(!bar) return;
    const span=bar.querySelector('.db-title-text');
    if(span){
      span.textContent=text;
      span.classList.toggle('is-empty',!text);
    }
  }

  function buildCardMarkup(item,config,options){
    const opts=options||{};
    const badges=Array.isArray(opts.badges)?opts.badges:[];
    const titleValue=item.data?.[TITLE_FIELD]||'';
    const meldung=item.meldung||'';
    const subs=(Array.isArray(config.subFields)?config.subFields:[])
      .map(field=>{
        const val=item.data?.[field]||'';
        return val?`<div class="db-sub-line" data-field="${field}">${escapeHtml(val)}</div>`:'';
      })
      .filter(Boolean)
      .join('');
    const badgeHtml=badges.length?`<div class="db-badges">${badges.map(badge=>`<span class="db-badge ${badge.className||''}">${escapeHtml(badge.label||'')}</span>`).join('')}</div>`:'';
    return `
      <div class="db-card" data-id="${item.id}" data-meldung="${meldung}" data-part="${item.part}">
        ${badgeHtml}
        <div class="db-flex">
          <div class="db-title">${escapeHtml(titleValue)}</div>
          <div class="db-sub">${subs}</div>
        </div>
      </div>
    `;
  }

  function renderList(elements,state){
    state.items=dedupeByMeldung(state.items);
    const searchRaw=(state.search?.left||'');
    const terms=(searchRaw.match(/\S+/g)||[]).map(term=>term.toLowerCase());
    const visible=state.items.filter(item=>{
      if(state.excluded.has(item.part)) return false;
      return itemMatchesSearch(item,terms);
    });
    if(!visible.length){
      elements.list.innerHTML=`<div class="db-empty">Keine Geräte</div>`;
      persistState(state);
      updateHighlights(elements.list);
      updateSelectionStyles();
      return;
    }
    const html=visible.map(item=>buildCardMarkup(item,state.config)).join('');
    elements.list.innerHTML=html;
    const nodes=elements.list.querySelectorAll('.db-card');
    visible.forEach((item,index)=>{
      const node=nodes[index];
      if(node){
        node.__aspenItem=item;
      }
    });
    persistState(state);
    updateHighlights(elements.list);
    updateSelectionStyles();
  }

  function refreshMenu(menuEl,state,renderFn){
    if(!menuEl?.partList) return;
    state.items=dedupeByMeldung(state.items);
    const parts=Array.from(new Set(state.items.map(item=>item.part))).sort();
    menuEl.partList.innerHTML=parts.map(part=>`<label class="db-check"><input type="checkbox" data-part="${part}" ${state.excluded.has(part)?'':'checked'}> ${part}</label>`).join('');
    menuEl.partList.querySelectorAll('input').forEach(input=>{
      input.addEventListener('change',()=>{
        const part=input.dataset.part;
        if(input.checked) state.excluded.delete(part); else state.excluded.add(part);
        renderFn();
      });
    });
  }

  function updateHighlights(list){
    const active=getActiveMeldung();
    list.querySelectorAll('.db-card').forEach(node=>{
      const meldung=(node.dataset.meldung||'').trim();
      node.classList.toggle('active',active&&meldung===active);
    });
  }

  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"']/g,char=>{
      switch(char){
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case '\'': return '&#39;';
        default: return char;
      }
    });
  }

  function itemMatchesSearch(item,terms){
    if(!Array.isArray(terms) || !terms.length) return true;
    const values=[];
    if(item?.meldung) values.push(String(item.meldung));
    if(item?.part) values.push(String(item.part));
    if(!values.length) return false;
    const haystack=values.map(entry=>entry.toLowerCase());
    return terms.every(term=>haystack.some(value=>value.includes(term)));
  }

  window.renderAspenBoard=async function(targetDiv,opts){
    injectStyles();

    const initialTitle=opts?.moduleJson?.settings?.title||'';
    const elements=createElements(initialTitle);
    targetDiv.appendChild(elements.root);
    elements.list.dataset.boardType='aspen-unit';
    if(elements.activeList){
      elements.activeList.dataset.boardType='excel-unit';
    }

    const state=createInitialState(initialTitle);
    const instanceId=instanceIdOf(elements.root);
    let tempSubFields=[];

    restoreState(state);
    state.activeDevices=loadActiveDevicesFromStorage(instanceId,state.config.partField);
    const selection=new Set();
    const newBadges=new Set();
    const newBadgeTimers=new Map();
    let dragBundle=null;
    let activeMenuTarget=null;

    function ensureActiveDevice(item){
      return normalizeActiveDevice(item,state.config.partField);
    }

    function persistActiveDevices(){
      saveActiveDevicesToStorage(instanceId,state.activeDevices,state.config.partField);
    }

    function markAsNew(meldung){
      const key=(meldung||'').trim();
      if(!key) return;
      if(newBadgeTimers.has(key)){
        clearTimeout(newBadgeTimers.get(key));
      }
      newBadges.add(key);
      const timer=setTimeout(()=>{
        newBadges.delete(key);
        newBadgeTimers.delete(key);
        renderActiveList({persist:false});
      },5000);
      newBadgeTimers.set(key,timer);
    }

    function clearNewBadge(meldung){
      const key=(meldung||'').trim();
      if(!key) return;
      if(newBadgeTimers.has(key)){
        clearTimeout(newBadgeTimers.get(key));
        newBadgeTimers.delete(key);
      }
      newBadges.delete(key);
    }

    function clearAllNewBadges(){
      newBadgeTimers.forEach(timer=>clearTimeout(timer));
      newBadgeTimers.clear();
      newBadges.clear();
    }

    function updateSelectionStyles(){
      if(!elements.root) return;
      const cards=elements.root.querySelectorAll('.db-card');
      cards.forEach(card=>{
        const key=(card.dataset.meldung||'').trim();
        card.classList.toggle('is-selected',selection.has(key));
      });
    }

    function clearSelection(){
      if(!selection.size) return;
      selection.clear();
      updateSelectionStyles();
    }

    function handleSelection(card){
      if(!card) return;
      const key=(card.dataset.meldung||'').trim();
      if(!key) return;
      if(selection.size===1 && selection.has(key)) return;
      selection.clear();
      selection.add(key);
      updateSelectionStyles();
    }

    function ensureCardSelected(card){
      if(!card) return;
      const key=(card.dataset.meldung||'').trim();
      if(!key) return;
      if(selection.size===1 && selection.has(key)) return;
      selection.clear();
      selection.add(key);
      updateSelectionStyles();
    }

    function removeFromSelection(meldung){
      const key=(meldung||'').trim();
      if(!key) return;
      if(selection.delete(key)){
        updateSelectionStyles();
      }
    }

    function activateMeldung(meldung){
      const key=(meldung||'').trim();
      if(!key) return;
      const doc=loadDoc();
      doc.general||={};
      if(doc.general.Meldung===key) return;
      doc.general.Meldung=key;
      saveDoc(doc);
      updateHighlights(elements.list);
      updateHighlights(elements.activeList);
      window.dispatchEvent(new Event(CUSTOM_BROADCAST));
    }

    function triggerCardActivation(card){
      if(!card) return;
      handleSelection(card);
      activateMeldung(card.dataset.meldung||'');
    }

    let pointerState=null;
    let lastPointerActivation={id:'',time:0};

    function pointerKeyFor(card){
      if(!card) return '';
      return card.dataset.id||card.dataset.meldung||'';
    }

    function handleCardPointerDown(event){
      if(event.button!==0) return;
      const card=event.target.closest('.db-card');
      if(!card) return;
      pointerState={
        card,
        x:event.clientX,
        y:event.clientY
      };
    }

    function handleCardPointerUp(event){
      if(!pointerState) return;
      const {card,x,y}=pointerState;
      pointerState=null;
      const target=event.target.closest('.db-card');
      if(!target || target!==card) return;
      const dx=Math.abs((event.clientX||0)-x);
      const dy=Math.abs((event.clientY||0)-y);
      if(dx>5 || dy>5) return;
      triggerCardActivation(card);
      lastPointerActivation={id:pointerKeyFor(card),time:Date.now()};
    }

    function cancelPointerTracking(){
      pointerState=null;
    }

    function handleCardClick(event){
      const card=event.target.closest('.db-card');
      if(!card) return;
      const key=pointerKeyFor(card);
      if(key && Date.now()-lastPointerActivation.time<200 && lastPointerActivation.id===key){
        return;
      }
      triggerCardActivation(card);
    }

    function prepareDrag(evt){
      if(!evt?.item) return;
      const source=evt.from;
      const dragged=evt.item;
      const key=(dragged.dataset.meldung||'').trim();
      if(!key) return;
      handleSelection(dragged);
      const candidates=[dragged];
      dragBundle={
        source,
        type:source===elements.activeList?'active':'aspen',
        nodes:candidates,
        meldungen:candidates.map(card=>(card.dataset.meldung||'').trim()).filter(Boolean)
      };
      dragBundle.devices=dragBundle.meldungen.map(meldung=>{
        if(dragBundle.type==='active'){
          const match=state.activeDevices.find(item=>item.meldung===meldung);
          return match?ensureActiveDevice(match):null;
        }
        const match=state.items.find(item=>item.meldung===meldung);
        if(match) return ensureActiveDevice(match);
        const node=candidates.find(card=>(card.dataset.meldung||'').trim()===meldung);
        if(node?.__aspenItem) return ensureActiveDevice(node.__aspenItem);
        return extractActiveDeviceFromNode(node);
      }).filter(Boolean);
      dragBundle.deviceByMeldung=new Map(dragBundle.devices.map(device=>[device.meldung,device]));
      updateSelectionStyles();
    }

    function updateActiveCounter(){
      if(!elements.activeCount) return;
      const count=Array.isArray(state.activeDevices)?state.activeDevices.length:0;
      elements.activeCount.textContent=`(${count})`;
    }

    function renderActiveList({persist=true}={}){
      if(!elements.activeList) return;
      const normalized=(Array.isArray(state.activeDevices)?state.activeDevices:[])
        .map(ensureActiveDevice)
        .filter(Boolean);
      state.activeDevices=dedupeByMeldung(normalized);
      Array.from(newBadges).forEach(meldung=>{
        if(!state.activeDevices.some(item=>item.meldung===meldung)){
          clearNewBadge(meldung);
        }
      });
      if(elements.rightSearch){
        elements.rightSearch.value=state.search.right||'';
      }
      const searchRaw=(state.search?.right||'').trim();
      const terms=(searchRaw.match(/\S+/g)||[]).map(term=>term.toLowerCase());
      const visible=state.activeDevices.filter(item=>itemMatchesSearch(item,terms));
      if(!visible.length){
        elements.activeList.innerHTML=`<div class="db-empty">Keine Geräte</div>`;
      }else{
        const html=visible.map(item=>{
          const badges=[{label:'Aktiv',className:'db-badge-active'}];
          if(newBadges.has(item.meldung)) badges.push({label:'Neu',className:'db-badge-new'});
          return buildCardMarkup(item,state.config,{badges});
        }).join('');
        elements.activeList.innerHTML=html;
        const nodes=elements.activeList.querySelectorAll('.db-card');
        visible.forEach((item,index)=>{
          const node=nodes[index];
          if(node){
            node.__aspenItem=item;
          }
        });
      }
      updateActiveCounter();
      updateHighlights(elements.activeList);
      updateSelectionStyles();
      if(persist) persistActiveDevices();
    }

    function syncActiveOrderFromDOM(){
      if(!elements.activeList) return;
      const map=new Map(state.activeDevices.map(item=>[item.meldung,item]));
      const ordered=[];
      elements.activeList.querySelectorAll('.db-card').forEach(node=>{
        const meldung=(node.dataset.meldung||'').trim();
        if(!meldung) return;
        const item=map.get(meldung);
        if(item) ordered.push(item);
      });
      if(ordered.length){
        state.activeDevices=ordered;
      }
    }

    function extractActiveDeviceFromNode(node){
      if(!node) return null;
      const meldung=(node.dataset.meldung||'').trim();
      if(!meldung) return null;
      const existing=state.items.find(item=>item.meldung===meldung)||state.activeDevices.find(item=>item.meldung===meldung);
      if(existing) return ensureActiveDevice(existing);
      const part=(node.dataset.part||'').trim();
      const data={};
      node.querySelectorAll('.db-sub-line').forEach(line=>{
        const field=line.dataset.field;
        if(field) data[field]=line.textContent||'';
      });
      const title=node.querySelector('.db-title')?.textContent||'';
      if(title) data[TITLE_FIELD]=title;
      data[MELDUNG_FIELD]=meldung;
      const item={
        id:node.dataset.id||`act-${Math.random().toString(36).slice(2)}`,
        part,
        meldung,
        data
      };
      return ensureActiveDevice(item);
    }

    function setActiveListVisibility(visible,{persist=true}={}){
      const show=typeof visible==='boolean'?visible:!state.activeListVisible;
      state.activeListVisible=!!show;
      if(elements.activeColumn){
        elements.activeColumn.classList.toggle('is-visible',state.activeListVisible);
      }
      if(elements.toggleBtn){
        elements.toggleBtn.setAttribute('aria-pressed',state.activeListVisible?'true':'false');
        elements.toggleBtn.classList.toggle('is-active',state.activeListVisible);
      }
      elements.root.classList.toggle('active-list-visible',state.activeListVisible);
      if(persist) persistState(state);
    }

    setActiveListVisibility(state.activeListVisible,{persist:false});

    if(elements.toggleBtn){
      elements.toggleBtn.addEventListener('click',()=>{
        setActiveListVisibility(!state.activeListVisible);
      });
    }

    elements.cBg.value=state.config.colors.bg;
    elements.cItem.value=state.config.colors.item;
    elements.cTitle.value=state.config.colors.title;
    elements.cSub.value=state.config.colors.sub;
    elements.cHighlight.value=state.config.highlight;
    elements.cActiveBg.value=state.config.activeColors.bg;
    elements.cActiveItem.value=state.config.activeColors.item;
    elements.cActiveTitle.value=state.config.activeColors.title;
    elements.cActiveSub.value=state.config.activeColors.sub;
    elements.cActiveAccent.value=state.config.activeColors.accent;
    elements.titleInput.value=state.config.title||'';

    applyColors(elements.root,state.config);
    updateTitleBar(elements.root,state.config.title);

    if(elements.leftSearch){
      elements.leftSearch.value=state.search.left||'';
      const handleSearchChange=()=>{
        state.search.left=elements.leftSearch.value;
        render();
      };
      elements.leftSearch.addEventListener('input',handleSearchChange);
      elements.leftSearch.addEventListener('search',handleSearchChange);
    }

    if(elements.rightSearch){
      elements.rightSearch.value=state.search.right||'';
      const handleRightSearchChange=()=>{
        state.search.right=elements.rightSearch.value;
        renderActiveList({persist:false});
      };
      elements.rightSearch.addEventListener('input',handleRightSearchChange);
      elements.rightSearch.addEventListener('search',handleRightSearchChange);
    }

    function populateFieldSelects(){
      ensureSubFields(state.config);
      const options=getAvailableFieldList(state,[state.config.partField]);
      elements.selPart.innerHTML=options.map(field=>`<option value="${field}" ${field===state.config.partField?'selected':''}>${field}</option>`).join('');
      if(!options.includes(state.config.partField)){
        state.config.partField=options[0]||DEFAULT_SUB_FIELD;
        elements.selPart.value=state.config.partField;
      }
    }

    function syncFromDOM(){
      const existing=new Map(state.items.map(item=>[item.id,item]));
      const ordered=[];
      elements.list.querySelectorAll('.db-card').forEach(node=>{
        const id=node.dataset.id||('it-'+Math.random().toString(36).slice(2));
        const partRaw=node.dataset.part||node.dataset.meldung||'';
        const part=(partRaw.split(':')[0]||'').trim();
        const meldung=((node.dataset.meldung||'').split(':')[0]||'').trim();
        let item=existing.get(id);
        if(item){
          item.part=part;
          item.meldung=meldung;
          item.data={...item.data,[state.config.partField]:part,[MELDUNG_FIELD]:meldung};
        }else{
          const data={};
          data[TITLE_FIELD]=node.querySelector('.db-title')?.textContent||'';
          node.querySelectorAll('.db-sub-line').forEach(sub=>{
            const field=sub.dataset.field;
            if(field) data[field]=sub.textContent||'';
          });
          data[state.config.partField]=part;
          data[MELDUNG_FIELD]=meldung;
          item={id,part,meldung,data};
        }
        ordered.push(item);
      });
      state.items=dedupeByMeldung(ordered);
    }

    function render(){
      if(elements.leftSearch){
        elements.leftSearch.value=state.search.left||'';
      }
      if(elements.rightSearch){
        elements.rightSearch.value=state.search.right||'';
      }
      renderList(elements,state);
      SHARED.publishAspenItems(instanceId,state.items);
      refreshMenu(elements,state,render);
      renderActiveList({persist:false});
    }

    populateFieldSelects();
    render();

    function openMenu(x,y){
      refreshMenu(elements,state,render);
      const rect=elements.menu.getBoundingClientRect();
      const pad=8;
      const vw=window.innerWidth;
      const vh=window.innerHeight;
      elements.menu.style.left=clamp(x,pad,vw-rect.width-pad)+'px';
      elements.menu.style.top=clamp(y,pad,vh-rect.height-pad)+'px';
      elements.menu.classList.add('open');
    }
    function closeMenu(){elements.menu.classList.remove('open');}

    function openActiveContextMenu(x,y){
      if(!elements.activeMenu) return;
      const rect=elements.activeMenu.getBoundingClientRect();
      const pad=8;
      const vw=window.innerWidth;
      const vh=window.innerHeight;
      elements.activeMenu.style.left=clamp(x,pad,vw-rect.width-pad)+'px';
      elements.activeMenu.style.top=clamp(y,pad,vh-rect.height-pad)+'px';
      elements.activeMenu.classList.add('open');
    }
    function closeActiveMenu(){
      if(elements.activeMenu) elements.activeMenu.classList.remove('open');
      activeMenuTarget=null;
    }

    elements.menu.querySelector('.mi-pick').addEventListener('click',()=>pickFromExcel());
    if(elements.fileInput){
      elements.fileInput.addEventListener('change',event=>{
        const file=event.target?.files?.[0];
        if(file) pickFromExcel(file);
      });
    }
    elements.menu.querySelector('.mi-disable').addEventListener('click',()=>{
      state.items=dedupeByMeldung(state.items);
      state.excluded=new Set(state.items.map(item=>item.part));
      render();
    });
    elements.menu.querySelector('.mi-opt').addEventListener('click',()=>{closeMenu();openOptions();});

    function renderSubFieldControls(){
      const pool=getAvailableFieldList(state,tempSubFields);
      if(!tempSubFields.length){
        tempSubFields=[pool[0]||DEFAULT_SUB_FIELD];
      }
      elements.subList.innerHTML='';
      tempSubFields.forEach((field,index)=>{
        const row=document.createElement('div');
        row.className='db-sub-row';
        const select=document.createElement('select');
        const choices=getAvailableFieldList(state,tempSubFields);
        if(field && !choices.includes(field)) choices.push(field);
        select.innerHTML=choices.map(opt=>`<option value="${opt}" ${opt===field?'selected':''}>${opt}</option>`).join('');
        if(!field && choices.length){
          select.value=choices[0];
          tempSubFields[index]=choices[0];
        }
        select.addEventListener('change',()=>{tempSubFields[index]=select.value;});
        const sortBtn=document.createElement('button');
        sortBtn.type='button';
        sortBtn.className='db-sort';
        sortBtn.textContent='Sortieren';
        sortBtn.addEventListener('click',()=>{
          const fieldName=select.value;
          if(!fieldName) return;
          syncFromDOM();
          state.items.sort((a,b)=>String(a?.data?.[fieldName]||'').localeCompare(String(b?.data?.[fieldName]||'')));
          render();
        });
        row.appendChild(select);
        row.appendChild(sortBtn);
        elements.subList.appendChild(row);
      });
    }

    function openOptions(){
      tempSubFields=Array.isArray(state.config.subFields)?state.config.subFields.slice():[];
      populateFieldSelects();
      renderSubFieldControls();
      elements.titleInput.value=state.config.title||'';
      elements.cBg.value=state.config.colors.bg;
      elements.cItem.value=state.config.colors.item;
      elements.cTitle.value=state.config.colors.title;
      elements.cSub.value=state.config.colors.sub;
      elements.cHighlight.value=state.config.highlight;
      elements.cActiveBg.value=state.config.activeColors.bg;
      elements.cActiveItem.value=state.config.activeColors.item;
      elements.cActiveTitle.value=state.config.activeColors.title;
      elements.cActiveSub.value=state.config.activeColors.sub;
      elements.cActiveAccent.value=state.config.activeColors.accent;
      elements.modal.classList.add('open');
    }
    function closeOptions(){
      elements.modal.classList.remove('open');
      tempSubFields=[];
    }

    elements.addSubBtn.addEventListener('click',()=>{
      if(!Array.isArray(tempSubFields) || !tempSubFields.length){
        const defaults=getAvailableFieldList(state);
        tempSubFields=[defaults[0]||DEFAULT_SUB_FIELD];
      }
      const candidates=getAvailableFieldList(state,tempSubFields);
      const used=new Set(tempSubFields.filter(Boolean));
      const next=candidates.find(field=>!used.has(field))||candidates[0]||DEFAULT_SUB_FIELD;
      tempSubFields.push(next);
      renderSubFieldControls();
    });

    elements.saveBtn.addEventListener('click',()=>{
      state.config.title=elements.titleInput.value.trim();
      const newPart=elements.selPart.value;
      const partChanged=state.config.partField!==newPart;
      state.config.partField=newPart;
      const collected=(tempSubFields||[]).map(v=>v||'').filter(Boolean);
      state.config.subFields=collected.length?collected:[getAvailableFieldList(state)[0]||DEFAULT_SUB_FIELD];
      state.config.colors={
        bg:elements.cBg.value,
        item:elements.cItem.value,
        title:elements.cTitle.value,
        sub:elements.cSub.value
      };
      state.config.activeColors={
        bg:elements.cActiveBg.value,
        item:elements.cActiveItem.value,
        title:elements.cActiveTitle.value,
        sub:elements.cActiveSub.value,
        accent:elements.cActiveAccent.value
      };
      state.config.highlight=elements.cHighlight.value;
      updateTitleBar(elements.root,state.config.title);
      applyColors(elements.root,state.config);
      if(partChanged){
        state.items.forEach(item=>{
          const raw=String(item.data?.[newPart]||'').trim();
          const part=(raw.split(':')[0]||'').trim();
          item.part=part;
          item.data={...item.data,[newPart]:part};
        });
        state.excluded.clear();
      }
      persistState(state);
      render();
      renderActiveList();
      closeOptions();
    });

    elements.closeBtn.addEventListener('click',closeOptions);

    elements.selPart.addEventListener('change',()=>{
      const newPart=elements.selPart.value;
      if(!newPart) return;
      if(state.config.partField===newPart) return;
      state.config.partField=newPart;
      state.items.forEach(item=>{
        const raw=String(item.data?.[newPart]||'').trim();
        const part=(raw.split(':')[0]||'').trim();
        item.part=part;
        item.data={...item.data,[newPart]:part};
      });
      state.excluded.clear();
      render();
      persistState(state);
      renderActiveList();
    });

    if(elements.btnClear){
      elements.btnClear.addEventListener('click',()=>{
        if(!state.activeDevices.length) return;
        state.activeDevices=[];
        clearAllNewBadges();
        clearSelection();
        renderActiveList();
      });
    }

    elements.list.addEventListener('pointerdown',handleCardPointerDown);
    elements.list.addEventListener('pointerup',handleCardPointerUp);
    elements.list.addEventListener('pointercancel',cancelPointerTracking);
    elements.list.addEventListener('pointerleave',cancelPointerTracking);
    elements.list.addEventListener('click',handleCardClick);
    elements.activeList.addEventListener('pointerdown',handleCardPointerDown);
    elements.activeList.addEventListener('pointerup',handleCardPointerUp);
    elements.activeList.addEventListener('pointercancel',cancelPointerTracking);
    elements.activeList.addEventListener('pointerleave',cancelPointerTracking);
    elements.activeList.addEventListener('click',handleCardClick);

    elements.menu.addEventListener('click',e=>e.stopPropagation());
    if(elements.activeMenu){
      elements.activeMenu.addEventListener('click',e=>e.stopPropagation());
      const keepItem=elements.activeMenu.querySelector('.mi-keep');
      if(keepItem){
        keepItem.addEventListener('click',()=>{
          if(!activeMenuTarget) return;
          const part=(activeMenuTarget.dataset.part||'').trim();
          closeActiveMenu();
          if(!part) return;
          const before=state.activeDevices.length;
          state.activeDevices=state.activeDevices.filter(item=>item.part===part);
          Array.from(newBadges).forEach(meldung=>{
            if(!state.activeDevices.some(item=>item.meldung===meldung)) clearNewBadge(meldung);
          });
          selection.forEach(meldung=>{
            if(!state.activeDevices.some(item=>item.meldung===meldung)) selection.delete(meldung);
          });
          if(activeMenuTarget && state.activeDevices.some(item=>item.meldung===(activeMenuTarget.dataset.meldung||'').trim())){
            handleSelection(activeMenuTarget);
          }else{
            updateSelectionStyles();
          }
          if(before!==state.activeDevices.length){
            renderActiveList();
          }else{
            renderActiveList({persist:false});
          }
        });
      }
      const removeItem=elements.activeMenu.querySelector('.mi-remove');
      if(removeItem){
        removeItem.addEventListener('click',()=>{
          if(!activeMenuTarget) return;
          const meldung=(activeMenuTarget.dataset.meldung||'').trim();
          closeActiveMenu();
          if(!meldung) return;
          const before=state.activeDevices.length;
          state.activeDevices=state.activeDevices.filter(item=>item.meldung!==meldung);
          if(before!==state.activeDevices.length){
            clearNewBadge(meldung);
            removeFromSelection(meldung);
            renderActiveList();
          }else{
            renderActiveList({persist:false});
          }
        });
      }
    }

    if(elements.activeList){
      elements.activeList.addEventListener('contextmenu',event=>{
        const card=event.target.closest('.db-card');
        if(!card) return;
        event.preventDefault();
        event.stopPropagation();
        ensureCardSelected(card);
        activeMenuTarget=card;
        closeMenu();
        closeActiveMenu();
        openActiveContextMenu(event.clientX,event.clientY);
      });
    }

    elements.root.addEventListener('contextmenu',event=>{
      if(event.defaultPrevented) return;
      const card=event.target.closest('.db-card');
      if(card){
        ensureCardSelected(card);
      }
      event.preventDefault();
      event.stopPropagation();
      closeActiveMenu();
      closeMenu();
      openMenu(event.clientX,event.clientY);
    });

    function handleDocumentPointerDown(event){
      if(elements.menu.classList.contains('open') && !elements.menu.contains(event.target)){
        closeMenu();
      }
      if(elements.activeMenu && elements.activeMenu.classList.contains('open') && !elements.activeMenu.contains(event.target)){
        closeActiveMenu();
      }
    }

    function handleDocumentKeyDown(event){
      if(event.key==='Escape'){
        let handled=false;
        if(elements.menu.classList.contains('open')){
          closeMenu();
          handled=true;
        }
        if(elements.activeMenu && elements.activeMenu.classList.contains('open')){
          closeActiveMenu();
          handled=true;
        }
        if(handled){
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }

    document.addEventListener('pointerdown',handleDocumentPointerDown);
    document.addEventListener('keydown',handleDocumentKeyDown);

    window.addEventListener('storage',event=>{
      if(event.key===LS_DOC){
        updateHighlights(elements.list);
        updateHighlights(elements.activeList);
      }
    });
    window.addEventListener(CUSTOM_BROADCAST,()=>{
      updateHighlights(elements.list);
      updateHighlights(elements.activeList);
    });

    const mo=new MutationObserver(()=>{
      if(!document.body.contains(elements.root)){
        elements.menu.remove();
        if(elements.activeMenu) elements.activeMenu.remove();
        document.removeEventListener('pointerdown',handleDocumentPointerDown);
        document.removeEventListener('keydown',handleDocumentKeyDown);
        SHARED.clearAspenItems(instanceId);
        mo.disconnect();
      }
    });
    mo.observe(document.body,{childList:true,subtree:true});

    function triggerFileDialog(){
      if(!elements.fileInput) return false;
      try{elements.fileInput.value='';}catch{}
      elements.fileInput.click();
      return true;
    }

    async function pickFromExcel(source){
      closeMenu();
      let file=null;
      let pickedName='';
      if(source instanceof File){
        file=source;
        pickedName=source.name||'';
      }
      try{
        if(!file && typeof showOpenFilePicker==='function'){
          const [handle]=await showOpenFilePicker({
            types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],
            multiple:false
          });
          if(!handle) return;
          pickedName=handle.name||'';
          file=await handle.getFile();
        }
      }catch(error){
        if(error?.name==='AbortError') return;
        if(!triggerFileDialog()){
          console.error(error);
        }
        return;
      }

      if(!file){
        if(!triggerFileDialog()){
          console.warn('[AspenBoard] Keine Datei gewählt – showOpenFilePicker nicht verfügbar');
        }
        return;
      }

      try{
        await ensureXLSX();
        state.filePath=pickedName||file.name||'';
        const buffer=await file.arrayBuffer();
        const workbook=XLSX.read(buffer,{type:'array'});
        const worksheet=workbook.Sheets[workbook.SheetNames[0]];
        if(!worksheet){
          state.items=[];
          render();
          return;
        }
        const rows=XLSX.utils.sheet_to_json(worksheet,{defval:''});
        state.fields=Object.keys(rows[0]||{});
        const partField=state.fields.find(field=>/part/i.test(field))||state.fields[0]||TITLE_FIELD;
        state.config.partField=partField;
        state.config.subFields=[partField];
        const newItems=rows.map(row=>{
          const titleVal=String(row[TITLE_FIELD]||'').trim();
          const rawPart=String(row[partField]||'').trim();
          const part=(rawPart.split(':')[0]||'').trim();
          const meldung=String(row[MELDUNG_FIELD]||'').trim();
          if(!titleVal && !part && !meldung) return null;
          const data={...row,[TITLE_FIELD]:titleVal,[partField]:part,[MELDUNG_FIELD]:meldung};
          return {id:'it-'+Math.random().toString(36).slice(2),part,meldung,data};
        }).filter(Boolean);
        state.items=dedupeByMeldung(newItems);
        const sortField=primarySubField(state.config);
        state.items.sort((a,b)=>String(a.data?.[sortField]||'').localeCompare(String(b.data?.[sortField]||'')));
        state.excluded.clear();
        populateFieldSelects();
        render();
        renderActiveList();
      }catch(error){console.error(error);}
    }

    await ensureSortable();
    new Sortable(elements.list,{
      group:{name:GROUP_NAME,pull:'clone',put:true},
      animation:150,
      draggable:'.db-card',
      ghostClass:'db-ghost',
      chosenClass:'db-chosen',
      onStart:evt=>{prepareDrag(evt);},
      onEnd:()=>{dragBundle=null;},
      onSort:()=>{syncFromDOM();render();},
      onAdd:evt=>{
        if(evt.item && evt.item.parentNode===elements.list){
          evt.item.remove();
        }
        if(evt.from===elements.activeList){
          const bundle=dragBundle && dragBundle.type==='active'?dragBundle:null;
          const removed=bundle?bundle.meldungen.slice():[];
          if(!removed.length){
            const single=(evt.item?.dataset?.meldung||'').trim();
            if(single) removed.push(single);
          }
          if(removed.length){
            const before=state.activeDevices.length;
            state.activeDevices=state.activeDevices.filter(item=>{
              if(removed.includes(item.meldung)){
                clearNewBadge(item.meldung);
                removeFromSelection(item.meldung);
                return false;
              }
              return true;
            });
            renderActiveList();
          }else{
            renderActiveList({persist:false});
          }
          clearSelection();
        }
        dragBundle=null;
      }
    });
    new Sortable(elements.activeList,{
      group:{name:GROUP_NAME,pull:true,put:true},
      animation:150,
      draggable:'.db-card',
      ghostClass:'db-ghost',
      chosenClass:'db-chosen',
      onStart:evt=>{prepareDrag(evt);},
      onEnd:()=>{dragBundle=null;},
      onSort:()=>{
        if((state.search?.right||'').trim()){
          renderActiveList({persist:false});
          return;
        }
        syncActiveOrderFromDOM();
        renderActiveList();
      },
      onAdd:evt=>{
        const bundle=dragBundle;
        dragBundle=null;
        if(bundle && bundle.type==='aspen' && evt.from===elements.list){
          const deviceMap=bundle.deviceByMeldung||new Map();
          const existing=new Set(state.activeDevices.map(item=>item.meldung));
          const additions=[];
          bundle.meldungen.forEach(meldung=>{
            const device=deviceMap.get(meldung);
            if(!device) return;
            if(existing.has(device.meldung)) return;
            existing.add(device.meldung);
            additions.push(device);
            markAsNew(device.meldung);
          });
          if(additions.length){
            const index=typeof evt.newIndex==='number'?evt.newIndex:state.activeDevices.length;
            const clamped=Math.max(0,Math.min(index,state.activeDevices.length));
            state.activeDevices.splice(clamped,0,...additions);
            renderActiveList();
            if(SHARED?.handleAspenToDeviceDrop){
              additions.forEach(device=>{
                const fake={to:elements.activeList,from:elements.list,item:{dataset:{meldung:device.meldung},__aspenItem:device}};
                void SHARED.handleAspenToDeviceDrop(fake,{});
              });
            }
          }else{
            renderActiveList({persist:false});
          }
          clearSelection();
          return;
        }
        if(bundle && bundle.type==='active' && evt.from===elements.activeList){
          if((state.search?.right||'').trim()){
            renderActiveList({persist:false});
          }else{
            syncActiveOrderFromDOM();
            renderActiveList();
          }
          return;
        }
        const device=extractActiveDeviceFromNode(evt.item);
        if(!device){
          renderActiveList({persist:false});
          return;
        }
        if(state.activeDevices.some(item=>item.meldung===device.meldung)){
          renderActiveList({persist:false});
          return;
        }
        const index=typeof evt.newIndex==='number'?evt.newIndex:state.activeDevices.length;
        const clamped=Math.max(0,Math.min(index,state.activeDevices.length));
        markAsNew(device.meldung);
        state.activeDevices.splice(clamped,0,device);
        renderActiveList();
        if(evt.from===elements.list && SHARED?.handleAspenToDeviceDrop){
          const fake={to:elements.activeList,from:elements.list,item:{dataset:{meldung:device.meldung},__aspenItem:device}};
          void SHARED.handleAspenToDeviceDrop(fake,{});
        }
        clearSelection();
      },
      onRemove:evt=>{
        if(dragBundle && dragBundle.type==='active'){
          return;
        }
        const meldung=(evt.item?.dataset?.meldung||'').trim();
        if(!meldung){
          renderActiveList({persist:false});
          return;
        }
        const before=state.activeDevices.length;
        state.activeDevices=state.activeDevices.filter(item=>item.meldung!==meldung);
        if(before!==state.activeDevices.length){
          clearNewBadge(meldung);
          removeFromSelection(meldung);
          renderActiveList();
        }else{
          renderActiveList({persist:false});
        }
      }
    });
  };
})();
