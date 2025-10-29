import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COMPONENT_LOOKUP,
  DEFAULT_NEW_COMPONENT,
  CircuitComponent,
  componentGlyph as getComponentGlyph,
} from "@/lib/circuits/editorModel";
import { cn } from "@/lib/utils";
import { componentValueLabel } from "./utils";

export interface ComponentInspectorProps {
  component: CircuitComponent;
  nodes: string[];
  onUpdate: (updater: (component: CircuitComponent) => CircuitComponent) => void;
  onRemove: () => void;
}

export const ComponentInspector = ({
  component,
  nodes,
  onUpdate,
  onRemove,
}: ComponentInspectorProps) => {
  const label = COMPONENT_LOOKUP[component.kind]?.label ?? component.kind;
  const glyph = getComponentGlyph(component.kind);
  const isSource = component.kind === "voltage-source" || component.kind === "current-source";
  const isPassive =
    component.kind === "resistor" || component.kind === "capacitor" || component.kind === "inductor";
  const isGround = component.kind === "ground";
  const displayValue = componentValueLabel(component);
  const valueUnit =
    component.kind === "resistor"
      ? "ohms"
      : component.kind === "capacitor"
      ? "F"
      : component.kind === "inductor"
      ? "H"
      : component.kind === "current-source"
      ? "A"
      : component.kind === "voltage-source"
      ? "V"
      : "";

  const handleNodeChange = (field: "from" | "to", value: string) => {
    onUpdate(prev => ({ ...prev, [field]: value } as CircuitComponent));
  };

  const handleSwap = () => {
    onUpdate(prev => ({ ...prev, from: prev.to, to: prev.from } as CircuitComponent));
  };

  const handleValueChange = (value: number) => {
    onUpdate(prev => {
      if (prev.kind === "resistor" || prev.kind === "capacitor" || prev.kind === "inductor") {
        return { ...prev, value: Math.max(Math.abs(value) || DEFAULT_NEW_COMPONENT.value, 1e-9) } as typeof prev;
      }
      if (prev.kind === "voltage-source" || prev.kind === "current-source") {
        return { ...prev, value: Math.max(Math.abs(value) || DEFAULT_NEW_COMPONENT.value, 1e-9) } as typeof prev;
      }
      return prev;
    });
  };

  const handleWaveformChange = (waveform: "dc" | "ac") => {
    onUpdate(prev => {
      if (prev.kind === "voltage-source" || prev.kind === "current-source") {
        const next = { ...prev, waveform } as typeof prev;
        if (waveform === "dc") {
          next.amplitude = undefined;
          next.frequency = undefined;
          next.phase = undefined;
          next.offset = undefined;
        } else {
          next.amplitude = prev.amplitude ?? prev.value;
          next.frequency = prev.frequency ?? DEFAULT_NEW_COMPONENT.frequency;
          next.phase = prev.phase ?? DEFAULT_NEW_COMPONENT.phase;
          next.offset = prev.offset ?? 0;
        }
        return next;
      }
      return prev;
    });
  };

  const handleSourceField = (field: "amplitude" | "frequency" | "phase" | "offset", value: number) => {
    onUpdate(prev => {
      if (prev.kind === "voltage-source" || prev.kind === "current-source") {
        let sanitized = value;
        if (field === "amplitude") {
          sanitized = Math.max(Math.abs(value) || prev.value, 1e-9);
        } else if (field === "frequency") {
          sanitized = Math.max(Math.abs(value) || DEFAULT_NEW_COMPONENT.frequency, 0);
        } else if (field === "offset") {
          sanitized = Number.isFinite(value) ? value : 0;
        } else if (field === "phase") {
          sanitized = Number.isFinite(value) ? value : 0;
        }
        return { ...prev, [field]: sanitized } as typeof prev;
      }
      return prev;
    });
  };

  const waveform = isSource ? component.waveform : undefined;
  const amplitude = isSource && component.waveform === "ac" ? component.amplitude ?? component.value : component.value;
  const frequency = isSource && component.waveform === "ac" ? component.frequency ?? DEFAULT_NEW_COMPONENT.frequency : undefined;
  const phase = isSource && component.waveform === "ac" ? component.phase ?? DEFAULT_NEW_COMPONENT.phase : undefined;
  const offset = isSource && component.waveform === "ac" ? component.offset ?? 0 : undefined;

  return (
    <div className="space-y-3 rounded border bg-muted/30 p-3 text-xs">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold capitalize">{label}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {component.from} &rarr; {component.to}
          </p>
          {component.kind !== "wire" && (
            <p className="font-mono text-[11px] text-primary/80">{displayValue}</p>
          )}
        </div>
        <Badge variant="secondary" className="font-mono">
          {glyph}
        </Badge>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className={cn("flex items-center gap-2", isGround && "md:col-span-2")}>\r\n          <Label className="w-12">From</Label>
          <Select value={component.from} onValueChange={value => handleNodeChange("from", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nodes.map(node => (
                <SelectItem key={node} value={node}>
                  {node}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="w-12">To</Label>
          <Select value={component.to} onValueChange={value => handleNodeChange("to", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nodes.map(node => (
                <SelectItem key={node} value={node}>
                  {node}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isGround && (
        <p className="text-[11px] text-muted-foreground">
          Ground enforces {component.from || "(unset)"} at 0 V.
        </p>
      )}
      {isSource ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="w-20">Waveform</Label>
            <Select value={waveform} onValueChange={value => handleWaveformChange(value as "dc" | "ac")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dc">DC</SelectItem>
                <SelectItem value="ac">AC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {component.waveform === "dc" ? (
            <div className="flex items-center gap-2">
              <Label className="w-20">
                {component.kind === "current-source" ? "Current" : "Voltage"} ({valueUnit})
              </Label>
              <Input
                type="number"
                value={component.value}
                onChange={e => handleValueChange(parseFloat(e.target.value) || component.value)}
              />
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <Label className="w-20">
                  {component.kind === "current-source" ? "Amplitude" : "Amplitude"} ({valueUnit})
                </Label>
                <Input
                  type="number"
                  value={amplitude ?? component.value}
                  onChange={e => handleSourceField("amplitude", parseFloat(e.target.value) || amplitude || component.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-20">Frequency (Hz)</Label>
                <Input
                  type="number"
                  value={frequency}
                  onChange={e => handleSourceField("frequency", parseFloat(e.target.value) || DEFAULT_NEW_COMPONENT.frequency)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-20">Phase (rad)</Label>
                <Input
                  type="number"
                  value={phase}
                  onChange={e => handleSourceField("phase", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-20">Offset ({valueUnit})</Label>
                <Input
                  type="number"
                  value={offset}
                  onChange={e => handleSourceField("offset", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          )}
        </div>
      ) : isPassive ? (
        <div className="flex items-center gap-2">
          <Label className="w-20">Value ({valueUnit})</Label>
          <Input
            type="number"
            value={component.value}
            onChange={e => handleValueChange(parseFloat(e.target.value) || component.value)}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleSwap}>
          Swap terminals
        </Button>
        <Button size="sm" variant="destructive" onClick={onRemove}>
          Remove component
        </Button>
      </div>
    </div>
  );
};
