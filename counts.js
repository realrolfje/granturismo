function cacheBustedUrl(url) {
  const stamp = Math.floor(Date.now() / 60000);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${stamp}`;
}

function cacheBustedFetch(url, options) {
  return fetch(cacheBustedUrl(url), options);
}

async function updateHeroCounts(round) {
  const raceLink = document.getElementById('race-count');
  const driverLink = document.getElementById('driver-count');
  const upcomingLink = document.getElementById('upcoming-pill');
  if (!raceLink && !driverLink && !upcomingLink) return;

  try {
    const i18n = window.I18n;
    const roundContext = await loadRoundContext(round);
    const teamsData =
      (roundContext.round && roundContext.round.teamsData) ||
      roundContext.teamsData ||
      { drivers: [] };
    const racesData = roundContext.racesData;
    const resultsData = roundContext.resultsData;

    const racesList = racesData && Array.isArray(racesData.races) ? racesData.races : [];
    if (raceLink) {
      const raceCount = racesList.length;
      raceLink.textContent = i18n ? i18n.tPlural('counts.races', raceCount) : `${raceCount} ${raceCount === 1 ? 'race' : 'races'}`;
    }

    if (driverLink || upcomingLink) {
      const driverEntries = teamsData && Array.isArray(teamsData.drivers) ? teamsData.drivers : [];
      const uniqueDrivers = new Set(driverEntries.map((d) => d.id));
      const resultsList = resultsData && Array.isArray(resultsData.results) ? resultsData.results : [];
      resultsList.forEach((race) => {
        const finishers = race.finishers && Array.isArray(race.finishers) ? race.finishers : [];
        finishers.forEach((finisher) => {
          if (finisher.driverId) {
            uniqueDrivers.add(finisher.driverId);
          }
        });
      });
      if (driverLink) {
        const count = uniqueDrivers.size;
        driverLink.textContent = i18n ? i18n.tPlural('counts.drivers', count) : `${count} ${count === 1 ? 'driver' : 'drivers'}`;
      }
      if (upcomingLink) {
        const completed = new Set(resultsList.map((race) => race.raceId));
        const upcomingCount = racesList.filter((race) => !completed.has(race.id)).length;
        if (i18n) {
          upcomingLink.textContent = upcomingCount
            ? i18n.t('nav.upcomingCount', { count: upcomingCount })
            : i18n.t('nav.upcoming');
        } else {
          upcomingLink.textContent = upcomingCount ? `Upcoming Races (${upcomingCount})` : 'Upcoming Races';
        }
      }
    }
  } catch (err) {
    console.error('Unable to update header counts', err);
  }
}

async function loadRoundContext(round) {
  if (typeof RoundManager !== 'undefined') {
    const contextRound = round || (await resolveRoundContext());
    const resultsData = await RoundManager.loadResults(contextRound.id);
    return {
      round: contextRound,
      racesData: contextRound.racesData,
      resultsData,
      teamsData: contextRound.teamsData || { drivers: [], teams: [] }
    };
  }
  return fetchFallbackRoundContext();
}

async function resolveRoundContext(round) {
  if (round) return round;
  if (typeof RoundManager === 'undefined') {
    throw new Error('RoundManager is not available');
  }
  await RoundManager.whenReady();
  const currentRound = RoundManager.getCurrentRound();
  if (!currentRound) {
    throw new Error('No round selected');
  }
  return currentRound;
}

document.addEventListener('DOMContentLoaded', () => {
  const i18n = window.I18n;
  const ready = i18n ? i18n.whenReady() : Promise.resolve();
  ready
    .then(() => {
      updateHeroCounts().catch((err) => console.error('Unable to update hero counts', err));
      if (typeof RoundManager !== 'undefined') {
        RoundManager.whenReady()
          .then(() => {
            RoundManager.onRoundChange((round) => {
              updateHeroCounts(round).catch((err) => console.error('Unable to update hero counts', err));
            });
          })
          .catch((err) => {
            console.error('Unable to sync counts with round changes', err);
          });
      }
    })
    .catch((err) => console.error('Unable to initialize translations', err));

  document.addEventListener('i18n:change', () => {
    updateHeroCounts().catch((err) => console.error('Unable to update hero counts', err));
  });
});

async function fetchFallbackRoundContext() {
  const roundsRes = await cacheBustedFetch('data/rounds.json');
  if (!roundsRes.ok) {
    throw new Error(`Failed to load ${roundsRes.url}`);
  }
  const rounds = await roundsRes.json();
  const activeConfig = (Array.isArray(rounds) ? rounds[0] : null) || {};
  if (!activeConfig.directory) {
    throw new Error('No round configuration found');
  }
  const [racesRes, resultsRes, teamsRes] = await Promise.all([
    cacheBustedFetch(`data/rounds/${activeConfig.directory}/races.json`),
    cacheBustedFetch(`data/rounds/${activeConfig.directory}/results.json`),
    cacheBustedFetch(`data/rounds/${activeConfig.directory}/teams.json`)
  ]);
  [racesRes, resultsRes, teamsRes].forEach((res) => {
    if (!res.ok) {
      throw new Error(`Failed to load ${res.url}`);
    }
  });
  const [racesData, resultsData, teamsData] = await Promise.all([
    racesRes.json(),
    resultsRes.json(),
    teamsRes.json()
  ]);
  const round = {
    id: (racesData && racesData.round && racesData.round.id) || activeConfig.id,
    label: (racesData && racesData.round && racesData.round.title) || activeConfig.label || activeConfig.id,
    directory: activeConfig.directory,
    racesData,
    teamsData
  };
  return {
    round,
    racesData,
    resultsData,
    teamsData: teamsData || { drivers: [], teams: [] }
  };
}
