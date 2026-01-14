(function () {
  if (window.__automationPickerInjected) {
    return;
  }
  window.__automationPickerInjected = true;

  const highlightBorder = "2px solid #38bdf8";
  const labelBg = "rgba(56, 189, 248, 0.12)";
  const labelText = "#0ea5e9";

  let overlay;
  let label;
  let active = false;
  let currentTarget = null;
  let pickerCommand = "CLICK";

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return value.replace(/[^a-zA-Z0-9_\-]/g, (char) => `\\${char}`);
  }

  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.zIndex = "2147483647";
    overlay.style.pointerEvents = "none";
    overlay.style.border = highlightBorder;
    overlay.style.borderRadius = "6px";
    overlay.style.transition = "all 60ms ease";
    overlay.style.boxSizing = "border-box";

    label = document.createElement("div");
    label.style.position = "fixed";
    label.style.zIndex = "2147483647";
    label.style.pointerEvents = "none";
    label.style.background = labelBg;
    label.style.color = labelText;
    label.style.padding = "4px 8px";
    label.style.borderRadius = "6px";
    label.style.fontSize = "12px";
    label.style.fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif";
    label.style.border = highlightBorder;
    label.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
  }

  function describeElement(target) {
    if (!target) return "";
    const parts = [];

    const labelText =
      target.getAttribute("aria-label") ||
      target.getAttribute("alt") ||
      target.getAttribute("name") ||
      (target.innerText || "").trim();

    if (labelText) {
      parts.push(labelText.length > 60 ? `${labelText.slice(0, 57)}...` : labelText);
    }

    const tag = target.tagName ? target.tagName.toLowerCase() : "element";
    parts.push(tag);

    if (target.id) {
      parts.push(`#${target.id}`);
    }

    return parts.join(" ");
  }

  function updateHighlight(target) {
    if (!overlay || !label) return;
    const rect = target.getBoundingClientRect();
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    label.textContent = describeElement(target) || "(unnamed element)";
    const labelTop = Math.max(4, rect.top - 32);
    const labelLeft = Math.max(4, rect.left);
    label.style.top = `${labelTop}px`;
    label.style.left = `${labelLeft}px`;
  }

  function cleanup() {
    active = false;
    currentTarget = null;
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("contextmenu", onClick, true);
    document.removeEventListener("keydown", onKeydown, true);
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (label && label.parentNode) {
      label.parentNode.removeChild(label);
    }
  }

  function buildSegment(el) {
    const tag = el.tagName ? el.tagName.toLowerCase() : "*";
    if (el.id) {
      return `#${cssEscape(el.id)}`;
    }

    let segment = tag;
    const dataAttribute = ["data-testid", "data-test", "data-qa", "name", "aria-label", "role"].find(
      (attr) => el.hasAttribute && el.hasAttribute(attr)
    );
    if (dataAttribute) {
      const value = el.getAttribute(dataAttribute);
      if (value) {
        segment += `[${dataAttribute}="${cssEscape(value)}"]`;
      }
    }
    const classes = Array.from(el.classList).slice(0, 2);
    if (classes.length) {
      segment += `.${classes.map((c) => cssEscape(c)).join(".")}`;
    }

    if (el.parentElement) {
      const siblings = Array.from(el.parentElement.children).filter(
        (child) => child.tagName === el.tagName
      );
      if (siblings.length > 1) {
        segment += `:nth-of-type(${siblings.indexOf(el) + 1})`;
      }
    }

    return segment;
  }

  function buildStrictPath(target) {
    const segments = [];
    let el = target;
    while (el && el.tagName && el !== document.documentElement) {
      const tag = el.tagName.toLowerCase();
      const siblings = el.parentElement ? Array.from(el.parentElement.children) : [];
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1;
        segments.unshift(`${tag}:nth-child(${index})`);
      } else {
        segments.unshift(tag);
      }
      el = el.parentElement;
    }
    segments.unshift("html");
    return segments.join(" > ");
  }

  function uniqueSelector(target) {
    if (!target || !(target instanceof Element)) return null;
    if (target.id) return `#${cssEscape(target.id)}`;

    const segments = [];
    let el = target;
    let depth = 0;
    while (el && el.tagName && depth < 6 && el !== document.documentElement) {
      segments.unshift(buildSegment(el));
      const selector = segments.join(" > ");
      try {
        const matches = document.querySelectorAll(selector);
        if (matches.length === 1 && matches[0] === target) {
          return selector;
        }
      } catch (_) {
        // keep climbing if selector is invalid at this depth
      }
      el = el.parentElement;
      depth += 1;
    }

    const candidate = segments.join(" > ");
    try {
      const matches = document.querySelectorAll(candidate);
      if (matches.length === 1 && matches[0] === target) {
        return candidate;
      }
    } catch (_) {
      // ignore, fallback below
    }

    return buildStrictPath(target);
  }

  function commitSelection(target) {
    if (!target) return;
    const selector = uniqueSelector(target);
    const name = describeElement(target);
    api.runtime
      .sendMessage({ type: "automation-picker-selection", selector, name })
      .catch(() => {});
    cleanup();
  }

  function onMove(event) {
    if (!active) return;
    const targets = document.elementsFromPoint(event.clientX, event.clientY);
    const target = pickTarget(targets);
    if (!target || target === document.documentElement || target === document.body) {
      return;
    }
    currentTarget = target;
    updateHighlight(target);
  }

  function onClick(event) {
    if (!active) return;
    event.preventDefault();
    event.stopPropagation();
    const targets = document.elementsFromPoint(event.clientX, event.clientY);
    const topmostTarget = pickTarget(targets);
    if (topmostTarget && topmostTarget !== document.documentElement && topmostTarget !== document.body) {
      currentTarget = topmostTarget;
    }
    commitSelection(currentTarget || event.target);
  }

  function onKeydown(event) {
    if (!active) return;
    if (event.key === "Escape") {
      event.preventDefault();
      api.runtime.sendMessage({ type: "automation-picker-cancelled" }).catch(() => {});
      cleanup();
    }
  }

  function isEditableTarget(target) {
    if (!target || !(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    if (target instanceof HTMLTextAreaElement) {
      return !target.disabled && !target.readOnly;
    }
    if (target instanceof HTMLInputElement) {
      const type = (target.type || "text").toLowerCase();
      const blockedTypes = ["button", "submit", "reset", "checkbox", "radio", "file", "image", "range", "color"];
      if (blockedTypes.includes(type)) return false;
      return !target.disabled && !target.readOnly;
    }
    if (target.getAttribute("role") === "textbox") {
      return !target.hasAttribute("aria-disabled") && target.getAttribute("aria-readonly") !== "true";
    }
    return false;
  }

  function pickTarget(targets) {
    if (!targets || !targets.length) return null;
    if (pickerCommand === "INPUT") {
      return targets.find((target) => isEditableTarget(target)) || null;
    }
    return targets.find((target) => target !== document.documentElement && target !== document.body) || null;
  }

  function startPicker(command = "CLICK") {
    pickerCommand = command || "CLICK";
    createOverlay();
    if (!overlay || !label) return;

    document.body.appendChild(overlay);
    document.body.appendChild(label);

    active = true;
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("contextmenu", onClick, true);
    document.addEventListener("keydown", onKeydown, true);
  }

  const api = typeof browser !== "undefined" ? browser : chrome;

  api.runtime.onMessage.addListener((message) => {
    if (!message || !message.type) return;
    if (message.type === "automation-picker-start") {
      startPicker(message.command);
      return;
    }
    if (message.type === "automation-picker-stop") {
      cleanup();
      return;
    }
  });
})();
