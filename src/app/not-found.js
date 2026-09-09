import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
      <h2>Page Not Found</h2>
      <p>Could not find requested resource</p>
      <Link href="/" style={{ color: "#8e97fd", textDecoration: "underline" }}>Return Home</Link>
    </div>
  );
}
