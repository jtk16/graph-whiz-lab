import { MathfieldElement } from "mathlive";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": Partial<MathfieldElement> & React.HTMLAttributes<MathfieldElement>;
    }
  }
}

export {};
