# KVEditor Changelog

## 2024-05-07
- JavaScript-Logik in eine separate Datei (`KVEditor.js`) ausgelagert, um Wiederverwendbarkeit und Wartbarkeit zu verbessern.
- Modul-Änderungen dokumentiert und neue Änderungsdatei hinzugefügt.

## 2025-10-15
- Preset-Datei in das neue Verzeichnis `configs/` verschoben und Standardpfad aktualisiert.
- KV-Editor speichert den verwendeten Preset-Pfad jetzt im `localStorage` und unterstützt ein dynamisches Umschalten über `setPresetPath`.
- Fallback- und Migrationslogik für alte Preset-Pfade ergänzt.
