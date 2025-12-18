(function () {
  const instructionInput = document.getElementById("instructions");
  const pasteButton = document.getElementById("paste");
  const runButton = document.getElementById("run");
  const logContainer = document.getElementById("log");
  const api = typeof browser !== "undefined" ? browser : chrome;

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

  function normalizeUrl(raw) {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }

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

  async function gotoCommand(target) {
    const normalized = normalizeUrl(target);
    if (!normalized) {
      addLog(`GOTO: could not parse URL from "${target}"`, "error");
      return;
    }

    addLog(`Opening ${normalized} ...`, "info");
    try {
      await api.tabs.create({ url: normalized });
      addLog(`Navigated to ${normalized}`, "success");
    } catch (error) {
      addLog(`GOTO failed: ${error.message || error}`, "error");
    }
  }

  async function runInstructions() {
    const raw = instructionInput.value.trim();
    if (!raw) {
      addLog("Nothing to run. Add at least one command.", "error");
      return;
    }

    const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      const [command, ...args] = line.split(/\s+/);
      if (!command) {
        continue;
      }

      const upper = command.toUpperCase();
      if (upper === "GOTO") {
        if (!args.length) {
          addLog("GOTO requires a URL.", "error");
          continue;
        }
        await gotoCommand(args.join(" "));
      } else {
        addLog(`Unknown command: ${command}`, "error");
      }
    }
  }

  async function pasteFromClipboard() {
    pasteButton.disabled = true;
    try {
      const text = await navigator.clipboard.readText();
      instructionInput.value = text;
      addLog("Pasted instructions from clipboard.", "success");
    } catch (error) {
      addLog(`Clipboard read failed: ${error.message || error}`, "error");
    } finally {
      pasteButton.disabled = false;
    }
  }

  pasteButton.addEventListener("click", pasteFromClipboard);
  runButton.addEventListener("click", () => {
    runButton.disabled = true;
    runInstructions().finally(() => {
      runButton.disabled = false;
    });
  });

  addLog("Automation sidebar ready.", "success");
})();
