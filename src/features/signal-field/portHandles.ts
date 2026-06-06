const portSlotSeparator = "__slot";

export function baseHandleId(handleId: string | null | undefined) {
  if (!handleId) {
    return "";
  }

  const slotIndex = handleId.lastIndexOf(portSlotSeparator);
  return slotIndex === -1 ? handleId : handleId.slice(0, slotIndex);
}

export function handleSlotIndex(handleId: string | null | undefined) {
  if (!handleId) {
    return 0;
  }

  const slotIndex = handleId.lastIndexOf(portSlotSeparator);
  if (slotIndex === -1) {
    return 0;
  }

  const parsed = Number(handleId.slice(slotIndex + portSlotSeparator.length));
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function portHandleId(portId: string, slotIndex: number) {
  return slotIndex <= 0 ? portId : `${portId}${portSlotSeparator}${slotIndex}`;
}

export function portKey(nodeId: string, handleId: string | null | undefined) {
  return `${nodeId}:${baseHandleId(handleId)}`;
}
