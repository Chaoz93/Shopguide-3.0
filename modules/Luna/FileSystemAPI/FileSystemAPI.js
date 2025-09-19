(function() {
  function createUniqueId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function translatePermission(status) {
    switch (status) {
      case 'granted':
        return 'gewährt';
      case 'denied':
        return 'verweigert';
      case 'prompt':
        return 'Benutzeranfrage erforderlich';
      case 'unavailable':
        return 'nicht verfügbar';
      default:
        return status || 'unbekannt';
    }
  }

  async function evaluatePermission(handle, mode) {
    if (!handle.queryPermission || !handle.requestPermission) {
      return { status: 'unavailable', note: 'Dieser Browser stellt keine detaillierten Berechtigungsinformationen bereit.' };
    }

    try {
      let permission = await handle.queryPermission({ mode });
      if (permission === 'prompt') {
        permission = await handle.requestPermission({ mode });
      }
      return { status: permission };
    } catch (error) {
      return { status: 'denied', note: `Fehler beim Prüfen der Berechtigung (${mode}): ${error.message}` };
    }
  }

  async function probeDirectory(handle) {
    try {
      const iterator = handle.values();
      for await (const entry of iterator) {
        return { ok: true, note: `Zugriff erfolgreich. Beispiel-Eintrag: ${entry.name}` };
      }
      return { ok: true, note: 'Ordner ist leer, aber der Zugriff war erfolgreich.' };
    } catch (error) {
      return { ok: false, note: `Beim Lesen des Ordners ist ein Fehler aufgetreten: ${error.message}` };
    }
  }

  function determineFolderNameFromFiles(files) {
    for (const file of files) {
      if (file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split('/');
        if (parts.length > 0 && parts[0]) {
          return parts[0];
        }
      }
    }
    return files.length > 0 ? files[0].name : 'Ausgewählter Ordner';
  }

  function appendListItem(list, text) {
    const item = document.createElement('li');
    item.textContent = text;
    list.appendChild(item);
    return item;
  }

  function readFileSample(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve();
      reader.onerror = () => reject(reader.error || new Error('Unbekannter Fehler beim Lesen der Datei.'));
      reader.readAsArrayBuffer(file.slice(0, 16));
    });
  }

  async function inspectDirectoryHandle(handle, detailList) {
    appendListItem(detailList, `Ordner: ${handle.name}`);

    const problems = [];
    const readPermission = await evaluatePermission(handle, 'read');
    const writePermission = await evaluatePermission(handle, 'readwrite');

    const permissions = [
      { label: 'Leseberechtigung', info: readPermission },
      { label: 'Schreibberechtigung', info: writePermission }
    ];

    permissions.forEach(({ label, info }) => {
      const description = [`${label}: ${translatePermission(info.status)}`];
      if (info.note) {
        description.push(info.note);
      }
      appendListItem(detailList, description.join(' — '));
      if (info.status !== 'granted') {
        problems.push(`${label} ist ${translatePermission(info.status)}.`);
      }
    });

    const probeResult = await probeDirectory(handle);
    appendListItem(detailList, probeResult.note);
    if (!probeResult.ok) {
      problems.push('Beim Testen des Lesezugriffs ist ein Fehler aufgetreten.');
    }

    return problems;
  }

  async function inspectFileList(files, detailList) {
    const folderName = determineFolderNameFromFiles(files);
    appendListItem(detailList, `Ordner: ${folderName}`);
    appendListItem(detailList, `${files.length} Datei(en) vom Browser bereitgestellt.`);

    const hasRelativePath = files.some(file => file.webkitRelativePath && file.webkitRelativePath.includes('/'));
    if (!hasRelativePath) {
      appendListItem(detailList, 'Hinweis: Der Browser liefert keine Verzeichnisstruktur (webkitRelativePath fehlt).');
    }

    const fileToTest = files.find(file => file.size > 0) || files[0];
    if (fileToTest) {
      try {
        await readFileSample(fileToTest);
        appendListItem(detailList, `Leseprobe für "${fileToTest.name}" erfolgreich.`);
      } catch (error) {
        appendListItem(detailList, `Fehler beim Lesen der Datei "${fileToTest.name}": ${error.message}`);
        return ['Beim Lesen einer Datei ist ein Fehler aufgetreten.'];
      }
    } else {
      appendListItem(detailList, 'Der Ordner scheint keine Dateien zu enthalten, die gelesen werden können.');
    }

    appendListItem(detailList, 'Schreibzugriff kann mit dieser Methode nicht automatisch geprüft werden.');
    return [];
  }

  window.renderFileSystemAPI = function(targetDiv) {
    const containerId = createUniqueId('fsapi');
    const statusId = `${containerId}-status`;
    const detailId = `${containerId}-details`;
    const buttonId = `${containerId}-select`;
    const fileInputId = `${containerId}-fileinput`;

    targetDiv.innerHTML = `
      <div class="fsapi-module">
        <p>Wählen Sie einen Ordner aus, um die Zugriffsberechtigungen zu prüfen.</p>
        <button type="button" id="${buttonId}">Ordner auswählen</button>
        <input type="file" id="${fileInputId}" style="display:none" webkitdirectory directory mozdirectory multiple />
        <div id="${statusId}" class="fsapi-status"></div>
        <ul id="${detailId}" class="fsapi-details"></ul>
      </div>
    `;

    const statusDiv = document.getElementById(statusId);
    const detailList = document.getElementById(detailId);
    const selectButton = document.getElementById(buttonId);
    const fileInput = document.getElementById(fileInputId);

    const supportsDirectoryPicker = typeof window.showDirectoryPicker === 'function';
    if (!supportsDirectoryPicker) {
      statusDiv.textContent = 'Dieser Browser unterstützt die File System Access API nicht. Es wird ein Datei-Upload-Fallback verwendet, der auch in Firefox funktioniert.';
    }

    selectButton.addEventListener('click', async () => {
      selectButton.disabled = true;
      detailList.innerHTML = '';

      if (supportsDirectoryPicker) {
        statusDiv.textContent = 'Bitte wählen Sie einen Ordner aus…';
        try {
          const directoryHandle = await window.showDirectoryPicker();
          statusDiv.textContent = `Ordner "${directoryHandle.name}" ausgewählt. Prüfe Zugriff…`;
          const problems = await inspectDirectoryHandle(directoryHandle, detailList);
          statusDiv.textContent = problems.length === 0 ? 'Keine Zugriffsprobleme erkannt.' : problems.join(' ');
        } catch (error) {
          if (error && error.name === 'AbortError') {
            statusDiv.textContent = 'Ordnerauswahl wurde abgebrochen.';
          } else {
            statusDiv.textContent = `Fehler beim Öffnen des Ordners: ${error.message}`;
          }
        } finally {
          selectButton.disabled = false;
        }
      } else {
        statusDiv.textContent = 'Bitte wählen Sie einen Ordner aus…';
        fileInput.value = '';
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', async () => {
      detailList.innerHTML = '';
      const files = Array.from(fileInput.files || []);
      if (files.length === 0) {
        statusDiv.textContent = 'Ordnerauswahl wurde abgebrochen oder es wurden keine Dateien ausgewählt.';
        selectButton.disabled = false;
        return;
      }

      statusDiv.textContent = 'Ordner ausgewählt. Prüfe Zugriff…';
      try {
        const problems = await inspectFileList(files, detailList);
        statusDiv.textContent = problems.length === 0 ? 'Keine Zugriffsprobleme erkannt.' : problems.join(' ');
      } catch (error) {
        statusDiv.textContent = `Fehler beim Prüfen der Dateien: ${error.message}`;
      } finally {
        selectButton.disabled = false;
      }
    });
  };
})();
