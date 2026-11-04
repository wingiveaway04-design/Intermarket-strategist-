import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intermarket Strategist | Financial Research",
  description: "Financial market analysis, official trade setups, and private trading journals.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
