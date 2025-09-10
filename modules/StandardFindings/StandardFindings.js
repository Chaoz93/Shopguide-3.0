/* Standard Findings module
   - Load finding/action pairs from Excel/CSV
   - Multi-selection, outputs with single newline
   - Context menu with color options and persistent file handle
*/
(function(){
  // ----- helpers for config + handles -----
  const LS_DOC='sfDoc';
  const IDB_NAME='modulesApp';
  const IDB_STORE='fs-handles';
  const parse=(s,fb)=>{try{return JSON.parse(s)||fb;}catch{return fb;}};
  const loadDoc=()=>parse(localStorage.getItem(LS_DOC),{__meta:{v:1},instances:{}});
  const saveDoc=doc=>{doc.__meta={v:1,updatedAt:new Date().toISOString()};localStorage.setItem(LS_DOC,JSON.stringify(doc));};
  const instanceIdOf=root=>root.closest('.grid-stack-item')?.dataset?.instanceId||('inst-'+Math.random().toString(36).slice(2));
  const getCfg=id=>loadDoc().instances[id]||null;
  const saveCfg=(id,cfg)=>{const doc=loadDoc();doc.instances[id]=cfg;saveDoc(doc);};
  const removeCfg=id=>{const doc=loadDoc();delete doc.instances[id];saveDoc(doc);};

  function idbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open(IDB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(IDB_STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
  async function idbSet(k,v){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function idbGet(k){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readonly');const rq=tx.objectStore(IDB_STORE).get(k);rq.onsuccess=()=>res(rq.result||null);rq.onerror=()=>rej(rq.error);});}
  async function idbDel(k){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).delete(k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function ensureRWPermission(h){if(!h?.queryPermission)return true;const p=await h.queryPermission({mode:'readwrite'});if(p==='granted')return true;const r=await h.requestPermission({mode:'readwrite'});return r==='granted';}

  window.renderStandardFindings=function(root){
    const instanceId=instanceIdOf(root);
    let cfg=getCfg(instanceId)||{};
    cfg.colors=cfg.colors||{bg:'#f5f7fb',item:'#ffffff',title:'#2563eb',sub:'#4b5563'};
    cfg.fileName=cfg.fileName||'';
    cfg.idbKey=cfg.idbKey||('sf-file-'+instanceId);
    saveCfg(instanceId,cfg);

    let fileHandle=null;
    let items=[];
    let selectsEl,findOut,actionOut,copyFind,copyAction;
    const els={};

    // ----- inject styles -----
    if(!document.getElementById('sf-styles')){
      const css=`
      .sf-root{height:100%;display:flex;flex-direction:column;
        --sf-bg:#f5f7fb;--sf-item-bg:#ffffff;--sf-title:#2563eb;--sf-sub:#4b5563;}
      .sf-surface{flex:1;overflow:auto;background:var(--sf-bg);border-radius:1rem;padding:.75rem;
        display:flex;flex-direction:column;gap:.75rem;}
      .sf-selects select{width:100%;padding:.25rem;border-radius:.4rem;background:var(--sf-item-bg);color:#111;}
      .sf-output textarea{width:100%;min-height:4rem;padding:.4rem;border-radius:.4rem;background:var(--sf-item-bg);color:#111;}
      .sf-copy{margin-top:.25rem;background:var(--sf-title);color:#fff;padding:.25rem .6rem;border-radius:.4rem;}
      .sf-menu{position:fixed;z-index:1000;display:none;min-width:160px;padding:.25rem;
        background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);
        border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);}
      .sf-menu.open{display:block;}
      .sf-menu .mi{display:block;width:100%;padding:.5rem .75rem;text-align:left;border-radius:.4rem;}
      .sf-menu .mi:hover{background:rgba(0,0,0,.06);}
      .sf-modal{position:fixed;inset:0;display:none;place-items:center;background:rgba(0,0,0,.35);z-index:1000;}
      .sf-modal.open{display:grid;}
      .sf-panel{background:#fff;color:#111827;width:min(92vw,360px);border-radius:.9rem;padding:1rem;
        box-shadow:0 10px 30px rgba(0,0,0,.25);}
      .sf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;margin-top:.75rem;}
      .sf-color{width:100%;height:2.25rem;border:1px solid #e5e7eb;border-radius:.5rem;}
      .sf-row{margin-top:.75rem;display:flex;gap:.5rem;align-items:center;justify-content:flex-end;}
      .sf-file{flex:1;font-size:.85rem;opacity:.85;}
      .sf-btn{background:var(--sf-title);color:#fff;padding:.35rem .6rem;border-radius:.5rem;}
      .sf-btn.secondary{background:rgba(0,0,0,.1);color:#111;}
      `;
      const tag=document.createElement('style');tag.id='sf-styles';tag.textContent=css;document.head.appendChild(tag);
    }

    // ----- build UI -----
    root.innerHTML=`
      <div class="sf-root">
        <div class="sf-surface">
          <div class="sf-selects" id="sf-selects"></div>
          <div class="sf-output">
            <textarea id="sf-find" class="text-black"></textarea>
            <button id="sf-copy-find" class="sf-copy">📋 Finding kopieren</button>
          </div>
          <div class="sf-output">
            <textarea id="sf-action" class="text-black"></textarea>
            <button id="sf-copy-action" class="sf-copy">📋 Action kopieren</button>
          </div>
        </div>
        <div class="sf-modal" id="sf-modal">
          <div class="sf-panel">
            <div><button class="sf-btn sf-pick">Excel wählen</button><span class="sf-file"></span></div>
            <div class="sf-grid">
              <label>BG<input type="color" class="sf-color sf-c-bg"></label>
              <label>Item<input type="color" class="sf-color sf-c-item"></label>
              <label>Titel<input type="color" class="sf-color sf-c-title"></label>
              <label>Text<input type="color" class="sf-color sf-c-sub"></label>
            </div>
            <div class="sf-row">
              <button class="sf-btn sf-save">Speichern</button>
              <button class="sf-btn secondary sf-close">Schließen</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const rootEl=root.querySelector('.sf-root');
    selectsEl=root.querySelector('#sf-selects');
    findOut=root.querySelector('#sf-find');
    actionOut=root.querySelector('#sf-action');
    copyFind=root.querySelector('#sf-copy-find');
    copyAction=root.querySelector('#sf-copy-action');

    els.modal=root.querySelector('#sf-modal');
    els.cBg=els.modal.querySelector('.sf-c-bg');
    els.cItem=els.modal.querySelector('.sf-c-item');
    els.cTitle=els.modal.querySelector('.sf-c-title');
    els.cSub=els.modal.querySelector('.sf-c-sub');
    els.pick=els.modal.querySelector('.sf-pick');
    els.file=els.modal.querySelector('.sf-file');
    els.save=els.modal.querySelector('.sf-save');
    els.close=els.modal.querySelector('.sf-close');

    function applyColors(c){
      rootEl.style.setProperty('--sf-bg',c.bg);
      rootEl.style.setProperty('--sf-item-bg',c.item);
      rootEl.style.setProperty('--sf-title',c.title);
      rootEl.style.setProperty('--sf-sub',c.sub);
    }
    applyColors(cfg.colors);

    function openModal(){
      els.cBg.value=cfg.colors.bg;
      els.cItem.value=cfg.colors.item;
      els.cTitle.value=cfg.colors.title;
      els.cSub.value=cfg.colors.sub;
      els.file.textContent=cfg.fileName?`• ${cfg.fileName}`:'';
      els.modal.classList.add('open');
    }
    function closeModal(){els.modal.classList.remove('open');}
    els.close.onclick=closeModal;
    els.save.onclick=()=>{cfg.colors={bg:els.cBg.value,item:els.cItem.value,title:els.cTitle.value,sub:els.cSub.value};applyColors(cfg.colors);saveCfg(instanceId,cfg);closeModal();};

    async function bindHandle(h){
      if(!h) return;
      if(!(await ensureRWPermission(h))) return;
      fileHandle=h;
      cfg.fileName=h.name||'';
      saveCfg(instanceId,cfg);
      await idbSet(cfg.idbKey,h);
      await readFromHandle(h);
      els.file.textContent=cfg.fileName?`• ${cfg.fileName}`:'';
    }
    els.pick.onclick=async()=>{try{const [h]=await window.showOpenFilePicker({types:[{description:'Excel oder CSV',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx','.xlsm'],'application/vnd.ms-excel.sheet.macroEnabled.12':['.xlsm'],'text/csv':['.csv']}}]});await bindHandle(h);}catch(e){}};

    // ----- context menu -----
    const menu=document.createElement('div');
    menu.className='sf-menu';
    menu.innerHTML='<button class="mi mi-opt">⚙️ Optionen</button>';
    document.body.appendChild(menu);
    function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
    root.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();const rect=menu.getBoundingClientRect();const pad=8;const vw=innerWidth,vh=innerHeight;const w=rect.width||160,h=rect.height||44;menu.style.left=clamp(e.clientX,pad,vw-w-pad)+'px';menu.style.top=clamp(e.clientY,pad,vh-h-pad)+'px';menu.classList.add('open');});
    menu.querySelector('.mi-opt').addEventListener('click',()=>{menu.classList.remove('open');openModal();});
    addEventListener('click',()=>menu.classList.remove('open'));
    addEventListener('keydown',e=>{if(e.key==='Escape')menu.classList.remove('open');});

    // ----- data parsing -----
    function parseCSV(text){
      const lines=text.split(/\r?\n/).filter(Boolean);
      const delim=text.includes(';')?';':(text.includes('\t')?'\t':',');
      const rows=lines.map(l=>l.split(delim));
      items=rows.slice(1).map(r=>({label:(r[1]||'').trim(),finding:(r[2]||'').trim(),action:(r[3]||'').trim()})).filter(r=>r.label);
      renderSelects();
    }
    async function loadXLSX(){if(typeof XLSX==='undefined'){await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});}}
    async function readFromHandle(h){
      try{
        const f=await h.getFile();
        const buf=await f.arrayBuffer();
        if(f.name.toLowerCase().endsWith('.csv')){
          parseCSV(new TextDecoder().decode(buf));
        }else{
          await loadXLSX();
          const wb=XLSX.read(buf,{type:'array'});
          const ws=wb.Sheets[wb.SheetNames[0]];
          const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
          items=rows.slice(1).map(r=>({label:String(r[1]||'').trim(),finding:String(r[2]||'').trim(),action:String(r[3]||'').trim()})).filter(r=>r.label);
          renderSelects();
        }
      }catch(e){console.warn('Datei konnte nicht geladen werden',e);}
    }

    function escapeHtml(str){const map={"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"};return str.replace(/[&<>\"']/g,m=>map[m]);}
    function updateOutputs(){
      const ids=Array.from(selectsEl.querySelectorAll('select')).map(s=>parseInt(s.value,10)).filter(n=>!isNaN(n));
      const finds=ids.map(i=>items[i].finding).filter(Boolean);
      const acts=ids.map(i=>items[i].action).filter(Boolean);
      findOut.value=finds.join('\n');
      actionOut.value=acts.join('\n');
    }
    function addSelect(){
      const used=Array.from(selectsEl.querySelectorAll('select')).map(s=>parseInt(s.value,10)).filter(n=>!isNaN(n));
      const remaining=items.filter((_,i)=>!used.includes(i));
      if(!remaining.length) return;
      const sel=document.createElement('select');
      sel.innerHTML='<option value="">-- Auswahl --</option>'+items.map((it,i)=>used.includes(i)?'':`<option value="${i}">${escapeHtml(it.label)}</option>`).join('');
      sel.onchange=()=>{let next=sel.nextSibling;while(next){next.remove();next=sel.nextSibling;} if(sel.value!=='') addSelect(); updateOutputs();};
      selectsEl.appendChild(sel);
    }
    function renderSelects(){
      if(!items.length){
        selectsEl.innerHTML='<div class="p-2 text-sm opacity-80 text-center">Rechtsklick → Optionen<br>Spalten: B=Auswahl, C=Finding, D=Action</div>';
        updateOutputs();
        return;
      }
      selectsEl.innerHTML='';
      addSelect();
      updateOutputs();
    }

    copyFind.onclick=()=>{navigator.clipboard.writeText(findOut.value||'').then(()=>{copyFind.textContent='✅';setTimeout(()=>copyFind.textContent='📋 Finding kopieren',1000);}).catch(()=>{});};
    copyAction.onclick=()=>{navigator.clipboard.writeText(actionOut.value||'').then(()=>{copyAction.textContent='✅';setTimeout(()=>copyAction.textContent='📋 Action kopieren',1000);}).catch(()=>{});};

    // initial render
    renderSelects();

    // restore file handle
    (async()=>{try{const h=await idbGet(cfg.idbKey);if(h&&await ensureRWPermission(h)){fileHandle=h;cfg.fileName=h.name||'';saveCfg(instanceId,cfg);await readFromHandle(h);els.file.textContent=cfg.fileName?`• ${cfg.fileName}`:'';}}catch(e){}})();

    // cleanup
    const mo=new MutationObserver(()=>{if(!document.body.contains(root)){menu.remove();els.modal?.remove();(async()=>{try{await idbDel(cfg.idbKey);}catch{};try{removeCfg(instanceId);}catch{};})();mo.disconnect();}});
    mo.observe(document.body,{childList:true,subtree:true});
  };
})();

