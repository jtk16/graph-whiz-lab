export type CircuitNode = string;

export type CircuitWaveform = "dc" | "ac";

export type CircuitComponent =
  | {
      id: string;
      kind: "wire";
      from: CircuitNode;
      to: CircuitNode;
    }
  | {
      id: string;
      kind: "ground";
      from: CircuitNode;
      to?: CircuitNode;
    }
  | {
      id: string;
      kind: "resistor";
      from: CircuitNode;
      to: CircuitNode;
      value: number; // ohms
    }
  | {
      id: string;
      kind: "capacitor";
      from: CircuitNode;
      to: CircuitNode;
      value: number; // farads
    }
  | {
      id: string;
      kind: "inductor";
      from: CircuitNode;
      to: CircuitNode;
      value: number; // henrys
    }
  | {
      id: string;
      kind: "current-source";
      from: CircuitNode;
      to: CircuitNode;
      waveform: CircuitWaveform;
      value: number; // DC amps for waveform=dc
      amplitude?: number; // AC amplitude
      frequency?: number; // Hz
      phase?: number; // radians
      offset?: number; // optional DC offset for AC
    }
  | {
      id: string;
      kind: "voltage-source";
      from: CircuitNode;
      to: CircuitNode;
      waveform: CircuitWaveform;
      value: number; // DC volts for waveform=dc
      amplitude?: number; // AC amplitude
      frequency?: number; // Hz
      phase?: number; // radians
      offset?: number; // optional DC offset for AC
    };

export interface SimulationConfig {
  dt: number;
  duration: number;
}

export interface SimulationResult {
  time: Float32Array;
  nodeVoltages: Record<string, Float32Array>;
  nodeCurrents: Record<string, Float32Array>;
  componentCurrents: Record<string, Float32Array>;
  metrics?: SimulationMetrics;
}

const GROUND_NAMES = new Set(["0", "gnd", "ground", "GND", "GROUND"]);

type Matrix = number[][];

const EPS = 1e-9;

export interface SimulationMetrics {
  steps: number;
  assemblyMs: number;
  solveMs: number;
  matrixSize: number;
  componentCount: number;
}

const now = (): number => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

export function simulateCircuit(components: CircuitComponent[], config: SimulationConfig): SimulationResult {
  const sanitized = components.filter(Boolean);
  if (sanitized.length === 0) {
    const dt = Math.max(config.dt, 1e-6);
    const steps = Math.max(1, Math.floor(config.duration / dt));
    const time = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      time[i] = i * dt;
    }
    return {
      time,
      nodeVoltages: {},
      nodeCurrents: {},
      componentCurrents: {},
      metrics: {
        steps,
        assemblyMs: 0,
        solveMs: 0,
        matrixSize: 0,
        componentCount: 0,
      },
    };
  }
  const dt = Math.max(config.dt, 1e-6);
  const steps = Math.max(1, Math.floor(config.duration / dt));
  const canonicalGround = "gnd";
  const groundBindings = new Set<string>();
  sanitized.forEach(component => {
    if (component.kind === "ground") {
      if (component.from) {
        groundBindings.add(component.from);
      }
      if (component.to) {
        groundBindings.add(component.to);
      }
    }
  });

  if (groundBindings.size === 0) {
    throw new Error("Circuit requires at least one ground reference. Add a ground component.");
  }

  const normalizeNode = (node: string): string => {
    if (!node) return node;
    if (GROUND_NAMES.has(node) || groundBindings.has(node)) {
      return canonicalGround;
    }
    return node;
  };

  type ActiveComponent = Exclude<CircuitComponent, { kind: "ground" }>;

  const workingComponents: ActiveComponent[] = sanitized
    .filter((component): component is ActiveComponent => component.kind !== "ground")
    .map(component => {
      const updated = { ...component } as ActiveComponent;
      updated.from = normalizeNode(component.from);
      updated.to = normalizeNode(component.to);
      return updated;
    });

  const nodeSet = new Set<string>();

  workingComponents.forEach(comp => {
    nodeSet.add(comp.from);
    nodeSet.add(comp.to);
  });

  const nodeList = [...nodeSet].filter(node => !GROUND_NAMES.has(node));
  nodeList.sort();
  const nodeIndex: Record<string, number> = {};
  nodeList.forEach((node, idx) => {
    nodeIndex[node] = idx;
  });

  const voltageSources = workingComponents.filter(comp => comp.kind === "voltage-source") as Extract<
    CircuitComponent,
    { kind: "voltage-source" }
  >[];
  const inductors = workingComponents.filter(comp => comp.kind === "inductor") as Extract<
    CircuitComponent,
    { kind: "inductor" }
  >[];
  const capacitors = workingComponents.filter(comp => comp.kind === "capacitor") as Extract<
    CircuitComponent,
    { kind: "capacitor" }
  >[];
  const currentSources = workingComponents.filter(comp => comp.kind === "current-source") as Extract<
    CircuitComponent,
    { kind: "current-source" }
  >[];
  const resistive = workingComponents.filter(
    comp => comp.kind === "resistor" || comp.kind === "wire"
  ) as Extract<CircuitComponent, { kind: "resistor" | "wire" }>[];

  const dimension = nodeList.length + voltageSources.length + inductors.length;
  const matrixSize = Math.max(1, dimension);

  const time = new Float32Array(steps);
  const nodeVoltages: Record<string, Float32Array> = {};
  const nodeCurrents: Record<string, Float32Array> = {};
  const componentCurrents: Record<string, Float32Array> = {};

  nodeList.forEach(node => {
    nodeVoltages[node] = new Float32Array(steps);
    nodeCurrents[node] = new Float32Array(steps);
  });

  workingComponents.forEach(component => {
    componentCurrents[component.id] = new Float32Array(steps);
  });

  const capacitorState = new Map<string, number>();
  const inductorState = new Map<string, number>();

  const getNodeIndex = (node: string): number => {
    if (GROUND_NAMES.has(node)) return -1;
    return nodeIndex[node] ?? -1;
  };

  const stampConductance = (G: Matrix, n1: number, n2: number, value: number) => {
    if (Math.abs(value) < EPS) return;
    if (n1 >= 0) {
      G[n1][n1] += value;
      if (n2 >= 0) {
        G[n1][n2] -= value;
      }
    }
    if (n2 >= 0) {
      G[n2][n2] += value;
      if (n1 >= 0) {
        G[n2][n1] -= value;
      }
    }
  };

  const stampCurrent = (rhs: number[], n1: number, n2: number, value: number) => {
    if (n1 >= 0) rhs[n1] += value;
    if (n2 >= 0) rhs[n2] -= value;
  };

  const evaluateSource = (
    source:
      | Extract<CircuitComponent, { kind: "voltage-source" }>
      | Extract<CircuitComponent, { kind: "current-source" }>,
    t: number
  ) => {
    if (source.waveform === "ac") {
      const amplitude = source.amplitude ?? source.value;
      const frequency = source.frequency ?? 50;
      const phase = source.phase ?? 0;
      const offset = source.offset ?? 0;
      return offset + amplitude * Math.sin(2 * Math.PI * frequency * t + phase);
    }
    return source.value;
  };

  const solveLinear = (A: Matrix, z: number[]): number[] => {
    const n = z.length;
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      let maxVal = Math.abs(A[i][i]);
      for (let k = i + 1; k < n; k++) {
        const val = Math.abs(A[k][i]);
        if (val > maxVal) {
          maxVal = val;
          maxRow = k;
        }
      }
      if (maxVal < EPS) {
        throw new Error("Circuit matrix is singular");
      }
      if (maxRow !== i) {
        [A[i], A[maxRow]] = [A[maxRow], A[i]];
        [z[i], z[maxRow]] = [z[maxRow], z[i]];
      }
      for (let k = i + 1; k < n; k++) {
        const factor = A[k][i] / A[i][i];
        if (Math.abs(factor) < EPS) continue;
        for (let j = i; j < n; j++) {
          A[k][j] -= factor * A[i][j];
        }
        z[k] -= factor * z[i];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = z[i];
      for (let j = i + 1; j < n; j++) {
        sum -= A[i][j] * x[j];
      }
      x[i] = sum / A[i][i];
    }
    return x;
  };

  const voltageSourceOffset = nodeList.length;
  const inductorOffset = nodeList.length + voltageSources.length;

  const metrics: SimulationMetrics = {
    steps,
    assemblyMs: 0,
    solveMs: 0,
    matrixSize,
    componentCount: workingComponents.length,
  };

  const G: Matrix = Array.from({ length: matrixSize }, () => new Array(matrixSize).fill(0));
  const rhs = new Array(matrixSize).fill(0);
  const stampedCurrentSources = new Array(currentSources.length).fill(0);

  const getVoltageAt = (node: string, solution: number[]): number => {
    if (GROUND_NAMES.has(node)) return 0;
    const idx = nodeIndex[node];
    if (idx === undefined) return 0;
    return solution[idx] ?? 0;
  };

  for (let step = 0; step < steps; step++) {
    const t = step * dt;
    time[step] = t;

    for (let row = 0; row < matrixSize; row++) {
      rhs[row] = 0;
      const rowRef = G[row];
      for (let col = 0; col < matrixSize; col++) {
        rowRef[col] = 0;
      }
    }

    nodeList.forEach(node => {
      nodeCurrents[node][step] = 0;
    });

    for (let i = 0; i < stampedCurrentSources.length; i++) {
      stampedCurrentSources[i] = 0;
    }

    const assemblyStart = now();

    resistive.forEach(res => {
      const value = res.kind === "wire" ? 1e-6 : Math.max(res.value, 1e-6);
      const conductance = 1 / value;
      const n1 = getNodeIndex(res.from);
      const n2 = getNodeIndex(res.to);
      stampConductance(G, n1, n2, conductance);
    });

    capacitors.forEach(cap => {
      const Ceq = cap.value / dt;
      const prevV = capacitorState.get(cap.id) ?? 0;
      const n1 = getNodeIndex(cap.from);
      const n2 = getNodeIndex(cap.to);
      stampConductance(G, n1, n2, Ceq);
      const history = Ceq * prevV;
      stampCurrent(rhs, n1, n2, history);
    });

    inductors.forEach((ind, index) => {
      const row = inductorOffset + index;
      const n1 = getNodeIndex(ind.from);
      const n2 = getNodeIndex(ind.to);
      if (n1 >= 0) {
        G[n1][row] += 1;
        G[row][n1] += 1;
      }
      if (n2 >= 0) {
        G[n2][row] -= 1;
        G[row][n2] -= 1;
      }
      const coeff = -(ind.value / dt);
      G[row][row] += coeff;
      const prevCurrent = inductorState.get(ind.id) ?? 0;
      rhs[row] += coeff * prevCurrent;
    });

    voltageSources.forEach((src, index) => {
      const row = voltageSourceOffset + index;
      const n1 = getNodeIndex(src.from);
      const n2 = getNodeIndex(src.to);
      if (n1 >= 0) {
        G[n1][row] += 1;
        G[row][n1] += 1;
      }
      if (n2 >= 0) {
        G[n2][row] -= 1;
        G[row][n2] -= 1;
      }
      const value = evaluateSource(src, t);
      rhs[row] += value;
    });

    currentSources.forEach((src, index) => {
      const value = evaluateSource(src, t);
      const n1 = getNodeIndex(src.from);
      const n2 = getNodeIndex(src.to);
      stampCurrent(rhs, n1, n2, value);
      stampedCurrentSources[index] = value;
    });

    metrics.assemblyMs += now() - assemblyStart;

    const solveStart = now();
    const solution = solveLinear(G, rhs);
    metrics.solveMs += now() - solveStart;

    nodeList.forEach(node => {
      nodeVoltages[node][step] = getVoltageAt(node, solution);
    });

    resistive.forEach(res => {
      const v1 = getVoltageAt(res.from, solution);
      const v2 = getVoltageAt(res.to, solution);
      const value = res.kind === "wire" ? 1e-6 : Math.max(res.value, 1e-6);
      const current = (v1 - v2) / value;
      componentCurrents[res.id][step] = current;
      if (!GROUND_NAMES.has(res.from)) {
        nodeCurrents[res.from][step] += current;
      }
      if (!GROUND_NAMES.has(res.to)) {
        nodeCurrents[res.to][step] -= current;
      }
    });

    capacitors.forEach(cap => {
      const v1 = getVoltageAt(cap.from, solution);
      const v2 = getVoltageAt(cap.to, solution);
      const prevV = capacitorState.get(cap.id) ?? 0;
      const deltaV = v1 - v2;
      const current = cap.value * (deltaV - prevV) / dt;
      capacitorState.set(cap.id, deltaV);
      componentCurrents[cap.id][step] = current;
      if (!GROUND_NAMES.has(cap.from)) {
        nodeCurrents[cap.from][step] += current;
      }
      if (!GROUND_NAMES.has(cap.to)) {
        nodeCurrents[cap.to][step] -= current;
      }
    });

    inductors.forEach((ind, index) => {
      const row = inductorOffset + index;
      const current = solution[row] ?? 0;
      inductorState.set(ind.id, current);
      componentCurrents[ind.id][step] = current;
      if (!GROUND_NAMES.has(ind.from)) {
        nodeCurrents[ind.from][step] += current;
      }
      if (!GROUND_NAMES.has(ind.to)) {
        nodeCurrents[ind.to][step] -= current;
      }
    });

    voltageSources.forEach((src, index) => {
      const row = voltageSourceOffset + index;
      const current = solution[row] ?? 0;
      componentCurrents[src.id][step] = current;
      if (!GROUND_NAMES.has(src.from)) {
        nodeCurrents[src.from][step] += current;
      }
      if (!GROUND_NAMES.has(src.to)) {
        nodeCurrents[src.to][step] -= current;
      }
    });

    currentSources.forEach((src, index) => {
      const current = stampedCurrentSources[index] ?? 0;
      componentCurrents[src.id][step] = current;
      if (!GROUND_NAMES.has(src.from)) {
        nodeCurrents[src.from][step] += current;
      }
      if (!GROUND_NAMES.has(src.to)) {
        nodeCurrents[src.to][step] -= current;
      }
    });
  }

  metrics.assemblyMs = Number(metrics.assemblyMs.toFixed(3));
  metrics.solveMs = Number(metrics.solveMs.toFixed(3));

  return {
    time,
    nodeVoltages,
    nodeCurrents,
    componentCurrents,
    metrics,
  };
}
