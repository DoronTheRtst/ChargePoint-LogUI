import { useMemo, useState } from 'react';
import { ACTION_LABELS, SEV_COLOR, SOURCE_COLOR, SOURCE_LABEL, T } from '../tokens';
import { fmt, fmtDur, fmtTime } from '../utils/format';
import { Badge, ConnectorBadge, SeverityIcon } from './Badge';
import MeterChart from './MeterChart';
import { extractReadings } from '../logforge/core/sessionBuilder';

export default function SessionDetail({ session, sourceAliases = {} }) {
  const [tab, setTab] = useState('overview');

  const allEvents = useMemo(() => {
    const evs = [];
    for (const e of session.ocppEvents) {
      if (e.type !== 'message') continue;
      const label =
        e.dir === 'OUT'
          ? e.action
            ? `${ACTION_LABELS[e.action] || e.action} →`
            : 'Response →'
          : e.action
            ? `← ${ACTION_LABELS[e.action] || e.action}`
            : '← Response';
      const detail =
        e.action === 'StatusNotification'
          ? e.params?.status
          : e.action === 'Authorize'
            ? e.params?.idTag
            : e.action === 'MeterValues'
              ? (() => {
                  const readings = extractReadings(e.params);
                  const r = readings.find((x) => x.energy !== undefined);
                  return r ? `${r.energy} kWh` : null;
                })()
              : null;
      evs.push({ ts: e.ts, source: 'ocpp', label, detail, severity: e.errorCode ? 'critical' : null });
    }
    for (const e of session.userEvents) {
      evs.push({ ts: e.ts, source: 'user', label: e.type.replace('CHARGEPOINT_', '').replace(/_/g, ' '), detail: e.extra || null });
    }
    for (const e of session.cpEvents.filter((x) => x.intent && x.intent !== session.cpEvents[0]?.intent)) {
      evs.push({
        ts: e.ts,
        source: 'cp',
        label: e.step ? `${e.intent} / ${e.step}` : `${e.intent}`,
        detail: e.defects > 0 ? `defects:${e.defects}` : e.vetos > 0 ? `vetos:${e.vetos}` : null,
      });
    }
    return evs.sort((a, b) => a.ts - b.ts);
  }, [session]);

  const dur = session.stopTs ? session.stopTs - session.startTs : null;
  const tabStyle = (t) => ({
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    background: tab === t ? `${T.amber}20` : 'none',
    border: `1px solid ${tab === t ? T.amber : T.border}`,
    borderRadius: 6,
    color: tab === t ? T.amber : T.textDim,
    fontFamily: 'inherit',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }} className="fade-in">
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <ConnectorBadge connector={session.connector} />
          <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
            tx#{session.transactionId}
          </span>
          <span className="mono" style={{ fontSize: 12, color: T.textDim }}>
            {session.idTag}
          </span>
          {session.anomalies.filter((a) => a.severity === 'critical').length > 0 && (
            <Badge color={T.red}>{session.anomalies.filter((a) => a.severity === 'critical').length} critical</Badge>
          )}
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13, color: T.textDim, flexWrap: 'wrap' }}>
          <span>
            Start: <span style={{ color: T.text }} className="mono">{fmt(session.startTs)}</span>
          </span>
          <span>
            Stop: <span style={{ color: T.text }} className="mono">{fmt(session.stopTs)}</span>
          </span>
          <span>
            Duration: <span style={{ color: T.text }}>{fmtDur(dur)}</span>
          </span>
          <span>
            Energy:{' '}
            <span style={{ color: session.energyDelivered > 0 ? T.green : T.red }}>
              {session.energyDelivered != null ? `${session.energyDelivered.toFixed(3)} kWh` : '—'}
            </span>
          </span>
          <span>
            Reason: <span style={{ color: T.text }} className="mono">{session.stopReason || '—'}</span>
          </span>
        </div>
        {session.statusHistory.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {session.statusHistory.map((s, i) => {
              const c =
                s.status === 'Charging'
                  ? T.green
                  : s.status === 'SuspendedEV'
                    ? T.orange
                    : s.status === 'Preparing'
                      ? T.amber
                      : s.status === 'Finishing'
                        ? T.purple
                        : T.textDim;
              return (
                <span key={`${s.ts}_${s.status}`} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {i > 0 && <span style={{ color: T.textMuted }}>→</span>}
                  <Badge color={c}>{s.status}</Badge>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {session.anomalies.length > 0 && (
        <div style={{ padding: '8px 20px', background: `${T.red}08`, borderBottom: `1px solid ${T.red}22`, flexShrink: 0 }}>
          {session.anomalies.map((a, i) => (
            <div key={`${a.type}_${a.ts}_${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: i < session.anomalies.length - 1 ? 4 : 0 }}>
              <SeverityIcon severity={a.severity} />
              <span style={{ color: SEV_COLOR[a.severity] || T.textDim }}>{a.message}</span>
              {a.ts && <span className="mono" style={{ color: T.textMuted, fontSize: 11 }}>{fmtTime(a.ts)}</span>}
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '10px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 6, flexShrink: 0 }}>
        {['overview', 'events', 'raw'].map((t) => (
          <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 20px' }}>
        {tab === 'overview' && <MeterChart readings={session.meterReadings} />}
        {tab === 'events' && (
          <div>
            {allEvents.map((ev, i) => (
              <div key={`${ev.source}_${ev.ts}_${i}`} style={{ display: 'grid', gridTemplateColumns: '90px 60px 1fr auto', gap: 8, padding: '5px 0', borderBottom: `1px solid ${T.border}22`, fontSize: 12, alignItems: 'center' }}>
                <span className="mono" style={{ color: T.textMuted, fontSize: 11 }}>{fmtTime(ev.ts)}</span>
                <Badge color={SOURCE_COLOR[ev.source]}>{sourceAliases[ev.source] || SOURCE_LABEL[ev.source]}</Badge>
                <span style={{ color: ev.severity ? SEV_COLOR[ev.severity] : T.text }}>{ev.label}</span>
                {ev.detail && <span className="mono" style={{ color: T.textDim, fontSize: 11 }}>{ev.detail}</span>}
              </div>
            ))}
          </div>
        )}
        {tab === 'raw' && (
          <div>
            <div style={{ fontSize: 11, color: T.textDim, marginBottom: 10 }}>
              OCPP messages for this session ({session.ocppEvents.filter((e) => e.type === 'message').length})
            </div>
            {session.ocppEvents
              .filter((e) => e.type === 'message')
              .map((e, i) => (
                <div key={`${e.msgId}_${i}`} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.textMuted, lineHeight: 1.6, marginBottom: 2, wordBreak: 'break-all' }}>
                  <span style={{ color: e.dir === 'OUT' ? T.ocpp : T.green }}>{e.dir}</span>{' '}
                  <span style={{ color: T.amber }}>{fmtTime(e.ts)}</span>{' '}
                  <span style={{ color: T.text }}>{e.raw.length > 200 ? `${e.raw.slice(0, 200)}…` : e.raw}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
