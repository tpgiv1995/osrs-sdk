import { Player } from "../../src/sdk/Player";
import { TestRegion } from "../../src/sdk/testing/TestRegion";
import { TestNpc } from "../../src/sdk/testing/TestNpc";
import { World } from "../../src/sdk/World";
import { Viewport } from "../../src/sdk/Viewport";
import { Trainer } from "../../src/sdk/Trainer";
import { SaradominGodsword } from "../../src/content/weapons/SaradominGodsword";
import { BurningClaws } from "../../src/content/weapons/BurningClaws";

function setup() {
  const region = new TestRegion(10, 10);
  const world = new World();
  region.world = world;
  world.addRegion(region);
  Viewport.setupViewport(region, document.createElement("canvas"), document.createElement("div"), true);
  const player = new Player(region, { x: 2, y: 2 });
  region.addPlayer(player);
  Viewport.viewport.setPlayer(player);
  Trainer.setPlayer(player);
  const npc = new TestNpc(region, { x: 3, y: 2 }, { aggro: player });
  region.addMob(npc);
  npc.currentStats.hitpoint = 500;
  return { region, world, player, npc };
}

describe("V3 kit special attacks", () => {
  test("Saradomin godsword Healing Blade lands, heals at least 10 and restores at least 5 prayer", () => {
    const { player, npc } = setup();
    const sgs = new SaradominGodsword();
    player.equipment.weapon = sgs;
    player.currentStats.hitpoint = 50;
    player.currentStats.prayer = 40;
    player.forceMaxDamageRollsOnNextAttack = true;

    const performed = sgs.specialAttack(player, npc);

    expect(performed).toBe(true);
    expect(sgs.damage).toBeGreaterThan(0);
    expect(npc.incomingProjectiles).toHaveLength(1);
    expect(player.currentStats.hitpoint).toBeGreaterThanOrEqual(60);
    expect(player.currentStats.prayer).toBeGreaterThanOrEqual(45);
    expect(sgs.specialAttackDrain()).toBe(50);
  });

  test("Burning barrage queues three hits and costs 35 energy", () => {
    const { player, npc } = setup();
    const claws = new BurningClaws();
    player.equipment.weapon = claws;
    player.forceMaxDamageRollsOnNextAttack = true;

    const performed = claws.specialAttack(player, npc);

    expect(performed).toBe(true);
    expect(npc.incomingProjectiles).toHaveLength(3);
    const total = npc.incomingProjectiles.reduce((sum, projectile) => sum + projectile.damage, 0);
    expect(total).toBeGreaterThan(0);
    expect(claws.specialAttackDrain()).toBe(35);
  });
});
