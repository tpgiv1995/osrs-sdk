jest.unmock("../../src/sdk/ControlPanelController");

import { ControlPanelController } from "../../src/sdk/ControlPanelController";
import { Settings } from "../../src/sdk/Settings";

function press(key: string) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key }));
}

describe("panel hotkeys toggle like RuneLite's modern layout", () => {
  let controller: ControlPanelController;

  beforeAll(() => {
    window.localStorage.clear();
    Settings.readFromStorage();
    controller = new ControlPanelController();
    ControlPanelController.controller = controller;
  });

  test("the inventory is open on start, like OSRS", () => {
    expect(controller.selectedControl).toBe(ControlPanelController.controls.INVENTORY);
  });

  test("pressing the prayer key opens prayer", () => {
    press("F3");
    expect(controller.selectedControl).toBe(ControlPanelController.controls.PRAYER);
  });

  test("pressing it again closes the panel", () => {
    press("F3");
    expect(controller.selectedControl).toBeNull();
  });

  test("a different key switches panels instead of closing", () => {
    press("F3");
    press("F2");
    expect(controller.selectedControl).toBe(ControlPanelController.controls.INVENTORY);
  });
});
