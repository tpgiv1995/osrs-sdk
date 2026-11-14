import { Player } from "../../src/sdk/Player";
import { World } from "../../src/sdk/World";
import { TestRegion } from "../../src/sdk/testing/TestRegion";
import { TestNpc } from "../../src/sdk/testing/TestNpc";
import { Random } from "../../src/sdk/Random";
import { AttackStylesController } from "../../src/sdk/AttackStylesController";
import { V3Rules } from "../../src/sdk/V3Rules";
import { CacheRender } from "../../src/sdk/rendering/CacheRenderBundle";
import { GraphicsObject } from "../../src/sdk/GraphicsObject";
import { PlayerAnimationIndices } from "../../src/sdk/rendering/GLTFAnimationConstants";
import { PLAYER_CACHE_SPOTANIMS } from "../../src/assets/PlayerCacheItems";
import { IceBarrageSpell } from "../../src/sdk/weapons/IceBarrageSpell";
import { BloodBarrageSpell } from "../../src/sdk/weapons/BloodBarrageSpell";
import { EyeOfAyak } from "../../src/content/weapons/EyeOfAyak";
import { BloodAncientSceptre } from "../../src/content/weapons/BloodAncientSceptre";
import { Blowpipe } from "../../src/content/weapons/Blowpipe";
import { BowOfFaerdhinen } from "../../src/content/weapons/BowOfFaerdhinen";

function makePlayer() {
  const region = new TestRegion(60, 60);
  const world = new World();
  region.world = world;
  world.addRegion(region);
  const player = new Player(region, { x: 30, y: 30 });
  region.addPlayer(player);
  player.stats = { attack: 99, strength: 99, defence: 99, range: 99, magic: 99, hitpoint: 99, prayer: 93, specialAttack: 100 } as never;
  player.currentStats = JSON.parse(JSON.stringify(player.stats));
  const target = new TestNpc(region, { x: 33, y: 30 }, {});
  region.addMob(target);
  target.currentStats.hitpoint = 500;
  return { region, player, target };
}

/** Alternates hit-check 0.01 (a hit) and damage roll 0.9 (a high roll). */
const alwaysHit = (() => {
  let i = 0;
  return () => (i++ % 2 === 0 ? 0.01 : 0.9);
})();

const graphicIds = (region: TestRegion) =>
  region.entities.filter((e) => e instanceof GraphicsObject).map((e) => (e as GraphicsObject).spotAnimId);

/** Lands every projectile on the target. */
function land(target: TestNpc, ticks = 10) {
  for (let i = 0; i < ticks; i++) target.processIncomingAttacks();
}

beforeEach(() => {
  V3Rules.calculator = true;
  CacheRender.configure("http://localhost/player-render/manifest.json");
  AttackStylesController.controller.stylesMap = {};
  Random.reset();
  Random.setRandom(alwaysHit);
});
afterAll(() => {
  CacheRender.configure(null);
  Random.setRandom(() => Math.random());
});

describe("V3 projectile and impact graphics (cache spotanims, never the coloured sphere)", () => {
  test("Bow of Faerdhinen: crystal arrow projectile and launch graphic", () => {
    const { region, player, target } = makePlayer();
    const bow = new BowOfFaerdhinen();
    bow.assignToPlayer(player);
    bow.attack(player, target, { attackStyle: "range" });
    expect(graphicIds(region)).toEqual([PLAYER_CACHE_SPOTANIMS.bofaArrowLaunch]);
    const projectile = target.incomingProjectiles[0];
    expect(projectile.options.spotAnim?.id).toBe(PLAYER_CACHE_SPOTANIMS.bofaArrowTravel);
    expect(projectile.modelSource).toBe("cache");
  });

  test("Eye of Ayak normal attack: player glow, travelling projectile, impact when it lands", () => {
    const { region, player, target } = makePlayer();
    const eye = new EyeOfAyak();
    eye.assignToPlayer(player);
    eye.attack(player, target, {});
    expect(graphicIds(region)).toEqual([PLAYER_CACHE_SPOTANIMS.ayakNormalPlayer]);
    const projectile = target.incomingProjectiles[0];
    expect(projectile.options.spotAnim?.id).toBe(PLAYER_CACHE_SPOTANIMS.ayakNormalProjectile);
    expect(projectile.modelSource).toBe("cache");
    expect(eye.attackAnimationId).toBe(PlayerAnimationIndices.EyeOfAyakNormal);
    expect(eye.attackSpeed).toBe(3);
    land(target);
    expect(graphicIds(region)).toContain(PLAYER_CACHE_SPOTANIMS.ayakNormalImpact);
  });

  test("Soul Rend: its own animation and graphics, no projectile, a 5 tick swing", () => {
    const { region, player, target } = makePlayer();
    const eye = new EyeOfAyak();
    eye.assignToPlayer(player);
    eye.specialAttack(player, target, {});
    expect(graphicIds(region)).toEqual([PLAYER_CACHE_SPOTANIMS.ayakSpecialPlayer]);
    expect(target.incomingProjectiles[0].modelSource).toBe("none");
    expect(eye.attackAnimationId).toBe(PlayerAnimationIndices.EyeOfAyakSpecial);
    expect(eye.attackSpeed).toBe(5);
    land(target);
    expect(graphicIds(region)).toContain(PLAYER_CACHE_SPOTANIMS.ayakSpecialImpact);
    // the next normal swing goes back to the normal animation
    eye.attack(player, target, {});
    expect(eye.attackAnimationId).toBe(PlayerAnimationIndices.EyeOfAyakNormal);
    expect(eye.attackSpeed).toBe(3);
  });

  test("Ice Barrage and Blood Barrage: no projectile, the impact graphic on each target at landing, splash on a miss", () => {
    for (const [spell, impact] of [
      [new IceBarrageSpell(), PLAYER_CACHE_SPOTANIMS.iceBarrageImpact],
      [new BloodBarrageSpell(), PLAYER_CACHE_SPOTANIMS.bloodBarrageImpact],
    ] as const) {
      const { region, player, target } = makePlayer();
      const second = new TestNpc(region, { x: 34, y: 30 }, {});
      region.mobs.push(target as never, second as never); // the AoE looks at the live mob list
      second.currentStats.hitpoint = 500;
      new BloodAncientSceptre().assignToPlayer(player);
      Random.setRandom(alwaysHit);
      spell.cast(player, target);
      expect(graphicIds(region)).toEqual([]); // nothing at cast
      [target, second].forEach((t) => t.incomingProjectiles.forEach((p) => expect(p.modelSource).toBe("none")));
      land(target);
      land(second);
      const ids = graphicIds(region);
      expect(ids.filter((id) => id === impact).length).toBe(2); // one on each target
      expect(ids).not.toContain(PLAYER_CACHE_SPOTANIMS.splash);
    }
    // a barrage that does no damage splashes
    const { region, player, target } = makePlayer();
    new BloodAncientSceptre().assignToPlayer(player);
    Random.setRandom(() => 0.999999); // misses
    const ice = new IceBarrageSpell();
    ice.cast(player, target);
    land(target);
    expect(graphicIds(region)).toContain(PLAYER_CACHE_SPOTANIMS.splash);
  });

  test("the impact lands on the same tick as the damage", () => {
    const { region, player, target } = makePlayer();
    new BloodAncientSceptre().assignToPlayer(player);
    new IceBarrageSpell().cast(player, target);
    let impactTick = -1;
    let damageTick = -1;
    for (let tick = 1; tick <= 10; tick++) {
      target.processIncomingAttacks();
      if (damageTick < 0 && target.currentStats.hitpoint < 500) damageTick = tick;
      if (impactTick < 0 && graphicIds(region).includes(PLAYER_CACHE_SPOTANIMS.iceBarrageImpact)) impactTick = tick;
    }
    expect(damageTick).toBeGreaterThan(0);
    expect(impactTick).toBe(damageTick);
  });

  test("no V3 player weapon draws the coloured sphere fallback", () => {
    const { player, target } = makePlayer();
    const sources: Record<string, string> = {};
    const shoot = (name: string, fn: () => void) => {
      target.incomingProjectiles.length = 0;
      fn();
      sources[name] = target.incomingProjectiles.map((p) => p.modelSource).join(",");
    };
    const bow = new BowOfFaerdhinen();
    bow.assignToPlayer(player);
    shoot("bowfa", () => bow.attack(player, target, { attackStyle: "range" }));
    const eye = new EyeOfAyak();
    eye.assignToPlayer(player);
    shoot("eye", () => eye.attack(player, target, {}));
    shoot("soulrend", () => eye.specialAttack(player, target, {}));
    const pipe = new Blowpipe();
    pipe.assignToPlayer(player);
    shoot("blowpipe", () => pipe.attack(player, target, { attackStyle: "range" }));
    shoot("blowpipe special", () => pipe.specialAttack(player, target, {}));
    shoot("ice barrage", () => new IceBarrageSpell().cast(player, target));
    shoot("blood barrage", () => new BloodBarrageSpell().cast(player, target));
    Object.entries(sources).forEach(([name, list]) => {
      expect(`${name}: ${list}`).not.toContain("sphere");
      expect(list.length).toBeGreaterThan(0);
    });
    expect(sources.bowfa).toBe("cache");
    expect(sources.eye).toBe("cache");
    expect(sources.blowpipe).toBe("gltf");
  });

  test("legacy rules draw none of it (golden flows stay as upstream)", () => {
    V3Rules.calculator = false;
    const { region, player, target } = makePlayer();
    const eye = new EyeOfAyak();
    eye.assignToPlayer(player);
    eye.attack(player, target, {});
    expect(graphicIds(region)).toEqual([]);
    expect(target.incomingProjectiles[0].options.spotAnim).toBeUndefined();
  });
});
