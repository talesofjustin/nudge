// Fixed swatch set offered when creating a new category — kept to the
// existing pastel/violet palette rather than an open color wheel. Includes
// the hues already used by the seeded default categories (see the initial
// schema migration's handle_new_user trigger) plus the core palette tones.
export const CATEGORY_COLOR_SWATCHES: string[] = [
  "#60A5FA", // sky
  "#FBBF24", // amber
  "#F97066", // coral
  "#7C3AED", // violet-600
  "#34D399", // mint
  "#A855F7", // violet-400
  "#FB923C", // orange
  "#A3E635", // lime
  "#818CF8", // indigo
  "#4C1D95", // violet-800
  "#2DD4BF", // teal
];
