class KVEditor {
  constructor() {
    this.presets = [];
    this.customSnippets = [];
    this.customSnippetsKey = 'kvEditorCustomSnippets';
    this.bausteine = [];
    this.activeProfile = null;
    this.profileStorageKey = 'kvEditorProfiles';
    this.profiles = {};

    this.previewBox = document.getElementById('previewBox');
    this.livePreviewOutput = document.getElementById('livePreviewOutput');
    this.presetLibrary = document.getElementById('presetLibrary');
    this.customLibrary = document.getElementById('customLibrary');
    this.freitextInput = document.getElementById('freitextInput');
    this.profileList = document.getElementById('profileList');
    this.profileNameInput = document.getElementById('profileNameInput');
    this.copyFeedback = document.getElementById('copyFeedback');

    document.getElementById('copyAllBtn').addEventListener('click', () => this.copyAll());
    document.getElementById('createFreitextBtn').addEventListener('click', () => {
      const text = this.freitextInput.value.trim();
      if (text) {
        this.createCustomSnippet(text);
        this.freitextInput.value = '';
      }
    });

    this.previewBox.addEventListener('dragover', (event) => {
      event.preventDefault();
      const hasLibraryData = Boolean(event.dataTransfer.getData('application/json'));
      event.dataTransfer.dropEffect = hasLibraryData ? 'copy' : 'move';
    });

    this.previewBox.addEventListener('drop', (event) => {
      event.preventDefault();
      const libraryPayload = this.parseLibraryPayload(event.dataTransfer.getData('application/json'));
      if (libraryPayload) {
        this.addBaustein(libraryPayload.text);
        return;
      }
      const fromIndex = Number(event.dataTransfer.getData('text/plain'));
      if (!Number.isNaN(fromIndex)) {
        this.reorderBausteine(fromIndex, this.bausteine.length, { insertBefore: false });
      }
    });

    this.profileNameInput.addEventListener('change', () => {
      const newName = this.profileNameInput.value.trim();
      if (newName && this.activeProfile) {
        this.renameProfile(this.activeProfile, newName);
      }
    });

    document.getElementById('newProfileBtn').addEventListener('click', () => {
      const name = prompt('Name für neues Profil:');
      if (name) {
        const trimmed = name.trim();
        if (!trimmed) {
          return;
        }
        this.persistActiveProfile();
        this.bausteine = [];
        this.renderPreview();
        this.saveProfile(trimmed, { setActive: true });
        this.loadProfile(trimmed);
      }
    });

    this.init();
  }

  async init() {
    await this.loadPresets();
    this.renderPresetLibrary();
    this.loadCustomSnippets();
    this.renderCustomSnippets();
    this.loadProfilesFromStorage();
    if (!this.activeProfile) {
      const names = Object.keys(this.profiles || {});
      if (names.length === 0) {
        this.saveProfile('Default', { setActive: true });
      }
      const firstProfile = Object.keys(this.profiles)[0];
      if (firstProfile) {
        this.loadProfile(firstProfile);
      } else {
        this.renderPreview();
        this.renderProfileList();
      }
    } else {
      this.loadProfile(this.activeProfile);
    }
  }

  async loadPresets() {
    try {
      const response = await fetch('KV_Presets.json');
      if (!response.ok) {
        throw new Error('Konnte Preset-Datei nicht laden.');
      }
      const data = await response.json();
      this.presets = data.presets || [];
    } catch (error) {
      console.error('Fehler beim Laden der Presets:', error);
      this.presets = [];
    }
  }

  renderPresetLibrary() {
    if (!this.presetLibrary) {
      return;
    }
    this.presetLibrary.innerHTML = '';
    if (!this.presets.length) {
      this.renderEmptyLibraryMessage(this.presetLibrary, 'Keine Presets verfügbar.');
      return;
    }
    this.presets.forEach((preset) => {
      const item = this.createLibraryItem({
        title: preset.title,
        text: preset.text,
        removable: false,
      });
      this.presetLibrary.appendChild(item);
    });
  }

  loadCustomSnippets() {
    try {
      const raw = localStorage.getItem(this.customSnippetsKey);
      this.customSnippets = raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('Fehler beim Laden der Freitext-Bausteine:', error);
      this.customSnippets = [];
    }
  }

  saveCustomSnippets() {
    localStorage.setItem(this.customSnippetsKey, JSON.stringify(this.customSnippets));
  }

  renderCustomSnippets() {
    if (!this.customLibrary) {
      return;
    }
    this.customLibrary.innerHTML = '';
    if (!this.customSnippets.length) {
      this.renderEmptyLibraryMessage(this.customLibrary, 'Noch keine Freitext-Bausteine erstellt.');
      return;
    }
    this.customSnippets.forEach((snippet) => {
      const item = this.createLibraryItem({
        title: 'Freitext',
        text: snippet.text,
        removable: true,
        onRemove: () => this.removeCustomSnippet(snippet.id),
      });
      this.customLibrary.appendChild(item);
    });
  }

  createCustomSnippet(text) {
    const snippet = {
      id: this.generateId(),
      text,
    };
    this.customSnippets.unshift(snippet);
    this.saveCustomSnippets();
    this.renderCustomSnippets();
  }

  removeCustomSnippet(id) {
    this.customSnippets = this.customSnippets.filter((snippet) => snippet.id !== id);
    this.saveCustomSnippets();
    this.renderCustomSnippets();
  }

  createLibraryItem({ title, text, removable, onRemove }) {
    const item = document.createElement('div');
    item.className = 'library-item';
    item.draggable = true;

    item.addEventListener('dragstart', (event) => {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/json', JSON.stringify({ source: 'library', text }));
    });

    item.addEventListener('dblclick', () => this.addBaustein(text));

    const header = document.createElement('div');
    header.className = 'library-item-header';

    const titleEl = document.createElement('p');
    titleEl.className = 'library-item-title';
    titleEl.textContent = title || 'Baustein';
    header.appendChild(titleEl);

    if (removable) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'library-item-remove';
      removeBtn.textContent = '✖';
      removeBtn.title = 'Baustein entfernen';
      removeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (onRemove) {
          onRemove();
        }
      });
      header.appendChild(removeBtn);
    }

    const textEl = document.createElement('div');
    textEl.className = 'library-item-text';
    textEl.textContent = text;

    item.appendChild(header);
    item.appendChild(textEl);

    return item;
  }

  renderEmptyLibraryMessage(container, message) {
    const span = document.createElement('span');
    span.className = 'preview-placeholder';
    span.textContent = message;
    container.appendChild(span);
  }

  parseLibraryPayload(raw) {
    if (!raw) {
      return null;
    }
    try {
      const payload = JSON.parse(raw);
      if (payload && payload.source === 'library' && typeof payload.text === 'string') {
        return payload;
      }
    } catch (error) {
      console.warn('Ungültige Drag-and-Drop-Daten:', error);
    }
    return null;
  }

  addBaustein(text, insertIndex = this.bausteine.length) {
    const index = Math.max(0, Math.min(insertIndex, this.bausteine.length));
    this.bausteine.splice(index, 0, { text });
    this.renderPreview();
    this.persistActiveProfile();
  }

  renderPreview() {
    this.previewBox.innerHTML = '';
    if (this.bausteine.length === 0) {
      const placeholder = document.createElement('span');
      placeholder.className = 'preview-placeholder';
      placeholder.textContent = 'Noch keine Textbausteine hinzugefügt.';
      this.previewBox.appendChild(placeholder);
      this.updateLivePreview();
      return;
    }

    this.bausteine.forEach((baustein, index) => {
      const item = document.createElement('div');
      item.className = 'baustein';
      item.draggable = true;
      item.dataset.index = index.toString();

      item.addEventListener('dragstart', (event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', index.toString());
      });

      item.addEventListener('dragover', (event) => {
        event.preventDefault();
        const hasLibraryData = Boolean(event.dataTransfer.getData('application/json'));
        event.dataTransfer.dropEffect = hasLibraryData ? 'copy' : 'move';
      });

      item.addEventListener('drop', (event) => {
        event.preventDefault();
        const toIndex = Number(item.dataset.index);
        const libraryPayload = this.parseLibraryPayload(event.dataTransfer.getData('application/json'));
        if (libraryPayload) {
          this.addBaustein(libraryPayload.text, toIndex);
          return;
        }
        const fromIndex = Number(event.dataTransfer.getData('text/plain'));
        if (!Number.isNaN(fromIndex) && !Number.isNaN(toIndex) && fromIndex !== toIndex) {
          this.reorderBausteine(fromIndex, toIndex, { insertBefore: true });
        }
      });

      const textSpan = document.createElement('div');
      textSpan.className = 'baustein-text';
      textSpan.contentEditable = 'true';
      textSpan.spellcheck = false;
      textSpan.setAttribute('draggable', 'false');
      textSpan.textContent = baustein.text;
      textSpan.addEventListener('input', () => {
        this.bausteine[index].text = textSpan.textContent || '';
        this.updateLivePreview();
        this.persistActiveProfile();
      });

      const removeBtn = document.createElement('button');
      removeBtn.className = 'baustein-remove';
      removeBtn.textContent = '❌';
      removeBtn.addEventListener('click', () => {
        this.bausteine.splice(index, 1);
        this.renderPreview();
        this.persistActiveProfile();
      });

      item.appendChild(textSpan);
      item.appendChild(removeBtn);
      this.previewBox.appendChild(item);
    });

    this.updateLivePreview();
  }

  reorderBausteine(fromIndex, toIndex, { insertBefore = false } = {}) {
    if (Number.isNaN(fromIndex) || Number.isNaN(toIndex)) {
      return;
    }
    if (fromIndex < 0 || fromIndex >= this.bausteine.length) {
      return;
    }
    const [moved] = this.bausteine.splice(fromIndex, 1);
    let targetIndex;
    if (insertBefore) {
      targetIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    } else {
      targetIndex = toIndex >= this.bausteine.length ? this.bausteine.length : toIndex;
    }
    targetIndex = Math.max(0, Math.min(targetIndex, this.bausteine.length));
    this.bausteine.splice(targetIndex, 0, moved);
    this.renderPreview();
    this.persistActiveProfile();
  }

  updateLivePreview() {
    const combined = this.getAllText();
    if (!combined) {
      this.livePreviewOutput.textContent = 'Noch keine Textbausteine hinzugefügt.';
    } else {
      this.livePreviewOutput.textContent = combined;
    }
  }

  replacePlaceholders(text) {
    const now = new Date();
    const datum = now.toLocaleDateString('de-DE');
    const zeit = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const findings = 'dimmed, umbruch broken umbruck cracked';

    return (text || '')
      .replace(/\{datum\}/gi, datum)
      .replace(/\{zeit\}/gi, zeit)
      .replace(/\{findings\}/gi, findings);
  }

  getAllText() {
    const parts = this.bausteine
      .map((b) => this.replacePlaceholders(b.text))
      .filter((text) => text.trim().length > 0);
    return parts.join('\n\n');
  }

  async copyAll() {
    const allText = this.getAllText();
    if (!allText) {
      this.showCopyFeedback('Keine Textbausteine zum Kopieren.', true);
      return;
    }
    try {
      await navigator.clipboard.writeText(allText);
      this.showCopyFeedback('Text in Zwischenablage kopiert.');
    } catch (error) {
      console.error('Fehler beim Kopieren:', error);
      this.showCopyFeedback('Kopieren nicht möglich. Bitte manuell kopieren.', true);
    }
  }

  showCopyFeedback(message, isError = false) {
    this.copyFeedback.textContent = message;
    this.copyFeedback.style.color = isError ? '#ff7777' : '#7fd87f';
    setTimeout(() => {
      this.copyFeedback.textContent = '';
    }, 3000);
  }

  persistActiveProfile() {
    if (!this.activeProfile) {
      return;
    }
    this.saveProfile(this.activeProfile, { setActive: false });
  }

  saveProfile(name, { setActive = true } = {}) {
    this.loadProfilesFromStorage();
    this.profiles[name] = this.bausteine.map((b) => ({ text: b.text }));
    localStorage.setItem(this.profileStorageKey, JSON.stringify(this.profiles));
    if (setActive) {
      this.activeProfile = name;
      this.profileNameInput.value = name;
    }
    this.renderProfileList();
  }

  loadProfile(name) {
    if (this.activeProfile && this.activeProfile !== name) {
      this.persistActiveProfile();
    }
    this.loadProfilesFromStorage();
    const profile = this.profiles[name];
    if (profile) {
      this.bausteine = profile.map((b) => ({ text: b.text }));
      this.activeProfile = name;
      this.profileNameInput.value = name;
      this.renderPreview();
      this.renderProfileList();
    }
  }

  deleteProfile(name) {
    this.loadProfilesFromStorage();
    if (this.profiles[name]) {
      delete this.profiles[name];
      localStorage.setItem(this.profileStorageKey, JSON.stringify(this.profiles));
      if (this.activeProfile === name) {
        const names = Object.keys(this.profiles);
        if (names.length > 0) {
          this.loadProfile(names[0]);
        } else {
          this.bausteine = [];
          this.activeProfile = null;
          this.profileNameInput.value = '';
          this.renderPreview();
          this.renderProfileList();
        }
      } else {
        this.renderProfileList();
      }
    }
  }

  renameProfile(oldName, newName) {
    if (!newName || oldName === newName) {
      this.profileNameInput.value = oldName;
      return;
    }
    this.loadProfilesFromStorage();
    if (this.profiles[oldName]) {
      this.profiles[newName] = this.profiles[oldName];
      delete this.profiles[oldName];
      localStorage.setItem(this.profileStorageKey, JSON.stringify(this.profiles));
      if (this.activeProfile === oldName) {
        this.activeProfile = newName;
        this.profileNameInput.value = newName;
      }
      this.renderProfileList();
    }
  }

  loadProfilesFromStorage() {
    const raw = localStorage.getItem(this.profileStorageKey);
    try {
      this.profiles = raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.error('Fehler beim Lesen aus dem localStorage:', error);
      this.profiles = {};
    }
  }

  renderProfileList() {
    this.profileList.innerHTML = '';
    const names = Object.keys(this.profiles || {});
    if (names.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'preview-placeholder';
      hint.textContent = 'Keine Profile vorhanden.';
      this.profileList.appendChild(hint);
      return;
    }
    names.sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
    names.forEach((name) => {
      const item = document.createElement('div');
      item.className = 'profile-item';
      if (name === this.activeProfile) {
        item.classList.add('active');
      }

      const nameSpan = document.createElement('span');
      nameSpan.textContent = name;
      nameSpan.style.cursor = 'pointer';
      nameSpan.addEventListener('click', () => this.loadProfile(name));

      const buttonGroup = document.createElement('div');

      const renameBtn = document.createElement('button');
      renameBtn.title = 'Umbenennen';
      renameBtn.textContent = '✏️';
      renameBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const newName = prompt('Neuer Profilname:', name);
        if (newName) {
          this.renameProfile(name, newName.trim());
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.title = 'Löschen';
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

  generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new KVEditor();
});
