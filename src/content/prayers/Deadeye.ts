"use strict";

import { BasePrayer, PrayerGroups } from "../../sdk/BasePrayer";

/** Deadeye: Ranged accuracy and strength x1.18, Defence +5%. Factors live in the central table in sdk/V3Rules.ts (the calculator's PRAYERS table). */
export class Deadeye extends BasePrayer {
  get name() {
    return "Deadeye";
  }

  get groups() {
    return [PrayerGroups.ACCURACY, PrayerGroups.STRENGTH, PrayerGroups.DEFENCE];
  }

  levelRequirement(): number {
    return 62;
  }

  isOverhead() {
    return false;
  }

  feature() {
    return "offensiveRange";
  }

  drainRate(): number {
    return 12;
  }
}
