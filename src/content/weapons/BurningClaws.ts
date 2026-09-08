import InventoryImage from "../../assets/images/equipment/Burning_claws.png";
import { AttackStyle, AttackStyleTypes } from "../../sdk/AttackStylesController";
import { AttackBonuses } from "../../sdk/gear/Weapon";
import { ItemName } from "../../sdk/ItemName";
import { Random } from "../../sdk/Random";
import { PlayerAnimationIndices } from "../../sdk/rendering/GLTFAnimationConstants";
import { Unit } from "../../sdk/Unit";
import { MeleeWeapon } from "../../sdk/weapons/MeleeWeapon";
import { Projectile, ProjectileOptions } from "../../sdk/weapons/Projectile";
import { DelayedAction } from "../../sdk/DelayedAction";
import { Sound, SoundCache } from "../../sdk/utils/SoundCache";
import { cacheSound } from "../../sdk/audio/CacheSoundEffects";
import { CACHE_ASSETS } from "../../assets/CacheAssets";

const NORMAL_ATTACK_SOUND_ID = CACHE_ASSETS.sounds.dragonClawsAttack.id;
const SPECIAL_ATTACK_SOUND_ID = CACHE_ASSETS.sounds.dragonClawsSpecialFirst.id;
// TODO: Verify whether these client-side sound cues should instead align to 600 ms game-tick boundaries.
const SPECIAL_ATTACK_FOLLOW_UP_SOUNDS = [
  { id: CACHE_ASSETS.sounds.dragonClawsSpecialSecond.id, delayMs: 300 },
  { id: CACHE_ASSETS.sounds.dragonClawsSpecialThird.id, delayMs: 600 },
  { id: CACHE_ASSETS.sounds.dragonClawsSpecialThird.id, delayMs: 900 },
];
const SOUND_VOLUME = 0.1;

export class BurningClaws extends MeleeWeapon {
  override get equipSoundId(): number {
    return CACHE_ASSETS.sounds.equipFun.id;
  }

  get cacheItemId(): number {
    return CACHE_ASSETS.items.burningClaws.id;
  }

  constructor() {
    super();
    [NORMAL_ATTACK_SOUND_ID, SPECIAL_ATTACK_SOUND_ID, ...SPECIAL_ATTACK_FOLLOW_UP_SOUNDS.map(({ id }) => id)].forEach(
      (id) => SoundCache.preload(cacheSound(id)),
    );
    this.bonuses = {
      attack: { stab: 43, slash: 54, crush: 0, magic: 0, range: 0 },
      defence: { stab: 3, slash: 6, crush: 1, magic: 0, range: 0 },
      other: { meleeStrength: 32, rangedStrength: 0, magicDamage: 0, prayer: 0 },
      targetSpecific: { undead: 0, slayer: 0 },
    };
  }

  get weight(): number {
    return 0.907;
  }

  get isTwoHander(): boolean {
    return true;
  }

  attackStyles() {
    return [AttackStyle.ACCURATE, AttackStyle.AGGRESSIVESLASH, AttackStyle.STAB, AttackStyle.DEFENSIVE];
  }

  attackStyleCategory(): AttackStyleTypes {
    return AttackStyleTypes.SLASHSWORD;
  }

  defaultStyle(): AttackStyle {
    return AttackStyle.AGGRESSIVESLASH;
  }

  get itemName(): ItemName {
    return ItemName.BURNING_CLAWS;
  }

  get attackRange(): number {
    return 1;
  }

  get attackSpeed(): number {
    return 4;
  }

  get inventoryImage() {
    return InventoryImage;
  }

  override get attackAnimationId(): number {
    return PlayerAnimationIndices.SwordSlash;
  }

  override get specialAttackAnimationId(): number {
    return CACHE_ASSETS.playerAnimations.dragonClawsAttack.id;
  }

  override get idleAnimationId(): number {
    return CACHE_ASSETS.playerAnimations.idle.id;
  }

  hasSpecialAttack(): boolean {
    return true;
  }

  specialAttackDrain(): number {
    return 35;
  }

  /**
   * Burning barrage: three accuracy rolls decide the damage band, rolled as a total
   * and split into three hits. Each hit can start a burn: 1 damage every 4 ticks for
   * 40 ticks, up to five burns at once. Band and burn numbers follow the wiki.
   */
  specialAttack(from: Unit, to: Unit, bonuses: AttackBonuses = {}, options: ProjectileOptions = {}): boolean {
    bonuses.attackStyle = "slash";
    bonuses.isSpecialAttack = true;
    bonuses.styleBonus = bonuses.styleBonus || 0;
    bonuses.voidMultiplier = bonuses.voidMultiplier || 1;
    bonuses.gearMeleeMultiplier = bonuses.gearMeleeMultiplier || 1;
    bonuses.overallMultiplier = bonuses.overallMultiplier || 1;
    this._calculatePrayerEffects(from, to, bonuses);

    const protectedFromMelee = this.isBlockable(from, to, bonuses);
    let successfulRoll = -1;
    if (!protectedFromMelee) {
      const hitChance = this._hitChance(from, to, bonuses);
      for (let roll = 0; roll < 3; roll++) {
        if (from.forceMaxDamageRollsOnNextAttack || Random.get() <= hitChance) {
          successfulRoll = roll;
          break;
        }
      }
    }

    const maxHit = this._maxHit(from, to, bonuses);
    const rollBetween = (minimum: number, maximum: number) => {
      const min = Math.max(0, Math.floor(minimum));
      const max = Math.max(min, Math.floor(maximum));
      return from.forceMaxDamageRollsOnNextAttack ? max : min + Math.floor(Random.get() * (max - min + 1));
    };

    let hits: number[];
    let burnChance = 0;
    if (successfulRoll === 0) {
      hits = this.splitTotal(rollBetween(maxHit * 0.75, maxHit * 1.75));
      burnChance = 0.15;
    } else if (successfulRoll === 1) {
      hits = this.splitTotal(rollBetween(maxHit * 0.5, maxHit * 1.5));
      burnChance = 0.3;
    } else if (successfulRoll === 2) {
      hits = this.splitTotal(rollBetween(maxHit * 0.25, maxHit * 1.25));
      burnChance = 0.45;
    } else {
      const roll = Random.get();
      const total = roll < 0.2 ? 0 : roll < 0.6 ? 1 : 2;
      hits = [total, 0, 0];
    }

    hits.forEach((damage, hit) => {
      this.damageRoll = damage;
      this.damage = damage;
      this.grantXp(from, to);
      this.registerProjectile(from, to, bonuses, {
        ...options,
        sound: hit === 0 ? this.specialAttackSound : null,
        setDelay: hit < 2 ? 1 : 2,
      });
      if (damage > 0 && burnChance > 0 && Random.get() < burnChance) this.startBurn(from, to);
    });
    SPECIAL_ATTACK_FOLLOW_UP_SOUNDS.forEach(({ id, delayMs }) => {
      setTimeout(() => SoundCache.play(new Sound(cacheSound(id), SOUND_VOLUME)), delayMs);
    });
    this.lastHitHit = successfulRoll >= 0;
    if (this.lastHitHit) from.consumeMaxDamageRollsOnNextAttack();
    return true;
  }

  /** Three hits: half, quarter, and the remainder. */
  private splitTotal(total: number): number[] {
    const first = Math.floor(total / 2);
    const second = Math.floor(total / 4);
    return [first, second, total - first - second];
  }

  private activeBurns = 0;

  private startBurn(from: Unit, to: Unit) {
    if (this.activeBurns >= 5) return;
    this.activeBurns++;
    let ticks = 0;
    const tick = () => {
      ticks++;
      if (to.isDying() || ticks > 10) {
        this.activeBurns = Math.max(0, this.activeBurns - 1);
        return;
      }
      to.addProjectile(new Projectile(null, 1, from, to, "typeless", { hidden: true, setDelay: 0, cancelOnDeath: true }));
      DelayedAction.registerDelayedAction(new DelayedAction(tick, 4));
    };
    DelayedAction.registerDelayedAction(new DelayedAction(tick, 4));
  }

  get specialAttackSound() {
    return new Sound(cacheSound(SPECIAL_ATTACK_SOUND_ID), SOUND_VOLUME);
  }

  get attackSound() {
    return new Sound(cacheSound(NORMAL_ATTACK_SOUND_ID), SOUND_VOLUME);
  }
}
