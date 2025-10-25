import { VisualizationTool } from './types';
import { MathType } from '../types';

/**
 * Central registry for visualization tools
 * 
 * Similar to the operations registry, this manages all available tools
 * and provides methods to query and retrieve them.
 */
class ToolRegistry {
  private tools = new Map<string, VisualizationTool>();
  
  /**
   * Register a visualization tool
   * Tools should auto-register on import
   */
  register(tool: VisualizationTool): void {
    if (this.tools.has(tool.id)) {
      console.warn(`Tool ${tool.id} is already registered, overwriting`);
    }
    this.tools.set(tool.id, tool);
    if (process.env.NODE_ENV === 'development') {
      console.info(`[tools] registered: ${tool.id}`);
    }
  }
  
  /**
   * Get a tool by its ID
   */
  get(id: string): VisualizationTool | undefined {
    return this.tools.get(id);
  }
  
  /**
   * Get all registered tools
   */
  getAll(): VisualizationTool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get tools by category
   */
  getByCategory(category: string): VisualizationTool[] {
    return this.getAll().filter(t => t.category === category);
  }
  
  /**
   * Get tools that can visualize a given expression type
   * Useful for suggesting which tools to use for a given expression
   */
  getCompatibleTools(type: MathType): VisualizationTool[] {
    return this.getAll().filter(t => 
      t.supportedTypes.includes(type) || 
      t.supportedTypes.includes(MathType.Unknown)
    );
  }
  
  /**
   * Check if a tool is registered
   */
  has(id: string): boolean {
    return this.tools.has(id);
  }
}

/**
 * Singleton tool registry instance
 * Import this to access registered tools
 */
export const toolRegistry = new ToolRegistry();


