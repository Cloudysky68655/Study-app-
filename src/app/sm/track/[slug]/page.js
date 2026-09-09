"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { IconArrowLeft, IconHeart, IconDownload, IconHeadphones } from "@/components/sm/Icons";
import { TRACK_DETAILS } from "@/lib/smContent";

export default function TrackDetailPage() {
  const router = useRouter();
  const { slug } = useParams();
  const data = TRACK_DETAILS[slug] || TRACK_DETAILS["night-island"];
  const [liked, setLiked] = useState(false);

  return (
    <div className="sm-screen sm-no-nav sm-theme-dark">
      <div className="sm-detail-hero">
        <img src={data.heroImg} alt={data.title} />
        <div className="sm-detail-hero-bar" style={{ top: 62 }}>
          <button type="button" className="sm-icon-btn sm-icon-btn-ghost" style={{ color: "#fff" }} onClick={() => router.back()} aria-label="Back">
            <IconArrowLeft />
          </button>
          <div className="sm-detail-hero-actions">
            <button type="button" className={`sm-icon-btn sm-icon-btn-ghost${liked ? " sm-icon-btn-active" : ""}`} style={{ color: "#fff" }} onClick={() => setLiked((v) => !v)} aria-label="Favorite">
              <IconHeart filled={liked} />
            </button>
            <button type="button" className="sm-icon-btn sm-icon-btn-ghost" style={{ color: "#fff" }} aria-label="Download">
              <IconDownload />
            </button>
          </div>
        </div>
      </div>

      <div className="sm-detail-body on-dark">
        <h1>{data.title}</h1>
        <div className="sm-detail-eyebrow" style={{ color: "#9490c2" }}>{data.kind}</div>
        <p className="sm-detail-desc" style={{ color: "#9490c2" }}>{data.desc}</p>

        <div className="sm-detail-stats">
          <span><IconHeart filled style={{ color: "var(--sm-pink)" }} /> {data.favorites} Favorits</span>
          <span><IconHeadphones /> {data.listening} Lestening</span>
        </div>

        <hr className="sm-related-divider" />

        <h3 className="sm-narrator">Related</h3>
        <div className="sm-related-row">
          {data.related?.map((r) => (
            <button key={r.slug} type="button" className="sm-tile" style={{ color: "#fff" }} onClick={() => router.push(`/sm/track/${r.slug}`)}>
              <img src={r.img} alt={r.title} />
              <div className="sm-tile-title">{r.title}</div>
              <div className="sm-tile-sub">{r.sub}</div>
            </button>
          ))}
        </div>

        <button type="button" className="sm-btn sm-btn-primary" onClick={() => router.push(`/sm/player/${slug}`)}>
          Play
        </button>
      </div>
    </div>
  );
}
