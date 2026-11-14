"use strict";

import { BasePrayer, PrayerGroups } from "../../sdk/BasePrayer";

/** Mystic Vigour: Magic accuracy x1.18, Magic damage +3%, Magic defence x1.18, Defence +5%. Factors live in the central table in sdk/V3Rules.ts (the calculator's PRAYERS table). */
export class MysticVigour extends BasePrayer {
  get name() {
    return "Mystic Vigour";
  }

  get groups() {
    // No DEFENCE group: Mystic Vigour and Deadeye stack with the skin prayers (wiki), their +5% Defence adds.
    return [PrayerGroups.ACCURACY, PrayerGroups.STRENGTH];
  }

  levelRequirement(): number {
    return 63;
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
