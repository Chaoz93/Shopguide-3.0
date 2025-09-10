/* Shared & Local Text module with filesystem persistence (module_data.json) */
(function () {
  const DATA_FILE = 'module_data.json';
  const LS_KEY = 'module_data_json_v1';

  // ---------- tiny utility ----------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const nowIso = () => new Date().toISOString();
  const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('module-data') : null;
  function fireLocalEvent(detail){ window.dispatchEvent(new CustomEvent('module-data-change', { detail })); }

  function getInstanceIdFrom(root){
    return root.closest('.grid-stack-item')?.dataset?.instanceId || ('inst-' + Math.random().toString(36).slice(2));
  }

  function moduleKeyFrom(ctx){
    return (ctx?.moduleJson?.settings?.moduleKey) || ctx?.subdir || (ctx?.moduleJson?.name || 'module');
  }

  // ---------- persistence layer ----------
  async function readData() {
    // FS API first
    if (window.showDirectoryPicker && window.rootDirHandle) {
      try {
        const fh = await window.rootDirHandle.getFileHandle(DATA_FILE, { create: false });
        const text = await (await fh.getFile()).text();
        return safeParse(text);
      } catch {
        // create initial structure on first write
      }
    }
    // fallback
    return safeParse(localStorage.getItem(LS_KEY)) || baseDoc();
  }

  async function writeData(doc) {
    doc.__meta = { version: 1, updatedAt: nowIso() };

    if (window.showDirectoryPicker && window.rootDirHandle) {
      // serialize + write atomically
      const fh = await window.rootDirHandle.getFileHandle(DATA_FILE, { create: true });
      const wr = await fh.createWritable();
      await wr.write(JSON.stringify(doc, null, 2));
      await wr.close();
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(doc));
    }
  }

  function baseDoc(){
    return { __meta: { version: 1, updatedAt: nowIso() }, general: {}, instances: {} };
  }

  function safeParse(str){
    try { return JSON.parse(str); } catch { return null; }
  }

  // debounced saver to avoid excessive writes when typing
  function makeDebouncedSaver(delay, fn){
    let t = null, lastArgs = null;
    return (...args) => { lastArgs = args; clearTimeout(t); t = setTimeout(()=>fn(...lastArgs), delay); };
  }

  // ---------- UI ----------
  function renderShell(root, title){
    root.innerHTML = `
      <div class="space-y-2">
        <div class="text-white/90 font-semibold">${title}</div>
        <label class="block text-sm">
          <span class="opacity-90">Shared value (updates all instances)</span>
          <input class="sl-shared w-full text-black p-1 rounded" placeholder="Shared…" />
        </label>
        <label class="block text-sm">
          <span class="opacity-90">Only this module instance</span>
          <input class="sl-local w-full text-black p-1 rounded" placeholder="Local…" />
        </label>
        <div class="text-xs opacity-80 sl-status"></div>
      </div>
    `;
    return {
      shared: root.querySelector('.sl-shared'),
      local:  root.querySelector('.sl-local'),
      status: root.querySelector('.sl-status')
    };
  }

  // ---------- public render ----------
  window.renderSharedLocal = function renderSharedLocal(root, ctx){
    const instanceId = getInstanceIdFrom(root);
    const mkey = moduleKeyFrom(ctx);
    const title = (ctx?.moduleJson?.settings?.title) || (ctx?.moduleJson?.name) || 'Shared & Local Text';
    const els = renderShell(root, title);

    let doc = null;
    let isApplyingRemote = false; // prevent feedback loops when updating from broadcast

    const saveDebounced = makeDebouncedSaver(200, async () => {
      try { await writeData(doc); setStatus('Saved.'); } catch(e){ setStatus('Save failed.'); console.warn(e); }
    });

    function setStatus(msg){ if (els.status) els.status.textContent = msg || ''; }

    function ensurePaths(){
      doc.general ||= {};
      doc.general[mkey] ||= {};
      doc.instances ||= {};
      doc.instances[instanceId] ||= { module: mkey, data: {} };
    }

    function applyToInputs(){
      const g = doc.general[mkey] || {};
      const inst = doc.instances[instanceId]?.data || {};
      if (els.shared) els.shared.value = g.sharedText || '';
      if (els.local)  els.local.value  = inst.localText || '';
    }

    async function load(){
      setStatus('Loading…');
      doc = await readData() || baseDoc();
      ensurePaths();
      applyToInputs();
      setStatus('');
    }

    function onSharedInput(){
      if (!doc) return;
      ensurePaths();
      doc.general[mkey].sharedText = els.shared.value;
      saveDebounced();
      // notify other instances in this session
      const payload = { scope:'general', moduleKey:mkey, key:'sharedText', value: els.shared.value };
      bc ? bc.postMessage(payload) : fireLocalEvent(payload);
    }

    function onLocalInput(){
      if (!doc) return;
      ensurePaths();
      doc.instances[instanceId].data.localText = els.local.value;
      saveDebounced();
    }

    // live updates from other instances
    function handleExternal(msg){
      const data = msg?.data || msg?.detail || msg; // BroadcastChannel or CustomEvent
      if (!data || data.scope!=='general' || data.moduleKey!==mkey) return;
      try {
        isApplyingRemote = true;
        if (els.shared && els.shared.value !== String(data.value ?? '')) {
          els.shared.value = String(data.value ?? '');
        }
      } finally { isApplyingRemote = false; }
    }

    // wire events
    els.shared.addEventListener('input', () => { if (!isApplyingRemote) onSharedInput(); });
    els.local.addEventListener('input', onLocalInput);

    if (bc) bc.addEventListener('message', handleExternal);
    window.addEventListener('module-data-change', handleExternal);

    // initial load (async)
    load();
  };
})();
