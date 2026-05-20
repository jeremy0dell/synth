import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { cn } from "../../lib/utils";

export type SegmentedControlOption<TValue extends string> = {
  label: string;
  value: TValue;
};

type SegmentedControlProps<TValue extends string> = {
  ariaLabel: string;
  className?: string;
  name?: string;
  onChange: (value: TValue) => void;
  options: Array<SegmentedControlOption<TValue>>;
  value: TValue;
};

export function SegmentedControl<TValue extends string>({
  ariaLabel,
  className,
  name,
  onChange,
  options,
  value,
}: SegmentedControlProps<TValue>) {
  return (
    <RadioGroup
      aria-label={ariaLabel}
      className={cn(
        "gs-segmented-control inline-flex flex-none items-center gap-1 rounded-[var(--gs-radius-md)]",
        "border border-[var(--gs-control-border)] bg-[var(--gs-control-bg)] p-1 shadow-[var(--gs-control-shadow)]",
        className,
      )}
      name={name}
      onValueChange={(nextValue) => onChange(nextValue as TValue)}
      value={value}
    >
      {options.map((option) => (
        <Radio.Root
          aria-label={option.label}
          className={({ checked }) =>
            cn(
              "gs-segmented-control__item relative inline-flex min-h-8 cursor-pointer select-none items-center justify-center rounded-[var(--gs-radius-sm)]",
              "px-2 text-xs font-bold leading-none text-[var(--gs-text-muted)] outline-none",
              "focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--gs-focus)]",
              "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-[var(--gs-disabled-opacity)]",
              checked && "bg-[var(--gs-accent-muted)] text-[var(--gs-heading)]",
            )
          }
          key={option.value}
          value={option.value}
        >
          {option.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
