import { useEffect, useRef } from "react";
import { MathfieldElement } from "mathlive";

interface MathInputProps {
  value: string;
  onChange: (latex: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
}

export const MathInput = ({
  value,
  onChange,
  onFocus,
  placeholder = "y = x^2",
  className = "",
}: MathInputProps) => {
  const mathFieldRef = useRef<MathfieldElement | null>(null);


  // Update value when prop changes
  useEffect(() => {
    if (mathFieldRef.current && mathFieldRef.current.value !== value) {
      mathFieldRef.current.value = value;
    }
  }, [value]);

  return <div className={className} ref={(el) => {
    if (el && !mathFieldRef.current) {
      const mf = new MathfieldElement({
        defaultMode: "math",
        smartFence: true,
        smartSuperscript: true,
        inlineShortcuts: {
          sqrt: "\\sqrt{#0}",
          int: "\\int",
          pi: "\\pi",
          theta: "\\theta",
          alpha: "\\alpha",
          beta: "\\beta",
          gamma: "\\gamma",
          sin: "\\sin",
          cos: "\\cos",
          tan: "\\tan",
          ln: "\\ln",
          log: "\\log",
        },
      });
      
      mf.value = value;
      mf.addEventListener("input", () => onChange(mf.value));
      if (onFocus) mf.addEventListener("focus", onFocus);
      
      el.appendChild(mf);
      mathFieldRef.current = mf;
    }
  }} />;
};
