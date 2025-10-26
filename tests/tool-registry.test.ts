import { describe, expect, it } from 'vitest';
import { toolRegistry } from '@/lib/tools';

describe('Tool registry', () => {
  const coreTools = ['graph-2d', 'graph-3d', 'complex-plane', 'circuit'];

  it('registers all core visualization modules', () => {
    coreTools.forEach(id => {
      const tool = toolRegistry.get(id);
      expect(tool).toBeTruthy();
      expect(tool?.component).toBeDefined();
      expect(Array.isArray(tool?.supportedTypes)).toBe(true);
    });
  });

  it('returns metadata for module selectors', () => {
    const all = toolRegistry.getAll();
    const titles = all.map(tool => tool.name);
    expect(titles).toContain('2D Graph');
    expect(titles).toContain('Complex Plane');
  });
});
