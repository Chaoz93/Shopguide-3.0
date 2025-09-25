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
    .db-toggle-active.is-active{background:var(--dl-title,#2563eb);color:#fff;box-shadow:0 4px 12px rgba(37,99,235,.35);}
    .db-surface{flex:1;background:var(--dl-bg,#f5f7fb);border-radius:1rem;padding:.75rem;display:flex;flex-direction:column;gap:.5rem;overflow:hidden;}
    .db-columns{flex:1;display:flex;gap:.75rem;min-height:0;}
    .db-column{flex:1;display:flex;flex-direction:column;min-width:0;}
    .db-column-right{display:none;}
    .db-column-right.is-visible{display:flex;}
    .db-column-title{font-weight:600;color:var(--dl-title,#2563eb);margin-bottom:.35rem;}
    .db-toolbar{display:flex;align-items:center;gap:.5rem;}
    .db-search{flex:1;padding:.45rem .65rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.6rem;background:rgba(255,255,255,.75);color:#000;font-size:.9rem;transition:border-color .2s ease,box-shadow .2s ease;}
    .db-search:focus{outline:none;border-color:var(--dl-title,#2563eb);box-shadow:0 0 0 3px rgba(37,99,235,.12);}
    .db-search::placeholder{color:#000;opacity:1;}
    .db-list{flex:1;display:flex;flex-direction:column;gap:.65rem;min-height:1.5rem;overflow:auto;padding-right:.25rem;}
    .db-empty{opacity:.6;padding:.25rem .1rem;}
    .db-card{background:var(--dl-item-bg,#fff);color:var(--dl-sub,#4b5563);border-radius:.8rem;padding:.65rem .75rem;box-shadow:
0 2px 6px rgba(0,0,0,.06);display:flex;align-items:center;gap:.75rem;user-select:none;}
    .db-flex{flex:1;display:flex;flex-direction:column;}
    .db-title{color:var(--dl-title,#2563eb);font-weight:600;line-height:1.1;}
    .db-sub{color:var(--dl-sub,#4b5563);font-size:.85rem;margin-top:.15rem;}
    .db-handle{margin-left:.5rem;flex:0 0 auto;width:28px;height:28px;display:flex;align-items:center;justify-content:center;bor
der-radius:.45rem;background:rgba(0,0,0,.06);cursor:grab;color:inherit;}
    .db-handle:active{cursor:grabbing;}
    .db-card.active{box-shadow:0 0 0 2px var(--dl-active,#10b981) inset,0 8px 20px rgba(0,0,0,.12);transform:translateY(-1px);}
    .db-ghost{opacity:.4;}
    .db-chosen{transform:scale(1.01);}
    .db-menu{position:fixed;z-index:1000;display:none;min-width:200px;padding:.25rem;background:var(--sidebar-module-card-bg,#ff
f);color:var(--sidebar-module-card-text,#111);border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px
 24px rgba(0,0,0,.18);}
    .db-menu.open{display:block;}
    .db-menu .mi{display:block;width:100%;padding:.5rem .75rem;text-align:left;border-radius:.4rem;cursor:pointer;}
    .db-menu .mi:hover{background:rgba(0,0,0,.06);}
    .db-part-list{max-height:240px;overflow:auto;padding:.25rem .5rem;display:flex;flex-direction:column;gap:.25rem;}
    .db-check{display:flex;align-items:center;gap:.4rem;font-size:.85rem;}
    .db-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:1
000;}
    .db-modal.open{display:flex;}
    .db-panel{background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);padding:1rem;border-radiu
s:.75rem;min-width:260px;box-shadow:0 10px 24px rgba(0,0,0,.18);}
    .db-panel .row{margin-bottom:.75rem;}
    .db-panel label{display:block;font-size:.85rem;margin-bottom:.25rem;}
    .db-panel input[type=text],.db-panel select{width:100%;padding:.35rem .5rem;border:1px solid var(--border-color,#e5e7eb);bor
der-radius:.4rem;background:transparent;color:inherit;}
    .db-color{width:100%;height:2.25rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.4rem;background:transparent;
}
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
    root.innerHTML=`
      <div class="db-titlebar">
        <span class="db-title-text">${escapeHtml(initialTitle)}</span>
        <button type="button" class="db-toggle-active" aria-pressed="false">Active Devices</button>
      </div>
      <div class="db-surface">
        <div class="db-toolbar">
          <input type="search" class="db-search" placeholder="Geräte suchen…">
        </div>
        <div class="db-columns">
          <div class="db-column db-column-left">
            <div class="db-list"></div>
          </div>
          <div class="db-column db-column-right">
            <div class="db-column-title">Active Device List</div>
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
          <div class="row"><label>Aktiv-Highlight<input type="color" class="db-color db-c-active" value="#10b981"></label></div>
          <div class="actions"><button class="db-save">Speichern</button><button class="db-close">Schließen</button></div>
        </div>
      </div>
    `;

    const menu=document.createElement('div');
    menu.className='db-menu';
    menu.innerHTML='<div class="mi mi-opt">⚙️ Optionen</div><div class="mi mi-pick">Aspen.xlsx wählen</div><div class="mi mi-disable">Alle deaktivieren</div><div class="db-part-list"></div>';
    document.body.appendChild(menu);

    return {
      root,
      list:root.querySelector('.db-column-left .db-list'),
      activeList:root.querySelector('.db-active-list'),
      activeColumn:root.querySelector('.db-column-right'),
      toggleBtn:root.querySelector('.db-toggle-active'),
      titleText:root.querySelector('.db-title-text'),
      search:root.querySelector('.db-search'),
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
      cActive:root.querySelector('.db-c-active'),
      menu,
      partList:menu.querySelector('.db-part-list')
    };
  }

  function createInitialState(initialTitle){
    return {
      fields:[],
      config:{
        subFields:[DEFAULT_SUB_FIELD],
        partField:TITLE_FIELD,
        title:initialTitle,
        colors:{bg:'#f5f7fb',item:'#ffffff',title:'#2563eb',sub:'#4b5563',active:'#10b981'}
      },
      items:[],
      excluded:new Set(),
      filePath:'',
      searchQuery:'',
      activeListVisible:false
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
        state.config={
          subFields:Array.isArray(saved.config.subFields)&&saved.config.subFields.length?saved.config.subFields.slice():state.config.subFields.slice(),
          partField:saved.config.partField||state.config.partField,
          title:typeof saved.config.title==='string'?saved.config.title:state.config.title,
          colors
        };
      }
      ensureSubFields(state.config);
      if(Array.isArray(saved.items)) state.items=dedupeByMeldung(saved.items);
      if(Array.isArray(saved.excluded)) state.excluded=new Set(saved.excluded);
      state.filePath=typeof saved.filePath==='string'?saved.filePath:state.filePath;
      state.searchQuery=typeof saved.searchQuery==='string'?saved.searchQuery:'';
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
        colors:{...state.config.colors}
      },
      items:state.items,
      excluded:Array.from(state.excluded),
      filePath:state.filePath,
      searchQuery:state.searchQuery||'',
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

  function applyColors(root,colors){
    root.style.setProperty('--dl-bg',colors.bg);
    root.style.setProperty('--dl-item-bg',colors.item);
    root.style.setProperty('--dl-title',colors.title);
    root.style.setProperty('--dl-sub',colors.sub);
    root.style.setProperty('--dl-active',colors.active);
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

  function buildCardMarkup(item,config){
    const titleValue=item.data?.[TITLE_FIELD]||'';
    const meldung=item.meldung||'';
    const subs=(Array.isArray(config.subFields)?config.subFields:[])
      .map(field=>{
        const val=item.data?.[field]||'';
        return val?`<div class="db-sub-line" data-field="${field}">${val}</div>`:'';
      })
      .filter(Boolean)
      .join('');
    return `
      <div class="db-card" data-id="${item.id}" data-meldung="${meldung}" data-part="${item.part}">
        <div class="db-flex">
          <div class="db-title">${titleValue}</div>
          <div class="db-sub">${subs}</div>
        </div>
        <div class="db-handle" title="Ziehen">⋮⋮</div>
      </div>
    `;
  }

  function renderList(elements,state){
    state.items=dedupeByMeldung(state.items);
    const searchRaw=state.searchQuery||'';
    const terms=(searchRaw.match(/\S+/g)||[]).map(term=>term.toLowerCase());
    const visible=state.items.filter(item=>{
      if(state.excluded.has(item.part)) return false;
      return itemMatchesSearch(item,terms);
    });
    if(!visible.length){
      const message=terms.length?`Keine Treffer für „${escapeHtml(searchRaw.trim())}“`:'Keine Geräte';
      elements.list.innerHTML=`<div class="db-empty">${message}</div>`;
      persistState(state);
      updateHighlights(elements.list);
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
    injectStyles();

    const initialTitle=opts?.moduleJson?.settings?.title||'';
    const elements=createElements(initialTitle);
    targetDiv.appendChild(elements.root);
    elements.list.dataset.boardType='aspen-unit';

    const state=createInitialState(initialTitle);
    const instanceId=instanceIdOf(elements.root);
    let tempSubFields=[];

    restoreState(state);

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
    elements.cActive.value=state.config.colors.active;
    elements.titleInput.value=state.config.title||'';

    applyColors(elements.root,state.config.colors);
    updateTitleBar(elements.root,state.config.title);

    if(elements.search){
      elements.search.value=state.searchQuery||'';
      const handleSearchChange=()=>{
        state.searchQuery=elements.search.value;
        render();
      };
      elements.search.addEventListener('input',handleSearchChange);
      elements.search.addEventListener('search',handleSearchChange);
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
      if(elements.search){
        elements.search.value=state.searchQuery||'';
      }
      renderList(elements,state);
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
      elements.cActive.value=state.config.colors.active;
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
        sub:elements.cSub.value,
        active:elements.cActive.value
      };
      updateTitleBar(elements.root,state.config.title);
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
    });

    elements.list.addEventListener('click',event=>{
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
        window.dispatchEvent(new Event(CUSTOM_BROADCAST));
      }
    });

    elements.menu.addEventListener('click',e=>e.stopPropagation());
    targetDiv.addEventListener('contextmenu',event=>{
      event.preventDefault();
      openMenu(event.clientX,event.clientY);
    });
    document.addEventListener('click',event=>{
      if(!elements.menu.contains(event.target)) closeMenu();
    });

    window.addEventListener('storage',event=>{if(event.key===LS_DOC) updateHighlights(elements.list);});
    window.addEventListener(CUSTOM_BROADCAST,()=>updateHighlights(elements.list));

    const mo=new MutationObserver(()=>{
      if(!document.body.contains(elements.root)){
        elements.menu.remove();
        SHARED.clearAspenItems(instanceId);
        mo.disconnect();
      }
    });
    mo.observe(document.body,{childList:true,subtree:true});

    async function pickFromExcel(){
      closeMenu();
      try{
        const [handle]=await showOpenFilePicker({
          types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],
          multiple:false
        });
        if(!handle) return;
        await ensureXLSX();
        const file=await handle.getFile();
        state.filePath=handle.name||'';
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
      }catch(error){console.error(error);}
    }

    await ensureSortable();
    new Sortable(elements.list,{
      group:{name:GROUP_NAME,pull:true,put:true},
      animation:150,
      handle:'.db-handle',
      draggable:'.db-card',
      ghostClass:'db-ghost',
      chosenClass:'db-chosen',
      onSort:()=>{syncFromDOM();render();},
      onAdd:evt=>{syncFromDOM();render();if(SHARED?.handleAspenToDeviceDrop) void SHARED.handleAspenToDeviceDrop(evt,{});},
      onRemove:()=>{syncFromDOM();render();}
    });
  };
})();
