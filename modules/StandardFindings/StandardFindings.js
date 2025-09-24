// Module to convert standard findings to standard text from Excel/CSV with context menu and multi-selection – v1.9.0
(function(){
  window.renderStandardFindings = function(root){
    let items = [];
    let dict = [];
    let findName = '';
    let dictName = '';
    let inputsEl, historyEl, findOut, actionOut, routineOut, nonroutineOut, partsOut, headEl, exportBtn;
    let inlineFindStatus, inlineDictStatus, datasetInfoEl;
    let currentItems = [];
    let rows=[];
    let itemMap=new Map();
    let currentItemMap=new Map();
    let initializing=false;
    let partNumber = '';
    let rendering = false;
    let showAllFindings=false;

    const findingsSelected=[];
    const actionsSelected=[];
    const partsSelected=[];
    if(typeof window!=='undefined'){
      window.findingsSelected=findingsSelected;
      window.actionsSelected=actionsSelected;
      window.partsSelected=partsSelected;
    }

    const setArray=(target,values)=>{target.splice(0,target.length,...values);return target;};

    const STATE_KEY='sf-v190-state';
    let savedState={};
    try{savedState=JSON.parse(localStorage.getItem(STATE_KEY)||'{}');}catch{savedState={};}
    let selectionKeys=Array.isArray(savedState.selections)?savedState.selections.filter(Boolean):[];
    let historyKeys=Array.isArray(savedState.history)?savedState.history.filter(Boolean):[];
    let storedRoutineText=typeof savedState.routine==='string'?savedState.routine:'';
    let storedNonroutineText=typeof savedState.nonroutine==='string'?savedState.nonroutine:'';
    let storedFindingsText=typeof savedState.findingsText==='string'?savedState.findingsText:'';
    let storedActionsText=typeof savedState.actionsText==='string'?savedState.actionsText:'';
    let storedPartsText=typeof savedState.partsText==='string'?savedState.partsText:'';
    let shouldRestoreOutputs=true;

    try{ items=JSON.parse(localStorage.getItem('sf-findings-data')||'[]'); }catch{}
    if(!Array.isArray(items)) items=[];
    items=normalizeItems(items);
    rebuildItemMap();
    selectionKeys=selectionKeys.filter(key=>itemMap.has(key));
    historyKeys=historyKeys.filter(key=>itemMap.has(key));
    try{ dict=JSON.parse(localStorage.getItem('sf-dict-data')||'[]'); }catch{}
    try{ findName=localStorage.getItem('sf-findings-name')||''; }catch{}
    try{ dictName=localStorage.getItem('sf-dict-name')||''; }catch{}

    const LS_KEY='module_data_v1';
    const WATCH_INTERVAL=300;

    const uniqueStrings=list=>{
      const seen=new Set();
      const out=[];
      for(const entry of list){
        const value=String(entry||'').trim();
        if(!value||seen.has(value)) continue;
        seen.add(value);
        out.push(value);
      }
      return out;
    };

    const normalizeItems=list=>{
      const dupes={};
      return list.map(row=>{
        const clean={
          part:String(row.part||'').trim(),
          label:String(row.label||'').trim(),
          finding:String(row.finding||'').trim(),
          action:String(row.action||'').trim()
        };
        const base=[clean.part,clean.label,clean.finding,clean.action].join('||');
        const count=dupes[base]||0;
        dupes[base]=count+1;
        const key=count?`${base}__${count}`:base;
        return {...clean,key};
      }).filter(row=>row.label);
    };

    const rebuildItemMap=()=>{
      itemMap=new Map();
      for(const entry of items){
        if(entry.key) itemMap.set(entry.key,entry);
      }
    };

    const getPart=()=>{
      let meld='';
      try{
        const doc=JSON.parse(localStorage.getItem(LS_KEY)||'{}');
        meld=(doc.general?.Meldung||'').trim();
      }catch{}
      if(!meld) return '';
      const row=dict.find(r=>r.meldung===meld);
      return (row?.part||'').trim();
    };
    const refreshPart=()=>{
      const pn=getPart();
      if(headEl) headEl.textContent=pn?`P/N: ${pn}`:'';
      if(pn!==partNumber){
        partNumber=pn;
        showAllFindings=false;
        if(!rendering) render();
      }
    };
    partNumber=getPart();
    const storageHandler=e=>{if(e.key===LS_KEY) refreshPart();};
    let lastDoc=localStorage.getItem(LS_KEY);
    const watcher=setInterval(()=>{const now=localStorage.getItem(LS_KEY);if(now!==lastDoc){lastDoc=now;refreshPart();}},WATCH_INTERVAL);
    window.addEventListener('storage',storageHandler);

    // --- styles for context menu ---
    (function injectCSS(){
      const css=`
      .db-menu{position:fixed;z-index:1000;display:none;min-width:200px;padding:.25rem;
        background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);
        border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);}
      .db-menu.open{display:block;}
      .db-menu .mi{display:block;width:100%;padding:.5rem .75rem;text-align:left;border-radius:.4rem;cursor:pointer;}
      .db-menu .mi:hover{background:rgba(0,0,0,.06);}
      .db-menu .mi.noclick{cursor:default;opacity:.7;}
      .db-menu .mi.noclick:hover{background:none;}
      .db-menu .file-entry{position:relative;}
      .db-menu .file-input{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);
        white-space:nowrap;border:0;}
      `;
      let tag=document.getElementById('sf-styles');
      if(!tag){tag=document.createElement('style');tag.id='sf-styles';document.head.appendChild(tag);} 
      tag.textContent=css;
    })();

    // --- context menu ---
    function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
    const FILE_ACCEPT_EXT='.xlsx,.xls,.xlsm,.csv';
    const FILE_PICKER_TYPES=[{
      description:'Excel- oder CSV-Datei',
      accept:{
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx'],
        'application/vnd.ms-excel':['.xls'],
        'application/vnd.ms-excel.sheet.macroEnabled.12':['.xlsm'],
        'text/csv':['.csv']
      }
    }];
    const menu=document.createElement('div');
    menu.className='db-menu';

    const createFileMenuEntry=(labelText,onFile,labelForLog)=>{
      const entry=document.createElement('label');
      entry.className='mi file-entry';
      const text=document.createElement('span');
      text.textContent=labelText;
      const input=document.createElement('input');
      input.type='file';
      input.accept=FILE_ACCEPT_EXT;
      input.className='file-input';
      entry.append(text,input);

      entry.addEventListener('click',async e=>{
        if(e.target===input) return;
        if('showOpenFilePicker' in window){
          e.preventDefault();
          e.stopPropagation();
          menu.classList.remove('open');
          try{
            const [fh]=await window.showOpenFilePicker({types:FILE_PICKER_TYPES});
            const file=fh?await fh.getFile():null;
            if(file) await onFile(file);
          }catch(err){
            if(!(err&&err.name==='AbortError')) console.warn(`${labelForLog} nicht geladen`,err);
          }
        }else{
          menu.classList.remove('open');
        }
      });

      input.addEventListener('click',e=>e.stopPropagation());
      input.addEventListener('change',async()=>{
        menu.classList.remove('open');
        const file=input.files&&input.files[0];
        if(file){
          try{await onFile(file);}catch(err){console.warn(`${labelForLog} nicht geladen`,err);}
        }
        input.value='';
      });

      return entry;
    };

    const findingsEntry=createFileMenuEntry('📂 Findings-Datei auswählen …',handleFindingsFile,'Findings-Datei');
    const dictEntry=createFileMenuEntry('📂 Meldungs-Lexikon auswählen …',handleDictFile,'Dictionary-Datei');
    const findNameEl=document.createElement('div');
    findNameEl.className='mi mi-find-name noclick';
    const dictNameEl=document.createElement('div');
    dictNameEl.className='mi mi-dict-name noclick';
    menu.append(findingsEntry,findNameEl,dictEntry,dictNameEl);
    document.body.appendChild(menu);

    const updateFileLabels=()=>{
      if(findNameEl){
        const label=findName?`Aktuelle Findings-Datei: ${findName}`:'Aktuelle Findings-Datei: keine Auswahl';
        findNameEl.textContent=label;
        findNameEl.title=findName||'Keine Datei ausgewählt';
      }
      if(dictNameEl){
        const label=dictName?`Aktuelles Meldungs-Lexikon: ${dictName}`:'Aktuelles Meldungs-Lexikon: keine Auswahl';
        dictNameEl.textContent=label;
        dictNameEl.title=dictName||'Keine Datei ausgewählt';
      }
      if(inlineFindStatus){
        inlineFindStatus.textContent=findName?`Findings-Datei: ${findName}`:'Findings-Datei: keine Auswahl';
        inlineFindStatus.classList.toggle('text-red-500',!findName);
        inlineFindStatus.classList.toggle('text-gray-600',!!findName);
      }
      if(inlineDictStatus){
        inlineDictStatus.textContent=dictName?`Dictionary-Datei: ${dictName}`:'Dictionary-Datei: keine Auswahl';
        inlineDictStatus.classList.toggle('text-red-500',!dictName);
        inlineDictStatus.classList.toggle('text-gray-600',!!dictName);
      }
    };
    updateFileLabels();

    function setupFileButton(button,input,onFile,labelForLog){
      if(!button) return;
      if(input){
        input.type='file';
        input.accept=FILE_ACCEPT_EXT;
        input.classList.add('hidden');
      }
      button.addEventListener('click',async e=>{
        e.preventDefault();
        if('showOpenFilePicker' in window){
          try{
            const [fh]=await window.showOpenFilePicker({types:FILE_PICKER_TYPES});
            const file=fh?await fh.getFile():null;
            if(file) await onFile(file);
            return;
          }catch(err){
            if(err&&err.name==='AbortError') return;
            console.warn(`${labelForLog} nicht geladen`,err);
          }
        }
        if(input) input.click();
      });
      if(!input) return;
      input.addEventListener('change',async()=>{
        const file=input.files&&input.files[0];
        if(file){
          try{await onFile(file);}catch(err){console.warn(`${labelForLog} nicht geladen`,err);}
        }
        input.value='';
      });
    }
    const openMenu=e=>{
      if(!root.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      const pad=8,vw=innerWidth,vh=innerHeight;
      const rect=menu.getBoundingClientRect();
      const w=rect.width||200,h=rect.height||44;
      menu.style.left=clamp(e.clientX,pad,vw-w-pad)+'px';
      menu.style.top=clamp(e.clientY,pad,vh-h-pad)+'px';
      menu.classList.add('open');
    };
    const hideMenu=()=>menu.classList.remove('open');
    const handleMenuKey=e=>{if(e.key==='Escape') hideMenu();};
    document.addEventListener('contextmenu',openMenu);
    window.addEventListener('click',hideMenu);
    window.addEventListener('keydown',handleMenuKey);
    const mo=new MutationObserver(()=>{
      if(!document.body.contains(root)){
        menu.remove();
        document.removeEventListener('contextmenu',openMenu);
        window.removeEventListener('click',hideMenu);
        window.removeEventListener('keydown',handleMenuKey);
        clearInterval(watcher);
        window.removeEventListener('storage',storageHandler);
        mo.disconnect();
      }
    });
    mo.observe(document.body,{childList:true,subtree:true});

    async function handleFindingsFile(file){
      const buf=await file.arrayBuffer();
      if(file.name.toLowerCase().endsWith('.csv')){
        items=normalizeItems(parseCSV(new TextDecoder().decode(buf)));
      }else{
        if(typeof XLSX==='undefined') await loadXLSX();
        const wb=XLSX.read(buf,{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        items=normalizeItems(rows.slice(1).map(r=>({
          part:String(r[0]||'').trim(),
          label:String(r[1]||'').trim(),
          finding:String(r[2]||'').trim(),
          action:String(r[3]||'').trim()
        })));
      }
      findName=file.name||'';
      rebuildItemMap();
      selectionKeys=selectionKeys.filter(key=>itemMap.has(key));
      historyKeys=historyKeys.filter(key=>itemMap.has(key));
      showAllFindings=false;
      try{localStorage.setItem('sf-findings-data',JSON.stringify(items));}catch{}
      try{localStorage.setItem('sf-findings-name',findName);}catch{}
      updateFileLabels();
      render();
    }

    async function handleDictFile(file){
      const buf=await file.arrayBuffer();
      const lower=file.name.toLowerCase();
      if(lower.endsWith('.csv')){
        const text=new TextDecoder().decode(buf);
        const lines=text.split(/\r?\n/).filter(Boolean);
        const delim=text.includes(';')?';':(text.includes('\t')?'\t':',');
        const rows=lines.map(line=>line.split(delim));
        const hdr=rows[0].map(h=>h.toLowerCase().trim());
        const mi=hdr.indexOf('meldung');
        const pi=hdr.indexOf('part');
        if(mi>=0&&pi>=0){
          dict=rows.slice(1).map(r=>({meldung:String(r[mi]||'').trim(),part:String(r[pi]||'').trim()})).filter(r=>r.meldung);
        }
      }else{
        if(typeof XLSX==='undefined') await loadXLSX();
        const wb=XLSX.read(buf,{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        const hdr=rows[0].map(h=>String(h||'').toLowerCase().trim());
        const mi=hdr.indexOf('meldung');
        const pi=hdr.indexOf('part');
        if(mi>=0&&pi>=0){
          dict=rows.slice(1).map(r=>({meldung:String(r[mi]||'').trim(),part:String(r[pi]||'').trim()})).filter(r=>r.meldung);
        }
      }
      dictName=file.name||'';
      try{localStorage.setItem('sf-dict-data',JSON.stringify(dict));}catch{}
      try{localStorage.setItem('sf-dict-name',dictName);}catch{}
      updateFileLabels();
      refreshPart();
    }

    async function loadDefault(){
      try{
        // Try multiple common filenames (xlsx/xlsm/csv) for the default findings export
        const candidates=[
          'Findings.xlsx','findings.xlsx','Findings_shopguide.xlsx','findings_shopguide.xlsx',
          'Findings.xlsm','findings.xlsm','Findings.csv','findings.csv'
        ];

        for(const url of candidates){
          try{
            const res=await fetch(url);
            if(!res.ok) continue;

            const buf=await res.arrayBuffer();
            const lower=url.toLowerCase();
            let rows=[];

            if(lower.endsWith('.csv')){
              // Plain CSV fallback for legacy exports
              const text=new TextDecoder().decode(buf);
              const lines=text.split(/\r?\n/).filter(line=>line.trim().length);
              if(!lines.length) continue;
              const delim=text.includes(';')?';':(text.includes('\t')?'\t':',');
              rows=lines.map(line=>line.split(delim));
            }else{
              if(typeof XLSX==='undefined') await loadXLSX();
              const wb=XLSX.read(buf,{type:'array'});
              const ws=wb.Sheets[wb.SheetNames[0]];
              rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
            }

            if(!rows.length) continue;

            items=normalizeItems(rows.slice(1).map(r=>({
              part:String(r[0]||'').trim(),
              label:String(r[1]||'').trim(),
              finding:String(r[2]||'').trim(),
              action:String(r[3]||'').trim()
            })));
            findName=url;
            showAllFindings=false;
            rebuildItemMap();
            selectionKeys=selectionKeys.filter(key=>itemMap.has(key));
            historyKeys=historyKeys.filter(key=>itemMap.has(key));
            try{localStorage.setItem('sf-findings-data',JSON.stringify(items));}catch{}
            try{localStorage.setItem('sf-findings-name',findName);}catch{}
            updateFileLabels();
            render();
            return;
          }catch(err){
            // ignore and continue with the next candidate
          }
        }
      }catch(e){/* ignore */}
    }

    async function loadDefaultDict(){
      const candidates=[
        'dictionary.xslx','Dictionary.xslx','dictionary.xlsx','Dictionary.xlsx',
        'dictionary.xls','Dictionary.xls','dictionary.csv','Dictionary.csv'
      ];
      for(const url of candidates){
        try{
          const res=await fetch(url);
          if(!res.ok) continue;
          const buf=await res.arrayBuffer();
          const lower=url.toLowerCase();
          if(lower.endsWith('.csv')){
            const text=new TextDecoder().decode(buf);
            const lines=text.split(/\r?\n/).filter(Boolean);
            const delim=text.includes(';')?';':(text.includes('\t')?'\t':',');
            const rows=lines.map(line=>line.split(delim));
            const hdr=rows[0].map(h=>h.toLowerCase().trim());
            const mi=hdr.indexOf('meldung');
            const pi=hdr.indexOf('part');
            if(mi<0||pi<0) continue;
            dict=rows.slice(1).map(r=>({meldung:String(r[mi]||'').trim(),part:String(r[pi]||'').trim()})).filter(r=>r.meldung);
          }else{
            if(typeof XLSX==='undefined') await loadXLSX();
            const wb=XLSX.read(buf,{type:'array'});
            const ws=wb.Sheets[wb.SheetNames[0]];
            const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
            const hdr=rows[0].map(h=>String(h||'').toLowerCase().trim());
            const mi=hdr.indexOf('meldung');
            const pi=hdr.indexOf('part');
            if(mi<0||pi<0) continue;
            dict=rows.slice(1).map(r=>({meldung:String(r[mi]||'').trim(),part:String(r[pi]||'').trim()})).filter(r=>r.meldung);
          }
          dictName=url;
          try{localStorage.setItem('sf-dict-data',JSON.stringify(dict));}catch{}
          try{localStorage.setItem('sf-dict-name',dictName);}catch{}
          updateFileLabels();
          refreshPart();
          return;
        }catch(e){/* try next */}
      }
    }

    function parseCSV(text){
      const lines=text.split(/\r?\n/).filter(Boolean);
      const delim=text.includes(';')?';':(text.includes('\t')?'\t':',');
      const rows=lines.map(line=>line.split(delim));
      return rows.slice(1).map(r=>({
        part:(r[0]||'').trim(),
        label:(r[1]||'').trim(),
        finding:(r[2]||'').trim(),
        action:(r[3]||'').trim()
      }));
    }

    function loadXLSX(){
      return new Promise((resolve,reject)=>{
        const s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
      });
    }

    function getItemByKey(key){
      if(!key) return null;
      return currentItemMap.get(key)||itemMap.get(key)||null;
    }

    function updateHistory(key){
      if(!key) return;
      historyKeys=historyKeys.filter(k=>k!==key);
      historyKeys.unshift(key);
      if(historyKeys.length>5) historyKeys=historyKeys.slice(0,5);
      renderHistory();
    }

    function renderHistory(){
      if(!historyEl) return;
      const wrapper=historyEl.closest('[data-history-wrapper]');
      historyEl.innerHTML='';
      let count=0;
      for(const key of historyKeys){
        const item=currentItemMap.get(key);
        if(!item) continue;
        const chip=document.createElement('button');
        chip.type='button';
        chip.className='rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-blue-100 hover:text-blue-700';
        chip.textContent=item.label||'';
        chip.title=item.finding||'';
        chip.addEventListener('click',()=>applyHistoryKey(key));
        historyEl.appendChild(chip);
        count++;
      }
      if(wrapper){
        if(count===0) wrapper.classList.add('hidden');
        else wrapper.classList.remove('hidden');
      }
    }

    function highlightSuggestion(row,index){
      if(!row) return;
      row.activeIndex=index;
      if(!row.suggestionButtons) return;
      row.suggestionButtons.forEach((btn,i)=>{
        if(i===index) btn.classList.add('bg-blue-100');
        else btn.classList.remove('bg-blue-100');
      });
    }

    function closeSuggestions(row){
      if(!row||!row.suggestionsEl) return;
      row.suggestionsEl.classList.add('hidden');
      row.suggestionsEl.setAttribute('aria-hidden','true');
      row.suggestionsEl.innerHTML='';
      row.suggestionsData=[];
      row.suggestionButtons=[];
      row.activeIndex=-1;
    }

    function showSuggestions(row,query){
      if(!row||!row.suggestionsEl) return;
      const term=(query||'').trim().toLowerCase();
      const parts=term.split(/\s+/).filter(Boolean);
      const suggestions=[];
      if(parts.length===0){
        for(const key of historyKeys){
          const item=currentItemMap.get(key);
          if(item&&!suggestions.some(s=>s.item.key===item.key)) suggestions.push({item,type:'history'});
        }
      }
      const matches=[];
      for(const item of currentItems){
        const hay=(item.label+' '+item.finding).toLowerCase();
        const ok=parts.length===0||parts.every(part=>hay.includes(part));
        if(ok) matches.push(item);
      }
      for(const item of matches){
        if(suggestions.length>=12) break;
        if(suggestions.some(s=>s.item.key===item.key)) continue;
        suggestions.push({item,type:parts.length?'match':'item'});
      }
      row.suggestionsEl.innerHTML='';
      row.suggestionButtons=[];
      row.suggestionsData=suggestions;
      if(!suggestions.length){
        const empty=document.createElement('div');
        empty.className='px-3 py-2 text-sm text-gray-500';
        empty.textContent=parts.length?'Keine Treffer':'Keine Vorschläge';
        row.suggestionsEl.appendChild(empty);
        row.suggestionsEl.classList.remove('hidden');
        row.suggestionsEl.setAttribute('aria-hidden','false');
        row.activeIndex=-1;
        return;
      }
      suggestions.forEach((sugg,idx)=>{
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='flex w-full flex-col gap-1 rounded px-3 py-2 text-left text-sm text-gray-800 transition hover:bg-blue-50 focus:bg-blue-100';
        btn.dataset.index=String(idx);
        const title=document.createElement('div');
        title.className='font-medium';
        title.textContent=sugg.item.label||'';
        const subtitle=document.createElement('div');
        subtitle.className='text-xs text-gray-500';
        subtitle.textContent=sugg.item.finding||'';
        btn.appendChild(title);
        btn.appendChild(subtitle);
        if(sugg.type==='history'){
          const badge=document.createElement('div');
          badge.className='text-[10px] font-semibold uppercase tracking-wide text-blue-500';
          badge.textContent='History';
          btn.appendChild(badge);
        }
        btn.addEventListener('mousedown',e=>{e.preventDefault(); setRowSelection(row,sugg.item,{focusNext:true});});
        row.suggestionsEl.appendChild(btn);
        row.suggestionButtons.push(btn);
      });
      row.suggestionsEl.classList.remove('hidden');
      row.suggestionsEl.setAttribute('aria-hidden','false');
      highlightSuggestion(row,0);
    }

    function confirmSelection(row){
      if(!row) return false;
      if(row.suggestionsData&&row.suggestionsData.length){
        const idx=row.activeIndex>=0?row.activeIndex:0;
        const suggestion=row.suggestionsData[idx];
        if(suggestion){
          setRowSelection(row,suggestion.item,{focusNext:true});
          return true;
        }
      }
      const query=(row.input?.value||'').trim().toLowerCase();
      if(!query) return false;
      const direct=currentItems.find(item=>{
        const label=item.label.toLowerCase();
        const finding=item.finding.toLowerCase();
        return label===query||finding===query;
      });
      if(direct){
        setRowSelection(row,direct,{focusNext:true});
        return true;
      }
      return false;
    }

    function persistState(){
      const data={
        selections:selectionKeys,
        history:historyKeys,
        routine:routineOut?routineOut.value:storedRoutineText,
        nonroutine:nonroutineOut?nonroutineOut.value:storedNonroutineText,
        findingsText:findOut?findOut.value:storedFindingsText,
        actionsText:actionOut?actionOut.value:storedActionsText,
        partsText:partsOut?partsOut.value:storedPartsText
      };
      try{localStorage.setItem(STATE_KEY,JSON.stringify(data));}catch{}
    }

    function updateOutputsFromSelections(options={}){
      const {skipStore=false}=options;
      const selectedItems=selectionKeys.map(getItemByKey).filter(Boolean);
      const findingObjects=selectedItems.map(item=>({
        key:item.key,
        label:item.label,
        finding:item.finding,
        action:item.action,
        part:item.part
      }));
      setArray(findingsSelected,findingObjects);
      const actions=uniqueStrings(selectedItems.map(item=>item.action));
      setArray(actionsSelected,actions);
      const parts=uniqueStrings(selectedItems.map(item=>item.part));
      setArray(partsSelected,parts);
      if(findOut){
        const text=findingObjects.map(entry=>entry.finding).filter(Boolean).join('\n\n');
        findOut.value=text;
        if(!skipStore) storedFindingsText=text;
      }
      if(actionOut){
        const text=actions.join('\n\n');
        actionOut.value=text;
        if(!skipStore) storedActionsText=text;
      }
      if(partsOut){
        const text=parts.join('\n');
        partsOut.value=text;
        if(!skipStore) storedPartsText=text;
      }
    }

    function syncSelections(options={}){
      const {skipEnsure=false,skipStore=false}=options;
      selectionKeys=rows.map(r=>r.key).filter(Boolean);
      updateOutputsFromSelections({skipStore});
      if(!initializing) persistState();
      if(!skipEnsure) ensureEmptyRow();
    }

    function ensureEmptyRow(){
      const empties=rows.filter(r=>!r.key&&!r.input.value.trim());
      if(empties.length===0){
        return addRow(null,false,true);
      }
      if(empties.length>1){
        for(const extra of empties.slice(0,empties.length-1)){
          extra.el.remove();
          rows=rows.filter(r=>r!==extra);
        }
      }
      return rows.find(r=>!r.key&&!r.input.value.trim())||null;
    }

    function removeRow(row,options={}){
      if(!row) return;
      const {skipSync=false}=options;
      row.el.remove();
      rows=rows.filter(r=>r!==row);
      if(!skipSync){
        syncSelections();
      }else{
        ensureEmptyRow();
      }
    }

    function setRowSelection(row,item,options={}){
      if(!row) return;
      const {skipHistory=false,skipSync=false,focusNext=false}=options;
      row.key=item?item.key:null;
      row.input.value=item?item.label:'';
      row.input.dataset.selected=item?'1':'0';
      row.input.classList.toggle('border-blue-400',!!item);
      row.input.classList.toggle('bg-blue-50',!!item);
      if(row.helper){
        row.helper.textContent=item&&item.finding?item.finding:'';
        row.helper.classList.toggle('text-gray-500',!!item&&item.finding);
      }
      closeSuggestions(row);
      if(item&&!skipHistory) updateHistory(item.key);
      if(!skipSync){
        syncSelections({skipEnsure:true});
        const blank=ensureEmptyRow();
        if(focusNext&&blank&&blank!==row) blank.input.focus();
      }
    }

    function addRow(initialKey=null,focus=false,silent=false){
      if(!inputsEl) return null;
      const row={key:null,suggestionsData:[],suggestionButtons:[],activeIndex:-1};
      const wrapper=document.createElement('div');
      wrapper.className='space-y-1';
      const line=document.createElement('div');
      line.className='flex items-center gap-2';
      const inputWrap=document.createElement('div');
      inputWrap.className='relative flex-1';
      const input=document.createElement('input');
      input.type='text';
      input.placeholder='Finding suchen...';
      input.className='w-full rounded border border-gray-300 bg-white/90 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300';
      input.autocomplete='off';
      inputWrap.appendChild(input);
      const suggestions=document.createElement('div');
      suggestions.className='absolute left-0 right-0 top-full z-20 mt-1 hidden max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg';
      suggestions.setAttribute('role','listbox');
      suggestions.setAttribute('aria-hidden','true');
      inputWrap.appendChild(suggestions);
      const removeBtn=document.createElement('button');
      removeBtn.type='button';
      removeBtn.className='rounded bg-gray-200 px-2 py-2 text-sm text-gray-600 transition hover:bg-red-100 hover:text-red-500';
      removeBtn.textContent='✖';
      line.appendChild(inputWrap);
      line.appendChild(removeBtn);
      wrapper.appendChild(line);
      const helper=document.createElement('div');
      helper.className='min-h-[1rem] text-xs text-gray-400';
      wrapper.appendChild(helper);
      row.el=wrapper;
      row.input=input;
      row.suggestionsEl=suggestions;
      row.removeBtn=removeBtn;
      row.helper=helper;
      inputsEl.appendChild(wrapper);
      rows.push(row);

      input.addEventListener('focus',()=>{
        if(!row.key&&!input.value.trim()) showSuggestions(row,'');
      });
      input.addEventListener('input',()=>{
        if(row.key){
          row.key=null;
          row.input.dataset.selected='0';
          row.input.classList.remove('border-blue-400','bg-blue-50');
          if(row.helper) row.helper.textContent='';
          syncSelections({skipEnsure:true});
        }
        showSuggestions(row,input.value);
      });
      input.addEventListener('keydown',e=>{
        if(e.key==='ArrowDown'){
          if(!row.suggestionsData.length) showSuggestions(row,input.value);
          if(row.suggestionsData.length){
            e.preventDefault();
            const next=row.activeIndex+1>=row.suggestionsData.length?0:row.activeIndex+1;
            highlightSuggestion(row,next);
          }
        }else if(e.key==='ArrowUp'){
          if(row.suggestionsData.length){
            e.preventDefault();
            const next=row.activeIndex<=0?row.suggestionsData.length-1:row.activeIndex-1;
            highlightSuggestion(row,next);
          }
        }else if(e.key==='Enter'){
          if(confirmSelection(row)) e.preventDefault();
        }else if(e.key==='Escape'){
          closeSuggestions(row);
        }
      });
      input.addEventListener('blur',()=>{setTimeout(()=>closeSuggestions(row),150);});
      removeBtn.addEventListener('click',()=>{
        const idx=rows.indexOf(row);
        removeRow(row);
        const fallback=rows[Math.max(0,idx-1)];
        if(fallback&&fallback.input) fallback.input.focus();
      });

      if(initialKey){
        const item=getItemByKey(initialKey);
        if(item) setRowSelection(row,item,{skipHistory:true,skipSync:true});
      }
      if(focus) input.focus();
      if(!silent) ensureEmptyRow();
      return row;
    }

    function applyHistoryKey(key){
      const item=currentItemMap.get(key);
      if(!item) return;
      let target=rows.find(r=>!r.key&&!r.input.value.trim());
      if(!target) target=addRow(null,false,true);
      if(target) setRowSelection(target,item,{focusNext:true});
    }

    function copyContent(button,textarea,title){
      if(!button||!textarea) return;
      const defaultLabel='📋 Kopieren';
      button.title=`${title} kopieren`;
      button.textContent=defaultLabel;
      button.addEventListener('click',()=>{
        const text=textarea.value||'';
        navigator.clipboard.writeText(text).then(()=>{
          button.textContent='✅';
          setTimeout(()=>{button.textContent=defaultLabel;},1000);
        }).catch(()=>{});
      });
    }

    function downloadFile(name,content,type){
      const blob=new Blob([content],{type});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=name;
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },0);
    }

    function exportAll(){
      if(!findOut||!actionOut||!routineOut||!nonroutineOut||!partsOut) return;
      const sections=[
        ['Findings',findOut.value||''],
        ['Actions',actionOut.value||''],
        ['Routine',routineOut.value||''],
        ['Nonroutine',nonroutineOut.value||''],
        ['Bestellliste',partsOut.value||'']
      ];
      const text=sections.map(([title,value])=>`${title}:\n${value}`.trim()).join('\n\n------------------------------\n\n');
      const csvLines=['"Kategorie";"Inhalt"'];
      for(const [title,value] of sections){
        const safeTitle=title.replace(/"/g,'""');
        const safeValue=(value||'').replace(/"/g,'""');
        csvLines.push(`"${safeTitle}";"${safeValue}"`);
      }
      const stamp=new Date().toISOString().replace(/[:.]/g,'-');
      const base=`standard-findings-${stamp}`;
      downloadFile(`${base}.txt`,text,'text/plain;charset=utf-8');
      setTimeout(()=>downloadFile(`${base}.csv`,csvLines.join('\r\n'),'text/csv;charset=utf-8'),200);
    }

    function clearAll(){
      for(const row of rows){row.el.remove();}
      rows=[];
      selectionKeys=[];
      setArray(findingsSelected,[]);
      setArray(actionsSelected,[]);
      setArray(partsSelected,[]);
      if(findOut) findOut.value='';
      if(actionOut) actionOut.value='';
      if(partsOut) partsOut.value='';
      storedFindingsText='';
      storedActionsText='';
      storedPartsText='';
      if(inputsEl) addRow(null,true,true);
      syncSelections({skipStore:true});
      persistState();
    }

    function createAccordionSection(title,id,initialValue){
      const wrapper=document.createElement('div');
      wrapper.className='rounded-lg border border-gray-200 bg-white/80 shadow-sm';
      wrapper.setAttribute('data-open','true');
      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='flex w-full items-center justify-between px-3 py-2 text-left font-semibold text-gray-800';
      const label=document.createElement('span');
      label.textContent=title;
      const arrow=document.createElement('span');
      arrow.className='text-lg text-gray-500 transition-transform';
      arrow.textContent='▾';
      toggle.appendChild(label);
      toggle.appendChild(arrow);
      wrapper.appendChild(toggle);
      const body=document.createElement('div');
      body.className='space-y-2 border-t border-gray-200 px-3 py-3';
      wrapper.appendChild(body);
      const textarea=document.createElement('textarea');
      textarea.id=`sf-output-${id}`;
      textarea.className='w-full min-h-[120px] rounded border border-gray-300 bg-white/95 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300';
      textarea.value=initialValue||'';
      body.appendChild(textarea);
      const copyWrapper=document.createElement('div');
      copyWrapper.className='flex justify-end';
      const copyBtn=document.createElement('button');
      copyBtn.type='button';
      copyBtn.className='rounded bg-gray-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-gray-600';
      copyBtn.textContent='📋 Kopieren';
      copyWrapper.appendChild(copyBtn);
      body.appendChild(copyWrapper);
      toggle.addEventListener('click',()=>{
        const open=wrapper.getAttribute('data-open')!=='false';
        if(open){
          wrapper.setAttribute('data-open','false');
          body.classList.add('hidden');
          arrow.style.transform='rotate(-90deg)';
        }else{
          wrapper.setAttribute('data-open','true');
          body.classList.remove('hidden');
          arrow.style.transform='rotate(0deg)';
        }
      });
      return {el:wrapper,textarea,copyBtn};
    }

    function render(){
      rendering=true;
      initializing=true;
      inputsEl=null;
      historyEl=null;
      findOut=null;
      actionOut=null;
      routineOut=null;
      nonroutineOut=null;
      partsOut=null;
      exportBtn=null;
      inlineFindStatus=null;
      inlineDictStatus=null;
      datasetInfoEl=null;
      const part=partNumber;
      const usingPartFilter=!!part&&!showAllFindings;
      currentItems=usingPartFilter?items.filter(it=>it.part===part):items;
      currentItemMap=new Map(currentItems.map(entry=>[entry.key,entry]));
      selectionKeys=selectionKeys.filter(key=>currentItemMap.has(key));
      rows=[];
      root.innerHTML='';
      const wrapper=document.createElement('div');
      wrapper.className='p-3 space-y-4 text-sm';
      root.appendChild(wrapper);
      headEl=document.createElement('div');
      headEl.id='sf-head';
      headEl.className='text-center text-base font-semibold text-gray-800';
      headEl.textContent=part?`P/N: ${part}`:'';
      wrapper.appendChild(headEl);

      const fileCard=document.createElement('div');
      fileCard.className='space-y-3 rounded-lg border border-gray-200 bg-white/80 p-3 shadow-sm';
      wrapper.appendChild(fileCard);

      const fileHeader=document.createElement('div');
      fileHeader.className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between';
      fileCard.appendChild(fileHeader);

      const fileTitle=document.createElement('h3');
      fileTitle.className='text-base font-semibold text-gray-800';
      fileTitle.textContent='Datenquellen';
      fileHeader.appendChild(fileTitle);

      const fileButtons=document.createElement('div');
      fileButtons.className='flex flex-wrap gap-2';
      fileHeader.appendChild(fileButtons);

      const findingsBtn=document.createElement('button');
      findingsBtn.type='button';
      findingsBtn.className='rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-500';
      findingsBtn.textContent='Findings-Datei wählen';
      const findingsInput=document.createElement('input');
      fileButtons.append(findingsBtn,findingsInput);
      setupFileButton(findingsBtn,findingsInput,handleFindingsFile,'Findings-Datei');

      const dictBtn=document.createElement('button');
      dictBtn.type='button';
      dictBtn.className='rounded bg-gray-700 px-3 py-2 text-sm font-semibold text-white shadow transition hover:bg-gray-600';
      dictBtn.textContent='Dictionary wählen';
      const dictInput=document.createElement('input');
      fileButtons.append(dictBtn,dictInput);
      setupFileButton(dictBtn,dictInput,handleDictFile,'Dictionary-Datei');

      const statusList=document.createElement('div');
      statusList.className='space-y-1 text-xs';
      fileCard.appendChild(statusList);

      inlineFindStatus=document.createElement('div');
      inlineFindStatus.className='text-xs font-medium text-gray-600';
      statusList.appendChild(inlineFindStatus);

      inlineDictStatus=document.createElement('div');
      inlineDictStatus.className='text-xs font-medium text-gray-600';
      statusList.appendChild(inlineDictStatus);

      datasetInfoEl=document.createElement('div');
      datasetInfoEl.className='text-[11px] text-gray-500';
      statusList.appendChild(datasetInfoEl);

      const contextHint=document.createElement('div');
      contextHint.className='text-[11px] text-gray-400';
      contextHint.textContent='Tipp: Rechtsklick auf das Modul öffnet das Kontextmenü für die Dateiauswahl.';
      fileCard.appendChild(contextHint);

      if(part&&showAllFindings){
        const filterBtn=document.createElement('button');
        filterBtn.type='button';
        filterBtn.className='rounded bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-300';
        filterBtn.textContent='Filter wieder aktivieren';
        filterBtn.addEventListener('click',()=>{showAllFindings=false; render();});
        fileCard.appendChild(filterBtn);
      }

      const content=document.createElement('div');
      content.className='space-y-4';
      wrapper.appendChild(content);

      const selectionCard=document.createElement('div');
      selectionCard.className='space-y-3 rounded-lg border border-gray-200 bg-white/80 p-3 shadow-sm';
      content.appendChild(selectionCard);

      const selectionHeader=document.createElement('div');
      selectionHeader.className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between';
      selectionCard.appendChild(selectionHeader);

      const selectionTitle=document.createElement('h3');
      selectionTitle.className='text-base font-semibold text-gray-800';
      selectionTitle.textContent='Findings auswählen';
      selectionHeader.appendChild(selectionTitle);

      const clearBtn=document.createElement('button');
      clearBtn.type='button';
      clearBtn.className='rounded bg-gray-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60';
      clearBtn.textContent='Alles löschen';
      clearBtn.disabled=!currentItems.length;
      clearBtn.addEventListener('click',clearAll);
      selectionHeader.appendChild(clearBtn);

      const hasItems=currentItems.length>0;

      if(hasItems){
        inputsEl=document.createElement('div');
        inputsEl.id='sf-inputs';
        inputsEl.className='space-y-3';
        selectionCard.appendChild(inputsEl);

        const historyWrapper=document.createElement('div');
        historyWrapper.dataset.historyWrapper='1';
        historyWrapper.className='space-y-1';
        selectionCard.appendChild(historyWrapper);

        const historyTitle=document.createElement('div');
        historyTitle.className='text-[11px] font-semibold uppercase tracking-wide text-gray-500';
        historyTitle.textContent='Zuletzt gewählt';
        historyWrapper.appendChild(historyTitle);

        historyEl=document.createElement('div');
        historyEl.id='sf-history-list';
        historyEl.className='flex flex-wrap gap-1';
        historyWrapper.appendChild(historyEl);
      }else{
        inputsEl=null;
        historyEl=null;
        selectionKeys=[];
        const placeholder=document.createElement('div');
        placeholder.className='rounded border border-dashed border-gray-300 bg-white/60 p-4 text-sm text-gray-600';
        const message=document.createElement('div');
        message.className='space-y-1';
        placeholder.appendChild(message);
        if(!items.length){
          const line1=document.createElement('p');
          line1.textContent='Noch keine Findings geladen.';
          const line2=document.createElement('p');
          line2.textContent='Nutze „Findings-Datei wählen“ oder Rechtsklick für das Kontextmenü.';
          message.append(line1,line2);
        }else if(usingPartFilter){
          const line1=document.createElement('p');
          line1.append('Für die aktuelle Teilenummer ');
          if(part){
            const badge=document.createElement('span');
            badge.className='mx-1 inline-flex items-center justify-center rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700';
            badge.textContent=part;
            line1.appendChild(badge);
          }
          line1.append(' wurden keine Findings gefunden.');
          const line2=document.createElement('p');
          line2.textContent='Passe die Meldung an oder zeige alle Findings an.';
          message.append(line1,line2);
          const showAllBtn=document.createElement('button');
          showAllBtn.type='button';
          showAllBtn.className='mt-3 rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow transition hover:bg-blue-500';
          showAllBtn.textContent='Alle Findings anzeigen';
          showAllBtn.addEventListener('click',()=>{showAllFindings=true; render();});
          placeholder.appendChild(showAllBtn);
        }else{
          const line=document.createElement('p');
          line.textContent='Die geladene Datei enthält keine Findings.';
          message.append(line);
        }
        setArray(findingsSelected,[]);
        setArray(actionsSelected,[]);
        setArray(partsSelected,[]);
        selectionCard.appendChild(placeholder);
      }

      const exportWrapper=document.createElement('div');
      exportWrapper.className='flex justify-end';
      content.appendChild(exportWrapper);

      exportBtn=document.createElement('button');
      exportBtn.type='button';
      exportBtn.id='sf-export';
      exportBtn.className='rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-500';
      exportBtn.textContent='Alles speichern';
      exportBtn.addEventListener('click',()=>{
        exportAll();
        const original=exportBtn.textContent;
        exportBtn.textContent='✅ Gespeichert';
        setTimeout(()=>{exportBtn.textContent=original;},1200);
      });
      exportWrapper.appendChild(exportBtn);

      const accordionContainer=document.createElement('div');
      accordionContainer.id='sf-accordion';
      accordionContainer.className='space-y-2';
      content.appendChild(accordionContainer);

      const sections=[
        {id:'findings',title:'Findings',restore:storedFindingsText},
        {id:'actions',title:'Actions',restore:storedActionsText},
        {id:'routine',title:'Routine',restore:storedRoutineText},
        {id:'nonroutine',title:'Nonroutine',restore:storedNonroutineText},
        {id:'parts',title:'Bestellliste',restore:storedPartsText}
      ];

      sections.forEach(cfg=>{
        const section=createAccordionSection(cfg.title,cfg.id,cfg.restore);
        accordionContainer.appendChild(section.el);
        switch(cfg.id){
          case 'findings':
            findOut=section.textarea;
            copyContent(section.copyBtn,section.textarea,'Findings');
            break;
          case 'actions':
            actionOut=section.textarea;
            copyContent(section.copyBtn,section.textarea,'Actions');
            break;
          case 'routine':
            routineOut=section.textarea;
            copyContent(section.copyBtn,section.textarea,'Routine');
            break;
          case 'nonroutine':
            nonroutineOut=section.textarea;
            copyContent(section.copyBtn,section.textarea,'Nonroutine');
            break;
          case 'parts':
            partsOut=section.textarea;
            copyContent(section.copyBtn,section.textarea,'Bestellliste');
            break;
        }
      });

      if(routineOut) routineOut.addEventListener('input',()=>{storedRoutineText=routineOut.value; if(!initializing) persistState();});
      if(nonroutineOut) nonroutineOut.addEventListener('input',()=>{storedNonroutineText=nonroutineOut.value; if(!initializing) persistState();});
      if(findOut) findOut.addEventListener('input',()=>{storedFindingsText=findOut.value; if(!initializing) persistState();});
      if(actionOut) actionOut.addEventListener('input',()=>{storedActionsText=actionOut.value; if(!initializing) persistState();});
      if(partsOut) partsOut.addEventListener('input',()=>{storedPartsText=partsOut.value; if(!initializing) persistState();});

      updateFileLabels();

      if(datasetInfoEl){
        const total=items.length;
        if(total){
          const filtered=currentItems.length;
          let text=`${filtered} von ${total} Findings geladen`;
          if(part&&usingPartFilter) text+=` (P/N ${part})`;
          if(part&&showAllFindings) text+=` (P/N ${part} – alle Findings angezeigt)`;
          datasetInfoEl.textContent=text;
        }else{
          datasetInfoEl.textContent='Noch keine Findings geladen.';
        }
      }

      if(hasItems){
        selectionKeys.forEach(key=>addRow(key,false,true));
        syncSelections({skipStore:shouldRestoreOutputs,skipEnsure:true});
        ensureEmptyRow();
      }
      renderHistory();

      initializing=false;
      if(shouldRestoreOutputs){
        if(findOut) findOut.value=storedFindingsText;
        if(actionOut) actionOut.value=storedActionsText;
        if(partsOut) partsOut.value=storedPartsText;
        if(routineOut) routineOut.value=storedRoutineText;
        if(nonroutineOut) nonroutineOut.value=storedNonroutineText;
        shouldRestoreOutputs=false;
      }
      persistState();
      rendering=false;
    }

    if(!dict.length) loadDefaultDict();
    if(!items.length) loadDefault();
    render();
  };
})();
