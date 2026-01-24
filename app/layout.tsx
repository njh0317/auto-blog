import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import MobileProfileSlide from "@/components/MobileProfileSlide";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "코딩하다 주식하는 사람",
  description: "매일 미국증시 마감시황을 정리해드립니다. 3대 지수, 빅테크, 환율, 원자재 등 한눈에 확인하세요.",
  keywords: ["미국증시", "주식", "시황", "나스닥", "S&P500", "투자"],
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  verification: {
    google: "g0k23fRklD5CcgzkuQ1QqA9tPC0HU__l11-OEDl2oKU",
  },
  openGraph: {
    title: "코딩하다 주식하는 사람",
    description: "매일 미국증시 마감시황을 정리해드립니다.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3032491110695099"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${geistSans.variable} antialiased bg-gray-50`}>
        <header className="bg-white shadow-sm border-b">
          <nav className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <img src="/icon.png" alt="logo" className="w-8 h-8" />
              코딩하다 주식하는 사람
            </a>
            <MobileProfileSlide />
          </nav>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="bg-white border-t mt-12">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-700 mb-4">
              <a href="/about" className="hover:text-blue-600">소개</a>
              <a href="/contact" className="hover:text-blue-600">문의</a>
              <a href="/privacy" className="hover:text-blue-600">개인정보처리방침</a>
            </div>
            <p className="text-center text-gray-500 text-sm">
              © 2026 wisdomslab.com
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
