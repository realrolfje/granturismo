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
