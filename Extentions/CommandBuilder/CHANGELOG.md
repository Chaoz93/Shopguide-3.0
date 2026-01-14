# Automation Command Builder Changelog

## [0.1.7] - 2026-01-14
### Changed
- Reorganized the command buttons into labeled groups and cleared the editor so it starts empty.

## [0.1.6] - 2026-01-14
### Added
- Added a WAITFORELEMENT command button with picker support and updated helper copy.

## [0.1.5] - 2025-12-19
### Fixed
- CLICK and INPUT commands now wrap selectors in quotes when inserted or picked so automation parsing keeps the full selector intact.
- Element selection caret positioning focuses on the value field to speed up INPUT authoring.

## [0.1.4] - 2025-12-19
### Fixed
- Element selections normalize whitespace so selectors stay valid when inserted into CLICK or INPUT commands.

## [0.1.3] - 2025-12-19
### Fixed
- Element picker now returns stable CSS selectors instead of generated IDs, avoiding lookup failures in the automation extension.
- UI copy updated to highlight selector-based CLICK and INPUT commands.

## [0.1.2] - 2025-12-18
### Added
- New WAIT command for delays and INPUT command to set text values on elements.
- Restructured command buttons for clearer grouping in the builder UI.

### Fixed
- Added host permissions to allow the picker overlay to start on any page without missing-permission errors.

## [0.1.0] - 2025-12-18
### Added
- Sidebar command builder with quick buttons for GOTO, WAITTOLOAD, and CLICK commands.
- "Try GOTO" helper to open the current URL in the active tab for validation.
- Element picker overlay that highlights elements, shows their names, and copies the selected ID into the CLICK command line.
