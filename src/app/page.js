"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) router.replace("/login");
    }, 2500);

    try {
      const supabase = createClient();
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          if (!mounted) return;
          clearTimeout(timeout);
          router.replace(session ? "/study" : "/login");
        })
        .catch((err) => {
          console.error("Auth session error:", err);
          if (!mounted) return;
          clearTimeout(timeout);
          router.replace("/login");
        });
    } catch (err) {
      console.error("Supabase init error:", err);
      if (!mounted) return;
      clearTimeout(timeout);
      router.replace("/login");
    }

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      Loading…
    </div>
  );
}

