import type { JSX } from "react";
import type { CircuitComponent } from "@/lib/circuits/simulator";
import {
  COMPONENT_COLORS,
  CircuitKind,
  sanitizeIdentifier,
} from "@/lib/circuits/editorModel";

export const componentStroke = (kind: CircuitKind) => COMPONENT_COLORS[kind] ?? "#94a3b8";

const MIN_SYMBOL_LENGTH = 56;

export function computeSymbolLayout(length: number) {
  const minLead = 14;
  const minBody = 28;
  let lead = Math.min(Math.max(length * 0.18, minLead), 32);
  let body = length - lead * 2;
  if (body < minBody) {
    lead = Math.max((length - minBody) / 2, 10);
    body = length - lead * 2;
  }
  const start = lead;
  const end = length - lead;
  return { start, end, body };
}

export function renderComponentSymbol(
  kind: CircuitKind,
  rawLength: number,
  color: string,
  strokeWidth = 3
): JSX.Element {
  const length = Math.max(rawLength, 1);
  if (!Number.isFinite(length)) {
    return <line x1={0} y1={0} x2={0} y2={0} stroke={color} strokeWidth={strokeWidth} />;
  }

  if (kind === "wire" || length <= MIN_SYMBOL_LENGTH) {
    return (
      <line
        x1={0}
        y1={0}
        x2={length}
        y2={0}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    );
  }

  if (kind === "voltage-source") {
    const center = length / 2;
    const radius = Math.min(18, Math.max(12, length / 6));
    const glyphOffset = radius * 0.5;
    const glyphStroke = Math.max(1.2, strokeWidth * 0.7);
    return (
      <>
        <line
          x1={0}
          y1={0}
          x2={center - radius}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={center}
          cy={0}
          r={radius}
          fill="var(--background)"
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <line
          x1={center}
          y1={-glyphOffset - 4}
          x2={center}
          y2={-glyphOffset + 4}
          stroke={color}
          strokeWidth={glyphStroke}
          strokeLinecap="round"
        />
        <line
          x1={center - 6}
          y1={-glyphOffset}
          x2={center + 6}
          y2={-glyphOffset}
          stroke={color}
          strokeWidth={glyphStroke}
          strokeLinecap="round"
        />
        <line
          x1={center - 6}
          y1={glyphOffset}
          x2={center + 6}
          y2={glyphOffset}
          stroke={color}
          strokeWidth={glyphStroke}
          strokeLinecap="round"
        />
        <line
          x1={center + radius}
          y1={0}
          x2={length}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    );
  }

  if (kind === "current-source") {
    const center = length / 2;
    const radius = Math.min(18, Math.max(12, length / 6));
    const arrowLength = radius * 0.8;
    const glyphStroke = Math.max(1.2, strokeWidth * 0.7);
    const arrowHeadPoints = [
      `${center - 4},${-arrowLength * 0.5 + 8}`,
      `${center},${-arrowLength * 0.5}`,
      `${center + 4},${-arrowLength * 0.5 + 8}`,
    ].join(" ");
    return (
      <>
        <line
          x1={0}
          y1={0}
          x2={center - radius}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={center}
          cy={0}
          r={radius}
          fill="var(--background)"
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <line
          x1={center}
          y1={arrowLength * 0.5}
          x2={center}
          y2={-arrowLength * 0.5}
          stroke={color}
          strokeWidth={glyphStroke}
          strokeLinecap="round"
        />
        <polyline
          points={arrowHeadPoints}
          fill="none"
          stroke={color}
          strokeWidth={glyphStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1={center + radius}
          y1={0}
          x2={length}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    );
  }

  if (kind === "ground") {
    const baseWidth = Math.min(18, Math.max(12, strokeWidth * 6));
    const step = strokeWidth * 2;
    return (
      <>
        <line
          x1={0}
          y1={0}
          x2={length - baseWidth}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <polyline
          points={`${length - baseWidth},0 ${length - baseWidth + step},8 ${length - baseWidth + step * 2},0`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }

  if (kind === "resistor") {
    const zigzagCount = 6;
    const zigzagWidth = Math.max(6, (length - 28) / zigzagCount);
    const start = zigzagWidth * 0.5;
    const end = length - start;
    const points: string[] = [`${start},0`];
    let dir = -1;
    for (let index = 1; index < zigzagCount * 2; index += 1) {
      const x = start + (zigzagWidth / 2) * index;
      const y = dir * 8;
      points.push(`${x},${y}`);
      dir *= -1;
    }
    return (
      <>
        <line
          x1={0}
          y1={0}
          x2={start}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line
          x1={end}
          y1={0}
          x2={length}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    );
  }

  if (kind === "capacitor") {
    const plateHeight = 16;
    const { start, end } = computeSymbolLayout(length);
    return (
      <>
        <line
          x1={0}
          y1={0}
          x2={start}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1={start}
          y1={-plateHeight}
          x2={start}
          y2={plateHeight}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1={end}
          y1={-plateHeight}
          x2={end}
          y2={plateHeight}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1={end}
          y1={0}
          x2={length}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    );
  }

  if (kind === "inductor") {
    const loops = 4;
    const { start, end } = computeSymbolLayout(length);
    const segment = (end - start) / loops;
    const half = segment / 2;
    const radius = Math.min(10, segment * 0.6);
    let d = `M ${start.toFixed(2)} 0`;
    for (let i = 0; i < loops; i += 1) {
      d += ` q ${half.toFixed(2)} ${(-radius).toFixed(2)} ${half.toFixed(2)} 0`;
      d += ` q ${half.toFixed(2)} ${radius.toFixed(2)} ${half.toFixed(2)} 0`;
    }
    return (
      <>
        <line
          x1={0}
          y1={0}
          x2={start}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1={end}
          y1={0}
          x2={length}
          y2={0}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    );
  }

  return (
    <line
      x1={0}
      y1={0}
      x2={length}
      y2={0}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  );
}

const UNIT_PREFIXES: Array<{ threshold: number; symbol: string; factor: number }> = [
  { threshold: 1e12, symbol: "T", factor: 1e12 },
  { threshold: 1e9, symbol: "G", factor: 1e9 },
  { threshold: 1e6, symbol: "M", factor: 1e6 },
  { threshold: 1e3, symbol: "k", factor: 1e3 },
  { threshold: 1, symbol: "", factor: 1 },
  { threshold: 1e-3, symbol: "m", factor: 1e-3 },
  { threshold: 1e-6, symbol: "µ", factor: 1e-6 },
  { threshold: 1e-9, symbol: "n", factor: 1e-9 },
  { threshold: 1e-12, symbol: "p", factor: 1e-12 },
];

const formatWithUnit = (value: number, unit: string): string => {
  if (!Number.isFinite(value)) return `— ${unit}`;
  const absValue = Math.abs(value);
  const prefix =
    UNIT_PREFIXES.find(entry => absValue >= entry.threshold || entry.symbol === "p") ??
    UNIT_PREFIXES[UNIT_PREFIXES.length - 1];
  const scaled = value / prefix.factor;
  const precision =
    Math.abs(scaled) >= 100
      ? 0
      : Math.abs(scaled) >= 10
      ? 1
      : Math.abs(scaled) >= 1
      ? 2
      : 3;
  return `${scaled.toFixed(precision)} ${prefix.symbol}${unit}`.trim();
};

export function componentValueLabel(component: CircuitComponent): string {
  switch (component.kind) {
    case "resistor":
      return formatWithUnit(component.value, "Ω");
    case "capacitor":
      return formatWithUnit(component.value, "F");
    case "inductor":
      return formatWithUnit(component.value, "H");
    case "voltage-source":
      return component.waveform === "ac"
        ? `${formatWithUnit(component.amplitude ?? component.value, "V")} AC`
        : `${formatWithUnit(component.value, "V")} DC`;
    case "current-source":
      return component.waveform === "ac"
        ? `${formatWithUnit(component.amplitude ?? component.value, "A")} AC`
        : `${formatWithUnit(component.value, "A")} DC`;
    case "wire":
      return "wire";
    case "ground":
      return "0 V";
    default:
      return "";
  }
}

export function describeComponent(component: CircuitComponent): string {
  switch (component.kind) {
    case "resistor":
      return `${formatWithUnit(component.value, "Ω")} resistor`;
    case "wire":
      return "Ideal wire";
    case "capacitor":
      return `${formatWithUnit(component.value, "F")} capacitor`;
    case "inductor":
      return `${formatWithUnit(component.value, "H")} inductor`;
    case "voltage-source":
      return component.waveform === "ac"
        ? `${formatWithUnit(component.amplitude ?? component.value, "V")} AC source`
        : `${formatWithUnit(component.value, "V")} DC source`;
    case "current-source":
      return component.waveform === "ac"
        ? `${formatWithUnit(component.amplitude ?? component.value, "A")} AC source`
        : `${formatWithUnit(component.value, "A")} DC source`;
    case "ground":
      return `Ground reference (${component.from})`;
    default:
      return "";
  }
}

export function buildPiecewiseExpression(time: Float32Array, values: Float32Array, label: string): string {
  if (!time.length || !values.length) return "0";
  const identifier = sanitizeIdentifier(label);
  const samples = Math.min(40, time.length);
  const step = Math.max(1, Math.floor(time.length / samples));
  const parts: string[] = [];
  for (let idx = 0; idx < time.length; idx += step) {
    const t = time[idx];
    const v = values[idx];
    parts.push(`t<=${t.toFixed(6)},${v.toFixed(6)}`);
  }
  parts.push(`1,${values[values.length - 1].toFixed(6)}`);
  return `${identifier}(t)=piecewise(${parts.join(",")})`;
}
