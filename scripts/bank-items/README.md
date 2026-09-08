# Bank item generator

Turns a RuneLite **Bank Memory** snapshot into engine item classes so the loadout editor
can offer everything in the bank. Run from a scratch directory; each script's paths are at
the top of the file.

1. `parse-bank.py`: reads `bankMemory.currentList` from the RuneLite profile
   (`profiles2/*.properties`) and writes `bank.json` (`[[id, qty], ...]`).
2. `dump-items.mts`: `npx tsx scripts/bank-items/dump-items.mts <cache dir> bank.json bank-defs.json`
   reads names and equip slots for those ids from the pinned OpenRS2 cache.
   The process does not exit on its own once the file is written; kill it.
3. `fetch-wiki.py`: pulls each item's wiki infobox (bonuses, slot, speed, range, style,
   weight) into `bank-wiki.json`. Resumable; keep concurrency low (the wiki rate-limits).
   Food heal amounts come from the page prose (`food-heals.json`), with a manual map for
   half-pies and blighted food in `gen-bank.py`.
4. `gen-bank.py`: writes `src/content/generated/BankItems.ts`, the `BANK_*` entries in
   `src/sdk/ItemName.ts`, and the `bank<id>` ids in `src/assets/CacheAssets.ts`. Skips ids
   the SDK already implements by hand. Weapons map to melee or ranged classes by the wiki
   combat style; ancient staves autocast blood barrage; other staves are melee-only.
5. `get-sprites.py`: downloads inventory icons to `src/assets/images/bank/` (ammo uses the
   wiki's `_5` stack image); a transparent placeholder is written on a miss.
6. Re-run the cache-render extraction so the bundle has every new id's model.
