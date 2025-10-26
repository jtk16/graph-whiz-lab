import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ToolControlsProps } from "@/lib/tools/types";
import { MathSpace } from "@/lib/computation/spaces/types";
import { getAllSpaces } from "@/lib/computation/spaces";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Graph3DControlsProps extends ToolControlsProps {
  space: MathSpace;
  onSpaceChange: (spaceId: string) => void;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function Graph3DControls({ 
  toolConfig, 
  onConfigChange,
  space,
  onSpaceChange,
  collapsible = true,
  defaultOpen = true,
}: Graph3DControlsProps) {
  const spaces = useMemo(() => getAllSpaces(), []);
  const [isOpen, setIsOpen] = useState(!collapsible ? true : defaultOpen);
  const resolution = toolConfig.resolution || 50;
  
  return (
    <Card className="w-72 space-y-4 bg-background/95 p-4 backdrop-blur">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">3D Controls</p>
          <p className="text-xs text-muted-foreground">
            {space.name} · Res {resolution}
          </p>
        </div>
        {collapsible && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Collapse controls" : "Expand controls"}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="space-y-4">
          {/* Space Selector */}
          <div className="space-y-2">
            <Label>Coordinate System</Label>
            <Select value={space.id} onValueChange={onSpaceChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <Label>Resolution: {resolution}</Label>
            <Slider
              value={[resolution]}
              onValueChange={([value]) => onConfigChange({ ...toolConfig, resolution: value })}
              min={20}
              max={100}
              step={10}
            />
          </div>

          {/* Wireframe */}
          <div className="flex items-center justify-between">
            <Label>Wireframe</Label>
            <Switch
              checked={toolConfig.wireframe || false}
              onCheckedChange={(checked) => onConfigChange({ ...toolConfig, wireframe: checked })}
            />
          </div>

          {/* Grid */}
          <div className="flex items-center justify-between">
            <Label>Show Grid</Label>
            <Switch
              checked={toolConfig.showGrid !== false}
              onCheckedChange={(checked) => onConfigChange({ ...toolConfig, showGrid: checked })}
            />
          </div>

          {/* Axes */}
          <div className="flex items-center justify-between">
            <Label>Show Axes</Label>
            <Switch
              checked={toolConfig.showAxes !== false}
              onCheckedChange={(checked) => onConfigChange({ ...toolConfig, showAxes: checked })}
            />
          </div>

          {/* Color Mode */}
          <div className="space-y-2">
            <Label>Color Mode</Label>
            <Select
              value={toolConfig.colorMode || "height"}
              onValueChange={(value) => onConfigChange({ ...toolConfig, colorMode: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="height">Height</SelectItem>
                <SelectItem value="domain">Domain (Complex)</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </Card>
  );
}
