import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTypeLabel, getTypeColor, MathType } from "@/lib/types";

interface Expression {
  id: string;
  latex: string;
  normalized: string;
  color: string;
  typeInfo: {
    type: MathType;
    elementType?: MathType;
    domain?: MathType;
    codomain?: MathType;
  };
}

interface TypeTableProps {
  expressions: Expression[];
}

export function TypeTable({ expressions }: TypeTableProps) {
  if (expressions.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-muted/30">
      <div className="px-4 py-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Type Information</h3>
        <div className="space-y-1.5">
          {expressions.map((expr) => (
            <div key={expr.id} className="flex items-center gap-3 text-sm py-1">
              <div 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: expr.color }}
              />
              <div className="font-mono text-xs text-muted-foreground truncate flex-1 min-w-0">
                {expr.normalized || expr.latex}
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs flex-shrink-0 ${getTypeColor(expr.typeInfo.type)}`}
              >
                {getTypeLabel(expr.typeInfo)}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
