/**
 * Prayer book layouts: 30 slots (5 columns x 6 rows) holding a prayer's display
 * name or "" for an empty slot. `null` means the stock book order.
 */
export type PrayerLayout = string[];

export const PRAYER_LAYOUT_COLUMNS = 5;
export const PRAYER_LAYOUT_ROWS = 6;

/** Pat's RuneLite prayer book (screenshot 2026-09-08): hidden prayers stay blank. */
export const PAT_PRAYER_LAYOUT: PrayerLayout = [
  "Protect from Range", "Augury", "", "", "",
  "Protect from Magic", "Eagle Eye", "Steel Skin", "", "Rapid Heal",
  "Protect from Melee", "Piety", "", "", "Rapid Restore",
  "", "", "", "", "Retribution",
  "", "", "Protect Item", "Redemption", "Smite",
  "", "", "Incredible Reflexes", "Ultimate Strength", "",
];

export function isValidPrayerLayout(layout: unknown): layout is PrayerLayout {
  return Array.isArray(layout)
    && layout.length === PRAYER_LAYOUT_COLUMNS * PRAYER_LAYOUT_ROWS
    && layout.every((entry) => typeof entry === "string");
}
