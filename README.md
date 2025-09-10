# Shopguide 3.0

## Überblick

Dieses Projekt enthält eine Single-Page-Webanwendung (`V3-1-7.html`) und eine Sammlung von einsteckbaren Modulen im Verzeichnis `modules/`. Die HTML-Datei stellt die Hauptoberfläche bereit (obere Leiste, Seitenleiste und Rasterlayout). Module werden dynamisch geladen und können eigene Widgets innerhalb des Rasters rendern.

Jedes Modul wird durch ein JSON-Manifest beschrieben (name, icon, script, Standardgröße usw.) und gegebenenfalls durch zugehöriges JavaScript, das `window.render*`-Funktionen implementiert. Beispiel:

```json
{
  "name": "Shared & Local Text",
  "icon": "📝",
  "script": "renderSharedLocal",
  "minW": 3,
  "minH": 3,
  "w": 4,
  "h": 3,
  "settings": {
    "title": "Shared & Local Text",
    "moduleKey": "sharedLocal"
  }
}
```

## Module

- **Browser** (`Browser/Browser.json`) – statische Beschreibung eines Dateibrowsers, der an einem festen Pfad startet.
- **DatenTest** (`DatenTest`) – geteilter/ lokaler Texteditor, der über `module_data.json` und `localStorage` gespeichert wird.
- **DeviceList** (`DeviceList`) – sortierbare Liste mit jQuery UI sowie Export und Import per Excel-Datei.
- **Filebrowser** (`Filebrowser`) – minimaler Verzeichnisbrowser mit der File System Access API.
- **Gerätedaten** (`Gerätedaten`) – Datenblatt, das in einer Excel-Arbeitsmappe gespeichert wird; pro Instanz werden Konfigurationen in `localStorage` und IndexedDB abgelegt.
- **GeräteListe** (`GeräteListe`) – Excel-basierte Gerätetafel mit Drag-and-Drop und Farboptionen.
- **Komplexes Modul** (`Komplexes Modul`) – JSON-definiertes Arbeitsauftragsformular mit konfigurierbaren Feldern und Aktionen.
- **LinkButtons** (`LinkButtons`) – Bedienpanel, das Wartungslinks anhand von Excel-Suchdaten öffnet.
- **MarkdownViewer** (`MarkdownViewer`) – lädt und zeigt eine ausgewählte Markdown-Datei an.
- **Namensregeln** (`Namensregeln`) – Zuordnung von Präfixen zu Namen, verwaltet über Excel und `localStorage`.
- **SavedEvents** (`SavedEvents`) – Hilfsmodul zum Navigieren in einer Saved-Events-Verzeichnisstruktur.
- **Workorder** (`Workorder`) – bearbeitbarer Arbeitsauftragsbetrachter, der eine Aspen-CSV überwacht und Notizen in IndexedDB speichert.

## Datenspeicherung

### Browser `localStorage`

`V3-1-7.html` speichert Benutzerdaten unter mehreren Schlüsseln:

- `rememberRootMeta` – zuletzt gewählter Modulstammordner.
- `appSettings` – Farben, Layout und andere Einstellungen.
- `modulesLayout` – Informationen zu Tabs und Rasterlayout.

Module speichern ihre eigenen Dokumente unter Schlüsseln wie:

- `module_data_json_v1` (Shared & Local Text)
- `module_data_v1` (Record Sheet, Link Buttons usw.)
- `namingRulesDoc` (Naming Rules)

Diese Dokumente haben eine Struktur wie:

```json
{
  "__meta": { "version": 1, "updatedAt": "ISO timestamp" },
  "general": { /* shared values across modules */ },
  "instances": { "instanceId": { /* per-instance data */ } }
}
```

### Externe Dateien

Viele Module speichern optional Daten außerhalb des Browsers über die File System Access API:

- JSON-Datei `module_data.json` (Shared & Local Text).
- Excel-Arbeitsmappen (`records.xlsx`, `naming-rules.xlsx`, Dictionaries) für Gerätedaten, Namensregeln und Link-Nachschlagen.
- CSV-Datei, die vom Workorder-Modul überwacht wird.

Dateihandles für diese Ressourcen werden in IndexedDB (`modulesApp` oder `mw-db`) gespeichert, damit die App bei späteren Ladevorgängen wieder darauf zugreifen kann.

## Ausführen / Testen

Dieses Repository enthält nur statische Assets; es gibt keine automatisierten Tests oder Build-Schritte. Der Versuch, `npm test` auszuführen, schlägt fehl, weil keine `package.json` vorhanden ist.
