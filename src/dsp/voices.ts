import {
  Click,
  DecayEnvelope,
  MetallicBank,
  MultiPulseEnvelope,
  OnePoleHighpass,
  OnePoleLowpass,
  Resonator,
  SineOscillator,
  SquareOscillator,
  WhiteNoise,
  clamp,
  mixWeighted,
  saturate,
  seededRandom,
  type Voice,
} from "./primitives";
import type {
  PatchStep,
  PatchStepDefinition,
  PatchStepKind,
  RenderOptions,
  RenderedVoice,
  TriggerEvent,
  VoiceDefinition,
  VoiceId,
  VoicePatch,
} from "./types";

export const patchStepDefinitions: Record<PatchStepKind, PatchStepDefinition> = {
  gain: {
    defaultValue: 0.9,
    id: "gain",
    label: "Output gain",
    max: 1.5,
    min: 0,
    step: 0.01,
  },
  highpass: {
    defaultValue: 40,
    id: "highpass",
    label: "High-pass",
    max: 9000,
    min: 20,
    step: 10,
    unit: "Hz",
  },
  lowpass: {
    defaultValue: 12000,
    id: "lowpass",
    label: "Low-pass",
    max: 18000,
    min: 300,
    step: 10,
    unit: "Hz",
  },
  saturation: {
    defaultValue: 1.2,
    id: "saturation",
    label: "Saturation",
    max: 8,
    min: 0.2,
    step: 0.1,
  },
};

export const voiceDefinitions: VoiceDefinition[] = [
  {
    defaultSteps: [
      { amount: 7800, enabled: true, kind: "lowpass" },
      { amount: 1.45, enabled: true, kind: "saturation" },
      { amount: 0.95, enabled: true, kind: "gain" },
      { amount: 30, enabled: false, kind: "highpass" },
    ],
    durationSeconds: 1.25,
    id: "kick",
    label: "Kick",
    parameters: [
      { defaultValue: 55, id: "tune", label: "Tune", max: 90, min: 35, step: 1, unit: "Hz" },
      { defaultValue: 0.72, id: "decay", label: "Body decay", max: 1.4, min: 0.08, step: 0.01, unit: "s" },
      { defaultValue: 112, id: "pitchDrop", label: "Pitch drop", max: 240, min: 0, step: 1, unit: "Hz" },
      { defaultValue: 0.18, id: "click", label: "Click", max: 0.6, min: 0, step: 0.01 },
      { defaultValue: 1.15, id: "punch", label: "Punch", max: 2.5, min: 0.2, step: 0.01 },
    ],
  },
  {
    defaultSteps: [
      { amount: 780, enabled: true, kind: "highpass" },
      { amount: 9300, enabled: true, kind: "lowpass" },
      { amount: 1.25, enabled: true, kind: "saturation" },
      { amount: 0.82, enabled: true, kind: "gain" },
    ],
    durationSeconds: 0.95,
    id: "snare",
    label: "Snare",
    parameters: [
      { defaultValue: 180, id: "tune", label: "Tone tune", max: 330, min: 110, step: 1, unit: "Hz" },
      { defaultValue: 0.32, id: "tone", label: "Tone", max: 1, min: 0, step: 0.01 },
      { defaultValue: 0.72, id: "snap", label: "Snap", max: 1.2, min: 0, step: 0.01 },
      { defaultValue: 0.32, id: "decay", label: "Tone decay", max: 0.9, min: 0.04, step: 0.01, unit: "s" },
      { defaultValue: 0.22, id: "noiseDecay", label: "Wire decay", max: 0.8, min: 0.03, step: 0.01, unit: "s" },
    ],
  },
  {
    defaultSteps: [
      { amount: 900, enabled: true, kind: "highpass" },
      { amount: 7600, enabled: true, kind: "lowpass" },
      { amount: 1.15, enabled: true, kind: "saturation" },
      { amount: 0.9, enabled: true, kind: "gain" },
    ],
    durationSeconds: 0.9,
    id: "clap",
    label: "Clap",
    parameters: [
      { defaultValue: 0.012, id: "spread", label: "Burst spread", max: 0.03, min: 0.004, step: 0.001, unit: "s" },
      { defaultValue: 0.52, id: "burst", label: "Burst", max: 1, min: 0, step: 0.01 },
      { defaultValue: 0.38, id: "tail", label: "Tail", max: 1, min: 0, step: 0.01 },
      { defaultValue: 0.52, id: "color", label: "Color", max: 1, min: 0, step: 0.01 },
    ],
  },
  {
    defaultSteps: [
      { amount: 5200, enabled: true, kind: "highpass" },
      { amount: 14500, enabled: true, kind: "lowpass" },
      { amount: 1.05, enabled: true, kind: "saturation" },
      { amount: 0.66, enabled: true, kind: "gain" },
    ],
    durationSeconds: 0.42,
    id: "closedHat",
    label: "Closed hat",
    parameters: [
      { defaultValue: 1, id: "tune", label: "Tune", max: 1.35, min: 0.7, step: 0.01 },
      { defaultValue: 0.065, id: "decay", label: "Decay", max: 0.24, min: 0.015, step: 0.001, unit: "s" },
      { defaultValue: 0.88, id: "metallic", label: "Metallic", max: 1, min: 0, step: 0.01 },
      { defaultValue: 0.76, id: "bite", label: "Bite", max: 1, min: 0, step: 0.01 },
    ],
  },
  {
    defaultSteps: [
      { amount: 4600, enabled: true, kind: "highpass" },
      { amount: 15000, enabled: true, kind: "lowpass" },
      { amount: 1.05, enabled: true, kind: "saturation" },
      { amount: 0.62, enabled: true, kind: "gain" },
    ],
    durationSeconds: 1.35,
    id: "openHat",
    label: "Open hat",
    parameters: [
      { defaultValue: 1, id: "tune", label: "Tune", max: 1.35, min: 0.7, step: 0.01 },
      { defaultValue: 0.62, id: "decay", label: "Decay", max: 1.4, min: 0.08, step: 0.01, unit: "s" },
      { defaultValue: 0.85, id: "metallic", label: "Metallic", max: 1, min: 0, step: 0.01 },
      { defaultValue: 0.68, id: "bite", label: "Bite", max: 1, min: 0, step: 0.01 },
    ],
  },
  {
    defaultSteps: [
      { amount: 520, enabled: true, kind: "highpass" },
      { amount: 6900, enabled: true, kind: "lowpass" },
      { amount: 1.8, enabled: true, kind: "saturation" },
      { amount: 0.78, enabled: true, kind: "gain" },
    ],
    durationSeconds: 0.62,
    id: "cowbell",
    label: "Cowbell",
    parameters: [
      { defaultValue: 540, id: "tune", label: "Tune", max: 840, min: 280, step: 1, unit: "Hz" },
      { defaultValue: 0.26, id: "decay", label: "Decay", max: 0.8, min: 0.04, step: 0.01, unit: "s" },
      { defaultValue: 0.58, id: "balance", label: "Osc balance", max: 1, min: 0, step: 0.01 },
      { defaultValue: 0.72, id: "clang", label: "Clang", max: 1.5, min: 0.1, step: 0.01 },
    ],
  },
  {
    defaultSteps: [
      { amount: 5200, enabled: true, kind: "lowpass" },
      { amount: 1.25, enabled: true, kind: "saturation" },
      { amount: 0.88, enabled: true, kind: "gain" },
      { amount: 35, enabled: false, kind: "highpass" },
    ],
    durationSeconds: 0.95,
    id: "tom",
    label: "Tom",
    parameters: [
      { defaultValue: 118, id: "tune", label: "Tune", max: 240, min: 55, step: 1, unit: "Hz" },
      { defaultValue: 0.46, id: "decay", label: "Decay", max: 1.2, min: 0.06, step: 0.01, unit: "s" },
      { defaultValue: 32, id: "pitchDrop", label: "Pitch drop", max: 120, min: 0, step: 1, unit: "Hz" },
      { defaultValue: 0.08, id: "attack", label: "Attack", max: 0.4, min: 0, step: 0.01 },
    ],
  },
];

export function createDefaultPatch(voice: VoiceId): VoicePatch {
  const definition = getVoiceDefinition(voice);

  return {
    parameters: Object.fromEntries(
      definition.parameters.map((parameter) => [parameter.id, parameter.defaultValue]),
    ),
    steps: definition.defaultSteps.map((step) => ({ ...step })),
    voice,
  };
}

export function getVoiceDefinition(voice: VoiceId) {
  const definition = voiceDefinitions.find((candidate) => candidate.id === voice);

  if (!definition) {
    throw new Error(`Unknown voice: ${voice}`);
  }

  return definition;
}

export function renderVoice(patch: VoicePatch, options: RenderOptions = {}): RenderedVoice {
  const definition = getVoiceDefinition(patch.voice);
  const sampleRate = options.sampleRate ?? 44100;
  const durationSeconds = options.durationSeconds ?? definition.durationSeconds;
  const totalSamples = Math.max(1, Math.round(durationSeconds * sampleRate));
  const samples = new Float32Array(totalSamples);
  const random = seededRandom(options.seed ?? seedForVoice(patch.voice));
  const voice = createVoice(patch, sampleRate, random);
  const processors = patch.steps.map((step) => createStepProcessor(step, sampleRate));
  const event: TriggerEvent = {
    accent: options.accent ?? 1,
    time: 0,
    velocity: options.velocity ?? 1,
  };
  let peak = 0;
  let sumSquares = 0;

  voice.trigger(event);

  for (let index = 0; index < totalSamples; index += 1) {
    let sample = voice.process();

    for (const processor of processors) {
      sample = processor(sample);
    }

    sample = clamp(sample, -1, 1);
    samples[index] = sample;
    peak = Math.max(peak, Math.abs(sample));
    sumSquares += sample * sample;
  }

  return {
    durationSeconds,
    peak,
    rms: Math.sqrt(sumSquares / totalSamples),
    sampleRate,
    samples,
  };
}

function createStepProcessor(step: PatchStep, sampleRate: number) {
  if (!step.enabled) {
    return (input: number) => input;
  }

  switch (step.kind) {
    case "gain":
      return (input: number) => input * step.amount;
    case "highpass": {
      const filter = new OnePoleHighpass(step.amount, sampleRate);
      return (input: number) => filter.process(input);
    }
    case "lowpass": {
      const filter = new OnePoleLowpass(step.amount, sampleRate);
      return (input: number) => filter.process(input);
    }
    case "saturation":
      return (input: number) => saturate(input, step.amount);
  }
}

function createVoice(patch: VoicePatch, sampleRate: number, random: () => number): Voice {
  const value = (id: string) => getParameterValue(patch, id);

  switch (patch.voice) {
    case "kick":
      return new KickVoice(sampleRate, {
        click: value("click"),
        decay: value("decay"),
        pitchDrop: value("pitchDrop"),
        punch: value("punch"),
        tune: value("tune"),
      }, random);
    case "snare":
      return new SnareVoice(sampleRate, {
        decay: value("decay"),
        noiseDecay: value("noiseDecay"),
        snap: value("snap"),
        tone: value("tone"),
        tune: value("tune"),
      }, random);
    case "clap":
      return new ClapVoice(sampleRate, {
        burst: value("burst"),
        color: value("color"),
        spread: value("spread"),
        tail: value("tail"),
      }, random);
    case "closedHat":
      return new HatVoice(sampleRate, {
        bite: value("bite"),
        decay: value("decay"),
        metallic: value("metallic"),
        open: false,
        tune: value("tune"),
      }, random);
    case "openHat":
      return new HatVoice(sampleRate, {
        bite: value("bite"),
        decay: value("decay"),
        metallic: value("metallic"),
        open: true,
        tune: value("tune"),
      }, random);
    case "cowbell":
      return new CowbellVoice(sampleRate, {
        balance: value("balance"),
        clang: value("clang"),
        decay: value("decay"),
        tune: value("tune"),
      });
    case "tom":
      return new TomVoice(sampleRate, {
        attack: value("attack"),
        decay: value("decay"),
        pitchDrop: value("pitchDrop"),
        tune: value("tune"),
      });
  }
}

function getParameterValue(patch: VoicePatch, id: string) {
  const definition = getVoiceDefinition(patch.voice);
  const parameter = definition.parameters.find((candidate) => candidate.id === id);

  if (!parameter) {
    return 0;
  }

  return patch.parameters[id] ?? parameter.defaultValue;
}

function seedForVoice(voice: VoiceId) {
  return Array.from(voice).reduce((sum, char) => sum + char.charCodeAt(0), 808);
}

class KickVoice implements Voice {
  private readonly amp: DecayEnvelope;
  private readonly body: SineOscillator;
  private readonly click: Click;
  private readonly pitch: DecayEnvelope;

  constructor(
    sampleRate: number,
    private readonly settings: {
      click: number;
      decay: number;
      pitchDrop: number;
      punch: number;
      tune: number;
    },
    random: () => number,
  ) {
    this.amp = new DecayEnvelope(sampleRate, settings.decay);
    this.body = new SineOscillator(sampleRate);
    this.click = new Click(sampleRate, random, 0.004);
    this.pitch = new DecayEnvelope(sampleRate, 0.055);
  }

  process() {
    const pitchAmount = this.pitch.process();
    this.body.frequency = this.settings.tune + pitchAmount * this.settings.pitchDrop;

    const body = this.body.process() * this.amp.process() * 0.96;
    const transient = this.click.process();

    return saturate((body + transient) * this.settings.punch, 1.15);
  }

  trigger(event: TriggerEvent) {
    this.body.reset();
    this.amp.trigger(event.velocity * event.accent);
    this.pitch.trigger(1);
    this.click.trigger(this.settings.click * event.accent);
  }
}

class SnareVoice implements Voice {
  private readonly noise: WhiteNoise;
  private readonly noiseEnv: DecayEnvelope;
  private readonly noiseHighpass: OnePoleHighpass;
  private readonly noiseLowpass: OnePoleLowpass;
  private readonly toneA: Resonator;
  private readonly toneB: Resonator;

  constructor(
    sampleRate: number,
    private readonly settings: {
      decay: number;
      noiseDecay: number;
      snap: number;
      tone: number;
      tune: number;
    },
    random: () => number,
  ) {
    this.noise = new WhiteNoise(random);
    this.noiseEnv = new DecayEnvelope(sampleRate, settings.noiseDecay);
    this.noiseHighpass = new OnePoleHighpass(1100, sampleRate);
    this.noiseLowpass = new OnePoleLowpass(9200, sampleRate);
    this.toneA = new Resonator(sampleRate, settings.decay);
    this.toneB = new Resonator(sampleRate, settings.decay * 0.72);
    this.toneA.frequency = settings.tune;
    this.toneB.frequency = settings.tune * 1.78;
  }

  process() {
    const tone = mixWeighted([
      [this.toneA.process(), 0.8],
      [this.toneB.process(), 0.36],
    ]) * this.settings.tone;
    const shapedNoise = this.noiseLowpass.process(this.noiseHighpass.process(this.noise.process()));
    const wire = shapedNoise * this.noiseEnv.process() * this.settings.snap;

    return tone + wire;
  }

  trigger(event: TriggerEvent) {
    this.toneA.reset();
    this.toneB.reset();
    this.toneA.excite(0.7 * event.velocity * event.accent);
    this.toneB.excite(0.48 * event.velocity * event.accent);
    this.noiseEnv.trigger(event.velocity * event.accent);
  }
}

class ClapVoice implements Voice {
  private readonly burstEnv: MultiPulseEnvelope;
  private readonly highpass: OnePoleHighpass;
  private readonly lowpass: OnePoleLowpass;
  private readonly noise: WhiteNoise;
  private readonly tailEnv: DecayEnvelope;

  constructor(
    sampleRate: number,
    private readonly settings: {
      burst: number;
      color: number;
      spread: number;
      tail: number;
    },
    random: () => number,
  ) {
    this.burstEnv = new MultiPulseEnvelope(
      sampleRate,
      [0, settings.spread, settings.spread * 2.1, settings.spread * 3.25],
      0.006,
    );
    this.highpass = new OnePoleHighpass(650 + settings.color * 1300, sampleRate);
    this.lowpass = new OnePoleLowpass(4200 + settings.color * 5400, sampleRate);
    this.noise = new WhiteNoise(random);
    this.tailEnv = new DecayEnvelope(sampleRate, 0.16 + settings.tail * 0.34);
  }

  process() {
    const shapedNoise = this.lowpass.process(this.highpass.process(this.noise.process()));
    const envelope = this.burstEnv.process() + this.tailEnv.process() * 0.52;

    return shapedNoise * envelope;
  }

  trigger(event: TriggerEvent) {
    const amount = event.velocity * event.accent;
    this.burstEnv.trigger(this.settings.burst * amount);
    this.tailEnv.trigger(this.settings.tail * amount);
  }
}

class HatVoice implements Voice {
  private readonly bank: MetallicBank;
  private readonly env: DecayEnvelope;
  private readonly highpass: OnePoleHighpass;
  private readonly noise: WhiteNoise;

  constructor(
    sampleRate: number,
    private readonly settings: {
      bite: number;
      decay: number;
      metallic: number;
      open: boolean;
      tune: number;
    },
    random: () => number,
  ) {
    const base = [2250, 3180, 4110, 5460, 6840, 8170];
    this.bank = new MetallicBank(
      sampleRate,
      base.map((frequency) => frequency * settings.tune),
    );
    this.env = new DecayEnvelope(sampleRate, settings.decay);
    this.highpass = new OnePoleHighpass(3500 + settings.bite * 3800, sampleRate);
    this.noise = new WhiteNoise(random);
  }

  choke() {
    this.env.forceToZeroQuickly();
  }

  process() {
    const metallic = this.bank.process() * this.settings.metallic;
    const air = this.noise.process() * (1 - this.settings.metallic) * 0.8;
    const shaped = this.highpass.process(metallic + air);
    const scale = this.settings.open ? 0.88 : 0.72;

    return shaped * this.env.process() * scale;
  }

  trigger(event: TriggerEvent) {
    this.bank.reset();
    this.env.trigger(event.velocity * event.accent);
  }
}

class CowbellVoice implements Voice {
  private readonly env: DecayEnvelope;
  private readonly highpass: OnePoleHighpass;
  private readonly lowpass: OnePoleLowpass;
  private readonly oscA: SquareOscillator;
  private readonly oscB: SquareOscillator;

  constructor(
    sampleRate: number,
    private readonly settings: {
      balance: number;
      clang: number;
      decay: number;
      tune: number;
    },
  ) {
    this.env = new DecayEnvelope(sampleRate, settings.decay);
    this.highpass = new OnePoleHighpass(360, sampleRate);
    this.lowpass = new OnePoleLowpass(7400, sampleRate);
    this.oscA = new SquareOscillator(sampleRate);
    this.oscB = new SquareOscillator(sampleRate);
    this.oscA.frequency = settings.tune;
    this.oscB.frequency = settings.tune * 1.48;
  }

  process() {
    const source =
      this.oscA.process() * this.settings.balance +
      this.oscB.process() * (1 - this.settings.balance);
    const shaped = this.lowpass.process(this.highpass.process(source));

    return shaped * this.env.process() * this.settings.clang;
  }

  trigger(event: TriggerEvent) {
    this.oscA.reset();
    this.oscB.reset();
    this.env.trigger(event.velocity * event.accent);
  }
}

class TomVoice implements Voice {
  private readonly amp: DecayEnvelope;
  private readonly body: SineOscillator;
  private readonly pitch: DecayEnvelope;

  constructor(
    sampleRate: number,
    private readonly settings: {
      attack: number;
      decay: number;
      pitchDrop: number;
      tune: number;
    },
  ) {
    this.amp = new DecayEnvelope(sampleRate, settings.decay);
    this.body = new SineOscillator(sampleRate);
    this.pitch = new DecayEnvelope(sampleRate, 0.075);
  }

  process() {
    const pitchAmount = this.pitch.process();
    this.body.frequency = this.settings.tune + this.settings.pitchDrop * pitchAmount;
    const transient = this.settings.attack * pitchAmount * 0.25;

    return this.body.process() * this.amp.process() + transient;
  }

  trigger(event: TriggerEvent) {
    this.body.reset();
    this.amp.trigger(event.velocity * event.accent);
    this.pitch.trigger(1);
  }
}
