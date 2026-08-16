import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "pockt habits",
  description: "A private Notion-backed habit tracker"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
