(function () {
  const option = (label, value = label) => ({ label, value });

  const raceFieldDefinitions = [
    {
      id: 'roomMode',
      label: 'Room Mode',
      type: 'select',
      options: [option('Free Run'), option('Practice/Race'), option('Practice/Qualifier/Race'), option('Practice/Endurance Race'), option('Practice/Qualifier/Endurance Race')],
      defaultValue: 'Practice/Race',
    },
    {
      id: 'raceType',
      label: 'Race Type',
      type: 'select',
      options: [option('Race for Fun'), option('Free Run'), option('Drift'), option('Race for Real')],
      defaultValue: 'Race for Fun',
    },
    {
      id: 'maxParticipants',
      label: 'Max. Participants',
      type: 'number',
      min: 2,
      max: 16,
      defaultValue: 10,
      parse: (value) => {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed)) return 3;
        return Math.min(16, Math.max(2, parsed));
      }
    },
    {
      id: 'autoStart',
      label: 'Auto-Start',
      type: 'number',
      min: 0,
      max: 10,
      defaultValue: 0,
      unit: 'minutes',
      parse: (value) => {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed)) return 0;
        return Math.min(10, Math.max(0, parsed));
      },
      format: (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) return 'Off';
        return `${numeric}`;
      }
    },
    {
      id: 'weather',
      label: 'Weather',
      type: 'select',
      options: [option('Dry'), option('Mixed'), option('Wet'), option('Storm'), option('Dynamic')],
      defaultValue: 'Dry'
    },
    {
      id: 'allowedTyres',
      label: 'Allowed Tyres',
      type: 'text',
      placeholder: 'Racing Soft, Racing Medium',
      defaultValue: 'Racing Soft, Racing Medium',
      parse: (value) =>
        value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      format: (value) => {
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return value || '';
      }
    },
    {
      id: 'fuelingSpeed',
      label: 'Fueling Speed (L/s)',
      type: 'number',
      min: 3,
      max: 20,
      defaultValue: 3,
      parse: (value) => {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed)) return 3;
        return Math.min(20, Math.max(3, parsed));
      }
    },
    {
      id: 'raceNotes',
      label: 'Special Notes',
      type: 'textarea',
      placeholder: 'Night race, heavy damage, BOP off…',
      defaultValue: '',
      span: 2
    }
  ];

  window.raceFieldDefinitions = raceFieldDefinitions;
})();
