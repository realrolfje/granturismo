async function updateHeroCounts() {
  const raceLink = document.getElementById('race-count');
  const driverLink = document.getElementById('driver-count');
  const upcomingLink = document.getElementById('upcoming-pill');
  if (!raceLink && !driverLink && !upcomingLink) return;

  try {
    const [racesRes, teamsRes, resultsRes] = await Promise.all([
      fetch('data/races.json'),
      fetch('data/teams.json'),
      fetch('data/results.json')
    ]);

    [racesRes, teamsRes, resultsRes].forEach((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load ${res.url}`);
      }
    });

    const [racesData, teamsData, resultsData] = await Promise.all([
      racesRes.json(),
      teamsRes.json(),
      resultsRes.json()
    ]);

    if (raceLink) {
      const raceCount = racesData?.races?.length ?? 0;
      raceLink.textContent = `${raceCount} ${raceCount === 1 ? 'race' : 'races'}`;
    }

    if (driverLink || upcomingLink) {
      const uniqueDrivers = new Set((teamsData?.drivers || []).map((d) => d.id));
      (resultsData?.results || []).forEach((race) => {
        (race.finishers || []).forEach((finisher) => {
          if (finisher.driverId) {
            uniqueDrivers.add(finisher.driverId);
          }
        });
      });
      if (driverLink) {
        driverLink.textContent = `${uniqueDrivers.size} ${uniqueDrivers.size === 1 ? 'driver' : 'drivers'}`;
      }
      if (upcomingLink) {
        const completed = new Set((resultsData?.results || []).map((race) => race.raceId));
        const upcomingCount = (racesData?.races || []).filter((race) => !completed.has(race.id)).length;
        upcomingLink.textContent = upcomingCount ? `Upcoming Races (${upcomingCount})` : 'Upcoming Races';
      }
    }
  } catch (err) {
    console.error('Unable to update header counts', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateHeroCounts();
});
