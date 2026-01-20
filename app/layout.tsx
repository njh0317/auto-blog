import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "코딩하다 주식하는 사람",
  description: "매일 미국증시 마감시황을 정리해드립니다. 3대 지수, 빅테크, 환율, 원자재 등 한눈에 확인하세요.",
  keywords: ["미국증시", "주식", "시황", "나스닥", "S&P500", "투자"],
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
        {process.env.NEXT_PUBLIC_ADSENSE_ID && 
         process.env.NEXT_PUBLIC_ADSENSE_ID !== 'your_adsense_id_here' && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className={`${geistSans.variable} antialiased bg-gray-50`}>
        <header className="bg-white shadow-sm border-b">
          <nav className="max-w-4xl mx-auto px-4 py-4">
            <a href="/" className="text-xl font-bold text-gray-900">
              코딩하다 주식하는 사람
            </a>
          </nav>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="bg-white border-t mt-12">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
            © 2026 코딩하다 주식하는 사람
          </div>
        </footer>
      </body>
    </html>
  );
}
