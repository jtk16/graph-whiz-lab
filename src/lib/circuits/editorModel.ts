import { CircuitComponent } from "./simulator";

export type CircuitKind = CircuitComponent["kind"];

export interface NodePosition {
  x: number;
  y: number;
}

export interface NewComponentState {
  kind: CircuitKind;
  from: string;
  to: string;
  value: number;
  waveform: "dc" | "ac";
  amplitude: number;
  frequency: number;
  phase: number;
  offset: number;
}

export const SNAP_GRID_SIZE = 24;
export const CANVAS_WIDTH = 760;
export const CANVAS_HEIGHT = 360;
export const NODE_MARGIN = 32;

export const DEFAULT_NEW_COMPONENT: NewComponentState = {
  kind: "resistor",
  from: "vin",
  to: "gnd",
  value: 1000,
  waveform: "dc",
  amplitude: 5,
  frequency: 60,
  phase: 0,
  offset: 0,
};

export interface ComponentDefinition {
  kind: CircuitKind;
  label: string;
  description: string;
}

export const COMPONENT_LIBRARY: ComponentDefinition[] = [
  {
    kind: "voltage-source",
    label: "Voltage source",
    description: "Inject DC or AC excitation into the network.",
  },
  {
    kind: "current-source",
    label: "Current source",
    description: "Drive the circuit with a DC or sinusoidal current injection.",
  },
  {
    kind: "resistor",
    label: "Resistor",
    description: "Drop voltage proportionally to current (Ohm's law).",
  },
  {
    kind: "capacitor",
    label: "Capacitor",
    description: "Store charge and react to frequency content.",
  },
  {
    kind: "inductor",
    label: "Inductor",
    description: "Accumulate magnetic energy and resist changes in current.",
  },
  {
    kind: "wire",
    label: "Wire",
    description: "Directly connect nodes without impedance.",
  },
];

export const COMPONENT_LOOKUP: Record<CircuitKind, ComponentDefinition> = COMPONENT_LIBRARY.reduce(
  (acc, entry) => {
    acc[entry.kind] = entry;
    return acc;
  },
  {} as Record<CircuitKind, ComponentDefinition>
);

export const COMPONENT_COLORS: Record<CircuitKind, string> = {
  resistor: "#f97316",
  capacitor: "#0ea5e9",
  inductor: "#a855f7",
  "current-source": "#14b8a6",
  "voltage-source": "#22c55e",
  wire: "#94a3b8",
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const defaultNodePosition = (index: number): NodePosition => {
  const angle = (index / Math.max(1, index + 2)) * Math.PI * 2;
  const radiusX = CANVAS_WIDTH / 2 - NODE_MARGIN * 2;
  const radiusY = CANVAS_HEIGHT / 2 - NODE_MARGIN * 2;
  return {
    x: CANVAS_WIDTH / 2 + Math.cos(angle) * radiusX * 0.6,
    y: CANVAS_HEIGHT / 2 + Math.sin(angle) * radiusY * 0.6,
  };
};

export const sanitizeIdentifier = (raw: string): string => {
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) return "signal";
  return /^[a-zA-Z]/.test(cleaned) ? cleaned : `n${cleaned}`;
};

export const extractCircuitNodes = (components: CircuitComponent[]): string[] => {
  const nodes = new Set<string>(["gnd"]);
  components.forEach(component => {
    nodes.add(component.from);
    nodes.add(component.to);
  });
  return Array.from(nodes);
};

export const createInitialPositions = (nodes: string[]): Record<string, NodePosition> => {
  const positions: Record<string, NodePosition> = {};
  nodes.forEach((node, index) => {
    positions[node] = defaultNodePosition(index);
  });
  return positions;
};

export const generateNodeName = (existing: string[]): string => {
  let index = 1;
  while (true) {
    const candidate = `n${index}`;
    if (!existing.includes(candidate)) {
      return candidate;
    }
    index += 1;
  }
};

export const stageComponentFromKind = (
  current: NewComponentState,
  kind: CircuitKind
): NewComponentState => {
  if (current.kind === kind) {
    return current;
  }
  if (kind === "voltage-source" || kind === "current-source") {
    return {
      ...current,
      kind,
      waveform: current.waveform ?? "dc",
      amplitude: current.amplitude ?? DEFAULT_NEW_COMPONENT.amplitude,
      frequency: current.frequency ?? DEFAULT_NEW_COMPONENT.frequency,
      phase: current.phase ?? DEFAULT_NEW_COMPONENT.phase,
      offset: current.offset ?? DEFAULT_NEW_COMPONENT.offset,
    };
  }
  return {
    ...current,
    kind,
    waveform: "dc",
  };
};

export const componentGlyph = (kind: CircuitKind) => {
  switch (kind) {
    case "resistor":
      return "R";
    case "capacitor":
      return "C";
    case "inductor":
      return "L";
    case "current-source":
      return "I";
    case "voltage-source":
      return "V";
    case "wire":
    default:
      return "W";
  }
};

export const applyNodeSnap = (
  position: NodePosition,
  snapToGrid: boolean,
  disableSnap?: boolean
): NodePosition => {
  if (!snapToGrid || disableSnap) {
    return {
      x: clamp(position.x, NODE_MARGIN, CANVAS_WIDTH - NODE_MARGIN),
      y: clamp(position.y, NODE_MARGIN, CANVAS_HEIGHT - NODE_MARGIN),
    };
  }
  const applySnap = (value: number) => Math.round(value / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
  return {
    x: clamp(applySnap(position.x), NODE_MARGIN, CANVAS_WIDTH - NODE_MARGIN),
    y: clamp(applySnap(position.y), NODE_MARGIN, CANVAS_HEIGHT - NODE_MARGIN),
  };
};

export const hotkeyToKind: Record<string, CircuitKind> = {
  w: "wire",
  r: "resistor",
  c: "capacitor",
  l: "inductor",
  v: "voltage-source",
  i: "current-source",
};

export const stageComponentForNodeDrop = (
  current: NewComponentState,
  kind: CircuitKind,
  nodeId: string
): NewComponentState => {
  const staged = stageComponentFromKind(current, kind);
  const fallback = nodeId === "gnd" ? "vin" : "gnd";
  const nextTo = staged.to === nodeId ? fallback : staged.to;
  return { ...staged, from: nodeId, to: nextTo };
};

export const retargetComponentToNode = (
  component: CircuitComponent,
  nodeId: string
): CircuitComponent => {
  if (component.to === nodeId) {
    return component;
  }
  if (component.from === nodeId) {
    return { ...component, from: component.to, to: nodeId } as CircuitComponent;
  }
  return { ...component, to: nodeId } as CircuitComponent;
};
