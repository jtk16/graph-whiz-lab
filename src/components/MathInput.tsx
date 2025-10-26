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

    let cancelled = false;
    let pendingFrame: number | null = null;

    const configureField = () => {
      if (!mathFieldRef.current || cancelled) return;
      const field = mathFieldRef.current;
      field.defaultMode = "math";
      field.smartFence = true;
      field.smartSuperscript = true;
      field.inlineShortcuts = SHORTCUTS;
      field.placeholder = placeholder;
      field.readOnly = disabled;
    };

    const configureWithRetry = (attempt = 0) => {
      if (cancelled) return;
      try {
        configureField();
      } catch (error) {
        if (attempt < 5) {
          pendingFrame = requestAnimationFrame(() => {
            pendingFrame = null;
            configureWithRetry(attempt + 1);
          });
        } else {
          console.error("MathInput: failed to configure mathfield", error);
        }
      }
    };

    const readyListener: EventListener = () => configureWithRetry();
    mf.addEventListener("mathfield-ready", readyListener);

    if (typeof queueMicrotask === "function") {
      queueMicrotask(() => configureWithRetry());
    } else {
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = null;
        configureWithRetry();
      });
    }

    return () => {
      cancelled = true;
      if (pendingFrame !== null) {
        cancelAnimationFrame(pendingFrame);
      }
      mf.removeEventListener("mathfield-ready", readyListener);
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
