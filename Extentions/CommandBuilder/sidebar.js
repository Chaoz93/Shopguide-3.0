(function () {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const commandsInput = document.getElementById("commands");
  const addGotoButton = document.getElementById("add-goto");
  const tryGotoButton = document.getElementById("try-goto");
  const addWaitButton = document.getElementById("add-wait");
  const addClickButton = document.getElementById("add-click");
  const pickElementButton = document.getElementById("pick-element");
  const copyButton = document.getElementById("copy-commands");
  const statusEl = document.getElementById("status");

  function setStatus(message, tone = "muted") {
    statusEl.textContent = message;
    statusEl.dataset.tone = tone;
  }

  function getLines() {
    return commandsInput.value.split("\n");
  }

  function setLines(lines) {
    commandsInput.value = lines.join("\n");
  }

  function getCurrentLineIndex() {
    const beforeCursor = commandsInput.value.slice(0, commandsInput.selectionStart);
    return beforeCursor.split("\n").length - 1;
  }

  function ensureLine(lines, index) {
    while (lines.length <= index) {
      lines.push("");
    }
  }

  function offsetFor(lineIndex, column) {
    const lines = getLines();
    let offset = 0;
    for (let i = 0; i < lineIndex; i++) {
      offset += lines[i].length + 1;
    }
    return offset + column;
  }

  function setCaret(lineIndex, column) {
    const offset = offsetFor(lineIndex, column);
    commandsInput.setSelectionRange(offset, offset);
    commandsInput.focus();
  }

  function insertCommand(text, { advanceLine = false } = {}) {
    const lines = getLines();
    const lineIndex = getCurrentLineIndex();
    ensureLine(lines, lineIndex);

    lines[lineIndex] = text;

    const nextLineIndex = advanceLine ? lineIndex + 1 : lineIndex;
    if (advanceLine) {
      ensureLine(lines, nextLineIndex);
    }

    setLines(lines);
    setCaret(nextLineIndex, lines[nextLineIndex].length);
  }

  function normalizeUrl(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    try {
      return new URL(trimmed).toString();
    } catch (_) {
      try {
        return new URL(`https://${trimmed}`).toString();
      } catch (error) {
        return null;
      }
    }
  }

  function getCurrentLineContent() {
    const lines = getLines();
    const index = getCurrentLineIndex();
    ensureLine(lines, index);
    return { index, content: lines[index] };
  }

  async function getActiveTab() {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  function ensureClickPrefix() {
    const lines = getLines();
    const { index, content } = getCurrentLineContent();
    const trimmed = content.trim();

    if (trimmed.toUpperCase().startsWith("CLICK")) {
      return { lines, index };
    }

    const prefix = "CLICK ";
    if (!trimmed) {
      lines[index] = prefix;
    } else {
      lines.splice(index + 1, 0, prefix);
    }

    const targetIndex = trimmed ? index + 1 : index;
    setLines(lines);
    setCaret(targetIndex, lines[targetIndex].length);
    return { lines: getLines(), index: targetIndex };
  }

  function handleElementSelection(id, name) {
    const { lines, index } = ensureClickPrefix();
    lines[index] = `CLICK ${id}`;

    ensureLine(lines, index + 1);
    setLines(lines);
    setCaret(index + 1, 0);
    setStatus(`Captured element ${name ? `${name} ` : ""}#${id}`, "success");
  }

  async function startPicker() {
    const tab = await getActiveTab();
    if (!tab) {
      setStatus("No active tab available for picking.", "warning");
      return;
    }

    try {
      await api.tabs.executeScript(tab.id, { file: "picker.js" });
      await api.tabs.sendMessage(tab.id, { type: "automation-picker-start" });
      setStatus("Hover an element to highlight it, then click to capture the ID.");
    } catch (error) {
      setStatus(`Could not start picker: ${error && error.message ? error.message : error}`, "warning");
    }
  }

  async function tryGoto() {
    const { content } = getCurrentLineContent();
    if (!content.trim().toUpperCase().startsWith("GOTO")) {
      setStatus("Select a GOTO line to try it.", "warning");
      return;
    }

    const url = normalizeUrl(content.replace(/^[Gg][Oo][Tt][Oo]/, "").trim());
    if (!url) {
      setStatus("Enter a valid URL after GOTO before trying it.", "warning");
      return;
    }

    const tab = await getActiveTab();
    if (!tab) {
      setStatus("No active tab available to open the URL.", "warning");
      return;
    }

    try {
      await api.tabs.update(tab.id, { url });
      setStatus(`Opened ${url} in the active tab.`, "success");
    } catch (error) {
      setStatus(`Could not open URL: ${error && error.message ? error.message : error}`, "warning");
    }
  }

  async function copyCommands() {
    try {
      await navigator.clipboard.writeText(commandsInput.value);
      setStatus("Commands copied to the clipboard.", "success");
    } catch (error) {
      setStatus(`Copy failed: ${error && error.message ? error.message : error}`, "warning");
    }
  }

  addGotoButton.addEventListener("click", () => insertCommand("GOTO "));
  tryGotoButton.addEventListener("click", tryGoto);
  addWaitButton.addEventListener("click", () => insertCommand("WAITTOLOAD", { advanceLine: true }));
  addClickButton.addEventListener("click", () => insertCommand("CLICK "));
  pickElementButton.addEventListener("click", startPicker);
  copyButton.addEventListener("click", copyCommands);

  api.runtime.onMessage.addListener((message) => {
    if (message && message.type === "automation-picker-selection") {
      handleElementSelection(message.id, message.name);
      return;
    }

    if (message && message.type === "automation-picker-cancelled") {
      setStatus("Picker cancelled.", "warning");
      return;
    }
  });

  setStatus("Command builder ready.", "success");
})();
