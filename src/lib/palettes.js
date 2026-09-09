export const PALETTES = [
  { key: "dustyrose", name: "Dusty Rose", swatch: ["#f1dde0", "#d3d0e6", "#a3bad6", "#7e93ab"] },
  { key: "wine", name: "Wine", swatch: ["#d1556a", "#7a3350", "#3d2138", "#241730"] },
  { key: "sage", name: "Sage", swatch: ["#fdf3ea", "#d7e8cd", "#b3c9a8", "#8a9a80"] },
  { key: "deepnavy", name: "Deep Navy", swatch: ["#0f2247", "#23477a", "#34589c", "#4a7bc0"] },
  { key: "citrusmint", name: "Citrus Mint", swatch: ["#de8272", "#f5dd94", "#e3f5c0", "#a8ddce"] },
  { key: "periwinkle", name: "Periwinkle", swatch: ["#a8a8f2", "#b7c2fb", "#d6dafc", "#eef0fc"] },
  { key: "stone", name: "Stone", swatch: ["#b8c4cc", "#e8dfc8", "#cbb494", "#8a7368"] },
  { key: "rosepetal", name: "Rose Petal", swatch: ["#f6f2f2", "#f5e2e8", "#f5c9d8", "#dba9bf"] },
  { key: "caramel", name: "Caramel", swatch: ["#a48468", "#c8a888", "#e2c99a", "#fdf8e3"] },
  { key: "blossom", name: "Blossom", swatch: ["#f4c9c6", "#fbe0dd", "#f7f5f5", "#8681a0"] },
  { key: "indigodream", name: "Indigo Dream", swatch: ["#efeafd", "#d6d3f6", "#a9b0e0", "#3f4470"] },
  { key: "sunsetindigo", name: "Sunset Indigo", swatch: ["#f0bf62", "#52579e", "#6ea0c4", "#a7dced"] },
  { key: "cottoncandy", name: "Cotton Candy", swatch: ["#4a7ae0", "#c1b3f5", "#f8d6dd", "#fdf1ee"] },
  { key: "oceanmist", name: "Ocean Mist", swatch: ["#454868", "#2f7c9c", "#93d9c9", "#eef0ea"] },
  { key: "autumn", name: "Autumn", swatch: ["#c1401f", "#e8952c", "#fbeecb", "#46a6b6"] },
  { key: "forest", name: "Forest", swatch: ["#1b4332", "#2d6a4f", "#52b788", "#b7e4c7"] },
  { key: "slate", name: "Slate", swatch: ["#2b2d42", "#4a4e69", "#8d99ae", "#edf2f4"] },
  { key: "peach", name: "Peach", swatch: ["#ffcad4", "#f4acb7", "#9d8189", "#d8e2dc"] }
];

export function getPalette(key) {
  return PALETTES.find((p) => p.key === key) || null;
}

// Given a CSS var reference like "var(--purple)", returns the matching
// auto-contrast text color var, e.g. "var(--purple-ink)". Used anywhere a
// card/row/tile is filled solid with one of the 7 palette role colors and
// needs guaranteed-readable text on top, regardless of which palette (or
// none) is active.
export function inkFor(colorVar) {
  if (!colorVar || typeof colorVar !== "string" || !colorVar.startsWith("var(--")) return "var(--ink)";
  return colorVar.slice(0, -1) + "-ink)";
}

// The 7 palette role slots, in a stable round-robin order, for coloring
// lists that don't have a per-item user-chosen color (tasks, stat cards,
// schedule items) — cycles through the whole active palette evenly.
export const ROLE_CYCLE = ["var(--purple)", "var(--pink)", "var(--orange)", "var(--amber)", "var(--green)", "var(--red)", "var(--yellow)"];

// Deterministic palette-role pick for items that don't have a manually
// chosen color (tasks, etc.) — same id always maps to the same role, so a
// task's color stays stable across re-renders/groupings, while different
// tasks spread evenly across the whole palette.
export function roleForId(id) {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return ROLE_CYCLE[h % ROLE_CYCLE.length];
}
