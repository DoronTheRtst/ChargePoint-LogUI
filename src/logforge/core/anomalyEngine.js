export function runAnomalyRules(session, rules = []) {
  const anomalies = [];

  for (const rule of rules) {
    const output = rule(session) || [];
    anomalies.push(...output);
  }

  session.anomalies = anomalies;
  return session;
}

export function universalRules() {
  return [frozenEnergyRule, zeroPowerRule, suspendedNoChargeRule, incompleteTelemetryRule];
}

function frozenEnergyRule(session) {
  const anomalies = [];
  const readings = session.meterReadings
    .filter((r) => r.energy !== undefined)
    .sort((a, b) => a.ts - b.ts);

  if (readings.length < 3) return anomalies;

  let streak = 0;
  let streakStart = null;

  for (let i = 1; i < readings.length; i += 1) {
    if (readings[i].energy === readings[i - 1].energy) {
      if (!streakStart) {
        streakStart = readings[i - 1].ts;
        streak = 1;
      }
      streak += 1;
    } else if (streak >= 2) {
      anomalies.push({
        type: 'FROZEN_ENERGY',
        severity: 'critical',
        message: `Energy register frozen at ${readings[i - 1].energy} kWh (${streak} readings)`,
        ts: streakStart,
      });
      streak = 0;
      streakStart = null;
    } else {
      streak = 0;
      streakStart = null;
    }
  }


  if (streak >= 2) {
    anomalies.push({
      type: 'FROZEN_ENERGY',
      severity: 'critical',
      message: `Energy register frozen at ${readings[readings.length - 1].energy} kWh (${streak}+ readings)`,
      ts: streakStart,
    });
  }

  return anomalies;
}

function zeroPowerRule(session) {
  const powerReadings = session.meterReadings.filter((r) => r.power !== undefined);
  if (powerReadings.length <= 3) return [];

  const zeros = powerReadings.filter((r) => r.power === 0).length;
  if (zeros < powerReadings.length * 0.8) return [];

  return [{
    type: 'ZERO_POWER',
    severity: 'critical',
    message: `${zeros}/${powerReadings.length} readings show 0W — energy not delivered`,
    ts: session.startTs,
  }];
}

function suspendedNoChargeRule(session) {
  const hasSuspended = session.statusHistory.some((s) => s.status === 'SuspendedEV');
  const hasCharging = session.statusHistory.some((s) => s.status === 'Charging');

  if (!hasSuspended || hasCharging || session.status !== 'stopped') return [];

  return [{
    type: 'SUSPENDED_NO_CHARGE',
    severity: 'warning',
    message: 'Session stopped while in SuspendedEV — EV never drew current',
    ts: session.stopTs,
  }];
}


function incompleteTelemetryRule(session) {
  if (session.status !== 'incomplete') return [];

  return [{
    type: 'INCOMPLETE_TELEMETRY',
    severity: 'info',
    message: 'Session inferred from MeterValues without Start/Stop transaction pair',
    ts: session.startTs,
  }];
}
