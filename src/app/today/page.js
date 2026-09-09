"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TodayRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/study");
  }, [router]);
  return null;
}
