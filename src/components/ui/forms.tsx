import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export function Field({
  children,
  className,
  label,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
  label: ReactNode;
}) {
  return (
    <label
      className={cn(
        "gs-field grid gap-1.5 text-sm font-bold text-[var(--gs-text-muted)]",
        className,
      )}
      {...props}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

const controlClassName = [
  "gs-control",
  "min-h-[var(--gs-control-height-lg)] w-full rounded-[var(--gs-radius-md)]",
  "border border-[var(--gs-control-border)] bg-[var(--gs-control-bg)] px-3 py-2 shadow-[var(--gs-control-shadow)]",
  "text-[var(--gs-text)] outline-none",
  "focus:border-[var(--gs-focus)] focus:shadow-[0_0_0_3px_var(--gs-focus-shadow)]",
  "disabled:cursor-not-allowed disabled:opacity-[var(--gs-disabled-opacity)]",
].join(" ");

type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} className={cn(controlClassName, className)} type={type} {...props} />
  ),
);
TextInput.displayName = "TextInput";

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(controlClassName, className)} type="number" {...props} />
  ),
);
NumberInput.displayName = "NumberInput";

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement>;

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(controlClassName, className)} {...props} />
  ),
);
SelectInput.displayName = "SelectInput";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(controlClassName, "min-h-28 resize-y leading-6", className)}
      {...props}
    />
  ),
);
TextArea.displayName = "TextArea";

type RangeFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  icon?: ReactNode;
  label: ReactNode;
  labelClassName?: string;
};

export function RangeField({
  className,
  icon,
  label,
  labelClassName,
  ...props
}: RangeFieldProps) {
  return (
    <Field
      className={labelClassName}
      label={
        <span className="inline-flex items-center gap-2">
          {icon}
          {label}
        </span>
      }
    >
      <input
        className={cn(
          "gs-range-control min-h-8 w-full cursor-pointer accent-[var(--gs-accent)]",
          "disabled:cursor-not-allowed disabled:opacity-[var(--gs-disabled-opacity)]",
          className,
        )}
        type="range"
        {...props}
      />
    </Field>
  );
}
