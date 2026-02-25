import { useCallback, useRef, useState } from 'react';
import { SOURCE_COLOR, T } from '../tokens';
import { Badge } from './Badge';
import FileChip from './FileChip';

export default function MultiUploadZone({ label, source, icon, files, onAddFiles, onRemoveFile }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const color = SOURCE_COLOR[source] || T.textDim;
  const loaded = files.length > 0;
  const totalLines = files.reduce((s, f) => s + f.lineCount, 0);

  const processFiles = useCallback(
    (fileList) => {
      const newFiles = [];
      let pending = fileList.length;
      for (const file of fileList) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target.result;
          const lines = text.split('\n').length;
          newFiles.push({
            name: file.name,
            text,
            lineCount: lines,
            id: `${file.name}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          });
          pending -= 1;
          if (pending === 0) onAddFiles(newFiles);
        };
        reader.readAsText(file);
      }
    },
    [onAddFiles],
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDrag(false);
      if (e.dataTransfer.files.length) processFiles([...e.dataTransfer.files]);
    },
    [processFiles],
  );

  const onChange = useCallback(
    (e) => {
      if (e.target.files.length) processFiles([...e.target.files]);
      e.target.value = '';
    },
    [processFiles],
  );

  const borderC = loaded ? color : drag ? T.amber : T.border;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        flex: 1,
        minHeight: 56,
        border: `1px dashed ${borderC}`,
        borderRadius: 8,
        cursor: 'pointer',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        background: loaded ? `${color}08` : drag ? `${T.amber}08` : T.surface,
        transition: 'all .15s ease',
        userSelect: 'none',
      }}
    >
      <input ref={inputRef} type="file" accept=".log,.txt,.csv" multiple onChange={onChange} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: 13, color: loaded ? color : T.text }}>{label}</span>
        {loaded && (
          <Badge color={color}>
            {files.length} file{files.length > 1 ? 's' : ''} · {totalLines.toLocaleString()} lines
          </Badge>
        )}
        {!loaded && <span style={{ fontSize: 11, color: T.textMuted }}>Drop files or click · multi-select OK</span>}
      </div>
      {loaded && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxHeight: 86, overflow: 'auto', paddingRight: 4 }}>
          {files.map((f) => (
            <FileChip key={f.id} name={f.name} lineCount={f.lineCount} color={color} onRemove={() => onRemoveFile(f.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
