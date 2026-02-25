import { useCallback, useEffect, useMemo, useState } from 'react';
import AnomalyView from './components/AnomalyView';
import { Badge } from './components/Badge';
import MultiUploadZone from './components/MultiUploadZone';
import PasteZone from './components/PasteZone';
import SessionDetail from './components/SessionDetail';
import SessionList from './components/SessionList';
import TimelineView from './components/TimelineView';
import { analyzeLogs, listVendors } from './logforge';
import { SOURCE_LABEL, T } from './tokens';
import { fmtDate } from './utils/format';

const ICON_BY_LOGTYPE = {
  ocpp: '📡',
  user: '👤',
  cp: '🔩',
  operations: '🧰',
  guipresenter: '🖥️',
  powermanagement: '⚡',
};

export default function App() {
  const vendors = useMemo(() => listVendors(), []);
  const [vendorId, setVendorId] = useState(vendors[0]?.id || 'abl');
  const vendor = useMemo(() => vendors.find((v) => v.id === vendorId) || vendors[0], [vendorId, vendors]);
  const model = vendor?.models?.[0];

  const [filesByType, setFilesByType] = useState({});
  const [tab, setTab] = useState('sessions');
  const [selectedSession, setSelectedSession] = useState(null);

  const logTypes = model?.logTypes || [];
  const sourceAliases = useMemo(() => {
    if (vendor.id === 'etrel') {
      return { ocpp: 'Operations', user: 'GuiPresenter', cp: 'PowerMgmt' };
    }
    return { ocpp: 'OCPP', user: 'USER', cp: 'CP' };
  }, [vendor.id]);


  const analysis = useMemo(() => {
    const textByType = Object.fromEntries(Object.entries(filesByType).map(([k, files]) => [k, files.map((f) => f.text)]));
    return analyzeLogs({ vendorId: vendor.id, filesByType: textByType });
  }, [filesByType, vendor.id]);

  const { sessions, events } = analysis;
  const { ocppEvents, userEvents, cpEvents } = events;

  const totalAnomalies = useMemo(() => sessions.reduce((s, x) => s + x.anomalies.length, 0), [sessions]);
  const criticalAnomalies = useMemo(() => sessions.reduce((s, x) => s + x.anomalies.filter((a) => a.severity === 'critical').length, 0), [sessions]);
  const connectors = useMemo(() => [...new Set(sessions.map((s) => s.connector))].sort((a, b) => a - b), [sessions]);

  const addFiles = useCallback((type) => (newFiles) => {
    setFilesByType((prev) => ({ ...prev, [type]: [...(prev[type] || []), ...newFiles] }));
  }, []);

  const removeFile = useCallback((type) => (id) => {
    setFilesByType((prev) => ({ ...prev, [type]: (prev[type] || []).filter((f) => f.id !== id) }));
  }, []);

  const onPaste = useCallback((type, text) => {
    const file = { id: `paste_${Date.now()}`, name: `paste-${new Date().toISOString().slice(11, 19)}`, text, lineCount: text.split('\n').length };
    setFilesByType((prev) => ({ ...prev, [type]: [...(prev[type] || []), file] }));
  }, []);

  const isReady = useMemo(() => Object.values(filesByType).some((files) => files?.length > 0), [filesByType]);
  const totalFiles = useMemo(() => Object.values(filesByType).reduce((sum, files) => sum + (files?.length || 0), 0), [filesByType]);


  useEffect(() => {
    if (!sessions.length) {
      setSelectedSession(null);
      return;
    }
    setSelectedSession((prev) => sessions.find((s) => s.id === prev?.id) || sessions[0]);
  }, [sessions]);

  const dateSpan = useMemo(() => {
    const allTs = [...ocppEvents, ...userEvents, ...cpEvents]
      .map((e) => e.ts)
      .filter(Boolean)
      .sort((a, b) => a - b);
    if (allTs.length < 2) return null;
    const days = Math.ceil((allTs[allTs.length - 1] - allTs[0]) / 86400000);
    return { from: fmtDate(allTs[0]), to: fmtDate(allTs[allTs.length - 1]), days };
  }, [cpEvents, ocppEvents, userEvents]);

  const mainTabStyle = (t) => ({
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${tab === t ? T.amber : 'transparent'}`,
    color: tab === t ? T.amber : T.textDim,
    fontFamily: 'inherit',
    transition: 'all .15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: T.bg, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px', color: T.amber }}>LogForge</span>
          <Badge color={T.textMuted} style={{ fontSize: 10 }}>{vendor.label} · OCPP 1.6</Badge>
          <select
            value={vendorId}
            onChange={(e) => {
              setVendorId(e.target.value);
              setFilesByType({});
              setSelectedSession(null);
            }}
            style={{
              background: T.bg,
              color: T.text,
              border: `1px solid ${T.borderLight}`,
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} · {v.models?.[0]?.label || 'Model'}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 12, alignItems: 'center' }}>
          {isReady && (
            <>
              <span style={{ color: T.textDim }}><span style={{ color: T.text, fontWeight: 600 }}>{totalFiles}</span> file{totalFiles !== 1 ? 's' : ''}</span>
              <span style={{ color: T.textDim }}><span style={{ color: T.text, fontWeight: 600 }}>{sessions.length}</span> sessions</span>
              <span style={{ color: T.textDim }}><span style={{ color: T.text, fontWeight: 600 }}>{connectors.length}</span> connectors</span>
              {dateSpan && dateSpan.days > 0 && <Badge color={T.textDim}>{dateSpan.days + 1}d span</Badge>}
              {criticalAnomalies > 0 && <span style={{ color: T.red, fontWeight: 600 }}>⚠ {criticalAnomalies} critical</span>}
              {totalAnomalies > 0 && criticalAnomalies === 0 && <span style={{ color: T.orange }}>{totalAnomalies} warnings</span>}
              {totalAnomalies === 0 && <span style={{ color: T.green }}>✓ No anomalies</span>}
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '10px 20px', borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0, maxHeight: 210, overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          {logTypes.map((logType) => (
            <MultiUploadZone
              key={logType.id}
              label={logType.label || `${SOURCE_LABEL[logType.id]} Log`}
              source={logType.id}
              icon={ICON_BY_LOGTYPE[logType.id] || '📄'}
              files={filesByType[logType.id] || []}
              onAddFiles={addFiles(logType.id)}
              onRemoveFile={removeFile(logType.id)}
            />
          ))}
        </div>
        <PasteZone logTypes={logTypes} onPaste={onPaste} />
      </div>

      {!isReady ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: T.textMuted }}>
          <span style={{ fontSize: 48 }}>⚡</span>
          <div style={{ fontSize: 16, color: T.textDim }}>Upload log files to begin analysis</div>
          <div style={{ fontSize: 13 }}>Supports vendor-specific OCPP/USER/CP-equivalent logs</div>
          <div style={{ fontSize: 12, color: T.textMuted }}>Multi-file upload supported — drop multiple days at once</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0, paddingLeft: 8 }}>
            {['sessions', 'timeline', 'anomalies'].map((t) => (
              <button key={t} style={mainTabStyle(t)} onClick={() => setTab(t)}>
                {t === 'anomalies' && totalAnomalies > 0 ? `Anomalies (${totalAnomalies})` : t.charAt(0).toUpperCase() + t.slice(1)}
                {t === 'sessions' && ` (${sessions.length})`}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
            {tab === 'sessions' && (
              <>
                <div style={{ width: 280, borderRight: `1px solid ${T.border}`, overflow: 'auto', flexShrink: 0, background: T.surface }}>
                  <SessionList sessions={sessions} selectedSession={selectedSession} onSelectSession={setSelectedSession} />
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  {selectedSession ? (
                    <SessionDetail key={selectedSession.id} session={selectedSession} sourceAliases={sourceAliases} />
                  ) : (
                    <div style={{ padding: 40, color: T.textMuted, fontSize: 13, textAlign: 'center', marginTop: 60 }}>Select a session to inspect</div>
                  )}
                </div>
              </>
            )}
            {tab === 'timeline' && (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <TimelineView ocppEvents={ocppEvents} userEvents={userEvents} cpEvents={cpEvents} sourceAliases={sourceAliases} />
              </div>
            )}
            {tab === 'anomalies' && (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <AnomalyView sessions={sessions} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
