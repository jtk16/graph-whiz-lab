// Signal processing functions using unified registry
import { MathType } from '../types';
import { RuntimeValue, createList, createNumber, createComplex, isList, isNumber, isComplex } from './value';
import { KeyboardCategory } from '../keyboard/categories';
import { registerFunction } from './registry';
import { computeFFT, computeIFFT } from '../computation/signal';

registerFunction({
  name: 'fft',
  signatures: [{
    paramType: MathType.List,
    returnType: MathType.List,
    execute: (arg) => {
      if (!isList(arg)) throw new Error('fft expects List');
      
      const values = arg.elements.map(el => {
        if (!isNumber(el)) throw new Error('fft expects list of numbers');
        return el.value;
      });
      
      const result = computeFFT(values);
      const complexElements = result.map(([real, imag]) => createComplex(real, imag));
      return createList(complexElements);
    }
  }],
  metadata: {
    latex: 'fft(#?)',
    description: 'Fast Fourier Transform',
    category: KeyboardCategory.Signal,
    example: 'fft([1,2,3,4])',
    insertTemplate: 'fft(#0)'
  }
});

registerFunction({
  name: 'ifft',
  signatures: [{
    paramType: MathType.List,
    returnType: MathType.List,
    execute: (arg) => {
      if (!isList(arg)) throw new Error('ifft expects List');
      
      const complexValues: [number, number][] = arg.elements.map(el => {
        if (isComplex(el)) {
          return [el.real, el.imag];
        } else if (isNumber(el)) {
          return [el.value, 0];
        } else {
          throw new Error('ifft expects list of complex numbers or numbers');
        }
      });
      
      const result = computeIFFT(complexValues);
      const elements = result.map(value => createNumber(value));
      return createList(elements);
    }
  }],
  metadata: {
    latex: 'ifft(#?)',
    description: 'Inverse FFT',
    category: KeyboardCategory.Signal,
    example: 'ifft(fft([1,2,3,4]))',
    insertTemplate: 'ifft(#0)'
  }
});

registerFunction({
  name: 'magnitude',
  signatures: [{
    paramType: MathType.List,
    returnType: MathType.List,
    execute: (arg) => {
      if (!isList(arg)) throw new Error('magnitude expects List');
      
      const magnitudes = arg.elements.map(el => {
        if (isComplex(el)) {
          return createNumber(Math.sqrt(el.real * el.real + el.imag * el.imag));
        } else if (isNumber(el)) {
          return createNumber(Math.abs(el.value));
        } else {
          throw new Error('magnitude expects list of complex numbers or numbers');
        }
      });
      
      return createList(magnitudes);
    }
  }],
  metadata: {
    latex: 'magnitude(#?)',
    description: 'FFT magnitude',
    category: KeyboardCategory.Signal,
    example: 'magnitude(fft([1,2,3]))',
    insertTemplate: 'magnitude(#0)'
  }
});

registerFunction({
  name: 'phase',
  signatures: [{
    paramType: MathType.List,
    returnType: MathType.List,
    execute: (arg) => {
      if (!isList(arg)) throw new Error('phase expects List');
      
      const phases = arg.elements.map(el => {
        if (isComplex(el)) {
          return createNumber(Math.atan2(el.imag, el.real));
        } else if (isNumber(el)) {
          return createNumber(el.value >= 0 ? 0 : Math.PI);
        } else {
          throw new Error('phase expects list of complex numbers or numbers');
        }
      });
      
      return createList(phases);
    }
  }],
  metadata: {
    latex: 'phase(#?)',
    description: 'FFT phase',
    category: KeyboardCategory.Signal,
    example: 'phase(fft([1,2,3]))',
    insertTemplate: 'phase(#0)'
  }
});
