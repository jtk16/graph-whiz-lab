import { useEffect, useMemo, useState } from "react";
import { listToolkits, ToolkitExpression } from "@/lib/toolkits";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Package2 } from "lucide-react";
import { ToolkitExpressionSelector } from "./ToolkitExpressionSelector";
import { ToolkitDefinitionsPanel } from "./ToolkitDefinitionsPanel";
import { cn } from "@/lib/utils";

interface ToolkitLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolkitDefinitions: ToolkitExpression[];
  onImportToolkit: (toolkitId: string, selectedExpressions: Omit<ToolkitExpression, "id" | "source">[]) => void;
  onUpdateDefinition: (id: string, latex: string) => void;
  onRemoveDefinition: (id: string) => void;
  onClearAll: () => void;
}

export function ToolkitLibraryDialog({
  open,
  onOpenChange,
  toolkitDefinitions,
  onImportToolkit,
  onUpdateDefinition,
  onRemoveDefinition,
  onClearAll,
}: ToolkitLibraryDialogProps) {
  const toolkits = useMemo(() => listToolkits(), []);
  const [activeTab, setActiveTab] = useState<"library" | "imported">("library");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedToolkitId, setSelectedToolkitId] = useState<string | null>(null);

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    toolkits.forEach(toolkit => {
      toolkit.expressions.forEach(expr => categories.add(expr.category));
    });
    return Array.from(categories).sort();
  }, [toolkits]);

  useEffect(() => {
    if (!open) {
      setSelectedToolkitId(null);
      setSearch("");
      setActiveCategory("all");
      setActiveTab("library");
    }
  }, [open]);

  const filteredToolkits = useMemo(() => {
    const term = search.trim().toLowerCase();
    return toolkits.filter(toolkit => {
      const matchesSearch =
        term.length === 0 ||
        toolkit.name.toLowerCase().includes(term) ||
        toolkit.description.toLowerCase().includes(term);
      const matchesCategory =
        activeCategory === "all" ||
        toolkit.expressions.some(expr => expr.category === activeCategory);
      return matchesSearch && matchesCategory;
    });
  }, [toolkits, search, activeCategory]);

  const selectedToolkit = selectedToolkitId
    ? toolkits.find(t => t.id === selectedToolkitId) ?? null
    : null;

  const handleToolkitSelect = (toolkitId: string) => {
    setSelectedToolkitId(toolkitId);
    setActiveTab("library");
  };

  const handleImport = (expressions: Omit<ToolkitExpression, "id" | "source">[]) => {
    if (!selectedToolkit) return;
    onImportToolkit(selectedToolkit.id, expressions);
    setActiveTab("imported");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[min(100%,960px)] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b bg-muted/40 px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package2 className="h-5 w-5 text-primary" />
            Toolkit Library
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Browse curated toolkits, preview expressions, and import them into your workspace.
          </p>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={value => setActiveTab(value as "library" | "imported")}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="imported">Imported ({toolkitDefinitions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="flex flex-1 min-h-0 flex-col px-6 pb-6">
            <div className="flex flex-1 min-h-0 gap-4">
              <div className="w-72 border rounded-lg bg-muted/30 flex flex-col min-h-0">
                <div className="p-4 border-b space-y-3">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="Search toolkits"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      className={cn(
                        "cursor-pointer",
                        activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                      onClick={() => setActiveCategory("all")}
                    >
                      All
                    </Badge>
                    {categoryOptions.map(category => (
                      <Badge
                        key={category}
                        className={cn(
                          "cursor-pointer",
                          activeCategory === category ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}
                        onClick={() => setActiveCategory(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2">
                    {filteredToolkits.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-6">
                        No toolkits match your filters.
                      </div>
                    )}
                    {filteredToolkits.map(toolkit => {
                      const importedCount = toolkitDefinitions.filter(def => def.source === toolkit.id).length;
                      const isActive = selectedToolkitId === toolkit.id;
                      return (
                        <button
                          key={toolkit.id}
                          className={cn(
                            "w-full text-left border rounded-lg p-3 transition-colors",
                            isActive ? "border-primary bg-primary/5" : "bg-background hover:bg-muted"
                          )}
                          onClick={() => handleToolkitSelect(toolkit.id)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">{toolkit.name}</div>
                            <span className="text-xs text-muted-foreground">
                              {toolkit.expressions.length} items
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {toolkit.description}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                            {importedCount > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {importedCount} imported
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-muted">
                              {toolkit.expressions[0]?.category ?? "Mixed"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden rounded-lg border bg-muted/10">
                {selectedToolkit ? (
                  <ToolkitExpressionSelector
                    toolkit={selectedToolkit}
                    importedExpressions={toolkitDefinitions}
                    onConfirm={(expressions) => {
                      handleImport(expressions);
                    }}
                    onCancel={() => setSelectedToolkitId(null)}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 text-muted-foreground">
                    <Package2 className="h-10 w-10 mb-4 opacity-60" />
                    <p className="text-sm font-medium">Select a toolkit to preview its expressions.</p>
                    <p className="text-xs mt-1">Search or filter by category to narrow down the list.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="imported" className="flex flex-1 min-h-0 flex-col px-6 pb-6">
            <div className="flex-1 overflow-hidden rounded-lg border bg-muted/20">
              <ToolkitDefinitionsPanel
                definitions={toolkitDefinitions}
                onUpdate={onUpdateDefinition}
                onRemove={onRemoveDefinition}
                onClearAll={onClearAll}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
