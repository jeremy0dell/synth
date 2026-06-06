import type { Diagnostic, EdgeRuntimeStats, RenderedPatch } from "../types";
import { StatusText } from "../../../components/ui";

export function DiagnosticList({ diagnostics, empty }: { diagnostics: Diagnostic[]; empty: string }) {
  if (diagnostics.length === 0) {
    return <StatusText>{empty}</StatusText>;
  }

  return (
    <ul className="grid gap-2">
      {diagnostics.map((diagnostic) => (
        <li
          className="rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] p-3 text-sm"
          key={diagnostic.id}
        >
          <p className="font-bold text-[var(--gs-heading)]">{diagnostic.message}</p>
          {diagnostic.suggestion && <p className="mt-1 text-[var(--gs-text-muted)]">Fix: {diagnostic.suggestion}</p>}
        </li>
      ))}
    </ul>
  );
}

export function RuntimeReadout({ stats }: { stats?: EdgeRuntimeStats | RenderedPatch["nodeStats"][string] }) {
  if (!stats) {
    return <StatusText>No runtime stats yet.</StatusText>;
  }

  return (
    <div className="grid gap-2 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] p-3 text-sm md:grid-cols-4">
      <span>Status {stats.status}</span>
      <span>Peak {(stats.peak ?? 0).toFixed(3)}</span>
      <span>RMS {(stats.rms ?? 0).toFixed(3)}</span>
      <span>Pulses {stats.pulseCount ?? 0}</span>
    </div>
  );
}
