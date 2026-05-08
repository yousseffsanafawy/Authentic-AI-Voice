import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Authentic AI Voice",
  description:
    "AI-powered writing assistant that learns your authentic voice and enhances your documents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
