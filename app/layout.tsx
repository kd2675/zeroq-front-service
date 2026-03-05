import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/app/providers";

export const metadata: Metadata = {
  title: "ZeroQ Service",
  description: "ZeroQ 일반 사용자 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
