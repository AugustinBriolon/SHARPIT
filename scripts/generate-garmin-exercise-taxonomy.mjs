#!/usr/bin/env node
/**
 * Build src/data/garmin-exercise-taxonomy.json from:
 * - Garmin FIT SDK *ExerciseName.cs (category ownership)
 * - Connect exercise_types_fr.properties (FR labels)
 *
 * Usage:
 *   node scripts/generate-garmin-exercise-taxonomy.mjs
 *   # optional local props path:
 *   GARMIN_FR_PROPS=./tmp-garmin-ex-fr.properties node scripts/generate-garmin-exercise-taxonomy.mjs
 */
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src/data/garmin-exercise-taxonomy.json');
const FR_URL =
  'https://connect.garmin.com/web-translations/exercise_types/exercise_types_fr.properties';
const FIT_BASE =
  'https://raw.githubusercontent.com/garmin/fit-csharp-sdk/main/Dynastream/Fit/Profile/Types';

const FILES = [
  ['BandedExercisesExerciseName.cs', 'BANDED_EXERCISES'],
  ['BattleRopeExerciseName.cs', 'BATTLE_ROPE'],
  ['BenchPressExerciseName.cs', 'BENCH_PRESS'],
  ['BikeExerciseName.cs', 'BIKE'],
  ['BikeOutdoorExerciseName.cs', 'BIKE_OUTDOOR'],
  ['CalfRaiseExerciseName.cs', 'CALF_RAISE'],
  ['CardioExerciseName.cs', 'CARDIO'],
  ['CarryExerciseName.cs', 'CARRY'],
  ['ChopExerciseName.cs', 'CHOP'],
  ['CoreExerciseName.cs', 'CORE'],
  ['CrunchExerciseName.cs', 'CRUNCH'],
  ['CurlExerciseName.cs', 'CURL'],
  ['DeadliftExerciseName.cs', 'DEADLIFT'],
  ['EllipticalExerciseName.cs', 'ELLIPTICAL'],
  ['FloorClimbExerciseName.cs', 'FLOOR_CLIMB'],
  ['FlyeExerciseName.cs', 'FLYE'],
  ['HipRaiseExerciseName.cs', 'HIP_RAISE'],
  ['HipStabilityExerciseName.cs', 'HIP_STABILITY'],
  ['HipSwingExerciseName.cs', 'HIP_SWING'],
  ['HyperextensionExerciseName.cs', 'HYPEREXTENSION'],
  ['IndoorBikeExerciseName.cs', 'INDOOR_BIKE'],
  ['IndoorRowExerciseName.cs', 'INDOOR_ROW'],
  ['LadderExerciseName.cs', 'LADDER'],
  ['LateralRaiseExerciseName.cs', 'LATERAL_RAISE'],
  ['LegCurlExerciseName.cs', 'LEG_CURL'],
  ['LegRaiseExerciseName.cs', 'LEG_RAISE'],
  ['LungeExerciseName.cs', 'LUNGE'],
  ['MoveExerciseName.cs', 'MOVE'],
  ['OlympicLiftExerciseName.cs', 'OLYMPIC_LIFT'],
  ['PlankExerciseName.cs', 'PLANK'],
  ['PlyoExerciseName.cs', 'PLYO'],
  ['PoseExerciseName.cs', 'POSE'],
  ['PullUpExerciseName.cs', 'PULL_UP'],
  ['PushUpExerciseName.cs', 'PUSH_UP'],
  ['RowExerciseName.cs', 'ROW'],
  ['RunExerciseName.cs', 'RUN'],
  ['RunIndoorExerciseName.cs', 'RUN_INDOOR'],
  ['SandbagExerciseName.cs', 'SANDBAG'],
  ['ShoulderPressExerciseName.cs', 'SHOULDER_PRESS'],
  ['ShoulderStabilityExerciseName.cs', 'SHOULDER_STABILITY'],
  ['ShrugExerciseName.cs', 'SHRUG'],
  ['SitUpExerciseName.cs', 'SIT_UP'],
  ['SledExerciseName.cs', 'SLED'],
  ['SledgeHammerExerciseName.cs', 'SLEDGE_HAMMER'],
  ['SquatExerciseName.cs', 'SQUAT'],
  ['StairStepperExerciseName.cs', 'STAIR_STEPPER'],
  ['SuspensionExerciseName.cs', 'SUSPENSION'],
  ['TireExerciseName.cs', 'TIRE'],
  ['TotalBodyExerciseName.cs', 'TOTAL_BODY'],
  ['TricepsExtensionExerciseName.cs', 'TRICEPS_EXTENSION'],
  ['WarmUpExerciseName.cs', 'WARM_UP'],
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'SHARPIT-taxonomy-generator' } }, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          resolve(fetchText(res.headers.location));
          return;
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode !== 200) reject(new Error(`${url} → ${res.statusCode}`));
          else resolve(data);
        });
      })
      .on('error', reject);
  });
}

function pascalToLeaf(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-zA-Z])(\d)/g, '$1_$2')
    .replace(/(\d)([a-zA-Z])/g, '$1_$2')
    .replace(/_+/g, '_')
    .toUpperCase();
}

async function main() {
  const leafToCategory = new Map();
  for (const [file, category] of FILES) {
    const text = await fetchText(`${FIT_BASE}/${file}`);
    const re = /public const ushort (\w+) = (\d+)/g;
    let match;
    while ((match = re.exec(text))) {
      const name = match[1];
      if (name === 'Invalid') continue;
      const leaf = pascalToLeaf(name);
      if (!leafToCategory.has(leaf)) leafToCategory.set(leaf, category);
    }
    if (!leafToCategory.has(category)) leafToCategory.set(category, category);
  }

  for (const [leaf, cat] of Object.entries({
    DIP: 'DIP',
    CHEST_DIP: 'DIP',
    TRICEPS_DIP: 'DIP',
    CLAM_SHELLS: 'BANDED_EXERCISES',
    CLAM_BRIDGE: 'HIP_STABILITY',
  })) {
    if (!leafToCategory.has(leaf)) leafToCategory.set(leaf, cat);
  }

  const propsPath = process.env.GARMIN_FR_PROPS;
  const props = propsPath
    ? fs.readFileSync(path.resolve(propsPath), 'utf8')
    : await fetchText(FR_URL);

  const labelByLeaf = new Map();
  for (const line of props.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!key.startsWith('exercise_type_')) continue;
    const leaf = key.slice('exercise_type_'.length);
    if (!leaf || leaf === 'UNKNOWN') continue;
    labelByLeaf.set(leaf, value);
  }

  const cats = [...new Set([...leafToCategory.values(), 'DIP'])].sort(
    (a, b) => b.length - a.length,
  );

  function infer(leaf) {
    if (leafToCategory.has(leaf)) return leafToCategory.get(leaf);
    if (leaf.startsWith('STRETCH_')) return 'WARM_UP';
    if (leaf.startsWith('BANDED_EXERCISES_') || leaf.startsWith('BANDED_')) {
      return 'BANDED_EXERCISES';
    }
    if (leaf.startsWith('POSE_')) return 'POSE';
    if (leaf.startsWith('MOVE_')) return 'MOVE';
    for (const cat of cats) {
      if (leaf === cat || leaf.startsWith(`${cat}_`)) return cat;
    }
    return null;
  }

  const entries = [];
  let skipped = 0;
  for (const [leaf, labelFr] of labelByLeaf) {
    const category = infer(leaf);
    if (!category) {
      skipped += 1;
      continue;
    }
    entries.push({ leaf, category, labelFr });
  }
  entries.sort((a, b) => a.leaf.localeCompare(b.leaf));

  const payload = {
    version: 1,
    source: 'garmin-fit-sdk + connect exercise_types_fr.properties',
    generatedAt: new Date().toISOString().slice(0, 10),
    entries,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload)}\n`);
  console.log(
    JSON.stringify(
      {
        out: path.relative(ROOT, OUT),
        exported: entries.length,
        skippedNoCategory: skipped,
        bytes: fs.statSync(OUT).size,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
