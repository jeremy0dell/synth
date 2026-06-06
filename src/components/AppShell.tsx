import type { ReactNode } from "react";
import { AudioLines, CircuitBoard } from "lucide-react";
import { useLocation } from "react-router-dom";
import { SignOut } from "./SignOut";
import { ThemeToggle } from "./ThemeToggle";
import {
  AccountStrip,
  AppFrame,
  AppLayout,
  AppTitle,
  MainContent,
  Sidebar,
  SidebarLink,
  TopBar,
} from "./ui";

type ShellFrameProps = {
  accountLabel: ReactNode;
  children: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  trailing?: ReactNode;
};

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const page = appPages.find((candidate) => candidate.matches(location.pathname)) ?? appPages[0];

  return (
    <ShellFrame accountLabel="Local DSP" eyebrow={page.eyebrow} title={page.title}>
      {children}
    </ShellFrame>
  );
}

export function PublicShell({ children, title }: { children: ReactNode; title: ReactNode }) {
  return (
    <ShellFrame accountLabel="Local DSP" title={title}>
      {children}
    </ShellFrame>
  );
}

const appPages = [
  {
    eyebrow: "Atom patching",
    icon: <CircuitBoard size={18} aria-hidden="true" />,
    label: "Signal Field",
    matches: (pathname: string) => pathname === "/" || pathname === "/signal-field",
    title: "Signal Field",
    to: "/",
  },
  {
    eyebrow: "Primitive synthesis",
    icon: <AudioLines size={18} aria-hidden="true" />,
    label: "808 Lab",
    matches: (pathname: string) => pathname === "/lab" || pathname === "/demo" || pathname === "/synth",
    title: "808 Lab",
    to: "/lab",
  },
];

function ShellFrame({ accountLabel, children, eyebrow = "Atom patching", title, trailing }: ShellFrameProps) {
  return (
    <AppFrame>
      <TopBar>
        <AppTitle eyebrow={eyebrow} title={title} />
        <AccountStrip>
          <span className="[overflow-wrap:anywhere]">{accountLabel}</span>
          <ThemeToggle />
          {trailing}
        </AccountStrip>
      </TopBar>
      <AppLayout>
        <Sidebar aria-label="Primary navigation">
          {appPages.map((page) => (
            <SidebarLink to={page.to} end={page.to === "/"} icon={page.icon} key={page.to}>
              {page.label}
            </SidebarLink>
          ))}
        </Sidebar>
        <MainContent>{children}</MainContent>
      </AppLayout>
    </AppFrame>
  );
}

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  return (
    <ShellFrame accountLabel="Signed in" title="Signal Field" trailing={<SignOut />}>
      {children}
    </ShellFrame>
  );
}
