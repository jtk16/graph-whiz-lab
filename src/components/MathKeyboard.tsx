import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { KeyboardButton } from "@/components/KeyboardButton";
import { CATEGORY_INFO } from "@/lib/keyboard/categories";
import { getItemsByCategory, KeyboardItem } from "@/lib/keyboard/items";
import * as LucideIcons from "lucide-react";
import { Search } from "lucide-react";

interface MathKeyboardProps {
  onInsert: (item: KeyboardItem) => void;
}

export function MathKeyboard({ onInsert }: MathKeyboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(CATEGORY_INFO[0].id);

  const handleInsert = (item: KeyboardItem) => {
    onInsert(item);
    setSearchQuery(""); // Clear search after insert
  };

  // Filter items based on search
  const getFilteredItems = (categoryItems: KeyboardItem[]) => {
    if (!searchQuery) return categoryItems;
    const query = searchQuery.toLowerCase();
    return categoryItems.filter(
      item =>
        item.description.toLowerCase().includes(query) ||
        item.normalized.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
    );
  };

  return (
    <Card className="border-t">
      <div className="p-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search functions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={(val) => setActiveCategory(val as any)}>
          <ScrollArea className="w-full">
            <TabsList className="w-full justify-start">
              {CATEGORY_INFO.map((category) => {
                const IconComponent = (LucideIcons as any)[category.icon];
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="gap-2"
                  >
                    {IconComponent && <IconComponent className="h-4 w-4" />}
                    <span className="hidden sm:inline">{category.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>

          {/* Category Content */}
          {CATEGORY_INFO.map((category) => {
            const items = getItemsByCategory(category.id);
            const filteredItems = getFilteredItems(items);

            return (
              <TabsContent key={category.id} value={category.id} className="mt-4">
                <ScrollArea className="h-[200px]">
                  {filteredItems.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No items found
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {filteredItems.map((item) => (
                        <KeyboardButton
                          key={item.id}
                          item={item}
                          onClick={handleInsert}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </Card>
  );
}
