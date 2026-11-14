import { RightClickGesture, DRAG_THRESHOLD_PX } from "../../src/sdk/utils/RightClickGesture";

describe("right mouse gesture classification", () => {
  test("press and release in place is a click", () => {
    const g = new RightClickGesture();
    g.begin(100, 100);
    expect(g.end(101, 100)).toBe("click");
  });

  test("moving past the threshold makes it a drag and suppresses the menu", () => {
    const g = new RightClickGesture();
    g.begin(100, 100);
    expect(g.isDragging(100 + DRAG_THRESHOLD_PX + 1, 100)).toBe(true);
    expect(g.dragging).toBe(true);
    expect(g.end(120, 100)).toBe("drag");
  });

  test("a drag stays a drag even if the pointer returns to the start", () => {
    const g = new RightClickGesture();
    g.begin(50, 50);
    g.isDragging(80, 50);
    expect(g.end(50, 50)).toBe("drag");
  });

  test("end without begin is none", () => {
    expect(new RightClickGesture().end(0, 0)).toBe("none");
  });

  test("end clears the drag state", () => {
    const g = new RightClickGesture();
    g.begin(0, 0);
    g.isDragging(30, 0);
    g.end(30, 0);
    expect(g.dragging).toBe(false);
  });
});
