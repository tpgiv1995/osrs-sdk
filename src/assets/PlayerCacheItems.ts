/**
 * OSRS cache item ids for everything the V3 Inferno player can wear or wield, plus the semantic pose map.
 * Shared by the browser runtime and the Node-only extractor (scripts/player-render), so keep it free of imports.
 */
export const PLAYER_CACHE_ITEMS = {
  // Tank set (worn at wave start)
  bloodAncientSceptre: { id: 28260 },
  crystalShield: { id: 23991 },
  guthansHelm: { id: 4724 },
  occultNecklace: { id: 12002 },
  imbuedSaradominCape: { id: 21791 },
  radasBlessing4: { id: 22947 },
  bandosChestplate: { id: 11832 },
  oathplateLegs: { id: 30756 },
  conflictionGauntlets: { id: 31106 },
  avernicTreadsPrEt: { id: 31095 },
  magusRing: { id: 28313 },
  // BowFa switch and the other inventory weapons
  bowOfFaerdhinenC: { id: 25886 },
  crystalHelm: { id: 27729 },
  crystalBody: { id: 27721 },
  crystalLegs: { id: 27725 },
  dizanasQuiver: { id: 28951 },
  necklaceOfRupture: { id: 33639 },
  toxicBlowpipe: { id: 12926 },
  eyeOfAyak: { id: 31113 },
} as const;

/** Default male appearance: one identity kit per body part (OSRS kit ids). */
export const PLAYER_DEFAULT_KIT = {
  // body part name: kit id, appearance slot it occupies (a worn item in that slot hides the kit part)
  head: { kit: 0, slot: 8 },
  jaw: { kit: 10, slot: 11 },
  torso: { kit: 18, slot: 4 },
  arms: { kit: 26, slot: 6 },
  hands: { kit: 33, slot: 9 },
  legs: { kit: 36, slot: 7 },
  feet: { kit: 42, slot: 10 },
} as const;

export const PLAYER_ANIMATION_SEQUENCES: Record<number, number> = {
  0: 808, // idle
  1: 819, // walk
  2: 824, // run
  3: 820, // rotate 180
  4: 822, // strafe left
  5: 821, // strafe right
  6: 426, // fire bow
  7: 5061, // fire blowpipe
  8: 7618, // throw chinchompa
  9: 8057, // scythe idle
  10: 8056, // scythe swing
  11: 390, // sword slash
  12: 1167, // cast (staff)
  13: 1979, // cast (ancient barrage)
  14: 12397, // Eye of Ayak normal attack (90 cycles = 3 ticks)
  15: 12394, // Eye of Ayak Soul Rend special (150 cycles = 5 ticks)
};

/**
 * Cache spotanim (graphic) ids for the V3 kit's projectiles and impacts. Sources: RuneLite gameval SpotanimID and the
 * cache's own spotanim definitions (model, sequence and length checked against the weapon's tick speed).
 */
export const PLAYER_CACHE_SPOTANIMS = {
  bofaArrowTravel: 1926, // SP_ATTACK_ARROW_TRAVEL_FAERDHINEN_IORWERTH (item 25886 is the Iorwerth (c) bow)
  bofaArrowLaunch: 1927, // SP_ATTACK_ARROW_LAUNCH_FAERDHINEN_IORWERTH
  iceBarrageImpact: 369, // ICE_BARRAGE_IMPACT
  bloodBarrageImpact: 377, // SPELL_BLOOD_BARRAGE_IMPACT
  splash: 85, // spell splash (a barrage that does no damage)
  ayakSpecialPlayer: 3364, // VFX_AYAK_PLAYER_SPECIAL_SPOTANIM
  ayakSpecialImpact: 3365, // VFX_AYAK_IMPACT_SPECIAL_SPOTANIM
  ayakNormalPlayer: 3366, // VFX_AYAK_PLAYER_NORMAL_SPOTANIM
  ayakNormalProjectile: 3367, // VFX_AYAK_NORMAL_PROJECTILE
  ayakNormalImpact: 3368, // VFX_AYAK_NORMAL_IMPACT
} as const;
