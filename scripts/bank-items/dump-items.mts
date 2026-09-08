/* Scratch: dump item definitions (id, name, equip slot fields) from the pinned cache for a list of ids. */
import { readFileSync, writeFileSync } from "node:fs";
import { RSCache, IndexType, ConfigType } from "../../../osrscachereader/src/reader.js";
const [cachePath, idsPath, outPath] = process.argv.slice(2);
const ids = new Set((JSON.parse(readFileSync(idsPath, "utf8")) as [number, number][]).map(([id]) => id));
const cache = new RSCache(cachePath);
await cache.onload;
const defs = await cache.getAllDefs(IndexType.CONFIGS.id, ConfigType.ITEM.id);
const sample = defs.find((d: any) => d && d.id === 4151);
console.log("sample keys:", sample && Object.keys(sample).join(","));
const out: Record<string, any> = {};
for (const def of defs) {
  if (!def || !ids.has(def.id)) continue;
  out[def.id] = { name: def.name, wearPos: def.wearPos1 ?? def.wearpos1 ?? def.wearPos ?? null, stackable: def.stackable, notedTemplate: def.notedTemplate ?? def.noteTemplate, male: def.maleModel ?? def.maleModel0 ?? null, options: def.interfaceOptions ?? def.options ?? null };
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log("wrote", Object.keys(out).length, "defs");
