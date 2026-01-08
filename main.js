let sharedDataPromise;

function cacheBustedUrl(url) {
  const stamp = Math.floor(Date.now() / 60000);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${stamp}`;
}

function cacheBustedFetch(url, options) {
  return fetch(cacheBustedUrl(url), options);
}

function loadSharedData() {
  if (sharedDataPromise) return sharedDataPromise;
  sharedDataPromise = (async () => {
    const pointsResponse = await cacheBustedFetch('data/points.json');
    if (!pointsResponse.ok) {
      throw new Error(`Failed to load ${pointsResponse.url}`);
    }
    const points = await pointsResponse.json();
    return { points };
  })();
  return sharedDataPromise;
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

function hexToRGBA(hexColor = '#ffffff', alpha = 1) {
  const hex = hexColor.trim().replace('#', '');
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) return `rgba(255, 255, 255, ${alpha})`;
  const normalized = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.padEnd(6, '0');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const proofModal = document.getElementById('proof-modal');
const proofModalImage = proofModal ? proofModal.querySelector('.proof-modal__image') : null;
const proofModalClose = proofModal ? proofModal.querySelector('.proof-modal__close') : null;

function closeProofModal() {
  if (!proofModal) return;
  proofModal.hidden = true;
  document.body.classList.remove('proof-modal-open');
  if (proofModalImage) {
    proofModalImage.removeAttribute('src');
    proofModalImage.alt = '';
  }
}

function openProofModal(url, title = 'Race proof') {
  if (!proofModal || !proofModalImage) return;
  proofModalImage.src = url;
  proofModalImage.alt = `${title} proof screenshot`;
  proofModal.hidden = false;
  document.body.classList.add('proof-modal-open');
  if (proofModalClose) {
    proofModalClose.focus();
  }
}

if (proofModal) {
  proofModal.addEventListener('click', (event) => {
    if (event.target === proofModal) {
      closeProofModal();
    }
  });
  if (proofModalClose) {
    proofModalClose.addEventListener('click', closeProofModal);
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !proofModal.hidden) {
      closeProofModal();
    }
  });
}

function resolvePosition(finisher, index) {
  const candidatePosition = finisher ? finisher.position : undefined;
  if (Number.isFinite(candidatePosition) && candidatePosition > 0) {
    return candidatePosition;
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
    const firstEntry = breakdown[0];
    let minPoints =
      firstEntry && Number.isFinite(firstEntry.points)
        ? firstEntry.points
        : 0;
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
  const teamStats = new Map(
    (teams || [])
      .filter((team) => team && team.id)
      .map((team) => [
        team.id,
        {
          id: team.id,
          name: team.name || team.id,
          color: team.color || '#ffd166',
          points: 0,
          wins: 0,
          drivers: []
        }
      ])
  );

  driverStandings.forEach((driver) => {
    const team = driverTeamMap.get(driver.driverId);
    if (!team || !team.id) return;
    const entry = teamStats.get(team.id);
    if (!entry) return;
    entry.points += driver.points;
    entry.wins += driver.wins;
    entry.drivers.push({
      driverId: driver.driverId,
      points: driver.points,
      wins: driver.wins,
      races: driver.races
    });
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

  const uniqueRaceCount = races && races.races ? races.races.length : 0;
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
    const raceList = races && races.races ? races.races : [];
    const upcomingCount = raceList.filter((race) => !completed.has(race.id)).length;
    upcomingLink.textContent = upcomingCount ? `Upcoming Races (${upcomingCount})` : 'Upcoming Races';
  }
}

function renderTeams({ teams, drivers }) {
  const container = document.getElementById('teams-list');
  const template = document.getElementById('team-card-template');
  if (!container || !template) return;
  container.textContent = '';

  const driverMap = mapById(drivers || []);
  const teamEntries = Array.isArray(teams) ? teams : [];
  const assignedDrivers = new Set();

  teamEntries.forEach((team) => {
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
      if (driverId) {
        assignedDrivers.add(driverId);
      }
    });

    container.appendChild(instance);
  });

  const allDrivers = Array.isArray(drivers) ? drivers : [];
  const independents = allDrivers.filter((driver) => driver && driver.id && !assignedDrivers.has(driver.id));
  if (independents.length) {
    const standalone = template.content.firstElementChild.cloneNode(true);
    const tag = standalone.querySelector('.team-card__tag');
    tag.textContent = 'Independent Drivers';
    tag.style.background = '#444';
    tag.style.color = '#fff';
    const list = standalone.querySelector('.team-card__drivers');
    independents.forEach((driver) => {
      const li = document.createElement('li');
      li.textContent = driver.name || driver.id;
      list.appendChild(li);
    });
    container.appendChild(standalone);
  } else if (!teamEntries.length && allDrivers.length) {
    const standalone = template.content.firstElementChild.cloneNode(true);
    const tag = standalone.querySelector('.team-card__tag');
    tag.textContent = 'Drivers';
    const list = standalone.querySelector('.team-card__drivers');
    allDrivers.forEach((driver) => {
      const li = document.createElement('li');
      li.textContent = driver && driver.name ? driver.name : driver.id;
      list.appendChild(li);
    });
    container.appendChild(standalone);
  }
}

function renderStandings({ driverStandings = [], teamStandings = [], drivers = [], races }) {
  const driverBody = document.getElementById('driver-standings-body');
  if (!driverBody) return;
  const teamBody = document.getElementById('team-standings-body');
  const teamCard = document.getElementById('team-standings-card');
  const teamCallout = document.getElementById('team-leader-callout');
  const driverMap = mapById(drivers || []);
  const raceMap = mapById(races && races.races ? races.races : []);
  driverBody.textContent = '';
  if (teamBody) {
    teamBody.textContent = '';
  }

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
      <span class="driver-row__name">${driver && driver.name ? driver.name : entry.driverId}</span>
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
      const raceName = raceMeta && raceMeta.title ? raceMeta.title : raceEntry.raceId;
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

    if (index % 2 === 1) {
      tr.classList.add('standings-row-alt');
      detailsTr.classList.add('standings-row-alt');
    }

    const toggleRow = () => {
      const expanded = tr.getAttribute('aria-expanded') === 'true';
      tr.setAttribute('aria-expanded', String(!expanded));
      detailsTr.setAttribute('aria-hidden', String(expanded));
      detailsTr.classList.toggle('driver-row__details--open', !expanded);
    };

    tr.addEventListener('click', (event) => {
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

  const hasTeamStandings = Array.isArray(teamStandings) && teamStandings.length > 0;
  if (teamCard) {
    teamCard.hidden = !hasTeamStandings;
  }
  if (teamCallout) {
    teamCallout.hidden = !hasTeamStandings;
  }

  if (hasTeamStandings && teamBody) {
    teamStandings.forEach((entry, index) => {
      const rowId = `team-${entry.id}`;
      const teamColor = entry.color || '#ffd166';
      const pillTextColor = pickTextColor(teamColor);
      const rowTint = hexToRGBA(teamColor, 0.12);
      const tr = document.createElement('tr');
      tr.classList.add('team-row', 'team-row--tinted', 'expandable-row');
      tr.style.setProperty('--team-row-tint', rowTint);
      tr.setAttribute('data-team-id', entry.id);
      tr.setAttribute('aria-expanded', 'false');
      tr.setAttribute('tabindex', '0');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>
          <div class="team-row__header">
            <span class="team-pill" style="background:${teamColor};color:${pillTextColor}">${entry.name}</span>
          </div>
        </td>
        <td>${entry.points}</td>
        <td>${entry.wins}</td>
      `;

      const detailsTr = document.createElement('tr');
      detailsTr.classList.add('team-row__details');
      detailsTr.classList.add('team-row--tinted');
      detailsTr.style.setProperty('--team-row-tint', rowTint);
      detailsTr.id = `${rowId}-details`;
      detailsTr.setAttribute('aria-hidden', 'true');

      const driverRows = (entry.drivers || [])
        .sort((a, b) => b.points - a.points)
        .map((driverEntry) => {
          const driver = driverMap.get(driverEntry.driverId);
          return `
            <tr>
              <td>${driver && driver.name ? driver.name : driverEntry.driverId}</td>
              <td>${driverEntry.points} pts</td>
              <td>${driverEntry.wins} wins</td>
            </tr>
          `;
        });

      detailsTr.innerHTML = `
        <td colspan="4">
          <div class="team-row__details-wrapper">
            <table>
              <thead>
                <tr>
                  <th scope="col">Driver</th>
                  <th scope="col">Points</th>
                  <th scope="col">Wins</th>
                </tr>
              </thead>
              <tbody>
                ${driverRows.join('') || '<tr><td colspan="3">No drivers yet</td></tr>'}
              </tbody>
            </table>
          </div>
        </td>
      `;

      const toggleRow = () => {
        const expanded = tr.getAttribute('aria-expanded') === 'true';
        tr.setAttribute('aria-expanded', String(!expanded));
        detailsTr.setAttribute('aria-hidden', String(expanded));
        detailsTr.classList.toggle('team-row__details--open', !expanded);
      };

      tr.addEventListener('click', () => {
        toggleRow();
      });

      tr.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleRow();
        }
      });

      teamBody.appendChild(tr);
      teamBody.appendChild(detailsTr);
    });
  }

  const driverLeader = driverStandings.find((entry) => entry.races > 0);
  const teamLeader = hasTeamStandings ? teamStandings.find((entry) => entry.points > 0) : undefined;

  const driverLeaderName = document.getElementById('driver-leader-name');
  const driverLeaderPoints = document.getElementById('driver-leader-points');
  const teamLeaderName = document.getElementById('team-leader-name');
  const teamLeaderPoints = document.getElementById('team-leader-points');

  if (driverLeaderName && driverLeaderPoints) {
    if (driverLeader) {
      const leaderDriver = driverMap.get(driverLeader.driverId);
      driverLeaderName.textContent = leaderDriver && leaderDriver.name ? leaderDriver.name : driverLeader.driverId;
      driverLeaderPoints.textContent = `${driverLeader.points} pts • ${driverLeader.wins} wins`;
    } else {
      driverLeaderName.textContent = 'TBD';
      driverLeaderPoints.textContent = 'Awaiting race results';
    }
  }

  if (teamLeaderName && teamLeaderPoints) {
    if (hasTeamStandings && teamLeader) {
      teamLeaderName.textContent = teamLeader.name;
      teamLeaderPoints.textContent = `${teamLeader.points} pts • ${teamLeader.wins} wins`;
    } else if (hasTeamStandings) {
      teamLeaderName.textContent = 'TBD';
      teamLeaderPoints.textContent = 'Awaiting race results';
    } else {
      teamLeaderName.textContent = '';
      teamLeaderPoints.textContent = '';
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

function getFieldValueLabel(field = {}, value) {
  const labels = field.valueLabels;
  if (!labels || value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return undefined;
  const keys = [];
  const asString = String(value);
  keys.push(asString);
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    keys.push(String(numeric));
    keys.push(numeric.toFixed(1));
    keys.push(numeric.toFixed(2));
    keys.push(numeric.toFixed(0));
  }
  const seen = new Set();
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    if (Object.prototype.hasOwnProperty.call(labels, key)) {
      return labels[key];
    }
  }
  return undefined;
}

function formatFieldValueFromDefinition(field = {}, value) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) {
    return undefined;
  }
  const mapped = getFieldValueLabel(field, value);
  if (mapped !== undefined) return mapped;
  if (typeof field.format === 'function') {
    const result = field.format(value);
    if (field.unit && typeof result === 'number') {
      return `${result} ${field.unit}`;
    }
    return result;
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (field.unit && typeof value === 'number') {
    return `${value} ${field.unit}`;
  }
  return value;
}

function buildRaceDetailGroups(meta = {}, raceId, fieldGroups = [], definitionMap = new Map()) {
  const groups = [];
  const eventRows = [];
  if (meta.title) {
    eventRows.push({ label: 'Race Title', value: meta.title });
  }
  if (raceId) {
    eventRows.push({ label: 'Race ID', value: raceId });
  }
  eventRows.push({ label: 'Date', value: formatDate(meta.date) });
  if (eventRows.length) {
    groups.push({ label: 'Event Basics', rows: eventRows });
  }

  const trackRows = [];
  if (meta.track) {
    trackRows.push({ label: 'Track', value: meta.track });
  }
  if (meta.variant) {
    trackRows.push({ label: 'Layout', value: meta.variant });
  }
  if (trackRows.length) {
    groups.push({ label: 'Track Details', rows: trackRows });
  }

  fieldGroups.forEach((group) => {
    const rows = [];
    (group.fields || []).forEach((field) => {
      const definition = definitionMap.get(field.id) || field;
      const formatted = formatFieldValueFromDefinition(definition, meta[field.id]);
      if (formatted === undefined) return;
      rows.push({
        label: definition.displayLabel || definition.label,
        value: formatted
      });
    });
    if (rows.length) {
      groups.push({ label: group.label, rows });
    }
  });

  return groups;
}

function renderDetailGroups(container, groups = []) {
  if (!container) return;
  container.textContent = '';
  groups.forEach((group) => {
    if (!group || !Array.isArray(group.rows) || !group.rows.length) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'upcoming-detail-group';
    const heading = document.createElement('h4');
    heading.className = 'upcoming-detail-group__title';
    heading.textContent = group.label;
    wrapper.appendChild(heading);

    const list = document.createElement('ul');
    group.rows.forEach(({ label, value }) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      list.appendChild(li);
    });

    wrapper.appendChild(list);
    container.appendChild(wrapper);
  });
}

function renderRaces({ racesMeta, raceResults, drivers, teams }) {
  const container = document.getElementById('races-container');
  const template = document.getElementById('race-card-template');
  if (!container || !template) return;
  container.textContent = '';

  const raceMap = mapById(racesMeta.races || []);
  const driverMap = mapById(drivers || []);
  const teamMap = mapById(teams || []);
  const driverTeamMap = buildDriverTeamMap(teams);
  const definitionMap = new Map((window.raceFieldDefinitions || []).map((field) => [field.id, field]));
  const fieldGroups = window.raceFieldGroups || [];

  (raceResults.results || []).forEach((race) => {
    const meta = raceMap.get(race.raceId) || {};
    const instance = template.content.firstElementChild.cloneNode(true);
    const trackLabel = meta.variant ? `${meta.track} • ${meta.variant}` : meta.track || 'Custom Track';
    instance.querySelector('.eyebrow').textContent = trackLabel;
    const raceTitle = meta.title || `Race ${race.raceId}`;
    const titleButton = instance.querySelector('.race-card__title-btn');
    if (titleButton) {
      titleButton.textContent = raceTitle;
      titleButton.setAttribute('aria-expanded', 'false');
    } else {
      const fallbackTitle = instance.querySelector('h3');
      if (fallbackTitle) {
        fallbackTitle.textContent = raceTitle;
      }
    }
    instance.querySelector('.race-card__meta').textContent = `${formatDate(meta.date)} • ${meta.laps ? `${meta.laps} laps` : 'Lap count TBC'}`;
    const details = instance.querySelector('.race-card__details');
    const detailGroups = buildRaceDetailGroups(meta, race.raceId, fieldGroups, definitionMap);
    if (details && detailGroups.length) {
      const detailsId = `race-details-${race.raceId}`;
      details.id = detailsId;
      details.hidden = true;
      renderDetailGroups(details, detailGroups);
      if (titleButton) {
        titleButton.setAttribute('aria-controls', detailsId);
        titleButton.addEventListener('click', () => {
          const expanded = titleButton.getAttribute('aria-expanded') === 'true';
          const nextState = !expanded;
          titleButton.setAttribute('aria-expanded', String(nextState));
          details.hidden = !nextState;
          instance.classList.toggle('race-card--details-open', nextState);
        });
      }
    } else if (titleButton) {
      titleButton.disabled = true;
      titleButton.classList.add('race-card__title-btn--static');
    }

    const proofUrl = typeof race.proof === 'string' ? race.proof.trim() : '';
    const proofButton = instance.querySelector('.race-card__proof-btn');
    if (proofButton) {
      proofButton.hidden = false;
      proofButton.disabled = !proofUrl;
      proofButton.classList.toggle('race-card__proof-btn--disabled', !proofUrl);
      if (proofUrl) {
        proofButton.setAttribute('aria-label', `View proof for ${raceTitle}`);
        proofButton.removeAttribute('aria-disabled');
        proofButton.addEventListener('click', () => openProofModal(proofUrl, raceTitle));
      } else {
        proofButton.setAttribute('aria-disabled', 'true');
        proofButton.removeAttribute('aria-label');
      }
    }

    const tbody = instance.querySelector('tbody');
  (race.finishers || []).forEach((finisher, index) => {
      const driver = driverMap.get(finisher.driverId);
      const driverName = driver && driver.name ? driver.name : finisher.driverId;
      const derivedTeam = driverTeamMap.get(finisher.driverId);
      const team = derivedTeam || (finisher.teamId ? teamMap.get(finisher.teamId) : null);
      const position = resolvePosition(finisher, index);

      const tr = document.createElement('tr');

      const badgeColor = team && team.color ? team.color : '#ffd166';
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

async function renderRound(round) {
  if (!round) return;
  const sharedData = await loadSharedData();
  const raceResults = await RoundManager.loadResults(round.id);
  const teamsData = round.teamsData || { drivers: [], teams: [] };
  renderStats({ races: round.racesData, teamsData, raceResults });
  const driverStandings = computeDriverStandings({
    raceResults,
    pointsRules: sharedData.points,
    drivers: teamsData.drivers
  });
  const teamStandings = computeTeamStandings({
    driverStandings,
    teams: teamsData.teams
  });
  renderPointsRule(sharedData.points);
  renderStandings({
    driverStandings,
    teamStandings,
    drivers: teamsData.drivers,
    races: round.racesData
  });
  renderTeams({ teams: teamsData.teams, drivers: teamsData.drivers });
  renderRaces({
    racesMeta: round.racesData,
    raceResults,
    drivers: teamsData.drivers,
    teams: teamsData.teams
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
    await RoundManager.whenReady();
    RoundManager.onRoundChange((round) => {
      renderRound(round).catch((err) => {
        console.error(err);
        showError('Unable to load the race data for this round. Please verify the JSON files.');
      });
    });
  } catch (err) {
    console.error(err);
    showError('Unable to load the round configuration. Please verify the round data.');
  }
}

document.addEventListener('DOMContentLoaded', init);
