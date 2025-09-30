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
  const ROUTINE_EDITOR_STORAGE_KEY='nsf-routine-editor';
  const ROUTINE_EDITOR_BLOCKS=[
    {key:'prefix',label:'Prefix',editable:true,persist:true},
    {key:'findings',label:'Findings',editable:false,persist:false},
    {key:'actions',label:'Actions',editable:false,persist:false},
    {key:'suffix',label:'Suffix',editable:true,persist:true}
  ];

  const OUTPUT_DEFS=[
    {key:'findings',label:'Findings'},
    {key:'actions',label:'Actions'},
    {key:'routine',label:'Routine'},
    {key:'nonroutine',label:'Nonroutine'},
    {key:'parts',label:'Bestellliste'}
  ];

  const OUTPUT_KEYS=OUTPUT_DEFS.map(def=>def.key);
  const CUSTOM_SLOT_COUNT=OUTPUT_DEFS.length+1;

  const instances=new Set();
  let watchersInitialized=false;
  let ensureDataPromise=null;
  const lastValues={};

  function createDefaultRoutineEditorState(){
    const order=ROUTINE_EDITOR_BLOCKS.map(block=>block.key);
    const blocks={};
    ROUTINE_EDITOR_BLOCKS.forEach(block=>{
      blocks[block.key]={
        lines:block.editable===false?[]:['']
      };
    });
    return {order,blocks};
  }

  function normalizeRoutineEditorState(raw){
    const base=createDefaultRoutineEditorState();
    if(!raw||typeof raw!=='object') return base;
    const rawOrder=Array.isArray(raw.order)?raw.order:[];
    const orderSet=new Set();
    rawOrder.forEach(key=>{
      if(ROUTINE_EDITOR_BLOCKS.some(block=>block.key===key)){
        orderSet.add(key);
      }
    });
    ROUTINE_EDITOR_BLOCKS.forEach(block=>{
      if(!orderSet.has(block.key)) orderSet.add(block.key);
    });
    base.order=Array.from(orderSet);
    const rawBlocks=raw.blocks&&typeof raw.blocks==='object'?raw.blocks:null;
    ROUTINE_EDITOR_BLOCKS.forEach(block=>{
      if(block.persist===false) return;
      const legacyEntry=raw[block.key];
      const entry=rawBlocks&&rawBlocks[block.key]?rawBlocks[block.key]:legacyEntry;
      const rawLines=Array.isArray(entry&&entry.lines)?entry.lines:Array.isArray(entry)?entry:[];
      const lines=rawLines.map(value=>typeof value==='string'?value:'');
      base.blocks[block.key]={
        lines:lines.length?lines:['']
      };
    });
    return base;
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
      const payload={
        order:Array.isArray(normalized.order)?normalized.order.slice():[],
        blocks:{}
      };
      ROUTINE_EDITOR_BLOCKS.forEach(block=>{
        if(block.persist===false) return;
        const lines=normalized.blocks&&normalized.blocks[block.key]?normalized.blocks[block.key].lines:null;
        const safeLines=Array.isArray(lines)?lines.map(value=>typeof value==='string'?value:''):[''];
        payload.blocks[block.key]={lines:safeLines.length?safeLines:['']};
      });
      localStorage.setItem(ROUTINE_EDITOR_STORAGE_KEY,JSON.stringify(payload));
    }catch(err){
      console.warn('NSF: Routine-Editor konnte nicht gespeichert werden',err);
    }
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
      .nsf-outputs-layout{display:flex;flex-direction:column;gap:1.25rem;}
      .nsf-custom-slot{display:flex;flex-direction:column;gap:0.55rem;}
      .nsf-custom-add{align-self:flex-start;background:rgba(59,130,246,0.22);border:1px solid rgba(59,130,246,0.45);border-radius:0.65rem;padding:0.35rem 0.75rem;font:inherit;color:rgba(191,219,254,0.95);cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;display:inline-flex;align-items:center;gap:0.35rem;}
      .nsf-custom-add::before{content:'+';font-size:1.1rem;line-height:1;}
      .nsf-custom-add:hover{background:rgba(59,130,246,0.32);transform:translateY(-1px);}
      .nsf-custom-list{display:flex;flex-direction:column;gap:0.55rem;width:100%;}
      .nsf-custom-block{position:relative;background:rgba(15,23,42,0.22);border-radius:0.85rem;padding:0.65rem 0.75rem 0.75rem;display:flex;flex-direction:column;gap:0.55rem;cursor:default;}
      .nsf-custom-block.dragging{opacity:0.85;box-shadow:0 12px 28px rgba(15,23,42,0.45);}
      .nsf-custom-handle{align-self:flex-start;font-size:1.15rem;line-height:1;opacity:0.65;cursor:grab;user-select:none;}
      .nsf-custom-handle:active{cursor:grabbing;}
      .nsf-custom-textarea{width:100%;border:none;border-radius:0.65rem;padding:0.6rem 0.75rem;font:inherit;color:var(--sidebar-module-card-text,#111);background:var(--sidebar-module-card-bg,#fff);resize:none;min-height:3.5rem;box-shadow:inset 0 0 0 1px rgba(15,23,42,0.1);}
      .nsf-custom-textarea::placeholder{color:rgba(107,114,128,0.7);}
      .nsf-custom-remove{align-self:flex-end;background:rgba(248,113,113,0.25);border:none;border-radius:999px;width:2rem;height:2rem;display:inline-flex;align-items:center;justify-content:center;color:rgba(248,113,113,0.95);cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-custom-remove:hover{background:rgba(248,113,113,0.38);transform:scale(1.05);}
      .nsf-editor-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.72);backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;padding:3rem 1.5rem;z-index:400;}
      .nsf-editor-overlay.open{display:flex;}
      .nsf-editor-dialog{background:rgba(15,23,42,0.95);border-radius:1.1rem;border:1px solid rgba(148,163,184,0.35);box-shadow:0 24px 64px rgba(15,23,42,0.55);max-width:720px;width:100%;max-height:calc(100vh - 6rem);overflow:auto;padding:1.5rem;display:flex;flex-direction:column;gap:1.25rem;color:#e2e8f0;}
      .nsf-editor-dialog-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;}
      .nsf-editor-dialog-title{font-size:1.2rem;font-weight:700;margin:0;}
      .nsf-editor-close{background:rgba(248,113,113,0.2);border:none;border-radius:999px;width:2.2rem;height:2.2rem;color:rgba(248,113,113,0.95);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:1.1rem;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-editor-close:hover{background:rgba(248,113,113,0.32);transform:scale(1.05);}
      .nsf-editor-list{display:flex;flex-direction:column;gap:0.85rem;}
      .nsf-editor-block{background:rgba(15,23,42,0.88);border-radius:0.95rem;border:1px solid rgba(148,163,184,0.25);box-shadow:0 18px 36px rgba(15,23,42,0.5);padding:0.9rem;display:flex;flex-direction:column;gap:0.65rem;cursor:grab;position:relative;transition:box-shadow 0.15s ease,transform 0.15s ease;}
      .nsf-editor-block.dragging{opacity:0.9;box-shadow:0 22px 44px rgba(59,130,246,0.45);}
      .nsf-editor-header{font-weight:700;font-size:0.96rem;display:flex;align-items:center;justify-content:space-between;gap:0.45rem;user-select:none;touch-action:none;}
      .nsf-editor-block[data-editable='0'] .nsf-editor-header{opacity:0.85;}
      .nsf-editor-lines{display:flex;flex-direction:column;gap:0.45rem;}
      .nsf-editor-line{display:flex;align-items:center;gap:0.45rem;background:rgba(15,23,42,0.4);border-radius:0.75rem;padding:0.4rem 0.45rem;}
      .nsf-editor-input{flex:1;border:none;border-radius:0.6rem;padding:0.45rem 0.55rem;font:inherit;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);}
      .nsf-editor-input::placeholder{color:rgba(107,114,128,0.65);}
      .nsf-editor-block[data-editable='0'] .nsf-editor-input{background:rgba(15,23,42,0.25);color:#cbd5f5;cursor:default;}
      .nsf-editor-input:read-only{cursor:default;}
      .nsf-editor-remove{background:rgba(248,113,113,0.18);border:none;border-radius:0.55rem;width:1.8rem;height:1.8rem;display:inline-flex;align-items:center;justify-content:center;color:rgba(248,113,113,0.92);cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-editor-remove:hover{background:rgba(248,113,113,0.3);transform:scale(1.05);}
      .nsf-editor-add{align-self:flex-start;background:rgba(59,130,246,0.22);border:1px solid rgba(59,130,246,0.45);border-radius:0.65rem;width:2rem;height:2rem;display:inline-flex;align-items:center;justify-content:center;color:rgba(191,219,254,0.95);font-size:1.1rem;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-editor-add:hover{background:rgba(59,130,246,0.32);transform:translateY(-1px);}
      .nsf-editor-block[data-editable='0'] .nsf-editor-add{display:none;}
      .nsf-editor-actions{display:flex;justify-content:flex-end;}
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
      this.routineEditorState=loadRoutineEditorState();
      this.routineEditorBlocks={};
      this.routineEditorOverlay=null;
      this.routineEditorList=null;
      this.routineEditorMenu=null;
      this.routineEditorMenuCleanup=null;
      this.routineEditorContextHandler=null;
      this.routineEditorContextTarget=null;
      this.routineEditorDerivedLines={findings:[],actions:[]};
      this.routineEditorDragState=null;
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
    }

    renderDom(){
      const root=this.root;
      this.destroyCustomSectionSortables();
      root.innerHTML='';
      this.customSlots=[];
      root.classList.add('nsf-module');
      this.ensureRoutineEditorState();
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
      });
      outputsWrapper.appendChild(this.createCustomSlot(OUTPUT_DEFS.length));

      this.setupRoutineEditorInteraction();

      this.syncOutputsWithSelections({persist:false});

      root.append(contextSection,inputSection,outputsSection);
      this.renderCustomSections();
    }

    createCustomSlot(index){
      const wrapper=document.createElement('div');
      wrapper.className='nsf-custom-slot';
      const addBtn=document.createElement('button');
      addBtn.type='button';
      addBtn.className='nsf-custom-add';
      addBtn.textContent='Textfeld hinzufügen';
      addBtn.title='Freitextfeld hinzufügen';
      addBtn.setAttribute('aria-label','Freitextfeld hinzufügen');
      addBtn.addEventListener('click',()=>this.addCustomSection(index));
      const list=document.createElement('div');
      list.className='nsf-custom-list';
      list.dataset.slotIndex=String(index);
      wrapper.append(addBtn,list);
      this.customSlots.push({index,wrapper,list,addBtn});
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

    renderCustomSections(){
      this.destroyCustomSectionSortables();
      if(!Array.isArray(this.customSlots)) this.customSlots=[];
      this.customSlots.forEach(slot=>{
        if(slot&&slot.list) slot.list.innerHTML='';
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
          },
          onEnd:evt=>{
            if(evt?.item) evt.item.classList.remove('dragging');
            this.syncCustomSectionsFromDom();
          }
        });
        this.customSlotSortables.push(sortable);
      });
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
      }else{
        this.routineEditorState=normalizeRoutineEditorState(this.routineEditorState);
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
      this.routineEditorBlocks={};
      this.routineEditorDragState=null;
    }

    setupRoutineEditorInteraction(){
      const routineTextarea=this.textareas&&this.textareas.routine;
      if(!routineTextarea) return;
      if(this.routineEditorContextTarget&&this.routineEditorContextHandler){
        this.routineEditorContextTarget.removeEventListener('contextmenu',this.routineEditorContextHandler);
      }
      const handler=event=>{
        event.preventDefault();
        this.openRoutineEditorMenu(event);
      };
      routineTextarea.addEventListener('contextmenu',handler);
      this.routineEditorContextHandler=handler;
      this.routineEditorContextTarget=routineTextarea;
    }

    teardownRoutineEditorInteraction(){
      this.closeRoutineEditorMenu();
      if(this.routineEditorContextTarget&&this.routineEditorContextHandler){
        this.routineEditorContextTarget.removeEventListener('contextmenu',this.routineEditorContextHandler);
      }
      this.routineEditorContextTarget=null;
      this.routineEditorContextHandler=null;
    }

    openRoutineEditorMenu(event){
      this.closeRoutineEditorMenu();
      const menu=document.createElement('div');
      menu.className='nsf-editor-menu';
      const editBtn=document.createElement('button');
      editBtn.type='button';
      editBtn.className='nsf-editor-menu-btn';
      editBtn.textContent='Ändern';
      editBtn.addEventListener('click',()=>{
        this.closeRoutineEditorMenu();
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
    }

    ensureRoutineEditorOverlay(){
      if(this.routineEditorOverlay) return this.routineEditorOverlay;
      this.ensureRoutineEditorState();
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
      const list=document.createElement('div');
      list.className='nsf-editor-list';
      dialog.appendChild(list);
      this.routineEditorList=list;
      this.routineEditorBlocks={};
      const order=this.routineEditorState&&Array.isArray(this.routineEditorState.order)&&this.routineEditorState.order.length?this.routineEditorState.order:ROUTINE_EDITOR_BLOCKS.map(block=>block.key);
      order.forEach(key=>{
        const def=ROUTINE_EDITOR_BLOCKS.find(block=>block.key===key);
        if(!def) return;
        const block=this.createRoutineEditorBlock(def);
        if(block) list.appendChild(block);
      });
      const actions=document.createElement('div');
      actions.className='nsf-editor-actions';
      const saveButton=document.createElement('button');
      saveButton.type='button';
      saveButton.className='nsf-editor-save';
      saveButton.textContent='💾 Routine aktualisieren';
      saveButton.title='Routine-Text aus den Blöcken übernehmen';
      saveButton.addEventListener('click',()=>this.handleRoutineEditorSave());
      actions.appendChild(saveButton);
      dialog.appendChild(actions);
      document.body.appendChild(overlay);
      overlay.addEventListener('keydown',event=>{
        if(event.key==='Escape'){
          event.preventDefault();
          this.closeRoutineEditorOverlay();
        }
      });
      this.routineEditorOverlay=overlay;
      this.refreshRoutineEditorDerivedLines();
      return overlay;
    }

    openRoutineEditorOverlay(){
      const overlay=this.ensureRoutineEditorOverlay();
      if(!overlay) return;
      this.refreshRoutineEditorDerivedLines();
      overlay.classList.add('open');
      const focusTarget=overlay.querySelector('.nsf-editor-block[data-editable="1"] input');
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

    createRoutineEditorBlock(def){
      if(!def) return null;
      const block=document.createElement('div');
      block.className='nsf-editor-block';
      block.dataset.type=def.key;
      block.dataset.editable=def.editable===false?'0':'1';
      const header=document.createElement('div');
      header.className='nsf-editor-header';
      header.textContent=def.label;
      header.addEventListener('pointerdown',event=>this.startRoutineEditorReorder(event,block));
      block.appendChild(header);
      const linesContainer=document.createElement('div');
      linesContainer.className='nsf-editor-lines';
      block.appendChild(linesContainer);
      this.routineEditorBlocks[def.key]={element:block,linesContainer,definition:def};
      this.populateRoutineEditorBlock(def.key);
      if(def.editable!==false){
        const addButton=document.createElement('button');
        addButton.type='button';
        addButton.className='nsf-editor-add';
        addButton.textContent='+';
        addButton.title=`${def.label} Zeile hinzufügen`;
        addButton.setAttribute('aria-label',addButton.title);
        addButton.addEventListener('click',()=>{
          const line=this.createRoutineEditorLine(def.key,'',true);
          linesContainer.appendChild(line);
          const input=line.querySelector('input');
          if(input) input.focus();
          this.syncRoutineEditorStateFromDom();
        });
        block.appendChild(addButton);
      }
      return block;
    }

    getRoutineEditorLinesForBlock(key,editable){
      if(key==='findings'||key==='actions'){
        const derived=this.routineEditorDerivedLines&&Array.isArray(this.routineEditorDerivedLines[key])?this.routineEditorDerivedLines[key]:[];
        return derived.slice();
      }
      const entry=this.routineEditorState&&this.routineEditorState.blocks?this.routineEditorState.blocks[key]:null;
      const lines=Array.isArray(entry&&entry.lines)?entry.lines:[];
      if(editable&&lines.length===0) return [''];
      return lines.slice();
    }

    populateRoutineEditorBlock(key){
      const info=this.routineEditorBlocks&&this.routineEditorBlocks[key];
      if(!info) return;
      const def=info.definition||ROUTINE_EDITOR_BLOCKS.find(block=>block.key===key);
      const editable=def&&def.editable!==false;
      const container=info.linesContainer;
      container.innerHTML='';
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
      const input=document.createElement('input');
      input.type='text';
      input.className='nsf-editor-input';
      input.value=typeof value==='string'?value:'';
      if(editable){
        input.placeholder='Text…';
        input.addEventListener('input',()=>this.syncRoutineEditorStateFromDom());
      }else{
        input.readOnly=true;
        input.tabIndex=-1;
      }
      line.appendChild(input);
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
          const focusTarget=container?container.querySelector('input'):null;
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
      const pointerId=event.pointerId;
      const handleMove=ev=>{
        if(pointerId!=null&&ev.pointerId!==pointerId) return;
        ev.preventDefault();
        this.reorderRoutineEditorBlocks(block,ev.clientY);
      };
      const stop=ev=>{
        if(pointerId!=null&&ev.pointerId!==pointerId) return;
        block.classList.remove('dragging');
        window.removeEventListener('pointermove',handleMove);
        window.removeEventListener('pointerup',stop);
        window.removeEventListener('pointercancel',stop);
        this.syncRoutineEditorStateFromDom();
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
      const state=createDefaultRoutineEditorState();
      const orderNodes=Array.from(this.routineEditorList.children).filter(el=>el.classList&&el.classList.contains('nsf-editor-block'));
      const order=[];
      orderNodes.forEach(node=>{
        if(node.dataset&&node.dataset.type) order.push(node.dataset.type);
      });
      if(order.length) state.order=order;
      ROUTINE_EDITOR_BLOCKS.forEach(def=>{
        const info=this.routineEditorBlocks[def.key];
        if(!info) return;
        if(def.editable===false){
          state.blocks[def.key]={lines:this.getRoutineEditorLinesForBlock(def.key,false)};
          return;
        }
        const inputs=Array.from(info.linesContainer?info.linesContainer.querySelectorAll('input.nsf-editor-input'):[]);
        const lines=inputs.length?inputs.map(input=>String(input.value||'')):[''];
        const filtered=lines.filter((line,idx)=>line!==''||idx===0);
        state.blocks[def.key]={lines:filtered.length?filtered:['']};
      });
      this.routineEditorState=state;
      storeRoutineEditorState(state);
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
    }

    replaceRoutineEditorBlockLines(key,lines){
      const info=this.routineEditorBlocks&&this.routineEditorBlocks[key];
      if(!info) return;
      const def=info.definition||ROUTINE_EDITOR_BLOCKS.find(block=>block.key===key);
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
      if(key==='findings'||key==='actions'){
        const derived=this.routineEditorDerivedLines&&Array.isArray(this.routineEditorDerivedLines[key])?this.routineEditorDerivedLines[key]:[];
        return derived.map(line=>clean(line)).filter(Boolean);
      }
      const info=this.routineEditorBlocks&&this.routineEditorBlocks[key];
      if(!info) return [];
      const inputs=Array.from(info.linesContainer?info.linesContainer.querySelectorAll('input.nsf-editor-input'):[]);
      return inputs.map(input=>clean(input.value)).filter(Boolean);
    }

    handleRoutineEditorSave(){
      this.syncRoutineEditorStateFromDom();
      const order=this.routineEditorState&&Array.isArray(this.routineEditorState.order)&&this.routineEditorState.order.length?this.routineEditorState.order:['prefix','findings','actions','suffix'];
      const combined=[];
      order.forEach(key=>{
        if(!ROUTINE_EDITOR_BLOCKS.some(block=>block.key===key)) return;
        const lines=this.collectRoutineEditorBlockLines(key);
        lines.forEach(line=>{
          if(line) combined.push(line);
        });
      });
      const routineText=combined.join('\n');
      const textarea=this.textareas&&this.textareas.routine;
      if(textarea){
        textarea.value=routineText;
        autoResizeTextarea(textarea);
      }
      if(this.activeState&&typeof this.activeState==='object'){
        this.activeState.routine=routineText;
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
