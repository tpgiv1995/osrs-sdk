import { PLAYER_CACHE_ITEMS } from "../../assets/PlayerCacheItems";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import InventImage from "../../assets/images/equipment/Guthans_helm.png";
import { Helmet } from "../../sdk/gear/Helmet";
import { ItemName } from "../../sdk/ItemName";

/** V3 Inferno kit item. Stats are the OSRS Wiki values the calculator (tools/inferno_gear.py) reads. */
export class GuthansHelm extends Helmet {
  /** OSRS cache item id: the player is drawn from the cache model of every worn item. */
  override get cacheItemId(): number {
    return PLAYER_CACHE_ITEMS.guthansHelm.id;
  }

  inventorySprite: HTMLImageElement = ImageLoader.createImage(this.inventoryImage);

  get inventoryImage() {
    return InventImage;
  }
  get itemName(): ItemName {
    return ItemName.GUTHANS_HELM;
  }
  get weight(): number {
    return 0.0;
  }

  constructor() {
    super();
    this.bonuses = {
      attack: { stab: 0, slash: 0, crush: 0, magic: -6, range: -2 },
      defence: { stab: 55, slash: 58, crush: 54, magic: -1, range: 62 },
      other: { meleeStrength: 0, rangedStrength: 0, magicDamage: 0.0, prayer: 0 },
      targetSpecific: { undead: 0, slayer: 0 },
    };
  }
}
