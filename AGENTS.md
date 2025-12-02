# Agent Guidelines

- Follow the shared three-palette system (Main, Alternative, Accent) for module colors. Source layer names and colors from `window.appSettings.moduleColorLayers` first, then fall back to the root CSS variables `--module-layer-{1..3}-module-{bg,text,border}` and `--module-layer-{1..3}-name` managed by the options UI. Do **not** invent extra layers or hard-code palettes beyond minimal fallbacks to the base module colors.
- When creating or updating modules, mirror the ColorExample pattern: read the three presets, render only the configured entries, and apply each palette via CSS variables rather than inline literals. Keep the options menu copy aligned with the fixed three-group design ("Modul-Farbgruppen … Main, Alternative, Accent").
- Favor the Main and Alternative themes across the interface; reserve the Accent palette for subtle highlights only (about 10% of the module surface/controls).
- When editing a module or html, change the Version number of it depending on the severity of the change and update (or create) the corresponding changelog.
