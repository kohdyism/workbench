import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Workbench",
  description: "Connect your inbox. Workbench decides what deserves your attention and handles the rest.",
  icons: { icon: "/brand/favicon-32.png", apple: "/brand/workbench-logo-512.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
