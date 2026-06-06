export function stopActiveSource(source: AudioBufferSourceNode | null) {
  if (!source) {
    return;
  }

  try {
    source.stop();
  } catch {
    // Source may have already ended.
  }
}
