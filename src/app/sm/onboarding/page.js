"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const SLIDES = [
  {
    key: "welcome",
    theme: "purple",
    logo: "light",
    heading: (
      <>
        <span className="sm-accent">Hi Afsar, Welcome</span>
        <br />
        to Silent Moon
      </>
    ),
    body: "Explore the app, Find some peace of mind to prepare for meditation.",
    art: "/sm/illustrations/onboard-meditate-person.png",
    cta: "Get Started",
  },
  {
    key: "sleep",
    theme: "navy",
    logo: "light",
    heading: "Wecome to Sleep",
    body: "Explore the new king of sleep. It uses sound and vesualization to create perfect conditions for refreshing sleep.",
    art: "/sm/illustrations/onboard-sleep-birds.png",
    cta: "Get Started",
  },
  {
    key: "final",
    theme: "cream",
    logo: "dark",
    heading: "We are what we do",
    body: "Thousand of people are usign silent moon for smalls meditation",
    art: "/sm/illustrations/onboard-couch-illust.png",
    cta: "Sign Up",
    isFinal: true,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];

  function next() {
    if (step < SLIDES.length - 1) setStep(step + 1);
    else router.push("/sm/signup");
  }

  const bgClass =
    slide.theme === "purple" ? "sm-theme-purple" : slide.theme === "navy" ? "sm-theme-dark" : "";
  const textColor = slide.theme === "cream" ? "var(--sm-ink)" : "#fff";

  return (
    <div
      className={`sm-screen sm-no-nav ${bgClass}`}
      style={{
        background:
          slide.theme === "cream"
            ? "var(--sm-cream)"
            : slide.theme === "navy"
            ? "radial-gradient(120% 90% at 50% -10%, #23245e 0%, #12123a 60%)"
            : "radial-gradient(120% 90% at 50% -10%, #a3aafe 0%, #8e97fd 55%)",
        color: textColor,
      }}
    >
      <div className="sm-onboard">
        <div className={`sm-logo ${slide.logo === "light" ? "sm-logo-light" : "sm-logo-dark"}`}>
          <img src={slide.logo === "light" ? "/sm/illustrations/logo-mark-light.png" : "/sm/illustrations/logo-mark.png"} alt="" />
          <span>Silent&nbsp;&nbsp;Moon</span>
        </div>

        <div className="sm-onboard-copy">
          <h1>{slide.heading}</h1>
          <p>{slide.body}</p>
        </div>

        <div className="sm-onboard-art">
          <img src={slide.art} alt="" />
        </div>

        <div className="sm-onboard-dots">
          {SLIDES.map((s, i) => (
            <span key={s.key} className={`sm-onboard-dot${i === step ? " active" : ""}`} />
          ))}
        </div>

        <button
          type="button"
          className={`sm-btn ${slide.theme === "cream" ? "sm-btn-primary" : "sm-btn-light"}`}
          onClick={next}
        >
          {slide.cta}
        </button>

        {slide.isFinal && (
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 13.5, color: "var(--sm-ink-soft)" }}>
            Already have an account?{" "}
            <button type="button" className="sm-text-link" onClick={() => router.push("/sm/login")}>
              Log In
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
