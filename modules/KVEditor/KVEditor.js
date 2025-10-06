class KVEditor {
  constructor() {
    this.presets = [];
    this.bausteine = [];
    this.activeProfile = null;
    this.profileStorageKey = 'kvEditorProfiles';
    this.profiles = {};

    this.previewBox = document.getElementById('previewBox');
    this.presetSelect = document.getElementById('presetSelect');
    this.freitextInput = document.getElementById('freitextInput');
    this.profileList = document.getElementById('profileList');
    this.profileNameInput = document.getElementById('profileNameInput');
    this.copyFeedback = document.getElementById('copyFeedback');

    document.getElementById('addPresetBtn').addEventListener('click', () => {
      const selectedId = this.presetSelect.value;
      const preset = this.presets.find(p => p.id === selectedId);
      if (preset) {
        this.addBaustein(preset.text);
      }
    });

    document.getElementById('addFreitextBtn').addEventListener('click', () => {
      const text = this.freitextInput.value.trim();
      if (text) {
        this.addBaustein(text);
        this.freitextInput.value = '';
      }
    });

    document.getElementById('copyAllBtn').addEventListener('click', () => this.copyAll());
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
    document.getElementById('saveProfileBtn').addEventListener('click', () => {
      const name = this.profileNameInput.value.trim();
      if (name) {
        this.saveProfile(name);
      }
    });
    document.getElementById('newProfileBtn').addEventListener('click', () => {
      const name = prompt('Name für neues Profil:');
      if (name) {
        this.bausteine = [];
        this.renderPreview();
        this.saveProfile(name.trim(), true);
        this.loadProfile(name.trim());
      }
    });

    this.init();
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
      } else {
        this.renderPreview();
        this.renderProfileList();
      }
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

  populatePresetSelect() {
    this.presetSelect.innerHTML = '';
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
    this.previewBox.innerHTML = '';
    if (this.bausteine.length === 0) {
      const placeholder = document.createElement('span');
      placeholder.className = 'preview-placeholder';
      placeholder.textContent = 'Noch keine Textbausteine hinzugefügt.';
      this.previewBox.appendChild(placeholder);
      return;
    }

    this.bausteine.forEach((baustein, index) => {
      const processedText = this.replacePlaceholders(baustein.text);
      const item = document.createElement('div');
      item.className = 'baustein';
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
      textSpan.className = 'baustein-text';
      textSpan.textContent = processedText;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'baustein-remove';
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

    return text
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

  saveProfile(name, skipActiveUpdate = false) {
    this.loadProfilesFromStorage();
    this.profiles[name] = this.bausteine.map(b => ({ text: b.text }));
    localStorage.setItem(this.profileStorageKey, JSON.stringify(this.profiles));
    if (!skipActiveUpdate) {
      this.activeProfile = name;
    }
    this.renderProfileList();
  }

  loadProfile(name) {
    this.loadProfilesFromStorage();
    const profile = this.profiles[name];
    if (profile) {
      this.bausteine = profile.map(b => ({ text: b.text }));
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
    names.forEach(name => {
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
}

document.addEventListener('DOMContentLoaded', () => {
  new KVEditor();
});
