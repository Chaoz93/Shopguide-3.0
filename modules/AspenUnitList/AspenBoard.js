/* Aspen-gebundene Geräteliste, dedupliziert nach Meldung */
(function(){
  'use strict';

  const STYLE_ID = 'db-styles';
  const CSS = `
    .db-root{height:100%;display:flex;flex-direction:column;}
    .db-titlebar{font-weight:600;color:var(--text-color);padding:0 .15rem;user-select:none;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;}
    .db-titlebar[hidden]{display:none;}
    .db-title-group{flex:1;min-width:0;display:flex;flex-direction:column;gap:.1rem;}
    .db-title-text{flex:1;min-width:0;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;}
    .db-title-meta{font-weight:500;font-size:.9rem;color:var(--text-color);white-space:nowrap;display:block;letter-spacing:.01em;}
    .db-refresh{flex:0 0 auto;padding:.3rem .55rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;background:rgba(255,255,255,.75);color:inherit;font-size:.85rem;cursor:pointer;transition:background .2s ease,border-color .2s ease,box-shadow .2s ease;}
    .db-refresh:hover{background:rgba(37,99,235,.08);border-color:var(--dl-title,#2563eb);box-shadow:0 0 0 3px rgba(37,99,235,.12);}
    .db-refresh[hidden]{display:none;}
    .db-surface{flex:1;background:var(--dl-bg,#f5f7fb);border-radius:1rem;padding:.75rem;display:flex;flex-direction:column;gap:.5rem;overflow:hidden;}
    .db-toolbar{display:flex;align-items:center;gap:.5rem;}
    .db-toggle-active{flex:0 0 auto;padding:.45rem .75rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.6rem;background:rgba(255,255,255,.75);color:var(--dl-title,#2563eb);font-weight:600;cursor:pointer;transition:background .2s ease,border-color .2s ease,box-shadow .2s ease,color .2s ease;}
    .db-toggle-active:hover{background:rgba(37,99,235,.08);}
    .db-toggle-active.is-active{background:var(--dl-title,#2563eb);color:#fff;border-color:var(--dl-title,#2563eb);box-shadow:0 0 0 3px rgba(37,99,235,.12);}
    .db-search{flex:1;padding:.45rem .65rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.6rem;background:rgba(255,255,255,.75);color:#000;font-size:.9rem;transition:border-color .2s ease,box-shadow .2s ease;}
    .db-search:focus{outline:none;border-color:var(--dl-title,#2563eb);box-shadow:0 0 0 3px rgba(37,99,235,.12);}
    .db-search::placeholder{color:#000;opacity:1;}
    .db-lists{flex:1;display:flex;gap:.75rem;min-height:1.5rem;overflow:hidden;}
    .db-list-wrap{flex:1;display:flex;flex-direction:column;gap:.35rem;min-width:0;}
    .db-list-title{font-weight:600;color:var(--dl-sub,#4b5563);padding:0 .1rem;}
    .db-list{flex:1;display:flex;flex-direction:column;gap:.65rem;min-height:1.5rem;overflow:auto;padding-right:.25rem;}
    .db-active-wrap{display:none;max-width:50%;}
    .db-active-wrap[hidden]{display:none;}
    .db-root.db-has-active .db-active-wrap{display:flex;}
    .db-empty{opacity:.6;padding:.25rem .1rem;}
    .db-card{background:var(--dl-item-bg,#fff);color:var(--dl-sub,#4b5563);border-radius:.8rem;padding:.65rem .75rem;box-shadow:
0 2px 6px rgba(0,0,0,.06);display:flex;align-items:center;gap:.75rem;user-select:none;}
    .db-flex{flex:1;display:flex;flex-direction:column;}
    .db-card-header{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;}
    .db-card-tags{margin-left:auto;display:flex;flex-wrap:wrap;gap:.35rem;justify-content:flex-end;}
    .db-card-tag{background:rgba(37,99,235,.12);color:var(--dl-title,#2563eb);padding:.1rem .4rem;border-radius:999px;font-size:.75rem;font-weight:600;white-space:nowrap;}
    .db-title{color:var(--dl-title,#2563eb);font-weight:600;line-height:1.1;}
    .db-sub{color:var(--dl-sub,#4b5563);font-size:.85rem;margin-top:.15rem;}
    .db-handle{margin-left:.5rem;flex:0 0 auto;width:28px;height:28px;display:flex;align-items:center;justify-content:center;bor
der-radius:.45rem;background:rgba(0,0,0,.06);cursor:grab;color:inherit;}
    .db-handle:active{cursor:grabbing;}
    .db-card.active{box-shadow:0 0 0 2px var(--dl-active,#10b981) inset,0 8px 20px rgba(0,0,0,.12);transform:translateY(-1px);}
    .db-ghost{opacity:.4;}
    .db-chosen{transform:scale(1.01);}
    .db-menu{position:fixed;z-index:2200;display:none;min-width:200px;padding:.25rem;background:var(--sidebar-module-card-bg,#ff
f);color:var(--sidebar-module-card-text,#111);border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px
 24px rgba(0,0,0,.18);}
    .db-menu.open{display:block;}
    .db-menu .mi{display:block;width:100%;padding:.5rem .75rem;text-align:left;border-radius:.4rem;cursor:pointer;}
    .db-menu .mi:hover{background:rgba(0,0,0,.06);}
    .db-part-filter{padding:.35rem .5rem .15rem;}
    .db-part-filter input{width:100%;padding:.35rem .55rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;background:transparent;color:inherit;font-size:.85rem;}
    .db-part-filter input:focus{outline:none;border-color:var(--dl-title,#2563eb);box-shadow:0 0 0 3px rgba(37,99,235,.12);}
    .db-part-list{max-height:240px;overflow:auto;padding:.25rem .5rem .5rem;display:flex;flex-direction:column;gap:.25rem;}
    .db-check{display:flex;align-items:center;gap:.4rem;font-size:.85rem;}
    .db-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:2150;}
    .db-modal.open{display:flex;}
    .db-panel{background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);padding:1rem;border-radiu
s:.75rem;min-width:260px;box-shadow:0 10px 24px rgba(0,0,0,.18);position:relative;z-index:2210;}
    .db-panel .row{margin-bottom:.75rem;}
    .db-panel label{display:block;font-size:.85rem;margin-bottom:.25rem;}
    .db-panel input[type=text],.db-panel select{width:100%;padding:.35rem .5rem;border:1px solid var(--border-color,#e5e7eb);bor
der-radius:.4rem;background:transparent;color:inherit;}
    .db-panel .db-part-select{position:relative;}
    .db-panel .db-part-select::after{content:'▾';position:absolute;right:.6rem;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--dl-sub,#4b5563);font-size:.75rem;}
    .db-part-select-input{width:100%;padding:.35rem 2rem .35rem .5rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.4rem;background:transparent;color:inherit;}
    .db-part-select-input:focus{outline:none;border-color:var(--dl-title,#2563eb);box-shadow:0 0 0 3px rgba(37,99,235,.12);}
    .db-part-options{position:absolute;top:calc(100% + .25rem);left:0;right:0;max-height:220px;overflow:auto;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);padding:.25rem 0;display:none;z-index:2220;}
    .db-part-options.open{display:flex;flex-direction:column;}
    .db-part-option{display:block;width:100%;padding:.35rem .75rem;text-align:left;background:none;border:0;font:inherit;color:inherit;cursor:pointer;}
    .db-part-option:hover,.db-part-option.is-active{background:rgba(37,99,235,.08);}
    .db-part-options .db-empty{padding:.35rem .75rem;}
    .db-sel-part{display:none;}
    .db-color{width:100%;height:2.25rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.4rem;background:transparent;
}
    .db-panel .row.subs{display:flex;flex-direction:column;gap:.4rem;}
    .db-sub-list{display:flex;flex-direction:column;gap:.35rem;}
    .db-sub-row{display:flex;gap:.5rem;align-items:center;}
    .db-sub-picker{flex:1;position:relative;display:flex;}
    .db-sub-input{flex:1;padding:.35rem .5rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.4rem;background:transparent;color:inherit;}
    .db-sub-input:focus{outline:none;border-color:var(--dl-title,#2563eb);box-shadow:0 0 0 3px rgba(37,99,235,.12);}
    .db-sub-row button{padding:.35rem .6rem;}
    .db-sub-remove{padding:.35rem .55rem;}
    .db-add-sub{align-self:flex-start;padding:.35rem .6rem;}
    .db-panel .row.rules{display:flex;flex-direction:column;gap:.4rem;}
    .db-rule-label{font-size:.85rem;font-weight:600;}
    .db-rule-list{display:flex;flex-direction:column;gap:.35rem;}
    .db-rule-row{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr) minmax(0,1fr) auto;gap:.4rem;align-items:center;}
    .db-rule-row select,.db-rule-row input{width:100%;padding:.35rem .5rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.4rem;background:transparent;color:inherit;}
    .db-rule-row .db-rule-remove{padding:.35rem .55rem;}
    .db-rule-empty{font-size:.85rem;opacity:.7;}
    .db-add-rule{align-self:flex-start;padding:.35rem .6rem;}
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
    root.innerHTML=`<div class="db-titlebar" hidden><div class="db-title-group"><span class="db-title-text"></span><span class="db-title-meta" hidden></span></div><button type="button" class="db-refresh" title="Aspen-Datei aktualisieren">↻</button></div><div class="db-surface"><div class="db-toolbar"><input type="search" class="db-search" placeholder="Geräte suchen…"><button type="button" class="db-toggle-active" aria-pressed="false" title="Aktive Geräteliste umschalten">Aktive Geräte</button></div><div class="db-lists"><div class="db-list-wrap db-main-wrap"><div class="db-list db-main-list" data-board-type="aspen-unit"></div></div><div class="db-list-wrap db-active-wrap" hidden><div class="db-list-title">Aktive Geräte</div><div class="db-list db-active-list" data-board-type="aspen-active"></div></div></div></div><div class="db-modal"><div class="db-panel"><div class="row"><label>Titel (optional)<input type="text" class="db-title-input"></label></div><div class="row rules"><div class="db-rule-label">Titel-Logik (Wenn/Dann)</div><div class="db-rule-list"></div><button type="button" class="db-add-rule">Regel hinzufügen</button></div><div class="row subs"><label>Untertitel-Felder</label><div class="db-sub-list"></div><button type="button" class="db-add-sub">+</button></div><div class="row"><label>Dropdownkriterium<div class="db-part-select"><input type="text" class="db-part-select-input" placeholder="Spalte wählen"><div class="db-part-options"></div></div><select class="db-sel-part" hidden></select></label></div><div class="row"><label>Hintergrund<input type="color" class="db-color db-c-bg" value="#f5f7fb"></label></div><div class="row"><label>Item Hintergrund<input type="color" class="db-color db-c-item" value="#ffffff"></label></div><div class="row"><label>Titelfarbe<input type="color" class="db-color db-c-title" value="#2563eb"></label></div><div class="row"><label>Untertitel-Farbe<input type="color" class="db-color db-c-sub" value="#4b5563"></label></div><div class="row"><label>Aktiv-Highlight<input type="color" class="db-color db-c-active" value="#10b981"></label></div><div class="actions"><button class="db-save">Speichern</button><button class="db-close">Schließen</button></div></div></div>`;

    const titleBar=root.querySelector('.db-titlebar');
    if(titleBar){
      const titleText=titleBar.querySelector('.db-title-text');
      if(titleText) titleText.textContent=initialTitle||'';
      titleBar.hidden=!(initialTitle||'').trim();
    }

    const menu=document.createElement('div');
    menu.className='db-menu';
    menu.innerHTML='<div class="mi mi-opt">⚙️ Optionen</div><div class="mi mi-pick">Aspen.xlsx wählen</div><div class="mi mi-disable">Alle deaktivieren</div><div class="db-part-filter"><input type="search" class="db-part-filter-input" placeholder="Überschriften filtern…"></div><div class="db-part-list"></div>';
    document.body.appendChild(menu);

    return {
      root,
      list:root.querySelector('.db-main-list'),
      activeWrap:root.querySelector('.db-active-wrap'),
      activeList:root.querySelector('.db-active-list'),
      toggleActive:root.querySelector('.db-toggle-active'),
      search:root.querySelector('.db-search'),
      titleBar,
      titleText:root.querySelector('.db-title-text'),
      refreshBtn:root.querySelector('.db-refresh'),
      modal:root.querySelector('.db-modal'),
      titleInput:root.querySelector('.db-title-input'),
      ruleList:root.querySelector('.db-rule-list'),
      addRuleBtn:root.querySelector('.db-add-rule'),
      subList:root.querySelector('.db-sub-list'),
      addSubBtn:root.querySelector('.db-add-sub'),
      selPart:root.querySelector('.db-sel-part'),
      partSelectWrap:root.querySelector('.db-part-select'),
      partSelectInput:root.querySelector('.db-part-select-input'),
      partSelectOptions:root.querySelector('.db-part-options'),
      saveBtn:root.querySelector('.db-save'),
      closeBtn:root.querySelector('.db-close'),
      cBg:root.querySelector('.db-c-bg'),
      cItem:root.querySelector('.db-c-item'),
      cTitle:root.querySelector('.db-c-title'),
      cSub:root.querySelector('.db-c-sub'),
      cActive:root.querySelector('.db-c-active'),
      menu,
      partList:menu.querySelector('.db-part-list'),
      partFilter:menu.querySelector('.db-part-filter-input')
    };
  }

  function createInitialState(initialTitle){
    return {
      fields:[],
      config:{
        subFields:[DEFAULT_SUB_FIELD],
        partField:TITLE_FIELD,
        title:initialTitle,
        colors:{bg:'#f5f7fb',item:'#ffffff',title:'#2563eb',sub:'#4b5563',active:'#10b981'},
        titleRules:[]
      },
      items:[],
      excluded:new Set(),
      filePath:'',
      searchQuery:'',
      partFilter:'',
      activeMeldungen:new Set(),
      showActiveList:false
    };
  }

  function ensureSubFields(config){
    if(!Array.isArray(config.subFields) || !config.subFields.length){
      const fallback=config.subField||DEFAULT_SUB_FIELD;
      config.subFields=[fallback];
      if('subField' in config) delete config.subField;
    }
  }

  function normalizeOperator(value){
    const raw=typeof value==='string'?value.trim():'';
    if(!raw) return '=';
    const map={
      '>':'>',
      '>=':'>=',
      '≥':'>=',
      '<':'<',
      '<=':'<=',
      '≤':'<=',
      '=':'=',
      '==':'=',
      '===':'=',
      '!=':'!=',
      '≠':'!=',
      'contains':'contains',
      'enthält':'contains',
      'enthaelt':'contains',
      '~':'contains'
    };
    const key=raw.toLowerCase();
    return map[key]||map[raw]||'=';
  }

  function normalizeTitleRule(rule){
    const source=rule&&typeof rule==='object'?rule:{};
    const field=typeof source.field==='string'?source.field:'';
    const operator=normalizeOperator(source.operator);
    const valueRaw=source.value;
    const value=typeof valueRaw==='number'?String(valueRaw):typeof valueRaw==='string'?valueRaw:'';
    const text=typeof source.text==='string'?source.text:'';
    return {field,operator,value,text};
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
        const savedRules=Array.isArray(saved.config.titleRules)?saved.config.titleRules.map(rule=>normalizeTitleRule(rule)):
          state.config.titleRules.slice();
        state.config={
          subFields:Array.isArray(saved.config.subFields)&&saved.config.subFields.length?saved.config.subFields.slice():state.config.subFields.slice(),
          partField:saved.config.partField||state.config.partField,
          title:typeof saved.config.title==='string'?saved.config.title:state.config.title,
          colors,
          titleRules:savedRules
        };
      }
      ensureSubFields(state.config);
      if(Array.isArray(saved.items)) state.items=dedupeByMeldung(saved.items);
      if(Array.isArray(saved.excluded)) state.excluded=new Set(saved.excluded);
      state.filePath=typeof saved.filePath==='string'?saved.filePath:state.filePath;
      state.searchQuery=typeof saved.searchQuery==='string'?saved.searchQuery:'';
      state.partFilter=typeof saved.partFilter==='string'?saved.partFilter:'';
      if(Array.isArray(saved.activeMeldungen)){
        const normalized=saved.activeMeldungen.map(val=>String(val||'').trim()).filter(Boolean);
        state.activeMeldungen=new Set(normalized);
      }
      if(typeof saved.showActiveList==='boolean') state.showActiveList=!!saved.showActiveList;
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
        titleRules:Array.isArray(state.config.titleRules)?state.config.titleRules.map(rule=>normalizeTitleRule(rule)):[]
      },
      items:state.items,
      excluded:Array.from(state.excluded),
      filePath:state.filePath,
      searchQuery:state.searchQuery||'',
      partFilter:state.partFilter||'',
      activeMeldungen:Array.from(state.activeMeldungen||[]).map(val=>String(val||'').trim()).filter(Boolean),
      showActiveList:!!state.showActiveList
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

  function parseColorToRgb(color){
    if(!color) return null;
    const raw=String(color).trim();
    if(!raw) return null;
    const hexMatch=raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if(hexMatch){
      let hex=hexMatch[1];
      if(hex.length===3){
        hex=hex.split('').map(ch=>ch+ch).join('');
      }
      const r=parseInt(hex.slice(0,2),16);
      const g=parseInt(hex.slice(2,4),16);
      const b=parseInt(hex.slice(4,6),16);
      return [r,g,b];
    }
    const rgbMatch=raw.match(/^rgba?\(([^)]+)\)$/i);
    if(rgbMatch){
      const parts=rgbMatch[1].split(',').map(part=>part.trim());
      if(parts.length>=3){
        const [r,g,b]=parts;
        const toByte=value=>{
          if(value.endsWith('%')){
            const ratio=Number.parseFloat(value.slice(0,-1));
            if(Number.isNaN(ratio)) return null;
            return clamp(Math.round(ratio*2.55),0,255);
          }
          const num=Number.parseFloat(value);
          if(Number.isNaN(num)) return null;
          return clamp(Math.round(num),0,255);
        };
        const red=toByte(r);
        const green=toByte(g);
        const blue=toByte(b);
        if([red,green,blue].every(channel=>typeof channel==='number')){
          return [red,green,blue];
        }
      }
    }
    return null;
  }

  function relativeLuminance(color){
    const rgb=parseColorToRgb(color);
    if(!rgb) return null;
    const [r,g,b]=rgb.map(channel=>{
      const srgb=channel/255;
      return srgb<=0.03928?srgb/12.92:Math.pow((srgb+0.055)/1.055,2.4);
    });
    return 0.2126*r+0.7152*g+0.0722*b;
  }

  function idealTextColor(background){
    const lum=relativeLuminance(background);
    if(lum==null) return '#111111';
    return lum<=0.45?'#ffffff':'#111111';
  }

  function applyColors(root,colors){
    root.style.setProperty('--dl-bg',colors.bg);
    root.style.setProperty('--dl-item-bg',colors.item);
    root.style.setProperty('--dl-title',colors.title);
    root.style.setProperty('--dl-sub',colors.sub);
    root.style.setProperty('--dl-active',colors.active);
    const docStyle=getComputedStyle(document.documentElement);
    const configuredTextColor=docStyle.getPropertyValue('--text-color')?.trim();
    const textColor=configuredTextColor||idealTextColor(colors.bg);
    root.style.color=textColor;
    root.style.setProperty('--text-color',textColor);
  }

  function formatLastModified(value){
    if(typeof value!=='number' || !Number.isFinite(value)) return '';
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return '';
    const pad=num=>String(num).padStart(2,'0');
    const day=pad(date.getDate());
    const month=pad(date.getMonth()+1);
    const hours=pad(date.getHours());
    const minutes=pad(date.getMinutes());
    return `${day}.${month}  ${hours}:${minutes}`;
  }

  function updateTitleBar(root,title,options){
    const bar=root.querySelector('.db-titlebar');
    if(!bar) return;
    const textNode=bar.querySelector('.db-title-text');
    const refreshBtn=bar.querySelector('.db-refresh');
    const metaNode=bar.querySelector('.db-title-meta');
    const fallback=(options?.filePath||'').trim();
    const text=(title||'').trim()||fallback;
    if(textNode){
      textNode.textContent=text;
    }else{
      bar.textContent=text;
    }
    const formattedMeta=formatLastModified(options?.lastModified);
    if(metaNode){
      if(formattedMeta){
        metaNode.textContent=`Aspenalter: ${formattedMeta}`;
        metaNode.hidden=false;
        metaNode.removeAttribute('hidden');
        metaNode.style.removeProperty('display');
      }else{
        metaNode.textContent='';
        metaNode.hidden=true;
        metaNode.setAttribute('hidden','');
        metaNode.style.display='none';
      }
    }
    const canRefresh=!!options?.canRefresh;
    const showRefresh=canRefresh||!!fallback;
    if(refreshBtn){
      refreshBtn.hidden=!showRefresh;
      const label=canRefresh?'Aspen-Datei aktualisieren':'Aspen-Datei wählen';
      refreshBtn.title=label;
      refreshBtn.setAttribute('aria-label',label);
    }
    const showMeta=!!metaNode && !metaNode.hidden && !!metaNode.textContent.trim();
    bar.hidden=!text && !showRefresh && !showMeta;
  }

  function parseNumericValue(value){
    if(typeof value==='number' && Number.isFinite(value)) return value;
    if(typeof value==='boolean') return value?1:0;
    const raw=typeof value==='string'?value.trim():value;
    if(typeof raw==='string'){
      if(!raw) return NaN;
      const normalized=raw.replace(/,/g,'.');
      const num=Number(normalized);
      return Number.isNaN(num)?NaN:num;
    }
    const coerced=Number(raw);
    return Number.isNaN(coerced)?NaN:coerced;
  }

  function compareRuleValue(rawValue,operator,targetValue){
    const op=normalizeOperator(operator);
    const leftRaw=rawValue==null?'':String(rawValue).trim();
    const rightRaw=targetValue==null?'':String(targetValue).trim();
    const leftNum=parseNumericValue(rawValue);
    const rightNum=parseNumericValue(targetValue);
    const numeric=!Number.isNaN(leftNum) && !Number.isNaN(rightNum);
    switch(op){
      case '>': return numeric && leftNum>rightNum;
      case '>=': return numeric && leftNum>=rightNum;
      case '<': return numeric && leftNum<rightNum;
      case '<=': return numeric && leftNum<=rightNum;
      case 'contains':
        if(!rightRaw) return false;
        return leftRaw.toLowerCase().includes(rightRaw.toLowerCase());
      case '!=':
        if(numeric) return leftNum!==rightNum;
        return leftRaw.toLowerCase()!==rightRaw.toLowerCase();
      case '=':
      default:
        if(numeric) return leftNum===rightNum;
        return leftRaw.toLowerCase()===rightRaw.toLowerCase();
    }
  }

  function collectRuleTextsForItem(item,state){
    if(!state?.config || !item) return [];
    const rules=Array.isArray(state.config.titleRules)?state.config.titleRules:[];
    if(!rules.length) return [];
    const data=item.data&&typeof item.data==='object'?item.data:{};
    return rules.map(rule=>{
      const normalized=normalizeTitleRule(rule);
      const field=(normalized.field||'').trim();
      const text=(normalized.text||'').trim();
      if(!field || !text) return '';
      const operator=normalizeOperator(normalized.operator);
      const value=normalized.value;
      return compareRuleValue(data[field],operator,value)?text:'';
    }).filter(Boolean);
  }

  function buildCardMarkup(item,config,ruleTexts){
    const titleValue=item.data?.[TITLE_FIELD]||'';
    const meldung=item.meldung||'';
    const subs=(Array.isArray(config.subFields)?config.subFields:[])
      .map(field=>{
        const val=item.data?.[field]||'';
        return val?`<div class="db-sub-line" data-field="${field}">${val}</div>`:'';
      })
      .filter(Boolean)
      .join('');
    const tags=Array.isArray(ruleTexts)?ruleTexts.map(val=>String(val||'').trim()).filter(Boolean):[];
    const tagHtml=tags.length?`<div class="db-card-tags">${tags.map(val=>`<span class="db-card-tag">${escapeHtml(val)}</span>`).join('')}</div>`:'';
    return `
      <div class="db-card" data-id="${item.id}" data-meldung="${meldung}" data-part="${item.part}">
        <div class="db-flex">
          <div class="db-card-header">
            <div class="db-title">${titleValue}</div>
            ${tagHtml}
          </div>
          <div class="db-sub">${subs}</div>
        </div>
        <div class="db-handle" title="Ziehen">⋮⋮</div>
      </div>
    `;
  }

  function renderListSection(listEl,state,items,options){
    if(!listEl) return;
    const searchRaw=state.searchQuery||'';
    const terms=(searchRaw.match(/\S+/g)||[]).map(term=>term.toLowerCase());
    const respectExcluded=options?.respectExcluded!==false;
    const ignoreSearch=options?.ignoreSearch===true;
    const visible=items.filter(item=>{
      if(respectExcluded && state.excluded.has(item.part)) return false;
      if(ignoreSearch) return true;
      return itemMatchesSearch(item,terms);
    });
    if(!visible.length){
      const fallback=options?.emptyMessage||'Keine Geräte';
      const message=!ignoreSearch && terms.length?`Keine Treffer für „${escapeHtml(searchRaw.trim())}“`:fallback;
      listEl.innerHTML=`<div class="db-empty">${message}</div>`;
      updateHighlights(listEl);
      return;
    }
    listEl.innerHTML=visible
      .map(item=>buildCardMarkup(item,state.config,collectRuleTextsForItem(item,state)))
      .join('');
    const nodes=listEl.querySelectorAll('.db-card');
    visible.forEach((item,index)=>{
      const node=nodes[index];
      if(node){
        node.__aspenItem=item;
      }
    });
    updateHighlights(listEl);
  }

  function refreshMenu(menuEl,state,renderFn){
    if(!menuEl?.partList) return;
    state.items=dedupeByMeldung(state.items);
    const filterRaw=(state.partFilter||'').trim().toLowerCase();
    const parts=Array.from(new Set(state.items.map(item=>item.part))).sort();
    const filtered=filterRaw?parts.filter(part=>part.toLowerCase().includes(filterRaw)):parts;
    if(menuEl.partFilter){
      menuEl.partFilter.value=state.partFilter||'';
    }
    if(!filtered.length){
      menuEl.partList.innerHTML='<div class="db-empty">Keine Treffer</div>';
      return;
    }
    menuEl.partList.innerHTML=filtered.map(part=>`<label class="db-check"><input type="checkbox" data-part="${part}" ${state.excluded.has(part)?'':'checked'}> ${part}</label>`).join('');
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
    if(item?.meldung) values.push(item.meldung);
    if(item?.part) values.push(item.part);
    const data=item?.data && typeof item.data==='object'?item.data:{};
    for(const key in data){
      const val=data[key];
      if(val==null) continue;
      values.push(val);
    }
    if(!values.length) return false;
    const haystack=values.map(entry=>String(entry).toLowerCase());
    return terms.every(term=>haystack.some(value=>value.includes(term)));
  }

  window.renderAspenBoard=async function(targetDiv,opts){
    let lastModifiedCheck=null;
    let pollInterval=null;
    const POLL_INTERVAL_MS=60000;
    let pollInProgress=false;
    injectStyles();

    const initialTitle=opts?.moduleJson?.settings?.title||'';
    const elements=createElements(initialTitle);
    targetDiv.appendChild(elements.root);
    elements.list.dataset.boardType='aspen-unit';
    if(elements.activeList) elements.activeList.dataset.boardType='aspen-active';

    const state=createInitialState(initialTitle);
    const instanceId=instanceIdOf(elements.root);
    let fileHandle=null;
    let tempSubFields=[];
    let tempTitleRules=[];
    let partOptions=[];
    let filteredPartOptions=[];
    let partSelectOpen=false;
    let highlightedPartIndex=-1;
    let partSelectOutsideHandler=null;

    restoreState(state);

    elements.cBg.value=state.config.colors.bg;
    elements.cItem.value=state.config.colors.item;
    elements.cTitle.value=state.config.colors.title;
    elements.cSub.value=state.config.colors.sub;
    elements.cActive.value=state.config.colors.active;
    elements.titleInput.value=state.config.title||'';

    applyColors(elements.root,state.config.colors);
    updateTitleBar(elements.root,state.config.title,{filePath:state.filePath,canRefresh:!!fileHandle,lastModified:lastModifiedCheck});

    function stopPolling(){
      if(pollInterval){
        clearInterval(pollInterval);
        pollInterval=null;
      }
      pollInProgress=false;
    }

    async function pollFileChangesOnce(){
      if(pollInProgress) return;
      if(!fileHandle){
        stopPolling();
        return;
      }
      pollInProgress=true;
      try{
        const file=await fileHandle.getFile();
        const modified=typeof file?.lastModified==='number'?file.lastModified:null;
        if(modified===null){
          return;
        }
        if(lastModifiedCheck===null){
          lastModifiedCheck=modified;
          return;
        }
        if(modified>lastModifiedCheck){
          const reloaded=await loadAspenFromHandle(fileHandle,{silent:true});
          if(reloaded){
            lastModifiedCheck=modified;
          }
        }
      }catch(err){
        console.warn('[UnitBoard] Polling fehlgeschlagen',err);
        stopPolling();
      }finally{
        pollInProgress=false;
      }
    }

    function startPolling(){
      stopPolling();
      if(!fileHandle) return;
      pollInterval=setInterval(()=>{void pollFileChangesOnce();},POLL_INTERVAL_MS);
    }

    if(elements.refreshBtn){
      elements.refreshBtn.addEventListener('click',async()=>{
        if(elements.refreshBtn.disabled) return;
        elements.refreshBtn.disabled=true;
        try{
          if(fileHandle){
            await loadAspenFromHandle(fileHandle,{silent:false});
          }else{
            await pickFromExcel();
          }
        }finally{
          elements.refreshBtn.disabled=false;
        }
      });
    }

    if(elements.search){
      elements.search.value=state.searchQuery||'';
      const handleSearchChange=()=>{
        state.searchQuery=elements.search.value;
        render();
      };
      elements.search.addEventListener('input',handleSearchChange);
      elements.search.addEventListener('search',handleSearchChange);
    }


    function syncPartSelectInputValue(){
      if(elements.partSelectInput){
        elements.partSelectInput.value=elements.selPart?.value||'';
      }
    }

    function updatePartSelectHighlight(){
      if(!elements.partSelectOptions) return;
      const nodes=Array.from(elements.partSelectOptions.querySelectorAll('.db-part-option'));
      nodes.forEach((node,index)=>{
        const isActive=index===highlightedPartIndex;
        node.classList.toggle('is-active',isActive);
        if(isActive){
          node.scrollIntoView({block:'nearest'});
        }
      });
    }

    function renderPartSelectOptions(query){
      if(!elements.partSelectOptions) return;
      const normalized=(query||'').trim().toLowerCase();
      filteredPartOptions=normalized?partOptions.filter(option=>option.toLowerCase().includes(normalized)):partOptions.slice();
      if(!filteredPartOptions.length){
        elements.partSelectOptions.innerHTML='<div class="db-empty">Keine Treffer</div>';
        highlightedPartIndex=-1;
        return;
      }
      elements.partSelectOptions.innerHTML=filteredPartOptions.map((option,index)=>`<button type="button" class="db-part-option" data-index="${index}" data-value="${option}">${option}</button>`).join('');
      elements.partSelectOptions.querySelectorAll('.db-part-option').forEach(btn=>{
        btn.addEventListener('mousedown',event=>event.preventDefault());
        btn.addEventListener('click',()=>{
          choosePartOption(btn.dataset.value);
        });
      });
      const currentValue=elements.selPart?.value||'';
      const matchIndex=filteredPartOptions.findIndex(option=>option===currentValue);
      highlightedPartIndex=matchIndex>=0?matchIndex:0;
      updatePartSelectHighlight();
    }

    function setHighlightedPartIndex(next){
      if(!filteredPartOptions.length){
        highlightedPartIndex=-1;
        updatePartSelectHighlight();
        return;
      }
      const clampedIndex=Math.max(0,Math.min(filteredPartOptions.length-1,next));
      highlightedPartIndex=clampedIndex;
      updatePartSelectHighlight();
    }

    function closePartSelectDropdown(){
      if(!partSelectOpen) return;
      partSelectOpen=false;
      highlightedPartIndex=-1;
      if(elements.partSelectOptions){
        elements.partSelectOptions.classList.remove('open');
      }
      if(partSelectOutsideHandler){
        document.removeEventListener('mousedown',partSelectOutsideHandler);
        partSelectOutsideHandler=null;
      }
    }

    function openPartSelectDropdown(){
      if(!elements.partSelectOptions) return;
      if(!partSelectOpen){
        partSelectOpen=true;
        elements.partSelectOptions.classList.add('open');
        partSelectOutsideHandler=event=>{
          if(!elements.partSelectWrap?.contains(event.target)){
            closePartSelectDropdown();
          }
        };
        document.addEventListener('mousedown',partSelectOutsideHandler);
      }
      renderPartSelectOptions(elements.partSelectInput?.value||'');
    }

    function choosePartOption(value){
      if(!value) return;
      if(elements.partSelectInput){
        elements.partSelectInput.value=value;
      }
      if(elements.selPart && elements.selPart.value!==value){
        elements.selPart.value=value;
        elements.selPart.dispatchEvent(new Event('change',{bubbles:true}));
      }
      closePartSelectDropdown();
    }

    function handlePartSelectKeydown(event){
      if(event.key==='ArrowDown'){
        event.preventDefault();
        openPartSelectDropdown();
        if(filteredPartOptions.length){
          const nextIndex=highlightedPartIndex<0?0:Math.min(filteredPartOptions.length-1,highlightedPartIndex+1);
          setHighlightedPartIndex(nextIndex);
        }
        return;
      }
      if(event.key==='ArrowUp'){
        event.preventDefault();
        openPartSelectDropdown();
        if(filteredPartOptions.length){
          const nextIndex=highlightedPartIndex<=0?0:highlightedPartIndex-1;
          setHighlightedPartIndex(nextIndex);
        }
        return;
      }
      if(event.key==='Enter'){
        if(partSelectOpen){
          event.preventDefault();
          const option=highlightedPartIndex>=0?filteredPartOptions[highlightedPartIndex]:filteredPartOptions[0];
          if(option){
            choosePartOption(option);
          }
        }
        return;
      }
      if(event.key==='Escape' && partSelectOpen){
        event.preventDefault();
        closePartSelectDropdown();
      }
    }


    if(elements.partSelectInput){
      syncPartSelectInputValue();
      elements.partSelectInput.addEventListener('focus',()=>{
        openPartSelectDropdown();
        requestAnimationFrame(()=>{
          try{elements.partSelectInput.select();}catch(e){/* ignore */}
        });
      });
      elements.partSelectInput.addEventListener('input',()=>{
        openPartSelectDropdown();
        renderPartSelectOptions(elements.partSelectInput.value);
      });
      elements.partSelectInput.addEventListener('keydown',handlePartSelectKeydown);
      elements.partSelectInput.addEventListener('blur',()=>{
        setTimeout(()=>{
          if(!partSelectOpen) return;
          const active=document.activeElement;
          if(!elements.partSelectWrap || !elements.partSelectWrap.contains(active)){
            closePartSelectDropdown();
          }
        },100);
      });
    }

    if(elements.partSelectWrap){
      elements.partSelectWrap.addEventListener('mousedown',event=>{
        if(event.target===elements.partSelectInput) return;
        if(event.target.closest('.db-part-options')) return;
        event.preventDefault();
        elements.partSelectInput?.focus();
      });
    }

    if(elements.partFilter){
      elements.partFilter.value=state.partFilter||'';
      elements.partFilter.addEventListener('input',()=>{
        state.partFilter=elements.partFilter.value;
        refreshMenu(elements,state,render);
      });
    }

    if(elements.toggleActive){
      elements.toggleActive.addEventListener('click',()=>{
        state.showActiveList=!state.showActiveList;
        render();
      });
    }

    function populateFieldSelects(){
      ensureSubFields(state.config);
      const options=getAvailableFieldList(state,[state.config.partField]);
      elements.selPart.innerHTML=options.map(field=>`<option value="${field}" ${field===state.config.partField?'selected':''}>${field}</option>`).join('');
      if(!options.includes(state.config.partField)){
        state.config.partField=options[0]||DEFAULT_SUB_FIELD;
        elements.selPart.value=state.config.partField;
      }
      partOptions=options.slice();
      syncPartSelectInputValue();
      if(partSelectOpen){
        renderPartSelectOptions(elements.partSelectInput?.value||'');
      }
      if(elements.modal?.classList.contains('open')){
        renderRuleControls();
      }
    }

    function syncFromDOM(){
      const existing=new Map(state.items.map(item=>[item.id,item]));
      const orderedMain=[];
      const orderedActive=[];
      const seen=new Set();
      const collect=(container,target)=>{
        if(!container) return;
        container.querySelectorAll('.db-card').forEach(node=>{
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
          target.push(item);
          seen.add(id);
        });
      };
      collect(elements.list,orderedMain);
      collect(elements.activeList,orderedActive);
      const remaining=state.items.filter(item=>!seen.has(item.id));
      state.items=dedupeByMeldung([...orderedMain,...orderedActive,...remaining]);
      state.activeMeldungen=new Set(orderedActive.map(item=>item.meldung).filter(Boolean));
    }

    function render(){
      state.items=dedupeByMeldung(state.items);
      if(!(state.activeMeldungen instanceof Set)){
        state.activeMeldungen=new Set(Array.isArray(state.activeMeldungen)?state.activeMeldungen:[]);
      }
      updateTitleBar(elements.root,state.config.title,{filePath:state.filePath,canRefresh:!!fileHandle,lastModified:lastModifiedCheck});
      if(elements.search){
        elements.search.value=state.searchQuery||'';
      }
      const activeSet=state.activeMeldungen;
      const activeItems=state.items.filter(item=>activeSet.has(item.meldung));
      const mainItems=state.items.filter(item=>{
        if(state.showActiveList && activeSet.has(item.meldung)) return false;
        return true;
      });
      renderListSection(elements.list,state,mainItems,{emptyMessage:'Keine Geräte'});
      if(elements.activeWrap && elements.activeList){
        elements.activeWrap.hidden=!state.showActiveList;
        renderListSection(elements.activeList,state,activeItems,{
          emptyMessage:'Keine aktiven Geräte',
          respectExcluded:false,
          ignoreSearch:true
        });
      }
      elements.root.classList.toggle('db-has-active',!!state.showActiveList);
      if(elements.toggleActive){
        elements.toggleActive.classList.toggle('is-active',!!state.showActiveList);
        elements.toggleActive.setAttribute('aria-pressed',state.showActiveList?'true':'false');
      }
      persistState(state);
      SHARED.publishAspenItems(instanceId,state.items);
      refreshMenu(elements,state,render);
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

    elements.menu.querySelector('.mi-pick').addEventListener('click',pickFromExcel);
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
        const choices=getAvailableFieldList(state,tempSubFields);
        if(field && !choices.includes(field)) choices.push(field);

        const picker=document.createElement('div');
        picker.className='db-sub-picker';
        const input=document.createElement('input');
        input.type='text';
        input.className='db-sub-input';
        input.placeholder='Spalte wählen';
        input.autocomplete='off';
        input.value=field||'';
        if(!field && choices.length){
          tempSubFields[index]=choices[0];
          input.value=choices[0];
        }
        const dataList=document.createElement('datalist');
        const listId=`db-sub-options-${Date.now()}-${index}-${Math.floor(Math.random()*1000)}`;
        dataList.id=listId;
        input.setAttribute('list',listId);
        const renderOptions=(filter='')=>{
          const normalized=(filter||'').trim().toLowerCase();
          const filtered=normalized?choices.filter(opt=>opt.toLowerCase().includes(normalized)):choices;
          dataList.innerHTML=filtered.map(opt=>`<option value="${opt}"></option>`).join('');
        };
        renderOptions();
        const commitInput=()=>{
          const raw=(input.value||'').trim();
          if(!raw){
            tempSubFields[index]='';
            input.value='';
            renderOptions();
            return;
          }
          const exact=choices.find(opt=>opt.toLowerCase()===raw.toLowerCase());
          if(exact){
            tempSubFields[index]=exact;
            input.value=exact;
            renderOptions();
            return;
          }
          const partial=choices.find(opt=>opt.toLowerCase().includes(raw.toLowerCase()));
          if(partial){
            tempSubFields[index]=partial;
            input.value=partial;
            renderOptions();
            return;
          }
          input.value=tempSubFields[index]||'';
          renderOptions();
        };
        input.addEventListener('input',()=>{renderOptions(input.value);});
        input.addEventListener('focus',()=>{renderOptions();});
        input.addEventListener('change',commitInput);
        input.addEventListener('keydown',event=>{
          if(event.key==='Enter'){
            event.preventDefault();
            commitInput();
            input.blur();
          }
        });
        input.addEventListener('blur',()=>{setTimeout(commitInput,0);});
        picker.appendChild(input);
        row.appendChild(picker);
        row.appendChild(dataList);

        const sortBtn=document.createElement('button');
        sortBtn.type='button';
        sortBtn.className='db-sort';
        sortBtn.textContent='Sortieren';
        sortBtn.addEventListener('click',()=>{
          commitInput();
          const fieldName=(tempSubFields[index]||'').trim()||input.value.trim();
          if(!fieldName) return;
          syncFromDOM();
          state.items.sort((a,b)=>String(a?.data?.[fieldName]||'').localeCompare(String(b?.data?.[fieldName]||'')));
          render();
        });
        row.appendChild(sortBtn);

        const removeBtn=document.createElement('button');
        removeBtn.type='button';
        removeBtn.className='db-sub-remove';
        removeBtn.title='Feld entfernen';
        removeBtn.setAttribute('aria-label','Feld entfernen');
        removeBtn.textContent='✕';
        removeBtn.addEventListener('click',()=>{
          if(tempSubFields.length>1){
            tempSubFields.splice(index,1);
          }else{
            tempSubFields[0]='';
          }
          renderSubFieldControls();
        });
        row.appendChild(removeBtn);

        elements.subList.appendChild(row);
      });
    }

    function renderRuleControls(){
      if(!elements.ruleList) return;
      const rules=Array.isArray(tempTitleRules)?tempTitleRules:[];
      const available=getAvailableFieldList(state,rules.map(rule=>rule?.field).filter(Boolean));
      elements.ruleList.innerHTML='';
      if(!rules.length){
        const empty=document.createElement('div');
        empty.className='db-rule-empty';
        empty.textContent='Keine Regeln hinterlegt';
        elements.ruleList.appendChild(empty);
        return;
      }
      rules.forEach((rule,index)=>{
        const normalized=normalizeTitleRule(rule);
        tempTitleRules[index]=normalized;
        const row=document.createElement('div');
        row.className='db-rule-row';

        const fieldChoices=available.slice();
        if(normalized.field && !fieldChoices.includes(normalized.field)) fieldChoices.push(normalized.field);
        const fieldInput=document.createElement('input');
        fieldInput.type='text';
        fieldInput.className='db-rule-field';
        fieldInput.placeholder='Spalte wählen';
        fieldInput.autocomplete='off';
        fieldInput.value=normalized.field||'';
        const dataList=document.createElement('datalist');
        const listId=`db-rule-options-${Date.now()}-${index}-${Math.floor(Math.random()*1000)}`;
        dataList.id=listId;
        dataList.style.display='none';
        fieldInput.setAttribute('list',listId);
        const renderFieldOptions=(filter='')=>{
          const normalizedFilter=(filter||'').trim().toLowerCase();
          const filtered=normalizedFilter?fieldChoices.filter(opt=>opt.toLowerCase().includes(normalizedFilter)):fieldChoices;
          dataList.innerHTML=filtered.map(opt=>`<option value="${opt}"></option>`).join('');
        };
        const commitField=()=>{
          const raw=(fieldInput.value||'').trim();
          if(!raw){
            tempTitleRules[index].field='';
            fieldInput.value='';
            renderFieldOptions();
            return;
          }
          const lower=raw.toLowerCase();
          const exact=fieldChoices.find(opt=>opt.toLowerCase()===lower);
          if(exact){
            tempTitleRules[index].field=exact;
            fieldInput.value=exact;
            renderFieldOptions();
            return;
          }
          const partial=fieldChoices.find(opt=>opt.toLowerCase().includes(lower));
          if(partial){
            tempTitleRules[index].field=partial;
            fieldInput.value=partial;
            renderFieldOptions();
            return;
          }
          tempTitleRules[index].field=raw;
          fieldInput.value=raw;
          if(!fieldChoices.includes(raw)){
            fieldChoices.push(raw);
          }
          renderFieldOptions();
        };
        renderFieldOptions();
        fieldInput.addEventListener('input',()=>{
          renderFieldOptions(fieldInput.value);
          tempTitleRules[index].field=fieldInput.value;
        });
        fieldInput.addEventListener('focus',()=>{renderFieldOptions();});
        fieldInput.addEventListener('change',commitField);
        fieldInput.addEventListener('keydown',event=>{
          if(event.key==='Enter'){
            event.preventDefault();
            commitField();
            fieldInput.blur();
          }
        });
        fieldInput.addEventListener('blur',()=>{setTimeout(commitField,0);});
        row.appendChild(fieldInput);
        row.appendChild(dataList);

        const operatorSelect=document.createElement('select');
        const operators=[
          {value:'>',label:'>'},
          {value:'>=',label:'>='},
          {value:'=',label:'='},
          {value:'<',label:'<'},
          {value:'<=',label:'<='},
          {value:'!=',label:'≠'},
          {value:'contains',label:'enthält'}
        ];
        const currentOp=normalizeOperator(normalized.operator);
        operatorSelect.innerHTML=operators.map(op=>`<option value="${op.value}" ${op.value===currentOp?'selected':''}>${op.label}</option>`).join('');
        operatorSelect.value=currentOp;
        operatorSelect.addEventListener('change',()=>{
          tempTitleRules[index].operator=operatorSelect.value;
        });
        row.appendChild(operatorSelect);

        const valueInput=document.createElement('input');
        valueInput.type='text';
        valueInput.placeholder='Vergleichswert';
        valueInput.value=normalized.value||'';
        valueInput.addEventListener('input',()=>{
          tempTitleRules[index].value=valueInput.value;
        });
        row.appendChild(valueInput);

        const textInput=document.createElement('input');
        textInput.type='text';
        textInput.placeholder='Titelergänzung';
        textInput.value=normalized.text||'';
        textInput.addEventListener('input',()=>{
          tempTitleRules[index].text=textInput.value;
        });
        row.appendChild(textInput);

        const removeBtn=document.createElement('button');
        removeBtn.type='button';
        removeBtn.className='db-rule-remove';
        removeBtn.title='Regel entfernen';
        removeBtn.textContent='✕';
        removeBtn.addEventListener('click',()=>{
          tempTitleRules.splice(index,1);
          renderRuleControls();
        });
        row.appendChild(removeBtn);

        elements.ruleList.appendChild(row);
      });
    }

    function openOptions(){
      closePartSelectDropdown();
      tempSubFields=Array.isArray(state.config.subFields)?state.config.subFields.slice():[];
      tempTitleRules=Array.isArray(state.config.titleRules)?state.config.titleRules.map(rule=>normalizeTitleRule(rule)):[];
      populateFieldSelects();
      renderSubFieldControls();
      renderRuleControls();
      elements.titleInput.value=state.config.title||'';
      elements.cBg.value=state.config.colors.bg;
      elements.cItem.value=state.config.colors.item;
      elements.cTitle.value=state.config.colors.title;
      elements.cSub.value=state.config.colors.sub;
      elements.cActive.value=state.config.colors.active;
      elements.modal.classList.add('open');
      syncPartSelectInputValue();
    }
    function closeOptions(){
      elements.modal.classList.remove('open');
      tempSubFields=[];
      tempTitleRules=[];
      closePartSelectDropdown();
      syncPartSelectInputValue();
    }

    if(elements.addRuleBtn){
      elements.addRuleBtn.addEventListener('click',()=>{
        const defaults=getAvailableFieldList(state,tempTitleRules.map(rule=>rule?.field).filter(Boolean));
        const defaultField=defaults[0]||'';
        tempTitleRules.push(normalizeTitleRule({field:defaultField,operator:'=',value:'',text:''}));
        renderRuleControls();
      });
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
      elements.subList.querySelectorAll('.db-sub-input').forEach(input=>{
        input.dispatchEvent(new Event('change'));
      });
      elements.ruleList.querySelectorAll('.db-rule-field').forEach(input=>{
        input.dispatchEvent(new Event('change'));
      });
      state.config.title=elements.titleInput.value.trim();
      const newPart=elements.selPart.value;
      const partChanged=state.config.partField!==newPart;
      state.config.partField=newPart;
      const collected=(tempSubFields||[]).map(v=>v||'').filter(Boolean);
      state.config.subFields=collected.length?collected:[getAvailableFieldList(state)[0]||DEFAULT_SUB_FIELD];
      const preparedRules=(tempTitleRules||[]).map(rule=>normalizeTitleRule(rule)).map(rule=>({
        field:(rule.field||'').trim(),
        operator:normalizeOperator(rule.operator),
        value:typeof rule.value==='string'?rule.value.trim():(rule.value==null?'':String(rule.value).trim()),
        text:(rule.text||'').trim()
      })).filter(rule=>rule.field&&rule.text);
      state.config.titleRules=preparedRules;
      state.config.colors={
        bg:elements.cBg.value,
        item:elements.cItem.value,
        title:elements.cTitle.value,
        sub:elements.cSub.value,
        active:elements.cActive.value
      };
      updateTitleBar(elements.root,state.config.title,{filePath:state.filePath,canRefresh:!!fileHandle,lastModified:lastModifiedCheck});
      applyColors(elements.root,state.config.colors);
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
      syncPartSelectInputValue();
      if(partSelectOpen){
        renderPartSelectOptions(elements.partSelectInput?.value||'');
      }
    });

    const handleCardClick=event=>{
      if(event.target.closest('.db-handle')) return;
      const card=event.target.closest('.db-card');
      if(!card) return;
      const meldung=(card.dataset.meldung||'').trim();
      const doc=loadDoc();
      doc.general||={};
      if(doc.general.Meldung!==meldung){
        doc.general.Meldung=meldung;
        saveDoc(doc);
        updateHighlights(elements.list);
        if(elements.activeList) updateHighlights(elements.activeList);
        window.dispatchEvent(new Event(CUSTOM_BROADCAST));
      }
    };
    elements.list.addEventListener('click',handleCardClick);
    if(elements.activeList){
      elements.activeList.addEventListener('click',handleCardClick);
    }

    elements.menu.addEventListener('click',e=>e.stopPropagation());
    targetDiv.addEventListener('contextmenu',event=>{
      event.preventDefault();
      openMenu(event.clientX,event.clientY);
    });
    document.addEventListener('click',event=>{
      if(!elements.menu.contains(event.target)) closeMenu();
    });

    const refreshHighlights=()=>{
      updateHighlights(elements.list);
      if(elements.activeList) updateHighlights(elements.activeList);
    };
    window.addEventListener('storage',event=>{if(event.key===LS_DOC) refreshHighlights();});
    window.addEventListener(CUSTOM_BROADCAST,refreshHighlights);

    const mo=new MutationObserver(()=>{
      if(!document.body.contains(elements.root)){
        elements.menu.remove();
        SHARED.clearAspenItems(instanceId);
        stopPolling();
        mo.disconnect();
      }
    });
    mo.observe(document.body,{childList:true,subtree:true});

    async function loadAspenFromHandle(handle,{silent=false}={}){
      if(!handle) return false;
      try{
        await ensureXLSX();
        const file=await handle.getFile();
        lastModifiedCheck=typeof file?.lastModified==='number'?file.lastModified:Date.now();
        const buffer=await file.arrayBuffer();
        const workbook=XLSX.read(buffer,{type:'array'});
        const worksheet=workbook.Sheets[workbook.SheetNames[0]];
        fileHandle=handle;
        state.filePath=handle.name||state.filePath||'';
        if(!worksheet){
          state.fields=[];
          state.items=[];
          state.activeMeldungen=new Set();
          state.excluded.clear();
          populateFieldSelects();
          render();
          return true;
        }
        const rows=XLSX.utils.sheet_to_json(worksheet,{defval:''});
        const fieldSet=new Set();
        rows.forEach(row=>{if(row&&typeof row==='object'){Object.keys(row).forEach(key=>fieldSet.add(key));}});
        const availableFields=Array.from(fieldSet);
        state.fields=availableFields;
        const preferredPartFields=[
          state.config.partField,
          availableFields.find(field=>/part/i.test(field)),
          availableFields[0],
          TITLE_FIELD,
          DEFAULT_SUB_FIELD
        ].map(val=>val||'');
        const resolvedPartField=preferredPartFields.find(field=>field && availableFields.includes(field))
          || preferredPartFields.find(Boolean)
          || DEFAULT_SUB_FIELD;
        state.config.partField=resolvedPartField;
        const previousSubs=Array.isArray(state.config.subFields)?state.config.subFields.slice():[];
        const preservedSubs=[];
        previousSubs.forEach(field=>{
          const trimmed=(field||'').trim();
          if(trimmed && availableFields.includes(trimmed) && !preservedSubs.includes(trimmed)){
            preservedSubs.push(trimmed);
          }
        });
        if(!preservedSubs.length && resolvedPartField){
          preservedSubs.push(resolvedPartField);
        }
        if(!preservedSubs.length && availableFields.includes(DEFAULT_SUB_FIELD)){
          preservedSubs.push(DEFAULT_SUB_FIELD);
        }
        if(!preservedSubs.length && availableFields.length){
          preservedSubs.push(availableFields[0]);
        }
        if(!preservedSubs.length){
          preservedSubs.push(DEFAULT_SUB_FIELD);
        }
        state.config.subFields=preservedSubs;
        ensureSubFields(state.config);
        const newItems=rows.map(row=>{
          const safeRow=row&&typeof row==='object'?row:{};
          const titleVal=String(safeRow[TITLE_FIELD]||'').trim();
          const partRaw=String(safeRow[resolvedPartField]||'').trim();
          const part=(partRaw.split(':')[0]||'').trim();
          const meldung=String(safeRow[MELDUNG_FIELD]||'').trim();
          if(!titleVal && !part && !meldung) return null;
          const data={...safeRow,[TITLE_FIELD]:titleVal,[resolvedPartField]:part,[MELDUNG_FIELD]:meldung};
          return {id:'it-'+Math.random().toString(36).slice(2),part,meldung,data};
        }).filter(Boolean);
        const deduped=dedupeByMeldung(newItems);
        const sortField=primarySubField(state.config);
        deduped.sort((a,b)=>String(a.data?.[sortField]||'').localeCompare(String(b.data?.[sortField]||'')));
        state.items=deduped;
        const availableMeldungen=new Set(deduped.map(item=>item.meldung).filter(Boolean));
        const prevActive=state.activeMeldungen instanceof Set?Array.from(state.activeMeldungen):Array.isArray(state.activeMeldungen)?state.activeMeldungen:[];
        state.activeMeldungen=new Set(prevActive.filter(meldung=>availableMeldungen.has(meldung)));
        const availableParts=new Set(deduped.map(item=>item.part).filter(Boolean));
        if(!(state.excluded instanceof Set)){
          state.excluded=new Set(Array.isArray(state.excluded)?state.excluded:[]);
        }
        state.excluded=new Set(Array.from(state.excluded).filter(part=>availableParts.has(part)));
        populateFieldSelects();
        render();
        updateTitleBar(elements.root,state.config.title,{filePath:state.filePath,canRefresh:!!fileHandle,lastModified:lastModifiedCheck});
        startPolling();
        return true;
      }catch(error){
        if(!silent) console.error(error);
        fileHandle=null;
        lastModifiedCheck=null;
        stopPolling();
        updateTitleBar(elements.root,state.config.title,{filePath:state.filePath,canRefresh:false,lastModified:lastModifiedCheck});
        return false;
      }
    }

    async function pickFromExcel(){
      closeMenu();
      try{
        const [handle]=await showOpenFilePicker({
          types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],
          multiple:false
        });
        if(!handle) return;
        await loadAspenFromHandle(handle,{silent:false});
      }catch(error){console.error(error);}
    }

    await ensureSortable();
    const sortableConfig={
      group:{name:GROUP_NAME,pull:true,put:true},
      animation:150,
      handle:'.db-handle',
      draggable:'.db-card',
      ghostClass:'db-ghost',
      chosenClass:'db-chosen'
    };
    new Sortable(elements.list,{
      ...sortableConfig,
      onSort:()=>{syncFromDOM();render();},
      onAdd:evt=>{
        syncFromDOM();
        render();
        if(evt?.to===elements.list && SHARED?.handleAspenToDeviceDrop){
          void SHARED.handleAspenToDeviceDrop(evt,{});
        }
      },
      onRemove:()=>{syncFromDOM();render();}
    });
    if(elements.activeList){
      new Sortable(elements.activeList,{
        ...sortableConfig,
        onSort:()=>{syncFromDOM();render();},
        onAdd:()=>{syncFromDOM();render();},
        onRemove:()=>{syncFromDOM();render();}
      });
    }
  };
})();
