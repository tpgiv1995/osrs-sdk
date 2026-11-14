import type { CacheRenderAnimation } from "../../cache-render-format";

/**
 * The Inferno trainer plays its own sounds, so cache animation frame sounds are not used here.
 * These no-ops keep CacheRenderModel (ported from the Colosseum fork) unchanged otherwise.
 */
export class AnimationFrameSoundPlayer {
  constructor(_delayMs = 0) {}
  reset() {}
  advance(_animationId: number, _animation: CacheRenderAnimation, _elapsed: number, _looping: boolean, _location?: unknown) {}
}

export async function preloadAnimationFrameSounds(_animations: CacheRenderAnimation[]): Promise<void> {}
