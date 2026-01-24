/* Aspen-gebundene Geräteliste, dedupliziert nach Meldung */
(function(){
  'use strict';

  const STYLE_ID = 'aspen-styles';
  const MAX_EXTRA_COLUMNS=6;
  const ACTIVE_COLUMN_ID='__active__';
  const DEFAULT_ACTIVE_COLUMN_LABEL='Aktive Geräte';
  const CUSTOM_FIELD_KEY='custom';
  const CUSTOM_CALC_FIELD_KEY='custom_calc';

  const CSS = `
    .aspenboard{
      --ab-panel: var(--module-layer-1-module-bg);
      --ab-card: var(--module-layer-2-module-bg,var(--module-layer-1-module-bg));
      --ab-card-text: var(--module-layer-2-module-text,var(--module-layer-1-module-text));
      --ab-border: var(--module-layer-1-module-border);
      --ab-card-border: var(--module-layer-2-module-border,var(--module-layer-2-module-bg,var(--module-layer-1-module-border)));
      --ab-accent-border: var(--module-layer-3-module-border,var(--module-layer-3-module-bg,var(--module-layer-1-module-border)));
      --ab-text: var(--module-layer-1-module-text);
      --ab-muted: var(--module-layer-2-module-text,var(--module-layer-1-module-text));
      --ab-active: var(--module-layer-3-module-bg,var(--module-layer-1-module-text));
      --ab-accent: var(--module-layer-3-module-bg,var(--module-layer-1-module-text));
      --ab-accent-contrast: var(--module-layer-3-module-text,var(--module-layer-1-module-text));
      --ab-accent-soft: color-mix(in srgb,var(--ab-accent) 74%,transparent);
      --ab-accent-quiet: color-mix(in srgb,var(--ab-accent) 18%,transparent);
      --ab-accent-glow: color-mix(in srgb,var(--ab-accent) 30%,transparent);
      --ab-surface: color-mix(in srgb,var(--ab-panel) 90%,transparent);
      --ab-surface-quiet: color-mix(in srgb,var(--ab-panel) 72%,transparent);
      --ab-modal: color-mix(in srgb,var(--ab-panel) 92%,transparent);
      --ab-overlay: color-mix(in srgb,#000 42%,transparent);
      --ab-input-bg: color-mix(in srgb,var(--ab-card,var(--ab-panel)) 12%,transparent);
      --ab-input-border: color-mix(in srgb,var(--ab-border) 85%,transparent);
      --ab-section: color-mix(in srgb,var(--ab-card,var(--ab-panel)) 10%,transparent);
      --ab-section-border: color-mix(in srgb,var(--ab-border) 35%,transparent);
      --ab-placeholder: color-mix(in srgb,var(--ab-muted,var(--ab-text)) 75%,transparent);
      --ab-scroll-track: color-mix(in srgb,var(--ab-border,var(--ab-panel)) 35%,transparent);
      --ab-scroll-thumb: color-mix(in srgb,var(--ab-accent,var(--ab-border)) 55%,transparent);
      --ab-scroll-thumb-hover: color-mix(in srgb,var(--ab-accent,var(--ab-border)) 72%,transparent);
      --ab-shadow-color: color-mix(in srgb,var(--ab-text,var(--ab-border,var(--ab-panel))) 25%,transparent);
      --ab-shadow: 0 10px 24px var(--ab-shadow-color);
      --ab-shadow-strong: 0 14px 32px var(--ab-shadow-color);
      --ab-card-font-scale: 1;
      --dl-bg: var(--ab-panel);
      --dl-item-bg: var(--ab-card);
      --dl-title: var(--ab-text);
      --dl-sub: var(--ab-muted);
      --dl-active: var(--ab-accent);
      --dl-border: var(--ab-border);
      --text-color: var(--ab-text);
      --bg-color: var(--ab-panel);
      --border-color: var(--ab-border);
      color: var(--ab-text);
      background: var(--ab-panel);
    }
    .db-root{height:100%;display:flex;flex-direction:column;}
    .aspenboard{overflow:auto;scrollbar-width:thin;scrollbar-color:var(--ab-scroll-thumb) var(--ab-scroll-track);scrollbar-gutter:stable both-edges;}
    .aspenboard::-webkit-scrollbar{width:10px;height:10px;}
    .aspenboard::-webkit-scrollbar-track{background:var(--ab-scroll-track);border-radius:999px;}
    .aspenboard::-webkit-scrollbar-thumb{background:linear-gradient(180deg,var(--ab-scroll-thumb),var(--ab-scroll-thumb-hover));border-radius:999px;border:2px solid var(--ab-scroll-track);}
    .aspenboard::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,var(--ab-scroll-thumb-hover),var(--ab-scroll-thumb));}
    .db-titlebar{font-weight:600;color:var(--text-color);padding:0 .15rem;user-select:none;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;}
    .db-titlebar[hidden]{display:none;}
    .db-title-group{flex:1;min-width:0;display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;}
    .db-title-text{flex:0 1 auto;min-width:0;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;}
    .db-title-meta{font-weight:500;font-size:.9rem;color:var(--text-color);white-space:nowrap;display:inline-flex;align-items:center;letter-spacing:.01em;}
    .db-title-status{display:inline-flex;align-items:center;gap:.25rem;font-size:.8rem;padding:.15rem .5rem;border-radius:999px;background:var(--ab-status-bg);border:1px solid var(--ab-status-border);color:var(--text-color);}
    .db-title-status[hidden]{display:none;}
    .db-status-icon{line-height:1;font-size:.9rem;}
    .db-title-hint{font-weight:500;font-size:.85rem;opacity:.75;color:var(--text-color);}
    .db-title-hint[hidden]{display:none;}
    .db-refresh{flex:0 0 auto;padding:.3rem .55rem;border:1px solid var(--ab-border);border-radius:.5rem;background:var(--ab-accent-quiet);color:var(--ab-accent-contrast);font-size:.85rem;cursor:pointer;transition:background .2s ease,border-color .2s ease,box-shadow .2s ease,color .2s ease;}
    .db-refresh:hover{background:var(--ab-accent-soft);border-color:var(--ab-accent);color:var(--ab-accent-contrast);box-shadow:0 0 0 2px var(--ab-accent-glow);}
    .db-refresh[hidden]{display:none;}
    .db-surface{flex:1;background:var(--ab-panel);border-radius:1rem;padding:.75rem;display:flex;flex-direction:column;gap:.5rem;overflow:hidden;box-shadow:var(--ab-shadow);border:1px solid var(--ab-border);}
    .db-toolbar{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;}
    .db-toggle-group{flex:0 0 auto;display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;}
    .db-toggle-group:empty{display:none;}
    .db-search-filter-group{flex:0 0 auto;display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;}
    .db-search-filter-group:empty{display:none;}
    .db-search-filter-btn{flex:0 0 auto;padding:.4rem .7rem;border:1px solid var(--ab-border);border-radius:.55rem;background:var(--ab-card);color:var(--ab-text);font-weight:600;cursor:pointer;transition:background .2s ease,border-color .2s ease,box-shadow .2s ease,color .2s ease;}
    .db-search-filter-btn:hover{background:var(--ab-section);border-color:var(--ab-border);color:var(--ab-text);}
    .db-search-filter-btn.is-active{background:var(--ab-accent);color:var(--ab-accent-contrast);border:1px solid var(--ab-accent-border,var(--ab-accent));box-shadow:0 0 0 2px var(--ab-accent-glow);}
    .db-toggle-btn{flex:0 0 auto;padding:.45rem .75rem;border:1px solid var(--ab-border);border-radius:.6rem;background:var(--ab-card);color:var(--ab-text);font-weight:600;cursor:pointer;transition:background .2s ease,border-color .2s ease,box-shadow .2s ease,color .2s ease;}
    .db-toggle-btn:hover{background:var(--ab-section);border-color:var(--ab-border);color:var(--ab-text);}
    .db-toggle-btn.is-active{background:var(--ab-accent);color:var(--ab-accent-contrast);border:1px solid var(--ab-accent-border,var(--ab-accent));box-shadow:0 0 0 2px var(--ab-accent-glow);}
    .db-search{flex:1;padding:.45rem .65rem;border:1px solid var(--ab-border);border-radius:.6rem;background:var(--ab-input-bg);color:var(--ab-text);font-size:.9rem;transition:border-color .2s ease,box-shadow .2s ease,color .2s ease;}
    .db-search:focus{outline:none;border-color:var(--ab-accent);box-shadow:0 0 0 2px var(--ab-accent-glow);color:var(--ab-accent-contrast);}
    .db-search::placeholder{color:var(--ab-placeholder);opacity:1;}
    .db-lists{flex:1;display:flex;gap:.75rem;min-height:1.5rem;overflow:hidden;}
    .db-list-wrap{flex:1;display:flex;flex-direction:column;gap:.35rem;min-width:0;}
    .db-list-wrap.is-hidden{display:none;}
    .db-extra-container{flex:0 1 0%;display:flex;gap:.75rem;min-width:0;}
    .db-extra-container:empty{display:none;}
    .db-list-title{font-weight:600;color:var(--dl-sub,var(--ab-muted));padding:0 .1rem;}
    .db-list{flex:1;display:flex;flex-direction:column;gap:.65rem;min-height:1.5rem;overflow:auto;padding-right:.25rem;scrollbar-width:thin;scrollbar-color:var(--ab-scroll-thumb) transparent;}
    .db-list::-webkit-scrollbar{width:8px;height:8px;}
    .db-list::-webkit-scrollbar-track{background:transparent;}
    .db-list::-webkit-scrollbar-thumb{background:linear-gradient(180deg,var(--ab-scroll-thumb),var(--ab-scroll-thumb-hover));border-radius:999px;border:2px solid transparent;background-clip:padding-box;}
    .db-list::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,var(--ab-scroll-thumb-hover),var(--ab-scroll-thumb));}
    .db-active-wrap{display:none;flex:1 1 0;min-width:0;}
    .db-active-wrap[hidden]{display:none;}
    .db-root.db-has-active .db-active-wrap{display:flex;}
    .db-empty{opacity:.6;padding:.25rem .1rem;}
    .db-card{background:var(--ab-card);color:var(--ab-muted);border-radius:.8rem;padding:.65rem .75rem;box-shadow:var(--ab-shadow);display:flex;align-items:center;gap:.75rem;user-select:none;border:1px solid var(--ab-card-border);font-size:calc(1rem * var(--ab-card-font-scale));}
    .db-flex{flex:1;display:flex;flex-direction:column;}
    .db-card-header{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;}
    .db-card-tags{margin-left:auto;display:flex;flex-wrap:wrap;gap:.35rem;justify-content:flex-end;}
    .db-card-tag{background:var(--ab-accent-quiet);color:var(--ab-accent);padding:.1rem .4rem;border-radius:999px;font-size:calc(.75rem * var(--ab-card-font-scale));font-weight:600;white-space:nowrap;border:1px solid transparent;}
    .db-title{color:var(--ab-text);font-weight:600;line-height:1.1;}
    .db-sub{color:var(--ab-muted);font-size:calc(.85rem * var(--ab-card-font-scale));margin-top:.15rem;}
    .db-hint{display:block;font-size:.8rem;color:var(--ab-muted);margin:.15rem 0 .4rem;}
    .db-handle{margin-left:.5rem;flex:0 0 auto;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:.45rem;background:var(--ab-surface-quiet);cursor:grab;color:inherit;border:1px solid var(--ab-border);font-size:calc(.95rem * var(--ab-card-font-scale));}
    .db-handle:active{cursor:grabbing;}
    .db-card.active{border-color:var(--dl-active);box-shadow:0 0 0 2px var(--dl-active) inset,0 0 0 2px var(--dl-active),var(--ab-shadow-strong);transform:translateY(-1px);color:var(--ab-accent-contrast);}
    .db-ghost{opacity:.4;}
    .db-chosen{transform:scale(1.01);}
    .db-menu-toggle-group{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;}
    .db-menu-toggle{flex:1 1 auto;display:flex;align-items:center;justify-content:center;gap:.45rem;padding:.45rem .75rem;border:1px solid var(--ab-border);border-radius:.65rem;background:var(--ab-card);color:var(--ab-text);font-weight:600;cursor:pointer;transition:background .2s ease,border-color .2s ease,box-shadow .2s ease,color .2s ease,transform .2s ease;}
    .db-menu-toggle:hover{background:var(--ab-section);border-color:var(--ab-border);color:var(--ab-text);}
    .db-menu-toggle.is-active{background:var(--ab-accent);color:var(--ab-accent-contrast);border:1px solid var(--ab-accent-border,var(--ab-accent));box-shadow:0 0 0 2px var(--ab-accent-glow);transform:translateY(-1px);}
    .db-menu-toggle:disabled{opacity:.45;cursor:not-allowed;box-shadow:none;transform:none;}
    .db-menu-toggle-icon{flex:0 0 auto;width:1.4rem;height:1.4rem;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:.9rem;background:var(--ab-section);color:var(--ab-text);transition:background .2s ease,color .2s ease;}
    .db-menu-toggle.is-active .db-menu-toggle-icon{background:var(--ab-accent-quiet);color:var(--ab-accent-contrast);}
    .db-option-section{display:flex;flex-direction:column;gap:.75rem;}
    .db-option-actions{display:flex;flex-wrap:wrap;gap:.35rem;}
    .db-config-tabs{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;margin-bottom:.75rem;}
    .db-config-tab{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:.35rem;padding:.45rem .75rem;border:1px solid var(--ab-border);border-radius:.6rem;background:var(--ab-card);color:var(--ab-text);font-weight:600;cursor:pointer;transition:background .2s ease,border-color .2s ease,box-shadow .2s ease,color .2s ease;}
    .db-config-tab:hover{background:var(--ab-section);color:var(--ab-text);}
    .db-config-tab.is-active{background:var(--ab-accent);color:var(--ab-accent-contrast);border:1px solid var(--ab-accent-border,var(--ab-accent));box-shadow:0 0 0 2px var(--ab-accent-glow);}
    .db-tab-panel{display:none;flex-direction:column;gap:1rem;}
    .db-tab-panel.is-active{display:flex;}
    .db-tab-panel.db-tab-extras{max-height:68vh;overflow:auto;padding-right:.25rem;}
    .db-tab-panel.db-tab-design{gap:1.25rem;}
    .db-design-card{display:flex;flex-direction:column;gap:.85rem;padding:1rem;border-radius:.85rem;border:1px solid var(--ab-border);background:var(--ab-surface);box-shadow:var(--ab-shadow);}
    .db-design-header{display:flex;align-items:flex-end;flex-wrap:wrap;gap:.75rem;justify-content:space-between;}
    .db-design-title{display:flex;flex-direction:column;gap:.15rem;color:var(--ab-text);}
    .db-design-title .hint{color:var(--ab-muted);font-size:.9rem;}
    .db-design-controls{display:flex;align-items:center;flex-wrap:wrap;gap:.45rem;}
    .db-design-slider{flex:1 1 240px;min-width:180px;display:flex;align-items:center;gap:.45rem;}
    .db-design-slider input[type=range]{flex:1;accent-color:var(--ab-accent);}
    .db-design-slider input[type=number]{width:4.5rem;padding:.35rem .45rem;border:1px solid var(--ab-border);border-radius:.5rem;background:var(--ab-input-bg);color:var(--ab-text);}
    .db-design-chip-input{flex:0 0 auto;display:flex;flex-direction:column;gap:.2rem;min-width:180px;color:var(--ab-muted);}
    .db-design-chip-input .db-design-chip-label{font-weight:700;color:var(--ab-text);font-size:.9rem;}
    .db-design-chip-input input[type=number]{width:100%;padding:.35rem .5rem;border:1px solid var(--ab-border);border-radius:.5rem;background:var(--ab-input-bg);color:var(--ab-text);}
    .db-design-chip-input input[type=number]:focus{outline:none;border-color:var(--ab-accent);box-shadow:0 0 0 3px var(--ab-accent-glow);}
    .db-design-chip-input .db-design-chip-hint{font-size:.78rem;}
    .db-design-preview{display:flex;flex-direction:column;gap:.65rem;}
    .db-design-preview .db-card{max-width:480px;}
    .db-part-section{display:flex;flex-direction:column;gap:.35rem;padding:.5rem;border-radius:.65rem;border:1px solid var(--ab-section-border);background:var(--ab-section);}
    .db-part-filter{padding:.35rem .5rem .15rem;}
    .db-part-filter input{width:100%;padding:.35rem .55rem;border:1px solid var(--ab-border);border-radius:.5rem;background:transparent;color:inherit;font-size:.85rem;}
    .db-part-filter input:focus{outline:none;border-color:var(--ab-accent);box-shadow:0 0 0 3px var(--ab-accent-glow);}
    .db-part-list{max-height:240px;overflow:auto;padding:.25rem .5rem .5rem;display:flex;flex-direction:column;gap:.25rem;scrollbar-width:thin;scrollbar-color:var(--ab-scroll-thumb) transparent;}
    .db-part-list::-webkit-scrollbar{width:8px;height:8px;}
    .db-part-list::-webkit-scrollbar-track{background:transparent;}
    .db-part-list::-webkit-scrollbar-thumb{background:linear-gradient(180deg,var(--ab-scroll-thumb),var(--ab-scroll-thumb-hover));border-radius:999px;border:2px solid transparent;background-clip:padding-box;}
    .db-part-list::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,var(--ab-scroll-thumb-hover),var(--ab-scroll-thumb));}
    .db-check{display:flex;align-items:center;gap:.4rem;font-size:.85rem;}
    .db-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:var(--ab-overlay);z-index:2150;}
    .db-modal.open{display:flex;}
    .db-panel{background:var(--ab-panel);color:var(--ab-text);padding:1rem;border-radius:.75rem;min-width:320px;max-width:min(96vw,1600px);width:100%;box-shadow:var(--ab-shadow);position:relative;z-index:2210;border:1px solid var(--ab-border);}
    .db-panel .row{margin-bottom:.75rem;}
    .db-panel label{display:block;font-size:.85rem;margin-bottom:.25rem;}
    .db-panel input[type=text],.db-panel select{width:100%;padding:.35rem .5rem;border:1px solid var(--ab-border);border-radius:.4rem;background:var(--ab-surface-quiet);color:inherit;}
    .db-panel select option,.db-panel select optgroup{background:var(--ab-panel);color:var(--ab-text);}
    .db-panel .db-part-select{position:relative;}
    .db-panel .db-part-select::after{content:'▾';position:absolute;right:.6rem;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--ab-muted);font-size:.75rem;}
    .db-part-select-input{width:100%;padding:.35rem 2rem .35rem .5rem;border:1px solid var(--ab-border);border-radius:.4rem;background:var(--ab-surface-quiet);color:inherit;}
    .db-part-select-input:focus{outline:none;border-color:var(--ab-accent);box-shadow:0 0 0 3px var(--ab-accent-glow);}
    .db-part-options{position:absolute;top:calc(100% + .25rem);left:0;right:0;max-height:220px;overflow:auto;background:var(--ab-panel);color:var(--ab-text);border:1px solid var(--ab-border);border-radius:.5rem;box-shadow:var(--ab-shadow);padding:.25rem 0;display:none;z-index:2220;scrollbar-width:thin;scrollbar-color:var(--ab-scroll-thumb) transparent;}
    .db-part-options::-webkit-scrollbar{width:8px;height:8px;}
    .db-part-options::-webkit-scrollbar-track{background:transparent;}
    .db-part-options::-webkit-scrollbar-thumb{background:linear-gradient(180deg,var(--ab-scroll-thumb),var(--ab-scroll-thumb-hover));border-radius:999px;border:2px solid transparent;background-clip:padding-box;}
    .db-part-options::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,var(--ab-scroll-thumb-hover),var(--ab-scroll-thumb));}
    .db-part-options.open{display:flex;flex-direction:column;}
    .db-part-option{display:block;width:100%;padding:.35rem .75rem;text-align:left;background:none;border:0;font:inherit;color:inherit;cursor:pointer;}
    .db-part-option:hover,.db-part-option.is-active{background:var(--ab-accent-quiet);}
    .db-part-options .db-empty{padding:.35rem .75rem;}
    .db-sel-part{display:none;}
    .db-color{width:100%;height:2.25rem;border:1px solid var(--ab-border);border-radius:.4rem;background:transparent;}
    .db-panel .row.subs{display:flex;flex-direction:column;gap:.4rem;}
    .db-sub-list{display:flex;flex-direction:column;gap:.35rem;}
    .db-sub-row{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;}
    .db-sub-picker{flex:1;position:relative;display:flex;}
    .db-sub-input{flex:1;padding:.35rem .5rem;border:1px solid var(--ab-border);border-radius:.4rem;background:transparent;color:inherit;}
    .db-sub-input:focus{outline:none;border-color:var(--ab-accent);box-shadow:0 0 0 3px var(--ab-accent-glow);}
    .db-sub-meta{flex:1;display:flex;gap:.35rem;min-width:0;}
    .db-sub-extra{flex:1;padding:.35rem .5rem;border:1px solid var(--ab-border);border-radius:.4rem;background:transparent;color:inherit;min-width:0;}
    .db-sub-extra:focus{outline:none;border-color:var(--ab-accent);box-shadow:0 0 0 3px var(--ab-accent-glow);}
    .db-sub-row button{padding:.35rem .6rem;}
    .db-sub-remove{padding:.35rem .55rem;}
    .db-add-sub{align-self:flex-start;padding:.35rem .6rem;}
    .db-panel .row.rules{display:flex;flex-direction:column;gap:.4rem;}
    .db-panel .row.filters{display:flex;flex-direction:column;gap:.4rem;}
    .db-extra-config{display:flex;flex-direction:column;gap:.6rem;}
    .db-extra-layout{display:flex;flex-direction:column;gap:.75rem;}
    .db-extra-section{display:flex;flex-direction:column;gap:.6rem;padding:.65rem;border-radius:.85rem;background:var(--ab-section);border:1px solid var(--ab-section-border);}
    .db-extra-section-header{display:flex;flex-direction:column;gap:.2rem;}
    .db-extra-section-title{font-weight:700;color:var(--ab-muted);}
    .db-extra-section-hint{font-size:.82rem;color:var(--ab-muted);}
    .db-extra-count-label{display:flex;flex-direction:column;gap:.35rem;font-size:.85rem;}
    .db-extra-count{width:120px;padding:.35rem .5rem;border:1px solid var(--ab-border);border-radius:.4rem;background:transparent;color:inherit;}
    .db-extra-name-list{display:flex;flex-direction:column;gap:.35rem;}
    .db-extra-rule-board{display:flex;flex-direction:column;gap:.5rem;}
    .db-extra-rule-card{display:flex;flex-direction:column;gap:.45rem;padding:.5rem .65rem;border-radius:.75rem;background:var(--ab-surface-quiet);border:1px solid var(--ab-border);}
    .db-extra-rule-card-title{display:flex;align-items:center;justify-content:space-between;gap:.45rem;font-weight:700;color:var(--ab-text);}
    .db-extra-rule-card-meta{font-size:.8rem;color:var(--ab-muted);}
    .db-extra-name-row{display:flex;flex-direction:column;gap:.4rem;padding:.2rem .1rem;}
    .db-extra-name-header{display:flex;flex-direction:column;align-items:flex-start;gap:.25rem;width:100%;}
    .db-extra-name-title{font-weight:600;font-size:.9rem;color:var(--ab-text);}
    .db-extra-name-input{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;font-size:.85rem;color:var(--ab-muted);}
    .db-extra-name-input-label{font-weight:600;}
    .db-extra-name-input-field{flex:1 1 180px;min-width:140px;max-width:100%;padding:.35rem .5rem;border:1px solid var(--ab-border);border-radius:.4rem;background:transparent;color:inherit;}
    .db-extra-name-input-field:focus{outline:none;border-color:var(--ab-accent);box-shadow:0 0 0 3px var(--ab-accent-glow);}
    .db-extra-rule-header{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;}
    .db-extra-rule-hint{font-size:.78rem;font-weight:600;color:var(--ab-muted);}
    .db-extra-rule-list{display:flex;flex-direction:column;gap:.4rem;}
    .db-extra-rule-actions{display:flex;justify-content:flex-start;}
    .db-extra-rule-row{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) auto;gap:.35rem;align-items:start;}
    .db-extra-rule-field{display:flex;flex-direction:column;gap:.2rem;}
    .db-extra-condition-wrap{display:flex;flex-direction:column;gap:.35rem;}
    .db-extra-condition-list{display:flex;flex-direction:column;gap:.35rem;}
    .db-extra-condition-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr)) auto;gap:.35rem;align-items:end;}
    .db-extra-uc-switch{position:relative;display:flex;align-items:center;gap:.65rem;padding:.35rem .75rem;border-radius:.75rem;font-size:.78rem;font-weight:600;color:var(--ab-text);background:var(--ab-surface-quiet);box-shadow:var(--ab-shadow);cursor:pointer;user-select:none;transition:background .2s ease,box-shadow .2s ease,color .2s ease;min-width:0;line-height:1.1;}
    .db-extra-uc-switch:hover{background:var(--ab-surface);box-shadow:var(--ab-shadow-strong);}
    .db-extra-uc-switch input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer;}
    .db-extra-uc-switch-control{position:relative;flex:0 0 auto;width:38px;height:20px;margin-left:auto;border-radius:999px;background:var(--ab-input-border);transition:background .2s ease,box-shadow .2s ease;box-shadow:inset 0 0 0 1px var(--ab-section-border);}
    .db-extra-uc-switch-control::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:999px;background:var(--ab-panel);box-shadow:0 2px 4px var(--ab-shadow-color);transition:transform .2s ease,box-shadow .2s ease;}
    .db-extra-uc-switch input:focus-visible~.db-extra-uc-switch-control{box-shadow:0 0 0 3px var(--ab-accent-glow);}
    .db-extra-uc-switch input:checked~.db-extra-uc-switch-control{background:var(--ab-accent);box-shadow:0 0 0 2px var(--ab-accent-glow);}
    .db-extra-uc-switch input:checked~.db-extra-uc-switch-control::after{transform:translateX(18px);}
    .db-extra-uc-switch-text{flex:0 1 auto;padding:.2rem .65rem;border-radius:.6rem;background:var(--ab-accent-quiet);white-space:nowrap;color:var(--ab-text);transition:background .2s ease,color .2s ease,box-shadow .2s ease;}
    .db-extra-uc-switch input:checked~.db-extra-uc-switch-text{background:var(--ab-accent);color:var(--ab-accent-contrast);box-shadow:0 0 0 1px var(--ab-accent-glow);}
    .db-rule-label{font-size:.85rem;font-weight:600;}
    .db-rule-list{display:flex;flex-direction:column;gap:.35rem;}
    .db-rule-row{display:grid;grid-template-columns:minmax(0,1.1fr) auto minmax(0,1fr) minmax(0,1.6fr) auto auto;gap:.4rem;align-items:center;}
    .db-rule-row select,.db-rule-row input{width:100%;padding:.35rem .5rem;border:1px solid var(--ab-border);border-radius:.4rem;background:transparent;color:inherit;}
    .db-rule-row .db-rule-color{padding:0;height:2.25rem;width:3rem;min-width:2.5rem;cursor:pointer;}
    .db-rule-row .db-rule-remove{padding:.35rem .55rem;}
    .db-rule-empty{font-size:.85rem;opacity:.7;}
    .db-add-rule{align-self:flex-start;padding:.35rem .6rem;}
    .db-filter-list{display:flex;flex-direction:column;gap:.35rem;}
    .db-filter-row{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;}
    .db-filter-row .db-filter-field{flex:1 1 160px;display:flex;flex-direction:column;gap:.25rem;min-width:120px;}
    .db-filter-row .db-filter-field label{font-size:.75rem;font-weight:600;color:var(--ab-muted);}
    .db-filter-row input[type=text]{width:100%;padding:.35rem .5rem;border:1px solid var(--ab-border);border-radius:.4rem;background:transparent;color:inherit;}
    .db-filter-row .db-filter-default{display:flex;align-items:center;gap:.35rem;font-size:.85rem;}
    .db-filter-row .db-filter-remove{padding:.35rem .55rem;}
    .db-add-filter{align-self:flex-start;padding:.35rem .6rem;}
    .db-row-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;}
    .db-row-actions{display:inline-flex;align-items:center;gap:.35rem;}
    .db-icon-btn{padding:.3rem .5rem;border:1px solid var(--ab-border);border-radius:.45rem;background:var(--ab-surface-quiet);color:inherit;cursor:pointer;font-size:.9rem;line-height:1;}
    .db-icon-btn:hover{background:var(--ab-accent-quiet);}
    .db-row-header label{margin-bottom:0;}
    .db-row-header .db-rule-label{margin-bottom:0;}
    .db-sub-line+.db-sub-line{margin-top:.15rem;}
    .db-custom-label,.db-custom-value{cursor:text;}
    .db-custom-label:hover,.db-custom-value:hover{text-decoration:underline;}
    .db-panel .actions{display:flex;gap:.5rem;justify-content:flex-end;}
    .db-config-layout{display:flex;flex-direction:column;gap:1.25rem;align-items:stretch;}
    .db-config-filter{flex:0 0 auto;width:100%;display:flex;flex-direction:column;gap:.75rem;}
    .db-config-filter .db-part-section{width:100%;}
    .db-quick-section{display:flex;flex-direction:column;gap:.6rem;padding:.6rem;border-radius:.65rem;border:1px solid var(--ab-section-border);background:var(--ab-section);box-shadow:var(--ab-shadow);}
    .db-quick-section label{display:flex;flex-direction:column;gap:.35rem;font-size:.82rem;font-weight:600;color:var(--ab-muted);margin-bottom:0;}
    .db-quick-section .db-title-input{width:100%;padding:.45rem .65rem;border:1px solid var(--ab-border);border-radius:.55rem;background:var(--ab-surface);color:var(--ab-text);transition:border-color .2s ease,box-shadow .2s ease;}
    .db-quick-section .db-title-input:focus{outline:none;border-color:var(--ab-accent);box-shadow:0 0 0 3px var(--ab-accent-glow);}
    .db-quick-section .db-option-section{gap:.6rem;}
    .db-quick-section .db-option-actions{width:100%;flex-direction:column;gap:.5rem;}
    .db-quick-section .db-option-actions>.db-menu-toggle{width:100%;}
    .db-quick-section .db-option-actions>.db-menu-toggle-group{width:100%;}
    .db-quick-section .db-menu-toggle-group{justify-content:stretch;}
    .db-quick-section .db-menu-toggle-group .db-menu-toggle{flex:1;}
    .db-config-extras{flex:0 0 auto;width:100%;display:flex;justify-content:flex-start;}
    .db-extra-card{flex:1;display:flex;flex-direction:column;gap:.85rem;padding:1rem;border-radius:.85rem;border:1px solid var(--ab-border);background:var(--ab-surface);box-shadow:var(--ab-shadow);}
    .db-extra-card-title{font-weight:600;font-size:.9rem;color:var(--ab-muted);}
    .db-extra-card-body{display:flex;flex-direction:column;gap:.75rem;max-height:64vh;overflow:auto;padding-right:.1rem;}
    .db-config-main{flex:1;display:flex;flex-direction:column;gap:1rem;padding:1rem;border-radius:.85rem;border:1px solid var(--ab-border);background:var(--ab-surface);box-shadow:var(--ab-shadow);}
    .db-config-main>.row{margin-bottom:0;}
    .db-config-main>.row+.row{margin-top:.25rem;}
    .db-config-colors{flex:0 0 auto;width:100%;display:flex;justify-content:flex-end;}
    .db-color-card{flex:1;display:flex;flex-direction:column;gap:.85rem;padding:1rem;border-radius:.85rem;border:1px solid var(--ab-border);background:var(--ab-surface);box-shadow:var(--ab-shadow);}
    .db-color-card-title{font-weight:600;font-size:.9rem;color:var(--ab-muted);}
    .db-color-card-body{display:flex;flex-direction:column;gap:.75rem;}
    .db-color-layer-list{display:flex;flex-direction:column;gap:.5rem;}
    .db-color-help{margin:0;color:var(--ab-muted);font-size:.85rem;}
    .db-color-layer{display:flex;align-items:center;gap:.65rem;justify-content:space-between;padding:.55rem .75rem;border:1px solid var(--ab-border);border-radius:.65rem;background:var(--ab-surface);color:var(--ab-text);cursor:pointer;transition:border-color .2s ease,box-shadow .2s ease,transform .15s ease;}
    .db-color-layer:hover{border-color:var(--ab-text);box-shadow:var(--ab-shadow-strong);transform:translateY(-1px);}
    .db-color-layer.is-active{border-color:var(--ab-accent);box-shadow:0 0 0 3px var(--ab-accent-glow),var(--ab-shadow-strong);}
    .db-color-layer-meta{display:flex;flex-direction:column;gap:.1rem;}
    .db-color-layer-name{font-weight:700;}
    .db-color-layer-tag{font-size:.78rem;font-weight:600;opacity:.7;}
    .db-color-layer-swatch{flex:0 0 auto;width:52px;height:30px;border-radius:.55rem;border:2px solid var(--ab-card-border);box-shadow:inset 0 0 0 1px var(--ab-section-border);background:linear-gradient(135deg,var(--layer-bg,var(--ab-card)),var(--layer-border,var(--ab-card-border)));}
    @media(min-width:900px){
      .db-config-layout{flex-direction:row;align-items:flex-start;gap:1.75rem;}
      .db-config-filter{max-width:320px;}
      .db-config-extras{max-width:260px;}
      .db-extra-card{height:100%;}
      .db-config-main{flex:1.25;min-width:0;}
      .db-config-colors{max-width:280px;}
    }
    .aspenboard .db-modal{
      background:var(--ab-overlay);
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
    }
    .aspenboard .db-panel{
      backdrop-filter:blur(28px);
      -webkit-backdrop-filter:blur(28px);
      background:var(--ab-surface,var(--ab-panel));
    }
    .aspenboard .db-option-section{color:var(--ab-text);}
    .aspenboard .db-part-section{background:var(--ab-surface-quiet,var(--ab-panel));border:1px solid var(--ab-border);box-shadow:var(--ab-shadow);}
    .aspenboard .db-part-section .db-empty{color:var(--ab-muted);}
    .aspenboard .db-menu-toggle{background:var(--ab-card);color:var(--ab-text);border:1px solid var(--ab-border);}
    .aspenboard .db-menu-toggle:hover{background:var(--ab-section);}
    .aspenboard .db-surface{background:var(--ab-surface,var(--ab-panel));border:1px solid var(--ab-border);box-shadow:var(--ab-shadow);}
    .aspenboard .db-list-title{color:var(--ab-muted);}
    .aspenboard .db-card{background:var(--ab-card);color:var(--ab-muted);border:1px solid var(--ab-card-border);box-shadow:var(--ab-shadow);}
    .aspenboard .db-card.active{border-color:var(--ab-active);box-shadow:0 0 0 2px var(--ab-active) inset,0 0 0 2px var(--ab-active),var(--ab-shadow);color:var(--ab-accent-contrast);}
    .aspenboard .db-card-tag{background:var(--ab-accent-quiet);color:var(--ab-accent);border-color:var(--ab-accent-border,var(--ab-accent));}
    .aspenboard .db-sub{color:var(--ab-muted);}
    .aspenboard .db-config-main,
    .aspenboard .db-extra-card,
    .aspenboard .db-color-card{background:var(--ab-surface,var(--ab-panel));border:1px solid var(--ab-border);box-shadow:var(--ab-shadow);color:var(--ab-text);}
    .aspenboard .db-menu-toggle.is-active{background:var(--accent-gradient,var(--ab-accent));color:var(--ab-accent-contrast);border:1px solid var(--ab-accent-border,var(--ab-accent));box-shadow:0 0 0 3px var(--ab-accent-glow,var(--ab-accent-soft));}
    .aspenboard .db-menu-toggle-icon{background:var(--ab-section);color:var(--ab-text);}
    .aspenboard .db-menu-toggle.is-active .db-menu-toggle-icon{background:var(--ab-accent-quiet);color:var(--ab-accent-contrast);}
    .aspenboard .db-menu-toggle:disabled{opacity:.4;}
    .aspenboard .db-search{background:var(--ab-input-bg,var(--ab-card));color:var(--ab-text);border:1px solid var(--ab-input-border,var(--ab-border));}
    .aspenboard .db-search:focus{outline:none;border-color:var(--ab-accent);box-shadow:0 0 0 2px var(--ab-accent-glow,var(--ab-accent-soft));color:var(--ab-accent-contrast);}
    .aspenboard .db-search::placeholder{color:var(--ab-muted);opacity:1;}
    .aspenboard .db-part-filter input{background:var(--ab-input-bg,var(--ab-card));color:var(--ab-text);border:1px solid var(--ab-input-border,var(--ab-border));border-radius:.5rem;}
    .aspenboard .db-part-filter input:focus{outline:none;border-color:var(--ab-accent);box-shadow:0 0 0 3px var(--ab-accent-glow,var(--ab-accent-soft));}
    .aspenboard .db-part-list{color:var(--ab-text);}
    .aspenboard .db-search-filter-btn{background:var(--ab-card);color:var(--ab-text);border:1px solid var(--ab-border);}
    .aspenboard .db-search-filter-btn:hover{background:var(--ab-section);}
    .aspenboard .db-search-filter-btn.is-active{background:var(--accent-gradient,var(--ab-accent));color:var(--ab-accent-contrast);border:1px solid var(--ab-accent-border,var(--ab-accent));box-shadow:0 0 0 3px var(--ab-accent-glow,var(--ab-accent-soft));}
    .aspenboard .db-panel{color:var(--ab-text);border-radius:1rem;border:1px solid var(--ab-border);box-shadow:var(--ab-shadow);}
    .aspenboard .db-config-layout{gap:1.75rem;}
    .aspenboard .db-panel label{color:var(--ab-muted);}
    .aspenboard .db-panel input[type=text],
    .aspenboard .db-panel input[type=number],
    .aspenboard .db-panel select,
    .aspenboard .db-part-select-input,
    .aspenboard .db-sub-input,
    .aspenboard .db-sub-extra,
    .aspenboard .db-rule-row select,
    .aspenboard .db-rule-row input{
      background:var(--ab-input-bg,var(--ab-card));
      color:var(--ab-text);
      border:1px solid var(--ab-input-border,var(--ab-border));
      border-radius:.5rem;
    }
    .aspenboard .db-panel input[type=text]:focus,
    .aspenboard .db-panel select:focus,
    .aspenboard .db-part-select-input:focus,
    .aspenboard .db-sub-input:focus,
    .aspenboard .db-sub-extra:focus,
    .aspenboard .db-rule-row select:focus,
    .aspenboard .db-rule-row input:focus{
      outline:none;
      border-color:var(--ab-accent);
      box-shadow:0 0 0 3px var(--ab-accent-glow,var(--ab-accent-soft));
    }
    .aspenboard .db-panel .db-part-select::after{color:var(--ab-muted);}
    .aspenboard .db-part-options{background:var(--ab-modal,var(--ab-panel));color:var(--ab-text);border:1px solid var(--ab-border);border-radius:.75rem;box-shadow:var(--ab-shadow);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);}
    .aspenboard .db-part-option{border-radius:.35rem;}
    .aspenboard .db-part-option:hover,
    .aspenboard .db-part-option.is-active{background:var(--ab-accent-quiet);}
    .aspenboard .db-part-options .db-empty{color:var(--ab-muted);}
    .aspenboard .db-color{border:1px solid var(--ab-border);border-radius:.5rem;background:var(--ab-input-bg,var(--ab-card));}
    .aspenboard .db-sub-row button,
    .aspenboard .db-add-sub,
    .aspenboard .db-add-rule,
    .aspenboard .db-add-filter,
    .aspenboard .db-panel .actions button{
      background:var(--accent-gradient,var(--ab-accent));
      border:1px solid var(--ab-accent-border,var(--ab-accent));
      border-radius:.6rem;
      padding:.45rem .85rem;
      color:var(--ab-accent-contrast);
      cursor:pointer;
      box-shadow:0 16px 38px var(--ab-accent-glow,var(--ab-accent-soft));
      transition:transform .2s ease,box-shadow .2s ease,filter .2s ease;
    }
    .aspenboard .db-sub-row button:hover,
    .aspenboard .db-add-sub:hover,
    .aspenboard .db-add-rule:hover,
    .aspenboard .db-add-filter:hover,
    .aspenboard .db-panel .actions button:hover{
      filter:brightness(1.05);
      transform:translateY(-1px);
      box-shadow:0 20px 48px var(--ab-accent-glow,var(--ab-accent-soft));
    }
    .aspenboard .db-filter-remove{
      background:var(--ab-input-bg,var(--ab-card));
      color:var(--ab-text);
      border:1px solid var(--ab-input-border,var(--ab-border));
      border-radius:.55rem;
    }
    .aspenboard .db-filter-remove:hover{background:var(--ab-accent-quiet);}
    .aspenboard .db-panel .db-icon-btn{
      background:var(--ab-accent-soft);
      color:var(--ab-text);
      border:1px solid var(--ab-accent-border,var(--ab-accent));
      border-radius:.55rem;
      padding:.35rem .6rem;
      box-shadow:var(--ab-shadow);
    }
    .aspenboard .db-panel .db-icon-btn:hover{background:var(--ab-accent-quiet);}
    .aspenboard .db-rule-label{color:var(--ab-text);}
    .aspenboard .db-row-header label{color:var(--ab-muted);}
    .aspenboard .db-rule-empty{color:var(--ab-muted);}
    .aspenboard .db-panel .actions{gap:.75rem;}
    .ab-permission-backdrop{position:fixed;inset:0;z-index:2500;display:flex;align-items:center;justify-content:center;background:var(--ab-overlay);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);}
    .ab-permission-dialog{background:var(--ab-panel);color:var(--ab-text);padding:1.25rem 1.5rem;border-radius:.85rem;max-width:360px;box-shadow:var(--ab-shadow-strong);display:flex;flex-direction:column;gap:.9rem;border:1px solid var(--ab-border);}
    .ab-permission-dialog h2{font-size:1.05rem;font-weight:600;margin:0;}
    .ab-permission-dialog p{margin:0;font-size:.9rem;line-height:1.4;color:inherit;}
    .ab-permission-actions{display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap;}
    .ab-permission-actions button{padding:.45rem .85rem;border-radius:.65rem;border:1px solid var(--ab-border);background:var(--ab-surface);color:inherit;cursor:pointer;font-size:.9rem;font-weight:600;}
    .ab-permission-actions button:hover{background:var(--ab-accent-quiet);}
    .ab-permission-actions .ab-permission-allow{background:var(--ab-accent);color:var(--ab-accent-contrast);border-color:var(--ab-accent);}
    .ab-permission-actions .ab-permission-allow:hover{filter:brightness(1.05);}
    .aspenboard .db-extra-card,
    .aspenboard .db-config-main,
    .aspenboard .db-color-card{
      background:var(--ab-surface,var(--ab-panel));
      border:1px solid var(--ab-border);
      box-shadow:var(--ab-shadow);
    }
    .aspenboard .db-config-main{color:var(--ab-text);}
    .aspenboard .db-extra-card-title{color:var(--ab-muted);}
    .aspenboard .db-extra-card .db-extra-count-label{color:var(--ab-muted);}
    .aspenboard .db-extra-name-row{gap:.25rem;}
    .aspenboard .db-extra-name-header{gap:.2rem;}
    .aspenboard .db-extra-name-inline{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;font-size:.85rem;color:var(--ab-muted);}
    .aspenboard .db-extra-name-title{color:var(--ab-text);font-weight:700;font-size:.92rem;}
    .aspenboard .db-extra-name-input{color:var(--ab-muted);}
    .aspenboard .db-extra-name-input-field{background:var(--ab-input-bg,var(--ab-card));border-color:var(--ab-input-border,var(--ab-border));color:var(--ab-text);min-width:160px;max-width:420px;}
    .aspenboard .db-extra-name-input-field::placeholder{color:var(--ab-muted);}
    .aspenboard .db-extra-uc-switch{color:var(--ab-muted);}
    .db-inline-title{cursor:text;}
    .db-inline-title:focus{outline:none;box-shadow:0 0 0 2px var(--ab-accent-glow);border-radius:.3rem;}
    .db-inline-title-input{width:100%;padding:.2rem .35rem;border:1px solid var(--ab-border);border-radius:.35rem;background:var(--ab-input-bg,var(--ab-card));color:inherit;font-weight:600;}
    .db-inline-title-input:focus{outline:none;border-color:var(--ab-accent);box-shadow:0 0 0 2px var(--ab-accent-glow);}
    .db-inline-hint{font-size:.78rem;color:var(--ab-muted);}
    .aspenboard .db-extra-uc-switch-control{background:var(--ab-accent-quiet);}
    .aspenboard .db-extra-uc-switch input:checked~.db-extra-uc-switch-control{background:var(--ab-accent);box-shadow:0 0 0 2px var(--ab-accent-quiet);}
    .aspenboard .db-color-card-title{color:var(--ab-text);}
    .aspenboard .db-color-layer{background:var(--ab-surface-quiet,var(--ab-panel));border:1px solid var(--ab-border);color:var(--ab-text);box-shadow:var(--ab-shadow);}
    .aspenboard .db-color-layer:hover{border-color:var(--ab-accent);box-shadow:0 0 0 3px var(--ab-accent-glow,var(--ab-accent-soft));}
    .aspenboard .db-color-layer.is-active{border-color:var(--ab-accent);box-shadow:0 0 0 3px var(--ab-accent-glow,var(--ab-accent-soft)),var(--ab-shadow);}
    .aspenboard .db-color-layer-swatch{border-color:var(--ab-border);box-shadow:inset 0 0 0 1px var(--ab-accent-quiet,var(--ab-border));}
  `;

  const XLSX_URLS = [
    'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.20.2/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.20.2/xlsx.full.min.js'
  ];
  const SORTABLE_URLS = [
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js'
  ];

  const GROUP_NAME = 'unitBoardGroup';
  const TITLE_FIELD = 'MELDUNGS_NO';
  const MELDUNG_FIELD = 'MELDUNGS_NO';
  const DEFAULT_SUB_FIELD = 'AUFTRAGS_NO';
  const DEFAULT_PREVIEW_CHIP_COUNT = 3;
  function deriveAccentBaseColor(){
    const root=document.documentElement;
    if(!root) return '';
    const styles=getComputedStyle(root);
    const candidates=[
      '--module-layer-3-module-bg',
      '--module-layer-3-module-text',
      '--module-layer-1-module-text',
      '--module-layer-1-module-bg'
    ];
    for(const prop of candidates){
      const value=(styles.getPropertyValue(prop)||'').trim();
      if(value) return value;
    }
    return '';
  }
  const LS_DOC = 'module_data_v1';
  const LS_STATE = 'aspenUnitListState';
  const LS_STATE_VERSION = 2;
  const MAX_STATE_INSTANCES = 8;
  const CUSTOM_BROADCAST = 'unitBoard:update';
  const HANDLE_DB_NAME = 'modulesApp';
  const HANDLE_STORE_NAME = 'fs-handles';
  const LEGACY_HANDLE_DB_NAME = 'AspenUnitListHandles';
  const LEGACY_HANDLE_STORE_NAME = 'handles';

  let activePermissionDialog=null;

  function normalizeStateKey(seed){
    const raw=typeof seed==='string'?seed.trim():'';
    if(!raw) return 'primary';
    return raw.toLowerCase().replace(/\s+/g,'_');
  }

  function sanitizeInstanceMap(raw){
    const map={};
    if(!raw||typeof raw!=='object') return map;
    Object.keys(raw).forEach(key=>{
      const normalized=normalizeStateKey(key);
      if(!normalized) return;
      const value=raw[key];
      if(!value||typeof value!=='object') return;
      map[normalized]=value;
    });
    return map;
  }

  function buildStateHistory(existingHistory,instances,currentKey){
    const normalizedCurrent=normalizeStateKey(currentKey);
    const seen=new Set();
    const result=[];
    const add=key=>{
      const normalized=normalizeStateKey(key);
      if(!normalized||seen.has(normalized)) return;
      if(normalized!==normalizedCurrent && !instances[normalized]) return;
      result.push(normalized);
      seen.add(normalized);
    };
    add(normalizedCurrent);
    if(Array.isArray(existingHistory)) existingHistory.forEach(add);
    Object.keys(instances||{}).forEach(add);
    return result.slice(0,MAX_STATE_INSTANCES);
  }

  function isQuotaError(error){
    if(!error) return false;
    const name=String(error.name||'');
    return name==='QuotaExceededError'||name==='NS_ERROR_DOM_QUOTA_REACHED';
  }

  function parseStateBundle(raw){
    if(!raw) return null;
    try{
      const parsed=JSON.parse(raw);
      if(!parsed||typeof parsed!=='object') return null;
      if(Array.isArray(parsed.items)||typeof parsed.config==='object'){
        return {meta:{v:1,lastActiveSeed:'primary'},instances:{primary:parsed}};
      }
      const meta=parsed.__meta&&typeof parsed.__meta==='object'?parsed.__meta:{};
      const instances=parsed.instances&&typeof parsed.instances==='object'?parsed.instances:{};
      return {meta,instances};
    }catch{
      return null;
    }
  }

  function loadStateBundle(){
    let raw='';
    try{raw=localStorage.getItem(LS_STATE)||'';}
    catch{return null;}
    if(!raw) return null;
    return parseStateBundle(raw);
  }

  function selectStateFromBundle(bundle,seed){
    if(!bundle||!bundle.instances||typeof bundle.instances!=='object') return null;
    const normalized=normalizeStateKey(seed);
    const direct=bundle.instances[normalized];
    if(direct&&typeof direct==='object') return direct;
    const meta=bundle.meta&&typeof bundle.meta==='object'?bundle.meta:{};
    const lastRaw=typeof meta.lastActiveSeed==='string'?meta.lastActiveSeed.trim():'';
    if(lastRaw){
      const lastKey=normalizeStateKey(lastRaw);
      const last=bundle.instances[lastKey];
      if(last&&typeof last==='object') return last;
    }
    const historyRaw=Array.isArray(meta.history)?meta.history:[];
    for(const entry of historyRaw){
      const historyKey=normalizeStateKey(entry);
      if(historyKey===normalized) continue;
      const candidate=bundle.instances[historyKey];
      if(candidate&&typeof candidate==='object') return candidate;
    }
    if(normalized!=='primary'){
      const primary=bundle.instances.primary;
      if(primary&&typeof primary==='object') return primary;
    }
    const firstKey=Object.keys(bundle.instances).find(key=>{
      const value=bundle.instances[key];
      return value&&typeof value==='object';
    });
    return firstKey?bundle.instances[firstKey]:null;
  }

  function loadStoredState(seed){
    const bundle=loadStateBundle();
    if(!bundle) return null;
    return selectStateFromBundle(bundle,seed);
  }

  function persistStateBundle(seed,payload){
    const normalized=normalizeStateKey(seed);
    const bundle=loadStateBundle()||{meta:{},instances:{}};
    const meta=bundle.meta&&typeof bundle.meta==='object'?{...bundle.meta}:{};
    const instances=sanitizeInstanceMap(bundle.instances);
    instances[normalized]=payload;
    meta.v=LS_STATE_VERSION;
    meta.updatedAt=new Date().toISOString();
    meta.lastActiveSeed=normalized;
    const history=buildStateHistory(meta.history,instances,normalized);
    const allowed=new Set(history);
    Object.keys(instances).forEach(key=>{
      if(!allowed.has(key)) delete instances[key];
    });
    meta.history=history;
    const persist=()=>{
      const serialized=JSON.stringify({__meta:meta,instances});
      localStorage.setItem(LS_STATE,serialized);
    };
    try{
      persist();
      return true;
    }catch(error){
      if(isQuotaError(error)){
        const prunable=history.filter(key=>key!==normalized);
        while(prunable.length){
          const removeKey=prunable.pop();
          delete instances[removeKey];
          const reducedHistory=history.filter(key=>key===normalized||instances[key]);
          meta.history=reducedHistory;
          try{
            persist();
            return true;
          }catch(innerError){
            if(!isQuotaError(innerError)) return false;
          }
        }
      }
      return false;
    }
  }

  async function queryHandlePermission(handle,mode){
    if(!handle || typeof handle.queryPermission!=='function') return 'granted';
    let result='prompt';
    try{
      result=await handle.queryPermission({mode});
    }catch(error){
      console.warn('[AspenBoard] queryPermission fehlgeschlagen',error);
      result='denied';
    }
    try{console.info('[AspenBoard] queryPermission result:',result);}catch{}
    return result||'prompt';
  }

  async function requestHandlePermission(handle,mode){
    if(!handle || typeof handle.requestPermission!=='function') return 'granted';
    try{
      const result=await handle.requestPermission({mode});
      if(result==='granted'){
        console.info('[AspenBoard] requestPermission durch User bestätigt');
      }else{
        console.warn('[AspenBoard] Zugriff verweigert, erneute Dateiauswahl nötig');
      }
      return result||'denied';
    }catch(error){
      console.warn('[AspenBoard] Zugriff verweigert, erneute Dateiauswahl nötig',error);
      return 'denied';
    }
  }

  function closeActivePermissionDialog(){
    if(!activePermissionDialog) return;
    try{activePermissionDialog.overlay?.remove();}catch{}
    activePermissionDialog=null;
  }

  async function requestPermissionViaDialog(handle,mode,{message}={}){
    if(!handle || typeof document==='undefined') return 'denied';
    if(activePermissionDialog){
      closeActivePermissionDialog();
    }
    const overlay=document.createElement('div');
    overlay.className='ab-permission-backdrop';
    const dialog=document.createElement('div');
    dialog.className='ab-permission-dialog';
    const title=document.createElement('h2');
    title.textContent='Dateizugriff erforderlich';
    const text=document.createElement('p');
    text.textContent=message||'Zum Fortfahren muss der Zugriff auf die Datei erlaubt werden.';
    const actions=document.createElement('div');
    actions.className='ab-permission-actions';
    const cancelBtn=document.createElement('button');
    cancelBtn.type='button';
    cancelBtn.textContent='Abbrechen';
    const allowBtn=document.createElement('button');
    allowBtn.type='button';
    allowBtn.className='ab-permission-allow';
    allowBtn.textContent='Zugriff erlauben';
    actions.appendChild(cancelBtn);
    actions.appendChild(allowBtn);
    dialog.appendChild(title);
    dialog.appendChild(text);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    activePermissionDialog={overlay};

    return new Promise(resolve=>{
      let permissionRequested=false;
      const cleanup=result=>{
        if(result!=='granted' && permissionRequested){
          // logging already handled in requestHandlePermission
        }else if(result!=='granted'){
          console.warn('[AspenBoard] Zugriff verweigert, erneute Dateiauswahl nötig');
        }
        closeActivePermissionDialog();
        resolve(result||'denied');
      };
      cancelBtn.addEventListener('click',()=>cleanup('denied'));
      overlay.addEventListener('click',event=>{if(event.target===overlay) cleanup('denied');});
      allowBtn.addEventListener('click',async ()=>{
        if(allowBtn.disabled) return;
        allowBtn.disabled=true;
        cancelBtn.disabled=true;
        permissionRequested=true;
        const outcome=await requestHandlePermission(handle,mode);
        cleanup(outcome);
      });
    });
  }

  async function openIndexedDbStore(dbName,storeName,{logLabel}={}){
    if(typeof indexedDB==='undefined') return null;
    try{
      return await new Promise((resolve,reject)=>{
        const request=indexedDB.open(dbName,1);
        request.onupgradeneeded=()=>{
          const db=request.result;
          if(db && !db.objectStoreNames.contains(storeName)){
            db.createObjectStore(storeName);
          }
        };
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error);
      });
    }catch(error){
      const label=logLabel||'IndexedDB für Aspen-Dateien nicht verfügbar';
      console.warn(`[AspenBoard] ${label}`,error);
      return null;
    }
  }

  async function openHandleStore(){
    return openIndexedDbStore(HANDLE_DB_NAME,HANDLE_STORE_NAME,{logLabel:'IndexedDB für Aspen-Dateien nicht verfügbar'});
  }

  async function openLegacyHandleStore(){
    return openIndexedDbStore(
      LEGACY_HANDLE_DB_NAME,
      LEGACY_HANDLE_STORE_NAME,
      {logLabel:'Legacy-IndexedDB für Aspen-Dateien nicht verfügbar'}
    );
  }

  async function persistFileHandleLegacy(key,handle){
    let legacyDb=null;
    try{
      legacyDb=await openLegacyHandleStore();
      if(!legacyDb) return false;
      await new Promise((resolve,reject)=>{
        const tx=legacyDb.transaction(LEGACY_HANDLE_STORE_NAME,'readwrite');
        tx.oncomplete=()=>resolve();
        tx.onerror=event=>{event?.preventDefault?.();reject(tx.error);};
        const request=tx.objectStore(LEGACY_HANDLE_STORE_NAME).put(handle,key);
        request.onerror=event=>{event?.preventDefault?.();reject(request.error);};
      });
      return true;
    }catch(error){
      console.warn('[AspenBoard] Aspen-Dateihandle konnte nicht im Legacy-Store gespeichert werden',error);
      return false;
    }finally{
      try{legacyDb?.close();}catch{/* ignore */}
    }
  }

  async function removeLegacyHandle(key){
    if(!key) return false;
    let legacyDb=null;
    try{
      legacyDb=await openLegacyHandleStore();
      if(!legacyDb) return false;
      await new Promise((resolve,reject)=>{
        const tx=legacyDb.transaction(LEGACY_HANDLE_STORE_NAME,'readwrite');
        tx.oncomplete=()=>resolve();
        tx.onerror=event=>{event?.preventDefault?.();reject(tx.error);};
        const request=tx.objectStore(LEGACY_HANDLE_STORE_NAME).delete(key);
        request.onerror=event=>{event?.preventDefault?.();reject(request.error);};
      });
      return true;
    }catch(error){
      return false;
    }finally{
      try{legacyDb?.close();}catch{/* ignore */}
    }
  }

  async function readLegacyHandle(key){
    if(!key) return null;
    let legacyDb=null;
    try{
      legacyDb=await openLegacyHandleStore();
      if(!legacyDb) return null;
      const result=await new Promise((resolve,reject)=>{
        const tx=legacyDb.transaction(LEGACY_HANDLE_STORE_NAME,'readonly');
        tx.onerror=event=>{event?.preventDefault?.();reject(tx.error);};
        const store=tx.objectStore(LEGACY_HANDLE_STORE_NAME);
        const request=store.get(key);
        request.onsuccess=()=>resolve(request.result||null);
        request.onerror=event=>{event?.preventDefault?.();reject(request.error);};
      });
      return result||null;
    }catch(error){
      console.warn('[AspenBoard] Aspen-Dateihandle konnte nicht aus Legacy-Store gelesen werden',error);
      return null;
    }finally{
      try{legacyDb?.close();}catch{/* ignore */}
    }
  }

  async function persistFileHandle(key,handle){
    if(!key || !handle) return false;
    let db=null;
    try{
      db=await openHandleStore();
      if(db){
        await new Promise((resolve,reject)=>{
          const tx=db.transaction(HANDLE_STORE_NAME,'readwrite');
          tx.oncomplete=()=>resolve();
          tx.onerror=event=>{event?.preventDefault?.();reject(tx.error);};
          const request=tx.objectStore(HANDLE_STORE_NAME).put(handle,key);
          request.onerror=event=>{event?.preventDefault?.();reject(request.error);};
        });
        console.info('[AspenBoard] FileHandle gespeichert');
        try{await removeLegacyHandle(key);}catch{/* ignore */}
        return true;
      }
    }catch(error){
      console.warn('[AspenBoard] Aspen-Dateihandle konnte nicht gespeichert werden',error);
    }finally{
      try{db?.close();}catch{/* ignore */}
    }
    return persistFileHandleLegacy(key,handle);
  }

  async function restoreFileHandleFromStore(key){
    if(!key) return null;
    let db=null;
    try{
      db=await openHandleStore();
      if(db){
        const result=await new Promise((resolve,reject)=>{
          const tx=db.transaction(HANDLE_STORE_NAME,'readonly');
          tx.onerror=event=>{event?.preventDefault?.();reject(tx.error);};
          const store=tx.objectStore(HANDLE_STORE_NAME);
          const request=store.get(key);
          request.onsuccess=()=>resolve(request.result||null);
          request.onerror=event=>{event?.preventDefault?.();reject(request.error);};
        });
        if(result) return result;
      }
    }catch(error){
      console.warn('[AspenBoard] Aspen-Dateihandle konnte nicht gelesen werden',error);
    }finally{
      try{db?.close();}catch{/* ignore */}
    }
    const legacyResult=await readLegacyHandle(key);
    if(legacyResult){
      try{await persistFileHandle(key,legacyResult);}catch{/* ignore */}
      return legacyResult;
    }
    return null;
  }

  async function clearStoredFileHandle(key){
    if(!key) return false;
    let removed=false;
    let db=null;
    try{
      db=await openHandleStore();
      if(db){
        await new Promise((resolve,reject)=>{
          const tx=db.transaction(HANDLE_STORE_NAME,'readwrite');
          tx.oncomplete=()=>resolve();
          tx.onerror=event=>{event?.preventDefault?.();reject(tx.error);};
          const request=tx.objectStore(HANDLE_STORE_NAME).delete(key);
          request.onerror=event=>{event?.preventDefault?.();reject(request.error);};
        });
        removed=true;
      }
    }catch(error){
      console.warn('[AspenBoard] Aspen-Dateihandle konnte nicht entfernt werden',error);
    }finally{
      try{db?.close();}catch{/* ignore */}
    }
    const legacyRemoved=await removeLegacyHandle(key);
    return removed||legacyRemoved;
  }

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const tag=document.createElement('style');
    tag.id=STYLE_ID;
    tag.textContent=CSS;
    document.head.appendChild(tag);
  }

  async function ensureLibrary(globalKey,promiseKey,urls){
    if(window[globalKey]) return;
    if(window[promiseKey]) return window[promiseKey];
    window[promiseKey]=(async()=>{
      let lastError;
      for(const url of urls){
        try{
          await new Promise((resolve,reject)=>{
            const script=document.createElement('script');
            script.src=url;
            script.async=true;
            script.onload=resolve;
            script.onerror=()=>reject(new Error('load '+url));
            document.head.appendChild(script);
          });
          if(window[globalKey]) return;
        }catch(err){lastError=err;}
      }
      throw lastError||new Error('Failed to load '+globalKey);
    })();
    return window[promiseKey];
  }

  function ensureXLSX(){
    return ensureLibrary('XLSX','__XLSX_LOAD_PROMISE__',XLSX_URLS);
  }

  function ensureSortable(){
    return ensureLibrary('Sortable','__SORTABLE_LOAD_PROMISE__',SORTABLE_URLS);
  }

  function setupUnitBoardShared(shared){
    shared=shared||{};
    shared.aspenRecords=shared.aspenRecords instanceof Map?shared.aspenRecords:new Map();

    if(!shared.ensureXlsxLoader){
      shared.ensureXlsxLoader=async function(loader){
        const ensure=loader||shared.ensureXLSX;
        if(typeof ensure==='function'){
          await ensure();
          return;
        }
        if(!window.XLSX) throw new Error('XLSX nicht verfügbar');
      };
    }

    if(!shared.requestRW){
      shared.requestRW=async function(handle){
        if(!handle?.queryPermission) return true;
        try{
          const state=await queryHandlePermission(handle,'readwrite');
          if(state==='granted') return true;
          const outcome=await requestPermissionViaDialog(handle,'readwrite',{
            message:'Zum Speichern wird Schreibzugriff auf die Datei benötigt.'
          });
          return outcome==='granted';
        }catch(err){
          console.warn('[AspenBoard] Dateizugriff fehlgeschlagen',err);
          return false;
        }
      };
    }

    if(!shared.appendToDictionary){
      shared.appendToDictionary=async function(handle,dataRow,loader){
        if(!handle){
          console.warn('[UnitBoard] Kein Dictionary-Handle gewählt – Eintrag übersprungen');
          return false;
        }
        const granted=await shared.requestRW(handle);
        if(!granted){
          console.warn('[UnitBoard] Schreibrechte für Dictionary.xlsx nicht erteilt');
          return false;
        }
        const safeRow=dataRow&&typeof dataRow==='object'?dataRow:{};
        if(!Object.keys(safeRow).length){
          console.warn('[UnitBoard] Dictionary: Datensatz leer, nichts zu schreiben');
          return false;
        }
        try{await shared.ensureXlsxLoader(loader);}catch(err){
          console.warn('[UnitBoard] XLSX konnte nicht geladen werden',err);
          return false;
        }
        try{
          const file=await handle.getFile();
          let workbook;
          if(file.size>0){
            const buffer=await file.arrayBuffer();
            workbook=XLSX.read(buffer,{type:'array'});
          }else{
            workbook=XLSX.utils.book_new();
          }
          const sheetName='records';
          const sheet=workbook.Sheets[sheetName];
          const rows=sheet?XLSX.utils.sheet_to_json(sheet,{header:1,defval:''}):[];
          const headerRaw=Array.isArray(rows[0])?rows[0].map(cell=>String(cell??'')):
            [];
          const columns=headerRaw.map((label,idx)=>{
            const raw=String(label||'');
            const trimmed=raw.trim();
            return {
              key:trimmed||`Column${idx+1}`,
              lower:(trimmed||`Column${idx+1}`).toLowerCase(),
              label:raw.length?raw:(trimmed||`Column${idx+1}`)
            };
          });
          const usedLower=new Set(columns.map(col=>col.lower));
          const dataKeys=Object.keys(safeRow).filter(Boolean);
          dataKeys.forEach(key=>{
            const lower=key.toLowerCase();
            if(usedLower.has(lower)) return;
            usedLower.add(lower);
            columns.push({key,lower,label:key});
          });
          if(!columns.length){
            dataKeys.forEach((key,idx)=>{
              const fallback=key||`Column${idx+1}`;
              const lower=fallback.toLowerCase();
              if(usedLower.has(lower)) return;
              usedLower.add(lower);
              columns.push({key:fallback,lower,label:fallback});
            });
          }
          const existingRows=rows.slice(1).map(row=>{
            const arr=new Array(columns.length).fill('');
            row.forEach((value,idx)=>{if(idx<columns.length) arr[idx]=String(value??'');});
            return arr;
          });
          const keyLookup=new Map();
          dataKeys.forEach(key=>keyLookup.set(key.toLowerCase(),key));
          const newRow=columns.map(col=>{
            const match=keyLookup.get(col.lower);
            const key=match||col.key;
            return String(safeRow[key]??safeRow[col.key]??'');
          });
          existingRows.push(newRow);
          const headerOut=columns.map(col=>col.label);
          const aoa=[headerOut,...existingRows];
          const sheetOut=XLSX.utils.aoa_to_sheet(aoa);
          workbook.Sheets[sheetName]=sheetOut;
          if(!workbook.SheetNames.includes(sheetName)) workbook.SheetNames.push(sheetName);
          const output=XLSX.write(workbook,{bookType:'xlsx',type:'array'});
          const writable=await handle.createWritable();
          await writable.write(new Blob([output],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
          await writable.close();
          return true;
        }catch(err){
          console.warn('[UnitBoard] Dictionary.xlsx konnte nicht aktualisiert werden',err);
          return false;
        }
      };
    }

    if(!shared.addToDevices){
      shared.addToDevices=async function(handle,meldung,loader){
        const id=String(meldung||'').trim();
        if(!id){
          console.warn('[UnitBoard] Meldung leer – kein Eintrag in Devices.xlsx');
          return false;
        }
        if(!handle){
          console.warn('[UnitBoard] Keine Geräte-Datei gewählt – Eintrag übersprungen');
          return false;
        }
        const granted=await shared.requestRW(handle);
        if(!granted){
          console.warn('[UnitBoard] Schreibrechte für Devices.xlsx nicht erteilt');
          return false;
        }
        try{await shared.ensureXlsxLoader(loader);}catch(err){
          console.warn('[UnitBoard] XLSX konnte nicht geladen werden',err);
          return false;
        }
        try{
          const file=await handle.getFile();
          let workbook;
          if(file.size>0){
            const buffer=await file.arrayBuffer();
            workbook=XLSX.read(buffer,{type:'array'});
          }else{
            workbook=XLSX.utils.book_new();
          }
          const sheetName='Units';
          const sheet=workbook.Sheets[sheetName]||workbook.Sheets[workbook.SheetNames[0]];
          const rows=sheet?XLSX.utils.sheet_to_json(sheet,{header:1,defval:''}):[];
          let header=rows[0]&&rows[0].length?rows[0].map(cell=>String(cell??'')):[];
          if(!header.length) header=['Meldung'];
          const seen=new Set();
          const body=[];
          rows.slice(1).forEach(row=>{
            const value=String(row[0]??'').trim();
            if(!value) return;
            if(seen.has(value)) return;
            seen.add(value);
            body.push([value]);
          });
          if(!seen.has(id)) body.push([id]);
          if(!body.length) body.push([id]);
          const aoa=[header,...body];
          const sheetOut=XLSX.utils.aoa_to_sheet(aoa);
          workbook.Sheets[sheetName]=sheetOut;
          if(!workbook.SheetNames.includes(sheetName)) workbook.SheetNames.push(sheetName);
          const output=XLSX.write(workbook,{bookType:'xlsx',type:'array'});
          const writable=await handle.createWritable();
          await writable.write(new Blob([output],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
          await writable.close();
          return true;
        }catch(err){
          console.warn('[UnitBoard] Devices.xlsx konnte nicht aktualisiert werden',err);
          return false;
        }
      };
    }

    if(!shared.publishAspenItems){
      shared.publishAspenItems=function(instanceId,items){
        if(!instanceId) return;
        const map=new Map();
        (Array.isArray(items)?items:[]).forEach(item=>{
          if(!item) return;
          const meldung=String(item.meldung||'').trim();
          if(!meldung) return;
          map.set(meldung,item);
        });
        shared.aspenRecords.set(instanceId,map);
      };
    }

    if(!shared.clearAspenItems){
      shared.clearAspenItems=function(instanceId){
        if(!instanceId) return;
        shared.aspenRecords.delete(instanceId);
      };
    }

    if(!shared.findAspenItem){
      shared.findAspenItem=function(meldung){
        const key=String(meldung||'').trim();
        if(!key) return null;
        for(const map of shared.aspenRecords.values()){
          const entry=map.get(key);
          if(entry) return entry;
        }
        return null;
      };
    }

    if(!shared.handleAspenToDeviceDrop){
      shared.handleAspenToDeviceDrop=async function(evt,context){
        if(!evt) return {dict:false,devices:false,meldung:''};
        const toType=(evt.to?.dataset?.boardType||'').toLowerCase();
        const fromType=(evt.from?.dataset?.boardType||'').toLowerCase();
        if(toType!=='excel-unit' || fromType!=='aspen-unit'){
          return {dict:false,devices:false,meldung:''};
        }
        const meldung=(evt.item?.dataset?.meldung||'').trim();
        if(!meldung){
          console.warn('[UnitBoard] Meldung beim Drag&Drop nicht gefunden');
          return {dict:false,devices:false,meldung:''};
        }
        const ensure=context?.ensureXLSX||shared.ensureXLSX;
        let sourceItem=null;
        try{sourceItem=shared.findAspenItem(meldung);}catch(err){console.warn('[UnitBoard] Aspen-Lookup fehlgeschlagen',err);}
        if(!sourceItem && evt.item && evt.item.__aspenItem) sourceItem=evt.item.__aspenItem;
        const dataRow=sourceItem&&typeof sourceItem==='object'
          ? (sourceItem.data&&typeof sourceItem.data==='object'?sourceItem.data:sourceItem)
          : null;
        if(!dataRow){
          console.warn('[UnitBoard] Kein Aspen-Datensatz für Meldung',meldung,'gefunden');
        }
        const dictHandle=typeof context?.getDictHandle==='function'?context.getDictHandle():context?.dictHandle;
        const deviceHandle=typeof context?.getDeviceHandle==='function'?context.getDeviceHandle():context?.deviceHandle;
        let dictResult=false;
        if(dataRow){
          if(dictHandle){
            try{dictResult=await shared.appendToDictionary(dictHandle,dataRow,ensure);}catch(err){console.warn('[UnitBoard] Dictionary-Sync fehlgeschlagen',err);}        
          }else{
            console.warn('[UnitBoard] Kein Dictionary-Handle verfügbar – Meldung',meldung,'wird nicht übernommen');
          }
        }
        let devicesResult=false;
        if(deviceHandle){
          try{devicesResult=await shared.addToDevices(deviceHandle,meldung,ensure);}catch(err){console.warn('[UnitBoard] Geräte-Liste konnte nicht aktualisiert werden',err);}        
        }else{
          console.warn('[UnitBoard] Keine Geräte-Datei verbunden – Meldung',meldung,'konnte nicht gesichert werden');
        }
        if(dictResult||devicesResult){
          try{console.info('[SYNC]','Meldung',meldung,'von Aspen -> Geräteliste, Dictionary+Devices aktualisiert');}catch{}
        }
        return {dict:dictResult,devices:devicesResult,meldung};
      };
    }

    return shared;
  }

  const SHARED=setupUnitBoardShared(window.__UNIT_BOARD_SHARED__||{});
  window.__UNIT_BOARD_SHARED__=SHARED;
  if(typeof ensureXLSX==='function' && !SHARED.ensureXLSX){
    SHARED.ensureXLSX=ensureXLSX;
  }

  function dedupeByMeldung(list){
    const seen=new Set();
    return (Array.isArray(list)?list:[]).filter(item=>{
      const meldung=(item?.meldung||'').trim();
      if(!meldung) return false;
      if(seen.has(meldung)) return false;
      seen.add(meldung);
      return true;
    });
  }

  const parseJson=s=>{try{return JSON.parse(s)||{};}catch{return{};}};
  function ensureDocStructure(doc){
    const base=doc&&typeof doc==='object'?doc:{};
    if(!base.__meta||typeof base.__meta!=='object') base.__meta={};
    if(!base.general||typeof base.general!=='object') base.general={};
    if(!base.instances||typeof base.instances!=='object') base.instances={};
    return base;
  }
  const loadDoc=()=>ensureDocStructure(parseJson(localStorage.getItem(LS_DOC)));
  const saveDoc=doc=>{
    const prepared=ensureDocStructure(doc);
    prepared.__meta={...prepared.__meta,v:1,updatedAt:new Date().toISOString()};
    try{localStorage.setItem(LS_DOC,JSON.stringify(prepared));}
    catch(e){/* ignore */}
    return prepared;
  };
  const getActiveMeldung=()=> (loadDoc().general?.Meldung||'').trim();

  function instanceIdOf(root){
    if(!root) return 'asp-'+Math.random().toString(36).slice(2);
    const host=root.closest?.('.grid-stack-item');
    if(host?.dataset?.instanceId) return host.dataset.instanceId;
    if(!root.dataset.aspenInstanceId){
      root.dataset.aspenInstanceId='asp-'+Math.random().toString(36).slice(2);
    }
    return root.dataset.aspenInstanceId;
  }

  function createElements(initialTitle){
    const root=document.createElement('div');
    root.className='db-root aspenboard';
    root.innerHTML=`
      <div class="db-titlebar" hidden>
        <div class="db-title-group">
          <span class="db-title-text"></span>
          <span class="db-title-meta" hidden></span>
          <span class="db-title-status" hidden role="status" aria-live="polite">
            <span class="db-status-icon" aria-hidden="true"></span>
            <span class="db-status-text"></span>
          </span>
          <span class="db-title-hint" hidden></span>
        </div>
        <button type="button" class="db-refresh" title="Aspen-Datei aktualisieren">↻</button>
      </div>
      <div class="db-surface">
        <div class="db-toolbar">
          <div class="db-toggle-group" aria-label="Extraspalten umschalten"></div>
          <div class="db-search-filter-group" aria-label="Such-Vorfilter"></div>
          <input type="search" class="db-search" placeholder="Geräte suchen…">
        </div>
        <div class="db-lists">
          <div class="db-list-wrap db-main-wrap">
            <div class="db-list db-main-list" data-board-type="aspen-unit"></div>
          </div>
          <div class="db-extra-container"></div>
          <div class="db-list-wrap db-active-wrap" hidden>
            <div class="db-list-title db-active-title">Aktive Geräte</div>
            <div class="db-list db-active-list" data-board-type="aspen-active"></div>
          </div>
        </div>
      </div>
      <div class="db-modal">
        <div class="db-panel">
          <div class="db-config-tabs" role="tablist" aria-label="Einstellungsbereiche">
            <button type="button" class="db-config-tab is-active" role="tab" aria-selected="true" data-tab="general">Allgemein</button>
            <button type="button" class="db-config-tab" role="tab" aria-selected="false" data-tab="extras">Extraspalten</button>
            <button type="button" class="db-config-tab" role="tab" aria-selected="false" data-tab="design">Design</button>
          </div>
          <div class="db-tab-panel db-tab-general is-active" data-tab="general">
            <div class="db-config-layout">
              <aside class="db-config-filter">
                <div class="db-quick-section">
                  <div class="db-option-section">
                    <label>Titel (optional)<input type="text" class="db-title-input"></label>
                    <div class="db-option-actions">
                      <button type="button" class="db-menu-toggle db-action-pick" title="Aspen-Datei auswählen">
                        <span class="db-menu-toggle-icon" aria-hidden="true">📂</span>
                        <span class="db-menu-toggle-label">Aspen.xlsx wählen</span>
                      </button>
                      <div class="db-menu-toggle-group" role="group" aria-label="Partfilter Schnellaktionen">
                        <button type="button" class="db-menu-toggle db-action-enable" aria-pressed="false">
                          <span class="db-menu-toggle-icon" aria-hidden="true">✓</span>
                          <span class="db-menu-toggle-label">Alles aktivieren</span>
                        </button>
                        <button type="button" class="db-menu-toggle db-action-disable" aria-pressed="false">
                          <span class="db-menu-toggle-icon" aria-hidden="true">✕</span>
                          <span class="db-menu-toggle-label">Alle deaktivieren</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="db-part-section">
                  <div class="db-part-filter"><input type="search" class="db-part-filter-input" placeholder="Überschriften filtern…"></div>
                  <div class="db-part-list"></div>
                </div>
              </aside>
              <div class="db-config-main">
                <div class="row rules">
                  <div class="db-row-header">
                    <div class="db-rule-label">Titel-Logik (Wenn/Dann)</div>
                    <div class="db-row-actions">
                      <button type="button" class="db-icon-btn db-rule-import" title="Regeln importieren" aria-label="Regeln importieren">📥</button>
                      <button type="button" class="db-icon-btn db-rule-export" title="Regeln exportieren" aria-label="Regeln exportieren">📤</button>
                    </div>
                  </div>
                  <div class="db-rule-list"></div>
                  <button type="button" class="db-add-rule">Regel hinzufügen</button>
                </div>
                <div class="row subs">
                  <div class="db-row-header">
                    <label>Untertitel-Felder</label>
                    <div class="db-row-actions">
                      <button type="button" class="db-icon-btn db-sub-import" title="Untertitel importieren" aria-label="Untertitel importieren">📥</button>
                      <button type="button" class="db-icon-btn db-sub-export" title="Untertitel exportieren" aria-label="Untertitel exportieren">📤</button>
                    </div>
                  </div>
                  <div class="db-sub-list"></div>
                  <button type="button" class="db-add-sub">+</button>
                </div>
                <div class="row">
                  <label>Custom-Berechnung (optional)
                    <input type="text" class="db-custom-formula" placeholder="z.B. value - IST_AH_FS">
                  </label>
                  <small class="db-hint">Tokens: value/custom + Aspen-Spalten (z.B. IST_AH_FS). Anzeige via Untertitel-Felder → Custom-Berechnung.</small>
                  <label>Custom-Berechnungslabel
                    <input type="text" class="db-custom-calc-label" placeholder="Differenz zu IST_AH_FS">
                  </label>
                </div>
                <div class="row filters">
                  <div class="db-row-header"><div class="db-rule-label">Such-Vorfilter</div></div>
                  <div class="db-filter-list"></div>
                  <button type="button" class="db-add-filter">Filter hinzufügen</button>
                </div>
                <div class="row">
                  <label>Dropdownkriterium
                    <div class="db-part-select">
                      <input type="text" class="db-part-select-input" placeholder="Spalte wählen">
                      <div class="db-part-options"></div>
                    </div>
                    <select class="db-sel-part" hidden></select>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="db-tab-panel db-tab-extras" data-tab="extras" hidden>
            <div class="db-extra-card">
              <div class="db-extra-card-title">Extraspalten</div>
              <div class="db-extra-card-body">
                <div class="db-extra-config db-extra-layout">
                  <div class="db-extra-section db-extra-columns">
                    <div class="db-extra-section-header">
                      <div class="db-extra-section-title">Spalten</div>
                      <div class="db-extra-section-hint">Bezeichnung und Anzahl der Zusatzspalten.</div>
                    </div>
                    <label class="db-extra-count-label">Anzahl Extraspalten<input type="number" class="db-extra-count" min="0" max="6" step="1" value="0"></label>
                    <div class="db-extra-name-list"></div>
                  </div>
                  <div class="db-extra-section db-extra-rules">
                    <div class="db-extra-section-header">
                      <div class="db-extra-section-title">Regeln</div>
                      <div class="db-extra-section-hint">Geräte landen mit passenden Feld/Kombinationen direkt in der Zielspalte – unabhängig von der bisherigen Zuweisung.</div>
                    </div>
                    <div class="db-extra-rule-board"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="db-tab-panel db-tab-design" data-tab="design" hidden>
            <div class="db-design-card">
              <div class="db-design-header">
                <div class="db-design-title">
                  <div class="label">Schriftgröße der Karten</div>
                  <div class="hint">Passt die Textgröße der Gerätekachel für Vorschau und Board an.</div>
                </div>
                <div class="db-design-controls">
                  <div class="db-design-slider">
                    <input type="range" class="db-design-font-range" min="0.8" max="1.6" step="0.05">
                    <input type="number" class="db-design-font-input" min="0.8" max="1.6" step="0.05">
                  </div>
                  <label class="db-design-chip-input">
                    <span class="db-design-chip-label">Vorschau-Chips</span>
                    <input type="number" class="db-design-chip-count" min="0" max="8" step="1" value="3">
                    <span class="db-design-chip-hint">Stellt testweise ein, wie viele Chips die Vorschau anzeigt.</span>
                  </label>
                </div>
              </div>
              <div class="db-design-preview" aria-live="polite"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const titleBar=root.querySelector('.db-titlebar');
    if(titleBar){
      const titleText=titleBar.querySelector('.db-title-text');
      if(titleText) titleText.textContent=initialTitle||'';
      titleBar.hidden=!(initialTitle||'').trim();
    }

        return {
      root,
      list:root.querySelector('.db-main-list'),
      activeWrap:root.querySelector('.db-active-wrap'),
      activeList:root.querySelector('.db-active-list'),
      activeTitle:root.querySelector('.db-active-title'),
      extraContainer:root.querySelector('.db-extra-container'),
      toggleGroup:root.querySelector('.db-toggle-group'),
      searchFilterGroup:root.querySelector('.db-search-filter-group'),
      search:root.querySelector('.db-search'),
      titleBar,
      titleText:root.querySelector('.db-title-text'),
      refreshBtn:root.querySelector('.db-refresh'),
      statusWrap:root.querySelector('.db-title-status'),
      statusIcon:root.querySelector('.db-status-icon'),
      statusText:root.querySelector('.db-status-text'),
      titleHint:root.querySelector('.db-title-hint'),
      modal:root.querySelector('.db-modal'),
      titleInput:root.querySelector('.db-title-input'),
      ruleList:root.querySelector('.db-rule-list'),
      addRuleBtn:root.querySelector('.db-add-rule'),
      ruleImportBtn:root.querySelector('.db-rule-import'),
      ruleExportBtn:root.querySelector('.db-rule-export'),
      subList:root.querySelector('.db-sub-list'),
      addSubBtn:root.querySelector('.db-add-sub'),
      subImportBtn:root.querySelector('.db-sub-import'),
      subExportBtn:root.querySelector('.db-sub-export'),
      filterList:root.querySelector('.db-filter-list'),
      addFilterBtn:root.querySelector('.db-add-filter'),
      customFormulaInput:root.querySelector('.db-custom-formula'),
      customCalcLabelInput:root.querySelector('.db-custom-calc-label'),
      selPart:root.querySelector('.db-sel-part'),
      partSelectWrap:root.querySelector('.db-part-select'),
      partSelectInput:root.querySelector('.db-part-select-input'),
      partSelectOptions:root.querySelector('.db-part-options'),
      extraCount:root.querySelector('.db-extra-count'),
      extraNameList:root.querySelector('.db-extra-name-list'),
      extraRuleBoard:root.querySelector('.db-extra-rule-board'),
      partList:root.querySelector('.db-part-list'),
      partFilter:root.querySelector('.db-part-filter-input'),
      enableAllBtn:root.querySelector('.db-action-enable'),
      disableAllBtn:root.querySelector('.db-action-disable'),
      pickBtn:root.querySelector('.db-action-pick'),
      configTabs:Array.from(root.querySelectorAll('.db-config-tab')),
      tabPanels:Array.from(root.querySelectorAll('.db-tab-panel')),
      designRange:root.querySelector('.db-design-font-range'),
      designInput:root.querySelector('.db-design-font-input'),
      designChipInput:root.querySelector('.db-design-chip-count'),
      designPreview:root.querySelector('.db-design-preview')
    };
  }

  function createInitialState(initialTitle){
    return {
      fields:[],
      config:{
        subFields:[createSubFieldConfig(DEFAULT_SUB_FIELD)],
        partField:TITLE_FIELD,
        title:initialTitle,
        titleRules:[],
        extraColumns:[],
        activeColumn:sanitizeActiveColumn({}),
        design:sanitizeDesignConfig({}),
        searchFilters:[],
        customCalcFormula:'',
        customCalcLabel:''
      },
      items:[],
      excluded:new Set(),
      customEntries:{},
      customLabel:'',
      filePath:'',
      searchQuery:'',
      partFilter:'',
      activeMeldungen:new Set(),
      activeSearchFilters:new Set(),
      showActiveList:false,
      columnAssignments:new Map(),
      hiddenExtraColumns:new Set(),
      autoAssignments:new Map()
    };
  }

  function ensureSubFields(config){
    if(!config||typeof config!=='object') return;
    const fallback=config.subField||config.partField||DEFAULT_SUB_FIELD;
    config.subFields=sanitizeSubFieldList(config.subFields,{fallbackField:fallback});
    if('subField' in config) delete config.subField;
  }

  function generateExtraColumnId(){
    return 'extra-'+Math.random().toString(36).slice(2,9);
  }

  function createEmptyExtraCondition(){
    return {field:'',keyword:''};
  }

  function createEmptyExtraRule(defaultTarget=''){
    return {conditions:[createEmptyExtraCondition()],toColumn:defaultTarget||''};
  }

  function sanitizeExtraCondition(condition){
    const source=condition&&typeof condition==='object'?condition:{};
    const field=typeof source.field==='string'
      ? source.field.trim()
      : typeof source.status==='string'
        ? source.status.trim()
        : '';
    const keyword=typeof source.keyword==='string'?source.keyword.trim():'';
    return {field,keyword};
  }

  function normalizeRuleConditions(rule){
    const source=rule&&typeof rule==='object'?rule:{};
    const rawConditions=Array.isArray(source.conditions)?source.conditions:[];
    const seeded=rawConditions.length?rawConditions:[{field:source.field||source.status||'',keyword:source.keyword||''}];
    const normalized=seeded.map(condition=>sanitizeExtraCondition(condition));
    return normalized.length?normalized:[createEmptyExtraCondition()];
  }

  function sanitizeExtraRule(rule,{defaultTarget=''}={}){
    const source=rule&&typeof rule==='object'?rule:{};
    const toColumn=typeof source.toColumn==='string'
      ? source.toColumn.trim()
      : typeof source.column==='string'
        ? source.column.trim()
        : '';
    const conditions=normalizeRuleConditions(source);
    const [primary]=conditions;
    return {
      conditions,
      field:primary.field,
      keyword:primary.keyword,
      toColumn:toColumn||defaultTarget
    };
  }

  function sanitizeExtraRuleList(rules,{defaultTarget=''}={}){
    if(!Array.isArray(rules)) return [];
    const sanitized=rules.map(rule=>sanitizeExtraRule(rule,{defaultTarget}));
    return sanitized.filter(rule=>rule && typeof rule==='object');
  }

  function clampCardFontScale(value){
    const num=Number(value);
    if(!Number.isFinite(num)) return 1;
    return Math.min(1.6,Math.max(0.8,num));
  }

  function clampPreviewChipCount(value){
    const num=Math.round(Number(value));
    if(!Number.isFinite(num)) return DEFAULT_PREVIEW_CHIP_COUNT;
    return Math.min(8,Math.max(0,num));
  }

  function sanitizeDesignConfig(design){
    const source=design&&typeof design==='object'?design:{};
    const cardFontScale=clampCardFontScale(source.cardFontScale);
    const previewChipCount=clampPreviewChipCount(source.previewChipCount);
    return {cardFontScale,previewChipCount};
  }

  function sanitizeExtraColumns(columns){
    if(!Array.isArray(columns)) return [];
    const sanitized=[];
    const seen=new Set();
    let ucAssigned=false;
    for(const entry of columns){
      if(sanitized.length>=MAX_EXTRA_COLUMNS) break;
      const source=entry&&typeof entry==='object'?entry:{};
      let id=typeof source.id==='string'?source.id.trim():'';
      const label=typeof source.label==='string'?source.label.trim():'';
      while(!id || seen.has(id)){
        id=generateExtraColumnId();
      }
      seen.add(id);
      const requestedUcSort=!!source.ucSort;
      const ucSort=!ucAssigned && requestedUcSort;
      if(ucSort) ucAssigned=true;
      const baseRules=sanitizeExtraRuleList(source.rules,{defaultTarget:id});
      const rules=(()=>{
        if(!ucSort) return baseRules;
        const hasUcRule=baseRules.some(rule=>{
          const normalized=sanitizeExtraRule(rule,{defaultTarget:id});
          return (Array.isArray(normalized.conditions)?normalized.conditions:[])
            .some(condition=>String(condition.field||'').toLowerCase()==='uc' && !condition.keyword);
        });
        if(hasUcRule) return baseRules;
        return [
          {field:'UC',keyword:'',toColumn:id},
          ...baseRules
        ];
      })();
      sanitized.push({id,label,rules});
    }
    return sanitized;
  }

  function sanitizeActiveColumn(column){
    const source=column&&typeof column==='object'?column:{};
    const label=typeof source.label==='string'?source.label.trim():'';
    let enabled=true;
    if(Object.prototype.hasOwnProperty.call(source,'enabled')){
      enabled=!!source.enabled;
    }else if(Object.prototype.hasOwnProperty.call(source,'visible')){
      enabled=!!source.visible;
    }else if(Object.prototype.hasOwnProperty.call(source,'show')){
      enabled=!!source.show;
    }
    return {id:ACTIVE_COLUMN_ID,label:label||DEFAULT_ACTIVE_COLUMN_LABEL,enabled};
  }

  function ensureExtraColumns(config){
    if(!config||typeof config!=='object') return;
    config.extraColumns=sanitizeExtraColumns(config.extraColumns||[]);
  }

  function ensureActiveColumn(config){
    if(!config||typeof config!=='object') return;
    const candidate=config.activeColumn||{label:config.activeColumnLabel};
    config.activeColumn=sanitizeActiveColumn(candidate);
    if(Object.prototype.hasOwnProperty.call(config,'activeColumnLabel')){
      delete config.activeColumnLabel;
    }
  }

  function ensureDesignConfig(config){
    if(!config||typeof config!=='object') return;
    config.design=sanitizeDesignConfig(config.design||{});
  }

  function generateSearchFilterId(){
    return 'filter-'+Math.random().toString(36).slice(2,9);
  }

  function sanitizeSearchFilters(filters){
    if(!Array.isArray(filters)) return [];
    const sanitized=[];
    const seen=new Set();
    for(const entry of filters){
      const source=entry&&typeof entry==='object'?entry:{};
      let id=typeof source.id==='string'?source.id.trim():'';
      const label=typeof source.label==='string'?source.label.trim():'';
      const query=typeof source.query==='string'?source.query.trim():'';
      const defaultActive=!!source.defaultActive;
      while(!id || seen.has(id)){
        id=generateSearchFilterId();
      }
      seen.add(id);
      sanitized.push({id,label,query,defaultActive});
    }
    return sanitized;
  }

  function ensureSearchFilters(config){
    if(!config||typeof config!=='object') return;
    config.searchFilters=sanitizeSearchFilters(config.searchFilters||[]);
  }

  function normalizeColumnAssignments(raw){
    if(raw instanceof Map){
      return new Map(Array.from(raw.entries()).map(([meldung,column])=>{
        const key=typeof meldung==='string'?meldung.trim():String(meldung||'').trim();
        const value=typeof column==='string'?column.trim():String(column||'').trim();
        return [key,value];
      }).filter(([meldung,column])=>meldung && column));
    }
    const map=new Map();
    if(raw && typeof raw==='object'){
      Object.keys(raw).forEach(key=>{
        const meldung=String(key||'').trim();
        const column=String(raw[key]||'').trim();
        if(!meldung || !column) return;
        map.set(meldung,column);
      });
    }
    return map;
  }

  function ensureColumnAssignments(state){
    if(!state||typeof state!=='object') return;
    const validIds=new Set((state.config?.extraColumns||[]).map(col=>col.id).filter(Boolean));
    const normalized=normalizeColumnAssignments(state.columnAssignments);
    if(!validIds.size){
      state.columnAssignments=new Map();
      return;
    }
    const filtered=new Map();
    normalized.forEach((column,meldung)=>{
      if(validIds.has(column)) filtered.set(meldung,column);
    });
    state.columnAssignments=filtered;
  }

  function ensureHiddenExtraColumns(state){
    if(!state||typeof state!=='object') return;
    const validIds=new Set((state.config?.extraColumns||[]).map(col=>col.id).filter(Boolean));
    const current=state.hiddenExtraColumns;
    const raw=Array.isArray(current)?current:current instanceof Set?Array.from(current):[];
    const sanitized=new Set(raw.map(id=>String(id||'').trim()).filter(id=>id && validIds.has(id)));
    state.hiddenExtraColumns=sanitized;
  }

  function columnAssignmentsToObject(assignments){
    const output={};
    if(assignments instanceof Map){
      assignments.forEach((column,meldung)=>{
        const key=String(meldung||'').trim();
        const value=String(column||'').trim();
        if(!key || !value) return;
        output[key]=value;
      });
      return output;
    }
    if(assignments && typeof assignments==='object'){
      Object.keys(assignments).forEach(key=>{
        const meldung=String(key||'').trim();
        const value=String(assignments[key]||'').trim();
        if(!meldung || !value) return;
        output[meldung]=value;
      });
    }
    return output;
  }

  function normalizeOperator(value){
    const raw=typeof value==='string'?value.trim():'';
    if(!raw) return '=';
    const map={
      '>':'>',
      '>=':'>=',
      '≥':'>=',
      '<':'<',
      '<=':'<=',
      '≤':'<=',
      '=':'=',
      '==':'=',
      '===':'=',
      '!=':'!=',
      '≠':'!=',
      'contains':'contains',
      'enthält':'contains',
      'enthaelt':'contains',
      '~':'contains'
    };
    const key=raw.toLowerCase();
    return map[key]||map[raw]||'=';
  }

  function sanitizeHexColor(value){
    if(typeof value!=='string') return '';
    const raw=value.trim();
    if(!raw) return '';
    const match=raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if(!match) return '';
    let hex=match[1];
    if(hex.length===3){
      hex=hex.split('').map(ch=>ch+ch).join('');
    }
    return `#${hex.toLowerCase()}`;
  }

  function normalizeTitleRule(rule){
    const source=rule&&typeof rule==='object'?rule:{};
    const field=typeof source.field==='string'?source.field:'';
    const operator=normalizeOperator(source.operator);
    const valueRaw=source.value;
    const value=typeof valueRaw==='number'?String(valueRaw):typeof valueRaw==='string'?valueRaw:'';
    const text=typeof source.text==='string'?source.text:'';
    const color=sanitizeHexColor(source.color||'');
    return {field,operator,value,text,color};
  }

  function createSubFieldConfig(field='',nickname='',filter=''){
    return {
      field:typeof field==='string'?field.trim():'',
      nickname:typeof nickname==='string'?nickname:'',
      filter:typeof filter==='string'?filter:''
    };
  }

  function normalizeSubField(entry,{allowEmptyField=false}={}){
    if(typeof entry==='string'){
      const field=entry.trim();
      if(!field && !allowEmptyField) return null;
      return createSubFieldConfig(field);
    }
    if(entry && typeof entry==='object'){
      const field=typeof entry.field==='string'?entry.field.trim():'';
      const nickname=typeof entry.nickname==='string'?entry.nickname:'';
      const filter=typeof entry.filter==='string'?entry.filter:'';
      if(!field && !allowEmptyField) return null;
      return createSubFieldConfig(field,nickname,filter);
    }
    if(allowEmptyField){
      return createSubFieldConfig('');
    }
    return null;
  }

  function sanitizeSubFieldList(source,{fallbackField=DEFAULT_SUB_FIELD}={}){
    const normalized=[];
    if(Array.isArray(source)){
      source.forEach(entry=>{
        const normalizedEntry=normalizeSubField(entry);
        if(!normalizedEntry || !normalizedEntry.field) return;
        normalized.push(normalizedEntry);
      });
    }
    let fallback=fallbackField;
    if(normalized.length){
      return normalized;
    }
    if(typeof fallback!=='string' || !fallback.trim()){
      fallback=DEFAULT_SUB_FIELD;
    }
    return [createSubFieldConfig(fallback)];
  }

  function primarySubField(config){
    ensureSubFields(config);
    return config.subFields[0]?.field||DEFAULT_SUB_FIELD;
  }

  function restoreState(state,instanceId,storageKey){
    const key=normalizeStateKey(storageKey);
    let saved=null;
    try{saved=loadStoredState(key);}catch(e){saved=null;}
    if(!saved && instanceId){
      const snapshot=loadDoc()?.instances?.[instanceId]?.aspenUnitList;
      if(snapshot&&typeof snapshot==='object'){
        const snapshotKey=normalizeStateKey(snapshot.storageKey||'');
        if(!snapshot.storageKey||snapshotKey===key){
          saved=snapshot;
        }
      }
    }
      if(!saved||typeof saved!=='object') return;
      try{
        if(Array.isArray(saved.fields)) state.fields=saved.fields.slice();
        if(saved.config){
        const savedRules=Array.isArray(saved.config.titleRules)?saved.config.titleRules.map(rule=>normalizeTitleRule(rule)):
          state.config.titleRules.slice();
        const fallbackSubField=saved.config.partField||saved.config.subField||state.config.partField||DEFAULT_SUB_FIELD;
        const savedSubFields=sanitizeSubFieldList(saved.config.subFields||state.config.subFields,{fallbackField:fallbackSubField});
        state.config={
          subFields:savedSubFields,
          partField:saved.config.partField||state.config.partField,
          title:typeof saved.config.title==='string'?saved.config.title:state.config.title,
          titleRules:savedRules,
          extraColumns:sanitizeExtraColumns(saved.config.extraColumns||state.config.extraColumns||[]),
          activeColumn:sanitizeActiveColumn(saved.config.activeColumn||{label:saved.config.activeColumnLabel||state.config.activeColumn?.label}),
          design:sanitizeDesignConfig(saved.config.design||state.config.design||{}),
          searchFilters:sanitizeSearchFilters(saved.config.searchFilters||state.config.searchFilters||[]),
          customCalcFormula:typeof saved.config.customCalcFormula==='string'?saved.config.customCalcFormula:state.config.customCalcFormula,
          customCalcLabel:typeof saved.config.customCalcLabel==='string'?saved.config.customCalcLabel:state.config.customCalcLabel
        };
      }
      ensureSubFields(state.config);
      ensureExtraColumns(state.config);
      ensureActiveColumn(state.config);
      ensureDesignConfig(state.config);
      ensureSearchFilters(state.config);
      let restoredOrder=false;
      if(Array.isArray(saved.items) && saved.items.length){
        state.items=dedupeByMeldung(saved.items);
        restoredOrder=true;
      }
      if(Array.isArray(saved.excluded)) state.excluded=new Set(saved.excluded);
      state.customEntries=sanitizeCustomEntries(saved.customEntries);
      state.customLabel=normalizeCustomLabel(saved.customLabel);
      if(!state.customLabel){
        const firstLabel=Object.values(state.customEntries).find(entry=>entry?.label)?.label;
        state.customLabel=normalizeCustomLabel(firstLabel);
      }
      state.filePath=typeof saved.filePath==='string'?saved.filePath:state.filePath;
      state.searchQuery=typeof saved.searchQuery==='string'?saved.searchQuery:'';
      state.partFilter=typeof saved.partFilter==='string'?saved.partFilter:'';
      const availableFilterIds=new Set((state.config.searchFilters||[]).map(filter=>filter.id));
      if(Array.isArray(saved.activeSearchFilters)){
        const normalized=saved.activeSearchFilters.map(id=>String(id||'').trim()).filter(id=>id && availableFilterIds.has(id));
        state.activeSearchFilters=new Set(normalized);
      }else{
        const defaults=(state.config.searchFilters||[]).filter(filter=>filter.defaultActive);
        state.activeSearchFilters=new Set(defaults.map(filter=>filter.id));
      }
      if(Array.isArray(saved.activeMeldungen)){
        const normalized=saved.activeMeldungen.map(val=>String(val||'').trim()).filter(Boolean);
        state.activeMeldungen=new Set(normalized);
      }
      if(typeof saved.showActiveList==='boolean') state.showActiveList=!!saved.showActiveList;
      if(Array.isArray(saved.hiddenExtraColumns)){
        state.hiddenExtraColumns=new Set(saved.hiddenExtraColumns.map(id=>String(id||'').trim()).filter(Boolean));
      }
      state.columnAssignments=normalizeColumnAssignments(saved.columnAssignments);
      ensureColumnAssignments(state);
      ensureHiddenExtraColumns(state);
      state.autoAssignments=new Map();
      if(!restoredOrder){
        state.items=dedupeByMeldung(state.items);
        if(Array.isArray(state.items) && state.items.length){
          const sortField=primarySubField(state.config);
          state.items.sort((a,b)=>String(a?.data?.[sortField]||'').localeCompare(String(b?.data?.[sortField]||'')));
        }
      }
    }catch(e){/* ignore */}
  }

  function persistModuleSnapshot(instanceId,payload){
    if(!instanceId) return;
    const doc=loadDoc();
    doc.instances[instanceId] ||= {};
    doc.instances[instanceId].aspenUnitList=payload;
    saveDoc(doc);
  }

  function persistState(state,instanceId,storageKey){
    state.items=dedupeByMeldung(state.items);
    ensureSubFields(state.config);
    ensureExtraColumns(state.config);
    ensureActiveColumn(state.config);
    ensureDesignConfig(state.config);
    ensureSearchFilters(state.config);
    ensureColumnAssignments(state);
    ensureHiddenExtraColumns(state);
    const payload={
      fields:Array.isArray(state.fields)?state.fields.slice():[],
      config:{
        subFields:Array.isArray(state.config.subFields)?state.config.subFields.map(sub=>({...sub})):[],
        partField:state.config.partField,
        title:state.config.title,
        titleRules:Array.isArray(state.config.titleRules)?state.config.titleRules.map(rule=>normalizeTitleRule(rule)):[],
        extraColumns:Array.isArray(state.config.extraColumns)?state.config.extraColumns.map(col=>({
          ...col,
          rules:Array.isArray(col.rules)?col.rules.map(rule=>({...rule})):[]
        })) : [],
        activeColumn:{...sanitizeActiveColumn(state.config.activeColumn)},
        design:{...sanitizeDesignConfig(state.config.design)},
        searchFilters:Array.isArray(state.config.searchFilters)?state.config.searchFilters.map(filter=>({...filter})):[],
        customCalcFormula:state.config.customCalcFormula||'',
        customCalcLabel:state.config.customCalcLabel||''
      },
      items:Array.isArray(state.items)?state.items.slice():[],
      excluded:Array.from(state.excluded),
      customEntries:sanitizeCustomEntries(state.customEntries),
      customLabel:normalizeCustomLabel(state.customLabel),
      filePath:state.filePath,
      searchQuery:state.searchQuery||'',
      partFilter:state.partFilter||'',
      activeSearchFilters:Array.from(state.activeSearchFilters||[]),
      activeMeldungen:Array.from(state.activeMeldungen||[]).map(val=>String(val||'').trim()).filter(Boolean),
      showActiveList:!!state.showActiveList,
      columnAssignments:columnAssignmentsToObject(state.columnAssignments),
      hiddenExtraColumns:Array.from(state.hiddenExtraColumns||[])
    };
    const key=normalizeStateKey(storageKey);
    try{persistStateBundle(key,payload);}catch{}
    if(instanceId){
      const snapshot={
        fields:payload.fields.slice(),
        config:{
          ...payload.config,
          subFields:payload.config.subFields.map(sub=>({...sub})),
          titleRules:payload.config.titleRules.map(rule=>({...rule})),
          extraColumns:payload.config.extraColumns.map(col=>({
            ...col,
            rules:Array.isArray(col.rules)?col.rules.map(rule=>({...rule})):[]
          })),
          activeColumn:{...payload.config.activeColumn},
          design:{...payload.config.design},
          searchFilters:payload.config.searchFilters.map(filter=>({...filter})),
          customCalcFormula:payload.config.customCalcFormula||'',
          customCalcLabel:payload.config.customCalcLabel||''
        },
        items:payload.items.map(item=>{
          if(!item||typeof item!=='object') return item;
          return {
            ...item,
            data:item.data&&typeof item.data==='object'?{...item.data}:item.data,
            subs:Array.isArray(item.subs)?item.subs.slice():item.subs,
            tags:Array.isArray(item.tags)?item.tags.slice():item.tags
          };
        }),
        excluded:payload.excluded.slice(),
        customEntries:{...payload.customEntries},
        customLabel:payload.customLabel,
        filePath:payload.filePath,
        searchQuery:payload.searchQuery,
        partFilter:payload.partFilter,
        activeSearchFilters:payload.activeSearchFilters.slice(),
        activeMeldungen:payload.activeMeldungen.slice(),
        showActiveList:payload.showActiveList,
        columnAssignments:{...payload.columnAssignments},
        hiddenExtraColumns:payload.hiddenExtraColumns.slice()
      };
      snapshot.instanceId=instanceId;
      snapshot.lastUpdated=Date.now();
      snapshot.storageKey=key;
      persistModuleSnapshot(instanceId,snapshot);
    }
  }

  function getAvailableFieldList(state,extra,{includeCustom=false}={}){
    const base=Array.isArray(state.fields)&&state.fields.length?state.fields.slice():[];
    const extras=Array.isArray(extra)?extra:[extra];
    extras.filter(Boolean).forEach(value=>{
      const field=typeof value==='string'?value:String(value?.field||'').trim();
      if(field && !base.includes(field)) base.push(field);
    });
    if(includeCustom){
      [CUSTOM_FIELD_KEY,CUSTOM_CALC_FIELD_KEY].forEach(field=>{
        if(!base.some(entry=>String(entry||'').toLowerCase()===field)) base.push(field);
      });
    }
    if(!base.length) base.push(DEFAULT_SUB_FIELD);
    return base;
  }

  function getDataFieldValue(data,field){
    if(!data||typeof data!=='object' || !field) return '';
    if(Object.prototype.hasOwnProperty.call(data,field)){
      const value=data[field];
      if(value===undefined || value===null) return '';
      return typeof value==='string'?value.trim():String(value).trim();
    }
    const lowerField=field.toLowerCase();
    for(const key of Object.keys(data)){
      if(typeof key!=='string') continue;
      if(key.trim().toLowerCase()===lowerField){
        const value=data[key];
        if(value===undefined || value===null) continue;
        return typeof value==='string'?value.trim():String(value).trim();
      }
    }
    return '';
  }

  function getUcFieldValue(item){
    if(!item||typeof item!=='object') return '';
    const data=item.data&&typeof item.data==='object'?item.data:{};
    if(Object.prototype.hasOwnProperty.call(data,'UC')){
      return String(data.UC??'').trim();
    }
    for(const key of Object.keys(data||{})){
      if(typeof key!=='string') continue;
      if(key.trim().toLowerCase()==='uc'){
        return String(data[key]??'').trim();
      }
    }
    return '';
  }

  function getItemKeywords(item){
    if(!item||typeof item!=='object') return [];
    const data=item.data&&typeof item.data==='object'?item.data:{};
    const keywordKey=Object.keys(data).find(key=>typeof key==='string' && key.toLowerCase().includes('keyword'));
    const raw=keywordKey?getDataFieldValue(data,keywordKey):'';
    if(!raw) return [];
    return raw
      .split(/[;,|]/)
      .map(part=>part.trim())
      .filter(Boolean);
  }

  function collectKnownKeywords(items){
    const keywords=new Set();
    (Array.isArray(items)?items:[]).forEach(item=>{
      getItemKeywords(item).forEach(keyword=>{
        if(keyword) keywords.add(keyword);
      });
    });
    return Array.from(keywords);
  }

  function escapeRegex(value){
    return value.replace(/[.*+?^${}()|\[\]\\]/g,'\\$&');
  }

  function buildKeywordMatcher(keyword){
    const raw=typeof keyword==='string'?keyword.trim():'';
    if(!raw) return {test:()=>false,isValid:true,isPattern:false,pattern:''};
    const parseBooleanMatcher=()=>{
      const normalizeSegment=value=>value.trim();
      const orParts=raw.split(/\bOR\b|\|\|/i).map(normalizeSegment).filter(Boolean);
      if(orParts.length>1){
        const matchers=orParts.map(part=>buildKeywordMatcher(part));
        const isValid=matchers.every(matcher=>matcher.isValid);
        return {
          test:value=>matchers.some(matcher=>matcher.test(value)),
          isValid,
          isPattern:true,
          pattern:raw
        };
      }
      const andParts=raw.split(/\bAND\b|&&/i).map(normalizeSegment).filter(Boolean);
      if(andParts.length>1){
        const matchers=andParts.map(part=>buildKeywordMatcher(part));
        const isValid=matchers.every(matcher=>matcher.isValid);
        return {
          test:value=>matchers.every(matcher=>matcher.test(value)),
          isValid,
          isPattern:true,
          pattern:raw
        };
      }
      return null;
    };
    const booleanMatcher=parseBooleanMatcher();
    if(booleanMatcher) return booleanMatcher;
    const parseNumericValue=value=>{
      const match=String(value??'').match(/-?\d+(?:[.,]\d+)?/);
      if(!match) return Number.NaN;
      return Number.parseFloat(match[0].replace(',','.'));
    };
    const parseNumericMatcher=()=>{
      const match=raw.match(/^(<=|>=|<>|==|!?=|<|>)\s*(-?\d+(?:[.,]\d+)?)/);
      if(!match) return null;
      const [,operator,rawTarget]=match;
      const target=parseNumericValue(rawTarget);
      if(Number.isNaN(target)){
        return {test:()=>false,isValid:false,isPattern:true,pattern:raw,error:'Ungültiger Zahlenwert'};
      }
      const compare=value=>{
        const actual=parseNumericValue(value);
        if(Number.isNaN(actual)) return false;
        switch(operator){
          case '>':
            return actual>target;
          case '>=':
            return actual>=target;
          case '<':
            return actual<target;
          case '<=':
            return actual<=target;
          case '=':
          case '==':
            return actual===target;
          case '<>':
          case '!=':
            return actual!==target;
          default:
            return false;
        }
      };
      return {test:compare,isValid:true,isPattern:true,pattern:raw};
    };
    const numericMatcher=parseNumericMatcher();
    if(numericMatcher) return numericMatcher;
    const asRegex=(pattern)=>{
      try{
        const regex=new RegExp(pattern,'i');
        return {test:value=>regex.test(value||''),isValid:true,isPattern:true,pattern};
      }catch(error){
        return {test:()=>false,isValid:false,isPattern:true,pattern,error};
      }
    };
    if(raw.startsWith('/') && raw.endsWith('/') && raw.length>2){
      return asRegex(raw.slice(1,-1));
    }
    const hasPatternSyntax=/[|*?()[\]]/.test(raw);
    if(hasPatternSyntax){
      const converted=raw.split('').map(char=>{
        if(char==='*') return '.*';
        if(char==='?') return '.';
        if(char==='|') return '|';
        if(char==='(' || char===')' || char==='[' || char===']') return char;
        return escapeRegex(char);
      }).join('');
      return asRegex(converted);
    }
    const normalized=raw.toLowerCase();
    return {test:value=>(value||'').toLowerCase().includes(normalized),isValid:true,isPattern:false,pattern:normalized};
  }

  function findRuleTarget(extraColumns,item){
    const availableIds=new Set((Array.isArray(extraColumns)?extraColumns:[]).map(col=>col.id).filter(Boolean));
    if(!availableIds.size) return '';
    const data=item?.data&&typeof item.data==='object'?item.data:{};
    for(const column of extraColumns){
      const rules=Array.isArray(column?.rules)?column.rules:[];
      for(const rawRule of rules){
        const rule=sanitizeExtraRule(rawRule,{defaultTarget:column.id});
        const target=(rule.toColumn||column.id||'').trim();
        if(!target || !availableIds.has(target)) continue;
        const conditions=Array.isArray(rule.conditions)?rule.conditions:[];
        const meaningful=conditions
          .map(condition=>sanitizeExtraCondition(condition))
          .filter(condition=>condition.field||condition.keyword);
        if(!meaningful.length) continue;
        let allMatch=true;
        for(const condition of meaningful){
          const ruleField=(condition.field||'').trim();
          const ruleKeyword=typeof condition.keyword==='string'?condition.keyword.trim():'';
          const value=ruleField?getDataFieldValue(data,ruleField):'';
          if(!ruleKeyword){
            if(!value){
              allMatch=false;
              break;
            }
            continue;
          }
          const matcher=buildKeywordMatcher(ruleKeyword);
          if(!matcher.isValid || !value || !matcher.test(value)){
            allMatch=false;
            break;
          }
        }
        if(allMatch){
          return target;
        }
      }
    }
    return '';
  }

  function parseColorToRgb(color){
    if(!color) return null;
    const raw=String(color).trim();
    if(!raw) return null;
    const hexMatch=raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if(hexMatch){
      let hex=hexMatch[1];
      if(hex.length===3){
        hex=hex.split('').map(ch=>ch+ch).join('');
      }
      const r=parseInt(hex.slice(0,2),16);
      const g=parseInt(hex.slice(2,4),16);
      const b=parseInt(hex.slice(4,6),16);
      return [r,g,b];
    }
    const rgbMatch=raw.match(/^rgba?\(([^)]+)\)$/i);
    if(rgbMatch){
      const parts=rgbMatch[1].split(',').map(part=>part.trim());
      if(parts.length>=3){
        const [r,g,b]=parts;
        const toByte=value=>{
          if(value.endsWith('%')){
            const ratio=Number.parseFloat(value.slice(0,-1));
            if(Number.isNaN(ratio)) return null;
            return clamp(Math.round(ratio*2.55),0,255);
          }
          const num=Number.parseFloat(value);
          if(Number.isNaN(num)) return null;
          return clamp(Math.round(num),0,255);
        };
        const red=toByte(r);
        const green=toByte(g);
        const blue=toByte(b);
        if([red,green,blue].every(channel=>typeof channel==='number')){
          return [red,green,blue];
        }
      }
    }
    return null;
  }

  function formatRgba(color,alpha){
    const rgb=parseColorToRgb(color);
    if(!rgb) return null;
    const finiteAlpha=Number.isFinite(alpha)?alpha:1;
    const normalized=Math.round(clamp(finiteAlpha,0,1)*1000)/1000;
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${normalized})`;
  }

  function relativeLuminance(color){
    const rgb=parseColorToRgb(color);
    if(!rgb) return null;
    const [r,g,b]=rgb.map(channel=>{
      const srgb=channel/255;
      return srgb<=0.03928?srgb/12.92:Math.pow((srgb+0.055)/1.055,2.4);
    });
    return 0.2126*r+0.7152*g+0.0722*b;
  }

  function idealTextColor(background){
    const lum=relativeLuminance(background);
    if(lum==null) return '#111111';
    return lum<=0.45?'#ffffff':'#111111';
  }

  function shadeColor(color,factor){
    const rgb=parseColorToRgb(color);
    if(!rgb) return color;
    const clamp=value=>Math.max(0,Math.min(255,Math.round(value)));
    const safeFactor=Math.max(-1,Math.min(1,Number.isFinite(factor)?factor:0));
    const adjusted=rgb.map(channel=>{
      return safeFactor<0?channel*(1+safeFactor):channel+(255-channel)*safeFactor;
    }).map(clamp);
    const [r,g,b]=adjusted;
    const hex=(1<<24)+(r<<16)+(g<<8)+b;
    return `#${hex.toString(16).slice(1)}`;
  }

  function formatChipStyle(color){
    const sanitized=sanitizeHexColor(color);
    if(!sanitized) return '';
    const rgb=parseColorToRgb(sanitized);
    if(!rgb) return '';
    const [r,g,b]=rgb;
    const background=`rgba(${r},${g},${b},0.18)`;
    const border=`rgba(${r},${g},${b},0.35)`;
    const lum=relativeLuminance(sanitized);
    const textColor=lum!=null && lum>0.75?'#111111':sanitized;
    return `background:${background};border:1px solid ${border};color:${textColor};`;
  }

  function formatLastModified(value){
    if(typeof value!=='number' || !Number.isFinite(value)) return '';
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return '';
    const pad=num=>String(num).padStart(2,'0');
    const day=pad(date.getDate());
    const month=pad(date.getMonth()+1);
    const hours=pad(date.getHours());
    const minutes=pad(date.getMinutes());
    return `${day}.${month}  ${hours}:${minutes}`;
  }

  function updateTitleBar(root,title,options){
    const bar=root.querySelector('.db-titlebar');
    if(!bar) return;
    const textNode=bar.querySelector('.db-title-text');
    const refreshBtn=bar.querySelector('.db-refresh');
    const metaNode=bar.querySelector('.db-title-meta');
    const statusNode=bar.querySelector('.db-title-status');
    const statusIcon=bar.querySelector('.db-status-icon');
    const statusTextNode=bar.querySelector('.db-status-text');
    const hintNode=bar.querySelector('.db-title-hint');
    const fallback=(options?.filePath||'').trim();
    const text=(title||'').trim()||fallback;
    if(textNode){
      textNode.textContent=text;
    }else{
      bar.textContent=text;
    }
    const formattedMeta=formatLastModified(options?.lastModified);
    if(metaNode){
      if(formattedMeta){
        metaNode.textContent=`Aspenalter: ${formattedMeta}`;
        metaNode.hidden=false;
        metaNode.removeAttribute('hidden');
        metaNode.style.removeProperty('display');
      }else{
        metaNode.textContent='';
        metaNode.hidden=true;
        metaNode.setAttribute('hidden','');
        metaNode.style.display='none';
      }
    }
    const hasFile=!!options?.hasFile;
    if(hintNode){
      if(!hasFile){
        const hintText=options?.hintText||'Keine Aspen-Datei verbunden – bitte Aspen.xlsx wählen.';
        hintNode.textContent=hintText;
        hintNode.hidden=false;
        hintNode.removeAttribute('hidden');
        hintNode.style.removeProperty('display');
      }else{
        hintNode.textContent='';
        hintNode.hidden=true;
        hintNode.setAttribute('hidden','');
        hintNode.style.display='none';
      }
    }
    const pollingActive=!!options?.pollingActive && hasFile;
    if(statusNode){
      if(pollingActive){
        if(statusIcon) statusIcon.textContent=options?.statusIcon||'🔄';
        if(statusTextNode) statusTextNode.textContent=options?.statusText||'Automatisches Polling aktiv';
        statusNode.hidden=false;
        statusNode.removeAttribute('hidden');
        statusNode.style.removeProperty('display');
      }else{
        if(statusIcon) statusIcon.textContent='';
        if(statusTextNode) statusTextNode.textContent='';
        statusNode.hidden=true;
        statusNode.setAttribute('hidden','');
        statusNode.style.display='none';
      }
    }
    const canRefresh=!!options?.canRefresh;
    const showRefresh=canRefresh||!!fallback||!hasFile;
    if(refreshBtn){
      refreshBtn.hidden=!showRefresh;
      const label=canRefresh?'Aspen-Datei aktualisieren':'Aspen-Datei wählen';
      refreshBtn.title=label;
      refreshBtn.setAttribute('aria-label',label);
    }
    const showMeta=!!metaNode && !metaNode.hidden && !!metaNode.textContent.trim();
    const showStatus=!!statusNode && !statusNode.hidden && !!statusNode.textContent?.trim();
    const showHint=!hasFile && !!hintNode && !hintNode.hidden && !!hintNode.textContent.trim();
    bar.hidden=!text && !showRefresh && !showMeta && !showStatus && !showHint;
  }

  function parseNumericValue(value){
    if(typeof value==='number' && Number.isFinite(value)) return value;
    if(typeof value==='boolean') return value?1:0;
    const raw=typeof value==='string'?value.trim():value;
    if(typeof raw==='string'){
      if(!raw) return NaN;
      const normalized=raw.replace(/,/g,'.');
      const num=Number(normalized);
      return Number.isNaN(num)?NaN:num;
    }
    const coerced=Number(raw);
    return Number.isNaN(coerced)?NaN:coerced;
  }

  function formatNumericValue(value){
    const rounded=Math.round(value*100)/100;
    return String(rounded);
  }

  function sanitizeCustomEntries(raw){
    const output={};
    if(!raw || typeof raw!=='object') return output;
    Object.entries(raw).forEach(([key,entry])=>{
      const meldung=String(key||'').trim();
      if(!meldung) return;
      const source=entry&&typeof entry==='object'?entry:{};
      const label=typeof source.label==='string'?source.label.trim():'';
      const value=typeof source.value==='string'?source.value.trim():'';
      if(!label && !value) return;
      output[meldung]={label,value};
    });
    return output;
  }

  function normalizeCustomLabel(value){
    return typeof value==='string'?value.trim():'';
  }

  function resolveCustomLabel(state,entryLabel){
    const fromState=normalizeCustomLabel(state?.customLabel);
    if(fromState) return fromState;
    return normalizeCustomLabel(entryLabel);
  }

  function getCustomEntry(state,meldung){
    const key=String(meldung||'').trim();
    if(!key) return {label:'',value:''};
    const entry=state?.customEntries?.[key];
    return {
      label:typeof entry?.label==='string'?entry.label.trim():'',
      value:typeof entry?.value==='string'?entry.value.trim():''
    };
  }

  function buildCustomCalcContext(customValue,data){
    const context={};
    const base=parseNumericValue(customValue);
    if(Number.isFinite(base)){
      context.value=base;
      context.custom=base;
    }
    if(data && typeof data==='object'){
      Object.entries(data).forEach(([key,value])=>{
        const num=parseNumericValue(value);
        if(!Number.isFinite(num)) return;
        context[key]=num;
        context[String(key).toLowerCase()]=num;
      });
    }
    return context;
  }

  function evaluateCustomFormula(formula,context){
    const raw=String(formula||'').trim();
    if(!raw) return '';
    if(/[^0-9A-Za-z_+\-*/().\s]/.test(raw)) return '';
    const replaced=raw.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g,token=>{
      const value=context[token] ?? context[token.toLowerCase()];
      if(!Number.isFinite(value)) return 'NaN';
      return String(value);
    });
    try{
      const result=Function(`"use strict"; return (${replaced});`)();
      if(!Number.isFinite(result)) return '';
      return formatNumericValue(result);
    }catch{
      return '';
    }
  }

  function compareRuleValue(rawValue,operator,targetValue){
    const op=normalizeOperator(operator);
    const leftRaw=rawValue==null?'':String(rawValue).trim();
    const rightRaw=targetValue==null?'':String(targetValue).trim();
    const leftNum=parseNumericValue(rawValue);
    const rightNum=parseNumericValue(targetValue);
    const numeric=!Number.isNaN(leftNum) && !Number.isNaN(rightNum);
    switch(op){
      case '>': return numeric && leftNum>rightNum;
      case '>=': return numeric && leftNum>=rightNum;
      case '<': return numeric && leftNum<rightNum;
      case '<=': return numeric && leftNum<=rightNum;
      case 'contains':
        if(!rightRaw) return false;
        return leftRaw.toLowerCase().includes(rightRaw.toLowerCase());
      case '!=':
        if(numeric) return leftNum!==rightNum;
        return leftRaw.toLowerCase()!==rightRaw.toLowerCase();
      case '=':
      default:
        if(numeric) return leftNum===rightNum;
        return leftRaw.toLowerCase()===rightRaw.toLowerCase();
    }
  }

  function collectRuleTagsForItem(item,state){
    if(!state?.config || !item) return [];
    const rules=Array.isArray(state.config.titleRules)?state.config.titleRules:[];
    if(!rules.length) return [];
    const data=item.data&&typeof item.data==='object'?item.data:{};
    return rules.map(rule=>{
      const normalized=normalizeTitleRule(rule);
      const field=(normalized.field||'').trim();
      const text=(normalized.text||'').trim();
      if(!field || !text) return null;
      const operator=normalizeOperator(normalized.operator);
      const value=normalized.value;
      if(!compareRuleValue(data[field],operator,value)) return null;
      return {text,color:sanitizeHexColor(normalized.color||'')};
    }).filter(Boolean);
  }

  function buildCardMarkup(item,config,ruleTags,state){
    const titleValue=item.data?.[TITLE_FIELD]||'';
    const meldung=item.meldung||'';
    const customEntry=getCustomEntry(state,meldung);
    const customLabel=resolveCustomLabel(state,customEntry.label)||'KV-Arbeitsstunden';
    const customValue=customEntry.value||'';
    const calcFormula=state?.config?.customCalcFormula||'';
    const calcLabel=(state?.config?.customCalcLabel||'').trim()||'Berechnung';
    const calcValue=calcFormula
      ? evaluateCustomFormula(calcFormula,buildCustomCalcContext(customValue,item.data||{}))
      : '';
    let hasCustomLine=false;
    let hasCustomCalcLine=false;
    const subs=(Array.isArray(config.subFields)?config.subFields:[])
      .map(entry=>normalizeSubField(entry))
      .filter(Boolean)
      .map(sub=>{
        const field=sub.field;
        if(!field) return '';
        const fieldKey=field.toLowerCase();
        if(fieldKey===CUSTOM_FIELD_KEY){
          hasCustomLine=true;
          const valueText=customValue||'–';
          const labelText=customLabel.trim()||'KV-Arbeitsstunden';
          return `<div class="db-sub-line db-custom-line" data-field="${CUSTOM_FIELD_KEY}">
            <span class="db-custom-label">${escapeHtml(labelText)}</span>
            <span class="db-custom-sep">: </span>
            <span class="db-custom-value">${escapeHtml(valueText)}</span>
          </div>`;
        }
        if(fieldKey===CUSTOM_CALC_FIELD_KEY){
          hasCustomCalcLine=true;
          if(!calcValue) return '';
          return `<div class="db-sub-line db-custom-calc-line" data-field="${CUSTOM_CALC_FIELD_KEY}">
            <span class="db-custom-calc-label">${escapeHtml(calcLabel)}</span>
            <span class="db-custom-sep">: </span>
            <span class="db-custom-calc-value">${escapeHtml(calcValue)}</span>
          </div>`;
        }
        const rawValue=item.data?.[field];
        const baseValue=rawValue==null?'':String(rawValue);
        if(!baseValue) return '';
        const filterString=typeof sub.filter==='string'?sub.filter:'';
        const filteredValue=filterString?baseValue.split(filterString).join(''):baseValue;
        if(!filteredValue) return '';
        const display=`${sub.nickname||''}${filteredValue}`;
        return display?`<div class="db-sub-line" data-field="${field}">${display}</div>`:'';
      })
      .filter(Boolean);
    if(!hasCustomLine && customValue){
      subs.push(`<div class="db-sub-line db-custom-line" data-field="${CUSTOM_FIELD_KEY}">
        <span class="db-custom-label">${escapeHtml(customLabel.trim()||'KV-Arbeitsstunden')}</span>
        <span class="db-custom-sep">: </span>
        <span class="db-custom-value">${escapeHtml(customValue)}</span>
      </div>`);
    }
    if(!hasCustomCalcLine && calcValue){
      subs.push(`<div class="db-sub-line db-custom-calc-line" data-field="${CUSTOM_CALC_FIELD_KEY}">
        <span class="db-custom-calc-label">${escapeHtml(calcLabel)}</span>
        <span class="db-custom-sep">: </span>
        <span class="db-custom-calc-value">${escapeHtml(calcValue)}</span>
      </div>`);
    }
    const subHtml=subs.join('');
    const tags=Array.isArray(ruleTags)?ruleTags.map(tag=>({
      text:String(tag?.text||'').trim(),
      color:sanitizeHexColor(tag?.color||'')
    })).filter(tag=>!!tag.text):[];
    const tagHtml=tags.length?`<div class="db-card-tags">${tags.map(tag=>{
      const style=tag.color?formatChipStyle(tag.color):'';
      const styleAttr=style?` style="${style}"`:'';
      return `<span class="db-card-tag"${styleAttr}>${escapeHtml(tag.text)}</span>`;
    }).join('')}</div>`:'';
    return `
      <div class="db-card" data-id="${item.id}" data-meldung="${meldung}" data-part="${item.part}">
        <div class="db-flex">
          <div class="db-card-header">
            <div class="db-title">${titleValue}</div>
            ${tagHtml}
          </div>
          <div class="db-sub">${subHtml}</div>
        </div>
        <div class="db-handle" title="Ziehen">⋮⋮</div>
      </div>
    `;
  }

  function getFilterDisplayLabel(filter){
    if(!filter||typeof filter!=='object') return '';
    const label=typeof filter.label==='string'?filter.label.trim():'';
    if(label) return label;
    const query=typeof filter.query==='string'?filter.query.trim():'';
    return query;
  }

  function getActiveSearchFilters(state){
    if(!state||typeof state!=='object') return [];
    const filters=Array.isArray(state.config?.searchFilters)?state.config.searchFilters:[];
    const activeRaw=state.activeSearchFilters;
    const activeSet=activeRaw instanceof Set?activeRaw:new Set(Array.isArray(activeRaw)?activeRaw:[]);
    return filters.filter(filter=>filter?.id && activeSet.has(filter.id));
  }

  function getSearchContext(state){
    const userQuery=typeof state?.searchQuery==='string'?state.searchQuery:'';
    const queryTerms=(userQuery.match(/\S+/g)||[]).map(term=>term.toLowerCase());
    const activeFilters=getActiveSearchFilters(state);
    const filterTerms=[];
    activeFilters.forEach(filter=>{
      const raw=typeof filter?.query==='string'?filter.query:'';
      if(!raw) return;
      const terms=(raw.match(/\S+/g)||[]).map(term=>term.toLowerCase());
      filterTerms.push(...terms);
    });
    return {
      userQuery,
      filters:activeFilters,
      terms:[...filterTerms,...queryTerms]
    };
  }

  function formatEmptySearchMessage(searchContext,fallback){
    const context=searchContext||{userQuery:'',filters:[],terms:[]};
    const userQuery=(context.userQuery||'').trim();
    const filters=Array.isArray(context.filters)?context.filters:[];
    const filterLabels=filters.map(filter=>getFilterDisplayLabel(filter)).filter(Boolean);
    if(filterLabels.length){
      const quoted=filterLabels.map(label=>`„${escapeHtml(label)}“`).join(', ');
      if(userQuery){
        return `Keine Treffer für „${escapeHtml(userQuery)}“ mit Filter ${quoted}`;
      }
      return `Keine Treffer für Filter ${quoted}`;
    }
    if(userQuery){
      return `Keine Treffer für „${escapeHtml(userQuery)}“`;
    }
    return fallback;
  }

  function renderListSection(listEl,state,items,options){
    if(!listEl) return;
    const searchContext=options?.searchContext||getSearchContext(state);
    const terms=searchContext.terms||[];
    const respectExcluded=options?.respectExcluded!==false;
    const ignoreSearch=options?.ignoreSearch===true;
    const visible=items.filter(item=>{
      if(respectExcluded && state.excluded.has(item.part)) return false;
      if(ignoreSearch) return true;
      return itemMatchesSearch(item,terms,state);
    });
    if(!visible.length){
      const fallback=options?.emptyMessage||'Keine Geräte';
      const message=!ignoreSearch && terms.length?formatEmptySearchMessage(searchContext,fallback):fallback;
      listEl.innerHTML=`<div class="db-empty">${message}</div>`;
      updateHighlights(listEl);
      return;
    }
    listEl.innerHTML=visible
      .map(item=>buildCardMarkup(item,state.config,collectRuleTagsForItem(item,state),state))
      .join('');
    const nodes=listEl.querySelectorAll('.db-card');
    visible.forEach((item,index)=>{
      const node=nodes[index];
      if(node){
        node.__aspenItem=item;
      }
    });
    updateHighlights(listEl);
  }

  function refreshPartControls(elements,state,renderFn){
    const partListEl=elements?.partList;
    if(!partListEl) return;
    state.items=dedupeByMeldung(state.items);
    const filterRaw=(state.partFilter||'').trim().toLowerCase();
    const parts=Array.from(new Set(state.items.map(item=>item.part))).sort();
    const totalParts=parts.length;
    const excludedCount=parts.reduce((count,part)=>count+(state.excluded.has(part)?1:0),0);
    const allEnabled=totalParts>0 && excludedCount===0;
    const allDisabled=totalParts>0 && excludedCount===totalParts;
    if(elements.enableAllBtn){
      elements.enableAllBtn.disabled=!totalParts;
      elements.enableAllBtn.classList.toggle('is-active',allEnabled);
      elements.enableAllBtn.setAttribute('aria-pressed',String(!!allEnabled));
    }
    if(elements.disableAllBtn){
      elements.disableAllBtn.disabled=!totalParts;
      elements.disableAllBtn.classList.toggle('is-active',allDisabled);
      elements.disableAllBtn.setAttribute('aria-pressed',String(!!allDisabled));
    }
    if(elements.partFilter){
      elements.partFilter.value=state.partFilter||'';
    }
    const filtered=filterRaw?parts.filter(part=>part.toLowerCase().includes(filterRaw)):parts;
    if(!filtered.length){
      partListEl.innerHTML='<div class="db-empty">Keine Treffer</div>';
      return;
    }
    partListEl.innerHTML=filtered.map(part=>`<label class="db-check"><input type="checkbox" data-part="${part}" ${state.excluded.has(part)?'':'checked'}> ${part}</label>`).join('');
    partListEl.querySelectorAll('input').forEach(input=>{
      input.addEventListener('change',()=>{
        const part=input.dataset.part;
        if(input.checked){
          state.excluded.delete(part);
        }else{
          state.excluded.add(part);
        }
        renderFn();
      });
    });
  }

  function updateHighlights(list){
    const active=getActiveMeldung();
    list.querySelectorAll('.db-card').forEach(node=>{
      const meldung=(node.dataset.meldung||'').trim();
      node.classList.toggle('active',active&&meldung===active);
    });
  }

  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"']/g,char=>{
      switch(char){
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case '\'': return '&#39;';
        default: return char;
      }
    });
  }

  function itemMatchesSearch(item,terms,state){
    if(!Array.isArray(terms) || !terms.length) return true;
    const values=[];
    if(item?.meldung) values.push(item.meldung);
    if(item?.part) values.push(item.part);
    const customEntry=getCustomEntry(state,item?.meldung);
    const customLabel=resolveCustomLabel(state,customEntry.label);
    if(customLabel) values.push(customLabel);
    if(customEntry.value) values.push(customEntry.value);
    const calcFormula=state?.config?.customCalcFormula||'';
    if(calcFormula){
      const calcValue=evaluateCustomFormula(calcFormula,buildCustomCalcContext(customEntry.value,item?.data||{}));
      if(calcValue) values.push(calcValue);
    }
    const data=item?.data && typeof item.data==='object'?item.data:{};
    for(const key in data){
      const val=data[key];
      if(val==null) continue;
      values.push(val);
    }
    if(!values.length) return false;
    const haystack=values.map(entry=>String(entry).toLowerCase());
    return terms.every(term=>haystack.some(value=>value.includes(term)));
  }

  window.renderAspenBoard=async function(targetDiv,opts){
    let lastModifiedCheck=null;
    let pollInterval=null;
    const POLL_INTERVAL_MS=5000;
    let pollInProgress=false;
    injectStyles();

    const initialTitle=opts?.moduleJson?.settings?.title||'';
    const elements=createElements(initialTitle);
    targetDiv.appendChild(elements.root);
    elements.extraWraps=[];
    elements.list.dataset.boardType='aspen-unit';
    if(elements.activeList) elements.activeList.dataset.boardType='aspen-active';

    const state=createInitialState(initialTitle);
    const instanceId=instanceIdOf(elements.root);
    const seedCandidates=[
      opts?.moduleJson?.settings?.stateSeed,
      opts?.moduleJson?.settings?.seed,
      opts?.moduleJson?.id,
      opts?.moduleJson?.moduleKey
    ];
    let rawPersistenceSeed=seedCandidates.find(value=>typeof value==='string' && value.trim());
    if(!rawPersistenceSeed){
      rawPersistenceSeed=instanceId||'primary';
    }
    const stateStorageKey=normalizeStateKey(rawPersistenceSeed);
    const handleStorageKey=`aspen-unit-handle::${stateStorageKey}`;
    const legacyHandleKeys=Array.from(new Set([
      ...seedCandidates
        .filter(value=>typeof value==='string' && value.trim())
        .flatMap(value=>{
          const trimmed=value.trim();
          const normalized=normalizeStateKey(trimmed);
          const keys=[`aspen-unit-handle::${trimmed}`];
          if(normalized && normalized!==trimmed){
            keys.push(`aspen-unit-handle::${normalized}`);
          }
          return keys;
        }),
      'aspen-unit-handle::primary'
    ])).filter(key=>key && key!==handleStorageKey);
    let fileHandle=null;
    let hasReadPermission=false;
    let tempSubFields=[];
    let tempTitleRules=[];
    let tempExtraColumns=[];
    let tempActiveColumnLabel='';
    let tempActiveColumnEnabled=true;
    let tempSearchFilters=[];
    let tempDesignConfig=null;
    let partOptions=[];
    let filteredPartOptions=[];
    let partSelectOpen=false;
    let highlightedPartIndex=-1;
    let partSelectOutsideHandler=null;
    let optionPersistTimer=null;
    let applyingOptionChanges=false;
    const extraSortableInstances=new Map();
    let baseSortableConfig=null;
    let lastExtraSignature=null;
    let activeConfigTab='general';

    function activateConfigTab(tab){
      const allowedTabs=['general','extras','design'];
      const target=allowedTabs.includes(tab)?tab:'general';
      activeConfigTab=target;
      (elements.configTabs||[]).forEach(btn=>{
        const isActive=(btn.dataset?.tab||'')===target;
        btn.classList.toggle('is-active',isActive);
        btn.setAttribute('aria-selected',isActive?'true':'false');
        btn.setAttribute('tabindex',isActive?'0':'-1');
      });
      (elements.tabPanels||[]).forEach(panel=>{
        const isActive=(panel.dataset?.tab||'')===target;
        panel.classList.toggle('is-active',isActive);
        panel.hidden=!isActive;
      });
    }

    function applyOptionChanges(){
      if(applyingOptionChanges) return;
      applyingOptionChanges=true;
      try{
        if(elements.subList){
          elements.subList.querySelectorAll('.db-sub-input, .db-sub-nickname, .db-sub-filter').forEach(input=>{
            input.dispatchEvent(new Event('change'));
          });
        }
        if(elements.ruleList){
          elements.ruleList.querySelectorAll('.db-rule-field').forEach(input=>{
            input.dispatchEvent(new Event('change'));
          });
        }
        if(elements.titleInput){
          state.config.title=elements.titleInput.value.trim();
        }
        if(elements.customFormulaInput){
          state.config.customCalcFormula=elements.customFormulaInput.value.trim();
        }
        if(elements.customCalcLabelInput){
          state.config.customCalcLabel=elements.customCalcLabelInput.value.trim();
        }
        const newPart=elements.selPart?.value||'';
        const partChanged=newPart && state.config.partField!==newPart;
        if(newPart){
          state.config.partField=newPart;
        }
        const optionsOpen=!!elements.modal?.classList.contains('open');
        const subFieldSource=optionsOpen && Array.isArray(tempSubFields)&&tempSubFields.length
          ? tempSubFields
          : Array.isArray(state.config.subFields)?state.config.subFields:[];
        const availableSubFields=getAvailableFieldList(state,[],{includeCustom:true});
        const fallbackField=availableSubFields[0]||DEFAULT_SUB_FIELD;
        const sanitizedSubs=sanitizeSubFieldList(subFieldSource,{fallbackField});
        state.config.subFields=sanitizedSubs;
        if(optionsOpen){
          tempSubFields=sanitizedSubs.map(sub=>({...sub}));
        }
        const ruleSource=optionsOpen && Array.isArray(tempTitleRules)
          ? tempTitleRules
          : Array.isArray(state.config.titleRules)?state.config.titleRules:[];
        const preparedRules=ruleSource.map(rule=>normalizeTitleRule(rule)).map(rule=>({
          field:(rule.field||'').trim(),
          operator:normalizeOperator(rule.operator),
          value:typeof rule.value==='string'?rule.value.trim():(rule.value==null?'':String(rule.value).trim()),
          text:(rule.text||'').trim(),
          color:sanitizeHexColor(rule.color||'')
        }));
        const sanitizedRules=preparedRules.filter(rule=>rule.field);
        state.config.titleRules=sanitizedRules;
        if(optionsOpen){
          tempTitleRules=preparedRules.map(rule=>({...rule,draftField:rule.field}));
        }
        const activeLabelSource=optionsOpen
          ? tempActiveColumnLabel
          : state.config.activeColumn?.label;
        const activeLabel=String(activeLabelSource||'').trim();
        const activeEnabledSource=optionsOpen?tempActiveColumnEnabled:state.config.activeColumn?.enabled;
        state.config.activeColumn=sanitizeActiveColumn({label:activeLabel,enabled:activeEnabledSource});
        if(state.config.activeColumn.enabled===false){
          state.showActiveList=false;
        }
        if(optionsOpen){
          tempActiveColumnLabel=state.config.activeColumn.label;
          tempActiveColumnEnabled=state.config.activeColumn.enabled;
        }
        const previousFilterIds=new Set(Array.isArray(state.config.searchFilters)?state.config.searchFilters.map(filter=>filter.id):[]);
        const extraSource=optionsOpen && Array.isArray(tempExtraColumns)
          ? tempExtraColumns
          : Array.isArray(state.config.extraColumns)?state.config.extraColumns:[];
        const sanitizedExtras=sanitizeExtraColumns(extraSource).map(col=>({
          ...col,
          rules:Array.isArray(col.rules)?col.rules.map(rule=>({...rule})):[]
        }));
        state.config.extraColumns=sanitizedExtras.map(col=>({
          ...col,
          rules:Array.isArray(col.rules)?col.rules.map(rule=>({...rule})):[]
        }));
        if(optionsOpen){
          tempExtraColumns=sanitizedExtras.map(col=>({
            ...col,
            rules:Array.isArray(col.rules)?col.rules.map(rule=>({...rule})):[]
          }));
        }
        const filterSource=optionsOpen && Array.isArray(tempSearchFilters)
          ? tempSearchFilters
          : Array.isArray(state.config.searchFilters)?state.config.searchFilters:[];
        const sanitizedFilters=sanitizeSearchFilters(filterSource);
        state.config.searchFilters=sanitizedFilters;
        if(optionsOpen){
          tempSearchFilters=sanitizedFilters.map(filter=>({...filter}));
        }
        const designSource=optionsOpen && tempDesignConfig?tempDesignConfig:state.config.design;
        const sanitizedDesign=sanitizeDesignConfig(designSource);
        state.config.design=sanitizedDesign;
        if(optionsOpen){
          tempDesignConfig={...sanitizedDesign};
        }
        applyCardFontScale(state.config.design.cardFontScale);
        if(!(state.activeSearchFilters instanceof Set)){
          state.activeSearchFilters=new Set(Array.isArray(state.activeSearchFilters)?state.activeSearchFilters:[]);
        }
        const availableFilterIds=new Set(sanitizedFilters.map(filter=>filter.id));
        state.activeSearchFilters=new Set(Array.from(state.activeSearchFilters).filter(id=>availableFilterIds.has(id)));
        sanitizedFilters.forEach(filter=>{
          if(filter.defaultActive && !previousFilterIds.has(filter.id) && !state.activeSearchFilters.has(filter.id)){
            state.activeSearchFilters.add(filter.id);
          }
        });
        ensureColumnAssignments(state);
        ensureHiddenExtraColumns(state);
        if(optionsOpen){
          renderExtraControls();
          renderSearchFilterControls();
        }
        refreshTitleBar();
        if(partChanged){
          state.items.forEach(item=>{
            const raw=String(item.data?.[newPart]||'').trim();
            const part=(raw.split(':')[0]||'').trim();
            item.part=part;
            item.data={...item.data,[newPart]:part};
          });
          state.excluded.clear();
        }
        persistState(state,instanceId,stateStorageKey);
        if(elements.root?.isConnected){
          render();
        }
      }finally{
        applyingOptionChanges=false;
      }
    }

    function applyCardFontScale(scale){
      const clamped=clampCardFontScale(scale);
      if(elements.root){
        elements.root.style.setProperty('--ab-card-font-scale',clamped);
      }
      if(elements.designPreview){
        elements.designPreview.style.setProperty('--ab-card-font-scale',clamped);
      }
    }

    function syncDesignInputs(designConfig){
      const sanitized=sanitizeDesignConfig(designConfig);
      const normalized=sanitized.cardFontScale;
      if(elements.designRange){
        elements.designRange.value=String(normalized);
      }
      if(elements.designInput){
        elements.designInput.value=normalized.toFixed(2);
      }
      if(elements.designChipInput){
        elements.designChipInput.value=String(sanitized.previewChipCount);
      }
    }

    function buildDesignPreviewItem(config){
      const subFields=Array.isArray(config?.subFields)?config.subFields:[];
      const data={[TITLE_FIELD]:'Testgerät · Vorschau'};
      if(subFields.length){
        subFields.forEach((sub,index)=>{
          const key=String(sub?.field||`Feld ${index+1}`).trim();
          if(!key) return;
          const prefix=String(sub?.nickname||'').trim();
          const value=`${prefix?`${prefix} `:''}Wert ${index+1}`;
          data[key]=value;
        });
      }else{
        data[DEFAULT_SUB_FIELD]='Vorschau-ID';
      }
      return {id:'design-preview',meldung:'Vorschau',part:'Vorschau',data};
    }

    function buildDesignPreviewTags(count){
      const total=clampPreviewChipCount(count);
      const accent=deriveAccentBaseColor();
      const tags=[];
      for(let i=0;i<total;i++){
        const label=`Chip ${i+1}`;
        tags.push({text:label,color:i===0?accent:''});
      }
      return tags;
    }

    function renderDesignPreview(designOverride){
      if(!elements.designPreview) return;
      const activeSubs=Array.isArray(tempSubFields)&&tempSubFields.length?tempSubFields:state.config.subFields;
      const previewConfig={...state.config,subFields:activeSubs};
      const designConfig=sanitizeDesignConfig(designOverride||tempDesignConfig||state.config.design||{});
      const previewItem=buildDesignPreviewItem(previewConfig);
      const previewTags=buildDesignPreviewTags(designConfig.previewChipCount);
      const appliedScale=designConfig.cardFontScale;
      elements.designPreview.innerHTML=buildCardMarkup(previewItem,previewConfig,previewTags,state);
      elements.designPreview.style.setProperty('--ab-card-font-scale',appliedScale);
    }

    function updateDesignDraft(partial){
      const base=sanitizeDesignConfig(tempDesignConfig||state.config.design||{});
      const next=sanitizeDesignConfig({...base,...partial});
      tempDesignConfig=next;
      state.config.design=next;
      return next;
    }

    function updateDesignScale(value,{immediate=false}={}){
      const next=updateDesignDraft({cardFontScale:clampCardFontScale(value)});
      applyCardFontScale(next.cardFontScale);
      syncDesignInputs(next);
      renderDesignPreview(next);
      scheduleOptionPersist(immediate);
    }

    function updatePreviewChipCount(value,{immediate=false}={}){
      const next=updateDesignDraft({previewChipCount:clampPreviewChipCount(value)});
      applyCardFontScale(next.cardFontScale);
      syncDesignInputs(next);
      renderDesignPreview(next);
      scheduleOptionPersist(immediate);
    }

    function scheduleOptionPersist(immediate=false){
      if(immediate){
        if(optionPersistTimer){
          clearTimeout(optionPersistTimer);
          optionPersistTimer=null;
        }
        applyOptionChanges();
        return;
      }
      if(applyingOptionChanges){
        return;
      }
      if(optionPersistTimer){
        clearTimeout(optionPersistTimer);
      }
      optionPersistTimer=setTimeout(()=>{
        optionPersistTimer=null;
        applyOptionChanges();
      },200);
    }

    function flushOptionPersist(){
      if(optionPersistTimer){
        clearTimeout(optionPersistTimer);
        optionPersistTimer=null;
        applyOptionChanges();
        return true;
      }
      return false;
    }

    const handleBeforeUnload=()=>{
      flushOptionPersist();
      persistState(state,instanceId,stateStorageKey);
    };
    window.addEventListener('beforeunload',handleBeforeUnload);

    function showAlert(message){
      if(typeof window!=='undefined' && typeof window.alert==='function'){
        window.alert(message);
      }else{
        console.info(message);
      }
    }

    function showPrompt(message,defaultValue=''){
      if(typeof window!=='undefined' && typeof window.prompt==='function'){
        return window.prompt(message,defaultValue);
      }
      return null;
    }

    async function tryCopyToClipboard(text){
      if(typeof navigator!=='undefined' && navigator.clipboard && typeof navigator.clipboard.writeText==='function'){
        try{
          await navigator.clipboard.writeText(text);
          return true;
        }catch(error){
          console.warn('[UnitBoard] Clipboard-Kopie fehlgeschlagen',error);
        }
      }
      return false;
    }

    async function exportJsonData(label,data){
      const payload=typeof data==='string'?data:JSON.stringify(data,null,2);
      if(typeof payload!=='string') return;
      const success=await tryCopyToClipboard(payload);
      if(success){
        showAlert(`${label} wurden in die Zwischenablage kopiert.`);
        return;
      }
      showPrompt(`${label} kopieren (Strg+C, Enter zum Bestätigen)`,payload);
    }

    function requestJsonInput(label){
      const raw=showPrompt(label,'');
      if(raw===null) return null;
      const trimmed=raw.trim();
      if(!trimmed){
        showAlert('Es wurden keine Daten eingegeben.');
        return undefined;
      }
      try{
        return JSON.parse(trimmed);
      }catch(error){
        console.warn('[UnitBoard] JSON-Import fehlgeschlagen',error);
        showAlert('Die Daten konnten nicht gelesen werden. Bitte gültiges JSON einfügen.');
        return undefined;
      }
    }

    const refreshTitleBar=(extraOptions={})=>{
      const hasFileAccess=hasReadPermission && !!fileHandle;
      updateTitleBar(elements.root,state.config.title,{
        filePath:state.filePath,
        canRefresh:hasFileAccess,
        lastModified:lastModifiedCheck,
        pollingActive:!!pollInterval && hasFileAccess,
        hasFile:hasFileAccess,
        ...extraOptions
      });
    };

    restoreState(state,instanceId,stateStorageKey);

    elements.titleInput.value=state.config.title||'';
    refreshTitleBar();
    applyCardFontScale(state.config.design?.cardFontScale);

    function stopPolling(){
      if(pollInterval){
        clearInterval(pollInterval);
        pollInterval=null;
      }
      pollInProgress=false;
      refreshTitleBar();
    }

    async function pollFileChangesOnce(){
      if(pollInProgress) return;
      if(!fileHandle || !hasReadPermission){
        stopPolling();
        return;
      }
      pollInProgress=true;
      try{
        const file=await fileHandle.getFile();
        const modified=typeof file?.lastModified==='number'?file.lastModified:null;
        if(modified===null){
          return;
        }
        if(lastModifiedCheck===null){
          lastModifiedCheck=modified;
          refreshTitleBar();
          return;
        }
        if(modified>lastModifiedCheck){
          const reloaded=await loadAspenFromHandle(fileHandle,{silent:true,skipPermissionCheck:true});
          if(reloaded){
            lastModifiedCheck=modified;
          }
        }
      }catch(err){
        if(err && (err.name==='SecurityError' || err.name==='NotAllowedError')){
          hasReadPermission=false;
          console.info('[AspenBoard] Kein Zugriff – Nutzer muss Datei neu auswählen');
          refreshTitleBar({hasFile:false,hintText:'Zugriff verloren – bitte Aspen-Datei neu auswählen.'});
        }else{
          console.warn('[UnitBoard] Polling fehlgeschlagen',err);
        }
        stopPolling();
      }finally{
        pollInProgress=false;
      }
    }

    function startPolling(){
      stopPolling();
      if(!fileHandle || !hasReadPermission) return;
      pollInterval=setInterval(()=>{void pollFileChangesOnce();},POLL_INTERVAL_MS);
      refreshTitleBar();
    }

    if(elements.refreshBtn){
      elements.refreshBtn.addEventListener('click',async()=>{
        if(elements.refreshBtn.disabled) return;
        elements.refreshBtn.disabled=true;
        try{
          if(fileHandle && hasReadPermission){
            await loadAspenFromHandle(fileHandle,{silent:false});
          }else{
            await pickFromExcel();
          }
        }finally{
          elements.refreshBtn.disabled=false;
        }
      });
    }

    if(elements.search){
      elements.search.value=state.searchQuery||'';
      const handleSearchChange=()=>{
        state.searchQuery=elements.search.value;
        render();
      };
      elements.search.addEventListener('input',handleSearchChange);
      elements.search.addEventListener('search',handleSearchChange);
    }


    function syncPartSelectInputValue(){
      if(elements.partSelectInput){
        elements.partSelectInput.value=elements.selPart?.value||'';
      }
    }

    function updatePartSelectHighlight(){
      if(!elements.partSelectOptions) return;
      const nodes=Array.from(elements.partSelectOptions.querySelectorAll('.db-part-option'));
      nodes.forEach((node,index)=>{
        const isActive=index===highlightedPartIndex;
        node.classList.toggle('is-active',isActive);
        if(isActive){
          node.scrollIntoView({block:'nearest'});
        }
      });
    }

    function renderPartSelectOptions(query){
      if(!elements.partSelectOptions) return;
      const normalized=(query||'').trim().toLowerCase();
      filteredPartOptions=normalized?partOptions.filter(option=>option.toLowerCase().includes(normalized)):partOptions.slice();
      if(!filteredPartOptions.length){
        elements.partSelectOptions.innerHTML='<div class="db-empty">Keine Treffer</div>';
        highlightedPartIndex=-1;
        return;
      }
      elements.partSelectOptions.innerHTML=filteredPartOptions.map((option,index)=>`<button type="button" class="db-part-option" data-index="${index}" data-value="${option}">${option}</button>`).join('');
      elements.partSelectOptions.querySelectorAll('.db-part-option').forEach(btn=>{
        btn.addEventListener('mousedown',event=>event.preventDefault());
        btn.addEventListener('click',()=>{
          choosePartOption(btn.dataset.value);
        });
      });
      const currentValue=elements.selPart?.value||'';
      const matchIndex=filteredPartOptions.findIndex(option=>option===currentValue);
      highlightedPartIndex=matchIndex>=0?matchIndex:0;
      updatePartSelectHighlight();
    }

    function setHighlightedPartIndex(next){
      if(!filteredPartOptions.length){
        highlightedPartIndex=-1;
        updatePartSelectHighlight();
        return;
      }
      const clampedIndex=Math.max(0,Math.min(filteredPartOptions.length-1,next));
      highlightedPartIndex=clampedIndex;
      updatePartSelectHighlight();
    }

    function closePartSelectDropdown(){
      if(!partSelectOpen) return;
      partSelectOpen=false;
      highlightedPartIndex=-1;
      if(elements.partSelectOptions){
        elements.partSelectOptions.classList.remove('open');
      }
      if(partSelectOutsideHandler){
        document.removeEventListener('mousedown',partSelectOutsideHandler);
        partSelectOutsideHandler=null;
      }
    }

    function openPartSelectDropdown(){
      if(!elements.partSelectOptions) return;
      if(!partSelectOpen){
        partSelectOpen=true;
        elements.partSelectOptions.classList.add('open');
        partSelectOutsideHandler=event=>{
          if(!elements.partSelectWrap?.contains(event.target)){
            closePartSelectDropdown();
          }
        };
        document.addEventListener('mousedown',partSelectOutsideHandler);
      }
      renderPartSelectOptions(elements.partSelectInput?.value||'');
    }

    function choosePartOption(value){
      if(!value) return;
      if(elements.partSelectInput){
        elements.partSelectInput.value=value;
      }
      if(elements.selPart && elements.selPart.value!==value){
        elements.selPart.value=value;
        elements.selPart.dispatchEvent(new Event('change',{bubbles:true}));
      }
      closePartSelectDropdown();
    }

    function handlePartSelectKeydown(event){
      if(event.key==='ArrowDown'){
        event.preventDefault();
        openPartSelectDropdown();
        if(filteredPartOptions.length){
          const nextIndex=highlightedPartIndex<0?0:Math.min(filteredPartOptions.length-1,highlightedPartIndex+1);
          setHighlightedPartIndex(nextIndex);
        }
        return;
      }
      if(event.key==='ArrowUp'){
        event.preventDefault();
        openPartSelectDropdown();
        if(filteredPartOptions.length){
          const nextIndex=highlightedPartIndex<=0?0:highlightedPartIndex-1;
          setHighlightedPartIndex(nextIndex);
        }
        return;
      }
      if(event.key==='Enter'){
        if(partSelectOpen){
          event.preventDefault();
          const option=highlightedPartIndex>=0?filteredPartOptions[highlightedPartIndex]:filteredPartOptions[0];
          if(option){
            choosePartOption(option);
          }
        }
        return;
      }
      if(event.key==='Escape' && partSelectOpen){
        event.preventDefault();
        closePartSelectDropdown();
      }
    }


    if(elements.partSelectInput){
      syncPartSelectInputValue();
      elements.partSelectInput.addEventListener('focus',()=>{
        openPartSelectDropdown();
        requestAnimationFrame(()=>{
          try{elements.partSelectInput.select();}catch(e){/* ignore */}
        });
      });
      elements.partSelectInput.addEventListener('input',()=>{
        openPartSelectDropdown();
        renderPartSelectOptions(elements.partSelectInput.value);
      });
      elements.partSelectInput.addEventListener('keydown',handlePartSelectKeydown);
      elements.partSelectInput.addEventListener('blur',()=>{
        setTimeout(()=>{
          if(!partSelectOpen) return;
          const active=document.activeElement;
          if(!elements.partSelectWrap || !elements.partSelectWrap.contains(active)){
            closePartSelectDropdown();
          }
        },100);
      });
    }

    if(elements.partSelectWrap){
      elements.partSelectWrap.addEventListener('mousedown',event=>{
        if(event.target===elements.partSelectInput) return;
        if(event.target.closest('.db-part-options')) return;
        event.preventDefault();
        elements.partSelectInput?.focus();
      });
    }

    if(elements.partFilter){
      elements.partFilter.value=state.partFilter||'';
      elements.partFilter.addEventListener('input',()=>{
        state.partFilter=elements.partFilter.value;
        refreshPartControls(elements,state,render);
      });
    }

    function populateFieldSelects(){
      ensureSubFields(state.config);
      const options=getAvailableFieldList(state,[state.config.partField]);
      elements.selPart.innerHTML=options.map(field=>`<option value="${field}" ${field===state.config.partField?'selected':''}>${field}</option>`).join('');
      if(!options.includes(state.config.partField)){
        state.config.partField=options[0]||DEFAULT_SUB_FIELD;
        elements.selPart.value=state.config.partField;
      }
      partOptions=options.slice();
      syncPartSelectInputValue();
      if(partSelectOpen){
        renderPartSelectOptions(elements.partSelectInput?.value||'');
      }
      if(elements.modal?.classList.contains('open')){
        renderRuleControls();
      }
    }

    function setupExtraSortables(){
      if(!baseSortableConfig || typeof Sortable==='undefined'){
        return;
      }
      const wraps=Array.isArray(elements.extraWraps)?elements.extraWraps:[];
      if(!wraps.length){
        extraSortableInstances.forEach(instance=>instance.destroy());
        extraSortableInstances.clear();
        return;
      }
      const desired=new Map(wraps.map(wrap=>[wrap.id,wrap]));
      extraSortableInstances.forEach((instance,id)=>{
        if(!desired.has(id)){
          instance.destroy();
          extraSortableInstances.delete(id);
        }
      });
      desired.forEach((wrap,id)=>{
        if(extraSortableInstances.has(id)) return;
        const sortable=new Sortable(wrap.list,{
          ...baseSortableConfig,
          onSort:syncRenderPersist,
          onAdd:syncRenderPersist,
          onRemove:syncRenderPersist
        });
        extraSortableInstances.set(id,sortable);
      });
    }

    function ensureExtraListElements(){
      ensureExtraColumns(state.config);
      const columns=Array.isArray(state.config.extraColumns)?state.config.extraColumns:[];
      const signature=columns.map(col=>`${col.id}:${col.label}`).join('|');
      if(signature===lastExtraSignature && Array.isArray(elements.extraWraps)){
        columns.forEach((column,index)=>{
          const wrap=elements.extraWraps[index];
          if(!wrap) return;
          wrap.title.textContent=column.label||`Extraspalte ${index+1}`;
          wrap.title.classList.add('db-inline-title');
          wrap.title.dataset.columnId=column.id;
          wrap.title.tabIndex=0;
          wrap.title.addEventListener('click',()=>beginInlineColumnEdit(column.id,wrap.title));
          wrap.title.addEventListener('keydown',event=>{
            if(event.key==='Enter' || event.key===' '){
              event.preventDefault();
              beginInlineColumnEdit(column.id,wrap.title);
            }
          });
          wrap.list.dataset.columnId=column.id;
          wrap.wrap.dataset.columnId=column.id;
        });
        if(!columns.length){
          if(elements.extraContainer){
            elements.extraContainer.innerHTML='';
          }
          elements.extraWraps=[];
          extraSortableInstances.forEach(instance=>instance.destroy());
          extraSortableInstances.clear();
        }
        return;
      }
      lastExtraSignature=signature;
      extraSortableInstances.forEach(instance=>instance.destroy());
      extraSortableInstances.clear();
      if(elements.extraContainer){
        elements.extraContainer.innerHTML='';
      }
      const wraps=[];
      columns.forEach((column,index)=>{
        const wrap=document.createElement('div');
        wrap.className='db-list-wrap db-extra-wrap';
        wrap.dataset.columnId=column.id;
        const title=document.createElement('div');
        title.className='db-list-title db-inline-title';
        title.tabIndex=0;
        title.dataset.columnId=column.id;
        title.textContent=column.label||`Extraspalte ${index+1}`;
        title.addEventListener('click',()=>beginInlineColumnEdit(column.id,title));
        title.addEventListener('keydown',event=>{
          if(event.key==='Enter' || event.key===' '){
            event.preventDefault();
            beginInlineColumnEdit(column.id,title);
          }
        });
        const list=document.createElement('div');
        list.className='db-list db-extra-list';
        list.dataset.boardType='aspen-extra';
        list.dataset.columnId=column.id;
        wrap.appendChild(title);
        wrap.appendChild(list);
        elements.extraContainer?.appendChild(wrap);
        wraps.push({id:column.id,wrap,list,title});
      });
      elements.extraWraps=wraps;
      if(baseSortableConfig){
        setupExtraSortables();
      }
    }

    function handleToggleButtonClick(event){
      event.preventDefault();
      const button=event.currentTarget;
      if(!button) return;
      const columnId=button.dataset?.columnId||'';
      const columnType=button.dataset?.columnType||'extra';
      if(!columnId) return;
      ensureHiddenExtraColumns(state);
      if(columnType==='active'){
        state.showActiveList=!state.showActiveList;
      }else{
        if(!(state.hiddenExtraColumns instanceof Set)){
          state.hiddenExtraColumns=new Set();
        }
        if(state.hiddenExtraColumns.has(columnId)){
          state.hiddenExtraColumns.delete(columnId);
        }else{
          state.hiddenExtraColumns.add(columnId);
        }
      }
      render();
    }

    function handleSearchFilterToggle(event){
      event.preventDefault();
      const button=event.currentTarget;
      const filterId=button?.dataset?.filterId||'';
      if(!filterId) return;
      if(!(state.activeSearchFilters instanceof Set)){
        state.activeSearchFilters=new Set(Array.isArray(state.activeSearchFilters)?state.activeSearchFilters:[]);
      }
      if(state.activeSearchFilters.has(filterId)){
        state.activeSearchFilters.delete(filterId);
      }else{
        state.activeSearchFilters.add(filterId);
      }
      render();
    }

    function ensureSearchFilterButtons(){
      if(!elements.searchFilterGroup) return;
      ensureSearchFilters(state.config);
      const filters=Array.isArray(state.config.searchFilters)?state.config.searchFilters:[];
      const activeSet=state.activeSearchFilters instanceof Set?state.activeSearchFilters:new Set();
      const existing=new Map(Array.from(elements.searchFilterGroup.querySelectorAll('.db-search-filter-btn')).map(btn=>[btn.dataset.filterId,btn]));
      const seen=new Set();
      filters.forEach(filter=>{
        if(!filter?.id) return;
        seen.add(filter.id);
        let button=existing.get(filter.id);
        if(!button){
          button=document.createElement('button');
          button.type='button';
          button.className='db-search-filter-btn';
          button.dataset.filterId=filter.id;
          button.addEventListener('click',handleSearchFilterToggle);
          elements.searchFilterGroup.appendChild(button);
          existing.set(filter.id,button);
        }
        const label=getFilterDisplayLabel(filter)||'Filter';
        button.textContent=label;
        button.title=filter.query?`Filter: ${filter.query}`:label;
        const isActive=activeSet.has(filter.id);
        button.classList.toggle('is-active',isActive);
        button.setAttribute('aria-pressed',isActive?'true':'false');
        elements.searchFilterGroup.appendChild(button);
      });
      existing.forEach((button,id)=>{
        if(!seen.has(id)){
          button.remove();
        }
      });
      elements.searchFilterGroup.hidden=filters.length===0;
    }

    function ensureExtraToggleButtons(){
      if(!elements.toggleGroup) return;
      ensureActiveColumn(state.config);
      const extras=Array.isArray(state.config.extraColumns)?state.config.extraColumns:[];
      const showActiveColumn=state.config.activeColumn?.enabled!==false;
      const definitions=[
        ...showActiveColumn?[{
          id:ACTIVE_COLUMN_ID,
          kind:'active',
          label:state.config.activeColumn?.label||DEFAULT_ACTIVE_COLUMN_LABEL
        }]:[],
        ...extras.map((column,index)=>({
          id:column.id,
          kind:'extra',
          label:column.label||`Extraspalte ${index+1}`
        }))
      ];
      const existing=new Map(Array.from(elements.toggleGroup.querySelectorAll('.db-toggle-btn')).map(btn=>[btn.dataset.columnId,btn]));
      const seen=new Set();
      const hiddenSet=state.hiddenExtraColumns instanceof Set?state.hiddenExtraColumns:new Set();
      definitions.forEach(def=>{
        seen.add(def.id);
        let button=existing.get(def.id);
        if(!button){
          button=document.createElement('button');
          button.type='button';
          button.className='db-toggle-btn';
          button.dataset.columnId=def.id;
          button.dataset.columnType=def.kind;
          button.addEventListener('click',handleToggleButtonClick);
          elements.toggleGroup.appendChild(button);
          existing.set(def.id,button);
        }
        button.dataset.columnType=def.kind;
        button.textContent=def.label;
        const isActive=def.kind==='active'?!!state.showActiveList:!hiddenSet.has(def.id);
        button.classList.toggle('is-active',isActive);
        button.setAttribute('aria-pressed',isActive?'true':'false');
        elements.toggleGroup.appendChild(button);
      });
      existing.forEach((button,id)=>{
        if(!seen.has(id)){
          button.remove();
        }
      });
      elements.toggleGroup.hidden=definitions.length===0;
    }

    function syncFromDOM(){
      const existing=new Map(state.items.map(item=>[item.id,item]));
      const orderedMain=[];
      const orderedActive=[];
      const orderedExtras=[];
      const seen=new Set();
      const previousAssignments=normalizeColumnAssignments(state.columnAssignments);
      const newAssignments=new Map();
      const removedAssignments=new Set();
      const activeMeldungen=new Set();
      const autoAssignments=state.autoAssignments instanceof Map?state.autoAssignments:new Map();
      const collect=(container,target,columnId)=>{
        if(!container) return;
        container.querySelectorAll('.db-card').forEach(node=>{
          const id=node.dataset.id||('it-'+Math.random().toString(36).slice(2));
          const partRaw=node.dataset.part||node.dataset.meldung||'';
          const part=(partRaw.split(':')[0]||'').trim();
          const meldung=((node.dataset.meldung||'').split(':')[0]||'').trim();
          let item=existing.get(id);
          if(item){
            item.part=part;
            item.meldung=meldung;
            item.data={...item.data,[state.config.partField]:part,[MELDUNG_FIELD]:meldung};
          }else{
            const data={};
            data[TITLE_FIELD]=node.querySelector('.db-title')?.textContent||'';
            node.querySelectorAll('.db-sub-line').forEach(sub=>{
              const field=sub.dataset.field;
              if(field) data[field]=sub.textContent||'';
            });
            data[state.config.partField]=part;
            data[MELDUNG_FIELD]=meldung;
            item={id,part,meldung,data};
          }
          target.push(item);
          if(meldung){
            const autoColumn=autoAssignments.get(meldung)||'';
            const hasAutoAssignment=!!autoColumn;
            if(columnId===ACTIVE_COLUMN_ID){
              activeMeldungen.add(meldung);
              removedAssignments.add(meldung);
            }else if(columnId){
              if(!hasAutoAssignment){
                newAssignments.set(meldung,columnId);
              }
            }else if(!hasAutoAssignment){
              removedAssignments.add(meldung);
            }
          }
          seen.add(id);
        });
      };
      collect(elements.list,orderedMain);
      if(Array.isArray(elements.extraWraps)){
        elements.extraWraps.forEach(wrap=>{
          if(!wrap?.list || !wrap?.id) return;
          collect(wrap.list,orderedExtras,wrap.id);
        });
      }
      collect(elements.activeList,orderedActive,ACTIVE_COLUMN_ID);
      const remaining=state.items.filter(item=>!seen.has(item.id));
      state.items=dedupeByMeldung([...orderedMain,...orderedExtras,...orderedActive,...remaining]);
      state.activeMeldungen=activeMeldungen;
      const mergedAssignments=new Map(previousAssignments);
      const validMeldungen=new Set(state.items.map(item=>item.meldung).filter(Boolean));
      removedAssignments.forEach(meldung=>{mergedAssignments.delete(meldung);});
      newAssignments.forEach((column,meldung)=>{mergedAssignments.set(meldung,column);});
      mergedAssignments.forEach((_,meldung)=>{if(!validMeldungen.has(meldung)) mergedAssignments.delete(meldung);});
      state.columnAssignments=mergedAssignments;
      ensureColumnAssignments(state);
    }

    function syncRenderPersist(){
      syncFromDOM();
      render();
      persistState(state,instanceId,stateStorageKey);
    }

    function render(){
      state.items=dedupeByMeldung(state.items);
      if(!(state.activeMeldungen instanceof Set)){
        state.activeMeldungen=new Set(Array.isArray(state.activeMeldungen)?state.activeMeldungen:[]);
      }
      ensureExtraColumns(state.config);
      ensureActiveColumn(state.config);
      ensureSearchFilters(state.config);
      ensureColumnAssignments(state);
      ensureHiddenExtraColumns(state);
      if(!(state.activeSearchFilters instanceof Set)){
        state.activeSearchFilters=new Set(Array.isArray(state.activeSearchFilters)?state.activeSearchFilters:[]);
      }
      const availableFilterIds=new Set((state.config.searchFilters||[]).map(filter=>filter.id));
      state.activeSearchFilters=new Set(Array.from(state.activeSearchFilters).filter(id=>availableFilterIds.has(id)));
      const activeColumnEnabled=state.config.activeColumn?.enabled!==false;
      if(!activeColumnEnabled){
        state.showActiveList=false;
      }
      ensureExtraListElements();
      ensureExtraToggleButtons();
      ensureSearchFilterButtons();
      refreshTitleBar();
      if(elements.search){
        elements.search.value=state.searchQuery||'';
      }
      const searchContext=getSearchContext(state);
      const activeSet=state.activeMeldungen;
      const assignments=state.columnAssignments instanceof Map?state.columnAssignments:new Map();
      const extraColumns=Array.isArray(state.config.extraColumns)?state.config.extraColumns:[];
      const hiddenExtras=state.hiddenExtraColumns instanceof Set?state.hiddenExtraColumns:new Set();
      const extraBuckets=new Map(extraColumns.map(col=>[col.id,[]]));
      const autoAssignments=new Map();
      const activeItems=[];
      const mainItems=[];
      state.items.forEach(item=>{
        const meldung=item.meldung;
        let autoColumnId='';
        const ruleTarget=findRuleTarget(extraColumns,item);
        if(ruleTarget){
          autoColumnId=ruleTarget;
          if(meldung){
            autoAssignments.set(meldung,ruleTarget);
          }
        }
        if(autoColumnId && extraBuckets.has(autoColumnId)){
          extraBuckets.get(autoColumnId).push(item);
          return;
        }
        const assigned=meldung?assignments.get(meldung):undefined;
        if(assigned && extraBuckets.has(assigned)){
          extraBuckets.get(assigned).push(item);
          return;
        }
        if(activeSet.has(meldung)){
          activeItems.push(item);
          if(state.showActiveList){
            return;
          }
        }
        mainItems.push(item);
      });
      state.autoAssignments=autoAssignments;
      renderListSection(elements.list,state,mainItems,{emptyMessage:'Keine Geräte',searchContext});
      if(Array.isArray(elements.extraWraps)){
        elements.extraWraps.forEach((wrap,index)=>{
          const column=extraColumns[index];
          if(!wrap || !column) return;
          wrap.title.textContent=column.label||`Extraspalte ${index+1}`;
          wrap.list.dataset.columnId=column.id;
          if(wrap.wrap){
            const isHidden=hiddenExtras.has(column.id);
            wrap.wrap.hidden=isHidden;
            wrap.wrap.classList.toggle('is-hidden',isHidden);
          }
          renderListSection(wrap.list,state,extraBuckets.get(column.id)||[],{emptyMessage:'Keine Geräte',searchContext});
        });
      }
      if(elements.extraContainer){
        const visibleExtraCount=Array.isArray(elements.extraWraps)
          ? elements.extraWraps.reduce((count,wrap)=>count+(wrap?.wrap && !wrap.wrap.hidden?1:0),0)
          : 0;
        const hasVisibleExtra=visibleExtraCount>0;
        elements.extraContainer.hidden=!hasVisibleExtra;
        elements.extraContainer.style.flex=hasVisibleExtra
          ? `${visibleExtraCount} ${visibleExtraCount} 0%`
          : '0 0 0%';
      }
      if(elements.activeWrap && elements.activeList){
        if(elements.activeTitle){
          elements.activeTitle.textContent=state.config.activeColumn?.label||DEFAULT_ACTIVE_COLUMN_LABEL;
        }
        const shouldShowActive=activeColumnEnabled && state.showActiveList;
        elements.activeWrap.hidden=!shouldShowActive;
        if(shouldShowActive){
          renderListSection(elements.activeList,state,activeItems,{
            emptyMessage:'Keine aktiven Geräte',
            respectExcluded:false,
            ignoreSearch:true,
            searchContext
          });
        }else{
          elements.activeList.innerHTML='';
        }
      }
      elements.root.classList.toggle('db-has-active',activeColumnEnabled&&!!state.showActiveList);
      persistState(state,instanceId,stateStorageKey);
      SHARED.publishAspenItems(instanceId,state.items);
      refreshPartControls(elements,state,render);
    }

    populateFieldSelects();
    render();

    if(elements.pickBtn){
      elements.pickBtn.addEventListener('click',()=>{
        closeOptions();
        pickFromExcel();
      });
    }
    if(elements.enableAllBtn){
      elements.enableAllBtn.addEventListener('click',()=>{
        state.items=dedupeByMeldung(state.items);
        state.excluded.clear();
        render();
      });
    }
    if(elements.disableAllBtn){
      elements.disableAllBtn.addEventListener('click',()=>{
        state.items=dedupeByMeldung(state.items);
        state.excluded=new Set(state.items.map(item=>item.part));
        render();
      });
    }

    if(Array.isArray(elements.configTabs)){
      elements.configTabs.forEach(btn=>{
        const switchTab=()=>activateConfigTab(btn.dataset?.tab||'general');
        btn.addEventListener('click',switchTab);
        btn.addEventListener('keydown',event=>{
          if(event.key==='Enter' || event.key===' '){
            event.preventDefault();
            switchTab();
          }
        });
      });
    }
    activateConfigTab(activeConfigTab);

    function renderSubFieldControls(){
      const existing=Array.isArray(tempSubFields)?tempSubFields:[];
      tempSubFields=existing.map(entry=>normalizeSubField(entry,{allowEmptyField:true})||createSubFieldConfig(''));
      const pool=getAvailableFieldList(state,tempSubFields.map(entry=>entry?.field||''),{includeCustom:true});
      if(!tempSubFields.length){
        tempSubFields=[createSubFieldConfig(pool[0]||DEFAULT_SUB_FIELD)];
      }
      elements.subList.innerHTML='';
      tempSubFields.forEach((entry,index)=>{
        const sub=entry&&typeof entry==='object'?entry:createSubFieldConfig('');
        tempSubFields[index]=sub;
        const row=document.createElement('div');
        row.className='db-sub-row';
        const usedFields=tempSubFields.map(item=>item?.field||'');
        const choices=getAvailableFieldList(state,usedFields,{includeCustom:true});
        if(sub.field && !choices.includes(sub.field)) choices.push(sub.field);

        const picker=document.createElement('div');
        picker.className='db-sub-picker';
        const input=document.createElement('input');
        input.type='text';
        input.className='db-sub-input';
        input.placeholder='Spalte wählen';
        input.autocomplete='off';
        input.value=sub.field||'';
        if(!sub.field && choices.length){
          sub.field=choices[0];
          input.value=sub.field;
        }
        const dataList=document.createElement('datalist');
        const listId=`db-sub-options-${Date.now()}-${index}-${Math.floor(Math.random()*1000)}`;
        dataList.id=listId;
        input.setAttribute('list',listId);
        const renderOptions=(filter='')=>{
          const normalized=(filter||'').trim().toLowerCase();
          const filtered=normalized?choices.filter(opt=>opt.toLowerCase().includes(normalized)):choices;
          dataList.innerHTML=filtered.map(opt=>`<option value="${opt}"></option>`).join('');
        };
        renderOptions();
        const commitInput=()=>{
          const target=tempSubFields[index]||createSubFieldConfig('');
          tempSubFields[index]=target;
          const raw=(input.value||'').trim();
          if(!raw){
            target.field='';
            input.value='';
            renderOptions();
            scheduleOptionPersist();
            return;
          }
          const exact=choices.find(opt=>opt.toLowerCase()===raw.toLowerCase());
          if(exact){
            target.field=exact;
            input.value=exact;
            renderOptions();
            scheduleOptionPersist();
            return;
          }
          const partial=choices.find(opt=>opt.toLowerCase().includes(raw.toLowerCase()));
          if(partial){
            target.field=partial;
            input.value=partial;
            renderOptions();
            scheduleOptionPersist();
            return;
          }
          input.value=target.field||'';
          renderOptions();
          scheduleOptionPersist();
        };
        input.addEventListener('input',()=>{renderOptions(input.value);});
        input.addEventListener('focus',()=>{renderOptions();});
        input.addEventListener('change',commitInput);
        input.addEventListener('keydown',event=>{
          if(event.key==='Enter'){
            event.preventDefault();
            commitInput();
            input.blur();
          }
        });
        input.addEventListener('blur',()=>{setTimeout(commitInput,0);});
        picker.appendChild(input);
        row.appendChild(picker);
        row.appendChild(dataList);

        const meta=document.createElement('div');
        meta.className='db-sub-meta';
        const nicknameInput=document.createElement('input');
        nicknameInput.type='text';
        nicknameInput.className='db-sub-extra db-sub-nickname';
        nicknameInput.placeholder='Nickname';
        nicknameInput.value=sub.nickname||'';
        const commitNickname=()=>{
          const target=tempSubFields[index]||createSubFieldConfig('');
          tempSubFields[index]=target;
          target.nickname=nicknameInput.value||'';
        };
        nicknameInput.addEventListener('input',()=>{commitNickname();scheduleOptionPersist();});
        nicknameInput.addEventListener('change',()=>{commitNickname();scheduleOptionPersist();});
        meta.appendChild(nicknameInput);

        const filterInput=document.createElement('input');
        filterInput.type='text';
        filterInput.className='db-sub-extra db-sub-filter';
        filterInput.placeholder='Datenfilter';
        filterInput.value=sub.filter||'';
        const commitFilter=()=>{
          const target=tempSubFields[index]||createSubFieldConfig('');
          tempSubFields[index]=target;
          target.filter=filterInput.value||'';
        };
        filterInput.addEventListener('input',()=>{commitFilter();scheduleOptionPersist();});
        filterInput.addEventListener('change',()=>{commitFilter();scheduleOptionPersist();});
        meta.appendChild(filterInput);

        row.appendChild(meta);

        const sortBtn=document.createElement('button');
        sortBtn.type='button';
        sortBtn.className='db-sort';
        sortBtn.textContent='Sortieren';
        sortBtn.addEventListener('click',()=>{
          commitInput();
          const fieldName=(tempSubFields[index]?.field||'').trim()||input.value.trim();
          if(!fieldName) return;
          syncFromDOM();
          state.items.sort((a,b)=>String(a?.data?.[fieldName]||'').localeCompare(String(b?.data?.[fieldName]||'')));
          render();
        });
        row.appendChild(sortBtn);

        const removeBtn=document.createElement('button');
        removeBtn.type='button';
        removeBtn.className='db-sub-remove';
        removeBtn.title='Feld entfernen';
        removeBtn.setAttribute('aria-label','Feld entfernen');
        removeBtn.textContent='✕';
        removeBtn.addEventListener('click',()=>{
          if(tempSubFields.length>1){
            tempSubFields.splice(index,1);
          }else{
            tempSubFields[0]=createSubFieldConfig('');
          }
          renderSubFieldControls();
          scheduleOptionPersist();
        });
        row.appendChild(removeBtn);

        elements.subList.appendChild(row);
      });
      renderDesignPreview();
    }

    function renderSearchFilterControls(){
      if(!elements.filterList) return;
      if(!Array.isArray(tempSearchFilters)) tempSearchFilters=[];
      const active=document.activeElement;
      let restoreFocus=null;
      if(active && elements.filterList.contains(active)){
        const filterId=active.dataset?.filterId||'';
        if(filterId){
          restoreFocus={
            id:filterId,
            field:active.dataset?.field||'',
            selectionStart:typeof active.selectionStart==='number'?active.selectionStart:null,
            selectionEnd:typeof active.selectionEnd==='number'?active.selectionEnd:null
          };
        }
      }
      elements.filterList.innerHTML='';
      if(!tempSearchFilters.length){
        const empty=document.createElement('div');
        empty.className='db-rule-empty';
        empty.textContent='Keine Vorfilter definiert.';
        elements.filterList.appendChild(empty);
        return;
      }
      tempSearchFilters.forEach((filter,index)=>{
        const current=tempSearchFilters[index]||{};
        if(typeof current.id!=='string' || !current.id){
          current.id=generateSearchFilterId();
          tempSearchFilters[index]=current;
        }
        const row=document.createElement('div');
        row.className='db-filter-row';

        const nameField=document.createElement('div');
        nameField.className='db-filter-field';
        const nameLabel=document.createElement('label');
        nameLabel.textContent='Name';
        const nameInput=document.createElement('input');
        nameInput.type='text';
        nameInput.placeholder='Anzeige-Name';
        nameInput.value=current.label||'';
        nameInput.dataset.filterId=current.id;
        nameInput.dataset.field='label';
        nameInput.addEventListener('input',()=>{
          tempSearchFilters[index]={...tempSearchFilters[index],label:nameInput.value};
          scheduleOptionPersist();
        });
        nameField.appendChild(nameLabel);
        nameField.appendChild(nameInput);
        row.appendChild(nameField);

        const queryField=document.createElement('div');
        queryField.className='db-filter-field';
        const queryLabel=document.createElement('label');
        queryLabel.textContent='Filterausdruck';
        const queryInput=document.createElement('input');
        queryInput.type='text';
        queryInput.placeholder='Suchbegriff(e)';
        queryInput.value=current.query||'';
        queryInput.dataset.filterId=current.id;
        queryInput.dataset.field='query';
        queryInput.addEventListener('input',()=>{
          tempSearchFilters[index]={...tempSearchFilters[index],query:queryInput.value};
          scheduleOptionPersist();
        });
        queryField.appendChild(queryLabel);
        queryField.appendChild(queryInput);
        row.appendChild(queryField);

        const defaultLabel=document.createElement('label');
        defaultLabel.className='db-filter-default';
        const defaultInput=document.createElement('input');
        defaultInput.type='checkbox';
        defaultInput.checked=!!current.defaultActive;
        defaultInput.addEventListener('change',()=>{
          tempSearchFilters[index]={...tempSearchFilters[index],defaultActive:defaultInput.checked};
          scheduleOptionPersist();
        });
        defaultLabel.appendChild(defaultInput);
        defaultLabel.append(' Standard aktiv');
        row.appendChild(defaultLabel);

        const removeBtn=document.createElement('button');
        removeBtn.type='button';
        removeBtn.className='db-filter-remove';
        removeBtn.title='Filter entfernen';
        removeBtn.textContent='✕';
        removeBtn.addEventListener('click',()=>{
          tempSearchFilters.splice(index,1);
          renderSearchFilterControls();
          scheduleOptionPersist();
        });
        row.appendChild(removeBtn);

        elements.filterList.appendChild(row);
      });
      if(restoreFocus && restoreFocus.id){
        const target=Array.from(elements.filterList.querySelectorAll('input')).find(input=>{
          return input.dataset?.filterId===restoreFocus.id && (input.dataset?.field||'')===restoreFocus.field;
        });
        if(target){
          target.focus();
          if(typeof restoreFocus.selectionStart==='number' && typeof restoreFocus.selectionEnd==='number' && typeof target.setSelectionRange==='function'){
            try{
              target.setSelectionRange(restoreFocus.selectionStart,restoreFocus.selectionEnd);
            }catch{
              /* ignore selection errors */
            }
          }
        }
      }
    }

  function updateTempColumnLabel(columnId,value){
    if(!columnId) return;
    if(columnId===ACTIVE_COLUMN_ID){
      tempActiveColumnLabel=value;
      return;
    }
    const index=tempExtraColumns.findIndex(col=>col.id===columnId);
    if(index===-1) return;
    tempExtraColumns[index]={...tempExtraColumns[index],label:value};
  }

  function applyColumnLabel(columnId,value,{persist=true,refresh=true}={}){
    if(!columnId) return;
    const nextLabel=(value||'').trim();
    if(columnId===ACTIVE_COLUMN_ID){
      tempActiveColumnLabel=nextLabel;
      state.config.activeColumn={
        ...sanitizeActiveColumn(state.config.activeColumn),
        label:nextLabel||DEFAULT_ACTIVE_COLUMN_LABEL
      };
      if(refresh){
        updateTempColumnPreview(columnId);
      }
      if(persist){
        persistState(state,instanceId,stateStorageKey);
      }
      return;
    }
    const configIndex=Array.isArray(state.config.extraColumns)
      ? state.config.extraColumns.findIndex(col=>col.id===columnId)
      : -1;
    if(configIndex!==-1){
      state.config.extraColumns[configIndex]={
        ...state.config.extraColumns[configIndex],
        label:nextLabel
      };
    }
    const tempIndex=tempExtraColumns.findIndex(col=>col.id===columnId);
    if(tempIndex!==-1){
      tempExtraColumns[tempIndex]={...tempExtraColumns[tempIndex],label:nextLabel};
    }
    if(refresh){
      updateTempColumnPreview(columnId);
      if(elements.modal?.classList.contains('open')){
        renderExtraControls();
      }
      render();
    }
    if(persist){
      persistState(state,instanceId,stateStorageKey);
    }
  }

  function beginInlineColumnEdit(columnId,titleElement){
    if(!columnId || !titleElement || titleElement.dataset.editing==='true') return;
    titleElement.dataset.editing='true';
    const info=getTempColumnDisplayInfo(columnId) || {label:titleElement.textContent||''};
    const original=info.label||'';
    const input=document.createElement('input');
    input.type='text';
    input.className='db-inline-title-input';
    input.value=original;
    input.placeholder='Spaltenname';
    const finish=(commit)=>{
      titleElement.dataset.editing='false';
      const nextValue=commit?input.value:original;
      titleElement.textContent=nextValue||original||titleElement.textContent||'';
      titleElement.tabIndex=0;
      if(commit){
        applyColumnLabel(columnId,nextValue,{persist:true,refresh:true});
      }
    };
    input.addEventListener('keydown',event=>{
      if(event.key==='Enter'){
        finish(true);
      }else if(event.key==='Escape'){
        finish(false);
      }
    });
    input.addEventListener('blur',()=>finish(true));
    titleElement.innerHTML='';
    titleElement.appendChild(input);
    input.focus();
    input.select();
  }

  function getTempColumnDisplayInfo(columnId){
    if(!columnId){
      return null;
    }
    if(columnId===ACTIVE_COLUMN_ID){
      const raw=typeof tempActiveColumnLabel==='string'?tempActiveColumnLabel:'';
      const label=raw.trim()||DEFAULT_ACTIVE_COLUMN_LABEL;
      return {kind:'active',label,index:-1};
    }
    const sourceList=Array.isArray(tempExtraColumns)&&tempExtraColumns.length
      ? tempExtraColumns
      : Array.isArray(state.config.extraColumns)
        ? state.config.extraColumns
        : [];
    const index=sourceList.findIndex(col=>col.id===columnId);
    if(index===-1){
      return null;
    }
    const column=sourceList[index]||{};
    const rawLabel=typeof column.label==='string'?column.label:'';
    const label=rawLabel.trim()||`Extraspalte ${index+1}`;
    return {kind:'extra',label,index};
  }

    function updateTempColumnPreview(columnId){
      const info=getTempColumnDisplayInfo(columnId);
      if(!info){
        return;
      }
      if(info.kind==='active'){
        if(elements.activeTitle){
          elements.activeTitle.textContent=info.label;
        }
      }else if(Array.isArray(elements.extraWraps)){
        const wrap=elements.extraWraps[info.index];
        if(wrap?.title){
          wrap.title.textContent=info.label;
        }
      }
      if(elements.toggleGroup){
        elements.toggleGroup.querySelectorAll('.db-toggle-btn').forEach(btn=>{
          if(btn.dataset?.columnId===columnId){
            btn.textContent=info.label;
          }
        });
      }
    }

    function handleExtraNameInput(event){
      const input=event.target;
      if(!input || typeof input.value!=='string') return;
      const columnId=input.dataset?.columnId||'';
      if(!columnId) return;
      updateTempColumnLabel(columnId,input.value);
      updateTempColumnPreview(columnId);
    }

    function handleExtraNameCommit(event){
      const input=event.target;
      if(!input || typeof input.value!=='string') return;
      const columnId=input.dataset?.columnId||'';
      if(!columnId) return;
      updateTempColumnLabel(columnId,input.value);
      updateTempColumnPreview(columnId);
      scheduleOptionPersist(true);
    }

    function renderExtraControls(){
      const sanitized=sanitizeExtraColumns(tempExtraColumns).map(col=>({
        ...col,
        rules:Array.isArray(col.rules)?col.rules.map(rule=>({...rule})):[]
      }));
      tempExtraColumns=sanitized.map(col=>({
        ...col,
        rules:Array.isArray(col.rules)?col.rules.map(rule=>({...rule})):[]
      }));
      if(elements.extraCount){
        elements.extraCount.value=String(tempExtraColumns.length);
      }
      if(!elements.extraNameList || !elements.extraRuleBoard){
        return;
      }
      const ruleFields=(Array.isArray(tempExtraColumns)?tempExtraColumns:[])
        .flatMap(col=>Array.isArray(col.rules)
          ? col.rules.flatMap(rule=>{
            const normalized=sanitizeExtraRule(rule,{defaultTarget:col.id});
            return (Array.isArray(normalized.conditions)?normalized.conditions:[])
              .map(condition=>condition?.field||condition?.status||'');
          })
          : [])
        .filter(Boolean);
      const fieldOptions=getAvailableFieldList(state,ruleFields);
      if(!fieldOptions.includes('UC')) fieldOptions.push('UC');
      const keywordOptions=collectKnownKeywords(state.items||[]);
      const fallbackActiveLabel=state.config?.activeColumn?.label||DEFAULT_ACTIVE_COLUMN_LABEL;
      const fallbackActiveEnabled=state.config?.activeColumn?.enabled!==false;
      const normalizedActiveLabel=String(
        (typeof tempActiveColumnLabel==='string' && tempActiveColumnLabel.trim())
          ? tempActiveColumnLabel
          : fallbackActiveLabel
      ).trim()||DEFAULT_ACTIVE_COLUMN_LABEL;
      tempActiveColumnLabel=normalizedActiveLabel;
      if(typeof tempActiveColumnEnabled!=='boolean'){
        tempActiveColumnEnabled=fallbackActiveEnabled;
      }
      let restoreFocus=null;
      const activeElement=document.activeElement;
      if(activeElement && elements.extraNameList.contains(activeElement) && activeElement.tagName==='INPUT'){
        restoreFocus={
          columnId:activeElement.dataset?.columnId||'',
          selectionStart:activeElement.selectionStart,
          selectionEnd:activeElement.selectionEnd
        };
      }
      const nameFragment=document.createDocumentFragment();
      const ruleFragment=document.createDocumentFragment();
      tempExtraColumns.forEach((column,index)=>{
        const row=document.createElement('div');
        row.className='db-extra-name-row';
        row.dataset.columnId=column.id;
        const header=document.createElement('div');
        header.className='db-extra-name-header';
        const label=document.createElement('label');
        label.className='db-extra-name-inline db-extra-name-input';
        label.dataset.columnId=column.id;
        const title=document.createElement('span');
        title.className='db-extra-name-title';
        title.textContent=`Spalte ${index+1}`;
        label.appendChild(title);
        const input=document.createElement('input');
        input.type='text';
        input.placeholder='Name der Extraspalte';
        input.value=column.label||'';
        input.dataset.columnId=column.id;
        input.dataset.columnType='extra';
        input.className='db-extra-name-input-field';
        input.addEventListener('input',handleExtraNameInput);
        input.addEventListener('change',handleExtraNameCommit);
        label.appendChild(input);
        header.appendChild(label);
        if(index===0){
          const inlineHint=document.createElement('span');
          inlineHint.className='db-inline-hint';
          inlineHint.textContent='Tipp: Spaltenüberschrift im Board anklicken, um den Namen direkt zu ändern.';
          header.appendChild(inlineHint);
        }
        row.appendChild(header);
        nameFragment.appendChild(row);

        const card=document.createElement('div');
        card.className='db-extra-rule-card';
        card.dataset.columnId=column.id;
        const ruleHeader=document.createElement('div');
        ruleHeader.className='db-extra-rule-header';
        const ruleLabel=document.createElement('span');
        ruleLabel.className='db-rule-label';
        ruleLabel.textContent='Automatische Zuweisung (oberste Regel gewinnt)';
        const ruleHint=document.createElement('span');
        ruleHint.className='db-extra-rule-hint';
        ruleHint.textContent='Alle Bedingungen einer Regel müssen erfüllt sein; die erste passende Regel verschiebt das Gerät in die Zielspalte.';
        ruleHeader.appendChild(ruleLabel);
        ruleHeader.appendChild(ruleHint);
        card.appendChild(ruleHeader);
        const rulesList=document.createElement('div');
        rulesList.className='db-extra-rule-list';
        const ensureRuleSlot=(position)=>{
          if(!Array.isArray(tempExtraColumns[index].rules)){
            tempExtraColumns[index].rules=[];
          }
          if(position>=tempExtraColumns[index].rules.length){
            tempExtraColumns[index].rules.push(createEmptyExtraRule(column.id));
          }
        };
        const renderRules=()=>{
          rulesList.innerHTML='';
          const rules=Array.isArray(tempExtraColumns[index].rules)
            ? tempExtraColumns[index].rules
            : [];
          if(!rules.length){
            tempExtraColumns[index].rules=[];
          }
          const targets=tempExtraColumns.map((col,idx)=>({
            id:col.id,
            label:col.label?.trim()||`Extraspalte ${idx+1}`
          }));
          const keywordListId=`db-extra-keywords-${column.id}`;
          const keywordDataList=document.createElement('datalist');
          keywordDataList.id=keywordListId;
          keywordDataList.style.display='none';
          keywordDataList.innerHTML=keywordOptions.map(keyword=>`<option value="${keyword}"></option>`).join('');
          rulesList.appendChild(keywordDataList);
          tempExtraColumns[index].rules.forEach((rule,ruleIndex)=>{
            const normalized=sanitizeExtraRule(rule,{defaultTarget:column.id});
            tempExtraColumns[index].rules[ruleIndex]=normalized;
            const ruleRow=document.createElement('div');
            ruleRow.className='db-extra-rule-row';
            const conditionWrap=document.createElement('div');
            conditionWrap.className='db-extra-condition-wrap';
            const conditionList=document.createElement('div');
            conditionList.className='db-extra-condition-list';
            const ensureConditionSlot=(position)=>{
              if(!Array.isArray(tempExtraColumns[index].rules[ruleIndex].conditions)){
                tempExtraColumns[index].rules[ruleIndex].conditions=[createEmptyExtraCondition()];
              }
              if(position>=tempExtraColumns[index].rules[ruleIndex].conditions.length){
                tempExtraColumns[index].rules[ruleIndex].conditions.push(createEmptyExtraCondition());
              }
            };
            const renderConditions=()=>{
              conditionList.innerHTML='';
              const conditions=Array.isArray(tempExtraColumns[index].rules[ruleIndex].conditions)
                ? tempExtraColumns[index].rules[ruleIndex].conditions
                : [];
              if(!conditions.length){
                tempExtraColumns[index].rules[ruleIndex].conditions=[createEmptyExtraCondition()];
              }
              tempExtraColumns[index].rules[ruleIndex].conditions.forEach((condition,conditionIndex)=>{
                const normalizedCondition=sanitizeExtraCondition(condition);
                tempExtraColumns[index].rules[ruleIndex].conditions[conditionIndex]=normalizedCondition;
                const conditionRow=document.createElement('div');
                conditionRow.className='db-extra-condition-row';

                const fieldWrapper=document.createElement('div');
                fieldWrapper.className='db-extra-rule-field';
                const fieldLabel=document.createElement('label');
                fieldLabel.textContent='Feld';
                fieldLabel.title='Dieses Aspen-Feld wird auf Inhalt/Keyword geprüft (leer = ignorieren).';
                const fieldSelect=document.createElement('select');
                const emptyField=document.createElement('option');
                emptyField.value='';
                emptyField.textContent='(egal)';
                fieldSelect.appendChild(emptyField);
                fieldOptions.forEach(option=>{
                  const opt=document.createElement('option');
                  opt.value=option;
                  opt.textContent=option;
                  fieldSelect.appendChild(opt);
                });
                if(normalizedCondition.field && !fieldOptions.includes(normalizedCondition.field)){
                  const custom=document.createElement('option');
                  custom.value=normalizedCondition.field;
                  custom.textContent=normalizedCondition.field;
                  fieldSelect.appendChild(custom);
                }
                fieldSelect.value=normalizedCondition.field||'';
                fieldSelect.addEventListener('change',()=>{
                  ensureConditionSlot(conditionIndex);
                  tempExtraColumns[index].rules[ruleIndex].conditions[conditionIndex]={
                    ...tempExtraColumns[index].rules[ruleIndex].conditions[conditionIndex],
                    field:fieldSelect.value||''
                  };
                  scheduleOptionPersist(true);
                });
                fieldWrapper.appendChild(fieldLabel);
                fieldWrapper.appendChild(fieldSelect);
                conditionRow.appendChild(fieldWrapper);

                const keywordField=document.createElement('div');
                keywordField.className='db-extra-rule-field';
                const keywordLabel=document.createElement('label');
                keywordLabel.textContent='Keyword';
                keywordLabel.title='…und ein Aspen-Keyword gefunden wird (mit * / ? / | oder OR/AND für Muster oder Vergleiche wie >0 bzw. <=1,5; Enter prüft die Syntax)…';
                const keywordInput=document.createElement('input');
                keywordInput.type='text';
                keywordInput.setAttribute('list',keywordListId);
                keywordInput.value=normalizedCondition.keyword||'';
                keywordInput.placeholder='z.B. >0, UC98 OR UC99, UC9*|mUC99';
                const validateKeyword=()=>{
                  const result=buildKeywordMatcher(keywordInput.value);
                  if(!result.isValid){
                    const message=result.error?.message||result.error||'Ungültiges Muster';
                    keywordInput.setCustomValidity(`Syntax-Fehler: ${message}`);
                    keywordInput.reportValidity();
                    return false;
                  }
                  keywordInput.setCustomValidity('');
                  return true;
                };
                keywordInput.addEventListener('keydown',(event)=>{
                  if(event.key==='Enter'){
                    validateKeyword();
                  }
                });
                keywordInput.addEventListener('change',()=>{
                  ensureConditionSlot(conditionIndex);
                  tempExtraColumns[index].rules[ruleIndex].conditions[conditionIndex]={
                    ...tempExtraColumns[index].rules[ruleIndex].conditions[conditionIndex],
                    keyword:keywordInput.value.trim()
                  };
                  scheduleOptionPersist(true);
                });
                keywordInput.addEventListener('input',()=>{
                  ensureConditionSlot(conditionIndex);
                  tempExtraColumns[index].rules[ruleIndex].conditions[conditionIndex]={
                    ...tempExtraColumns[index].rules[ruleIndex].conditions[conditionIndex],
                    keyword:keywordInput.value.trim()
                  };
                  keywordInput.setCustomValidity('');
                });
                keywordInput.addEventListener('blur',validateKeyword);
                keywordField.appendChild(keywordLabel);
                keywordField.appendChild(keywordInput);
                conditionRow.appendChild(keywordField);

                const removeCondition=document.createElement('button');
                removeCondition.type='button';
                removeCondition.className='db-rule-remove';
                removeCondition.title='Bedingung entfernen';
                removeCondition.textContent='✕';
                removeCondition.disabled=tempExtraColumns[index].rules[ruleIndex].conditions.length<=1;
                removeCondition.addEventListener('click',()=>{
                  if(Array.isArray(tempExtraColumns[index].rules[ruleIndex].conditions)){
                    tempExtraColumns[index].rules[ruleIndex].conditions.splice(conditionIndex,1);
                    if(!tempExtraColumns[index].rules[ruleIndex].conditions.length){
                      tempExtraColumns[index].rules[ruleIndex].conditions=[createEmptyExtraCondition()];
                    }
                  }
                  renderRules();
                  scheduleOptionPersist(true);
                });
                conditionRow.appendChild(removeCondition);

                conditionList.appendChild(conditionRow);
              });
            };
            renderConditions();

            const addCondition=document.createElement('button');
            addCondition.type='button';
            addCondition.className='db-add-sub';
            addCondition.textContent='Bedingung hinzufügen';
            addCondition.addEventListener('click',()=>{
              if(!Array.isArray(tempExtraColumns[index].rules[ruleIndex].conditions)){
                tempExtraColumns[index].rules[ruleIndex].conditions=[createEmptyExtraCondition()];
              }
              tempExtraColumns[index].rules[ruleIndex].conditions.push(createEmptyExtraCondition());
              renderRules();
              scheduleOptionPersist(true);
            });

            conditionWrap.appendChild(conditionList);
            conditionWrap.appendChild(addCondition);
            ruleRow.appendChild(conditionWrap);

            const targetField=document.createElement('div');
            targetField.className='db-extra-rule-field';
            const targetLabel=document.createElement('label');
            targetLabel.textContent='…dann Spalte';
            targetLabel.title='Zielspalte für passende Geräte';
            const targetSelect=document.createElement('select');
            const placeholder=document.createElement('option');
            placeholder.value='';
            placeholder.textContent='Extraspalte wählen';
            targetSelect.appendChild(placeholder);
            targets.forEach(target=>{
              const opt=document.createElement('option');
              opt.value=target.id;
              opt.textContent=target.label;
              targetSelect.appendChild(opt);
            });
            targetSelect.value=normalized.toColumn||'';
            targetSelect.addEventListener('change',()=>{
              ensureRuleSlot(ruleIndex);
              tempExtraColumns[index].rules[ruleIndex]={
                ...tempExtraColumns[index].rules[ruleIndex],
                toColumn:targetSelect.value||''
              };
              scheduleOptionPersist(true);
              updateTempColumnPreview(targetSelect.value);
            });
            targetField.appendChild(targetLabel);
            targetField.appendChild(targetSelect);
            ruleRow.appendChild(targetField);

            const removeBtn=document.createElement('button');
            removeBtn.type='button';
            removeBtn.className='db-rule-remove';
            removeBtn.title='Regel entfernen';
            removeBtn.textContent='✕';
            removeBtn.addEventListener('click',()=>{
              if(Array.isArray(tempExtraColumns[index].rules)){
                tempExtraColumns[index].rules.splice(ruleIndex,1);
              }
              renderRules();
              scheduleOptionPersist(true);
            });
            ruleRow.appendChild(removeBtn);

            rulesList.appendChild(ruleRow);
          });
          const addRuleRow=document.createElement('div');
          addRuleRow.className='db-extra-rule-actions';
          const addRule=document.createElement('button');
          addRule.type='button';
          addRule.className='db-add-rule';
          addRule.textContent='Neue Regelgruppe hinzufügen';
          addRule.addEventListener('click',()=>{
            if(!Array.isArray(tempExtraColumns[index].rules)){
              tempExtraColumns[index].rules=[];
            }
            tempExtraColumns[index].rules.push(createEmptyExtraRule(column.id));
            renderRules();
            scheduleOptionPersist(true);
          });
          addRuleRow.appendChild(addRule);
          rulesList.appendChild(addRuleRow);
        };
        renderRules();
        card.appendChild(rulesList);
        ruleFragment.appendChild(card);
      });
      elements.extraNameList.innerHTML='';
      elements.extraRuleBoard.innerHTML='';
      elements.extraNameList.appendChild(nameFragment);
      elements.extraRuleBoard.appendChild(ruleFragment);
      if(restoreFocus && restoreFocus.columnId && restoreFocus.columnId!==ACTIVE_COLUMN_ID){
        const target=elements.extraNameList.querySelector(`input[data-column-id="${restoreFocus.columnId}"]`);
        if(target){
          target.focus();
          if(typeof restoreFocus.selectionStart==='number' && typeof restoreFocus.selectionEnd==='number' && typeof target.setSelectionRange==='function'){
            try{
              target.setSelectionRange(restoreFocus.selectionStart,restoreFocus.selectionEnd);
            }catch{
              /* ignore selection errors */
            }
          }
        }
      }
    }

    function setExtraColumnCount(nextCount,immediate=false){
      const desired=Number.isFinite(nextCount)?nextCount:tempExtraColumns.length;
      const clamped=clamp(Math.round(desired),0,MAX_EXTRA_COLUMNS);
      if(clamped===tempExtraColumns.length){
        if(elements.extraCount){
          elements.extraCount.value=String(clamped);
        }
        return;
      }
      if(clamped>tempExtraColumns.length){
        for(let i=tempExtraColumns.length;i<clamped;i+=1){
          const id=generateExtraColumnId();
          tempExtraColumns.push({id,label:'',rules:[]});
        }
      }else{
        tempExtraColumns=tempExtraColumns.slice(0,clamped);
      }
      renderExtraControls();
      scheduleOptionPersist(immediate);
    }

    function renderRuleControls(){
      if(!elements.ruleList) return;
      const rules=Array.isArray(tempTitleRules)?tempTitleRules:[];
      const available=getAvailableFieldList(state,rules.map(rule=>rule?.field).filter(Boolean));
      elements.ruleList.innerHTML='';
      if(!rules.length){
        const empty=document.createElement('div');
        empty.className='db-rule-empty';
        empty.textContent='Keine Regeln hinterlegt';
        elements.ruleList.appendChild(empty);
        return;
      }
      rules.forEach((rule,index)=>{
        const normalized=normalizeTitleRule(rule);
        const draftField=typeof rule?.draftField==='string'?rule.draftField:normalized.field;
        const workingRule={...normalized,draftField};
        tempTitleRules[index]=workingRule;
        const row=document.createElement('div');
        row.className='db-rule-row';

        const fieldChoices=available.slice();
        if(workingRule.field && !fieldChoices.includes(workingRule.field)) fieldChoices.push(workingRule.field);
        const fieldInput=document.createElement('input');
        fieldInput.type='text';
        fieldInput.className='db-rule-field';
        fieldInput.placeholder='Spalte wählen';
        fieldInput.autocomplete='off';
        fieldInput.value=workingRule.draftField||'';
        const dataList=document.createElement('datalist');
        const listId=`db-rule-options-${Date.now()}-${index}-${Math.floor(Math.random()*1000)}`;
        dataList.id=listId;
        dataList.style.display='none';
        fieldInput.setAttribute('list',listId);
        const renderFieldOptions=(filter='')=>{
          const normalizedFilter=(filter||'').trim().toLowerCase();
          const filtered=normalizedFilter?fieldChoices.filter(opt=>opt.toLowerCase().includes(normalizedFilter)):fieldChoices;
          dataList.innerHTML=filtered.map(opt=>`<option value="${opt}"></option>`).join('');
        };
        let shouldAutocompleteOnCommit=false;
        const commitField=(options={})=>{
          const {preferAutocomplete}=options;
          const useAutocomplete=typeof preferAutocomplete==='boolean'?preferAutocomplete:shouldAutocompleteOnCommit;
          shouldAutocompleteOnCommit=false;
          const raw=(fieldInput.value||'').trim();
          const target=tempTitleRules[index];
          if(!target){
            return;
          }
          if(!raw){
            target.field='';
            fieldInput.value='';
            renderFieldOptions();
            scheduleOptionPersist();
            return;
          }
          const lower=raw.toLowerCase();
          const exact=fieldChoices.find(opt=>opt.toLowerCase()===lower);
          if(exact){
            target.field=exact;
            target.draftField=exact;
            fieldInput.value=exact;
            renderFieldOptions();
            scheduleOptionPersist();
            return;
          }
          const partial=fieldChoices.find(opt=>opt.toLowerCase().includes(lower));
          if(partial && useAutocomplete){
            target.field=partial;
            target.draftField=partial;
            fieldInput.value=partial;
            renderFieldOptions();
            scheduleOptionPersist();
            return;
          }
          target.field=raw;
          target.draftField=raw;
          fieldInput.value=raw;
          if(!fieldChoices.includes(raw)){
            fieldChoices.push(raw);
          }
          renderFieldOptions(fieldInput.value);
          scheduleOptionPersist();
        };
        renderFieldOptions(fieldInput.value);
        fieldInput.addEventListener('input',()=>{
          const target=tempTitleRules[index];
          if(!target){
            return;
          }
          target.draftField=fieldInput.value;
          renderFieldOptions(fieldInput.value);
        });
        fieldInput.addEventListener('focus',()=>{renderFieldOptions();});
        fieldInput.addEventListener('change',()=>commitField());
        fieldInput.addEventListener('keydown',event=>{
          if(event.key==='Tab'){
            shouldAutocompleteOnCommit=true;
            return;
          }
          shouldAutocompleteOnCommit=false;
          if(event.key==='Enter'){
            event.preventDefault();
            commitField({preferAutocomplete:false});
            fieldInput.blur();
          }
        });
        fieldInput.addEventListener('blur',()=>{setTimeout(()=>commitField(),0);});
        row.appendChild(fieldInput);
        row.appendChild(dataList);

        const operatorSelect=document.createElement('select');
        const operators=[
          {value:'>',label:'>'},
          {value:'>=',label:'>='},
          {value:'=',label:'='},
          {value:'<',label:'<'},
          {value:'<=',label:'<='},
          {value:'!=',label:'≠'},
          {value:'contains',label:'enthält'}
        ];
        const currentOp=normalizeOperator(normalized.operator);
        operatorSelect.innerHTML=operators.map(op=>`<option value="${op.value}" ${op.value===currentOp?'selected':''}>${op.label}</option>`).join('');
        operatorSelect.value=currentOp;
        operatorSelect.addEventListener('change',()=>{
          const target=tempTitleRules[index];
          if(!target){
            return;
          }
          target.operator=operatorSelect.value;
          scheduleOptionPersist();
        });
        row.appendChild(operatorSelect);

        const valueInput=document.createElement('input');
        valueInput.type='text';
        valueInput.placeholder='Vergleichswert';
        valueInput.value=normalized.value||'';
        valueInput.addEventListener('input',()=>{
          const target=tempTitleRules[index];
          if(!target){
            return;
          }
          target.value=valueInput.value;
          scheduleOptionPersist();
        });
        row.appendChild(valueInput);

        const textInput=document.createElement('input');
        textInput.type='text';
        textInput.placeholder='Titelergänzung';
        textInput.value=normalized.text||'';
        textInput.addEventListener('input',()=>{
          const target=tempTitleRules[index];
          if(!target){
            return;
          }
          target.text=textInput.value;
          scheduleOptionPersist();
        });
        row.appendChild(textInput);

        const colorInput=document.createElement('input');
        colorInput.type='color';
        colorInput.className='db-rule-color';
        colorInput.title='Chip-Farbe auswählen (Rechtsklick setzt zurück)';
        colorInput.setAttribute('aria-label','Chip-Farbe auswählen');
        const defaultChipColor=deriveAccentBaseColor();
        colorInput.value=normalized.color||defaultChipColor;
        const commitColor=value=>{
          const target=tempTitleRules[index];
          if(!target){
            return;
          }
          const sanitized=sanitizeHexColor(value||'');
          target.color=sanitized||'';
          scheduleOptionPersist();
        };
        colorInput.addEventListener('input',()=>commitColor(colorInput.value));
        colorInput.addEventListener('change',()=>commitColor(colorInput.value));
        colorInput.addEventListener('contextmenu',event=>{
          event.preventDefault();
          colorInput.value=defaultChipColor;
          commitColor('');
        });
        row.appendChild(colorInput);

        const removeBtn=document.createElement('button');
        removeBtn.type='button';
        removeBtn.className='db-rule-remove';
        removeBtn.title='Regel entfernen';
        removeBtn.textContent='✕';
        removeBtn.addEventListener('click',()=>{
          tempTitleRules.splice(index,1);
          renderRuleControls();
          scheduleOptionPersist();
        });
        row.appendChild(removeBtn);

        elements.ruleList.appendChild(row);
      });
    }

    function openOptions(){
      closePartSelectDropdown();
      tempSubFields=Array.isArray(state.config.subFields)?state.config.subFields.map(sub=>({...sub})):[];
      tempTitleRules=Array.isArray(state.config.titleRules)?state.config.titleRules.map(rule=>{
        const normalized=normalizeTitleRule(rule);
        return {...normalized,draftField:normalized.field};
      }):[];
      tempExtraColumns=Array.isArray(state.config.extraColumns)
        ? state.config.extraColumns.map(col=>({
            ...col,
            rules:Array.isArray(col.rules)?col.rules.map(rule=>({...rule})):[]
          }))
        : [];
      tempActiveColumnLabel=state.config.activeColumn?.label||DEFAULT_ACTIVE_COLUMN_LABEL;
      tempActiveColumnEnabled=state.config.activeColumn?.enabled!==false;
      tempSearchFilters=Array.isArray(state.config.searchFilters)?state.config.searchFilters.map(filter=>({...filter})):[];
      tempDesignConfig=sanitizeDesignConfig(state.config.design||{});
      populateFieldSelects();
      renderSubFieldControls();
      renderSearchFilterControls();
      renderExtraControls();
      renderRuleControls();
      renderDesignPreview(tempDesignConfig);
      syncDesignInputs(tempDesignConfig);
      applyCardFontScale(tempDesignConfig.cardFontScale);
      refreshPartControls(elements,state,render);
      activateConfigTab(activeConfigTab);
      elements.titleInput.value=state.config.title||'';
      if(elements.customFormulaInput){
        elements.customFormulaInput.value=state.config.customCalcFormula||'';
      }
      if(elements.customCalcLabelInput){
        elements.customCalcLabelInput.value=state.config.customCalcLabel||'';
      }
      elements.modal.classList.add('open');
      syncPartSelectInputValue();
    }
    function closeOptions(){
      elements.modal.classList.remove('open');
      scheduleOptionPersist(true);
      tempSubFields=[];
      tempTitleRules=[];
      tempExtraColumns=[];
      tempActiveColumnLabel='';
      tempActiveColumnEnabled=true;
      tempSearchFilters=[];
      tempDesignConfig=null;
      closePartSelectDropdown();
      syncPartSelectInputValue();
    }

    if(elements.modal){
      elements.modal.addEventListener('mousedown',event=>{
        if(event.target===elements.modal){
          closeOptions();
        }
      });
    }

    const handleGlobalKeydown=event=>{
      if(event.key==='Escape'){
        if(event.defaultPrevented) return;
        if(elements.modal?.classList.contains('open')){
          if(partSelectOpen){
            return;
          }
          event.preventDefault();
          closeOptions();
        }
      }
    };
    document.addEventListener('keydown',handleGlobalKeydown);

    if(elements.addRuleBtn){
      elements.addRuleBtn.addEventListener('click',()=>{
        const defaults=getAvailableFieldList(state,tempTitleRules.map(rule=>rule?.field).filter(Boolean));
        const defaultField=defaults[0]||'';
        const normalized=normalizeTitleRule({field:defaultField,operator:'=',value:'',text:''});
        tempTitleRules.push({...normalized,draftField:normalized.field});
        renderRuleControls();
        scheduleOptionPersist();
      });
    }

    if(elements.ruleExportBtn){
      elements.ruleExportBtn.addEventListener('click',async ()=>{
        const prepared=Array.isArray(tempTitleRules)?tempTitleRules.map(rule=>normalizeTitleRule(rule)):[];
        await exportJsonData('Titel-Regeln',prepared);
      });
    }

    if(elements.ruleImportBtn){
      elements.ruleImportBtn.addEventListener('click',()=>{
        const imported=requestJsonInput('Titel-Regeln importieren (JSON)');
        if(imported===null || imported===undefined) return;
        if(!Array.isArray(imported)){
          showAlert('Regeln müssen als Array vorliegen.');
          return;
        }
        tempTitleRules=imported.map(rule=>normalizeTitleRule(rule));
        renderRuleControls();
        showAlert('Regeln importiert.');
        scheduleOptionPersist(true);
      });
    }

    if(elements.addFilterBtn){
      elements.addFilterBtn.addEventListener('click',()=>{
        const id=generateSearchFilterId();
        tempSearchFilters.push({id,label:'',query:'',defaultActive:false});
        renderSearchFilterControls();
        scheduleOptionPersist();
      });
    }

    elements.addSubBtn.addEventListener('click',()=>{
      if(!Array.isArray(tempSubFields) || !tempSubFields.length){
        const defaults=getAvailableFieldList(state,[],{includeCustom:true});
        tempSubFields=[createSubFieldConfig(defaults[0]||DEFAULT_SUB_FIELD)];
      }
      const candidates=getAvailableFieldList(state,tempSubFields.map(entry=>entry?.field||''),{includeCustom:true});
      const used=new Set(tempSubFields.map(entry=>entry?.field).filter(Boolean));
      const next=candidates.find(field=>!used.has(field))||candidates[0]||DEFAULT_SUB_FIELD;
      tempSubFields.push(createSubFieldConfig(next));
      renderSubFieldControls();
      scheduleOptionPersist();
    });

    if(elements.subExportBtn){
      elements.subExportBtn.addEventListener('click',async ()=>{
        const prepared=Array.isArray(tempSubFields)
          ? tempSubFields.map(entry=>normalizeSubField(entry)).filter(Boolean).map(sub=>({...sub}))
          : [];
        await exportJsonData('Untertitel-Felder',prepared);
      });
    }

    if(elements.subImportBtn){
      elements.subImportBtn.addEventListener('click',()=>{
        const imported=requestJsonInput('Untertitel-Felder importieren (JSON)');
        if(imported===null || imported===undefined) return;
        if(!Array.isArray(imported)){
          showAlert('Untertitel-Felder müssen als Array vorliegen.');
          return;
        }
        const normalized=imported.map(entry=>normalizeSubField(entry)).filter(Boolean);
        const firstNormalized=normalizeSubField(imported[0]);
        const fallbackField=firstNormalized?.field;
        const sanitized=fallbackField
          ? sanitizeSubFieldList(normalized,{fallbackField})
          : sanitizeSubFieldList(normalized);
        tempSubFields=sanitized.map(sub=>({...sub}));
        renderSubFieldControls();
        showAlert(normalized.length?'Untertitel importiert.':'Keine Untertitel-Felder importiert. Es wird der Standard verwendet.');
        scheduleOptionPersist(true);
      });
    }

    if(elements.extraCount){
      elements.extraCount.value=String(tempExtraColumns.length||0);
      elements.extraCount.addEventListener('input',()=>{
        const value=parseInt(elements.extraCount.value,10);
        if(Number.isNaN(value)) return;
        setExtraColumnCount(value,false);
      });
      elements.extraCount.addEventListener('change',()=>{
        const value=parseInt(elements.extraCount.value,10);
        if(Number.isNaN(value)){
          elements.extraCount.value=String(tempExtraColumns.length||0);
          return;
        }
        setExtraColumnCount(value,true);
      });
    }

    if(elements.designRange){
      elements.designRange.addEventListener('input',()=>updateDesignScale(elements.designRange.value));
      elements.designRange.addEventListener('change',()=>updateDesignScale(elements.designRange.value,{immediate:true}));
    }

    if(elements.designInput){
      elements.designInput.addEventListener('input',()=>updateDesignScale(elements.designInput.value));
      elements.designInput.addEventListener('change',()=>updateDesignScale(elements.designInput.value,{immediate:true}));
    }

    if(elements.designChipInput){
      elements.designChipInput.addEventListener('input',()=>updatePreviewChipCount(elements.designChipInput.value));
      elements.designChipInput.addEventListener('change',()=>updatePreviewChipCount(elements.designChipInput.value,{immediate:true}));
    }

    if(elements.titleInput){
      elements.titleInput.addEventListener('input',()=>{scheduleOptionPersist();});
      elements.titleInput.addEventListener('change',()=>{scheduleOptionPersist(true);});
    }
    if(elements.customFormulaInput){
      elements.customFormulaInput.addEventListener('input',()=>{scheduleOptionPersist();});
      elements.customFormulaInput.addEventListener('change',()=>{scheduleOptionPersist(true);});
    }
    if(elements.customCalcLabelInput){
      elements.customCalcLabelInput.addEventListener('input',()=>{scheduleOptionPersist();});
      elements.customCalcLabelInput.addEventListener('change',()=>{scheduleOptionPersist(true);});
    }

    elements.selPart.addEventListener('change',()=>{
      const newPart=elements.selPart.value;
      if(!newPart) return;
      if(state.config.partField===newPart) return;
      state.config.partField=newPart;
      state.items.forEach(item=>{
        const raw=String(item.data?.[newPart]||'').trim();
        const part=(raw.split(':')[0]||'').trim();
        item.part=part;
        item.data={...item.data,[newPart]:part};
      });
      state.excluded.clear();
      render();
      persistState(state,instanceId,stateStorageKey);
      syncPartSelectInputValue();
      if(partSelectOpen){
        renderPartSelectOptions(elements.partSelectInput?.value||'');
      }
    });

    const handleCardClick=event=>{
      if(event.target.closest('.db-handle')) return;
      const card=event.target.closest('.db-card');
      if(!card) return;
      const meldung=(card.dataset.meldung||'').trim();
      const doc=loadDoc();
      doc.general||={};
      if(doc.general.Meldung!==meldung){
        doc.general.Meldung=meldung;
        saveDoc(doc);
        updateHighlights(elements.list);
        if(elements.activeList) updateHighlights(elements.activeList);
        if(elements.extraContainer) updateHighlights(elements.extraContainer);
        window.dispatchEvent(new Event(CUSTOM_BROADCAST));
      }
    };

    const updateCustomEntry=(meldung,updates)=>{
      const key=String(meldung||'').trim();
      if(!key) return;
      const current=getCustomEntry(state,key);
      const resolvedLabel=resolveCustomLabel(state,current.label);
      const nextLabel=typeof updates?.label==='string'?updates.label.trim():resolvedLabel;
      const nextValue=typeof updates?.value==='string'?updates.value.trim():current.value;
      state.customEntries ||= {};
      if(!nextLabel && !nextValue){
        delete state.customEntries[key];
      }else{
        state.customEntries[key]={label:nextLabel,value:nextValue};
      }
      persistState(state,instanceId,stateStorageKey);
      render();
    };

    const updateCustomLabel=nextLabel=>{
      const normalized=normalizeCustomLabel(nextLabel);
      state.customLabel=normalized;
      Object.values(state.customEntries||{}).forEach(entry=>{
        if(!entry || typeof entry!=='object') return;
        if(!entry.label && !entry.value) return;
        entry.label=normalized;
      });
      persistState(state,instanceId,stateStorageKey);
      render();
    };

    const handleCustomDblClick=event=>{
      const labelEl=event.target.closest('.db-custom-label');
      const valueEl=event.target.closest('.db-custom-value');
      if(!labelEl && !valueEl) return;
      const card=event.target.closest('.db-card');
      if(!card) return;
      const meldung=(card.dataset.meldung||'').trim();
      if(!meldung) return;
      const entry=getCustomEntry(state,meldung);
      if(labelEl){
        const currentLabel=resolveCustomLabel(state,entry.label);
        const next=showPrompt('Custom-Feldname',currentLabel||'');
        if(next===null) return;
        updateCustomLabel(next);
      }else if(valueEl){
        const next=showPrompt('KV-Arbeitsstunden',entry.value||'');
        if(next===null) return;
        updateCustomEntry(meldung,{label:resolveCustomLabel(state,entry.label)||'KV-Arbeitsstunden',value:next});
      }
    };
    const handleCardDblClick=event=>{
      if(event.target.closest('.db-custom-label, .db-custom-value')) return;
      const card=event.target.closest('.db-card');
      if(!card) return;
      const meldung=(card.dataset.meldung||'').trim();
      if(!meldung) return;
      const entry=getCustomEntry(state,meldung);
      const next=showPrompt('KV-Arbeitsstunden',entry.value||'');
      if(next===null) return;
      updateCustomEntry(meldung,{label:resolveCustomLabel(state,entry.label)||'KV-Arbeitsstunden',value:next});
    };
    elements.list.addEventListener('click',handleCardClick);
    elements.list.addEventListener('dblclick',handleCustomDblClick);
    elements.list.addEventListener('dblclick',handleCardDblClick);
    if(elements.activeList){
      elements.activeList.addEventListener('click',handleCardClick);
      elements.activeList.addEventListener('dblclick',handleCustomDblClick);
      elements.activeList.addEventListener('dblclick',handleCardDblClick);
    }
    if(elements.extraContainer){
      elements.extraContainer.addEventListener('click',handleCardClick);
      elements.extraContainer.addEventListener('dblclick',handleCustomDblClick);
      elements.extraContainer.addEventListener('dblclick',handleCardDblClick);
    }

    targetDiv.addEventListener('contextmenu',event=>{
      event.preventDefault();
      openOptions();
    });

    const refreshHighlights=()=>{
      updateHighlights(elements.list);
      if(elements.activeList) updateHighlights(elements.activeList);
      if(elements.extraContainer) updateHighlights(elements.extraContainer);
    };
    window.addEventListener('storage',event=>{if(event.key===LS_DOC) refreshHighlights();});
    window.addEventListener(CUSTOM_BROADCAST,refreshHighlights);

    const mo=new MutationObserver(()=>{
      if(!document.body.contains(elements.root)){
        flushOptionPersist();
        persistState(state,instanceId,stateStorageKey);
        SHARED.clearAspenItems(instanceId);
        stopPolling();
        window.removeEventListener('beforeunload',handleBeforeUnload);
        document.removeEventListener('keydown',handleGlobalKeydown);
        mo.disconnect();
      }
    });
    mo.observe(document.body,{childList:true,subtree:true});

    async function loadAspenFromHandle(handle,{silent=false,skipPermissionCheck=false,persist=false}={}){
      if(!handle) return false;
      if(!skipPermissionCheck){
        const permission=await queryHandlePermission(handle,'read');
        if(permission!=='granted'){
          hasReadPermission=false;
          fileHandle=handle;
          state.filePath=handle?.name||state.filePath||'';
          console.info('[AspenBoard] Kein Zugriff – Nutzer muss Datei neu auswählen');
          refreshTitleBar({hasFile:false,hintText:'Keine Berechtigung – bitte Aspen-Datei neu auswählen.'});
          return false;
        }
      }
      try{
        await ensureXLSX();
        const file=await handle.getFile();
        hasReadPermission=true;
        fileHandle=handle;
        lastModifiedCheck=typeof file?.lastModified==='number'?file.lastModified:Date.now();
        state.filePath=handle.name||state.filePath||'';
        if(persist){
          await persistFileHandle(handleStorageKey,handle);
        }
        const buffer=await file.arrayBuffer();
        const workbook=XLSX.read(buffer,{type:'array'});
        const worksheet=workbook.Sheets[workbook.SheetNames[0]];
        if(!worksheet){
          state.fields=[];
          state.items=[];
          state.activeMeldungen=new Set();
          state.excluded.clear();
          populateFieldSelects();
          render();
          return true;
        }
        const rows=XLSX.utils.sheet_to_json(worksheet,{defval:''});
        const fieldSet=new Set();
        rows.forEach(row=>{if(row&&typeof row==='object'){Object.keys(row).forEach(key=>fieldSet.add(key));}});
        const availableFields=Array.from(fieldSet);
        state.fields=availableFields;
        const preferredPartFields=[
          state.config.partField,
          availableFields.find(field=>/part/i.test(field)),
          availableFields[0],
          TITLE_FIELD,
          DEFAULT_SUB_FIELD
        ].map(val=>val||'');
        const resolvedPartField=preferredPartFields.find(field=>field && availableFields.includes(field))
          || preferredPartFields.find(Boolean)
          || DEFAULT_SUB_FIELD;
        state.config.partField=resolvedPartField;
        const previousSubs=Array.isArray(state.config.subFields)?state.config.subFields.map(entry=>normalizeSubField(entry)).filter(Boolean):[];
        const preservedSubs=[];
        previousSubs.forEach(sub=>{
          const field=sub.field;
          const isCustom=typeof field==='string' && [CUSTOM_FIELD_KEY,CUSTOM_CALC_FIELD_KEY].includes(field.toLowerCase());
          if(field && (availableFields.includes(field) || isCustom) && !preservedSubs.some(existing=>existing.field===field)){
            preservedSubs.push({...sub});
          }
        });
        if(!preservedSubs.length && resolvedPartField){
          preservedSubs.push(createSubFieldConfig(resolvedPartField));
        }
        if(!preservedSubs.length && availableFields.includes(DEFAULT_SUB_FIELD)){
          preservedSubs.push(createSubFieldConfig(DEFAULT_SUB_FIELD));
        }
        if(!preservedSubs.length && availableFields.length){
          preservedSubs.push(createSubFieldConfig(availableFields[0]));
        }
        if(!preservedSubs.length){
          preservedSubs.push(createSubFieldConfig(DEFAULT_SUB_FIELD));
        }
        state.config.subFields=preservedSubs;
        ensureSubFields(state.config);
        const previousOrder=new Map(Array.isArray(state.items)?state.items.map((item,index)=>[item.meldung,index]):[]);
        const newItems=rows.map(row=>{
          const safeRow=row&&typeof row==='object'?row:{};
          const titleVal=String(safeRow[TITLE_FIELD]||'').trim();
          const partRaw=String(safeRow[resolvedPartField]||'').trim();
          const part=(partRaw.split(':')[0]||'').trim();
          const meldung=String(safeRow[MELDUNG_FIELD]||'').trim();
          if(!titleVal && !part && !meldung) return null;
          const data={...safeRow,[TITLE_FIELD]:titleVal,[resolvedPartField]:part,[MELDUNG_FIELD]:meldung};
          return {id:'it-'+Math.random().toString(36).slice(2),part,meldung,data};
        }).filter(Boolean);
        const deduped=dedupeByMeldung(newItems);
        const sortField=primarySubField(state.config);
        const fallbackCompare=(a,b)=>String(a.data?.[sortField]||'').localeCompare(String(b.data?.[sortField]||''));
        deduped.sort((a,b)=>{
          const aIndex=previousOrder.has(a.meldung)?previousOrder.get(a.meldung):-1;
          const bIndex=previousOrder.has(b.meldung)?previousOrder.get(b.meldung):-1;
          if(aIndex!==bIndex){
            if(aIndex<0) return bIndex<0?fallbackCompare(a,b):1;
            if(bIndex<0) return -1;
            return aIndex-bIndex;
          }
          return fallbackCompare(a,b);
        });
        state.items=deduped;
        const availableMeldungen=new Set(deduped.map(item=>item.meldung).filter(Boolean));
        const prevActive=state.activeMeldungen instanceof Set?Array.from(state.activeMeldungen):Array.isArray(state.activeMeldungen)?state.activeMeldungen:[];
        state.activeMeldungen=new Set(prevActive.filter(meldung=>availableMeldungen.has(meldung)));
        ensureExtraColumns(state.config);
        ensureColumnAssignments(state);
        const filteredAssignments=new Map();
        state.columnAssignments.forEach((column,meldung)=>{
          if(availableMeldungen.has(meldung)){
            filteredAssignments.set(meldung,column);
          }
        });
        state.columnAssignments=filteredAssignments;
        const availableParts=new Set(deduped.map(item=>item.part).filter(Boolean));
        if(!(state.excluded instanceof Set)){
          state.excluded=new Set(Array.isArray(state.excluded)?state.excluded:[]);
        }
        state.excluded=new Set(Array.from(state.excluded).filter(part=>availableParts.has(part)));
        populateFieldSelects();
        render();
        refreshTitleBar();
        startPolling();
        return true;
      }catch(error){
        if(error && (error.name==='SecurityError' || error.name==='NotAllowedError')){
          hasReadPermission=false;
          fileHandle=handle;
          console.info('[AspenBoard] Kein Zugriff – Nutzer muss Datei neu auswählen');
          refreshTitleBar({hasFile:false,hintText:'Zugriff verloren – bitte Aspen-Datei neu auswählen.'});
          stopPolling();
        }else{
          if(!silent) console.error('[AspenBoard] Aspen-Datei konnte nicht gelesen werden',error);
          fileHandle=null;
          hasReadPermission=false;
          lastModifiedCheck=null;
          await clearStoredFileHandle(handleStorageKey);
          stopPolling();
          refreshTitleBar({canRefresh:false,hasFile:false});
        }
        return false;
      }
    }

    async function pickFromExcel(){
      try{
        const [handle]=await showOpenFilePicker({
          types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],
          multiple:false
        });
        if(!handle) return;
        await persistFileHandle(handleStorageKey,handle);
        fileHandle=handle;
        hasReadPermission=false;
        const permission=await requestHandlePermission(handle,'read');
        if(permission!=='granted'){
          state.filePath=handle.name||state.filePath||'';
          refreshTitleBar({hasFile:false,hintText:'Keine Berechtigung – bitte Aspen-Datei neu auswählen.'});
          return;
        }
        await loadAspenFromHandle(handle,{silent:false,skipPermissionCheck:true});
      }catch(error){console.error(error);}
    }

    await ensureSortable();
    baseSortableConfig={
      group:{name:GROUP_NAME,pull:true,put:true},
      animation:150,
      handle:'.db-handle',
      draggable:'.db-card',
      ghostClass:'db-ghost',
      chosenClass:'db-chosen'
    };
    new Sortable(elements.list,{
      ...baseSortableConfig,
      onSort:syncRenderPersist,
      onAdd:evt=>{
        syncRenderPersist();
        if(evt?.to===elements.list && SHARED?.handleAspenToDeviceDrop){
          void SHARED.handleAspenToDeviceDrop(evt,{});
        }
      },
      onRemove:syncRenderPersist
    });
    if(elements.activeList){
      new Sortable(elements.activeList,{
        ...baseSortableConfig,
        onSort:syncRenderPersist,
        onAdd:syncRenderPersist,
        onRemove:syncRenderPersist
      });
    }

    setupExtraSortables();

    if(!fileHandle){
      try{
        let storedHandle=await restoreFileHandleFromStore(handleStorageKey);
        if(!storedHandle && Array.isArray(legacyHandleKeys) && legacyHandleKeys.length){
          for(const legacyKey of legacyHandleKeys){
            if(!legacyKey || legacyKey===handleStorageKey) continue;
            storedHandle=await restoreFileHandleFromStore(legacyKey);
            if(storedHandle){
              try{await persistFileHandle(handleStorageKey,storedHandle);}catch{}
              break;
            }
          }
        }
        if(storedHandle){
          fileHandle=storedHandle;
          const permission=await queryHandlePermission(storedHandle,'read');
          if(permission==='granted'){
            await loadAspenFromHandle(storedHandle,{silent:false,skipPermissionCheck:true});
          }else{
            hasReadPermission=false;
            state.filePath=storedHandle.name||state.filePath||'';
            console.info('[AspenBoard] Kein Zugriff – Nutzer muss Datei neu auswählen');
            refreshTitleBar({hasFile:false,hintText:'Keine Berechtigung – bitte Aspen-Datei neu auswählen.'});
          }
        }
      }catch(error){
        console.warn('[AspenBoard] Persistierte Aspen-Datei konnte nicht wiederhergestellt werden',error);
      }
    }
  };
})();
