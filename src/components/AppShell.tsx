import type { ReactNode } from "react";
import { Home, Settings } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
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
  const viewer = useQuery(api.users.viewer);
  const location = useLocation();
  const heading = location.pathname.startsWith("/settings") ? "Settings" : "Items";

  return (
    <ShellFrame
      accountLabel={viewer?.email ?? viewer?.name ?? "Signed in"}
      title={heading}
      trailing={<SignOut />}
    >
      {children}
    </ShellFrame>
  );
}

export function PublicShell({ children, title }: { children: ReactNode; title: ReactNode }) {
  return (
    <ShellFrame accountLabel="Demo mode" title={title}>
      {children}
    </ShellFrame>
  );
}

function ShellFrame({ accountLabel, children, title, trailing }: ShellFrameProps) {
  return (
    <AppFrame>
      <TopBar>
        <AppTitle eyebrow="GermStack" title={title} />
        <AccountStrip>
          <span className="[overflow-wrap:anywhere]">{accountLabel}</span>
          <ThemeToggle />
          {trailing}
        </AccountStrip>
      </TopBar>
      <AppLayout>
        <Sidebar aria-label="Primary navigation">
          <SidebarLink to="/" end icon={<Home size={18} aria-hidden="true" />}>
            Items
          </SidebarLink>
          <SidebarLink to="/settings" icon={<Settings size={18} aria-hidden="true" />}>
            Settings
          </SidebarLink>
        </Sidebar>
        <MainContent>{children}</MainContent>
      </AppLayout>
    </AppFrame>
  );
}
