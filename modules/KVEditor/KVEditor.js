class KVEditor {
  constructor(options = {}) {
    const { mount } = options || {};

    this.presets = [];
    this.customSnippets = [];
    this.customSnippetsKey = 'kvEditorCustomSnippets';
    this.presetPathStorageKey = 'kvEditorPresetPath';
    this.defaultPresetPath = 'configs/kv_editor_presets.config.json';
    this.presetPath = null;
    this.loadedPresetPath = null;
    this.bausteine = [];
    this.activeProfile = null;
    this.profileStorageKey = 'kvEditorProfiles';
    this.profiles = {};

    this.root = this.setupLayout(mount);
    this.cacheElements();
    this.attachEventListeners();

    this.init();
  }

  setupLayout(mount) {
    if (typeof document === 'undefined') {
      throw new Error('KVEditor benötigt eine Browser-Umgebung.');
    }

    this.injectStyles();

    let mountTarget = mount;
    if (typeof mountTarget === 'string') {
      mountTarget = document.querySelector(mountTarget);
    }
    if (!(mountTarget instanceof HTMLElement)) {
      mountTarget = document.body;
    }

    if (!mountTarget) {
      throw new Error('Es konnte kein gültiges Ziel zum Einfügen des KV-Editors gefunden werden.');
    }

    if (mountTarget === document.body) {
      document.body.classList.add('kv-editor-page');
    }

    const existingRoot = document.getElementById('kvEditorRoot');
    if (existingRoot) {
      existingRoot.remove();
    }

    const root = document.createElement('div');
    root.id = 'kvEditorRoot';
    root.className = 'kv-container';
    root.innerHTML = `
      <aside class="kv-sidebar">
        <h2>Profile</h2>
        <div class="profile-list" id="profileList"></div>
        <div class="profile-controls">
          <input type="text" id="profileNameInput" placeholder="Profilname" />
          <p class="autosave-hint">Profile werden automatisch gespeichert.</p>
          <button id="newProfileBtn">Neues Profil anlegen</button>
        </div>
      </aside>
      <main class="kv-main">
        <h1>KV-Editor</h1>
        <section class="builder">
          <div class="builder-column library-column">
            <section class="library-section">
              <h2>Baukasten Presets</h2>
              <div id="presetLibrary" class="library-list"></div>
            </section>
            <section class="library-section">
              <h2>Freitext-Bausteine</h2>
              <textarea id="freitextInput" placeholder="Freitext eingeben..."></textarea>
              <div class="actions">
                <button id="createFreitextBtn">Freitext-Baustein erstellen</button>
              </div>
              <div id="customLibrary" class="library-list"></div>
            </section>
          </div>
          <div class="builder-column preview-column">
            <h2>Zusammengestellte Bausteine</h2>
            <div class="preview-box" id="previewBox">
              <span class="preview-placeholder">Noch keine Textbausteine hinzugefügt.</span>
            </div>
            <div class="actions">
              <button id="copyAllBtn">Alles kopieren</button>
            </div>
            <div class="copy-feedback" id="copyFeedback"></div>
          </div>
        </section>
        <section class="live-preview-section">
          <h2>Live Vorschau</h2>
          <pre id="livePreviewOutput" class="live-preview">Noch keine Textbausteine hinzugefügt.</pre>
        </section>
      </main>
    `;

    mountTarget.appendChild(root);
    return root;
  }

  injectStyles() {
    if (document.getElementById('kvEditorStyles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'kvEditorStyles';
    style.textContent = `
      :root {
        color-scheme: dark;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #121212;
        color: #e0e0e0;
      }

      .kv-editor-page {
        margin: 0;
        min-height: 100vh;
        display: flex;
        background: #1a1a1a;
      }

      .kv-container {
        display: flex;
        width: 100%;
        min-height: 100vh;
      }

      .kv-sidebar {
        width: 260px;
        background: #181818;
        border-right: 1px solid #2a2a2a;
        padding: 20px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .kv-sidebar h2 {
        margin: 0;
        font-size: 1.2rem;
      }

      .profile-list {
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

      .profile-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        border-radius: 6px;
        background: #202020;
        transition: background 0.2s;
      }

      .profile-item.active {
        background: #2f4f90;
        color: #ffffff;
      }

      .profile-item button {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 1rem;
        margin-left: 6px;
      }

      .profile-controls {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .profile-controls input {
        padding: 8px;
        border-radius: 6px;
        border: 1px solid #2a2a2a;
        background: #101010;
        color: #e0e0e0;
      }

      .autosave-hint {
        margin: 0;
        font-size: 0.85rem;
        color: #aaaaaa;
      }

      .profile-controls button,
      .kv-main button {
        padding: 10px 14px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        background: #2f4f90;
        color: #ffffff;
        font-weight: 600;
        transition: background 0.2s ease;
      }

      .profile-controls button:hover,
      .kv-main button:hover {
        background: #3f63b3;
      }

      .kv-main {
        flex: 1;
        padding: 24px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 20px;
        overflow-y: auto;
      }

      .kv-main h1 {
        margin: 0;
        font-size: 1.6rem;
      }

      .builder {
        display: grid;
        grid-template-columns: minmax(260px, 320px) 1fr;
        gap: 20px;
        align-items: start;
      }

      .builder-column {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .library-section {
        background: #161616;
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .library-section h2 {
        margin: 0;
        font-size: 1.2rem;
      }

      .library-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 320px;
        overflow-y: auto;
      }

      .library-item {
        background: #202020;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        padding: 10px 12px;
        cursor: grab;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .library-item:active {
        cursor: grabbing;
      }

      .library-item-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }

      .library-item-title {
        margin: 0;
        font-weight: 600;
        font-size: 1rem;
      }

      .library-item-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .library-item-actions button {
        border: none;
        background: none;
        color: inherit;
        font-size: 0.95rem;
        cursor: pointer;
        padding: 2px;
      }

      .library-item-edit {
        color: #7fb0ff;
      }

      .library-item-edit.save {
        color: #9bd48d;
      }

      .library-item-remove {
        color: #ff7777;
      }

      .library-item-text {
        font-size: 0.95rem;
        white-space: pre-wrap;
        word-break: break-word;
        color: #d0d0d0;
      }

      .library-item-text.editing {
        background: #1e1e1e;
        outline: 2px solid #3f63b3;
        border-radius: 6px;
        padding: 6px;
      }

      select,
      textarea,
      input[type="text"] {
        background: #101010;
        color: #e0e0e0;
        border: 1px solid #2a2a2a;
        border-radius: 6px;
        padding: 8px;
      }

      textarea {
        width: 100%;
        min-height: 80px;
        resize: vertical;
      }

      .preview-box {
        background: #1f1f1f;
        color: #ffffff;
        border-radius: 12px;
        padding: 16px;
        min-height: 150px;
        border: 1px solid #2a2a2a;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .preview-placeholder {
        color: #777;
        font-style: italic;
      }

      .baustein {
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
        position: relative;
      }

      .baustein.drop-before::before,
      .baustein.drop-after::after {
        content: '';
        position: absolute;
        left: 8px;
        right: 8px;
        height: 2px;
        background: #4f7de3;
        border-radius: 2px;
      }

      .baustein.drop-before::before {
        top: 2px;
      }

      .baustein.drop-after::after {
        bottom: 2px;
      }

      .baustein-text {
        flex: 1;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .baustein-text[contenteditable="true"]:focus {
        outline: 2px solid #3f63b3;
        border-radius: 6px;
      }

      .baustein-remove {
        cursor: pointer;
        color: #ff7777;
        font-weight: bold;
        border: none;
        background: none;
        font-size: 1rem;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
      }

      .preview-box.drop-target {
        border-color: #4f7de3;
        box-shadow: 0 0 0 2px rgba(79, 125, 227, 0.2);
      }

      .copy-feedback {
        color: #7fd87f;
        font-size: 0.9rem;
        min-height: 1.2rem;
      }

      .live-preview-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .live-preview {
        background: #101010;
        border-radius: 12px;
        border: 1px solid #2a2a2a;
        padding: 16px;
        min-height: 180px;
        white-space: pre-wrap;
        font-family: inherit;
      }

      @media (max-width: 1024px) {
        .builder {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .kv-editor-page {
          flex-direction: column;
        }

        .kv-container {
          flex-direction: column;
          height: auto;
        }

        .kv-sidebar {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  cacheElements() {
    this.previewBox = document.getElementById('previewBox');
    this.livePreviewOutput = document.getElementById('livePreviewOutput');
    this.presetLibrary = document.getElementById('presetLibrary');
    this.customLibrary = document.getElementById('customLibrary');
    this.freitextInput = document.getElementById('freitextInput');
    this.profileList = document.getElementById('profileList');
    this.profileNameInput = document.getElementById('profileNameInput');
    this.copyFeedback = document.getElementById('copyFeedback');
    this.copyAllBtn = document.getElementById('copyAllBtn');
    this.createFreitextBtn = document.getElementById('createFreitextBtn');
    this.newProfileBtn = document.getElementById('newProfileBtn');
  }

  attachEventListeners() {
    if (this.copyAllBtn) {
      this.copyAllBtn.addEventListener('click', () => this.copyAll());
    }

    if (this.createFreitextBtn) {
      this.createFreitextBtn.addEventListener('click', () => {
        const input = this.freitextInput;
        const text = input ? input.value.trim() : '';
        if (text) {
          this.createCustomSnippet(text);
          if (input) {
            input.value = '';
          }
        }
      });
    }

    if (this.previewBox) {
      this.previewBox.addEventListener('dragenter', () => {
        this.previewBox.classList.add('drop-target');
      });

      this.previewBox.addEventListener('dragover', (event) => {
        event.preventDefault();
        const hasLibraryData = Boolean(event.dataTransfer.getData('application/json'));
        event.dataTransfer.dropEffect = hasLibraryData ? 'copy' : 'move';
        this.previewBox.classList.add('drop-target');
      });

      this.previewBox.addEventListener('dragleave', (event) => {
        if (!this.previewBox.contains(event.relatedTarget)) {
          this.previewBox.classList.remove('drop-target');
          this.clearDropIndicators();
        }
      });

      this.previewBox.addEventListener('drop', (event) => {
        event.preventDefault();
        this.previewBox.classList.remove('drop-target');
        this.clearDropIndicators();
        const libraryPayload = this.parseLibraryPayload(event.dataTransfer.getData('application/json'));
        if (libraryPayload) {
          this.addBaustein(libraryPayload.text);
          return;
        }
        const fromIndex = this.readDragIndex(event);
        if (!Number.isNaN(fromIndex)) {
          this.reorderBausteine(fromIndex, this.bausteine.length);
        }
      });
    }

    if (this.profileNameInput) {
      this.profileNameInput.addEventListener('change', () => {
        const newName = this.profileNameInput.value.trim();
        if (newName && this.activeProfile) {
          this.renameProfile(this.activeProfile, newName);
        }
      });
    }

    if (this.newProfileBtn) {
      this.newProfileBtn.addEventListener('click', () => {
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
    }
  }

  async init() {
    this.presetPath = this.resolvePresetPath();
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

  resolvePresetPath() {
    if (typeof window === 'undefined') {
      return this.defaultPresetPath;
    }

    try {
      const storage = window.localStorage;
      if (!storage) {
        return this.defaultPresetPath;
      }

      const storedPath = storage.getItem(this.presetPathStorageKey);
      if (storedPath && typeof storedPath === 'string' && storedPath.trim()) {
        return storedPath.trim();
      }

      storage.setItem(this.presetPathStorageKey, this.defaultPresetPath);
    } catch (error) {
      console.warn('KVEditor Presets: Zugriff auf localStorage nicht möglich. Fallback auf Standardpfad.', error);
      return this.defaultPresetPath;
    }

    return this.defaultPresetPath;
  }

  persistPresetPath(path) {
    if (typeof window === 'undefined' || !path) {
      return;
    }

    try {
      const storage = window.localStorage;
      if (storage) {
        storage.setItem(this.presetPathStorageKey, path);
      }
    } catch (error) {
      console.warn('KVEditor Presets: Konnte Pfad nicht im localStorage speichern.', error);
    }
  }

  setPresetPath(path) {
    if (typeof path !== 'string') {
      return;
    }

    const trimmedPath = path.trim();
    if (!trimmedPath) {
      return;
    }

    this.presetPath = trimmedPath;
    this.persistPresetPath(trimmedPath);
    this.loadPresets()
      .then(() => {
        this.renderPresetLibrary();
      })
      .catch((error) => {
        console.error('KVEditor Presets: Fehler beim Anwenden des neuen Pfads.', error);
      });
  }

  async loadPresets() {
    const tried = new Set();
    const tryLoad = async (path) => {
      if (!path || tried.has(path)) {
        return false;
      }
      tried.add(path);
      try {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Konnte Preset-Datei nicht laden (Status ${response.status}).`);
        }
        const data = await response.json();
        this.presets = Array.isArray(data.presets) ? data.presets : [];
        this.loadedPresetPath = path;
        return true;
      } catch (error) {
        console.error(`Fehler beim Laden der Presets von ${path}:`, error);
        return false;
      }
    };

    const preferredPath = this.presetPath || this.resolvePresetPath();
    let success = await tryLoad(preferredPath);

    const legacyPaths = ['KV_Presets.json', 'modules/KVEditor/KV_Presets.json'];
    if (!success && legacyPaths.includes(preferredPath)) {
      this.persistPresetPath(this.defaultPresetPath);
      this.presetPath = this.defaultPresetPath;
      success = await tryLoad(this.defaultPresetPath);
      if (success) {
        console.info('KVEditor Presets: Legacy-Pfad migriert auf configs/kv_editor_presets.config.json.');
      }
    }

    if (!success && preferredPath !== this.defaultPresetPath) {
      success = await tryLoad(this.defaultPresetPath);
      if (success) {
        console.warn(`KVEditor Presets: Fallback auf ${this.defaultPresetPath} verwendet.`);
      }
    }

    if (!success) {
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
      const item = this.createCustomSnippetItem(snippet);
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

    const actions = document.createElement('div');
    actions.className = 'library-item-actions';
    header.appendChild(actions);

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
      actions.appendChild(removeBtn);
    }

    const textEl = document.createElement('div');
    textEl.className = 'library-item-text';
    textEl.textContent = text;

    item.appendChild(header);
    item.appendChild(textEl);

    return item;
  }

  createCustomSnippetItem(snippet) {
    const item = document.createElement('div');
    item.className = 'library-item';
    item.draggable = true;

    const getLatestSnippet = () => this.customSnippets.find((entry) => entry.id === snippet.id) || snippet;
    let isEditing = false;

    item.addEventListener('dragstart', (event) => {
      const latest = getLatestSnippet();
      const textForTransfer = latest.text || '';
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/json', JSON.stringify({ source: 'library', text: textForTransfer }));
    });

    item.addEventListener('dblclick', () => {
      if (isEditing) {
        return;
      }
      const latest = getLatestSnippet();
      this.addBaustein(latest.text);
    });

    const header = document.createElement('div');
    header.className = 'library-item-header';

    const titleEl = document.createElement('p');
    titleEl.className = 'library-item-title';
    titleEl.textContent = 'Freitext';
    header.appendChild(titleEl);

    const actions = document.createElement('div');
    actions.className = 'library-item-actions';
    header.appendChild(actions);

    const editBtn = document.createElement('button');
    editBtn.className = 'library-item-edit';
    editBtn.title = 'Freitext bearbeiten';
    editBtn.textContent = '✎';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'library-item-remove';
    removeBtn.title = 'Freitext löschen';
    removeBtn.textContent = '✖';
    removeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this.removeCustomSnippet(snippet.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(removeBtn);

    const textEl = document.createElement('div');
    textEl.className = 'library-item-text';
    textEl.textContent = snippet.text;
    textEl.contentEditable = 'false';
    textEl.spellcheck = false;
    textEl.setAttribute('draggable', 'false');

    const exitEditing = (revertToOriginal = false) => {
      isEditing = false;
      textEl.contentEditable = 'false';
      textEl.classList.remove('editing');
      editBtn.classList.remove('save');
      editBtn.textContent = '✎';
      editBtn.title = 'Freitext bearbeiten';
      if (revertToOriginal) {
        const latest = getLatestSnippet();
        textEl.textContent = latest.text;
      }
    };

    const commitEditing = () => {
      const latest = getLatestSnippet();
      const originalText = latest.text || '';
      const updatedText = (textEl.textContent || '').trim();
      if (!updatedText) {
        exitEditing(true);
        return;
      }
      exitEditing();
      if (updatedText !== originalText) {
        this.updateCustomSnippet(snippet.id, updatedText);
      } else {
        textEl.textContent = originalText;
      }
    };

    const startEditing = () => {
      if (isEditing) {
        return;
      }
      isEditing = true;
      textEl.contentEditable = 'true';
      textEl.classList.add('editing');
      editBtn.classList.add('save');
      editBtn.textContent = '💾';
      editBtn.title = 'Freitext speichern (Strg/Cmd+Enter)';
      textEl.focus();
      this.placeCaretAtEnd(textEl);
    };

    editBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!isEditing) {
        startEditing();
        return;
      }
      commitEditing();
    });

    textEl.addEventListener('keydown', (event) => {
      if (!isEditing) {
        return;
      }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        commitEditing();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        exitEditing(true);
      }
    });

    textEl.addEventListener('blur', () => {
      if (isEditing) {
        commitEditing();
      }
    });

    item.appendChild(header);
    item.appendChild(textEl);

    return item;
  }

  updateCustomSnippet(id, newText) {
    const trimmed = (newText || '').trim();
    if (!trimmed) {
      return;
    }
    const index = this.customSnippets.findIndex((snippet) => snippet.id === id);
    if (index === -1) {
      return;
    }
    if (this.customSnippets[index].text === trimmed) {
      return;
    }
    this.customSnippets[index].text = trimmed;
    this.saveCustomSnippets();
    this.renderCustomSnippets();
  }

  placeCaretAtEnd(element) {
    if (!element || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  readDragIndex(event) {
    if (!event || !event.dataTransfer) {
      return Number.NaN;
    }
    const raw = event.dataTransfer.getData('text/plain');
    if (raw === undefined || raw === null || raw === '') {
      return Number.NaN;
    }
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? Number.NaN : parsed;
  }

  calculateDropPosition(event, element) {
    if (!element || typeof element.getBoundingClientRect !== 'function') {
      return { targetIndex: this.bausteine.length, dropAfter: true };
    }
    const rect = element.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const dropAfter = offsetY > rect.height / 2;
    const baseIndex = Number(element.dataset.index);
    const safeIndex = Number.isNaN(baseIndex) ? this.bausteine.length : baseIndex;
    const targetIndex = dropAfter ? safeIndex + 1 : safeIndex;
    return { targetIndex, dropAfter };
  }

  setDropIndicator(element, position) {
    if (!element) {
      return;
    }
    element.classList.remove('drop-before', 'drop-after');
    if (position === 'before') {
      element.classList.add('drop-before');
    } else if (position === 'after') {
      element.classList.add('drop-after');
    }
  }

  clearDropIndicator(element) {
    if (!element) {
      return;
    }
    element.classList.remove('drop-before', 'drop-after');
  }

  clearDropIndicators() {
    if (!this.previewBox) {
      return;
    }
    this.previewBox.querySelectorAll('.baustein').forEach((node) => {
      this.clearDropIndicator(node);
    });
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
    if (!this.previewBox) {
      return;
    }
    this.clearDropIndicators();
    this.previewBox.classList.remove('drop-target');
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
        const { dropAfter } = this.calculateDropPosition(event, item);
        this.setDropIndicator(item, dropAfter ? 'after' : 'before');
      });

      item.addEventListener('dragleave', (event) => {
        if (!item.contains(event.relatedTarget)) {
          this.clearDropIndicator(item);
        }
      });

      item.addEventListener('drop', (event) => {
        event.preventDefault();
        const libraryPayload = this.parseLibraryPayload(event.dataTransfer.getData('application/json'));
        const { targetIndex, dropAfter } = this.calculateDropPosition(event, item);
        this.clearDropIndicator(item);
        if (libraryPayload) {
          this.addBaustein(libraryPayload.text, targetIndex);
          return;
        }
        const fromIndex = this.readDragIndex(event);
        if (!Number.isNaN(fromIndex)) {
          if (!(fromIndex === targetIndex || (fromIndex + 1 === targetIndex && dropAfter))) {
            this.reorderBausteine(fromIndex, targetIndex);
          }
        }
      });

      item.addEventListener('dragend', () => {
        this.clearDropIndicator(item);
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

  reorderBausteine(fromIndex, toIndex) {
    if (Number.isNaN(fromIndex) || Number.isNaN(toIndex)) {
      return;
    }
    if (fromIndex < 0 || fromIndex >= this.bausteine.length) {
      return;
    }
    let targetIndex = Math.max(0, Math.min(toIndex, this.bausteine.length));
    if (fromIndex === targetIndex || fromIndex + 1 === targetIndex) {
      return;
    }
    const [moved] = this.bausteine.splice(fromIndex, 1);
    if (fromIndex < targetIndex) {
      targetIndex -= 1;
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

const globalScope = typeof window !== 'undefined' ? window : globalThis;

function renderKVEditor(mount) {
  const instance = new KVEditor({ mount });
  globalScope.__kvEditorInstance = instance;
  return instance;
}

globalScope.renderKVEditor = renderKVEditor;
globalScope.setKVEditorPresetPath = function setKVEditorPresetPath(path) {
  const instance = globalScope.__kvEditorInstance;
  if (instance && typeof instance.setPresetPath === 'function') {
    instance.setPresetPath(path);
  } else if (typeof window !== 'undefined' && typeof path === 'string') {
    const trimmed = path.trim();
    if (trimmed) {
      try {
        const storage = window.localStorage;
        if (storage) {
          storage.setItem('kvEditorPresetPath', trimmed);
        }
      } catch (error) {
        console.warn('KVEditor Presets: Konnte Pfad nicht im localStorage hinterlegen.', error);
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderKVEditor };
}
