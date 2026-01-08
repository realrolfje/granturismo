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
          description: 'When ON, cars will have their weight and power adjusted so that performance is relatively equal. When ON, tuning settings can be limited to certain settings, see Settings Options.',
          options: [option('Off'), option('On (Equal Weight and Power)')],
          defaultValue: 'Off'
        },
        {
          id: 'tuningOptionsAllowed',
          label: 'Settings Options',
          type: 'multi-select',
          description: 'What settings can be changed on the car when BoP is ON.', 
          options: [
            option('Body Height Adjustment'), 
            option('Anti-Roll Bar'), 
            option('Damping Ratio'), 
            option('Natural Frequency'), 
            option('Negative Camber Angle'), 
            option('Toe Angle'), 
            option('Differential'), 
            option('Torque-Vectoring Centre Differential'), 
            option('Transmission (No Final Gear)'), 
            option('Transmission (Final Gear)'), 
            option('Downforce'), 
            option('Anti-Lag'), 
            option('Brake Balance')

          ],
          defaultValue: [
            'Body Height Adjustment', 
            'Anti-Roll Bar', 
            'Damping Ratio', 
            'Natural Frequency', 
            'Negative Camber Angle', 
            'Toe Angle', 
            'Differential', 
            'Torque-Vectoring Centre Differential', 
            'Transmission (No Final Gear)', 
            'Transmission (Final Gear)', 
            'Downforce', 
            'Anti-Lag', 
            'Brake Balance'
          ],
          parse: (values = []) =>
            (Array.isArray(values) ? values : [values])
              .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
              .filter(Boolean),
          format: (value) => (Array.isArray(value) ? value.join(', ') : value)        },
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
          unit: 'Litre/sec',
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
      id: 'qualifierSettings',
      label: 'Qualifier Settings',
      fields: [
        {
          id: 'timeLimitQualifier',
          label: 'Time Limit',
          type: 'select',
          options: [option('1 Minute'), option('2 Minutes'), option('3 Minutes'), option('5 Minutes'), option('10 Minutes'), option('15 Minutes'), option('20 Minutes'), option('25 Minutes'), option('30 Minutes'), option('40 Minutes'), option('50 Minutes'), option('60 Minutes'), option('90 Minutes'),
          option('2 Hours'), option('3 Hours'), option('4 Hours'), option('5 Hours'), option('6 Hours'), option('7 Hours'), option('8 Hours'), option('9 Hours'), option('10 Hours'), option('11 Hours'), option('12 Hours'), option('13 Hours'), option('14 Hours'), option('15 Hours'), option('16 Hours'), option('17 Hours'), option('18 Hours'), option('19 Hours'), option('20 Hours'), option('21 Hours'), option('22 Hours'), option('23 Hours'), option('24 Hours'),
          ],
          defaultValue: '15 Minutes'
        },
        {
          id: 'qualifyContinuationTime',
          label: 'Qualifying Continuation Time',
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
          id: 'tyreWearRateQualifier',
          label: 'Tyre Wear Rate (Qualifier)',
          type: 'number',
          min: -1,
          max: 50,
          defaultValue: -1,
          valueLabels: {
            "-1": "Same as During the Race",
            0: 'Off'
          },
          unit: 'x',
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 1;
            return Math.min(50, Math.max(-1, parsed));
          }
        },
        {
          id: 'fuelConsumptionRateQualifier',
          label: 'Fuel Consumption Rate (Qualifier)',
          type: 'number',
          min: -1,
          max: 50,
          defaultValue: -1,
          valueLabels: {
            "-1": "Same as During the Race",
            0: 'Off'
          },
          unit: 'x',
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 1;
            return Math.min(50, Math.max(-1, parsed));
          }
        },
        {
          id: 'initialFuelQualifier',
          label: 'Initial Fuel (Qualifier)',
          type: 'number',
          min: -1,
          max: 100,
          defaultValue: -1,
          valueLabels: {
            "-1": "Same as During the Race",
            "0": 'Default'
          },
          unit: 'Litres',
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 0;
            return Math.min(100, Math.max(-1, parsed));
          }
        },
        {
          id: 'slipStreamQualifier',
          label: 'Slipstream Strength (Qualifier)',
          type: 'select',
          options: [option('Strong'), option('Weak'), option('Real'), option('Off')],
          defaultValue: 'Real'
        },
      ]
    },
    {
      id: 'regulationSettings',
      label: 'Regulation Settings',
      fields: [
        {
          id: 'filteryCategory',
          label: 'Filter by Category',
          type: 'select',
          options: [option('No Limit'), option('Gr.1'), option('Gr.2'), option('Gr.3'), option('Gr.4'), option('Gr.B')],
          defaultValue: 'No Limit'
        },
        {
          id: 'ppLimit',
          label: 'PP Limit',
          type: 'number',
          min: 99,
          max: 1001,
          defaultValue: 99,
          valueLabels: {
            99: 'No Limit',
            1001: 'No Limit'
          },
          unit: 'Litres',
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 0;
            return Math.min(1001, Math.max(99, parsed));
          }
        },
        {
          id: 'maxPowerOutput',
          label: 'Max Power Output',
          type: 'number',
          min: 97,
          max: 1479,
          defaultValue: 97,
          valueLabels: {
            97: 'No Limit',
            1480: 'No Limit'
          },
          unit: 'Litres',
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 0;
            return Math.min(1480, Math.max(97, parsed));
          }
        },
        {
          id: 'minimumWeight',
          label: 'Minimum Weight',
          type: 'number',
          min: 499,
          max: 2001,
          defaultValue: 499,
          valueLabels: {
            499: 'No Limit',
            2001: 'No Limit'
          },
          unit: 'Litres',
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 0;
            return Math.min(2001, Math.max(499, parsed));
          }
        },
        {
          id: 'allowedTyres',
          label: 'Allowed Tyres',
          type: 'select',
          options: [option('No Limit'), option('Comfort'), option('Sports'), option('Racing')],
          defaultValue: 'No Limit'
        },
        {
          id: 'tyreCompounds',
          label: 'usable Tyre & Types',
          type: 'multi-select',
          options: [option('Hard'), option('Medium'), option('Soft')],
          defaultValue: ['Hard', 'Medium', 'Soft'],
          description: "The tyres available during the race. Optional.",
          parse: (values = []) =>
            (Array.isArray(values) ? values : [values])
              .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
              .filter(Boolean),
          format: (value) => (Array.isArray(value) ? value.join(', ') : value)
        },
        {
          id: 'requiredTyreCompounds',
          label: 'Required Tyre Type',
          type: 'multi-select',
          options: [option('Hard'), option('Medium'), option('Soft')],
          defaultValue: [],
          description: "The tyres REQUIRED to be used in the race. Yes all of them.",
          parse: (values = []) =>
            (Array.isArray(values) ? values : [values])
              .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
              .filter(Boolean),
          format: (value) => (Array.isArray(value) ? value.join(', ') : value)
        },
        {
          id: 'nitrous',
          label: 'Nitrous',
          type: 'select',
          options: [option('Prohibited'), option('Required'), option('Unrestricted')],
          defaultValue: 'Unrestricted'
        },
        {
          id: 'kartUsage',
          label: 'Kart Usage',
          type: 'select',
          options: [option('On'), option('Off')],
          defaultValue: 'Off'
        },
        {
          id: 'engineSwap',
          label: 'Engine Swap',
          type: 'select',
          options: [option('Unrestricted'), option('Prohibited')],
          defaultValue: 'Unrestricted'
        },
        {
          id: 'tuningParts',
          label: 'Tuning Parts',
          type: 'select',
          options: [option('Unrestricted'), option('Extreme and Lower')],
          defaultValue: 'Unrestricted'
        },
        {
          id: 'yearLowerLimit',
          label: 'Year (Lower Limit)',
          type: 'number',
          min: 1929,
          max: 2036,
          defaultValue: 1929,
          valueLabels: {
            1929: 'No Limit',
            2036: 'No Limit'
          },
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 0;
            return Math.min(2036, Math.max(1929, parsed));
          }
        },
        {
          id: 'yearUpperLimit',
          label: 'Year (Upper Limit)',
          type: 'number',
          min: 1929,
          max: 2036,
          defaultValue: 1929,
          valueLabels: {
            1929: 'No Limit',
            2036: 'No Limit'
          },
          parse: (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) return 0;
            return Math.min(2036, Math.max(1929, parsed));
          }
        },
        {
          id: 'driveTrain',
          label: 'Drivetrain',
          type: 'select',
          options: [option('Unrestricted'), option('FR'), option('FF'), option('4WD'), option('MR'), option('RR'), option('---')],
          defaultValue: 'Unrestricted'
        },
        {
          id: 'aspiration',
          label: 'Aspiration',
          type: 'select',
          options: [option('Unrestricted'), option('NA (Normal Aspirated)'), option('TC (Turbocharger'), option('SC (Supercharger)'), option('TC + SC'), option('EV (Electric Vehicle'), option('---')],
          defaultValue: 'Unrestricted'
        },
      ]
    },
    {
      id: 'penaltySettings',
      label: 'Penalty Settings',
      fields: [
        {
          id: 'shortcutPenalty',
          label: 'Shortcut Penalty',
          type: 'select',
          options: [option('Off'), option('Weak'), option('Strong')],
          defaultValue: 'Weak'
        },
        {
          id: 'wallCollisionPenalty',
          label: 'Wall Collision Penalty',
          type: 'select',
          options: [option('Off'), option('Time Penalty (Weak)'), option('Time Penalty (Strong)')],
          defaultValue: 'Off'
        },
        {
          id: 'correctCourse',
          label: 'Correct Course After Wall Collision',
          type: 'select',
          options: [option('Off'), option('On')],
          defaultValue: 'On'
        },
        {
          id: 'carcollisionPenalty',
          label: 'Car Collision Penalty',
          type: 'select',
          options: [option('Off'), option('On')],
          defaultValue: 'On'
        },
        {
          id: 'pitlaneCuttingPenalty',
          label: 'Pit Lane Cutting Penalty',
          type: 'select',
          options: [option('Off'), option('On')],
          defaultValue: 'On'
        },
        {
          id: 'ghostingDuringRace',
          label: 'Ghosting During Race',
          type: 'select',
          options: [option('Off'), option('On')],
          defaultValue: 'Off'
        }
      ]
    },
    {
      id: 'drivingOptions',
      label: 'Driving Option Limitations',
      fields: [
        {
          id: 'counterSteeringAssistance',
          label: 'Counter Steering Assistance',
          type: 'select',
          options: [option('No Limit'), option('Prohibited')],
          defaultValue: 'No Limit'
        },
        {
          id: 'activeStabilityManagement',
          label: 'Active Stability Management (ASM)',
          type: 'select',
          options: [option('No Limit'), option('Prohibited')],
          defaultValue: 'No Limit'
        },
        {
          id: 'activeStabilityManagement',
          label: 'Active Stability Management (ASM)',
          type: 'select',
          options: [option('No Limit'), option('Prohibited')],
          defaultValue: 'No Limit'
        },
        {
          id: 'drivingLaneAssist',
          label: 'Driving Lane Assist',
          type: 'select',
          options: [option('No Limit'), option('Prohibited')],
          defaultValue: 'No Limit'
        },
        {
          id: 'tractionControl',
          label: 'Traction Control',
          type: 'select',
          options: [option('No Limit'), option('Prohibited')],
          defaultValue: 'No Limit'
        },
        {
          id: 'abs',
          label: 'ABS',
          type: 'select',
          options: [option('No Limit'), option('Prohibited')],
          defaultValue: 'No Limit'
        },
        {
          id: 'autoDrive',
          label: 'Auto-Drive',
          type: 'select',
          options: [option('No Limit'), option('Prohibited')],
          defaultValue: 'No Limit'
        }
      ]
    },
    {
      id: 'notes',
      label: 'Other/Notes',
      fields: [
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
