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

  async function waitForActiveTabLoad() {
    let activeTab;
    try {
      const tabs = await api.tabs.query({ active: true, currentWindow: true });
      activeTab = tabs[0];
    } catch (error) {
      addLog(`WAITTOLOAD failed to access tabs: ${error.message || error}`, "error");
      return;
    }

    if (!activeTab) {
      addLog("WAITTOLOAD could not find the active tab.", "error");
      return;
    }

    if (activeTab.status === "complete") {
      addLog("Active tab already loaded.", "success");
      return;
    }

    addLog("Waiting for the active tab to finish loading...", "info");

    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        api.tabs.onUpdated.removeListener(listener);
        addLog("WAITTOLOAD timed out after 30s.", "error");
        resolve();
      }, 30000);

      function listener(tabId, changeInfo) {
        if (tabId === activeTab.id && changeInfo.status === "complete") {
          clearTimeout(timeout);
          api.tabs.onUpdated.removeListener(listener);
          addLog("Active tab finished loading.", "success");
          resolve();
        }
      }

      api.tabs.onUpdated.addListener(listener);
    });
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
      } else if (upper === "WAITTOLOAD") {
        if (args.length) {
          addLog("WAITTOLOAD does not take arguments.", "error");
          continue;
        }
        await waitForActiveTabLoad();
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
