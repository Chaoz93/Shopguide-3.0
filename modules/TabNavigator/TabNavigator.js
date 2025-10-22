(function(){
  const STYLE_ID = 'tabnav-module-styles';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
    .tabnav-root{height:100%;width:100%;box-sizing:border-box;padding:.55rem;display:flex;flex-direction:column;gap:.5rem;}
    .tabnav-surface{flex:1;display:flex;flex-direction:column;gap:.6rem;padding:.8rem;border-radius:var(--module-border-radius,.9rem);
      background:var(--module-bg,#101826);
      border:1px solid var(--module-border-color,rgba(148,163,184,.22));
      color:var(--module-header-text,#e2e8f0);box-shadow:0 10px 24px rgba(8,15,35,.25);
    }
    .tabnav-surface.tabnav-surface-compact{padding-top:.55rem;padding-bottom:.7rem;gap:.5rem;}
    .tabnav-surface:focus{outline:2px solid rgba(59,130,246,.45);outline-offset:3px;}
    .tabnav-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;}
    .tabnav-title-wrap{display:flex;flex-direction:column;gap:.25rem;min-width:0;}
    .tabnav-title{margin:0;font-size:clamp(.95rem,1vw + .3vh,1.15rem);font-weight:600;letter-spacing:.2px;}
    .tabnav-pattern-label{font-size:.78rem;opacity:.75;line-height:1.35;}
    .tabnav-toggle-group{display:flex;flex-direction:column;gap:.45rem;margin-top:.6rem;}
    .tabnav-toggle{display:flex;align-items:center;gap:.55rem;padding:.55rem .7rem;border-radius:.7rem;
      background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.22);cursor:pointer;font-size:.85rem;font-weight:600;
      transition:border-color .15s ease,background .15s ease,transform .12s ease;}
    .tabnav-toggle:focus-within{border-color:rgba(59,130,246,.55);background:rgba(37,99,235,.18);}
    .tabnav-toggle.active{border-color:rgba(59,130,246,.55);background:rgba(37,99,235,.18);}
    .tabnav-toggle input{width:1.05rem;height:1.05rem;}
    .tabnav-toggle span{flex:1;}
    .tabnav-buttons{flex:1;min-height:0;display:grid;gap:.5rem;align-content:flex-start;}
    .tabnav-buttons[data-pattern="grid"]{grid-template-columns:repeat(auto-fit,minmax(120px,1fr));}
    .tabnav-buttons[data-pattern="columns"]{grid-template-columns:repeat(2,minmax(0,1fr));}
    .tabnav-buttons[data-pattern="list"]{display:flex;flex-direction:column;}
    .tabnav-button{appearance:none;border:none;border-radius:.75rem;padding:.7rem .9rem;text-align:center;cursor:pointer;
      background:rgba(15,23,42,.78);
      color:inherit;font-size:clamp(.9rem,.9vw + .2vh,1.05rem);font-weight:600;letter-spacing:.2px;
      box-shadow:0 6px 16px rgba(8,15,35,.25);transition:transform .12s ease,box-shadow .12s ease,background .12s ease;
    }
    .tabnav-button:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(8,15,35,.32);background:rgba(37,99,235,.18);}
    .tabnav-button:active{transform:none;box-shadow:0 4px 12px rgba(8,15,35,.2);}
    .tabnav-empty{margin:0;font-size:.88rem;opacity:.75;text-align:center;padding:1.4rem 1rem;border-radius:.75rem;
      background:rgba(15,23,42,.55);border:1px dashed rgba(148,163,184,.24);
    }
    .tabnav-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:1.5rem;
      background:rgba(15,23,42,.45);backdrop-filter:blur(14px);z-index:3600;
    }
    .tabnav-overlay.open{display:flex;}
    .tabnav-dialog{width:min(640px,96vw);max-height:90vh;overflow:auto;border-radius:1rem;
      background:rgba(15,23,42,.9);color:#f8fafc;border:1px solid rgba(148,163,184,.25);
      box-shadow:0 18px 36px rgba(8,15,35,.45);display:flex;flex-direction:column;outline:none;
    }
    .tabnav-dialog-header{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;padding:1.1rem 1.25rem 1rem;}
    .tabnav-dialog-title{margin:0;font-size:1.12rem;font-weight:600;letter-spacing:.25px;}
    .tabnav-dialog-subtitle{margin:.15rem 0 0;font-size:.82rem;opacity:.78;line-height:1.45;}
    .tabnav-dialog-close{appearance:none;border:none;background:rgba(148,163,184,.18);color:inherit;font-size:1.4rem;line-height:1;
      border-radius:.75rem;width:2.3rem;height:2.3rem;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;
      transition:transform .15s ease,background .15s ease;
    }
    .tabnav-dialog-close:hover{transform:translateY(-1px);background:rgba(59,130,246,.35);}
    .tabnav-dialog-close:active{transform:none;}
    .tabnav-dialog-body{flex:1;min-height:0;padding:1.1rem 1.25rem 1.25rem;display:flex;flex-direction:column;gap:1.1rem;}
    .tabnav-section{display:flex;flex-direction:column;gap:.75rem;background:rgba(15,32,56,.55);border-radius:.9rem;
      border:1px solid rgba(148,163,184,.22);padding:.9rem 1rem;
    }
    .tabnav-section-title{margin:0;font-size:.95rem;font-weight:600;letter-spacing:.2px;}
    .tabnav-patterns{display:grid;gap:.55rem;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));}
    .tabnav-choice{display:flex;flex-direction:column;gap:.3rem;padding:.7rem .8rem;border-radius:.8rem;
      background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.22);cursor:pointer;transition:border-color .15s ease,background .15s ease;
    }
    .tabnav-choice input{width:1rem;height:1rem;}
    .tabnav-choice-header{display:flex;align-items:center;gap:.55rem;}
    .tabnav-choice-title{font-weight:600;font-size:.9rem;}
    .tabnav-choice-desc{font-size:.8rem;opacity:.75;line-height:1.4;}
    .tabnav-choice.active{border-color:rgba(59,130,246,.55);background:rgba(37,99,235,.22);}
    .tabnav-choice input{flex:0 0 auto;}
    .tabnav-mode-group{display:flex;flex-wrap:wrap;gap:.5rem;}
    .tabnav-mode-option{display:inline-flex;align-items:center;gap:.45rem;padding:.5rem .7rem;border-radius:.75rem;
      background:rgba(15,23,42,.5);border:1px solid rgba(148,163,184,.22);cursor:pointer;font-weight:600;font-size:.86rem;
      transition:border-color .15s ease,background .15s ease;
    }
    .tabnav-mode-option input{width:1rem;height:1rem;}
    .tabnav-mode-option.active{border-color:rgba(59,130,246,.5);background:rgba(37,99,235,.2);}
    .tabnav-hint{margin:0;font-size:.8rem;opacity:.78;line-height:1.4;}
    .tabnav-actions{display:flex;flex-wrap:wrap;gap:.5rem;}
    .tabnav-action{appearance:none;border:none;border-radius:.75rem;padding:.5rem .85rem;font-weight:600;font-size:.85rem;
      cursor:pointer;background:rgba(37,99,235,.82);color:#fff;box-shadow:0 10px 22px rgba(8,15,35,.3);
      transition:transform .15s ease,filter .15s ease;
    }
    .tabnav-action:hover{transform:translateY(-1px);filter:brightness(1.04);}
    .tabnav-action:active{transform:none;}
    .tabnav-action:disabled{opacity:.55;cursor:not-allowed;}
    .tabnav-action-secondary{background:rgba(148,163,184,.18);color:inherit;box-shadow:none;}
    .tabnav-tab-list{display:flex;flex-direction:column;gap:.5rem;max-height:240px;overflow:auto;padding-right:.2rem;}
    .tabnav-option{display:flex;align-items:center;gap:.55rem;padding:.5rem .6rem;border-radius:.7rem;
      background:rgba(15,23,42,.5);border:1px solid rgba(148,163,184,.2);font-size:.88rem;
    }
    .tabnav-option input{width:1rem;height:1rem;}
    .tabnav-option span{flex:1;min-width:0;}
    .tabnav-tab-list-empty{font-size:.82rem;opacity:.72;padding:.3rem 0;}
    .tabnav-dialog-footer{display:flex;justify-content:flex-end;padding:.9rem 1.25rem 1.15rem;border-top:1px solid rgba(148,163,184,.2);}
    .tabnav-footer-btn{appearance:none;border:none;border-radius:.75rem;padding:.55rem 1rem;font-weight:600;font-size:.9rem;
      background:rgba(37,99,235,.85);color:#fff;cursor:pointer;box-shadow:0 10px 22px rgba(8,15,35,.28);
      transition:transform .15s ease,filter .15s ease;
    }
    .tabnav-footer-btn:hover{transform:translateY(-1px);filter:brightness(1.04);}
    .tabnav-footer-btn:active{transform:none;}
    body.tabnav-modal-open{overflow:hidden;}
    @media(max-width:640px){
      .tabnav-root{padding:.45rem;}
      .tabnav-surface{padding:.65rem;}
      .tabnav-buttons[data-pattern="columns"]{grid-template-columns:repeat(1,minmax(0,1fr));}
    }
    `;
    document.head.appendChild(style);
  }

  const STORAGE_PREFIX = 'tabNavigatorState:';
  const PATTERN_OPTIONS = [
    { value: 'grid', label: 'Kacheln (Auto-Grid)', description: 'Flexible Kachelansicht mit automatischer Spaltenanzahl.' },
    { value: 'columns', label: 'Zweispaltig', description: 'Fixe Zwei-Spalten-Ansicht mit gleichmäßig verteilten Buttons.' },
    { value: 'list', label: 'Liste', description: 'Vertikale Liste über die gesamte Breite.' }
  ];

  function getStorage(){
    try { return (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : null; }
    catch (err) { return null; }
  }

  function loadState(id){
    if (!id) return null;
    const store = getStorage();
    if (!store) return null;
    try {
      const raw = store.getItem(STORAGE_PREFIX + id);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        pattern: typeof parsed.pattern === 'string' ? parsed.pattern : undefined,
        mode: parsed.mode === 'custom' ? 'custom' : 'all',
        selectedTabs: Array.isArray(parsed.selectedTabs) ? parsed.selectedTabs : [],
        showTitle: typeof parsed.showTitle === 'boolean' ? parsed.showTitle : undefined,
        showSubtitle: typeof parsed.showSubtitle === 'boolean' ? parsed.showSubtitle : undefined
      };
    } catch (err) {
      console.warn('TabNavigator: Konnte Zustand nicht laden', err);
      return null;
    }
  }

  function saveState(id, state){
    if (!id) return;
    const store = getStorage();
    if (!store) return;
    try {
      store.setItem(STORAGE_PREFIX + id, JSON.stringify({
        pattern: state.pattern,
        mode: state.mode,
        selectedTabs: state.selectedTabs,
        showTitle: state.showTitle,
        showSubtitle: state.showSubtitle
      }));
    } catch (err) {
      console.warn('TabNavigator: Konnte Zustand nicht speichern', err);
    }
  }

  function normalizeSelection(value){
    if (!Array.isArray(value)) return [];
    return value.map(entry => {
      if (!entry) return null;
      if (typeof entry === 'number') return { index: Number.isFinite(entry) ? entry : null, name: '' };
      if (typeof entry === 'string') return { index: null, name: entry };
      const idx = Number.parseInt(entry.index, 10);
      const name = typeof entry.name === 'string' ? entry.name : (typeof entry.label === 'string' ? entry.label : '');
      return { index: Number.isNaN(idx) ? null : idx, name };
    }).filter(Boolean);
  }

  function uniqueSelection(selection){
    const seen = new Set();
    return selection.filter(sel => {
      const key = `${Number.isInteger(sel.index) ? sel.index : 'x'}::${sel.name || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function readTabs(){
    const container = document.getElementById('tabs-container');
    if (!container) return [];
    const items = Array.from(container.querySelectorAll('.tab-item'));
    return items.map((item, fallbackIndex) => {
      const span = item.querySelector('span');
      const label = (span ? span.textContent : item.textContent || '').trim() || `Tab ${fallbackIndex + 1}`;
      const rawIdx = item.dataset.tabIndex;
      const parsed = rawIdx === undefined ? NaN : Number.parseInt(rawIdx, 10);
      const index = Number.isNaN(parsed) ? fallbackIndex : parsed;
      return { index, name: label };
    }).sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index;
      return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
    });
  }

  function matchesSelection(sel, tab){
    if (!sel || !tab) return false;
    if (Number.isInteger(sel.index) && sel.index === tab.index) return true;
    return !!sel.name && sel.name === tab.name;
  }

  function resolveSelection(selection, available){
    if (!selection.length) return { resolved: [], normalized: [] };
    const normalized = [];
    const resolved = [];
    const used = new Set();
    selection.forEach(sel => {
      if (!sel) return;
      let match = null;
      if (Number.isInteger(sel.index)) {
        match = available.find(tab => tab.index === sel.index);
      }
      if (!match && sel.name) {
        match = available.find(tab => tab.name === sel.name && !used.has(tab.index));
      }
      if (match && !used.has(match.index)) {
        resolved.push(match);
        normalized.push({ index: match.index, name: match.name });
        used.add(match.index);
      }
    });
    return { resolved, normalized };
  }

  window.renderTabNavigator = function renderTabNavigator(root, ctx){
    if (!root) return;

    if (typeof root.__tabNavCleanup === 'function') {
      root.__tabNavCleanup();
      root.__tabNavCleanup = null;
    }

    root.innerHTML = '';

    const moduleInstanceId = root.closest('.grid-stack-item')?.dataset.instanceId || null;
    const defaults = ctx?.moduleJson?.settings || {};
    const stored = loadState(moduleInstanceId);
    const state = {
      pattern: stored?.pattern || defaults.pattern || 'grid',
      mode: stored?.mode || defaults.mode || 'all',
      selectedTabs: uniqueSelection(normalizeSelection(stored?.selectedTabs || defaults.selectedTabs || [])),
      showTitle: typeof stored?.showTitle === 'boolean'
        ? stored.showTitle
        : (typeof defaults.showTitle === 'boolean' ? defaults.showTitle : true),
      showSubtitle: typeof stored?.showSubtitle === 'boolean'
        ? stored.showSubtitle
        : (typeof defaults.showSubtitle === 'boolean' ? defaults.showSubtitle : true)
    };

    let currentTabs = readTabs();
    let observer = null;
    let containerCheckTimer = null;
    let lastFocusedBeforeModal = null;

    const container = document.createElement('div');
    container.className = 'tabnav-root';
    root.appendChild(container);

    const surface = document.createElement('div');
    surface.className = 'tabnav-surface';
    surface.setAttribute('tabindex', '0');
    surface.setAttribute('role', 'group');
    container.appendChild(surface);

    const header = document.createElement('div');
    header.className = 'tabnav-header';
    surface.appendChild(header);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'tabnav-title-wrap';
    header.appendChild(titleWrap);

    const title = document.createElement('h2');
    title.className = 'tabnav-title';
    title.textContent = defaults.title || ctx?.moduleJson?.name || 'Tab Navigator';
    titleWrap.appendChild(title);
    surface.setAttribute('aria-label', `${title.textContent} – Rechtsklick für Einstellungen`);

    const patternLabel = document.createElement('div');
    patternLabel.className = 'tabnav-pattern-label';
    titleWrap.appendChild(patternLabel);

    applyPatternLabel();
    applyHeaderVisibility();

    const buttonsWrap = document.createElement('div');
    buttonsWrap.className = 'tabnav-buttons';
    buttonsWrap.dataset.pattern = state.pattern;
    surface.appendChild(buttonsWrap);

    const emptyState = document.createElement('div');
    emptyState.className = 'tabnav-empty';
    emptyState.textContent = 'Keine Tabs verfügbar.';
    surface.appendChild(emptyState);

    const patternRadioName = `tabnav-pattern-${moduleInstanceId || Math.random().toString(36).slice(2, 8)}`;
    const modeRadioName = `tabnav-mode-${moduleInstanceId || Math.random().toString(36).slice(2, 8)}`;

    const overlay = buildOverlay();
    const dialog = overlay.querySelector('.tabnav-dialog');
    const closeBtn = overlay.querySelector('[data-action="close"]');
    const doneBtn = overlay.querySelector('[data-action="done"]');
    const selectAllBtn = overlay.querySelector('[data-action="select-all"]');
    const showAllBtn = overlay.querySelector('[data-action="show-all"]');
    const clearBtn = overlay.querySelector('[data-action="clear-selection"]');
    const overlayHint = overlay.querySelector('[data-role="tab-hint"]');
    let overlayTabList = overlay.querySelector('[data-role="tab-list"]');
    let patternRadios = Array.from(overlay.querySelectorAll(`input[name="${patternRadioName}"]`));
    let modeRadios = Array.from(overlay.querySelectorAll(`input[name="${modeRadioName}"]`));
    const displayToggleInputs = {
      showTitle: overlay.querySelector('input[data-setting="showTitle"]'),
      showSubtitle: overlay.querySelector('input[data-setting="showSubtitle"]')
    };

    function buildOverlay(){
      const overlayEl = document.createElement('div');
      overlayEl.className = 'tabnav-overlay';
      overlayEl.dataset.instanceId = moduleInstanceId || '';
      const patternChoices = PATTERN_OPTIONS.map(opt => {
        const escapedLabel = opt.label;
        const escapedDesc = opt.description;
        return `<label class="tabnav-choice"><div class="tabnav-choice-header"><input type="radio" name="${patternRadioName}" value="${opt.value}" /><span class="tabnav-choice-title">${escapedLabel}</span></div><span class="tabnav-choice-desc">${escapedDesc}</span></label>`;
      }).join('');
      overlayEl.innerHTML = `
        <div class="tabnav-dialog" role="dialog" aria-modal="true" aria-label="Tab Navigator konfigurieren" tabindex="-1">
          <div class="tabnav-dialog-header">
            <div>
              <h2 class="tabnav-dialog-title">Tab-Navigation konfigurieren</h2>
              <p class="tabnav-dialog-subtitle">Lege fest, welche Tabs angezeigt werden und wie die Buttons angeordnet sind. Dieses Menü erreichst du per Rechtsklick im Modul.</p>
            </div>
            <button type="button" class="tabnav-dialog-close" data-action="close" aria-label="Schließen">×</button>
          </div>
          <div class="tabnav-dialog-body">
            <section class="tabnav-section">
              <h3 class="tabnav-section-title">Darstellung</h3>
              <div class="tabnav-patterns" data-role="pattern-group">${patternChoices}</div>
              <div class="tabnav-toggle-group" data-role="display-toggles">
                <label class="tabnav-toggle"><input type="checkbox" data-setting="showTitle" /> <span>Modulname anzeigen</span></label>
                <label class="tabnav-toggle"><input type="checkbox" data-setting="showSubtitle" /> <span>Hinweistext anzeigen</span></label>
              </div>
            </section>
            <section class="tabnav-section">
              <h3 class="tabnav-section-title">Angezeigte Tabs</h3>
              <div class="tabnav-mode-group">
                <label class="tabnav-mode-option"><input type="radio" name="${modeRadioName}" value="all" /> <span>Alle Tabs</span></label>
                <label class="tabnav-mode-option"><input type="radio" name="${modeRadioName}" value="custom" /> <span>Ausgewählte Tabs</span></label>
              </div>
              <p class="tabnav-hint" data-role="tab-hint"></p>
              <div class="tabnav-actions">
                <button type="button" class="tabnav-action" data-action="show-all">Alle Tabs anzeigen</button>
                <button type="button" class="tabnav-action" data-action="select-all">Alle auswählen</button>
                <button type="button" class="tabnav-action tabnav-action-secondary" data-action="clear-selection">Auswahl leeren</button>
              </div>
              <div class="tabnav-tab-list" data-role="tab-list"></div>
            </section>
          </div>
          <div class="tabnav-dialog-footer">
            <button type="button" class="tabnav-footer-btn" data-action="done">Fertig</button>
          </div>
        </div>`;
      document.body.appendChild(overlayEl);
      return overlayEl;
    }

    function openOverlay(triggerEl){
      if (triggerEl instanceof HTMLElement) {
        lastFocusedBeforeModal = triggerEl;
      } else {
        lastFocusedBeforeModal = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      overlay.classList.add('open');
      document.body.classList.add('tabnav-modal-open');
      updatePatternRadios();
      updateModeRadios();
      syncDisplayToggles();
      updateOverlayTabs();
      setTimeout(() => dialog.focus(), 0);
    }

    function closeOverlay(){
      overlay.classList.remove('open');
      if (!document.querySelector('.tabnav-overlay.open')) {
        document.body.classList.remove('tabnav-modal-open');
      }
      if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
        if (document.contains(lastFocusedBeforeModal)) {
          lastFocusedBeforeModal.focus();
          return;
        }
      }
      if (typeof surface.focus === 'function') {
        surface.focus();
      }
    }

    function persist(){
      if (!moduleInstanceId) return;
      saveState(moduleInstanceId, state);
    }

    function applyPatternLabel(){
      const opt = PATTERN_OPTIONS.find(o => o.value === state.pattern);
      const pieces = [];
      if (opt) pieces.push(`Darstellung: ${opt.label}`);
      pieces.push('Rechtsklick für Einstellungen');
      patternLabel.textContent = state.showSubtitle ? pieces.join(' • ') : '';
    }

    function applyHeaderVisibility(){
      const showTitle = !!state.showTitle;
      const showSubtitle = !!state.showSubtitle;
      if (title) title.style.display = showTitle ? '' : 'none';
      if (patternLabel) patternLabel.style.display = showSubtitle ? '' : 'none';
      const headerVisible = showTitle || showSubtitle;
      if (header) header.style.display = headerVisible ? '' : 'none';
      if (titleWrap) titleWrap.style.display = headerVisible ? '' : 'none';
      surface.classList.toggle('tabnav-surface-compact', !headerVisible);
    }

    function updatePatternRadios(){
      patternRadios.forEach(radio => {
        const isChecked = radio.value === state.pattern;
        radio.checked = isChecked;
        const label = radio.closest('.tabnav-choice');
        if (label) label.classList.toggle('active', isChecked);
      });
    }

    function updateModeRadios(){
      modeRadios.forEach(radio => {
        const isChecked = radio.value === state.mode;
        radio.checked = isChecked;
        const label = radio.closest('.tabnav-mode-option');
        if (label) label.classList.toggle('active', isChecked);
      });
    }

    function syncDisplayToggles(){
      Object.entries(displayToggleInputs).forEach(([key, input]) => {
        if (!input) return;
        const isChecked = !!state[key];
        input.checked = isChecked;
        const label = input.closest('.tabnav-toggle');
        if (label) label.classList.toggle('active', isChecked);
      });
    }

    syncDisplayToggles();

    function updateOverlayTabs(){
      if (!overlayTabList) return;
      overlayTabList.innerHTML = '';
      const tabs = currentTabs.slice();
      if (!tabs.length) {
        const info = document.createElement('div');
        info.className = 'tabnav-tab-list-empty';
        info.textContent = 'Es sind noch keine Tabs vorhanden.';
        overlayTabList.appendChild(info);
        if (overlayHint) {
          overlayHint.textContent = 'Sobald Tabs erstellt wurden, können sie hier ausgewählt werden.';
        }
        if (selectAllBtn) selectAllBtn.disabled = true;
        if (showAllBtn) showAllBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true;
        return;
      }
      if (selectAllBtn) selectAllBtn.disabled = false;
      if (showAllBtn) showAllBtn.disabled = false;
      if (clearBtn) clearBtn.disabled = false;
      const isAllMode = state.mode !== 'custom';
      if (overlayHint) {
        overlayHint.textContent = isAllMode
          ? 'Alle Tabs werden angezeigt. Wähle „Ausgewählte Tabs“, um eine individuelle Auswahl festzulegen.'
          : (state.selectedTabs.length
              ? 'Aktiviere oder deaktiviere Tabs, um die Navigation anzupassen.'
              : 'Es sind keine Tabs ausgewählt. Das Modul bleibt leer, bis du mindestens einen Tab aktivierst.');
      }
      tabs.forEach(tab => {
        const label = document.createElement('label');
        label.className = 'tabnav-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = String(tab.index);
        const isSelected = isAllMode || state.selectedTabs.some(sel => matchesSelection(sel, tab));
        input.checked = isSelected;
        label.appendChild(input);
        const span = document.createElement('span');
        span.textContent = tab.name;
        label.appendChild(span);
        input.addEventListener('change', () => {
          if (state.mode !== 'custom') {
            state.mode = 'custom';
            updateModeRadios();
          }
          if (input.checked) {
            if (!state.selectedTabs.some(sel => matchesSelection(sel, tab))) {
              state.selectedTabs.push({ index: tab.index, name: tab.name });
              state.selectedTabs = uniqueSelection(state.selectedTabs);
            }
          } else {
            state.selectedTabs = state.selectedTabs.filter(sel => !matchesSelection(sel, tab));
          }
          if (state.selectedTabs.length === currentTabs.length) {
            state.mode = 'all';
            state.selectedTabs = [];
            updateModeRadios();
          }
          persist();
          renderButtons();
        });
        overlayTabList.appendChild(label);
      });
    }

    function renderButtons(){
      currentTabs = readTabs();
      const { resolved, normalized } = resolveSelection(state.selectedTabs, currentTabs);
      if (state.mode === 'custom' && JSON.stringify(normalized) !== JSON.stringify(state.selectedTabs)) {
        state.selectedTabs = uniqueSelection(normalized);
        persist();
      }
      const tabsToDisplay = state.mode === 'custom' ? resolved : currentTabs.slice();
      buttonsWrap.innerHTML = '';
      buttonsWrap.dataset.pattern = state.pattern;
      if (tabsToDisplay.length) {
        buttonsWrap.style.display = '';
        emptyState.style.display = 'none';
        tabsToDisplay.forEach(tab => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tabnav-button';
          btn.dataset.tabIndex = String(tab.index);
          btn.textContent = tab.name;
          btn.addEventListener('click', () => {
            try {
              if (typeof window.activateTab === 'function') {
                window.activateTab(tab.index);
              } else {
                const tabsContainer = document.getElementById('tabs-container');
                const target = tabsContainer?.querySelector(`.tab-item[data-tab-index="${tab.index}"]`);
                if (target) target.dispatchEvent(new Event('click', { bubbles: true }));
              }
            } catch (err) {
              console.warn('TabNavigator: Konnte Tab nicht aktivieren', err);
            }
          });
          buttonsWrap.appendChild(btn);
        });
      } else {
        buttonsWrap.style.display = 'none';
        emptyState.style.display = '';
        emptyState.textContent = currentTabs.length
          ? 'Keine Tabs ausgewählt.'
          : 'Keine Tabs verfügbar.';
      }
      applyPatternLabel();
      applyHeaderVisibility();
      syncDisplayToggles();
      updateOverlayTabs();
      updatePatternRadios();
      updateModeRadios();
    }

    function handlePatternChange(event){
      if (!event.target.checked) return;
      state.pattern = event.target.value;
      persist();
      renderButtons();
    }

    function handleModeChange(event){
      if (!event.target.checked) return;
      state.mode = event.target.value === 'custom' ? 'custom' : 'all';
      if (state.mode === 'all') {
        state.selectedTabs = [];
      }
      persist();
      renderButtons();
    }

    patternRadios.forEach(radio => radio.addEventListener('change', handlePatternChange));
    modeRadios.forEach(radio => radio.addEventListener('change', handleModeChange));
    Object.entries(displayToggleInputs).forEach(([key, input]) => {
      if (!input) return;
      input.addEventListener('change', () => {
        state[key] = !!input.checked;
        persist();
        applyPatternLabel();
        applyHeaderVisibility();
        syncDisplayToggles();
      });
    });

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        currentTabs = readTabs();
        if (!currentTabs.length) return;
        state.mode = 'custom';
        state.selectedTabs = currentTabs.map(tab => ({ index: tab.index, name: tab.name }));
        persist();
        renderButtons();
      });
    }

    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        state.mode = 'all';
        state.selectedTabs = [];
        persist();
        renderButtons();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.mode = 'custom';
        state.selectedTabs = [];
        persist();
        renderButtons();
      });
    }

    function handleSurfaceContextMenu(event){
      event.preventDefault();
      const trigger = event.target instanceof HTMLElement ? event.target : surface;
      openOverlay(trigger);
    }

    function handleSurfaceKey(event){
      if (event.key === 'ContextMenu' || event.key === 'Apps' || (event.key === 'F10' && event.shiftKey)) {
        event.preventDefault();
        const trigger = event.target instanceof HTMLElement ? event.target : surface;
        openOverlay(trigger);
      }
    }

    surface.title = 'Rechtsklick für Einstellungen';
    surface.addEventListener('contextmenu', handleSurfaceContextMenu);
    surface.addEventListener('keydown', handleSurfaceKey);

    if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
    if (doneBtn) doneBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeOverlay();
    });
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
      }
    });

    function attachObserver(){
      const containerEl = document.getElementById('tabs-container');
      if (!containerEl || typeof MutationObserver === 'undefined') return;
      observer = new MutationObserver(() => {
        renderButtons();
      });
      observer.observe(containerEl, { childList: true, subtree: true, characterData: true });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        renderButtons();
        attachObserver();
      }, { once: true });
    } else {
      renderButtons();
      attachObserver();
    }

    if (!observer && typeof window !== 'undefined') {
      containerCheckTimer = window.setInterval(() => {
        const el = document.getElementById('tabs-container');
        if (el) {
          renderButtons();
          attachObserver();
          if (containerCheckTimer) {
            clearInterval(containerCheckTimer);
            containerCheckTimer = null;
          }
        }
      }, 800);
    }

    root.__tabNavCleanup = () => {
      if (observer) observer.disconnect();
      if (containerCheckTimer) clearInterval(containerCheckTimer);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (!document.querySelector('.tabnav-overlay.open')) {
        document.body.classList.remove('tabnav-modal-open');
      }
    };
  };
})();
