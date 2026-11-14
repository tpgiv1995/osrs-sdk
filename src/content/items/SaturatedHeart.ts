import { Item } from "../../sdk/Item";
import { ItemName } from "../../sdk/ItemName";
import { Player } from "../../sdk/Player";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import Image from "../../assets/images/potions/Saturated_heart.png";

/**
 * Saturated heart: Magic +4 and +10% for 5 minutes, the boost does not decay, a Saradomin brew's Magic drain
 * cancels it, and it has a 5 minute cooldown. The state lives on the Player (useSaturatedHeart).
 */
export class SaturatedHeart extends Item {
  inventorySprite: HTMLImageElement = ImageLoader.createImage(Image);

  constructor() {
    super();
    this.defaultAction = "Invigorate";
  }

  get hasInventoryLeftClick(): boolean {
    return true;
  }

  inventoryLeftClick(player: Player) {
    player.interruptCombat();
    player.useSaturatedHeart();
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
