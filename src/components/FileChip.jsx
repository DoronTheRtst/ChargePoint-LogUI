export default function FileChip({ name, lineCount, color, onRemove }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 4px 2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontFamily: "'IBM Plex Mono', monospace",
        background: `${color}15`,
        border: `1px solid ${color}33`,
        color,
      }}
    >
      <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      <span style={{ color: `${color}99`, fontSize: 10 }}>{lineCount.toLocaleString()}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={{
          background: 'none',
          border: 'none',
          color: `${color}88`,
          cursor: 'pointer',
          fontSize: 13,
          padding: '0 3px',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        ×
      </button>
    </span>
  );
}
