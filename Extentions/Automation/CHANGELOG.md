# Automation Sidebar Changelog

## [0.6.12] - 2025-12-20
### Changed
- Unified the sidebar background to #303030 for a fully dark canvas that frames the logo.
- Thickened and brightened the blue loading ring so the running animation stays clearly visible around the logo.

## [0.6.11] - 2025-12-20
### Changed
- Darkened the logo cradle to #303030 and emphasized a visible blue loading ring while running.
- Added gradient slide animation when toggling Run/Stop and slimmed the control width.
- Kept the light #606060 backdrop with the refreshed spinner track.

## [0.6.10] - 2025-12-20
### Changed
- Lightened the background to a softer #606060 gray palette for the minimal UI.
- Made the spinner ring larger and brighter so the running animation is clearly visible.
- Narrowed the Run/Stop button to a slimmer centered layout.

## [0.6.9] - 2025-12-20
### Changed
- Enlarged the Lufthansa logo with refined spinner ring and tightened the Run/Stop control width for a sleeker layout.
- Lightened the gray background palette while keeping blue accents for the minimalist UI.

## [0.6.8] - 2025-12-20
### Changed
- Simplified the sidebar to a logo-first layout with a single Run/Stop control and subtle gray/blue styling.
- Runs clipboard instructions immediately with a stop toggle and a spinning ring indicator while active.
- Added a collapsible debug log that stays hidden by default but can be expanded for status details.

## [0.6.7] - 2025-12-19
### Fixed
- Input parsing now treats selectors and values as quoted pairs so complex selectors stay intact and text goes to the intended field.
- CLICK accepts quoted selectors without stripping spaces, preventing malformed targets.

## [0.6.6] - 2025-12-19
### Fixed
- Reworked CLICK and INPUT script injection to serialize arguments via function payloads, preventing unescaped line-break errors from any selector or text content.

## [0.6.5] - 2025-12-19
### Fixed
- Encoded CLICK and INPUT parameters before injecting scripts to prevent "string literal contains an unescaped line break" errors from complex selectors or text values.

## [0.6.4] - 2025-12-19
### Fixed
- Command parsing now preserves complex selectors (including descendant/child combinators) to avoid injected script errors.

## [0.6.3] - 2025-12-19
### Fixed
- CLICK and INPUT now accept CSS selectors in addition to element IDs and resolve elements more reliably.
- Status messages clarify selectors and reduce false "not found" errors when running scripts captured by the builder.

## [0.6.2] - 2025-12-18
### Added
- WAIT command to pause for a specified number of milliseconds between steps.
- INPUT command to set the value of a target element by ID with change/input events.

### Fixed
- Added host permissions so commands like CLICK can run on any page without missing-permission errors.
- Command runner now pauses on fatal errors and asks whether to continue or cancel.

## [0.6.0] - 2025-12-18
### Added
- New CLICK command that triggers an element click in the tracked tab using a provided element ID.
- Sidebar copy now highlights the CLICK and new helper extension workflow for gathering element IDs.

## [0.5.0] - 2025-05-23
### Added
- WAITTOLOAD now includes a post-complete settle period and watches for tab removal to avoid premature completion.
- GOTO validates the tracked tab, recreates it if missing, and retries navigation on invalid tab errors.
- Updated sidebar copy and manifest version for the improved single-tab workflow.

## [0.4.0] - 2025-05-23
### Added
- Single-tab chains now handle closed/invalid tabs gracefully, resetting the tracker when navigation fails.
- WAITTOLOAD observes tab removal while waiting and reports timeouts with clear logging.
- New CLOSE command to close the tracked tab and end the chain.
- Updated sidebar copy and manifest version for the new commands and behavior.

## [0.3.0] - 2025-05-23
### Added
- Command chains stay within a single tracked tab: GOTO opens or reuses it, WAITTOLOAD pauses until that tab finishes loading, and later GOTOs reuse the same tab.
- Updated sidebar copy and manifest version to reflect the single-tab workflow and new command flow.

## [0.2.0] - 2025-05-23
### Added
- WAITTOLOAD command that pauses execution until the active tab finishes loading, with timeout handling and activity logging.
- Updated sidebar copy to reflect the new command and manifest version bump.

## [0.1.0] - 2025-05-23
### Added
- Initial Firefox sidebar extension scaffold for running simple automation commands.
- Command input area with paste-from-clipboard support and run controls.
- GOTO command handler that opens the provided URL in a new tab with activity logging.
