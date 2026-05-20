import { FormEvent, useState } from "react";
import { Blocks } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ThemeToggle } from "./ThemeToggle";
import {
  Button,
  ButtonLink,
  ButtonRow,
  Field,
  FormPanel,
  Panel,
  StatusText,
  TextInput,
} from "./ui";

export function SignIn() {
  const { signIn } = useAuthActions();
  const googleAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);

  async function handlePasswordAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await signIn("password", {
        flow: mode,
        email,
        password,
      });
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Sign-in failed.");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Panel as="div" variant="dialog" className="w-[min(100%,28rem)]">
        <div
          className="grid size-12 place-items-center rounded-[var(--gs-radius-md)] bg-[var(--gs-accent)] text-[var(--gs-accent-text)]"
          aria-hidden="true"
        >
          <Blocks size={28} />
        </div>
        <div>
          <p className="mb-1 text-xs font-black uppercase leading-none tracking-normal text-[var(--gs-accent)]">
            GermStack
          </p>
          <h1 className="text-2xl font-bold leading-tight text-[var(--gs-heading)]">
            Sign in
          </h1>
        </div>
        <ThemeToggle />
        <FormPanel
          variant="editor"
          className="border-0 bg-transparent p-0 shadow-none"
          onSubmit={handlePasswordAuth}
        >
          <Field label="Email">
            <TextInput
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <TextInput
              type="password"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </Field>
          {error ? <StatusText variant="error">{error}</StatusText> : null}
          <ButtonRow>
            <Button variant="primary" type="submit">
              {mode === "signIn" ? "Sign in" : "Create account"}
            </Button>
            <Button
              type="button"
              onClick={() => setMode((current) => (current === "signIn" ? "signUp" : "signIn"))}
            >
              {mode === "signIn" ? "New account" : "Existing account"}
            </Button>
          </ButtonRow>
        </FormPanel>
        {googleAuthEnabled ? (
          <Button variant="primary" type="button" onClick={() => void signIn("google")}>
            Sign in with Google
          </Button>
        ) : null}
        <ButtonLink to="/demo">Open public demo</ButtonLink>
      </Panel>
    </main>
  );
}
