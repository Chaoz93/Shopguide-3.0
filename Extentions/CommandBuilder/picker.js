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

  function ensureIds(target) {
    if (target.id) return target.id;
    const generated = `automation-capture-${Date.now().toString(16)}-${Math.random()
      .toString(16)
      .slice(2, 6)}`;
    target.id = generated;
    return generated;
  }

  function commitSelection(target) {
    if (!target) return;
    const id = ensureIds(target);
    const name = describeElement(target);
    api.runtime.sendMessage({ type: "automation-picker-selection", id, name }).catch(() => {});
    cleanup();
  }

  function onMove(event) {
    if (!active) return;
    const target = document.elementFromPoint(event.clientX, event.clientY);
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

  function startPicker() {
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
      startPicker();
      return;
    }
    if (message.type === "automation-picker-stop") {
      cleanup();
      return;
    }
  });
})();
