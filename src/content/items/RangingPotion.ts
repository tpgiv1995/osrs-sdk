import OneDose from "../../assets/images/potions/Ranging_potion_1.png";
import TwoDose from "../../assets/images/potions/Ranging_potion_2.png";
import ThreeDose from "../../assets/images/potions/Ranging_potion_3.png";
import FourDose from "../../assets/images/potions/Ranging_potion_4.png";
import Vial from "../../assets/images/potions/Vial.png";
import { ItemName } from "../../sdk/ItemName";
import { Player } from "../../sdk/Player";
import { Potion } from "../../sdk/gear/Potion";
import { ImageLoader } from "../../sdk/utils/ImageLoader";

/** See drink(). */
export class RangingPotion extends Potion {
  oneDose: HTMLImageElement = ImageLoader.createImage(OneDose);
  twoDose: HTMLImageElement = ImageLoader.createImage(TwoDose);
  threeDose: HTMLImageElement = ImageLoader.createImage(ThreeDose);
  fourDose: HTMLImageElement = ImageLoader.createImage(FourDose);

  constructor(doses = 4) {
    super();
    this.doses = doses;
    this.updateInventorySprite();
  }

  get inventoryImage() {
    if (this.doses === 4) {
      return FourDose;
    } else if (this.doses === 3) {
      return ThreeDose;
    } else if (this.doses === 2) {
      return TwoDose;
    } else if (this.doses === 1) {
      return OneDose;
    }
    return Vial;
  }
  get itemName(): ItemName {
    return ItemName.RANGING_POTION;
  }

  /**
   * Ranging potion: Ranged +4 and +10% of the base level (99 -> 112), no Hitpoints cost. Like any boost it decays
   * one level a minute (Player.v3Tick), a Saradomin brew drains it, and drinking again re-boosts.
   */
  drink(player: Player) {
    super.drink(player);
    const boosted = player.stats.range + Math.floor(player.stats.range * 0.1) + 4;
    player.currentStats.range = Math.max(player.currentStats.range, boosted);
  }

  updateInventorySprite() {
    if (this.doses === 4) {
      this.inventorySprite = this.fourDose;
    } else if (this.doses === 3) {
      this.inventorySprite = this.threeDose;
    } else if (this.doses === 2) {
      this.inventorySprite = this.twoDose;
    } else if (this.doses === 1) {
      this.inventorySprite = this.oneDose;
    } else {
      this.inventorySprite = this.vial;
    }
  }
}
