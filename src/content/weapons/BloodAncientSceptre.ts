"use strict";

import InventoryImage from "../../assets/images/equipment/Blood_ancient_sceptre.png";
import { AttackStyle, AttackStyleTypes } from "../../sdk/AttackStylesController";
import { AttackBonuses } from "../../sdk/gear/Weapon";
import { ItemName } from "../../sdk/ItemName";
import { Unit } from "../../sdk/Unit";
import { BarrageSpell } from "../../sdk/weapons/BarrageSpell";
import { IceBarrageSpell } from "../../sdk/weapons/IceBarrageSpell";
import { MeleeWeapon } from "../../sdk/weapons/MeleeWeapon";

/**
 * Blood ancient sceptre. It autocasts Ice Barrage; a Blood Barrage picked from the spellbook heals the player
 * and, while the sceptre is wielded, can overheal up to 10% over base Hitpoints (see BloodBarrageSpell).
 * Stats are the OSRS Wiki values used by tools/inferno_gear.py.
 */
export class BloodAncientSceptre extends MeleeWeapon {
  autocastSpell: BarrageSpell = new IceBarrageSpell();

  constructor() {
    super();

    this.bonuses = {
      attack: { stab: 20, slash: -1, crush: 50, magic: 20, range: 0 },
      defence: { stab: 2, slash: 3, crush: 1, magic: 15, range: 0 },
      other: { meleeStrength: 60, rangedStrength: 0, magicDamage: 0.1, prayer: -1 },
      targetSpecific: { undead: 0, slayer: 0 },
    };
  }

  get weight(): number {
    return 2.267;
  }

  attack(from: Unit, to: Unit, bonuses: AttackBonuses = {}): boolean {
    if (this.attackStyle() === AttackStyle.AUTOCAST) {
      if (from.isPlayer) {
        this.autocastSpell.cast(from, to);
        return true;
      }
    }

    return super.attack(from, to, bonuses);
  }

  attackStyles() {
    return [AttackStyle.ACCURATE, AttackStyle.AGGRESSIVECRUSH, AttackStyle.DEFENSIVE, AttackStyle.AUTOCAST];
  }

  attackStyleCategory(): AttackStyleTypes {
    return AttackStyleTypes.STAFF;
  }

  defaultStyle(): AttackStyle {
    return AttackStyle.AUTOCAST;
  }

  get itemName(): ItemName {
    return ItemName.BLOOD_ANCIENT_SCEPTRE;
  }

  get isTwoHander(): boolean {
    return false;
  }

  hasSpecialAttack(): boolean {
    return false;
  }

  get attackRange() {
    return this.attackStyle() === AttackStyle.AUTOCAST ? 10 : 1;
  }

  get attackSpeed() {
    return this.attackStyle() === AttackStyle.AUTOCAST ? 5 : 4;
  }

  get inventoryImage() {
    return InventoryImage;
  }
}
