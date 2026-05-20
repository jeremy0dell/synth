import type { HTMLAttributes, ReactNode } from "react";
import { NavLink, type NavLinkProps } from "react-router-dom";
import { cn } from "../../lib/utils";

export function AppFrame({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("gs-app-frame min-h-screen bg-[var(--gs-page)]", className)} {...props} />;
}

export function TopBar({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <header
      className={cn(
        "gs-topbar sticky top-0 z-30 flex min-h-18 items-center justify-between gap-[var(--gs-gap-lg)]",
        "border-b border-[var(--gs-topbar-border)] bg-[var(--gs-topbar-bg)] px-[clamp(1rem,4vw,2rem)] py-3 shadow-[var(--gs-topbar-shadow)]",
        "backdrop-blur-xl max-[760px]:static max-[760px]:flex-col max-[760px]:items-start",
        className,
      )}
      {...props}
    />
  );
}

export function AppTitle({ eyebrow, title }: { eyebrow: ReactNode; title: ReactNode }) {
  return (
    <div className="gs-app-title min-w-0">
      <p className="mb-1 text-xs font-black uppercase leading-none tracking-normal text-[var(--gs-accent)]">
        {eyebrow}
      </p>
      <h1 className="text-2xl font-bold leading-tight text-[var(--gs-heading)] max-[420px]:text-xl">
        {title}
      </h1>
    </div>
  );
}

export function AccountStrip({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "gs-account-strip flex min-w-0 items-center justify-end gap-[var(--gs-gap-md)]",
        "text-sm text-[var(--gs-text-muted)] max-[760px]:w-full max-[760px]:flex-wrap max-[760px]:justify-between",
        className,
      )}
      {...props}
    />
  );
}

export function AppLayout({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "gs-app-layout grid grid-cols-[12rem_minmax(0,1fr)] items-start max-[760px]:grid-cols-1",
        className,
      )}
      {...props}
    />
  );
}

export function Sidebar({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn(
        "gs-sidebar sticky top-18 grid min-h-[calc(100vh-4.5rem)] content-start gap-[var(--gs-gap-xs)]",
        "border-r border-[var(--gs-sidebar-border)] bg-[var(--gs-sidebar-bg)] px-4 py-5",
        "max-[760px]:static max-[760px]:min-h-0 max-[760px]:grid-cols-2 max-[760px]:border-r-0",
        "max-[760px]:border-b max-[760px]:px-3 max-[760px]:py-3 max-[480px]:gap-1",
        className,
      )}
      {...props}
    />
  );
}

type SidebarLinkProps = Omit<NavLinkProps, "children" | "className"> & {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
};

export function SidebarLink({ children, className, icon, ...props }: SidebarLinkProps) {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          "gs-sidebar-link flex min-h-[var(--gs-control-height-lg)] items-center gap-2 rounded-[var(--gs-radius-md)]",
          "px-3 text-sm font-bold no-underline transition-colors",
          "focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--gs-focus)]",
          "max-[760px]:justify-center max-[480px]:min-h-11 max-[480px]:px-2",
          isActive
            ? "bg-[var(--gs-nav-active)] text-[var(--gs-heading)] hover:bg-[var(--gs-nav-active-hover)]"
            : "text-[var(--gs-text-muted)] hover:bg-[var(--gs-nav-hover)] hover:text-[var(--gs-heading)]",
          className,
        )
      }
      {...props}
    >
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </NavLink>
  );
}

export function MainContent({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn(
        "gs-main-content w-[min(100%,var(--gs-shell-width))] p-[clamp(1rem,3vw,2rem)] max-[520px]:p-4",
        className,
      )}
      {...props}
    />
  );
}

export function PageStack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("gs-page-stack grid gap-[var(--gs-gap-lg)]", className)} {...props} />;
}

export function Stack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("gs-stack grid gap-[var(--gs-gap-md)]", className)} {...props} />;
}

export function ControlGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("gs-control-grid grid grid-cols-2 gap-[var(--gs-gap-md)] max-[760px]:grid-cols-1", className)}
      {...props}
    />
  );
}

export function CompactGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("gs-compact-grid grid grid-cols-3 gap-[var(--gs-gap-md)] max-[760px]:grid-cols-1", className)}
      {...props}
    />
  );
}

export function ButtonRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("gs-button-row flex flex-wrap items-center gap-[var(--gs-gap-sm)]", className)}
      {...props}
    />
  );
}

export function TextActions({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "gs-text-actions flex flex-wrap items-center justify-end gap-[var(--gs-gap-xs)]",
        className,
      )}
      {...props}
    />
  );
}
