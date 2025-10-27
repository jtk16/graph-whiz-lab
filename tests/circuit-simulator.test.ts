import { describe, expect, it } from "vitest";
import { simulateCircuit, CircuitComponent } from "@/lib/circuits/simulator";

const sampleAverage = (series: Float32Array | undefined) => {
  if (!series || series.length === 0) {
    return 0;
  }
  return series.reduce((acc, value) => acc + value, 0) / series.length;
};

const sampleTailAverage = (series: Float32Array | undefined, tail = 25) => {
  if (!series || series.length === 0) {
    return 0;
  }
  const count = Math.min(series.length, tail);
  let sum = 0;
  for (let index = series.length - count; index < series.length; index += 1) {
    sum += series[index];
  }
  return sum / count;
};

const sampleAtTime = (
  time: Float32Array | undefined,
  values: Float32Array | undefined,
  target: number
) => {
  if (!time || !values || time.length === 0 || values.length === 0) {
    return 0;
  }
  let closestIndex = 0;
  let closestDelta = Math.abs(time[0] - target);
  for (let index = 1; index < time.length; index += 1) {
    const delta = Math.abs(time[index] - target);
    if (delta < closestDelta) {
      closestDelta = delta;
      closestIndex = index;
    }
  }
  return values[closestIndex] ?? 0;
};

describe("Circuit simulator", () => {
  it("computes node voltages for a resistive divider", () => {
    /*
          vin o----[1k]----o vout
            |              |
          [10 V]         [1k]
            |              |
          gnd ------------ gnd
    */
    const components: CircuitComponent[] = [
      { id: "vs1", kind: "voltage-source", from: "vin", to: "gnd", waveform: "dc", value: 10 },
      { id: "r_top", kind: "resistor", from: "vin", to: "vout", value: 1_000 },
      { id: "r_bottom", kind: "resistor", from: "vout", to: "gnd", value: 1_000 },
    ];
    const result = simulateCircuit(components, { dt: 0.001, duration: 0.01 });
    const vin = sampleAverage(result.nodeVoltages.vin);
    const vout = sampleAverage(result.nodeVoltages.vout);
    expect(vin).toBeCloseTo(10, 2);
    expect(vout).toBeCloseTo(5, 2);
  });

  it("charges an RC node towards the supply rail", () => {
    /*
          vin o----[1k]----o vout
            |              |
          [ 5 V]          [C]
            |              |
          gnd ------------ gnd
    */
    const components: CircuitComponent[] = [
      { id: "vs1", kind: "voltage-source", from: "vin", to: "gnd", waveform: "dc", value: 5 },
      { id: "r1", kind: "resistor", from: "vin", to: "vout", value: 1_000 },
      { id: "c1", kind: "capacitor", from: "vout", to: "gnd", value: 0.0001 },
    ];
    const result = simulateCircuit(components, { dt: 0.0005, duration: 0.5 });
    const initial = result.nodeVoltages.vout?.[0] ?? 0;
    const settled = sampleTailAverage(result.nodeVoltages.vout, 50);
    expect(initial).toBeLessThan(0.05);
    expect(settled).toBeGreaterThan(4.5);
    expect(settled).toBeLessThan(5.1);
  });

  it("supports DC current sources driving resistive loads", () => {
    /*
          iout o----[10k]----o gnd
            |
          [2 mA]
            |
           gnd
    */
    const components: CircuitComponent[] = [
      { id: "is1", kind: "current-source", from: "iout", to: "gnd", waveform: "dc", value: 0.002 },
      { id: "rload", kind: "resistor", from: "iout", to: "gnd", value: 10_000 },
    ];
    const result = simulateCircuit(components, { dt: 0.0005, duration: 0.05 });
    const voltage = sampleAverage(result.nodeVoltages.iout);
    const current = sampleAverage(result.componentCurrents.is1);
    expect(voltage).toBeCloseTo(20, 2);
    expect(current).toBeCloseTo(0.002, 4);
  });

  it("simulates sinusoidal current injection into a load", () => {
    /*
          n1 o----[1k]----o gnd
            |
          [~10 mA]
            |
           gnd
    */
    const frequency = 60;
    const amplitude = 0.01;
    const dt = 1 / (frequency * 240);
    const duration = 4 / frequency;
    const components: CircuitComponent[] = [
      {
        id: "is1",
        kind: "current-source",
        from: "n1",
        to: "gnd",
        waveform: "ac",
        value: amplitude,
        amplitude,
        frequency,
        phase: 0,
        offset: 0,
      },
      { id: "rload", kind: "resistor", from: "n1", to: "gnd", value: 1_000 },
    ];
    const result = simulateCircuit(components, { dt, duration });
    const quarterPeriod = 1 / (4 * frequency);
    const peakVoltage = sampleAtTime(result.time, result.nodeVoltages.n1, quarterPeriod);
    const peakCurrent = sampleAtTime(result.time, result.componentCurrents.is1, quarterPeriod);
    const startVoltage = sampleAtTime(result.time, result.nodeVoltages.n1, 0);
    expect(startVoltage).toBeCloseTo(0, 3);
    expect(peakCurrent).toBeCloseTo(amplitude, 3);
    expect(peakVoltage).toBeCloseTo(amplitude * 1_000, 1);
  });

  it("returns zeros when the component list is empty", () => {
    const result = simulateCircuit([], { dt: 0.001, duration: 0.01 });
    expect(result.time.length).toBeGreaterThan(0);
    expect(Object.keys(result.nodeVoltages)).toHaveLength(0);
    expect(Object.keys(result.componentCurrents)).toHaveLength(0);
  });
});
