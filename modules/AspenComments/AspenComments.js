(function(){
  'use strict';

  const STYLE_ID='device-comments-styles';
  const CSS=`
    .dc-root{height:100%;display:flex;flex-direction:column;gap:.75rem;}
    .dc-title{font-weight:600;font-size:1.05rem;color:var(--text-color);padding:0 .2rem;}
    .dc-status{display:flex;flex-direction:column;gap:.35rem;background:var(--dl-bg,#f5f7fb);border-radius:1rem;padding:.65rem .75rem;}
    .dc-line{display:flex;align-items:center;gap:.5rem;font-size:.85rem;}
    .dc-label{opacity:.7;min-width:105px;font-weight:500;}
    .dc-value{flex:1;min-width:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;font-weight:600;color:var(--dl-title,#2563eb);}
    .dc-device{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.6rem;}
    .dc-field{background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border-radius:.85rem;padding:.55rem .75rem;box-shadow:0 4px 12px rgba(15,23,42,.08);}
    .dc-field-label{font-size:.78rem;opacity:.65;text-transform:uppercase;letter-spacing:.04em;}
    .dc-field-value{font-weight:600;font-size:1.05rem;}
    .dc-editor{flex:1;display:flex;flex-direction:column;gap:.45rem;}
    .dc-editor-label{font-weight:600;font-size:.9rem;color:var(--text-color);}
    .dc-textarea{flex:1;min-height:180px;border-radius:.8rem;border:1px solid var(--border-color,#d1d5db);padding:.65rem .75rem;font:inherit;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);resize:vertical;}
    .dc-textarea:disabled{opacity:.6;cursor:not-allowed;background:rgba(148,163,184,.12);}
    .dc-note{min-height:1.2rem;font-size:.8rem;color:var(--dl-sub,#4b5563);}
    .dc-note.warn{color:#b45309;}
    .dc-note.error{color:#b91c1c;}
    .dc-note.success{color:#0f766e;}
    .dc-menu{position:fixed;z-index:1200;display:none;min-width:220px;padding:.35rem;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border:1px solid var(--border-color,#d1d5db);border-radius:.75rem;box-shadow:0 18px 36px rgba(15,23,42,.2);}
    .dc-menu.open{display:block;}
    .dc-menu button{width:100%;display:flex;align-items:center;gap:.45rem;padding:.55rem .75rem;border:none;background:transparent;color:inherit;font:inherit;cursor:pointer;border-radius:.55rem;text-align:left;}
    .dc-menu button:hover{background:rgba(148,163,184,.18);}
    .dc-menu-sep{height:1px;margin:.25rem 0;background:rgba(148,163,184,.35);}
  `;

  const XLSX_URLS=[
    'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.2/xlsx.full.min.js'
  ];

  const LS_DOC='module_data_v1';
  const LS_STATE_PREFIX='deviceComments:state:';
  const IDB_NAME='modulesApp';
  const IDB_STORE='fs-handles';
  const COMMENTS_SHEET='Comments';
  const WATCH_INTERVAL=500;

  const MELD_PATTERNS=[/meldung/i,/meldung\s*nr/i,/meldungnummer/i,/message/i];
  const PART_PATTERNS=[/part/i,/p\/?n/i,/artikel/i,/material/i];
  const SERIAL_PATTERNS=[/serial/i,/sn/i,/serien/i];
  const COMMENT_PATTERNS=[/comment/i,/bemerk/i,/notiz/i,/note/i,/hinweis/i];

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
    return ensureLibrary('XLSX','__DEVICE_COMMENTS_XLSX__',XLSX_URLS);
  }

  function parseJSON(str,fb){
    if(!str) return fb;
    try{return JSON.parse(str)||fb;}catch{return fb;}
  }

  function loadDoc(){
    return parseJSON(localStorage.getItem(LS_DOC),{__meta:{v:1},general:{},instances:{}});
  }

  function saveDoc(doc){
    doc.__meta={v:1,updatedAt:new Date().toISOString()};
    try{localStorage.setItem(LS_DOC,JSON.stringify(doc));}catch(err){console.warn('DeviceComments: saveDoc failed',err);}
  }

  function readActiveMeldung(){
    try{
      const doc=JSON.parse(localStorage.getItem(LS_DOC)||'{}');
      return (doc?.general?.Meldung||'').trim();
    }catch(err){
      console.warn('DeviceComments: failed to parse module_data_v1',err);
      return '';
    }
  }

  function instanceIdOf(node){
    return node.closest('.grid-stack-item')?.dataset?.instanceId||('inst-'+Math.random().toString(36).slice(2));
  }

  function loadLocalState(instanceId){
    try{
      const raw=localStorage.getItem(LS_STATE_PREFIX+instanceId);
      if(!raw) return null;
      const parsed=JSON.parse(raw);
      if(parsed&&typeof parsed==='object') return parsed;
    }catch(err){console.warn('DeviceComments: state parse failed',err);}
    return null;
  }

  function saveLocalState(instanceId,data){
    try{localStorage.setItem(LS_STATE_PREFIX+instanceId,JSON.stringify(data));}
    catch(err){console.warn('DeviceComments: state save failed',err);}
  }

  function trim(value){
    if(value==null) return '';
    return String(value).trim();
  }

  function normalizeKey(value){
    return trim(value).toLowerCase();
  }

  function makeKey(part,serial){
    return normalizeKey(part)+'||'+normalizeKey(serial);
  }

  function ensureRowLength(row,length){
    if(!Array.isArray(row)) return;
    while(row.length<length) row.push('');
  }

  function createEmptyRow(length){
    return Array(length).fill('');
  }

  function readGeneralIdentifiers(){
    const doc=loadDoc();
    const general=doc?.general||{};
    return {
      part:trim(general.PartNo||general.PN||''),
      serial:trim(general.SerialNo||general.SN||'')
    };
  }

  function clamp(n,min,max){
    return Math.max(min,Math.min(max,n));
  }

  function createUI(title){
    const root=document.createElement('div');
    root.className='dc-root';
    const hasTitle=title&&title.trim();
    root.innerHTML=`
      ${hasTitle?`<div class="dc-title">${title}</div>`:''}
      <div class="dc-status">
        <div class="dc-line"><span class="dc-label">Dictionary</span><span class="dc-value" data-dict>Keine Datei</span></div>
        <div class="dc-line"><span class="dc-label">Kommentare</span><span class="dc-value" data-comments>Keine Datei</span></div>
      </div>
      <div class="dc-device">
        <div class="dc-field">
          <div class="dc-field-label">Meldung</div>
          <div class="dc-field-value" data-meldung>—</div>
        </div>
        <div class="dc-field">
          <div class="dc-field-label">Partnummer</div>
          <div class="dc-field-value" data-part>—</div>
        </div>
        <div class="dc-field">
          <div class="dc-field-label">Seriennummer</div>
          <div class="dc-field-value" data-serial>—</div>
        </div>
      </div>
      <div class="dc-editor">
        <label class="dc-editor-label">Kommentar</label>
        <textarea class="dc-textarea" placeholder="Keine PN/SN verfügbar" disabled></textarea>
        <div class="dc-note" data-note></div>
      </div>
    `;
    const menu=document.createElement('div');
    menu.className='dc-menu';
    menu.innerHTML=`
      <button type="button" data-action="pick-dict">📘 Dictionary wählen</button>
      <button type="button" data-action="pick-comments">📂 Kommentar-Datei wählen</button>
      <button type="button" data-action="create-comments">🆕 Kommentar-Datei erstellen</button>
      <div class="dc-menu-sep"></div>
      <button type="button" data-action="reload-dict">🔄 Dictionary neu laden</button>
      <button type="button" data-action="reload-comments">🔄 Kommentare neu laden</button>
      <div class="dc-menu-sep"></div>
      <button type="button" data-action="clear-comment">🗑️ Kommentar löschen</button>
    `;
    document.body.appendChild(menu);
    return {
      root,
      menu,
      dictLabel:root.querySelector('[data-dict]'),
      commentsLabel:root.querySelector('[data-comments]'),
      meldung:root.querySelector('[data-meldung]'),
      part:root.querySelector('[data-part]'),
      serial:root.querySelector('[data-serial]'),
      textarea:root.querySelector('.dc-textarea'),
      note:root.querySelector('[data-note]')
    };
  }

  function destroyUI(elements){
    elements?.menu?.remove();
  }

  function findColumn(header,patterns,fallbackIndex){
    if(!Array.isArray(header)||!header.length){
      return typeof fallbackIndex==='number'?fallbackIndex:-1;
    }
    for(let i=0;i<header.length;i++){
      const cell=trim(header[i]);
      if(patterns.some(rx=>rx.test(cell))) return i;
    }
    if(typeof fallbackIndex==='number'&&fallbackIndex>=0&&fallbackIndex<header.length){
      return fallbackIndex;
    }
    return header.length?0:-1;
  }

  async function readDictionary(handle){
    await ensureXLSX();
    const file=await handle.getFile();
    const sheetData={rows:[],sheetName:'records'};
    if(file.size>0){
      const buffer=await file.arrayBuffer();
      const workbook=XLSX.read(buffer,{type:'array'});
      const sheet=workbook.Sheets['records']||workbook.Sheets[workbook.SheetNames[0]];
      if(sheet){
        sheetData.sheetName=workbook.SheetNames.find(name=>workbook.Sheets[name]===sheet)||sheetData.sheetName;
        sheetData.rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
      }
    }
    let rows=Array.isArray(sheetData.rows)?sheetData.rows:[];
    rows=rows.map(row=>Array.isArray(row)?row.map(cell=>{
      if(cell==null) return '';
      if(typeof cell==='string') return cell;
      if(typeof cell==='number'||typeof cell==='boolean') return String(cell);
      return '';
    }):[]);
    if(!rows.length){
      rows=[['Meldung','Part','Serial']];
    }
    if(!rows[0]||!rows[0].length){
      rows[0]=['Meldung','Part','Serial'];
    }
    const header=rows[0].map(cell=>trim(cell));
    rows[0]=header;
    let width=header.length;
    for(let i=1;i<rows.length;i++){
      const row=rows[i]=Array.isArray(rows[i])?rows[i]:[];
      ensureRowLength(row,width);
      for(let j=0;j<width;j++){
        if(row[j]==null) row[j]='';
        else if(typeof row[j]!=='string') row[j]=String(row[j]);
      }
    }
    let meldIdx=findColumn(header,MELD_PATTERNS,0);
    if(meldIdx<0){
      header.push('Meldung');
      meldIdx=header.length-1;
      width=header.length;
      for(let i=1;i<rows.length;i++){
        const row=rows[i];
        ensureRowLength(row,width);
        if(row[meldIdx]==null) row[meldIdx]='';
      }
    }
    let partIdx=findColumn(header,PART_PATTERNS,meldIdx===0?1:0);
    let serialIdx=findColumn(header,SERIAL_PATTERNS,partIdx===0?1:(partIdx===1?2:partIdx+1));
    if(partIdx===meldIdx) partIdx=-1;
    if(serialIdx===meldIdx||serialIdx===partIdx) serialIdx=-1;
    const map=new Map();
    for(let i=1;i<rows.length;i++){
      const row=rows[i];
      ensureRowLength(row,header.length);
      const meld=trim(row[meldIdx]);
      const part=partIdx>=0?trim(row[partIdx]):'';
      const serial=serialIdx>=0?trim(row[serialIdx]):'';
      if(!meld&&!part&&!serial) continue;
      if(!meld) continue;
      map.set(normalizeKey(meld),{meldung:meld,part,serial,rowIndex:i});
    }
    return {
      map,
      rows,
      sheetName:sheetData.sheetName,
      meldIdx,
      partIdx,
      serialIdx
    };
  }

  async function readComments(handle){
    await ensureXLSX();
    const file=await handle.getFile();
    if(file.size===0) return new Map();
    const buffer=await file.arrayBuffer();
    const workbook=XLSX.read(buffer,{type:'array'});
    const sheet=workbook.Sheets[workbook.SheetNames[0]];
    if(!sheet) return new Map();
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
    if(!rows.length) return new Map();
    const header=(rows[0]||[]).map(cell=>trim(cell));
    const meldIdx=findColumn(header,MELD_PATTERNS,0);
    const partIdx=findColumn(header,PART_PATTERNS,meldIdx===0?1:0);
    const serialIdx=findColumn(header,SERIAL_PATTERNS,partIdx===0?1:(partIdx===1?2:partIdx+1));
    const commentIdx=findColumn(header,COMMENT_PATTERNS,serialIdx===0?1:(serialIdx===1?2:serialIdx+1));
    const resolvedMeldIdx=(meldIdx>=0&&meldIdx<header.length)?meldIdx:-1;
    const resolvedPartIdx=(partIdx>=0&&partIdx<header.length)?partIdx:-1;
    const resolvedSerialIdx=(serialIdx>=0&&serialIdx<header.length)?serialIdx:-1;
    const resolvedCommentIdx=(commentIdx>=0&&commentIdx<header.length)?commentIdx:-1;
    const finalMeldIdx=(resolvedMeldIdx===resolvedPartIdx||resolvedMeldIdx===resolvedSerialIdx||resolvedMeldIdx===resolvedCommentIdx)?-1:resolvedMeldIdx;
    const finalPartIdx=resolvedPartIdx===finalMeldIdx?-1:resolvedPartIdx;
    const finalSerialIdx=(resolvedSerialIdx===finalMeldIdx||resolvedSerialIdx===finalPartIdx)?-1:resolvedSerialIdx;
    const finalCommentIdx=(resolvedCommentIdx===finalMeldIdx||resolvedCommentIdx===finalPartIdx||resolvedCommentIdx===finalSerialIdx)?-1:resolvedCommentIdx;
    const map=new Map();
    for(let i=1;i<rows.length;i++){
      const row=rows[i]||[];
      const meldung=finalMeldIdx>=0?trim(row[finalMeldIdx]):'';
      const part=finalPartIdx>=0?trim(row[finalPartIdx]):'';
      const serial=finalSerialIdx>=0?trim(row[finalSerialIdx]):'';
      const rawComment=finalCommentIdx>=0?row[finalCommentIdx]:'';
      const comment=rawComment==null?'':String(rawComment);
      if(!part&&!serial&&!comment&&!meldung) continue;
      const key=makeKey(part,serial);
      map.set(key,{meldung,part,serial,comment});
    }
    return map;
  }

  function ensureDictionaryColumn(info,label){
    if(!info||!Array.isArray(info.rows)||!info.rows.length) return -1;
    const header=info.rows[0];
    header.push(label);
    const idx=header.length-1;
    for(let i=1;i<info.rows.length;i++){
      const row=info.rows[i];
      ensureRowLength(row,header.length);
      if(row[idx]==null) row[idx]='';
    }
    return idx;
  }

  async function commitDictionary(handle,info){
    if(!handle||!info||!Array.isArray(info.rows)||!info.rows.length) return;
    await ensureXLSX();
    const width=info.rows[0]?.length||0;
    const aoa=info.rows.map(row=>{
      const src=Array.isArray(row)?row:[];
      const copy=new Array(width).fill('');
      for(let i=0;i<width;i++){
        const value=src[i];
        copy[i]=value==null?'':value;
      }
      return copy;
    });
    const workbook=XLSX.utils.book_new();
    const sheet=XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(workbook,sheet,info.sheetName||'records');
    const buffer=XLSX.write(workbook,{bookType:'xlsx',type:'array'});
    const writable=await handle.createWritable();
    await writable.write(buffer);
    await writable.close();
  }

  async function writeComments(handle,entries){
    if(!handle) return;
    const allowed=await ensureRWPermission(handle);
    if(!allowed) throw new Error('Keine Berechtigung zum Schreiben');
    await ensureXLSX();
    const data=Array.isArray(entries)&&entries.length?entries:[{meldung:'',part:'',serial:'',comment:''}];
    const aoa=[[ 'Meldung','Part','Serial','Comment'],
      ...data.map(entry=>[
        entry.meldung||'',
        entry.part||'',
        entry.serial||'',
        entry.comment||''
      ])
    ];
    const workbook=XLSX.utils.book_new();
    const sheet=XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(workbook,sheet,COMMENTS_SHEET);
    const buffer=XLSX.write(workbook,{bookType:'xlsx',type:'array'});
    const writable=await handle.createWritable();
    await writable.write(buffer);
    await writable.close();
  }

  function applyNote(elements,message,tone){
    elements.note.textContent=message||'';
    elements.note.classList.remove('warn','error','success');
    if(tone==='warn') elements.note.classList.add('warn');
    else if(tone==='error') elements.note.classList.add('error');
    else if(tone==='success') elements.note.classList.add('success');
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
      const request=tx.objectStore(IDB_STORE).get(key);
      request.onsuccess=()=>resolve(request.result||null);
      request.onerror=()=>reject(request.error);
    });
  }

  async function ensureRPermission(handle){
    if(!handle?.queryPermission) return true;
    const query=await handle.queryPermission({mode:'read'});
    if(query==='granted') return true;
    if(query==='prompt'){
      const request=await handle.requestPermission({mode:'read'});
      return request==='granted';
    }
    return false;
  }

  async function ensureRWPermission(handle){
    if(!handle?.queryPermission) return true;
    const query=await handle.queryPermission({mode:'readwrite'});
    if(query==='granted') return true;
    if(query==='prompt'){
      const request=await handle.requestPermission({mode:'readwrite'});
      return request==='granted';
    }
    return false;
  }

  async function saveGlobalDict(handle,name){
    try{await idbSet('globalDict',handle);}catch(err){console.warn('DeviceComments: global dict store failed',err);}
    const doc=loadDoc();
    doc.general ||= {};
    if(doc.general.dictFileName!==name){
      doc.general.dictFileName=name;
      saveDoc(doc);
    }
  }

  function updateGeneralPartSerial(state,part,serial){
    const normalizedPart=part||'';
    const normalizedSerial=serial||'';
    if(state.lastGeneralPart===normalizedPart&&state.lastGeneralSerial===normalizedSerial) return;
    state.lastGeneralPart=normalizedPart;
    state.lastGeneralSerial=normalizedSerial;
    const doc=loadDoc();
    doc.general ||= {};
    const general=doc.general;
    let changed=false;
    if((general.PartNo||'')!==normalizedPart){general.PartNo=normalizedPart;changed=true;}
    if((general.PN||'')!==normalizedPart){general.PN=normalizedPart;changed=true;}
    if((general.SerialNo||'')!==normalizedSerial){general.SerialNo=normalizedSerial;changed=true;}
    if((general.SN||'')!==normalizedSerial){general.SN=normalizedSerial;changed=true;}
    if(changed){
      saveDoc(doc);
      try{window.dispatchEvent(new Event('deviceBoard:update'));}catch{}
    }
  }

  window.renderAspenComments=async function(targetDiv,opts){
    injectStyles();
    if(!('showOpenFilePicker' in window) || !('showSaveFilePicker' in window)){
      targetDiv.innerHTML='<div class="p-3 text-sm">Dieses Modul benötigt die File System Access API (Chromium-basiert).</div>';
      return;
    }

    const title=opts?.moduleJson?.settings?.title||'';
    const instanceId=instanceIdOf(targetDiv);
    const handleKey=`deviceComments:comments:${instanceId}`;
    const dictHandleKey=`deviceComments:dict:${instanceId}`;

    const state={
      instanceId,
      comments:new Map(),
      dict:new Map(),
      dictInfo:null,
      commentHandle:null,
      dictHandle:null,
      commentName:'',
      dictName:'',
      activeMeldung:'',
      activePart:'',
      activeSerial:'',
      lastGeneralPart:'',
      lastGeneralSerial:'',
      noteTimer:null,
      writeTimer:null,
      updatingTextarea:false,
      baseNote:null,
      dictUpdating:false,
      pendingDictUpdate:null
    };

    const stored=loadLocalState(instanceId);
    if(stored){
      state.commentName=stored.commentFileName||'';
      state.dictName=stored.dictFileName||'';
      if(Array.isArray(stored.comments)){
        stored.comments.forEach(entry=>{
          const part=trim(entry?.part);
          const serial=trim(entry?.serial);
          const comment=typeof entry?.comment==='string'?entry.comment:'';
          const meldung=trim(entry?.meldung);
          if(!part&&!serial&&!comment&&!meldung) return;
          state.comments.set(makeKey(part,serial),{part,serial,comment,meldung});
        });
      }
    }

    const elements=createUI(title);
    targetDiv.appendChild(elements.root);

    function persistState(){
      const payload={
        commentFileName:state.commentName,
        dictFileName:state.dictName,
        comments:Array.from(state.comments.values()).map(entry=>({
          part:entry.part||'',
          serial:entry.serial||'',
          comment:entry.comment||'',
          meldung:entry.meldung||''
        }))
      };
      saveLocalState(instanceId,payload);
    }

    async function ensureDictionaryEntry(part,serial){
      const normalizedPart=trim(part);
      const normalizedSerial=trim(serial);
      if(!state.dictHandle||!state.dictInfo||!state.activeMeldung) return;
      if(!normalizedPart&&!normalizedSerial) return;
      const key=normalizeKey(state.activeMeldung);
      const existing=state.dict.get(key);
      const existingPart=existing?trim(existing.part):'';
      const existingSerial=existing?trim(existing.serial):'';
      if(existingPart===normalizedPart&&existingSerial===normalizedSerial) return;
      if(state.dictUpdating){
        state.pendingDictUpdate={part:normalizedPart,serial:normalizedSerial};
        return;
      }
      state.dictUpdating=true;
      try{
        const allowed=await ensureRWPermission(state.dictHandle);
        if(!allowed){
          flashNote('Keine Berechtigung zum Dictionary-Schreiben','error');
          return;
        }
        const info=state.dictInfo;
        if(!info||!Array.isArray(info.rows)||!info.rows.length) return;
        if(info.meldIdx==null||info.meldIdx<0){
          info.meldIdx=ensureDictionaryColumn(info,'Meldung');
        }
        if(info.partIdx==null||info.partIdx<0){
          info.partIdx=ensureDictionaryColumn(info,'Partnummer');
        }
        if(info.serialIdx==null||info.serialIdx<0){
          info.serialIdx=ensureDictionaryColumn(info,'Seriennummer');
        }
        const headerLength=info.rows[0]?.length||0;
        let rowIndex=existing?.rowIndex;
        if(!(rowIndex>=1&&rowIndex<info.rows.length)){
          const newRow=createEmptyRow(headerLength);
          rowIndex=info.rows.length;
          info.rows.push(newRow);
        }
        const row=info.rows[rowIndex];
        ensureRowLength(row,info.rows[0].length);
        row[info.meldIdx]=state.activeMeldung;
        row[info.partIdx]=normalizedPart;
        row[info.serialIdx]=normalizedSerial;
        await commitDictionary(state.dictHandle,info);
        state.dict.set(key,{meldung:state.activeMeldung,part:normalizedPart,serial:normalizedSerial,rowIndex});
        flashNote('Dictionary aktualisiert','success');
      }catch(err){
        console.warn('DeviceComments: dictionary write failed',err);
        flashNote('Dictionary konnte nicht aktualisiert werden','error');
      }finally{
        state.dictUpdating=false;
        if(state.pendingDictUpdate){
          const next=state.pendingDictUpdate;
          state.pendingDictUpdate=null;
          ensureDictionaryEntry(next.part,next.serial);
        }
      }
    }

    function updateFileLabels(){
      elements.dictLabel.textContent=state.dictName?`• ${state.dictName}`:'Keine Datei';
      elements.commentsLabel.textContent=state.commentName?`• ${state.commentName}`:'Keine Datei';
    }

    function refreshBaseNote(){
      let message='';
      let tone='';
      if(!state.dictHandle){
        message='Rechtsklick → Dictionary wählen';
        tone='warn';
      }else if(!state.activeMeldung){
        message='Keine aktive Meldung gefunden';
      }else if(!(state.activePart||state.activeSerial)){
        message='Kein PN/SN im Dictionary für aktuelle Meldung';
        tone='warn';
      }else if(!state.commentHandle){
        message='Rechtsklick → Kommentar-Datei wählen';
        tone='warn';
      }else{
        message='Änderungen werden automatisch gespeichert';
      }
      state.baseNote={message,tone};
      applyNote(elements,message,tone);
    }

    function flashNote(message,tone='success',duration=1500){
      applyNote(elements,message,tone);
      if(state.noteTimer) clearTimeout(state.noteTimer);
      state.noteTimer=setTimeout(()=>{
        if(state.baseNote){
          applyNote(elements,state.baseNote.message,state.baseNote.tone);
        }else{
          applyNote(elements,'','');
        }
      },duration);
    }

    function updateTextareaState(){
      const hasIdentifiers=!!(state.activePart||state.activeSerial);
      const key=makeKey(state.activePart,state.activeSerial);
      const entry=state.comments.get(key);
      const text=entry?entry.comment:'';
      elements.textarea.disabled=!hasIdentifiers||!state.commentHandle;
      elements.textarea.placeholder=!hasIdentifiers
        ?'Keine PN/SN verfügbar'
        :state.commentHandle?'Kommentar eingeben…':'Kommentar-Datei wählen';
      if(elements.textarea.value!==text){
        state.updatingTextarea=true;
        elements.textarea.value=text;
        state.updatingTextarea=false;
      }
    }

    function updateDeviceInfo(){
      let part='';
      let serial='';
      if(state.activeMeldung){
        const entry=state.dict.get(normalizeKey(state.activeMeldung));
        if(entry){
          part=entry.part||'';
          serial=entry.serial||'';
        }
      }
      let filledFromGeneral=false;
      const generalIds=readGeneralIdentifiers();
      if(!part&&generalIds.part){
        part=generalIds.part;
        filledFromGeneral=true;
      }
      if(!serial&&generalIds.serial){
        serial=generalIds.serial;
        filledFromGeneral=true;
      }
      state.activePart=part;
      state.activeSerial=serial;
      elements.part.textContent=part||'—';
      elements.serial.textContent=serial||'—';
      updateGeneralPartSerial(state,part,serial);
      updateTextareaState();
      refreshBaseNote();
      if(filledFromGeneral){
        ensureDictionaryEntry(part,serial);
      }
    }

    function refreshActive(force){
      const current=readActiveMeldung();
      const changed=current!==state.activeMeldung;
      if(changed||force){
        state.activeMeldung=current;
        elements.meldung.textContent=current||'—';
        updateDeviceInfo();
        return;
      }
      if(!(state.activePart||state.activeSerial)){
        updateDeviceInfo();
      }
    }

    function updateCommentEntry(comment){
      const part=state.activePart||'';
      const serial=state.activeSerial||'';
      if(!part&&!serial) return;
      const key=makeKey(part,serial);
      const text=comment;
      if(!text.trim()){
        if(state.comments.has(key)){
          state.comments.delete(key);
          persistState();
          updateTextareaState();
          scheduleWrite();
        }
        return;
      }
      const entry=state.comments.get(key)||{part,serial,comment:'',meldung:state.activeMeldung||''};
      entry.part=part;
      entry.serial=serial;
      entry.meldung=state.activeMeldung||entry.meldung||'';
      entry.comment=text;
      state.comments.set(key,entry);
      persistState();
      scheduleWrite();
    }

    function scheduleWrite(){
      if(!state.commentHandle) return;
      if(state.writeTimer) clearTimeout(state.writeTimer);
      state.writeTimer=setTimeout(async()=>{
        try{
          await writeComments(state.commentHandle,Array.from(state.comments.values()));
          flashNote('Gespeichert','success');
        }catch(err){
          console.warn('DeviceComments: write failed',err);
          flashNote('Speichern fehlgeschlagen','error');
        }
      },350);
    }

    async function loadDictionaryHandle(handle){
      if(!handle) return;
      const allowed=await ensureRPermission(handle);
      if(!allowed){
        applyNote(elements,'Keine Berechtigung für Dictionary','error');
        return;
      }
      try{
        const info=await readDictionary(handle);
        state.dictInfo=info;
        state.dict=info.map;
        state.pendingDictUpdate=null;
        state.dictUpdating=false;
        refreshActive(true);
        refreshBaseNote();
      }catch(err){
        console.warn('DeviceComments: dictionary read failed',err);
        applyNote(elements,'Dictionary konnte nicht gelesen werden','error');
      }
    }

    async function loadCommentsHandle(handle){
      if(!handle) return;
      const allowed=await ensureRWPermission(handle);
      if(!allowed){
        applyNote(elements,'Keine Berechtigung für Kommentar-Datei','error');
        return;
      }
      try{
        const map=await readComments(handle);
        state.comments=map;
        persistState();
        updateTextareaState();
      }catch(err){
        console.warn('DeviceComments: comments read failed',err);
        applyNote(elements,'Kommentare konnten nicht gelesen werden','error');
      }
    }

    async function pickDictionary(){
      try{
        const [handle]=await window.showOpenFilePicker({
          multiple:false,
          types:[{
            description:'Dictionary',
            accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx','.xlsm'],
                    'application/vnd.ms-excel':['.xls'],
                    'text/csv':['.csv']}
          }]
        });
        if(!handle) return;
        state.dictHandle=handle;
        state.dictName=handle.name||state.dictName||'dictionary.xlsx';
        updateFileLabels();
        persistState();
        try{await idbSet(dictHandleKey,handle);}catch(err){console.warn('DeviceComments: store dict handle failed',err);}
        await saveGlobalDict(handle,state.dictName);
        await loadDictionaryHandle(handle);
      }catch(err){
        if(err?.name==='AbortError') return;
        console.warn('DeviceComments: dictionary pick failed',err);
        applyNote(elements,'Dictionary konnte nicht geöffnet werden','error');
      }
    }

    async function pickCommentsFile(){
      try{
        const [handle]=await window.showOpenFilePicker({
          multiple:false,
          types:[{
            description:'Excel',
            accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx','.xlsm']}
          }]
        });
        if(!handle) return;
        state.commentHandle=handle;
        state.commentName=handle.name||state.commentName||'device-comments.xlsx';
        updateFileLabels();
        persistState();
        try{await idbSet(handleKey,handle);}catch(err){console.warn('DeviceComments: store comment handle failed',err);}
        await loadCommentsHandle(handle);
        refreshBaseNote();
      }catch(err){
        if(err?.name==='AbortError') return;
        console.warn('DeviceComments: comment file pick failed',err);
        applyNote(elements,'Kommentar-Datei konnte nicht geöffnet werden','error');
      }
    }

    async function createCommentsFile(){
      try{
        const handle=await window.showSaveFilePicker({
          suggestedName:state.commentName||'device-comments.xlsx',
          types:[{
            description:'Excel',
            accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}
          }]
        });
        if(!handle) return;
        await ensureXLSX();
        const workbook=XLSX.utils.book_new();
        const sheet=XLSX.utils.aoa_to_sheet([[ 'Meldung','Part','Serial','Comment' ]]);
        XLSX.utils.book_append_sheet(workbook,sheet,COMMENTS_SHEET);
        const buffer=XLSX.write(workbook,{bookType:'xlsx',type:'array'});
        const writable=await handle.createWritable();
        await writable.write(buffer);
        await writable.close();
        state.commentHandle=handle;
        state.commentName=handle.name||'device-comments.xlsx';
        updateFileLabels();
        persistState();
        try{await idbSet(handleKey,handle);}catch(err){console.warn('DeviceComments: store comment handle failed',err);}
        await loadCommentsHandle(handle);
        flashNote('Datei erstellt','success');
      }catch(err){
        if(err?.name==='AbortError') return;
        console.warn('DeviceComments: comment file create failed',err);
        applyNote(elements,'Datei konnte nicht erstellt werden','error');
      }
    }

    async function reloadDictionary(){
      if(!state.dictHandle){
        flashNote('Kein Dictionary gewählt','warn',1600);
        return;
      }
      await loadDictionaryHandle(state.dictHandle);
    }

    async function reloadComments(){
      if(!state.commentHandle){
        flashNote('Keine Kommentar-Datei gewählt','warn',1600);
        return;
      }
      await loadCommentsHandle(state.commentHandle);
      flashNote('Kommentare neu geladen','success');
    }

    function clearActiveComment(){
      if(!(state.activePart||state.activeSerial)) return;
      const key=makeKey(state.activePart,state.activeSerial);
      if(!state.comments.has(key)) return;
      state.comments.delete(key);
      persistState();
      updateTextareaState();
      scheduleWrite();
      flashNote('Kommentar gelöscht','success');
    }

    function closeMenu(){
      elements.menu.classList.remove('open');
    }

    function openMenu(x,y){
      elements.menu.classList.add('open');
      const rect=elements.menu.getBoundingClientRect();
      const pad=12;
      const left=clamp(x-rect.width/2,pad,window.innerWidth-rect.width-pad);
      const top=clamp(y,pad,window.innerHeight-rect.height-pad);
      elements.menu.style.left=left+'px';
      elements.menu.style.top=top+'px';
    }

    elements.menu.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button) return;
      const action=button.dataset.action;
      closeMenu();
      if(action==='pick-dict') pickDictionary();
      else if(action==='pick-comments') pickCommentsFile();
      else if(action==='create-comments') createCommentsFile();
      else if(action==='reload-dict') reloadDictionary();
      else if(action==='reload-comments') reloadComments();
      else if(action==='clear-comment') clearActiveComment();
    });

    const handleContextMenu=event=>{
      event.preventDefault();
      openMenu(event.clientX,event.clientY);
    };
    elements.root.addEventListener('contextmenu',handleContextMenu);

    const handleDocClick=event=>{
      if(!elements.menu.contains(event.target)) closeMenu();
    };
    document.addEventListener('click',handleDocClick);

    elements.textarea.addEventListener('input',()=>{
      if(state.updatingTextarea) return;
      updateCommentEntry(elements.textarea.value);
    });

    const storageListener=event=>{
      if(event.key===LS_DOC) refreshActive(true);
    };
    const customListener=()=>refreshActive(true);
    window.addEventListener('storage',storageListener);
    window.addEventListener('deviceBoard:update',customListener);

    const intervalId=setInterval(()=>refreshActive(false),WATCH_INTERVAL);

    const cleanup=()=>{
      clearInterval(intervalId);
      document.removeEventListener('click',handleDocClick);
      window.removeEventListener('storage',storageListener);
      window.removeEventListener('deviceBoard:update',customListener);
      elements.root.removeEventListener('contextmenu',handleContextMenu);
      if(state.noteTimer) clearTimeout(state.noteTimer);
      if(state.writeTimer) clearTimeout(state.writeTimer);
      destroyUI(elements);
    };

    const mo=new MutationObserver(()=>{
      if(!document.body.contains(elements.root)){
        cleanup();
        mo.disconnect();
      }
    });
    mo.observe(document.body,{childList:true,subtree:true});

    updateFileLabels();
    refreshActive(true);
    updateTextareaState();
    refreshBaseNote();

    persistState();

    (async()=>{
      try{
        let handle=await idbGet(dictHandleKey);
        if(!handle){
          handle=await idbGet('globalDict');
          if(handle){
            try{await idbSet(dictHandleKey,handle);}catch(err){console.warn('DeviceComments: copy global dict handle failed',err);} }
        }
        if(handle){
          state.dictHandle=handle;
          if(!state.dictName) state.dictName=handle.name||state.dictName||'';
          updateFileLabels();
          persistState();
          await loadDictionaryHandle(handle);
          refreshBaseNote();
        }
      }catch(err){
        console.warn('DeviceComments: restore dictionary handle failed',err);
      }
    })();

    (async()=>{
      try{
        const handle=await idbGet(handleKey);
        if(handle){
          state.commentHandle=handle;
          if(!state.commentName) state.commentName=handle.name||state.commentName||'';
          updateFileLabels();
          persistState();
          await loadCommentsHandle(handle);
          refreshBaseNote();
        }
      }catch(err){
        console.warn('DeviceComments: restore comment handle failed',err);
      }
    })();
  };
})();
