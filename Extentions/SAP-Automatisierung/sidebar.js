(function () {
  const runButton = document.getElementById("run");
  const logContainer = document.getElementById("log");
  const sheetBody = document.getElementById("sheetBody");
  const logoWrap = document.getElementById("logoWrap");
  const api = typeof browser !== "undefined" ? browser : chrome;
  const initialRows = 2;
  const initialColumns = 2;
  let columnCount = initialColumns;
  let isSelecting = false;
  let selectionAnchor = null;
  let selectionRange = null;
  let isRunning = false;
  let stopRequested = false;
  let lastVignetteTabId = null;
  let tabUpdateListener = null;
  const selectedCells = new Set();

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

  function setRunning(state) {
    const wasRunning = isRunning;
    isRunning = state;
    if (!state) {
      stopRequested = false;
    }

    runButton.textContent = state ? "Stop" : "Run";
    runButton.classList.toggle("stop", state);
    logoWrap.classList.toggle("running", state);

    if (state) {
      ensureVignetteWatcher();
    } else {
      disableVignetteWatcher();
    }

    if (wasRunning !== state) {
      runButton.classList.remove("transition-to-run", "transition-to-stop");
      void runButton.offsetWidth;
      runButton.classList.add(state ? "transition-to-stop" : "transition-to-run");
    }
  }

  async function toggleTabVignette(tabId, active) {
    if (!tabId) return;

    const vignetteScript = `(${function (payload) {
      const overlayId = "automation-vignette-overlay";
      const existing = document.getElementById(overlayId);

      if (!payload.active) {
        if (existing) {
          existing.style.opacity = "0";
          existing.style.transition = "opacity 260ms ease";
          setTimeout(() => existing.remove(), 280);
        }
        return true;
      }

      const overlay = existing || document.createElement("div");
      overlay.id = overlayId;
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "2147483646";
      overlay.style.background =
        "radial-gradient(circle at center, rgba(0, 12, 32, 0) 74%, rgba(38, 130, 245, 0.14) 84%, rgba(38, 130, 245, 0.2) 92%, rgba(24, 88, 186, 0.26) 100%)";
      overlay.style.opacity = existing ? existing.style.opacity || "1" : "0";
      overlay.style.transition = "opacity 260ms ease";
      overlay.style.boxShadow = "none";
      overlay.style.filter = "saturate(1.02)";

      if (!existing) {
        document.documentElement.appendChild(overlay);
        requestAnimationFrame(() => {
          overlay.style.opacity = "1";
        });
      } else {
        overlay.style.opacity = "1";
      }

      return true;
    }.toString()})(${JSON.stringify({ active })});`;

    try {
      await api.tabs.executeScript(tabId, { code: vignetteScript });
    } catch (error) {
      console.warn("Vignette update failed", error);
    }
  }

  async function syncVignetteForTab(tabId) {
    if (!tabId || !isRunning) return;

    if (lastVignetteTabId && lastVignetteTabId !== tabId) {
      try {
        await toggleTabVignette(lastVignetteTabId, false);
      } catch (_) {}
    }

    await toggleTabVignette(tabId, true);
    lastVignetteTabId = tabId;
  }

  async function clearVignette() {
    if (!lastVignetteTabId) return;
    try {
      await toggleTabVignette(lastVignetteTabId, false);
    } catch (_) {}
    lastVignetteTabId = null;
  }

  function ensureVignetteWatcher() {
    if (tabUpdateListener) return;
    tabUpdateListener = function (tabId, changeInfo) {
      if (!isRunning || !lastVignetteTabId || tabId !== lastVignetteTabId) return;
      if (changeInfo.status === "complete" || changeInfo.status === "loading") {
        syncVignetteForTab(tabId).catch(() => {});
      }
    };
    api.tabs.onUpdated.addListener(tabUpdateListener);
  }

  function disableVignetteWatcher() {
    if (!tabUpdateListener) return;
    api.tabs.onUpdated.removeListener(tabUpdateListener);
    tabUpdateListener = null;
  }

  function getTopLeftValue() {
    const firstRow = sheetBody.querySelector("tr");
    if (!firstRow) return "";
    const firstInput = firstRow.querySelector("input");
    return firstInput ? firstInput.value.trim() : "";
  }

  function setTopRightValue(value) {
    const firstRow = sheetBody.querySelector("tr");
    if (!firstRow) return;
    const inputs = Array.from(firstRow.querySelectorAll("input"));
    const target = inputs[1];
    if (target) {
      target.value = value;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function createCell() {
    const td = document.createElement("td");
    td.className = "sheet-cell";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "sheet-input";
    input.addEventListener("input", syncRows);
    input.addEventListener("paste", handlePaste);
    input.addEventListener("mousedown", handleSelectStart);
    input.addEventListener("mouseenter", handleSelectMove);
    input.addEventListener("focus", handleSelectFocus);
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

  function clearSelection() {
    selectedCells.forEach((cell) => cell.classList.remove("selected"));
    selectedCells.clear();
  }

  function selectRange(start, end) {
    clearSelection();
    if (!start || !end) return;
    selectionRange = { start, end };
    const startRow = Math.min(start.rowIndex, end.rowIndex);
    const endRow = Math.max(start.rowIndex, end.rowIndex);
    const startCol = Math.min(start.colIndex, end.colIndex);
    const endCol = Math.max(start.colIndex, end.colIndex);

    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
      const row = sheetBody.children[rowIndex];
      if (!row) continue;
      const inputs = Array.from(row.querySelectorAll("input"));
      for (let colIndex = startCol; colIndex <= endCol; colIndex += 1) {
        const input = inputs[colIndex];
        if (!input) continue;
        const cell = input.closest("td");
        if (cell) {
          cell.classList.add("selected");
          selectedCells.add(cell);
        }
      }
    }
  }

  function handleSelectStart(event) {
    if (event.button !== 0) return;
    isSelecting = true;
    selectionAnchor = getCellPosition(event.target);
    selectRange(selectionAnchor, selectionAnchor);
  }

  function handleSelectMove(event) {
    if (!isSelecting || !selectionAnchor) return;
    const current = getCellPosition(event.target);
    selectRange(selectionAnchor, current);
  }

  function handleSelectFocus(event) {
    if (isSelecting) return;
    const focused = getCellPosition(event.target);
    selectRange(focused, focused);
  }

  function endSelection() {
    isSelecting = false;
  }

  function getInputFromPoint(event) {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target) return null;
    if (target.classList.contains("sheet-input")) return target;
    return target.closest(".sheet-cell")?.querySelector(".sheet-input") || null;
  }

  function handleGlobalMouseMove(event) {
    if (!isSelecting || !selectionAnchor) return;
    const input = getInputFromPoint(event);
    if (!input) return;
    const current = getCellPosition(input);
    selectRange(selectionAnchor, current);
  }

  function deleteSelection() {
    if (!selectedCells.size) return false;
    selectedCells.forEach((cell) => {
      const input = cell.querySelector("input");
      if (input) input.value = "";
    });
    syncRows();
    return true;
  }

  function getSelectionText() {
    if (!selectionRange) return "";
    const startRow = Math.min(selectionRange.start.rowIndex, selectionRange.end.rowIndex);
    const endRow = Math.max(selectionRange.start.rowIndex, selectionRange.end.rowIndex);
    const startCol = Math.min(selectionRange.start.colIndex, selectionRange.end.colIndex);
    const endCol = Math.max(selectionRange.start.colIndex, selectionRange.end.colIndex);

    const rows = [];
    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
      const row = sheetBody.children[rowIndex];
      if (!row) continue;
      const inputs = Array.from(row.querySelectorAll("input"));
      const values = [];
      for (let colIndex = startCol; colIndex <= endCol; colIndex += 1) {
        values.push(inputs[colIndex]?.value ?? "");
      }
      rows.push(values.join("\t"));
    }
    return rows.join("\n");
  }

  function handleCopy(event) {
    if (!selectedCells.size) return;
    const text = getSelectionText();
    if (!text) return;
    event.preventDefault();
    event.clipboardData?.setData("text/plain", text);
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

  function handleKeydown(event) {
    if (event.key === "Delete" && selectedCells.size) {
      event.preventDefault();
      deleteSelection();
      return;
    }

    if (event.key === "Enter") {
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement) || !active.classList.contains("sheet-input")) {
        return;
      }
      event.preventDefault();
      const { rowIndex, colIndex } = getCellPosition(active);
      ensureRowCount(rowIndex + 2);
      const nextRow = sheetBody.children[rowIndex + 1];
      const inputs = Array.from(nextRow.querySelectorAll("input"));
      const nextInput = inputs[colIndex];
      if (nextInput) {
        nextInput.focus();
        selectRange({ rowIndex: rowIndex + 1, colIndex }, { rowIndex: rowIndex + 1, colIndex });
      }
      return;
    }

    const arrowKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    if (arrowKeys.has(event.key)) {
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement) || !active.classList.contains("sheet-input")) {
        return;
      }
      event.preventDefault();
      const { rowIndex, colIndex } = getCellPosition(active);
      let nextRow = rowIndex;
      let nextCol = colIndex;
      if (event.key === "ArrowUp") {
        nextRow = Math.max(0, rowIndex - 1);
      } else if (event.key === "ArrowDown") {
        nextRow = rowIndex + 1;
      } else if (event.key === "ArrowLeft") {
        nextCol = Math.max(0, colIndex - 1);
      } else if (event.key === "ArrowRight") {
        nextCol = colIndex + 1;
      }
      if (event.key === "ArrowDown") {
        ensureRowCount(nextRow + 1);
      }
      const targetRow = sheetBody.children[nextRow];
      if (!targetRow) return;
      const inputs = Array.from(targetRow.querySelectorAll("input"));
      const nextInput = inputs[nextCol];
      if (!nextInput) return;
      nextInput.focus();
      selectRange({ rowIndex: nextRow, colIndex: nextCol }, { rowIndex: nextRow, colIndex: nextCol });
    }
  }

  async function openTab(url) {
    const tab = await api.tabs.create({ url, active: true });
    return tab.id;
  }

  async function waitForElement(tabId, selector, timeoutMs = 30000) {
    const pollInterval = 300;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (stopRequested) return false;
      const script = `(${function (payload) {
        return Boolean(document.querySelector(payload.selector));
      }.toString()})(${JSON.stringify({ selector })});`;
      const [exists] = await api.tabs.executeScript(tabId, { code: script });
      if (exists) return true;
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
    return false;
  }

  async function setInputValue(tabId, selector, value) {
    const script = `(${function (payload) {
      const input = document.querySelector(payload.selector);
      if (!input) return false;
      input.focus();
      input.value = payload.value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }.toString()})(${JSON.stringify({ selector, value })});`;
    const [result] = await api.tabs.executeScript(tabId, { code: script });
    return result;
  }

  async function pressEnter(tabId, selector) {
    const script = `(${function (payload) {
      const input = document.querySelector(payload.selector);
      if (!input) return false;
      input.focus();
      const keyOptions = { key: "Enter", code: "Enter", which: 13, keyCode: 13, bubbles: true };
      input.dispatchEvent(new KeyboardEvent("keydown", keyOptions));
      input.dispatchEvent(new KeyboardEvent("keypress", keyOptions));
      input.dispatchEvent(new KeyboardEvent("keyup", keyOptions));
      const form = input.form;
      if (form) {
        const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
        if (!submitEvent.defaultPrevented) {
          form.submit();
        }
      }
      return true;
    }.toString()})(${JSON.stringify({ selector })});`;
    const [result] = await api.tabs.executeScript(tabId, { code: script });
    return result;
  }

  async function clickElement(tabId, selector) {
    const script = `(${function (payload) {
      const target = document.querySelector(payload.selector);
      if (!target) return false;
      target.click();
      return true;
    }.toString()})(${JSON.stringify({ selector })});`;
    const [result] = await api.tabs.executeScript(tabId, { code: script });
    return result;
  }

  async function getActiveRadioIndex(tabId, selectors) {
    const script = `(${function (payload) {
      const isActive = (element) => {
        if (!element) return false;
        const input = element.querySelector('input[type=\"radio\"]');
        if (input && input.checked) return true;
        const ariaChecked = element.getAttribute("aria-checked");
        if (ariaChecked === "true") return true;
        return element.classList.contains("sapRb-checked") || element.classList.contains("checked");
      };

      for (let i = 0; i < payload.selectors.length; i += 1) {
        const element = document.querySelector(payload.selectors[i]);
        if (isActive(element)) return i;
      }
      return -1;
    }.toString()})(${JSON.stringify({ selectors })});`;
    const [result] = await api.tabs.executeScript(tabId, { code: script });
    return result;
  }

  async function runSapSequence({ url, inputSelector, value, titleSelector }) {
    addLog("Opening SAP WebGUI...", "info");
    const tabId = await openTab(url);
    await syncVignetteForTab(tabId);
    addLog("Waiting for SAP input field...", "info");
    const ready = await waitForElement(tabId, inputSelector);
    if (!ready) {
      addLog("SAP input field did not load in time.", "error");
      return;
    }
    if (stopRequested) return;
    addLog("Entering value into SAP field...", "info");
    const success = await setInputValue(tabId, inputSelector, value);
    if (!success) {
      addLog("Failed to set the SAP field value.", "error");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (stopRequested) return;
    addLog("Submitting the SAP field...", "info");
    const submitted = await pressEnter(tabId, inputSelector);
    if (!submitted) {
      addLog("Failed to submit the SAP field.", "error");
      return;
    }
    addLog("Waiting for title element...", "info");
    const titleReady = await waitForElement(tabId, titleSelector);
    if (!titleReady) {
      addLog("Title element did not load in time.", "error");
      return;
    }
    if (stopRequested) return;
    addLog("Clicking title element...", "info");
    const clicked = await clickElement(tabId, titleSelector);
    if (!clicked) {
      addLog("Failed to click the title element.", "error");
      return;
    }
    addLog("Waiting for radio options...", "info");
    const radioContainerSelector = "#M0\\:46\\:2\\:3B257\\:2\\:\\:2\\:135";
    const radioReady = await waitForElement(tabId, radioContainerSelector);
    if (!radioReady) {
      addLog("Radio options did not load in time.", "error");
      return;
    }
    if (stopRequested) return;
    const radioSelectors = [
      "#M0\\:46\\:2\\:3B257\\:2\\:\\:2\\:135",
      "#M0\\:46\\:2\\:3B257\\:2\\:\\:3\\:135",
      "#M0\\:46\\:2\\:3B257\\:2\\:\\:4\\:135",
      "#M0\\:46\\:2\\:3B257\\:2\\:\\:5\\:135"
    ];
    const activeIndex = await getActiveRadioIndex(tabId, radioSelectors);
    const labels = ["In Prüfung", "Schriftliche Berechtigung", "Unterweisungspflicht", "Sonstiges T&E"];
    if (activeIndex >= 0) {
      setTopRightValue(labels[activeIndex]);
      addLog("SAP sequence completed.", "success");
    } else {
      addLog("No active radio option detected.", "error");
    }
  }

  runButton.addEventListener("click", async () => {
    if (isRunning) {
      stopRequested = true;
      setRunning(false);
      await clearVignette();
      addLog("Run stopped by user.", "info");
      return;
    }

    const topLeftValue = getTopLeftValue();
    if (!topLeftValue) {
      addLog("Top-left cell is empty. Please enter a value before running.", "error");
      return;
    }
    setRunning(true);
    try {
      await runSapSequence({
        url: "https://sap-p04.lht.ham.dlh.de/sap/bc/gui/sap/its/webgui?sap-client=002&~transaction=*zmm03#",
        inputSelector: "#M0\\:46\\:\\:\\:2\\:29",
        titleSelector: "#M0\\:46\\:2\\:\\:0\\:1-title",
        value: topLeftValue
      });
    } catch (error) {
      addLog(`Run failed: ${error.message || error}`, "error");
    } finally {
      setRunning(false);
      await clearVignette();
    }
  });

  document.addEventListener("mouseup", endSelection);
  document.addEventListener("mousemove", handleGlobalMouseMove);
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("copy", handleCopy);

  for (let i = 0; i < initialRows; i += 1) {
    sheetBody.appendChild(createRow());
  }

  addLog("SAP-Automatisierung sidebar ready. Enter data in the grid below.", "success");
})();
