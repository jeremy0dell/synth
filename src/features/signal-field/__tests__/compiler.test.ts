import { describe, expect, test } from "vitest";
import { cloneParams, getAtomDefinition } from "../../../dsp/atoms";
import { classifyConnectionForMode, compilePatchGraph } from "../compiler";
import { renderEngineGraph } from "../runtime";
import { createStarterPatch } from "../starterPatches";

describe("Signal Field compiler and runtime", () => {
  test("compiles first sound into a separate runnable engine graph", () => {
    const patch = createStarterPatch("firstSound");
    const result = compilePatchGraph(patch);

    expect(result.graphStatus).toBe("ready");
    expect(result.engineGraph).not.toBe(patch);
    expect(result.engineGraph.nodes.map((node) => node.atomType)).toEqual([
      "sineOscillator",
      "constant",
      "gain",
      "output",
    ]);
    expect(result.engineGraph.edges).toHaveLength(3);
  });

  test("renders audible starter patches without samples", () => {
    for (const starter of ["firstSound", "firstPercussion", "kick", "snare", "clap"] as const) {
      const result = compilePatchGraph(createStarterPatch(starter));
      const rendered = renderEngineGraph(result.engineGraph, {
        manualTrigger: true,
        sampleRate: 44100,
        seed: 808,
      });

      expect(rendered.output.peak, starter).toBeGreaterThan(0.001);
      expect(rendered.output.safetyMuted, starter).toBe(false);
    }
  });

  test("keeps broken patch visible but diagnoses why it is silent", () => {
    const result = compilePatchGraph(createStarterPatch("broken"));
    const rendered = renderEngineGraph(result.engineGraph, {
      manualTrigger: true,
      sampleRate: 44100,
      seed: 808,
    });

    expect(rendered.output.peak).toBeLessThan(0.001);
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes("Gain.gainIn"))).toBe(true);
  });

  test("lab mode preserves non-compiling edges, guided mode rejects them", () => {
    const patch = createStarterPatch("firstSound", "lab");
    const envDefinition = getAtomDefinition("decayEnvelope");
    const weirdEdge = {
      id: "weird",
      source: "sine",
      sourceHandle: "audioOut",
      target: "orphanEnv",
      targetHandle: "triggerIn",
      type: "signal" as const,
    };
    const lab = compilePatchGraph({
      ...patch,
      edges: [...patch.edges, weirdEdge],
      nodes: [
        ...patch.nodes,
        {
          data: {
            atomType: "decayEnvelope",
            params: cloneParams(envDefinition.defaultParams),
          },
          id: "orphanEnv",
          position: { x: 0, y: 0 },
          type: "atom",
        },
      ],
    });

    expect(lab.edgeDiagnostics.weird.status).toBe("needs-converter");
    expect(lab.edgeDiagnostics.weird.compiles).toBe(false);
    expect(lab.edgeDiagnostics.weird.visuallyAllowed).toBe(true);
  });

  test("rejects multiple wires into a single input", () => {
    const patch = createStarterPatch("firstSound", "lab");
    const duplicateAudioInput = {
      id: "duplicate-audio-input",
      source: "sine",
      sourceHandle: "audioOut__slot1",
      target: "gain",
      targetHandle: "audioIn",
      type: "signal" as const,
    };
    const result = compilePatchGraph({
      ...patch,
      edges: [...patch.edges, duplicateAudioInput],
    });

    expect(result.edgeDiagnostics["duplicate-audio-input"].status).toBe("invalid");
    expect(result.edgeDiagnostics["duplicate-audio-input"].reason).toContain("accepts one input");
  });

  test("limits output fan-out to visible connector slots", () => {
    const patch = createStarterPatch("kick", "lab");
    const envDefinition = getAtomDefinition("decayEnvelope");
    const withFourthTriggerTarget = {
      ...patch,
      nodes: [
        ...patch.nodes,
        {
          data: {
            atomType: "decayEnvelope",
            params: cloneParams(envDefinition.defaultParams),
          },
          id: "extraEnv",
          position: { x: 0, y: 0 },
          type: "atom" as const,
        },
      ],
    };

    expect(
      classifyConnectionForMode(withFourthTriggerTarget, "trigger", "triggerOut__slot3", "extraEnv", "triggerIn", "lab")
        .visuallyAllowed,
    ).toBe(true);

    const result = compilePatchGraph({
      ...withFourthTriggerTarget,
      edges: [
        ...withFourthTriggerTarget.edges,
        {
          id: "fourth-trigger",
          source: "trigger",
          sourceHandle: "triggerOut__slot3",
          target: "extraEnv",
          targetHandle: "triggerIn",
          type: "signal" as const,
        },
        {
          id: "fifth-trigger",
          source: "trigger",
          sourceHandle: "triggerOut__slot4",
          target: "extraEnv",
          targetHandle: "triggerIn__slot1",
          type: "signal" as const,
        },
      ],
    });

    expect(result.edgeDiagnostics["fifth-trigger"].status).toBe("invalid");
    expect(result.edgeDiagnostics["fifth-trigger"].reason).toContain("4 output slots");
  });
});
