import { CircuitComponent } from "./simulator";
import { create, all } from "mathjs";

const math = create(all, {});

type Sym = string;

interface SymbolicNodeData {
  voltage: Sym;
  voltageLatex: string;
  current: Sym;
  currentLatex: string;
}

export interface SymbolicCircuitResult {
  nodeVoltages: Record<string, SymbolicNodeData>;
  branchCurrents: Record<string, Sym>;
  variables: string[];
}

const ZERO = "0";
const ONE = "1";
const S = "s";

const simplifyCache = new Map<string, string>();

function resetSimplifyCache() {
  simplifyCache.clear();
}

function normalize(expr: Sym): Sym {
  const trimmed = expr.trim();
  if (!trimmed || trimmed === ZERO) return ZERO;
  if (simplifyCache.has(trimmed)) {
    return simplifyCache.get(trimmed)!;
  }
  try {
    const simplified = math.simplify(trimmed).toString();
    simplifyCache.set(trimmed, simplified);
    return simplified;
  } catch {
    simplifyCache.set(trimmed, trimmed);
    return trimmed;
  }
}

function add(a: Sym, b: Sym): Sym {
  if (a === ZERO) return b;
  if (b === ZERO) return a;
  return normalize(`(${a})+(${b})`);
}

function sub(a: Sym, b: Sym): Sym {
  if (b === ZERO) return a;
  if (a === ZERO) return normalize(`-(${b})`);
  return normalize(`(${a})-(${b})`);
}

function mul(a: Sym, b: Sym): Sym {
  if (a === ZERO || b === ZERO) return ZERO;
  if (a === ONE) return b;
  if (b === ONE) return a;
  return normalize(`(${a})*(${b})`);
}

function div(a: Sym, b: Sym): Sym {
  if (a === ZERO) return ZERO;
  return normalize(`(${a})/(${b})`);
}

function isZero(expr: Sym): boolean {
  return normalize(expr) === ZERO;
}

function valueToSymbol(value: number): Sym {
  if (Number.isFinite(value)) {
    return normalize(value.toString());
  }
  return "1";
}

function admittanceForComponent(component: CircuitComponent): Sym {
  switch (component.kind) {
    case "wire":
      return normalize("1e6");
    case "resistor":
      return div(ONE, valueToSymbol(component.value || 1));
    case "capacitor":
      return mul(S, valueToSymbol(component.value || 0));
    case "inductor":
      return div(ONE, mul(S, valueToSymbol(component.value || 0)));
    default:
      return ZERO;
  }
}

function toLatex(expr: Sym): string {
  try {
    return math.parse(expr).toTex({ parenthesis: "auto" });
  } catch {
    return expr;
  }
}

function cloneMatrix(matrix: Sym[][]): Sym[][] {
  return matrix.map(row => row.slice());
}

function solveLinearSystem(matrix: Sym[][], rhs: Sym[]): Sym[] {
  const A = cloneMatrix(matrix);
  const b = rhs.slice();
  const n = A.length;
  for (let k = 0; k < n; k++) {
    let pivot = k;
    while (pivot < n && isZero(A[pivot][k])) {
      pivot += 1;
    }
    if (pivot === n) {
      continue;
    }
    if (pivot !== k) {
      [A[k], A[pivot]] = [A[pivot], A[k]];
      [b[k], b[pivot]] = [b[pivot], b[k]];
    }
    for (let i = k + 1; i < n; i++) {
      if (isZero(A[i][k])) continue;
      const factor = div(A[i][k], A[k][k]);
      for (let j = k; j < n; j++) {
        A[i][j] = sub(A[i][j], mul(factor, A[k][j]));
      }
      b[i] = sub(b[i], mul(factor, b[k]));
    }
  }
  const solution = new Array(n).fill(ZERO);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) {
      if (!isZero(A[i][j])) {
        sum = sub(sum, mul(A[i][j], solution[j]));
      }
    }
    solution[i] = isZero(A[i][i]) ? ZERO : div(sum, A[i][i]);
  }
  return solution.map(expr => normalize(expr));
}

const GROUND_NAMES = new Set(["0", "gnd", "GND", "ground", "GROUND"]);

export function solveSymbolicCircuit(components: CircuitComponent[]): SymbolicCircuitResult {
  resetSimplifyCache();
  const sanitized = components.filter(Boolean);
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
    throw new Error("Symbolic analysis requires at least one ground reference. Add a ground component.");
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
  workingComponents.forEach(component => {
    if (!GROUND_NAMES.has(component.from)) nodeSet.add(component.from);
    if (!GROUND_NAMES.has(component.to)) nodeSet.add(component.to);
  });
  const nodeList = Array.from(nodeSet).sort();
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

  const dimension = nodeList.length + voltageSources.length + inductors.length;
  if (dimension === 0) {
    return { nodeVoltages: {}, branchCurrents: {}, variables: [] };
  }

  const matrix: Sym[][] = Array.from({ length: dimension }, () =>
    new Array(dimension).fill(ZERO)
  );
  const rhs: Sym[] = new Array(dimension).fill(ZERO);

  const getNodeIdx = (node: string): number => {
    if (GROUND_NAMES.has(node)) return -1;
    return nodeIndex[node] ?? -1;
  };

  const stampConductance = (n1: number, n2: number, value: Sym) => {
    if (isZero(value)) return;
    if (n1 >= 0) {
      matrix[n1][n1] = add(matrix[n1][n1], value);
      if (n2 >= 0) {
        matrix[n1][n2] = sub(matrix[n1][n2], value);
      }
    }
    if (n2 >= 0) {
      matrix[n2][n2] = add(matrix[n2][n2], value);
      if (n1 >= 0) {
        matrix[n2][n1] = sub(matrix[n2][n1], value);
      }
    }
  };

  const stampCurrent = (n1: number, n2: number, value: Sym) => {
    if (isZero(value)) return;
    if (n1 >= 0) rhs[n1] = add(rhs[n1], value);
    if (n2 >= 0) rhs[n2] = sub(rhs[n2], value);
  };

  workingComponents.forEach(component => {
    if (
      component.kind === "resistor" ||
      component.kind === "wire" ||
      component.kind === "capacitor" ||
      component.kind === "inductor"
    ) {
      const adm = admittanceForComponent(component);
      const n1 = getNodeIdx(component.from);
      const n2 = getNodeIdx(component.to);
      stampConductance(n1, n2, adm);
    }
  });

  voltageSources.forEach((source, index) => {
    const row = nodeList.length + index;
    const n1 = getNodeIdx(source.from);
    const n2 = getNodeIdx(source.to);
    if (n1 >= 0) {
      matrix[n1][row] = add(matrix[n1][row], ONE);
      matrix[row][n1] = add(matrix[row][n1], ONE);
    }
    if (n2 >= 0) {
      matrix[n2][row] = sub(matrix[n2][row], ONE);
      matrix[row][n2] = sub(matrix[row][n2], ONE);
    }
    const expr =
      source.waveform === "ac"
        ? normalize(
            `(${valueToSymbol(source.offset ?? 0)}) + (${valueToSymbol(
              source.amplitude ?? source.value
            )})`
          )
        : valueToSymbol(source.value);
    rhs[row] = add(rhs[row], expr);
  });

  inductors.forEach((inductor, index) => {
    const row = nodeList.length + voltageSources.length + index;
    const n1 = getNodeIdx(inductor.from);
    const n2 = getNodeIdx(inductor.to);
    if (n1 >= 0) {
      matrix[n1][row] = add(matrix[n1][row], ONE);
      matrix[row][n1] = add(matrix[row][n1], ONE);
    }
    if (n2 >= 0) {
      matrix[n2][row] = sub(matrix[n2][row], ONE);
      matrix[row][n2] = sub(matrix[row][n2], ONE);
    }
    const coeff = mul(inductor.value ? valueToSymbol(inductor.value) : ZERO, S);
    matrix[row][row] = sub(matrix[row][row], coeff);
  });

  const solution = solveLinearSystem(matrix, rhs);
  const nodeResults: Record<string, SymbolicNodeData> = {};

  nodeList.forEach((node, idx) => {
    const expr = solution[idx] || ZERO;
    nodeResults[node] = {
      voltage: expr,
      voltageLatex: toLatex(expr),
      current: ZERO,
      currentLatex: ZERO,
    };
  });

  const branchCurrents: Record<string, Sym> = {};
  voltageSources.forEach((source, index) => {
    const expr = solution[nodeList.length + index] || ZERO;
    branchCurrents[source.id] = expr;
  });
  inductors.forEach((inductor, index) => {
    const expr = solution[nodeList.length + voltageSources.length + index] || ZERO;
    branchCurrents[inductor.id] = expr;
  });

  const getVoltageExpr = (node: string): Sym => {
    if (GROUND_NAMES.has(node)) return ZERO;
    return nodeResults[node]?.voltage ?? ZERO;
  };

  nodeList.forEach(node => {
    let totalCurrent = ZERO;
    workingComponents.forEach(component => {
      if (component.kind === "resistor" || component.kind === "wire" || component.kind === "capacitor" || component.kind === "inductor") {
        if (component.from === node || component.to === node) {
          const adm = admittanceForComponent(component);
          if (isZero(adm)) return;
          const thisVoltage = getVoltageExpr(component.from);
          const otherVoltage = getVoltageExpr(component.to);
          const current = mul(adm, sub(thisVoltage, otherVoltage));
          if (component.from === node) {
            totalCurrent = add(totalCurrent, current);
          } else if (component.to === node) {
            totalCurrent = sub(totalCurrent, current);
          }
        }
      } else if (component.kind === "voltage-source") {
        const branchCurrent = branchCurrents[component.id] ?? ZERO;
        if (component.from === node) {
          totalCurrent = add(totalCurrent, branchCurrent);
        } else if (component.to === node) {
          totalCurrent = sub(totalCurrent, branchCurrent);
        }
      }
    });
    nodeResults[node].current = totalCurrent;
    nodeResults[node].currentLatex = toLatex(totalCurrent);
  });

  return {
    nodeVoltages: nodeResults,
    branchCurrents,
    variables: nodeList,
  };
}
