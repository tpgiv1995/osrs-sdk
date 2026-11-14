import { ImageLoader } from "../../sdk/utils/ImageLoader";
import InventImage from "../../assets/images/equipment/Radas_blessing_4.png";
import { Ammo, AmmoType } from "../../sdk/gear/Ammo";
import { ItemName } from "../../sdk/ItemName";

/** Rada's blessing 4: +2 prayer bonus, worn in the ammo slot like the Holy blessing. */
export class RadasBlessing4 extends Ammo {
  inventorySprite: HTMLImageElement = ImageLoader.createImage(this.inventoryImage);

  get inventoryImage() {
    return InventImage;
  }
  get itemName(): ItemName {
    return ItemName.RADAS_BLESSING_4;
  }
  get weight(): number {
    return 0.0;
  }

  ammoType(): AmmoType {
    return AmmoType.BLESSING;
  }

  constructor() {
    super();
    this.bonuses = {
      attack: { stab: 0, slash: 0, crush: 0, magic: 0, range: 0 },
      defence: { stab: 0, slash: 0, crush: 0, magic: 0, range: 0 },
      other: { meleeStrength: 0, rangedStrength: 0, magicDamage: 0.0, prayer: 2 },
      targetSpecific: { undead: 0, slayer: 0 },
    };
  }
}
