export type TriggerEvent = {
  accent: number;
  time: number;
  velocity: number;
};

export interface Primitive {
  process(): number;
}

export interface Triggerable {
  trigger(event: TriggerEvent): void;
}

export interface Chokeable {
  choke(): void;
}

export type VoiceId =
  | "kick"
  | "snare"
  | "clap"
  | "closedHat"
  | "openHat"
  | "cowbell"
  | "tom";

export type PatchStepKind = "highpass" | "lowpass" | "saturation" | "gain";

export type SynthParameter = {
  defaultValue: number;
  id: string;
  label: string;
  max: number;
  min: number;
  step: number;
  unit?: string;
};

export type PatchStepDefinition = {
  defaultValue: number;
  id: PatchStepKind;
  label: string;
  max: number;
  min: number;
  step: number;
  unit?: string;
};

export type PatchStep = {
  amount: number;
  enabled: boolean;
  kind: PatchStepKind;
};

export type VoiceDefinition = {
  defaultSteps: PatchStep[];
  durationSeconds: number;
  id: VoiceId;
  label: string;
  parameters: SynthParameter[];
};

export type VoicePatch = {
  parameters: Record<string, number>;
  steps: PatchStep[];
  voice: VoiceId;
};

export type RenderOptions = {
  accent?: number;
  durationSeconds?: number;
  sampleRate?: number;
  seed?: number;
  velocity?: number;
};

export type RenderedVoice = {
  durationSeconds: number;
  peak: number;
  rms: number;
  sampleRate: number;
  samples: Float32Array;
};
