import json, re
P = r"C:\Users\thoma\.runelite\profiles2\default-976618617700.properties"
NAMES = {}
data = None
for line in open(P, encoding="utf-8"):
    if line.startswith("bankMemory.nameMap="):
        NAMES = json.loads(re.sub(r"\\(.)", lambda m: m.group(1), line.split("=", 1)[1].strip()))
    if line.startswith("bankMemory.currentList="):
        data = json.loads(re.sub(r"\\(.)", lambda m: m.group(1), line.split("=", 1)[1].strip()))
print("accounts:", NAMES)
for d in data:
    acct = NAMES.get(d.get("accountIdentifier"), d.get("accountIdentifier"))
    print(acct, d.get("dateTimeString"), "items:", len(d.get("itemData", [])), "keys:", list(d.keys()))
chloe = [d for d in data if NAMES.get(d.get("accountIdentifier")) == "Chloes Dad"]
best = max(chloe or data, key=lambda d: d.get("id", 0))
items = best["itemData"]
print("using:", NAMES.get(best.get("accountIdentifier")), best.get("dateTimeString"), len(items))
print("sample:", items[:6])
json.dump(items, open(r"C:\Users\thoma\AppData\Local\Temp\claude\C--Users-thoma--runelite\15e3a8e8-23ff-4574-956b-b4f93ae9b52b\scratchpad\bank.json", "w"))
