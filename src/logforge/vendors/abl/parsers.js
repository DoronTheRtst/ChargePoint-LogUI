import { parseWallClock, sortByTs } from '../../core/time';

export function parseOcppLog(text) {
  const events = [];

  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;

    const pingM = t.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+) WS (ping|pong) (OUT|IN): id=(\d+)/);
    if (pingM) {
      events.push({ ts: parseWallClock(pingM[1]), source: 'ocpp', type: pingM[2], dir: pingM[3], msgId: pingM[4], raw: t });
      continue;
    }

    const msgM = t.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+) WS message (OUT|IN): (.+)$/);
    if (!msgM) continue;

    const ts = parseWallClock(msgM[1]);
    const dir = msgM[2];

    try {
      const payload = JSON.parse(msgM[3]);
      const msgType = payload[0];
      const msgId = payload[1];
      let action = null;
      let params = null;
      let result = null;
      let errorCode = null;
      let errorDesc = null;

      if (msgType === 2) {
        action = payload[2];
        params = payload[3];
      } else if (msgType === 3) {
        result = payload[2];
      } else if (msgType === 4) {
        errorCode = payload[2];
        errorDesc = payload[3];
      }

      events.push({ ts, source: 'ocpp', type: 'message', dir, msgType, msgId, action, params, result, errorCode, errorDesc, raw: t });
    } catch {
      events.push({ ts, source: 'ocpp', type: 'parse_error', dir, raw: t });
    }
  }

  return events.sort(sortByTs);
}

export function parseUserLog(text) {
  const events = [];

  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;

    const parts = t.split(',');
    if (parts.length < 4) continue;

    const epochMs = parseInt(parts[2], 10);
    if (Number.isNaN(epochMs)) continue;

    const numM = parts[3].match(/(\d+)/);
    events.push({
      ts: epochMs,
      source: 'user',
      type: parts[0],
      level: parts[1],
      connector: numM ? parseInt(numM[1], 10) : null,
      extra: parts.slice(4).join(','),
      raw: t,
    });
  }

  return events.sort(sortByTs);
}

export function parseCpLog(text) {
  const events = [];

  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;

    const tsM = t.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+)/);
    if (!tsM) continue;

    const ts = parseWallClock(tsM[1]);
    const levelM = t.match(/ (INFO|WARN|ERROR|DEBUG) /);
    const level = levelM ? levelM[1] : 'INFO';
    const cpM = t.match(/\[ChargePoint-(\d+)\]/);
    const connector = cpM ? parseInt(cpM[1], 10) : null;
    const stateM = t.match(/Intent=(\S+)\s+Step=(\S+)\s+Defects=(\d+)\s+StartVotes=(\d+)\s+StopVotes=(\d+)\s+Vetos=(\d+)/);

    const event = {
      ts,
      source: 'cp',
      type: level === 'WARN' ? 'warn' : 'state_update',
      level,
      connector,
      raw: t,
    };

    if (stateM) {
      event.intent = stateM[1];
      event.step = stateM[2];
      event.defects = +stateM[3];
      event.startVotes = +stateM[4];
      event.stopVotes = +stateM[5];
      event.vetos = +stateM[6];
    }

    events.push(event);
  }

  return events.sort(sortByTs);
}

export function parseLogsByType(filesByType) {
  const ocppRaw = (filesByType.ocpp || []).join('\n');
  const userRaw = (filesByType.user || []).join('\n');
  const cpRaw = (filesByType.cp || []).join('\n');

  return {
    ocppEvents: ocppRaw ? parseOcppLog(ocppRaw) : [],
    userEvents: userRaw ? parseUserLog(userRaw) : [],
    cpEvents: cpRaw ? parseCpLog(cpRaw) : [],
  };
}
