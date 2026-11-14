jest.unmock("../../src/sdk/ControlPanelController");

import { ControlPanelController, TAB_W, TAB_H, PANEL_W, PANEL_H } from "../../src/sdk/ControlPanelController";
import { Settings } from "../../src/sdk/Settings";
import { Chrome } from "../../src/sdk/Chrome";
import { ChatStrip } from "../../src/sdk/ChatStrip";
import { MapController } from "../../src/sdk/MapController";

describe("modern layout", () => {
  let controller: ControlPanelController;

  beforeAll(() => {
    window.localStorage.clear();
    Settings.readFromStorage();
    jest.spyOn(Chrome, "size").mockReturnValue({ width: 1707, height: 898 });
    // MapController is mocked globally; give the mock a minimap height like the real one.
    (MapController.controller as unknown as { height: number }).height = 170;
    controller = new ControlPanelController();
  });

  test("is on by default", () => {
    expect(Settings.modernLayout).toBe(true);
  });

  test("all 14 tabs share one bottom row, right aligned", () => {
    const scale = controller.getTabScale();
    expect(controller.controls).toHaveLength(14);
    const ys = controller.controls.map((_, i) => controller.tabPosition(i).y);
    expect(ys.every((y) => y === ys[0])).toBe(true);
    expect(ys[0]).toBeCloseTo(898 - TAB_H * scale);
    const last = controller.tabPosition(13);
    expect(last.x + TAB_W * scale).toBeCloseTo(1707);
    expect(controller.tabPosition(0).x).toBeCloseTo(1707 - 14 * TAB_W * scale);
  });

  test("the open panel sits directly above the strip on the right", () => {
    const scale = controller.getTabScale();
    controller.selectedControl = ControlPanelController.controls.INVENTORY;
    const pos = controller.controlPosition(controller.selectedControl);
    expect(pos.x + PANEL_W * scale).toBeCloseTo(1707);
    expect(pos.y + PANEL_H * scale + TAB_H * scale).toBeCloseTo(898);
  });

  test("scale is larger than the compact layout at 1707x898", () => {
    const modern = controller.getTabScale();
    Settings.modernLayout = false;
    const compact = controller.getTabScale();
    Settings.modernLayout = true;
    expect(modern).toBeGreaterThan(compact);
  });

  test("the chat strip draws seven buttons and a clock, and nothing when off", () => {
    const context = {
      save: jest.fn(),
      restore: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
    } as unknown as CanvasRenderingContext2D;
    ChatStrip.draw(context, 1707, 898, 1);
    expect((context.fillRect as jest.Mock).mock.calls).toHaveLength(8);
    Settings.modernLayout = false;
    ChatStrip.draw(context, 1707, 898, 1);
    expect((context.fillRect as jest.Mock).mock.calls).toHaveLength(8);
    Settings.modernLayout = true;
  });
});
