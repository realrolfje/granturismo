(function () {
  const option = (label, value = label) => ({ label, value });

  const raceFieldDefinitions = [
    {
      id: 'weather',
      label: 'Weather',
      type: 'select',
      options: [option('Dry'), option('Mixed'), option('Wet'), option('Storm'), option('Dynamic')],
      defaultValue: 'Dry',
      displayLabel: 'Weather'
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
      },
      displayLabel: 'Tyres'
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
      },
      displayLabel: 'Fueling Speed'
    },
    {
      id: 'raceNotes',
      label: 'Special Notes',
      type: 'textarea',
      placeholder: 'Night race, heavy damage, BOP off…',
      defaultValue: '',
      displayLabel: 'Notes',
      span: 2
    }
  ];

  window.raceFieldDefinitions = raceFieldDefinitions;
})();
