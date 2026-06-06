import { describe, expect, test } from "vitest";
import {
  DecayEnvelope,
  MultiPulseEnvelope,
  OnePoleHighpass,
  OnePoleLowpass,
  SineOscillator,
  saturate,
} from "./primitives";

describe("DSP primitives", () => {
  test("decay envelope starts at trigger amount and falls exponentially", () => {
    const env = new DecayEnvelope(100, 0.1);

    env.trigger(1);

    expect(env.process()).toBeCloseTo(1, 8);
    expect(env.process()).toBeLessThan(1);
    expect(env.process()).toBeGreaterThan(0);
  });

  test("sine oscillator produces a bounded cycle", () => {
    const oscillator = new SineOscillator(4);
    oscillator.frequency = 1;

    expect(oscillator.process()).toBeCloseTo(0, 8);
    expect(oscillator.process()).toBeCloseTo(1, 8);
    expect(oscillator.process()).toBeCloseTo(0, 8);
    expect(oscillator.process()).toBeCloseTo(-1, 8);
  });

  test("one-pole filters keep low and high frequency state separate", () => {
    const lowpass = new OnePoleLowpass(8, 100);
    const highpass = new OnePoleHighpass(8, 100);

    const low = Array.from({ length: 20 }, () => lowpass.process(1)).at(-1) ?? 0;
    const high = Array.from({ length: 20 }, () => highpass.process(1)).at(-1) ?? 0;

    expect(low).toBeGreaterThan(0.95);
    expect(Math.abs(high)).toBeLessThan(0.05);
  });

  test("multi-pulse envelope emits staggered bursts", () => {
    const env = new MultiPulseEnvelope(1000, [0, 0.01, 0.02], 0.003);

    env.trigger(1);

    const samples = Array.from({ length: 30 }, () => env.process());
    const localPeaks = samples.filter(
      (sample, index) => sample > 0.9 && (index === 0 || samples[index - 1] < sample),
    );

    expect(localPeaks.length).toBeGreaterThanOrEqual(3);
  });

  test("saturation remains bounded at high drive", () => {
    expect(saturate(5, 8)).toBeLessThanOrEqual(1);
    expect(saturate(-5, 8)).toBeGreaterThanOrEqual(-1);
  });
});
