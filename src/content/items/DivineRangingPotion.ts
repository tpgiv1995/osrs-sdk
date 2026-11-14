import OneDose from "../../assets/images/potions/Divine_ranging_potion_1.png";
import TwoDose from "../../assets/images/potions/Divine_ranging_potion_2.png";
import ThreeDose from "../../assets/images/potions/Divine_ranging_potion_3.png";
import FourDose from "../../assets/images/potions/Divine_ranging_potion_4.png";
import Vial from "../../assets/images/potions/Vial.png";
import { ItemName } from "../../sdk/ItemName";
import { Player } from "../../sdk/Player";
import { Potion } from "../../sdk/gear/Potion";
import { ImageLoader } from "../../sdk/utils/ImageLoader";

/** See drink(). */
export class DivineRangingPotion extends Potion {
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
    return ItemName.DIVINE_RANGING_POTION;
  }

  /**
   * Divine ranging potion: Ranged +4 and +10%, costs 10% of Hitpoints, and holds the boost at full strength for
   * 5 minutes (500 ticks): a Saradomin brew's Ranged drain cannot pull it below the boosted level meanwhile.
   */
  drink(player: Player) {
    super.drink(player);
    const boosted = player.stats.range + Math.floor(player.stats.range * 0.1) + 4;
    player.currentStats.range = Math.max(player.currentStats.range, boosted);
    player.holdStat("range", boosted, 500);
    const cost = Math.round(player.stats.hitpoint * 0.1);
    player.currentStats.hitpoint = Math.max(1, player.currentStats.hitpoint - cost);
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
