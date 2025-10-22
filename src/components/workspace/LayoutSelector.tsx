import { WorkspaceLayout } from "@/lib/workspace/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import * as LucideIcons from "lucide-react";
import { Layout } from "lucide-react";

interface LayoutSelectorProps {
  currentLayout: WorkspaceLayout;
  availableLayouts: WorkspaceLayout[];
  onSelect: (layout: WorkspaceLayout) => void;
}

export function LayoutSelector({ 
  currentLayout, 
  availableLayouts, 
  onSelect 
}: LayoutSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Layout className="mr-2 h-4 w-4" />
          {currentLayout.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Workspace Layout</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableLayouts.map(layout => {
          const IconComponent = LucideIcons[layout.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
          const isActive = layout.id === currentLayout.id;
          
          return (
            <DropdownMenuItem 
              key={layout.id}
              onClick={() => onSelect(layout)}
              className="cursor-pointer"
            >
              {IconComponent && <IconComponent className="mr-2 h-4 w-4" />}
              <div className="flex flex-col flex-1">
                <span className={isActive ? "font-medium" : ""}>
                  {layout.name}
                  {isActive && " ✓"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {layout.description}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
