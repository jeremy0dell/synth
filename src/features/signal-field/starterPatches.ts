import { cloneParams, getAtomDefinition, type ParamValue } from "../../dsp/atoms";
import type { AtomNode, PatchEdge, PatchGraph, PatchMetadata, StarterPatchId } from "./types";

type NodeSpec = {
  atomType: string;
  id: string;
  params?: Record<string, ParamValue>;
  x: number;
  y: number;
};

type EdgeSpec = {
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
};

export const starterPatchOptions: Array<{ description: string; label: string; value: StarterPatchId }> = [
  { description: "Continuous sine through a VCA into output.", label: "First Sound", value: "firstSound" },
  { description: "Manual trigger starts a decay envelope.", label: "First Percussion", value: "firstPercussion" },
  { description: "Pitch drop, body VCA, impulse, mixer, and clipper.", label: "Kick From Atoms", value: "kick" },
  { description: "Tonal body plus filtered noise snap.", label: "Snare From Atoms", value: "snare" },
  { description: "Multi-burst filtered noise transient.", label: "Clap From Atoms", value: "clap" },
  { description: "A silent patch with useful diagnostics.", label: "Broken: Why No Sound?", value: "broken" },
];

export function createStarterPatch(starter: StarterPatchId, connectionMode = "lab"): PatchGraph {
  switch (starter) {
    case "firstSound":
      return buildPatch(
        "First Sound",
        connectionMode,
        [
          { atomType: "sineOscillator", id: "sine", params: { frequency: 220 }, x: 120, y: 120 },
          { atomType: "constant", id: "constant", params: { value: 0.28, unit: "scalar" }, x: 120, y: 320 },
          { atomType: "gain", id: "gain", params: { baseGain: 0 }, x: 410, y: 205 },
          { atomType: "output", id: "output", params: { volume: 0.35, mute: false }, x: 700, y: 205 },
        ],
        [
          edge("sine", "audioOut", "gain", "audioIn"),
          edge("constant", "valueOut", "gain", "gainIn"),
          edge("gain", "audioOut", "output", "audioIn"),
        ],
      );
    case "firstPercussion":
      return buildPatch(
        "First Percussion",
        connectionMode,
        [
          { atomType: "manualTrigger", id: "trigger", x: 80, y: 110 },
          { atomType: "decayEnvelope", id: "env", params: { amount: 1, decay: 0.42 }, x: 360, y: 95 },
          { atomType: "sineOscillator", id: "sine", params: { frequency: 155 }, x: 80, y: 350 },
          { atomType: "gain", id: "gain", params: { baseGain: 0 }, x: 640, y: 230 },
          { atomType: "output", id: "output", params: { volume: 0.4, mute: false }, x: 915, y: 230 },
        ],
        [
          edge("trigger", "triggerOut", "env", "triggerIn"),
          edge("env", "controlOut", "gain", "gainIn"),
          edge("sine", "audioOut", "gain", "audioIn"),
          edge("gain", "audioOut", "output", "audioIn"),
        ],
      );
    case "kick":
      return buildPatch(
        "Kick From Atoms",
        connectionMode,
        [
          { atomType: "manualTrigger", id: "trigger", x: 60, y: 210 },
          { atomType: "decayEnvelope", id: "ampEnv", params: { amount: 1.15, decay: 0.58 }, x: 325, y: 80 },
          { atomType: "decayEnvelope", id: "pitchEnv", params: { amount: 1, decay: 0.16 }, x: 325, y: 285 },
          { atomType: "mapRange", id: "pitchMap", params: { outputMin: 52, outputMax: 172, outputUnit: "Hz" }, x: 615, y: 285 },
          { atomType: "sineOscillator", id: "sine", params: { frequency: 55 }, x: 615, y: 70 },
          { atomType: "gain", id: "bodyVca", params: { baseGain: 0 }, x: 905, y: 80 },
          { atomType: "impulse", id: "click", params: { amplitude: 0.24, duration: 0.004 }, x: 615, y: 505 },
          { atomType: "mixer", id: "mixer", params: { trim1: 0.9, trim2: 0.35, outputTrim: 0.85 }, x: 1195, y: 180 },
          { atomType: "softClip", id: "clip", params: { drive: 2.2, outputTrim: 0.82 }, x: 1485, y: 210 },
          { atomType: "output", id: "output", params: { volume: 0.42, mute: false }, x: 1760, y: 210 },
        ],
        [
          edge("trigger", "triggerOut", "ampEnv", "triggerIn"),
          edge("trigger", "triggerOut", "pitchEnv", "triggerIn"),
          edge("trigger", "triggerOut", "click", "triggerIn"),
          edge("ampEnv", "controlOut", "bodyVca", "gainIn"),
          edge("pitchEnv", "controlOut", "pitchMap", "input"),
          edge("pitchMap", "output", "sine", "frequencyIn"),
          edge("sine", "audioOut", "bodyVca", "audioIn"),
          edge("bodyVca", "audioOut", "mixer", "audioIn1"),
          edge("click", "audioOut", "mixer", "audioIn2"),
          edge("mixer", "audioOut", "clip", "audioIn"),
          edge("clip", "audioOut", "output", "audioIn"),
        ],
      );
    case "snare":
      return buildPatch(
        "Snare From Atoms",
        connectionMode,
        [
          { atomType: "manualTrigger", id: "trigger", x: 65, y: 230 },
          { atomType: "decayEnvelope", id: "toneEnv", params: { amount: 0.72, decay: 0.3 }, x: 330, y: 90 },
          { atomType: "decayEnvelope", id: "noiseEnv", params: { amount: 1, decay: 0.18 }, x: 330, y: 370 },
          { atomType: "sineOscillator", id: "tone", params: { frequency: 185 }, x: 615, y: 70 },
          { atomType: "gain", id: "toneGain", params: { baseGain: 0 }, x: 900, y: 95 },
          { atomType: "noise", id: "noise", params: { level: 0.9 }, x: 615, y: 395 },
          { atomType: "highPassFilter", id: "hpf", params: { cutoff: 1200, q: 0.8 }, x: 900, y: 380 },
          { atomType: "gain", id: "noiseGain", params: { baseGain: 0 }, x: 1185, y: 375 },
          { atomType: "mixer", id: "mixer", params: { trim1: 0.9, trim2: 0.75, outputTrim: 0.75 }, x: 1470, y: 220 },
          { atomType: "output", id: "output", params: { volume: 0.42, mute: false }, x: 1760, y: 220 },
        ],
        [
          edge("trigger", "triggerOut", "toneEnv", "triggerIn"),
          edge("trigger", "triggerOut", "noiseEnv", "triggerIn"),
          edge("tone", "audioOut", "toneGain", "audioIn"),
          edge("toneEnv", "controlOut", "toneGain", "gainIn"),
          edge("noise", "audioOut", "hpf", "audioIn"),
          edge("hpf", "audioOut", "noiseGain", "audioIn"),
          edge("noiseEnv", "controlOut", "noiseGain", "gainIn"),
          edge("toneGain", "audioOut", "mixer", "audioIn1"),
          edge("noiseGain", "audioOut", "mixer", "audioIn2"),
          edge("mixer", "audioOut", "output", "audioIn"),
        ],
      );
    case "clap":
      return buildPatch(
        "Clap From Atoms",
        connectionMode,
        [
          { atomType: "manualTrigger", id: "trigger", x: 80, y: 145 },
          { atomType: "multiPulseEnvelope", id: "burstEnv", params: { pulseCount: 4, spacing: 0.013, tailDecay: 0.33 }, x: 355, y: 115 },
          { atomType: "noise", id: "noise", params: { level: 1 }, x: 355, y: 390 },
          { atomType: "bandPassFilter", id: "bpf", params: { cutoff: 1800, q: 1.8 }, x: 640, y: 385 },
          { atomType: "gain", id: "gain", params: { baseGain: 0 }, x: 925, y: 260 },
          { atomType: "output", id: "output", params: { volume: 0.42, mute: false }, x: 1215, y: 260 },
        ],
        [
          edge("trigger", "triggerOut", "burstEnv", "triggerIn"),
          edge("noise", "audioOut", "bpf", "audioIn"),
          edge("bpf", "audioOut", "gain", "audioIn"),
          edge("burstEnv", "controlOut", "gain", "gainIn"),
          edge("gain", "audioOut", "output", "audioIn"),
        ],
      );
    case "broken":
      return buildPatch(
        "Broken: Why No Sound?",
        connectionMode,
        [
          { atomType: "manualTrigger", id: "trigger", x: 90, y: 300 },
          { atomType: "decayEnvelope", id: "env", params: { amount: 1, decay: 0.28 }, x: 365, y: 300 },
          { atomType: "sineOscillator", id: "sine", params: { frequency: 160 }, x: 90, y: 80 },
          { atomType: "gain", id: "gain", params: { baseGain: 0 }, x: 365, y: 95 },
          { atomType: "output", id: "output", params: { volume: 0.4, mute: false }, x: 650, y: 95 },
        ],
        [
          edge("sine", "audioOut", "gain", "audioIn"),
          edge("gain", "audioOut", "output", "audioIn"),
          edge("trigger", "triggerOut", "env", "triggerIn"),
        ],
      );
  }
}

function buildPatch(
  title: string,
  connectionMode: string,
  nodeSpecs: NodeSpec[],
  edgeSpecs: EdgeSpec[],
): PatchGraph {
  return {
    edges: edgeSpecs.map((spec, index) => ({
      data: {},
      id: `${spec.source}:${spec.sourceHandle}->${spec.target}:${spec.targetHandle}:${index}`,
      source: spec.source,
      sourceHandle: spec.sourceHandle,
      target: spec.target,
      targetHandle: spec.targetHandle,
      type: "signal",
    })),
    metadata: metadata(title, connectionMode),
    nodes: nodeSpecs.map(toNode),
  };
}

function toNode(spec: NodeSpec): AtomNode {
  const definition = getAtomDefinition(spec.atomType);

  return {
    data: {
      params: {
        ...cloneParams(definition.defaultParams),
        ...spec.params,
      },
      atomType: spec.atomType,
    },
    id: spec.id,
    position: { x: spec.x, y: spec.y },
    type: "atom",
  } satisfies AtomNode;
}

function edge(source: string, sourceHandle: string, target: string, targetHandle: string): EdgeSpec {
  return {
    source,
    sourceHandle,
    target,
    targetHandle,
  };
}

function metadata(title: string, connectionMode: string): PatchMetadata {
  return {
    connectionMode: connectionMode === "guided" || connectionMode === "unsafe" ? connectionMode : "lab",
    masterVolume: 0.35,
    muted: false,
    tempo: 120,
    title,
    version: "1.0.0",
  };
}
