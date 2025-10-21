import { MathInput } from "@/components/MathInput";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/components/MathInput.css";

interface ExpressionInputProps {
  id: string;
  value: string;
  color: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  isActive: boolean;
  onFocus: () => void;
}

export const ExpressionInput = ({
  id,
  value,
  color,
  onChange,
  onRemove,
  isActive,
  onFocus,
}: ExpressionInputProps) => {
  return (
    <div
      className={`group flex items-center gap-2 p-2 rounded-lg transition-colors ${
        isActive ? "bg-expression-active" : "hover:bg-expression-hover"
      }`}
    >
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <MathInput
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        placeholder="y = x^2"
        className="flex-1"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
