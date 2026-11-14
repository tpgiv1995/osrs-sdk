import { Trainer } from "../../src/sdk/Trainer";
import { Player } from "../../src/sdk/Player";
import { TestRegion } from "../../src/sdk/testing/TestRegion";
import { World } from "../../src/sdk/World";

function setup() {
  const region = new TestRegion(10, 10);
  const world = new World();
  region.world = world;
  world.addRegion(region);
  const player = new Player(region, { x: 2, y: 2 });
  region.addPlayer(player);
  Trainer.setPlayer(player);
  return { region, world, player };
}

describe("trainer death and reset events", () => {
  test("the player dying fires the death listener once", () => {
    const { player } = setup();
    const deaths = jest.fn();
    const stop = Trainer.onPlayerDeath(deaths);

    player.dead();

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
