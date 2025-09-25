(function(){
  'use strict';

  const DATA_URL='Findings_Shopguide.json';
  const DATA_KEY='sf-data';
  const STATE_KEY='sf-state';
  const STATE_KEY_SEPARATOR='::';
  const UNIT_BOARD_EVENT='unitBoard:update';
  const DOC_KEY='module_data_v1';
  const WATCH_INTERVAL=600;
  const SAVE_DEBOUNCE=250;
  const HISTORY_LIMIT=10;
  const STYLE_ID='nsf-styles';

  const instances=new Set();
  let watchersInitialized=false;
  let ensureDataPromise=null;
  const lastValues={};

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const tag=document.createElement('style');
    tag.id=STYLE_ID;
    tag.textContent=`
      .nsf-module{display:flex;flex-direction:column;gap:1rem;height:100%;color:var(--text-color);}
      .nsf-section{background:rgba(255,255,255,0.08);border-radius:1rem;padding:0.75rem 1rem;display:flex;flex-direction:column;gap:0.65rem;}
      .nsf-context{display:flex;flex-direction:column;gap:0.6rem;font-size:0.9rem;}
      .nsf-context-header{display:flex;flex-wrap:wrap;gap:0.5rem 1.5rem;align-items:center;}
      .nsf-context-label{opacity:0.7;font-weight:500;margin-right:0.35rem;}
      .nsf-context-value{font-weight:600;color:var(--module-header-text,#fff);}
      .nsf-context-meta{display:flex;flex-wrap:wrap;gap:0.4rem 1.2rem;}
      .nsf-badge{display:inline-flex;align-items:center;gap:0.35rem;background:rgba(59,130,246,0.18);color:var(--module-header-text,#fff);border-radius:999px;padding:0.25rem 0.75rem;font-size:0.8rem;font-weight:600;}
      .nsf-badge small{opacity:0.75;font-weight:500;}
      .nsf-section-title{font-weight:600;font-size:1rem;display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;}
      .nsf-section-title .nsf-count{opacity:0.7;font-size:0.85rem;font-weight:500;}
      .nsf-controls{display:flex;flex-wrap:wrap;gap:0.5rem;}
      .nsf-btn{background:rgba(255,255,255,0.14);border:none;border-radius:0.75rem;padding:0.45rem 0.9rem;color:inherit;font:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;display:inline-flex;align-items:center;gap:0.35rem;}
      .nsf-btn:hover{background:rgba(255,255,255,0.24);transform:translateY(-1px);}
      .nsf-btn.secondary{background:rgba(148,163,184,0.2);}
      .nsf-btn.secondary:hover{background:rgba(148,163,184,0.32);}
      .nsf-btn.danger{background:rgba(248,113,113,0.22);}
      .nsf-btn.danger:hover{background:rgba(248,113,113,0.35);}
      .nsf-history{display:flex;flex-wrap:wrap;gap:0.4rem;}
      .nsf-history-chip{background:rgba(59,130,246,0.16);border:none;border-radius:999px;padding:0.3rem 0.75rem;font:inherit;font-size:0.8rem;color:inherit;cursor:pointer;transition:background 0.15s ease;display:flex;align-items:center;gap:0.3rem;}
      .nsf-history-chip:hover{background:rgba(59,130,246,0.3);}
      .nsf-input-wrapper{display:flex;flex-direction:column;gap:0.5rem;}
      .nsf-input-row{position:relative;background:rgba(15,23,42,0.18);border-radius:0.85rem;padding:0.55rem 0.65rem;display:flex;flex-direction:column;gap:0.35rem;}
      .nsf-input-row.locked{background:rgba(15,23,42,0.28);}
      .nsf-remove-btn{position:absolute;top:0.4rem;right:0.45rem;background:rgba(248,113,113,0.25);border:none;border-radius:999px;color:inherit;width:1.6rem;height:1.6rem;display:flex;align-items:center;justify-content:center;font-size:0.9rem;cursor:pointer;opacity:0.85;transition:background 0.15s ease,opacity 0.15s ease;}
      .nsf-remove-btn:hover{background:rgba(248,113,113,0.4);opacity:1;}
      .nsf-input{width:100%;border:none;border-radius:0.65rem;padding:0.55rem 0.7rem;font:inherit;color:var(--sidebar-module-card-text,#111);background:var(--sidebar-module-card-bg,#fff);}
      .nsf-input:disabled{opacity:0.75;background:rgba(255,255,255,0.65);cursor:not-allowed;}
      .nsf-input::placeholder{color:rgba(107,114,128,0.8);}
      .nsf-input-helper{font-size:0.75rem;opacity:0.75;display:flex;flex-direction:column;gap:0.15rem;}
      .nsf-suggestions{position:absolute;top:calc(100% - 0.2rem);left:0;right:0;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border-radius:0.75rem;box-shadow:0 12px 28px rgba(15,23,42,0.25);padding:0.35rem;display:none;max-height:220px;overflow:auto;z-index:30;}
      .nsf-input-row.show-suggestions .nsf-suggestions{display:block;}
      .nsf-suggestion{padding:0.45rem 0.55rem;border-radius:0.6rem;cursor:pointer;display:flex;flex-direction:column;gap:0.25rem;}
      .nsf-suggestion:hover,.nsf-suggestion.active{background:rgba(59,130,246,0.12);}
      .nsf-suggestion-label{font-weight:600;font-size:0.9rem;}
      .nsf-suggestion-finding{font-size:0.85rem;opacity:0.85;}
      .nsf-suggestion-action{font-size:0.8rem;opacity:0.65;}
      .nsf-selected-meta{font-size:0.8rem;opacity:0.75;display:flex;flex-direction:column;gap:0.25rem;padding:0.15rem 0.3rem 0.1rem;}
      .nsf-selected-meta strong{font-weight:600;}
      .nsf-empty{opacity:0.75;font-style:italic;}
      .nsf-outputs{display:grid;gap:0.75rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}
      .nsf-output{background:rgba(15,23,42,0.18);border-radius:0.9rem;padding:0.6rem 0.75rem;display:flex;flex-direction:column;gap:0.45rem;min-height:0;}
      .nsf-output-header{display:flex;align-items:center;justify-content:space-between;font-weight:600;}
      .nsf-copy-btn{background:rgba(255,255,255,0.16);border:none;border-radius:0.6rem;padding:0.3rem 0.5rem;color:inherit;font:inherit;cursor:pointer;transition:background 0.15s ease;display:flex;align-items:center;gap:0.3rem;}
      .nsf-copy-btn:hover{background:rgba(255,255,255,0.28);}
      .nsf-copy-btn.copied{background:rgba(16,185,129,0.35);}
      .nsf-copy-btn .nsf-copy-feedback{font-size:0.85rem;opacity:0;transition:opacity 0.15s ease;}
      .nsf-copy-btn.copied .nsf-copy-feedback{opacity:1;}
      .nsf-textarea{flex:1;min-height:120px;border:none;border-radius:0.75rem;padding:0.6rem 0.65rem;font:inherit;resize:vertical;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);}
      .nsf-textarea:disabled{opacity:0.6;background:rgba(255,255,255,0.5);cursor:not-allowed;}
      .nsf-note{font-size:0.8rem;opacity:0.75;}
      .nsf-alert{background:rgba(248,113,113,0.2);border-radius:0.75rem;padding:0.5rem 0.75rem;font-size:0.85rem;}
      .nsf-inline-info{font-size:0.8rem;opacity:0.7;}
    `;
    document.head.appendChild(tag);
  }

  function scheduleAll(){
    for(const inst of instances) inst.scheduleRender();
  }

  function setupWatchers(){
    if(watchersInitialized) return;
    watchersInitialized=true;
    const updateValue=(key)=>{lastValues[key]=localStorage.getItem(key);};
    updateValue(DOC_KEY);
    updateValue(DATA_KEY);
    updateValue(STATE_KEY);
    window.addEventListener('storage',e=>{
      if(!e) return;
      if(e.key===DOC_KEY||e.key===DATA_KEY||e.key===STATE_KEY){
        lastValues[e.key]=localStorage.getItem(e.key);
        scheduleAll();
      }
    });
    window.addEventListener(UNIT_BOARD_EVENT,()=>scheduleAll());
    setInterval(()=>{
      const doc=localStorage.getItem(DOC_KEY);
      if(doc!==lastValues[DOC_KEY]){lastValues[DOC_KEY]=doc;scheduleAll();}
      const data=localStorage.getItem(DATA_KEY);
      if(data!==lastValues[DATA_KEY]){lastValues[DATA_KEY]=data;scheduleAll();}
      const state=localStorage.getItem(STATE_KEY);
      if(state!==lastValues[STATE_KEY]){lastValues[STATE_KEY]=state;scheduleAll();}
    },WATCH_INTERVAL);
  }

  function clean(value){return value==null?'':String(value).trim();}
  function normalizeKey(value){return clean(value).toLowerCase();}
  function canonicalKey(value){
    return clean(value).toLowerCase().replace(/[^a-z0-9]+/g,'');
  }

  const ENTRY_COLLECTION_KEYS=new Set([
    'entries','entry','findings','finding','items','item','records','record','list','liste',
    'values','value','daten','data','standardfindings','standardfinding','library','collection','satz','saetze'
  ].map(canonicalKey));

  const DICTIONARY_KEYS=new Set([
    'dictionary','lookup','meldungen','meldungsliste','mapping','map','dict','zuordnung','reference','lexikon',
    'meldungszuordnung','meldungsmap','meldungsdictionary','meldungslookup','dictionaryentries','dictionaryentry'
  ].map(canonicalKey));

  const FIELD_ALIASES={
    part:[
      'part','partno','partnumber','partnr','pn','pnr','part_num','part_nummer','partnumber','part number',
      'material','materialnr','materialnummer','materialno','material no','artikel','artikelnummer','artikel nr',
      'component','componentno','componentnumber','partnummer'
    ],
    label:['label','title','name','beschreibung','desc','description','heading','überschrift','ueberschrift'],
    finding:['finding','findings','findingtext','finding_text','befund','befunde','meldungstext','meldung','meldungen','befundtext'],
    action:['action','actions','maßnahme','massnahme','maßnahmen','massnahmen','recommendation','empfehlung','correctiveaction','corrective_action','korrekturmaßnahme','korrektur'],
    routine:['routine','routinetext','routine_text','routinefinding','routinefindingtext','routineaction','routinebeschreibung'],
    nonroutine:['nonroutine','non_routine','nonroutinefinding','nonroutinefindingtext','nonroutineaction','nonroutinebeschreibung','non routine','non-routine'],
    parts:['parts','ersatzteile','replacementparts','replacedparts','teile','bestellliste','spares','components'],
    times:['times','time','zeit','zeiten','dauer','aufwand','arbeitszeit','stunden','timeestimate','time_estimate'],
    mods:['mods','mod','modification','modifications','modifikation','modifikationen','changes','change','änderungen','aenderungen','modnotes']
  };

  const DICTIONARY_LABEL_ALIASES=[
    'meldung','meldungsnr','meldungsnummer','meldungsno','meldungno','meldungsid','meldungid','meldungsname','melding',
    'meldungscode','meldungstext','meldung_text','meldung title','key','label','finding','beschreibung','description','title','name'
  ];
  const DICTIONARY_PART_ALIASES=[
    ...FIELD_ALIASES.part,
    'value','wert','pn','pnr','partvalue','part_value','materialnummer','materialnr'
  ];

  const RESERVED_FIELDS=new Set(Object.values(FIELD_ALIASES).flat().map(canonicalKey));
  RESERVED_FIELDS.add('finding');
  RESERVED_FIELDS.add('label');
  RESERVED_FIELDS.add('action');
  RESERVED_FIELDS.add('part');

  function buildFieldMap(raw){
    const map={};
    if(!raw||typeof raw!=='object') return map;
    for(const [key,value] of Object.entries(raw)){
      const canonical=canonicalKey(key);
      if(!canonical) continue;
      if(!(canonical in map)) map[canonical]=value;
    }
    return map;
  }

  function valueToText(value){
    if(value==null) return '';
    if(Array.isArray(value)){
      const parts=value.map(v=>valueToText(v)).map(part=>clean(part)).filter(Boolean);
      return Array.from(new Set(parts)).join('\n');
    }
    if(typeof value==='object'){
      const candidates=['text','value','label','beschreibung','description','desc'];
      for(const key of candidates){
        if(Object.prototype.hasOwnProperty.call(value,key)){
          const nested=valueToText(value[key]);
          if(nested) return nested;
        }
      }
      try{
        const serialized=JSON.stringify(value);
        return clean(serialized);
      }catch{
        return '';
      }
    }
    return clean(value);
  }

  function formatMetaValue(value){
    const text=clean(value);
    if(!text) return '';
    const parts=text.split(/\r?\n/).map(part=>clean(part)).filter(Boolean);
    return parts.join(' · ');
  }

  function extractField(map,aliases){
    if(!map) return '';
    for(const alias of aliases){
      const key=canonicalKey(alias);
      if(key&&Object.prototype.hasOwnProperty.call(map,key)){
        const text=valueToText(map[key]);
        if(text) return text;
      }
    }
    return '';
  }

  function hasField(map,aliases){
    if(!map) return false;
    for(const alias of aliases){
      const key=canonicalKey(alias);
      if(key&&Object.prototype.hasOwnProperty.call(map,key)){
        const value=valueToText(map[key]);
        if(value) return true;
      }
    }
    return false;
  }

  function collectEntriesAndDictionary(parsed){
    if(!parsed||typeof parsed!=='object') return {entries:[],dictionary:null};
    const entries=[];
    let dictionary=null;
    const seenEntries=new Set();
    const visited=new Set();

    const visit=(value,isDictionary)=>{
      if(value==null) return;
      if(typeof value!=='object') return;
      if(visited.has(value)) return;
      visited.add(value);
      if(Array.isArray(value)){
        for(const item of value){
          if(item&&typeof item==='object') visit(item,isDictionary);
        }
        return;
      }
      const map=buildFieldMap(value);
      if(!isDictionary){
        const hasPart=hasField(map,FIELD_ALIASES.part);
        const hasContent=hasField(map,FIELD_ALIASES.finding)
          ||hasField(map,FIELD_ALIASES.action)
          ||hasField(map,FIELD_ALIASES.label);
        if(hasPart&&hasContent&&!seenEntries.has(value)){
          entries.push(value);
          seenEntries.add(value);
        }
      }
      for(const [key,val] of Object.entries(value)){
        if(val==null) continue;
        const canonical=canonicalKey(key);
        if(!canonical) continue;
        if(dictionary===null&&DICTIONARY_KEYS.has(canonical)){
          dictionary=val;
          visit(val,true);
          continue;
        }
        if(ENTRY_COLLECTION_KEYS.has(canonical)){
          visit(val,isDictionary);
          continue;
        }
        visit(val,isDictionary);
      }
    };

    visit(parsed,false);
    return {entries,dictionary};
  }

  function ensureData(){
    if(localStorage.getItem(DATA_KEY)) return Promise.resolve();
    if(ensureDataPromise) return ensureDataPromise;
    ensureDataPromise=(async()=>{
      try{
        const resp=await fetch(DATA_URL,{cache:'no-store'});
        if(!resp.ok) throw new Error('HTTP '+resp.status);
        const parsed=await resp.json();
        if(Array.isArray(parsed)){
          const payload=JSON.stringify(parsed);
          localStorage.setItem(DATA_KEY,payload);
          lastValues[DATA_KEY]=payload;
        }else if(parsed&&typeof parsed==='object'){
          const payload=JSON.stringify(parsed);
          localStorage.setItem(DATA_KEY,payload);
          lastValues[DATA_KEY]=payload;
        }
      }catch(err){
        console.warn('NSF: Findings_Shopguide.json konnte nicht geladen werden',err);
      }
    })();
    return ensureDataPromise;
  }

  function parseData(){
    let parsed;
    try{parsed=JSON.parse(localStorage.getItem(DATA_KEY)||'null');}
    catch(err){console.warn('NSF: sf-data konnte nicht gelesen werden',err);parsed=null;}
    let entriesRaw=[];
    let dictionaryRaw=null;
    if(Array.isArray(parsed)){
      entriesRaw=parsed;
    }else if(parsed&&typeof parsed==='object'){
      const extracted=collectEntriesAndDictionary(parsed);
      if(extracted.entries&&extracted.entries.length) entriesRaw=extracted.entries;
      if(extracted.dictionary) dictionaryRaw=extracted.dictionary;
      if(!entriesRaw.length){
        if(Array.isArray(parsed.entries)) entriesRaw=parsed.entries;
        else if(Array.isArray(parsed.findings)) entriesRaw=parsed.findings;
        else if(Array.isArray(parsed.items)) entriesRaw=parsed.items;
        else if(Array.isArray(parsed.records)) entriesRaw=parsed.records;
      }
      if(dictionaryRaw==null){
        if(parsed.dictionary) dictionaryRaw=parsed.dictionary;
        else if(parsed.meldungen) dictionaryRaw=parsed.meldungen;
        else if(parsed.lookup) dictionaryRaw=parsed.lookup;
      }
    }
    if(!Array.isArray(entriesRaw)){
      if(entriesRaw&&typeof entriesRaw==='object') entriesRaw=[entriesRaw];
      else entriesRaw=[];
    }
    const normalizedEntries=normalizeEntries(entriesRaw);
    const dictionary=normalizeDictionary(dictionaryRaw);
    const partMap=new Map();
    const entryMap=new Map();
    for(const entry of normalizedEntries){
      if(!partMap.has(entry.part)) partMap.set(entry.part,[]);
      partMap.get(entry.part).push(entry);
      entryMap.set(entry.key,entry);
    }
    for(const list of partMap.values()){
      list.sort((a,b)=>{
        const al=a.label||'';const bl=b.label||'';
        const cmp=al.localeCompare(bl,'de',{sensitivity:'base'});
        if(cmp!==0) return cmp;
        return (a.finding||'').localeCompare(b.finding||'', 'de', {sensitivity:'base'});
      });
    }
    return {entries:normalizedEntries,partMap,dictionary,entryMap};
  }

  function normalizeEntries(list){
    if(!Array.isArray(list)) return [];
    const counts=new Map();
    const result=[];
    for(const raw of list){
      if(!raw||typeof raw!=='object') continue;
      const map=buildFieldMap(raw);
      const part=clean(extractField(map,FIELD_ALIASES.part));
      const label=clean(extractField(map,FIELD_ALIASES.label));
      const finding=clean(extractField(map,FIELD_ALIASES.finding));
      const action=clean(extractField(map,FIELD_ALIASES.action));
      const routine=clean(extractField(map,FIELD_ALIASES.routine));
      const nonroutine=clean(extractField(map,FIELD_ALIASES.nonroutine));
      const partsText=clean(extractField(map,FIELD_ALIASES.parts));
      const times=clean(extractField(map,FIELD_ALIASES.times));
      const mods=clean(extractField(map,FIELD_ALIASES.mods));
      if(!part&&( !finding && !action && !label)) continue;
      if(!part) continue;
      const extras=[];
      const extrasKeyParts=[];
      const extrasSeen=new Set();
      for(const [rawKey,value] of Object.entries(raw)){
        const canonical=canonicalKey(rawKey);
        if(!canonical) continue;
        if(RESERVED_FIELDS.has(canonical)) continue;
        if(extrasSeen.has(canonical)) continue;
        const text=valueToText(value);
        if(!text) continue;
        extrasSeen.add(canonical);
        const displayLabel=clean(rawKey)||rawKey;
        const valueLower=text.toLowerCase();
        extras.push({
          key:rawKey,
          label:displayLabel,
          value:text,
          valueLower
        });
        extrasKeyParts.push(text);
      }
      extras.sort((a,b)=>a.label.localeCompare(b.label,'de',{sensitivity:'base'}));
      const baseKeyParts=[part,label,finding,action,routine,nonroutine,partsText,times,mods];
      if(extrasKeyParts.length) baseKeyParts.push(...extrasKeyParts);
      const baseKey=baseKeyParts.join('||');
      const count=counts.get(baseKey)||0;
      counts.set(baseKey,count+1);
      const key=count?`${baseKey}__${count}`:baseKey;
      const labelValue=label||'';
      const findingValue=finding||'';
      const actionValue=action||'';
      const routineValue=routine||'';
      const nonroutineValue=nonroutine||'';
      const partsValue=partsText||'';
      const timesValue=times||'';
      const modsValue=mods||'';
      result.push({
        key,
        part,
        label:labelValue,
        finding:findingValue,
        action:actionValue,
        routine:routineValue,
        nonroutine:nonroutineValue,
        parts:partsValue,
        times:timesValue,
        mods:modsValue,
        additional:extras,
        additionalLower:extras.map(item=>item.valueLower),
        labelLower:labelValue.toLowerCase(),
        findingLower:findingValue.toLowerCase(),
        actionLower:actionValue.toLowerCase(),
        routineLower:routineValue.toLowerCase(),
        nonroutineLower:nonroutineValue.toLowerCase(),
        partsLower:partsValue.toLowerCase(),
        timesLower:timesValue.toLowerCase(),
        modsLower:modsValue.toLowerCase()
      });
    }
    return result;
  }

  function normalizeDictionary(input){
    const map=new Map();
    if(Array.isArray(input)){
      for(const entry of input){
        if(!entry) continue;
        if(typeof entry==='string'||typeof entry==='number'){continue;}
        if(typeof entry!=='object') continue;
        const mapEntry=buildFieldMap(entry);
        const labelAliases=[...DICTIONARY_LABEL_ALIASES,...FIELD_ALIASES.finding,...FIELD_ALIASES.label];
        const meldRaw=extractField(mapEntry,labelAliases) || valueToText(entry.meldung) || valueToText(entry.key);
        const partRaw=extractField(mapEntry,DICTIONARY_PART_ALIASES) || valueToText(entry.value);
        const meld=clean(meldRaw);
        const part=clean(partRaw);
        if(!meld||!part) continue;
        map.set(normalizeKey(meld),part);
      }
    }else if(input&&typeof input==='object'){
      for(const [meldung,partVal] of Object.entries(input)){
        const meld=clean(meldung);
        let part='';
        if(partVal&&typeof partVal==='object'){
          part=clean(valueToText(partVal));
        }else{
          part=clean(partVal);
        }
        if(!meld||!part) continue;
        map.set(normalizeKey(meld),part);
      }
    }
    return map;
  }

  function parseDocument(){
    let docRaw='';
    let doc=null;
    try{docRaw=localStorage.getItem(DOC_KEY)||'';doc=JSON.parse(docRaw||'{}');}
    catch(err){console.warn('NSF: module_data_v1 konnte nicht gelesen werden',err);doc={};}
    const general=doc&&typeof doc==='object'?doc.general||{}:{};
    const meldungCandidates=[
      general&&general.Meldung,
      general&&general.MELDUNGS_NO
    ];
    let meldung='';
    for(const candidate of meldungCandidates){
      const value=clean(candidate);
      if(value){meldung=value;break;}
    }
    const partCandidates=[
      general&&general.PartNo,
      general&&general.PartNumber,
      general&&general.Part,
      general&&general.PN,
      general&&general.Material,
      general&&general.MaterialNr,
      general&&general.Materialnummer,
      general&&general.MaterialNo,
      general&&general.Artikel,
      general&&general.Artikelnummer,
      general&&general.Part_No,
      general&&general.PART_NO,
      general&&general['Part No'],
      general&&general['Part_Number']
    ];
    let part='';
    for(const candidate of partCandidates){
      const value=clean(candidate);
      if(value){part=value;break;}
    }
    const serialCandidates=[
      general&&general.Serial,
      general&&general.SerialNo,
      general&&general.SerialNumber,
      general&&general.SerialNr,
      general&&general.SN,
      general&&general.Snr,
      general&&general.SNr,
      general&&general.Seriennummer,
      general&&general.SerienNr,
      general&&general.Serien,
      general&&general.SERIAL_NO,
      general&&general['Serial No'],
      general&&general['Serial_Number']
    ];
    let serial='';
    for(const candidate of serialCandidates){
      const value=clean(candidate);
      if(value){serial=value;break;}
    }
    const hasDoc=!!docRaw;
    return {docRaw,meldung,part,serial,hasDoc};
  }

  function findAspenBoardEntry(meldung){
    const key=clean(meldung);
    if(!key) return null;
    try{
      const shared=window.__UNIT_BOARD_SHARED__;
      if(shared&&typeof shared.findAspenItem==='function'){
        const entry=shared.findAspenItem(key);
        if(entry&&typeof entry==='object') return entry;
      }
    }catch(err){console.warn('NSF: Aspen-Board Lookup fehlgeschlagen',err);}
    return null;
  }

  function extractSerialFromBoard(entry){
    if(!entry||typeof entry!=='object') return '';
    const direct=clean(entry.serial||entry.Serial||entry.SerialNo||entry.SerialNumber||entry.SERIAL_NO||entry.SERIALNUMBER||entry.SN||entry.SNr||entry.SNR||entry['Serial No']||entry['SerialNumber']);
    if(direct) return direct;
    const candidates=['serial','serialno','serialnumber','serial_nr','serialnr','serial_no','serial nr','serial no','serial number','sn','snr','s/n','seriennummer','seriennr','serien nr'];
    const data=entry.data&&typeof entry.data==='object'?entry.data:{};
    for(const [key,value] of Object.entries(data)){
      if(!value) continue;
      const lower=key.toLowerCase();
      if(candidates.includes(lower)){
        const cleanVal=clean(value);
        if(cleanVal) return cleanVal;
      }
    }
    return '';
  }

  function extractPartFromBoard(entry){
    if(!entry||typeof entry!=='object') return '';
    const direct=clean(entry.part||entry.Part||entry.PartNo||entry.PartNumber||entry.PartNr||entry.PN||entry.Material||entry.MaterialNr||entry.Materialnummer||entry.MaterialNo||entry.Artikel||entry.Artikelnummer||entry.Partnummer||entry['Part No']||entry['Part_Number']||entry['PartNumber']||entry['Part Nr']);
    if(direct) return direct;
    const candidates=['part','partno','partnumber','part_no','part-number','part number','partnr','part nr','pn','material','materialnr','materialnummer','materialno','material nr','material-nr','artikel','artikelnummer','artikel nr','artikel-nr','partnummer'];
    const data=entry.data&&typeof entry.data==='object'?entry.data:{};
    for(const [key,value] of Object.entries(data)){
      if(!value) continue;
      const lower=key.toLowerCase();
      if(candidates.includes(lower)){
        const cleanVal=clean(value);
        if(cleanVal) return cleanVal;
      }
    }
    for(const field of ['PartNo','PartNumber','Part_No','Part Number','Part_Number','PartNr','Part Nr','Part-Nr','Material','MaterialNr','Materialnummer','MaterialNo','Material Nr','Material-Nr','Artikel','Artikelnummer','Artikel Nr','Artikel-Nr','Partnummer']){
      const candidate=clean(data[field]);
      if(candidate) return candidate;
    }
    return '';
  }

  function detectDelimiter(line){
    if(line.includes(';')) return ';';
    if(line.includes('\t')) return '\t';
    return ',';
  }

  function splitCsvLine(line,delimiter){
    const result=[];
    let current='';
    let inQuotes=false;
    for(let i=0;i<line.length;i+=1){
      const char=line[i];
      if(char==='"'){
        if(inQuotes&&line[i+1]==='"'){current+='"';i+=1;continue;}
        inQuotes=!inQuotes;
        continue;
      }
      if(char===delimiter&&!inQuotes){
        result.push(current);
        current='';
        continue;
      }
      current+=char;
    }
    result.push(current);
    return result.map(val=>clean(val));
  }

  function parseAspenCsv(text){
    const trimmed=(text||'').trim();
    if(!trimmed) return null;
    const lines=trimmed.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    if(!lines.length) return null;
    const delimiter=detectDelimiter(lines[0]);
    const headers=splitCsvLine(lines[0],delimiter);
    if(!headers.length) return null;
    let valuesLine='';
    for(let i=1;i<lines.length;i+=1){
      if(lines[i]){valuesLine=lines[i];break;}
    }
    const values=valuesLine?splitCsvLine(valuesLine,delimiter):[];
    const general={};
    headers.forEach((header,idx)=>{
      const key=clean(header);
      if(!key) return;
      general[key]=clean(values[idx]||'');
    });
    if(!Object.keys(general).length) return null;
    return {general};
  }

  function loadGlobalState(){
    let parsed;
    try{parsed=JSON.parse(localStorage.getItem(STATE_KEY)||'{}');}
    catch(err){console.warn('NSF: sf-state konnte nicht gelesen werden',err);parsed={};}
    if(!parsed||typeof parsed!=='object') parsed={};
    if(!parsed.meldungsbezogen||typeof parsed.meldungsbezogen!=='object') parsed.meldungsbezogen={};
    if(!parsed.history||typeof parsed.history!=='object') parsed.history={};
    return parsed;
  }

  function saveGlobalState(value){
    const payload=JSON.stringify(value);
    localStorage.setItem(STATE_KEY,payload);
    lastValues[STATE_KEY]=payload;
  }

  function buildCompositeKey(parts){
    if(!parts||typeof parts!=='object') return '';
    const meldung=clean(parts.meldung);
    if(!meldung) return '';
    const part=clean(parts.part);
    const serial=clean(parts.serial);
    return [meldung,part,serial].map(value=>encodeURIComponent(value||''))
      .join(STATE_KEY_SEPARATOR);
  }

  function serializeSelections(selections){
    if(!Array.isArray(selections)) return [];
    return selections
      .filter(sel=>sel&&typeof sel.key==='string')
      .map(sel=>(
        {
          key:sel.key,
          finding:typeof sel.finding==='string'?sel.finding:'',
          action:typeof sel.action==='string'?sel.action:'',
          label:typeof sel.label==='string'?sel.label:'',
          part:typeof sel.part==='string'?sel.part:''
        }
      ));
  }

  function deserializeSelections(entry){
    return Array.isArray(entry?.selections)
      ? entry.selections.filter(sel=>sel&&typeof sel.key==='string').map(sel=>(
          {
            key:sel.key,
            finding:typeof sel.finding==='string'?sel.finding:'',
            action:typeof sel.action==='string'?sel.action:'',
            label:typeof sel.label==='string'?sel.label:'',
            part:typeof sel.part==='string'?sel.part:''
          }
        ))
      :[];
  }

  function extractStateFromEntry(entry){
    return {
      findings: typeof entry?.findings==='string'?entry.findings:'',
      actions: typeof entry?.actions==='string'?entry.actions:'',
      routine: typeof entry?.routine==='string'?entry.routine:'',
      nonroutine: typeof entry?.nonroutine==='string'?entry.nonroutine:'',
      parts: typeof entry?.parts==='string'?entry.parts:''
    };
  }

  function loadStateFor(keyParts){
    const normalized=keyParts&&typeof keyParts==='object'
      ? {meldung:clean(keyParts.meldung),part:clean(keyParts.part),serial:clean(keyParts.serial)}
      : null;
    const compositeKey=buildCompositeKey(normalized);
    let global=loadGlobalState();
    let entry=compositeKey?global.meldungsbezogen[compositeKey]:null;
    let migrated=false;
    const legacyKey=normalized&&normalized.meldung;
    if(!entry&&legacyKey){
      const legacyEntry=global.meldungsbezogen[legacyKey];
      if(legacyEntry){
        entry=legacyEntry;
        if(compositeKey&&compositeKey!==legacyKey){
          global.meldungsbezogen[compositeKey]={
            ...extractStateFromEntry(legacyEntry),
            selections:serializeSelections(deserializeSelections(legacyEntry))
          };
          delete global.meldungsbezogen[legacyKey];
          saveGlobalState(global);
          global=loadGlobalState();
          entry=global.meldungsbezogen[compositeKey];
          migrated=true;
        }
      }
    }
    const selections=deserializeSelections(entry);
    return {
      state: extractStateFromEntry(entry),
      selections,
      global,
      migrated
    };
  }

  function saveStateFor(keyParts,state,selections,globalState){
    const normalized=keyParts&&typeof keyParts==='object'
      ? {meldung:clean(keyParts.meldung),part:clean(keyParts.part),serial:clean(keyParts.serial)}
      : null;
    const compositeKey=buildCompositeKey(normalized);
    if(!compositeKey) return;
    const global=globalState||loadGlobalState();
    global.meldungsbezogen[compositeKey]={
      findings: typeof state.findings==='string'?state.findings:'',
      actions: typeof state.actions==='string'?state.actions:'',
      routine: typeof state.routine==='string'?state.routine:'',
      nonroutine: typeof state.nonroutine==='string'?state.nonroutine:'',
      parts: typeof state.parts==='string'?state.parts:'',
      selections: serializeSelections(selections)
    };
    if(normalized&&normalized.meldung&&normalized.meldung!==compositeKey){
      delete global.meldungsbezogen[normalized.meldung];
    }
    saveGlobalState(global);
  }

  function getHistoryForPart(global,part){
    if(!part) return [];
    const list=global.history[part];
    if(!Array.isArray(list)) return [];
    const seen=new Set();
    const result=[];
    for(const item of list){
      if(!item||typeof item.key!=='string') continue;
      if(seen.has(item.key)) continue;
      seen.add(item.key);
      result.push({
        key:item.key,
        finding:clean(item.finding),
        action:clean(item.action),
        label:clean(item.label),
        part:clean(item.part)
      });
      if(result.length>=HISTORY_LIMIT) break;
    }
    return result;
  }

  function pushHistory(global,part,entry){
    if(!part||!entry||!entry.key) return;
    if(!Array.isArray(global.history[part])) global.history[part]=[];
    const list=global.history[part];
    list.unshift({
      key:entry.key,
      finding:entry.finding||'',
      action:entry.action||'',
      label:entry.label||'',
      part:entry.part||''
    });
    const unique=new Map();
    const filtered=[];
    for(const item of list){
      if(!item||typeof item.key!=='string') continue;
      if(unique.has(item.key)) continue;
      unique.set(item.key,true);
      filtered.push(item);
      if(filtered.length>=HISTORY_LIMIT) break;
    }
    global.history[part]=filtered;
    saveGlobalState(global);
  }

  function copyText(text){
    const value=clean(text);
    if(!value) return Promise.resolve(false);
    if(navigator.clipboard&&navigator.clipboard.writeText){
      return navigator.clipboard.writeText(value).then(()=>true).catch(()=>false);
    }
    return new Promise(resolve=>{
      const temp=document.createElement('textarea');
      temp.style.position='fixed';
      temp.style.opacity='0';
      temp.value=value;
      document.body.appendChild(temp);
      temp.focus();
      temp.select();
      try{document.execCommand('copy');resolve(true);}catch{resolve(false);}finally{document.body.removeChild(temp);} 
    });
  }

  class ModuleInstance{
    constructor(root){
      this.root=root;
      this.rendering=false;
      this.pending=false;
      this.destroyed=false;
      this.stateKey='';
      this.stateKeyParts=null;
      this.activeState={findings:'',actions:'',routine:'',nonroutine:'',parts:''};
      this.allEntries=[];
      this.partEntries=[];
      this.availableEntries=[];
      this.inputsContainer=null;
      this.textareas={};
      this.saveTimer=null;
      this.selectionRows=[];
      this.currentPart='';
      this.partSource='';
      this.meldung='';
      this.serial='';
      this.hasAspenDoc=false;
      this.globalState=loadGlobalState();
      this.history=[];
      this.filterAll=false;
      this.undoBuffer=null;
      this.selectedEntries=[];
      this.totalEntries=0;
      this.entryMap=new Map();
      this.dictionaryUsed=false;
    }

    scheduleRender(){
      if(this.destroyed) return;
      if(this.pending) return;
      this.pending=true;
      Promise.resolve().then(()=>{
        this.pending=false;
        this.render();
      });
    }

    render(){
      if(this.destroyed) return;
      if(this.rendering){this.pending=true;return;}
      this.rendering=true;
      Promise.resolve().then(()=>this.renderInternal()).catch(err=>{
        console.warn('NSF: Renderfehler',err);
      }).finally(()=>{
        this.rendering=false;
        if(this.pending&&!this.destroyed){this.pending=false;this.render();}
      });
    }

    async renderInternal(){
      injectStyles();
      setupWatchers();
      await ensureData();
      this.globalState=loadGlobalState();
      const data=parseData();
      this.allEntries=data.entries;
      this.entryMap=data.entryMap;
      this.totalEntries=this.allEntries.length;
      const docInfo=parseDocument();
      this.meldung=docInfo.meldung;
      const boardEntry=this.meldung?findAspenBoardEntry(this.meldung):null;
      const boardPart=boardEntry?extractPartFromBoard(boardEntry):'';
      const boardSerial=extractSerialFromBoard(boardEntry);
      let part='';
      let partSource='';
      if(boardPart){
        part=boardPart;
        partSource='aspen-board';
      }
      if(!part&&docInfo.part){
        part=docInfo.part;
        partSource='aspen-header';
      }
      if(!part){
        const fallback=this.meldung?data.dictionary.get(normalizeKey(this.meldung))||'':'';
        if(fallback){part=fallback;partSource='dictionary';}
      }
      const previousPart=this.currentPart;
      this.currentPart=part;
      this.partSource=part?partSource:'';
      const serialCandidate=docInfo.serial||boardSerial;
      this.serial=serialCandidate;
      this.hasAspenDoc=docInfo.hasDoc;
      this.dictionaryUsed=partSource==='dictionary'&&!!part;
      if(previousPart!==part){
        this.filterAll=false;
      }
      this.partEntries=part?data.partMap.get(part)||[]:[];
      this.availableEntries=this.filterAll?this.allEntries:this.partEntries;
      const keyParts=this.meldung?{meldung:this.meldung,part:this.currentPart,serial:this.serial}:null;
      const key=keyParts?buildCompositeKey(keyParts):'';
      const previousKey=this.stateKey;
      this.stateKey=key||'';
      this.stateKeyParts=keyParts;
      if(this.stateKey!==previousKey){
        this.undoBuffer=null;
      }
      let selections=[];
      if(this.stateKey){
        const loaded=loadStateFor(this.stateKeyParts);
        this.activeState=loaded.state;
        selections=loaded.selections||[];
        this.globalState=loaded.global;
        if(loaded.migrated){
          this.globalState=loadGlobalState();
        }
      }else{
        this.activeState={findings:'',actions:'',routine:'',nonroutine:'',parts:''};
        selections=[];
      }
      this.history=getHistoryForPart(this.globalState,this.currentPart);
      this.selectedEntries=selections.map(sel=>{
        const resolved=this.entryMap.get(sel.key);
        if(resolved) return {...resolved};
        return {
          key:sel.key,
          finding:sel.finding||'',
          action:sel.action||'',
          label:sel.label||'',
          part:sel.part||this.currentPart
        };
      });
      this.selectionRows=[];
      this.renderDom();
    }

    renderDom(){
      const root=this.root;
      root.innerHTML='';
      root.classList.add('nsf-module');

      const contextSection=document.createElement('div');
      contextSection.className='nsf-section';
      const contextWrap=document.createElement('div');
      contextWrap.className='nsf-context';

      const makeContextItem=(label,value)=>{
        const container=document.createElement('div');
        const lbl=document.createElement('span');
        lbl.className='nsf-context-label';
        lbl.textContent=`${label}:`;
        const val=document.createElement('span');
        val.className='nsf-context-value';
        val.textContent=value||'–';
        container.append(lbl,val);
        return container;
      };

      const headerRow=document.createElement('div');
      headerRow.className='nsf-context-header';
      headerRow.append(
        makeContextItem('Meldung',this.meldung),
        makeContextItem('Partnummer',this.currentPart),
        makeContextItem('Seriennummer',this.serial)
      );

      const visibleCount=this.availableEntries.length;
      const totalForPart=this.partEntries.length;
      if(this.totalEntries){
        const badge=document.createElement('span');
        badge.className='nsf-badge';
        const totalLabel=totalForPart||this.totalEntries||visibleCount;
        let badgeText=`${visibleCount} von ${totalLabel||visibleCount} Findings geladen`;
        const details=[];
        if(this.currentPart) details.push(`PN ${this.currentPart}`);
        if(this.serial) details.push(`SN ${this.serial}`);
        if(details.length) badgeText+=` (${details.join(', ')})`;
        if(this.filterAll&&this.currentPart){
          badgeText+=` — Filter deaktiviert`;
        }
        badge.textContent=badgeText;
        headerRow.appendChild(badge);
      }

      contextWrap.appendChild(headerRow);

      const metaRow=document.createElement('div');
      metaRow.className='nsf-context-meta';
      if(this.currentPart){
        const source=document.createElement('span');
        source.className='nsf-inline-info';
        const sourceLabel=this.partSource==='dictionary'
          ?'Dictionary'
          :this.partSource==='aspen-board'
            ?'Aspen-Board'
            :this.partSource==='aspen-header'
              ?'Aspen-Headerdaten'
              :'Unbekannt';
        source.textContent=`Partnummer-Quelle: ${sourceLabel}`;
        metaRow.appendChild(source);
      }else{
        const source=document.createElement('span');
        source.className='nsf-inline-info';
        source.textContent='Keine Partnummer gefunden';
        metaRow.appendChild(source);
      }
      if(this.hasAspenDoc){
        const aspenInfo=document.createElement('span');
        aspenInfo.className='nsf-inline-info';
        aspenInfo.textContent='Aspen-Daten geladen';
        metaRow.appendChild(aspenInfo);
      }
      if(metaRow.childElementCount){
        contextWrap.appendChild(metaRow);
      }

      contextSection.appendChild(contextWrap);

      if(!this.hasAspenDoc){
        const warn=document.createElement('div');
        warn.className='nsf-alert';
        warn.textContent='Keine Aspen-Daten vorhanden – bitte Datei laden.';
        contextSection.appendChild(warn);
      }
      if(this.dictionaryUsed){
        const info=document.createElement('div');
        info.className='nsf-note';
        info.textContent='Keine Partnummer in Aspen gefunden – Fallback Dictionary.';
        contextSection.appendChild(info);
      }

      const controls=document.createElement('div');
      controls.className='nsf-controls';

      const fileInput=document.createElement('input');
      fileInput.type='file';
      fileInput.accept='.json,.csv,.txt';
      fileInput.style.display='none';
      fileInput.addEventListener('change',()=>{
        const file=fileInput.files&&fileInput.files[0];
        if(file){
          this.handleAspenFile(file).finally(()=>{fileInput.value='';});
        }
      });
      contextSection.appendChild(fileInput);

      const aspenBtn=document.createElement('button');
      aspenBtn.type='button';
      aspenBtn.className='nsf-btn';
      aspenBtn.textContent='📂 Aspen-Datei wählen …';
      aspenBtn.addEventListener('click',()=>fileInput.click());
      controls.appendChild(aspenBtn);

      const toggleBtn=document.createElement('button');
      toggleBtn.type='button';
      toggleBtn.className='nsf-btn';
      toggleBtn.textContent=this.filterAll?'🔒 PN-Filter aktivieren':'🔍 Alle Findings anzeigen';
      toggleBtn.disabled=!this.totalEntries;
      toggleBtn.addEventListener('click',()=>{
        this.filterAll=!this.filterAll;
        this.availableEntries=this.filterAll?this.allEntries:this.partEntries;
        this.render();
      });
      controls.appendChild(toggleBtn);

      const undoBtn=document.createElement('button');
      undoBtn.type='button';
      undoBtn.className='nsf-btn secondary';
      undoBtn.textContent='↩️ Undo';
      undoBtn.disabled=!this.undoBuffer;
      undoBtn.addEventListener('click',()=>this.applyUndo());
      controls.appendChild(undoBtn);

      const clearBtn=document.createElement('button');
      clearBtn.type='button';
      clearBtn.className='nsf-btn danger';
      clearBtn.textContent='🗑 Alles löschen';
      clearBtn.disabled=!this.stateKey;
      clearBtn.addEventListener('click',()=>this.clearCurrentState());
      controls.appendChild(clearBtn);

      const saveBtn=document.createElement('button');
      saveBtn.type='button';
      saveBtn.className='nsf-btn secondary';
      saveBtn.textContent='💾 Alles speichern';
      saveBtn.disabled=!this.stateKey;
      saveBtn.addEventListener('click',()=>this.flushStateSave(true));
      controls.appendChild(saveBtn);

      contextSection.appendChild(controls);

      const inputSection=document.createElement('div');
      inputSection.className='nsf-section';
      const title=document.createElement('div');
      title.className='nsf-section-title';
      title.textContent='Findings auswählen';
      if(this.availableEntries.length){
        const badge=document.createElement('span');
        badge.className='nsf-count';
        badge.textContent=`${this.availableEntries.length} Einträge`;
        title.appendChild(badge);
      }
      inputSection.appendChild(title);

      const note=document.createElement('div');
      note.className='nsf-note';
      if(!this.meldung){
        note.textContent='Keine Meldung aktiv – Eingaben sind deaktiviert.';
      }else if(!this.currentPart&&!this.filterAll){
        note.textContent='Keine Partnummer in Aspen gefunden – bitte Datei laden oder Dictionary verwenden.';
      }else if(!this.availableEntries.length){
        if(this.filterAll){
          note.textContent='Keine Findings geladen.';
        }else if(this.currentPart){
          note.textContent=`Für PN ${this.currentPart} wurden keine Findings gefunden.`;
        }else{
          note.textContent='Keine Findings verfügbar.';
        }
      }else{
        note.textContent='Tippen, um Findings zu suchen. Mit Enter auswählen – es erscheint automatisch ein weiteres Eingabefeld.';
      }
      inputSection.appendChild(note);

      if(this.history.length){
        const historyContainer=document.createElement('div');
        const historyLabel=document.createElement('div');
        historyLabel.className='nsf-inline-info';
        historyLabel.textContent='Zuletzt verwendet:';
        const historyList=document.createElement('div');
        historyList.className='nsf-history';
        for(const entry of this.history){
          const chip=document.createElement('button');
          chip.type='button';
          chip.className='nsf-history-chip';
          chip.textContent=entry.finding||entry.label||'Finding';
          chip.addEventListener('click',()=>this.useEntry(entry));
          historyList.appendChild(chip);
        }
        historyContainer.append(historyLabel,historyList);
        inputSection.appendChild(historyContainer);
      }

      const inputsWrapper=document.createElement('div');
      inputsWrapper.className='nsf-input-wrapper';
      inputSection.appendChild(inputsWrapper);
      this.inputsContainer=inputsWrapper;

      if(this.meldung){
        if(this.selectedEntries.length){
          for(const entry of this.selectedEntries){
            this.addInputRow(entry,false);
          }
        }
        if(this.availableEntries.length){
          this.addInputRow(null,true);
        }
      }

      const outputsSection=document.createElement('div');
      outputsSection.className='nsf-section';
      const outputsTitle=document.createElement('div');
      outputsTitle.className='nsf-section-title';
      outputsTitle.textContent='Ausgaben';
      outputsSection.appendChild(outputsTitle);

      const outputsWrapper=document.createElement('div');
      outputsWrapper.className='nsf-outputs';
      outputsSection.appendChild(outputsWrapper);

      const outputDefs=[
        {key:'findings',label:'Findings'},
        {key:'actions',label:'Actions'},
        {key:'routine',label:'Routine'},
        {key:'nonroutine',label:'Nonroutine'},
        {key:'parts',label:'Bestellliste'}
      ];

      this.textareas={};
      for(const def of outputDefs){
        const box=document.createElement('div');
        box.className='nsf-output';
        const head=document.createElement('div');
        head.className='nsf-output-header';
        const label=document.createElement('span');
        label.textContent=def.label;
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='nsf-copy-btn';
        btn.textContent='📋';
        btn.title=`${def.label} kopieren`;
        const feedback=document.createElement('span');
        feedback.className='nsf-copy-feedback';
        feedback.textContent='✅';
        btn.appendChild(feedback);
        btn.addEventListener('click',()=>{
          const textarea=this.textareas[def.key];
          if(!textarea) return;
          copyText(textarea.value).then(success=>{
            if(!success) return;
            btn.classList.add('copied');
            setTimeout(()=>btn.classList.remove('copied'),1200);
          });
        });
        head.append(label,btn);
        const textarea=document.createElement('textarea');
        textarea.className='nsf-textarea';
        textarea.value=this.activeState[def.key]||'';
        textarea.disabled=!this.meldung;
        textarea.placeholder=this.meldung?`Text für ${def.label}…`:'Keine Meldung ausgewählt';
        textarea.addEventListener('input',()=>{
          this.activeState[def.key]=textarea.value;
          this.queueStateSave();
        });
        textarea.addEventListener('blur',()=>this.flushStateSave());
        this.textareas[def.key]=textarea;
        box.append(head,textarea);
        outputsWrapper.appendChild(box);
      }

      root.append(contextSection,inputSection,outputsSection);
    }

    renderEntryMeta(target,entry,options){
      if(!target) return;
      const config={
        showFinding:false,
        showLabel:true,
        showAction:true,
        showAdditional:true,
        ...options
      };
      target.innerHTML='';
      if(!entry){
        target.style.display='none';
        return;
      }
      const addLine=(label,value)=>{
        const text=formatMetaValue(value);
        if(!text) return;
        const row=document.createElement('div');
        const strong=document.createElement('strong');
        strong.textContent=`${label}:`;
        row.append(strong,document.createTextNode(` ${text}`));
        target.appendChild(row);
      };
      if(config.showFinding&&entry.finding) addLine('Finding',entry.finding);
      if(config.showLabel&&entry.label) addLine('Label',entry.label);
      if(config.showAction&&entry.action) addLine('Action',entry.action);
      if(entry.routine) addLine('Routine',entry.routine);
      if(entry.nonroutine) addLine('Nonroutine',entry.nonroutine);
      if(entry.parts) addLine('Parts',entry.parts);
      if(entry.times) addLine('Times',entry.times);
      if(entry.mods) addLine('Mods',entry.mods);
      if(config.showAdditional!==false&&Array.isArray(entry.additional)){
        for(const extra of entry.additional){
          const label=clean(extra.label||extra.key);
          const value=clean(extra.value);
          if(!label||!value) continue;
          addLine(label,value);
        }
      }
      target.style.display=target.childElementCount?'flex':'none';
    }

    addInputRow(prefillEntry,focusNext){
      const row=document.createElement('div');
      row.className='nsf-input-row';
      const removeBtn=document.createElement('button');
      removeBtn.type='button';
      removeBtn.className='nsf-remove-btn';
      removeBtn.textContent='✖';
      const input=document.createElement('input');
      input.type='text';
      input.className='nsf-input';
      input.placeholder=this.availableEntries.length?'Finding auswählen…':'Keine Findings verfügbar';
      input.disabled=!this.availableEntries.length;
      const suggestions=document.createElement('div');
      suggestions.className='nsf-suggestions';
      const helper=document.createElement('div');
      helper.className='nsf-input-helper';
      helper.style.display='none';
      const meta=document.createElement('div');
      meta.className='nsf-selected-meta';
      meta.style.display='none';
      row.append(removeBtn,input,suggestions,helper,meta);
      this.inputsContainer.appendChild(row);
      const state={
        row,
        input,
        suggestions,
        helper,
        meta,
        removeBtn,
        suggestionsList:[],
        highlightIndex:-1,
        locked:false,
        entry:null
      };
      const showHelper=entry=>{
        this.renderEntryMeta(helper,entry,{showFinding:true});
      };
      const closeSuggestions=()=>{
        row.classList.remove('show-suggestions');
        state.suggestionsList=[];
        state.highlightIndex=-1;
        suggestions.innerHTML='';
        if(!state.locked) showHelper(null);
      };
      const updateSuggestions=()=>{
        if(state.locked) return;
        const query=input.value.toLowerCase();
        const matches=this.availableEntries.filter(entry=>{
          if(!query) return true;
          if(entry.findingLower.includes(query)) return true;
          if(entry.labelLower.includes(query)) return true;
          if(entry.actionLower.includes(query)) return true;
          if(entry.routineLower&&entry.routineLower.includes(query)) return true;
          if(entry.nonroutineLower&&entry.nonroutineLower.includes(query)) return true;
          if(entry.partsLower&&entry.partsLower.includes(query)) return true;
          if(entry.timesLower&&entry.timesLower.includes(query)) return true;
          if(entry.modsLower&&entry.modsLower.includes(query)) return true;
          if(entry.additionalLower&&entry.additionalLower.some(val=>val&&val.includes(query))) return true;
          return false;
        }).slice(0,20);
        state.suggestionsList=matches;
        state.highlightIndex=matches.length?0:-1;
        suggestions.innerHTML='';
        if(!matches.length){
          closeSuggestions();
          return;
        }
        row.classList.add('show-suggestions');
        matches.forEach((entry,idx)=>{
          const item=document.createElement('div');
          item.className='nsf-suggestion';
          const label=document.createElement('div');
          label.className='nsf-suggestion-label';
          label.textContent=entry.finding||entry.label||'Eintrag';
          const finding=document.createElement('div');
          finding.className='nsf-suggestion-finding';
          finding.textContent=entry.label||entry.finding||'';
          const action=document.createElement('div');
          action.className='nsf-suggestion-action';
          action.textContent=entry.action||'';
          item.append(label,finding,action);
          item.addEventListener('mousedown',e=>{
            e.preventDefault();
            this.acceptSelection(entry,state);
          });
          suggestions.appendChild(item);
          if(idx===state.highlightIndex) item.classList.add('active');
        });
        if(state.highlightIndex>=0){
          showHelper(state.suggestionsList[state.highlightIndex]);
        }
      };
      const selectCurrent=()=>{
        if(state.highlightIndex<0) return;
        const entry=state.suggestionsList[state.highlightIndex];
        if(entry) this.acceptSelection(entry,state);
      };
      const updateHighlight=()=>{
        const children=Array.from(suggestions.children);
        children.forEach((child,idx)=>{
          if(idx===state.highlightIndex){
            child.classList.add('active');
            showHelper(state.suggestionsList[idx]);
          }else{
            child.classList.remove('active');
          }
        });
      };
      input.addEventListener('input',updateSuggestions);
      input.addEventListener('focus',updateSuggestions);
      input.addEventListener('keydown',e=>{
        if(state.locked) return;
        if(e.key==='ArrowDown'){
          if(state.suggestionsList.length){
            e.preventDefault();
            state.highlightIndex=(state.highlightIndex+1)%state.suggestionsList.length;
            updateHighlight();
          }
        }else if(e.key==='ArrowUp'){
          if(state.suggestionsList.length){
            e.preventDefault();
            state.highlightIndex=(state.highlightIndex-1+state.suggestionsList.length)%state.suggestionsList.length;
            updateHighlight();
          }
        }else if(e.key==='Enter'){
          if(state.suggestionsList.length){
            e.preventDefault();
            selectCurrent();
          }
        }else if(e.key==='Escape'){
          closeSuggestions();
        }
      });
      input.addEventListener('blur',()=>{
        setTimeout(()=>closeSuggestions(),150);
      });
      removeBtn.addEventListener('click',()=>{
        if(state.locked) this.removeSelection(state);
        else this.removeRow(state);
      });
      this.selectionRows.push(state);
      if(prefillEntry){
        this.lockRow(state,prefillEntry,{persist:false,addOutputs:false,updateState:false});
      }else if(focusNext){
        setTimeout(()=>{if(!state.locked) input.focus();},60);
      }
    }

    acceptSelection(entry,state){
      if(!entry||state.locked) return;
      this.lockRow(state,entry,{persist:true,addOutputs:true,updateState:true});
      this.undoBuffer=null;
      if(this.currentPart){
        pushHistory(this.globalState,this.currentPart,entry);
        this.history=getHistoryForPart(this.globalState,this.currentPart);
      }
      if(!this.selectionRows.some(s=>!s.locked)&&this.meldung&&this.availableEntries.length){
        this.addInputRow(null,true);
      }
    }

    lockRow(state,entry,options){
      if(!state||!entry) return;
      const opts=options||{};
      state.locked=true;
      state.entry={
        key:entry.key,
        finding:entry.finding||'',
        action:entry.action||'',
        label:entry.label||'',
        part:entry.part||this.currentPart||''
      };
      state.input.value=entry.finding||entry.label||entry.action||'Auswahl';
      state.input.disabled=true;
      state.row.classList.add('locked');
      state.row.classList.remove('show-suggestions');
      state.suggestions.innerHTML='';
      state.suggestionsList=[];
      state.highlightIndex=-1;
      if(state.helper){
        this.renderEntryMeta(state.helper,null,{showFinding:true});
      }
      this.renderEntryMeta(state.meta,entry,{showFinding:true});
      if(opts.addOutputs!==false){
        this.appendOutput('findings',entry.finding);
        this.appendOutput('actions',entry.action);
        this.appendOutput('parts',entry.part);
        if(entry.routine) this.appendOutput('routine',entry.routine);
        if(entry.nonroutine) this.appendOutput('nonroutine',entry.nonroutine);
        if(entry.parts) this.appendOutput('parts',entry.parts);
      }
      if(opts.persist!==false){
        this.addSelection(entry);
      }
      if(opts.updateState!==false){
        this.flushStateSave(true);
      }
    }

    addSelection(entry){
      if(!entry||!entry.key) return;
      if(!this.selectedEntries.some(sel=>sel.key===entry.key)){
        this.selectedEntries.push({
          key:entry.key,
          finding:entry.finding||'',
          action:entry.action||'',
          label:entry.label||'',
          part:entry.part||this.currentPart||''
        });
      }
    }

    useEntry(entry){
      if(!entry||!this.meldung) return;
      let target=this.selectionRows.find(row=>!row.locked);
      if(!target){
        if(!this.availableEntries.length&&this.filterAll) this.availableEntries=this.allEntries;
        if(!this.availableEntries.length) return;
        this.addInputRow(null,true);
        target=this.selectionRows.find(row=>!row.locked);
      }
      if(target) this.acceptSelection(entry,target);
    }

    removeRow(state){
      if(!state) return;
      const idx=this.selectionRows.indexOf(state);
      if(idx>=0) this.selectionRows.splice(idx,1);
      if(state.row&&state.row.parentNode) state.row.parentNode.removeChild(state.row);
    }

    removeSelection(state){
      if(!state||!state.locked) return;
      const entry=state.entry;
      if(entry){
        this.removeOutputsFor(entry);
        this.selectedEntries=this.selectedEntries.filter(sel=>sel.key!==entry.key);
        this.undoBuffer={entry:{...entry}};
      }
      this.removeRow(state);
      this.persistState(true);
      if(this.meldung&&this.availableEntries.length&&!this.selectionRows.some(s=>!s.locked)){
        this.addInputRow(null,true);
      }
      this.render();
    }

    removeOutputsFor(entry){
      this.removeOutput('findings',entry.finding);
      this.removeOutput('actions',entry.action);
      this.removeOutput('parts',entry.part);
      this.removeOutput('routine',entry.routine);
      this.removeOutput('nonroutine',entry.nonroutine);
      this.removeOutput('parts',entry.parts);
    }

    removeOutput(field,text){
      const value=clean(text);
      if(!value) return;
      const current=clean(this.activeState[field]);
      if(!current) return;
      const lines=current.split(/\r?\n/).map(v=>clean(v)).filter(Boolean);
      const filtered=lines.filter(line=>line!==value);
      const next=filtered.join('\n');
      if(next!==current){
        this.activeState[field]=next;
        const textarea=this.textareas[field];
        if(textarea) textarea.value=next;
      }
    }

    appendOutput(field,text){
      const value=clean(text);
      if(!value) return;
      const current=clean(this.activeState[field]);
      const lines=current?current.split(/\r?\n/).map(v=>clean(v)).filter(Boolean):[];
      if(!lines.includes(value)) lines.push(value);
      const next=lines.join('\n');
      if(next!==current){
        this.activeState[field]=next;
        const textarea=this.textareas[field];
        if(textarea) textarea.value=next;
      }
    }

    applyUndo(){
      if(!this.undoBuffer||!this.undoBuffer.entry) return;
      const entryKey=this.undoBuffer.entry.key;
      const entry=this.entryMap.get(entryKey)||this.undoBuffer.entry;
      this.undoBuffer=null;
      this.useEntry(entry);
    }

    clearCurrentState(){
      if(!this.stateKeyParts) return;
      this.activeState={findings:'',actions:'',routine:'',nonroutine:'',parts:''};
      this.selectedEntries=[];
      this.undoBuffer=null;
      for(const key of Object.keys(this.textareas||{})){
        const textarea=this.textareas[key];
        if(textarea) textarea.value='';
      }
      saveStateFor(this.stateKeyParts,this.activeState,this.selectedEntries,this.globalState);
      this.render();
    }

    queueStateSave(){
      if(!this.stateKeyParts) return;
      if(this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer=setTimeout(()=>{this.saveTimer=null;this.persistState();},SAVE_DEBOUNCE);
    }

    flushStateSave(force){
      if(!this.stateKeyParts) return;
      if(this.saveTimer){clearTimeout(this.saveTimer);this.saveTimer=null;}
      this.persistState(force);
    }

    persistState(force){
      if(!this.stateKeyParts) return;
      saveStateFor(this.stateKeyParts,this.activeState,this.selectedEntries,this.globalState);
      if(force){
        this.globalState=loadGlobalState();
        this.history=getHistoryForPart(this.globalState,this.currentPart);
      }
    }

    async handleAspenFile(file){
      if(!file) return;
      try{
        const content=await file.text();
        if(!content) return;
        let parsed=null;
        try{parsed=JSON.parse(content);}
        catch{parsed=null;}
        let payload='';
        if(parsed&&typeof parsed==='object'){
          payload=JSON.stringify(parsed);
        }else{
          const csvParsed=parseAspenCsv(content);
          if(csvParsed) payload=JSON.stringify(csvParsed);
        }
        if(payload){
          localStorage.setItem(DOC_KEY,payload);
          lastValues[DOC_KEY]=payload;
          scheduleAll();
        }
      }catch(err){
        console.warn('NSF: Aspen-Datei konnte nicht gelesen werden',err);
      }
    }
  }

  window.renderNewStandardFindings=function(root){
    if(!root) return;
    injectStyles();
    setupWatchers();
    let instance=root.__nsfInstance;
    if(!instance){
      instance=new ModuleInstance(root);
      root.__nsfInstance=instance;
      instances.add(instance);
    }
    instance.scheduleRender();
    return instance;
  };
})();
