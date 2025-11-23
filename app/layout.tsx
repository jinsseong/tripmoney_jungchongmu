import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "여행 정산 관리",
  description: "친구들과 함께하는 여행 비용을 투명하게 정산하는 앱",
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords: ["여행", "정산", "가계부", "비용관리", "친구", "여행경비"],
  authors: [{ name: "Travel Expense Team" }],
  // icons: {
  //   icon: "/icons/icon-192x192.png",
  //   shortcut: "/icons/icon-192x192.png",
  //   apple: "/icons/icon-192x192.png",
  // },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="여행정산" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
