"use client";

/**
 * Single shared modal wrapper for the whole app. Two variants covering the
 * two patterns that had organically grown separately:
 *  - "sheet"   — bottom sheet on mobile, centered card on wider screens
 *                (this was Habits-only as .h-modal-*; now shared)
 *  - "overlay" — simple centered overlay (this was Study-only as
 *                .modal-overlay/.modal-box; now shared)
 * Content/behavior of each caller is unchanged — only the outer wrapper
 * markup is unified so future modals (any module) have one thing to reach
 * for instead of reinventing a backdrop.
 */
export default function Modal({ open, onClose, title, children, maxWidth = 480, variant = "sheet" }) {
  if (!open) return null;

  if (variant === "overlay") {
    return (
      <div
        className="modal-overlay"
        style={{ position: "fixed", inset: 0, background: "rgba(5,6,12,.7)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}
        onClick={onClose}
      >
        <div className="card modal-box" style={{ maxWidth, width: "100%", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
          {title && <h2 style={{ marginTop: 0 }}>{title}</h2>}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        {title && <div className="modal-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}
