"use strict";

import { BasePrayer, PrayerGroups } from "../../sdk/BasePrayer";

/** Deadeye: Ranged accuracy and strength x1.18, Defence +5%. Factors live in the central table in sdk/V3Rules.ts (the calculator's PRAYERS table). */
export class Deadeye extends BasePrayer {
  get name() {
    return "Deadeye";
  }

  get groups() {
    // No DEFENCE group: Mystic Vigour and Deadeye stack with the skin prayers (wiki), their +5% Defence adds.
    return [PrayerGroups.ACCURACY, PrayerGroups.STRENGTH];
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
