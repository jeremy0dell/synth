import { cloneParams, getAtomDefinition } from "../../../dsp/atoms";
import type { PatchGraph } from "../types";

export function serializePatch(patch: PatchGraph) {
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

export function deserializePatch(value: unknown): PatchGraph {
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
