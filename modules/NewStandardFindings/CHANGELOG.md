# Changelog – New Standard Findings

Alle relevanten Änderungen ab Version 1.2.0 werden hier in Kurzform dokumentiert.

## Unreleased
- Keine Einträge.

## 1.8.21 – 2026-01-29
### Added
- Dropdown „Gerätestatus“ unter Reason for Removal ergänzt und grafisch mit dem Removal-Bereich gruppiert; Status wird in der History gespeichert und in den History-Dropdowns vor dem Datum angezeigt, mit automatischer Scrap-Auswahl bei passenden Findings-Labels.

## 1.8.11 – 2026-01-26
### Fixed
- Nonroutine-Ausgabefeld blendet sich jetzt sofort ein, sobald ein Finding mit Nonroutine-Status hinzugefügt wird.

## 1.8.10 – 2026-01-26
### Fixed
- Nonroutine-Ausgabefeld reagiert jetzt sofort auf Statuswechsel und blendet sich ohne Seitenreload ein oder aus.

## 1.8.7 – 2026-01-23
### Changed
- Bearbeiten- und Löschen-Icons der Findings-Eingaben sind jetzt schlichter und einfarbig gestaltet.

## 1.8.5 – 2026-01-23
### Fixed
- Custom-Findings speichern jetzt Bestellnummern und Mengen zuverlässig im Zustand, sodass sie nach dem Reload erhalten bleiben.

## 1.8.4 – 2026-01-23
### Fixed
- Bestellliste zeigt nur noch die hinterlegten Teilenummern statt Geräte-Partnummern.
- Customfindings werden inklusive Bestellnummern und Texten in der PN/SN-History gesichert, damit sie nach Reload wiederhergestellt werden.

## 1.7.1 – 2026-01-23
### Changed
- „Zuletzt verwendet“-Chips gruppieren identische Entries, zählen die Nutzungshäufigkeit, entfernen doppelte Labels in der Anzeige und sortieren nach Häufigkeit statt nach dem letzten Zugriff.

## 1.6.3 – 2026-01-23
### Changed
- Findings-Auswahlfeld nutzt jetzt etwa 60 % der Gesamtbreite, damit das Status-Dropdown kompakter bleibt.
- Der Nonroutine-Platzhalter übernimmt vorrangig den Text aus `nonRoutineFinding`, sofern vorhanden.

## 1.6.2 – 2026-01-22
### Changed
- Bestelllisten-Labelgruppen erscheinen jetzt in leicht abgedunkelten, abgerundeten Kästen zur besseren optischen Trennung.

## 1.6.1 – 2026-01-22
### Changed
- Bestellliste zeigt nur noch die Überschrift „Bestelliste“ ohne Geräte- oder „Also applies“-Zusatz.
- Statusgruppen in der Bestellliste haben jetzt jeweils eine eigene Kopier-Schaltfläche, und Trennlinien erscheinen nur noch zwischen den Statusabschnitten.
- Partnummern werden pro Finding-Label optisch gruppiert statt mit Trennlinien pro Zeile.

## 1.5.6 – 2026-01-19
### Changed
- History-Dropdown wählt beim Laden automatisch das neueste Ereignis und zeigt einen roten Hinweis, wenn ein älteres Ereignis aktiv ist.

## 1.4.7 – 2026-01-14
### Changed
- Der Bereich „Findings auswählen“ ist jetzt fest integriert und nicht mehr einklappbar.

## 1.4.6 – 2026-01-14
### Fixed
- Der eingeklappte Bereich „Findings auswählen“ bleibt sichtbar und unterscheidbar, damit er nicht wie ausgeblendet wirkt.

## 1.4.5 – 2026-01-14
### Changed
- Die Findings-Auswahl ist jetzt standardmäßig eingeklappt, damit der Startzustand dem Modulkopf entspricht.

## 1.4.4 – 2026-01-14
### Fixed
- Die Einklapplogik für den Bereich „Findings auswählen“ übernimmt jetzt die Modulkopf-Logik, sodass das Ein- und Ausklappen zuverlässiger reagiert.

## 1.3.7 – 2025-12-18
### Fixed
- Freitext-Profile übertragen ihre Inhalte jetzt für alle Ausgabefelder (Findings, Actions, Routine, Nonroutine) zuverlässig zurück in die Textfelder.
- Leere Freitext-Vorschauen zeigen je nach aktivem Tab den korrekten Platzhaltertext an.

## 1.3.6 – 2025-12-18
### Fixed
- Freitext-Vorschauen werden beim Schließen des Editors jetzt auch ohne neue Eingabe in das Routinefeld übernommen.

## 1.3.5 – 2025-12-15
### Fixed
- Zusätzliche Feld-Aliasse für Bestelltexte ergänzt, damit neue Shopguide-Findings-Dateien die korrekten Bestellinformationen übernehmen.
- Keyword `{routine}` entfernt jetzt den überflüssigen Prefix "Actions performed/to perform" aus den Routine-Texten.

## 1.3.4 – 2025-12-15
### Added
- Eigene Kontextmenüs für alle Kopierausgabefelder ergänzt, damit Presets direkt wie beim Routine-Ausgabefeld konfiguriert und das aktive Profil angezeigt werden kann.

## 1.3.3 – 2025-10-04
### Added
- Aspen-Autofill-Spalten können über das Keyword `aspen:<Spaltenname>` direkt in Freitexten genutzt werden.

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
