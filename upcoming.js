async function loadLegacyUpcomingData() {
  return fetchDefaultRoundFiles();
}

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

function formatDate(dateStr) {
  if (!dateStr) return 'Date TBC';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildTrackLabel(race) {
  if (!race.track) return 'Track TBC';
  return race.variant ? `${race.track} • ${race.variant}` : race.track;
}

function getValueLabel(field = {}, value) {
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

function formatFieldValue(field, value) {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value) && !value.length) return undefined;
  const mapped = getValueLabel(field, value);
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

function renderUpcoming(races = [], completedSet = new Set()) {
  const container = document.getElementById('upcoming-container');
  const pill = document.getElementById('upcoming-pill');
  if (!container) return;
  container.textContent = '';

  const upcoming = (races || []).filter((race) => !completedSet.has(race.id));
  upcoming.sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
    const timeB = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  });

  const pillText = upcoming.length ? `Upcoming Races (${upcoming.length})` : 'Upcoming Races';
  if (pill) {
    pill.setAttribute('data-count', upcoming.length);
    pill.textContent = pillText;
  }

  if (!upcoming.length) {
    container.innerHTML = '<p class="muted">All scheduled races already have results. Stay tuned for new events.</p>';
    return;
  }

  const definitions = window.raceFieldDefinitions || [];
  const definitionMap = new Map(definitions.map((field) => [field.id, field]));
  const fieldGroups = window.raceFieldGroups || [];

  upcoming.forEach((race) => {
    const card = document.createElement('article');
    card.className = 'upcoming-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-expanded', 'false');

    const summary = document.createElement('div');
    summary.className = 'upcoming-card__summary';
    const titleButton = document.createElement('button');
    titleButton.type = 'button';
    titleButton.className = 'upcoming-card__title-btn';
    titleButton.textContent = race.title || race.id;
    const title = document.createElement('h3');
    title.appendChild(titleButton);

    const meta = document.createElement('div');
    meta.className = 'upcoming-card__meta';

    const trackSpan = document.createElement('span');
    trackSpan.textContent = buildTrackLabel(race);
    const dateSpan = document.createElement('span');
    dateSpan.textContent = formatDate(race.date);

    meta.appendChild(trackSpan);
    meta.appendChild(dateSpan);

    summary.appendChild(title);
    summary.appendChild(meta);

    const details = document.createElement('div');
    details.className = 'upcoming-card__details';

    const detailGroups = [
      {
        label: 'Event Basics',
        rows: [
          { label: 'Title', value: race.title || race.id || 'TBC' },
          { label: 'Date', value: formatDate(race.date) }
        ]
      },
      {
        label: 'Track Details',
        rows: [{ label: 'Track', value: buildTrackLabel(race) }]
      }
    ];

    const dynamicGroups = fieldGroups
      .map((group) => {
        const rows = [];
        (group.fields || []).forEach((field) => {
          const definition = definitionMap.get(field.id) || field;
          const value = race[field.id];
          const formatted = formatFieldValue(definition, value);
          if (formatted === undefined || formatted === '') return;
          rows.push({
            label: definition.displayLabel || definition.label,
            value: formatted === undefined || formatted === '' ? 'TBC' : formatted
          });
        });
        if (!rows.length) return null;
        return { label: group.label, rows };
      })
      .filter(Boolean);

    detailGroups.push(...dynamicGroups);

    detailGroups
      .filter((group) => Array.isArray(group.rows) && group.rows.length)
      .forEach((group) => {
        const groupWrapper = document.createElement('div');
        groupWrapper.className = 'upcoming-detail-group';
        const heading = document.createElement('h4');
        heading.className = 'upcoming-detail-group__title';
        heading.textContent = group.label;
        groupWrapper.appendChild(heading);
        const list = document.createElement('ul');
        group.rows.forEach(({ label, value }) => {
          const li = document.createElement('li');
          li.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
          list.appendChild(li);
        });
        groupWrapper.appendChild(list);
        details.appendChild(groupWrapper);
      });

    const toggleDetails = () => {
      const expanded = card.getAttribute('aria-expanded') === 'true';
      card.setAttribute('aria-expanded', String(!expanded));
      details.hidden = expanded;
    };

    summary.addEventListener('click', toggleDetails);
    summary.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleDetails();
      }
    });

    details.hidden = true;
    card.appendChild(summary);
    card.appendChild(details);
    container.appendChild(card);
  });
}

async function renderUpcomingForRound(round) {
  if (!round) return;
  try {
    const resultsData = await RoundManager.loadResults(round.id);
    const completed = new Set((resultsData.results || []).map((race) => race.raceId));
    renderUpcoming(round.racesData?.races, completed);
  } catch (err) {
    console.error(err);
    const container = document.getElementById('upcoming-container');
    if (container) {
      container.innerHTML = '<p class="error">Unable to load race schedule. Please try again later.</p>';
    }
  }
}

async function initUpcomingPage() {
  try {
    if (typeof RoundManager !== 'undefined') {
      await RoundManager.whenReady();
      RoundManager.onRoundChange((round) => {
        renderUpcomingForRound(round);
      });
      return;
    }

    const { racesData, resultsData } = await loadLegacyUpcomingData();
    const completed = new Set((resultsData.results || []).map((race) => race.raceId));
    renderUpcoming(racesData.races, completed);
  } catch (err) {
    console.error(err);
    const container = document.getElementById('upcoming-container');
    if (container) {
      container.innerHTML = '<p class="error">Unable to load race schedule. Please try again later.</p>';
    }
  }
}

document.addEventListener('DOMContentLoaded', initUpcomingPage);
