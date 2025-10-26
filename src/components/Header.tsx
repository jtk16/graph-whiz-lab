import { useState } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolkitExpression } from "@/lib/toolkits";
import { ThemeToggle } from "./ThemeToggle";
import { ToolkitLibraryDialog } from "./ToolkitLibraryDialog";

interface HeaderProps {
  toolkitDefinitions: ToolkitExpression[];
  onImportToolkit: (toolkitId: string, selectedExpressions: Omit<ToolkitExpression, 'id' | 'source'>[]) => void;
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
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 sticky top-0 z-10">
      <h1 className="text-xl font-semibold">Expression Grapher</h1>
      
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <ThemeToggle />
        
        <Button variant="outline" onClick={() => setIsLibraryOpen(true)}>
          <Package className="mr-2 h-4 w-4" />
          Toolkit Library
          {toolkitDefinitions.length > 0 && (
            <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
              {toolkitDefinitions.length}
            </span>
          )}
        </Button>
      </div>
      
      <ToolkitLibraryDialog
        open={isLibraryOpen}
        onOpenChange={setIsLibraryOpen}
        toolkitDefinitions={toolkitDefinitions}
        onImportToolkit={onImportToolkit}
        onUpdateDefinition={onUpdateDefinition}
        onRemoveDefinition={onRemoveDefinition}
        onClearAll={onClearAll}
      />
    </header>
  );
}
