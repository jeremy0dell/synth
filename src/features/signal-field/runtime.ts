import {
  AttackDecayEnvelope,
  DecayEnvelope,
  MultiPulseEnvelope,
  OnePoleHighpass,
  OnePoleLowpass,
  Resonator,
  SineOscillator,
  SquareOscillator,
  WhiteNoise,
  clamp,
  seededRandom,
  softClip,
} from "../../dsp/primitives";
import type {
  Diagnostic,
  EdgeRuntimeStats,
  EngineEdge,
  EngineGraph,
  EngineNode,
  NodeRuntimeStats,
  RenderedPatch,
} from "./types";

type RenderOptions = {
  durationSeconds?: number;
  manualTrigger?: boolean;
  sampleRate?: number;
  seed?: number;
};

type RuntimeNodeState = {
  attackDecay?: AttackDecayEnvelope;
  bandPassHigh?: OnePoleHighpass;
  bandPassLow?: OnePoleLowpass;
  decay?: DecayEnvelope;
  highpass?: OnePoleHighpass;
  impulseRemaining?: number;
  lowpass?: OnePoleLowpass;
  multiPulse?: MultiPulseEnvelope;
  noise?: WhiteNoise;
  pulseCount: number;
  resonator?: Resonator;
  sine?: SineOscillator;
  square?: SquareOscillator;
};

type SignalFrame = Record<string, number>;

const safetyPeak = 0.98;

export function renderEngineGraph(engineGraph: EngineGraph, options: RenderOptions = {}): RenderedPatch {
  const sampleRate = options.sampleRate ?? 44100;
  const durationSeconds = options.durationSeconds ?? inferDuration(engineGraph);
  const totalSamples = Math.max(1, Math.round(durationSeconds * sampleRate));
  const samples = new Float32Array(totalSamples);
  const random = seededRandom(options.seed ?? 404);
  const states = initializeStates(engineGraph.nodes, sampleRate, random);
  const incoming = buildIncomingEdges(engineGraph.edges);
  const outgoing = buildOutgoingEdges(engineGraph.edges);
  const order = topologicalOrder(engineGraph.nodes, engineGraph.edges);
  const nodeOutputs = new Map<string, SignalFrame>();
  const edgeMeters = new Map<string, { lastValue: number; peak: number; pulseCount: number; sumSquares: number }>();
  const nodeMeters = new Map<string, { lastTriggerSample?: number; lastValue: number; peak: number; pulseCount: number; sumSquares: number }>();
  const graphWarnings: Diagnostic[] = [];
  let peak = 0;
  let safetyMuted = false;
  let sumSquares = 0;

  for (const node of engineGraph.nodes) {
    nodeOutputs.set(node.id, {});
    nodeMeters.set(node.id, {
      lastValue: 0,
      peak: 0,
      pulseCount: 0,
      sumSquares: 0,
    });
  }

  for (const edge of engineGraph.edges) {
    edgeMeters.set(edge.id, {
      lastValue: 0,
      peak: 0,
      pulseCount: 0,
      sumSquares: 0,
    });
  }

  for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex += 1) {
    for (const node of order) {
      const outputs = processNode({
        incoming: incoming.get(node.id) ?? [],
        manualTrigger: options.manualTrigger ?? true,
        node,
        nodeOutputs,
        outgoing: outgoing.get(node.id) ?? [],
        sampleIndex,
        sampleRate,
        state: states.get(node.id) ?? { pulseCount: 0 },
      });

      nodeOutputs.set(node.id, outputs);
      updateNodeMeter(nodeMeters.get(node.id), outputs, sampleIndex);

      for (const edge of outgoing.get(node.id) ?? []) {
        const value = outputs[edge.sourceHandle] ?? 0;
        updateEdgeMeter(edgeMeters.get(edge.id), edge, value);
      }
    }

    let out = 0;
    for (const output of engineGraph.nodes.filter((node) => node.atomType === "output")) {
      out += nodeOutputs.get(output.id)?.audioOut ?? 0;
    }

    if (!Number.isFinite(out)) {
      safetyMuted = true;
      out = 0;
    }

    const limited = clamp(Math.tanh(out * engineGraph.metadata.masterVolume), -safetyPeak, safetyPeak);
    peak = Math.max(peak, Math.abs(limited));
    sumSquares += limited * limited;
    samples[sampleIndex] = limited;
  }

  if (safetyMuted) {
    graphWarnings.push({
      id: "runtime:auto-muted",
      message: "Runtime auto-muted non-finite output.",
      severity: "safety",
      suggestion: "Inspect nodes producing NaN or Infinity and reduce unsafe modulation.",
    });
  }

  const muted = engineGraph.metadata.muted;
  if (muted) {
    samples.fill(0);
  }

  return {
    durationSeconds,
    edgeStats: Object.fromEntries(
      Array.from(edgeMeters.entries()).map(([edgeId, meter]) => [
        edgeId,
        {
          lastValue: meter.lastValue,
          peak: meter.peak,
          pulseCount: meter.pulseCount,
          rms: Math.sqrt(meter.sumSquares / totalSamples),
          status: meter.peak > 0.0001 || meter.pulseCount > 0 ? "active" : "silent",
        } satisfies EdgeRuntimeStats,
      ]),
    ),
    graphWarnings,
    nodeStats: Object.fromEntries(
      Array.from(nodeMeters.entries()).map(([nodeId, meter]) => [
        nodeId,
        {
          lastTriggerSample: meter.lastTriggerSample,
          lastValue: meter.lastValue,
          peak: meter.peak,
          pulseCount: meter.pulseCount,
          rms: Math.sqrt(meter.sumSquares / totalSamples),
          status: meter.peak > 0.0001 || meter.pulseCount > 0 ? "active" : "silent",
        } satisfies NodeRuntimeStats,
      ]),
    ),
    output: {
      muted,
      peak,
      rms: Math.sqrt(sumSquares / totalSamples),
      safetyMuted,
    },
    sampleRate,
    samples,
  };
}

function processNode({
  incoming,
  manualTrigger,
  node,
  nodeOutputs,
  outgoing,
  sampleIndex,
  sampleRate,
  state,
}: {
  incoming: EngineEdge[];
  manualTrigger: boolean;
  node: EngineNode;
  nodeOutputs: Map<string, SignalFrame>;
  outgoing: EngineEdge[];
  sampleIndex: number;
  sampleRate: number;
  state: RuntimeNodeState;
}) {
  const input = (handleId: string, fallback = 0) => getInputValue(handleId, incoming, nodeOutputs, fallback);
  const pulse = (handleId: string) => getTriggerValue(handleId, incoming, nodeOutputs);

  switch (node.atomType) {
    case "manualTrigger": {
      const trigger = manualTrigger && sampleIndex === 0 ? 1 : 0;
      if (trigger > 0) {
        state.pulseCount += 1;
      }
      return { triggerOut: trigger };
    }
    case "clock": {
      const bpm = asNumber(node.params.bpm, 120);
      const division = typeof node.params.division === "string" ? node.params.division : "1/4";
      const period = Math.max(1, Math.round((60 / bpm / divisionFactor(division)) * sampleRate));
      const running = node.params.running !== false;
      const trigger = running && sampleIndex % period === 0 ? 1 : 0;
      if (trigger > 0) {
        state.pulseCount += 1;
      }
      return {
        phaseOut: (sampleIndex % period) / period,
        triggerOut: trigger,
      };
    }
    case "stepSequencer": {
      const clock = pulse("clockIn");
      const steps = Array.isArray(node.params.steps) ? node.params.steps : [];
      const stepIndex = state.pulseCount % Math.max(1, steps.length);
      const active = steps[stepIndex] !== false;
      const trigger = clock > 0 && active ? 1 : 0;
      if (clock > 0) {
        state.pulseCount += 1;
      }
      return {
        accentOut: trigger > 0 ? asNumber(node.params.accent, 1) : 0,
        triggerOut: trigger,
      };
    }
    case "triggerDelay":
    case "triggerSplitter": {
      const trigger = pulse("triggerIn");
      return Object.fromEntries(outgoing.map((edge) => [edge.sourceHandle, trigger]));
    }
    case "sineOscillator": {
      const oscillator = state.sine ?? new SineOscillator(sampleRate);
      state.sine = oscillator;
      if (pulse("phaseResetIn") > 0) {
        oscillator.reset();
      }
      oscillator.frequency = clamp(
        input("frequencyIn", asNumber(node.params.frequency, 55)) + input("fmIn") * asNumber(node.params.fmAmount, 0),
        0.1,
        sampleRate * 0.45,
      );
      return { audioOut: oscillator.process() };
    }
    case "squareOscillator": {
      const oscillator = state.square ?? new SquareOscillator(sampleRate);
      state.square = oscillator;
      if (pulse("phaseResetIn") > 0) {
        oscillator.reset();
      }
      oscillator.frequency = clamp(input("frequencyIn", asNumber(node.params.frequency, 110)), 0.1, sampleRate * 0.45);
      return { audioOut: oscillator.process() * 0.7 };
    }
    case "noise": {
      const noise = state.noise ?? new WhiteNoise();
      state.noise = noise;
      return { audioOut: noise.process() * asNumber(node.params.level, 0.8) };
    }
    case "impulse": {
      if (pulse("triggerIn") > 0) {
        state.impulseRemaining = Math.max(1, Math.round(asNumber(node.params.duration, 0.003) * sampleRate));
        state.pulseCount += 1;
      }
      const remaining = state.impulseRemaining ?? 0;
      if (remaining <= 0) {
        return { audioOut: 0 };
      }
      state.impulseRemaining = remaining - 1;
      return { audioOut: asNumber(node.params.amplitude, 0.35) * (remaining / Math.max(1, Math.round(asNumber(node.params.duration, 0.003) * sampleRate))) };
    }
    case "constant":
      return { valueOut: asNumber(node.params.value, 0) };
    case "decayEnvelope": {
      const decay = input("decayIn", asNumber(node.params.decay, 0.28));
      const envelope = state.decay ?? new DecayEnvelope(sampleRate, decay);
      state.decay = envelope;
      envelope.setDecaySeconds(decay);
      if (pulse("triggerIn") > 0) {
        envelope.trigger(input("amountIn", asNumber(node.params.amount, 1)));
        state.pulseCount += 1;
      }
      return { controlOut: envelope.process() };
    }
    case "attackDecayEnvelope": {
      const envelope =
        state.attackDecay ??
        new AttackDecayEnvelope(
          sampleRate,
          input("attackIn", asNumber(node.params.attack, 0.004)),
          input("decayIn", asNumber(node.params.decay, 0.25)),
        );
      state.attackDecay = envelope;
      if (pulse("triggerIn") > 0) {
        envelope.trigger(input("amountIn", asNumber(node.params.amount, 1)));
        state.pulseCount += 1;
      }
      return { controlOut: envelope.process() };
    }
    case "multiPulseEnvelope": {
      const pulseCount = Math.max(1, Math.round(asNumber(node.params.pulseCount, 4)));
      const spacing = input("spacingIn", asNumber(node.params.spacing, 0.014));
      const times = Array.from({ length: pulseCount }, (_, index) => index * spacing);
      const envelope = state.multiPulse ?? new MultiPulseEnvelope(sampleRate, times, asNumber(node.params.tailDecay, 0.28));
      state.multiPulse = envelope;
      envelope.setDecaySeconds(input("decayIn", asNumber(node.params.tailDecay, 0.28)));
      if (pulse("triggerIn") > 0) {
        envelope.trigger(asNumber(node.params.amount, 1));
        state.pulseCount += 1;
      }
      return { controlOut: envelope.process() };
    }
    case "mapRange": {
      const inputValue = input("input", 0);
      const inMin = asNumber(node.params.inputMin, 0);
      const inMax = asNumber(node.params.inputMax, 1);
      const outMin = input("outMinIn", asNumber(node.params.outputMin, 55));
      const outMax = input("outMaxIn", asNumber(node.params.outputMax, 160));
      const normalized = clamp((inputValue - inMin) / Math.max(0.000001, inMax - inMin), 0, 1);
      return { output: outMin + normalized * (outMax - outMin) };
    }
    case "add":
      return { out: input("a", 0) + input("b", 0) };
    case "multiply":
      return { out: input("a", 1) * input("b", 1) };
    case "clamp":
      return { output: clamp(input("input", 0), input("min", 0), input("max", 1)) };
    case "invert":
      return { output: -input("input", 0) };
    case "slew":
      return { output: input("input", 0) };
    case "gain": {
      const audio = input("audioIn", 0);
      const gain = input("gainIn", asNumber(node.params.baseGain, 0));
      return { audioOut: audio * gain };
    }
    case "mixer": {
      const output =
        input("audioIn1", 0) * asNumber(node.params.trim1, 0.8) +
        input("audioIn2", 0) * asNumber(node.params.trim2, 0.8) +
        input("audioIn3", 0) * asNumber(node.params.trim3, 0.8) +
        input("audioIn4", 0) * asNumber(node.params.trim4, 0.8);
      return { audioOut: output * asNumber(node.params.outputTrim, 0.9) };
    }
    case "lowPassFilter": {
      const filter = state.lowpass ?? new OnePoleLowpass(input("cutoffIn", asNumber(node.params.cutoff, 12000)), sampleRate);
      state.lowpass = filter;
      filter.setCutoff(input("cutoffIn", asNumber(node.params.cutoff, 12000)));
      return { audioOut: filter.process(input("audioIn", 0)) };
    }
    case "highPassFilter": {
      const filter = state.highpass ?? new OnePoleHighpass(input("cutoffIn", asNumber(node.params.cutoff, 400)), sampleRate);
      state.highpass = filter;
      filter.setCutoff(input("cutoffIn", asNumber(node.params.cutoff, 400)));
      return { audioOut: filter.process(input("audioIn", 0)) };
    }
    case "bandPassFilter": {
      const cutoff = input("cutoffIn", asNumber(node.params.cutoff, 1800));
      const q = Math.max(0.1, input("qIn", asNumber(node.params.q, 1.6)));
      const lowCut = Math.max(20, cutoff / (q * 1.8));
      const highCut = Math.min(sampleRate * 0.45, cutoff * q * 1.8);
      const high = state.bandPassHigh ?? new OnePoleHighpass(lowCut, sampleRate);
      const low = state.bandPassLow ?? new OnePoleLowpass(highCut, sampleRate);
      state.bandPassHigh = high;
      state.bandPassLow = low;
      high.setCutoff(lowCut);
      low.setCutoff(highCut);
      return { audioOut: low.process(high.process(input("audioIn", 0))) };
    }
    case "resonator": {
      const resonator = state.resonator ?? new Resonator(sampleRate, input("decayIn", asNumber(node.params.decay, 0.25)));
      state.resonator = resonator;
      resonator.frequency = input("frequencyIn", asNumber(node.params.frequency, 180));
      if (pulse("triggerIn") > 0) {
        resonator.excite(asNumber(node.params.amount, 0.6));
        state.pulseCount += 1;
      }
      return { audioOut: resonator.process() };
    }
    case "softClip":
      return {
        audioOut: softClip(input("audioIn", 0) * input("driveIn", asNumber(node.params.drive, 1.4))) * asNumber(node.params.outputTrim, 0.85),
      };
    case "output": {
      const volume = node.params.mute === true ? 0 : asNumber(node.params.volume, 0.35);
      return {
        audioOut: input("audioIn", 0) * volume,
      };
    }
    case "meter":
    case "oscilloscope":
    case "signalProbe":
    case "triggerLog":
      return { output: input("input", input("audioIn", input("triggerIn", 0))) };
    default:
      return {};
  }
}

function initializeStates(nodes: EngineNode[], sampleRate: number, random: () => number) {
  return new Map(
    nodes.map((node) => [
      node.id,
      {
        noise: node.atomType === "noise" ? new WhiteNoise(random) : undefined,
        pulseCount: 0,
      } satisfies RuntimeNodeState,
    ]),
  );
}

function getInputValue(
  handleId: string,
  incoming: EngineEdge[],
  nodeOutputs: Map<string, SignalFrame>,
  fallback: number,
) {
  const edge = incoming.find((candidate) => candidate.targetHandle === handleId);

  if (!edge) {
    return fallback;
  }

  return nodeOutputs.get(edge.source)?.[edge.sourceHandle] ?? fallback;
}

function getTriggerValue(handleId: string, incoming: EngineEdge[], nodeOutputs: Map<string, SignalFrame>) {
  return getInputValue(handleId, incoming, nodeOutputs, 0) > 0 ? 1 : 0;
}

function updateEdgeMeter(
  meter: { lastValue: number; peak: number; pulseCount: number; sumSquares: number } | undefined,
  edge: EngineEdge,
  value: number,
) {
  if (!meter) {
    return;
  }

  meter.lastValue = value;
  meter.peak = Math.max(meter.peak, Math.abs(value));
  meter.sumSquares += value * value;

  if (edge.domain === "trigger" && value > 0) {
    meter.pulseCount += 1;
  }
}

function updateNodeMeter(
  meter: { lastTriggerSample?: number; lastValue: number; peak: number; pulseCount: number; sumSquares: number } | undefined,
  outputs: SignalFrame,
  sampleIndex: number,
) {
  if (!meter) {
    return;
  }

  const maxValue = Object.values(outputs).reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  const trigger = Object.entries(outputs).some(([handle, value]) => handle.toLowerCase().includes("trigger") && value > 0);

  meter.lastValue = maxValue;
  meter.peak = Math.max(meter.peak, maxValue);
  meter.sumSquares += maxValue * maxValue;

  if (trigger) {
    meter.pulseCount += 1;
    meter.lastTriggerSample = sampleIndex;
  }
}

function topologicalOrder(nodes: EngineNode[], edges: EngineEdge[]) {
  const nodeIndex = new Map(nodes.map((node) => [node.id, node]));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = buildOutgoingEdges(edges);

  for (const edge of edges) {
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0);
  const ordered: EngineNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift();

    if (!node) {
      continue;
    }

    ordered.push(node);

    for (const edge of outgoing.get(node.id) ?? []) {
      const nextIndegree = (indegree.get(edge.target) ?? 0) - 1;
      indegree.set(edge.target, nextIndegree);

      if (nextIndegree === 0) {
        const next = nodeIndex.get(edge.target);
        if (next) {
          queue.push(next);
        }
      }
    }
  }

  return ordered.length === nodes.length ? ordered : nodes;
}

function buildIncomingEdges(edges: EngineEdge[]) {
  const incoming = new Map<string, EngineEdge[]>();

  for (const edge of edges) {
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
  }

  return incoming;
}

function buildOutgoingEdges(edges: EngineEdge[]) {
  const outgoing = new Map<string, EngineEdge[]>();

  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
  }

  return outgoing;
}

function inferDuration(engineGraph: EngineGraph) {
  if (engineGraph.nodes.some((node) => ["decayEnvelope", "multiPulseEnvelope", "attackDecayEnvelope"].includes(node.atomType))) {
    return 1.2;
  }

  return 0.75;
}

function divisionFactor(division: string) {
  switch (division) {
    case "1/16":
      return 4;
    case "1/8":
      return 2;
    default:
      return 1;
  }
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
