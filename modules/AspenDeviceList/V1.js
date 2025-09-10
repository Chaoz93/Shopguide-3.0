(function(){
  const CSS = `
    .db-root{height:100%;display:flex;flex-direction:column;}
    .db-titlebar{font-weight:600;color:var(--text-color);padding:0 .15rem;user-select:none;}
    .db-surface{flex:1;background:var(--dl-bg,#f5f7fb);border-radius:1rem;padding:.75rem;overflow:auto;}
    .db-list{display:flex;flex-direction:column;gap:.65rem;min-height:1.5rem;}
    .db-card{background:var(--dl-item-bg,#fff);color:var(--dl-sub,#4b5563);border-radius:.8rem;padding:.65rem .75rem;box-shadow:0 2px 6px rgba(0,0,0,.06);display:flex;align-items:center;gap:.75rem;user-select:none;}
    .db-flex{flex:1;display:flex;flex-direction:column;}
    .db-title{color:var(--dl-title,#2563eb);font-weight:600;line-height:1.1;}
    .db-sub{color:var(--dl-sub,#4b5563);font-size:.85rem;margin-top:.15rem;}
    .db-handle{margin-left:.5rem;flex:0 0 auto;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:.45rem;background:rgba(0,0,0,.06);cursor:grab;color:inherit;}
    .db-handle:active{cursor:grabbing;}
    .db-ghost{opacity:.4;}
    .db-chosen{transform:scale(1.01);}
    .db-menu{position:fixed;z-index:1000;display:none;min-width:200px;padding:.25rem;background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);}
    .db-menu.open{display:block;}
    .db-menu .mi{display:block;width:100%;padding:.5rem .75rem;text-align:left;border-radius:.4rem;cursor:pointer;}
    .db-menu .mi:hover{background:rgba(0,0,0,.06);}
    .db-part-list{max-height:240px;overflow:auto;padding:.25rem .5rem;display:flex;flex-direction:column;gap:.25rem;}
    .db-check{display:flex;align-items:center;gap:.4rem;font-size:.85rem;}
    .db-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:1000;}
    .db-modal.open{display:flex;}
    .db-panel{background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);padding:1rem;border-radius:.75rem;min-width:260px;box-shadow:0 10px 24px rgba(0,0,0,.18);}
    .db-panel .row{margin-bottom:.75rem;}
    .db-panel label{display:block;font-size:.85rem;margin-bottom:.25rem;}
    .db-panel input[type=text],.db-panel select{width:100%;padding:.35rem .5rem;border:1px solid var(--border-color,#e5e7eb);border-radius:.4rem;background:transparent;color:inherit;}
    .db-panel .actions{display:flex;gap:.5rem;justify-content:flex-end;}
  `;
  if(!document.getElementById('db-styles')){
    const tag=document.createElement('style');
    tag.id='db-styles';
    tag.textContent=CSS;
    document.head.appendChild(tag);
  }

  async function ensureXLSX(){
    if(window.XLSX) return;
    if(window.__XLSX_LOAD_PROMISE__) return window.__XLSX_LOAD_PROMISE__;
    const urls=[
      'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
      'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js',
      'https://unpkg.com/xlsx@0.20.2/dist/xlsx.full.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.2/xlsx.full.min.js'
    ];
    window.__XLSX_LOAD_PROMISE__=(async()=>{
      let last;for(const url of urls){try{await new Promise((ok,err)=>{const s=document.createElement('script');s.src=url;s.async=true;s.onload=ok;s.onerror=()=>err(new Error('load '+url));document.head.appendChild(s);});if(window.XLSX)return;}catch(e){last=e;}}
      throw last||new Error('XLSX load failed');
    })();
    return window.__XLSX_LOAD_PROMISE__;
  }

  async function ensureSortable(){
    if(window.Sortable) return;
    if(window.__SORTABLE_LOAD_PROMISE__) return window.__SORTABLE_LOAD_PROMISE__;
    const urls=[
      'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js'
    ];
    window.__SORTABLE_LOAD_PROMISE__=(async()=>{
      let last;for(const url of urls){
        try{
          await new Promise((ok,err)=>{const s=document.createElement('script');s.src=url;s.async=true;s.onload=ok;s.onerror=()=>err(new Error('load '+url));document.head.appendChild(s);});
          if(window.Sortable)return;
        }catch(e){last=e;}
      }
      throw last||new Error('Sortable load failed');
    })();
    return window.__SORTABLE_LOAD_PROMISE__;
  }

  const GROUP_NAME='deviceBoardGroup';

  window.renderAspenDeviceList=async function(targetDiv,opts){
    const root=document.createElement('div');
    root.className='db-root';
    const title=opts.moduleJson?.settings?.title||'';
    root.innerHTML=`${title?`<div class="db-titlebar">${title}</div>`:''}<div class="db-surface"><div class="db-list"></div></div><div class="db-modal"><div class="db-panel"><div class="row"><label>Titel (optional)<input type="text" class="db-title-input"></label></div><div class="row"><label>Titel-Feld<select class="db-sel-title"></select></label></div><div class="row"><label>Untertitel-Feld<select class="db-sel-sub"></select></label></div><div class="actions"><button class="db-save">Speichern</button><button class="db-close">Schließen</button></div></div></div>`;
    targetDiv.appendChild(root);
    const list=root.querySelector('.db-list');

    const modal=root.querySelector('.db-modal');
    const titleInput=root.querySelector('.db-title-input');
    const selTitle=root.querySelector('.db-sel-title');
    const selSub=root.querySelector('.db-sel-sub');
    const saveBtn=root.querySelector('.db-save');
    const closeBtn=root.querySelector('.db-close');

    const menu=document.createElement('div');
    menu.className='db-menu';
    menu.innerHTML='<div class="mi mi-opt">⚙️ Optionen</div><div class="mi mi-pick">Excel-Datei wählen</div><div class="mi mi-disable">Alle deaktivieren</div><div class="db-part-list"></div>';
    document.body.appendChild(menu);

    let fields=[];
    let partField='part';
    let config={titleField:'part',subField:'name',title:title};
    let items=[]; // {id, part, data:{}}
    let excluded=new Set();

    function populateFieldSelects(){
      selTitle.innerHTML=fields.map(f=>`<option value="${f}" ${f===config.titleField?'selected':''}>${f}</option>`).join('');
      selSub.innerHTML=fields.map(f=>`<option value="${f}" ${f===config.subField?'selected':''}>${f}</option>`).join('');
    }

    function render(){
      const shown=items.filter(it=>!excluded.has(it.part));
      if(!shown.length){list.innerHTML='<div style="opacity:.6;">Keine Geräte</div>';return;}
      list.innerHTML=shown.map(it=>{
        const t=it.data[config.titleField]||'';
        const s=it.data[config.subField]||'';
        return `
        <div class="db-card" data-id="${it.id}" data-meldung="${it.part}">
          <div class="db-flex">
            <div class="db-title">${t}</div>
            <div class="db-sub">${s}</div>
          </div>
          <div class="db-handle" title="Ziehen">⋮⋮</div>
        </div>`;
      }).join('');
    }

    function syncFromDOM(){
      items=Array.from(list.querySelectorAll('.db-card')).map(el=>{
        const id=el.dataset.id||('it-'+Math.random().toString(36).slice(2));
        const part=el.dataset.meldung||'';
        const data={};
        data[partField]=part;
        data[config.titleField]=el.querySelector('.db-title')?.textContent||'';
        data[config.subField]=el.querySelector('.db-sub')?.textContent||'';
        return {id,part,data};
      });
    }

    function refreshMenu(){
      const partList=menu.querySelector('.db-part-list');
      const parts=Array.from(new Set(items.map(it=>it.part))).sort();
      partList.innerHTML=parts.map(p=>`<label class="db-check"><input type="checkbox" data-part="${p}" ${excluded.has(p)?'':'checked'}> ${p}</label>`).join('');
      partList.querySelectorAll('input').forEach(inp=>{
        inp.addEventListener('change',()=>{
          const p=inp.dataset.part;
          if(inp.checked)excluded.delete(p);else excluded.add(p);
          render();
        });
      });
    }

    async function pick(){
      closeMenu();
      try{
        const [handle]=await showOpenFilePicker({types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],multiple:false});
        if(!handle)return;
        await ensureXLSX();
        const f=await handle.getFile();
        const buf=await f.arrayBuffer();
        const wb=XLSX.read(buf,{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
        fields=Object.keys(rows[0]||{});
        partField=fields.find(h=>h.toLowerCase().includes('part'))||fields[0]||'part';
        if(!fields.includes(config.titleField)) config.titleField=partField;
        if(!fields.includes(config.subField)) config.subField=fields.find(f=>f!==partField)||partField;
        items=rows.filter(r=>String(r[partField]).trim()!=='').map(r=>({id:'it-'+Math.random().toString(36).slice(2),part:String(r[partField]),data:r}));
        excluded.clear();
        populateFieldSelects();
        render();
        refreshMenu();
      }catch(e){console.error(e);}
    }

    function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
    function openMenu(x,y){
      refreshMenu();
      const pad=8;
      const vw=window.innerWidth,vh=window.innerHeight;
      const rect=menu.getBoundingClientRect();
      menu.style.left=clamp(x,pad,vw-rect.width-pad)+'px';
      menu.style.top=clamp(y,pad,vh-rect.height-pad)+'px';
      menu.classList.add('open');
    }
    function closeMenu(){menu.classList.remove('open');}

    root.addEventListener('contextmenu',e=>{e.preventDefault();openMenu(e.clientX,e.clientY);});
    document.addEventListener('click',e=>{if(!menu.contains(e.target))closeMenu();});
    menu.querySelector('.mi-pick').addEventListener('click',pick);
    menu.querySelector('.mi-disable').addEventListener('click',()=>{
      excluded=new Set(items.map(it=>it.part));
      render();
      refreshMenu();
    });
    menu.querySelector('.mi-opt').addEventListener('click',openOptions);

    function openOptions(){
      closeMenu();
      titleInput.value=config.title;
      populateFieldSelects();
      modal.classList.add('open');
    }
    function closeOptions(){modal.classList.remove('open');}
    saveBtn.addEventListener('click',()=>{
      config.title=titleInput.value.trim();
      config.titleField=selTitle.value;
      config.subField=selSub.value;
      const tb=root.querySelector('.db-titlebar');
      if(config.title){
        if(tb)tb.textContent=config.title;else{
          const nb=document.createElement('div');nb.className='db-titlebar';nb.textContent=config.title;root.insertBefore(nb,root.firstChild);
        }
      }else if(tb){tb.remove();}
      render();
      refreshMenu();
      closeOptions();
    });
    closeBtn.addEventListener('click',closeOptions);

    const mo=new MutationObserver(()=>{if(!document.body.contains(root)){menu.remove();mo.disconnect();}});
    mo.observe(document.body,{childList:true,subtree:true});

    await ensureSortable();
    new Sortable(list,{
      group:{name:GROUP_NAME,pull:true,put:true},
      animation:150,
      handle:'.db-handle',
      draggable:'.db-card',
      ghostClass:'db-ghost',
      chosenClass:'db-chosen',
      onSort:()=>{syncFromDOM();render();refreshMenu();},
      onAdd:()=>{syncFromDOM();render();refreshMenu();},
      onRemove:()=>{syncFromDOM();render();refreshMenu();}
    });

    render();
  };
})();
