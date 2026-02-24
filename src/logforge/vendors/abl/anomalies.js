export function ablRules() {
  return [currentMismatchRule, userDefectRule, cpVetoRule];
}

function currentMismatchRule(session) {
  const bodyOut = session.meterReadings.filter((r) => r.currentL1Body !== undefined);

  for (const r of bodyOut) {
    if (r.currentL1Body > 1 && r.currentL1Out !== undefined && Math.abs(r.currentL1Out) < 0.1) {
      return [{
        type: 'CURRENT_MISMATCH',
        severity: 'critical',
        message: `Body L1 ${r.currentL1Body}A — Outlet L1 ${r.currentL1Out}A → relay may be open`,
        ts: r.ts,
      }];
    }
  }

  return [];
}

function userDefectRule(session) {
  return session.userEvents
    .filter((e) => e.type === 'CHARGEPOINT_DEFCT_ADDED')
    .map((e) => ({
      type: 'DEFECT',
      severity: 'warning',
      message: `Defect: ${e.extra}`,
      ts: e.ts,
    }));
}

function cpVetoRule(session) {
  const cpVeto = session.cpEvents.find((e) => e.vetos > 0 && e.ts > session.startTs);
  if (!cpVeto) return [];

  return [{
    type: 'CP_VETO',
    severity: 'info',
    message: 'Veto detected in CP state machine after session start',
    ts: cpVeto.ts,
  }];
}
