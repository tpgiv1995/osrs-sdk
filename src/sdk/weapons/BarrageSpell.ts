import { Mob } from "../Mob";
import { Pathing } from "../Pathing";
import { Unit } from "../Unit";
import { MagicWeapon } from "./MagicWeapon";
import { ProjectileOptions } from "./Projectile";
import { AttackBonuses } from "../gear/Weapon";
import { XpDrop } from "../XpDrop";
import { AttackStyle } from "../AttackStylesController";
import { V3Rules, spendSpellRunes } from "../V3Rules";
import { PLAYER_CACHE_SPOTANIMS } from "../../assets/PlayerCacheItems";
import { spawnGraphic, v3GraphicsEnabled, withImpact } from "../V3Graphics";

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

  /** Cache graphic played on every target the spell lands on (Ice Barrage 369, Blood Barrage 377). */
  get impactSpotAnim(): number {
    return PLAYER_CACHE_SPOTANIMS.iceBarrageImpact;
  }

  /**
   * The ice column is one flat colour, drawn unlit it would be a solid slab hiding the monsters; cap its opacity so the
   * target stays visible through it.
   */
  get impactOpacityCap(): number | undefined {
    return 0.4;
  }

  /**
   * V3: the barrages have no projectile in the game, only an impact graphic on each target when the spell lands
   * (the splash graphic when it does no damage), on the same tick the damage applies.
   */
  override registerProjectile(from: Unit, to: Unit, bonuses: AttackBonuses, options: ProjectileOptions = {}) {
    super.registerProjectile(
      from,
      to,
      bonuses,
      withImpact({ ...(v3GraphicsEnabled() ? { hidden: true } : {}), ...options }, (projectile) =>
        spawnGraphic(to, projectile.damage > 0 ? this.impactSpotAnim : PLAYER_CACHE_SPOTANIMS.splash, 0, this.impactOpacityCap),
      ),
    );
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
