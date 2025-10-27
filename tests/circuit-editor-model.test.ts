import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEW_COMPONENT,
  NODE_MARGIN,
  applyNodeSnap,
  componentGlyph,
  extractCircuitNodes,
  generateNodeName,
  hotkeyToKind,
  retargetComponentToNode,
  sanitizeIdentifier,
  stageComponentForNodeDrop,
  stageComponentFromKind,
} from "@/lib/circuits/editorModel";
import type { CircuitComponent } from "@/lib/circuits/simulator";

const buildComponent = (overrides?: Partial<CircuitComponent>): CircuitComponent => ({
  id: "r1",
  kind: "resistor",
  from: "vin",
  to: "vout",
  value: 1000,
  ...(overrides as any),
});

describe("Circuit editor model helpers", () => {
  it("maps HOTAS-style shortcuts to component kinds", () => {
    expect(hotkeyToKind.w).toBe("wire");
    expect(hotkeyToKind.r).toBe("resistor");
    expect(hotkeyToKind.c).toBe("capacitor");
    expect(hotkeyToKind.l).toBe("inductor");
    expect(hotkeyToKind.v).toBe("voltage-source");
    expect(hotkeyToKind.i).toBe("current-source");
  });

  it("stages new component kinds while preserving source parameters", () => {
    const stagedVoltage = stageComponentFromKind(
      { ...DEFAULT_NEW_COMPONENT, kind: "resistor", waveform: "dc" },
      "voltage-source"
    );
    expect(stagedVoltage.kind).toBe("voltage-source");
    expect(stagedVoltage.waveform).toBe("dc");

    const stagedCapacitor = stageComponentFromKind(
      { ...stagedVoltage, kind: "voltage-source", waveform: "ac", amplitude: 3 },
      "capacitor"
    );
    expect(stagedCapacitor.kind).toBe("capacitor");
    expect(stagedCapacitor.waveform).toBe("dc");
  });

  it("stages components dropped on a node by setting the start terminal", () => {
    const staged = stageComponentForNodeDrop(
      { ...DEFAULT_NEW_COMPONENT, kind: "wire", from: "a", to: "b" },
      "resistor",
      "n5"
    );
    expect(staged.kind).toBe("resistor");
    expect(staged.from).toBe("n5");
    expect(staged.to).not.toBe("n5");
  });

  it("retargets a component's destination node while keeping polarity sensible", () => {
    const resistor = buildComponent();
    expect(retargetComponentToNode(resistor, "n2")).toMatchObject({ to: "n2" });

    const flipped = retargetComponentToNode(resistor, "vin");
    expect(flipped.from).toBe("vout");
    expect(flipped.to).toBe("vin");
  });

  it("snaps node movement unless snapping is disabled", () => {
    const snapped = applyNodeSnap({ x: 33, y: 47 }, true);
    expect(snapped.x).toBe(NODE_MARGIN);
    expect(snapped.y).toBe(48);

    const free = applyNodeSnap({ x: 33.5, y: 47.2 }, true, true);
    expect(free.x).toBeCloseTo(33.5, 5);
    expect(free.y).toBeCloseTo(47.2, 5);
  });

  it("extracts circuit nodes including ground", () => {
    const nodes = extractCircuitNodes([
      buildComponent({ from: "n1", to: "n2" }),
      buildComponent({ id: "vs", kind: "voltage-source", from: "vin", to: "gnd", waveform: "dc", value: 5 }),
    ]);
    expect(nodes).toContain("gnd");
    expect(nodes).toContain("vin");
    expect(nodes).toContain("n1");
    expect(nodes).toContain("n2");
  });

  it("sanitizes node identifiers and guarantees uniqueness", () => {
    expect(sanitizeIdentifier("!out#1")).toBe("out1");
    expect(sanitizeIdentifier("123abc")).toBe("n123abc");

    const nextName = generateNodeName(["gnd", "n1", "n2"]);
    expect(nextName).toBe("n3");
  });

  it("provides glyphs for every component kind", () => {
    expect(componentGlyph("resistor")).toBe("R");
    expect(componentGlyph("capacitor")).toBe("C");
    expect(componentGlyph("inductor")).toBe("L");
    expect(componentGlyph("voltage-source")).toBe("V");
    expect(componentGlyph("current-source")).toBe("I");
    expect(componentGlyph("wire")).toBe("W");
  });
});
