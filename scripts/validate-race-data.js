#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const errors = [];

function readJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (err) {
    errors.push(`${relativePath}: invalid JSON (${err.message})`);
    return null;
  }
}

function loadRaceFieldDefinitions() {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(path.join(root, 'raceFields.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'raceFields.js' });
  return {
    fields: context.window.raceFieldDefinitions || [],
    groups: context.window.raceFieldGroups || []
  };
}

function validateFieldDefinitions(fields) {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const expectedUnits = {
    ppLimit: undefined,
    maxPowerOutput: 'HP',
    minimumWeight: 'lbs.'
  };

  Object.entries(expectedUnits).forEach(([fieldId, expectedUnit]) => {
    const field = byId.get(fieldId);
    if (!field) {
      errors.push(`raceFields.js: missing field definition for ${fieldId}`);
      return;
    }
    if (field.unit !== expectedUnit) {
      const actual = field.unit === undefined ? 'no unit' : field.unit;
      const expected = expectedUnit === undefined ? 'no unit' : expectedUnit;
      errors.push(`raceFields.js: ${fieldId} unit is ${actual}, expected ${expected}`);
    }
  });

  return byId;
}

function validateRounds(fieldIds) {
  const rounds = readJson('data/rounds.json');
  if (!Array.isArray(rounds)) {
    errors.push('data/rounds.json: expected an array');
    return;
  }

  const metadataFields = new Set(['id', 'title', 'track', 'variant', 'date']);
  const allowedRaceFields = new Set([...metadataFields, ...fieldIds]);

  rounds.forEach((roundConfig) => {
    if (!roundConfig || !roundConfig.id || !roundConfig.directory) {
      errors.push('data/rounds.json: every round needs id and directory');
      return;
    }

    const roundPath = `data/rounds/${roundConfig.directory}/round.json`;
    const round = readJson(roundPath);
    if (!round) return;

    const raceEntries = Array.isArray(round.races) ? round.races : [];
    raceEntries.forEach((raceEntry, index) => {
      const raceDirectory =
        typeof raceEntry === 'string'
          ? raceEntry
          : raceEntry && (raceEntry.directory || raceEntry.id);
      if (!raceDirectory) {
        errors.push(`${roundPath}: invalid race entry at index ${index}`);
        return;
      }

      const racePath = `data/rounds/${roundConfig.directory}/races/${raceDirectory}/race.json`;
      const race = readJson(racePath);
      if (!race) return;

      if (race.id !== raceDirectory) {
        errors.push(`${racePath}: id "${race.id}" does not match directory "${raceDirectory}"`);
      }

      Object.keys(race).forEach((key) => {
        if (!allowedRaceFields.has(key)) {
          errors.push(`${racePath}: field "${key}" is not produced by the race editor`);
        }
      });
    });
  });
}

const { fields } = loadRaceFieldDefinitions();
const definitionMap = validateFieldDefinitions(fields);
validateRounds(definitionMap.keys());

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Race data validation passed.');
