import { NoxiousHalberd } from "../../src/content/weapons/NoxiousHalberd";
import { AttackStyle, AttackStylesController } from "../../src/sdk/AttackStylesController";

describe("NoxiousHalberd attack styles", () => {
  it("maps Jab/Swipe/Fend to the correct stab/slash types", () => {
    const halberd = new NoxiousHalberd();

    AttackStylesController.controller.setWeaponAttackStyle(halberd, AttackStyle.STAB); // Jab
    expect(halberd.meleeAttackType()).toBe("stab");

    AttackStylesController.controller.setWeaponAttackStyle(halberd, AttackStyle.AGGRESSIVESLASH); // Swipe
    expect(halberd.meleeAttackType()).toBe("slash");

    AttackStylesController.controller.setWeaponAttackStyle(halberd, AttackStyle.DEFENSIVE); // Fend
    expect(halberd.meleeAttackType()).toBe("stab");
  });

  it("offers three selectable styles", () => {
    const halberd = new NoxiousHalberd();
    expect(halberd.attackStyles()).toEqual([AttackStyle.STAB, AttackStyle.AGGRESSIVESLASH, AttackStyle.DEFENSIVE]);
  });
});
