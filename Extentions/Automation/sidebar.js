(function () {
  const instructionInput = document.getElementById("instructions");
  const pasteButton = document.getElementById("paste");
  const runButton = document.getElementById("run");
  const logContainer = document.getElementById("log");
  const api = typeof browser !== "undefined" ? browser : chrome;
  let chainTabId = null;
  const settleAfterCompleteMs = 1500;

  function askToContinue(message) {
    return window.confirm(`${message}\n\nContinue with remaining commands?`);
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
        addLog("Tracked tab became invalid; retrying by opening a new tab...", "info");
        try {
          const tab = await api.tabs.create({ url: normalized });
          chainTabId = tab.id;
          addLog(`Opened new tab and navigated to ${normalized}`, "success");
        } catch (fallbackError) {
          addLog(`Fallback GOTO failed: ${fallbackError.message || fallbackError}`, "error");
          return false;
        }
      }
    }

    return true;
  }

  async function clickCommand(elementId) {
    const targetId = (elementId || "").trim();

    if (!targetId) {
      addLog("CLICK requires an element ID.", "error");
      return false;
    }

    if (!chainTabId) {
      addLog("CLICK requires a tracked tab (run GOTO first).", "error");
      return false;
    }

    try {
      const [result] = await api.tabs.executeScript(chainTabId, {
        code: `(function (id) {
          const element = document.getElementById(id);
          if (!element) {
            return { success: false, error: 'Element not found' };
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
            element.dispatchEvent(new MouseEvent('mouseover', eventOptions));
            element.dispatchEvent(new MouseEvent('mousemove', eventOptions));
            element.dispatchEvent(new MouseEvent('mousedown', eventOptions));
            element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
            element.dispatchEvent(new MouseEvent('click', eventOptions));
            return { success: true, label: element.tagName ? element.tagName.toLowerCase() : '' };
          } catch (error) {
            return { success: false, error: error && error.message ? error.message : String(error) };
          }
        })(${JSON.stringify(targetId)})`,
      });

      if (!result) {
        addLog("CLICK failed: no response from the tab.", "error");
        return false;
      }

      if (result.success) {
        const label = result.label ? ` (${result.label})` : "";
        addLog(`Clicked element #${targetId}${label}.`, "success");
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

  async function waitCommand(durationMs) {
    const ms = Number(durationMs);
    if (!Number.isFinite(ms) || ms < 0) {
      addLog("WAIT requires a non-negative number of milliseconds.", "error");
      return false;
    }

    addLog(`Waiting ${ms}ms...`, "info");
    await new Promise((resolve) => setTimeout(resolve, ms));
    addLog(`Finished waiting ${ms}ms.`, "success");
    return true;
  }

  async function inputCommand(elementId, valueText) {
    const targetId = (elementId || "").trim();
    if (!targetId) {
      addLog("INPUT requires an element ID.", "error");
      return false;
    }

    const rawValue = valueText == null ? "" : valueText;

    if (!chainTabId) {
      addLog("INPUT requires a tracked tab (run GOTO first).", "error");
      return false;
    }

    try {
      const [result] = await api.tabs.executeScript(chainTabId, {
        code: `(function (id, text) {
          const element = document.getElementById(id);
          if (!element) {
            return { success: false, error: 'Element not found' };
          }

          try {
            element.focus && element.focus();
            if ('value' in element) {
              element.value = text;
            } else {
              element.textContent = text;
            }

            const eventInit = { bubbles: true, cancelable: true };
            element.dispatchEvent(new Event('input', eventInit));
            element.dispatchEvent(new Event('change', eventInit));
            return { success: true };
          } catch (error) {
            return { success: false, error: error && error.message ? error.message : String(error) };
          }
        })(${JSON.stringify(targetId)}, ${JSON.stringify(rawValue)})`,
      });

      if (!result) {
        addLog("INPUT failed: no response from the tab.", "error");
        return false;
      }

      if (result.success) {
        addLog(`Updated element #${targetId} with provided text.`, "success");
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

      let commandSucceeded = true;
      const upper = command.toUpperCase();
      if (upper === "GOTO") {
        if (!args.length) {
          addLog("GOTO requires a URL.", "error");
          commandSucceeded = false;
        } else {
          commandSucceeded = await gotoCommand(args.join(" "));
        }
      } else if (upper === "CLICK") {
        if (!args.length) {
          addLog("CLICK requires an element ID.", "error");
          commandSucceeded = false;
        } else {
          commandSucceeded = await clickCommand(args.join(" "));
        }
      } else if (upper === "WAITTOLOAD") {
        if (args.length) {
          addLog("WAITTOLOAD does not take arguments.", "error");
          commandSucceeded = false;
        } else {
          commandSucceeded = await waitForChainTabLoad();
        }
      } else if (upper === "WAIT") {
        if (!args.length) {
          addLog("WAIT requires a millisecond duration.", "error");
          commandSucceeded = false;
        } else {
          commandSucceeded = await waitCommand(args[0]);
        }
      } else if (upper === "INPUT") {
        if (args.length < 2) {
          addLog("INPUT requires an element ID and a quoted string.", "error");
          commandSucceeded = false;
        } else {
          const [id, ...rest] = args;
          const valueRaw = rest.join(" ");
          const matched = valueRaw.match(/^['"]([\s\S]*)['"]$/);
          const value = matched ? matched[1] : valueRaw;
          commandSucceeded = await inputCommand(id, value);
        }
      } else if (upper === "CLOSE") {
        if (args.length) {
          addLog("CLOSE does not take arguments.", "error");
          commandSucceeded = false;
        } else {
          commandSucceeded = await closeCommand();
        }
      } else {
        addLog(`Unknown command: ${command}`, "error");
        commandSucceeded = false;
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
