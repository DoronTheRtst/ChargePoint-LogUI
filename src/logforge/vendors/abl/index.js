import { parseLogsByType } from './parsers';
import { ablRules } from './anomalies';

const ablPlugin = {
  id: 'abl',
  label: 'ABL',
  models: [
    {
      id: 'emh3',
      label: 'eMH3',
      logTypes: [
        { id: 'ocpp', label: 'OCPP WebSocket Log', required: true },
        { id: 'user', label: 'USER Log', required: false },
        { id: 'cp', label: 'ChargePoint Log', required: false },
      ],
    },
  ],
  parseLogsByType,
  anomalyRules: ablRules,
};

export default ablPlugin;
