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

const SELECTED_ROUND_STORAGE_KEY = 'gt7-selected-round';

function readStoredRoundId() {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(SELECTED_ROUND_STORAGE_KEY);
  } catch (err) {
    console.warn('Unable to read stored round', err);
    return null;
  }
}

function persistSelectedRoundId(roundId) {
  if (!roundId) return;
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return;
    }
    window.localStorage.setItem(SELECTED_ROUND_STORAGE_KEY, roundId);
  } catch (err) {
    console.warn('Unable to persist selected round', err);
  }
}

function pickDefaultRound(rounds = [], preferredId) {
  if (!rounds.length) return null;
  if (preferredId) {
    const preferred = rounds.find((round) => round.id === preferredId);
    if (preferred) {
      return preferred;
    }
  }
  const activeRound = rounds.find((round) => round.active);
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
  const response = await fetch(roundTeamsUrl);
  if (!response.ok) {
    throw new Error(`Failed to load ${response.url}`);
  }
  return response.json();
}

const RoundManager = (() => {
  const rounds = [];
  const listeners = [];
  const resultsCache = new Map();
  let selectedRound = null;

  async function loadRoundsConfig() {
    const configResponse = await fetch('data/rounds.json');
    if (!configResponse.ok) {
      throw new Error(`Failed to load ${configResponse.url}`);
    }
    const configs = await configResponse.json();
    if (!Array.isArray(configs) || !configs.length) {
      throw new Error('No round configurations found');
    }
    const enriched = await Promise.all(
      configs.map(async (config) => {
        const racesUrl = `data/rounds/${config.directory}/races.json`;
        const racesResponse = await fetch(racesUrl);
        if (!racesResponse.ok) {
          throw new Error(`Failed to load ${racesUrl}`);
        }
        const teamsData = await loadRoundTeams(config.directory);
        const racesData = await racesResponse.json();
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
    persistSelectedRoundId(round.id);
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
    const url = `data/rounds/${round.directory}/results.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}`);
    }
    const data = await response.json();
    resultsCache.set(id, data);
    return data;
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
