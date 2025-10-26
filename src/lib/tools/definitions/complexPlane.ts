import { VisualizationTool } from "../types";
import { toolRegistry } from "../registry";
import { ComplexPlaneTool } from "@/components/tools/ComplexPlaneTool";
import { MathType } from "@/lib/types";

export const complexPlaneTool: VisualizationTool = {
  id: "complex-plane",
  name: "Complex Plane",
  icon: "Orbit",
  description: "Domain coloring and component surfaces for complex-valued functions",
  category: "graph",
  supportedTypes: [
    MathType.Function,
    MathType.Complex,
    MathType.Number,
    MathType.List,
  ],
  component: ComplexPlaneTool,
};

toolRegistry.register(complexPlaneTool);
