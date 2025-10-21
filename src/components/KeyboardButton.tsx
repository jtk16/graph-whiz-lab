import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KeyboardItem } from "@/lib/keyboard/items";
import 'mathlive';

interface KeyboardButtonProps {
  item: KeyboardItem;
  onClick: (item: KeyboardItem) => void;
}

export function KeyboardButton({ item, onClick }: KeyboardButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onClick(item)}
            className="h-12 min-w-[3rem] font-math text-base hover:bg-primary/10 hover:border-primary transition-colors"
          >
            <span 
              dangerouslySetInnerHTML={{ 
                __html: `<math-field read-only style="font-size: 14px; border: none; background: transparent; pointer-events: none;">${item.latex}</math-field>` 
              }} 
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-semibold">{item.description}</div>
            {item.example && (
              <div className="text-muted-foreground text-xs mt-1">
                Example: {item.example}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
