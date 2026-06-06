import { describe, expect, test } from "vitest";
import { createDefaultPatch, renderVoice, voiceDefinitions } from "./voices";

describe("voice recipes", () => {
  test("every default voice renders audible bounded samples", () => {
    for (const definition of voiceDefinitions) {
      const rendered = renderVoice(createDefaultPatch(definition.id), {
        durationSeconds: 0.2,
        sampleRate: 22050,
      });

      expect(rendered.samples.length).toBe(4410);
      expect(rendered.peak, definition.label).toBeGreaterThan(0.01);
      expect(rendered.peak, definition.label).toBeLessThanOrEqual(1);
      expect(rendered.rms, definition.label).toBeGreaterThan(0.001);
    }
  });

  test("primitive chain order changes rendered output", () => {
    const patch = createDefaultPatch("kick");
    const first = renderVoice(
      {
        ...patch,
        steps: [
          { amount: 1.9, enabled: true, kind: "saturation" },
          { amount: 900, enabled: true, kind: "lowpass" },
          { amount: 0.9, enabled: true, kind: "gain" },
        ],
      },
      { durationSeconds: 0.3, sampleRate: 22050, seed: 808 },
    );
    const second = renderVoice(
      {
        ...patch,
        steps: [
          { amount: 900, enabled: true, kind: "lowpass" },
          { amount: 1.9, enabled: true, kind: "saturation" },
          { amount: 0.9, enabled: true, kind: "gain" },
        ],
      },
      { durationSeconds: 0.3, sampleRate: 22050, seed: 808 },
    );
    let totalDifference = 0;

    for (let index = 0; index < first.samples.length; index += 1) {
      totalDifference += Math.abs(first.samples[index] - second.samples[index]);
    }

    expect(totalDifference).toBeGreaterThan(0.5);
  });
});
