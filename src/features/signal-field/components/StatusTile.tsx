import type { ReactNode } from "react";

export function StatusTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div
      className="flex min-h-16 items-center gap-3 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-card-bg)] p-3"
      data-testid={`status-${label.toLowerCase()}`}
    >
      <span className="grid size-9 place-items-center rounded-[var(--gs-radius-sm)] bg-[var(--gs-accent-muted)] text-[var(--gs-accent)]">
        {icon}
      </span>
      <span className="grid min-w-0">
        <span className="text-xs font-black uppercase leading-none text-[var(--gs-text-muted)]">{label}</span>
        <span className="truncate text-sm font-bold capitalize text-[var(--gs-heading)]">{value}</span>
      </span>
    </div>
  );
}
