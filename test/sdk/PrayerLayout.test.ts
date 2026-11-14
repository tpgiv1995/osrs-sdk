jest.unmock("../../src/sdk/ControlPanelController");

import { ControlPanelController } from "../../src/sdk/ControlPanelController";
import { PrayerControls } from "../../src/sdk/controlpanels/PrayerControls";
import { V3_PRAYER_LAYOUT, V3_INFERNO_PRAYER_LAYOUT } from "../../src/sdk/controlpanels/PrayerLayouts";
import { Player } from "../../src/sdk/Player";
import { Settings } from "../../src/sdk/Settings";
import { Trainer } from "../../src/sdk/Trainer";
import { TestRegion } from "../../src/sdk/testing/TestRegion";
import { World } from "../../src/sdk/World";

/** Panel-relative pixel centre of a drawn book slot (the same geometry the icons use). */
function slotCentre(column: number, row: number) {
  const scale = Settings.controlPanelScale;
  const origin = PrayerControls.slotOrigin(row * 5 + column);
  return { x: (origin.x + 18) * scale, y: (origin.y + 18) * scale };
}

describe("V3 prayer book layout", () => {
  let controls: PrayerControls;
  let player: Player;

  beforeAll(() => {
    window.localStorage.clear();
    Settings.readFromStorage();
    new ControlPanelController();
    const region = new TestRegion(10, 10);
    const world = new World();
    region.world = world;
    world.addRegion(region);
    player = new Player(region, { x: 2, y: 2 });
    region.addPlayer(player);
    Trainer.setPlayer(player);
    controls = ControlPanelController.controls.PRAYER as PrayerControls;
  });

  test("is the default layout and fills 30 slots", () => {
    expect(Settings.prayerLayout).toEqual(V3_PRAYER_LAYOUT);
    const slots = controls.slotPrayers();
    expect(slots).toHaveLength(30);
    expect(slots[0]?.name).toBe("Protect from Range");
    expect(slots[1]).toBeNull(); // Augury is hidden: the account has not unlocked it
    expect(slots[2]).toBeNull();
    expect(slots[5]?.name).toBe("Protect from Magic");
    expect(slots[10]?.name).toBe("Protect from Melee");
    expect(slots[11]?.name).toBe("Piety");
    expect(slots[19]?.name).toBe("Retribution");
    expect(slots[27]?.name).toBe("Incredible Reflexes");
  });

  test("clicking a slot toggles the prayer that lives there", () => {
    player.currentStats.prayer = 93;
    const { x, y } = slotCentre(0, 2);
    controls.panelClickDown(x, y);
    const melee = player.prayerController.prayers.find((prayer) => prayer.name === "Protect from Melee");
    expect(melee.isLit).toBe(true);
    controls.panelClickDown(x, y);
    expect(melee.isLit).toBe(false);
  });

  test("an empty slot does nothing and has no hover text", () => {
    const before = player.prayerController.activePrayers().length;
    const { x, y } = slotCentre(3, 0);
    controls.panelClickDown(x, y);
    expect(player.prayerController.activePrayers().length).toBe(before);
    expect(controls.hoverAction(x, y)).toBeNull();
  });

  test("clicking the edge of a drawn slot hits that slot, not its neighbour", () => {
    const scale = Settings.controlPanelScale;
    const origin = PrayerControls.slotOrigin(10); // Protect from Melee in the V3 layout
    controls.panelClickDown((origin.x + 2) * scale, (origin.y + 35) * scale);
    const melee = player.prayerController.prayers.find((prayer) => prayer.name === "Protect from Melee");
    expect(melee.isLit).toBe(true);
    controls.panelClickDown((origin.x + 2) * scale, (origin.y + 35) * scale);
    expect(melee.isLit).toBe(false);
  });

  test("clearing the layout restores the stock book order", () => {
    Settings.prayerLayout = null;
    const slots = controls.slotPrayers();
    expect(slots).toHaveLength(29);
    expect(slots[0]?.name).toBe("Thick Skin");
    Settings.prayerLayout = [...V3_PRAYER_LAYOUT];
  });

  test("the V3 Inferno book shows Deadeye and Mystic Vigour in place of Eagle Eye and Mystic Might, no duplicates", () => {
    Settings.prayerLayout = [...V3_INFERNO_PRAYER_LAYOUT];
    const names = controls.slotPrayers().map((p) => p?.name ?? null);
    expect(names[1]).toBe("Mystic Vigour");
    expect(names[6]).toBe("Deadeye"); // Eagle Eye's slot in the reference book
    expect(names).not.toContain("Eagle Eye");
    expect(names).not.toContain("Mystic Might");
    const shown = names.filter(Boolean) as string[];
    expect(new Set(shown).size).toBe(shown.length);
    // a saved layout that still names the old prayers is swapped, not duplicated
    Settings.prayerLayout = [...V3_INFERNO_PRAYER_LAYOUT];
    Settings.prayerLayout[2] = "Eagle Eye";
    Settings.prayerLayout[3] = "Mystic Might";
    const swapped = controls.slotPrayers().map((p) => p?.name ?? null);
    expect(swapped.filter((n) => n === "Deadeye")).toHaveLength(1);
    expect(swapped.filter((n) => n === "Mystic Vigour")).toHaveLength(1);
    Settings.prayerLayout = [...V3_PRAYER_LAYOUT];
  });

  test("the stock book also swaps them into Eagle Eye's and Mystic Might's slots", () => {
    Settings.prayerLayout = null;
    const names = controls.slotPrayers().map((p) => p?.name);
    expect(names).toHaveLength(29);
    expect(names[19]).toBe("Deadeye");
    expect(names[20]).toBe("Mystic Vigour");
    expect(names).not.toContain("Eagle Eye");
    expect(names).not.toContain("Mystic Might");
    Settings.prayerLayout = [...V3_PRAYER_LAYOUT];
  });

  test("default quick prayers are Protect from Magic and Mystic Vigour (no Rigour)", () => {
    player.currentStats.prayer = 93;
    player.stats.prayer = 93;
    controls.deactivateAllPrayers();
    player.prayerController.prayers.forEach((p) => p.tick());
    controls.activateQuickPrayers();
    player.prayerController.prayers.forEach((p) => p.tick());
    expect(player.prayerController.activePrayers().map((p) => p.name).sort()).toEqual(["Mystic Vigour", "Protect from Magic"]);
    controls.deactivateAllPrayers();
    player.prayerController.prayers.forEach((p) => p.tick());
  });

  test("Rigour, Augury and Preserve are hidden in both books and cannot be activated", () => {
    const locked = ["Rigour", "Augury", "Preserve"];
    [null, [...V3_PRAYER_LAYOUT], [...V3_INFERNO_PRAYER_LAYOUT]].forEach((layout) => {
      Settings.prayerLayout = layout;
      const names = controls.slotPrayers().map((p) => p?.name);
      locked.forEach((n) => expect(names).not.toContain(n));
    });
    // a saved layout that names them gets them hidden too
    Settings.prayerLayout = [...V3_INFERNO_PRAYER_LAYOUT];
    Settings.prayerLayout[2] = "Rigour";
    Settings.prayerLayout[3] = "Augury";
    expect(controls.slotPrayers().map((p) => p?.name)).not.toContain("Rigour");
    player.stats.prayer = 99;
    locked.forEach((n) => {
      const prayer = player.prayerController.findPrayerByName(n);
      prayer.toggle(player);
      prayer.activate(player);
      prayer.tick();
      expect(prayer.isActive).toBe(false);
      expect(prayer.isLit).toBe(false);
    });
    Settings.prayerLayout = [...V3_PRAYER_LAYOUT];
  });

  test("quick prayers are configurable in a setup mode, default to Protect from Magic + Mystic Vigour, and persist", () => {
    window.localStorage.removeItem("quickPrayers");
    const fresh = new PrayerControls();
    expect(fresh.quickPrayers()).toEqual(["Protect from Magic", "Mystic Vigour"]);
    fresh.quickPrayerSetup = true;
    const prayer = (n: string) => player.prayerController.findPrayerByName(n);
    fresh.toggleQuickPrayer(prayer("Steel Skin"));
    expect(fresh.quickPrayers()).toEqual(["Protect from Magic", "Mystic Vigour", "Steel Skin"]);
    fresh.toggleQuickPrayer(prayer("Deadeye")); // conflicts with Mystic Vigour: replaces it
    expect(fresh.quickPrayers()).toEqual(["Protect from Magic", "Steel Skin", "Deadeye"]);
    fresh.toggleQuickPrayer(prayer("Rigour")); // locked: ignored
    fresh.toggleQuickPrayer(prayer("Deadeye")); // toggles off
    fresh.toggleQuickPrayer(prayer("Mystic Vigour"));
    expect(fresh.quickPrayers()).toEqual(["Protect from Magic", "Steel Skin", "Mystic Vigour"]);
    // in setup mode a slot click edits the set and does not turn prayers on
    expect(player.prayerController.activePrayers()).toHaveLength(0);
    fresh.endQuickPrayerSetup();
    expect(JSON.parse(window.localStorage.getItem("quickPrayers"))).toEqual(["Protect from Magic", "Steel Skin", "Mystic Vigour"]);
    // a new session reads the saved set, and the orb turns exactly that set on
    const reloaded = new PrayerControls();
    expect(reloaded.quickPrayers()).toEqual(["Protect from Magic", "Steel Skin", "Mystic Vigour"]);
    player.stats.prayer = 93;
    reloaded.activateQuickPrayers();
    player.prayerController.prayers.forEach((p) => p.tick());
    expect(player.prayerController.activePrayers().map((p) => p.name).sort()).toEqual(["Mystic Vigour", "Protect from Magic", "Steel Skin"]);
    reloaded.deactivateAllPrayers();
    player.prayerController.prayers.forEach((p) => p.tick());
    window.localStorage.removeItem("quickPrayers");
  });
});
