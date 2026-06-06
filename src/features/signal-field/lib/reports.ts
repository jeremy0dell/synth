import { getAtomDefinition } from "../../../dsp/atoms";
import { baseHandleId } from "../portHandles";
import type { CompileResult, PatchGraph, RenderedPatch } from "../types";

export function buildPatchExplanation(patch: PatchGraph, compileResult: CompileResult) {
  const compilingEdges = patch.edges.filter((edge) => compileResult.edgeDiagnostics[edge.id]?.compiles);
  const lines = [`${patch.metadata.title}`, "", "This patch compiles because:"];

  for (const edge of compilingEdges) {
    const source = patch.nodes.find((node) => node.id === edge.source);
    const target = patch.nodes.find((node) => node.id === edge.target);
    if (!source || !target) {
      continue;
    }
    lines.push(
      `- ${getAtomDefinition(source.data.atomType).displayName}.${baseHandleId(edge.sourceHandle)} feeds ${getAtomDefinition(target.data.atomType).displayName}.${baseHandleId(edge.targetHandle)}.`,
    );
  }

  if (compilingEdges.length === 0) {
    lines.push("- No wires currently compile into an audible Output path.");
  }

  return lines.join("\n");
}

export function buildNoSoundReport(compileResult: CompileResult, runtime: RenderedPatch) {
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
