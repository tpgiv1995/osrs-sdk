import InventoryImage from "../../assets/images/equipment/Saradomin_godsword.png";
import { AttackStyle, AttackStyleTypes } from "../../sdk/AttackStylesController";
import { ItemName } from "../../sdk/ItemName";
import { Sound } from "../../sdk/utils/SoundCache";
import { MeleeWeapon } from "../../sdk/weapons/MeleeWeapon";
import { AttackBonuses } from "../../sdk/gear/Weapon";
import { Unit } from "../../sdk/Unit";
import { Random } from "../../sdk/Random";
import { ProjectileOptions } from "../../sdk/weapons/Projectile";

import { cacheSound } from "../../sdk/audio/CacheSoundEffects";
import { CACHE_ASSETS } from "../../assets/CacheAssets";

export class SaradominGodsword extends MeleeWeapon {
  override get equipSoundId(): number {
    return CACHE_ASSETS.sounds.equipStaff.id;
  }

  get cacheItemId(): number { return CACHE_ASSETS.items.saradominGodsword.id; }
  constructor() {
    super();

    this.bonuses = {
      attack: { stab: 0, slash: 132, crush: 80, magic: 0, range: 0 },
      defence: { stab: 0, slash: 0, crush: 0, magic: 0, range: 0 },
      other: { meleeStrength: 132, rangedStrength: 0, magicDamage: 0, prayer: 8 },
      targetSpecific: { undead: 0, slayer: 0 },
    };
  }

  get weight(): number {
    return 10.0;
  }

  attackStyles() {
    return [AttackStyle.STAB, AttackStyle.AGGRESSIVESLASH, AttackStyle.DEFENSIVE];
  }

  attackStyleCategory(): AttackStyleTypes {
    return AttackStyleTypes.TWOHANDSWORD;
  }

  defaultStyle(): AttackStyle {
    return AttackStyle.AGGRESSIVESLASH;
  }

  get itemName(): ItemName {
    return ItemName.SARADOMIN_GODSWORD;
  }

  get isTwoHander(): boolean {
    return true;
  }

  hasSpecialAttack(): boolean {
    return true;
  }

  get attackRange() {
    return 1;
  }

  /**
   * Healing Blade: doubled accuracy, +10% max hit, and on a hit restores 50% of the
   * damage as Hitpoints (min 10) and 25% as Prayer (min 5). Costs 50% energy.
   */
  specialAttack(from: Unit, to: Unit, bonuses: AttackBonuses = {}, options: ProjectileOptions = {}): boolean {
    bonuses.attackStyle = "slash";
    bonuses.isSpecialAttack = true;
    this._calculatePrayerEffects(from, to, bonuses);
    bonuses.styleBonus = bonuses.styleBonus || 0;
    bonuses.voidMultiplier = bonuses.voidMultiplier || 1;
    bonuses.gearMeleeMultiplier = bonuses.gearMeleeMultiplier || 1;
    bonuses.overallMultiplier = (bonuses.overallMultiplier || 1) * 1.1;

    const attackRoll = this._attackRoll(from, to, bonuses) * 2;
    const defenceRoll = this._defenceRoll(from, to, bonuses);
    const hitChance = attackRoll > defenceRoll ? 1 - (defenceRoll + 2) / (2 * attackRoll + 1) : attackRoll / (2 * defenceRoll + 1);
    this.lastHitHit = false;
    let damage = 0;
    if (from.forceMaxDamageRollsOnNextAttack || Random.get() <= hitChance) {
      damage = this._calculateHitDamage(from, to, bonuses);
    }
    if (this.isBlockable(from, to, bonuses)) damage = 0;
    damage = Math.floor(Math.max(Math.min(to.currentStats.hitpoint, damage, this.getMaxDamageCap(bonuses)), 0));
    this.damageRoll = damage;
    this.damage = damage;

    if (damage > 0) {
      const heal = Math.max(10, Math.ceil(damage / 2));
      const prayer = Math.max(5, Math.ceil(damage / 4));
      from.currentStats.hitpoint = Math.min(from.stats.hitpoint, from.currentStats.hitpoint + heal);
      from.currentStats.prayer = Math.min(from.stats.prayer, from.currentStats.prayer + prayer);
    }

    this.grantXp(from, to);
    this.registerProjectile(from, to, bonuses, options);
    if (this.lastHitHit) from.consumeMaxDamageRollsOnNextAttack();
    return true;
  }

  get attackSpeed() {
    return 6;
  }

  get inventoryImage() {
    return InventoryImage;
  }




  get attackSound() {
    return new Sound(cacheSound(CACHE_ASSETS.sounds.meleeAttack.id), 0.1);
  }
}
