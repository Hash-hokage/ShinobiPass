import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { TransakFallbackModal } from "@/components/TransakFallbackModal";

export const metadata: Metadata = {
  title: "ShinobiPass - Gasless Event Ticketing on Arc",
  description: "A full-stack NFT event ticketing platform on the Arc blockchain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <Providers>
          {children}
          <TransakFallbackModal />
        </Providers>
      </body>
    </html>
  );
}
