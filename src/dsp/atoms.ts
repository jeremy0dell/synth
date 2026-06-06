export type SignalDomain = "audio" | "control" | "trigger" | "parameter";
export type SignalRate = "audio-rate" | "control-rate" | "event-rate" | "static";
export type SignalUnit = "none" | "Hz" | "seconds" | "dB" | "scalar" | "boolean";
export type PortDirection = "input" | "output";
export type AtomCategory =
  | "Sources"
  | "Control"
  | "Envelopes"
  | "Math / Mapping"
  | "Shaping"
  | "Output"
  | "Inspectors";
export type MissingInputBehavior = "default" | "silence" | "diagnostic" | "idle";
export type ParamValue = boolean | number | string | number[] | boolean[];

export type PortContract = {
  accepts?: SignalDomain[];
  defaultValue?: number | boolean;
  description: string;
  direction: PortDirection;
  domain: SignalDomain;
  id: string;
  label: string;
  missingBehavior?: MissingInputBehavior;
  maxConnections: number;
  multiple: boolean;
  rate: SignalRate;
  range?: {
    max: number;
    min: number;
  };
  required: boolean;
  unit: SignalUnit;
};

export type ParamDefinition = {
  defaultValue: ParamValue;
  id: string;
  label: string;
  max?: number;
  min?: number;
  options?: Array<{ label: string; value: string }>;
  step?: number;
  type: "number" | "boolean" | "select" | "steps";
  unit?: SignalUnit;
};

export type AtomDefinition = {
  atomType: string;
  category: AtomCategory;
  defaultParams: Record<string, ParamValue>;
  defaultSize: {
    height: number;
    width: number;
  };
  description: string;
  displayName: string;
  engineKey: string;
  params: ParamDefinition[];
  ports: PortContract[];
};

type PortOptions = Partial<Omit<PortContract, "description" | "direction" | "domain" | "id" | "label" | "maxConnections" | "multiple" | "rate" | "required" | "unit">> & {
  accepts?: SignalDomain[];
  description?: string;
  maxConnections?: number;
  multiple?: boolean;
  rate?: SignalRate;
  required?: boolean;
  unit?: SignalUnit;
};

const categoryOrder: AtomCategory[] = [
  "Control",
  "Sources",
  "Envelopes",
  "Math / Mapping",
  "Shaping",
  "Output",
  "Inspectors",
];

export const domainLabels: Record<SignalDomain, string> = {
  audio: "Audio",
  control: "Control",
  parameter: "Parameter",
  trigger: "Trigger",
};

export const domainColors: Record<SignalDomain, string> = {
  audio: "var(--sf-audio)",
  control: "var(--sf-control)",
  parameter: "var(--sf-parameter)",
  trigger: "var(--sf-trigger)",
};

function output(
  id: string,
  label: string,
  domain: SignalDomain,
  options: PortOptions = {},
): PortContract {
  const maxConnections = options.maxConnections ?? (options.multiple === false ? 1 : 4);

  return {
    description: options.description ?? `${label} ${domain} output`,
    direction: "output",
    domain,
    id,
    label,
    maxConnections,
    multiple: options.multiple ?? maxConnections > 1,
    rate: options.rate ?? defaultRateForDomain(domain),
    required: options.required ?? false,
    unit: options.unit ?? defaultUnitForDomain(domain),
    ...options,
  };
}

function input(
  id: string,
  label: string,
  domain: SignalDomain,
  options: PortOptions = {},
): PortContract {
  const maxConnections = options.maxConnections ?? (options.multiple ? 4 : 1);

  return {
    accepts: options.accepts,
    defaultValue: options.defaultValue,
    description: options.description ?? `${label} ${domain} input`,
    direction: "input",
    domain,
    id,
    maxConnections,
    label,
    missingBehavior: options.missingBehavior ?? (options.required ? "diagnostic" : "default"),
    multiple: options.multiple ?? maxConnections > 1,
    rate: options.rate ?? defaultRateForDomain(domain),
    required: options.required ?? false,
    unit: options.unit ?? defaultUnitForDomain(domain),
    ...options,
  };
}

function numberParam(
  id: string,
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  unit: SignalUnit = "scalar",
): ParamDefinition {
  return {
    defaultValue,
    id,
    label,
    max,
    min,
    step,
    type: "number",
    unit,
  };
}

function booleanParam(id: string, label: string, defaultValue: boolean): ParamDefinition {
  return {
    defaultValue,
    id,
    label,
    type: "boolean",
  };
}

function selectParam(
  id: string,
  label: string,
  defaultValue: string,
  options: Array<{ label: string; value: string }>,
): ParamDefinition {
  return {
    defaultValue,
    id,
    label,
    options,
    type: "select",
  };
}

function stepsParam(id: string, label: string, defaultValue: boolean[]): ParamDefinition {
  return {
    defaultValue,
    id,
    label,
    type: "steps",
  };
}

function defineAtom(
  atomType: string,
  displayName: string,
  category: AtomCategory,
  description: string,
  ports: PortContract[],
  params: ParamDefinition[] = [],
): AtomDefinition {
  return {
    atomType,
    category,
    defaultParams: Object.fromEntries(params.map((param) => [param.id, cloneParamValue(param.defaultValue)])),
    defaultSize: {
      height: Math.max(104, 72 + Math.max(ports.length, params.length) * 22),
      width: 210,
    },
    description,
    displayName,
    engineKey: atomType,
    params,
    ports,
  };
}

export const atomDefinitions = [
  defineAtom("manualTrigger", "Manual Trigger", "Control", "Manually fires an event into envelopes, impulses, and sequencers.", [
    output("triggerOut", "Trig", "trigger", { description: "Trigger pulse emitted from the transport trigger button." }),
  ], [
    numberParam("velocity", "Velocity", 1, 0, 1, 0.01),
    numberParam("accent", "Accent", 1, 0, 2, 0.01),
  ]),
  defineAtom("clock", "Clock", "Control", "Periodic trigger source with a phase output.", [
    output("triggerOut", "Trig", "trigger"),
    output("phaseOut", "Phase", "control", { range: { min: 0, max: 1 } }),
  ], [
    numberParam("bpm", "BPM", 120, 20, 260, 1),
    selectParam("division", "Division", "1/4", [
      { label: "1/4", value: "1/4" },
      { label: "1/8", value: "1/8" },
      { label: "1/16", value: "1/16" },
    ]),
    booleanParam("running", "Run", true),
  ]),
  defineAtom("stepSequencer", "Step Sequencer", "Control", "Sixteen-step trigger pattern driven by a clock.", [
    input("clockIn", "Clock", "trigger", { missingBehavior: "idle" }),
    input("resetIn", "Reset", "trigger", { missingBehavior: "idle" }),
    output("triggerOut", "Trig", "trigger"),
    output("accentOut", "Accent", "control", { unit: "scalar" }),
  ], [
    stepsParam("steps", "Steps", [true, false, false, false, true, false, true, false, true, false, false, true, false, false, true, false]),
    numberParam("accent", "Accent", 1.2, 0, 2, 0.01),
  ]),
  defineAtom("triggerDelay", "Trigger Delay", "Control", "Delays trigger events by a parameterized time.", [
    input("triggerIn", "Trig", "trigger", { required: true }),
    input("delayTimeIn", "Time", "parameter", { accepts: ["control", "parameter"], defaultValue: 0.02, unit: "seconds" }),
    output("triggerOut", "Trig", "trigger"),
  ], [
    numberParam("delayTime", "Delay", 0.02, 0, 0.3, 0.001, "seconds"),
  ]),
  defineAtom("triggerSplitter", "Trigger Splitter", "Control", "Fans one trigger into four explicit outputs.", [
    input("triggerIn", "Trig", "trigger", { required: true }),
    output("triggerOutA", "A", "trigger"),
    output("triggerOutB", "B", "trigger"),
    output("triggerOutC", "C", "trigger"),
    output("triggerOutD", "D", "trigger"),
  ]),
  defineAtom("sineOscillator", "Sine Oscillator", "Sources", "Audio-rate sine source with frequency, reset, and FM inputs.", [
    input("frequencyIn", "Freq", "parameter", { accepts: ["control", "parameter"], defaultValue: 55, unit: "Hz" }),
    input("phaseResetIn", "Reset", "trigger", { missingBehavior: "idle" }),
    input("fmIn", "FM", "audio", { accepts: ["audio", "control"], missingBehavior: "default" }),
    output("audioOut", "Audio", "audio"),
  ], [
    numberParam("frequency", "Frequency", 55, 0.1, 12000, 1, "Hz"),
    numberParam("fmAmount", "FM Amount", 0, 0, 2000, 1, "Hz"),
  ]),
  defineAtom("squareOscillator", "Square Oscillator", "Sources", "Audio-rate pulse source with optional pulse width modulation.", [
    input("frequencyIn", "Freq", "parameter", { accepts: ["control", "parameter"], defaultValue: 110, unit: "Hz" }),
    input("phaseResetIn", "Reset", "trigger", { missingBehavior: "idle" }),
    input("pulseWidthIn", "Width", "parameter", { accepts: ["control", "parameter"], defaultValue: 0.5 }),
    output("audioOut", "Audio", "audio"),
  ], [
    numberParam("frequency", "Frequency", 110, 0.1, 12000, 1, "Hz"),
    numberParam("pulseWidth", "Pulse Width", 0.5, 0.05, 0.95, 0.01),
  ]),
  defineAtom("noise", "Noise", "Sources", "White noise source.", [
    output("audioOut", "Audio", "audio"),
  ], [
    selectParam("type", "Type", "white", [{ label: "White", value: "white" }]),
    numberParam("level", "Level", 0.8, 0, 1.5, 0.01),
  ]),
  defineAtom("impulse", "Impulse", "Sources", "Short click emitted when triggered.", [
    input("triggerIn", "Trig", "trigger", { required: true, missingBehavior: "idle" }),
    output("audioOut", "Audio", "audio"),
  ], [
    numberParam("amplitude", "Amplitude", 0.35, 0, 1.5, 0.01),
    numberParam("duration", "Duration", 0.003, 0.001, 0.03, 0.001, "seconds"),
  ]),
  defineAtom("constant", "Constant", "Sources", "Static value source for parameters and controls.", [
    output("valueOut", "Value", "parameter", { unit: "scalar" }),
  ], [
    numberParam("value", "Value", 0.35, -2, 2, 0.01),
    selectParam("unit", "Unit", "scalar", [
      { label: "Scalar", value: "scalar" },
      { label: "Hz", value: "Hz" },
      { label: "Seconds", value: "seconds" },
    ]),
  ]),
  defineAtom("decayEnvelope", "Decay Envelope", "Envelopes", "Trigger-started exponential decay control signal.", [
    input("triggerIn", "Trig", "trigger", { required: true, missingBehavior: "idle" }),
    input("amountIn", "Amount", "parameter", { accepts: ["control", "parameter"], defaultValue: 1 }),
    input("decayIn", "Decay", "parameter", { accepts: ["control", "parameter"], defaultValue: 0.28, unit: "seconds" }),
    output("controlOut", "Env", "control", { range: { min: 0, max: 1 } }),
  ], [
    numberParam("amount", "Amount", 1, 0, 2, 0.01),
    numberParam("decay", "Decay", 0.28, 0.005, 2, 0.001, "seconds"),
    selectParam("curve", "Curve", "exp", [
      { label: "Exp", value: "exp" },
      { label: "Linear", value: "linear" },
    ]),
  ]),
  defineAtom("attackDecayEnvelope", "Attack/Decay Envelope", "Envelopes", "Trigger-started attack and decay envelope.", [
    input("triggerIn", "Trig", "trigger", { required: true, missingBehavior: "idle" }),
    input("attackIn", "Attack", "parameter", { accepts: ["control", "parameter"], defaultValue: 0.004, unit: "seconds" }),
    input("decayIn", "Decay", "parameter", { accepts: ["control", "parameter"], defaultValue: 0.25, unit: "seconds" }),
    input("amountIn", "Amount", "parameter", { accepts: ["control", "parameter"], defaultValue: 1 }),
    output("controlOut", "Env", "control"),
  ], [
    numberParam("attack", "Attack", 0.004, 0, 0.2, 0.001, "seconds"),
    numberParam("decay", "Decay", 0.25, 0.005, 2, 0.001, "seconds"),
    numberParam("amount", "Amount", 1, 0, 2, 0.01),
  ]),
  defineAtom("multiPulseEnvelope", "Multi-Pulse Envelope", "Envelopes", "Clap-like burst envelope followed by a tail.", [
    input("triggerIn", "Trig", "trigger", { required: true, missingBehavior: "idle" }),
    input("spacingIn", "Spacing", "parameter", { accepts: ["control", "parameter"], defaultValue: 0.014, unit: "seconds" }),
    input("decayIn", "Decay", "parameter", { accepts: ["control", "parameter"], defaultValue: 0.28, unit: "seconds" }),
    output("controlOut", "Env", "control"),
  ], [
    numberParam("pulseCount", "Pulses", 4, 1, 8, 1),
    numberParam("spacing", "Spacing", 0.014, 0.004, 0.04, 0.001, "seconds"),
    numberParam("tailDecay", "Tail", 0.28, 0.04, 1.2, 0.001, "seconds"),
    numberParam("amount", "Amount", 1, 0, 2, 0.01),
  ]),
  defineAtom("mapRange", "Map Range", "Math / Mapping", "Maps a control or parameter range into another range.", [
    input("input", "In", "control", { accepts: ["control", "parameter"], required: true }),
    input("outMinIn", "Min", "parameter", { accepts: ["control", "parameter"], defaultValue: 55 }),
    input("outMaxIn", "Max", "parameter", { accepts: ["control", "parameter"], defaultValue: 160 }),
    output("output", "Out", "parameter", { unit: "Hz" }),
  ], [
    numberParam("inputMin", "Input Min", 0, -1, 1, 0.01),
    numberParam("inputMax", "Input Max", 1, -1, 2, 0.01),
    numberParam("outputMin", "Output Min", 55, 0, 12000, 1, "Hz"),
    numberParam("outputMax", "Output Max", 160, 0, 12000, 1, "Hz"),
    selectParam("outputUnit", "Unit", "Hz", [
      { label: "Hz", value: "Hz" },
      { label: "Scalar", value: "scalar" },
      { label: "Seconds", value: "seconds" },
    ]),
  ]),
  defineAtom("add", "Add", "Math / Mapping", "Adds two control or parameter values.", [
    input("a", "A", "control", { accepts: ["control", "parameter"], defaultValue: 0 }),
    input("b", "B", "control", { accepts: ["control", "parameter"], defaultValue: 0 }),
    output("out", "Out", "control"),
  ]),
  defineAtom("multiply", "Multiply", "Math / Mapping", "Multiplies two controls, parameters, or audio/control pairs.", [
    input("a", "A", "control", { accepts: ["audio", "control", "parameter"], defaultValue: 1 }),
    input("b", "B", "control", { accepts: ["audio", "control", "parameter"], defaultValue: 1 }),
    output("out", "Out", "control"),
  ]),
  defineAtom("clamp", "Clamp", "Math / Mapping", "Constrains a control value between min and max.", [
    input("input", "In", "control", { accepts: ["control", "parameter"], required: true }),
    input("min", "Min", "parameter", { accepts: ["control", "parameter"], defaultValue: 0 }),
    input("max", "Max", "parameter", { accepts: ["control", "parameter"], defaultValue: 1 }),
    output("output", "Out", "control"),
  ]),
  defineAtom("invert", "Invert", "Math / Mapping", "Inverts a control around zero.", [
    input("input", "In", "control", { accepts: ["control", "parameter"], required: true }),
    output("output", "Out", "control"),
  ]),
  defineAtom("slew", "Smooth / Slew", "Math / Mapping", "Smooths abrupt control changes.", [
    input("input", "In", "control", { accepts: ["control", "parameter"], required: true }),
    input("timeIn", "Time", "parameter", { accepts: ["control", "parameter"], defaultValue: 0.025, unit: "seconds" }),
    output("output", "Out", "control"),
  ], [
    numberParam("time", "Time", 0.025, 0, 1, 0.001, "seconds"),
  ]),
  defineAtom("gain", "Gain / VCA", "Shaping", "Multiplies audio by a control or parameter gain.", [
    input("audioIn", "Audio", "audio", { required: true, missingBehavior: "silence" }),
    input("gainIn", "Gain", "control", { accepts: ["control", "parameter"], defaultValue: 0 }),
    output("audioOut", "Audio", "audio"),
  ], [
    numberParam("baseGain", "Base Gain", 0, 0, 2, 0.01),
  ]),
  defineAtom("mixer", "Mixer", "Shaping", "Four-input audio mixer.", [
    input("audioIn1", "In 1", "audio", { missingBehavior: "silence" }),
    input("audioIn2", "In 2", "audio", { missingBehavior: "silence" }),
    input("audioIn3", "In 3", "audio", { missingBehavior: "silence" }),
    input("audioIn4", "In 4", "audio", { missingBehavior: "silence" }),
    output("audioOut", "Audio", "audio"),
  ], [
    numberParam("trim1", "Trim 1", 0.8, 0, 2, 0.01),
    numberParam("trim2", "Trim 2", 0.8, 0, 2, 0.01),
    numberParam("trim3", "Trim 3", 0.8, 0, 2, 0.01),
    numberParam("trim4", "Trim 4", 0.8, 0, 2, 0.01),
    numberParam("outputTrim", "Output", 0.9, 0, 2, 0.01),
  ]),
  defineAtom("lowPassFilter", "Low-Pass Filter", "Shaping", "One-pole low-pass filter for tone shaping.", [
    input("audioIn", "Audio", "audio", { required: true, missingBehavior: "silence" }),
    input("cutoffIn", "Cutoff", "parameter", { accepts: ["control", "parameter"], defaultValue: 12000, unit: "Hz" }),
    input("qIn", "Q", "parameter", { accepts: ["control", "parameter"], defaultValue: 0.7 }),
    output("audioOut", "Audio", "audio"),
  ], [
    numberParam("cutoff", "Cutoff", 12000, 20, 18000, 1, "Hz"),
    numberParam("q", "Q", 0.7, 0.1, 12, 0.1),
  ]),
  defineAtom("highPassFilter", "High-Pass Filter", "Shaping", "One-pole high-pass filter for snap and rumble removal.", [
    input("audioIn", "Audio", "audio", { required: true, missingBehavior: "silence" }),
    input("cutoffIn", "Cutoff", "parameter", { accepts: ["control", "parameter"], defaultValue: 400, unit: "Hz" }),
    input("qIn", "Q", "parameter", { accepts: ["control", "parameter"], defaultValue: 0.7 }),
    output("audioOut", "Audio", "audio"),
  ], [
    numberParam("cutoff", "Cutoff", 400, 20, 12000, 1, "Hz"),
    numberParam("q", "Q", 0.7, 0.1, 12, 0.1),
  ]),
  defineAtom("bandPassFilter", "Band-Pass Filter", "Shaping", "Band-pass color for noise bursts.", [
    input("audioIn", "Audio", "audio", { required: true, missingBehavior: "silence" }),
    input("cutoffIn", "Center", "parameter", { accepts: ["control", "parameter"], defaultValue: 1800, unit: "Hz" }),
    input("qIn", "Q", "parameter", { accepts: ["control", "parameter"], defaultValue: 1.6 }),
    output("audioOut", "Audio", "audio"),
  ], [
    numberParam("cutoff", "Center", 1800, 40, 12000, 1, "Hz"),
    numberParam("q", "Q", 1.6, 0.1, 12, 0.1),
  ]),
  defineAtom("resonator", "Resonator", "Shaping", "Rings at a tuned frequency when triggered.", [
    input("triggerIn", "Trig", "trigger", { required: true, missingBehavior: "idle" }),
    input("frequencyIn", "Freq", "parameter", { accepts: ["control", "parameter"], defaultValue: 180, unit: "Hz" }),
    input("decayIn", "Decay", "parameter", { accepts: ["control", "parameter"], defaultValue: 0.25, unit: "seconds" }),
    output("audioOut", "Audio", "audio"),
  ], [
    numberParam("frequency", "Frequency", 180, 20, 2400, 1, "Hz"),
    numberParam("decay", "Decay", 0.25, 0.01, 2, 0.001, "seconds"),
    numberParam("amount", "Amount", 0.6, 0, 2, 0.01),
  ]),
  defineAtom("softClip", "Soft Clip", "Shaping", "Saturates audio with bounded output.", [
    input("audioIn", "Audio", "audio", { required: true, missingBehavior: "silence" }),
    input("driveIn", "Drive", "parameter", { accepts: ["control", "parameter"], defaultValue: 1.4 }),
    output("audioOut", "Audio", "audio"),
  ], [
    numberParam("drive", "Drive", 1.4, 0.2, 12, 0.1),
    numberParam("outputTrim", "Output", 0.85, 0, 1.5, 0.01),
  ]),
  defineAtom("output", "Output", "Output", "Master audio output with volume, mute, limiter, and meter.", [
    input("audioIn", "Audio", "audio", { required: true, missingBehavior: "diagnostic" }),
  ], [
    numberParam("volume", "Volume", 0.35, 0, 1, 0.01),
    booleanParam("mute", "Mute", false),
  ]),
  defineAtom("meter", "Meter", "Inspectors", "Shows RMS/peak for audio or current value for control.", [
    input("input", "In", "audio", { accepts: ["audio", "control"], required: true }),
  ]),
  defineAtom("oscilloscope", "Oscilloscope", "Inspectors", "Shows an audio waveform over time.", [
    input("audioIn", "Audio", "audio", { required: true }),
  ]),
  defineAtom("signalProbe", "Signal Probe", "Inspectors", "Inspects any signal domain.", [
    input("input", "In", "parameter", { accepts: ["audio", "control", "trigger", "parameter"], required: true }),
  ]),
  defineAtom("triggerLog", "Trigger Log", "Inspectors", "Counts and timestamps trigger pulses.", [
    input("triggerIn", "Trig", "trigger", { required: true }),
  ]),
] as const satisfies readonly AtomDefinition[];

export const atomRegistry = Object.fromEntries(
  atomDefinitions.map((definition) => [definition.atomType, definition]),
) as Record<(typeof atomDefinitions)[number]["atomType"], AtomDefinition>;

export function getAtomDefinition(atomType: string): AtomDefinition {
  const definition = atomRegistry[atomType as keyof typeof atomRegistry];

  if (!definition) {
    throw new Error(`Unknown atom type: ${atomType}`);
  }

  return definition;
}

export function groupAtomsByCategory() {
  return categoryOrder.map((category) => ({
    atoms: atomDefinitions.filter((definition) => definition.category === category),
    category,
  }));
}

export function cloneParams(params: Record<string, ParamValue>) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, cloneParamValue(value)]),
  ) as Record<string, ParamValue>;
}

export function cloneParamValue(value: ParamValue): ParamValue {
  if (Array.isArray(value)) {
    return typeof value[0] === "boolean" ? [...value] as boolean[] : [...value] as number[];
  }

  return value;
}

export function getPort(definition: AtomDefinition, handleId: string | null | undefined) {
  return definition.ports.find((port) => port.id === handleId);
}

export function formatParamValue(value: ParamValue, unit?: SignalUnit) {
  if (typeof value === "boolean") {
    return value ? "On" : "Off";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return `${value.length} steps`;
  }

  if (unit === "Hz") {
    return `${Math.round(value)} Hz`;
  }

  if (unit === "seconds") {
    return `${value < 0.1 ? value.toFixed(3) : value.toFixed(2)}s`;
  }

  if (Math.abs(value) < 2) {
    return value.toFixed(2);
  }

  return value.toFixed(1);
}

export function defaultRateForDomain(domain: SignalDomain): SignalRate {
  switch (domain) {
    case "audio":
      return "audio-rate";
    case "control":
      return "control-rate";
    case "trigger":
      return "event-rate";
    case "parameter":
      return "static";
  }
}

export function defaultUnitForDomain(domain: SignalDomain): SignalUnit {
  switch (domain) {
    case "audio":
    case "control":
    case "parameter":
      return "scalar";
    case "trigger":
      return "none";
  }
}
