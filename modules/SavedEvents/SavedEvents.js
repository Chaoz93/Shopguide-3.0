window.renderSavedEvents = function(targetDiv, opts) {
  let rootHandle = null;
  let pnDirs = [];
  let snMap = new Map();

  async function init() {
    renderIntro();
  }

  function renderIntro() {
    targetDiv.innerHTML = `
      <button id="pick-root" class="bg-blue-500 text-white px-3 py-1 rounded mb-3">
        📂 Root-Ordner "Saved Events" wählen
      </button>
      <div id="selector" class="hidden mb-3 flex gap-2">
        <select id="pn-select" class="px-2 py-1 rounded text-black"></select>
        <select id="sn-select" class="px-2 py-1 rounded text-black"></select>
        <button id="load-final" class="bg-green-500 text-white px-3 py-1 rounded">Final laden</button>
      </div>
      <div id="output" class="flex flex-col gap-2"></div>
    `;
    targetDiv.querySelector("#pick-root").onclick = pickRoot;
  }

  async function pickRoot() {
    try {
      rootHandle = await window.showDirectoryPicker();
      await scanRoot();
      fillPNDropdown();
      targetDiv.querySelector("#selector").classList.remove("hidden");

      targetDiv.querySelector("#pn-select").onchange = fillSNDropdown;
      targetDiv.querySelector("#load-final").onclick = loadFinalFile;
    } catch (e) {
      alert("Ordnerauswahl abgebrochen oder nicht erlaubt.");
    }
  }

  async function scanRoot() {
    pnDirs = [];
    snMap.clear();

    for await (const pnEntry of rootHandle.values()) {
      if (pnEntry.kind !== "directory") continue;
      pnDirs.push(pnEntry.name);
      let snList = [];
      for await (const snEntry of pnEntry.values()) {
        if (snEntry.kind === "directory") {
          snList.push(snEntry.name);
        }
      }
      snMap.set(pnEntry.name, snList);
    }
  }

  function fillPNDropdown() {
    const pnSelect = targetDiv.querySelector("#pn-select");
    pnSelect.innerHTML = pnDirs.map(pn => `<option>${pn}</option>`).join("");
    fillSNDropdown();
  }

  function fillSNDropdown() {
    const pn = targetDiv.querySelector("#pn-select").value;
    const snSelect = targetDiv.querySelector("#sn-select");
    const sns = snMap.get(pn) || [];
    snSelect.innerHTML = sns.map(sn => `<option>${sn}</option>`).join("");
  }

  async function loadFinalFile() {
    const pn = targetDiv.querySelector("#pn-select").value;
    const sn = targetDiv.querySelector("#sn-select").value;
    if (!pn || !sn) return;

    const pnHandle = await rootHandle.getDirectoryHandle(pn);
    const snHandle = await pnHandle.getDirectoryHandle(sn);

    let finalFile = null;
    for await (const f of snHandle.values()) {
      if (f.kind === "file" && f.name.toLowerCase().includes("final")) {
        finalFile = f;
        break;
      }
    }
    if (!finalFile) {
      targetDiv.querySelector("#output").textContent = "Keine Final-Datei gefunden!";
      return;
    }

    const file = await finalFile.getFile();
    const text = await file.text();
    renderFinal(text);
  }

  function renderFinal(text) {
    const output = targetDiv.querySelector("#output");
    output.innerHTML = "";

    // Abschnitte trennen
    const sections = text.split(/===\s*(.*?)\s*===/g);

    for (let i = 1; i < sections.length; i += 2) {
      const title = sections[i];
      const content = sections[i + 1].trim();

      const block = document.createElement("div");
      block.className = "bg-white/10 p-2 rounded";

      const h = document.createElement("h3");
      h.className = "font-semibold mb-1";
      h.textContent = title;
      block.appendChild(h);

      // Haupteigenschaften schön als Key/Value darstellen
      if (title.toLowerCase().includes("haupt")) {
        content.split(/\r?\n/).forEach(line => {
          if (!line.trim()) return;
          const parts = line.split(":");
          const key = parts[0]?.trim();
          const val = parts.slice(1).join(":").trim();
          const row = document.createElement("div");
          row.className = "flex justify-between text-sm border-b border-gray-700/30 py-0.5";
          row.innerHTML = `<span class="font-medium">${key}</span><span class="text-right">${val}</span>`;
          block.appendChild(row);
        });
      } else {
        // Alle anderen Abschnitte normal anzeigen
        const pre = document.createElement("pre");
        pre.className = "whitespace-pre-wrap text-sm";
        pre.textContent = content;
        block.appendChild(pre);
      }

      output.appendChild(block);
    }
  }

  init();
};
