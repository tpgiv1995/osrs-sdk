import { Unit } from "../Unit";
import { BarrageSpell } from "./BarrageSpell";
import { ProjectileOptions } from "./Projectile";
import { AttackBonuses } from "../gear/Weapon";
import { ItemName } from "../ItemName";
import { V3Rules, onLanding } from "../V3Rules";
import { PLAYER_CACHE_SPOTANIMS } from "../../assets/PlayerCacheItems";
import { Sound, SoundCache } from "../utils/SoundCache";
import BloodBarrageSound from "../../assets/sounds/blood_barrage.ogg"

export class BloodBarrageSpell extends BarrageSpell {
  constructor(projectileRules?: ProjectileOptions) {
    super(projectileRules);
    SoundCache.preload(this.attackSound.src);
  }
  
  override get attackSound() {
    return new Sound(BloodBarrageSound, 0.1);
  }

  get itemName(): ItemName {
    return ItemName.BLOOD_BARRAGE;
  }

  override get impactSpotAnim(): number {
    return PLAYER_CACHE_SPOTANIMS.bloodBarrageImpact;
  }

  get baseDamage(): number {
    return 29;
  }

  attack(from: Unit, to: Unit, bonuses: AttackBonuses = {}, options: ProjectileOptions = {}): boolean {
    super.attack(from, to, bonuses, options);
    const rolled = this.damageRoll;
    if (V3Rules.calculator) {
      // Lifesteal applies when the spell lands, the same tick its damage does.
      onLanding(from, to, () => this.leech(from, rolled));
    } else {
      this.leech(from, rolled);
    }
    return true;
  }

  private leech(from: Unit, rolled: number) {
    // Life leech (wiki): 25% of the damage the spell would do, 27.5% with the sceptre, even on a target with little
    // Hitpoints left. The Blood ancient sceptre also lets Blood spells overheal up to 10% over base Hitpoints (99 -> 108).
    const weapon = from.equipment && from.equipment.weapon;
    const overheal =
      V3Rules.calculator && weapon && weapon.itemName === ItemName.BLOOD_ANCIENT_SCEPTRE
        ? Math.floor(from.stats.hitpoint * 0.1)
        : 0;
    const ceiling = from.stats.hitpoint + overheal;
    if (from.currentStats.hitpoint < ceiling) {
      const permille = V3Rules.calculator && overheal > 0 ? 275 : 250;
      from.currentStats.hitpoint += Math.floor((rolled * permille) / 1000);
      from.currentStats.hitpoint = Math.max(Math.min(ceiling, from.currentStats.hitpoint), 0);
    }
  }
}
