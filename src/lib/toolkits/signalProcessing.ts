import { Toolkit } from './types';

export const signalProcessingToolkit: Toolkit = {
  id: 'signal-processing',
  name: 'Signal Processing',
  description: 'Common signal processing functions and operators',
  icon: 'Radio',
  expressions: [
    {
      latex: 'u(t) = \\begin{cases} 0 & t < 0 \\\\ 1 & t \\geq 0 \\end{cases}',
      normalized: 'u(t)=piecewise(t<0,0,1)',
      description: 'Unit step (Heaviside) function',
      category: 'function',
      dependencies: []
    },
    {
      latex: '\\delta(t) = \\frac{10}{\\sqrt{2\\pi \\cdot 0.0004}} e^{-\\frac{t^2}{0.0008}}',
      normalized: 'delta(t)=10*exp(-1250*t^2)',
      description: 'Dirac delta (impulse) function - continuous Gaussian approximation with unit area',
      category: 'function',
      dependencies: []
    },
    {
      latex: 'r(t) = t \\cdot u(t)',
      normalized: 'r(t)=t*u(t)',
      description: 'Ramp function',
      category: 'function',
      dependencies: ['u']
    },
    {
      latex: '\\text{rect}(t) = u(t+0.5) - u(t-0.5)',
      normalized: 'rect(t)=u(t+0.5)-u(t-0.5)',
      description: 'Rectangular (gate) function',
      category: 'function',
      dependencies: ['u']
    },
    {
      latex: '\\text{sinc}(t) = \\begin{cases} 1 & |t| < 0.001 \\\\ \\frac{\\sin(\\pi t)}{\\pi t} & \\text{otherwise} \\end{cases}',
      normalized: 'sinc(t)=if(abs(t)<0.001,1,sin(pi*t)/(pi*t))',
      description: 'Sinc function - normalized with removable singularity at t=0',
      category: 'function',
      dependencies: []
    },
    {
      latex: 'e_{d}(t) = e^{-t} \\cdot u(t)',
      normalized: 'e_d(t)=exp(-t)*u(t)',
      description: 'Exponential decay function',
      category: 'function',
      dependencies: ['u']
    },
    {
      latex: 'g(t) = e^{-t^2}',
      normalized: 'g(t)=exp(-t^2)',
      description: 'Gaussian pulse function',
      category: 'function',
      dependencies: []
    },
    {
      latex: '\\text{tri}(t) = \\begin{cases} 1-|t| & |t| < 1 \\\\ 0 & \\text{otherwise} \\end{cases}',
      normalized: 'tri(t)=piecewise(abs(t)<1,1-abs(t),0)',
      description: 'Triangle function',
      category: 'function',
      dependencies: []
    },
    {
      latex: '\\text{saw}(t) = t - \\text{floor}(t)',
      normalized: 'saw(t)=t-floor(t)',
      description: 'Sawtooth wave (period=1)',
      category: 'function',
      dependencies: []
    },
    {
      latex: '\\text{sq}(t) = \\begin{cases} 1 & \\text{floor}(t) \\bmod 2 = 0 \\\\ -1 & \\text{otherwise} \\end{cases}',
      normalized: 'sq(t)=piecewise(floor(t)-2*floor(floor(t)/2)==0,1,-1)',
      description: 'Square wave (period=2)',
      category: 'function',
      dependencies: []
    }
  ]
};
