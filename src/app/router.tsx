import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { SignalFieldLab } from "../features/signal-field/SignalFieldLab";

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<SignalFieldLab />} />
        <Route path="/demo" element={<SignalFieldLab />} />
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
