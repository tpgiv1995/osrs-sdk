import { Settings, SETTINGS_STORAGE_KEY } from "../../src/sdk/Settings";

describe("V3 keybind defaults", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Settings.readFromStorage();
  });

  test("F1..F5 map to combat, inventory, prayer, magic, equipment", () => {
    expect(Settings.combat_key).toBe("F1");
    expect(Settings.inventory_key).toBe("F2");
    expect(Settings.prayer_key).toBe("F3");
    expect(Settings.spellbook_key).toBe("F4");
    expect(Settings.equipment_key).toBe("F5");
  });

  test("the site sidebar starts hidden and the modern layout is on", () => {
    expect(Settings.menuVisible).toBe(false);
    expect(Settings.modernLayout).toBe(true);
  });

  test("camera sensitivity is turned down from upstream", () => {
    expect(Settings.cameraSensitivity).toBe(0.65);
  });

  test("defaults survive a persist and reload cycle", () => {
    Settings.persistToStorage();
    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY));
    expect(stored.values.combat_key).toBe("F1");
    Settings.readFromStorage();
    expect(Settings.equipment_key).toBe("F5");
  });
});
