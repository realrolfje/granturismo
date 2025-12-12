async function loadData() {
  const endpoints = [
    fetch('data/teams.json'),
    fetch('data/races.json'),
    fetch('data/results.json'),
    fetch('data/points.json')
  ];

  const responses = await Promise.all(endpoints);

  responses.forEach((res) => {
    if (!res.ok) {
      throw new Error(`Failed to load ${res.url}`);
    }
  });

  const [teams, races, results, points] = await Promise.all(responses.map((res) => res.json()));
  return { teams, races, results, points };
}

function mapById(items = []) {
  return items.reduce((map, item) => {
    if (item.id) {
      map.set(item.id, item);
    }
    return map;
  }, new Map());
}

function buildDriverTeamMap(teams = []) {
  const driverTeams = new Map();
  teams.forEach((team) => {
    (team.drivers || []).forEach((driverId) => {
      driverTeams.set(driverId, team);
    });
  });
  return driverTeams;
}

function pickTextColor(hexColor, { light = '#ffffff', dark = '#0b0d17' } = {}) {
  if (typeof hexColor !== 'string') return dark;
  const hex = hexColor.trim().replace('#', '');
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) {
    return dark;
  }
  const normalized = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const [rLin, gLin, bLin] = [r, g, b].map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  );
  const luminance = 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  return luminance > 0.55 ? dark : light;
}

function resolvePosition(finisher, index) {
  if (Number.isFinite(finisher?.position) && finisher.position > 0) {
    return finisher.position;
  }
  return index + 1;
}

function getPointsForPosition(position, pointsRules = {}) {
  if (!Number.isFinite(position) || position <= 0) return 0;
  const { pointsPerPosition = [], participationPoints = 0 } = pointsRules;
  if (position <= pointsPerPosition.length) {
    return pointsPerPosition[position - 1];
  }
  return participationPoints;
}

function computeDriverStandings({ raceResults = {}, pointsRules = {}, drivers = [] }) {
  const statsMap = new Map();

  (raceResults.results || []).forEach((race, raceIndex) => {
    (race.finishers || []).forEach((finisher, index) => {
      if (!finisher.driverId) return;
      const position = resolvePosition(finisher, index);
      const entry = statsMap.get(finisher.driverId) || {
        driverId: finisher.driverId,
        points: 0,
        wins: 0,
        races: 0,
        bestFinish: Infinity,
        bestFinishOrder: undefined,
        breakdown: []
      };

      const pointsEarned = getPointsForPosition(position, pointsRules);
      entry.points += pointsEarned;
      entry.races += 1;
      const normalizedPosition = Number.isFinite(position) ? position : Infinity;
      const currentBest = Number.isFinite(entry.bestFinish) ? entry.bestFinish : Infinity;
      if (normalizedPosition < currentBest) {
        entry.bestFinish = normalizedPosition;
        entry.bestFinishOrder = raceIndex;
      } else if (
        normalizedPosition === currentBest &&
        !Number.isFinite(entry.bestFinishOrder) &&
        Number.isFinite(normalizedPosition)
      ) {
        entry.bestFinishOrder = raceIndex;
      }
      if (position === 1) {
        entry.wins += 1;
      }

      entry.breakdown = entry.breakdown || [];
      entry.breakdown.push({
        raceId: race.raceId,
        position,
        points: pointsEarned
      });

      statsMap.set(finisher.driverId, entry);
    });
  });

  (drivers || []).forEach((driver) => {
    if (!statsMap.has(driver.id)) {
      statsMap.set(driver.id, {
        driverId: driver.id,
        points: 0,
        wins: 0,
        races: 0,
        bestFinish: Infinity,
        bestFinishOrder: undefined,
        breakdown: []
      });
    }
  });

  statsMap.forEach((entry) => {
    const breakdown = entry.breakdown || [];
    if (breakdown.length < 2) return;
    let dropIndex = 0;
    let minPoints = Number.isFinite(breakdown[0]?.points) ? breakdown[0].points : 0;
    breakdown.forEach((raceEntry, idx) => {
      const pts = Number.isFinite(raceEntry.points) ? raceEntry.points : 0;
      if (pts < minPoints) {
        minPoints = pts;
        dropIndex = idx;
      }
    });
    breakdown.forEach((raceEntry, idx) => {
      raceEntry.isDropped = idx === dropIndex;
    });
    entry.points -= minPoints;
  });

  const standings = Array.from(statsMap.values());
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    const bestA = Number.isFinite(a.bestFinish) ? a.bestFinish : Number.MAX_SAFE_INTEGER;
    const bestB = Number.isFinite(b.bestFinish) ? b.bestFinish : Number.MAX_SAFE_INTEGER;
    if (bestA !== bestB) return bestA - bestB;
    const bestOrderA = Number.isFinite(a.bestFinishOrder) ? a.bestFinishOrder : Number.MAX_SAFE_INTEGER;
    const bestOrderB = Number.isFinite(b.bestFinishOrder) ? b.bestFinishOrder : Number.MAX_SAFE_INTEGER;
    if (bestOrderA !== bestOrderB) return bestOrderA - bestOrderB;
    return a.driverId.localeCompare(b.driverId);
  });
  return standings;
}

function computeTeamStandings({ driverStandings = [], teams = [] }) {
  const driverTeamMap = buildDriverTeamMap(teams);
  const teamStats = new Map();

  driverStandings.forEach((driver) => {
    const team = driverTeamMap.get(driver.driverId);
    const teamKey = team?.id || 'independent';
    const entry = teamStats.get(teamKey) || {
      id: team?.id || 'independent',
      name: team?.name || 'Independent Drivers',
      color: team?.color || '#ffd166',
      points: 0,
      wins: 0
    };

    entry.points += driver.points;
    entry.wins += driver.wins;
    teamStats.set(teamKey, entry);
  });

  const standings = Array.from(teamStats.values());
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.name.localeCompare(b.name);
  });
  return standings;
}

function renderStats({ races, teamsData, raceResults }) {
  const raceCountEl = document.getElementById('race-count');
  const driverCountEl = document.getElementById('driver-count');
  const upcomingLink = document.getElementById('upcoming-pill');

  const uniqueRaceCount = races?.races?.length ?? 0;
  const uniqueDrivers = new Set((teamsData.drivers || []).map((d) => d.id));
  (raceResults.results || []).forEach((race) => {
    (race.finishers || []).forEach((finisher) => {
      if (finisher.driverId) {
        uniqueDrivers.add(finisher.driverId);
      }
    });
  });

  if (raceCountEl) {
    raceCountEl.textContent = `${uniqueRaceCount} ${uniqueRaceCount === 1 ? 'race' : 'races'}`;
  }
  if (driverCountEl) {
    driverCountEl.textContent = `${uniqueDrivers.size} ${uniqueDrivers.size === 1 ? 'driver' : 'drivers'}`;
  }

  if (upcomingLink) {
    const completed = new Set((raceResults.results || []).map((race) => race.raceId));
    const upcomingCount = (races?.races || []).filter((race) => !completed.has(race.id)).length;
    upcomingLink.textContent = upcomingCount ? `Upcoming Races (${upcomingCount})` : 'Upcoming Races';
  }
}

function renderTeams({ teams, drivers }) {
  const container = document.getElementById('teams-list');
  const template = document.getElementById('team-card-template');
  if (!container || !template) return;
  container.textContent = '';

  const driverTeams = buildDriverTeamMap(teams);
  const driverMap = mapById(drivers || []);
  const assignedDriverIds = new Set(driverTeams.keys());
  const freeAgents = (drivers || []).filter((driver) => !assignedDriverIds.has(driver.id));

  teams.forEach((team, index) => {
    const instance = template.content.firstElementChild.cloneNode(true);

    const tag = instance.querySelector('.team-card__tag');
    tag.textContent = team.name;
    tag.style.background = team.color || '#f2f2f2';
    tag.style.color = pickTextColor(team.color || '#f2f2f2');

    const list = instance.querySelector('.team-card__drivers');
    (team.drivers || []).forEach((driverId) => {
      const driver = driverMap.get(driverId);
      const li = document.createElement('li');
      li.textContent = driver ? driver.name : driverId;
      list.appendChild(li);
    });

    container.appendChild(instance);
  });

  if (freeAgents.length) {
    const instance = template.content.firstElementChild.cloneNode(true);
    const tag = instance.querySelector('.team-card__tag');
    tag.textContent = 'Independent Drivers';
    tag.style.background = '#cdd6f4';
    tag.style.color = pickTextColor('#cdd6f4');

    const list = instance.querySelector('.team-card__drivers');
    freeAgents.forEach((driver) => {
      const li = document.createElement('li');
      li.textContent = driver.name;
      list.appendChild(li);
    });

    container.appendChild(instance);
  }
}

function renderStandings({ driverStandings, teamStandings, drivers, races }) {
  const driverBody = document.getElementById('driver-standings-body');
  const teamBody = document.getElementById('team-standings-body');
  if (!driverBody || !teamBody) return;
  const driverMap = mapById(drivers || []);
  const raceMap = mapById(races?.races || []);
  driverBody.textContent = '';
  teamBody.textContent = '';

  driverStandings.forEach((entry, index) => {
    const driver = driverMap.get(entry.driverId);
    const rowId = `driver-${entry.driverId}`;
    const tr = document.createElement('tr');
    tr.classList.add('expandable-row');
    tr.setAttribute('data-driver-id', entry.driverId);
    tr.setAttribute('aria-expanded', 'false');
    tr.setAttribute('tabindex', '0');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div class="driver-row__header">
          <span>${driver?.name || entry.driverId}</span>
          <button class="driver-row__toggle" aria-label="Toggle breakdown for ${
            driver?.name || entry.driverId
          }" aria-expanded="false" aria-controls="${rowId}-details">Details</button>
        </div>
      </td>
      <td>${entry.points}</td>
      <td>${entry.wins}</td>
    `;

    const detailsTr = document.createElement('tr');
    detailsTr.classList.add('driver-row__details');
    detailsTr.id = `${rowId}-details`;
    detailsTr.setAttribute('aria-hidden', 'true');
    const breakdownRows = (entry.breakdown || []).map((raceEntry) => {
      const raceMeta = raceMap.get(raceEntry.raceId);
      const raceName = raceMeta?.title || raceEntry.raceId;
      const positionText = raceEntry.position ? `P${raceEntry.position}` : 'NC';
      const rowClass = raceEntry.isDropped
        ? 'driver-row__details-row driver-row__details-row--dropped'
        : 'driver-row__details-row';
      return `
        <tr class="${rowClass}">
          <td>${raceName}</td>
          <td>${positionText}</td>
          <td>${raceEntry.points} pts</td>
        </tr>
      `;
    });

    detailsTr.innerHTML = `
      <td colspan="4">
        <div class="driver-row__details-wrapper">
          <table>
            <thead>
              <tr>
                <th scope="col">Race</th>
                <th scope="col">Finish</th>
                <th scope="col">Points</th>
              </tr>
            </thead>
            <tbody>
              ${breakdownRows.join('') || '<tr><td colspan="3">No races yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </td>
    `;

    const toggle = tr.querySelector('.driver-row__toggle');
    const toggleRow = () => {
      const expanded = tr.getAttribute('aria-expanded') === 'true';
      tr.setAttribute('aria-expanded', String(!expanded));
      toggle.setAttribute('aria-expanded', String(!expanded));
      detailsTr.setAttribute('aria-hidden', String(expanded));
      detailsTr.classList.toggle('driver-row__details--open', !expanded);
    };

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleRow();
    });

    tr.addEventListener('click', (event) => {
      if (event.target instanceof HTMLElement && event.target.closest('button')) {
        return;
      }
      toggleRow();
    });

    tr.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleRow();
      }
    });

    driverBody.appendChild(tr);
    driverBody.appendChild(detailsTr);
  });

  teamStandings.forEach((entry, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div class="team-row">
          <span class="team-chip" style="background:${entry.color}"></span>
          <span>${entry.name}</span>
        </div>
      </td>
      <td>${entry.points}</td>
      <td>${entry.wins}</td>
    `;
    teamBody.appendChild(tr);
  });

  const driverLeader = driverStandings.find((entry) => entry.races > 0);
  const teamLeader = teamStandings.find((entry) => entry.points > 0);

  const driverLeaderName = document.getElementById('driver-leader-name');
  const driverLeaderPoints = document.getElementById('driver-leader-points');
  const teamLeaderName = document.getElementById('team-leader-name');
  const teamLeaderPoints = document.getElementById('team-leader-points');

  if (driverLeaderName && driverLeaderPoints) {
    if (driverLeader) {
      const leaderDriver = driverMap.get(driverLeader.driverId);
      driverLeaderName.textContent = leaderDriver?.name || driverLeader.driverId;
      driverLeaderPoints.textContent = `${driverLeader.points} pts • ${driverLeader.wins} wins`;
    } else {
      driverLeaderName.textContent = 'TBD';
      driverLeaderPoints.textContent = 'Awaiting race results';
    }
  }

  if (teamLeaderName && teamLeaderPoints) {
    if (teamLeader) {
      teamLeaderName.textContent = teamLeader.name;
      teamLeaderPoints.textContent = `${teamLeader.points} pts • ${teamLeader.wins} wins`;
    } else {
      teamLeaderName.textContent = 'TBD';
      teamLeaderPoints.textContent = 'Awaiting race results';
    }
  }
}

function renderPointsRule(pointsRules = {}) {
  const textEl = document.getElementById('points-rule-text');
  if (!textEl) return;
  const pointsList = pointsRules.pointsPerPosition || [];
  const breakdown = pointsList.length ? pointsList.join(' - ') : 'Custom series';
  const participation = pointsRules.participationPoints ?? 0;
  textEl.textContent = `Points: ${breakdown} with minimum ${participation} point${
    participation === 1 ? '' : 's'
  } for every classified finisher.`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Date TBC';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderRaces({ racesMeta, raceResults, drivers, teams }) {
  const container = document.getElementById('races-container');
  const template = document.getElementById('race-card-template');
  if (!container || !template) return;
  container.textContent = '';

  const raceMap = mapById(racesMeta.races || []);
  const driverMap = mapById(drivers || []);
  const teamMap = mapById(teams || []);

  (raceResults.results || []).forEach((race) => {
    const meta = raceMap.get(race.raceId) || {};
    const instance = template.content.firstElementChild.cloneNode(true);
    const trackLabel = meta.variant ? `${meta.track} • ${meta.variant}` : meta.track || 'Custom Track';
    instance.querySelector('.eyebrow').textContent = trackLabel;
    instance.querySelector('h3').textContent = meta.title || `Race ${race.raceId}`;
    instance.querySelector('.race-card__meta').textContent = `${formatDate(meta.date)} • ${meta.laps ? `${meta.laps} laps` : 'Lap count TBC'}`;

    const tbody = instance.querySelector('tbody');
    (race.finishers || []).forEach((finisher, index) => {
      const driver = driverMap.get(finisher.driverId);
      const driverName = driver?.name || finisher.driverId;
      const team = finisher.teamId ? teamMap.get(finisher.teamId) : null;
      const position = resolvePosition(finisher, index);

      const tr = document.createElement('tr');

      const badgeColor = team?.color || '#ffd166';
      const badgeTextColor = pickTextColor(badgeColor);

      tr.innerHTML = `
        <td>${position}</td>
        <td>${driverName}</td>
        <td>${finisher.car}</td>
        <td>
          ${
            team
              ? `<span class="badge" style="background:${badgeColor};color:${badgeTextColor}">${team.name}</span>`
              : '<span class="badge" style="background:#ffd166;color:#0b0d17">Privateer</span>'
          }
        </td>
      `;

      tbody.appendChild(tr);
    });

    container.appendChild(instance);
  });
}

function showError(message) {
  const container = document.getElementById('races-container');
  if (container) {
    container.innerHTML = `<div class="error">${message}</div>`;
  }
}

async function init() {
  try {
    const data = await loadData();
    renderStats({ races: data.races, teamsData: data.teams, raceResults: data.results });
    const driverStandings = computeDriverStandings({
      raceResults: data.results,
      pointsRules: data.points,
      drivers: data.teams.drivers
    });
    const teamStandings = computeTeamStandings({
      driverStandings,
      teams: data.teams.teams
    });
    renderPointsRule(data.points);
    renderStandings({
      driverStandings,
      teamStandings,
      drivers: data.teams.drivers,
      races: data.races
    });
    renderTeams({ teams: data.teams.teams, drivers: data.teams.drivers });
    renderRaces({
      racesMeta: data.races,
      raceResults: data.results,
      drivers: data.teams.drivers,
      teams: data.teams.teams
    });
  } catch (err) {
    console.error(err);
    showError('Unable to load the race data. Please verify the JSON files.');
  }
}

document.addEventListener('DOMContentLoaded', init);
