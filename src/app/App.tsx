import { useEffect, useState } from "react";
import { Authenticated, AuthLoading, Unauthenticated, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AppRoutes } from "./router";
import { SignIn } from "../components/SignIn";
import { ThemeToggle } from "../components/ThemeToggle";
import { Panel, StatusText } from "../components/ui";

export default function App() {
  return (
    <>
      <AuthLoading>
        <AccountStatus message="Loading account..." />
      </AuthLoading>
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      <Authenticated>
        <AccountGate />
      </Authenticated>
    </>
  );
}

function AccountGate() {
  const ensureUser = useMutation(api.users.ensureUser);
  const [state, setState] = useState<"checking" | "ready" | "blocked">("checking");
  const [message, setMessage] = useState("Checking account...");

  useEffect(() => {
    let active = true;
    void ensureUser()
      .then(() => {
        if (active) setState("ready");
      })
      .catch((error) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Account setup failed.");
        setState("blocked");
      });

    return () => {
      active = false;
    };
  }, [ensureUser]);

  if (state === "checking") {
    return <AccountStatus message={message} />;
  }

  if (state === "blocked") {
    return <AccountStatus message={message} tone="error" />;
  }

  return <AppRoutes />;
}

function AccountStatus({ message, tone = "muted" }: { message: string; tone?: "muted" | "error" }) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Panel variant="dialog" className="w-[min(100%,28rem)]">
        <div>
          <p className="mb-1 text-xs font-black uppercase leading-none tracking-normal text-[var(--gs-accent)]">
            GermStack
          </p>
          <h1 className="text-2xl font-bold leading-tight text-[var(--gs-heading)]">
            Starter App
          </h1>
        </div>
        <ThemeToggle />
        <StatusText variant={tone}>{message}</StatusText>
      </Panel>
    </main>
  );
}
