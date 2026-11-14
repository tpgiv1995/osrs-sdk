import { PLAYER_CACHE_ITEMS } from "../../assets/PlayerCacheItems";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import InventImage from "../../assets/images/equipment/Bandos_chestplate.png";
import { Chest } from "../../sdk/gear/Chest";
import { ItemName } from "../../sdk/ItemName";

/** V3 Inferno kit item. Stats are the OSRS Wiki values the calculator (tools/inferno_gear.py) reads. */
export class BandosChestplate extends Chest {
  /** OSRS cache item id: the player is drawn from the cache model of every worn item. */
  override get cacheItemId(): number {
    return PLAYER_CACHE_ITEMS.bandosChestplate.id;
  }

  inventorySprite: HTMLImageElement = ImageLoader.createImage(this.inventoryImage);

  get inventoryImage() {
    return InventImage;
  }
  get itemName(): ItemName {
    return ItemName.BANDOS_CHESTPLATE;
  }
  get weight(): number {
    return 9.0;
  }

  constructor() {
    super();
    this.bonuses = {
      attack: { stab: 0, slash: 0, crush: 0, magic: -15, range: -10 },
      defence: { stab: 98, slash: 93, crush: 105, magic: -6, range: 133 },
      other: { meleeStrength: 4, rangedStrength: 0, magicDamage: 0.0, prayer: 1 },
      targetSpecific: { undead: 0, slayer: 0 },
    };
  }
}
