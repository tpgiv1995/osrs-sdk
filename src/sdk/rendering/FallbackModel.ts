import * as THREE from "three";
import { Location3 } from "../Location";
import { Model } from "./Model";

/** Uses the cache model after its verified preload succeeds, otherwise keeps a legacy model live. */
export class FallbackModel implements Model {
  private active: Model | null = null;
  private selection: Promise<void> | null = null;
  private fallbackWasDrawn = false;
  constructor(private primary: Model, private fallback: Model) {}
  getPrimaryModel() { return this.primary; }
  /**
   * Resolve which model to use, exactly once. Prefer the cache-render primary;
   * only fall back to the legacy GLTF models if the primary fails. A fallback
   * that cannot load - e.g. a legacy item whose static GLB was never published
   * to the asset host, which 404s - must NOT be fatal (it is a fallback), so its
   * preload errors are logged and swallowed rather than rejecting the load.
   */
  private ensureSelected(): Promise<void> {
    if (!this.selection) {
      this.selection = this.primary.preload().then(() => {
        this.active = this.primary;
      }).catch((error) => {
        console.error("[osrs-sdk] Cache render unavailable; using GLTF fallback", error);
        this.active = this.fallback;
        return this.fallback.preload().catch((fallbackError) => {
          console.error("[osrs-sdk] GLTF fallback preload failed; some models may be missing", fallbackError);
        });
      });
    }
    return this.selection;
  }
  draw(scene: THREE.Scene, clockDelta: number, tickPercent: number, location: Location3, rotation: number, pitch: number, visible: boolean, modelOffsets: Location3[]) {
    void this.ensureSelected();
    // The legacy model is intentionally drawn while bundle validation is in flight.
    const model = this.active ?? this.fallback;
    if (model === this.primary && this.fallbackWasDrawn) this.fallback.destroy(scene);
    if (model === this.fallback) this.fallbackWasDrawn = true;
    model.draw(scene, clockDelta, tickPercent, location, rotation, pitch, visible, modelOffsets);
  }
  destroy(scene: THREE.Scene) { this.primary.destroy(scene); this.fallback.destroy(scene); }
  getWorldPosition(): THREE.Vector3 { return (this.active ?? this.fallback).getWorldPosition(); }
  getLogicalHeight(): number | null { return (this.active ?? this.primary).getLogicalHeight?.() ?? null; }
  async preload() { await this.ensureSelected(); }
}
