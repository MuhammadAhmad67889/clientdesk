"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CommandPalette from "./CommandPalette";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
];

function Icon({ kind }: { kind: string }) {
  const common = {
    fill: "none",
    height: 18,
    stroke: "currentColor",
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    width: 18,
  };
  if (kind === "clients")
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  if (kind === "invoices")
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect height="7" width="7" x="3" y="3" rx="1" />
      <rect height="7" width="7" x="14" y="3" rx="1" />
      <rect height="7" width="7" x="14" y="14" rx="1" />
      <rect height="7" width="7" x="3" y="14" rx="1" />
    </svg>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("clientdesk-theme");
    const initial = stored === "dark" || stored === "light"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
    setCollapsed(window.localStorage.getItem("clientdesk-sidebar") === "collapsed");
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { email?: string } | null) => setEmail(d?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("clientdesk-theme", next);
  }

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("clientdesk-sidebar", next ? "collapsed" : "open");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  // Auth screens get a distraction-free layout; their pages own the split screen.
  if (pathname === "/login" || pathname === "/signup") {
    return <main>{children}</main>;
  }

  const title = pathname === "/clients" ? "Clients" : pathname === "/invoices" ? "Invoices" : "Overview";

  return (
    <div className="shell">
      {mobileOpen && (
        <button aria-label="Close navigation menu" className="sidebar-backdrop" onClick={() => setMobileOpen(false)} type="button" />
      )}
      <aside className={`sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " open" : ""}`}>
        <Link className="brand" href="/" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark">C</span>
          <span className="brand-text">ClientDesk</span>
        </Link>
        <span className="sidebar-section">Workspace</span>
        <nav aria-label="Main navigation">
          {NAV.map((item) => (
            <Link
              aria-current={pathname === item.href ? "page" : undefined}
              className={`nav-item${pathname === item.href ? " active" : ""}`}
              href={item.href}
              key={item.href}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon">
                <Icon kind={item.href === "/clients" ? "clients" : item.href === "/invoices" ? "invoices" : "overview"} />
              </span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          {email && <span className="nav-email">{email}</span>}
          <button className="nav-item" onClick={toggleCollapsed} type="button">
            <span className="nav-icon">{collapsed ? "→" : "←"}</span>
            <span className="nav-label">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
          </button>
          {email && (
            <button className="nav-item" onClick={logout} type="button">
              <span className="nav-icon">↪</span>
              <span className="nav-label">Log out</span>
            </button>
          )}
        </div>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          <button
            aria-label="Open navigation menu"
            className="icon-btn mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            type="button"
          >
            ☰
          </button>
          <h2 className="topbar-title">{title}</h2>
          <div className="topbar-spacer" />
          {email && (
            <button className="cmd-hint" onClick={() => setPaletteOpen(true)} type="button">
              <span>Search or jump to…</span>
              <kbd>Ctrl K</kbd>
            </button>
          )}
          <button
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="icon-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            type="button"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </header>
        <main className="content">{children}</main>
      </div>
      <CommandPalette onClose={() => setPaletteOpen(false)} open={paletteOpen} />
    </div>
  );
}
