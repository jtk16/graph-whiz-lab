import { ReactNode, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as LucideIcons from "lucide-react";
import { toolRegistry } from "@/lib/tools";

interface ModuleSelectorProps {
  onSelect: (toolId: string) => void;
  trigger?: ReactNode;
  align?: "start" | "center" | "end";
  label?: string;
  showLabel?: boolean;
}

export function ModuleSelector({
  onSelect,
  trigger,
  align = "start",
  label = "Add Module",
  showLabel = true,
}: ModuleSelectorProps) {
  const tools = useMemo(() => toolRegistry.getAll(), []);

  const Trigger = trigger ?? (
    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" title={label}>
      +
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{Trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64">
        {showLabel && (
          <>
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {tools.map(tool => {
          const Icon = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[tool.icon];
          return (
            <DropdownMenuItem key={tool.id} onClick={() => onSelect(tool.id)} className="cursor-pointer">
              {Icon && <Icon className="mr-2 h-4 w-4" />}
              <div className="flex flex-col">
                <span className="font-medium">{tool.name}</span>
                <span className="text-xs text-muted-foreground">{tool.description}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
