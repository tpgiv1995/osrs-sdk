#!/usr/bin/env node
/* eslint-env node */
/*
 * Player-only cache-render extractor for the Inferno trainer.
 *
 * Reads an OSRS cache (OpenRS2 disk store) with osrscachereader and writes a small cache-render bundle (same
 * format as the Colosseum fork's) containing: one payload per player item (male wear models), one payload per
 * default identity-kit body part, and one shared payload with the player's animation frame maps. The manifest also
 * records which appearance slots each item hides, so the runtime can show the kit under any item with no model.
 *
 * Usage (Windows, Node 24; do not use tsx.cmd, it fails to spawn):
 *   OSRS_CACHE_REVISION=242 OSRS_CACHE_SOURCE=openrs2:2762 node node_modules/tsx/dist/cli.mjs \
 *     scripts/player-render/extract.mts <cache-dir> <output-dir>
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "fflate";
import { RSCache, IndexType, ConfigType, ModelGroup } from "../../../osrscachereader/src/reader.js";
import { PLAYER_CACHE_ITEMS, PLAYER_DEFAULT_KIT, PLAYER_ANIMATION_SEQUENCES, PLAYER_CACHE_SPOTANIMS } from "../../src/assets/PlayerCacheItems";
import { CACHE_RENDER_BUNDLE_SCHEMA_VERSION, CACHE_RENDER_PAYLOAD_MAGIC, CACHE_RENDER_PAYLOAD_VERSION } from "../../src/cache-render-format/index.ts";
import { applyDefinitionOverrides } from "./definition-overrides";
import { renderFaceIndices } from "./face-rendering";

function sequenceFrameSounds(_sequence) {
  return {};
}

// The SDK's unlit Three.js materials expect the cache palette's established
// 0.6 gamma adjustment. Tile brightness is applied to packed HSL beforehand;
// it is not this final RGB conversion.
function hslRgb(hsl, brightness = 0.6) {
  const hue = ((hsl >> 10) & 63) / 64 + 0.5 / 64, saturation = ((hsl >> 7) & 7) / 8 + 0.5 / 8, luminance = (hsl & 127) / 128;
  const chroma = (1 - Math.abs(2 * luminance - 1)) * saturation, x = chroma * (1 - Math.abs(((hue * 6) % 2) - 1)), lightness = luminance - chroma / 2;
  let r = lightness, g = lightness, b = lightness;
  switch (Math.floor(hue * 6)) { case 0: r += chroma; g += x; break; case 1: g += chroma; r += x; break; case 2: g += chroma; b += x; break; case 3: b += chroma; g += x; break; case 4: b += chroma; r += x; break; default: r += chroma; b += x; }
  const brighten = (v) => Math.floor(Math.pow(Math.floor(v * 256) / 256, brightness) * 256);
  return (brighten(r) << 16) | (brighten(g) << 8) | brighten(b) || 1;
}

function payload(group, includeFace = (model, face) => true, definition) {
  const model = group.getMergedModel();
  if (!model || !model.vertexCount) throw new Error("Decoded model has no vertices");
  const positions = [], indices = [], colors = [], faceColors = [], uvs = [], textureIds = [], sourceVertices = [], animayaGroups = [], animayaScales = [], alphas = [], alphaGroups = (model.faceLabelsAlpha ?? []).map(() => []), vertexGroups = (model.vertexGroups ?? []).map(() => []);
  for (let face = 0; face < model.faceVertexIndices1.length; face++) {
    if (!includeFace(model, face)) continue;
    const { color: faceColor, texture: faceTexture } = applyDefinitionOverrides(
      model.faceColors?.[face] ?? 0,
      model.faceTextures?.[face] ?? -1,
      definition,
    );
    const firstVertex = positions.length / 3;
    const faceIndices = renderFaceIndices(firstVertex, model.faceRenderTypes?.[face]);
    [model.faceVertexIndices1[face], model.faceVertexIndices2[face], model.faceVertexIndices3[face]].forEach((source, corner) => {
      const index = positions.length / 3; positions.push(model.vertexPositionsX[source] / 128, -model.vertexPositionsY[source] / 128, -model.vertexPositionsZ[source] / 128); indices.push(faceIndices[corner]);
      sourceVertices.push(source);
      animayaGroups.push(model.animayaGroups?.[source] ?? []);
      animayaScales.push(model.animayaScales?.[source] ?? []);
      colors.push(hslRgb(faceColor));
      faceColors.push(faceColor);
      alphas.push(model.faceAlphas?.[face] ?? 0);
      uvs.push(model.faceTextureUCoordinates?.[face]?.[corner] ?? 0, model.faceTextureVCoordinates?.[face]?.[corner] ?? 0);
      textureIds.push(faceTexture);
      for (let groupIndex = 0; groupIndex < vertexGroups.length; groupIndex++) if (model.vertexGroups[groupIndex]?.includes(source)) vertexGroups[groupIndex].push(index);
      for (let groupIndex = 0; groupIndex < alphaGroups.length; groupIndex++) if (model.faceLabelsAlpha[groupIndex]?.includes(face)) alphaGroups[groupIndex].push(index);
    });
  }
  return {
    positions, indices, vertexGroups, sourceVertices, animayaGroups, animayaScales, colors, faceColors, alphas, alphaGroups, uvs, textureIds,
    color: 0xffffff,
    animations: {},
  };
}

async function attachTextures(cache, result) {
  const ids = [...new Set((result.textureIds ?? []).filter((id) => id >= 0))];
  result.textures = {};
  for (const id of ids) {
    const definition = await cache.getDef(IndexType.TEXTURES.id, 0, id, { loadSprites: true });
    const sprite = definition?.sprites?.[0]?.def?.sprites?.[0];
    if (!sprite) continue;
    result.textures[id] = { width: sprite.width, height: sprite.height, pixels: sprite.pixels };
  }
  return result;
}

async function animations(cache, group, sequenceIds) {
  const result = {};
  for (const id of [...new Set(sequenceIds.filter((value) => Number.isInteger(value) && value >= 0))]) {
    const sequence = await cache.getDef(IndexType.CONFIGS.id, ConfigType.SEQUENCE.id, id);
    if (!sequence) throw new Error(`Missing animation sequence definition ${id}`);
    const animation = await group.getMergedModel().loadAnimation(cache, id, false, true);
    const rawFrames = [];
    // Standard (frame-map) sequences can be evaluated against the final
    // composed model. This is important for equipment: animation pivots are
    // calculated from the merged vertex groups, not independently per item.
    if (sequence.animMayaID == null || sequence.animMayaID === -1) {
      for (const frameId of sequence.frameIDs ?? []) {
        const frame = await cache.getDef(IndexType.FRAMES.id, frameId >> 16, frameId & 65535);
        if (!frame) throw new Error(`Missing animation frame ${frameId} for sequence ${id}`);
        rawFrames.push({
          baseId: frame.framemap.id,
          types: frame.framemap.types,
          maps: frame.framemap.frameMaps,
          indexFrameIds: frame.indexFrameIds,
          x: frame.translator_x,
          y: frame.translator_y,
          z: frame.translator_z,
        });
      }
    }
    const frameSounds = sequenceFrameSounds(sequence);
    result[id] = {
      frames: animation.vertexData.map((frame) => frame.flatMap(([x, y, z]) => [x / 128, y / 128, z / 128])),
      lengths: animation.lengths,
      ...(rawFrames.length ? { rawFrames } : {}),
      interleaveLeave: sequence.interleaveLeave ?? [],
      ...(Object.keys(frameSounds).length ? { frameSounds } : {}),
      ...(sequence.soundsCrossWorldView ? { soundsCrossWorldView: true } : {}),
    };
    if (sequence.animMayaID != null && sequence.animMayaID !== -1) {
      const index = group.getMergedModel().rev229 ? IndexType.KEYFRAMES : IndexType.FRAMES;
      const files = await cache.getAllFiles(index.id, sequence.animMayaID >> 16, { isAnimaya: true });
      const frameDef = files[0]?.def;
      if (!frameDef?.framemap?.animayaSkeleton) throw new Error(`Missing Animaya skeleton for sequence ${id}`);
      const matrices = [];
      for (let frame = 0; frame < sequence.animMayaEnd; frame++) {
        frameDef.framemap.animayaSkeleton.getAllBones().forEach((bone, index) => frameDef.method727(frame, bone, index, frameDef.field1257));
        matrices.push(frameDef.framemap.animayaSkeleton.getAllBones().map((bone) => Array.from(bone.method687(frameDef.field1257).matrixVals)));
      }
      result[id].mayaFrames = matrices;
      result[id].frames = [];
      result[id].lengths = new Array(matrices.length).fill(1);
    }
  }
  return result;
}

async function modelAsset(cache, id, models) {
  if (id < 0 || models.has(id)) return;
  const model = await cache.getDef(IndexType.MODELS.id, id);
  if (!model) throw new Error(`Missing model definition ${id}`);
  models.set(id, model);
}

async function itemModels(cache, item, models) {
  const ids = [];
  for (const key of ["maleModel0", "maleModel1", "maleModel2"]) {
    if (item[key] >= 0) { await modelAsset(cache, item[key], models); ids.push(item[key]); }
  }
  return ids;
}

async function kitModels(cache, kit, models) {
  const ids = [];
  for (const id of kit.models ?? []) if (id >= 0) { await modelAsset(cache, id, models); ids.push(id); }
  return ids;
}

const [cachePath, outputDirectory] = process.argv.slice(2);
if (!cachePath || !outputDirectory) throw new Error("Usage: extract.mts <cache-dir> <output-dir>");
const revision = Number(process.env.OSRS_CACHE_REVISION || 0);
const cache = new RSCache(cachePath);
await cache.onload;
const models = new Map();
const assets = [];
const poseMap = Object.fromEntries(Object.entries(PLAYER_ANIMATION_SEQUENCES));
const poseSequences = Object.values(poseMap);
const playerItems = {};
const playerItemInfo = {};
const missing = [];
let sharedAnimations;

const itemDefs = await cache.getAllDefs(IndexType.CONFIGS.id, ConfigType.ITEM.id);
async function playerPayload(group, definition) {
  const result = await attachTextures(cache, payload(group, undefined, definition));
  const itemAnimations = await animations(cache, group, poseSequences);
  const shared = {}, specific = {};
  for (const [sequenceId, animation] of Object.entries(itemAnimations)) {
    if (animation.rawFrames?.length || animation.mayaFrames?.length) shared[sequenceId] = {
      lengths: animation.lengths,
      ...(animation.rawFrames?.length ? { rawFrames: animation.rawFrames, interleaveLeave: animation.interleaveLeave ?? [] } : { mayaFrames: animation.mayaFrames }),
      frames: [],
    };
    else specific[sequenceId] = animation;
  }
  sharedAnimations ??= { positions: [], animations: shared, poseMap };
  result.animations = specific;
  result.poseMap = Object.keys(specific).length ? poseMap : undefined;
  return result;
}
const emptyPayload = () => ({ positions: [0, 0, 0], indices: [], color: 0xffffff, animations: {}, poseMap });

for (const [name, { id }] of Object.entries(PLAYER_CACHE_ITEMS)) {
  const item = itemDefs.find((entry) => entry?.id === id);
  if (!item) { missing.push(`${name} (${id}): no item definition in this cache`); continue; }
  const modelIds = await itemModels(cache, item, models);
  const assetId = `player-item-${id}`;
  const hasModel = modelIds.length > 0;
  if (!hasModel) {
    assets.push({ id: assetId, payload: emptyPayload() });
    missing.push(`${name} (${id}, ${item.name}): the cache has no worn model for this item`);
  } else {
    const group = new ModelGroup(modelIds.map((m) => models.get(m)), false);
    assets.push({ id: assetId, payload: await playerPayload(group, item) });
  }
  playerItems[`item:${id}`] = assetId;
  playerItemInfo[`item:${id}`] = {
    name: item.name,
    hasModel,
    // appearance slots this item occupies or hides (wearPos1/2/3); -1 means unused
    slots: [item.wearPos1, item.wearPos2, item.wearPos3].filter((slot) => Number.isInteger(slot) && slot >= 0),
  };
}

async function spotAnimAsset(cache, id, models) {
  const definition = await cache.getDef(IndexType.CONFIGS.id, ConfigType.SPOTANIM.id, id);
  if (!definition || definition.modelId == null) throw new Error(`Missing spotanim definition ${id}`);
  await modelAsset(cache, definition.modelId, models);
  // Keep the raw model: ModelGroup's geometry merge omits the face-label alpha groups that type-5 fades need.
  const group = { getMergedModel: () => models.get(definition.modelId) };
  const result = await attachTextures(cache, payload(group, undefined, definition));
  result.animations = definition.animationId >= 0 ? await animations(cache, group, [definition.animationId]) : {};
  result.spotAnim = { id, animationId: definition.animationId, resizeX: definition.resizeX ?? 128, resizeY: definition.resizeY ?? 128, rotation: definition.rotation ?? 0 };
  return result;
}
const spotAnimAssets = {};
for (const id of Object.values(PLAYER_CACHE_SPOTANIMS)) {
  const assetId = `spotanim-${id}`;
  assets.push({ id: assetId, payload: await spotAnimAsset(cache, id, models) });
  spotAnimAssets[String(id)] = assetId;
}

const kitAssets = {};
for (const [part, { kit: kitId, slot }] of Object.entries(PLAYER_DEFAULT_KIT)) {
  const kit = await cache.getDef(IndexType.CONFIGS.id, ConfigType.IDENTKIT.id, kitId);
  const ids = kit ? await kitModels(cache, kit, models) : [];
  if (!ids.length) { missing.push(`kit ${part} (${kitId}): no models`); continue; }
  const group = new ModelGroup(ids.map((m) => models.get(m)), false);
  const assetId = `player-kit-${part}`;
  assets.push({ id: assetId, payload: await playerPayload(group, kit) });
  kitAssets[part] = { asset: assetId, slot };
}
if (sharedAnimations) assets.push({ id: "player-animations", payload: sharedAnimations });
await cache.close?.();

await mkdir(outputDirectory, { recursive: true });
const generatedFile = /^(?:[a-z0-9][a-z0-9:_-]*\.)?[a-f0-9]{64}\.bin$/i;
for (const entry of await readdir(outputDirectory, { withFileTypes: true })) {
  if (entry.isFile() && (entry.name === "manifest.json" || generatedFile.test(entry.name))) await unlink(resolve(outputDirectory, entry.name));
}
const written = {};
for (const asset of assets.sort((a, b) => a.id.localeCompare(b.id))) {
  const body = { version: CACHE_RENDER_PAYLOAD_VERSION, ...asset.payload };
  const compressed = Buffer.from(gzipSync(Buffer.from(JSON.stringify(body)), { level: 6 }));
  const bytes = Buffer.concat([Buffer.from(CACHE_RENDER_PAYLOAD_MAGIC), Buffer.from(Uint32Array.of(compressed.length).buffer), compressed]);
  const hash = createHash("sha256").update(bytes).digest("hex");
  await writeFile(resolve(outputDirectory, `${hash}.bin`), bytes);
  written[asset.id] = { file: `${hash}.bin`, sha256: hash, bytes: bytes.length };
}
const contentHash = createHash("sha256").update(JSON.stringify({ written, playerItems, kitAssets, playerItemInfo })).digest("hex");
const manifest = {
  schemaVersion: CACHE_RENDER_BUNDLE_SCHEMA_VERSION,
  bundleVersion: `osrs-${revision}-player-${contentHash.slice(0, 12)}`,
  cache: { revision, source: process.env.OSRS_CACHE_SOURCE ?? `openrs2:${revision}`, contentHash },
  assets: written,
  references: {},
  playerItems,
  playerItemInfo,
  playerKit: kitAssets,
  spotAnims: spotAnimAssets,
  sharedAssets: { playerAnimations: "player-animations" },
};
await writeFile(resolve(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(resolve(outputDirectory, "MISSING.txt"), missing.length ? missing.join("\n") + "\n" : "none\n");
console.log(`Wrote ${Object.keys(written).length} payloads for cache revision ${revision}; ${missing.length} notes:`);
for (const line of missing) console.log("  " + line);
process.exit(0);
