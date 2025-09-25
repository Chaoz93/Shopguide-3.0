# Changelog – New Standard Findings

Alle relevanten Änderungen ab Version 1.2.0 werden hier in Kurzform dokumentiert.

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
