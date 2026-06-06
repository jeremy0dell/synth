import type { Chokeable, TriggerEvent, Triggerable } from "./types";

const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function seededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export class DecayEnvelope {
  private coeff = 0;
  private value = 0;

  constructor(
    private readonly sampleRate: number,
    decaySeconds: number,
  ) {
    this.setDecaySeconds(decaySeconds);
  }

  forceToZeroQuickly() {
    this.value = 0;
  }

  get current() {
    return this.value;
  }

  process() {
    const out = this.value;
    this.value *= this.coeff;
    if (this.value < 1e-7) {
      this.value = 0;
    }
    return out;
  }

  setDecaySeconds(decaySeconds: number) {
    const safeDecay = Math.max(0.001, decaySeconds);
    this.coeff = Math.exp(-1 / (safeDecay * this.sampleRate));
  }

  trigger(amount = 1) {
    this.value = amount;
  }
}

export class AttackDecayEnvelope {
  private decayCoeff = 0;
  private decayValue = 0;
  private readonly attackSamples: number;
  private attackPosition = 0;

  constructor(
    private readonly sampleRate: number,
    attackSeconds: number,
    decaySeconds: number,
  ) {
    this.attackSamples = Math.max(1, Math.round(attackSeconds * sampleRate));
    this.setDecaySeconds(decaySeconds);
  }

  process() {
    if (this.attackPosition < this.attackSamples) {
      this.attackPosition += 1;
      return this.attackPosition / this.attackSamples;
    }

    const out = this.decayValue;
    this.decayValue *= this.decayCoeff;
    if (this.decayValue < 1e-7) {
      this.decayValue = 0;
    }
    return out;
  }

  setDecaySeconds(decaySeconds: number) {
    const safeDecay = Math.max(0.001, decaySeconds);
    this.decayCoeff = Math.exp(-1 / (safeDecay * this.sampleRate));
  }

  trigger(amount = 1) {
    this.attackPosition = 0;
    this.decayValue = amount;
  }
}

export class MultiPulseEnvelope {
  private coeff = 0;
  private nextPulse = 0;
  private position = 0;
  private pulseSamples: number[];
  private triggerAmount = 0;
  private value = 0;

  constructor(
    private readonly sampleRate: number,
    pulseTimesSeconds: number[],
    decaySeconds: number,
  ) {
    this.pulseSamples = pulseTimesSeconds.map((seconds) =>
      Math.max(0, Math.round(seconds * sampleRate)),
    );
    this.setDecaySeconds(decaySeconds);
  }

  process() {
    while (
      this.nextPulse < this.pulseSamples.length &&
      this.position >= this.pulseSamples[this.nextPulse]
    ) {
      this.value += this.triggerAmount;
      this.nextPulse += 1;
    }

    const out = this.value;
    this.value *= this.coeff;
    this.position += 1;
    if (this.value < 1e-7) {
      this.value = 0;
    }
    return out;
  }

  setDecaySeconds(decaySeconds: number) {
    const safeDecay = Math.max(0.001, decaySeconds);
    this.coeff = Math.exp(-1 / (safeDecay * this.sampleRate));
  }

  trigger(amount = 1) {
    this.position = 0;
    this.nextPulse = 0;
    this.value = 0;
    this.triggerAmount = amount;
  }
}

export class SineOscillator {
  private phase = 0;
  frequency = 440;

  constructor(private readonly sampleRate: number) {}

  process() {
    const out = Math.sin(this.phase);
    this.advance();
    return out;
  }

  reset(phase = 0) {
    this.phase = phase;
  }

  private advance() {
    this.phase += (TAU * this.frequency) / this.sampleRate;
    while (this.phase >= TAU) {
      this.phase -= TAU;
    }
  }
}

export class SquareOscillator {
  private phase = 0;
  frequency = 440;

  constructor(private readonly sampleRate: number) {}

  process() {
    const out = this.phase < Math.PI ? 1 : -1;
    this.advance();
    return out;
  }

  reset(phase = 0) {
    this.phase = phase;
  }

  private advance() {
    this.phase += (TAU * this.frequency) / this.sampleRate;
    while (this.phase >= TAU) {
      this.phase -= TAU;
    }
  }
}

export class WhiteNoise {
  constructor(private readonly random = Math.random) {}

  process() {
    return this.random() * 2 - 1;
  }
}

export class OnePoleLowpass {
  private a = 0;
  private z = 0;

  constructor(cutoffHz: number, private readonly sampleRate: number) {
    this.setCutoff(cutoffHz);
  }

  process(input: number) {
    this.z += this.a * (input - this.z);
    return this.z;
  }

  reset(value = 0) {
    this.z = value;
  }

  setCutoff(cutoffHz: number) {
    const safeCutoff = clamp(cutoffHz, 1, this.sampleRate * 0.45);
    this.a = 1 - Math.exp((-TAU * safeCutoff) / this.sampleRate);
  }
}

export class OnePoleHighpass {
  private readonly lp: OnePoleLowpass;

  constructor(cutoffHz: number, sampleRate: number) {
    this.lp = new OnePoleLowpass(cutoffHz, sampleRate);
  }

  process(input: number) {
    return input - this.lp.process(input);
  }

  reset(value = 0) {
    this.lp.reset(value);
  }

  setCutoff(cutoffHz: number) {
    this.lp.setCutoff(cutoffHz);
  }
}

export function vca(input: number, gain: number) {
  return input * gain;
}

export function mix(...signals: number[]) {
  return signals.reduce((sum, signal) => sum + signal, 0);
}

export function mixWeighted(signals: Array<[number, number]>) {
  return signals.reduce((sum, [signal, gain]) => sum + signal * gain, 0);
}

export function softClip(input: number) {
  return Math.tanh(input);
}

export function saturate(input: number, drive = 1) {
  if (drive <= 0.001) {
    return input;
  }

  return clamp(Math.tanh(input * drive) / Math.tanh(drive), -1, 1);
}

export class Resonator {
  private amp = 0;
  private decayCoeff = 0.999;
  private phase = 0;
  frequency = 80;

  constructor(private readonly sampleRate: number, decaySeconds = 0.4) {
    this.setDecaySeconds(decaySeconds);
  }

  excite(amount = 1) {
    this.amp += amount;
  }

  process() {
    const out = Math.sin(this.phase) * this.amp;
    this.phase += (TAU * this.frequency) / this.sampleRate;
    while (this.phase >= TAU) {
      this.phase -= TAU;
    }
    this.amp *= this.decayCoeff;
    if (this.amp < 1e-7) {
      this.amp = 0;
    }
    return out;
  }

  reset(phase = 0) {
    this.phase = phase;
    this.amp = 0;
  }

  setDecaySeconds(decaySeconds: number) {
    const safeDecay = Math.max(0.001, decaySeconds);
    this.decayCoeff = Math.exp(-1 / (safeDecay * this.sampleRate));
  }
}

export class Click {
  private readonly env: DecayEnvelope;
  private readonly noise: WhiteNoise;

  constructor(sampleRate: number, random = Math.random, decaySeconds = 0.004) {
    this.env = new DecayEnvelope(sampleRate, decaySeconds);
    this.noise = new WhiteNoise(random);
  }

  process() {
    return this.noise.process() * this.env.process();
  }

  trigger(amount = 1) {
    this.env.trigger(amount);
  }
}

export class MetallicBank {
  private readonly oscillators: SquareOscillator[];

  constructor(sampleRate: number, frequencies: number[]) {
    this.oscillators = frequencies.map((frequency) => {
      const oscillator = new SquareOscillator(sampleRate);
      oscillator.frequency = frequency;
      return oscillator;
    });
  }

  process() {
    let sum = 0;

    for (const oscillator of this.oscillators) {
      sum += oscillator.process();
    }

    return sum / this.oscillators.length;
  }

  reset() {
    for (const oscillator of this.oscillators) {
      oscillator.reset();
    }
  }
}

export class ChokeGroup {
  private readonly members: Chokeable[] = [];

  add(voice: Chokeable) {
    this.members.push(voice);
  }

  chokeAllExcept(active: Chokeable) {
    for (const voice of this.members) {
      if (voice !== active) {
        voice.choke();
      }
    }
  }
}

export interface Voice extends Triggerable {
  process(): number;
  trigger(event: TriggerEvent): void;
}
