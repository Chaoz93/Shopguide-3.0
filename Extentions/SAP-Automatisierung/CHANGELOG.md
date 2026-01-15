# SAP-Automatisierung Changelog

## [0.2.7] - 2026-01-15
### Changed
- Added debug logging that dumps the first two radio option details for troubleshooting detection.

## [0.2.6] - 2026-01-14
### Changed
- Expanded radio detection to associate labels with inputs and check state attributes/class markers.

## [0.2.5] - 2026-01-14
### Changed
- Expanded radio detection to check nested inputs, aria/data state attributes, and selection-like classes.

## [0.2.4] - 2026-01-14
### Added
- Added radio-option detection to populate the top-right grid cell based on the active SAP selection.

## [0.2.3] - 2026-01-14
### Changed
- Improved the Enter submission simulation to dispatch full key events and submit the form when available.

## [0.2.2] - 2026-01-14
### Changed
- Added a short delay between filling the SAP input and submitting with Enter.

## [0.2.1] - 2026-01-14
### Added
- Added SAP sequence steps for enter submission and title clicking, plus Run/Stop visuals with vignette during execution.

## [0.2.0] - 2026-01-14
### Added
- Added a SAP run sequence that opens the WebGUI, waits for the target field, and fills it with the top-left grid value.

## [0.1.5] - 2026-01-14
### Added
- Added arrow key navigation to move cell focus and selection.

## [0.1.4] - 2026-01-14
### Added
- Added column headers and enabled copy-to-clipboard for selected grid ranges.

## [0.1.3] - 2026-01-14
### Fixed
- Improved drag selection tracking across cells and kept Backspace editing to single-character deletes.

## [0.1.2] - 2026-01-14
### Added
- Enabled left-click drag selection only and added Enter-to-move-down focus behavior for grid cells.

## [0.1.1] - 2026-01-14
### Added
- Added drag selection and delete-to-clear behavior for grid cells, keeping one empty row at the bottom.

## [0.1.0] - 2026-01-14
### Added
- Initial SAP-Automatisierung sidebar scaffold with a light gray theme, data grid entry, and placeholder run control.
