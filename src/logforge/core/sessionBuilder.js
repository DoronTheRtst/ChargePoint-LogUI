import { sortByTs } from './time';

export function extractReadings(params) {
  const out = [];
  if (!params?.meterValue) return out;

  for (const mv of params.meterValue) {
    const ts = new Date(mv.timestamp).getTime();
    const r = { ts };

    for (const sv of mv.sampledValue || []) {
      const val = parseFloat(sv.value);
      if (sv.measurand === 'Energy.Active.Import.Register' && sv.location === 'Outlet') r.energy = val;
      if (sv.measurand === 'Power.Active.Import' && sv.location === 'Outlet') r.power = val;
      if (sv.measurand === 'Current.Import' && sv.location === 'Outlet' && sv.phase === 'L1') r.currentL1Out = val;
      if (sv.measurand === 'Current.Import' && sv.location === 'Outlet' && sv.phase === 'L2') r.currentL2Out = val;
      if (sv.measurand === 'Current.Import' && sv.location === 'Outlet' && sv.phase === 'L3') r.currentL3Out = val;
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

  return sessions.sort(sortByTs);
}
