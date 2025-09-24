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
  const FILE_PATH_KEY = 'az-json-path'; // auto-save JSON
  let fileHandle = null;
  let jsonData = null;
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
      .az-control-row{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;}
      .az-control-row select{min-width:80px;}
      .az-pause-indicator{display:inline-flex;align-items:center;padding:.125rem .5rem;border-radius:.5rem;transition:background-color .2s,color .2s;margin-top:.25rem;}
      .az-pause-indicator.warn{background:rgba(250,204,21,.18);color:#facc15;}
      .az-pause-indicator.ok{background:rgba(34,197,94,.18);color:#4ade80;}
      .az-btn{background:rgba(255,255,255,.1);color:inherit;padding:.25rem .75rem;border-radius:.375rem;border:1px solid rgba(255,255,255,.25);cursor:pointer;font-size:.75rem;white-space:nowrap;}
      .az-btn:hover{background:rgba(255,255,255,.2);}
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
        <span class="opacity-90">Pause (min)</span>
        <div class="az-control-row mt-1">
          <select class="pause-select text-black p-1 rounded">
            <option value="">Auswahl</option>
            <option value="0">0</option>
            <option value="30">30</option>
            <option value="45">45</option>
            <option value="60">60</option>
          </select>
          <input type="number" class="pause flex-1 text-black p-1 rounded" min="0" step="5" placeholder="Minuten" />
          <button type="button" class="az-btn pause-plus">Pause +5</button>
        </div>
      </label>
      <div class="pause-msg text-xs opacity-75 az-pause-indicator">Standardpausen gemacht</div>
      <label class="block">
        <span class="opacity-90">Gehzeit</span>
        <div class="az-control-row mt-1">
          <input type="time" class="end flex-1 text-black p-1 rounded" />
          <button type="button" class="az-btn end-now">Feierabend jetzt setzen</button>
        </div>
      </label>
      <div class="az-row"><span class="diff-label"></span><span class="diff font-semibold"></span></div>
      <div class="warn text-red-500 text-xs"></div>
    </div>
  `;

  const start = targetDiv.querySelector('.start');
  const end = targetDiv.querySelector('.end');
  const pauseSelect = targetDiv.querySelector('.pause-select');
  const pauseInput = targetDiv.querySelector('.pause');
  const pauseMsg = targetDiv.querySelector('.pause-msg');
  const pausePlusBtn = targetDiv.querySelector('.pause-plus');
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
  const endNowBtn = targetDiv.querySelector('.end-now');
  let lastT5, lastT615, lastTreg, lastTmax;

  function toHHMM(hours){ const h=Math.floor(hours); const m=Math.round((hours-h)*60); return pad(h)+':'+pad(m); }
  function timeToHours(val){ const [h,m]=val.split(':').map(Number); return h + m/60; }
  function legalPause(workMins){
    if(workMins < 5*60) return 0;
    if(workMins < 6*60+15) return 30;
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

  function parseTime(val){
    if(!val || !val.includes(':')) return null;
    const [h,m]=val.split(':').map(Number);
    if(Number.isNaN(h) || Number.isNaN(m)) return null;
    const d=new Date();
    d.setHours(h,m,0,0);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  function fmt(date){ return date.toTimeString().slice(0,5); }
  function addMin(date,mins){ return new Date(date.getTime()+mins*60000); }
  function updateColor(el,date){ if(date.getHours()>=20) el.classList.add('text-red-500'); else el.classList.remove('text-red-500'); }
  function pad(n){ return n.toString().padStart(2,'0'); }

  const PAUSE_PRESETS = new Set(['0','30','45','60']);

  function syncSelectFromInput(){
    if(!pauseSelect) return;
    const val = pauseInput.value.trim();
    pauseSelect.value = PAUSE_PRESETS.has(val) ? val : '';
  }
  function parsePauseValue(val){
    if(!val && val !== 0) return null;
    const num = parseInt(val,10);
    if(Number.isNaN(num)) return null;
    return Math.max(0,num);
  }
  function updatePauseIndicator(minutes){
    pauseMsg.classList.remove('warn','ok');
    if(minutes === null || minutes === undefined) return;
    if(minutes < 30) pauseMsg.classList.add('warn');
    else if(minutes >= 45) pauseMsg.classList.add('ok');
  }
  function formatDiff(mins){
    const sign = mins >= 0 ? '+' : '-';
    const abs = Math.abs(mins);
    const hours = Math.floor(abs/60);
    const minutes = Math.abs(abs % 60);
    return sign + pad(hours) + ':' + pad(minutes);
  }
  function toDateKey(date){ return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate()); }
  function previousDateKey(date){ return toDateKey(new Date(date.getTime()-24*60*60*1000)); }
  function parseDateTime(key,timeStr){
    if(!key || !timeStr) return null;
    const [y,m,d] = key.split('-').map(Number);
    const [hh,mm] = timeStr.split(':').map(Number);
    if([y,m,d,hh,mm].some(n=>Number.isNaN(n))) return null;
    return new Date(y,m-1,d,hh,mm,0,0);
  }
  function currentDateKey(){ return toDateKey(new Date()); }

  async function readJsonFromHandle(handle){
    try{
      const file = await handle.getFile();
      const txt = await file.text();
      if(!txt) return {};
      const parsed = JSON.parse(txt);
      return typeof parsed==='object' && parsed!==null ? parsed : {};
    }catch(err){
      console.warn('readJsonFromHandle failed',err);
      return {};
    }
  }
  async function writeJsonToHandle(handle,data){
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data,null,2));
    await writable.close();
  }
  async function getJsonData(){
    if(jsonData) return jsonData;
    if(!fileHandle) return null;
    jsonData = await readJsonFromHandle(fileHandle);
    return jsonData;
  }
  async function appendRestWarning(warns,startDate){
    if(!fileHandle && !jsonData) return warns;
    const data = (await getJsonData()) || {};
    const prevKey = previousDateKey(startDate);
    const prevEntry = data?.[prevKey];
    if(!prevEntry || !prevEntry.ende) return warns;
    const prevEnd = parseDateTime(prevKey,prevEntry.ende);
    if(!prevEnd) return warns;
    const restMinutes = (startDate - prevEnd)/60000;
    if(restMinutes < 11*60 && !warns.includes('Ruhezeit <11h zum Vortag')) return [...warns,'Ruhezeit <11h zum Vortag'];
    return warns;
  }
  async function ensureFileHandle(){
    if(fileHandle) return fileHandle;
    const storedPath = localStorage.getItem(FILE_PATH_KEY);
    try{
      [fileHandle] = await window.showOpenFilePicker({
        multiple:false,
        mode:'readwrite',
        types:[{description:'JSON', accept:{'application/json':['.json']}}],
        suggestedName: storedPath || 'arbeitszeit.json'
      });
    }catch(openErr){
      try{
        fileHandle = await window.showSaveFilePicker({
          suggestedName: storedPath || 'arbeitszeit.json',
          types:[{description:'JSON', accept:{'application/json':['.json']}}]
        });
      }catch(saveErr){
        fileHandle = null;
      }
    }
    if(fileHandle){
      localStorage.setItem(FILE_PATH_KEY, fileHandle.name);
      jsonData = null;
    }
    return fileHandle;
  }

  async function renderTimes(){
    [t5El,t615El,tregEl,tmaxEl,diffEl].forEach(el=>{el.textContent='';el.classList.remove('text-red-500');});
    warnEl.textContent='';
    pauseMsg.textContent='Standardpausen gemacht';
    updatePauseIndicator(null);
    lastT5=lastT615=lastTreg=lastTmax=undefined;

    if(!start.value) return;
    const s=parseTime(start.value);
    if(!s) return;

    lastT5=addMin(s,5*60); t5El.textContent=fmt(lastT5); updateColor(t5El,lastT5);
    lastT615=addMin(s,6*60+15+30); t615El.textContent=fmt(lastT615); updateColor(t615El,lastT615);
    lastTreg=addMin(s,regularHours*60+legalPause(regularHours*60)); tregEl.textContent=fmt(lastTreg); updateColor(tregEl,lastTreg);
    lastTmax=addMin(s,10*60+legalPause(10*60)); tmaxEl.textContent=fmt(lastTmax); updateColor(tmaxEl,lastTmax);

    if(!end.value){
      const manualVal = pauseInput.value.trim();
      if(manualVal){
        const manualPause = parsePauseValue(manualVal) ?? 0;
        pauseMsg.textContent = `Manuelle Pause: ${manualPause} min`;
        updatePauseIndicator(manualPause);
      }
      return;
    }

    const e=parseTime(end.value);
    if(!e) return;
    const totalMin = Math.max(0,(e - s)/60000);
    const hasManualPause = pauseInput.value.trim() !== '';
    let userPause = hasManualPause ? parsePauseValue(pauseInput.value) : 0;
    if(userPause === null) userPause = 0;
    const workMins = Math.max(0,totalMin - (hasManualPause ? userPause : 0));
    const autoPause = legalPause(workMins);
    const pauseMin = hasManualPause ? userPause : autoPause;
    pauseMsg.textContent = hasManualPause
      ? `Manuelle Pause: ${pauseMin} min`
      : `Berechnete Pause: ${pauseMin} min`;
    updatePauseIndicator(pauseMin);
    const actualWork = Math.max(0,totalMin - pauseMin);
    const diffMin = Math.round(actualWork - regularHours*60 + dressTime);
    diffEl.textContent = formatDiff(diffMin);
    const warns=[];
    if(actualWork > 10*60) warns.push('>10h Arbeitszeit');
    if(e.getHours()>20 || (e.getHours()===20 && e.getMinutes()>0)) warns.push('Gehzeit nach 20:00');
    const finalWarns = await appendRestWarning(warns,s);
    warnEl.textContent = finalWarns.join(' · ');

    await autoSaveEntry();
  }

  function safeRender(){ renderTimes().catch(err=>console.warn('renderTimes failed',err)); }

  // auto-save JSON
  async function autoSaveEntry(){
    if(!start.value || !end.value) return;
    try{
      const handle = await ensureFileHandle();
      if(!handle) return;

      const s = parseTime(start.value);
      const e = parseTime(end.value);
      if(!s || !e) return;
      const totalMin = Math.max(0,(e - s)/60000);

      const hasManualPause = pauseInput.value.trim() !== '';
      let userPause = hasManualPause ? parsePauseValue(pauseInput.value) : 0;
      if(userPause === null) userPause = 0;
      const workMins = Math.max(0,totalMin - (hasManualPause ? userPause : 0));
      const autoPause = legalPause(workMins);
      const pauseMin = hasManualPause ? userPause : autoPause;

      const today = currentDateKey();
      const entry = {
        start: start.value,
        ende: end.value,
        pause: String(pauseMin),
        diff: diffEl.textContent,
        hinweis: warnEl.textContent.trim()
      };

      const existing = (await getJsonData()) || {};
      existing[today] = entry;
      jsonData = existing;
      await writeJsonToHandle(handle, existing);
      localStorage.setItem(FILE_PATH_KEY, handle.name);

      if(s){
        const currentWarns = warnEl.textContent ? warnEl.textContent.split(' · ').filter(Boolean) : [];
        const refreshed = await appendRestWarning(currentWarns, s);
        const text = refreshed.join(' · ');
        if(text !== warnEl.textContent) warnEl.textContent = text;
      }
    }catch(err){
      console.warn('autoSaveEntry failed',err);
    }
  }

  start.addEventListener('input',()=>safeRender());
  end.addEventListener('input',()=>safeRender());
  if(pauseInput){
    pauseInput.addEventListener('input',()=>{ syncSelectFromInput(); safeRender(); });
  }
  if(pauseSelect){
    pauseSelect.addEventListener('change',()=>{
      if(pauseSelect.value==='') pauseInput.value='';
      else pauseInput.value=pauseSelect.value;
      safeRender();
    });
  }
  if(pausePlusBtn){
    pausePlusBtn.addEventListener('click',()=>{
      const current=parsePauseValue(pauseInput.value);
      const next=(current ?? 0)+5;
      pauseInput.value=String(next);
      syncSelectFromInput();
      safeRender();
    });
  }
  if(endNowBtn){
    endNowBtn.addEventListener('click',()=>{
      end.value=fmt(new Date());
      safeRender();
    });
  }

  function pick(date){
    if(!date) return;
    const val=fmt(addMin(date,-5));
    end.value=val;
    safeRender();
  }
  t5Row.addEventListener('click',()=>pick(lastT5));
  t615Row.addEventListener('click',()=>pick(lastT615));
  tregRow.addEventListener('click',()=>pick(lastTreg));
  tmaxRow.addEventListener('click',()=>pick(lastTmax));

  updateLabel();
  updateDiffLabel();
  updateVisibility();
  syncSelectFromInput();
  safeRender();

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
      safeRender();
    }
  });

  dressInput.addEventListener('input',()=>{
    dressTime=parseInt(dressInput.value||'0',10);
    localStorage.setItem(DRESS_KEY,String(dressTime));
    updateDiffLabel();
    safeRender();
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
