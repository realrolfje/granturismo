async function loadEditorData() {
  const [tracksRes, racesRes] = await Promise.all([
    fetch('data/tracks.json'),
    fetch('data/races.json')
  ]);

  [tracksRes, racesRes].forEach((res) => {
    if (!res.ok) {
      throw new Error(`Failed to load ${res.url}`);
    }
  });

  const [tracksData, racesData] = await Promise.all([tracksRes.json(), racesRes.json()]);
  return { tracks: tracksData.tracks || [], races: racesData.races || [] };
}

function populateTrackSelect(tracks) {
  const trackInput = document.getElementById('track-input');
  const trackValue = document.getElementById('track-value');
  const suggestionsList = document.getElementById('track-suggestions');
  const variantSelect = document.getElementById('variant-select');
  if (!trackInput || !trackValue || !suggestionsList || !variantSelect) return;

  const renderSuggestions = (items = []) => {
    suggestionsList.textContent = '';
    if (!items.length) {
      suggestionsList.hidden = true;
      trackInput.setAttribute('aria-expanded', 'false');
      return;
    }

    items.slice(0, 8).forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name;
      li.tabIndex = 0;
      li.addEventListener('mousedown', (event) => {
        event.preventDefault();
        selectTrack(name);
      });
      suggestionsList.appendChild(li);
    });
    suggestionsList.hidden = false;
    trackInput.setAttribute('aria-expanded', 'true');
  };

  const selectTrack = (name) => {
    trackInput.value = name;
    trackValue.value = name;
    renderSuggestions([]);
    updateVariants();
  };

  const updateVariants = () => {
    const query = trackInput.value.trim().toLowerCase();
    const selected = tracks.find((t) => t.name.toLowerCase() === query);

    variantSelect.textContent = '';
    if (!selected) {
      trackValue.value = '';
      variantSelect.disabled = true;
      variantSelect.removeAttribute('required');
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select a track first';
      placeholder.disabled = true;
      placeholder.selected = true;
      variantSelect.appendChild(placeholder);
      return;
    }

    trackValue.value = selected.name;
    variantSelect.disabled = false;
    variantSelect.setAttribute('required', 'required');
    selected.variants.forEach((variant) => {
      const option = document.createElement('option');
      option.value = variant;
      option.textContent = variant;
      variantSelect.appendChild(option);
    });
  };

  const handleInput = () => {
    const value = trackInput.value.trim().toLowerCase();
    const matches = value
      ? tracks.filter((track) => track.name.toLowerCase().includes(value)).map((track) => track.name)
      : tracks.map((track) => track.name);
    renderSuggestions(matches);
    updateVariants();
  };

  trackInput.addEventListener('input', handleInput);
  trackInput.addEventListener('focus', handleInput);
  trackInput.addEventListener('blur', () => {
    setTimeout(() => {
      suggestionsList.hidden = true;
      trackInput.setAttribute('aria-expanded', 'false');
    }, 150);
  });
}

function slugify(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateRaceId({ title = '', date = '', track = '' } = {}) {
  const dateSlug = slugify(date);
  const titleSlug = slugify(title);
  const trackSlug = slugify(track);
  const parts = [];
  if (dateSlug) parts.push(dateSlug);
  if (titleSlug) {
    parts.push(titleSlug);
  } else if (trackSlug) {
    parts.push(trackSlug);
  }
  if (!parts.length) {
    parts.push(trackSlug || 'race');
  }
  return parts.join('-');
}

function createFieldControl(field) {
  const type = field.type || 'text';
  if (type === 'select') {
    const select = document.createElement('select');
    (field.options || []).forEach((option) => {
      const value = typeof option === 'string' ? option : option.value;
      const label = typeof option === 'string' ? option : option.label;
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      select.appendChild(opt);
    });
    return select;
  }
  if (type === 'textarea') {
    return document.createElement('textarea');
  }
  const input = document.createElement('input');
  input.type = type === 'number' ? 'number' : type;
  if (type === 'number') {
    if (Number.isFinite(field.min)) input.min = field.min;
    if (Number.isFinite(field.max)) input.max = field.max;
  }
  return input;
}

function renderExtraFields() {
  const container = document.getElementById('extra-fields');
  if (!container) return;
  container.textContent = '';
  const definitions = window.raceFieldDefinitions || [];

  definitions.forEach((field) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';
    if (field.span === 2) {
      wrapper.classList.add('form-field--span-2');
    }

    const label = document.createElement('label');
    label.setAttribute('for', field.id);
    label.textContent = field.label;
    wrapper.appendChild(label);

    const control = createFieldControl(field);
    control.id = field.id;
    control.name = field.id;
    if (field.placeholder) control.placeholder = field.placeholder;
    if (field.defaultValue !== undefined) control.value = field.defaultValue;
    const updateValidityState = () => {
      if (control.type === 'number') {
        const numeric = Number(control.value);
        const belowMin = Number.isFinite(field.min) && numeric < field.min;
        const aboveMax = Number.isFinite(field.max) && numeric > field.max;
        if (!Number.isFinite(numeric) || belowMin || aboveMax) {
          wrapper.classList.add('form-field--invalid');
          return;
        }
      }
      if (!control.checkValidity()) {
        wrapper.classList.add('form-field--invalid');
      } else {
        wrapper.classList.remove('form-field--invalid');
      }
    };
    control.addEventListener('input', updateValidityState);
    control.addEventListener('blur', updateValidityState);
    control.addEventListener('change', updateValidityState);
    updateValidityState();

    wrapper.appendChild(control);
    container.appendChild(wrapper);
  });
}

function parseFieldValue(field, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    if (field.defaultValue !== undefined) return field.defaultValue;
    return undefined;
  }
  let value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  if (value === '') {
    if (field.defaultValue !== undefined) return field.defaultValue;
    return undefined;
  }
  if (typeof field.parse === 'function') {
    value = field.parse(value);
  } else if (field.type === 'number') {
    const parsed = Number(value);
    value = Number.isFinite(parsed) ? parsed : undefined;
  }
  if (Array.isArray(value) && value.length === 0) return undefined;
  return value;
}

function buildRaceObject(form) {
  const formData = new FormData(form);
  const lapsValue = Number.parseInt(formData.get('laps'), 10);
  const title = formData.get('title')?.trim() || '';
  const track = formData.get('track')?.trim() || '';
  const date = formData.get('date') || '';

  const race = {
    id: generateRaceId({ title, date, track }),
    title,
    track,
    variant: formData.get('variant'),
    date,
    laps: Number.isFinite(lapsValue) && lapsValue > 0 ? lapsValue : Number.parseInt(form.querySelector('#race-laps')?.getAttribute('value'), 10) || undefined
  };

  const definitions = window.raceFieldDefinitions || [];
  definitions.forEach((field) => {
    const value = parseFieldValue(field, formData.get(field.id));
    if (value !== undefined) {
      race[field.id] = value;
    }
  });

  Object.keys(race).forEach((key) => {
    if (race[key] === '' || race[key] === undefined) {
      delete race[key];
    }
  });

  return race;
}

function updatePreview(form, existingIds) {
  const preview = document.getElementById('race-json-preview');
  const copyButton = document.getElementById('copy-json');
  if (!preview) return;

  const race = buildRaceObject(form);
  const raceId = race.id;
  let hasError = false;
  if (existingIds.has(raceId)) {
    hasError = true;
  }

  if (copyButton) {
    const invalidInputs = form.querySelectorAll('input:invalid, select:invalid, textarea:invalid');
    const allFields = form.querySelectorAll('.form-field');
    allFields.forEach((field) => field.classList.remove('form-field--invalid'));
    invalidInputs.forEach((el) => {
      const wrapper = el.closest('.form-field');
      if (wrapper) {
        wrapper.classList.add('form-field--invalid');
      }
    });
    const hasInvalid = form.querySelector('.form-field--invalid');
    copyButton.disabled = hasError || hasInvalid || !form.checkValidity();
  }

  const formatted = JSON.stringify(race, null, 2);
  preview.textContent = formatted;
}

function setupCopyButton() {
  const button = document.getElementById('copy-json');
  const preview = document.getElementById('race-json-preview');
  const feedback = document.getElementById('copy-feedback');
  if (!button || !preview) return;

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(preview.textContent);
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'JSON copied to clipboard.';
        setTimeout(() => {
          feedback.hidden = true;
        }, 2000);
      }
    } catch (err) {
      console.error('Clipboard copy failed', err);
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'Unable to copy. Please select and copy manually.';
      }
    }
  });
}

async function initEditor() {
  const form = document.getElementById('race-form');
  if (!form) return;

  try {
    const { tracks, races } = await loadEditorData();
    populateTrackSelect(tracks);
    renderExtraFields();
    const existingIds = new Set(races.map((race) => race.id));

    const update = () => updatePreview(form, existingIds);
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    update();
    setupCopyButton();
  } catch (err) {
    console.error(err);
    const preview = document.getElementById('race-json-preview');
    if (preview) {
      preview.textContent = 'Unable to load track list. Please reload the page.';
    }
  }
}

document.addEventListener('DOMContentLoaded', initEditor);
