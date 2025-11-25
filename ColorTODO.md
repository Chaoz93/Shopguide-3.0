# Color TODO

This file tracks how each module currently handles colors and what to consider when unifying the color scheme system.

## Modules and color handling
- **Arbeitszeit** – Inline CSS uses module header/background variables for rows, menu, and buttons with static warn/ok accents; no module-layer awareness. 
- **ArbeitszeitOverview** – Renders with Tailwind-like gray button classes and white text; does not reference module palette variables.
- **AspenComments** – Dark inline palette mixing RGBA values with module header/text variables; no dynamic layer selection.
- **AspenUnitList (AspenBoard)** – Dark inline palette driven by custom `--ab-*` variables with fallbacks; no direct module-layer hook.
- **ColorExample** – Reads Main/Alternative/Accent palettes from `appSettings.moduleColorLayers` or root CSS variables and renders each as a color block.
- **DatenTest** – Uses minimal inline styling and inherits ambient colors; no custom palette logic.
- **Denkhilfe** – Relies on basic styling and inherited colors; no palette controls.
- **DragDropSyncTest** – Simple layout with default styles; no explicit color variables.
- **ExcelDataTest** – Basic table styling with inherited text colors; no module color integration.
- **FarblayerViewer** – Maintains its own FarblayerBase palette/groups with debug defaults and stored assignments; operates independently of module-layer settings.
- **Filebrowser** – Uses standard form/table styling and inherited colors without module-layer hooks.
- **GeräteListe** – Applies simple list styles with inherited text colors; no dynamic palette support.
- **Gerätedaten** – Provides color dropdowns and previews tied to module/header/button CSS variables with fallbacks; syncs colors through module settings.
- **Kantine** – Minimal styling relying on inherited colors; no palette configuration.
- **KVEditor** – Hardcoded dark theme with numerous explicit color values; no module-layer usage.
- **LinkButtonsPlus** – Extensive inline CSS using custom `--lbp-*` tokens seeded from module color layers and JSON palette sync; supports palette configuration.
- **Luna** – Lightweight styling using inherited colors; no palette logic.
- **Namensregeln** – Simple forms with default colors; no module palette handling.
- **NewStandardFindings** – Dark themed UI using module header/text variables and RGBA highlights; no module-layer integration.
- **OneButtonLinks** – Dark button/card styling using header/text variables; no configurable palette.
- **SavedEvents** – Basic table/list styling with default colors; no palette controls.
- **ShopguideFindingsEditor** – Standard form styling with inherited colors; no module-layer awareness.
- **TabNavigator** – Minimal navigation styling using inherited colors; no palette logic.
- **UnitList** – Simple list and filter styling with inherited text colors; no module-layer hooks.
- **Workorder** – Uses default styling with inherited colors; no palette integration.

## Unification focus areas
- Bring **Gerätedaten**, **LinkButtonsPlus**, **FarblayerViewer**, and **ColorExample** onto a shared source of truth for palette data (e.g., the three preset module layers) to avoid divergent color-loading logic.
- Establish fallback rules so modules currently using hardcoded dark palettes (e.g., **AspenComments**, **KVEditor**, **NewStandardFindings**, **AspenUnitList**) can opt into the shared presets without breaking existing visuals.
- Provide a lightweight helper for modules that currently inherit default colors to read and apply the Main/Alternative/Accent presets when desired.
