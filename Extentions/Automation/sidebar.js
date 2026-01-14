(function () {
  const runButton = document.getElementById("run");
  const logContainer = document.getElementById("log");
  const logoWrap = document.getElementById("logoWrap");
  const api = typeof browser !== "undefined" ? browser : chrome;
  let chainTabId = null;
  const settleAfterCompleteMs = 1500;
  let isRunning = false;
  let stopRequested = false;
  let stopLogged = false;
  let lastVignetteTabId = null;
  let tabUpdateListener = null;

  function setRunning(state) {
    const wasRunning = isRunning;
    isRunning = state;
    if (!state) {
      stopRequested = false;
      stopLogged = false;
    }

    runButton.textContent = state ? "Stop" : "Run";
    runButton.classList.toggle("stop", state);
    logoWrap.classList.toggle("running", state);

    if (state) {
      ensureVignetteWatcher();
    } else {
      disableVignetteWatcher();
    }

    if (state && (chainTabId || lastVignetteTabId)) {
      syncVignetteForTab(chainTabId || lastVignetteTabId).catch(() => {});
    }
    if (!state && lastVignetteTabId) {
      clearVignette().catch(() => {});
    }

    if (wasRunning !== state) {
      runButton.classList.remove("transition-to-run", "transition-to-stop");
      void runButton.offsetWidth;
      runButton.classList.add(state ? "transition-to-stop" : "transition-to-run");
    }
  }

  function askToContinue(message) {
    return window.confirm(`${message}\n\nContinue with remaining commands?`);
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
      if (!isRunning || !chainTabId || tabId !== chainTabId) return;
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

    return { type, message };
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
      return false;
    }

    let tab;
    try {
      tab = await api.tabs.get(chainTabId);
    } catch (error) {
      addLog(`WAITTOLOAD could not access tracked tab: ${error.message || error}`, "error");
      chainTabId = null;
      return false;
    }

    if (!tab) {
      addLog("WAITTOLOAD could not find the tracked tab (it may have been closed).", "error");
      chainTabId = null;
      return false;
    }

    if (tab.status === "complete") {
      addLog("Tracked tab already loaded; waiting briefly for late assets...", "info");
      await new Promise((resolve) => setTimeout(resolve, settleAfterCompleteMs));
      addLog("Tracked tab finished loading.", "success");
      return true;
    }

    addLog("Waiting for the tracked tab to finish loading...", "info");

    const completed = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        api.tabs.onUpdated.removeListener(listener);
        api.tabs.onRemoved.removeListener(onRemoved);
        addLog("WAITTOLOAD timed out after 30s.", "error");
        resolve(false);
      }, 30000);

      const settle = () => {
        clearTimeout(timeout);
        api.tabs.onUpdated.removeListener(listener);
        api.tabs.onRemoved.removeListener(onRemoved);
        setTimeout(() => {
          addLog("Tracked tab finished loading.", "success");
          resolve(true);
        }, settleAfterCompleteMs);
      };

      function listener(tabId, changeInfo) {
        if (tabId === chainTabId && changeInfo.status === "complete") {
          settle();
        }
      }

      function onRemoved(tabId) {
        if (tabId === chainTabId) {
          clearTimeout(timeout);
          api.tabs.onUpdated.removeListener(listener);
          api.tabs.onRemoved.removeListener(onRemoved);
          addLog("Tracked tab was closed while waiting.", "error");
          chainTabId = null;
          resolve(false);
        }
      }

      api.tabs.onUpdated.addListener(listener);
      api.tabs.onRemoved.addListener(onRemoved);
    });

    return completed;
  }

  async function gotoCommand(target) {
    const normalized = normalizeUrl(target);
    if (!normalized) {
      addLog(`GOTO: could not parse URL from "${target}"`, "error");
      return false;
    }

    let navigateExistingTab = Boolean(chainTabId);

    if (navigateExistingTab) {
      try {
        await api.tabs.get(chainTabId);
      } catch (error) {
        navigateExistingTab = false;
        chainTabId = null;
        addLog("Tracked tab was closed; opening a new tab.", "info");
      }
    }
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
        if (isRunning) {
          await syncVignetteForTab(chainTabId);
        }
      } else {
        const tab = await api.tabs.create({ url: normalized });
        chainTabId = tab.id;
        addLog(`Opened new tab and navigated to ${normalized}`, "success");
        if (isRunning) {
          await syncVignetteForTab(chainTabId);
        }
      }
    } catch (error) {
      const message = error && error.message ? error.message : error;
      addLog(`GOTO failed: ${message}`, "error");
      if (navigateExistingTab) {
        chainTabId = null;
        addLog("Tracked tab became invalid; retrying by opening a new tab...", "info");
        try {
          const tab = await api.tabs.create({ url: normalized });
          chainTabId = tab.id;
          addLog(`Opened new tab and navigated to ${normalized}`, "success");
          if (isRunning) {
            await syncVignetteForTab(chainTabId);
          }
        } catch (fallbackError) {
          addLog(`Fallback GOTO failed: ${fallbackError.message || fallbackError}`, "error");
          return false;
        }
      }
    }

    return true;
  }

  async function clickCommand(targetIdentifier) {
    const targetId = (targetIdentifier || "").trim();

    if (!targetId) {
      addLog("CLICK requires an element selector or ID.", "error");
      return false;
    }

    if (!chainTabId) {
      addLog("CLICK requires a tracked tab (run GOTO first).", "error");
      return false;
    }

    try {
      const clickRunner = function (payload) {
        function cssEscape(value) {
          if (window.CSS && typeof window.CSS.escape === "function") {
            return window.CSS.escape(value);
          }
          return value.replace(/[^a-zA-Z0-9_\-]/g, (char) => "\\" + char);
        }

        function findTarget(idOrSelector) {
          if (!idOrSelector) return null;
          const trimmed = idOrSelector.trim();
          if (!trimmed) return null;

          const idCandidate = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
          const directById = document.getElementById(idCandidate);
          if (directById) return directById;

          try {
            const escapedId = cssEscape(idCandidate);
            if (escapedId) {
              const escaped = document.getElementById(idCandidate) || document.querySelector("#" + escapedId);
              if (escaped) return escaped;
            }
          } catch (_) {}

          try {
            const selectorMatch = document.querySelector(trimmed);
            if (selectorMatch) return selectorMatch;
          } catch (_) {}

          if (!trimmed.startsWith("#")) {
            try {
              const hashFallback = document.querySelector("#" + cssEscape(trimmed));
              if (hashFallback) return hashFallback;
            } catch (_) {}
          }

          return null;
        }

        const decoded = payload && typeof payload.target === "string" ? payload.target : "";
        const element = findTarget(decoded);
        if (!element) {
          return { success: false, error: "Element not found" };
        }

        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const eventOptions = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: centerX,
          clientY: centerY,
        };

        try {
          element.focus && element.focus();
          element.dispatchEvent(new MouseEvent("mouseover", eventOptions));
          element.dispatchEvent(new MouseEvent("mousemove", eventOptions));
          element.dispatchEvent(new MouseEvent("mousedown", eventOptions));
          element.dispatchEvent(new MouseEvent("mouseup", eventOptions));
          element.dispatchEvent(new MouseEvent("click", eventOptions));
          return { success: true, label: element.tagName ? element.tagName.toLowerCase() : "" };
        } catch (error) {
          return { success: false, error: error && error.message ? error.message : String(error) };
        }
      };

      const script = `(${clickRunner.toString()})(${JSON.stringify({ target: targetId })});`;
      const [result] = await api.tabs.executeScript(chainTabId, { code: script });

      if (!result) {
        addLog("CLICK failed: no response from the tab.", "error");
        return false;
      }

      if (result.success) {
        const label = result.label ? ` (${result.label})` : "";
        addLog(`Clicked element (${targetId})${label}.`, "success");
      } else {
        addLog(`CLICK failed: ${result.error || "unknown error"}.`, "error");
        return false;
      }
    } catch (error) {
      addLog(`CLICK failed: ${error && error.message ? error.message : error}`, "error");
      return false;
    }

    return true;
  }

  async function waitForElementCommand(targetIdentifier) {
    const targetId = (targetIdentifier || "").trim();

    if (!targetId) {
      addLog("WAITFORELEMENT requires an element selector or ID.", "error");
      return false;
    }

    if (!chainTabId) {
      addLog("WAITFORELEMENT requires a tracked tab (run GOTO first).", "error");
      return false;
    }

    addLog(`Waiting for element (${targetId}) to appear...`, "info");
    const pollIntervalMs = 500;

    const elementExistsRunner = function (payload) {
      function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === "function") {
          return window.CSS.escape(value);
        }
        return value.replace(/[^a-zA-Z0-9_\-]/g, (char) => "\\" + char);
      }

      function findTarget(idOrSelector) {
        if (!idOrSelector) return null;
        const trimmed = idOrSelector.trim();
        if (!trimmed) return null;

        const idCandidate = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
        const directById = document.getElementById(idCandidate);
        if (directById) return directById;

        try {
          const escapedId = cssEscape(idCandidate);
          if (escapedId) {
            const escaped = document.getElementById(idCandidate) || document.querySelector("#" + escapedId);
            if (escaped) return escaped;
          }
        } catch (_) {}

        try {
          const selectorMatch = document.querySelector(trimmed);
          if (selectorMatch) return selectorMatch;
        } catch (_) {}

        if (!trimmed.startsWith("#")) {
          try {
            const hashFallback = document.querySelector("#" + cssEscape(trimmed));
            if (hashFallback) return hashFallback;
          } catch (_) {}
        }

        return null;
      }

      const decoded = payload && typeof payload.target === "string" ? payload.target : "";
      const element = findTarget(decoded);
      return { found: Boolean(element) };
    };

    const script = `(${elementExistsRunner.toString()})(${JSON.stringify({ target: targetId })});`;

    while (true) {
      if (stopRequested) {
        addLog("WAITFORELEMENT cancelled by stop request.", "error");
        return false;
      }

      try {
        const [result] = await api.tabs.executeScript(chainTabId, { code: script });
        if (!result) {
          addLog("WAITFORELEMENT failed: no response from the tab.", "error");
          return false;
        }
        if (result.found) {
          addLog(`Element (${targetId}) found.`, "success");
          return true;
        }
      } catch (error) {
        addLog(`WAITFORELEMENT failed: ${error && error.message ? error.message : error}`, "error");
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  async function waitCommand(durationMs) {
    const ms = Number(durationMs);
    if (!Number.isFinite(ms) || ms < 0) {
      addLog("WAIT requires a non-negative number of milliseconds.", "error");
      return false;
    }

    addLog(`Waiting ${ms}ms...`, "info");
    const start = Date.now();
    while (Date.now() - start < ms) {
      if (stopRequested) {
        addLog("WAIT cancelled by stop request.", "error");
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(150, ms - (Date.now() - start))));
    }
    addLog(`Finished waiting ${ms}ms.`, "success");
    return true;
  }

  async function inputCommand(elementId, valueText) {
    const targetId = (elementId || "").trim();
    if (!targetId) {
      addLog("INPUT requires an element selector or ID.", "error");
      return false;
    }

    const rawValue = valueText == null ? "" : valueText;

    if (!chainTabId) {
      addLog("INPUT requires a tracked tab (run GOTO first).", "error");
      return false;
    }

    try {
      const inputRunner = function (payload) {
        function cssEscape(val) {
          if (window.CSS && typeof window.CSS.escape === "function") {
            return window.CSS.escape(val);
          }
          return val.replace(/[^a-zA-Z0-9_\-]/g, (char) => "\\" + char);
        }

        function findTarget(idOrSelector) {
          if (!idOrSelector) return null;
          const trimmed = idOrSelector.trim();
          if (!trimmed) return null;

          const idCandidate = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
          const directById = document.getElementById(idCandidate);
          if (directById) return directById;

          try {
            const escapedId = cssEscape(idCandidate);
            if (escapedId) {
              const escaped = document.getElementById(idCandidate) || document.querySelector("#" + escapedId);
              if (escaped) return escaped;
            }
          } catch (_) {}

          try {
            const selectorMatch = document.querySelector(trimmed);
            if (selectorMatch) return selectorMatch;
          } catch (_) {}

          if (!trimmed.startsWith("#")) {
            try {
              const hashFallback = document.querySelector("#" + cssEscape(trimmed));
              if (hashFallback) return hashFallback;
            } catch (_) {}
          }

          return null;
        }

        const identifier = payload && typeof payload.target === "string" ? payload.target : "";
        const text = payload && typeof payload.text === "string" ? payload.text : "";
        const element = findTarget(identifier);
        if (!element) {
          return { success: false, error: "Element not found" };
        }

        try {
          element.focus && element.focus();
          if ("value" in element) {
            element.value = text;
          } else {
            element.textContent = text;
          }

          const eventInit = { bubbles: true, cancelable: true };
          element.dispatchEvent(new Event("input", eventInit));
          element.dispatchEvent(new Event("change", eventInit));
          return { success: true };
        } catch (error) {
          return { success: false, error: error && error.message ? error.message : String(error) };
        }
      };

      const script = `(${inputRunner.toString()})(${JSON.stringify({ target: targetId, text: rawValue })});`;
      const [result] = await api.tabs.executeScript(chainTabId, { code: script });

      if (!result) {
        addLog("INPUT failed: no response from the tab.", "error");
        return false;
      }

      if (result.success) {
        addLog(`Updated element (${targetId}) with provided text.`, "success");
      } else {
        addLog(`INPUT failed: ${result.error || "unknown error"}.`, "error");
        return false;
      }
    } catch (error) {
      addLog(`INPUT failed: ${error && error.message ? error.message : error}`, "error");
      return false;
    }

    return true;
  }

  async function closeCommand() {
    if (!chainTabId) {
      addLog("CLOSE requires a tracked tab (run GOTO first).", "error");
      return false;
    }

    try {
      if (isRunning && lastVignetteTabId) {
        await clearVignette();
      }
      await api.tabs.remove(chainTabId);
      addLog("Closed tracked tab.", "success");
    } catch (error) {
      addLog(`CLOSE failed: ${error.message || error}`, "error");
      return false;
    } finally {
      chainTabId = null;
    }

    return true;
  }

  function parseSelectorArg(raw) {
    const trimmed = (raw || "").trim();
    if (!trimmed) return "";

    const quoted = trimmed.match(/^['"]([\s\S]*)['"]$/);
    if (quoted) {
      return quoted[1];
    }

    return trimmed;
  }

  function parseInputArgs(raw) {
    if (!raw || !raw.trim()) {
      return { error: "INPUT requires a selector and a quoted string." };
    }

    const pairMatch = raw.match(/^\s*(['"])([\s\S]*?)\1\s+(['"])([\s\S]*?)\3\s*$/);
    if (pairMatch) {
      return { selector: pairMatch[2], text: pairMatch[4] };
    }

    const firstMatch = raw.match(/^\s*(['"])([\s\S]*?)\1/);
    if (firstMatch) {
      const remaining = raw.slice(firstMatch[0].length).trim();
      const secondMatch = remaining.match(/^(['"])([\s\S]*?)\1/);
      if (secondMatch) {
        return { selector: firstMatch[2], text: secondMatch[2] };
      }
    }

    const firstSpace = raw.search(/\s/);
    if (firstSpace === -1) {
      return { error: "INPUT requires a selector and a quoted string." };
    }

    const selector = raw.slice(0, firstSpace).trim();
    const remainder = raw.slice(firstSpace).trim();
    if (!selector || !remainder) {
      return { error: "INPUT requires a selector and a quoted string." };
    }

    const remainderMatch = remainder.match(/^['"]([\s\S]*)['"]$/);
    const value = remainderMatch ? remainderMatch[1] : remainder;
    return { selector, text: value };
  }

  async function runInstructions(rawInput) {
    const raw = (rawInput || "").trim();
    if (!raw) {
      addLog("Clipboard was empty or had no commands.", "error");
      return;
    }

    const lines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      if (stopRequested) {
        addLog("Run stopped before executing next command.", "error");
        break;
      }

      const trimmedLine = line.trim();
      if (!trimmedLine) {
        continue;
      }

      const firstSpaceIndex = trimmedLine.search(/\s/);
      const command =
        firstSpaceIndex === -1
          ? trimmedLine
          : trimmedLine.slice(0, firstSpaceIndex).trim();
      const argString = firstSpaceIndex === -1 ? "" : trimmedLine.slice(firstSpaceIndex + 1);

      let commandSucceeded = true;
      const upper = command.toUpperCase();
      if (upper === "GOTO") {
        const urlText = argString.trim();
        if (!urlText) {
          addLog("GOTO requires a URL.", "error");
          commandSucceeded = false;
        } else {
          commandSucceeded = await gotoCommand(urlText);
        }
      } else if (upper === "CLICK") {
        const targetText = parseSelectorArg(argString);
        if (!targetText) {
          addLog("CLICK requires an element selector or ID.", "error");
          commandSucceeded = false;
        } else {
          commandSucceeded = await clickCommand(targetText);
        }
      } else if (upper === "WAITTOLOAD") {
        if (argString.trim()) {
          addLog("WAITTOLOAD does not take arguments.", "error");
          commandSucceeded = false;
        } else {
          commandSucceeded = await waitForChainTabLoad();
        }
      } else if (upper === "WAITFORELEMENT") {
        const targetText = parseSelectorArg(argString);
        if (!targetText) {
          addLog("WAITFORELEMENT requires an element selector or ID.", "error");
          commandSucceeded = false;
        } else {
          commandSucceeded = await waitForElementCommand(targetText);
        }
      } else if (upper === "WAIT") {
        const durationText = argString.trim();
        if (!durationText) {
          addLog("WAIT requires a millisecond duration.", "error");
          commandSucceeded = false;
        } else {
          const [durationRaw] = durationText.split(/\s+/);
          commandSucceeded = await waitCommand(durationRaw);
        }
      } else if (upper === "INPUT") {
        const parsed = parseInputArgs(argString);
        if (parsed.error) {
          addLog(parsed.error, "error");
          commandSucceeded = false;
        } else {
          commandSucceeded = await inputCommand(parsed.selector, parsed.text);
        }
      } else if (upper === "CLOSE") {
        if (argString.trim()) {
          addLog("CLOSE does not take arguments.", "error");
          commandSucceeded = false;
        } else {
          commandSucceeded = await closeCommand();
        }
      } else {
        addLog(`Unknown command: ${command}`, "error");
        commandSucceeded = false;
      }

      if (stopRequested) {
        addLog("Run stopped during execution.", "error");
        break;
      }

      if (!commandSucceeded) {
        const proceed = askToContinue(`Command "${command}" failed.`);
        if (!proceed) {
          addLog("Execution cancelled after error.", "error");
          break;
        }
      }
    }
  }

  async function readClipboardText() {
    try {
      const text = await navigator.clipboard.readText();
      return text;
    } catch (error) {
      addLog(`Clipboard read failed: ${error.message || error}`, "error");
      return "";
    }
  }

  runButton.addEventListener("click", async () => {
    if (isRunning) {
      stopRequested = true;
      if (!stopLogged) {
        addLog("Stop requested. Finishing current step...", "error");
        stopLogged = true;
      }
      return;
    }

    runButton.disabled = true;
    const clipboardText = await readClipboardText();
    setRunning(true);
    runButton.disabled = false;

    try {
      await runInstructions(clipboardText);
    } finally {
      setRunning(false);
    }
  });

  addLog("Automation sidebar ready. Paste commands to the clipboard and press Run.", "success");
})();
