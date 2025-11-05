import { CircuitComponent } from "./simulator";
import { CANONICAL_GROUND } from "./editorModel";

export interface CircuitPreset {
  id: string;
  label: string;
  description: string;
  components: CircuitComponent[];
}

export const DEFAULT_SIM_CONFIG = {
  dt: 0.0005,
  duration: 0.1,
};

export const CIRCUIT_PRESETS: CircuitPreset[] = [
  {
    id: "starter-supply",
    label: "Starter (Grounded source)",
    description: "Baseline DC source with a single load resistor.",
    components: [
      { id: "g1", kind: "ground", from: "n0", to: CANONICAL_GROUND },
      { id: "vs1", kind: "voltage-source", from: "vin", to: "n0", waveform: "dc", value: 5 },
      { id: "r1", kind: "resistor", from: "vin", to: "n0", value: 1000 },
    ],
  },
  {
    id: "rc-lowpass",
    label: "RC Low-Pass Filter",
    description: "First-order filter with 10 kOhm / 1 uF corner (~15.9 Hz).",
    components: [
      { id: "g1", kind: "ground", from: "n0", to: CANONICAL_GROUND },
      {
        id: "vs1",
        kind: "voltage-source",
        from: "vin",
        to: "n0",
        waveform: "ac",
        value: 0,
        amplitude: 5,
        frequency: 1000,
        phase: 0,
        offset: 0,
      },
      { id: "r1", kind: "resistor", from: "vin", to: "vout", value: 10000 },
      { id: "c1", kind: "capacitor", from: "vout", to: "n0", value: 1e-6 },
    ],
  },
  {
    id: "rlc-series",
    label: "Series RLC Resonator",
    description: "Driven ladder with 50 Ohm damping and 10 mH / 1 uF tank.",
    components: [
      { id: "g1", kind: "ground", from: "n0", to: CANONICAL_GROUND },
      {
        id: "vs1",
        kind: "voltage-source",
        from: "vin",
        to: "n0",
        waveform: "ac",
        value: 0,
        amplitude: 3,
        frequency: 500,
        phase: 0,
        offset: 0,
      },
      { id: "r1", kind: "resistor", from: "vin", to: "n1", value: 50 },
      { id: "l1", kind: "inductor", from: "n1", to: "n2", value: 0.01 },
      { id: "c1", kind: "capacitor", from: "n2", to: "n0", value: 1e-6 },
    ],
  },
  {
    id: "wheatstone-bridge",
    label: "Wheatstone Bridge",
    description: "Balanced bridge with a 10 kOhm sense resistor across the legs.",
    components: [
      { id: "g1", kind: "ground", from: "n0", to: CANONICAL_GROUND },
      { id: "vs1", kind: "voltage-source", from: "vin", to: "n0", waveform: "dc", value: 12 },
      { id: "r1", kind: "resistor", from: "vin", to: "n1", value: 1000 },
      { id: "r2", kind: "resistor", from: "n1", to: "n0", value: 1000 },
      { id: "r3", kind: "resistor", from: "vin", to: "n2", value: 1000 },
      { id: "r4", kind: "resistor", from: "n2", to: "n0", value: 1000 },
      { id: "r5", kind: "resistor", from: "n1", to: "n2", value: 10000 },
    ],
  },
];

