import { describe, expect, it } from 'vitest';
import {
  detectDateOrder,
  mapColumns,
  mealName,
  MfpExportFormatError,
  parseExportDate,
  parseLocaleNumber,
  pickNutritionFile,
  readMfpNutritionCsv,
} from './mfp-export';

const ENGLISH = [
  'Date,Meal,Calories,Fat (g),Saturated Fat,Polyunsaturated Fat,Monounsaturated Fat,Trans Fat,Cholesterol,Sodium (mg),Potassium,Carbohydrates (g),Fiber,Sugar,Protein (g),Vitamin A,Vitamin C,Calcium,Iron,Note',
  '2026-09-30,Breakfast,512.4,12.1,4,1,2,0,30,400,300,70.2,6,20.5,25.3,2,4,10,8,',
  '2026-09-30,Lunch,800,30,10,2,5,0,80,900,500,85,8,10,45,1,2,5,12,',
  '2026-09-30,Lunch,100,1,0,0,0,0,0,0,0,20,1,15,2,0,0,0,0,second lunch',
  '2026-10-01,Snacks,180,6,1,0,0,0,0,50,100,25,2,18,5,0,0,0,0,',
  'Total,,,,,,,,,,,,,,,,,,,',
].join('\n');

const FRENCH = [
  'Date;Repas;Calories;Lipides (g);Graisses saturées;Glucides (g);Fibres;Sucre;Protéines (g);Remarque',
  '30/09/2026;Petit-déjeuner;512,4;12,1;4;70,2;6;20,5;25,3;',
  '30/09/2026;Déjeuner;800;30;10;85;8;10;45;',
  '01/10/2026;Dîner;650;20;5;70;7;9;40;',
  '01/10/2026;Collations;180;6;1;25;2;18;5;',
].join('\n');

describe('readMfpNutritionCsv', () => {
  it('reads an English export into days of meal totals, merging a meal logged twice', () => {
    const reading = readMfpNutritionCsv(ENGLISH);

    expect(reading.skippedRows).toBe(1);
    expect(reading.days.map((day) => day.date)).toEqual(['2026-09-30', '2026-10-01']);
    expect(reading.days[0]!.meals).toEqual([
      {
        name: 'breakfast',
        calories: 512.4,
        protein: 25.3,
        carbs: 70.2,
        fat: 12.1,
        fiber: 6,
        sugar: 20.5,
        entries: [],
      },
      {
        name: 'lunch',
        calories: 900,
        protein: 47,
        carbs: 105,
        fat: 31,
        fiber: 9,
        sugar: 25,
        entries: [],
      },
    ]);
  });

  it('reads a French export: semicolons, decimal commas, day-first dates, French meals', () => {
    const reading = readMfpNutritionCsv(FRENCH);

    expect(reading.days.map((day) => day.date)).toEqual(['2026-09-30', '2026-10-01']);
    expect(reading.days[0]!.meals.map((meal) => [meal.name, meal.calories, meal.fat])).toEqual([
      ['breakfast', 512.4, 12.1],
      ['lunch', 800, 30],
    ]);
    expect(reading.days[1]!.meals.map((meal) => meal.name)).toEqual(['dinner', 'snacks']);
  });

  it('refuses a file without the date, meal and calories columns', () => {
    expect(() => readMfpNutritionCsv('Date,Weight\n2026-10-01,72')).toThrow(MfpExportFormatError);
  });
});

describe('mapColumns', () => {
  it('reads the total fat, never a fat sub-type', () => {
    expect(mapColumns(['Date', 'Meal', 'Calories', 'Saturated Fat', 'Fat (g)']).fat).toBe(4);
  });
});

describe('parseLocaleNumber', () => {
  it('reads decimal points, decimal commas and thousands, and nulls the rest', () => {
    expect(parseLocaleNumber('1,234.5')).toBe(1234.5);
    expect(parseLocaleNumber('650,5')).toBe(650.5);
    expect(parseLocaleNumber('1 234,5')).toBe(1234.5);
    expect(parseLocaleNumber('')).toBeNull();
    expect(parseLocaleNumber('n/a')).toBeNull();
  });
});

describe('dates', () => {
  it('reads ISO dates, and slashed dates day first unless proven month first', () => {
    expect(parseExportDate('2026-9-3', 'DMY')).toBe('2026-09-03');
    expect(parseExportDate('03/09/2026', 'DMY')).toBe('2026-09-03');
    expect(detectDateOrder(['09/03/2026', '09/30/2026'])).toBe('MDY');
    expect(parseExportDate('09/30/2026', 'MDY')).toBe('2026-09-30');
    expect(parseExportDate('Total', 'DMY')).toBeNull();
  });
});

describe('mealName', () => {
  it('names the four meals in either language and keeps a custom meal as written', () => {
    expect(['Breakfast', 'Petit-déjeuner', 'Déjeuner', 'Dîner', 'En-cas'].map(mealName)).toEqual([
      'breakfast',
      'breakfast',
      'lunch',
      'dinner',
      'snacks',
    ]);
    expect(mealName('Pre-workout')).toBe('pre-workout');
  });
});

describe('pickNutritionFile', () => {
  it('finds the nutrition CSV among the export files, not the weight or exercise ones', () => {
    expect(
      pickNutritionFile([
        '__MACOSX/Nutrition-Summary.csv',
        'Exercise-Summary-2024-01-01-to-2026-09-30.csv',
        'Measurement-Summary-2024-01-01-to-2026-09-30.csv',
        'Nutrition-Summary-2024-01-01-to-2026-09-30.csv',
      ]),
    ).toBe('Nutrition-Summary-2024-01-01-to-2026-09-30.csv');
    expect(pickNutritionFile(['Exercise.csv'])).toBeNull();
  });
});
