"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/smContent";

export default function ChooseTopicPage() {
  const router = useRouter();
  const [selected, setSelected] = useState(null);

  return (
    <div className="sm-screen sm-no-nav">
      <div style={{ padding: "34px 24px 18px" }}>
        <h1 style={{ fontSize: 27, lineHeight: 1.25 }}>
          What Brings you
          <br />
          to Silent Moon?
        </h1>
        <p style={{ color: "var(--sm-ink-soft)", marginTop: 10, fontSize: 14.5 }}>choose a topic to focuse on:</p>
      </div>

      <div className="sm-cat-grid">
        {[0, 1].map((colIdx) => (
          <div className="sm-cat-col" key={colIdx}>
            {CATEGORIES.filter((c) => c.col === colIdx).map((c) => (
              <button
                key={c.slug}
                type="button"
                className={`sm-cat-tile${selected === c.slug ? " selected" : ""}`}
                style={{ aspectRatio: c.ratio }}
                onClick={() => setSelected(c.slug)}
              >
                <img src={c.img} alt={c.title} />
              </button>
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: "0 24px 30px" }}>
        <button
          type="button"
          className="sm-btn sm-btn-primary"
          disabled={!selected}
          onClick={() => router.push("/sm/reminders")}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
