(function(){
  const STYLE_ID='checklist-styles';
  const DATA_URL='modules/Checklist/ChecklistData.json';
  const LS_DOC_KEY='module_data_v1';
  const LS_DATA_KEY='checklist-data';
  const IDB_NAME='modulesApp';
  const IDB_STORE='fs-handles';
  const DATA_HANDLE_KEY='checklist-data-handle';
  const TEMPLATE_HANDLE_KEY='checklist-template-handle';
  const DATA_FILENAME='checklist-data.json';
  const TEMPLATE_FILENAME='checklist-templates.json';
  const STORAGE_EVENT='storage';
  const WATCH_INTERVAL=400;

  const clamp=(val,min,max)=>Math.max(min,Math.min(max,val));
  const parseJSON=(text,fb)=>{try{return JSON.parse(text); }catch(e){return fb;}};
  const debounce=(ms,fn)=>{let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),ms);};};
  const uid=()=>`task-${Math.random().toString(36).slice(2,10)}`;

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const css=`
    .cl-root{height:100%;display:flex;flex-direction:column;gap:.75rem;color:var(--text-color,#0f172a);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
    .cl-header{display:flex;align-items:center;justify-content:space-between;gap:.75rem;}
    .cl-title{font-size:1.15rem;font-weight:600;letter-spacing:.01em;color:inherit;}
    .cl-sub{font-size:.85rem;opacity:.75;}
    .cl-info{display:flex;flex-direction:column;gap:.1rem;min-height:1.8rem;}
    .cl-actions{display:flex;align-items:center;gap:.35rem;}
    .cl-btn{display:inline-flex;align-items:center;gap:.4rem;background:rgba(255,255,255,.18);color:inherit;border:none;border-radius:.65rem;padding:.45rem .75rem;font-size:.85rem;font-weight:500;cursor:pointer;transition:background .15s ease,transform .15s ease;}
    .cl-btn:hover{background:rgba(255,255,255,.28);transform:translateY(-1px);}
    .cl-board{flex:1;display:flex;flex-direction:column;gap:.5rem;background:rgba(255,255,255,.08);border-radius:1rem;padding:.9rem;overflow:auto;position:relative;}
    .cl-empty{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;font-size:.95rem;opacity:.65;}
    .cl-list{display:flex;flex-direction:column;gap:.5rem;position:relative;}
    .cl-item{background:rgba(255,255,255,.92);color:#111827;border-radius:.75rem;padding:.55rem .65rem;display:flex;align-items:center;gap:.6rem;box-shadow:0 4px 18px rgba(15,23,42,.08);position:relative;min-height:3rem;}
    .cl-item.disabled{opacity:.55;}
    .cl-item .cl-left{display:flex;align-items:center;gap:.6rem;flex:1;min-width:0;}
    .cl-handle{width:32px;height:32px;border-radius:.6rem;background:rgba(15,23,42,.08);display:flex;align-items:center;justify-content:center;color:rgba(15,23,42,.6);cursor:grab;flex:0 0 auto;transition:background .15s ease,color .15s ease;}
    .cl-item:hover .cl-handle{background:rgba(15,23,42,.18);color:rgba(15,23,42,.85);}
    .cl-check{display:flex;align-items:center;gap:.5rem;flex:1;min-width:0;}
    .cl-check input{width:20px;height:20px;border-radius:.4rem;border:1px solid rgba(15,23,42,.2);}
    .cl-text{flex:1;min-width:0;display:block;padding:.35rem .4rem;border-radius:.5rem;transition:background .12s ease;}
    .cl-text[contenteditable="true"]:focus{outline:none;background:rgba(37,99,235,.12);}
    .cl-right{display:flex;align-items:center;gap:.35rem;flex:0 0 auto;}
    .cl-delete{width:28px;height:28px;border-radius:.6rem;border:none;background:rgba(239,68,68,.12);color:#b91c1c;display:flex;align-items:center;justify-content:center;font-size:1.1rem;cursor:pointer;transition:background .15s ease,color .15s ease;}
    .cl-delete:hover{background:#dc2626;color:#fff;}
    .cl-gap{height:32px;border:1px dashed rgba(255,255,255,.25);border-radius:.75rem;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .12s ease,border-color .12s ease;position:relative;}
    .cl-gap:hover{opacity:1;border-color:rgba(255,255,255,.45);}
    .cl-gap button{background:rgba(255,255,255,.9);color:#1f2937;border:none;border-radius:9999px;padding:.35rem .65rem;font-size:.8rem;font-weight:600;display:flex;align-items:center;gap:.3rem;cursor:pointer;box-shadow:0 4px 12px rgba(15,23,42,.12);}
    .cl-gap button:hover{background:#2563eb;color:#fff;}
    .cl-ghost{opacity:.35;}
    .cl-dragging{opacity:.6;}
    .cl-requires{font-size:.75rem;padding:.2rem .45rem;border-radius:.5rem;background:rgba(37,99,235,.15);color:#1d4ed8;font-weight:600;}
    .cl-status{font-size:.75rem;opacity:.7;}
    .cl-menu{position:fixed;z-index:1000;display:none;min-width:220px;padding:.35rem;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111827);border:1px solid var(--border-color,#e5e7eb);border-radius:.65rem;box-shadow:0 16px 40px rgba(15,23,42,.25);}
    .cl-menu.open{display:block;}
    .cl-menu .mi{width:100%;display:flex;align-items:center;gap:.5rem;padding:.55rem .75rem;border-radius:.5rem;background:none;border:none;color:inherit;text-align:left;font-size:.9rem;cursor:pointer;}
    .cl-menu .mi:hover{background:rgba(37,99,235,.12);}
    .cl-menu .mi.noclick{cursor:default;opacity:.7;}
    .cl-menu .mi.noclick:hover{background:none;}
    .cl-pill{display:inline-flex;align-items:center;gap:.35rem;font-size:.75rem;background:rgba(255,255,255,.18);padding:.3rem .6rem;border-radius:.5rem;}
    `;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=css;
    document.head.appendChild(style);
  }

  function idbOpen(){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(IDB_NAME,1);
      request.onupgradeneeded=()=>{request.result.createObjectStore(IDB_STORE);};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  async function idbGet(key){
    try{
      const db=await idbOpen();
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(IDB_STORE,'readonly');
        const req=tx.objectStore(IDB_STORE).get(key);
        req.onsuccess=()=>resolve(req.result||null);
        req.onerror=()=>reject(req.error);
      });
    }catch{return null;}
  }
  async function idbSet(key,value){
    try{
      const db=await idbOpen();
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(IDB_STORE,'readwrite');
        tx.objectStore(IDB_STORE).put(value,key);
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error);
      });
    }catch(err){console.warn('Checklist: idbSet failed',err);}
  }
  async function idbDel(key){
    try{
      const db=await idbOpen();
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(IDB_STORE,'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error);
      });
    }catch(err){console.warn('Checklist: idbDel failed',err);}
  }

  async function requestPermission(handle,mode){
    if(!handle?.queryPermission) return true;
    try{
      const query=await handle.queryPermission({mode});
      if(query==='granted') return true;
      const res=await handle.requestPermission({mode});
      return res==='granted';
    }catch{return false;}
  }

  function normaliseData(base,stored){
    const clone=data=>JSON.parse(JSON.stringify(data||{}));
    const result=clone(base);
    if(stored){
      result.version=stored.version||result.version||'1.0.0';
      if(Array.isArray(stored.defaults)){
        const seen=new Set();
        const merged=[];
        const add=list=>{
          for(const entry of list){
            if(!entry||typeof entry!=='object') continue;
            const id=(entry.id||'').toString();
            if(!id) continue;
            if(seen.has(id)) continue;
            seen.add(id);
            merged.push({
              id,
              label:entry.label||'',
              requires:Array.isArray(entry.requires)?entry.requires.slice():[],
              meta:entry.meta||null
            });
          }
        };
        add(result.defaults||[]);
        add(stored.defaults);
        result.defaults=merged;
      }
      if(Array.isArray(stored.partSpecificSteps)){
        const extras=stored.partSpecificSteps.filter(x=>x&&typeof x==='object');
        const existing=new Map();
        for(const entry of result.partSpecificSteps||[]){
          const key=`${entry.prefix||''}|${entry.label||''}`;
          existing.set(key,true);
        }
        for(const entry of extras){
          const key=`${entry.prefix||''}|${entry.label||''}`;
          if(!existing.has(key)){
            (result.partSpecificSteps||(result.partSpecificSteps=[])).push({
              prefix:entry.prefix||'',
              label:entry.label||'',
              requires:Array.isArray(entry.requires)?entry.requires.slice():[],
              id:entry.id||null
            });
            existing.set(key,true);
          }
        }
      }
      if(stored.meldungen && typeof stored.meldungen==='object'){
        result.meldungen = clone(stored.meldungen);
      }else{
        result.meldungen = result.meldungen || {};
      }
      if(stored.templateMeta && typeof stored.templateMeta==='object'){
        result.templateMeta=clone(stored.templateMeta);
      }
      if(stored.preferences && typeof stored.preferences==='object'){
        result.preferences=clone(stored.preferences);
      }
    }
    result.defaults=result.defaults||[];
    result.partSpecificSteps=result.partSpecificSteps||[];
    result.meldungen=result.meldungen||{};
    return result;
  }

  async function loadBaseData(){
    try{
      const res=await fetch(DATA_URL);
      if(!res.ok) throw new Error('HTTP '+res.status);
      return await res.json();
    }catch(err){
      console.warn('Checklist: base data load failed',err);
      return {version:'1.0.0',defaults:[],partSpecificSteps:[],meldungen:{}};
    }
  }

  function loadStoredData(){
    const raw=localStorage.getItem(LS_DATA_KEY);
    if(!raw) return null;
    return parseJSON(raw,null);
  }

  function persistLocal(data){
    try{localStorage.setItem(LS_DATA_KEY,JSON.stringify(data));}catch(err){console.warn('Checklist: persist failed',err);}
  }

  function ensureCertDependencies(tasks){
    const cert=tasks.find(t=>t.id==='certify');
    if(!cert) return;
    const idx=tasks.indexOf(cert);
    const required=tasks.slice(0,idx).map(t=>t.id).filter(Boolean);
    cert.requires=[...new Set(required)];
  }

  function buildTaskFromDefault(entry){
    return {
      id:entry.id||uid(),
      label:entry.label||'',
      requires:Array.isArray(entry.requires)?entry.requires.slice():[],
      checked:false,
      dynamic:false,
      createdAt:new Date().toISOString()
    };
  }

  function buildTaskFromSpecific(entry){
    return {
      id:entry.id||uid(),
      label:entry.label||'',
      requires:Array.isArray(entry.requires)?entry.requires.slice():[],
      checked:false,
      dynamic:true,
      prefix:entry.prefix||'',
      createdAt:new Date().toISOString()
    };
  }

  function ensureTaskShape(task){
    return {
      id:task.id||uid(),
      label:task.label||'',
      requires:Array.isArray(task.requires)?task.requires.slice():[],
      checked:!!task.checked,
      dynamic:!!task.dynamic,
      prefix:task.prefix||'',
      createdAt:task.createdAt||new Date().toISOString()
    };
  }

  function buildTasksForPart(data,partNumber){
    const base=(data.defaults||[]).map(buildTaskFromDefault);
    const dynamic=[];
    const part=(partNumber||'').trim();
    if(part){
      for(const entry of data.partSpecificSteps||[]){
        if(!entry||typeof entry!=='object') continue;
        const prefix=(entry.prefix||'').trim();
        if(!prefix) continue;
        if(part.startsWith(prefix)){
          dynamic.push(buildTaskFromSpecific(entry));
        }
      }
    }
    let merged=[];
    if(base.length){
      const certIndex=base.findIndex(t=>t.id==='certify');
      if(certIndex>=0){
        merged=[...base.slice(0,certIndex),...dynamic,...base.slice(certIndex)];
      }else{
        merged=[...base,...dynamic];
      }
    }else{
      merged=[...dynamic];
    }
    ensureCertDependencies(merged);
    return merged;
  }

  function mergeTemplateWithSaved(templateTasks,savedTasks){
    const template=templateTasks.map(ensureTaskShape);
    const savedMap=new Map();
    if(Array.isArray(savedTasks)){
      for(const entry of savedTasks){
        const shaped=ensureTaskShape(entry);
        savedMap.set(shaped.id,shaped);
      }
    }
    const merged=[];
    for(const base of template){
      const saved=savedMap.get(base.id);
      if(saved){
        merged.push({
          ...base,
          label:saved.label||base.label,
          requires:Array.isArray(saved.requires)&&saved.requires.length?saved.requires.slice():base.requires.slice(),
          checked:!!saved.checked,
          dynamic:saved.dynamic??base.dynamic,
          prefix:saved.prefix||base.prefix,
          createdAt:saved.createdAt||base.createdAt
        });
        savedMap.delete(base.id);
      }else{
        merged.push(base);
      }
    }
    for(const leftover of savedMap.values()){
      merged.push(leftover);
    }
    ensureCertDependencies(merged);
    return merged;
  }

  async function readFileAsJSON(fileHandle){
    try{
      const file=await fileHandle.getFile();
      const text=await file.text();
      return parseJSON(text,null);
    }catch(err){
      console.warn('Checklist: readFileAsJSON failed',err);
      return null;
    }
  }

  async function writeJSONFile(fileHandle,data){
    try{
      if(!fileHandle.createWritable) return false;
      const writable=await fileHandle.createWritable();
      await writable.write(JSON.stringify(data,null,2));
      await writable.close();
      return true;
    }catch(err){
      console.warn('Checklist: writeJSONFile failed',err);
      return false;
    }
  }

  window.renderChecklist=function(root){
    injectStyles();
    let destroyed=false;
    let data=null;
    let defaults=null;
    let currentMeldung='';
    let currentPart='';
    let currentTasks=[];
    let menu=null;
    let watcher=null;
    let lastDoc=null;
    let templateFolderHandle=null;
    let dataFolderHandle=null;
    let dataFileHandle=null;
    const saveDebounced=debounce(350,saveAll);

    root.innerHTML='';
    root.classList.add('cl-root');

    const header=document.createElement('div');
    header.className='cl-header';
    const info=document.createElement('div');
    info.className='cl-info';
    const title=document.createElement('div');
    title.className='cl-title';
    title.textContent='Checkliste';
    const sub=document.createElement('div');
    sub.className='cl-sub';
    sub.textContent='Keine Meldung ausgewählt';
    info.appendChild(title);
    info.appendChild(sub);
    const actions=document.createElement('div');
    actions.className='cl-actions';
    const addBtn=document.createElement('button');
    addBtn.className='cl-btn';
    addBtn.innerHTML='<span>➕</span><span>Schritt hinzufügen</span>';
    addBtn.addEventListener('click',()=>promptAddTask(currentTasks.length));
    actions.appendChild(addBtn);
    const status=document.createElement('div');
    status.className='cl-status';
    status.textContent='';
    header.appendChild(info);
    header.appendChild(actions);

    const board=document.createElement('div');
    board.className='cl-board';
    const list=document.createElement('div');
    list.className='cl-list';
    const empty=document.createElement('div');
    empty.className='cl-empty';
    empty.textContent='Keine Aufgaben verfügbar';
    board.appendChild(empty);

    root.appendChild(header);
    root.appendChild(board);
    root.appendChild(status);

    function updateStatus(message){
      status.textContent=message||'';
    }

    function renderList(){
      list.innerHTML='';
      if(!currentTasks.length){
        if(!board.contains(empty)) board.appendChild(empty);
        if(board.contains(list)) board.removeChild(list);
        return;
      }
      if(board.contains(empty)) board.removeChild(empty);
      if(!board.contains(list)) board.appendChild(list);
      const frag=document.createDocumentFragment();
      for(let i=0;i<=currentTasks.length;i++){
        const gap=document.createElement('div');
        gap.className='cl-gap';
        const gapBtn=document.createElement('button');
        gapBtn.type='button';
        gapBtn.innerHTML='<span>＋</span><span>Schritt einfügen</span>';
        gapBtn.addEventListener('click',()=>promptAddTask(i));
        gap.appendChild(gapBtn);
        frag.appendChild(gap);
        if(i===currentTasks.length) break;
        const task=currentTasks[i];
        const item=document.createElement('div');
        item.className='cl-item';
        item.dataset.id=task.id;
        if(task.requires?.length){
          const unmet=task.requires.some(reqId=>{
            const ref=currentTasks.find(t=>t.id===reqId);
            return !ref||!ref.checked;
          });
          if(unmet && !task.checked){
            item.classList.add('disabled');
          }
        }
        const left=document.createElement('div');
        left.className='cl-left';
        const handle=document.createElement('div');
        handle.className='cl-handle';
        handle.innerHTML='⋮⋮';
        left.appendChild(handle);
        const label=document.createElement('label');
        label.className='cl-check';
        const box=document.createElement('input');
        box.type='checkbox';
        box.checked=!!task.checked;
        box.addEventListener('change',()=>toggleTask(task.id,box.checked));
        const text=document.createElement('span');
        text.className='cl-text';
        text.textContent=task.label||'';
        text.contentEditable='true';
        text.addEventListener('blur',()=>updateTaskText(task.id,text.textContent));
        text.addEventListener('keydown',ev=>{
          if(ev.key==='Enter'){ev.preventDefault();text.blur();}
        });
        label.appendChild(box);
        label.appendChild(text);
        left.appendChild(label);
        const right=document.createElement('div');
        right.className='cl-right';
        if(task.requires?.length){
          const pill=document.createElement('div');
          pill.className='cl-requires';
          pill.textContent=`${task.requires.length} Voraussetzungen`;
          pill.title='Dieser Schritt benötigt abgeschlossene vorherige Schritte';
          right.appendChild(pill);
        }
        const del=document.createElement('button');
        del.className='cl-delete';
        del.type='button';
        del.innerHTML='×';
        del.title='Schritt entfernen';
        del.addEventListener('click',()=>removeTask(task.id));
        right.appendChild(del);
        item.appendChild(left);
        item.appendChild(right);
        frag.appendChild(item);
      }
      list.appendChild(frag);
      ensureSortable();
    }

    function ensureSortable(){
      if(!window.Sortable) return;
      if(list.__sortable){
        list.__sortable.destroy();
        list.__sortable=null;
      }
      const items=list.querySelectorAll('.cl-item');
      if(!items.length) return;
      list.__sortable=new Sortable(list,{
        animation:160,
        ghostClass:'cl-ghost',
        chosenClass:'cl-dragging',
        handle:'.cl-handle',
        draggable:'.cl-item',
        filter:'.cl-gap',
        onEnd(evt){
          const order=Array.from(list.querySelectorAll('.cl-item')).map(el=>el.dataset.id);
          reorderTasks(order);
        }
      });
    }

    function updateHeader(){
      const meld=currentMeldung?`Meldung ${currentMeldung}`:'Keine Meldung ausgewählt';
      const part=currentPart?`P/N ${currentPart}`:'';
      sub.textContent=part?`${meld} · ${part}`:meld;
    }

    function promptAddTask(index){
      if(!currentMeldung){
        alert('Bitte zuerst eine Meldung auswählen.');
        return;
      }
      const text=prompt('Wie soll der neue Schritt heißen?');
      if(!text) return;
      addTask(index,text.trim());
    }

    function addTask(index,label){
      const task={id:uid(),label,requires:[],checked:false,dynamic:true,createdAt:new Date().toISOString()};
      currentTasks.splice(index,0,task);
      ensureCertDependencies(currentTasks);
      renderList();
      persistCurrent();
    }

    function updateTaskText(id,value){
      const task=currentTasks.find(t=>t.id===id);
      if(!task) return;
      const trimmed=(value||'').trim();
      if(!trimmed){
        task.label='Unbenannter Schritt';
      }else{
        task.label=trimmed;
      }
      persistCurrent();
      renderList();
    }

    function toggleTask(id,checked){
      const task=currentTasks.find(t=>t.id===id);
      if(!task) return;
      if(checked && task.requires?.length){
        const unmet=task.requires.some(reqId=>{
          const ref=currentTasks.find(t=>t.id===reqId);
          return !ref||!ref.checked;
        });
        if(unmet){
          alert('Bitte erfüllen Sie zuerst die erforderlichen Schritte.');
          renderList();
          return;
        }
      }
      task.checked=checked;
      if(!checked){
        // uncheck dependent tasks
        for(const other of currentTasks){
          if(other.requires?.includes(task.id) && other.checked){
            other.checked=false;
          }
        }
      }
      persistCurrent();
      renderList();
    }

    function removeTask(id){
      const idx=currentTasks.findIndex(t=>t.id===id);
      if(idx<0) return;
      const task=currentTasks[idx];
      if(!confirm(`Schritt "${task.label}" entfernen?`)) return;
      currentTasks.splice(idx,1);
      for(const other of currentTasks){
        if(Array.isArray(other.requires)){
          other.requires=other.requires.filter(req=>req!==id);
        }
      }
      ensureCertDependencies(currentTasks);
      persistCurrent();
      renderList();
    }

    function reorderTasks(order){
      if(!Array.isArray(order) || order.length!==currentTasks.length) return;
      const lookup=new Map(currentTasks.map(t=>[t.id,t]));
      const next=[];
      for(const id of order){
        const task=lookup.get(id);
        if(task) next.push(task);
      }
      currentTasks=next;
      ensureCertDependencies(currentTasks);
      persistCurrent();
      renderList();
    }

    function persistCurrent(){
      if(!data||!currentMeldung) return;
      data.meldungen[currentMeldung]={
        meldung:currentMeldung,
        partNumber:currentPart||'',
        tasks:currentTasks.map(ensureTaskShape),
        updatedAt:new Date().toISOString()
      };
      persistLocal(data);
      saveDebounced();
    }

    async function saveAll(){
      if(destroyed) return;
      if(dataFileHandle){
        await writeJSONFile(dataFileHandle,data);
        updateStatus(`Zuletzt gespeichert ${new Date().toLocaleTimeString()}`);
      }else{
        updateStatus('Zwischengespeichert (LocalStorage)');
      }
    }

    async function ensureHandles(){
      const [storedDataHandle,storedTemplateHandle]=await Promise.all([
        idbGet(DATA_HANDLE_KEY),
        idbGet(TEMPLATE_HANDLE_KEY)
      ]);
      if(storedDataHandle){
        dataFolderHandle=storedDataHandle;
        if(await requestPermission(dataFolderHandle,'readwrite')){
          dataFileHandle=await dataFolderHandle.getFileHandle(DATA_FILENAME,{create:true});
          const payload=await readFileAsJSON(dataFileHandle);
          if(payload){
            data=normaliseData(defaults,payload);
            persistLocal(data);
          }
        }else{
          await idbDel(DATA_HANDLE_KEY);
          dataFolderHandle=null;
          dataFileHandle=null;
        }
      }
      if(storedTemplateHandle){
        templateFolderHandle=storedTemplateHandle;
        if(await requestPermission(templateFolderHandle,'read')){
          await loadTemplatesFromFolder();
        }else{
          await idbDel(TEMPLATE_HANDLE_KEY);
          templateFolderHandle=null;
        }
      }
    }

    async function chooseDataFolder(){
      if(!window.showDirectoryPicker){
        alert('Ihr Browser unterstützt keine Ordnerauswahl.');
        return;
      }
      try{
        const handle=await window.showDirectoryPicker();
        if(!handle) return;
        const granted=await requestPermission(handle,'readwrite');
        if(!granted){alert('Keine Berechtigung für den gewählten Ordner.');return;}
        dataFolderHandle=handle;
        await idbSet(DATA_HANDLE_KEY,handle);
        dataFileHandle=await handle.getFileHandle(DATA_FILENAME,{create:true});
        const payload=await readFileAsJSON(dataFileHandle);
        if(payload){
          data=normaliseData(defaults,payload);
          persistLocal(data);
          ensureCurrentTasks();
        }
        await saveAll();
        updateStatus(`Datenordner: ${handle.name}`);
      }catch(err){console.warn('Checklist: chooseDataFolder',err);}
    }

    async function chooseTemplateFolder(){
      if(!window.showDirectoryPicker){
        alert('Ihr Browser unterstützt keine Ordnerauswahl.');
        return;
      }
      try{
        const handle=await window.showDirectoryPicker();
        if(!handle) return;
        const granted=await requestPermission(handle,'read');
        if(!granted){alert('Keine Berechtigung für den Ordner.');return;}
        templateFolderHandle=handle;
        await idbSet(TEMPLATE_HANDLE_KEY,handle);
        await loadTemplatesFromFolder();
        ensureCurrentTasks();
        renderList();
        updateStatus(`Templates: ${handle.name}`);
      }catch(err){console.warn('Checklist: chooseTemplateFolder',err);}
    }

    async function loadTemplatesFromFolder(){
      if(!templateFolderHandle) return;
      try{
        const fileHandle=await templateFolderHandle.getFileHandle(TEMPLATE_FILENAME,{create:false}).catch(()=>null);
        if(!fileHandle) return;
        const payload=await readFileAsJSON(fileHandle);
        if(payload && Array.isArray(payload.partSpecificSteps)){
          const baseList=Array.isArray(defaults?.partSpecificSteps)?defaults.partSpecificSteps.slice():[];
          const seen=new Set(baseList.map(entry=>`${entry.prefix||''}|${entry.label||''}`));
          const custom=[];
          for(const entry of payload.partSpecificSteps){
            if(!entry||typeof entry!=='object') continue;
            const prefix=(entry.prefix||'').toString();
            const label=(entry.label||'').toString();
            if(!prefix || !label) continue;
            const key=`${prefix}|${label}`;
            if(seen.has(key)) continue;
            seen.add(key);
            custom.push({
              prefix,
              label,
              requires:Array.isArray(entry.requires)?entry.requires.slice():[],
              id:entry.id||null
            });
          }
          data.partSpecificSteps=[...baseList.map(entry=>({
            prefix:(entry.prefix||'').toString(),
            label:(entry.label||'').toString(),
            requires:Array.isArray(entry.requires)?entry.requires.slice():[],
            id:entry.id||null
          })),...custom];
          data.templateMeta={fileName:TEMPLATE_FILENAME,folderName:templateFolderHandle.name,lastLoaded:new Date().toISOString(),count:data.partSpecificSteps.length};
          persistLocal(data);
        }
      }catch(err){console.warn('Checklist: loadTemplatesFromFolder',err);}
    }

    async function resetLocalData(){
      if(!confirm('Lokale Checklisten-Daten zurücksetzen?')) return;
      const stored=await loadBaseData();
      defaults=stored;
      data=normaliseData(defaults,null);
      persistLocal(data);
      ensureCurrentTasks();
      renderList();
      updateStatus('Zurückgesetzt');
      await saveAll();
    }

    function ensureCurrentTasks(){
      if(!data) return;
      if(!currentMeldung){
        currentTasks=[];
        renderList();
        return;
      }
      const entry=data.meldungen[currentMeldung];
      const template=buildTasksForPart(data,currentPart);
      if(entry){
        const savedTasks=Array.isArray(entry.tasks)?entry.tasks:[];
        const storedPart=(entry.partNumber||'').trim();
        const currentTrim=(currentPart||'').trim();
        if(storedPart && storedPart!==currentTrim){
          const manual=savedTasks.filter(t=>t&&t.dynamic&&!t.prefix);
          currentTasks=mergeTemplateWithSaved(template,manual);
        }else{
          currentTasks=mergeTemplateWithSaved(template,savedTasks);
        }
      }else{
        currentTasks=template;
      }
      renderList();
    }

    function handleDocChange(){
      const raw=localStorage.getItem(LS_DOC_KEY);
      if(raw===lastDoc) return;
      lastDoc=raw;
      const doc=parseJSON(raw,{});
      const meld=(doc?.general?.Meldung||'').trim();
      const part=(doc?.general?.PartNo||doc?.general?.Part||doc?.general?.PN||'').trim();
      const changedMeld=meld!==currentMeldung;
      const changedPart=part!==currentPart;
      if(!meld){
        currentMeldung='';
        currentPart=part||'';
        updateHeader();
        currentTasks=[];
        renderList();
        return;
      }
      currentMeldung=meld;
      currentPart=part;
      updateHeader();
      if(changedMeld || changedPart){
        ensureCurrentTasks();
      }
    }

    function createMenu(){
      if(menu) return;
      menu=document.createElement('div');
      menu.className='cl-menu';
      menu.innerHTML=`
        <button class="mi mi-data">📁 Datenordner wählen</button>
        <button class="mi mi-template">🧩 Template-Ordner wählen</button>
        <button class="mi mi-reload">🔄 Daten neu laden</button>
        <button class="mi mi-reset">🗑️ Lokal zurücksetzen</button>
        <div class="mi noclick mi-hint"></div>
      `;
      document.body.appendChild(menu);
      const hint=menu.querySelector('.mi-hint');
      const updateHint=()=>{
        const dataName=dataFolderHandle?`Ordner: ${dataFolderHandle.name}`:'Kein Datenordner';
        const tplName=templateFolderHandle?`Templates: ${templateFolderHandle.name}`:'Keine Templates';
        hint.textContent=`${dataName} · ${tplName}`;
      };
      menu.addEventListener('click',ev=>{
        const target=ev.target.closest('.mi');
        if(!target || target.classList.contains('noclick')) return;
        menu.classList.remove('open');
        if(target.classList.contains('mi-data')) chooseDataFolder();
        if(target.classList.contains('mi-template')) chooseTemplateFolder();
        if(target.classList.contains('mi-reload')) reloadFromHandles();
        if(target.classList.contains('mi-reset')) resetLocalData();
      });
      const openMenu=ev=>{
        if(!root.contains(ev.target)) return;
        ev.preventDefault();
        const rect=menu.getBoundingClientRect();
        const pad=8;
        const w=rect.width||220;
        const h=rect.height||200;
        menu.style.left=clamp(ev.clientX,pad,window.innerWidth-w-pad)+'px';
        menu.style.top=clamp(ev.clientY,pad,window.innerHeight-h-pad)+'px';
        updateHint();
        menu.classList.add('open');
      };
      const closeMenu=()=>menu.classList.remove('open');
      document.addEventListener('contextmenu',openMenu);
      window.addEventListener('click',closeMenu);
      const keyListener=e=>{if(e.key==='Escape') closeMenu();};
      window.addEventListener('keydown',keyListener);
      const mo=new MutationObserver(()=>{
        if(!document.body.contains(root)){
          destroyed=true;
          if(menu){menu.remove();menu=null;}
          document.removeEventListener('contextmenu',openMenu);
          window.removeEventListener('click',closeMenu);
          window.removeEventListener('keydown',keyListener);
          if(watcher) clearInterval(watcher);
          window.removeEventListener(STORAGE_EVENT,handleDocChange);
          mo.disconnect();
        }
      });
      mo.observe(document.body,{childList:true,subtree:true});
    }

    async function reloadFromHandles(){
      try{
        if(dataFileHandle){
          const payload=await readFileAsJSON(dataFileHandle);
          if(payload){
            data=normaliseData(defaults,payload);
            persistLocal(data);
            ensureCurrentTasks();
            renderList();
          }
        }
        if(templateFolderHandle){
          await loadTemplatesFromFolder();
          ensureCurrentTasks();
        }
        updateStatus('Daten neu geladen');
      }catch(err){console.warn('Checklist: reloadFromHandles',err);}
    }

    async function init(){
      defaults=await loadBaseData();
      data=normaliseData(defaults,loadStoredData());
      await ensureHandles();
      ensureCurrentTasks();
      updateHeader();
      renderList();
      createMenu();
      handleDocChange();
      lastDoc=localStorage.getItem(LS_DOC_KEY);
      watcher=setInterval(()=>{if(destroyed){clearInterval(watcher);return;} handleDocChange();},WATCH_INTERVAL);
      window.addEventListener(STORAGE_EVENT,handleDocChange);
    }

    init();
  };
})();
