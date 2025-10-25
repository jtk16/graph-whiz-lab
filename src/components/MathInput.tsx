import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { MathfieldElement } from "mathlive";
import "mathlive/fonts.css";

interface MathInputProps {
  value: string;
  onChange: (latex: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export interface MathInputRef {
  insert: (latex: string) => void;
  focus: () => void;
}

const SHORTCUTS: Record<string, string> = {
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
};

export const MathInput = forwardRef<MathInputRef, MathInputProps>(({
  value,
  onChange,
  onFocus,
  placeholder = "y = x^2",
  className = "",
  disabled = false,
}, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mathFieldRef = useRef<MathfieldElement | null>(null);

  // Expose insert and focus methods via ref
  useImperativeHandle(ref, () => ({
    insert: (latex: string) => {
      if (mathFieldRef.current) {
        mathFieldRef.current.executeCommand(['insert', latex]);
        mathFieldRef.current.focus();
      }
    },
    focus: () => {
      mathFieldRef.current?.focus();
    }
  }));

  // Create MathfieldElement once and clean up on unmount
  useEffect(() => {
    if (!containerRef.current || mathFieldRef.current) return;

    const mf = new MathfieldElement();
    mf.value = value;
    
    const handleInput = () => onChange(mf.value);
    const handleFocus = () => onFocus?.();
    
    mf.addEventListener("input", handleInput);
    if (onFocus) mf.addEventListener("focus", handleFocus);

    containerRef.current.appendChild(mf);
    mathFieldRef.current = mf;

    const applyInitialConfig = () => {
      if (!mathFieldRef.current) return;
      const field = mathFieldRef.current;
      field.defaultMode = "math";
      field.smartFence = true;
      field.smartSuperscript = true;
      field.inlineShortcuts = SHORTCUTS;
      field.placeholder = placeholder;
      field.readOnly = disabled;
    };

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(applyInitialConfig);
    } else {
      requestAnimationFrame(applyInitialConfig);
    }

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

  useEffect(() => {
    if (mathFieldRef.current) {
      mathFieldRef.current.placeholder = placeholder;
    }
  }, [placeholder]);

  return <div className={className} ref={containerRef} />;
});
