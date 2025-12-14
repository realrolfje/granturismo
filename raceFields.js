(function () {
  const option = (label, value = label) => ({ label, value });

  const weatherOptions = [
    option('S01 Dry, Cloudless and Pleasant'),
    option('S02 Dry and Pleasant with a few Clouds'),
    option('S03 Dry Cloudy and Pleasant'),
    option('S04 Dry Cloudy and Sunny'),
    option('S05 Misty, Cloudless and Sunny'),
    option('S06 Humid, Cloudless and Pleasant'),
    option('S07 Humid and Pleasant with a Few Clouds'),
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
    option('R08 Thick Cloud with Torrential Rain')
  ];

  const raceFieldGroups = [
    {
      id: 'lobby',
      label: 'Lobby Setup',
      fields: [
        {
          id: 'roomMode',
          label: 'Room Mode',
          type: 'select',
          options: [option('Free Run'), option('Practice/Race'), option('Practice/Qualifier/Race'), option('Practice/Endurance Race'), option('Practice/Qualifier/Endurance Race')],
          defaultValue: 'Practice/Race',
        },
        {
          id: 'roomPrivacy',
          label: 'Room Privacy',
          type: 'select',
          options: [option('Public'), option('Friends Only'), option('Private')],
          defaultValue: 'Friends',
        },
      ]
    },
    {
      id: 'roomSettings',
      label: 'Room Settings',
      fields: [
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
          valueLabels: {
            0: 'Off'
          },
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 0;
            return Math.min(10, Math.max(0, parsed));
          }
        }
      ]
    },
    {
      id: 'trackSettings',
      label: 'Track Settings',
      fields: [
        {
          id: 'laps',
          label: 'Race Laps',
          type: 'number',
          min: 1,
          defaultValue: 15,
          required: true,
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed) || parsed < 1) return 1;
            return parsed;
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
        }
      ]
    },
    {
      id: 'timeWeatherSettings',
      label: 'Time/Weather Settings',
      fields: [
        {
          id: 'weatherSegments',
          label: 'Weather Timeline',
          type: 'repeatable-select',
          options: weatherOptions,
          minItems: 1,
          maxItems: 10,
          defaultValue: [weatherOptions[0].value],
          addButtonLabel: 'Add weather segment',
          span: 2,
          format: (values) => (Array.isArray(values) ? values.join(' → ') : values)
        },
        {
          id: 'equalConditions',
          label: 'Equal Conditions Mode',
          type: 'select',
          options: [option('Off'), option('On')],
          defaultValue: 'Off'
        },
        {
          id: 'timeOfDay',
          label: 'Time of Day',
          type: 'select',
          options: [option('Dawn'), option('Sunrise'), option('Early Morning'), option('Late Morning'), option('Afternoon'), option('Evening'), option('Sunset'), option('Twilight'), option('Night')],
          defaultValue: 'Afternoon'
        },
        {
          id: 'variableTimeSpeed',
          label: 'Variable Time Speed Rate',
          type: 'number',
          min: 0,
          max: 30,
          defaultValue: 1,
          unit: 'x',
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 1;
            return Math.min(30, Math.max(0, parsed));
          }
        }
      ]
    },
    {
      id: 'raceSettings',
      label: 'Race Settings',
      fields: [
        {
          id: 'startType',
          label: 'Start Type',
          type: 'select',
          options: [option('Fastest First'), option('Slowest First')],
          defaultValue: 'Fastest First'
        },
        {
          id: 'gridOrder',
          label: 'Grid Order',
          type: 'select',
          options: [option('Grid Start'), option('Grid Start with False Start Check'), option('Rolling Start')],
          defaultValue: 'Grid Start'
        },
        {
          id: 'bopTuning',
          label: 'BoP/Tuning Prohibited',
          type: 'select',
          options: [option('Off'), option('On (no tuning allowed)')],
          defaultValue: 'Off'
        },
        {
          id: 'tuningOptionsAllowed',
          label: 'Settings Options',
          type: 'select',
          options: [option('Pipes'), option('Turbo')],
          defaultValue: 'All'
        },
        {
          id: 'boost',
          label: 'Boost',
          type: 'select',
          options: [option('Strong'), option('Weak'), option('Off')],
          defaultValue: 'Weak'
        },
        {
          id: 'slipStream',
          label: 'Slipstream Strength',
          type: 'select',
          options: [option('Strong'), option('Weak'), option('Real'), option('Off')],
          defaultValue: 'Real'
        },
        {
          id: 'visibleDamage',
          label: 'Visible Damage',
          type: 'select',
          options: [option('On'), option('Off')],
          defaultValue: 'On'
        },
        {
          id: 'mechanicalDamage',
          label: 'Mechanical Damage',
          type: 'select',
          options: [option('None'), option('Light'), option('Heavy')],
          defaultValue: 'Light'
        },
        {
          id: 'tyreWearRate',
          label: 'Tyre Wear Rate',
          type: 'number',
          min: 0,
          max: 50,
          defaultValue: 1,
          valueLabels: {
            0: 'Off'
          },
          unit: 'x',
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 1;
            return Math.min(50, Math.max(0, parsed));
          }
        },
        {
          id: 'fuelConsumptionRate',
          label: 'Fuel Consumption Rate',
          type: 'number',
          min: 0,
          max: 50,
          defaultValue: 1,
          valueLabels: {
            0: 'Off'
          },
          unit: 'x',
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 1;
            return Math.min(50, Math.max(0, parsed));
          }
        },
        {
          id: 'refuellingSpeed',
          label: 'Refuelling Speed',
          type: 'number',
          min: 1,
          max: 20,
          defaultValue: 3,
          unit: 'Litre/Sec',
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 1;
            return Math.min(20, Math.max(1, parsed));
          }
        },
        {
          id: 'initialFuel',
          label: 'Initial Fuel',
          type: 'number',
          min: 0,
          max: 100,
          defaultValue: 0,
          valueLabels: {
            0: 'Default'
          },
          unit: 'Litres',

          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 0;
            return Math.min(100, Math.max(0, parsed));
          }
        },
        {
          id: 'gripReduction',
          label: 'Grip Reduction Off Track',
          type: 'select',
          options: [option('Low'), option('Real')],
          defaultValue: 'Low'
        },
        {
          id: 'raceFinishDelay',
          label: 'Race Finish Delay',
          type: 'number',
          min: 30,
          max: 180,
          defaultValue: 60,
          unit: 'seconds',
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 0;
            return Math.min(180, Math.max(30, parsed));
          }
        },
        {
          id: 'nitrousMultiplier',
          label: 'Nitrous/Overtraking Usage Multiplier',
          type: 'decimal',
          min: 0.1,
          max: 10.0,
          step: 0.1,
          defaultValue: 1,
          unit: 'x',
          valueLabels: {
            1: 'Default'
          },
          parse: (value) => {
            const parsed = Number.parseFloat(value);
            if (!Number.isFinite(parsed)) return 1;
            const clamped = Math.min(10, Math.max(0.1, parsed));
            return Math.round(clamped * 10) / 10;
          }
        }
      ]
    },
    {
      id: 'raceSettings',
      label: 'Race Settings',
      fields: [

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
          id: 'raceNotes',
          label: 'Special Notes',
          type: 'textarea',
          placeholder: 'Night race, heavy damage, BOP off…',
          defaultValue: '',
          span: 2
        }
      ]
    }
  ];

  const raceFieldDefinitions = raceFieldGroups.flatMap((group) =>
    group.fields.map((field) => ({
      ...field,
      groupId: group.id,
      groupLabel: group.label
    }))
  );

  window.raceFieldGroups = raceFieldGroups;
  window.raceFieldDefinitions = raceFieldDefinitions;
})();
