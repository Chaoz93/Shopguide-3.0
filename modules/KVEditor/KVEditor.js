(function () {
  const STYLE_ID = 'kv-editor-styles';
  const STORAGE_KEY = 'kvEditorProfiles';
  const PRESETS_FILE = 'KV_Presets.json';
  const STYLE_TEXT = `
.kv-editor {
  color-scheme: dark;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #e0e0e0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.kv-editor__container {
  flex: 1;
  display: flex;
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
}
.kv-editor__sidebar {
  flex: 0 0 260px;
  background: #181818;
  border-right: 1px solid #2a2a2a;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.kv-editor__sidebar-title {
  margin: 0;
  font-size: 1.1rem;
}
.kv-editor__profile-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 8px;
  background: #151515;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kv-editor__profile-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.kv-editor__input,
.kv-editor__select,
.kv-editor__textarea {
  background: #101010;
  color: #e0e0e0;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  padding: 8px;
  font: inherit;
}
.kv-editor__textarea {
  width: 100%;
  min-height: 80px;
  resize: vertical;
}
.kv-editor__main {
  flex: 1 1 auto;
  padding: 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}
.kv-editor__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.kv-editor__title {
  margin: 0;
  font-size: 1.6rem;
}
.kv-editor__subtitle {
  margin: 0 0 8px;
  font-size: 1.2rem;
}
.kv-editor__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.kv-editor__label {
  min-width: 160px;
}
.kv-editor__preview-box {
  background: #1f1f1f;
  color: #ffffff;
  border-radius: 12px;
  padding: 16px;
  min-height: 150px;
  border: 1px solid #2a2a2a;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.kv-editor__preview-placeholder {
  color: #777;
  font-style: italic;
}
.kv-editor__baustein {
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: move;
  user-select: none;
  max-width: 100%;
}
.kv-editor__baustein-text {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-word;
}
.kv-editor__baustein-remove {
  cursor: pointer;
  color: #ff7777;
  font-weight: bold;
  border: none;
  background: none;
  font-size: 1rem;
}
.kv-editor__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.kv-editor__button {
  padding: 10px 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  background: #2f4f90;
  color: #ffffff;
  font-weight: 600;
  transition: background 0.2s ease;
}
.kv-editor__button:hover {
  background: #3f63b3;
}
.kv-editor__copy-feedback {
  color: #7fd87f;
  font-size: 0.9rem;
  min-height: 1.2rem;
}
.kv-editor__profile-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  background: #202020;
  transition: background 0.2s;
  gap: 10px;
}
.kv-editor__profile-item.active {
  background: #2f4f90;
  color: #ffffff;
}
.kv-editor__profile-actions {
  display: flex;
  align-items: center;
}
.kv-editor__profile-item button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1rem;
  margin-left: 6px;
}
.kv-editor__profile-item button:hover {
  color: #ffffff;
}
.kv-editor__profile-placeholder {
  padding: 8px 10px;
}
@media (max-width: 768px) {
  .kv-editor__container {
    flex-direction: column;
    height: auto;
  }
  .kv-editor__sidebar {
    width: 100%;
    flex-direction: column;
  }
}
`;
  const TEMPLATE = `
  <div class="kv-editor__container">
    <aside class="kv-editor__sidebar">
      <h2 class="kv-editor__sidebar-title">Profile</h2>
      <div class="kv-editor__profile-list" data-role="profileList"></div>
      <div class="kv-editor__profile-controls">
        <input type="text" class="kv-editor__input" data-role="profileNameInput" placeholder="Profilname" />
        <button type="button" class="kv-editor__button" data-role="saveProfileBtn">Profil speichern/aktualisieren</button>
        <button type="button" class="kv-editor__button" data-role="newProfileBtn">Neues Profil anlegen</button>
      </div>
    </aside>
    <main class="kv-editor__main">
      <h1 class="kv-editor__title">KV-Editor</h1>
      <section class="kv-editor__section">
        <div class="kv-editor__row">
          <label class="kv-editor__label" data-role="presetLabel">Textbaustein Presets:</label>
          <select class="kv-editor__select" data-role="presetSelect"></select>
          <button type="button" class="kv-editor__button" data-role="addPresetBtn">Preset hinzufügen</button>
        </div>
      </section>
      <section class="kv-editor__section">
        <label class="kv-editor__label" data-role="freitextLabel">Freitext</label>
        <textarea class="kv-editor__textarea" data-role="freitextInput" placeholder="Freitext eingeben..."></textarea>
        <div class="kv-editor__actions">
          <button type="button" class="kv-editor__button" data-role="addFreitextBtn">Freitext hinzufügen</button>
        </div>
      </section>
      <section class="kv-editor__section">
        <h2 class="kv-editor__subtitle">Freitext-Vorschau</h2>
        <div class="kv-editor__preview-box" data-role="previewBox">
          <span class="kv-editor__preview-placeholder">Noch keine Textbausteine hinzugefügt.</span>
        </div>
      </section>
      <section class="kv-editor__section">
        <div class="kv-editor__actions">
          <button type="button" class="kv-editor__button" data-role="copyAllBtn">Alles kopieren</button>
        </div>
        <div class="kv-editor__copy-feedback" data-role="copyFeedback"></div>
      </section>
    </main>
  </div>
`;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    document.head.appendChild(style);
  }

  function uniqueSuffix() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function setupLayout(root) {
    root.classList.add('kv-editor');
    root.innerHTML = TEMPLATE;
    const suffix = uniqueSuffix();
    const presetSelect = root.querySelector('[data-role="presetSelect"]');
    const freitextInput = root.querySelector('[data-role="freitextInput"]');
    const presetLabel = root.querySelector('[data-role="presetLabel"]');
    const freitextLabel = root.querySelector('[data-role="freitextLabel"]');

    if (presetSelect) {
      presetSelect.id = `kv-editor-preset-${suffix}`;
      if (presetLabel) presetLabel.setAttribute('for', presetSelect.id);
    }
    if (freitextInput) {
      freitextInput.id = `kv-editor-freitext-${suffix}`;
      if (freitextLabel) freitextLabel.setAttribute('for', freitextInput.id);
    }

    return {
      presetSelect,
      freitextInput,
      previewBox: root.querySelector('[data-role="previewBox"]'),
      profileList: root.querySelector('[data-role="profileList"]'),
      profileNameInput: root.querySelector('[data-role="profileNameInput"]'),
      copyFeedback: root.querySelector('[data-role="copyFeedback"]'),
      addPresetBtn: root.querySelector('[data-role="addPresetBtn"]'),
      addFreitextBtn: root.querySelector('[data-role="addFreitextBtn"]'),
      copyAllBtn: root.querySelector('[data-role="copyAllBtn"]'),
      saveProfileBtn: root.querySelector('[data-role="saveProfileBtn"]'),
      newProfileBtn: root.querySelector('[data-role="newProfileBtn"]')
    };
  }

  class KVEditor {
    constructor(root, ctx) {
      this.root = root;
      this.ctx = ctx || {};
      this.profileStorageKey = STORAGE_KEY;
      this.presets = [];
      this.bausteine = [];
      this.activeProfile = null;
      this.profiles = {};
      this.copyTimeout = null;

      const refs = setupLayout(root);
      this.previewBox = refs.previewBox;
      this.presetSelect = refs.presetSelect;
      this.freitextInput = refs.freitextInput;
      this.profileList = refs.profileList;
      this.profileNameInput = refs.profileNameInput;
      this.copyFeedback = refs.copyFeedback;
      this.addPresetBtn = refs.addPresetBtn;
      this.addFreitextBtn = refs.addFreitextBtn;
      this.copyAllBtn = refs.copyAllBtn;
      this.saveProfileBtn = refs.saveProfileBtn;
      this.newProfileBtn = refs.newProfileBtn;

      this.bindEvents();
      this.renderPreview();
      this.renderProfileList();
      this.init();
    }

    bindEvents() {
      if (this.addPresetBtn) {
        this.addPresetBtn.addEventListener('click', () => {
          const selectedId = this.presetSelect ? this.presetSelect.value : '';
          if (!selectedId) return;
          const preset = this.presets.find(p => p.id === selectedId);
          if (preset) {
            this.addBaustein(preset.text);
          }
        });
      }

      if (this.addFreitextBtn) {
        this.addFreitextBtn.addEventListener('click', () => {
          const text = this.freitextInput ? this.freitextInput.value.trim() : '';
          if (text) {
            this.addBaustein(text);
            if (this.freitextInput) this.freitextInput.value = '';
          }
        });
      }

      if (this.copyAllBtn) {
        this.copyAllBtn.addEventListener('click', () => this.copyAll());
      }

      if (this.previewBox) {
        this.previewBox.addEventListener('dragover', (event) => {
          event.preventDefault();
        });
        this.previewBox.addEventListener('drop', (event) => {
          event.preventDefault();
          const fromIndex = Number(event.dataTransfer.getData('text/plain'));
          if (!Number.isNaN(fromIndex)) {
            this.reorderBausteine(fromIndex, this.bausteine.length);
          }
        });
      }

      if (this.saveProfileBtn) {
        this.saveProfileBtn.addEventListener('click', () => {
          const name = this.profileNameInput ? this.profileNameInput.value.trim() : '';
          if (!name) {
            alert('Bitte einen Profilnamen eingeben.');
            return;
          }
          this.saveProfile(name);
        });
      }

      if (this.newProfileBtn) {
        this.newProfileBtn.addEventListener('click', () => {
          const name = prompt('Name für neues Profil:');
          if (name) {
            this.bausteine = [];
            this.renderPreview();
            this.saveProfile(name.trim(), true);
            this.loadProfile(name.trim());
          }
        });
      }
    }

    async init() {
      await this.loadPresets();
      this.populatePresetSelect();
      this.loadProfilesFromStorage();
      if (!this.activeProfile) {
        const names = Object.keys(this.profiles || {});
        if (names.length === 0) {
          this.saveProfile('Default', true);
        }
        const firstProfile = Object.keys(this.profiles)[0];
        if (firstProfile) {
          this.loadProfile(firstProfile);
          return;
        }
      }
      this.renderPreview();
      this.renderProfileList();
    }

    async loadPresets() {
      const subdir = this.ctx && this.ctx.subdir ? this.ctx.subdir : 'KVEditor';
      const basePath = `modules/${subdir}/`;
      const url = basePath + PRESETS_FILE;
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Konnte Preset-Datei nicht laden.');
        }
        const data = await response.json();
        this.presets = Array.isArray(data.presets) ? data.presets : [];
      } catch (error) {
        console.error('Fehler beim Laden der Presets:', error);
        this.presets = [];
      }
    }

    populatePresetSelect() {
      if (!this.presetSelect) return;
      this.presetSelect.innerHTML = '';
      if (!this.presets.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Keine Presets verfügbar';
        this.presetSelect.appendChild(option);
        this.presetSelect.disabled = true;
        if (this.addPresetBtn) this.addPresetBtn.disabled = true;
        return;
      }
      this.presetSelect.disabled = false;
      if (this.addPresetBtn) this.addPresetBtn.disabled = false;
      this.presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.title;
        this.presetSelect.appendChild(option);
      });
    }

    addBaustein(text) {
      this.bausteine.push({ text });
      this.renderPreview();
      if (this.activeProfile) {
        this.saveProfile(this.activeProfile);
      }
    }

    renderPreview() {
      if (!this.previewBox) return;
      this.previewBox.innerHTML = '';
      if (this.bausteine.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.className = 'kv-editor__preview-placeholder';
        placeholder.textContent = 'Noch keine Textbausteine hinzugefügt.';
        this.previewBox.appendChild(placeholder);
        return;
      }

      this.bausteine.forEach((baustein, index) => {
        const processedText = this.replacePlaceholders(baustein.text);
        const item = document.createElement('div');
        item.className = 'kv-editor__baustein';
        item.draggable = true;
        item.dataset.index = index;

        item.addEventListener('dragstart', (event) => {
          event.dataTransfer.setData('text/plain', index.toString());
          item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
          item.classList.remove('dragging');
        });

        item.addEventListener('dragover', (event) => {
          event.preventDefault();
        });

        item.addEventListener('drop', (event) => {
          event.preventDefault();
          const fromIndex = Number(event.dataTransfer.getData('text/plain'));
          const toIndex = Number(item.dataset.index);
          if (!Number.isNaN(fromIndex) && !Number.isNaN(toIndex) && fromIndex !== toIndex) {
            this.reorderBausteine(fromIndex, toIndex);
          }
        });

        const textSpan = document.createElement('div');
        textSpan.className = 'kv-editor__baustein-text';
        textSpan.textContent = processedText;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'kv-editor__baustein-remove';
        removeBtn.type = 'button';
        removeBtn.textContent = '❌';
        removeBtn.addEventListener('click', () => {
          this.bausteine.splice(index, 1);
          this.renderPreview();
          if (this.activeProfile) {
            this.saveProfile(this.activeProfile);
          }
        });

        item.appendChild(textSpan);
        item.appendChild(removeBtn);
        this.previewBox.appendChild(item);
      });
    }

    reorderBausteine(fromIndex, toIndex) {
      const [moved] = this.bausteine.splice(fromIndex, 1);
      const targetIndex = Math.min(Math.max(toIndex, 0), this.bausteine.length);
      this.bausteine.splice(targetIndex, 0, moved);
      this.renderPreview();
      if (this.activeProfile) {
        this.saveProfile(this.activeProfile);
      }
    }

    replacePlaceholders(text) {
      const now = new Date();
      const datum = now.toLocaleDateString('de-DE');
      const zeit = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const findings = 'Display shows missing segments. Due to obsolescence of LCD Display NME055, the modification SBC 196PN01Y-22-003 (Amdt. C) is required. All lamps are slightly dimmed.';

      return String(text)
        .replace(/\{datum\}/gi, datum)
        .replace(/\{zeit\}/gi, zeit)
        .replace(/\{findings\}/gi, findings);
    }

    getAllText() {
      const parts = this.bausteine.map(b => this.replacePlaceholders(b.text));
      return parts.join('\n\n');
    }

    async copyAll() {
      const allText = this.getAllText();
      if (!allText) {
        this.showCopyFeedback('Keine Textbausteine zum Kopieren.', true);
        return;
      }
      try {
        if (!navigator.clipboard) throw new Error('Clipboard API nicht verfügbar');
        await navigator.clipboard.writeText(allText);
        this.showCopyFeedback('Text in Zwischenablage kopiert.');
      } catch (error) {
        console.error('Fehler beim Kopieren:', error);
        this.showCopyFeedback('Kopieren nicht möglich. Bitte manuell kopieren.', true);
      }
    }

    showCopyFeedback(message, isError = false) {
      if (!this.copyFeedback) return;
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyFeedback.textContent = message;
      this.copyFeedback.style.color = isError ? '#ff7777' : '#7fd87f';
      this.copyTimeout = setTimeout(() => {
        if (this.copyFeedback) this.copyFeedback.textContent = '';
      }, 3000);
    }

    saveProfile(name, skipActiveUpdate = false) {
      this.loadProfilesFromStorage();
      this.profiles[name] = this.bausteine.map(b => ({ text: b.text }));
      this.persistProfiles();
      if (!skipActiveUpdate) {
        this.activeProfile = name;
        if (this.profileNameInput) this.profileNameInput.value = name;
      }
      this.renderProfileList();
    }

    loadProfile(name) {
      this.loadProfilesFromStorage();
      const profile = this.profiles[name];
      if (profile) {
        this.bausteine = profile.map(b => ({ text: b.text }));
        this.activeProfile = name;
        if (this.profileNameInput) this.profileNameInput.value = name;
        this.renderPreview();
        this.renderProfileList();
      }
    }

    deleteProfile(name) {
      this.loadProfilesFromStorage();
      if (this.profiles[name]) {
        delete this.profiles[name];
        this.persistProfiles();
        if (this.activeProfile === name) {
          const names = Object.keys(this.profiles);
          if (names.length > 0) {
            this.loadProfile(names[0]);
          } else {
            this.bausteine = [];
            this.activeProfile = null;
            if (this.profileNameInput) this.profileNameInput.value = '';
            this.renderPreview();
            this.renderProfileList();
          }
        } else {
          this.renderProfileList();
        }
      }
    }

    renameProfile(oldName, newName) {
      const trimmed = newName ? newName.trim() : '';
      if (!trimmed || oldName === trimmed) {
        return;
      }
      this.loadProfilesFromStorage();
      if (this.profiles[trimmed]) {
        alert('Ein Profil mit diesem Namen existiert bereits.');
        return;
      }
      if (this.profiles[oldName]) {
        this.profiles[trimmed] = this.profiles[oldName];
        delete this.profiles[oldName];
        this.persistProfiles();
        if (this.activeProfile === oldName) {
          this.activeProfile = trimmed;
          if (this.profileNameInput) this.profileNameInput.value = trimmed;
        }
        this.renderProfileList();
      }
    }

    loadProfilesFromStorage() {
      try {
        const raw = localStorage.getItem(this.profileStorageKey);
        this.profiles = raw ? JSON.parse(raw) : {};
      } catch (error) {
        console.error('Fehler beim Lesen aus dem localStorage:', error);
        this.profiles = {};
      }
    }

    persistProfiles() {
      try {
        localStorage.setItem(this.profileStorageKey, JSON.stringify(this.profiles));
      } catch (error) {
        console.error('Fehler beim Schreiben in den localStorage:', error);
      }
    }

    renderProfileList() {
      if (!this.profileList) return;
      this.profileList.innerHTML = '';
      const names = Object.keys(this.profiles || {});
      if (names.length === 0) {
        const hint = document.createElement('div');
        hint.className = 'kv-editor__preview-placeholder kv-editor__profile-placeholder';
        hint.textContent = 'Keine Profile vorhanden.';
        this.profileList.appendChild(hint);
        return;
      }
      names.sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
      names.forEach(name => {
        const item = document.createElement('div');
        item.className = 'kv-editor__profile-item';
        if (name === this.activeProfile) {
          item.classList.add('active');
        }

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameSpan.style.cursor = 'pointer';
        nameSpan.addEventListener('click', () => this.loadProfile(name));

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'kv-editor__profile-actions';

        const renameBtn = document.createElement('button');
        renameBtn.title = 'Umbenennen';
        renameBtn.type = 'button';
        renameBtn.textContent = '✏️';
        renameBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          const newName = prompt('Neuer Profilname:', name);
          if (newName) {
            this.renameProfile(name, newName);
          }
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.title = 'Löschen';
        deleteBtn.type = 'button';
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          if (confirm(`Profil "${name}" wirklich löschen?`)) {
            this.deleteProfile(name);
          }
        });

        buttonGroup.appendChild(renameBtn);
        buttonGroup.appendChild(deleteBtn);

        item.appendChild(nameSpan);
        item.appendChild(buttonGroup);
        this.profileList.appendChild(item);
      });
    }

    destroy() {
      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
        this.copyTimeout = null;
      }
    }
  }

  window.renderKVEditor = function renderKVEditor(root, ctx) {
    if (!root) return;
    ensureStyles();
    if (root.__kvEditorInstance && typeof root.__kvEditorInstance.destroy === 'function') {
      root.__kvEditorInstance.destroy();
    }
    root.innerHTML = '';
    const instance = new KVEditor(root, ctx);
    root.__kvEditorInstance = instance;
  };
})();
