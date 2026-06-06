import "@xyflow/react/dist/style.css";

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { BookOpen, Inspect, RadioTower, Shield, Volume2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { cloneParams, getAtomDefinition, type ParamDefinition, type ParamValue } from "../../dsp/atoms";
import {
  Button,
  ButtonRow,
  Eyebrow,
  Field,
  NumberInput,
  PageStack,
  Panel,
  PanelHeader,
  RangeField,
  Readout,
  SegmentedControl,
  StatusText,
} from "../../components/ui";
import { AtomPalette } from "./components/AtomPalette";
import { ConsolePanel } from "./components/ConsolePanel";
import { GuidePanel } from "./components/GuidePanel";
import { domainColorForNode, edgeTypes, nodeTypes } from "./components/GraphElements";
import { InspectorPanel } from "./components/InspectorPanel";
import { PortConnectContext } from "./components/PortConnectContext";
import { StatusTile } from "./components/StatusTile";
import { TransportControls } from "./components/TransportControls";
import { classifyConnectionForMode, compilePatchGraph } from "./compiler";
import { connectionModeOptions, starterOptions } from "./options";
import { baseHandleId } from "./portHandles";
import { renderEngineGraph } from "./runtime";
import { createStarterPatch } from "./starterPatches";
import { stopActiveSource } from "./lib/audio";
import { createNodeId } from "./lib/nodeIds";
import { deserializePatch, serializePatch } from "./lib/patchIo";
import { assignConnectionSlot, buildPortUsage } from "./lib/portUsage";
import { buildNoSoundReport, buildPatchExplanation } from "./lib/reports";
import type {
  AtomNode,
  ConnectionMode,
  PatchEdge,
  PatchGraph,
  PortRef,
  RenderedPatch,
  Selection,
  StarterPatchId,
  WindowWithWebkitAudio,
} from "./types";

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
  const [isGuideOpen, setIsGuideOpen] = useState(false);
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
  const portUsageByNode = useMemo(() => buildPortUsage(patch), [patch]);

  const decoratedNodes = useMemo(
    () =>
      patch.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          diagnostics: compileResult.nodeDiagnostics[node.id] ?? [],
          portUsage: portUsageByNode[node.id] ?? {},
          runtime: runtime.nodeStats[node.id],
        },
      })),
    [compileResult.nodeDiagnostics, patch.nodes, portUsageByNode, runtime.nodeStats],
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

      return classification.visuallyAllowed;
    },
    [patch],
  );

  const commitConnection = useCallback(
    (source: string, sourceHandle: string, target: string, targetHandle: string) => {
      const nextSourceHandle = assignConnectionSlot(patch, source, sourceHandle, "output");
      const nextTargetHandle = assignConnectionSlot(patch, target, targetHandle, "input");
      const classification = classifyConnectionForMode(
        patch,
        source,
        nextSourceHandle,
        target,
        nextTargetHandle,
        patch.metadata.connectionMode,
      );

      if (!classification.visuallyAllowed) {
        setJsonDraft(
          `Connection rejected.\n\nProblem: ${classification.reason ?? "This wire is invalid."}\nFix: ${
            classification.suggestion ?? "Use compatible ports."
          }`,
        );
        return;
      }

      const nextEdge: PatchEdge = {
        data: {
          classification,
        },
        id: `${source}:${nextSourceHandle}->${target}:${nextTargetHandle}:${Date.now()}`,
        source,
        sourceHandle: nextSourceHandle,
        target,
        targetHandle: nextTargetHandle,
        type: "signal",
      };

      setPatch((current) => ({
        ...current,
        edges: addEdge(nextEdge, current.edges),
      }));
      setSelection({ id: nextEdge.id, kind: "edge" });
      setJsonDraft(
        classification.compiles
          ? `Connected ${source}.${baseHandleId(nextSourceHandle)} -> ${target}.${baseHandleId(nextTargetHandle)}.`
          : `Added non-compiling lab wire ${source}.${baseHandleId(nextSourceHandle)} -> ${target}.${baseHandleId(nextTargetHandle)}.\n\nProblem: ${
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
          setJsonDraft(`Wire started at ${port.nodeId}.${baseHandleId(port.handleId)}.\nClick an input port to finish it.`);
          return;
        }

        setJsonDraft(`Click an output port first, then click ${port.nodeId}.${baseHandleId(port.handleId)} to finish the wire.`);
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
          setJsonDraft(`Wire start moved to ${port.nodeId}.${baseHandleId(port.handleId)}. Click an input port to finish it.`);
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
      <Panel aria-labelledby="signal-field-setup-title" variant="surface">
        <PanelHeader>
          <div>
            <Eyebrow>Signal Field V1</Eyebrow>
            <Readout id="signal-field-setup-title">Atom patch field</Readout>
          </div>
          <ButtonRow className="justify-end">
            <StatusText className="m-0" variant="meta">
              {patch.metadata.title}
            </StatusText>
            {!isGuideOpen && (
              <Button onClick={() => setIsGuideOpen(true)} type="button">
                <BookOpen size={18} aria-hidden="true" />
                Show guide
              </Button>
            )}
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
              onChange={(connectionMode: ConnectionMode) => updateMetadata({ connectionMode })}
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
      </Panel>

      <GuidePanel
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        pendingPort={pendingPort}
      />

      <div className="grid min-h-[720px] gap-[var(--gs-gap-lg)] xl:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="order-2 xl:order-1">
          <AtomPalette onAddAtom={addAtom} />
        </div>

        <Panel
          aria-labelledby="signal-field-workspace-title"
          className="order-1 grid min-h-[720px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0 xl:order-2"
          variant="editor"
        >
          <div className="grid gap-[var(--gs-gap-md)] border-b border-[var(--gs-border-subtle)] bg-[var(--gs-surface-panel-bg)] p-[var(--gs-panel-padding)]">
            <PanelHeader>
              <div>
                <Eyebrow>Patch Workspace</Eyebrow>
                <Readout as="h3" className="text-xl" id="signal-field-workspace-title">
                  Wire, trigger, listen
                </Readout>
              </div>
              <TransportControls
                isMuted={patch.metadata.muted}
                onPanic={() => void panic()}
                onPlay={triggerPatch}
                onToggleMute={() => updateMetadata({ muted: !patch.metadata.muted })}
                onTrigger={triggerPatch}
              />
            </PanelHeader>

            <div className="grid gap-[var(--gs-gap-sm)] text-sm text-[var(--gs-text-muted)] md:grid-cols-4">
              <StatusTile icon={<RadioTower size={18} aria-hidden="true" />} label="Compiler" value={compileResult.graphStatus} />
              <StatusTile icon={<Shield size={18} aria-hidden="true" />} label="Audio" value={isPlaying ? "playing" : audioState} />
              <StatusTile icon={<Volume2 size={18} aria-hidden="true" />} label="Peak" value={runtime.output.peak.toFixed(3)} />
              <StatusTile icon={<Inspect size={18} aria-hidden="true" />} label="Graph" value={`${patch.nodes.length} nodes / ${patch.edges.length} wires`} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-[var(--gs-gap-sm)] rounded-none border-y border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] px-3 py-2 text-sm">
              <StatusText className="m-0" variant={pendingPort ? "success" : "meta"}>
                {pendingPort ? `Wiring from ${pendingPort.nodeId}.${baseHandleId(pendingPort.handleId)}` : "Click an output port, then an input port."}
              </StatusText>
              <StatusText className="m-0" variant="meta">
                {patch.metadata.connectionMode} mode
              </StatusText>
            </div>
          </div>

          <PortConnectContext.Provider value={portConnectContext}>
            <div className="min-h-[560px]">
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
            </div>
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
