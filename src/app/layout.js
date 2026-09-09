import "./globals.css";
import SpringPress from "@/components/SpringPress";

export const metadata = {
  title: "Cardio-Respiratory Tracker",
  description: "Study tracker for cardio-respiratory module",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SpringPress />
        {children}
      </body>
    </html>
  );
}

