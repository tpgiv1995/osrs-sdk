import { GraphicsObject } from "./GraphicsObject";
import { Location } from "./Location";
import { Unit } from "./Unit";
import { CacheRender } from "./rendering/CacheRenderBundle";
import { V3Rules } from "./V3Rules";
import type { Projectile, ProjectileOptions } from "./weapons/Projectile";

/** Debug-only record of the graphics spawned (the browser smoke test reads it). */
export const V3GraphicsLog = {
  enabled: false,
  graphics: [] as { id: number; height: number }[],
};

/** Real projectile and impact graphics (cache spotanims) are a V3 feature that needs the cache bundle. */
export function v3GraphicsEnabled(): boolean {
  return V3Rules.calculator && CacheRender.isConfigured();
}

/** Centre tile of a unit, in the SDK's tile coordinates (y counts down from the unit's top-left). */
function centre(unit: Unit): Location {
  const size = unit.size || 1;
  return { x: unit.location.x + (size - 1) / 2, y: unit.location.y - (size - 1) / 2 };
}

/**
 * Plays a cache graphic once at a unit (the client's "spotanim on an actor"). `height` is in tile units above the
 * unit's feet. Does nothing unless the V3 graphics are enabled.
 */
export function spawnGraphic(at: Unit, spotAnimId: number, height = 0, opacityCap?: number): GraphicsObject | null {
  if (!v3GraphicsEnabled() || !at.region) return null;
  if (V3GraphicsLog.enabled) V3GraphicsLog.graphics.push({ id: spotAnimId, height });
  const graphic = new GraphicsObject(at.region, centre(at), spotAnimId, { height, ...(opacityCap !== undefined ? { opacityCap } : {}) });
  at.region.addEntity(graphic);
  return graphic;
}

/** Projectile options that draw the projectile from a cache spotanim. */
export function spotAnimProjectile(id: number): Partial<ProjectileOptions> {
  return v3GraphicsEnabled() ? { spotAnim: { id } } : {};
}

/** Runs `fn` when the projectile lands (same hook the V3 lifesteal uses), chaining any earlier hook. */
export function withImpact(options: ProjectileOptions, fn: (projectile: Projectile) => void): ProjectileOptions {
  const previous = options.onImpact;
  return {
    ...options,
    onImpact: (projectile) => {
      if (previous) previous(projectile);
      fn(projectile);
    },
  };
}
