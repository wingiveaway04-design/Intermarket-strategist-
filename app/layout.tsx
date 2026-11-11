import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intermarket Strategist | Financial Research",
  description: "Financial market analysis, official trade setups, and private trading journals.",
};

const themeBootstrap = `(function(){try{var t=localStorage.getItem('ais-theme')||'dark';var r=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.dataset.theme=r;document.documentElement.style.colorScheme=r;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark">
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body>{children}</body>
    </html>
  );
}
