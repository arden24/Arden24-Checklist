import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppHeader from "@/components/AppHeader";
import AppFooterDisclaimer from "@/components/AppFooterDisclaimer";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppToastProvider } from "@/contexts/AppToastContext";
import { WorkspaceThemeProvider } from "@/components/workspace/WorkspaceThemeProvider";

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
    <html lang="en" className="h-full w-full max-w-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full min-h-screen w-full max-w-full antialiased`}
      >
        <div className="flex min-h-screen w-full max-w-full min-w-0 flex-col overflow-x-hidden bg-background text-foreground">
          <AuthProvider>
            <WorkspaceThemeProvider>
              <AppToastProvider>
                <AppHeader />
                <div className="min-w-0 w-full max-w-full flex-1 overflow-x-hidden bg-background pb-[env(safe-area-inset-bottom,0px)] pt-[var(--app-header-offset)]">
                  {children}
                </div>
                <AppFooterDisclaimer />
              </AppToastProvider>
            </WorkspaceThemeProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
