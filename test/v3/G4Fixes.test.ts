import { Player } from "../../src/sdk/Player";
import { World } from "../../src/sdk/World";
import { TestRegion } from "../../src/sdk/testing/TestRegion";
import { TestNpc } from "../../src/sdk/testing/TestNpc";
import { Random } from "../../src/sdk/Random";
import { AttackBonuses } from "../../src/sdk/gear/Weapon";
import { AttackStylesController } from "../../src/sdk/AttackStylesController";
import { V3Rules, conflictionActive, conflictionIsArmed, fangRoll, setConflictionState, stdRoll, playerDefenceRoll } from "../../src/sdk/V3Rules";
import { IceBarrageSpell } from "../../src/sdk/weapons/IceBarrageSpell";
import { BloodBarrageSpell } from "../../src/sdk/weapons/BloodBarrageSpell";
import { EyeOfAyak } from "../../src/content/weapons/EyeOfAyak";
import { BloodAncientSceptre } from "../../src/content/weapons/BloodAncientSceptre";
import { Blowpipe } from "../../src/content/weapons/Blowpipe";
import { BowOfFaerdhinen } from "../../src/content/weapons/BowOfFaerdhinen";
import { ConflictionGauntlets } from "../../src/content/equipment/ConflictionGauntlets";
import { MagusRing } from "../../src/content/equipment/MagusRing";
import { SaturatedHeart } from "../../src/content/items/SaturatedHeart";
import { SaradominBrew } from "../../src/content/items/SaradominBrew";
import { SuperRestore } from "../../src/content/items/SuperRestore";
import { DivineRunePouch } from "../../src/content/items/DivineRunePouch";
import { CrystalShield } from "../../src/content/equipment/CrystalShield";

function makePlayer() {
  const region = new TestRegion(60, 60);
  const world = new World();
  region.world = world;
  world.addRegion(region);
  const player = new Player(region, { x: 30, y: 30 });
  region.addPlayer(player);
  player.stats = { attack: 99, strength: 99, defence: 99, range: 99, magic: 99, hitpoint: 99, prayer: 93, specialAttack: 100 } as never;
  player.currentStats = JSON.parse(JSON.stringify(player.stats));
  return { region, world, player };
}

function sequence(...values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

function pray(player: Player, name: string) {
  const prayer = player.prayerController.findPrayerByName(name);
  prayer.isActive = true;
  prayer.isLit = true;
}

function target(region: TestRegion, x = 33, y = 30) {
  const npc = new TestNpc(region, { x, y }, {});
  return npc;
}

beforeEach(() => {
  V3Rules.calculator = true;
  AttackStylesController.controller.stylesMap = {};
  Random.reset();
  Random.setRandom(() => Math.random());
});

describe("G4 F2: Divine rune pouch (l) and rune consumption", () => {
  test("names, rune types and starting quantities match the saved Inferno v2 setup", () => {
    const pouch = new DivineRunePouch();
    expect(pouch.itemName).toBe("Divine rune pouch (l)");
    expect(pouch.stacks.map((s) => [s.rune, s.id, s.quantity])).toEqual([
      ["Water", 555, 15000],
      ["Death", 560, 2525],
      ["Blood", 565, 8000],
      ["Soul", 566, 8000],
    ]);
  });

  test("Ice Barrage costs 6 water, 4 death, 2 blood; Blood Barrage 4 death, 4 blood, 1 soul", () => {
    const { player, region } = makePlayer();
    const pouch = new DivineRunePouch();
    player.inventory[0] = pouch;
    const t = target(region);
    expect(new IceBarrageSpell().cast(player, t)).toBe(true);
    expect(pouch.stacks.map((s) => s.quantity)).toEqual([15000 - 6, 2525 - 4, 8000 - 2, 8000]);
    expect(new BloodBarrageSpell().cast(player, t)).toBe(true);
    expect(pouch.stacks.map((s) => s.quantity)).toEqual([15000 - 6, 2525 - 8, 8000 - 6, 8000 - 1]);
  });

  test("a cast is refused at zero, spends nothing and does not reset the attack timer", () => {
    const { player, region } = makePlayer();
    const pouch = new DivineRunePouch([
      { rune: "Water", id: 555, quantity: 6 },
      { rune: "Death", id: 560, quantity: 3 },
      { rune: "Blood", id: 565, quantity: 8000 },
      { rune: "Soul", id: 566, quantity: 0 },
    ]);
    player.inventory[0] = pouch;
    const t = target(region);
    expect(new IceBarrageSpell().cast(player, t)).toBe(false);
    expect(new BloodBarrageSpell().cast(player, t)).toBe(false);
    expect(pouch.stacks.map((s) => s.quantity)).toEqual([6, 3, 8000, 0]);
    // through the player: the sceptre's autocast reports no attack
    const sceptre = new BloodAncientSceptre();
    sceptre.assignToPlayer(player);
    player.equipmentChanged();
    player.aggro = t;
    expect(sceptre.attack(player, t)).toBe(false);
    player.manualSpellCastSelection = new IceBarrageSpell();
    expect(player.attack()).toBe(false);
  });

  test("with no pouch in the inventory casts are free (upstream loadouts)", () => {
    const { player, region } = makePlayer();
    expect(new IceBarrageSpell().cast(player, target(region))).toBe(true);
  });

  test("the pouch icon shows the Ice Barrage casts left", () => {
    expect(new DivineRunePouch().overlayText).toBe("631");
  });
});

describe("G4 F3: prayers", () => {
  test("levels: Deadeye 62, Mystic Vigour 63, drain 12 each", () => {
    const { player } = makePlayer();
    const d = player.prayerController.findPrayerByName("Deadeye");
    const v = player.prayerController.findPrayerByName("Mystic Vigour");
    expect(d.levelRequirement()).toBe(62);
    expect(v.levelRequirement()).toBe(63);
    expect(d.drainRate()).toBe(12);
    expect(v.drainRate()).toBe(12);
  });

  test("Steel Skin, Rock Skin and Thick Skin stack with Mystic Vigour and Deadeye, and conflict with each other", () => {
    const { player } = makePlayer();
    const pc = player.prayerController;
    const on = (n: string) => pc.findPrayerByName(n).toggle(player);
    const tick = () => pc.prayers.forEach((p) => p.tick());
    on("Steel Skin");
    on("Mystic Vigour");
    tick();
    expect(pc.activePrayers().map((p) => p.name).sort()).toEqual(["Mystic Vigour", "Steel Skin"]);
    on("Deadeye"); // replaces Vigour (both offensive), the skin stays
    tick();
    expect(pc.activePrayers().map((p) => p.name).sort()).toEqual(["Deadeye", "Steel Skin"]);
    on("Rock Skin"); // skins conflict with each other
    tick();
    expect(pc.activePrayers().map((p) => p.name).sort()).toEqual(["Deadeye", "Rock Skin"]);
    on("Thick Skin");
    tick();
    expect(pc.activePrayers().map((p) => p.name).sort()).toEqual(["Deadeye", "Thick Skin"]);
  });

  test("the skins conflict with Piety (Rigour and Augury are locked on this account)", () => {
    ["Piety"].forEach((name) => {
      const { player } = makePlayer();
      const pc = player.prayerController;
      pc.findPrayerByName("Steel Skin").toggle(player);
      pc.prayers.forEach((p) => p.tick());
      pc.findPrayerByName(name).toggle(player);
      pc.prayers.forEach((p) => p.tick());
      expect(pc.activePrayers().map((p) => p.name)).toEqual([name]);
    });
  });

  test("Defence boosts add: Steel Skin + Mystic Vigour = +20% (Defence 99 gives level 118)", () => {
    const { player } = makePlayer();
    player.cachedBonuses.defence.range = 0;
    const roll = () => playerDefenceRoll(player, "range", 0);
    pray(player, "Mystic Vigour");
    expect(roll()).toBe((8 + Math.floor((99 * 105) / 100)) * 64);
    pray(player, "Steel Skin");
    expect(roll()).toBe((8 + Math.floor((99 * 120) / 100)) * 64);
    player.prayerController.findPrayerByName("Mystic Vigour").isActive = false;
    pray(player, "Deadeye");
    expect(roll()).toBe((8 + Math.floor((99 * 120) / 100)) * 64);
  });

  test("Steel Skin + Mystic Vigour drain 24 per tick (12 each)", () => {
    const { player } = makePlayer();
    pray(player, "Steel Skin");
    pray(player, "Mystic Vigour");
    expect(player.prayerController.drainRate()).toBe(24);
  });
});

describe("G4 F4: Confliction gauntlets identity and primary target", () => {
  function setup() {
    const { player, region } = makePlayer();
    [new EyeOfAyak(), new ConflictionGauntlets(), new MagusRing()].forEach((i) => i.assignToPlayer(player));
    player.equipmentChanged();
    pray(player, "Mystic Vigour");
    player.currentStats.magic = 112;
    const t = target(region);
    const eye = player.equipment.weapon as EyeOfAyak;
    const ice = new IceBarrageSpell();
    const blood = new BloodBarrageSpell();
    const bonuses = (extra: AttackBonuses = {}): AttackBonuses => ({ voidMultiplier: 1, gearMageMultiplier: 1, magicBaseSpellDamage: 30, attackStyle: "magic", ...extra });
    const chance = (w: { _calculatePrayerEffects: Function; _attackRoll: Function; _defenceRoll: Function; _hitChance: Function }, b: AttackBonuses) => {
      w._calculatePrayerEffects(player, t, b);
      return { p: w._hitChance(player, t, b), a: w._attackRoll(player, t, b), d: w._defenceRoll(player, t, b) };
    };
    const miss = (w: { _rollAttack: Function; _calculatePrayerEffects: Function }, b: AttackBonuses) => {
      Random.setRandom(() => 0.9999999);
      w._calculatePrayerEffects(player, t, b);
      w._rollAttack(player, t, b);
    };
    return { player, t, eye, ice, blood, bonuses, chance, miss };
  }

  test("a miss with the Eye arms the Eye only; the same weapon then rolls twice", () => {
    const { eye, ice, t, bonuses, chance, miss } = setup();
    miss(eye, bonuses({ isAccurate: true }));
    expect(conflictionIsArmed(t, "Eye of Ayak")).toBe(true);
    const c = chance(eye, bonuses({ isAccurate: true }));
    expect(c.p).toBeCloseTo(fangRoll(c.a, c.d), 12);
    const ci = chance(ice, bonuses());
    expect(ci.p).toBeCloseTo(stdRoll(ci.a, ci.d), 12);
  });

  test("weapon switch: a miss with Ice Barrage does not arm the Eye, and the Eye's next attack replaces the state", () => {
    const { player, eye, ice, t, bonuses, chance, miss } = setup();
    miss(ice, bonuses());
    expect(conflictionIsArmed(t, "Ice Barrage")).toBe(true);
    const c = chance(eye, bonuses({ isAccurate: true }));
    expect(c.p).toBeCloseTo(stdRoll(c.a, c.d), 12);
    // the Eye's own next attack (a hit) replaces the Ice state
    Random.setRandom(() => 0);
    const b = bonuses({ isAccurate: true });
    eye._calculatePrayerEffects(player, t, b);
    eye._rollAttack(player, t, b);
    expect(conflictionIsArmed(t, "Ice Barrage")).toBe(false);
  });

  test("spell switch: an Ice Barrage miss does not arm Blood Barrage", () => {
    const { ice, blood, t, bonuses, chance, miss } = setup();
    miss(ice, bonuses());
    const cb = chance(blood, bonuses({ magicBaseSpellDamage: 29 }));
    expect(cb.p).toBeCloseTo(stdRoll(cb.a, cb.d), 12);
    const ci = chance(ice, bonuses());
    expect(ci.p).toBeCloseTo(fangRoll(ci.a, ci.d), 12);
    expect(conflictionIsArmed(t, "Blood Barrage")).toBe(false);
  });

  test("secondary barrage targets neither arm nor consume the state", () => {
    const { player, ice, t, bonuses, chance, miss } = setup();
    // a secondary miss does not arm
    miss(ice, bonuses({ isSecondaryTarget: true }));
    expect(conflictionIsArmed(t, "Ice Barrage")).toBe(false);
    // an armed primary state is not used by, or cleared by, a secondary roll
    setConflictionState(t, "Ice Barrage");
    const c = chance(ice, bonuses({ isSecondaryTarget: true }));
    expect(c.p).toBeCloseTo(stdRoll(c.a, c.d), 12);
    // a secondary hit leaves the primary's armed state alone
    Random.setRandom(() => 0);
    const b = bonuses({ isSecondaryTarget: true });
    ice._calculatePrayerEffects(player, t, b);
    ice._rollAttack(player, t, b);
    expect(conflictionIsArmed(t, "Ice Barrage")).toBe(true);
  });

  test("a two-handed weapon disables the passive; a one-handed weapon or no weapon allows it", () => {
    const { player } = setup();
    expect(conflictionActive(player)).toBe(true);
    new BowOfFaerdhinen().assignToPlayer(player);
    expect(conflictionActive(player)).toBe(false);
    player.equipment.weapon = null;
    expect(conflictionActive(player)).toBe(true);
  });
});

describe("G4 F5: Blood Barrage damage and healing", () => {
  function setup() {
    const { player, region } = makePlayer();
    const sceptre = new BloodAncientSceptre();
    sceptre.assignToPlayer(player);
    player.equipmentChanged();
    const t = target(region);
    return { player, region, t, sceptre };
  }

  /** Ticks the target's incoming projectiles until they have all landed. */
  function land(t: TestNpc, ticks = 8) {
    for (let i = 0; i < ticks; i++) t.processIncomingAttacks();
  }

  test("base max hit is 29 (Ice Barrage 30) before magic damage bonuses", () => {
    const { player, t } = setup();
    const blood = new BloodBarrageSpell();
    const b: AttackBonuses = { magicBaseSpellDamage: blood.baseDamage, attackStyle: "magic", voidMultiplier: 1 };
    blood._calculatePrayerEffects(player, t, b);
    expect(blood.baseDamage).toBe(29);
    expect(new IceBarrageSpell().baseDamage).toBe(30);
    expect(blood._maxHit(player, t, b)).toBe(Math.floor((29 * Math.round(player.bonuses.other.magicDamage * 1000)) / 1000));
  });

  test("lifesteal lands with the hit: no heal at cast, the heal on the tick the damage applies", () => {
    const { player, t } = setup();
    player.currentStats.hitpoint = 50;
    t.currentStats.hitpoint = 125;
    Random.setRandom(sequence(0.01, 0.999)); // hit, high roll
    const blood = new BloodBarrageSpell();
    blood.attack(player, t, { magicBaseSpellDamage: 29, attackStyle: "magic" });
    const rolled = blood.damageRoll;
    expect(rolled).toBeGreaterThan(0);
    expect(player.currentStats.hitpoint).toBe(50); // right after attack(): nothing yet
    let landedTick = -1;
    let healedTick = -1;
    for (let tick = 1; tick <= 8; tick++) {
      t.processIncomingAttacks();
      if (landedTick < 0 && t.currentStats.hitpoint < 125) landedTick = tick;
      if (healedTick < 0 && player.currentStats.hitpoint > 50) healedTick = tick;
    }
    expect(landedTick).toBeGreaterThan(1); // there is a hit delay
    expect(healedTick).toBe(landedTick); // the same tick
    expect(player.currentStats.hitpoint).toBe(50 + Math.floor((rolled * 275) / 1000));
  });

  test("heals 25% without the sceptre", () => {
    const { player, t } = setup();
    new EyeOfAyak().assignToPlayer(player);
    player.equipmentChanged();
    player.currentStats.hitpoint = 50;
    Random.setRandom(sequence(0.01, 0.999));
    const blood = new BloodBarrageSpell();
    blood.attack(player, t, { magicBaseSpellDamage: 29, attackStyle: "magic" });
    const rolled = blood.damageRoll;
    land(t);
    expect(player.currentStats.hitpoint).toBe(50 + Math.floor((rolled * 250) / 1000));
  });

  test("a target with little HP left still pays the full would-be damage", () => {
    const { player, t } = setup();
    t.currentStats.hitpoint = 2;
    player.currentStats.hitpoint = 50;
    Random.setRandom(sequence(0.01, 0.999));
    const blood = new BloodBarrageSpell();
    blood.attack(player, t, { magicBaseSpellDamage: 29, attackStyle: "magic" });
    const rolled = blood.damageRoll;
    expect(rolled).toBeGreaterThan(2);
    land(t);
    expect(player.currentStats.hitpoint).toBe(50 + Math.floor((rolled * 275) / 1000));
  });

  test("the overheal cap stays 108, and a multi-target cast heals from every target hit", () => {
    const { player, region, t } = setup();
    const second = target(region, 34, 30);
    region.mobs.push(t as never, second as never);
    player.currentStats.hitpoint = 99;
    Random.setRandom(sequence(0.01, 0.9, 0.01, 0.9, 0.01, 0.9, 0.01, 0.9));
    const blood = new BloodBarrageSpell();
    blood.cast(player, t);
    expect(player.currentStats.hitpoint).toBe(99);
    land(t);
    land(second);
    expect(player.currentStats.hitpoint).toBeGreaterThan(99);
    for (let i = 0; i < 30; i++) {
      Random.setRandom(sequence(0.01, 0.99));
      blood.cast(player, t);
      land(t);
      land(second);
    }
    expect(player.currentStats.hitpoint).toBe(108);
  });

  test("blowpipe special: the heal also arrives with the hit, not at cast", () => {
    const { player, t } = setup();
    new Blowpipe().assignToPlayer(player);
    player.equipmentChanged();
    player.currentStats.hitpoint = 50;
    t.currentStats.hitpoint = 125;
    Random.setRandom(sequence(0.01, 0.999));
    const bp = player.equipment.weapon as Blowpipe;
    bp.specialAttack(player, t);
    const rolled = bp.damageRoll;
    expect(rolled).toBeGreaterThan(1);
    expect(player.currentStats.hitpoint).toBe(50);
    let landedTick = -1;
    let healedTick = -1;
    for (let tick = 1; tick <= 8; tick++) {
      t.processIncomingAttacks();
      if (landedTick < 0 && t.currentStats.hitpoint < 125) landedTick = tick;
      if (healedTick < 0 && player.currentStats.hitpoint > 50) healedTick = tick;
    }
    expect(healedTick).toBe(landedTick);
    expect(landedTick).toBeGreaterThan(0);
    expect(player.currentStats.hitpoint).toBe(50 + Math.floor(rolled / 2));
  });
});

describe("G4 F6: potions, the heart and gear changes keep the target and the attack timer", () => {
  test("drinking a brew, a restore, the heart and switching to BowFa keep aggro and the attack delay", () => {
    const { player, region } = makePlayer();
    const t = target(region);
    region.addMob(t);
    new BloodAncientSceptre().assignToPlayer(player);
    new CrystalShield().assignToPlayer(player);
    player.equipmentChanged();
    const bow = new BowOfFaerdhinen();
    player.inventory[0] = bow;
    player.aggro = t;
    player.attackDelay = 2;
    new SaradominBrew().drink(player);
    expect(player.aggro).toBe(t);
    new SuperRestore().drink(player);
    expect(player.aggro).toBe(t);
    const heart = new SaturatedHeart();
    player.inventory[1] = heart;
    heart.inventoryLeftClick(player);
    expect(player.aggro).toBe(t);
    expect(player.currentStats.magic).toBe(112);
    bow.inventoryLeftClick(player);
    expect(player.equipment.weapon.itemName).toBe("Bow of faerdhinen");
    expect(player.aggro).toBe(t);
    expect(player.attackDelay).toBe(2);
  });

  test("legacy mode still clears the target on equipment changes and potions", () => {
    V3Rules.calculator = false;
    const { player, region } = makePlayer();
    const t = target(region);
    player.aggro = t;
    new SaradominBrew().drink(player);
    expect(player.aggro).toBeNull();
    player.aggro = t;
    player.equipmentChanged();
    expect(player.aggro).toBeNull();
    V3Rules.calculator = true;
  });

  test("the two-handed swap refusal is a V3 rule: legacy mode keeps upstream's behaviour", () => {
    V3Rules.calculator = false;
    const { player } = makePlayer();
    new BloodAncientSceptre().assignToPlayer(player);
    new CrystalShield().assignToPlayer(player);
    player.equipmentChanged();
    const bow = new BowOfFaerdhinen();
    player.inventory = new Array(28).fill(new SuperRestore());
    player.inventory[0] = bow;
    bow.inventoryLeftClick(player);
    expect(player.equipment.weapon.itemName).toBe("Bow of faerdhinen"); // upstream swaps (and loses the shield)
    V3Rules.calculator = true;
  });
});
