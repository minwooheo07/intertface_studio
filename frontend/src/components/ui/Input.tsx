import { cn } from "../../lib/cn";
import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

interface FieldProps {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children?: ReactNode;
}

export function FieldShell({ label, required, hint, error, children }: FieldProps) {
  return (
    <div>
      {label && <label className="label">{label}{required && <span className="text-danger">*</span>}</label>}
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="err">{error}</p>}
    </div>
  );
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string; required?: boolean; hint?: string; error?: string; mono?: boolean;
  onValue?: (v: string) => void;
}
export function Input({ label, required, hint, error, mono, onValue, className, ...rest }: InputProps) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error}>
      <input
        className={cn("input", mono && "input-mono", error && "input-invalid", className)}
        onChange={(e) => onValue?.(e.target.value)}
        {...rest}
      />
    </FieldShell>
  );
}

interface AreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  label?: string; required?: boolean; hint?: string; error?: string; mono?: boolean;
  onValue?: (v: string) => void;
}
export function TextArea({ label, required, hint, error, mono, onValue, className, ...rest }: AreaProps) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error}>
      <textarea
        className={cn("input resize-y min-h-[70px] leading-relaxed", mono && "input-mono", error && "input-invalid", className)}
        onChange={(e) => onValue?.(e.target.value)}
        {...rest}
      />
    </FieldShell>
  );
}
