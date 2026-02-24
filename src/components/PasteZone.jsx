import { useState } from 'react';
import { SOURCE_COLOR, SOURCE_LABEL, T } from '../tokens';

export default function PasteZone({ logTypes, onPaste }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [type, setType] = useState(logTypes[0]?.id || 'ocpp');

  const submit = () => {
    if (text.trim()) {
      onPaste(type, text);
      setText('');
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'none',
          border: `1px solid ${T.border}`,
          color: T.textDim,
          padding: '6px 14px',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 12,
          fontFamily: 'inherit',
        }}
      >
        + Paste raw log
      </button>
    );
  }

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: T.textDim }}>Log type:</span>
        {logTypes.map((logType) => (
          <button
            key={logType.id}
            onClick={() => setType(logType.id)}
            style={{
              background: type === logType.id ? `${SOURCE_COLOR[logType.id]}22` : 'none',
              border: `1px solid ${type === logType.id ? SOURCE_COLOR[logType.id] : T.border}`,
              color: type === logType.id ? SOURCE_COLOR[logType.id] : T.textDim,
              padding: '3px 12px',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
            }}
          >
            {SOURCE_LABEL[logType.id] || logType.label}
          </button>
        ))}
        <button
          onClick={() => setOpen(false)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 16 }}
        >
          ✕
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Paste log content here..."
        style={{
          width: '100%',
          background: T.surface,
          border: `1px solid ${T.border}`,
          color: T.text,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          padding: 10,
          borderRadius: 6,
          resize: 'vertical',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={submit}
          style={{
            background: T.amber,
            color: '#000',
            border: 'none',
            padding: '6px 16px',
            borderRadius: 5,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        >
          Parse
        </button>
      </div>
    </div>
  );
}
