// Module to convert standard findings to standard text from Excel/CSV with context menu and multi-selection
(function(){
  window.renderStandardFindings = function(root){
    let items = [];
    let selectsEl, findOut, actionOut, copyFind, copyAction, headEl;

    const LS_KEY='module_data_v1';
    const WATCH_INTERVAL=300;

    const getPart=()=>{
      try{
        const doc=JSON.parse(localStorage.getItem(LS_KEY)||'{}');
        const g=doc.general||{};
        return (g.PartNo||g.part||'').trim();
      }catch{return '';}  
    };
    const updateHead=()=>{if(headEl) headEl.textContent=getPart();};
    const storageHandler=e=>{if(e.key===LS_KEY) updateHead();};
    let lastDoc=localStorage.getItem(LS_KEY);
    const watcher=setInterval(()=>{const now=localStorage.getItem(LS_KEY);if(now!==lastDoc){lastDoc=now;updateHead();}},WATCH_INTERVAL);
    window.addEventListener('storage',storageHandler);

    // --- styles for context menu ---
    (function injectCSS(){
      const css = `
      .sf-menu{position:fixed;z-index:1000;display:none;min-width:160px;padding:.25rem;
        background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);
        border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);}
      .sf-menu.open{display:block}
      .sf-menu .mi{display:block;width:100%;padding:.5rem .75rem;text-align:left;border-radius:.4rem;background:transparent;}
      .sf-menu .mi:hover{background:rgba(0,0,0,.06)}
      `;
      let tag=document.getElementById('sf-menu-styles');
      if(!tag){ tag=document.createElement('style'); tag.id='sf-menu-styles'; document.head.appendChild(tag); }
      tag.textContent=css;
    })();

    // --- context menu ---
    const menu=document.createElement('div');
    menu.className='sf-menu';
    menu.innerHTML='<button class="mi mi-open">📂 Excel wählen</button>';
    document.body.appendChild(menu);
    root.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();const pad=8,vw=innerWidth,vh=innerHeight;const rect=menu.getBoundingClientRect();const w=rect.width||160,h=rect.height||44;menu.style.left=Math.min(Math.max(e.clientX,pad),vw-w-pad)+'px';menu.style.top=Math.min(Math.max(e.clientY,pad),vh-h-pad)+'px';menu.classList.add('open');});
    window.addEventListener('click',()=>menu.classList.remove('open'));
    window.addEventListener('keydown',e=>{if(e.key==='Escape')menu.classList.remove('open');});
    menu.querySelector('.mi-open').addEventListener('click',()=>{menu.classList.remove('open');pickFile();});
    const mo=new MutationObserver(()=>{
      if(!document.body.contains(root)){
        menu.remove();
        clearInterval(watcher);
        window.removeEventListener('storage',storageHandler);
        mo.disconnect();
      }
    });
    mo.observe(document.body,{childList:true,subtree:true});

    async function pickFile(){
      try{
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
        const file=await fh.getFile();
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
        render();
      }catch(e){console.warn('Datei konnte nicht geladen werden',e);}
    }

    async function loadDefault(){
      const candidates=['/Findings.xslx','/Findings.xlsx'];
      for(const url of candidates){
        try{
          const res=await fetch(url);
          if(!res.ok) continue;
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
          render();
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

    loadDefault();
    render();
  };
})();
