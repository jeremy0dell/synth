import { cloneParams, getAtomDefinition, getPort, type PortContract } from "../../dsp/atoms";
import type {
  AtomNode,
  CompileResult,
  ConnectionMode,
  Diagnostic,
  EdgeClassification,
  EngineEdge,
  EngineNode,
  PatchEdge,
  PatchGraph,
  SignalDomain,
} from "./types";
import { baseHandleId, portKey } from "./portHandles";

type IndexedPort = {
  node: AtomNode;
  port: PortContract;
};

type PortConnectionCounts = {
  source: Map<string, number>;
  target: Map<string, number>;
};

const converterSuggestions: Partial<Record<`${SignalDomain}->${SignalDomain}`, { reason: string; suggestion: string }>> = {
  "audio->control": {
    reason: "Audio-rate signal cannot directly become a control value.",
    suggestion: "Add an Envelope Follower, RMS Detector, Peak Detector, or Sample & Hold atom.",
  },
  "audio->parameter": {
    reason: "Audio-rate signal cannot directly modulate a parameter in V1.",
    suggestion: "Use Envelope Follower, RMS Detector, or Map Range depending on the intent.",
  },
  "audio->trigger": {
    reason: "Audio cannot directly trigger an event input.",
    suggestion: "Add a Threshold Detector or Comparator atom.",
  },
  "control->audio": {
    reason: "Control-rate signal cannot directly enter an audio input.",
    suggestion: "Use it as a gain/parameter source, or add a signal generator.",
  },
  "parameter->audio": {
    reason: "Static parameter values are not audio signals.",
    suggestion: "Connect the parameter to an oscillator, VCA, filter, or converter atom.",
  },
  "parameter->trigger": {
    reason: "Static parameter values are not trigger events.",
    suggestion: "Use a Clock, Manual Trigger, Comparator, or event generator.",
  },
  "trigger->audio": {
    reason: "Trigger is an event, not a sound-rate signal.",
    suggestion: "Use it to start an envelope or impulse, then connect that atom to audio.",
  },
  "trigger->control": {
    reason: "Trigger is an event and needs an explicit event-to-control atom.",
    suggestion: "Add an Envelope, Toggle, Trigger Counter, or Gate/Latch atom.",
  },
  "trigger->parameter": {
    reason: "Trigger is an event and needs an explicit event-to-value atom.",
    suggestion: "Add Sample & Hold, Toggle, Counter, or another event-to-value atom.",
  },
};

export function compilePatchGraph(patch: PatchGraph): CompileResult {
  const normalizedNodes = normalizeNodes(patch.nodes);
  const nodeIndex = new Map(normalizedNodes.map((node) => [node.id, node]));
  const portIndex = buildPortIndex(normalizedNodes);
  const nodeDiagnostics: Record<string, Diagnostic[]> = {};
  const edgeDiagnostics: Record<string, EdgeClassification> = {};
  const diagnostics: Diagnostic[] = [];
  const portConnectionCounts = countPortConnections(patch.edges);

  for (const edge of patch.edges) {
    const classification = classifyEdge(edge, portIndex, portConnectionCounts, patch.metadata.connectionMode);
    edgeDiagnostics[edge.id] = classification;

    if (!classification.compiles) {
      diagnostics.push({
        edgeId: edge.id,
        id: `edge:${edge.id}:${classification.status}`,
        message: classification.reason ?? "This wire does not compile.",
        severity: classification.status === "invalid" ? "error" : "warning",
        suggestion: classification.suggestion,
      });
    }
  }

  const compilingEdges = patch.edges.filter((edge) => edgeDiagnostics[edge.id]?.compiles);
  const feedbackEdgeIds = detectCycles(compilingEdges);

  for (const edgeId of feedbackEdgeIds) {
    const previous = edgeDiagnostics[edgeId];
    edgeDiagnostics[edgeId] = {
      ...previous,
      compiles: false,
      reason: "V1 blocks zero-delay feedback cycles.",
      status: "feedback-blocked",
      suggestion: "Insert an explicit Delay/Safety atom before using feedback.",
      visuallyAllowed: true,
    };
    diagnostics.push({
      edgeId,
      id: `edge:${edgeId}:feedback`,
      message: "Feedback cycle blocked by V1 safety rules.",
      severity: "safety",
      suggestion: "Insert an explicit Delay/Safety atom before using feedback.",
    });
  }

  const compilingAfterFeedback = patch.edges.filter((edge) => edgeDiagnostics[edge.id]?.compiles);
  const { runnableEdgeIds, runnableNodeIds } = findRunnableSubgraph(normalizedNodes, compilingAfterFeedback);

  for (const edge of compilingAfterFeedback) {
    if (!runnableEdgeIds.has(edge.id)) {
      edgeDiagnostics[edge.id] = {
        ...edgeDiagnostics[edge.id],
        compiles: false,
        reason: "This wire is valid but does not feed an Output node.",
        status: "not-in-runnable-subgraph",
        suggestion: "Connect this subgraph into an Output or an inspector.",
        visuallyAllowed: true,
      };
    }
  }

  for (const node of normalizedNodes) {
    const definition = getAtomDefinition(node.data.atomType);

    for (const port of definition.ports.filter((candidate) => candidate.direction === "input")) {
      const hasInput = patch.edges.some(
        (edge) =>
          edge.target === node.id &&
          baseHandleId(edge.targetHandle) === port.id &&
          edgeDiagnostics[edge.id]?.compiles,
      );

      if (hasInput || !shouldReportMissingInput(port)) {
        continue;
      }

      const diagnostic: Diagnostic = {
        id: `node:${node.id}:missing:${port.id}`,
        message: `${definition.displayName}.${port.label} is unconnected.`,
        nodeId: node.id,
        severity: port.required ? "warning" : "info",
        suggestion: missingInputSuggestion(definition.displayName, port),
      };
      nodeDiagnostics[node.id] = [...(nodeDiagnostics[node.id] ?? []), diagnostic];
      diagnostics.push(diagnostic);
    }
  }

  const outputNodes = normalizedNodes.filter((node) => node.data.atomType === "output");
  if (outputNodes.length === 0) {
    diagnostics.push({
      id: "graph:no-output",
      message: "No Output node exists.",
      severity: "error",
      suggestion: "Add an Output atom and connect audio to Output.audioIn.",
    });
  }

  const outputHasInput = outputNodes.some((node) =>
    patch.edges.some(
      (edge) =>
        edge.target === node.id &&
        baseHandleId(edge.targetHandle) === "audioIn" &&
        edgeDiagnostics[edge.id]?.compiles,
    ),
  );

  if (outputNodes.length > 0 && !outputHasInput) {
    diagnostics.push({
      id: "graph:output-disconnected",
      message: "No compiling audio reaches Output.audioIn.",
      severity: "warning",
      suggestion: "Connect an audio source through shaping atoms into Output.audioIn.",
    });
  }

  for (const node of normalizedNodes) {
    if (node.data.atomType !== "gain") {
      continue;
    }

    const gainConnected = patch.edges.some(
      (edge) =>
        edge.target === node.id &&
        baseHandleId(edge.targetHandle) === "gainIn" &&
        edgeDiagnostics[edge.id]?.compiles,
    );
    const baseGain = asNumber(node.data.params.baseGain, 0);
    const audioFeedsOutput = runnableNodeIds.has(node.id);

    if (audioFeedsOutput && !gainConnected && baseGain <= 0) {
      const diagnostic: Diagnostic = {
        id: `node:${node.id}:zero-gain`,
        message: "Audio reaches a VCA, but Gain.gainIn is unconnected and base gain is 0.",
        nodeId: node.id,
        severity: "warning",
        suggestion: "Connect an envelope or constant into Gain.gainIn, or raise Base Gain.",
      };
      nodeDiagnostics[node.id] = [...(nodeDiagnostics[node.id] ?? []), diagnostic];
      diagnostics.push(diagnostic);
    }
  }

  for (const node of normalizedNodes) {
    if (!["decayEnvelope", "attackDecayEnvelope", "multiPulseEnvelope"].includes(node.data.atomType)) {
      continue;
    }

    const outputUsed = patch.edges.some(
      (edge) =>
        edge.source === node.id &&
        baseHandleId(edge.sourceHandle) === "controlOut" &&
        edgeDiagnostics[edge.id]?.compiles &&
        runnableEdgeIds.has(edge.id),
    );

    if (!outputUsed) {
      const definition = getAtomDefinition(node.data.atomType);
      const diagnostic: Diagnostic = {
        id: `node:${node.id}:unused-envelope`,
        message: `${definition.displayName} is present but does not control an audible path.`,
        nodeId: node.id,
        severity: "info",
        suggestion: "Connect its controlOut to Gain.gainIn, Map Range.input, or another control target.",
      };
      nodeDiagnostics[node.id] = [...(nodeDiagnostics[node.id] ?? []), diagnostic];
      diagnostics.push(diagnostic);
    }
  }

  const engineEdges = patch.edges
    .filter((edge) => edgeDiagnostics[edge.id]?.compiles && runnableEdgeIds.has(edge.id))
    .map((edge): EngineEdge => {
      const source = portIndex.get(portKey(edge.source, edge.sourceHandle));
      const target = portIndex.get(portKey(edge.target, edge.targetHandle));

      if (!source || !target) {
        throw new Error(`Compiler invariant failed for edge ${edge.id}`);
      }

      return {
        domain: source.port.domain,
        id: edge.id,
        rate: source.port.rate,
        source: edge.source,
        sourceHandle: source.port.id,
        target: edge.target,
        targetHandle: target.port.id,
        unit: target.port.unit === "scalar" ? source.port.unit : target.port.unit,
      };
    });

  const engineNodes: EngineNode[] = normalizedNodes
    .filter((node) => runnableNodeIds.has(node.id))
    .map((node) => ({
      atomType: node.data.atomType,
      id: node.id,
      params: node.data.params,
      position: node.position,
    }));

  const graphStatus = diagnostics.some((diagnostic) => diagnostic.severity === "safety")
    ? "unsafe"
    : diagnostics.some((diagnostic) => diagnostic.severity === "error")
      ? "invalid"
      : engineEdges.length === 0
        ? "silent"
        : "ready";

  return {
    diagnostics,
    edgeDiagnostics,
    engineGraph: {
      diagnostics,
      edges: engineEdges,
      metadata: patch.metadata,
      nodes: engineNodes,
      runnableEdgeIds,
      runnableNodeIds,
    },
    graphStatus,
    nodeDiagnostics,
  };
}

export function classifyConnectionForMode(
  patch: PatchGraph,
  source: string | null,
  sourceHandle: string | null,
  target: string | null,
  targetHandle: string | null,
  mode: ConnectionMode,
) {
  const nodeIndex = new Map(patch.nodes.map((node) => [node.id, node]));
  const portIndex = buildPortIndex(patch.nodes);
  const candidate: PatchEdge = {
    id: "candidate",
    source: source ?? "",
    sourceHandle: sourceHandle ?? "",
    target: target ?? "",
    targetHandle: targetHandle ?? "",
    type: "signal",
  };
  const portConnectionCounts = countPortConnections([...patch.edges, candidate]);

  if (!source || !target || !nodeIndex.has(source) || !nodeIndex.has(target)) {
    return invalid("Missing source or target node.", "Choose a valid output handle and input handle.");
  }

  return classifyEdge(candidate, portIndex, portConnectionCounts, mode);
}

function normalizeNodes(nodes: AtomNode[]) {
  return nodes.map((node) => {
    const definition = getAtomDefinition(node.data.atomType);

    return {
      ...node,
      data: {
        ...node.data,
        params: {
          ...cloneParams(definition.defaultParams),
          ...node.data.params,
        },
      },
    };
  });
}

function buildPortIndex(nodes: AtomNode[]) {
  const index = new Map<string, IndexedPort>();

  for (const node of nodes) {
    const definition = getAtomDefinition(node.data.atomType);

    for (const port of definition.ports) {
      index.set(portKey(node.id, port.id), {
        node,
        port,
      });
    }
  }

  return index;
}

function classifyEdge(
  edge: PatchEdge,
  portIndex: Map<string, IndexedPort>,
  portConnectionCounts: PortConnectionCounts,
  mode: ConnectionMode,
): EdgeClassification {
  const source = portIndex.get(portKey(edge.source, edge.sourceHandle));
  const target = portIndex.get(portKey(edge.target, edge.targetHandle));

  if (!edge.sourceHandle || !edge.targetHandle || !source || !target) {
    return invalid("Missing or unknown handle.", "Reconnect using exact visible ports.");
  }

  if (source.port.direction !== "output" || target.port.direction !== "input") {
    return invalid("Connections must run from output ports to input ports.", "Drag from an output handle to an input handle.");
  }

  if ((portConnectionCounts.source.get(portKey(edge.source, edge.sourceHandle)) ?? 0) > source.port.maxConnections) {
    return invalid(
      `${source.node.id}.${source.port.label} has ${source.port.maxConnections} output slots.`,
      "Use a Trigger Splitter, Mixer, Add, or another explicit fan-out atom before connecting more wires.",
    );
  }

  if ((portConnectionCounts.target.get(portKey(edge.target, edge.targetHandle)) ?? 0) > target.port.maxConnections) {
    return invalid(
      `${target.node.id}.${target.port.label} accepts ${target.port.maxConnections === 1 ? "one input" : `${target.port.maxConnections} inputs`}.`,
      "Use a Mixer, Add, Trigger Merge, or another explicit combining atom.",
    );
  }

  const compatible = isCompilingConnection(source.port, target.port);

  if (compatible.compiles) {
    return {
      compiles: true,
      domain: source.port.domain,
      rate: source.port.rate,
      status: "active",
      unit: compatible.unit,
      visuallyAllowed: true,
    };
  }

  const mismatchKey = `${source.port.domain}->${target.port.domain}` as keyof typeof converterSuggestions;
  const mismatch = converterSuggestions[mismatchKey];
  const status = compatible.status ?? (mismatch ? "needs-converter" : "type-mismatch");
  const fallback = mismatch ?? {
    reason: compatible.reason ?? `${source.port.domain} cannot connect to ${target.port.domain}.`,
    suggestion: compatible.suggestion ?? "Add an explicit converter atom.",
  };
  const visuallyAllowed = mode !== "guided";

  return {
    compiles: false,
    domain: source.port.domain,
    rate: source.port.rate,
    reason: fallback.reason,
    status,
    suggestion: fallback.suggestion,
    unit: source.port.unit,
    visuallyAllowed,
  };
}

function isCompilingConnection(source: PortContract, target: PortContract) {
  const acceptedDomains = target.accepts ?? [target.domain];

  if (!acceptedDomains.includes(source.domain)) {
    return {
      compiles: false,
    };
  }

  if (source.domain === "parameter" && target.domain === "parameter" && !unitsCompatible(source, target)) {
    return {
      compiles: false,
      reason: `${source.unit} parameter cannot connect directly to ${target.unit} parameter.`,
      status: "unit-mismatch" as const,
      suggestion: "Add Map Range or Unit Converter.",
    };
  }

  return {
    compiles: true,
    unit: target.unit === "scalar" || target.unit === "none" ? source.unit : target.unit,
  };
}

function unitsCompatible(source: PortContract, target: PortContract) {
  return source.unit === target.unit || source.unit === "scalar" || target.unit === "scalar" || target.unit === "none";
}

function findRunnableSubgraph(nodes: AtomNode[], compilingEdges: PatchEdge[]) {
  const incoming = new Map<string, PatchEdge[]>();
  const runnableEdgeIds = new Set<string>();
  const runnableNodeIds = new Set<string>();
  const stack = nodes.filter((node) => node.data.atomType === "output").map((node) => node.id);

  for (const edge of compilingEdges) {
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
  }

  while (stack.length > 0) {
    const nodeId = stack.pop();

    if (!nodeId || runnableNodeIds.has(nodeId)) {
      continue;
    }

    runnableNodeIds.add(nodeId);

    for (const edge of incoming.get(nodeId) ?? []) {
      runnableEdgeIds.add(edge.id);
      stack.push(edge.source);
    }
  }

  return { runnableEdgeIds, runnableNodeIds };
}

function detectCycles(edges: PatchEdge[]) {
  const adjacency = new Map<string, Array<{ edgeId: string; target: string }>>();
  const blocked = new Set<string>();
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: Array<{ edgeId: string; source: string; target: string }> = [];

  for (const edge of edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), { edgeId: edge.id, target: edge.target }]);
  }

  function visit(nodeId: string) {
    if (visiting.has(nodeId)) {
      for (const item of path) {
        blocked.add(item.edgeId);
      }
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visiting.add(nodeId);

    for (const next of adjacency.get(nodeId) ?? []) {
      path.push({ edgeId: next.edgeId, source: nodeId, target: next.target });
      visit(next.target);
      path.pop();
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  for (const edge of edges) {
    visit(edge.source);
  }

  return blocked;
}

function countPortConnections(edges: PatchEdge[]): PortConnectionCounts {
  const source = new Map<string, number>();
  const target = new Map<string, number>();

  for (const edge of edges) {
    if (edge.sourceHandle) {
      const key = portKey(edge.source, edge.sourceHandle);
      source.set(key, (source.get(key) ?? 0) + 1);
    }

    if (edge.targetHandle) {
      const key = portKey(edge.target, edge.targetHandle);
      target.set(key, (target.get(key) ?? 0) + 1);
    }
  }

  return { source, target };
}

function shouldReportMissingInput(port: PortContract) {
  return port.required || port.missingBehavior === "diagnostic" || port.missingBehavior === "silence";
}

function missingInputSuggestion(atomName: string, port: PortContract) {
  if (port.domain === "trigger") {
    return `Connect Manual Trigger, Clock, or Sequencer output to ${atomName}.${port.label}.`;
  }

  if (port.domain === "audio") {
    return `Connect an audio source or shaping atom to ${atomName}.${port.label}.`;
  }

  if (port.defaultValue !== undefined || port.missingBehavior === "default") {
    return `Set the ${port.label} parameter or connect a compatible modulation source.`;
  }

  return `Connect a compatible ${port.domain} source.`;
}

function invalid(reason: string, suggestion: string): EdgeClassification {
  return {
    compiles: false,
    reason,
    status: "invalid",
    suggestion,
    visuallyAllowed: false,
  };
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
