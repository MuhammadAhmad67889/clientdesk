"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, BarChart3, ChevronDown, ChevronLeft, ChevronRight, FileText, LayoutGrid, LogOut, Menu, Settings, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import CommandPalette from "./CommandPalette";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
  { href: "/payments", label: "Payments" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

/** One icon per nav section, from Lucide, so every icon in the app
 * shares the same stroke and size. */
function Icon({ kind }: { kind: string }) {
  if (kind === "clients") return <Users size={18} />;
  if (kind === "invoices") return <FileText size={18} />;
  if (kind === "payments") return <Banknote size={18} />;
  if (kind === "analytics") return <BarChart3 size={18} />;
  if (kind === "settings") return <Settings size={18} />;
  return <LayoutGrid size={18} />;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

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

  const title =
    pathname === "/settings" ? "Settings"
    : pathname === "/payments" ? "Payments"
    : pathname === "/analytics" ? "Analytics"
    : pathname.startsWith("/clients") ? "Clients"
    : pathname.startsWith("/invoices") ? "Invoices"
    : "Overview";

  // The phone bar: the four sections people open most, plus a menu
  // button for everything else (the sidebar drawer). It only renders
  // on narrow screens; desktop keeps the sidebar.
  const bottomNav = [
    { href: "/", kind: "overview", label: "Overview" },
    { href: "/clients", kind: "clients", label: "Clients" },
    { href: "/invoices", kind: "invoices", label: "Invoices" },
    { href: "/payments", kind: "payments", label: "Payments" },
    { href: "/settings", kind: "settings", label: "Settings" },
  ];

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
              className={`nav-item${pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? " active" : ""}`}
              href={item.href}
              key={item.href}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon">
                <Icon kind={item.href === "/clients" ? "clients" : item.href === "/invoices" ? "invoices" : item.href === "/payments" ? "payments" : item.href === "/analytics" ? "analytics" : item.href === "/settings" ? "settings" : "overview"} />
              </span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="nav-item" onClick={toggleCollapsed} type="button">
            <span className="nav-icon">{collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</span>
            <span className="nav-label">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
          </button>
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
          {email && (
            <div className="profile-menu">
              <button
                aria-expanded={profileOpen}
                aria-label="Account menu"
                className="icon-btn"
                onClick={() => setProfileOpen((v) => !v)}
                type="button"
              >
                <User size={18} />
                <ChevronDown size={14} />
              </button>
              {profileOpen && (
                <>
                  <button aria-label="Close account menu" className="menu-backdrop" onClick={() => setProfileOpen(false)} type="button" />
                  <div className="profile-dropdown" role="menu">
                    <span className="profile-email">{email}</span>
                    <Link href="/settings" onClick={() => setProfileOpen(false)} role="menuitem">
                      <Settings aria-hidden="true" className="icon-inline" size={14} /> Settings
                    </Link>
                    <button onClick={logout} role="menuitem" type="button">
                      <LogOut aria-hidden="true" className="icon-inline" size={14} /> Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </header>
        <main className="content">{children}</main>
      </div>
      <nav aria-label="Quick navigation" className="bottom-nav">
        {bottomNav.map((item) => (
          <Link
            aria-current={pathname === item.href ? "page" : undefined}
            className={`bottom-nav-item${pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? " active" : ""}`}
            href={item.href}
            key={item.href}
          >
            <Icon kind={item.kind} />
            <span>{item.label}</span>
          </Link>
        ))}
        <button aria-label="Open navigation menu" className="bottom-nav-item" onClick={() => setMobileOpen(true)} type="button">
          <Menu size={18} />
          <span>Menu</span>
        </button>
      </nav>
      <CommandPalette onClose={() => setPaletteOpen(false)} open={paletteOpen} />
    </div>
  );
}
