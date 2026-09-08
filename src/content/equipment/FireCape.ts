import { ImageLoader } from "../../sdk/utils/ImageLoader";
import InventImage from "../../assets/images/equipment/Fire_cape.png";
import { Cape } from "../../sdk/gear/Cape";
import { ItemName } from "../../sdk/ItemName";
import { CACHE_ASSETS } from "../../assets/CacheAssets";

export class FireCape extends Cape {
  get cacheItemId(): number { return CACHE_ASSETS.items.fireCape.id; }
  inventorySprite: HTMLImageElement = ImageLoader.createImage(this.inventoryImage);

  get inventoryImage() {
    return InventImage;
  }
  get itemName(): ItemName {
    return ItemName.FIRE_CAPE;
  }
  get weight(): number {
    return 1.814;
  }

  constructor() {
    super();
    this.bonuses = {
      attack: { stab: 1, slash: 1, crush: 1, magic: 1, range: 1 },
      defence: { stab: 11, slash: 11, crush: 11, magic: 11, range: 11 },
      other: { meleeStrength: 4, rangedStrength: 0, magicDamage: 0, prayer: 2 },
      targetSpecific: { undead: 0, slayer: 0 },
    };
  }
}
