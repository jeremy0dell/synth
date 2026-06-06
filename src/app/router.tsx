import { Navigate, Route, Routes } from "react-router-dom";
import { SynthLab } from "../features/synth/SynthLab";
import { AppShell } from "../components/AppShell";

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<SynthLab />} />
        <Route path="/demo" element={<SynthLab />} />
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
