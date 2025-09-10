// Simple sortable list with Excel persistence
// Loads items from the module JSON and allows saving/loading
// the list to/from an Excel file using the SheetJS library.

window.renderDeviceList = function (targetDiv, opts) {
  var mod = opts.moduleJson;
  var items = mod.items ? mod.items.slice() : [];

  var containerId = 'sortable-' + Math.floor(Math.random() * 100000);

  function ensureXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src =
        'https://cdn.jsdelivr.net/npm/xlsx@0.20.2/dist/xlsx.full.min.js';
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error('Failed to load SheetJS')); 
      };
      document.head.appendChild(s);
    });
  }

  function renderList() {
    var html =
      "<ul id='" +
      containerId +
      "' style='list-style-type: none; margin: 0; padding: 0; width: 100%;'>";
    items.forEach(function (item) {
      html +=
        "<li class='ui-state-default' style='margin: 0 5px 5px 5px; padding: 5px; font-size: 1.2em; height: 1.5em; line-height: 1.2em; background: #f0f0f0; border: 1px solid #ccc; cursor: move;'>" +
        item +
        '</li>';
    });
    html +=
      "</ul><div style='margin-top:0.5rem; display:flex; gap:0.5rem;'>" +
      "<button id='dl-save'>Speichern</button>" +
      "<input id='dl-load' type='file' accept='.xlsx' />" +
      '</div>';
    targetDiv.innerHTML = html;

    if (typeof $ !== 'undefined' && typeof $.fn.sortable !== 'undefined') {
      $('#' + containerId).sortable({
        placeholder: 'ui-state-highlight',
        forcePlaceholderSize: true,
        start: function (event, ui) {
          ui.placeholder.height(ui.helper.outerHeight());
        },
        update: function () {
          items =
            $('#' + containerId)
              .children()
              .map(function () {
                return this.textContent.trim();
              })
              .get();
        },
      });
      $('#' + containerId).disableSelection();
    } else {
      console.error(
        'jQuery UI Sortable is not available. Please include jQuery and jQuery UI.'
      );
    }

    document
      .getElementById('dl-save')
      .addEventListener('click', saveToExcel);
    document
      .getElementById('dl-load')
      .addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (file) loadFromExcel(file);
      });
  }

  async function saveToExcel() {
    try {
      await ensureXLSX();
      var sheet = XLSX.utils.aoa_to_sheet(items.map(function (i) { return [i]; }));
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, 'AspenDevices');
      XLSX.writeFile(wb, 'AspenDevices.xlsx');
    } catch (e) {
      console.error('Excel export failed', e);
    }
  }

  async function loadFromExcel(file) {
    try {
      await ensureXLSX();
      var data = await file.arrayBuffer();
      var wb = XLSX.read(data, { type: 'array' });
      var ws = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      items = rows.map(function (r) { return r[0]; }).filter(Boolean);
      renderList();
    } catch (e) {
      console.error('Excel import failed', e);
    }
  }

  renderList();
};

