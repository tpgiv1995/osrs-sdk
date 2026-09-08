import { CrystalBody } from "./CrystalBody";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import InventImage from "../../assets/images/equipment/Crystal_body_Iorwerth.png";
import { CACHE_ASSETS } from "../../assets/CacheAssets";

/** Iorwerth-dyed CrystalBody: same stats, different cache model and sprite. */
export class CrystalBodyIorwerth extends CrystalBody {
  override get cacheItemId(): number { return CACHE_ASSETS.items.crystalBodyIorwerth.id; }
  override inventorySprite: HTMLImageElement = ImageLoader.createImage(InventImage);
  override get inventoryImage() {
    return InventImage;
  }
}
