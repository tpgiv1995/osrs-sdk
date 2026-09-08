import { BowOfFaerdhinen } from "./BowOfFaerdhinen";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import InventImage from "../../assets/images/equipment/Bow_of_Faerdhinen_c_Iorwerth.png";
import { CACHE_ASSETS } from "../../assets/CacheAssets";

/** Iorwerth-dyed Bow of Faerdhinen (c): same stats, different cache model and sprite. */
export class BowOfFaerdhinenIorwerth extends BowOfFaerdhinen {
  override get cacheItemId(): number { return CACHE_ASSETS.items.bowOfFaerdhinenIorwerth.id; }
  override inventorySprite: HTMLImageElement = ImageLoader.createImage(InventImage);
  override get inventoryImage() {
    return InventImage;
  }
}
