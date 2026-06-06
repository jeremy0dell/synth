import type { Edge, Node, XYPosition } from "@xyflow/react";
import type { ParamValue, SignalDomain, SignalRate, SignalUnit } from "../../dsp/atoms";

export type { AtomDefinition, ParamDefinition, ParamValue, PortContract, SignalDomain, SignalRate, SignalUnit } from "../../dsp/atoms";

export type ConnectionMode = "guided" | "lab" | "unsafe";

export type EdgeStatus =
  | "active"
  | "silent"
  | "idle"
  | "invalid"
  | "non-compiling"
  | "type-mismatch"
  | "unit-mismatch"
  | "needs-converter"
  | "feedback-blocked"
  | "clipping"
  | "unsafe-muted"
  | "not-in-runnable-subgraph";

export type DiagnosticSeverity = "info" | "warning" | "error" | "safety";

export type Diagnostic = {
  id: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  severity: DiagnosticSeverity;
  suggestion?: string;
};

export type EdgeClassification = {
  compiles: boolean;
  domain?: SignalDomain;
  rate?: SignalRate;
  reason?: string;
  status: EdgeStatus;
  suggestion?: string;
  unit?: SignalUnit;
  visuallyAllowed: boolean;
};

export type EdgeRuntimeStats = {
  lastValue?: number;
  peak?: number;
  pulseCount?: number;
  rms?: number;
  status: EdgeStatus;
};

export type NodeRuntimeStats = {
  lastTriggerSample?: number;
  lastValue?: number;
  peak?: number;
  pulseCount?: number;
  rms?: number;
  status: EdgeStatus;
};

export type PortConnectionUsage = {
  connectionCount: number;
  maxConnections: number;
  occupiedSlots: number[];
};

export type AtomNodeData = {
  atomType: string;
  diagnostics?: Diagnostic[];
  params: Record<string, ParamValue>;
  portUsage?: Record<string, PortConnectionUsage>;
  runtime?: NodeRuntimeStats;
};

export type AtomNode = Node<AtomNodeData, "atom">;

export type PatchEdgeData = {
  classification?: EdgeClassification;
  runtime?: EdgeRuntimeStats;
};

export type PatchEdge = Edge<PatchEdgeData, "signal">;

export type PatchMetadata = {
  connectionMode: ConnectionMode;
  masterVolume: number;
  muted: boolean;
  tempo: number;
  title: string;
  version: string;
};

export type PatchGraph = {
  edges: PatchEdge[];
  metadata: PatchMetadata;
  nodes: AtomNode[];
};

export type EngineNode = {
  atomType: string;
  id: string;
  params: Record<string, ParamValue>;
  position: XYPosition;
};

export type EngineEdge = {
  domain: SignalDomain;
  id: string;
  rate: SignalRate;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  unit: SignalUnit;
};

export type EngineGraph = {
  diagnostics: Diagnostic[];
  edges: EngineEdge[];
  metadata: PatchMetadata;
  nodes: EngineNode[];
  runnableEdgeIds: Set<string>;
  runnableNodeIds: Set<string>;
};

export type CompileResult = {
  diagnostics: Diagnostic[];
  edgeDiagnostics: Record<string, EdgeClassification>;
  engineGraph: EngineGraph;
  graphStatus: "ready" | "silent" | "invalid" | "unsafe";
  nodeDiagnostics: Record<string, Diagnostic[]>;
};

export type RenderedPatch = {
  durationSeconds: number;
  edgeStats: Record<string, EdgeRuntimeStats>;
  graphWarnings: Diagnostic[];
  nodeStats: Record<string, NodeRuntimeStats>;
  output: {
    muted: boolean;
    peak: number;
    rms: number;
    safetyMuted: boolean;
  };
  sampleRate: number;
  samples: Float32Array;
};

export type StarterPatchId =
  | "firstSound"
  | "firstPercussion"
  | "kick"
  | "snare"
  | "clap"
  | "broken";
