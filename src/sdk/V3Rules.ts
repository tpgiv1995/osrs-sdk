import type { Unit } from "./Unit";
import type { BasePrayer } from "./BasePrayer";
import { ItemName } from "./ItemName";

/**
 * V3 Inferno Sim combat rules. They reproduce the OSRS Wiki DPS calculator (hit chance, effective levels,
 * prayer factors, the player's defence roll against monsters) so the sim can be checked number for number
 * against tools/inferno_gear.py. Set `V3Rules.calculator = false` to get upstream 0.1.4's original formulas
 * back; the golden-flow tests use that to prove the untouched mechanics still match upstream.
 */
export class V3Rules {
  static calculator = true;
}

/** Integer-safe `floor(value * numerator / denominator)`. */
export function fac(value: number, numerator: number, denominator = 100): number {
  return Math.floor((value * numerator) / denominator);
}

/** floor(value * multiplier) for multipliers that are sums of decimal fractions (exact to a thousandth, no float drift). */
export function mulFloor(value: number, multiplier: number): number {
  return Math.floor((value * Math.round(multiplier * 1000)) / 1000);
}

/** Eye of Ayak max hit (calculator eye_max): floor(Magic / 3) - 6 (at least 1), x1.3 for Soul Rend, then + the damage bonus. */
export function eyeMax(magic: number, dmgTenths: number, spec = false): number {
  let m = Math.max(1, Math.floor(magic / 3) - 6);
  if (spec) {
    m = Math.floor((m * 13) / 10);
  }
  return m + Math.floor((m * dmgTenths) / 1000);
}

/** Wiki hit chance: attack roll a against defence roll d. */
export function stdRoll(a: number, d: number): number {
  return a > d ? 1 - (d + 2) / (2 * (a + 1)) : a / (2 * (d + 1));
}

/** Chance of landing when the attack rolls accuracy twice and keeps the better roll (Confliction gauntlets). */
export function fangRoll(a: number, d: number): number {
  if (a > d) {
    return 1 - ((d + 2) * (2 * d + 3)) / (a + 1) / (a + 1) / 6;
  }
  return (a * (4 * a + 5)) / 6 / (a + 1) / (d + 1);
}

export interface PrayerFactor {
  /** Magic accuracy as a percentage of the Magic level (115 = x1.15). */
  acc?: number;
  /** Magic damage bonus in tenths of a percent (30 = +3.0%). */
  mdmgTenths?: number;
  /** Magic defence factor applied to the Magic level (percentage). */
  mdef?: number;
  /** Defence level boost in percent (5 = +5%). */
  dfn?: number;
  /** Ranged accuracy factor (percentage). */
  racc?: number;
  /** Ranged strength factor (percentage). */
  rstr?: number;
}

/** Prayer factors, keyed by prayer name. Mystic Vigour, Deadeye, Mystic Might and Eagle Eye are the calculator's PRAYERS table. */
export const PRAYER_FACTORS: Record<string, PrayerFactor> = {
  "Thick Skin": { dfn: 5 },
  "Rock Skin": { dfn: 10 },
  "Steel Skin": { dfn: 15 },
  "Mystic Will": { acc: 105, mdef: 105 },
  "Mystic Lore": { acc: 110, mdmgTenths: 10, mdef: 110 },
  "Mystic Might": { acc: 115, mdmgTenths: 20, mdef: 115 },
  Augury: { acc: 125, mdmgTenths: 40, mdef: 125, dfn: 25 },
  "Mystic Vigour": { acc: 118, mdmgTenths: 30, mdef: 118, dfn: 5 },
  "Sharp Eye": { racc: 105, rstr: 105 },
  "Hawk Eye": { racc: 110, rstr: 110 },
  "Eagle Eye": { racc: 115, rstr: 115 },
  Rigour: { racc: 120, rstr: 123, dfn: 25 },
  Deadeye: { racc: 118, rstr: 118, dfn: 5 },
  Chivalry: { dfn: 20 },
  Piety: { dfn: 25 },
};

export function prayerFactor(prayer: BasePrayer | undefined | null): PrayerFactor {
  return (prayer && PRAYER_FACTORS[prayer.name]) || {};
}

/** The player's defence roll against an NPC attack (wiki NPCVsPlayerCalc): (8 + effective level) x (bonus + 64). */
export function playerDefenceRoll(
  player: Unit,
  style: "stab" | "slash" | "crush" | "range" | "magic",
  stanceBonus = 0,
): number {
  const active: BasePrayer[] = player.prayerController ? player.prayerController.activePrayers() : [];
  const dfn = active.reduce((best, p) => Math.max(best, prayerFactor(p).dfn || 0), 0);
  let effective = fac(player.currentStats.defence, 100 + dfn);
  if (style === "magic") {
    const mdef = active.reduce((best, p) => prayerFactor(p).mdef || best, 100);
    const magicPart = fac(player.currentStats.magic, mdef);
    effective = Math.floor((magicPart * 7) / 10) + Math.floor((effective * 3) / 10);
  }
  effective += stanceBonus;
  return (8 + effective) * (player.bonuses.defence[style] + 64);
}

/** The defence a player's combat stance adds to their defence level: Longrange and Defensive +3, Controlled +1. */
export function playerStanceDefenceBonus(player: Unit): number {
  const weapon = player.equipment && player.equipment.weapon;
  if (!weapon || !weapon.attackStyleCategory()) {
    return 0;
  }
  const style = String(weapon.attackStyle());
  if (style === "LONGRANGE" || style === "DEFENSIVE") {
    return 3;
  }
  if (style === "CONTROLLED" || style === "STAB") {
    return 1;
  }
  return 0;
}

/**
 * Confliction gauntlets: after a missed one-handed magic attack on a target, the next magic attack on that
 * target rolls accuracy twice and keeps the better roll. The state is per target.
 */
const conflictionMissed = new WeakMap<Unit, boolean>();

export function conflictionActive(from: Unit): boolean {
  const weapon = from.equipment && from.equipment.weapon;
  return (
    from.isPlayer === true &&
    !!from.equipment.gloves &&
    from.equipment.gloves.itemName === ItemName.CONFLICTION_GAUNTLETS &&
    !!weapon &&
    !weapon.isTwoHander
  );
}

export function conflictionIsArmed(target: Unit): boolean {
  return conflictionMissed.get(target) === true;
}

export function setConflictionArmed(target: Unit, armed: boolean) {
  conflictionMissed.set(target, armed);
}
