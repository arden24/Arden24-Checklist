import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppHeader from "@/components/AppHeader";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arden24",
  description: "Trading journal, discipline and strategy checklist. A product of Arden Ventures Ltd.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen min-w-0 flex-col bg-black text-white">
          <AuthProvider>
            <AppHeader />
            <div className="min-w-0 flex-1 pb-[env(safe-area-inset-bottom,0px)]">
              {children}
            </div>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
