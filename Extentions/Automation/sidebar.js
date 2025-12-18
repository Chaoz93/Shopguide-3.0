(function () {
  const instructionInput = document.getElementById("instructions");
  const pasteButton = document.getElementById("paste");
  const runButton = document.getElementById("run");
  const logContainer = document.getElementById("log");
  const api = typeof browser !== "undefined" ? browser : chrome;
  let chainTabId = null;

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

  async function waitForChainTabLoad() {
    if (!chainTabId) {
      addLog("WAITTOLOAD requires a previous GOTO to open a tab.", "error");
      return;
    }

    let tab;
    try {
      tab = await api.tabs.get(chainTabId);
    } catch (error) {
      addLog(`WAITTOLOAD could not access tracked tab: ${error.message || error}`, "error");
      chainTabId = null;
      return;
    }

    if (!tab) {
      addLog("WAITTOLOAD could not find the tracked tab (it may have been closed).", "error");
      chainTabId = null;
      return;
    }

    if (tab.status === "complete") {
      addLog("Tracked tab already loaded.", "success");
      return;
    }

    addLog("Waiting for the tracked tab to finish loading...", "info");

    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        api.tabs.onUpdated.removeListener(listener);
        api.tabs.onRemoved.removeListener(onRemoved);
        addLog("WAITTOLOAD timed out after 30s.", "error");
        resolve();
      }, 30000);

      function listener(tabId, changeInfo) {
        if (tabId === chainTabId && changeInfo.status === "complete") {
          clearTimeout(timeout);
          api.tabs.onUpdated.removeListener(listener);
          api.tabs.onRemoved.removeListener(onRemoved);
          addLog("Tracked tab finished loading.", "success");
          resolve();
        }
      }

      function onRemoved(tabId) {
        if (tabId === chainTabId) {
          clearTimeout(timeout);
          api.tabs.onUpdated.removeListener(listener);
          api.tabs.onRemoved.removeListener(onRemoved);
          addLog("Tracked tab was closed while waiting.", "error");
          chainTabId = null;
          resolve();
        }
      }

      api.tabs.onUpdated.addListener(listener);
      api.tabs.onRemoved.addListener(onRemoved);
    });
  }

  async function gotoCommand(target) {
    const normalized = normalizeUrl(target);
    if (!normalized) {
      addLog(`GOTO: could not parse URL from "${target}"`, "error");
      return;
    }

    const navigateExistingTab = Boolean(chainTabId);
    addLog(
      navigateExistingTab
        ? `Navigating tracked tab to ${normalized} ...`
        : `Opening ${normalized} in a new tab ...`,
      "info"
    );

    try {
      if (navigateExistingTab) {
        await api.tabs.update(chainTabId, { url: normalized });
        addLog(`Navigated tracked tab to ${normalized}`, "success");
      } else {
        const tab = await api.tabs.create({ url: normalized });
        chainTabId = tab.id;
        addLog(`Opened new tab and navigated to ${normalized}`, "success");
      }
    } catch (error) {
      const message = error && error.message ? error.message : error;
      addLog(`GOTO failed: ${message}`, "error");
      if (navigateExistingTab) {
        chainTabId = null;
        addLog("Tracked tab became invalid; next GOTO will open a new tab.", "info");
      }
    }
  }

  async function closeCommand() {
    if (!chainTabId) {
      addLog("CLOSE requires a tracked tab (run GOTO first).", "error");
      return;
    }

    try {
      await api.tabs.remove(chainTabId);
      addLog("Closed tracked tab.", "success");
    } catch (error) {
      addLog(`CLOSE failed: ${error.message || error}`, "error");
    } finally {
      chainTabId = null;
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
        await waitForChainTabLoad();
      } else if (upper === "CLOSE") {
        if (args.length) {
          addLog("CLOSE does not take arguments.", "error");
          continue;
        }
        await closeCommand();
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
