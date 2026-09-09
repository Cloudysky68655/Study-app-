"use client";

/**
 * Generic bottom slide-up sheet. Used for both the Settings sheet and the
 * section-switcher sheet — each page/AppShell instance renders its own,
 * so at most one is open at a time.
 */
export default function SlideUpSheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {title && <div className="sheet-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}
