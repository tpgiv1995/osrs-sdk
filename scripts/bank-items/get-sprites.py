"""Download inventory sprites for generated bank items; placeholder on miss so the build never breaks."""
import json, os, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

SCR = r"C:\Users\thoma\AppData\Local\Temp\claude\C--Users-thoma--runelite\15e3a8e8-23ff-4574-956b-b4f93ae9b52b\scratchpad"
OUT = r"C:\dev\colosim\osrs-sdk\src\assets\images\bank"
os.makedirs(OUT, exist_ok=True)
report = json.load(open(f"{SCR}\\bank-gen-report.json", encoding="utf-8"))
UA = {"User-Agent": "Mozilla/5.0 (v3 colosseum sim sprite fetch; contact: sarahgracelunsford@yahoo.com)"}

def get(url):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                data = r.read()
                if data[:4] == b"\x89PNG":
                    return data
                return None
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(1 + attempt)
        except Exception:
            time.sleep(1 + attempt)
    return None

def candidates(url):
    url = url.split('%23')[0].split('#')[0]
    if not url.endswith('.png'): url += '.png'
    yield url
    # potions on the wiki are "Name(4).png"; some items use "Name_(detail)" variants; try a few spellings
    base = url[:-4]
    if "%28" in base:
        yield base.replace("_%28", "(").replace("%29", ")") + ".png"
    yield base.replace("%27", "'") + ".png"
    # stackable ammo icons are the 5-stack image on the wiki
    yield base + "_5.png"
    yield base.split("_%28")[0] + "_5.png"

def fetch_one(item):
    fname, url = item
    path = os.path.join(OUT, fname)
    if os.path.exists(path) and os.path.getsize(path) > 400:
        return fname, "cached"
    time.sleep(0.4)
    for u in candidates(url):
        data = get(u)
        if data:
            open(path, "wb").write(data)
            return fname, "ok"
    Image.new("RGBA", (36, 32), (0, 0, 0, 0)).save(path)
    return fname, "placeholder"

results = {}
with ThreadPoolExecutor(max_workers=2) as ex:
    for fname, status in ex.map(fetch_one, sorted(report["sprites"].items())):
        results[status] = results.get(status, 0) + 1
print(results)
missing = [f for f, u in report["sprites"].items() if os.path.getsize(os.path.join(OUT, f)) < 400]
json.dump(missing, open(f"{SCR}\\sprites-missing.json", "w"))
print("placeholders/tiny:", len(missing))
