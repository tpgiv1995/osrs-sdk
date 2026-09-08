import { LoadoutRegistry } from "../../src/content/LoadoutRegistry";
import { BlueMoonHelm } from "../../src/content/equipment/BlueMoonHelm";
import { BlueMoonChestplate } from "../../src/content/equipment/BlueMoonChestplate";
import { BlueMoonTassets } from "../../src/content/equipment/BlueMoonTassets";
import { FireCape } from "../../src/content/equipment/FireCape";
import { AmuletOfBloodFury } from "../../src/content/equipment/AmuletOfBloodFury";
import { ConflictionGauntlets } from "../../src/content/equipment/ConflictionGauntlets";
import { AvernicTreadsPrEt } from "../../src/content/equipment/AvernicTreadsPrEt";
import { NecklaceOfRupture } from "../../src/content/equipment/NecklaceOfRupture";
import { RadasBlessing4 } from "../../src/content/equipment/RadasBlessing4";
import { CrystalHelmIorwerth } from "../../src/content/equipment/CrystalHelmIorwerth";
import { BloodAncientSceptre } from "../../src/content/weapons/BloodAncientSceptre";
import { SaradominGodsword } from "../../src/content/weapons/SaradominGodsword";
import { BurningClaws } from "../../src/content/weapons/BurningClaws";
import { BowOfFaerdhinenIorwerth } from "../../src/content/weapons/BowOfFaerdhinenIorwerth";
import { AmmoType } from "../../src/sdk/gear/Ammo";

/** Every id in the reference RuneLite "Colosseum" Inventory Setup. */
const V3_IDS = [
  29041, 6570, 24780, 28260, 29037, 29039, 31106, 31095, 25975, 22947,
  12006, 7462, 25886, 27721, 12954, 33639, 27729, 27725, 12695, 2444,
  3024, 10925, 6685, 27641, 29796, 11806, 29577, 27509,
];

test("every item in the V3 Colosseum setup resolves in the loadout registry", () => {
  const missing = V3_IDS.filter((id) => !LoadoutRegistry.has(id));
  expect(missing).toEqual([]);
});

test.each([
  ["Blue moon helm", new BlueMoonHelm(), 29041, { magic: 6 }, { crush: 10, magic: 6 }, { meleeStrength: 3, magicDamage: 0.01 }],
  ["Blue moon chestplate", new BlueMoonChestplate(), 29037, { magic: 30 }, { crush: 51, magic: 28 }, { meleeStrength: 2, magicDamage: 0.01 }],
  ["Blue moon tassets", new BlueMoonTassets(), 29039, { magic: 22 }, { crush: 23, magic: 32 }, { meleeStrength: 1, magicDamage: 0.01 }],
  ["Fire cape", new FireCape(), 6570, { slash: 1 }, { slash: 11 }, { meleeStrength: 4, prayer: 2 }],
  ["Blood fury", new AmuletOfBloodFury(), 24780, { stab: 10 }, { range: 15 }, { meleeStrength: 8, prayer: 5 }],
  ["Confliction gauntlets", new ConflictionGauntlets(), 31106, { magic: 20, range: -4 }, { slash: 18 }, { magicDamage: 0.07, prayer: 2 }],
  ["Avernic treads", new AvernicTreadsPrEt(), 31095, { range: 15 }, { slash: 25 }, { meleeStrength: 6, rangedStrength: 2, magicDamage: 0.02 }],
  ["Necklace of rupture", new NecklaceOfRupture(), 33639, { range: 20 }, {}, { rangedStrength: 8, prayer: 3 }],
  ["Blood ancient sceptre", new BloodAncientSceptre(), 28260, { crush: 50, magic: 20 }, { magic: 15 }, { meleeStrength: 60, magicDamage: 0.1, prayer: -1 }],
  ["Saradomin godsword", new SaradominGodsword(), 11806, { slash: 132, crush: 80 }, {}, { meleeStrength: 132, prayer: 8 }],
  ["Burning claws", new BurningClaws(), 29577, { stab: 43, slash: 54 }, { slash: 6 }, { meleeStrength: 32 }],
])("%s has wiki bonuses", (_label, item, id, attack, defence, other) => {
  expect(item.cacheItemId).toBe(id);
  expect(item.bonuses.attack).toMatchObject(attack);
  expect(item.bonuses.defence).toMatchObject(defence);
  expect(item.bonuses.other).toMatchObject(other);
});

test("two-handers, speeds, and the blessing slot", () => {
  expect(new SaradominGodsword().isTwoHander).toBe(true);
  expect(new SaradominGodsword().attackSpeed).toBe(6);
  expect(new BurningClaws().isTwoHander).toBe(true);
  expect(new BurningClaws().attackSpeed).toBe(4);
  expect(new BloodAncientSceptre().attackSpeed).toBe(5);
  expect(new BurningClaws().specialAttackDrain()).toBe(35);
  expect(new RadasBlessing4().ammoType()).toBe(AmmoType.BLESSING);
});

test("Iorwerth recolours keep the parent's stats but use their own cache id", () => {
  const helm = new CrystalHelmIorwerth();
  expect(helm.cacheItemId).toBe(27729);
  expect(helm.bonuses.attack.range).toBeGreaterThan(0);
  const bow = new BowOfFaerdhinenIorwerth();
  expect(bow.cacheItemId).toBe(25886);
  expect(bow.bonuses.attack.range).toBe(128);
});
