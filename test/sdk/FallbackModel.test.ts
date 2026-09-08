import * as THREE from "three";
import { FallbackModel } from "../../src/sdk/rendering/FallbackModel";
import { Model } from "../../src/sdk/rendering/Model";

/**
 * A stub Model whose preload resolves or rejects on command, and that records
 * whether it was drawn.
 */
class StubModel implements Model {
  drawn = false;
  preloadCalls = 0;
  // The rejecting promise is built lazily inside preload() so a model whose
  // preload is never called leaves no floating unhandled rejection.
  constructor(private ok: boolean) {}
  draw() {
    this.drawn = true;
  }
  destroy() {}
  getWorldPosition(): THREE.Vector3 {
    return new THREE.Vector3();
  }
  getLogicalHeight(): number | null {
    return null;
  }
  preload(): Promise<void> {
    this.preloadCalls += 1;
    return this.ok ? Promise.resolve() : Promise.reject(new Error("preload failed (404)"));
  }
}

const drawArgs = (): Parameters<Model["draw"]> => [
  new THREE.Scene(),
  0,
  0,
  { x: 0, y: 0, z: 0 },
  0,
  0,
  true,
  [],
];

describe("FallbackModel", () => {
  it("does not reject when the primary succeeds but the fallback fails to load", async () => {
    // Regression: a legacy item (e.g. the noxious halberd) whose static GLB
    // 404s must not brick loading when the cache-render primary is fine.
    const primary = new StubModel(true);
    const fallback = new StubModel(false);
    const model = new FallbackModel(primary, fallback);

    await expect(model.preload()).resolves.toBeUndefined();

    // The cache-render primary is what actually renders.
    model.draw(...drawArgs());
    expect(primary.drawn).toBe(true);
    expect(fallback.drawn).toBe(false);
    // The doomed fallback is never even preloaded on the happy path.
    expect(fallback.preloadCalls).toBe(0);
  });

  it("falls back to the legacy model when the primary fails", async () => {
    const primary = new StubModel(false);
    const fallback = new StubModel(true);
    const model = new FallbackModel(primary, fallback);

    await expect(model.preload()).resolves.toBeUndefined();

    model.draw(...drawArgs());
    expect(fallback.drawn).toBe(true);
  });

  it("still resolves when both the primary and the fallback fail", async () => {
    const primary = new StubModel(false);
    const fallback = new StubModel(false);
    const model = new FallbackModel(primary, fallback);

    await expect(model.preload()).resolves.toBeUndefined();
  });

  it("selects (and preloads the primary) only once across preload and draw", async () => {
    const primary = new StubModel(true);
    const fallback = new StubModel(true);
    const model = new FallbackModel(primary, fallback);

    await model.preload();
    model.draw(...drawArgs());
    await model.preload();

    expect(primary.preloadCalls).toBe(1);
  });
});
