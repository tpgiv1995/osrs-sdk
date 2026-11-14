import { Item } from "../../sdk/Item";
import { ItemName } from "../../sdk/ItemName";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import Image from "../../assets/images/potions/Rune_pouch.png";

/** Rune pouch holding the Ice and Blood Barrage runes. The sim's spellbook casts without rune counts, so it is inert. */
export class RunePouch extends Item {
  inventorySprite: HTMLImageElement = ImageLoader.createImage(Image);

  constructor() {
    super();
    this.defaultAction = "Open";
  }

  get inventoryImage() {
    return Image;
  }
  get itemName(): ItemName {
    return ItemName.RUNE_POUCH;
  }
  get weight(): number {
    return 0.0;
  }
}
