/**
 * Tools System - Central Import Point
 * 
 * Import this file to auto-register all available tools.
 * Similar to how operations are registered.
 */

// Export public API
export * from './types';
export { toolRegistry } from './registry';

// Import all tool definitions to trigger auto-registration
import './definitions/graph2d';
import './definitions/graph3d';

// Tools will auto-register when their definition files are imported
if (process.env.NODE_ENV === 'development') {
  console.info('[tools] system initialized');
}

