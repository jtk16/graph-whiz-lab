import { Toolkit } from './types';

export const signalProcessingToolkit: Toolkit = {
  id: 'signal-processing',
  name: 'Signal Processing',
  description: 'Common signal processing functions and operators',
  icon: 'Radio',
  expressions: [
    {
      latex: 'u(t) = \\begin{cases} 0 & t < 0 \\\\ 1 & t \\geq 0 \\end{cases}',
      normalized: 'u(t)=if(t<0,0,1)',
      description: 'Unit step (Heaviside) function',
      category: 'function'
    },
    {
      latex: '\\delta(t) = \\begin{cases} 10 & |t| < 0.05 \\\\ 0 & \\text{otherwise} \\end{cases}',
      normalized: 'delta(t)=if(abs(t)<0.05,10,0)',
      description: 'Dirac delta (impulse) function - unit area approximation',
      category: 'function'
    },
    {
      latex: 'r(t) = t \\cdot u(t)',
      normalized: 'r(t)=t*u(t)',
      description: 'Ramp function',
      category: 'function'
    },
    {
      latex: '\\text{rect}(t) = u(t+0.5) - u(t-0.5)',
      normalized: 'rect(t)=u(t+0.5)-u(t-0.5)',
      description: 'Rectangular (gate) function',
      category: 'function'
    }
  ]
};
