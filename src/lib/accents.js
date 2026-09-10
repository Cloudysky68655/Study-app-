// The old per-account "accent color" system (and the 18-palette system
// before it) was retired when the app was rebuilt to match the Silent
// Moon reference — there's one fixed look now, defined entirely in
// globals.css's :root / html.mode-dark blocks.
//
// applyAccentVars is kept as a no-op (rather than removed) because every
// page (Today/Study/Tasks/Habits/Notes) still calls it on mount/mode-
// change with whatever palette key is saved in that account's old
// user_settings row. Deleting the export would break five call sites for
// no benefit; a no-op means old saved palette values are simply ignored
// and the CSS defaults always win.
export function applyAccentVars() {}

// getAccent/ACCENTS are no longer used anywhere, but are kept as
// harmless no-op exports in case anything still imports them.
export const ACCENTS = [];
export function getAccent() { return null; }
