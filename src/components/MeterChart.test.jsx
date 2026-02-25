import { describe, expect, it } from 'vitest';
import { getEnergyYAxisDomain } from './MeterChart';

describe('MeterChart energy y-axis domain', () => {
  it('adds headroom for narrow session ranges so variation is visible', () => {
    const domain = getEnergyYAxisDomain([
      { energy: 100.0 },
      { energy: 100.2 },
      { energy: 100.25 },
    ]);

    expect(domain[0]).toBeLessThan(100.0);
    expect(domain[1]).toBeGreaterThan(100.25);
    expect(domain[1] - domain[0]).toBeGreaterThan(0.25);
  });

  it('builds a visible range when all energy readings are identical', () => {
    const domain = getEnergyYAxisDomain([{ energy: 35855.8 }, { energy: 35855.8 }]);

    expect(domain[0]).toBeLessThan(35855.8);
    expect(domain[1]).toBeGreaterThan(35855.8);
  });
});
