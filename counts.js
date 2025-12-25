async function updateHeroCounts(round) {
  const raceLink = document.getElementById('race-count');
  const driverLink = document.getElementById('driver-count');
  const upcomingLink = document.getElementById('upcoming-pill');
  if (!raceLink && !driverLink && !upcomingLink) return;

  try {
    const [teamsRes, roundContext] = await Promise.all([
      fetch('data/teams.json'),
      loadRoundContext(round)
    ]);

    if (!teamsRes.ok) {
      throw new Error(`Failed to load ${teamsRes.url}`);
    }

    const teamsData = await teamsRes.json();
    const racesData = roundContext.racesData;
    const resultsData = roundContext.resultsData;

    const racesList = racesData && Array.isArray(racesData.races) ? racesData.races : [];
    if (raceLink) {
      const raceCount = racesList.length;
      raceLink.textContent = `${raceCount} ${raceCount === 1 ? 'race' : 'races'}`;
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
        driverLink.textContent = `${uniqueDrivers.size} ${uniqueDrivers.size === 1 ? 'driver' : 'drivers'}`;
      }
      if (upcomingLink) {
        const completed = new Set(resultsList.map((race) => race.raceId));
        const upcomingCount = racesList.filter((race) => !completed.has(race.id)).length;
        upcomingLink.textContent = upcomingCount ? `Upcoming Races (${upcomingCount})` : 'Upcoming Races';
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
      resultsData
    };
  }
  return fetchDefaultRoundFiles();
}

async function resolveRoundContext(round) {
  if (round) return round;
  await RoundManager.whenReady();
  const currentRound = RoundManager.getCurrentRound();
  if (!currentRound) {
    throw new Error('No round selected');
  }
  return currentRound;
}

document.addEventListener('DOMContentLoaded', () => {
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
});

async function fetchDefaultRoundFiles() {
  const roundsRes = await fetch('data/rounds.json');
  if (!roundsRes.ok) {
    throw new Error(`Failed to load ${roundsRes.url}`);
  }
  const rounds = await roundsRes.json();
  const active = (Array.isArray(rounds) ? rounds[0] : null) || {};
  if (!active.directory) {
    throw new Error('No round configuration found');
  }
  const [racesRes, resultsRes] = await Promise.all([
    fetch(`data/rounds/${active.directory}/races.json`),
    fetch(`data/rounds/${active.directory}/results.json`)
  ]);
  [racesRes, resultsRes].forEach((res) => {
    if (!res.ok) {
      throw new Error(`Failed to load ${res.url}`);
    }
  });
  const [racesData, resultsData] = await Promise.all([racesRes.json(), resultsRes.json()]);
  return { racesData, resultsData };
}
