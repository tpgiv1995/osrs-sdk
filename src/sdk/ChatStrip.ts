import { Settings } from "./Settings";

const LABELS: { label: string; state?: string }[] = [
  { label: "All" },
  { label: "Game", state: "On" },
  { label: "Public", state: "On" },
  { label: "Private", state: "Friends" },
  { label: "Channel", state: "On" },
  { label: "Clan", state: "On" },
  { label: "Trade", state: "On" },
];
const BOX_W = 60;
const BOX_H = 24;
const GAP = 2;
const LEFT = 8;

/** Visual-only copy of the RuneLite modern-layout chat buttons along the bottom-left. */
export class ChatStrip {
  /** Unscaled width of the whole strip: seven buttons, gaps, and the clock. */
  static readonly TOTAL_W = LEFT + LABELS.length * (BOX_W + GAP) + BOX_W * 1.5;

  /**
   * @param maxRight the left edge of the tab row; the strip shrinks to stay left of it
   * and hides if that would make it unreadable.
   */
  static draw(context: CanvasRenderingContext2D, width: number, height: number, scale: number, maxRight = width) {
    if (!Settings.modernLayout || Settings.mobileCheck()) return;
    const room = maxRight - 8;
    if (ChatStrip.TOTAL_W * scale > room) {
      scale = room / ChatStrip.TOTAL_W;
      if (scale < 0.45) return;
    }
    const boxW = BOX_W * scale;
    const boxH = BOX_H * scale;
    const y = height - boxH - 4 * scale;
    context.save();
    context.font = `${Math.round(12 * scale)}px OSRS`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    LABELS.forEach((entry, i) => {
      const x = (LEFT + i * (BOX_W + GAP)) * scale;
      context.fillStyle = "#3a3a3a";
      context.fillRect(x, y, boxW, boxH);
      context.strokeStyle = "#1a1a1a";
      context.lineWidth = 1;
      context.strokeRect(x, y, boxW, boxH);
      const cx = x + boxW / 2;
      if (entry.state) {
        context.fillStyle = "#ffffff";
        context.fillText(entry.label, cx, y + boxH * 0.33);
        context.fillStyle = "#00ff00";
        context.fillText(entry.state, cx, y + boxH * 0.72);
      } else {
        context.fillStyle = "#ff981f";
        context.fillText(entry.label, cx, y + boxH / 2);
      }
    });
    const clockX = (LEFT + LABELS.length * (BOX_W + GAP)) * scale;
    const clockW = boxW * 1.5;
    context.fillStyle = "#5c1d1d";
    context.fillRect(clockX, y, clockW, boxH);
    context.strokeStyle = "#1a1a1a";
    context.strokeRect(clockX, y, clockW, boxH);
    context.fillStyle = "#ffffff";
    context.fillText(new Date().toLocaleTimeString(), clockX + clockW / 2, y + boxH / 2);
    context.restore();
  }
}
