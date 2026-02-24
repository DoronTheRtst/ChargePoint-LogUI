import { buildSessions } from './core/sessionBuilder';
import { runAnomalyRules, universalRules } from './core/anomalyEngine';
import { getVendorPlugin, listVendors } from './vendors';

export function analyzeLogs({ vendorId, filesByType }) {
  const plugin = getVendorPlugin(vendorId);
  if (!plugin) {
    throw new Error(`Unknown vendor plugin: ${vendorId}`);
  }

  const { ocppEvents, userEvents, cpEvents } = plugin.parseLogsByType(filesByType);
  const sessions = buildSessions(ocppEvents, userEvents, cpEvents).map((session) =>
    runAnomalyRules(session, [...universalRules(), ...plugin.anomalyRules()]),
  );

  return {
    plugin,
    events: { ocppEvents, userEvents, cpEvents },
    sessions,
  };
}

export { listVendors };
