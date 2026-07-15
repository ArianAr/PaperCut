import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaperCut",
  description:
    "Interactive terminal pastebin and log analysis canvas. Self-hostable, no analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
