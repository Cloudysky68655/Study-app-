"use client";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import BloomFallingFlowers from "@/components/BloomFallingFlowers";
import { IconSettings, IconHome, IconBook, IconStar, IconGrid, IconLayers, IconChart, IconCalendar, IconLock } from "@/components/Icons";
import { playSelect } from "@/lib/sounds";

const NAV_ITEMS = [
  { key: "study", label: "Study", href: "/study", icon: IconHome },
  { key: "tracker", label: "Tracker", href: "/tracker", icon: IconBook },
  { key: "library", label: "Library", href: "/library", icon: IconLayers },
  { key: "stats", label: "Stats", href: "/stats", icon: IconStar },
  { key: "plan", label: "Plan", href: "/plan", icon: IconCalendar },
];

/**
 * Shared page skeleton with top-level individual pages in the sidebar navigation.
 */
export default function AppShell({
  active = "study",
  subTabs,
  activeTab,
  onTabChange,
  onBack,
  backLabel = "Switch",
  onLogout,
  onExport,
  exportLabel = "Export",
  onReset,
  resetLabel = "Reset",
  themeProps,
  onShellClick,
  isAdmin = false,
  children,
}) {
  const normalizedActive =
    active === "dashboard" || active === "log" || active === "history" ? "stats" :
    active === "schedule" ? "plan" :
    active === "qbank" || active === "flashcards" ? "library" :
    active === "settings" ? "settings" :
    active;

  const allNavItems = isAdmin
    ? [...NAV_ITEMS, { key: "access", label: "Access", href: "/access", icon: IconLock }]
    : NAV_ITEMS;

  return (
    <div className="app-shell" onClick={onShellClick}>
      <BloomFallingFlowers />

      {/* Desktop Sidebar Rail */}
      <aside className="app-sidebar-rail" aria-label="Desktop Navigation">
        <nav className="app-sidebar-nav">
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = normalizedActive === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch={false}
                data-sound="none"
                className={`app-sidebar-row ${isCurrent ? "active" : ""}`}
                style={{ textDecoration: "none" }}
                onClick={(e) => {
                  playSelect();
                  if (onTabChange) {
                    e.preventDefault();
                    onTabChange(item.key, item.href);
                    return;
                  }
                  if (isCurrent) {
                    e.preventDefault();
                  }
                }}
              >
                <div className="app-sidebar-icon-slot">
                  <Icon style={{ width: 16, height: 16 }} />
                </div>
                <span className="app-sidebar-label">{item.label}</span>
                {isCurrent && <span className="app-sidebar-dot" />}
              </Link>
            );
          })}
        </nav>

        {/* Pinned Settings Link at bottom of Desktop Sidebar */}
        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--panel-border)" }}>
          <Link
            href="/settings"
            prefetch={false}
            data-sound="none"
            className={`app-sidebar-row ${normalizedActive === "settings" ? "active" : ""}`}
            style={{ textDecoration: "none" }}
            onClick={(e) => {
              playSelect();
              if (onTabChange) {
                e.preventDefault();
                onTabChange("settings", "/settings");
                return;
              }
              if (normalizedActive === "settings") {
                e.preventDefault();
              }
            }}
            title="Settings"
          >
            <div className="app-sidebar-icon-slot">
              <IconSettings style={{ width: 16, height: 16 }} />
            </div>
            <span className="app-sidebar-label">Settings</span>
            {normalizedActive === "settings" && <span className="app-sidebar-dot" />}
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-shell-content">
        <div className="app-main">
          {children}
        </div>
      </div>

      {/* Mobile Floating Pill Navigation */}
      <BottomNav
        active={active}
        onTabChange={onTabChange}
      />
    </div>
  );
}
