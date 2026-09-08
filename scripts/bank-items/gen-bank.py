"""Generate SDK item classes for every equippable item, food and potion in the bank export."""
import json, os, re, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

SCR = r"C:\Users\thoma\AppData\Local\Temp\claude\C--Users-thoma--runelite\15e3a8e8-23ff-4574-956b-b4f93ae9b52b\scratchpad"
SDK = r"C:\dev\colosim\osrs-sdk"
defs = json.load(open(f"{SCR}\\bank-defs.json", encoding="utf-8"))
wiki = json.load(open(f"{SCR}\\bank-wiki.json", encoding="utf-8"))
bank = json.load(open(f"{SCR}\\bank.json"))
food_heals = {int(k): v.get("heal") for k, v in json.load(open(SCR + "/food-heals.json", encoding="utf-8")).items()}
food_heals.update({24592: 22, 10476: 3, 7208: 11, 7210: 11, 7218: 11, 7220: 11, 7200: 8, 2291: 7, 2303: 11, 19659: 7})
qty = {str(i): q for i, q in bank}

# ids/names the SDK already has
cache_src = open(f"{SDK}\\src\\assets\\CacheAssets.ts", encoding="utf-8").read()
_items_block = cache_src.split("export const CACHE_ASSETS", 1)[1].split("  items: {", 1)[1].split("\n  },", 1)[0]
_items_block = re.sub(r"    // BEGIN GENERATED BANK ITEMS.*?    // END GENERATED BANK ITEMS", "", _items_block, flags=re.S)
existing_ids = set(int(m) for m in re.findall(r"\{ id: (\d+) \}", _items_block))
print("existing sdk item ids:", len(existing_ids))
itemname_src = open(f"{SDK}\\src\\sdk\\ItemName.ts", encoding="utf-8").read()
existing_names = set(re.findall(r'= "([^"]+)"', itemname_src))

def num(v, default=0):
    if v is None: return default
    m = re.search(r"-?\d+(\.\d+)?", str(v).replace("+", ""))
    return (float(m.group(0)) if "." in m.group(0) else int(m.group(0))) if m else default

def pick_version(entry):
    """Merge the unversioned box with the first versioned one (most wiki pages use version 1 for the base item)."""
    box = entry.get("box") or {}
    merged = dict(box.get("", {}))
    # prefer the version whose id matches this item, else version 1
    return merged, box

def bonuses_for(id_, entry):
    base, box = pick_version(entry)
    chosen = dict(base)
    versions = [k for k in box if k]
    match = None
    for v in versions:
        ids = str(box[v].get("id", ""))
        if re.search(rf"\b{id_}\b", ids):
            match = v; break
    if match is None and versions:
        match = sorted(versions, key=lambda k: int(k))[0]
    if match:
        chosen.update(box[match])
    return chosen

SLOT_BASE = {"head": "Helmet", "body": "Chest", "legs": "Legs", "feet": "Feet", "hands": "Gloves", "cape": "Cape", "neck": "Necklace", "ring": "Ring", "ammo": "Ammo", "shield": "Offhand"}

def style_for(combat):
    c = (combat or "").strip().lower()
    if c in ("bow", "shortbow", "longbow"): return ("ranged", "BOW", ["ACCURATE", "RAPID", "LONGRANGE"], "RAPID")
    if c in ("crossbow",): return ("ranged", "CROSSBOW", ["ACCURATE", "RAPID", "LONGRANGE"], "RAPID")
    if c in ("thrown", "chinchompa", "chinchompas"): return ("ranged", "THROWN", ["ACCURATE", "RAPID", "LONGRANGE"], "RAPID")
    if c in ("staff", "bladed staff", "powered staff", "polestaff", "bludgeon"):
        cat = {"staff": "STAFF", "bladed staff": "BLADEDSTAFF", "powered staff": "POWEREDSTAFF", "polestaff": "POLESTAFF", "bludgeon": "BLUDGEON"}[c]
        return ("melee", cat, ["ACCURATE", "AGGRESSIVECRUSH", "DEFENSIVE"], "AGGRESSIVECRUSH")
    if c in ("blunt", "pickaxe"): return ("melee", "BLUNT" if c == "blunt" else "PICKAXE", ["ACCURATE", "AGGRESSIVECRUSH", "DEFENSIVE"], "AGGRESSIVECRUSH")
    if c in ("stab sword", "spear", "spiked"): return ("melee", {"stab sword": "STABSWORD", "spear": "SPEAR", "spiked": "SPIKEDWEAPON"}[c], ["ACCURATE", "STAB", "CONTROLLED", "DEFENSIVE"], "STAB")
    if c in ("polearm",): return ("melee", "POLEARM", ["STAB", "AGGRESSIVESLASH", "DEFENSIVE"], "AGGRESSIVESLASH")
    if c in ("whip",): return ("melee", "WHIP", ["ACCURATE", "CONTROLLED", "DEFENSIVE"], "CONTROLLED")
    if c in ("claw", "claws"): return ("melee", "CLAW", ["ACCURATE", "AGGRESSIVESLASH", "STAB", "DEFENSIVE"], "AGGRESSIVESLASH")
    if c in ("scythe",): return ("melee", "SCYTHE", ["REAP", "AGGRESSIVESLASH", "DEFENSIVE"], "AGGRESSIVESLASH")
    if c in ("2h sword", "2h", "two-handed sword"): return ("melee", "TWOHANDSWORD", ["ACCURATE", "AGGRESSIVESLASH", "AGGRESSIVECRUSH", "DEFENSIVE"], "AGGRESSIVESLASH")
    if c in ("axe",): return ("melee", "AXE", ["ACCURATE", "AGGRESSIVESLASH", "AGGRESSIVECRUSH", "DEFENSIVE"], "AGGRESSIVESLASH")
    if c in ("slash sword", "sword", "banner", "bulwark", "unarmed", "salamander", "gun", "partisan"):
        return ("melee", "SLASHSWORD", ["ACCURATE", "AGGRESSIVESLASH", "DEFENSIVE"], "AGGRESSIVESLASH")
    return ("melee", "SLASHSWORD", ["ACCURATE", "AGGRESSIVESLASH", "DEFENSIVE"], "AGGRESSIVESLASH")

def ident(name, id_):
    s = re.sub(r"[^A-Za-z0-9]+", " ", name).title().replace(" ", "")
    if not s or s[0].isdigit(): s = "Item" + s
    return f"{s}_{id_}"

def enum_key(name, id_):
    return "BANK_" + re.sub(r"[^A-Z0-9]+", "_", name.upper()).strip("_") + f"_{id_}"

POTION_EFFECTS = {
    # name prefix -> TS body of drink(player) after super.drink
    "super combat": "boost(player, ['attack','strength','defence'], (l) => Math.floor(l * 0.15) + 5);",
    "divine super combat": "boost(player, ['attack','strength','defence'], (l) => Math.floor(l * 0.15) + 5);",
    "super attack": "boost(player, ['attack'], (l) => Math.floor(l * 0.15) + 5);",
    "super strength": "boost(player, ['strength'], (l) => Math.floor(l * 0.15) + 5);",
    "super defence": "boost(player, ['defence'], (l) => Math.floor(l * 0.15) + 5);",
    "ranging": "boost(player, ['range'], (l) => Math.floor(l * 0.10) + 4);",
    "divine ranging": "boost(player, ['range'], (l) => Math.floor(l * 0.10) + 4);",
    "bastion": "boost(player, ['range'], (l) => Math.floor(l * 0.10) + 4); boost(player, ['defence'], (l) => Math.floor(l * 0.15) + 5);",
    "divine bastion": "boost(player, ['range'], (l) => Math.floor(l * 0.10) + 4); boost(player, ['defence'], (l) => Math.floor(l * 0.15) + 5);",
    "magic": "boost(player, ['magic'], () => 4);",
    "divine magic": "boost(player, ['magic'], () => 4);",
    "battlemage": "boost(player, ['magic'], () => 4); boost(player, ['defence'], (l) => Math.floor(l * 0.15) + 5);",
    "divine battlemage": "boost(player, ['magic'], () => 4); boost(player, ['defence'], (l) => Math.floor(l * 0.15) + 5);",
    "prayer": "restorePrayer(player, (l) => Math.floor(l * 0.25) + 7);",
    "super restore": "restorePrayer(player, (l) => Math.floor(l * 0.25) + 8); restoreStats(player, (l) => Math.floor(l * 0.25) + 8);",
    "sanfew serum": "restorePrayer(player, (l) => Math.floor(l * 0.25) + 8); restoreStats(player, (l) => Math.floor(l * 0.25) + 8);",
    "saradomin brew": "brew(player);",
    "zamorak brew": "boost(player, ['attack'], (l) => Math.floor(l * 0.20) + 2); boost(player, ['strength'], (l) => Math.floor(l * 0.12) + 2); player.currentStats.hitpoint = Math.max(1, player.currentStats.hitpoint - Math.floor(player.stats.hitpoint * 0.10) - 2);",
    "ancient brew": "boost(player, ['magic'], (l) => Math.floor(l * 0.05) + 2); restorePrayer(player, (l) => Math.floor(l * 0.10) + 2);",
    "forgotten brew": "boost(player, ['magic'], (l) => Math.floor(l * 0.08) + 3); restorePrayer(player, (l) => Math.floor(l * 0.10) + 2);",
    "stamina": "player.currentStats.run = Math.min(10000, player.currentStats.run + 2000);",
    "super energy": "player.currentStats.run = Math.min(10000, player.currentStats.run + 2000);",
    "energy": "player.currentStats.run = Math.min(10000, player.currentStats.run + 1000);",
    "moonlight": "restorePrayer(player, (l) => Math.floor(l * 0.25) + 7); boost(player, ['attack','strength','defence'], (l) => Math.floor(l * 0.15) + 5);",
}

def potion_effect(base_name):
    n = base_name.lower()
    best = ""
    for k in POTION_EFFECTS:
        if n.startswith(k) and len(k) > len(best): best = k
    return POTION_EFFECTS.get(best, "")

classes = []      # TS class source
enum_lines = []   # ItemName additions
cache_lines = []  # CacheAssets additions
sprites = {}      # file -> url
skipped = []
used_names = set(existing_names)
seen_potions = {}

def sprite_file(id_):
    return f"bank_{id_}.png"

def add_sprite(id_, title):
    sprites[sprite_file(id_)] = "https://oldschool.runescape.wiki/images/" + urllib.parse.quote(title.replace(" ", "_")) + ".png"

def uniq_name(name, id_):
    if name in used_names:
        name = f"{name} ({id_})"
    used_names.add(name)
    return name

def bonus_block(b):
    a = [num(b.get("astab")), num(b.get("aslash")), num(b.get("acrush")), num(b.get("amagic")), num(b.get("arange"))]
    d = [num(b.get("dstab")), num(b.get("dslash")), num(b.get("dcrush")), num(b.get("dmagic")), num(b.get("drange"))]
    mdmg = num(b.get("mdmg"))
    return f"""    this.bonuses = {{
      attack: {{ stab: {a[0]}, slash: {a[1]}, crush: {a[2]}, magic: {a[3]}, range: {a[4]} }},
      defence: {{ stab: {d[0]}, slash: {d[1]}, crush: {d[2]}, magic: {d[3]}, range: {d[4]} }},
      other: {{ meleeStrength: {num(b.get('str'))}, rangedStrength: {num(b.get('rstr'))}, magicDamage: {mdmg / 100 if mdmg else 0}, prayer: {num(b.get('prayer'))} }},
      targetSpecific: {{ undead: 0, slayer: 0 }},
    }};"""

for id_s, d in defs.items():
    id_ = int(id_s)
    if id_ in existing_ids:
        continue
    w = wiki.get(id_s) or {}
    name = d["name"]
    if not name or name == "null" or d.get("notedTemplate", -1) not in (-1, None):
        continue
    box = w.get("box") or {}
    b = bonuses_for(id_, w)
    title = w.get("title") or name
    slot = (b.get("slot") or "").strip().lower()
    is_equipment = bool(slot) and w.get("isEquipment")
    heals = food_heals.get(id_)
    potion_match = re.match(r"^(.*)\((\d)\)$", name)
    POTION_WORDS = ("potion", "brew", "serum", "restore", "mix", "rest(", "antidote", "venom", "antifire", "elixir", "stamina", "energy", "prayer", "ranging", "magic", "bastion", "battlemage", "combat", "attack", "strength", "defence", "agility", "antipoison", "sanfew", "moonlight", "goading", "surge", "overload", "divine", "super ")
    if potion_match and not any(w in name.lower() for w in POTION_WORDS):
        potion_match = None

    if is_equipment:
        cls = ident(name, id_)
        ename = enum_key(name, id_)
        disp = uniq_name(name, id_)
        enum_lines.append(f'  {ename} = "{disp}",')
        cache_lines.append(f"    bank{id_}: {{ id: {id_} }},")
        add_sprite(id_, title)
        weight = num(b.get("weight"), 0)
        if slot in SLOT_BASE:
            base = SLOT_BASE[slot]
            extra = ""
            if base == "Ammo":
                is_blessing = "blessing" in name.lower()
                extra = f"\n  ammoType(): AmmoType {{ return AmmoType.{'BLESSING' if is_blessing else 'AMMO'}; }}"
            classes.append(f"""export class {cls} extends {base} {{
  get cacheItemId(): number {{ return CACHE_ASSETS.items.bank{id_}.id; }}
  inventorySprite: HTMLImageElement = ImageLoader.createImage(Sprites["{sprite_file(id_)}"]);
  get inventoryImage() {{ return Sprites["{sprite_file(id_)}"]; }}
  get itemName(): ItemName {{ return ItemName.{ename}; }}
  get weight(): number {{ return {weight}; }}{extra}
  constructor() {{
    super();
{bonus_block(b)}
  }}
}}""")
        elif slot in ("weapon", "2h"):
            kind, cat, styles, default = style_for(b.get("combatstyle"))
            speed = int(num(b.get("speed"), 4)) or 4
            rng = b.get("attackrange", "1")
            rng = 1 if str(rng).strip().lower() in ("staff", "melee", "") else int(num(rng, 1))
            two = "true" if slot == "2h" else "false"
            styles_ts = ", ".join(f"AttackStyle.{s}" for s in styles)
            if kind == "ranged":
                ammo = "[]" if cat == "THROWN" else ("ARROW_NAMES" if cat == "BOW" else "BOLT_NAMES")
                anim = "PlayerAnimationIndices.FireBow"
                classes.append(f"""export class {cls} extends RangedWeapon {{
  get cacheItemId(): number {{ return CACHE_ASSETS.items.bank{id_}.id; }}
  inventorySprite: HTMLImageElement = ImageLoader.createImage(Sprites["{sprite_file(id_)}"]);
  get inventoryImage() {{ return Sprites["{sprite_file(id_)}"]; }}
  get itemName(): ItemName {{ return ItemName.{ename}; }}
  get weight(): number {{ return {weight}; }}
  constructor() {{
    super();
{bonus_block(b)}
  }}
  compatibleAmmo(): ItemName[] {{ return {ammo}; }}
  attackStyles() {{ return [{styles_ts}]; }}
  attackStyleCategory(): AttackStyleTypes {{ return AttackStyleTypes.{cat}; }}
  defaultStyle(): AttackStyle {{ return AttackStyle.{default}; }}
  get attackSpeed() {{ return this.attackStyle() === AttackStyle.LONGRANGE ? {speed + 1} : {speed}; }}
  get attackRange() {{ return this.attackStyle() === AttackStyle.LONGRANGE ? {min(rng + 2, 10)} : {rng}; }}
  get isTwoHander(): boolean {{ return {two}; }}
  hasSpecialAttack(): boolean {{ return false; }}
  get attackAnimationId() {{ return {anim}; }}
}}""")
            else:
                autocast = "ancient" in name.lower() and ("sceptre" in name.lower() or "staff" in name.lower())
                extra_styles = styles + (["AUTOCAST"] if autocast else [])
                styles_ts = ", ".join(f"AttackStyle.{s}" for s in extra_styles)
                auto_ts = ""
                if autocast:
                    auto_ts = """
  autocastSpell: BarrageSpell = new BloodBarrageSpell();
  attack(from: Unit, to: Unit, bonuses: AttackBonuses = {}): boolean {
    if (this.attackStyle() === AttackStyle.AUTOCAST && from.isPlayer) { this.autocastSpell.cast(from, to); return true; }
    return super.attack(from, to, bonuses);
  }"""
                classes.append(f"""export class {cls} extends MeleeWeapon {{
  get cacheItemId(): number {{ return CACHE_ASSETS.items.bank{id_}.id; }}
  inventorySprite: HTMLImageElement = ImageLoader.createImage(Sprites["{sprite_file(id_)}"]);
  get inventoryImage() {{ return Sprites["{sprite_file(id_)}"]; }}
  get itemName(): ItemName {{ return ItemName.{ename}; }}
  get weight(): number {{ return {weight}; }}
  constructor() {{
    super();
{bonus_block(b)}
  }}{auto_ts}
  attackStyles() {{ return [{styles_ts}]; }}
  attackStyleCategory(): AttackStyleTypes {{ return AttackStyleTypes.{cat}; }}
  defaultStyle(): AttackStyle {{ return AttackStyle.{'AUTOCAST' if autocast else default}; }}
  get attackSpeed() {{ return {'this.attackStyle() === AttackStyle.AUTOCAST ? 5 : ' if autocast else ''}{speed}; }}
  get attackRange() {{ return {'this.attackStyle() === AttackStyle.AUTOCAST ? 10 : ' if autocast else ''}{rng}; }}
  get isTwoHander(): boolean {{ return {two}; }}
  hasSpecialAttack(): boolean {{ return false; }}
}}""")
        else:
            skipped.append((id_, name, f"slot {slot}"))
        continue

    if potion_match:
        base_name, dose = potion_match.group(1).strip(), int(potion_match.group(2))
        entry = seen_potions.setdefault(base_name, {"ids": {}, "title": title})
        entry["ids"][dose] = id_
        continue

    if heals:
        cls = ident(name, id_)
        ename = enum_key(name, id_)
        disp = uniq_name(name, id_)
        enum_lines.append(f'  {ename} = "{disp}",')
        cache_lines.append(f"    bank{id_}: {{ id: {id_} }},")
        add_sprite(id_, title)
        heal = int(heals or 0)
        classes.append(f"""export class {cls} extends Food {{
  healAmount = {heal};
  get cacheItemId(): number {{ return CACHE_ASSETS.items.bank{id_}.id; }}
  inventorySprite: HTMLImageElement = ImageLoader.createImage(Sprites["{sprite_file(id_)}"]);
  get inventoryImage() {{ return Sprites["{sprite_file(id_)}"]; }}
  get itemName(): ItemName {{ return ItemName.{ename}; }}
  get weight(): number {{ return {num(b.get('weight'), 0.3)}; }}
}}""")
        continue

    skipped.append((id_, name, "not equipment/food/potion"))

# potions: one class per base name, 4-dose id as the cache id, per-dose sprites
for base_name, entry in seen_potions.items():
    ids = entry["ids"]
    top = max(ids)
    id_ = ids[top]
    if id_ in existing_ids or any(i in existing_ids for i in ids.values()):
        continue
    cls = ident(base_name, id_)
    ename = enum_key(base_name, id_)
    disp = uniq_name(base_name, id_)
    enum_lines.append(f'  {ename} = "{disp}",')
    cache_lines.append(f"    bank{id_}: {{ id: {id_} }},")
    for dose in (1, 2, 3, 4):
        sprites[f"bank_{id_}_{dose}.png"] = "https://oldschool.runescape.wiki/images/" + urllib.parse.quote(f"{base_name}({dose})".replace(" ", "_")) + ".png"
    effect = potion_effect(base_name)
    classes.append(f"""export class {cls} extends Potion {{
  get cacheItemId(): number {{ return CACHE_ASSETS.items.bank{id_}.id; }}
  get itemName(): ItemName {{ return ItemName.{ename}; }}
  constructor(doses = {top}) {{ super(); this.doses = doses; this.updateInventorySprite(); }}
  get inventoryImage() {{ return doseSprite("bank_{id_}", this.doses); }}
  drink(player: Player) {{ super.drink(player); {effect} }}
  updateInventorySprite() {{ this.inventorySprite = ImageLoader.createImage(doseSprite("bank_{id_}", this.doses)); }}
}}""")

arrow_names = [re.search(r"ItemName\.(BANK_[A-Z0-9_]+)", c).group(1) for c in classes if "extends Ammo" in c and re.search(r"arrow", c, re.I)]
bolt_names = [re.search(r"ItemName\.(BANK_[A-Z0-9_]+)", c).group(1) for c in classes if "extends Ammo" in c and re.search(r"bolt", c, re.I)]

sprite_imports = "\n".join(f'import S_{f[:-4]} from "../../assets/images/bank/{f}";' for f in sorted(sprites))
sprite_map = ",\n".join(f'  "{f}": S_{f[:-4]}' for f in sorted(sprites))
header = f'''// GENERATED by gen-bank.py from the RuneLite Bank Memory export of 2026-09-08. Do not edit by hand.
// Stats come from the OSRS wiki infoboxes; models from the cache-render bundle by item id.
/* eslint-disable */
import {{ ImageLoader }} from "../../sdk/utils/ImageLoader";
import {{ ItemName }} from "../../sdk/ItemName";
import {{ CACHE_ASSETS }} from "../../assets/CacheAssets";
import {{ Helmet }} from "../../sdk/gear/Helmet";
import {{ Chest }} from "../../sdk/gear/Chest";
import {{ Legs }} from "../../sdk/gear/Legs";
import {{ Feet }} from "../../sdk/gear/Feet";
import {{ Gloves }} from "../../sdk/gear/Gloves";
import {{ Cape }} from "../../sdk/gear/Cape";
import {{ Necklace }} from "../../sdk/gear/Necklace";
import {{ Ring }} from "../../sdk/gear/Ring";
import {{ Ammo, AmmoType }} from "../../sdk/gear/Ammo";
import {{ Offhand }} from "../../sdk/gear/Offhand";
import {{ Food }} from "../../sdk/gear/Food";
import {{ Potion }} from "../../sdk/gear/Potion";
import {{ MeleeWeapon }} from "../../sdk/weapons/MeleeWeapon";
import {{ RangedWeapon }} from "../../sdk/weapons/RangedWeapon";
import {{ BarrageSpell }} from "../../sdk/weapons/BarrageSpell";
import {{ BloodBarrageSpell }} from "../../sdk/weapons/BloodBarrageSpell";
import {{ AttackStyle, AttackStyleTypes }} from "../../sdk/AttackStylesController";
import {{ AttackBonuses }} from "../../sdk/gear/Weapon";
import {{ PlayerAnimationIndices }} from "../../sdk/rendering/GLTFAnimationConstants";
import {{ Player }} from "../../sdk/Player";
import {{ Unit }} from "../../sdk/Unit";
{sprite_imports}

const Sprites: Record<string, string> = {{
{sprite_map}
}};

function doseSprite(base: string, doses: number): string {{
  return Sprites[`${{base}}_${{Math.max(1, Math.min(4, doses))}}.png`] ?? Sprites[`${{base}}_4.png`];
}}

type Stat = "attack" | "strength" | "defence" | "range" | "magic";
function boost(player: Player, stats: Stat[], amount: (level: number) => number) {{
  for (const stat of stats) {{
    const gain = amount(player.stats[stat]);
    player.currentStats[stat] = Math.min(player.currentStats[stat] + gain, player.stats[stat] + gain);
  }}
}}
function restorePrayer(player: Player, amount: (level: number) => number) {{
  player.currentStats.prayer = Math.min(player.stats.prayer, player.currentStats.prayer + amount(player.stats.prayer));
}}
function restoreStats(player: Player, amount: (level: number) => number) {{
  for (const stat of ["attack", "strength", "defence", "range", "magic"] as Stat[]) {{
    if (player.currentStats[stat] < player.stats[stat]) {{
      player.currentStats[stat] = Math.min(player.stats[stat], player.currentStats[stat] + amount(player.stats[stat]));
    }}
  }}
}}
function brew(player: Player) {{
  const heal = Math.floor(player.stats.hitpoint * 0.15) + 2;
  player.currentStats.hitpoint = Math.min(player.currentStats.hitpoint + heal, player.stats.hitpoint + heal);
  const def = Math.floor(player.stats.defence * 0.20) + 2;
  player.currentStats.defence = Math.min(player.currentStats.defence + def, player.stats.defence + def);
  for (const stat of ["attack", "strength", "range", "magic"] as Stat[]) {{
    player.currentStats[stat] = Math.max(0, player.currentStats[stat] - Math.floor(player.currentStats[stat] * 0.10) - 2);
  }}
}}

const ARROW_NAMES: ItemName[] = [{", ".join("ItemName." + n for n in arrow_names)}];
const BOLT_NAMES: ItemName[] = [{", ".join("ItemName." + n for n in bolt_names)}];

'''
os.makedirs(f"{SDK}\\src\\content\\generated", exist_ok=True)
open(f"{SDK}\\src\\content\\generated\\BankItems.ts", "w", encoding="utf-8", newline="\n").write(header + "\n\n".join(classes) + "\n")

# ItemName + CacheAssets additions between markers
def splice(path, start_marker, end_marker, body, insert_before):
    s = open(path, encoding="utf-8").read()
    if start_marker in s:
        s = s.split(start_marker)[0] + start_marker + "\n" + body + "\n" + end_marker + s.split(end_marker, 1)[1]
    else:
        assert insert_before in s, path
        s = s.replace(insert_before, start_marker + "\n" + body + "\n" + end_marker + "\n" + insert_before, 1)
    open(path, "w", encoding="utf-8", newline="").write(s)

splice(f"{SDK}\\src\\sdk\\ItemName.ts", "  // BEGIN GENERATED BANK ITEMS", "  // END GENERATED BANK ITEMS", "\n".join(enum_lines), "}\n")
cache_path = f"{SDK}\\src\\assets\\CacheAssets.ts"
s = open(cache_path, encoding="utf-8").read()
start, end = "    // BEGIN GENERATED BANK ITEMS", "    // END GENERATED BANK ITEMS"
if start in s:
    s = s.split(start)[0] + start + "\n" + "\n".join(cache_lines) + "\n" + end + s.split(end, 1)[1]
else:
    anchor = "  items: {\n"
    i = s.index(anchor, s.index("export const CACHE_ASSETS")) + len(anchor)
    s = s[:i] + start + "\n" + "\n".join(cache_lines) + "\n" + end + "\n" + s[i:]
open(cache_path, "w", encoding="utf-8", newline="").write(s)

json.dump({"sprites": sprites, "skipped": skipped}, open(f"{SCR}\\bank-gen-report.json", "w"), indent=1)
print("classes:", len(classes), "enum:", len(enum_lines), "sprites:", len(sprites), "skipped:", len(skipped))
kinds = {"equipment": sum("extends Helmet" in c or "extends Chest" in c or "extends Legs" in c or "extends Feet" in c or "extends Gloves" in c or "extends Cape" in c or "extends Necklace" in c or "extends Ring" in c or "extends Ammo" in c or "extends Offhand" in c for c in classes),
         "melee": sum("extends MeleeWeapon" in c for c in classes), "ranged": sum("extends RangedWeapon" in c for c in classes), "food": sum("extends Food" in c for c in classes), "potion": sum("extends Potion" in c for c in classes)}
print(kinds)
