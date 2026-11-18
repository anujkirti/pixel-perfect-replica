import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Shield,
  LayoutDashboard,
  ScanLine,
  SlidersHorizontal,
  Layers,
  Cpu,
  Settings,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  ArrowUpRight,
  CircleHelp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useThresholds } from "./store";
import { useLive } from "@/components/live/store";
const nav = [
  { to: "/", title: "Live camera", icon: ScanLine },
  { to: "/analysis", title: "Feedback analysis", icon: LayoutDashboard },
  { to: "/detector", title: "Demo scene review", icon: ScanLine },
  { to: "/tuning", title: "Threshold tuning", icon: SlidersHorizontal },
  { to: "/hard-negatives", title: "Hard-negative analysis", icon: Layers },
  { to: "/model", title: "Model & dataset", icon: Cpu },
  { to: "/settings", title: "Settings", icon: Settings },
  { to: "/about", title: "Documentation", icon: BookOpen },
] as const;
export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const { reset, imported } = useThresholds();
  const live = useLive();
  const active = nav.find((n) => n.to === path);
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`app-sidebar ${mobile ? "mobile-open" : ""}`}>
        <Link to="/" className="brand" onClick={() => setMobile(false)}>
          <span className="brand-icon">
            <Shield />
            <span />
          </span>
          <span className="brand-word">
            Sentinel<span>Eye</span>
            <small>LIVE · ON-DEVICE RESEARCH</small>
          </span>
        </Link>
        <div className="sidebar-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.slice(0, 6).map((n) => (
            <Button
              asChild
              variant="ghost"
              key={n.to}
              className={`nav-item ${path === n.to ? "active" : ""}`}
              title={n.title}
            >
              <Link to={n.to} onClick={() => setMobile(false)}>
                <n.icon />
                <span>{n.title}</span>
                {path === n.to && <span className="nav-active-dot" />}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-demo">
            <span className="status-dot" />
            <span>
              {live.entries.length ? `${live.entries.length} local events` : "On-device workspace"}
              <small>No account · human verified</small>
            </span>
            <span className="mono">v1.0</span>
          </div>
          <nav aria-label="Preferences">
            {nav.slice(6).map((n) => (
              <Button
                asChild
                variant="ghost"
                key={n.to}
                className={`nav-item ${path === n.to ? "active" : ""}`}
                title={n.title}
              >
                <Link to={n.to} onClick={() => setMobile(false)}>
                  <n.icon />
                  <span>{n.title}</span>
                </Link>
              </Button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <span>BUILT FOR HUMAN REVIEW</span>
            <Shield className="size-3" />
          </div>
        </div>
      </aside>
      {mobile && <div className="sidebar-backdrop" onClick={() => setMobile(false)} />}
      <div className="app-main">
        <header className="topbar">
          <div className="flex items-center gap-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="desktop-collapse"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mobile-collapse"
              aria-label={mobile ? "Close menu" : "Open menu"}
              onClick={() => setMobile(!mobile)}
            >
              <PanelLeftOpen />
            </Button>
            <span className="breadcrumb">
              Workspace <span>/</span> <strong>{active?.title ?? "SentinelEye"}</strong>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="topbar-status">
              <span className="status-dot" />
              On-device research
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reset();
                live.reset();
                toast.success("Detector defaults restored.");
              }}
            >
              <RotateCcw />
              Reset defaults
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Documentation">
              <Link to="/about">
                <CircleHelp />
              </Link>
            </Button>
          </div>
        </header>
        <main className="page-content" key={path}>
          {children}
        </main>
        <footer className="app-footer">
          <span>
            <Shield className="size-3" />
            Research prototype. All detections must be verified by a human operator.
          </span>
          <span className="mono">
            SENTINELEYE <span className="text-primary">/</span> V1.0
          </span>
        </footer>
      </div>
    </div>
  );
}
