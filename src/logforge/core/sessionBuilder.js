import { sortByTs } from './time';

export function extractReadings(params) {
  const out = [];
  if (!params?.meterValue) return out;

  for (const mv of params.meterValue) {
    const ts = new Date(mv.timestamp).getTime();
    const r = { ts };

    for (const sv of mv.sampledValue || []) {
      const val = parseFloat(sv.value);
      const isOutlet = !sv.location || sv.location === 'Outlet';
      if (sv.measurand === 'Energy.Active.Import.Register' && isOutlet) r.energy = val;
      if (sv.measurand === 'Power.Active.Import' && isOutlet) r.power = sv.unit === 'kW' ? val * 1000 : val;
      if (sv.measurand === 'Current.Import' && isOutlet && sv.phase === 'L1') r.currentL1Out = val;
      if (sv.measurand === 'Current.Import' && isOutlet && sv.phase === 'L2') r.currentL2Out = val;
      if (sv.measurand === 'Current.Import' && isOutlet && sv.phase === 'L3') r.currentL3Out = val;
      if (sv.measurand === 'Current.Import' && sv.location === 'Body' && sv.phase === 'L1') r.currentL1Body = val;
      if (sv.measurand === 'Voltage' && sv.phase === 'L1-N') r.voltL1 = val;
    }

    out.push(r);
  }

  return out;
}

export function buildSessions(ocppEvents, userEvents, cpEvents) {
  const map = {};
  const pendingStart = {};
  const meterEventsByTx = {};

  for (const ev of ocppEvents) {
    if (ev.type !== 'message') continue;

    if (ev.dir === 'OUT' && ev.action === 'StartTransaction') {
      pendingStart[ev.msgId] = {
        connector: ev.params?.connectorId,
        idTag: ev.params?.idTag,
        meterStart: (ev.params?.meterStart ?? 0) / 1000,
        startTs: ev.ts,
        startMsgId: ev.msgId,
        status: 'active',
        meterReadings: [],
        statusHistory: [],
        ocppEvents: [ev],
        userEvents: [],
        cpEvents: [],
        anomalies: [],
      };
    }

    if (ev.dir === 'IN' && ev.msgType === 3 && pendingStart[ev.msgId]) {
      const sess = pendingStart[ev.msgId];
      delete pendingStart[ev.msgId];

      if (ev.result?.transactionId) {
        sess.transactionId = ev.result.transactionId;
        sess.id = `${sess.connector}_${sess.transactionId}`;
        sess.ocppEvents.push(ev);
        map[sess.id] = sess;
      }
    }

    if (ev.dir === 'OUT' && ev.action === 'StopTransaction') {
      const { transactionId, meterStop, reason } = ev.params || {};
      const key = Object.keys(map).find((k) => map[k].transactionId === transactionId);
      if (!key) continue;

      Object.assign(map[key], {
        stopTs: ev.ts,
        meterStop: (meterStop ?? 0) / 1000,
        stopReason: reason,
        status: 'stopped',
        energyDelivered: (meterStop / 1000) - map[key].meterStart,
      });
      map[key].ocppEvents.push(ev);
    }

    if (ev.dir === 'OUT' && ev.action === 'MeterValues') {
      const { transactionId } = ev.params || {};

      if (transactionId != null) {
        if (!meterEventsByTx[transactionId]) meterEventsByTx[transactionId] = [];
        meterEventsByTx[transactionId].push(ev);
      }

      const key = Object.keys(map).find((k) => map[k].transactionId === transactionId);
      if (!key) continue;

      map[key].meterReadings.push(...extractReadings(ev.params));
      map[key].ocppEvents.push(ev);
    }

    if (ev.dir !== 'OUT' || ev.action !== 'StatusNotification') continue;

    const { connectorId, status } = ev.params || {};
    const key = Object.keys(map).find(
      (k) => map[k].connector === connectorId && ev.ts >= map[k].startTs - 10000 && ev.ts <= (map[k].stopTs || Infinity) + 10000,
    );

    if (key) {
      map[key].statusHistory.push({ ts: ev.ts, status });
      map[key].ocppEvents.push(ev);
    }
  }


  for (const [transactionId, meterEvents] of Object.entries(meterEventsByTx)) {
    const existing = Object.values(map).find((s) => String(s.transactionId) === String(transactionId));
    if (existing) continue;

    const sortedMeterEvents = meterEvents.slice().sort(sortByTs);
    const firstEv = sortedMeterEvents[0];
    const lastEv = sortedMeterEvents[sortedMeterEvents.length - 1];
    const connector = firstEv.params?.connectorId ?? null;
    const meterReadings = sortedMeterEvents.flatMap((e) => extractReadings(e.params));
    const firstReadingTs = meterReadings.filter((r) => r.ts).map((r) => r.ts).sort((a, b) => a - b)[0];
    const lastReadingTs = meterReadings.filter((r) => r.ts).map((r) => r.ts).sort((a, b) => a - b).slice(-1)[0];

    const startTs = firstReadingTs || firstEv.ts;
    const stopTs = lastReadingTs || lastEv.ts;
    const meterStart = meterReadings.find((r) => r.energy !== undefined)?.energy;
    const meterStop = [...meterReadings].reverse().find((r) => r.energy !== undefined)?.energy;

    const inferred = {
      id: `${connector ?? 'x'}_${transactionId}_inferred`,
      connector,
      idTag: 'unknown',
      meterStart,
      meterStop,
      startTs,
      stopTs,
      transactionId: Number.isNaN(Number(transactionId)) ? transactionId : Number(transactionId),
      startMsgId: firstEv.msgId,
      stopReason: 'IncompleteTelemetry',
      status: 'incomplete',
      meterReadings,
      statusHistory: [],
      ocppEvents: sortedMeterEvents,
      userEvents: [],
      cpEvents: [],
      anomalies: [{
        type: 'INCOMPLETE_TELEMETRY',
        severity: 'info',
        message: 'Session inferred from MeterValues without Start/Stop transaction pair',
        ts: startTs,
      }],
      energyDelivered: meterStart !== undefined && meterStop !== undefined ? meterStop - meterStart : null,
    };

    map[inferred.id] = inferred;
  }

  const sessions = Object.values(map);

  for (const ev of userEvents) {
    const sess = sessions.find(
      (s) => s.connector === ev.connector && ev.ts >= s.startTs - 60000 && ev.ts <= (s.stopTs || Infinity) + 60000,
    );
    if (sess) sess.userEvents.push(ev);
  }

  for (const ev of cpEvents) {
    if (!ev.connector) continue;

    const sess = sessions.find(
      (s) => s.connector === ev.connector && ev.ts >= s.startTs - 120000 && ev.ts <= (s.stopTs || Infinity) + 120000,
    );
    if (sess) sess.cpEvents.push(ev);
  }

  for (const s of sessions) {
    const cpReadings = s.cpEvents
      .filter((e) => e.type === 'meter_sample' && e.energy !== undefined)
      .map((e) => ({
        ts: e.ts,
        energy: e.energy,
        power: e.power,
        currentL1Out: e.currentL1,
        currentL2Out: e.currentL2,
        currentL3Out: e.currentL3,
      }));

    if (cpReadings.length > 0) {
      const merged = [...s.meterReadings, ...cpReadings].sort(sortByTs);
      const deduped = [];
      for (const r of merged) {
        const prev = deduped[deduped.length - 1];
        if (prev && prev.ts === r.ts && prev.energy === r.energy && prev.power === r.power) continue;
        deduped.push(r);
      }
      s.meterReadings = deduped;

      if (s.meterStart == null) s.meterStart = deduped.find((r) => r.energy !== undefined)?.energy;
      if (s.meterStop == null) s.meterStop = [...deduped].reverse().find((r) => r.energy !== undefined)?.energy;
      if (s.energyDelivered == null && s.meterStart != null && s.meterStop != null) {
        s.energyDelivered = s.meterStop - s.meterStart;
      }
    }
  }

  return sessions.sort(sortByTs);
}
