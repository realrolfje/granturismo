function getEarliestUpcomingDate(races = []) {
  const now = Date.now();
  let earliest = Infinity;
  (races || []).forEach((race) => {
    if (!race || !race.date) return;
    const timestamp = new Date(race.date).getTime();
    if (!Number.isFinite(timestamp)) return;
    if (timestamp >= now && timestamp < earliest) {
      earliest = timestamp;
    }
  });
  return earliest;
}

function getRoundStartTimestamp(roundEntry) {
  if (!roundEntry || !roundEntry.racesData || !roundEntry.racesData.round) {
    return 0;
  }
  const dateValue = roundEntry.racesData.round.startDate;
  if (!dateValue) {
    return 0;
  }
  const timestamp = new Date(dateValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function cacheBustedUrl(url) {
  const stamp = Math.floor(Date.now() / 60000);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${stamp}`;
}

function cacheBustedFetch(url, options) {
  return fetch(cacheBustedUrl(url), options);
}

const SELECTED_ROUND_STORAGE_KEY = 'gt7-selected-round';

function readStoredRoundId() {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }
    const storedValue = window.localStorage.getItem(SELECTED_ROUND_STORAGE_KEY);
    if (!storedValue) return null;
    try {
      const parsed = JSON.parse(storedValue);
      if (parsed && typeof parsed === 'object' && parsed.roundId) {
        return parsed;
      }
    } catch (err) {
      return { roundId: storedValue, activeRoundId: null };
    }
    return { roundId: storedValue, activeRoundId: null };
  } catch (err) {
    console.warn('Unable to read stored round', err);
    return null;
  }
}

function persistSelectedRoundId(roundId, activeRoundId) {
  if (!roundId) return;
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return;
    }
    window.localStorage.setItem(
      SELECTED_ROUND_STORAGE_KEY,
      JSON.stringify({ roundId, activeRoundId: activeRoundId || null })
    );
  } catch (err) {
    console.warn('Unable to persist selected round', err);
  }
}

function pickDefaultRound(rounds = [], storedSelection) {
  if (!rounds.length) return null;
  const activeRound = rounds.find((round) => round.active);
  const activeRoundId = activeRound ? activeRound.id : null;
  const preferredId =
    typeof storedSelection === 'string'
      ? storedSelection
      : storedSelection && storedSelection.roundId;
  const storedActiveRoundId =
    storedSelection && typeof storedSelection === 'object'
      ? storedSelection.activeRoundId
      : null;
  const storedSelectionMatchesActiveRound =
    !activeRoundId || storedActiveRoundId === activeRoundId;

  if (preferredId && storedSelectionMatchesActiveRound) {
    const preferred = rounds.find((round) => round.id === preferredId);
    if (preferred) {
      return preferred;
    }
  }
  if (activeRound) return activeRound;
  return rounds.reduce((current, next) => {
    const currentScore = Number.isFinite(current.earliestUpcoming) ? current.earliestUpcoming : Infinity;
    const nextScore = Number.isFinite(next.earliestUpcoming) ? next.earliestUpcoming : Infinity;
    if (nextScore < currentScore) {
      return next;
    }
    return current;
  }, rounds[0]);
}

async function loadRoundTeams(directory) {
  const roundTeamsUrl = `data/rounds/${directory}/teams.json`;
  const response = await cacheBustedFetch(roundTeamsUrl);
  if (!response.ok) {
    throw new Error(`Failed to load ${response.url}`);
  }
  return response.json();
}

async function fetchJsonOrNull(url) {
  const response = await cacheBustedFetch(url);
  if (response.ok) {
    return response.json();
  }
  if (response.status === 404) {
    return null;
  }
  throw new Error(`Failed to load ${url}`);
}

async function resourceExists(url) {
  const response = await cacheBustedFetch(url, { method: 'HEAD' });
  if (response.ok) return true;
  if (response.status === 404) return false;
  if (response.status === 405) {
    const getResponse = await cacheBustedFetch(url);
    if (getResponse.ok) return true;
    if (getResponse.status === 404) return false;
  }
  return false;
}

async function findRaceProofUrl(roundDirectory, raceDirectory) {
  const candidate = `data/rounds/${roundDirectory}/races/${raceDirectory}/proof.jpg`;
  // Probe a single conventional file name so proof paths don't need to be stored in JSON.
  return (await resourceExists(candidate)) ? candidate : '';
}

function normalizeFinishersArray(finishers) {
  if (!Array.isArray(finishers)) return [];
  return finishers.map((finisher, index) => {
    if (!finisher || typeof finisher !== 'object') {
      return { position: index + 1 };
    }
    const entry = { ...finisher };
    if (!Number.isFinite(entry.position)) {
      entry.position = index + 1;
    }
    return entry;
  });
}

function normalizeRaceResultEntry({ raceId, proofUrl = '', rawResults }) {
  if (!Array.isArray(rawResults)) {
    throw new Error(`Invalid results format for ${raceId}; expected an array`);
  }
  return {
    raceId,
    proof: proofUrl,
    finishers: normalizeFinishersArray(rawResults)
  };
}

function buildRoundFromPerRaceManifest({
  config = {},
  manifest = {},
  raceEntries = []
}) {
  const manifestRound = manifest && manifest.round ? manifest.round : {};
  const manifestRaces = Array.isArray(manifest.races) ? manifest.races : [];
  const raceRecords = raceEntries
    .map((entry, index) => {
      const manifestRace = manifestRaces[index] || {};
      const raceMeta = entry && entry.raceMeta && typeof entry.raceMeta === 'object' ? entry.raceMeta : {};
      const id = raceMeta.id || manifestRace.id || manifestRace.directory;
      if (!id) return null;
      return { ...raceMeta, id };
    })
    .filter(Boolean);

  return {
    round: {
      id: manifestRound.id || config.id,
      title: manifestRound.title || config.label || config.id,
      description: manifestRound.description || '',
      startDate: manifestRound.startDate || ''
    },
    races: raceRecords
  };
}

async function loadRoundBundle(directory, config = {}) {
  const roundManifestUrl = `data/rounds/${directory}/round.json`;
  const manifest = await fetchJsonOrNull(roundManifestUrl);
  if (!manifest) {
    throw new Error(`Missing round manifest: ${roundManifestUrl}`);
  }

  const manifestRaces = Array.isArray(manifest.races) ? manifest.races : [];
  const raceEntries = await Promise.all(
    manifestRaces.map(async (raceEntry, index) => {
      const raceDirectory =
        (raceEntry && (raceEntry.directory || raceEntry.id)) ||
        (typeof raceEntry === 'string' ? raceEntry : null);
      if (!raceDirectory) {
        throw new Error(`Invalid race entry at index ${index} in data/rounds/${directory}/round.json`);
      }
      const raceUrl = `data/rounds/${directory}/races/${raceDirectory}/race.json`;
      const resultsUrl = `data/rounds/${directory}/races/${raceDirectory}/results.json`;
      const [raceMeta, rawResults, proofUrl] = await Promise.all([
        fetchJsonOrNull(raceUrl),
        fetchJsonOrNull(resultsUrl),
        findRaceProofUrl(directory, raceDirectory)
      ]);
      if (!raceMeta) {
        throw new Error(`Missing race metadata: ${raceUrl}`);
      }
      return {
        raceDirectory,
        raceMeta,
        rawResults,
        proofUrl
      };
    })
  );

  const racesData = buildRoundFromPerRaceManifest({
    config,
    manifest,
    raceEntries
  });

  const resultsData = {
    results: raceEntries
      .map((entry, index) => {
        const manifestRace = manifestRaces[index] || {};
        const raceId = entry.raceMeta.id || manifestRace.id || entry.raceDirectory;
        if (!entry.rawResults) return null;
        return normalizeRaceResultEntry({
          raceId,
          proofUrl: entry.proofUrl,
          rawResults: entry.rawResults
        });
      })
      .filter(Boolean)
  };

  return {
    racesData,
    resultsData
  };
}

const RoundManager = (() => {
  const rounds = [];
  const listeners = [];
  const resultsCache = new Map();
  let selectedRound = null;

  async function loadRoundsConfig() {
    const configResponse = await cacheBustedFetch('data/rounds.json');
    if (!configResponse.ok) {
      throw new Error(`Failed to load ${configResponse.url}`);
    }
    const configs = await configResponse.json();
    if (!Array.isArray(configs) || !configs.length) {
      throw new Error('No round configurations found');
    }
    const enriched = await Promise.all(
      configs.map(async (config) => {
        const teamsData = await loadRoundTeams(config.directory);
        const roundBundle = await loadRoundBundle(config.directory, config);
        const racesData = roundBundle.racesData;
        const roundTitle =
          racesData && racesData.round && racesData.round.title;
        const label = roundTitle || config.label || config.id;
        const earliestUpcoming = getEarliestUpcomingDate(
          racesData && racesData.races
        );
        const heroImageUrl = config.heroImage
          ? `data/rounds/${config.directory}/${config.heroImage}`
          : null;
        return {
          ...config,
          label,
          racesData,
          earliestUpcoming,
          heroImageUrl,
          teamsData,
        };
      })
    );
    const sorted = enriched.slice().sort((a, b) => {
      const aTime = getRoundStartTimestamp(a);
      const bTime = getRoundStartTimestamp(b);
      if (bTime === aTime) {
        return 0;
      }
      return bTime - aTime;
    });
    rounds.length = 0;
    rounds.push(...sorted);
    selectedRound = pickDefaultRound(rounds, readStoredRoundId());
    notifyListeners();
    return selectedRound;
  }

  function notifyListeners() {
    if (!selectedRound) return;
    listeners.forEach((listener) => {
      try {
        listener(selectedRound);
      } catch (err) {
        console.error('Round listener error', err);
      }
    });
  }

  async function selectRound(roundId) {
    await whenReady();
    const round = rounds.find((entry) => entry.id === roundId);
    if (!round || (selectedRound && selectedRound.id === round.id)) {
      return round;
    }
    selectedRound = round;
    const activeRound = rounds.find((entry) => entry.active);
    persistSelectedRoundId(round.id, activeRound ? activeRound.id : null);
    notifyListeners();
    return round;
  }

  async function loadResultsForRound(roundId) {
    await whenReady();
    const id = roundId || (selectedRound ? selectedRound.id : null);
    if (!id) {
      throw new Error('No round selected');
    }
    if (resultsCache.has(id)) {
      return resultsCache.get(id);
    }
    const round = rounds.find((entry) => entry.id === id);
    if (!round) {
      throw new Error(`Round not found: ${id}`);
    }
    const roundBundle = await loadRoundBundle(round.directory, round);
    resultsCache.set(id, roundBundle.resultsData);
    return roundBundle.resultsData;
  }

  function getRounds() {
    return rounds.slice();
  }

  function getCurrentRound() {
    return selectedRound;
  }

  function onRoundChange(callback) {
    listeners.push(callback);
    if (selectedRound) {
      callback(selectedRound);
    }
  }

  const readyPromise = (async () => {
    const round = await loadRoundsConfig();
    return round;
  })();

  async function whenReady() {
    return readyPromise;
  }

  return {
    whenReady,
    onRoundChange,
    selectRound,
    loadResults: loadResultsForRound,
    getRounds,
    getCurrentRound
  };
})();

window.RoundManager = RoundManager;
window.RoundDataLoader = {
  loadRoundBundle
};

function initRoundSelector() {
  const select = document.getElementById('round-select');
  if (!select) return;
  RoundManager.whenReady().then(() => {
    const rounds = RoundManager.getRounds();
    select.innerHTML = rounds
      .map(
        (round) =>
          `<option value="${round.id}">${round.label || round.id}</option>`
      )
      .join('');
    select.addEventListener('change', (event) => {
      RoundManager.selectRound(event.target.value).catch((err) =>
        console.error('Failed to switch round', err)
      );
    });
    RoundManager.onRoundChange((round) => {
      if (select.value !== round.id) {
        select.value = round.id;
      }
    });
  }).catch((err) => {
    console.error('Failed to initialize rounds', err);
    select.disabled = true;
  });
}

document.addEventListener('DOMContentLoaded', initRoundSelector);

let defaultHeroBackgroundImage = '';

function updateHeroBackground(round) {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  if (!defaultHeroBackgroundImage) {
    const computedStyle = window.getComputedStyle(hero);
    defaultHeroBackgroundImage = computedStyle ? computedStyle.backgroundImage : hero.style.backgroundImage || '';
  }
  if (round && round.heroImageUrl) {
    hero.style.backgroundImage = `url("${round.heroImageUrl}")`;
    return;
  }
  if (defaultHeroBackgroundImage) {
    hero.style.backgroundImage = defaultHeroBackgroundImage;
  } else {
    hero.style.removeProperty('background-image');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  RoundManager.whenReady()
    .then(() => {
      RoundManager.onRoundChange(updateHeroBackground);
    })
    .catch((err) => {
      console.error('Failed to sync the hero background', err);
    });
});
