import { cva, type VariantProps } from "class-variance-authority";
import type { FormHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

const panelVariants = cva(
  "gs-panel border border-[var(--gs-panel-border)] bg-[var(--gs-panel-bg)] shadow-[var(--gs-depth-panel)]",
  {
    variants: {
      variant: {
        default:
          "grid gap-[var(--gs-gap-lg)] rounded-[var(--gs-radius-md)] p-[var(--gs-panel-padding)]",
        surface:
          "grid gap-[var(--gs-gap-lg)] rounded-[var(--gs-radius-md)] border-[var(--gs-surface-panel-border)] bg-[var(--gs-surface-panel-bg)] p-[var(--gs-panel-padding)]",
        editor:
          "grid gap-[var(--gs-gap-md)] rounded-[var(--gs-radius-md)] border-[var(--gs-editor-border)] bg-[var(--gs-editor-bg)] p-[var(--gs-panel-padding)]",
        card:
          "grid gap-[var(--gs-gap-md)] rounded-[var(--gs-radius-md)] border-[var(--gs-card-border)] bg-[var(--gs-card-bg)] p-[var(--gs-panel-padding)]",
        dialog:
          "grid gap-[var(--gs-gap-lg)] rounded-[var(--gs-radius-md)] border-[var(--gs-dialog-border)] bg-[var(--gs-dialog-bg)] p-[var(--gs-panel-padding-lg)] shadow-[var(--gs-depth-dialog)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type PanelVariantProps = VariantProps<typeof panelVariants>;
type PanelElement = "section" | "article" | "div";

type PanelProps = HTMLAttributes<HTMLElement> &
  PanelVariantProps & {
    as?: PanelElement;
  };

export function Panel({ as: Component = "section", className, variant, ...props }: PanelProps) {
  return <Component className={cn(panelVariants({ variant }), className)} {...props} />;
}

type FormPanelProps = FormHTMLAttributes<HTMLFormElement> & PanelVariantProps;

export function FormPanel({ className, variant = "editor", ...props }: FormPanelProps) {
  return <form className={cn(panelVariants({ variant }), className)} {...props} />;
}

export function PanelHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "gs-panel-header flex items-start justify-between gap-[var(--gs-gap-lg)]",
        "max-[720px]:flex-col max-[720px]:items-stretch",
        className,
      )}
      {...props}
    />
  );
}

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "gs-eyebrow mb-1 text-xs font-black uppercase leading-none tracking-normal text-[var(--gs-accent)]",
        className,
      )}
      {...props}
    />
  );
}

export function Readout({
  as: Component = "h2",
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { as?: "h1" | "h2" | "h3" }) {
  return (
    <Component
      className={cn("gs-readout text-2xl font-bold leading-tight text-[var(--gs-heading)]", className)}
      {...props}
    />
  );
}

const statusTextVariants = cva("gs-status-text leading-6", {
  variants: {
    variant: {
      muted: "text-sm text-[var(--gs-text-muted)]",
      error: "text-sm font-bold text-[var(--gs-danger)]",
      success: "text-sm font-bold text-[var(--gs-success)]",
      meta: "text-sm font-bold text-[var(--gs-text-muted)]",
      account: "text-sm [overflow-wrap:anywhere] text-[var(--gs-text)]",
    },
  },
  defaultVariants: {
    variant: "muted",
  },
});

type StatusTextProps = HTMLAttributes<HTMLParagraphElement> &
  VariantProps<typeof statusTextVariants> & {
    children: ReactNode;
  };

export function StatusText({ className, variant, ...props }: StatusTextProps) {
  return <p className={cn(statusTextVariants({ variant }), className)} {...props} />;
}

export function EmptyState({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "gs-empty-state rounded-[var(--gs-radius-md)] border border-dashed border-[var(--gs-empty-border)]",
        "bg-[var(--gs-empty-bg)] p-[var(--gs-panel-padding)] text-sm leading-6 text-[var(--gs-text-muted)]",
        className,
      )}
      {...props}
    />
  );
}
