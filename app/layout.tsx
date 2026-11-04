import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import WarpGridBackground from './components/Home/WarpGridBackgrounHome'
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
  title: "Drift-Field Styel support ",
  description: "Design and create by alpha-x solution",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <WarpGridBackground />
        {children}
      </body>
    </html>
  );
}
