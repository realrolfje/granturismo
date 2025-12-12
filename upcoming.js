async function loadUpcomingData() {
  const [racesRes, resultsRes] = await Promise.all([
    fetch('data/races.json'),
    fetch('data/results.json')
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

  upcoming.forEach((race) => {
    const card = document.createElement('article');
    card.className = 'upcoming-card';
    const header = document.createElement('header');
    header.innerHTML = `
      <p class="eyebrow">${buildTrackLabel(race)}</p>
      <h3>${race.title || race.id}</h3>
    `;
    card.appendChild(header);

    const list = document.createElement('ul');
    const rows = [
      { label: 'Date', value: formatDate(race.date) },
      { label: 'Laps', value: race.laps ?? 'TBC' }
    ];

    definitions.forEach((field) => {
      const value = race[field.id];
      if (value === undefined || value === null || value === '') return;
      let formatted = value;
      if (typeof field.format === 'function') {
        formatted = field.format(value);
      } else if (Array.isArray(value)) {
        formatted = value.join(', ');
      }
      rows.push({
        label: field.displayLabel || field.label,
        value: formatted || 'TBC'
      });
    });

    rows.forEach(({ label, value }) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      list.appendChild(li);
    });

    card.appendChild(list);
    container.appendChild(card);
  });
}

async function initUpcomingPage() {
  try {
    const { racesData, resultsData } = await loadUpcomingData();
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
