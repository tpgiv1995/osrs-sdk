"""Fetch wiki infobox data for bank items: names -> {slot, bonuses, speed, range, combatstyle, heals, weight}."""
import json, re, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

SCR = r"C:\Users\thoma\AppData\Local\Temp\claude\C--Users-thoma--runelite\15e3a8e8-23ff-4574-956b-b4f93ae9b52b\scratchpad"
defs = json.load(open(f"{SCR}\\bank-defs.json", encoding="utf-8"))
UA = {"User-Agent": "Mozilla/5.0 (v3 colosseum sim item generator; contact: sarahgracelunsford@yahoo.com)"}

def fetch(url):
    time.sleep(0.25)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            time.sleep(1 + attempt)
    return None

FIELDS = ["edible", "heal", "astab", "aslash", "acrush", "amagic", "arange", "dstab", "dslash", "dcrush", "dmagic", "drange", "str", "rstr", "mdmg", "prayer", "slot", "speed", "attackrange", "combatstyle", "weight", "heals", "id", "version", "equipable"]

def parse_infobox(text):
    """Return list of version dicts (version 1..n plus unversioned)."""
    out = {}
    for m in re.finditer(r"^\|\s*([a-z]+)(\d*)\s*=\s*(.*?)\s*$", text, re.M):
        key, ver, val = m.group(1), m.group(2), m.group(3)
        if key not in FIELDS: continue
        out.setdefault(ver or "", {})[key] = val
    return out

def lookup(id_):
    name = defs[str(id_)]["name"]
    url = f"https://oldschool.runescape.wiki/w/Special:Lookup?type=item&id={id_}"
    # follow redirect to get the page title, then raw
    try:
        req = urllib.request.Request(url, headers=UA, method="HEAD")
        with urllib.request.urlopen(req, timeout=30) as r:
            final = r.geturl()
    except Exception:
        final = None
    title = urllib.parse.unquote(final.split("/w/")[-1]) if final and "/w/" in final else name.replace(" ", "_")
    raw = fetch(f"https://oldschool.runescape.wiki/w/{urllib.parse.quote(title)}?action=raw")
    if raw is None:
        return id_, {"name": name, "title": title, "error": "fetch"}
    box = parse_infobox(raw)
    edible = any(str(v.get("edible", "")).strip().lower().startswith("yes") for v in box.values())
    heal = None
    m = re.search(r"(?:heal(?:s|ing)?|restores?)\s+(?:up to |between |the player )?(\d+)(?:\s*(?:and|to|-|–)\s*(\d+))?\s*(?:\[\[)?(?:hitpoints|hp)", raw, re.I)
    if m:
        heal = max(int(x) for x in m.groups() if x)
    return id_, {"heal": heal, "edible": edible, "name": name, "title": title, "box": box, "isEquipment": "|slot" in raw or "{{Infobox Bonuses" in raw, "isFood": edible and heal is not None, "isPotion": "(4)" in name or "(3)" in name or "(2)" in name or "(1)" in name}

import os
prev = json.load(open(SCR + "/bank-wiki.json", encoding="utf-8")) if os.path.exists(SCR + "/bank-wiki.json") else {}
results = {int(k): v for k, v in prev.items() if "error" not in v}
ids = [int(k) for k in defs if int(k) not in results]
print("retrying", len(ids), file=sys.stderr)
with ThreadPoolExecutor(max_workers=4) as ex:
    for i, (id_, data) in enumerate(ex.map(lookup, ids)):
        results[id_] = data
        if i % 100 == 0: print("progress", i, "/", len(ids), file=sys.stderr)
json.dump(results, open(f"{SCR}\\bank-wiki.json", "w", encoding="utf-8"), indent=1)
eq = sum(1 for v in results.values() if v.get("isEquipment"))
print("done", len(results), "equipment:", eq, "errors:", sum(1 for v in results.values() if "error" in v))
