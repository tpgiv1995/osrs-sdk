import { Item } from "../../sdk/Item";
import { ItemName } from "../../sdk/ItemName";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import Image from "../../assets/images/potions/Saturated_heart.png";
import { CACHE_ASSETS } from "../../assets/CacheAssets";

/** Inventory-only item from Pat's Colosseum setup; the action is inert in the trainer. */
export class SaturatedHeart extends Item {
  inventorySprite: HTMLImageElement = ImageLoader.createImage(Image);

  constructor() {
    super();
    this.defaultAction = "Invigorate";
  }

  get cacheItemId() {
    return CACHE_ASSETS.items.saturatedHeart.id;
  }
  get inventoryImage() {
    return Image;
  }
  get itemName(): ItemName {
    return ItemName.SATURATED_HEART;
  }
  get weight(): number {
    return 0.45;
  }
}
