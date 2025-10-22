import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Graph2DControlsProps {
  viewport: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
  onViewportChange: (viewport: Graph2DControlsProps['viewport']) => void;
}

export const Graph2DControls = ({
  viewport,
  onViewportChange,
}: Graph2DControlsProps) => {
  const handleZoomIn = () => {
    const xCenter = (viewport.xMin + viewport.xMax) / 2;
    const yCenter = (viewport.yMin + viewport.yMax) / 2;
    const xRange = (viewport.xMax - viewport.xMin) * 0.8;
    const yRange = (viewport.yMax - viewport.yMin) * 0.8;
    
    onViewportChange({
      xMin: xCenter - xRange / 2,
      xMax: xCenter + xRange / 2,
      yMin: yCenter - yRange / 2,
      yMax: yCenter + yRange / 2,
    });
  };

  const handleZoomOut = () => {
    const xCenter = (viewport.xMin + viewport.xMax) / 2;
    const yCenter = (viewport.yMin + viewport.yMax) / 2;
    const xRange = (viewport.xMax - viewport.xMin) * 1.2;
    const yRange = (viewport.yMax - viewport.yMin) * 1.2;
    
    onViewportChange({
      xMin: xCenter - xRange / 2,
      xMax: xCenter + xRange / 2,
      yMin: yCenter - yRange / 2,
      yMax: yCenter + yRange / 2,
    });
  };

  const handleResetView = () => {
    onViewportChange({
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
    });
  };

  return (
    <div className="absolute top-4 right-4 flex gap-2 bg-card/80 backdrop-blur-sm p-2 rounded-lg border border-border shadow-lg">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomIn}
        title="Zoom In"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleZoomOut}
        title="Zoom Out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleResetView}
        title="Reset View"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
