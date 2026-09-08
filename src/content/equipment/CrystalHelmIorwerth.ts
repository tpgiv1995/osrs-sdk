import { CrystalHelm } from "./CrystalHelm";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import InventImage from "../../assets/images/equipment/Crystal_helm_Iorwerth.png";
import { CACHE_ASSETS } from "../../assets/CacheAssets";

/** Iorwerth-dyed CrystalHelm: same stats, different cache model and sprite. */
export class CrystalHelmIorwerth extends CrystalHelm {
  override get cacheItemId(): number { return CACHE_ASSETS.items.crystalHelmIorwerth.id; }
  override inventorySprite: HTMLImageElement = ImageLoader.createImage(InventImage);
  override get inventoryImage() {
    return InventImage;
  }
}
