(function(){
  'use strict';

  const DATA_URL='Findings_Shopguide.json';
  const DATA_KEY='sf-data';
  const STATE_KEY='sf-state';
  const DOC_KEY='module_data_v1';
  const WATCH_INTERVAL=600;
  const SAVE_DEBOUNCE=250;
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
      .nsf-context{display:flex;flex-wrap:wrap;gap:0.5rem 1.5rem;font-size:0.9rem;}
      .nsf-context-label{opacity:0.7;font-weight:500;margin-right:0.35rem;}
      .nsf-context-value{font-weight:600;color:var(--module-header-text,#fff);} 
      .nsf-section-title{font-weight:600;font-size:1rem;display:flex;align-items:center;gap:0.4rem;}
      .nsf-section-title .nsf-count{opacity:0.7;font-size:0.85rem;font-weight:500;}
      .nsf-input-wrapper{display:flex;flex-direction:column;gap:0.5rem;}
      .nsf-input-row{position:relative;background:rgba(15,23,42,0.18);border-radius:0.85rem;padding:0.55rem 0.65rem;display:flex;flex-direction:column;gap:0.35rem;}
      .nsf-input-row.locked{background:rgba(15,23,42,0.28);}
      .nsf-input{width:100%;border:none;border-radius:0.65rem;padding:0.55rem 0.7rem;font:inherit;color:var(--sidebar-module-card-text,#111);background:var(--sidebar-module-card-bg,#fff);}
      .nsf-input:disabled{opacity:0.75;background:rgba(255,255,255,0.65);cursor:not-allowed;}
      .nsf-input::placeholder{color:rgba(107,114,128,0.8);}
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
      .nsf-textarea{flex:1;min-height:120px;border:none;border-radius:0.75rem;padding:0.6rem 0.65rem;font:inherit;resize:vertical;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);}
      .nsf-textarea:disabled{opacity:0.6;background:rgba(255,255,255,0.5);cursor:not-allowed;}
      .nsf-note{font-size:0.8rem;opacity:0.75;}
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
      if(Array.isArray(parsed.entries)) entriesRaw=parsed.entries;
      else if(Array.isArray(parsed.findings)) entriesRaw=parsed.findings;
      if(parsed.dictionary) dictionaryRaw=parsed.dictionary;
      else if(parsed.meldungen) dictionaryRaw=parsed.meldungen;
    }
    const normalizedEntries=normalizeEntries(entriesRaw);
    const dictionary=normalizeDictionary(dictionaryRaw);
    const partMap=new Map();
    for(const entry of normalizedEntries){
      if(!partMap.has(entry.part)) partMap.set(entry.part,[]);
      partMap.get(entry.part).push(entry);
    }
    for(const list of partMap.values()){
      list.sort((a,b)=>{
        const al=a.label||'';const bl=b.label||'';
        const cmp=al.localeCompare(bl,'de',{sensitivity:'base'});
        if(cmp!==0) return cmp;
        return (a.finding||'').localeCompare(b.finding||'', 'de', {sensitivity:'base'});
      });
    }
    return {entries:normalizedEntries,partMap,dictionary};
  }

  function normalizeEntries(list){
    if(!Array.isArray(list)) return [];
    const counts=new Map();
    const result=[];
    for(const raw of list){
      const part=clean(raw&&raw.part);
      const label=clean(raw&&raw.label);
      const finding=clean(raw&&raw.finding);
      const action=clean(raw&&raw.action);
      if(!part&& !finding && !action) continue;
      const baseKey=[part,label,finding,action].join('||');
      const count=counts.get(baseKey)||0;
      counts.set(baseKey,count+1);
      const key=count?`${baseKey}__${count}`:baseKey;
      if(!part) continue;
      result.push({
        key,
        part,
        label,
        finding,
        action,
        labelLower:label.toLowerCase(),
        findingLower:finding.toLowerCase(),
        actionLower:action.toLowerCase()
      });
    }
    return result;
  }

  function normalizeDictionary(input){
    const map=new Map();
    if(Array.isArray(input)){
      for(const entry of input){
        const meld=clean(entry&& (entry.meldung||entry.key||entry.label));
        const part=clean(entry&& (entry.part||entry.partNo||entry.partNumber||entry.value));
        if(!meld||!part) continue;
        map.set(normalizeKey(meld),part);
      }
    }else if(input&&typeof input==='object'){
      for(const [meldung,partVal] of Object.entries(input)){
        const meld=clean(meldung);
        const part=clean(partVal);
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
    const meldung=clean(general&&general.Meldung);
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
      general&&general.Artikelnummer
    ];
    let part='';
    for(const candidate of partCandidates){
      const value=clean(candidate);
      if(value){part=value;break;}
    }
    return {docRaw,meldung,part};
  }

  function loadGlobalState(){
    let parsed;
    try{parsed=JSON.parse(localStorage.getItem(STATE_KEY)||'{}');}
    catch(err){console.warn('NSF: sf-state konnte nicht gelesen werden',err);parsed={};}
    if(!parsed||typeof parsed!=='object') parsed={};
    if(!parsed.meldungsbezogen||typeof parsed.meldungsbezogen!=='object') parsed.meldungsbezogen={};
    return parsed;
  }

  function saveGlobalState(value){
    const payload=JSON.stringify(value);
    localStorage.setItem(STATE_KEY,payload);
    lastValues[STATE_KEY]=payload;
  }

  function loadStateFor(meldung){
    const global=loadGlobalState();
    const entry=global.meldungsbezogen[meldung];
    return {
      state: {
        findings: typeof entry?.findings==='string'?entry.findings:'',
        actions: typeof entry?.actions==='string'?entry.actions:'',
        routine: typeof entry?.routine==='string'?entry.routine:'',
        nonroutine: typeof entry?.nonroutine==='string'?entry.nonroutine:'',
        parts: typeof entry?.parts==='string'?entry.parts:''
      },
      global
    };
  }

  function saveStateFor(meldung,state){
    const global=loadGlobalState();
    global.meldungsbezogen[meldung]={
      findings: typeof state.findings==='string'?state.findings:'',
      actions: typeof state.actions==='string'?state.actions:'',
      routine: typeof state.routine==='string'?state.routine:'',
      nonroutine: typeof state.nonroutine==='string'?state.nonroutine:'',
      parts: typeof state.parts==='string'?state.parts:''
    };
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
      this.activeState={findings:'',actions:'',routine:'',nonroutine:'',parts:''};
      this.availableEntries=[];
      this.inputsContainer=null;
      this.textareas={};
      this.saveTimer=null;
      this.selectionRows=[];
      this.currentPart='';
      this.partSource='';
      this.meldung='';
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
      const data=parseData();
      const docInfo=parseDocument();
      this.meldung=docInfo.meldung;
      let part=docInfo.part;
      let partSource='aspen';
      if(!part){
        const fallback=this.meldung?data.dictionary.get(normalizeKey(this.meldung))||'':'';
        if(fallback){part=fallback;partSource='dictionary';}
      }
      this.currentPart=part;
      this.partSource=part?partSource:'';
      const key=clean(this.meldung);
      this.stateKey=key||'';
      if(this.stateKey){
        const {state}=loadStateFor(this.stateKey);
        this.activeState=state;
      }else{
        this.activeState={findings:'',actions:'',routine:'',nonroutine:'',parts:''};
      }
      this.availableEntries=part?data.partMap.get(part)||[]:[];
      this.selectionRows=[];
      this.renderDom();
    }

    renderDom(){
      const root=this.root;
      root.innerHTML='';
      root.classList.add('nsf-module');

      const contextSection=document.createElement('div');
      contextSection.className='nsf-section';
      const contextRow=document.createElement('div');
      contextRow.className='nsf-context';

      const meldEl=document.createElement('div');
      const meldLabel=document.createElement('span');
      meldLabel.className='nsf-context-label';
      meldLabel.textContent='Meldung:';
      const meldValue=document.createElement('span');
      meldValue.className='nsf-context-value';
      meldValue.textContent=this.meldung||'–';
      meldEl.append(meldLabel,meldValue);

      const partEl=document.createElement('div');
      const partLabel=document.createElement('span');
      partLabel.className='nsf-context-label';
      partLabel.textContent='Partnummer:';
      const partValue=document.createElement('span');
      partValue.className='nsf-context-value';
      partValue.textContent=this.currentPart||'–';
      if(this.currentPart&&this.partSource){
        const origin=document.createElement('span');
        origin.className='nsf-note';
        origin.textContent=this.partSource==='aspen'?' (Aspen)':' (Dictionary)';
        partValue.append(origin);
      }
      partEl.append(partLabel,partValue);

      contextRow.append(meldEl,partEl);
      contextSection.appendChild(contextRow);

      const inputSection=document.createElement('div');
      inputSection.className='nsf-section';
      const title=document.createElement('div');
      title.className='nsf-section-title';
      title.textContent='Findings auswählen';
      if(this.currentPart&&this.availableEntries.length){
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
      }else if(!this.currentPart){
        note.textContent='Keine Partnummer gefunden. Bitte Aspen-Daten prüfen oder Dictionary pflegen.';
      }else if(!this.availableEntries.length){
        note.textContent='Für diese Partnummer wurden keine Findings gefunden.';
      }else{
        note.textContent='Tippen, um Findings zu suchen. Mit Enter auswählen – es erscheint automatisch ein weiteres Eingabefeld.';
      }
      inputSection.appendChild(note);

      const inputsWrapper=document.createElement('div');
      inputsWrapper.className='nsf-input-wrapper';
      inputSection.appendChild(inputsWrapper);
      this.inputsContainer=inputsWrapper;

      if(this.meldung&&this.currentPart&&this.availableEntries.length){
        this.addInputRow();
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

    addInputRow(){
      const row=document.createElement('div');
      row.className='nsf-input-row';
      const input=document.createElement('input');
      input.type='text';
      input.className='nsf-input';
      input.placeholder='Finding auswählen…';
      const suggestions=document.createElement('div');
      suggestions.className='nsf-suggestions';
      const meta=document.createElement('div');
      meta.className='nsf-selected-meta';
      meta.style.display='none';
      row.append(input,suggestions,meta);
      this.inputsContainer.appendChild(row);
      const state={
        row,
        input,
        suggestions,
        meta,
        suggestionsList:[],
        highlightIndex:-1,
        locked:false
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
          return false;
        }).slice(0,20);
        state.suggestionsList=matches;
        state.highlightIndex=matches.length?0:-1;
        suggestions.innerHTML='';
        if(!matches.length){
          closeSuggestions();
          return;
        }
        for(let i=0;i<matches.length;i+=1){
          const entry=matches[i];
          const option=document.createElement('div');
          option.className='nsf-suggestion';
          if(i===state.highlightIndex) option.classList.add('active');
          if(entry.label) {
            const label=document.createElement('div');
            label.className='nsf-suggestion-label';
            label.textContent=entry.label;
            option.appendChild(label);
          }
          const finding=document.createElement('div');
          finding.className='nsf-suggestion-finding';
          finding.textContent=entry.finding||'(Kein Finding)';
          option.appendChild(finding);
          if(entry.action){
            const action=document.createElement('div');
            action.className='nsf-suggestion-action';
            action.textContent=entry.action;
            option.appendChild(action);
          }
          option.addEventListener('mousedown',e=>{e.preventDefault();this.acceptSelection(entry,state);});
          option.addEventListener('mouseenter',()=>{
            for(const child of suggestions.children) child.classList.remove('active');
            option.classList.add('active');
            state.highlightIndex=i;
          });
          suggestions.appendChild(option);
        }
        row.classList.add('show-suggestions');
      };
      const selectCurrent=()=>{
        if(!state.suggestionsList.length) return;
        const idx=state.highlightIndex>=0?state.highlightIndex:0;
        const entry=state.suggestionsList[idx];
        if(entry) this.acceptSelection(entry,state);
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
      const updateHighlight=()=>{
        const children=Array.from(suggestions.children);
        children.forEach((child,idx)=>{
          if(idx===state.highlightIndex) child.classList.add('active');
          else child.classList.remove('active');
        });
      };
      this.selectionRows.push(state);
    }

    acceptSelection(entry,state){
      if(state.locked) return;
      state.locked=true;
      state.input.value=entry.finding||entry.label||entry.action||'Auswahl';
      state.input.disabled=true;
      state.row.classList.add('locked');
      state.meta.innerHTML='';
      state.meta.style.display='none';
      if(entry.label){
        const labelRow=document.createElement('div');
        const strong=document.createElement('strong');
        strong.textContent='Label:';
        labelRow.append(strong,document.createTextNode(' '+entry.label));
        state.meta.appendChild(labelRow);
      }
      if(entry.action){
        const actionRow=document.createElement('div');
        const strong=document.createElement('strong');
        strong.textContent='Action:';
        actionRow.append(strong,document.createTextNode(' '+entry.action));
        state.meta.appendChild(actionRow);
      }
      if(state.meta.childElementCount){
        state.meta.style.display='flex';
      }
      state.row.classList.remove('show-suggestions');
      state.suggestions.innerHTML='';
      state.suggestionsList=[];
      state.highlightIndex=-1;
      this.appendOutput('findings',entry.finding);
      this.appendOutput('actions',entry.action);
      this.appendOutput('parts',entry.part);
      this.flushStateSave(true);
      this.addInputRow();
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

    queueStateSave(){
      if(!this.stateKey) return;
      if(this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer=setTimeout(()=>{this.saveTimer=null;this.persistState();},SAVE_DEBOUNCE);
    }

    flushStateSave(immediate){
      if(!this.stateKey) return;
      if(this.saveTimer){clearTimeout(this.saveTimer);this.saveTimer=null;}
      if(immediate) this.persistState();
      else this.persistState();
    }

    persistState(){
      if(!this.stateKey) return;
      saveStateFor(this.stateKey,this.activeState);
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
