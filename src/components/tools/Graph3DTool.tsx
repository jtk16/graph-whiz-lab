import { ToolProps } from "@/lib/tools/types";
import { Box } from "lucide-react";

/**
 * 3D Visualization Tool - Stub Implementation
 * 
 * This is a placeholder for the future 3D visualization tool.
 * Will be implemented with Three.js or React Three Fiber.
 */
export const Graph3DTool = ({ isActive }: ToolProps) => {
  if (!isActive) return null;
  
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted/20">
      <div className="text-center space-y-4 max-w-md p-8">
        <Box className="w-16 h-16 mx-auto text-muted-foreground/50" />
        <h3 className="text-xl font-semibold">3D Visualization Coming Soon</h3>
        <p className="text-muted-foreground">
          The 3D graphing tool is under development and will support:
        </p>
        <ul className="text-sm text-muted-foreground space-y-2 text-left">
          <li>• Surface plots: z = f(x,y)</li>
          <li>• Parametric curves and surfaces</li>
          <li>• 3D point clouds</li>
          <li>• Vector field visualization</li>
          <li>• Interactive rotation and zoom</li>
        </ul>
      </div>
    </div>
  );
};
