// Module to convert standard findings to standard text from Excel/CSV
(function(){
  window.renderStandardFindings = function(root){
    let items = [];

    async function pickFile(){
      try {
        const [fh] = await window.showOpenFilePicker({
          types: [{
            description: 'Excel oder CSV',
            accept: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xls'],
              'text/csv': ['.csv']
            }
          }]
        });
        const file = await fh.getFile();
        const buf = await file.arrayBuffer();
        if (file.name.toLowerCase().endsWith('.csv')) {
          items = parseCSV(new TextDecoder().decode(buf));
        } else {
          if (typeof XLSX === 'undefined') await loadXLSX();
          const wb = XLSX.read(buf, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
          items = rows.slice(1).map(r => ({ finding: r[1] || '', action: r[3] || '' }))
                        .filter(r => r.finding || r.action);
        }
        render();
      } catch(e) {
        console.warn('Datei konnte nicht geladen werden', e);
      }
    }

    function parseCSV(text){
      const lines = text.split(/\r?\n/).filter(Boolean);
      const delim = text.includes(';') ? ';' : (text.includes('\t') ? '\t' : ',');
      const rows = lines.map(line => line.split(delim));
      return rows.slice(1).map(r => ({ finding: r[1] || '', action: r[3] || '' }))
                 .filter(r => r.finding || r.action);
    }

    function escapeHtml(str){
      const map = {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"};
      return str.replace(/[&<>\"']/g, m => map[m]);
    }

    function loadXLSX(){
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    function render(){
      if (!items.length){
        root.innerHTML = `<div class="p-2 text-center">
          <button id="sf-load" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">Excel laden…</button>
          <div class="text-xs mt-2 opacity-80">Spalten: B = Findings, D = Actions</div>
        </div>`;
        root.querySelector('#sf-load').onclick = pickFile;
        return;
      }

      root.innerHTML = `<div class="p-2 space-y-2">
        <select id="sf-select" class="w-full p-1 rounded text-black">
          <option value="">-- Auswahl --</option>
          ${items.map((it,i)=>`<option value="${i}">${escapeHtml(it.finding)}</option>`).join('')}
        </select>
        <textarea id="sf-out" class="w-full h-32 p-1 rounded text-black"></textarea>
        <button id="sf-copy" class="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded">📋 Kopieren</button>
      </div>`;

      const sel = root.querySelector('#sf-select');
      const out = root.querySelector('#sf-out');
      const copyBtn = root.querySelector('#sf-copy');

      sel.onchange = () => {
        const idx = parseInt(sel.value,10);
        if (!isNaN(idx)) {
          const it = items[idx];
          out.value = `${it.finding}\n${it.action}`.trim();
        } else {
          out.value = '';
        }
      };

      copyBtn.onclick = () => {
        navigator.clipboard.writeText(out.value || '').then(()=>{
          copyBtn.textContent = '✅';
          setTimeout(()=>copyBtn.textContent='📋 Kopieren',1000);
        }).catch(()=>{});
      };
    }

    render();
  };
})();
