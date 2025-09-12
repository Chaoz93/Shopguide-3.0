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
      .az-row.clickable{cursor:pointer;}
      .az-row.clickable:hover{background:rgba(255,255,255,.2);}
      .az-menu{position:fixed;z-index:1000;display:none;min-width:150px;padding:.25rem;
        background:var(--sidebar-module-card-bg,#fff);color:var(--sidebar-module-card-text,#111);
        border:1px solid var(--border-color,#e5e7eb);border-radius:.5rem;box-shadow:0 10px 24px rgba(0,0,0,.18);}
      .az-menu.open{display:block;}
      .az-menu label{display:block;padding:.25rem .5rem;font-size:.875rem;}
      .az-menu input{width:100%;margin-top:.25rem;}
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
        <div class="az-row row-5 clickable"><span>Ohne Pause</span><span class="t5 font-semibold"></span></div>
        <div class="az-row row-615 clickable"><span>min 30min Pause</span><span class="t615 font-semibold"></span></div>
        <div class="az-row row-reg clickable"><span class="label"></span><span class="treg font-semibold"></span></div>
        <div class="az-row row-max clickable"><span>10h Arbeitszeit</span><span class="tmax font-semibold"></span></div>
      </div>
      <label class="block">
        <span class="opacity-90">Pause (min, optional)</span>
        <input type="number" class="pause w-full text-black p-1 rounded" />
      </label>
      <div class="pause-msg text-xs opacity-75">Standardpausen gemacht</div>
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
  const pauseInput = targetDiv.querySelector('.pause');
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
  let lastT5, lastT615, lastTreg, lastTmax;

  start.value = localStorage.getItem(START_KEY) || '';
  end.value = localStorage.getItem(END_KEY) || '';
  pauseInput.value = localStorage.getItem(PAUSE_KEY) || '';

  function toHHMM(hours){ const h=Math.floor(hours); const m=Math.round((hours-h)*60); return pad(h)+':'+pad(m); }
  function timeToHours(val){ const [h,m]=val.split(':').map(Number); return h + m/60; }
  function legalPause(mins){
    if(mins < 5*60) return 0;
    if(mins < 6*60+15) return 30;
    return 45;
  }
  function updateLabel(){
    const pauseMin = legalPause(regularHours*60);
    labelEl.textContent = pauseMin === 0 ? 'Ohne Pause' : `min ${pauseMin}min Pause`;
  }
  function updateDiffLabel(){ diffLabel.textContent = `Differenz zur Regelzeit (+${dressTime} min)`; }
  function updateVisibility(){
    const totalMin = regularHours * 60;
    t5Row.style.display = totalMin <= 300 ? 'none' : '';
    t615Row.style.display = totalMin <= 375 ? 'none' : '';
  }

  function parseTime(val){ const [h,m]=val.split(':').map(Number); const d=new Date(); d.setHours(h,m,0,0); return d; }
  function fmt(date){ return date.toTimeString().slice(0,5); }
  function addMin(date,mins){ return new Date(date.getTime()+mins*60000); }
  function updateColor(el,date){ if(date.getHours()>=20) el.classList.add('text-red-500'); else el.classList.remove('text-red-500'); }
  function pad(n){ return n.toString().padStart(2,'0'); }

  function renderTimes(){
    [t5El,t615El,tregEl,tmaxEl,diffEl].forEach(el=>{el.textContent='';el.classList.remove('text-red-500');});
    warnEl.textContent='';
    lastT5=lastT615=lastTreg=lastTmax=undefined;

    if(!start.value) return;
    const s=parseTime(start.value);

    lastT5=addMin(s,5*60); t5El.textContent=fmt(lastT5); updateColor(t5El,lastT5);
    lastT615=addMin(s,6*60+15+30); t615El.textContent=fmt(lastT615); updateColor(t615El,lastT615);
    lastTreg=addMin(s,regularHours*60+legalPause(regularHours*60)); tregEl.textContent=fmt(lastTreg); updateColor(tregEl,lastTreg);
    lastTmax=addMin(s,10*60+legalPause(10*60)); tmaxEl.textContent=fmt(lastTmax); updateColor(tmaxEl,lastTmax);

    if(end.value){
      const e=parseTime(end.value);
      const totalMin = (e - s)/60000;
      const autoPause = legalPause(totalMin);
      const userPause = pauseInput.value ? parseInt(pauseInput.value,10) : 0;
      const pauseMin = userPause > autoPause ? userPause : autoPause;
      pauseMsg.textContent = userPause > autoPause
        ? `Manuelle Pause: ${pauseMin} min`
        : `Berechnete Pause: ${pauseMin} min`;
      const actualWork = totalMin - pauseMin;
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
