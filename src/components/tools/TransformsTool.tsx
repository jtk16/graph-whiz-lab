import { Graph2DTool } from "./Graph2DTool";
import { ToolProps } from "@/lib/tools/types";

/**
 * Thin wrapper around Graph2D so transforms workflows can live in their
 * own dock tab. We reuse the 2D canvas because transforms data is usually
 * visualized as time/frequency magnitude plots.
 */
export const TransformsTool = (props: ToolProps) => {
  return <Graph2DTool {...props} />;
};

