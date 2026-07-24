/**
 * Alias map: normalized athlete/Garmin label → catalog id.
 * Prefer explicit ids over fuzzy for high-traffic movements.
 * More-specific keys must win over short generics (e.g. "squat sans charge" vs "squat").
 */
export const EXERCISE_ALIASES: Readonly<Record<string, string>> = {
  // Bench
  'bench press': '0025',
  'barbell bench press': '0025',
  'developpe couche': '0025',
  'developpe couche barre': '0025',
  'dumbbell bench press': '0289',
  'developpe couche halteres': '0289',

  // Push-up / Pompe
  'push-up': '0662',
  'push up': '0662',
  pushup: '0662',
  pompe: '0662',
  pompes: '0662',

  // Dip
  'chest dip': '0251',
  dip: '0251',
  dips: '0251',
  'dip avec poids du corps': '0251',
  'dips avec poids du corps': '0251',
  'bodyweight dip': '0251',
  'body weight dip': '0251',

  // Squat
  'barbell full squat': '0043',
  'barbell squat': '0043',
  squat: '0043',
  'squat sans charge': '1685',
  'bodyweight squat': '1685',
  'body weight squat': '1685',
  'air squat': '1685',
  'goblet squat': '0534',
  'dumbbell goblet squat': '1760',
  'kettlebell goblet squat': '0534',
  // Bulgarian / split
  'barbell single leg split squat': '0099',
  'bulgarian split squat': '0099',
  'squat bulgare': '0099',
  'squat bulgare avec barre a disques': '0099',
  'squat bulgare avec barre': '0099',
  'split squat': '2810',

  // Deadlift
  'barbell deadlift': '0032',
  deadlift: '0032',
  souleve: '0032',
  'souleve de terre': '0032',

  // Pull-up
  'pull up': '0652',
  'pull-up': '0652',
  pullup: '0652',
  tractions: '0652',
  traction: '0652',

  // Curl
  'dumbbell curl': '0294',
  'dumbbell biceps curl': '0294',
  'curl halteres': '0294',
  curl: '0294',

  // Row
  'barbell bent over row': '0027',
  'bent over row': '0027',
  rowing: '0027',

  // Shoulder
  'dumbbell lateral raise': '0334',
  'lateral raise': '0334',
  'elevation laterale': '0334',

  // Lunge
  'barbell lunge': '0054',
  lunge: '0054',
  fente: '0054',
  fentes: '0054',

  // Plank
  'front plank with twist': '0464',
  plank: '0464',
  planche: '0464',
  'posture de la planche': '0464',
  'la planche': '0464',

  // Abs
  'crunch floor': '0274',
  crunch: '0274',
  abdominaux: '0274',
  abdominal: '0274',
  abs: '0274',
  'sit-up': '0001',
  'sit up': '0001',

  // Hip thrust / bridge
  'barbell glute bridge two legs on bench male': '3562',
  'barbell hip thrust with bench': '3562',
  'hip thrust with bench': '3562',
  'barbell hip thrust': '3562',
  'hip thrust': '3562',
  'glute bridge': '1409',
  'barbell glute bridge': '1409',

  // Clamshell (closest catalog: band seated hip abduction)
  clamshell: '3006',
  'clam shell': '3006',
  'clam shells': '3006',
  clamshells: '3006',
  'clamshell avec elastique': '3006',
  'clam shell avec elastique': '3006',
  'band seated hip abduction': '3006',

  // Stretches — closest available visuals (dataset has no cat-cow / child pose)
  'etirement 90 90': '2567',
  'etirement 9090': '2567',
  '90 90': '2567',
  '90/90': '2567',
  'stretch 90 90': '2567',
  'seated piriformis stretch': '2567',
  'etirement chat et vache': '1512',
  'chat et vache': '1512',
  'cat cow': '1512',
  'cat-cow': '1512',
  'all fours squad stretch': '1512',
  'etirement posture de l enfant': '1710',
  'posture de l enfant': '1710',
  'child pose': '1710',
  "child's pose": '1710',
};
