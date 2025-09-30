(function(){
  'use strict';

  const STYLE_ID='unit-comments-styles';
  const CSS=`
    .dc-root{height:100%;display:flex;flex-direction:column;gap:.75rem;}
    .dc-title{font-weight:600;font-size:1.05rem;color:var(--text-color);padding:0 .2rem;}
    .dc-status{display:flex;flex-direction:column;gap:.35rem;background:var(--dl-bg,#f5f7fb);border-radius:1rem;padding:.65rem .75rem;}
    .dc-line{display:flex;align-items:center;gap:.5rem;font-size:.85rem;}
    .dc-label{opacity:.7;min-width:105px;font-weight:500;}
    .dc-value{flex:1;min-width:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;font-weight:600;color:var(--dl-title,#2563eb);}
    .dc-unit{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.6rem;}
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
    .dc-menu-section{padding:.35rem .45rem .5rem;display:flex;flex-direction:column;gap:.35rem;}
    .dc-menu-section label{display:flex;flex-direction:column;gap:.35rem;font-size:.75rem;font-weight:600;opacity:.75;}
    .dc-menu-select{width:100%;padding:.4rem .55rem;border-radius:.55rem;border:1px solid var(--border-color,#d1d5db);background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);font:inherit;}
    .dc-menu-select:disabled{opacity:.6;cursor:not-allowed;}
  `;

  const XLSX_URLS=[
    'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.2/xlsx.full.min.js'
  ];

  const LS_DOC='module_data_v1';
  const LS_STATE_PREFIX='unitComments:state:';
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
    return ensureLibrary('XLSX','__UNIT_COMMENTS_XLSX__',XLSX_URLS);
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
    try{localStorage.setItem(LS_DOC,JSON.stringify(doc));}catch(err){console.warn('UnitComments: saveDoc failed',err);}
  }

  function readActiveMeldung(){
    try{
      const doc=JSON.parse(localStorage.getItem(LS_DOC)||'{}');
      return (doc?.general?.Meldung||'').trim();
    }catch(err){
      console.warn('UnitComments: failed to parse module_data_v1',err);
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
    }catch(err){console.warn('UnitComments: state parse failed',err);}
    return null;
  }

  function saveLocalState(instanceId,data){
    try{localStorage.setItem(LS_STATE_PREFIX+instanceId,JSON.stringify(data));}
    catch(err){console.warn('UnitComments: state save failed',err);}
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
        <div class="dc-line"><span class="dc-label">Aspen</span><span class="dc-value" data-aspen>Keine Daten</span></div>
        <div class="dc-line"><span class="dc-label">Kommentare</span><span class="dc-value" data-comments>Keine Datei</span></div>
      </div>
      <div class="dc-unit">
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
      <div class="dc-menu-section">
        <label>Aspen-Auswahl
          <select class="dc-menu-select" data-aspen-select>
            <option value="">Automatisch (aktive Meldung)</option>
          </select>
        </label>
      </div>
      <div class="dc-menu-sep"></div>
      <button type="button" data-action="pick-comments">📂 Kommentar-Datei wählen</button>
      <button type="button" data-action="create-comments">🆕 Kommentar-Datei erstellen</button>
      <div class="dc-menu-sep"></div>
      <button type="button" data-action="reload-comments">🔄 Kommentare neu laden</button>
      <div class="dc-menu-sep"></div>
      <button type="button" data-action="clear-comment">🗑️ Kommentar löschen</button>
    `;
    document.body.appendChild(menu);
    return {
      root,
      menu,
      aspenLabel:root.querySelector('[data-aspen]'),
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
      try{window.dispatchEvent(new Event('unitBoard:update'));}catch{}
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
    const handleKey=`unitComments:comments:${instanceId}`;

    const state={
      instanceId,
      comments:new Map(),
      commentHandle:null,
      commentName:'',
      activeMeldung:'',
      activePart:'',
      activeSerial:'',
      lastGeneralPart:'',
      lastGeneralSerial:'',
      manualAspenKey:'',
      manualAspenEntry:null,
      aspenOptions:[],
      aspenSnapshot:'',
      noteTimer:null,
      writeTimer:null,
      updatingTextarea:false,
      baseNote:null
    };

    const stored=loadLocalState(instanceId);
    if(stored){
      state.commentName=stored.commentFileName||'';
      if(typeof stored.manualAspenKey==='string'){
        state.manualAspenKey=stored.manualAspenKey;
      }
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
        manualAspenKey:state.manualAspenKey||'',
        comments:Array.from(state.comments.values()).map(entry=>({
          part:entry.part||'',
          serial:entry.serial||'',
          comment:entry.comment||'',
          meldung:entry.meldung||''
        }))
      };
      saveLocalState(instanceId,payload);
    }

    function encodeAspenKey(instanceId,meldung){
      return `${instanceId||''}::${encodeURIComponent(meldung||'')}`;
    }

    function collectAspenOptions(shared){
      const result=[];
      const records=shared?.aspenRecords;
      if(records instanceof Map){
        for(const [instanceId,map] of records.entries()){
          if(!(map instanceof Map)) continue;
          for(const entry of map.values()){
            if(!entry) continue;
            const meldung=trim(entry.meldung||entry.Meldung||(entry.data?.Meldung)||(entry.data?.meldung)||'');
            if(!meldung) continue;
            const part=extractAspenPart(entry);
            const serial=extractAspenSerial(entry);
            const labelParts=[meldung];
            if(part) labelParts.push(`PN ${part}`);
            if(serial) labelParts.push(`SN ${serial}`);
            const label=labelParts.join(' · ');
            result.push({
              key:encodeAspenKey(instanceId,meldung),
              instanceId,
              meldung,
              part,
              serial,
              label,
              entry
            });
          }
        }
      }
      const seen=new Set();
      const deduped=[];
      for(const option of result){
        if(seen.has(option.key)) continue;
        seen.add(option.key);
        deduped.push(option);
      }
      deduped.sort((a,b)=>a.meldung.localeCompare(b.meldung,'de',{numeric:true,sensitivity:'base'}));
      return deduped;
    }

    function buildAspenSnapshot(shared){
      const records=shared?.aspenRecords;
      if(!(records instanceof Map) || records.size===0) return '';
      const parts=[];
      for(const [instanceId,map] of records.entries()){
        if(!(map instanceof Map)){
          parts.push(`${instanceId}:0`);
          continue;
        }
        const keys=Array.from(map.keys()).slice(0,10).join(',');
        parts.push(`${instanceId}:${map.size}:${keys}`);
      }
      return parts.sort().join('|');
    }

    function resolveManualAspenSelection(opts={}){
      const {clearMissing=false} = opts;
      if(!state.manualAspenKey){
        state.manualAspenEntry=null;
        return;
      }
      const options=Array.isArray(state.aspenOptions)?state.aspenOptions:[];
      const found=options.find(option=>option.key===state.manualAspenKey);
      if(found){
        state.manualAspenEntry=found;
      }else{
        state.manualAspenEntry=null;
        if(clearMissing){
          state.manualAspenKey='';
          persistState();
        }
      }
    }

    function updateAspenSelectOptions(){
      const select=elements.menu?.querySelector('[data-aspen-select]');
      if(!select) return;
      const options=Array.isArray(state.aspenOptions)?state.aspenOptions:[];
      const frag=document.createDocumentFragment();
      const autoOption=document.createElement('option');
      if(options.length===0 && !state.manualAspenKey){
        autoOption.textContent='Keine Aspen-Daten verfügbar';
        autoOption.value='';
      }else{
        const current=state.activeMeldung?`Automatisch (${state.activeMeldung})`:'Automatisch (keine Meldung)';
        autoOption.textContent=current;
        autoOption.value='';
      }
      frag.appendChild(autoOption);
      options.forEach(option=>{
        const opt=document.createElement('option');
        opt.value=option.key;
        opt.textContent=option.label;
        frag.appendChild(opt);
      });
      let needsMissingOption=false;
      if(state.manualAspenKey && !options.some(option=>option.key===state.manualAspenKey)){
        needsMissingOption=true;
        const missing=document.createElement('option');
        missing.value=state.manualAspenKey;
        missing.textContent='(Auswahl nicht verfügbar)';
        frag.appendChild(missing);
      }
      select.replaceChildren(frag);
      if(state.manualAspenKey && (needsMissingOption || options.some(option=>option.key===state.manualAspenKey))){
        select.value=state.manualAspenKey;
      }else{
        select.value='';
      }
      select.disabled=options.length===0 && !state.manualAspenKey;
    }

    function ensureAspenOptions(){
      const shared=window.__UNIT_BOARD_SHARED__;
      const snapshot=buildAspenSnapshot(shared);
      if(snapshot!==state.aspenSnapshot){
        state.aspenSnapshot=snapshot;
        state.aspenOptions=collectAspenOptions(shared);
        resolveManualAspenSelection({clearMissing:false});
        updateAspenSelectOptions();
      }else if(state.manualAspenKey){
        resolveManualAspenSelection({clearMissing:false});
      }
    }

    function findAspenEntry(meldung){
      const key=trim(meldung);
      if(!key) return null;
      try{
        const shared=window.__UNIT_BOARD_SHARED__;
        if(shared){
          if(typeof shared.findAspenItem==='function'){
            const found=shared.findAspenItem(key);
            if(found&&typeof found==='object') return found;
          }
          const records=shared.aspenRecords;
          if(records instanceof Map){
            for(const map of records.values()){
              if(!(map instanceof Map)) continue;
              const entry=map.get(key);
              if(entry&&typeof entry==='object') return entry;
            }
          }
        }
      }catch(err){
        console.warn('UnitComments: Aspen-Lookup fehlgeschlagen',err);
      }
      return null;
    }

    function normalizePartValue(value){
      const text=trim(value);
      if(!text) return '';
      const [first]=text.split(':');
      return trim(first);
    }

    function extractAspenPart(entry){
      if(!entry||typeof entry!=='object') return '';
      const directCandidates=[
        entry.part,
        entry.Part,
        entry.PartNo,
        entry.PartNumber,
        entry.PartNr,
        entry.PN,
        entry.Material,
        entry.MaterialNr,
        entry.Materialnummer,
        entry.MaterialNo,
        entry.Artikel,
        entry.Artikelnummer,
        entry.Partnummer,
        entry['Part No'],
        entry['Part_Number'],
        entry['PartNumber'],
        entry['Part Nr']
      ];
      for(const candidate of directCandidates){
        const normalized=normalizePartValue(candidate);
        if(normalized) return normalized;
      }
      const data=entry.data&&typeof entry.data==='object'?entry.data:entry;
      const keys=['part','partno','partnumber','part_no','part-number','part number','partnr','part nr','pn','material','materialnr','materialnummer','materialno','material nr','material-nr','artikel','artikelnummer','artikel nr','artikel-nr','partnummer'];
      for(const [key,value] of Object.entries(data)){
        const normalizedKey=key.toLowerCase();
        if(!keys.includes(normalizedKey)) continue;
        const normalized=normalizePartValue(value);
        if(normalized) return normalized;
      }
      return '';
    }

    function extractAspenSerial(entry){
      if(!entry||typeof entry!=='object') return '';
      const directCandidates=[
        entry.serial,
        entry.Serial,
        entry.SerialNo,
        entry.SerialNumber,
        entry.SerialNr,
        entry.SN,
        entry.SNr,
        entry.SNR,
        entry['Serial No'],
        entry['Serial_Number'],
        entry['SerialNumber'],
        entry['Serial Nr']
      ];
      for(const candidate of directCandidates){
        const normalized=trim(candidate);
        if(normalized) return normalized;
      }
      const data=entry.data&&typeof entry.data==='object'?entry.data:entry;
      const keys=['serial','serialno','serialnumber','serial_nr','serial-nr','serial nr','serial no','serial number','serialno.','serialnr','sn','s/n','snr','seriennummer','serien nr','serien-nr','seriennr'];
      for(const [key,value] of Object.entries(data)){
        const normalizedKey=key.toLowerCase();
        if(!keys.includes(normalizedKey)) continue;
        const normalized=trim(value);
        if(normalized) return normalized;
      }
      return '';
    }

    function updateAspenStatus(entry,{manualSelection=false}={}){
      if(!elements.aspenLabel) return;
      let label='Keine Daten';
      if(entry){
        label=manualSelection?'Manuell ausgewählt':'Eintrag gefunden';
      }else{
        if(manualSelection && state.manualAspenKey){
          label='Auswahl nicht verfügbar';
        }else{
          try{
            const shared=window.__UNIT_BOARD_SHARED__;
            const records=shared?.aspenRecords;
            if(records instanceof Map){
              let total=0;
              for(const map of records.values()){
                if(map instanceof Map) total+=map.size;
              }
              label=total?`${total} Einträge`:'Verbunden';
            }
          }catch(err){
            console.warn('UnitComments: Aspen-Status konnte nicht gelesen werden',err);
          }
        }
      }
      elements.aspenLabel.textContent=label;
    }

    function updateFileLabels(){
      elements.commentsLabel.textContent=state.commentName?`• ${state.commentName}`:'Keine Datei';
    }

    function getActiveCommentEntry(){
      if(!(state.activePart||state.activeSerial)) return null;
      const key=makeKey(state.activePart,state.activeSerial);
      if(!key || key==='||') return null;
      return state.comments.get(key)||null;
    }

    function computeVisitNote(){
      const entry=getActiveCommentEntry();
      if(!entry) return null;
      const stored=trim(entry.meldung||'');
      const current=trim(state.activeMeldung||'');
      if(stored && current && stored!==current){
        return {message:`Hinweis: Unit war bereits mit Meldung ${stored} hier`,tone:'warn'};
      }
      if(stored && !current){
        return {message:`Hinweis: Kommentar von Meldung ${stored}`,tone:'warn'};
      }
      return null;
    }

    function refreshBaseNote(){
      const notes=[];
      let tone='';
      if(state.commentHandle){
        notes.push('Änderungen werden automatisch gespeichert');
      }else{
        notes.push('Rechtsklick → Kommentar-Datei wählen');
        tone='warn';
      }
      if(!state.activeMeldung){
        notes.push('Keine aktive Meldung gefunden');
        tone=tone||'warn';
      }else if(!(state.activePart||state.activeSerial)){
        notes.push('Keine PN/SN in Aspen für aktuelle Meldung');
        tone=tone||'warn';
      }
      if(state.manualAspenKey){
        if(state.manualAspenEntry){
          notes.push('Aspen-Eintrag manuell gewählt');
          tone=tone||'warn';
        }else{
          notes.push('Ausgewählter Aspen-Eintrag nicht verfügbar');
          tone='error';
        }
      }
      const visitNote=computeVisitNote();
      if(visitNote){
        notes.push(visitNote.message);
        if(visitNote.tone==='error') tone='error';
        else if(tone!=='error') tone=visitNote.tone||tone;
      }
      const message=notes.filter(Boolean).join(' · ');
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

    function updateUnitInfo(){
      ensureAspenOptions();
      let entry=null;
      let manualSelection=!!state.manualAspenKey;
      if(state.manualAspenKey){
        resolveManualAspenSelection({clearMissing:false});
        if(state.manualAspenEntry){
          entry=state.manualAspenEntry.entry;
        }
      }
      if(!entry && state.activeMeldung){
        entry=findAspenEntry(state.activeMeldung);
      }
      updateAspenStatus(entry,{manualSelection});
      let part=manualSelection&&state.manualAspenEntry?state.manualAspenEntry.part:'';
      let serial=manualSelection&&state.manualAspenEntry?state.manualAspenEntry.serial:'';
      if(!part && entry) part=extractAspenPart(entry);
      if(!serial && entry) serial=extractAspenSerial(entry);
      const generalIds=readGeneralIdentifiers();
      if(!part&&generalIds.part){
        part=generalIds.part;
      }
      if(!serial&&generalIds.serial){
        serial=generalIds.serial;
      }
      state.activePart=part;
      state.activeSerial=serial;
      elements.part.textContent=part||'—';
      elements.serial.textContent=serial||'—';
      updateGeneralPartSerial(state,part,serial);
      updateTextareaState();
      refreshBaseNote();
    }

    function refreshActive(force){
      const current=readActiveMeldung();
      const changed=current!==state.activeMeldung;
      if(changed||force){
        state.activeMeldung=current;
        elements.meldung.textContent=current||'—';
        updateAspenSelectOptions();
      }
      updateUnitInfo();
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
      const sourceMeldung=state.manualAspenEntry?.meldung||state.activeMeldung||'';
      const entry=state.comments.get(key)||{part,serial,comment:'',meldung:sourceMeldung};
      entry.part=part;
      entry.serial=serial;
      entry.meldung=sourceMeldung||entry.meldung||'';
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
          console.warn('UnitComments: write failed',err);
          flashNote('Speichern fehlgeschlagen','error');
        }
      },350);
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
        refreshBaseNote();
      }catch(err){
        console.warn('UnitComments: comments read failed',err);
        applyNote(elements,'Kommentare konnten nicht gelesen werden','error');
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
        state.commentName=handle.name||state.commentName||'unit-comments.xlsx';
        updateFileLabels();
        persistState();
        try{await idbSet(handleKey,handle);}catch(err){console.warn('UnitComments: store comment handle failed',err);}
        await loadCommentsHandle(handle);
      }catch(err){
        if(err?.name==='AbortError') return;
        console.warn('UnitComments: comment file pick failed',err);
        applyNote(elements,'Kommentar-Datei konnte nicht geöffnet werden','error');
      }
    }

    async function createCommentsFile(){
      try{
        const handle=await window.showSaveFilePicker({
          suggestedName:state.commentName||'unit-comments.xlsx',
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
        state.commentName=handle.name||'unit-comments.xlsx';
        updateFileLabels();
        persistState();
        try{await idbSet(handleKey,handle);}catch(err){console.warn('UnitComments: store comment handle failed',err);}
        await loadCommentsHandle(handle);
        flashNote('Datei erstellt','success');
      }catch(err){
        if(err?.name==='AbortError') return;
        console.warn('UnitComments: comment file create failed',err);
        applyNote(elements,'Datei konnte nicht erstellt werden','error');
      }
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
      refreshBaseNote();
      flashNote('Kommentar gelöscht','success');
    }

    function closeMenu(){
      elements.menu.classList.remove('open');
    }

    function openMenu(x,y){
      ensureAspenOptions();
      updateAspenSelectOptions();
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
      if(action==='pick-comments') pickCommentsFile();
      else if(action==='create-comments') createCommentsFile();
      else if(action==='reload-comments') reloadComments();
      else if(action==='clear-comment') clearActiveComment();
    });

    const aspenSelect=elements.menu.querySelector('[data-aspen-select]');
    if(aspenSelect){
      aspenSelect.addEventListener('change',()=>{
        const value=aspenSelect.value;
        if(value===state.manualAspenKey) return;
        if(!value){
          state.manualAspenKey='';
          state.manualAspenEntry=null;
          persistState();
          updateUnitInfo();
          updateAspenSelectOptions();
          return;
        }
        state.manualAspenKey=value;
        resolveManualAspenSelection({clearMissing:false});
        persistState();
        updateUnitInfo();
        updateAspenSelectOptions();
      });
    }

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
    window.addEventListener('unitBoard:update',customListener);

    const intervalId=setInterval(()=>refreshActive(false),WATCH_INTERVAL);

    const cleanup=()=>{
      clearInterval(intervalId);
      document.removeEventListener('click',handleDocClick);
      window.removeEventListener('storage',storageListener);
      window.removeEventListener('unitBoard:update',customListener);
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

    persistState();

    (async()=>{
      try{
        const handle=await idbGet(handleKey);
        if(handle){
          state.commentHandle=handle;
          if(!state.commentName) state.commentName=handle.name||state.commentName||'';
          updateFileLabels();
          persistState();
          await loadCommentsHandle(handle);
        }
      }catch(err){
        console.warn('UnitComments: restore comment handle failed',err);
      }
    })();
  };
})();
