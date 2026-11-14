import PrayerPanel from "../../assets/images/panels/prayer.png";
import PrayerPanelBlank from "../../assets/images/panels/prayer_blank.png";
import PrayerTab from "../../assets/images/tabs/prayer.png";
import { ImageLoader } from "../utils/ImageLoader";
import type { BasePrayer } from "../BasePrayer";
import { PRAYER_BOOK_ICONS } from "./PrayerBookIcons";
import { PRAYER_BOOK_OVERRIDES, V3Rules, isPrayerLocked } from "../V3Rules";
import { isValidPrayerLayout, PRAYER_LAYOUT_COLUMNS, PRAYER_LAYOUT_ROWS } from "./PrayerLayouts";
import { BaseControls } from "./BaseControls";
import { Settings } from "../Settings";
import { ControlPanelController } from "../ControlPanelController";
import { Trainer } from "../Trainer";

// Geometry of the stock panel image's icon grid, in unscaled panel pixels.
const SLOT_LEFT = 10;
const SLOT_TOP = 16;
const SLOT_W = 36.8;
const SLOT_H = 37;

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
    const find = (name: string) => prayers.find((prayer) => prayer.name === name) ?? null;
    // Unlocked Deadeye / Mystic Vigour permanently replace Eagle Eye / Mystic Might (V3 rules).
    const swap = (name: string) => (V3Rules.calculator && PRAYER_BOOK_OVERRIDES[name]) || name;
    if (!isValidPrayerLayout(layout)) {
      // The stock panel has 29 drawn slots; the two new prayers (appended) take over their lower versions' slots.
      return prayers.slice(0, 29).map((prayer) => (isPrayerLocked(prayer.name) ? null : find(swap(prayer.name))));
    }
    const seen = new Set<string>();
    return layout.map((name) => {
      const prayer = name ? find(swap(name)) : null;
      if (!prayer || isPrayerLocked(prayer.name) || seen.has(prayer.name)) return null;
      seen.add(prayer.name);
      return prayer;
    });
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

  hoverAction(x: number, y: number) {
    const prayer = this.prayerAt(x, y);
    if (!prayer) return null;
    if (this.quickPrayerSetup) {
      return [
        { text: this.quickPrayers().includes(prayer.name) ? "Remove from quick-prayers " : "Add to quick-prayers ", fillStyle: "white" },
        { text: prayer.name, fillStyle: "#FF911F" },
      ];
    }
    return [
      { text: prayer.isLit ? "Deactivate " : "Activate ", fillStyle: "white" },
      { text: prayer.name, fillStyle: "#FF911F" },
    ];
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

  // --- Quick prayers: the set the orb turns on, edited in a setup mode like the game's (right-click the prayer orb).
  private quickList: string[] | null = null;
  quickPrayerSetup = false;

  /** The saved quick-prayer set (localStorage "quickPrayers"); default Protect from Magic + Mystic Vigour. */
  quickPrayers(): string[] {
    if (this.quickList === null) {
      let saved: unknown = null;
      try {
        saved = JSON.parse(window.localStorage.getItem("quickPrayers") || "null");
      } catch {
        saved = null;
      }
      const known = Trainer.player.prayerController.prayers.map((p) => p.name);
      if (Array.isArray(saved) && saved.every((n) => typeof n === "string")) {
        this.quickList = (saved as string[]).filter((n) => known.includes(n) && !isPrayerLocked(n));
      } else {
        this.quickList = V3Rules.calculator ? ["Protect from Magic", "Mystic Vigour"] : ["Protect from Magic", "Rigour"];
      }
    }
    return this.quickList;
  }

  private saveQuickPrayers() {
    window.localStorage.setItem("quickPrayers", JSON.stringify(this.quickPrayers()));
  }

  beginQuickPrayerSetup() {
    this.quickPrayerSetup = true;
    ControlPanelController.controller.setActiveControl("PRAYER");
  }

  endQuickPrayerSetup() {
    this.quickPrayerSetup = false;
    this.saveQuickPrayers();
  }

  /** Setup mode click: add or remove a prayer; adding drops any prayer in the set that conflicts with it. */
  toggleQuickPrayer(prayer: BasePrayer) {
    if (isPrayerLocked(prayer.name) || Trainer.player.stats.prayer < prayer.levelRequirement()) return;
    const list = this.quickPrayers();
    const at = list.indexOf(prayer.name);
    if (at >= 0) {
      list.splice(at, 1);
    } else {
      const prayers = Trainer.player.prayerController.prayers;
      const conflicts = (other: string) => {
        const o = prayers.find((p) => p.name === other);
        return !!o && o.groups.some((g) => prayer.groups.includes(g));
      };
      this.quickList = list.filter((n) => !conflicts(n));
      this.quickList.push(prayer.name);
    }
    this.saveQuickPrayers();
  }

  activateQuickPrayers() {
    this.hasQuickPrayersActivated = true;
    const wanted = this.quickPrayers();
    Trainer.player.prayerController.prayers.forEach((prayer) => {
      if (wanted.includes(prayer.name)) {
        prayer.activate(Trainer.player);
      }
    });
  }

  panelClickDown(x: number, y: number) {
    if (this.quickPrayerSetup) {
      const scale = Settings.controlPanelScale;
      // "Done" button at the bottom left of the panel
      if (x / scale >= 12 && x / scale <= 82 && y / scale >= 241 && y / scale <= 263) {
        this.endQuickPrayerSetup();
        return;
      }
      const chosen = this.prayerAt(x, y);
      if (chosen) this.toggleQuickPrayer(chosen);
      return;
    }
    const clickedPrayer = this.prayerAt(x, y);
    if (clickedPrayer && Trainer.player.currentStats.prayer > 0) {
      clickedPrayer.toggle(Trainer.player);

      if (this.hasQuickPrayersActivated && Trainer.player.prayerController.activePrayers().length === 0) {
        ControlPanelController.controls.PRAYER.hasQuickPrayersActivated = false;
      }
    }
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

    // The panel images carry a baked "99 / 99"; repaint it with the real prayer points.
    context.fillStyle = "#3e3529";
    context.fillRect(x + 92 * scale, y + 243 * scale, 52 * scale, 17 * scale);
    context.save();
    context.font = `${Math.round(13 * scale)}px Stats_12, OSRS, sans-serif`;
    context.fillStyle = "#ff981f";
    context.textAlign = "center";
    context.fillText(`${Math.round(Trainer.player.currentStats.prayer)} / ${Trainer.player.stats.prayer}`, x + 116 * scale, y + 257 * scale);
    context.restore();

    if (!customLayout) {
      // The stock panel image has the locked prayers baked in: paint their slots over.
      Trainer.player.prayerController.prayers.slice(0, 29).forEach((prayer, index) => {
        if (!isPrayerLocked(prayer.name)) return;
        const origin = PrayerControls.slotOrigin(index);
        context.fillStyle = "#3e3529";
        context.fillRect(x + origin.x * scale, y + origin.y * scale, SLOT_H * scale, SLOT_H * scale);
      });
    }

    if (this.quickPrayerSetup) {
      context.save();
      context.font = `${Math.round(13 * scale)}px Stats_12, OSRS, sans-serif`;
      context.fillStyle = "#3e3529";
      context.fillRect(x + 8 * scale, y + 241 * scale, 76 * scale, 22 * scale);
      context.fillStyle = "#00ff00";
      context.textAlign = "center";
      context.fillText("Done", x + 46 * scale, y + 257 * scale);
      context.restore();
    }

    this.slotPrayers().forEach((prayer, index) => {
      if (!prayer) return;
      const x2 = index % PRAYER_LAYOUT_COLUMNS;
      const y2 = Math.floor(index / PRAYER_LAYOUT_COLUMNS);

      // The stock panel image has Eagle Eye / Mystic Might baked in: draw the replacement icons over them.
      const replaced = !customLayout && Object.values(PRAYER_BOOK_OVERRIDES).includes(prayer.name);
      if (customLayout || replaced) {
        const icon = this.bookIcons[prayer.name];
        if (icon) {
          const origin = PrayerControls.slotOrigin(index);
          context.drawImage(icon, x + origin.x * scale, y + origin.y * scale, SLOT_H * scale, SLOT_H * scale);
        }
      }

      if (this.quickPrayerSetup) {
        if (this.quickPrayers().includes(prayer.name)) {
          context.beginPath();
          context.fillStyle = "#00ff0066";
          context.arc(
            x + 10 * scale + (x2 + 0.5) * 36.8 * scale,
            y + (16 + (y2 + 0.5) * 37) * scale,
            18 * scale,
            0,
            2 * Math.PI,
          );
          context.fill();
        }
      } else if (prayer.isLit) {
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
