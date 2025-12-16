(function(){
  const STYLE_ID = 'ares-statistics-styles';

  function ensureStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .ares-root{height:100%;width:100%;box-sizing:border-box;padding:.85rem;display:flex;flex-direction:column;gap:.75rem;color:var(--ares-text,var(--module-layer-module-text,#f8fafc));}
      .ares-surface{flex:1;display:flex;flex-direction:column;gap:.85rem;padding:1rem;border-radius:1rem;background:var(--ares-surface,var(--module-layer-module-bg,#0f172a));border:1px solid var(--ares-border,var(--module-layer-module-border,rgba(255,255,255,0.24)));box-shadow:0 14px 34px rgba(0,0,0,.24);}
      .ares-header{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;flex-wrap:wrap;}
      .ares-title{font-weight:700;font-size:1.2rem;line-height:1.3;}
      .ares-sub{opacity:.85;font-size:.95rem;}
      .ares-actions{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;}
      .ares-btn{border:1px solid var(--ares-header-border,var(--module-layer-header-border,var(--ares-border,#cbd5e1)));background:var(--ares-header,var(--module-layer-header-bg,rgba(255,255,255,.08)));color:var(--ares-header-text,var(--module-layer-header-text,var(--ares-text,#f8fafc)));border-radius:.65rem;padding:.45rem .9rem;font-weight:600;font-size:.92rem;cursor:pointer;transition:background-color .2s,transform .1s;box-shadow:0 10px 24px rgba(0,0,0,.12);}
      .ares-btn:hover{background:var(--ares-header-strong,rgba(255,255,255,.15));transform:translateY(-1px);}
      .ares-btn.secondary{background:transparent;color:var(--ares-header-text,var(--ares-text,#f8fafc));border-color:var(--ares-border,var(--module-layer-module-border,#cbd5e1));}
      .ares-file-input{display:none;}
      .ares-file-label{display:inline-flex;align-items:center;gap:.35rem;}
      .ares-meta{display:flex;gap:1rem;flex-wrap:wrap;font-size:.92rem;opacity:.9;}
      .ares-badge{display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .65rem;border-radius:.55rem;background:var(--ares-chip-bg,var(--module-header-bg,rgba(255,255,255,.08)));border:1px solid var(--ares-border,var(--module-layer-module-border,rgba(255,255,255,.22)));font-weight:600;}
      .ares-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.65rem;}
      .ares-stat{padding:.75rem .9rem;border-radius:.75rem;background:var(--ares-alt-surface,rgba(255,255,255,.06));border:1px solid var(--ares-border,var(--module-layer-module-border,rgba(255,255,255,.22)));box-shadow:0 10px 24px rgba(0,0,0,.12);}
      .ares-stat .label{display:block;font-size:.8rem;opacity:.8;margin-bottom:.2rem;}
      .ares-stat .value{font-weight:700;font-size:1.1rem;}
      .ares-chart-card{background:var(--ares-alt-surface,rgba(255,255,255,.06));border:1px solid var(--ares-border,var(--module-layer-module-border,rgba(255,255,255,.22)));border-radius:1rem;padding:.75rem;box-shadow:0 10px 24px rgba(0,0,0,.18);}
      .ares-chart-header{display:flex;justify-content:space-between;align-items:center;gap:.5rem;font-weight:600;margin-bottom:.35rem;}
      .ares-chart{width:100%;height:300px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));border-radius:.75rem;border:1px solid var(--ares-border,var(--module-layer-module-border,rgba(255,255,255,.22)));}
      .ares-chart svg{width:100%;height:100%;display:block;border-radius:.75rem;}
      .ares-chart circle.pos{fill:var(--ares-positive,#22c55e);stroke:var(--ares-surface,var(--module-layer-module-bg,#0f172a));}
      .ares-chart circle.neg{fill:var(--ares-negative,#ef4444);stroke:var(--ares-surface,var(--module-layer-module-bg,#0f172a));}
      .ares-list{max-height:200px;overflow:auto;padding-right:.35rem;}
      .ares-row{display:grid;grid-template-columns:140px 1fr 100px;gap:.5rem;padding:.35rem .55rem;border-bottom:1px dashed var(--ares-border,var(--module-layer-module-border,rgba(255,255,255,.22)));align-items:center;}
      .ares-row:last-child{border-bottom:none;}
      .ares-pill{display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .55rem;border-radius:.55rem;font-weight:600;font-size:.9rem;}
      .ares-pill.pos{background:rgba(34,197,94,.15);color:var(--ares-positive,#22c55e);}
      .ares-pill.neg{background:rgba(239,68,68,.16);color:var(--ares-negative,#ef4444);}
      .ares-legend{display:flex;gap:.75rem;align-items:center;font-size:.9rem;opacity:.9;flex-wrap:wrap;margin-top:.35rem;}
      .ares-dot{width:10px;height:10px;border-radius:9999px;display:inline-block;border:2px solid currentColor;}
      .ares-empty{padding:1rem;border-radius:.75rem;background:var(--ares-alt-surface,rgba(255,255,255,.04));border:1px dashed var(--ares-border,var(--module-layer-module-border,rgba(255,255,255,.22)));text-align:center;opacity:.85;}
      .ares-error{color:var(--ares-negative,#ef4444);font-weight:600;}
      @media (max-width:640px){
        .ares-row{grid-template-columns:120px 1fr 90px;}
      }
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

    root.style.setProperty('--ares-surface', moduleBg);
    root.style.setProperty('--ares-text', moduleText);
    root.style.setProperty('--ares-border', moduleBorder);
    root.style.setProperty('--ares-header', alt.module?.headerBg || alt.module?.bg || moduleBg);
    root.style.setProperty('--ares-header-text', alt.module?.headerText || alt.module?.text || moduleText);
    root.style.setProperty('--ares-header-border', alt.module?.headerBorder || alt.module?.border || moduleBorder);
    root.style.setProperty('--ares-alt-surface', alt.module?.bg || 'rgba(255,255,255,0.04)');
    root.style.setProperty('--ares-accent', accent.module?.bg || alt.module?.bg || moduleBg);
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
    if(!entries.length) return { points: [], domain:[0,1], range:[0,1] };
    const padding = { top: 20, right: 30, bottom: 32, left: 54 };
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

  function buildSegmentPaths(points){
    if(!points.length) return { positive:'', negative:'' };
    const posSegments = [];
    const negSegments = [];
    let current = [];
    let currentSign = null;

    function commit(){
      if(!current.length) return;
      const path = current.map((p,idx) => `${idx===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      if(currentSign === 'pos') posSegments.push(path); else negSegments.push(path);
      current = [];
    }

    for(const point of points){
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

  function renderChart(container, entries){
    const chart = container.querySelector('.ares-chart');
    if(!chart) return;
    const width = chart.clientWidth || 600;
    const height = chart.clientHeight || 300;
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

    const axis = points.map(p => ({ x:p.x, label: p.date.toLocaleDateString('de-DE',{ day:'2-digit', month:'2-digit' }) }));

    const markers = points.map(p => {
      const cls = p.total >= 0 ? 'pos' : 'neg';
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" class="${cls}" stroke-width="2" />`;
    }).join('');

    const ticks = axis.filter((_,idx) => idx % Math.max(1, Math.ceil(axis.length / 8)) === 0);
    const tickEls = ticks.map(t => `<g><line x1="${t.x.toFixed(1)}" x2="${t.x.toFixed(1)}" y1="${(height-padding.bottom).toFixed(1)}" y2="${(height-padding.bottom+6).toFixed(1)}" stroke="var(--ares-border,rgba(255,255,255,.32))" stroke-width="1" />
      <text x="${t.x.toFixed(1)}" y="${(height-padding.bottom+18).toFixed(1)}" text-anchor="middle" fill="var(--ares-text, #e5e7eb)" font-size="10">${t.label}</text></g>`).join('');

    chart.innerHTML = points.length ? `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Zeitguthaben-Verlauf">
        <defs>
          <linearGradient id="ares-grid-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(255,255,255,.08)" />
            <stop offset="100%" stop-color="rgba(255,255,255,.02)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${width}" height="${height}" fill="url(#ares-grid-grad)" rx="12" />
        <line x1="${padding.left}" x2="${width - padding.right}" y1="${zeroY.toFixed(1)}" y2="${zeroY.toFixed(1)}" stroke="var(--ares-border,rgba(255,255,255,.32))" stroke-width="1" stroke-dasharray="4 3" />
        <g fill="none" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round">
          ${negative ? `<path d="${negative}" stroke="var(--ares-negative,#ef4444)" />` : ''}
          ${positive ? `<path d="${positive}" stroke="var(--ares-positive,#22c55e)" />` : ''}
        </g>
        <g fill="none" stroke="var(--ares-border,rgba(255,255,255,.22))" stroke-dasharray="6 6" stroke-width="1">${points.length ? '' : ''}</g>
        <g fill="none">${tickEls}</g>
        <g fill="currentColor">
          ${markers}
        </g>
      </svg>
    ` : '<div class="ares-empty">Bitte Zeitnachweis laden, um den Verlauf zu sehen.</div>';
  }

  function summarize(entries){
    if(!entries.length) return null;
    const totals = entries.map(e => e.total);
    const last = entries[entries.length-1].total;
    return {
      last,
      max: Math.max(...totals),
      min: Math.min(...totals),
      span: Math.max(...totals) - Math.min(...totals),
      count: entries.length
    };
  }

  function formatHours(value){
    if(value === null || typeof value === 'undefined') return '–';
    const fixed = value.toFixed(2).replace('.', ',');
    return `${fixed} h`;
  }

  function renderRows(listEl, entries){
    if(!listEl) return;
    if(!entries.length){
      listEl.innerHTML = '<div class="ares-empty">Keine Tageswerte geladen.</div>';
      return;
    }
    const rows = entries.map((entry, idx) => {
      const diff = idx === 0 ? 0 : entry.total - entries[idx-1].total;
      const cls = entry.total >= 0 ? 'pos' : 'neg';
      const diffCls = diff >= 0 ? 'pos' : 'neg';
      return `<div class="ares-row">
        <div class="font-semibold">${formatDate(entry.date)}</div>
        <div class="ares-pill ${cls}">${entry.total.toFixed(2).replace('.', ',')} h</div>
        <div class="ares-pill ${diffCls}" style="justify-self:end;">${diff >= 0 ? '+' : ''}${diff.toFixed(2).replace('.', ',')} h</div>
      </div>`;
    }).join('');
    listEl.innerHTML = rows;
  }

  function handleReport(container, text){
    const entries = parseReport(text);
    const stats = summarize(entries);
    const listEl = container.querySelector('.ares-list');
    renderChart(container, entries);
    renderRows(listEl, entries);

    const last = container.querySelector('.ares-last');
    const max = container.querySelector('.ares-max');
    const min = container.querySelector('.ares-min');
    const span = container.querySelector('.ares-span');
    const count = container.querySelector('.ares-count');

    if(last) last.textContent = stats ? formatHours(stats.last) : '–';
    if(max) max.textContent = stats ? formatHours(stats.max) : '–';
    if(min) min.textContent = stats ? formatHours(stats.min) : '–';
    if(span) span.textContent = stats ? formatHours(stats.span) : '–';
    if(count) count.textContent = stats ? `${stats.count} Tage` : '–';
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
        <div class="ares-header">
          <div>
            <div class="ares-title">AresStatistics</div>
            <div class="ares-sub">Wähle eine Ares-Exportdatei (Text) und verfolge dein Zeitguthaben.</div>
            <div class="ares-meta mt-2">
              <span class="ares-badge">Modul-Farbgruppen: Main, Alternative, Accent</span>
            </div>
          </div>
          <div class="ares-actions">
            <label class="ares-btn ares-file-label">
              <input class="ares-file-input" type="file" accept=".txt" />
              <span>Textdatei wählen</span>
            </label>
            <button type="button" class="ares-btn secondary ares-sample">Beispiel laden</button>
            <div class="ares-badge ares-file-name">Keine Datei gewählt</div>
          </div>
        </div>
        <div class="ares-grid">
          <div class="ares-stat"><span class="label">Letzter Stand</span><span class="value ares-last">–</span></div>
          <div class="ares-stat"><span class="label">Höchststand</span><span class="value ares-max">–</span></div>
          <div class="ares-stat"><span class="label">Tiefstand</span><span class="value ares-min">–</span></div>
          <div class="ares-stat"><span class="label">Spannweite</span><span class="value ares-span">–</span></div>
          <div class="ares-stat"><span class="label">Tage im Verlauf</span><span class="value ares-count">–</span></div>
        </div>
        <div class="ares-chart-card">
          <div class="ares-chart-header">
            <span>Gesamter Verlauf (laufende Summe)</span>
            <div class="ares-legend">
              <span><span class="ares-dot" style="color:var(--ares-positive,#22c55e)"></span> positiv</span>
              <span><span class="ares-dot" style="color:var(--ares-negative,#ef4444)"></span> negativ</span>
            </div>
          </div>
          <div class="ares-chart"></div>
        </div>
        <div class="ares-list"></div>
        <div class="ares-error-box ares-error" style="display:none"></div>
      </div>
    `;

    bindFileLoader(targetDiv);
  };
})();
