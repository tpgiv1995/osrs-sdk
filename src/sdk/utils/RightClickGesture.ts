export const DRAG_THRESHOLD_PX = 4;

export type RightClickResult = "click" | "drag" | "none";

/**
 * Tracks one right-button press so a stationary release opens the context menu
 * while a moving press rotates the camera (RuneLite "right click moves camera").
 */
export class RightClickGesture {
  private startX: number | null = null;
  private startY: number | null = null;
  private dragged = false;

  get dragging(): boolean {
    return this.dragged;
  }

  begin(x: number, y: number) {
    this.startX = x;
    this.startY = y;
    this.dragged = false;
  }

  isDragging(x: number, y: number): boolean {
    if (this.startX === null || this.startY === null) return false;
    if (!this.dragged) {
      const dx = x - this.startX;
      const dy = y - this.startY;
      this.dragged = dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX;
    }
    return this.dragged;
  }

  end(x: number, y: number): RightClickResult {
    if (this.startX === null) return "none";
    const result: RightClickResult = this.isDragging(x, y) ? "drag" : "click";
    this.startX = null;
    this.startY = null;
    this.dragged = false;
    return result;
  }
}
