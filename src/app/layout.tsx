import type { Metadata } from "next";
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
  title: "HandOffLint",
  description:
    "Paste a Figma URL for a Readiness Score and severity-sorted lint findings before dev handoff.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 14' fill='none'%3E%3Ccircle cx='7' cy='7' r='7' fill='%23ff7237' /%3E%3Ccircle cx='17' cy='7' r='7' fill='%23874fff' /%3E%3Ccircle cx='27' cy='7' r='7' fill='%230d99ff' /%3E%3Ccircle cx='37' cy='7' r='7' fill='%2324cb71' /%3E%3C/svg%3E"
        />
      </head>
      <body
        className={`${geistSans.className} min-h-full flex flex-col font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
