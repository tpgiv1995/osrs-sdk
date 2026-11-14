import { Mob } from "../Mob";
import { Pathing } from "../Pathing";
import { Unit } from "../Unit";
import { MagicWeapon } from "./MagicWeapon";
import { ProjectileOptions } from "./Projectile";
import { AttackBonuses } from "../gear/Weapon";
import { XpDrop } from "../XpDrop";
import { AttackStyle } from "../AttackStylesController";
import { V3Rules, spendSpellRunes } from "../V3Rules";

export class BarrageSpell extends MagicWeapon {
  get aoe() {
    return [
      { x: 0, y: 0 }, // always freeze middles first
      { x: -1, y: -1 },
      { x: -1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: 1, y: -1 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];
  }
  get attackRange() {
    return 10;
  }

  get attackSpeed() {
    return 5;
  }

  get maxConcurrentHits() {
    return 9;
  }

  attackStyle() {
    return AttackStyle.AUTOCAST;
  }

  /** Base max hit before magic damage bonuses (wiki): Ice Barrage 30, Blood Barrage 29. */
  get baseDamage(): number {
    return 30;
  }

  cast(from: Unit, to: Unit): boolean {
    if (V3Rules.calculator && !spendSpellRunes(from, String(this.itemName))) {
      return false; // out of runes
    }
    const base = V3Rules.calculator ? this.baseDamage : 30;
    from.grantXp(new XpDrop("magic", 52));
    // calculate AoE magic effects
    if (this.aoe.length) {
      const alreadyCastedOn: Unit[] = [to];
      this.attack(from, to, { magicBaseSpellDamage: base, attackStyle: "magic" });
      this.aoe.forEach((point) => {
        Pathing.mobsAtAoeOffset(from.region, to, point).forEach((mob: Mob) => {
          if (alreadyCastedOn.length > this.maxConcurrentHits) {
            return;
          }
          if (alreadyCastedOn.indexOf(mob) > -1) {
            return;
          }
          alreadyCastedOn.push(mob);
          this.attack(
            from,
            mob,
            { magicBaseSpellDamage: base, attackStyle: "magic", isSecondaryTarget: true },
            { hidden: true },
          );
        });
      });
    } else {
      this.attack(from, to, { magicBaseSpellDamage: base, attackStyle: "magic" });
    }
    return true;
  }

  attack(from: Unit, to: Unit, bonuses: AttackBonuses = {}, options: ProjectileOptions = {}): boolean {
    options.forceSWTile = true;
    return super.attack(from, to, bonuses, options);
  }
}
