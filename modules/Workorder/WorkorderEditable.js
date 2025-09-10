window.renderWorkorderEditable = function(targetDiv, opts) {
  // ---- Konfiguration ----
  const IDB_DB = 'mw-db';
  const IDB_STORE = 'kv';
  const IDB_KEY = 'aspenCSV';       // CSV Handle
  const IDB_LOOKUP_KEY = 'workorderLookupKey';
  const IDB_FIELDS_KEY = 'workorderFields';
  const POLL_MS = 5000;

  // ---- Felder ----
  const fields = [
    { key: "workorder",   label: "Workorder",    value: "" },
    { key: "notification",label: "Notification", value: "" },
    { key: "pn",          label: "P/N",          value: "" },
    { key: "sn",          label: "S/N",          value: "" },
    { key: "uc",          label: "UC",           value: "" },
    { key: "repairorder", label: "Repair order", value: "" },
    { key: "comments",    label: "Comments",     value: "", editable: true },
    { key: "reason",      label: "Reason for Removal", value: "", editable: true }
  ];

  let csvRows = [];
  let aspenHandle = null;
  let lastModifiedStamp = 0;
  let pollTimer = null;
  let lookupKey = "";

  // ---------- IndexedDB Mini-Helpers ----------
  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_DB, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }
  async function idbGet(key) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbSet(key, val) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Persistenz ---
  async function saveLookupKey() {
    await idbSet(IDB_LOOKUP_KEY, lookupKey);
  }
  async function loadLookupKey() {
    const val = await idbGet(IDB_LOOKUP_KEY);
    if (val) lookupKey = val;
  }

  async function saveEditableFields() {
    const data = {};
    ["comments","reason"].forEach(k=>{
      const f = fields.find(f=>f.key===k);
      data[k] = f.value;
    });
    await idbSet(IDB_FIELDS_KEY, data);
  }
  async function loadEditableFields() {
    const data = await idbGet(IDB_FIELDS_KEY);
    if (data) {
      Object.keys(data).forEach(k=>{
        const f = fields.find(f=>f.key===k);
        if (f) f.value = data[k];
      });
    }
  }

  // ---------- FS Access ----------
  async function verifyPermission(fileHandle, readWrite = false) {
    const opts = { mode: readWrite ? 'readwrite' : 'read' };
    if (await fileHandle.queryPermission(opts) === 'granted') return true;
    if (await fileHandle.requestPermission(opts) === 'granted') return true;
    return false;
  }

  // ---------- CSV Laden & Parsen ----------
  function parseCSV(text) {
    const delim = text.includes(";") ? ";" : (text.includes("\t") ? "\t" : ",");
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const header = lines[0].split(delim).map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const cells = line.split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
      const obj = {}; header.forEach((h,i)=>obj[h]=cells[i]||"");
      return obj;
    });
  }

  async function readCSVFromHandle() {
    if (!aspenHandle) return;
    try {
      const f = await aspenHandle.getFile();
      if (f.lastModified === lastModifiedStamp && csvRows.length) return;
      lastModifiedStamp = f.lastModified;
      const text = await f.text();
      csvRows = parseCSV(text);
      tryMatch();
    } catch (e) {
      console.warn('Lesen der Aspen-CSV fehlgeschlagen:', e);
    }
  }

  function getValue(row, name) {
    name = name.toLowerCase().trim();
    for (let k in row) {
      if (k && k.toLowerCase().trim() === name) return row[k] || "";
    }
    return "";
  }

  function tryMatch() {
    if (!csvRows.length || !lookupKey) return;

    let row;
    if (lookupKey.length > 8) { // Workorder
      row = csvRows.find(r => String(getValue(r,"AUFTRAGS_NO"))===lookupKey);
    } else { // Notification
      row = csvRows.find(r => String(getValue(r,"MELDUNGS_NO"))===lookupKey);
    }
    if (!row) return;

    fields.find(f=>f.key==="workorder").value    = getValue(row,"AUFTRAGS_NO");
    fields.find(f=>f.key==="notification").value = getValue(row,"MELDUNGS_NO");
    let pnRaw = getValue(row,"PART_NO");
    fields.find(f=>f.key==="pn").value           = pnRaw.split(":")[0] || "";
    fields.find(f=>f.key==="sn").value           = getValue(row,"SERIAL_NO");
    fields.find(f=>f.key==="uc").value           = getValue(row,"UC") || "UC01";
    fields.find(f=>f.key==="repairorder").value  = getValue(row,"REPAIR_ORDER") || "";

    render();
  }

  // ---------- Bootstrap ----------
  async function bootstrapAspen() {
    try { aspenHandle = await idbGet(IDB_KEY); } catch {}
    if (!aspenHandle || !aspenHandle.kind) {
      try {
        const [fh] = await window.showOpenFilePicker({
          types: [{ description: 'Aspen CSV', accept: { 'text/csv': ['.csv', '.txt'] } }],
          excludeAcceptAllOption: true
        });
        aspenHandle = fh;
        await idbSet(IDB_KEY, aspenHandle);
      } catch (e) {
        console.warn('Keine Datei gewählt:', e);
        showBindHint();
        return;
      }
    }
    const ok = await verifyPermission(aspenHandle, false);
    if (!ok) { showBindHint('Keine Leseberechtigung für die Datei.'); return; }

    await loadLookupKey();
    await loadEditableFields();

    await readCSVFromHandle();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(readCSVFromHandle, POLL_MS);
  }

  // ---------- UI ----------
  function render() {
    targetDiv.innerHTML = `
      <div class="p-2">
        <input id="scan-input" type="text" placeholder="Workorder oder Notification scannen..."
               class="w-full mb-2 p-1 rounded bg-gray-100 text-black"/>
        ${fields.map(f => `
          <div class="mb-1">
            <label class="font-semibold text-sm">${f.label}:</label>
            <div class="flex gap-1">
              <div class="flex-1 px-2 py-1 rounded ${f.editable ? 'bg-gray-700 cursor-pointer' : 'bg-gray-800'} text-white text-sm"
                   ${f.editable ? `contenteditable="true" data-key="${f.key}"` : ""}>
                   ${f.value || ""}
              </div>
              ${(f.key==="workorder" || f.key==="notification") && f.value ? 
                `<button class="copy-btn bg-gray-600 hover:bg-gray-500 text-white px-2 rounded text-xs" data-val="${f.value}">📋</button>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `;

    const input = targetDiv.querySelector("#scan-input");
    if (input) {
      input.focus();
      input.onkeydown = async (e)=>{
        if (e.key==="Enter") {
          e.preventDefault();
          const newVal = input.value.trim();
          if (newVal) {
            if (lookupKey && (fields.find(f=>f.key==="comments").value || fields.find(f=>f.key==="reason").value)) {
              if (!confirm("Vorhandene Comments/Reason werden gelöscht. Fortfahren?")) return;
              fields.find(f=>f.key==="comments").value = "";
              fields.find(f=>f.key==="reason").value = "";
              await saveEditableFields();
            }
            lookupKey = newVal;
            await saveLookupKey();
            tryMatch();
            input.value = "";
            input.focus();
          }
        }
      };
    }

    targetDiv.querySelectorAll(".copy-btn").forEach(btn=>{
      btn.onclick = ()=>{
        navigator.clipboard.writeText(btn.dataset.val);
        btn.textContent = "✅";
        setTimeout(()=>btn.textContent="📋", 1000);
      };
    });

    targetDiv.querySelectorAll("[contenteditable]").forEach(div=>{
      div.onblur = async ()=>{
        const key = div.dataset.key;
        const f = fields.find(f=>f.key===key);
        if (f) {
          f.value = div.innerText.trim();
          await saveEditableFields();
        }
      };
    });
  }

  function showBindHint(msg) {
    targetDiv.innerHTML = `
      <div class="p-3 rounded bg-white/10">
        <div class="font-semibold mb-2">Aspen-CSV anbinden</div>
        <div class="text-sm mb-3">${msg ? msg : 'Bitte einmal die CSV-Datei auswählen. Danach wird sie automatisch synchronisiert.'}</div>
        <button id="bind-aspen" class="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded">Datei wählen…</button>
      </div>
    `;
    targetDiv.querySelector('#bind-aspen').onclick = async () => {
      try {
        const [fh] = await window.showOpenFilePicker({
          types: [{ description: 'Aspen CSV', accept: { 'text/csv': ['.csv', '.txt'] } }],
          excludeAcceptAllOption: true
        });
        aspenHandle = fh;
        await idbSet(IDB_KEY, aspenHandle);
        await bootstrapAspen();
        render();
      } catch {}
    };
  }

  // Start
  bootstrapAspen();
  render();
};
