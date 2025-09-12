window.renderArbeitszeit = function(targetDiv, ctx = {}) {
  const settings = ctx.moduleJson?.settings || {};
  const regularHours = Number(settings.regularHours ?? 7.5); // 7.5 or 8 hours of work
  const regularLabel = regularHours === 8 ? '8:00' : '7:30';

  targetDiv.innerHTML = `
    <div class="p-2 space-y-2 text-white text-sm">
      <label class="block">
        <span class="opacity-90">Einstempelzeit</span>
        <input type="time" class="start w-full text-black p-1 rounded" />
      </label>
      <div class="space-y-1">
        <div>Ohne Pause (5h): <span class="t5 font-semibold"></span></div>
        <div>Nach 6:15&nbsp;+&nbsp;30 min Pause: <span class="t615 font-semibold"></span></div>
        <div>Regelzeit (${regularLabel} + 45 min Pause): <span class="treg font-semibold"></span></div>
        <div>Max. 10h + 45 min Pause: <span class="tmax font-semibold"></span></div>
      </div>
      <label class="block">
        <span class="opacity-90">Gehzeit</span>
        <input type="time" class="end w-full text-black p-1 rounded" />
      </label>
      <div>Differenz zur Regelzeit (+2 min): <span class="diff font-semibold"></span></div>
      <div class="warn text-red-500 text-xs"></div>
    </div>
  `;

  const start = targetDiv.querySelector('.start');
  const end = targetDiv.querySelector('.end');
  const t5El = targetDiv.querySelector('.t5');
  const t615El = targetDiv.querySelector('.t615');
  const tregEl = targetDiv.querySelector('.treg');
  const tmaxEl = targetDiv.querySelector('.tmax');
  const diffEl = targetDiv.querySelector('.diff');
  const warnEl = targetDiv.querySelector('.warn');

  function parseTime(val) {
    const [h, m] = val.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }
  function fmt(date) {
    return date.toTimeString().slice(0,5);
  }
  function addMin(date, mins) {
    return new Date(date.getTime() + mins * 60000);
  }
  function updateColor(el, date) {
    if (date.getHours() >= 20) {
      el.classList.add('text-red-500');
    } else {
      el.classList.remove('text-red-500');
    }
  }
  function pad(n){
    return n.toString().padStart(2, '0');
  }

  function renderTimes() {
    [t5El, t615El, tregEl, tmaxEl, diffEl].forEach(el => { el.textContent=''; el.classList.remove('text-red-500'); });
    warnEl.textContent = '';
    if (!start.value) return;
    const s = parseTime(start.value);

    const t5 = addMin(s, 5 * 60);
    t5El.textContent = fmt(t5);
    updateColor(t5El, t5);

    const t615 = addMin(s, 6 * 60 + 15 + 30); // 6h15 work + 30min pause
    t615El.textContent = fmt(t615);
    updateColor(t615El, t615);

    const treg = addMin(s, regularHours * 60 + 45);
    tregEl.textContent = fmt(treg);
    updateColor(tregEl, treg);

    const tmax = addMin(s, 10 * 60 + 45);
    tmaxEl.textContent = fmt(tmax);
    updateColor(tmaxEl, tmax);

    if (end.value) {
      const e = parseTime(end.value);
      const expected = treg;
      const diffMin = Math.round((e - expected) / 60000) + 2;
      const sign = diffMin >= 0 ? '+' : '-';
      const abs = Math.abs(diffMin);
      diffEl.textContent = sign + pad(Math.floor(abs/60)) + ':' + pad(abs%60);
      if (e.getHours() >= 20) {
        warnEl.textContent = '⚠️ Gehzeit nach 20:00';
      }
    }
  }

  start.addEventListener('input', renderTimes);
  end.addEventListener('input', renderTimes);
};
