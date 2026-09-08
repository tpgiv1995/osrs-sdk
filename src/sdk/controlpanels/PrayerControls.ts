import PrayerPanel from "../../assets/images/panels/prayer.png";
import PrayerPanelBlank from "../../assets/images/panels/prayer_blank.png";
import PrayerTab from "../../assets/images/tabs/prayer.png";
import { ImageLoader } from "../utils/ImageLoader";
import type { BasePrayer } from "../BasePrayer";
import { PRAYER_BOOK_ICONS } from "./PrayerBookIcons";
import { isValidPrayerLayout, PRAYER_LAYOUT_COLUMNS, PRAYER_LAYOUT_ROWS } from "./PrayerLayouts";

// Geometry of the stock panel image's icon grid, in unscaled panel pixels.
const SLOT_LEFT = 10;
const SLOT_TOP = 16;
const SLOT_W = 36.8;
const SLOT_H = 37;
import { BaseControls } from "./BaseControls";
import { Settings } from "../Settings";
import { ControlPanelController } from "../ControlPanelController";
import { Trainer } from "../Trainer";

export class PrayerControls extends BaseControls {
  hasQuickPrayersActivated = false;
  blankPanelImage: HTMLImageElement = ImageLoader.createImage(PrayerPanelBlank);
  private bookIcons: Record<string, HTMLImageElement> = Object.keys(PRAYER_BOOK_ICONS).reduce(
    (icons, name) => {
      icons[name] = ImageLoader.createImage(PRAYER_BOOK_ICONS[name]);
      return icons;
    },
    {} as Record<string, HTMLImageElement>,
  );

  /** The prayer in each of the 30 book slots, following Settings.prayerLayout when set. */
  slotPrayers(): (BasePrayer | null)[] {
    const prayers = Trainer.player.prayerController.prayers;
    const layout = Settings.prayerLayout;
    if (!isValidPrayerLayout(layout)) return prayers;
    return layout.map((name) => (name ? prayers.find((prayer) => prayer.name === name) ?? null : null));
  }

  /** Panel-relative slot origin in unscaled panel pixels; the drawn icon is 37x37 from here. */
  static slotOrigin(index: number) {
    return {
      x: Math.round(SLOT_LEFT + (index % PRAYER_LAYOUT_COLUMNS) * SLOT_W),
      y: SLOT_TOP + Math.floor(index / PRAYER_LAYOUT_COLUMNS) * SLOT_H,
    };
  }

  private prayerAt(x: number, y: number): BasePrayer | null {
    const scale = Settings.controlPanelScale;
    const gridX = x / scale - SLOT_LEFT;
    const gridY = y / scale - SLOT_TOP;
    if (gridX < 0 || gridY < 0) return null;
    const column = Math.floor(gridX / SLOT_W);
    const row = Math.floor(gridY / SLOT_H);
    if (column >= PRAYER_LAYOUT_COLUMNS || row >= PRAYER_LAYOUT_ROWS) return null;
    return this.slotPrayers()[row * PRAYER_LAYOUT_COLUMNS + column] ?? null;
  }

  get panelImageReference() {
    return PrayerPanel;
  }

  get tabImageReference() {
    return PrayerTab;
  }

  get keyBinding() {
    return Settings.prayer_key;
  }

  deactivateAllPrayers() {
    this.hasQuickPrayersActivated = false;
    Trainer.player.prayerController.prayers.forEach((prayer) => {
      prayer.deactivate();
    });
  }

  activateQuickPrayers() {
    this.hasQuickPrayersActivated = true;
    Trainer.player.prayerController.prayers.forEach((prayer) => {
      if (prayer.name === "Protect from Magic") {
        prayer.activate(Trainer.player);
      }
      if (prayer.name === "Rigour") {
        prayer.activate(Trainer.player);
      }
    });
  }

  panelClickDown(x: number, y: number) {
    const clickedPrayer = this.prayerAt(x, y);
    if (clickedPrayer && Trainer.player.currentStats.prayer > 0) {
      clickedPrayer.toggle(Trainer.player);

      if (this.hasQuickPrayersActivated && Trainer.player.prayerController.activePrayers().length === 0) {
        ControlPanelController.controls.PRAYER.hasQuickPrayersActivated = false;
      }
    }
  }

  override hoverAction(x: number, y: number) {
    const prayer = this.prayerAt(x, y);
    if (!prayer) return null;
    return [
      { text: prayer.isLit ? "Deactivate " : "Activate ", fillStyle: "white" },
      { text: prayer.name, fillStyle: "yellow" },
    ];
  }

  get isAvailable(): boolean {
    return true;
  }

  draw(context, ctrl: ControlPanelController, x: number, y: number) {
    const scale = Settings.controlPanelScale;
    const customLayout = isValidPrayerLayout(Settings.prayerLayout);
    if (customLayout) {
      context.drawImage(this.blankPanelImage, x, y, 204 * scale, 275 * scale);
    } else {
      super.draw(context, ctrl, x, y);
    }

    this.slotPrayers().forEach((prayer, index) => {
      if (!prayer) return;
      const x2 = index % PRAYER_LAYOUT_COLUMNS;
      const y2 = Math.floor(index / PRAYER_LAYOUT_COLUMNS);

      if (customLayout) {
        const icon = this.bookIcons[prayer.name];
        if (icon) {
          const origin = PrayerControls.slotOrigin(index);
          context.drawImage(icon, x + origin.x * scale, y + origin.y * scale, SLOT_H * scale, SLOT_H * scale);
        }
      }

      if (prayer.isLit) {
        context.beginPath();
        context.fillStyle = "#D1BB7773";
        context.arc(
          x + 10 * scale + (x2 + 0.5) * 36.8 * scale,
          y + (16 + (y2 + 0.5) * 37) * scale,
          18 * scale,
          0,
          2 * Math.PI,
        );
        context.fill();
      }
      if (Trainer.player.stats.prayer < prayer.levelRequirement()) {
        context.beginPath();
        context.fillStyle = "#00000073";
        context.arc(
          x + 10 * scale + (x2 + 0.5) * 36.8 * scale,
          y + (16 + (y2 + 0.5) * 37) * scale,
          18 * scale,
          0,
          2 * Math.PI,
        );
        context.fill();
      }
    });
  }
}
