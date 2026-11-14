import { Item } from "../../sdk/Item";
import { ItemName } from "../../sdk/ItemName";
import { ImageLoader } from "../../sdk/utils/ImageLoader";
import Image from "../../assets/images/potions/Divine_rune_pouch.png";

export interface PouchStack {
  rune: "Water" | "Death" | "Blood" | "Soul" | string;
  id: number;
  quantity: number;
}

/**
 * Divine rune pouch (l): four rune stacks (the saved Inferno v2 setup: 15,000 water, 2,525 death, 8,000 blood,
 * 8,000 soul). Ice Barrage and Blood Barrage spend their runes from it (V3 rules) and refuse to cast at zero.
 * Wiki costs: Ice Barrage 6 water + 4 death + 2 blood; Blood Barrage 4 death + 4 blood + 1 soul.
 */
export class DivineRunePouch extends Item {
  inventorySprite: HTMLImageElement = ImageLoader.createImage(Image);
  stacks: PouchStack[];

  constructor(stacks?: PouchStack[]) {
    super();
    this.defaultAction = "Check";
    this.stacks = stacks ?? [
      { rune: "Water", id: 555, quantity: 15000 },
      { rune: "Death", id: 560, quantity: 2525 },
      { rune: "Blood", id: 565, quantity: 8000 },
      { rune: "Soul", id: 566, quantity: 8000 },
    ];
  }

  get inventoryImage() {
    return Image;
  }
  get itemName(): ItemName {
    return ItemName.DIVINE_RUNE_POUCH_L;
  }
  get weight(): number {
    return 0.0;
  }

  quantity(rune: string): number {
    const stack = this.stacks.find((s) => s.rune === rune);
    return stack ? stack.quantity : 0;
  }

  canAfford(cost: Record<string, number>): boolean {
    return Object.keys(cost).every((rune) => this.quantity(rune) >= cost[rune]);
  }

  /** Spends the runes; returns false (and spends nothing) when the pouch cannot pay. */
  spendRunes(cost: Record<string, number>): boolean {
    if (!this.canAfford(cost)) {
      return false;
    }
    Object.keys(cost).forEach((rune) => {
      this.stacks.find((s) => s.rune === rune).quantity -= cost[rune];
    });
    return true;
  }

  /** Casts left of the spell with this cost, shown on the inventory icon. */
  castsLeft(cost: Record<string, number>): number {
    return Math.min(...Object.keys(cost).map((rune) => Math.floor(this.quantity(rune) / cost[rune])));
  }

  /** Small number drawn over the icon: Ice Barrage casts left. */
  get overlayText(): string | null {
    return String(this.castsLeft({ Water: 6, Death: 4, Blood: 2 }));
  }

  describe(): string {
    return this.stacks.map((s) => `${s.quantity.toLocaleString("en-US")} ${s.rune}`).join(", ");
  }
}
