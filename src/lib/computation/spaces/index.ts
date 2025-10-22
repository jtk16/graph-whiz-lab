export * from './types';
export { cartesianSpace } from './cartesian';
export { complexPlaneSpace } from './complex';
export { polarSpace } from './polar';

import { MathSpace } from './types';
import { cartesianSpace } from './cartesian';
import { complexPlaneSpace } from './complex';
import { polarSpace } from './polar';

// Space registry
const spaces = new Map<string, MathSpace>();

export function registerSpace(space: MathSpace) {
  spaces.set(space.id, space);
}

export function getSpace(id: string): MathSpace | undefined {
  return spaces.get(id);
}

export function getAllSpaces(): MathSpace[] {
  return Array.from(spaces.values());
}

// Auto-register built-in spaces
registerSpace(cartesianSpace);
registerSpace(complexPlaneSpace);
registerSpace(polarSpace);
