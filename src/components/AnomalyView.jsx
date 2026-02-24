import { useMemo } from 'react';
import { SEV_COLOR, T } from '../tokens';
import { fmt } from '../utils/format';
import { Badge, ConnectorBadge, SeverityIcon } from './Badge';

export default function AnomalyView({ sessions }) {
  const allAnomalies = useMemo(() => {
    const out = [];
    for (const s of sessions) {
      for (const a of s.anomalies) out.push({ ...a, session: s });
    }
    return out.sort((a, b) => {
      const sevOrder = { critical: 0, warning: 1, info: 2 };
      return (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3);
    });
  }, [sessions]);

  if (allAnomalies.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: T.textMuted }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <div>No anomalies detected</div>
      </div>
    );
  }

  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      {allAnomalies.map((a, i) => (
        <div
          key={`${a.type}_${a.ts}_${i}`}
          style={{
            display: 'flex',
            gap: 14,
            padding: '12px 20px',
            borderBottom: `1px solid ${T.border}`,
            borderLeft: `3px solid ${SEV_COLOR[a.severity] || T.textDim}`,
            background: `${SEV_COLOR[a.severity] || T.surface}06`,
          }}
        >
          <SeverityIcon severity={a.severity} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <Badge color={SEV_COLOR[a.severity]}>{a.severity}</Badge>
              <Badge color={T.textDim} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>{a.type}</Badge>
              <ConnectorBadge connector={a.session.connector} />
              <span className="mono" style={{ fontSize: 11, color: T.textMuted }}>tx#{a.session.transactionId}</span>
            </div>
            <div style={{ fontSize: 13, color: T.text }}>{a.message}</div>
            {a.ts && <div className="mono" style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{fmt(a.ts)}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
