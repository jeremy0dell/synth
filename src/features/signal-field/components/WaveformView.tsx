import { useMemo } from "react";

export function WaveformView({ samples }: { samples: Float32Array }) {
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
