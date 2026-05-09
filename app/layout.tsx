import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { AppShell } from "@/components/app-shell";
import { HomeNavbar } from "@/components/dashboard/home/home-navbar";
import { CareDataProvider } from "@/components/providers/care-data-provider";

export const metadata: Metadata = {
  title: "Tandem | Family Care Hub",
  description: "A mobile-first family caregiving coordination app for adult children caring for an ageing parent."
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
        <CareDataProvider>
          <AppShell>{children}</AppShell>
          <HomeNavbar />
        </CareDataProvider>
      </body>
    </html>
  );
}
