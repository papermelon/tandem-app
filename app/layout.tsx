import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/app-shell";
import { HomeNavbar } from "@/components/dashboard/home/home-navbar";
import { CareDataProvider } from "@/components/providers/care-data-provider";

export const metadata: Metadata = {
  title: "Tandem | Family Care, Shared",
  description: "A mobile-first app for families coordinating care for someone they love.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2f7d78"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CareDataProvider>
            <AppShell>{children}</AppShell>
            <HomeNavbar />
          </CareDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
