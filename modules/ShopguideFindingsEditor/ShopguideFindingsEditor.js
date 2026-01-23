(function(){
  'use strict';

  const MODULE_VERSION='1.6.1';
  const PATH_KEY='shopguide-findings-path';
  const GLOBAL_PATH_STORAGE_KEY='shopguide-findings-global-path';
  const DEFAULT_FILE='Shopguide_Findings.json';
  const PREFILL_STORAGE_KEY='shopguide-findings-prefill';
  const EDIT_TARGET_STORAGE_KEY='shopguide-findings-edit-target';
  const NSF_DATA_STORAGE_KEY='sf-data';
  const FINDINGS_EDITOR_UPDATE_EVENT='shopguide-findings-entry-updated';
  const BUNDLED_FINDINGS_DATA=[
    {
      id:'demo-entry',
      partNumbers:['DEMO-001'],
      label:'Demo-Eintrag',
      findings:'Beispielbefund zur Demonstration des Editors.',
      actions:'Erforderliche Maßnahme dokumentieren.',
      routineAction:'KV-Aktion eintragen.',
      nonroutine:'Besondere Hinweise für Nonroutine-Fälle ergänzen.',
      parts:'Artikelnummern oder Bestellhinweise hier aufführen.'
    }
  ];
  const BUNDLED_FINDINGS_JSON=JSON.stringify(BUNDLED_FINDINGS_DATA,null,2);
  const AUTOSAVE_INTERVAL=5000;
  const HISTORY_LIMIT=10;
  const STYLE_ID='sfe-styles';
  const GLOBAL_HANDLE_KEY='__shopguideFindingsFileHandle';
  const GLOBAL_PATH_VAR='__shopguideFindingsFilePath';
  const IDB_DB_NAME='shopguide-findings-editor';
  const IDB_STORE_NAME='handles';
  const IDB_HANDLE_KEY='primary';

  const FIELD_KEYS=['label','findings','actions','routineAction','nonroutine','parts'];
  const TIMES_FIELD_DEFS=[
    {key:'arbeitszeit',label:'Arbeitszeit',placeholder:'Arbeitszeit eingeben',copyLabel:'Arbeitszeit'},
    {key:'modZeit',label:'Mod Zeit',placeholder:'Mod Zeit eingeben',copyLabel:'Mod Zeit'}
  ];
  const MODS_FIELD_DEFS=[
    {key:'modBezeichnung',label:'Mod Bezeichnung',placeholder:'Mod Bezeichnung eingeben',copyLabel:'Mod Bezeichnung'},
    {key:'modKommentar',label:'Mod Kommentar',placeholder:'Mod Kommentar eingeben',copyLabel:'Mod Kommentar'},
    {key:'standardAbSN',label:'Standard ab SN',placeholder:'Standard ab SN eingeben',copyLabel:'Standard ab SN'},
    {key:'modLink',label:'Mod Link',placeholder:'Mod Link eingeben',copyLabel:'Mod Link'},
    {key:'modzeit',label:'Mod Zeit',placeholder:'Mod Zeit eingeben',copyLabel:'Mod Zeit'}
  ];
  const NESTED_SECTIONS=[
    {key:'times',title:'Times',fields:TIMES_FIELD_DEFS},
    {key:'mods',title:'Mods',fields:MODS_FIELD_DEFS}
  ];
  const SUGGESTION_FIELD_KEYS=[
    ...FIELD_KEYS,
    ...TIMES_FIELD_DEFS.map(field=>`times.${field.key}`),
    ...MODS_FIELD_DEFS.map(field=>`mods.${field.key}`)
  ];
  const STRUCTURE_SORT_FIELDS=[
    {key:'label',label:'Label'},
    {key:'primaryPartNumber',label:'Primäre Partnummer'},
    {key:'id',label:'ID'},
    {key:'actions',label:'Aktionen'},
    {key:'routineAction',label:'Routine Aktion'},
    {key:'nonroutine',label:'Nonroutine'},
    {key:'findings',label:'Findings'},
    {key:'parts',label:'Bestelltext'}
  ];

  function consumePrefillPayload(){
    let payload=null;
    if(window.__shopguideFindingsPrefill){
      payload=window.__shopguideFindingsPrefill;
      try{
        delete window.__shopguideFindingsPrefill;
      }catch(err){
        window.__shopguideFindingsPrefill=null;
      }
    }
    if(!payload){
      try{
        const raw=localStorage.getItem(PREFILL_STORAGE_KEY);
        if(raw) payload=JSON.parse(raw);
      }catch(err){
        console.warn('Prefill konnte nicht geladen werden',err);
      }
    }
    if(payload){
      try{
        localStorage.removeItem(PREFILL_STORAGE_KEY);
      }catch(err){
        console.warn('Prefill konnte nicht entfernt werden',err);
      }
    }
    if(!payload||typeof payload!=='object') return null;
    return payload;
  }

  function consumeEditTargetPayload(){
    let payload=null;
    if(window.__shopguideFindingsEditTarget){
      payload=window.__shopguideFindingsEditTarget;
      try{
        delete window.__shopguideFindingsEditTarget;
      }catch(err){
        window.__shopguideFindingsEditTarget=null;
      }
    }
    if(!payload){
      try{
        const raw=localStorage.getItem(EDIT_TARGET_STORAGE_KEY);
        if(raw) payload=JSON.parse(raw);
      }catch(err){
        console.warn('Edit-Target konnte nicht geladen werden',err);
      }
    }
    if(payload){
      try{
        localStorage.removeItem(EDIT_TARGET_STORAGE_KEY);
      }catch(err){
        console.warn('Edit-Target konnte nicht entfernt werden',err);
      }
    }
    if(!payload||typeof payload!=='object') return null;
    return payload;
  }

  function supportsIndexedDB(){
    try{
      return typeof indexedDB!=='undefined';
    }catch(err){
      return false;
    }
  }

  async function openHandleDb(){
    if(!supportsIndexedDB()) return null;
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(IDB_DB_NAME,1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(IDB_STORE_NAME)){
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      request.onsuccess=()=>{
        const db=request.result;
        db.onversionchange=()=>{
          try{db.close();}catch(err){}
        };
        resolve(db);
      };
      request.onerror=()=>{
        reject(request.error);
      };
    }).catch(err=>{
      console.warn('IndexedDB konnte nicht geöffnet werden',err);
      return null;
    });
  }

  function finalizeTransaction(tx,db){
    const cleanup=()=>{
      try{db.close();}catch(err){}
    };
    tx.oncomplete=cleanup;
    tx.onabort=cleanup;
    tx.onerror=cleanup;
  }

  async function idbGetHandle(key){
    try{
      const db=await openHandleDb();
      if(!db) return null;
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(IDB_STORE_NAME,'readonly');
        finalizeTransaction(tx,db);
        const store=tx.objectStore(IDB_STORE_NAME);
        const request=store.get(key);
        request.onsuccess=()=>resolve(request.result||null);
        request.onerror=()=>reject(request.error);
      });
    }catch(err){
      console.warn('Lesen aus IndexedDB fehlgeschlagen',err);
      return null;
    }
  }

  async function idbSetHandle(key,value){
    try{
      const db=await openHandleDb();
      if(!db) return false;
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(IDB_STORE_NAME,'readwrite');
        finalizeTransaction(tx,db);
        const store=tx.objectStore(IDB_STORE_NAME);
        const request=store.put(value,key);
        request.onsuccess=()=>resolve(true);
        request.onerror=()=>reject(request.error);
      });
    }catch(err){
      console.warn('Schreiben in IndexedDB fehlgeschlagen',err);
      return false;
    }
  }

  async function idbDeleteHandle(key){
    try{
      const db=await openHandleDb();
      if(!db) return false;
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(IDB_STORE_NAME,'readwrite');
        finalizeTransaction(tx,db);
        const store=tx.objectStore(IDB_STORE_NAME);
        const request=store.delete(key);
        request.onsuccess=()=>resolve(true);
        request.onerror=()=>reject(request.error);
      });
    }catch(err){
      console.warn('Löschen aus IndexedDB fehlgeschlagen',err);
      return false;
    }
  }

  async function loadPersistedHandle(){
    return await idbGetHandle(IDB_HANDLE_KEY);
  }

  async function persistHandle(handle){
    if(!handle){
      await idbDeleteHandle(IDB_HANDLE_KEY);
      return;
    }
    await idbSetHandle(IDB_HANDLE_KEY,handle);
  }

  async function clearPersistedHandle(){
    await idbDeleteHandle(IDB_HANDLE_KEY);
  }

  async function ensurePermission(handle,mode,shouldRequest){
    if(!handle) return false;
    const queryFn=typeof handle.queryPermission==='function'?handle.queryPermission.bind(handle):null;
    const requestFn=typeof handle.requestPermission==='function'?handle.requestPermission.bind(handle):null;
    if(!queryFn) return true;
    try{
      const status=await queryFn({mode});
      if(status==='granted') return true;
      if(!shouldRequest||status==='denied'||!requestFn) return false;
      const result=await requestFn({mode});
      return result==='granted';
    }catch(err){
      console.warn('Berechtigungsprüfung fehlgeschlagen',err);
      return false;
    }
  }

  function ensureReadPermission(handle,shouldRequest=true){
    return ensurePermission(handle,'read',shouldRequest);
  }

  function ensureReadWritePermission(handle,shouldRequest=true){
    return ensurePermission(handle,'readwrite',shouldRequest);
  }
  const PART_NUMBERS_LABEL='Partnummern';
  const PART_PAIR_COUNT=6;
  const FIELD_LABELS={
    label:'Label',
    findings:'Findings',
    actions:'Actions',
    routineAction:'KV-Actions',
    nonroutine:'Nonroutine',
    parts:'Bestelltext'
  };
  const PARTS_GRID_LABEL='Bestellnummern & Mengen';

  // ===== MIGRATION UTILITIES (BEGIN) =====
  function normStr(v) {
    if (v == null) return '';
    return String(v).trim();
  }
  function toFloatOrNull(v) {
    if (v == null) return null;
    let s = String(v).trim();
    if (s === '' || s === '-1' || s === '-1.0' || s === '-1,0') return null;
    s = s.replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  function pickFilled(obj) {
    // returns a shallow copy with only truthy (non-empty) values
    const out = {};
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v === 0) { out[k] = v; return; }
      if (Array.isArray(v) && v.length > 0) { out[k] = v; return; }
      if (v && String(v).trim() !== '') out[k] = v;
    });
    return out;
  }

  function parsePartsObjectToArray(partsObj) {
    // expects { "Part 1": "...", "Menge 1": "...", "Part 2": "...", ... }
    if (!partsObj || typeof partsObj !== 'object') return [];
    const maxSlots = 30; // safe upper bound
    const arr = [];
    for (let i = 1; i <= maxSlots; i++) {
      const p = normStr(partsObj[`Part ${i}`]);
      const mRaw = partsObj[`Menge ${i}`];
      if (!p) continue;
      const menge = toFloatOrNull(mRaw);
      arr.push({ part: p, menge: menge == null ? 1 : menge });
    }
    return arr;
  }

  function parseTimes(timesObj) {
    if (!timesObj || typeof timesObj !== 'object') return {};
    const arbeitszeit = toFloatOrNull(timesObj.Arbeitszeit);
    const modzeit = toFloatOrNull(timesObj.ModZeit || timesObj.Modzeit || timesObj.modZeit || timesObj.modzeit);
    return pickFilled({ arbeitszeit, modzeit });
  }

  function normalizeOneModLike(m) {
    if (!m) return null;
    // accept many spellings; prefer english, camelCase
    const title = normStr(m.ModBezeichnung || m.modBezeichnung || m.bezeichnung || m.title);
    const comment = normStr(m.ModKommentar || m.modKommentar || m.kommentar || m.comment);
    const standardFromSN = normStr(m.Standard_ab_SN || m.standard_ab_sn || m.StandardAbSN || m.standardAbSN || m.standardAbSn || m.standardFromSN);
    const link = normStr(m.ModLink || m.modLink || m.link);
    const time = toFloatOrNull(m.Modzeit || m.modZeit || m.ModZeit || m.modzeit || m.time);
    const cleaned = pickFilled({ title, comment, standardFromSN, link, time });
    return Object.keys(cleaned).length ? cleaned : null;
  }

  function parseMods(entry) {
    const out = [];
    // single Mods object
    const M = entry.Mods;
    if (M && typeof M === 'object') {
      const nm = normalizeOneModLike(M);
      if (nm) out.push(nm);
    }
    // array variations
    const lists = [entry.ModsList, entry.modsList];
    for (const L of lists) {
      if (Array.isArray(L)) {
        for (const it of L) {
          const nm = normalizeOneModLike(it);
          if (nm) out.push(nm);
        }
      }
    }
    // dedupe by (title, link, standardFromSN, time, comment)
    const seen = new Set();
    const dedup = [];
    for (const m of out) {
      const key = JSON.stringify([m.title||'', m.link||'', m.standardFromSN||'', m.time||'', m.comment||'']);
      if (!seen.has(key)) { seen.add(key); dedup.push(m); }
    }
    return dedup;
  }

  function splitPartNumbers(entry) {
    // Source of truth for master PN: entry.Part (root)
    let master = normStr(entry?.Part);
    if(!master) master=normStr(entry?.partNumber);
    if(!master&&Array.isArray(entry?.partNumbers)&&entry.partNumbers.length){
      master=normStr(entry.partNumbers[0]);
    }
    // Some files also have PartNumbers array; extra apply-tos are index >= 1, but ignore duplicates of master
    let applies = [];
    if (Array.isArray(entry?.PartNumbers)) {
      applies = entry.PartNumbers.map(normStr).filter(x => x && x !== master);
    } else if(Array.isArray(entry?.partNumbers)){
      applies = entry.partNumbers.slice(1).map(normStr).filter(x=>x && x!==master);
    }
    return { master, applies };
  }

  function normalizeFinding(entry) {
    // already migrated?
    if (entry && entry.partNumber && Array.isArray(entry.parts)) return { migrated: false, value: entry };

    // Basic fields
    const { master, applies } = splitPartNumbers(entry || {});
    const partNumber = master; // can be "" for template
    const label = normStr(entry?.Label ?? entry?.label);
    const findings = normStr(entry?.Findings ?? entry?.findings);
    const actions = normStr(entry?.Actions ?? entry?.actions);
    const routineAction = normStr(entry?.Routine?.RoutineAction ?? entry?.routineAction);
    const nonRoutineFindingRaw = normStr((entry?.NonRoutine && entry?.NonRoutine?.NonRoutineFinding!=null)?entry.NonRoutine.NonRoutineFinding:(entry?.nonRoutineFinding ?? entry?.nonroutine));
    const nonRoutineFinding = nonRoutineFindingRaw ? nonRoutineFindingRaw : null;

    // parts
    let parts = parsePartsObjectToArray(entry?.Parts);
    if(!parts.length && Array.isArray(entry?.parts)){
      parts = entry.parts.map(item=>{
        const partValue=normStr(item&&item.part);
        const mengeValue=toFloatOrNull(item&& (item.menge!=null?item.menge:item.quantity));
        return partValue?{part:partValue,menge:mengeValue==null?1:mengeValue}:null;
      }).filter(Boolean);
    }
    if(!parts.length && Array.isArray(entry?.partsPairs)){
      parts = entry.partsPairs.map(pair=>{
        const part=normStr(pair&& (pair.part ?? pair.Part));
        const mengeRaw=pair && (pair.quantity ?? pair.menge ?? pair.qty);
        const menge=toFloatOrNull(mengeRaw);
        return part?{part,menge:menge==null?1:menge}:null;
      }).filter(Boolean);
    }
    // times
    let times = parseTimes(entry?.Times);
    if((!times || !Object.keys(times).length) && entry && entry.times){
      const arbeitszeit=toFloatOrNull(entry.times.arbeitszeit ?? entry.times.Arbeitszeit);
      const modzeit=toFloatOrNull(entry.times.modzeit ?? entry.times.modZeit ?? entry.times.Modzeit ?? entry.times.ModZeit);
      times=pickFilled({arbeitszeit,modzeit});
    }
    // mods
    const mods = parseMods(entry || {});
    const modsOut = mods.length ? mods : null;

    // Build new object in reading order (A)
    const out = {};
    out.partNumber = partNumber;                        // master PN (can be "")
    if (applies && applies.length) out.appliesTo = applies;
    out.label = label;
    out.findings = findings;
    out.actions = actions;
    out.routineAction = routineAction;
    out.parts = parts;                                  // [] allowed
    if (Object.keys(times).length) out.times = times;   // only if has values
    if (nonRoutineFinding) out.nonRoutineFinding = nonRoutineFinding;
    if (modsOut) out.mods = modsOut;

    // If out is entirely empty (unlikely), throw to warn
    const keys = Object.keys(out);
    if (!keys.length) throw new Error("Empty finding after normalization");

    return { migrated: true, value: out };
  }

  function migrateFindingsArray(arr) {
    const out = [];
    const warnings = [];
    let changed = false;
    if (!Array.isArray(arr)) return { changed: false, data: [], warnings: ["Root is not an array"] };

    for (let i = 0; i < arr.length; i++) {
      const e = arr[i];
      try {
        const { migrated, value } = normalizeFinding(e);
        if (migrated) changed = true;
        out.push(value);
      } catch (err) {
        warnings.push(`Finding @index ${i} could not be migrated: ${err?.message || err}`);
        // try to keep original entry to avoid data loss
        out.push(e);
      }
    }
    return { changed, data: out, warnings };
  }
  // ===== MIGRATION UTILITIES (END) =====

  function isNewSchemaFinding(f){
    return f&&typeof f==='object'&&typeof f.partNumber==='string'&&Array.isArray(f.parts);
  }

  function validateBeforeSave(findings){
    if(!Array.isArray(findings)) return [];
    for(let i=0;i<findings.length;i+=1){
      const entry=findings[i];
      if(!isNewSchemaFinding(entry)){
        console.warn('Legacy or invalid finding detected before save @index',i,entry);
        try{
          const result=normalizeFinding(entry);
          findings[i]=result.value;
        }catch(err){
          console.warn('Automatische Migration vor dem Speichern fehlgeschlagen',err);
        }
      }
    }
    return findings;
  }

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .sfe-module{display:flex;flex-direction:column;gap:0.75rem;height:100%;color:var(--text-color,#fff);}
      .sfe-header{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;justify-content:space-between;background:rgba(255,255,255,0.08);border-radius:0.85rem;padding:0.65rem 0.85rem;}
      .sfe-search-wrap{flex:1 1 260px;min-width:200px;}
      .sfe-search{width:100%;padding:0.55rem 0.75rem;border-radius:0.65rem;border:none;font:inherit;color:var(--sidebar-module-card-text,#111);background:var(--sidebar-module-card-bg,#fff);}
      .sfe-actions{display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center;justify-content:flex-end;}
      .sfe-btn{border:none;border-radius:0.6rem;padding:0.4rem 0.8rem;background:rgba(255,255,255,0.14);color:inherit;font:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;display:inline-flex;align-items:center;gap:0.35rem;line-height:1;}
      .sfe-btn:hover:not(:disabled){background:rgba(255,255,255,0.24);transform:translateY(-1px);}
      .sfe-btn:disabled{opacity:0.45;cursor:not-allowed;}
      .sfe-status{font-size:0.75rem;opacity:0.75;min-width:140px;text-align:right;}
      .sfe-body{display:flex;flex:1;min-height:0;gap:0.75rem;flex-wrap:wrap;}
      .sfe-list{flex:1 1 280px;min-width:220px;max-width:420px;background:rgba(255,255,255,0.08);border-radius:0.85rem;padding:0.6rem;display:flex;flex-direction:column;gap:0.5rem;}
      .sfe-list-header{display:flex;flex-direction:column;gap:0.35rem;font-size:0.78rem;opacity:0.8;}
      .sfe-results{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:0.45rem;}
      .sfe-item{background:rgba(15,23,42,0.22);border-radius:0.75rem;padding:0.5rem 0.65rem;display:flex;align-items:flex-start;justify-content:space-between;gap:0.6rem;cursor:pointer;transition:background 0.12s ease,transform 0.12s ease;border:none;text-align:left;width:100%;}
      .sfe-item:hover{background:rgba(59,130,246,0.25);transform:translateY(-1px);}
      .sfe-item.active{background:rgba(59,130,246,0.35);box-shadow:0 8px 22px rgba(15,23,42,0.25);}
      .sfe-item-content{display:flex;flex-direction:column;gap:0.25rem;flex:1;min-width:0;}
      .sfe-item-title{font-weight:600;font-size:0.9rem;}
      .sfe-item-subtitle{font-size:0.78rem;opacity:0.75;max-height:3em;overflow:hidden;}
      .sfe-item mark{background:rgba(252,211,77,0.65);color:inherit;padding:0 0.15rem;border-radius:0.25rem;}
      .sfe-item-actions{display:flex;align-items:center;gap:0.25rem;opacity:0;pointer-events:none;transition:opacity 0.12s ease,transform 0.12s ease;transform:translateY(-2px);}
      .sfe-item:hover .sfe-item-actions,.sfe-item:focus-within .sfe-item-actions{opacity:1;pointer-events:auto;transform:translateY(0);}
      .sfe-item-action{border:none;background:rgba(255,255,255,0.18);color:inherit;padding:0.3rem;border-radius:0.55rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-width:1.75rem;min-height:1.75rem;transition:background 0.12s ease,transform 0.12s ease;}
      .sfe-item-action:hover{background:rgba(255,255,255,0.28);transform:translateY(-1px);}
      .sfe-item-action--delete{background:rgba(248,113,113,0.22);}
      .sfe-item-action--delete:hover{background:rgba(248,113,113,0.32);}
      .sfe-item-action:focus-visible{outline:2px solid rgba(59,130,246,0.6);outline-offset:2px;}
      .sfe-editor{flex:2 1 360px;min-width:260px;background:rgba(255,255,255,0.08);border-radius:0.85rem;padding:0.75rem;display:flex;flex-direction:column;gap:0.65rem;min-height:0;}
      .sfe-editor-header{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;}
      .sfe-editor-title{font-weight:600;font-size:1rem;}
      .sfe-copy{background:rgba(16,185,129,0.25);}
      .sfe-copy:hover:not(:disabled){background:rgba(16,185,129,0.35);}
      .sfe-fields{display:flex;flex-direction:column;gap:0.65rem;flex:1;overflow-y:auto;padding-right:0.25rem;}
      .sfe-field{display:flex;flex-direction:column;gap:0.35rem;background:rgba(15,23,42,0.2);border-radius:0.75rem;padding:0.55rem 0.65rem;position:relative;}
      .sfe-partnumbers-field{gap:0.5rem;}
      .sfe-partnumbers-header{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;}
      .sfe-partnumbers-add{border:none;border-radius:0.55rem;padding:0.3rem 0.65rem;background:rgba(59,130,246,0.18);color:inherit;font:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:0.35rem;line-height:1;}
      .sfe-partnumbers-add:hover{background:rgba(59,130,246,0.28);}
      .sfe-partnumbers-list{display:flex;flex-direction:column;gap:0.4rem;}
      .sfe-partnumbers-row{display:flex;gap:0.4rem;align-items:center;}
      .sfe-partnumbers-row .sfe-input{flex:1;}
      .sfe-partnumbers-remove{border:none;border-radius:0.55rem;padding:0.35rem 0.55rem;background:rgba(248,113,113,0.18);color:inherit;font:inherit;cursor:pointer;line-height:1;display:inline-flex;align-items:center;justify-content:center;}
      .sfe-partnumbers-remove:hover{background:rgba(248,113,113,0.3);}
      .sfe-field label{font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;opacity:0.75;}
      .sfe-parts-grid-field{gap:0.55rem;}
      .sfe-parts-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0.5rem;}
      .sfe-parts-grid-header{display:flex;flex-direction:column;gap:0.45rem;}
      .sfe-bestelltext-block{position:relative;display:flex;flex-direction:column;gap:0.35rem;background:rgba(15,23,42,0.28);border-radius:0.65rem;padding:0.5rem;}
      .sfe-bestelltext-block .sfe-textarea{min-height:4.5rem;}
      .sfe-part-pair{background:rgba(15,23,42,0.32);border-radius:0.65rem;padding:0.45rem 0.5rem;display:flex;flex-direction:column;gap:0.35rem;}
      .sfe-part-pair-title{font-size:0.68rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;opacity:0.75;}
      .sfe-part-pair-body{display:flex;gap:0.4rem;align-items:flex-end;}
      .sfe-part-block,.sfe-qty-block{display:flex;flex-direction:column;gap:0.3rem;flex:1;}
      .sfe-part-block{flex:2;}
      .sfe-part-block label,.sfe-qty-block label{font-size:0.65rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;opacity:0.75;}
      .sfe-part-block .sfe-input,.sfe-qty-block .sfe-input{height:2.6rem;}
      @media (max-width:720px){
        .sfe-part-pair-body{flex-direction:column;align-items:stretch;}
      }
      .sfe-input,.sfe-textarea{width:100%;border:none;border-radius:0.55rem;padding:0.55rem 0.65rem;font:inherit;color:var(--sidebar-module-card-text,#111);background:var(--sidebar-module-card-bg,#fff);resize:vertical;min-height:2.6rem;}
      .sfe-input{height:2.6rem;}
      .sfe-textarea{min-height:5.5rem;}
      .sfe-empty{opacity:0.75;font-style:italic;}
      .sfe-no-results{padding:0.65rem;border-radius:0.75rem;background:rgba(15,23,42,0.24);text-align:center;font-size:0.85rem;}
      .sfe-file-info{font-size:0.72rem;opacity:0.75;display:flex;flex-direction:column;gap:0.25rem;}
      .sfe-suggestions{position:absolute;left:0.65rem;right:0.65rem;top:calc(100% - 0.35rem);background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border-radius:0.65rem;box-shadow:0 12px 28px rgba(15,23,42,0.25);max-height:220px;overflow:auto;z-index:20;display:none;flex-direction:column;padding:0.35rem;}
      .sfe-field.show-suggestions .sfe-suggestions{display:flex;}
      .sfe-subsection{gap:0.5rem;}
      .sfe-subsection-header{display:flex;align-items:center;justify-content:space-between;font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;opacity:0.8;gap:0.5rem;}
      .sfe-subsection-actions{display:flex;align-items:center;gap:0.35rem;}
      .sfe-subsection-add{border:none;background:rgba(59,130,246,0.2);color:inherit;width:1.9rem;height:1.9rem;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font:inherit;font-weight:700;cursor:pointer;transition:background 0.12s ease,transform 0.12s ease;}
      .sfe-subsection-add:hover{background:rgba(59,130,246,0.3);transform:translateY(-1px);}
      .sfe-subsection-add:focus-visible{outline:2px solid rgba(59,130,246,0.6);outline-offset:2px;}
      .sfe-mods-grid{display:flex;flex-wrap:wrap;gap:0.75rem;}
      .sfe-mod-column{flex:1 1 240px;min-width:220px;background:rgba(15,23,42,0.26);border-radius:0.65rem;padding:0.6rem;display:flex;flex-direction:column;gap:0.55rem;}
      .sfe-mod-column-header{display:flex;align-items:center;justify-content:space-between;font-size:0.75rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;opacity:0.85;}
      .sfe-mod-remove{border:none;background:rgba(248,113,113,0.22);color:inherit;width:1.7rem;height:1.7rem;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font:inherit;font-weight:700;cursor:pointer;transition:background 0.12s ease,transform 0.12s ease;margin-left:0.35rem;}
      .sfe-mod-remove:hover{background:rgba(248,113,113,0.32);transform:translateY(-1px);}
      .sfe-mod-remove:focus-visible{outline:2px solid rgba(248,113,113,0.6);outline-offset:2px;}
      .sfe-mod-column-fields{display:flex;flex-direction:column;gap:0.45rem;}
      .sfe-subfield-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.5rem;}
      .sfe-subfield{display:flex;flex-direction:column;gap:0.35rem;position:relative;}
      .sfe-subfield .sfe-suggestions{left:0;right:0;}
      .sfe-subfield.show-suggestions .sfe-suggestions{display:flex;}
      .sfe-suggestion{padding:0.4rem 0.55rem;border-radius:0.55rem;cursor:pointer;transition:background 0.12s ease;}
      .sfe-suggestion:hover{background:rgba(59,130,246,0.18);}
      .sfe-structure-overlay{position:fixed;inset:0;z-index:1200;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,0.72);padding:2rem 1.25rem;}
      .sfe-structure-overlay.open{display:flex;}
      .sfe-structure-modal{width:min(960px,100%);max-height:90vh;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border-radius:1rem;box-shadow:0 18px 48px rgba(15,23,42,0.35);display:flex;flex-direction:column;overflow:hidden;}
      .sfe-structure-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;background:rgba(15,23,42,0.08);border-bottom:1px solid rgba(148,163,184,0.25);}
      .sfe-structure-title{font-size:1.1rem;font-weight:600;}
      .sfe-modal-close{border:none;background:none;font-size:1.4rem;line-height:1;color:inherit;cursor:pointer;padding:0.25rem;border-radius:0.5rem;}
      .sfe-modal-close:hover{background:rgba(59,130,246,0.12);}
      .sfe-structure-controls{display:flex;flex-direction:column;gap:0.75rem;padding:1rem 1.25rem;border-bottom:1px solid rgba(148,163,184,0.25);background:rgba(15,23,42,0.04);}
      .sfe-structure-description{margin:0;font-size:0.82rem;opacity:0.75;}
      .sfe-sort-order{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;}
      .sfe-sort-order select{border-radius:0.55rem;border:1px solid rgba(148,163,184,0.35);padding:0.35rem 0.65rem;font:inherit;background:rgba(255,255,255,0.95);color:inherit;}
      .sfe-sort-list{display:flex;flex-direction:column;gap:0.45rem;}
      .sfe-sort-row{display:flex;align-items:center;justify-content:space-between;gap:0.65rem;padding:0.45rem 0.6rem;border-radius:0.65rem;background:rgba(15,23,42,0.1);}
      .sfe-sort-row-disabled{opacity:0.55;}
      .sfe-sort-row-info{display:flex;align-items:center;gap:0.45rem;}
      .sfe-sort-row-label{display:flex;align-items:center;gap:0.35rem;cursor:pointer;font-weight:600;}
      .sfe-sort-row-label input{margin:0;}
      .sfe-sort-row-index{font-size:0.78rem;opacity:0.6;}
      .sfe-sort-row-controls{display:flex;gap:0.35rem;}
      .sfe-icon-btn{border:none;background:rgba(59,130,246,0.18);color:inherit;width:1.9rem;height:1.9rem;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.12s ease,transform 0.12s ease;}
      .sfe-icon-btn:disabled{opacity:0.35;cursor:not-allowed;}
      .sfe-icon-btn:not(:disabled):hover{background:rgba(59,130,246,0.3);transform:translateY(-1px);}
      .sfe-structure-body{flex:1;overflow:auto;padding:1rem 1.25rem;background:rgba(15,23,42,0.02);}
      .sfe-structure-tree{display:flex;flex-direction:column;gap:0.75rem;}
      .sfe-structure-empty{padding:1.25rem;border-radius:0.75rem;background:rgba(15,23,42,0.12);text-align:center;font-size:0.9rem;}
      .sfe-structure-item{background:rgba(15,23,42,0.08);border-radius:0.75rem;padding:0.4rem 0.6rem;}
      .sfe-structure-item summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:0.75rem;cursor:pointer;font-weight:600;}
      .sfe-structure-summary-title{flex:1;}
      .sfe-structure-item summary::-webkit-details-marker{display:none;}
      .sfe-structure-summary-meta{font-size:0.78rem;opacity:0.7;}
      .sfe-structure-item[open]{background:rgba(59,130,246,0.12);box-shadow:0 10px 28px rgba(15,23,42,0.18);}
      .sfe-structure-content{display:flex;flex-direction:column;gap:0.5rem;padding:0.6rem 0.1rem 0.4rem;}
      .sfe-structure-field{display:flex;flex-direction:column;gap:0.2rem;border-radius:0.55rem;background:rgba(15,23,42,0.08);padding:0.45rem;}
      .sfe-structure-field-label{font-size:0.65rem;letter-spacing:0.08em;text-transform:uppercase;opacity:0.7;}
      .sfe-structure-field-value{font-size:0.85rem;line-height:1.4;white-space:pre-wrap;word-break:break-word;}
      .sfe-structure-footer{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.75rem;padding:1rem 1.25rem;border-top:1px solid rgba(148,163,184,0.25);background:rgba(15,23,42,0.08);}
      .sfe-structure-file{font-size:0.78rem;opacity:0.75;white-space:pre-line;}
      .sfe-modal-action{align-self:flex-start;}
      .sfe-list-count{font-weight:600;}
      .sfe-warning{color:#facc15;font-size:0.8rem;white-space:pre-line;}
      .sfe-error{color:#fecaca;font-size:0.8rem;}
      @media (max-width:960px){
        .sfe-body{flex-direction:column;}
        .sfe-list{max-width:none;}
      }
    `;
    document.head.appendChild(style);
  }

  function cleanString(value){
    if(value==null) return '';
    const text=String(value);
    return text.trim?text.trim():text;
  }

  function normalizeMatchString(value){
    const cleaned=cleanString(value);
    return cleaned?cleaned.toLowerCase():'';
  }

  function normalizeStoredPath(rawPath){
    let cleaned=cleanString(rawPath);
    if(!cleaned) return DEFAULT_FILE;
    if(cleaned.startsWith('./')) cleaned=cleaned.slice(2);
    if(/^file:/i.test(cleaned)) return DEFAULT_FILE;
    if(/^[a-z]:[\\/]/i.test(cleaned)||cleaned.startsWith('\\\\')) return DEFAULT_FILE;
    if(/^[a-z]+:\/\//i.test(cleaned)){
      try{
        const url=new URL(cleaned,window.location.href);
        if(url.origin!==window.location.origin) return DEFAULT_FILE;
        return url.pathname||DEFAULT_FILE;
      }catch(err){
        return DEFAULT_FILE;
      }
    }
    return cleaned;
  }

  function disableAutocomplete(element){
    if(!element) return;
    try{
      element.autocomplete='off';
    }catch(err){
      /* ignore unsupported autocomplete property */
    }
    element.setAttribute('autocomplete','off');
  }

  function pickFirstFilled(...values){
    for(const value of values){
      if(value==null) continue;
      const cleaned=cleanString(value);
      if(cleaned) return cleaned;
    }
    return '';
  }

  function cloneData(value){
    if(typeof structuredClone==='function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function ensureId(){
    return 'f-'+Math.random().toString(36).slice(2)+Date.now().toString(36);
  }

  function highlight(text,term){
    if(!term) return escapeHTML(text);
    const safe=escapeHTML(text);
    const cleaned=cleanString(term);
    if(!cleaned) return safe;
    const parts=cleaned.split('*').filter(Boolean);
    if(!parts.length) return safe;
    const pattern=new RegExp(`(${parts.map(escapeRegExp).join('|')})`,'ig');
    return safe.replace(pattern,'<mark>$1</mark>');
  }

  function escapeHTML(value){
    return String(value).replace(/[&<>"']/g,c=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    })[c]);
  }

  function escapeRegExp(value){
    return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }

  function createSearchMatcher(rawTerm){
    const trimmed=cleanString(rawTerm);
    if(!trimmed) return null;
    if(trimmed.includes('*')){
      const plain=trimmed.replace(/\*/g,'').trim();
      if(!plain) return null;
      const hasLeadingWildcard=trimmed.startsWith('*');
      const hasTrailingWildcard=trimmed.endsWith('*');
      const parts=trimmed.split('*').filter(Boolean).map(part=>escapeRegExp(part));
      let pattern=parts.join('.*');
      if(!pattern) pattern='.*';
      if(!hasLeadingWildcard) pattern=`^${pattern}`;
      if(!hasTrailingWildcard) pattern=`${pattern}$`;
      const regex=new RegExp(pattern,'i');
      return value=>{
        if(value==null) return false;
        return regex.test(String(value));
      };
    }
    const needle=trimmed.toLowerCase();
    return value=>{
      if(value==null) return false;
      return String(value).toLowerCase().includes(needle);
    };
  }

  function entryMatchesSearch(entry,matcher){
    if(!matcher) return true;
    for(const key of FIELD_KEYS){
      if(entry[key] && matcher(entry[key])) return true;
    }
    if(Array.isArray(entry.partNumbers)){
      for(const pn of entry.partNumbers){
        if(pn && matcher(pn)) return true;
      }
    }
    if(Array.isArray(entry.partsPairs)){
      for(const pair of entry.partsPairs){
        if(!pair) continue;
        if(pair.part && matcher(pair.part)) return true;
        if(pair.quantity && matcher(pair.quantity)) return true;
      }
    }
    for(const section of NESTED_SECTIONS){
      const container=entry&&entry[section.key];
      if(!container||typeof container!=='object') continue;
      for(const field of section.fields){
        const value=container[field.key];
        if(value && matcher(value)) return true;
      }
    }
    return false;
  }

  function getPartsContainer(source){
    if(source&&typeof source==='object'&&source.Parts&&typeof source.Parts==='object') return source.Parts;
    return source&&typeof source==='object'?source:{};
  }

  function extractPartPairs(source){
    const container=getPartsContainer(source);
    if(Array.isArray(container)){
      const result=[];
      for(let index=0;index<PART_PAIR_COUNT;index+=1){
        const item=container[index]||{};
        const partValue=pickFirstFilled(item.part,item.Part,item.label,item.name);
        const quantityValue=pickFirstFilled(item.quantity,item.Quantity,item.qty,item.Qty,item.menge,item.Menge);
        result.push({part:partValue,quantity:quantityValue});
      }
      return result;
    }
    if(container&&Array.isArray(container.parts)){
      return extractPartPairs(container.parts);
    }
    const result=[];
    for(let index=0;index<PART_PAIR_COUNT;index+=1){
      const partValue=pickFirstFilled(
        container[`Part ${index+1}`],
        container[`Part${index+1}`],
        container[`PN ${index+1}`],
        container[`pn${index+1}`]
      );
      const quantityValue=pickFirstFilled(
        container[`Menge ${index+1}`],
        container[`Menge${index+1}`],
        container[`Qty ${index+1}`],
        container[`qty${index+1}`]
      );
      result.push({part:partValue,quantity:quantityValue});
    }
    return result;
  }

  function applyPartPairs(container,pairs){
    if(!container||typeof container!=='object') return;
    const list=Array.isArray(pairs)?pairs:[];
    for(let index=0;index<PART_PAIR_COUNT;index+=1){
      const pair=list[index]||{};
      const part=cleanString(pair.part);
      const quantity=cleanString(pair.quantity);
      container[`Part ${index+1}`]=part;
      container[`Menge ${index+1}`]=quantity;
      if(Object.prototype.hasOwnProperty.call(container,`Part${index+1}`)) container[`Part${index+1}`]=part;
      if(Object.prototype.hasOwnProperty.call(container,`PN ${index+1}`)) container[`PN ${index+1}`]=part;
      if(Object.prototype.hasOwnProperty.call(container,`pn${index+1}`)) container[`pn${index+1}`]=part;
      if(Object.prototype.hasOwnProperty.call(container,`Menge${index+1}`)) container[`Menge${index+1}`]=quantity;
      if(Object.prototype.hasOwnProperty.call(container,`Qty ${index+1}`)) container[`Qty ${index+1}`]=quantity;
      if(Object.prototype.hasOwnProperty.call(container,`qty${index+1}`)) container[`qty${index+1}`]=quantity;
    }
  }

  function normalizePartsPairs(entry){
    const result=[];
    const fallback=extractPartPairs(entry);
    const arraySource=entry&&Array.isArray(entry.partsPairs)?entry.partsPairs:[];
    for(let index=0;index<PART_PAIR_COUNT;index+=1){
      const candidate=arraySource[index]||{};
      const defaults=fallback[index]||{part:'',quantity:''};
      const partValue=pickFirstFilled(
        candidate.part,
        candidate.Part,
        candidate[`Part ${index+1}`],
        candidate[`part${index+1}`],
        defaults.part
      );
      const quantityValue=pickFirstFilled(
        candidate.quantity,
        candidate.Quantity,
        candidate[`Menge ${index+1}`],
        candidate[`menge${index+1}`],
        defaults.quantity
      );
      result.push({part:partValue,quantity:quantityValue});
    }
    return result;
  }

  function ensureObject(target,key){
    if(!target||typeof target!=='object') return {};
    if(!target[key]||typeof target[key]!=='object') target[key]={};
    return target[key];
  }

  function createEmptyTimes(){
    return {arbeitszeit:'',modZeit:''};
  }

  function createEmptyMods(){
    return {modBezeichnung:'',modKommentar:'',standardAbSN:'',modLink:'',modzeit:''};
  }

  function createEmptyModsList(){
    return [createEmptyMods()];
  }

  function createEmptyFindingTemplate(){
    return {
      partNumber:'',
      label:'',
      findings:'',
      actions:'',
      routineAction:'',
      parts:[],
      times:{}
    };
  }

  function modsHasContent(mod){
    if(!mod||typeof mod!=='object') return false;
    return MODS_FIELD_DEFS.some(field=>cleanString(mod[field.key]));
  }

  function extractFieldValue(sources,variants){
    for(const source of sources){
      if(!source||typeof source!=='object') continue;
      for(const variant of variants){
        if(Object.prototype.hasOwnProperty.call(source,variant)){
          const value=cleanString(source[variant]);
          if(value) return value;
        }
      }
    }
    return '';
  }

  function normalizeTimes(entry){
    const result=createEmptyTimes();
    const sources=[];
    if(entry&&typeof entry==='object'){
      if(entry.times&&typeof entry.times==='object'){
        const candidate=entry.times;
        const normalized={...candidate};
        if(candidate.arbeitszeit!=null&&normalized.Arbeitszeit==null) normalized.Arbeitszeit=candidate.arbeitszeit;
        if(candidate.modzeit!=null&&normalized.ModZeit==null) normalized.ModZeit=candidate.modzeit;
        if(candidate.modZeit!=null&&normalized.ModZeit==null) normalized.ModZeit=candidate.modZeit;
        sources.push(normalized);
      }
      if(entry.Times&&typeof entry.Times==='object') sources.push(entry.Times);
      const flatCandidates={};
      if(entry.timesArbeitszeit!=null) flatCandidates.Arbeitszeit=entry.timesArbeitszeit;
      if(entry.TimesArbeitszeit!=null&&flatCandidates.Arbeitszeit==null) flatCandidates.Arbeitszeit=entry.TimesArbeitszeit;
      if(entry.Arbeitszeit!=null&&flatCandidates.Arbeitszeit==null) flatCandidates.Arbeitszeit=entry.Arbeitszeit;
      if(entry.arbeitszeit!=null&&flatCandidates.Arbeitszeit==null) flatCandidates.Arbeitszeit=entry.arbeitszeit;
      const modZeitCandidate=pickFirstFilled(entry.timesModZeit,entry.TimesModZeit,entry.ModZeit,entry.modZeit,entry.Modzeit,entry.modzeit);
      if(modZeitCandidate) flatCandidates.ModZeit=modZeitCandidate;
      if(Object.keys(flatCandidates).length) sources.push(flatCandidates);
    }
    result.arbeitszeit=extractFieldValue(sources,['Arbeitszeit','arbeitszeit']);
    result.modZeit=extractFieldValue(sources,['ModZeit','modZeit','Modzeit','modzeit']);
    return result;
  }

  function normalizeMods(entry){
    const result=createEmptyMods();
    const sources=[];
    if(entry&&typeof entry==='object'){
      if(entry.Mods&&typeof entry.Mods==='object'&&!Array.isArray(entry.Mods)) sources.push(entry.Mods);
      if(entry.mods&&typeof entry.mods==='object'&&!Array.isArray(entry.mods)) sources.push(entry.mods);
      const flatCandidates={};
      const modBezCandidate=pickFirstFilled(entry.modBezeichnung,entry.ModBezeichnung,entry.modsModBezeichnung,entry.ModsModBezeichnung);
      if(modBezCandidate) flatCandidates.ModBezeichnung=modBezCandidate;
      const modernTitle=pickFirstFilled(entry.title,entry.Title);
      if(modernTitle) flatCandidates.ModBezeichnung=flatCandidates.ModBezeichnung||modernTitle;
      const modKommentarCandidate=pickFirstFilled(entry.modKommentar,entry.ModKommentar,entry.modsModKommentar,entry.ModsModKommentar);
      if(modKommentarCandidate) flatCandidates.ModKommentar=modKommentarCandidate;
      const modernComment=pickFirstFilled(entry.comment,entry.Comment);
      if(modernComment) flatCandidates.ModKommentar=flatCandidates.ModKommentar||modernComment;
      const standardCandidate=pickFirstFilled(entry.standard_ab_sn,entry.Standard_ab_sn,entry.Standard_ab_SN,entry.standard_ab_SN,entry.standardAbSN,entry.StandardAbSN,entry.standardAbSn);
      if(standardCandidate) flatCandidates.Standard_ab_SN=standardCandidate;
      const modernStandard=pickFirstFilled(entry.standardFromSN,entry.StandardFromSN,entry.standardfromsn);
      if(modernStandard) flatCandidates.Standard_ab_SN=flatCandidates.Standard_ab_SN||modernStandard;
      const modLinkCandidate=pickFirstFilled(entry.modLink,entry.ModLink,entry.modsModLink,entry.ModsModLink,entry.Link,entry.link);
      if(modLinkCandidate) flatCandidates.ModLink=modLinkCandidate;
      const modernLink=pickFirstFilled(entry.link,entry.LinkUrl);
      if(modernLink) flatCandidates.ModLink=flatCandidates.ModLink||modernLink;
      const modzeitCandidate=pickFirstFilled(entry.modzeit,entry.Modzeit,entry.ModZeit,entry.modsModzeit,entry.ModsModzeit);
      if(modzeitCandidate) flatCandidates.Modzeit=modzeitCandidate;
      const modernTime=pickFirstFilled(entry.time,entry.Time);
      if(modernTime) flatCandidates.Modzeit=flatCandidates.Modzeit||modernTime;
      if(Object.keys(flatCandidates).length) sources.push(flatCandidates);
    }
    result.modBezeichnung=extractFieldValue(sources,['ModBezeichnung','modBezeichnung','Modbezeichnung','modbezeichnung']);
    result.modKommentar=extractFieldValue(sources,['ModKommentar','modKommentar','Modkommentar','modkommentar','Kommentar','comment']);
    result.standardAbSN=extractFieldValue(sources,['Standard_ab_SN','standard_ab_sn','StandardAbSN','standardAbSN','Standard_ab_sn','standardAbSn']);
    result.modLink=extractFieldValue(sources,['ModLink','modLink','Link','link']);
    result.modzeit=extractFieldValue(sources,['Modzeit','modzeit','ModZeit','modZeit']);
    return result;
  }

  function normalizeModsList(entry){
    const list=[];
    if(entry&&typeof entry==='object'){
      const prioritizedSources=[
        Array.isArray(entry.ModsList)?entry.ModsList:null,
        Array.isArray(entry.modsList)?entry.modsList:null,
        Array.isArray(entry.Mods)&&entry.Mods.every(item=>item&&typeof item==='object')?entry.Mods:null,
        Array.isArray(entry.mods)&&entry.mods.every(item=>item&&typeof item==='object')?entry.mods:null
      ];
      for(const source of prioritizedSources){
        if(!source||!source.length) continue;
        for(const item of source){
          if(!item||typeof item!=='object') continue;
          const normalized=normalizeMods(item);
          if(modsHasContent(normalized)||!list.length) list.push(normalized);
        }
        if(list.length) break;
      }
    }
    const primary=normalizeMods(entry);
    if(!list.length){
      list.push(primary);
    }else if(modsHasContent(primary)){
      const primarySignature=JSON.stringify(primary);
      const existingMatch=list.some(item=>JSON.stringify(item)===primarySignature);
      if(!existingMatch) list.unshift(primary);
    }
    if(!list.length) list.push(createEmptyMods());
    return list;
  }

  function buildExternalSyncEntry(entry){
    if(!entry||typeof entry!=='object') return null;
    const partsPairs=normalizePartsPairs(entry).filter(pair=>cleanString(pair.part));
    const partNumbers=getCleanPartNumbers(entry);
    const times=normalizeTimes(entry);
    const modsList=normalizeModsList(entry);
    return {
      label:cleanString(entry.label),
      findings:cleanString(entry.findings),
      actions:cleanString(entry.actions),
      routineAction:cleanString(entry.routineAction),
      nonroutine:cleanString(entry.nonroutine),
      partsPairs,
      partNumbers,
      times,
      modsList
    };
  }

  function applyTimesSection(target,times){
    if(!target||typeof target!=='object') return;
    const data=times&&typeof times==='object'?times:createEmptyTimes();
    const container=ensureObject(target,'Times');
    container.Arbeitszeit=data.arbeitszeit||'';
    if(Object.prototype.hasOwnProperty.call(container,'arbeitszeit')) container.arbeitszeit=data.arbeitszeit||'';
    container.ModZeit=data.modZeit||'';
    if(Object.prototype.hasOwnProperty.call(container,'Modzeit')) container.Modzeit=data.modZeit||'';
    if(Object.prototype.hasOwnProperty.call(container,'modZeit')) container.modZeit=data.modZeit||'';
    if(Object.prototype.hasOwnProperty.call(container,'modzeit')) container.modzeit=data.modZeit||'';
    if(Object.prototype.hasOwnProperty.call(target,'Arbeitszeit')) target.Arbeitszeit=data.arbeitszeit||'';
    if(Object.prototype.hasOwnProperty.call(target,'arbeitszeit')) target.arbeitszeit=data.arbeitszeit||'';
    if(Object.prototype.hasOwnProperty.call(target,'ModZeit')) target.ModZeit=data.modZeit||'';
    if(Object.prototype.hasOwnProperty.call(target,'modZeit')) target.modZeit=data.modZeit||'';
    if(Object.prototype.hasOwnProperty.call(target,'Modzeit')) target.Modzeit=data.modZeit||'';
    if(Object.prototype.hasOwnProperty.call(target,'modzeit')) target.modzeit=data.modZeit||'';
  }

  function createModExportObject(data){
    const normalized=data&&typeof data==='object'?data:createEmptyMods();
    const exported={
      ModBezeichnung:normalized.modBezeichnung||'',
      ModKommentar:normalized.modKommentar||'',
      Standard_ab_SN:normalized.standardAbSN||'',
      ModLink:normalized.modLink||'',
      Modzeit:normalized.modzeit||''
    };
    exported.modBezeichnung=exported.ModBezeichnung;
    exported.modKommentar=exported.ModKommentar;
    exported.standard_ab_sn=exported.Standard_ab_SN;
    exported.StandardAbSN=exported.Standard_ab_SN;
    exported.standardAbSN=exported.Standard_ab_SN;
    exported.standardAbSn=exported.Standard_ab_SN;
    exported.modLink=exported.ModLink;
    exported.ModLink=exported.ModLink;
    exported.modZeit=exported.Modzeit;
    exported.ModZeit=exported.Modzeit;
    exported.modzeit=exported.Modzeit;
    return exported;
  }

  function applyModsSection(target,mods){
    if(!target||typeof target!=='object') return;
    let list=[];
    if(Array.isArray(mods)){
      list=mods;
    }else if(mods&&typeof mods==='object'){
      if(Array.isArray(mods.modsList)) list=mods.modsList;
      else if(Array.isArray(mods.ModsList)) list=mods.ModsList;
      else list=[mods];
    }
    if(!list.length) list=createEmptyModsList();
    const normalizedList=list.map(item=>normalizeMods(item));
    const primary=normalizedList[0]||createEmptyMods();
    const container=ensureObject(target,'Mods');
    container.ModBezeichnung=primary.modBezeichnung||'';
    if(Object.prototype.hasOwnProperty.call(container,'modBezeichnung')) container.modBezeichnung=primary.modBezeichnung||'';
    container.ModKommentar=primary.modKommentar||'';
    if(Object.prototype.hasOwnProperty.call(container,'modKommentar')) container.modKommentar=primary.modKommentar||'';
    container.Standard_ab_SN=primary.standardAbSN||'';
    if(Object.prototype.hasOwnProperty.call(container,'standard_ab_sn')) container.standard_ab_sn=primary.standardAbSN||'';
    if(Object.prototype.hasOwnProperty.call(container,'StandardAbSN')) container.StandardAbSN=primary.standardAbSN||'';
    container.ModLink=primary.modLink||'';
    if(Object.prototype.hasOwnProperty.call(container,'modLink')) container.modLink=primary.modLink||'';
    container.Modzeit=primary.modzeit||'';
    if(Object.prototype.hasOwnProperty.call(container,'ModZeit')) container.ModZeit=primary.modzeit||'';
    if(Object.prototype.hasOwnProperty.call(container,'modZeit')) container.modZeit=primary.modzeit||'';
    if(Object.prototype.hasOwnProperty.call(container,'modzeit')) container.modzeit=primary.modzeit||'';
    if(Object.prototype.hasOwnProperty.call(target,'ModBezeichnung')) target.ModBezeichnung=primary.modBezeichnung||'';
    if(Object.prototype.hasOwnProperty.call(target,'modBezeichnung')) target.modBezeichnung=primary.modBezeichnung||'';
    if(Object.prototype.hasOwnProperty.call(target,'ModKommentar')) target.ModKommentar=primary.modKommentar||'';
    if(Object.prototype.hasOwnProperty.call(target,'modKommentar')) target.modKommentar=primary.modKommentar||'';
    if(Object.prototype.hasOwnProperty.call(target,'Standard_ab_SN')) target.Standard_ab_SN=primary.standardAbSN||'';
    if(Object.prototype.hasOwnProperty.call(target,'standard_ab_sn')) target.standard_ab_sn=primary.standardAbSN||'';
    if(Object.prototype.hasOwnProperty.call(target,'StandardAbSN')) target.StandardAbSN=primary.standardAbSN||'';
    if(Object.prototype.hasOwnProperty.call(target,'standardAbSN')) target.standardAbSN=primary.standardAbSN||'';
    if(Object.prototype.hasOwnProperty.call(target,'ModLink')) target.ModLink=primary.modLink||'';
    if(Object.prototype.hasOwnProperty.call(target,'modLink')) target.modLink=primary.modLink||'';
    if(Object.prototype.hasOwnProperty.call(target,'Modzeit')) target.Modzeit=primary.modzeit||'';
    if(Object.prototype.hasOwnProperty.call(target,'modzeit')) target.modzeit=primary.modzeit||'';
    if(Object.prototype.hasOwnProperty.call(target,'ModZeit')) target.ModZeit=primary.modzeit||'';
    if(Object.prototype.hasOwnProperty.call(target,'modZeit')) target.modZeit=primary.modzeit||'';
    if(normalizedList.length>1||modsHasContent(primary)){
      const exported=normalizedList.map(item=>createModExportObject(item));
      target.ModsList=exported.map(item=>({...item}));
      target.modsList=exported.map(item=>({...item}));
    }else{
      if(Object.prototype.hasOwnProperty.call(target,'ModsList')) delete target.ModsList;
      if(Object.prototype.hasOwnProperty.call(target,'modsList')) delete target.modsList;
    }
  }

  function normalizePartNumbers(entry){
    const seen=new Set();
    const addValue=value=>{
      if(value==null) return;
      if(Array.isArray(value)){
        value.forEach(addValue);
        return;
      }
      if(typeof value==='string'&&/[;,|]/.test(value)){
        value.split(/[;,|]/).forEach(part=>addValue(part));
        return;
      }
      const cleaned=cleanString(value);
      if(!cleaned) return;
      if(!seen.has(cleaned)) seen.add(cleaned);
    };
    if(entry&&typeof entry==='object'){
      addValue(entry.partNumbers);
      addValue(entry.PartNumbers);
      addValue(entry.part_numbers);
      addValue(entry.partNumber);
      addValue(entry.PartNumber);
      addValue(entry.appliesTo);
      addValue(entry.partNo);
      addValue(entry.PartNo);
      addValue(entry.PN);
      addValue(entry.pn);
      addValue(entry.Part);
      addValue(entry.part);
      if(entry.parts&&typeof entry.parts==='object'){
        addValue(entry.parts.partNumbers);
        addValue(entry.parts.PartNumbers);
        addValue(entry.parts.partNumber);
        addValue(entry.parts.PartNumber);
        addValue(entry.parts.PN);
        addValue(entry.parts.pn);
      }
      if(entry.Parts&&typeof entry.Parts==='object'){
        addValue(entry.Parts.partNumbers);
        addValue(entry.Parts.PartNumbers);
        addValue(entry.Parts.partNumber);
        addValue(entry.Parts.PartNumber);
        addValue(entry.Parts.PN);
        addValue(entry.Parts.pn);
      }
    }
    return Array.from(seen);
  }

  function ensureArray(value){
    return Array.isArray(value)?value:[];
  }

  function getCleanPartNumbers(entry){
    const numbers=ensureArray(entry&&entry.partNumbers).map(item=>cleanString(item));
    return numbers.filter((value,index)=>value&&numbers.indexOf(value)===index);
  }

  function getPrimaryPartNumber(entry){
    const numbers=getCleanPartNumbers(entry);
    return numbers[0]||'';
  }

  function getStructureSortValue(entry,key){
    if(!entry) return '';
    switch(key){
      case 'primaryPartNumber':
        return cleanString(getPrimaryPartNumber(entry));
      case 'label':
      case 'id':
      case 'actions':
      case 'routineAction':
      case 'nonroutine':
      case 'findings':
      case 'parts':
        return cleanString(entry[key]);
      default:
        return '';
    }
  }

  function arraysEqual(a,b){
    if(a===b) return true;
    if(!Array.isArray(a)||!Array.isArray(b)) return false;
    if(a.length!==b.length) return false;
    for(let i=0;i<a.length;i+=1){
      if(a[i]!==b[i]) return false;
    }
    return true;
  }

  function normalizeEntry(entry){
    const normalized={id:entry&&entry.id?String(entry.id):ensureId()};
    for(const key of FIELD_KEYS){
      let value=entry?entry[key]:'';
      if(key==='routineAction'){
        value=entry&&entry.routineAction!=null?entry.routineAction:resolveRoutineAction(entry,entry&&entry.Routine);
      }
      if(key==='nonroutine'){
        if(entry){
          value=entry.nonroutine!=null?entry.nonroutine:entry.nonRoutineFinding;
          if(value==null&&entry.NonRoutine&&typeof entry.NonRoutine==='object'){
            value=entry.NonRoutine.NonRoutineFinding!=null?entry.NonRoutine.NonRoutineFinding:value;
          }
        }
      }
      if(key==='parts'&&Array.isArray(entry&&entry.parts)){
        value='';
      }
      normalized[key]=cleanString(value);
    }
    const partNumbers=normalizePartNumbers(entry);
    const primaryPart=cleanString(pickFirstFilled(
      entry&&entry.part,
      entry&&entry.Part,
      entry&&entry.partNumber,
      entry&&entry.PartNumber
    ));
    if(primaryPart && !partNumbers.includes(primaryPart)) partNumbers.unshift(primaryPart);
    normalized.partNumbers=partNumbers;
    normalized.partsPairs=normalizePartsPairs(entry);
    normalized.times=normalizeTimes(entry);
    normalized.modsList=normalizeModsList(entry);
    normalized.mods=normalized.modsList[0]||createEmptyMods();
    return normalized;
  }

  function stripNonRoutineFindingPrefix(value){
    const text=cleanString(value);
    if(!text) return '';
    const normalized=text.replace(/^NonRoutineFinding:\s*/i,'');
    return cleanString(normalized);
  }

  function resolveRoutineAction(entry,routineContainer){
    const container=routineContainer&&typeof routineContainer==='object'?routineContainer:null;
    const source=entry&&typeof entry==='object'?entry:null;
    const values=[];
    if(source){
      values.push(source.routineAction,source.RoutineAction);
    }
    if(container){
      values.push(
        container.RoutineAction,
        container.routineAction,
        container.RoutineFinding,
        container.routineFinding
      );
    }
    if(source){
      values.push(
        source.RoutineFinding,
        source.routineFinding,
        source.Routine,
        source.routine
      );
    }else if(entry!=null){
      values.push(entry);
    }
    return pickFirstFilled(...values);
  }

  function buildCopyText(entry){
    const parts=[];
    const findings=cleanString(entry.findings);
    if(findings) parts.push(`Findings: ${findings}`);
    const actions=cleanString(entry.actions);
    if(actions) parts.push(`Actions: ${actions}`);
    const routineAction=cleanString(entry.routineAction);
    if(routineAction) parts.push(`KV-Actions: ${routineAction}`);
    const nonroutine=stripNonRoutineFindingPrefix(entry.nonroutine);
    if(nonroutine) parts.push(`Nonroutine: ${nonroutine}`);

    const bestellText=cleanString(entry.parts);
    const pairLines=[];
    if(entry.partsPairs&&entry.partsPairs.length){
      entry.partsPairs.forEach(pair=>{
        if(!pair) return;
        const partValue=cleanString(pair.part);
        const quantityValue=cleanString(pair.quantity);
        if(!partValue&& !quantityValue) return;
        const left=partValue||'–';
        const right=quantityValue?`Menge (${quantityValue})`:'';
        pairLines.push(right?`${left} | ${right}`:left);
      });
    }
    const hasBestellContent=bestellText||pairLines.length;
    if(hasBestellContent){
      const lines=['Bestelltext'];
      const details=[];
      if(bestellText) details.push(bestellText);
      if(pairLines.length) details.push(...pairLines);
      if(details.length){
        lines.push('');
        lines.push(...details);
      }
      parts.push(lines.join('\n'));
    }
    const timesData=normalizeTimes(entry);
    const timeLines=[];
    for(const field of TIMES_FIELD_DEFS){
      const value=cleanString(timesData[field.key]);
      if(value) timeLines.push(`${field.copyLabel||field.label}: ${value}`);
    }
    if(timeLines.length){
      parts.push(['Times','',...timeLines].join('\n'));
    }
    const modsList=normalizeModsList(entry);
    modsList.forEach((modsData,index)=>{
      const modLines=[];
      for(const field of MODS_FIELD_DEFS){
        const value=cleanString(modsData[field.key]);
        if(value) modLines.push(`${field.copyLabel||field.label}: ${value}`);
      }
      if(modLines.length){
        const heading=modsList.length>1?`Mods ${index+1}`:'Mods';
        parts.push([heading,'',...modLines].join('\n'));
      }
    });
    return parts.join('\n\n');
  }

  async function readFileHandle(handle){
    if(!handle||typeof handle.getFile!=='function') return null;
    try{
      const file=await handle.getFile();
      const text=await file.text();
      return text;
    }catch(err){
      console.warn('Konnte Datei nicht lesen',err);
      return null;
    }
  }

  async function writeFileHandle(handle,contents){
    if(!handle||typeof handle.createWritable!=='function') return false;
    try{
      const writable=await handle.createWritable();
      await writable.write(contents);
      await writable.close();
      return true;
    }catch(err){
      console.warn('Konnte Datei nicht speichern',err);
      throw err;
    }
  }

  class SuggestionsController{
    constructor(container,values,getValue,setValue,focusTarget){
      this.container=container;
      this.values=values;
      this.getValue=getValue;
      this.setValue=setValue;
      this.focusTarget=focusTarget||container;
      this.element=document.createElement('div');
      this.element.className='sfe-suggestions';
      container.appendChild(this.element);
      this.items=[];
      this.isFocused=false;
      this.attach();
    }
    attach(){
      if(!this.focusTarget) return;
      this.focusTarget.addEventListener('focus',()=>{
        this.isFocused=true;
        this.update();
      });
      this.focusTarget.addEventListener('blur',()=>{
        this.isFocused=false;
        setTimeout(()=>this.hide(),120);
      });
      this.focusTarget.addEventListener('input',()=>this.update());
    }
    setValues(values){
      this.values=values;
      this.update();
    }
    update(){
      if(!this.isFocused){
        this.hide();
        return;
      }
      const current=cleanString(this.getValue());
      if(!current){
        this.hide();
        return;
      }
      const lower=current.toLowerCase();
      const matches=[];
      for(const value of this.values){
        if(!value) continue;
        if(value.toLowerCase().includes(lower)) matches.push(value);
        if(matches.length>=8) break;
      }
      if(!matches.length){
        this.hide();
        return;
      }
      this.render(matches,lower);
    }
    render(matches,term){
      this.element.innerHTML='';
      for(const match of matches){
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='sfe-suggestion';
        btn.textContent=match;
        btn.addEventListener('mousedown',e=>{e.preventDefault();this.setValue(match);this.hide();});
        this.element.appendChild(btn);
      }
      this.container.classList.add('show-suggestions');
    }
    hide(){
      this.container.classList.remove('show-suggestions');
    }
  }

  class ShopguideFindingsEditor{
    constructor(root){
      this.root=root;
      this.fileHandle=window[GLOBAL_HANDLE_KEY]||null;
      const storedPath=window[GLOBAL_PATH_VAR]||localStorage.getItem(GLOBAL_PATH_STORAGE_KEY)||localStorage.getItem(PATH_KEY)||DEFAULT_FILE;
      this.filePath=normalizeStoredPath(storedPath);
      this.hasWriteAccess=false;
      this.data=[];
      this.filtered=[];
      this.selectedId=null;
      this.pendingEditTarget=null;
      this.activeEditTarget=null;
      this.undoStack=[];
      this.redoStack=[];
      this.dirty=false;
      this.autosaveTimer=null;
      this.statusEl=null;
      this.listEl=null;
      this.listHeaderEl=null;
      this.editorEl=null;
      this.searchInput=null;
      this.undoBtn=null;
      this.redoBtn=null;
      this.saveBtn=null;
      this.fileInfoEl=null;
      this.copyBtn=null;
      this.errorEl=null;
      this.titleEl=null;
      this.activeFieldControllers={};
      this.contextMenu=null;
      this.pendingSave=false;
      this.onWindowClick=null;
      this.onWindowResize=null;
      this.onKeyDown=null;
      this.activeHistorySignature=null;
      this.sourceFormat='new-schema';
      this.migrationWarnings=[];
      this.structureSortSettings=STRUCTURE_SORT_FIELDS.map((field,index)=>({
        key:field.key,
        label:field.label,
        enabled:index<2
      }));
      if(!this.structureSortSettings.some(setting=>setting.enabled)&&this.structureSortSettings.length){
        this.structureSortSettings[0].enabled=true;
      }
      this.structureSortOrder='asc';
      this.structureTreeEl=null;
      this.sortListEl=null;
      this.sortOrderSelect=null;
      this.structureFileInfoEl=null;
      this.previousActiveElement=null;
      this.updateStoredPath(this.filePath);
      this.init();
    }

    init(){
      injectStyles();
      this.root.innerHTML='';
      this.root.classList.add('sfe-root');
      const module=document.createElement('div');
      module.className='sfe-module';
      module.innerHTML=`
        <div class="sfe-header">
          <div class="sfe-search-wrap">
            <input type="search" class="sfe-search" placeholder="Findings durchsuchen..." aria-label="Findings durchsuchen" />
          </div>
          <div class="sfe-actions">
            <button type="button" class="sfe-btn sfe-undo" disabled title="Rückgängig"><span>↺</span> Rückgängig</button>
            <button type="button" class="sfe-btn sfe-redo" disabled title="Wiederholen"><span>↻</span> Wiederholen</button>
            <button type="button" class="sfe-btn sfe-add" title="Neues Finding">+ Neues Finding</button>
            <button type="button" class="sfe-btn sfe-save" title="Jetzt speichern">💾 Speichern</button>
            <div class="sfe-status" aria-live="polite">Bereit</div>
          </div>
        </div>
        <div class="sfe-body">
          <div class="sfe-list">
            <div class="sfe-list-header">
              <div><span class="sfe-list-count">0</span> Einträge</div>
              <div class="sfe-file-info"></div>
              <div class="sfe-warning" role="status"></div>
              <div class="sfe-error" role="status"></div>
            </div>
            <div class="sfe-results"></div>
          </div>
          <div class="sfe-editor">
            <div class="sfe-editor-empty sfe-empty">Wähle ein Finding aus oder erstelle ein neues.</div>
          </div>
        </div>
      `;
      this.root.appendChild(module);
      this.searchInput=module.querySelector('.sfe-search');
      this.undoBtn=module.querySelector('.sfe-undo');
      this.redoBtn=module.querySelector('.sfe-redo');
      this.saveBtn=module.querySelector('.sfe-save');
      this.listEl=module.querySelector('.sfe-results');
      this.listHeaderEl=module.querySelector('.sfe-list-count');
      this.editorEl=module.querySelector('.sfe-editor');
      this.statusEl=module.querySelector('.sfe-status');
      this.fileInfoEl=module.querySelector('.sfe-file-info');
      this.warningEl=module.querySelector('.sfe-warning');
      this.errorEl=module.querySelector('.sfe-error');

      this.setupContextMenu(module);

      module.querySelector('.sfe-add').addEventListener('click',()=>this.createEntry());
      this.undoBtn.addEventListener('click',()=>this.undo());
      this.redoBtn.addEventListener('click',()=>this.redo());
      this.saveBtn.addEventListener('click',()=>this.saveNow(true));
      this.searchInput.addEventListener('input',()=>this.applySearch());
      const refreshHighlight=()=>this.renderWithCurrentSearchTerm();
      this.searchInput.addEventListener('focus',refreshHighlight);
      this.searchInput.addEventListener('blur',refreshHighlight);

      this.autosaveTimer=setInterval(()=>this.saveNow(false),AUTOSAVE_INTERVAL);

      this.renderFileInfo();
      this.renderMigrationWarnings();
      this.loadInitialData();
    }

    setupContextMenu(module){
      const overlay=document.createElement('div');
      overlay.className='sfe-structure-overlay';
      overlay.setAttribute('aria-hidden','true');
      const modal=document.createElement('div');
      modal.className='sfe-structure-modal';
      overlay.appendChild(modal);

      const header=document.createElement('div');
      header.className='sfe-structure-header';
      const title=document.createElement('div');
      title.className='sfe-structure-title';
      title.textContent='Dateistruktur & Sortierung';
      header.appendChild(title);
      const closeBtn=document.createElement('button');
      closeBtn.type='button';
      closeBtn.className='sfe-modal-close';
      closeBtn.setAttribute('aria-label','Modal schließen');
      closeBtn.textContent='×';
      closeBtn.addEventListener('click',()=>this.hideContextMenu());
      header.appendChild(closeBtn);
      modal.appendChild(header);

      const controls=document.createElement('div');
      controls.className='sfe-structure-controls';
      const description=document.createElement('p');
      description.className='sfe-structure-description';
      description.textContent='Aktiviere Sortierkriterien und ordne sie per Pfeil-Buttons, um die Findings-Dateienstruktur individuell zu sortieren.';
      controls.appendChild(description);
      const orderRow=document.createElement('div');
      orderRow.className='sfe-sort-order';
      const orderLabel=document.createElement('label');
      orderLabel.textContent='Reihenfolge:';
      const orderSelect=document.createElement('select');
      const ascOption=document.createElement('option');
      ascOption.value='asc';
      ascOption.textContent='Aufsteigend';
      const descOption=document.createElement('option');
      descOption.value='desc';
      descOption.textContent='Absteigend';
      orderSelect.appendChild(ascOption);
      orderSelect.appendChild(descOption);
      orderSelect.value=this.structureSortOrder;
      orderSelect.addEventListener('change',()=>{
        this.structureSortOrder=orderSelect.value;
        this.renderStructureTree();
      });
      orderLabel.appendChild(orderSelect);
      orderRow.appendChild(orderLabel);
      controls.appendChild(orderRow);
      const sortList=document.createElement('div');
      sortList.className='sfe-sort-list';
      controls.appendChild(sortList);
      modal.appendChild(controls);

      const body=document.createElement('div');
      body.className='sfe-structure-body';
      const tree=document.createElement('div');
      tree.className='sfe-structure-tree';
      body.appendChild(tree);
      modal.appendChild(body);

      const footer=document.createElement('div');
      footer.className='sfe-structure-footer';
      const fileInfo=document.createElement('div');
      fileInfo.className='sfe-structure-file';
      footer.appendChild(fileInfo);
      const chooseBtn=document.createElement('button');
      chooseBtn.type='button';
      chooseBtn.className='sfe-btn sfe-modal-action';
      chooseBtn.textContent='Findings-Datei wählen';
      chooseBtn.addEventListener('click',()=>{this.hideContextMenu();this.chooseFile();});
      footer.appendChild(chooseBtn);
      modal.appendChild(footer);

      overlay.addEventListener('click',event=>{
        if(event.target===overlay) this.hideContextMenu();
      });
      document.body.appendChild(overlay);

      this.contextMenu=overlay;
      this.sortListEl=sortList;
      this.sortOrderSelect=orderSelect;
      this.structureTreeEl=tree;
      this.structureFileInfoEl=fileInfo;

      module.addEventListener('contextmenu',event=>{
        event.preventDefault();
        this.showContextMenu();
      });
      this.onWindowResize=()=>this.hideContextMenu();
      window.addEventListener('resize',this.onWindowResize);
      this.onKeyDown=event=>{
        if(event.key==='Escape'||event.key==='Esc') this.hideContextMenu();
      };
      window.addEventListener('keydown',this.onKeyDown);

      this.renderSortConfig();
      this.updateStructureFileInfo();
      this.renderStructureTree();
    }

    showContextMenu(){
      if(!this.contextMenu) return;
      this.renderSortConfig();
      this.updateStructureFileInfo();
      this.renderStructureTree();
      this.previousActiveElement=document.activeElement;
      this.contextMenu.classList.add('open');
      this.contextMenu.setAttribute('aria-hidden','false');
      if(this.sortOrderSelect) this.sortOrderSelect.value=this.structureSortOrder;
      const focusTarget=this.contextMenu.querySelector('.sfe-modal-close');
      if(focusTarget) focusTarget.focus();
    }

    hideContextMenu(){
      if(this.contextMenu){
        this.contextMenu.classList.remove('open');
        this.contextMenu.setAttribute('aria-hidden','true');
      }
      if(this.previousActiveElement&&typeof this.previousActiveElement.focus==='function'){
        this.previousActiveElement.focus();
      }
      this.previousActiveElement=null;
    }

    renderSortConfig(){
      if(!this.sortListEl) return;
      this.sortListEl.innerHTML='';
      this.structureSortSettings.forEach((item,index)=>{
        const row=document.createElement('div');
        row.className='sfe-sort-row'+(item.enabled?'':' sfe-sort-row-disabled');
        const info=document.createElement('div');
        info.className='sfe-sort-row-info';
        const label=document.createElement('label');
        label.className='sfe-sort-row-label';
        const checkbox=document.createElement('input');
        checkbox.type='checkbox';
        checkbox.checked=item.enabled;
        checkbox.addEventListener('change',()=>this.toggleSortField(item.key,checkbox.checked));
        label.appendChild(checkbox);
        const badge=document.createElement('span');
        badge.className='sfe-sort-row-index';
        badge.textContent=`${index+1}.`;
        label.appendChild(badge);
        const text=document.createElement('span');
        text.textContent=item.label;
        label.appendChild(text);
        info.appendChild(label);
        row.appendChild(info);
        const controls=document.createElement('div');
        controls.className='sfe-sort-row-controls';
        const upBtn=this.createSortMoveButton('↑','Nach oben verschieben',index===0,()=>this.moveSortField(index,-1));
        const downBtn=this.createSortMoveButton('↓','Nach unten verschieben',index===this.structureSortSettings.length-1,()=>this.moveSortField(index,1));
        controls.appendChild(upBtn);
        controls.appendChild(downBtn);
        row.appendChild(controls);
        this.sortListEl.appendChild(row);
      });
      if(this.sortOrderSelect) this.sortOrderSelect.value=this.structureSortOrder;
    }

    createSortMoveButton(symbol,label,disabled,handler){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='sfe-icon-btn';
      btn.textContent=symbol;
      btn.setAttribute('aria-label',label);
      btn.disabled=disabled;
      if(!disabled){
        btn.addEventListener('click',handler);
      }
      return btn;
    }

    toggleSortField(key,enabled){
      const item=this.structureSortSettings.find(setting=>setting.key===key);
      if(!item) return;
      item.enabled=enabled;
      if(!this.structureSortSettings.some(setting=>setting.enabled)){
        item.enabled=true;
      }
      this.renderSortConfig();
      this.renderStructureTree();
    }

    moveSortField(index,offset){
      const target=index+offset;
      if(target<0||target>=this.structureSortSettings.length) return;
      const [item]=this.structureSortSettings.splice(index,1);
      this.structureSortSettings.splice(target,0,item);
      this.renderSortConfig();
      this.renderStructureTree();
    }

    getActiveSortFields(){
      const keys=this.structureSortSettings.filter(item=>item.enabled).map(item=>item.key);
      if(!keys.includes('id')) keys.push('id');
      return keys;
    }

    renderStructureTree(){
      if(!this.structureTreeEl) return;
      this.structureTreeEl.innerHTML='';
      if(!Array.isArray(this.data)||!this.data.length){
        const empty=document.createElement('div');
        empty.className='sfe-structure-empty';
        empty.textContent='Keine Findings geladen.';
        this.structureTreeEl.appendChild(empty);
        return;
      }
      const entries=[...this.data];
      const direction=this.structureSortOrder==='desc'?-1:1;
      const sortKeys=this.getActiveSortFields();
      entries.sort((a,b)=>{
        for(const key of sortKeys){
          const valueA=getStructureSortValue(a,key);
          const valueB=getStructureSortValue(b,key);
          if(valueA===valueB) continue;
          return valueA.localeCompare(valueB,'de',{numeric:true,sensitivity:'base'})*direction;
        }
        const idA=cleanString(a.id);
        const idB=cleanString(b.id);
        return idA.localeCompare(idB,'de',{numeric:true,sensitivity:'base'})*direction;
      });
      entries.forEach((entry,index)=>{
        const details=document.createElement('details');
        details.className='sfe-structure-item';
        if(index===0) details.open=true;
        const summary=document.createElement('summary');
        summary.className='sfe-structure-summary';
        const title=document.createElement('div');
        title.className='sfe-structure-summary-title';
        title.textContent=cleanString(entry.label)||'Ohne Label';
        summary.appendChild(title);
        const meta=document.createElement('div');
        meta.className='sfe-structure-summary-meta';
        const parts=getCleanPartNumbers(entry);
        meta.textContent=parts.length?parts.join(', '):'Keine Partnummer';
        summary.appendChild(meta);
        details.appendChild(summary);
        const content=document.createElement('div');
        content.className='sfe-structure-content';
        content.appendChild(this.buildStructureField('ID',entry.id));
        content.appendChild(this.buildStructureField('Label',entry.label));
        content.appendChild(this.buildStructureField('Partnummern',parts));
        content.appendChild(this.buildStructureField('Findings',entry.findings,{preserveFormatting:true}));
        content.appendChild(this.buildStructureField('Aktionen',entry.actions,{preserveFormatting:true}));
        content.appendChild(this.buildStructureField('Routine',entry.routineAction,{preserveFormatting:true}));
        content.appendChild(this.buildStructureField('Nonroutine',entry.nonroutine,{preserveFormatting:true}));
        content.appendChild(this.buildStructureField('Bestelltext',entry.parts,{preserveFormatting:true}));
        const pairs=this.ensurePartsPairs(entry).filter(pair=>cleanString(pair.part)||cleanString(pair.quantity));
        if(pairs.length){
          const lines=pairs.map((pair,idx)=>{
            const part=cleanString(pair.part)||'–';
            const qty=cleanString(pair.quantity)||'–';
            return `${idx+1}. ${part} (Menge: ${qty})`;
          }).join('\n');
          content.appendChild(this.buildStructureField('Bestellteile',lines,{preserveFormatting:true}));
        }
        const times=normalizeTimes(entry);
        const timeLines=TIMES_FIELD_DEFS.map(def=>{
          const value=cleanString(times[def.key]);
          return value?`${def.label}: ${value}`:null;
        }).filter(Boolean);
        if(timeLines.length){
          content.appendChild(this.buildStructureField('Times',timeLines.join('\n'),{preserveFormatting:true}));
        }
        const modsList=normalizeModsList(entry);
        const modLines=[];
        modsList.forEach((mod,modIndex)=>{
          const fields=MODS_FIELD_DEFS.map(def=>{
            const value=cleanString(mod[def.key]);
            return value?`${def.label}: ${value}`:null;
          }).filter(Boolean);
          if(!fields.length) return;
          const heading=modsList.length>1?`Mod ${modIndex+1}`:'Mod';
          modLines.push(heading);
          fields.forEach(line=>modLines.push(`  ${line}`));
        });
        if(modLines.length){
          content.appendChild(this.buildStructureField('Mods',modLines.join('\n'),{preserveFormatting:true}));
        }
        details.appendChild(content);
        this.structureTreeEl.appendChild(details);
      });
    }

    buildStructureField(label,value,{preserveFormatting=false}={}){
      const field=document.createElement('div');
      field.className='sfe-structure-field';
      const name=document.createElement('div');
      name.className='sfe-structure-field-label';
      name.textContent=label;
      field.appendChild(name);
      const content=document.createElement('div');
      content.className='sfe-structure-field-value';
      if(Array.isArray(value)){
        const cleaned=value.map(item=>cleanString(item)).filter(Boolean);
        content.textContent=cleaned.length?cleaned.join(', '):'–';
      }else if(preserveFormatting){
        const raw=value==null?'':String(value);
        content.textContent=/\S/.test(raw)?raw:'–';
      }else{
        const text=cleanString(value);
        content.textContent=text||'–';
      }
      field.appendChild(content);
      return field;
    }

    updateStructureFileInfo(){
      if(!this.structureFileInfoEl) return;
      const path=this.filePath||DEFAULT_FILE;
      const entryCount=Array.isArray(this.data)?this.data.length:0;
      const mode=this.fileHandle?(this.hasWriteAccess?'Schreibzugriff aktiv':'Lesemodus (kein Schreibrecht)'):'Lesemodus';
      this.structureFileInfoEl.textContent=`Quelle: ${path}\nEinträge: ${entryCount}\nModus: ${mode}`;
    }

    refreshStructureView(){
      if(!this.contextMenu||!this.contextMenu.classList.contains('open')) return;
      this.updateStructureFileInfo();
      this.renderStructureTree();
    }

    async detachHandle(){
      this.fileHandle=null;
      this.hasWriteAccess=false;
      try{
        window[GLOBAL_HANDLE_KEY]=null;
      }catch(err){
        /* ignore */
      }
      await clearPersistedHandle();
      this.renderFileInfo();
    }

    async chooseFile(){
      if(window.showOpenFilePicker){
        try{
          const [handle]=await window.showOpenFilePicker({
            multiple:false,
            suggestedStartLocation:'documents',
            types:[{
              description:'JSON-Datei',
              accept:{'application/json':['.json']}
            }]
          });
          if(handle){
            let hasWrite=await ensureReadWritePermission(handle,true);
            let hasRead=hasWrite;
            if(!hasRead){
              hasRead=await ensureReadPermission(handle,true);
            }
            if(!hasRead){
              this.status('Zugriff verweigert');
              this.showError('Datei konnte nicht geladen werden. Berechtigung erforderlich.');
              this.renderFileInfo();
              return;
            }
            this.fileHandle=handle;
            window[GLOBAL_HANDLE_KEY]=handle;
            this.hasWriteAccess=hasWrite;
            try{
              await persistHandle(handle);
            }catch(err){
              console.warn('Handle konnte nicht gespeichert werden',err);
            }
            try{
              const file=await handle.getFile();
              this.filePath=file.name||DEFAULT_FILE;
            }catch(err){
              this.filePath=handle.name||DEFAULT_FILE;
            }
            this.updateStoredPath(this.filePath);
            const format=await this.loadFromHandle(handle);
            if(format){
              const modeText=hasWrite?'Datei geladen':'Datei geladen (Lesemodus)';
              this.status(`Format: ${format} erkannt – ${modeText}`);
              if(!hasWrite){
                this.showError('Schreibzugriff nicht erteilt. Speichern ist möglicherweise deaktiviert.');
              }
            }else{
              this.status('Datei konnte nicht verarbeitet werden');
            }
            this.renderFileInfo();
            return;
          }
        }catch(err){
          if(err&&err.name!=='AbortError'){
            this.status('Datei konnte nicht geladen werden');
            this.showError('Datei konnte nicht geladen werden.');
          }
          return;
        }
      }
      // Fallback: use input (lesen möglich, schreiben nicht garantiert)
      const input=document.createElement('input');
      input.type='file';
      input.accept='.json,application/json';
      input.addEventListener('change',async()=>{
        const file=input.files&&input.files[0];
        if(!file) return;
        this.filePath=file.name||DEFAULT_FILE;
        this.updateStoredPath(this.filePath);
        await this.detachHandle();
        try{
          const text=await file.text();
          const format=await this.applyExternalData(text);
          this.status(format?`Format: ${format} erkannt – Datei geladen (Lesemodus)`:'Datei konnte nicht verarbeitet werden');
        }catch(err){
          console.error(err);
          this.showError('Datei konnte nicht gelesen werden.');
        }
        this.hasWriteAccess=false;
        this.renderFileInfo();
      },{once:true});
      input.click();
    }

    async loadInitialData(){
      await this.restoreStoredHandle();
      if(this.fileHandle){
        const text=await readFileHandle(this.fileHandle);
        if(text){
          const format=await this.applyExternalData(text);
          if(format){
            const modeText=this.hasWriteAccess?'Datei geladen':'Datei geladen (Lesemodus)';
            this.status(`Format: ${format} erkannt – ${modeText}`);
            if(!this.hasWriteAccess){
              this.showError('Schreibzugriff nicht erteilt. Speichern ist möglicherweise deaktiviert.');
            }
          }else{
            this.status('Datei konnte nicht verarbeitet werden');
          }
          return;
        }
        this.showError('Ausgewählte Datei konnte nicht gelesen werden.');
        await this.detachHandle();
      }
      await this.loadFromPath(this.filePath||DEFAULT_FILE);
    }

    async restoreStoredHandle(){
      if(this.fileHandle){
        this.hasWriteAccess=await ensureReadWritePermission(this.fileHandle,false);
        return true;
      }
      const storedHandle=await loadPersistedHandle();
      if(!storedHandle) return false;
      const canRead=await ensureReadPermission(storedHandle,false);
      if(!canRead){
        this.status('Berechtigung erforderlich');
        this.showError('Bitte die Findings-Datei erneut auswählen, um Zugriff zu gewähren.');
        await this.detachHandle();
        return false;
      }
      this.fileHandle=storedHandle;
      window[GLOBAL_HANDLE_KEY]=storedHandle;
      this.hasWriteAccess=await ensureReadWritePermission(storedHandle,false);
      const inferredName=storedHandle.name||this.filePath||DEFAULT_FILE;
      if(inferredName){
        this.filePath=normalizeStoredPath(inferredName);
        this.updateStoredPath(this.filePath);
      }
      this.renderFileInfo();
      return true;
    }

    async loadFromHandle(handle){
      const text=await readFileHandle(handle);
      if(text){
        return await this.applyExternalData(text);
      }
      this.showError('Ausgewählte Datei konnte nicht gelesen werden.');
      return null;
    }

    async loadFromPath(path){
      const target=normalizeStoredPath(path);
      try{
        const res=await fetch(target,{cache:'no-store'});
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const text=await res.text();
        this.filePath=target;
        this.fileHandle=null;
        try{
          window[GLOBAL_HANDLE_KEY]=null;
        }catch(err){
          /* ignore */
        }
        this.hasWriteAccess=false;
        const format=await this.applyExternalData(text);
        this.status(format?`Format: ${format} erkannt – Standarddatei geladen`:'Standarddatei konnte nicht verarbeitet werden');
        this.renderFileInfo();
      }catch(err){
        console.warn('Konnte Datei nicht laden',err);
        if(await this.tryLoadBundledDefault(target)) return;
        this.fileHandle=null;
        try{
          window[GLOBAL_HANDLE_KEY]=null;
        }catch(err2){
          /* ignore */
        }
        this.hasWriteAccess=false;
        this.data=[];
        this.filtered=[];
        this.renderList();
        this.renderEditor();
        this.showError('Keine Daten gefunden. Bitte Datei auswählen.');
        this.renderFileInfo();
        this.refreshStructureView();
      }
    }

    dispatchExternalUpdate(){
      const entry=this.data.find(item=>item.id===this.selectedId);
      const payload=buildExternalSyncEntry(entry);
      if(!payload) return;
      const detail={
        entry:payload,
        target:this.activeEditTarget&&typeof this.activeEditTarget==='object'
          ? this.activeEditTarget
          : null
      };
      try{
        window.dispatchEvent(new CustomEvent(FINDINGS_EDITOR_UPDATE_EVENT,{detail}));
      }catch(err){
        console.warn('Externes Update konnte nicht gesendet werden',err);
      }
    }

    applyPrefillEntry(prefill){
      if(!prefill||typeof prefill!=='object') return false;
      const entry=normalizeEntry(createEmptyFindingTemplate());
      entry.label=cleanString(prefill.label);
      entry.findings=cleanString(prefill.findings);
      entry.actions=cleanString(prefill.actions);
      entry.routineAction=cleanString(prefill.routineAction);
      entry.nonroutine=cleanString(prefill.nonroutine);
      const partsSource=Array.isArray(prefill.partsPairs)
        ? prefill.partsPairs
        : (Array.isArray(prefill.parts)?prefill.parts:[]);
      if(partsSource.length){
        entry.partsPairs=normalizePartsPairs({partsPairs:partsSource,parts:partsSource});
      }
      if(Array.isArray(prefill.partNumbers)&&prefill.partNumbers.length){
        entry.partNumbers=prefill.partNumbers.map(item=>cleanString(item)).filter(Boolean);
      }
      if(prefill.times&&typeof prefill.times==='object'){
        entry.times=normalizeTimes(prefill.times);
      }
      if(Array.isArray(prefill.modsList)){
        entry.modsList=normalizeModsList({modsList:prefill.modsList});
        entry.mods=entry.modsList[0]||createEmptyMods();
      }
      this.data.unshift(entry);
      this.selectedId=entry.id;
      this.dirty=true;
      this.activeHistorySignature=null;
      if(this.searchInput) this.searchInput.value='';
      this.status('Vorbefülltes Finding erstellt');
      return true;
    }

    applyPrefillEntryFromStorage(){
      const prefill=consumePrefillPayload();
      if(prefill){
        this.applyPrefillEntry(prefill);
        this.renderAll();
        return true;
      }
      return false;
    }

    applyEditTarget(target){
      if(!target||typeof target!=='object') return false;
      const normalizedTarget={
        label:normalizeMatchString(target.label),
        findings:normalizeMatchString(target.findings),
        actions:normalizeMatchString(target.actions),
        routineAction:normalizeMatchString(target.routineAction),
        nonroutine:normalizeMatchString(target.nonroutine),
        partNumbers:Array.isArray(target.partNumbers)
          ? target.partNumbers.map(item=>cleanString(item)).filter(Boolean)
          : []
      };
      let best=null;
      let bestScore=0;
      for(const entry of this.data){
        if(!entry) continue;
        let score=0;
        const entryLabel=normalizeMatchString(entry.label);
        const entryFindings=normalizeMatchString(entry.findings);
        const entryActions=normalizeMatchString(entry.actions);
        const entryRoutine=normalizeMatchString(entry.routineAction);
        const entryNonroutine=normalizeMatchString(entry.nonroutine);
        if(normalizedTarget.label){
          if(entryLabel===normalizedTarget.label) score+=5;
          else if(entryLabel&&entryLabel.includes(normalizedTarget.label)) score+=2;
        }
        if(normalizedTarget.findings){
          if(entryFindings===normalizedTarget.findings) score+=4;
          else if(entryFindings&&entryFindings.includes(normalizedTarget.findings)) score+=2;
        }
        if(normalizedTarget.actions){
          if(entryActions===normalizedTarget.actions) score+=4;
          else if(entryActions&&entryActions.includes(normalizedTarget.actions)) score+=1;
        }
        if(normalizedTarget.routineAction){
          if(entryRoutine===normalizedTarget.routineAction) score+=2;
        }
        if(normalizedTarget.nonroutine){
          if(entryNonroutine===normalizedTarget.nonroutine) score+=2;
        }
        if(normalizedTarget.partNumbers.length){
          const parts=getCleanPartNumbers(entry);
          if(parts.some(part=>normalizedTarget.partNumbers.includes(part))) score+=2;
        }
        if(score>bestScore){
          bestScore=score;
          best=entry;
        }
      }
      if(!best) return false;
      this.selectedId=best.id;
      this.activeEditTarget=target;
      return true;
    }

    applyEditTargetFromStorage(){
      const target=consumeEditTargetPayload();
      if(!target) return false;
      if(!this.data||!this.data.length){
        this.pendingEditTarget=target;
        return false;
      }
      const applied=this.applyEditTarget(target);
      if(applied){
        this.renderAll();
      }
      return applied;
    }

    async applyExternalData(text){
      try{
        const parsed=JSON.parse(text);
        let entries;
        if(Array.isArray(parsed)){
          entries=parsed;
        }else if(parsed&&typeof parsed==='object'){
          entries=Object.entries(parsed).map(([partNumber,value])=>{
            if(value&&typeof value==='object'){
              const clone={...value};
              if(clone.Part==null&&clone.part==null&&clone.partNumber==null) clone.Part=partNumber;
              if(clone.PartNumber==null) clone.PartNumber=partNumber;
              return clone;
            }
            return {Part:partNumber};
          });
        }else{
          throw new Error('Ungültiges Format');
        }

        const {changed,data:migrated,warnings}=migrateFindingsArray(entries);
        this.handleMigrationWarnings(warnings);
        const normalizedEntries=migrated.map(entry=>{
          const normalized=normalizeEntry(entry);
          if(!normalized.label&&entry&&entry.label){
            normalized.label=cleanString(entry.label);
          }
          return normalized;
        });
        this.sourceFormat='new-schema';
        this.data=normalizedEntries;
        this.filtered=[...this.data];
        this.selectedId=this.filtered[0]?this.filtered[0].id:null;
        this.undoStack=[];
        this.redoStack=[];
        this.dirty=false;
        if(this.filePath) this.updateStoredPath(this.filePath);
        this.applyPrefillEntryFromStorage();
        this.applyEditTargetFromStorage();
        this.renderAll();
        this.showError('');

        if(changed){
          this.dirty=true;
          await this.saveNow(true);
        }

        return 'new-schema';
      }catch(err){
        console.error('Ungültige Daten',err);
        this.showError('Die Datei enthält kein gültiges Findings-Format.');
        return null;
      }
    }

    buildExternalData(){
      const exported=this.data.map(entry=>{
        const partNumbers=getCleanPartNumbers(entry);
        const partNumber=partNumbers[0]||'';
        const appliesTo=partNumbers.slice(1);

        const pairs=this.ensurePartsPairs(entry).filter(pair=>cleanString(pair.part));
        const parts=pairs.map(pair=>{
          const mengeValue=toFloatOrNull(pair.quantity!=null?pair.quantity:pair.menge);
          return {
            part:cleanString(pair.part),
            menge:mengeValue==null?1:mengeValue
          };
        });

        const timesData=normalizeTimes(entry);
        const arbeitszeitValue=toFloatOrNull(timesData.arbeitszeit);
        const modzeitValue=toFloatOrNull(timesData.modZeit||timesData.modzeit);
        const times=pickFilled({arbeitszeit:arbeitszeitValue,modzeit:modzeitValue});

        const modsList=this.ensureModsList(entry);
        const mods=modsList.map(item=>{
          const normalized=normalizeMods(item);
          const modTime=toFloatOrNull(normalized.modzeit);
          const payload=pickFilled({
            title:cleanString(normalized.modBezeichnung),
            comment:cleanString(normalized.modKommentar),
            standardFromSN:cleanString(normalized.standardAbSN),
            link:cleanString(normalized.modLink),
            time:modTime
          });
          return Object.keys(payload).length?payload:null;
        }).filter(Boolean);

        const nonRoutineValue=cleanString(entry.nonroutine);

        const exportedEntry={
          partNumber:partNumber||'',
          label:entry.label||'',
          findings:entry.findings||'',
          actions:entry.actions||'',
          routineAction:entry.routineAction||'',
          parts:parts
        };
        if(appliesTo.length) exportedEntry.appliesTo=appliesTo;
        if(nonRoutineValue) exportedEntry.nonRoutineFinding=nonRoutineValue;
        if(Object.keys(times).length) exportedEntry.times=times;
        if(mods.length) exportedEntry.mods=mods;
        return exportedEntry;
      });
      return exported;
    }

    async saveNow(force){
      if(!this.dirty && !force) return;
      const externalData=validateBeforeSave(this.buildExternalData());
      const payload=JSON.stringify(externalData, null, 2);
      if(this.fileHandle){
        const hasWrite=await ensureReadWritePermission(this.fileHandle,true);
        if(!hasWrite){
          this.hasWriteAccess=false;
          this.pendingSave=true;
          this.status('Schreibberechtigung erforderlich');
          this.showError('Speichern fehlgeschlagen: Schreibzugriff wurde nicht gewährt.');
          this.renderFileInfo();
          return;
        }
        try{
          await writeFileHandle(this.fileHandle,payload);
          this.status(force?'Manuell gespeichert':'Automatisch gespeichert');
          this.hasWriteAccess=true;
          this.dirty=false;
          this.pendingSave=false;
          this.showError('');
          this.renderFileInfo();
          try{
            localStorage.setItem(NSF_DATA_STORAGE_KEY,payload);
          }catch(err){
            console.warn('NSF-Storage konnte nicht aktualisiert werden',err);
          }
          this.dispatchExternalUpdate();
        }catch(err){
          this.pendingSave=true;
          this.status('Fehler beim Speichern');
          this.showError('Speichern in Datei fehlgeschlagen.');
        }
      }else{
        this.pendingSave=true;
        this.status('Keine Datei mit Schreibzugriff');
        this.showError('Bitte eine JSON-Datei auswählen, um Änderungen zu speichern.');
      }
    }

    updateStoredPath(path){
      const cleaned=normalizeStoredPath(path);
      if(!cleaned) return;
      try{
        localStorage.setItem(PATH_KEY,cleaned);
        localStorage.setItem(GLOBAL_PATH_STORAGE_KEY,cleaned);
      }catch(err){
        console.warn('Pfad konnte nicht in localStorage gespeichert werden',err);
      }
      try{
        window[GLOBAL_PATH_VAR]=cleaned;
      }catch(err){
        /* Ignorieren, falls window schreibgeschützt ist */
      }
    }

    async tryLoadBundledDefault(target){
      if(target!==DEFAULT_FILE) return false;
      if(!BUNDLED_FINDINGS_JSON) return false;
      this.filePath=DEFAULT_FILE;
      this.hasWriteAccess=false;
      const format=await this.applyExternalData(BUNDLED_FINDINGS_JSON);
      if(format){
        this.status(`Format: ${format} erkannt – eingebettete Standarddaten geladen`);
        this.showError('');
        this.renderFileInfo();
        return true;
      }
      return false;
    }

    status(text){
      if(this.statusEl) this.statusEl.textContent=text;
    }

    showError(text){
      if(this.errorEl) this.errorEl.textContent=text||'';
    }

    handleMigrationWarnings(warnings){
      const list=Array.isArray(warnings)?warnings.filter(Boolean):[];
      this.migrationWarnings=list;
      if(list.length){
        console.warn('[Findings Migration] Warnings:',list);
        if(typeof window?.Shopguide?.showWarningBanner==='function'){
          window.Shopguide.showWarningBanner(`Findings migriert mit ${list.length} Hinweis(en). Details in der Konsole.`);
        }
      }
      this.renderMigrationWarnings();
    }

    renderMigrationWarnings(){
      if(!this.warningEl) return;
      if(this.migrationWarnings&&this.migrationWarnings.length){
        const lines=this.migrationWarnings.map((msg,index)=>`${index+1}. ${msg}`);
        this.warningEl.textContent=lines.join('\n');
        this.warningEl.style.display='';
      }else{
        this.warningEl.textContent='';
        this.warningEl.style.display='none';
      }
    }

    applySearch(){
      const rawTerm=this.searchInput.value.trim();
      const matcher=createSearchMatcher(rawTerm);
      const displayTerm=matcher?rawTerm:'';
      if(!matcher){
        this.filtered=[...this.data];
      }else{
        this.filtered=this.data.filter(entry=>entryMatchesSearch(entry,matcher));
      }
      if(this.filtered.every(item=>item.id!==this.selectedId)){
        this.selectedId=this.filtered[0]?this.filtered[0].id:null;
      }
      this.renderList(displayTerm);
      this.renderEditor(displayTerm);
    }

    renderAll(){
      if(this.pendingEditTarget){
        const target=this.pendingEditTarget;
        this.pendingEditTarget=null;
        this.applyEditTarget(target);
      }
      const rawTerm=this.searchInput.value.trim();
      if(rawTerm){
        this.applySearch();
      }else{
        this.filtered=[...this.data];
        this.renderList('');
        this.renderEditor('');
      }
      this.updateHistoryButtons();
      this.renderFileInfo();
      this.refreshStructureView();
    }

    shouldHighlightSearchTerm(term){
      if(!term) return false;
      if(!this.searchInput) return false;
      return document.activeElement===this.searchInput;
    }

    renderWithCurrentSearchTerm(){
      const term=this.searchInput?this.searchInput.value.trim():'';
      this.renderList(term);
      if(this.shouldHighlightSearchTerm(term)){
        this.renderEditor(term);
      }else if(this.titleEl){
        const entry=this.data.find(item=>item.id===this.selectedId);
        if(entry){
          this.titleEl.textContent=entry.label||'Ohne Label';
        }
      }
    }

    renderFileInfo(){
      if(!this.fileInfoEl) return;
      const path=this.filePath||DEFAULT_FILE;
      let mode;
      if(this.fileHandle){
        mode=this.hasWriteAccess?'Schreibzugriff aktiv':'Lesemodus (kein Schreibrecht)';
      }else{
        mode='Lesemodus';
      }
      const lines=[`Quelle: ${path}`,`Modus: ${mode}`,`Version: ${MODULE_VERSION}`];
      this.fileInfoEl.textContent=lines.join('\n');
    }

    renderList(term=''){ 
      if(!this.listEl||!this.listHeaderEl) return;
      this.listEl.innerHTML='';
      this.listHeaderEl.textContent=this.filtered.length;
      const highlightTerm=this.shouldHighlightSearchTerm(term)?term:'';
      if(!this.filtered.length){
        const empty=document.createElement('div');
        empty.className='sfe-no-results';
        empty.textContent='Keine Findings gefunden';
        this.listEl.appendChild(empty);
        return;
      }
      for(const entry of this.filtered){
        const item=document.createElement('div');
        item.className='sfe-item'+(entry.id===this.selectedId?' active':'');
        item.setAttribute('role','button');
        item.setAttribute('aria-pressed',entry.id===this.selectedId?'true':'false');
        item.tabIndex=0;
        const partNumbers=getCleanPartNumbers(entry);
        const subtitle=partNumbers.length?partNumbers.join(', '):'Keine Partnummer';
        const subtitleClass=partNumbers.length?'sfe-item-subtitle':'sfe-item-subtitle sfe-empty';
        const content=document.createElement('div');
        content.className='sfe-item-content';
        const titleEl=document.createElement('div');
        titleEl.className='sfe-item-title';
        titleEl.innerHTML=highlight(entry.label||'Ohne Label',term);
        content.appendChild(titleEl);
        const subtitleEl=document.createElement('div');
        subtitleEl.className=subtitleClass;
        subtitleEl.innerHTML=term?highlight(subtitle,term):escapeHTML(subtitle);
        content.appendChild(subtitleEl);
        item.appendChild(content);
        const actions=document.createElement('div');
        actions.className='sfe-item-actions';
        const duplicateBtn=document.createElement('button');
        duplicateBtn.type='button';
        duplicateBtn.className='sfe-item-action';
        duplicateBtn.title='Eintrag duplizieren';
        const labelText=cleanString(entry.label)||'Ohne Label';
        duplicateBtn.setAttribute('aria-label',`Eintrag ${labelText} duplizieren`);
        duplicateBtn.innerHTML='<span aria-hidden="true">⧉</span>';
        duplicateBtn.addEventListener('click',(event)=>{
          event.preventDefault();
          event.stopPropagation();
          this.duplicateEntry(entry.id);
        });
        actions.appendChild(duplicateBtn);
        const deleteBtn=document.createElement('button');
        deleteBtn.type='button';
        deleteBtn.className='sfe-item-action sfe-item-action--delete';
        deleteBtn.title='Eintrag löschen';
        deleteBtn.setAttribute('aria-label',`Eintrag ${labelText} löschen`);
        deleteBtn.innerHTML='<span aria-hidden="true">🗑</span>';
        deleteBtn.addEventListener('click',(event)=>{
          event.preventDefault();
          event.stopPropagation();
          this.deleteEntry(entry.id);
        });
        actions.appendChild(deleteBtn);
        item.appendChild(actions);
        const selectEntry=()=>{
          this.selectedId=entry.id;
          const activeTerm=this.shouldHighlightSearchTerm(term)?term:'';
          this.renderList(activeTerm);
          this.renderEditor(activeTerm);
        };
        item.addEventListener('click',selectEntry);
        item.addEventListener('keydown',(event)=>{
          if(event.key==='Enter'||event.key===' '||event.key==='Spacebar'){
            event.preventDefault();
            selectEntry();
          }
        });
        this.listEl.appendChild(item);
      }
    }

    renderEditor(term=''){
      if(!this.editorEl) return;
      this.editorEl.innerHTML='';
      this.activeHistorySignature=null;
      this.titleEl=null;
      const entry=this.data.find(item=>item.id===this.selectedId);
      if(!entry){
        const empty=document.createElement('div');
        empty.className='sfe-editor-empty sfe-empty';
        empty.textContent='Wähle ein Finding aus oder erstelle ein neues.';
        this.editorEl.appendChild(empty);
        return;
      }
      const header=document.createElement('div');
      header.className='sfe-editor-header';
      const title=document.createElement('div');
      title.className='sfe-editor-title';
      const highlightTerm=this.shouldHighlightSearchTerm(term)?term:'';
      title.innerHTML=highlightTerm?highlight(entry.label||'Ohne Label',highlightTerm):escapeHTML(entry.label||'Ohne Label');
      this.titleEl=title;
      header.appendChild(title);
      this.copyBtn=document.createElement('button');
      this.copyBtn.type='button';
      this.copyBtn.className='sfe-btn sfe-copy';
      this.copyBtn.textContent='Kopieren';
      this.copyBtn.addEventListener('click',()=>this.copyEntry(entry));
      header.appendChild(this.copyBtn);
      this.editorEl.appendChild(header);

      const fields=document.createElement('div');
      fields.className='sfe-fields';
      this.editorEl.appendChild(fields);
      this.activeFieldControllers={};
      this.ensurePartsPairs(entry);
      this.ensurePartNumbers(entry);
      this.renderPartNumbersField(fields,entry);

      for(const key of FIELD_KEYS){
        if(key==='parts'){
          for(const section of NESTED_SECTIONS){
            this.renderNestedSection(fields,entry,section);
          }
          this.renderPartsSection(fields,entry);
          continue;
        }
        const field=document.createElement('div');
        field.className='sfe-field';
        const label=document.createElement('label');
        label.textContent=FIELD_LABELS[key];
        label.setAttribute('for',`${entry.id}-${key}`);
        field.appendChild(label);
        const isSingleLine=key==='label';
        const input=document.createElement(isSingleLine?'input':'textarea');
        if(isSingleLine) input.type='text';
        input.className=isSingleLine?'sfe-input':'sfe-textarea';
        input.id=`${entry.id}-${key}`;
        input.value=entry[key]||'';
        input.placeholder=isSingleLine?`${FIELD_LABELS[key]} eingeben`:`${FIELD_LABELS[key]} eingeben`;
        disableAutocomplete(input);
        input.addEventListener('input',()=>{
          const value=cleanString(input.value);
          this.updateEntry(entry.id,key,value);
        });
        input.addEventListener('blur',()=>{
          this.activeHistorySignature=null;
        });
        field.appendChild(input);
        const controller=new SuggestionsController(field,this.getSuggestionsFor(key),()=>input.value,(val)=>{
          input.value=val;
          this.updateEntry(entry.id,key,cleanString(val));
        },input);
        this.registerSuggestionController(key,controller);
        fields.appendChild(field);
      }
    }

    ensurePartsPairs(entry){
      if(!entry) return [];
      if(!Array.isArray(entry.partsPairs)||entry.partsPairs.length!==PART_PAIR_COUNT){
        entry.partsPairs=normalizePartsPairs(entry);
      }
      return entry.partsPairs;
    }

    ensurePartNumbers(entry){
      if(!entry) return [];
      if(!Array.isArray(entry.partNumbers)){
        entry.partNumbers=normalizePartNumbers(entry);
      }else{
        entry.partNumbers=entry.partNumbers.map(value=>value==null?'':cleanString(value));
      }
      return entry.partNumbers;
    }

    ensureModsList(entry){
      if(!entry) return createEmptyModsList();
      if(!Array.isArray(entry.modsList)){
        entry.modsList=normalizeModsList(entry);
      }else{
        entry.modsList=entry.modsList.map(item=>{
          if(!item||typeof item!=='object') return createEmptyMods();
          const normalized=normalizeMods(item);
          return {...normalized};
        });
      }
      if(!entry.modsList.length) entry.modsList=createEmptyModsList();
      entry.mods=entry.modsList[0]||createEmptyMods();
      return entry.modsList;
    }

    ensureNestedSection(entry,sectionKey){
      if(!entry) return {};
      if(sectionKey==='times'){
        entry.times=normalizeTimes(entry);
        return entry.times;
      }
      if(sectionKey==='mods'){
        return this.ensureModsList(entry);
      }
      if(!entry[sectionKey]||typeof entry[sectionKey]!=='object') entry[sectionKey]={};
      return entry[sectionKey];
    }

    renderPartNumbersField(container,entry){
      const field=document.createElement('div');
      field.className='sfe-field sfe-partnumbers-field';
      const label=document.createElement('label');
      label.textContent=PART_NUMBERS_LABEL;
      label.setAttribute('for',`${entry.id}-partnumbers`);
      field.appendChild(label);
      const textarea=document.createElement('textarea');
      textarea.className='sfe-textarea';
      textarea.id=`${entry.id}-partnumbers`;
      textarea.placeholder='Eine Partnummer pro Zeile eingeben';
      textarea.value=this.ensurePartNumbers(entry).join('\n');
      disableAutocomplete(textarea);
      textarea.addEventListener('input',()=>{
        this.updatePartNumbers(entry.id,textarea.value);
      });
      textarea.addEventListener('blur',()=>{this.activeHistorySignature=null;});
      field.appendChild(textarea);
      container.appendChild(field);
    }

    renderNestedSection(container,entry,section){
      if(!section||!section.fields||!section.fields.length) return;
      if(section.key==='mods'){
        this.renderModsSection(container,entry,section);
        return;
      }
      const data=this.ensureNestedSection(entry,section.key);
      const field=document.createElement('div');
      field.className='sfe-field sfe-subsection';
      const header=document.createElement('div');
      header.className='sfe-subsection-header';
      header.textContent=section.title;
      field.appendChild(header);
      const grid=document.createElement('div');
      grid.className='sfe-subfield-grid';
      field.appendChild(grid);
      for(const subField of section.fields){
        const wrapper=document.createElement('div');
        wrapper.className='sfe-subfield';
        const label=document.createElement('label');
        label.textContent=subField.label;
        label.setAttribute('for',`${entry.id}-${section.key}-${subField.key}`);
        wrapper.appendChild(label);
        const input=document.createElement('input');
        input.type='text';
        input.className='sfe-input';
        input.id=`${entry.id}-${section.key}-${subField.key}`;
        input.value=data[subField.key]||'';
        input.placeholder=subField.placeholder||'';
        disableAutocomplete(input);
        input.addEventListener('input',()=>{
          const value=cleanString(input.value);
          this.updateNestedField(entry.id,section.key,subField.key,value);
        });
        input.addEventListener('blur',()=>{this.activeHistorySignature=null;});
        wrapper.appendChild(input);
        const suggestionKey=`${section.key}.${subField.key}`;
        const controller=new SuggestionsController(wrapper,this.getSuggestionsFor(suggestionKey),()=>input.value,(val)=>{
          input.value=val;
          this.updateNestedField(entry.id,section.key,subField.key,cleanString(val));
        },input);
        this.registerSuggestionController(suggestionKey,controller);
        grid.appendChild(wrapper);
      }
      container.appendChild(field);
    }

    renderModsSection(container,entry,section){
      const modsList=this.ensureModsList(entry);
      const field=document.createElement('div');
      field.className='sfe-field sfe-subsection sfe-mods-section';
      const header=document.createElement('div');
      header.className='sfe-subsection-header';
      const title=document.createElement('span');
      title.textContent=section.title;
      header.appendChild(title);
      const actions=document.createElement('div');
      actions.className='sfe-subsection-actions';
      const addBtn=document.createElement('button');
      addBtn.type='button';
      addBtn.className='sfe-subsection-add';
      addBtn.setAttribute('aria-label','Weitere Mod-Spalte hinzufügen');
      addBtn.textContent='+';
      addBtn.addEventListener('click',()=>this.addModsEntry(entry.id));
      actions.appendChild(addBtn);
      header.appendChild(actions);
      field.appendChild(header);
      const grid=document.createElement('div');
      grid.className='sfe-mods-grid';
      field.appendChild(grid);
      modsList.forEach((modData,index)=>{
        const column=document.createElement('div');
        column.className='sfe-mod-column';
        const columnHeader=document.createElement('div');
        columnHeader.className='sfe-mod-column-header';
        const columnTitle=document.createElement('span');
        columnTitle.textContent=`Mod ${index+1}`;
        columnHeader.appendChild(columnTitle);
        if(modsList.length>1){
          const removeBtn=document.createElement('button');
          removeBtn.type='button';
          removeBtn.className='sfe-mod-remove';
          removeBtn.setAttribute('aria-label',`Mod ${index+1} entfernen`);
          removeBtn.innerHTML='<span aria-hidden="true">×</span>';
          removeBtn.addEventListener('click',()=>this.removeModsEntry(entry.id,index));
          columnHeader.appendChild(removeBtn);
        }
        column.appendChild(columnHeader);
        const columnFields=document.createElement('div');
        columnFields.className='sfe-mod-column-fields';
        column.appendChild(columnFields);
        for(const subField of section.fields){
          const wrapper=document.createElement('div');
          wrapper.className='sfe-subfield sfe-mod-field';
          const label=document.createElement('label');
          label.textContent=subField.label;
          const inputId=`${entry.id}-${section.key}-${index}-${subField.key}`;
          label.setAttribute('for',inputId);
          wrapper.appendChild(label);
          const input=document.createElement('input');
          input.type='text';
          input.className='sfe-input';
          input.id=inputId;
          input.value=modData[subField.key]||'';
          input.placeholder=subField.placeholder||'';
          disableAutocomplete(input);
          input.addEventListener('input',()=>{
            const value=cleanString(input.value);
            this.updateModsField(entry.id,index,subField.key,value);
          });
          input.addEventListener('blur',()=>{this.activeHistorySignature=null;});
          wrapper.appendChild(input);
          const suggestionKey=`${section.key}.${subField.key}`;
          const controller=new SuggestionsController(wrapper,this.getSuggestionsFor(suggestionKey),()=>input.value,(val)=>{
            input.value=val;
            this.updateModsField(entry.id,index,subField.key,cleanString(val));
          },input);
          this.registerSuggestionController(suggestionKey,controller);
          columnFields.appendChild(wrapper);
        }
        grid.appendChild(column);
      });
      container.appendChild(field);
    }

    renderPartsSection(container,entry){
      const gridField=document.createElement('div');
      gridField.className='sfe-field sfe-parts-grid-field';
      const gridHeader=document.createElement('div');
      gridHeader.className='sfe-parts-grid-header';
      const gridLegend=document.createElement('div');
      gridLegend.className='sfe-part-pair-title';
      gridLegend.textContent=PARTS_GRID_LABEL;
      gridHeader.appendChild(gridLegend);
      gridField.appendChild(gridHeader);
      const grid=document.createElement('div');
      grid.className='sfe-parts-grid';
      gridField.appendChild(grid);
      const pairs=this.ensurePartsPairs(entry);
      pairs.forEach((pair,index)=>{
        const pairWrapper=document.createElement('div');
        pairWrapper.className='sfe-part-pair';
        const title=document.createElement('div');
        title.className='sfe-part-pair-title';
        title.textContent=`PN ${index+1} · Menge ${index+1}`;
        pairWrapper.appendChild(title);
        const body=document.createElement('div');
        body.className='sfe-part-pair-body';
        const partBlock=document.createElement('div');
        partBlock.className='sfe-part-block';
        const partLabel=document.createElement('label');
        partLabel.textContent=`PN ${index+1}`;
        partLabel.setAttribute('for',`${entry.id}-part-${index+1}`);
        const partInput=document.createElement('input');
        partInput.type='text';
        partInput.className='sfe-input';
        partInput.id=`${entry.id}-part-${index+1}`;
        partInput.value=pair&&pair.part?pair.part:'';
        partInput.placeholder='Teilenummer';
        disableAutocomplete(partInput);
        partInput.addEventListener('input',()=>{
          const value=cleanString(partInput.value);
          this.updatePartPair(entry.id,index,'part',value);
        });
        partInput.addEventListener('blur',()=>{
          this.activeHistorySignature=null;
        });
        partBlock.appendChild(partLabel);
        partBlock.appendChild(partInput);
        const qtyBlock=document.createElement('div');
        qtyBlock.className='sfe-qty-block';
        const qtyLabel=document.createElement('label');
        qtyLabel.textContent=`Menge ${index+1}`;
        qtyLabel.setAttribute('for',`${entry.id}-qty-${index+1}`);
        const qtyInput=document.createElement('input');
        qtyInput.type='text';
        qtyInput.className='sfe-input';
        qtyInput.id=`${entry.id}-qty-${index+1}`;
        qtyInput.value=pair&&pair.quantity?pair.quantity:'';
        qtyInput.placeholder='Menge';
        disableAutocomplete(qtyInput);
        qtyInput.addEventListener('input',()=>{
          const value=cleanString(qtyInput.value);
          this.updatePartPair(entry.id,index,'quantity',value);
        });
        qtyInput.addEventListener('blur',()=>{
          this.activeHistorySignature=null;
        });
        qtyBlock.appendChild(qtyLabel);
        qtyBlock.appendChild(qtyInput);
        body.appendChild(partBlock);
        body.appendChild(qtyBlock);
        pairWrapper.appendChild(body);
        grid.appendChild(pairWrapper);
      });
      container.appendChild(gridField);
    }

    getSuggestionsFor(key){
      const set=new Set();
      if(!key) return [];
      const [section,field]=key.includes('.')?key.split('.',2):[null,null];
      for(const entry of this.data){
        if(section&&field){
          const container=entry&&entry[section];
          if(Array.isArray(container)){
            container.forEach(item=>{
              if(item&&item[field]) set.add(item[field]);
            });
          }else if(container&&typeof container==='object'){
            const value=container[field];
            if(value) set.add(value);
          }
          const listContainer=entry&&entry[`${section}List`];
          if(Array.isArray(listContainer)){
            listContainer.forEach(item=>{
              if(item&&item[field]) set.add(item[field]);
            });
          }
          continue;
        }
        const value=entry[key];
        if(value) set.add(value);
      }
      return Array.from(set).sort((a,b)=>a.localeCompare(b,'de',{sensitivity:'base'}));
    }

    updateSuggestions(){
      for(const key of SUGGESTION_FIELD_KEYS){
        const controllers=this.activeFieldControllers[key];
        if(!controllers) continue;
        const values=this.getSuggestionsFor(key);
        if(Array.isArray(controllers)){
          controllers.forEach(controller=>controller.setValues(values));
        }else{
          controllers.setValues(values);
        }
      }
    }

    registerSuggestionController(key,controller){
      if(!key||!controller) return;
      const existing=this.activeFieldControllers[key];
      if(!existing){
        this.activeFieldControllers[key]=controller;
        return;
      }
      if(Array.isArray(existing)){
        existing.push(controller);
      }else{
        this.activeFieldControllers[key]=[existing,controller];
      }
    }

    refreshViewAfterChange(entry,key){
      this.dirty=true;
      if(!this.searchInput){
        this.updateSuggestions();
        return;
      }
      const rawTerm=this.searchInput.value.trim();
      const matcher=createSearchMatcher(rawTerm);
      if(matcher){
        const filtered=this.data.filter(item=>entryMatchesSearch(item,matcher));
        const hadSelected=filtered.some(item=>item.id===this.selectedId);
        this.filtered=filtered;
        this.renderList(rawTerm);
        if(!hadSelected){
          this.selectedId=filtered[0]?filtered[0].id:null;
          this.renderEditor(rawTerm);
          this.updateSuggestions();
          return;
        }
      }else{
        this.filtered=[...this.data];
        this.renderList('');
      }
      if(key==='label' && this.titleEl){
        const highlightTerm=this.shouldHighlightSearchTerm(rawTerm)?rawTerm:'';
        if(highlightTerm){
          this.titleEl.innerHTML=highlight(entry.label||'Ohne Label',highlightTerm);
        }else{
          this.titleEl.textContent=entry.label||'Ohne Label';
        }
      }
      this.updateSuggestions();
      this.refreshStructureView();
    }

    updateEntry(id,key,value){
      const entry=this.data.find(item=>item.id===id);
      if(!entry) return;
      if(entry[key]===value) return;
      const signature=`${id}:${key}`;
      if(this.activeHistorySignature!==signature){
        this.pushHistory();
        this.activeHistorySignature=signature;
      }
      entry[key]=value||'';
      this.refreshViewAfterChange(entry,key);
    }

    updateNestedField(id,section,field,value){
      const entry=this.data.find(item=>item.id===id);
      if(!entry) return;
      const container=this.ensureNestedSection(entry,section);
      if(container[field]===value) return;
      const signature=`${id}:${section}.${field}`;
      if(this.activeHistorySignature!==signature){
        this.pushHistory();
        this.activeHistorySignature=signature;
      }
      container[field]=value||'';
      this.refreshViewAfterChange(entry,`${section}.${field}`);
    }

    updateModsField(id,index,field,value){
      const entry=this.data.find(item=>item.id===id);
      if(!entry) return;
      const list=this.ensureModsList(entry);
      const targetIndex=Math.max(0,Math.min(index,list.length-1));
      const mod=list[targetIndex]||createEmptyMods();
      const cleaned=value==null?'':cleanString(value);
      if(mod[field]===cleaned) return;
      const signature=`${id}:modsList:${targetIndex}:${field}`;
      if(this.activeHistorySignature!==signature){
        this.pushHistory();
        this.activeHistorySignature=signature;
      }
      mod[field]=cleaned;
      list[targetIndex]=mod;
      entry.mods=list[0]||createEmptyMods();
      entry.modsList=list;
      this.refreshViewAfterChange(entry,`mods.${field}`);
    }

    addModsEntry(id){
      const entry=this.data.find(item=>item.id===id);
      if(!entry) return;
      const list=this.ensureModsList(entry);
      this.pushHistory();
      this.activeHistorySignature=`${id}:modsList:add`;
      list.push(createEmptyMods());
      entry.modsList=list;
      entry.mods=list[0]||createEmptyMods();
      this.refreshViewAfterChange(entry,'modsList');
      const term=this.searchInput?this.searchInput.value.trim():'';
      this.renderEditor(term);
      this.updateSuggestions();
      setTimeout(()=>{
        const focusId=`${entry.id}-mods-${list.length-1}-${MODS_FIELD_DEFS[0].key}`;
        const focusEl=this.root.querySelector(`#${focusId}`);
        if(focusEl) focusEl.focus();
      },0);
    }

    removeModsEntry(id,index){
      const entry=this.data.find(item=>item.id===id);
      if(!entry) return;
      const list=this.ensureModsList(entry);
      if(list.length<=1) return;
      const targetIndex=Math.max(0,Math.min(index,list.length-1));
      this.pushHistory();
      this.activeHistorySignature=`${id}:modsList:remove:${targetIndex}`;
      list.splice(targetIndex,1);
      if(!list.length) list.push(createEmptyMods());
      entry.modsList=list;
      entry.mods=list[0]||createEmptyMods();
      this.refreshViewAfterChange(entry,'modsList');
      const term=this.searchInput?this.searchInput.value.trim():'';
      this.renderEditor(term);
      this.updateSuggestions();
    }

    updatePartPair(id,index,type,value){
      const entry=this.data.find(item=>item.id===id);
      if(!entry) return;
      const pairs=this.ensurePartsPairs(entry);
      const targetIndex=Math.max(0,Math.min(index,PART_PAIR_COUNT-1));
      const pair=pairs[targetIndex]||{part:'',quantity:''};
      if(pair[type]===value) return;
      const signature=`${id}:partsPairs:${targetIndex}:${type}`;
      if(this.activeHistorySignature!==signature){
        this.pushHistory();
        this.activeHistorySignature=signature;
      }
      pair[type]=value||'';
      pairs[targetIndex]=pair;
      entry.partsPairs=pairs;
      this.refreshViewAfterChange(entry,'partsPairs');
    }

    updatePartNumbers(id,value){
      const entry=this.data.find(item=>item.id===id);
      if(!entry) return;
      const numbers=this.ensurePartNumbers(entry);
      const input=value==null?'':String(value);
      const cleanedValues=input.split(/\r?\n/).map(line=>cleanString(line)).filter(Boolean);
      if(arraysEqual(numbers,cleanedValues)) return;
      const signature=`${id}:partNumbers`;
      if(this.activeHistorySignature!==signature){
        this.pushHistory();
        this.activeHistorySignature=signature;
      }
      entry.partNumbers=cleanedValues;
      this.refreshViewAfterChange(entry,'partNumbers');
    }

    createEntry(){
      const entry=normalizeEntry(createEmptyFindingTemplate());
      this.ensurePartsPairs(entry);
      this.ensurePartNumbers(entry);
      this.ensureModsList(entry);
      this.pushHistory();
      this.data.unshift(entry);
      this.selectedId=entry.id;
      this.activeHistorySignature=null;
      this.dirty=true;
      if(this.searchInput) this.searchInput.value='';
      this.applySearch();
      this.updateSuggestions();
      this.refreshStructureView();
    }

    duplicateEntry(id){
      const index=this.data.findIndex(item=>item.id===id);
      if(index<0) return;
      const source=this.data[index];
      const duplicate=cloneData(source);
      duplicate.id=ensureId();
      duplicate.partNumbers=[...getCleanPartNumbers(source)];
      duplicate.partsPairs=normalizePartsPairs(source);
      duplicate.times=normalizeTimes(source);
      duplicate.modsList=normalizeModsList(source);
      duplicate.mods=duplicate.modsList[0]||createEmptyMods();
      this.pushHistory();
      this.data.splice(index+1,0,duplicate);
      this.selectedId=duplicate.id;
      this.activeHistorySignature=null;
      this.dirty=true;
      if(this.searchInput){
        this.applySearch();
      }else{
        this.filtered=[...this.data];
        this.renderList('');
        this.renderEditor('');
      }
      this.updateSuggestions();
      this.status('Eintrag dupliziert');
      this.refreshStructureView();
    }

    deleteEntry(id){
      const index=this.data.findIndex(item=>item.id===id);
      if(index<0) return;
      const entry=this.data[index];
      const label=cleanString(entry.label)||'Ohne Label';
      const confirmed=window.confirm(`Eintrag "${label}" wirklich löschen?`);
      if(!confirmed) return;
      this.pushHistory();
      this.data.splice(index,1);
      if(this.selectedId===id){
        const fallback=this.data[index]||this.data[index-1]||null;
        this.selectedId=fallback?fallback.id:null;
      }
      this.activeHistorySignature=null;
      this.dirty=true;
      if(this.searchInput){
        this.applySearch();
      }else{
        this.filtered=[...this.data];
        this.renderList('');
        this.renderEditor('');
      }
      this.updateSuggestions();
      this.status('Eintrag gelöscht');
      this.refreshStructureView();
    }

    pushHistory(){
      this.undoStack.push(cloneData(this.data));
      if(this.undoStack.length>HISTORY_LIMIT) this.undoStack.shift();
      this.redoStack.length=0;
      this.updateHistoryButtons();
    }

    undo(){
      if(!this.undoStack.length) return;
      this.redoStack.push(cloneData(this.data));
      const snapshot=this.undoStack.pop();
      this.data=cloneData(snapshot);
      this.dirty=true;
      this.activeHistorySignature=null;
      this.applySearch();
      this.updateHistoryButtons();
      this.updateSuggestions();
      this.refreshStructureView();
    }

    redo(){
      if(!this.redoStack.length) return;
      this.undoStack.push(cloneData(this.data));
      const snapshot=this.redoStack.pop();
      this.data=cloneData(snapshot);
      this.dirty=true;
      this.activeHistorySignature=null;
      this.applySearch();
      this.updateHistoryButtons();
      this.updateSuggestions();
      this.refreshStructureView();
    }

    updateHistoryButtons(){
      if(this.undoBtn) this.undoBtn.disabled=!this.undoStack.length;
      if(this.redoBtn) this.redoBtn.disabled=!this.redoStack.length;
    }

    copyEntry(entry){
      const text=buildCopyText(entry);
      navigator.clipboard.writeText(text).then(()=>{
        this.status('In Zwischenablage kopiert');
      }).catch(()=>{
        this.status('Kopieren fehlgeschlagen');
      });
    }

    destroy(){
      if(this.autosaveTimer) clearInterval(this.autosaveTimer);
      this.hideContextMenu();
      if(this.contextMenu&&this.contextMenu.parentNode){
        this.contextMenu.parentNode.removeChild(this.contextMenu);
      }
      if(this.onWindowClick) window.removeEventListener('click',this.onWindowClick);
      if(this.onWindowResize) window.removeEventListener('resize',this.onWindowResize);
      if(this.onKeyDown) window.removeEventListener('keydown',this.onKeyDown);
      this.contextMenu=null;
      if(window.__shopguideFindingsEditorInstance===this){
        window.__shopguideFindingsEditorInstance=null;
      }
    }
  }

  window.renderShopguideFindingsEditor=function(root){
    const instance=new ShopguideFindingsEditor(root);
    window.__shopguideFindingsEditorInstance=instance;
    return instance;
  };

  if(!window.Shopguide) window.Shopguide={};
  if(typeof window.Shopguide.showWarningBanner!=='function'){
    window.Shopguide.showWarningBanner=(msg)=>{
      let el=document.getElementById('findings-migration-warning');
      if(!el){
        el=document.createElement('div');
        el.id='findings-migration-warning';
        el.style.cssText='position:fixed;bottom:12px;left:12px;padding:10px 14px;background:#fff3cd;border:1px solid #ffeeba;color:#856404;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);z-index:99999;font:14px/1.4 system-ui;';
        document.body.appendChild(el);
      }
      el.textContent=msg;
      setTimeout(()=>{ if(el&&el.parentNode) el.remove(); },8000);
    };
  }
})();
