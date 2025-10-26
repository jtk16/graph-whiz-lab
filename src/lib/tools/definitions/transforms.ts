import { VisualizationTool } from "../types";
import { TransformsTool } from "@/components/tools/TransformsTool";
import { MathType } from "@/lib/types";
import { toolRegistry } from "../registry";

export const transformsTool: VisualizationTool = {
  id: "transforms",
  name: "Transforms",
  icon: "Activity",
  description: "FFT, Laplace, z-domain, and wavelet views for signal pipelines",
  category: "graph",
  supportedTypes: [
    MathType.Function,
    MathType.Number,
    MathType.List,
    MathType.Complex,
    MathType.Boolean,
  ],
  component: TransformsTool,
};

toolRegistry.register(transformsTool);

