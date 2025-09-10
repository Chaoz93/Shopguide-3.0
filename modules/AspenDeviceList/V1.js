(function(){
  const CSS = `
    .adl-root{height:100%;display:flex;flex-direction:column;}
    .adl-list{flex:1;overflow:auto;display:flex;flex-direction:column;gap:.35rem;padding:.25rem;}
    .adl-item{padding:.4rem .6rem;border:1px solid var(--module-border-color,#d1d5db);border-radius:.4rem;background:var(--sidebar-module-card-bg,#fff);color:var(--text-color,#111);}
    .adl-menu{position:fixed;z-index:1000;display:none;min-width:200px;padding:.25rem;background:var(--sidebar-module-card-bg,#fff);color:var(--text-color,#111);border:1px solid var(--module-border-color,#d1d5db);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);}
    .adl-menu.open{display:block;}
    .adl-mi{display:block;width:100%;padding:.5rem .75rem;text-align:left;border-radius:.4rem;cursor:pointer;}
    .adl-mi:hover{background:rgba(0,0,0,.06);}
    .adl-part-list{max-height:240px;overflow:auto;padding:.25rem .5rem;display:flex;flex-direction:column;gap:.25rem;}
    .adl-check{display:flex;align-items:center;gap:.4rem;font-size:.85rem;}
  `;
  if(!document.getElementById('adl-styles')){
    const tag=document.createElement('style');
    tag.id='adl-styles';
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

  window.renderAspenDeviceList=function(targetDiv,opts){
    const root=document.createElement('div');
    root.className='adl-root';
    root.innerHTML='<div class="adl-list"></div>';
    targetDiv.appendChild(root);
    const list=root.querySelector('.adl-list');

    const menu=document.createElement('div');
    menu.className='adl-menu';
    menu.innerHTML='<div class="adl-mi adl-pick">Excel-Datei wählen</div><div class="adl-part-list"></div>';
    document.body.appendChild(menu);

    let items=[];
    let excluded=new Set();

    function render(){
      const shown=items.filter(it=>!excluded.has(it.part));
      if(!shown.length){list.innerHTML='<div style="opacity:.6;">Keine Geräte</div>';return;}
      list.innerHTML=shown.map(it=>`<div class="adl-item">${it.part}${it.name?` - ${it.name}`:''}</div>`).join('');
    }

    function refreshMenu(){
      const partList=menu.querySelector('.adl-part-list');
      const parts=Array.from(new Set(items.map(it=>it.part))).sort();
      partList.innerHTML=parts.map(p=>`<label class="adl-check"><input type="checkbox" data-part="${p}" ${excluded.has(p)?'':'checked'}> ${p}</label>`).join('');
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
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        const hdr=rows[0]||[];
        const idxPart=hdr.findIndex(h=>String(h).toLowerCase().includes('part'));
        const idxName=hdr.findIndex(h=>String(h).toLowerCase().includes('name'));
        items=rows.slice(1).filter(r=>r.length && r[idxPart]!==undefined && String(r[idxPart]).trim()!=='').map(r=>({part:String(r[idxPart]),name:idxName>=0?String(r[idxName]):''}));
        excluded.clear();
        refreshMenu();
        render();
      }catch(e){console.error(e);}
    }

    function openMenu(x,y){refreshMenu();menu.style.left=x+'px';menu.style.top=y+'px';menu.classList.add('open');}
    function closeMenu(){menu.classList.remove('open');}

    root.addEventListener('contextmenu',e=>{e.preventDefault();openMenu(e.clientX,e.clientY);});
    document.addEventListener('click',e=>{if(!menu.contains(e.target))closeMenu();});
    menu.querySelector('.adl-pick').addEventListener('click',pick);

    const mo=new MutationObserver(()=>{if(!document.body.contains(root)){menu.remove();mo.disconnect();}});
    mo.observe(document.body,{childList:true,subtree:true});

    render();
  };
})();
