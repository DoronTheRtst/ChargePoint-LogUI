import { describe, expect, test } from 'vitest';
import { parseGuiPresenterLog, parseLogsByType, parseOperationsLog, parsePowerManagementLog } from './parsers';

describe('etrel parsers', () => {
  test('parses Operations OCPP sent/received messages', () => {
    const operations = [
      '2026-02-25 00:00:49 Verb  <#70> [OcppClient] - Sent: [2,"19d3","MeterValues",{"connectorId":2,"meterValue":[{"timestamp":"2026-02-25T00:00:47.738Z","sampledValue":[{"value":"35855.8","measurand":"Energy.Active.Import.Register","location":"Outlet"}]}],"transactionId":2027725}]',
      '2026-02-25 00:00:49 Verb  <#67> [OcppClient] - Received: [3,"19d3",{}]',
      '2026-02-25 00:00:48 Error <#67> [EnergyMeterService evse2] - SendMeasurements - Temperature: could not read value (AfeSystemFault)',
    ].join('\n');

    const parsed = parseOperationsLog(operations);

    expect(parsed.ocppEvents).toHaveLength(2);
    expect(parsed.ocppEvents[0].dir).toBe('OUT');
    expect(parsed.ocppEvents[0].action).toBe('MeterValues');
    expect(parsed.ocppEvents[1].dir).toBe('IN');
    expect(parsed.userEvents).toHaveLength(1);
    expect(parsed.userEvents[0].connector).toBe(2);
  });

  test('parses GuiPresenter Duo states as user events', () => {
    const gui = [
      '2026-02-25 07:31:28 Verb  <#45> [CommHandler] - Duo_ChargingStarted @ MainWindow',
      '2026-02-25 07:31:28 Warn  <LayerMgr> [CommercialRepository] - Missing `state/etrel/Commercials.json\'',
    ].join('\n');

    const parsed = parseGuiPresenterLog(gui);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].type).toBe('Duo_ChargingStarted');
    expect(parsed[1].type).toBe('GUI_COMMERCIALREPOSITORY');
  });

  test('parses PowerManagement connector snapshots', () => {
    const pm = [
      '2026-02-25 00:00:00 Verb  <#29> [Scheduler] - Instant update result:',
      'Connectors:',
      '  22030428/1',
      '    State:           Charging {Charging}',
      '    Target:          16 A  Last: 16 A',
      '    Current:         (15.577, 15.143, 14.963) A  Smoothed: (15.57, 15.14, 14.96) A',
      '  22030428/2',
      '    State:           Excluded {ChargingPausedByEv}',
      '    Target:          0 A  Last: 0 A',
      '    Current:         (0, 0, 0) A  Smoothed: (0, 0, 0) A',
    ].join('\n');

    const parsed = parsePowerManagementLog(pm);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].connector).toBe(1);
    expect(parsed[1].intent).toBe('ChargingPausedByEv');
  });

  test('combines etrel log streams into normalized outputs', () => {
    const result = parseLogsByType({
      operations: ['2026-02-25 00:00:49 Verb  <#70> [OcppClient] - Sent: [2,"m1","MeterValues",{"connectorId":1,"meterValue":[{"timestamp":"2026-02-25T00:00:47.738Z","sampledValue":[{"value":"12.0","measurand":"Energy.Active.Import.Register","location":"Outlet"}]}],"transactionId":10}]'],
      guipresenter: ['2026-02-25 07:31:28 Verb  <#45> [CommHandler] - Duo_ChargingStarted @ MainWindow'],
      powermanagement: ['2026-02-25 00:00:00 Verb  <#29> [Scheduler] - Instant update result:\nConnectors:\n  22030428/1\n    State:           Charging {Charging}\n    Target:          16 A  Last: 16 A\n    Current:         (15.577, 15.143, 14.963) A'],
    });

    expect(result.ocppEvents.length).toBeGreaterThan(0);
    expect(result.userEvents.length).toBeGreaterThan(0);
    expect(result.cpEvents.length).toBeGreaterThan(0);
  });
});
