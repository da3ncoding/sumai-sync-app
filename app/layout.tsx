import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SumaiSync",
  description: "2人で進める住まい探し",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
