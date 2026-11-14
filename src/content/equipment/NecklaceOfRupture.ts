import { ImageLoader } from "../../sdk/utils/ImageLoader";
import InventImage from "../../assets/images/equipment/Necklace_of_rupture.png";
import { Necklace } from "../../sdk/gear/Necklace";
import { ItemName } from "../../sdk/ItemName";

/** V3 Inferno kit item. Stats are the OSRS Wiki values the calculator (tools/inferno_gear.py) reads. */
export class NecklaceOfRupture extends Necklace {
  inventorySprite: HTMLImageElement = ImageLoader.createImage(this.inventoryImage);

  get inventoryImage() {
    return InventImage;
  }
  get itemName(): ItemName {
    return ItemName.NECKLACE_OF_RUPTURE;
  }
  get weight(): number {
    return 0.1;
  }

  constructor() {
    super();
    this.bonuses = {
      attack: { stab: 0, slash: 0, crush: 0, magic: 0, range: 20 },
      defence: { stab: 0, slash: 0, crush: 0, magic: 0, range: 0 },
      other: { meleeStrength: 0, rangedStrength: 8, magicDamage: 0.0, prayer: 3 },
      targetSpecific: { undead: 0, slayer: 0 },
    };
  }
}
