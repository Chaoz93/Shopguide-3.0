(function(){
  const STYLE_ID = 'ares-statistics-styles';

  function ensureStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .ares-root{height:100%;width:100%;box-sizing:border-box;padding:1rem;display:flex;flex-direction:column;gap:.75rem;color:var(--ares-text,var(--module-layer-module-text,#f8fafc));}
      .ares-surface{flex:1;display:flex;flex-direction:column;gap:.65rem;padding:1rem;border-radius:1rem;background:var(--ares-surface,var(--module-layer-module-bg,#0f172a));border:1px solid var(--ares-border,var(--module-layer-module-border,rgba(255,255,255,0.24)));box-shadow:0 14px 34px rgba(0,0,0,.24);}
      .ares-actions{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;justify-content:space-between;}
      .ares-btn-row{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;}
      .ares-btn{border:1px solid var(--ares-header-border,var(--module-layer-header-border,var(--ares-border,#cbd5e1)));background:var(--ares-header,var(--module-layer-header-bg,rgba(255,255,255,.08)));color:var(--ares-header-text,var(--module-layer-header-text,var(--ares-text,#f8fafc)));border-radius:.65rem;padding:.45rem .9rem;font-weight:600;font-size:.92rem;cursor:pointer;transition:background-color .2s,transform .1s;box-shadow:0 10px 24px rgba(0,0,0,.12);display:inline-flex;align-items:center;gap:.4rem;}
      .ares-btn:hover{background:var(--ares-header-strong,rgba(255,255,255,.15));transform:translateY(-1px);}
      .ares-btn.secondary{background:transparent;color:var(--ares-header-text,var(--ares-text,#f8fafc));border-color:var(--ares-border,var(--module-layer-module-border,#cbd5e1));}
      .ares-file-input{display:none;}
      .ares-file-name{padding:.45rem .85rem;border-radius:.6rem;border:1px dashed var(--ares-border,var(--module-layer-module-border,rgba(255,255,255,.28)));background:rgba(255,255,255,.04);font-weight:600;opacity:.9;}
      .ares-chart-card{flex:1;min-height:360px;background:linear-gradient(145deg,rgba(255,255,255,.04),rgba(255,255,255,.02));border:1px solid var(--ares-border,var(--module-layer-module-border,rgba(255,255,255,.22)));border-radius:1rem;padding:.5rem;position:relative;box-shadow:0 10px 28px rgba(0,0,0,.2);}
      .ares-chart{width:100%;height:100%;border-radius:.9rem;overflow:hidden;}
      .ares-chart svg{width:100%;height:100%;display:block;}
      .ares-tooltip{position:absolute;pointer-events:none;z-index:5;min-width:150px;background:rgba(15,23,42,0.85);color:var(--ares-text,#f8fafc);border:1px solid var(--ares-border,var(--module-layer-module-border,rgba(255,255,255,.28)));border-radius:.65rem;padding:.55rem .7rem;backdrop-filter:blur(6px);box-shadow:0 12px 32px rgba(0,0,0,.35);font-size:.9rem;opacity:0;transform:translate(-50%,-120%);transition:opacity .12s ease, transform .12s ease;}
      .ares-tooltip.visible{opacity:1;transform:translate(-50%,-110%);}
      .ares-tooltip .label{opacity:.8;font-size:.85rem;}
      .ares-tooltip .value{font-weight:700;font-size:1.05rem;margin-top:.15rem;}
      .ares-error{color:var(--ares-negative,#ef4444);font-weight:600;}
      .ares-empty{padding:1rem;border-radius:.75rem;background:var(--ares-alt-surface,rgba(255,255,255,.04));border:1px dashed var(--ares-border,var(--module-layer-module-border,rgba(255,255,255,.22)));text-align:center;opacity:.85;}
    `;
    document.head.appendChild(style);
  }

  function readValue(styles, prop){
    return (styles?.getPropertyValue(prop) || '').trim();
  }

  function loadLayers(){
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const presets = ['Main','Alternative','Accent'];
    const appLayers = Array.isArray(window?.appSettings?.moduleColorLayers)
      ? window.appSettings.moduleColorLayers
      : [];
    const layers = [];

    const baseLayer = {
      moduleBg: readValue(styles, '--module-layer-module-bg') || readValue(styles, '--module-bg'),
      moduleText: readValue(styles, '--module-layer-module-text') || readValue(styles, '--text-color'),
      moduleBorder: readValue(styles, '--module-layer-module-border') || readValue(styles, '--module-border-color'),
      headerBg: readValue(styles, '--module-layer-header-bg') || readValue(styles, '--module-header-bg'),
      headerText: readValue(styles, '--module-layer-header-text') || readValue(styles, '--module-header-text'),
      headerBorder: readValue(styles, '--module-layer-header-border') || readValue(styles, '--module-header-border')
    };

    if(appLayers.length){
      appLayers.slice(0, presets.length).forEach((layer, idx) => {
        if(!layer) return;
        layers.push({
          name: (layer.name || presets[idx] || `Layer ${idx+1}`).trim(),
          module: {
            bg: (layer.moduleBg || '').trim() || baseLayer.moduleBg,
            text: (layer.moduleText || '').trim() || baseLayer.moduleText,
            border: (layer.moduleBorder || '').trim() || baseLayer.moduleBorder,
            headerBg: (layer.headerBg || '').trim() || baseLayer.headerBg,
            headerText: (layer.headerText || '').trim() || baseLayer.headerText,
            headerBorder: (layer.headerBorder || '').trim() || baseLayer.headerBorder
          }
        });
      });
    }

    if(!layers.length){
      for(let i=1;i<=presets.length;i+=1){
        const bg = readValue(styles, `--module-layer-${i}-module-bg`);
        const text = readValue(styles, `--module-layer-${i}-module-text`);
        const border = readValue(styles, `--module-layer-${i}-module-border`);
        const headerBg = readValue(styles, `--module-layer-${i}-header-bg`);
        const headerText = readValue(styles, `--module-layer-${i}-header-text`);
        const headerBorder = readValue(styles, `--module-layer-${i}-header-border`);
        if(bg || text || border || headerBg || headerText || headerBorder){
          layers.push({
            name: readValue(styles, `--module-layer-${i}-name`) || presets[i-1] || `Layer ${i}`,
            module: {
              bg: bg || baseLayer.moduleBg,
              text: text || baseLayer.moduleText,
              border: border || baseLayer.moduleBorder,
              headerBg: headerBg || baseLayer.headerBg,
              headerText: headerText || baseLayer.headerText,
              headerBorder: headerBorder || baseLayer.headerBorder
            }
          });
        }
      }
    }

    if(!layers.length){
      layers.push({
        name: presets[0],
        module: {
          bg: baseLayer.moduleBg,
          text: baseLayer.moduleText,
          border: baseLayer.moduleBorder,
          headerBg: baseLayer.headerBg,
          headerText: baseLayer.headerText,
          headerBorder: baseLayer.headerBorder
        }
      });
    }

    return layers;
  }

  function applyTheme(root){
    const layers = loadLayers();
    const main = layers[0] || {};
    const alt = layers[1] || layers[0] || {};
    const accent = layers[2] || layers[1] || layers[0] || {};

    const moduleBg = main.module?.bg || 'var(--module-layer-module-bg,#0f172a)';
    const moduleText = main.module?.text || 'var(--module-layer-module-text,#f8fafc)';
    const moduleBorder = main.module?.border || 'var(--module-layer-module-border,rgba(255,255,255,0.22))';

    root.style.setProperty('--ares-surface', moduleBg || 'var(--module-bg,#0f172a)');
    root.style.setProperty('--ares-text', moduleText || 'var(--text-color,#f8fafc)');
    root.style.setProperty('--ares-border', moduleBorder || 'var(--module-border-color,rgba(255,255,255,0.22))');
    root.style.setProperty('--ares-header', alt.module?.headerBg || alt.module?.bg || moduleBg || 'var(--module-bg,#0f172a)');
    root.style.setProperty('--ares-header-text', alt.module?.headerText || alt.module?.text || moduleText || 'var(--text-color,#f8fafc)');
    root.style.setProperty('--ares-header-border', alt.module?.headerBorder || alt.module?.border || moduleBorder || 'var(--module-border-color,rgba(255,255,255,0.22))');
    root.style.setProperty('--ares-alt-surface', alt.module?.bg || moduleBg || 'rgba(255,255,255,0.04)');
    root.style.setProperty('--ares-accent', accent.module?.bg || alt.module?.bg || moduleBg || 'var(--module-bg,#0f172a)');
    root.style.setProperty('--ares-positive', '#22c55e');
    root.style.setProperty('--ares-negative', '#ef4444');
  }

  function parseDecimal(value){
    const cleaned = (value || '').trim();
    if(!cleaned) return null;
    const negative = cleaned.endsWith('-');
    const normalized = cleaned.replace(/-/g,'').replace(',', '.');
    const parsed = parseFloat(normalized);
    if(Number.isNaN(parsed)) return null;
    return negative ? -parsed : parsed;
  }

  function parseReport(text){
    const lines = (text || '').split(/\r?\n/);
    let currentYear = null;
    let currentMonth = null;
    let currentDay = null;
    let buffer = [];
    const entries = [];

    function pushDay(){
      if(currentDay === null || !buffer.length || currentYear === null || currentMonth === null) return;
      const joined = buffer.join(' ');
      const matches = [...joined.matchAll(/(\d+,\d{2}-?)/g)];
      if(!matches.length) return;
      const last = matches[matches.length - 1][1];
      const total = parseDecimal(last);
      if(total === null) return;
      const date = new Date(currentYear, currentMonth - 1, currentDay);
      if(Number.isNaN(date.getTime())) return;
      entries.push({ date, total });
    }

    for(const raw of lines){
      const line = raw.trimEnd();
      const period = line.match(/Abrechnungsperiode:\s*\d+\s*vom\s*\d{2}\.(\d{2})\.(\d{4})/);
      if(period){
        pushDay();
        currentDay = null;
        buffer = [];
        currentMonth = Number(period[1]);
        currentYear = Number(period[2]);
      }

      const dayMatch = line.match(/^(Mo|Di|Mi|Do|Fr|Sa|So)\s+(\d{2})\b/);
      if(dayMatch){
        pushDay();
        currentDay = Number(dayMatch[2]);
        buffer = [line];
        continue;
      }

      if(currentDay !== null){
        if(line.trim()){
          buffer.push(line);
        }
      }
    }

    pushDay();
    entries.sort((a,b) => a.date - b.date);
    return entries;
  }

  function formatDate(date){
    if(!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  function buildChartPoints(entries, width, height){
    if(!entries.length) return { points: [], domain:[0,1], range:[0,1], padding:{ top:20,right:30,bottom:36,left:64 }, usableWidth: width, usableHeight: height };
    const padding = { top: 24, right: 30, bottom: 44, left: 70 };
    const usableWidth = Math.max(10, width - padding.left - padding.right);
    const usableHeight = Math.max(10, height - padding.top - padding.bottom);
    const start = entries[0].date.getTime();
    const end = entries[entries.length - 1].date.getTime();
    const span = Math.max(1, end - start);
    let min = Math.min(...entries.map(e => e.total));
    let max = Math.max(...entries.map(e => e.total));
    if(min > 0) min = 0;
    if(max < 0) max = 0;
    if(max === min){
      max += 1;
      min -= 1;
    }
    const range = max - min;

    const points = entries.map(entry => {
      const ratio = (entry.date.getTime() - start) / span;
      const x = padding.left + ratio * usableWidth;
      const yRatio = (entry.total - min) / range;
      const y = padding.top + (1 - yRatio) * usableHeight;
      return { x, y, total: entry.total, date: entry.date };
    });

    return { points, domain:[start,end], range:[min,max], padding, usableHeight, usableWidth };
  }

  function insertZeroCrossings(points){
    if(points.length < 2) return points;
    const withCrossings = [points[0]];
    for(let i=1;i<points.length;i+=1){
      const prev = withCrossings[withCrossings.length - 1];
      const curr = points[i];
      const prevSign = Math.sign(prev.total);
      const currSign = Math.sign(curr.total);
      if(prevSign !== 0 && currSign !== 0 && prevSign !== currSign){
        const delta = curr.total - prev.total;
        const ratio = delta === 0 ? 0 : (0 - prev.total) / delta;
        const x = prev.x + ratio * (curr.x - prev.x);
        const y = prev.y + ratio * (curr.y - prev.y);
        const time = prev.date.getTime() + ratio * (curr.date.getTime() - prev.date.getTime());
        withCrossings.push({ x, y, total: 0, date: new Date(time) });
      }
      withCrossings.push(curr);
    }
    return withCrossings;
  }

  function buildSegmentPaths(points){
    if(!points.length) return { positive:'', negative:'' };
    const posSegments = [];
    const negSegments = [];
    let current = [];
    let currentSign = null;

    const source = insertZeroCrossings(points);

    function commit(){
      if(!current.length) return;
      const path = current.map((p,idx) => `${idx===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      if(currentSign === 'pos') posSegments.push(path); else negSegments.push(path);
      current = [];
    }

    for(const point of source){
      const sign = point.total >= 0 ? 'pos' : 'neg';
      if(currentSign === null) currentSign = sign;
      if(sign !== currentSign){
        commit();
        currentSign = sign;
      }
      current.push(point);
    }
    commit();
    return {
      positive: posSegments.join(' '),
      negative: negSegments.join(' ')
    };
  }

  function buildMonthTicks(domain, padding, width){
    const [start,end] = domain;
    if(!start || !end || end <= start) return [];
    const firstDate = new Date(start);
    firstDate.setDate(1);
    firstDate.setHours(0,0,0,0);
    const lastDate = new Date(end);
    lastDate.setDate(1);
    lastDate.setHours(0,0,0,0);
    const ticks = [];
    const usableWidth = Math.max(10, width - padding.left - padding.right);
    for(let d = new Date(firstDate); d <= lastDate; d.setMonth(d.getMonth()+1)){
      const ratio = (d.getTime() - start) / (end - start || 1);
      ticks.push({
        x: padding.left + ratio * usableWidth,
        date: new Date(d)
      });
    }
    return ticks;
  }

  function renderChart(container, entries){
    const chart = container.querySelector('.ares-chart');
    const tooltip = container.querySelector('.ares-tooltip');
    if(!chart) return;
    const width = chart.clientWidth || 600;
    const height = chart.clientHeight || 360;
    const { points, range, padding } = buildChartPoints(entries, width, height);
    const { positive, negative } = buildSegmentPaths(points);

    const zeroY = (() => {
      if(!points.length) return height - padding.bottom;
      const min = range[0];
      const max = range[1];
      const span = max - min || 1;
      const usableHeight = height - padding.top - padding.bottom;
      const ratio = (0 - min) / span;
      return padding.top + (1 - ratio) * usableHeight;
    })();

    const monthTicks = (() => {
      if(!points.length) return [];
      const [start] = points;
      const last = points[points.length - 1];
      return buildMonthTicks([start.date.getTime(), last.date.getTime()], padding, width);
    })();

    const ticks = monthTicks.map(t => ({
      x: t.x,
      label: t.date.toLocaleDateString('de-DE', { month:'short', year:'2-digit' }),
      date: t.date
    }));

    chart.innerHTML = entries.length ? `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Zeitguthaben-Verlauf">
        <defs>
          <linearGradient id="ares-grid-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(255,255,255,.06)" />
            <stop offset="100%" stop-color="rgba(255,255,255,.02)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${width}" height="${height}" fill="url(#ares-grid-grad)" rx="12" />
        <line x1="${padding.left}" x2="${width - padding.right}" y1="${zeroY.toFixed(1)}" y2="${zeroY.toFixed(1)}" stroke="var(--ares-border,rgba(255,255,255,.32))" stroke-width="1.1" stroke-dasharray="4 3" />
        <g fill="none" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round">
          ${negative ? `<path d="${negative}" stroke="var(--ares-negative,#ef4444)" />` : ''}
          ${positive ? `<path d="${positive}" stroke="var(--ares-positive,#22c55e)" />` : ''}
        </g>
        <g fill="none" stroke="var(--ares-border,rgba(255,255,255,.22))" stroke-width="1">
          ${ticks.map(t => `<line x1="${t.x.toFixed(1)}" x2="${t.x.toFixed(1)}" y1="${(height-padding.bottom).toFixed(1)}" y2="${(height-padding.bottom+6).toFixed(1)}" />`).join('')}
        </g>
        <g fill="var(--ares-text,#e5e7eb)">
          ${ticks.map(t => `<text x="${t.x.toFixed(1)}" y="${(height-padding.bottom+18).toFixed(1)}" text-anchor="middle" font-size="10">${t.label}</text>`).join('')}
        </g>
        <rect class="ares-hit" x="${padding.left}" y="${padding.top}" width="${(width-padding.left-padding.right).toFixed(1)}" height="${(height-padding.top-padding.bottom).toFixed(1)}" fill="transparent" />
      </svg>
    ` : '<div class="ares-empty">Bitte Zeitnachweis laden, um den Verlauf zu sehen.</div>';

    if(!entries.length || !tooltip) return;

    const hitArea = chart.querySelector('.ares-hit');
    if(!hitArea) return;

    hitArea.addEventListener('mousemove', evt => {
      const rect = chart.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const nearest = points.reduce((acc, point) => {
        const dist = Math.abs(point.x - x);
        if(dist < acc.dist) return { point, dist };
        return acc;
      }, { point: points[0], dist: Math.abs(points[0].x - x) });
      const { point } = nearest;
      tooltip.querySelector('.label').textContent = formatDate(point.date);
      tooltip.querySelector('.value').textContent = `${point.total.toFixed(2).replace('.', ',')} h`;
      tooltip.style.left = `${point.x}px`;
      tooltip.style.top = `${point.y}px`;
      tooltip.classList.add('visible');
    });

    hitArea.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });
  }

  function handleReport(container, text){
    const entries = parseReport(text);
    const errorBox = container.querySelector('.ares-error-box');
    if(!entries.length){
      if(errorBox){
        errorBox.textContent = 'Keine Werte gefunden – bitte gültigen Ares-Export laden.';
        errorBox.style.display = 'block';
      }
      renderChart(container, []);
      return;
    }
    if(errorBox){
      errorBox.textContent = '';
      errorBox.style.display = 'none';
    }
    renderChart(container, entries);
  }

  function bindFileLoader(container){
    const input = container.querySelector('.ares-file-input');
    const label = container.querySelector('.ares-file-name');
    const errorBox = container.querySelector('.ares-error-box');

    function showError(msg){
      if(errorBox){
        errorBox.textContent = msg;
        errorBox.style.display = msg ? 'block' : 'none';
      }
    }

    if(input){
      input.addEventListener('change', evt => {
        const file = evt.target.files?.[0];
        if(!file) return;
        label.textContent = file.name;
        const reader = new FileReader();
        reader.onload = e => {
          showError('');
          handleReport(container, e.target?.result || '');
        };
        reader.onerror = () => showError('Datei konnte nicht gelesen werden.');
        reader.readAsText(file);
      });
    }

    const sampleBtn = container.querySelector('.ares-sample');
    if(sampleBtn){
      sampleBtn.addEventListener('click', async () => {
        try{
          showError('');
          const res = await fetch('./ares_Luna.txt');
          if(!res.ok) throw new Error('HTTP '+res.status);
          const txt = await res.text();
          label.textContent = 'ares_Luna.txt';
          handleReport(container, txt);
        }catch(err){
          console.error(err);
          showError('Beispieldatei konnte nicht geladen werden.');
        }
      });
    }
  }

  window.renderAresStatistics = function(targetDiv){
    ensureStyles();
    if(!targetDiv) return;
    targetDiv.classList.add('ares-root');
    applyTheme(targetDiv);

    targetDiv.innerHTML = `
      <div class="ares-surface">
        <div class="ares-actions">
          <div class="ares-btn-row">
            <label class="ares-btn ares-file-label">
              <input class="ares-file-input" type="file" accept=".txt" />
              <span>Textdatei wählen</span>
            </label>
            <button type="button" class="ares-btn secondary ares-sample">Beispiel laden</button>
          </div>
          <div class="ares-file-name">Keine Datei gewählt</div>
        </div>
        <div class="ares-chart-card">
          <div class="ares-tooltip"><div class="label"></div><div class="value"></div></div>
          <div class="ares-chart"></div>
        </div>
        <div class="ares-error-box ares-error" style="display:none"></div>
      </div>
    `;

    bindFileLoader(targetDiv);
  };
})();
