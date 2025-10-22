import { Toolkit } from './types';
import { signalProcessingToolkit } from './signalProcessing';
import { geometry3dToolkit } from './geometry3d';

export * from './types';

export const AVAILABLE_TOOLKITS: Toolkit[] = [
  signalProcessingToolkit,
  geometry3dToolkit
];

export function getToolkitById(id: string): Toolkit | undefined {
  return AVAILABLE_TOOLKITS.find(toolkit => toolkit.id === id);
}
