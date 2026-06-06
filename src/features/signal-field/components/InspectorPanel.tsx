import { Trash2 } from "lucide-react";
import {
  domainColors,
  formatParamValue,
  getAtomDefinition,
  getPort,
  type ParamDefinition,
  type ParamValue,
} from "../../../dsp/atoms";
import {
  Button,
  ButtonRow,
  Eyebrow,
  Field,
  NumberInput,
  Panel,
  PanelHeader,
  RangeField,
  Readout,
  SelectInput,
  Stack,
  StatusText,
} from "../../../components/ui";
import { cn } from "../../../lib/utils";
import { baseHandleId } from "../portHandles";
import type { CompileResult, PatchGraph, RenderedPatch, Selection } from "../types";
import { DiagnosticList, RuntimeReadout } from "./Diagnostics";
import { WaveformView } from "./WaveformView";

export function InspectorPanel({
  compileResult,
  onRemoveEdge,
  onUpdateParam,
  patch,
  runtime,
  selection,
}: {
  compileResult: CompileResult;
  onRemoveEdge: (edgeId: string) => void;
  onUpdateParam: (nodeId: string, param: ParamDefinition, value: ParamValue) => void;
  patch: PatchGraph;
  runtime: RenderedPatch;
  selection: Selection;
}) {
  if (selection.kind === "node") {
    const node = patch.nodes.find((candidate) => candidate.id === selection.id);
    if (!node) {
      return <PatchInspector compileResult={compileResult} patch={patch} runtime={runtime} />;
    }
    const definition = getAtomDefinition(node.data.atomType);
    const diagnostics = compileResult.nodeDiagnostics[node.id] ?? [];

    return (
      <Panel variant="editor">
        <PanelHeader>
          <div>
            <Eyebrow>Node Inspector</Eyebrow>
            <Readout as="h3">{definition.displayName}</Readout>
          </div>
          <StatusText variant="meta">{node.id}</StatusText>
        </PanelHeader>
        <StatusText>{definition.description}</StatusText>
        <Stack>
          <h3 className="text-sm font-black uppercase leading-none text-[var(--gs-text-muted)]">Ports</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {definition.ports.map((port) => (
              <div className="rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] p-3 text-sm" key={port.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[var(--gs-heading)]">{port.label}</span>
                  <span className="text-xs font-black uppercase" style={{ color: domainColors[port.domain] }}>
                    {port.domain}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--gs-text-muted)]">{port.description}</p>
              </div>
            ))}
          </div>
        </Stack>
        {definition.params.length > 0 && (
          <Stack>
            <h3 className="text-sm font-black uppercase leading-none text-[var(--gs-text-muted)]">Params</h3>
            <div className="grid gap-[var(--gs-gap-md)] md:grid-cols-2">
              {definition.params.map((param) => (
                <ParamControl
                  key={param.id}
                  onChange={(value) => onUpdateParam(node.id, param, value)}
                  param={param}
                  value={node.data.params[param.id] ?? param.defaultValue}
                />
              ))}
            </div>
          </Stack>
        )}
        <RuntimeReadout stats={runtime.nodeStats[node.id]} />
        <DiagnosticList diagnostics={diagnostics} empty="No node diagnostics." />
      </Panel>
    );
  }

  if (selection.kind === "edge") {
    const edge = patch.edges.find((candidate) => candidate.id === selection.id);

    if (!edge) {
      return <PatchInspector compileResult={compileResult} patch={patch} runtime={runtime} />;
    }

    const sourceNode = patch.nodes.find((node) => node.id === edge.source);
    const targetNode = patch.nodes.find((node) => node.id === edge.target);
    const sourcePort = sourceNode ? getPort(getAtomDefinition(sourceNode.data.atomType), baseHandleId(edge.sourceHandle)) : undefined;
    const targetPort = targetNode ? getPort(getAtomDefinition(targetNode.data.atomType), baseHandleId(edge.targetHandle)) : undefined;
    const classification = compileResult.edgeDiagnostics[edge.id];
    const stats = runtime.edgeStats[edge.id];

    return (
      <Panel variant="editor">
        <PanelHeader>
          <div>
            <Eyebrow>Wire Inspector</Eyebrow>
            <Readout as="h3">{classification?.status ?? "Unclassified"}</Readout>
          </div>
          <StatusText variant="meta">{edge.id}</StatusText>
        </PanelHeader>
        <div className="grid gap-2 text-sm text-[var(--gs-text)]">
          <span>
            <strong>{sourceNode ? getAtomDefinition(sourceNode.data.atomType).displayName : edge.source}</strong>.
            {sourcePort?.label ?? baseHandleId(edge.sourceHandle)}
          </span>
          <span>
            <strong>{targetNode ? getAtomDefinition(targetNode.data.atomType).displayName : edge.target}</strong>.
            {targetPort?.label ?? baseHandleId(edge.targetHandle)}
          </span>
          <span>Domain: {classification?.domain ?? sourcePort?.domain ?? "unknown"}</span>
          <span>Rate: {classification?.rate ?? sourcePort?.rate ?? "unknown"}</span>
          <span>Unit: {classification?.unit ?? targetPort?.unit ?? sourcePort?.unit ?? "unknown"}</span>
        </div>
        <RuntimeReadout stats={stats} />
        {classification?.reason && (
          <StatusText variant={classification.compiles ? "muted" : "error"}>
            {classification.reason} {classification.suggestion ? `Fix: ${classification.suggestion}` : ""}
          </StatusText>
        )}
        <ButtonRow>
          <Button onClick={() => onRemoveEdge(edge.id)} type="button" variant="danger">
            <Trash2 size={18} aria-hidden="true" />
            Remove selected wire
          </Button>
          <StatusText variant="meta">Delete or Backspace also removes the selected wire.</StatusText>
        </ButtonRow>
      </Panel>
    );
  }

  return <PatchInspector compileResult={compileResult} patch={patch} runtime={runtime} />;
}

function PatchInspector({
  compileResult,
  patch,
  runtime,
}: {
  compileResult: CompileResult;
  patch: PatchGraph;
  runtime: RenderedPatch;
}) {
  return (
    <Panel variant="editor">
      <PanelHeader>
        <div>
          <Eyebrow>Patch Inspector</Eyebrow>
          <Readout as="h3">{patch.metadata.title}</Readout>
        </div>
        <StatusText variant="meta">{compileResult.graphStatus}</StatusText>
      </PanelHeader>
      <div className="grid gap-2 text-sm text-[var(--gs-text)] md:grid-cols-2">
        <span>Tempo {patch.metadata.tempo} BPM</span>
        <span>Connection mode {patch.metadata.connectionMode}</span>
        <span>Nodes {patch.nodes.length}</span>
        <span>Wires {patch.edges.length}</span>
        <span>Compiled nodes {compileResult.engineGraph.nodes.length}</span>
        <span>Compiled wires {compileResult.engineGraph.edges.length}</span>
        <span>Peak {runtime.output.peak.toFixed(3)}</span>
        <span>RMS {runtime.output.rms.toFixed(3)}</span>
      </div>
      <WaveformView samples={runtime.samples} />
      <DiagnosticList diagnostics={[...compileResult.diagnostics, ...runtime.graphWarnings]} empty="No patch diagnostics." />
    </Panel>
  );
}

function ParamControl({
  onChange,
  param,
  value,
}: {
  onChange: (value: ParamValue) => void;
  param: ParamDefinition;
  value: ParamValue;
}) {
  if (param.type === "boolean") {
    return (
      <label className="flex min-h-[var(--gs-control-height)] items-center gap-2 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] px-3 text-sm font-bold text-[var(--gs-text)]">
        <input checked={value === true} className="size-4 accent-[var(--gs-accent)]" onChange={(event) => onChange(event.currentTarget.checked)} type="checkbox" />
        {param.label}
      </label>
    );
  }

  if (param.type === "select") {
    return (
      <Field label={param.label}>
        <SelectInput onChange={(event) => onChange(event.currentTarget.value)} value={String(value)}>
          {param.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
      </Field>
    );
  }

  if (param.type === "steps") {
    const steps = Array.isArray(value) ? value : [];
    return (
      <Field className="md:col-span-2" label={param.label}>
        <div className="grid grid-cols-8 gap-1">
          {steps.map((step, index) => (
            <button
              className={cn(
                "min-h-8 rounded-[var(--gs-radius-sm)] border text-xs font-bold",
                step
                  ? "border-[var(--gs-accent)] bg-[var(--gs-accent-muted)] text-[var(--gs-heading)]"
                  : "border-[var(--gs-border-subtle)] bg-[var(--gs-control-bg)] text-[var(--gs-text-muted)]",
              )}
              key={index}
              onClick={() => onChange(steps.map((candidate, stepIndex) => (stepIndex === index ? !candidate : candidate)) as boolean[])}
              type="button"
            >
              {index + 1}
            </button>
          ))}
        </div>
      </Field>
    );
  }

  const numberValue = typeof value === "number" ? value : Number(param.defaultValue);
  return (
    <RangeField
      label={`${param.label} ${formatParamValue(numberValue, param.unit)}`}
      max={param.max}
      min={param.min}
      onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      step={param.step}
      value={numberValue}
    />
  );
}
