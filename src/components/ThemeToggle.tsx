import { SegmentedControl, type SegmentedControlOption } from "./ui";
import { useTheme } from "../app/providers";
import type { ThemePreference } from "../lib/theme";

const themeOptions: Array<SegmentedControlOption<ThemePreference>> = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <SegmentedControl
      ariaLabel="Theme preference"
      name="theme-preference"
      onChange={setPreference}
      options={themeOptions}
      value={preference}
    />
  );
}
