import { parseLogsByType } from './parsers';
import { etrelRules } from './anomalies';

const etrelPlugin = {
  id: 'etrel',
  label: 'Etrel',
  models: [
    {
      id: 'inch-duo',
      label: 'Inch Duo',
      logTypes: [
        { id: 'operations', label: 'Operations Log', required: true },
        { id: 'guipresenter', label: 'GuiPresenter Log', required: false },
        { id: 'powermanagement', label: 'PowerManagement Log', required: false },
      ],
    },
  ],
  parseLogsByType,
  anomalyRules: etrelRules,
};

export default etrelPlugin;
