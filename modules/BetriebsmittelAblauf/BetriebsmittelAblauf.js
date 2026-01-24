(function(){
  const STYLE_ID = 'betriebsmittel-ablauf-styles';
  const STORAGE_KEY = 'betriebsmittel-ablauf-v1';
  const DEFAULT_REMINDERS = [7, 0];
  const PALETTE_PRESETS = ['Main', 'Alternative', 'Accent'];
  const DEFAULT_TEXT_PRESETS = [
    {
      id: 'mail-template',
      title: 'Mailvordruck',
      body: [
        'Betreff: Betriebsmittel bei mir: {name}',
        '',
        'Hallo zusammen,',
        '',
        'das folgende Betriebsmittel befindet sich aktuell bei mir:',
        '- Name: {name}',
        '- Kategorie: {type}',
        '- Prüftyp: {kind}',
        '- Ablaufmonat: {expiryMonth} ({expiryDate})',
        '- Betriebsmittelnummer: {assetNumber}',
        '{desc}',
        '',
        'Bitte berücksichtigt den Standort bzw. aktualisiert die Trackbarkeit.',
        '',
        'Danke & viele Grüße'
      ].join('\n')
    }
  ];
  const TEXT_PRESET_KEYWORDS = [
    '{name}',
    '{assetNumber}',
    '{type}',
    '{kind}',
    '{expiryMonth}',
    '{expiryDate}',
    '{desc}'
  ];

  if(!document.getElementById(STYLE_ID)){
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .bma-root{height:100%;width:100%;padding:.9rem;box-sizing:border-box;display:flex;flex-direction:column;gap:.9rem;color:var(--bma-main-text,var(--module-text,#e2e8f0));}
      .bma-card{background:var(--bma-card-bg,rgba(15,23,42,.65));color:var(--bma-card-text,inherit);border:1px solid var(--bma-card-border,rgba(148,163,184,.2));border-radius:.95rem;padding:.8rem;box-shadow:0 10px 24px rgba(8,15,35,.25);}
      .bma-header{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.75rem;align-items:flex-start;}
      .bma-title{margin:0;font-size:1.1rem;font-weight:700;letter-spacing:.2px;}
      .bma-subtitle{margin:.2rem 0 0;font-size:.82rem;opacity:.75;max-width:30rem;line-height:1.45;}
      .bma-header-actions{display:flex;flex-wrap:wrap;gap:.5rem;}
      .bma-btn{appearance:none;border:none;border-radius:.7rem;padding:.5rem .85rem;font-weight:600;font-size:.85rem;cursor:pointer;transition:transform .12s ease,filter .12s ease;}
      .bma-btn-primary{background:var(--bma-accent-bg,rgba(59,130,246,.9));color:var(--bma-accent-text,#fff);box-shadow:0 10px 24px rgba(15,23,42,.35);}
      .bma-btn-secondary{background:rgba(148,163,184,.2);color:inherit;}
      .bma-btn:hover{transform:translateY(-1px);filter:brightness(1.03);}
      .bma-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.6rem;}
      .bma-summary-card{padding:.6rem .7rem;border-radius:.75rem;background:rgba(15,23,42,.4);border:1px solid rgba(148,163,184,.18);}
      .bma-summary-label{font-size:.75rem;text-transform:uppercase;letter-spacing:.12rem;opacity:.7;}
      .bma-summary-value{font-size:1.1rem;font-weight:700;margin-top:.2rem;}
      .bma-controls{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;}
      .bma-controls input,.bma-controls select{background:rgba(15,23,42,.4);border:1px solid rgba(148,163,184,.25);color:inherit;border-radius:.6rem;padding:.45rem .6rem;font-size:.85rem;}
      .bma-controls label{display:flex;flex-direction:column;gap:.25rem;font-size:.72rem;text-transform:uppercase;letter-spacing:.08rem;opacity:.7;}
      .bma-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.7rem;max-width:calc(5 * 260px + 4 * .7rem);margin:0 auto;}
      .bma-item{display:flex;flex-direction:column;gap:.6rem;cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease;padding:1rem;}
      .bma-item.is-expanded{border-color:var(--bma-accent-border,rgba(59,130,246,.55));box-shadow:0 14px 30px rgba(8,15,35,.35);}
      .bma-item-details{display:none;flex-direction:column;gap:.6rem;}
      .bma-item.is-expanded .bma-item-details{display:flex;}
      .bma-item-header{display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start;}
      .bma-item-title{margin:0;font-size:.95rem;font-weight:700;}
      .bma-item-type{font-size:.75rem;opacity:.75;}
      .bma-status{padding:.2rem .55rem;border-radius:.6rem;font-size:.72rem;font-weight:600;letter-spacing:.2px;background:rgba(148,163,184,.2);}
      .bma-status.overdue{background:rgba(239,68,68,.18);color:#fecaca;border:1px solid rgba(239,68,68,.4);}
      .bma-status.soon{background:var(--bma-accent-bg,rgba(59,130,246,.25));color:var(--bma-accent-text,#fff);border:1px solid var(--bma-accent-border,rgba(59,130,246,.55));}
      .bma-status.month{background:rgba(251,191,36,.18);color:#fde68a;border:1px solid rgba(251,191,36,.35);}
      .bma-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;}
      .bma-pill{padding:.25rem .6rem;border-radius:.6rem;font-size:.72rem;background:rgba(148,163,184,.2);}
      .bma-desc{font-size:.82rem;line-height:1.45;opacity:.85;}
      .bma-reminders{display:flex;flex-direction:column;gap:.25rem;font-size:.78rem;}
      .bma-reminder-tag{display:inline-flex;gap:.35rem;align-items:center;padding:.2rem .55rem;border-radius:.6rem;background:rgba(148,163,184,.2);}
      .bma-item-actions{display:flex;gap:.4rem;flex-wrap:wrap;}
      .bma-item-actions button{border:none;border-radius:.6rem;padding:.35rem .6rem;font-size:.75rem;cursor:pointer;background:rgba(148,163,184,.18);color:inherit;}
      .bma-item-actions button.primary{background:var(--bma-accent-bg,rgba(59,130,246,.75));color:var(--bma-accent-text,#fff);}
      .bma-empty{padding:1.4rem;border-radius:.9rem;border:1px dashed rgba(148,163,184,.35);text-align:center;font-size:.85rem;opacity:.7;}
      .bma-form{display:grid;gap:.6rem;}
      .bma-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.6rem;}
      .bma-form label{display:flex;flex-direction:column;gap:.3rem;font-size:.75rem;text-transform:uppercase;letter-spacing:.08rem;opacity:.75;}
      .bma-form input,.bma-form select,.bma-form textarea{background:rgba(15,23,42,.4);border:1px solid rgba(148,163,184,.25);color:inherit;border-radius:.6rem;padding:.45rem .6rem;font-size:.85rem;}
      .bma-form textarea{min-height:70px;resize:vertical;}
      .bma-swap-banner{display:flex;flex-direction:column;gap:.35rem;padding:.6rem .75rem;border-radius:.75rem;background:rgba(148,163,184,.15);border:1px dashed rgba(148,163,184,.35);font-size:.8rem;}
      .bma-swap-title{font-weight:700;}
      .bma-swap-actions{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;}
      .bma-reminder-options{display:flex;flex-wrap:wrap;gap:.5rem;}
      .bma-reminder-chip{display:flex;align-items:center;gap:.35rem;padding:.3rem .55rem;border-radius:.6rem;background:rgba(148,163,184,.18);font-size:.78rem;}
      .bma-form-actions{display:flex;gap:.5rem;flex-wrap:wrap;}
      .bma-form-actions .bma-btn{font-size:.82rem;}
      .bma-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:1.2rem;background:rgba(15,23,42,.55);backdrop-filter:blur(12px);z-index:4000;}
      .bma-modal.open{display:flex;}
      .bma-modal-panel{width:min(640px,95vw);max-height:90vh;overflow:auto;background:var(--bma-card-bg,rgba(15,23,42,.95));color:var(--bma-card-text,#f8fafc);border-radius:1rem;border:1px solid var(--bma-card-border,rgba(148,163,184,.3));padding:1rem 1.1rem;box-shadow:0 20px 40px rgba(8,15,35,.45);display:flex;flex-direction:column;gap:.9rem;}
      .bma-modal-header{display:flex;justify-content:space-between;gap:.6rem;align-items:center;}
      .bma-modal-title{margin:0;font-size:1rem;font-weight:700;}
      .bma-modal-close{border:none;background:rgba(148,163,184,.2);color:inherit;border-radius:.6rem;width:2rem;height:2rem;font-size:1.2rem;cursor:pointer;}
      .bma-settings-section{display:flex;flex-direction:column;gap:.6rem;}
      .bma-settings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.6rem;}
      .bma-layer-preview{display:flex;flex-direction:column;gap:.3rem;padding:.6rem;border-radius:.8rem;background:var(--bma-layer-bg,rgba(15,23,42,.6));color:var(--bma-layer-text,#fff);border:1px solid var(--bma-layer-border,rgba(148,163,184,.3));}
      .bma-layer-name{font-size:.8rem;font-weight:600;}
      .bma-layer-sample{font-size:.72rem;opacity:.8;}
      .bma-settings-note{font-size:.78rem;opacity:.75;line-height:1.4;}
      .bma-settings-actions{display:flex;justify-content:flex-end;gap:.5rem;}
      .bma-tag-accent{background:var(--bma-accent-bg,rgba(59,130,246,.2));color:var(--bma-accent-text,#fff);border:1px solid var(--bma-accent-border,rgba(59,130,246,.5));}
      .bma-hint{font-size:.78rem;opacity:.7;}
      .bma-text-presets{display:flex;flex-direction:column;gap:.8rem;}
      .bma-text-preset{display:flex;flex-direction:column;gap:.5rem;padding:.7rem;border-radius:.8rem;border:1px solid rgba(148,163,184,.25);background:rgba(15,23,42,.35);}
      .bma-text-preset input,.bma-text-preset textarea{background:rgba(15,23,42,.4);border:1px solid rgba(148,163,184,.25);color:inherit;border-radius:.6rem;padding:.45rem .6rem;font-size:.85rem;}
      .bma-text-preset textarea{min-height:90px;resize:vertical;width:100%;box-sizing:border-box;}
      .bma-text-preset-actions{display:flex;justify-content:flex-end;gap:.4rem;flex-wrap:wrap;}
      .bma-text-presets-empty{font-size:.8rem;opacity:.7;border:1px dashed rgba(148,163,184,.35);padding:.7rem;border-radius:.75rem;text-align:center;}
      .bma-keyword-list{display:flex;flex-wrap:wrap;gap:.35rem;}
      .bma-keyword-tag{padding:.2rem .45rem;border-radius:.5rem;background:rgba(148,163,184,.2);font-size:.72rem;}
      .bma-modal-panel-wide{width:98vw;max-height:92vh;}
      .bma-modal-panel-wide .bma-text-presets{max-height:50vh;overflow:auto;}
      .bma-modal-panel-wide .bma-text-preset textarea{min-height:160px;}
      .bma-item-presets{display:flex;flex-wrap:wrap;gap:.4rem;}
      .bma-item-presets button{border:none;border-radius:.6rem;padding:.3rem .6rem;font-size:.72rem;cursor:pointer;background:rgba(148,163,184,.18);color:inherit;}
    `;
    document.head.appendChild(style);
  }

  function readValue(styles, prop){
    return (styles?.getPropertyValue(prop) || '').trim();
  }

  function readAppLayers(){
    const layers = Array.isArray(window?.appSettings?.moduleColorLayers)
      ? window.appSettings.moduleColorLayers
      : [];
    return layers.map(layer => layer || {});
  }

  function loadLayers(){
    const root = document.documentElement;
    if(!root) return [];
    const styles = getComputedStyle(root);
    const layers = [];

    const baseModuleBg = readValue(styles, '--module-layer-module-bg') || readValue(styles, '--module-bg');
    const baseModuleText = readValue(styles, '--module-layer-module-text') || readValue(styles, '--text-color');
    const baseModuleBorder = readValue(styles, '--module-layer-module-border') || readValue(styles, '--module-border-color');

    const appLayers = readAppLayers();

    if(appLayers.length){
      appLayers.slice(0, PALETTE_PRESETS.length).forEach((layer, index) => {
        const defaultName = PALETTE_PRESETS[index] || `Layer ${index + 1}`;
        const name = (layer.name || '').trim() || defaultName;
        layers.push({
          id: layer.id || (index === 0 ? 'primary' : String(index)),
          name,
          module: {
            bg: (layer.moduleBg || '').trim() || baseModuleBg,
            text: (layer.moduleText || '').trim() || baseModuleText,
            border: (layer.moduleBorder || '').trim() || baseModuleBorder
          }
        });
      });
    }

    if(!layers.length){
      const cssLayers = [];
      for(let i=1;i<=PALETTE_PRESETS.length;i+=1){
        const name = readValue(styles, `--module-layer-${i}-name`) || PALETTE_PRESETS[i-1];
        const bg = readValue(styles, `--module-layer-${i}-module-bg`);
        const text = readValue(styles, `--module-layer-${i}-module-text`);
        const border = readValue(styles, `--module-layer-${i}-module-border`);
        if(name || bg || text || border){
          cssLayers.push({
            id: i === 1 ? 'primary' : String(i),
            name,
            module: {
              bg: bg || baseModuleBg,
              text: text || baseModuleText,
              border: border || baseModuleBorder
            }
          });
        }
      }
      if(cssLayers.length){
        layers.push(...cssLayers);
      }
    }

    if(!layers.length){
      layers.push({
        id: 'primary',
        name: readValue(styles, '--module-layer-name') || PALETTE_PRESETS[0],
        module: { bg: baseModuleBg, text: baseModuleText, border: baseModuleBorder }
      });
    }

    return layers;
  }

  function safeParse(str){
    try{ return JSON.parse(str); }catch{ return null; }
  }

  function loadDoc(){
    if(typeof localStorage === 'undefined'){
      return { __meta: { version: 1 }, instances: {} };
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    return safeParse(stored) || { __meta: { version: 1 }, instances: {} };
  }

  function saveDoc(doc){
    if(typeof localStorage === 'undefined') return;
    try{
      doc.__meta = { version: 1, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    }catch(err){
      console.warn('[BetriebsmittelAblauf] Speichern fehlgeschlagen', err);
    }
  }

  function getInstanceId(root){
    return root.closest('.grid-stack-item')?.dataset?.instanceId || `inst-${Math.random().toString(36).slice(2)}`;
  }

  function normalizeReminders(values){
    const unique = new Set();
    values.forEach(val => {
      const num = Number(val);
      if(Number.isFinite(num) && num >= 0){
        unique.add(Math.round(num));
      }
    });
    return Array.from(unique).sort((a,b) => b - a);
  }

  function parseReminderInput(raw){
    if(!raw) return [];
    return raw.split(/[;,]/)
      .map(part => Number(part.trim()))
      .filter(val => Number.isFinite(val) && val >= 0);
  }

  function parseMonth(value){
    if(!value) return null;
    const [yearStr, monthStr] = value.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    if(!Number.isFinite(year) || !Number.isFinite(month)) return null;
    return { year, month };
  }

  function parseCompactMonthInput(value){
    if(!value) return null;
    if(value.includes('-')) return null;
    const digits = value.replace(/\D/g, '');
    if(digits.length < 3) return null;
    let month = null;
    let year = null;
    if(digits.length === 3){
      month = Number(digits.slice(0, 1));
      year = 2000 + Number(digits.slice(1, 3));
    }else if(digits.length === 4){
      month = Number(digits.slice(0, 2));
      year = 2000 + Number(digits.slice(2, 4));
    }else if(digits.length === 5){
      month = Number(digits.slice(0, 1));
      year = Number(digits.slice(1, 5));
    }else{
      month = Number(digits.slice(0, 2));
      year = Number(digits.slice(2, 6));
    }
    if(!Number.isFinite(month) || !Number.isFinite(year)) return null;
    if(month < 1 || month > 12) return null;
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  function normalizeMonthInput(value, rawDigits){
    if(rawDigits){
      const normalized = parseCompactMonthInput(rawDigits);
      if(normalized) return normalized;
    }
    if(!value) return '';
    if(value.includes('-')) return value;
    return parseCompactMonthInput(value) || '';
  }

  function formatMonth(value){
    const parsed = parseMonth(value);
    if(!parsed) return '-';
    const mm = String(parsed.month).padStart(2,'0');
    return `${mm}.${parsed.year}`;
  }

  function getExpiryDate(value){
    const parsed = parseMonth(value);
    if(!parsed) return null;
    return new Date(parsed.year, parsed.month, 0);
  }

  function startOfDay(date){
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function daysBetween(a, b){
    const diff = startOfDay(b).getTime() - startOfDay(a).getTime();
    return Math.round(diff / 86400000);
  }

  function formatDate(date){
    if(!date) return '-';
    return new Intl.DateTimeFormat('de-DE').format(date);
  }

  function getStatus(expiryDate){
    if(!expiryDate) return { label: 'Kein Ablauf', tone: 'default', days: null };
    const today = startOfDay(new Date());
    const diff = daysBetween(today, expiryDate);
    if(diff < 0){
      return { label: 'Überfällig', tone: 'overdue', days: diff };
    }
    if(diff <= 7){
      return { label: 'Bald fällig', tone: 'soon', days: diff };
    }
    if(diff <= 31){
      return { label: 'In diesem Monat', tone: 'month', days: diff };
    }
    return { label: 'Geplant', tone: 'default', days: diff };
  }

  function computeReminderDates(expiryDate, reminders){
    if(!expiryDate) return [];
    return reminders.map(days => {
      const date = new Date(expiryDate);
      date.setDate(date.getDate() - days);
      return { days, date };
    }).sort((a,b) => a.date - b.date);
  }

  function getNextReminder(reminderDates){
    const today = startOfDay(new Date());
    const upcoming = reminderDates.filter(entry => startOfDay(entry.date) >= today);
    return upcoming[0] || null;
  }

  function buildLayerMap(layers){
    const map = new Map();
    layers.forEach(layer => {
      map.set(layer.id, layer);
    });
    return map;
  }

  function applyLayerVars(root, layers, settings){
    const layerMap = buildLayerMap(layers);
    const main = layers[0] || null;
    const alt = layers[1] || layers[0] || null;
    const accent = layers[2] || layers[0] || null;

    if(main){
      root.style.setProperty('--bma-main-bg', main.module?.bg || '');
      root.style.setProperty('--bma-main-text', main.module?.text || '');
      root.style.setProperty('--bma-main-border', main.module?.border || '');
    }
    if(alt){
      root.style.setProperty('--bma-alt-bg', alt.module?.bg || '');
      root.style.setProperty('--bma-alt-text', alt.module?.text || '');
      root.style.setProperty('--bma-alt-border', alt.module?.border || '');
    }
    if(accent){
      root.style.setProperty('--bma-accent-bg', accent.module?.bg || '');
      root.style.setProperty('--bma-accent-text', accent.module?.text || '');
      root.style.setProperty('--bma-accent-border', accent.module?.border || '');
    }

    const cardLayer = layerMap.get(settings.cardLayer) || main || alt;
    const accentLayer = layerMap.get(settings.accentLayer) || accent || main;

    if(cardLayer){
      root.style.setProperty('--bma-card-bg', cardLayer.module?.bg || '');
      root.style.setProperty('--bma-card-text', cardLayer.module?.text || '');
      root.style.setProperty('--bma-card-border', cardLayer.module?.border || '');
    }
    if(accentLayer){
      root.style.setProperty('--bma-accent-bg', accentLayer.module?.bg || '');
      root.style.setProperty('--bma-accent-text', accentLayer.module?.text || '');
      root.style.setProperty('--bma-accent-border', accentLayer.module?.border || '');
    }
  }

  function render(root, ctx){
    if(!root) return;
    const instanceId = getInstanceId(root);
    const doc = loadDoc();
    const layers = loadLayers();

    doc.instances ||= {};
    if(!doc.instances[instanceId]){
      doc.instances[instanceId] = {
        items: [],
        settings: {
          defaultReminders: DEFAULT_REMINDERS.slice(),
          cardLayer: layers[0]?.id || 'primary',
          accentLayer: layers[2]?.id || layers[0]?.id || 'primary',
          textPresets: DEFAULT_TEXT_PRESETS.map(preset => ({ ...preset }))
        }
      };
    }

    const state = doc.instances[instanceId];
    state.settings ||= {};
    if(!Array.isArray(state.settings.defaultReminders)){
      state.settings.defaultReminders = DEFAULT_REMINDERS.slice();
    }
    if(!state.settings.cardLayer){
      state.settings.cardLayer = layers[0]?.id || 'primary';
    }
    if(!state.settings.accentLayer){
      state.settings.accentLayer = layers[2]?.id || layers[0]?.id || 'primary';
    }
    if(!Array.isArray(state.settings.textPresets)){
      state.settings.textPresets = DEFAULT_TEXT_PRESETS.map(preset => ({ ...preset }));
    }
    if(!state.settings.textPresets.length){
      state.settings.textPresets = DEFAULT_TEXT_PRESETS.map(preset => ({ ...preset }));
    }
    const expandedItems = new Set();

    root.innerHTML = `
      <div class="bma-root">
        <div class="bma-header">
          <div>
            <h3 class="bma-title">${ctx?.moduleJson?.settings?.title || 'Betriebsmittel Ablauf'}</h3>
            <p class="bma-subtitle">Erfasse Geräte und Kabel mit Ablaufmonat (DGUV/Kalibrierung), erhalte strukturierte Reminder und behalte fällige Prüfungen im Blick.</p>
          </div>
          <div class="bma-header-actions">
            <button type="button" class="bma-btn bma-btn-secondary bma-open-settings">⚙️ Einstellungen</button>
            <button type="button" class="bma-btn bma-btn-primary bma-scroll-form">➕ Betriebsmittel hinzufügen</button>
          </div>
        </div>
        <div class="bma-card">
          <div class="bma-summary">
            <div class="bma-summary-card">
              <div class="bma-summary-label">Alle Einträge</div>
              <div class="bma-summary-value" data-bma-summary="total">0</div>
            </div>
            <div class="bma-summary-card">
              <div class="bma-summary-label">Bald fällig</div>
              <div class="bma-summary-value" data-bma-summary="soon">0</div>
            </div>
            <div class="bma-summary-card">
              <div class="bma-summary-label">Überfällig</div>
              <div class="bma-summary-value" data-bma-summary="overdue">0</div>
            </div>
            <div class="bma-summary-card">
              <div class="bma-summary-label">Nächster Reminder</div>
              <div class="bma-summary-value" data-bma-summary="next">-</div>
            </div>
          </div>
        </div>
        <div class="bma-card bma-form" data-bma-form>
          <div class="bma-form-grid">
            <label>
              Name
              <input type="text" class="bma-input-name" placeholder="z. B. Druckmessgerät" />
            </label>
            <label>
              Betriebsmittelnummer (optional)
              <input type="text" class="bma-input-asset" placeholder="z. B. BM-2048" />
            </label>
            <label>
              Kategorie
              <select class="bma-input-type">
                <option value="Gerät">Gerät</option>
                <option value="Kabel">Kabel</option>
                <option value="Zubehör">Zubehör</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </label>
            <label>
              Ablaufmonat
              <input type="month" class="bma-input-month" inputmode="numeric" />
            </label>
            <label>
              Prüftyp
              <select class="bma-input-kind">
                <option value="DGUV">DGUV</option>
                <option value="Kalibrierung">Kalibrierung</option>
                <option value="Wartung">Wartung</option>
              </select>
            </label>
          </div>
          <label>
            Beschreibung
            <textarea class="bma-input-desc" placeholder="Kurzinfo, Standort, Seriennummer..."></textarea>
          </label>
          <div class="bma-swap-banner" data-bma-swap>
            <div class="bma-swap-title">Tauschmodus aktiv</div>
            <div class="bma-swap-info" data-bma-swap-info></div>
            <div class="bma-swap-actions">
              <label class="bma-reminder-chip"><input type="checkbox" class="bma-swap-delete" /> Altes Gerät nach dem Speichern löschen</label>
              <button type="button" class="bma-btn bma-btn-secondary bma-swap-cancel">Tausch abbrechen</button>
            </div>
          </div>
          <div class="bma-hint">Tipp: Mit Enter springst du zum nächsten Feld, mit Strg+Enter speicherst du sofort.</div>
          <div>
            <div class="bma-hint">Reminder setzen (Standard: 7 Tage vorher + am Tag des Ablaufs).</div>
            <div class="bma-reminder-options">
              <label class="bma-reminder-chip"><input type="checkbox" class="bma-reminder-seven" /> 7 Tage vorher</label>
              <label class="bma-reminder-chip"><input type="checkbox" class="bma-reminder-zero" /> Am Tag des Ablaufs</label>
              <label class="bma-reminder-chip">Weitere Tage vorher <input type="text" class="bma-reminder-extra" placeholder="14, 30" /></label>
            </div>
          </div>
          <div class="bma-form-actions">
            <button type="button" class="bma-btn bma-btn-primary bma-save-item">Eintrag speichern</button>
            <button type="button" class="bma-btn bma-btn-secondary bma-cancel-edit" style="display:none;">Bearbeitung abbrechen</button>
          </div>
        </div>
        <div class="bma-card bma-controls">
          <label>
            Suche
            <input type="search" class="bma-filter-search" placeholder="Gerät, Kabel, Beschreibung..." />
          </label>
          <label>
            Status
            <select class="bma-filter-status">
              <option value="all">Alle</option>
              <option value="overdue">Überfällig</option>
              <option value="soon">Bald fällig</option>
              <option value="month">In diesem Monat</option>
              <option value="future">Geplant</option>
            </select>
          </label>
          <label>
            Sortierung
            <select class="bma-filter-sort">
              <option value="asc">Datum aufsteigend</option>
              <option value="desc">Datum absteigend</option>
            </select>
          </label>
        </div>
        <div class="bma-list" data-bma-list></div>
      </div>
      <div class="bma-modal" data-bma-modal>
        <div class="bma-modal-panel bma-modal-panel-wide">
          <div class="bma-modal-header">
            <h4 class="bma-modal-title">Einstellungen – Betriebsmittel Ablauf</h4>
            <button type="button" class="bma-modal-close" aria-label="Schließen">×</button>
          </div>
          <div class="bma-settings-section">
            <div class="bma-settings-note">Modul-Farbgruppen (Main · Alternative · Accent)</div>
            <div class="bma-settings-grid" data-bma-layer-preview></div>
            <div class="bma-settings-grid">
              <label>
                Karten-Farbgruppe
                <select class="bma-setting-card-layer"></select>
              </label>
              <label>
                Akzent-Farbgruppe
                <select class="bma-setting-accent-layer"></select>
              </label>
            </div>
            <div class="bma-settings-note">Favorisiere Main/Alternative für Flächen. Accent wird automatisch für dezente Highlights genutzt.</div>
          </div>
          <div class="bma-settings-section">
            <div class="bma-settings-note">Standard-Reminder für neue Einträge</div>
            <div class="bma-reminder-options">
              <label class="bma-reminder-chip"><input type="checkbox" class="bma-setting-reminder-seven" /> 7 Tage vorher</label>
              <label class="bma-reminder-chip"><input type="checkbox" class="bma-setting-reminder-zero" /> Am Tag des Ablaufs</label>
              <label class="bma-reminder-chip">Weitere Tage vorher <input type="text" class="bma-setting-reminder-extra" placeholder="14, 30" /></label>
            </div>
          </div>
          <div class="bma-settings-actions">
            <button type="button" class="bma-btn bma-btn-secondary bma-modal-close">Schließen</button>
            <button type="button" class="bma-btn bma-btn-primary bma-settings-save">Übernehmen</button>
          </div>
        </div>
      </div>
      <div class="bma-modal" data-bma-text-modal>
        <div class="bma-modal-panel bma-modal-panel-wide">
          <div class="bma-modal-header">
            <h4 class="bma-modal-title">Textbausteine – Betriebsmittel Ablauf</h4>
            <button type="button" class="bma-modal-close" aria-label="Schließen">×</button>
          </div>
          <div class="bma-settings-section">
            <div class="bma-settings-note">Hier kannst du vordefinierte Texte für häufige Hinweise pflegen.</div>
            <div class="bma-settings-note">
              Verfügbare Platzhalter:
              <div class="bma-keyword-list">
                ${TEXT_PRESET_KEYWORDS.map(keyword => `<span class="bma-keyword-tag">${keyword}</span>`).join('')}
              </div>
            </div>
            <div class="bma-text-presets" data-bma-text-presets></div>
            <button type="button" class="bma-btn bma-btn-secondary bma-text-add">➕ Textbaustein hinzufügen</button>
          </div>
          <div class="bma-settings-actions">
            <button type="button" class="bma-btn bma-btn-secondary bma-text-cancel">Schließen</button>
            <button type="button" class="bma-btn bma-btn-primary bma-text-save">Speichern</button>
          </div>
        </div>
      </div>
    `;

    const rootEl = root.querySelector('.bma-root');
    const listEl = root.querySelector('[data-bma-list]');
    const formEl = root.querySelector('[data-bma-form]');
    const modalEl = root.querySelector('[data-bma-modal]');
    const textModalEl = root.querySelector('[data-bma-text-modal]');
    const summaryEls = {
      total: root.querySelector('[data-bma-summary="total"]'),
      soon: root.querySelector('[data-bma-summary="soon"]'),
      overdue: root.querySelector('[data-bma-summary="overdue"]'),
      next: root.querySelector('[data-bma-summary="next"]')
    };

    const formFields = {
      name: root.querySelector('.bma-input-name'),
      asset: root.querySelector('.bma-input-asset'),
      type: root.querySelector('.bma-input-type'),
      month: root.querySelector('.bma-input-month'),
      kind: root.querySelector('.bma-input-kind'),
      desc: root.querySelector('.bma-input-desc'),
      remSeven: root.querySelector('.bma-reminder-seven'),
      remZero: root.querySelector('.bma-reminder-zero'),
      remExtra: root.querySelector('.bma-reminder-extra')
    };

    const swapFields = {
      banner: root.querySelector('[data-bma-swap]'),
      info: root.querySelector('[data-bma-swap-info]'),
      deleteOld: root.querySelector('.bma-swap-delete'),
      cancel: root.querySelector('.bma-swap-cancel')
    };

    if(swapFields.banner){
      swapFields.banner.style.display = 'none';
    }

    const settingsFields = {
      cardLayer: root.querySelector('.bma-setting-card-layer'),
      accentLayer: root.querySelector('.bma-setting-accent-layer'),
      preview: root.querySelector('[data-bma-layer-preview]'),
      remSeven: root.querySelector('.bma-setting-reminder-seven'),
      remZero: root.querySelector('.bma-setting-reminder-zero'),
      remExtra: root.querySelector('.bma-setting-reminder-extra')
    };

    const searchInput = root.querySelector('.bma-filter-search');
    const statusSelect = root.querySelector('.bma-filter-status');
    const sortSelect = root.querySelector('.bma-filter-sort');
    const saveBtn = root.querySelector('.bma-save-item');
    const cancelBtn = root.querySelector('.bma-cancel-edit');
    const openSettingsBtn = root.querySelector('.bma-open-settings');
    const scrollFormBtn = root.querySelector('.bma-scroll-form');
    const modalCloseBtns = root.querySelectorAll('.bma-modal-close');
    const settingsSaveBtn = root.querySelector('.bma-settings-save');
    const textPresetList = root.querySelector('[data-bma-text-presets]');
    const textPresetAddBtn = root.querySelector('.bma-text-add');
    const textPresetSaveBtn = root.querySelector('.bma-text-save');
    const textPresetCancelBtn = root.querySelector('.bma-text-cancel');
    const headerEl = root.querySelector('.bma-header');

    let editId = null;
    let swapSourceId = null;
    let textPresetDraft = [];
    let rawMonthDigits = '';

    function persist(){
      saveDoc(doc);
    }

    function setDefaultReminderFields(){
      const defaults = normalizeReminders(state.settings.defaultReminders || DEFAULT_REMINDERS);
      formFields.remSeven.checked = defaults.includes(7);
      formFields.remZero.checked = defaults.includes(0);
      const extras = defaults.filter(val => val !== 7 && val !== 0);
      formFields.remExtra.value = extras.join(', ');
    }

    function setSettingsReminderFields(){
      const defaults = normalizeReminders(state.settings.defaultReminders || DEFAULT_REMINDERS);
      settingsFields.remSeven.checked = defaults.includes(7);
      settingsFields.remZero.checked = defaults.includes(0);
      const extras = defaults.filter(val => val !== 7 && val !== 0);
      settingsFields.remExtra.value = extras.join(', ');
    }

    function buildLayerOptions(selectEl, selectedId){
      selectEl.innerHTML = '';
      layers.forEach(layer => {
        const option = document.createElement('option');
        option.value = layer.id;
        option.textContent = layer.name || layer.id;
        selectEl.appendChild(option);
      });
      selectEl.value = selectedId || layers[0]?.id || '';
    }

    function renderLayerPreview(){
      settingsFields.preview.innerHTML = '';
      layers.forEach(layer => {
        const card = document.createElement('div');
        card.className = 'bma-layer-preview';
        card.style.setProperty('--bma-layer-bg', layer.module?.bg || '');
        card.style.setProperty('--bma-layer-text', layer.module?.text || '');
        card.style.setProperty('--bma-layer-border', layer.module?.border || '');
        card.innerHTML = `
          <div class="bma-layer-name">${layer.name}</div>
          <div class="bma-layer-sample">Modulfläche / Text / Rahmen</div>
        `;
        settingsFields.preview.appendChild(card);
      });
    }

    function openModal(){
      modalEl.classList.add('open');
      document.body.classList.add('bma-modal-open');
    }

    function closeModal(){
      modalEl.classList.remove('open');
      document.body.classList.remove('bma-modal-open');
    }

    function openTextModal(){
      textModalEl.classList.add('open');
      document.body.classList.add('bma-modal-open');
    }

    function closeTextModal(){
      textModalEl.classList.remove('open');
      document.body.classList.remove('bma-modal-open');
    }

    function createPreset(id){
      return { id, title: '', body: '' };
    }

    function syncPresetDraft(){
      textPresetDraft = (state.settings.textPresets || []).map(preset => ({ ...preset }));
    }

    function renderPresetList(){
      textPresetList.innerHTML = '';
      if(!textPresetDraft.length){
        const empty = document.createElement('div');
        empty.className = 'bma-text-presets-empty';
        empty.textContent = 'Noch keine Textbausteine hinterlegt. Lege einen neuen Textbaustein an.';
        textPresetList.appendChild(empty);
        return;
      }
      textPresetDraft.forEach((preset, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'bma-text-preset';
        wrapper.innerHTML = `
          <label>
            Titel
            <input type="text" value="${preset.title || ''}" data-preset-field="title" data-preset-index="${index}" placeholder="z. B. Standortinfo" />
          </label>
          <label>
            Text
            <textarea data-preset-field="body" data-preset-index="${index}" placeholder="Dein Textbaustein...">${preset.body || ''}</textarea>
          </label>
          <div class="bma-text-preset-actions">
            <button type="button" class="bma-btn bma-btn-secondary" data-preset-action="remove" data-preset-index="${index}">Entfernen</button>
          </div>
        `;
        textPresetList.appendChild(wrapper);
      });
    }

    function resetForm(){
      formFields.name.value = '';
      formFields.asset.value = '';
      formFields.desc.value = '';
      formFields.month.value = '';
      formFields.type.value = 'Gerät';
      formFields.kind.value = 'DGUV';
      setDefaultReminderFields();
      editId = null;
      swapSourceId = null;
      if(swapFields.banner){
        swapFields.banner.style.display = 'none';
      }
      if(swapFields.info){
        swapFields.info.textContent = '';
      }
      if(swapFields.deleteOld){
        swapFields.deleteOld.checked = false;
      }
      cancelBtn.style.display = 'none';
      saveBtn.textContent = 'Eintrag speichern';
    }

    function collectReminders(isSettings){
      const seven = isSettings ? settingsFields.remSeven.checked : formFields.remSeven.checked;
      const zero = isSettings ? settingsFields.remZero.checked : formFields.remZero.checked;
      const extraRaw = isSettings ? settingsFields.remExtra.value : formFields.remExtra.value;
      const extras = parseReminderInput(extraRaw);
      const list = [];
      if(seven) list.push(7);
      if(zero) list.push(0);
      list.push(...extras);
      return normalizeReminders(list);
    }

    function buildMailTemplate(item){
      const subject = `Betriebsmittel bei mir: ${item.name}`;
      const assetLine = item.assetNumber ? `Betriebsmittelnummer: ${item.assetNumber}` : 'Betriebsmittelnummer: (nicht hinterlegt)';
      const bodyLines = [
        `Hallo zusammen,`,
        '',
        `das folgende Betriebsmittel befindet sich aktuell bei mir:`,
        `- Name: ${item.name}`,
        `- Kategorie: ${item.type}`,
        `- Prüftyp: ${item.kind}`,
        `- Ablaufmonat: ${formatMonth(item.expiryMonth)} (${formatDate(item.expiryDate)})`,
        `- ${assetLine}`,
        item.desc ? `- Hinweis: ${item.desc}` : null,
        '',
        `Bitte berücksichtigt den Standort bzw. aktualisiert die Trackbarkeit.`,
        '',
        `Danke & viele Grüße`
      ].filter(Boolean);
      return { subject, body: bodyLines.join('\n') };
    }

    function fillTextPreset(preset, item){
      const descLine = item.desc ? item.desc : '(keine Beschreibung)';
      const assetNumber = item.assetNumber ? item.assetNumber : '(nicht hinterlegt)';
      const replacements = {
        '{name}': item.name,
        '{assetNumber}': assetNumber,
        '{type}': item.type,
        '{kind}': item.kind,
        '{expiryMonth}': formatMonth(item.expiryMonth),
        '{expiryDate}': formatDate(item.expiryDate),
        '{desc}': descLine
      };
      let text = preset.body || '';
      Object.entries(replacements).forEach(([token, value]) => {
        text = text.split(token).join(value);
      });
      return text;
    }

    function copyPresetText(preset, item){
      const content = fillTextPreset(preset, item);
      if(navigator?.clipboard?.writeText){
        navigator.clipboard.writeText(content)
          .then(() => alert('Textbaustein wurde in die Zwischenablage kopiert.'))
          .catch(() => prompt('Kopiere den Textbaustein:', content));
      }else{
        prompt('Kopiere den Textbaustein:', content);
      }
    }

    function copyMailTemplate(item){
      const template = buildMailTemplate(item);
      const content = `Betreff: ${template.subject}\n\n${template.body}`;
      if(navigator?.clipboard?.writeText){
        navigator.clipboard.writeText(content)
          .then(() => alert('Mailvordruck wurde in die Zwischenablage kopiert.'))
          .catch(() => prompt('Kopiere den Mailvordruck:', content));
      }else{
        prompt('Kopiere den Mailvordruck:', content);
      }
    }

    function saveItem(){
      const name = formFields.name.value.trim();
      let month = formFields.month.value.trim();
      const normalizedMonth = normalizeMonthInput(month, rawMonthDigits);
      if(normalizedMonth){
        month = normalizedMonth;
        formFields.month.value = normalizedMonth;
      }else if(!month || !month.includes('-')){
        month = '';
      }
      if(!name || !month){
        alert('Bitte Name und Ablaufmonat angeben.');
        return;
      }
      const assetNumber = formFields.asset.value.trim();
      const item = {
        id: editId || `item-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        name,
        assetNumber: assetNumber || '',
        type: formFields.type.value,
        kind: formFields.kind.value,
        desc: formFields.desc.value.trim(),
        expiryMonth: month,
        reminders: collectReminders(false),
        updatedAt: new Date().toISOString()
      };
      if(editId){
        const idx = state.items.findIndex(entry => entry.id === editId);
        if(idx >= 0){
          state.items[idx] = item;
        }
      }else{
        state.items.push(item);
      }
      if(!editId && swapSourceId && swapFields.deleteOld?.checked){
        const idx = state.items.findIndex(entry => entry.id === swapSourceId);
        if(idx >= 0){
          state.items.splice(idx, 1);
        }
      }
      persist();
      resetForm();
      renderList();
    }

    function focusNextField(target, fields){
      const index = fields.indexOf(target);
      if(index === -1) return;
      for(let i=index + 1;i<fields.length;i+=1){
        const next = fields[i];
        if(next && !next.disabled){
          next.focus();
          return;
        }
      }
    }

    function setupFormNavigation(){
      const orderedFields = [
        formFields.name,
        formFields.asset,
        formFields.type,
        formFields.month,
        formFields.kind,
        formFields.desc,
        formFields.remSeven,
        formFields.remZero,
        formFields.remExtra,
        saveBtn
      ];

      orderedFields.forEach(field => {
        if(!field) return;
        field.addEventListener('keydown', event => {
          if(event.key !== 'Enter') return;
          if(field === saveBtn) return;
          const isTextarea = field.tagName === 'TEXTAREA';
          if(isTextarea && !event.ctrlKey && !event.metaKey){
            return;
          }
          event.preventDefault();
          if(isTextarea && (event.ctrlKey || event.metaKey)){
            saveItem();
            return;
          }
          if(field.type === 'checkbox'){
            field.checked = !field.checked;
          }
          focusNextField(field, orderedFields);
        });
      });
    }

    function normalizeAndFocusKind(){
      const normalizedMonth = normalizeMonthInput(formFields.month.value.trim(), rawMonthDigits);
      if(normalizedMonth){
        formFields.month.value = normalizedMonth;
      }
      rawMonthDigits = '';
      if(formFields.kind){
        formFields.kind.focus();
      }
    }

    function editItem(item){
      editId = item.id;
      swapSourceId = null;
      formFields.name.value = item.name;
      formFields.asset.value = item.assetNumber || '';
      formFields.type.value = item.type;
      formFields.kind.value = item.kind;
      formFields.desc.value = item.desc || '';
      formFields.month.value = item.expiryMonth;
      formFields.remSeven.checked = (item.reminders || []).includes(7);
      formFields.remZero.checked = (item.reminders || []).includes(0);
      const extras = (item.reminders || []).filter(val => val !== 7 && val !== 0);
      formFields.remExtra.value = extras.join(', ');
      saveBtn.textContent = 'Änderungen speichern';
      cancelBtn.style.display = 'inline-flex';
      if(swapFields.banner){
        swapFields.banner.style.display = 'none';
      }
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function startSwap(item){
      editId = null;
      swapSourceId = item.id;
      formFields.name.value = item.name;
      formFields.asset.value = item.assetNumber || '';
      formFields.type.value = item.type;
      formFields.kind.value = item.kind;
      formFields.desc.value = item.desc || '';
      formFields.month.value = '';
      formFields.remSeven.checked = (item.reminders || []).includes(7);
      formFields.remZero.checked = (item.reminders || []).includes(0);
      const extras = (item.reminders || []).filter(val => val !== 7 && val !== 0);
      formFields.remExtra.value = extras.join(', ');
      saveBtn.textContent = 'Tausch speichern';
      cancelBtn.style.display = 'none';
      if(swapFields.banner){
        swapFields.banner.style.display = 'flex';
      }
      if(swapFields.info){
        swapFields.info.textContent = `Altgerät: ${item.name} (${formatMonth(item.expiryMonth)})`;
      }
      if(swapFields.deleteOld){
        swapFields.deleteOld.checked = true;
      }
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function deleteItem(id){
      const idx = state.items.findIndex(entry => entry.id === id);
      if(idx >= 0){
        state.items.splice(idx,1);
        persist();
        renderList();
      }
    }

    function getFilteredItems(){
      const query = searchInput.value.trim().toLowerCase();
      const status = statusSelect.value;
      const sorted = [...state.items].map(item => ({
        ...item,
        expiryDate: getExpiryDate(item.expiryMonth),
        status: getStatus(getExpiryDate(item.expiryMonth))
      }));

      const filtered = sorted.filter(item => {
        if(query){
          const haystack = `${item.name} ${item.type} ${item.kind} ${item.desc} ${item.assetNumber || ''}`.toLowerCase();
          if(!haystack.includes(query)) return false;
        }
        if(status === 'all') return true;
        if(status === 'future') return item.status.tone === 'default' && item.status.days !== null && item.status.days > 31;
        return item.status.tone === status;
      });

      filtered.sort((a,b) => {
        const aTime = a.expiryDate ? a.expiryDate.getTime() : 0;
        const bTime = b.expiryDate ? b.expiryDate.getTime() : 0;
        return sortSelect.value === 'asc' ? aTime - bTime : bTime - aTime;
      });
      return filtered;
    }

    function updateSummary(items){
      const soonCount = items.filter(item => item.status.tone === 'soon').length;
      const overdueCount = items.filter(item => item.status.tone === 'overdue').length;
      if(summaryEls.total) summaryEls.total.textContent = String(items.length);
      if(summaryEls.soon) summaryEls.soon.textContent = String(soonCount);
      if(summaryEls.overdue) summaryEls.overdue.textContent = String(overdueCount);

      const reminderDates = items.flatMap(item => computeReminderDates(item.expiryDate, item.reminders || []));
      const next = getNextReminder(reminderDates);
      if(summaryEls.next){
        summaryEls.next.textContent = next ? `${formatDate(next.date)} (${next.days} Tage)` : '-';
      }
    }

    function renderList(){
      const items = getFilteredItems();
      listEl.innerHTML = '';
      if(!items.length){
        const empty = document.createElement('div');
        empty.className = 'bma-empty';
        empty.textContent = 'Noch keine Betriebsmittel erfasst. Nutze das Formular, um Einträge anzulegen.';
        listEl.appendChild(empty);
        updateSummary(items);
        return;
      }

      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'bma-card bma-item';
        const reminderDates = computeReminderDates(item.expiryDate, item.reminders || []);
        const nextReminder = getNextReminder(reminderDates);
        const statusClass = item.status.tone === 'default' ? '' : item.status.tone;
        const daysLabel = item.status.days === null ? '' : `(${item.status.days} Tage)`;

        const isExpanded = expandedItems.has(item.id);
        card.classList.toggle('is-expanded', isExpanded);
        card.setAttribute('aria-expanded', String(isExpanded));
        card.innerHTML = `
          <div class="bma-item-header">
            <div>
              <div class="bma-item-type">${item.type} · ${item.kind}</div>
              <h4 class="bma-item-title">${item.name}</h4>
            </div>
            <div class="bma-status ${statusClass}">${item.status.label} ${daysLabel}</div>
          </div>
          <div class="bma-item-details">
            <div class="bma-row">
              <span class="bma-pill">Ablauf: ${formatMonth(item.expiryMonth)}</span>
              <span class="bma-pill">Stichtag: ${formatDate(item.expiryDate)}</span>
              ${item.assetNumber ? `<span class="bma-pill">Betriebsmittel-Nr.: ${item.assetNumber}</span>` : ''}
              ${nextReminder ? `<span class="bma-pill bma-tag-accent">Nächster Reminder: ${formatDate(nextReminder.date)}</span>` : ''}
            </div>
            <div class="bma-desc">${item.desc ? item.desc : 'Keine Beschreibung hinterlegt.'}</div>
            <div class="bma-reminders">
              <div><strong>Reminder:</strong></div>
              <div class="bma-row">
                ${reminderDates.length ? reminderDates.map(reminder => `
                  <span class="bma-reminder-tag">${reminder.days} Tage vorher · ${formatDate(reminder.date)}</span>
                `).join('') : '<span class="bma-reminder-tag">Keine Reminder gesetzt.</span>'}
              </div>
            </div>
            ${state.settings.textPresets?.length ? `
              <div class="bma-item-presets" data-bma-presets></div>
            ` : ''}
            <div class="bma-item-actions">
              <button type="button" class="primary" data-action="edit">Bearbeiten</button>
              <button type="button" data-action="swap">Tauschen</button>
              <button type="button" data-action="delete">Löschen</button>
            </div>
          </div>
        `;
        card.addEventListener('click', () => {
          if(expandedItems.has(item.id)){
            expandedItems.delete(item.id);
          }else{
            expandedItems.add(item.id);
          }
          renderList();
        });
        const editBtn = card.querySelector('[data-action="edit"]');
        const swapBtn = card.querySelector('[data-action="swap"]');
        const deleteBtn = card.querySelector('[data-action="delete"]');
        editBtn.addEventListener('click', event => { event.stopPropagation(); editItem(item); });
        swapBtn.addEventListener('click', event => { event.stopPropagation(); startSwap(item); });
        deleteBtn.addEventListener('click', event => { event.stopPropagation(); deleteItem(item.id); });
        const presetWrap = card.querySelector('[data-bma-presets]');
        if(presetWrap && state.settings.textPresets?.length){
          state.settings.textPresets.forEach(preset => {
            if(!preset?.title) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = preset.title;
            btn.addEventListener('click', event => {
              event.stopPropagation();
              copyPresetText(preset, item);
            });
            presetWrap.appendChild(btn);
          });
        }
        listEl.appendChild(card);
      });

      updateSummary(items);
    }

    function syncSettings(){
      buildLayerOptions(settingsFields.cardLayer, state.settings.cardLayer);
      buildLayerOptions(settingsFields.accentLayer, state.settings.accentLayer);
      renderLayerPreview();
      setSettingsReminderFields();
      applyLayerVars(rootEl, layers, state.settings);
    }

    function applySettings(){
      state.settings.cardLayer = settingsFields.cardLayer.value;
      state.settings.accentLayer = settingsFields.accentLayer.value;
      state.settings.defaultReminders = collectReminders(true);
      if(!state.settings.defaultReminders.length){
        state.settings.defaultReminders = DEFAULT_REMINDERS.slice();
      }
      persist();
      setDefaultReminderFields();
      applyLayerVars(rootEl, layers, state.settings);
      renderList();
    }

    function applyTextPresets(){
      state.settings.textPresets = textPresetDraft.map(preset => ({
        id: preset.id,
        title: preset.title.trim(),
        body: preset.body.trim()
      })).filter(preset => preset.title || preset.body);
      persist();
    }

    function updatePresetField(index, field, value){
      const target = textPresetDraft[index];
      if(!target) return;
      target[field] = value;
    }

    applyLayerVars(rootEl, layers, state.settings);
    setDefaultReminderFields();
    renderList();
    syncSettings();
    setupFormNavigation();

    saveBtn.addEventListener('click', saveItem);
    cancelBtn.addEventListener('click', resetForm);
    if(swapFields.cancel){
      swapFields.cancel.addEventListener('click', resetForm);
    }
    formFields.month.addEventListener('focus', () => {
      rawMonthDigits = '';
    });
    formFields.month.addEventListener('keydown', event => {
      if(event.key === 'Tab' && !event.shiftKey){
        event.preventDefault();
        normalizeAndFocusKind();
        return;
      }
      if(event.ctrlKey || event.metaKey || event.altKey) return;
      if(event.key === 'Backspace'){
        rawMonthDigits = rawMonthDigits.slice(0, -1);
        return;
      }
      if(event.key === 'Delete'){
        rawMonthDigits = '';
        return;
      }
      if(/^\d$/.test(event.key)){
        rawMonthDigits += event.key;
      }
    });
    formFields.month.addEventListener('blur', () => {
      const normalizedMonth = normalizeMonthInput(formFields.month.value.trim(), rawMonthDigits);
      if(normalizedMonth){
        formFields.month.value = normalizedMonth;
      }
      rawMonthDigits = '';
    });
    searchInput.addEventListener('input', renderList);
    statusSelect.addEventListener('change', renderList);
    sortSelect.addEventListener('change', renderList);
    openSettingsBtn.addEventListener('click', () => { syncSettings(); openModal(); });
    scrollFormBtn.addEventListener('click', () => formEl.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    settingsSaveBtn.addEventListener('click', () => { applySettings(); closeModal(); });
    modalCloseBtns.forEach(btn => btn.addEventListener('click', event => {
      const target = event.currentTarget;
      if(target.closest('[data-bma-text-modal]')){
        closeTextModal();
      }else{
        closeModal();
      }
    }));
    modalEl.addEventListener('click', event => { if(event.target === modalEl) closeModal(); });
    if(headerEl){
      headerEl.addEventListener('contextmenu', event => {
        event.preventDefault();
        syncPresetDraft();
        renderPresetList();
        openTextModal();
      });
    }
    if(textPresetAddBtn){
      textPresetAddBtn.addEventListener('click', () => {
        textPresetDraft.push(createPreset(`preset-${Date.now()}-${Math.random().toString(36).slice(2,6)}`));
        renderPresetList();
      });
    }
    if(textPresetList){
      textPresetList.addEventListener('input', event => {
        const target = event.target;
        const index = Number(target?.dataset?.presetIndex);
        const field = target?.dataset?.presetField;
        if(!Number.isFinite(index) || !field) return;
        updatePresetField(index, field, target.value);
      });
      textPresetList.addEventListener('click', event => {
        const target = event.target;
        if(target?.dataset?.presetAction !== 'remove') return;
        const index = Number(target?.dataset?.presetIndex);
        if(!Number.isFinite(index)) return;
        textPresetDraft.splice(index, 1);
        renderPresetList();
      });
    }
    if(textPresetSaveBtn){
      textPresetSaveBtn.addEventListener('click', () => {
        applyTextPresets();
        closeTextModal();
      });
    }
    if(textPresetCancelBtn){
      textPresetCancelBtn.addEventListener('click', closeTextModal);
    }
    if(textModalEl){
      textModalEl.addEventListener('click', event => { if(event.target === textModalEl) closeTextModal(); });
    }
  }

  window.renderBetriebsmittelAblauf = render;
})();
