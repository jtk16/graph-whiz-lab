import { Toolkit } from './types';
import { signalProcessingToolkit } from './signalProcessing';

export * from './types';

export const AVAILABLE_TOOLKITS: Toolkit[] = [
  signalProcessingToolkit,
];

export function getToolkitById(id: string): Toolkit | undefined {
  return AVAILABLE_TOOLKITS.find(toolkit => toolkit.id === id);
}
