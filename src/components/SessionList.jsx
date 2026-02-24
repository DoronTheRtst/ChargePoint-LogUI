import { ConnectorBadge, Badge } from './Badge';
import { fmtDur, fmtTime } from '../utils/format';
import { T } from '../tokens';

function SessionItem({ session, selected, onClick }) {
  const dur = session.stopTs ? session.stopTs - session.startTs : null;
  const critCount = session.anomalies.filter((a) => a.severity === 'critical').length;
  const hasAnomaly = session.anomalies.length > 0;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${T.border}`,
        cursor: 'pointer',
        background: selected ? `${T.amber}10` : 'transparent',
        borderLeft: selected ? `3px solid ${T.amber}` : '3px solid transparent',
        transition: 'background .1s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <ConnectorBadge connector={session.connector} />
        <span className="mono" style={{ fontSize: 11, color: T.textDim }}>
          tx#{session.transactionId}
        </span>
        {critCount > 0 && <Badge color={T.red}>{critCount} ⚠</Badge>}
        {hasAnomaly && critCount === 0 && <Badge color={T.orange}>warn</Badge>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: T.textMuted }}>{fmtTime(session.startTs)}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: T.textDim }}>
        <span>{session.energyDelivered != null ? `${session.energyDelivered.toFixed(3)} kWh` : 'active'}</span>
        <span>{fmtDur(dur)}</span>
        <span className="mono" style={{ fontSize: 11 }}>
          {session.idTag}
        </span>
      </div>
    </div>
  );
}

export default function SessionList({ sessions, selectedSession, onSelectSession }) {
  if (sessions.length === 0) {
    return (
      <div style={{ padding: 20, fontSize: 13, color: T.textMuted }}>
        No complete sessions found in OCPP log.
        <br />
        <br />
        Sessions require StartTransaction + transactionId response.
      </div>
    );
  }

  return sessions.map((s) => (
    <SessionItem key={s.id} session={s} selected={selectedSession?.id === s.id} onClick={() => onSelectSession(s)} />
  ));
}
