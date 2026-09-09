export const STYLES = ["liquid", "cartoon", "minimal"];
export const STYLE_NAMES = {
  liquid: "Liquid Glass",
  cartoon: "Cartoonish",
  minimal: "Minimal",
};

export const PALETTES = ["coral", "lavender", "pastel", "pink", "aqua", "ocean"];
export const PALETTE_NAMES = {
  coral: "Coral Breeze",
  lavender: "Lavender Dream",
  pastel: "Pastel Bloom",
  pink: "Pink Velvet",
  aqua: "Aqua Garden",
  ocean: "Ocean Mist",
};

export const PALETTE_SWATCHES = {
  coral: ["#FFF8E9", "#FE6D73", "#FFCB77", "#24E5D2", "#2584A7"],
  lavender: ["#F2F7EA", "#E2D9DF", "#DEAFDD", "#7586C9", "#B580D4"],
  pastel: ["#C56ED2", "#8090DD", "#ECF9F4", "#E3C493", "#D5ED86"],
  pink: ["#F2E5F8", "#BEDCFF", "#F5A4BB", "#CD81FF", "#CF4A8E"],
  aqua: ["#AEF5E5", "#36DFBD", "#4FE566", "#39887F", "#354C4A"],
  ocean: ["#319AC0", "#D5FFF2", "#BECAE0", "#A4FBF7", "#687FB7"],
};

export const DEFAULT_STYLE = "liquid";
export const DEFAULT_PALETTE = "coral";
export const DEFAULT_MODE = "dark";

export function normalizeStyle(style) {
  if (style === "dark") return "liquid";
  if (style === "solar" || style === "bloom" || style === "stitch") return "cartoon";
  return STYLES.includes(style) ? style : DEFAULT_STYLE;
}

export function normalizePalette(palette) {
  return PALETTES.includes(palette) ? palette : DEFAULT_PALETTE;
}

export function normalizeMode(mode) {
  return mode === "light" ? "light" : DEFAULT_MODE;
}

export function applyAppearance(style, palette, colorMode) {
  const s = normalizeStyle(style);
  const p = normalizePalette(palette);
  const m = normalizeMode(colorMode);
  document.documentElement.className = `theme-${s} palette-${p} mode-${m}`;
}
