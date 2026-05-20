import { Button as BaseButton } from "@base-ui/react/button";
import { Tooltip } from "@base-ui/react/tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";
import { forwardRef } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  [
    "gs-button",
    "inline-flex min-h-[var(--gs-control-height)] items-center justify-center gap-2",
    "rounded-[var(--gs-radius-md)] px-3 text-sm font-bold leading-none no-underline",
    "transition-colors outline-none focus-visible:outline focus-visible:outline-3",
    "focus-visible:outline-offset-2 focus-visible:outline-[var(--gs-focus)]",
    "disabled:cursor-not-allowed disabled:opacity-[var(--gs-disabled-opacity)]",
  ],
  {
    variants: {
      variant: {
        primary:
          "border border-[var(--gs-accent)] bg-[var(--gs-accent)] text-[var(--gs-accent-text)] enabled:hover:bg-[var(--gs-accent-hover)]",
        secondary:
          "border border-[var(--gs-control-border)] bg-[var(--gs-control-bg)] text-[var(--gs-text)] enabled:hover:bg-[var(--gs-surface-muted)]",
        danger:
          "border border-[var(--gs-control-border)] bg-[var(--gs-control-bg)] text-[var(--gs-danger)] enabled:hover:bg-[var(--gs-danger-muted)]",
        text:
          "min-h-8 rounded-[var(--gs-radius-sm)] border border-transparent bg-transparent px-2 text-[var(--gs-text)] enabled:hover:bg-[var(--gs-surface-muted)]",
        textDanger:
          "min-h-8 rounded-[var(--gs-radius-sm)] border border-transparent bg-transparent px-2 text-[var(--gs-danger)] enabled:hover:bg-[var(--gs-danger-muted)]",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

type ButtonProps = Omit<ComponentPropsWithoutRef<typeof BaseButton>, "className"> &
  ButtonVariantProps & {
    className?: string;
  };

export const Button = forwardRef<HTMLElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => (
    <BaseButton ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />
  ),
);
Button.displayName = "Button";

type ButtonLinkProps = Omit<LinkProps, "className"> &
  ButtonVariantProps & {
    className?: string;
  };

export function ButtonLink({ className, variant, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant }), className)} {...props} />;
}

const iconButtonVariants = cva(
  [
    "gs-icon-button",
    "inline-grid size-[var(--gs-control-height)] flex-none place-items-center",
    "rounded-[var(--gs-radius-md)] border border-[var(--gs-control-border)] bg-[var(--gs-control-bg)]",
    "text-[var(--gs-text)] no-underline transition-colors outline-none",
    "hover:bg-[var(--gs-surface-muted)] focus-visible:outline focus-visible:outline-3",
    "focus-visible:outline-offset-2 focus-visible:outline-[var(--gs-focus)]",
    "disabled:cursor-not-allowed disabled:opacity-[var(--gs-disabled-opacity)]",
  ],
  {
    variants: {
      variant: {
        default: "",
        danger: "text-[var(--gs-danger)] hover:bg-[var(--gs-danger-muted)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type IconButtonProps = Omit<ComponentPropsWithoutRef<typeof BaseButton>, "className" | "children"> &
  VariantProps<typeof iconButtonVariants> & {
    children: ReactNode;
    className?: string;
    label: string;
    tooltip?: string;
  };

export const IconButton = forwardRef<HTMLElement, IconButtonProps>(
  ({ children, className, label, tooltip = label, variant, ...props }, ref) => {
    const button = (
      <BaseButton
        ref={ref}
        aria-label={label}
        className={cn(iconButtonVariants({ variant }), className)}
        {...props}
      >
        {children}
      </BaseButton>
    );

    return <TooltipWrapper tooltip={tooltip}>{button}</TooltipWrapper>;
  },
);
IconButton.displayName = "IconButton";

type IconLinkProps = Omit<LinkProps, "className" | "children"> &
  VariantProps<typeof iconButtonVariants> & {
    children: ReactNode;
    className?: string;
    label: string;
    tooltip?: string;
  };

export function IconLink({
  children,
  className,
  label,
  tooltip = label,
  variant,
  ...props
}: IconLinkProps) {
  return (
    <TooltipWrapper tooltip={tooltip}>
      <Link aria-label={label} className={cn(iconButtonVariants({ variant }), className)} {...props}>
        {children}
      </Link>
    </TooltipWrapper>
  );
}

function TooltipWrapper({ children, tooltip }: { children: ReactElement; tooltip?: string }) {
  if (!tooltip) {
    return children;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={6}>
          <Tooltip.Popup
            className={cn(
              "gs-tooltip",
              "z-50 rounded-[var(--gs-radius-sm)] bg-[var(--gs-tooltip-bg)] px-2 py-1",
              "text-xs font-bold text-[var(--gs-tooltip-text)] shadow-[var(--gs-depth-dialog)]",
            )}
          >
            {tooltip}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
