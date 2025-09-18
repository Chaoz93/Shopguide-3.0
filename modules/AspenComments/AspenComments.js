(function(){
  'use strict';

  const STYLE_ID='ac-styles';
  const CSS=`
    .ac-root{height:100%;display:flex;flex-direction:column;}
    .ac-titlebar{font-weight:600;color:var(--text-color);padding:0 .2rem .4rem;user-select:none;}
    .ac-toolbar{display:flex;flex-direction:column;gap:.5rem;background:var(--dl-bg,#f5f7fb);border-radius:1rem 1rem 0 0;padding:.75rem .9rem .5rem;}
    .ac-add-row{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;}
    .ac-input{flex:1;min-width:140px;padding:.4rem .6rem;border:1px solid var(--border-color,#d1d5db);border-radius:.5rem;background:#fff;color:inherit;}
    .ac-add-btn{padding:.45rem .9rem;border-radius:.6rem;background:var(--dl-active,#2563eb);color:#fff;border:none;cursor:pointer;}
    .ac-add-btn:disabled{opacity:.6;cursor:not-allowed;}
    .ac-file-label{font-size:.8rem;color:var(--dl-sub,#4b5563);display:flex;align-items:center;gap:.35rem;}
    .ac-surface{flex:1;background:var(--dl-bg,#f5f7fb);border-radius:0 0 1rem 1rem;padding:.75rem;overflow:auto;}
    .ac-list{display:flex;flex-direction:column;gap:.65rem;}
    .ac-card{background:var(--dl-item-bg,#fff);color:var(--dl-sub,#4b5563);border-radius:.8rem;padding:.7rem .75rem;box-shadow:0 2px 6px rgba(0,0,0,.06);display:flex;align-items:center;gap:.75rem;user-select:none;}
    .ac-card.has-comment{box-shadow:0 0 0 1px var(--dl-active,#10b981) inset,0 8px 18px rgba(0,0,0,.12);}
    .ac-info{flex:1;display:flex;flex-direction:column;gap:.25rem;min-width:0;}
    .ac-part{font-weight:600;color:var(--dl-title,#2563eb);font-size:1.02rem;overflow:hidden;text-overflow:ellipsis;}
    .ac-serial{font-size:.85rem;color:var(--dl-sub,#4b5563);overflow:hidden;text-overflow:ellipsis;}
    .ac-edit{padding:.4rem .75rem;border-radius:.6rem;border:1px solid var(--dl-active,#2563eb);background:transparent;color:var(--dl-active,#2563eb);cursor:pointer;flex:0 0 auto;}
    .ac-handle{flex:0 0 auto;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:.45rem;background:rgba(0,0,0,.08);cursor:grab;color:inherit;}
    .ac-handle:active{cursor:grabbing;}
    .ac-empty{opacity:.65;padding:1.5rem 0;text-align:center;}
    .ac-menu{position:fixed;z-index:2000;display:none;min-width:220px;padding:.35rem;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border:1px solid var(--border-color,#e5e7eb);border-radius:.6rem;box-shadow:0 10px 24px rgba(0,0,0,.18);}
    .ac-menu.open{display:block;}
    .ac-menu .mi{display:block;width:100%;padding:.55rem .75rem;text-align:left;border-radius:.45rem;cursor:pointer;}
    .ac-menu .mi:hover{background:rgba(0,0,0,.08);}
    .ac-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:2500;}
    .ac-modal.open{display:flex;}
    .ac-dialog{background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);padding:1rem 1.1rem;border-radius:.8rem;min-width:320px;max-width:600px;width:min(90vw,600px);box-shadow:0 18px 38px rgba(0,0,0,.28);display:flex;flex-direction:column;gap:.75rem;}
    .ac-dialog-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem;font-weight:600;}
    .ac-close{background:transparent;border:none;font-size:1.4rem;line-height:1;cursor:pointer;color:inherit;}
    .ac-textarea{width:100%;min-height:200px;resize:vertical;padding:.6rem .7rem;border:1px solid var(--border-color,#d1d5db);border-radius:.65rem;background:transparent;color:inherit;font:inherit;}
    .ac-meta{font-size:.8rem;color:var(--dl-sub,#4b5563);}
    .ac-ghost{opacity:.4;}
    .ac-chosen{transform:scale(1.02);}
  `;

  const XLSX_URLS=[
    'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.2/xlsx.full.min.js'
  ];

  const SORTABLE_URLS=[
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js'
  ];

  const LS_STATE='LS_STATE_COMMENTS';
  const GROUP_NAME='deviceCommentsGroup';

  const PART_PATTERNS=[/part/i,/pn/i,/artikel/i,/material/i];
  const SERIAL_PATTERNS=[/serial/i,/sn/i,/serien/i];
  const COMMENT_PATTERNS=[/comment/i,/bemerk/i,/notiz/i,/note/i,/hinweis/i];

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const tag=document.createElement('style');
    tag.id=STYLE_ID;
    tag.textContent=CSS;
    document.head.appendChild(tag);
  }

  async function ensureLibrary(globalKey,promiseKey,urls){
    if(window[globalKey]) return;
    if(window[promiseKey]) return window[promiseKey];
    window[promiseKey]=(async()=>{
      let lastError;
      for(const url of urls){
        try{
          await new Promise((resolve,reject)=>{
            const script=document.createElement('script');
            script.src=url;
            script.async=true;
            script.onload=resolve;
            script.onerror=()=>reject(new Error('load '+url));
            document.head.appendChild(script);
          });
          if(window[globalKey]) return;
        }catch(err){lastError=err;}
      }
      throw lastError||new Error('Failed to load '+globalKey);
    })();
    return window[promiseKey];
  }

  function ensureXLSX(){
    return ensureLibrary('XLSX','__XLSX_COMMENTS__',XLSX_URLS);
  }

  function ensureSortable(){
    return ensureLibrary('Sortable','__SORTABLE_COMMENTS__',SORTABLE_URLS);
  }

  function parseState(){
    try{
      const raw=localStorage.getItem(LS_STATE);
      if(!raw) return {};
      return JSON.parse(raw)||{};
    }catch(err){
      console.warn('Failed to parse comment state',err);
      return {};
    }
  }

  function persistState(state){
    const payload={
      items:state.items.map(item=>({
        id:item.id,
        part:item.part,
        serial:item.serial,
        comment:item.comment
      })),
      fileName:state.fileName||''
    };
    try{localStorage.setItem(LS_STATE,JSON.stringify(payload));}catch(err){console.error(err);}    
  }

  function createElements(initialTitle){
    const root=document.createElement('div');
    root.className='ac-root';
    if(initialTitle){
      const title=document.createElement('div');
      title.className='ac-titlebar';
      title.textContent=initialTitle;
      root.appendChild(title);
    }
    const toolbar=document.createElement('div');
    toolbar.className='ac-toolbar';
    const fileLabel=document.createElement('div');
    fileLabel.className='ac-file-label';
    fileLabel.textContent='Keine Datei verknüpft';
    toolbar.appendChild(fileLabel);
    const addRow=document.createElement('div');
    addRow.className='ac-add-row';
    const inputPart=document.createElement('input');
    inputPart.className='ac-input ac-input-part';
    inputPart.placeholder='Partnummer';
    const inputSerial=document.createElement('input');
    inputSerial.className='ac-input ac-input-serial';
    inputSerial.placeholder='Seriennummer';
    const addBtn=document.createElement('button');
    addBtn.type='button';
    addBtn.className='ac-add-btn';
    addBtn.textContent='Hinzufügen';
    addRow.appendChild(inputPart);
    addRow.appendChild(inputSerial);
    addRow.appendChild(addBtn);
    toolbar.appendChild(addRow);
    const surface=document.createElement('div');
    surface.className='ac-surface';
    const list=document.createElement('div');
    list.className='ac-list';
    surface.appendChild(list);
    root.appendChild(toolbar);
    root.appendChild(surface);

    const menu=document.createElement('div');
    menu.className='ac-menu';
    menu.innerHTML='<div class="mi mi-choose">📂 Datei auswählen/wechseln</div><div class="mi mi-import">📥 Importieren</div><div class="mi mi-export">📤 Exportieren</div><div class="mi mi-clear">🗑️ Alle Kommentare löschen</div>';
    document.body.appendChild(menu);

    const modal=document.createElement('div');
    modal.className='ac-modal';
    modal.innerHTML=`<div class="ac-dialog"><div class="ac-dialog-header"><div class="ac-dialog-title">Kommentar</div><button type="button" class="ac-close" aria-label="Schließen">×</button></div><div class="ac-meta"></div><textarea class="ac-textarea" placeholder="Kommentar"></textarea></div>`;
    document.body.appendChild(modal);

    return {
      root,
      toolbar,
      list,
      addBtn,
      inputPart,
      inputSerial,
      fileLabel,
      menu,
      modal,
      modalTitle:modal.querySelector('.ac-dialog-title'),
      modalMeta:modal.querySelector('.ac-meta'),
      modalClose:modal.querySelector('.ac-close'),
      modalTextarea:modal.querySelector('.ac-textarea')
    };
  }

  function normalizeString(value){
    return typeof value==='string'?value.trim():value==null?'':String(value).trim();
  }

  function makeKey(part,serial){
    return `${part}__${serial}`.toLowerCase();
  }

  function createId(){
    return 'dc-'+Math.random().toString(36).slice(2);
  }

  function normalizeItems(rawItems){
    if(!Array.isArray(rawItems)) return [];
    const dedup=new Map();
    rawItems.forEach(raw=>{
      if(!raw) return;
      const part=normalizeString(raw.part ?? raw.Part ?? raw.PN ?? raw.pn ?? raw.material ?? raw.Material);
      const serial=normalizeString(raw.serial ?? raw.Serial ?? raw.SN ?? raw.sn ?? raw.seriennummer ?? raw.Seriennummer);
      const commentRaw=raw.comment ?? raw.Comment ?? raw.bemerkung ?? raw.Bemerkung ?? raw.note ?? raw.Note ?? '';
      const hasComment=!(commentRaw==null || commentRaw==='');
      const comment=hasComment?String(commentRaw):'';
      if(!part && !serial) return;
      const key=makeKey(part,serial);
      if(!dedup.has(key)) dedup.set(key,{part,serial,comment,hasComment});
    });
    return Array.from(dedup.values());
  }

  function extractFromRows(rows){
    if(!Array.isArray(rows) || !rows.length) return [];
    const keys=Object.keys(rows[0]);
    const findField=(patterns,fallback)=>{
      const match=keys.find(key=>patterns.some(rx=>rx.test(key)));
      if(match) return match;
      return fallback || keys[0];
    };
    const partField=findField(PART_PATTERNS,'Part');
    const serialField=findField(SERIAL_PATTERNS,keys[1]||partField);
    const commentField=keys.find(key=>COMMENT_PATTERNS.some(rx=>rx.test(key)));
    const mapped=rows.map(row=>({
      part:row[partField],
      serial:row[serialField],
      comment:commentField!=null?row[commentField]:''
    }));
    return normalizeItems(mapped);
  }

  async function readHandleItems(handle){
    if(!handle) return [];
    const file=await handle.getFile();
    const name=(file.name||'').toLowerCase();
    if(name.endsWith('.xlsx')){
      await ensureXLSX();
      const buffer=await file.arrayBuffer();
      const workbook=XLSX.read(buffer,{type:'array'});
      const sheet=workbook.Sheets[workbook.SheetNames[0]];
      if(!sheet) return [];
      const rows=XLSX.utils.sheet_to_json(sheet,{defval:''});
      return extractFromRows(rows);
    }
    const text=await file.text();
    let parsed;
    try{parsed=JSON.parse(text);}catch(err){console.error('JSON parse error',err);return [];}
    if(Array.isArray(parsed)) return normalizeItems(parsed);
    if(Array.isArray(parsed?.items)) return normalizeItems(parsed.items);
    if(Array.isArray(parsed?.comments)) return normalizeItems(parsed.comments);
    return [];
  }

  function updateFileLabel(elements,state){
    const name=(state.fileName||'').trim();
    if(name){
      elements.fileLabel.textContent=`Datei: ${name}`;
    }else{
      elements.fileLabel.textContent='Keine Datei verknüpft';
    }
  }

  function buildCard(item){
    const card=document.createElement('div');
    card.className='ac-card'+(item.comment?' has-comment':'');
    card.dataset.id=item.id;
    const info=document.createElement('div');
    info.className='ac-info';
    const title=document.createElement('div');
    title.className='ac-part';
    title.textContent=item.part||'—';
    const serial=document.createElement('div');
    serial.className='ac-serial';
    serial.textContent=item.serial||'—';
    info.appendChild(title);
    info.appendChild(serial);
    const editBtn=document.createElement('button');
    editBtn.type='button';
    editBtn.className='ac-edit';
    editBtn.textContent='Kommentar bearbeiten';
    const handle=document.createElement('div');
    handle.className='ac-handle';
    handle.textContent='⋮⋮';
    card.appendChild(info);
    card.appendChild(editBtn);
    card.appendChild(handle);
    return card;
  }

  function renderList(elements,state){
    if(!state.items.length){
      elements.list.innerHTML='<div class="ac-empty">Keine Kombinationen</div>';
      persistState(state);
      return;
    }
    const frag=document.createDocumentFragment();
    state.items.forEach(item=>{frag.appendChild(buildCard(item));});
    elements.list.replaceChildren(frag);
    persistState(state);
  }

  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}

  window.renderAspenComments=async function(targetDiv,opts){
    injectStyles();
    const initialTitle=opts?.moduleJson?.settings?.title||'';
    const elements=createElements(initialTitle);
    targetDiv.appendChild(elements.root);

    const state={
      items:[],
      fileName:''
    };
    let fileHandle=null;
    let fileType='';
    let editingId='';
    let writeLocked=false;
    let writePending=false;

    const stored=parseState();
    if(Array.isArray(stored.items)){
      state.items=stored.items.map(item=>({
        id:item.id||createId(),
        part:normalizeString(item.part),
        serial:normalizeString(item.serial),
        comment:typeof item.comment==='string'?item.comment:String(item.comment||'')
      })).filter(entry=>entry.part||entry.serial);
    }
    state.fileName=stored.fileName||'';
    updateFileLabel(elements,state);
    renderList(elements,state);

    function scheduleWrite(){
      if(!fileHandle) return;
      if(writeLocked){
        writePending=true;
        return;
      }
      writeLocked=true;
      (async()=>{
        try{await writeToHandle();}
        catch(err){console.error('write failed',err);}finally{
          writeLocked=false;
          if(writePending){
            writePending=false;
            scheduleWrite();
          }
        }
      })();
    }

    async function ensurePermission(){
      if(!fileHandle?.queryPermission) return true;
      try{
        const perm=await fileHandle.queryPermission({mode:'readwrite'});
        if(perm==='granted') return true;
        if(perm==='prompt'){
          const res=await fileHandle.requestPermission({mode:'readwrite'});
          return res==='granted';
        }
        if(perm==='denied') return false;
      }catch(err){
        console.warn('permission query failed',err);
      }
      if(fileHandle?.requestPermission){
        try{return (await fileHandle.requestPermission({mode:'readwrite'}))==='granted';}
        catch(err){console.warn('permission request failed',err);return false;}
      }
      return false;
    }

    async function writeToHandle(){
      if(!fileHandle) return;
      const allowed=await ensurePermission();
      if(!allowed) return;
      const payload=state.items.map(item=>({part:item.part,serial:item.serial,comment:item.comment}));
      if(fileType==='xlsx'){
        await ensureXLSX();
        const worksheet=XLSX.utils.json_to_sheet(payload.length?payload:[{part:'',serial:'',comment:''}]);
        const workbook=XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook,worksheet,'Comments');
        const buffer=XLSX.write(workbook,{bookType:'xlsx',type:'array'});
        const writable=await fileHandle.createWritable();
        await writable.write(buffer);
        await writable.close();
      }else{
        const text=JSON.stringify(payload,null,2);
        const writable=await fileHandle.createWritable();
        await writable.write(text);
        await writable.close();
      }
    }

    function persistAndSync(){
      state.items=state.items.filter(entry=>entry.part||entry.serial);
      persistState(state);
      scheduleWrite();
    }

    function integrateItems(imported,{replace}){
      const normalized=normalizeItems(imported);
      if(!normalized.length){
        if(replace){
          state.items=[];
        }
        persistAndSync();
        renderList(elements,state);
        return;
      }
      const existingMap=new Map(state.items.map(item=>[makeKey(item.part,item.serial),item]));
      if(replace){
        state.items=normalized.map(entry=>{
          const key=makeKey(entry.part,entry.serial);
          const existing=existingMap.get(key);
          const comment=entry.hasComment?String(entry.comment):existing?.comment||'';
          return {
            id:existing?.id||createId(),
            part:entry.part,
            serial:entry.serial,
            comment
          };
        });
      }else{
        const map=new Map();
        state.items.forEach(item=>{
          map.set(makeKey(item.part,item.serial),{...item});
        });
        normalized.forEach(entry=>{
          const key=makeKey(entry.part,entry.serial);
          const existing=map.get(key);
          if(existing){
            if(entry.hasComment){
              existing.comment=String(entry.comment);
            }
          }else{
            map.set(key,{
              id:createId(),
              part:entry.part,
              serial:entry.serial,
              comment:entry.hasComment?String(entry.comment):''
            });
          }
        });
        state.items=Array.from(map.values());
      }
      persistAndSync();
      renderList(elements,state);
    }

    async function chooseFile(){
      closeMenu();
      if(!window.showOpenFilePicker){
        alert('File System Access API wird nicht unterstützt.');
        return;
      }
      try{
        const [handle]=await showOpenFilePicker({
          types:[
            {description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}},
            {description:'JSON',accept:{'application/json':['.json']}}
          ],
          multiple:false
        });
        if(!handle) return;
        const items=await readHandleItems(handle);
        fileHandle=handle;
        fileType=(handle.name||'').toLowerCase().endsWith('.xlsx')?'xlsx':'json';
        state.fileName=handle.name||'';
        updateFileLabel(elements,state);
        integrateItems(items,{replace:true});
      }catch(err){
        if(err?.name==='AbortError') return;
        console.error(err);
      }
    }

    async function importData(){
      closeMenu();
      if(window.showOpenFilePicker){
        try{
          const [handle]=await showOpenFilePicker({
            types:[
              {description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}},
              {description:'JSON',accept:{'application/json':['.json']}}
            ],
            multiple:false
          });
          if(!handle) return;
          const items=await readHandleItems(handle);
          integrateItems(items,{replace:false});
        }catch(err){
          if(err?.name==='AbortError') return;
          console.error(err);
        }
        return;
      }
      const input=document.createElement('input');
      input.type='file';
      input.accept='.xlsx,.json';
      input.addEventListener('change',async()=>{
        const file=input.files?.[0];
        if(!file) return;
        try{
          const items=await (async()=>{
            if(file.name.toLowerCase().endsWith('.xlsx')){
              await ensureXLSX();
              const buffer=await file.arrayBuffer();
              const workbook=XLSX.read(buffer,{type:'array'});
              const sheet=workbook.Sheets[workbook.SheetNames[0]];
              if(!sheet) return [];
              const rows=XLSX.utils.sheet_to_json(sheet,{defval:''});
              return extractFromRows(rows);
            }
            const text=await file.text();
            let parsed;
            try{parsed=JSON.parse(text);}catch(err){console.error(err);return [];}
            if(Array.isArray(parsed)) return parsed;
            if(Array.isArray(parsed?.items)) return parsed.items;
            if(Array.isArray(parsed?.comments)) return parsed.comments;
            return [];
          })();
          integrateItems(items,{replace:false});
        }catch(err){console.error(err);}finally{input.remove();}
      });
      input.click();
    }

    async function exportData(){
      closeMenu();
      const payload=state.items.map(item=>({part:item.part,serial:item.serial,comment:item.comment}));
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      if(window.showSaveFilePicker){
        try{
          const handle=await showSaveFilePicker({
            suggestedName:'device-comments.json',
            types:[{description:'JSON',accept:{'application/json':['.json']}}]
          });
          if(!handle) return;
          const writable=await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        }catch(err){if(err?.name==='AbortError') return;console.error(err);} 
        return;
      }
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;
      link.download='device-comments.json';
      link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }

    function clearAll(){
      closeMenu();
      if(!confirm('Alle Kommentare löschen?')) return;
      state.items=[];
      persistAndSync();
      renderList(elements,state);
    }

    function closeMenu(){elements.menu.classList.remove('open');}

    function openMenu(x,y){
      const rect=elements.menu.getBoundingClientRect();
      const pad=12;
      const vw=window.innerWidth;
      const vh=window.innerHeight;
      elements.menu.style.left=clamp(x-pad,pad,vw-rect.width-pad)+'px';
      elements.menu.style.top=clamp(y-pad,pad,vh-rect.height-pad)+'px';
      elements.menu.classList.add('open');
    }

    elements.menu.addEventListener('click',e=>e.stopPropagation());
    elements.menu.querySelector('.mi-choose').addEventListener('click',chooseFile);
    elements.menu.querySelector('.mi-import').addEventListener('click',importData);
    elements.menu.querySelector('.mi-export').addEventListener('click',exportData);
    elements.menu.querySelector('.mi-clear').addEventListener('click',clearAll);

    targetDiv.addEventListener('contextmenu',event=>{
      event.preventDefault();
      openMenu(event.clientX,event.clientY);
    });
    document.addEventListener('click',event=>{
      if(!elements.menu.contains(event.target)) closeMenu();
    });

    function openEditor(item){
      editingId=item.id;
      elements.modalTitle.textContent=`Kommentar – ${item.part||'—'} / ${item.serial||'—'}`;
      elements.modalMeta.textContent=`PN: ${item.part||'—'} · SN: ${item.serial||'—'}`;
      elements.modalTextarea.value=item.comment||'';
      elements.modal.classList.add('open');
      setTimeout(()=>elements.modalTextarea.focus(),50);
    }

    function closeEditor(){
      editingId='';
      elements.modal.classList.remove('open');
    }

    elements.modalClose.addEventListener('click',closeEditor);
    elements.modal.addEventListener('click',event=>{if(event.target===elements.modal) closeEditor();});
    window.addEventListener('keydown',event=>{
      if(event.key==='Escape'){
        if(elements.menu.classList.contains('open')) closeMenu();
        if(elements.modal.classList.contains('open')) closeEditor();
      }
    });

    elements.modalTextarea.addEventListener('input',()=>{
      if(!editingId) return;
      const item=state.items.find(entry=>entry.id===editingId);
      if(!item) return;
      item.comment=elements.modalTextarea.value;
      persistAndSync();
      const card=elements.list.querySelector(`.ac-card[data-id="${item.id}"]`);
      if(card){
        card.classList.toggle('has-comment',!!item.comment);
      }
    });

    elements.list.addEventListener('click',event=>{
      const editBtn=event.target.closest('.ac-edit');
      if(editBtn){
        const card=editBtn.closest('.ac-card');
        if(!card) return;
        const item=state.items.find(entry=>entry.id===card.dataset.id);
        if(item) openEditor(item);
        return;
      }
    });

    function addFromInputs(){
      const part=normalizeString(elements.inputPart.value);
      const serial=normalizeString(elements.inputSerial.value);
      if(!part && !serial) return;
      const key=makeKey(part,serial);
      const existing=state.items.find(item=>makeKey(item.part,item.serial)===key);
      if(existing){
        existing.part=part;
        existing.serial=serial;
        persistAndSync();
        renderList(elements,state);
        openEditor(existing);
      }else{
        const item={id:createId(),part,serial,comment:''};
        state.items.push(item);
        persistAndSync();
        renderList(elements,state);
        openEditor(item);
      }
      elements.inputSerial.value='';
      elements.inputPart.value='';
      elements.inputPart.focus();
    }

    elements.addBtn.addEventListener('click',addFromInputs);
    elements.inputPart.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addFromInputs();}});
    elements.inputSerial.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addFromInputs();}});

    await ensureSortable();
    new Sortable(elements.list,{
      group:{name:GROUP_NAME,pull:true,put:true},
      animation:150,
      handle:'.ac-handle',
      draggable:'.ac-card',
      ghostClass:'ac-ghost',
      chosenClass:'ac-chosen',
      onSort:syncOrder,
      onAdd:syncOrder,
      onRemove:syncOrder
    });

    function syncOrder(){
      const order=[];
      elements.list.querySelectorAll('.ac-card').forEach(card=>{
        const id=card.dataset.id;
        const item=state.items.find(entry=>entry.id===id);
        if(item) order.push(item);
      });
      if(order.length){
        state.items=order.concat(state.items.filter(item=>!order.includes(item)));
        persistAndSync();
      }
    }

    const mo=new MutationObserver(()=>{
      if(!document.body.contains(elements.root)){
        elements.menu.remove();
        elements.modal.remove();
        mo.disconnect();
      }
    });
    mo.observe(document.body,{childList:true,subtree:true});
  };
})();
