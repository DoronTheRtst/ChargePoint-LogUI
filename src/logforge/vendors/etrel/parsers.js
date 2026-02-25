import { sortByTs } from '../../core/time';

function parseEtrelTimestamp(str) {
  const m = str.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return 0;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], 0);
}

function normalizeOcppPayload(ts, dir, raw, payloadText) {
  try {
    const payload = JSON.parse(payloadText);
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

    return {
      ts,
      source: 'ocpp',
      type: 'message',
      dir,
      msgType,
      msgId,
      action,
      params,
      result,
      errorCode,
      errorDesc,
      raw,
    };
  } catch {
    return {
      ts,
      source: 'ocpp',
      type: 'parse_error',
      dir,
      raw,
    };
  }
}

function extractConnectorFromText(text) {
  const m = text.match(/(?:evse|connector|ConnectorLogic\s+)(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

export function parseOperationsLog(text) {
  const ocppEvents = [];
  const userEvents = [];

  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;

    const lineM = t.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+(\w+)\s+<[^>]+>\s+\[([^\]]+)\] - (.+)$/);
    if (!lineM) continue;

    const ts = parseEtrelTimestamp(lineM[1]);
    const level = lineM[2];
    const component = lineM[3];
    const message = lineM[4];

    if (component === 'OcppClient') {
      const ocppM = message.match(/^(Sent|Received):\s+(.+)$/);
      if (!ocppM) continue;

      const dir = ocppM[1] === 'Sent' ? 'OUT' : 'IN';
      ocppEvents.push(normalizeOcppPayload(ts, dir, t, ocppM[2]));
      continue;
    }

    if (level === 'Error' || level === 'Warn') {
      userEvents.push({
        ts,
        source: 'user',
        type: component.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        level,
        connector: extractConnectorFromText(`${component} ${message}`),
        extra: message,
        raw: t,
      });
    }
  }

  return { ocppEvents: ocppEvents.sort(sortByTs), userEvents: userEvents.sort(sortByTs) };
}

export function parseGuiPresenterLog(text) {
  const events = [];

  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;

    const m = t.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+(\w+)\s+<[^>]+>\s+\[([^\]]+)\] - (.+)$/);
    if (!m) continue;

    const ts = parseEtrelTimestamp(m[1]);
    const level = m[2];
    const component = m[3];
    const message = m[4];

    const duoM = message.match(/\b(Duo_[A-Za-z0-9_]+)/);
    const type = duoM ? duoM[1] : `GUI_${component.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;

    events.push({
      ts,
      source: 'user',
      type,
      level,
      connector: extractConnectorFromText(message),
      extra: `${component}: ${message}`,
      raw: t,
    });
  }

  return events.sort(sortByTs);
}

function parsePowerManagementBlock(lines, ts) {
  const events = [];
  let current = null;

  const flushCurrent = () => {
    if (!current || !current.connector) return;
    events.push({
      ts,
      source: 'cp',
      type: 'state_update',
      connector: current.connector,
      intent: current.intent || current.state,
      state: current.state,
      targetA: current.targetA,
      currentL1: current.currentL1,
      currentL2: current.currentL2,
      currentL3: current.currentL3,
      raw: current.raw.join(' | '),
    });
  };

  for (const line of lines) {
    const connectorM = line.match(/^\s+(\d+)\/(\d+)$/);
    if (connectorM) {
      flushCurrent();
      current = {
        connector: parseInt(connectorM[2], 10),
        raw: [line.trim()],
      };
      continue;
    }

    if (!current) continue;
    current.raw.push(line.trim());

    const stateM = line.match(/State:\s+([^\{]+)\{([^\}]+)\}/);
    if (stateM) {
      current.state = stateM[1].trim();
      current.intent = stateM[2].trim();
    }

    const targetM = line.match(/Target:\s+([0-9.]+)\s*A/);
    if (targetM) {
      current.targetA = parseFloat(targetM[1]);
    }

    const currentM = line.match(/Current:\s+\(([0-9.-]+),\s*([0-9.-]+),\s*([0-9.-]+)\)\s*A/);
    if (currentM) {
      current.currentL1 = parseFloat(currentM[1]);
      current.currentL2 = parseFloat(currentM[2]);
      current.currentL3 = parseFloat(currentM[3]);
    }
  }

  flushCurrent();
  return events;
}

export function parsePowerManagementLog(text) {
  const events = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i] || '';
    const t = raw.trimEnd();
    if (!t) continue;

    const lineM = t.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+(\w+)\s+<[^>]+>\s+\[([^\]]+)\] - (.+)$/);
    if (!lineM) continue;

    const ts = parseEtrelTimestamp(lineM[1]);
    const level = lineM[2];
    const component = lineM[3];
    const message = lineM[4];

    if (component === 'Scheduler' && message === 'Instant update result:') {
      const blockLines = [];
      let j = i + 1;
      for (; j < lines.length; j += 1) {
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\s+\w+\s+<[^>]+>\s+\[[^\]]+\] - /.test(lines[j])) {
          break;
        }
        blockLines.push(lines[j]);
      }
      events.push(...parsePowerManagementBlock(blockLines, ts));
      i = j - 1;
      continue;
    }

    if (level === 'Warn' || level === 'Error') {
      events.push({
        ts,
        source: 'cp',
        type: level === 'Warn' ? 'warn' : 'error',
        level,
        connector: extractConnectorFromText(`${component} ${message}`),
        raw: t,
      });
    }
  }

  return events.sort(sortByTs);
}

export function parseLogsByType(filesByType) {
  const operationsRaw = (filesByType.operations || []).join('\n');
  const guiRaw = (filesByType.guipresenter || []).join('\n');
  const powerRaw = (filesByType.powermanagement || []).join('\n');

  const operations = operationsRaw ? parseOperationsLog(operationsRaw) : { ocppEvents: [], userEvents: [] };
  const guiEvents = guiRaw ? parseGuiPresenterLog(guiRaw) : [];
  const powerEvents = powerRaw ? parsePowerManagementLog(powerRaw) : [];

  return {
    ocppEvents: operations.ocppEvents,
    userEvents: [...operations.userEvents, ...guiEvents].sort(sortByTs),
    cpEvents: powerEvents,
  };
}
