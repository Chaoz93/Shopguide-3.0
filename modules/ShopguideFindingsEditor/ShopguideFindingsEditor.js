(function(){
  'use strict';

  const MODULE_VERSION='1.1.2';
  const STORAGE_KEY='shopguide-findings';
  const PATH_KEY='shopguide-findings-path';
  const DEFAULT_FILE='Shopguide_Findings.json';
  const AUTOSAVE_INTERVAL=5000;
  const HISTORY_LIMIT=10;
  const STYLE_ID='sfe-styles';
  const GLOBAL_HANDLE_KEY='__shopguideFindingsFileHandle';

  const FIELD_KEYS=['label','findings','actions','routine','nonroutine','parts'];
  const PART_PAIR_COUNT=6;
  const FIELD_LABELS={
    label:'Label',
    findings:'Findings',
    actions:'Actions',
    routine:'Routine',
    nonroutine:'Nonroutine',
    parts:'Bestelltext'
  };
  const PARTS_GRID_LABEL='Bestellnummern & Mengen';

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

  function getPartsContainer(source){
    if(source&&typeof source==='object'&&source.Parts&&typeof source.Parts==='object') return source.Parts;
    return source&&typeof source==='object'?source:{};
  }

  function extractPartPairs(source){
    const container=getPartsContainer(source);
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

  function normalizeEntry(entry){
    const normalized={id:entry&&entry.id?String(entry.id):ensureId()};
    for(const key of FIELD_KEYS){
      normalized[key]=cleanString(entry?entry[key]:'' );
    }
    normalized.partsPairs=normalizePartsPairs(entry);
    return normalized;
  }

  function buildCopyText(entry){
    const parts=[];
    if(entry.label) parts.push(`Label: ${entry.label}`);
    if(entry.findings) parts.push(`Findings: ${entry.findings}`);
    if(entry.actions) parts.push(`Actions: ${entry.actions}`);
    if(entry.routine) parts.push(`Routine: ${entry.routine}`);
    if(entry.nonroutine) parts.push(`Nonroutine: ${entry.nonroutine}`);
    if(entry.parts) parts.push(`Bestelltext: ${entry.parts}`);
    if(entry.partsPairs&&entry.partsPairs.length){
      const pairLines=[];
      entry.partsPairs.forEach((pair,index)=>{
        if(!pair) return;
        const part=cleanString(pair.part);
        const quantity=cleanString(pair.quantity);
        if(!part && !quantity) return;
        const base=`PN ${index+1}: ${part||'–'}`;
        pairLines.push(quantity?`${base} (Menge: ${quantity})`:base);
      });
      if(pairLines.length){
        parts.push(`${PARTS_GRID_LABEL}:\n${pairLines.join('\n')}`);
      }
    }
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
      this.sourceFormat='array-flat';
      this.rawById=new Map();
      this.partById=new Map();
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
      const refreshHighlight=()=>this.renderWithCurrentSearchTerm();
      this.searchInput.addEventListener('focus',refreshHighlight);
      this.searchInput.addEventListener('blur',refreshHighlight);

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
            const format=await this.loadFromHandle(handle);
            this.status(format?`Format: ${format} erkannt – Datei geladen`:'Datei konnte nicht verarbeitet werden');
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
          const format=this.applyExternalData(text);
          this.status(format?`Format: ${format} erkannt – Datei geladen (Lesemodus)`:'Datei konnte nicht verarbeitet werden');
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
        const format=this.applyExternalData(fromStorage);
        this.status(format?`Format: ${format} erkannt – Lokale Daten geladen`:'Lokale Daten konnten nicht verarbeitet werden');
        return;
      }
      if(this.fileHandle){
        const text=await readFileHandle(this.fileHandle);
        if(text){
          const format=this.applyExternalData(text);
          this.status(format?`Format: ${format} erkannt – Datei geladen`:'Datei konnte nicht verarbeitet werden');
          return;
        }
      }
      await this.loadFromPath(this.filePath||DEFAULT_FILE);
    }

    async loadFromHandle(handle){
      const text=await readFileHandle(handle);
      if(text){
        return this.applyExternalData(text);
      }
      this.showError('Ausgewählte Datei konnte nicht gelesen werden.');
      return null;
    }

    async loadFromPath(path){
      const target=path||DEFAULT_FILE;
      try{
        const res=await fetch(target,{cache:'no-store'});
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const text=await res.text();
        this.filePath=target;
        const format=this.applyExternalData(text);
        this.status(format?`Format: ${format} erkannt – Standarddatei geladen`:'Standarddatei konnte nicht verarbeitet werden');
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
        this.rawById=new Map();
        this.partById=new Map();
        let detectedFormat='array-flat';
        let entries;
        if(Array.isArray(parsed)){
          const hasNested=parsed.some(item=>{
            if(!item||typeof item!=='object') return false;
            const hasPrimary=item.Part!=null||item.part!=null||item.PartNumber!=null||item.Label!=null||item.label!=null||item.Findings!=null||item.findings!=null;
            if(!hasPrimary) return false;
            const hasDeep=(item.Routine&&typeof item.Routine==='object')||(item.routine&&typeof item.routine==='object')||(item.NonRoutine&&typeof item.NonRoutine==='object')||(item.nonRoutine&&typeof item.nonRoutine==='object')||(item.Nonroutine&&typeof item.Nonroutine==='object')||(item.parts&&typeof item.parts==='object')||(item.Parts&&typeof item.Parts==='object');
            return hasDeep;
          });
          if(hasNested){
            detectedFormat='array-nested';
            entries=parsed.map(original=>{
              const source=original&&typeof original==='object'?original:{};
              const id=source.id!=null?String(source.id):ensureId();
              const routineSource=(source.Routine&&typeof source.Routine==='object')?source.Routine:(source.routine&&typeof source.routine==='object'?source.routine:{});
              const nonRoutineSource=(source.NonRoutine&&typeof source.NonRoutine==='object')?source.NonRoutine:(source.nonRoutine&&typeof source.nonRoutine==='object'?source.nonRoutine:(source.Nonroutine&&typeof source.Nonroutine==='object'?source.Nonroutine:{}));
              const partsSource=getPartsContainer(source.Parts||source.parts);
              const labelCandidates=[source.Label,source.label,source.Part,source.part,source.PartNumber];
              let labelValue='';
              for(const candidate of labelCandidates){
                if(candidate==null) continue;
                const cleaned=cleanString(candidate);
                if(cleaned){
                  labelValue=candidate;
                  break;
                }
              }
              const pnText=pickFirstFilled(partsSource.PNText,partsSource.pnText,source.PNText,source.pnText);
              const partPairs=extractPartPairs(partsSource);
              const mapped={
                id,
                label:labelValue,
                findings:source.Findings!=null?source.Findings:source.findings,
                actions:source.Actions!=null?source.Actions:source.actions,
                routine:routineSource&&typeof routineSource==='object'? (routineSource.RoutineFinding!=null?routineSource.RoutineFinding:routineSource.routineFinding):'',
                nonroutine:nonRoutineSource&&typeof nonRoutineSource==='object'? (nonRoutineSource.NonRoutineFinding!=null?nonRoutineSource.NonRoutineFinding:nonRoutineSource.nonRoutineFinding):'',
                parts:pnText,
                partsPairs:partPairs
              };
              this.rawById.set(id,cloneData(source));
              return mapped;
            });
          }else{
            detectedFormat='array-flat';
            entries=parsed;
          }
        }else if(parsed&&typeof parsed==='object'){
          detectedFormat='object-by-pn';
          entries=Object.entries(parsed).map(([partNumber,value])=>{
            const source=value&&typeof value==='object'?value:{};
            const id=source.id!=null?String(source.id):ensureId();
            const labelCandidates=[source.Label,source.label];
            let labelValue='';
            for(const candidate of labelCandidates){
              if(candidate==null) continue;
              const cleaned=cleanString(candidate);
              if(cleaned){
                labelValue=candidate;
                break;
              }
            }
            if(!cleanString(labelValue)) labelValue=partNumber;
            const partsSource=getPartsContainer(source.Parts||source.parts);
            const pnText=pickFirstFilled(partsSource.PNText,partsSource.pnText,source.Bestellliste,source.bestellliste,source.PNText,source.pnText,source.parts);
            const partPairs=extractPartPairs(source);
            const mapped={
              id,
              label:labelValue,
              findings:source.Findings!=null?source.Findings:source.findings,
              actions:source.Actions!=null?source.Actions:source.actions,
              routine:source.Routine!=null?source.Routine:source.routine,
              nonroutine:source.Nonroutine!=null?source.Nonroutine:source.nonroutine,
              parts:pnText,
              partsPairs:partPairs
            };
            this.rawById.set(id,cloneData(source));
            this.partById.set(id,partNumber);
            return mapped;
          });
        }else{
          throw new Error('Ungültiges Format');
        }
        this.sourceFormat=detectedFormat;
        this.data=entries.map(entry=>{
          const normalized=normalizeEntry(entry);
          if(!normalized.label&&entry&&entry.label){
            normalized.label=cleanString(entry.label);
          }
          if(!normalized.label&&detectedFormat==='object-by-pn'){
            const partKey=this.partById.get(normalized.id);
            if(partKey) normalized.label=partKey;
          }
          return normalized;
        });
        this.filtered=[...this.data];
        this.selectedId=this.filtered[0]?this.filtered[0].id:null;
        this.undoStack=[];
        this.redoStack=[];
        this.dirty=false;
        if(this.filePath) localStorage.setItem(PATH_KEY,this.filePath);
        this.saveLocal();
        this.renderAll();
        this.showError('');
        return detectedFormat;
      }catch(err){
        console.error('Ungültige Daten',err);
        this.showError('Die Datei enthält kein gültiges Findings-Format.');
        return null;
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

    buildExternalData(){
      if(this.sourceFormat==='array-nested'){
        const result=[];
        for(const entry of this.data){
          const stored=this.rawById.get(entry.id);
          const raw=stored?cloneData(stored):{
            Part:'',
            Label:'',
            Findings:'',
            Actions:'',
            Routine:{RoutineFinding:''},
            NonRoutine:{NonRoutineFinding:''},
            Parts:{PNText:''}
          };
          if(!raw.Part){
            const fallback=cleanString(entry.label);
            if(fallback) raw.Part=fallback;
          }
          raw.Label=entry.label||raw.Label||'';
          raw.Findings=entry.findings||'';
          raw.Actions=entry.actions||'';
          if(!raw.Routine||typeof raw.Routine!=='object') raw.Routine={};
          raw.Routine.RoutineFinding=entry.routine||'';
          if(!raw.NonRoutine||typeof raw.NonRoutine!=='object') raw.NonRoutine={};
          raw.NonRoutine.NonRoutineFinding=entry.nonroutine||'';
          if(raw.Nonroutine&&typeof raw.Nonroutine==='object'){
            raw.Nonroutine.NonRoutineFinding=entry.nonroutine||'';
          }
          if(!raw.Parts||typeof raw.Parts!=='object') raw.Parts={};
          const pnTextValue=entry.parts||'';
          raw.Parts.PNText=pnTextValue;
          if(Object.prototype.hasOwnProperty.call(raw.Parts,'pnText')) raw.Parts.pnText=pnTextValue;
          applyPartPairs(raw.Parts,entry.partsPairs);
          this.rawById.set(entry.id,cloneData(raw));
          result.push(raw);
        }
        return result;
      }
      if(this.sourceFormat==='object-by-pn'){
        const result={};
        for(const entry of this.data){
          const stored=this.rawById.get(entry.id);
          const raw=stored?cloneData(stored):{};
          raw.Label=entry.label||'';
          raw.Findings=entry.findings||'';
          raw.Actions=entry.actions||'';
          raw.Routine=entry.routine||'';
          raw.Nonroutine=entry.nonroutine||'';
          const pnTextValue=entry.parts||'';
          if(!raw.Parts||typeof raw.Parts!=='object') raw.Parts={PNText:pnTextValue};
          raw.Parts.PNText=pnTextValue;
          if(Object.prototype.hasOwnProperty.call(raw.Parts,'pnText')) raw.Parts.pnText=pnTextValue;
          applyPartPairs(raw.Parts,entry.partsPairs);
          applyPartPairs(raw,entry.partsPairs);
          raw.Bestellliste=pnTextValue;
          if(Object.prototype.hasOwnProperty.call(raw,'bestellliste')) raw.bestellliste=pnTextValue;
          if(Object.prototype.hasOwnProperty.call(raw,'Bestelltext')) raw.Bestelltext=pnTextValue;
          if(Object.prototype.hasOwnProperty.call(raw,'bestelltext')) raw.bestelltext=pnTextValue;
          let key=this.partById.get(entry.id)||'';
          key=cleanString(key);
          if(!key){
            const fallbackCandidates=[raw.PartNumber,raw.Part,entry.label,entry.id];
            for(const candidate of fallbackCandidates){
              const cleaned=cleanString(candidate);
              if(cleaned){
                key=cleaned;
                break;
              }
            }
          }
          if(!key) key=entry.id;
          this.partById.set(entry.id,key);
          this.rawById.set(entry.id,cloneData(raw));
          result[key]=raw;
        }
        return result;
      }
      return this.data.map(entry=>cloneData(entry));
    }

    async saveNow(force){
      if(!this.dirty && !force) return;
      const externalData=this.buildExternalData();
      const payload=JSON.stringify(externalData, null, 2);
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
        this.status('Nur lokale Speicherung');
        this.showError('Keine Datei gewählt – nur lokale Speicherung.');
        this.dirty=false;
        this.pendingSave=false;
      }else{
        this.status('Auto-Save lokal');
        this.dirty=false;
        this.pendingSave=false;
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
          if(Array.isArray(entry.partsPairs)){
            for(const pair of entry.partsPairs){
              if(!pair) continue;
              const part=pair.part?pair.part.toLowerCase():'';
              const qty=pair.quantity?pair.quantity.toLowerCase():'';
              if(part && part.includes(term)) return true;
              if(qty && qty.includes(term)) return true;
            }
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
      const mode=this.fileHandle?'Lese- & Schreibzugriff':'Nur lokale Speicherung';
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
        const item=document.createElement('button');
        item.type='button';
        item.className='sfe-item'+(entry.id===this.selectedId?' active':'');
        item.innerHTML=`<div class="sfe-item-title">${highlight(entry.label||'Ohne Label',highlightTerm)}</div>
          <div class="sfe-item-snippet">${highlight(entry.findings||'',highlightTerm)}</div>`;
        item.addEventListener('click',()=>{
          this.selectedId=entry.id;
          const activeTerm=this.shouldHighlightSearchTerm(term)?term:'';
          this.renderList(activeTerm);
          this.renderEditor(activeTerm);
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

      for(const key of FIELD_KEYS){
        if(key==='parts'){
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
        this.activeFieldControllers[key]=controller;
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

    renderPartsSection(container,entry){
      const gridField=document.createElement('div');
      gridField.className='sfe-field sfe-parts-grid-field';
      const gridHeader=document.createElement('div');
      gridHeader.className='sfe-parts-grid-header';
      const gridLegend=document.createElement('div');
      gridLegend.className='sfe-part-pair-title';
      gridLegend.textContent=PARTS_GRID_LABEL;
      gridHeader.appendChild(gridLegend);
      const bestellBlock=document.createElement('div');
      bestellBlock.className='sfe-bestelltext-block';
      const bestellLabel=document.createElement('label');
      bestellLabel.textContent='Titel / Bestelltext';
      bestellLabel.setAttribute('for',`${entry.id}-parts`);
      bestellBlock.appendChild(bestellLabel);
      const textarea=document.createElement('textarea');
      textarea.className='sfe-textarea';
      textarea.id=`${entry.id}-parts`;
      textarea.value=entry.parts||'';
      textarea.placeholder='Titel / Bestelltext eingeben';
      disableAutocomplete(textarea);
      textarea.addEventListener('input',()=>{
        const value=cleanString(textarea.value);
        this.updateEntry(entry.id,'parts',value);
      });
      textarea.addEventListener('blur',()=>{
        this.activeHistorySignature=null;
      });
      bestellBlock.appendChild(textarea);
      gridHeader.appendChild(bestellBlock);
      gridField.appendChild(gridHeader);
      const controller=new SuggestionsController(gridField,this.getSuggestionsFor('parts'),()=>textarea.value,(val)=>{
        textarea.value=val;
        this.updateEntry(entry.id,'parts',cleanString(val));
      },textarea);
      this.activeFieldControllers.parts=controller;
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

    refreshViewAfterChange(entry,key){
      this.dirty=true;
      if(!this.searchInput){
        this.updateSuggestions();
        return;
      }
      const rawTerm=this.searchInput.value.trim();
      const term=rawTerm.toLowerCase();
      const matchesSearch=item=>{
        for(const field of FIELD_KEYS){
          if(item[field] && item[field].toLowerCase().includes(term)) return true;
        }
        if(Array.isArray(item.partsPairs)){
          for(const pair of item.partsPairs){
            if(!pair) continue;
            const part=pair.part?pair.part.toLowerCase():'';
            const qty=pair.quantity?pair.quantity.toLowerCase():'';
            if(part && part.includes(term)) return true;
            if(qty && qty.includes(term)) return true;
          }
        }
        return false;
      };
      if(term){
        const filtered=this.data.filter(item=>matchesSearch(item));
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

    createEntry(){
      const entry=normalizeEntry({label:'',findings:'',actions:'',routine:'',nonroutine:'',parts:''});
      this.ensurePartsPairs(entry);
      this.pushHistory();
      this.data.unshift(entry);
      if(this.sourceFormat==='array-nested'){
        const partsContainer={PNText:''};
        applyPartPairs(partsContainer,entry.partsPairs);
        this.rawById.set(entry.id,{
          Part:'',
          Label:'',
          Findings:'',
          Actions:'',
          Routine:{RoutineFinding:''},
          NonRoutine:{NonRoutineFinding:''},
          Parts:partsContainer
        });
      }else if(this.sourceFormat==='object-by-pn'){
        const partsContainer={PNText:''};
        applyPartPairs(partsContainer,entry.partsPairs);
        const raw={
          Label:'',
          Findings:'',
          Actions:'',
          Routine:'',
          Nonroutine:'',
          Bestellliste:'',
          Parts:partsContainer
        };
        applyPartPairs(raw,entry.partsPairs);
        this.rawById.set(entry.id,raw);
        this.partById.set(entry.id,'');
      }
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
