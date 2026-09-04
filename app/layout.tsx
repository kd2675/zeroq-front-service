import type { Metadata, Viewport } from "next";

import "./globals.css";

import Providers from "@/app/providers";

export const metadata: Metadata = {
  title: {
    default: "ZeroQ | 공간 혼잡도",
    template: "%s | ZeroQ",
  },
  description: "센서의 최신 측정을 바탕으로 공간별 현재 혼잡도를 확인하는 ZeroQ 서비스",
  applicationName: "ZeroQ",
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f4f6f3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
