import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToolControlsProps } from "@/lib/tools/types";
import { MathSpace } from "@/lib/computation/spaces/types";
import { getAllSpaces } from "@/lib/computation/spaces";

interface Graph3DControlsProps extends ToolControlsProps {
  space: MathSpace;
  onSpaceChange: (spaceId: string) => void;
}

export function Graph3DControls({ 
  toolConfig, 
  onConfigChange,
  space,
  onSpaceChange
}: Graph3DControlsProps) {
  const spaces = getAllSpaces();
  
  return (
    <Card className="p-4 space-y-4 bg-background/95 backdrop-blur">
      {/* Space Selector */}
      <div className="space-y-2">
        <Label>Coordinate System</Label>
        <Select value={space.id} onValueChange={onSpaceChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {spaces.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Resolution */}
      <div className="space-y-2">
        <Label>Resolution: {toolConfig.resolution || 50}</Label>
        <Slider
          value={[toolConfig.resolution || 50]}
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
          value={toolConfig.colorMode || 'height'} 
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
    </Card>
  );
}
