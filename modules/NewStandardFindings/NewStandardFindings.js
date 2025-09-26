(function(){
  'use strict';

  const DATA_URL='Findings_Shopguide.json';
  const DATA_KEY='sf-data';
  const FINDINGS_PATH_KEY='sf-findings-path';
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
      .nsf-section{background:rgba(255,255,255,0.08);border-radius:1rem;padding:0.65rem 0.85rem;display:flex;flex-direction:column;gap:0.55rem;}
      .nsf-header-section{padding:0.4rem 0.6rem;gap:0.35rem;}
      .nsf-header-section.collapsed{padding:0.3rem 0.5rem;}
      .nsf-header-bar{display:flex;align-items:center;gap:0.5rem;font-size:0.78rem;line-height:1.2;}
      .nsf-header-toggle{background:rgba(255,255,255,0.12);border:none;border-radius:0.45rem;width:1.6rem;height:1.6rem;display:flex;align-items:center;justify-content:center;color:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-header-toggle:hover{background:rgba(255,255,255,0.22);transform:translateY(-1px);}
      .nsf-header-summary{flex:1;display:flex;align-items:center;flex-wrap:wrap;gap:0.55rem;font-weight:600;}
      .nsf-header-summary-item{white-space:nowrap;opacity:0.9;}
      .nsf-selection-section{padding:0;gap:0;overflow:visible;position:relative;}
      .nsf-selection-section.collapsed{overflow:hidden;}
      .nsf-selection-header{display:flex;align-items:center;gap:0.55rem;padding:0.55rem 0.7rem;border-bottom:1px solid rgba(255,255,255,0.08);cursor:pointer;}
      .nsf-selection-header:focus-within{outline:2px solid rgba(59,130,246,0.45);outline-offset:2px;}
      .nsf-selection-heading{display:flex;align-items:center;gap:0.4rem;font-size:0.95rem;font-weight:600;}
      .nsf-selection-summary{margin-left:auto;display:flex;align-items:center;flex-wrap:wrap;gap:0.35rem;font-size:0.78rem;line-height:1.2;}
      .nsf-selection-summary-chip{background:rgba(148,163,184,0.16);border-radius:999px;padding:0.2rem 0.55rem;font-weight:500;white-space:nowrap;}
      .nsf-selection-summary-more{opacity:0.75;font-weight:500;}
      .nsf-selection-summary-empty{opacity:0.6;font-style:italic;}
      .nsf-selection-body{display:flex;flex-direction:column;gap:0.6rem;padding:0.7rem 0.85rem;overflow:visible;}
      .nsf-selection-section.collapsed .nsf-selection-body{display:none;}
      .nsf-selection-section.collapsed .nsf-selection-heading{display:none;}
      .nsf-selection-section.collapsed .nsf-selection-summary{margin-left:0;}
      .nsf-selection-section.collapsed .nsf-selection-header{border-bottom:none;}
      .nsf-header-actions{display:flex;align-items:center;gap:0.35rem;}
      .nsf-header-action{background:rgba(255,255,255,0.12);border:none;border-radius:999px;padding:0.25rem 0.6rem;font:inherit;font-size:0.72rem;color:inherit;line-height:1;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-header-action:hover{background:rgba(255,255,255,0.22);transform:translateY(-1px);}
      .nsf-context{display:flex;flex-direction:column;gap:0.6rem;font-size:0.88rem;}
      .nsf-context-top{display:flex;flex-wrap:wrap;align-items:flex-start;gap:0.65rem;}
      .nsf-context-info{display:flex;flex-direction:column;gap:0.45rem;flex:1 1 320px;min-width:240px;}
      .nsf-context-header{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.55rem;align-items:stretch;}
      .nsf-context-item{background:rgba(15,23,42,0.2);border-radius:0.75rem;padding:0.45rem 0.6rem;display:flex;flex-direction:column;gap:0.2rem;min-height:0;}
      .nsf-context-label{opacity:0.65;font-weight:600;font-size:0.7rem;letter-spacing:0.05em;text-transform:uppercase;}
      .nsf-context-value{font-weight:600;color:var(--module-header-text,#fff);font-size:0.9rem;}
      .nsf-header-stats{display:flex;flex-wrap:wrap;align-items:center;gap:0.45rem;}
      .nsf-context-stat{background:rgba(59,130,246,0.16);color:var(--module-header-text,#fff);border-radius:0.75rem;padding:0.5rem 0.65rem;display:flex;flex-direction:column;gap:0.2rem;min-width:auto;border:1px solid rgba(59,130,246,0.32);box-shadow:none;}
      .nsf-context-stat-value{font-size:1rem;font-weight:700;}
      .nsf-context-stat-label{font-size:0.7rem;letter-spacing:0.07em;text-transform:uppercase;opacity:0.78;font-weight:600;}
      .nsf-context-stat-meta{font-size:0.74rem;opacity:0.75;line-height:1.3;}
      .nsf-context-meta{display:flex;flex-wrap:wrap;gap:0.35rem 0.85rem;padding:0.1rem 0;}
      .nsf-section-title{font-weight:600;font-size:0.98rem;display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap;}
      .nsf-section-title .nsf-count{opacity:0.7;font-size:0.82rem;font-weight:500;}
      .nsf-controls{display:flex;align-items:flex-start;gap:0.35rem;margin-left:auto;flex:0 0 auto;}
      .nsf-quick-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:0.25rem;}
      .nsf-icon-btn{background:rgba(255,255,255,0.14);border:none;border-radius:0.55rem;width:2rem;height:2rem;display:inline-flex;align-items:center;justify-content:center;color:inherit;font:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-icon-btn:hover{background:rgba(255,255,255,0.24);transform:translateY(-1px);}
      .nsf-icon-btn:disabled{opacity:0.45;cursor:not-allowed;background:rgba(255,255,255,0.12);transform:none;}
      .nsf-menu{position:relative;}
      .nsf-menu-toggle{background:rgba(255,255,255,0.14);border:none;border-radius:0.6rem;padding:0.35rem 0.55rem;color:inherit;font:inherit;font-size:0.95rem;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-width:2rem;min-height:2rem;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-menu-toggle:hover{background:rgba(255,255,255,0.24);transform:translateY(-1px);}
      .nsf-menu-list{position:absolute;right:0;margin-top:0.35rem;background:rgba(15,23,42,0.92);border-radius:0.75rem;box-shadow:0 12px 28px rgba(15,23,42,0.45);padding:0.35rem;display:none;flex-direction:column;min-width:200px;z-index:200;backdrop-filter:blur(10px);}
      .nsf-menu.open .nsf-menu-list{display:flex;}
      .nsf-menu-item{background:transparent;border:none;border-radius:0.6rem;padding:0.45rem 0.75rem;color:inherit;font:inherit;text-align:left;cursor:pointer;display:flex;align-items:center;gap:0.5rem;}
      .nsf-menu-item:hover{background:rgba(59,130,246,0.18);}
      .nsf-menu-item:disabled{opacity:0.5;cursor:not-allowed;background:transparent;}
      .nsf-btn{background:rgba(255,255,255,0.14);border:none;border-radius:0.75rem;padding:0.45rem 0.9rem;color:inherit;font:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;display:inline-flex;align-items:center;gap:0.35rem;}
      .nsf-btn:hover{background:rgba(255,255,255,0.24);transform:translateY(-1px);}
      .nsf-btn.secondary{background:rgba(148,163,184,0.2);}
      .nsf-btn.secondary:hover{background:rgba(148,163,184,0.32);}
      .nsf-btn.danger{background:rgba(248,113,113,0.22);}
      .nsf-btn.danger:hover{background:rgba(248,113,113,0.35);}
      .nsf-history-container{background:rgba(15,23,42,0.18);border-radius:0.9rem;padding:0.6rem 0.75rem;display:flex;flex-direction:column;gap:0.45rem;}
      .nsf-history-header{font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;opacity:0.75;display:flex;align-items:center;gap:0.35rem;}
      .nsf-history{display:flex;flex-wrap:wrap;gap:0.45rem;}
      .nsf-history-chip{background:rgba(148,163,184,0.16);border:1px solid rgba(148,163,184,0.35);border-radius:0.65rem;padding:0.35rem 0.65rem;font:inherit;font-size:0.78rem;color:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease,box-shadow 0.15s ease;display:inline-flex;align-items:center;gap:0.35rem;line-height:1;}
      .nsf-history-chip:hover{background:rgba(59,130,246,0.2);transform:translateY(-1px);box-shadow:0 10px 18px rgba(15,23,42,0.3);}
      .nsf-chip-icon{font-size:0.85rem;opacity:0.75;}
      .nsf-chip-text{font-weight:500;}
      .nsf-input-wrapper{display:flex;flex-direction:column;gap:0.5rem;}
      .nsf-input-row{position:relative;background:rgba(15,23,42,0.18);border-radius:0.85rem;padding:0.55rem 0.65rem;display:flex;flex-direction:column;gap:0.35rem;z-index:1;}
      .nsf-input-row.show-suggestions{z-index:120;}
      .nsf-input-field{position:relative;display:flex;align-items:center;width:100%;}
      .nsf-input-row.locked{background:rgba(15,23,42,0.28);}
      .nsf-remove-btn{position:absolute;top:50%;right:0.45rem;transform:translateY(-50%);background:rgba(248,113,113,0.25);border:none;border-radius:999px;color:inherit;width:2rem;height:2rem;display:flex;align-items:center;justify-content:center;font-size:1rem;cursor:pointer;opacity:0.9;transition:background 0.15s ease,opacity 0.15s ease,transform 0.15s ease;}
      .nsf-remove-btn:hover{background:rgba(248,113,113,0.4);opacity:1;transform:translateY(-50%) scale(1.05);}
      .nsf-input{width:100%;border:none;border-radius:0.65rem;padding:0.55rem 2.7rem 0.55rem 0.7rem;font:inherit;color:var(--sidebar-module-card-text,#111);background:var(--sidebar-module-card-bg,#fff);}
      .nsf-input:disabled{opacity:0.75;background:rgba(255,255,255,0.65);cursor:not-allowed;}
      .nsf-input::placeholder{color:rgba(107,114,128,0.8);}
      .nsf-suggestions{position:absolute;top:calc(100% - 0.2rem);left:0;right:0;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border-radius:0.75rem;box-shadow:0 12px 28px rgba(15,23,42,0.4);padding:0.35rem;display:none;max-height:220px;overflow:auto;z-index:180;}
      .nsf-input-row.show-suggestions .nsf-suggestions{display:block;}
      .nsf-suggestion{padding:0.35rem 0.55rem;border-radius:0.6rem;cursor:pointer;display:flex;align-items:center;gap:0.35rem;}
      .nsf-suggestion:hover,.nsf-suggestion.active{background:rgba(59,130,246,0.12);}
      .nsf-suggestion-label{font-weight:600;font-size:0.9rem;}
      .nsf-suggestion-finding{font-size:0.85rem;opacity:0.85;}
      .nsf-suggestion-action{font-size:0.8rem;opacity:0.65;}
      .nsf-empty{opacity:0.75;font-style:italic;}
      .nsf-outputs{display:flex;flex-direction:column;gap:0.75rem;}
      .nsf-output{background:rgba(15,23,42,0.18);border-radius:0.9rem;padding:0.6rem 0.75rem;display:flex;flex-direction:column;gap:0.45rem;min-height:0;}
      .nsf-output-header{display:flex;align-items:center;justify-content:space-between;font-weight:600;}
      .nsf-copy-btn{background:rgba(255,255,255,0.16);border:none;border-radius:0.6rem;padding:0.3rem 0.5rem;color:inherit;font:inherit;cursor:pointer;transition:background 0.15s ease;display:flex;align-items:center;gap:0.3rem;}
      .nsf-copy-btn:hover{background:rgba(255,255,255,0.28);}
      .nsf-copy-btn.copied{background:rgba(16,185,129,0.35);}
      .nsf-copy-btn .nsf-copy-feedback{font-size:0.85rem;opacity:0;transition:opacity 0.15s ease;}
      .nsf-copy-btn.copied .nsf-copy-feedback{opacity:1;}
      .nsf-textarea{flex:1;min-height:120px;border:none;border-radius:0.75rem;padding:0.6rem 0.65rem;font:inherit;resize:vertical;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);overflow:hidden;}
      .nsf-textarea:disabled{opacity:0.6;background:rgba(255,255,255,0.5);cursor:not-allowed;}
      .nsf-note{font-size:0.8rem;opacity:0.75;}
      .nsf-alert{background:rgba(248,113,113,0.2);border-radius:0.75rem;padding:0.5rem 0.75rem;font-size:0.85rem;}
      .nsf-inline-info{font-size:0.8rem;opacity:0.7;}
      .nsf-hidden{display:none !important;}
      .nsf-parts-grid{display:flex;flex-direction:column;gap:0.6rem;}
      .nsf-part-group{display:flex;flex-direction:column;gap:0.45rem;background:rgba(15,23,42,0.22);border-radius:0.95rem;padding:0.6rem;border:1px solid rgba(148,163,184,0.18);}
      .nsf-part-group+.nsf-part-group{margin-top:0.35rem;}
      .nsf-part-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.55rem;}
      .nsf-part-row+.nsf-part-row{border-top:1px solid rgba(148,163,184,0.18);padding-top:0.45rem;margin-top:0.45rem;}
      .nsf-part-field{display:flex;flex-direction:column;gap:0.35rem;}
      .nsf-part-field-label{font-size:0.7rem;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;opacity:0.7;}
      .nsf-part-field-input{border:none;border-radius:0.65rem;padding:0.55rem 0.65rem;font:inherit;color:var(--sidebar-module-card-text,#111);background:var(--sidebar-module-card-bg,#fff);}
      .nsf-part-field-input:focus{outline:2px solid rgba(59,130,246,0.45);outline-offset:2px;}
      .nsf-part-field-input::placeholder{color:rgba(107,114,128,0.75);}
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
    updateValue(FINDINGS_PATH_KEY);
    window.addEventListener('storage',e=>{
      if(!e) return;
      if(e.key===DOC_KEY||e.key===DATA_KEY||e.key===STATE_KEY||e.key===FINDINGS_PATH_KEY){
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
      const findingsPath=localStorage.getItem(FINDINGS_PATH_KEY);
      if(findingsPath!==lastValues[FINDINGS_PATH_KEY]){lastValues[FINDINGS_PATH_KEY]=findingsPath;scheduleAll();}
    },WATCH_INTERVAL);
  }

  function clean(value){return value==null?'':String(value).trim();}
  function stripNonRoutineFindingPrefix(value){
    const text=clean(value);
    if(!text) return '';
    return text.replace(/^\s*non\s*routine\s*finding:\s*/i,'').trim();
  }
  function pushUniqueLine(list,set,value){
    const text=clean(value);
    if(!text) return;
    const key=text.toLowerCase();
    if(set.has(key)) return;
    set.add(key);
    list.push(text);
  }
  function parsePartsDetails(rawValue,options){
    const opts=options||{};
    const titles=[];
    const titleKeys=new Set();
    const pairs=[];
    const pairKeys=new Set();
    const groups=[];
    let currentGroupIndex=-1;
    const ensureGroupIndex=()=>{
      if(currentGroupIndex>-1) return currentGroupIndex;
      const group={title:'',parts:[]};
      currentGroupIndex=groups.length;
      groups.push(group);
      return currentGroupIndex;
    };
    const createGroup=(value)=>{
      const title=clean(value);
      const group={title,parts:[]};
      currentGroupIndex=groups.length;
      groups.push(group);
      if(title) pushUniqueLine(titles,titleKeys,title);
      return currentGroupIndex;
    };
    const fallbackParts=Array.isArray(opts.fallbackParts)?opts.fallbackParts:[];
    const fallbackPartSet=new Set(fallbackParts.map(normalizePart).filter(Boolean));
    if(!rawValue) return {titles,pairs,groups};
    const lines=String(rawValue).split(/\r?\n/).map(line=>clean(line)).filter(Boolean);
    if(!lines.length) return {titles,pairs,groups};
    const pairMap=new Map();
    const orderKeys=[];
    const knownParts=new Set();
    const ensurePair=(key)=>{
      const resolvedKey=key==null?`auto-${orderKeys.length}`:key;
      if(!pairMap.has(resolvedKey)){
        const groupIndex=ensureGroupIndex();
        pairMap.set(resolvedKey,{part:'',quantity:'',order:orderKeys.length,groupIndex});
        orderKeys.push(resolvedKey);
      }
      return pairMap.get(resolvedKey);
    };
    let lastKey=null;
    const skipByPartValue=value=>{
      const normalized=normalizePart(value);
      if(!normalized) return false;
      if(fallbackPartSet.has(normalized)) return true;
      if(knownParts.has(normalized)) return true;
      return false;
    };
    const extractIndex=key=>{
      if(!key) return null;
      const compact=key.replace(/\s+/g,'');
      const match=compact.match(/(\d+)/);
      if(!match) return null;
      const num=parseInt(match[1],10);
      return Number.isNaN(num)?null:num;
    };
    lines.forEach(line=>{
      const colonIndex=line.indexOf(':');
      if(colonIndex> -1){
        const rawKey=line.slice(0,colonIndex).trim();
        let value=line.slice(colonIndex+1).trim();
        if(!value) return;
        const normalizedKey=rawKey.toLowerCase();
        const normalizedCompact=normalizedKey.replace(/\s+/g,'');
        if(/label|beschreibung|description|partnummer|part number|teilenummer/.test(normalizedKey)){
          return;
        }
        if(/bestell|pntext|ordertext|ordertitle/.test(normalizedKey)){
          createGroup(value);
          lastKey=null;
          return;
        }
        if(/^(part|pn|artikel)/.test(normalizedKey)){
          const index=extractIndex(normalizedCompact);
          if(index==null && skipByPartValue(value)){
            lastKey=null;
            return;
          }
          const key=index!=null?`index-${index}`:`auto-${orderKeys.length}`;
          const pair=ensurePair(key);
          pair.part=value;
          const normalizedPart=normalizePart(value);
          if(normalizedPart) knownParts.add(normalizedPart);
          lastKey=key;
          return;
        }
        if(/^(menge|qty|quantity|anzahl|stck|stück)/.test(normalizedKey)){
          const index=extractIndex(normalizedCompact);
          const key=index!=null?`index-${index}`:(lastKey||`auto-${orderKeys.length}`);
          const pair=ensurePair(key);
          pair.quantity=value;
          lastKey=key;
          return;
        }
        if(skipByPartValue(value)){
          lastKey=null;
          return;
        }
        createGroup(value);
        lastKey=null;
        return;
      }
      if(skipByPartValue(line)){
        lastKey=null;
        return;
      }
      createGroup(line);
      lastKey=null;
    });
    const orderedPairs=Array.from(pairMap.values())
      .sort((a,b)=>a.order-b.order)
      .map(entry=>({
        part:clean(entry.part),
        quantity:clean(entry.quantity),
        groupIndex:typeof entry.groupIndex==='number'?entry.groupIndex:-1
      }))
      .filter(entry=>entry.part||entry.quantity);
    const groupParts=groups.map(group=>({
      title:clean(group.title),
      parts:[]
    }));
    orderedPairs.forEach(entry=>{
      const partKey=normalizePart(entry.part);
      const quantityKey=(entry.quantity||'').toLowerCase();
      const key=`${partKey}||${quantityKey}`;
      if(pairKeys.has(key)) return;
      pairKeys.add(key);
      pairs.push({part:entry.part,quantity:entry.quantity});
      const idx=entry.groupIndex>=0&&entry.groupIndex<groupParts.length
        ? entry.groupIndex
        : (groupParts.length?groupParts.length-1:-1);
      if(idx>=0){
        groupParts[idx].parts.push({part:entry.part,quantity:entry.quantity});
      }else{
        groupParts.push({title:'',parts:[{part:entry.part,quantity:entry.quantity}]});
      }
    });
    const filledGroups=groupParts.filter(group=>group.title||group.parts.length);
    filledGroups.forEach(group=>{
      if(group.title) pushUniqueLine(titles,titleKeys,group.title);
    });
    return {titles,pairs,groups:filledGroups};
  }
  function buildPartsData(titles,groups){
    const normalizedTitles=Array.isArray(titles)
      ? titles.map(title=>clean(title)).filter(Boolean)
      : [];
    const partCopyLines=[];
    const usedTitles=new Set();
    const groupsOutput=[];
    let rowCounter=0;
    const makeRow=(pnValue,partValue,quantityValue)=>{
      rowCounter+=1;
      return {
        pnLabel:`PN ${rowCounter}`,
        pnValue,
        partLabel:`Part ${rowCounter}`,
        partValue,
        quantityLabel:`Menge ${rowCounter}`,
        quantityValue
      };
    };
    if(Array.isArray(groups)&&groups.length){
      groups.forEach(group=>{
        const titleText=clean(group&&group.title);
        const partsArray=Array.isArray(group&&group.parts)?group.parts:[];
        if(partsArray.length){
          const groupRows=[];
          partsArray.forEach((pair,index)=>{
            const partText=clean(pair.part);
            const quantityText=clean(pair.quantity);
            if(partText) partCopyLines.push(partText);
            const pnValue=index===0?titleText:'';
            groupRows.push(makeRow(pnValue,partText,quantityText));
          });
          if(titleText) usedTitles.add(titleText.toLowerCase());
          groupsOutput.push({title:titleText,rows:groupRows});
        }else if(titleText){
          usedTitles.add(titleText.toLowerCase());
          groupsOutput.push({title:titleText,rows:[makeRow(titleText,'','')]});
        }
      });
    }
    normalizedTitles.forEach(title=>{
      const key=title.toLowerCase();
      if(usedTitles.has(key)) return;
      usedTitles.add(key);
      groupsOutput.push({title,rows:[makeRow(title,'','')]});
    });
    const text=partCopyLines.join('\n');
    return {text,rows:groupsOutput};
  }
  function normalizePart(value){
    const text=clean(value);
    return text?text.toUpperCase():'';
  }
  function normalizePartNumbersList(value){
    const list=[];
    const pushValue=(candidate)=>{
      if(candidate==null) return;
      if(typeof candidate==='object') return;
      const normalized=normalizePart(candidate);
      if(!normalized) return;
      if(!list.includes(normalized)) list.push(normalized);
    };
    if(Array.isArray(value)){
      value.forEach(pushValue);
    }else if(value!=null&&value!==''){
      if(typeof value==='string'){
        const segments=value.split(/\r?\n/);
        if(segments.length>1){segments.forEach(pushValue);}else{pushValue(value);}
      }else{
        pushValue(value);
      }
    }
    return list;
  }
  function matchesPartNumber(pattern,value){
    const pat=clean(pattern).toLowerCase();
    const val=clean(value).toLowerCase();
    if(!pat||!val) return false;
    if(!pat.includes('*')) return pat===val;
    if(pat==='*') return true;
    const startsWithStar=pat.startsWith('*');
    const endsWithStar=pat.endsWith('*');
    const core=pat.slice(startsWithStar?1:0,pat.length-(endsWithStar?1:0));
    if(startsWithStar&&endsWithStar){
      if(!core) return true;
      return val.includes(core);
    }
    if(startsWithStar){
      return val.endsWith(core);
    }
    if(endsWithStar){
      return val.startsWith(core);
    }
    const starIndex=pat.indexOf('*');
    if(starIndex>=0){
      const prefix=pat.slice(0,starIndex);
      const suffix=pat.slice(starIndex+1);
      if(prefix&&suffix) return val.startsWith(prefix)&&val.endsWith(suffix);
      if(prefix) return val.startsWith(prefix);
      if(suffix) return val.endsWith(suffix);
    }
    return false;
  }
  function getEntryPartNumbers(entry){
    if(entry&&Array.isArray(entry.partNumbers)&&entry.partNumbers.length){
      return entry.partNumbers;
    }
    if(entry&&entry.part){
      return [entry.part];
    }
    return [];
  }
  function resolveMatchedPart(entry,currentPart){
    const normalizedCurrent=normalizePart(currentPart);
    if(normalizedCurrent){
      const patterns=getEntryPartNumbers(entry);
      if(patterns.some(pattern=>matchesPartNumber(pattern,normalizedCurrent))){
        return normalizedCurrent;
      }
    }
    const fallback=normalizePart(entry&&entry.part);
    return fallback||normalizedCurrent||'';
  }
  function compareEntries(a,b){
    const aLabel=clean(a&&a.label);
    const bLabel=clean(b&&b.label);
    const labelCmp=aLabel.localeCompare(bLabel,'de',{sensitivity:'base'});
    if(labelCmp!==0) return labelCmp;
    const aFinding=clean(a&&a.finding);
    const bFinding=clean(b&&b.finding);
    return aFinding.localeCompare(bFinding,'de',{sensitivity:'base'});
  }
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

  const ROUTINE_FINDING_ALIASES=[
    'routinefinding','routinefindings','routinefindingtext','routine_findings','routine findings',
    'routinefindingdescription','routinefindingdesc','routinefindingdetail','routinefindingsbeschreibung'
  ];
  const ROUTINE_ACTION_ALIASES=[
    'routineaction','routineactions','routineactiontext','routine_action','routine action',
    'routinemassnahme','routinemassnahmen','routinemaßnahme','routinemaßnahmen','routinecorrectiveaction'
  ];
  const NONROUTINE_FINDING_ALIASES=[
    'nonroutinefinding','nonroutinefindings','nonroutinefindingtext','nonroutine_findings','non routine findings',
    'nonroutinefindingdescription','nonroutinefindingdesc','nonroutinefindingdetail','nonroutinefindingsbeschreibung'
  ];
  const NONROUTINE_ACTION_ALIASES=[
    'nonroutineaction','nonroutineactions','nonroutineactiontext','nonroutine_action','non routine action',
    'nonroutinemassnahme','nonroutinemassnahmen','nonroutinemaßnahme','nonroutinemaßnahmen','nonroutinecorrectiveaction'
  ];

  const FIELD_ALIASES={
    part:[
      'part','partno','partnumber','partnr','pn','pnr','part_num','part_nummer','partnumber','part number',
      'material','materialnr','materialnummer','materialno','material no','artikel','artikelnummer','artikel nr',
      'component','componentno','componentnumber','partnummer'
    ],
    label:['label','title','name','beschreibung','desc','description','heading','überschrift','ueberschrift'],
    finding:['finding','findings','findingtext','finding_text','befund','befunde','meldungstext','meldung','meldungen','befundtext'],
    action:['action','actions','maßnahme','massnahme','maßnahmen','massnahmen','recommendation','empfehlung','correctiveaction','corrective_action','korrekturmaßnahme','korrektur'],
    routine:['routine','routinetext','routine_text','routinebeschreibung'],
    nonroutine:['nonroutine','non_routine','nonroutinebeschreibung','non routine','non-routine'],
    parts:['parts','ersatzteile','replacementparts','replacedparts','teile','bestellliste','spares','components'],
    times:['times','time','zeit','zeiten','dauer','aufwand','arbeitszeit','stunden','timeestimate','time_estimate'],
    mods:['mods','mod','modification','modifications','modifikation','modifikationen','changes','change','änderungen','aenderungen','modnotes']
  };

  const SERIAL_FIELD_ALIASES=[
    'serial','serialno','serialnumber','serial_nr','serialnr','serial_no','serial nr','serial no','serial number',
    'serial-number','serialnummer','seriennummer','seriennr','serien nr','serien-nummer','sn','s/n','snr'
  ];

  const DICTIONARY_LABEL_ALIASES=[
    'meldung','meldungsnr','meldungsnummer','meldungsno','meldungno','meldungsid','meldungid','meldungsname','melding',
    'meldungscode','meldungstext','meldung_text','meldung title','key','label','finding','beschreibung','description','title','name'
  ];
  const DICTIONARY_PART_ALIASES=[
    ...FIELD_ALIASES.part,
    'value','wert','pn','pnr','partvalue','part_value','materialnummer','materialnr'
  ];

  const RESERVED_FIELDS=new Set(Object.values(FIELD_ALIASES).flat().map(canonicalKey));
  [...ROUTINE_FINDING_ALIASES,
    ...ROUTINE_ACTION_ALIASES,
    ...NONROUTINE_FINDING_ALIASES,
    ...NONROUTINE_ACTION_ALIASES
  ].forEach(alias=>{
    const key=canonicalKey(alias);
    if(key) RESERVED_FIELDS.add(key);
  });
  RESERVED_FIELDS.add('finding');
  RESERVED_FIELDS.add('label');
  RESERVED_FIELDS.add('action');
  RESERVED_FIELDS.add('part');
  RESERVED_FIELDS.add('partnumbers');

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
      const pairs=[];
      for(const [rawKey,rawVal] of Object.entries(value)){
        const keyLabel=clean(rawKey);
        if(!keyLabel) continue;
        const nested=valueToText(rawVal);
        if(!nested) continue;
        pairs.push(`${keyLabel}: ${nested}`);
      }
      if(pairs.length) return pairs.join('\n');
      try{
        const serialized=JSON.stringify(value);
        return clean(serialized);
      }catch{
        return '';
      }
    }
    return clean(value);
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

  function extractNestedField(raw,aliases,visited){
    if(!raw||typeof raw!=='object') return '';
    const seen=visited||new Set();
    if(seen.has(raw)) return '';
    seen.add(raw);
    const map=buildFieldMap(raw);
    const objectMatches=[];
    for(const alias of aliases){
      const key=canonicalKey(alias);
      if(!key||!Object.prototype.hasOwnProperty.call(map,key)) continue;
      const value=map[key];
      if(value==null) continue;
      if(typeof value==='object'){
        objectMatches.push(value);
      }else{
        const text=valueToText(value);
        if(text) return text;
      }
    }
    for(const candidate of objectMatches){
      const nested=extractNestedField(candidate,aliases,seen);
      if(nested) return nested;
      const fallback=valueToText(candidate);
      if(fallback) return fallback;
    }
    for(const value of Object.values(raw)){
      if(value==null) continue;
      if(Array.isArray(value)){
        for(const item of value){
          const nested=extractNestedField(item,aliases,seen);
          if(nested) return nested;
        }
        continue;
      }
      if(typeof value==='object'){
        const nested=extractNestedField(value,aliases,seen);
        if(nested) return nested;
      }
    }
    return '';
  }

  function hasNestedField(raw,aliases){
    return !!extractNestedField(raw,aliases);
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
      if(!isDictionary){
        const hasPart=hasNestedField(value,FIELD_ALIASES.part);
        const hasContent=hasNestedField(value,FIELD_ALIASES.finding)
          ||hasNestedField(value,FIELD_ALIASES.action)
          ||hasNestedField(value,FIELD_ALIASES.label);
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
        if(!localStorage.getItem(FINDINGS_PATH_KEY)){
          localStorage.setItem(FINDINGS_PATH_KEY,DATA_URL);
          lastValues[FINDINGS_PATH_KEY]=DATA_URL;
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
      const patterns=getEntryPartNumbers(entry);
      const seen=new Set();
      for(const pattern of patterns){
        if(!pattern||pattern.includes('*')) continue;
        if(seen.has(pattern)) continue;
        seen.add(pattern);
        if(!partMap.has(pattern)) partMap.set(pattern,[]);
        partMap.get(pattern).push(entry);
      }
      if(!seen.size&&entry.part&&entry.part.includes('*')===false){
        if(!partMap.has(entry.part)) partMap.set(entry.part,[]);
        partMap.get(entry.part).push(entry);
      }
      entryMap.set(entry.key,entry);
    }
    for(const list of partMap.values()){
      list.sort(compareEntries);
    }
    return {entries:normalizedEntries,partMap,dictionary,entryMap};
  }

  function collectEntriesForPart(part,entries,partMap){
    const normalized=normalizePart(part);
    if(!normalized) return [];
    const seen=new Set();
    const result=[];
    const addEntry=(entry)=>{
      if(!entry||!entry.key) return;
      if(seen.has(entry.key)) return;
      seen.add(entry.key);
      result.push(entry);
    };
    if(partMap instanceof Map&&partMap.has(normalized)){
      const directList=partMap.get(normalized)||[];
      directList.forEach(addEntry);
    }
    if(Array.isArray(entries)){
      for(const entry of entries){
        if(!entry||seen.has(entry.key)) continue;
        const patterns=getEntryPartNumbers(entry);
        if(!patterns.length) continue;
        if(patterns.some(pattern=>matchesPartNumber(pattern,normalized))){
          addEntry(entry);
        }
      }
    }
    if(result.length>1){
      result.sort(compareEntries);
    }
    return result;
  }

  function normalizeEntries(list){
    if(!Array.isArray(list)) return [];
    const counts=new Map();
    const result=[];
    for(const raw of list){
      if(!raw||typeof raw!=='object') continue;
      let part=normalizePart(extractNestedField(raw,FIELD_ALIASES.part));
      const label=clean(extractNestedField(raw,FIELD_ALIASES.label));
      const finding=clean(extractNestedField(raw,FIELD_ALIASES.finding));
      const action=clean(extractNestedField(raw,FIELD_ALIASES.action));
      const routineFinding=clean(extractNestedField(raw,ROUTINE_FINDING_ALIASES));
      const routineAction=clean(extractNestedField(raw,ROUTINE_ACTION_ALIASES));
      const routine=clean(extractNestedField(raw,FIELD_ALIASES.routine));
      const nonroutineFinding=clean(extractNestedField(raw,NONROUTINE_FINDING_ALIASES));
      const nonroutineAction=clean(extractNestedField(raw,NONROUTINE_ACTION_ALIASES));
      const nonroutine=clean(extractNestedField(raw,FIELD_ALIASES.nonroutine));
      const partsText=clean(extractNestedField(raw,FIELD_ALIASES.parts));
      const times=clean(extractNestedField(raw,FIELD_ALIASES.times));
      const mods=clean(extractNestedField(raw,FIELD_ALIASES.mods));
      const map=buildFieldMap(raw);
      const partNumbersFromField=normalizePartNumbersList(map.partnumbers);
      const partSet=new Set();
      if(part) partSet.add(part);
      for(const candidate of partNumbersFromField){
        if(candidate) partSet.add(candidate);
      }
      if(!part&&partSet.size){
        for(const candidate of partSet){
          if(candidate&&candidate.includes('*')) continue;
          part=candidate;
          break;
        }
        if(!part){
          const first=partSet.values().next().value;
          if(first) part=first;
        }
      }
      if(!part&&( !finding && !action && !label)) continue;
      if(!part) continue;
      if(!partSet.size) partSet.add(part);
      else if(part&&!partSet.has(part)) partSet.add(part);
      const partNumbers=Array.from(partSet);
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
      const baseKeyParts=[part,label,finding,action,routine,routineFinding,routineAction,nonroutine,nonroutineFinding,nonroutineAction,partsText,times,mods];
      if(extrasKeyParts.length) baseKeyParts.push(...extrasKeyParts);
      const baseKey=baseKeyParts.join('||');
      const count=counts.get(baseKey)||0;
      counts.set(baseKey,count+1);
      const key=count?`${baseKey}__${count}`:baseKey;
      const labelValue=label||'';
      const findingValue=finding||'';
      const actionValue=action||'';
      const routineValue=routine||'';
      const routineFindingValue=routineFinding||'';
      const routineActionValue=routineAction||'';
      const nonroutineValue=nonroutine||'';
      const nonroutineFindingValue=nonroutineFinding||'';
      const nonroutineActionValue=nonroutineAction||'';
      const partsValue=partsText||'';
      const timesValue=times||'';
      const modsValue=mods||'';
      result.push({
        key,
        part,
        partNumbers,
        label:labelValue,
        finding:findingValue,
        action:actionValue,
        routine:routineValue,
        routineFinding:routineFindingValue,
        routineAction:routineActionValue,
        nonroutine:nonroutineValue,
        nonroutineFinding:nonroutineFindingValue,
        nonroutineAction:nonroutineActionValue,
        parts:partsValue,
        times:timesValue,
        mods:modsValue,
        additional:extras,
        additionalLower:extras.map(item=>item.valueLower),
        labelLower:labelValue.toLowerCase(),
        findingLower:findingValue.toLowerCase(),
        actionLower:actionValue.toLowerCase(),
        routineLower:[routineValue,routineFindingValue,routineActionValue].filter(Boolean).join('\n').toLowerCase(),
        routineFindingLower:routineFindingValue.toLowerCase(),
        routineActionLower:routineActionValue.toLowerCase(),
        nonroutineLower:[nonroutineValue,nonroutineFindingValue,nonroutineActionValue].filter(Boolean).join('\n').toLowerCase(),
        nonroutineFindingLower:nonroutineFindingValue.toLowerCase(),
        nonroutineActionLower:nonroutineActionValue.toLowerCase(),
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
        const part=normalizePart(partRaw);
        if(!meld||!part) continue;
        map.set(normalizeKey(meld),part);
      }
    }else if(input&&typeof input==='object'){
      for(const [meldung,partVal] of Object.entries(input)){
        const meld=clean(meldung);
        let part='';
        if(partVal&&typeof partVal==='object'){
          part=normalizePart(valueToText(partVal));
        }else{
          part=normalizePart(partVal);
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
      const value=normalizePart(candidate);
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
    if(!serial){
      const nestedSerial=clean(extractNestedField(general,SERIAL_FIELD_ALIASES));
      if(nestedSerial) serial=nestedSerial;
    }
    const repairOrderCandidates=[
      general&&general.RepairOrder,
      general&&general.repairOrder,
      general&&general.REPAIR_ORDER,
      general&&general.Repairorder,
      general&&general.repairorder,
      general&&general['Repair Order'],
      general&&general['repair order'],
      general&&general['REPAIR ORDER'],
      general&&general.Repair_Order,
      general&&general['Repair_Order']
    ];
    let repairOrder='';
    for(const candidate of repairOrderCandidates){
      const value=clean(candidate);
      if(value){repairOrder=value;break;}
    }
    const hasDoc=!!docRaw;
    return {docRaw,meldung,part,serial,repairOrder,hasDoc};
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
    const nestedSources=[data,entry.general,entry.General];
    for(const source of nestedSources){
      if(!source||typeof source!=='object') continue;
      const nested=clean(extractNestedField(source,SERIAL_FIELD_ALIASES));
      if(nested) return nested;
    }
    const fallback=clean(extractNestedField(entry,SERIAL_FIELD_ALIASES));
    if(fallback) return fallback;
    return '';
  }

  function extractPartFromBoard(entry){
    if(!entry||typeof entry!=='object') return '';
    const direct=normalizePart(entry.part||entry.Part||entry.PartNo||entry.PartNumber||entry.PartNr||entry.PN||entry.Material||entry.MaterialNr||entry.Materialnummer||entry.MaterialNo||entry.Artikel||entry.Artikelnummer||entry.Partnummer||entry['Part No']||entry['Part_Number']||entry['PartNumber']||entry['Part Nr']);
    if(direct) return direct;
    const candidates=['part','partno','partnumber','part_no','part-number','part number','partnr','part nr','pn','material','materialnr','materialnummer','materialno','material nr','material-nr','artikel','artikelnummer','artikel nr','artikel-nr','partnummer'];
    const data=entry.data&&typeof entry.data==='object'?entry.data:{};
    for(const [key,value] of Object.entries(data)){
      if(!value) continue;
      const lower=key.toLowerCase();
      if(candidates.includes(lower)){
        const cleanVal=normalizePart(value);
        if(cleanVal) return cleanVal;
      }
    }
    for(const field of ['PartNo','PartNumber','Part_No','Part Number','Part_Number','PartNr','Part Nr','Part-Nr','Material','MaterialNr','Materialnummer','MaterialNo','Material Nr','Material-Nr','Artikel','Artikelnummer','Artikel Nr','Artikel-Nr','Partnummer']){
      const candidate=normalizePart(data[field]);
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
    const part=normalizePart(parts.part);
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
          part:typeof sel.part==='string'?normalizePart(sel.part):''
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
            part:typeof sel.part==='string'?normalizePart(sel.part):''
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
      ? {meldung:clean(keyParts.meldung),part:normalizePart(keyParts.part),serial:clean(keyParts.serial)}
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
      ? {meldung:clean(keyParts.meldung),part:normalizePart(keyParts.part),serial:clean(keyParts.serial)}
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
    const normalized=normalizePart(part);
    if(!normalized) return [];
    if(normalized!==part&&Array.isArray(global.history[part])&&!Array.isArray(global.history[normalized])){
      global.history[normalized]=global.history[part];
      delete global.history[part];
      saveGlobalState(global);
    }
    const list=global.history[normalized]||global.history[part];
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
        part:normalizePart(item.part)
      });
      if(result.length>=HISTORY_LIMIT) break;
    }
    return result;
  }

  function pushHistory(global,part,entry){
    const normalized=normalizePart(part);
    if(!normalized||!entry||!entry.key) return;
    if(normalized!==part&&Array.isArray(global.history[part])&&!Array.isArray(global.history[normalized])){
      global.history[normalized]=global.history[part];
      delete global.history[part];
    }
    if(!Array.isArray(global.history[normalized])) global.history[normalized]=[];
    const list=global.history[normalized];
    list.unshift({
      key:entry.key,
      finding:entry.finding||'',
      action:entry.action||'',
      label:entry.label||'',
      part:resolveMatchedPart(entry,normalized)
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
    global.history[normalized]=filtered;
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

  function autoResizeTextarea(textarea){
    if(!(textarea instanceof HTMLTextAreaElement)) return;
    textarea.style.height='auto';
    const computed=window.getComputedStyle(textarea);
    const minHeight=parseFloat(computed.minHeight)||0;
    const nextHeight=Math.max(textarea.scrollHeight,minHeight);
    textarea.style.height=`${nextHeight}px`;
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
      this.partsRows=[];
      this.partsFieldContainer=null;
      this.saveTimer=null;
      this.selectionRows=[];
      this.currentPart='';
      this.partSource='';
      this.meldung='';
      this.serial='';
      this.repairOrder='';
      this.hasAspenDoc=false;
      this.globalState=loadGlobalState();
      this.history=[];
      this.filterAll=false;
      this.undoBuffer=null;
      this.selectedEntries=[];
      this.totalEntries=0;
      this.entryMap=new Map();
      this.dictionaryUsed=false;
      this.findingsPath='';
      this.selectionCollapsed=false;
      this.headerCollapsed=true;
      this.menuCleanup=null;
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
      this.findingsPath=clean(localStorage.getItem(FINDINGS_PATH_KEY)||'');
      const data=parseData();
      this.allEntries=data.entries;
      this.entryMap=data.entryMap;
      this.totalEntries=this.allEntries.length;
      const docInfo=parseDocument();
      this.meldung=docInfo.meldung;
      this.repairOrder=docInfo.repairOrder||'';
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
      this.partEntries=collectEntriesForPart(part,this.allEntries,data.partMap);
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
        if(resolved){
          const storedPart=normalizePart(sel.part);
          const matchedPart=storedPart||resolveMatchedPart(resolved,this.currentPart);
          return {...resolved,part:matchedPart||resolved.part};
        }
        return {
          key:sel.key,
          finding:sel.finding||'',
          action:sel.action||'',
          label:sel.label||'',
          part:normalizePart(sel.part)||this.currentPart
        };
      });
      this.selectionRows=[];
      this.renderDom();
    }

    renderDom(){
      const root=this.root;
      root.innerHTML='';
      root.classList.add('nsf-module');
      if(this.menuCleanup){
        this.menuCleanup();
        this.menuCleanup=null;
      }

      const contextSection=document.createElement('div');
      contextSection.className='nsf-section nsf-header-section';
      if(this.headerCollapsed){
        contextSection.classList.add('collapsed');
      }

      const findingsInput=document.createElement('input');
      findingsInput.type='file';
      findingsInput.accept='.json,.txt';
      findingsInput.style.display='none';
      findingsInput.addEventListener('change',()=>{
        const file=findingsInput.files&&findingsInput.files[0];
        if(file){
          this.handleFindingsFile(file).finally(()=>{findingsInput.value='';});
        }
      });

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

      const headerBar=document.createElement('div');
      headerBar.className='nsf-header-bar';

      const toggleButton=document.createElement('button');
      toggleButton.type='button';
      toggleButton.className='nsf-header-toggle';
      toggleButton.textContent=this.headerCollapsed?'▸':'▾';
      toggleButton.title=this.headerCollapsed?'Details anzeigen':'Details ausblenden';
      toggleButton.setAttribute('aria-label',toggleButton.title);
      toggleButton.setAttribute('aria-expanded',String(!this.headerCollapsed));
      toggleButton.addEventListener('click',()=>{
        this.headerCollapsed=!this.headerCollapsed;
        this.render();
      });
      headerBar.appendChild(toggleButton);

      const summary=document.createElement('div');
      summary.className='nsf-header-summary';
      const summaryItems=[
        {label:'M',value:this.meldung},
        {label:'P/N',value:this.currentPart},
        {label:'S/N',value:this.serial}
      ];
      for(const item of summaryItems){
        const span=document.createElement('span');
        span.className='nsf-header-summary-item';
        span.textContent=`${item.label}: ${item.value||'–'}`;
        summary.appendChild(span);
      }
      headerBar.appendChild(summary);

      const headerActions=document.createElement('div');
      headerActions.className='nsf-header-actions';

      const makeHeaderAction=(label,handler)=>{
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='nsf-header-action';
        btn.textContent=label;
        btn.title=label;
        btn.setAttribute('aria-label',label);
        btn.addEventListener('click',handler);
        return btn;
      };

      const findingsAction=makeHeaderAction('Findings',()=>findingsInput.click());
      const aspenAction=makeHeaderAction('Aspen',()=>fileInput.click());
      headerActions.append(findingsAction,aspenAction);
      headerBar.appendChild(headerActions);

      contextSection.appendChild(headerBar);
      contextSection.appendChild(findingsInput);
      contextSection.appendChild(fileInput);

      const makeContextItem=(label,value)=>{
        const container=document.createElement('div');
        container.className='nsf-context-item';
        const lbl=document.createElement('span');
        lbl.className='nsf-context-label';
        lbl.textContent=`${label}:`;
        const val=document.createElement('span');
        val.className='nsf-context-value';
        val.textContent=value||'–';
        container.append(lbl,val);
        return container;
      };

      if(!this.headerCollapsed){
        const contextWrap=document.createElement('div');
        contextWrap.className='nsf-context';

        const headerRow=document.createElement('div');
        headerRow.className='nsf-context-header';
        headerRow.append(
          makeContextItem('Meldung',this.meldung),
          makeContextItem('Partnummer',this.currentPart),
          makeContextItem('Seriennummer',this.serial)
        );

        const visibleCount=this.availableEntries.length;
        const totalForPart=this.partEntries.length;
        const totalLabel=totalForPart||this.totalEntries||visibleCount;
        const statsWrap=document.createElement('div');
        statsWrap.className='nsf-header-stats';
        const findingsStat=document.createElement('div');
        findingsStat.className='nsf-context-stat';
        const countValue=document.createElement('span');
        countValue.className='nsf-context-stat-value';
        countValue.textContent=String(visibleCount);
        findingsStat.appendChild(countValue);
        const countLabel=document.createElement('span');
        countLabel.className='nsf-context-stat-label';
        countLabel.textContent='Findings geladen';
        findingsStat.appendChild(countLabel);
        const metaParts=[];
        if(totalLabel&&totalLabel!==visibleCount){
          metaParts.push(`von ${totalLabel}`);
        }
        if(this.currentPart){
          metaParts.push(`PN ${this.currentPart}`);
        }
        if(this.serial){
          metaParts.push(`SN ${this.serial}`);
        }
        if(this.filterAll&&this.currentPart){
          metaParts.push('Filter deaktiviert');
        }
        if(metaParts.length){
          const meta=document.createElement('span');
          meta.className='nsf-context-stat-meta';
          meta.textContent=metaParts.join(' • ');
          findingsStat.appendChild(meta);
        }
        statsWrap.appendChild(findingsStat);

        const controls=document.createElement('div');
        controls.className='nsf-controls';

        const quickActions=document.createElement('div');
        quickActions.className='nsf-quick-actions';
        controls.appendChild(quickActions);

        const menuWrapper=document.createElement('div');
        menuWrapper.className='nsf-menu';
        const menuButton=document.createElement('button');
        menuButton.type='button';
        menuButton.className='nsf-menu-toggle';
        menuButton.textContent='⋮';
        menuButton.title='Weitere Aktionen';
        menuButton.setAttribute('aria-label','Weitere Aktionen');
        const menuList=document.createElement('div');
        menuList.className='nsf-menu-list';
        menuWrapper.append(menuButton,menuList);
        controls.appendChild(menuWrapper);

        const handleOutsideClick=event=>{
          if(!menuWrapper.contains(event.target)){
            closeMenu();
          }
        };
        const closeMenu=()=>{
          menuWrapper.classList.remove('open');
          if(this.menuCleanup){
            this.menuCleanup();
            this.menuCleanup=null;
          }
        };
        const openMenu=()=>{
          if(menuWrapper.classList.contains('open')){
            closeMenu();
          }else{
            menuWrapper.classList.add('open');
            this.menuCleanup=()=>document.removeEventListener('click',handleOutsideClick);
            document.addEventListener('click',handleOutsideClick);
          }
        };
        menuButton.addEventListener('click',event=>{
          event.stopPropagation();
          openMenu();
        });

        const addMenuItem=(label,handler,options)=>{
          const item=document.createElement('button');
          item.type='button';
          item.className='nsf-menu-item';
          item.textContent=label;
          if(options&&options.disabled) item.disabled=true;
          item.addEventListener('click',()=>{
            if(item.disabled) return;
            closeMenu();
            handler();
          });
          menuList.appendChild(item);
          return item;
        };

        const toggleFilter=()=>{
          if(!this.totalEntries) return;
          this.filterAll=!this.filterAll;
          this.availableEntries=this.filterAll?this.allEntries:this.partEntries;
          this.render();
        };
        const handleUndo=()=>{this.applyUndo();};
        const handleClear=()=>{this.clearCurrentState();};
        const handleSave=()=>{this.flushStateSave(true);};

        const makeIconButton=(icon,label,handler,disabled)=>{
          const btn=document.createElement('button');
          btn.type='button';
          btn.className='nsf-icon-btn';
          btn.textContent=icon;
          btn.title=label;
          btn.setAttribute('aria-label',label);
          if(disabled) btn.disabled=true;
          btn.addEventListener('click',()=>{
            if(btn.disabled) return;
            handler();
          });
          quickActions.appendChild(btn);
          return btn;
        };

        const filterBtn=makeIconButton(
          this.filterAll?'🔒':'🔍',
          this.filterAll?'PN-Filter aktivieren':'Alle Findings anzeigen',
          toggleFilter,
          !this.totalEntries
        );
        const undoBtn=makeIconButton('↩️','Undo',handleUndo,!this.undoBuffer);
        const clearBtn=makeIconButton('🗑','Alles löschen',handleClear,!this.stateKey);
        const saveBtn=makeIconButton('💾','Alles speichern',handleSave,!this.stateKey);

        addMenuItem('🧾 Findings-Datei wählen …',()=>findingsInput.click());
        addMenuItem('📂 Aspen-Datei wählen …',()=>fileInput.click());
        const toggleItem=addMenuItem(
          this.filterAll?'🔒 PN-Filter aktivieren':'🔍 Alle Findings anzeigen',
          toggleFilter,
          {disabled:!this.totalEntries}
        );
        const undoItem=addMenuItem('↩️ Undo',handleUndo,{disabled:!this.undoBuffer});
        const clearItem=addMenuItem('🗑 Alles löschen',handleClear,{disabled:!this.stateKey});
        const saveItem=addMenuItem('💾 Alles speichern',handleSave,{disabled:!this.stateKey});

        if(this.totalEntries){
          toggleItem.textContent=this.filterAll?'🔒 PN-Filter aktivieren':'🔍 Alle Findings anzeigen';
        }
        undoItem.disabled=!this.undoBuffer;
        clearItem.disabled=!this.stateKey;
        saveItem.disabled=!this.stateKey;
        filterBtn.disabled=!this.totalEntries;
        undoBtn.disabled=!this.undoBuffer;
        clearBtn.disabled=!this.stateKey;
        saveBtn.disabled=!this.stateKey;

        const infoStack=document.createElement('div');
        infoStack.className='nsf-context-info';
        infoStack.appendChild(headerRow);
        if(statsWrap.childElementCount){
          infoStack.appendChild(statsWrap);
        }

        const topBar=document.createElement('div');
        topBar.className='nsf-context-top';
        topBar.append(infoStack,controls);
        contextWrap.appendChild(topBar);

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
        if(this.findingsPath){
          const findingsInfo=document.createElement('span');
          findingsInfo.className='nsf-inline-info';
          findingsInfo.textContent=`Findings-Datei: ${this.findingsPath}`;
          metaRow.appendChild(findingsInfo);
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
      }

      const inputSection=document.createElement('div');
      inputSection.className='nsf-section nsf-selection-section';
      if(this.selectionCollapsed) inputSection.classList.add('collapsed');

      const selectionHeader=document.createElement('div');
      selectionHeader.className='nsf-selection-header';

      const selectionToggle=document.createElement('button');
      selectionToggle.type='button';
      selectionToggle.className='nsf-header-toggle';
      selectionToggle.textContent=this.selectionCollapsed?'▸':'▾';
      selectionToggle.title=this.selectionCollapsed?'Auswahl anzeigen':'Auswahl ausblenden';
      selectionToggle.setAttribute('aria-label',selectionToggle.title);
      selectionToggle.setAttribute('aria-expanded',String(!this.selectionCollapsed));
      selectionToggle.addEventListener('click',event=>{
        event.stopPropagation();
        this.selectionCollapsed=!this.selectionCollapsed;
        this.render();
      });
      selectionHeader.appendChild(selectionToggle);

      const heading=document.createElement('div');
      heading.className='nsf-selection-heading';
      const title=document.createElement('div');
      title.className='nsf-section-title';
      title.textContent='Findings auswählen';
      if(this.availableEntries.length){
        const badge=document.createElement('span');
        badge.className='nsf-count';
        badge.textContent=`${this.availableEntries.length} Einträge`;
        title.appendChild(badge);
      }
      heading.appendChild(title);
      selectionHeader.appendChild(heading);

      const selectionSummary=document.createElement('div');
      selectionSummary.className='nsf-selection-summary';
      const labelTexts=this.selectedEntries
        .map(entry=>clean(entry.label)||clean(entry.finding)||clean(entry.action)||'')
        .map(text=>text||'')
        .filter(Boolean);
      if(!labelTexts.length){
        const empty=document.createElement('span');
        empty.className='nsf-selection-summary-empty';
        empty.textContent='Keine Auswahl';
        selectionSummary.appendChild(empty);
      }else{
        const MAX_CHIPS=4;
        labelTexts.slice(0,MAX_CHIPS).forEach(text=>{
          const chip=document.createElement('span');
          chip.className='nsf-selection-summary-chip';
          chip.textContent=text;
          selectionSummary.appendChild(chip);
        });
        if(labelTexts.length>MAX_CHIPS){
          const more=document.createElement('span');
          more.className='nsf-selection-summary-more';
          more.textContent=`+${labelTexts.length-MAX_CHIPS}`;
          selectionSummary.appendChild(more);
        }
      }
      selectionHeader.appendChild(selectionSummary);
      selectionHeader.addEventListener('click',event=>{
        if(event.target.closest('button')) return;
        this.selectionCollapsed=!this.selectionCollapsed;
        this.render();
      });

      const selectionBody=document.createElement('div');
      selectionBody.className='nsf-selection-body';

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
      selectionBody.appendChild(note);

      if(this.history.length){
        const historyContainer=document.createElement('div');
        historyContainer.className='nsf-history-container';
        const historyHeader=document.createElement('div');
        historyHeader.className='nsf-history-header';
        historyHeader.textContent='Zuletzt verwendet';
        const historyList=document.createElement('div');
        historyList.className='nsf-history';
        for(const entry of this.history){
          const chip=document.createElement('button');
          chip.type='button';
          chip.className='nsf-history-chip';
          const icon=document.createElement('span');
          icon.className='nsf-chip-icon';
          icon.textContent='↺';
          const label=document.createElement('span');
          label.className='nsf-chip-text';
          label.textContent=entry.label||entry.finding||'Eintrag';
          chip.append(icon,label);
          chip.addEventListener('click',()=>this.useEntry(entry));
          historyList.appendChild(chip);
        }
        historyContainer.append(historyHeader,historyList);
        selectionBody.appendChild(historyContainer);
      }

      const inputsWrapper=document.createElement('div');
      inputsWrapper.className='nsf-input-wrapper';
      selectionBody.appendChild(inputsWrapper);
      this.inputsContainer=inputsWrapper;

      inputSection.append(selectionHeader,selectionBody);

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
      this.partsFieldContainer=null;
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
        let textarea;
        if(def.key==='parts'){
          textarea=document.createElement('textarea');
          textarea.className='nsf-textarea nsf-hidden';
          textarea.value='';
          textarea.disabled=!this.meldung;
          textarea.readOnly=true;
          textarea.placeholder=this.meldung?`Text für ${def.label}…`:'Keine Meldung ausgewählt';
          this.textareas[def.key]=textarea;
          box.append(head,textarea);
          const partsContainer=document.createElement('div');
          partsContainer.className='nsf-parts-grid';
          this.partsFieldContainer=partsContainer;
          box.appendChild(partsContainer);
        }else{
          textarea=document.createElement('textarea');
          textarea.className='nsf-textarea';
          textarea.value='';
          textarea.disabled=!this.meldung;
          textarea.readOnly=true;
          textarea.placeholder=this.meldung?`Text für ${def.label}…`:'Keine Meldung ausgewählt';
          this.textareas[def.key]=textarea;
          box.append(head,textarea);
          requestAnimationFrame(()=>autoResizeTextarea(textarea));
        }
        outputsWrapper.appendChild(box);
      }

      this.syncOutputsWithSelections({persist:false});

      root.append(contextSection,inputSection,outputsSection);
    }

    buildOutputsFromSelections(){
      if(!this.meldung||!Array.isArray(this.selectedEntries)||!this.selectedEntries.length){
        return {findings:'',actions:'',routine:'',nonroutine:'',parts:''};
      }
      const lists={
        findings:[],
        actions:[],
        routine:[],
        nonroutine:[]
      };
      const seen={
        findings:new Set(),
        actions:new Set(),
        routine:new Set(),
        nonroutine:new Set()
      };
      const bestellTitles=[];
      const bestellTitleKeys=new Set();
      const partPairKeys=new Set();
      const partGroups=[];
      const addBestellTitle=value=>pushUniqueLine(bestellTitles,bestellTitleKeys,value);
      const addPartGroup=group=>{
        if(!group||typeof group!=='object') return;
        const titleText=clean(group.title);
        if(titleText) addBestellTitle(titleText);
        const rawParts=Array.isArray(group.parts)?group.parts:[];
        const filteredParts=[];
        rawParts.forEach(pair=>{
          if(!pair||typeof pair!=='object') return;
          const partText=clean(pair.part);
          const quantityText=clean(pair.quantity);
          if(!partText&&!quantityText) return;
          const key=`${normalizePart(partText)}||${quantityText.toLowerCase()}`;
          if(partPairKeys.has(key)) return;
          partPairKeys.add(key);
          filteredParts.push({part:partText,quantity:quantityText});
        });
        if(filteredParts.length||titleText){
          partGroups.push({title:titleText,parts:filteredParts});
        }
      };
      const pushLines=(field,value)=>{
        const text=clean(value);
        if(!text) return;
        const lines=text.split(/\r?\n/).map(line=>clean(line)).filter(Boolean);
        if(!lines.length) return;
        for(const line of lines){
          if(seen[field].has(line)) continue;
          seen[field].add(line);
          lists[field].push(line);
        }
      };
      const pushBlock=(field,value)=>{
        const text=clean(value);
        if(!text) return;
        const normalized=text.replace(/\s+/g,' ').trim();
        if(!normalized||seen[field].has(normalized)) return;
        seen[field].add(normalized);
        lists[field].push(value.trimEnd());
      };
      for(const selection of this.selectedEntries){
        const resolved=this.resolveEntry(selection)||selection;
        const findingText=resolved.finding||selection.finding||'';
        pushLines('findings',findingText);
        const actionText=resolved.action||selection.action||'';
        pushLines('actions',actionText);
        const fallbackParts=[];
        const primaryPart=normalizePart(selection.part||resolved.part||'');
        if(primaryPart) fallbackParts.push(primaryPart);
        if(Array.isArray(resolved.partNumbers)){
          for(const partNum of resolved.partNumbers){
            const normalizedPart=normalizePart(partNum);
            if(normalizedPart&&!fallbackParts.includes(normalizedPart)) fallbackParts.push(normalizedPart);
          }
        }
        const partsInfo=parsePartsDetails(resolved.parts||'',{fallbackParts});
        if(partsInfo&&Array.isArray(partsInfo.titles)){
          partsInfo.titles.forEach(addBestellTitle);
        }
        if(partsInfo&&Array.isArray(partsInfo.groups)&&partsInfo.groups.length){
          partsInfo.groups.forEach(addPartGroup);
        }else if(partsInfo&&Array.isArray(partsInfo.pairs)&&partsInfo.pairs.length){
          addPartGroup({title:'',parts:partsInfo.pairs});
        }
        const nonroutineCandidates=[resolved.nonroutineFinding||'',resolved.nonroutine||''];
        nonroutineCandidates.forEach(text=>{
          const stripped=stripNonRoutineFindingPrefix(text);
          pushLines('nonroutine',stripped);
        });
        const routineText=this.buildRoutineOutput(resolved);
        pushBlock('routine',routineText);
      }
      const partsData=buildPartsData(bestellTitles,partGroups);
      return {
        findings:lists.findings.join('\n'),
        actions:lists.actions.join('\n'),
        routine:lists.routine.join('\n\n'),
        nonroutine:lists.nonroutine.join('\n'),
        parts:partsData.text,
        partsRows:partsData.rows
      };
    }

    syncOutputsWithSelections(options){
      const opts=options||{};
      const computed=this.buildOutputsFromSelections();
      const effectiveRows=opts.forceEmpty?[]:(Array.isArray(computed.partsRows)?computed.partsRows:[]);
      this.partsRows=effectiveRows;
      let changed=false;
      for(const key of Object.keys(this.activeState)){
        const value=opts.forceEmpty?'' : computed[key]||'';
        if(this.activeState[key]!==value){
          this.activeState[key]=value;
          changed=true;
        }
        const textarea=this.textareas&&this.textareas[key];
        if(textarea){
          if(textarea.value!==value){
            textarea.value=value;
          }
          if(textarea.offsetParent!==null){
            autoResizeTextarea(textarea);
          }
        }
      }
      this.renderPartsRows(this.partsRows);
      if(changed&&opts.persist!==false){
        this.queueStateSave();
      }
    }

    renderPartsRows(rows){
      const container=this.partsFieldContainer;
      if(!container) return;
      container.innerHTML='';
      if(!this.meldung){
        const note=document.createElement('div');
        note.className='nsf-empty';
        note.textContent='Keine Meldung ausgewählt.';
        container.appendChild(note);
        return;
      }
      const groups=Array.isArray(rows)?rows.filter(group=>group&&typeof group==='object'):[];
      const items=groups.length?groups:[{
        title:'',
        rows:[{
          pnLabel:'PN 1',pnValue:'',
          partLabel:'Part 1',partValue:'',
          quantityLabel:'Menge 1',quantityValue:''
        }]
      }];
      const makeField=(labelText,value,placeholder)=>{
        const field=document.createElement('label');
        field.className='nsf-part-field';
        const label=document.createElement('span');
        label.className='nsf-part-field-label';
        label.textContent=labelText||'';
        const input=document.createElement('input');
        input.type='text';
        input.className='nsf-part-field-input';
        const displayValue=clean(value);
        input.value=displayValue;
        input.placeholder=placeholder||'';
        input.title=displayValue||placeholder||'';
        input.readOnly=true;
        input.addEventListener('focus',()=>{input.select();});
        input.addEventListener('click',()=>{input.select();});
        field.append(label,input);
        return field;
      };
      items.forEach(group=>{
        const groupWrapper=document.createElement('div');
        groupWrapper.className='nsf-part-group';
        const rowsList=Array.isArray(group.rows)?group.rows.filter(row=>row&&typeof row==='object'):[];
        const groupRows=rowsList.length?rowsList:[{
          pnLabel:'PN 1',pnValue:'',
          partLabel:'Part 1',partValue:'',
          quantityLabel:'Menge 1',quantityValue:''
        }];
        groupRows.forEach(rowData=>{
          const row=document.createElement('div');
          row.className='nsf-part-row';
          row.append(
            makeField(rowData.pnLabel,rowData.pnValue,'PN-Text'),
            makeField(rowData.partLabel,rowData.partValue,'Teilenummer'),
            makeField(rowData.quantityLabel,rowData.quantityValue,'Menge')
          );
          groupWrapper.appendChild(row);
        });
        container.appendChild(groupWrapper);
      });
    }

    resolveEntry(entry){
      if(!entry||typeof entry!=='object') return null;
      const hasExtendedFields=(key)=>Object.prototype.hasOwnProperty.call(entry,key);
      if([
        'routine','routineFinding','routineAction','nonroutine','nonroutineFinding','nonroutineAction','parts','additional','repairOrder'
      ].some(hasExtendedFields)){
        return entry;
      }
      if(entry.key&&this.entryMap instanceof Map){
        const resolved=this.entryMap.get(entry.key);
        if(resolved) return resolved;
      }
      return entry;
    }

    buildRoutineOutput(entry){
      const resolved=this.resolveEntry(entry);
      if(!resolved) return '';
      const fallback=clean(resolved.routine||'');
      const routineFinding=clean(resolved.routineFinding||resolved.routineFindings||'');
      const routineAction=clean(resolved.routineAction||resolved.routineActions||'');
      const repairOrder=clean(resolved.repairOrder||this.repairOrder);
      const sections=[];
      if(repairOrder){
        sections.push({title:'Repair Order:',body:`${repairOrder} (Aus aspen)`});
      }
      if(routineFinding){
        sections.push({title:'Findings:',body:routineFinding});
      }
      if(routineAction){
        sections.push({title:'Actions performed/to perform:',body:routineAction});
      }
      if(!sections.length){
        return fallback;
      }
      const lines=[];
      sections.forEach((section,idx)=>{
        lines.push(section.title);
        lines.push(section.body);
        if(idx<sections.length-1) lines.push('');
      });
      if(!fallback){
        return lines.join('\n');
      }
      const baseText=lines.join('\n');
      const normalizedBase=baseText.replace(/\s+/g,' ').toLowerCase();
      const normalizedFallback=fallback.replace(/\s+/g,' ').toLowerCase();
      if(!normalizedBase){
        return fallback;
      }
      if(normalizedBase===normalizedFallback){
        return fallback;
      }
      const finalLines=lines.slice();
      if(finalLines[finalLines.length-1]!=='') finalLines.push('');
      finalLines.push(fallback);
      return finalLines.join('\n');
    }

    addInputRow(prefillEntry,focusNext){
      const row=document.createElement('div');
      row.className='nsf-input-row';
      const input=document.createElement('input');
      input.type='text';
      input.className='nsf-input';
      input.placeholder=this.availableEntries.length?'Finding auswählen…':'Keine Findings verfügbar';
      input.disabled=!this.availableEntries.length;
      const removeBtn=document.createElement('button');
      removeBtn.type='button';
      removeBtn.className='nsf-remove-btn';
      removeBtn.textContent='✖';
      const field=document.createElement('div');
      field.className='nsf-input-field';
      field.append(input,removeBtn);
      const suggestions=document.createElement('div');
      suggestions.className='nsf-suggestions';
      row.append(field,suggestions);
      this.inputsContainer.appendChild(row);
      const state={
        row,
        input,
        suggestions,
        removeBtn,
        suggestionsList:[],
        highlightIndex:-1,
        locked:false,
        entry:null
      };
      const closeSuggestions=()=>{
        row.classList.remove('show-suggestions');
        state.suggestionsList=[];
        state.highlightIndex=-1;
        suggestions.innerHTML='';
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
          if(entry.routineFindingLower&&entry.routineFindingLower.includes(query)) return true;
          if(entry.routineActionLower&&entry.routineActionLower.includes(query)) return true;
          if(entry.nonroutineLower&&entry.nonroutineLower.includes(query)) return true;
          if(entry.nonroutineFindingLower&&entry.nonroutineFindingLower.includes(query)) return true;
          if(entry.nonroutineActionLower&&entry.nonroutineActionLower.includes(query)) return true;
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
          label.textContent=entry.label||entry.finding||entry.action||'Eintrag';
          item.append(label);
          item.addEventListener('mousedown',e=>{
            e.preventDefault();
            this.acceptSelection(entry,state);
          });
          suggestions.appendChild(item);
          if(idx===state.highlightIndex) item.classList.add('active');
        });
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
        this.lockRow(state,prefillEntry,{persist:false,updateState:false,syncOutputs:false});
      }else if(focusNext){
        setTimeout(()=>{if(!state.locked) input.focus();},60);
      }
    }

    acceptSelection(entry,state){
      if(!entry||state.locked) return;
      this.lockRow(state,entry,{persist:true,updateState:true});
      this.undoBuffer=null;
      if(this.currentPart){
        const historyEntry={...entry,part:resolveMatchedPart(entry,this.currentPart)};
        pushHistory(this.globalState,this.currentPart,historyEntry);
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
      const routineText=this.buildRoutineOutput(entry);
      const nonroutineText=clean(entry.nonroutine||'');
      const nonroutineFindingText=clean(entry.nonroutineFinding||'');
      const nonroutineActionText=clean(entry.nonroutineAction||'');
      const routineFindingText=clean(entry.routineFinding||'');
      const routineActionText=clean(entry.routineAction||'');
      const partsText=clean(entry.parts||'');
      const repairOrderValue=clean(this.repairOrder||'');
      state.entry={
        key:entry.key,
        finding:entry.finding||'',
        action:entry.action||'',
        label:entry.label||'',
        part:resolveMatchedPart(entry,this.currentPart),
        routine:routineText,
        routineFinding:routineFindingText,
        routineAction:routineActionText,
        nonroutine:nonroutineText,
        nonroutineFinding:nonroutineFindingText,
        nonroutineAction:nonroutineActionText,
        parts:partsText,
        repairOrder:repairOrderValue
      };
      state.input.value=entry.label||entry.finding||entry.action||'Auswahl';
      state.input.disabled=true;
      state.row.classList.add('locked');
      state.row.classList.remove('show-suggestions');
      state.suggestions.innerHTML='';
      state.suggestionsList=[];
      state.highlightIndex=-1;
      if(opts.persist!==false){
        this.addSelection(entry);
      }
      if(opts.syncOutputs!==false){
        this.syncOutputsWithSelections({persist:false});
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
          part:resolveMatchedPart(entry,this.currentPart)
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
        this.selectedEntries=this.selectedEntries.filter(sel=>sel.key!==entry.key);
        this.undoBuffer={entry:{...entry}};
      }
      this.removeRow(state);
      this.syncOutputsWithSelections({persist:false});
      this.persistState(true);
      if(this.meldung&&this.availableEntries.length&&!this.selectionRows.some(s=>!s.locked)){
        this.addInputRow(null,true);
      }
      this.render();
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
        if(textarea){
          textarea.value='';
          autoResizeTextarea(textarea);
        }
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

    async handleFindingsFile(file){
      if(!file) return;
      try{
        const content=await file.text();
        if(!content) return;
        let parsed;
        try{parsed=JSON.parse(content);}
        catch(err){console.warn('NSF: Findings-Datei ist keine gültige JSON',err);return;}
        if(parsed==null) return;
        const payload=JSON.stringify(parsed);
        localStorage.setItem(DATA_KEY,payload);
        lastValues[DATA_KEY]=payload;
        const path=file.path||file.webkitRelativePath||file.name||'';
        if(path){
          localStorage.setItem(FINDINGS_PATH_KEY,path);
          lastValues[FINDINGS_PATH_KEY]=path;
        }
        scheduleAll();
      }catch(err){
        console.warn('NSF: Findings-Datei konnte nicht gelesen werden',err);
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
