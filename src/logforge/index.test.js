import { analyzeLogs, listVendors } from './index';

describe('logforge vendor plugin architecture', () => {
  test('registers ABL vendor plugin with model metadata', () => {
    const vendors = listVendors();
    expect(vendors.some((v) => v.id === 'abl')).toBe(true);
    expect(vendors.find((v) => v.id === 'abl').models[0].id).toBe('emh3');
    expect(vendors.some((v) => v.id === 'etrel')).toBe(true);
    expect(vendors.find((v) => v.id === 'etrel').models[0].id).toBe('inch-duo');
  });

  test('parses logs and builds session through the vendor facade', () => {
    const ocpp = [
      '2024-01-15 08:30:22,456 WS message OUT: [2,"abc123","StartTransaction",{"connectorId":1,"idTag":"TAG1","meterStart":1000}]',
      '2024-01-15 08:30:22,556 WS message IN: [3,"abc123",{"transactionId":42}]',
      '2024-01-15 08:31:00,000 WS message OUT: [2,"mv1","MeterValues",{"transactionId":42,"meterValue":[{"timestamp":"2024-01-15T08:31:00.000Z","sampledValue":[{"value":"1.0","measurand":"Energy.Active.Import.Register","location":"Outlet"},{"value":"0","measurand":"Power.Active.Import","location":"Outlet"}]}]}]',
      '2024-01-15 08:32:00,000 WS message OUT: [2,"mv2","MeterValues",{"transactionId":42,"meterValue":[{"timestamp":"2024-01-15T08:32:00.000Z","sampledValue":[{"value":"1.0","measurand":"Energy.Active.Import.Register","location":"Outlet"},{"value":"0","measurand":"Power.Active.Import","location":"Outlet"}]}]}]',
      '2024-01-15 08:33:00,000 WS message OUT: [2,"mv3","MeterValues",{"transactionId":42,"meterValue":[{"timestamp":"2024-01-15T08:33:00.000Z","sampledValue":[{"value":"1.0","measurand":"Energy.Active.Import.Register","location":"Outlet"},{"value":"0","measurand":"Power.Active.Import","location":"Outlet"}]}]}]',
      '2024-01-15 08:34:00,000 WS message OUT: [2,"stop1","StopTransaction",{"transactionId":42,"meterStop":1000,"reason":"EVDisconnected"}]',
    ].join('\n');

    const user = 'CHARGEPOINT_DEFCT_ADDED,WARN,1705307521000,Connector 1,Ground fault';
    const cp = '2024-01-15 08:31:22,456 INFO [ChargePoint-1] Intent=CHARGING Step=ACTIVE Defects=0 StartVotes=1 StopVotes=0 Vetos=1';

    const result = analyzeLogs({
      vendorId: 'abl',
      filesByType: {
        ocpp: [ocpp],
        user: [user],
        cp: [cp],
      },
    });

    expect(result.sessions).toHaveLength(1);
    const session = result.sessions[0];
    expect(session.transactionId).toBe(42);
    expect(session.connector).toBe(1);
    expect(session.anomalies.length).toBeGreaterThan(0);
    expect(session.anomalies.some((a) => a.type === 'DEFECT')).toBe(true);
    expect(session.anomalies.some((a) => a.type === 'CP_VETO')).toBe(true);
  });

  test('infers incomplete session for etrel from meter values with transaction id', () => {
    const operations = [
      '2026-02-25 00:00:49 Verb  <#70> [OcppClient] - Sent: [2,"m1","MeterValues",{"connectorId":2,"meterValue":[{"timestamp":"2026-02-25T00:00:47.738Z","sampledValue":[{"value":"35855.8","measurand":"Energy.Active.Import.Register","location":"Outlet"},{"value":"0","measurand":"Power.Active.Import","location":"Outlet"}]}],"transactionId":2027725}]',
      '2026-02-25 00:01:49 Verb  <#79> [OcppClient] - Sent: [2,"m2","MeterValues",{"connectorId":2,"meterValue":[{"timestamp":"2026-02-25T00:01:47.708Z","sampledValue":[{"value":"35856.0","measurand":"Energy.Active.Import.Register","location":"Outlet"},{"value":"0","measurand":"Power.Active.Import","location":"Outlet"}]}],"transactionId":2027725}]',
      '2026-02-25 00:01:49 Verb  <#79> [OcppClient] - Received: [3,"m2",{}]',
    ].join('\n');

    const result = analyzeLogs({
      vendorId: 'etrel',
      filesByType: {
        operations: [operations],
        guipresenter: ['2026-02-25 07:31:28 Verb  <#45> [CommHandler] - Duo_ChargingStarted @ MainWindow'],
        powermanagement: ['2026-02-25 00:00:00 Verb  <#29> [Scheduler] - Instant update result:\nConnectors:\n  22030428/2\n    State:           Excluded {ChargingPausedByEv}\n    Target:          0 A  Last: 0 A\n    Current:         (0, 0, 0) A'],
      },
    });

    expect(result.sessions).toHaveLength(1);
    const session = result.sessions[0];
    expect(session.status).toBe('incomplete');
    expect(session.transactionId).toBe(2027725);
    expect(session.connector).toBe(2);
    expect(session.anomalies.some((a) => a.type === 'INCOMPLETE_TELEMETRY')).toBe(true);
  });
});
