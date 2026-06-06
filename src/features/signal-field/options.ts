import { starterPatchOptions } from "./starterPatches";
import type { ConnectionMode } from "./types";

export const connectionModeOptions: Array<{ label: string; value: ConnectionMode }> = [
  { label: "Lab", value: "lab" },
  { label: "Guided", value: "guided" },
  { label: "Unsafe", value: "unsafe" },
];

export const starterOptions = starterPatchOptions.map((option) => ({
  label: option.label,
  value: option.value,
}));
