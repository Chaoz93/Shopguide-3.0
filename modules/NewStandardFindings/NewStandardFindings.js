(function(){
  'use strict';

  // ===== NSF READ HELPERS (ensure exists) =====
  function nsfGetParts(entry) {
    return (entry && Array.isArray(entry.parts)) ? entry.parts : [];
  }
  function nsfGetAppliesTo(entry) {
    return (entry && Array.isArray(entry.appliesTo)) ? entry.appliesTo : [];
  }
  // ===== end =====

  function nsfGetTimes(entry) {
    if (entry?.times && typeof entry.times === 'object') return entry.times;
    return {};
  }

  function nsfGetRoutineAction(entry) {
    return entry?.routineAction || "";
  }

  function nsfGetMods(entry) {
    return Array.isArray(entry?.mods) ? entry.mods : [];
  }
  // ===== NSF READ HELPERS (END) =====

  const FINDING_STATUS_OPTIONS=[
    'Spare',
    'Mishandling',
    'Missing Parts',
    'Abnormal wear and tear',
    'SRU Exchange',
    'SRU Exchange Mishandling',
    'SRU Exchange Missing Parts',
    'SRU Exchange Abnormal wear and tear',
    'Modification 1',
    'Modification 2',
    'Modification 3',
    'Modification 4'
  ];
  const DEFAULT_FINDING_STATUS='Spare';

  function normalizeFindingStatus(value){
    const cleaned=clean(value);
    if(!cleaned) return '';
    const match=FINDING_STATUS_OPTIONS.find(option=>option.toLowerCase()===cleaned.toLowerCase());
    return match||cleaned;
  }

  function isSruExchangeStatus(value){
    const normalized=normalizeFindingStatus(value);
    return normalized && normalized.toLowerCase().startsWith('sru exchange');
  }

  function nsfNormalizeParts(entry){
    return nsfGetParts(entry)
      .map(item=>{
        const source=(item&&typeof item==='object')?item:{part:item};
        const partValue=clean(source.part);
        const quantityRaw=source.menge??source.quantity??source.qty;
        const quantityValue=quantityRaw==null?'':clean(quantityRaw);
        if(!partValue) return null;
        const normalizedQuantity=quantityValue||'1';
        return {
          part:partValue,
          quantity:normalizedQuantity,
          menge:normalizedQuantity
        };
      })
      .filter(Boolean);
  }

  function nsfFormatQuantity(value){
    if(value==null) return '';
    const text=String(value).trim();
    if(!text) return '';
    return text.replace(/\./g,',');
  }

  function nsfRenderPnTextHeader(containerEl,entry){
    if(!containerEl) return;
    try{
      const existing=containerEl.querySelector('.nsf-pntext-header');
      if(existing&&existing.parentNode){
        existing.parentNode.removeChild(existing);
      }
    }catch(e){/* noop */}
  }

  function ensurePartsMappingModalStyles(){
    const id='nsf-parts-mapping-style';
    if(document.getElementById(id)) return;
    const st=document.createElement('style');
    st.id=id;
    st.textContent=`
    .nsf-mapping-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:1rem;z-index:9999}
    .nsf-mapping-modal{background:#fff;color:#1a1a1a;max-width:520px;width:100%;border-radius:8px;box-shadow:0 24px 48px rgba(15,23,42,.25);padding:1.5rem;font-family:inherit}
    .nsf-mapping-modal h2{margin:0 0 1rem;font-size:1.25rem;font-weight:600}
    .nsf-mapping-modal p{margin:.25rem 0 1.25rem;color:#4b5563;font-size:.95rem}
    .nsf-mapping-meta{margin-bottom:1rem;font-size:.95rem;display:flex;flex-direction:column;gap:.25rem}
    .nsf-mapping-table{width:100%;border-collapse:collapse;margin-bottom:1.25rem;font-size:.95rem}
    .nsf-mapping-table th{text-align:left;padding:.5rem .25rem;color:#374151;font-weight:600;border-bottom:1px solid rgba(148,163,184,.4)}
    .nsf-mapping-table td{padding:.5rem .25rem;border-bottom:1px solid rgba(148,163,184,.25)}
    .nsf-mapping-table tr:last-child td{border-bottom:none}
    .nsf-mapping-table select{width:100%;padding:.35rem .5rem;border:1px solid rgba(148,163,184,.8);border-radius:6px;background:#f9fafb;color:#111827;font-size:.9rem}
    .nsf-mapping-actions{display:flex;justify-content:flex-end;gap:.75rem}
    .nsf-mapping-actions button{min-width:96px;padding:.45rem .9rem;border-radius:6px;border:1px solid transparent;font-weight:600;font-size:.95rem;cursor:pointer;font-family:inherit}
    .nsf-mapping-actions button.nsf-btn-cancel{background:#fff;color:#1f2937;border-color:rgba(148,163,184,.6)}
    .nsf-mapping-actions button.nsf-btn-save{background:#2563eb;color:#fff}
    .nsf-mapping-actions button:focus{outline:2px solid #3b82f6;outline-offset:2px}
    `;
    document.head.appendChild(st);
  }

  function nsfRenderBestellListe(containerEl,entry){
    if(!containerEl) return;
    let list=containerEl.querySelector('.nsf-bestellliste');
    if(!list){
      list=document.createElement('div');
      list.className='nsf-bestellliste';
      containerEl.appendChild(list);
    }
    if(!list.__nsfPartsMappingContext){
      list.addEventListener('contextmenu',evt=>{
        evt.preventDefault();
        openPartsMappingModal(containerEl.__nsfCurrentEntry||entry||null);
      });
      list.__nsfPartsMappingContext=true;
    }

    const pairs=nsfNormalizeParts(entry);

    list.innerHTML='';

    if(!pairs.length){
      const info=document.createElement('div');
      info.className='nsf-parts-info';
      info.innerHTML='<span class="nsf-info-icon" aria-hidden="true">ℹ️</span><span>Keine Teile erforderlich</span>';
      list.appendChild(info);
      return;
    }

    const buildCopyText=partsList=>{
      if(!Array.isArray(partsList)||!partsList.length) return '';
      const normalized=nsfNormalizeParts({parts:partsList});
      if(!normalized.length) return '';
      const gap='\t\t\t\t';
      return normalized
        .map(pair=>{
          const part=clean(pair.part||'');
          if(!part) return '';
          const qty=nsfFormatQuantity(clean(pair.quantity||pair.menge)||'1')||'1';
          return `${part}${gap}${qty}\t${qty}`;
        })
        .filter(Boolean)
        .join('\n');
    };

    const groups=Array.isArray(entry?.groups)?entry.groups:[];
    if(groups.length){
      groups.forEach(group=>{
        if(!group) return;
        const groupWrap=document.createElement('div');
        groupWrap.className='nsf-part-group';
        const header=document.createElement('div');
        header.className='nsf-part-group-header';
        const headerTitle=document.createElement('div');
        headerTitle.className='nsf-part-group-title';
        headerTitle.textContent=group.status||DEFAULT_FINDING_STATUS;
        const copyBtn=document.createElement('button');
        copyBtn.type='button';
        copyBtn.className='nsf-copy-btn nsf-part-group-copy';
        copyBtn.textContent='📋';
        copyBtn.title=`${headerTitle.textContent} kopieren`;
        const copyFeedback=document.createElement('span');
        copyFeedback.className='nsf-copy-feedback';
        copyFeedback.textContent='✅';
        copyBtn.appendChild(copyFeedback);
        header.append(headerTitle,copyBtn);
        groupWrap.appendChild(header);
        const labelGroups=Array.isArray(group.labels)?group.labels:[];
        const groupParts=[];
        labelGroups.forEach(labelGroup=>{
          const labelText=clean(labelGroup?.label)||'';
          const partsList=Array.isArray(labelGroup?.parts)?labelGroup.parts:[];
          const labelGroupEl=document.createElement('div');
          labelGroupEl.className='nsf-part-label-group';
          if(labelText){
            const labelTitle=document.createElement('div');
            labelTitle.className='nsf-part-label-title';
            labelTitle.textContent=labelText;
            labelGroupEl.appendChild(labelTitle);
          }
          const labelList=document.createElement('div');
          labelList.className='nsf-part-label-list';
          partsList.forEach(pair=>{
            if(pair) groupParts.push(pair);
            const row=document.createElement('div');
            row.className='nsf-part-row';

            const partCol=document.createElement('div');
            partCol.className='nsf-col nsf-col-part';
            partCol.textContent=String(pair?.part||'');
            row.appendChild(partCol);

            const qtyCol=document.createElement('div');
            qtyCol.className='nsf-col nsf-col-qty';
            const rawQty=pair?.menge??pair?.quantity??1;
            qtyCol.textContent=nsfFormatQuantity(rawQty)||'1';
            row.appendChild(qtyCol);

            labelList.appendChild(row);
          });
          labelGroupEl.appendChild(labelList);
          groupWrap.appendChild(labelGroupEl);
        });
        const copyTextValue=buildCopyText(groupParts);
        if(copyTextValue){
          copyBtn.addEventListener('click',()=>{
            copyText(copyTextValue).then(success=>{
              if(!success) return;
              copyBtn.classList.add('copied');
              setTimeout(()=>copyBtn.classList.remove('copied'),1200);
            });
          });
        }else{
          copyBtn.disabled=true;
        }
        list.appendChild(groupWrap);
      });
      return;
    }

    pairs.forEach(pair=>{
      const row=document.createElement('div');
      row.className='nsf-part-row';

      const partCol=document.createElement('div');
      partCol.className='nsf-col nsf-col-part';
      partCol.textContent=String(pair.part||'');
      row.appendChild(partCol);

      const qtyCol=document.createElement('div');
      qtyCol.className='nsf-col nsf-col-qty';
      const rawQty=pair.menge??pair.quantity??1;
      qtyCol.textContent=nsfFormatQuantity(rawQty)||'1';
      row.appendChild(qtyCol);

      list.appendChild(row);
    });
  }

  function openPartsMappingModal(entry){
    if (!entry || typeof entry !== 'object') return;

    // Store globally for mapping context (C = combined approach)
    window.__lastFindingForMapping = entry;

    // use new-format parts reader
    const parts = nsfGetParts(entry);

    const partNumber = clean(entry.partNumber || '');
    const applies = nsfGetAppliesTo(entry).map(item => clean(item)).filter(Boolean);

    // if no visible data at all, nothing to render
    if (!parts.length && !partNumber && !applies.length) return;

    ensurePartsMappingModalStyles();

    const overlay=document.createElement('div');
    overlay.className='nsf-mapping-overlay';
    const modal=document.createElement('div');
    modal.className='nsf-mapping-modal';
    overlay.appendChild(modal);

    const title=document.createElement('h2');
    title.textContent='Teileübersicht';
    modal.appendChild(title);

    const description=document.createElement('p');
    description.textContent='Aktuelle Teilezuordnung für das ausgewählte Finding.';
    modal.appendChild(description);

    if(partNumber||applies.length){
      const meta=document.createElement('div');
      meta.className='nsf-mapping-meta';
      if(partNumber){
        const masterLine=document.createElement('div');
        masterLine.textContent=`Master Part: ${partNumber}`;
        meta.appendChild(masterLine);
      }
      if(applies.length){
        const appliesLine=document.createElement('div');
        appliesLine.textContent=`Gilt auch für: ${applies.join(', ')}`;
        meta.appendChild(appliesLine);
      }
      modal.appendChild(meta);
    }

    if(parts.length){
      const table=document.createElement('table');
      table.className='nsf-mapping-table';
      const thead=document.createElement('thead');
      const headRow=document.createElement('tr');
      ['Position','Part','Menge'].forEach(label=>{
        const th=document.createElement('th');
        th.textContent=label;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody=document.createElement('tbody');
      parts.forEach((partEntry,index)=>{
        const row=document.createElement('tr');
        const posCell=document.createElement('td');
        posCell.textContent=String(index+1);
        row.appendChild(posCell);
        const partCell=document.createElement('td');
        partCell.textContent=clean(partEntry.part||'');
        row.appendChild(partCell);
        const qtyCell=document.createElement('td');
        const rawMenge=partEntry&&partEntry.menge;
        const normalizedMenge=nsfFormatQuantity(rawMenge);
        qtyCell.textContent=normalizedMenge||nsfFormatQuantity(partEntry.quantity||'');
        row.appendChild(qtyCell);
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      modal.appendChild(table);
    }

    const actions=document.createElement('div');
    actions.className='nsf-mapping-actions';

    const closeBtn=document.createElement('button');
    closeBtn.type='button';
    closeBtn.className='nsf-btn-cancel';
    closeBtn.textContent='Schließen';
    closeBtn.addEventListener('click',closeModal);
    actions.appendChild(closeBtn);

    modal.appendChild(actions);

    function closeModal(){
      window.removeEventListener('keydown',onKeyDown,true);
      if(overlay&&overlay.parentNode){
        overlay.parentNode.removeChild(overlay);
      }
    }

    function onKeyDown(evt){
      if(evt.key==='Escape'){closeModal();}
    }

    overlay.addEventListener('click',evt=>{
      if(evt.target===overlay) closeModal();
    });
    window.addEventListener('keydown',onKeyDown,true);

    document.body.appendChild(overlay);
    closeBtn.focus();
  }

  function renderFindingPartsWithGlobalMapping(containerEl,entry){
    if(!containerEl) return;
    containerEl.__nsfCurrentEntry=entry||null;
    if(!containerEl.__nsfMappingListener){
      const handler=()=>{
        const currentEntry=containerEl.__nsfCurrentEntry||entry||null;
        nsfRenderPnTextHeader(containerEl,currentEntry);
        nsfRenderBestellListe(containerEl,currentEntry);
      };
      containerEl.addEventListener('nsf-mapping-updated',handler);
      containerEl.__nsfMappingListener=handler;
    }
    nsfRenderPnTextHeader(containerEl,entry);
    nsfRenderBestellListe(containerEl,entry);
  }

  // ================================================================
  // NSF Parts Normalization
  // ================================================================

  function normalizePartsPairs(entry){
    return nsfNormalizeParts(entry);
  }

  (function injectNsfStyles(){
    const id='nsf-parts-style';
    if(document.getElementById(id)) return;
    const st=document.createElement('style');
    st.id=id;
    st.textContent=`
    .nsf-bestellliste{display:flex;flex-direction:column;gap:.25rem}
    .nsf-part-group{display:flex;flex-direction:column;gap:.35rem;padding:.2rem 0}
    .nsf-part-group + .nsf-part-group{border-top:1px solid currentColor;padding-top:.5rem}
    .nsf-part-group-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem}
    .nsf-part-group-title{font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:inherit}
    .nsf-part-group-copy{padding:.2rem .45rem;font-size:.85rem}
    .nsf-part-label-group{display:flex;flex-direction:column;gap:.25rem;padding:.4rem .5rem;background:rgba(0,0,0,.12);border-radius:.5rem}
    .nsf-part-label-title{font-size:.72rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;opacity:.85}
    .nsf-part-label-list{display:flex;flex-direction:column;gap:.2rem}
    .nsf-part-row{display:grid;grid-template-columns:1fr auto;gap:.5rem;align-items:center;padding:.15rem 0}
    .nsf-col{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .nsf-col-qty{text-align:right;font-variant-numeric:tabular-nums}
    .nsf-parts-info{display:flex;gap:.5rem;align-items:center;justify-content:center;background:rgba(0,0,0,.04);border:1px solid rgba(0,0,0,.08);padding:.5rem;border-radius:.375rem;font-size:.95rem}
    .nsf-info-icon{opacity:.8}
  `;
    document.head.appendChild(st);
  })();

  // ================================================================
  // PATCH END — Parts Reader
  // ================================================================

  const DEFAULT_FINDINGS_FILES=[
    'Shopguide_Findings.json',
    'Findings_Shopguide.json',
    'Findings_shopguide.json'
  ];
  const DATA_URL=DEFAULT_FINDINGS_FILES[0];
  const DATA_KEY='sf-data';
  const FINDINGS_PATH_KEY='sf-findings-path';
  const FINDINGS_EDITOR_PREFILL_STORAGE_KEY='shopguide-findings-prefill';
  const FINDINGS_EDITOR_EDIT_STORAGE_KEY='shopguide-findings-edit-target';
  const FINDINGS_EDITOR_UPDATE_EVENT='shopguide-findings-entry-updated';
  const STATE_KEY='sf-state';
  const STATE_KEY_SEPARATOR='::';
  const UNIT_BOARD_EVENT='unitBoard:update';
  const BOARD_DOC_KEY='module_data_v1';
  const ASPEN_DOC_KEY='nsf-aspen-doc';
  const ASPEN_LAST_MODIFIED_KEY='nsf-aspen-last-modified';
  const WATCH_INTERVAL=600;
  const FINDINGS_POLL_INTERVAL=5000;
  const ASPEN_POLL_INTERVAL=5000;
  const HISTORY_POLL_INTERVAL=5000;
  const SAVE_DEBOUNCE=250;
  const EVENT_AUTO_UPDATE_DEBOUNCE=600;
  const HISTORY_LIMIT=10;
  const EVENT_HISTORY_LIMIT=40;
  const EVENT_HISTORY_FILE_NAME='NewStandardFindings_History.json';
  const EVENT_HISTORY_STORAGE_KEY='nsf-event-history-cache';
  const STYLE_ID='nsf-styles';
  const ASPEN_BOARD_STATE_KEY='aspenUnitListState';
  let aspenDocMemory='';
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
  const ROUTINE_FINDINGS_STATUS_ENTRIES=[
    {
      key:'mishandling',
      label:'Mishandling',
      defaultDisplay:'Mishandling',
      matches:['mishandling','sru exchange mishandling']
    },
    {
      key:'missing parts',
      label:'Missing Parts',
      defaultDisplay:'Missing Parts',
      matches:['missing parts','sru exchange missing parts']
    },
    {
      key:'abnormal wear and tear',
      label:'Abnormal wear and tear',
      defaultDisplay:'abnormal wear and tear',
      matches:['abnormal wear and tear','sru exchange abnormal wear and tear']
    }
  ];
  const ROUTINE_FINDINGS_NOTICE_DEFAULT_TEMPLATE='{items} filled in the Non Routine tab.';
  const ROUTINE_FINDINGS_STATUS_MATCH_MAP=new Map(
    ROUTINE_FINDINGS_STATUS_ENTRIES.flatMap(entry=>
      entry.matches.map(match=>[match.toLowerCase(),entry.key])
    )
  );
  const ROUTINE_EDITOR_LINE_BREAK_TOKEN='__nsf_line_break__';
  const ROUTINE_EDITOR_PARAMETER_FAVORITES_KEY='nsf-routine-parameter-favorites';
  const ROUTINE_EDITOR_ACTIVE_TAB_KEY='nsf-routine-editor-active-tab';
  const OUTPUT_COLUMNS_STORAGE_KEY='nsf-output-columns';
  const OUTPUT_COLUMN_OPTIONS=[1,2];
  const DEFAULT_OUTPUT_COLUMN_COUNT=OUTPUT_COLUMN_OPTIONS[0];
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
    {key:'parts',label:'Bestellhinweis',getter:entry=>entry.partsText||''},
    {key:'times',label:'Arbeitszeiten',getter:entry=>entry.timesText||''},
    {key:'mods',label:'Modifikationen',getter:entry=>entry.modsText||''}
  ];

  const OUTPUT_DEFS=[
    {key:'findings',label:'Findings'},
    {key:'actions',label:'Actions'},
    {key:'routine',label:'Routine'},
    {key:'nonroutine',label:'Nonroutine'},
    {key:'parts',label:'Bestelliste'}
  ];

  const ROUTINE_EDITOR_PREVIEW_TAB_KEYS=OUTPUT_DEFS.filter(def=>def.key!=='parts').map(def=>def.key);
  const FREITEXT_PLACEHOLDERS=[
    {key:'findings',label:'{findings}',description:'Ausgewählte Findings'},
    {key:'nonroutine',label:'{nonroutine}',description:'Ausgewählte Nonroutine-Findings'},
    {key:'actions',label:'{actions}',description:'Ausgewählte Actions'},
    {key:'parts',label:'{parts}',description:'Ausgewählte Teilelisten'},
    {key:'routine',label:'{routine}',description:'Routine-Text'},
    {key:'times',label:'{times}',description:'Arbeitszeiten'},
    {key:'mods',label:'{mods}',description:'Modifikationen'},
    {key:'sn_in',label:'{sn_in}',description:'SRU Exchange Input'},
    {key:'sn_out',label:'{sn_out}',description:'SRU Exchange Output'},
    {key:'rfr',label:'{RfR}',description:'Removal-Grund'},
    {key:'reason',label:'{Reason}',description:'Pilot-Reason-Text'},
    {key:'label',label:'{label}',description:'Aktuelles Profil-Label'}
  ];

  function sanitizeRoutineEditorLabel(value){
    if(typeof value!=='string') return '';
    return value.trim().slice(0,120);
  }

  function sanitizePresetName(name){
    if(typeof name!=='string') return '';
    return name.trim().slice(0,80);
  }

  function createRoutinePresetId(){
    return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  }

  function normalizeOutputColumnCount(value){
    const numeric=Number.parseInt(String(value),10);
    return OUTPUT_COLUMN_OPTIONS.includes(numeric)?numeric:DEFAULT_OUTPUT_COLUMN_COUNT;
  }

  function loadOutputColumnCount(){
    try{
      const raw=localStorage.getItem(OUTPUT_COLUMNS_STORAGE_KEY);
      if(!raw) return DEFAULT_OUTPUT_COLUMN_COUNT;
      return normalizeOutputColumnCount(raw);
    }catch(err){
      console.warn('NSF: Spalteneinstellung konnte nicht geladen werden',err);
      return DEFAULT_OUTPUT_COLUMN_COUNT;
    }
  }

  function storeOutputColumnCount(count){
    try{
      const normalized=normalizeOutputColumnCount(count);
      localStorage.setItem(OUTPUT_COLUMNS_STORAGE_KEY,String(normalized));
    }catch(err){
      console.warn('NSF: Spalteneinstellung konnte nicht gespeichert werden',err);
    }
  }

  function loadAspenLastModified(){
    try{
      const raw=localStorage.getItem(ASPEN_LAST_MODIFIED_KEY);
      if(!raw) return null;
      const value=Number(raw);
      return Number.isFinite(value)?value:null;
    }catch(err){
      console.warn('NSF: Aspen-Zeitstempel konnte nicht geladen werden',err);
      return null;
    }
  }

  function storeAspenLastModified(value){
    try{
      if(typeof value!=='number'||!Number.isFinite(value)){
        localStorage.removeItem(ASPEN_LAST_MODIFIED_KEY);
        return;
      }
      localStorage.setItem(ASPEN_LAST_MODIFIED_KEY,String(value));
    }catch(err){
      console.warn('NSF: Aspen-Zeitstempel konnte nicht gespeichert werden',err);
    }
  }

  const textareaAutoResizeObservers=new WeakMap();

  function autoSizeTextarea(textarea){
    autoResizeTextarea(textarea);
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

  const FINDINGS_HANDLE_DB_NAME='NewStandardFindingsHandles';
  const FINDINGS_HANDLE_STORE_NAME='handles';
  const FINDINGS_HANDLE_KEY='nsf-findings-handle';
  const ASPEN_HANDLE_KEY='nsf-aspen-handle';

  async function openFindingsHandleStore(){
    if(typeof indexedDB==='undefined') return null;
    try{
      return await new Promise((resolve,reject)=>{
        const request=indexedDB.open(FINDINGS_HANDLE_DB_NAME,1);
        request.onupgradeneeded=()=>{
          const db=request.result;
          if(db&&!db.objectStoreNames.contains(FINDINGS_HANDLE_STORE_NAME)){
            db.createObjectStore(FINDINGS_HANDLE_STORE_NAME);
          }
        };
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error);
      });
    }catch(err){
      console.warn('[UnitBoard] IndexedDB für Findings-Dateien nicht verfügbar',err);
      return null;
    }
  }

  async function storeFindingsHandle(handle){
    if(!handle) return false;
    let db=null;
    try{
      db=await openFindingsHandleStore();
      if(!db) return false;
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(FINDINGS_HANDLE_STORE_NAME,'readwrite');
        tx.oncomplete=()=>resolve();
        tx.onerror=event=>{event?.preventDefault?.();reject(tx.error);};
        const request=tx.objectStore(FINDINGS_HANDLE_STORE_NAME).put(handle,FINDINGS_HANDLE_KEY);
        request.onerror=event=>{event?.preventDefault?.();reject(request.error);};
      });
      return true;
    }catch(err){
      console.warn('[UnitBoard] Findings-Dateihandle konnte nicht gespeichert werden',err);
      return false;
    }finally{
      try{db?.close();}catch{/* ignore */}
    }
  }

  async function loadStoredFindingsHandle(){
    let db=null;
    try{
      db=await openFindingsHandleStore();
      if(!db) return null;
      const handle=await new Promise((resolve,reject)=>{
        const tx=db.transaction(FINDINGS_HANDLE_STORE_NAME,'readonly');
        tx.onerror=event=>{event?.preventDefault?.();reject(tx.error);};
        const store=tx.objectStore(FINDINGS_HANDLE_STORE_NAME);
        const request=store.get(FINDINGS_HANDLE_KEY);
        request.onsuccess=()=>resolve(request.result||null);
        request.onerror=event=>{event?.preventDefault?.();reject(request.error);};
      });
      if(handle) console.log('[UnitBoard] Handle geladen');
      return handle||null;
    }catch(err){
      console.warn('[UnitBoard] Findings-Dateihandle konnte nicht gelesen werden',err);
      return null;
    }finally{
      try{db?.close();}catch{/* ignore */}
    }
  }

  async function storeAspenHandle(handle){
    if(!handle) return false;
    let db=null;
    try{
      db=await openFindingsHandleStore();
      if(!db) return false;
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(FINDINGS_HANDLE_STORE_NAME,'readwrite');
        tx.oncomplete=()=>resolve();
        tx.onerror=event=>{event?.preventDefault?.();reject(tx.error);};
        const request=tx.objectStore(FINDINGS_HANDLE_STORE_NAME).put(handle,ASPEN_HANDLE_KEY);
        request.onerror=event=>{event?.preventDefault?.();reject(request.error);};
      });
      return true;
    }catch(err){
      console.warn('[UnitBoard] Aspen-Dateihandle konnte nicht gespeichert werden',err);
      return false;
    }finally{
      try{db?.close();}catch{/* ignore */}
    }
  }

  async function loadStoredAspenHandle(){
    let db=null;
    try{
      db=await openFindingsHandleStore();
      if(!db) return null;
      const handle=await new Promise((resolve,reject)=>{
        const tx=db.transaction(FINDINGS_HANDLE_STORE_NAME,'readonly');
        tx.onerror=event=>{event?.preventDefault?.();reject(tx.error);};
        const store=tx.objectStore(FINDINGS_HANDLE_STORE_NAME);
        const request=store.get(ASPEN_HANDLE_KEY);
        request.onsuccess=()=>resolve(request.result||null);
        request.onerror=event=>{event?.preventDefault?.();reject(request.error);};
      });
      if(handle) console.log('[UnitBoard] Aspen-Handle geladen');
      return handle||null;
    }catch(err){
      console.warn('[UnitBoard] Aspen-Handle konnte nicht geladen werden',err);
      return null;
    }finally{
      try{db?.close();}catch{/* ignore */}
    }
  }

  async function clearStoredAspenHandle(){
    let db=null;
    try{
      db=await openFindingsHandleStore();
      if(!db) return;
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(FINDINGS_HANDLE_STORE_NAME,'readwrite');
        tx.oncomplete=()=>resolve();
        tx.onerror=event=>{event?.preventDefault?.();reject(tx.error);};
        const request=tx.objectStore(FINDINGS_HANDLE_STORE_NAME).delete(ASPEN_HANDLE_KEY);
        request.onerror=event=>{event?.preventDefault?.();reject(request.error);};
      });
    }catch(err){
      console.warn('[UnitBoard] Aspen-Handle konnte nicht gelöscht werden',err);
    }finally{
      try{db?.close();}catch{/* ignore */}
    }
  }

  async function clearStoredFindingsHandle(){
    let db=null;
    try{
      db=await openFindingsHandleStore();
      if(!db) return false;
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(FINDINGS_HANDLE_STORE_NAME,'readwrite');
        tx.oncomplete=()=>resolve();
        tx.onerror=event=>{event?.preventDefault?.();reject(tx.error);};
        const request=tx.objectStore(FINDINGS_HANDLE_STORE_NAME).delete(FINDINGS_HANDLE_KEY);
        request.onerror=event=>{event?.preventDefault?.();reject(request.error);};
      });
      return true;
    }catch(err){
      console.warn('[UnitBoard] Findings-Dateihandle konnte nicht entfernt werden',err);
      return false;
    }finally{
      try{db?.close();}catch{/* ignore */}
    }
  }

  async function queryHandlePermission(handle){
    if(!handle?.queryPermission) return 'granted';
    try{
      return await handle.queryPermission({mode:'readwrite'});
    }catch(err){
      console.warn('[UnitBoard] Permission-Abfrage fehlgeschlagen',err);
      return 'denied';
    }
  }

  async function ensurePermission(handle){
    if(!handle?.queryPermission) return 'granted';
    let state='denied';
    try{
      state=await handle.queryPermission({mode:'readwrite'});
    }catch(err){
      console.warn('[UnitBoard] Permission-Abfrage fehlgeschlagen',err);
      return 'denied';
    }
    if(state==='granted') return 'granted';
    if(state==='denied') return 'denied';
    try{
      const requested=await handle.requestPermission({mode:'readwrite'});
      return requested==='granted'?'granted':'denied';
    }catch(err){
      console.warn('[UnitBoard] Permission-Anfrage fehlgeschlagen',err);
      return 'denied';
    }
  }

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
  let currentBlockShopDragType='';

  function getRoutineEditorTabKey(tabKey){
    return ROUTINE_EDITOR_PREVIEW_TAB_KEYS.includes(tabKey)?tabKey:'routine';
  }

  function loadRoutineEditorActiveTab(){
    try{
      const raw=localStorage.getItem(ROUTINE_EDITOR_ACTIVE_TAB_KEY);
      if(!raw) return 'routine';
      return getRoutineEditorTabKey(String(raw));
    }catch(err){
      console.warn('NSF: Aktiver Routine-Tab konnte nicht geladen werden',err);
      return 'routine';
    }
  }

  function storeRoutineEditorActiveTab(tabKey){
    try{
      const key=getRoutineEditorTabKey(tabKey);
      localStorage.setItem(ROUTINE_EDITOR_ACTIVE_TAB_KEY,key);
    }catch(err){
      console.warn('NSF: Aktiver Routine-Tab konnte nicht gespeichert werden',err);
    }
  }

  function getRoutineEditorTabConfig(tabKey){
    const key=getRoutineEditorTabKey(tabKey);
    return ROUTINE_EDITOR_TAB_CONFIG[key]||ROUTINE_EDITOR_TAB_CONFIG.routine;
  }

  function getRoutineEditorBaseBlocksForTab(tabKey){
    const config=getRoutineEditorTabConfig(tabKey);
    return Array.isArray(config.baseBlocks)?config.baseBlocks:ROUTINE_EDITOR_BASE_BLOCKS_ROUTINE;
  }

  function createDefaultFreitextTemplates(){
    const templates={};
    ROUTINE_EDITOR_PREVIEW_TAB_KEYS.forEach(key=>{
      templates[key]='';
    });
    return templates;
  }

  function createDefaultRoutineFindingsStatusConfig(){
    return {
      template:ROUTINE_FINDINGS_NOTICE_DEFAULT_TEMPLATE,
      statuses:ROUTINE_FINDINGS_STATUS_ENTRIES.map(entry=>({
        key:entry.key,
        label:entry.label,
        display:entry.defaultDisplay
      }))
    };
  }

  function normalizeRoutineFindingsStatusConfig(raw){
    const base=createDefaultRoutineFindingsStatusConfig();
    if(!raw||typeof raw!=='object') return base;
    const template=typeof raw.template==='string'?raw.template:base.template;
    const list=Array.isArray(raw.statuses)?raw.statuses:Array.isArray(raw.items)?raw.items:[];
    const entryMap=new Map();
    list.forEach(entry=>{
      if(!entry||typeof entry!=='object') return;
      const key=typeof entry.key==='string'?entry.key:'';
      if(!key) return;
      entryMap.set(key,{
        key,
        label:typeof entry.label==='string'?entry.label:'',
        display:typeof entry.display==='string'?entry.display:''
      });
    });
    return {
      template,
      statuses:ROUTINE_FINDINGS_STATUS_ENTRIES.map(entry=>{
        const saved=entryMap.get(entry.key);
        const display=clean(saved?.display)||entry.defaultDisplay;
        return {
          key:entry.key,
          label:entry.label,
          display
        };
      })
    };
  }

  function normalizeFreitextTemplates(raw){
    const templates=createDefaultFreitextTemplates();
    if(typeof raw==='string'){
      templates.routine=raw;
      return templates;
    }
    if(!raw||typeof raw!=='object'){
      return templates;
    }
    Object.keys(raw).forEach(key=>{
      const resolved=getRoutineEditorTabKey(key);
      if(!resolved) return;
      const value=raw[key];
      templates[resolved]=typeof value==='string'?value:'';
    });
    return templates;
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
    return {
      tabs,
      freitextTemplates:createDefaultFreitextTemplates(),
      routineStatusNotice: createDefaultRoutineFindingsStatusConfig()
    };
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
      const typeRaw=typeof entry.type==='string'?entry.type:'';
      const type=typeRaw==='aspen'
        ?'aspen'
        :typeRaw==='linebreak'
          ?'linebreak'
          :typeRaw==='aspenfield'
            ?'aspenfield'
            :'text';
      const label=sanitizeRoutineEditorLabel(entry.label||'');
      const aspenField=typeof entry.aspenField==='string'?entry.aspenField.trim():'';
      const parameterKey=typeof entry.parameterKey==='string'?entry.parameterKey.trim():'';
      const valueRaw=typeof entry.value==='string'?entry.value:'';
      const contentRaw=typeof entry.content==='string'?entry.content:'';
      const normalizedLines=type==='linebreak'
        ?['']
        :type==='aspenfield'
          ?(valueRaw? [valueRaw]: (lines.length?lines:['']))
          :(lines.length?lines:['']);
      const content=type==='text'
        ?(contentRaw||normalizedLines[0]||'')
        :'';
      const value=type==='aspenfield'
        ?(valueRaw||normalizedLines[0]||'')
        :'';
      customBlocks.push({
        id,
        type,
        label,
        aspenField,
        parameterKey:type==='text'?parameterKey:'',
        lines:normalizedLines,
        content:type==='text'?content:'',
        value:type==='aspenfield'?value:''
      });
    });
    base.customBlocks=customBlocks;
    if(!Array.isArray(base.customBlocks)){
      base.customBlocks=[];
    }
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
    let freitextSource=null;
    if(raw&&typeof raw==='object'){
      if(raw.freitextTemplates&&typeof raw.freitextTemplates==='object'){
        freitextSource=raw.freitextTemplates;
      }else if(typeof raw.freitextTemplate==='string'){
        freitextSource={routine:raw.freitextTemplate};
      }
    }else if(typeof raw==='string'){
      freitextSource=raw;
    }
    normalized.freitextTemplates=normalizeFreitextTemplates(freitextSource);
    if(raw&&typeof raw==='object'){
      normalized.routineStatusNotice=normalizeRoutineFindingsStatusConfig(raw.routineStatusNotice);
    }else{
      normalized.routineStatusNotice=createDefaultRoutineFindingsStatusConfig();
    }
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
      const type=block&&block.type==='aspen'
        ?'aspen'
        :block&&block.type==='linebreak'
          ?'linebreak'
          :block&&block.type==='aspenfield'
            ?'aspenfield'
            :'text';
      const normalizedLines=type==='linebreak'
        ?['']
        :type==='aspenfield'
          ?(block&&typeof block.value==='string'&&block.value!==''?[block.value]:lines.length?lines:[''])
          :(lines.length?lines:['']);
      return {
        id,
        type,
        label:block&&block.label?sanitizeRoutineEditorLabel(block.label):'',
        aspenField:block&&typeof block.aspenField==='string'?block.aspenField:'',
        parameterKey:type==='text'&&block&&typeof block.parameterKey==='string'?block.parameterKey:'',
        lines:normalizedLines,
        content:type==='text'&&block&&typeof block.content==='string'?block.content:'',
        value:type==='aspenfield'&&block&&typeof block.value==='string'?block.value:''
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
      const templates=normalized.freitextTemplates&&typeof normalized.freitextTemplates==='object'
        ?normalized.freitextTemplates
        :createDefaultFreitextTemplates();
      const templatePayload={};
      ROUTINE_EDITOR_PREVIEW_TAB_KEYS.forEach(key=>{
        const value=typeof templates[key]==='string'?templates[key]:'';
        if(value){
          templatePayload[key]=value;
        }
      });
      if(Object.keys(templatePayload).length){
        payload.freitextTemplates=templatePayload;
      }
      payload.routineStatusNotice=normalizeRoutineFindingsStatusConfig(normalized.routineStatusNotice);
      localStorage.setItem(ROUTINE_EDITOR_STORAGE_KEY,JSON.stringify(payload));
    }catch(err){
      console.warn('NSF: Routine-Editor konnte nicht gespeichert werden',err);
    }
  }

  function debugRenderRoutineEditorBlockCall(renderer,block,tabKey){
    if(typeof renderer!=='function'){
      console.warn('NSF: Renderer für Routine-Editor-Block nicht verfügbar',block,tabKey);
      return null;
    }
    return renderer(block,tabKey);
  }

  function renderRoutineEditorBlock(block,tabKey){
    const currentBlock=block&&typeof block==='object'?block:{};
    const blockType=typeof currentBlock.type==='string'?currentBlock.type:'';
    const resolvedTabKey=function(){
      const normalized=typeof getRoutineEditorTabKey==='function'
        ?getRoutineEditorTabKey(tabKey)
        :tabKey;
      if(typeof normalized==='string'&&normalized.trim()) return normalized;
      return 'routine';
    }();

    if(blockType==='text'){
      const wrapper=document.createElement('div');
      wrapper.className='nsf-editor-block nsf-textblock';
      const label=document.createElement('label');
      label.textContent=currentBlock.label||'Textfeld';
      const textarea=document.createElement('textarea');
      textarea.value=typeof currentBlock.value==='string'?currentBlock.value:'';
      textarea.placeholder='Text…';
      textarea.dataset.minRows='2';
      textarea.addEventListener('input',()=>{
        const nextValue=textarea.value;
        currentBlock.value=nextValue;
        try{
          const state=normalizeRoutineEditorState(loadRoutineEditorState());
          if(!state||!state.tabs) return;
          const tabState=normalizeRoutineEditorTabState(state.tabs[resolvedTabKey],resolvedTabKey);
          const customBlocks=Array.isArray(tabState.customBlocks)?tabState.customBlocks:[];
          const target=customBlocks.find(entry=>entry&&entry.id===currentBlock.id);
          if(target){
            target.value=nextValue;
          }
          tabState.customBlocks=customBlocks;
          state.tabs[resolvedTabKey]=tabState;
          storeRoutineEditorState(state);
        }catch(err){
          console.warn('NSF: Custom-Block konnte nicht gespeichert werden',err,currentBlock);
        }
      });
      ensureTextareaAutoResize(textarea);
      wrapper.appendChild(label);
      wrapper.appendChild(textarea);
      console.log('[renderRoutineEditorBlock] rendered '+blockType+' block:',currentBlock);
      return wrapper;
    }

    if(blockType==='linebreak'){
      const wrapper=document.createElement('div');
      wrapper.className='nsf-editor-block nsf-linebreak';
      const hr=document.createElement('hr');
      wrapper.appendChild(hr);
      console.log('[renderRoutineEditorBlock] rendered '+blockType+' block:',currentBlock);
      return wrapper;
    }

    if(blockType==='aspenfield'){
      const wrapper=document.createElement('div');
      wrapper.className='nsf-editor-block nsf-aspenfield';
      const label=document.createElement('label');
      label.textContent=currentBlock.label||'Aspen-Feld';
      const select=document.createElement('select');
      const optionsList=[
        {value:'',label:'Bitte wählen'},
        {value:'Option 1',label:'Option 1'},
        {value:'Option 2',label:'Option 2'}
      ];
      optionsList.forEach(option=>{
        const opt=document.createElement('option');
        opt.value=option.value;
        opt.textContent=option.label;
        select.appendChild(opt);
      });
      select.value=typeof currentBlock.value==='string'?currentBlock.value:'';
      wrapper.appendChild(label);
      wrapper.appendChild(select);
      select.addEventListener('change',()=>{
        const nextValue=select.value;
        currentBlock.value=nextValue;
        try{
          const state=normalizeRoutineEditorState(loadRoutineEditorState());
          if(!state||!state.tabs) return;
          const tabState=normalizeRoutineEditorTabState(state.tabs[resolvedTabKey],resolvedTabKey);
          const customBlocks=Array.isArray(tabState.customBlocks)?tabState.customBlocks:[];
          const target=customBlocks.find(entry=>entry&&entry.id===currentBlock.id);
          if(target){
            target.value=nextValue;
          }
          tabState.customBlocks=customBlocks;
          state.tabs[resolvedTabKey]=tabState;
          storeRoutineEditorState(state);
        }catch(err){
          console.warn('NSF: Custom-Block konnte nicht gespeichert werden',err,currentBlock);
        }
      });
      console.log('[renderRoutineEditorBlock] rendered '+blockType+' block:',currentBlock);
      return wrapper;
    }

    const fallback=document.createElement('div');
    fallback.className='nsf-editor-block';
    return fallback;
  }

  function addCustomBlock(tabKey,type='text',options={}){
    const opts=options&&typeof options==='object'?{...options}:{};
    const trigger=typeof Element!=='undefined'&&opts.trigger instanceof Element?opts.trigger:null;
    if(trigger){
      delete opts.trigger;
      let match=null;
      instances.forEach(instance=>{
        if(match||!instance||typeof instance.addCustomBlock!=='function') return;
        const overlay=instance.routineEditorOverlay;
        if(overlay&&overlay.contains(trigger)){
          match=instance;
          return;
        }
        const root=instance.root;
        if(root&&typeof root.contains==='function'&&root.contains(trigger)){
          match=instance;
        }
      });
      if(match&&typeof match.addCustomBlock==='function'){
        try{return match.addCustomBlock(tabKey,type,opts);}catch(err){console.warn('NSF: Custom-Block konnte nicht über Instanz hinzugefügt werden',err);}
      }
    }else if('trigger' in opts){
      delete opts.trigger;
    }
    return createCustomBlock(tabKey,type,opts);
  }

  function renderRoutineEditor(){
    instances.forEach(instance=>{
      if(!instance) return;
      try{
        if(typeof instance.ensureRoutineEditorState==='function'){
          instance.ensureRoutineEditorState();
        }
        const overlayOpen=instance.routineEditorOverlay&&instance.routineEditorOverlay.classList.contains('open');
        if(overlayOpen&&typeof instance.renderRoutineEditorOverlayContent==='function'){
          instance.renderRoutineEditorOverlayContent();
        }else if(!overlayOpen&&typeof instance.refreshRoutineEditorPreview==='function'){
          instance.refreshRoutineEditorPreview();
        }
        if(typeof instance.evaluateRoutineEditorPresetMatch==='function'){
          instance.evaluateRoutineEditorPresetMatch();
        }
      }catch(err){console.warn('NSF: Routine-Editor Aktualisierung fehlgeschlagen',err);}
    });
  }

  function clearAllRoutineEditorDropIndicators(){
    instances.forEach(instance=>{
      if(!instance||typeof instance.clearRoutineEditorDropIndicators!=='function') return;
      try{instance.clearRoutineEditorDropIndicators();}catch{}
    });
  }

  function createCustomBlock(tabKey,type='text',options={}){
    const opts=options&&typeof options==='object'?{...options}:{};
    const targetTab=getRoutineEditorTabKey(tabKey);
    let state;
    try{
      state=normalizeRoutineEditorState(loadRoutineEditorState());
    }catch(err){
      console.warn('NSF: Routine-Editor Zustand konnte nicht geladen werden',err);
      state=createDefaultRoutineEditorState();
    }
    if(!state||typeof state!=='object'||!state.tabs){
      state=createDefaultRoutineEditorState();
    }
    const tabState=normalizeRoutineEditorTabState(state.tabs[targetTab],targetTab);
    const config=getRoutineEditorTabConfig(targetTab);
    const allowAspen=config&&config.allowAspen!==false;
    const requestedType=typeof type==='string'?type:'';
    const blockType=requestedType==='linebreak'
      ?'linebreak'
      :requestedType==='aspen'&&allowAspen
        ?'aspen'
        :requestedType==='aspenfield'&&allowAspen
          ?'aspenfield'
          :'text';
    const blockId=createCustomSectionId();
    const customKey=`${ROUTINE_EDITOR_CUSTOM_PREFIX}${blockId}`;
    const baseOrder=Array.isArray(tabState.order)?tabState.order.filter(entry=>entry!==customKey):[];
    let desiredIndex=opts.insertIndex;
    if(typeof desiredIndex==='string'&&desiredIndex.trim()!==''){
      const parsed=Number.parseInt(desiredIndex,10);
      if(!Number.isNaN(parsed)) desiredIndex=parsed;
    }
    const insertIndex=Number.isFinite(desiredIndex)
      ?Math.max(0,Math.min(desiredIndex,baseOrder.length))
      :baseOrder.length;
    const customBlocks=Array.isArray(tabState.customBlocks)?tabState.customBlocks.slice():[];
    const precedingCustomCount=baseOrder.slice(0,insertIndex).reduce((count,key)=>{
      if(typeof key!=='string'||!key.startsWith(ROUTINE_EDITOR_CUSTOM_PREFIX)) return count;
      const customId=key.slice(ROUTINE_EDITOR_CUSTOM_PREFIX.length);
      const existingIndex=customBlocks.findIndex(entry=>entry&&entry.id===customId);
      return existingIndex>=0?count+1:count;
    },0);
    const providedLabel=typeof opts.label==='string'?sanitizeRoutineEditorLabel(opts.label):'';
    const block={
      id:blockId,
      type:blockType,
      label:providedLabel,
      aspenField:'',
      parameterKey:'',
      lines:[''],
      content:'',
      value:''
    };
    if(Array.isArray(opts.lines)&&opts.lines.length){
      block.lines=opts.lines.map(value=>typeof value==='string'?value:'');
    }
    if(blockType==='text'){
      block.parameterKey=typeof opts.parameterKey==='string'?opts.parameterKey:'';
      block.content=typeof opts.content==='string'?opts.content:'';
      if(!block.content&&block.lines.length){
        block.content=typeof block.lines[0]==='string'?block.lines[0]:'';
      }
      if(!block.lines.length){
        block.lines=[block.content||''];
      }
    }else if(blockType==='aspen'){
      block.content='';
    }else if(blockType==='aspenfield'){
      block.value=typeof opts.value==='string'?opts.value:'';
      if(!block.value&&block.lines.length){
        block.value=typeof block.lines[0]==='string'?block.lines[0]:'';
      }
      if(!block.lines.length){
        block.lines=[block.value||''];
      }
    }
    const updatedOrder=baseOrder.slice();
    updatedOrder.splice(insertIndex,0,customKey);
    const updatedCustomBlocks=customBlocks.slice();
    updatedCustomBlocks.splice(precedingCustomCount,0,block);
    tabState.customBlocks=updatedCustomBlocks;
    tabState.order=updatedOrder;
    state.tabs[targetTab]=tabState;
    storeRoutineEditorState(state);
    try{
      const overlay=document.querySelector('.nsf-editor-overlay.open');
      const container=overlay?.querySelector('.nsf-editor-tab.active .nsf-custom-list')
        ||overlay?.querySelector('.nsf-editor-tab.active .nsf-blocks');
      const newBlock=Array.isArray(tabState.customBlocks)
        ?tabState.customBlocks.find(entry=>entry&&entry.id===blockId)
        :null;
      if(overlay&&container&&newBlock&&typeof renderRoutineEditorBlock==='function'){
        const blockEl=debugRenderRoutineEditorBlockCall(renderRoutineEditorBlock,newBlock,targetTab);
        const isDomNode=typeof Node!=='undefined'
          ?blockEl instanceof Node
          :blockEl&&typeof blockEl.nodeType==='number';
        if(blockEl&&isDomNode){
          container.appendChild(blockEl);
        }
      }
    }catch(err){
      console.warn('NSF: Custom-Block konnte nicht direkt angezeigt werden',err);
    }
    try{
      renderRoutineEditor();
    }catch(err){
      console.warn('NSF: Routine-Editor konnte nach Custom-Block-Aktualisierung nicht gerendert werden',err);
    }
    instances.forEach(instance=>{
      if(!instance) return;
      try{
        const overlay=instance.routineEditorOverlay;
        if(!overlay||!overlay.classList||!overlay.classList.contains('open')) return;
        if(typeof instance.renderRoutineEditorOverlayContent==='function'){
          instance.renderRoutineEditorOverlayContent(targetTab);
        }
      }catch(err){
        console.warn('NSF: Routine-Editor Overlay konnte nicht aktualisiert werden',err);
      }
    });
    return {id:blockId,key:customKey,type:blockType,tabKey:targetTab};
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
      type:block&&block.type==='aspen'
        ?'aspen'
        :block&&block.type==='linebreak'
          ?'linebreak'
          :block&&block.type==='aspenfield'
            ?'aspenfield'
            :'text',
      label:block&&block.label?sanitizeRoutineEditorLabel(block.label):'',
      aspenField:block&&typeof block.aspenField==='string'?block.aspenField:'',
      parameterKey:block&&block.type==='text'&&typeof block.parameterKey==='string'?block.parameterKey:'',
      lines:Array.isArray(block&&block.lines)?block.lines.slice():[''],
      content:block&&block.type==='text'&&typeof block.content==='string'?block.content:'',
      value:block&&block.type==='aspenfield'&&typeof block.value==='string'?block.value:''
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
    const clone={tabs:{},freitextTemplates:{}};
    ROUTINE_EDITOR_PREVIEW_TAB_KEYS.forEach(key=>{
      clone.tabs[key]=cloneRoutineEditorTabState(normalized.tabs[key],key);
    });
    const sourceTemplates=normalized.freitextTemplates&&typeof normalized.freitextTemplates==='object'
      ?normalized.freitextTemplates
      :createDefaultFreitextTemplates();
    ROUTINE_EDITOR_PREVIEW_TAB_KEYS.forEach(key=>{
      clone.freitextTemplates[key]=typeof sourceTemplates[key]==='string'?sourceTemplates[key]:'';
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

  function loadRoutineEditorParameterFavorites(){
    try{
      const raw=localStorage.getItem(ROUTINE_EDITOR_PARAMETER_FAVORITES_KEY);
      if(!raw) return [];
      const parsed=JSON.parse(raw);
      if(!Array.isArray(parsed)) return [];
      const seen=new Set();
      const favorites=[];
      parsed.forEach(entry=>{
        if(typeof entry!=='string') return;
        const key=entry.trim();
        if(!key||seen.has(key)) return;
        seen.add(key);
        favorites.push(key);
      });
      return favorites;
    }catch(err){
      console.warn('NSF: Routine-Parameter-Favoriten konnten nicht geladen werden',err);
      return [];
    }
  }

  function storeRoutineEditorParameterFavorites(favorites){
    try{
      const seen=new Set();
      const payload=Array.isArray(favorites)?favorites.map(entry=>{
        if(typeof entry!=='string') return '';
        const key=entry.trim();
        if(!key||seen.has(key)) return '';
        seen.add(key);
        return key;
      }).filter(Boolean):[];
      localStorage.setItem(ROUTINE_EDITOR_PARAMETER_FAVORITES_KEY,JSON.stringify(payload));
    }catch(err){
      console.warn('NSF: Routine-Parameter-Favoriten konnten nicht gespeichert werden',err);
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
    for(const key of ROUTINE_EDITOR_PREVIEW_TAB_KEYS){
      const valueA=stateA.freitextTemplates&&typeof stateA.freitextTemplates[key]==='string'
        ?stateA.freitextTemplates[key]
        :'';
      const valueB=stateB.freitextTemplates&&typeof stateB.freitextTemplates[key]==='string'
        ?stateB.freitextTemplates[key]
        :'';
      if(valueA!==valueB) return false;
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
      .nsf-header-section.collapsed .nsf-header-bar{flex-wrap:wrap;align-items:flex-start;}
      .nsf-header-section.collapsed .nsf-header-toggle{order:1;}
      .nsf-header-toggle{background:rgba(255,255,255,0.12);border:none;border-radius:0.45rem;width:1.6rem;height:1.6rem;display:flex;align-items:center;justify-content:center;color:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-header-toggle:hover{background:rgba(255,255,255,0.22);transform:translateY(-1px);}
      .nsf-header-summary{flex:1;display:flex;align-items:center;flex-wrap:wrap;gap:0.55rem;font-weight:600;}
      .nsf-header-section.collapsed .nsf-header-summary{order:2;width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:0.35rem 0.6rem;align-items:center;}
      .nsf-header-summary-item{white-space:nowrap;opacity:0.9;}
      .nsf-header-debug{flex-basis:100%;font-size:0.7rem;font-weight:500;opacity:0.65;line-height:1.2;white-space:normal;display:flex;flex-direction:column;gap:0.1rem;}
      .nsf-header-debug-line{display:block;}
      .nsf-header-section.collapsed .nsf-header-debug{grid-column:1/-1;flex-basis:auto;}
      .nsf-selection-section{padding:0;gap:0;overflow:visible;position:relative;}
      .nsf-selection-section.nsf-selection-collapsed{overflow:hidden;}
      .nsf-selection-header{display:flex;align-items:center;gap:0.55rem;padding:0.55rem 0.7rem;border-bottom:1px solid rgba(255,255,255,0.08);flex-wrap:wrap;}
      .nsf-selection-header:focus-within{outline:2px solid rgba(59,130,246,0.45);outline-offset:2px;}
      .nsf-selection-heading{display:flex;align-items:center;gap:0.4rem;font-size:0.95rem;font-weight:600;}
      .nsf-selection-add{padding:0.3rem 0.55rem;font-size:0.85rem;}
      .nsf-selection-add:disabled{opacity:0.5;cursor:not-allowed;}
      .nsf-selection-summary{margin-left:auto;display:flex;align-items:center;flex-wrap:wrap;gap:0.35rem;font-size:0.78rem;line-height:1.2;}
      .nsf-selection-summary-chip{background:rgba(148,163,184,0.16);border-radius:999px;padding:0.2rem 0.55rem;font-weight:500;white-space:nowrap;}
      .nsf-selection-summary-more{opacity:0.75;font-weight:500;}
      .nsf-selection-summary-empty{opacity:0.6;font-style:italic;}
      .nsf-selection-actions{display:flex;align-items:center;gap:0.4rem;}
      .nsf-custom-finding-btn{background:rgba(59,130,246,0.18);border:1px solid rgba(96,165,250,0.4);border-radius:0.7rem;padding:0.35rem 0.75rem;font:inherit;font-size:0.82rem;color:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-custom-finding-btn:hover{background:rgba(59,130,246,0.3);transform:translateY(-1px);}
      .nsf-custom-finding-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
      .nsf-selection-body{display:flex;flex-direction:column;gap:0.6rem;padding:0.7rem 0.85rem;overflow:visible;}
      .nsf-selection-grid{display:flex;flex-direction:column;gap:0.6rem;}
      .nsf-selection-section.nsf-selection-collapsed .nsf-selection-body{display:none;}
      .nsf-selection-section.nsf-selection-collapsed .nsf-selection-summary{margin-left:0;}
      .nsf-selection-section.nsf-selection-collapsed .nsf-selection-header{border-bottom:none;}
      .nsf-removal-panel{background:rgba(15,23,42,0.18);border-radius:0.9rem;padding:0.6rem 0.75rem;display:flex;flex-direction:column;gap:0.45rem;}
      .nsf-removal-header{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;}
      .nsf-removal-title{font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;opacity:0.75;}
      .nsf-removal-chip{background:rgba(148,163,184,0.18);border-radius:999px;padding:0.18rem 0.6rem;font-size:0.75rem;font-weight:600;letter-spacing:0.01em;}
      .nsf-removal-toggle{margin-left:auto;background:transparent;border:1px solid rgba(255,255,255,0.2);color:inherit;border-radius:999px;padding:0.2rem 0.65rem;font-size:0.72rem;cursor:pointer;transition:background 0.15s ease,border-color 0.15s ease;}
      .nsf-removal-toggle:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.35);}
      .nsf-removal-toggle:disabled{opacity:0.45;cursor:not-allowed;}
      .nsf-removal-actions{display:flex;flex-wrap:wrap;gap:0.45rem;}
      .nsf-removal-panel.nsf-removal-collapsed .nsf-removal-actions{display:none;}
      .nsf-removal-btn{background:rgba(255,255,255,0.14);border:none;border-radius:0.65rem;padding:0.35rem 0.7rem;font:inherit;font-size:0.78rem;color:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-removal-btn:hover{background:rgba(255,255,255,0.24);transform:translateY(-1px);}
      .nsf-removal-btn:disabled{opacity:0.45;cursor:not-allowed;background:rgba(255,255,255,0.12);transform:none;}
      .nsf-reason-panel{background:rgba(15,23,42,0.16);border-radius:0.9rem;padding:0.6rem 0.75rem;display:flex;flex-direction:column;gap:0.45rem;}
      .nsf-reason-title{font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;opacity:0.75;}
      .nsf-reason-textarea{min-height:4.5rem;}
      @media (min-width:1100px){
        .nsf-selection-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:start;}
      }
      .nsf-exchange-panel{background:rgba(15,23,42,0.16);border-radius:0.9rem;padding:0.6rem 0.75rem;display:flex;flex-direction:column;gap:0.5rem;}
      .nsf-exchange-title{font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;opacity:0.75;}
      .nsf-exchange-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.5rem;}
      .nsf-exchange-field{display:flex;flex-direction:column;gap:0.25rem;}
      .nsf-exchange-label{font-size:0.7rem;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;opacity:0.7;}
      .nsf-exchange-input{padding:0.45rem 0.6rem;border-radius:0.6rem;border:1px solid rgba(148,163,184,0.45);background:rgba(15,23,42,0.18);color:inherit;font:inherit;font-size:0.85rem;}
      .nsf-exchange-input:disabled{opacity:0.5;cursor:not-allowed;}
      .nsf-header-actions{display:flex;align-items:center;gap:0.35rem;}
      .nsf-header-section.collapsed .nsf-header-actions{order:3;width:100%;justify-content:flex-end;flex-wrap:wrap;}
      .nsf-header-history{display:flex;align-items:center;gap:0.35rem;}
      .nsf-header-history-label{font-size:0.7rem;opacity:0.7;display:inline-flex;align-items:center;gap:0.25rem;}
      .nsf-history-warning{width:0.45rem;height:0.45rem;border-radius:999px;background:rgba(248,113,113,0.95);display:inline-flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(248,113,113,0.25);flex:0 0 auto;}
      .nsf-header-history-select{background:rgba(15,23,42,0.55);border:1px solid rgba(148,163,184,0.35);border-radius:0.55rem;padding:0.2rem 0.45rem;color:inherit;font:inherit;font-size:0.72rem;max-width:220px;}
      .nsf-header-history-select:disabled{opacity:0.6;cursor:not-allowed;}
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
      .nsf-menu-history{padding:0.35rem 0.55rem;display:flex;flex-direction:column;gap:0.35rem;}
      .nsf-menu-history-row{display:flex;align-items:center;gap:0.35rem;}
      .nsf-event-list{display:flex;flex-direction:column;gap:0.25rem;}
      .nsf-event-item{display:flex;align-items:center;gap:0.35rem;padding:0.25rem 0.3rem;border-radius:0.5rem;transition:background 0.15s ease;}
      .nsf-event-item:hover{background:rgba(59,130,246,0.16);}
      .nsf-event-select{flex:1;background:transparent;border:none;color:inherit;font:inherit;font-size:0.75rem;text-align:left;cursor:pointer;display:flex;align-items:center;gap:0.4rem;padding:0;}
      .nsf-event-select.is-active{font-weight:600;}
      .nsf-event-meta{opacity:0.7;font-size:0.68rem;}
      .nsf-event-delete{background:transparent;border:none;color:inherit;font:inherit;font-size:0.8rem;opacity:0;cursor:pointer;transition:opacity 0.15s ease,transform 0.15s ease;}
      .nsf-event-item:hover .nsf-event-delete{opacity:0.85;transform:translateY(-1px);}
      .nsf-event-delete:focus-visible{opacity:0.85;}
      .nsf-event-empty{font-size:0.72rem;opacity:0.65;}
      .nsf-menu-select{flex:1;min-width:0;background:rgba(15,23,42,0.6);border:1px solid rgba(148,163,184,0.35);border-radius:0.55rem;padding:0.3rem 0.5rem;color:inherit;font:inherit;font-size:0.78rem;}
      .nsf-menu-select:disabled{opacity:0.6;cursor:not-allowed;}
      .nsf-menu-add{background:rgba(59,130,246,0.2);border:1px solid rgba(59,130,246,0.35);border-radius:0.55rem;padding:0.3rem 0.5rem;color:inherit;font:inherit;font-size:0.85rem;cursor:pointer;}
      .nsf-menu-add:hover{background:rgba(59,130,246,0.32);}
      .nsf-menu-add:disabled{opacity:0.5;cursor:not-allowed;}
      .nsf-menu-item{background:transparent;border:none;border-radius:0.6rem;padding:0.45rem 0.75rem;color:inherit;font:inherit;text-align:left;cursor:pointer;display:flex;align-items:center;gap:0.5rem;}
      .nsf-menu-item:hover{background:rgba(59,130,246,0.18);}
      .nsf-menu-item:disabled{opacity:0.5;cursor:not-allowed;background:transparent;}
      .nsf-editor-menu-label{padding:0.35rem 0.55rem;font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;opacity:0.6;display:flex;align-items:center;gap:0.35rem;}
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
      .nsf-input-controls{display:flex;align-items:center;gap:0.5rem;}
      .nsf-status-select{flex:1 1 0;min-width:0;max-width:40%;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border:1px solid rgba(15,23,42,0.15);border-radius:0.65rem;padding:0.5rem 0.6rem;font:inherit;}
      .nsf-status-select:disabled{opacity:0.6;cursor:not-allowed;background:rgba(255,255,255,0.65);}
      .nsf-input-field{position:relative;display:flex;align-items:center;width:100%;gap:0.35rem;flex:0 0 60%;max-width:60%;}
      .nsf-input-row.locked{background:rgba(15,23,42,0.28);}
      .nsf-remove-btn{position:absolute;top:50%;right:0.45rem;transform:translateY(-50%);background:transparent;border:1px solid rgba(148,163,184,0.45);border-radius:999px;color:inherit;width:2rem;height:2rem;display:flex;align-items:center;justify-content:center;font-size:1rem;cursor:pointer;opacity:0.9;transition:background 0.15s ease,border-color 0.15s ease,opacity 0.15s ease,transform 0.15s ease;}
      .nsf-remove-btn:hover{background:rgba(148,163,184,0.16);border-color:rgba(148,163,184,0.7);opacity:1;transform:translateY(-50%) scale(1.05);}
      .nsf-edit-btn{position:absolute;top:50%;right:2.7rem;transform:translateY(-50%);background:transparent;border:1px solid rgba(148,163,184,0.45);border-radius:999px;color:inherit;width:2rem;height:2rem;display:flex;align-items:center;justify-content:center;font-size:1rem;cursor:pointer;opacity:0.9;transition:background 0.15s ease,border-color 0.15s ease,opacity 0.15s ease,transform 0.15s ease;}
      .nsf-edit-btn:hover{background:rgba(148,163,184,0.16);border-color:rgba(148,163,184,0.7);opacity:1;transform:translateY(-50%) scale(1.05);}
      .nsf-input-row:not(.locked) .nsf-edit-btn{display:none;}
      .nsf-remove-btn svg,.nsf-edit-btn svg{width:1rem;height:1rem;pointer-events:none;}
      .nsf-input{width:100%;border:none;border-radius:0.65rem;padding:0.55rem 5rem 0.55rem 0.7rem;font:inherit;color:var(--sidebar-module-card-text,#111);background:var(--sidebar-module-card-bg,#fff);}
      .nsf-input:disabled{opacity:0.75;background:rgba(255,255,255,0.65);cursor:not-allowed;}
      .nsf-input::placeholder{color:rgba(107,114,128,0.8);}
      .nsf-suggestions-toggle{position:absolute;top:50%;right:2.7rem;transform:translateY(-50%);background:rgba(59,130,246,0.18);border:none;border-radius:999px;width:2rem;height:2rem;display:flex;align-items:center;justify-content:center;color:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease,opacity 0.15s ease;}
      .nsf-suggestions-toggle:hover{background:rgba(59,130,246,0.28);transform:translateY(-50%) scale(1.05);}
      .nsf-suggestions-toggle.is-active{background:rgba(59,130,246,0.35);}
      .nsf-suggestions-toggle:disabled{opacity:0.5;cursor:not-allowed;transform:translateY(-50%);background:rgba(59,130,246,0.18);}
      .nsf-suggestions-toggle svg{width:1rem;height:1rem;pointer-events:none;}
      .nsf-input-row.locked .nsf-suggestions-toggle{display:none;}
      .nsf-suggestions{position:absolute;top:calc(100% - 0.2rem);left:0;right:0;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border-radius:0.75rem;box-shadow:0 12px 28px rgba(15,23,42,0.4);padding:0.35rem;display:none;max-height:220px;overflow:auto;z-index:180;}
      .nsf-input-row.show-suggestions .nsf-suggestions{display:block;}
      .nsf-suggestion{padding:0.35rem 0.55rem;border-radius:0.6rem;cursor:pointer;display:flex;align-items:center;gap:0.35rem;}
      .nsf-suggestion:hover,.nsf-suggestion.active{background:rgba(59,130,246,0.12);}
      .nsf-suggestion-label{font-weight:600;font-size:0.9rem;}
      .nsf-custom-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.72);backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;padding:3rem 1.5rem;z-index:420;}
      .nsf-custom-overlay.open{display:flex;}
      .nsf-custom-modal{background:rgba(15,23,42,0.96);border-radius:1rem;border:1px solid rgba(148,163,184,0.35);box-shadow:0 24px 64px rgba(15,23,42,0.55);max-width:920px;width:100%;max-height:calc(100vh - 6rem);overflow:auto;padding:1.5rem;display:flex;flex-direction:column;gap:1rem;color:#e2e8f0;}
      .nsf-custom-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;}
      .nsf-custom-title{font-size:1.1rem;font-weight:700;}
      .nsf-custom-close{background:rgba(248,113,113,0.2);border:none;border-radius:999px;width:2.2rem;height:2.2rem;color:rgba(248,113,113,0.95);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:1.1rem;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-custom-close:hover{background:rgba(248,113,113,0.32);transform:scale(1.05);}
      .nsf-custom-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0.8rem;}
      .nsf-custom-field{display:flex;flex-direction:column;gap:0.35rem;}
      .nsf-custom-label{font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;opacity:0.75;}
      .nsf-custom-input,.nsf-custom-textarea,.nsf-custom-select{background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border:none;border-radius:0.65rem;padding:0.5rem 0.65rem;font:inherit;}
      .nsf-custom-textarea{min-height:4rem;resize:vertical;}
      .nsf-custom-select{appearance:auto;}
      .nsf-custom-parts{display:flex;flex-direction:column;gap:0.6rem;background:rgba(15,23,42,0.18);border-radius:0.9rem;padding:0.75rem;}
      .nsf-custom-parts-header{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;}
      .nsf-custom-part-row{display:grid;grid-template-columns:1fr 120px auto;gap:0.5rem;align-items:center;}
      .nsf-custom-part-remove{background:rgba(248,113,113,0.2);border:none;border-radius:0.6rem;width:2rem;height:2rem;color:rgba(248,113,113,0.95);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;}
      .nsf-custom-actions{display:flex;flex-wrap:wrap;gap:0.6rem;justify-content:flex-end;}
      .nsf-custom-note{font-size:0.78rem;opacity:0.8;line-height:1.3;}
      .nsf-custom-divider{height:1px;background:rgba(148,163,184,0.25);}
      .nsf-findings-editor-modal{max-width:1400px;}
      .nsf-findings-editor-container{min-height:70vh;}
      .nsf-suggestion-finding{font-size:0.85rem;opacity:0.85;}
      .nsf-suggestion-action{font-size:0.8rem;opacity:0.65;}
      .nsf-empty{opacity:0.75;font-style:italic;}
      .nsf-outputs-layout{display:flex;flex-direction:column;gap:1.25rem;}
      .nsf-outputs-layout.has-columns{flex-direction:row;flex-wrap:wrap;align-items:flex-start;gap:1.25rem;}
      .nsf-outputs{display:flex;flex-direction:column;gap:0.75rem;width:100%;}
      .nsf-outputs-column{flex:1 1 420px;min-width:280px;}
      .nsf-outputs-full{flex-basis:100%;}
      .nsf-custom-slot{display:flex;flex-direction:column;gap:0.55rem;}
      .nsf-custom-slot-empty{display:none;}
      .nsf-custom-slot-dragging{display:flex;}
      .nsf-custom-slot-dragging .nsf-custom-list{min-height:1.35rem;border:1px dashed rgba(148,163,184,0.35);border-radius:0.65rem;padding:0.3rem;background:rgba(15,23,42,0.25);}
      .nsf-custom-list{display:flex;flex-direction:column;gap:0.55rem;width:100%;}
      .nsf-custom-block{position:relative;background:rgba(15,23,42,0.22);border-radius:0.85rem;padding:0.65rem 0.75rem 0.75rem;display:flex;flex-direction:column;gap:0.55rem;cursor:default;}
      .nsf-custom-block.dragging{opacity:0.85;box-shadow:0 12px 28px rgba(15,23,42,0.45);}
      .nsf-custom-handle{align-self:flex-start;font-size:1.15rem;line-height:1;opacity:0.65;cursor:grab;user-select:none;}
      .nsf-custom-handle:active{cursor:grabbing;}
      .nsf-custom-textarea{width:100%;border:none;border-radius:0.65rem;padding:0.6rem 0.75rem;font:inherit;color:var(--sidebar-module-card-text,#111);background:var(--sidebar-module-card-bg,#fff);resize:none;min-height:0;box-shadow:inset 0 0 0 1px rgba(15,23,42,0.1);overflow-x:hidden;overflow-y:hidden;}
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
      .nsf-block-shop{display:flex;flex-direction:column;gap:0.55rem;border-top:1px solid rgba(148,163,184,0.25);padding-top:0.65rem;margin-top:0.4rem;}
      .nsf-block-shop-title{font-weight:700;font-size:0.85rem;letter-spacing:0.04em;text-transform:uppercase;opacity:0.8;}
      .nsf-block-shop-list{display:grid;gap:0.5rem;}
      .nsf-block-shop-item{display:flex;align-items:center;gap:0.55rem;background:rgba(59,130,246,0.16);border:1px solid rgba(96,165,250,0.45);border-radius:0.75rem;padding:0.55rem 0.7rem;color:rgba(191,219,254,0.96);font:inherit;cursor:grab;user-select:none;transition:background 0.15s ease,transform 0.15s ease,box-shadow 0.15s ease;}
      .nsf-block-shop-item:hover{background:rgba(59,130,246,0.26);transform:translateY(-1px);box-shadow:0 10px 24px rgba(59,130,246,0.25);}
      .nsf-block-shop-item:active{cursor:grabbing;}
      .nsf-block-shop-item.is-disabled{opacity:0.45;cursor:not-allowed;transform:none;box-shadow:none;}
      .nsf-block-shop-item.is-disabled:hover{background:rgba(59,130,246,0.16);transform:none;}
      .nsf-block-shop-item-icon{font-size:1.05rem;line-height:1;}
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
      .nsf-editor-status{display:flex;flex-direction:column;gap:0.6rem;border-top:1px solid rgba(148,163,184,0.25);padding-top:0.75rem;}
      .nsf-editor-status.is-hidden{display:none;}
      .nsf-editor-status-title{font-weight:700;font-size:0.9rem;}
      .nsf-editor-status-hint{font-size:0.75rem;opacity:0.75;line-height:1.4;}
      .nsf-editor-status-field{display:flex;flex-direction:column;gap:0.35rem;}
      .nsf-editor-status-label{font-size:0.72rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75;}
      .nsf-editor-status-input{background:rgba(15,23,42,0.6);border:1px solid rgba(148,163,184,0.35);border-radius:0.6rem;padding:0.4rem 0.55rem;color:#e2e8f0;font:inherit;}
      .nsf-editor-status-input:focus{outline:2px solid rgba(59,130,246,0.45);outline-offset:2px;}
      .nsf-editor-status-grid{display:flex;flex-direction:column;gap:0.45rem;}
      .nsf-editor-status-actions{display:flex;gap:0.5rem;}
      .nsf-editor-status-reset{background:rgba(148,163,184,0.18);border:1px solid rgba(148,163,184,0.35);border-radius:0.6rem;padding:0.4rem 0.7rem;color:#e2e8f0;font:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-editor-status-reset:hover{background:rgba(148,163,184,0.28);transform:translateY(-1px);}
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
      .nsf-editor-dropzone{width:100%;min-height:2.75rem;border:1px dashed rgba(96,165,250,0.6);border-radius:0.75rem;padding:0.55rem 0.75rem;background:rgba(59,130,246,0.12);display:flex;align-items:center;justify-content:center;color:rgba(191,219,254,0.85);font-size:0.85rem;text-align:center;transition:background 0.15s ease,transform 0.15s ease,box-shadow 0.15s ease;}
      .nsf-editor-insert.is-active .nsf-editor-dropzone{background:rgba(59,130,246,0.22);transform:translateY(-1px);box-shadow:0 12px 28px rgba(59,130,246,0.25);}
      .nsf-editor-insert.is-disabled .nsf-editor-dropzone{opacity:0.4;}
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
      .nsf-editor-linebreak{border:0;height:1px;background:linear-gradient(90deg,rgba(59,130,246,0),rgba(59,130,246,0.7),rgba(59,130,246,0));margin:1rem 0;opacity:0.85;}
      .nsf-editor-field{display:flex;flex-direction:column;align-items:stretch;gap:0.35rem;}
      .nsf-editor-field-label{font-weight:600;font-size:0.95rem;color:#1f2937;}
      .nsf-editor-aspenfield-input{width:100%;padding:0.45rem 0.6rem;border-radius:0.5rem;border:1px solid rgba(15,23,42,0.2);font-size:0.95rem;background:#fff;}
      .nsf-editor-aspenfield-input:focus{outline:2px solid rgba(59,130,246,0.45);outline-offset:2px;border-color:rgba(59,130,246,0.65);}
      .nsf-editor-input{flex:1;border:none;border-radius:0.6rem;padding:0.45rem 0.55rem;font:inherit;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);resize:none;min-height:2.4rem;line-height:1.4;overflow-x:hidden;overflow-y:hidden;}
      .nsf-editor-input::placeholder{color:rgba(107,114,128,0.65);}
      .nsf-editor-block[data-editable='0'] .nsf-editor-input{background:rgba(15,23,42,0.25);color:#cbd5f5;cursor:default;resize:none;}
      .nsf-editor-input:read-only{cursor:default;}
      .nsf-editor-remove{background:rgba(248,113,113,0.18);border:none;border-radius:0.55rem;width:1.8rem;height:1.8rem;display:inline-flex;align-items:center;justify-content:center;color:rgba(248,113,113,0.92);cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-editor-remove:hover{background:rgba(248,113,113,0.3);transform:scale(1.05);}
      .nsf-editor-aspen-controls{display:flex;flex-wrap:wrap;gap:0.5rem;align-items:flex-start;}
      .nsf-editor-aspen-picker{position:relative;flex:1;min-width:220px;display:flex;flex-direction:column;gap:0.35rem;}
      .nsf-editor-aspen-input-wrapper{position:relative;flex:1;min-width:0;display:flex;align-items:stretch;}
      .nsf-editor-aspen-picker.is-disabled{opacity:0.65;}
      .nsf-editor-aspen-input{flex:1 1 auto;min-width:0;background:rgba(15,23,42,0.85);border:1px solid rgba(148,163,184,0.55);border-radius:0.65rem;padding:0.45rem 2.65rem 0.45rem 0.65rem;font:inherit;color:#f8fafc;}
      .nsf-editor-aspen-input:focus{outline:2px solid rgba(96,165,250,0.6);outline-offset:2px;}
      .nsf-editor-aspen-input::placeholder{color:rgba(226,232,240,0.55);}
      .nsf-editor-aspen-toggle{position:absolute;top:50%;right:0.55rem;transform:translateY(-50%);width:2.1rem;height:2.1rem;border-radius:999px;border:1px solid rgba(148,163,184,0.55);background:rgba(15,23,42,0.7);color:#e2e8f0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.15s ease,border-color 0.15s ease,box-shadow 0.15s ease;}
      .nsf-editor-aspen-toggle:hover{background:rgba(30,41,59,0.9);}
      .nsf-editor-aspen-toggle:focus-visible{outline:2px solid rgba(96,165,250,0.6);outline-offset:2px;}
      .nsf-editor-aspen-toggle.is-active{background:rgba(59,130,246,0.35);border-color:rgba(96,165,250,0.7);box-shadow:0 0 0 2px rgba(96,165,250,0.25);}
      .nsf-editor-aspen-toggle svg{width:0.95rem;height:0.95rem;pointer-events:none;}
      .nsf-editor-aspen-toggle:disabled{cursor:default;opacity:0.6;pointer-events:none;}
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
      .nsf-freitext-container{display:flex;flex-direction:column;gap:0.75rem;}
      .nsf-freitext-editor-wrapper{display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-start;}
      .nsf-freitext-input-column{flex:1 1 320px;display:flex;flex-direction:column;gap:0.6rem;min-width:0;}
      .nsf-freitext-label{font-weight:600;font-size:0.9rem;opacity:0.85;}
      #freitext-editor{width:100%;min-height:200px;border-radius:0.75rem;border:1px solid rgba(148,163,184,0.35);padding:0.65rem;font:inherit;line-height:1.45;resize:vertical;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);}
      #freitext-editor:focus{outline:2px solid rgba(59,130,246,0.45);outline-offset:2px;border-color:rgba(59,130,246,0.65);}
      .nsf-freitext-keyword-sidebar{flex:0 0 220px;display:flex;flex-direction:column;gap:0.6rem;padding:0.75rem;border-radius:0.75rem;border:1px solid rgba(148,163,184,0.35);background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);box-shadow:0 10px 18px rgba(15,23,42,0.08);}
      .nsf-freitext-keyword-title{font-weight:600;font-size:0.9rem;opacity:0.85;}
      .nsf-freitext-keyword-hint{font-size:0.8rem;line-height:1.3;opacity:0.75;}
      .nsf-freitext-keyword-list{display:flex;flex-direction:column;gap:0.5rem;}
      .nsf-freitext-keyword-item{display:flex;flex-direction:column;gap:0.25rem;}
      .nsf-freitext-keyword-button{display:flex;align-items:center;justify-content:center;padding:0.4rem 0.6rem;border-radius:0.65rem;border:1px solid rgba(148,163,184,0.5);background:rgba(241,245,249,0.85);color:inherit;font:inherit;font-size:0.85rem;font-weight:600;cursor:pointer;transition:background 0.2s ease,border-color 0.2s ease,transform 0.15s ease;}
      .nsf-freitext-keyword-button:hover{background:rgba(226,232,240,0.95);border-color:rgba(148,163,184,0.9);transform:translateY(-1px);}
      .nsf-freitext-keyword-button:active{transform:translateY(0);}
      .nsf-freitext-keyword-description{font-size:0.78rem;line-height:1.2;opacity:0.65;}
      .nsf-editor-save{background:linear-gradient(135deg,rgba(59,130,246,0.85),rgba(96,165,250,0.9));color:#fff;border:none;border-radius:0.8rem;padding:0.65rem 1.4rem;font:inherit;font-weight:700;cursor:pointer;box-shadow:0 18px 32px rgba(59,130,246,0.35);transition:transform 0.15s ease,box-shadow 0.15s ease;}
      .nsf-editor-save:hover{transform:translateY(-1px);box-shadow:0 20px 38px rgba(59,130,246,0.45);}
      .nsf-editor-save:active{transform:translateY(0);box-shadow:0 16px 28px rgba(59,130,246,0.4);}
      .nsf-editor-menu{position:fixed;z-index:410;background:rgba(15,23,42,0.95);border-radius:0.85rem;border:1px solid rgba(148,163,184,0.35);box-shadow:0 18px 36px rgba(15,23,42,0.55);padding:0.35rem;display:flex;flex-direction:column;min-width:170px;}
      .nsf-editor-menu-btn{background:transparent;border:none;border-radius:0.65rem;padding:0.5rem 0.75rem;font:inherit;color:#f8fafc;text-align:left;cursor:pointer;transition:background 0.15s ease;}
      .nsf-editor-menu-btn:hover{background:rgba(59,130,246,0.22);}
      .nsf-editor-menu-note{padding:0.15rem 0.55rem 0.35rem;font-size:0.8rem;opacity:0.82;line-height:1.35;}
      .nsf-editor-menu-note strong{color:#fff;}
      .nsf-output{background:rgba(15,23,42,0.18);border-radius:0.9rem;padding:0.6rem 0.75rem;display:flex;flex-direction:column;gap:0.45rem;min-height:0;width:100%;}
      .nsf-output-header{display:flex;align-items:center;justify-content:space-between;font-weight:600;}
      .nsf-copy-btn{background:rgba(255,255,255,0.16);border:none;border-radius:0.6rem;padding:0.3rem 0.5rem;color:inherit;font:inherit;cursor:pointer;transition:background 0.15s ease;display:flex;align-items:center;gap:0.3rem;}
      .nsf-copy-btn:hover{background:rgba(255,255,255,0.28);}
      .nsf-copy-btn.copied{background:rgba(16,185,129,0.35);}
      .nsf-copy-btn .nsf-copy-feedback{font-size:0.85rem;opacity:0;transition:opacity 0.15s ease;}
      .nsf-copy-btn.copied .nsf-copy-feedback{opacity:1;}
      .nsf-textarea{flex:1;min-height:6.5rem;max-height:28rem;border:none;border-radius:0.75rem;padding:0.6rem 0.65rem;font:inherit;resize:vertical;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);overflow-x:hidden;overflow-y:hidden;}
      .nsf-textarea:hover,.nsf-textarea:focus,.nsf-custom-textarea:hover,.nsf-custom-textarea:focus,.nsf-editor-input:hover,.nsf-editor-input:focus{overflow-y:auto;}
      .nsf-output-textarea{resize:none;}
      .nsf-output-textarea.copied{animation:nsf-output-flash 0.3s ease;}
      .nsf-textarea:disabled{opacity:0.6;background:rgba(255,255,255,0.5);cursor:not-allowed;}
      @keyframes nsf-output-flash{
        0%{box-shadow:inset 0 0 0 1px rgba(15,23,42,0.12);background:var(--sidebar-module-card-bg,#fff);}
        40%{box-shadow:inset 0 0 0 2px var(--module-layer-3-module-border,rgba(45,212,191,0.28));background:var(--module-layer-3-module-bg,rgba(45,212,191,0.08));}
        100%{box-shadow:inset 0 0 0 1px rgba(15,23,42,0.12);background:var(--sidebar-module-card-bg,#fff);}
      }
      .nsf-note{font-size:0.8rem;opacity:0.75;}
      .nsf-alert{background:rgba(248,113,113,0.2);border-radius:0.75rem;padding:0.5rem 0.75rem;font-size:0.85rem;}
      .nsf-inline-info{font-size:0.8rem;opacity:0.7;}
      .nsf-hidden{display:none !important;}
      .nsf-parts-container{display:flex;flex-direction:column;gap:0.6rem;}
      .nsf-pntext-header{font-weight:600;margin-bottom:0.25rem;}
      .nsf-bestellliste{display:flex;flex-direction:column;gap:0.25rem;}
      .nsf-part-group{display:flex;flex-direction:column;gap:0.35rem;padding:0.2rem 0;}
      .nsf-part-group + .nsf-part-group{border-top:1px solid currentColor;padding-top:0.5rem;}
      .nsf-part-group-header{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;}
      .nsf-part-group-title{font-size:0.78rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:inherit;}
      .nsf-part-group-copy{padding:0.2rem 0.45rem;font-size:0.85rem;}
      .nsf-part-label-group{display:flex;flex-direction:column;gap:0.25rem;padding:0.4rem 0.5rem;background:rgba(0,0,0,0.12);border-radius:0.5rem;}
      .nsf-part-label-title{font-size:0.72rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;opacity:0.85;}
      .nsf-part-label-list{display:flex;flex-direction:column;gap:0.2rem;}
      .nsf-part-row{display:grid;grid-template-columns:1fr auto;gap:0.5rem;align-items:center;padding:0.15rem 0;}
      .nsf-col{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .nsf-col-qty{text-align:right;font-variant-numeric:tabular-nums;}
      .nsf-parts-info{display:flex;gap:0.5rem;align-items:center;justify-content:center;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);padding:0.5rem;border-radius:0.375rem;font-size:0.95rem;}
      .nsf-info-icon{opacity:0.8;}
      .nsf-part-context-menu{position:fixed;z-index:420;background:rgba(15,23,42,0.95);border-radius:0.75rem;border:1px solid rgba(148,163,184,0.35);box-shadow:0 18px 36px rgba(15,23,42,0.55);padding:0.35rem;display:flex;flex-direction:column;min-width:220px;}
      .nsf-part-context-menu-btn{background:transparent;border:none;border-radius:0.6rem;padding:0.5rem 0.75rem;font:inherit;color:#f8fafc;text-align:left;cursor:pointer;transition:background 0.15s ease;}
      .nsf-part-context-menu-btn:hover{background:rgba(59,130,246,0.22);}
      .nsf-part-context-menu-btn:disabled{opacity:0.45;cursor:not-allowed;}
      .nsf-part-context-menu-divider{height:1px;background:rgba(148,163,184,0.25);margin:0.25rem 0;}
      .nsf-json-modal-overlay{position:fixed;inset:0;background:rgba(17,24,39,0.55);display:flex;align-items:center;justify-content:center;padding:2.5rem;z-index:9999;backdrop-filter:blur(2px);}
      .nsf-json-modal{background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border-radius:1rem;box-shadow:0 25px 60px rgba(15,23,42,0.45);max-width:min(960px,95vw);max-height:90vh;display:flex;flex-direction:column;width:100%;overflow:hidden;}
      .nsf-json-modal-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid rgba(148,163,184,0.35);gap:1rem;}
      .nsf-json-modal-title{font-size:1.1rem;font-weight:600;margin:0;}
      .nsf-json-modal-close{background:none;border:none;color:inherit;font:inherit;font-size:1.5rem;cursor:pointer;line-height:1;padding:0.25rem;border-radius:0.5rem;}
      .nsf-json-modal-close:hover{background:rgba(100,116,139,0.15);}
      .nsf-json-modal-content{padding:1.25rem 1.5rem;overflow:auto;display:flex;flex-direction:column;gap:1rem;}
      .nsf-json-modal-entry{background:rgba(148,163,184,0.12);border-radius:0.85rem;padding:1rem;display:flex;flex-direction:column;gap:0.75rem;}
      .nsf-json-modal-entry-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;}
      .nsf-json-modal-entry-title{margin:0;font-size:1rem;font-weight:600;}
      .nsf-json-modal-entry-meta{font-size:0.85rem;color:rgba(71,85,105,0.95);}
      .nsf-json-modal-code{margin:0;background:rgba(15,23,42,0.85);color:#f8fafc;font-size:0.8rem;line-height:1.5;border-radius:0.65rem;padding:1rem;overflow:auto;max-height:45vh;}
      .nsf-json-modal-copy{flex:0 0 auto;background:rgba(255,255,255,0.16);border:none;border-radius:0.6rem;padding:0.35rem 0.65rem;color:inherit;font:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:0.35rem;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-json-modal-copy:disabled{opacity:0.45;cursor:not-allowed;transform:none;background:rgba(255,255,255,0.12);}
      .nsf-json-modal-copy:hover:not(:disabled){background:rgba(255,255,255,0.28);transform:translateY(-1px);}
      .nsf-json-modal-copy.copied{background:rgba(16,185,129,0.35);}
      .nsf-json-modal-empty{font-size:0.95rem;color:rgba(71,85,105,0.95);}
      .nsf-status-modal-overlay{position:fixed;inset:0;background:rgba(17,24,39,0.55);display:flex;align-items:center;justify-content:center;padding:2.5rem;z-index:9998;backdrop-filter:blur(2px);}
      .nsf-status-modal{background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border-radius:1rem;box-shadow:0 25px 60px rgba(15,23,42,0.45);max-width:min(720px,95vw);max-height:90vh;display:flex;flex-direction:column;width:100%;overflow:hidden;}
      .nsf-status-modal-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid rgba(148,163,184,0.35);gap:1rem;}
      .nsf-status-modal-title{font-size:1.05rem;font-weight:600;margin:0;}
      .nsf-status-modal-close{background:none;border:none;color:inherit;font:inherit;font-size:1.5rem;cursor:pointer;line-height:1;padding:0.25rem;border-radius:0.5rem;}
      .nsf-status-modal-close:hover{background:rgba(100,116,139,0.15);}
      .nsf-status-modal-content{padding:1.25rem 1.5rem;overflow:auto;display:flex;flex-direction:column;gap:1rem;}
      .nsf-status-modal-section{display:flex;flex-direction:column;gap:0.5rem;}
      .nsf-status-modal-label{font-size:0.8rem;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;opacity:0.7;}
      .nsf-status-modal-hint{font-size:0.8rem;opacity:0.7;line-height:1.4;}
      .nsf-status-modal-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0.75rem;}
      .nsf-status-modal-field{display:flex;flex-direction:column;gap:0.35rem;}
      .nsf-status-modal-input{border:1px solid rgba(148,163,184,0.45);border-radius:0.6rem;padding:0.45rem 0.6rem;font:inherit;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);}
      .nsf-status-modal-input:focus{outline:2px solid rgba(59,130,246,0.35);outline-offset:2px;}
      .nsf-status-modal-actions{display:flex;gap:0.65rem;justify-content:flex-end;flex-wrap:wrap;margin-top:0.25rem;}
      .nsf-status-modal-button{background:rgba(59,130,246,0.16);border:1px solid rgba(59,130,246,0.35);border-radius:0.65rem;padding:0.45rem 0.9rem;font:inherit;color:inherit;cursor:pointer;transition:background 0.15s ease,transform 0.15s ease;}
      .nsf-status-modal-button:hover{background:rgba(59,130,246,0.24);transform:translateY(-1px);}
      .nsf-status-modal-button.secondary{background:rgba(148,163,184,0.16);border-color:rgba(148,163,184,0.35);}
      .nsf-status-modal-button.secondary:hover{background:rgba(148,163,184,0.26);}
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
    updateValue(ASPEN_LAST_MODIFIED_KEY);
    updateValue(DATA_KEY);
    updateValue(STATE_KEY);
    updateValue(FINDINGS_PATH_KEY);
    window.addEventListener('storage',e=>{
      if(!e) return;
      if(e.key===BOARD_DOC_KEY||e.key===ASPEN_DOC_KEY||e.key===ASPEN_LAST_MODIFIED_KEY||e.key===DATA_KEY||e.key===STATE_KEY||e.key===FINDINGS_PATH_KEY){
        lastValues[e.key]=localStorage.getItem(e.key);
        scheduleAll();
      }
    });
    window.addEventListener(UNIT_BOARD_EVENT,()=>scheduleAll());
    window.addEventListener(FINDINGS_EDITOR_UPDATE_EVENT,event=>{
      const detail=event&&event.detail?event.detail:null;
      for(const inst of instances){
        if(inst&&typeof inst.handleFindingsEditorUpdate==='function'){
          inst.handleFindingsEditorUpdate(detail);
        }
      }
    });
    setInterval(()=>{
      const boardDoc=localStorage.getItem(BOARD_DOC_KEY);
      if(boardDoc!==lastValues[BOARD_DOC_KEY]){lastValues[BOARD_DOC_KEY]=boardDoc;scheduleAll();}
      const aspenDoc=localStorage.getItem(ASPEN_DOC_KEY);
      if(aspenDoc!==lastValues[ASPEN_DOC_KEY]){lastValues[ASPEN_DOC_KEY]=aspenDoc;scheduleAll();}
      const aspenStamp=localStorage.getItem(ASPEN_LAST_MODIFIED_KEY);
      if(aspenStamp!==lastValues[ASPEN_LAST_MODIFIED_KEY]){lastValues[ASPEN_LAST_MODIFIED_KEY]=aspenStamp;scheduleAll();}
      const data=localStorage.getItem(DATA_KEY);
      if(data!==lastValues[DATA_KEY]){lastValues[DATA_KEY]=data;scheduleAll();}
      const state=localStorage.getItem(STATE_KEY);
      if(state!==lastValues[STATE_KEY]){lastValues[STATE_KEY]=state;scheduleAll();}
      const findingsPath=localStorage.getItem(FINDINGS_PATH_KEY);
      if(findingsPath!==lastValues[FINDINGS_PATH_KEY]){lastValues[FINDINGS_PATH_KEY]=findingsPath;scheduleAll();}
    },WATCH_INTERVAL);
  }

  function clean(value){return value==null?'':String(value).trim();}

  function nsfIsObj(v){ return v && typeof v === 'object' && !Array.isArray(v); }

  function setAspenDocPayload(payload){
    if(typeof payload!=='string'||!payload){
      aspenDocMemory='';
      return;
    }
    try{
      localStorage.setItem(ASPEN_DOC_KEY,payload);
      aspenDocMemory='';
    }catch(err){
      const isQuota=err&&typeof err==='object'&&(
        err.name==='QuotaExceededError'
        || err.name==='NS_ERROR_DOM_QUOTA_REACHED'
        || err.code===22
      );
      if(isQuota){
        console.warn('NSF: Aspen-Daten zu groß für localStorage, nutze Speicher im Tab.');
        aspenDocMemory=payload;
        try{localStorage.removeItem(ASPEN_DOC_KEY);}catch{/* ignore */}
      }else{
        throw err;
      }
    }
  }

  function formatTimeShort(value){
    if(typeof value!=='number') return '–';
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return '–';
    return date.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
  }

  // PATCH START: NSF Local persistence helpers
  function nsfStorageKeyForSelection(selection,resolved){
    // stabil & robust gegen UI-Änderungen
    const pn=(resolved&&resolved.part)||(selection&&selection.part)||'';
    const lbl=(resolved&&resolved.label)||(selection&&selection.label)||'';
    const fnd=(resolved&&resolved.finding)||(selection&&selection.finding)||'';
    const key=['findingParts',String(pn).trim().toUpperCase(),String(lbl).trim().toLowerCase(),String(fnd).trim().toLowerCase()]
      .map(s=>s.replace(/\s+/g,' ').trim())
      .join(':');
    return key;
  }
  function nsfLoadRowsFromLocal(key){
    try{
      if(typeof localStorage==='undefined') return null;
      const raw=localStorage.getItem(key);
      if(!raw) return null;
      const parsed=JSON.parse(raw);
      if(!parsed||!Array.isArray(parsed)) return null;
      // mark as local origin
      return parsed.map(r=>{
        if(r&&typeof r==='object'&&Array.isArray(r.rows)){
          const group={...r};
          group.rows=r.rows.map(row=>Object.assign({},row,{_origin:'local'}));
          return group;
        }
        if(r&&typeof r==='object') return Object.assign({},r,{_origin:'local'});
        return r;
      });
    }catch{return null;}
  }
  function nsfSaveRowsToLocal(key,rows){
    try{
      if(typeof localStorage==='undefined') return;
      if(!Array.isArray(rows)||!rows.length) return;
      // store only the minimal row shape we render with
      const compact=rows.map(r=>{
        if(r&&typeof r==='object'&&Array.isArray(r.rows)){
          return {
            title:r.title,
            rows:r.rows.map(row=>({
              pnLabel:row.pnLabel,pnValue:row.pnValue,
              partLabel:row.partLabel,partValue:row.partValue,
              quantityLabel:row.quantityLabel,quantityValue:row.quantityValue
            }))
          };
        }
        return {
          pnLabel:r.pnLabel,pnValue:r.pnValue,
          partLabel:r.partLabel,partValue:r.partValue,
          quantityLabel:r.quantityLabel,quantityValue:r.quantityValue
        };
      });
      localStorage.setItem(key,JSON.stringify(compact));
    }catch{/* ignore */}
  }
  // PATCH END

  // === NSF DEBUG TOGGLE =========================================================
  const NSF_DEBUG=(()=>{
    try{
      // enable via: localStorage.setItem('nsf-debug','1')
      return typeof localStorage!=='undefined'&&localStorage.getItem('nsf-debug')==='1';
    }catch{return false;}
  })();

  function nsfDebugLog(...args){
    if(!NSF_DEBUG) return;
    try{console.groupCollapsed('[NSF][debug]',...args);console.groupEnd();}
    catch{/* ignore */}
  }

  function nsfDebugDir(label,obj){
    if(!NSF_DEBUG) return;
    try{
      console.groupCollapsed('[NSF][debug]',label);
      console.log('type:',typeof obj,Array.isArray(obj)?'(array)':'');
      if(obj&&typeof obj==='object'){
        const keys=Object.keys(obj);
        console.log('keys:',keys);
        console.log('preview:',JSON.stringify(obj,(k,v)=>(typeof v==='string'&&v.length>140?v.slice(0,140)+'…':v),2));
      }else{
        console.log('value:',obj);
      }
      console.groupEnd();
    }catch{/* ignore */}
  }

  // quick helper to stringify short safely
  function nsfShort(v){
    try{
      if(v==null) return String(v);
      if(typeof v==='string') return v.length>120?v.slice(0,120)+'…':v;
      if(typeof v==='object') return JSON.stringify(v).slice(0,140)+'…';
      return String(v);
    }catch{return '[unserializable]';}
  }
  function stripNonRoutineFindingPrefix(value){
    const text=clean(value);
    if(!text) return '';
    return text.replace(/^\s*non\s*routine\s*finding:\s*/i,'').trim();
  }

  function sanitizeNonRoutineOutput(value){
    const text=clean(value);
    if(!text) return '';
    const lines=text.split(/\r?\n/);
    const filtered=lines.filter(line=>{
      const trimmed=line.trim();
      if(!trimmed) return false;
      return !/^(label|part)\s*[:=]/i.test(trimmed);
    });
    return filtered.join('\n').trim();
  }
  function pushUniqueLine(list,set,value){
    const text=clean(value);
    if(!text) return;
    const key=text.toLowerCase();
    if(set.has(key)) return;
    set.add(key);
    list.push(text);
  }
  function extractRowIndex(label){
    const text=clean(label);
    if(!text) return null;
    const match=text.match(/(\d+)/);
    if(!match) return null;
    const num=parseInt(match[1],10);
    return Number.isNaN(num)?null:num;
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
    const result=[];
    const seen=new Set();
    const pushValue=value=>{
      const normalized=normalizePart(value);
      if(!normalized||seen.has(normalized)) return;
      seen.add(normalized);
      result.push(normalized);
    };
    if(entry&&Array.isArray(entry.partNumbers)){
      entry.partNumbers.forEach(pushValue);
    }
    if(entry){
      pushValue(entry.partNumber);
      pushValue(entry.part);
      nsfGetAppliesTo(entry).forEach(pushValue);
    }
    return result;
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
    parts:[
      'parts','ersatzteile','replacementparts','replacedparts','teile','bestellliste','spares','components',
      'bestelltext','bestell_text','bestell-hinweis','bestellhinweis','pntext','pn_text','pn text','ordertext','order_text',
      'order text','ordertitle','order_title','order title'
    ],
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

  function cloneDeep(value){
    if(value==null||typeof value!=='object') return value;
    if(Array.isArray(value)) return value.map(item=>cloneDeep(item));
    const result={};
    for(const [key,val] of Object.entries(value)){
      result[key]=cloneDeep(val);
    }
    return result;
  }

  function safeJsonStringify(value,options){
    const opts=options||{};
    const skipKeys=new Set(Array.isArray(opts.skipKeys)?opts.skipKeys:[]);
    const seen=new WeakSet();
    try{
      return JSON.stringify(value,(key,val)=>{
        if(skipKeys.has(key)) return undefined;
        if(typeof val==='function') return undefined;
        if(val&&typeof val==='object'){
          if(seen.has(val)) return undefined;
          seen.add(val);
        }
        return val;
      },2);
    }catch(err){
      console.warn('NSF: JSON konnte nicht serialisiert werden',err);
      return '';
    }
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

  function extractNestedFieldRaw(raw,aliases,visited){
    if(!raw||typeof raw!=='object') return undefined;
    const seen=visited||new Set();
    if(seen.has(raw)) return undefined;
    seen.add(raw);
    const map=buildFieldMap(raw);
    const objectMatches=[];
    const aliasKeys=[];
    for(const alias of aliases){
      const key=canonicalKey(alias);
      if(!key) continue;
      aliasKeys.push(key);
      if(Object.prototype.hasOwnProperty.call(map,key)){
        const value=map[key];
        if(value==null) continue;
        if(typeof value==='object'){
          objectMatches.push(value);
        }else{
          return value;
        }
      }
    }
    for(const key of aliasKeys){
      const recordMatch=matchRecordByAlias(map,key);
      if(recordMatch) return recordMatch;
    }
    for(const candidate of objectMatches){
      const nested=extractNestedFieldRaw(candidate,aliases,seen);
      if(nested!==undefined) return nested;
      if(candidate&&typeof candidate==='object'){
        return candidate;
      }
    }
    for(const value of Object.values(raw)){
      if(value==null) continue;
      if(Array.isArray(value)){
        for(const item of value){
          const nested=extractNestedFieldRaw(item,aliases,seen);
          if(nested!==undefined) return nested;
        }
        continue;
      }
      if(typeof value==='object'){
        const nested=extractNestedFieldRaw(value,aliases,seen);
        if(nested!==undefined) return nested;
      }
    }
    return undefined;
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
        let stored=false;
        let lastError=null;
        for(const candidate of DEFAULT_FINDINGS_FILES){
          try{
            const resp=await fetch(candidate,{cache:'no-store'});
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
              localStorage.setItem(FINDINGS_PATH_KEY,candidate);
              lastValues[FINDINGS_PATH_KEY]=candidate;
            }
            stored=true;
            break;
          }catch(fetchErr){
            lastError=fetchErr;
          }
        }
        if(!stored){
          const tried=DEFAULT_FINDINGS_FILES.join(', ');
          console.warn(`NSF: Standard-Findings konnten nicht geladen werden (${tried})`,lastError);
        }
      }catch(err){
        console.warn('NSF: Fehler beim Laden der Standard-Findings',err);
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
      const partsRaw=extractNestedFieldRaw(raw,FIELD_ALIASES.parts);
      let partsList=[];
      if(Array.isArray(partsRaw)){
        partsList=partsRaw
          .map(item=>{
            if(item&&typeof item==='object'){
              const partText=clean(item.part);
              if(!partText) return null;
              const quantityText=clean(item.menge??item.quantity??item.qty);
              const entryPart={part:partText};
              if(quantityText) entryPart.menge=quantityText;
              return entryPart;
            }
            const partText=clean(item);
            if(!partText) return null;
            return {part:partText};
          })
          .filter(Boolean);
      }
      const normalizedPartsData=nsfNormalizeParts({parts:partsList});
      const partsArrayForEntry=normalizedPartsData.map(pair=>({part:pair.part,menge:pair.quantity}));
      const partsText=normalizedPartsData.length
        ? normalizedPartsData
            .map(pair=>{
              const qty=clean(pair.quantity);
              const part=clean(pair.part);
              if(qty&&qty!=='1') return `${qty}x ${part}`;
              return part;
            })
            .filter(Boolean)
            .join('\n')
        :clean(valueToText(partsRaw));
      const timesRaw=extractNestedFieldRaw(raw,FIELD_ALIASES.times);
      let timesObject={};
      if(timesRaw&&typeof timesRaw==='object'&&!Array.isArray(timesRaw)){
        timesObject=Object.entries(timesRaw).reduce((acc,[key,val])=>{
          const valueText=clean(val);
          if(!valueText) return acc;
          acc[key]=valueText;
          return acc;
        },{});
      }
      const timesText=Object.keys(timesObject).length
        ? Object.entries(timesObject)
            .map(([key,val])=>{
              const label=clean(key).replace(/_/g,' ').trim();
              return label?`${label}: ${val}`:val;
            })
            .filter(Boolean)
            .join('\n')
        :clean(valueToText(timesRaw));
      const modsRaw=extractNestedFieldRaw(raw,FIELD_ALIASES.mods);
      let modsList=[];
      if(Array.isArray(modsRaw)){
        modsList=modsRaw.map(item=>clean(item)).filter(Boolean);
      }
      const modsText=modsList.length?modsList.join('\n'):clean(valueToText(modsRaw));
      const map=buildFieldMap(raw);
      const appliesToFromField=normalizePartNumbersList(map.appliesto||[]);
      const partNumbersFromField=normalizePartNumbersList(map.partnumbers);
      const partSet=new Set();
      if(part) partSet.add(part);
      const appliesCandidateSet=new Set(appliesToFromField);
      nsfGetAppliesTo(raw).forEach(value=>{
        const normalized=normalizePart(value);
        if(normalized) appliesCandidateSet.add(normalized);
      });
      for(const candidate of [...partNumbersFromField,...appliesCandidateSet]){
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
      const appliesTo=Array.from(appliesCandidateSet).filter(value=>value!==part);
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
      const baseKeyParts=[part,label,finding,action,routine,routineFinding,routineAction,nonroutine,nonroutineFinding,nonroutineAction,partsText,timesText,modsText];
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
      const timesValue=timesText||'';
      const modsValue=modsText||'';
      result.push({
        key,
        part,
        partNumbers,
        appliesTo,
        label:labelValue,
        finding:findingValue,
        action:actionValue,
        routine:routineValue,
        routineFinding:routineFindingValue,
        routineAction:routineActionValue,
        nonroutine:nonroutineValue,
        nonroutineFinding:nonroutineFindingValue,
        nonroutineAction:nonroutineActionValue,
        parts:partsArrayForEntry,
        partsText:partsValue,
        times:timesObject,
        timesText:timesValue,
        mods:modsList,
        modsText:modsValue,
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
        modsLower:modsValue.toLowerCase(),
        raw:cloneDeep(raw)
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
    if(!docRaw&&aspenDocMemory){
      docRaw=aspenDocMemory;
    }
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

  function selectAspenBoardStateBundle(parsed){
    if(!parsed||typeof parsed!=='object') return null;
    if(Array.isArray(parsed.items)||typeof parsed.config==='object') return parsed;
    const instances=parsed.instances&&typeof parsed.instances==='object'?parsed.instances:null;
    if(!instances) return null;
    const meta=parsed.__meta&&typeof parsed.__meta==='object'?parsed.__meta:{};
    const lastRaw=typeof meta.lastActiveSeed==='string'?meta.lastActiveSeed.trim():'';
    if(lastRaw){
      const normalized=lastRaw.toLowerCase().replace(/\s+/g,'_');
      const candidate=instances[normalized]||instances[lastRaw];
      if(candidate&&typeof candidate==='object') return candidate;
    }
    const primary=instances.primary;
    if(primary&&typeof primary==='object') return primary;
    const firstKey=Object.keys(instances).find(key=>{
      const value=instances[key];
      return value&&typeof value==='object';
    });
    return firstKey?instances[firstKey]:null;
  }

  function loadAspenBoardState(){
    let raw='';
    try{raw=localStorage.getItem(ASPEN_BOARD_STATE_KEY)||'';}
    catch(err){console.warn('NSF: aspenUnitListState konnte nicht gelesen werden',err);}
    if(!raw) return null;
    try{
      const parsed=JSON.parse(raw);
      const state=selectAspenBoardStateBundle(parsed);
      return state&&typeof state==='object'?state:null;
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
    if(!parsed.historyUsage||typeof parsed.historyUsage!=='object') parsed.historyUsage={};
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

  function buildEventHistoryKey(part,serial){
    const normalizedPart=normalizePart(part);
    const normalizedSerial=clean(serial);
    if(!normalizedPart||!normalizedSerial) return '';
    return [normalizedPart,normalizedSerial].map(value=>encodeURIComponent(value||''))
      .join(STATE_KEY_SEPARATOR);
  }

  function createEventId(){
    return `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  }

  function createEmptyEventHistoryStore(){
    return {version:1,updatedAt:new Date().toISOString(),events:{}};
  }

  function normalizeEventHistoryStore(raw){
    const base=createEmptyEventHistoryStore();
    if(!raw||typeof raw!=='object') return base;
    const events=raw.events&&typeof raw.events==='object'?raw.events:{};
    return {
      version:Number.isFinite(raw.version)?raw.version:base.version,
      updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt:base.updatedAt,
      events
    };
  }

  function loadEventHistoryStoreFromLocalStorage(){
    try{
      const cached=localStorage.getItem(EVENT_HISTORY_STORAGE_KEY);
      if(cached){
        const parsed=JSON.parse(cached);
        return normalizeEventHistoryStore(parsed);
      }
    }catch(err){
      console.warn('NSF: Event-History konnte nicht aus dem Cache gelesen werden',err);
    }
    try{
      const legacy=JSON.parse(localStorage.getItem(STATE_KEY)||'{}');
      if(legacy&&legacy.eventHistory&&typeof legacy.eventHistory==='object'){
        const migrated=createEmptyEventHistoryStore();
        migrated.events=legacy.eventHistory;
        return migrated;
      }
    }catch(err){
      console.warn('NSF: Legacy-Event-History konnte nicht migriert werden',err);
    }
    return createEmptyEventHistoryStore();
  }

  function cacheEventHistoryStore(store){
    try{
      const payload=JSON.stringify(store);
      localStorage.setItem(EVENT_HISTORY_STORAGE_KEY,payload);
    }catch(err){
      console.warn('NSF: Event-History konnte nicht gecached werden',err);
    }
  }

  function getRootHistoryHandle(){
    if(typeof window==='undefined') return null;
    if(!window.showDirectoryPicker) return null;
    return window.rootDirHandle||null;
  }

  async function ensureRootPermission(handle){
    if(!handle) return false;
    if(typeof ensureRWPermission==='function'){
      return await ensureRWPermission(handle,{mode:'readwrite'});
    }
    return true;
  }

  async function readEventHistoryStoreFromFile(){
    const rootHandle=getRootHistoryHandle();
    if(!rootHandle) return null;
    const granted=await ensureRootPermission(rootHandle);
    if(!granted) return null;
    try{
      const fileHandle=await rootHandle.getFileHandle(EVENT_HISTORY_FILE_NAME,{create:false});
      const file=await fileHandle.getFile();
      const text=await file.text();
      const parsed=JSON.parse(text||'{}');
      const normalized=normalizeEventHistoryStore(parsed);
      cacheEventHistoryStore(normalized);
      return {
        store:normalized,
        modified:typeof file?.lastModified==='number'?file.lastModified:null
      };
    }catch(err){
      if(err&&err.name==='NotFoundError'){
        return null;
      }
      console.warn('NSF: Event-History-Datei konnte nicht gelesen werden',err);
      return null;
    }
  }

  async function writeEventHistoryStoreToFile(store){
    const rootHandle=getRootHistoryHandle();
    if(!rootHandle) return {ok:false,modified:null};
    const granted=await ensureRootPermission(rootHandle);
    if(!granted) return {ok:false,modified:null};
    try{
      const normalized=normalizeEventHistoryStore(store);
      normalized.updatedAt=new Date().toISOString();
      const payload=JSON.stringify(normalized,null,2);
      const fileHandle=await rootHandle.getFileHandle(EVENT_HISTORY_FILE_NAME,{create:true});
      const writable=await fileHandle.createWritable();
      await writable.write(payload);
      await writable.close();
      const file=await fileHandle.getFile();
      cacheEventHistoryStore(normalized);
      return {
        ok:true,
        modified:typeof file?.lastModified==='number'?file.lastModified:null
      };
    }catch(err){
      console.warn('NSF: Event-History-Datei konnte nicht geschrieben werden',err);
      return {ok:false,modified:null};
    }
  }

  async function loadEventHistoryStore(){
    const fromFile=await readEventHistoryStoreFromFile();
    if(fromFile&&fromFile.store){
      return fromFile;
    }
    const fallback=loadEventHistoryStoreFromLocalStorage();
    const writeResult=await writeEventHistoryStoreToFile(fallback);
    return {store:fallback,modified:writeResult?.modified??null};
  }

  function normalizeEventHistoryEntry(raw){
    if(!raw||typeof raw!=='object') return null;
    const id=typeof raw.id==='string'?raw.id:'';
    const createdAt=typeof raw.createdAt==='string'?raw.createdAt:'';
    const createdMs=Date.parse(createdAt);
    const selections=Array.isArray(raw.selections)?raw.selections.filter(Boolean):[];
    if(!id||!createdAt||!Number.isFinite(createdMs)) return null;
    const rfr=typeof raw.rfr==='string'?raw.rfr:null;
    const reason=typeof raw.reason==='string'?raw.reason:null;
    const exchangeInput=typeof raw.exchangeInput==='string'?raw.exchangeInput:null;
    const exchangeOutput=typeof raw.exchangeOutput==='string'?raw.exchangeOutput:null;
    return {id,createdAt,createdMs,selections,rfr,reason,exchangeInput,exchangeOutput};
  }

  function getEventHistoryForKey(store,key){
    if(!store||!key) return [];
    const list=store.events&&store.events[key];
    if(!Array.isArray(list)) return [];
    const normalized=list.map(normalizeEventHistoryEntry).filter(Boolean);
    normalized.sort((a,b)=>b.createdMs-a.createdMs);
    return normalized.slice(0,EVENT_HISTORY_LIMIT);
  }

  function pushEventHistory(store,key,entry){
    if(!store||!key||!entry) return;
    if(!store.events||typeof store.events!=='object'){
      store.events={};
    }
    if(!Array.isArray(store.events[key])){
      store.events[key]=[];
    }
    const list=store.events[key];
    list.unshift({
      id:entry.id,
      createdAt:entry.createdAt,
      selections:Array.isArray(entry.selections)?entry.selections:[],
      rfr:typeof entry.rfr==='string'?entry.rfr:'',
      reason:typeof entry.reason==='string'?entry.reason:'',
      exchangeInput:typeof entry.exchangeInput==='string'?entry.exchangeInput:'',
      exchangeOutput:typeof entry.exchangeOutput==='string'?entry.exchangeOutput:''
    });
    const unique=new Map();
    const filtered=[];
    for(const item of list){
      const normalizedEntry=normalizeEventHistoryEntry(item);
      if(!normalizedEntry) continue;
      if(unique.has(normalizedEntry.id)) continue;
      unique.set(normalizedEntry.id,true);
      filtered.push({
        id:normalizedEntry.id,
        createdAt:normalizedEntry.createdAt,
        selections:normalizedEntry.selections,
        rfr:typeof normalizedEntry.rfr==='string'?normalizedEntry.rfr:'',
        reason:typeof normalizedEntry.reason==='string'?normalizedEntry.reason:'',
        exchangeInput:typeof normalizedEntry.exchangeInput==='string'?normalizedEntry.exchangeInput:'',
        exchangeOutput:typeof normalizedEntry.exchangeOutput==='string'?normalizedEntry.exchangeOutput:''
      });
      if(filtered.length>=EVENT_HISTORY_LIMIT) break;
    }
    store.events[key]=filtered;
  }

  function removeEventHistoryEntry(store,key,id){
    if(!store||!key||!id) return false;
    const list=store.events&&store.events[key];
    if(!Array.isArray(list)) return false;
    const filtered=list.filter(item=>item&&item.id!==id);
    if(filtered.length===list.length) return false;
    if(filtered.length){
      store.events[key]=filtered;
    }else{
      delete store.events[key];
    }
    return true;
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
          status:typeof sel.status==='string'?sel.status:'',
          part:typeof sel.part==='string'?normalizePart(sel.part):'',
          routine:typeof sel.routine==='string'?sel.routine:'',
          routineFinding:typeof sel.routineFinding==='string'?sel.routineFinding:'',
          routineAction:typeof sel.routineAction==='string'?sel.routineAction:'',
          nonroutine:typeof sel.nonroutine==='string'?sel.nonroutine:'',
          nonroutineFinding:typeof sel.nonroutineFinding==='string'?sel.nonroutineFinding:'',
          nonroutineAction:typeof sel.nonroutineAction==='string'?sel.nonroutineAction:'',
          parts:Array.isArray(sel.parts)
            ? sel.parts.map(item=>{
                const partValue=clean(item?.part||'');
                if(!partValue) return null;
                const quantityValue=clean(item?.menge??item?.quantity??'');
                const partEntry={part:partValue};
                if(quantityValue) partEntry.menge=quantityValue;
                return partEntry;
              }).filter(Boolean)
            : (typeof sel.parts==='string'?sel.parts:''),
          times:typeof sel.times==='string'?sel.times:'',
          mods:typeof sel.mods==='string'?sel.mods:''
        }
      ));
  }

  function serializeEventHistorySelections(selections){
    if(!Array.isArray(selections)) return [];
    return selections
      .filter(sel=>sel&&typeof sel.key==='string')
      .map(sel=>{
        const hasExtendedFields=['finding','action','routine','routineFinding','routineAction','nonroutine','nonroutineFinding','nonroutineAction','parts','partsText','times','mods']
          .some(field=>Object.prototype.hasOwnProperty.call(sel,field));
        const isCustom=typeof sel.key==='string'&&sel.key.startsWith('nsf-custom-');
        const labelCandidate=typeof sel.label==='string'&&sel.label
          ? sel.label
          : (typeof sel.finding==='string'&&sel.finding
            ? sel.finding
            : (typeof sel.action==='string'?sel.action:''));
        const label=clean(labelCandidate);
        const baseEntry={
          key:sel.key,
          label,
          status:typeof sel.status==='string'?sel.status:''
        };
        if(!(isCustom||hasExtendedFields)) return baseEntry;
        const parts=Array.isArray(sel.parts)
          ? sel.parts.map(item=>{
              const part=clean(item?.part||'');
              if(!part) return null;
              const quantity=clean(item?.menge??item?.quantity??'');
              return quantity?{part,quantity}:{part};
            }).filter(Boolean)
          : [];
        return {
          ...baseEntry,
          part:typeof sel.part==='string'?normalizePart(sel.part):'',
          finding:typeof sel.finding==='string'?sel.finding:'',
          action:typeof sel.action==='string'?sel.action:'',
          routine:typeof sel.routine==='string'?sel.routine:'',
          routineFinding:typeof sel.routineFinding==='string'?sel.routineFinding:'',
          routineAction:typeof sel.routineAction==='string'?sel.routineAction:'',
          nonroutine:typeof sel.nonroutine==='string'?sel.nonroutine:'',
          nonroutineFinding:typeof sel.nonroutineFinding==='string'?sel.nonroutineFinding:'',
          nonroutineAction:typeof sel.nonroutineAction==='string'?sel.nonroutineAction:'',
          parts,
          partsText:typeof sel.partsText==='string'?sel.partsText:'',
          times:typeof sel.times==='string'?sel.times:'',
          mods:typeof sel.mods==='string'?sel.mods:''
        };
      });
  }

  function deserializeSelections(entry){
    return Array.isArray(entry?.selections)
      ? entry.selections.filter(sel=>sel&&typeof sel.key==='string').map(sel=>(
          {
            key:sel.key,
            finding:typeof sel.finding==='string'?sel.finding:'',
            action:typeof sel.action==='string'?sel.action:'',
            label:typeof sel.label==='string'?sel.label:'',
            status:typeof sel.status==='string'?sel.status:'',
            part:typeof sel.part==='string'?normalizePart(sel.part):'',
            routine:typeof sel.routine==='string'?sel.routine:'',
            routineFinding:typeof sel.routineFinding==='string'?sel.routineFinding:'',
            routineAction:typeof sel.routineAction==='string'?sel.routineAction:'',
            nonroutine:typeof sel.nonroutine==='string'?sel.nonroutine:'',
            nonroutineFinding:typeof sel.nonroutineFinding==='string'?sel.nonroutineFinding:'',
            nonroutineAction:typeof sel.nonroutineAction==='string'?sel.nonroutineAction:'',
            parts:Array.isArray(sel.parts)
              ? sel.parts.map(item=>{
                  const partValue=clean(item?.part||'');
                  if(!partValue) return null;
                  const quantityValue=clean(item?.menge??item?.quantity??'');
                  const partEntry={part:partValue};
                  if(quantityValue) partEntry.menge=quantityValue;
                  return partEntry;
                }).filter(Boolean)
              : typeof sel.parts==='string'
                ? sel.parts
                : '',
            times:typeof sel.times==='string'?sel.times:'',
            mods:typeof sel.mods==='string'?sel.mods:''
          }
        ))
      :[];
  }

  function createEmptyActiveState(){
    return {
      findings:'',
      actions:'',
      routine:'',
      nonroutine:'',
      parts:'',
      freitextTemplate:'',
      rfr:'',
      reason:'',
      exchangeInput:'',
      exchangeOutput:'',
      customSections:[]
    };
  }

  let customSectionIdCounter=0;

  function createCustomSectionId(){
    customSectionIdCounter=(customSectionIdCounter+1)%1e6;
    return `nsf-custom-${Date.now().toString(36)}-${customSectionIdCounter.toString(36)}`;
  }

  function createCustomFindingId(){
    const time=Date.now().toString(36);
    const rand=Math.random().toString(36).slice(2,8);
    return `nsf-custom-finding-${time}-${rand}`;
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
      freitextTemplate:typeof state.freitextTemplate==='string'?state.freitextTemplate:'',
      rfr:typeof state.rfr==='string'?state.rfr:'',
      reason:typeof state.reason==='string'?state.reason:'',
      exchangeInput:typeof state.exchangeInput==='string'?state.exchangeInput:'',
      exchangeOutput:typeof state.exchangeOutput==='string'?state.exchangeOutput:'',
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
      parts: typeof entry?.partsText==='string'?entry.partsText:'',
      rfr: typeof entry?.rfr==='string'?entry.rfr:'',
      reason: typeof entry?.reason==='string'?entry.reason:'',
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
      rfr: typeof state.rfr==='string'?state.rfr:'',
      reason: typeof state.reason==='string'?state.reason:'',
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
    const usage=getHistoryUsageForPart(global,normalized);
    const seen=new Set();
    const aggregated=new Map();
    list.forEach((item,index)=>{
      if(!item||typeof item.key!=='string') return;
      if(seen.has(item.key)) return;
      seen.add(item.key);
      const entry={
        key:item.key,
        finding:clean(item.finding),
        action:clean(item.action),
        label:clean(item.label),
        part:normalizePart(item.part),
        usageCount:Number.isFinite(usage[item.key])?usage[item.key]:1,
        usageOrder:index
      };
      const labelKey=clean(entry.label||entry.finding||entry.action||entry.key).toLowerCase();
      const existing=aggregated.get(labelKey);
      if(existing){
        if(entry.usageCount>existing.usageCount){
          aggregated.set(labelKey,entry);
        }else if(entry.usageCount===existing.usageCount&&entry.usageOrder<existing.usageOrder){
          aggregated.set(labelKey,entry);
        }
      }else{
        aggregated.set(labelKey,entry);
      }
    });
    return [...aggregated.values()]
      .sort(sortHistoryByUsage)
      .slice(0,HISTORY_LIMIT)
      .map(entry=>({
        key:entry.key,
        finding:entry.finding,
        action:entry.action,
        label:entry.label,
        part:entry.part
      }));
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
    const usage=ensureHistoryUsageForPart(global,normalized);
    usage[entry.key]=Number.isFinite(usage[entry.key])?usage[entry.key]+1:1;
    saveGlobalState(global);
  }

  function sortHistoryByUsage(a,b){
    if(!a&&!b) return 0;
    if(!a) return 1;
    if(!b) return -1;
    const countDiff=(b.usageCount||0)-(a.usageCount||0);
    if(countDiff) return countDiff;
    const orderDiff=(a.usageOrder||0)-(b.usageOrder||0);
    if(orderDiff) return orderDiff;
    const left=clean(a.label||a.finding||a.action||'');
    const right=clean(b.label||b.finding||b.action||'');
    return left.localeCompare(right);
  }

  function getHistoryUsageForPart(global,part){
    const normalized=normalizePart(part);
    if(!normalized) return {};
    if(!global.historyUsage||typeof global.historyUsage!=='object') global.historyUsage={};
    if(normalized!==part&&global.historyUsage[part]&&!global.historyUsage[normalized]){
      global.historyUsage[normalized]=global.historyUsage[part];
      delete global.historyUsage[part];
      saveGlobalState(global);
    }
    const usage=global.historyUsage[normalized]||global.historyUsage[part];
    if(!usage||typeof usage!=='object') return {};
    return usage;
  }

  function ensureHistoryUsageForPart(global,part){
    const normalized=normalizePart(part);
    if(!normalized) return {};
    if(!global.historyUsage||typeof global.historyUsage!=='object') global.historyUsage={};
    if(normalized!==part&&global.historyUsage[part]&&!global.historyUsage[normalized]){
      global.historyUsage[normalized]=global.historyUsage[part];
      delete global.historyUsage[part];
    }
    if(!global.historyUsage[normalized]||typeof global.historyUsage[normalized]!=='object'){
      global.historyUsage[normalized]={};
    }
    return global.historyUsage[normalized];
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

  function formatEventTimestamp(value){
    if(!value) return '';
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('de-DE',{year:'numeric',month:'2-digit',day:'2-digit'});
  }

  function autoResizeTextarea(textarea){
    if(!(textarea instanceof HTMLTextAreaElement)) return;
    const computed=window.getComputedStyle(textarea);
    const triesValue=Number(textarea.dataset?.autoResizeTries)||0;
    const maxTries=8;
    const numeric=value=>{
      const parsed=parseFloat(value);
      return Number.isFinite(parsed)?parsed:0;
    };
    const lineHeight=numeric(computed.lineHeight)||numeric(computed.fontSize)||16;
    const paddingTop=numeric(computed.paddingTop);
    const paddingBottom=numeric(computed.paddingBottom);
    const borderTop=numeric(computed.borderTopWidth);
    const borderBottom=numeric(computed.borderBottomWidth);
    const boxSizing=(computed.boxSizing||'content-box').toLowerCase();
    const minRowsValue=Number(textarea.dataset?.minRows);
    const minRows=Number.isFinite(minRowsValue)&&minRowsValue>0?minRowsValue:0;
    const minHeightValue=Number(textarea.dataset?.minHeight);
    const datasetMinHeight=Number.isFinite(minHeightValue)&&minHeightValue>0?minHeightValue:0;
    const cssMinHeight=numeric(computed.minHeight);
    let cssMaxHeight=Infinity;
    const rawMaxHeight=computed.maxHeight;
    if(rawMaxHeight&&rawMaxHeight!=='none'){
      const parsedMax=parseFloat(rawMaxHeight);
      if(Number.isFinite(parsedMax)&&parsedMax>0){
        cssMaxHeight=parsedMax;
      }
    }
    const rowsMinHeight=minRows>0
      ?minRows*lineHeight+paddingTop+paddingBottom+(boxSizing==='border-box'?borderTop+borderBottom:0)
      :0;
    const previousOverflow=textarea.style.overflowY;
    const previousHeight=textarea.style.height;
    textarea.style.overflowY='hidden';
    textarea.style.height='auto';
    let measured=textarea.scrollHeight;
    if(boxSizing==='border-box'){
      measured+=borderTop+borderBottom;
    }
    const width=numeric(computed.width);
    if((width<=0||measured<=0)&&textarea.isConnected&&triesValue<maxTries){
      textarea.dataset.autoResizeTries=String(triesValue+1);
      requestAnimationFrame(()=>autoResizeTextarea(textarea));
      textarea.style.height=previousHeight||'';
      textarea.style.overflowY=previousOverflow||'';
      return;
    }
    textarea.dataset.autoResizeTries='0';
    if(measured<=0){
      const rawValue=typeof textarea.value==='string'?textarea.value:'';
      const lineCount=Math.max(rawValue.split('\n').length,minRows||1);
      const fallback=lineCount*lineHeight+paddingTop+paddingBottom+(boxSizing==='border-box'?borderTop+borderBottom:0);
      measured=Math.max(measured,fallback);
    }
    const nextHeight=Math.max(measured,datasetMinHeight,cssMinHeight,rowsMinHeight);
    const appliedHeight=cssMaxHeight<Infinity?Math.min(nextHeight,cssMaxHeight):nextHeight;
    textarea.style.height=`${appliedHeight}px`;
    if(cssMaxHeight<Infinity&&nextHeight>cssMaxHeight){
      textarea.dataset.autoResizeOverflow='1';
    }else if(textarea.dataset.autoResizeOverflow){
      delete textarea.dataset.autoResizeOverflow;
    }
    textarea.style.overflowY=previousOverflow||'';
  }

  function ensureTextareaAutoResize(textarea){
    if(!(textarea instanceof HTMLTextAreaElement)) return;
    requestAnimationFrame(()=>autoResizeTextarea(textarea));
    if(typeof ResizeObserver==='undefined') return;
    if(textareaAutoResizeObservers.has(textarea)) return;
    try{
      const observer=new ResizeObserver(entries=>{
        for(const entry of entries){
          if(entry?.target===textarea){
            autoResizeTextarea(textarea);
          }
        }
      });
      observer.observe(textarea);
      textareaAutoResizeObservers.set(textarea,observer);
    }catch(err){
      console.warn('NSF: ResizeObserver nicht verfügbar',err);
    }
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
      this.partsEntry=null;
      this.partsFieldContainer=null;
      this.customSections=[];
      this.customSlots=[];
      this.customSlotSortables=[];
      this.customSectionMap=new Map();
      this.dragShadowOrder=[];
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
      this.routineEditorContainer=null;
      this.routineEditorPresetList=null;
      this.routineEditorPresetNameInput=null;
      this.routineEditorPresetSaveButton=null;
      this.routineEditorActivePresetDirty=false;
      this.routineEditorPresetNameTouched=false;
      this.routineEditorActiveInfo=null;
      this.routineEditorNewPresetButton=null;
      this.routineEditorStatusSection=null;
      this.routineEditorStatusTemplateInput=null;
      this.routineEditorStatusInputMap=null;
      this.routineEditorStatusResetButton=null;
      this.routineEditorMenu=null;
      this.routineEditorMenuCleanup=null;
      this.routineEditorContextHandler=null;
      this.routineEditorContextTarget=null;
      this.routineEditorContextHandlers=new Map();
      this.routineEditorMenuTabKey=null;
      this.routineEditorActiveTab=loadRoutineEditorActiveTab();
      this.routineEditorDerivedLines={findings:[],actions:[]};
      this.rawFindings=[];
      this.rawActions=[];
      this.rawRoutine=[];
      this.rawNonroutineFindings=[];
      this.rawParts=[];
      this.rawTimes=[];
      this.rawMods=[];
      this.currentLabel='';
      this.freitextDraft='';
      this.freitextTextarea=null;
      this.freitextPlaceholderDefinitions=FREITEXT_PLACEHOLDERS;
      this.routineEditorDragState=null;
      this.parameterFavorites=loadRoutineEditorParameterFavorites();
      this.parameterFavoriteSet=new Set(Array.isArray(this.parameterFavorites)?this.parameterFavorites:[]);
      this.routineEditorParameterOptions=[];
      this.routineEditorParameterOptionMap=new Map();
      this.routineEditorParameterFavoritesOnly=false;
      this.routineEditorParameterFilterButton=null;
      this.routineEditorPreviewTabButtons=null;
      this.routineEditorPreviewTitleElement=null;
      this.routineEditorPreviewTabBar=null;
      this.saveTimer=null;
      this.selectionRows=[];
      this.currentPart='';
      this.partSource='';
      this.outputColumnCount=loadOutputColumnCount();
      this.meldung='';
      this.serial='';
      this.serialStatus='';
      this.serialLookupMeldung='';
      this.repairOrder='';
      this.hasAspenDoc=false;
      this.globalState=loadGlobalState();
      this.history=[];
      this.eventHistory=[];
      this.eventHistoryKey='';
      this.activeEventId='';
      this.eventHistoryStore=null;
      this.eventHistoryStorePromise=null;
      this.eventUpdateTimer=null;
      this.filterAll=false;
      this.undoBuffer=null;
      this.selectedEntries=[];
      this.totalEntries=0;
      this.entryMap=new Map();
      this.dictionaryUsed=false;
      this.findingsPath='';
      this.selectionCollapsed=false;
      this.headerCollapsed=true;
      this.removalReason='';
      this.removalOptionsCollapsed=false;
      this.removalOptionsInitialized=false;
      this.reasonText='';
      this.reasonTextarea=null;
      this.exchangeInputText='';
      this.exchangeOutputText='';
      this.menuCleanup=null;
      this.partsContextMenu=null;
      this.partsContextMenuCleanup=null;
      this.preservedAspenState=null;
      this.restoredAspenState=false;
      this.findingsFileHandle=null;
      this.findingsHandlePermission='prompt';
      this.findingsHandleMessage='';
      this.findingsFileName='';
      this.findingsHandleInitPromise=null;
      this.findingsHandleBusy=false;
      this.findingsPollInterval=null;
      this.findingsPollInProgress=false;
      this.findingsLastModified=null;
      this.aspenFileHandle=null;
      this.aspenHandlePermission='prompt';
      this.aspenHandleInitPromise=null;
      this.aspenHandleBusy=false;
      this.aspenPollInterval=null;
      this.aspenPollInProgress=false;
      this.aspenLastModified=loadAspenLastModified();
      this.aspenLastSize=null;
      this.historyPollInterval=null;
      this.historyPollInProgress=false;
      this.historyLastModified=null;
      this.legacyFindingsInput=null;
      this.findingJsonOverlay=null;
      this.findingJsonModalKeyHandler=null;
      this.findingJsonBodyOverflow='';
      this.routineStatusOverlay=null;
      this.routineStatusModalKeyHandler=null;
      this.routineStatusBodyOverflow='';
      this.customFindingOverlay=null;
      this.customFindingModalKeyHandler=null;
      this.customFindingBodyOverflow='';
      this.findingsEditorOverlay=null;
      this.findingsEditorInstance=null;
      this.findingsEditorKeyHandler=null;
      this.findingsEditorBodyOverflow='';
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

    async ensureEventHistoryStore(){
      if(this.eventHistoryStorePromise) return this.eventHistoryStorePromise;
      this.eventHistoryStorePromise=(async()=>{
        const result=await loadEventHistoryStore();
        this.eventHistoryStore=result?.store||createEmptyEventHistoryStore();
        if(result&&typeof result.modified==='number'){
          this.historyLastModified=result.modified;
        }
        this.startHistoryPolling();
        return this.eventHistoryStore;
      })().finally(()=>{
        this.eventHistoryStorePromise=null;
      });
      return this.eventHistoryStorePromise;
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
      // PATCH START: minimal style (only if style injection exists in this file)
      try{
        const styleId='nsf-part-origin-style';
        if(!document.getElementById(styleId)){
          const st=document.createElement('style');
          st.id=styleId;
          st.textContent=`
      .nsf-part-origin{margin-left:.5rem;font-size:1rem;cursor:default;user-select:none}
      .nsf-part-row{align-items:center}
      .nsf-part-field-input[readonly]{cursor:text}
    `;
          document.head.appendChild(st);
        }
      }catch{/* ignore */}
      // PATCH END
      setupWatchers();
      await ensureData();
      await this.ensureFindingsHandleInitialized();
      await this.ensureAspenHandleInitialized();
      await this.ensureEventHistoryStore();
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
      this.eventHistoryKey=buildEventHistoryKey(this.currentPart,this.serial);
      this.eventHistory=getEventHistoryForKey(this.eventHistoryStore,this.eventHistoryKey);
      if(this.activeEventId&&!this.eventHistory.some(entry=>entry.id===this.activeEventId)){
        this.activeEventId='';
      }
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
      let removalFromSelection=null;
      selections=Array.isArray(selections)
        ?selections.filter(sel=>{
            const key=typeof sel?.key==='string'?sel.key:'';
            if(!key.startsWith('removal:')) return true;
            if(!removalFromSelection) removalFromSelection=sel;
            return false;
          })
        :[];
      if(removalFromSelection&&!this.activeState.rfr){
        const removalValue=clean(removalFromSelection.label||removalFromSelection.finding||'');
        if(removalValue){
          this.activeState.rfr=removalValue;
        }
      }
      this.removalReason=clean(this.activeState.rfr||'');
      if(this.stateKey!==previousKey){
        this.removalOptionsCollapsed=!!this.removalReason;
      }else if(!this.removalReason){
        this.removalOptionsCollapsed=false;
      }
      this.removalOptionsInitialized=true;
      this.reasonText=clean(this.activeState.reason||'');
      this.exchangeInputText=clean(this.activeState.exchangeInput||'');
      this.exchangeOutputText=clean(this.activeState.exchangeOutput||'');
      this.customSections=normalizeCustomSections(this.activeState.customSections);
      this.rebuildCustomSectionMap();
      this.syncCustomSectionsToActiveState({save:false});
      this.history=getHistoryForPart(this.globalState,this.currentPart);
      this.selectedEntries=this.hydrateSelections(selections);
      await this.ensureDefaultEventHistoryEntry();
      const defaultEventEntry=!this.activeEventId&&this.eventHistory.length
        ?this.eventHistory[0]
        :null;
      if(defaultEventEntry){
        this.activeEventId=defaultEventEntry.id;
        this.applyEventSnapshotToState(defaultEventEntry,{persist:true});
      }
      this.selectionRows=[];
      this.renderDom();
      if(this.restoredAspenState&&this.stateKey){
        this.persistState(true);
        this.restoredAspenState=false;
      }
    }

    updateFindingsContext(updates){
      if(!updates||typeof updates!=='object') return false;
      let changed=false;
      let permissionChanged=false;
      if(Object.prototype.hasOwnProperty.call(updates,'permission')&&this.findingsHandlePermission!==updates.permission){
        this.findingsHandlePermission=updates.permission;
        changed=true;
        permissionChanged=true;
      }
      if(Object.prototype.hasOwnProperty.call(updates,'message')&&this.findingsHandleMessage!==updates.message){
        this.findingsHandleMessage=updates.message;
        changed=true;
      }
      if(Object.prototype.hasOwnProperty.call(updates,'fileName')&&this.findingsFileName!==updates.fileName){
        this.findingsFileName=updates.fileName;
        changed=true;
      }
      if(permissionChanged){
        if(this.findingsHandlePermission!=='granted'){
          this.stopFindingsPolling();
        }
      }
      return changed;
    }

    updateAspenContext(updates){
      if(!updates||typeof updates!=='object') return false;
      let changed=false;
      let permissionChanged=false;
      if(Object.prototype.hasOwnProperty.call(updates,'permission')&&this.aspenHandlePermission!==updates.permission){
        this.aspenHandlePermission=updates.permission;
        changed=true;
        permissionChanged=true;
      }
      if(permissionChanged){
        if(this.aspenHandlePermission!=='granted'){
          this.stopAspenPolling();
        }
      }
      return changed;
    }

    stopFindingsPolling(){
      if(this.findingsPollInterval){
        clearInterval(this.findingsPollInterval);
        this.findingsPollInterval=null;
      }
      this.findingsPollInProgress=false;
    }

    startFindingsPolling(){
      this.stopFindingsPolling();
      if(!this.findingsFileHandle||this.findingsHandlePermission!=='granted') return;
      this.findingsPollInterval=setInterval(()=>{void this.pollFindingsFileOnce();},FINDINGS_POLL_INTERVAL);
      void this.pollFindingsFileOnce();
    }

    stopAspenPolling(){
      if(this.aspenPollInterval){
        clearInterval(this.aspenPollInterval);
        this.aspenPollInterval=null;
      }
      this.aspenPollInProgress=false;
    }

    startAspenPolling(){
      this.stopAspenPolling();
      if(!this.aspenFileHandle||this.aspenHandlePermission!=='granted') return;
      this.aspenPollInterval=setInterval(()=>{void this.pollAspenFileOnce();},ASPEN_POLL_INTERVAL);
      void this.pollAspenFileOnce();
    }

    stopHistoryPolling(){
      if(this.historyPollInterval){
        clearInterval(this.historyPollInterval);
        this.historyPollInterval=null;
      }
      this.historyPollInProgress=false;
    }

    startHistoryPolling(){
      if(this.historyPollInterval) return;
      const rootHandle=getRootHistoryHandle();
      if(!rootHandle) return;
      this.historyPollInterval=setInterval(()=>{void this.pollHistoryFileOnce();},HISTORY_POLL_INTERVAL);
      void this.pollHistoryFileOnce();
    }

    shouldHideNonroutineOutput(){
      if(!this.selectedEntries.length) return false;
      const allowedStatuses=new Set(['Spare','SRU Exchange']);
      return this.selectedEntries.every(entry=>{
        const normalizedStatus=normalizeFindingStatus(entry?.status)||DEFAULT_FINDING_STATUS;
        return normalizedStatus && allowedStatuses.has(normalizedStatus);
      });
    }

    shouldShowExchangeInputs(){
      if(!this.selectedEntries.length) return false;
      return this.selectedEntries.some(entry=>isSruExchangeStatus(entry?.status));
    }

    replaceExchangeKeywords(text){
      const raw=typeof text==='string'?text:'';
      if(!raw) return '';
      const input=clean(this.exchangeInputText||this.activeState?.exchangeInput||'');
      const output=clean(this.exchangeOutputText||this.activeState?.exchangeOutput||'');
      return raw
        .replace(/\{sn_in\}/gi,input)
        .replace(/\{sn_out\}/gi,output);
    }

    async pollFindingsFileOnce(){
      if(this.findingsPollInProgress) return;
      if(!this.findingsFileHandle||this.findingsHandlePermission!=='granted'){
        this.stopFindingsPolling();
        return;
      }
      this.findingsPollInProgress=true;
      try{
        const file=await this.findingsFileHandle.getFile();
        const modified=typeof file?.lastModified==='number'?file.lastModified:null;
        if(modified==null){
          return;
        }
        if(this.findingsLastModified==null){
          this.findingsLastModified=modified;
          return;
        }
        if(modified>this.findingsLastModified){
          this.findingsLastModified=modified;
          await this.handleFindingsFile(file);
          this.updateFindingsContext({fileName:file&&file.name?file.name:'',message:'',permission:'granted'});
          this.scheduleRender();
        }
      }catch(err){
        if(err&&(err.name==='NotAllowedError'||err.name==='SecurityError')){
          console.info('[UnitBoard] Findings-Datei: Zugriff verloren',err);
          this.stopFindingsPolling();
          this.findingsLastModified=null;
          this.findingsFileHandle=null;
          try{await clearStoredFindingsHandle();}catch{/* ignore */}
          this.updateFindingsContext({permission:'denied',message:'Bitte Datei erneut auswählen.'});
          this.scheduleRender();
        }else{
          console.warn('NSF: Polling der Findings-Datei fehlgeschlagen',err);
        }
      }finally{
        this.findingsPollInProgress=false;
      }
    }

    async pollAspenFileOnce(){
      if(this.aspenPollInProgress) return;
      if(!this.aspenFileHandle||this.aspenHandlePermission!=='granted'){
        this.stopAspenPolling();
        return;
      }
      this.aspenPollInProgress=true;
      try{
        const file=await this.aspenFileHandle.getFile();
        const modified=typeof file?.lastModified==='number'?file.lastModified:null;
        const size=typeof file?.size==='number'?file.size:null;
        if(modified==null||size==null){
          return;
        }
        const currentStamp=this.aspenLastModified;
        const currentSize=this.aspenLastSize;
        if(currentStamp==null||currentSize==null){
          this.aspenLastModified=modified;
          this.aspenLastSize=size;
          storeAspenLastModified(modified);
          return;
        }
        if(modified>currentStamp||size!==currentSize){
          this.aspenLastModified=modified;
          this.aspenLastSize=size;
          storeAspenLastModified(modified);
          await this.handleAspenFile(file);
          this.updateAspenContext({permission:'granted'});
          this.scheduleRender();
        }
      }catch(err){
        if(err&&(err.name==='NotAllowedError'||err.name==='SecurityError')){
          console.info('[UnitBoard] Aspen-Datei: Zugriff verloren',err);
          this.stopAspenPolling();
          this.aspenLastModified=null;
          this.aspenLastSize=null;
          this.aspenFileHandle=null;
          try{await clearStoredAspenHandle();}catch{/* ignore */}
          this.updateAspenContext({permission:'denied'});
          this.scheduleRender();
        }else{
          console.warn('NSF: Polling der Aspen-Datei fehlgeschlagen',err);
        }
      }finally{
        this.aspenPollInProgress=false;
      }
    }

    async pollHistoryFileOnce(){
      if(this.historyPollInProgress) return;
      const rootHandle=getRootHistoryHandle();
      if(!rootHandle){
        this.stopHistoryPolling();
        return;
      }
      this.historyPollInProgress=true;
      try{
        const granted=await ensureRootPermission(rootHandle);
        if(!granted){
          this.stopHistoryPolling();
          return;
        }
        const fileHandle=await rootHandle.getFileHandle(EVENT_HISTORY_FILE_NAME,{create:false});
        const file=await fileHandle.getFile();
        const modified=typeof file?.lastModified==='number'?file.lastModified:null;
        if(modified==null){
          return;
        }
        if(this.historyLastModified==null){
          this.historyLastModified=modified;
          return;
        }
        if(modified>this.historyLastModified){
          const text=await file.text();
          const parsed=JSON.parse(text||'{}');
          const normalized=normalizeEventHistoryStore(parsed);
          cacheEventHistoryStore(normalized);
          this.eventHistoryStore=normalized;
          this.eventHistory=getEventHistoryForKey(this.eventHistoryStore,this.eventHistoryKey);
          if(this.activeEventId&&!this.eventHistory.some(entry=>entry.id===this.activeEventId)){
            this.activeEventId=this.eventHistory[0]?.id||'';
          }
          this.historyLastModified=modified;
          this.scheduleRender();
        }
      }catch(err){
        if(err&&err.name==='NotFoundError'){
          const fallback=this.eventHistoryStore||createEmptyEventHistoryStore();
          const writeResult=await writeEventHistoryStoreToFile(fallback);
          if(writeResult?.modified!=null){
            this.historyLastModified=writeResult.modified;
          }
          return;
        }
        console.warn('NSF: Polling der History-Datei fehlgeschlagen',err);
      }finally{
        this.historyPollInProgress=false;
      }
    }

    async ensureFindingsHandleInitialized(){
      if(this.findingsHandleInitPromise) return this.findingsHandleInitPromise;
      this.findingsHandleInitPromise=(async()=>{
        let handle=null;
        try{
          handle=await loadStoredFindingsHandle();
        }catch(err){
          console.warn('NSF: Persistiertes Findings-Handle konnte nicht geladen werden',err);
          handle=null;
        }
        if(handle){
          this.findingsFileHandle=handle;
          await this.handleRestoredFindingsHandle(handle);
        }else{
          this.updateFindingsContext({permission:'prompt'});
        }
      })();
      return this.findingsHandleInitPromise;
    }

    async ensureAspenHandleInitialized(){
      if(this.aspenHandleInitPromise) return this.aspenHandleInitPromise;
      this.aspenHandleInitPromise=(async()=>{
        let handle=null;
        try{
          handle=await loadStoredAspenHandle();
        }catch(err){
          console.warn('NSF: Persistiertes Aspen-Handle konnte nicht geladen werden',err);
          handle=null;
        }
        if(handle){
          this.aspenFileHandle=handle;
          await this.handleRestoredAspenHandle(handle);
        }else{
          this.updateAspenContext({permission:'prompt'});
        }
      })();
      return this.aspenHandleInitPromise;
    }

    async handleRestoredFindingsHandle(handle){
      if(!handle) return;
      const perm=await queryHandlePermission(handle);
      console.log('[UnitBoard] Permission:',perm);
      const baseUpdates={permission:perm};
      if(handle&&typeof handle.name==='string'&&handle.name){
        baseUpdates.fileName=handle.name;
      }
      this.updateFindingsContext(baseUpdates);
      if(perm==='granted'){
        await this.loadFindingsFromHandle(handle);
      }else if(perm==='prompt'||perm==='denied'){
        this.updateFindingsContext({message:'Bitte Datei erneut auswählen.'});
      }
    }

    async handleRestoredAspenHandle(handle){
      if(!handle) return;
      const perm=await queryHandlePermission(handle);
      console.log('[UnitBoard] Aspen Permission:',perm);
      const baseUpdates={permission:perm};
      this.updateAspenContext(baseUpdates);
      if(perm==='granted'){
        await this.loadAspenFromHandle(handle);
      }else if(perm==='prompt'||perm==='denied'){
        this.updateAspenContext({permission:perm});
      }
    }

    async loadFindingsFromHandle(handle){
      if(!handle) return;
      try{
        const file=await handle.getFile();
        if(file&&typeof file.name==='string'){
          console.log('[UnitBoard] Datei geöffnet:',file.name);
        }
        const modified=typeof file?.lastModified==='number'?file.lastModified:null;
        if(modified!=null){
          this.findingsLastModified=modified;
        }
        await this.handleFindingsFile(file);
        this.updateFindingsContext({fileName:file&&file.name?file.name:'',message:'',permission:'granted'});
        this.scheduleRender();
        this.startFindingsPolling();
      }catch(err){
        console.warn('NSF: Findings-Datei konnte nicht gelesen werden',err);
        if(err&&typeof err==='object'&&(err.name==='NotFoundError'||err.name==='NotAllowedError')){
          await clearStoredFindingsHandle();
          this.findingsFileHandle=null;
          this.stopFindingsPolling();
          this.findingsLastModified=null;
        }
        if(this.updateFindingsContext({message:'Bitte Datei erneut auswählen.'})){
          this.scheduleRender();
        }
      }
    }

    async loadAspenFromHandle(handle){
      if(!handle) return;
      try{
        const file=await handle.getFile();
        if(file&&typeof file.name==='string'){
          console.log('[UnitBoard] Aspen-Datei geöffnet:',file.name);
        }
        const modified=typeof file?.lastModified==='number'?file.lastModified:null;
        if(modified!=null){
          this.aspenLastModified=modified;
          storeAspenLastModified(modified);
        }
        const size=typeof file?.size==='number'?file.size:null;
        if(size!=null){
          this.aspenLastSize=size;
        }
        await this.handleAspenFile(file);
        this.updateAspenContext({permission:'granted'});
        this.scheduleRender();
        this.startAspenPolling();
      }catch(err){
        console.warn('NSF: Aspen-Datei konnte nicht gelesen werden',err);
        if(err&&typeof err==='object'&&(err.name==='NotFoundError'||err.name==='NotAllowedError')){
          await clearStoredAspenHandle();
          this.aspenFileHandle=null;
          this.stopAspenPolling();
          this.aspenLastModified=null;
          this.aspenLastSize=null;
          storeAspenLastModified(null);
        }
        if(this.updateAspenContext({permission:'denied'})){
          this.scheduleRender();
        }
      }
    }

    async bindFindingsHandle(handle){
      if(!handle) return;
      this.stopFindingsPolling();
      this.findingsLastModified=null;
      this.findingsFileHandle=handle;
      await storeFindingsHandle(handle);
      await this.loadFindingsFromHandle(handle);
    }

    async bindAspenHandle(handle){
      if(!handle) return;
      this.stopAspenPolling();
      this.aspenLastModified=null;
      this.aspenLastSize=null;
      this.aspenFileHandle=handle;
      await storeAspenHandle(handle);
      await this.loadAspenFromHandle(handle);
    }

    async pickFindingsHandle(){
      if(typeof window==='undefined'||typeof window.showOpenFilePicker!=='function'){
        if(this.legacyFindingsInput){
          this.legacyFindingsInput.click();
        }
        return;
      }
      try{
        const [handle]=await window.showOpenFilePicker({
          types:[{description:'JSON / Text',accept:{'application/json':['.json'],'text/plain':['.txt']}}],
          multiple:false
        });
        if(!handle) return;
        const status=await ensurePermission(handle);
        console.log('[UnitBoard] Permission:',status);
        if(status!=='granted'){
          if(this.updateFindingsContext({permission:status,message:'Bitte Datei erneut auswählen.'})){
            this.scheduleRender();
          }
          return;
        }
        await this.bindFindingsHandle(handle);
      }catch(err){
        if(err&&err.name==='AbortError') return;
        console.warn('NSF: Findings-Datei konnte nicht ausgewählt werden',err);
      }
    }

    async pickAspenHandle(){
      if(typeof window==='undefined'||typeof window.showOpenFilePicker!=='function'){
        if(this.aspenFileInput){
          this.aspenFileInput.click();
        }
        return;
      }
      try{
        const [handle]=await window.showOpenFilePicker({
          types:[
            {description:'Excel / CSV / JSON',accept:{
              'application/json':['.json'],
              'text/csv':['.csv'],
              'text/plain':['.txt'],
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'],
              'application/vnd.ms-excel':['.xls','.xlsm']
            }}
          ],
          multiple:false
        });
        if(!handle) return;
        const status=await ensurePermission(handle);
        console.log('[UnitBoard] Aspen Permission:',status);
        if(status!=='granted'){
          if(this.updateAspenContext({permission:status})){
            this.scheduleRender();
          }
          return;
        }
        await this.bindAspenHandle(handle);
      }catch(err){
        if(err&&err.name==='AbortError') return;
        console.warn('NSF: Aspen-Datei konnte nicht ausgewählt werden',err);
      }
    }

    async handleFindingsButton(){
      if(this.findingsHandleBusy) return;
      if(typeof window==='undefined'||typeof window.showOpenFilePicker!=='function'){
        if(this.legacyFindingsInput){
          this.legacyFindingsInput.click();
        }
        return;
      }
      this.findingsHandleBusy=true;
      try{
        if(this.findingsFileHandle){
          const status=await ensurePermission(this.findingsFileHandle);
          console.log('[UnitBoard] Permission:',status);
          if(status==='granted'){
            await this.loadFindingsFromHandle(this.findingsFileHandle);
            return;
          }
          if(this.updateFindingsContext({permission:status,message:'Bitte Datei erneut auswählen.'})){
            this.scheduleRender();
          }
        }
        await this.pickFindingsHandle();
      }catch(err){
        if(err&&err.name==='AbortError') return;
        console.warn('NSF: Findings-Datei konnte nicht geöffnet werden',err);
      }finally{
        this.findingsHandleBusy=false;
      }
    }

    async handleAspenButton(){
      if(this.aspenHandleBusy) return;
      if(typeof window==='undefined'||typeof window.showOpenFilePicker!=='function'){
        if(this.aspenFileInput){
          this.aspenFileInput.click();
        }
        return;
      }
      this.aspenHandleBusy=true;
      try{
        if(this.aspenFileHandle){
          const status=await ensurePermission(this.aspenFileHandle);
          console.log('[UnitBoard] Aspen Permission:',status);
          if(status==='granted'){
            await this.loadAspenFromHandle(this.aspenFileHandle);
            return;
          }
          if(this.updateAspenContext({permission:status})){
            this.scheduleRender();
          }
        }
        await this.pickAspenHandle();
      }catch(err){
        if(err&&err.name==='AbortError') return;
        console.warn('NSF: Aspen-Datei konnte nicht geöffnet werden',err);
      }finally{
        this.aspenHandleBusy=false;
      }
    }

    async handleLegacyAspenFile(file){
      if(!file) return;
      this.aspenFileHandle=null;
      this.stopAspenPolling();
      this.aspenLastModified=null;
      this.aspenLastSize=null;
      if(typeof file.lastModified==='number'){
        this.aspenLastModified=file.lastModified;
        storeAspenLastModified(file.lastModified);
      }
      if(typeof file.size==='number'){
        this.aspenLastSize=file.size;
      }
      await clearStoredAspenHandle();
      await this.handleAspenFile(file);
      if(this.updateAspenContext({permission:'prompt'})){
        this.scheduleRender();
      }
    }

    async handleLegacyFindingsFile(file){
      if(!file) return;
      this.findingsFileHandle=null;
      this.stopFindingsPolling();
      this.findingsLastModified=null;
      if(typeof file.lastModified==='number'){
        this.findingsLastModified=file.lastModified;
      }
      await clearStoredFindingsHandle();
      await this.handleFindingsFile(file);
      if(this.updateFindingsContext({fileName:file.name||'',message:'',permission:'prompt'})){
        this.scheduleRender();
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
      this.closePartsRowContextMenu();

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
          this.handleLegacyFindingsFile(file).finally(()=>{findingsInput.value='';});
        }else{
          findingsInput.value='';
        }
      });
      this.legacyFindingsInput=findingsInput;

      const fileInput=document.createElement('input');
      fileInput.type='file';
      fileInput.accept='.json,.csv,.txt,.xlsx,.xlsm';
      fileInput.style.display='none';
      fileInput.addEventListener('change',()=>{
        const file=fileInput.files&&fileInput.files[0];
        if(file){
          this.handleLegacyAspenFile(file).finally(()=>{fileInput.value='';});
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
      const missingHints=[];
      if(!this.meldung) missingHints.push('Meldung fehlt');
      if(!this.currentPart) missingHints.push('Partnummer fehlt');
      if(!this.serial) missingHints.push('Seriennummer fehlt');
      for(const hint of missingHints){
        const span=document.createElement('span');
        span.className='nsf-header-summary-item';
        span.textContent=hint;
        summary.appendChild(span);
      }
      const debugSpan=document.createElement('span');
      debugSpan.className='nsf-header-debug';
      const storedAspenLastModified=loadAspenLastModified();
      if(storedAspenLastModified!=null&&storedAspenLastModified!==this.aspenLastModified){
        this.aspenLastModified=storedAspenLastModified;
      }
      const findingsStand=formatTimeShort(this.findingsLastModified);
      const aspenStand=formatTimeShort(this.aspenLastModified);
      const historyStand=formatTimeShort(this.historyLastModified);
      const findingsLine=document.createElement('span');
      findingsLine.className='nsf-header-debug-line';
      findingsLine.textContent=`Auto-Update Findings Stand ${findingsStand}`;
      const aspenLine=document.createElement('span');
      aspenLine.className='nsf-header-debug-line';
      aspenLine.textContent=`Auto-Update Aspen Stand ${aspenStand}`;
      const historyLine=document.createElement('span');
      historyLine.className='nsf-header-debug-line';
      historyLine.textContent=`Auto-Update History Stand ${historyStand}`;
      debugSpan.append(findingsLine,aspenLine,historyLine);
      summary.appendChild(debugSpan);
      headerBar.appendChild(summary);

      const headerActions=document.createElement('div');
      headerActions.className='nsf-header-actions';
      const latestEventId=this.eventHistory[0]?.id||'';
      const showHistoryWarning=!!latestEventId&&this.activeEventId&&this.activeEventId!==latestEventId;

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

      const findingsAction=makeHeaderAction('Findings',()=>this.handleFindingsButton());
      const aspenAction=makeHeaderAction('Aspen',()=>this.handleAspenButton());
      headerActions.append(findingsAction,aspenAction);
      const headerHistory=document.createElement('div');
      headerHistory.className='nsf-header-history';
      const headerHistoryLabel=document.createElement('span');
      headerHistoryLabel.className='nsf-header-history-label';
      headerHistoryLabel.textContent='History';
      if(showHistoryWarning){
        const warning=document.createElement('span');
        warning.className='nsf-history-warning';
        warning.title='Nicht aktuelles Ereignis ausgewählt';
        warning.setAttribute('aria-label',warning.title);
        headerHistoryLabel.appendChild(warning);
      }
      const headerHistorySelect=document.createElement('select');
      headerHistorySelect.className='nsf-header-history-select';
      const headerHistoryPlaceholder=document.createElement('option');
      headerHistoryPlaceholder.value='';
      headerHistoryPlaceholder.textContent=this.eventHistoryKey
        ?(this.eventHistory.length?'History auswählen':'Keine History')
        :'PN/SN fehlt';
      headerHistorySelect.appendChild(headerHistoryPlaceholder);
      if(this.eventHistory.length){
        this.eventHistory.forEach(entry=>{
          const option=document.createElement('option');
          option.value=entry.id;
          const label=formatEventTimestamp(entry.createdAt);
          option.textContent=label||'Event';
          if(entry.id===this.activeEventId) option.selected=true;
          headerHistorySelect.appendChild(option);
        });
      }
      headerHistorySelect.disabled=!this.eventHistoryKey||!this.eventHistory.length;
      headerHistorySelect.addEventListener('change',()=>{
        const selectedId=headerHistorySelect.value;
        if(!selectedId) return;
        const entry=this.eventHistory.find(item=>item.id===selectedId);
        if(!entry) return;
        this.activeEventId=entry.id;
        this.applyEventSnapshot(entry);
      });
      headerHistory.append(headerHistoryLabel,headerHistorySelect);
      headerActions.appendChild(headerHistory);
      headerBar.appendChild(headerActions);

      contextSection.appendChild(headerBar);
      if(this.findingsHandleMessage){
        const hint=document.createElement('div');
        hint.className='nsf-alert';
        hint.textContent=this.findingsHandleMessage;
        contextSection.appendChild(hint);
      }
      contextSection.appendChild(findingsInput);
      contextSection.appendChild(fileInput);

      if(!this.headerCollapsed){
        const contextWrap=document.createElement('div');
        contextWrap.className='nsf-context';

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

        const historyWrapper=document.createElement('div');
        historyWrapper.className='nsf-menu-history';
        const historyLabel=document.createElement('div');
        historyLabel.className='nsf-editor-menu-label';
        historyLabel.textContent='History (PN/SN)';
        if(showHistoryWarning){
          const warning=document.createElement('span');
          warning.className='nsf-history-warning';
          warning.title='Nicht aktuelles Ereignis ausgewählt';
          warning.setAttribute('aria-label',warning.title);
          historyLabel.appendChild(warning);
        }
        const historyRow=document.createElement('div');
        historyRow.className='nsf-menu-history-row';
        const historySelect=document.createElement('select');
        historySelect.className='nsf-menu-select';
        const historyPlaceholder=document.createElement('option');
        historyPlaceholder.value='';
        historyPlaceholder.textContent=this.eventHistoryKey
          ?(this.eventHistory.length?'History auswählen':'Keine History vorhanden')
          :'PN/SN fehlt';
        historySelect.appendChild(historyPlaceholder);
        if(this.eventHistory.length){
          this.eventHistory.forEach(entry=>{
            const option=document.createElement('option');
            option.value=entry.id;
            const count=Array.isArray(entry.selections)?entry.selections.length:0;
            const label=formatEventTimestamp(entry.createdAt);
            option.textContent=label?`${label} • ${count}`:`${count} Findings`;
            if(entry.id===this.activeEventId) option.selected=true;
            historySelect.appendChild(option);
          });
        }
        historySelect.disabled=!this.eventHistoryKey||!this.eventHistory.length;
        const historyAddButton=document.createElement('button');
        historyAddButton.type='button';
        historyAddButton.className='nsf-menu-add';
        historyAddButton.textContent='+';
        historyAddButton.title='Neues Findings-Ereignis speichern';
        historyAddButton.setAttribute('aria-label',historyAddButton.title);
        historyAddButton.disabled=!this.eventHistoryKey||!this.selectedEntries.length;
        historyAddButton.addEventListener('click',()=>{
          if(historyAddButton.disabled) return;
          closeMenu();
          void this.createEventSnapshot();
        });
        historySelect.addEventListener('change',()=>{
          const selectedId=historySelect.value;
          if(!selectedId) return;
          const entry=this.eventHistory.find(item=>item.id===selectedId);
          if(!entry) return;
          this.activeEventId=entry.id;
          closeMenu();
          this.applyEventSnapshot(entry);
        });
        historyRow.append(historySelect,historyAddButton);
        historyWrapper.append(historyLabel,historyRow);
        const historyList=document.createElement('div');
        historyList.className='nsf-event-list';
        if(this.eventHistory.length){
          this.eventHistory.forEach(entry=>{
            const item=document.createElement('div');
            item.className='nsf-event-item';
            const selectBtn=document.createElement('button');
            selectBtn.type='button';
            selectBtn.className='nsf-event-select';
            if(entry.id===this.activeEventId){
              selectBtn.classList.add('is-active');
            }
            const count=Array.isArray(entry.selections)?entry.selections.length:0;
            const label=formatEventTimestamp(entry.createdAt);
            const textLabel=document.createElement('span');
            textLabel.textContent=label?`Ereignis ${label}`:'Ereignis';
            const meta=document.createElement('span');
            meta.className='nsf-event-meta';
            meta.textContent=`${count} Findings`;
            selectBtn.append(textLabel,meta);
            selectBtn.addEventListener('click',()=>{
              this.activeEventId=entry.id;
              closeMenu();
              this.applyEventSnapshot(entry);
            });
            const deleteBtn=document.createElement('button');
            deleteBtn.type='button';
            deleteBtn.className='nsf-event-delete';
            deleteBtn.textContent='✖';
            deleteBtn.title='Ereignis löschen';
            deleteBtn.setAttribute('aria-label','Ereignis löschen');
            deleteBtn.addEventListener('click',event=>{
              event.preventDefault();
              event.stopPropagation();
              closeMenu();
              void this.deleteEventHistoryEntry(entry);
            });
            item.append(selectBtn,deleteBtn);
            historyList.appendChild(item);
          });
        }else{
          const empty=document.createElement('div');
          empty.className='nsf-event-empty';
          empty.textContent='Keine Ereignisse gespeichert.';
          historyList.appendChild(empty);
        }
        historyWrapper.appendChild(historyList);
        menuList.appendChild(historyWrapper);

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
        addMenuItem('📂 Aspen-Datei wählen …',()=>this.handleAspenButton());
        const toggleItem=addMenuItem(
          this.filterAll?'🔒 PN-Filter aktivieren':'🔍 Alle Findings anzeigen',
          toggleFilter,
          {disabled:!this.totalEntries}
        );
        const undoItem=addMenuItem('↩️ Undo',handleUndo,{disabled:!this.undoBuffer});
        const clearItem=addMenuItem('🗑 Alles löschen',handleClear,{disabled:!this.stateKey});
        const saveItem=addMenuItem('💾 Alles speichern',handleSave,{disabled:!this.stateKey});
        const oneColumnLabel=`${this.getOutputColumnCount()===1?'✅':'⬜️'} Eine Spalte`;
        const twoColumnLabel=`${this.getOutputColumnCount()===2?'✅':'⬜️'} Zwei Spalten`;
        addMenuItem(oneColumnLabel,()=>this.setOutputColumnCount(1));
        addMenuItem(twoColumnLabel,()=>this.setOutputColumnCount(2));

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

      const selectionHeader=document.createElement('div');
      selectionHeader.className='nsf-selection-header';

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
      const addEventButton=document.createElement('button');
      addEventButton.type='button';
      addEventButton.className='nsf-btn nsf-selection-add';
      addEventButton.textContent='+';
      addEventButton.title='Findings-Ereignis speichern';
      addEventButton.setAttribute('aria-label',addEventButton.title);
      addEventButton.disabled=!this.eventHistoryKey||!this.selectedEntries.length;
      addEventButton.addEventListener('click',()=>{
        if(addEventButton.disabled) return;
        void this.createEventSnapshot();
      });
      const actionsWrap=document.createElement('div');
      actionsWrap.className='nsf-selection-actions';
      const customBtn=document.createElement('button');
      customBtn.type='button';
      customBtn.className='nsf-custom-finding-btn';
      customBtn.textContent='Custom Finding';
      customBtn.title='Custom Finding hinzufügen';
      customBtn.setAttribute('aria-label',customBtn.title);
      customBtn.disabled=!this.meldung;
      customBtn.addEventListener('click',()=>{
        if(customBtn.disabled) return;
        this.openCustomFindingModal();
      });
      actionsWrap.append(addEventButton,customBtn);
      heading.appendChild(actionsWrap);
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

      const selectionBody=document.createElement('div');
      selectionBody.className='nsf-selection-body';

      const selectionGrid=document.createElement('div');
      selectionGrid.className='nsf-selection-grid';
      selectionBody.appendChild(selectionGrid);

      const removalPanel=document.createElement('div');
      removalPanel.className='nsf-removal-panel';
      const removalHeader=document.createElement('div');
      removalHeader.className='nsf-removal-header';
      const removalTitle=document.createElement('div');
      removalTitle.className='nsf-removal-title';
      removalTitle.textContent='Reason for Removal';
      removalHeader.appendChild(removalTitle);
      const hasRemovalReason=!!this.removalReason;
      if(hasRemovalReason){
        const removalChip=document.createElement('span');
        removalChip.className='nsf-removal-chip';
        removalChip.textContent=this.removalReason;
        removalChip.title=this.removalReason;
        removalHeader.appendChild(removalChip);
      }
      const removalActions=document.createElement('div');
      removalActions.className='nsf-removal-actions';
      const removalOptionsCollapsed=hasRemovalReason&&this.removalOptionsCollapsed;
      if(removalOptionsCollapsed){
        removalPanel.classList.add('nsf-removal-collapsed');
      }
      const removalDisabled=!this.meldung;
      if(hasRemovalReason){
        const removalToggle=document.createElement('button');
        removalToggle.type='button';
        removalToggle.className='nsf-removal-toggle';
        removalToggle.textContent=removalOptionsCollapsed?'Ändern':'Einklappen';
        removalToggle.title=removalToggle.textContent;
        removalToggle.disabled=removalDisabled;
        removalToggle.addEventListener('click',()=>{
          if(removalToggle.disabled) return;
          this.removalOptionsCollapsed=!this.removalOptionsCollapsed;
          this.render();
        });
        removalHeader.appendChild(removalToggle);
      }
      removalPanel.appendChild(removalHeader);
      const addRemovalButton=(label,handler)=>{
        const button=document.createElement('button');
        button.type='button';
        button.className='nsf-removal-btn';
        button.textContent=label;
        button.disabled=removalDisabled;
        button.addEventListener('click',handler);
        removalActions.appendChild(button);
        return button;
      };
      addRemovalButton('confirmed.',()=>this.setRemovalReason('Reason for removal confirmed.'));
      addRemovalButton('not confirmed.',()=>this.setRemovalReason('Reason for removal not confirmed.'));
      addRemovalButton('Not provided.',()=>this.setRemovalReason('No detailed reason for removal provided by customer.'));
      addRemovalButton('Surplus',()=>{
        const input=window.prompt('Bitte geben Sie die MSN ein:','');
        if(!input) return;
        this.setRemovalReason(`Surplus as removed from MSN: ${input.trim()}`);
      });
      addRemovalButton('Other',()=>{
        const input=window.prompt('Bitte geben Sie einen eigenen Grund ein:','');
        if(!input) return;
        this.setRemovalReason(input.trim());
      });
      removalPanel.appendChild(removalActions);
      selectionGrid.appendChild(removalPanel);

      const reasonPanel=document.createElement('div');
      reasonPanel.className='nsf-reason-panel';
      const reasonTitle=document.createElement('div');
      reasonTitle.className='nsf-reason-title';
      reasonTitle.textContent='Reason';
      const reasonInput=document.createElement('textarea');
      reasonInput.className='nsf-textarea nsf-reason-textarea';
      reasonInput.placeholder='Piloten-Reasontext eingeben…';
      reasonInput.value=this.reasonText||'';
      reasonInput.disabled=!this.meldung;
      reasonInput.dataset.minRows='2';
      reasonInput.addEventListener('input',()=>{
        this.setReasonText(reasonInput.value);
        autoResizeTextarea(reasonInput);
      });
      reasonPanel.append(reasonTitle,reasonInput);
      selectionGrid.appendChild(reasonPanel);
      this.reasonTextarea=reasonInput;
      ensureTextareaAutoResize(reasonInput);

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
      }
      if(note.textContent){
        selectionBody.appendChild(note);
      }

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
      selectionGrid.appendChild(inputsWrapper);
      this.inputsContainer=inputsWrapper;

      const showExchangeInputs=this.shouldShowExchangeInputs();
      if(showExchangeInputs){
        const exchangePanel=document.createElement('div');
        exchangePanel.className='nsf-exchange-panel';
        const exchangeTitle=document.createElement('div');
        exchangeTitle.className='nsf-exchange-title';
        exchangeTitle.textContent='SRU Exchange';
        const exchangeFields=document.createElement('div');
        exchangeFields.className='nsf-exchange-fields';
        const buildField=(labelText,value,handler)=>{
          const field=document.createElement('div');
          field.className='nsf-exchange-field';
          const label=document.createElement('label');
          label.className='nsf-exchange-label';
          label.textContent=labelText;
          const input=document.createElement('input');
          input.type='text';
          input.className='nsf-exchange-input';
          input.value=value||'';
          input.disabled=!this.meldung;
          input.placeholder=`${labelText}…`;
          input.addEventListener('input',()=>handler(input.value));
          field.append(label,input);
          return field;
        };
        exchangeFields.append(
          buildField('Exchange Input',this.exchangeInputText,value=>this.setExchangeInputText(value)),
          buildField('Exchange Output',this.exchangeOutputText,value=>this.setExchangeOutputText(value))
        );
        exchangePanel.append(exchangeTitle,exchangeFields);
        selectionBody.appendChild(exchangePanel);
      }

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
      const columnCount=this.getOutputColumnCount();
      if(columnCount===2){
        outputsLayout.classList.add('has-columns');
      }
      outputsSection.appendChild(outputsLayout);

      let primaryColumn=null;
      let secondaryColumn=null;
      let footerColumn=null;
      if(columnCount===2){
        primaryColumn=document.createElement('div');
        primaryColumn.className='nsf-outputs nsf-outputs-column';
        secondaryColumn=document.createElement('div');
        secondaryColumn.className='nsf-outputs nsf-outputs-column';
        footerColumn=document.createElement('div');
        footerColumn.className='nsf-outputs nsf-outputs-full';
        outputsLayout.append(primaryColumn,secondaryColumn,footerColumn);
      }else{
        primaryColumn=document.createElement('div');
        primaryColumn.className='nsf-outputs nsf-outputs-column';
        outputsLayout.appendChild(primaryColumn);
        footerColumn=primaryColumn;
      }

      const resolveOutputContainer=key=>{
        if(columnCount===2){
          if(key==='findings'||key==='actions') return primaryColumn;
          if(key==='routine'||key==='nonroutine') return secondaryColumn;
          return footerColumn;
        }
        return primaryColumn;
      };

      this.textareas={};
      this.partsFieldContainer=null;
      this.customSlots=[];
      const hideNonroutineOutput=this.shouldHideNonroutineOutput();
      OUTPUT_DEFS.forEach((def,idx)=>{
        const targetContainer=resolveOutputContainer(def.key)||primaryColumn;
        targetContainer.appendChild(this.createCustomSlot(idx));
        if(def.key==='nonroutine'&&hideNonroutineOutput){
          return;
        }
        const box=document.createElement('div');
        box.className='nsf-output';
        const head=document.createElement('div');
        head.className='nsf-output-header';
        const label=document.createElement('span');
        label.textContent=def.label;
        head.append(label);
        let textarea;
        if(def.key==='parts'){
          textarea=document.createElement('textarea');
          textarea.className='nsf-textarea nsf-output-textarea nsf-hidden';
          textarea.value='';
          textarea.disabled=!this.meldung;
          textarea.readOnly=true;
          textarea.placeholder=this.meldung?`Text für ${def.label}…`:'Keine Meldung ausgewählt';
          textarea.dataset.minRows='4';
          this.textareas[def.key]=textarea;
          box.append(head,textarea);
          ensureTextareaAutoResize(textarea);
          const partsContainer=document.createElement('div');
          partsContainer.className='nsf-parts-container';
          this.partsFieldContainer=partsContainer;
          box.appendChild(partsContainer);
        }else{
          textarea=document.createElement('textarea');
          textarea.className='nsf-textarea nsf-output-textarea';
          textarea.value='';
          textarea.disabled=!this.meldung;
          textarea.readOnly=true;
          textarea.placeholder=this.meldung?`Text für ${def.label}…`:'Keine Meldung ausgewählt';
          textarea.dataset.minRows='4';
          this.textareas[def.key]=textarea;
          box.append(head,textarea);
          ensureTextareaAutoResize(textarea);
          textarea.addEventListener('click',event=>{
            if(event.button!==0) return;
            const value=textarea.value;
            if(!value) return;
            copyText(value).then(success=>{
              if(!success) return;
              textarea.classList.add('copied');
              setTimeout(()=>textarea.classList.remove('copied'),1200);
            });
          });
        }
        targetContainer.appendChild(box);
      });
      (resolveOutputContainer('parts')||footerColumn||primaryColumn)
        .appendChild(this.createCustomSlot(OUTPUT_DEFS.length));

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
      if(block.dataset){
        block.dataset.blockId=`${ROUTINE_EDITOR_CUSTOM_PREFIX}${section.id}`;
      }
      const handle=document.createElement('div');
      handle.className='nsf-custom-handle';
      handle.textContent='⠿';
      handle.title='Zum Verschieben ziehen';
      block.appendChild(handle);
      const textarea=document.createElement('textarea');
      textarea.className='nsf-custom-textarea';
      textarea.placeholder='Eigener Text…';
      textarea.value=section.text||'';
      textarea.dataset.minRows='2';
      textarea.addEventListener('input',()=>{
        section.text=textarea.value;
        autoResizeTextarea(textarea);
        this.syncCustomSectionsToActiveState();
      });
      block.appendChild(textarea);
      ensureTextareaAutoResize(textarea);
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
          onAdd:evt=>{
            const targetList=evt?.to instanceof HTMLElement?evt.to:null;
            if(targetList){
              const ids=Array.from(targetList.children||[])
                .filter(node=>node instanceof HTMLElement)
                .map(node=>node.dataset&&node.dataset.blockId?node.dataset.blockId:'')
                .filter(Boolean);
              this.dragShadowOrder=ids;
              const targetSlot=Array.isArray(this.customSlots)
                ?this.customSlots.find(entry=>entry&&entry.list===targetList)
                :null;
              if(targetSlot) this.updateCustomSlotState(targetSlot);
            }
          },
          onRemove:evt=>{
            const sourceList=evt?.from instanceof HTMLElement?evt.from:null;
            if(sourceList){
              const ids=Array.from(sourceList.children||[])
                .filter(node=>node instanceof HTMLElement)
                .map(node=>node.dataset&&node.dataset.blockId?node.dataset.blockId:'')
                .filter(Boolean);
              this.dragShadowOrder=ids;
              const sourceSlot=Array.isArray(this.customSlots)
                ?this.customSlots.find(entry=>entry&&entry.list===sourceList)
                :null;
              if(sourceSlot) this.updateCustomSlotState(sourceSlot);
            }
          },
          onStart:evt=>{
            if(evt?.item) evt.item.classList.add('dragging');
            this.setCustomSlotDragging(true);
          },
          onEnd:evt=>{
            if(evt?.item) evt.item.classList.remove('dragging');
            this.setCustomSlotDragging(false);
            const fromList=evt?.from instanceof HTMLElement?evt.from:null;
            const toList=evt?.to instanceof HTMLElement?evt.to:null;
            const ids=toList
              ?Array.from(toList.children||[])
                .filter(node=>node instanceof HTMLElement)
                .map(node=>node.dataset&&node.dataset.blockId?node.dataset.blockId:'')
                .filter(Boolean)
              :[];
            this.dragShadowOrder=ids;
            console.log('Neue dragShadowOrder:',this.dragShadowOrder);
            const sourceSlot=Array.isArray(this.customSlots)
              ?this.customSlots.find(entry=>entry&&entry.list===fromList)
              :null;
            const targetSlot=Array.isArray(this.customSlots)
              ?this.customSlots.find(entry=>entry&&entry.list===toList)
              :null;
            if(sourceSlot) this.updateCustomSlotState(sourceSlot);
            if(targetSlot&&targetSlot!==sourceSlot) this.updateCustomSlotState(targetSlot);
            if(typeof this.renderRoutineEditorOverlayContent==='function'){
              const activeTab=this.getActiveRoutineEditorTab
                ?this.getActiveRoutineEditorTab()
                :undefined;
              this.renderRoutineEditorOverlayContent(activeTab);
            }
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
        this.rawFindings=[];
        this.rawActions=[];
        this.rawRoutine=[];
        this.rawSpareFindings=[];
        this.rawNonroutineFindings=[];
        this.rawParts=[];
        this.rawTimes=[];
        this.rawMods=[];
        this.currentLabel='';
        this.partsEntry=null;
        return {findings:'',actions:'',routine:'',nonroutine:'',parts:'',partsEntry:null};
      }
      const lists={
        findings:[],
        actions:[],
        routine:[],
        nonroutine:[],
        spareFindings:[]
      };
      const seen={
        findings:new Set(),
        actions:new Set(),
        routine:new Set(),
        nonroutine:new Set(),
        spareFindings:new Set()
      };
      const timeEntries=[];
      const timeKeys=new Set();
      const modEntries=[];
      const modKeys=new Set();
      let primaryLabel='';
      const groupedParts=new Map();
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
      const addTimeEntry=(label,value)=>{
        const labelText=clean(label);
        const valueText=clean(value);
        if(!labelText&&!valueText) return;
        const key=`${labelText.toLowerCase()}||${valueText.toLowerCase()}`;
        if(timeKeys.has(key)) return;
        timeKeys.add(key);
        timeEntries.push({label:labelText,value:valueText});
      };
      const collectTimes=entry=>{
        const timesObj=nsfGetTimes(entry);
        let handled=false;
        if(timesObj&&typeof timesObj==='object'){
          Object.entries(timesObj).forEach(([rawKey,rawValue])=>{
            const valueText=clean(rawValue);
            if(!valueText) return;
            handled=true;
            const labelBase=clean(rawKey).replace(/_/g,' ').trim();
            const labelText=labelBase?labelBase.charAt(0).toUpperCase()+labelBase.slice(1):'';
            addTimeEntry(labelText,valueText);
          });
        }
        if(handled) return;
        const legacyText=clean(entry&&entry.times);
        if(!legacyText) return;
        legacyText.split(/\r?\n/)
          .map(line=>clean(line))
          .filter(Boolean)
          .forEach(line=>{
            const idx=line.indexOf(':');
            if(idx> -1){
              const label=line.slice(0,idx);
              const value=line.slice(idx+1);
              addTimeEntry(label,value);
            }else{
              addTimeEntry('',line);
            }
          });
      };
      const collectMods=entry=>{
        const modsList=nsfGetMods(entry).map(item=>clean(item)).filter(Boolean);
        if(modsList.length){
          modsList.forEach(mod=>{
            const key=mod.toLowerCase();
            if(modKeys.has(key)) return;
            modKeys.add(key);
            modEntries.push(mod);
          });
          return;
        }
        const raw=clean(entry&&entry.mods);
        if(!raw) return;
        raw.split(/\r?\n/)
          .map(line=>clean(line))
          .filter(Boolean)
          .forEach(line=>{
            if(modKeys.has(line.toLowerCase())) return;
            modKeys.add(line.toLowerCase());
            modEntries.push(line);
          });
      };
      const addGroupedPart=(status,label,part,quantity)=>{
        const statusKey=status||DEFAULT_FINDING_STATUS;
        let statusGroup=groupedParts.get(statusKey);
        if(!statusGroup){
          statusGroup=new Map();
          groupedParts.set(statusKey,statusGroup);
        }
        const labelKey=label||'';
        let labelGroup=statusGroup.get(labelKey);
        if(!labelGroup){
          labelGroup=[];
          statusGroup.set(labelKey,labelGroup);
        }
        labelGroup.push({part,quantity});
      };
      const aggregatedParts=[];
      const partNumberDisplay=[];
      const partNumberSeen=new Set();
      const appliesDisplay=[];
      const appliesSeen=new Set();
      for(const selection of this.selectedEntries){
        const resolved=this.resolveEntry(selection)||selection;
        const findingText=this.replaceExchangeKeywords(resolved.finding||selection.finding||'');
        pushLines('findings',findingText);
        const actionText=this.replaceExchangeKeywords(resolved.action||selection.action||'');
        pushLines('actions',actionText);
        const statusValue=normalizeFindingStatus(selection.status)||DEFAULT_FINDING_STATUS;
        const labelValue=clean(resolved.label||selection.label||findingText||actionText)||'Unbenannt';
        if(!primaryLabel){
          const labelCandidate=clean(resolved.label||selection.label||'');
          if(labelCandidate) primaryLabel=labelCandidate;
        }
        if(statusValue==='Spare'){
          pushLines('spareFindings',findingText);
        }
        const nonroutineText=this.replaceExchangeKeywords(
          resolved.nonroutineFinding||resolved.nonroutine||selection.nonroutineFinding||selection.nonroutine||''
        );
        if(nonroutineText){
          const stripped=stripNonRoutineFindingPrefix(nonroutineText);
          const sanitized=sanitizeNonRoutineOutput(stripped);
          pushLines('nonroutine',sanitized);
        }
        const routineText=this.replaceExchangeKeywords(this.buildRoutineOutput(resolved));
        pushBlock('routine',routineText);
        collectTimes(resolved);
        collectMods(resolved);
        const masterCandidates=[
          resolved.partNumber,
          resolved.part,
          selection.partNumber,
          selection.part
        ];
        masterCandidates.forEach(candidate=>{
          const display=clean(candidate);
          if(!display) return;
          const normalized=normalizePart(display);
          if(!normalized||partNumberSeen.has(normalized)) return;
          partNumberSeen.add(normalized);
          partNumberDisplay.push(display);
        });
        const appliesCandidates=[
          ...nsfGetAppliesTo(resolved),
          ...nsfGetAppliesTo(selection)
        ]
          .map(value=>clean(value))
          .filter(Boolean);
        appliesCandidates.forEach(value=>{
          const normalized=normalizePart(value);
          if(!normalized) return;
          if(partNumberSeen.has(normalized)||appliesSeen.has(normalized)) return;
          appliesSeen.add(normalized);
          appliesDisplay.push(value);
        });
        const resolvedPairs=normalizePartsPairs(resolved);
        if(Array.isArray(resolvedPairs)&&resolvedPairs.length){
          resolvedPairs.forEach(pair=>{
            const partText=clean(pair.part);
            if(!partText) return;
            const quantityText=clean(pair.quantity)||'1';
            aggregatedParts.push({part:partText,quantity:quantityText});
            addGroupedPart(statusValue,labelValue,partText,quantityText);
          });
        }
      }
      const normalizedPairs=aggregatedParts.map(pair=>({part:pair.part,quantity:pair.quantity}));
      const partsLines=[];
      const statusOrder=[...new Set([...FINDING_STATUS_OPTIONS,DEFAULT_FINDING_STATUS])];
      const extraStatuses=Array.from(groupedParts.keys()).filter(status=>!statusOrder.includes(status));
      const orderedStatuses=[...statusOrder.filter(status=>groupedParts.has(status)),...extraStatuses];
      orderedStatuses.forEach(status=>{
        const labelGroups=groupedParts.get(status);
        if(!labelGroups) return;
        partsLines.push(`${status}:`);
        labelGroups.forEach((partsList,label)=>{
          const labelText=label||'Unbenannt';
          partsLines.push(`  ${labelText}:`);
          partsList.forEach(pair=>{
            const qty=nsfFormatQuantity(pair.quantity||'');
            const part=pair.part||'';
            if(!part) return;
            partsLines.push(`    ${qty?`${qty}x `:''}${part}`);
          });
        });
        partsLines.push('');
      });
      if(partsLines[partsLines.length-1]==='') partsLines.pop();
      const partsText=partsLines.join('\n');
      const partNumberHeader=partNumberDisplay.join(' • ');
      const appliesList=appliesDisplay.slice();
      const normalizedPartsForEntry=normalizedPairs.map(pair=>({part:pair.part,quantity:pair.quantity}));
      const groupedPartsForEntry=orderedStatuses.map(status=>{
        const labelGroups=groupedParts.get(status);
        const labels=[];
        if(labelGroups){
          labelGroups.forEach((partsList,label)=>{
            labels.push({
              label,
              parts:partsList.map(pair=>({part:pair.part,quantity:pair.quantity}))
            });
          });
        }
        return {status,labels};
      }).filter(group=>group.labels.length);
      const partsEntry=(partNumberHeader||appliesList.length||normalizedPartsForEntry.length)
        ?{
            partNumber:partNumberHeader,
            partNumbers:partNumberDisplay.slice(),
            appliesTo:appliesList,
            parts:normalizedPartsForEntry,
            partsPairs:normalizedPartsForEntry,
            groups:groupedPartsForEntry
          }
        :null;
      const placeholderPairs=normalizedPairs.map(pair=>({
        part:pair.part,
        quantity:pair.quantity,
        name:pair.part,
        qty:pair.quantity
      }));
      this.rawFindings=lists.findings.slice();
      this.rawActions=lists.actions.slice();
      this.rawRoutine=lists.routine.slice();
      this.rawSpareFindings=lists.spareFindings.slice();
      this.rawNonroutineFindings=lists.nonroutine.slice();
      this.rawParts=placeholderPairs;
      this.rawTimes=timeEntries.slice();
      this.rawMods=modEntries.slice();
      this.currentLabel=primaryLabel;
      this.partsEntry=partsEntry;
      return {
        findings:lists.findings.join('\n'),
        actions:lists.actions.join('\n'),
        routine:lists.routine.join('\n\n'),
        nonroutine:lists.nonroutine.join('\n'),
        parts:partsText,
        partsEntry:partsEntry
      };
    }

    buildBestelllisteCopyText(){
      const partsSource=(this.partsEntry&&Array.isArray(this.partsEntry.parts)&&this.partsEntry.parts.length)
        ? this.partsEntry.parts
        : (Array.isArray(this.rawParts)?this.rawParts:[]);
      const normalized=nsfNormalizeParts({parts:partsSource});
      if(!normalized.length) return '';
      const gap='\t\t\t\t';
      return normalized
        .map(pair=>{
          const part=clean(pair.part||'');
          if(!part) return '';
          const qty=nsfFormatQuantity(clean(pair.quantity||pair.menge)||'1')||'1';
          return `${part}${gap}${qty}\t${qty}`;
        })
        .filter(Boolean)
        .join('\n');
    }

    syncOutputsWithSelections(options){
      const opts=options||{};
      const computed=this.buildOutputsFromSelections();
      const effectiveEntry=opts.forceEmpty?null:(computed.partsEntry||null);
      this.partsEntry=effectiveEntry;
      let changed=false;
      const storedTemplate=typeof this.activeState?.freitextTemplate==='string'?this.activeState.freitextTemplate:'';
      const legacyRoutine=typeof this.activeState?.routine==='string'?this.activeState.routine:'';
      const computedRoutine=typeof computed.routine==='string'?computed.routine:'';
      const profileTemplate=this.getRoutineEditorFreitextTemplate('routine');
      let effectiveTemplate=profileTemplate||storedTemplate;
      if(!opts.forceEmpty){
        if(profileTemplate&&this.activeState&&typeof this.activeState==='object'&&this.activeState.freitextTemplate!==profileTemplate){
          this.activeState.freitextTemplate=profileTemplate;
          changed=true;
        }
        if(!profileTemplate&&storedTemplate){
          this.setRoutineEditorFreitextTemplate(storedTemplate,'routine');
          effectiveTemplate=storedTemplate;
        }
        if(!effectiveTemplate&&legacyRoutine){
          if(/\{[a-z]+\}/i.test(legacyRoutine)||legacyRoutine!==computedRoutine){
            effectiveTemplate=legacyRoutine;
            if(this.activeState&&typeof this.activeState==='object'){
              this.activeState.freitextTemplate=legacyRoutine;
              changed=true;
            }
            if(!profileTemplate){
              this.setRoutineEditorFreitextTemplate(legacyRoutine,'routine');
            }
          }
        }
      }
      for(const key of OUTPUT_KEYS){
        let value=opts.forceEmpty?'' : computed[key]||'';
        if(!opts.forceEmpty){
          if(key==='routine'&&effectiveTemplate){
            value=this.expandPlaceholders(effectiveTemplate,{tabKey:key});
          }else{
            const template=this.getRoutineEditorFreitextTemplate(key);
            if(template){
              value=this.expandPlaceholders(template,{tabKey:key});
            }
          }
        }
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
      this.renderPartsRows(this.partsEntry);
      this.refreshRoutineEditorDerivedLines(computed);
      if(changed&&opts.persist!==false){
        this.queueStateSave();
      }
    }

    renderPartsRows(entry){
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
      renderFindingPartsWithGlobalMapping(container,entry||null);
    }

    buildPartsRowMapping(rowData){
      if(!rowData||typeof rowData!=='object') return null;
      const mapping={
        index:extractRowIndex(rowData.pnLabel)||extractRowIndex(rowData.partLabel)||extractRowIndex(rowData.quantityLabel),
        pnLabel:clean(rowData.pnLabel),
        pnValue:clean(rowData.pnValue),
        partLabel:clean(rowData.partLabel),
        partValue:clean(rowData.partValue),
        quantityLabel:clean(rowData.quantityLabel),
        quantityValue:clean(rowData.quantityValue)
      };
      if(mapping.index==null) delete mapping.index;
      // PATCH START: Ignore non-part info PN texts
      const pnLower=(mapping.pnValue||'').toLowerCase();
      const looksLikeInfo=pnLower&&!/[0-9]/.test(pnLower)&&/keine teile|no parts|nicht zutreffend|n\/a/.test(pnLower);
      if(looksLikeInfo) return null;
      // PATCH END
      const hasValue=(mapping.pnValue||mapping.partValue||mapping.quantityValue);
      if(!hasValue) return null;
      return mapping;
    }

    getPartsRowFindingMappingEntries(rowData,sources){
      const mapping=this.buildPartsRowMapping(rowData);
      if(!mapping) return [];
      const normalizedSources=Array.isArray(sources)?sources.filter(src=>src&&typeof src==='object'):[];
      if(!normalizedSources.length){
        return [{mapping:{...mapping}}];
      }
      return normalizedSources.map(source=>{
        const entry={
          key:clean(source.key),
          label:clean(source.label||source.finding||''),
          finding:clean(source.finding),
          action:clean(source.action),
          part:clean(source.part),
          mapping:{...mapping}
        };
        if(source.entry&&typeof source.entry==='object'){
          entry.entry=cloneDeep(source.entry);
        }
        return entry;
      });
    }

    serializePartsRowFindingMapping(entries){
      if(!Array.isArray(entries)||!entries.length) return '';
      const payload=entries.length===1?entries[0]:entries;
      return safeJsonStringify(payload,{skipKeys:['raw']});
    }

    copyPartsRowFindingMapping(rowData,sources){
      const entries=this.getPartsRowFindingMappingEntries(rowData,sources);
      const text=this.serializePartsRowFindingMapping(entries);
      if(!text) return;
      copyText(text).then(success=>{
        if(!success) console.warn('NSF: Mapping konnte nicht kopiert werden');
      });
    }

    openPartsRowContextMenu(event,rowData,sources){
      if(this.destroyed) return;
      this.closePartsRowContextMenu();
      const normalizedSources=Array.isArray(sources)?sources.filter(src=>src&&typeof src==='object'):[];
      const clientX=event&&typeof event.clientX==='number'?event.clientX:0;
      const clientY=event&&typeof event.clientY==='number'?event.clientY:0;
      const entries=this.getPartsRowFindingMappingEntries(rowData,normalizedSources);
      const mappingText=this.serializePartsRowFindingMapping(entries);
      const hasMapping=Boolean(mappingText);
      const menu=document.createElement('div');
      menu.className='nsf-part-context-menu';
      const context={
        pnText:rowData?rowData.pnValue:'',
        partText:rowData?rowData.partValue:'',
        quantityText:rowData?rowData.quantityValue:''
      };
      const addButton=(label,handler,options)=>{
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='nsf-part-context-menu-btn';
        btn.textContent=label;
        if(options&&options.disabled) btn.disabled=true;
        btn.addEventListener('click',()=>{
          if(btn.disabled) return;
          this.closePartsRowContextMenu();
          handler();
        });
        menu.appendChild(btn);
        return btn;
      };
      addButton('JSON-Daten anzeigen',()=>{
        if(!normalizedSources.length){
          return;
        }
        this.openFindingJsonModal(normalizedSources,context);
      },{disabled:!normalizedSources.length});
      if(hasMapping){
        const divider=document.createElement('div');
        divider.className='nsf-part-context-menu-divider';
        menu.appendChild(divider);
      }
      addButton('Finding inkl. Mapping kopieren',()=>{
        this.copyPartsRowFindingMapping(rowData,normalizedSources);
      },{disabled:!hasMapping});
      document.body.appendChild(menu);
      const positionMenu=()=>{
        const rect=menu.getBoundingClientRect();
        const margin=8;
        const maxLeft=Math.max(margin,window.innerWidth-rect.width-margin);
        const maxTop=Math.max(margin,window.innerHeight-rect.height-margin);
        const left=Math.min(Math.max(margin,clientX),maxLeft);
        const top=Math.min(Math.max(margin,clientY),maxTop);
        menu.style.left=`${left}px`;
        menu.style.top=`${top}px`;
      };
      positionMenu();
      const outsideHandler=ev=>{
        if(menu.contains(ev.target)) return;
        this.closePartsRowContextMenu();
      };
      const keyHandler=ev=>{
        if(ev.key==='Escape'||ev.key==='Esc'){
          ev.preventDefault();
          this.closePartsRowContextMenu();
        }
      };
      const scrollHandler=()=>this.closePartsRowContextMenu();
      const resizeHandler=()=>{
        positionMenu();
      };
      const blurHandler=()=>this.closePartsRowContextMenu();
      window.addEventListener('pointerdown',outsideHandler,true);
      window.addEventListener('keydown',keyHandler,true);
      window.addEventListener('scroll',scrollHandler,true);
      window.addEventListener('resize',resizeHandler,true);
      window.addEventListener('blur',blurHandler);
      menu.addEventListener('contextmenu',ev=>{
        ev.preventDefault();
      });
      this.partsContextMenuCleanup=()=>{
        window.removeEventListener('pointerdown',outsideHandler,true);
        window.removeEventListener('keydown',keyHandler,true);
        window.removeEventListener('scroll',scrollHandler,true);
        window.removeEventListener('resize',resizeHandler,true);
        window.removeEventListener('blur',blurHandler);
      };
      this.partsContextMenu=menu;
    }

    closePartsRowContextMenu(){
      if(this.partsContextMenu&&this.partsContextMenu.parentNode){
        this.partsContextMenu.parentNode.removeChild(this.partsContextMenu);
      }
      this.partsContextMenu=null;
      if(this.partsContextMenuCleanup){
        this.partsContextMenuCleanup();
        this.partsContextMenuCleanup=null;
      }
    }

    closeFindingJsonModal(){
      if(this.findingJsonOverlay){
        this.findingJsonOverlay.remove();
        this.findingJsonOverlay=null;
      }
      if(this.findingJsonModalKeyHandler){
        document.removeEventListener('keydown',this.findingJsonModalKeyHandler);
        this.findingJsonModalKeyHandler=null;
      }
      if(this.findingJsonBodyOverflow!=null){
        document.body.style.overflow=this.findingJsonBodyOverflow||'';
        this.findingJsonBodyOverflow='';
      }
    }

    closeCustomFindingModal(){
      if(this.customFindingOverlay){
        this.customFindingOverlay.remove();
        this.customFindingOverlay=null;
      }
      if(this.customFindingModalKeyHandler){
        document.removeEventListener('keydown',this.customFindingModalKeyHandler);
        this.customFindingModalKeyHandler=null;
      }
      if(this.customFindingBodyOverflow!=null){
        document.body.style.overflow=this.customFindingBodyOverflow||'';
        this.customFindingBodyOverflow='';
      }
    }

    closeFindingsEditorOverlay(){
      if(this.findingsEditorInstance&&typeof this.findingsEditorInstance.destroy==='function'){
        this.findingsEditorInstance.destroy();
      }
      this.findingsEditorInstance=null;
      if(this.findingsEditorOverlay){
        this.findingsEditorOverlay.remove();
        this.findingsEditorOverlay=null;
      }
      if(this.findingsEditorKeyHandler){
        document.removeEventListener('keydown',this.findingsEditorKeyHandler);
        this.findingsEditorKeyHandler=null;
      }
      if(this.findingsEditorBodyOverflow!=null){
        document.body.style.overflow=this.findingsEditorBodyOverflow||'';
        this.findingsEditorBodyOverflow='';
      }
    }

    openFindingsEditorOverlay(){
      if(this.destroyed) return;
      this.closeFindingsEditorOverlay();
      const overlay=document.createElement('div');
      overlay.className='nsf-custom-overlay open';
      overlay.tabIndex=-1;
      const modal=document.createElement('div');
      modal.className='nsf-custom-modal nsf-findings-editor-modal';
      overlay.appendChild(modal);
      const header=document.createElement('div');
      header.className='nsf-custom-header';
      const title=document.createElement('div');
      title.className='nsf-custom-title';
      title.textContent='Standardfinding speichern';
      const closeBtn=document.createElement('button');
      closeBtn.type='button';
      closeBtn.className='nsf-custom-close';
      closeBtn.setAttribute('aria-label','Modal schließen');
      closeBtn.textContent='×';
      closeBtn.addEventListener('click',()=>this.closeFindingsEditorOverlay());
      header.append(title,closeBtn);
      modal.appendChild(header);
      const divider=document.createElement('div');
      divider.className='nsf-custom-divider';
      modal.appendChild(divider);
      const container=document.createElement('div');
      container.className='nsf-findings-editor-container';
      modal.appendChild(container);
      if(typeof window.renderShopguideFindingsEditor==='function'){
        this.findingsEditorInstance=window.renderShopguideFindingsEditor(container);
        if(this.findingsEditorInstance&&typeof this.findingsEditorInstance.applyPrefillEntryFromStorage==='function'){
          this.findingsEditorInstance.applyPrefillEntryFromStorage();
        }
        if(this.findingsEditorInstance&&typeof this.findingsEditorInstance.applyEditTargetFromStorage==='function'){
          this.findingsEditorInstance.applyEditTargetFromStorage();
        }
      }else{
        const note=document.createElement('div');
        note.className='nsf-custom-note';
        note.textContent='Der Findings-Editor ist nicht geladen. Bitte Modul Shopguide_Findings Editor öffnen.';
        container.appendChild(note);
      }
      overlay.addEventListener('click',event=>{
        if(event.target===overlay) this.closeFindingsEditorOverlay();
      });
      const keyHandler=event=>{
        if(event.key==='Escape'||event.key==='Esc'){
          event.preventDefault();
          this.closeFindingsEditorOverlay();
        }
      };
      document.addEventListener('keydown',keyHandler);
      this.findingsEditorKeyHandler=keyHandler;
      document.body.appendChild(overlay);
      this.findingsEditorBodyOverflow=document.body.style.overflow;
      document.body.style.overflow='hidden';
      this.findingsEditorOverlay=overlay;
      requestAnimationFrame(()=>overlay.focus());
    }

    openFindingsEditorForEntry(entry){
      if(this.destroyed||!entry) return;
      const resolved=this.resolveEntry(entry)||entry;
      const partNumbers=Array.isArray(resolved.partNumbers)
        ? resolved.partNumbers.map(item=>clean(item)).filter(Boolean)
        : [];
      const partsPairs=Array.isArray(resolved.parts)
        ? resolved.parts.map(item=>{
            const part=clean(item?.part||'');
            if(!part) return null;
            const quantity=clean(item?.menge??item?.quantity??'');
            return {part,quantity};
          }).filter(Boolean)
        : [];
      const target={
        sourceKey:clean(resolved.key||entry.key),
        label:clean(resolved.label||''),
        findings:clean(resolved.finding||''),
        actions:clean(resolved.action||''),
        routineAction:clean(resolved.routineAction||resolved.routineActions||''),
        nonroutine:clean(resolved.nonroutine||''),
        partNumbers,
        partsPairs
      };
      try{
        localStorage.setItem(FINDINGS_EDITOR_EDIT_STORAGE_KEY,JSON.stringify(target));
      }catch(err){
        console.warn('NSF: Edit-Target konnte nicht gespeichert werden',err);
      }
      window.__shopguideFindingsEditTarget=target;
      this.openFindingsEditorOverlay();
      if(this.findingsEditorInstance&&typeof this.findingsEditorInstance.applyEditTargetFromStorage==='function'){
        this.findingsEditorInstance.applyEditTargetFromStorage();
      }
    }

    launchFindingsEditorPrefill(payload){
      if(!payload||typeof payload!=='object') return;
      const partsPairs=Array.isArray(payload.parts)
        ? payload.parts.map(item=>({
            part:clean(item.part),
            quantity:clean(item.quantity)
          })).filter(item=>item.part)
        : [];
      const partNumber=clean(this.currentPart||'');
      const partNumbers=partNumber?[partNumber]:[];
      const prefill={
        label:clean(payload.label),
        findings:clean(payload.finding),
        actions:clean(payload.action),
        routineAction:clean(payload.routineAction),
        nonroutine:clean(payload.nonroutine),
        partsPairs,
        partNumbers
      };
      try{
        localStorage.setItem(FINDINGS_EDITOR_PREFILL_STORAGE_KEY,JSON.stringify(prefill));
      }catch(err){
        console.warn('NSF: Prefill konnte nicht gespeichert werden',err);
      }
      window.__shopguideFindingsPrefill=prefill;
      const existingEditor=window.__shopguideFindingsEditorInstance;
      if(existingEditor&&typeof existingEditor.applyPrefillEntryFromStorage==='function'){
        existingEditor.applyPrefillEntryFromStorage();
      }
      this.openFindingsEditorOverlay();
    }

    buildCustomFindingEntry(payload){
      if(!payload||typeof payload!=='object') return null;
      const parts=Array.isArray(payload.parts)
        ? payload.parts.map(item=>{
            const part=clean(item.part);
            if(!part) return null;
            const quantity=clean(item.quantity);
            const entry={part};
            if(quantity) entry.menge=quantity;
            return entry;
          }).filter(Boolean)
        : [];
      const partsText=parts.length
        ? parts.map(item=>{
            const qty=clean(item.menge);
            if(qty&&qty!=='1') return `${qty}x ${item.part}`;
            return item.part;
          }).filter(Boolean).join('\n')
        : '';
      const partNumber=clean(this.currentPart||'');
      return {
        key:createCustomFindingId(),
        part:partNumber||'',
        partNumbers:partNumber?[partNumber]:[],
        appliesTo:[],
        label:clean(payload.label),
        finding:clean(payload.finding),
        action:clean(payload.action),
        routineAction:clean(payload.routineAction),
        routineFinding:'',
        nonroutineFinding:clean(payload.nonroutine),
        nonroutineAction:'',
        routine:'',
        nonroutine:'',
        parts,
        partsText,
        times:{},
        timesText:'',
        mods:[],
        modsText:'',
        additional:[],
        additionalLower:[],
        labelLower:clean(payload.label).toLowerCase(),
        findingLower:clean(payload.finding).toLowerCase(),
        actionLower:clean(payload.action).toLowerCase(),
        routineLower:clean(payload.routineAction).toLowerCase(),
        routineFindingLower:'',
        routineActionLower:clean(payload.routineAction).toLowerCase(),
        nonroutineLower:clean(payload.nonroutine).toLowerCase(),
        nonroutineFindingLower:clean(payload.nonroutine).toLowerCase(),
        nonroutineActionLower:'',
        partsLower:partsText.toLowerCase(),
        timesLower:'',
        modsLower:'',
        raw:{}
      };
    }

    insertCustomFindingSelection(entry,statusValue,options={}){
      if(!entry) return;
      const normalizedStatus=normalizeFindingStatus(statusValue)||DEFAULT_FINDING_STATUS;
      const allowInsert=options.allowInsert!==false;
      if(allowInsert&&this.meldung){
        let target=this.selectionRows.find(row=>!row.locked);
        if(!target){
          this.addInputRow(null,false);
          target=this.selectionRows.find(row=>!row.locked);
        }
        if(target){
          if(target.ensureStatusOption) target.ensureStatusOption(normalizedStatus);
          if(target.statusSelect) target.statusSelect.value=normalizedStatus;
          target.statusValue=normalizedStatus;
          this.acceptSelection(entry,target);
          this.render();
          return;
        }
      }
      const selectionStatus=normalizedStatus||'';
      this.addSelection(entry,selectionStatus);
      this.syncOutputsWithSelections({persist:false});
      this.persistState(true);
      this.render();
    }

    openCustomFindingModal(){
      if(this.destroyed) return;
      this.closeCustomFindingModal();
      const overlay=document.createElement('div');
      overlay.className='nsf-custom-overlay open';
      overlay.tabIndex=-1;
      const modal=document.createElement('div');
      modal.className='nsf-custom-modal';
      overlay.appendChild(modal);
      const header=document.createElement('div');
      header.className='nsf-custom-header';
      const title=document.createElement('div');
      title.className='nsf-custom-title';
      title.textContent='Custom Finding hinzufügen';
      const closeBtn=document.createElement('button');
      closeBtn.type='button';
      closeBtn.className='nsf-custom-close';
      closeBtn.setAttribute('aria-label','Modal schließen');
      closeBtn.textContent='×';
      closeBtn.addEventListener('click',()=>this.closeCustomFindingModal());
      header.append(title,closeBtn);
      modal.appendChild(header);
      const hint=document.createElement('div');
      hint.className='nsf-custom-note';
      hint.textContent='Fülle die standardisierten Textstücke und die Bestellnummern aus.';
      modal.appendChild(hint);
      const grid=document.createElement('div');
      grid.className='nsf-custom-grid';
      const buildField=(labelText,input)=>{
        const field=document.createElement('div');
        field.className='nsf-custom-field';
        const label=document.createElement('label');
        label.className='nsf-custom-label';
        label.textContent=labelText;
        field.append(label,input);
        return field;
      };
      const labelInput=document.createElement('input');
      labelInput.type='text';
      labelInput.className='nsf-custom-input';
      labelInput.placeholder='Label (optional)';
      grid.appendChild(buildField('Label',labelInput));
      const statusSelect=document.createElement('select');
      statusSelect.className='nsf-custom-select';
      FINDING_STATUS_OPTIONS.forEach(option=>{
        const opt=document.createElement('option');
        opt.value=option;
        opt.textContent=option;
        statusSelect.appendChild(opt);
      });
      statusSelect.value=DEFAULT_FINDING_STATUS;
      grid.appendChild(buildField('Status',statusSelect));
      const findingTextarea=document.createElement('textarea');
      findingTextarea.className='nsf-custom-textarea';
      findingTextarea.placeholder='Finding-Text eingeben…';
      grid.appendChild(buildField('Findings',findingTextarea));
      const actionTextarea=document.createElement('textarea');
      actionTextarea.className='nsf-custom-textarea';
      actionTextarea.placeholder='Actions-Text eingeben…';
      grid.appendChild(buildField('Actions',actionTextarea));
      const routineTextarea=document.createElement('textarea');
      routineTextarea.className='nsf-custom-textarea';
      routineTextarea.placeholder='KV-Actions-Text eingeben…';
      grid.appendChild(buildField('KV-Actions',routineTextarea));
      const nonroutineTextarea=document.createElement('textarea');
      nonroutineTextarea.className='nsf-custom-textarea';
      nonroutineTextarea.placeholder='Nonroutine-Text eingeben…';
      grid.appendChild(buildField('Nonroutine',nonroutineTextarea));
      modal.appendChild(grid);
      [findingTextarea,actionTextarea,routineTextarea,nonroutineTextarea].forEach(textarea=>{
        textarea.addEventListener('input',()=>autoResizeTextarea(textarea));
        ensureTextareaAutoResize(textarea);
      });
      const partsWrap=document.createElement('div');
      partsWrap.className='nsf-custom-parts';
      const partsHeader=document.createElement('div');
      partsHeader.className='nsf-custom-parts-header';
      const partsTitle=document.createElement('div');
      partsTitle.className='nsf-custom-label';
      partsTitle.textContent='Bestellnummern & Mengen';
      const addPartBtn=document.createElement('button');
      addPartBtn.type='button';
      addPartBtn.className='nsf-btn secondary';
      addPartBtn.textContent='+ Teil hinzufügen';
      partsHeader.append(partsTitle,addPartBtn);
      partsWrap.appendChild(partsHeader);
      const partRowsContainer=document.createElement('div');
      partsWrap.appendChild(partRowsContainer);
      const partRows=[];
      const addPartRow=(partValue='',qtyValue='')=>{
        const row=document.createElement('div');
        row.className='nsf-custom-part-row';
        const partInput=document.createElement('input');
        partInput.type='text';
        partInput.className='nsf-custom-input';
        partInput.placeholder='Teilenummer';
        partInput.value=partValue;
        const qtyInput=document.createElement('input');
        qtyInput.type='text';
        qtyInput.className='nsf-custom-input';
        qtyInput.placeholder='Menge';
        qtyInput.value=qtyValue;
        const removeBtn=document.createElement('button');
        removeBtn.type='button';
        removeBtn.className='nsf-custom-part-remove';
        removeBtn.setAttribute('aria-label','Teilezeile entfernen');
        removeBtn.textContent='×';
        removeBtn.addEventListener('click',()=>{
          const index=partRows.findIndex(item=>item.row===row);
          if(index>-1) partRows.splice(index,1);
          row.remove();
        });
        row.append(partInput,qtyInput,removeBtn);
        partRowsContainer.appendChild(row);
        partRows.push({row,partInput,qtyInput});
      };
      addPartRow();
      addPartBtn.addEventListener('click',()=>addPartRow());
      modal.appendChild(partsWrap);
      const divider=document.createElement('div');
      divider.className='nsf-custom-divider';
      modal.appendChild(divider);
      const actions=document.createElement('div');
      actions.className='nsf-custom-actions';
      const insertBtn=document.createElement('button');
      insertBtn.type='button';
      insertBtn.className='nsf-btn';
      insertBtn.textContent='Einfügen';
      insertBtn.disabled=!this.meldung;
      const saveBtn=document.createElement('button');
      saveBtn.type='button';
      saveBtn.className='nsf-btn secondary';
      saveBtn.textContent='Als Standardfinding speichern';
      const cancelBtn=document.createElement('button');
      cancelBtn.type='button';
      cancelBtn.className='nsf-btn';
      cancelBtn.textContent='Abbrechen';
      cancelBtn.addEventListener('click',()=>this.closeCustomFindingModal());
      actions.append(insertBtn,saveBtn,cancelBtn);
      modal.appendChild(actions);
      const collectPayload=()=>{
        const parts=partRows.map(row=>{
          const part=clean(row.partInput.value);
          const quantity=clean(row.qtyInput.value);
          return part?{part,quantity}:null;
        }).filter(Boolean);
        return {
          label:clean(labelInput.value),
          status:statusSelect.value,
          finding:clean(findingTextarea.value),
          action:clean(actionTextarea.value),
          routineAction:clean(routineTextarea.value),
          nonroutine:clean(nonroutineTextarea.value),
          parts
        };
      };
      const hasContent=payload=>{
        return !!(payload.label||payload.finding||payload.action||payload.routineAction||payload.nonroutine||payload.parts.length);
      };
      const handleInsert=(mode)=>{
        const payload=collectPayload();
        if(!hasContent(payload)){
          window.alert('Bitte mindestens einen Text oder eine Teilenummer eingeben.');
          return;
        }
        if(mode==='insert'&&!this.meldung){
          window.alert('Keine Meldung aktiv – Einfügen ist aktuell deaktiviert.');
          return;
        }
        if(mode==='insert'||(mode==='save'&&this.meldung)){
          const entry=this.buildCustomFindingEntry(payload);
          this.insertCustomFindingSelection(entry,payload.status);
        }
        if(mode==='save'){
          this.launchFindingsEditorPrefill(payload);
        }
        this.closeCustomFindingModal();
      };
      insertBtn.addEventListener('click',()=>handleInsert('insert'));
      saveBtn.addEventListener('click',()=>handleInsert('save'));
      overlay.addEventListener('click',event=>{
        if(event.target===overlay) this.closeCustomFindingModal();
      });
      const keyHandler=event=>{
        if(event.key==='Escape'||event.key==='Esc'){
          event.preventDefault();
          this.closeCustomFindingModal();
        }
      };
      document.addEventListener('keydown',keyHandler);
      this.customFindingModalKeyHandler=keyHandler;
      document.body.appendChild(overlay);
      this.customFindingBodyOverflow=document.body.style.overflow;
      document.body.style.overflow='hidden';
      this.customFindingOverlay=overlay;
      requestAnimationFrame(()=>overlay.focus());
    }

    getRoutineFindingsStatusConfig(){
      this.ensureRoutineEditorState();
      let config=this.routineEditorState?.routineStatusNotice;
      if(!config||typeof config!=='object'){
        config=createDefaultRoutineFindingsStatusConfig();
        this.routineEditorState.routineStatusNotice=config;
      }
      return normalizeRoutineFindingsStatusConfig(config);
    }

    setRoutineFindingsStatusConfig(config){
      const normalized=normalizeRoutineFindingsStatusConfig(config);
      this.ensureRoutineEditorState();
      this.routineEditorState.routineStatusNotice=normalized;
      this.saveRoutineEditorState(this.routineEditorState);
      this.refreshRoutineEditorPreview();
      this.refreshRoutineEditorStatusSection();
    }

    refreshRoutineEditorStatusSection(){
      if(!this.routineEditorStatusSection) return;
      const isRoutine=this.getActiveRoutineEditorTab()==='routine';
      this.routineEditorStatusSection.classList.toggle('is-hidden',!isRoutine);
      const config=this.getRoutineFindingsStatusConfig();
      if(this.routineEditorStatusTemplateInput){
        const value=typeof config.template==='string'?config.template:'';
        if(this.routineEditorStatusTemplateInput.value!==value){
          this.routineEditorStatusTemplateInput.value=value;
        }
      }
      if(this.routineEditorStatusInputMap instanceof Map){
        (Array.isArray(config.statuses)?config.statuses:[]).forEach(entry=>{
          if(!entry||!entry.key) return;
          const input=this.routineEditorStatusInputMap.get(entry.key);
          if(!input) return;
          const value=typeof entry.display==='string'?entry.display:'';
          if(input.value!==value){
            input.value=value;
          }
        });
      }
    }

    closeRoutineStatusModal(){
      if(this.routineStatusOverlay){
        this.routineStatusOverlay.remove();
        this.routineStatusOverlay=null;
      }
      if(this.routineStatusModalKeyHandler){
        document.removeEventListener('keydown',this.routineStatusModalKeyHandler);
        this.routineStatusModalKeyHandler=null;
      }
      if(this.routineStatusBodyOverflow!=null){
        document.body.style.overflow=this.routineStatusBodyOverflow||'';
        this.routineStatusBodyOverflow='';
      }
    }

    openRoutineStatusModal(){
      if(this.destroyed) return;
      const currentConfig=this.getRoutineFindingsStatusConfig();
      const statusEntries=Array.isArray(currentConfig.statuses)?currentConfig.statuses:[];
      let workingConfig={
        template:currentConfig.template,
        statuses:statusEntries.map(entry=>({
          key:entry.key,
          label:entry.label,
          display:entry.display
        }))
      };
      this.closeRoutineStatusModal();
      const overlay=document.createElement('div');
      overlay.className='nsf-status-modal-overlay';
      overlay.tabIndex=-1;
      const dialog=document.createElement('div');
      dialog.className='nsf-status-modal';
      overlay.appendChild(dialog);
      const header=document.createElement('div');
      header.className='nsf-status-modal-header';
      const title=document.createElement('h2');
      title.className='nsf-status-modal-title';
      title.textContent='Routine-Statushinweis konfigurieren';
      header.appendChild(title);
      const closeBtn=document.createElement('button');
      closeBtn.type='button';
      closeBtn.className='nsf-status-modal-close';
      closeBtn.setAttribute('aria-label','Modal schließen');
      closeBtn.textContent='×';
      closeBtn.addEventListener('click',()=>this.closeRoutineStatusModal());
      header.appendChild(closeBtn);
      dialog.appendChild(header);
      const content=document.createElement('div');
      content.className='nsf-status-modal-content';
      const templateSection=document.createElement('div');
      templateSection.className='nsf-status-modal-section';
      const templateLabel=document.createElement('div');
      templateLabel.className='nsf-status-modal-label';
      templateLabel.textContent='Ersatztext';
      const templateHint=document.createElement('div');
      templateHint.className='nsf-status-modal-hint';
      templateHint.textContent='Nutze {items} als Platzhalter für die ausgewählten Statusnamen.';
      const templateInput=document.createElement('textarea');
      templateInput.className='nsf-textarea nsf-status-modal-input';
      templateInput.rows=2;
      templateInput.value=workingConfig.template||'';
      templateInput.addEventListener('input',()=>{
        workingConfig={
          ...workingConfig,
          template:templateInput.value
        };
        this.setRoutineFindingsStatusConfig(workingConfig);
      });
      templateSection.append(templateLabel,templateHint,templateInput);
      content.appendChild(templateSection);
      const statusSection=document.createElement('div');
      statusSection.className='nsf-status-modal-section';
      const statusLabel=document.createElement('div');
      statusLabel.className='nsf-status-modal-label';
      statusLabel.textContent='Status-Darstellung';
      statusSection.appendChild(statusLabel);
      const grid=document.createElement('div');
      grid.className='nsf-status-modal-grid';
      const updateStatusValue=(key,value)=>{
        const nextStatuses=workingConfig.statuses.map(entry=>{
          if(entry.key!==key) return entry;
          return {
            ...entry,
            display:value
          };
        });
        workingConfig={
          ...workingConfig,
          statuses:nextStatuses
        };
        this.setRoutineFindingsStatusConfig(workingConfig);
      };
      statusEntries.forEach(entry=>{
        const field=document.createElement('div');
        field.className='nsf-status-modal-field';
        const label=document.createElement('label');
        label.className='nsf-status-modal-hint';
        label.textContent=entry.label;
        const input=document.createElement('input');
        input.type='text';
        input.className='nsf-status-modal-input';
        input.value=entry.display||'';
        input.addEventListener('input',()=>{
          updateStatusValue(entry.key,input.value);
        });
        field.append(label,input);
        grid.appendChild(field);
      });
      statusSection.appendChild(grid);
      content.appendChild(statusSection);
      const actions=document.createElement('div');
      actions.className='nsf-status-modal-actions';
      const resetBtn=document.createElement('button');
      resetBtn.type='button';
      resetBtn.className='nsf-status-modal-button secondary';
      resetBtn.textContent='Zurücksetzen';
      resetBtn.addEventListener('click',()=>{
        const defaults=createDefaultRoutineFindingsStatusConfig();
        workingConfig={
          template:defaults.template,
          statuses:defaults.statuses.map(entry=>({
            key:entry.key,
            label:entry.label,
            display:entry.display
          }))
        };
        templateInput.value=workingConfig.template||'';
        const inputs=grid.querySelectorAll('input.nsf-status-modal-input');
        workingConfig.statuses.forEach((entry,index)=>{
          const input=inputs[index];
          if(input) input.value=entry.display||'';
        });
        this.setRoutineFindingsStatusConfig(workingConfig);
      });
      const closeAction=document.createElement('button');
      closeAction.type='button';
      closeAction.className='nsf-status-modal-button';
      closeAction.textContent='Schließen';
      closeAction.addEventListener('click',()=>this.closeRoutineStatusModal());
      actions.append(resetBtn,closeAction);
      content.appendChild(actions);
      dialog.appendChild(content);
      overlay.addEventListener('click',event=>{
        if(event.target===overlay) this.closeRoutineStatusModal();
      });
      const keyHandler=event=>{
        if(event.key==='Escape'){
          event.preventDefault();
          this.closeRoutineStatusModal();
        }
      };
      document.addEventListener('keydown',keyHandler);
      this.routineStatusModalKeyHandler=keyHandler;
      document.body.appendChild(overlay);
      this.routineStatusBodyOverflow=document.body.style.overflow;
      document.body.style.overflow='hidden';
      this.routineStatusOverlay=overlay;
      requestAnimationFrame(()=>overlay.focus());
    }

    openFindingJsonModal(sourceEntries,context={}){
      if(this.destroyed) return;
      const entries=Array.isArray(sourceEntries)?sourceEntries.filter(src=>src&&typeof src==='object'):[];
      const normalized=[];
      const seen=new Set();
      const signature=item=>{
        if(!item||typeof item!=='object') return '';
        const key=clean(item.key);
        const label=clean(item.label);
        const part=normalizePart(item.part||'');
        return `${key}||${label}||${part}`;
      };
      entries.forEach(entry=>{
        const base={
          key:clean(entry.key),
          label:clean(entry.label||entry.finding||''),
          part:normalizePart(entry.part||''),
          raw:entry.raw!=null?entry.raw:null,
          entry:entry.entry&&typeof entry.entry==='object'?entry.entry:null,
          finding:clean(entry.finding),
          action:clean(entry.action)
        };
        const sig=signature(base);
        if(sig&&seen.has(sig)) return;
        if(sig) seen.add(sig);
        normalized.push(base);
      });
      this.closeFindingJsonModal();
      const overlay=document.createElement('div');
      overlay.className='nsf-json-modal-overlay';
      overlay.tabIndex=-1;
      const dialog=document.createElement('div');
      dialog.className='nsf-json-modal';
      overlay.appendChild(dialog);
      const header=document.createElement('div');
      header.className='nsf-json-modal-header';
      const title=document.createElement('h2');
      title.className='nsf-json-modal-title';
      title.textContent='JSON-Daten des Findings';
      header.appendChild(title);
      const closeBtn=document.createElement('button');
      closeBtn.type='button';
      closeBtn.className='nsf-json-modal-close';
      closeBtn.setAttribute('aria-label','Modal schließen');
      closeBtn.textContent='×';
      closeBtn.addEventListener('click',()=>this.closeFindingJsonModal());
      header.appendChild(closeBtn);
      dialog.appendChild(header);
      const content=document.createElement('div');
      content.className='nsf-json-modal-content';
      const pnText=clean(context?.pnText);
      const partText=clean(context?.partText);
      const quantityText=clean(context?.quantityText);
      const contextParts=[];
      if(pnText) contextParts.push(`PN-Text: ${pnText}`);
      if(partText) contextParts.push(`Teilenummer: ${partText}`);
      if(quantityText) contextParts.push(`Menge: ${quantityText}`);
      if(contextParts.length){
        const contextInfo=document.createElement('div');
        contextInfo.className='nsf-json-modal-entry-meta';
        contextInfo.textContent=contextParts.join(' • ');
        content.appendChild(contextInfo);
      }
      if(normalized.length){
        normalized.forEach((entry,index)=>{
          const block=document.createElement('article');
          block.className='nsf-json-modal-entry';
          const entryHeader=document.createElement('div');
          entryHeader.className='nsf-json-modal-entry-header';
          const entryTitle=document.createElement('h3');
          entryTitle.className='nsf-json-modal-entry-title';
          const fallbackTitle=entry.label||entry.finding||entry.part||'';
          entryTitle.textContent=fallbackTitle||`Eintrag ${index+1}`;
          entryHeader.appendChild(entryTitle);
          const metaDetails=[];
          if(entry.part) metaDetails.push(`Part: ${entry.part}`);
          if(entry.key) metaDetails.push(`Key: ${entry.key}`);
          if(metaDetails.length){
            const meta=document.createElement('div');
            meta.className='nsf-json-modal-entry-meta';
            meta.textContent=metaDetails.join(' • ');
            entryHeader.appendChild(meta);
          }
          const copyBtn=document.createElement('button');
          copyBtn.type='button';
          copyBtn.className='nsf-json-modal-copy';
          copyBtn.textContent='JSON kopieren';
          entryHeader.appendChild(copyBtn);
          block.appendChild(entryHeader);
          let jsonText='';
          if(entry.raw!=null){
            jsonText=safeJsonStringify(entry.raw);
          }
          if(!jsonText&&entry.entry){
            jsonText=safeJsonStringify(entry.entry,{skipKeys:['raw']});
          }
          const pre=document.createElement('pre');
          pre.className='nsf-json-modal-code';
          pre.textContent=jsonText||'Keine JSON-Daten verfügbar.';
          copyBtn.disabled=!jsonText;
          copyBtn.addEventListener('click',()=>{
            if(!jsonText) return;
            copyText(jsonText).then(success=>{
              if(!success) return;
              copyBtn.classList.add('copied');
              setTimeout(()=>copyBtn.classList.remove('copied'),1200);
            });
          });
          block.appendChild(pre);
          content.appendChild(block);
        });
      }else{
        const empty=document.createElement('div');
        empty.className='nsf-json-modal-empty';
        empty.textContent='Keine JSON-Daten verfügbar.';
        content.appendChild(empty);
      }
      dialog.appendChild(content);
      overlay.addEventListener('click',event=>{
        if(event.target===overlay) this.closeFindingJsonModal();
      });
      const keyHandler=event=>{
        if(event.key==='Escape'||event.key==='Esc'){
          event.preventDefault();
          this.closeFindingJsonModal();
        }
      };
      document.addEventListener('keydown',keyHandler);
      this.findingJsonModalKeyHandler=keyHandler;
      document.body.appendChild(overlay);
      this.findingJsonBodyOverflow=document.body.style.overflow;
      document.body.style.overflow='hidden';
      this.findingJsonOverlay=overlay;
      requestAnimationFrame(()=>overlay.focus());
    }

    ensureRoutineEditorState(tabKey){
      let rawState=this.routineEditorState;
      if(!rawState||typeof rawState!=='object'){
        rawState=loadRoutineEditorState();
      }
      const normalized=normalizeRoutineEditorState(rawState);
      this.routineEditorState=normalized;
      if(!this.routineEditorState.freitextTemplates||typeof this.routineEditorState.freitextTemplates!=='object'){
        this.routineEditorState.freitextTemplates=createDefaultFreitextTemplates();
      }else{
        this.routineEditorState.freitextTemplates=normalizeFreitextTemplates(this.routineEditorState.freitextTemplates);
      }
      if(!this.routineEditorState.routineStatusNotice||typeof this.routineEditorState.routineStatusNotice!=='object'){
        this.routineEditorState.routineStatusNotice=createDefaultRoutineFindingsStatusConfig();
      }else{
        this.routineEditorState.routineStatusNotice=normalizeRoutineFindingsStatusConfig(this.routineEditorState.routineStatusNotice);
      }
      if(typeof tabKey!=='string'){
        return this.routineEditorState;
      }
      const key=getRoutineEditorTabKey(tabKey);
      if(!this.routineEditorState.tabs||typeof this.routineEditorState.tabs!=='object'){
        this.routineEditorState.tabs={};
      }
      let tabState=this.routineEditorState.tabs[key];
      if(!tabState||typeof tabState!=='object'){
        tabState=createDefaultRoutineEditorTabState(key);
        this.routineEditorState.tabs[key]=tabState;
      }
      let rawTabState=null;
      if(rawState&&typeof rawState==='object'){
        if(rawState.tabs&&typeof rawState.tabs==='object'&&rawState.tabs[key]&&typeof rawState.tabs[key]==='object'){
          rawTabState=rawState.tabs[key];
        }else if(key==='routine'&&(!rawState.tabs||typeof rawState.tabs!=='object')){
          rawTabState=rawState;
        }
      }
      if(rawTabState&&Array.isArray(rawTabState.customBlocks)){
        tabState.customBlocks=rawTabState.customBlocks.slice();
      }else{
        tabState.customBlocks=[];
      }
      this.routineEditorState.tabs[key]=tabState;
      return tabState;
    }

    getActiveRoutineEditorTab(){
      return getRoutineEditorTabKey(this.routineEditorActiveTab);
    }

    getRoutineEditorTabState(tabKey=this.getActiveRoutineEditorTab()){
      const key=getRoutineEditorTabKey(tabKey);
      const tabState=this.ensureRoutineEditorState(key);
      if(tabState&&typeof tabState==='object'){
        return tabState;
      }
      if(!this.routineEditorState.tabs||typeof this.routineEditorState.tabs!=='object'){
        this.routineEditorState.tabs={};
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
      this.routineEditorPreviewTabButtons=null;
      this.routineEditorPreviewTitleElement=null;
      this.routineEditorPreviewTabBar=null;
      this.routineEditorStatusSection=null;
      this.routineEditorStatusTemplateInput=null;
      this.routineEditorStatusInputMap=null;
      this.routineEditorStatusResetButton=null;
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

    clearRoutineEditorDropIndicators(){
      if(!Array.isArray(this.routineEditorInsertZones)) return;
      this.routineEditorInsertZones.forEach(zone=>{
        if(!zone||!zone.classList) return;
        zone.classList.remove('is-active');
        zone.classList.remove('is-disabled');
      });
    }

    isRoutineEditorShopBlockAllowed(type){
      const normalized=typeof type==='string'?type:'';
      if(normalized==='aspen'||normalized==='aspenfield'){
        const config=this.getRoutineEditorTabConfig();
        return config&&config.allowAspen!==false;
      }
      if(normalized==='linebreak'||normalized==='text') return true;
      return false;
    }

    focusRoutineEditorCustomBlock(result){
      if(!result||!result.key) return;
      if(!this.routineEditorOverlay||!this.routineEditorOverlay.classList.contains('open')) return;
      requestAnimationFrame(()=>{
        let focusTarget=null;
        if(result.type==='aspen'){
          const block=this.routineEditorList&&this.routineEditorList.querySelector(`.nsf-editor-block[data-type="${result.key}"]`);
          focusTarget=block?block.querySelector('.nsf-editor-aspen-input'):null;
        }else if(result.type==='aspenfield'){
          const block=this.routineEditorList&&this.routineEditorList.querySelector(`.nsf-editor-block[data-type="${result.key}"]`);
          focusTarget=block?block.querySelector('.nsf-editor-aspenfield-input'):null;
        }else if(result.type==='text'){
          focusTarget=this.routineEditorList&&this.routineEditorList.querySelector(`.nsf-editor-block[data-type="${result.key}"] textarea`);
        }
        if(focusTarget) focusTarget.focus();
      });
    }

    updateRoutineEditorBlockShopAvailability(){
      if(!(this.routineEditorBlockShopItems instanceof Map)) return;
      const config=this.getRoutineEditorTabConfig();
      const allowAspen=config&&config.allowAspen!==false;
      this.routineEditorBlockShopItems.forEach((entry,type)=>{
        if(!entry||!entry.element) return;
        const allowed=type==='aspen'||type==='aspenfield'?allowAspen:true;
        entry.element.classList.toggle('is-disabled',!allowed);
        entry.element.setAttribute('aria-disabled',!allowed?'true':'false');
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
      const targetTab=getRoutineEditorTabKey(tabKey);
      this.setRoutineEditorActiveTab(targetTab);
      this.openRoutineEditorOverlay();
      this.refreshRoutineEditorStatusSection();
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
      const statusConfig=this.getRoutineFindingsStatusConfig();
      const state=cloneRoutineEditorState(preset.state);
      state.routineStatusNotice=normalizeRoutineFindingsStatusConfig(statusConfig);
      this.routineEditorState=state;
      this.saveRoutineEditorState(state);
      this.updateAspenBlocksFromDoc();
      if(this.routineEditorOverlay&&this.routineEditorOverlay.classList.contains('open')){
        this.renderRoutineEditorOverlayContent();
        const template=this.getActiveFreitextTemplate();
        this.setFreitextEditorValue(template);
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
      this.routineEditorPreviewTabBar=null;
      this.routineEditorPreviewTabButtons=null;

      const previewPanel=document.createElement('div');
      previewPanel.className='nsf-editor-preview-panel is-empty';
      const previewHeader=document.createElement('div');
      previewHeader.className='nsf-editor-preview-title';
      previewHeader.textContent='Freitext-Vorschau';
      this.routineEditorPreviewTitleElement=previewHeader;
      const previewContent=document.createElement('pre');
      previewContent.className='nsf-editor-preview-content';
      previewContent.textContent='Keine Routine-Daten vorhanden.';
      previewPanel.append(previewHeader,previewContent);
      workspace.appendChild(previewPanel);
      this.routineEditorPreviewPanel=previewPanel;
      this.routineEditorPreviewContent=previewContent;

      const freitextTab=document.createElement('div');
      freitextTab.className='nsf-editor-tab is-active';
      freitextTab.dataset.tabKey='freitext';
      workspace.appendChild(freitextTab);
      const container=document.createElement('div');
      container.className='nsf-freitext-container';
      freitextTab.appendChild(container);
      const textareaLabel=document.createElement('label');
      textareaLabel.className='nsf-freitext-label';
      textareaLabel.setAttribute('for','freitext-editor');
      textareaLabel.textContent='Freitext';
      container.appendChild(textareaLabel);
      const editorWrapper=document.createElement('div');
      editorWrapper.className='nsf-freitext-editor-wrapper';
      container.appendChild(editorWrapper);
      const inputColumn=document.createElement('div');
      inputColumn.className='nsf-freitext-input-column';
      editorWrapper.appendChild(inputColumn);
      const textarea=document.createElement('textarea');
      textarea.id='freitext-editor';
      textarea.placeholder='Freitext eingeben…';
      textarea.value='';
      textarea.dataset.minRows='5';
      textarea.addEventListener('input',()=>{
        const value=typeof textarea.value==='string'?textarea.value:'';
        this.commitFreitextDraft(value);
        autoResizeTextarea(textarea);
      });
      inputColumn.appendChild(textarea);
      ensureTextareaAutoResize(textarea);
      this.freitextTextarea=textarea;
      const keywordSidebar=document.createElement('aside');
      keywordSidebar.className='nsf-freitext-keyword-sidebar';
      editorWrapper.appendChild(keywordSidebar);
      const keywordTitle=document.createElement('div');
      keywordTitle.className='nsf-freitext-keyword-title';
      keywordTitle.textContent='Verfügbare Keywords';
      keywordSidebar.appendChild(keywordTitle);
      const keywordHint=document.createElement('div');
      keywordHint.className='nsf-freitext-keyword-hint';
      keywordHint.textContent='Klick ein Keyword, um es an der aktuellen Cursorposition einzufügen.';
      keywordSidebar.appendChild(keywordHint);
      const keywordList=document.createElement('div');
      keywordList.className='nsf-freitext-keyword-list';
      keywordSidebar.appendChild(keywordList);
      (Array.isArray(this.freitextPlaceholderDefinitions)?this.freitextPlaceholderDefinitions:[]).forEach(def=>{
        if(!def||typeof def!=='object'||!def.key) return;
        const item=document.createElement('div');
        item.className='nsf-freitext-keyword-item';
        const button=document.createElement('button');
        button.type='button';
        button.className='nsf-freitext-keyword-button';
        const token=typeof def.label==='string'&&def.label.trim()?def.label.trim():`{${def.key}}`;
        button.textContent=token;
        button.setAttribute('data-placeholder',def.key);
        button.setAttribute('aria-label',`Keyword ${token} einfügen`);
        button.addEventListener('click',()=>this.insertFreitextPlaceholder(def.key));
        item.appendChild(button);
        if(def.description){
          const description=document.createElement('div');
          description.className='nsf-freitext-keyword-description';
          description.textContent=def.description;
          item.appendChild(description);
        }
        keywordList.appendChild(item);
      });
      this.routineEditorContainer=null;
      this.routineEditorList=null;
      this.routineEditorBlocks={};
      this.routineEditorInsertZones=[];
      this.routineEditorBlockShopItems=null;
      this.renderRoutineEditorOverlayContent();

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
      const statusSection=document.createElement('section');
      statusSection.className='nsf-editor-status is-hidden';
      const statusTitle=document.createElement('div');
      statusTitle.className='nsf-editor-status-title';
      statusTitle.textContent='Routine-Statushinweis';
      const statusHint=document.createElement('div');
      statusHint.className='nsf-editor-status-hint';
      statusHint.textContent='Konfiguriere den Hinweistext für SRU-Exchange-Status.';
      statusSection.append(statusTitle,statusHint);
      const statusTemplateWrap=document.createElement('div');
      statusTemplateWrap.className='nsf-editor-status-field';
      const statusTemplateLabel=document.createElement('label');
      statusTemplateLabel.className='nsf-editor-status-label';
      statusTemplateLabel.textContent='Ersatztext ({items})';
      const statusTemplateInput=document.createElement('textarea');
      statusTemplateInput.className='nsf-editor-status-input';
      statusTemplateInput.rows=2;
      statusTemplateInput.addEventListener('input',()=>{
        const current=this.getRoutineFindingsStatusConfig();
        this.setRoutineFindingsStatusConfig({
          ...current,
          template:statusTemplateInput.value
        });
      });
      statusTemplateWrap.append(statusTemplateLabel,statusTemplateInput);
      statusSection.appendChild(statusTemplateWrap);
      const statusGrid=document.createElement('div');
      statusGrid.className='nsf-editor-status-grid';
      const statusInputMap=new Map();
      const initialStatusConfig=this.getRoutineFindingsStatusConfig();
      (Array.isArray(initialStatusConfig.statuses)?initialStatusConfig.statuses:[]).forEach(entry=>{
        if(!entry||!entry.key) return;
        const field=document.createElement('div');
        field.className='nsf-editor-status-field';
        const label=document.createElement('label');
        label.className='nsf-editor-status-label';
        label.textContent=entry.label||entry.key;
        const input=document.createElement('input');
        input.type='text';
        input.className='nsf-editor-status-input';
        input.addEventListener('input',()=>{
          const current=this.getRoutineFindingsStatusConfig();
          const nextStatuses=(Array.isArray(current.statuses)?current.statuses:[]).map(statusEntry=>{
            if(!statusEntry||statusEntry.key!==entry.key) return statusEntry;
            return {
              ...statusEntry,
              display:input.value
            };
          });
          this.setRoutineFindingsStatusConfig({
            ...current,
            statuses:nextStatuses
          });
        });
        field.append(label,input);
        statusGrid.appendChild(field);
        statusInputMap.set(entry.key,input);
      });
      statusSection.appendChild(statusGrid);
      const statusActions=document.createElement('div');
      statusActions.className='nsf-editor-status-actions';
      const statusResetBtn=document.createElement('button');
      statusResetBtn.type='button';
      statusResetBtn.className='nsf-editor-status-reset';
      statusResetBtn.textContent='Zurücksetzen';
      statusResetBtn.addEventListener('click',()=>{
        this.setRoutineFindingsStatusConfig(createDefaultRoutineFindingsStatusConfig());
        this.refreshRoutineEditorStatusSection();
      });
      statusActions.appendChild(statusResetBtn);
      statusSection.appendChild(statusActions);
      sidebar.appendChild(statusSection);
      this.routineEditorStatusSection=statusSection;
      this.routineEditorStatusTemplateInput=statusTemplateInput;
      this.routineEditorStatusInputMap=statusInputMap;
      this.routineEditorStatusResetButton=statusResetBtn;
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
      this.refreshRoutineEditorDerivedLines();
      const initialValue=this.getActiveFreitextTemplate();
      this.setFreitextEditorValue(initialValue);
      if(typeof autoResizeTextarea==='function'&&this.freitextTextarea){
        try{autoResizeTextarea(this.freitextTextarea);}catch{}
      }
      this.updateRoutineEditorPreviewTabs();
      this.updateRoutineEditorParameterFilterState();
      this.evaluateRoutineEditorPresetMatch();
      this.refreshRoutineEditorStatusSection();
      return overlay;
    }

    openRoutineEditorOverlay(){
      const overlay=this.ensureRoutineEditorOverlay();
      if(!overlay) return;
      this.refreshRoutineEditorDerivedLines();
      const initialValue=this.getActiveFreitextTemplate();
      this.setFreitextEditorValue(initialValue);
      overlay.classList.add('open');
      const focusTarget=this.freitextTextarea;
      if(focusTarget){
        focusTarget.focus();
        try{focusTarget.setSelectionRange(focusTarget.value.length,focusTarget.value.length);}catch{}
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

    getRoutineEditorOrder(tabKey=this.getActiveRoutineEditorTab()){
      const tabState=this.getRoutineEditorTabState(tabKey);
      const baseBlocks=this.getRoutineEditorBaseBlocks(tabKey);
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
        const customType=entry&&entry.type==='aspen'
          ?'aspen'
          :entry&&entry.type==='linebreak'
            ?'linebreak'
            :entry&&entry.type==='aspenfield'
              ?'aspenfield'
              :'text';
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
          :customType==='aspenfield'
            ?'Aspen-Feld'
            :customType==='linebreak'
              ?'Zeilenumbruch'
              :labelIndex&&labelIndex>1?`Textfeld ${labelIndex}`:'Textfeld';
        const customLabel=entry&&entry.label?sanitizeRoutineEditorLabel(entry.label):'';
        return {
          key,
          label:customLabel||defaultLabel,
          defaultLabel,
          editable:customType==='text'||customType==='aspenfield',
          persist:true,
          removable:true,
          customId:id,
          customType,
          aspenField:entry&&typeof entry.aspenField==='string'?entry.aspenField:'',
          optionLabel:option&&customType==='aspen'?option.label:'',
          parameterKey:entry&&customType==='text'&&typeof entry.parameterKey==='string'?entry.parameterKey:'',
          content:entry&&customType==='text'&&typeof entry.content==='string'?entry.content:'',
          value:entry&&customType==='aspenfield'&&typeof entry.value==='string'?entry.value:''
        };
      }
      return null;
    }

    getRoutineEditorBlockLabel(key){
      const def=this.getRoutineEditorBlockDefinition(key);
      return def&&def.label?def.label:'';
    }

    createRoutineEditorInsertControl(index,order,tabKey){
      if(!this.routineEditorList) return null;
      if(!Array.isArray(this.routineEditorInsertZones)) this.routineEditorInsertZones=[];
      const targetTab=getRoutineEditorTabKey?getRoutineEditorTabKey(tabKey):tabKey;
      const container=document.createElement('div');
      container.className='nsf-editor-insert';
      container.dataset.position=String(index);
      const dropzone=document.createElement('div');
      dropzone.className='nsf-editor-dropzone';
      dropzone.textContent='Baustein hier ablegen';
      const prevLabel=index>0?this.getRoutineEditorBlockLabel(order[index-1]):'';
      const nextLabel=index<order.length?this.getRoutineEditorBlockLabel(order[index]):'';
      if(prevLabel&&nextLabel){
        dropzone.title=`Baustein zwischen ${prevLabel} und ${nextLabel} ablegen`;
      }else if(nextLabel){
        dropzone.title=`Baustein vor ${nextLabel} ablegen`;
      }else if(prevLabel){
        dropzone.title=`Baustein nach ${prevLabel} ablegen`;
      }else{
        dropzone.title='Baustein hier ablegen';
      }
      const clearState=()=>{
        container.classList.remove('is-active');
        container.classList.remove('is-disabled');
      };
      container.addEventListener('dragenter',event=>{
        const type=currentBlockShopDragType;
        if(!type) return;
        if(!this.isRoutineEditorShopBlockAllowed(type)){
          container.classList.add('is-disabled');
          container.classList.remove('is-active');
          return;
        }
        event.preventDefault();
        container.classList.add('is-active');
        container.classList.remove('is-disabled');
      });
      container.addEventListener('dragover',event=>{
        const type=currentBlockShopDragType;
        if(!type) return;
        if(!this.isRoutineEditorShopBlockAllowed(type)){
          container.classList.add('is-disabled');
          container.classList.remove('is-active');
          if(event.dataTransfer) event.dataTransfer.dropEffect='none';
          return;
        }
        event.preventDefault();
        if(event.dataTransfer) event.dataTransfer.dropEffect='copy';
        container.classList.add('is-active');
        container.classList.remove('is-disabled');
      });
      container.addEventListener('dragleave',event=>{
        if(container.contains(event.relatedTarget)) return;
        clearState();
      });
      container.addEventListener('drop',event=>{
        const type=currentBlockShopDragType||event.dataTransfer&&event.dataTransfer.getData('text/plain')||'';
        clearState();
        if(!type||!this.isRoutineEditorShopBlockAllowed(type)){
          currentBlockShopDragType='';
          clearAllRoutineEditorDropIndicators();
          return;
        }
        event.preventDefault();
        const tabForInsert=targetTab||this.getActiveRoutineEditorTab();
        const newBlock=this.addCustomBlock(tabForInsert,type,{insertIndex:index});
        if(newBlock&&this.routineEditorOverlay&&this.routineEditorOverlay.classList.contains('open')){
          const tabToRender=tabForInsert||this.getActiveRoutineEditorTab();
          try{
            this.renderRoutineEditorOverlayContent(tabToRender);
          }catch(err){
            console.warn('NSF: Overlay konnte nach Drop nicht aktualisiert werden',err);
          }
        }
        currentBlockShopDragType='';
        clearAllRoutineEditorDropIndicators();
        this.focusRoutineEditorCustomBlock(newBlock);
      });
      dropzone.addEventListener('drop',event=>event.preventDefault());
      container.appendChild(dropzone);
      this.routineEditorInsertZones.push(container);
      return container;
    }

    renderRoutineEditorOverlayContent(){
      this.refreshRoutineEditorPreview();
    }

    saveRoutineEditorState(state=this.routineEditorState){
      const targetState=state||this.routineEditorState;
      if(!targetState) return;
      if(Array.isArray(this.dragShadowOrder)&&this.dragShadowOrder.length){
        const activeTab=this.getActiveRoutineEditorTab();
        const resolvedTab=getRoutineEditorTabKey?getRoutineEditorTabKey(activeTab):activeTab;
        const tabs=targetState&&targetState.tabs?targetState.tabs:null;
        if(resolvedTab&&tabs&&tabs[resolvedTab]){
          const tabState=tabs[resolvedTab];
          const ghostOrder=this.dragShadowOrder
            .map(id=>typeof id==='string'?id.trim():'')
            .filter(Boolean);
          if(ghostOrder.length){
            const fallbackOrder=this.getRoutineEditorOrder(resolvedTab);
            const mergedOrder=ghostOrder.slice();
            fallbackOrder.forEach(key=>{
              if(!mergedOrder.includes(key)) mergedOrder.push(key);
            });
            tabState.order=mergedOrder;
          }
        }
        this.dragShadowOrder=[];
      }
      storeRoutineEditorState(targetState);
    }

    normalizeRoutineEditorInsertIndex(index,length){
      const numericIndex=typeof index==='number'&&Number.isFinite(index)
        ?index
        :typeof index==='string'&&index.trim()!==''
          ?Number.parseInt(index,10)
          :NaN;
      if(Number.isFinite(numericIndex)){
        const max=Math.max(0,Number.isFinite(length)?length:0);
        return Math.max(0,Math.min(numericIndex,max));
      }
      return Math.max(0,Number.isFinite(length)?length:0);
    }

    addCustomBlock(tabKey,type='text',options={}){
      const targetTab=getRoutineEditorTabKey(tabKey);
      this.ensureRoutineEditorState();
      const state=this.routineEditorState;
      const tabState=this.getRoutineEditorTabState(targetTab);
      const config=this.getRoutineEditorTabConfig(targetTab);
      const allowAspen=config&&config.allowAspen!==false;
      const requestedType=typeof type==='string'?type:'';
      const blockType=requestedType==='linebreak'?'linebreak':requestedType==='aspen'&&allowAspen?'aspen':'text';
      const id=createCustomSectionId();
      const customKey=`${ROUTINE_EDITOR_CUSTOM_PREFIX}${id}`;
      const currentOrder=this.getRoutineEditorOrder(targetTab);
      const sanitizedOrder=currentOrder.filter(entry=>entry!==customKey);
      let desiredIndex=options.insertIndex;
      if(typeof desiredIndex==='string'&&desiredIndex.trim()!==''){
        const parsed=Number.parseInt(desiredIndex,10);
        desiredIndex=Number.isNaN(parsed)?desiredIndex:parsed;
      }
      const insertIndex=Number.isFinite(desiredIndex)
        ?this.normalizeRoutineEditorInsertIndex(desiredIndex,sanitizedOrder.length)
        :sanitizedOrder.length;
      const existingCustomBlocks=Array.isArray(tabState.customBlocks)?tabState.customBlocks.slice():[];
      const existingMap=new Map(existingCustomBlocks
        .map(block=>block&&typeof block.id==='string'?[block.id,block]:null)
        .filter(Boolean));
      const entry={
        id,
        type:blockType,
        label:'',
        aspenField:'',
        parameterKey:'',
        lines:['']
      };
      let label=sanitizeRoutineEditorLabel(options.label||'');
      if(blockType==='aspen'){
        if(!this.hasAspenDoc&&this.aspenFileInput){
          this.aspenFileInput.click();
        }
        const preferredField=typeof options.aspenField==='string'?options.aspenField.trim():'';
        const defaultField=preferredField||this.getDefaultAspenFieldKey();
        entry.aspenField=defaultField||'';
        const value=this.resolveAspenFieldValue(entry.aspenField);
        entry.lines=[value||''];
        if(!label){
          label='Aspendaten';
        }
      }else if(blockType==='linebreak'){
        entry.lines=[''];
        if(!label){
          label='Zeilenumbruch';
        }
      }else{
        let presetLines=null;
        if(options&&Array.isArray(options.lines)){
          presetLines=options.lines.map(value=>typeof value==='string'?value:'');
        }else if(options&&typeof options.value==='string'){
          presetLines=options.value.split(/\r?\n/);
        }
        if(Array.isArray(presetLines)&&presetLines.length){
          entry.lines=presetLines;
        }
        entry.parameterKey=typeof options.parameterKey==='string'?options.parameterKey.trim():'';
      }
      entry.label=label;
      if(blockType!=='text'){
        entry.parameterKey='';
      }
      const order=sanitizedOrder.slice();
      order.splice(insertIndex,0,customKey);
      const orderedCustomBlocks=[];
      order.forEach(key=>{
        if(!key||typeof key!=='string'||!key.startsWith(ROUTINE_EDITOR_CUSTOM_PREFIX)) return;
        const customId=key.slice(ROUTINE_EDITOR_CUSTOM_PREFIX.length);
        if(customId===id){
          orderedCustomBlocks.push(entry);
          return;
        }
        const existing=existingMap.get(customId);
        if(existing){
          orderedCustomBlocks.push(existing);
          existingMap.delete(customId);
        }
      });
      existingMap.forEach(block=>{
        if(block) orderedCustomBlocks.push(block);
      });
      if(blockType==='text'){
        if(!entry.lines.length) entry.lines=[''];
        if(!entry.label){
          let counter=0;
          for(const block of orderedCustomBlocks){
            if(!block||block.type!=='text') continue;
            counter+=1;
            if(block.id===id){
              block.label=`Textfeld ${counter}`;
              break;
            }
          }
          if(!entry.label){
            entry.label=`Textfeld ${Math.max(1,counter)}`;
          }
        }
      }else if(!entry.label){
        entry.label=blockType==='linebreak'?'Zeilenumbruch':'Aspendaten';
      }
      entry.label=sanitizeRoutineEditorLabel(entry.label||'');
      tabState.customBlocks=orderedCustomBlocks;
      tabState.order=order;
      if(state&&state.tabs){
        state.tabs[targetTab]=tabState;
      }
      this.saveRoutineEditorState(state);
      try{
        const overlay=document.querySelector('.nsf-editor-overlay.open');
        const container=overlay?.querySelector('.nsf-editor-tab.active .nsf-blocks')||overlay?.querySelector('.nsf-editor-list');
        const newBlock=Array.isArray(tabState.customBlocks)?tabState.customBlocks.find(block=>block&&block.id===id):null;
        if(overlay&&container&&newBlock){
          const renderer=typeof renderRoutineEditorBlock==='function'
            ?renderRoutineEditorBlock
            :typeof this.renderRoutineEditorBlock==='function'
              ?this.renderRoutineEditorBlock.bind(this)
              :null;
          const blockEl=debugRenderRoutineEditorBlockCall(renderer,newBlock,targetTab);
          if(blockEl instanceof Element){
            container.appendChild(blockEl);
          }
        }
      }catch(err){
        console.warn('NSF: Custom-Block konnte nicht direkt gerendert werden',err);
      }
      this.ensureRoutineEditorState();
      this.evaluateRoutineEditorPresetMatch();
      const activeTab=this.getActiveRoutineEditorTab();
      const overlayOpen=this.routineEditorOverlay&&this.routineEditorOverlay.classList.contains('open');
      const result={id,key:customKey,type:blockType,tabKey:targetTab};
      if(overlayOpen&&activeTab===targetTab){
        this.renderRoutineEditorOverlayContent();
      }else{
        this.refreshRoutineEditorPreview();
      }
      this.focusRoutineEditorCustomBlock(result);
      return result;
    }

    addRoutineEditorCustomBlockAt(index,type='text',options={}){
      const activeTab=this.getActiveRoutineEditorTab();
      const result=this.addCustomBlock(activeTab,type,{...options,insertIndex:index});
      if(!result) return;
      if(!(this.routineEditorOverlay&&this.routineEditorOverlay.classList.contains('open'))) return;
      requestAnimationFrame(()=>{
        let focusTarget=null;
        if(result.type==='aspen'){
          const block=this.routineEditorList&&this.routineEditorList.querySelector(`.nsf-editor-block[data-type="${result.key}"]`);
          focusTarget=block?block.querySelector('.nsf-editor-aspen-input'):null;
        }else if(result.type==='text'){
          focusTarget=this.routineEditorList&&this.routineEditorList.querySelector(`.nsf-editor-block[data-type="${result.key}"] textarea`);
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
      console.debug('NSF: addRoutineEditorBaseBlockAt',index,key);
      if(!key||typeof key!=='string') return;
      const baseBlocks=this.getRoutineEditorBaseBlocks();
      const def=baseBlocks.find(block=>block.key===key);
      if(!def) return;
      const tabState=this.getRoutineEditorTabState();
      const order=this.getRoutineEditorOrder().filter(entry=>entry!==key);
      const clampedIndex=this.normalizeRoutineEditorInsertIndex(index,order.length);
      order.splice(clampedIndex,0,key);
      tabState.order=order;
      if(Array.isArray(tabState.hiddenBaseBlocks)){
        tabState.hiddenBaseBlocks=tabState.hiddenBaseBlocks.filter(entry=>entry!==key);
      }else{
        tabState.hiddenBaseBlocks=[];
      }
      if(def.editable!==false){
        if(!tabState.blocks||typeof tabState.blocks!=='object') tabState.blocks={};
        const entry=tabState.blocks[key]&&typeof tabState.blocks[key]==='object'
          ?tabState.blocks[key]
          :{lines:[]};
        if(!Array.isArray(entry.lines)||entry.lines.every(line=>(line||'').trim()==='')){
          const placeholders={
            action:'Neue Action',
            actions:'Neue Action',
            routine:'Neue Routine',
            nonroutine:'Neue Nonroutine',
            finding:'Neues Finding',
            findings:'Neue Findings',
            times:'Neue Arbeitszeiten',
            parts:'Neue Teile',
            mods:'Neue Modifikation'
          };
          entry.lines=[placeholders[key]||`Neuer Block: ${key}`];
        }
        tabState.blocks[key]=entry;
      }
      const container=this.routineEditorContainer||this.routineEditorList;
      if(!container){
        console.error('NSF: Routine-Editor-Container nicht gefunden');
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

    resolveAspenKeywordValue(rawKey){
      const key=typeof rawKey==='string'?rawKey.trim():'';
      if(!key) return '';
      const normalizeCandidate=candidate=>{
        if(!candidate) return '';
        const text=valueToText(candidate);
        return clean(text||'');
      };
      const directOption=this.getAspenFieldOption(key);
      if(directOption){
        const directValue=normalizeCandidate(directOption.value);
        if(directValue) return directValue;
      }
      const boardOption=this.getAspenFieldOption(`board.${key}`);
      if(boardOption){
        const boardValue=normalizeCandidate(boardOption.value);
        if(boardValue) return boardValue;
      }
      const generalOption=this.getAspenFieldOption(`general.${key}`);
      if(generalOption){
        const generalValue=normalizeCandidate(generalOption.value);
        if(generalValue) return generalValue;
      }
      if(key.toLowerCase()==='repairorder'){
        return clean(this.repairOrder||'');
      }
      return '';
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
        this.saveRoutineEditorState(this.routineEditorState);
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
      if(def.customId){
        block.dataset.blockId=def.customId;
      }else{
        block.dataset.blockId=def.key;
      }
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
      info.customTextInput=null;
      info.aspenFieldInput=null;
      const editable=def&&def.editable!==false;
      const container=info.linesContainer;
      container.innerHTML='';
      if(info.element){
        info.element.dataset.label=def&&def.label?def.label:(def&&def.defaultLabel)||'';
        if(def&&def.customId){
          info.element.dataset.blockId=def.customId;
        }else if(info.element.dataset){
          info.element.dataset.blockId=def&&def.key?def.key:'';
        }
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
        const toggle=document.createElement('button');
        toggle.type='button';
        toggle.className='nsf-editor-aspen-toggle';
        toggle.innerHTML='<svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path fill="currentColor" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 0 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"/></svg>';
        toggle.setAttribute('aria-label','Auswahlliste öffnen');
        toggle.setAttribute('aria-expanded','false');
        const inputWrapper=document.createElement('div');
        inputWrapper.className='nsf-editor-aspen-input-wrapper';
        inputWrapper.append(input,toggle);
        if(!this.hasAspenDoc){
          input.disabled=true;
          toggle.disabled=true;
          picker.classList.add('is-disabled');
        }
        const dropdown=document.createElement('div');
        dropdown.className='nsf-editor-aspen-options';
        picker.append(inputWrapper,dropdown);
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
          toggle.classList.remove('is-active');
          toggle.setAttribute('aria-expanded','false');
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
          toggle.classList.add('is-active');
          toggle.setAttribute('aria-expanded','true');
          pickerState.outsideHandler=event=>{
            if(!picker.contains(event.target)) closeDropdown();
          };
          document.addEventListener('pointerdown',pickerState.outsideHandler,true);
          updateFiltered(input.value);
        };
        input.addEventListener('input',()=>{
          const term=(input.value||'').trim();
          if(pickerState.open){
            if(term){
              updateFiltered(input.value);
            }else{
              closeDropdown();
            }
            return;
          }
          if(term){
            openDropdown();
          }
        });
        input.addEventListener('focus',()=>{
          if((input.value||'').trim()){
            openDropdown();
          }
        });
        input.addEventListener('blur',()=>{
          setTimeout(()=>closeDropdown(),120);
        });
        toggle.addEventListener('click',event=>{
          event.preventDefault();
          if(pickerState.open){
            closeDropdown();
          }else{
            if(!this.hasAspenDoc) return;
            input.focus();
            openDropdown();
          }
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
                toggle.disabled=false;
                picker.classList.remove('is-disabled');
                input.placeholder='Aspen-Feld suchen…';
              }else{
                input.disabled=true;
                toggle.disabled=true;
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
        const divider=document.createElement('hr');
        divider.className='nsf-editor-linebreak';
        divider.setAttribute('role','presentation');
        container.appendChild(divider);
        return;
      }
      if(def&&def.customType==='aspenfield'){
        const baseId=(def.customId||def.key||'block').replace(/[^a-zA-Z0-9_-]/g,'-');
        const fieldId=`nsf-aspenfield-${baseId}`;
        const wrapper=document.createElement('div');
        wrapper.className='nsf-editor-line nsf-editor-field';
        const label=document.createElement('label');
        label.className='nsf-editor-field-label';
        label.setAttribute('for',fieldId);
        label.textContent=def.label||def.defaultLabel||'Aspen-Feld';
        const input=document.createElement('input');
        input.type='text';
        input.id=fieldId;
        input.className='nsf-editor-aspenfield-input';
        const initialValue=typeof def.value==='string'
          ?def.value
          :Array.isArray(def.lines)&&def.lines.length?def.lines[0]:'';
        input.value=initialValue||'';
        if(info.definition) info.definition.value=initialValue||'';
        input.placeholder='Aspen-Wert…';
        if(!editable){
          input.readOnly=true;
          input.tabIndex=-1;
        }
        input.addEventListener('input',()=>{
          this.syncRoutineEditorStateFromDom();
        });
        wrapper.append(label,input);
        container.appendChild(wrapper);
        info.aspenFieldInput=input;
        return;
      }
      if(def&&def.customType==='text'){
        const baseId=(def.customId||def.key||'block').replace(/[^a-zA-Z0-9_-]/g,'-');
        const fieldId=`nsf-text-${baseId}`;
        const wrapper=document.createElement('div');
        wrapper.className='nsf-editor-line nsf-editor-field';
        const label=document.createElement('label');
        label.className='nsf-editor-field-label';
        label.setAttribute('for',fieldId);
        label.textContent=def.label||def.defaultLabel||'Textfeld';
        const textarea=document.createElement('textarea');
        textarea.id=fieldId;
        textarea.className='nsf-editor-input';
        textarea.rows=2;
        textarea.dataset.minHeight='40';
        textarea.dataset.minRows='2';
        const initialValue=typeof def.content==='string'
          ?def.content
          :Array.isArray(def.lines)&&def.lines.length?def.lines.join('\n'):'';
        textarea.value=initialValue||'';
        if(info.definition) info.definition.content=initialValue||'';
        if(editable){
          textarea.placeholder='Text…';
          textarea.addEventListener('input',()=>{
            autoSizeTextarea(textarea);
            this.syncRoutineEditorStateFromDom();
          });
        }else{
          textarea.readOnly=true;
          textarea.tabIndex=-1;
          textarea.addEventListener('input',()=>autoSizeTextarea(textarea));
        }
        wrapper.append(label,textarea);
        container.appendChild(wrapper);
        info.customTextInput=textarea;
        ensureTextareaAutoResize(textarea);
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
      input.rows=2;
      input.dataset.minHeight='40';
      input.dataset.minRows='2';
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
      ensureTextareaAutoResize(input);
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
            :element&&element.dataset&&element.dataset.customType==='aspenfield'
              ?'aspenfield'
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
        }else if(datasetType==='aspenfield'){
          const input=info.aspenFieldInput||element.querySelector('input.nsf-editor-aspenfield-input');
          const rawValue=input?String(input.value||''):'';
          customEntries.push({
            id,
            type:'aspenfield',
            label:datasetLabel,
            aspenField:'',
            value:rawValue,
            lines:[rawValue]
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
          const content=inputs.length?String(inputs[0].value||''):filtered[0]||'';
          customEntries.push({
            id,
            type:'text',
            label:datasetLabel,
            aspenField:'',
            parameterKey:datasetParameter,
            lines:filtered.length?filtered:[''],
            content
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
      this.saveRoutineEditorState(this.routineEditorState);
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
      this.refreshRoutineEditorPreview();
    }

    refreshRoutineEditorPreview(){
      this.updateRoutineEditorPreviewTabs();
      this.updateFreitextPreview();
    }

    getRoutineFindingsStatusNotice(){
      const config=this.getRoutineFindingsStatusConfig();
      const found=new Set();
      const selections=Array.isArray(this.selectedEntries)?this.selectedEntries:[];
      selections.forEach(selection=>{
        const normalized=normalizeFindingStatus(selection?.status||'');
        if(!normalized) return;
        const matchedKey=ROUTINE_FINDINGS_STATUS_MATCH_MAP.get(normalized.toLowerCase());
        if(matchedKey) found.add(matchedKey);
      });
      if(!found.size) return '';
      const statusMap=new Map(
        (config.statuses||[]).map(entry=>[entry.key,entry.display||entry.label])
      );
      const order=ROUTINE_FINDINGS_STATUS_ENTRIES.map(entry=>entry.key);
      const items=order.filter(item=>found.has(item)).map(item=>statusMap.get(item)||item);
      if(!items.length) return '';
      let template=typeof config.template==='string'?config.template.trim():'';
      if(!template) template=ROUTINE_FINDINGS_NOTICE_DEFAULT_TEMPLATE;
      const joinList=list=>{
        if(list.length===1) return list[0];
        if(list.length===2) return `${list[0]} and ${list[1]}`;
        return `${list.slice(0,-1).join(', ')} and ${list[list.length-1]}`;
      };
      const payload=joinList(items);
      return template.includes('{items}')
        ?template.replace(/\{items\}/g,payload)
        :template;
    }

    expandPlaceholders(text,options={}){
      const raw=typeof text==='string'?text:'';
      const rawTabKey=typeof options.tabKey==='string'?options.tabKey:'';
      const resolvedTab=typeof getRoutineEditorTabKey==='function'
        ?getRoutineEditorTabKey(rawTabKey)
        :rawTabKey;
      const toLineString=array=>Array.isArray(array)
        ? array
            .map(item=>typeof item==='string'?item:(item==null?'':String(item)))
            .map(value=>clean(value))
            .filter(Boolean)
            .join('\n')
        :'';
      const partsText=Array.isArray(this.rawParts)
        ? this.rawParts
            .map(entry=>{
              if(!entry||typeof entry!=='object') return '';
              const qty=clean(entry.qty!=null?entry.qty:entry.quantity);
              const name=clean(entry.name!=null?entry.name:entry.part);
              if(qty&&name) return `${qty}x ${name}`;
              if(qty) return `${qty}x`;
              return name;
            })
            .filter(Boolean)
            .join('\n')
        :'';
      const timesText=Array.isArray(this.rawTimes)
        ? this.rawTimes
            .map(entry=>{
              if(!entry||typeof entry!=='object') return '';
              const label=clean(entry.label);
              const value=clean(entry.value);
              if(label&&value) return `${label}: ${value}`;
              if(label) return `${label}:`;
              return value;
            })
            .filter(Boolean)
            .join('\n')
        :'';
      const modsText=toLineString(this.rawMods);
      const routineFindingsNotice=resolvedTab==='routine'?this.getRoutineFindingsStatusNotice():'';
      const spareFindingsText=toLineString(this.rawSpareFindings);
      const findingsText=(routineFindingsNotice&&spareFindingsText)
        ? `${routineFindingsNotice}\n${spareFindingsText}`
        : (routineFindingsNotice||toLineString(this.rawFindings));
      const replacements={
        findings:findingsText,
        nonroutine:toLineString(this.rawNonroutineFindings),
        actions:toLineString(this.rawActions),
        routine:toLineString(this.rawRoutine),
        mods:modsText,
        parts:partsText,
        times:timesText,
        sn_in:clean(this.exchangeInputText||this.activeState?.exchangeInput||''),
        sn_out:clean(this.exchangeOutputText||this.activeState?.exchangeOutput||''),
        rfr:clean(this.removalReason||this.activeState?.rfr||''),
        reason:clean(this.reasonText||this.activeState?.reason||''),
        label:typeof this.currentLabel==='string'?this.currentLabel:''
      };
      const expanded=raw.replace(/\{([a-z_]+)\}/gi,(match,key)=>{
        const normalized=key.toLowerCase();
        if(Object.prototype.hasOwnProperty.call(replacements,normalized)){
          return replacements[normalized];
        }
        return match;
      }).replace(/aspen:([\w.-]+)/gi,(match,fieldKey)=>{
        const value=this.resolveAspenKeywordValue(fieldKey);
        return value||match;
      });
      return expanded;
    }

    updateFreitextPreview(){
      const rawText=typeof this.freitextDraft==='string'?this.freitextDraft:'';
      const expanded=this.expandPlaceholders(rawText,{tabKey:this.getActiveRoutineEditorTab()});
      this.updateFreitextPreviewWithExpanded(expanded);
    }

    updateFreitextPreviewWithExpanded(expanded,tabKey=this.getActiveRoutineEditorTab()){
      const text=typeof expanded==='string'?expanded:'';
      const hasContent=text.trim().length>0;
      const config=this.getRoutineEditorTabConfig(tabKey);
      const emptyText=config?.previewEmpty||'Keine Routine-Daten vorhanden.';
      if(this.routineEditorPreviewContent){
        this.routineEditorPreviewContent.textContent=hasContent?text:emptyText;
      }
      if(this.routineEditorPreviewPanel){
        this.routineEditorPreviewPanel.classList.toggle('is-empty',!hasContent);
      }
    }

    commitFreitextDraft(value,options={}){
      const rawText=typeof value==='string'?value:(typeof this.freitextDraft==='string'?this.freitextDraft:'');
      const activeTab=this.getActiveRoutineEditorTab();
      const targetConfig=this.getRoutineEditorTabConfig(activeTab);
      const targetKey=targetConfig&&targetConfig.primaryTextarea?targetConfig.primaryTextarea:'routine';
      this.freitextDraft=rawText;
      if(this.freitextTextarea&&this.freitextTextarea.value!==rawText){
        this.freitextTextarea.value=rawText;
      }
      const expanded=this.expandPlaceholders(rawText,{tabKey:activeTab});
      const targetTextarea=this.textareas&&this.textareas[targetKey];
      if(targetTextarea&&targetTextarea.value!==expanded){
        targetTextarea.value=expanded;
        if(typeof autoResizeTextarea==='function'){
          try{autoResizeTextarea(targetTextarea);}catch{}
        }
      }
      if(this.activeState&&typeof this.activeState==='object'){
        this.activeState.freitextTemplate=rawText;
        if(Object.prototype.hasOwnProperty.call(this.activeState,targetKey)){
          this.activeState[targetKey]=expanded;
        }
      }
      this.setRoutineEditorFreitextTemplate(rawText,activeTab);
      this.updateFreitextPreviewWithExpanded(expanded,activeTab);
      this.queueStateSave();
      if(options&&options.closeOverlay){
        this.closeRoutineEditorOverlay();
      }
    }

    insertFreitextPlaceholder(key){
      if(typeof key!=='string'||!key) return;
      const textarea=this.freitextTextarea;
      if(!textarea) return;
      const token=`{${key}}`;
      try{textarea.focus({preventScroll:true});}catch{textarea.focus();}
      const value=typeof textarea.value==='string'?textarea.value:'';
      let startPos;
      let endPos;
      try{
        startPos=typeof textarea.selectionStart==='number'?textarea.selectionStart:value.length;
        endPos=typeof textarea.selectionEnd==='number'?textarea.selectionEnd:value.length;
      }catch{
        startPos=value.length;
        endPos=value.length;
      }
      const prefix=value.slice(0,startPos);
      const suffix=value.slice(endPos);
      const nextValue=`${prefix}${token}${suffix}`;
      if(textarea.value!==nextValue){
        textarea.value=nextValue;
      }
      const cursorPosition=prefix.length+token.length;
      try{textarea.setSelectionRange(cursorPosition,cursorPosition);}catch{}
      this.commitFreitextDraft(nextValue);
      if(typeof autoResizeTextarea==='function'){
        try{autoResizeTextarea(textarea);}catch{}
      }
    }

    getActiveFreitextTemplate(){
      const activeTab=this.getActiveRoutineEditorTab();
      const profileTemplate=this.getRoutineEditorFreitextTemplate(activeTab);
      if(profileTemplate) return profileTemplate;
      const stored=typeof this.activeState?.freitextTemplate==='string'?this.activeState.freitextTemplate:'';
      if(stored) return stored;
      const fallback=typeof this.activeState?.routine==='string'?this.activeState.routine:'';
      return fallback||'';
    }

    setFreitextEditorValue(value){
      const text=typeof value==='string'?value:'';
      this.commitFreitextDraft(text);
      if(typeof autoResizeTextarea==='function'&&this.freitextTextarea){
        try{autoResizeTextarea(this.freitextTextarea);}catch{}
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
      this.refreshRoutineEditorStatusSection();
      if(this.routineEditorOverlay&&this.routineEditorOverlay.classList.contains('open')){
        this.renderRoutineEditorOverlayContent();
        const template=this.getActiveFreitextTemplate();
        this.setFreitextEditorValue(template);
      }
      this.refreshRoutineEditorPreview();
      this.updateRoutineEditorBlockShopAvailability();
    }

    getOutputColumnCount(){
      return normalizeOutputColumnCount(this.outputColumnCount);
    }

    setOutputColumnCount(count){
      const normalized=normalizeOutputColumnCount(count);
      if(this.outputColumnCount===normalized) return;
      this.outputColumnCount=normalized;
      storeOutputColumnCount(normalized);
      this.render();
    }

    getRoutineEditorFreitextTemplate(tabKey=this.getActiveRoutineEditorTab()){
      const key=getRoutineEditorTabKey(tabKey);
      this.ensureRoutineEditorState();
      const templates=this.routineEditorState&&this.routineEditorState.freitextTemplates;
      if(templates&&typeof templates[key]==='string'){
        return templates[key];
      }
      return '';
    }

    setRoutineEditorFreitextTemplate(value,tabKey=this.getActiveRoutineEditorTab()){
      const key=getRoutineEditorTabKey(tabKey);
      this.ensureRoutineEditorState();
      if(!this.routineEditorState.freitextTemplates||typeof this.routineEditorState.freitextTemplates!=='object'){
        this.routineEditorState.freitextTemplates=createDefaultFreitextTemplates();
      }
      const normalizedValue=typeof value==='string'?value:'';
      if(this.routineEditorState.freitextTemplates[key]===normalizedValue) return;
      this.routineEditorState.freitextTemplates[key]=normalizedValue;
      this.saveRoutineEditorState(this.routineEditorState);
      this.updateRoutineEditorPresetDirtyState();
      this.updateRoutineEditorPresetControls();
      this.evaluateRoutineEditorPresetMatch();
    }

    updateRoutineEditorPreviewTabs(){
      if(this.routineEditorPreviewTabButtons instanceof Map){
        this.routineEditorPreviewTabButtons.forEach((button,key)=>{
          if(!button) return;
          button.classList.toggle('is-active',this.routineEditorActiveTab===key);
        });
      }
      if(this.routineEditorPreviewTitleElement){
        if(this.routineEditorPreviewTabButtons instanceof Map&&this.routineEditorPreviewTabButtons.size){
          const def=OUTPUT_DEFS.find(item=>item.key===this.routineEditorActiveTab)||OUTPUT_DEFS.find(item=>item.key==='routine');
          const label=def?def.label:'Routine';
          this.routineEditorPreviewTitleElement.textContent=`${label}-Vorschau`;
        }else{
          this.routineEditorPreviewTitleElement.textContent='Freitext-Vorschau';
        }
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
      if(def.customType==='linebreak'){
        return;
      }
      if(def.customType==='aspenfield'){
        const input=info.aspenFieldInput||container.querySelector('input.nsf-editor-aspenfield-input');
        const value=Array.isArray(lines)&&lines.length?lines[0]:'';
        if(input){
          input.value=typeof value==='string'?value:'';
        }
        if(info.definition){
          info.definition.value=typeof value==='string'?value:'';
          info.definition.lines=[typeof value==='string'?value:''];
        }
        return;
      }
      if(def.customType==='text'){
        const textarea=info.customTextInput||container.querySelector('textarea.nsf-editor-input');
        const value=Array.isArray(lines)?lines.join('\n'):'';
        if(textarea){
          textarea.value=typeof value==='string'?value:'';
          autoSizeTextarea(textarea);
        }
        if(info.definition){
          info.definition.content=typeof value==='string'?value:'';
          info.definition.lines=Array.isArray(lines)?lines.slice():[typeof value==='string'?value:''];
        }
        return;
      }
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
        if(entry&&entry.type==='aspenfield'){
          const value=typeof entry.value==='string'?entry.value:(Array.isArray(entry.lines)&&entry.lines.length?entry.lines[0]:'');
          const trimmed=clean(value);
          return trimmed?[trimmed]:[];
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
      this.commitFreitextDraft(undefined,{closeOverlay:true});
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
        sections.push({title:'',body:routineAction});
      }
      if(!sections.length){
        return fallback;
      }
      const lines=[];
      sections.forEach((section,idx)=>{
        if(section.title){
          lines.push(section.title);
        }
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

    setRemovalReason(reasonText){
      if(!this.meldung) return;
      const cleaned=clean(reasonText);
      if(!cleaned) return;
      this.removalReason=cleaned;
      this.removalOptionsCollapsed=true;
      if(this.activeState&&typeof this.activeState==='object'){
        this.activeState.rfr=cleaned;
      }
      this.undoBuffer=null;
      this.syncOutputsWithSelections({persist:false});
      this.persistState(true);
      this.queueEventAutoUpdate();
      this.render();
    }

    setReasonText(reasonText){
      if(!this.meldung) return;
      const cleaned=typeof reasonText==='string'?reasonText.trim():'';
      if(this.reasonText===cleaned) return;
      this.reasonText=cleaned;
      if(this.activeState&&typeof this.activeState==='object'){
        this.activeState.reason=cleaned;
      }
      this.syncOutputsWithSelections({persist:false});
      this.queueStateSave();
      this.queueEventAutoUpdate();
    }

    setExchangeInputText(exchangeText){
      if(!this.meldung) return;
      const cleaned=clean(exchangeText);
      if(this.exchangeInputText===cleaned) return;
      this.exchangeInputText=cleaned;
      if(this.activeState&&typeof this.activeState==='object'){
        this.activeState.exchangeInput=cleaned;
      }
      this.syncOutputsWithSelections({persist:false});
      this.queueStateSave();
      this.queueEventAutoUpdate();
    }

    setExchangeOutputText(exchangeText){
      if(!this.meldung) return;
      const cleaned=clean(exchangeText);
      if(this.exchangeOutputText===cleaned) return;
      this.exchangeOutputText=cleaned;
      if(this.activeState&&typeof this.activeState==='object'){
        this.activeState.exchangeOutput=cleaned;
      }
      this.syncOutputsWithSelections({persist:false});
      this.queueStateSave();
      this.queueEventAutoUpdate();
    }

    handleFindingsEditorUpdate(detail){
      if(!detail||typeof detail!=='object') return;
      const updated=detail.entry&&typeof detail.entry==='object'?detail.entry:null;
      if(!updated) return;
      const target=detail.target&&typeof detail.target==='object'?detail.target:null;
      const updatedAny=this.applyFindingsEditorUpdate(updated,target);
      if(updatedAny){
        this.syncOutputsWithSelections({persist:false});
        this.persistState(true);
        this.queueEventAutoUpdate();
        this.render();
      }
    }

    applyFindingsEditorUpdate(updated,target){
      const sourceKey=clean(target?.sourceKey||'');
      const matchLabel=clean(target?.label||updated.label||'').toLowerCase();
      const matchFinding=clean(target?.findings||updated.findings||'').toLowerCase();
      const matchAction=clean(target?.actions||updated.actions||'').toLowerCase();
      const partsPairs=Array.isArray(updated.partsPairs)
        ? updated.partsPairs
        : Array.isArray(updated.parts)
          ? updated.parts
          : [];
      const normalizedParts=nsfNormalizeParts({parts:partsPairs});
      const partsArray=normalizedParts.map(pair=>({part:pair.part,menge:pair.quantity}));
      const partsText=normalizedParts.length
        ? normalizedParts
            .map(pair=>{
              const qty=clean(pair.quantity);
              const part=clean(pair.part);
              if(qty&&qty!=='1') return `${qty}x ${part}`;
              return part;
            })
            .filter(Boolean)
            .join('\n')
        : '';
      let updatedAny=false;
      this.selectedEntries=this.selectedEntries.map(sel=>{
        if(!sel) return sel;
        const label=clean(sel.label).toLowerCase();
        const finding=clean(sel.finding).toLowerCase();
        const action=clean(sel.action).toLowerCase();
        const matchesKey=sourceKey&&sel.key===sourceKey;
        const matchesText=(!sourceKey&&matchLabel&&label===matchLabel)
          ||(matchFinding&&finding===matchFinding)
          ||(matchAction&&action===matchAction);
        if(!matchesKey&&!matchesText) return sel;
        updatedAny=true;
        return {
          ...sel,
          label:clean(updated.label||''),
          finding:clean(updated.findings||''),
          action:clean(updated.actions||''),
          routineAction:clean(updated.routineAction||''),
          nonroutine:clean(updated.nonroutine||''),
          parts:partsArray,
          partsText
        };
      });
      return updatedAny;
    }

    findMatchingEntryForSelection(selection){
      if(!selection||!Array.isArray(this.allEntries)) return null;
      const targetLabel=clean(selection.label).toLowerCase();
      const targetFinding=clean(selection.finding).toLowerCase();
      const targetAction=clean(selection.action).toLowerCase();
      const targetRoutine=clean(selection.routineAction||selection.routine||'').toLowerCase();
      const targetNonroutine=clean(selection.nonroutine||'').toLowerCase();
      const targetPart=normalizePart(selection.part||this.currentPart||'');
      let best=null;
      let bestScore=0;
      for(const entry of this.allEntries){
        if(!entry) continue;
        let score=0;
        if(targetLabel){
          if(entry.labelLower===targetLabel) score+=5;
          else if(entry.labelLower&&entry.labelLower.includes(targetLabel)) score+=2;
        }
        if(targetFinding){
          if(entry.findingLower===targetFinding) score+=4;
          else if(entry.findingLower&&entry.findingLower.includes(targetFinding)) score+=2;
        }
        if(targetAction){
          if(entry.actionLower===targetAction) score+=3;
          else if(entry.actionLower&&entry.actionLower.includes(targetAction)) score+=1;
        }
        if(targetRoutine){
          if(entry.routineAction&&entry.routineAction.toLowerCase()===targetRoutine) score+=2;
        }
        if(targetNonroutine){
          if(entry.nonroutine&&entry.nonroutine.toLowerCase()===targetNonroutine) score+=2;
        }
        if(targetPart&&Array.isArray(entry.partNumbers)){
          const normalizedParts=entry.partNumbers.map(item=>normalizePart(item)).filter(Boolean);
          if(normalizedParts.includes(targetPart)) score+=2;
        }
        if(score>bestScore){
          bestScore=score;
          best=entry;
        }
      }
      return bestScore>0?best:null;
    }

    hydrateSelections(selections){
      const normalized=Array.isArray(selections)?selections:[];
      return normalized.map(sel=>{
        const resolved=this.entryMap.get(sel.key)||this.findMatchingEntryForSelection(sel);
        if(resolved){
          const storedPart=normalizePart(sel.part);
          const matchedPart=storedPart||resolveMatchedPart(resolved,this.currentPart);
          return {
            ...resolved,
            key:resolved.key,
            status:typeof sel.status==='string'?sel.status:'',
            routine:resolved.routine||sel.routine||'',
            routineFinding:resolved.routineFinding||resolved.routineFindings||sel.routineFinding||'',
            routineAction:resolved.routineAction||resolved.routineActions||sel.routineAction||'',
            nonroutine:resolved.nonroutine||sel.nonroutine||'',
            nonroutineFinding:resolved.nonroutineFinding||resolved.nonroutineFindings||sel.nonroutineFinding||'',
            nonroutineAction:resolved.nonroutineAction||resolved.nonroutineActions||sel.nonroutineAction||'',
            partsText:resolved.partsText||sel.partsText||'',
            parts:Array.isArray(resolved.parts)
              ? resolved.parts.map(item=>{
                  const partValue=clean(item?.part||'');
                  if(!partValue) return null;
                  const quantityValue=clean(item?.menge??item?.quantity??'');
                  const partEntry={part:partValue};
                  if(quantityValue) partEntry.menge=quantityValue;
                  return partEntry;
                }).filter(Boolean)
              : Array.isArray(sel.parts)
                ? sel.parts.map(item=>{
                    const partValue=clean(item?.part||'');
                    if(!partValue) return null;
                    const quantityValue=clean(item?.menge??item?.quantity??'');
                    const partEntry={part:partValue};
                    if(quantityValue) partEntry.menge=quantityValue;
                    return partEntry;
                  }).filter(Boolean)
                : [],
            timesText:resolved.timesText||sel.timesText||'',
            times:(resolved.times&&typeof resolved.times==='object')
              ? {...resolved.times}
              : (sel.times&&typeof sel.times==='object'?{...sel.times}:{}),
            modsText:resolved.modsText||sel.modsText||'',
            mods:Array.isArray(resolved.mods)
              ? resolved.mods.map(item=>clean(item)).filter(Boolean)
              : Array.isArray(sel.mods)
                ? sel.mods.map(item=>clean(item)).filter(Boolean)
                : [],
            part:matchedPart||resolved.part
          };
        }
        return {
          key:sel.key,
          finding:sel.finding||'',
          action:sel.action||'',
          label:sel.label||'',
          status:typeof sel.status==='string'?sel.status:'',
          part:normalizePart(sel.part)||this.currentPart,
          routine:sel.routine||'',
          routineFinding:sel.routineFinding||'',
          routineAction:sel.routineAction||'',
          nonroutine:sel.nonroutine||'',
          nonroutineFinding:sel.nonroutineFinding||'',
          nonroutineAction:sel.nonroutineAction||'',
          parts:sel.parts||'',
          times:sel.times||'',
          mods:sel.mods||'',
          raw:sel.raw!=null?cloneDeep(sel.raw):null
        };
      });
    }

    async createEventSnapshot(){
      if(!this.eventHistoryKey||!this.selectedEntries.length) return;
      await this.ensureEventHistoryStore();
      const timestamp=new Date();
      const entry={
        id:createEventId(),
        createdAt:timestamp.toISOString(),
        selections:serializeEventHistorySelections(this.selectedEntries),
        rfr:clean(this.removalReason||this.activeState?.rfr||''),
        reason:clean(this.reasonText||this.activeState?.reason||''),
        exchangeInput:clean(this.exchangeInputText||this.activeState?.exchangeInput||''),
        exchangeOutput:clean(this.exchangeOutputText||this.activeState?.exchangeOutput||'')
      };
      pushEventHistory(this.eventHistoryStore,this.eventHistoryKey,entry);
      const writeResult=await writeEventHistoryStoreToFile(this.eventHistoryStore);
      if(writeResult?.modified!=null){
        this.historyLastModified=writeResult.modified;
      }
      this.eventHistory=getEventHistoryForKey(this.eventHistoryStore,this.eventHistoryKey);
      this.activeEventId=entry.id;
      this.render();
    }

    async ensureDefaultEventHistoryEntry(){
      if(!this.eventHistoryKey) return;
      await this.ensureEventHistoryStore();
      const historyList=getEventHistoryForKey(this.eventHistoryStore,this.eventHistoryKey);
      if(historyList.length) return;
      const timestamp=new Date();
      const entry={
        id:createEventId(),
        createdAt:timestamp.toISOString(),
        selections:serializeEventHistorySelections(this.selectedEntries),
        rfr:clean(this.removalReason||this.activeState?.rfr||''),
        reason:clean(this.reasonText||this.activeState?.reason||''),
        exchangeInput:clean(this.exchangeInputText||this.activeState?.exchangeInput||''),
        exchangeOutput:clean(this.exchangeOutputText||this.activeState?.exchangeOutput||'')
      };
      pushEventHistory(this.eventHistoryStore,this.eventHistoryKey,entry);
      const writeResult=await writeEventHistoryStoreToFile(this.eventHistoryStore);
      if(writeResult?.modified!=null){
        this.historyLastModified=writeResult.modified;
      }
      this.eventHistory=getEventHistoryForKey(this.eventHistoryStore,this.eventHistoryKey);
      this.activeEventId=entry.id;
    }

    queueEventAutoUpdate(){
      if(!this.eventHistoryKey||!this.selectedEntries.length) return;
      if(this.eventUpdateTimer) clearTimeout(this.eventUpdateTimer);
      this.eventUpdateTimer=setTimeout(()=>{
        this.eventUpdateTimer=null;
        void this.updateEventSnapshot();
      },EVENT_AUTO_UPDATE_DEBOUNCE);
    }

    async updateEventSnapshot(){
      if(!this.eventHistoryKey||!this.selectedEntries.length) return;
      await this.ensureEventHistoryStore();
      const historyList=getEventHistoryForKey(this.eventHistoryStore,this.eventHistoryKey);
      if(!historyList.length) return;
      const targetId=this.activeEventId||historyList[0].id;
      if(!targetId) return;
      const storedList=this.eventHistoryStore?.events?.[this.eventHistoryKey];
      if(!Array.isArray(storedList)) return;
      const updatedSelections=serializeEventHistorySelections(this.selectedEntries);
      const updatedRfr=clean(this.removalReason||this.activeState?.rfr||'');
      const updatedReason=clean(this.reasonText||this.activeState?.reason||'');
      const updatedExchangeInput=clean(this.exchangeInputText||this.activeState?.exchangeInput||'');
      const updatedExchangeOutput=clean(this.exchangeOutputText||this.activeState?.exchangeOutput||'');
      let changed=false;
      const next=storedList.map(item=>{
        if(!item||item.id!==targetId) return item;
        changed=true;
        return {
          ...item,
          selections:updatedSelections,
          rfr:updatedRfr,
          reason:updatedReason,
          exchangeInput:updatedExchangeInput,
          exchangeOutput:updatedExchangeOutput
        };
      });
      if(!changed) return;
      this.eventHistoryStore.events[this.eventHistoryKey]=next;
      const writeResult=await writeEventHistoryStoreToFile(this.eventHistoryStore);
      if(writeResult?.modified!=null){
        this.historyLastModified=writeResult.modified;
      }
      this.eventHistory=getEventHistoryForKey(this.eventHistoryStore,this.eventHistoryKey);
    }

    async deleteEventHistoryEntry(entry){
      if(!entry||!this.eventHistoryKey) return;
      const label=formatEventTimestamp(entry.createdAt);
      const count=Array.isArray(entry.selections)?entry.selections.length:0;
      const confirmText=label
        ?`Ereignis vom ${label} (${count} Findings) wirklich löschen?`
        :'Ereignis wirklich löschen?';
      if(!window.confirm(confirmText)) return;
      await this.ensureEventHistoryStore();
      const removed=removeEventHistoryEntry(this.eventHistoryStore,this.eventHistoryKey,entry.id);
      if(!removed) return;
      const writeResult=await writeEventHistoryStoreToFile(this.eventHistoryStore);
      if(writeResult?.modified!=null){
        this.historyLastModified=writeResult.modified;
      }
      this.eventHistory=getEventHistoryForKey(this.eventHistoryStore,this.eventHistoryKey);
      if(this.activeEventId===entry.id){
        this.activeEventId=this.eventHistory[0]?.id||'';
      }
      this.render();
    }

    applyEventSnapshotToState(entry,options){
      if(!entry) return;
      const selections=deserializeSelections(entry);
      this.selectedEntries=this.hydrateSelections(selections);
      if(this.activeState&&typeof this.activeState==='object'){
        if(typeof entry.rfr==='string'){
          this.removalReason=clean(entry.rfr);
          this.activeState.rfr=this.removalReason;
          this.removalOptionsCollapsed=!!this.removalReason;
        }
        if(typeof entry.reason==='string'){
          this.reasonText=clean(entry.reason);
          this.activeState.reason=this.reasonText;
        }
        if(typeof entry.exchangeInput==='string'){
          this.exchangeInputText=clean(entry.exchangeInput);
          this.activeState.exchangeInput=this.exchangeInputText;
        }
        if(typeof entry.exchangeOutput==='string'){
          this.exchangeOutputText=clean(entry.exchangeOutput);
          this.activeState.exchangeOutput=this.exchangeOutputText;
        }
      }
      this.undoBuffer=null;
      this.syncOutputsWithSelections({persist:false});
      if(options&&options.persist){
        this.persistState(true);
      }
    }

    applyEventSnapshot(entry){
      if(!entry) return;
      this.applyEventSnapshotToState(entry,{persist:true});
      this.render();
    }

    addInputRow(prefillEntry,focusNext){
      const row=document.createElement('div');
      row.className='nsf-input-row';
      const statusSelect=document.createElement('select');
      statusSelect.className='nsf-status-select';
      const statusPlaceholder=document.createElement('option');
      statusPlaceholder.value='';
      statusPlaceholder.textContent='Status wählen…';
      statusSelect.appendChild(statusPlaceholder);
      FINDING_STATUS_OPTIONS.forEach(option=>{
        const opt=document.createElement('option');
        opt.value=option;
        opt.textContent=option;
        statusSelect.appendChild(opt);
      });
      statusSelect.disabled=!this.meldung;
      statusSelect.value=DEFAULT_FINDING_STATUS;
      const input=document.createElement('input');
      input.type='text';
      input.className='nsf-input';
      input.placeholder=this.availableEntries.length?'Finding auswählen…':'Keine Findings verfügbar';
      input.disabled=!this.availableEntries.length;
      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='nsf-suggestions-toggle';
      toggle.innerHTML='<svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path fill="currentColor" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 0 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z"/></svg>';
      toggle.setAttribute('aria-label','Vorschläge anzeigen');
      toggle.setAttribute('aria-expanded','false');
      toggle.disabled=!this.availableEntries.length;
      const removeBtn=document.createElement('button');
      removeBtn.type='button';
      removeBtn.className='nsf-remove-btn';
      removeBtn.innerHTML='<svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path fill="currentColor" d="M6.5 7.5h7v7.25a1.25 1.25 0 0 1-1.25 1.25h-4.5A1.25 1.25 0 0 1 6.5 14.75V7.5Zm2.25-3h2.5a1 1 0 0 1 1 1V6h3a.75.75 0 0 1 0 1.5H4.5a.75.75 0 0 1 0-1.5h3v-.5a1 1 0 0 1 1-1Z"/></svg>';
      removeBtn.title='Finding löschen';
      removeBtn.setAttribute('aria-label',removeBtn.title);
      const editBtn=document.createElement('button');
      editBtn.type='button';
      editBtn.className='nsf-edit-btn';
      editBtn.innerHTML='<svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path fill="currentColor" d="M4.75 13.5v1.75h1.75l6.8-6.8-1.75-1.75-6.8 6.8Zm10.45-6.2a.75.75 0 0 0 0-1.06l-1.44-1.44a.75.75 0 0 0-1.06 0l-1.1 1.1 2.5 2.5 1.1-1.1Z"/></svg>';
      editBtn.title='Finding bearbeiten';
      editBtn.setAttribute('aria-label',editBtn.title);
      editBtn.disabled=true;
      const field=document.createElement('div');
      field.className='nsf-input-field';
      field.append(toggle,input,editBtn,removeBtn);
      const suggestions=document.createElement('div');
      suggestions.className='nsf-suggestions';
      const controls=document.createElement('div');
      controls.className='nsf-input-controls';
      controls.append(statusSelect,field);
      row.append(controls,suggestions);
      this.inputsContainer.appendChild(row);
      const ensureStatusOption=value=>{
        if(!value) return;
        const exists=Array.from(statusSelect.options).some(option=>option.value===value);
        if(!exists){
          const opt=document.createElement('option');
          opt.value=value;
          opt.textContent=value;
          statusSelect.appendChild(opt);
        }
      };
      const state={
        row,
        statusSelect,
        ensureStatusOption,
        input,
        toggle,
        suggestions,
        removeBtn,
        suggestionsList:[],
        highlightIndex:-1,
        locked:false,
        entry:null,
        statusValue:'',
        outsideHandler:null,
        isOpen:false,
        editBtn
      };
      state.statusValue=DEFAULT_FINDING_STATUS;
      const updateStatus=()=>{
        const nextStatus=normalizeFindingStatus(statusSelect.value);
        state.statusValue=nextStatus;
        if(state.entry){
          state.entry.status=nextStatus;
          const entryKey=state.entry.key;
          const fallbackMatch=sel=>sel.label===state.entry.label
            && sel.finding===state.entry.finding
            && sel.action===state.entry.action;
          let selectionUpdated=false;
          this.selectedEntries.forEach(sel=>{
            if((entryKey&&sel.key===entryKey)||(!entryKey&&fallbackMatch(sel))){
              if(sel.status!==nextStatus){
                sel.status=nextStatus;
                selectionUpdated=true;
              }
            }
          });
          if(selectionUpdated){
            this.syncOutputsWithSelections({persist:false});
            this.flushStateSave(true);
            this.queueEventAutoUpdate();
          }
          this.scheduleRender();
        }
      };
      const updateHighlight=()=>{
        if(!state.isOpen) return;
        const children=Array.from(suggestions.children);
        children.forEach((child,idx)=>{
          if(idx===state.highlightIndex){
            child.classList.add('active');
          }else{
            child.classList.remove('active');
          }
        });
      };
      const closeSuggestions=()=>{
        state.isOpen=false;
        row.classList.remove('show-suggestions');
        toggle.classList.remove('is-active');
        toggle.setAttribute('aria-expanded','false');
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
        if(!matches.length){
          state.highlightIndex=-1;
          if(state.isOpen){
            closeSuggestions();
          }
          return;
        }
        if(state.highlightIndex<0||state.highlightIndex>=matches.length){
          state.highlightIndex=0;
        }
        suggestions.innerHTML='';
        if(!state.isOpen) return;
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
      const openSuggestions=()=>{
        if(state.locked||!this.availableEntries.length) return;
        if(!state.isOpen){
          state.isOpen=true;
          row.classList.add('show-suggestions');
          toggle.classList.add('is-active');
          toggle.setAttribute('aria-expanded','true');
          if(!state.outsideHandler){
            state.outsideHandler=event=>{
              if(!row.contains(event.target)) closeSuggestions();
            };
            document.addEventListener('pointerdown',state.outsideHandler,true);
          }
        }
        updateSuggestions();
        updateHighlight();
      };
      const selectCurrent=()=>{
        if(!state.isOpen||state.highlightIndex<0) return;
        const entry=state.suggestionsList[state.highlightIndex];
        if(entry) this.acceptSelection(entry,state);
      };
      toggle.addEventListener('click',event=>{
        event.preventDefault();
        if(state.locked||toggle.disabled) return;
        if(state.isOpen){
          closeSuggestions();
        }else{
          input.focus();
          openSuggestions();
        }
      });
      input.addEventListener('input',()=>{
        if(state.locked) return;
        const hasQuery=input.value.trim().length>0;
        if(hasQuery){
          if(!state.isOpen){
            openSuggestions();
          }else{
            updateSuggestions();
            updateHighlight();
          }
        }else if(state.isOpen){
          closeSuggestions();
        }
      });
      input.addEventListener('keydown',e=>{
        if(state.locked) return;
        if(e.key==='ArrowDown'){
          if(!state.isOpen){
            e.preventDefault();
            openSuggestions();
            return;
          }
          if(state.suggestionsList.length){
            e.preventDefault();
            state.highlightIndex=(state.highlightIndex+1)%state.suggestionsList.length;
            updateHighlight();
          }
        }else if(e.key==='ArrowUp'){
          if(!state.isOpen){
            e.preventDefault();
            openSuggestions();
            return;
          }
          if(state.suggestionsList.length){
            e.preventDefault();
            state.highlightIndex=(state.highlightIndex-1+state.suggestionsList.length)%state.suggestionsList.length;
            updateHighlight();
          }
        }else if(e.key==='Enter'){
          if(state.isOpen&&state.suggestionsList.length){
            e.preventDefault();
            selectCurrent();
          }
        }else if(e.key==='Escape'){
          if(state.isOpen){
            e.preventDefault();
            closeSuggestions();
          }
        }
      });
      input.addEventListener('focus',()=>{
        if(state.locked) return;
        if(input.value.trim().length>0){
          openSuggestions();
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
      editBtn.addEventListener('click',()=>{
        if(editBtn.disabled||!state.entry) return;
        this.openFindingsEditorForEntry(state.entry);
      });
      statusSelect.addEventListener('change',updateStatus);
      state.closeSuggestions=closeSuggestions;
      state.openSuggestions=openSuggestions;
      this.selectionRows.push(state);
      if(prefillEntry){
        const prefillStatus=normalizeFindingStatus(prefillEntry.status)||DEFAULT_FINDING_STATUS;
        if(prefillStatus){
          ensureStatusOption(prefillStatus);
          statusSelect.value=prefillStatus;
          state.statusValue=prefillStatus;
        }
        this.lockRow(state,prefillEntry,{persist:false,updateState:false,syncOutputs:false});
      }else if(focusNext){
        setTimeout(()=>{
          if(state.locked) return;
          const active=document.activeElement;
          const root=this.root instanceof HTMLElement?this.root:null;
          if(active&&active!==document.body){
            const isActiveInRoot=root&&root.contains(active);
            const isDisconnected=active instanceof Node&&!active.isConnected;
            if(!isActiveInRoot&&!isDisconnected) return;
          }
          input.focus();
        },60);
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
      const hideBefore=this.shouldHideNonroutineOutput();
      if(state.outsideHandler){
        document.removeEventListener('pointerdown',state.outsideHandler,true);
        state.outsideHandler=null;
      }
      state.locked=true;
      if(typeof state.closeSuggestions==='function'){
        state.closeSuggestions();
      }
      const routineText=this.buildRoutineOutput(entry);
      const nonroutineText=clean(entry.nonroutine||'');
      const nonroutineFindingText=clean(entry.nonroutineFinding||'');
      const nonroutineActionText=clean(entry.nonroutineAction||'');
      const routineFindingText=clean(entry.routineFinding||'');
      const routineActionText=clean(entry.routineAction||'');
      const partsText=clean(entry.partsText||'');
      const repairOrderValue=clean(this.repairOrder||'');
      const statusValue=normalizeFindingStatus(state.statusValue||entry.status);
      state.statusValue=statusValue;
      state.entry={
        key:entry.key,
        finding:entry.finding||'',
        action:entry.action||'',
        label:entry.label||'',
        status:statusValue||'',
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
      if(state.ensureStatusOption){
        state.ensureStatusOption(statusValue);
      }
      if(state.statusSelect&&statusValue){
        state.statusSelect.value=statusValue;
      }
      state.input.value=entry.label||entry.finding||entry.action||'Auswahl';
      state.input.disabled=true;
      state.row.classList.add('locked');
      if(state.editBtn){
        state.editBtn.disabled=false;
      }
      if(state.toggle){
        state.toggle.disabled=true;
        state.toggle.classList.remove('is-active');
        state.toggle.setAttribute('aria-expanded','false');
      }
      state.suggestions.innerHTML='';
      state.suggestionsList=[];
      state.highlightIndex=-1;
      if(opts.persist!==false){
        this.addSelection(entry,statusValue);
      }
      if(opts.syncOutputs!==false){
        this.syncOutputsWithSelections({persist:false});
      }
      const hideAfter=this.shouldHideNonroutineOutput();
      if(hideBefore!==hideAfter){
        this.scheduleRender();
      }
      if(opts.updateState!==false){
        this.flushStateSave(true);
      }
    }

    addSelection(entry,statusValue){
      if(!entry) return;
      const resolved=this.resolveEntry(entry)||entry;
      const key=resolved&&resolved.key?resolved.key:entry.key;
      if(!key) return;
      if(!this.selectedEntries.some(sel=>sel.key===key)){
        const normalizedStatus=normalizeFindingStatus(statusValue||resolved.status||entry.status);
        const routineFinding=resolved.routineFinding||resolved.routineFindings||'';
        const routineAction=resolved.routineAction||resolved.routineActions||'';
        const nonroutineFinding=resolved.nonroutineFinding||resolved.nonroutineFindings||'';
        const nonroutineAction=resolved.nonroutineAction||resolved.nonroutineActions||'';
        const partsValue=typeof resolved.partsText==='string'
          ? resolved.partsText
          : (typeof entry.partsText==='string'?entry.partsText:'');
        const timesValue=typeof resolved.timesText==='string'
          ? resolved.timesText
          : (typeof entry.timesText==='string'?entry.timesText:'');
        const modsValue=typeof resolved.modsText==='string'
          ? resolved.modsText
          : (typeof entry.modsText==='string'?entry.modsText:'');
        const partsArray=Array.isArray(resolved.parts)
          ? resolved.parts.map(item=>{
              const partValue=clean(item?.part||'');
              if(!partValue) return null;
              const quantityValue=clean(item?.menge??item?.quantity??'');
              const partEntry={part:partValue};
              if(quantityValue) partEntry.menge=quantityValue;
              return partEntry;
            }).filter(Boolean)
          : Array.isArray(entry.parts)
            ? entry.parts.map(item=>{
                const partValue=clean(item?.part||'');
                if(!partValue) return null;
                const quantityValue=clean(item?.menge??item?.quantity??'');
                const partEntry={part:partValue};
                if(quantityValue) partEntry.menge=quantityValue;
                return partEntry;
              }).filter(Boolean)
            : [];
        const timesObject=(resolved.times&&typeof resolved.times==='object')
          ? {...resolved.times}
          : (entry.times&&typeof entry.times==='object'?{...entry.times}:{});
        const modsArray=Array.isArray(resolved.mods)
          ? resolved.mods.map(item=>clean(item)).filter(Boolean)
          : Array.isArray(entry.mods)
            ? entry.mods.map(item=>clean(item)).filter(Boolean)
            : [];
        const selection={
          key,
          finding:resolved.finding||entry.finding||'',
          action:resolved.action||entry.action||'',
          label:resolved.label||entry.label||'',
          status:normalizedStatus||'',
          part:resolveMatchedPart(resolved,this.currentPart),
          routine:resolved.routine||'',
          routineFinding:routineFinding||'',
          routineAction:routineAction||'',
          nonroutine:resolved.nonroutine||'',
          nonroutineFinding:nonroutineFinding||'',
          nonroutineAction:nonroutineAction||'',
          partsText:partsValue||'',
          parts:partsArray,
          timesText:timesValue||'',
          times:timesObject,
          modsText:modsValue||'',
          mods:modsArray
        };

        this.selectedEntries.push(selection);
      }
      this.queueEventAutoUpdate();
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
      if(typeof state.closeSuggestions==='function'){
        state.closeSuggestions();
      }
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
      this.queueEventAutoUpdate();
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
      this.removalReason='';
      this.removalOptionsCollapsed=false;
      this.removalOptionsInitialized=false;
      this.reasonText='';
      this.exchangeInputText='';
      this.exchangeOutputText='';
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
        if(typeof file.lastModified==='number'){
          this.aspenLastModified=file.lastModified;
          storeAspenLastModified(file.lastModified);
        }
        if(typeof file.size==='number'){
          this.aspenLastSize=file.size;
        }
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
          try{
            setAspenDocPayload(payload);
            lastValues[ASPEN_DOC_KEY]=payload;
          }catch(err){
            console.warn('NSF: Aspen-Daten konnten nicht gespeichert werden',err);
          }
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

  if(typeof window!=='undefined'){
    window.nsfDumpSelectedParts=()=>{
      try{
        if(!NSF_DEBUG){console.warn('Enable with localStorage.setItem("nsf-debug","1") and reload.');return;}
        const instList=Array.from(instances||[]);
        console.group('[NSF] Dump selectedEntries (instances:',instList.length,')');
        instList.forEach((inst,idx)=>{
          console.group('instance',idx);
          const sel=Array.isArray(inst&&inst.selectedEntries)?inst.selectedEntries:[];
          console.log('selectedEntries count:',sel.length);
          sel.forEach((s,i)=>{
            console.group('selection',i,s&&s.key);
            console.log('part:',s&&s.part);
            nsfDebugDir('selection.parts',s&&s.parts);
            const r=typeof inst.resolveEntry==='function'?(inst.resolveEntry(s)||s):s;
            nsfDebugDir('resolved.partsSource',r&&r.partsSource);
            console.groupEnd();
          });
          console.groupEnd();
        });
        console.groupEnd();
      }catch(e){console.warn('[NSF] nsfDumpSelectedParts error',e);}
    };
  }


})();
