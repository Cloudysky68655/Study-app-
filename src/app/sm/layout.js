import "@/styles/silentmoon.css";

export const metadata = {
  title: "Silent Moon",
  description: "Meditation app UI reconstruction (Phase 1)",
};

// Everything under /sm/* is the isolated Figma reconstruction.
// It intentionally does not share layout, nav, or styling with the
// rest of the app (Today/Study/Tasks/Habits/Notes) — see Phase 1
// instructions. The .sm-root wrapper scopes every design-system
// rule in silentmoon.css so nothing here leaks into or is
// influenced by globals.css.
export default function SmLayout({ children }) {
  return <div className="sm-root">{children}</div>;
}
