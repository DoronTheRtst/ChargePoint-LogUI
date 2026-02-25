export function etrelRules() {
  return [operationsMeterFaultRule, pausedConnectorRule];
}

function operationsMeterFaultRule(session) {
  return session.userEvents
    .filter((e) => e.type === 'ENERGYMETERSERVICE')
    .map((e) => ({
      type: 'METER_SERVICE_ERROR',
      severity: 'warning',
      message: `Energy meter service issue: ${e.extra}`,
      ts: e.ts,
    }));
}

function pausedConnectorRule(session) {
  const paused = session.cpEvents.find((e) => e.intent === 'ChargingPausedByEv');
  if (!paused) return [];

  return [{
    type: 'PAUSED_BY_EV',
    severity: 'info',
    message: 'Connector remained paused by EV during telemetry window',
    ts: paused.ts,
  }];
}
