export interface ToolkitExpression {
  id: string;
  latex: string;
  normalized: string;
  description: string;
  category: 'definition' | 'function' | 'operator';
  source: string; // which toolkit it came from
  isModified?: boolean; // true if user edited it
  dependencies?: string[]; // function names this expression depends on
}

export interface Toolkit {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  expressions: Omit<ToolkitExpression, 'id' | 'source'>[];
}
