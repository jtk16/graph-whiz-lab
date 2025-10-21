import { useEffect, useRef } from "react";
import { MathfieldElement } from "mathlive";

interface MathInputProps {
  value: string;
  onChange: (latex: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const MathInput = ({
  value,
  onChange,
  onFocus,
  placeholder = "y = x^2",
  className = "",
  disabled = false,
}: MathInputProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mathFieldRef = useRef<MathfieldElement | null>(null);

  // Create MathfieldElement once and clean up on unmount
  useEffect(() => {
    if (!containerRef.current || mathFieldRef.current) return;

    const mf = new MathfieldElement({
      defaultMode: "math",
      smartFence: true,
      smartSuperscript: true,
      readOnly: disabled,
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
    
    const handleInput = () => onChange(mf.value);
    const handleFocus = () => onFocus?.();
    
    mf.addEventListener("input", handleInput);
    if (onFocus) mf.addEventListener("focus", handleFocus);

    containerRef.current.appendChild(mf);
    mathFieldRef.current = mf;

    // Cleanup function
    return () => {
      mf.removeEventListener("input", handleInput);
      if (onFocus) mf.removeEventListener("focus", handleFocus);
      if (containerRef.current?.contains(mf)) {
        containerRef.current.removeChild(mf);
      }
      mathFieldRef.current = null;
    };
  }, []); // Empty deps - create once

  // Update value when prop changes
  useEffect(() => {
    if (mathFieldRef.current && mathFieldRef.current.value !== value) {
      mathFieldRef.current.value = value;
    }
  }, [value]);

  // Update disabled state when prop changes
  useEffect(() => {
    if (mathFieldRef.current) {
      mathFieldRef.current.readOnly = disabled;
    }
  }, [disabled]);

  return <div className={className} ref={containerRef} />;
};
