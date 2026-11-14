import { ImageLoader } from "../../sdk/utils/ImageLoader";
import InventImage from "../../assets/images/equipment/Magus_ring.png";
import { Ring } from "../../sdk/gear/Ring";
import { ItemName } from "../../sdk/ItemName";

/** V3 Inferno kit item. Stats are the OSRS Wiki values the calculator (tools/inferno_gear.py) reads. */
export class MagusRing extends Ring {
  inventorySprite: HTMLImageElement = ImageLoader.createImage(this.inventoryImage);

  get inventoryImage() {
    return InventImage;
  }
  get itemName(): ItemName {
    return ItemName.MAGUS_RING;
  }
  get weight(): number {
    return 0.0;
  }

  constructor() {
    super();
    this.bonuses = {
      attack: { stab: 0, slash: 0, crush: 0, magic: 15, range: 0 },
      defence: { stab: 0, slash: 0, crush: 0, magic: 0, range: 0 },
      other: { meleeStrength: 0, rangedStrength: 0, magicDamage: 0.02, prayer: 0 },
      targetSpecific: { undead: 0, slayer: 0 },
    };
  }
}
