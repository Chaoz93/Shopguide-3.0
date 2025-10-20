# Changelog – New Standard Findings

Alle relevanten Änderungen ab Version 1.2.0 werden hier in Kurzform dokumentiert.

## Unreleased
### Fixed
- Zusätzliche Feld-Aliasse für Bestelltexte ergänzt, damit neue Shopguide-Findings-Dateien die korrekten Bestellinformationen übernehmen.

## 1.2.4 – 2025-09-26
### Changed
- Die Kopierfunktion der Bestellliste liefert nur noch die identifizierten Teilenummern zurück, damit keine Mengenangaben mehr in andere Tools übertragen werden.

## 1.2.3 – 2025-09-29
### Added
- Schaltfläche zum Laden einer benutzerdefinierten Findings-Datei inklusive Speicherung des Dateipfads im Local Storage.
- Anzeige des aktuell verwendeten Findings-Dateipfads in der Kontextübersicht.
- Schnellaktionen im Kopfbereich öffnen direkt die zuletzt verwendeten Findings- oder Aspen-Dateien.

### Changed
- Ausgewählte Findings-Dateien werden beim Modulstart geladen und zwischen Browser-Tabs über Storage-Events synchron gehalten.

## 1.2.2 – 2025-09-28
### Fixed
- Tief verschachtelte Findings-Strukturen werden erkannt; Parser durchsucht nun auch Routine-, Nonroutine-, Parts-, Times- und Mods-Objekte nach passenden Aliasfeldern.
- Textaufbereitung formatiert Objektinhalte zeilenweise, sodass strukturierte Informationen aus alternativen JSON-Layouts lesbar bleiben.

## 1.2.1 – 2025-09-27
### Fixed
- Partnummern werden jetzt beim Import aus Findings-JSON, Aspen-Board, Dictionary und lokalen Zuständen konsequent getrimmt und in Großbuchstaben überführt.
- Historien- und Zustandseinträge migrieren automatisch auf die normalisierte Partnummer, sodass unterschiedliche Schreibweisen keine Duplikate mehr erzeugen.

## 1.2.0 – 2025-09-26
### Highlights
- Flexible Normalisierung für unterschiedliche JSON-Feldnamen (Findings, Actions, Routine, Mods usw.).
- Verbesserte Parserlogik für verschachtelte bzw. alternative Strukturen sowie Dictionary-Erkennung.
- Darstellung zusätzlicher Metadaten (Routine, Nonroutine, Parts, Times, Mods) direkt in Vorschau und Auswahl.
- Automatisches Befüllen der Bereiche Routine, Nonroutine und Bestellliste aus den Finding-Daten.
