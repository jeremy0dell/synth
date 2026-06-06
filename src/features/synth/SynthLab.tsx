import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Play, RotateCcw, SlidersHorizontal, Volume2 } from "lucide-react";
import {
  createDefaultPatch,
  patchStepDefinitions,
  renderVoice,
  voiceDefinitions,
  type PatchStep,
  type VoiceId,
  type VoicePatch,
} from "../../dsp";
import {
  Button,
  ButtonRow,
  CompactGrid,
  Eyebrow,
  IconButton,
  PageStack,
  Panel,
  PanelHeader,
  RangeField,
  Readout,
  SegmentedControl,
  Stack,
  StatusText,
} from "../../components/ui";

const voiceOptions = voiceDefinitions.map((definition) => ({
  label: definition.label,
  value: definition.id,
}));

type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export function SynthLab() {
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>("kick");
  const [patches, setPatches] = useState<Record<VoiceId, VoicePatch>>(() =>
    Object.fromEntries(
      voiceDefinitions.map((definition) => [definition.id, createDefaultPatch(definition.id)]),
    ) as Record<VoiceId, VoicePatch>,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState("Ready");
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const patch = patches[selectedVoice];
  const definition = useMemo(
    () => voiceDefinitions.find((candidate) => candidate.id === selectedVoice) ?? voiceDefinitions[0],
    [selectedVoice],
  );
  const rendered = useMemo(() => renderVoice(patch, { sampleRate: 44100, seed: 808 }), [patch]);
  const waveformPoints = useMemo(() => buildWaveformPoints(rendered.samples), [rendered.samples]);

  useEffect(() => {
    return () => {
      stopActiveSource(sourceRef.current);
      const context = audioContextRef.current;
      if (context) {
        void context.close();
      }
    };
  }, []);

  function updateCurrentPatch(update: (patch: VoicePatch) => VoicePatch) {
    setPatches((current) => ({
      ...current,
      [selectedVoice]: update(current[selectedVoice]),
    }));
  }

  function updateParameter(parameterId: string, value: number) {
    updateCurrentPatch((current) => ({
      ...current,
      parameters: {
        ...current.parameters,
        [parameterId]: value,
      },
    }));
  }

  function updateStep(index: number, update: (step: PatchStep) => PatchStep) {
    updateCurrentPatch((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (stepIndex === index ? update(step) : step)),
    }));
  }

  function moveStep(index: number, direction: -1 | 1) {
    updateCurrentPatch((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.steps.length) {
        return current;
      }

      const steps = [...current.steps];
      const target = steps[index];
      steps[index] = steps[nextIndex];
      steps[nextIndex] = target;

      return { ...current, steps };
    });
  }

  function resetCurrentPatch() {
    setPatches((current) => ({
      ...current,
      [selectedVoice]: createDefaultPatch(selectedVoice),
    }));
  }

  async function playPatch() {
    const AudioContextConstructor =
      window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;

    if (!AudioContextConstructor) {
      setPlaybackStatus("Web Audio unavailable");
      return;
    }

    const context = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = context;

    if (context.state === "suspended") {
      await context.resume();
    }

    stopActiveSource(sourceRef.current);

    const liveRender = renderVoice(patch, {
      sampleRate: context.sampleRate,
      seed: Date.now() & 0xffff,
    });
    const buffer = context.createBuffer(1, liveRender.samples.length, context.sampleRate);
    buffer.getChannelData(0).set(liveRender.samples);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => {
      if (sourceRef.current === source) {
        sourceRef.current = null;
        setIsPlaying(false);
      }
    };
    sourceRef.current = source;
    source.start();
    setIsPlaying(true);
    setPlaybackStatus(`${definition.label} ${liveRender.durationSeconds.toFixed(2)}s`);
  }

  return (
    <PageStack>
      <Panel variant="surface">
        <PanelHeader>
          <div>
            <Eyebrow>808 Lab</Eyebrow>
            <Readout>Primitive composer</Readout>
          </div>
          <ButtonRow className="justify-end">
            <Button onClick={() => void playPatch()} type="button" variant="primary">
              <Play size={18} aria-hidden="true" />
              Play
            </Button>
            <Button onClick={resetCurrentPatch} type="button">
              <RotateCcw size={18} aria-hidden="true" />
              Reset
            </Button>
          </ButtonRow>
        </PanelHeader>

        <div className="grid gap-[var(--gs-gap-lg)] lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <Stack>
            <SegmentedControl
              ariaLabel="Voice"
              className="max-w-full flex-wrap"
              name="voice"
              onChange={setSelectedVoice}
              options={voiceOptions}
              value={selectedVoice}
            />
            <WaveformView points={waveformPoints} />
          </Stack>

          <CompactGrid className="content-start">
            <Meter label="Peak" value={rendered.peak} />
            <Meter label="RMS" value={rendered.rms} />
            <ReadoutTile label="State" value={isPlaying ? "Playing" : playbackStatus} />
          </CompactGrid>
        </div>
      </Panel>

      <div className="grid gap-[var(--gs-gap-lg)] xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Panel className="content-start">
          <PanelHeader>
            <div>
              <Eyebrow>Voice Recipe</Eyebrow>
              <Readout as="h3">{definition.label}</Readout>
            </div>
            <Volume2 className="mt-1 text-[var(--gs-text-muted)]" size={22} aria-hidden="true" />
          </PanelHeader>

          <div className="grid gap-[var(--gs-gap-md)] md:grid-cols-2">
            {definition.parameters.map((parameter) => (
              <RangeField
                key={parameter.id}
                label={`${parameter.label} ${formatValue(
                  patch.parameters[parameter.id] ?? parameter.defaultValue,
                  parameter.unit,
                )}`}
                max={parameter.max}
                min={parameter.min}
                onChange={(event) => updateParameter(parameter.id, event.currentTarget.valueAsNumber)}
                step={parameter.step}
                value={patch.parameters[parameter.id] ?? parameter.defaultValue}
              />
            ))}
          </div>
        </Panel>

        <Panel className="content-start">
          <PanelHeader>
            <div>
              <Eyebrow>Primitive Chain</Eyebrow>
              <Readout as="h3">Order and amount</Readout>
            </div>
            <SlidersHorizontal
              className="mt-1 text-[var(--gs-text-muted)]"
              size={22}
              aria-hidden="true"
            />
          </PanelHeader>

          <ol className="grid divide-y divide-[var(--gs-border-subtle)]">
            {patch.steps.map((step, index) => (
              <li className="grid gap-3 py-3 first:pt-0 last:pb-0" key={`${step.kind}-${index}`}>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex min-h-8 items-center gap-2 text-sm font-bold text-[var(--gs-heading)]">
                    <input
                      checked={step.enabled}
                      className="size-4 accent-[var(--gs-accent)]"
                      onChange={(event) =>
                        updateStep(index, (current) => ({
                          ...current,
                          enabled: event.currentTarget.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    {patchStepDefinitions[step.kind].label}
                  </label>
                  <ButtonRow>
                    <IconButton
                      disabled={index === 0}
                      label={`Move ${patchStepDefinitions[step.kind].label} up`}
                      onClick={() => moveStep(index, -1)}
                      type="button"
                    >
                      <ArrowUp size={16} aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      disabled={index === patch.steps.length - 1}
                      label={`Move ${patchStepDefinitions[step.kind].label} down`}
                      onClick={() => moveStep(index, 1)}
                      type="button"
                    >
                      <ArrowDown size={16} aria-hidden="true" />
                    </IconButton>
                  </ButtonRow>
                </div>

                <RangeField
                  disabled={!step.enabled}
                  label={`${patchStepDefinitions[step.kind].label} ${formatValue(
                    step.amount,
                    patchStepDefinitions[step.kind].unit,
                  )}`}
                  max={patchStepDefinitions[step.kind].max}
                  min={patchStepDefinitions[step.kind].min}
                  onChange={(event) =>
                    updateStep(index, (current) => ({
                      ...current,
                      amount: event.currentTarget.valueAsNumber,
                    }))
                  }
                  step={patchStepDefinitions[step.kind].step}
                  value={step.amount}
                />
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Panel variant="editor">
        <PanelHeader>
          <div>
            <Eyebrow>Render</Eyebrow>
            <Readout as="h3">Sample buffer</Readout>
          </div>
          <StatusText variant="meta">
            {rendered.samples.length.toLocaleString()} samples at {rendered.sampleRate.toLocaleString()} Hz
          </StatusText>
        </PanelHeader>
        <div className="grid gap-[var(--gs-gap-sm)] text-sm text-[var(--gs-text-muted)] sm:grid-cols-3">
          <span>Duration {rendered.durationSeconds.toFixed(2)}s</span>
          <span>Peak {rendered.peak.toFixed(3)}</span>
          <span>RMS {rendered.rms.toFixed(3)}</span>
        </div>
      </Panel>
    </PageStack>
  );
}

function WaveformView({ points }: { points: string }) {
  return (
    <div className="min-h-48 overflow-hidden rounded-[var(--gs-radius-md)] border border-[var(--gs-panel-border)] bg-[var(--gs-page-chrome)]">
      <svg
        aria-label="Rendered waveform"
        className="block h-48 w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 720 180"
      >
        <line
          stroke="var(--gs-border)"
          strokeDasharray="4 8"
          strokeWidth="1"
          x1="0"
          x2="720"
          y1="90"
          y2="90"
        />
        <polyline
          fill="none"
          points={points}
          stroke="var(--gs-accent)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const percent = Math.round(clampPercent(value) * 100);

  return (
    <div className="grid content-start gap-2 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] p-3">
      <span className="text-xs font-black uppercase leading-none text-[var(--gs-text-muted)]">
        {label}
      </span>
      <span className="text-2xl font-bold leading-none text-[var(--gs-heading)]">
        {value.toFixed(3)}
      </span>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--gs-surface-muted)]">
        <div
          className="h-full rounded-full bg-[var(--gs-accent)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ReadoutTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid content-start gap-2 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] p-3">
      <span className="text-xs font-black uppercase leading-none text-[var(--gs-text-muted)]">
        {label}
      </span>
      <span className="text-lg font-bold leading-tight text-[var(--gs-heading)]">{value}</span>
    </div>
  );
}

function buildWaveformPoints(samples: Float32Array) {
  const width = 720;
  const height = 180;
  const center = height / 2;
  const pointCount = 360;
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

function formatValue(value: number, unit?: string) {
  if (unit === "Hz") {
    return `${Math.round(value)} Hz`;
  }

  if (unit === "s") {
    return `${value < 0.1 ? value.toFixed(3) : value.toFixed(2)}s`;
  }

  if (Math.abs(value) < 2) {
    return value.toFixed(2);
  }

  return value.toFixed(1);
}

function clampPercent(value: number) {
  return Math.min(1, Math.max(0, value));
}

function stopActiveSource(source: AudioBufferSourceNode | null) {
  if (!source) {
    return;
  }

  try {
    source.stop();
  } catch {
    // Already ended.
  }
}
