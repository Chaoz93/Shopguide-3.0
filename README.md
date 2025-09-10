# Shopguide 3.0

## Overview

This project contains a single-page web application (`V3-1-7.html`) and a collection of pluggable modules under the `modules/` directory. The HTML file provides the main UI shell (top bar, sidebar, and grid layout). Modules are loaded dynamically and can render custom widgets inside the grid.

Each module is described by a JSON manifest (name, icon, script, default size, etc.) and, if necessary, accompanying JavaScript implementing `window.render*` functions. Example:

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

## Modules

- **Browser** (`Browser/Browser.json`) – static description of a file explorer starting at a fixed path.
- **DatenTest** (`DatenTest`) – shared/local text editor persisted via `module_data.json` and `localStorage`.
- **DeviceList** (`DeviceList`) – sortable list using jQuery UI.
- **Filebrowser** (`Filebrowser`) – minimal directory browser using the File System Access API.
- **Gerätedaten** (`Gerätedaten`) – record sheet stored in an Excel workbook; per‑instance config saved in `localStorage` and IndexedDB.
- **GeräteListe** (`GeräteListe`) – Excel‑backed device board with drag‑and‑drop and colour options.
- **Komplexes Modul** (`Komplexes Modul`) – JSON-defined workorder form with configurable fields and actions.
- **LinkButtons** (`LinkButtons`) – operations panel that opens maintenance links based on Excel lookup data.
- **MarkdownViewer** (`MarkdownViewer`) – loads and displays a chosen Markdown file.
- **Namensregeln** (`Namensregeln`) – prefix‑to‑name mapping managed via Excel and `localStorage`.
- **SavedEvents** (`SavedEvents`) – helper to navigate a Saved Events directory structure.
- **Workorder** (`Workorder`) – editable workorder viewer that watches an Aspen CSV and keeps notes in IndexedDB.

## Data Storage

### Browser `localStorage`

`V3-1-7.html` stores user data under several keys:

- `rememberRootMeta` – last chosen module root folder.
- `appSettings` – colours, layout, and other preferences.
- `modulesLayout` – tabs and grid layout information.

Modules persist their own documents in keys such as:

- `module_data_json_v1` (Shared & Local Text)
- `module_data_v1` (Record Sheet, Link Buttons, etc.)
- `namingRulesDoc` (Naming Rules)

These documents share a structure like:

```json
{
  "__meta": { "version": 1, "updatedAt": "ISO timestamp" },
  "general": { /* shared values across modules */ },
  "instances": { "instanceId": { /* per-instance data */ } }
}
```

### External Files

Many modules optionally persist data outside the browser using the File System Access API:

- JSON data file `module_data.json` (Shared & Local Text).
- Excel workbooks (`records.xlsx`, `naming-rules.xlsx`, dictionaries) for device data, naming rules, and link lookups.
- CSV file watched by the Workorder module.

File handles for these resources are stored in IndexedDB (`modulesApp` or `mw-db`) so the app can reconnect on subsequent loads.

## Running / Testing

This repository contains only static assets; there are no automated tests or build steps. Attempting `npm test` fails because no `package.json` is present.
