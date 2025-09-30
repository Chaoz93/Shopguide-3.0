(function(){
  'use strict';

  const DATA_URL='Findings_Shopguide.json';
  const DATA_KEY='sf-data';
  const FINDINGS_PATH_KEY='sf-findings-path';
  const STATE_KEY='sf-state';
  const STATE_KEY_SEPARATOR='::';
  const UNIT_BOARD_EVENT='unitBoard:update';
  const BOARD_DOC_KEY='module_data_v1';
  const ASPEN_DOC_KEY='nsf-aspen-doc';
  const WATCH_INTERVAL=600;
  const SAVE_DEBOUNCE=250;
  const HISTORY_LIMIT=10;
  const STYLE_ID='nsf-styles';
  const ASPEN_BOARD_STATE_KEY='aspenUnitListState';
  const ROUTINE_EDITOR_STORAGE_KEY='nsf-routine-editor';
  const ROUTINE_EDITOR_CUSTOM_PREFIX='custom:';
  const ROUTINE_EDITOR_PRESETS_KEY='nsf-routine-editor-presets';
  const ROUTINE_EDITOR_ACTIVE_PRESET_KEY='nsf-routine-editor-active';
  const ROUTINE_EDITOR_BASE_BLOCKS_ROUTINE=[
    {key:'prefix',label:'Prefix',defaultLabel:'Prefix',editable:true,persist:true,removable:true},
    {key:'findings',label:'Findings',defaultLabel:'Findings',editable:false,persist:false,removable:true},
    {key:'actions',label:'Actions',defaultLabel:'Actions',editable:false,persist:false,removable:true},
    {key:'suffix',label:'Suffix',defaultLabel:'Suffix',editable:true,persist:true,removable:true}
  ];
  const ROUTINE_EDITOR_LINE_BREAK_TOKEN='__nsf_line_break__';
  const ROUTINE_EDITOR_PARAMETER_FAVORITES_KEY='nsf-routine-parameter-favorites';
  const ROUTINE_EDITOR_ACTIVE_TAB_KEY='nsf-routine-editor-active-tab';
  const ROUTINE_EDITOR_TAB_CONFIG={
    routine:{
      key:'routine',
      baseBlocks:ROUTINE_EDITOR_BASE_BLOCKS_ROUTINE,
      allowAspen:true,
      allowParameters:true,
      derivedBlocks:{findings:'findings',actions:'actions'},
      previewEmpty:'Keine Routine-Daten vorhanden.'
    },
    findings:{
      key:'findings',
      baseBlocks:[{key:'findings',label:'Findings',defaultLabel:'Findings',editable:false,persist:false,removable:false}],
      allowAspen:false,
      allowParameters:true,
      primaryTextarea:'findings',
      previewEmpty:'Keine Findings-Daten vorhanden.'
    },
    actions:{
      key:'actions',
      baseBlocks:[{key:'actions',label:'Actions',defaultLabel:'Actions',editable:false,persist:false,removable:false}],
      allowAspen:false,
      allowParameters:true,
      primaryTextarea:'actions',
      previewEmpty:'Keine Actions-Daten vorhanden.'
    },
    nonroutine:{
      key:'nonroutine',
      baseBlocks:[{key:'nonroutine',label:'Nonroutine',defaultLabel:'Nonroutine',editable:false,persist:false,removable:false}],
      allowAspen:false,
      allowParameters:true,
      primaryTextarea:'nonroutine',
      previewEmpty:'Keine Nonroutine-Daten vorhanden.'
    }
  };
  const ROUTINE_EDITOR_PARAMETER_FIELDS=[
    {key:'label',label:'Titel',getter:entry=>entry.label||''},
    {key:'finding',label:'Finding',getter:entry=>entry.finding||''},
    {key:'action',label:'Action',getter:entry=>entry.action||''},
    {key:'routine',label:'Routine',getter:entry=>entry.routine||''},
    {key:'routineFinding',label:'Routine Finding',getter:entry=>entry.routineFinding||''},
    {key:'routineAction',label:'Routine Action',getter:entry=>entry.routineAction||''},
    {key:'nonroutine',label:'Nonroutine',getter:entry=>entry.nonroutine||''},
    {key:'nonroutineFinding',label:'Nonroutine Finding',getter:entry=>entry.nonroutineFinding||''},
    {key:'nonroutineAction',label:'Nonroutine Action',getter:entry=>entry.nonroutineAction||''},
    {key:'parts',label:'Bestellhinweis',getter:entry=>entry.parts||''},
    {key:'times',label:'Arbeitszeiten',getter:entry=>entry.times||''},
    {key:'mods',label:'Modifikationen',getter:entry=>entry.mods||''}
  ];

  const OUTPUT_DEFS=[
    {key:'findings',label:'Findings'},
    {key:'actions',label:'Actions'},
    {key:'routine',label:'Routine'},
    {key:'nonroutine',label:'Nonroutine'},
    {key:'parts',label:'Bestellliste'}
  ];

  const ROUTINE_EDITOR_PREVIEW_TAB_KEYS=OUTPUT_DEFS.filter(def=>def.key!=='parts').map(def=>def.key);

  function sanitizeRoutineEditorLabel(value){
    if(typeof value!=='string') return '';
    return value.trim().slice(0,120);
  }

  function autoSizeTextarea(textarea){
    if(!textarea) return;
    textarea.style.height='auto';
    textarea.style.height=`${Math.max(textarea.scrollHeight,textarea.dataset.minHeight?Number(textarea.dataset.minHeight):0)}px`;
  }

  const OUTPUT_KEYS=OUTPUT_DEFS.map(def=>def.key);
  const CUSTOM_SLOT_COUNT=OUTPUT_DEFS.length+1;
  const XLSX_URLS=[
    'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.2/xlsx.full.min.js'
  ];

  let ensureXlsxPromise=null;

  function loadScriptOnce(url){
    return new Promise((resolve,reject)=>{
      if(typeof document==='undefined'){reject(new Error('Kein Dokument'));return;}
      const scripts=document.getElementsByTagName('script');
      for(let i=0;i<scripts.length;i+=1){
        const existing=scripts[i];
        if(!existing) continue;
        if(existing.dataset&&existing.dataset.nsfLoader===url){
          const handleResolve=()=>resolve();
          const handleReject=()=>reject(new Error('load '+url));
          if(existing.dataset.nsfLoaded==='true'){resolve();return;}
          existing.addEventListener('load',handleResolve,{once:true});
          existing.addEventListener('error',handleReject,{once:true});
          return;
        }
      }
      const script=document.createElement('script');
      script.src=url;
      script.async=true;
      if(script.dataset) script.dataset.nsfLoader=url;
      script.addEventListener('load',()=>{
        if(script.dataset) script.dataset.nsfLoaded='true';
        resolve();
      },{once:true});
      script.addEventListener('error',()=>reject(new Error('load '+url)),{once:true});
      document.head.appendChild(script);
    });
  }

  async function ensureXlsx(){
    if(typeof window==='undefined') throw new Error('Kein window');
    if(window.XLSX) return;
    if(ensureXlsxPromise) return ensureXlsxPromise;
    ensureXlsxPromise=(async()=>{
      let lastError;
      for(const url of XLSX_URLS){
        try{
          await loadScriptOnce(url);
          if(window.XLSX) return;
        }catch(err){lastError=err;}
      }
      if(!window.XLSX) throw lastError||new Error('XLSX konnte nicht geladen werden');
    })();
    try{
      await ensureXlsxPromise;
    }catch(err){
      ensureXlsxPromise=null;
      throw err;
    }
  }

  const instances=new Set();
  let watchersInitialized=false;
  let ensureDataPromise=null;
  const lastValues={};

  function getRoutineEditorTabKey(tabKey){
    return ROUTINE_EDITOR_PREVIEW_TAB_KEYS.includes(tabKey)?tabKey:'routine';
  }

  function getRoutineEditorTabConfig(tabKey){
    const key=getRoutineEditorTabKey(tabKey);
    return ROUTINE_EDITOR_TAB_CONFIG[key]||ROUTINE_EDITOR_TAB_CONFIG.routine;
  }

  function getRoutineEditorBaseBlocksForTab(tabKey){
    const config=getRoutineEditorTabConfig(tabKey);
    return Array.isArray(config.baseBlocks)?config.baseBlocks:ROUTINE_EDITOR_BASE_BLOCKS_ROUTINE;
  }

  function createDefaultRoutineEditorTabState(tabKey){
    const baseBlocks=getRoutineEditorBaseBlocksForTab(tabKey);
    const order=baseBlocks.map(block=>block.key);
    const blocks={};
    baseBlocks.forEach(block=>{
      blocks[block.key]={
        lines:block.editable===false?[]:['']
      };
    });
    return {order,blocks,customBlocks:[],blockMeta:{},hiddenBaseBlocks:[]};
  }

  function createDefaultRoutineEditorState(){
    const tabs={};
    ROUTINE_EDITOR_PREVIEW_TAB_KEYS.forEach(key=>{
      tabs[key]=createDefaultRoutineEditorTabState(key);
    });
    return {tabs};
  }

  function normalizeRoutineEditorTabState(raw,tabKey){
    const base=createDefaultRoutineEditorTabState(tabKey);
    if(!raw||typeof raw!=='object') return base;
    const baseBlocks=getRoutineEditorBaseBlocksForTab(tabKey);
    const rawOrder=Array.isArray(raw.order)?raw.order:[];
    const allowedKeys=new Set(baseBlocks.map(block=>block.key));
    const removableBaseKeys=new Set(baseBlocks.filter(block=>block.removable!==false).map(block=>block.key));
    const rawHiddenBase=Array.isArray(raw.hiddenBaseBlocks)?raw.hiddenBaseBlocks:[];
    const hiddenBaseBlocks=new Set();
    rawHiddenBase.forEach(key=>{
      if(typeof key!=='string') return;
      if(!allowedKeys.has(key)) return;
      if(removableBaseKeys.size&&!removableBaseKeys.has(key)) return;
      hiddenBaseBlocks.add(key);
    });
    const rawCustomBlocks=Array.isArray(raw.customBlocks)?raw.customBlocks:[];
    const seenCustomIds=new Set();
    const customBlocks=[];
    rawCustomBlocks.forEach(entry=>{
      if(!entry||typeof entry!=='object') return;
      let id=typeof entry.id==='string'?entry.id.trim():'';
      if(!id||seenCustomIds.has(id)){
        id=createCustomSectionId();
      }
      seenCustomIds.add(id);
      const rawLines=Array.isArray(entry.lines)?entry.lines:[];
      const lines=rawLines.map(value=>typeof value==='string'?value:'');
      const type=entry.type==='aspen'?'aspen':entry.type==='linebreak'?'linebreak':'text';
      const label=sanitizeRoutineEditorLabel(entry.label||'');
      const aspenField=typeof entry.aspenField==='string'?entry.aspenField.trim():'';
      const parameterKey=typeof entry.parameterKey==='string'?entry.parameterKey.trim():'';
      const normalizedLines=type==='linebreak'?['']:(lines.length?lines:['']);
      customBlocks.push({
        id,
        type,
        label,
        aspenField,
        parameterKey:type==='text'?parameterKey:'',
        lines:normalizedLines
      });
    });
    base.customBlocks=customBlocks;
    const customKeys=new Set(customBlocks.map(block=>`${ROUTINE_EDITOR_CUSTOM_PREFIX}${block.id}`));
    const normalizedOrder=[];
    rawOrder.forEach(key=>{
      if(typeof key!=='string') return;
      if(allowedKeys.has(key)){
        if(hiddenBaseBlocks.has(key)) return;
        if(!normalizedOrder.includes(key)) normalizedOrder.push(key);
        return;
      }
      if(key.startsWith(ROUTINE_EDITOR_CUSTOM_PREFIX)&&customKeys.has(key)){
        if(!normalizedOrder.includes(key)) normalizedOrder.push(key);
      }
    });
    baseBlocks.forEach(block=>{
      if(hiddenBaseBlocks.has(block.key)) return;
      if(!normalizedOrder.includes(block.key)) normalizedOrder.push(block.key);
    });
    customBlocks.forEach(block=>{
      const key=`${ROUTINE_EDITOR_CUSTOM_PREFIX}${block.id}`;
      if(!normalizedOrder.includes(key)) normalizedOrder.push(key);
    });
    base.order=normalizedOrder;
    base.hiddenBaseBlocks=Array.from(hiddenBaseBlocks);
    const rawBlocks=raw.blocks&&typeof raw.blocks==='object'?raw.blocks:null;
    baseBlocks.forEach(block=>{
      const legacyEntry=raw[block.key];
      const entry=rawBlocks&&rawBlocks[block.key]?rawBlocks[block.key]:legacyEntry;
      const rawLines=Array.isArray(entry&&entry.lines)?entry.lines:Array.isArray(entry)?entry:[];
      const lines=rawLines.map(value=>typeof value==='string'?value:'');
      base.blocks[block.key]={
        lines:lines.length?lines:['']
      };
    });
    const rawBlockMeta=raw.blockMeta&&typeof raw.blockMeta==='object'?raw.blockMeta:{};
    const blockMeta={};
    baseBlocks.forEach(block=>{
      const metaEntry=rawBlockMeta[block.key];
      const label=typeof metaEntry==='string'
        ?sanitizeRoutineEditorLabel(metaEntry)
        :sanitizeRoutineEditorLabel(metaEntry&&metaEntry.label);
      if(label){
        blockMeta[block.key]={label};
      }
    });
    base.blockMeta=blockMeta;
    return base;
  }

  function normalizeRoutineEditorState(raw){
    const normalized={tabs:{}};
    if(raw&&typeof raw==='object'&&raw.tabs&&typeof raw.tabs==='object'){
      ROUTINE_EDITOR_PREVIEW_TAB_KEYS.forEach(key=>{
        normalized.tabs[key]=normalizeRoutineEditorTabState(raw.tabs[key],key);
      });
    }else{
      normalized.tabs.routine=normalizeRoutineEditorTabState(raw,'routine');
    }
    ROUTINE_EDITOR_PREVIEW_TAB_KEYS.forEach(key=>{
      if(!normalized.tabs[key]){
        normalized.tabs[key]=createDefaultRoutineEditorTabState(key);
      }
    });
    return normalized;
  }

  function serializeRoutineEditorTabState(state,tabKey){
    const normalized=normalizeRoutineEditorTabState(state,tabKey);
    const baseBlocks=getRoutineEditorBaseBlocksForTab(tabKey);
    const payload={
      order:Array.isArray(normalized.order)?normalized.order.slice():[],
      blocks:{},
      blockMeta:{},
    };
    baseBlocks.forEach(block=>{
      const lines=normalized.blocks&&normalized.blocks[block.key]?normalized.blocks[block.key].lines:null;
      const safeLines=Array.isArray(lines)?lines.map(value=>typeof value==='string'?value:''):[''];
      payload.blocks[block.key]={lines:safeLines.length?safeLines:['']};
      const meta=normalized.blockMeta&&normalized.blockMeta[block.key];
      const label=meta&&meta.label?sanitizeRoutineEditorLabel(meta.label):'';
      if(label){
        payload.blockMeta[block.key]={label};
      }
    });
    if(!Object.keys(payload.blockMeta).length){
      delete payload.blockMeta;
    }
    const hiddenBase=Array.isArray(normalized.hiddenBaseBlocks)?normalized.hiddenBaseBlocks.filter(key=>baseBlocks.some(block=>block.key===key&&block.removable!==false)):[];
    if(hiddenBase.length){
      payload.hiddenBaseBlocks=hiddenBase;
    }
    payload.customBlocks=Array.isArray(normalized.customBlocks)?normalized.customBlocks.map(block=>{
      const id=block&&typeof block.id==='string'?block.id:'';
      if(!id) return null;
      const lines=Array.isArray(block&&block.lines)?block.lines.map(value=>typeof value==='string'?value:''):[''];
      const type=block&&block.type==='aspen'?'aspen':block&&block.type==='linebreak'?'linebreak':'text';
      const normalizedLines=type==='linebreak'?['']:(lines.length?lines:['']);
      return {
        id,
        type,
        label:block&&block.label?sanitizeRoutineEditorLabel(block.label):'',
        aspenField:block&&typeof block.aspenField==='string'?block.aspenField:'',
        parameterKey:type==='text'&&block&&typeof block.parameterKey==='string'?block.parameterKey:'',
        lines:normalizedLines
      };
    }).filter(Boolean):[];
    return payload;
  }

  function loadRoutineEditorState(){
    try{
      const raw=localStorage.getItem(ROUTINE_EDITOR_STORAGE_KEY);
      if(!raw) return createDefaultRoutineEditorState();
      const parsed=JSON.parse(raw);
      return normalizeRoutineEditorState(parsed);
    }catch(err){
      console.warn('NSF: Routine-Editor konnte nicht geladen werden',err);
      return createDefaultRoutineEditorState();
    }
  }

  function storeRoutineEditorState(state){
    try{
      const normalized=normalizeRoutineEditorState(state);
      const payload={tabs:{}};
      ROUTINE_EDITOR_PREVIEW_TAB_KEYS.forEach(key=>{
        payload.tabs[key]=serializeRoutineEditorTabState(normalized.tabs[key],key);
      });
      localStorage.setItem(ROUTINE_EDITOR_STORAGE_KEY,JSON.stringify(payload));
    }catch(err){
      console.warn('NSF: Routine-Editor konnte nicht gespeichert werden',err);
    }
  }

  function cloneRoutineEditorTabState(state,tabKey){
    const normalized=normalizeRoutineEditorTabState(state,tabKey);
    const clone={
      order:Array.isArray(normalized.order)?normalized.order.slice():[],
      blocks:{},
      customBlocks:[],
      blockMeta:{},
      hiddenBaseBlocks:Array.isArray(normalized.hiddenBaseBlocks)?normalized.hiddenBaseBlocks.slice():[],
    };
    const baseBlocks=getRoutineEditorBaseBlocksForTab(tabKey);
    baseBlocks.forEach(block=>{
      const entry=normalized.blocks&&normalized.blocks[block.key];
      const lines=Array.isArray(entry&&entry.lines)?entry.lines:[];
      clone.blocks[block.key]={lines:lines.slice()};
    });
    clone.customBlocks=Array.isArray(normalized.customBlocks)?normalized.customBlocks.map(block=>({
      id:block&&typeof block.id==='string'?block.id:'',
      type:block&&block.type==='aspen'?'aspen':block&&block.type==='linebreak'?'linebreak':'text',
      label:block&&block.label?sanitizeRoutineEditorLabel(block.label):'',
      aspenField:block&&typeof block.aspenField==='string'?block.aspenField:'',
      parameterKey:block&&block.type==='text'&&typeof block.parameterKey==='string'?block.parameterKey:'',
      lines:Array.isArray(block&&block.lines)?block.lines.slice():['']
    })).filter(entry=>entry.id):[];
    if(normalized.blockMeta&&typeof normalized.blockMeta==='object'){
      Object.keys(normalized.blockMeta).forEach(key=>{
        const entry=normalized.blockMeta[key];
        const label=entry&&entry.label?sanitizeRoutineEditorLabel(entry.label):'';
        if(label){
          clone.blockMeta[key]={label};
        }
      });
    }
    return clone;
  }

  function cloneRoutineEditorState(state){
    const normalized=normalizeRoutineEditorState(state);
    const clone={tabs:{}};
    ROUTINE_EDITOR_PREVIEW_TAB_KEYS.forEach(key=>{
      clone.tabs[key]=cloneRoutineEditorTabState(normalized.tabs[key],key);
    });
    return clone;
  }

  function normalizeRoutineEditorPreset(raw){
    if(!raw||typeof raw!=='object') return null;
    const name=sanitizePresetName(raw.name||'');
    if(!name) return null;
    const id=typeof raw.id==='string'&&raw.id.trim()?raw.id.trim():createRoutinePresetId();
    const state=cloneRoutineEditorState(raw.state||raw.data||raw);
    return {id,name,state};
  }

  function loadRoutineEditorPresets(){
    try{
      const raw=localStorage.getItem(ROUTINE_EDITOR_PRESETS_KEY);
      if(!raw) return [];
      const parsed=JSON.parse(raw);
      if(!Array.isArray(parsed)) return [];
      const seen=new Set();
      const presets=[];
      parsed.forEach(entry=>{
        const normalized=normalizeRoutineEditorPreset(entry);
        if(!normalized) return;
        if(seen.has(normalized.id)) return;
        seen.add(normalized.id);
        presets.push(normalized);
      });
      return presets;
    }catch(err){
      console.warn('NSF: Routine-Profile konnten nicht geladen werden',err);
      return [];
    }
  }

  function storeRoutineEditorPresets(presets){
    try{
      const payload=Array.isArray(presets)?presets.map(preset=>({
        id:preset.id,
        name:preset.name,
        state:cloneRoutineEditorState(preset.state)
      })):[];
      localStorage.setItem(ROUTINE_EDITOR_PRESETS_KEY,JSON.stringify(payload));
    }catch(err){
      console.warn('NSF: Routine-Profile konnten nicht gespeichert werden',err);
    }
  }

  function loadRoutineEditorActivePresetId(presets){
    try{
      const raw=localStorage.getItem(ROUTINE_EDITOR_ACTIVE_PRESET_KEY);
      if(!raw) return '';
      const id=String(raw);
      if(Array.isArray(presets)&&presets.some(preset=>preset.id===id)) return id;
      return '';
    }catch(err){
      console.warn('NSF: Aktives Routine-Profil konnte nicht geladen werden',err);
      return '';
    }
  }

  function storeRoutineEditorActivePresetId(id){
    try{
      if(id){
        localStorage.setItem(ROUTINE_EDITOR_ACTIVE_PRESET_KEY,String(id));
      }else{
        localStorage.removeItem(ROUTINE_EDITOR_ACTIVE_PRESET_KEY);
      }
    }catch(err){
      console.warn('NSF: Aktives Routine-Profil konnte nicht gespeichert werden',err);
    }
  }

  function isRoutineEditorStateEqual(a,b){
    if(!a||!b) return false;
    const stateA=cloneRoutineEditorState(a);
    const stateB=cloneRoutineEditorState(b);
    for(const key of ROUTINE_EDITOR_PREVIEW_TAB_KEYS){
      const tabA=stateA.tabs&&stateA.tabs[key];
      const tabB=stateB.tabs&&stateB.tabs[key];
      if(!tabA||!tabB) return false;
      const serializedA=JSON.stringify(cloneRoutineEditorTabState(tabA,key));
      const serializedB=JSON.stringify(cloneRoutineEditorTabState(tabB,key));
      if(serializedA!==serializedB) return false;
    }
    return true;
  }

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
      .nsf-header-debug{flex-basis:100%;font-size:0.7rem;font-weight:500;opacity:0.65;line-height:1.2;white-space:normal;}
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
      .nsf-editor-menu-label{padding:0.35rem 0.55rem;font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;opacity:0.6;}
      .nsf-editor-menu-divider{height:1px;background:rgba(148,163,184,0.28);margin:0.35rem 0;}
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
      .nsf-outputs-layout{display:flex;flex-direction:column;gap:1.25rem;}
      .nsf-custom-slot{display:flex;flex-direction:column;gap:0.55rem;}
      .nsf-custom-slot-empty{display:none;}
      .nsf-custom-slot-dragging{display:flex;}
      .nsf-custom-slot-dragging .nsf-custom-list{min-height:1.35rem;border:1px dashed rgba(148,163,184,0.35);border-radius:0.65rem;padding:0.3rem;background:rgba(15,23,42,0.25);}
      .nsf-custom-add{align-self:flex-start;background:rgba(59,130,246,0.22);border:1px solid rgba(59,130,246,0.45);border-radius:0.65rem;padding:0.35rem 0.75rem;font:inherit;color:rgba(191,219,254,0.95);cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;display:inline-flex;align-items:center;gap:0.35rem;}
      .nsf-custom-add::before{content:'+';font-size:1.1rem;line-height:1;}
      .nsf-custom-add:hover{background:rgba(59,130,246,0.32);transform:translateY(-1px);}
      .nsf-custom-list{display:flex;flex-direction:column;gap:0.55rem;width:100%;}
      .nsf-custom-block{position:relative;background:rgba(15,23,42,0.22);border-radius:0.85rem;padding:0.65rem 0.75rem 0.75rem;display:flex;flex-direction:column;gap:0.55rem;cursor:default;}
      .nsf-custom-block.dragging{opacity:0.85;box-shadow:0 12px 28px rgba(15,23,42,0.45);}
      .nsf-custom-handle{align-self:flex-start;font-size:1.15rem;line-height:1;opacity:0.65;cursor:grab;user-select:none;}
      .nsf-custom-handle:active{cursor:grabbing;}
      .nsf-custom-textarea{width:100%;border:none;border-radius:0.65rem;padding:0.6rem 0.75rem;font:inherit;color:var(--sidebar-module-card-text,#111);background:var(--sidebar-module-card-bg,#fff);resize:none;min-height:0;box-shadow:inset 0 0 0 1px rgba(15,23,42,0.1);}
      .nsf-custom-textarea::placeholder{color:rgba(107,114,128,0.7);}
      .nsf-custom-remove{align-self:flex-end;background:rgba(248,113,113,0.25);border:none;border-radius:999px;width:2rem;height:2rem;display:inline-flex;align-items:center;justify-content:center;color:rgba(248,113,113,0.95);cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-custom-remove:hover{background:rgba(248,113,113,0.38);transform:scale(1.05);}
      .nsf-editor-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.72);backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;padding:3rem 1.5rem;z-index:400;}
      .nsf-editor-overlay.open{display:flex;}
      .nsf-editor-overlay.nsf-hide-inserts .nsf-editor-insert{display:none;}
      .nsf-editor-dialog{background:rgba(15,23,42,0.95);border-radius:1.1rem;border:1px solid rgba(148,163,184,0.35);box-shadow:0 24px 64px rgba(15,23,42,0.55);max-width:1560px;width:100%;max-height:calc(100vh - 6rem);overflow:auto;padding:1.5rem;display:flex;flex-direction:column;gap:1.25rem;color:#e2e8f0;}
      .nsf-editor-content{display:flex;flex-direction:row;gap:1.75rem;align-items:stretch;}
      .nsf-editor-main{flex:1;display:flex;flex-direction:column;gap:1.1rem;}
      .nsf-editor-workspace{display:flex;flex-direction:row;gap:1.35rem;align-items:flex-start;flex-wrap:wrap;}
      .nsf-editor-structure{flex:1 1 420px;display:flex;flex-direction:column;gap:0.95rem;min-width:280px;}
      .nsf-editor-preview-panel{flex:1 1 420px;min-width:320px;display:flex;flex-direction:column;gap:0.65rem;background:rgba(15,23,42,0.55);border-radius:0.9rem;border:1px solid rgba(148,163,184,0.25);padding:0.85rem;max-height:100%;overflow:auto;}
      .nsf-editor-preview-tabs{display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.35rem;justify-content:center;}
      .nsf-editor-preview-tab{background:rgba(148,163,184,0.18);border:1px solid rgba(148,163,184,0.35);border-radius:0.6rem;padding:0.3rem 0.75rem;color:rgba(226,232,240,0.85);font:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-editor-preview-tab:hover{background:rgba(148,163,184,0.28);transform:translateY(-1px);}
      .nsf-editor-preview-tab.is-active{background:rgba(248,250,252,0.22);color:rgba(15,23,42,0.9);border-color:rgba(248,250,252,0.45);}
      .nsf-editor-preview-title{font-weight:700;font-size:0.95rem;letter-spacing:0.02em;}
      .nsf-editor-preview-content{flex:1;white-space:pre-wrap;background:rgba(15,23,42,0.35);border-radius:0.75rem;padding:0.65rem;font-family:var(--nsf-mono-font,inherit);line-height:1.45;min-height:200px;overflow:auto;}
      .nsf-editor-preview-panel.is-empty .nsf-editor-preview-content{opacity:0.7;font-style:italic;}
      .nsf-editor-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.3rem;}
      .nsf-editor-active-info{font-size:0.78rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;opacity:0.82;}
      .nsf-editor-active-info.dirty{color:rgba(251,191,36,0.95);}
      .nsf-editor-new{background:rgba(34,197,94,0.18);border:1px solid rgba(74,222,128,0.45);border-radius:0.65rem;padding:0.45rem 0.85rem;color:rgba(187,247,208,0.95);font:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-editor-new:hover{background:rgba(34,197,94,0.28);transform:translateY(-1px);}
      .nsf-editor-filter{background:rgba(59,130,246,0.18);border:1px solid rgba(96,165,250,0.45);border-radius:0.65rem;padding:0.45rem 0.85rem;color:rgba(191,219,254,0.95);font:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;margin-left:auto;}
      .nsf-editor-filter:hover{background:rgba(59,130,246,0.28);transform:translateY(-1px);}
      .nsf-editor-filter.is-active{background:rgba(37,99,235,0.35);}
      .nsf-editor-sidebar{flex:0 0 240px;display:flex;flex-direction:column;gap:0.75rem;background:rgba(15,23,42,0.55);border-radius:0.95rem;border:1px solid rgba(148,163,184,0.25);padding:0.85rem;max-height:100%;overflow:auto;}
      .nsf-editor-presets-header{font-weight:700;font-size:0.95rem;}
      .nsf-editor-presets-list{display:flex;flex-direction:column;gap:0.45rem;}
      .nsf-editor-preset{display:flex;align-items:center;gap:0.35rem;background:rgba(148,163,184,0.16);border-radius:0.75rem;padding:0.4rem 0.5rem;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-editor-preset.active{border:1px solid rgba(59,130,246,0.45);background:rgba(59,130,246,0.2);}
      .nsf-editor-preset.dirty{box-shadow:0 0 0 1px rgba(251,191,36,0.55) inset;}
      .nsf-editor-preset-load{flex:1;background:transparent;border:none;color:inherit;font:inherit;text-align:left;cursor:pointer;}
      .nsf-editor-preset-load:hover{color:#fff;}
      .nsf-editor-preset-rename{background:rgba(59,130,246,0.2);border:none;border-radius:0.55rem;width:1.8rem;height:1.8rem;display:inline-flex;align-items:center;justify-content:center;color:rgba(191,219,254,0.9);cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-editor-preset-rename:hover{background:rgba(59,130,246,0.32);transform:scale(1.05);}
      .nsf-editor-preset-remove{background:rgba(248,113,113,0.24);border:none;border-radius:999px;width:2rem;height:2rem;display:inline-flex;align-items:center;justify-content:center;color:rgba(248,113,113,0.95);cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-editor-preset-remove:hover{background:rgba(248,113,113,0.35);transform:scale(1.05);}
      .nsf-editor-presets-empty{opacity:0.7;font-size:0.85rem;font-style:italic;}
      .nsf-editor-presets-save{display:flex;flex-direction:column;gap:0.5rem;margin-top:auto;}
      .nsf-editor-presets-label{font-size:0.74rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75;}
      .nsf-editor-presets-input{background:rgba(15,23,42,0.6);border:1px solid rgba(148,163,184,0.35);border-radius:0.65rem;padding:0.45rem 0.6rem;color:#e2e8f0;font:inherit;}
      .nsf-editor-presets-input:focus{outline:2px solid rgba(59,130,246,0.45);outline-offset:2px;}
      .nsf-editor-presets-save .nsf-btn{align-self:flex-start;}
      @media (max-width:860px){
        .nsf-editor-content{flex-direction:column;}
        .nsf-editor-workspace{flex-direction:column;flex-wrap:nowrap;}
        .nsf-editor-preview-panel{flex:1 1 auto;min-width:0;width:100%;}
        .nsf-editor-structure{flex:1 1 auto;min-width:0;}
        .nsf-editor-sidebar{flex:1 1 auto;}
      }
      .nsf-editor-dialog-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;}
      .nsf-editor-dialog-title{font-size:1.2rem;font-weight:700;margin:0;}
      .nsf-editor-close{background:rgba(248,113,113,0.2);border:none;border-radius:999px;width:2.2rem;height:2.2rem;color:rgba(248,113,113,0.95);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:1.1rem;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-editor-close:hover{background:rgba(248,113,113,0.32);transform:scale(1.05);}
      .nsf-editor-list{display:flex;flex-direction:column;gap:0.85rem;}
      .nsf-editor-insert{display:flex;justify-content:center;margin:0.15rem 0;}
      .nsf-editor-insert-select{appearance:none;background:rgba(59,130,246,0.18);border:1px dashed rgba(96,165,250,0.6);border-radius:0.75rem;padding:0.45rem 0.9rem;font:inherit;color:rgba(191,219,254,0.95);cursor:pointer;min-width:220px;text-align:center;transition:background 0.15s ease,transform 0.15s ease,box-shadow 0.15s ease;}
      .nsf-editor-insert-select:hover{background:rgba(59,130,246,0.3);transform:translateY(-1px);box-shadow:0 12px 24px rgba(59,130,246,0.25);}
      .nsf-editor-insert-select:focus{outline:2px solid rgba(96,165,250,0.45);outline-offset:2px;}
      .nsf-editor-insert-select option{background:rgba(15,23,42,0.95);color:#e2e8f0;}
      .nsf-editor-block{background:rgba(15,23,42,0.88);border-radius:0.95rem;border:1px solid rgba(148,163,184,0.25);box-shadow:0 18px 36px rgba(15,23,42,0.5);padding:0.9rem;display:flex;flex-direction:column;gap:0.65rem;cursor:grab;position:relative;transition:box-shadow 0.15s ease,transform 0.15s ease;}
      .nsf-editor-block.dragging{opacity:0.9;box-shadow:0 22px 44px rgba(59,130,246,0.45);}
      .nsf-editor-header{font-weight:700;font-size:0.96rem;display:flex;align-items:center;gap:0.45rem;user-select:none;touch-action:none;}
      .nsf-editor-header-title{flex:1;display:flex;align-items:center;gap:0.35rem;}
      .nsf-editor-header-label{flex:1;}
      .nsf-editor-rename{background:rgba(59,130,246,0.2);border:none;border-radius:0.55rem;width:1.8rem;height:1.8rem;display:inline-flex;align-items:center;justify-content:center;color:rgba(191,219,254,0.9);cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;font-size:0.95rem;}
      .nsf-editor-rename:hover{background:rgba(59,130,246,0.32);transform:scale(1.05);}
      .nsf-editor-block-actions{display:flex;align-items:center;gap:0.35rem;}
      .nsf-editor-block-action{background:rgba(248,113,113,0.2);border:none;border-radius:999px;width:2rem;height:2rem;display:inline-flex;align-items:center;justify-content:center;color:rgba(248,113,113,0.92);cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-editor-block-action:hover{background:rgba(248,113,113,0.32);transform:scale(1.05);}
      .nsf-editor-block[data-editable='0'] .nsf-editor-header{opacity:0.85;}
      .nsf-editor-lines{display:flex;flex-direction:column;gap:0.45rem;}
      .nsf-editor-line{display:flex;align-items:center;gap:0.45rem;background:rgba(15,23,42,0.4);border-radius:0.75rem;padding:0.4rem 0.45rem;}
      .nsf-editor-linebreak{background:rgba(59,130,246,0.18);border:1px dashed rgba(59,130,246,0.55);border-radius:0.75rem;padding:0.45rem 0.6rem;text-align:center;font-style:italic;opacity:0.85;}
      .nsf-editor-input{flex:1;border:none;border-radius:0.6rem;padding:0.45rem 0.55rem;font:inherit;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);resize:none;min-height:2.4rem;line-height:1.4;overflow:hidden;}
      .nsf-editor-input::placeholder{color:rgba(107,114,128,0.65);}
      .nsf-editor-block[data-editable='0'] .nsf-editor-input{background:rgba(15,23,42,0.25);color:#cbd5f5;cursor:default;resize:none;}
      .nsf-editor-input:read-only{cursor:default;}
      .nsf-editor-remove{background:rgba(248,113,113,0.18);border:none;border-radius:0.55rem;width:1.8rem;height:1.8rem;display:inline-flex;align-items:center;justify-content:center;color:rgba(248,113,113,0.92);cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-editor-remove:hover{background:rgba(248,113,113,0.3);transform:scale(1.05);}
      .nsf-editor-aspen-controls{display:flex;flex-wrap:wrap;gap:0.5rem;align-items:flex-start;}
      .nsf-editor-aspen-picker{position:relative;flex:1;min-width:220px;display:flex;flex-direction:column;gap:0.35rem;}
      .nsf-editor-aspen-picker.is-disabled{opacity:0.65;}
      .nsf-editor-aspen-input{background:rgba(15,23,42,0.85);border:1px solid rgba(148,163,184,0.55);border-radius:0.65rem;padding:0.45rem 0.65rem;font:inherit;color:#f8fafc;}
      .nsf-editor-aspen-input:focus{outline:2px solid rgba(96,165,250,0.6);outline-offset:2px;}
      .nsf-editor-aspen-input::placeholder{color:rgba(226,232,240,0.55);}
      .nsf-editor-aspen-options{position:absolute;top:calc(100% + 0.35rem);left:0;right:0;max-height:220px;overflow:auto;background:rgba(15,23,42,0.98);border:1px solid rgba(148,163,184,0.55);border-radius:0.65rem;box-shadow:0 18px 36px rgba(15,23,42,0.6);display:none;flex-direction:column;z-index:12;}
      .nsf-editor-aspen-options.open{display:flex;}
      .nsf-editor-aspen-option{background:transparent;border:none;padding:0.5rem 0.75rem;text-align:left;font:inherit;color:#f8fafc;cursor:pointer;}
      .nsf-editor-aspen-option.is-active{background:rgba(59,130,246,0.32);}
      .nsf-editor-aspen-option.is-selected{font-weight:600;}
      .nsf-editor-aspen-option.nsf-editor-aspen-empty{cursor:default;}
      .nsf-editor-aspen-load{background:rgba(255,255,255,0.16);border:none;border-radius:0.65rem;padding:0.45rem 0.85rem;color:#e2e8f0;font:inherit;cursor:pointer;transition:background 0.15s ease;}
      .nsf-editor-aspen-load:hover{background:rgba(255,255,255,0.25);}
      .nsf-editor-aspen-value{background:rgba(15,23,42,0.35);border-radius:0.75rem;padding:0.6rem 0.75rem;font:inherit;min-height:2.4rem;display:flex;align-items:flex-start;justify-content:flex-start;color:#e2e8f0;white-space:pre-wrap;width:100%;}
      .nsf-editor-aspen-empty{opacity:0.7;font-style:italic;}
      .nsf-editor-actions{display:flex;justify-content:flex-end;gap:0.6rem;margin-top:auto;flex-wrap:wrap;}
      .nsf-editor-save{background:linear-gradient(135deg,rgba(59,130,246,0.85),rgba(96,165,250,0.9));color:#fff;border:none;border-radius:0.8rem;padding:0.65rem 1.4rem;font:inherit;font-weight:700;cursor:pointer;box-shadow:0 18px 32px rgba(59,130,246,0.35);transition:transform 0.15s ease,box-shadow 0.15s ease;}
      .nsf-editor-save:hover{transform:translateY(-1px);box-shadow:0 20px 38px rgba(59,130,246,0.45);}
      .nsf-editor-save:active{transform:translateY(0);box-shadow:0 16px 28px rgba(59,130,246,0.4);}
      .nsf-editor-menu{position:fixed;z-index:410;background:rgba(15,23,42,0.95);border-radius:0.85rem;border:1px solid rgba(148,163,184,0.35);box-shadow:0 18px 36px rgba(15,23,42,0.55);padding:0.35rem;display:flex;flex-direction:column;min-width:170px;}
      .nsf-editor-menu-btn{background:transparent;border:none;border-radius:0.65rem;padding:0.5rem 0.75rem;font:inherit;color:#f8fafc;text-align:left;cursor:pointer;transition:background 0.15s ease;}
      .nsf-editor-menu-btn:hover{background:rgba(59,130,246,0.22);}
      .nsf-output{background:rgba(15,23,42,0.18);border-radius:0.9rem;padding:0.6rem 0.75rem;display:flex;flex-direction:column;gap:0.45rem;min-height:0;}
      .nsf-output-header{display:flex;align-items:center;justify-content:space-between;font-weight:600;}
      .nsf-copy-btn{background:rgba(255,255,255,0.16);border:none;border-radius:0.6rem;padding:0.3rem 0.5rem;color:inherit;font:inherit;cursor:pointer;transition:background 0.15s ease;display:flex;align-items:center;gap:0.3rem;}
      .nsf-copy-btn:hover{background:rgba(255,255,255,0.28);}
      .nsf-copy-btn.copied{background:rgba(16,185,129,0.35);}
      .nsf-copy-btn .nsf-copy-feedback{font-size:0.85rem;opacity:0;transition:opacity 0.15s ease;}
      .nsf-copy-btn.copied .nsf-copy-feedback{opacity:1;}
      .nsf-textarea{flex:1;min-height:0;border:none;border-radius:0.75rem;padding:0.6rem 0.65rem;font:inherit;resize:vertical;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);overflow:hidden;}
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
    updateValue(BOARD_DOC_KEY);
    updateValue(ASPEN_DOC_KEY);
    updateValue(DATA_KEY);
    updateValue(STATE_KEY);
    updateValue(FINDINGS_PATH_KEY);
    window.addEventListener('storage',e=>{
      if(!e) return;
      if(e.key===BOARD_DOC_KEY||e.key===ASPEN_DOC_KEY||e.key===DATA_KEY||e.key===STATE_KEY||e.key===FINDINGS_PATH_KEY){
        lastValues[e.key]=localStorage.getItem(e.key);
        scheduleAll();
      }
    });
    window.addEventListener(UNIT_BOARD_EVENT,()=>scheduleAll());
    setInterval(()=>{
      const boardDoc=localStorage.getItem(BOARD_DOC_KEY);
      if(boardDoc!==lastValues[BOARD_DOC_KEY]){lastValues[BOARD_DOC_KEY]=boardDoc;scheduleAll();}
      const aspenDoc=localStorage.getItem(ASPEN_DOC_KEY);
      if(aspenDoc!==lastValues[ASPEN_DOC_KEY]){lastValues[ASPEN_DOC_KEY]=aspenDoc;scheduleAll();}
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

  const ASPEN_MELDUNG_FIELD_ALIASES=[
    'Meldung','Meldungsnummer','Meldungsnr','Meldungs_No','MELDUNGS_NO','MELDUNG','MELDUNG_NO','Meldungs ID','Meldungs-ID',
    'Meldungs Id','MeldungsCode','Meldungscode','Meldungs Code','Meldung Nr','MeldungsNr','Meldungsnummer',
    'Notification','Notification No','Notification_No','Notification Number','NotificationNumber','NotificationNr',
    'Notification_Id','NotificationId','Notification ID','Notif','Notif No','Notif_No','Notif Number','NotifNumber','NotifNr'
  ];

  const SERIAL_FIELD_KEYS=Array.from(new Set(SERIAL_FIELD_ALIASES.map(alias=>canonicalKey(alias)).filter(Boolean)));
  const ASPEN_MELDUNG_FIELD_KEYS=Array.from(new Set(ASPEN_MELDUNG_FIELD_ALIASES.map(alias=>canonicalKey(alias)).filter(Boolean)));

  const FIELD_RECORD_KEY_PROPS=[
    'key','name','label','field','fieldkey','source','sourcekey','originalkey','identifier','id',
    'aspkey','aspfield','aspenkey','aspenfield','column','columnkey','header','slug'
  ];
  const FIELD_RECORD_VALUE_PROPS=[
    'value','val','text','content','data','stringvalue','valuestring','fieldvalue','fieldval',
    'valuetext','displayvalue','display','payload','body','rawvalue','actualvalue'
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

  function extractRecordValue(map){
    if(!map||typeof map!=='object') return '';
    for(const prop of FIELD_RECORD_VALUE_PROPS){
      if(Object.prototype.hasOwnProperty.call(map,prop)){
        const text=valueToText(map[prop]);
        if(text) return text;
      }
    }
    if(Object.prototype.hasOwnProperty.call(map,'values')){
      const text=valueToText(map.values);
      if(text) return text;
    }
    return '';
  }

  function matchRecordByAlias(map,aliasKey){
    if(!map||typeof map!=='object'||!aliasKey) return '';
    for(const prop of FIELD_RECORD_KEY_PROPS){
      if(!Object.prototype.hasOwnProperty.call(map,prop)) continue;
      const keyCandidate=valueToText(map[prop]);
      const canonical=canonicalKey(keyCandidate);
      if(canonical===aliasKey){
        const value=extractRecordValue(map);
        if(value) return value;
      }
    }
    return '';
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
    const aliasKeys=[];
    for(const alias of aliases){
      const key=canonicalKey(alias);
      if(key) aliasKeys.push(key);
    }
    for(const key of aliasKeys){
      if(!Object.prototype.hasOwnProperty.call(map,key)) continue;
      const value=map[key];
      if(value==null) continue;
      if(typeof value==='object'){
        objectMatches.push(value);
      }else{
        const text=valueToText(value);
        if(text) return text;
      }
    }
    for(const key of aliasKeys){
      const recordMatch=matchRecordByAlias(map,key);
      if(recordMatch) return recordMatch;
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

  function parseBoardDocument(){
    let docRaw='';
    let doc=null;
    try{docRaw=localStorage.getItem(BOARD_DOC_KEY)||'';}
    catch(err){console.warn('NSF: module_data_v1 konnte nicht gelesen werden',err);}
    if(docRaw){
      try{doc=JSON.parse(docRaw);}
      catch(err){console.warn('NSF: module_data_v1 konnte nicht geparst werden',err);doc=null;docRaw='';}
    }
    if(!doc||typeof doc!=='object') doc={};
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
    return {docRaw,meldung,part,repairOrder,hasDoc,doc};
  }

  function parseAspenDocument(){
    let docRaw='';
    let doc=null;
    try{docRaw=localStorage.getItem(ASPEN_DOC_KEY)||'';}
    catch(err){console.warn('NSF: nsf-aspen-doc konnte nicht gelesen werden',err);}
    if(docRaw){
      try{doc=JSON.parse(docRaw);}
      catch(err){console.warn('NSF: Aspen-Daten konnten nicht geparst werden',err);doc=null;docRaw='';}
    }
    if(!doc||typeof doc!=='object') doc=null;
    const general=doc&&typeof doc==='object'&&!Array.isArray(doc)?doc.general||{}:{};
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
    const hasDoc=!!docRaw;
    return {docRaw,doc,hasDoc,general,part};
  }

  function loadAspenBoardState(){
    let raw='';
    try{raw=localStorage.getItem(ASPEN_BOARD_STATE_KEY)||'';}
    catch(err){console.warn('NSF: aspenUnitListState konnte nicht gelesen werden',err);}
    if(!raw) return null;
    try{
      const parsed=JSON.parse(raw);
      return parsed&&typeof parsed==='object'?parsed:null;
    }catch(err){
      console.warn('NSF: aspenUnitListState konnte nicht geparst werden',err);
      return null;
    }
  }

  function findAspenBoardRecord(meldung,repairOrder){
    const state=loadAspenBoardState();
    if(!state) return {state:null,record:null,fields:[]};
    const items=Array.isArray(state.items)?state.items:[];
    const normalizedMeldung=clean(meldung||'');
    let record=null;
    if(normalizedMeldung){
      record=items.find(item=>clean(item&&item.meldung)===normalizedMeldung)||null;
    }
    if(!record){
      const normalizedRepair=clean(repairOrder||'').toLowerCase();
      if(normalizedRepair){
        record=items.find(item=>{
          const data=item&&item.data&&typeof item.data==='object'?item.data:{};
          return Object.entries(data).some(([key,val])=>{
            const canonical=canonicalKey(key);
            if(!canonical) return false;
            if(canonical==='repairorder'||canonical==='auftragsno'||canonical==='auftrag'||canonical==='auftragsnummer'){
              return clean(val||'').toLowerCase()===normalizedRepair;
            }
            return false;
          });
        })||null;
      }
    }
    const fields=Array.isArray(state.fields)?state.fields.slice():[];
    return {state,record,fields};
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

  function findSerialForMeldung(doc,meldung){
    const lookupTarget=clean(meldung);
    const normalizedTarget=lookupTarget.toLowerCase();
    if(!doc||typeof doc!=='object'){
      return {serial:'',reason:'Keine Aspen-Datei geladen',lookup:lookupTarget};
    }
    if(!normalizedTarget){
      return {serial:'',reason:'Keine Meldung ausgewählt',lookup:lookupTarget};
    }
    const visited=new Set();
    let foundMeldung=false;
    let foundMeldungWithoutSerial=false;

    const extractFromNode=(node,aliasKeys,map)=>{
      if(!node||typeof node!=='object') return '';
      const fieldMap=map&&typeof map==='object'?map:buildFieldMap(node);
      for(const key of aliasKeys){
        if(Object.prototype.hasOwnProperty.call(fieldMap,key)){
          const text=valueToText(fieldMap[key]);
          const cleaned=clean(text);
          if(cleaned) return cleaned;
        }
      }
      for(const [rawKey,rawValue] of Object.entries(node)){
        if(rawValue==null) continue;
        const canonical=canonicalKey(rawKey);
        if(!canonical) continue;
        for(const alias of aliasKeys){
          if(!alias) continue;
          if(canonical===alias||canonical.includes(alias)){
            const cleaned=valueToText(rawValue);
            if(cleaned) return clean(cleaned);
          }
        }
      }
      for(const key of aliasKeys){
        const recordValue=matchRecordByAlias(fieldMap,key);
        const cleaned=clean(recordValue);
        if(cleaned) return cleaned;
      }
      return '';
    };

    const search=node=>{
      if(!node||typeof node!=='object') return '';
      if(visited.has(node)) return '';
      visited.add(node);
      if(Array.isArray(node)){
        for(const item of node){
          const result=search(item);
          if(result) return result;
        }
        return '';
      }
      const map=buildFieldMap(node);
      for(const value of Object.values(node)){
        if(value&&typeof value==='object'){
          const nested=search(value);
          if(nested) return nested;
        }
      }
      const meldungValue=extractFromNode(node,ASPEN_MELDUNG_FIELD_KEYS,map);
      if(meldungValue&&clean(meldungValue).toLowerCase()===normalizedTarget){
        foundMeldung=true;
        let serialValue=extractFromNode(node,SERIAL_FIELD_KEYS,map);
        if(!serialValue){
          serialValue=clean(extractNestedField(node,SERIAL_FIELD_ALIASES));
        }
        if(serialValue){
          return clean(serialValue);
        }
        foundMeldungWithoutSerial=true;
      }
      return '';
    };

    const serial=clean(search(doc));
    if(serial){
      return {serial,reason:'Seriennummer aus Aspen übernommen',lookup:lookupTarget};
    }
    if(foundMeldungWithoutSerial){
      return {serial:'',reason:'Meldung gefunden, aber ohne Seriennummer',lookup:lookupTarget};
    }
    return {serial:'',reason:'Meldung in Aspen-Datei nicht gefunden',lookup:lookupTarget};
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

  function buildAspenDataset(headers,dataRows){
    const normalizedHeaders=Array.isArray(headers)
      ? headers.map(header=>clean(header))
      : [];
    if(!normalizedHeaders.some(Boolean)) return null;
    const records=[];
    if(Array.isArray(dataRows)){
      dataRows.forEach(row=>{
        if(!Array.isArray(row)) return;
        const record={};
        let hasValue=false;
        normalizedHeaders.forEach((header,idx)=>{
          if(!header) return;
          const value=clean(row[idx]);
          if(value) hasValue=true;
          record[header]=value;
        });
        if(Object.keys(record).length&&hasValue) records.push(record);
      });
    }
    if(!records.length) return null;
    return {general:{...records[0]},rows:records};
  }

  function parseAspenCsv(text){
    const trimmed=(text||'').trim();
    if(!trimmed) return null;
    const lines=trimmed.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    if(!lines.length) return null;
    const delimiter=detectDelimiter(lines[0]);
    const headers=splitCsvLine(lines[0],delimiter);
    if(!headers.length) return null;
    const rowValues=[];
    for(let i=1;i<lines.length;i+=1){
      const line=lines[i];
      if(!line) continue;
      rowValues.push(splitCsvLine(line,delimiter));
    }
    return buildAspenDataset(headers,rowValues);
  }

  async function parseAspenXlsx(file){
    if(!file) return null;
    try{await ensureXlsx();}
    catch(err){console.warn('NSF: XLSX konnte nicht geladen werden',err);return null;}
    let buffer;
    try{buffer=await file.arrayBuffer();}
    catch(err){console.warn('NSF: Aspen-XLSX konnte nicht gelesen werden',err);return null;}
    if(!buffer||!buffer.byteLength) return null;
    let workbook;
    try{workbook=XLSX.read(buffer,{type:'array'});}
    catch(err){console.warn('NSF: Aspen-XLSX konnte nicht geparst werden',err);return null;}
    const sheetNames=Array.isArray(workbook?.SheetNames)?workbook.SheetNames:[];
    for(const name of sheetNames){
      if(!name) continue;
      const sheet=workbook.Sheets?.[name];
      if(!sheet) continue;
      let rows;
      try{rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});}
      catch(err){console.warn('NSF: Aspen-XLSX konnte nicht gelesen werden',err);continue;}
      if(!Array.isArray(rows)||!rows.length) continue;
      let headerIndex=-1;
      for(let i=0;i<rows.length;i+=1){
        const candidate=rows[i];
        if(Array.isArray(candidate)&&candidate.some(cell=>clean(cell))){
          headerIndex=i;
          break;
        }
      }
      if(headerIndex<0) continue;
      const headerRow=rows[headerIndex];
      const dataRows=rows.slice(headerIndex+1);
      const dataset=buildAspenDataset(headerRow,dataRows);
      if(dataset) return dataset;
    }
    return null;
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

  function createEmptyActiveState(){
    return {findings:'',actions:'',routine:'',nonroutine:'',parts:'',customSections:[]};
  }

  let customSectionIdCounter=0;

  function createCustomSectionId(){
    customSectionIdCounter=(customSectionIdCounter+1)%1e6;
    return `nsf-custom-${Date.now().toString(36)}-${customSectionIdCounter.toString(36)}`;
  }

  function cloneCustomSection(section){
    return {
      id:typeof section?.id==='string'?section.id:'',
      text:typeof section?.text==='string'?section.text:'',
      slot:Number.isFinite(section?.slot)?section.slot:0
    };
  }

  function cloneActiveState(state){
    if(!state||typeof state!=='object') return createEmptyActiveState();
    return {
      findings:typeof state.findings==='string'?state.findings:'',
      actions:typeof state.actions==='string'?state.actions:'',
      routine:typeof state.routine==='string'?state.routine:'',
      nonroutine:typeof state.nonroutine==='string'?state.nonroutine:'',
      parts:typeof state.parts==='string'?state.parts:'',
      customSections:Array.isArray(state.customSections)
        ?state.customSections.map(cloneCustomSection)
        :[]
    };
  }

  function normalizeCustomSections(value,slotCount=CUSTOM_SLOT_COUNT){
    const maxSlot=Math.max(0,(Number.isFinite(slotCount)?slotCount:1)-1);
    if(!Array.isArray(value)) return [];
    const seen=new Set();
    const result=[];
    value.forEach(raw=>{
      if(!raw||typeof raw!=='object') return;
      let id=typeof raw.id==='string'?raw.id.trim():'';
      if(!id||seen.has(id)){
        id=createCustomSectionId();
      }
      seen.add(id);
      const text=typeof raw.text==='string'?raw.text:'';
      let slot=Number.isFinite(raw.slot)?Math.floor(raw.slot):0;
      if(slot<0) slot=0;
      if(slot>maxSlot) slot=maxSlot;
      result.push({id,text,slot});
    });
    return result;
  }

  function extractStateFromEntry(entry){
    return {
      findings: typeof entry?.findings==='string'?entry.findings:'',
      actions: typeof entry?.actions==='string'?entry.actions:'',
      routine: typeof entry?.routine==='string'?entry.routine:'',
      nonroutine: typeof entry?.nonroutine==='string'?entry.nonroutine:'',
      parts: typeof entry?.parts==='string'?entry.parts:'',
      customSections: normalizeCustomSections(entry?.customSections)
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
      customSections: Array.isArray(state.customSections)?state.customSections.map(cloneCustomSection):[],
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
    const lineHeight=parseFloat(computed.lineHeight)||16;
    const paddingTop=parseFloat(computed.paddingTop)||0;
    const paddingBottom=parseFloat(computed.paddingBottom)||0;
    const borderTop=parseFloat(computed.borderTopWidth)||0;
    const borderBottom=parseFloat(computed.borderBottomWidth)||0;
    const minRowsValue=Number(textarea.dataset?.minRows);
    const minRows=Number.isFinite(minRowsValue)?minRowsValue:0;
    const rawValue=typeof textarea.value==='string'?textarea.value:'';
    const lineCount=Math.max(rawValue.split('\n').length,minRows||1);
    const baseHeight=lineCount*lineHeight+paddingTop+paddingBottom+borderTop+borderBottom;
    const minHeight=Math.max(parseFloat(computed.minHeight)||0,baseHeight);
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
      this.activeState=createEmptyActiveState();
      this.allEntries=[];
      this.partEntries=[];
      this.availableEntries=[];
      this.inputsContainer=null;
      this.textareas={};
      this.partsRows=[];
      this.partsFieldContainer=null;
      this.customSections=[];
      this.customSlots=[];
      this.customSlotSortables=[];
      this.customSectionMap=new Map();
      this.aspenDoc=null;
      this.aspenFieldOptions=[];
      this.aspenBoardRecord=null;
      this.aspenFileInput=null;
      this.routineEditorState=loadRoutineEditorState();
      this.routineEditorPresets=loadRoutineEditorPresets();
      this.routineEditorActivePresetId=loadRoutineEditorActivePresetId(this.routineEditorPresets);
      if(!this.routineEditorActivePresetId&&Array.isArray(this.routineEditorPresets)&&this.routineEditorPresets.length){
        const match=this.routineEditorPresets.find(preset=>isRoutineEditorStateEqual(preset.state,this.routineEditorState));
        if(match){
          this.routineEditorActivePresetId=match.id;
          storeRoutineEditorActivePresetId(this.routineEditorActivePresetId);
        }
      }
      if(!Array.isArray(this.routineEditorPresets)) this.routineEditorPresets=[];
      this.routineEditorBlocks={};
      this.routineEditorOverlay=null;
      this.routineEditorList=null;
      this.routineEditorPresetList=null;
      this.routineEditorPresetNameInput=null;
      this.routineEditorPresetSaveButton=null;
      this.routineEditorActivePresetDirty=false;
      this.routineEditorPresetNameTouched=false;
      this.routineEditorActiveInfo=null;
      this.routineEditorNewPresetButton=null;
      this.routineEditorMenu=null;
      this.routineEditorMenuCleanup=null;
      this.routineEditorContextHandler=null;
      this.routineEditorContextTarget=null;
      this.routineEditorContextHandlers=new Map();
      this.routineEditorMenuTabKey=null;
      this.routineEditorActiveTab=loadRoutineEditorActiveTab();
      this.routineEditorDerivedLines={findings:[],actions:[]};
      this.routineEditorDragState=null;
      this.parameterFavorites=loadRoutineEditorParameterFavorites();
      this.parameterFavoriteSet=new Set(Array.isArray(this.parameterFavorites)?this.parameterFavorites:[]);
      this.routineEditorParameterOptions=[];
      this.routineEditorParameterOptionMap=new Map();
      this.routineEditorParameterFavoritesOnly=false;
      this.routineEditorParameterFilterButton=null;
      this.routineEditorPreviewTabButtons=new Map();
      this.routineEditorPreviewTitleElement=null;
      this.routineEditorPreviewTabBar=null;
      this.saveTimer=null;
      this.selectionRows=[];
      this.currentPart='';
      this.partSource='';
      this.meldung='';
      this.serial='';
      this.serialStatus='';
      this.serialLookupMeldung='';
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
      this.preservedAspenState=null;
      this.restoredAspenState=false;
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
      const boardDocInfo=parseBoardDocument();
      const aspenDocInfo=parseAspenDocument();
      this.repairOrder=boardDocInfo.repairOrder||'';
      this.aspenDoc=aspenDocInfo.doc&&typeof aspenDocInfo.doc==='object'?aspenDocInfo.doc:null;
      const boardInfo=findAspenBoardRecord(boardDocInfo.meldung,this.repairOrder);
      this.aspenBoardRecord=boardInfo.record;
      this.aspenFieldOptions=this.computeAspenFieldOptions(this.aspenDoc,this.repairOrder,boardInfo);
      this.hasAspenDoc=aspenDocInfo.hasDoc||!!(this.aspenFieldOptions&&this.aspenFieldOptions.length);
      if(this.routineEditorOverlay&&this.routineEditorOverlay.classList.contains('open')){
        this.refreshAspenPickerOptions();
      }
      this.meldung=boardDocInfo.meldung;
      this.updateAspenBlocksFromDoc();
      const boardEntry=this.meldung?findAspenBoardEntry(this.meldung):null;
      const boardPart=boardEntry?extractPartFromBoard(boardEntry):'';
      let part='';
      let partSource='';
      if(boardPart){
        part=boardPart;
        partSource='aspen-board';
      }
      if(!part&&boardDocInfo.part){
        part=boardDocInfo.part;
        partSource='module-data';
      }
      if(!part&&aspenDocInfo.part){
        part=aspenDocInfo.part;
        partSource='aspen-header';
      }
      if(!part){
        const fallback=this.meldung?data.dictionary.get(normalizeKey(this.meldung))||'':'';
        if(fallback){part=fallback;partSource='dictionary';}
      }
      const previousPart=this.currentPart;
      this.currentPart=part;
      this.partSource=part?partSource:'';
      const serialResult=findSerialForMeldung(this.aspenDoc,this.meldung);
      this.serial=serialResult.serial||'';
      this.serialStatus=serialResult.reason||'';
      this.serialLookupMeldung=serialResult.lookup||'';
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
      const preserved=this.preservedAspenState;
      this.preservedAspenState=null;
      this.restoredAspenState=false;
      if(this.stateKey!==previousKey){
        this.undoBuffer=null;
      }
      let selections=[];
      const canRestorePreserved=preserved
        &&clean(preserved.meldung)===clean(this.meldung)
        &&normalizePart(preserved.part)===normalizePart(this.currentPart);
      if(canRestorePreserved){
        this.activeState=cloneActiveState(preserved.activeState);
        selections=Array.isArray(preserved.selections)
          ?preserved.selections.map(sel=>({...sel}))
          :[];
        if(typeof preserved.filterAll==='boolean'){
          this.filterAll=preserved.filterAll;
        }
        this.restoredAspenState=true;
      }else if(this.stateKey){
        const loaded=loadStateFor(this.stateKeyParts);
        const loadedState=loaded.state&&typeof loaded.state==='object'?loaded.state:createEmptyActiveState();
        this.activeState={...createEmptyActiveState(),...loadedState};
        selections=loaded.selections||[];
        this.globalState=loaded.global;
        if(loaded.migrated){
          this.globalState=loadGlobalState();
        }
      }else{
        this.activeState=createEmptyActiveState();
        selections=[];
      }
      this.customSections=normalizeCustomSections(this.activeState.customSections);
      this.rebuildCustomSectionMap();
      this.syncCustomSectionsToActiveState({save:false});
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
      if(this.restoredAspenState&&this.stateKey){
        this.persistState(true);
        this.restoredAspenState=false;
      }
    }

    renderDom(){
      const root=this.root;
      this.destroyCustomSectionSortables();
      root.innerHTML='';
      this.customSlots=[];
      root.classList.add('nsf-module');
      this.ensureRoutineEditorState();
      this.ensureRoutineEditorPresets(true);
      this.teardownRoutineEditorOverlay();
      this.teardownRoutineEditorInteraction();
      this.routineEditorBlocks={};
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
      fileInput.accept='.json,.csv,.txt,.xlsx,.xlsm';
      fileInput.style.display='none';
      fileInput.addEventListener('change',()=>{
        const file=fileInput.files&&fileInput.files[0];
        if(file){
          this.handleAspenFile(file).finally(()=>{fileInput.value='';});
        }
      });
      this.aspenFileInput=fileInput;

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
      const debugSpan=document.createElement('span');
      debugSpan.className='nsf-header-debug';
      const statusText=this.serialStatus||'';
      const lookupText=this.serialLookupMeldung||'';
      const lookupDisplay=lookupText||'–';
      debugSpan.textContent=`Seriennummer-Status: ${statusText||'–'} | Aspen-Meldung gesucht: ${lookupDisplay}`;
      summary.appendChild(debugSpan);
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
                :this.partSource==='module-data'
                  ?'Modul-Daten'
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

      const outputsLayout=document.createElement('div');
      outputsLayout.className='nsf-outputs-layout';
      outputsSection.appendChild(outputsLayout);

      const outputsWrapper=document.createElement('div');
      outputsWrapper.className='nsf-outputs';
      outputsLayout.appendChild(outputsWrapper);

      this.textareas={};
      this.partsFieldContainer=null;
      this.customSlots=[];
      OUTPUT_DEFS.forEach((def,idx)=>{
        outputsWrapper.appendChild(this.createCustomSlot(idx));
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
          textarea.dataset.minRows='1';
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
          textarea.dataset.minRows='1';
          this.textareas[def.key]=textarea;
          box.append(head,textarea);
          requestAnimationFrame(()=>autoResizeTextarea(textarea));
        }
        outputsWrapper.appendChild(box);
      });
      outputsWrapper.appendChild(this.createCustomSlot(OUTPUT_DEFS.length));

      this.setupRoutineEditorInteraction();

      this.syncOutputsWithSelections({persist:false});

      root.append(contextSection,inputSection,outputsSection);
      this.renderCustomSections();
    }

    createCustomSlot(index){
      const wrapper=document.createElement('div');
      wrapper.className='nsf-custom-slot nsf-custom-slot-empty';
      const list=document.createElement('div');
      list.className='nsf-custom-list';
      list.dataset.slotIndex=String(index);
      wrapper.appendChild(list);
      this.customSlots.push({index,wrapper,list});
      return wrapper;
    }

    createCustomBlock(section){
      const block=document.createElement('div');
      block.className='nsf-custom-block';
      block.dataset.id=section.id;
      const handle=document.createElement('div');
      handle.className='nsf-custom-handle';
      handle.textContent='⠿';
      handle.title='Zum Verschieben ziehen';
      block.appendChild(handle);
      const textarea=document.createElement('textarea');
      textarea.className='nsf-custom-textarea';
      textarea.placeholder='Eigener Text…';
      textarea.value=section.text||'';
      textarea.dataset.minRows='1';
      textarea.addEventListener('input',()=>{
        section.text=textarea.value;
        autoResizeTextarea(textarea);
        this.syncCustomSectionsToActiveState();
      });
      block.appendChild(textarea);
      requestAnimationFrame(()=>autoResizeTextarea(textarea));
      const remove=document.createElement('button');
      remove.type='button';
      remove.className='nsf-custom-remove';
      remove.textContent='✖';
      remove.title='Textfeld entfernen';
      remove.setAttribute('aria-label','Textfeld entfernen');
      remove.addEventListener('click',()=>this.removeCustomSection(section.id));
      block.appendChild(remove);
      return block;
    }

    updateCustomSlotState(slot){
      if(!slot||!slot.wrapper||!slot.list) return;
      const empty=slot.list.childElementCount===0;
      if(empty){
        slot.wrapper.classList.add('nsf-custom-slot-empty');
      }else{
        slot.wrapper.classList.remove('nsf-custom-slot-empty');
      }
    }

    updateAllCustomSlotStates(){
      if(!Array.isArray(this.customSlots)) return;
      this.customSlots.forEach(slot=>this.updateCustomSlotState(slot));
    }

    renderCustomSections(){
      this.destroyCustomSectionSortables();
      if(!Array.isArray(this.customSlots)) this.customSlots=[];
      this.customSlots.forEach(slot=>{
        if(!slot) return;
        if(slot.list) slot.list.innerHTML='';
        if(slot.wrapper){
          slot.wrapper.classList.add('nsf-custom-slot-empty');
          slot.wrapper.classList.remove('nsf-custom-slot-dragging');
        }
      });
      if(!Array.isArray(this.customSections)) this.customSections=[];
      const slotCount=this.customSlots.length||CUSTOM_SLOT_COUNT;
      const buckets=Array.from({length:slotCount},()=>[]);
      this.customSections.forEach(section=>{
        if(!section||typeof section.id!=='string') return;
        const slotIndex=Math.max(0,Math.min(Number(section.slot)||0,slotCount-1));
        buckets[slotIndex].push(section);
      });
      this.customSlots.forEach(slot=>{
        const sections=buckets[slot.index]||[];
        sections.forEach(section=>{
          const block=this.createCustomBlock(section);
          slot.list.appendChild(block);
        });
        this.updateCustomSlotState(slot);
      });
      this.setupCustomSectionSortables();
    }

    setupCustomSectionSortables(){
      this.destroyCustomSectionSortables();
      this.customSlotSortables=[];
      if(!window.Sortable||!Array.isArray(this.customSlots)) return;
      this.customSlots.forEach(slot=>{
        if(!slot||!slot.list) return;
        const sortable=window.Sortable.create(slot.list,{
          group:'nsf-custom-sections',
          animation:150,
          handle:'.nsf-custom-handle',
          draggable:'.nsf-custom-block',
          onStart:evt=>{
            if(evt?.item) evt.item.classList.add('dragging');
            this.setCustomSlotDragging(true);
          },
          onEnd:evt=>{
            if(evt?.item) evt.item.classList.remove('dragging');
            this.setCustomSlotDragging(false);
            this.syncCustomSectionsFromDom();
          }
        });
        this.customSlotSortables.push(sortable);
      });
    }

    setCustomSlotDragging(active){
      if(!Array.isArray(this.customSlots)) return;
      this.customSlots.forEach(slot=>{
        if(!slot||!slot.wrapper) return;
        if(active){
          slot.wrapper.classList.add('nsf-custom-slot-dragging');
        }else{
          slot.wrapper.classList.remove('nsf-custom-slot-dragging');
        }
      });
      if(!active) this.updateAllCustomSlotStates();
    }

    destroyCustomSectionSortables(){
      if(Array.isArray(this.customSlotSortables)){
        this.customSlotSortables.forEach(sortable=>{
          if(sortable&&typeof sortable.destroy==='function'){
            try{sortable.destroy();}catch{}
          }
        });
      }
      this.customSlotSortables=[];
      this.setCustomSlotDragging(false);
    }

    syncCustomSectionsFromDom(){
      if(!Array.isArray(this.customSlots)) return;
      const collected=[];
      this.customSlots.forEach(slot=>{
        if(!slot||!slot.list) return;
        const slotIndex=Number(slot.index)||0;
        Array.from(slot.list.children||[]).forEach(node=>{
          if(!(node instanceof HTMLElement)) return;
          const id=node.dataset?node.dataset.id:'';
          if(!id) return;
          const textarea=node.querySelector('textarea');
          const text=textarea?textarea.value:(this.customSectionMap.get(id)?.text||'');
          collected.push({id,text,slot:slotIndex});
        });
      });
      this.customSections=normalizeCustomSections(collected,this.customSlots.length||CUSTOM_SLOT_COUNT);
      this.rebuildCustomSectionMap();
      this.syncCustomSectionsToActiveState();
      this.updateAllCustomSlotStates();
    }

    addCustomSection(slotIndex){
      const slotCount=this.customSlots.length||CUSTOM_SLOT_COUNT;
      let targetSlot=Number.isFinite(slotIndex)?Math.floor(slotIndex):0;
      if(targetSlot<0) targetSlot=0;
      if(targetSlot>=slotCount) targetSlot=slotCount-1;
      const section={id:createCustomSectionId(),text:'',slot:targetSlot};
      this.customSections.push(section);
      this.rebuildCustomSectionMap();
      this.syncCustomSectionsToActiveState();
      const slot=this.customSlots.find(item=>item&&item.index===targetSlot);
      if(slot&&slot.list){
        const block=this.createCustomBlock(section);
        slot.list.appendChild(block);
        this.updateCustomSlotState(slot);
        this.setupCustomSectionSortables();
        const textarea=block.querySelector('textarea');
        if(textarea) textarea.focus();
      }else{
        this.renderCustomSections();
      }
    }

    removeCustomSection(id){
      if(!id) return;
      const index=this.customSections.findIndex(section=>section.id===id);
      if(index<0) return;
      this.customSections.splice(index,1);
      this.rebuildCustomSectionMap();
      this.syncCustomSectionsToActiveState();
      if(Array.isArray(this.customSlots)){
        this.customSlots.forEach(slot=>{
          if(!slot||!slot.list) return;
          const node=Array.from(slot.list.children||[]).find(child=>child.dataset&&child.dataset.id===id);
          if(node&&node.parentNode===slot.list){
            slot.list.removeChild(node);
            this.updateCustomSlotState(slot);
          }
        });
      }
    }

    syncCustomSectionsToActiveState(options={}){
      const save=options.save!==false;
      this.activeState.customSections=this.customSections.map(cloneCustomSection);
      if(save) this.queueStateSave();
    }

    rebuildCustomSectionMap(){
      this.customSectionMap=new Map();
      if(!Array.isArray(this.customSections)) return;
      this.customSections.forEach(section=>{
        if(section&&typeof section.id==='string'){
          this.customSectionMap.set(section.id,section);
        }
      });
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
      for(const key of OUTPUT_KEYS){
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
      this.refreshRoutineEditorDerivedLines(computed);
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

    ensureRoutineEditorState(){
      if(!this.routineEditorState||typeof this.routineEditorState!=='object'){
        this.routineEditorState=loadRoutineEditorState();
      }
      this.routineEditorState=normalizeRoutineEditorState(this.routineEditorState);
    }

    getActiveRoutineEditorTab(){
      return getRoutineEditorTabKey(this.routineEditorActiveTab);
    }

    getRoutineEditorTabState(tabKey=this.getActiveRoutineEditorTab()){
      this.ensureRoutineEditorState();
      const key=getRoutineEditorTabKey(tabKey);
      if(!this.routineEditorState.tabs||typeof this.routineEditorState.tabs!=='object'){
        this.routineEditorState=normalizeRoutineEditorState(this.routineEditorState);
      }
      if(!this.routineEditorState.tabs[key]){
        this.routineEditorState.tabs[key]=createDefaultRoutineEditorTabState(key);
      }
      return this.routineEditorState.tabs[key];
    }

    getRoutineEditorBaseBlocks(tabKey=this.getActiveRoutineEditorTab()){
      return getRoutineEditorBaseBlocksForTab(tabKey);
    }

    getRoutineEditorTabConfig(tabKey=this.getActiveRoutineEditorTab()){
      return getRoutineEditorTabConfig(tabKey);
    }

    ensureRoutineEditorPresets(forceReload){
      if(forceReload||!Array.isArray(this.routineEditorPresets)){
        this.routineEditorPresets=loadRoutineEditorPresets();
      }
      if(!Array.isArray(this.routineEditorPresets)) this.routineEditorPresets=[];
      this.routineEditorPresets.sort((a,b)=>a.name.localeCompare(b.name,'de',{sensitivity:'base'}));
      if(typeof this.routineEditorActivePresetId!=='string'){
        this.routineEditorActivePresetId='';
      }
      if(this.routineEditorActivePresetId&&!this.routineEditorPresets.some(preset=>preset.id===this.routineEditorActivePresetId)){
        this.routineEditorActivePresetId='';
        storeRoutineEditorActivePresetId('');
      }
    }

    teardownRoutineEditorOverlay(){
      this.closeRoutineEditorMenu();
      if(this.routineEditorOverlay){
        this.closeRoutineEditorOverlay();
        this.routineEditorOverlay.remove();
      }
      this.routineEditorOverlay=null;
      this.routineEditorList=null;
      this.routineEditorPresetSelect=null;
      this.routineEditorPresetList=null;
      this.routineEditorPresetNameInput=null;
      this.routineEditorPresetSaveButton=null;
      this.routineEditorPreviewPanel=null;
      this.routineEditorPreviewContent=null;
      this.routineEditorBlocks={};
      this.routineEditorDragState=null;
      this.routineEditorParameterFilterButton=null;
      this.routineEditorPreviewTabButtons=new Map();
      this.routineEditorPreviewTitleElement=null;
      this.routineEditorPreviewTabBar=null;
    }

    setupRoutineEditorInteraction(){
      if(!(this.routineEditorContextHandlers instanceof Map)){
        this.routineEditorContextHandlers=new Map();
      }
      this.routineEditorContextHandlers.forEach(({target,handler})=>{
        if(target&&handler){
          target.removeEventListener('contextmenu',handler);
        }
      });
      this.routineEditorContextHandlers.clear();
      ROUTINE_EDITOR_PREVIEW_TAB_KEYS.forEach(tabKey=>{
        const textarea=this.textareas&&this.textareas[tabKey];
        if(!textarea) return;
        const handler=event=>{
          event.preventDefault();
          this.openRoutineEditorMenu(event,tabKey);
        };
        textarea.addEventListener('contextmenu',handler);
        this.routineEditorContextHandlers.set(tabKey,{target:textarea,handler});
      });
    }

    teardownRoutineEditorInteraction(){
      this.closeRoutineEditorMenu();
      if(this.routineEditorContextHandlers instanceof Map){
        this.routineEditorContextHandlers.forEach(({target,handler})=>{
          if(target&&handler){
            target.removeEventListener('contextmenu',handler);
          }
        });
        this.routineEditorContextHandlers.clear();
      }
      this.routineEditorContextTarget=null;
      this.routineEditorContextHandler=null;
    }

    openRoutineEditorMenu(event,tabKey){
      this.closeRoutineEditorMenu();
      const targetTab=getRoutineEditorTabKey(tabKey);
      const menu=document.createElement('div');
      menu.className='nsf-editor-menu';
      const editBtn=document.createElement('button');
      editBtn.type='button';
      editBtn.className='nsf-editor-menu-btn';
      const tabDef=OUTPUT_DEFS.find(def=>def.key===targetTab)||OUTPUT_DEFS.find(def=>def.key==='routine');
      const label=tabDef?tabDef.label:'Routine';
      editBtn.textContent=`${label} bearbeiten`;
      editBtn.addEventListener('click',()=>{
        const key=this.routineEditorMenuTabKey||targetTab;
        this.closeRoutineEditorMenu();
        this.setRoutineEditorActiveTab(key);
        this.openRoutineEditorOverlay();
      });
      menu.appendChild(editBtn);
      document.body.appendChild(menu);
      const rect=menu.getBoundingClientRect();
      const maxLeft=Math.max(0,window.innerWidth-rect.width-12);
      const maxTop=Math.max(0,window.innerHeight-rect.height-12);
      const left=Math.min(event.clientX,maxLeft);
      const top=Math.min(event.clientY,maxTop);
      menu.style.left=`${left}px`;
      menu.style.top=`${top}px`;
      const outsideHandler=ev=>{
        if(!menu.contains(ev.target)) this.closeRoutineEditorMenu();
      };
      const keyHandler=ev=>{
        if(ev.key==='Escape'){
          ev.preventDefault();
          this.closeRoutineEditorMenu();
        }
      };
      window.addEventListener('pointerdown',outsideHandler,true);
      window.addEventListener('keydown',keyHandler,true);
      this.routineEditorMenuCleanup=()=>{
        window.removeEventListener('pointerdown',outsideHandler,true);
        window.removeEventListener('keydown',keyHandler,true);
      };
      this.routineEditorMenu=menu;
      this.routineEditorMenuTabKey=targetTab;
    }

    closeRoutineEditorMenu(){
      if(this.routineEditorMenuCleanup){
        this.routineEditorMenuCleanup();
        this.routineEditorMenuCleanup=null;
      }
      if(this.routineEditorMenu){
        this.routineEditorMenu.remove();
        this.routineEditorMenu=null;
      }
      this.routineEditorMenuTabKey=null;
    }

    refreshRoutineEditorPresetUi(options={}){
      if(this.routineEditorPresetList){
        const container=this.routineEditorPresetList;
        container.innerHTML='';
        if(!this.routineEditorPresets.length){
          const empty=document.createElement('div');
          empty.className='nsf-editor-presets-empty';
          empty.textContent='Keine Profile gespeichert.';
          container.appendChild(empty);
        }else{
          this.routineEditorPresets.forEach(preset=>{
            const item=document.createElement('div');
            item.className='nsf-editor-preset';
            item.dataset.id=preset.id;
            if(preset.id===this.routineEditorActivePresetId){
              item.classList.add('active');
              if(this.routineEditorActivePresetDirty) item.classList.add('dirty');
            }
            const loadBtn=document.createElement('button');
            loadBtn.type='button';
            loadBtn.className='nsf-editor-preset-load';
            loadBtn.textContent=preset.name;
            loadBtn.title='Profil anwenden';
            loadBtn.addEventListener('click',()=>{
              if(!this.maybeSwitchRoutineEditorPreset(preset.id)) return;
              this.applyRoutineEditorPreset(preset.id);
            });
            const renameBtn=document.createElement('button');
            renameBtn.type='button';
            renameBtn.className='nsf-editor-preset-rename';
            renameBtn.textContent='✎';
            renameBtn.title='Profil umbenennen';
            renameBtn.addEventListener('click',event=>{
              event.stopPropagation();
              this.renameRoutineEditorPreset(preset.id);
            });
            const removeBtn=document.createElement('button');
            removeBtn.type='button';
            removeBtn.className='nsf-editor-preset-remove';
            removeBtn.textContent='🗑';
            removeBtn.title='Profil löschen';
            removeBtn.addEventListener('click',event=>{
              event.stopPropagation();
              this.deleteRoutineEditorPreset(preset.id);
            });
            item.append(loadBtn,renameBtn,removeBtn);
            container.appendChild(item);
          });
        }
      }
      const activePreset=this.getActiveRoutineEditorPreset();
      if(this.routineEditorPresetNameInput){
        if(options.forceNameUpdate||!this.routineEditorPresetNameTouched){
          this.routineEditorPresetNameInput.value=activePreset?activePreset.name:'';
          this.routineEditorPresetNameTouched=false;
        }
      }
      this.updateRoutineEditorPresetSaveState();
      this.updateRoutineEditorPresetDirtyState();
      this.updateRoutineEditorPresetControls();
    }

    updateRoutineEditorPresetSaveState(){
      if(!this.routineEditorPresetSaveButton) return;
      const value=this.routineEditorPresetNameInput?this.routineEditorPresetNameInput.value:'';
      const sanitized=sanitizePresetName(value||'');
      const active=this.getActiveRoutineEditorPreset();
      if(active){
        const activeName=sanitizePresetName(active.name||'');
        const nameChanged=sanitized&&sanitized.toLowerCase()!==activeName.toLowerCase();
        const stateChanged=!isRoutineEditorStateEqual(active.state,this.routineEditorState);
        this.routineEditorPresetSaveButton.disabled=!sanitized||(!stateChanged&&!nameChanged);
      }else{
        this.routineEditorPresetSaveButton.disabled=!sanitized;
      }
    }

    evaluateRoutineEditorPresetMatch(){
      if(!Array.isArray(this.routineEditorPresets)){
        this.routineEditorPresets=[];
      }
      const activePreset=this.getActiveRoutineEditorPreset();
      if(!this.routineEditorActivePresetId){
        const match=this.routineEditorPresets.find(preset=>isRoutineEditorStateEqual(preset.state,this.routineEditorState));
        if(match){
          this.routineEditorActivePresetId=match.id;
          storeRoutineEditorActivePresetId(match.id);
          this.routineEditorPresetNameTouched=false;
        }
      }else if(!activePreset){
        this.routineEditorActivePresetId='';
        storeRoutineEditorActivePresetId('');
        this.routineEditorPresetNameTouched=false;
      }
      this.refreshRoutineEditorPresetUi({forceNameUpdate:!this.routineEditorPresetNameTouched});
    }

    applyRoutineEditorPreset(id){
      if(!id) return;
      const preset=this.routineEditorPresets.find(entry=>entry.id===id);
      if(!preset) return;
      const state=cloneRoutineEditorState(preset.state);
      this.routineEditorState=state;
      storeRoutineEditorState(state);
      this.updateAspenBlocksFromDoc();
      if(this.routineEditorOverlay&&this.routineEditorOverlay.classList.contains('open')){
        this.renderRoutineEditorOverlayContent();
      }
      this.setRoutineEditorActivePreset(id,{forceNameUpdate:true});
    }

    getActiveRoutineEditorPreset(){
      if(!this.routineEditorActivePresetId) return null;
      if(!Array.isArray(this.routineEditorPresets)) return null;
      return this.routineEditorPresets.find(preset=>preset.id===this.routineEditorActivePresetId)||null;
    }

    setRoutineEditorActivePreset(id,options={}){
      const nextId=typeof id==='string'?id:'';
      this.routineEditorActivePresetId=nextId;
      try{storeRoutineEditorActivePresetId(nextId);}catch(err){console.warn('NSF: Aktives Routine-Profil konnte nicht gespeichert werden',err);}
      if(options.resetNameTouched!==false){
        this.routineEditorPresetNameTouched=false;
      }
      this.refreshRoutineEditorPresetUi({forceNameUpdate:!!options.forceNameUpdate});
    }

    updateRoutineEditorPresetDirtyState(){
      const activePreset=this.getActiveRoutineEditorPreset();
      if(!activePreset){
        this.routineEditorActivePresetDirty=false;
        return;
      }
      const stateChanged=!isRoutineEditorStateEqual(activePreset.state,this.routineEditorState);
      const inputValue=this.routineEditorPresetNameInput?sanitizePresetName(this.routineEditorPresetNameInput.value||''):sanitizePresetName(activePreset.name||'');
      const nameChanged=inputValue!==sanitizePresetName(activePreset.name||'');
      this.routineEditorActivePresetDirty=stateChanged||nameChanged;
    }

    updateRoutineEditorPresetControls(){
      if(this.routineEditorPresetSaveButton){
        this.routineEditorPresetSaveButton.textContent=this.routineEditorActivePresetId?'💾 Profil aktualisieren':'💾 Profil speichern';
      }
      if(this.routineEditorActiveInfo){
        const active=this.getActiveRoutineEditorPreset();
        if(active){
          this.routineEditorActiveInfo.classList.toggle('dirty',this.routineEditorActivePresetDirty);
          this.routineEditorActiveInfo.textContent=this.routineEditorActivePresetDirty
            ?`Aktives Profil: ${active.name} (geändert)`
            :`Aktives Profil: ${active.name}`;
        }else{
          this.routineEditorActiveInfo.classList.remove('dirty');
          this.routineEditorActiveInfo.textContent='Kein aktives Profil';
        }
      }
      if(this.routineEditorNewPresetButton){
        this.routineEditorNewPresetButton.disabled=false;
      }
      if(this.routineEditorPresetList){
        const items=this.routineEditorPresetList.querySelectorAll('.nsf-editor-preset');
        items.forEach(item=>{
          if(item.dataset.id===this.routineEditorActivePresetId){
            item.classList.add('active');
            if(this.routineEditorActivePresetDirty){
              item.classList.add('dirty');
            }else{
              item.classList.remove('dirty');
            }
          }else{
            item.classList.remove('active','dirty');
          }
        });
      }
    }

    maybeSwitchRoutineEditorPreset(targetId){
      const nextId=typeof targetId==='string'?targetId:'';
      if(this.routineEditorActivePresetId===nextId) return true;
      if(!this.routineEditorActivePresetId||!this.routineEditorActivePresetDirty) return true;
      const shouldSave=window.confirm('Es gibt ungespeicherte Änderungen am aktiven Profil. Sollen diese vor dem Wechsel gespeichert werden?');
      if(shouldSave){
        const success=this.updateActiveRoutineEditorPreset(this.routineEditorPresetNameInput?this.routineEditorPresetNameInput.value:'');
        return success!==false;
      }
      const discard=window.confirm('Änderungen verwerfen und Profil wechseln?');
      return discard;
    }

    handleRoutineEditorCreateNewPreset(){
      if(!this.maybeSwitchRoutineEditorPreset('')) return;
      this.setRoutineEditorActivePreset('',{forceNameUpdate:true});
      if(this.routineEditorPresetNameInput){
        this.routineEditorPresetNameInput.value='';
        this.routineEditorPresetNameTouched=false;
      }
      this.updateRoutineEditorPresetDirtyState();
      this.updateRoutineEditorPresetControls();
    }

    updateActiveRoutineEditorPreset(nameOverride){
      const preset=this.getActiveRoutineEditorPreset();
      if(!preset) return false;
      const sanitizedName=sanitizePresetName(nameOverride||preset.name||'');
      if(!sanitizedName){
        window.alert('Bitte einen Profilnamen eingeben.');
        return false;
      }
      const conflict=this.routineEditorPresets.some(entry=>entry.id!==preset.id&&entry.name.toLowerCase()===sanitizedName.toLowerCase());
      if(conflict){
        window.alert('Ein anderes Profil verwendet bereits diesen Namen.');
        return false;
      }
      preset.name=sanitizedName;
      preset.state=cloneRoutineEditorState(this.routineEditorState);
      this.routineEditorPresets.sort((a,b)=>a.name.localeCompare(b.name,'de',{sensitivity:'base'}));
      storeRoutineEditorPresets(this.routineEditorPresets);
      this.setRoutineEditorActivePreset(preset.id,{forceNameUpdate:true});
      return true;
    }

    renameRoutineEditorPreset(id){
      const preset=this.routineEditorPresets.find(entry=>entry.id===id);
      if(!preset) return;
      const next=window.prompt('Neuen Profilnamen eingeben:',preset.name||'');
      if(next==null) return;
      const sanitized=sanitizePresetName(next||'');
      if(!sanitized) return;
      const conflict=this.routineEditorPresets.some(entry=>entry.id!==id&&entry.name.toLowerCase()===sanitized.toLowerCase());
      if(conflict){
        window.alert('Ein anderes Profil verwendet bereits diesen Namen.');
        return;
      }
      preset.name=sanitized;
      this.routineEditorPresets.sort((a,b)=>a.name.localeCompare(b.name,'de',{sensitivity:'base'}));
      storeRoutineEditorPresets(this.routineEditorPresets);
      const forceUpdate=this.routineEditorActivePresetId===id;
      if(forceUpdate){
        this.routineEditorPresetNameTouched=false;
      }
      this.refreshRoutineEditorPresetUi({forceNameUpdate:forceUpdate});
    }

    refreshAspenPickerOptions(){
      if(!this.routineEditorBlocks) return;
      const options=this.getAspenFieldOptions();
      Object.values(this.routineEditorBlocks).forEach(info=>{
        if(info&&info.aspenPicker&&typeof info.aspenPicker.refresh==='function'){
          info.aspenPicker.refresh(options,this.hasAspenDoc);
        }
      });
    }

    deleteRoutineEditorPreset(id){
      if(!id) return;
      const index=this.routineEditorPresets.findIndex(preset=>preset.id===id);
      if(index===-1) return;
      this.routineEditorPresets.splice(index,1);
      storeRoutineEditorPresets(this.routineEditorPresets);
      if(this.routineEditorActivePresetId===id){
        this.setRoutineEditorActivePreset('',{forceNameUpdate:true});
      }else{
        this.refreshRoutineEditorPresetUi();
      }
    }

    handleRoutineEditorPresetCreate(name){
      const label=sanitizePresetName(name||'');
      if(!label) return;
      const existing=this.routineEditorPresets.find(preset=>preset.name.toLowerCase()===label.toLowerCase());
      if(existing){
        existing.state=cloneRoutineEditorState(this.routineEditorState);
        storeRoutineEditorPresets(this.routineEditorPresets);
        this.setRoutineEditorActivePreset(existing.id,{forceNameUpdate:true});
        return;
      }
      const preset={id:createRoutinePresetId(),name:label,state:cloneRoutineEditorState(this.routineEditorState)};
      this.routineEditorPresets.push(preset);
      this.routineEditorPresets.sort((a,b)=>a.name.localeCompare(b.name,'de',{sensitivity:'base'}));
      storeRoutineEditorPresets(this.routineEditorPresets);
      this.setRoutineEditorActivePreset(preset.id,{forceNameUpdate:true});
    }

    handleRoutineEditorPresetFormSubmit(event){
      if(event){
        event.preventDefault();
        event.stopPropagation();
      }
      const value=this.routineEditorPresetNameInput?this.routineEditorPresetNameInput.value:'';
      if(this.routineEditorActivePresetId){
        this.updateActiveRoutineEditorPreset(value);
      }else{
        this.handleRoutineEditorPresetCreate(value);
      }
    }

    ensureRoutineEditorOverlay(){
      if(this.routineEditorOverlay) return this.routineEditorOverlay;
      this.ensureRoutineEditorState();
      this.ensureRoutineEditorPresets(true);
      const overlay=document.createElement('div');
      overlay.className='nsf-editor-overlay';
      overlay.setAttribute('role','dialog');
      overlay.setAttribute('aria-modal','true');
      overlay.addEventListener('click',event=>{
        if(event.target===overlay) this.closeRoutineEditorOverlay();
      });
      const dialog=document.createElement('div');
      dialog.className='nsf-editor-dialog';
      dialog.tabIndex=-1;
      overlay.appendChild(dialog);
      const header=document.createElement('div');
      header.className='nsf-editor-dialog-header';
      const title=document.createElement('h2');
      title.className='nsf-editor-dialog-title';
      title.textContent='Routine bearbeiten';
      const closeBtn=document.createElement('button');
      closeBtn.type='button';
      closeBtn.className='nsf-editor-close';
      closeBtn.textContent='✖';
      closeBtn.setAttribute('aria-label','Editor schließen');
      closeBtn.addEventListener('click',()=>this.closeRoutineEditorOverlay());
      header.append(title,closeBtn);
      dialog.appendChild(header);
      const content=document.createElement('div');
      content.className='nsf-editor-content';
      dialog.appendChild(content);

      const main=document.createElement('div');
      main.className='nsf-editor-main';
      content.appendChild(main);

      const toolbar=document.createElement('div');
      toolbar.className='nsf-editor-toolbar';
      const activeInfo=document.createElement('div');
      activeInfo.className='nsf-editor-active-info';
      toolbar.appendChild(activeInfo);
      this.routineEditorActiveInfo=activeInfo;
      const newButton=document.createElement('button');
      newButton.type='button';
      newButton.className='nsf-editor-new';
      newButton.textContent='Neues Profil';
      newButton.addEventListener('click',()=>this.handleRoutineEditorCreateNewPreset());
      toolbar.appendChild(newButton);
      this.routineEditorNewPresetButton=newButton;
      const paramFilterButton=document.createElement('button');
      paramFilterButton.type='button';
      paramFilterButton.className='nsf-editor-filter';
      paramFilterButton.textContent='Favoriten';
      paramFilterButton.title='Nur Favoriten anzeigen';
      paramFilterButton.addEventListener('click',()=>this.toggleRoutineEditorParameterFilter());
      toolbar.appendChild(paramFilterButton);
      this.routineEditorParameterFilterButton=paramFilterButton;
      main.appendChild(toolbar);

      const workspace=document.createElement('div');
      workspace.className='nsf-editor-workspace';
      main.appendChild(workspace);

      const previewPanel=document.createElement('div');
      previewPanel.className='nsf-editor-preview-panel is-empty';
      const previewTabs=document.createElement('div');
      previewTabs.className='nsf-editor-preview-tabs';
      this.routineEditorPreviewTabBar=previewTabs;
      this.routineEditorPreviewTabButtons=new Map();
      OUTPUT_DEFS.forEach(def=>{
        if(def.key==='parts') return;
        const tabButton=document.createElement('button');
        tabButton.type='button';
        tabButton.className='nsf-editor-preview-tab';
        tabButton.textContent=def.label;
        tabButton.dataset.tabKey=def.key;
        tabButton.addEventListener('click',()=>this.setRoutineEditorActiveTab(def.key));
        previewTabs.appendChild(tabButton);
        this.routineEditorPreviewTabButtons.set(def.key,tabButton);
      });
      previewPanel.appendChild(previewTabs);
      const previewHeader=document.createElement('div');
      previewHeader.className='nsf-editor-preview-title';
      previewHeader.textContent='Routine-Vorschau';
      this.routineEditorPreviewTitleElement=previewHeader;
      const previewContent=document.createElement('pre');
      previewContent.className='nsf-editor-preview-content';
      previewContent.textContent='Keine Routine-Daten vorhanden.';
      previewPanel.append(previewHeader,previewContent);
      workspace.appendChild(previewPanel);
      this.routineEditorPreviewPanel=previewPanel;
      this.routineEditorPreviewContent=previewContent;

      const listWrapper=document.createElement('div');
      listWrapper.className='nsf-editor-structure';
      workspace.appendChild(listWrapper);

      const list=document.createElement('div');
      list.className='nsf-editor-list';
      listWrapper.appendChild(list);
      this.routineEditorList=list;
      this.routineEditorBlocks={};

      this.renderRoutineEditorOverlayContent();
      const actions=document.createElement('div');
      actions.className='nsf-editor-actions';
      const saveButton=document.createElement('button');
      saveButton.type='button';
      saveButton.className='nsf-editor-save';
      saveButton.textContent='💾 Routine aktualisieren';
      saveButton.title='Routine-Text aus den Blöcken übernehmen';
      saveButton.addEventListener('click',()=>this.handleRoutineEditorSave());
      actions.appendChild(saveButton);
      main.appendChild(actions);

      const sidebar=document.createElement('aside');
      sidebar.className='nsf-editor-sidebar';
      content.appendChild(sidebar);
      const presetsHeader=document.createElement('div');
      presetsHeader.className='nsf-editor-presets-header';
      presetsHeader.textContent='Gespeicherte Profile';
      sidebar.appendChild(presetsHeader);
      const presetList=document.createElement('div');
      presetList.className='nsf-editor-presets-list';
      sidebar.appendChild(presetList);
      this.routineEditorPresetList=presetList;
      const saveForm=document.createElement('form');
      saveForm.className='nsf-editor-presets-save';
      saveForm.addEventListener('submit',event=>this.handleRoutineEditorPresetFormSubmit(event));
      const nameId=`nsf-preset-${Date.now().toString(36)}`;
      const nameLabel=document.createElement('label');
      nameLabel.className='nsf-editor-presets-label';
      nameLabel.setAttribute('for',nameId);
      nameLabel.textContent='Profilname';
      const nameInput=document.createElement('input');
      nameInput.type='text';
      nameInput.id=nameId;
      nameInput.className='nsf-editor-presets-input';
      nameInput.placeholder='Profilname';
      nameInput.addEventListener('input',()=>{
        this.routineEditorPresetNameTouched=true;
        this.updateRoutineEditorPresetSaveState();
        this.updateRoutineEditorPresetDirtyState();
        this.updateRoutineEditorPresetControls();
      });
      this.routineEditorPresetNameInput=nameInput;
      const presetSaveButton=document.createElement('button');
      presetSaveButton.type='submit';
      presetSaveButton.className='nsf-btn';
      presetSaveButton.textContent='💾 Profil speichern';
      this.routineEditorPresetSaveButton=presetSaveButton;
      presetSaveButton.disabled=true;
      saveForm.append(nameLabel,nameInput,presetSaveButton);
      sidebar.appendChild(saveForm);

      document.body.appendChild(overlay);
      overlay.addEventListener('keydown',event=>{
        if(event.key==='Escape'){
          event.preventDefault();
          this.closeRoutineEditorOverlay();
        }
      });
      this.routineEditorOverlay=overlay;
      this.updateRoutineEditorPreviewTabs();
      this.refreshRoutineEditorDerivedLines();
      this.evaluateRoutineEditorPresetMatch();
      return overlay;
    }

    openRoutineEditorOverlay(){
      const overlay=this.ensureRoutineEditorOverlay();
      if(!overlay) return;
      this.refreshRoutineEditorDerivedLines();
      overlay.classList.add('open');
      const focusTarget=overlay.querySelector('.nsf-editor-block[data-editable="1"] textarea');
      if(focusTarget){
        focusTarget.focus();
      }else{
        const dialog=this.routineEditorOverlay.querySelector('.nsf-editor-dialog');
        if(dialog) dialog.focus();
      }
    }

    closeRoutineEditorOverlay(){
      if(!this.routineEditorOverlay) return;
      this.syncRoutineEditorStateFromDom();
      this.routineEditorOverlay.classList.remove('open');
      this.routineEditorOverlay.classList.remove('nsf-hide-inserts');
      if(this.routineEditorDragState){
        const {handleMove,stop}=this.routineEditorDragState;
        if(handleMove){
          window.removeEventListener('pointermove',handleMove);
        }
        if(stop){
          window.removeEventListener('pointerup',stop);
          window.removeEventListener('pointercancel',stop);
        }
        this.routineEditorDragState=null;
      }
    }

    getRoutineEditorOrder(){
      const tabState=this.getRoutineEditorTabState();
      const baseBlocks=this.getRoutineEditorBaseBlocks();
      const allowedKeys=new Set(baseBlocks.map(block=>block.key));
      const customBlocks=Array.isArray(tabState.customBlocks)?tabState.customBlocks.slice():[];
      const customKeys=new Set(customBlocks.map(block=>`${ROUTINE_EDITOR_CUSTOM_PREFIX}${block.id}`));
      const rawOrder=Array.isArray(tabState.order)?tabState.order:[];
      const hiddenBaseArray=Array.isArray(tabState.hiddenBaseBlocks)?tabState.hiddenBaseBlocks:[];
      const hiddenBase=new Set(hiddenBaseArray.filter(key=>allowedKeys.has(key)));
      const normalized=[];
      rawOrder.forEach(key=>{
        if(typeof key!=='string') return;
        if(allowedKeys.has(key)){
          if(hiddenBase.has(key)) return;
          if(!normalized.includes(key)) normalized.push(key);
          return;
        }
        if(customKeys.has(key)){
          if(!normalized.includes(key)) normalized.push(key);
        }
      });
      baseBlocks.forEach(block=>{
        if(hiddenBase.has(block.key)) return;
        if(!normalized.includes(block.key)) normalized.push(block.key);
      });
      customBlocks.forEach(block=>{
        const key=`${ROUTINE_EDITOR_CUSTOM_PREFIX}${block.id}`;
        if(!normalized.includes(key)) normalized.push(key);
      });
      return normalized;
    }

    getRoutineEditorBlockDefinition(key,position=null,order=null){
      if(!key||typeof key!=='string') return null;
      const tabState=this.getRoutineEditorTabState();
      const baseBlocks=this.getRoutineEditorBaseBlocks();
      const base=baseBlocks.find(block=>block.key===key);
      if(base){
        const storedLabel=tabState&&tabState.blockMeta&&tabState.blockMeta[base.key];
        const metaLabel=storedLabel&&storedLabel.label?sanitizeRoutineEditorLabel(storedLabel.label):'';
        const defaultLabel=base.defaultLabel||base.label||'';
        return {...base,label:metaLabel||defaultLabel,defaultLabel};
      }
      if(key.startsWith(ROUTINE_EDITOR_CUSTOM_PREFIX)){
        const id=key.slice(ROUTINE_EDITOR_CUSTOM_PREFIX.length);
        if(!id) return null;
        const customBlocks=Array.isArray(tabState&&tabState.customBlocks)?tabState.customBlocks:[];
        const entryIndex=customBlocks.findIndex(block=>block&&block.id===id);
        const entry=entryIndex>=0?customBlocks[entryIndex]:null;
        const customType=entry&&entry.type==='aspen'?'aspen':entry&&entry.type==='linebreak'?'linebreak':'text';
        let labelIndex=null;
        if(customType==='text'){
          if(Array.isArray(order)&&Number.isInteger(position)){
            const upto=order.slice(0,position+1);
            let count=0;
            upto.forEach(entryKey=>{
              if(!entryKey||!entryKey.startsWith(ROUTINE_EDITOR_CUSTOM_PREFIX)) return;
              const candidateId=entryKey.slice(ROUTINE_EDITOR_CUSTOM_PREFIX.length);
              const candidate=customBlocks.find(block=>block&&block.id===candidateId);
              if(candidate&&(candidate.type==='aspen'||candidate.type==='linebreak')) return;
              count++;
            });
            labelIndex=count;
          }
          if(labelIndex==null){
            let count=0;
            for(const block of customBlocks){
              if(!block||block.type==='aspen'||block.type==='linebreak') continue;
              count++;
              if(block.id===id){
                labelIndex=count;
                break;
              }
            }
          }
        }
        const option=entry?this.getAspenFieldOption(entry.aspenField):null;
        const defaultLabel=customType==='aspen'
          ?option?`Aspen: ${option.label}`:'Aspendaten'
          :customType==='linebreak'
            ?'Zeilenumbruch'
            :labelIndex&&labelIndex>1?`Textfeld ${labelIndex}`:'Textfeld';
        const customLabel=entry&&entry.label?sanitizeRoutineEditorLabel(entry.label):'';
        return {
          key,
          label:customLabel||defaultLabel,
          defaultLabel,
          editable:customType==='text',
          persist:true,
          removable:true,
          customId:id,
          customType,
          aspenField:entry&&typeof entry.aspenField==='string'?entry.aspenField:'',
          optionLabel:option&&customType==='aspen'?option.label:'',
          parameterKey:entry&&customType==='text'&&typeof entry.parameterKey==='string'?entry.parameterKey:''
        };
      }
      return null;
    }

    getRoutineEditorBlockLabel(key){
      const def=this.getRoutineEditorBlockDefinition(key);
      return def&&def.label?def.label:'';
    }

    createRoutineEditorInsertControl(index,order){
      if(!this.routineEditorList) return null;
      const container=document.createElement('div');
      container.className='nsf-editor-insert';
      container.dataset.position=String(index);
      const select=document.createElement('select');
      select.className='nsf-editor-insert-select';
      select.innerHTML='';
      const placeholder=document.createElement('option');
      placeholder.value='';
      placeholder.textContent='Element hinzufügen…';
      placeholder.disabled=true;
      placeholder.selected=true;
      select.appendChild(placeholder);
      const textOption=document.createElement('option');
      textOption.value='text';
      textOption.textContent='Textfeld';
      select.appendChild(textOption);
      const linebreakOption=document.createElement('option');
      linebreakOption.value='linebreak';
      linebreakOption.textContent='Zeilenumbruch';
      select.appendChild(linebreakOption);
      const config=this.getRoutineEditorTabConfig();
      const allowAspen=config&&config.allowAspen!==false;
      if(allowAspen){
        const aspenOption=document.createElement('option');
        aspenOption.value='aspen';
        aspenOption.textContent='Aspendaten';
        select.appendChild(aspenOption);
      }
      const allowParameters=config&&config.allowParameters!==false;
      if(allowParameters){
        const parameterOptions=Array.isArray(this.routineEditorParameterOptions)?this.routineEditorParameterOptions:[];
        const totalParameterCount=this.routineEditorParameterOptionMap instanceof Map?this.routineEditorParameterOptionMap.size:0;
        if(parameterOptions.length){
          const favoriteOptions=parameterOptions.filter(option=>option&&option.favorite);
          const otherOptions=parameterOptions.filter(option=>option&&!option.favorite);
          if(favoriteOptions.length){
            const favGroup=document.createElement('optgroup');
            favGroup.label='Favoriten';
            favoriteOptions.forEach(option=>{
              const opt=document.createElement('option');
              opt.value=`param:${option.id}`;
              opt.textContent=option.label;
              favGroup.appendChild(opt);
            });
            select.appendChild(favGroup);
          }
          if(otherOptions.length){
            const group=document.createElement('optgroup');
            group.label='Shopguide-Parameter';
            otherOptions.forEach(option=>{
              const opt=document.createElement('option');
              opt.value=`param:${option.id}`;
              opt.textContent=option.label;
              group.appendChild(opt);
            });
            select.appendChild(group);
          }
        }else if(this.routineEditorParameterFavoritesOnly&&totalParameterCount>0){
          const group=document.createElement('optgroup');
          group.label='Favoriten';
          const opt=document.createElement('option');
          opt.value='';
          opt.disabled=true;
          opt.textContent='Keine Favoriten verfügbar';
          group.appendChild(opt);
          select.appendChild(group);
        }
      }
      const orderSet=new Set(Array.isArray(order)?order:[]);
      const baseBlocks=this.getRoutineEditorBaseBlocks();
      baseBlocks.forEach(block=>{
        if(block.removable===false) return;
        if(orderSet.has(block.key)) return;
        const baseOption=document.createElement('option');
        baseOption.value=`base:${block.key}`;
        baseOption.textContent=block.label||block.defaultLabel||block.key;
        select.appendChild(baseOption);
      });
      const prevLabel=index>0?this.getRoutineEditorBlockLabel(order[index-1]):'';
      const nextLabel=index<order.length?this.getRoutineEditorBlockLabel(order[index]):'';
      if(prevLabel&&nextLabel){
        select.title=`Element zwischen ${prevLabel} und ${nextLabel} einfügen`;
      }else if(nextLabel){
        select.title=`Element vor ${nextLabel} einfügen`;
      }else if(prevLabel){
        select.title=`Element nach ${prevLabel} einfügen`;
      }else{
        select.title='Element hinzufügen';
      }
      select.addEventListener('change',()=>{
        const type=select.value;
        select.value='';
        placeholder.selected=true;
        if(!type) return;
        if(type==='text'||type==='linebreak'||(type==='aspen'&&allowAspen)){
          this.addRoutineEditorCustomBlockAt(index,type);
        }else if(type.startsWith('base:')){
          const baseKey=type.slice(5);
          this.addRoutineEditorBaseBlockAt(index,baseKey);
        }else if(type.startsWith('param:')&&allowParameters){
          const paramId=type.slice(6);
          const option=this.getRoutineEditorParameterOption(paramId);
          this.addRoutineEditorParameterBlockAt(index,option);
        }
      });
      container.appendChild(select);
      return container;
    }

    renderRoutineEditorOverlayContent(){
      if(!this.routineEditorList) return;
      this.prepareRoutineEditorParameterOptions();
      this.updateRoutineEditorParameterFilterState();
      const tabState=this.getRoutineEditorTabState();
      const order=this.getRoutineEditorOrder();
      tabState.order=order.slice();
      if(Array.isArray(tabState.hiddenBaseBlocks)){
        tabState.hiddenBaseBlocks=tabState.hiddenBaseBlocks.filter(key=>!order.includes(key));
      }
      this.routineEditorBlocks={};
      this.routineEditorList.innerHTML='';
      order.forEach((key,index)=>{
        const insert=this.createRoutineEditorInsertControl(index,order);
        if(insert) this.routineEditorList.appendChild(insert);
        const def=this.getRoutineEditorBlockDefinition(key,index,order);
        if(!def) return;
        const block=this.createRoutineEditorBlock(def);
        if(block) this.routineEditorList.appendChild(block);
      });
      const finalInsert=this.createRoutineEditorInsertControl(order.length,order);
      if(finalInsert) this.routineEditorList.appendChild(finalInsert);
      this.refreshRoutineEditorPreview();
    }

    addRoutineEditorCustomBlockAt(index,type='text',options={}){
      const tabState=this.getRoutineEditorTabState();
      const config=this.getRoutineEditorTabConfig();
      const allowAspen=config&&config.allowAspen!==false;
      const id=createCustomSectionId();
      if(!Array.isArray(tabState.customBlocks)) tabState.customBlocks=[];
      const requestedType=typeof type==='string'?type:'';
      const blockType=requestedType==='linebreak'?'linebreak':requestedType==='aspen'&&allowAspen?'aspen':'text';
      const entry={
        id,
        type:blockType,
        label:blockType==='text'?sanitizeRoutineEditorLabel(options.label||''):'',
        aspenField:'',
        parameterKey:blockType==='text'&&typeof options.parameterKey==='string'?options.parameterKey.trim():'',
        lines:['']
      };
      if(blockType==='aspen'){
        if(!this.hasAspenDoc&&this.aspenFileInput){
          this.aspenFileInput.click();
        }
        if(this.hasAspenDoc){
          const defaultField=this.getDefaultAspenFieldKey();
          if(defaultField){
            entry.aspenField=defaultField;
            entry.lines=[this.resolveAspenFieldValue(defaultField)];
          }
        }
      }else if(blockType==='text'){
        let presetLines=null;
        if(options&&Array.isArray(options.lines)){
          presetLines=options.lines.map(value=>typeof value==='string'?value:'');
        }else if(options&&typeof options.value==='string'){
          presetLines=options.value.split(/\r?\n/);
        }
        if(Array.isArray(presetLines)&&presetLines.length){
          entry.lines=presetLines;
        }
      }
      tabState.customBlocks.push(entry);
      const order=this.getRoutineEditorOrder();
      const clampedIndex=Math.max(0,Math.min(Number.isFinite(index)?index:order.length,order.length));
      order.splice(clampedIndex,0,`${ROUTINE_EDITOR_CUSTOM_PREFIX}${id}`);
      tabState.order=order;
      this.renderRoutineEditorOverlayContent();
      this.syncRoutineEditorStateFromDom();
      requestAnimationFrame(()=>{
        let focusTarget=null;
        if(blockType==='aspen'){
          const block=this.routineEditorList&&this.routineEditorList.querySelector(`.nsf-editor-block[data-type="${ROUTINE_EDITOR_CUSTOM_PREFIX}${id}"]`);
          focusTarget=block?block.querySelector('.nsf-editor-aspen-input'):null;
        }else if(blockType==='text'){
          focusTarget=this.routineEditorList&&this.routineEditorList.querySelector(`.nsf-editor-block[data-type="${ROUTINE_EDITOR_CUSTOM_PREFIX}${id}"] textarea`);
        }
        if(focusTarget) focusTarget.focus();
      });
    }

    addRoutineEditorParameterBlockAt(index,option){
      if(!option) return;
      const valueText=typeof option.value==='string'?option.value:'';
      const lines=valueText?valueText.split(/\r?\n/):[''];
      this.addRoutineEditorCustomBlockAt(index,'text',{
        label:option.label||'',
        lines:lines.length?lines:[''],
        parameterKey:option.id||''
      });
    }

    prepareRoutineEditorParameterOptions(){
      const options=this.collectRoutineEditorParameterOptions();
      this.routineEditorParameterOptionMap=new Map();
      options.forEach(option=>this.routineEditorParameterOptionMap.set(option.id,option));
      if(this.routineEditorParameterFavoritesOnly){
        this.routineEditorParameterOptions=options.filter(option=>option.favorite);
      }else{
        this.routineEditorParameterOptions=options;
      }
    }

    collectRoutineEditorParameterOptions(){
      const result=new Map();
      const pushOption=(id,label,value)=>{
        const key=typeof id==='string'?id.trim():'';
        const safeLabel=sanitizeRoutineEditorLabel(label||'');
        const text=clean(value||'');
        if(!key||!safeLabel||!text) return;
        let entry=result.get(key);
        if(!entry){
          entry={id:key,label:safeLabel,values:new Set()};
          result.set(key,entry);
        }
        entry.values.add(text);
      };
      const resolvedSelections=Array.isArray(this.selectedEntries)?this.selectedEntries.map(sel=>this.resolveEntry(sel)||sel).filter(Boolean):[];
      resolvedSelections.forEach(entry=>{
        ROUTINE_EDITOR_PARAMETER_FIELDS.forEach(field=>{
          pushOption(`field:${field.key}`,field.label,valueToText(field.getter(entry)));
        });
        if(Array.isArray(entry.additional)){
          entry.additional.forEach(extra=>{
            if(!extra) return;
            const rawLabel=extra.label||extra.key;
            const text=valueToText(extra.value||extra.valueLower||'');
            const sourceKey=typeof extra.key==='string'&&extra.key.trim()?extra.key.trim():String(rawLabel||'');
            const normalized=sourceKey.toLowerCase();
            pushOption(`extra:${normalized}`,rawLabel||sourceKey,text);
          });
        }
      });
      const options=[];
      result.forEach(entry=>{
        if(!entry.values.size) return;
        const value=Array.from(entry.values).join('\n');
        if(!value) return;
        options.push({
          id:entry.id,
          label:entry.label,
          value,
          favorite:this.isParameterFavorite(entry.id)
        });
      });
      options.sort((a,b)=>a.label.localeCompare(b.label,'de',{sensitivity:'base'}));
      return options;
    }

    getRoutineEditorParameterOption(id){
      if(!id) return null;
      if(this.routineEditorParameterOptionMap instanceof Map){
        return this.routineEditorParameterOptionMap.get(id)||null;
      }
      return null;
    }

    isParameterFavorite(key){
      if(!key) return false;
      if(!(this.parameterFavoriteSet instanceof Set)) this.parameterFavoriteSet=new Set();
      return this.parameterFavoriteSet.has(key);
    }

    toggleRoutineEditorParameterFavorite(key){
      if(!key) return;
      if(!(this.parameterFavoriteSet instanceof Set)) this.parameterFavoriteSet=new Set();
      if(this.parameterFavoriteSet.has(key)){
        this.parameterFavoriteSet.delete(key);
      }else{
        this.parameterFavoriteSet.add(key);
      }
      this.parameterFavorites=Array.from(this.parameterFavoriteSet);
      storeRoutineEditorParameterFavorites(this.parameterFavorites);
      if(this.routineEditorOverlay&&this.routineEditorOverlay.classList.contains('open')){
        this.renderRoutineEditorOverlayContent();
      }
    }

    toggleRoutineEditorParameterFilter(){
      this.routineEditorParameterFavoritesOnly=!this.routineEditorParameterFavoritesOnly;
      if(this.routineEditorOverlay&&this.routineEditorOverlay.classList.contains('open')){
        this.renderRoutineEditorOverlayContent();
      }
    }

    updateRoutineEditorParameterFilterState(){
      if(!this.routineEditorParameterFilterButton) return;
      if(this.routineEditorParameterFavoritesOnly){
        this.routineEditorParameterFilterButton.classList.add('is-active');
      }else{
        this.routineEditorParameterFilterButton.classList.remove('is-active');
      }
    }

    handleRoutineEditorBlockRemoval(key){
      if(!key||typeof key!=='string') return;
      if(key.startsWith(ROUTINE_EDITOR_CUSTOM_PREFIX)){
        this.removeRoutineEditorCustomBlock(key);
        return;
      }
      this.removeRoutineEditorBaseBlock(key);
    }

    removeRoutineEditorBaseBlock(key){
      if(!key||typeof key!=='string') return;
      const baseBlocks=this.getRoutineEditorBaseBlocks();
      const def=baseBlocks.find(block=>block.key===key);
      if(!def||def.removable===false) return;
      const tabState=this.getRoutineEditorTabState();
      const order=this.getRoutineEditorOrder().filter(entry=>entry!==key);
      tabState.order=order;
      if(!Array.isArray(tabState.hiddenBaseBlocks)) tabState.hiddenBaseBlocks=[];
      if(!tabState.hiddenBaseBlocks.includes(key)){
        tabState.hiddenBaseBlocks.push(key);
      }
      this.renderRoutineEditorOverlayContent();
      this.syncRoutineEditorStateFromDom();
    }

    addRoutineEditorBaseBlockAt(index,key){
      if(!key||typeof key!=='string') return;
      const baseBlocks=this.getRoutineEditorBaseBlocks();
      const def=baseBlocks.find(block=>block.key===key);
      if(!def||def.removable===false) return;
      const tabState=this.getRoutineEditorTabState();
      const order=this.getRoutineEditorOrder().filter(entry=>entry!==key);
      const clampedIndex=Math.max(0,Math.min(Number.isFinite(index)?index:order.length,order.length));
      order.splice(clampedIndex,0,key);
      tabState.order=order;
      if(Array.isArray(tabState.hiddenBaseBlocks)){
        tabState.hiddenBaseBlocks=tabState.hiddenBaseBlocks.filter(entry=>entry!==key);
      }else{
        tabState.hiddenBaseBlocks=[];
      }
      this.renderRoutineEditorOverlayContent();
      this.syncRoutineEditorStateFromDom();
      requestAnimationFrame(()=>{
        if(def.editable===false) return;
        const focusTarget=this.routineEditorList&&this.routineEditorList.querySelector(`.nsf-editor-block[data-type="${key}"] textarea`);
        if(focusTarget) focusTarget.focus();
      });
    }

    removeRoutineEditorCustomBlock(key){
      if(!key||typeof key!=='string') return;
      const customKey=key.startsWith(ROUTINE_EDITOR_CUSTOM_PREFIX)?key:`${ROUTINE_EDITOR_CUSTOM_PREFIX}${key}`;
      const id=customKey.slice(ROUTINE_EDITOR_CUSTOM_PREFIX.length);
      if(!id) return;
      const tabState=this.getRoutineEditorTabState();
      tabState.customBlocks=(Array.isArray(tabState.customBlocks)?tabState.customBlocks:[]).filter(block=>block&&block.id!==id);
      tabState.order=this.getRoutineEditorOrder().filter(entry=>entry!==customKey);
      this.renderRoutineEditorOverlayContent();
      this.syncRoutineEditorStateFromDom();
    }

    setRoutineEditorBlockLabel(key,label){
      const tabState=this.getRoutineEditorTabState();
      const sanitized=sanitizeRoutineEditorLabel(label);
      if(key&&key.startsWith(ROUTINE_EDITOR_CUSTOM_PREFIX)){
        const id=key.slice(ROUTINE_EDITOR_CUSTOM_PREFIX.length);
        if(!id) return;
        const customBlocks=Array.isArray(tabState.customBlocks)?tabState.customBlocks:[];
        const entry=customBlocks.find(block=>block&&block.id===id);
        if(entry){
          entry.label=sanitized;
        }
        return;
      }
      const baseBlocks=this.getRoutineEditorBaseBlocks();
      const def=baseBlocks.find(block=>block.key===key);
      if(!def) return;
      const baseLabel=def.defaultLabel||def.label||'';
      if(sanitized&&sanitized!==baseLabel){
        if(!tabState.blockMeta||typeof tabState.blockMeta!=='object') tabState.blockMeta={};
        tabState.blockMeta[key]={label:sanitized};
      }else if(tabState.blockMeta&&typeof tabState.blockMeta==='object'){
        delete tabState.blockMeta[key];
      }
    }

    handleRoutineEditorRename(key){
      const def=this.getRoutineEditorBlockDefinition(key);
      if(!def) return;
      const current=def.label||'';
      const input=prompt('Neue Bezeichnung für das Textfeld:',current);
      if(input===null) return;
      const sanitized=sanitizeRoutineEditorLabel(input);
      const finalLabel=sanitized||def.defaultLabel||current;
      this.setRoutineEditorBlockLabel(key,sanitized?sanitized:'');
      const info=this.routineEditorBlocks&&this.routineEditorBlocks[key];
      if(info&&info.labelElement){
        info.labelElement.textContent=finalLabel;
        if(info.element) info.element.dataset.label=finalLabel;
        if(info.definition) info.definition.label=finalLabel;
      }
      if(!sanitized){
        // ensure default label applied visually
        this.renderRoutineEditorOverlayContent();
      }
      this.syncRoutineEditorStateFromDom();
    }

    computeAspenFieldOptions(doc,repairOrder,boardInfo){
      const options=[];
      const seen=new Set();
      const seenLabels=new Set();
      const pushOption=(key,label,value)=>{
        if(!key||seen.has(key)) return;
        const text=valueToText(value);
        const optionLabel=label||this.formatAspenFieldLabel(key.split('.').pop()||key);
        const normalizedLabel=(optionLabel||'').trim().toLowerCase();
        const normalizedValue=clean(text||'').toLowerCase();
        const dedupeKey=normalizedLabel?`${normalizedLabel}::${normalizedValue}`:`::${normalizedValue}`;
        if(dedupeKey&&seenLabels.has(dedupeKey)) return;
        const option={
          key,
          label:optionLabel,
          value:text
        };
        options.push(option);
        seen.add(key);
        if(dedupeKey) seenLabels.add(dedupeKey);
      };
      const repair=clean(repairOrder||'');
      if(repair){
        pushOption('repairOrder','Repair Order',repair);
      }
      const general=doc&&typeof doc==='object'&&doc.general&&typeof doc.general==='object'?doc.general:{};
      Object.keys(general).forEach(key=>{
        const optionKey=`general.${key}`;
        pushOption(optionKey,this.formatAspenFieldLabel(key),general[key]);
      });
      const boardRecord=boardInfo&&boardInfo.record&&boardInfo.record.data&&typeof boardInfo.record.data==='object'
        ?boardInfo.record.data
        :null;
      if(boardRecord){
        Object.keys(boardRecord).forEach(key=>{
          const optionKey=`board.${key}`;
          pushOption(optionKey,this.formatAspenFieldLabel(key),boardRecord[key]);
        });
      }
      const boardFields=boardInfo&&Array.isArray(boardInfo.fields)?boardInfo.fields:[];
      boardFields.forEach(rawField=>{
        if(!rawField) return;
        const optionKey=`board.${rawField}`;
        if(seen.has(optionKey)) return;
        const value=boardRecord&&Object.prototype.hasOwnProperty.call(boardRecord,rawField)
          ?boardRecord[rawField]
          :'';
        pushOption(optionKey,this.formatAspenFieldLabel(rawField),value);
      });
      return options.sort((a,b)=>{
        return a.label.localeCompare(b.label,'de',{sensitivity:'base'});
      });
    }

    formatAspenFieldLabel(key){
      if(typeof key!=='string') return 'Aspen-Feld';
      const spaced=key.replace(/[_\-]+/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2');
      const trimmed=spaced.trim();
      if(!trimmed) return 'Aspen-Feld';
      const normalized=trimmed.replace(/\s+/g,' ');
      return normalized.split(' ').map(part=>{
        if(!part) return part;
        if(part.length<=3&&part===part.toUpperCase()) return part;
        return part.charAt(0).toUpperCase()+part.slice(1).toLowerCase();
      }).join(' ');
    }

    getAspenFieldOptions(){
      return Array.isArray(this.aspenFieldOptions)?this.aspenFieldOptions:[];
    }

    getAspenFieldOption(key){
      if(!key) return null;
      const options=this.getAspenFieldOptions();
      return options.find(option=>option&&option.key===key)||null;
    }

    resolveAspenFieldValue(fieldKey){
      if(!fieldKey) return '';
      if(fieldKey==='repairOrder'){
        return clean(this.repairOrder||'');
      }
      const option=this.getAspenFieldOption(fieldKey);
      return option?option.value:'';
    }

    getDefaultAspenFieldKey(){
      const repair=clean(this.repairOrder||'');
      if(repair) return 'repairOrder';
      const options=this.getAspenFieldOptions();
      return options.length?options[0].key:'';
    }

    updateAspenBlocksFromDoc(){
      const tabState=this.getRoutineEditorTabState('routine');
      const options=this.getAspenFieldOptions();
      const validKeys=new Set(options.map(option=>option.key));
      if(clean(this.repairOrder||'')) validKeys.add('repairOrder');
      const defaultKey=this.getDefaultAspenFieldKey();
      let changed=false;
      const customBlocks=Array.isArray(tabState.customBlocks)?tabState.customBlocks:[];
      customBlocks.forEach(block=>{
        if(!block||block.type!=='aspen') return;
        if(!block.aspenField||!validKeys.has(block.aspenField)){
          block.aspenField=defaultKey||'';
          changed=true;
        }
        const value=this.resolveAspenFieldValue(block.aspenField);
        if(!Array.isArray(block.lines)||block.lines.length!==1||block.lines[0]!==value){
          block.lines=[value||''];
          changed=true;
        }
      });
      if(changed){
        storeRoutineEditorState(this.routineEditorState);
        if(this.routineEditorOverlay&&this.routineEditorOverlay.classList.contains('open')){
          this.renderRoutineEditorOverlayContent();
        }
      }
    }

    handleAspenFieldSelection(key,value){
      const sanitized=typeof value==='string'?value:'';
      const tabState=this.getRoutineEditorTabState();
      const customKey=key.startsWith(ROUTINE_EDITOR_CUSTOM_PREFIX)?key:`${ROUTINE_EDITOR_CUSTOM_PREFIX}${key}`;
      const id=customKey.slice(ROUTINE_EDITOR_CUSTOM_PREFIX.length);
      if(!id) return;
      const customBlocks=Array.isArray(tabState.customBlocks)?tabState.customBlocks:[];
      const entry=customBlocks.find(block=>block&&block.id===id);
      if(entry){
        entry.aspenField=sanitized;
        entry.lines=[this.resolveAspenFieldValue(sanitized)];
      }
      const info=this.routineEditorBlocks&&this.routineEditorBlocks[customKey];
      if(info){
        if(info.definition) info.definition.aspenField=sanitized;
        this.populateRoutineEditorBlock(customKey);
      }
      this.syncRoutineEditorStateFromDom();
    }

    createRoutineEditorBlock(def){
      if(!def) return null;
      const block=document.createElement('div');
      block.className='nsf-editor-block';
      block.dataset.type=def.key;
      block.dataset.editable=def.editable===false?'0':'1';
      block.dataset.label=def.label||def.defaultLabel||'';
      if(def.customType){
        block.dataset.customType=def.customType;
      }else{
        delete block.dataset.customType;
      }
      if(def.aspenField){
        block.dataset.aspenField=def.aspenField;
      }else{
        delete block.dataset.aspenField;
      }
      if(def.parameterKey){
        block.dataset.parameterKey=def.parameterKey;
      }else{
        delete block.dataset.parameterKey;
      }
      const header=document.createElement('div');
      header.className='nsf-editor-header';
      const title=document.createElement('div');
      title.className='nsf-editor-header-title';
      const titleLabel=document.createElement('span');
      titleLabel.className='nsf-editor-header-label';
      titleLabel.textContent=def.label;
      title.appendChild(titleLabel);
      let renameBtn=null;
      if(def.customType!=='linebreak'){
        renameBtn=document.createElement('button');
        renameBtn.type='button';
        renameBtn.className='nsf-editor-rename';
        renameBtn.textContent='✎';
        renameBtn.title='Bezeichnung bearbeiten';
        renameBtn.setAttribute('aria-label','Bezeichnung bearbeiten');
        renameBtn.addEventListener('click',event=>{
          event.stopPropagation();
          event.preventDefault();
          this.handleRoutineEditorRename(def.key);
        });
        title.appendChild(renameBtn);
      }
      header.appendChild(title);
      if(def.removable){
        const actions=document.createElement('div');
        actions.className='nsf-editor-block-actions';
        if(def.parameterKey){
          const favBtn=document.createElement('button');
          favBtn.type='button';
          favBtn.className='nsf-editor-block-action nsf-editor-favorite';
          const favActive=this.isParameterFavorite(def.parameterKey);
          favBtn.textContent=favActive?'★':'☆';
          favBtn.title=favActive?'Aus Favoriten entfernen':'Als Favorit speichern';
          favBtn.addEventListener('click',event=>{
            event.stopPropagation();
            event.preventDefault();
            this.toggleRoutineEditorParameterFavorite(def.parameterKey);
          });
          actions.appendChild(favBtn);
        }
        const removeBtn=document.createElement('button');
        removeBtn.type='button';
        removeBtn.className='nsf-editor-block-action';
        removeBtn.textContent='✖';
        removeBtn.title='Textfeld entfernen';
        removeBtn.setAttribute('aria-label','Zusätzliches Textfeld entfernen');
        removeBtn.addEventListener('click',event=>{
          event.stopPropagation();
          event.preventDefault();
          this.handleRoutineEditorBlockRemoval(def.key);
        });
        actions.appendChild(removeBtn);
        header.appendChild(actions);
      }
      header.addEventListener('pointerdown',event=>{
        if(event.target&&event.target.closest&&event.target.closest('.nsf-editor-block-action')) return;
        if(event.target&&event.target.closest&&event.target.closest('.nsf-editor-rename')) return;
        this.startRoutineEditorReorder(event,block);
      });
      block.appendChild(header);
      const linesContainer=document.createElement('div');
      linesContainer.className='nsf-editor-lines';
      block.appendChild(linesContainer);
      this.routineEditorBlocks[def.key]={element:block,linesContainer,definition:def,labelElement:titleLabel};
      this.populateRoutineEditorBlock(def.key);
      return block;
    }

    getRoutineEditorLinesForBlock(key,editable){
      const activeTab=this.getActiveRoutineEditorTab();
      if(activeTab==='routine'&&(key==='findings'||key==='actions')){
        const derived=this.routineEditorDerivedLines&&Array.isArray(this.routineEditorDerivedLines[key])?this.routineEditorDerivedLines[key]:[];
        return derived.slice();
      }
      if(key&&key.startsWith(ROUTINE_EDITOR_CUSTOM_PREFIX)){
        const id=key.slice(ROUTINE_EDITOR_CUSTOM_PREFIX.length);
        const tabState=this.getRoutineEditorTabState();
        const customBlocks=Array.isArray(tabState&&tabState.customBlocks)?tabState.customBlocks:[];
        const entry=customBlocks.find(block=>block&&block.id===id);
        const lines=Array.isArray(entry&&entry.lines)?entry.lines:[];
        if(editable&&lines.length===0) return [''];
        return lines.slice();
      }
      const config=this.getRoutineEditorTabConfig(activeTab);
      if(config&&config.primaryTextarea===key){
        const textarea=this.textareas&&this.textareas[key];
        const value=textarea?textarea.value:'';
        const segments=value.split(/\r?\n/);
        return segments;
      }
      const tabState=this.getRoutineEditorTabState();
      const entry=tabState&&tabState.blocks?tabState.blocks[key]:null;
      const lines=Array.isArray(entry&&entry.lines)?entry.lines:[];
      if(editable&&lines.length===0) return [''];
      return lines.slice();
    }

    populateRoutineEditorBlock(key){
      const info=this.routineEditorBlocks&&this.routineEditorBlocks[key];
      if(!info) return;
      const order=this.getRoutineEditorOrder();
      const position=order.indexOf(key);
      const def=this.getRoutineEditorBlockDefinition(key,position,order)||info.definition;
      info.definition=def;
      if(info.aspenPicker&&typeof info.aspenPicker.destroy==='function'){
        info.aspenPicker.destroy();
      }
      info.aspenPicker=null;
      info.aspenSelect=null;
      info.aspenValue=null;
      const editable=def&&def.editable!==false;
      const container=info.linesContainer;
      container.innerHTML='';
      if(info.element){
        info.element.dataset.label=def&&def.label?def.label:(def&&def.defaultLabel)||'';
        if(def&&def.customType){
          info.element.dataset.customType=def.customType;
        }else{
          delete info.element.dataset.customType;
        }
        if(def&&def.aspenField){
          info.element.dataset.aspenField=def.aspenField;
        }else{
          delete info.element.dataset.aspenField;
        }
        if(def&&def.parameterKey){
          info.element.dataset.parameterKey=def.parameterKey;
        }else if(info.element.dataset){
          delete info.element.dataset.parameterKey;
        }
      }
      if(info.labelElement){
        info.labelElement.textContent=def&&def.label?def.label:'';
      }
      if(def&&def.customType==='aspen'){
        const controls=document.createElement('div');
        controls.className='nsf-editor-aspen-controls';
        const picker=document.createElement('div');
        picker.className='nsf-editor-aspen-picker';
        const input=document.createElement('input');
        input.type='search';
        input.autocomplete='off';
        input.spellcheck=false;
        input.className='nsf-editor-aspen-input';
        input.placeholder=this.hasAspenDoc?'Aspen-Feld suchen…':'Keine Aspen-Datei geladen';
        if(!this.hasAspenDoc){
          input.disabled=true;
          picker.classList.add('is-disabled');
        }
        const dropdown=document.createElement('div');
        dropdown.className='nsf-editor-aspen-options';
        picker.append(input,dropdown);
        controls.appendChild(picker);
        if(!this.hasAspenDoc){
          const loadBtn=document.createElement('button');
          loadBtn.type='button';
          loadBtn.className='nsf-editor-aspen-load';
          loadBtn.textContent='Aspen laden…';
          loadBtn.addEventListener('click',()=>{
            if(this.aspenFileInput){
              this.aspenFileInput.click();
            }
          });
          controls.appendChild(loadBtn);
        }
        container.appendChild(controls);
        const pickerState={
          options:this.getAspenFieldOptions(),
          filtered:[],
          open:false,
          activeIndex:-1,
          selectedKey:def&&def.aspenField?def.aspenField:'',
          outsideHandler:null
        };
        const applySelection=key=>{
          pickerState.selectedKey=key||'';
          const option=this.getAspenFieldOption(pickerState.selectedKey);
          input.value=option?option.label:'';
          input.dataset.value=pickerState.selectedKey;
        };
        const setActiveIndex=index=>{
          pickerState.activeIndex=index;
          const nodes=dropdown.querySelectorAll('.nsf-editor-aspen-option');
          nodes.forEach((node,idx)=>{
            if(idx===pickerState.activeIndex){
              node.classList.add('is-active');
              node.scrollIntoView({block:'nearest'});
            }else{
              node.classList.remove('is-active');
            }
          });
        };
        const closeDropdown=()=>{
          if(!pickerState.open) return;
          pickerState.open=false;
          dropdown.classList.remove('open');
          if(pickerState.outsideHandler){
            document.removeEventListener('pointerdown',pickerState.outsideHandler,true);
            pickerState.outsideHandler=null;
          }
          setActiveIndex(-1);
        };
        const chooseOption=option=>{
          closeDropdown();
          applySelection(option?option.key:'');
          if(option){
            this.handleAspenFieldSelection(def.key,option.key);
          }
        };
        const updateFiltered=term=>{
          const normalized=(term||'').trim().toLowerCase();
          const base=Array.isArray(pickerState.options)?pickerState.options:[];
          pickerState.filtered=!normalized?base:base.filter(opt=>{
            const label=(opt.label||'').toLowerCase();
            const key=(opt.key||'').toLowerCase();
            return label.includes(normalized)||key.includes(normalized);
          });
          dropdown.innerHTML='';
          if(!pickerState.filtered.length){
            const empty=document.createElement('div');
            empty.className='nsf-editor-aspen-option nsf-editor-aspen-empty';
            empty.textContent=this.hasAspenDoc?'Keine Treffer':'Keine Aspen-Felder verfügbar';
            dropdown.appendChild(empty);
            setActiveIndex(-1);
            return;
          }
          let selectedIndex=-1;
          pickerState.filtered.forEach((opt,idx)=>{
            const btn=document.createElement('button');
            btn.type='button';
            btn.className='nsf-editor-aspen-option';
            btn.textContent=opt.label;
            btn.dataset.value=opt.key;
            if(opt.key===pickerState.selectedKey){
              btn.classList.add('is-selected');
              selectedIndex=idx;
            }
            btn.addEventListener('click',()=>chooseOption(opt));
            dropdown.appendChild(btn);
          });
          if(selectedIndex>=0){
            setActiveIndex(selectedIndex);
          }else{
            setActiveIndex(pickerState.filtered.length?0:-1);
          }
        };
        const openDropdown=()=>{
          if(!this.hasAspenDoc||pickerState.open) return;
          pickerState.open=true;
          dropdown.classList.add('open');
          pickerState.outsideHandler=event=>{
            if(!picker.contains(event.target)) closeDropdown();
          };
          document.addEventListener('pointerdown',pickerState.outsideHandler,true);
          updateFiltered(input.value);
        };
        input.addEventListener('focus',()=>{
          if(this.hasAspenDoc) openDropdown();
        });
        input.addEventListener('input',()=>{
          if(!pickerState.open) openDropdown();
          else updateFiltered(input.value);
        });
        input.addEventListener('blur',()=>{
          setTimeout(()=>closeDropdown(),120);
        });
        input.addEventListener('keydown',event=>{
          if(event.key==='ArrowDown'){
            event.preventDefault();
            if(!pickerState.open){
              openDropdown();
              return;
            }
            const next=Math.min(pickerState.filtered.length-1,pickerState.activeIndex+1);
            setActiveIndex(next<0?0:next);
          }else if(event.key==='ArrowUp'){
            event.preventDefault();
            if(!pickerState.open){
              openDropdown();
              return;
            }
            const next=pickerState.activeIndex<=0?0:pickerState.activeIndex-1;
            setActiveIndex(next);
          }else if(event.key==='Enter'){
            if(pickerState.open&&pickerState.activeIndex>=0){
              event.preventDefault();
              const option=pickerState.filtered[pickerState.activeIndex];
              if(option) chooseOption(option);
            }
          }else if(event.key==='Escape'){
            if(pickerState.open){
              event.preventDefault();
              closeDropdown();
            }
          }
        });
        applySelection(pickerState.selectedKey);
        info.aspenPicker={
          refresh:(optionsList,hasDoc)=>{
            pickerState.options=Array.isArray(optionsList)?optionsList:[];
            if(hasDoc){
              input.disabled=false;
              picker.classList.remove('is-disabled');
              input.placeholder='Aspen-Feld suchen…';
            }else{
              input.disabled=true;
              picker.classList.add('is-disabled');
              input.placeholder='Keine Aspen-Datei geladen';
              closeDropdown();
            }
            const currentOption=this.getAspenFieldOption(pickerState.selectedKey);
            if(!currentOption){
              applySelection('');
            }else{
              applySelection(pickerState.selectedKey);
            }
            if(pickerState.open){
              updateFiltered(input.value);
            }
          },
          destroy:()=>{
            closeDropdown();
          }
        };
        const value=document.createElement('div');
        value.className='nsf-editor-aspen-value';
        const resolved=this.resolveAspenFieldValue(def.aspenField);
        if(resolved){
          value.textContent=resolved;
        }else if(!this.hasAspenDoc){
          value.textContent='Keine Aspen-Datei geladen.';
          value.classList.add('nsf-editor-aspen-empty');
        }else{
          value.textContent='Keine Daten verfügbar.';
          value.classList.add('nsf-editor-aspen-empty');
        }
        container.appendChild(value);
        info.aspenValue=value;
        return;
      }
      if(def&&def.customType==='linebreak'){
        const indicator=document.createElement('div');
        indicator.className='nsf-editor-linebreak';
        indicator.textContent='(Leerzeile)';
        container.appendChild(indicator);
        return;
      }
      const lines=this.getRoutineEditorLinesForBlock(key,editable);
      if(!lines.length){
        if(editable){
          container.appendChild(this.createRoutineEditorLine(key,'',true));
        }else{
          const empty=document.createElement('div');
          empty.className='nsf-empty';
          empty.textContent='Keine Daten vorhanden.';
          container.appendChild(empty);
        }
        return;
      }
      lines.forEach(value=>{
        const line=this.createRoutineEditorLine(key,value,editable);
        container.appendChild(line);
      });
    }

    createRoutineEditorLine(type,value,editable){
      const line=document.createElement('div');
      line.className='nsf-editor-line';
      const input=document.createElement('textarea');
      input.className='nsf-editor-input';
      input.value=typeof value==='string'?value:'';
      input.rows=1;
      input.dataset.minHeight='40';
      autoSizeTextarea(input);
      if(editable){
        input.placeholder='Text…';
        input.addEventListener('input',()=>{
          autoSizeTextarea(input);
          this.syncRoutineEditorStateFromDom();
        });
        input.addEventListener('keydown',event=>{
          if(event.key==='Enter'&&event.shiftKey){
            event.preventDefault();
            const container=line.parentElement;
            const newLine=this.createRoutineEditorLine(type,'',true);
            if(container){
              container.insertBefore(newLine,line.nextSibling);
              const textarea=newLine.querySelector('textarea');
              if(textarea){
                autoSizeTextarea(textarea);
                textarea.focus();
              }
            }
            this.syncRoutineEditorStateFromDom();
          }
        });
      }else{
        input.readOnly=true;
        input.tabIndex=-1;
        input.addEventListener('input',()=>autoSizeTextarea(input));
      }
      line.appendChild(input);
      requestAnimationFrame(()=>autoSizeTextarea(input));
      if(editable){
        const remove=document.createElement('button');
        remove.type='button';
        remove.className='nsf-editor-remove';
        remove.textContent='✖';
        remove.setAttribute('aria-label','Zeile entfernen');
        remove.addEventListener('click',()=>{
          const container=line.parentElement;
          line.remove();
          if(container&&container.children.length===0){
            container.appendChild(this.createRoutineEditorLine(type,'',true));
          }
          this.syncRoutineEditorStateFromDom();
          const focusTarget=container?container.querySelector('textarea'):null;
          if(focusTarget) focusTarget.focus();
        });
        line.appendChild(remove);
      }
      return line;
    }

    startRoutineEditorReorder(event,block){
      if(!block||!this.routineEditorList) return;
      if(event.button!==0&&event.pointerType!=='touch'&&event.pointerType!=='pen') return;
      event.preventDefault();
      if(this.routineEditorDragState){
        const {handleMove,stop}=this.routineEditorDragState;
        if(handleMove){
          window.removeEventListener('pointermove',handleMove);
        }
        if(stop){
          window.removeEventListener('pointerup',stop);
          window.removeEventListener('pointercancel',stop);
        }
        this.routineEditorDragState=null;
      }
      block.classList.add('dragging');
      if(this.routineEditorOverlay){
        this.routineEditorOverlay.classList.add('nsf-hide-inserts');
      }
      const pointerId=event.pointerId;
      const handleMove=ev=>{
        if(pointerId!=null&&ev.pointerId!==pointerId) return;
        ev.preventDefault();
        this.reorderRoutineEditorBlocks(block,ev.clientY);
      };
      const stop=ev=>{
        if(pointerId!=null&&ev.pointerId!==pointerId) return;
        block.classList.remove('dragging');
        if(this.routineEditorOverlay){
          this.routineEditorOverlay.classList.remove('nsf-hide-inserts');
        }
        window.removeEventListener('pointermove',handleMove);
        window.removeEventListener('pointerup',stop);
        window.removeEventListener('pointercancel',stop);
        this.syncRoutineEditorStateFromDom();
        this.renderRoutineEditorOverlayContent();
      };
      window.addEventListener('pointermove',handleMove);
      window.addEventListener('pointerup',stop);
      window.addEventListener('pointercancel',stop);
      this.routineEditorDragState={pointerId,handleMove,stop};
    }

    reorderRoutineEditorBlocks(block,clientY){
      if(!this.routineEditorList) return;
      const siblings=Array.from(this.routineEditorList.children).filter(el=>el.classList&&el.classList.contains('nsf-editor-block'));
      let nextSibling=null;
      for(const sibling of siblings){
        if(sibling===block) continue;
        const rect=sibling.getBoundingClientRect();
        if(clientY<rect.top+rect.height/2){
          nextSibling=sibling;
          break;
        }
      }
      if(nextSibling){
        if(nextSibling!==block.nextSibling){
          this.routineEditorList.insertBefore(block,nextSibling);
        }
      }else{
        if(block!==this.routineEditorList.lastElementChild){
          this.routineEditorList.appendChild(block);
        }
      }
    }

    syncRoutineEditorStateFromDom(){
      if(!this.routineEditorBlocks||!this.routineEditorList) return;
      const activeTab=this.getActiveRoutineEditorTab();
      const previousState=cloneRoutineEditorTabState(this.getRoutineEditorTabState(activeTab),activeTab);
      const baseBlocks=this.getRoutineEditorBaseBlocks(activeTab);
      const allowedKeys=new Set(baseBlocks.map(block=>block.key));
      const state=createDefaultRoutineEditorTabState(activeTab);
      state.hiddenBaseBlocks=Array.isArray(previousState.hiddenBaseBlocks)?previousState.hiddenBaseBlocks.slice():[];
      const orderNodes=Array.from(this.routineEditorList.children).filter(el=>el.classList&&el.classList.contains('nsf-editor-block'));
      const order=[];
      orderNodes.forEach(node=>{
        if(node.dataset&&node.dataset.type) order.push(node.dataset.type);
      });
      if(order.length) state.order=order;
      state.hiddenBaseBlocks=state.hiddenBaseBlocks.filter(key=>!order.includes(key));
      const customEntries=[];
      baseBlocks.forEach(def=>{
        const info=this.routineEditorBlocks[def.key];
        if(!info){
          const previousBlock=previousState.blocks&&previousState.blocks[def.key];
          const previousLines=Array.isArray(previousBlock&&previousBlock.lines)?previousBlock.lines.slice():[''];
          state.blocks[def.key]={lines:previousLines.length?previousLines:['']};
          const previousMeta=previousState.blockMeta&&previousState.blockMeta[def.key];
          const previousLabel=previousMeta&&previousMeta.label?sanitizeRoutineEditorLabel(previousMeta.label):'';
          if(previousLabel){
            state.blockMeta[def.key]={label:previousLabel};
          }
          return;
        }
        const element=info.element;
        const datasetLabel=element&&element.dataset?sanitizeRoutineEditorLabel(element.dataset.label||''):'';
        const baseLabel=def.defaultLabel||def.label||'';
        if(datasetLabel&&datasetLabel!==baseLabel){
          state.blockMeta[def.key]={label:datasetLabel};
        }
        if(def.editable===false){
          state.blocks[def.key]={lines:this.getRoutineEditorLinesForBlock(def.key,false)};
          return;
        }
        const inputs=Array.from(info.linesContainer?info.linesContainer.querySelectorAll('textarea.nsf-editor-input'):[]);
        const lines=inputs.length?inputs.map(input=>String(input.value||'')):[''];
        const filtered=lines.filter((line,idx)=>line!==''||idx===0);
        state.blocks[def.key]={lines:filtered.length?filtered:['']};
      });
      const tabState=this.getRoutineEditorTabState(activeTab);
      const existingCustom=Array.isArray(tabState.customBlocks)?tabState.customBlocks:[];
      const orderKeys=new Set(order);
      order.forEach((key,index)=>{
        if(!key||!key.startsWith(ROUTINE_EDITOR_CUSTOM_PREFIX)) return;
        const info=this.routineEditorBlocks[key];
        if(!info) return;
        const id=info.definition&&info.definition.customId?info.definition.customId:key.slice(ROUTINE_EDITOR_CUSTOM_PREFIX.length);
        if(!id) return;
        const element=info.element;
        const datasetType=element&&element.dataset&&element.dataset.customType==='aspen'
          ?'aspen'
          :element&&element.dataset&&element.dataset.customType==='linebreak'
            ?'linebreak'
            :'text';
        const datasetLabel=element&&element.dataset?sanitizeRoutineEditorLabel(element.dataset.label||''):'';
        const datasetField=element&&element.dataset&&element.dataset.aspenField?element.dataset.aspenField:'';
        const datasetParameter=element&&element.dataset&&element.dataset.parameterKey?element.dataset.parameterKey:'';
        const defaultDef=existingCustom.find(block=>block&&block.id===id) || previousState.customBlocks.find(block=>block&&block.id===id);
        if(datasetType==='aspen'){
          const previous=existingCustom.find(block=>block&&block.id===id)||previousState.customBlocks.find(block=>block&&block.id===id)||{lines:['']};
          const lines=Array.isArray(previous.lines)?previous.lines.slice():[''];
          customEntries.push({
            id,
            type:'aspen',
            label:datasetLabel,
            aspenField:datasetField,
            lines:lines.length?lines:['']
          });
        }else if(datasetType==='linebreak'){
          customEntries.push({
            id,
            type:'linebreak',
            label:datasetLabel,
            aspenField:'',
            lines:['']
          });
        }else{
          const inputs=Array.from(info.linesContainer?info.linesContainer.querySelectorAll('textarea.nsf-editor-input'):[]);
          const lines=inputs.length?inputs.map(input=>String(input.value||'')):[''];
          const filtered=lines.filter((line,idx)=>line!==''||idx===0);
          customEntries.push({
            id,
            type:'text',
            label:datasetLabel,
            aspenField:'',
            parameterKey:datasetParameter,
            lines:filtered.length?filtered:['']
          });
        }
      });
      state.customBlocks=customEntries;
      if(!this.routineEditorState||typeof this.routineEditorState!=='object'){
        this.routineEditorState=createDefaultRoutineEditorState();
      }
      if(!this.routineEditorState.tabs||typeof this.routineEditorState.tabs!=='object'){
        this.routineEditorState=normalizeRoutineEditorState(this.routineEditorState);
      }
      this.routineEditorState.tabs[activeTab]=state;
      storeRoutineEditorState(this.routineEditorState);
      this.refreshRoutineEditorPreview();
      this.evaluateRoutineEditorPresetMatch();
    }
    refreshRoutineEditorDerivedLines(source){
      const computed=source||{};
      const findingsText=typeof computed.findings==='string'?computed.findings:(this.textareas&&this.textareas.findings?this.textareas.findings.value:'');
      const actionsText=typeof computed.actions==='string'?computed.actions:(this.textareas&&this.textareas.actions?this.textareas.actions.value:'');
      const splitLines=text=>{
        if(!text) return [];
        return text.split(/\r?\n/).map(line=>clean(line)).filter(Boolean);
      };
      this.routineEditorDerivedLines={
        findings:splitLines(findingsText),
        actions:splitLines(actionsText)
      };
      ['findings','actions'].forEach(key=>this.replaceRoutineEditorBlockLines(key,this.routineEditorDerivedLines[key]));
      this.refreshRoutineEditorPreview();
    }

    refreshRoutineEditorPreview(){
      if(!this.routineEditorPreviewContent) return;
      this.updateRoutineEditorPreviewTabs();
      const activeTab=this.routineEditorActiveTab&&ROUTINE_EDITOR_PREVIEW_TAB_KEYS.includes(this.routineEditorActiveTab)
        ?this.routineEditorActiveTab
        :'routine';
      const config=this.getRoutineEditorTabConfig(activeTab);
      const emptyMessage=config&&config.previewEmpty?config.previewEmpty:'Keine Daten vorhanden.';
      const order=this.getRoutineEditorOrder();
      const combined=[];
      order.forEach(key=>{
        const lines=this.collectRoutineEditorBlockLines(key);
        lines.forEach(line=>{
          if(line===ROUTINE_EDITOR_LINE_BREAK_TOKEN){
            combined.push('');
            return;
          }
          const trimmed=clean(line);
          if(trimmed) combined.push(trimmed);
        });
      });
      const hasLineBreak=combined.some(line=>line==='');
      const previewText=combined.join('\n');
      const displayText=previewText||(hasLineBreak?'\n':'');
      this.routineEditorPreviewContent.textContent=displayText||emptyMessage;
      if(this.routineEditorPreviewPanel){
        this.routineEditorPreviewPanel.classList.toggle('is-empty',!previewText&&!hasLineBreak);
      }
    }

    setRoutineEditorActiveTab(tabKey){
      const allowed=ROUTINE_EDITOR_PREVIEW_TAB_KEYS.includes(tabKey)?tabKey:'routine';
      if(this.routineEditorActiveTab===allowed) return;
      if(this.routineEditorBlocks&&this.routineEditorList){
        this.syncRoutineEditorStateFromDom();
      }
      this.routineEditorActiveTab=allowed;
      storeRoutineEditorActiveTab(allowed);
      this.updateRoutineEditorPreviewTabs();
      if(this.routineEditorOverlay&&this.routineEditorOverlay.classList.contains('open')){
        this.renderRoutineEditorOverlayContent();
      }
      this.refreshRoutineEditorPreview();
    }

    updateRoutineEditorPreviewTabs(){
      if(this.routineEditorPreviewTabButtons instanceof Map){
        this.routineEditorPreviewTabButtons.forEach((button,key)=>{
          if(!button) return;
          button.classList.toggle('is-active',this.routineEditorActiveTab===key);
        });
      }
      if(this.routineEditorPreviewTitleElement){
        const def=OUTPUT_DEFS.find(item=>item.key===this.routineEditorActiveTab)||OUTPUT_DEFS.find(item=>item.key==='routine');
        const label=def?def.label:'Routine';
        this.routineEditorPreviewTitleElement.textContent=`${label}-Vorschau`;
      }
    }

    replaceRoutineEditorBlockLines(key,lines){
      const info=this.routineEditorBlocks&&this.routineEditorBlocks[key];
      if(!info) return;
      const def=info.definition||this.getRoutineEditorBlockDefinition(key);
      if(!def) return;
      const editable=def.editable!==false;
      const container=info.linesContainer;
      if(!container) return;
      container.innerHTML='';
      const values=Array.isArray(lines)?lines.slice():[];
      if(!values.length){
        if(editable){
          container.appendChild(this.createRoutineEditorLine(key,'',true));
        }else{
          const empty=document.createElement('div');
          empty.className='nsf-empty';
          empty.textContent='Keine Daten vorhanden.';
          container.appendChild(empty);
        }
        return;
      }
      values.forEach(value=>{
        container.appendChild(this.createRoutineEditorLine(key,value,editable));
      });
    }

    collectRoutineEditorBlockLines(key){
      const activeTab=this.getActiveRoutineEditorTab();
      if(activeTab==='routine'&&(key==='findings'||key==='actions')){
        const derived=this.routineEditorDerivedLines&&Array.isArray(this.routineEditorDerivedLines[key])?this.routineEditorDerivedLines[key]:[];
        return derived.map(line=>clean(line)).filter(Boolean);
      }
      if(key&&key.startsWith(ROUTINE_EDITOR_CUSTOM_PREFIX)){
        const id=key.slice(ROUTINE_EDITOR_CUSTOM_PREFIX.length);
        const tabState=this.getRoutineEditorTabState();
        const customBlocks=Array.isArray(tabState&&tabState.customBlocks)?tabState.customBlocks:[];
        const entry=customBlocks.find(block=>block&&block.id===id);
        if(entry&&entry.type==='linebreak'){
          return [ROUTINE_EDITOR_LINE_BREAK_TOKEN];
        }
        const lines=Array.isArray(entry&&entry.lines)?entry.lines:[];
        const values=[];
        lines.forEach(raw=>{
          const value=typeof raw==='string'?raw:'';
          const trimmed=clean(value);
          if(trimmed){
            values.push(trimmed);
          }else{
            values.push(ROUTINE_EDITOR_LINE_BREAK_TOKEN);
          }
        });
        return values;
      }
      const config=this.getRoutineEditorTabConfig(activeTab);
      if(config&&config.primaryTextarea===key){
        const textarea=this.textareas&&this.textareas[key];
        const value=textarea?textarea.value:'';
        const segments=value.split(/\r?\n/);
        return segments.map(segment=>segment?segment:ROUTINE_EDITOR_LINE_BREAK_TOKEN);
      }
      const tabState=this.getRoutineEditorTabState();
      const entry=tabState&&tabState.blocks?tabState.blocks[key]:null;
      const lines=Array.isArray(entry&&entry.lines)?entry.lines:[];
      return lines.map(line=>clean(line)).filter(Boolean);
    }

    handleRoutineEditorSave(){
      this.syncRoutineEditorStateFromDom();
      const activeTab=this.getActiveRoutineEditorTab();
      const order=this.getRoutineEditorOrder();
      const combined=[];
      order.forEach(key=>{
        const lines=this.collectRoutineEditorBlockLines(key);
        lines.forEach(line=>{
          if(line===ROUTINE_EDITOR_LINE_BREAK_TOKEN){
            combined.push('');
          }else if(typeof line==='string'&&line){
            combined.push(clean(line));
          }
        });
      });
      const finalText=combined.join('\n');
      const textarea=this.textareas&&this.textareas[activeTab];
      if(textarea){
        textarea.value=finalText;
        autoResizeTextarea(textarea);
      }
      if(this.activeState&&typeof this.activeState==='object'){
        this.activeState[activeTab]=finalText;
      }
      this.queueStateSave();
      this.closeRoutineEditorOverlay();
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
        entry:null,
        outsideHandler:null
      };
      const closeSuggestions=()=>{
        row.classList.remove('show-suggestions');
        state.suggestionsList=[];
        state.highlightIndex=-1;
        suggestions.innerHTML='';
        if(state.outsideHandler){
          document.removeEventListener('pointerdown',state.outsideHandler,true);
          state.outsideHandler=null;
        }
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
        if(!state.outsideHandler){
          state.outsideHandler=event=>{
            if(!row.contains(event.target)) closeSuggestions();
          };
          document.addEventListener('pointerdown',state.outsideHandler,true);
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
        setTimeout(()=>{
          const active=document.activeElement;
          if(active!==input&&!row.contains(active)) closeSuggestions();
        },150);
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
      if(state.outsideHandler){
        document.removeEventListener('pointerdown',state.outsideHandler,true);
        state.outsideHandler=null;
      }
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
      if(state.outsideHandler){
        document.removeEventListener('pointerdown',state.outsideHandler,true);
        state.outsideHandler=null;
      }
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
      this.activeState=createEmptyActiveState();
      this.customSections=[];
      this.rebuildCustomSectionMap();
      this.syncCustomSectionsToActiveState({save:false});
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
        let payload='';
        const fileName=typeof file.name==='string'?file.name.toLowerCase():'';
        const fileType=typeof file.type==='string'?file.type.toLowerCase():'';
        const looksLikeXlsx=fileName.endsWith('.xlsx')||fileName.endsWith('.xlsm')||fileName.endsWith('.xls')||fileType.includes('spreadsheetml')||fileType.includes('ms-excel');
        if(looksLikeXlsx){
          const xlsxParsed=await parseAspenXlsx(file);
          if(xlsxParsed) payload=JSON.stringify(xlsxParsed);
        }
        let content=null;
        if(!payload){
          content=await file.text();
          if(!content) return;
          let parsed=null;
          try{parsed=JSON.parse(content);}
          catch{parsed=null;}
          if(parsed&&typeof parsed==='object'){
            payload=JSON.stringify(parsed);
          }else{
            const csvParsed=parseAspenCsv(content);
            if(csvParsed) payload=JSON.stringify(csvParsed);
          }
        }
        if(payload){
          instances.forEach(inst=>{
            if(inst&&typeof inst.prepareForAspenReload==='function'){
              inst.prepareForAspenReload();
            }
          });
          localStorage.setItem(ASPEN_DOC_KEY,payload);
          lastValues[ASPEN_DOC_KEY]=payload;
          scheduleAll();
        }
      }catch(err){
        console.warn('NSF: Aspen-Datei konnte nicht gelesen werden',err);
      }
    }

    prepareForAspenReload(){
      if(this.destroyed) return;
      if(!this.meldung) return;
      const clonedState=cloneActiveState(this.activeState);
      const selections=serializeSelections(this.selectedEntries);
      this.preservedAspenState={
        meldung:this.meldung,
        part:this.currentPart,
        activeState:clonedState,
        selections,
        filterAll:this.filterAll
      };
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
