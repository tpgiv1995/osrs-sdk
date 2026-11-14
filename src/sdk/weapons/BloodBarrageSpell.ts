import { Unit } from "../Unit";
import { BarrageSpell } from "./BarrageSpell";
import { ProjectileOptions } from "./Projectile";
import { AttackBonuses } from "../gear/Weapon";
import { ItemName } from "../ItemName";
import { V3Rules } from "../V3Rules";
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

  attack(from: Unit, to: Unit, bonuses: AttackBonuses = {}, options: ProjectileOptions = {}): boolean {
    super.attack(from, to, bonuses, options);
    // The Blood ancient sceptre lets Blood spells overheal up to 10% over base Hitpoints (99 -> 108).
    const weapon = from.equipment && from.equipment.weapon;
    const overheal =
      V3Rules.calculator && weapon && weapon.itemName === ItemName.BLOOD_ANCIENT_SCEPTRE
        ? Math.floor(from.stats.hitpoint * 0.1)
        : 0;
    const ceiling = from.stats.hitpoint + overheal;
    if (from.currentStats.hitpoint < ceiling) {
      from.currentStats.hitpoint += Math.floor(this.damageRoll * 0.25);
      from.currentStats.hitpoint = Math.max(Math.min(ceiling, from.currentStats.hitpoint), 0);
    }
    return true;
  }
}
