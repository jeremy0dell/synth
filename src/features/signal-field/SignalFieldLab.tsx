import "@xyflow/react/dist/style.css";

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type EdgeProps,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import {
  AlertTriangle,
  BookOpen,
  Bug,
  CircleStop,
  Download,
  FileJson,
  HelpCircle,
  Inspect,
  Play,
  Plus,
  RadioTower,
  Shield,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  atomDefinitions,
  cloneParams,
  domainColors,
  domainLabels,
  formatParamValue,
  getAtomDefinition,
  getPort,
  groupAtomsByCategory,
  type ParamDefinition,
  type ParamValue,
} from "../../dsp/atoms";
import {
  Button,
  ButtonRow,
  Eyebrow,
  Field,
  IconButton,
  NumberInput,
  PageStack,
  Panel,
  PanelHeader,
  RangeField,
  Readout,
  SegmentedControl,
  SelectInput,
  Stack,
  StatusText,
  TextArea,
} from "../../components/ui";
import { cn } from "../../lib/utils";
import { classifyConnectionForMode, compilePatchGraph } from "./compiler";
import { renderEngineGraph } from "./runtime";
import { createStarterPatch, starterPatchOptions } from "./starterPatches";
import type {
  AtomNode,
  CompileResult,
  ConnectionMode,
  Diagnostic,
  EdgeRuntimeStats,
  PatchEdge,
  PatchGraph,
  RenderedPatch,
  StarterPatchId,
} from "./types";

type Selection =
  | { id: string; kind: "edge" }
  | { id: string; kind: "node" }
  | { kind: "patch" };

type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type PortRef = {
  direction: "input" | "output";
  handleId: string;
  nodeId: string;
};

type PortConnectContextValue = {
  onPortClick: (port: PortRef) => void;
  pendingPort: PortRef | null;
};

const PortConnectContext = createContext<PortConnectContextValue>({
  onPortClick: () => undefined,
  pendingPort: null,
});

const connectionModeOptions: Array<{ label: string; value: ConnectionMode }> = [
  { label: "Lab", value: "lab" },
  { label: "Guided", value: "guided" },
  { label: "Unsafe", value: "unsafe" },
];

const starterOptions = starterPatchOptions.map((option) => ({
  label: option.label,
  value: option.value,
}));

const nodeTypes = {
  atom: AtomNodeView,
};

const edgeTypes = {
  signal: SignalEdgeView,
};

export function SignalFieldLab() {
  return (
    <ReactFlowProvider>
      <SignalFieldInner />
    </ReactFlowProvider>
  );
}

function SignalFieldInner() {
  const reactFlow = useReactFlow<AtomNode, PatchEdge>();
  const [starter, setStarter] = useState<StarterPatchId>("kick");
  const [patch, setPatch] = useState<PatchGraph>(() => createStarterPatch("kick"));
  const [selection, setSelection] = useState<Selection>({ kind: "patch" });
  const [pendingPort, setPendingPort] = useState<PortRef | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const [manualTriggerToken, setManualTriggerToken] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioState, setAudioState] = useState("suspended");
  const [jsonDraft, setJsonDraft] = useState("");
  const [runtime, setRuntime] = useState<RenderedPatch>(() =>
    renderEngineGraph(compilePatchGraph(createStarterPatch("kick")).engineGraph, {
      manualTrigger: true,
      seed: 404,
    }),
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const compileResult = useMemo(() => compilePatchGraph(patch), [patch]);

  const decoratedNodes = useMemo(
    () =>
      patch.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          diagnostics: compileResult.nodeDiagnostics[node.id] ?? [],
          runtime: runtime.nodeStats[node.id],
        },
      })),
    [compileResult.nodeDiagnostics, patch.nodes, runtime.nodeStats],
  );

  const decoratedEdges = useMemo(
    () =>
      patch.edges.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          classification: compileResult.edgeDiagnostics[edge.id],
          runtime: runtime.edgeStats[edge.id] ?? {
            status: compileResult.edgeDiagnostics[edge.id]?.status ?? "idle",
          },
        },
      })),
    [compileResult.edgeDiagnostics, patch.edges, runtime.edgeStats],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      setRuntime(
        renderEngineGraph(compileResult.engineGraph, {
          manualTrigger: manualTriggerToken > 0,
          seed: manualTriggerToken + 808,
        }),
      );
    }, 90);

    return () => window.clearTimeout(id);
  }, [compileResult.engineGraph, manualTriggerToken]);

  function replacePatch(nextStarter: StarterPatchId) {
    const next = createStarterPatch(nextStarter, patch.metadata.connectionMode);
    setStarter(nextStarter);
    setPatch(next);
    setSelection({ kind: "patch" });
    setPendingPort(null);
    setJsonDraft("");
    window.requestAnimationFrame(() => {
      reactFlow.fitView({ duration: 220, padding: 0.18 });
    });
  }

  const onNodesChange = useCallback((changes: NodeChange<AtomNode>[]) => {
    setPatch((current) => ({
      ...current,
      nodes: applyNodeChanges(changes, current.nodes),
    }));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<PatchEdge>[]) => {
    setPatch((current) => ({
      ...current,
      edges: applyEdgeChanges(changes, current.edges),
    }));
  }, []);

  const removeEdge = useCallback((edgeId: string) => {
    setPatch((current) => ({
      ...current,
      edges: current.edges.filter((edge) => edge.id !== edgeId),
    }));
    setSelection({ kind: "patch" });
    setJsonDraft(`Removed wire ${edgeId}.`);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (selection.kind !== "edge" || !["Backspace", "Delete"].includes(event.key)) {
        return;
      }

      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }

      event.preventDefault();
      removeEdge(selection.id);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [removeEdge, selection]);

  const isValidConnection = useCallback(
    (connection: Connection | PatchEdge) => {
      const classification = classifyConnectionForMode(
        patch,
        connection.source,
        connection.sourceHandle ?? null,
        connection.target,
        connection.targetHandle ?? null,
        patch.metadata.connectionMode,
      );

      return classification.visuallyAllowed || patch.metadata.connectionMode !== "guided";
    },
    [patch],
  );

  const commitConnection = useCallback(
    (source: string, sourceHandle: string, target: string, targetHandle: string) => {
      const classification = classifyConnectionForMode(
        patch,
        source,
        sourceHandle,
        target,
        targetHandle,
        patch.metadata.connectionMode,
      );

      if (!classification.visuallyAllowed && patch.metadata.connectionMode === "guided") {
        setJsonDraft(
          `Connection rejected in Guided mode.\n\nProblem: ${classification.reason ?? "This wire is invalid."}\nFix: ${
            classification.suggestion ?? "Use compatible ports."
          }`,
        );
        return;
      }

      const nextEdge: PatchEdge = {
        data: {
          classification,
        },
        id: `${source}:${sourceHandle}->${target}:${targetHandle}:${Date.now()}`,
        source,
        sourceHandle,
        target,
        targetHandle,
        type: "signal",
      };

      setPatch((current) => ({
        ...current,
        edges: addEdge(nextEdge, current.edges),
      }));
      setSelection({ id: nextEdge.id, kind: "edge" });
      setJsonDraft(
        classification.compiles
          ? `Connected ${source}.${sourceHandle} -> ${target}.${targetHandle}.`
          : `Added non-compiling lab wire ${source}.${sourceHandle} -> ${target}.${targetHandle}.\n\nProblem: ${
              classification.reason ?? "This wire does not compile."
            }\nFix: ${classification.suggestion ?? "Add the explicit converter atom."}`,
      );
    },
    [patch],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      commitConnection(
        connection.source ?? "",
        connection.sourceHandle ?? "",
        connection.target ?? "",
        connection.targetHandle ?? "",
      );
    },
    [commitConnection],
  );

  const handlePortClick = useCallback(
    (port: PortRef) => {
      if (!pendingPort) {
        if (port.direction === "output") {
          setPendingPort(port);
          setJsonDraft(`Wire started at ${port.nodeId}.${port.handleId}.\nClick an input port to finish it.`);
          return;
        }

        setJsonDraft(`Click an output port first, then click ${port.nodeId}.${port.handleId} to finish the wire.`);
        return;
      }

      if (pendingPort.nodeId === port.nodeId && pendingPort.handleId === port.handleId) {
        setPendingPort(null);
        setJsonDraft("Wire start cancelled.");
        return;
      }

      if (pendingPort.direction === port.direction) {
        if (port.direction === "output") {
          setPendingPort(port);
          setJsonDraft(`Wire start moved to ${port.nodeId}.${port.handleId}. Click an input port to finish it.`);
        } else {
          setJsonDraft("That is another input. Click an output port first, then an input port.");
        }
        return;
      }

      const source = pendingPort.direction === "output" ? pendingPort : port;
      const target = pendingPort.direction === "input" ? pendingPort : port;
      commitConnection(source.nodeId, source.handleId, target.nodeId, target.handleId);
      setPendingPort(null);
    },
    [commitConnection, pendingPort],
  );

  const portConnectContext = useMemo(
    () => ({
      onPortClick: handlePortClick,
      pendingPort,
    }),
    [handlePortClick, pendingPort],
  );

  function addAtom(atomType: string, position = { x: 160 + patch.nodes.length * 24, y: 120 + patch.nodes.length * 18 }) {
    const definition = getAtomDefinition(atomType);
    const node: AtomNode = {
      data: {
        atomType,
        params: cloneParams(definition.defaultParams),
      },
      id: createNodeId(atomType),
      position,
      type: "atom",
    };

    setPatch((current) => ({
      ...current,
      nodes: [...current.nodes, node],
    }));
    setSelection({ id: node.id, kind: "node" });
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const atomType = event.dataTransfer.getData("application/signal-field-atom");

    if (!atomType) {
      return;
    }

    addAtom(atomType, reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }

  function updateMetadata(update: Partial<PatchGraph["metadata"]>) {
    setPatch((current) => ({
      ...current,
      metadata: {
        ...current.metadata,
        ...update,
      },
    }));
  }

  function updateNodeParam(nodeId: string, param: ParamDefinition, value: ParamValue) {
    setPatch((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                params: {
                  ...node.data.params,
                  [param.id]: value,
                },
              },
            }
          : node,
      ),
    }));
  }

  function exportPatch() {
    setJsonDraft(JSON.stringify(serializePatch(patch), null, 2));
  }

  function loadJsonDraft() {
    try {
      setPatch(deserializePatch(JSON.parse(jsonDraft)));
      setSelection({ kind: "patch" });
    } catch (error) {
      setJsonDraft(`${jsonDraft}\n\nInvalid PatchGraph JSON: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async function loadJsonFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    try {
      setPatch(deserializePatch(JSON.parse(await file.text())));
      setSelection({ kind: "patch" });
    } catch (error) {
      setJsonDraft(`Invalid PatchGraph JSON: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      event.currentTarget.value = "";
    }
  }

  function explainPatch() {
    setJsonDraft(buildPatchExplanation(patch, compileResult));
  }

  function whyNoSound() {
    setJsonDraft(buildNoSoundReport(compileResult, runtime));
  }

  function triggerPatch() {
    setManualTriggerToken((value) => value + 1);
    void playPatch(true);
  }

  async function playPatch(triggerAtStart = false) {
    const AudioContextConstructor =
      window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;

    if (!AudioContextConstructor) {
      setAudioState("Web Audio unavailable");
      return;
    }

    const context = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = context;

    if (context.state === "suspended") {
      await context.resume();
    }

    stopActiveSource(sourceRef.current);

    const liveRender = renderEngineGraph(compileResult.engineGraph, {
      manualTrigger: triggerAtStart,
      sampleRate: context.sampleRate,
      seed: Date.now() & 0xffff,
    });
    setRuntime(liveRender);

    const buffer = context.createBuffer(1, liveRender.samples.length, context.sampleRate);
    buffer.getChannelData(0).set(liveRender.samples);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => {
      if (sourceRef.current === source) {
        sourceRef.current = null;
        setIsPlaying(false);
        setAudioState(context.state);
      }
    };
    sourceRef.current = source;
    source.start();
    setIsPlaying(true);
    setAudioState(context.state);
  }

  async function panic() {
    stopActiveSource(sourceRef.current);
    sourceRef.current = null;
    setIsPlaying(false);
    updateMetadata({ muted: true });

    if (audioContextRef.current) {
      await audioContextRef.current.suspend();
      setAudioState(audioContextRef.current.state);
    }
  }

  return (
    <PageStack className="w-full max-w-none">
      <Panel variant="surface">
        <PanelHeader>
          <div>
            <Eyebrow>Signal Field V1</Eyebrow>
            <Readout>Atom patch field</Readout>
          </div>
          <ButtonRow className="justify-end">
            <Button onClick={triggerPatch} type="button" variant="primary">
              <Play size={18} aria-hidden="true" />
              Play
            </Button>
            <Button onClick={triggerPatch} type="button">
              <Zap size={18} aria-hidden="true" />
              Trigger
            </Button>
            <Button onClick={() => updateMetadata({ muted: !patch.metadata.muted })} type="button">
              {patch.metadata.muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
              {patch.metadata.muted ? "Muted" : "Safe"}
            </Button>
            <Button onClick={() => void panic()} type="button" variant="danger">
              <CircleStop size={18} aria-hidden="true" />
              Panic
            </Button>
          </ButtonRow>
        </PanelHeader>

        <div className="grid gap-[var(--gs-gap-md)] xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 flex-wrap items-center gap-[var(--gs-gap-sm)]">
            <SegmentedControl ariaLabel="Starter patch" className="max-w-full flex-wrap" onChange={replacePatch} options={starterOptions} value={starter} />
          </div>
          <div className="flex flex-wrap items-center gap-[var(--gs-gap-sm)] xl:justify-end">
            <SegmentedControl
              ariaLabel="Connection mode"
              name="connection-mode"
              onChange={(connectionMode) => updateMetadata({ connectionMode })}
              options={connectionModeOptions}
              value={patch.metadata.connectionMode}
            />
            <Field className="min-w-28" label="Tempo">
              <NumberInput
                max={260}
                min={20}
                onChange={(event) => updateMetadata({ tempo: event.currentTarget.valueAsNumber })}
                step={1}
                value={patch.metadata.tempo}
              />
            </Field>
            <RangeField
              label={`Master ${Math.round(patch.metadata.masterVolume * 100)}%`}
              labelClassName="min-w-44"
              max={1}
              min={0}
              onChange={(event) => updateMetadata({ masterVolume: event.currentTarget.valueAsNumber })}
              step={0.01}
              value={patch.metadata.masterVolume}
            />
          </div>
        </div>

        <div className="grid gap-[var(--gs-gap-md)] text-sm text-[var(--gs-text-muted)] md:grid-cols-4">
          <StatusTile icon={<RadioTower size={18} aria-hidden="true" />} label="Compiler" value={compileResult.graphStatus} />
          <StatusTile icon={<Shield size={18} aria-hidden="true" />} label="Audio" value={isPlaying ? "playing" : audioState} />
          <StatusTile icon={<Volume2 size={18} aria-hidden="true" />} label="Peak" value={runtime.output.peak.toFixed(3)} />
          <StatusTile icon={<Inspect size={18} aria-hidden="true" />} label="Graph" value={`${patch.nodes.length} nodes / ${patch.edges.length} wires`} />
        </div>
      </Panel>

      {isGuideOpen ? (
        <GuidePanel onClose={() => setIsGuideOpen(false)} pendingPort={pendingPort} />
      ) : (
        <Panel aria-label="Guide controls" variant="editor">
          <div className="flex flex-wrap items-center justify-between gap-[var(--gs-gap-md)]">
            <StatusText variant="meta">Guide hidden</StatusText>
            <Button onClick={() => setIsGuideOpen(true)} type="button">
              <BookOpen size={18} aria-hidden="true" />
              Show guide
            </Button>
          </div>
        </Panel>
      )}

      <div className="grid min-h-[720px] gap-[var(--gs-gap-lg)] xl:grid-cols-[17rem_minmax(0,1fr)]">
        <AtomPalette onAddAtom={addAtom} />

        <Panel className="min-h-[720px] overflow-hidden p-0" variant="editor">
          <PortConnectContext.Provider value={portConnectContext}>
            <ReactFlow
              colorMode="system"
              connectionRadius={34}
              defaultViewport={{ x: 24, y: 48, zoom: 0.78 }}
              edgeTypes={edgeTypes}
              edges={decoratedEdges}
              fitView
              fitViewOptions={{ padding: 0.16 }}
              isValidConnection={isValidConnection}
              minZoom={0.25}
              nodeTypes={nodeTypes}
              nodes={decoratedNodes}
              onConnect={onConnect}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={onDrop}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_, node) => setSelection({ id: node.id, kind: "node" })}
              onNodesChange={onNodesChange}
              onPaneClick={() => {
                setSelection({ kind: "patch" });
                setPendingPort(null);
              }}
              onEdgeClick={(_, edge) => setSelection({ id: edge.id, kind: "edge" })}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="var(--gs-border-subtle)" gap={24} size={1} variant={BackgroundVariant.Dots} />
              <Controls />
              <MiniMap nodeColor={(node) => domainColorForNode(node as AtomNode)} pannable zoomable />
            </ReactFlow>
          </PortConnectContext.Provider>
        </Panel>
      </div>

      <div className="grid gap-[var(--gs-gap-lg)] xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <InspectorPanel
          compileResult={compileResult}
          onRemoveEdge={removeEdge}
          onUpdateParam={updateNodeParam}
          patch={patch}
          runtime={runtime}
          selection={selection}
        />
        <ConsolePanel
          compileResult={compileResult}
          jsonDraft={jsonDraft}
          onDraftChange={setJsonDraft}
          onExplain={explainPatch}
          onExport={exportPatch}
          onImport={loadJsonDraft}
          onNoSound={whyNoSound}
          onPickFile={() => fileInputRef.current?.click()}
          runtime={runtime}
        />
      </div>

      <input
        ref={fileInputRef}
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void loadJsonFile(event)}
        type="file"
      />
    </PageStack>
  );
}

function GuidePanel({ onClose, pendingPort }: { onClose: () => void; pendingPort: PortRef | null }) {
  return (
    <Panel aria-labelledby="signal-field-guide-title" variant="editor">
      <PanelHeader>
        <div>
          <Eyebrow>Guide</Eyebrow>
          <Readout as="h3" id="signal-field-guide-title">
            How to use Signal Field
          </Readout>
        </div>
        <ButtonRow className="justify-end">
          <StatusText variant={pendingPort ? "success" : "meta"}>
            {pendingPort ? `Wiring from ${pendingPort.nodeId}.${pendingPort.handleId}` : "Ready to wire"}
          </StatusText>
          <IconButton label="Hide guide" onClick={onClose} type="button">
            <X size={18} aria-hidden="true" />
          </IconButton>
        </ButtonRow>
      </PanelHeader>

      <div className="grid gap-[var(--gs-gap-md)] text-sm leading-6 text-[var(--gs-text)] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="grid content-start gap-3 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] p-4">
          <h3 className="text-sm font-black uppercase leading-none text-[var(--gs-heading)]">Patch in six moves</h3>
          <ol className="grid gap-2 text-[var(--gs-text-muted)]">
            <li>
              <strong className="text-[var(--gs-heading)]">Add atoms:</strong> click an atom in the palette, or drag it onto the field.
            </li>
            <li>
              <strong className="text-[var(--gs-heading)]">Wire exact ports:</strong> click an output port pill, then click an input port pill. You can also drag from the round handle.
            </li>
            <li>
              <strong className="text-[var(--gs-heading)]">Read the wire:</strong> solid wires compile; dashed warning wires are kept in Lab mode but do not run.
            </li>
            <li>
              <strong className="text-[var(--gs-heading)]">Edit atoms:</strong> select a node and use the inspector controls below the field.
            </li>
            <li>
              <strong className="text-[var(--gs-heading)]">Remove wires:</strong> select a wire, then click Remove selected wire in the inspector, or press Delete/Backspace.
            </li>
            <li>
              <strong className="text-[var(--gs-heading)]">Listen:</strong> Play renders the patch and fires Manual Trigger once. Trigger does the same quick triggered preview.
            </li>
          </ol>
        </section>

        <section className="grid content-start gap-3 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] p-4">
          <h3 className="text-sm font-black uppercase leading-none text-[var(--gs-heading)]">First percussion recipe</h3>
          <div className="grid gap-2 text-[var(--gs-text-muted)]">
            <p>Build the simplest triggered tone from nothing:</p>
            <ol className="grid gap-1">
              <li>Manual Trigger.triggerOut {"->"} Decay Envelope.triggerIn</li>
              <li>Decay Envelope.controlOut {"->"} Gain.gainIn</li>
              <li>Sine Oscillator.audioOut {"->"} Gain.audioIn</li>
              <li>Gain.audioOut {"->"} Output.audioIn</li>
            </ol>
            <p>
              If it is silent, select Gain and check Base Gain. A VCA with no envelope and Base Gain 0 will mute the oscillator.
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-[var(--gs-gap-md)] text-sm leading-6 text-[var(--gs-text)] lg:grid-cols-3">
        <section className="grid content-start gap-3 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] p-4">
          <h3 className="text-sm font-black uppercase leading-none text-[var(--gs-heading)]">Signal domains</h3>
          <dl className="grid gap-2 text-[var(--gs-text-muted)]">
            <div>
              <dt className="font-bold" style={{ color: domainColors.audio }}>Audio</dt>
              <dd>Sound-rate signal. Use it for oscillators, noise, filters, mixers, VCA audio inputs, and Output.audioIn.</dd>
            </div>
            <div>
              <dt className="font-bold" style={{ color: domainColors.control }}>Control</dt>
              <dd>Continuous modulation. Envelopes usually output control and drive gain, pitch maps, or other modulation inputs.</dd>
            </div>
            <div>
              <dt className="font-bold" style={{ color: domainColors.trigger }}>Trigger</dt>
              <dd>Events, not sound. Use triggers to start envelopes, impulses, sequencers, and clocks.</dd>
            </div>
            <div>
              <dt className="font-bold" style={{ color: domainColors.parameter }}>Parameter</dt>
              <dd>Static or slow values such as Hz, seconds, scalar gain, cutoff, Q, and drive.</dd>
            </div>
          </dl>
        </section>

        <section className="grid content-start gap-3 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] p-4">
          <h3 className="text-sm font-black uppercase leading-none text-[var(--gs-heading)]">Connection modes</h3>
          <dl className="grid gap-2 text-[var(--gs-text-muted)]">
            <div>
              <dt className="font-bold text-[var(--gs-heading)]">Lab</dt>
              <dd>Default. Keeps weird wires visible and marks whether they compile.</dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--gs-heading)]">Guided</dt>
              <dd>Blocks invalid wires before they land. Use this when learning the port types.</dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--gs-heading)]">Unsafe</dt>
              <dd>Allows more experiments, but runtime safety still mutes unsafe output and blocks zero-delay feedback.</dd>
            </div>
          </dl>
        </section>

        <section className="grid content-start gap-3 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] p-4">
          <h3 className="text-sm font-black uppercase leading-none text-[var(--gs-heading)]">Diagnostics</h3>
          <div className="grid gap-2 text-[var(--gs-text-muted)]">
            <p>Select a wire to inspect its domain, rate, status, meter, reason, and suggested fix.</p>
            <p>Select empty canvas for patch-level status: compiler state, node/wire count, runtime peak, and graph diagnostics.</p>
            <p>Use Explain This Patch for a signal-flow trace, or Why No Sound? for deterministic silence checks.</p>
          </div>
        </section>
      </div>
    </Panel>
  );
}

function AtomPalette({ onAddAtom }: { onAddAtom: (atomType: string) => void }) {
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
      <div className="grid max-h-[640px] gap-[var(--gs-gap-md)] overflow-y-auto pr-1">
        {groupAtomsByCategory().map((group) => (
          <section className="grid gap-2" key={group.category}>
            <h3 className="text-xs font-black uppercase leading-none text-[var(--gs-text-muted)]">
              {group.category}
            </h3>
            <div className="grid gap-2">
              {group.atoms.map((atom) => (
                <button
                  className="grid min-h-14 gap-1 rounded-[var(--gs-radius-md)] border border-[var(--gs-card-border)] bg-[var(--gs-card-bg)] p-3 text-left text-sm text-[var(--gs-text)] transition-colors hover:border-[var(--gs-accent)] hover:bg-[var(--gs-accent-muted)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--gs-focus)]"
                  draggable
                  key={atom.atomType}
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
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Panel>
  );
}

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
        <PortColumn nodeId={id} ports={inputs} side="input" />
        <PortColumn nodeId={id} ports={outputs} side="output" />
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
  ports,
  side,
}: {
  nodeId: string;
  ports: ReturnType<typeof getAtomDefinition>["ports"];
  side: "input" | "output";
}) {
  const { onPortClick, pendingPort } = useContext(PortConnectContext);

  return (
    <div className={cn("grid content-start gap-1", side === "output" && "justify-items-end text-right")}>
      {ports.map((port) => (
        <div className="relative min-h-8 w-full" key={port.id}>
          <Handle
            id={port.id}
            isConnectable
            position={side === "input" ? Position.Left : Position.Right}
            style={{
              background: domainColors[port.domain],
              border: "2px solid var(--gs-card-bg)",
              height: 18,
              width: 18,
            }}
            title={`${port.label} ${domainLabels[port.domain]}`}
            type={side === "input" ? "target" : "source"}
          />
          <button
            aria-label={`${side === "output" ? "Start wire from" : "Finish wire at"} ${nodeId}.${port.id}`}
            className={cn(
              "nodrag nopan flex min-h-8 w-full items-center gap-1 rounded-[var(--gs-radius-sm)] border px-2 text-xs font-bold leading-tight text-[var(--gs-text)] transition-colors",
              pendingPort?.nodeId === nodeId && pendingPort.handleId === port.id
                ? "border-[var(--gs-accent)] bg-[var(--gs-accent-muted)]"
                : "border-transparent bg-transparent hover:border-[var(--gs-border)] hover:bg-[var(--gs-surface-muted)]",
              side === "input" ? "pl-4 text-left" : "justify-end pr-4 text-right",
            )}
            data-testid={`port-${nodeId}-${port.id}`}
            onClick={(event) => {
              event.stopPropagation();
              onPortClick({
                direction: side,
                handleId: port.id,
                nodeId,
              });
            }}
            title={`${side === "output" ? "Start wire from" : "Finish wire at"} ${nodeId}.${port.id}`}
            type="button"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: domainColors[port.domain] }}
              aria-hidden="true"
            />
            <span className="truncate">{port.label}</span>
          </button>
          <span className="sr-only">
            {nodeId} {port.id}
          </span>
        </div>
      ))}
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

function InspectorPanel({
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
    const sourcePort = sourceNode ? getPort(getAtomDefinition(sourceNode.data.atomType), edge.sourceHandle) : undefined;
    const targetPort = targetNode ? getPort(getAtomDefinition(targetNode.data.atomType), edge.targetHandle) : undefined;
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
            {sourcePort?.label ?? edge.sourceHandle}
          </span>
          <span>
            <strong>{targetNode ? getAtomDefinition(targetNode.data.atomType).displayName : edge.target}</strong>.
            {targetPort?.label ?? edge.targetHandle}
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

function ConsolePanel({
  compileResult,
  jsonDraft,
  onDraftChange,
  onExplain,
  onExport,
  onImport,
  onNoSound,
  onPickFile,
  runtime,
}: {
  compileResult: CompileResult;
  jsonDraft: string;
  onDraftChange: (value: string) => void;
  onExplain: () => void;
  onExport: () => void;
  onImport: () => void;
  onNoSound: () => void;
  onPickFile: () => void;
  runtime: RenderedPatch;
}) {
  return (
    <Panel variant="editor">
      <PanelHeader>
        <div>
          <Eyebrow>Diagnostics Console</Eyebrow>
          <Readout as="h3">Explain silence</Readout>
        </div>
        <ButtonRow className="justify-end">
          <Button onClick={onExplain} type="button">
            <HelpCircle size={18} aria-hidden="true" />
            Explain This Patch
          </Button>
          <Button onClick={onNoSound} type="button">
            <Bug size={18} aria-hidden="true" />
            Why No Sound?
          </Button>
        </ButtonRow>
      </PanelHeader>
      <div className="grid gap-2 text-sm text-[var(--gs-text-muted)] md:grid-cols-3">
        <span>{compileResult.diagnostics.length} diagnostics</span>
        <span>Runtime peak {runtime.output.peak.toFixed(3)}</span>
        <span>{runtime.output.safetyMuted ? "Safety muted" : "Limiter ready"}</span>
      </div>
      <DiagnosticList diagnostics={[...compileResult.diagnostics, ...runtime.graphWarnings].slice(0, 6)} empty="No diagnostics." />
      <div className="grid gap-[var(--gs-gap-sm)]">
        <TextArea
          aria-label="Patch JSON and reports"
          onChange={(event) => onDraftChange(event.currentTarget.value)}
          placeholder="Export a PatchGraph JSON or run a diagnostic report."
          value={jsonDraft}
        />
        <ButtonRow>
          <Button onClick={onExport} type="button">
            <Download size={18} aria-hidden="true" />
            Export JSON
          </Button>
          <Button disabled={jsonDraft.trim().length === 0} onClick={onImport} type="button">
            <Upload size={18} aria-hidden="true" />
            Load JSON
          </Button>
          <IconButton label="Load patch file" onClick={onPickFile} type="button">
            <FileJson size={18} aria-hidden="true" />
          </IconButton>
        </ButtonRow>
      </div>
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

function DiagnosticList({ diagnostics, empty }: { diagnostics: Diagnostic[]; empty: string }) {
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

function RuntimeReadout({ stats }: { stats?: EdgeRuntimeStats | RenderedPatch["nodeStats"][string] }) {
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

function StatusTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
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

function WaveformView({ samples }: { samples: Float32Array }) {
  const points = useMemo(() => buildWaveformPoints(samples), [samples]);

  return (
    <div className="min-h-32 overflow-hidden rounded-[var(--gs-radius-md)] border border-[var(--gs-panel-border)] bg-[var(--gs-page-chrome)]">
      <svg aria-label="Rendered patch waveform" className="block h-32 w-full" preserveAspectRatio="none" role="img" viewBox="0 0 720 128">
        <line stroke="var(--gs-border)" strokeDasharray="4 8" strokeWidth="1" x1="0" x2="720" y1="64" y2="64" />
        <polyline fill="none" points={points} stroke="var(--sf-audio)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

function buildPatchExplanation(patch: PatchGraph, compileResult: CompileResult) {
  const compilingEdges = patch.edges.filter((edge) => compileResult.edgeDiagnostics[edge.id]?.compiles);
  const lines = [`${patch.metadata.title}`, "", "This patch compiles because:"];

  for (const edge of compilingEdges) {
    const source = patch.nodes.find((node) => node.id === edge.source);
    const target = patch.nodes.find((node) => node.id === edge.target);
    if (!source || !target) {
      continue;
    }
    lines.push(
      `- ${getAtomDefinition(source.data.atomType).displayName}.${edge.sourceHandle} feeds ${getAtomDefinition(target.data.atomType).displayName}.${edge.targetHandle}.`,
    );
  }

  if (compilingEdges.length === 0) {
    lines.push("- No wires currently compile into an audible Output path.");
  }

  return lines.join("\n");
}

function buildNoSoundReport(compileResult: CompileResult, runtime: RenderedPatch) {
  const problems = compileResult.diagnostics.filter((diagnostic) => diagnostic.severity !== "info");
  const lines = ["Why No Sound?", ""];

  if (runtime.output.muted) {
    lines.push("Problem: Master output is muted.");
    lines.push("Fix: Turn Safe/Muted back on.");
  }

  if (runtime.output.peak <= 0.0001) {
    lines.push("Problem: Rendered output peak is near zero.");
  }

  for (const diagnostic of problems) {
    lines.push(`Problem: ${diagnostic.message}`);
    if (diagnostic.suggestion) {
      lines.push(`Fix: ${diagnostic.suggestion}`);
    }
  }

  if (lines.length <= 3) {
    lines.push("No deterministic silence problem was found. Inspect edge meters for a low-level signal path.");
  }

  return lines.join("\n");
}

function serializePatch(patch: PatchGraph) {
  return {
    edges: patch.edges.map(({ data: _data, ...edge }) => edge),
    metadata: patch.metadata,
    nodes: patch.nodes.map((node) => ({
      data: {
        atomType: node.data.atomType,
        params: node.data.params,
      },
      id: node.id,
      position: node.position,
      type: node.type,
    })),
  };
}

function deserializePatch(value: unknown): PatchGraph {
  if (!value || typeof value !== "object") {
    throw new Error("Patch JSON must be an object.");
  }

  const patch = value as PatchGraph;
  const metadata = {
    connectionMode: patch.metadata?.connectionMode ?? "lab",
    masterVolume: patch.metadata?.masterVolume ?? 0.35,
    muted: patch.metadata?.muted ?? false,
    tempo: patch.metadata?.tempo ?? 120,
    title: patch.metadata?.title ?? "Imported Patch",
    version: patch.metadata?.version ?? "1.0.0",
  };

  return {
    edges: Array.isArray(patch.edges)
      ? patch.edges.map((edge) => ({
          ...edge,
          data: {},
          type: "signal",
        }))
      : [],
    metadata,
    nodes: Array.isArray(patch.nodes)
      ? patch.nodes.map((node) => {
          const definition = getAtomDefinition(node.data.atomType);
          return {
            ...node,
            data: {
              atomType: node.data.atomType,
              params: {
                ...cloneParams(definition.defaultParams),
                ...node.data.params,
              },
            },
            type: "atom",
          };
        })
      : [],
  };
}

function domainColorForNode(node: AtomNode) {
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

function buildWaveformPoints(samples: Float32Array) {
  const width = 720;
  const height = 128;
  const center = height / 2;
  const pointCount = 320;
  const windowSize = Math.max(1, Math.floor(samples.length / pointCount));
  const points: string[] = [];

  for (let point = 0; point < pointCount; point += 1) {
    const start = point * windowSize;
    const end = Math.min(samples.length, start + windowSize);
    let min = 0;
    let max = 0;

    for (let index = start; index < end; index += 1) {
      min = Math.min(min, samples[index]);
      max = Math.max(max, samples[index]);
    }

    const sample = Math.abs(max) >= Math.abs(min) ? max : min;
    const x = (point / (pointCount - 1)) * width;
    const y = center - sample * (height * 0.42);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  return points.join(" ");
}

function createNodeId(atomType: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${atomType}-${suffix}`;
}

function stopActiveSource(source: AudioBufferSourceNode | null) {
  if (!source) {
    return;
  }

  try {
    source.stop();
  } catch {
    // Already ended.
  }
}
