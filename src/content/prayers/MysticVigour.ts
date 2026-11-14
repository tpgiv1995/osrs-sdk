"use strict";

import { BasePrayer, PrayerGroups } from "../../sdk/BasePrayer";

/** Mystic Vigour: Magic accuracy x1.18, Magic damage +3%, Magic defence x1.18, Defence +5%. Factors live in the central table in sdk/V3Rules.ts (the calculator's PRAYERS table). */
export class MysticVigour extends BasePrayer {
  get name() {
    return "Mystic Vigour";
  }

  get groups() {
    return [PrayerGroups.ACCURACY, PrayerGroups.STRENGTH, PrayerGroups.DEFENCE];
  }

  levelRequirement(): number {
    return 80;
  }

  isOverhead() {
    return false;
  }

  feature() {
    return "offensiveMagic";
  }

  drainRate(): number {
    return 12;
  }
}
