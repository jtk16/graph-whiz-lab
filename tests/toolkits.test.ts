import { describe, expect, it, beforeEach } from 'vitest';
import { listToolkits, registerToolkit } from '@/lib/toolkits';
import { resetToolkitStore } from '@/lib/toolkits/store';
import { signalProcessingToolkit } from '@/lib/toolkits/signalProcessing';
import { geometry3dToolkit } from '@/lib/toolkits/geometry3d';

describe('Toolkit registry', () => {
  beforeEach(() => {
    resetToolkitStore();
    [signalProcessingToolkit, geometry3dToolkit].forEach(registerToolkit);
  });

  it('exposes built-in toolkits', () => {
    const toolkits = listToolkits();
    expect(toolkits.some(t => t.id === 'signal-processing')).toBe(true);
    expect(toolkits.some(t => t.id === 'geometry3d')).toBe(true);
  });

  it('registers custom toolkits at runtime', () => {
    registerToolkit({
      id: 'test-kit',
      name: 'Test Kit',
      description: 'Synthetic toolkit for testing',
      icon: 'TestTube',
      expressions: [
        {
          latex: 'h(x) = x + 1',
          normalized: 'h(x)=x+1',
          description: 'Shift function',
          category: 'function',
        },
      ],
    });

    const toolkits = listToolkits();
    expect(toolkits.some(t => t.id === 'test-kit')).toBe(true);
  });
});
