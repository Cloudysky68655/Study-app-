"use client";
import Link from "next/link";
import { IconHome, IconMoon, IconLeaf, IconMusicNote, IconUser } from "./Icons";

const TABS = [
  { key: "home", label: "Home", href: "/sm/home", icon: IconHome },
  { key: "sleep", label: "Sleep", href: "/sm/sleep", icon: IconMoon },
  { key: "meditate", label: "Meditate", href: "/sm/meditate", icon: IconLeaf },
  { key: "music", label: "Music", href: "/sm/music", icon: IconMusicNote },
  { key: "profile", label: "Afsar", href: "/sm/profile", icon: IconUser },
];

export default function TabBar({ active, dark = false }) {
  return (
    <nav className={`sm-tabbar${dark ? " on-dark" : ""}`} aria-label="Main">
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <Link key={t.key} href={t.href} className={`sm-tabbar-item${isActive ? " active" : ""}`}>
            <span className="sm-tabbar-icon-wrap"><Icon /></span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
