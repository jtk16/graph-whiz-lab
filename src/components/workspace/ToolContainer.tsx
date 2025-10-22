import { VisualizationTool } from "@/lib/tools/types";
import { ReactNode } from "react";

interface ToolContainerProps {
  tool: VisualizationTool;
  size?: number;
  children: ReactNode;
}

/**
 * Wrapper component for individual tools
 * Handles common concerns like loading states and error boundaries
 */
export const ToolContainer = ({ tool, size, children }: ToolContainerProps) => {
  const style = size ? { flex: size } : { flex: 1 };
  
  return (
    <div 
      className="relative flex flex-col h-full overflow-hidden"
      style={style}
      data-tool-id={tool.id}
    >
      {children}
    </div>
  );
};
