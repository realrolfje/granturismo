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
      id: 'timeLimit',
      label: 'Time Limit (Endurance)',
      type: 'select',
      options: [
        option('--'), option('1 Minute'), option('2 Minutes'), option('3 Minutes'), option('5 Minutes'), option('10 Minutes'), option('15 Minutes'), option('20 Minutes'), option('25 Minutes'), option('30 Minutes'), option('40 Minutes'), option('50 Minutes'), option('60 Minutes'), option('90 Minutes'),
        option('2 Hours'), option('3 Hours'), option('4 Hours'), option('5 Hours'), option('6 Hours'), option('7 Hours'), option('8 Hours'), option('9 Hours'), option('10 Hours'), option('11 Hours'), option('12 Hours'), option('13 Hours'), option('14 Hours'), option('15 Hours'), option('16 Hours'), option('17 Hours'), option('18 Hours'), option('19 Hours'), option('20 Hours'), option('21 Hours'), option('22 Hours'), option('23 Hours'), option('24 Hours'),
      ],
      defaultValue: '--'
    },
    {
      id: 'weather',
      label: 'Weather',
      type: 'select',
      options: [
        option('S01 Dry, Cloudless and Pleasant'),
        option('S02 Dry and Pleasant with a few Clouds'),
        option('S03 Dry Cloudy and Pleasant'),
        option('S04 Dry Cloudy and Sunny'),
        option('S05 Misty, Cloudless and Sunny'),
        option('S06 Humid, Cloudless and Pleasant'),
        option('S07 Humid and PLeasant with a Few Clouds'),
        option('S08 Humid, Sunny and Cloudy'),
        option('S09 Humid and Sunny with Lots of Clouds'),
        option('S10 Misty and Sunny with Lots of Clouds'),
        option('S11 Sunny with Alpine Mist'),
        option('S12 Sunny with Lots of Monsoon Clouds'),
        option('S13 Sunny with a Few Monsoon Clouds'),
        option('S14 Sunny with Lots of Monsoon Clouds'),
        option('S15 Hazy, Cloudless and Pleasant'),
        option('S16 Hazy and Sunny with a Few Clouds'),
        option('S17 Hazy, Cloudy and Sunny'),
        option('S18 Hazy, Cloudy and Sunny'),
        option('C01 Cloudy and Bright'),
        option('C02 Cloudy and Warm'),
        option('C03 Cloudy and Dark'),
        option('C04 Cloudy and Chilly'),
        option('C05 Cloudy'),
        option('C06 Thick Clouds'),
        option('R01 Light Drizzle'),
        option('R02 Cloudless with Warm Rain'),
        option('R03 Light Rain'),
        option('R04 Cloudy with Rain'),
        option('R05 Cloudy with Rain'),
        option('R06 Thick Cloud with Rain'),
        option('R07 Cloudy with Torrential Rain'),
        option('R08 Thick Cloud with Torrential Rain')],
      defaultValue: 'S01 Dry, Cloudless and Pleasant'
    },
    {
      id: 'timeOfDay',
      label: 'Time of Day',
      type: 'select',
      options: [option('Dawn'), option('Sunrise'), option('Early Morning'), option('Late Morning'), option('Afternoon'), option('Evening'), option('Sunset'), option('Twilight'), option('Night')],
      defaultValue: 'Afternoon'
    },
    {
      id: 'variableTimeSpeet',
      label: 'Variable Time Speed Rate',
      type: 'number',
      min: 0,
      max: 30,
      defaultValue: 1,
      parse: (value) => {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed)) return 1;
        return Math.min(30, Math.max(0, parsed));
      }
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
