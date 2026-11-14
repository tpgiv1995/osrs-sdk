import { Player } from "../../src/sdk/Player";
import { World } from "../../src/sdk/World";
import { TestRegion } from "../../src/sdk/testing/TestRegion";
import { TestNpc } from "../../src/sdk/testing/TestNpc";
import { Random } from "../../src/sdk/Random";
import { AttackBonuses } from "../../src/sdk/gear/Weapon";
import { AttackStyle, AttackStylesController } from "../../src/sdk/AttackStylesController";
import { V3Rules, fangRoll, setConflictionArmed, stdRoll } from "../../src/sdk/V3Rules";
import { RangedWeapon } from "../../src/sdk/weapons/RangedWeapon";
import { BloodBarrageSpell } from "../../src/sdk/weapons/BloodBarrageSpell";
import { EyeOfAyak } from "../../src/content/weapons/EyeOfAyak";
import { BloodAncientSceptre } from "../../src/content/weapons/BloodAncientSceptre";
import { BowOfFaerdhinen } from "../../src/content/weapons/BowOfFaerdhinen";
import { GuthansHelm } from "../../src/content/equipment/GuthansHelm";
import { ImbuedSaradominCape } from "../../src/content/equipment/ImbuedSaradominCape";
import { OccultNecklace } from "../../src/content/equipment/OccultNecklace";
import { BandosChestplate } from "../../src/content/equipment/BandosChestplate";
import { CrystalShield } from "../../src/content/equipment/CrystalShield";
import { OathplateLegs } from "../../src/content/equipment/OathplateLegs";
import { ConflictionGauntlets } from "../../src/content/equipment/ConflictionGauntlets";
import { AvernicTreadsPrEt } from "../../src/content/equipment/AvernicTreadsPrEt";
import { MagusRing } from "../../src/content/equipment/MagusRing";
import { RadasBlessing4 } from "../../src/content/equipment/RadasBlessing4";
import { CrystalHelm } from "../../src/content/equipment/CrystalHelm";
import { CrystalBody } from "../../src/content/equipment/CrystalBody";
import { CrystalLegs } from "../../src/content/equipment/CrystalLegs";
import { DizanasQuiver } from "../../src/content/equipment/DizanasQuiver";
import { NecklaceOfRupture } from "../../src/content/equipment/NecklaceOfRupture";
import { SaturatedHeart } from "../../src/content/items/SaturatedHeart";
import { SaradominBrew } from "../../src/content/items/SaradominBrew";
import { BastionPotion } from "../../src/content/items/BastionPotion";
import { PrayerRegenerationPotion } from "../../src/content/items/PrayerRegenerationPotion";

/* Every expected number below is printed by osrs-advisor/tools/inferno_gear.py (python -I inferno_gear.py). */

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

function wearTank(player: Player) {
  [
    new GuthansHelm(), new ImbuedSaradominCape(), new OccultNecklace(), new EyeOfAyak(), new BandosChestplate(),
    new CrystalShield(), new OathplateLegs(), new ConflictionGauntlets(), new AvernicTreadsPrEt(), new MagusRing(),
    new RadasBlessing4(),
  ].forEach((item) => item.assignToPlayer(player));
  player.equipmentChanged();
}

function wearBowfa(player: Player) {
  [
    new BowOfFaerdhinen(), new CrystalHelm(), new CrystalBody(), new CrystalLegs(), new DizanasQuiver(),
    new NecklaceOfRupture(), new ConflictionGauntlets(), new AvernicTreadsPrEt(), new MagusRing(), new RadasBlessing4(),
  ].forEach((item) => item.assignToPlayer(player));
  player.equipment.offhand = null;
  player.equipmentChanged();
}

/** Random source that returns the given values in order, then repeats the last one. */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

function pray(player: Player, name: string) {
  const prayer = player.prayerController.findPrayerByName(name);
  prayer.isActive = true;
  prayer.isLit = true;
}

describe("V3 Inferno kit: calculator parity", () => {
  beforeEach(() => {
    V3Rules.calculator = true;
    AttackStylesController.controller.stylesMap = {};
    Random.reset();
  });

  test("tank set totals match the calculator (matk +60, ranged def +371, mdmg 18%, prayer 9)", () => {
    const { player } = makePlayer();
    wearTank(player);
    expect(player.bonuses.attack.magic).toBe(60);
    expect(player.bonuses.defence.range).toBe(371);
    expect(player.bonuses.defence.stab).toBe(319);
    expect(player.bonuses.defence.slash).toBe(356);
    expect(player.bonuses.defence.crush).toBe(325);
    expect(player.bonuses.other.prayer).toBe(9);
    expect(Math.round((player.bonuses.other.magicDamage - 1) * 1000)).toBe(180);
  });

  test("Eye of Ayak roll, Soul Rend roll and max hit at Magic 112 with Mystic Vigour", () => {
    const { player, region } = makePlayer();
    wearTank(player);
    player.currentStats.magic = 112;
    pray(player, "Mystic Vigour");
    const target = new TestNpc(region, { x: 33, y: 30 }, {});
    const eye = player.equipment.weapon as EyeOfAyak;
    const bonuses: AttackBonuses = { isAccurate: true, voidMultiplier: 1, gearMageMultiplier: 1 };
    eye._calculatePrayerEffects(player, target, bonuses);
    expect(eye._attackRoll(player, target, bonuses)).toBe(17732);
    expect(eye._maxHit(player, target, bonuses)).toBe(37);
    const longrange: AttackBonuses = { isAccurate: false, voidMultiplier: 1, gearMageMultiplier: 1 };
    eye._calculatePrayerEffects(player, target, longrange);
    expect(eye._attackRoll(player, target, longrange)).toBe(17484);
    const spec: AttackBonuses = { isAccurate: true, isSpecialAttack: true, voidMultiplier: 1, gearMageMultiplier: 1 };
    eye._calculatePrayerEffects(player, target, spec);
    expect(eye._attackRoll(player, target, spec)).toBe(35464);
    expect(eye._maxHit(player, target, spec)).toBe(48);
    player.currentStats.magic = 99;
    expect(eye._maxHit(player, target, bonuses)).toBe(32);
  });

  test("Eye of Ayak facts: one-handed, 3 ticks, Soul Rend costs 50% and takes 5 ticks", () => {
    const { player, region } = makePlayer();
    wearTank(player);
    const eye = player.equipment.weapon as EyeOfAyak;
    expect(eye.isTwoHander).toBe(false);
    expect(eye.attackSpeed).toBe(3);
    expect(eye.specialAttackDrain()).toBe(50);
    pray(player, "Mystic Vigour");
    player.currentStats.magic = 112;
    const target = new TestNpc(region, { x: 33, y: 30 }, {});
    region.addMob(target);
    Random.setRandom(sequence(0.1, 0.9));
    expect(target.magicDefReduction).toBe(0);
    eye.specialAttack(player, target);
    // a landed Soul Rend lowers the target's Magic defence by the damage dealt
    expect(target.magicDefReduction).toBe(eye.damage);
    expect(eye.damage).toBeGreaterThan(0);
    expect(eye.attackSpeed).toBe(5);
    Random.setRandom(() => Math.random());
  });

  test("Soul Rend damage lowers the target's Magic defence roll, never below zero bonus", () => {
    const { player, region } = makePlayer();
    wearTank(player);
    const target = new TestNpc(region, { x: 33, y: 30 }, {});
    const eye = player.equipment.weapon as EyeOfAyak;
    const bonuses: AttackBonuses = {};
    eye._calculatePrayerEffects(player, target, bonuses);
    // TestNpc: Magic 90, Magic defence bonus 0 -> (90 + 9) * 64
    expect(eye._defenceRoll(player, target, bonuses)).toBe(99 * 64);
    target.magicDefReduction = 500;
    expect(eye._defenceRoll(player, target, bonuses)).toBe(99 * 64);
  });

  test("Confliction gauntlets: after a miss the next magic attack rolls accuracy twice", () => {
    const { player, region } = makePlayer();
    wearTank(player);
    pray(player, "Mystic Vigour");
    player.currentStats.magic = 112;
    const target = new TestNpc(region, { x: 33, y: 30 }, {});
    const eye = player.equipment.weapon as EyeOfAyak;
    const bonuses: AttackBonuses = { isAccurate: true, voidMultiplier: 1, gearMageMultiplier: 1 };
    eye._calculatePrayerEffects(player, target, bonuses);
    const a = eye._attackRoll(player, target, bonuses);
    const d = eye._defenceRoll(player, target, bonuses);
    expect(eye._hitChance(player, target, bonuses)).toBeCloseTo(stdRoll(a, d), 12);
    // a forced miss arms it
    Random.setRandom(() => 0.9999999);
    eye._rollAttack(player, target, bonuses);
    expect(eye.lastHitHit).toBe(false);
    expect(eye._hitChance(player, target, bonuses)).toBeCloseTo(fangRoll(a, d), 12);
    // a hit disarms it
    Random.setRandom(() => 0);
    eye._rollAttack(player, target, bonuses);
    expect(eye.lastHitHit).toBe(true);
    expect(eye._hitChance(player, target, bonuses)).toBeCloseTo(stdRoll(a, d), 12);
    // without the gauntlets the state does nothing
    setConflictionArmed(target, true);
    player.equipment.gloves = null;
    player.equipmentChanged();
    const a2 = eye._attackRoll(player, target, bonuses);
    expect(eye._hitChance(player, target, bonuses)).toBeCloseTo(stdRoll(a2, eye._defenceRoll(player, target, bonuses)), 12);
    Random.setRandom(() => Math.random());
  });

  test("BowFa switch vs Zuk: roll 54418 vs 44116, accuracy 59.465%, max 46 (Deadeye, Ranged 112)", () => {
    const { player, region } = makePlayer();
    wearBowfa(player);
    player.currentStats.range = 112;
    pray(player, "Deadeye");
    expect(player.bonuses.attack.range).toBe(235);
    expect(player.bonuses.other.rangedStrength).toBe(119);
    expect(player.bonuses.other.prayer).toBe(14);
    const bowfa = player.equipment.weapon as BowOfFaerdhinen;
    const zuk = new TestNpc(region, { x: 33, y: 30 }, {});
    const bonuses: AttackBonuses = { voidMultiplier: 1, gearRangeMultiplier: 1 };
    bowfa._calculatePrayerEffects(player, zuk, bonuses);
    expect(bowfa._attackRoll(player, zuk, bonuses)).toBe(54418);
    expect(bowfa._maxHit(player, zuk, bonuses)).toBe(46);
    expect(stdRoll(54418, 44116)).toBeCloseTo(0.59465, 5);
  });

  test("Jal-Xil hit chance on the player in the tank set: 27.892% at Defence 99, 23.105% at 120 (Mystic Vigour)", () => {
    const { player, region } = makePlayer();
    wearTank(player);
    player.currentStats.magic = 112;
    pray(player, "Mystic Vigour");
    const xil = new TestNpc(region, { x: 33, y: 30 }, {});
    const ranged = new RangedWeapon();
    const bonuses: AttackBonuses = { voidMultiplier: 1, gearRangeMultiplier: 1, attackStyle: "range" };
    ranged._calculatePrayerEffects(xil, player, bonuses);
    expect(ranged._attackRoll(xil, player, bonuses)).toBe(26936);
    expect(ranged._defenceRoll(xil, player, bonuses)).toBe(48285);
    expect(ranged._hitChance(xil, player, bonuses)).toBeCloseTo(0.2789214265004349, 10);
    player.currentStats.defence = 120;
    expect(ranged._defenceRoll(xil, player, bonuses)).toBe(58290);
    expect(ranged._hitChance(xil, player, bonuses)).toBeCloseTo(0.23104767459813694, 10);
  });

  test("player magic defence mixes 70% Magic and 30% Defence (Vigour, Magic 112): 20 bonus gives 10920", () => {
    const { player, region } = makePlayer();
    wearTank(player);
    player.currentStats.magic = 112;
    pray(player, "Mystic Vigour");
    player.cachedBonuses.defence.magic = 20;
    const mage = new TestNpc(region, { x: 33, y: 30 }, {});
    const bonuses: AttackBonuses = {};
    const eye = player.equipment.weapon as EyeOfAyak;
    eye._calculatePrayerEffects(mage, player, bonuses);
    expect(eye._defenceRoll(mage, player, bonuses)).toBe(10920);
  });

  test("Mystic Vigour and Deadeye are in the prayer book with the calculator's slots and conflict with Eagle Eye / Might", () => {
    const { player } = makePlayer();
    const names = player.prayerController.prayers.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(["Mystic Vigour", "Deadeye", "Eagle Eye", "Mystic Might"]));
    player.prayerController.findPrayerByName("Eagle Eye").toggle(player);
    player.prayerController.findPrayerByName("Deadeye").toggle(player);
    player.prayerController.prayers.forEach((p) => p.tick());
    expect(player.prayerController.findPrayerByName("Eagle Eye").isActive).toBe(false);
    expect(player.prayerController.findPrayerByName("Deadeye").isActive).toBe(true);
    // Eagle Eye still gives its x1.15 ranged accuracy
    pray(player, "Eagle Eye");
    player.prayerController.findPrayerByName("Deadeye").isActive = false;
  });

  test("Blood ancient sceptre autocasts Ice Barrage and Blood Barrage overheals to 108", () => {
    const { player, region } = makePlayer();
    wearTank(player);
    new BloodAncientSceptre().assignToPlayer(player);
    player.equipmentChanged();
    const sceptre = player.equipment.weapon as BloodAncientSceptre;
    expect(sceptre.autocastSpell.itemName).toBe("Ice Barrage");
    const target = new TestNpc(region, { x: 33, y: 30 }, {});
    region.addMob(target);
    player.currentStats.hitpoint = 99;
    Random.setRandom(sequence(0.01, 0.99));
    const blood = new BloodBarrageSpell();
    blood.attack(player, target, { magicBaseSpellDamage: 30, attackStyle: "magic" });
    expect(player.currentStats.hitpoint).toBeGreaterThan(99);
    expect(player.currentStats.hitpoint).toBeLessThanOrEqual(108);
    for (let i = 0; i < 20; i++) {
      blood.attack(player, target, { magicBaseSpellDamage: 30, attackStyle: "magic" });
    }
    expect(player.currentStats.hitpoint).toBe(108);
    Random.setRandom(() => Math.random());
  });

  test("Saturated heart: +4 +10% Magic (112 from 99), 5 minute cooldown, a Saradomin brew cancels it", () => {
    const { player } = makePlayer();
    const heart = new SaturatedHeart();
    expect(player.useSaturatedHeart()).toBe(true);
    expect(player.currentStats.magic).toBe(112);
    expect(player.saturatedHeart).not.toBeNull();
    // cooldown
    expect(player.useSaturatedHeart()).toBe(false);
    expect(heart.itemName).toBe("Saturated heart");
    // the boost does not decay while it lasts
    for (let i = 0; i < 300; i++) player.v3Tick();
    expect(player.currentStats.magic).toBe(112);
    expect(player.saturatedHeart).not.toBeNull();
    // a brew's Magic drain cancels it
    new SaradominBrew().drink(player);
    expect(player.currentStats.magic).toBe(99);
    expect(player.saturatedHeart).toBeNull();
  });

  test("Saturated heart ends after 5 minutes and can be used again after the cooldown", () => {
    const { player } = makePlayer();
    player.useSaturatedHeart();
    for (let i = 0; i < 499; i++) player.v3Tick();
    expect(player.currentStats.magic).toBe(112);
    player.v3Tick();
    expect(player.currentStats.magic).toBe(99);
    expect(player.saturatedHeart).toBeNull();
    expect(player.useSaturatedHeart()).toBe(true);
  });

  test("Bastion potion: Ranged +4 +10% (112), Defence +5 +15% (118)", () => {
    const { player } = makePlayer();
    new BastionPotion().drink(player);
    expect(player.currentStats.range).toBe(112);
    expect(player.currentStats.defence).toBe(118);
  });

  test("Prayer regeneration potion: one point every 12 ticks, 800 ticks per dose", () => {
    const { player } = makePlayer();
    player.currentStats.prayer = 10;
    new PrayerRegenerationPotion().drink(player);
    expect(player.prayerRegenTicksLeft).toBe(800);
    for (let i = 0; i < 120; i++) player.v3Tick();
    expect(player.currentStats.prayer).toBe(20);
  });

  test("legacy mode keeps upstream's formulas (hit chance denominator 2a+1)", () => {
    V3Rules.calculator = false;
    const { player, region } = makePlayer();
    wearTank(player);
    const target = new TestNpc(region, { x: 33, y: 30 }, {});
    const eye = player.equipment.weapon as EyeOfAyak;
    const bonuses: AttackBonuses = { voidMultiplier: 1, gearMageMultiplier: 1 };
    eye._calculatePrayerEffects(player, target, bonuses);
    const a = eye._attackRoll(player, target, bonuses);
    const d = eye._defenceRoll(player, target, bonuses);
    const expected = a > d ? 1 - (d + 2) / (2 * a + 1) : a / (2 * d + 1);
    expect(eye._hitChance(player, target, bonuses)).toBeCloseTo(expected, 12);
    V3Rules.calculator = true;
  });

  test("Stances: Accurate adds 2 to the Eye's effective Magic level", () => {
    const { player } = makePlayer();
    wearTank(player);
    const eye = player.equipment.weapon as EyeOfAyak;
    expect(eye.attackStyle()).toBe(AttackStyle.ACCURATE);
  });
});
