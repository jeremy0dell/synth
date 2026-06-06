import { Plus } from "lucide-react";
import {
  domainColors,
  domainLabels,
  groupAtomsByCategory,
  type AtomDefinition,
  type PortContract,
} from "../../../dsp/atoms";
import { Eyebrow, Panel, PanelHeader, Readout } from "../../../components/ui";

export function AtomPalette({ onAddAtom }: { onAddAtom: (atomType: string) => void }) {
  return (
    <Panel className="content-start overflow-hidden" variant="surface">
      <PanelHeader>
        <div>
          <Eyebrow>Atom Palette</Eyebrow>
          <Readout as="h3" className="text-lg">
            Ports first
          </Readout>
        </div>
      </PanelHeader>
      <PaletteDomainLegend />
      <div className="grid max-h-[640px] gap-[var(--gs-gap-md)] overflow-y-auto pr-1">
        {groupAtomsByCategory().map((group) => (
          <section className="grid gap-2" key={group.category}>
            <h3 className="text-xs font-black uppercase leading-none text-[var(--gs-text-muted)]">
              {group.category}
            </h3>
            <div className="grid gap-2">
              {group.atoms.map((atom) => (
                <AtomPaletteCard atom={atom} key={atom.atomType} onAddAtom={onAddAtom} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Panel>
  );
}

function PaletteDomainLegend() {
  return (
    <div className="flex flex-wrap gap-1 border-y border-[var(--gs-border-subtle)] py-2">
      {(["audio", "control", "trigger", "parameter"] as const).map((domain) => (
        <span
          className="inline-flex min-h-6 items-center gap-1 rounded-[var(--gs-radius-sm)] bg-[var(--gs-surface)] px-2 text-[0.68rem] font-black text-[var(--gs-heading)]"
          key={domain}
        >
          <span className="size-2 rounded-full" style={{ backgroundColor: domainColors[domain] }} aria-hidden="true" />
          {domainLabels[domain]}
        </span>
      ))}
    </div>
  );
}

function AtomPaletteCard({ atom, onAddAtom }: { atom: AtomDefinition; onAddAtom: (atomType: string) => void }) {
  const inputs = atom.ports.filter((port) => port.direction === "input");
  const outputs = atom.ports.filter((port) => port.direction === "output");

  return (
    <button
      className="grid gap-2 rounded-[var(--gs-radius-md)] border border-[var(--gs-card-border)] bg-[var(--gs-card-bg)] p-3 text-left text-sm text-[var(--gs-text)] transition-colors hover:border-[var(--gs-accent)] hover:bg-[var(--gs-accent-muted)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--gs-focus)]"
      data-testid={`palette-${atom.atomType}`}
      draggable
      onClick={() => onAddAtom(atom.atomType)}
      onDragStart={(event) => {
        event.dataTransfer.setData("application/signal-field-atom", atom.atomType);
        event.dataTransfer.effectAllowed = "copy";
      }}
      type="button"
    >
      <span className="flex items-center justify-between gap-2 font-bold text-[var(--gs-heading)]">
        {atom.displayName}
        <Plus size={15} aria-hidden="true" />
      </span>
      <span className="line-clamp-2 text-xs leading-5 text-[var(--gs-text-muted)]">
        {atom.description}
      </span>
      <div className="grid gap-1 border-t border-[var(--gs-border-subtle)] pt-2">
        <PalettePortRow label="In" ports={inputs} />
        <PalettePortRow label="Out" ports={outputs} />
      </div>
    </button>
  );
}

function PalettePortRow({ label, ports }: { label: "In" | "Out"; ports: PortContract[] }) {
  return (
    <span className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-2">
      <span className="pt-1 text-[0.62rem] font-black uppercase leading-none text-[var(--gs-text-muted)]">{label}</span>
      <span className="flex min-w-0 flex-wrap justify-end gap-1">
        {ports.length === 0 ? (
          <span className="text-[0.68rem] font-bold text-[var(--gs-text-muted)]">None</span>
        ) : (
          ports.map((port) => <PalettePortChip key={port.id} port={port} />)
        )}
      </span>
    </span>
  );
}

function PalettePortChip({ port }: { port: PortContract }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-[var(--gs-radius-sm)] bg-[var(--gs-surface-muted)] px-1.5 py-1 text-[0.68rem] font-black leading-none text-[var(--gs-heading)]"
      title={`${port.label}: ${domainLabels[port.domain]} ${port.direction}, ${port.maxConnections} connector${port.maxConnections === 1 ? "" : "s"}`}
    >
      <span className="size-2 rounded-full" style={{ backgroundColor: domainColors[port.domain] }} aria-hidden="true" />
      <span className="truncate">{port.label}</span>
      {port.maxConnections > 1 && <span aria-label={`${port.maxConnections} connectors`}>x{port.maxConnections}</span>}
    </span>
  );
}
