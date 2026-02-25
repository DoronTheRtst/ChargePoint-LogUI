import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { T } from '../tokens';
import { fmtTime } from '../utils/format';

export function getEnergyYAxisDomain(readings) {
  const energies = readings.filter((r) => r.energy !== undefined).map((r) => r.energy);
  if (energies.length === 0) return ['auto', 'auto'];

  const min = Math.min(...energies);
  const max = Math.max(...energies);
  const range = max - min;

  if (range === 0) {
    const pad = Math.max(0.2, Math.abs(min) * 0.01);
    return [min - pad, max + pad];
  }

  const pad = Math.max(0.05, range * 0.15);
  return [min - pad, max + pad];
}

export default function MeterChart({ readings }) {
  const data = useMemo(
    () =>
      readings
        .filter((r) => r.energy !== undefined)
        .sort((a, b) => a.ts - b.ts)
        .map((r) => ({
          t: fmtTime(r.ts),
          energy: r.energy,
          power: r.power != null ? r.power / 1000 : undefined,
          bodyL1: r.currentL1Body,
          outL1: r.currentL1Out,
        })),
    [readings],
  );

  if (data.length === 0) return <div style={{ color: T.textMuted, fontSize: 13, padding: 20 }}>No meter readings</div>;

  const energyYAxisDomain = getEnergyYAxisDomain(readings);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        <div style={{ color: T.textDim, marginBottom: 4 }}>{label}</div>
        {payload.map((p) => (
          <div key={p.name} style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, color: T.textDim, marginBottom: 8, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Energy (kWh) — Outlet
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="t" tick={{ fill: T.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' }} interval="preserveStartEnd" />
            <YAxis
              domain={energyYAxisDomain}
              allowDataOverflow
              tick={{ fill: T.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="energy" stroke={T.amber} strokeWidth={2} dot={false} name="kWh" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div style={{ fontSize: 11, color: T.textDim, marginBottom: 8, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Power (kW) & Current L1 (A)
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="t" tick={{ fill: T.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: T.textMuted, fontSize: 10, fontFamily: 'IBM Plex Mono' }} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="power" stroke={T.ocpp} strokeWidth={1.5} dot={false} name="kW (outlet)" />
            <Line type="monotone" dataKey="outL1" stroke={T.green} strokeWidth={1.5} dot={false} name="I-L1 out" />
            <Line type="monotone" dataKey="bodyL1" stroke={T.purple} strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="I-L1 body" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
