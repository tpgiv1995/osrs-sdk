import { Item } from "../../sdk/Item";
import { ItemName } from "../../sdk/ItemName";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import Image from "../../assets/images/potions/Divine_rune_pouch.png";
import { CACHE_ASSETS } from "../../assets/CacheAssets";

/** Inventory-only item from Pat's Colosseum setup; the action is inert in the trainer. */
export class DivineRunePouch extends Item {
  inventorySprite: HTMLImageElement = ImageLoader.createImage(Image);

  constructor() {
    super();
    this.defaultAction = "Open";
  }

  get cacheItemId() {
    return CACHE_ASSETS.items.divineRunePouch.id;
  }
  get inventoryImage() {
    return Image;
  }
  get itemName(): ItemName {
    return ItemName.DIVINE_RUNE_POUCH;
  }
  get weight(): number {
    return 0.878;
  }
}
