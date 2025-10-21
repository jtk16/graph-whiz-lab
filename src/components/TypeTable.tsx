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
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">Type Information</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]"></TableHead>
              <TableHead>Expression</TableHead>
              <TableHead className="text-right">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expressions.map((expr) => (
              <TableRow key={expr.id}>
                <TableCell>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: expr.color }}
                  />
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {expr.normalized || expr.latex}
                </TableCell>
                <TableCell className="text-right">
                  <Badge 
                    variant="outline" 
                    className={getTypeColor(expr.typeInfo.type)}
                  >
                    {getTypeLabel(expr.typeInfo)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
