import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import TimelineView from './TimelineView';

const MIN_TS = 1735689600000;

describe('TimelineView', () => {
  it('does not throw on first render before range effect initializes and shows timeline markers', () => {
    const props = {
      ocppEvents: [{ ts: MIN_TS, type: 'message', action: 'StartTransaction', params: { connectorId: 1 } }],
      userEvents: [{ ts: MIN_TS + 1000, connector: 1, type: 'CHARGEPOINT_EV_CONNECTED', extra: 'ok' }],
      cpEvents: [{ ts: MIN_TS + 2000, connector: 1, type: 'warn', transactionId: 'tx-1' }],
    };

    let html = '';
    expect(() => {
      html = renderToString(<TimelineView {...props} />);
    }).not.toThrow();

    expect(html).toContain('Timeframe — drag to pan, handles to resize');
    expect(html).toContain('events in view');
  });

  it('shows empty-state message when all event arrays are empty', () => {
    const html = renderToString(<TimelineView ocppEvents={[]} userEvents={[]} cpEvents={[]} />);

    expect(html).toContain('No events in selected timeframe. Try widening the range.');
  });
});
