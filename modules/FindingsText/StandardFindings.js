/* Standard Findings Module
 * - Displays list of findings from Excel
 * - Clicking an item appends to global Findings text with single newline
 * - Right-click for Options: pick/create Excel, set colors
 * - Stores config per instance in localStorage; file handle in IndexedDB
 * - Requires: File System Access API + SheetJS (XLSX)
 */
(function(){
  // ----- helpers -----
  const LS_KEY='module_data_v1';
  const IDB_NAME='modulesApp';
  const IDB_STORE='fs-handles';

  function loadDoc(){ try{return JSON.parse(localStorage.getItem(LS_KEY))||{};}catch{return {};}}
  function saveDoc(d){ localStorage.setItem(LS_KEY,JSON.stringify(d)); }
  function getGeneral(name){ const d=loadDoc().general||{}; const v=d[name]; return typeof v==='string'?v:''; }
  function setGeneral(name,val){ const d=loadDoc(); d.general=d.general||{}; d.general[name]=val; saveDoc(d); }

  function instanceIdOf(root){ return root.closest('.grid-stack-item')?.dataset?.instanceId || ('inst-'+Math.random().toString(36).slice(2)); }
  function getCfg(id){ const d=loadDoc(); d.instances=d.instances||{}; return d.instances[id]; }
  function saveCfg(id,cfg){ const d=loadDoc(); d.instances=d.instances||{}; d.instances[id]=cfg; saveDoc(d); }
  function removeCfg(id){ const d=loadDoc(); if(d.instances){ delete d.instances[id]; saveDoc(d);} }

  function idb(){ return new Promise((res,rej)=>{ const open=indexedDB.open(IDB_NAME,1); open.onupgradeneeded=()=>{ open.result.createObjectStore(IDB_STORE); }; open.onsuccess=()=>res(open.result); open.onerror=()=>rej(open.error); });}
  async function idbGet(key){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE); const store=tx.objectStore(IDB_STORE); const req=store.get(key); req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); }); }
  async function idbSet(key,val){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,'readwrite'); const store=tx.objectStore(IDB_STORE); const req=store.put(val,key); req.onsuccess=()=>res(); req.onerror=()=>rej(req.error); }); }
  async function idbDel(key){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,'readwrite'); const store=tx.objectStore(IDB_STORE); const req=store.delete(key); req.onsuccess=()=>res(); req.onerror=()=>rej(req.error); }); }
  async function ensureRWPermission(handle){ const opts={mode:'readwrite'}; if((await handle.queryPermission(opts))==='granted')return true; if((await handle.requestPermission(opts))==='granted')return true; return false; }

  async function readItemsFromHandle(h){
    const file=await h.getFile();
    const ab=await file.arrayBuffer();
    const wb=XLSX.read(ab,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1});
    const out=[];
    for(let i=1;i<rows.length;i++){
      const txt=(rows[i][0]||'').toString().trim();
      if(txt) out.push({id:'it-'+Math.random().toString(36).slice(2), text:txt});
    }
    return out;
  }
  async function writeItemsToHandle(h,items){
    const data=[['text'], ...items.map(it=>[it.text])];
    const ws=XLSX.utils.aoa_to_sheet(data);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'records');
    const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    const w=await h.createWritable();
    await w.write(out); await w.close();
  }

  // ----- build UI -----
  function buildUI(root){
    root.innerHTML = `
      <div class="sf-root" style="height:100%;display:flex;flex-direction:column;gap:.6rem;--sf-bg:#f5f7fb;--sf-item-bg:#ffffff;--sf-text:#111827">
        <textarea class="sf-output" style="flex:1;background:var(--sf-bg);color:var(--sf-text);border:1px solid var(--module-border-color);border-radius:.5rem;padding:.5rem;"></textarea>
        <div class="sf-list" style="display:flex;flex-wrap:wrap;gap:.5rem;"></div>
      </div>
      <div class="sf-menu ops-menu" style="position:fixed;z-index:1000;display:none;min-width:180px;padding:.25rem;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);">
        <button class="mi mi-opt" style="display:block;width:100%;padding:.5rem .75rem;text-align:left;border-radius:.4rem;background:transparent;">Options</button>
      </div>
      <div class="sf-modal" style="position:fixed;inset:0;display:none;place-items:center;background:rgba(0,0,0,.35);z-index:1050;">
        <div class="sf-dialog" style="background:#fff;color:#111827;width:min(92vw,720px);border-radius:.9rem;padding:1rem;box-shadow:0 10px 30px rgba(0,0,0,.25);">
          <div class="sf-grid" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem;">
            <div class="sf-field"><label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem;">Hintergrund</label><input type="color" class="cBg sf-color" style="width:100%;height:2.25rem;border:1px solid #e5e7eb;border-radius:.5rem;"></div>
            <div class="sf-field"><label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem;">Item</label><input type="color" class="cItem sf-color" style="width:100%;height:2.25rem;border:1px solid #e5e7eb;border-radius:.5rem;"></div>
            <div class="sf-field"><label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem;">Text</label><input type="color" class="cText sf-color" style="width:100%;height:2.25rem;border:1px solid #e5e7eb;border-radius:.5rem;"></div>
          </div>
          <div class="sf-row" style="display:flex;gap:.5rem;align-items:center;margin-top:1rem;">
            <button class="sf-btn pick" style="background:var(--button-bg);color:var(--button-text);padding:.35rem .6rem;border-radius:.5rem;font-size:.9rem;">Excel wählen</button>
            <button class="sf-btn create secondary" style="background:#eee;color:#111;padding:.35rem .6rem;border-radius:.5rem;font-size:.9rem;">Neu</button>
            <span class="sf-file" style="font-size:.9rem;opacity:.85;margin-left:.5rem;"></span>
          </div>
          <div class="sf-row" style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem;">
            <button class="sf-btn save" style="background:var(--button-bg);color:var(--button-text);padding:.35rem .6rem;border-radius:.5rem;font-size:.9rem;">Speichern</button>
            <button class="sf-btn close secondary" style="background:#eee;color:#111;padding:.35rem .6rem;border-radius:.5rem;font-size:.9rem;">Schließen</button>
          </div>
        </div>
      </div>
    `;
    return {
      rootVars: root.querySelector('.sf-root'),
      output: root.querySelector('.sf-output'),
      list: root.querySelector('.sf-list'),
      menu: root.querySelector('.sf-menu'),
      modal: root.querySelector('.sf-modal'),
      cBg: root.querySelector('.cBg'),
      cItem: root.querySelector('.cItem'),
      cText: root.querySelector('.cText'),
      pick: root.querySelector('.pick'),
      create: root.querySelector('.create'),
      fLabel: root.querySelector('.sf-file'),
      save: root.querySelector('.save'),
      close: root.querySelector('.close')
    };
  }

  // ----- main render -----
  window.renderStandardFindings = function(root, ctx){
    if(!('showOpenFilePicker' in window)){
      root.innerHTML='<div class="p-2 text-sm">Dieses Modul benötigt die File System Access API (Chromium).</div>';
      return;
    }
    const els=buildUI(root);
    const instanceId=instanceIdOf(root);
    let cfg=getCfg(instanceId)||{};
    cfg.colors=cfg.colors||{bg:'#f5f7fb',item:'#ffffff',text:'#111827'};
    cfg.idbKey=cfg.idbKey||('sf-'+instanceId);
    cfg.fileName=cfg.fileName||'';
    let fileHandle=null;
    let items=[];

    function applyColors(c){
      els.rootVars.style.setProperty('--sf-bg',c.bg);
      els.rootVars.style.setProperty('--sf-item-bg',c.item);
      els.rootVars.style.setProperty('--sf-text',c.text);
    }
    applyColors(cfg.colors);

    function renderList(){
      els.list.innerHTML='';
      items.forEach(it=>{
        const div=document.createElement('div');
        div.className='sf-item';
        div.textContent=it.text;
        div.style.cssText='background:var(--sf-item-bg);color:var(--sf-text);padding:.4rem .6rem;border-radius:.5rem;cursor:pointer;';
        div.addEventListener('click',()=>{
          const cur=getGeneral('FindingsText');
          const next=cur?cur+'\n'+it.text:it.text;
          setGeneral('FindingsText',next);
          els.output.value=next;
        });
        els.list.appendChild(div);
      });
    }

    // modal handlers
    function openModal(){
      els.modal.classList.add('open');
      els.cBg.value=cfg.colors.bg;
      els.cItem.value=cfg.colors.item;
      els.cText.value=cfg.colors.text;
      els.fLabel.textContent=cfg.fileName?('• '+cfg.fileName):'';
    }
    function closeModal(){ els.modal.classList.remove('open'); }

    els.save.addEventListener('click',()=>{
      cfg.colors={bg:els.cBg.value,item:els.cItem.value,text:els.cText.value};
      applyColors(cfg.colors);
      saveCfg(instanceId,cfg);
      closeModal();
    });
    els.close.addEventListener('click',closeModal);

    // file pick/create
    els.pick.addEventListener('click',pickExcel);
    els.create.addEventListener('click',createExcel);

    async function pickExcel(){
      try{
        const [h]=await window.showOpenFilePicker({
          types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}]
        });
        if(!h) return;
        if(await ensureRWPermission(h)){
          fileHandle=h;
          cfg.fileName=h.name;
          saveCfg(instanceId,cfg);
          await idbSet(cfg.idbKey,h);
          items=await readItemsFromHandle(h);
          renderList();
          els.fLabel.textContent='• '+(cfg.fileName||h.name);
        }
      }catch(e){ console.warn('pickExcel',e); }
    }

    async function createExcel(){
      try{
        const h=await window.showSaveFilePicker({
          suggestedName:'findings.xlsx',
          types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}]
        });
        if(await ensureRWPermission(h)){
          fileHandle=h;
          cfg.fileName=h.name;
          saveCfg(instanceId,cfg);
          await idbSet(cfg.idbKey,h);
          items=[];
          await writeItemsToHandle(h,items);
          renderList();
          els.fLabel.textContent='• '+(cfg.fileName||h.name);
        }
      }catch(e){ console.warn('createExcel',e); }
    }

    // context menu
    function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
    root.addEventListener('contextmenu',e=>{
      e.preventDefault(); e.stopPropagation();
      const m=els.menu;
      const pad=8; const vw=window.innerWidth,vh=window.innerHeight;
      const w=200,h=44;
      m.style.left=clamp(e.clientX,pad,vw-w-pad)+'px';
      m.style.top=clamp(e.clientY,pad,vh-h-pad)+'px';
      m.style.display='block';
    });
    els.menu.querySelector('.mi-opt').addEventListener('click',()=>{els.menu.style.display='none';openModal();});
    window.addEventListener('click',()=>els.menu.style.display='none');
    window.addEventListener('keydown',e=>{if(e.key==='Escape')els.menu.style.display='none';});

    // restore previous handle + items
    (async()=>{
      try{
        const h=await idbGet(cfg.idbKey);
        if(h && await ensureRWPermission(h)){
          fileHandle=h;
          items=await readItemsFromHandle(h);
          renderList();
          els.fLabel.textContent='• '+(cfg.fileName||h.name);
        }
      }catch(e){ console.warn('restore',e); }
    })();

    // cleanup
    const mo=new MutationObserver(()=>{
      if(!document.body.contains(root)){
        els.menu?.remove();
        (async()=>{try{await idbDel(cfg.idbKey);}catch{};try{removeCfg(instanceId);}catch{};})();
        mo.disconnect();
      }
    });
    mo.observe(document.body,{childList:true,subtree:true});
  };
})();
