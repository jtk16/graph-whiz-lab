import { Toolkit } from './types';

/**
 * Runtime registry for toolkits so modules can register and query them
 * without mutating shared arrays manually. This mirrors the operation/tool
 * registries and gives us a single source of truth for all bundled toolkits.
 */
class ToolkitStore {
  private toolkits = new Map<string, Toolkit>();

  register(toolkit: Toolkit): void {
    this.toolkits.set(toolkit.id, toolkit);
  }

  get(id: string): Toolkit | undefined {
    return this.toolkits.get(id);
  }

  getAll(): Toolkit[] {
    return Array.from(this.toolkits.values());
  }

  clear(): void {
    this.toolkits.clear();
  }
}

export const toolkitStore = new ToolkitStore();

export function registerToolkit(toolkit: Toolkit): void {
  toolkitStore.register(toolkit);
}

export function listToolkits(): Toolkit[] {
  return toolkitStore.getAll();
}

export function getToolkitById(id: string): Toolkit | undefined {
  return toolkitStore.get(id);
}

export function resetToolkitStore(): void {
  toolkitStore.clear();
}
