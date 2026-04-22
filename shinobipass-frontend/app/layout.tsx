import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/space-grotesk/700.css'
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { TransakFallbackModal } from "@/components/TransakFallbackModal";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "ShinobiPass - Own Your Ticket",
  description: "NFT-powered event ticketing on Arc. Transparent, secure, and truly yours.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-on-background font-body antialiased min-h-screen flex flex-col pt-20">
        <Providers>
          {children}
          <TransakFallbackModal />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
