// Arbeitszeit Modul – berechnet mögliche Gehzeiten und erlaubt die Wahl der Regelarbeitszeit über ein Kontextmenü
window.renderArbeitszeit = function(targetDiv, ctx = {}) {
  const settings = ctx.moduleJson?.settings || {};

  // ---- helper & persistence ----
  function instanceIdOf(root){
    return root.closest('.grid-stack-item')?.dataset?.instanceId || 'inst-' + Math.random().toString(36).slice(2);
  }
  const inst = instanceIdOf(targetDiv);
  const LS_KEY = 'az-reg-' + inst;
  const DRESS_KEY = 'az-dress-' + inst;

  const START_KEY = 'az-start-' + inst;
  const END_KEY = 'az-end-' + inst;
  const PAUSE_KEY = 'az-pause-' + inst;

  let regularHours = Number(localStorage.getItem(LS_KEY) || settings.regularHours || 7.5);
  let dressTime = Number(localStorage.getItem(DRESS_KEY) || settings.dressTime || 2);

  if(!document.getElementById('az-styles')){
    const css = `
      .az-row{display:flex;justify-content:space-between;padding:.25rem .5rem;background:rgba(255,255,255,.1);border-radius:.25rem;}
 codex/add-time-tracking-module-with-alerts
      .az-row.clickable{cursor:pointer;}
      .az-row.clickable:hover{background:rgba(255,255,255,.2);}

      .az-menu{position:fixed;z-index:1000;display:none;min-width:150px;padding:.25rem;
        background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);
        border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);}
      .az-menu.open{display:block;}

      .az-menu .mi{display:block;width:100%;padding:.5rem .75rem;text-align:left;border-radius:.4rem;}
      .az-menu .mi:hover{background:rgba(0,0,0,.06);}
    `;
    const tag=document.createElement('style');
    tag.id='az-styles';
    tag.textContent=css;
    document.head.appendChild(tag);
  }

  // ---- UI ----
  targetDiv.innerHTML = `
    <div class="p-2 space-y-3 text-white text-sm">
      <label class="block">
        <span class="opacity-90">Einstempelzeit</span>
        <input type="time" class="start w-full text-black p-1 rounded" />
      </label>
      <div class="space-y-1 times">


        <div class="az-row row-5"><span>Ohne Pause (5h)</span><span class="t5 font-semibold"></span></div>
        <div class="az-row row-615"><span>Nach 6:15&nbsp;+&nbsp;30 min Pause</span><span class="t615 font-semibold"></span></div>
        <div class="az-row row-reg"><span class="label"></span><span class="treg font-semibold"></span></div>
        <div class="az-row row-max"><span>Max. 10h&nbsp;+&nbsp;45 min Pause</span><span class="tmax font-semibold"></span></div>
      </div>
      <label class="block">
        <span class="opacity-90">Pausen (min, optional)</span>
        <input type="number" class="pause w-full text-black p-1 rounded" />
      </label>
      <div class="pause-msg text-xs opacity-75"></div>
      <label class="block">
        <span class="opacity-90">Gehzeit</span>
        <input type="time" class="end w-full text-black p-1 rounded" />
      </label>
      <div class="az-row"><span class="diff-label"></span><span class="diff font-semibold"></span></div>
      <div class="warn text-red-500 text-xs"></div>
    </div>
  `;

  const start = targetDiv.querySelector('.start');
  const end = targetDiv.querySelector('.end');

  const pause = targetDiv.querySelector('.pause');
  const pauseMsg = targetDiv.querySelector('.pause-msg');
  const t5Row = targetDiv.querySelector('.row-5');
  const t615Row = targetDiv.querySelector('.row-615');
  const tregRow = targetDiv.querySelector('.row-reg');
  const t5El = targetDiv.querySelector('.t5');
  const t615El = targetDiv.querySelector('.t615');
  const tregEl = targetDiv.querySelector('.treg');
  const tmaxEl = targetDiv.querySelector('.tmax');
  const tmaxRow = targetDiv.querySelector('.row-max');

  const diffEl = targetDiv.querySelector('.diff');
  const warnEl = targetDiv.querySelector('.warn');
  const labelEl = tregRow.querySelector('.label');
  const diffLabel = targetDiv.querySelector('.diff-label');

  pauseMsg.textContent = 'Standardpausen gemacht';

  function regularLabel(){
    return regularHours===8?'8:00':regularHours===6.25?'6:15':regularHours===5?'5:00':'7:30';
  }
  function updateLabel(){ labelEl.textContent = `Regelzeit (${regularLabel()} + 45 min Pause)`; }
  function updateDiffLabel(){ diffLabel.textContent = `Differenz zur Regelzeit (+${dressTime} min)`; }
  function updateVisibility(){
    const hideEarly = regularHours <= 6.25;
    t5Row.style.display = hideEarly ? 'none' : '';
    t615Row.style.display = hideEarly ? 'none' : '';
  }

  function parseTime(val){ const [h,m]=val.split(':').map(Number); const d=new Date(); d.setHours(h,m,0,0); return d; }
  function fmt(date){ return date.toTimeString().slice(0,5); }
  function addMin(date,mins){ return new Date(date.getTime()+mins*60000); }
  function updateColor(el,date){ if(date.getHours()>=20) el.classList.add('text-red-500'); else el.classList.remove('text-red-500'); }
  function pad(n){ return n.toString().padStart(2,'0'); }

  function renderTimes(){
    [t5El,t615El,tregEl,tmaxEl,diffEl].forEach(el=>{el.textContent='';el.classList.remove('text-red-500');});
    warnEl.textContent='';

    if(!start.value) return;
    const s=parseTime(start.value);

    const t5=addMin(s,5*60); t5El.textContent=fmt(t5); updateColor(t5El,t5);
    const t615=addMin(s,6*60+15+30); t615El.textContent=fmt(t615); updateColor(t615El,t615);
    const treg=addMin(s,regularHours*60+45); tregEl.textContent=fmt(treg); updateColor(tregEl,treg);
    const tmax=addMin(s,10*60+45); tmaxEl.textContent=fmt(tmax); updateColor(tmaxEl,tmax);

    if(end.value){
      const e=parseTime(end.value);
      const pauseMin = pause.value ? parseInt(pause.value,10) : 45;
      pauseMsg.textContent = pause.value ? '' : 'Standardpausen gemacht';
      const actualWork = (e - s)/60000 - pauseMin;
      const diffMin = Math.round(actualWork - regularHours*60 + dressTime);
      const sign = diffMin>=0?'+':'-';
      const abs = Math.abs(diffMin);
      diffEl.textContent=sign+pad(Math.floor(abs/60))+':'+pad(abs%60);

      const warns=[];
      if(e.getHours()>=20) warns.push('Gehzeit nach 20:00');
      if(totalMin > 10*60+45) warns.push('über 10h Arbeitszeit');
      warnEl.textContent = warns.map(w=>'⚠️ '+w).join(' ');
    } else {
      if(pauseInput.value){
        pauseMsg.textContent = `Manuelle Pause: ${pauseInput.value} min`;
      } else {
        pauseMsg.textContent = 'Standardpausen gemacht';
      }
    }
  }

  function store(key,val){ if(val) localStorage.setItem(key,val); else localStorage.removeItem(key); }

  start.addEventListener('input',()=>{ store(START_KEY,start.value); renderTimes(); });
  end.addEventListener('input',()=>{ store(END_KEY,end.value); renderTimes(); });
  pauseInput.addEventListener('input',()=>{ store(PAUSE_KEY,pauseInput.value); renderTimes(); });

  function pick(date){
    if(!date) return;
    const val=fmt(addMin(date,-5));
    end.value=val;
    store(END_KEY,val);
    renderTimes();
  }
  t5Row.addEventListener('click',()=>pick(lastT5));
  t615Row.addEventListener('click',()=>pick(lastT615));
  tregRow.addEventListener('click',()=>pick(lastTreg));
  tmaxRow.addEventListener('click',()=>pick(lastTmax));


  updateLabel();
  updateDiffLabel();
  updateVisibility();

  renderTimes();

  // ---- context menu for configurable options ----
  const menu=document.createElement('div');
  menu.className='az-menu';
  menu.innerHTML=`<div>
    <label>Regelzeit<input type="time" class="reg text-black p-1 rounded" /></label>
    <label>Umziehzeit (min)<input type="number" class="dress text-black p-1 rounded" /></label>
  </div>`;
  document.body.appendChild(menu);
  const regInput = menu.querySelector('.reg');
  const dressInput = menu.querySelector('.dress');


  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function openMenu(e){
    e.preventDefault(); e.stopPropagation();
    const pad=8,vw=window.innerWidth,vh=window.innerHeight;const rect=menu.getBoundingClientRect();
    const w=rect.width||150,h=rect.height||44;
    menu.style.left=clamp(e.clientX,pad,vw-w-pad)+'px';
    menu.style.top=clamp(e.clientY,pad,vh-h-pad)+'px';

    regInput.value=toHHMM(regularHours);
    dressInput.value=String(dressTime);
    menu.classList.add('open');
  }
  targetDiv.addEventListener('contextmenu',openMenu);
  menu.addEventListener('click',e=>e.stopPropagation());
  menu.addEventListener('contextmenu',e=>e.stopPropagation());
  window.addEventListener('click',e=>{if(!menu.contains(e.target))menu.classList.remove('open');});
  window.addEventListener('contextmenu',e=>{if(!menu.contains(e.target))menu.classList.remove('open');});
  window.addEventListener('keydown',e=>{if(e.key==='Escape')menu.classList.remove('open');});

  regInput.addEventListener('input',()=>{
    if(regInput.value){
      regularHours=timeToHours(regInput.value);
      localStorage.setItem(LS_KEY,String(regularHours));
      updateLabel();
      updateVisibility();
      renderTimes();
    }
  });

  dressInput.addEventListener('input',()=>{
    dressTime=parseInt(dressInput.value||'0',10);
    localStorage.setItem(DRESS_KEY,String(dressTime));
    updateDiffLabel();
    renderTimes();
  });


  // cleanup when element removed
  const mo=new MutationObserver(()=>{
    if(!document.body.contains(targetDiv)){
      menu.remove();
      mo.disconnect();
    }
  });
  mo.observe(document.body,{childList:true,subtree:true});
};

