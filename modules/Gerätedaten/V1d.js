/* Gerätedaten
 * - Excel pick/create with configurable fields
 * - Fields can be reordered and toggled via Sortable list in options
 * - Manual column count option replaces previous automatic layout
 * - Requires FS Access API (Chromium); auto-loads xlsx from CDN.
 */
(function(){
  // ----- styles -----
  const CSS = `
  .rs-root{height:100%;display:flex;flex-direction:column;gap:.6rem;--rs-surface-bg:rgba(21,45,76,.82);--rs-surface-text:var(--text-color);--rs-surface-border:rgba(76,114,163,.32);--rs-inline-bg:rgba(21,45,76,.72);--rs-inline-border:var(--module-border-color);--rs-button-bg:#2563eb;--rs-button-text:#fff;--rs-button-border:#1d4ed8;--rs-button-secondary-bg:#6b7280;--rs-button-secondary-text:#fff}
  .rs-head{font-weight:700;font-size:1.35rem;text-align:center;margin:.2rem 0 .2rem;user-select:none;color:var(--text-color)}
  .rs-form{flex:1;overflow:auto;padding:.25rem .1rem .1rem .1rem;scrollbar-width:none;-ms-overflow-style:none}
  .rs-form::-webkit-scrollbar{width:0;height:0;display:none}
  .rs-actions{display:flex;align-items:center;gap:.6rem;margin-bottom:.45rem;flex-wrap:wrap}
  .rs-inline-file{font-size:.85rem;opacity:.8;flex:1}
  .rs-aspen-status{display:none;width:22px;height:22px;border-radius:50%;align-items:center;justify-content:center;font-size:.75rem;font-weight:600;line-height:1;margin-left:.35rem;transition:background .2s,color .2s}
  .rs-aspen-status.ok{display:inline-flex;background:rgba(16,185,129,.18);color:#10b981}
  .rs-aspen-status.warn{display:inline-flex;background:rgba(234,179,8,.18);color:#ca8a04}
  .rs-aspen-refresh{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid var(--rs-inline-border);background:var(--rs-inline-bg);color:var(--rs-surface-text);cursor:pointer}
  .rs-aspen-refresh:hover{background:rgba(255,255,255,.12)}
  .rs-aspen-refresh:active{transform:scale(.96)}
  .rs-aspen-refresh:disabled{opacity:.45;cursor:default;transform:none}
  .rs-custom-buttons{margin-left:auto;display:flex;align-items:center;gap:.4rem;flex-wrap:wrap}
  .rs-custom-button{border:1px solid var(--rs-inline-border);background:var(--rs-inline-bg);color:var(--rs-surface-text);padding:.3rem .55rem;border-radius:.45rem;font-weight:600;cursor:pointer;transition:background .2s ease,color .2s ease,transform .1s ease}
  .rs-custom-button:hover{background:rgba(255,255,255,.14)}
  .rs-custom-button:active{transform:scale(.97)}
  .rs-custom-button:disabled{opacity:.45;cursor:default;transform:none}
  .rs-aspen-hint{font-size:.8rem;opacity:.7;margin-bottom:.45rem;color:var(--text-color)}
  .rs-grid{display:grid;gap:.9rem}
  .rs-field{display:flex;flex-direction:column;gap:.35rem}
  .rs-labelwrap{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;color:var(--text-color)}
  .rs-label{font-weight:600;opacity:.95;color:inherit;cursor:default}
  .rs-label-info{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:.68rem;font-weight:600;background:rgba(255,255,255,.18);color:inherit;opacity:.85;cursor:help}
  .rs-inline-input{min-width:140px;padding:.25rem .45rem;border-radius:.35rem;border:1px solid var(--rs-inline-border);background:var(--rs-inline-bg);color:var(--rs-surface-text)}
  .rs-inline-input.invalid,.rs-item-label.invalid{border-color:#dc2626;box-shadow:0 0 0 2px rgba(220,38,38,.35)}
  .rs-inputwrap{display:grid;grid-template-columns:auto 38px;align-items:center}
  .rs-input{width:100%;background:var(--rs-inline-bg);border:1px solid var(--rs-inline-border);color:var(--rs-surface-text);padding:.45rem .55rem;border-radius:.4rem}
  .rs-copy{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid var(--rs-inline-border);border-radius:.35rem;background:var(--rs-inline-bg);cursor:pointer;color:var(--rs-surface-text)}
  .rs-copy:active{transform:scale(.98)}
  .rs-note{font-size:.85rem;opacity:.75;margin-top:.15rem;color:var(--text-color)}
  .rs-item{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:.45rem;padding:.35rem .5rem;margin-bottom:.3rem;border:1px solid var(--rs-surface-border);border-radius:.55rem;cursor:grab;background:var(--rs-surface-bg);color:var(--rs-surface-text);box-shadow:0 14px 30px rgba(12,24,41,.48)}
  .rs-item.off{opacity:.6;background:var(--rs-surface-bg)}
  .rs-item-handle{font-size:1.05rem;cursor:grab;user-select:none}
  .rs-item-info{display:flex;flex-direction:column;gap:.15rem;min-width:120px}
  .rs-item-info span{line-height:1}
  .rs-item-original{font-size:.72rem;opacity:.65}
  .rs-item-label{width:100%;padding:.3rem .45rem;border-radius:.45rem;border:1px solid var(--rs-inline-border);background:var(--rs-inline-bg);color:var(--rs-surface-text)}
  .rs-item-actions{display:flex;align-items:center;gap:.45rem;font-size:.8rem}
  .rs-item-actions label{display:flex;align-items:center;gap:.2rem;cursor:pointer}
  .rs-item-remove{border:none;background:transparent;color:#dc2626;font-weight:600;cursor:pointer}
  .rs-new-section{margin-top:1rem;padding:.65rem .6rem;border:1px solid var(--rs-surface-border);border-radius:.6rem;background:var(--rs-surface-bg);color:var(--rs-surface-text);box-shadow:0 14px 30px rgba(12,24,41,.46)}
  .rs-new-title{font-size:.85rem;font-weight:600;margin-bottom:.35rem}
  .rs-new-search{width:100%;padding:.3rem .4rem;border-radius:.35rem;border:1px solid #d1d5db;margin-bottom:.45rem}
  .rs-new-list{list-style:none;margin:0;padding:0;max-height:220px;overflow:auto;display:flex;flex-direction:column;gap:.35rem}
  .rs-new-item{display:flex;align-items:center;justify-content:space-between;gap:.45rem;padding:.35rem .45rem;border:1px solid var(--rs-surface-border);border-radius:.5rem;background:var(--rs-surface-bg);color:var(--rs-surface-text);box-shadow:0 14px 28px rgba(12,24,41,.44)}
  .rs-new-info{display:flex;flex-direction:column;gap:.15rem}
  .rs-new-key{font-weight:600}
  .rs-new-original{font-size:.72rem;opacity:.65}
  .rs-new-add{border:1px solid var(--rs-button-border);border-radius:.35rem;padding:.3rem .55rem;background:var(--rs-button-bg);color:var(--rs-button-text);cursor:pointer}
  .rs-new-add.secondary{background:var(--rs-button-secondary-bg);color:var(--rs-button-secondary-text);border:1px solid var(--rs-button-secondary-bg)}
  .rs-new-inline{display:flex;align-items:center;gap:.35rem;margin-top:.35rem}
  .rs-new-inline input{flex:1;padding:.25rem .4rem;border-radius:.35rem;border:1px solid var(--rs-inline-border);background:var(--rs-inline-bg);color:var(--rs-surface-text)}
  .rs-new-inline button{border:1px solid var(--rs-button-border);border-radius:.35rem;padding:.25rem .55rem;cursor:pointer;background:var(--rs-button-bg);color:var(--rs-button-text)}
  .rs-new-empty{font-size:.8rem;opacity:.65}
  .rs-history-actions .db-btn{font-size:.8rem}
  .rs-color-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;margin-top:.35rem}
  .rs-color-select{display:flex;flex-direction:column;gap:.35rem;font-size:.85rem;color:var(--text-color)}
  .rs-color-select span{font-weight:600}
  .rs-color-select select{appearance:none;background:var(--module-bg);color:var(--text-color);border:1px solid var(--module-border-color);border-radius:.55rem;padding:.45rem .6rem;font-weight:600;cursor:pointer;box-shadow:0 6px 16px rgba(12,24,41,.2)}
  .rs-color-select select:focus{outline:2px solid var(--module-border-color);outline-offset:2px}
  .rs-color-preview{margin-top:.75rem;padding:.75rem;border-radius:.9rem;border:1px solid var(--module-border-color);background:var(--module-bg);color:var(--text-color);box-shadow:0 12px 26px rgba(12,24,41,.18);display:flex;flex-direction:column;gap:.6rem}
  .rs-color-preview-header{align-self:flex-start;padding:.35rem .7rem;border-radius:.65rem;background:var(--module-header-bg);color:var(--module-header-text);font-weight:600}
  .rs-color-preview-body{display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap}
  .rs-color-preview-tag{padding:.4rem .7rem;border-radius:.55rem;background:var(--rs-surface-bg);color:var(--rs-surface-text);border:1px solid var(--rs-surface-border);font-weight:600;box-shadow:0 8px 20px rgba(12,24,41,.2)}
  .rs-color-preview-button{padding:.45rem .9rem;border-radius:.6rem;border:1px solid var(--rs-button-border);background:var(--rs-button-bg);color:var(--rs-button-text);font-weight:600;box-shadow:0 10px 24px rgba(15,23,42,.28);cursor:default;opacity:.98}
  .rs-color-preview-button:disabled{opacity:.98}
  .rs-color-summary{margin-top:.5rem;font-size:.8rem;font-weight:600;color:var(--text-color)}
  .rs-color-foot{margin-top:.45rem;font-size:.78rem;opacity:.75;color:var(--text-color)}
  .rs-color-reload{margin-top:.5rem;background:transparent;border:1px solid var(--module-border-color);color:var(--text-color);border-radius:.6rem;padding:.3rem .65rem;cursor:pointer;font-size:.78rem;font-weight:600;display:inline-flex;align-items:center;gap:.3rem}
  .rs-color-reload:hover{background:var(--module-header-bg);color:var(--module-header-text)}
  .rs-module-blur{filter:blur(6px);opacity:.6;pointer-events:none;user-select:none;transition:filter .2s ease,opacity .2s ease}
  .rs-modal{backdrop-filter:blur(6px)}
  .rs-button-editor{display:flex;flex-direction:column;gap:.6rem}
  .rs-button-actions{display:flex;justify-content:flex-end}
  .rs-button-add{border-radius:.5rem;padding:.32rem .7rem;background:var(--rs-button-bg);color:var(--rs-button-text);border:1px solid var(--rs-button-border);cursor:pointer;font-weight:600}
  .rs-button-add:hover{opacity:.92}
  .rs-button-list{display:flex;flex-direction:column;gap:.6rem}
  .rs-button-item{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr)) auto;gap:.6rem;align-items:end;background:var(--rs-surface-bg);border:1px solid var(--rs-surface-border);padding:.6rem;border-radius:.6rem}
  .rs-button-field{display:flex;flex-direction:column;gap:.25rem;font-size:.78rem}
  .rs-button-field label{font-weight:600;opacity:.8}
  .rs-button-field input,.rs-button-field select{padding:.3rem .45rem;border-radius:.4rem;border:1px solid var(--rs-inline-border);background:var(--rs-inline-bg);color:var(--rs-surface-text)}
  .rs-button-field select{cursor:pointer}
  .rs-button-remove{align-self:center;border:none;background:transparent;color:#dc2626;font-size:1.1rem;font-weight:700;cursor:pointer}
  .rs-button-remove:disabled{opacity:.5;cursor:default}
  .rs-button-empty{font-size:.8rem;opacity:.7}
  .rs-button-select-missing{border-color:#dc2626;box-shadow:0 0 0 2px rgba(220,38,38,.25)}
  `;
  (function inject(){
    let tag=document.getElementById('record-sheet-styles');
    if(!tag){tag=document.createElement('style');tag.id='record-sheet-styles';document.head.appendChild(tag);} 
    tag.textContent=CSS;
  })();

  // ----- utilities -----
  const LS_DOC='module_data_v1';
  const IDB_NAME='modulesApp';
  const IDB_STORE='fs-handles';
  const WATCH_INTERVAL=300;
  const GLOBAL_NAME_KEY='globalNameRules';
  const BASE_FIELD_KEYS=['meldung','auftrag','part','serial'];
  const DEFAULT_FIELD_SOURCE_HINTS={
    meldung:[
      'MELDUNGS_NO','Meldung','Meldungsnummer','Meldungsnr','Meldungs-No',
      'Notification','Notification No','Notification_No','Notification Number',
      'Notif','Notif No','Notif_No','Notif Number'
    ],
    auftrag:[
      'AUFTRAG','Auftrag','Auftragsnummer','Auftragsnr','Auftrag No','Auftrag_No','AUFTRAGS_NO',
      'Order','Order No','Order_No','Order Number','Maintenance Order','Maintenance_Order',
      'Workorder','Work Order','Workorder No','Workorder_No','WO','WO No','WO_No'
    ],
    part:[
      'PART','Part','Part No','Part_No','Part Number','PartNumber',
      'P/N','PN','P-N','Partnum','PartNum','Partnummer','Part_Nr',
      'Material','Material No','Material_No','Material Number','Materialnummer',
      'Artikel','Artikelnummer','Artikel Nr','Component','Component No','Component_No'
    ],
    serial:[
      'SERIAL_NO','Serial No','Serial_No','Serial Number','SerialNumber',
      'Serial','Seriennummer','Serien Nr','Serien-Nr','Seriennummern',
      'SN','S/N','SNr','SNR','Gerätenummer','Geraetenummer','Gerätenr','Geraetenr'
    ],
    repairorder:[
      'REPAIRORDER','Repairorder','Repair Order','Repair_Order',
      'Repair Order No','Repair_Order_No','Repair Order Number','RepairOrderNumber',
      'RO','RO No','RO_No','RO Number','Workorder','Work Order','Workorder No','Workorder_No'
    ]
  };
  const ASPEN_MELDUNGS_COLUMN='MELDUNGS_NO';
  const GROUP_LABELS={base:'Basisfeld',extra:'Zusatzfeld',aspen:'Aspen-Feld'};
  const MAX_HISTORY=50;
  const LABEL_BLOCKLIST=/[<>#]/;

  const parse=(s,fb)=>{try{return JSON.parse(s)||fb;}catch{return fb;}};
  const loadDoc=()=>parse(localStorage.getItem(LS_DOC),{__meta:{v:1},general:{},instances:{}});
  const saveDoc=(doc)=>{doc.__meta={v:1,updatedAt:new Date().toISOString()};localStorage.setItem(LS_DOC,JSON.stringify(doc));};
  const getDocString=()=>localStorage.getItem(LS_DOC)||'';
  const instanceIdOf=root=>root.closest('.grid-stack-item')?.dataset?.instanceId||('inst-'+Math.random().toString(36).slice(2));
  const debounce=(ms,fn)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};

  const slugify=str=>String(str||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'feld';
  function labelHash(str){let h=0;const s=String(str||'').trim().toLowerCase();for(let i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i);h|=0;}return Math.abs(h).toString(36);}
  function defaultLabelForKey(key){const base=String(key||'').trim();if(!base)return'Feld';return base.replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
  function generateFieldId(key,label,used){const slug=slugify(key||label||'feld');const hash=labelHash(label||slug);let candidate=`${slug}#${hash}`;let i=1;while(used&&used.has(candidate)){candidate=`${slug}#${hash}-${i++}`;}return candidate;}
  function inferGroup(key,raw){if(raw?.group==='aspen'||raw?.source==='aspen'||raw?.aspen)return'aspen';const base=String(key||'').trim().toLowerCase();if(BASE_FIELD_KEYS.includes(base))return'base';return raw?.group||'extra';}
  function candidateValuesForField(field,{includeOriginal=true}={}){const seen=new Set();const add=value=>{const trimmed=String(value||'').trim();if(!trimmed)return;const lower=trimmed.toLowerCase();if(seen.has(lower))return;seen.add(lower);candidates.push(trimmed);};const candidates=[];if(includeOriginal)add(field?.originalKey);add(field?.key);add(field?.id);add(field?.label);const hints=DEFAULT_FIELD_SOURCE_HINTS[String(field?.key||'').trim().toLowerCase()];if(Array.isArray(hints))hints.forEach(add);return candidates;}
  function normalizeFieldEntry(raw,used){if(!raw||typeof raw!=='object')return null;const original=String(raw.originalKey??raw.sourceKey??raw.key??'').trim();const key=String(raw.key??original).trim().toLowerCase();const label=String(raw.label??'').trim()||defaultLabelForKey(original||key||'Feld');let id=String(raw.id??'').trim().toLowerCase();if(!id){id=key||generateFieldId(original||key||label,label,used);}if(!id){id=generateFieldId('feld',label,used);}if(used.has(id)){id=generateFieldId(key||original||id||label,label,used);}const group=inferGroup(key||original,raw);const enabled=raw.enabled!==false;const originalKey=original||key||id;return{id,key:key||id,label,enabled,group,originalKey};}
  function normalizeFields(list){const used=new Set();const out=[];(Array.isArray(list)?list:[]).forEach(raw=>{const field=normalizeFieldEntry(raw,used);if(field){used.add(field.id);out.push(field);}});return out;}
  const DEFAULT_BUTTON_LABEL='Button';
  function normalizeButtonEntry(raw,used){if(!raw||typeof raw!=='object')return null;const label=String(raw.label??'').trim();const column=String(raw.column??raw.source??raw.key??'').trim();const suffix=String(raw.suffix??'').trim();let id=String(raw.id??'').trim();const baseLabel=label||column||DEFAULT_BUTTON_LABEL;const slug=slugify(baseLabel||'button')||'button';if(!id){id=slug;}if(used.has(id)){let i=1;let candidate=`${slug}-${i}`;while(used.has(candidate)){i+=1;candidate=`${slug}-${i}`;}id=candidate;}used.add(id);return{id,label:label||DEFAULT_BUTTON_LABEL,column,suffix};}
  function normalizeCustomButtons(list){const used=new Set();const result=[];(Array.isArray(list)?list:[]).forEach(raw=>{const entry=normalizeButtonEntry(raw,used);if(entry)result.push(entry);});return result;}
  function serializeCustomButtons(list){return(Array.isArray(list)?list:[]).map(btn=>({id:btn.id,label:btn.label||'',column:btn.column||'',suffix:btn.suffix||''}));}
  function fieldsEqual(a,b){if(a.length!==b.length)return false;for(let i=0;i<a.length;i++){const x=a[i],y=b[i];if(!x||!y)return false;if(x.id!==y.id||x.key!==y.key||x.label!==y.label||x.enabled!==y.enabled||(x.group||'')!==(y.group||'')||(x.originalKey||'')!==(y.originalKey||''))return false;}return true;}
  function validateLabel(label){const trimmed=String(label||'').trim();if(!trimmed)return'Label darf nicht leer sein.';if(trimmed.length>80)return'Label ist zu lang.';if(LABEL_BLOCKLIST.test(trimmed))return'Unerlaubte Zeichen im Label (#, <, >).';if(/[\x00-\x1F]/.test(trimmed))return'Unerlaubte Steuerzeichen im Label.';return'';}
  function tooltipForField(field){const lbl=field?.label||defaultLabelForKey(field?.originalKey||field?.key||'');const orig=field?.originalKey||field?.key||field?.id||'';const group=GROUP_LABELS[field?.group]||'Feld';return`${lbl} – ${orig} – (${group})`;}

  function ensureBaseFields(list){const seen=new Set(list.map(f=>f.key));BASE_FIELD_KEYS.forEach(key=>{if(!seen.has(key)){list.push({id:key,key,label:defaultLabelForKey(key),enabled:true,group:'base',originalKey:key});}});return list;}

  const DEFAULT_COLOR_SUB_LAYERS=2;
  const MAX_COLOR_SUB_LAYERS=15;
  const clampNumber=(value,min,max)=>{const num=Number(value);if(!Number.isFinite(num))return min;return Math.min(Math.max(num,min),max);};
  function ensureColorValue(value,fallback){const str=typeof value==='string'?value.trim():'';return str||fallback||'';}
  function parseHexColor(value){const str=ensureColorValue(value,'');if(!/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(str))return null;const hex=str.startsWith('#')?str.slice(1):str;const normalized=hex.length===3?hex.split('').map(ch=>ch+ch).join(''):hex;const int=parseInt(normalized,16);if(Number.isNaN(int))return null;return{r:(int>>16)&255,g:(int>>8)&255,b:int&255};}
  const toHexChannel=value=>{const v=Math.max(0,Math.min(255,Math.round(value)));return v.toString(16).padStart(2,'0');};
  const parseRgbComponent=token=>{if(typeof token!=='string')return 0;const trimmed=token.trim();if(!trimmed)return 0;if(trimmed.endsWith('%')){const percent=parseFloat(trimmed.slice(0,-1));if(Number.isNaN(percent))return 0;return clamp(percent,0,100)*255/100;}const value=parseFloat(trimmed);if(Number.isNaN(value))return 0;return clamp(value,0,255);};
  const parseAlphaComponent=token=>{if(typeof token!=='string'){const num=Number(token);return clamp(Number.isNaN(num)?1:num,0,1);}const trimmed=token.trim();if(!trimmed)return 1;if(trimmed.endsWith('%')){const percent=parseFloat(trimmed.slice(0,-1));if(Number.isNaN(percent))return 1;return clamp(percent/100,0,1);}const value=parseFloat(trimmed);if(Number.isNaN(value))return 1;return clamp(value,0,1);};
  const parseRgbaString=value=>{const str=ensureColorValue(value,'');if(!str)return null;const match=/^rgba?\(([^)]+)\)$/i.exec(str);if(!match)return null;const parts=match[1].replace(/\//g,',').split(',').map(part=>part.trim()).filter(Boolean);if(parts.length<3)return null;const r=parseRgbComponent(parts[0]);const g=parseRgbComponent(parts[1]);const b=parseRgbComponent(parts[2]);const a=parts.length>=4?parseAlphaComponent(parts[3]):1;return{r:Math.round(clamp(r,0,255)),g:Math.round(clamp(g,0,255)),b:Math.round(clamp(b,0,255)),a:clamp(a,0,1)};};
  const parseHslaString=value=>{const str=ensureColorValue(value,'');if(!str)return null;const match=/^hsla?\(([^)]+)\)$/i.exec(str);if(!match)return null;const parts=match[1].replace(/\//g,',').split(',').map(part=>part.trim()).filter(Boolean);if(parts.length<3)return null;const h=parseHue(parts[0]);const s=parsePercent(parts[1]);const l=parsePercent(parts[2]);const a=parts.length>=4?parseAlpha(parts[3]):1;if(h==null||s==null||l==null)return null;return{h,s,l,a:Number.isFinite(a)?clamp(a,0,1):1};};
  const rgbaToHsla=(r,g,b,a=1)=>{if(!Number.isFinite(r)||!Number.isFinite(g)||!Number.isFinite(b))return{h:0,s:0,l:0,a:Number.isFinite(a)?clamp(a,0,1):1};const rn=clamp(r/255,0,1);const gn=clamp(g/255,0,1);const bn=clamp(b/255,0,1);const max=Math.max(rn,gn,bn);const min=Math.min(rn,gn,bn);const delta=max-min;let h=0;if(delta!==0){if(max===rn){h=((gn-bn)/delta)%6;}else if(max===gn){h=(bn-rn)/delta+2;}else{h=(rn-gn)/delta+4;}h*=60;}if(h<0)h+=360;const l=(max+min)/2;const s=delta===0?0:delta/(1-Math.abs(2*l-1));return{h:((h%360)+360)%360,s:clamp(s*100,0,100),l:clamp(l*100,0,100),a:Number.isFinite(a)?clamp(a,0,1):1};};
  const rgbaToCss=rgba=>{if(!rgba)return'';const r=Math.round(clamp(rgba.r,0,255));const g=Math.round(clamp(rgba.g,0,255));const b=Math.round(clamp(rgba.b,0,255));const alpha=Number.isFinite(rgba.a)?clamp(rgba.a,0,1):1;const normalized=Math.round(alpha*100)/100;const alphaStr=normalized%1===0?normalized.toFixed(0):normalized.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');return`rgba(${r}, ${g}, ${b}, ${alphaStr})`;};
  const parseCssColorMeta=value=>{const hex=parseHexColor(value);if(hex){return{format:'hex',rgba:{r:hex.r,g:hex.g,b:hex.b,a:1}};}const hsla=parseHslaString(value);if(hsla){const rgba=hslaToRgba(hsla.h,hsla.s,hsla.l,hsla.a);return{format:'hsla',rgba,hsla};}const rgba=parseRgbaString(value);if(rgba){return{format:'rgba',rgba};}return null;};
  function mixHexColors(colorA,colorB,ratio){const amount=Math.min(Math.max(Number(ratio)||0,0),1);const parsedA=parseCssColorMeta(colorA);const parsedB=parseCssColorMeta(colorB);if(!parsedA||!parsedB)return ensureColorValue(colorA,colorB);const mixChannel=(c1,c2)=>c1+(c2-c1)*amount;const mixed={r:mixChannel(parsedA.rgba.r,parsedB.rgba.r),g:mixChannel(parsedA.rgba.g,parsedB.rgba.g),b:mixChannel(parsedA.rgba.b,parsedB.rgba.b),a:mixChannel(parsedA.rgba.a??1,parsedB.rgba.a??1)};const formatHint=parsedA.format||parsedB.format||'rgba';if(formatHint==='hsla'){const hsla=rgbaToHsla(mixed.r,mixed.g,mixed.b,mixed.a);return formatHslaFromNumbers(hsla.h,hsla.s,hsla.l,hsla.a);}if(formatHint==='hex'){return rgbaToHex(mixed);}return rgbaToCss(mixed);}
  const lightenHexColor=(color,amount)=>{if(!color)return'';return mixHexColors(color,'hsla(0, 0%, 100%, 1)',amount);};
  const CONTRAST_LIGHT_TEXT='hsla(0, 0%, 100%, 1)';
  const CONTRAST_DARK_TEXT='hsla(222, 47%, 11%, 1)';
  const clamp=(value,min,max)=>Math.min(Math.max(value,min),max);
  const extractNumeric=value=>{const str=typeof value==='string'?value.trim():'';if(!str)return null;const match=str.match(/-?\d+(?:\.\d+)?/);if(!match)return null;const num=Number(match[0]);return Number.isFinite(num)?num:null;};
  const parsePercent=value=>{const num=extractNumeric(value);if(num==null)return null;return clamp(num,0,100);};
  const parseHue=value=>{const num=extractNumeric(value);if(num==null)return null;const normalized=((num%360)+360)%360;return normalized;};
  const parseAlpha=value=>{const num=extractNumeric(value);if(num==null)return null;const str=typeof value==='string'?value.trim():'';const normalized=str.includes('%')?num/100:num;return clamp(normalized,0,1);};
  const formatHslaFromNumbers=(h,s,l,a)=>{const hue=Number.isFinite(h)?h:0;const sat=Number.isFinite(s)?clamp(s,0,100):0;const lig=Number.isFinite(l)?clamp(l,0,100):0;const alpha=Number.isFinite(a)?clamp(a,0,1):1;return`hsla(${hue}, ${sat}%, ${lig}%, ${alpha})`;};
  function hslaToRgba(h,s,l,a){if(!Number.isFinite(h)||!Number.isFinite(s)||!Number.isFinite(l))return null;const sat=clamp(s/100,0,1);const lig=clamp(l/100,0,1);const hue=((h%360)+360)%360/360;let r;let g;let b;if(sat===0){r=g=b=lig;}else{const q=lig<0.5?lig*(1+sat):lig+sat-lig*sat;const p=2*lig-q;const hue2rgb=(pVal,qVal,t)=>{let tt=t;if(tt<0)tt+=1;if(tt>1)tt-=1;if(tt<1/6)return pVal+(qVal-pVal)*6*tt;if(tt<1/2)return qVal;if(tt<2/3)return pVal+(qVal-pVal)*(2/3-tt)*6;return pVal;};r=hue2rgb(p,q,hue+1/3);g=hue2rgb(p,q,hue);b=hue2rgb(p,q,hue-1/3);}return{r:Math.round(clamp(r,0,1)*255),g:Math.round(clamp(g,0,1)*255),b:Math.round(clamp(b,0,1)*255),a:Number.isFinite(a)?clamp(a,0,1):1};}
  const rgbaToHex=rgba=>{if(!rgba)return null;return`#${toHexChannel(rgba.r)}${toHexChannel(rgba.g)}${toHexChannel(rgba.b)}`;};
  const srgbToLinear=value=>{const channel=value/255;return channel<=0.04045?channel/12.92:Math.pow((channel+0.055)/1.055,2.4);};
  const relativeLuminance=rgba=>{if(!rgba)return null;const r=srgbToLinear(rgba.r);const g=srgbToLinear(rgba.g);const b=srgbToLinear(rgba.b);return 0.2126*r+0.7152*g+0.0722*b;};
  const preferredTextColor=rgba=>{const lum=relativeLuminance(rgba);if(lum==null)return CONTRAST_LIGHT_TEXT;return lum>0.55?CONTRAST_DARK_TEXT:CONTRAST_LIGHT_TEXT;};
  const hexToRgba=(color,alphaOverride)=>{const parsed=parseCssColorMeta(color);if(!parsed)return null;const rgba={...parsed.rgba};if(Number.isFinite(alphaOverride)){rgba.a=clamp(alphaOverride,0,1);return rgbaToCss(rgba);}return rgba;};
  function createLayerFromCssVariables(index,hRaw,sRaw,lRaw,aRaw){const h=parseHue(hRaw);const s=parsePercent(sRaw);const l=parsePercent(lRaw);const a=parseAlpha(aRaw??'1');const color=typeof hRaw==='string'||typeof sRaw==='string'||typeof lRaw==='string'||typeof aRaw==='string'?`hsla(${(hRaw||'').trim()|| (Number.isFinite(h)?`${h}`:'0')}, ${(sRaw||'').trim()|| (Number.isFinite(s)?`${s}%`:'0%')}, ${(lRaw||'').trim()|| (Number.isFinite(l)?`${l}%`:'0%')}, ${(aRaw||'').trim()|| (Number.isFinite(a)?`${a}`:'1')})`:formatHslaFromNumbers(h,s,l,a);const rgba=hslaToRgba(h??0,s??0,l??0,a??1);const textColor=preferredTextColor(rgba);const borderColor=mixHexColors(color,'hsla(0, 0%, 0%, 1)',0.18);const subLayer={bg:color,text:textColor,border:borderColor};const hex=rgbaToHex(rgba);return{ id:`layer${index}`, name:`Unter-Layer ${index}`, label:`Unter-Layer ${index}`, color, dropdownTextColor:textColor, moduleBg:color, moduleText:textColor, moduleBorder:borderColor, headerBg:color, headerText:textColor, headerBorder:borderColor, subLayers:[subLayer], subBg:subLayer.bg, subText:subLayer.text, subBorder:subLayer.border, hsla:{h,s,l,a}, hex, rgba};}
  function normalizeLegacyLayer(layer,index){const id=typeof layer?.id==='string'&&layer.id.trim()?layer.id.trim():`layer-${index+1}`;const name=typeof layer?.name==='string'&&layer.name.trim()?layer.name.trim():`Unter-Layer ${index+1}`;const label=typeof layer?.label==='string'&&layer.label.trim()?layer.label.trim():`Unter-Layer ${index+1}`;const moduleBg=ensureColorValue(layer?.moduleBg||layer?.color,'#005983');const moduleText=ensureColorValue(layer?.moduleText,CONTRAST_LIGHT_TEXT);const moduleBorder=ensureColorValue(layer?.moduleBorder,moduleText);const headerBg=ensureColorValue(layer?.headerBg,moduleBg);const headerText=ensureColorValue(layer?.headerText,moduleText);const headerBorder=ensureColorValue(layer?.headerBorder,headerBg);const subLayers=Array.isArray(layer?.subLayers)&&layer.subLayers.length?layer.subLayers.map(sub=>({bg:ensureColorValue(sub?.bg,moduleBg),text:ensureColorValue(sub?.text,moduleText),border:ensureColorValue(sub?.border,moduleBorder)})):[{bg:moduleBg,text:moduleText,border:moduleBorder}];const primarySub=subLayers[0];const rgba=hexToRgba(moduleBg)||hexToRgba(primarySub.bg);const dropdownText=ensureColorValue(layer?.dropdownTextColor,rgba?preferredTextColor(rgba):moduleText);const hex=rgbaToHex(rgba)||(/^#/i.test(moduleBg)?moduleBg:null);return{...layer,id,name,label,color:ensureColorValue(layer?.color,moduleBg),moduleBg,moduleText,moduleBorder,headerBg,headerText,headerBorder,subLayers,subBg:ensureColorValue(layer?.subBg,primarySub.bg),subText:ensureColorValue(layer?.subText,primarySub.text),subBorder:ensureColorValue(layer?.subBorder,primarySub.border),dropdownTextColor:dropdownText,hex,rgba};}
  function deepClone(value){if(value==null)return value;if(typeof structuredClone==='function'){try{return structuredClone(value);}catch{}}try{return JSON.parse(JSON.stringify(value));}catch{return value;}}
  function readStoredAppSettings(){try{const raw=localStorage.getItem('appSettings');if(!raw)return null;return JSON.parse(raw);}catch{return null;}}
  function readLiveAppSettings(){try{if(typeof window==='object'&&window&&typeof window.appSettings==='object'&&window.appSettings){return deepClone(window.appSettings);} }catch{}return readStoredAppSettings();}
  function mutateAppSettings(mutator){if(typeof mutator!=='function')return readLiveAppSettings()||{};const current=readLiveAppSettings()||{};const draft=deepClone(current)||{};mutator(draft);try{localStorage.setItem('appSettings',JSON.stringify(draft));}catch{}try{if(typeof window==='object'&&window){if(!window.appSettings||typeof window.appSettings!=='object'){window.appSettings={};}mutator(window.appSettings);}}catch{}return draft;}
  function readModuleColorSettings(instanceId){if(!instanceId)return null;const settings=readLiveAppSettings();if(!settings||typeof settings!=='object')return null;const modules=settings.modules;if(!modules||typeof modules!=='object')return null;const entry=modules[instanceId];if(!entry||typeof entry!=='object')return null;const colors=entry.colors;if(!colors||typeof colors!=='object')return null;return {...colors};}
  function getDocumentModuleColorBaseline(){try{const styles=getComputedStyle(document.documentElement);const moduleBg=ensureColorValue(styles.getPropertyValue('--module-bg'),'#005983');const moduleText=ensureColorValue(styles.getPropertyValue('--text-color'),'#ffffff');const moduleBorder=ensureColorValue(styles.getPropertyValue('--module-border-color'),moduleText);const headerBg=ensureColorValue(styles.getPropertyValue('--module-header-bg'),moduleBg);const headerText=ensureColorValue(styles.getPropertyValue('--module-header-text'),moduleText);return{moduleBg,moduleText,moduleBorder,headerBg,headerText};}catch{return{moduleBg:'#005983',moduleText:'#ffffff',moduleBorder:'#0f6ab4',headerBg:'#0f6ab4',headerText:'#ffffff'};}}
  function normalizeColorLayers(rawLayers,subLayerCount){const normalizer=typeof window.normalizeModuleColorLayers==='function'?window.normalizeModuleColorLayers:null;if(normalizer){try{return normalizer(Array.isArray(rawLayers)?rawLayers:[],subLayerCount);}catch(e){}}return Array.isArray(rawLayers)?rawLayers:[];}
  function enrichColorLayers(list){return(list||[]).map((layer,index)=>{const id=typeof layer?.id==='string'&&layer.id.trim()?layer.id.trim():`layer-${index+1}`;const name=typeof layer?.name==='string'&&layer.name.trim()?layer.name.trim():`Unter-Layer ${index+1}`;return{...layer,id,name};});}
  const normalizeCssVarToken=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,'');
  function isFallbackLayerPlaceholder(h,s,l,a,inlineTokens){if(inlineTokens.some(token=>String(token||'').trim()))return false;const normH=normalizeCssVarToken(h);const normS=normalizeCssVarToken(s);const normL=normalizeCssVarToken(l);const normA=normalizeCssVarToken(a);const isHueDefault=normH===''||normH==='0'||normH==='0deg';const isSatDefault=normS===''||normS==='0'||normS==='0%';const isLightDefault=normL===''||normL==='1'||normL==='100'||normL==='100%';const isAlphaDefault=normA===''||normA==='1'||normA==='100%';return isHueDefault&&isSatDefault&&isLightDefault&&isAlphaDefault;}
  function loadGlobalColorLayers(){const settings=readLiveAppSettings()||{};const desired=clampNumber(settings?.moduleSubLayerCount??DEFAULT_COLOR_SUB_LAYERS,1,MAX_COLOR_SUB_LAYERS);const normalizedSettings=enrichColorLayers(normalizeColorLayers(settings?.moduleColorLayers,desired)).map((layer,index)=>normalizeLegacyLayer(layer,index));const cssLayers=[];try{const root=document.documentElement;if(root){const styles=getComputedStyle(root);for(let i=1;i<=MAX_COLOR_SUB_LAYERS;i+=1){const hueVar=`--layer${i}-h`;const satVar=`--layer${i}-s`;const lightVar=`--layer${i}-l`;const alphaVar=`--layer${i}-a`;const h=styles.getPropertyValue(hueVar).trim();const s=styles.getPropertyValue(satVar).trim();const l=styles.getPropertyValue(lightVar).trim();const a=styles.getPropertyValue(alphaVar).trim();console.log(`[LayerScan] Prüfe Layer ${i}:`,{h,s,l,a});let layerResult=null;if(h&&s&&l&&a&&!isFallbackLayerPlaceholder(h,s,l,a,[root.style.getPropertyValue(hueVar),root.style.getPropertyValue(satVar),root.style.getPropertyValue(lightVar),root.style.getPropertyValue(alphaVar)])){layerResult=createLayerFromCssVariables(i,h,s,l,a);cssLayers.push(layerResult);}console.log(`[LayerScan] Ergebnis Layer ${i}:`,{valid:Boolean(layerResult),layer:layerResult});}}}catch(error){console.log('[LayerScan] Fehler beim Lesen der CSS-Layer:',error);}console.log('[LayerScan] Gefundene Layer:',cssLayers);if(cssLayers.length){if(normalizedSettings.length){const seen=new Set(cssLayers.map(layer=>layer?.id));normalizedSettings.forEach(layer=>{const key=layer?.id;if(!key||seen.has(key))return;cssLayers.push(layer);seen.add(key);});}if(cssLayers.length)return cssLayers;}if(normalizedSettings.length)return normalizedSettings;const fallback=enrichColorLayers(normalizeColorLayers([],desired)).map((layer,index)=>normalizeLegacyLayer(layer,index));if(fallback.length)return fallback;try{if(typeof window.getDefaultModuleColorLayers==='function'){const defaults=window.getDefaultModuleColorLayers();const normalizedDefaults=enrichColorLayers(normalizeColorLayers(defaults,desired)).map((layer,index)=>normalizeLegacyLayer(layer,index));if(normalizedDefaults.length)return normalizedDefaults;}}catch(error){console.log('[LayerScan] Fehler beim Laden der Default-Layer:',error);}const baseline=getDocumentModuleColorBaseline();return[normalizeLegacyLayer({id:'default',name:'Standard',moduleBg:baseline.moduleBg,moduleText:baseline.moduleText,moduleBorder:baseline.moduleBorder,headerBg:baseline.headerBg,headerText:baseline.headerText,headerBorder:baseline.headerBg,subLayers:[{bg:baseline.moduleBg,text:baseline.moduleText,border:baseline.moduleBorder}],subBg:baseline.moduleBg,subText:baseline.moduleText,subBorder:baseline.moduleBorder},0)];}
  function formatColorLayerLabel(layer){if(!layer)return'Standard';const name=layer.name||layer.label||'Layer';const color=ensureColorValue(layer.color||layer.moduleBg,'');return color?`${name} · ${color}`:name;}
  function populateLayerDropdown(select,layers){if(!select)return;console.log('[Dropdown] Fülle Dropdown:',select.id||'(ohne id)',layers);select.innerHTML='';const list=Array.isArray(layers)?layers:[];list.forEach((layer,index)=>{if(!layer)return;const opt=document.createElement('option');const value=layer.id||`layer${index+1}`;opt.value=value;opt.textContent=layer.name||`Unter-Layer ${index+1}`;const bg=layer.color||layer.moduleBg||'';if(bg)opt.style.background=bg;opt.style.color='#fff';opt.style.padding='4px 8px';opt.style.borderRadius='4px';select.appendChild(opt);});}
  function getLayerColor(layerId,layers){const list=Array.isArray(layers)?layers:[];const match=list.find(layer=>layer&&String(layer.id)===String(layerId));return match?.color||match?.moduleBg||'';}
  function applyLayerSelectStyles(select,layer){if(!select)return;if(layer){const bg=layer?.color||layer?.moduleBg||'';const text=layer?.dropdownTextColor||'';select.style.background=bg;select.style.color=text||CONTRAST_LIGHT_TEXT;}else{select.style.background='';select.style.color='';}}
  function computeButtonPalette(layer,headerColors,moduleColors,baseline){const sub=Array.isArray(layer?.subLayers)&&layer.subLayers.length?layer.subLayers[0]:null;const bg=ensureColorValue(sub?.bg||layer?.subBg||layer?.moduleBg,headerColors.bg||moduleColors.bg||baseline.moduleBg);const text=ensureColorValue(sub?.text||layer?.subText||layer?.moduleText,headerColors.text||moduleColors.text||baseline.moduleText);const border=ensureColorValue(sub?.border||layer?.subBorder||layer?.moduleBorder,headerColors.border||moduleColors.border||baseline.moduleBorder);const inlineBg=ensureColorValue(lightenHexColor(bg,.18),bg);const inlineBorder=ensureColorValue(mixHexColors(border,'hsla(0, 0%, 100%, 1)',.12),border);const secondaryBg=ensureColorValue(mixHexColors(bg,'hsla(0, 0%, 100%, 1)',.28),bg);return{name:layer?.name||headerColors.name||moduleColors.name,bg,text,border,inlineBg,inlineBorder,secondaryBg,secondaryText:text};}
  function computeModulePalette(layers,selection,baseline){const list=Array.isArray(layers)?layers:[];const findById=id=>list.find(layer=>layer&&String(layer.id)===String(id));const fallback=list[0]||null;const moduleLayer=findById(selection?.module)||fallback;const headerLayer=findById(selection?.header)||moduleLayer||fallback;const buttonsLayer=findById(selection?.buttons)||headerLayer||moduleLayer||fallback;const moduleColors={name:moduleLayer?.name||'Standard',bg:ensureColorValue(moduleLayer?.moduleBg,baseline.moduleBg),text:ensureColorValue(moduleLayer?.moduleText,baseline.moduleText),border:ensureColorValue(moduleLayer?.moduleBorder,moduleLayer?.moduleText||baseline.moduleBorder||baseline.moduleText)};const headerColors={name:headerLayer?.name||moduleColors.name,bg:ensureColorValue(headerLayer?.headerBg,moduleLayer?.moduleBg||baseline.headerBg||moduleColors.bg),text:ensureColorValue(headerLayer?.headerText,moduleLayer?.moduleText||baseline.headerText||moduleColors.text),border:ensureColorValue(headerLayer?.headerBorder,headerLayer?.headerBg||moduleColors.border)};const buttons=computeButtonPalette(buttonsLayer,headerColors,moduleColors,baseline);return{module:moduleColors,header:headerColors,buttons};}
  function setCssVar(element,name,value){if(!element||!element.style||typeof name!=='string')return;if(value)element.style.setProperty(name,value);else element.style.removeProperty(name);}
  function applyPaletteToElement(element,palette){if(!element||!palette)return;const{module,header,buttons}=palette;setCssVar(element,'--module-bg',module.bg);setCssVar(element,'--text-color',module.text);setCssVar(element,'--module-border-color',module.border);setCssVar(element,'--module-header-bg',header.bg);setCssVar(element,'--module-header-text',header.text);setCssVar(element,'--rs-header-border',header.border);setCssVar(element,'--rs-surface-bg',buttons.bg);setCssVar(element,'--rs-surface-text',buttons.text);setCssVar(element,'--rs-surface-border',buttons.border);setCssVar(element,'--rs-inline-bg',buttons.inlineBg||buttons.bg);setCssVar(element,'--rs-inline-border',buttons.inlineBorder||buttons.border);setCssVar(element,'--rs-button-bg',buttons.bg);setCssVar(element,'--rs-button-text',buttons.text);setCssVar(element,'--rs-button-border',buttons.border);setCssVar(element,'--rs-button-secondary-bg',buttons.secondaryBg||buttons.inlineBg||buttons.bg);setCssVar(element,'--rs-button-secondary-text',buttons.secondaryText||buttons.text);}

  function idbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open(IDB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(IDB_STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
  async function idbSet(k,v){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function idbGet(k){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readonly');const rq=tx.objectStore(IDB_STORE).get(k);rq.onsuccess=()=>res(rq.result||null);rq.onerror=()=>rej(rq.error);});}
  async function idbDel(k){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).delete(k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function ensureRPermission(handle){if(!handle?.queryPermission)return true;const q=await handle.queryPermission({mode:'read'});if(q==='granted')return true;const r=await handle.requestPermission({mode:'read'});return r==='granted';}

  async function saveGlobalRules(h,name){try{await idbSet(GLOBAL_NAME_KEY,h);}catch{}const doc=loadDoc();doc.general ||= {};doc.general.nameFileName=name;saveDoc(doc);}

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
      let last;for(const url of urls){try{await new Promise((ok,err)=>{const s=document.createElement('script');s.src=url;s.async=true;s.onload=ok;s.onerror=()=>err(new Error('load '+url));document.head.appendChild(s);});if(window.XLSX) return;}catch(e){last=e;}}
      throw last||new Error('XLSX load failed');
    })();
    return window.__XLSX_LOAD_PROMISE__;
  }

  async function readRulesFromHandle(handle){
    await ensureXLSX();
    const f=await handle.getFile();
    if(f.size===0)return[];
    const buf=await f.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const ws=wb.Sheets['Rules']||wb.Sheets[wb.SheetNames[0]];
    if(!ws)return[];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    return rows.slice(1).filter(r=>r.length&&(r[0]!==''||r[1]!==''))
      .map(r=>({prefix:String(r[0]||''),name:String(r[1]||'')}))
      .sort((a,b)=>b.prefix.length-a.prefix.length);
  }

  async function readAspenFile(handle){
    await ensureXLSX();
    const f=await handle.getFile();
    if(f.size===0)return[];
    const buf=await f.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    if(!ws)return{headers:[],rows:[]};
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    const header=Array.isArray(rows[0])?rows[0]:[];
    const headers=header.map((cell,idx)=>{const original=String(cell||'').trim();const key=original.toLowerCase();return{original,key,index:idx};}).filter(h=>h.key);
    const dataRows=rows.slice(1).map(r=>{const entry={};const lower={};headers.forEach(h=>{const value=String(r[h.index]??'');entry[h.original]=value;lower[h.key]=value;});entry.__lower=lower;return entry;}).filter(row=>headers.some(h=>(row[h.original]||'').trim()!==''));
    return{headers,rows:dataRows};
  }

  function buildUI(root){
    root.innerHTML=`
      <div class="rs-root">
        <div class="rs-head" style="display:none"></div>
        <div class="rs-form">
          <div class="rs-actions">
            <span class="rs-inline-file"></span>
            <span class="rs-aspen-status" role="img" aria-live="polite"></span>
            <div class="rs-custom-buttons" style="display:none"></div>
            <button type="button" class="rs-aspen-refresh" title="Aspen aktualisieren" aria-label="Aspen aktualisieren">↻</button>
          </div>
          <div class="rs-aspen-hint"></div>
          <div class="rs-grid"></div>
          <div class="rs-note"></div>
        </div>
      </div>
      <div class="db-modal rs-modal" style="position:fixed;inset:0;display:none;place-items:center;background:rgba(0,0,0,.35);z-index:50;">
        <div class="db-panel" style="background:#fff;color:#111827;width:min(92vw,720px);border-radius:.9rem;padding:1rem;">
          <div class="db-row" style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.5rem">
            <div class="font-semibold">Gerätedaten – Optionen</div>
            <button class="db-btn secondary rs-close" style="background:#eee;border-radius:.5rem;padding:.35rem .6rem">Schließen</button>
          </div>
          <div class="db-field" style="margin-top:1rem;">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Namensregeln</label>
            <div class="db-row" style="display:flex;gap:.5rem;align-items:center">
              <button class="db-btn rs-rule-pick" style="background:var(--button-bg);color:var(--button-text);border-radius:.5rem;padding:.35rem .6rem">Excel wählen</button>
              <span class="rs-rule-file db-file"></span>
            </div>
          </div>
          <div class="db-field" style="margin-top:1rem;">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Aspen-Datei</label>
            <div class="db-row" style="display:flex;gap:.5rem;align-items:center">
              <button class="db-btn rs-aspen-pick" style="background:rgba(0,0,0,.08);border-radius:.5rem;padding:.35rem .6rem">Aspen wählen</button>
              <span class="rs-aspen-file db-file"></span>
            </div>
          </div>
          <div class="db-field" style="margin-top:1rem;">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Modulfarben</label>
            <div class="rs-color-grid">
              <label class="rs-color-select">
                <span>Hauptmodul</span>
                <select class="rs-color-module module-layer-select" data-target="module"></select>
              </label>
              <label class="rs-color-select">
                <span>Header</span>
                <select class="rs-color-header module-layer-select" data-target="header"></select>
              </label>
              <label class="rs-color-select">
                <span>Buttons</span>
                <select class="rs-color-buttons module-layer-select" data-target="buttons"></select>
              </label>
            </div>
            <div class="rs-color-preview" data-rs-color-preview>
              <div class="rs-color-preview-header">Header</div>
              <div class="rs-color-preview-body">
                <div class="rs-color-preview-tag">Modulfläche</div>
                <button type="button" class="rs-color-preview-button" disabled>Button</button>
              </div>
              <div class="rs-color-summary"></div>
              <div class="rs-color-foot">Farben basieren auf den globalen Einstellungen.</div>
              <button type="button" class="rs-color-reload">🔄 Aktualisieren</button>
            </div>
          </div>
          <div class="db-field" style="margin-top:1rem;">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Felder</label>
            <div class="rs-history-actions" style="display:flex;gap:.4rem;margin-bottom:.4rem;">
              <button class="db-btn rs-undo" style="background:rgba(0,0,0,.08);border-radius:.5rem;padding:.32rem .55rem">↺ Rückgängig</button>
              <button class="db-btn rs-redo" style="background:rgba(0,0,0,.08);border-radius:.5rem;padding:.32rem .55rem">↻ Wiederholen</button>
            </div>
            <ul class="rs-list" style="list-style:none;margin:0;padding:0;"></ul>
            <div style="font-size:.8rem;opacity:.7;margin-top:.25rem;">Aktivieren/Deaktivieren per Checkbox, ziehen am Griff zum Sortieren.</div>
            <div class="rs-new-section">
              <div class="rs-new-title">Neue Felder hinzufügen</div>
              <input class="rs-new-search" type="search" placeholder="Aspen-Felder suchen..." />
              <ul class="rs-new-list"></ul>
              <div class="rs-new-empty">Aspen-Datei wählen, um verfügbare Felder zu laden.</div>
            </div>
          </div>
          <div class="db-field" style="margin-top:1rem;">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Zusätzliche Schaltflächen</label>
            <div style="font-size:.78rem;opacity:.75;margin-bottom:.4rem;">Buttons kopieren Aspen-Werte und können einen eigenen Suffix anhängen.</div>
            <div class="rs-button-editor">
              <div class="rs-button-actions">
                <button type="button" class="rs-button-add">➕ Button hinzufügen</button>
              </div>
              <div class="rs-button-empty">Noch keine Buttons angelegt.</div>
              <div class="rs-button-list"></div>
            </div>
          </div>
          <div class="db-field" style="margin-top:1rem;">
            <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.25rem">Spalten</label>
            <input type="number" min="1" max="6" class="rs-cols" style="width:4rem;padding:.25rem .4rem;border:1px solid #ccc;border-radius:.25rem;" />
          </div>
        </div>
      </div>
    `;
    return {
      rootEl:root.querySelector('.rs-root'),
      grid:root.querySelector('.rs-grid'),
      note:root.querySelector('.rs-note'),
      customButtons:root.querySelector('.rs-custom-buttons'),
      modal:root.querySelector('.rs-modal'),
      mClose:root.querySelector('.rs-close'),
      head:root.querySelector('.rs-head'),
      aspenInlineFile:root.querySelector('.rs-inline-file'),
      aspenStatus:root.querySelector('.rs-aspen-status'),
      aspenRefresh:root.querySelector('.rs-aspen-refresh'),
      aspenHint:root.querySelector('.rs-aspen-hint'),
      mRulePick:root.querySelector('.rs-rule-pick'),
      mRuleFile:root.querySelector('.rs-rule-file'),
      mAspenPick:root.querySelector('.rs-aspen-pick'),
      mAspenFile:root.querySelector('.rs-aspen-file'),
      mList:root.querySelector('.rs-list'),
      mCols:root.querySelector('.rs-cols'),
      mUndo:root.querySelector('.rs-undo'),
      mRedo:root.querySelector('.rs-redo'),
      mNewSearch:root.querySelector('.rs-new-search'),
      mNewList:root.querySelector('.rs-new-list'),
      mNewEmpty:root.querySelector('.rs-new-empty'),
      mColorModule:root.querySelector('.rs-color-module'),
      mColorHeader:root.querySelector('.rs-color-header'),
      mColorButtons:root.querySelector('.rs-color-buttons'),
      mColorPreview:root.querySelector('[data-rs-color-preview]'),
      mColorSummary:root.querySelector('.rs-color-summary'),
      mColorReload:root.querySelector('.rs-color-reload'),
      mButtonList:root.querySelector('.rs-button-list'),
      mButtonEmpty:root.querySelector('.rs-button-empty'),
      mButtonAdd:root.querySelector('.rs-button-add')
    };
  }

  // ----- main -----
  window.renderRecordSheet=function(root,ctx){
    if(!('showOpenFilePicker' in window)||!('showSaveFilePicker' in window)){
      root.innerHTML=`<div class="p-2 text-sm">Dieses Modul benötigt die File System Access API (Chromium).</div>`;
      return;
    }

    const defaults=ctx?.moduleJson?.settings||{};
    const fallbackFields=[
      {id:'meldung',key:'meldung',label:'Meldung',enabled:true,group:'base',originalKey:'meldung'},
      {id:'auftrag',key:'auftrag',label:'Auftrag',enabled:true,group:'base',originalKey:'auftrag'},
      {id:'part',key:'part',label:'P/N',enabled:true,group:'base',originalKey:'part'},
      {id:'serial',key:'serial',label:'S/N',enabled:true,group:'base',originalKey:'serial'}
    ];
    const defaultsRaw=Array.isArray(defaults.fields)&&defaults.fields.length?defaults.fields.map(f=>({...f})):fallbackFields.map(f=>({...f}));
    const defaultFields=normalizeFields(ensureBaseFields(defaultsRaw));
    const defaultColumns=defaults.columns||2;

    const els=buildUI(root);
    const moduleHost=root.closest('.grid-stack-item-content');
    let colorLayers=loadGlobalColorLayers();
    const baselineColors=getDocumentModuleColorBaseline();
    let fallbackColorLayerId=colorLayers[0]?.id||'default';
    let cfg;
    const findColorLayer=id=>colorLayers.find(layer=>layer&&String(layer.id)===String(id))||null;
    const sanitizeColorSelection=(raw)=>{
      const fallback=fallbackColorLayerId||colorLayers[0]?.id||'default';
      const moduleId=typeof raw?.module==='string'&&findColorLayer(raw.module)?raw.module:fallback;
      const headerId=typeof raw?.header==='string'&&findColorLayer(raw.header)?raw.header:moduleId;
      const buttonsId=typeof raw?.buttons==='string'&&findColorLayer(raw.buttons)?raw.buttons:headerId;
      return{module:moduleId,header:headerId,buttons:buttonsId};
    };
    const persistModuleColorSelection=(selection)=>{
      if(!cfg)return;
      const sanitized=sanitizeColorSelection(selection||cfg.colors||{});
      mutateAppSettings(settings=>{
        if(!settings.modules||typeof settings.modules!=='object')settings.modules={};
        const entry=typeof settings.modules[instanceId]==='object'&&settings.modules[instanceId]?settings.modules[instanceId]:{};
        entry.colors={...sanitized};
        settings.modules[instanceId]=entry;
      });
      cfg.colors=sanitized;
      return sanitized;
    };
    const layerSelects=[els.mColorModule,els.mColorHeader,els.mColorButtons].filter(Boolean);
    const renderColorSelectOptions=()=>{
      layerSelects.forEach(select=>{
        const current=select.value;
        populateLayerDropdown(select,colorLayers);
        const target=select.dataset?.target;
        if(target&&cfg?.colors?.[target]){select.value=cfg.colors[target];}
        else if(current){select.value=current;}
        const layer=findColorLayer(select.value);
        applyLayerSelectStyles(select,layer);
      });
    };
    const updateColorSelectValues=()=>{
      layerSelects.forEach(select=>{
        const target=select.dataset?.target;
        if(target)select.value=cfg?.colors?.[target]||'';
        applyLayerSelectStyles(select,findColorLayer(select.value));
      });
    };
    const updateColorSummary=()=>{
      if(!els.mColorSummary)return;
      const moduleLayer=findColorLayer(cfg?.colors?.module);
      const headerLayer=findColorLayer(cfg?.colors?.header);
      const buttonsLayer=findColorLayer(cfg?.colors?.buttons);
      const moduleName=moduleLayer?.name||'Standard';
      const headerName=headerLayer?.name||moduleName;
      const buttonsName=buttonsLayer?.name||headerName;
      els.mColorSummary.textContent=`Hauptmodul: ${moduleName} · Header: ${headerName} · Buttons: ${buttonsName}`;
    };
    const applyColorTheme=()=>{
      if(!cfg?.colors)return;
      const palette=computeModulePalette(colorLayers,cfg.colors,baselineColors);
      applyPaletteToElement(moduleHost,palette);
      if(els.mColorPreview)applyPaletteToElement(els.mColorPreview,palette);
      updateColorSummary();
    };
    const refreshColorLayers=({repopulate=true,applyTheme=true}={})=>{
      const before=cfg?JSON.stringify(cfg.colors||{}):'';
      colorLayers=loadGlobalColorLayers();
      fallbackColorLayerId=colorLayers[0]?.id||fallbackColorLayerId||'default';
      if(cfg){
        const storedColors=readModuleColorSettings(instanceId);
        if(storedColors){
          cfg.colors=sanitizeColorSelection(storedColors);
        }else{
          cfg.colors=sanitizeColorSelection(cfg.colors);
        }
        const after=JSON.stringify(cfg.colors||{});
        if(after!==before){
          persistModuleColorSelection(cfg.colors);
          saveCfg(cfg);
        }
      }
      if(repopulate)renderColorSelectOptions();
      updateColorSelectValues();
      if(applyTheme)applyColorTheme();
    };
    let debugInfo='';
    let deviceName='';
    const instanceId=instanceIdOf(root);
    const ruleIdbKey=`recordSheetRules:${instanceId}`;
    const aspenIdbKey=`recordSheetAspen:${instanceId}`;

    function cloneFields(list){const normalized=normalizeFields(Array.isArray(list)?list.map(f=>({...f})) : []);return normalized.length?normalized:defaultFields.map(f=>({...f}));}
    function loadCfg(){
      const doc=loadDoc();
      const general=doc?.general||{};
      const raw=doc?.instances?.[instanceId]?.recordSheet||{};
      const fields=cloneFields(Array.isArray(raw.fields)?raw.fields:defaultFields);
      return{
        ruleIdbKey:raw.ruleIdbKey||ruleIdbKey,
        ruleFileName:raw.ruleFileName||general.nameFileName||'',
        aspenIdbKey:raw.aspenIdbKey||aspenIdbKey,
        aspenFileName:raw.aspenFileName||'',
        fields,
        columns:raw.columns||defaultColumns,
        colors:sanitizeColorSelection(raw.colors),
        customButtons:normalizeCustomButtons(raw.customButtons)
      };
    }
    function serializeFields(fields){return fields.map(f=>({id:f.id,key:f.key,label:f.label,enabled:!!f.enabled,group:f.group||'extra',originalKey:f.originalKey||f.key||f.id}));}
    function saveCfg(current){const doc=loadDoc();doc.instances=doc.instances||{};doc.instances[instanceId]=doc.instances[instanceId]||{};doc.instances[instanceId].recordSheet={ruleIdbKey:current.ruleIdbKey,ruleFileName:current.ruleFileName,aspenIdbKey:current.aspenIdbKey,aspenFileName:current.aspenFileName,fields:serializeFields(current.fields),columns:current.columns,colors:sanitizeColorSelection(current.colors),customButtons:serializeCustomButtons(current.customButtons)};saveDoc(doc);}
    function removeCfg(){const doc=loadDoc();if(doc?.instances?.[instanceId]){delete doc.instances[instanceId].recordSheet;if(!Object.keys(doc.instances[instanceId]).length)delete doc.instances[instanceId];saveDoc(doc);}}

    const setNote=s=>els.note.textContent=s||'';
    function renderHead(){
      if(debugInfo){
        els.head.style.display='block';
        els.head.textContent=`⚠️ ${debugInfo}`;
        return;
      }
      if(deviceName){
        els.head.style.display='block';
        els.head.textContent=deviceName;
        return;
      }
      els.head.style.display='none';
      els.head.textContent='';
    }
    const setDebugInfo=message=>{debugInfo=String(message||'').trim();renderHead();};
    const clearDebugInfo=()=>{debugInfo='';renderHead();};

    cfg=loadCfg();
    const storedModuleColors=readModuleColorSettings(instanceId);
    if(storedModuleColors){
      const sanitizedStored=sanitizeColorSelection(storedModuleColors);
      if(JSON.stringify(cfg.colors)!==JSON.stringify(sanitizedStored)){
        cfg.colors=sanitizedStored;
        saveCfg(cfg);
      }else{
        cfg.colors=sanitizedStored;
      }
    }else{
      persistModuleColorSelection(cfg.colors);
    }
    renderColorSelectOptions();
    updateColorSelectValues();
    applyColorTheme();
    let aspenHandle=null;
    els.mRuleFile.textContent=cfg.ruleFileName?`• ${cfg.ruleFileName}`:'Keine Namensregeln';
    updateAspenDisplays();
    els.head.style.display='none';
    renderCustomButtons();
    let aspenHeaders=[];
    let aspenHeaderKeyMap=new Map();
    let aspenHeaderOriginalMap=new Map();
    let aspenData=[];
    let ruleHandle=null;
    let history=[];
    let future=[];
    let rules=[];
    let activeNewFieldEditor=null;
    let listSortable=null;
    [
      {el:els.mColorModule,key:'module'},
      {el:els.mColorHeader,key:'header'},
      {el:els.mColorButtons,key:'buttons'}
    ].forEach(({el,key})=>{
      if(!el)return;
      el.addEventListener('change',()=>{
        const next={...cfg.colors,[key]:el.value};
        cfg.colors=sanitizeColorSelection(next);
        persistModuleColorSelection(cfg.colors);
        updateColorSelectValues();
        applyColorTheme();
        saveCfg(cfg);
      });
    });
    if(els.mColorReload){
      els.mColorReload.addEventListener('click',()=>{
        refreshColorLayers();
      });
    }

    function rebuildAspenHeaderMaps(){aspenHeaderKeyMap=new Map();aspenHeaderOriginalMap=new Map();aspenHeaders.forEach(h=>{const originalLower=(h.original||'').toLowerCase();const keyLower=(h.key||'').toLowerCase();if(originalLower&&!aspenHeaderOriginalMap.has(originalLower)){aspenHeaderOriginalMap.set(originalLower,h);}if(keyLower&&!aspenHeaderKeyMap.has(keyLower)){aspenHeaderKeyMap.set(keyLower,h);}});}

    function resolveAspenColumn(field){if(!field)return'';const candidates=candidateValuesForField(field);for(const candidate of candidates){const lower=candidate.toLowerCase();const byOriginal=aspenHeaderOriginalMap.get(lower);if(byOriginal)return byOriginal.original;const byKey=aspenHeaderKeyMap.get(lower);if(byKey)return byKey.original;}return'';}

    function getAspenColumnValue(row,column){if(!row)return'';const col=String(column||'').trim();if(!col)return'';if(Object.prototype.hasOwnProperty.call(row,col))return String(row[col]??'');const lower=col.toLowerCase();if(row.__lower&&Object.prototype.hasOwnProperty.call(row.__lower,lower))return String(row.__lower[lower]??'');const header=aspenHeaderOriginalMap.get(lower)||aspenHeaderKeyMap.get(lower);if(header&&header.original&&header.original!==col)return getAspenColumnValue(row,header.original);return'';}

    function getAspenValue(row,field){if(!row||!field)return'';const column=resolveAspenColumn(field);if(!column)return'';if(Object.prototype.hasOwnProperty.call(row,column))return String(row[column]||'');const lower=column.toLowerCase();if(row.__lower&&Object.prototype.hasOwnProperty.call(row.__lower,lower))return String(row.__lower[lower]||'');return'';}

    function findAspenRow(meldung){const column=ASPEN_MELDUNGS_COLUMN;const target=String(meldung||'').trim().toLowerCase();if(!target)return null;const lowerKey=column.toLowerCase();return aspenData.find(row=>{const raw=row[column];if(typeof raw==='string'||typeof raw==='number'){if(String(raw||'').trim().toLowerCase()===target)return true;}const alt=row.__lower?.[lowerKey];return typeof alt==='string'||typeof alt==='number'?String(alt||'').trim().toLowerCase()===target:false;})||null;}

    function alignFieldSources(){if(!aspenHeaders.length)return;const byOriginal=new Map();const byKey=new Map();aspenHeaders.forEach(h=>{const originalLower=(h.original||'').toLowerCase();if(originalLower&&!byOriginal.has(originalLower))byOriginal.set(originalLower,h);if(h.key&&!byKey.has(h.key))byKey.set(h.key,h);});let changed=false;cfg.fields.forEach(field=>{const existing=String(field.originalKey||'').trim();if(existing&&byOriginal.has(existing.toLowerCase()))return;const candidates=candidateValuesForField(field,{includeOriginal:false});for(const cand of candidates){const lower=cand.toLowerCase();const match=byOriginal.get(lower)||byKey.get(lower);if(match){if(field.originalKey!==match.original){field.originalKey=match.original;changed=true;}break;}}});if(changed)saveCfg(cfg);}

    const isModalOpen=()=>els.modal.style.display==='grid';
    function snapshotFields(){return cfg.fields.map(f=>({...f}));}
    function syncAfterFieldChange(){saveCfg(cfg);renderFields();if(isModalOpen())renderFieldList();updateAspenFieldList();updateUndoRedoButtons();refreshFromAspen();}
    function setFields(newFields,{recordHistory=true}={}){const normalized=normalizeFields(Array.isArray(newFields)?newFields:[]);if(fieldsEqual(normalized,cfg.fields)){updateUndoRedoButtons();return false;}if(recordHistory){history.push(snapshotFields());if(history.length>MAX_HISTORY)history.shift();future=[];}cfg.fields=normalized;syncAfterFieldChange();return true;}
    function mutateFields(mutator,{recordHistory=true}={}){const draft=snapshotFields();const result=mutator(draft);const next=Array.isArray(result)?result:draft;return setFields(next,{recordHistory});}
    function undo(){if(!history.length)return;const prev=history.pop();future.push(snapshotFields());cfg.fields=normalizeFields(prev);syncAfterFieldChange();}
    function redo(){if(!future.length)return;history.push(snapshotFields());const next=future.pop();cfg.fields=normalizeFields(next);syncAfterFieldChange();}
    function updateUndoRedoButtons(){if(els.mUndo)els.mUndo.disabled=!history.length;if(els.mRedo)els.mRedo.disabled=!future.length;}
    function updateAspenDisplays(){
      const hasHandle=!!aspenHandle;
      const fileName=cfg.aspenFileName||aspenHandle?.name||'';
      const hasFileName=!!fileName;
      if(els.mAspenFile)els.mAspenFile.textContent=hasFileName?`• ${fileName}`:'Keine Aspen-Datei';
      if(els.aspenInlineFile)els.aspenInlineFile.textContent=hasFileName?`Aspen: ${fileName}`:'Aspen: keine Datei';
      if(els.aspenRefresh){
        const refreshLabel=hasHandle?'Aspen aktualisieren':'Keine Aspen-Datei verbunden';
        els.aspenRefresh.disabled=!hasHandle;
        els.aspenRefresh.setAttribute('aria-label',refreshLabel);
        els.aspenRefresh.title=refreshLabel;
      }
      if(els.aspenStatus){
        els.aspenStatus.classList.remove('ok','warn');
        if(hasHandle){
          els.aspenStatus.textContent='✓';
          els.aspenStatus.classList.add('ok');
          els.aspenStatus.style.display='inline-flex';
          els.aspenStatus.title='Aspen-Autoabgleich aktiv.';
          els.aspenStatus.setAttribute('aria-label','Aspen-Autoabgleich aktiv.');
        }else if(hasFileName){
          els.aspenStatus.textContent='!';
          els.aspenStatus.classList.add('warn');
          els.aspenStatus.style.display='inline-flex';
          els.aspenStatus.title='Kein Zugriff – bitte neu verbinden.';
          els.aspenStatus.setAttribute('aria-label','Kein Zugriff – bitte neu verbinden.');
        }else{
          els.aspenStatus.textContent='';
          els.aspenStatus.style.display='none';
          els.aspenStatus.removeAttribute('title');
          els.aspenStatus.removeAttribute('aria-label');
        }
      }
      if(els.aspenHint){
        const hint=!hasHandle
          ?hasFileName
            ?'Kein Zugriff – bitte neu verbinden.'
            :'Aspen-Datei auswählen, um Daten zu laden.'
          :'';
        els.aspenHint.textContent=hint;
        els.aspenHint.style.display=hint?'block':'none';
      }
      if(!hasHandle&&!hasFileName){
        setNote('');
      }
      updateCustomButtonStates();
    }
    const copy=async val=>{try{await navigator.clipboard.writeText(val||'');setNote('Kopiert.');setTimeout(()=>setNote(''),800);}catch(err){setNote('Kopieren fehlgeschlagen');setDebugInfo('Clipboard-API nicht verfügbar.');console.warn('Clipboard copy failed',err);}};

    async function refreshAspenData(){
      if(!aspenHandle){
        setNote('Keine Aspen-Datei verbunden.');
        return;
      }
      try{
        const ok=await ensureRPermission(aspenHandle);
        if(!ok){
          setNote('Berechtigung verweigert.');
          setDebugInfo('Aspen-Refresh: Berechtigung verweigert.');
          return;
        }
        const result=await readAspenFile(aspenHandle);
        aspenHeaders=result.headers||[];
        aspenData=result.rows||[];
        alignFieldSources();
        rebuildAspenHeaderMaps();
        updateAspenFieldList();
        if(isModalOpen())renderCustomButtonEditor();
        refreshFromAspen();
        clearDebugInfo();
        setNote('Aspen aktualisiert.');
      }catch(err){
        console.warn('Aspen-Refresh fehlgeschlagen:',err);
        setNote('Aspen konnte nicht aktualisiert werden.');
        setDebugInfo(`Aspen-Refresh fehlgeschlagen: ${err?.message||err}`);
      }finally{
        updateAspenDisplays();
      }
    }
    if(els.mUndo)els.mUndo.addEventListener('click',undo);
    if(els.mRedo)els.mRedo.addEventListener('click',redo);
    if(els.mNewSearch)els.mNewSearch.addEventListener('input',()=>updateAspenFieldList());
    if(els.mButtonAdd)els.mButtonAdd.addEventListener('click',()=>{const options=buildAspenColumnOptions();const primaryOption=options.find(opt=>!opt.missing)?.value||'';mutateCustomButtons(items=>{const next=[...items,{label:primaryOption||`Button ${items.length+1}`,column:primaryOption,suffix:''}];return next;});});

    async function bindAspenHandle(handle){try{const ok=await ensureRPermission(handle);if(!ok){setNote('Berechtigung verweigert.');setDebugInfo('Aspen: Berechtigung verweigert.');return false;}aspenHandle=handle;await idbSet(cfg.aspenIdbKey,handle);cfg.aspenFileName=handle.name||'Aspen.xlsx';saveCfg(cfg);updateAspenDisplays();let success=false;try{const result=await readAspenFile(handle);aspenHeaders=result.headers||[];aspenData=result.rows||[];success=true;clearDebugInfo();}catch(err){console.warn('Aspen-Datei konnte nicht gelesen werden:',err);aspenHeaders=[];aspenData=[];setNote('Aspen-Daten konnten nicht gelesen werden.');setDebugInfo(`Aspen-Leseproblem: ${err?.message||err}`);}rebuildAspenHeaderMaps();if(success){alignFieldSources();setNote('Aspen-Datei geladen.');}refreshFromAspen();updateAspenFieldList();if(isModalOpen())renderCustomButtonEditor();return true;}catch(err){console.warn('Aspen-Datei konnte nicht gebunden werden:',err);setNote('Aspen-Datei konnte nicht geladen werden.');setDebugInfo(`Aspen-Bindung fehlgeschlagen: ${err?.message||err}`);return false;}}

    let fieldEls={};
    let customButtonEls=new Map();
    function buildAspenColumnOptions(){const options=[];const seen=new Set();aspenHeaders.forEach(h=>{const original=String(h.original||'').trim();if(!original)return;const lower=original.toLowerCase();if(seen.has(lower))return;seen.add(lower);options.push({value:original,label:original,missing:false});});(cfg.customButtons||[]).forEach(btn=>{const column=String(btn.column||'').trim();if(!column)return;const lower=column.toLowerCase();if(seen.has(lower))return;seen.add(lower);options.push({value:column,label:`${column} (nicht gefunden)`,missing:true});});options.sort((a,b)=>a.label.localeCompare(b.label,'de',{sensitivity:'base'}));return options;}
    function mutateCustomButtons(mutator){const draft=(cfg.customButtons||[]).map(btn=>({...btn}));const result=mutator(draft);const next=Array.isArray(result)?result:draft;cfg.customButtons=normalizeCustomButtons(next);saveCfg(cfg);renderCustomButtons();if(isModalOpen())renderCustomButtonEditor();}
    function renderCustomButtons(){const wrap=els.customButtons;if(!wrap)return;const list=Array.isArray(cfg.customButtons)?cfg.customButtons:[];wrap.innerHTML='';customButtonEls=new Map();if(!list.length){wrap.style.display='none';return;}wrap.style.display='';list.forEach(info=>{if(!info)return;const btn=document.createElement('button');btn.type='button';btn.className='rs-custom-button';btn.textContent=info.label||DEFAULT_BUTTON_LABEL;btn.dataset.id=info.id;btn.addEventListener('click',()=>handleCustomButtonClick(info.id));wrap.appendChild(btn);customButtonEls.set(info.id,btn);});updateCustomButtonStates();}
    function updateCustomButtonStates(row){const wrap=els.customButtons;if(!wrap)return;const buttons=Array.isArray(cfg.customButtons)?cfg.customButtons:[];const map=new Map(buttons.map(btn=>[btn.id,btn]));let currentRow=row||null;if(!currentRow){const meldung=activeMeldung();if(meldung)currentRow=findAspenRow(meldung);}const hasRow=!!currentRow;customButtonEls.forEach((button,id)=>{const info=map.get(id);if(!info){button.disabled=true;button.title='';return;}const hasColumn=!!info.column;const missing=hasColumn&&!aspenHeaders.some(h=>String(h.original||'').trim().toLowerCase()===info.column.toLowerCase());button.disabled=!hasRow||!hasColumn;const suffixTip=info.suffix?` · Suffix: ${info.suffix}`:'';const baseLabel=info.column||'Kein Feld';button.title=missing?`${baseLabel} (nicht in Aspen)${suffixTip}`:`${baseLabel}${suffixTip}`;});wrap.style.display=customButtonEls.size?'':'none';}
    function handleCustomButtonClick(id){const info=(cfg.customButtons||[]).find(btn=>btn.id===id);if(!info)return;const meldung=activeMeldung();const row=meldung?findAspenRow(meldung):null;if(!row){setNote('Keine Aspen-Daten zur Meldung gefunden.');return;}if(!info.column){setNote('Kein Aspen-Feld zugewiesen.');return;}const value=getAspenColumnValue(row,info.column);const output=(value||'')+(info.suffix||'');if(!value&&!info.suffix){setNote('Kein Wert zum Kopieren.');return;}copy(output);}
    const lookupName=pn=>{for(const r of rules){if(pn.startsWith(r.prefix))return r.name;}return'';};
    function updateName(){if(!rules.length){deviceName='';renderHead();return;}const partField=cfg.fields.find(f=>f.key==='part'&&f.enabled);const pn=partField?(fieldEls[partField.id]?.input?.value||'').trim():'';const name=lookupName(pn);deviceName=name||'Unbekanntes Gerät';renderHead();}

    function applyColumns(){const cols=Math.max(1,parseInt(cfg.columns)||1);els.grid.style.gridTemplateColumns=`repeat(${cols},1fr)`;}
    function renderFields(){
      els.grid.innerHTML='';fieldEls={};
      cfg.fields.filter(f=>f.enabled).forEach(f=>{
        const wrap=document.createElement('div');
        wrap.className='rs-field';
        wrap.dataset.fieldId=f.id;
        const tooltip=tooltipForField(f);
        const labelWrap=document.createElement('div');
        labelWrap.className='rs-labelwrap';
        const labelSpan=document.createElement('span');
        labelSpan.className='rs-label';
        labelSpan.textContent=f.label;
        labelSpan.title=tooltip;
        const info=document.createElement('span');
        info.className='rs-label-info';
        info.textContent='i';
        info.title=tooltip;
        labelWrap.appendChild(labelSpan);
        labelWrap.appendChild(info);
        const inputWrap=document.createElement('div');
        inputWrap.className='rs-inputwrap';
        const input=document.createElement('input');
        input.className='rs-input';
        input.type='text';
        input.setAttribute('readonly','');
        const copyBtn=document.createElement('button');
        copyBtn.className='rs-copy';
        copyBtn.title='Kopieren';
        copyBtn.textContent='⧉';
        inputWrap.appendChild(input);
        inputWrap.appendChild(copyBtn);
        wrap.appendChild(labelWrap);
        wrap.appendChild(inputWrap);
        els.grid.appendChild(wrap);
        copyBtn.addEventListener('click',()=>copy(input.value));
        labelWrap.addEventListener('dblclick',e=>{if(e.target===info)return;startInlineLabelEdit(f.id,labelWrap,labelSpan,info);});
        fieldEls[f.id]={input,labelEl:labelSpan,infoEl:info,wrap,labelWrap};
      });
      applyColumns();
      refreshFromAspen();
    }

    function renderFieldList(){
      const list=els.mList;
      if(!list) return;
      list.innerHTML='';
      if(listSortable){try{listSortable.destroy();}catch{}listSortable=null;}
      activeNewFieldEditor=null;
      cfg.fields.forEach(f=>{
        const li=document.createElement('li');
        li.className='rs-item'+(f.enabled?'':' off');
        li.dataset.id=f.id;
        li.title=tooltipForField(f);
        const handle=document.createElement('span');
        handle.className='rs-item-handle';
        handle.textContent='☰';
        handle.title='Ziehen zum Sortieren';
        const info=document.createElement('div');
        info.className='rs-item-info';
        const nameSpan=document.createElement('span');
        nameSpan.textContent=f.label;
        const original=document.createElement('span');
        original.className='rs-item-original';
        original.textContent=f.originalKey||f.key||f.id;
        info.appendChild(nameSpan);
        info.appendChild(original);
        const input=document.createElement('input');
        input.type='text';
        input.className='rs-item-label';
        input.value=f.label;
        const actions=document.createElement('div');
        actions.className='rs-item-actions';
        const toggleLabel=document.createElement('label');
        const toggle=document.createElement('input');
        toggle.type='checkbox';
        toggle.className='rs-item-enabled';
        toggle.checked=!!f.enabled;
        toggleLabel.appendChild(toggle);
        toggleLabel.appendChild(document.createTextNode('Aktiv'));
        const removeBtn=document.createElement('button');
        removeBtn.type='button';
        removeBtn.className='rs-item-remove';
        removeBtn.textContent='✕';
        if(f.key==='meldung'){
          removeBtn.disabled=true;
          removeBtn.style.opacity='0.4';
          removeBtn.title='Dieses Feld kann nicht entfernt werden.';
        }else{
          removeBtn.title='Feld entfernen';
        }
        actions.appendChild(toggleLabel);
        actions.appendChild(removeBtn);
        li.append(handle,info,input,actions);
        list.appendChild(li);
        input.addEventListener('input',()=>{input.classList.remove('invalid');});
        const commit=()=>{const result=applyLabelChange(f.id,input.value);if(result.error){input.classList.add('invalid');setNote(result.error);input.focus();input.select();return;}input.classList.remove('invalid');if(!result.changed){input.value=f.label;}};
        input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit();}else if(e.key==='Escape'){e.preventDefault();input.value=f.label;input.classList.remove('invalid');setNote('');}});
        input.addEventListener('blur',commit);
        toggle.addEventListener('change',()=>{const desired=toggle.checked;mutateFields(fields=>{const target=fields.find(x=>x.id===f.id);if(target)target.enabled=desired;return fields;});});
        removeBtn.addEventListener('click',()=>{if(removeBtn.disabled)return;mutateFields(fields=>fields.filter(x=>x.id!==f.id));});
      });
      if(typeof window.Sortable==='function'){
        listSortable=new window.Sortable(list,{animation:150,handle:'.rs-item-handle',onEnd:()=>{const order=Array.from(list.children).map(li=>li.dataset.id);mutateFields(fields=>{const map=new Map(fields.map(f=>[f.id,f]));const next=[];order.forEach(id=>{const item=map.get(id);if(item)next.push(item);});fields.forEach(field=>{if(!order.includes(field.id))next.push(field);});return next;});}});
      }else{
        console.warn('SortableJS nicht verfügbar – Sortieren im Gerätedaten-Modul deaktiviert.');
      }
      updateUndoRedoButtons();
    }

    function renderCustomButtonEditor(){const list=els.mButtonList;if(!list)return;list.innerHTML='';const empty=els.mButtonEmpty;const buttons=Array.isArray(cfg.customButtons)?cfg.customButtons:[];const options=buildAspenColumnOptions();const hasOptions=options.some(opt=>!opt.missing);if(!buttons.length){if(empty){empty.textContent=hasOptions?'Noch keine Buttons angelegt.':'Keine Aspen-Daten verfügbar.';empty.style.display='block';}return;}if(empty)empty.style.display='none';buttons.forEach(button=>{const row=document.createElement('div');row.className='rs-button-item';const labelField=document.createElement('div');labelField.className='rs-button-field';const labelLabel=document.createElement('label');labelLabel.textContent='Beschriftung';const labelInput=document.createElement('input');labelInput.type='text';labelInput.value=button.label||'';labelField.append(labelLabel,labelInput);const selectField=document.createElement('div');selectField.className='rs-button-field';const selectLabel=document.createElement('label');selectLabel.textContent='Aspen-Feld';const select=document.createElement('select');const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='– Feld wählen –';select.appendChild(placeholder);options.forEach(opt=>{const option=document.createElement('option');option.value=opt.value;option.textContent=opt.label;select.appendChild(option);});select.value=button.column||'';const updateSelectState=value=>{select.classList.toggle('rs-button-select-missing',!!value&&!options.some(opt=>!opt.missing&&opt.value===value));};updateSelectState(select.value);selectField.append(selectLabel,select);const suffixField=document.createElement('div');suffixField.className='rs-button-field';const suffixLabel=document.createElement('label');suffixLabel.textContent='Suffix';const suffixInput=document.createElement('input');suffixInput.type='text';suffixInput.value=button.suffix||'';suffixField.append(suffixLabel,suffixInput);const removeBtn=document.createElement('button');removeBtn.type='button';removeBtn.className='rs-button-remove';removeBtn.title='Button entfernen';removeBtn.textContent='✕';row.append(labelField,selectField,suffixField,removeBtn);list.appendChild(row);labelInput.addEventListener('blur',()=>{const value=labelInput.value.trim();mutateCustomButtons(items=>{const next=items.map(item=>item.id===button.id?{...item,label:value||DEFAULT_BUTTON_LABEL}:item);return next;});});select.addEventListener('change',()=>{const value=select.value;updateSelectState(value);mutateCustomButtons(items=>{const next=items.map(item=>item.id===button.id?{...item,column:value}:item);return next;});});suffixInput.addEventListener('blur',()=>{const value=suffixInput.value;mutateCustomButtons(items=>{const next=items.map(item=>item.id===button.id?{...item,suffix:value}:item);return next;});});removeBtn.addEventListener('click',()=>{mutateCustomButtons(items=>items.filter(item=>item.id!==button.id));});});}

    function applyLabelChange(fieldId,value,options){
      const trimmed=String(value||'').trim();
      const error=validateLabel(trimmed);
      if(error){return{changed:false,error};}
      const current=cfg.fields.find(f=>f.id===fieldId);
      if(!current){return{changed:false};}
      if(current.label===trimmed){setNote('');return{changed:false};}
      const changed=mutateFields(fields=>{const target=fields.find(x=>x.id===fieldId);if(target)target.label=trimmed;return fields;},options);
      if(changed){setNote('Label aktualisiert.');return{changed:true};}
      return{changed:false};
    }
    function startInlineLabelEdit(fieldId,labelWrap,labelSpan,infoEl){
      const field=cfg.fields.find(f=>f.id===fieldId);
      if(!field||!labelWrap||labelWrap.querySelector('input'))return;
      const input=document.createElement('input');
      input.type='text';
      input.className='rs-inline-input';
      input.value=field.label;
      labelWrap.replaceChild(input,labelSpan);
      input.focus();input.select();
      input.addEventListener('input',()=>input.classList.remove('invalid'));
      const commit=()=>{const result=applyLabelChange(fieldId,input.value);if(result.error){input.classList.add('invalid');setNote(result.error);input.focus();input.select();return;}input.classList.remove('invalid');if(result.changed){return;}if(!labelWrap.isConnected)return;labelWrap.replaceChild(labelSpan,input);labelSpan.textContent=field.label;const tip=tooltipForField(field);labelSpan.title=tip;if(infoEl)infoEl.title=tip;};
      const cancel=()=>{setNote('');if(!labelWrap.isConnected)return;labelWrap.replaceChild(labelSpan,input);labelSpan.textContent=field.label;const tip=tooltipForField(field);labelSpan.title=tip;if(infoEl)infoEl.title=tip;};
      input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit();}else if(e.key==='Escape'){e.preventDefault();cancel();}});
      input.addEventListener('blur',commit);
    }

    function updateAspenFieldList(){const list=els.mNewList;if(!list)return;list.innerHTML='';activeNewFieldEditor=null;const empty=els.mNewEmpty;if(!aspenHeaders.length){if(empty){empty.textContent=aspenHandle?'Keine zusätzlichen Felder verfügbar.':'Aspen-Datei wählen, um verfügbare Felder zu laden.';empty.style.display='block';}return;}const term=(els.mNewSearch?.value||'').trim().toLowerCase();const matches=aspenHeaders.filter(h=>!term||h.original.toLowerCase().includes(term)||h.key.includes(term));if(!matches.length){if(empty){empty.textContent='Keine Treffer.';empty.style.display='block';}return;}if(empty)empty.style.display='none';matches.forEach(info=>{const li=document.createElement('li');li.className='rs-new-item';li.dataset.key=info.key;const infoWrap=document.createElement('div');infoWrap.className='rs-new-info';const keyLabel=document.createElement('div');keyLabel.className='rs-new-key';keyLabel.textContent=info.original||info.key;const original=document.createElement('div');original.className='rs-new-original';original.textContent=info.key;infoWrap.appendChild(keyLabel);infoWrap.appendChild(original);const addBtn=document.createElement('button');addBtn.type='button';addBtn.className='rs-new-add';const count=cfg.fields.filter(f=>f.key===info.key).length;if(count){addBtn.classList.add('secondary');addBtn.textContent='Nochmal hinzufügen';}else{addBtn.textContent='Hinzufügen';}addBtn.addEventListener('click',()=>startAspenFieldEditor(info,li));li.append(infoWrap,addBtn);list.appendChild(li);});}
    function startAspenFieldEditor(info,li){if(activeNewFieldEditor&&activeNewFieldEditor!==li){activeNewFieldEditor.querySelector('.rs-new-inline')?.remove();}if(li.querySelector('.rs-new-inline'))return;activeNewFieldEditor=li;const inline=document.createElement('div');inline.className='rs-new-inline';const input=document.createElement('input');input.type='text';input.value=defaultLabelForKey(info.original||info.key);const confirm=document.createElement('button');confirm.type='button';confirm.textContent='Hinzufügen';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Abbrechen';inline.append(input,confirm,cancel);li.appendChild(inline);input.focus();input.select();input.addEventListener('input',()=>input.classList.remove('invalid'));const close=()=>{inline.remove();if(activeNewFieldEditor===li)activeNewFieldEditor=null;};const submit=()=>{const ok=addAspenField(info,input.value);if(ok)close();else input.classList.add('invalid');};confirm.addEventListener('click',submit);cancel.addEventListener('click',()=>{close();setNote('');});input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit();}else if(e.key==='Escape'){e.preventDefault();close();setNote('');}});}
    function addAspenField(info,label){const trimmed=String(label||'').trim();const error=validateLabel(trimmed);if(error){setNote(error);return false;}const used=new Set(cfg.fields.map(f=>f.id));const id=generateFieldId(info.key,trimmed,used);const changed=mutateFields(fields=>{fields.push({id,key:info.key,label:trimmed,enabled:true,group:'aspen',originalKey:info.original||info.key});return fields;});if(changed){setNote('Feld hinzugefügt.');return true;}setNote('');return false;}

    function openModal(){refreshColorLayers();renderFieldList();renderCustomButtonEditor();els.mCols.value=cfg.columns;updateAspenFieldList();updateUndoRedoButtons();els.modal.style.display='grid';moduleHost?.classList.add('rs-module-blur');}
    function closeModal(){els.modal.style.display='none';moduleHost?.classList.remove('rs-module-blur');saveCfg(cfg);renderFields();}
    els.mClose.onclick=closeModal;
    els.mCols.addEventListener('change',()=>{cfg.columns=Math.max(1,parseInt(els.mCols.value)||1);applyColumns();saveCfg(cfg);});

    root.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();openModal();});

    async function bindRuleHandle(h){const ok=await ensureRPermission(h);if(!ok){setNote('Berechtigung verweigert.');return false;}ruleHandle=h;await idbSet(cfg.ruleIdbKey,h);cfg.ruleFileName=h.name||'Rules.xlsx';saveCfg(cfg);els.mRuleFile.textContent=`• ${cfg.ruleFileName}`;saveGlobalRules(h,cfg.ruleFileName);try{rules=await readRulesFromHandle(h);}catch{rules=[];}updateName();return true;}
    els.mRulePick.onclick=async()=>{try{const [h]=await showOpenFilePicker({types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],excludeAcceptAllOption:false,multiple:false});if(h)await bindRuleHandle(h);}catch(e){if(e?.name!=='AbortError')setNote('Auswahl fehlgeschlagen.');}};

    (async()=>{try{let h=await idbGet(cfg.ruleIdbKey);if(!h){h=await idbGet(GLOBAL_NAME_KEY);if(h){await idbSet(cfg.ruleIdbKey,h);if(!cfg.ruleFileName){const g=loadDoc().general||{};cfg.ruleFileName=g.nameFileName||h.name||'Rules.xlsx';saveCfg(cfg);els.mRuleFile.textContent=`• ${cfg.ruleFileName}`;}}}if(h&&await ensureRPermission(h)){ruleHandle=h;rules=await readRulesFromHandle(h);els.mRuleFile.textContent=`• ${cfg.ruleFileName||h.name||'Rules.xlsx'}`;updateName();}}catch(e){}})();

    function activeMeldung(){return(loadDoc()?.general?.Meldung||'').trim();}
    function refreshFromAspen(){const m=activeMeldung();const row=m?findAspenRow(m):null;cfg.fields.forEach(f=>{const el=fieldEls[f.id];if(!el)return;if(f.key==='meldung'){el.input.value=m;}else{el.input.value=row?getAspenValue(row,f):'';}const tip=tooltipForField(f);if(el.labelEl){el.labelEl.textContent=f.label;el.labelEl.title=tip;}if(el.infoEl)el.infoEl.title=tip;});updateName();updateCustomButtonStates(row);}

    addEventListener('storage',e=>{if(e.key===LS_DOC)refreshFromAspen();if(e.key==='appSettings')refreshColorLayers();});
    addEventListener('visibilitychange',()=>{if(!document.hidden)refreshFromAspen();});
    let lastDocString=getDocString();
    const watcher=setInterval(()=>{const now=getDocString();if(now!==lastDocString){lastDocString=now;refreshFromAspen();}},WATCH_INTERVAL);

    const openAspenPicker=async()=>{
      const picker=typeof window.showOpenFilePicker==='function'
        ? window.showOpenFilePicker.bind(window)
        : null;
      if(!picker){
        openModal();
        setNote('Dateiauswahl wird nicht unterstützt. Bitte über die Optionen öffnen.');
        setDebugInfo('File-Picker fehlt – Optionen geöffnet.');
        return;
      }
      try{
        const [handle]=await picker({types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}],excludeAcceptAllOption:false,multiple:false});
        if(handle){await bindAspenHandle(handle);}
      }catch(e){
        if(e?.name!=='AbortError'){setNote('Auswahl fehlgeschlagen.');setDebugInfo(`File-Picker Fehler: ${e?.message||e}`);}
      }
    };
    if(els.mAspenPick)els.mAspenPick.addEventListener('click',openAspenPicker);
    if(els.aspenRefresh)els.aspenRefresh.addEventListener('click',refreshAspenData);
    updateAspenFieldList();
    (async()=>{try{const stored=await idbGet(cfg.aspenIdbKey);if(stored&&await ensureRPermission(stored)){aspenHandle=stored;if(!cfg.aspenFileName){cfg.aspenFileName=stored.name||'Aspen.xlsx';saveCfg(cfg);}updateAspenDisplays();try{const result=await readAspenFile(stored);aspenHeaders=result.headers||[];aspenData=result.rows||[];alignFieldSources();clearDebugInfo();}catch(err){console.warn('Aspen-Daten konnten nicht gelesen werden:',err);aspenHeaders=[];aspenData=[];setDebugInfo(`Aspen-Init fehlgeschlagen: ${err?.message||err}`);}}}catch(err){console.warn('Lesen der Aspen-Datei fehlgeschlagen:',err);setDebugInfo(`Aspen-Zugriff fehlgeschlagen: ${err?.message||err}`);}finally{rebuildAspenHeaderMaps();updateAspenFieldList();if(isModalOpen())renderCustomButtonEditor();refreshFromAspen();}})();


    renderFields();
    updateUndoRedoButtons();

    const mo=new MutationObserver(()=>{if(!document.body.contains(root)){clearInterval(watcher);(async()=>{try{await idbDel(cfg.ruleIdbKey);}catch{}try{await idbDel(cfg.aspenIdbKey);}catch{}try{removeCfg();}catch{}})();mo.disconnect();}});
    mo.observe(document.body,{childList:true,subtree:true});
  };
})();
