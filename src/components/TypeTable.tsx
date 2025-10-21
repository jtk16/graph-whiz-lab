import { useState, useMemo } from "react";
import { Search, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getTypeLabel, getTypeColor, MathType } from "@/lib/types";
import { ToolkitExpression } from "@/lib/toolkits/types";
interface Expression {
  id: string;
  latex: string;
  normalized: string;
  color: string;
  typeInfo: {
    type: MathType;
    elementType?: MathType;
    domain?: MathType | MathType[];
    codomain?: MathType;
  };
}
interface TypeTableProps {
  expressions: Expression[];
  toolkitDefinitions?: ToolkitExpression[];
}
interface ExpressionRowProps {
  id: string;
  normalized: string;
  color?: string;
  badge: {
    label: string;
    className: string;
  };
}
function ExpressionRow({
  id,
  normalized,
  color,
  badge
}: ExpressionRowProps) {
  return <div key={id} className="flex items-center gap-3 text-sm py-1">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{
      backgroundColor: color || 'hsl(var(--muted-foreground))'
    }} />
      <div className="font-mono text-xs text-muted-foreground truncate flex-1 min-w-0">
        {normalized}
      </div>
      <Badge variant="outline" className={`text-xs flex-shrink-0 ${badge.className}`}>
        {badge.label}
      </Badge>
    </div>;
}
export function TypeTable({
  expressions,
  toolkitDefinitions = []
}: TypeTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [panelHeight, setPanelHeight] = useState(384); // 96 * 4 = 384px
  const [isDragging, setIsDragging] = useState(false);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const startY = e.clientY;
    const startHeight = panelHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(200, Math.min(800, startHeight - deltaY)); // Inverted deltaY
      setPanelHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const hasDefinitions = toolkitDefinitions.length > 0;
  const hasExpressions = expressions.length > 0;
  if (!hasDefinitions && !hasExpressions) {
    return null;
  }

  // Group toolkit definitions by source
  const groupedToolkits = useMemo(() => {
    const groups: Record<string, ToolkitExpression[]> = {};
    toolkitDefinitions.forEach(def => {
      if (!groups[def.source]) {
        groups[def.source] = [];
      }
      groups[def.source].push(def);
    });
    return groups;
  }, [toolkitDefinitions]);

  // Filter helper
  const filterExpression = (normalized: string) => {
    if (!searchQuery) return true;
    return normalized.toLowerCase().includes(searchQuery.toLowerCase());
  };

  // Filter user expressions
  const filteredUserExpressions = useMemo(() => {
    return expressions.filter(expr => filterExpression(expr.normalized || expr.latex));
  }, [expressions, searchQuery]);

  // Filter toolkit expressions
  const filteredToolkits = useMemo(() => {
    const filtered: Record<string, ToolkitExpression[]> = {};
    Object.entries(groupedToolkits).forEach(([source, defs]) => {
      const matchingDefs = defs.filter(def => filterExpression(def.normalized));
      if (matchingDefs.length > 0) {
        filtered[source] = matchingDefs;
      }
    });
    return filtered;
  }, [groupedToolkits, searchQuery]);
  const hasAnyResults = filteredUserExpressions.length > 0 || Object.keys(filteredToolkits).length > 0;
  return <div className="w-full bg-muted/30 relative">
      {/* Resize Handle */}
      <div 
        onMouseDown={handleMouseDown}
        className={`h-3 w-full cursor-ns-resize hover:bg-primary/20 active:bg-primary/30 transition-colors flex items-center justify-center group ${isDragging ? 'bg-primary/30' : 'bg-muted/40'}`}
        style={{ touchAction: 'none' }}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      
      <div className="px-4 py-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
          Type Information
        </h3>
        
        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="text" placeholder="Search expressions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-9 text-xs" />
        </div>

        {/* Scrollable Content with hidden scrollbar */}
        <ScrollArea className="overflow-auto scrollbar-hide" style={{ height: `${panelHeight}px` }}>
          <div className="pr-4">
            {!hasAnyResults ? <div className="text-xs text-muted-foreground italic py-4 text-center">
                No matching expressions
              </div> : <Accordion type="multiple" defaultValue={["user-expressions"]} className="w-full">
              {/* User Expressions Section */}
              {hasExpressions && <AccordionItem value="user-expressions" className="border-b">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-2">
              <div className="flex items-center gap-2 w-full">
                <span>Your Expressions</span>
                <Badge variant="secondary" className="mr-2 bg-primary/10 text-primary border-primary/20">
                  {filteredUserExpressions.length}
                  {searchQuery && expressions.length !== filteredUserExpressions.length && ` / ${expressions.length}`}
                </Badge>
              </div>
            </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1.5 pb-2">
                      {filteredUserExpressions.length === 0 ? <div className="text-xs text-muted-foreground italic py-2">
                          No matching expressions
                        </div> : filteredUserExpressions.map(expr => <ExpressionRow key={expr.id} id={expr.id} normalized={expr.normalized || expr.latex} color={expr.color} badge={{
                  label: getTypeLabel(expr.typeInfo),
                  className: getTypeColor(expr.typeInfo.type)
                }} />)}
                    </div>
                  </AccordionContent>
                </AccordionItem>}

                {/* Toolkit Sections */}
                {Object.entries(filteredToolkits).map(([source, defs]) => {
              const totalCount = groupedToolkits[source]?.length || 0;
              const filteredCount = defs.length;
            return <AccordionItem key={source} value={source} className="border-b">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-2">
              <div className="flex items-center gap-2 w-full">
                <span>{source}</span>
                <Badge variant="outline" className="mr-2 text-muted-foreground">
                  {filteredCount}
                  {searchQuery && totalCount !== filteredCount && ` / ${totalCount}`}
                </Badge>
              </div>
            </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1.5 pb-2">
                        {defs.map(def => <ExpressionRow key={def.id} id={def.id} normalized={def.normalized} badge={{
                    label: def.category,
                    className: "bg-primary/10 text-primary border-primary/20"
                  }} />)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>;
          })}
            </Accordion>}
          </div>
        </ScrollArea>
      </div>
    </div>;
}