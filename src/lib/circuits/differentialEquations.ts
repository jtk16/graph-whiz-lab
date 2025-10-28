import { CircuitComponent } from "./simulator";
import { DEFAULT_NEW_COMPONENT, sanitizeIdentifier } from "./editorModel";

export interface DifferentialEquation {
  id: string;
  label: string;
  plain: string;
  latex: string;
}

const voltageLabel = (node: string) => `V_${sanitizeIdentifier(node)}(t)`;
const voltageLabelLatex = (node: string) => `V_{${sanitizeIdentifier(node)}}(t)`;
const currentLabel = (id: string) => `I_${sanitizeIdentifier(id)}(t)`;
const currentLabelLatex = (id: string) => `I_{${sanitizeIdentifier(id)}}(t)`;

const defaultFrequency = DEFAULT_NEW_COMPONENT.frequency;
const defaultPhase = DEFAULT_NEW_COMPONENT.phase;
const defaultAmplitude = DEFAULT_NEW_COMPONENT.amplitude;

export const buildDifferentialEquations = (
  components: CircuitComponent[]
): DifferentialEquation[] => {
  const equations: DifferentialEquation[] = [];

  components.forEach(component => {
    switch (component.kind) {
      case "resistor":
        equations.push({
          id: `res-${component.id}`,
          label: `${component.id} (Resistor)`,
          plain: `${currentLabel(component.id)} = (${voltageLabel(component.from)} - ${voltageLabel(component.to)}) / ${component.value}`,
          latex: `${currentLabelLatex(component.id)} = \\frac{${voltageLabelLatex(component.from)} - ${voltageLabelLatex(component.to)}}{${component.value}}`,
        });
        break;
      case "capacitor":
        equations.push({
          id: `cap-${component.id}`,
          label: `${component.id} (Capacitor)`,
          plain: `${currentLabel(component.id)} = ${component.value} * d/dt (${voltageLabel(component.from)} - ${voltageLabel(component.to)})`,
          latex: `${currentLabelLatex(component.id)} = ${component.value}\\,\\frac{d}{dt}\\left(${voltageLabelLatex(component.from)} - ${voltageLabelLatex(component.to)}\\right)`,
        });
        break;
      case "inductor":
        equations.push({
          id: `ind-${component.id}`,
          label: `${component.id} (Inductor)`,
          plain: `${voltageLabel(component.from)} - ${voltageLabel(component.to)} = ${component.value} * d/dt ${currentLabel(component.id)}`,
          latex: `${voltageLabelLatex(component.from)} - ${voltageLabelLatex(component.to)} = ${component.value}\\,\\frac{d}{dt}${currentLabelLatex(component.id)}`,
        });
        break;
      case "voltage-source": {
        const header = `${component.id} (Voltage Source)`;
        if (component.waveform === "ac") {
          const amplitude = component.amplitude ?? defaultAmplitude;
          const frequency = component.frequency ?? defaultFrequency;
          const phase = component.phase ?? defaultPhase;
          const offset = component.offset ?? 0;
          equations.push({
            id: `vs-${component.id}`,
            label: header,
            plain: `${voltageLabel(component.from)} - ${voltageLabel(component.to)} = ${offset} + ${amplitude} * sin(2*pi * ${frequency} * t + ${phase})`,
            latex: `${voltageLabelLatex(component.from)} - ${voltageLabelLatex(component.to)} = ${offset} + ${amplitude}\\sin(2\\pi ${frequency} t + ${phase})`,
          });
        } else {
          equations.push({
            id: `vs-${component.id}`,
            label: header,
            plain: `${voltageLabel(component.from)} - ${voltageLabel(component.to)} = ${component.value}`,
            latex: `${voltageLabelLatex(component.from)} - ${voltageLabelLatex(component.to)} = ${component.value}`,
          });
        }
        break;
      }
      case "current-source": {
        const header = `${component.id} (Current Source)`;
        if (component.waveform === "ac") {
          const amplitude = component.amplitude ?? defaultAmplitude;
          const frequency = component.frequency ?? defaultFrequency;
          const phase = component.phase ?? defaultPhase;
          const offset = component.offset ?? 0;
          equations.push({
            id: `cs-${component.id}`,
            label: header,
            plain: `${currentLabel(component.id)} = ${offset} + ${amplitude} * sin(2*pi * ${frequency} * t + ${phase})`,
            latex: `${currentLabelLatex(component.id)} = ${offset} + ${amplitude}\\sin(2\\pi ${frequency} t + ${phase})`,
          });
        } else {
          equations.push({
            id: `cs-${component.id}`,
            label: header,
            plain: `${currentLabel(component.id)} = ${component.value}`,
            latex: `${currentLabelLatex(component.id)} = ${component.value}`,
          });
        }
        break;
      }
      default:
        break;
    }
  });

  return equations;
};
