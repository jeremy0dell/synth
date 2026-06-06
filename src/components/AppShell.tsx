import type { ReactNode } from "react";
import { Drum, SlidersHorizontal } from "lucide-react";
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
  title: ReactNode;
  trailing?: ReactNode;
};

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ShellFrame accountLabel="Local DSP" title="Primitive composer">
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

function ShellFrame({ accountLabel, children, title, trailing }: ShellFrameProps) {
  return (
    <AppFrame>
      <TopBar>
        <AppTitle eyebrow="808 Lab" title={title} />
        <AccountStrip>
          <span className="[overflow-wrap:anywhere]">{accountLabel}</span>
          <ThemeToggle />
          {trailing}
        </AccountStrip>
      </TopBar>
      <AppLayout>
        <Sidebar aria-label="Primary navigation">
          <SidebarLink to="/" end icon={<Drum size={18} aria-hidden="true" />}>
            Composer
          </SidebarLink>
          <SidebarLink to="/demo" icon={<SlidersHorizontal size={18} aria-hidden="true" />}>
            Demo
          </SidebarLink>
        </Sidebar>
        <MainContent>{children}</MainContent>
      </AppLayout>
    </AppFrame>
  );
}

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  return (
    <ShellFrame accountLabel="Signed in" title="Primitive composer" trailing={<SignOut />}>
      {children}
    </ShellFrame>
  );
}
