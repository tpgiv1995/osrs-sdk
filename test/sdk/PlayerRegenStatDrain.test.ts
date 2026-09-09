import { PlayerRegenTimer } from "../../src/sdk/PlayerRegenTimers";
import { Player } from "../../src/sdk/Player";

/** Minimal Player stand-in exposing only what PlayerRegenTimer touches. */
function fakePlayer(currentOverrides: Record<string, number> = {}) {
  const base = { attack: 99, strength: 99, defence: 99, range: 99, magic: 99, hitpoint: 99, prayer: 99, agility: 99, run: 10000, specialAttack: 100 };
  return {
    stats: { ...base },
    currentStats: { ...base, ...currentOverrides },
    equipment: {},
  } as unknown as Player;
}

function tick(timer: PlayerRegenTimer, times: number) {
  for (let i = 0; i < times; i++) timer.regen();
}

describe("PlayerRegenTimer boosted-stat drain", () => {
  it("drains a super-combat boost by one level every 100 ticks (60s)", () => {
    const player = fakePlayer({ attack: 118, strength: 118, defence: 118 });
    const timer = new PlayerRegenTimer(player);

    // 99 ticks in, nothing has drained yet.
    tick(timer, 99);
    expect(player.currentStats.attack).toBe(118);
    expect(player.currentStats.strength).toBe(118);
    expect(player.currentStats.defence).toBe(118);

    // The 100th tick drains each boosted stat by one.
    tick(timer, 1);
    expect(player.currentStats.attack).toBe(117);
    expect(player.currentStats.strength).toBe(117);
    expect(player.currentStats.defence).toBe(117);
  });

  it("stops draining once a stat is back to base and never dips below it", () => {
    const player = fakePlayer({ attack: 101 });
    const timer = new PlayerRegenTimer(player);

    tick(timer, 100); // 101 -> 100
    expect(player.currentStats.attack).toBe(100);
    tick(timer, 100); // 100 -> 99
    expect(player.currentStats.attack).toBe(99);
    tick(timer, 300); // already at base, must hold
    expect(player.currentStats.attack).toBe(99);
  });

  it("recovers a lowered stat back up toward base", () => {
    const player = fakePlayer({ defence: 90 });
    const timer = new PlayerRegenTimer(player);

    tick(timer, 100);
    expect(player.currentStats.defence).toBe(91);
  });

  it("leaves unboosted combat stats untouched", () => {
    const player = fakePlayer({ attack: 118 });
    const timer = new PlayerRegenTimer(player);

    tick(timer, 100);
    expect(player.currentStats.range).toBe(99);
    expect(player.currentStats.magic).toBe(99);
  });
});
