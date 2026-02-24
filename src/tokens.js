export const T = {
  bg: '#080c12',
  surface: '#0d1117',
  card: '#161b22',
  border: '#21262d',
  borderLight: '#30363d',
  text: '#c9d1d9',
  textDim: '#8b949e',
  textMuted: '#484f58',
  amber: '#d29922',
  amberBright: '#e3b341',
  green: '#3fb950',
  red: '#f85149',
  orange: '#f0883e',
  blue: '#58a6ff',
  teal: '#56d364',
  purple: '#bc8cff',
  ocpp: '#58a6ff',
  user: '#3fb950',
  cp: '#bc8cff',
};

export const SEV_COLOR = { critical: T.red, warning: T.orange, info: T.blue };
export const SOURCE_COLOR = { ocpp: T.ocpp, user: T.user, cp: T.cp };
export const SOURCE_LABEL = { ocpp: 'OCPP', user: 'USER', cp: 'CP' };

export const ACTION_LABELS = {
  StartTransaction: '⚡ Start Tx',
  StopTransaction: '🛑 Stop Tx',
  Authorize: '🔑 Auth',
  StatusNotification: '📡 Status',
  MeterValues: '📊 Meter',
  BootNotification: '🔌 Boot',
  Heartbeat: '💓 Heartbeat',
  RemoteStartTransaction: '▶ Remote Start',
  RemoteStopTransaction: '⏹ Remote Stop',
  ChangeConfiguration: '⚙ Config',
};
