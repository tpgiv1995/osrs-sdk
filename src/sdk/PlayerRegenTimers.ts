"use strict";

import { Player } from "./Player";
import { ItemName } from "./ItemName";

/** Combat stats that a boost raises and that then drain back to base over time. */
const DRAINABLE_STATS = ["attack", "strength", "defence", "range", "magic"] as const;

export class PlayerRegenTimer {
  player: Player;
  spec: number;
  hitpoint: number;
  statDrain: number;

  constructor(player: Player) {
    this.player = player;
    this.spec = 50;
    this.hitpoint = 100;
    this.statDrain = 100;
  }

  specUsed() {
    if (this.spec <= 0) {
      this.spec = 50;
    }
  }

  regen() {
    this.specRegen();
    this.hitpointRegen();
    this.statDrainRegen();
  }

  /**
   * Boosted combat stats drain one level per minute back toward base (and
   * lowered stats recover one level per minute up to base), matching OSRS. This
   * is what makes a super combat behave like a real potion instead of a
   * permanent boost.
   */
  statDrainRegen() {
    this.statDrain--;
    if (this.statDrain > 0) {
      return;
    }
    this.statDrain = 100;
    for (const stat of DRAINABLE_STATS) {
      const current = this.player.currentStats[stat];
      const base = this.player.stats[stat];
      if (current > base) {
        this.player.currentStats[stat] = current - 1;
      } else if (current < base) {
        this.player.currentStats[stat] = current + 1;
      }
    }
  }

  /** Lightbearer halves the 50-tick special energy interval. */
  specInterval() {
    return this.player.equipment.ring?.itemName === ItemName.LIGHTBEARER ? 25 : 50;
  }

  specRegen() {
    this.spec--;
    if (this.spec <= 0 || this.spec > this.specInterval()) {
      this.spec = this.specInterval();
      this.player.currentStats.specialAttack += 10;
      this.player.currentStats.specialAttack = Math.min(100, this.player.currentStats.specialAttack);
    }
  }

  hitpointRegen() {
    this.hitpoint--;
    if (this.hitpoint === 0) {
      this.hitpoint = 100;
      const currentHp = this.player.currentStats.hitpoint;
      const lvlHp = this.player.stats.hitpoint;
      const diff = currentHp === lvlHp ? 0 : currentHp > lvlHp ? -1 : 1;
      this.player.currentStats.hitpoint += diff;
    }
  }
}
