import { SEV_COLOR, SOURCE_COLOR, SOURCE_LABEL, T } from '../tokens';

export function Badge({ children, color = T.textDim, bg, style }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 7px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "'IBM Plex Mono', monospace",
        letterSpacing: '0.04em',
        background: bg || `${color}22`,
        color,
        border: `1px solid ${color}44`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function SeverityIcon({ severity }) {
  const icons = { critical: '◉', warning: '◎', info: '○' };
  return <span style={{ color: SEV_COLOR[severity] || T.textDim, fontSize: 12 }}>{icons[severity] || '○'}</span>;
}

export function SourceBadge({ source }) {
  return <Badge color={SOURCE_COLOR[source]}>{SOURCE_LABEL[source]}</Badge>;
}

export function ConnectorBadge({ connector }) {
  const colors = ['', T.ocpp, T.green, T.orange, T.purple, T.amber, T.red, T.teal, '#a8b5c9'];
  const c = colors[connector] || T.textDim;
  return (
    <Badge color={c} style={{ minWidth: 52, justifyContent: 'center' }}>
      C{connector}
    </Badge>
  );
}
