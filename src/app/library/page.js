"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StudySuite from "@/components/StudySuite";

function LibraryContent() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "qbank";
  return <StudySuite initialTab="library" activeNav="library" initialLibrarySection={section} />;
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>Loading…</div>}>
      <LibraryContent />
    </Suspense>
  );
}
