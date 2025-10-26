import { describe, expect, it } from 'vitest';
import { simulateCircuit, CircuitComponent } from '@/lib/circuits/simulator';

const sampleAverage = (series: Float32Array | undefined) => {
  if (!series || series.length === 0) {
    return 0;
  }
  return series.reduce((acc, value) => acc + value, 0) / series.length;
};

describe('Circuit simulator', () => {
  it('computes node voltages for a resistive divider', () => {
    const components: CircuitComponent[] = [
      { id: 'vs1', kind: 'voltage-source', from: 'vin', to: 'gnd', waveform: 'dc', value: 10 },
      { id: 'r_top', kind: 'resistor', from: 'vin', to: 'vout', value: 1_000 },
      { id: 'r_bottom', kind: 'resistor', from: 'vout', to: 'gnd', value: 1_000 },
    ];
    const result = simulateCircuit(components, { dt: 0.001, duration: 0.01 });
    const vin = sampleAverage(result.nodeVoltages.vin);
    const vout = sampleAverage(result.nodeVoltages.vout);
    expect(vin).toBeCloseTo(10, 2);
    expect(vout).toBeCloseTo(5, 2);
  });

  it('returns zeros when the component list is empty', () => {
    const result = simulateCircuit([], { dt: 0.001, duration: 0.01 });
    expect(result.time.length).toBeGreaterThan(0);
    expect(Object.keys(result.nodeVoltages)).toHaveLength(0);
    expect(Object.keys(result.componentCurrents)).toHaveLength(0);
  });
});

