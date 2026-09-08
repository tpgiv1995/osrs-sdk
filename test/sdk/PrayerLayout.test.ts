jest.unmock("../../src/sdk/ControlPanelController");

import { ControlPanelController } from "../../src/sdk/ControlPanelController";
import { PrayerControls } from "../../src/sdk/controlpanels/PrayerControls";
import { V3_PRAYER_LAYOUT } from "../../src/sdk/controlpanels/PrayerLayouts";
import { Player } from "../../src/sdk/Player";
import { Settings } from "../../src/sdk/Settings";
import { Trainer } from "../../src/sdk/Trainer";
import { TestRegion } from "../../src/sdk/testing/TestRegion";
import { World } from "../../src/sdk/World";

/** Panel-relative pixel centre of a book slot, mirroring PrayerControls' hit test. */
function slotCentre(column: number, row: number) {
  const scale = Settings.controlPanelScale;
  return { x: (14 + column * 35 + 17) * scale, y: (22 + row * 35 + 17) * scale };
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
    expect(slots[1]?.name).toBe("Augury");
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

  test("clearing the layout restores the stock book order", () => {
    Settings.prayerLayout = null;
    const slots = controls.slotPrayers();
    expect(slots).toHaveLength(29);
    expect(slots[0]?.name).toBe("Thick Skin");
    Settings.prayerLayout = [...V3_PRAYER_LAYOUT];
  });
});
