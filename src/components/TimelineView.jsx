import { useEffect, useMemo, useState } from 'react';
import { SOURCE_COLOR, SOURCE_LABEL, T } from '../tokens';
import { fmt, fmtDate } from '../utils/format';
import { Badge, ConnectorBadge } from './Badge';
import TimelineBrush from './TimelineBrush';

export default function TimelineView({ ocppEvents, userEvents, cpEvents, sourceAliases = {} }) {
  const [filterSource, setFilterSource] = useState(['ocpp', 'user', 'cp']);
  const [filterConnector, setFilterConnector] = useState('all');
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(Infinity);

  const connectors = useMemo(() => {
    const s = new Set();
    [...ocppEvents, ...userEvents, ...cpEvents].forEach((e) => {
      const c = e.params?.connectorId || e.connector;
      if (c) s.add(c);
    });
    return [...s].sort((a, b) => a - b);
  }, [cpEvents, ocppEvents, userEvents]);

  const allEventsRaw = useMemo(() => {
    const all = [];
    for (const e of ocppEvents) if (e.ts) all.push(e.ts);
    for (const e of userEvents) if (e.ts) all.push(e.ts);
    for (const e of cpEvents) if (e.ts) all.push(e.ts);
    return all.sort((a, b) => a - b);
  }, [cpEvents, ocppEvents, userEvents]);

  const timeMin = allEventsRaw[0] || 0;
  const rawTimeMax = allEventsRaw[allEventsRaw.length - 1] || 1;
  const timeMax = rawTimeMax <= timeMin ? timeMin + 60000 : rawTimeMax;

  useEffect(() => {
    if (allEventsRaw.length > 0) {
      setRangeStart(timeMin);
      setRangeEnd(timeMax);
    }
  }, [allEventsRaw.length, timeMax, timeMin]);

  const buckets = useMemo(() => {
    const N = 120;
    const span = timeMax - timeMin || 1;
    const bw = span / N;
    const b = Array.from({ length: N }, (_, i) => ({ ts: timeMin + i * bw, count: 0 }));
    for (const ts of allEventsRaw) {
      const idx = Math.min(N - 1, Math.floor((ts - timeMin) / bw));
      b[idx].count += 1;
    }
    return b;
  }, [allEventsRaw, timeMax, timeMin]);

  const events = useMemo(() => {
    const all = [];
    for (const e of ocppEvents) {
      if (e.type !== 'message') continue;
      if (e.ts < rangeStart || e.ts > rangeEnd) continue;
      const conn = e.params?.connectorId || null;
      if (filterConnector !== 'all' && conn !== parseInt(filterConnector, 10)) continue;
      if (!filterSource.includes('ocpp')) continue;
      all.push({
        ts: e.ts,
        source: 'ocpp',
        connector: conn,
        label: e.action || (e.msgType === 3 ? 'Response' : 'Error'),
        detail: e.params?.status || e.params?.idTag || '',
      });
    }
    for (const e of userEvents) {
      if (e.ts < rangeStart || e.ts > rangeEnd) continue;
      if (!filterSource.includes('user')) continue;
      if (filterConnector !== 'all' && e.connector !== parseInt(filterConnector, 10)) continue;
      all.push({ ts: e.ts, source: 'user', connector: e.connector, label: e.type.replace('CHARGEPOINT_', '').replace(/_/g, ' '), detail: e.extra });
    }
    for (const e of cpEvents) {
      if (e.ts < rangeStart || e.ts > rangeEnd) continue;
      if (!filterSource.includes('cp')) continue;
      if (filterConnector !== 'all' && e.connector !== parseInt(filterConnector, 10)) continue;
      if (e.type === 'state_update' && e.intent) {
        const detail = e.vetos !== undefined || e.defects !== undefined
          ? `vetos:${e.vetos ?? 0} def:${e.defects ?? 0}`
          : e.state || null;
        all.push({ ts: e.ts, source: 'cp', connector: e.connector, label: `${e.intent}`, detail });
      } else if (e.type === 'meter_sample' || e.type === 'warn' || e.type === 'error') {
        const detail = e.transactionId || (e.energy !== undefined ? `${e.energy} kWh` : null);
        all.push({ ts: e.ts, source: 'cp', connector: e.connector, label: e.type, detail });
      }
    }
    return all.sort((a, b) => a.ts - b.ts);
  }, [cpEvents, filterConnector, filterSource, ocppEvents, rangeEnd, rangeStart, userEvents]);

  const inRangeCount = events.length;
  const dateRange = allEventsRaw.length > 0 ? `${fmtDate(timeMin)} → ${fmtDate(rawTimeMax)}` : '';
  const sourceKeys = ['ocpp', 'user', 'cp'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        {sourceKeys.map((s) => (
          <button
            key={s}
            onClick={() => setFilterSource((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
            style={{
              background: filterSource.includes(s) ? `${SOURCE_COLOR[s]}22` : 'none',
              border: `1px solid ${filterSource.includes(s) ? SOURCE_COLOR[s] : T.border}`,
              color: filterSource.includes(s) ? SOURCE_COLOR[s] : T.textMuted,
              padding: '3px 12px',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
            }}
          >
            {sourceAliases[s] || SOURCE_LABEL[s]}
          </button>
        ))}
        <select value={filterConnector} onChange={(e) => setFilterConnector(e.target.value)} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, padding: '3px 10px', borderRadius: 5, fontSize: 12, fontFamily: 'inherit' }}>
          <option value="all">All connectors</option>
          {connectors.map((c) => (
            <option key={c} value={c}>
              Connector {c}
            </option>
          ))}
        </select>
        <span className="mono" style={{ fontSize: 11, color: T.textMuted, marginLeft: 'auto' }}>
          {dateRange}
        </span>
      </div>

      {allEventsRaw.length > 0 && (
        <div style={{ padding: '10px 20px 6px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.textDim, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Timeframe — drag to pan, handles to resize</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 11, color: T.amber }}>{inRangeCount.toLocaleString()} events in view</span>
              <span style={{ color: T.textMuted, fontSize: 11 }}>/ {allEventsRaw.length.toLocaleString()} total</span>
              <button onClick={() => { setRangeStart(timeMin); setRangeEnd(timeMax); }} style={{ background: 'none', border: `1px solid ${T.border}`, color: T.textDim, padding: '1px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                Reset
              </button>
            </div>
          </div>
          <TimelineBrush timeMin={timeMin} timeMax={timeMax} rangeStart={rangeStart} rangeEnd={rangeEnd} buckets={buckets} onRangeChange={(s, e) => { setRangeStart(s); setRangeEnd(e); }} />
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {events.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: T.textMuted, fontSize: 13 }}>No events in selected timeframe. Try widening the range.</div>}
        {events.slice(0, 2000).map((ev, i) => (
          <div key={`${ev.source}_${ev.ts}_${i}`} style={{ display: 'grid', gridTemplateColumns: '130px 52px 60px 1fr', gap: 10, padding: '4px 20px', borderBottom: `1px solid ${T.border}18`, fontSize: 12, alignItems: 'center', background: i % 2 === 0 ? 'transparent' : `${T.surface}80` }}>
            <span className="mono" style={{ color: T.textMuted, fontSize: 11 }}>{fmt(ev.ts)}</span>
            {ev.connector ? <ConnectorBadge connector={ev.connector} /> : <span />}
            <Badge color={SOURCE_COLOR[ev.source]}>{sourceAliases[ev.source] || SOURCE_LABEL[ev.source]}</Badge>
            <span style={{ color: T.text }}>
              {ev.label}
              {ev.detail && (
                <span style={{ color: T.textDim, marginLeft: 8, fontSize: 11 }} className="mono">
                  {ev.detail}
                </span>
              )}
            </span>
          </div>
        ))}
        {events.length > 2000 && <div style={{ padding: '12px 20px', fontSize: 12, color: T.textMuted, textAlign: 'center' }}>Showing first 2,000 of {events.length.toLocaleString()} events. Narrow the timeframe for more detail.</div>}
      </div>
    </div>
  );
}
