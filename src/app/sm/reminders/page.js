"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const DAYS = ["SU", "M", "T", "W", "TH", "F", "S"];

export default function RemindersPage() {
  const router = useRouter();
  const [activeDays, setActiveDays] = useState(["SU", "M", "T", "W", "S"]);

  function toggleDay(d) {
    setActiveDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function finish() {
    router.push("/sm/home");
  }

  return (
    <div className="sm-screen sm-no-nav">
      <div style={{ padding: "34px 24px 0" }}>
        <div className="sm-rem-copy">
          <h2>What time would you like to meditate?</h2>
          <p>Any time you can choose but We recommend first thing in th morning.</p>
        </div>

        <div className="sm-time-wheel">
          <div className="sm-time-wheel-selected" />
          <div className="sm-time-cols" style={{ paddingTop: 6 }}>
            <div className="sm-time-col">
              <span>10</span><span className="mid">11</span><span>12</span><span>1</span>
            </div>
            <div className="sm-time-col">
              <span>29</span><span className="mid">30</span><span>31</span><span>32</span>
            </div>
            <div className="sm-time-col">
              <span style={{ visibility: "hidden" }}>x</span>
              <span className="mid" style={{ color: "var(--sm-ink)" }}>AM</span>
              <span>PM</span>
              <span style={{ visibility: "hidden" }}>x</span>
            </div>
          </div>
        </div>

        <div className="sm-rem-copy">
          <h2>Which day would you like to meditate?</h2>
          <p>Everyday is best, but we recommend picking at least five.</p>
        </div>

        <div className="sm-day-row">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              className={`sm-day-dot${activeDays.includes(d) ? " active" : ""}`}
              onClick={() => toggleDay(d)}
            >
              {d}
            </button>
          ))}
        </div>

        <button type="button" className="sm-btn sm-btn-primary" onClick={finish}>Save</button>
        <p style={{ textAlign: "center", marginTop: 16 }}>
          <button type="button" className="sm-text-link" style={{ color: "var(--sm-ink)" }} onClick={finish}>
            No Thanks
          </button>
        </p>
      </div>
    </div>
  );
}
