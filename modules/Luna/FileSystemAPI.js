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
      // Versuchen, zumindest einen Eintrag zu lesen – das reicht für einen schnellen Test.
      for await (const entry of iterator) {
        return { ok: true, note: `Zugriff erfolgreich. Beispiel-Eintrag: ${entry.name}` };
      }
      return { ok: true, note: 'Ordner ist leer, aber der Zugriff war erfolgreich.' };
    } catch (error) {
      return { ok: false, note: `Beim Lesen des Ordners ist ein Fehler aufgetreten: ${error.message}` };
    }
  }

  window.renderFileSystemAPI = function(targetDiv, opts) {
    const containerId = createUniqueId('fsapi');
    const statusId = `${containerId}-status`;
    const detailId = `${containerId}-details`;
    const buttonId = `${containerId}-select`;

    targetDiv.innerHTML = `
      <div class="fsapi-module">
        <p>Wählen Sie einen Ordner aus, um die Zugriffsberechtigungen der File System Access API zu prüfen.</p>
        <button type="button" id="${buttonId}">Ordner auswählen</button>
        <div id="${statusId}" class="fsapi-status"></div>
        <ul id="${detailId}" class="fsapi-details"></ul>
      </div>
    `;

    const statusDiv = document.getElementById(statusId);
    const detailList = document.getElementById(detailId);
    const selectButton = document.getElementById(buttonId);

    if (!('showDirectoryPicker' in window)) {
      statusDiv.textContent = 'Die File System Access API wird von diesem Browser nicht unterstützt.';
      selectButton.disabled = true;
      return;
    }

    selectButton.addEventListener('click', async () => {
      selectButton.disabled = true;
      statusDiv.textContent = 'Bitte wählen Sie einen Ordner aus…';
      detailList.innerHTML = '';

      try {
        const directoryHandle = await window.showDirectoryPicker();
        statusDiv.textContent = `Ordner "${directoryHandle.name}" ausgewählt. Prüfe Zugriff…`;

        const readPermission = await evaluatePermission(directoryHandle, 'read');
        const writePermission = await evaluatePermission(directoryHandle, 'readwrite');

        const permissions = [
          { label: 'Leseberechtigung', info: readPermission },
          { label: 'Schreibberechtigung', info: writePermission }
        ];

        const problems = [];
        permissions.forEach(({ label, info }) => {
          const item = document.createElement('li');
          const description = [`${label}: ${translatePermission(info.status)}`];
          if (info.note) {
            description.push(info.note);
          }
          item.textContent = description.join(' — ');
          detailList.appendChild(item);
          if (info.status !== 'granted') {
            problems.push(`${label} ist ${translatePermission(info.status)}.`);
          }
        });

        const probeResult = await probeDirectory(directoryHandle);
        const probeItem = document.createElement('li');
        probeItem.textContent = probeResult.note;
        detailList.appendChild(probeItem);
        if (!probeResult.ok) {
          problems.push('Beim Testen des Lesezugriffs ist ein Fehler aufgetreten.');
        }

        if (problems.length === 0) {
          statusDiv.textContent = 'Keine Zugriffsprobleme erkannt.';
        } else {
          statusDiv.textContent = problems.join(' ');
        }
      } catch (error) {
        if (error && error.name === 'AbortError') {
          statusDiv.textContent = 'Ordnerauswahl wurde abgebrochen.';
        } else {
          statusDiv.textContent = `Fehler beim Öffnen des Ordners: ${error.message}`;
        }
      } finally {
        selectButton.disabled = false;
      }
    });
  };
})();
