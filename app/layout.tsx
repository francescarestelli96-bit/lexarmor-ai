import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LexArmor",
  description:
    "Scudo legale istantaneo per analizzare contratti, identificare clausole rischiose e firmare con più sicurezza.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
