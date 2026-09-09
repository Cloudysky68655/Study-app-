"use client";
import { useState } from "react";
import Link from "next/link";
import { IconBook, IconGrid } from "@/components/Icons";
import { playSelect } from "@/lib/sounds";

const MODULES = [
  { key: "study", label: "Today", href: "/dashboard", icon: IconBook },
  { key: "qbank", label: "Practice", href: "/qbank", icon: IconGrid },
];

export default function ModuleSwitcher({ active }) {
  const [pressedKey, setPressedKey] = useState(null);

  return (
    <div className="module-switcher">
      {MODULES.map((m) => {
        const Icon = m.icon;
        const isActive = m.key === active;
        const isPressed = pressedKey ? pressedKey === m.key : isActive;
        return (
          <Link
            key={m.key}
            href={m.href}
            prefetch={false}
            data-sound="none"
            onClick={(e) => {
              playSelect();
              if (isActive) {
                e.preventDefault();
              } else {
                setPressedKey(m.key);
              }
            }}
            className={`module-switcher-item ${isPressed ? "active" : ""}`}
            style={{ textDecoration: "none" }}
            title={m.label}
          >
            <Icon style={{ width: 15, height: 15 }} />
            <span>{m.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
