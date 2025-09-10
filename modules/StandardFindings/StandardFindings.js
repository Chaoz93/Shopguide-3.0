// Module to convert standard findings to standard text from Excel/CSV with context menu and multi-selection
(function(){
  window.renderStandardFindings = function(root){
    let items = [];
    let dict = [];
    let findName = '';
    let dictName = '';
    let selectsEl, findOut, actionOut, copyFind, copyAction, headEl;

    try{ items=JSON.parse(localStorage.getItem('sf-findings-data')||'[]'); }catch{}
    try{ dict=JSON.parse(localStorage.getItem('sf-dict-data')||'[]'); }catch{}
    try{ findName=localStorage.getItem('sf-findings-name')||''; }catch{}
    try{ dictName=localStorage.getItem('sf-dict-name')||''; }catch{}

    const LS_KEY='module_data_v1';
    const WATCH_INTERVAL=300;

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
    const updateHead=()=>{if(headEl) headEl.textContent=getPart()?`P/N: ${getPart()}`:'';};
    const storageHandler=e=>{if(e.key===LS_KEY) updateHead();};
    let lastDoc=localStorage.getItem(LS_KEY);
    const watcher=setInterval(()=>{const now=localStorage.getItem(LS_KEY);if(now!==lastDoc){lastDoc=now;updateHead();}},WATCH_INTERVAL);
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
      `;
      let tag=document.getElementById('sf-styles');
      if(!tag){tag=document.createElement('style');tag.id='sf-styles';document.head.appendChild(tag);} 
      tag.textContent=css;
    })();

    // --- context menu ---
    function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
    const menu=document.createElement('div');
    menu.className='db-menu';
    menu.innerHTML='<button class="mi mi-find">📂 Findings wählen</button><div class="mi mi-find-name noclick"></div><button class="mi mi-dict">📂 Dictionary wählen</button><div class="mi mi-dict-name noclick"></div>';
    document.body.appendChild(menu);

    const updateMenuLabels=()=>{
      const fnEl=menu.querySelector('.mi-find-name');
      const dnEl=menu.querySelector('.mi-dict-name');
      if(fnEl) fnEl.textContent=findName?`• ${findName}`:'';
      if(dnEl) dnEl.textContent=dictName?`• ${dictName}`:'';
    };
    updateMenuLabels();
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
    document.addEventListener('contextmenu',openMenu);
    window.addEventListener('click',()=>menu.classList.remove('open'));
    window.addEventListener('keydown',e=>{if(e.key==='Escape')menu.classList.remove('open');});
    menu.querySelector('.mi-find').addEventListener('click',()=>{menu.classList.remove('open');pickFindings();});
    menu.querySelector('.mi-dict').addEventListener('click',()=>{menu.classList.remove('open');pickDict();});
    const mo=new MutationObserver(()=>{
      if(!document.body.contains(root)){
        menu.remove();
        document.removeEventListener('contextmenu',openMenu);
        clearInterval(watcher);
        window.removeEventListener('storage',storageHandler);
        mo.disconnect();
      }
    });
    mo.observe(document.body,{childList:true,subtree:true});

    async function pickFindings(){
      try{
        if('showOpenFilePicker' in window){
          const [fh]=await window.showOpenFilePicker({
            types:[{
              description:'Excel oder CSV',
              accept:{
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx','.xls','.xlsm'],
                'application/vnd.ms-excel.sheet.macroEnabled.12':['.xlsm'],
                'text/csv':['.csv']
              }
            }]
          });
          const file=fh?await fh.getFile():null;
          if(file) await handleFindingsFile(file);
        }else{
          const inp=document.createElement('input');
          inp.type='file';
          inp.accept='.xlsx,.xls,.xlsm,.csv';
          inp.onchange=async()=>{
            const file=inp.files&&inp.files[0];
            if(file) await handleFindingsFile(file);
          };
          inp.click();
        }
      }catch(e){console.warn('Findings nicht geladen',e);}
    }

    async function pickDict(){
      try{
        if('showOpenFilePicker' in window){
          const [fh]=await window.showOpenFilePicker({
            types:[{
              description:'Excel oder CSV',
              accept:{
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx','.xls','.xlsm'],
                'application/vnd.ms-excel.sheet.macroEnabled.12':['.xlsm'],
                'text/csv':['.csv']
              }
            }]
          });
          const file=fh?await fh.getFile():null;
          if(file) await handleDictFile(file);
        }else{
          const inp=document.createElement('input');
          inp.type='file';
          inp.accept='.xlsx,.xls,.xlsm,.csv';
          inp.onchange=async()=>{
            const file=inp.files&&inp.files[0];
            if(file) await handleDictFile(file);
          };
          inp.click();
        }
      }catch(e){console.warn('Dictionary nicht geladen',e);}
    }

    async function handleFindingsFile(file){
      const buf=await file.arrayBuffer();
      if(file.name.toLowerCase().endsWith('.csv')){
        items=parseCSV(new TextDecoder().decode(buf));
      }else{
        if(typeof XLSX==='undefined') await loadXLSX();
        const wb=XLSX.read(buf,{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        items=rows.slice(1).map(r=>({
          label:String(r[1]||'').trim(),
          finding:String(r[2]||'').trim(),
          action:String(r[3]||'').trim()
        })).filter(r=>r.label);
      }
      findName=file.name||'';
      try{localStorage.setItem('sf-findings-data',JSON.stringify(items));}catch{}
      try{localStorage.setItem('sf-findings-name',findName);}catch{}
      updateMenuLabels();
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
      updateMenuLabels();
      updateHead();
    }

    async function loadDefault(){
      try{
        const res=await fetch('Findings.xlsx');
        if(!res.ok) return;
        const buf=await res.arrayBuffer();
        if(typeof XLSX==='undefined') await loadXLSX();
        const wb=XLSX.read(buf,{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        items=rows.slice(1).map(r=>({
          label:String(r[1]||'').trim(),
          finding:String(r[2]||'').trim(),
          action:String(r[3]||'').trim()
        })).filter(r=>r.label);
        findName='Findings.xlsx';
        try{localStorage.setItem('sf-findings-data',JSON.stringify(items));}catch{}
        try{localStorage.setItem('sf-findings-name',findName);}catch{}
        updateMenuLabels();
        render();
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
          updateMenuLabels();
          updateHead();
          return;
        }catch(e){/* try next */}
      }
    }

    function parseCSV(text){
      const lines=text.split(/\r?\n/).filter(Boolean);
      const delim=text.includes(';')?';':(text.includes('\t')?'\t':',');
      const rows=lines.map(line=>line.split(delim));
      return rows.slice(1).map(r=>({
        label:(r[1]||'').trim(),
        finding:(r[2]||'').trim(),
        action:(r[3]||'').trim()
      })).filter(r=>r.label);
    }

    function escapeHtml(str){
      const map={"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"};
      return str.replace(/[&<>\"']/g,m=>map[m]);
    }

    function loadXLSX(){
      return new Promise((resolve,reject)=>{
        const s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
      });
    }

    function updateOutputs(){
      const ids=Array.from(selectsEl.querySelectorAll('select')).map(s=>parseInt(s.value,10)).filter(n=>!isNaN(n));
      const finds=ids.map(i=>items[i].finding).filter(Boolean);
      const acts=ids.map(i=>items[i].action).filter(Boolean);
      findOut.value=finds.join('\n\n');
      actionOut.value=acts.join('\n\n');
    }

    function addSelect(){
      const used=Array.from(selectsEl.querySelectorAll('select')).map(s=>parseInt(s.value,10)).filter(n=>!isNaN(n));
      const remaining=items.filter((_,i)=>!used.includes(i));
      if(!remaining.length) return;
      const sel=document.createElement('select');
      sel.className='w-full p-1 rounded text-black';
      sel.innerHTML='<option value="">-- Auswahl --</option>'+
        items.map((it,i)=>used.includes(i)?'':`<option value="${i}">${escapeHtml(it.label)}</option>`).join('');
      sel.onchange=()=>{
        let next=sel.nextSibling; while(next){next.remove(); next=sel.nextSibling;}
        if(sel.value!=='') addSelect();
        updateOutputs();
      };
      selectsEl.appendChild(sel);
    }

    function render(){
      root.innerHTML=`<div class="p-2 space-y-2">
        <div id="sf-head" class="text-center font-bold"></div>
        ${!items.length?
          '<div class="text-sm opacity-80 text-center">Rechtsklick → Excel wählen<br>Spalten: B=Auswahl, C=Finding, D=Action</div>' :
          `<div id="sf-selects" class="space-y-2"></div>
          <div class="space-y-2">
            <div>
              <textarea id="sf-find" class="w-full h-24 p-1 rounded text-black"></textarea>
              <button id="sf-copy-find" class="mt-1 bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded">📋 Finding kopieren</button>
            </div>
            <div>
              <textarea id="sf-action" class="w-full h-24 p-1 rounded text-black"></textarea>
              <button id="sf-copy-action" class="mt-1 bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded">📋 Action kopieren</button>
            </div>
          </div>`}
      </div>`;

      headEl=root.querySelector('#sf-head');
      updateHead();
      if(!items.length) return;

      selectsEl=root.querySelector('#sf-selects');
      findOut=root.querySelector('#sf-find');
      actionOut=root.querySelector('#sf-action');
      copyFind=root.querySelector('#sf-copy-find');
      copyAction=root.querySelector('#sf-copy-action');

      selectsEl.innerHTML='';
      addSelect();
      updateOutputs();

      copyFind.onclick=()=>{
        navigator.clipboard.writeText(findOut.value||'').then(()=>{
          copyFind.textContent='✅';
          setTimeout(()=>copyFind.textContent='📋 Finding kopieren',1000);
        }).catch(()=>{});
      };
      copyAction.onclick=()=>{
        navigator.clipboard.writeText(actionOut.value||'').then(()=>{
          copyAction.textContent='✅';
          setTimeout(()=>copyAction.textContent='📋 Action kopieren',1000);
        }).catch(()=>{});
      };
    }

    if(!dict.length) loadDefaultDict();
    if(!items.length) loadDefault();
    render();
  };
})();
