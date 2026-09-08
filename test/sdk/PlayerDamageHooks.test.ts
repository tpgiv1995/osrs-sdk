import { Player } from "../../src/sdk/Player";
import { Projectile } from "../../src/sdk/weapons/Projectile";
import { MeleeWeapon } from "../../src/sdk/weapons/MeleeWeapon";
import { TestRegion } from "../../src/sdk/testing/TestRegion";
import { TestNpc } from "../../src/sdk/testing/TestNpc";
import { World } from "../../src/sdk/World";
import { Viewport } from "../../src/sdk/Viewport";
import { Trainer } from "../../src/sdk/Trainer";

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
  return { region, world, player, npc };
}

function hit(player: Player, from: Player | TestNpc, damage: number) {
  player.addProjectile(new Projectile(new MeleeWeapon(), damage, from, player, "stab", { hidden: true, setDelay: 0 }));
  player.attackStep();
}

describe("player damage hooks", () => {
  test("incoming damage modifiers run in order before the hit lands", () => {
    const { player, npc } = setup();
    player.currentStats.hitpoint = 99;
    player.incomingDamageModifiers.push((damage) => damage * 2, (damage) => damage + 1);
    hit(player, npc, 10);
    expect(player.currentStats.hitpoint).toBe(99 - 21);
  });

  test("damage taken listeners see the final damage", () => {
    const { player, npc } = setup();
    player.currentStats.hitpoint = 99;
    const seen: number[] = [];
    player.damageTakenListeners.push((damage) => seen.push(damage));
    player.incomingDamageModifiers.push(() => 2);
    hit(player, npc, 30);
    expect(seen).toEqual([2]);
  });

  test("attack range penalty lowers weapon range but never below 1", () => {
    const { player } = setup();
    const base = player.attackRange;
    player.attackRangePenalty = 2;
    expect(player.attackRange).toBe(Math.max(1, base - 2));
    player.attackRangePenalty = 99;
    expect(player.attackRange).toBe(1);
  });
});
