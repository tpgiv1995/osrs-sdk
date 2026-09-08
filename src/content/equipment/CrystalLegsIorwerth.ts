import { CrystalLegs } from "./CrystalLegs";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import InventImage from "../../assets/images/equipment/Crystal_legs_Iorwerth.png";
import { CACHE_ASSETS } from "../../assets/CacheAssets";

/** Iorwerth-dyed CrystalLegs: same stats, different cache model and sprite. */
export class CrystalLegsIorwerth extends CrystalLegs {
  override get cacheItemId(): number { return CACHE_ASSETS.items.crystalLegsIorwerth.id; }
  override inventorySprite: HTMLImageElement = ImageLoader.createImage(InventImage);
  override get inventoryImage() {
    return InventImage;
  }
}
