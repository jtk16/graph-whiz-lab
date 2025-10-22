/**
 * Operations System - Single Source of Truth
 * 
 * Import this module to initialize all mathematical operations.
 * All operations are registered automatically on module load.
 */

// Core infrastructure
export * from './descriptor';
export * from './registry';

// Import all definitions to trigger registration
import './definitions/arithmetic';
import './definitions/comparison';
import './definitions/logical';
import './definitions/trigonometric';
import './definitions/mathematical';
import './definitions/list';
import './definitions/complex';
import './definitions/point';
import './definitions/signal';
import './definitions/calculus';
