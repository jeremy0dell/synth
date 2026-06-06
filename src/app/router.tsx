import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { SignalFieldLab } from "../features/signal-field/SignalFieldLab";
import { SynthLab } from "../features/synth/SynthLab";

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<SignalFieldLab />} />
        <Route path="/signal-field" element={<Navigate to="/" replace />} />
        <Route path="/lab" element={<SynthLab />} />
        <Route path="/demo" element={<Navigate to="/lab" replace />} />
        <Route path="/synth" element={<Navigate to="/lab" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export function PublicDemoApp() {
  return <AppRoutes />;
}

export function SetupRequiredApp() {
  return <AppRoutes />;
}
