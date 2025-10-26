import { VisualizationTool } from "../types";
import { toolRegistry } from "../registry";
import { CircuitTool } from "@/components/tools/CircuitTool";
import { MathType } from "@/lib/types";

export const circuitTool: VisualizationTool = {
  id: "circuit",
  name: "Circuit",
  icon: "Zap",
  description: "Compose simple circuits and inspect node voltages/currents over time",
  category: "graph",
  supportedTypes: [MathType.Number, MathType.Function],
  component: CircuitTool,
};

toolRegistry.register(circuitTool);
