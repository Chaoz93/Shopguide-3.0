# Automation Sidebar Changelog

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
