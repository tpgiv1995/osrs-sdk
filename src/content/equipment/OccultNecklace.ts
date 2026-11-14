import { PLAYER_CACHE_ITEMS } from "../../assets/PlayerCacheItems";
import { Necklace } from "../../sdk/gear/Necklace";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import InventImage from "../../assets/images/equipment/Occult_necklace.png";
import { ItemName } from "../../sdk/ItemName";
import { V3Rules } from "../../sdk/V3Rules";

export class OccultNecklace extends Necklace {
  /** OSRS cache item id: the player is drawn from the cache model of every worn item. */
  override get cacheItemId(): number {
    return PLAYER_CACHE_ITEMS.occultNecklace.id;
  }

  inventorySprite: HTMLImageElement = ImageLoader.createImage(this.inventoryImage);

  get inventoryImage() {
    return InventImage;
  }
  get itemName(): ItemName {
    return ItemName.OCCULT_NECKLACE;
  }
  get weight(): number {
    return 0.005;
  }

  constructor() {
    super();
    this.bonuses = {
      attack: {
        stab: 0,
        slash: 0,
        crush: 0,
        magic: 12,
        range: 0,
      },
      defence: {
        stab: 0,
        slash: 0,
        crush: 0,
        magic: 0,
        range: 0,
      },
      other: {
        meleeStrength: 0,
        rangedStrength: 0,
        // V3 rules use the wiki bucket value the calculator reads (5%); upstream's 10% stays for legacy parity.
        magicDamage: V3Rules.calculator ? 0.05 : 0.1,
        prayer: V3Rules.calculator ? 2 : 0, // wiki value; upstream had 0
      },
      targetSpecific: {
        undead: 0,
        slayer: 0,
      },
    };
  }
}
