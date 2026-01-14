(function () {
  const runButton = document.getElementById("run");
  const logContainer = document.getElementById("log");
  const sheetBody = document.getElementById("sheetBody");
  const initialRows = 2;
  const initialColumns = 2;
  let columnCount = initialColumns;

  function timestamp() {
    return new Date().toLocaleTimeString([], { hour12: false });
  }

  function addLog(message, type = "info") {
    const row = document.createElement("div");
    row.className = `log-entry ${type}`;

    const time = document.createElement("span");
    time.className = "time";
    time.textContent = timestamp();

    const text = document.createElement("span");
    text.className = "message";
    text.textContent = message;

    row.append(time, text);
    logContainer.appendChild(row);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  function createCell() {
    const td = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "sheet-input";
    input.addEventListener("input", syncRows);
    input.addEventListener("paste", handlePaste);
    td.appendChild(input);
    return td;
  }

  function createRow() {
    const tr = document.createElement("tr");
    for (let i = 0; i < columnCount; i += 1) {
      tr.appendChild(createCell());
    }
    return tr;
  }

  function rowHasContent(row) {
    return Array.from(row.querySelectorAll("input")).some((input) => input.value.trim() !== "");
  }

  function ensureRowCount(count) {
    while (sheetBody.children.length < count) {
      sheetBody.appendChild(createRow());
    }
  }

  function ensureColumnCount(count) {
    if (count <= columnCount) return;
    const rows = Array.from(sheetBody.querySelectorAll("tr"));
    rows.forEach((row) => {
      for (let i = columnCount; i < count; i += 1) {
        row.appendChild(createCell());
      }
    });
    columnCount = count;
  }

  function syncRows() {
    const rows = Array.from(sheetBody.querySelectorAll("tr"));
    if (!rows.length) return;

    const lastRow = rows[rows.length - 1];
    if (rowHasContent(lastRow)) {
      sheetBody.appendChild(createRow());
    }

    let updatedRows = Array.from(sheetBody.querySelectorAll("tr"));
    while (updatedRows.length > 1) {
      const last = updatedRows[updatedRows.length - 1];
      const secondLast = updatedRows[updatedRows.length - 2];
      if (!rowHasContent(last) && !rowHasContent(secondLast)) {
        last.remove();
        updatedRows.pop();
      } else {
        break;
      }
    }
  }

  function getCellPosition(input) {
    const row = input.closest("tr");
    const rows = Array.from(sheetBody.querySelectorAll("tr"));
    const rowIndex = rows.indexOf(row);
    const inputs = Array.from(row.querySelectorAll("input"));
    const colIndex = inputs.indexOf(input);
    return { rowIndex, colIndex };
  }

  function parseClipboard(text) {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n");
    while (lines.length && lines[lines.length - 1] === "") {
      lines.pop();
    }
    return lines.map((line) => line.split("\t"));
  }

  function handlePaste(event) {
    const text = event.clipboardData?.getData("text");
    if (!text) return;
    event.preventDefault();

    const { rowIndex, colIndex } = getCellPosition(event.target);
    const rowsData = parseClipboard(text);
    if (!rowsData.length) return;

    const maxCols = rowsData.reduce((max, row) => Math.max(max, row.length), 0);
    ensureRowCount(rowIndex + rowsData.length);
    ensureColumnCount(colIndex + maxCols);

    rowsData.forEach((rowData, rIndex) => {
      const row = sheetBody.children[rowIndex + rIndex];
      const inputs = Array.from(row.querySelectorAll("input"));
      rowData.forEach((value, cIndex) => {
        inputs[colIndex + cIndex].value = value;
      });
    });

    syncRows();
  }

  runButton.addEventListener("click", () => {
    addLog("Run is currently disabled. This will be re-enabled for SAP automation later.", "info");
  });

  for (let i = 0; i < initialRows; i += 1) {
    sheetBody.appendChild(createRow());
  }

  addLog("SAP-Automatisierung sidebar ready. Enter data in the grid below.", "success");
})();
