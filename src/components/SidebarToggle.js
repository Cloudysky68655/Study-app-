"use client";

/**
 * Floating chevron button that collapses/expands the app sidebar so
 * studying/practicing can use the full width without the nav icons
 * competing for attention. Parent owns the collapsed boolean (usually
 * persisted to localStorage) and toggles it via onToggle — this
 * component is purely presentational.
 */
export default function SidebarToggle({ collapsed, onToggle }) {
  return (
    <button
      className="sidebar-toggle-btn"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      data-sound="none"
      title={collapsed ? "Show sidebar" : "Hide sidebar"}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3.5" y1="6.5" x2="20.5" y2="6.5" />
        <line x1="3.5" y1="12" x2="20.5" y2="12" />
        <line x1="3.5" y1="17.5" x2="20.5" y2="17.5" />
      </svg>
    </button>
  );
}
