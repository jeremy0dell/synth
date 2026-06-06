import { getAtomDefinition, getPort, type PortContract, type PortDirection } from "../../../dsp/atoms";
import { baseHandleId, handleSlotIndex, portHandleId } from "../portHandles";
import type { PatchGraph, PortConnectionUsage } from "../types";

export function buildPortUsage(patch: PatchGraph) {
  const usage: Record<string, Record<string, PortConnectionUsage>> = {};

  for (const node of patch.nodes) {
    const definition = getAtomDefinition(node.data.atomType);
    usage[node.id] = Object.fromEntries(
      definition.ports.map((port) => [
        port.id,
        {
          connectionCount: 0,
          maxConnections: port.maxConnections,
          occupiedSlots: [],
        } satisfies PortConnectionUsage,
      ]),
    );
  }

  for (const edge of patch.edges) {
    registerPortUsage(usage, patch, edge.source, edge.sourceHandle, "output");
    registerPortUsage(usage, patch, edge.target, edge.targetHandle, "input");
  }

  return usage;
}

export function assignConnectionSlot(
  patch: PatchGraph,
  nodeId: string,
  handleId: string,
  direction: PortDirection,
) {
  const port = findPatchPort(patch, nodeId, handleId, direction);
  if (!port || port.maxConnections <= 1) {
    return baseHandleId(handleId);
  }

  const usage = buildPortUsage(patch)[nodeId]?.[port.id];
  const occupied = new Set(usage?.occupiedSlots ?? []);
  const requestedSlot = Math.min(handleSlotIndex(handleId), port.maxConnections - 1);

  if (!occupied.has(requestedSlot)) {
    return portHandleId(port.id, requestedSlot);
  }

  const freeSlot = firstFreeSlot(occupied, port.maxConnections);
  return portHandleId(port.id, freeSlot ?? requestedSlot);
}

export function findPatchPort(
  patch: PatchGraph,
  nodeId: string,
  handleId: string | null | undefined,
  direction: PortDirection,
): PortContract | undefined {
  const node = patch.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    return undefined;
  }

  const port = getPort(getAtomDefinition(node.data.atomType), baseHandleId(handleId));
  return port?.direction === direction ? port : undefined;
}

export function firstFreeSlot(occupiedSlots: Set<number>, slotCount: number) {
  for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
    if (!occupiedSlots.has(slotIndex)) {
      return slotIndex;
    }
  }

  return null;
}

function registerPortUsage(
  usage: Record<string, Record<string, PortConnectionUsage>>,
  patch: PatchGraph,
  nodeId: string,
  handleId: string | null | undefined,
  direction: PortDirection,
) {
  const port = findPatchPort(patch, nodeId, handleId, direction);
  if (!port) {
    return;
  }

  const entry = usage[nodeId]?.[port.id];
  if (!entry) {
    return;
  }

  entry.connectionCount += 1;
  const slotCount = Math.max(1, port.maxConnections);
  const requestedSlot = Math.min(handleSlotIndex(handleId), slotCount - 1);
  const occupied = new Set(entry.occupiedSlots);
  const slot = occupied.has(requestedSlot) ? firstFreeSlot(occupied, slotCount) : requestedSlot;

  if (slot !== null) {
    entry.occupiedSlots = [...entry.occupiedSlots, slot].sort((a, b) => a - b);
  }
}
