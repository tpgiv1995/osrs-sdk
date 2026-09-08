import { Trainer } from "../../src/sdk/Trainer";
import { Player } from "../../src/sdk/Player";
import { TestRegion } from "../../src/sdk/testing/TestRegion";
import { World } from "../../src/sdk/World";
import { Viewport } from "../../src/sdk/Viewport";

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
  return { region, world, player };
}

describe("trainer death and reset events", () => {
  test("a player reaching 0 hitpoints fires the death listener once", () => {
    const { world, player } = setup();
    const deaths = jest.fn();
    const stop = Trainer.onPlayerDeath(deaths);

    player.currentStats.hitpoint = 0;
    world.tickWorld();
    world.tickWorld();

    expect(deaths).toHaveBeenCalledTimes(1);
    stop();
  });

  test("Trainer.reset notifies reset listeners and unsubscribe stops them", () => {
    const { region, player } = setup();
    // TestRegion has no configured loadout, so stub the region reset itself.
    region.reset = jest.fn(() => ({ player })) as unknown as typeof region.reset;
    const resets = jest.fn();
    const stop = Trainer.onReset(resets);

    Trainer.reset();
    expect(resets).toHaveBeenCalledTimes(1);
    stop();
    Trainer.reset();
    expect(resets).toHaveBeenCalledTimes(1);
  });
});
