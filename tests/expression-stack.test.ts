import { describe, expect, it } from "vitest";
import { expressionEngine } from "@/lib/expression";
import { computeFFT, computeIFFT } from "@/lib/computation/signal";
import { RuntimeValue } from "@/lib/runtime/value";
import {
  addComplex,
  complex,
  expComplex,
  mulComplex,
  powComplexInt,
  scaleComplex,
  ComplexTuple,
} from "@/lib/math/complex";

const TOLERANCE = 1e-9;

const expectNumber = (value: RuntimeValue, expected: number, tolerance = TOLERANCE) => {
  expect(value.kind).toBe("number");
  expect(value.value).toBeCloseTo(expected, Math.max(2, Math.round(-Math.log10(tolerance))));
};

const expectBoolean = (value: RuntimeValue, expected: boolean) => {
  expect(value.kind).toBe("boolean");
  expect(value.value).toBe(expected);
};

const runtimeToComplex = (value: RuntimeValue): ComplexTuple => {
  if (value.kind === "number") {
    return [value.value, 0];
  }
  if (value.kind === "complex") {
    return [value.real, value.imag];
  }
  throw new Error(`Expected complex-compatible value, received ${value.kind}`);
};

const expectComplexValue = (value: RuntimeValue, expected: ComplexTuple, tolerance = 1e-6) => {
  const [re, im] = runtimeToComplex(value);
  expect(re).toBeCloseTo(expected[0], 6);
  expect(im).toBeCloseTo(expected[1], 6);
};

const runtimeToNumberList = (value: RuntimeValue): number[] => {
  expect(value.kind).toBe("list");
  return value.elements.map(element => {
    if (element.kind !== "number") {
      throw new Error(`Expected number list element, received ${element.kind}`);
    }
    return element.value;
  });
};

const runtimeToComplexList = (value: RuntimeValue): ComplexTuple[] => {
  expect(value.kind).toBe("list");
  return value.elements.map(runtimeToComplex);
};

const expectNumberList = (value: RuntimeValue, expected: number[], tolerance = 1e-6) => {
  const numbers = runtimeToNumberList(value);
  expect(numbers.length).toBe(expected.length);
  numbers.forEach((num, index) => {
    expect(num).toBeCloseTo(expected[index], 6);
  });
};

const expectComplexList = (value: RuntimeValue, expected: ComplexTuple[], tolerance = 1e-6) => {
  const list = runtimeToComplexList(value);
  expect(list.length).toBe(expected.length);
  list.forEach((pair, index) => {
    expect(pair[0]).toBeCloseTo(expected[index][0], 6);
    expect(pair[1]).toBeCloseTo(expected[index][1], 6);
  });
};

const complexSin = (input: ComplexTuple): ComplexTuple => {
  const [a, b] = input;
  return [Math.sin(a) * Math.cosh(b), Math.cos(a) * Math.sinh(b)];
};

const complexCos = (input: ComplexTuple): ComplexTuple => {
  const [a, b] = input;
  return [Math.cos(a) * Math.cosh(b), -Math.sin(a) * Math.sinh(b)];
};

const complexTan = (input: ComplexTuple): ComplexTuple => {
  const sinVal = complexSin(input);
  const cosVal = complexCos(input);
  const denom = cosVal[0] * cosVal[0] + cosVal[1] * cosVal[1];
  if (denom === 0) {
    throw new Error("Undefined tangent for this complex input");
  }
  return [
    (sinVal[0] * cosVal[0] + sinVal[1] * cosVal[1]) / denom,
    (sinVal[1] * cosVal[0] - sinVal[0] * cosVal[1]) / denom,
  ];
};

const computeZTransform = (sequence: ComplexTuple[], z: ComplexTuple): ComplexTuple => {
  return sequence.reduce<ComplexTuple>((sum, sample, index) => {
    const weight = powComplexInt(z, -index);
    return addComplex(sum, mulComplex(sample, weight));
  }, [0, 0]);
};

const computeLaplace = (samples: ComplexTuple[], s: ComplexTuple, step: number): ComplexTuple => {
  if (step <= 0) {
    throw new Error("Laplace step must be positive");
  }
  return samples.reduce<ComplexTuple>((sum, sample, index) => {
    const time = index * step;
    const kernel = expComplex(scaleComplex(s, -time));
    const contribution = mulComplex(sample, scaleComplex(kernel, step));
    return addComplex(sum, contribution);
  }, [0, 0]);
};

type ExpressionCase = {
  expression: string;
  assert: (result: RuntimeValue) => void;
};

const cases: ExpressionCase[] = [
  { expression: "1+2", assert: val => expectNumber(val, 3) },
  { expression: "7-5", assert: val => expectNumber(val, 2) },
  { expression: "4*2.5", assert: val => expectNumber(val, 10) },
  { expression: "9/4", assert: val => expectNumber(val, 2.25) },
  { expression: "2^5", assert: val => expectNumber(val, 32) },
  { expression: "sqrt(81)", assert: val => expectNumber(val, 9) },
  { expression: "abs(-12.5)", assert: val => expectNumber(val, 12.5) },
  { expression: "round(3.6)", assert: val => expectNumber(val, 4) },
  { expression: "floor(4.9)", assert: val => expectNumber(val, 4) },
  { expression: "ceil(4.1)", assert: val => expectNumber(val, 5) },
  { expression: "ln(e)", assert: val => expectNumber(val, 1) },
  { expression: "log(1000)", assert: val => expectNumber(val, 3) },
  { expression: "exp(1)", assert: val => expectNumber(val, Math.exp(1)) },
  { expression: "(3+5)*(2-1)", assert: val => expectNumber(val, 8) },
  { expression: "(2^3)^2", assert: val => expectNumber(val, 64) },
  { expression: "((1/3)+(2/3))", assert: val => expectNumber(val, 1) },
  { expression: "sqrt(2)^2", assert: val => expectNumber(val, 2, 1e-8) },
  { expression: "abs(-3+4)", assert: val => expectNumber(val, 1) },
  { expression: "ln(e^2)", assert: val => expectNumber(val, 2, 1e-8) },
  { expression: "log(1)", assert: val => expectNumber(val, 0) },
  { expression: "sin(pi/6)", assert: val => expectNumber(val, 0.5, 1e-10) },
  { expression: "cos(pi)", assert: val => expectNumber(val, -1, 1e-10) },
  { expression: "tan(pi/4)", assert: val => expectNumber(val, 1, 1e-6) },
  { expression: "asin(0.5)", assert: val => expectNumber(val, Math.asin(0.5)) },
  { expression: "acos(0.5)", assert: val => expectNumber(val, Math.acos(0.5)) },
  { expression: "atan(1)", assert: val => expectNumber(val, Math.atan(1)) },
  { expression: "sin(0)^2 + cos(0)^2", assert: val => expectNumber(val, 1, 1e-9) },
  { expression: "tan(0)", assert: val => expectNumber(val, 0) },
  { expression: "sin(2) + cos(2)", assert: val => expectNumber(val, Math.sin(2) + Math.cos(2)) },
  { expression: "sin(2)^2 + cos(2)^2", assert: val => expectNumber(val, 1, 1e-9) },
  { expression: "sqrt(-16)", assert: val => expectComplexValue(val, [0, 4]) },
  { expression: "exp(i*pi)", assert: val => expectComplexValue(val, [-1, 0], 1e-6) },
  { expression: "arg(1+i)", assert: val => expectNumber(val, Math.atan2(1, 1)) },
  { expression: "real(3+4i)", assert: val => expectNumber(val, 3) },
  { expression: "imag(3+4i)", assert: val => expectNumber(val, 4) },
  { expression: "conj(3-5i)", assert: val => expectComplexValue(val, [3, 5]) },
  { expression: "abs(3+4i)", assert: val => expectNumber(val, 5) },
  {
    expression: "sin(2+1i)",
    assert: val => {
      const expected = complexSin([2, 1] as ComplexTuple);
      expectComplexValue(val, expected, 1e-6);
    },
  },
  {
    expression: "cos(1+2i)",
    assert: val => {
      const expected = complexCos([1, 2] as ComplexTuple);
      expectComplexValue(val, expected, 1e-6);
    },
  },
  {
    expression: "tan(1+0.5i)",
    assert: val => {
      const expected = complexTan([1, 0.5] as ComplexTuple);
      expectComplexValue(val, expected, 1e-6);
    },
  },
  {
    expression: "real(exp(i*pi/3))",
    assert: val => expectNumber(val, Math.cos(Math.PI / 3)),
  },
  {
    expression: "imag(exp(i*pi/3))",
    assert: val => expectNumber(val, Math.sin(Math.PI / 3)),
  },
  {
    expression: "arg(exp(i*pi/2))",
    assert: val => expectNumber(val, Math.PI / 2, 1e-6),
  },
  {
    expression: "abs(exp(i*pi) + 1)",
    assert: val => expectNumber(val, 0, 1e-6),
  },
  {
    expression: "sum([1,2,3,4])",
    assert: val => expectNumber(val, 10),
  },
  {
    expression: "mean([1,2,3,4])",
    assert: val => expectNumber(val, 2.5),
  },
  {
    expression: "min([3,1,4,2])",
    assert: val => expectNumber(val, 1),
  },
  {
    expression: "max([3,1,4,2])",
    assert: val => expectNumber(val, 4),
  },
  {
    expression: "variance([1,2,3,4])",
    assert: val => expectNumber(val, 1.25, 1e-6),
  },
  {
    expression: "stdev([1,2,3,4])",
    assert: val => expectNumber(val, Math.sqrt(1.25), 1e-6),
  },
  {
    expression: "length([1,2,3,4,5])",
    assert: val => expectNumber(val, 5),
  },
  {
    expression: "sum([sin(pi/6), cos(pi/3), 0, 0])",
    assert: val => expectNumber(val, Math.sin(Math.PI / 6) + Math.cos(Math.PI / 3), 1e-10),
  },
  {
    expression: "mean([2,4,6,8,10])",
    assert: val => expectNumber(val, 6),
  },
  {
    expression: "sum([])",
    assert: val => expectNumber(val, 0),
  },
  {
    expression: "length(fft([1,0,0,0]))",
    assert: val => expectNumber(val, computeFFT([1, 0, 0, 0]).length),
  },
  {
    expression: "mean(fft([1,1,1,1]))",
    assert: val => {
      const magnitudes = computeFFT([1, 1, 1, 1]).map(pair => Math.hypot(pair[0], pair[1]));
      const mean = magnitudes.reduce((acc, x) => acc + x, 0) / magnitudes.length;
      expectNumber(val, mean, 1e-6);
    },
  },
  {
    expression: "sum([mean([1,3,5,7]), mean([2,4,6,8]), 0, 0])",
    assert: val => expectNumber(val, ((1 + 3 + 5 + 7) / 4 + (2 + 4 + 6 + 8) / 4), 1e-10),
  },
  {
    expression: "length([sum([1,2,3,4]), max([3,4,5,6]), mean([0,0,0,0]), variance([1,1,1,1])])",
    assert: val => expectNumber(val, 4),
  },
  {
    expression: "mean([sum([1,1,1,1]), sum([2,2,2,2]), sum([3,3,3,3]), sum([4,4,4,4])])",
    assert: val => expectNumber(val, (4 + 8 + 12 + 16) / 4, 1e-10),
  },
  {
    expression: "variance([2,2,2,2])",
    assert: val => expectNumber(val, 0),
  },
  {
    expression: "stdev([2,2,2,2])",
    assert: val => expectNumber(val, 0),
  },
  { expression: "3 > 2", assert: val => expectBoolean(val, true) },
  { expression: "3 < 2", assert: val => expectBoolean(val, false) },
  { expression: "5 >= 5", assert: val => expectBoolean(val, true) },
  { expression: "4 <= 3", assert: val => expectBoolean(val, false) },
  { expression: "2 == 2", assert: val => expectBoolean(val, true) },
  { expression: "2 != 3", assert: val => expectBoolean(val, true) },
  { expression: "(3 > 2) and (2 < 5)", assert: val => expectBoolean(val, true) },
  { expression: "not (3 < 1)", assert: val => expectBoolean(val, true) },
  { expression: "if(3 > 1, 10, 20)", assert: val => expectNumber(val, 10) },
  { expression: "if(0 > 1, 10, 20)", assert: val => expectNumber(val, 20) },
  { expression: "(3 > 2) or (2 > 5)", assert: val => expectBoolean(val, true) },
  { expression: "not (3 == 3)", assert: val => expectBoolean(val, false) },
  { expression: "if((3 == 3) and (2 == 2), 1, 0)", assert: val => expectNumber(val, 1) },
  { expression: "sqrt((3-0)^2+(4-0)^2)", assert: val => expectNumber(val, 5) },
  { expression: "1*3 + 2*4", assert: val => expectNumber(val, 11) },
  { expression: "1*1 - 0*0", assert: val => expectNumber(val, 1) },
  { expression: "2*(-1) + 1*3", assert: val => expectNumber(val, 1) },
  { expression: "sqrt((4-1)^2 + (6-2)^2)", assert: val => expectNumber(val, 5) },
  {
    expression: "fft([1,0,1,0])",
    assert: val => {
      const expected = computeFFT([1, 0, 1, 0]).map(pair => Math.hypot(pair[0], pair[1]));
      expectNumberList(val, expected);
    },
  },
  {
    expression: "fft_complex([1,0,1,0])",
    assert: val => {
      const expected = computeFFT([1, 0, 1, 0]);
      expectComplexList(val, expected);
    },
  },
  {
    expression: "ifft(fft_complex([1,0,1,0]))",
    assert: val => {
      const fftData = computeFFT([1, 0, 1, 0]);
      const expected = computeIFFT(fftData).slice(0, 4);
      expectComplexList(val, expected);
    },
  },
  {
    expression: "magnitude(fft_complex([0,1,0,1]))",
    assert: val => {
      const expected = computeFFT([0, 1, 0, 1]).map(pair => Math.hypot(pair[0], pair[1]));
      expectNumberList(val, expected);
    },
  },
  {
    expression: "phase(fft_complex([0,1,0,1]))",
    assert: val => {
      const expected = computeFFT([0, 1, 0, 1]).map(pair => Math.atan2(pair[1], pair[0]));
      expectNumberList(val, expected);
    },
  },
  {
    expression: "z_transform([1,2,3,0], 0.5)",
    assert: val => {
      const sequence = [complex(1, 0), complex(2, 0), complex(3, 0), complex(0, 0)];
      const expected = computeZTransform(sequence, complex(0.5, 0));
      expectComplexValue(val, expected, 1e-6);
    },
  },
  {
    expression: "z_transform([1,2,3,0], 1+i)",
    assert: val => {
      const sequence = [complex(1, 0), complex(2, 0), complex(3, 0), complex(0, 0)];
      const expected = computeZTransform(sequence, complex(1, 1));
      expectComplexValue(val, expected, 1e-6);
    },
  },
  {
    expression: "laplace_transform([1,1,1,0], 1)",
    assert: val => {
      const samples = [complex(1, 0), complex(1, 0), complex(1, 0), complex(0, 0)];
      const expected = computeLaplace(samples, complex(1, 0), 1);
      expectComplexValue(val, expected, 1e-6);
    },
  },
  {
    expression: "laplace_transform([1,1,1,0], 1, 0.5)",
    assert: val => {
      const samples = [complex(1, 0), complex(1, 0), complex(1, 0), complex(0, 0)];
      const expected = computeLaplace(samples, complex(1, 0), 0.5);
      expectComplexValue(val, expected, 1e-6);
    },
  },
  {
    expression: "convolve([1,2,3],[0,1])",
    assert: val => expectNumberList(val, [0, 1, 2, 3]),
  },
  {
    expression: "length(fft_complex([1,1,1,1]))",
    assert: val => expectNumber(val, computeFFT([1, 1, 1, 1]).length),
  },
  {
    expression: "sum([1,2,0,0]) + mean([3,5,7,9])",
    assert: val => expectNumber(val, 3 + 6),
  },
  {
    expression: "length([abs(-1), abs(-2), abs(-3), abs(0)])",
    assert: val => expectNumber(val, 4),
  },
  {
    expression: "magnitude([1+i, 2-2i, 0])",
    assert: val => expectNumberList(val, [Math.hypot(1, 1), Math.hypot(2, -2), 0]),
  },
  {
    expression: "phase([1+i, 1-i])",
    assert: val => expectNumberList(val, [Math.atan2(1, 1), Math.atan2(-1, 1)]),
  },
  { expression: "real(conj(2+3i))", assert: val => expectNumber(val, 2) },
  { expression: "imag(conj(2+3i))", assert: val => expectNumber(val, -3) },
  {
    expression: "sin(pi/12)*cos(pi/3)",
    assert: val => expectNumber(val, Math.sin(Math.PI / 12) * Math.cos(Math.PI / 3)),
  },
  { expression: "exp(ln(5))", assert: val => expectNumber(val, 5, 1e-6) },
  { expression: "tan(pi/8)", assert: val => expectNumber(val, Math.tan(Math.PI / 8), 1e-6) },
  {
    expression: "cos(2)^2 - sin(2)^2",
    assert: val => expectNumber(val, Math.cos(4), 1e-6),
  },
  { expression: "ln(exp(3))", assert: val => expectNumber(val, 3, 1e-6) },
  { expression: "log(100)", assert: val => expectNumber(val, 2) },
  {
    expression: "mean(magnitude(fft_complex([1,0,0,1])))",
    assert: val => {
      const magnitudes = computeFFT([1, 0, 0, 1]).map(pair => Math.hypot(pair[0], pair[1]));
      const expected = magnitudes.reduce((acc, x) => acc + x, 0) / magnitudes.length;
      expectNumber(val, expected, 1e-6);
    },
  },
  {
    expression: "sum(phase(fft_complex([1,0,0,1])))",
    assert: val => {
      const phases = computeFFT([1, 0, 0, 1]).map(pair => Math.atan2(pair[1], pair[0]));
      const expected = phases.reduce((acc, x) => acc + x, 0);
      expectNumber(val, expected, 1e-6);
    },
  },
  {
    expression: "length(magnitude([1+i,2,3-i]))",
    assert: val => expectNumber(val, 3),
  },
];

describe("Expression stack integration suite", () => {
  const context = expressionEngine.buildContext([]);

  it("covers at least 100 expressions", () => {
    expect(cases.length).toBeGreaterThanOrEqual(100);
  });

  cases.forEach((testCase, index) => {
  it(`#${index + 1}: ${testCase.expression}`, () => {
    const inspection = expressionEngine.inspect(testCase.expression, context);
    expect(inspection.tokens.length).toBeGreaterThan(0);
    const ast = expressionEngine.parseNormalized(inspection.normalized, context);
    expect(expressionEngine.hasFreeVariables(ast, context)).toBe(false);
    const result = expressionEngine.evaluate(ast, {}, context);
    testCase.assert(result);
  });
  });
});
