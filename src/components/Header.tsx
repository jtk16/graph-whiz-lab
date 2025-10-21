import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AVAILABLE_TOOLKITS } from "@/lib/toolkits";
import * as LucideIcons from "lucide-react";

interface HeaderProps {
  onImportToolkit: (toolkitId: string) => void;
}

export function Header({ onImportToolkit }: HeaderProps) {
  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 sticky top-0 z-10">
      <h1 className="text-xl font-semibold">Expression Grapher</h1>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Package className="mr-2 h-4 w-4" />
            Toolkits
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-background">
          <DropdownMenuLabel>Import Toolkit</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {AVAILABLE_TOOLKITS.map(toolkit => {
            const IconComponent = LucideIcons[toolkit.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
            return (
              <DropdownMenuItem 
                key={toolkit.id}
                onClick={() => onImportToolkit(toolkit.id)}
                className="cursor-pointer"
              >
                {IconComponent && <IconComponent className="mr-2 h-4 w-4" />}
                <div className="flex flex-col">
                  <span className="font-medium">{toolkit.name}</span>
                  <span className="text-xs text-muted-foreground">{toolkit.description}</span>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
