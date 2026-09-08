import InventoryImage from "../../assets/images/equipment/Saradomin_godsword.png";
import { AttackStyle, AttackStyleTypes } from "../../sdk/AttackStylesController";
import { ItemName } from "../../sdk/ItemName";
import { Sound } from "../../sdk/utils/SoundCache";
import { MeleeWeapon } from "../../sdk/weapons/MeleeWeapon";

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
