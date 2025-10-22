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
import { AVAILABLE_TOOLKITS, ToolkitExpression, Toolkit } from "@/lib/toolkits";
import { ToolkitDefinitionsPanel } from "./ToolkitDefinitionsPanel";
import { ToolkitExpressionSelector } from "./ToolkitExpressionSelector";
import { LayoutSelector } from "./workspace/LayoutSelector";
import { WorkspaceLayout } from "@/lib/workspace/types";
import { WORKSPACE_LAYOUTS } from "@/lib/workspace/layouts";
import * as LucideIcons from "lucide-react";

interface HeaderProps {
  toolkitDefinitions: ToolkitExpression[];
  onImportToolkit: (toolkitId: string, selectedExpressions: Omit<ToolkitExpression, 'id' | 'source'>[]) => void;
  onUpdateDefinition: (id: string, latex: string) => void;
  onRemoveDefinition: (id: string) => void;
  onClearAll: () => void;
  layout: WorkspaceLayout;
  onLayoutChange: (layout: WorkspaceLayout) => void;
}

export function Header({ 
  toolkitDefinitions,
  onImportToolkit, 
  onUpdateDefinition,
  onRemoveDefinition,
  onClearAll,
  layout,
  onLayoutChange
}: HeaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectedToolkit, setSelectedToolkit] = useState<Toolkit | null>(null);
  
  const handleToolkitClick = (toolkit: Toolkit) => {
    setSelectedToolkit(toolkit);
    setIsSelectorOpen(true);
  };
  
  const handleConfirmSelection = (selectedExpressions: Omit<ToolkitExpression, 'id' | 'source'>[]) => {
    if (selectedToolkit) {
      onImportToolkit(selectedToolkit.id, selectedExpressions);
      setIsSelectorOpen(false);
      setIsDialogOpen(true);
    }
  };

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 sticky top-0 z-10">
      <h1 className="text-xl font-semibold">Expression Grapher</h1>
      
      <div className="flex items-center gap-2">
        {/* Layout Selector */}
        <LayoutSelector
          currentLayout={layout}
          availableLayouts={WORKSPACE_LAYOUTS}
          onSelect={onLayoutChange}
        />
        
        {/* Toolkit Definitions Dialog */}
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
                  onClick={() => handleToolkitClick(toolkit)}
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
      </div>
      
      {/* Toolkit Expression Selector Dialog */}
      <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          {selectedToolkit && (
            <ToolkitExpressionSelector
              toolkit={selectedToolkit}
              importedExpressions={toolkitDefinitions}
              onConfirm={handleConfirmSelection}
              onCancel={() => setIsSelectorOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </header>
  );
}
