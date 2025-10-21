import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AVAILABLE_TOOLKITS, ToolkitExpression } from "@/lib/toolkits";
import { ToolkitDefinitionsPanel } from "./ToolkitDefinitionsPanel";
import * as LucideIcons from "lucide-react";

interface HeaderProps {
  toolkitDefinitions: ToolkitExpression[];
  onImportToolkit: (toolkitId: string) => void;
  onUpdateDefinition: (id: string, latex: string) => void;
  onRemoveDefinition: (id: string) => void;
  onClearAll: () => void;
}

export function Header({ 
  toolkitDefinitions,
  onImportToolkit, 
  onUpdateDefinition,
  onRemoveDefinition,
  onClearAll 
}: HeaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleImport = (toolkitId: string) => {
    onImportToolkit(toolkitId);
    setIsDialogOpen(true);
  };

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 sticky top-0 z-10">
      <h1 className="text-xl font-semibold">Expression Grapher</h1>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Toolkits
              {toolkitDefinitions.length > 0 && (
                <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                  {toolkitDefinitions.length}
                </span>
              )}
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
                  onClick={() => handleImport(toolkit.id)}
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
            <DropdownMenuSeparator />
            <DialogTrigger asChild>
              <DropdownMenuItem className="cursor-pointer">
                <Package className="mr-2 h-4 w-4" />
                Manage Definitions ({toolkitDefinitions.length})
              </DropdownMenuItem>
            </DialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>

        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Toolkit Definitions</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ToolkitDefinitionsPanel
              definitions={toolkitDefinitions}
              onUpdate={onUpdateDefinition}
              onRemove={onRemoveDefinition}
              onClearAll={onClearAll}
            />
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
