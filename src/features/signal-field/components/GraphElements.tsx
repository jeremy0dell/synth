import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  Position,
  type EdgeProps,
  type NodeProps,
} from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import { useContext } from "react";
import {
  atomDefinitions,
  domainColors,
  domainLabels,
  formatParamValue,
  getAtomDefinition,
} from "../../../dsp/atoms";
import { cn } from "../../../lib/utils";
import { baseHandleId, portHandleId } from "../portHandles";
import type { AtomNode, EdgeRuntimeStats, PatchEdge, PortConnectionUsage } from "../types";
import { firstFreeSlot } from "../lib/portUsage";
import { PortConnectContext } from "./PortConnectContext";

export const nodeTypes = {
  atom: AtomNodeView,
};

export const edgeTypes = {
  signal: SignalEdgeView,
};

function AtomNodeView({ data, id, selected }: NodeProps<AtomNode>) {
  const definition = getAtomDefinition(data.atomType);
  const inputs = definition.ports.filter((port) => port.direction === "input");
  const outputs = definition.ports.filter((port) => port.direction === "output");
  const warningCount = data.diagnostics?.filter((diagnostic) => diagnostic.severity !== "info").length ?? 0;

  return (
    <article
      className={cn(
        "min-w-[13rem] overflow-hidden rounded-[var(--gs-radius-md)] border bg-[var(--gs-card-bg)] shadow-[var(--gs-depth-panel)]",
        selected ? "border-[var(--gs-accent)]" : "border-[var(--gs-card-border)]",
      )}
    >
      <header className="border-b border-[var(--gs-border-subtle)] bg-[var(--gs-surface-muted)] px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[var(--gs-heading)]">{definition.displayName}</p>
            <p className="text-[0.68rem] font-bold uppercase leading-5 text-[var(--gs-text)]">{definition.category}</p>
          </div>
          {warningCount > 0 && <AlertTriangle className="text-[var(--gs-warning)]" size={16} aria-hidden="true" />}
        </div>
      </header>
      <div className="grid grid-cols-[1fr_1fr] gap-3 px-2 py-2">
        <PortColumn nodeId={id} portUsage={data.portUsage ?? {}} ports={inputs} side="input" />
        <PortColumn nodeId={id} portUsage={data.portUsage ?? {}} ports={outputs} side="output" />
      </div>
      {definition.params.length > 0 && (
        <dl className="grid gap-1 border-t border-[var(--gs-border-subtle)] px-3 py-2 text-xs">
          {definition.params.slice(0, 3).map((param) => (
            <div className="flex items-center justify-between gap-2" key={param.id}>
              <dt className="truncate text-[var(--gs-text-muted)]">{param.label}</dt>
              <dd className="font-bold text-[var(--gs-heading)]">
                {formatParamValue(data.params[param.id] ?? param.defaultValue, param.unit)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <span className="sr-only">Node id {id}</span>
    </article>
  );
}

function PortColumn({
  nodeId,
  portUsage,
  ports,
  side,
}: {
  nodeId: string;
  portUsage: Record<string, PortConnectionUsage>;
  ports: ReturnType<typeof getAtomDefinition>["ports"];
  side: "input" | "output";
}) {
  const { onPortClick, pendingPort } = useContext(PortConnectContext);

  return (
    <div className={cn("grid content-start gap-1", side === "output" && "justify-items-end text-right")}>
      {ports.map((port) => {
        const usage = portUsage[port.id] ?? {
          connectionCount: 0,
          maxConnections: port.maxConnections,
          occupiedSlots: [],
        };
        const occupiedSlots = new Set(usage.occupiedSlots);
        const slotCount = Math.max(1, port.maxConnections);
        const freeSlotIndex = firstFreeSlot(occupiedSlots, slotCount);
        const selected = pendingPort?.nodeId === nodeId && baseHandleId(pendingPort.handleId) === port.id;
        const nextHandleId = portHandleId(port.id, freeSlotIndex ?? Math.max(0, slotCount - 1));

        return (
          <div className={cn("relative w-full", slotCount > 1 ? "min-h-12" : "min-h-8")} key={port.id}>
            {Array.from({ length: slotCount }, (_, slotIndex) => {
              const occupied = occupiedSlots.has(slotIndex);
              return (
                <Handle
                  id={portHandleId(port.id, slotIndex)}
                  isConnectable={!occupied}
                  key={slotIndex}
                  position={side === "input" ? Position.Left : Position.Right}
                  style={{
                    background: domainColors[port.domain],
                    border: occupied ? "2px solid var(--gs-heading)" : "2px solid var(--gs-card-bg)",
                    height: 14,
                    opacity: occupied ? 1 : 0.72,
                    top: `${slotTop(slotIndex, slotCount)}%`,
                    width: 14,
                  }}
                  title={`${port.label} ${domainLabels[port.domain]} slot ${slotIndex + 1} of ${slotCount}`}
                  type={side === "input" ? "target" : "source"}
                />
              );
            })}
            <button
              aria-label={`${side === "output" ? "Start wire from" : "Finish wire at"} ${nodeId}.${port.id}`}
              className={cn(
                "nodrag nopan flex min-h-8 w-full items-center gap-1 rounded-[var(--gs-radius-sm)] border px-2 text-xs font-bold leading-tight text-[var(--gs-text)] transition-colors",
                selected
                  ? "border-[var(--gs-accent)] bg-[var(--gs-accent-muted)]"
                  : "border-transparent bg-transparent hover:border-[var(--gs-border)] hover:bg-[var(--gs-surface-muted)]",
                side === "input" ? "pl-5 text-left" : "justify-end pr-5 text-right",
              )}
              data-testid={`port-${nodeId}-${port.id}`}
              onClick={(event) => {
                event.stopPropagation();
                onPortClick({
                  direction: side,
                  handleId: nextHandleId,
                  nodeId,
                });
              }}
              title={`${side === "output" ? "Start wire from" : "Finish wire at"} ${nodeId}.${port.id} (${usage.connectionCount}/${slotCount})`}
              type="button"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: domainColors[port.domain] }}
                aria-hidden="true"
              />
              <span className="truncate">{port.label}</span>
              {slotCount > 1 && (
                <span className="rounded-[var(--gs-radius-sm)] bg-[var(--gs-surface-muted)] px-1 text-[0.62rem] font-black text-[var(--gs-heading)]">
                  {usage.connectionCount}/{slotCount}
                </span>
              )}
            </button>
            <span className="sr-only">
              {nodeId} {port.id} has {usage.connectionCount} of {slotCount} connectors used.
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SignalEdgeView({
  data,
  id,
  markerEnd,
  selected,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
}: EdgeProps<PatchEdge>) {
  const classification = data?.classification;
  const runtime = data?.runtime;
  const [path, labelX, labelY] = getBezierPath({
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  });
  const color = classification?.domain ? domainColors[classification.domain] : "var(--gs-border)";
  const isWarning =
    classification?.status &&
    !["active", "idle", "silent"].includes(classification.status);

  return (
    <>
      <BaseEdge
        id={id}
        markerEnd={markerEnd}
        path={path}
        style={{
          stroke: isWarning ? "var(--gs-warning)" : color,
          strokeDasharray: classification?.compiles === false ? "7 7" : undefined,
          strokeWidth: selected ? 4 : classification?.domain === "audio" ? 3 : 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute -translate-x-1/2 -translate-y-1/2 rounded-[var(--gs-radius-sm)] border border-[var(--gs-border-subtle)] bg-[var(--gs-page-chrome)] px-2 py-1 text-[0.68rem] font-bold text-[var(--gs-text)] shadow-[var(--gs-depth-panel)]"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {edgeRuntimeLabel(runtime, classification?.status)}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export function domainColorForNode(node: AtomNode) {
  const definition = atomDefinitions.find((candidate) => candidate.atomType === node.data.atomType);
  const output = definition?.ports.find((port) => port.direction === "output");
  return output ? domainColors[output.domain] : "var(--gs-text-muted)";
}

function edgeRuntimeLabel(stats: EdgeRuntimeStats | undefined, fallback = "idle") {
  if (!stats) {
    return fallback;
  }

  if ((stats.pulseCount ?? 0) > 0) {
    return `${stats.pulseCount} pulses`;
  }

  if (stats.rms !== undefined) {
    return `rms ${stats.rms.toFixed(3)}`;
  }

  if (stats.lastValue !== undefined) {
    return stats.lastValue.toFixed(2);
  }

  return stats.status;
}

function slotTop(slotIndex: number, slotCount: number) {
  if (slotCount <= 1) {
    return 50;
  }

  return 20 + (slotIndex / (slotCount - 1)) * 60;
}
