"use strict";

import InventImage from "../../assets/images/equipment/Eye_of_ayak.png";
import { AttackStyle, AttackStyleTypes } from "../../sdk/AttackStylesController";
import { AttackBonuses } from "../../sdk/gear/Weapon";
import { ItemName } from "../../sdk/ItemName";
import { Unit, UnitTypes } from "../../sdk/Unit";
import { MagicWeapon } from "../../sdk/weapons/MagicWeapon";
import { ProjectileOptions } from "../../sdk/weapons/Projectile";
import { XpDrop } from "../../sdk/XpDrop";
import { eyeMax, prayerFactor } from "../../sdk/V3Rules";

/**
 * Eye of Ayak: a one-handed powered staff, 3-tick attack speed, with its own max hit
 * (floor(Magic / 3) - 6, plus the Magic damage bonus). Soul Rend, its special attack, costs 50% energy, takes
 * 5 ticks, doubles the attack roll, raises the max hit by 30%, and lowers the target's Magic defence bonus
 * by the damage it deals. Numbers follow tools/inferno_gear.py (eye_max, magic_attack_roll).
 */
export class EyeOfAyak extends MagicWeapon {
  /** Set while the swing in flight is Soul Rend, so the next attack delay is 5 ticks. */
  private lastSwingWasSpec = false;

  constructor() {
    super();
    this.bonuses = {
      attack: { stab: 0, slash: 0, crush: 0, magic: 30, range: 0 },
      defence: { stab: 1, slash: 5, crush: 5, magic: 10, range: 0 },
      other: { meleeStrength: 0, rangedStrength: 0, magicDamage: 0, prayer: 2 },
      targetSpecific: { undead: 0, slayer: 0 },
    };
  }

  get itemName(): ItemName {
    return ItemName.EYE_OF_AYAK;
  }

  get weight(): number {
    return 1.0;
  }

  get inventoryImage() {
    return InventImage;
  }

  get isTwoHander(): boolean {
    return false;
  }

  attackStyles() {
    return [AttackStyle.ACCURATE, AttackStyle.LONGRANGE];
  }

  attackStyleCategory(): AttackStyleTypes {
    return AttackStyleTypes.POWEREDSTAFF;
  }

  defaultStyle(): AttackStyle {
    return AttackStyle.ACCURATE;
  }

  get attackRange() {
    return this.attackStyle() === AttackStyle.LONGRANGE ? 8 : 6;
  }

  get attackSpeed() {
    return this.lastSwingWasSpec ? 5 : 3;
  }

  hasSpecialAttack(): boolean {
    return true;
  }

  specialAttackDrain(): number {
    return 50;
  }

  attack(from: Unit, to: Unit, bonuses: AttackBonuses = {}, options: ProjectileOptions = {}): boolean {
    this.lastSwingWasSpec = false;
    bonuses.attackStyle = "magic";
    if (bonuses.isAccurate === undefined) {
      bonuses.isAccurate = this.attackStyle() === AttackStyle.ACCURATE;
    }
    return super.attack(from, to, bonuses, options);
  }

  specialAttack(from: Unit, to: Unit, bonuses: AttackBonuses = {}, options: ProjectileOptions = {}) {
    bonuses.attackStyle = "magic";
    bonuses.isAccurate = this.attackStyle() === AttackStyle.ACCURATE;
    bonuses.isSpecialAttack = true;
    const performed = super.attack(from, to, bonuses, options);
    if (performed) {
      this.lastSwingWasSpec = true;
      // Soul Rend: the target's Magic defence bonus drops by the damage dealt.
      to.magicDefReduction = (to.magicDefReduction || 0) + this.damage;
    }
  }

  _attackRoll(from: Unit, to: Unit, bonuses: AttackBonuses) {
    const roll = super._attackRoll(from, to, bonuses);
    return bonuses.isSpecialAttack ? roll * 2 : roll;
  }

  /** Magic damage bonus in tenths of a percent: worn gear (stored as 1 + sum of fractions) plus the prayer. */
  magicDamageTenths(from: Unit, bonuses: AttackBonuses): number {
    const gear = Math.round((from.bonuses.other.magicDamage - 1) * 1000);
    return gear + (prayerFactor(bonuses.effectivePrayers && bonuses.effectivePrayers.magic).mdmgTenths || 0);
  }

  _maxHit(from: Unit, to: Unit, bonuses: AttackBonuses) {
    return eyeMax(from.currentStats.magic, this.magicDamageTenths(from, bonuses), !!bonuses.isSpecialAttack);
  }

  grantXp(from: Unit, to: Unit) {
    if (from.type === UnitTypes.PLAYER && this.damage > 0) {
      from.grantXp(new XpDrop("magic", this.damage * 2 * to.xpBonusMultiplier));
      from.grantXp(new XpDrop("hitpoint", this.damage * 1.33 * to.xpBonusMultiplier));
    }
  }
}
