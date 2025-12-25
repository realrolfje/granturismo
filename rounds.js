function getEarliestUpcomingDate(races = []) {
  const now = Date.now();
  let earliest = Infinity;
  (races || []).forEach((race) => {
    if (!race?.date) return;
    const timestamp = new Date(race.date).getTime();
    if (!Number.isFinite(timestamp)) return;
    if (timestamp >= now && timestamp < earliest) {
      earliest = timestamp;
    }
  });
  return earliest;
}

function pickDefaultRound(rounds = []) {
  if (!rounds.length) return null;
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
        const racesData = await racesResponse.json();
        const label = racesData?.round?.title || config.label || config.id;
        const earliestUpcoming = getEarliestUpcomingDate(racesData?.races);
        return {
          ...config,
          label,
          racesData,
          earliestUpcoming
        };
      })
    );
    rounds.push(...enriched);
    selectedRound = pickDefaultRound(rounds);
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
    notifyListeners();
    return round;
  }

  async function loadResultsForRound(roundId) {
    await whenReady();
    const id = roundId || selectedRound?.id;
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
