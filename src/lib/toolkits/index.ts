import { signalProcessingToolkit } from "./signalProcessing";
import { geometry3dToolkit } from "./geometry3d";
import { transformsToolkit } from "./transforms";
import { registerToolkit, listToolkits, getToolkitById } from "./store";

export * from './types';
export { registerToolkit, listToolkits, getToolkitById } from './store';

// Register built-in toolkits at module load so additional modules can
// register their own toolkits via registerToolkit without mutating globals.
[signalProcessingToolkit, geometry3dToolkit, transformsToolkit].forEach(registerToolkit);
