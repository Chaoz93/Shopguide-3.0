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

  const MELD_HEADER_PRIORITY=[
    'MELDUNGS_NO',
    'MELDUNGSNR',
    'MELDUNG_NR',
    'MELDUNG',
    'MELDUNGNR',
    'MELDUNGNO',
    'MELD_NR',
    'MELD_NO',
    'MELDNR',
    'MELDNO',
    'MELDE_NR'
  ];
  const PART_HEADER_PRIORITY=[
    'PART_NO',
    'PARTNR',
    'PART_NUMBER',
    'PARTNUMBER',
    'MATNR',
    'MATERIAL_NR',
    'MATERIALNR',
    'MATERIALNO',
    'ARTNR',
    'ARTIKELNR',
    'ARTIKEL_NO'
  ];
  const SERIAL_HEADER_PRIORITY=[
    'SERIAL_NO',
    'SERIALNR',
    'SERIAL_NUMBER',
    'SERIALNUMBER',
    'SNR',
    'S_NR',
    'SN',
    'GERAETENR',
    'GERÄTENR',
    'GERAETE_NR',
    'GERÄTE_NR'
  ];
  const MELD_PATTERNS=[
    /\bmeldung\b/i,
    /\bmeldung\s*nr\b/i,
    /\bmeldung\s*no\b/i,
    /\bmeld\s*nr\b/i,
    /\bmeld\s*no\b/i,
    /meldungnummer/i,
    /\bmessage\b/i
  ];
  const PART_PATTERNS=[/part/i,/p\/?n/i,/artikel/i,/material/i,/matnr/i,/ger[aä]t/i];
  const SERIAL_PATTERNS=[/serial/i,/sn/i,/serien/i,/s\.?nr/i,/geraetenr/i,/ger[aä]te?nr/i];
  const COMMENT_PATTERNS=[/comment/i,/bemerk/i,/notiz/i,/note/i,/hinweis/i];
  const HEADER_SCAN_LIMIT=25;
  const HEADER_MAX_SCORE=14;

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

  function normalizeHeaderName(value){
    return trim(value).toLowerCase().replace(/[\s._-]+/g,'');
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
      <button type="button" data-action="pick-aspen">📄 Aspen-Datei wählen</button>
      <button type="button" data-action="reload-aspen">🔁 Aspen neu laden</button>
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

  function findColumn(header,patterns,{preferred=[],exclude,allowPatternFallback=true}={}){
    if(!Array.isArray(header)||!header.length) return -1;
    const normalizedHeader=header.map(normalizeHeaderName);
    const normalizedPreferred=Array.isArray(preferred)?preferred.map(normalizeHeaderName).filter(Boolean):[];
    const usedIndices=exclude instanceof Set?exclude:new Set();
    for(const preferredName of normalizedPreferred){
      const idx=normalizedHeader.indexOf(preferredName);
      if(idx!==-1&&!usedIndices.has(idx)) return idx;
    }
    if(!allowPatternFallback) return -1;
    for(let i=0;i<header.length;i++){
      if(usedIndices.has(i)) continue;
      const cell=trim(header[i]);
      if(patterns.some(rx=>rx.test(cell))) return i;
    }
    return -1;
  }

  function hasPreferredMatch(normalizedHeader,preferredNames){
    if(!Array.isArray(normalizedHeader)||!normalizedHeader.length) return false;
    if(!Array.isArray(preferredNames)||!preferredNames.length) return false;
    return preferredNames.some(name=>normalizedHeader.includes(normalizeHeaderName(name)));
  }

  function hasPatternMatch(header,patterns){
    if(!Array.isArray(header)||!header.length) return false;
    if(!Array.isArray(patterns)||!patterns.length) return false;
    return header.some(cell=>patterns.some(rx=>rx.test(cell||'')));
  }

  function scoreHeaderRow(header){
    if(!Array.isArray(header)||!header.length) return -1;
    if(header.every(cell=>!trim(cell))) return -1;
    const normalizedHeader=header.map(normalizeHeaderName);
    let score=0;
    if(hasPreferredMatch(normalizedHeader,MELD_HEADER_PRIORITY)) score+=8;
    else if(hasPatternMatch(header,MELD_PATTERNS)) score+=3;
    if(hasPreferredMatch(normalizedHeader,PART_HEADER_PRIORITY)) score+=4;
    else if(hasPatternMatch(header,PART_PATTERNS)) score+=1;
    if(hasPreferredMatch(normalizedHeader,SERIAL_HEADER_PRIORITY)) score+=4;
    else if(hasPatternMatch(header,SERIAL_PATTERNS)) score+=1;
    return score;
  }

  function findHeaderRow(rows){
    if(!Array.isArray(rows)||!rows.length){
      return {header:[],index:0,score:-1};
    }
    const limit=Math.min(rows.length,HEADER_SCAN_LIMIT);
    let bestIndex=-1;
    let bestHeader=[];
    let bestScore=-1;
    for(let i=0;i<limit;i++){
      const candidate=(rows[i]||[]).map(cell=>trim(cell));
      const score=scoreHeaderRow(candidate);
      if(score>bestScore||(score===bestScore&&bestIndex===-1)){
        bestScore=score;
        bestIndex=i;
        bestHeader=candidate;
        if(score>=HEADER_MAX_SCORE) break;
      }
    }
    if(bestIndex===-1){
      const fallback=(rows[0]||[]).map(cell=>trim(cell));
      return {header:fallback,index:0,score:scoreHeaderRow(fallback)};
    }
    return {header:bestHeader,index:bestIndex,score:bestScore};
  }

  function pickSheet(workbook,{preferredNames=[],requiredHeaderGroups=[]}={}){
    if(!workbook||!Array.isArray(workbook.SheetNames)) return null;
    const names=workbook.SheetNames;
    const preferredSet=new Set(Array.isArray(preferredNames)?preferredNames.filter(Boolean):[]);
    let best=null;
    for(const name of names){
      const sheet=workbook.Sheets?.[name];
      if(!sheet) continue;
      const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
      if(!rows.length) continue;
      const headerInfo=findHeaderRow(rows);
      const normalizedHeader=headerInfo.header.map(normalizeHeaderName);
      let matches=0;
      let missingRequired=false;
      if(Array.isArray(requiredHeaderGroups)&&requiredHeaderGroups.length){
        for(const group of requiredHeaderGroups){
          const normalizedGroup=Array.isArray(group)?group.map(normalizeHeaderName):[];
          const hasMatch=normalizedGroup.some(value=>normalizedHeader.includes(value));
          if(hasMatch){
            matches++;
          }else{
            missingRequired=true;
          }
        }
      }
      let weight=headerInfo.score;
      if(matches) weight+=matches*50;
      if(missingRequired) weight-=25;
      if(preferredSet.has(name)) weight+=15;
      if(!best||weight>best.weight){
        best={name,rows,headerInfo,weight};
      }
    }
    return best;
  }

  async function readComments(handle){
    await ensureXLSX();
    const file=await handle.getFile();
    if(file.size===0) return new Map();
    const buffer=await file.arrayBuffer();
    const workbook=XLSX.read(buffer,{type:'array'});
    const selection=pickSheet(workbook,{preferredNames:[COMMENTS_SHEET]});
    if(!selection) return new Map();
    const rows=selection.rows;
    if(!rows.length) return new Map();
    const {header,index:headerRowIndex}=selection.headerInfo;
    const used=new Set();
    const meldIdx=findColumn(header,MELD_PATTERNS,{preferred:MELD_HEADER_PRIORITY,exclude:used,allowPatternFallback:false});
    if(meldIdx>=0) used.add(meldIdx);
    const partIdx=findColumn(header,PART_PATTERNS,{preferred:PART_HEADER_PRIORITY,exclude:used});
    if(partIdx>=0) used.add(partIdx);
    const serialIdx=findColumn(header,SERIAL_PATTERNS,{preferred:SERIAL_HEADER_PRIORITY,exclude:used});
    if(serialIdx>=0) used.add(serialIdx);
    const commentIdx=findColumn(header,COMMENT_PATTERNS,{exclude:used});
    const resolvedMeldIdx=(meldIdx>=0&&meldIdx<header.length)?meldIdx:-1;
    const resolvedPartIdx=(partIdx>=0&&partIdx<header.length)?partIdx:-1;
    const resolvedSerialIdx=(serialIdx>=0&&serialIdx<header.length)?serialIdx:-1;
    const resolvedCommentIdx=(commentIdx>=0&&commentIdx<header.length)?commentIdx:-1;
    const finalMeldIdx=(resolvedMeldIdx===resolvedPartIdx||resolvedMeldIdx===resolvedSerialIdx||resolvedMeldIdx===resolvedCommentIdx)?-1:resolvedMeldIdx;
    const finalPartIdx=resolvedPartIdx===finalMeldIdx?-1:resolvedPartIdx;
    const finalSerialIdx=(resolvedSerialIdx===finalMeldIdx||resolvedSerialIdx===finalPartIdx)?-1:resolvedSerialIdx;
    const finalCommentIdx=(resolvedCommentIdx===finalMeldIdx||resolvedCommentIdx===finalPartIdx||resolvedCommentIdx===finalSerialIdx)?-1:resolvedCommentIdx;
    const map=new Map();
    for(let i=headerRowIndex+1;i<rows.length;i++){
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
    const allowed=await ensurePermission(handle,'readwrite');
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

  function makeAspenStableKey(meldung,part,serial){
    return `${normalizeKey(meldung)}||${normalizeKey(part)}||${normalizeKey(serial)}`;
  }

  async function readAspen(handle){
    await ensureXLSX();
    const file=await handle.getFile();
    if(file.size===0) return [];
    const buffer=await file.arrayBuffer();
    const workbook=XLSX.read(buffer,{type:'array'});
    const selection=pickSheet(workbook,{requiredHeaderGroups:[MELD_HEADER_PRIORITY,PART_HEADER_PRIORITY,SERIAL_HEADER_PRIORITY]});
    if(!selection) return [];
    const rows=selection.rows;
    if(!rows.length) return [];
    const {header,index:headerRowIndex}=selection.headerInfo;
    const used=new Set();
    const meldIdx=findColumn(header,MELD_PATTERNS,{preferred:MELD_HEADER_PRIORITY,exclude:used,allowPatternFallback:false});
    if(meldIdx>=0) used.add(meldIdx);
    const partIdx=findColumn(header,PART_PATTERNS,{preferred:PART_HEADER_PRIORITY,exclude:used});
    if(partIdx>=0) used.add(partIdx);
    const serialIdx=findColumn(header,SERIAL_PATTERNS,{preferred:SERIAL_HEADER_PRIORITY,exclude:used});
    if(serialIdx>=0) used.add(serialIdx);
    const resolvedMeldIdx=(meldIdx>=0&&meldIdx<header.length)?meldIdx:-1;
    const resolvedPartIdx=(partIdx>=0&&partIdx<header.length)?partIdx:-1;
    const resolvedSerialIdx=(serialIdx>=0&&serialIdx<header.length)?serialIdx:-1;
    const entries=[];
    for(let i=headerRowIndex+1;i<rows.length;i++){
      const row=rows[i]||[];
      const meldung=resolvedMeldIdx>=0?trim(row[resolvedMeldIdx]):'';
      const partValue=resolvedPartIdx>=0?row[resolvedPartIdx]:'';
      const serialValue=resolvedSerialIdx>=0?row[resolvedSerialIdx]:'';
      const part=normalizePartValue(partValue);
      const serial=trim(serialValue);
      if(!meldung&&( !part || !serial)) continue;
      const stableKey=makeAspenStableKey(meldung,part,serial);
      entries.push({
        meldung,
        part,
        serial,
        rowIndex:i,
        key:`${stableKey}::${i}`,
        stableKey
      });
    }
    entries.sort((a,b)=>{
      const meld=a.meldung.localeCompare(b.meldung,'de',{numeric:true,sensitivity:'base'});
      if(meld!==0) return meld;
      const part=a.part.localeCompare(b.part,'de',{numeric:true,sensitivity:'base'});
      if(part!==0) return part;
      const serial=a.serial.localeCompare(b.serial,'de',{numeric:true,sensitivity:'base'});
      if(serial!==0) return serial;
      return a.rowIndex-b.rowIndex;
    });
    return entries;
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

  async function ensurePermission(handle,mode='readwrite'){
    if(!handle?.queryPermission) return true;
    const query=await handle.queryPermission({mode});
    if(query==='granted') return true;
    if(query==='prompt'){
      const request=await handle.requestPermission({mode});
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
    const aspenHandleKey=`unitComments:aspen:${instanceId}`;

    const state={
      instanceId,
      comments:new Map(),
      commentHandle:null,
      commentName:'',
      aspenHandle:null,
      aspenName:'',
      aspenEntries:[],
      aspenOptions:[],
      aspenByKey:new Map(),
      aspenByMeldung:new Map(),
      activeMeldung:'',
      activePart:'',
      activeSerial:'',
      lastGeneralPart:'',
      lastGeneralSerial:'',
      manualAspenKey:'',
      manualAspenStableKey:'',
      manualAspenEntry:null,
      noteTimer:null,
      writeTimer:null,
      updatingTextarea:false,
      baseNote:null
    };

    const stored=loadLocalState(instanceId);
    if(stored){
      state.commentName=stored.commentFileName||'';
      if(typeof stored.aspenFileName==='string'){
        state.aspenName=stored.aspenFileName;
      }
      if(typeof stored.manualAspenKey==='string'){
        state.manualAspenKey=stored.manualAspenKey;
      }
      if(typeof stored.manualAspenStableKey==='string'){
        state.manualAspenStableKey=stored.manualAspenStableKey;
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
        aspenFileName:state.aspenName||'',
        manualAspenKey:state.manualAspenKey||'',
        manualAspenStableKey:state.manualAspenStableKey||'',
        comments:Array.from(state.comments.values()).map(entry=>({
          part:entry.part||'',
          serial:entry.serial||'',
          comment:entry.comment||'',
          meldung:entry.meldung||''
        }))
      };
      saveLocalState(instanceId,payload);
    }

    function resolveManualAspenSelection(opts={}){
      const {clearMissing=false}=opts;
      let updated=false;
      if(!(state.manualAspenKey||state.manualAspenStableKey)){
        state.manualAspenEntry=null;
        return updated;
      }
      const byKey=state.aspenByKey?.get(state.manualAspenKey);
      if(byKey){
        state.manualAspenEntry=byKey;
        return updated;
      }
      if(state.manualAspenStableKey){
        const byStable=state.aspenByKey?.get(state.manualAspenStableKey);
        if(byStable){
          state.manualAspenEntry=byStable;
          if(byStable.key!==state.manualAspenKey){
            state.manualAspenKey=byStable.key;
            updated=true;
          }
          return updated;
        }
      }
      state.manualAspenEntry=null;
      if(clearMissing&&(state.manualAspenKey||state.manualAspenStableKey)){
        state.manualAspenKey='';
        state.manualAspenStableKey='';
        updated=true;
      }
      return updated;
    }

    function setAspenEntries(entries){
      state.aspenEntries=Array.isArray(entries)?entries:[];
      state.aspenOptions=state.aspenEntries;
      state.aspenByKey=new Map();
      state.aspenByMeldung=new Map();
      for(const entry of state.aspenEntries){
        state.aspenByKey.set(entry.key,entry);
        state.aspenByKey.set(entry.stableKey,entry);
        const meldKey=normalizeKey(entry.meldung);
        if(!meldKey) continue;
        const existing=state.aspenByMeldung.get(meldKey);
        if(!existing){
          state.aspenByMeldung.set(meldKey,entry);
        }else if(!(existing.part||existing.serial) && (entry.part||entry.serial)){
          state.aspenByMeldung.set(meldKey,entry);
        }
      }
      const changed=resolveManualAspenSelection({clearMissing:false});
      if(changed) persistState();
      updateAspenSelectOptions();
    }

    function updateAspenSelectOptions(){
      const select=elements.menu?.querySelector('[data-aspen-select]');
      if(!select) return;
      const hasFile=!!state.aspenHandle;
      const options=Array.isArray(state.aspenOptions)?state.aspenOptions:[];
      const frag=document.createDocumentFragment();
      const autoOption=document.createElement('option');
      if(!hasFile){
        autoOption.textContent='Keine Aspen-Datei gewählt';
        autoOption.value='';
      }else{
        const current=state.activeMeldung?`Automatisch (${state.activeMeldung})`:'Automatisch (keine Meldung)';
        autoOption.textContent=current;
        autoOption.value='';
      }
      frag.appendChild(autoOption);
      options.forEach(option=>{
        const labelParts=[option.meldung||'—'];
        if(option.part) labelParts.push(`PN ${option.part}`);
        if(option.serial) labelParts.push(`SN ${option.serial}`);
        const opt=document.createElement('option');
        opt.value=option.key;
        opt.textContent=labelParts.join(' · ');
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
      select.disabled=!hasFile || (options.length===0 && !state.manualAspenKey);
    }

    function findAspenEntryByMeldung(meldung){
      const key=normalizeKey(meldung);
      if(!key) return null;
      return state.aspenByMeldung?.get(key)||null;
    }

    async function loadAspenHandle(handle,{updateName=true}={}){
      if(!handle) return false;
      state.aspenHandle=handle;
      const allowed=await ensurePermission(handle,'read');
      if(!allowed){
        applyNote(elements,'Keine Berechtigung für Aspen-Datei','error');
        return false;
      }
      try{
        const entries=await readAspen(handle);
        if(updateName){
          state.aspenName=handle.name||state.aspenName||'';
        }
        setAspenEntries(entries);
        persistState();
        updateUnitInfo();
        refreshBaseNote();
        return true;
      }catch(err){
        console.warn('UnitComments: Aspen-Datei konnte nicht gelesen werden',err);
        applyNote(elements,'Aspen-Datei konnte nicht gelesen werden','error');
        return false;
      }
    }

    async function pickAspenFile(){
      try{
        const [handle]=await window.showOpenFilePicker({
          multiple:false,
          types:[{
            description:'Aspen Excel',
            accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx','.xlsm']}
          }]
        });
        if(!handle) return;
        state.aspenHandle=handle;
        state.aspenName=handle.name||state.aspenName||'Aspen.xlsx';
        persistState();
        try{await idbSet(aspenHandleKey,handle);}catch(err){console.warn('UnitComments: store aspen handle failed',err);}
        const ok=await loadAspenHandle(handle,{updateName:false});
        if(ok) flashNote('Aspen-Datei geladen','success');
      }catch(err){
        if(err?.name==='AbortError') return;
        console.warn('UnitComments: aspen file pick failed',err);
        applyNote(elements,'Aspen-Datei konnte nicht geöffnet werden','error');
      }
    }

    async function reloadAspenFile(){
      if(!state.aspenHandle){
        applyNote(elements,'Keine Aspen-Datei ausgewählt','warn');
        return;
      }
      const ok=await loadAspenHandle(state.aspenHandle,{updateName:false});
      if(ok) flashNote('Aspen neu geladen','success');
    }

    function normalizePartValue(value){
      const text=trim(value);
      if(!text) return '';
      const [first]=text.split(':');
      return trim(first);
    }

    function updateAspenStatus(entry,{manualSelection=false}={}){
      if(!elements.aspenLabel) return;
      let label='Keine Aspen-Datei';
      if(state.aspenHandle||state.aspenName){
        const prefix=state.aspenName?`• ${state.aspenName}`:'Datei geladen';
        if(entry){
          label=manualSelection?`${prefix} · Manuell`:`${prefix} · Automatisch`;
        }else if(manualSelection && state.manualAspenKey){
          label=`${prefix} · Auswahl nicht gefunden`;
        }else if(state.activeMeldung){
          label=`${prefix} · Kein Eintrag`;
        }else if(state.aspenOptions.length){
          label=`${prefix} · Bereit`;
        }else{
          label=`${prefix} · Keine Daten`;
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
      if(!state.aspenHandle){
        notes.push('Rechtsklick → Aspen-Datei wählen');
        tone=tone||'warn';
      }else if(!state.aspenOptions.length){
        notes.push('Aspen-Datei ohne Meldungen');
        tone=tone||'warn';
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
      const manualActive=!!(state.manualAspenKey||state.manualAspenStableKey);
      if(manualActive){
        const changed=resolveManualAspenSelection({clearMissing:false});
        if(changed) persistState();
      }
      const autoEntry=state.activeMeldung?findAspenEntryByMeldung(state.activeMeldung):null;
      const effectiveEntry=state.manualAspenEntry||autoEntry;
      updateAspenStatus(effectiveEntry,{manualSelection:manualActive});
      let part='';
      let serial='';
      if(state.manualAspenEntry){
        part=state.manualAspenEntry.part||'';
        serial=state.manualAspenEntry.serial||'';
      }
      if(!part && effectiveEntry){
        part=effectiveEntry.part||'';
      }
      if(!serial && effectiveEntry){
        serial=effectiveEntry.serial||'';
      }
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
      const allowed=await ensurePermission(handle,'readwrite');
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
      if(action==='pick-aspen') pickAspenFile();
      else if(action==='reload-aspen') reloadAspenFile();
      else if(action==='pick-comments') pickCommentsFile();
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
          state.manualAspenStableKey='';
          state.manualAspenEntry=null;
          persistState();
          updateUnitInfo();
          updateAspenSelectOptions();
          return;
        }
        state.manualAspenKey=value;
        const entry=state.aspenByKey?.get(value)||null;
        if(entry){
          state.manualAspenEntry=entry;
          state.manualAspenStableKey=entry.stableKey;
        }else{
          state.manualAspenEntry=null;
        }
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

    (async()=>{
      try{
        const handle=await idbGet(aspenHandleKey);
        if(handle){
          if(!state.aspenName) state.aspenName=handle.name||state.aspenName||'';
          persistState();
          await loadAspenHandle(handle,{updateName:false});
        }else{
          updateAspenSelectOptions();
        }
      }catch(err){
        console.warn('UnitComments: restore aspen handle failed',err);
      }
    })();
  };
})();
