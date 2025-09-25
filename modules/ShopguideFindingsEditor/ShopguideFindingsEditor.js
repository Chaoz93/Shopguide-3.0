(function(){
  'use strict';

  const MODULE_VERSION='1.1.0';
  const STORAGE_KEY='shopguide-findings';
  const PATH_KEY='shopguide-findings-path';
  const DEFAULT_FILE='Shopguide_Findings.json';
  const AUTOSAVE_INTERVAL=5000;
  const HISTORY_LIMIT=10;
  const STYLE_ID='sfe-styles';
  const GLOBAL_HANDLE_KEY='__shopguideFindingsFileHandle';

  const FIELD_KEYS=['label','findings','actions','routine','nonroutine','parts'];
  const FIELD_LABELS={
    label:'Label',
    findings:'Findings',
    actions:'Actions',
    routine:'Routine',
    nonroutine:'Nonroutine',
    parts:'Bestellliste'
  };

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
      .sfe-item{background:rgba(15,23,42,0.22);border-radius:0.75rem;padding:0.5rem 0.65rem;display:flex;flex-direction:column;gap:0.25rem;cursor:pointer;transition:background 0.12s ease,transform 0.12s ease;}
      .sfe-item:hover{background:rgba(59,130,246,0.25);transform:translateY(-1px);}
      .sfe-item.active{background:rgba(59,130,246,0.35);box-shadow:0 8px 22px rgba(15,23,42,0.25);}
      .sfe-item-title{font-weight:600;font-size:0.9rem;}
      .sfe-item-snippet{font-size:0.78rem;opacity:0.85;max-height:3em;overflow:hidden;}
      .sfe-item mark{background:rgba(252,211,77,0.65);color:inherit;padding:0 0.15rem;border-radius:0.25rem;}
      .sfe-editor{flex:2 1 360px;min-width:260px;background:rgba(255,255,255,0.08);border-radius:0.85rem;padding:0.75rem;display:flex;flex-direction:column;gap:0.65rem;min-height:0;}
      .sfe-editor-header{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;}
      .sfe-editor-title{font-weight:600;font-size:1rem;}
      .sfe-copy{background:rgba(16,185,129,0.25);}
      .sfe-copy:hover:not(:disabled){background:rgba(16,185,129,0.35);}
      .sfe-fields{display:flex;flex-direction:column;gap:0.65rem;flex:1;overflow-y:auto;padding-right:0.25rem;}
      .sfe-field{display:flex;flex-direction:column;gap:0.35rem;background:rgba(15,23,42,0.2);border-radius:0.75rem;padding:0.55rem 0.65rem;position:relative;}
      .sfe-field label{font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;opacity:0.75;}
      .sfe-input,.sfe-textarea{width:100%;border:none;border-radius:0.55rem;padding:0.55rem 0.65rem;font:inherit;color:var(--sidebar-module-card-text,#111);background:var(--sidebar-module-card-bg,#fff);resize:vertical;min-height:2.6rem;}
      .sfe-input{height:2.6rem;}
      .sfe-textarea{min-height:5.5rem;}
      .sfe-empty{opacity:0.75;font-style:italic;}
      .sfe-no-results{padding:0.65rem;border-radius:0.75rem;background:rgba(15,23,42,0.24);text-align:center;font-size:0.85rem;}
      .sfe-file-info{font-size:0.72rem;opacity:0.75;display:flex;flex-direction:column;gap:0.25rem;}
      .sfe-suggestions{position:absolute;left:0.65rem;right:0.65rem;top:calc(100% - 0.35rem);background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border-radius:0.65rem;box-shadow:0 12px 28px rgba(15,23,42,0.25);max-height:220px;overflow:auto;z-index:20;display:none;flex-direction:column;padding:0.35rem;}
      .sfe-field.show-suggestions .sfe-suggestions{display:flex;}
      .sfe-suggestion{padding:0.4rem 0.55rem;border-radius:0.55rem;cursor:pointer;transition:background 0.12s ease;}
      .sfe-suggestion:hover{background:rgba(59,130,246,0.18);}
      .sfe-context-menu{position:fixed;z-index:1000;min-width:220px;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border:1px solid var(--border-color,#e5e7eb);border-radius:0.75rem;box-shadow:0 14px 32px rgba(15,23,42,0.28);padding:0.35rem;display:none;flex-direction:column;}
      .sfe-context-menu.open{display:flex;}
      .sfe-context-btn{border:none;background:none;text-align:left;padding:0.55rem 0.75rem;border-radius:0.6rem;font:inherit;color:inherit;cursor:pointer;display:flex;align-items:center;gap:0.45rem;}
      .sfe-context-btn:hover{background:rgba(59,130,246,0.12);}
      .sfe-list-count{font-weight:600;}
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
    const pattern=new RegExp(`(${escapeRegExp(term)})`,'ig');
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

  function normalizeEntry(entry){
    const normalized={id:entry&&entry.id?String(entry.id):ensureId()};
    for(const key of FIELD_KEYS){
      normalized[key]=cleanString(entry?entry[key]:'' );
    }
    return normalized;
  }

  function buildCopyText(entry){
    const parts=[];
    if(entry.label) parts.push(`Label: ${entry.label}`);
    if(entry.findings) parts.push(`Findings: ${entry.findings}`);
    if(entry.actions) parts.push(`Actions: ${entry.actions}`);
    if(entry.routine) parts.push(`Routine: ${entry.routine}`);
    if(entry.nonroutine) parts.push(`Nonroutine: ${entry.nonroutine}`);
    if(entry.parts) parts.push(`Bestellliste: ${entry.parts}`);
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
    constructor(container,values,getValue,setValue){
      this.container=container;
      this.values=values;
      this.getValue=getValue;
      this.setValue=setValue;
      this.element=document.createElement('div');
      this.element.className='sfe-suggestions';
      container.appendChild(this.element);
      this.items=[];
      this.active=false;
      this.attach();
    }
    attach(){
      this.container.addEventListener('focusin',()=>this.update());
      this.container.addEventListener('focusout',()=>setTimeout(()=>this.hide(),120));
      this.container.addEventListener('input',()=>this.update());
    }
    setValues(values){
      this.values=values;
      this.update();
    }
    update(){
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
        btn.innerHTML=highlight(match,term);
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
      this.filePath=localStorage.getItem(PATH_KEY)||DEFAULT_FILE;
      this.data=[];
      this.filtered=[];
      this.selectedId=null;
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
      this.activeHistorySignature=null;
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
      this.errorEl=module.querySelector('.sfe-error');

      this.setupContextMenu(module);

      module.querySelector('.sfe-add').addEventListener('click',()=>this.createEntry());
      this.undoBtn.addEventListener('click',()=>this.undo());
      this.redoBtn.addEventListener('click',()=>this.redo());
      this.saveBtn.addEventListener('click',()=>this.saveNow(true));
      this.searchInput.addEventListener('input',()=>this.applySearch());

      this.autosaveTimer=setInterval(()=>this.saveNow(false),AUTOSAVE_INTERVAL);

      this.renderFileInfo();
      this.loadInitialData();
    }

    setupContextMenu(module){
      const menu=document.createElement('div');
      menu.className='sfe-context-menu';
      const chooseBtn=document.createElement('button');
      chooseBtn.type='button';
      chooseBtn.className='sfe-context-btn';
      chooseBtn.textContent='Findings-Datei wählen';
      chooseBtn.addEventListener('click',()=>{this.hideContextMenu();this.chooseFile();});
      menu.appendChild(chooseBtn);
      document.body.appendChild(menu);
      this.contextMenu=menu;

      module.addEventListener('contextmenu',e=>{
        e.preventDefault();
        const {clientX:x,clientY:y}=e;
        this.showContextMenu(x,y);
      });
      this.onWindowClick=()=>this.hideContextMenu();
      this.onWindowResize=()=>this.hideContextMenu();
      window.addEventListener('click',this.onWindowClick);
      window.addEventListener('resize',this.onWindowResize);
    }

    showContextMenu(x,y){
      if(!this.contextMenu) return;
      this.contextMenu.style.left=`${x}px`;
      this.contextMenu.style.top=`${y}px`;
      this.contextMenu.classList.add('open');
    }

    hideContextMenu(){
      if(this.contextMenu) this.contextMenu.classList.remove('open');
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
            this.fileHandle=handle;
            window[GLOBAL_HANDLE_KEY]=handle;
            const file=await handle.getFile();
            this.filePath=file.name||DEFAULT_FILE;
            localStorage.setItem(PATH_KEY,this.filePath);
            await this.loadFromHandle(handle);
            this.status('Datei geladen');
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
        this.fileHandle=null;
        window[GLOBAL_HANDLE_KEY]=null;
        this.filePath=file.name||DEFAULT_FILE;
        localStorage.setItem(PATH_KEY,this.filePath);
        try{
          const text=await file.text();
          this.applyExternalData(text);
          this.status('Datei geladen (Lesemodus)');
        }catch(err){
          console.error(err);
          this.showError('Datei konnte nicht gelesen werden.');
        }
      },{once:true});
      input.click();
    }

    async loadInitialData(){
      const fromStorage=localStorage.getItem(STORAGE_KEY);
      if(fromStorage){
        this.applyExternalData(fromStorage);
        this.status('Lokale Daten geladen');
        return;
      }
      if(this.fileHandle){
        const text=await readFileHandle(this.fileHandle);
        if(text){
          this.applyExternalData(text);
          this.status('Datei geladen');
          return;
        }
      }
      await this.loadFromPath(this.filePath||DEFAULT_FILE);
    }

    async loadFromHandle(handle){
      const text=await readFileHandle(handle);
      if(text){
        this.applyExternalData(text);
      }else{
        this.showError('Ausgewählte Datei konnte nicht gelesen werden.');
      }
    }

    async loadFromPath(path){
      const target=path||DEFAULT_FILE;
      try{
        const res=await fetch(target,{cache:'no-store'});
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const text=await res.text();
        this.filePath=target;
        this.applyExternalData(text);
        this.status('Standarddatei geladen');
      }catch(err){
        console.warn('Konnte Datei nicht laden',err);
        this.data=[];
        this.filtered=[];
        this.renderList();
        this.renderEditor();
        this.showError('Keine Daten gefunden. Bitte Datei auswählen.');
        this.renderFileInfo();
      }
    }

    applyExternalData(text){
      try{
        const parsed=JSON.parse(text);
        let entries;
        if(Array.isArray(parsed)){
          entries=parsed;
        }else if(parsed && typeof parsed==='object'){
          entries=Object.entries(parsed).map(([partNumber,value])=>{
            const source=(value && typeof value==='object')?value:{};
            const rawLabel=source.Label!=null?source.Label:source.label;
            const labelValue=rawLabel!=null && String(rawLabel).trim()?rawLabel:partNumber;
            const mapped={
              label:labelValue,
              findings:source.Findings!=null?source.Findings:source.findings,
              actions:source.Actions!=null?source.Actions:source.actions,
              routine:source.Routine!=null?source.Routine:source.routine,
              nonroutine:source.Nonroutine!=null?source.Nonroutine:source.nonroutine,
              parts:source.Bestellliste!=null?source.Bestellliste:source.parts
            };
            if(source.id!=null) mapped.id=source.id;
            return mapped;
          });
        }else{
          throw new Error('Ungültiges Format');
        }
        this.data=entries.map(normalizeEntry);
        this.filtered=[...this.data];
        this.selectedId=this.filtered[0]?this.filtered[0].id:null;
        this.undoStack=[];
        this.redoStack=[];
        this.dirty=false;
        if(this.filePath) localStorage.setItem(PATH_KEY,this.filePath);
        this.saveLocal();
        this.renderAll();
        this.showError('');
      }catch(err){
        console.error('Ungültige Daten',err);
        this.showError('Die Datei enthält kein gültiges Findings-Format.');
      }
    }

    saveLocal(){
      try{
        const payload=JSON.stringify(this.data, null, 2);
        localStorage.setItem(STORAGE_KEY,payload);
      }catch(err){
        console.warn('Konnte lokale Daten nicht speichern',err);
      }
    }

    async saveNow(force){
      if(!this.dirty && !force) return;
      const payload=JSON.stringify(this.data, null, 2);
      this.saveLocal();
      if(this.fileHandle){
        try{
          await writeFileHandle(this.fileHandle,payload);
          this.status(force?'Manuell gespeichert':'Automatisch gespeichert');
          this.dirty=false;
          this.pendingSave=false;
          this.showError('');
        }catch(err){
          this.pendingSave=true;
          this.status('Fehler beim Speichern');
          this.showError('Speichern in Datei fehlgeschlagen.');
        }
      }else if(force){
        this.status('Lokale Speicherung aktiv');
        this.showError('Keine Datei gewählt – nur lokale Speicherung.');
        this.dirty=false;
      }else{
        this.status('Auto-Save lokal');
        this.dirty=false;
      }
    }

    status(text){
      if(this.statusEl) this.statusEl.textContent=text;
    }

    showError(text){
      if(this.errorEl) this.errorEl.textContent=text||'';
    }

    applySearch(){
      const rawTerm=this.searchInput.value.trim();
      const term=rawTerm.toLowerCase();
      if(!term){
        this.filtered=[...this.data];
      }else{
        this.filtered=this.data.filter(entry=>{
          for(const key of FIELD_KEYS){
            if(entry[key] && entry[key].toLowerCase().includes(term)) return true;
          }
          return false;
        });
      }
      if(this.filtered.every(item=>item.id!==this.selectedId)){
        this.selectedId=this.filtered[0]?this.filtered[0].id:null;
      }
      this.renderList(rawTerm);
      this.renderEditor(rawTerm);
    }

    renderAll(){
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
    }

    renderFileInfo(){
      if(!this.fileInfoEl) return;
      const path=this.filePath||DEFAULT_FILE;
      const mode=this.fileHandle?'Lese- & Schreibzugriff':'Nur lokale Speicherung';
      const lines=[`Quelle: ${path}`,`Modus: ${mode}`,`Version: ${MODULE_VERSION}`];
      this.fileInfoEl.textContent=lines.join('\n');
    }

    renderList(term=''){ 
      if(!this.listEl||!this.listHeaderEl) return;
      this.listEl.innerHTML='';
      this.listHeaderEl.textContent=this.filtered.length;
      if(!this.filtered.length){
        const empty=document.createElement('div');
        empty.className='sfe-no-results';
        empty.textContent='Keine Findings gefunden';
        this.listEl.appendChild(empty);
        return;
      }
      for(const entry of this.filtered){
        const item=document.createElement('button');
        item.type='button';
        item.className='sfe-item'+(entry.id===this.selectedId?' active':'');
        item.innerHTML=`<div class="sfe-item-title">${highlight(entry.label||'Ohne Label',term)}</div>
          <div class="sfe-item-snippet">${highlight(entry.findings||'',term)}</div>`;
        item.addEventListener('click',()=>{
          this.selectedId=entry.id;
          this.renderList(term);
          this.renderEditor(term);
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
      title.innerHTML=term?highlight(entry.label||'Ohne Label',term):escapeHTML(entry.label||'Ohne Label');
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

      for(const key of FIELD_KEYS){
        const field=document.createElement('div');
        field.className='sfe-field';
        const label=document.createElement('label');
        label.textContent=FIELD_LABELS[key];
        label.setAttribute('for',`${entry.id}-${key}`);
        field.appendChild(label);
        const isSingleLine=key==='label';
        const input=document.createElement(isSingleLine?'input':'textarea');
        input.className=isSingleLine?'sfe-input':'sfe-textarea';
        input.id=`${entry.id}-${key}`;
        input.value=entry[key]||'';
        input.placeholder=isSingleLine?`${FIELD_LABELS[key]} eingeben`:`${FIELD_LABELS[key]} eingeben`;
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
        });
        this.activeFieldControllers[key]=controller;
        fields.appendChild(field);
      }
    }

    getSuggestionsFor(key){
      const set=new Set();
      for(const entry of this.data){
        const value=entry[key];
        if(value) set.add(value);
      }
      return Array.from(set).sort((a,b)=>a.localeCompare(b,'de',{sensitivity:'base'}));
    }

    updateSuggestions(){
      for(const key of FIELD_KEYS){
        const controller=this.activeFieldControllers[key];
        if(controller) controller.setValues(this.getSuggestionsFor(key));
      }
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
      this.dirty=true;
      const rawTerm=this.searchInput.value.trim();
      const term=rawTerm.toLowerCase();
      if(term){
        const filtered=this.data.filter(item=>{
          for(const field of FIELD_KEYS){
            if(item[field] && item[field].toLowerCase().includes(term)) return true;
          }
          return false;
        });
        const hadSelected=filtered.some(item=>item.id===this.selectedId);
        this.filtered=filtered;
        this.renderList(rawTerm);
        if(!hadSelected){
          this.selectedId=filtered[0]?filtered[0].id:null;
          this.renderEditor(rawTerm);
        }
      }else{
        this.filtered=[...this.data];
        this.renderList('');
      }
      if(key==='label' && this.titleEl){
        if(rawTerm){
          this.titleEl.innerHTML=highlight(entry.label||'Ohne Label',rawTerm);
        }else{
          this.titleEl.textContent=entry.label||'Ohne Label';
        }
      }
      this.updateSuggestions();
    }

    createEntry(){
      const entry=normalizeEntry({label:'',findings:'',actions:'',routine:'',nonroutine:'',parts:''});
      this.pushHistory();
      this.data.unshift(entry);
      this.selectedId=entry.id;
      this.activeHistorySignature=null;
      this.dirty=true;
      if(this.searchInput) this.searchInput.value='';
      this.applySearch();
      this.updateSuggestions();
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
    }
  }

  window.renderShopguideFindingsEditor=function(root){
    return new ShopguideFindingsEditor(root);
  };
})();
