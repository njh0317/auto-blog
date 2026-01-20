import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "투자하는 개발자 블로그",
  description: "투자와 주식에 대한 유용한 정보를 제공하는 블로그입니다.",
  keywords: ["투자", "주식", "재테크", "금융", "경제"],
  verification: {
    google: "aJRDFBdGluoThx-sYadcpMVeO8EXbx6nNLCIUAHlVw8",
  },
  openGraph: {
    title: "투자하는 개발자 블로그",
    description: "투자와 주식에 대한 유용한 정보를 제공하는 블로그입니다.",
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
              투자하는 개발자
            </a>
          </nav>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="bg-white border-t mt-12">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
            © 2026 투자하는 개발자 블로그
          </div>
        </footer>
      </body>
    </html>
  );
}
